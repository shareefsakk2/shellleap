'use client';

import { useState } from 'react';
import { useHostStore, Host } from '@/stores/hostStore';
import { useIdentityStore } from '@/stores/identityStore';
import { Monitor, Globe, User, Lock, Server, ArrowRight } from 'lucide-react';

interface HostFormProps {
    onClose: () => void;
    initialData?: Host;
}

export function HostForm({ onClose, initialData }: HostFormProps) {
    const addHost = useHostStore((state: any) => state.addHost);
    const updateHost = useHostStore((state: any) => state.updateHost);
    const identities = useIdentityStore((state: any) => state.identities);

    const [formData, setFormData] = useState<Partial<Host>>(
        initialData || {
            label: '',
            address: '',
            username: 'root',
            port: 22,
            identityId: '',
            tunnels: []
        }
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (initialData) {
            updateHost(initialData.id, formData);
        } else {
            addHost({
                id: crypto.randomUUID(),
                ...formData,
            } as Host);
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="relative">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Alias</label>
                    <div className="relative">
                        <Monitor className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                            placeholder="Production Server"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Hostname / IP</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                                placeholder="192.168.1.1"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Port</label>
                        <input
                            type="number"
                            value={formData.port}
                            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                            placeholder="22"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                                placeholder="root"
                            />
                        </div>
                    </div>
                    <div className="relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Identity</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                            <select
                                value={formData.identityId || ''}
                                onChange={(e) => setFormData({ ...formData, identityId: e.target.value })}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none text-sm"
                            >
                                <option value="">Select Identity...</option>
                                {identities.map((id: any) => (
                                    <option key={id.id} value={id.id}>{id.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                        <Server size={14} className="text-indigo-400" />
                        Network & Tunneling
                    </h4>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Jump Host</label>
                        <select
                            value={formData.jumpHostId || ''}
                            onChange={(e) => setFormData({ ...formData, jumpHostId: e.target.value })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                        >
                            <option value="">None (Direct Connection)</option>
                            {useHostStore((state: any) => state.hosts)
                                .filter((h: any) => h.id !== initialData?.id)
                                .map((h: any) => (
                                    <option key={h.id} value={h.id}>
                                        {h.label} ({h.address})
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Port Forwards</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, tunnels: [...(formData.tunnels || []), { type: 'dynamic', srcPort: 1080 }] as any })}
                                    className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/20 transition-colors uppercase font-bold tracking-wide"
                                >
                                    + Dynamic
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, tunnels: [...(formData.tunnels || []), { type: 'local', srcPort: 8080, dstHost: 'localhost', dstPort: 80 }] as any })}
                                    className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/20 transition-colors uppercase font-bold tracking-wide"
                                >
                                    + Local
                                </button>
                            </div>
                        </div>

                        {(formData.tunnels!.length > 0) ? (
                            <div className="space-y-2">
                                {formData.tunnels!.map((tunnel: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 bg-gray-800/50 border border-gray-700/50 p-2 rounded-lg text-sm group">
                                        <span className="uppercase text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{tunnel.type}</span>
                                        <div className="flex items-center gap-2 font-mono text-gray-300">
                                            <span>{tunnel.srcPort}</span>
                                            <ArrowRight size={12} className="text-gray-600" />
                                            <span>{tunnel.dstHost || 'SOCKS'}:{tunnel.dstPort || ''}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newTunnels = [...(formData.tunnels!)];
                                                newTunnels.splice(idx, 1);
                                                setFormData({ ...formData, tunnels: newTunnels });
                                            }}
                                            className="ml-auto text-gray-600 hover:text-red-400 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-3 bg-gray-800/30 rounded-lg border border-dashed border-gray-800 text-xs text-gray-600">
                                No active port forwarding rules.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-800">
                <button
                    type="button"
                    onClick={onClose}
                    className="mr-3 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-medium text-sm shadow-lg shadow-indigo-900/20"
                >
                    {initialData ? 'Save Changes' : 'Create Host'}
                </button>
            </div>
        </form>
    );
}
