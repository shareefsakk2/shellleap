'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHostStore } from '@/stores/hostStore';
import { useIdentityStore } from '@/stores/identityStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { FileText, Folder, ArrowRight, ArrowLeft, RefreshCw, Upload, Download, Edit2, Trash2, Key } from 'lucide-react';

interface FileEntry {
    name: string;
    type: '-' | 'd';
    size: number;
    modifyTime: number;
}

interface SftpViewProps {
    initialHostId?: string;
}

interface MenuState {
    visible: boolean;
    x: number;
    y: number;
    file: FileEntry | null;
    type: 'local' | 'remote';
}

export function SftpView({ initialHostId, sessionId: propSessionId }: SftpViewProps & { sessionId: string }) {
    const hosts = useHostStore((state: any) => state.hosts);
    const identities = useIdentityStore((state: any) => state.identities);
    const sftpSettings = useSettingsStore((state) => state.settings.sftp);
    const connectionSettings = useSettingsStore((state) => state.settings.connection);

    const [activeHostId, setActiveHostId] = useState(initialHostId || '');
    // Remove local sessionId state, use prop
    const sessionId = propSessionId;

    const [localPath, setLocalPath] = useState(sftpSettings.defaultLocalPath || ''); // Use setting
    const [remotePath, setRemotePath] = useState('.');

    const [localFiles, setLocalFiles] = useState<FileEntry[]>([]);
    const [remoteFiles, setRemoteFiles] = useState<FileEntry[]>([]);

    const [status, setStatus] = useState('Disconnected');
    const [showHidden, setShowHidden] = useState(sftpSettings.showHiddenFiles); // Use setting

    // Context Menu State
    const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0, file: null, type: 'local' });
    const menuRef = useRef<HTMLDivElement>(null);

    const [dialog, setDialog] = useState<{
        type: 'rename' | 'chmod' | 'delete',
        title: string,
        value?: string,
        callback: (value?: string) => void
    } | null>(null);

    // Transfer State
    const [transfers, setTransfers] = useState<Map<string, { type: 'upload' | 'download', file: string, transferred: number, total: number, status: 'active' | 'done' | 'error' }>>(new Map());

    useEffect(() => {
        const handleProgress = (_: any, data: any) => {
            // data: { type, file, transferred, total }
            setTransfers(prev => {
                const next = new Map(prev);
                const key = `${data.type}:${data.file}`;
                const existing = next.get(key);

                // If done or near done
                const isDone = data.transferred >= data.total;

                next.set(key, {
                    type: data.type,
                    file: data.file,
                    transferred: data.transferred,
                    total: data.total,
                    status: isDone ? 'done' : 'active'
                });

                // Cleanup done after delay
                if (isDone && (!existing || existing.status !== 'done')) {
                    setTimeout(() => {
                        setTransfers(curr => {
                            const n = new Map(curr);
                            n.delete(key);
                            return n;
                        });
                    }, 3000);
                }
                return next;
            });
        };

        window.electron.on('sftp-transfer-progress', handleProgress);
        return () => {
            window.electron.off('sftp-transfer-progress', handleProgress);
        };
    }, []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Auto-connect effect
    useEffect(() => {
        if (activeHostId && sessionId && status === 'Disconnected') {
            connect();
        }
    }, [activeHostId, sessionId]);

    useEffect(() => {
        // Initial local list only on mount
        listLocal('');

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
                e.preventDefault();
                setShowHidden((prev) => !prev);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenu(prev => ({ ...prev, visible: false }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const handleSyncStatus = (_: any, data: any) => {
            if (data.id === sessionId) {
                if (data.status === 'synced') {
                    setStatus(`Synced: ${data.remotePath.split('/').pop()}`);
                    listRemote(sessionId, remotePath); // Refresh to show new mtime/size
                } else if (data.status === 'error') {
                    setStatus(`Sync Error: ${data.error}`);
                }
            }
        };

        window.electron.on('sftp-sync-status', handleSyncStatus);
        return () => {
            window.electron.off('sftp-sync-status', handleSyncStatus);
        };
    }, [sessionId, remotePath]);

    const listLocal = async (path: string) => {
        try {
            const res = await window.electron.invoke('sftp-list-local', { path });
            if (res.success) {
                setLocalFiles(res.data);
                setLocalPath(res.currentPath);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const listRemote = async (id: string, path: string) => {
        try {
            const res = await window.electron.invoke('sftp-list-remote', { id, path });
            if (res.success) {
                setRemoteFiles(res.data);
                setRemotePath(path);
            } else {
                console.error(res.error);
                if (res.error === 'No active session') {
                    setStatus('Disconnected');
                    // Do not clear sessionId, as it is a prop now. Just show disconnected.
                } else {
                    setStatus('Error: ' + res.error);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const disconnect = async () => {
        if (!sessionId) return;
        setStatus('Disconnecting...');
        await window.electron.invoke('sftp-disconnect', { id: sessionId });
        setStatus('Disconnected');
        setRemoteFiles([]);
        setRemotePath('.');
    };

    const connect = async () => {
        if (!activeHostId || !hosts) return;
        const host = hosts.find((h: any) => h.id === activeHostId);
        if (!host) return;

        const resolveHostConfig = (hostObj: any) => {
            const conf: any = {
                host: hostObj.address,
                port: hostObj.port || 22,
                username: hostObj.username || 'root',
            };

            if (hostObj.identityId) {
                const identity = identities.find((i: any) => i.id === hostObj.identityId);
                if (identity && identity.secret) {
                    if (identity.type === 'password') {
                        conf.password = identity.secret;
                    } else if (identity.type === 'key') {
                        conf.privateKey = identity.secret;
                    }
                }
            }
            return conf;
        };

        // Resolve Identity Creds
        const config: any = resolveHostConfig(host);

        // Resolve Jump Host
        if (host.jumpHostId) {
            const jumpHost = hosts.find((h: any) => h.id === host.jumpHostId);
            if (jumpHost) {
                config.jumpHost = resolveHostConfig(jumpHost);
            }
        }

        setStatus('Connecting...');
        // Use the persistent session ID from props
        const res = await window.electron.invoke('sftp-connect', {
            id: sessionId,
            config,
            options: {
                readyTimeout: connectionSettings.timeout * 1000,
                keepaliveInterval: connectionSettings.keepAliveInterval * 1000,
            }
        });
        if (res.success) {
            setStatus('Connected');
            // Re-list current path if re-attached, otherwise root
            const initialPath = res.reattached ? remotePath : (host.defaultPath ? host.defaultPath : (res.cwd || '.'));
            setRemotePath(initialPath);
            listRemote(sessionId, initialPath);
        } else {
            setStatus('Failed: ' + res.error);
        }
    };

    const handleRemotePathKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            listRemote(sessionId, remotePath);
        }
    };

    const goUp = () => {
        if (!sessionId) return;
        // Simple parent resolution
        const parts = remotePath.split('/').filter(Boolean);
        parts.pop();
        const parent = parts.length > 0 ? '/' + parts.join('/') : '/';
        listRemote(sessionId, parent);
    };

    const goLocalUp = async () => {
        const parent = await window.electron.invoke('local-path-parent', localPath);
        listLocal(parent);
    };

    const handleDragStart = (e: React.DragEvent, file: FileEntry, source: 'local' | 'remote') => {
        e.dataTransfer.setData('source', source);
        e.dataTransfer.setData('fileName', file.name);
        const currentPtr = source === 'local' ? localPath : remotePath;
        e.dataTransfer.setData('parentPath', currentPtr);
    };

    const handleDrop = async (e: React.DragEvent, target: 'local' | 'remote') => {
        e.preventDefault();
        const source = e.dataTransfer.getData('source');
        if (source === target) return;

        const fileName = e.dataTransfer.getData('fileName');
        const parentPath = e.dataTransfer.getData('parentPath');

        // Resolve source path
        let sourcePath = '';
        if (source === 'local') {
            sourcePath = await window.electron.invoke('local-path-join', parentPath, fileName);
        } else {
            sourcePath = parentPath === '/' ? `/${fileName}` : `${parentPath}/${fileName}`;
        }

        if (!sessionId) return;

        setStatus('Transferring...');

        if (target === 'remote') {
            // Upload: Local -> Remote
            const dest = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
            const res = await window.electron.invoke('sftp-upload', {
                id: sessionId,
                localPath: sourcePath,
                remotePath: dest
            });
            if (res.success) {
                setStatus('Upload Complete');
                listRemote(sessionId, remotePath);
            } else {
                setStatus('Upload Failed: ' + res.error);
            }
        } else {
            // Download: Remote -> Local
            const dest = await window.electron.invoke('local-path-join', localPath, fileName);

            const res = await window.electron.invoke('sftp-download', {
                id: sessionId,
                remotePath: sourcePath,
                localPath: dest
            });
            if (res.success) {
                setStatus('Download Complete');
                listLocal(localPath);
            } else {
                setStatus('Download Failed: ' + res.error);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const onContextMenu = (e: React.MouseEvent, file: FileEntry, type: 'local' | 'remote') => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            file,
            type
        });
    };



    return (
        <div className="flex flex-col h-full relative bg-black">
            {/* Modern Toolbar */}
            <div className="h-14 border-b border-[#1C1C1E] flex items-center px-5 gap-4 bg-black">
                <select
                    value={activeHostId}
                    onChange={async (e) => {
                        const newId = e.target.value;
                        if (status !== 'Disconnected') {
                            await disconnect();
                        }
                        setActiveHostId(newId);
                    }}
                    className="bg-[#1C1C1E] border border-[#2C2C2E] text-[#E5E5EA] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 appearance-none cursor-pointer"
                >
                    <option value="">Select Host...</option>
                    {hosts.map((h: any) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
                <button
                    onClick={status === 'Connected' ? disconnect : connect}
                    disabled={status === 'Connecting...' || status === 'Transferring...'}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${status === 'Connected'
                        ? 'bg-[#B45309]/80 hover:bg-[#B45309] text-white'
                        : 'bg-[#D4D4D4] hover:bg-[#E5E5E5] text-black disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                    {status === 'Connecting...' ? 'Connecting...' : status === 'Connected' ? 'Disconnect' : 'Connect'}
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-green-500 animate-pulse' : status === 'Disconnected' ? 'bg-[#505055]' : 'bg-amber-500 animate-pulse'}`}></div>
                    <span className="text-xs text-[#8E8E93] font-medium">{status}</span>
                </div>
            </div>

            {/* Panes */}
            <div className="flex-1 flex overflow-hidden gap-3 p-3">
                {/* Local Pane */}
                <div
                    className="flex-1 flex flex-col bg-[#0A0A0A] rounded-xl border border-[#1C1C1E] overflow-hidden"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'local')}
                >
                    <div className="px-4 py-3 border-b border-[#1C1C1E] bg-[#0F0F0F] flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                                <Folder size={12} className="text-amber-500" />
                            </div>
                            <span className="text-xs font-semibold text-[#E5E5EA] uppercase tracking-wider">Local</span>
                        </div>
                        <input
                            value={localPath}
                            onChange={(e) => setLocalPath(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && listLocal(localPath)}
                            className="flex-1 bg-[#1C1C1E] text-xs font-mono text-[#E5E5EA] px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {localPath !== '/' && (
                            <div
                                className="flex items-center gap-3 px-3 py-2 hover:bg-[#1C1C1E] rounded-lg cursor-pointer text-sm text-[#E5E5EA] select-none transition-colors"
                                onDoubleClick={goLocalUp}
                            >
                                <Folder size={16} className="text-amber-500" />
                                <span className="truncate flex-1 font-medium">..</span>
                            </div>
                        )}
                        {localFiles
                            .filter(f => showHidden || !f.name.startsWith('.'))
                            .map((f, i) => (
                                <div
                                    key={i}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, f, 'local')}
                                    onContextMenu={(e) => onContextMenu(e, f, 'local')}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-[#1C1C1E] rounded-lg cursor-pointer text-sm text-[#E5E5EA] select-none transition-colors group"
                                    onDoubleClick={async () => {
                                        if (f.type === 'd') {
                                            const newPath = await window.electron.invoke('local-path-join', localPath, f.name);
                                            listLocal(newPath);
                                        }
                                    }}
                                >
                                    {f.type === 'd' ? <Folder size={16} className="text-amber-500" /> : <FileText size={16} className="text-[#505055]" />}
                                    <span className="truncate flex-1 font-medium">{f.name}</span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Remote Pane */}
                <div
                    className="flex-1 flex flex-col bg-[#0A0A0A] rounded-xl border border-[#1C1C1E] overflow-hidden"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'remote')}
                >
                    <div className="px-4 py-3 border-b border-[#1C1C1E] bg-[#0F0F0F] flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                                <Folder size={12} className="text-blue-500" />
                            </div>
                            <span className="text-xs font-semibold text-[#E5E5EA] uppercase tracking-wider">Remote</span>
                        </div>
                        <button onClick={goUp} className="text-[#8E8E93] hover:text-white transition-colors p-1.5 hover:bg-[#1C1C1E] rounded-lg" title="Up Directory">
                            <ArrowLeft size={14} className="rotate-90" />
                        </button>
                        <input
                            value={remotePath}
                            onChange={(e) => setRemotePath(e.target.value)}
                            onKeyDown={handleRemotePathKeyDown}
                            className="flex-1 bg-[#1C1C1E] text-xs font-mono text-[#E5E5EA] px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                        <button onClick={() => sessionId && listRemote(sessionId, remotePath)} className="text-[#8E8E93] hover:text-white transition-colors p-1.5 hover:bg-[#1C1C1E] rounded-lg" title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {sessionId ? (
                            <>
                                {remotePath !== '/' && (
                                    <div
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-[#1C1C1E] rounded-lg cursor-pointer text-sm text-[#E5E5EA] select-none transition-colors"
                                        onDoubleClick={goUp}
                                    >
                                        <Folder size={16} className="text-blue-500" />
                                        <span className="truncate flex-1 font-medium">..</span>
                                    </div>
                                )}
                                {remoteFiles
                                    .filter(f => showHidden || !f.name.startsWith('.'))
                                    .map((f, i) => (
                                        <div
                                            key={i}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, f, 'remote')}
                                            onContextMenu={(e) => onContextMenu(e, f, 'remote')}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-[#1C1C1E] rounded-lg cursor-pointer text-sm text-[#E5E5EA] select-none transition-colors group"
                                            onDoubleClick={() => f.type === 'd' && listRemote(sessionId, remotePath === '/' ? `/${f.name}` : `${remotePath}/${f.name}`)}
                                        >
                                            {f.type === 'd' ? <Folder size={16} className="text-blue-500" /> : <FileText size={16} className="text-[#505055]" />}
                                            <span className="truncate flex-1 font-medium">{f.name}</span>
                                        </div>
                                    ))}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-[#8E8E93] gap-2">
                                <div className="w-12 h-12 rounded-xl bg-[#1C1C1E] flex items-center justify-center">
                                    <Folder size={24} className="text-[#505055]" />
                                </div>
                                <span className="text-sm">Not Connected</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transfer Queue Overlay */}
            {transfers.size > 0 && (
                <div className="absolute bottom-4 right-4 left-4 bg-[#1C1C1E] border border-[#2C2C2E] shadow-2xl rounded-xl max-h-48 overflow-hidden">
                    <div className="px-4 py-2 bg-[#0F0F0F] text-xs font-semibold text-[#E5E5EA] flex items-center justify-between border-b border-[#2C2C2E]">
                        <span className="uppercase tracking-wider">Transfers ({transfers.size})</span>
                    </div>
                    <div className="p-3 space-y-3 max-h-36 overflow-y-auto custom-scrollbar">
                        {Array.from(transfers.values()).map((t, i) => (
                            <div key={i} className="bg-[#0A0A0A] rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center ${t.type === 'upload' ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                                            {t.type === 'upload' ? <Upload size={10} className="text-blue-400" /> : <Download size={10} className="text-green-400" />}
                                        </div>
                                        <span className="truncate text-sm text-[#E5E5EA] font-medium">{t.file.split('/').pop()}</span>
                                    </div>
                                    <span className="text-xs text-[#8E8E93]">{formatBytes(t.transferred)} / {formatBytes(t.total)}</span>
                                </div>
                                <div className="h-1.5 bg-[#2C2C2E] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${t.status === 'done' ? 'bg-green-500' : 'bg-blue-500'} transition-all duration-300 rounded-full`}
                                        style={{ width: `${Math.min(100, (t.transferred / t.total) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Context Menu Portal */}
            {menu.visible && menu.file && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-50 w-40 bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg shadow-xl py-1 overflow-hidden"
                    style={{ left: menu.x, top: menu.y }}
                >
                    <div className="px-4 py-1.5 text-xs text-[#8E8E93] border-b border-[#2C2C2E] mb-1 truncate">
                        {menu.file.name}
                    </div>
                    {/* Open / Edit */}
                    {menu.type === 'local' ? (
                        <button
                            onClick={async () => {
                                const path = await window.electron.invoke('local-path-join', localPath, menu.file?.name);
                                window.electron.invoke('open-path', { path });
                                setMenu(prev => ({ ...prev, visible: false }));
                            }}
                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#2C2C2E] text-[#E5E5EA] hover:text-white"
                        >
                            <FileText size={14} /> Open
                        </button>
                    ) : (
                        menu.file.type === '-' && (
                            <button
                                onClick={async () => {
                                    setMenu(prev => ({ ...prev, visible: false }));
                                    setStatus('Opening for edit...');
                                    const res = await window.electron.invoke('sftp-open-remote', {
                                        id: sessionId,
                                        remotePath: remotePath === '/' ? `/${menu.file?.name}` : `${remotePath}/${menu.file?.name}`,
                                        fileName: menu.file?.name
                                    });
                                    if (res.success) {
                                        setStatus('Editing: ' + menu.file?.name);
                                    } else {
                                        setStatus('Failed to open: ' + res.error);
                                    }
                                }}
                                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#2C2C2E] text-[#E5E5EA] hover:text-white"
                            >
                                <Edit2 size={14} /> Edit Remote
                            </button>
                        )
                    )}

                    {/* Rename */}
                    <button
                        onClick={async () => {
                            const oldName = menu.file?.name;
                            setMenu(prev => ({ ...prev, visible: false }));
                            setDialog({
                                type: 'rename',
                                title: 'Rename File',
                                value: oldName,
                                callback: async (newName) => {
                                    if (newName && newName !== oldName) {
                                        if (menu.type === 'local') {
                                            const oldPath = await window.electron.invoke('local-path-join', localPath, oldName);
                                            const newPath = await window.electron.invoke('local-path-join', localPath, newName);
                                            await window.electron.invoke('local-rename', {
                                                oldPath,
                                                newPath
                                            });
                                            listLocal(localPath);
                                        } else {
                                            await window.electron.invoke('sftp-rename', {
                                                id: sessionId,
                                                oldPath: remotePath === '/' ? `/${oldName}` : `${remotePath}/${oldName}`,
                                                newPath: remotePath === '/' ? `/${newName}` : `${remotePath}/${newName}`
                                            });
                                            listRemote(sessionId, remotePath);
                                        }
                                    }
                                }
                            });
                        }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#2C2C2E] text-[#E5E5EA] hover:text-white"
                    >
                        <Folder size={14} /> Rename
                    </button>

                    <button
                        onClick={() => {
                            setMenu(prev => ({ ...prev, visible: false }));
                            setDialog({
                                type: 'chmod',
                                title: 'Change Permissions (Octal)',
                                value: '755',
                                callback: async (mode) => {
                                    if (mode) {
                                        if (menu.type === 'local') {
                                            const path = await window.electron.invoke('local-path-join', localPath, menu.file?.name);
                                            window.electron.invoke('local-chmod', { path, mode });
                                        } else {
                                            window.electron.invoke('sftp-chmod', { id: sessionId, path: remotePath === '/' ? `/${menu.file?.name}` : `${remotePath}/${menu.file?.name}`, mode });
                                        }
                                    }
                                }
                            });
                        }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#2C2C2E] text-[#E5E5EA] hover:text-white"
                    >
                        <Key size={14} /> Permissions
                    </button>
                    <button
                        onClick={async () => {
                            setMenu(prev => ({ ...prev, visible: false }));

                            const performDelete = async () => {
                                if (menu.type === 'local') {
                                    const path = await window.electron.invoke('local-path-join', localPath, menu.file?.name);
                                    await window.electron.invoke('local-delete', { path });
                                    listLocal(localPath);
                                } else {
                                    await window.electron.invoke('sftp-delete', { id: sessionId, path: remotePath === '/' ? `/${menu.file?.name}` : `${remotePath}/${menu.file?.name}`, isDir: menu.file?.type === 'd' });
                                    listRemote(sessionId, remotePath);
                                }
                            };

                            // Check if confirmation is required
                            if (sftpSettings.confirmBeforeDelete) {
                                setDialog({
                                    type: 'delete',
                                    title: 'Confirm Deletion',
                                    value: menu.file?.name,
                                    callback: performDelete
                                });
                            } else {
                                // Skip confirmation
                                await performDelete();
                            }
                        }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#2C2C2E] text-red-400 hover:text-red-300"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>,
                document.body
            )}

            {/* Sftp Navigation/Action Dialog */}
            {dialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold text-[#E5E5EA] mb-4">{dialog.title}</h3>

                        {(dialog.type === 'rename' || dialog.type === 'chmod') ? (
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                dialog.callback(dialog.value);
                                setDialog(null);
                            }} className="space-y-4">
                                <input
                                    autoFocus
                                    type="text"
                                    value={dialog.value}
                                    onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
                                    className="w-full bg-black border border-[#2C2C2E] rounded p-2 text-sm text-[#E5E5EA] focus:outline-none focus:ring-1 focus:ring-white/20"
                                />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setDialog(null)} className="px-3 py-1.5 text-xs text-[#8E8E93] hover:text-white">Cancel</button>
                                    <button type="submit" className="px-4 py-1.5 text-xs bg-[#D4D4D4] hover:bg-[#E5E5E5] text-black rounded font-medium">Confirm</button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-[#EDEDED]">Are you sure you want to delete <span className="text-white font-mono">{dialog.value}</span>?</p>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setDialog(null)} className="px-3 py-1.5 text-xs text-[#8E8E93] hover:text-white">Cancel</button>
                                    <button onClick={() => { dialog.callback(); setDialog(null); }} className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-medium">Delete</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}
