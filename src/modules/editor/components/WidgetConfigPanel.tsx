'use client';

/**
 * Widget Configuration Panel
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * A slide-out panel for configuring widget settings.
 * Provides type-specific configuration forms.
 */

import React, { useState, useEffect } from 'react';
import { WIDGET_METADATA, type WidgetKey } from '../registry';
import { getDefaultConfig } from '../blocks/types';
import { cn } from '@/lib/utils';

// ============================================================
// Props Interface
// ============================================================

interface WidgetConfigPanelProps {
    isOpen: boolean;
    onClose: () => void;
    widgetType: WidgetKey;
    config: Record<string, unknown>;
    onConfigChange: (config: Record<string, unknown>) => void;
    onDelete?: () => void;
}

// ============================================================
// Main Component
// ============================================================

export function WidgetConfigPanel({
    isOpen,
    onClose,
    widgetType,
    config,
    onConfigChange,
    onDelete,
}: WidgetConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState(config);
    const metadata = WIDGET_METADATA.find((w) => w.key === widgetType);

    // Sync local config when prop changes
    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    // Handle field change
    const handleChange = (key: string, value: unknown) => {
        const newConfig = { ...localConfig, [key]: value };
        setLocalConfig(newConfig);
        onConfigChange(newConfig);
    };

    // Reset to defaults
    const handleReset = () => {
        const defaults = getDefaultConfig(widgetType);
        setLocalConfig(defaults);
        onConfigChange(defaults);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={cn(
                    'fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800',
                    'border-l border-gray-200 dark:border-gray-700 shadow-xl z-50',
                    'transform transition-transform duration-200',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{metadata?.icon || '📦'}</span>
                        <div>
                            <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                                {metadata?.label || 'Widget'} Settings
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Configure widget appearance
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-8rem)]">
                    {/* Widget Type Info */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Widget Type
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {metadata?.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {metadata?.description}
                        </p>
                    </div>

                    {/* Configuration Form */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Configuration
                        </h3>

                        <ConfigForm
                            widgetType={widgetType}
                            config={localConfig}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Reset to defaults
                        </button>

                        <div className="flex gap-2">
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================
// Configuration Form
// ============================================================

interface ConfigFormProps {
    widgetType: WidgetKey;
    config: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
}

function ConfigForm({ widgetType, config, onChange }: ConfigFormProps) {
    switch (widgetType) {
        case 'crm-leads':
        case 'crm-lead-kanban':
            return <CRMLeadsConfigFields config={config} onChange={onChange} />;
        case 'finance-revenue':
            return <FinanceRevenueConfigFields config={config} onChange={onChange} />;
        default:
            return (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    No configuration options available for this widget type.
                </p>
            );
    }
}

// ============================================================
// CRM Leads Config Fields
// ============================================================

interface CRMLeadsConfigFieldsProps {
    config: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
}

function CRMLeadsConfigFields({ config, onChange }: CRMLeadsConfigFieldsProps) {
    return (
        <div className="space-y-4">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Widget Title
                </label>
                <input
                    type="text"
                    value={(config.title as string) || ''}
                    onChange={(e) => onChange('title', e.target.value || undefined)}
                    placeholder="CRM Leads"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Leave empty to use default title
                </p>
            </div>

            {/* Display Options */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Options
                </label>
                <div className="space-y-2">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={(config.showValue as boolean) ?? true}
                            onChange={(e) => onChange('showValue', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Show deal value</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={(config.showCompany as boolean) ?? true}
                            onChange={(e) => onChange('showCompany', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Show company name</span>
                    </label>
                </div>
            </div>

            {/* Max Items */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Maximum Items
                </label>
                <input
                    type="number"
                    min={1}
                    max={50}
                    value={(config.maxItems as number) || 10}
                    onChange={(e) => onChange('maxItems', parseInt(e.target.value, 10) || 10)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Number of leads to display (1-50)
                </p>
            </div>

            {/* Status Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((status) => {
                        const filterStatus = (config.filterStatus as string[]) || [];
                        const isChecked = filterStatus.length === 0 || filterStatus.includes(status);

                        return (
                            <label key={status} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                        const current = filterStatus.length === 0
                                            ? ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
                                            : filterStatus;

                                        const updated = e.target.checked
                                            ? [...current, status]
                                            : current.filter((s) => s !== status);

                                        // If all are selected, clear the filter
                                        if (updated.length === 7) {
                                            onChange('filterStatus', undefined);
                                        } else {
                                            onChange('filterStatus', updated);
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{status}</span>
                            </label>
                        );
                    })}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Select statuses to display. All selected = no filter.
                </p>
            </div>
        </div>
    );
}

// ============================================================
// Finance Revenue Config Fields
// ============================================================

interface FinanceRevenueConfigFieldsProps {
    config: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
}

function FinanceRevenueConfigFields({ config, onChange }: FinanceRevenueConfigFieldsProps) {
    return (
        <div className="space-y-4">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Widget Title
                </label>
                <input
                    type="text"
                    value={(config.title as string) || ''}
                    onChange={(e) => onChange('title', e.target.value || undefined)}
                    placeholder="Revenue Chart"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Time Period */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Time Period
                </label>
                <select
                    value={(config.period as string) || 'month'}
                    onChange={(e) => onChange('period', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="quarter">Quarterly</option>
                    <option value="year">Yearly</option>
                </select>
            </div>

            {/* Chart Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Chart Type
                </label>
                <select
                    value={(config.chartType as string) || 'line'}
                    onChange={(e) => onChange('chartType', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                    <option value="area">Area Chart</option>
                </select>
            </div>
        </div>
    );
}

export default WidgetConfigPanel;
