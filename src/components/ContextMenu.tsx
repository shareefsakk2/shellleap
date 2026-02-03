'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2, X } from 'lucide-react';

interface MenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface ContextMenuProps {
    items: MenuItem[];
    trigger: React.ReactNode;
}

export function ContextMenu({ items, trigger }: ContextMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({ x: rect.right - 150, y: rect.bottom + 5 });
            setIsOpen(!isOpen);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block" ref={triggerRef}>
            <div onClick={toggle} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-50 w-40 bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: position.x, top: position.y }}
                >
                    {items.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                item.onClick();
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#2C2C2E] transition-colors ${item.danger ? 'text-red-400 hover:text-red-300' : 'text-[#E5E5EA] hover:text-white'}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
