import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Host {
    id: string;
    label: string;
    address: string;
    username: string;
    identityId?: string; // Reference to Identity store
    groupId?: string;
    port?: number;
    jumpHostId?: string; // ID of another Host to use as a jump server
    tunnels?: {
        type: 'local' | 'remote' | 'dynamic';
        srcPort: number;
        dstHost?: string; // Required for local/remote
        dstPort?: number; // Required for local/remote
    }[];
    defaultPath?: string;
}

export interface Group {
    id: string;
    name: string;
    parentId?: string;
}

interface HostState {
    hosts: Host[];
    groups: Group[];
    addHost: (host: Host) => void;
    updateHost: (id: string, host: Partial<Host>) => void;
    removeHost: (id: string) => void;
    addGroup: (group: Group) => void;
    updateGroup: (id: string, group: Partial<Group>) => void;
    removeGroup: (id: string) => void;
    updateHosts: (ids: string[], updated: Partial<Host>) => void;
}

import electronStorage from '@/utils/electronStorage';

export const useHostStore = create<HostState>()(
    persist(
        (set) => ({
            hosts: [],
            groups: [],
            addHost: (host) => set((state) => ({ hosts: [...state.hosts, host] })),
            updateHost: (id, updated) =>
                set((state) => ({
                    hosts: state.hosts.map((h) => (h.id === id ? { ...h, ...updated } : h)),
                })),
            updateHosts: (ids, updated) =>
                set((state) => ({
                    hosts: state.hosts.map((h) => (ids.includes(h.id) ? { ...h, ...updated } : h)),
                })),
            removeHost: (id) =>
                set((state) => ({ hosts: state.hosts.filter((h) => h.id !== id) })),
            addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),
            updateGroup: (id, updated) =>
                set((state) => ({
                    groups: state.groups.map((g) => (g.id === id ? { ...g, ...updated } : g)),
                })),
            removeGroup: (id) =>
                set((state) => {
                    const groupToRemove = state.groups.find(g => g.id === id);
                    return {
                        groups: state.groups.filter((g) => g.id !== id),
                        // Reset hosts in this group
                        hosts: state.hosts.map(h => h.groupId === id ? { ...h, groupId: undefined } : h)
                    };
                }),
        }),
        {
            name: 'host-storage',
            storage: createJSONStorage(() => electronStorage),
        }
    )
);
