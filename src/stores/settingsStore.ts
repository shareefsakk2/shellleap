import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
    // Terminal Settings
    terminal: {
        fontSize: number;
        fontFamily: string;
        cursorStyle: 'block' | 'underline' | 'bar';
        cursorBlink: boolean;
    };

    // SFTP Settings
    sftp: {
        showHiddenFiles: boolean;
        defaultLocalPath: string;
        confirmBeforeDelete: boolean;
    };

    // Connection Settings
    connection: {
        timeout: number;
        keepAliveInterval: number;
        autoReconnect: boolean;
    };

    // Appearance Settings
    appearance: {
        theme: 'dark' | 'system';
        sidebarPosition: 'left' | 'right';
    };

    // Behavior Settings
    behavior: {
        defaultConnectionType: 'ssh' | 'sftp';
        closeConfirmation: boolean;
    };
}

interface SettingsStore {
    settings: AppSettings;
    updateTerminalSettings: (settings: Partial<AppSettings['terminal']>) => void;
    updateSftpSettings: (settings: Partial<AppSettings['sftp']>) => void;
    updateConnectionSettings: (settings: Partial<AppSettings['connection']>) => void;
    updateAppearanceSettings: (settings: Partial<AppSettings['appearance']>) => void;
    updateBehaviorSettings: (settings: Partial<AppSettings['behavior']>) => void;
    resetToDefaults: () => void;
}

const defaultSettings: AppSettings = {
    terminal: {
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        cursorStyle: 'block',
        cursorBlink: true,
    },
    sftp: {
        showHiddenFiles: false,
        defaultLocalPath: '',
        confirmBeforeDelete: true,
    },
    connection: {
        timeout: 30,
        keepAliveInterval: 60,
        autoReconnect: false,
    },
    appearance: {
        theme: 'dark',
        sidebarPosition: 'left',
    },
    behavior: {
        defaultConnectionType: 'ssh',
        closeConfirmation: true,
    },
};

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            settings: defaultSettings,

            updateTerminalSettings: (terminalSettings) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        terminal: { ...state.settings.terminal, ...terminalSettings },
                    },
                })),

            updateSftpSettings: (sftpSettings) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        sftp: { ...state.settings.sftp, ...sftpSettings },
                    },
                })),

            updateConnectionSettings: (connectionSettings) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        connection: { ...state.settings.connection, ...connectionSettings },
                    },
                })),

            updateAppearanceSettings: (appearanceSettings) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        appearance: { ...state.settings.appearance, ...appearanceSettings },
                    },
                })),

            updateBehaviorSettings: (behaviorSettings) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        behavior: { ...state.settings.behavior, ...behaviorSettings },
                    },
                })),

            resetToDefaults: () => set({ settings: defaultSettings }),
        }),
        {
            name: 'shellleap-settings',
        }
    )
);
