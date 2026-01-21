/**
 * AI Module Public API
 * 
 * V2.0 Phase 2: Intelligent Editor
 * 
 * Exports only the public-facing functions.
 * Internal utilities should be imported directly from their files.
 */

// Types (always safe to re-export)
export type {
    BlockNoteJSON,
    DocumentChunk,
    ProcessedDocument,
    EmbeddedChunk,
    EmbeddingRecord,
    MatchDocumentsParams,
    MatchedDocument,
    AIActionResult,
    IngestDocumentResult,
    MatchDocumentsResult,
} from './types';

// Main processing function
export { processDocument } from './utils/processDocument';
export type { ProcessDocumentOptions } from './utils/processDocument';

// Query function
export { matchDocuments } from './queries/matchDocuments';
