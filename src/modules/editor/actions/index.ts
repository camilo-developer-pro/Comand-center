/**
 * Editor Actions Module
 * 
 * Exports all Server Actions for the editor module.
 */

// Document CRUD actions (from Phase 2)
export {
    saveDocument,
    getDocument,
    createDocument,
    deleteDocument,
} from './documentActions';

// Widget query actions (Phase 4)
export {
    searchDocumentsByWidget,
    searchDocumentsByAnyWidgets,
    searchDocumentsByAllWidgets,
    getWidgetDocumentCount,
    fetchWidgetUsageStats,
} from './widgetQueryActions';
