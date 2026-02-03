'use client';

import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
    const minimize = () => window.electron.invoke('window-minimize');
    const maximize = () => window.electron.invoke('window-maximize');
    const close = () => window.electron.invoke('window-close');

    return (
        <div className="h-8 bg-black flex justify-end items-center select-none drag-region border-b border-[#1C1C1E]">
            <div className="flex items-center h-full no-drag-region">
                <button
                    onClick={minimize}
                    className="h-full w-10 flex items-center justify-center hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={maximize}
                    className="h-full w-10 flex items-center justify-center hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={close}
                    className="h-full w-10 flex items-center justify-center hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
