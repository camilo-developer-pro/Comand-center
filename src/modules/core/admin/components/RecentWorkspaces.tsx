'use client';

/**
 * Recent Workspaces
 * 
 * Shows recent workspaces with ability to impersonate/switch.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getAllWorkspaces, impersonateWorkspace } from '../actions/superAdminActions';
import { toast } from 'sonner';
import Link from 'next/link';

export function RecentWorkspaces() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

    const { data: workspaces, isLoading, error } = useQuery({
        queryKey: ['admin', 'workspaces'],
        queryFn: async () => {
            const result = await getAllWorkspaces();
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
    });

    const impersonateMutation = useMutation({
        mutationFn: async (workspaceId: string) => {
            setImpersonatingId(workspaceId);
            const result = await impersonateWorkspace(workspaceId);
            if (!result.success) throw new Error(result.error);
            return result;
        },
        onSuccess: (_, workspaceId) => {
            const workspace = workspaces?.find(w => w.id === workspaceId);
            toast.success(`Switched to "${workspace?.name || 'workspace'}"`);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            router.push('/documents');
        },
        onError: (error) => {
            toast.error(`Failed to switch: ${error.message}`);
        },
        onSettled: () => {
            setImpersonatingId(null);
        },
    });

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-700 p-6">
                <p className="text-red-600 dark:text-red-400">Error loading workspaces</p>
            </div>
        );
    }

    const recentWorkspaces = workspaces?.slice(0, 5) || [];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                    Recent Workspaces
                </h2>
                <Link
                    href="/admin/workspaces"
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                    View all
                </Link>
            </div>

            {/* Workspace List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentWorkspaces.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        No workspaces found
                    </div>
                ) : (
                    recentWorkspaces.map((workspace) => (
                        <div
                            key={workspace.id}
                            className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {/* Workspace Icon */}
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                    {workspace.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Workspace Info */}
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {workspace.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {workspace.document_count} docs • {workspace.member_count} members
                                    </p>
                                </div>
                            </div>

                            {/* Impersonate Button */}
                            <button
                                onClick={() => impersonateMutation.mutate(workspace.id)}
                                disabled={impersonatingId === workspace.id}
                                className={`
                                    px-3 py-1.5 text-sm font-medium rounded-lg
                                    transition-colors duration-150
                                    ${impersonatingId === workspace.id
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900'
                                    }
                                `}
                            >
                                {impersonatingId === workspace.id ? (
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Switching...
                                    </span>
                                ) : (
                                    'Enter'
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
