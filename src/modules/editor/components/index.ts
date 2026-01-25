/**
 * Editor Components - Public API
 *
 * V1.1 Phase 3: Widget Insertion UX
 * V3.1 Phase 5: Optimistic UI Patterns
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
export { DocumentEditor } from './DocumentEditor';

// Drag-and-drop reordering
export { SortableBlockWrapper } from './SortableBlockWrapper';
export { DraggableBlockList } from './DraggableBlockList';
export { DocumentTree } from './DocumentTree';
export type { DocumentTreeProps } from './DocumentTree';

// Status indicators
export { SaveStatusIndicator } from './SaveStatusIndicator';
export { RemoteCursor } from './RemoteCursor';
export { TypingIndicator } from './TypingIndicator';
export { PresenceAvatarStack } from './PresenceAvatarStack';
export { DocumentHeader } from './DocumentHeader';
export {
    SyncStatus,
    InlineSyncStatus,
    ToolbarSyncStatus,
    SyncStatusBadge,
    type SyncStatusProps
} from './SyncStatus';
