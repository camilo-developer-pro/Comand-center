import { ReactNode } from 'react';

interface AuthLayoutProps {
    children: ReactNode;
}

/**
 * Auth Layout - Public routes wrapper.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            {children}
        </div>
    );
}
