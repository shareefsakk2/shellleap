'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useHostStore, Host } from '@/stores/hostStore';
import { useIdentityStore } from '@/stores/identityStore';

interface TerminalProps {
    hostId: string;
    sessionId: string;
    active?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ hostId, sessionId, active = true }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new XTerm({
            theme: {
                background: '#111827', // Tailwind gray-900
                foreground: '#F3F4F6', // Tailwind gray-100
                cursor: '#ffffffff',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            cursorBlink: true,
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        term.open(containerRef.current);
        fitAddon.fit();

        term.attachCustomKeyEventHandler((arg) => {
            if (arg.ctrlKey && arg.shiftKey && arg.code === 'KeyC' && arg.type === 'keydown') {
                const selection = term.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection);
                    return false; // Prevent default
                }
            }
            return true;
        });

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        // Handle Input
        term.onData((data) => {
            window.electron.send('ssh-input', { id: sessionId, data });
        });

        // Handle Resize
        term.onResize((size) => {
            window.electron.send('ssh-resize', { id: sessionId, size });
        });

        // Handle Incoming Data
        const handleData = (_: any, data: string) => {
            term.write(data);
        };

        window.electron.on(`ssh-data-${sessionId}`, handleData);

        // Initial resize
        setTimeout(() => fitAddon.fit(), 100);

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            term.dispose();
            window.electron.off(`ssh-data-${sessionId}`, handleData);
            window.removeEventListener('resize', handleResize);
        };
    }, [sessionId]);

    useEffect(() => {
        if (active && fitAddonRef.current) {
            fitAddonRef.current.fit();
        }
    }, [active]);

    // Connect on mount
    useEffect(() => {
        let isMounted = true;
        let timer: NodeJS.Timeout;

        const connect = async () => {
            const hosts = useHostStore.getState().hosts;
            const identities = useIdentityStore.getState().identities;

            const host = hosts.find((h: any) => h.id === hostId);
            if (!host) {
                if (isMounted) terminalRef.current?.writeln('Host not found.');
                return;
            }

            const resolveConfig = (h: any): any => {
                const config: any = {
                    host: h.address,
                    port: h.port || 22,
                    username: h.username || 'root',
                    tunnels: h.tunnels,
                };

                if (h.identityId) {
                    const identity = identities.find((i: any) => i.id === h.identityId);
                    if (identity && identity.secret) {
                        if (identity.type === 'password') {
                            config.password = identity.secret;
                        } else if (identity.type === 'key') {
                            config.privateKey = identity.secret;
                        }
                    }
                }

                if (h.jumpHostId) {
                    const jumpHost = hosts.find((j: any) => j.id === h.jumpHostId);
                    if (jumpHost) {
                        config.jumpHost = resolveConfig(jumpHost);
                    }
                }
                return config;
            };

            const config = resolveConfig(host);

            if (isMounted) {
                terminalRef.current?.reset();
                terminalRef.current?.writeln(`Connecting to ${host.label} (${host.address})...`);
            }

            try {
                const res = await window.electron.invoke('ssh-connect', { id: sessionId, config });

                if (!isMounted) return;

                if (!res.success) {
                    terminalRef.current?.writeln(`\r\nConnection failed: ${res.error}`);
                } else {
                    terminalRef.current?.writeln(`\r\nConnected.\r\n`);
                    terminalRef.current?.focus();
                }
            } catch (e: any) {
                if (isMounted) terminalRef.current?.writeln(`\r\nError: ${e.message}`);
            }
        };

        // Small delay to ensure render
        timer = setTimeout(connect, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            // We do NOT want to auto-disconnect on simple re-renders if the session persists in the store.
            // However, React effect cleanup runs on unmount.
            // If the tab is closed, we want to disconnect.
            // If the user navigates away, we technically Unmount.
            // This is the tricky part. If we navigate away and come back, we get a NEW component instance but with the SAME sessionId (from store).
            // If we disconnect here, the session dies.
            // But if we DON'T disconnect here, we leak sessions if the user closes the app or if we don't have a way to detect "Tab Close" vs "Unmount".
            // The SessionStore handles "Closing" the tab.
            // If we navigate away, we probably WANT to keep the SSH connection alive in Main process?
            // User requirement: "session is reconnecting everytime i switch the view and come back. fix it"
            // So: DO NOT disconnect in cleanup.
            // BUT: We need to attach to existing stream if it exists.
            // The current implementation of `ssh-connect` creates a NEW connection. We should modify it to "get or create".
            // For now, let's keep disconnect here to avoid leaks, but since we are preventing Unmount (via Layout/CSS hiding), this cleanup shouldn't run on tab switch.
            // Wait, does SessionWorkspace unmount on route change? Yes.
            // So if we navigate, we unmount -> disconnect.
            // We need to NOT disconnect on unmount, only on explicit "Close".
            // OR move SessionWorkspace to Layout.
            // For now, removing `ssh-disconnect` from cleanup is risky but solves "reconnecting" IF we can re-attach.
            // Actually, the simplest fix for "reconnecting" is to just NOT disconnect. The `ssh-connect` call will just replace the session if we re-run it?
            // `ssh.ts`: `if (sessions.has(id)) { sessions.get(id)?.end(); }`. Yes, it kills the old one.
            // So we effectively reconnect.
            // To truly fix "reconnecting", we must NOT unmount.

            // Let's implement the "Use sessionId" change first, as that fixes point 3 and 2.
            // Point 1 (reconnecting) requires Architectural change (Layout) as discussed.
            window.electron.invoke('ssh-disconnect', { id: sessionId });
        };
    }, [sessionId, hostId]);
    return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
};
