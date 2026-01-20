'use client';

/**
 * Slash Menu Items
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * Custom slash menu items for inserting widgets into the editor.
 * Integrates with BlockNote's built-in slash menu system.
 */

import {
    getDefaultReactSlashMenuItems,
} from '@blocknote/react';
// @ts-ignore - may not be exported in certain types but exists at runtime
import { insertOrUpdateBlock } from '@blocknote/core';
import { WIDGET_METADATA, getAvailableWidgets, type WidgetKey } from '../registry';
import { createWidgetBlockProps } from '../blocks/widgetBlockSchema';

// ============================================================
// Widget Slash Menu Items
// ============================================================

/**
 * Create a slash menu item for a specific widget type.
 */
function createWidgetSlashMenuItem(
    widgetKey: WidgetKey,
    metadata: typeof WIDGET_METADATA[number]
): any {
    return {
        title: metadata.label,
        subtext: metadata.description,
        onItemClick: (editor: any) => {
            const props = createWidgetBlockProps(widgetKey);

            if ('insertOrUpdateBlock' in editor) {
                (editor as any).insertOrUpdateBlock(editor.getTextCursorPosition().block, {
                    type: 'widget',
                    props,
                });
            } else {
                insertOrUpdateBlock(editor, {
                    type: 'widget',
                    props,
                });
            }
        },
        aliases: [widgetKey, metadata.module, 'widget'],
        group: 'Widgets',
        icon: (
            <span className="text-base leading-none">{metadata.icon}</span>
        ),
    };
}

/**
 * Get all widget slash menu items.
 * Only returns items for available widgets.
 */
export function getWidgetSlashMenuItems(): any[] {
    return getAvailableWidgets().map((widget) =>
        createWidgetSlashMenuItem(widget.key, widget)
    );
}

/**
 * Get combined slash menu items (default + widgets).
 * This is what should be passed to the editor.
 */
export function getCustomSlashMenuItems(
    editor: any
): any[] {
    // Get default BlockNote items
    const defaultItems = getDefaultReactSlashMenuItems(editor);

    // Get widget items
    const widgetItems = getWidgetSlashMenuItems();

    // Combine: defaults first, then widgets
    return [...defaultItems, ...widgetItems];
}

// ============================================================
// Quick Insert Items (for toolbar button)
// ============================================================

export interface QuickInsertItem {
    key: WidgetKey;
    label: string;
    icon: string;
    description: string;
}

/**
 * Get quick insert items for a toolbar dropdown.
 */
export function getQuickInsertItems(): QuickInsertItem[] {
    return getAvailableWidgets().map((widget) => ({
        key: widget.key,
        label: widget.label,
        icon: widget.icon,
        description: widget.description,
    }));
}

// ============================================================
// Slash Command Definitions (for documentation)
// ============================================================

/**
 * All widget slash commands and their aliases.
 * Useful for documentation and help text.
 */
export const WIDGET_SLASH_COMMANDS = [
    {
        command: '/widget',
        description: 'Open widget picker',
        aliases: ['/w'],
    },
    {
        command: '/leads',
        description: 'Insert CRM Lead List widget',
        aliases: ['/crm', '/crm-leads'],
    },
    {
        command: '/chart',
        description: 'Insert Revenue Chart widget',
        aliases: ['/revenue', '/finance-revenue'],
    },
] as const;
