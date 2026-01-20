'use client';

/**
 * User Menu Component
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Dropdown menu showing user info and logout option.
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signOut } from '../actions/authActions';
import type { AuthUser } from '../types';

interface UserMenuProps {
    user: AuthUser;
}

export function UserMenu({ user }: UserMenuProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close menu on escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    async function handleSignOut() {
        setIsLoading(true);

        try {
            await signOut();
            toast.success('Signed out successfully');
            // signOut will redirect to /login
        } catch (error) {
            toast.error('Failed to sign out. Please try again.');
            console.error('[UserMenu] Sign out error:', error);
            setIsLoading(false);
        }
    }

    // Get user initials for avatar
    const initials = user.fullName
        ? user.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : user.email[0].toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center gap-2 p-1.5 rounded-lg
          hover:bg-gray-100 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors
        `}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {/* Avatar */}
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user.fullName || user.email}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">{initials}</span>
                    </div>
                )}

                {/* Chevron */}
                <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`
            absolute right-0 mt-2 w-64 origin-top-right
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            z-50
          `}
                    role="menu"
                    aria-orientation="vertical"
                >
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.fullName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <a
                            href="/settings/profile"
                            className={`
                flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
              `}
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                            Profile Settings
                        </a>

                        <a
                            href="/settings/workspace"
                            className={`
                flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
              `}
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                            Workspace Settings
                        </a>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                        <button
                            type="button"
                            onClick={handleSignOut}
                            disabled={isLoading}
                            className={`
                flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-900/20
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                            role="menuitem"
                        >
                            {isLoading ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                    />
                                </svg>
                            )}
                            {isLoading ? 'Signing out...' : 'Sign out'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
