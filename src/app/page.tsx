'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useHostStore } from '@/stores/hostStore';
import { useSessionStore } from '@/stores/sessionStore';

function PageContent() {
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
                addSession({
                    id: crypto.randomUUID(),
                    type: 'ssh',
                    hostId: host.id,
                    label: host.label,
                });
                processedRef.current = true;
                router.replace('/');
            }
        }
    }, [hostId, hosts, addSession, router]);

    return null;
}

export default function Page() {
    return (
        <Suspense fallback={null}>
            <PageContent />
        </Suspense>
    );
}
