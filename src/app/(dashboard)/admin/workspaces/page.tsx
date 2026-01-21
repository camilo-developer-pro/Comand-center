'use client';

/**
 * Admin Workspaces Page
 * 
 * Full list of all workspaces with search and filters.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getAllWorkspaces, impersonateWorkspace } from '@/modules/core/admin/actions/superAdminActions';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import { toast } from 'sonner';

export default function AdminWorkspacesPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
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
            toast.success(`Switched to "${workspace?.name}"`);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            router.push('/documents');
        },
        onError: (error) => {
            toast.error(`Failed: ${error.message}`);
        },
        onSettled: () => {
            setImpersonatingId(null);
        },
    });

    const filteredWorkspaces = workspaces?.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        (w.slug?.toLowerCase() || '').includes(search.toLowerCase())
    ) || [];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        All Workspaces
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {workspaces?.length || 0} workspaces in the system
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search workspaces..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Workspace
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Documents
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Members
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredWorkspaces.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {search ? 'No workspaces match your search' : 'No workspaces found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredWorkspaces.map((workspace) => (
                                    <tr key={workspace.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                                                    {workspace.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {workspace.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        /{workspace.slug || 'no-slug'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {workspace.document_count}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {workspace.member_count}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {formatRelativeTime(workspace.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => impersonateMutation.mutate(workspace.id)}
                                                disabled={impersonatingId === workspace.id}
                                                className={`
                                                    px-4 py-2 text-sm font-medium rounded-lg
                                                    transition-colors duration-150
                                                    ${impersonatingId === workspace.id
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                                                    }
                                                `}
                                            >
                                                {impersonatingId === workspace.id ? 'Switching...' : 'Enter Workspace'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
