'use client';

import { useSessionStore } from '@/stores/sessionStore';
import { useHostStore } from '@/stores/hostStore';
import { Terminal } from '@/components/Terminal';
import { SftpView } from '@/components/SftpView';
import { X, Terminal as TerminalIcon, Folder } from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';

export function SessionWorkspace() {
    const sessions = useSessionStore((state) => state.sessions);
    const activeSessionId = useSessionStore((state) => state.activeSessionId);
    console.log('SessionWorkspace sessions:', sessions);
    const setActiveSession = useSessionStore((state) => state.setActiveSession);
    const removeSession = useSessionStore((state) => state.removeSession);

    // If no sessions, show empty state
    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-[#111827]">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                    <TerminalIcon size={32} className="text-gray-600" />
                </div>
                <p>No active sessions.</p>
                <p className="text-sm">Select a host from the <span className="text-gray-400 font-medium">Hosts</span> tab to connect.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#111827]">
            {/* Tabs Bar */}
            <div className="flex items-center bg-gray-950 border-b border-gray-800 overflow-x-auto no-scrollbar">
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        onClick={() => setActiveSession(session.id)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 text-sm border-r border-gray-800 cursor-pointer min-w-[150px] max-w-[200px] select-none group",
                            activeSessionId === session.id
                                ? "bg-[#111827] text-white border-t-2 border-t-indigo-500"
                                : "bg-gray-950 text-gray-500 hover:bg-gray-900 border-t-2 border-t-transparent"
                        )}
                    >
                        {session.type === 'ssh' ? <TerminalIcon size={14} className="shrink-0" /> : <Folder size={14} className="shrink-0" />}
                        <span className="truncate flex-1">{session.label}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-all"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Sessions Content */}
            <div className="flex-1 relative overflow-hidden">
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        className={clsx("absolute inset-0 w-full h-full bg-[#111827]", activeSessionId === session.id ? "z-10" : "z-0 invisible")}
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
