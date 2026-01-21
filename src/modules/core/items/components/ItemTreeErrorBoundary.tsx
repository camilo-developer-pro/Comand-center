'use client';

/**
 * ItemTreeErrorBoundary Component
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Error boundary component to catch and handle UI-level errors 
 * within the ItemTree component tree.
 */

import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ItemTreeErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console (and ideally to an error tracking service)
        console.error('[ItemTreeErrorBoundary] Caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-center m-2">
                    <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                        Something went wrong with the file explorer.
                    </p>
                    <p className="text-red-600 dark:text-red-500 text-xs mt-1 truncate">
                        {this.state.error?.message}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="mt-3 px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-800 dark:text-red-300 text-xs font-semibold rounded transition-colors"
                    >
                        Reset Tree
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
