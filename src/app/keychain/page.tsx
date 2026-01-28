'use client';

import { useState } from 'react';
import { useIdentityStore } from '@/stores/identityStore';
import { useHostStore } from '@/stores/hostStore';
import { Plus, Key, MoreVertical, Trash2, Edit2, Monitor } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { IdentityForm } from '@/components/IdentityForm';
import { ContextMenu } from '@/components/ContextMenu';

export default function KeychainPage() {
    const identities = useIdentityStore((state: any) => state.identities);
    const removeIdentity = useIdentityStore((state: any) => state.removeIdentity);
    const hosts = useHostStore((state: any) => state.hosts);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIdentity, setEditingIdentity] = useState<any>(null);

    return (
        <div className="flex flex-col h-full bg-gray-900 text-gray-100">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Keychain & Identities</h1>
                <button
                    onClick={() => { setEditingIdentity(null); setIsModalOpen(true); }}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                    title="New Identity"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {identities.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        <Key size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No identities found.</p>
                        <p className="text-sm">Create a reusable identity to easily connect to hosts.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {identities.map((identity: any) => (
                            <div
                                key={identity.id}
                                className="group flex items-start justify-between bg-gray-800 border border-transparent hover:border-indigo-500/50 rounded-xl p-4 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                                        <Key size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-100">{identity.label}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span className="uppercase bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{identity.type}</span>
                                            <span>{identity.username || 'No default user'}</span>
                                        </div>
                                        {(() => {
                                            const usedBy = hosts.filter((h: any) => h.identityId === identity.id);
                                            if (usedBy.length === 0) return null;
                                            return (
                                                <div className="mt-2 text-xs text-gray-500 flex items-start gap-1">
                                                    <Monitor size={12} className="mt-0.5 shrink-0" />
                                                    <div className="flex flex-wrap gap-1">
                                                        {usedBy.slice(0, 3).map((h: any) => (
                                                            <span key={h.id} className="bg-gray-700/50 px-1 rounded text-[10px]">
                                                                {h.label}
                                                            </span>
                                                        ))}
                                                        {usedBy.length > 3 && (
                                                            <span className="text-[10px] opacity-70">+{usedBy.length - 3} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <ContextMenu
                                    trigger={
                                        <button className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-2">
                                            <MoreVertical size={16} />
                                        </button>
                                    }
                                    items={[
                                        {
                                            label: 'Edit',
                                            icon: <Edit2 size={14} />,
                                            onClick: () => { setEditingIdentity(identity); setIsModalOpen(true); }
                                        },
                                        {
                                            label: 'Delete',
                                            icon: <Trash2 size={14} />,
                                            danger: true,
                                            onClick: () => {
                                                if (confirm('Are you sure you want to delete this identity?')) {
                                                    removeIdentity(identity.id);
                                                }
                                            }
                                        }
                                    ]}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingIdentity ? "Edit Identity" : "New Identity"}
            >
                <IdentityForm
                    initialData={editingIdentity}
                    onClose={() => setIsModalOpen(false)}
                />
            </Modal>
        </div >
    );
}
