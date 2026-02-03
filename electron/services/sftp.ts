import { ipcMain } from 'electron';
import Client from 'ssh2-sftp-client';
import { Client as SSHClient } from 'ssh2';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

// Map of active SFTP sessions
// Stores the SFTP client and optionally the JumpHost connection (SSHClient) to close it later
const sftpSessions = new Map<string, { sftp: Client; jumpConn?: SSHClient }>();

export function setupSFTPHandlers() {
    // Helper to resolve private key paths
    const resolveConfigKeys = async (config: any): Promise<any> => {
        const fs = require('fs/promises');
        const newConfig = { ...config };

        if (newConfig.privateKey && typeof newConfig.privateKey === 'string') {
            // If it doesn't start with recognized PEM headers, assume it's a path
            if (!newConfig.privateKey.includes('-----BEGIN')) {
                try {
                    const keyContent = await fs.readFile(newConfig.privateKey, 'utf8');
                    newConfig.privateKey = keyContent;
                } catch (e) {
                    console.warn(`Failed to read private key from path ${newConfig.privateKey}:`, e);
                }
            }
        }

        if (newConfig.jumpHost) {
            newConfig.jumpHost = await resolveConfigKeys(newConfig.jumpHost);
        }

        return newConfig;
    };

    // Helper to establish connection (possibly via jump host)
    const establishConnection = async (conf: any): Promise<{ socket?: any; jumpConn?: SSHClient }> => {
        if (conf.jumpHost) {
            console.log(`[SFTP] Connecting to Jump Host: ${conf.jumpHost.host}`);

            return new Promise((resolve, reject) => {
                const jumpConn = new SSHClient();

                jumpConn.on('ready', () => {
                    console.log('[SFTP] Jump Host Connected');
                    jumpConn.forwardOut(
                        '127.0.0.1', 0,
                        conf.host, conf.port,
                        (err, stream) => {
                            if (err) {
                                jumpConn.end();
                                return reject(err);
                            }
                            console.log('[SFTP] Tunnel established to target');
                            resolve({ socket: stream, jumpConn });
                        }
                    );
                })
                    .on('error', (err) => {
                        reject(err);
                    })
                    .connect({ ...conf.jumpHost, tryKeyboard: true });
            });
        }

        // Direct connection
        return { socket: undefined };
    };

    // Connect SFTP
    ipcMain.handle('sftp-connect', async (event, { id, config }) => {
        try {
            // Re-use session if still connected
            if (sftpSessions.has(id)) {
                console.log(`[SFTP] Re-using existing session for ${id}`);
                return { success: true, reattached: true };
            }

            const resolvedConfig = await resolveConfigKeys(config);

            const { socket, jumpConn } = await establishConnection(resolvedConfig);

            const sftp = new Client();

            // If we have a socket (tunnel), use it. Otherwise standard connect.
            const connectOptions = socket
                ? { ...resolvedConfig, sock: socket }
                : resolvedConfig;

            await sftp.connect(connectOptions);
            const cwd = await sftp.cwd();

            sftpSessions.set(id, { sftp, jumpConn });
            return { success: true, cwd };
        } catch (err: any) {
            console.error('SFTP Connect Error:', err);
            return { success: false, error: err.message };
        }
    });

    // List Remote Files
    ipcMain.handle('sftp-list-remote', async (event, { id, path }) => {
        const session = sftpSessions.get(id);
        if (!session) return { success: false, error: 'No active session' };
        try {
            const list = await session.sftp.list(path || '.');
            return { success: true, data: list };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // List Local Files
    ipcMain.handle('sftp-list-local', async (event, { path }) => {
        try {
            const targetPath = path || homedir();
            const files = await readdir(targetPath);
            const data = await Promise.all(files.map(async (file) => {
                try {
                    const stats = await stat(join(targetPath, file));
                    return {
                        name: file,
                        type: stats.isDirectory() ? 'd' : '-',
                        size: stats.size,
                        modifyTime: stats.mtime.getTime(),
                    };
                } catch {
                    return null;
                }
            }));
            return { success: true, data: data.filter(Boolean), currentPath: targetPath };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Upload File
    ipcMain.handle('sftp-upload', async (event, { id, localPath, remotePath }) => {
        const session = sftpSessions.get(id);
        if (!session) return { success: false, error: 'No active session' };
        if (!localPath) return { success: false, error: 'Local path is required' };

        try {
            const fs = require('fs');
            const { stat } = require('fs/promises');
            const stats = await stat(localPath);
            const totalSize = stats.size;
            let transferred = 0;

            const stream = fs.createReadStream(localPath);

            stream.on('data', (chunk: Buffer) => {
                transferred += chunk.length;
                event.sender.send('sftp-transfer-progress', {
                    type: 'upload',
                    file: remotePath,
                    transferred,
                    total: totalSize
                });
            });

            await session.sftp.put(stream, remotePath);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Download File
    ipcMain.handle('sftp-download', async (event, { id, remotePath, localPath }) => {
        const session = sftpSessions.get(id);
        if (!session) return { success: false, error: 'No active session' };

        try {
            const fs = require('fs');
            const { PassThrough } = require('stream');

            const stats = await session.sftp.stat(remotePath);
            const totalSize = stats.size;
            let transferred = 0;

            const writeStream = fs.createWriteStream(localPath);
            const tracker = new PassThrough();

            tracker.on('data', (chunk: Buffer) => {
                transferred += chunk.length;
                event.sender.send('sftp-transfer-progress', {
                    type: 'download',
                    file: remotePath,
                    transferred,
                    total: totalSize
                });
            });

            tracker.pipe(writeStream);

            await session.sftp.get(remotePath, tracker);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Disconnect
    ipcMain.handle('sftp-disconnect', async (event, { id }) => {
        const session = sftpSessions.get(id);
        if (session) {
            try {
                await session.sftp.end();
            } catch (e) { console.warn('Error closing SFTP:', e); }

            if (session.jumpConn) {
                try {
                    session.jumpConn.end();
                } catch (e) { console.warn('Error closing JumpConn:', e); }
            }
            sftpSessions.delete(id);
        }
        return true;
    });

    // --- Context Menu Actions ---

    // Remote Delete
    ipcMain.handle('sftp-delete', async (event, { id, path, isDir }) => {
        const session = sftpSessions.get(id);
        if (!session) return { success: false, error: 'No active session' };
        try {
            if (isDir) {
                await session.sftp.rmdir(path, true); // recursive
            } else {
                await session.sftp.delete(path);
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Remote Rename
    ipcMain.handle('sftp-rename', async (event, { id, oldPath, newPath }) => {
        const session = sftpSessions.get(id);
        if (!session) return { success: false, error: 'No active session' };
        try {
            await session.sftp.rename(oldPath, newPath);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Local Rename
    ipcMain.handle('local-rename', async (event, { oldPath, newPath }) => {
        try {
            const fs = require('fs/promises');
            await fs.rename(oldPath, newPath);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    const watchers = new Map<string, any>();

    // Open Remote File and Sync Changes
    ipcMain.handle('sftp-open-remote', async (event, { id, remotePath, fileName }) => {
        const session = sftpSessions.get(id);
        if (!session) return { success: false, error: 'No active session' };
        try {
            const fs = require('fs');
            const os = require('os');
            const { shell } = require('electron');
            const tempDir = join(os.tmpdir(), 'shellleap_sync_' + id);
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const localPath = join(tempDir, fileName);

            // Download using stream (get mechanism handles it if we pass stream?)
            // Actually sftp.get(remote, local) is fine for initial download usually, 
            // but let's be consistent.
            // But for download, passing a path string to get() triggers fastGet which we said might be risky?
            // Let's use the same stream approach as sftp-download
            const { PassThrough } = require('stream');
            const writeStream = fs.createWriteStream(localPath);
            await session.sftp.get(remotePath, writeStream);

            await shell.openPath(localPath);

            const watcherKey = `${id}:${remotePath}`;
            if (watchers.has(watcherKey)) watchers.get(watcherKey).close();

            let isSyncing = false;
            const watcher = fs.watch(localPath, async (eventType: string) => {
                if (eventType === 'change' && !isSyncing) {
                    isSyncing = true;
                    try {
                        // Debounce slightly
                        await new Promise(r => setTimeout(r, 500));

                        // Upload using stream logic to avoid fastPut issues
                        const readStream = fs.createReadStream(localPath);
                        await session.sftp.put(readStream, remotePath);

                        event.sender.send('sftp-sync-status', { id, remotePath, status: 'synced' });
                    } catch (e: any) {
                        event.sender.send('sftp-sync-status', { id, remotePath, status: 'error', error: e.message });
                    } finally { isSyncing = false; }
                }
            });
            watchers.set(watcherKey, watcher);
            return { success: true, localPath };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Remote Chmod
    ipcMain.handle('sftp-chmod', async (event, { id, path, mode }) => {
        const session = sftpSessions.get(id);
        if (!session) return { success: false, error: 'No active session' };
        try {
            const finalMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
            await session.sftp.chmod(path, finalMode);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Local Delete
    ipcMain.handle('local-delete', async (event, { path }) => {
        try {
            const stats = await stat(path);
            if (stats.isDirectory()) {
                await import('fs/promises').then(fs => fs.rm(path, { recursive: true }));
            } else {
                await import('fs/promises').then(fs => fs.unlink(path));
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Local Chmod
    ipcMain.handle('local-chmod', async (event, { path, mode }) => {
        try {
            const fs = require('fs/promises');
            const finalMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
            await fs.chmod(path, finalMode);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // Open Path (Local)
    ipcMain.handle('open-path', async (event, { path }) => {
        try {
            const { shell } = require('electron');
            if (!path) return { success: false, error: 'Path is required' };
            const err = await shell.openPath(path);
            if (err) return { success: false, error: err };
            return { success: true };
        } catch (err: any) {
            console.error('Error in open-path:', err);
            return { success: false, error: err.message };
        }
    });

    // Path Utilities (Local)
    ipcMain.handle('local-path-join', async (event, ...parts: string[]) => {
        return join(...parts);
    });

    ipcMain.handle('local-path-parent', async (event, currentPath: string) => {
        const { dirname } = require('path');
        return dirname(currentPath);
    });
}
