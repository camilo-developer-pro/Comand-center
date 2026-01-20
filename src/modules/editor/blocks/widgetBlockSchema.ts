/**
 * Widget Block Schema
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * Defines the custom BlockNote block schema for embedding widgets.
 * Uses BlockNote's createReactBlockSpec for type-safe block definition.
 */

// @ts-ignore - may not be exported in certain types
import {
    BlockNoteSchema,
    defaultBlockSpecs,
} from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { WidgetBlockComponent } from './WidgetBlockComponent';
import { WidgetKey } from '../registry';
import {
    WidgetBlockProps,
    DEFAULT_WIDGET_PROPS,
    generateWidgetId,
    getDefaultConfig,
} from './types';

// ============================================================
// Widget Block Specification
// ============================================================

/**
 * The Widget Block specification for BlockNote.
 * 
 * This creates a custom block type that:
 * - Stores widget type and config in props
 * - Renders using our WidgetBlockComponent
 * - Is not editable (content is rendered by the widget)
 */
export const WidgetBlock = createReactBlockSpec(
    {
        type: 'widget',
        propSchema: {
            widgetType: {
                default: 'placeholder' as WidgetKey,
            },
            config: {
                default: '{}',
            },
            title: {
                default: '',
            },
            widgetId: {
                default: '',
            },
        },
        content: 'none',
    },
    {
        render: WidgetBlockComponent as any,
    }
);

// ============================================================
// Extended Schema with Widget Block
// ============================================================

/**
 * BlockNote schema extended with our custom widget block.
 */
export const widgetBlockSchema = BlockNoteSchema.create({
    blockSpecs: {
        // Include all default block types
        ...defaultBlockSpecs,
        // Add our custom widget block
        widget: (WidgetBlock as any),
    },
});

// ============================================================
// Type Exports for Editor
// ============================================================

/**
 * Type for our custom schema
 */
export type WidgetBlockNoteSchema = typeof widgetBlockSchema;

/**
 * Block type including our widget
 */
export type WidgetBlock = typeof WidgetBlock;

// ============================================================
// Helper Functions for Widget Insertion
// ============================================================

/**
 * Create props for a new widget block
 */
export function createWidgetBlockProps(
    widgetType: WidgetKey,
    customConfig?: Record<string, unknown>
): any {
    return {
        widgetType,
        config: JSON.stringify({
            ...getDefaultConfig(widgetType),
            ...customConfig,
        }),
        widgetId: generateWidgetId(),
    };
}

/**
 * Insert a widget block into the editor
 */
export function insertWidgetBlock(
    editor: any,
    widgetType: WidgetKey,
    config?: Record<string, unknown>
) {
    const props = createWidgetBlockProps(widgetType, config);

    if (editor.insertOrUpdateBlock) {
        editor.insertOrUpdateBlock(editor.getTextCursorPosition().block, {
            type: 'widget',
            props,
        });
    } else {
        editor.insertBlocks(
            [{ type: 'widget', props }],
            editor.getTextCursorPosition().block,
            'after'
        );
    }
}
