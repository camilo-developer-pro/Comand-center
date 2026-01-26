// Action result types
export { success, failure, isSuccess } from './types';
export type { ActionResult } from './types';

// Workspace actions
export {
    createWorkspace,
    getMyWorkspaces,
    getWorkspaceBySlug,
    updateWorkspace,
    deleteWorkspace,
} from './workspace-actions';

// Document actions
export {
    createDocument,
    getDocuments,
    getDocumentById,
    updateDocument,
    moveDocument,
    deleteDocument,
    getDocumentTree,
} from './document-actions';

export type { DocumentTreeNode } from './document-actions';

// Block actions
export {
    upsertBlock,
    syncBlocks,
    getDocumentBlocks,
    deleteBlock,
} from './block-actions';

// Semantic search actions
export {
    searchBlocksSemanticAction,
    getEmbeddingStatsAction,
    queueStaleEmbeddingsAction,
    getEmbeddingHealthAction,
    isSemanticSearchAvailable,
    regenerateBlockEmbedding,
} from './semantic-actions';
