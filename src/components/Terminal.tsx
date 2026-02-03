'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { useHostStore, Host } from '@/stores/hostStore';
import { useIdentityStore } from '@/stores/identityStore';
import { Autosuggest } from '@/utils/Autosuggest';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { SystemStats } from './SystemStats';

interface TerminalProps {
    hostId: string;
    sessionId: string;
    active?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ hostId, sessionId, active = true }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const searchAddonRef = useRef<SearchAddon | null>(null);

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [suggestionPos, setSuggestionPos] = useState({ x: 0, y: 0 });
    const autosuggestRef = useRef<Autosuggest>(new Autosuggest());
    const inputBufferRef = useRef('');

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Load defaults
        autosuggestRef.current.loadDefaults([
            'ls', 'cd', 'git', 'docker', 'kubectl', 'npm', 'yarn', 'pnpm', 'node', 'python',
            'ssh', 'scp', 'grep', 'find', 'htop', 'systemctl', 'journalctl', 'tail', 'cat', 'vi', 'nano'
        ]);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new XTerm({
            theme: {
                background: '#111827', // Tailwind gray-900
                foreground: '#F3F4F6', // Tailwind gray-100
                cursor: '#ffffff',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            cursorBlink: true,
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        const searchAddon = new SearchAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());
        term.loadAddon(searchAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        term.attachCustomKeyEventHandler((arg) => {
            // Search Toggle (Ctrl+F)
            if (arg.ctrlKey && arg.code === 'KeyF' && arg.type === 'keydown') {
                setIsSearchOpen(prev => !prev);
                return false;
            }
            if (arg.code === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
                searchAddon.clearDecorations();
                term.focus(); // Return focus to terminal
                return false;
            }

            // Copy
            if (arg.ctrlKey && arg.shiftKey && arg.code === 'KeyC' && arg.type === 'keydown') {
                const selection = term.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection);
                    return false;
                }
            }

            // Autosuggest Interaction
            if (arg.type === 'keydown') {
                if (arg.code === 'ArrowRight' && suggestions.length > 0) {
                    // Apply suggestion
                    const rest = suggestions[0].slice(inputBufferRef.current.split(' ').pop()?.length || 0);
                    if (rest) {
                        window.electron.send('ssh-input', { id: sessionId, data: rest });
                        // Optimistically update buffer
                        inputBufferRef.current += rest;
                        setSuggestions([]);
                        return false; // Swallow RightArrow
                    }
                }

                // Reset suggestions on any navigation/modification that invalidates simple buffer logic
                if (arg.code === 'Enter' || arg.ctrlKey) {
                    if (arg.code === 'Enter') {
                        // Learn
                        const cmd = inputBufferRef.current.trim();
                        if (cmd) autosuggestRef.current.insert(cmd.split(' ')[0]); // Learn first word
                        inputBufferRef.current = '';
                    }
                    setSuggestions([]);
                }
            }
            return true;
        });

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;
        searchAddonRef.current = searchAddon;

        // Handle Input
        term.onData((data) => {
            window.electron.send('ssh-input', { id: sessionId, data });

            // Basic Input Tracking
            if (data === '\r') {
                // Enter handled in keydown for reliable code checks, but data is raw
            } else if (data === '\u007F') { // Backspace
                inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
                inputBufferRef.current += data;
            }

            // check suggestions
            const currentWord = inputBufferRef.current.split(' ').pop() || '';
            const results = autosuggestRef.current.search(currentWord);

            // Only show if we have results and user typed at least 1 char matching
            if (results.length > 0 && currentWord.length > 0 && results[0] !== currentWord && !isSearchOpen) {
                setSuggestions(results);
                // Calculate position
                if (term.buffer.active.cursorY < term.rows - 1) { // Avoid suggesting if at very bottom edge complications
                    // Rough estimate: cursorX * charWidth
                    // Since we use FitAddon, we need real DOM dimensions
                    // Note: XTerm doesn't easily give pixel offset of cursor relative to container.
                    // We can use cursorY * lineHeight
                    // But we don't know lineHeight exactly without checking DOM.
                    // Let's rely on fixed sizing assumption: 14px font ~ 17px line height?
                    // Better: just show at bottom left or static place for v1.
                    // Or retrieve renderer dimensions
                    const renderer = (term as any)._core._renderService;
                    const charWidth = renderer.dimensions.actualCellWidth;
                    const lineHeight = renderer.dimensions.actualCellHeight;

                    setSuggestionPos({
                        x: term.buffer.active.cursorX * charWidth + 10,
                        y: (term.buffer.active.cursorY + 1) * lineHeight
                    });
                }
            } else {
                setSuggestions([]);
            }
        });

        // ... (rest of listeners)
        term.onResize((size) => {
            window.electron.send('ssh-resize', { id: sessionId, size });
        });

        const handleData = (_: any, data: string) => {
            term.write(data);
        };

        window.electron.on(`ssh-data-${sessionId}`, handleData);
        setTimeout(() => fitAddon.fit(), 100);
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            term.dispose();
            window.electron.off(`ssh-data-${sessionId}`, handleData);
            window.removeEventListener('resize', handleResize);
        };
    }, [sessionId]);

    // ... (rest of connect logic)

    useEffect(() => {
        if (active && fitAddonRef.current) {
            fitAddonRef.current.fit();
            // Restore focus if search closed
            if (!isSearchOpen) terminalRef.current?.focus();
        }
    }, [active, isSearchOpen]);

    // Search Logic
    useEffect(() => {
        if (!searchAddonRef.current) return;
        if (searchQuery) {
            searchAddonRef.current.findNext(searchQuery, { incremental: true });
        } else {
            searchAddonRef.current.clearDecorations();
        }
    }, [searchQuery]);

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
                const dims = fitAddonRef.current?.proposeDimensions();
                const options = {
                    rows: dims?.rows || 24,
                    cols: dims?.cols || 80,
                    term: 'xterm-256color',
                };
                const res = await window.electron.invoke('ssh-connect', { id: sessionId, config, options });

                if (!isMounted) return;

                if (!res.success) {
                    terminalRef.current?.writeln(`\r\nConnection failed: ${res.error}`);
                } else if (res.reattached) {
                    // Re-attachment logic: Restore buffer and clear breadcrumbs
                    const buffer = await window.electron.invoke('ssh-get-buffer', { id: sessionId });
                    if (isMounted && terminalRef.current) {
                        terminalRef.current.clear(); // Clear the "Connecting..." breadcrumbs
                        terminalRef.current.reset();
                        terminalRef.current.write(buffer);
                        // Focus the terminal
                        terminalRef.current.focus();
                    }
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
            // Cleanup handled at SessionWorkspace level
        };
    }, [sessionId, hostId]);

    return (
        <div ref={containerRef} className="h-full w-full overflow-hidden relative group">
            {/* Autosuggest UI */}
            {suggestions.length > 0 && (
                <div
                    className="absolute z-50 bg-gray-800 border border-gray-700 shadow-xl rounded px-2 py-1 flex flex-col gap-0.5 animate-in fade-in zoom-in duration-75"
                    style={{ left: suggestionPos.x, top: suggestionPos.y }}
                >
                    {suggestions.map((s, i) => (
                        <div key={i} className={`text-xs font-mono ${i === 0 ? 'text-indigo-400 font-bold' : 'text-gray-500'}`}>
                            {s} {i === 0 && <span className="opacity-50 text-[10px] ml-2">→</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Search UI */}
            {isSearchOpen && (
                <div className="absolute top-2 right-2 z-50 bg-[#1f2937] border border-gray-700 rounded shadow-lg p-1 flex items-center gap-1 animate-in slide-in-from-top-2 duration-150">
                    <div className="relative">
                        <input
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (e.shiftKey) searchAddonRef.current?.findPrevious(searchQuery);
                                    else searchAddonRef.current?.findNext(searchQuery);
                                }
                            }}
                            placeholder="Find..."
                            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white w-32 focus:outline-none focus:border-indigo-500"
                        />
                        {searchQuery && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                                {/* Potential: Add match count via onResult */}
                            </span>
                        )}
                    </div>
                    <div className="flex bg-gray-800 rounded border border-gray-700">
                        <button
                            onClick={() => searchAddonRef.current?.findPrevious(searchQuery)}
                            className="p-1 hover:bg-gray-700 text-gray-400 hover:text-white border-r border-gray-700"
                            title="Previous (Shift+Enter)"
                        >
                            <ChevronUp size={12} />
                        </button>
                        <button
                            onClick={() => searchAddonRef.current?.findNext(searchQuery)}
                            className="p-1 hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Next (Enter)"
                        >
                            <ChevronDown size={12} />
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            searchAddonRef.current?.clearDecorations();
                            terminalRef.current?.focus();
                        }}
                        className="p-1 hover:bg-red-900/50 text-gray-500 hover:text-red-400 rounded transition-colors ml-1"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};
