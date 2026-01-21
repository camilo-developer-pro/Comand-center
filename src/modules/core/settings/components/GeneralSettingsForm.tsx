'use client';

/**
 * General Settings Form Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { updateWorkspaceSettings } from '../actions/settingsActions';
import type { WorkspaceSettings } from '../types';

interface GeneralSettingsFormProps {
    workspace: WorkspaceSettings;
}

interface FormData {
    name: string;
    description: string;
}

export function GeneralSettingsForm({ workspace }: GeneralSettingsFormProps) {
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            name: workspace.name,
            description: workspace.description || ''
        }
    });

    async function onSubmit(data: FormData) {
        setIsSaving(true);
        try {
            const result = await updateWorkspaceSettings({
                name: data.name,
                description: data.description
            });

            if (result.success) {
                toast.success('Workspace updated successfully');
            } else {
                toast.error(result.error || 'Failed to update workspace');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    General Settings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Basic information about your workspace.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                {/* Workspace Name */}
                <div>
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Workspace Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        {...register('name', {
                            required: 'Workspace name is required',
                            maxLength: { value: 100, message: 'Max length is 100 characters' }
                        })}
                        className={`
                            w-full px-3 py-2 border rounded-lg shadow-sm
                            bg-white dark:bg-gray-900
                            focus:outline-none focus:ring-2 focus:ring-blue-500
                            ${errors.name
                                ? 'border-red-300 focus:border-red-500 shadow-red-50'
                                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'}
                            text-gray-900 dark:text-white
                        `}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Description
                    </label>
                    <textarea
                        id="description"
                        rows={3}
                        {...register('description')}
                        className={`
                            w-full px-3 py-2 border rounded-lg shadow-sm
                            bg-white dark:bg-gray-900
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            text-gray-900 dark:text-white
                        `}
                        placeholder="What is this workspace for?"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Brief description of your workspace (optional).
                    </p>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className={`
                            px-4 py-2 bg-blue-600 hover:bg-blue-700 
                            text-white font-medium rounded-lg shadow-sm 
                            transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center gap-2
                        `}
                    >
                        {isSaving && (
                            <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
