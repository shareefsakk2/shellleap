'use client';

import { useState, useEffect } from 'react';
import { useHostStore } from '@/stores/hostStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Plus, Monitor, MoreVertical, Play, Edit2, Trash2, Folder } from 'lucide-react';
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
    const addSession = useSessionStore((state) => state.addSession);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHost, setEditingHost] = useState<any>(null);
    const router = useRouter();

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
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
            className="group bg-gray-800 border border-transparent hover:border-indigo-500/50 rounded-xl p-4 transition-all duration-200"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-indigo-400">
                        <Monitor size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-100">{host.label}</h3>
                        <p className="text-xs text-gray-400">{host.username}@{host.address}</p>
                    </div>
                </div>
                <ContextMenu
                    trigger={
                        <button className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <MoreVertical size={16} />
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

            <div className="mt-4 flex justify-end gap-2">
                <button
                    onClick={() => handleSFTP(host.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors text-sm font-medium border border-gray-700"
                    title="Open SFTP"
                >
                    <Folder size={14} />
                    SFTP
                </button>
                <button
                    onClick={() => handleConnect(host.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-green-600 text-gray-200 hover:text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <Play size={14} fill="currentColor" />
                    Connect
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-900 text-gray-100">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Hosts</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsGroupModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
                        title="New Group"
                    >
                        <Folder size={18} className="text-indigo-400" />
                        <span className="text-sm font-medium">Add Group</span>
                    </button>
                    <button
                        onClick={() => { setEditingHost(null); setIsModalOpen(true); }}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                        title="New Host"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {hosts.length === 0 && groups.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        <Monitor size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No hosts found.</p>
                        <p className="text-sm">Create your first group or host to get started.</p>
                    </div>
                ) : (
                    <>
                        {/* Render Groups */}
                        {groups.map((group: any) => {
                            const groupHosts = hosts.filter((h: any) => h.groupId === group.id);
                            return (
                                <div key={group.id} className="space-y-4">
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            <Folder size={18} className="text-indigo-400" />
                                            <h2 className="text-lg font-semibold text-gray-300">{group.name}</h2>
                                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{groupHosts.length} hosts</span>
                                        </div>
                                        <button
                                            onClick={() => setDeleteConfirm({ type: 'group', id: group.id, name: group.name })}
                                            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groupHosts.map(renderHostCard)}
                                    </div>
                                    {groupHosts.length === 0 && (
                                        <div className="text-sm text-gray-600 italic pl-7">No hosts in this group.</div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Render Ungrouped Hosts */}
                        {hosts.filter((h: any) => !h.groupId).length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Monitor size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-semibold text-gray-300">Ungrouped</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {hosts.filter((h: any) => !h.groupId).map(renderHostCard)}
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
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Group Name</label>
                        <input
                            type="text"
                            autoFocus
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                            placeholder="e.g. Production"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-medium text-sm">Create Group</button>
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
                    <p className="text-gray-300">
                        Are you sure you want to delete {deleteConfirm?.type} <span className="text-white font-semibold">"{deleteConfirm?.name}"</span>?
                        {deleteConfirm?.type === 'group' && " Hosts in this group will be moved to Ungrouped."}
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleDelete} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all font-medium text-sm">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
