export interface BlockNode {
  blockId: string;
  type: string;
  content: Record<string, unknown>;
  sortOrder: string;
  parentPath: string;
}

export interface BlockNodeWithDocumentId extends BlockNode {
  documentId: string;
}

export interface BlockSyncPayload {
  documentId: string;
  blocks: BlockNodeWithDocumentId[];
  deletedBlockIds: string[];
}