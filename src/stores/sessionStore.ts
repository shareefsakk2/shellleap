
import { create } from 'zustand';

export interface Session {
    id: string;
    type: 'ssh' | 'sftp';
    hostId: string;
    label: string;
}

interface SessionState {
    sessions: Session[];
    activeSessionId: string | null;

    addSession: (session: Session) => void;
    removeSession: (id: string) => void;
    setActiveSession: (id: string) => void;
}

import { persist, createJSONStorage } from 'zustand/middleware';
import electronStorage from '@/utils/electronStorage';

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            sessions: [],
            activeSessionId: null,

            addSession: (session) => set((state) => ({
                sessions: [...state.sessions, session],
                activeSessionId: session.id,
            })),

            removeSession: (id) => set((state) => {
                const newSessions = state.sessions.filter((s) => s.id !== id);
                let newActive = state.activeSessionId;

                if (state.activeSessionId === id) {
                    newActive = newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null;
                }

                return {
                    sessions: newSessions,
                    activeSessionId: newActive,
                };
            }),

            setActiveSession: (id) => set({ activeSessionId: id }),
        }),
        {
            name: 'session-storage',
            storage: createJSONStorage(() => electronStorage),
        }
    )
);
