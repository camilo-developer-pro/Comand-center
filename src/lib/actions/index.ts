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
} from './document-actions';
