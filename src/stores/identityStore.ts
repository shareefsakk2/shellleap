import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type IdentityType = 'password' | 'key' | 'agent';

export interface Identity {
    id: string;
    label: string;
    type: IdentityType;
    username?: string; // Default username for this identity
    secret?: string; // Password or Private Key. Stored in-store for MVP (Insecure for prod, but sufficient for local dev tool prototype)
}

interface IdentityState {
    identities: Identity[];
    addIdentity: (identity: Identity) => void;
    updateIdentity: (id: string, identity: Partial<Identity>) => void;
    removeIdentity: (id: string) => void;
}

import electronStorage from '@/utils/electronStorage';

export const useIdentityStore = create<IdentityState>()(
    persist(
        (set) => ({
            identities: [],
            addIdentity: (identity) => set((state) => ({ identities: [...state.identities, identity] })),
            updateIdentity: (id, updated) =>
                set((state) => ({
                    identities: state.identities.map((i) => (i.id === id ? { ...i, ...updated } : i)),
                })),
            removeIdentity: (id) =>
                set((state) => ({ identities: state.identities.filter((i) => i.id !== id) })),
        }),
        {
            name: 'identity-storage',
            storage: createJSONStorage(() => electronStorage),
        }
    )
);
