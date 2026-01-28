'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, Terminal, Folder, Key } from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;
    const linkClass = (path: string) => clsx(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-sm font-medium",
        isActive(path) ? "bg-indigo-600 text-white" : "hover:bg-gray-800 text-gray-400 hover:text-white"
    );

    return (
        <aside className="w-64 flex flex-col py-4 bg-gray-950 border-r border-gray-800 shrink-0 h-full">
            <div className="mb-6 px-4">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="ShellLeap" className="w-8 h-8 object-contain" />
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-tight tracking-tight">
                            <span className="text-white">Shell</span>
                            <span className="text-[#FF6A00]">Leap</span>
                        </span>
                        <div className="h-0.5 w-8 bg-indigo-500 rounded-full"></div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-1 w-full px-2">
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


        </aside>
    );
}
