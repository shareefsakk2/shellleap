'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHostStore } from '@/stores/hostStore';
import { useIdentityStore } from '@/stores/identityStore';
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
    const [activeHostId, setActiveHostId] = useState(initialHostId || '');
    // Remove local sessionId state, use prop
    const sessionId = propSessionId;

    const [localPath, setLocalPath] = useState(''); // Default homedir
    const [remotePath, setRemotePath] = useState('.');

    const [localFiles, setLocalFiles] = useState<FileEntry[]>([]);
    const [remoteFiles, setRemoteFiles] = useState<FileEntry[]>([]);

    const [status, setStatus] = useState('Disconnected');
    const [showHidden, setShowHidden] = useState(false);

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
        const res = await window.electron.invoke('sftp-connect', { id: sessionId, config });
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
        <div className="flex flex-col h-full relative">
            {/* Toolbar */}
            <div className="h-12 border-b border-gray-800 flex items-center px-4 gap-4 bg-gray-900">
                <select
                    value={activeHostId}
                    onChange={async (e) => {
                        const newId = e.target.value;
                        if (status !== 'Disconnected') {
                            await disconnect();
                        }
                        setActiveHostId(newId);
                    }}
                    className="bg-gray-800 border border-gray-700 text-white rounded p-1 text-sm"
                >
                    <option value="">Select Host...</option>
                    {hosts.map((h: any) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
                <button
                    onClick={status === 'Connected' ? disconnect : connect}
                    disabled={status === 'Connecting...' || status === 'Transferring...'}
                    className={`px-3 py-1 rounded text-sm transition-colors ${status === 'Connected'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white'}`}
                >
                    {status === 'Connecting...' ? 'Connecting...' : status === 'Connected' ? 'Disconnect' : 'Connect'}
                </button>
                <span className="text-xs text-gray-500 ml-auto">{status}</span>
            </div>

            {/* Panes */}
            <div className="flex-1 flex overflow-hidden">
                {/* Local Pane */}
                <div
                    className="flex-1 border-r border-gray-800 flex flex-col bg-gray-900/50"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'local')}
                >
                    <div className="p-2 border-b border-gray-800 bg-gray-900 flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">Local:</span>
                        <input
                            value={localPath}
                            onChange={(e) => setLocalPath(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && listLocal(localPath)}
                            className="bg-transparent text-xs font-mono text-gray-300 w-full focus:outline-none"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {localPath !== '/' && (
                            <div
                                className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-300 select-none group"
                                onDoubleClick={goLocalUp}
                            >
                                <Folder size={14} className="text-yellow-500" />
                                <span className="truncate flex-1">..</span>
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
                                    className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-300 select-none group"
                                    onDoubleClick={async () => {
                                        if (f.type === 'd') {
                                            const newPath = await window.electron.invoke('local-path-join', localPath, f.name);
                                            listLocal(newPath);
                                        }
                                    }}
                                >
                                    {f.type === 'd' ? <Folder size={14} className="text-yellow-500" /> : <FileText size={14} className="text-gray-500" />}
                                    <span className="truncate flex-1">{f.name}</span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Remote Pane */}
                <div
                    className="flex-1 flex flex-col bg-gray-900"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'remote')}
                >
                    <div className="p-2 border-b border-gray-800 bg-gray-900 flex items-center gap-2">
                        <button onClick={goUp} className="text-gray-500 hover:text-white" title="Up Directory">
                            <ArrowLeft size={14} className="rotate-90" />
                        </button>
                        <span className="text-xs font-mono text-gray-500">Remote:</span>
                        <input
                            value={remotePath}
                            onChange={(e) => setRemotePath(e.target.value)}
                            onKeyDown={handleRemotePathKeyDown}
                            className="bg-transparent text-xs font-mono text-gray-300 w-full focus:outline-none"
                        />
                        <button onClick={() => sessionId && listRemote(sessionId, remotePath)} title="Refresh">
                            <RefreshCw size={14} className="text-gray-500 hover:text-white" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {sessionId ? (
                            <>
                                {remotePath !== '/' && (
                                    <div
                                        className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-300 select-none group"
                                        onDoubleClick={goUp}
                                    >
                                        <Folder size={14} className="text-blue-500" />
                                        <span className="truncate flex-1">..</span>
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
                                            className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-300 select-none group"
                                            onDoubleClick={() => f.type === 'd' && listRemote(sessionId, remotePath === '/' ? `/${f.name}` : `${remotePath}/${f.name}`)}
                                        >
                                            {f.type === 'd' ? <Folder size={14} className="text-blue-500" /> : <FileText size={14} className="text-gray-500" />}
                                            <span className="truncate flex-1">{f.name}</span>
                                        </div>
                                    ))}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-600">
                                Not Connected
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transfer Queue Overlay */}
            {transfers.size > 0 && (
                <div className="absolute bottom-0 right-0 left-0 bg-gray-800 border-t border-gray-700 shadow-xl max-h-48 overflow-y-auto">
                    <div className="px-3 py-1 bg-gray-900 text-xs font-bold text-gray-400 flex items-center justify-between">
                        <span>Transfers ({transfers.size})</span>
                    </div>
                    <div className="p-2 space-y-2">
                        {Array.from(transfers.values()).map((t, i) => (
                            <div key={i} className="text-xs">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                                        {t.type === 'upload' ? <Upload size={10} className="text-blue-400" /> : <Download size={10} className="text-green-400" />}
                                        <span className="truncate">{t.file.split('/').pop()}</span>
                                    </div>
                                    <span className="text-gray-500">{formatBytes(t.transferred)} / {formatBytes(t.total)}</span>
                                </div>
                                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${t.status === 'done' ? 'bg-green-500' : 'bg-indigo-500'} transition-all duration-300`}
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
                    className="fixed z-50 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 overflow-hidden"
                    style={{ left: menu.x, top: menu.y }}
                >
                    <div className="px-4 py-1.5 text-xs text-gray-500 border-b border-gray-700 mb-1 truncate">
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
                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-700 text-gray-200 hover:text-white"
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
                                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-700 text-gray-200 hover:text-white"
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
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-700 text-gray-200 hover:text-white"
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
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-700 text-gray-200 hover:text-white"
                    >
                        <Key size={14} /> Permissions
                    </button>
                    <button
                        onClick={async () => {
                            setMenu(prev => ({ ...prev, visible: false }));
                            setDialog({
                                type: 'delete',
                                title: 'Confirm Deletion',
                                value: menu.file?.name,
                                callback: async () => {
                                    if (menu.type === 'local') {
                                        const path = await window.electron.invoke('local-path-join', localPath, menu.file?.name);
                                        await window.electron.invoke('local-delete', { path });
                                        listLocal(localPath);
                                    } else {
                                        await window.electron.invoke('sftp-delete', { id: sessionId, path: remotePath === '/' ? `/${menu.file?.name}` : `${remotePath}/${menu.file?.name}`, isDir: menu.file?.type === 'd' });
                                        listRemote(sessionId, remotePath);
                                    }
                                }
                            });
                        }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-700 text-red-400 hover:text-red-300"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>,
                document.body
            )}

            {/* Sftp Navigation/Action Dialog */}
            {dialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold text-gray-100 mb-4">{dialog.title}</h3>

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
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setDialog(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                                    <button type="submit" className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium">Confirm</button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-300">Are you sure you want to delete <span className="text-white font-mono">{dialog.value}</span>?</p>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setDialog(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
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
