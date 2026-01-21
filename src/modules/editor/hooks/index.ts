/**
 * Editor Hooks - Public API
 * 
 * V1.1 Phase 4: Lazy Hydration
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
