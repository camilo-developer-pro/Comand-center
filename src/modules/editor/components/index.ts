/**
 * Editor Components - Public API
 * 
 * V1.1 Phase 3: Widget Insertion UX
 */

// Error handling
export { WidgetErrorBoundary, WidgetErrorFallback } from './WidgetErrorBoundary';
export { AccessDeniedState, BlurredAccessDenied } from './AccessDeniedState';

// Loading states
export {
    WidgetSkeleton,
    LeadListSkeleton,
    ChartSkeleton,
    StatsSkeleton
} from './WidgetSkeleton';

// Placeholder
export { PlaceholderWidget } from './PlaceholderWidget';

// Widget insertion
export { WidgetPicker, InlineWidgetPicker } from './WidgetPicker';
export { WidgetConfigPanel } from './WidgetConfigPanel';
export { getWidgetSlashMenuItems, getCustomSlashMenuItems, getQuickInsertItems } from './SlashMenuItems';

// Editor
export { CommandCenterEditor } from './CommandCenterEditor';
