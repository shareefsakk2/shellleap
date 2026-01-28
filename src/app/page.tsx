'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useHostStore } from '@/stores/hostStore';
import { useSessionStore } from '@/stores/sessionStore';
import { SessionWorkspace } from '@/components/SessionWorkspace';
import { useEffect, useRef } from 'react';

export default function Page() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const hostId = searchParams.get('connect');
    const hosts = useHostStore((state: any) => state.hosts);
    const addSession = useSessionStore((state) => state.addSession);
    const processedRef = useRef(false);

    useEffect(() => {
        if (hostId && !processedRef.current) {
            const host = hosts.find((h: any) => h.id === hostId);
            if (host) {
                // Add SSH session
                addSession({
                    id: crypto.randomUUID(),
                    type: 'ssh',
                    hostId: host.id,
                    label: host.label,
                });
                processedRef.current = true;
                // Clear query param to avoid re-adding on soft navs
                router.replace('/');
            }
        }
    }, [hostId, hosts, addSession, router]);

    return null;
}
