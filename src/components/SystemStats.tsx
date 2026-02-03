
import React, { useEffect, useState } from 'react';
import { Activity, Cpu } from 'lucide-react';

export const SystemStats = ({ sessionId }: { sessionId: string }) => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            try {
                const res = await window.electron.invoke('ssh-get-stats', { id: sessionId });
                if (isMounted && res.success) {
                    setStats(res.stats);
                }
            } catch (e) {
                console.warn("Failed to fetch stats", e);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [sessionId]);

    if (!stats) return null;

    return (
        <div className="absolute bottom-2 right-4 z-40 bg-gray-900/80 backdrop-blur border border-gray-700 rounded px-3 py-1 text-xs text-gray-300 flex items-center gap-4 shadow-lg select-none opacity-50 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5" title="CPU Load (1m)">
                <Activity size={12} className="text-blue-400" />
                <span className="font-mono">{stats.cpuLoad.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5" title="RAM Usage">
                <Cpu size={12} className="text-purple-400" />
                <span className="font-mono">{stats.ramUsed} / {stats.ramTotal} MB</span>
            </div>
        </div>
    );
}
