import { EmptyState } from '../EmptyState';

// =====================================================
// Documents Empty State
// =====================================================

export function DocumentsEmptyState() {
    return (
        <EmptyState
            icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            }
            title="No documents yet"
            description="Create your first document to get started with Command Center."
            action={{
                label: 'Create Document',
                href: '/documents/new',
            }}
        />
    );
}

// =====================================================
// Leads Empty State
// =====================================================

interface LeadsEmptyStateProps {
    onSeedData?: () => void;
    isSeeding?: boolean;
}

export function LeadsEmptyState({ onSeedData, isSeeding }: LeadsEmptyStateProps) {
    return (
        <EmptyState
            icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                </svg>
            }
            title="No leads found"
            description="Start tracking your sales pipeline by adding leads."
            action={onSeedData ? {
                label: isSeeding ? 'Creating...' : 'Add Sample Leads',
                onClick: onSeedData,
            } : undefined}
            secondaryAction={{
                label: 'Learn More',
                href: '/docs/crm',
            }}
        />
    );
}

// =====================================================
// Search Empty State
// =====================================================

interface SearchEmptyStateProps {
    query: string;
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
    return (
        <EmptyState
            size="sm"
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            }
            title={`No results for "${query}"`}
            description="Try different keywords or check your spelling."
        />
    );
}

// =====================================================
// Recent Activity Empty State
// =====================================================

export function RecentActivityEmptyState() {
    return (
        <EmptyState
            size="sm"
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            }
            title="No recent activity"
            description="Your recent documents will appear here."
        />
    );
}

// =====================================================
// Widget Empty State (Generic)
// =====================================================

interface WidgetEmptyStateProps {
    widgetName: string;
}

export function WidgetEmptyState({ widgetName }: WidgetEmptyStateProps) {
    return (
        <EmptyState
            size="sm"
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                </svg>
            }
            title={`No ${widgetName} data`}
            description="Configure this widget or add some data to get started."
        />
    );
}

// =====================================================
// Error State (For failed loads)
// =====================================================

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export function ErrorState({
    title = 'Something went wrong',
    message = "We couldn't load this content.",
    onRetry
}: ErrorStateProps) {
    return (
        <EmptyState
            icon={
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            }
            title={title}
            description={message}
            action={onRetry ? {
                label: 'Try Again',
                onClick: onRetry,
            } : undefined}
        />
    );
}
