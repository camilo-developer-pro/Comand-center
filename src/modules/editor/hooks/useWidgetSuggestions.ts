'use client';

/**
 * Widget Suggestions Hook
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * Hook for managing widget insertion suggestions in the editor.
 */

import { useState, useCallback, useMemo } from 'react';
import { WIDGET_METADATA, getAvailableWidgets, type WidgetKey } from '../registry';

// ============================================================
// Types
// ============================================================

export interface WidgetSuggestion {
    key: WidgetKey;
    label: string;
    description: string;
    icon: string;
    module: string;
    score: number;
}

// ============================================================
// Hook
// ============================================================

export function useWidgetSuggestions(query: string = '') {
    const [isOpen, setIsOpen] = useState(false);

    // Filter and score suggestions based on query
    const suggestions = useMemo(() => {
        const availableWidgets = getAvailableWidgets();

        if (!query) {
            return availableWidgets.map((w) => ({
                ...w,
                score: 1,
            }));
        }

        const normalizedQuery = query.toLowerCase().trim();

        return availableWidgets
            .map((widget) => {
                let score = 0;
                const label = widget.label.toLowerCase();
                const description = widget.description.toLowerCase();
                const module = widget.module.toLowerCase();

                // Exact match on label
                if (label === normalizedQuery) score += 100;
                // Label starts with query
                else if (label.startsWith(normalizedQuery)) score += 50;
                // Label contains query
                else if (label.includes(normalizedQuery)) score += 25;
                // Description contains query
                if (description.includes(normalizedQuery)) score += 10;
                // Module matches
                if (module.includes(normalizedQuery)) score += 15;
                // Key matches
                if (widget.key.includes(normalizedQuery)) score += 20;

                return { ...widget, score };
            })
            .filter((w) => w.score > 0)
            .sort((a, b) => b.score - a.score);
    }, [query]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    return {
        suggestions,
        isOpen,
        open,
        close,
        toggle,
        hasResults: suggestions.length > 0,
    };
}

// ============================================================
// Static Helpers
// ============================================================

/**
 * Check if a slash command matches a widget.
 */
export function matchesWidgetCommand(text: string): WidgetKey | null {
    const normalized = text.toLowerCase().replace('/', '');

    // Check direct key match
    const widgets = getAvailableWidgets();
    const directMatch = widgets.find((w) => w.key === normalized);
    if (directMatch) return directMatch.key;

    // Check aliases
    const aliasMap: Record<string, WidgetKey> = {
        'leads': 'crm-leads',
        'crm': 'crm-leads',
        'revenue': 'finance-revenue',
        'chart': 'finance-revenue',
    };

    return aliasMap[normalized] || null;
}
