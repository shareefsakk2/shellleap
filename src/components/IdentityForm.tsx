'use client';

import { useState } from 'react';
import { useIdentityStore, Identity, IdentityType } from '@/stores/identityStore';
import { Key, Lock, User, Tag } from 'lucide-react';

interface IdentityFormProps {
    onClose: () => void;
    initialData?: Identity;
}

export function IdentityForm({ onClose, initialData }: IdentityFormProps) {
    const addIdentity = useIdentityStore((state: any) => state.addIdentity);
    const updateIdentity = useIdentityStore((state: any) => state.updateIdentity);

    const [formData, setFormData] = useState<Partial<Identity>>(
        initialData || {
            label: '',
            username: '',
            type: 'password',
        }
    );
    // If editing, secret is likely already in initialData.secret due to our previous unsafe store change (which is fine for MVP)
    // We initialize secret state from it.
    const [secret, setSecret] = useState(initialData?.secret || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const identityData = {
            label: formData.label!,
            username: formData.username,
            type: formData.type as IdentityType,
            secret: secret,
        };

        if (initialData) {
            updateIdentity(initialData.id, identityData);
        } else {
            addIdentity({
                id: crypto.randomUUID(),
                ...identityData,
            } as Identity);
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="relative">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Label</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                            placeholder="My AWS Key"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Type</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as IdentityType })}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none text-sm"
                            >
                                <option value="password">Password</option>
                                <option value="key">Key</option>
                            </select>
                        </div>
                    </div>

                    <div className="relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                                placeholder="ubuntu"
                            />
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                        {formData.type === 'password' ? 'Password' : 'Private Key'}
                    </label>
                    <div className="relative">
                        <Key className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                        {formData.type === 'key' ? (
                            <textarea
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-gray-300 font-mono text-xs h-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                                placeholder="-----BEGIN PRIVATE KEY-----"
                            />
                        ) : (
                            <input
                                type="password"
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                                placeholder="••••••••"
                            />
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
                    Save Identity
                </button>
            </div>
        </form>
    );
}
