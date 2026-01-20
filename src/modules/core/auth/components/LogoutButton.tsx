// src/modules/core/auth/components/LogoutButton.tsx
'use client'

import { signOut } from '../actions'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

export function LogoutButton() {
    const [isLoading, setIsLoading] = useState(false)

    const handleLogout = async () => {
        setIsLoading(true)
        try {
            await signOut()
        } catch (error) {
            console.error('Logout failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
            <LogOut className="w-4 h-4" />
            {isLoading ? 'Signing out...' : 'Sign out'}
        </button>
    )
}
