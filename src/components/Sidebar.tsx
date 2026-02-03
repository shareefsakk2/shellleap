'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, Terminal, Key, Settings } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import clsx from 'clsx';

export function Sidebar() {
    const pathname = usePathname();
    const sidebarPosition = useSettingsStore((state) => state.settings.appearance.sidebarPosition);

    const isActive = (path: string) => pathname === path;
    const linkClass = (path: string) => clsx(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium",
        isActive(path)
            ? "bg-[#1C1C1E] text-white shadow-sm"
            : "text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E]/50"
    );

    return (
        <aside className={clsx(
            "w-[260px] flex flex-col py-6 bg-black shrink-0 h-full",
            sidebarPosition === 'left' ? "border-r border-[#1C1C1E]" : "border-l border-[#1C1C1E]"
        )}>
            {/* App Header */}
            <div className="mb-8 px-5">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="ShellLeap"
                        className="w-9 h-9 object-contain grayscale"
                    />
                    <div className="flex flex-col">
                        <span className="text-base font-mono font-bold text-[#E5E5EA] tracking-tight leading-tight">ShellLeap</span>
                        <span className="text-[10px] text-[#505055] font-medium uppercase tracking-wider">SSH Client</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 flex flex-col gap-2 px-4">
                <Link href="/" className={linkClass("/")}>
                    <Layers size={18} />
                    <span>Sessions</span>
                </Link>
                <Link href="/hosts/" className={linkClass("/hosts/")}>
                    <Terminal size={18} />
                    <span>Hosts</span>
                </Link>
                <Link href="/keychain/" className={linkClass("/keychain/")}>
                    <Key size={18} />
                    <span>Keychain</span>
                </Link>
            </nav>

            {/* Settings at bottom */}
            <div className="px-4 pt-4 mt-auto border-t border-[#1C1C1E]">
                <Link href="/settings/" className={linkClass("/settings/")}>
                    <Settings size={18} />
                    <span>Settings</span>
                </Link>
            </div>
        </aside>
    );
}
