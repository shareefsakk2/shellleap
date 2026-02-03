'use client';

import { useSessionStore } from '@/stores/sessionStore';
import { useHostStore } from '@/stores/hostStore';
import { Terminal } from '@/components/Terminal';
import { SftpView } from '@/components/SftpView';
import { X, Terminal as TerminalIcon, Folder, Plus, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export function SessionWorkspace() {
    const sessions = useSessionStore((state) => state.sessions);
    const activeSessionId = useSessionStore((state) => state.activeSessionId);
    const setActiveSession = useSessionStore((state) => state.setActiveSession);
    const removeSession = useSessionStore((state) => state.removeSession);
    const addSession = useSessionStore((state) => state.addSession);
    const hosts = useHostStore((state) => state.hosts);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedHost, setSelectedHost] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const prevSessionsRef = useRef<typeof sessions>([]);

    useEffect(() => {
        // Detect closed sessions and disconnect them in backend
        const prevSessions = prevSessionsRef.current;
        const currentIds = new Set(sessions.map(s => s.id));

        prevSessions.forEach(ps => {
            if (!currentIds.has(ps.id)) {
                console.log(`[SessionWorkspace] Session ${ps.id} closed. Disconnecting ${ps.type}...`);
                if (ps.type === 'ssh') {
                    window.electron.invoke('ssh-disconnect', { id: ps.id });
                } else {
                    window.electron.invoke('sftp-disconnect', { id: ps.id });
                }
            }
        });

        prevSessionsRef.current = sessions;
    }, [sessions]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
                plusButtonRef.current && !plusButtonRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
                setSelectedHost(null);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePlusClick = () => {
        if (plusButtonRef.current) {
            const rect = plusButtonRef.current.getBoundingClientRect();
            const menuWidth = 200; // min-w-[200px]
            const viewportWidth = window.innerWidth;

            // Check if menu would overflow right edge
            let x = rect.left;
            if (rect.left + menuWidth > viewportWidth - 10) {
                x = viewportWidth - menuWidth - 10;
            }

            setMenuPosition({ x, y: rect.bottom + 4 });
        }
        setIsMenuOpen(!isMenuOpen);
        setSelectedHost(null);
    };

    const handleConnect = (hostId: string, type: 'ssh' | 'sftp') => {
        const host = hosts.find((h: any) => h.id === hostId);
        if (!host) return;

        const sessionId = `${type}-${hostId}-${Date.now()}`;
        addSession({
            id: sessionId,
            type,
            hostId,
            label: host.label,
        });
        setActiveSession(sessionId);
        setIsMenuOpen(false);
        setSelectedHost(null);
    };

    // If no sessions, show empty state
    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[#8E8E93] bg-black">
                <div className="w-16 h-16 bg-[#1C1C1E] rounded-2xl flex items-center justify-center mb-4">
                    <TerminalIcon size={32} className="text-[#505055]" />
                </div>
                <p>No active sessions.</p>
                <p className="text-sm mb-4">Select a host from the <span className="text-[#E5E5EA] font-medium">Hosts</span> tab to connect.</p>
                <button
                    ref={plusButtonRef}
                    onClick={handlePlusClick}
                    className="flex items-center gap-2 px-4 py-2 bg-[#D4D4D4] hover:bg-[#E5E5E5] text-black rounded-lg font-medium transition-colors"
                >
                    <Plus size={16} />
                    <span>New Session</span>
                </button>

                {/* Menu Portal for Empty State */}
                {isMenuOpen && createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[100] bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl shadow-2xl py-1 min-w-[200px] max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-100"
                        style={{ left: menuPosition.x, top: menuPosition.y }}
                    >
                        {hosts.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-[#8E8E93]">No hosts configured</div>
                        ) : (
                            hosts.map((host: any) => (
                                <div key={host.id} className="relative">
                                    <button
                                        onClick={() => setSelectedHost(selectedHost === host.id ? null : host.id)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#E5E5EA] hover:bg-[#2C2C2E] transition-colors"
                                    >
                                        <span className="truncate">{host.label}</span>
                                        <ChevronRight size={14} className={clsx("text-[#8E8E93] transition-transform", selectedHost === host.id && "rotate-90")} />
                                    </button>
                                    {selectedHost === host.id && (
                                        <div className="bg-[#0A0A0A] border-t border-b border-[#2C2C2E]">
                                            <button
                                                onClick={() => handleConnect(host.id, 'ssh')}
                                                className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-[#E5E5EA] hover:bg-[#2C2C2E] transition-colors"
                                            >
                                                <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center">
                                                    <TerminalIcon size={12} className="text-green-500" />
                                                </div>
                                                <span>SSH Shell</span>
                                            </button>
                                            <button
                                                onClick={() => handleConnect(host.id, 'sftp')}
                                                className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-[#E5E5EA] hover:bg-[#2C2C2E] transition-colors"
                                            >
                                                <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center">
                                                    <Folder size={12} className="text-blue-500" />
                                                </div>
                                                <span>SFTP Browser</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Tabs Bar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-black border-b border-[#1C1C1E] overflow-x-auto no-scrollbar">
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        onClick={() => setActiveSession(session.id)}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg cursor-pointer min-w-[140px] max-w-[200px] select-none group transition-all shrink-0",
                            activeSessionId === session.id
                                ? "bg-[#1C1C1E] text-[#E5E5EA]"
                                : "bg-transparent text-[#8E8E93] hover:bg-[#1C1C1E]/50"
                        )}
                    >
                        <div className={clsx(
                            "w-5 h-5 rounded flex items-center justify-center shrink-0",
                            session.type === 'ssh' ? "bg-green-500/10" : "bg-blue-500/10"
                        )}>
                            {session.type === 'ssh'
                                ? <TerminalIcon size={12} className="text-green-500" />
                                : <Folder size={12} className="text-blue-500" />}
                        </div>
                        <span className="truncate flex-1 font-medium">{session.label}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2C2C2E] rounded-md text-[#8E8E93] hover:text-white transition-all"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Plus Button */}
                <button
                    ref={plusButtonRef}
                    onClick={handlePlusClick}
                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-transparent hover:bg-[#1C1C1E] text-[#8E8E93] hover:text-[#E5E5EA] transition-all shrink-0"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Menu Portal */}
            {isMenuOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[100] bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl shadow-2xl py-1 min-w-[200px] max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-100"
                    style={{ left: menuPosition.x, top: menuPosition.y }}
                >
                    {hosts.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-[#8E8E93]">No hosts configured</div>
                    ) : (
                        hosts.map((host: any) => (
                            <div key={host.id} className="relative">
                                <button
                                    onClick={() => setSelectedHost(selectedHost === host.id ? null : host.id)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#E5E5EA] hover:bg-[#2C2C2E] transition-colors"
                                >
                                    <span className="truncate">{host.label}</span>
                                    <ChevronRight size={14} className={clsx("text-[#8E8E93] transition-transform", selectedHost === host.id && "rotate-90")} />
                                </button>
                                {selectedHost === host.id && (
                                    <div className="bg-[#0A0A0A] border-t border-b border-[#2C2C2E]">
                                        <button
                                            onClick={() => handleConnect(host.id, 'ssh')}
                                            className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-[#E5E5EA] hover:bg-[#2C2C2E] transition-colors"
                                        >
                                            <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center">
                                                <TerminalIcon size={12} className="text-green-500" />
                                            </div>
                                            <span>SSH Shell</span>
                                        </button>
                                        <button
                                            onClick={() => handleConnect(host.id, 'sftp')}
                                            className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-[#E5E5EA] hover:bg-[#2C2C2E] transition-colors"
                                        >
                                            <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center">
                                                <Folder size={12} className="text-blue-500" />
                                            </div>
                                            <span>SFTP Browser</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>,
                document.body
            )}

            {/* Sessions Content */}
            <div className="flex-1 relative overflow-hidden">
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        className={clsx("absolute inset-0 w-full h-full bg-black", activeSessionId === session.id ? "z-10" : "z-0 invisible")}
                    >
                        {session.type === 'ssh' ? (
                            <Terminal hostId={session.hostId} sessionId={session.id} active={activeSessionId === session.id} />
                        ) : (
                            <SftpView initialHostId={session.hostId} sessionId={session.id} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
