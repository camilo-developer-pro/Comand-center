/**
 * Editor Hooks - Public API
 *
 * V1.1 Phase 4: Lazy Hydration
 * V3.1 Phase 5: Atomic Block Extraction
 * V3.1 Phase 5: Optimistic UI Patterns
 */

export {
    useWidgetSuggestions,
    matchesWidgetCommand,
    type WidgetSuggestion,
} from './useWidgetSuggestions';

export {
    usePrefetchWidget,
    registerWidgetPrefetch,
    hasWidgetPrefetch,
    type UsePrefetchWidgetOptions,
    type UsePrefetchWidgetResult,
} from './usePrefetchWidget';

export {
    useBlockExtractor,
} from './useBlockExtractor';

export {
    useBlockSync,
    useDocumentBlocks,
    useSyncBlocks,
    blockKeys,
    type UseBlockSyncOptions,
    type UseBlockSyncResult,
} from './useBlockSync';
