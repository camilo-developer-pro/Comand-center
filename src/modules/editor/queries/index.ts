/**
 * Editor Queries Module
 * 
 * Exports all optimized query utilities for the editor module.
 */

export {
    findDocumentsByWidgetType,
    findDocumentsByAnyWidgetType,
    findDocumentsByAllWidgetTypes,
    countDocumentsByWidgetType,
    getWidgetUsageStats,
    type DocumentWithWidgets,
    type DocumentQueryOptions,
} from './documentWidgetQueries';
