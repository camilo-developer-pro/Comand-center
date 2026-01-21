import { describe, it, expect } from 'vitest';
import { validateMove } from '../../src/modules/core/items/utils/validateMove';
import type { ItemTreeNode } from '../../src/modules/core/items/types';

describe('Move Item Validation', () => {
    const mockTree: ItemTreeNode[] = [
        {
            id: 'folder-1',
            name: 'Projects',
            item_type: 'folder',
            path: 'root.projects',
            workspace_id: 'ws-1',
            created_by: 'user-1',
            document_id: null,
            parent_id: null,
            sort_order: 0,
            depth: 0,
            hasChildren: true,
            childCount: 2,
            created_at: '',
            updated_at: '',
            children: [
                {
                    id: 'folder-2',
                    name: 'Subproject',
                    item_type: 'folder',
                    path: 'root.projects.subproject',
                    workspace_id: 'ws-1',
                    created_by: 'user-1',
                    document_id: null,
                    parent_id: 'folder-1',
                    sort_order: 0,
                    depth: 1,
                    hasChildren: false,
                    childCount: 0,
                    created_at: '',
                    updated_at: '',
                    children: [],
                },
                {
                    id: 'doc-1',
                    name: 'README',
                    item_type: 'document',
                    path: 'root.projects.readme',
                    workspace_id: 'ws-1',
                    created_by: 'user-1',
                    document_id: 'doc-uuid-1',
                    parent_id: 'folder-1',
                    sort_order: 1,
                    depth: 1,
                    hasChildren: false,
                    childCount: 0,
                    created_at: '',
                    updated_at: '',
                    children: [],
                },
            ],
        },
    ];

    it('should reject moving item to itself', () => {
        const result = validateMove('folder-1', 'folder-1', mockTree);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("can't move an item into itself");
    });

    it('should reject moving folder into its own descendant', () => {
        const result = validateMove('folder-1', 'folder-2', mockTree);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('own subfolders');
    });

    it('should reject moving item into a document', () => {
        const result = validateMove('folder-2', 'doc-1', mockTree);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('into folders');
    });

    it('should allow moving document to root', () => {
        const result = validateMove('doc-1', null, mockTree);
        expect(result.valid).toBe(true);
    });

    it('should allow moving document into sibling folder', () => {
        const result = validateMove('doc-1', 'folder-2', mockTree);
        expect(result.valid).toBe(true);
    });

    it('should allow moving a nested folder to root', () => {
        const result = validateMove('folder-2', null, mockTree);
        expect(result.valid).toBe(true);
    });

    it('should reject moving to a non-existent folder', () => {
        const result = validateMove('doc-1', 'non-existent', mockTree);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('no longer exists');
    });
});
