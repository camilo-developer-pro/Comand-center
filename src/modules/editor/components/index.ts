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

// Lazy hydration
export { LazyHydrationBoundary, type LazyHydrationBoundaryProps } from './LazyHydrationBoundary';

// Placeholder
export { PlaceholderWidget } from './PlaceholderWidget';

// Widget insertion
export { WidgetPicker, InlineWidgetPicker } from './WidgetPicker';
export { WidgetConfigPanel } from './WidgetConfigPanel';
export { getWidgetSlashMenuItems, getCustomSlashMenuItems, getQuickInsertItems } from './SlashMenuItems';

// Editor
export { Editor } from './Editor';
export { AtomicIngestionEditor } from './AtomicIngestionEditor';
export { CommandCenterEditor } from './CommandCenterEditor';
