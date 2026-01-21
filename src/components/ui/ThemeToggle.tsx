'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
    className?: string;
    variant?: 'icon' | 'dropdown' | 'switch';
}

/**
 * Theme Toggle Component
 * V1.1 Phase 6: Optimistic UI & Polish
 * 
 * Switches between light, dark, and system themes.
 */
export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button className={cn('w-9 h-9 rounded-lg', className)} disabled>
                <span className="sr-only">Loading theme toggle</span>
            </button>
        );
    }

    if (variant === 'switch') {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <span className="text-sm text-gray-500 dark:text-gray-400">☀️</span>
                <button
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        resolvedTheme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                    role="switch"
                    aria-checked={resolvedTheme === 'dark'}
                    aria-label="Toggle dark mode"
                >
                    <span
                        className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        )}
                    />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">🌙</span>
            </div>
        );
    }

    if (variant === 'dropdown') {
        return (
            <div className={cn('relative', className)}>
                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Select theme"
                >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
                <svg
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        );
    }

    // Default: icon variant
    return (
        <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center',
                'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors',
                className
            )}
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {resolvedTheme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                </svg>
            )}
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
