'use client';

/**
 * Widget Error Boundary
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * Isolates widget errors so one failing widget doesn't crash the entire document.
 * Provides graceful degradation with retry capability.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    widgetType?: string;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error for debugging
        console.error('[WidgetErrorBoundary] Widget crashed:', {
            widgetType: this.props.widgetType,
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        });

        // Call optional error callback
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <WidgetErrorFallback
                    widgetType={this.props.widgetType}
                    error={this.state.error}
                    onRetry={this.handleRetry}
                />
            );
        }

        return this.props.children;
    }
}

// ============================================================
// Error Fallback Component
// ============================================================

interface WidgetErrorFallbackProps {
    widgetType?: string;
    error: Error | null;
    onRetry: () => void;
}

function WidgetErrorFallback({ widgetType, error, onRetry }: WidgetErrorFallbackProps) {
    const [showDetails, setShowDetails] = React.useState(false);

    return (
        <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
                {/* Error Icon */}
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

                {/* Error Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Widget Error
                        {widgetType && (
                            <span className="ml-2 text-red-600 dark:text-red-400 font-normal">
                                ({widgetType})
                            </span>
                        )}
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        This widget encountered an error and couldn&apos;t be displayed.
                    </p>

                    {/* Error Details (collapsible) */}
                    {error && (
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                            >
                                {showDetails ? 'Hide details' : 'Show details'}
                            </button>

                            {showDetails && (
                                <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs text-red-800 dark:text-red-200 overflow-x-auto">
                                    {error.message}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                        <button
                            type="button"
                            onClick={onRetry}
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

export { WidgetErrorFallback };
