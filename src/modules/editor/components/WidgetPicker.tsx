'use client';

/**
 * Widget Picker
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * A modal/dropdown component for selecting which widget to insert.
 * Displays available widgets with icons, descriptions, and availability status.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WIDGET_METADATA, getAvailableWidgets, type WidgetKey } from '../registry';
import { cn } from '@/lib/utils';

// ============================================================
// Props Interface
// ============================================================

interface WidgetPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (widgetType: WidgetKey) => void;
    position?: { top: number; left: number };
    anchorRef?: React.RefObject<HTMLElement>;
}

// ============================================================
// Main Component
// ============================================================

export function WidgetPicker({
    isOpen,
    onClose,
    onSelect,
    position,
    anchorRef,
}: WidgetPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const pickerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get widgets (all, not just available, but show status)
    const allWidgets = WIDGET_METADATA;

    // Filter widgets by search
    const filteredWidgets = allWidgets.filter(widget => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            widget.label.toLowerCase().includes(query) ||
            widget.description.toLowerCase().includes(query) ||
            widget.module.toLowerCase().includes(query)
        );
    });

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredWidgets.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredWidgets.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                const selected = filteredWidgets[selectedIndex];
                if (selected?.isAvailable) {
                    onSelect(selected.key);
                    onClose();
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [isOpen, filteredWidgets, selectedIndex, onSelect, onClose]);

    // Add keyboard listener
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    // Calculate position
    const style: React.CSSProperties = position
        ? { top: position.top, left: position.left, position: 'fixed' }
        : {};

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" />

            {/* Picker */}
            <div
                ref={pickerRef}
                className={cn(
                    'z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                    'rounded-lg shadow-xl overflow-hidden',
                    !position && 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                )}
                style={style}
            >
                {/* Header */}
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search widgets..."
                            className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Widget List */}
                <div className="max-h-64 overflow-y-auto">
                    {filteredWidgets.length === 0 ? (
                        <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No widgets found matching "{searchQuery}"
                        </div>
                    ) : (
                        <div className="py-1">
                            {filteredWidgets.map((widget, index) => (
                                <WidgetPickerItem
                                    key={widget.key}
                                    widget={widget}
                                    isSelected={index === selectedIndex}
                                    onSelect={() => {
                                        if (widget.isAvailable) {
                                            onSelect(widget.key);
                                            onClose();
                                        }
                                    }}
                                    onHover={() => setSelectedIndex(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↑↓</kbd>
                            <span>Navigate</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↵</kbd>
                            <span>Select</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Esc</kbd>
                            <span>Close</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================
// Widget Picker Item
// ============================================================

interface WidgetPickerItemProps {
    widget: typeof WIDGET_METADATA[number];
    isSelected: boolean;
    onSelect: () => void;
    onHover: () => void;
}

function WidgetPickerItem({
    widget,
    isSelected,
    onSelect,
    onHover,
}: WidgetPickerItemProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            onMouseEnter={onHover}
            disabled={!widget.isAvailable}
            className={cn(
                'w-full px-3 py-2 flex items-start gap-3 text-left transition-colors',
                isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                widget.isAvailable
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
            )}
        >
            {/* Icon */}
            <span className="text-xl flex-shrink-0 mt-0.5">
                {widget.icon}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {widget.label}
                    </span>
                    {!widget.isAvailable && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                            Coming Soon
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {widget.description}
                </p>
            </div>

            {/* Module Badge */}
            <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded flex-shrink-0">
                {widget.module}
            </span>
        </button>
    );
}

// ============================================================
// Inline Widget Picker (for slash menu)
// ============================================================

interface InlineWidgetPickerProps {
    onSelect: (widgetType: WidgetKey) => void;
}

export function InlineWidgetPicker({ onSelect }: InlineWidgetPickerProps) {
    const availableWidgets = getAvailableWidgets();

    return (
        <div className="py-1">
            {availableWidgets.map((widget) => (
                <button
                    key={widget.key}
                    type="button"
                    onClick={() => onSelect(widget.key)}
                    className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <span className="text-lg">{widget.icon}</span>
                    <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {widget.label}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {widget.description}
                        </p>
                    </div>
                </button>
            ))}
        </div>
    );
}

export default WidgetPicker;
