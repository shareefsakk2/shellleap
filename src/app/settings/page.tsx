'use client';

import { useSettingsStore } from '@/stores/settingsStore';
import { Settings, Terminal, FolderOpen, Wifi, Palette, MousePointer, RotateCcw } from 'lucide-react';
import { useState } from 'react';

type SettingsTab = 'terminal' | 'sftp' | 'connection' | 'appearance' | 'behavior';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'terminal', label: 'Terminal', icon: <Terminal size={16} /> },
    { id: 'sftp', label: 'SFTP', icon: <FolderOpen size={16} /> },
    { id: 'connection', label: 'Connection', icon: <Wifi size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'behavior', label: 'Behavior', icon: <MousePointer size={16} /> },
];

export default function SettingsPage() {
    const { settings, updateTerminalSettings, updateSftpSettings, updateConnectionSettings, updateAppearanceSettings, updateBehaviorSettings, resetToDefaults } = useSettingsStore();
    const [activeTab, setActiveTab] = useState<SettingsTab>('terminal');

    return (
        <div className="flex-1 overflow-y-auto bg-black custom-scrollbar">
            <div className="px-8 py-8 flex justify-between items-end mb-4 border-b border-[#1C1C1E]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1C1C1E] rounded-xl">
                        <Settings size={24} className="text-[#8E8E93]" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Settings</h1>
                </div>
                <button
                    onClick={resetToDefaults}
                    className="flex items-center gap-2 px-4 py-2 border border-[#3A3A3C] hover:border-red-500/50 text-[#8E8E93] hover:text-red-400 rounded-lg transition-all"
                >
                    <RotateCcw size={14} />
                    <span className="text-sm font-medium">Reset to Defaults</span>
                </button>
            </div>

            <div className="px-8 pb-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8 pb-4 border-b border-[#1C1C1E]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-[#1C1C1E] text-[#E5E5EA]'
                                    : 'text-[#8E8E93] hover:bg-[#1C1C1E]/50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Terminal Settings */}
                {activeTab === 'terminal' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-4">Terminal Settings</h2>

                        <SettingRow
                            label="Font Size"
                            description="Adjust terminal text size (12-20px)"
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={12}
                                    max={20}
                                    value={settings.terminal.fontSize}
                                    onChange={(e) => updateTerminalSettings({ fontSize: Number(e.target.value) })}
                                    className="w-32 accent-white"
                                />
                                <span className="text-sm text-[#E5E5EA] font-mono w-8">{settings.terminal.fontSize}px</span>
                            </div>
                        </SettingRow>

                        <SettingRow
                            label="Font Family"
                            description="Choose terminal font"
                        >
                            <select
                                value={settings.terminal.fontFamily}
                                onChange={(e) => updateTerminalSettings({ fontFamily: e.target.value })}
                                className="bg-[#1C1C1E] border border-[#2C2C2E] text-[#E5E5EA] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                            >
                                <option value='Menlo, Monaco, "Courier New", monospace'>Menlo</option>
                                <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
                                <option value='"Fira Code", monospace'>Fira Code</option>
                                <option value='"Source Code Pro", monospace'>Source Code Pro</option>
                                <option value='Consolas, monospace'>Consolas</option>
                            </select>
                        </SettingRow>

                        <SettingRow
                            label="Cursor Style"
                            description="Terminal cursor appearance"
                        >
                            <div className="flex gap-2">
                                {(['block', 'underline', 'bar'] as const).map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => updateTerminalSettings({ cursorStyle: style })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${settings.terminal.cursorStyle === style
                                                ? 'bg-white text-black'
                                                : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#2C2C2E]'
                                            }`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </SettingRow>

                        <SettingRow
                            label="Cursor Blink"
                            description="Enable cursor blinking animation"
                        >
                            <Toggle
                                checked={settings.terminal.cursorBlink}
                                onChange={(checked) => updateTerminalSettings({ cursorBlink: checked })}
                            />
                        </SettingRow>
                    </div>
                )}

                {/* SFTP Settings */}
                {activeTab === 'sftp' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-4">SFTP Settings</h2>

                        <SettingRow
                            label="Show Hidden Files"
                            description="Show files starting with a dot by default"
                        >
                            <Toggle
                                checked={settings.sftp.showHiddenFiles}
                                onChange={(checked) => updateSftpSettings({ showHiddenFiles: checked })}
                            />
                        </SettingRow>

                        <SettingRow
                            label="Default Local Path"
                            description="Starting directory for local file browser"
                        >
                            <input
                                type="text"
                                value={settings.sftp.defaultLocalPath}
                                onChange={(e) => updateSftpSettings({ defaultLocalPath: e.target.value })}
                                placeholder="e.g. /home/user/projects"
                                className="bg-[#1C1C1E] border border-[#2C2C2E] text-[#E5E5EA] rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-white/20"
                            />
                        </SettingRow>

                        <SettingRow
                            label="Confirm Before Delete"
                            description="Show confirmation dialog before deleting files"
                        >
                            <Toggle
                                checked={settings.sftp.confirmBeforeDelete}
                                onChange={(checked) => updateSftpSettings({ confirmBeforeDelete: checked })}
                            />
                        </SettingRow>
                    </div>
                )}

                {/* Connection Settings */}
                {activeTab === 'connection' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-4">Connection Settings</h2>

                        <SettingRow
                            label="Connection Timeout"
                            description="Seconds before connection attempt times out"
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={10}
                                    max={60}
                                    step={5}
                                    value={settings.connection.timeout}
                                    onChange={(e) => updateConnectionSettings({ timeout: Number(e.target.value) })}
                                    className="w-32 accent-white"
                                />
                                <span className="text-sm text-[#E5E5EA] font-mono w-12">{settings.connection.timeout}s</span>
                            </div>
                        </SettingRow>

                        <SettingRow
                            label="Keep Alive Interval"
                            description="Send keep-alive packets to prevent disconnection (0 = disabled)"
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={120}
                                    step={10}
                                    value={settings.connection.keepAliveInterval}
                                    onChange={(e) => updateConnectionSettings({ keepAliveInterval: Number(e.target.value) })}
                                    className="w-32 accent-white"
                                />
                                <span className="text-sm text-[#E5E5EA] font-mono w-12">{settings.connection.keepAliveInterval}s</span>
                            </div>
                        </SettingRow>

                        <SettingRow
                            label="Auto Reconnect"
                            description="Automatically reconnect when connection is lost"
                        >
                            <Toggle
                                checked={settings.connection.autoReconnect}
                                onChange={(checked) => updateConnectionSettings({ autoReconnect: checked })}
                            />
                        </SettingRow>
                    </div>
                )}

                {/* Appearance Settings */}
                {activeTab === 'appearance' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-4">Appearance Settings</h2>

                        <SettingRow
                            label="Theme"
                            description="Application color scheme"
                        >
                            <div className="flex gap-2">
                                {(['dark', 'system'] as const).map((theme) => (
                                    <button
                                        key={theme}
                                        onClick={() => updateAppearanceSettings({ theme })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${settings.appearance.theme === theme
                                                ? 'bg-white text-black'
                                                : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#2C2C2E]'
                                            }`}
                                    >
                                        {theme}
                                    </button>
                                ))}
                            </div>
                        </SettingRow>

                        <SettingRow
                            label="Sidebar Position"
                            description="Position of the navigation sidebar"
                        >
                            <div className="flex gap-2">
                                {(['left', 'right'] as const).map((pos) => (
                                    <button
                                        key={pos}
                                        onClick={() => updateAppearanceSettings({ sidebarPosition: pos })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${settings.appearance.sidebarPosition === pos
                                                ? 'bg-white text-black'
                                                : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#2C2C2E]'
                                            }`}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                        </SettingRow>
                    </div>
                )}

                {/* Behavior Settings */}
                {activeTab === 'behavior' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-4">Behavior Settings</h2>

                        <SettingRow
                            label="Default Connection Type"
                            description="Connection type when clicking a host"
                        >
                            <div className="flex gap-2">
                                {(['ssh', 'sftp'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => updateBehaviorSettings({ defaultConnectionType: type })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium uppercase transition-all ${settings.behavior.defaultConnectionType === type
                                                ? 'bg-white text-black'
                                                : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#2C2C2E]'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </SettingRow>

                        <SettingRow
                            label="Close Confirmation"
                            description="Warn before closing active sessions"
                        >
                            <Toggle
                                checked={settings.behavior.closeConfirmation}
                                onChange={(checked) => updateBehaviorSettings({ closeConfirmation: checked })}
                            />
                        </SettingRow>
                    </div>
                )}
            </div>
        </div>
    );
}

// Setting Row Component
function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-[#1C1C1E]">
            <div>
                <h3 className="text-sm font-medium text-[#E5E5EA]">{label}</h3>
                <p className="text-xs text-[#8E8E93] mt-0.5">{description}</p>
            </div>
            <div>{children}</div>
        </div>
    );
}

// Toggle Component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-white' : 'bg-[#2C2C2E]'}`}
        >
            <div
                className={`absolute top-1 w-4 h-4 rounded-full transition-all ${checked ? 'left-6 bg-black' : 'left-1 bg-[#8E8E93]'
                    }`}
            />
        </button>
    );
}
