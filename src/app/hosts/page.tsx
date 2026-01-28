'use client';

import { useState } from 'react';
import { useHostStore } from '@/stores/hostStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Plus, Monitor, MoreVertical, Play, Edit2, Trash2, Folder } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { HostForm } from '@/components/HostForm';
import { ContextMenu } from '@/components/ContextMenu';
import { useRouter } from 'next/navigation';

export default function HostsPage() {
    const hosts = useHostStore((state: any) => state.hosts);
    const removeHost = useHostStore((state: any) => state.removeHost);
    const addSession = useSessionStore((state) => state.addSession);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHost, setEditingHost] = useState<any>(null);
    const router = useRouter();

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

    return (
        <div className="flex flex-col h-full bg-gray-900 text-gray-100">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Hosts</h1>
                <button
                    onClick={() => { setEditingHost(null); setIsModalOpen(true); }}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                    title="New Host"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {hosts.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        <Monitor size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No hosts found.</p>
                        <p className="text-sm">Create your first host to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {hosts.map((host: any) => (
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
                                                onClick: () => {
                                                    if (confirm('Are you sure you want to delete this host?')) {
                                                        removeHost(host.id);
                                                    }
                                                }
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
                        ))}
                    </div>
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
        </div>
    );
}
