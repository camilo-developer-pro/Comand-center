/**
 * Editor Blocks - Public API
 * 
 * V1.1 Phase 3: Widget Insertion UX
 */

// Types
export type {
    WidgetBlockProps,
    WidgetBlockState,
    CRMLeadsConfig,
    FinanceRevenueConfig,
    WidgetConfigByType,
} from './types';

export {
    DEFAULT_WIDGET_PROPS,
    generateWidgetId,
    getDefaultConfig,
    validateWidgetProps,
} from './types';

// Schema
export {
    WidgetBlock,
    widgetBlockSchema,
    createWidgetBlockProps,
    insertWidgetBlock,
    type WidgetBlockNoteSchema,
} from './widgetBlockSchema';

// Component
export { WidgetBlockComponent } from './WidgetBlockComponent';
