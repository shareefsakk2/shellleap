'use client';

import { useState, useEffect } from 'react';
import { Activity, Terminal, Clock, Wifi, WifiOff, Folder } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export function StatusBar() {
    const sessions = useSessionStore((state) => state.sessions);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [uptime, setUptime] = useState(0);

    // Count session types
    const sshCount = sessions.filter(s => s.type === 'ssh').length;
    const sftpCount = sessions.filter(s => s.type === 'sftp').length;

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setUptime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatUptime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${hrs}h ${mins}m`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="h-7 bg-black border-t border-[#1C1C1E] flex items-center justify-between px-4 text-[10px] font-medium text-[#8E8E93] uppercase tracking-wider select-none shrink-0 z-50">
            <div className="flex items-center gap-5">
                {/* Status indicator */}
                <div className="flex items-center gap-1.5 text-green-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Ready</span>
                </div>

                {/* Version */}
                <span className="text-[#505055]">v0.1.1</span>

                {/* Session counts */}
                {(sshCount > 0 || sftpCount > 0) && (
                    <div className="flex items-center gap-3">
                        {sshCount > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Terminal size={10} className="text-green-500" />
                                <span>{sshCount} SSH</span>
                            </div>
                        )}
                        {sftpCount > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Folder size={10} className="text-blue-500" />
                                <span>{sftpCount} SFTP</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-5">
                {/* Uptime */}
                <div className="flex items-center gap-1.5">
                    <Activity size={10} />
                    <span>Uptime {formatUptime(uptime)}</span>
                </div>

                {/* Current time */}
                <div className="flex items-center gap-1.5">
                    <Clock size={10} />
                    <span>{formatTime(currentTime)}</span>
                </div>
            </div>
        </div>
    );
}
