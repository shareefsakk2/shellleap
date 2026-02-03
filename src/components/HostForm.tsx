'use client';

import { useState } from 'react';
import { useHostStore, Host } from '@/stores/hostStore';
import { useIdentityStore } from '@/stores/identityStore';
import { Monitor, Globe, User, Lock, Server, ArrowRight, Folder } from 'lucide-react';

interface HostFormProps {
    onClose: () => void;
    initialData?: Host;
}

export function HostForm({ onClose, initialData }: HostFormProps) {
    const addHost = useHostStore((state: any) => state.addHost);
    const updateHost = useHostStore((state: any) => state.updateHost);
    const identities = useIdentityStore((state: any) => state.identities);
    const groups = useHostStore((state: any) => state.groups);

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
                            className="w-full bg-black border border-[#2C2C2E] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-[#505055] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all font-medium"
                            placeholder="Production Server"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 relative">
                        <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Hostname / IP</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-3 text-[#505055] w-4 h-4" />
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full bg-black border border-[#2C2C2E] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-[#505055] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all font-mono text-sm"
                                placeholder="192.168.1.1"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Port</label>
                        <input
                            type="number"
                            value={formData.port}
                            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                            className="w-full bg-black border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white placeholder-[#505055] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all font-mono text-sm"
                            placeholder="22"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-[#505055] w-4 h-4" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-black border border-[#2C2C2E] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-[#505055] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all text-sm font-medium"
                                placeholder="root"
                            />
                        </div>
                    </div>
                    <div className="relative">
                        <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Group</label>
                        <select
                            value={formData.groupId || ''}
                            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                            className="w-full bg-black border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all text-sm h-[42px] appearance-none"
                        >
                            <option value="">No Group</option>
                            {groups.map((g: any) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="relative">
                    <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Default Path (Optional)</label>
                    <div className="relative">
                        <Folder className="absolute left-3 top-3 text-[#505055] w-4 h-4" />
                        <input
                            type="text"
                            value={formData.defaultPath || ''}
                            onChange={(e) => setFormData({ ...formData, defaultPath: e.target.value })}
                            className="w-full bg-black border border-[#2C2C2E] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-[#505055] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all text-sm font-medium font-mono"
                            placeholder="/var/www/html"
                        />
                    </div>
                </div>

                <div className="relative">
                    <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Identity</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-[#505055] w-4 h-4" />
                        <select
                            value={formData.identityId || ''}
                            onChange={(e) => setFormData({ ...formData, identityId: e.target.value })}
                            className="w-full bg-black border border-[#2C2C2E] rounded-xl py-2.5 pl-9 pr-3 text-white focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all appearance-none text-sm"
                        >
                            <option value="">Select Identity...</option>
                            {identities.map((id: any) => (
                                <option key={id.id} value={id.id}>{id.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="border-t border-[#2C2C2E] pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Server size={14} className="text-[#8E8E93]" />
                        Network & Tunneling
                    </h4>
                </div>


                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Jump Host</label>
                        <select
                            value={formData.jumpHostId || ''}
                            onChange={(e) => setFormData({ ...formData, jumpHostId: e.target.value })}
                            className="w-full bg-black border border-[#2C2C2E] rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all text-sm appearance-none"
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
                            <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Port Forwards</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, tunnels: [...(formData.tunnels || []), { type: 'dynamic', srcPort: 1080 }] as any })}
                                    className="text-[10px] bg-white/5 text-white px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors uppercase font-bold tracking-widest border border-white/5"
                                >
                                    + Dynamic
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, tunnels: [...(formData.tunnels || []), { type: 'local', srcPort: 8080, dstHost: 'localhost', dstPort: 80 }] as any })}
                                    className="text-[10px] bg-white/5 text-white px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors uppercase font-bold tracking-widest border border-white/5"
                                >
                                    + Local
                                </button>
                            </div>
                        </div>

                        {(formData.tunnels && formData.tunnels.length > 0) ? (
                            <div className="space-y-2">
                                {formData.tunnels.map((tunnel: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 bg-black border border-[#2C2C2E] p-2.5 rounded-lg text-sm group">
                                        <span className="uppercase text-[10px] font-bold text-black bg-white px-1.5 py-0.5 rounded">{tunnel.type}</span>
                                        <div className="flex items-center gap-2 font-mono text-[#8E8E93]">
                                            <span>{tunnel.srcPort}</span>
                                            <ArrowRight size={12} className="text-[#505055]" />
                                            <span>{tunnel.dstHost || 'SOCKS'}:{tunnel.dstPort || ''}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newTunnels = [...(formData.tunnels!)];
                                                newTunnels.splice(idx, 1);
                                                setFormData({ ...formData, tunnels: newTunnels });
                                            }}
                                            className="ml-auto text-[#505055] hover:text-red-400 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-black/50 rounded-xl border border-dashed border-[#2C2C2E] text-xs text-[#505055]">
                                No active port forwarding rules.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2C2C2E]">
                <button
                    type="button"
                    onClick={onClose}
                    className="mr-3 px-5 py-2.5 text-sm text-[#8E8E93] hover:text-white transition-colors font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-6 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg transition-all font-bold text-sm shadow-lg shadow-white/5 uppercase tracking-wide"
                >
                    {initialData ? 'Save Changes' : 'Create Host'}
                </button>
            </div>
        </form>
    );
}
