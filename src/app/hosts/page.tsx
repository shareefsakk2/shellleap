'use client';

import { useState, useEffect } from 'react';
import { useHostStore } from '@/stores/hostStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Plus, Monitor, MoreVertical, Edit2, Trash2, Folder, Search } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { HostForm } from '@/components/HostForm';
import { ContextMenu } from '@/components/ContextMenu';
import { useRouter } from 'next/navigation';

export default function HostsPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const hosts = useHostStore((state: any) => state.hosts);
    const groups = useHostStore((state: any) => state.groups);
    const removeHost = useHostStore((state: any) => state.removeHost);
    const addGroup = useHostStore((state: any) => state.addGroup);
    const removeGroup = useHostStore((state: any) => state.removeGroup);
    const sessions = useSessionStore((state) => state.sessions);
    const addSession = useSessionStore((state) => state.addSession);
    const defaultConnectionType = useSettingsStore((state) => state.settings.behavior.defaultConnectionType);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHost, setEditingHost] = useState<any>(null);
    const router = useRouter();

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [groupName, setGroupName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'host' | 'group', id: string, name: string } | null>(null);

    const handleAddGroupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (groupName.trim()) {
            const id = typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2, 11);

            addGroup({ id, name: groupName.trim() });
            setGroupName('');
            setIsGroupModalOpen(false);
        }
    };

    const handleDelete = () => {
        if (!deleteConfirm) return;
        if (deleteConfirm.type === 'host') {
            removeHost(deleteConfirm.id);
        } else {
            removeGroup(deleteConfirm.id);
        }
        setDeleteConfirm(null);
    };

    // Uses default connection type from settings
    const handleConnectDefault = (hostId: string) => {
        if (defaultConnectionType === 'sftp') {
            handleSFTP(hostId);
        } else {
            handleConnect(hostId);
        }
    };

    const handleConnect = (hostId: string) => {
        const host = hosts.find((h: any) => h.id === hostId);
        if (host) {
            addSession({
                id: crypto.randomUUID(),
                type: 'ssh',
                hostId: host.id,
                label: host.label
            });
            router.push('/');
        }
    };

    const handleSFTP = (hostId: string) => {
        const host = hosts.find((h: any) => h.id === hostId);
        if (host) {
            addSession({
                id: crypto.randomUUID(),
                type: 'sftp',
                hostId: host.id,
                label: 'SFTP: ' + host.label
            });
            router.push('/');
        }
    };

    const renderHostCard = (host: any) => (
        <div
            key={host.id}
            className="group relative bg-[#09090b] border border-[#1C1C1E] rounded-2xl p-6 transition-all duration-300 hover:border-[#3A3A3C] hover:shadow-2xl h-[180px] flex flex-col justify-between overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <ContextMenu
                    trigger={
                        <button className="text-[#8E8E93] hover:text-white transition-colors">
                            <MoreVertical size={18} />
                        </button>
                    }
                    items={[
                        {
                            label: 'Edit',
                            icon: <Edit2 size={14} />,
                            onClick: () => { setEditingHost(host); setIsModalOpen(true); }
                        },
                        {
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            danger: true,
                            onClick: () => setDeleteConfirm({ type: 'host', id: host.id, name: host.label })
                        }
                    ]}
                />
            </div>

            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1C1C1E] rounded-xl flex items-center justify-center text-[#8E8E93] group-hover:text-white transition-colors shrink-0">
                    <Monitor size={24} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#E5E5EA] text-lg tracking-tight">{host.label}</h3>
                        {/* Status Badge - Shows Connected if any session exists for this host */}
                        {sessions.some((s: any) => s.hostId === host.id) ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0F291E] border border-[#133F2E] rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></div>
                                <span className="text-[#34D399] text-[10px] font-bold uppercase tracking-wide">Connected</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1C1C1E] border border-[#2C2C2E] rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#8E8E93]"></div>
                                <span className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-wide">Idle</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-[#8E8E93] font-mono mt-1">{host.username}@{host.address}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
                <button
                    onClick={() => handleSFTP(host.id)}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-full border border-[#2C2C2E] text-[#8E8E93] hover:text-white hover:border-gray-500 hover:bg-[#1C1C1E] transition-all text-xs font-bold tracking-widest uppercase"
                >
                    SFTP
                </button>
                <button
                    onClick={() => handleConnectDefault(host.id)}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-full bg-white text-black hover:bg-gray-200 transition-all text-xs font-bold tracking-widest uppercase shadow-lg shadow-white/5"
                >
                    CONNECT
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-black text-[#EDEDED]">
            <div className="px-8 py-8 flex justify-between items-end mb-4 border-b border-[#1C1C1E]">
                <h1 className="text-4xl font-bold text-[#E5E5EA] tracking-tight">Hosts</h1>
                <div className="flex gap-3 items-center">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search hosts..."
                            className="pl-9 pr-4 py-2.5 bg-[#1C1C1E] border border-[#2C2C2E] rounded-full text-sm text-[#E5E5EA] placeholder:text-[#505055] focus:outline-none focus:border-[#3A3A3C] w-48 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsGroupModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 border border-[#3A3A3C] hover:border-gray-500 text-[#EDEDED] rounded-full transition-all bg-transparent group"
                    >
                        <Folder size={16} className="text-[#8E8E93] group-hover:text-white transition-colors" />
                        <span className="text-sm font-semibold tracking-wide">Add Group</span>
                    </button>
                    <button
                        onClick={() => { setEditingHost(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#D4D4D4] hover:bg-[#E5E5E5] text-black rounded-full transition-all"
                    >
                        <Plus size={16} strokeWidth={3} />
                        <span className="text-sm font-bold tracking-wide">New Host</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                {hosts.length === 0 && groups.length === 0 ? (
                    <div className="text-center text-[#8E8E93] mt-20">
                        <Monitor size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No hosts found.</p>
                        <p className="text-sm">Create your first group or host to get started.</p>
                    </div>
                ) : (
                    <>
                        {/* Render Groups */}
                        {groups.map((group: any) => {
                            const groupHosts = hosts.filter((h: any) => h.groupId === group.id && (h.label.toLowerCase().includes(searchQuery.toLowerCase()) || h.address.toLowerCase().includes(searchQuery.toLowerCase())));
                            return (
                                <div key={group.id} className="space-y-4 mb-8">
                                    <div className="flex items-center justify-between group pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#1C1C1E] rounded-lg text-[#8E8E93] flex items-center justify-center">
                                                <Folder size={20} fill="currentColor" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-[#E5E5EA] tracking-tight leading-none">{group.name}</h2>
                                                <p className="text-xs text-[#8E8E93] font-medium mt-0.5">{groupHosts.length} Active Hosts</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setDeleteConfirm({ type: 'group', id: group.id, name: group.name })}
                                            className="opacity-0 group-hover:opacity-100 text-[#8E8E93] hover:text-red-400 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {groupHosts.map(renderHostCard)}

                                        {/* Add Host Placeholder Card */}
                                        <button
                                            onClick={() => { setEditingHost({ groupId: group.id }); setIsModalOpen(true); }}
                                            className="h-[180px] border border-dashed border-[#2C2C2E] rounded-2xl flex flex-col items-center justify-center gap-3 text-[#505055] hover:border-gray-500 hover:text-gray-400 transition-all group w-full"
                                        >
                                            <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                                <Plus size={18} />
                                            </div>
                                            <span className="text-xs font-bold tracking-widest uppercase">Add Host to Group</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Render Ungrouped Hosts */}
                        {hosts.filter((h: any) => !h.groupId && (h.label.toLowerCase().includes(searchQuery.toLowerCase()) || h.address.toLowerCase().includes(searchQuery.toLowerCase()))).length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-2 mb-4">
                                    <div className="w-10 h-10 bg-[#1C1C1E] rounded-lg text-[#8E8E93] flex items-center justify-center">
                                        <Monitor size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[#E5E5EA] tracking-tight leading-none">Ungrouped</h2>
                                        <p className="text-xs text-[#8E8E93] font-medium mt-0.5">{hosts.filter((h: any) => !h.groupId).length} Active Hosts</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {hosts.filter((h: any) => !h.groupId && (h.label.toLowerCase().includes(searchQuery.toLowerCase()) || h.address.toLowerCase().includes(searchQuery.toLowerCase()))).map(renderHostCard)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingHost ? "Edit Host" : "New Host"}
            >
                <HostForm
                    initialData={editingHost}
                    onClose={() => setIsModalOpen(false)}
                />
            </Modal>

            {/* New Group Modal */}
            <Modal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                title="New Group"
            >
                <form onSubmit={handleAddGroupSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Group Name</label>
                        <input
                            type="text"
                            autoFocus
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full bg-black border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white placeholder-[#505055] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all"
                            placeholder="e.g. Production"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2C2C2E]">
                        <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-5 py-2.5 text-sm text-[#8E8E93] hover:text-white transition-colors font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-[#D4D4D4] hover:bg-[#E5E5E5] text-black rounded-lg transition-all font-bold text-sm">Create Group</button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Confirm Deletion"
            >
                <div className="space-y-4">
                    <p className="text-[#EDEDED]">
                        Are you sure you want to delete {deleteConfirm?.type} <span className="text-white font-semibold">"{deleteConfirm?.name}"</span>?
                        {deleteConfirm?.type === 'group' && " Hosts in this group will be moved to Ungrouped."}
                    </p>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2C2C2E]">
                        <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-sm text-[#8E8E93] hover:text-white transition-colors font-medium">Cancel</button>
                        <button onClick={handleDelete} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all font-bold text-sm">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
