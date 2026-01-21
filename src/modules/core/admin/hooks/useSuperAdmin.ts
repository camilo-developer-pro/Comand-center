'use client';

/**
 * Super Admin Hook
 * 
 * Provides super admin status and related utilities.
 */

import { useQuery } from '@tanstack/react-query';
import { checkSuperAdminStatus } from '../actions/superAdminActions';

export const superAdminKeys = {
    all: ['super-admin'] as const,
    status: () => [...superAdminKeys.all, 'status'] as const,
};

export function useSuperAdmin() {
    return useQuery({
        queryKey: superAdminKeys.status(),
        queryFn: async () => {
            const result = await checkSuperAdminStatus();
            if (!result.success) {
                // If checking fails, assume not admin to be safe
                return false;
            }
            return result.data;
        },
        staleTime: 5 * 60 * 1000,  // 5 minutes
        gcTime: 10 * 60 * 1000,    // 10 minutes
        retry: false,
    });
}
