/**
 * Items Module Barrel Export
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Centralized exports for the items module.
 */

// Types
export * from './types';

// Server Actions
export * from './actions/itemActions';

// React Query Hooks
export * from './hooks/useItems';
export * from './hooks/useMoveItemWithValidation';

// Components
export * from './components/ItemTreeErrorBoundary';

// Utilities
export { validateMove } from './utils/validateMove';
