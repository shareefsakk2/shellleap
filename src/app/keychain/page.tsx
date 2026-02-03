'use client';

import { useState, useEffect } from 'react';
import { useIdentityStore } from '@/stores/identityStore';
import { useHostStore } from '@/stores/hostStore';
import { Plus, Key, MoreVertical, Trash2, Edit2, Monitor, Search } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { IdentityForm } from '@/components/IdentityForm';
import { ContextMenu } from '@/components/ContextMenu';

export default function KeychainPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const identities = useIdentityStore((state: any) => state.identities);
    const removeIdentity = useIdentityStore((state: any) => state.removeIdentity);
    const hosts = useHostStore((state: any) => state.hosts);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIdentity, setEditingIdentity] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleDelete = () => {
        if (deleteConfirm) {
            removeIdentity(deleteConfirm.id);
            setDeleteConfirm(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-[#EDEDED]">
            <div className="px-8 py-8 flex justify-between items-end mb-4 border-b border-[#1C1C1E]">
                <h1 className="text-4xl font-bold text-[#E5E5EA] tracking-tight">Keychain</h1>
                <div className="flex gap-3 items-center">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search identities..."
                            className="pl-9 pr-4 py-2.5 bg-[#1C1C1E] border border-[#2C2C2E] rounded-full text-sm text-[#E5E5EA] placeholder:text-[#505055] focus:outline-none focus:border-[#3A3A3C] w-48 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => { setEditingIdentity(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#D4D4D4] hover:bg-[#E5E5E5] text-black rounded-full transition-all"
                    >
                        <Plus size={16} strokeWidth={3} />
                        <span className="text-sm font-bold tracking-wide">New Identity</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                {identities.length === 0 ? (
                    <div className="text-center text-[#8E8E93] mt-20">
                        <Key size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No identities found.</p>
                        <p className="text-sm">Create a reusable identity to easily connect to hosts.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {identities.filter((identity: any) => identity.label.toLowerCase().includes(searchQuery.toLowerCase()) || (identity.username && identity.username.toLowerCase().includes(searchQuery.toLowerCase()))).map((identity: any) => (
                            <div
                                key={identity.id}
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
                                                onClick: () => { setEditingIdentity(identity); setIsModalOpen(true); }
                                            },
                                            {
                                                label: 'Delete',
                                                icon: <Trash2 size={14} />,
                                                danger: true,
                                                onClick: () => setDeleteConfirm(identity)
                                            }
                                        ]}
                                    />
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#1C1C1E] rounded-xl flex items-center justify-center text-[#8E8E93] group-hover:text-white transition-colors shrink-0">
                                        <Key size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#E5E5EA] text-lg tracking-tight">{identity.label}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1C1C1E] text-[#8E8E93] px-1.5 py-0.5 rounded">{identity.type}</span>
                                            <span className="text-sm text-[#8E8E93] font-mono">{identity.username || 'No user'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[#1C1C1E] pt-4 mt-2">
                                    {(() => {
                                        const usedBy = hosts.filter((h: any) => h.identityId === identity.id);
                                        return (
                                            <div className="flex items-center gap-2 text-[#505055]">
                                                <Monitor size={14} />
                                                <span className="text-xs font-medium">
                                                    {usedBy.length === 0 ? 'Not used' : `Used by ${usedBy.length} host${usedBy.length === 1 ? '' : 's'}`}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
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

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Confirm Deletion"
            >
                <div className="space-y-4">
                    <p className="text-[#8E8E93]">
                        Are you sure you want to delete identity <span className="text-white font-bold">"{deleteConfirm?.label}"</span>?
                        This will NOT delete the actual private key files if they are on disk.
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-sm text-[#8E8E93] hover:text-white transition-colors font-medium">Cancel</button>
                        <button onClick={handleDelete} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all font-bold text-sm">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
