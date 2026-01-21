'use client';

/**
 * Widget Block Component
 * 
 * V1.1 Phase 4: Lazy Hydration
 * 
 * This component renders inside a BlockNote block and:
 * - Loads the appropriate widget from the registry
 * - Defers widget hydration until visible (lazy loading)
 * - Handles selection state for editing
 * - Provides configuration UI access
 * - Wraps widget in error boundary
 */

import React, { useState, useCallback, Suspense } from 'react';
import { useBlockNoteEditor } from '@blocknote/react';
import { getWidget, WIDGET_METADATA, type WidgetKey } from '../registry';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';
import { WidgetSkeleton } from '../components/WidgetSkeleton';
import { LazyHydrationBoundary } from '../components/LazyHydrationBoundary';
import { usePrefetchWidget } from '../hooks/usePrefetchWidget';
import type { WidgetBlockProps } from './types';
import { cn } from '@/lib/utils';

// ============================================================
// Props Interface (from BlockNote)
// ============================================================

interface BlockComponentProps {
    block: {
        id: string;
        type: 'widget';
        props: WidgetBlockProps;
    };
    editor: any;
    contentRef?: React.RefObject<HTMLDivElement>;
}

// ============================================================
// Main Component
// ============================================================

export function WidgetBlockComponent({ block, editor }: BlockComponentProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    const { widgetType, config: configString, title, widgetId } = block.props;

    // Parse config if it's a string
    const config = typeof configString === 'string' ? JSON.parse(configString) : configString;

    // Get the widget component from registry
    const WidgetComponent = getWidget(widgetType);

    // Get widget metadata for display
    const metadata = WIDGET_METADATA.find(w => w.key === widgetType);

    // Handle configuration changes
    const handleConfigChange = useCallback((newConfig: Record<string, unknown>) => {
        editor.updateBlock(block.id, {
            type: 'widget',
            props: {
                ...block.props,
                config: JSON.stringify(newConfig),
            },
        });
    }, [editor, block.id, block.props]);

    // Handle widget type change
    const handleWidgetTypeChange = useCallback((newType: WidgetKey) => {
        editor.updateBlock(block.id, {
            type: 'widget',
            props: {
                ...block.props,
                widgetType: newType,
                config: '{}', // Reset config for new type (serialized empty object)
            },
        });
    }, [editor, block.id, block.props]);

    // Handle delete
    const handleDelete = useCallback(() => {
        editor.removeBlocks([block.id]);
    }, [editor, block.id]);

    // Prefetch widget data on hover (only if not yet hydrated)
    const { onMouseEnter: prefetchOnEnter, onMouseLeave: prefetchOnLeave } = usePrefetchWidget({
        widgetType,
        config: config || {},
        enabled: !isHydrated, // Only prefetch if not yet hydrated
    });

    return (
        <div
            className={cn(
                'relative group my-2 rounded-lg transition-all',
                'ring-2 ring-transparent',
                isHovered && 'ring-blue-200 dark:ring-blue-800'
            )}
            onMouseEnter={() => {
                setIsHovered(true);
                prefetchOnEnter();
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                prefetchOnLeave();
            }}
            data-widget-id={widgetId}
            data-widget-type={widgetType}
            data-lazy-state={isHydrated ? 'hydrated' : 'pending'}
        >
            {/* Widget Header (shown on hover) */}
            <WidgetBlockHeader
                widgetType={widgetType}
                metadata={metadata}
                isVisible={isHovered}
                onConfigClick={() => setShowConfig(!showConfig)}
                onDeleteClick={handleDelete}
            />

            {/* Widget Content */}
            <div className="relative">
                <WidgetErrorBoundary widgetType={widgetType}>
                    <LazyHydrationBoundary
                        widgetType={widgetType}
                        minHeight={200}
                        rootMargin="150px"
                        onVisible={() => {
                            setIsHydrated(true);
                            console.log(`[Lazy Hydration] Widget ${widgetId || block.id} (${widgetType}) entered viewport`);
                        }}
                    >
                        <Suspense fallback={<WidgetSkeleton title={title || metadata?.label} rows={5} />}>
                            <WidgetComponent
                                config={config}
                                className="w-full"
                            />
                        </Suspense>
                    </LazyHydrationBoundary>
                </WidgetErrorBoundary>
            </div>

            {/* Configuration Panel (shown when open) */}
            {showConfig && (
                <WidgetConfigOverlay
                    widgetType={widgetType}
                    config={config}
                    onConfigChange={handleConfigChange}
                    onClose={() => setShowConfig(false)}
                />
            )}
        </div>
    );
}

// ============================================================
// Sub-Components
// ============================================================

interface WidgetBlockHeaderProps {
    widgetType: WidgetKey;
    metadata?: typeof WIDGET_METADATA[number];
    isVisible: boolean;
    onConfigClick: () => void;
    onDeleteClick: () => void;
}

function WidgetBlockHeader({
    widgetType,
    metadata,
    isVisible,
    onConfigClick,
    onDeleteClick,
}: WidgetBlockHeaderProps) {
    if (!isVisible) return null;

    return (
        <div className="absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-700 z-10">
            {/* Widget Type Label */}
            <div className="flex items-center gap-2">
                <span className="text-sm">{metadata?.icon || '📦'}</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {metadata?.label || widgetType}
                </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
                {/* Settings Button */}
                <button
                    type="button"
                    onClick={onConfigClick}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Configure widget"
                >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>

                {/* Drag Handle (visual only - BlockNote handles drag) */}
                <div className="p-1 cursor-grab text-gray-400" title="Drag to reorder">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                </div>

                {/* Delete Button */}
                <button
                    type="button"
                    onClick={onDeleteClick}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Remove widget"
                >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

interface WidgetConfigOverlayProps {
    widgetType: WidgetKey;
    config: Record<string, unknown>;
    onConfigChange: (config: Record<string, unknown>) => void;
    onClose: () => void;
}

function WidgetConfigOverlay({
    widgetType,
    config,
    onConfigChange,
    onClose,
}: WidgetConfigOverlayProps) {
    return (
        <div className="absolute top-0 right-0 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 mt-2 mr-2">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Widget Settings
                </h4>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-3">
                <WidgetConfigForm
                    widgetType={widgetType}
                    config={config}
                    onConfigChange={onConfigChange}
                />
            </div>
        </div>
    );
}

interface WidgetConfigFormProps {
    widgetType: WidgetKey;
    config: Record<string, unknown>;
    onConfigChange: (config: Record<string, unknown>) => void;
}

function WidgetConfigForm({ widgetType, config, onConfigChange }: WidgetConfigFormProps) {
    // Render different config forms based on widget type
    switch (widgetType) {
        case 'crm-leads':
        case 'crm-lead-kanban':
            return (
                <CRMLeadsConfigForm
                    config={config}
                    onConfigChange={onConfigChange}
                />
            );
        default:
            return (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No configuration options available for this widget.
                </p>
            );
    }
}

interface CRMLeadsConfigFormProps {
    config: Record<string, unknown>;
    onConfigChange: (config: Record<string, unknown>) => void;
}

function CRMLeadsConfigForm({ config, onConfigChange }: CRMLeadsConfigFormProps) {
    const handleChange = (key: string, value: unknown) => {
        onConfigChange({
            ...config,
            [key]: value,
        });
    };

    return (
        <div className="space-y-3">
            {/* Title */}
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                </label>
                <input
                    type="text"
                    value={(config.title as string) || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="CRM Leads"
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
            </div>

            {/* Show Value */}
            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={(config.showValue as boolean) ?? true}
                    onChange={(e) => handleChange('showValue', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Value</span>
            </label>

            {/* Show Company */}
            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={(config.showCompany as boolean) ?? true}
                    onChange={(e) => handleChange('showCompany', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Company</span>
            </label>

            {/* Max Items */}
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Items
                </label>
                <input
                    type="number"
                    min={1}
                    max={50}
                    value={(config.maxItems as number) || 10}
                    onChange={(e) => handleChange('maxItems', parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
            </div>
        </div>
    );
}

export default WidgetBlockComponent;
