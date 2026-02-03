'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-5 border-b border-[#2C2C2E] shrink-0">
                    <h3 className="text-lg font-bold text-[#E5E5EA] tracking-tight">{title}</h3>
                    <button onClick={onClose} className="text-[#8E8E93] hover:text-white transition-colors bg-[#2C2C2E] hover:bg-[#3A3A3C] p-1.5 rounded-full">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
