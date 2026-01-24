import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FractionalIndexExtension } from '../FractionalIndexExtension';
import { generateKeyBetween } from '@/lib/utils';
import { calculateReorderSortOrder, getVisualBlockOrder } from '../../utils/reorder';

// Mock the fractional index generator for predictable tests
vi.mock('@/lib/utils/fractional-index', () => ({
  generateKeyBetween: vi.fn((prev: string | null, next: string | null, addJitter: boolean = true) => {
    // Simple deterministic mock for testing
    if (prev === null && next === null) return 'a0';
    if (prev === null) return `before-${next}`;
    if (next === null) return `after-${prev}`;
    return `between-${prev}-${next}`;
  }),
}));

describe('FractionalIndexExtension', () => {
  let editor: Editor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    editor = new Editor({
      extensions: [
        StarterKit,
        FractionalIndexExtension,
      ],
      content: '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('sortOrder generation', () => {
    it('should generate sortOrder for new blocks', () => {
      // All paragraphs should have sortOrder attributes
      const paragraphs: any[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          paragraphs.push(node);
        }
      });
      
      paragraphs.forEach((node) => {
        expect(node.attrs.sortOrder).toBeDefined();
        expect(typeof node.attrs.sortOrder).toBe('string');
        expect(node.attrs.sortOrder.length).toBeGreaterThan(0);
      });
    });

    it('should generate sortOrder with generateKeyBetween(null, null) for first block', () => {
      // First block should call generateKeyBetween with null, null
      expect(vi.mocked(generateKeyBetween)).toHaveBeenCalledWith(null, expect.anything(), true);
    });

    it('should generate lexicographically correct sortOrder strings', () => {
      const blocks = getVisualBlockOrder(editor);
      
      // Should have at least 3 blocks
      expect(blocks.length).toBeGreaterThanOrEqual(3);
      
      // Check that sort orders are in ascending order
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].sortOrder > blocks[i - 1].sortOrder).toBe(true);
      }
    });
  });

  describe('HTML serialization', () => {
    it('should serialize sortOrder to data-sort-order attribute', () => {
      const html = editor.getHTML();
      
      // Check that data-sort-order attributes are present in the HTML
      expect(html).toContain('data-sort-order');
      
      // Parse the HTML to verify structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const elementsWithSortOrder = doc.querySelectorAll('[data-sort-order]');
      
      expect(elementsWithSortOrder.length).toBeGreaterThan(0);
      elementsWithSortOrder.forEach((element) => {
        const sortOrder = element.getAttribute('data-sort-order');
        expect(sortOrder).toBeDefined();
        expect(sortOrder).toMatch(/^[a-zA-Z0-9]+$/);
      });
    });

    it('should parse data-sort-order attribute from HTML', () => {
      const testSortOrder = 'test-sort-order-123';
      const testHTML = `<p data-sort-order="${testSortOrder}">Test content</p>`;
      
      // Create a new editor with HTML containing data-sort-order
      const testEditor = new Editor({
        extensions: [
          StarterKit,
          FractionalIndexExtension,
        ],
        content: testHTML,
      });
      
      let paragraph: any = null;
      testEditor.state.doc.descendants((node) => {
        if (node.type.name === 'paragraph' && !paragraph) {
          paragraph = node;
        }
      });
      
      expect(paragraph).toBeDefined();
      
      if (paragraph) {
        expect(paragraph.attrs.sortOrder).toBe(testSortOrder);
      }
      
      testEditor.destroy();
    });
  });

  describe('midpoint calculation', () => {
    it('should calculate midpoint when inserting between two blocks', () => {
      // Create editor with two blocks that have known sort orders
      const testEditor = new Editor({
        extensions: [
          StarterKit,
          FractionalIndexExtension,
        ],
        content: '<p data-sort-order="a">First</p><p data-sort-order="z">Last</p>',
      });
      
      // Insert a new paragraph between them
      testEditor.commands.insertContent('<p>Middle</p>');
      
      // Check that generateKeyBetween was called with 'a' and 'z'
      expect(vi.mocked(generateKeyBetween)).toHaveBeenCalledWith('a', 'z', true);
      
      testEditor.destroy();
    });

    it('should handle insertion at the beginning', () => {
      const testEditor = new Editor({
        extensions: [
          StarterKit,
          FractionalIndexExtension,
        ],
        content: '<p data-sort-order="m">Existing</p>',
      });
      
      // Insert at the beginning by setting cursor position
      testEditor.commands.setTextSelection(0);
      testEditor.commands.insertContent('<p>New First</p>');
      
      // Should call generateKeyBetween with null and 'm'
      expect(vi.mocked(generateKeyBetween)).toHaveBeenCalledWith(null, 'm', true);
      
      testEditor.destroy();
    });

    it('should handle insertion at the end', () => {
      const testEditor = new Editor({
        extensions: [
          StarterKit,
          FractionalIndexExtension,
        ],
        content: '<p data-sort-order="m">Existing</p>',
      });
      
      // Insert at the end
      testEditor.commands.insertContent('<p>New Last</p>');
      
      // Should call generateKeyBetween with 'm' and null
      expect(vi.mocked(generateKeyBetween)).toHaveBeenCalledWith('m', null, true);
      
      testEditor.destroy();
    });
  });

  describe('COLLATE "C" compatibility', () => {
    it('should generate sortOrder strings compatible with COLLATE "C"', () => {
      // Get all sort orders
      const sortOrders: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.attrs.sortOrder) {
          sortOrders.push(node.attrs.sortOrder);
        }
      });
      
      // Check that sort orders use only Base62 characters
      sortOrders.forEach((sortOrder) => {
        expect(sortOrder).toMatch(/^[0-9A-Za-z]+$/);
      });
      
      // Verify that JavaScript sort matches expected order
      const sorted = [...sortOrders].sort();
      expect(sortOrders).toEqual(sorted);
    });
  });
});

describe('reorder utility', () => {
  let editor: Editor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    editor = new Editor({
      extensions: [
        StarterKit,
        FractionalIndexExtension,
      ],
      content: '<p data-block-id="1" data-sort-order="a">First</p><p data-block-id="2" data-sort-order="m">Second</p><p data-block-id="3" data-sort-order="z">Third</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('calculateReorderSortOrder', () => {
    it('should calculate new sortOrder when moving block up', () => {
      // Move block 3 to position 0 (before block 1)
      const result = calculateReorderSortOrder(editor, '3', 0);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.blockId).toBe('3');
        // Should generate between null and 'a'
        expect(result.newSortOrder).toBe('before-a');
      }
    });

    it('should calculate new sortOrder when moving block down', () => {
      // Move block 1 to position 2 (after block 3)
      const result = calculateReorderSortOrder(editor, '1', 2);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.blockId).toBe('1');
        // Should generate between 'z' and null
        expect(result.newSortOrder).toBe('after-z');
      }
    });

    it('should calculate new sortOrder when moving block between two others', () => {
      // Move block 1 to position 1 (between block 2 and 3)
      const result = calculateReorderSortOrder(editor, '1', 1);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.blockId).toBe('1');
        // Should generate between 'm' and 'z'
        expect(result.newSortOrder).toBe('between-m-z');
      }
    });

    it('should return null for non-existent blockId', () => {
      const result = calculateReorderSortOrder(editor, 'non-existent', 0);
      expect(result).toBeNull();
    });
  });

  describe('getVisualBlockOrder', () => {
    it('should return blocks sorted by sortOrder', () => {
      const blocks = getVisualBlockOrder(editor);
      
      expect(blocks).toHaveLength(3);
      expect(blocks[0].blockId).toBe('1');
      expect(blocks[0].sortOrder).toBe('a');
      expect(blocks[1].blockId).toBe('2');
      expect(blocks[1].sortOrder).toBe('m');
      expect(blocks[2].blockId).toBe('3');
      expect(blocks[2].sortOrder).toBe('z');
    });
  });
});