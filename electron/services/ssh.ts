import { Client } from 'ssh2';
import { ipcMain } from 'electron';

// Simple in-memory map of active sessions
const sessions = new Map<string, Client>();
const buffers = new Map<string, string>();

// Helper to connect a single client
async function connectClient(config: any, sock?: any): Promise<Client> {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => resolve(conn))
            .on('error', (err) => reject(err))
            .connect({
                ...config,
                sock,
                tryKeyboard: true,
                keepaliveInterval: 10000,
                keepaliveCountMax: 3,
                debug: (str: string) => console.log(`[SSH-DEBUG] ${str}`)
            });
    });
}

export function setupSSHHandlers() {
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

    ipcMain.handle('ssh-connect', async (event, { id, config, options }) => {
        try {
            // Re-use session if already connected
            if (sessions.has(id)) {
                console.log(`[SSH] Re-using existing session for ${id}`);
                // Ensure dimensions are synced upon re-attachment
                if (options && (options.rows || options.cols)) {
                    const client = sessions.get(id);
                    if (client && (client as any)._stream) {
                        try {
                            (client as any)._stream.setWindow(options.rows, options.cols, 0, 0);
                        } catch (e) {
                            console.warn('Failed to resize on re-attach:', e);
                        }
                    }
                }
                return { success: true, reattached: true };
            }

            const resolvedConfig = await resolveConfigKeys(config);
            console.log('[SSH] Connecting with config:', {
                ...resolvedConfig,
                privateKey: resolvedConfig.privateKey ? (resolvedConfig.privateKey.length > 50 ? `Key present (${resolvedConfig.privateKey.length} chars)` : resolvedConfig.privateKey) : 'None',
                password: resolvedConfig.password ? '***' : 'None'
            });

            // Recursive function to establish connection chain
            const establishConnection = async (conf: any): Promise<Client> => {
                // If there's a jump host, connect to it first
                if (conf.jumpHost) {
                    console.log(`Connecting to Jump Host: ${conf.jumpHost.host}`);
                    const jumpConn = await establishConnection(conf.jumpHost);

                    // Create a stream to the target host via the jump host
                    return new Promise((resolve, reject) => {
                        jumpConn.forwardOut(
                            '127.0.0.1', 0, // Source IP/Port (arbitrary)
                            conf.host, conf.port,
                            (err, stream) => {
                                if (err) {
                                    jumpConn.end();
                                    return reject(err);
                                }
                                // Connect to target using the stream
                                resolve(connectClient(conf, stream));
                            }
                        );
                    });
                }
                // Direct connection
                return connectClient(conf);
            };

            const conn = await establishConnection(resolvedConfig);

            sessions.set(id, conn);

            // Handle Tunnels (Port Forwarding)
            if (config.tunnels) {
                config.tunnels.forEach((tunnel: any) => {
                    if (tunnel.type === 'local') {
                        // Very basic implementation: Listen on local, forward to remote
                        // Note: Electron Main process listening on ports might trigger firewall warnings
                        // and 'localhost' refers to the machine running Electron.
                        const net = require('net');
                        const server = net.createServer((socket: any) => {
                            conn.forwardOut(
                                '127.0.0.1', socket.remotePort,
                                tunnel.dstHost || 'localhost', tunnel.dstPort || 80,
                                (err, stream) => {
                                    if (err) {
                                        socket.end();
                                        return;
                                    }
                                    socket.pipe(stream).pipe(socket);
                                }
                            );
                        });
                        server.listen(tunnel.srcPort, '127.0.0.1');
                    }
                });
            }

            // Setup shell for the final connection
            // options should contain { rows, cols, term }
            const shellOptions = options || { term: 'xterm-256color' };
            conn.shell(shellOptions, (err, stream) => {
                if (err) return;

                (conn as any)._stream = stream;

                stream.on('data', (data: Buffer) => {
                    const str = data.toString();
                    // Keep a small buffer for re-attachment (100KB limit)
                    let currentBuffer = buffers.get(id) || '';
                    currentBuffer += str;
                    if (currentBuffer.length > 102400) {
                        currentBuffer = currentBuffer.substring(currentBuffer.length - 102400);
                    }
                    buffers.set(id, currentBuffer);

                    event.sender.send(`ssh-data-${id}`, str);
                });

                stream.on('close', () => {
                    conn.end();
                    sessions.delete(id);
                    buffers.delete(id);
                    event.sender.send(`ssh-closed-${id}`);
                });
            });

            return { success: true };

        } catch (err: any) {
            console.error('Connection failed:', err);
            return { success: false, error: err.message };
        }
    });

    // Static handlers for input/resize
    ipcMain.on('ssh-input', (event, { id, data }) => {
        const client = sessions.get(id);
        if (client && (client as any)._stream) {
            (client as any)._stream.write(data);
        }
    });

    ipcMain.on('ssh-resize', (event, { id, size }) => {
        const client = sessions.get(id);
        if (client && (client as any)._stream) {
            (client as any)._stream.setWindow(size.rows, size.cols, 0, 0);
        }
    });

    ipcMain.handle('ssh-disconnect', (event, { id }) => {
        const conn = sessions.get(id);
        if (conn) {
            conn.end();
            sessions.delete(id);
            buffers.delete(id);
        }
        return true;
    });

    ipcMain.handle('ssh-get-buffer', (event, { id }) => {
        return buffers.get(id) || '';
    });

    ipcMain.handle('ssh-get-stats', async (event, { id }) => {
        const client = sessions.get(id);
        if (!client) return { error: 'No session' };

        return new Promise((resolve) => {
            client.exec('cat /proc/loadavg; echo "---"; cat /proc/meminfo', (err, stream) => {
                if (err) return resolve({ error: err.message });
                let output = '';
                stream.on('data', (data: Buffer) => output += data.toString());
                stream.on('close', () => {
                    try {
                        const [loadStr, memStr] = output.split('---');
                        if (!loadStr || !memStr) return resolve({ error: 'Parse failed' });

                        const load = parseFloat(loadStr.trim().split(' ')[0]);

                        const memTotalLine = memStr.match(/MemTotal:\s+(\d+)/);
                        const memAvailLine = memStr.match(/MemAvailable:\s+(\d+)/); // Newer kernels
                        const memFreeLine = memStr.match(/MemFree:\s+(\d+)/);

                        const total = memTotalLine ? parseInt(memTotalLine[1]) : 0;
                        const avail = memAvailLine ? parseInt(memAvailLine[1]) : (memFreeLine ? parseInt(memFreeLine[1]) : 0);
                        const used = total - avail;

                        resolve({
                            success: true,
                            stats: {
                                cpuLoad: load,
                                ramUsed: Math.round(used / 1024), // MB
                                ramTotal: Math.round(total / 1024) // MB
                            }
                        });
                    } catch (e: any) {
                        resolve({ error: e.message });
                    }
                });
            });
        });
    });
}
