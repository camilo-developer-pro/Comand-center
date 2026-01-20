/**
 * Widget Test Page
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * A dedicated page for testing widgets independently from the editor.
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { LeadListWidget } from '@/modules/crm/components/LeadListWidget';
import { WidgetErrorBoundary } from '@/modules/editor/components/WidgetErrorBoundary';
import { LeadListSkeleton } from '@/modules/editor/components/WidgetSkeleton';
import { AccessDeniedState } from '@/modules/editor/components/AccessDeniedState';

export const metadata: Metadata = {
    title: 'Widget Testing - Command Center',
    description: 'Test page for widget development',
};

export default function WidgetsTestPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Widget Testing
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Test and preview widgets in isolation before embedding in documents.
                </p>
            </div>

            {/* Test Sections */}
            <div className="grid gap-8">

                {/* Section 1: Live CRM Widget */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            1. CRM Lead List Widget (Live Data)
                        </h2>
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                            Active
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This widget fetches real leads from your workspace. Click on status badges to update.
                    </p>

                    <WidgetErrorBoundary widgetType="crm-leads">
                        <Suspense fallback={<LeadListSkeleton />}>
                            <LeadListWidget
                                config={{
                                    title: 'My Leads',
                                    showValue: true,
                                    showCompany: true,
                                    maxItems: 10,
                                }}
                            />
                        </Suspense>
                    </WidgetErrorBoundary>
                </section>

                {/* Section 2: Filtered Widget */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            2. Filtered Lead List (New & Contacted Only)
                        </h2>
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                            Filtered
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Same widget with a status filter applied via configuration.
                    </p>

                    <WidgetErrorBoundary widgetType="crm-leads">
                        <Suspense fallback={<LeadListSkeleton />}>
                            <LeadListWidget
                                config={{
                                    title: 'New & Contacted Leads',
                                    filterStatus: ['new', 'contacted'],
                                    showValue: false,
                                    showCompany: true,
                                    maxItems: 5,
                                }}
                            />
                        </Suspense>
                    </WidgetErrorBoundary>
                </section>

                {/* Section 3: Loading State Demo */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            3. Loading Skeleton
                        </h2>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 rounded">
                            Static
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This is what users see while the widget is loading.
                    </p>

                    <LeadListSkeleton />
                </section>

                {/* Section 4: Access Denied Demo */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            4. Access Denied State
                        </h2>
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                            Error State
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This is shown when RLS denies access to widget data.
                    </p>

                    <AccessDeniedState
                        widgetType="CRM Leads"
                        title="CRM Access Restricted"
                        message="You don't have permission to view CRM leads in this workspace."
                    />
                </section>

                {/* Section 5: Error Boundary Demo */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            5. Error Boundary Demo
                        </h2>
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                            Error State
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This is shown when a widget crashes due to a runtime error.
                    </p>

                    <WidgetErrorBoundary widgetType="demo-widget">
                        <BrokenWidget />
                    </WidgetErrorBoundary>
                </section>

            </div>
        </div>
    );
}

// ============================================================
// Demo Component that throws an error
// ============================================================

function BrokenWidget() {
    // This simulates a widget that crashed
    // In real usage, the error boundary would catch actual runtime errors
    return (
        <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                    <svg
                        className="w-5 h-5 text-red-600 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Widget Error
                        <span className="ml-2 text-red-600 dark:text-red-400 font-normal">
                            (demo-widget)
                        </span>
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        This widget encountered an error and couldn&apos;t be displayed.
                    </p>
                    <div className="mt-3">
                        <button
                            type="button"
                            className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 rounded transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
