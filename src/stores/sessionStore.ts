
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

export const useSessionStore = create<SessionState>((set) => ({
    sessions: [],
    activeSessionId: null,

    addSession: (session) => set((state) => {
        // Check if session exists or logic to allow duplicates? 
        // User said "multiple tabs", so duplicates allowed or at least distinct sessions.
        // We push to array.
        return {
            sessions: [...state.sessions, session],
            activeSessionId: session.id,
        };
    }),

    removeSession: (id) => set((state) => {
        const newSessions = state.sessions.filter((s) => s.id !== id);
        let newActive = state.activeSessionId;

        // If closing active, switch to last one or null
        if (state.activeSessionId === id) {
            newActive = newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null;
        }

        return {
            sessions: newSessions,
            activeSessionId: newActive,
        };
    }),

    setActiveSession: (id) => set({ activeSessionId: id }),
}));
