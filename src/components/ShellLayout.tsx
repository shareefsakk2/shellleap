'use client';

import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { SessionWorkspace } from "./SessionWorkspace";
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export function ShellLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // We show SessionWorkspace only when we are technically at the root '/', 
    // OR we persist it always but using display:none?
    // Using display:none maintains the state and DOM (so XTerm stays alive).
    // If we only render it when pathname === '/', then it unmounts -> connection lost.
    // So we must render it always, but hidden if not home.

    const isHome = pathname === '/';

    return (
        <>
            <TitleBar />
            <div className="flex-1 flex overflow-hidden relative">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    {/* The Persistent Session Layer */}
                    <div className={clsx("absolute inset-0 z-0 flex flex-col", isHome ? "visible" : "invisible pointer-events-none")}>
                        <SessionWorkspace />
                    </div>

                    {/* The Page Content Layer (Hosts, Settings, etc) */}
                    {/* If isHome is true, children is likely the empty Page from page.tsx. */}
                    {/* If isHome is false, children is the content of that route. */}
                    {/* We need to ensure the page content has higher Z-index if active. */}
                    <div className={clsx("absolute inset-0 z-10 flex flex-col bg-gray-900", isHome ? "pointer-events-none bg-transparent" : "")}>
                        {!isHome && children}
                    </div>
                </main>
            </div>
        </>
    );
}
