
import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Server, Clock } from 'lucide-react';

interface SystemStatsProps {
    sessionId: string;
    hostLabel?: string;
}

export const SystemStats = ({ sessionId, hostLabel }: SystemStatsProps) => {
    const [stats, setStats] = useState<any>(null);
    const [connectionTime, setConnectionTime] = useState(0);

    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            try {
                const res = await window.electron.invoke('ssh-get-stats', { id: sessionId });
                if (isMounted && res.success) {
                    setStats(res.stats);
                }
            } catch (e) {
                // Stats not available - silently fail
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);

        // Connection time counter
        const timeInterval = setInterval(() => {
            setConnectionTime(prev => prev + 1);
        }, 1000);

        return () => {
            isMounted = false;
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, [sessionId]);

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="absolute bottom-3 right-3 z-40 bg-[#0A0A0A]/90 backdrop-blur-sm border border-[#2C2C2E] rounded-lg px-3 py-2 text-[10px] text-[#8E8E93] flex items-center gap-4 select-none opacity-60 hover:opacity-100 transition-opacity">
            {hostLabel && (
                <div className="flex items-center gap-1.5 text-[#E5E5EA] font-medium">
                    <Server size={10} className="text-green-500" />
                    <span className="uppercase tracking-wide">{hostLabel}</span>
                </div>
            )}

            <div className="flex items-center gap-1.5" title="Session Duration">
                <Clock size={10} />
                <span className="font-mono">{formatDuration(connectionTime)}</span>
            </div>

            {stats && (
                <>
                    <div className="flex items-center gap-1.5" title="CPU Load (1m avg)">
                        <Activity size={10} className="text-blue-400" />
                        <span className="font-mono">{stats.cpuLoad?.toFixed(2) || '-.--'}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="RAM Usage">
                        <Cpu size={10} className="text-purple-400" />
                        <span className="font-mono">{stats.ramUsed || '-'} / {stats.ramTotal || '-'} MB</span>
                    </div>
                </>
            )}
        </div>
    );
}
