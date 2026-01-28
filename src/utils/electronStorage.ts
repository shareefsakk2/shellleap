import { StateStorage } from 'zustand/middleware';

const electronStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window !== 'undefined' && window.electron) {
            try {
                const data = await window.electron.storageRead(name);
                return data ? JSON.stringify(data) : null;
            } catch (e) {
                console.error('Failed to read from electron storage:', e);
                return null;
            }
        }
        return localStorage.getItem(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window !== 'undefined' && window.electron) {
            try {
                const parsed = JSON.parse(value);
                await window.electron.storageWrite(name, parsed);
            } catch (e) {
                console.error('Failed to write to electron storage:', e);
            }
            return;
        }
        localStorage.setItem(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        if (typeof window !== 'undefined' && window.electron) {
            await window.electron.storageWrite(name, null); // Or implement delete if strictly needed
            return;
        }
        localStorage.removeItem(name);
    },
};

export default electronStorage;
