'use client';

import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { SessionWorkspace } from "./SessionWorkspace";
import { usePathname } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Eye, EyeOff, Shield, Lock, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export function ShellLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isHome = !pathname || pathname === '/' || pathname === '/index.html';

    const [securityStatus, setSecurityStatus] = useState<{ isEncrypted: boolean, isUnlocked: boolean } | null>(null);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined' && window.electron) {
            checkSecurity();
        } else {
            // Browser dev mode fallback
            setSecurityStatus({ isEncrypted: false, isUnlocked: true });
        }
    }, []);

    const checkSecurity = async () => {
        const status = await window.electron.invoke('security-get-status');
        setSecurityStatus(status);
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const res = await window.electron.invoke('security-set-password', password);
        if (res.success) {
            setPassword('');
            checkSecurity();
        } else {
            setError(res.error || 'Invalid password');
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 4) return setError('Password must be at least 4 characters');
        const res = await window.electron.invoke('security-set-password', password);
        if (res.success) {
            setPassword('');
            // We reload because we want all stores to re-fetch now that we have a master key
            window.location.reload();
        } else {
            setError(res.error || 'Setup failed');
        }
    };

    if (!securityStatus) return null; // Loading

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden">
            <TitleBar />

            {!securityStatus.isUnlocked || !securityStatus.isEncrypted ? (
                <div className="flex-1 relative overflow-hidden bg-[#111827]">
                    <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>

                    {/* Setup Screen */}
                    {!securityStatus.isEncrypted ? (
                        <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in zoom-in duration-300">
                            <div className="w-full max-w-2xl space-y-8 text-center relative z-10">
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 text-indigo-400">
                                        <Shield size={40} />
                                    </div>
                                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Secure Your Vault</h1>
                                    <p className="text-gray-400 leading-relaxed max-w-md mx-auto">
                                        ShellLeap uses <span className="text-indigo-400 font-semibold text-lg">AES-256-GCM</span> to protect your server credentials and private keys on your disk.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                    <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Lock size={18} className="text-indigo-400" />
                                            <h3 className="font-semibold text-white">Private & Local</h3>
                                        </div>
                                        <p className="text-sm text-gray-500">Your data never leaves this computer. It's only unlocked when you login to your OS.</p>
                                    </div>
                                    <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Shield size={18} className="text-green-400" />
                                            <h3 className="font-semibold text-white">Set Once</h3>
                                        </div>
                                        <p className="text-sm text-gray-500">We store your key securely in your system keychain. You won't be asked for this password again.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSetup} className="mt-8 space-y-4 max-w-sm mx-auto">
                                    <div className="relative group">
                                        <input
                                            autoFocus
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Create Master Password"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 pr-12 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-center font-mono text-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {error && <p className="text-red-400 text-sm animate-pulse">{error}</p>}
                                    <button
                                        type="submit"
                                        className="w-full group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-4 font-bold transition-all shadow-xl shadow-indigo-600/30 active:scale-[0.98]"
                                    >
                                        Enable Encrypted Vault
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </form>
                                <p className="text-xs text-gray-600">Warning: If you lose this password, you lose access to all your stored server data.</p>
                            </div>
                        </div>
                    ) : (
                        /* Unlock Screen */
                        <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in duration-300">
                            <div className="w-full max-w-sm space-y-8 text-center relative z-10">
                                <div className="flex flex-col items-center">
                                    <img src="/logo.png" alt="ShellLeap" className="w-16 h-16 object-contain mb-4 animate-pulse" />
                                    <h2 className="text-3xl font-bold tracking-tight">
                                        <span className="text-white">Shell</span>
                                        <span className="text-[#FF6A00]">Leap</span>
                                    </h2>
                                    <p className="mt-2 text-sm text-gray-500">Enter your Master Password to unlock your vault.</p>
                                </div>

                                <form onSubmit={handleUnlock} className="mt-8 space-y-4">
                                    <div className="relative group">
                                        <input
                                            autoFocus
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Master Password"
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-center font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {error && <p className="text-red-400 text-sm">{error}</p>}
                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                                    >
                                        Unlock Vault
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden relative">
                    <Sidebar />
                    <main className="flex-1 flex flex-col overflow-hidden relative">
                        {/* The Persistent Session Layer */}
                        <div className={clsx("absolute inset-0 z-0 flex flex-col", isHome ? "visible" : "invisible pointer-events-none")}>
                            <SessionWorkspace />
                        </div>

                        {/* The Page Content Layer (Hosts, Settings, etc) */}
                        <div className={clsx("absolute inset-0 z-10 flex flex-col bg-gray-900 transition-all duration-300", isHome ? "pointer-events-none bg-transparent" : "z-20")}>
                            <Suspense fallback={null}>
                                {children}
                            </Suspense>
                        </div>
                    </main>
                </div>
            )}
        </div>
    );
}
