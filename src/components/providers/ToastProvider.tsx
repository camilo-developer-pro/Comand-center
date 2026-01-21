'use client';

import { Toaster } from 'sonner';

/**
 * Global Toast Provider
 * V1.1 Phase 6: Optimistic UI & Polish
 */
export function ToastProvider() {
    return (
        <Toaster
            position="bottom-right"
            expand={false}
            richColors
            closeButton
            duration={4000}
            toastOptions={{
                style: {
                    background: 'var(--toast-bg)',
                    border: '1px solid var(--toast-border)',
                    color: 'var(--toast-text)',
                },
                className: 'toast-custom',
            }}
        />
    );
}
