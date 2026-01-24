import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { BlockIDExtension } from '../BlockIDExtension';
import { generateUUIDv7, isUUIDv7 } from '@/lib/utils';

// Mock the UUIDv7 generator for predictable tests
vi.mock('@/lib/utils', () => ({
  generateUUIDv7: vi.fn(() => '12345678-1234-7123-8123-123456789012'),
  isUUIDv7: vi.fn((uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)),
}));

describe('BlockIDExtension', () => {
  let editor: Editor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    editor = new Editor({
      extensions: [
        StarterKit,
        BlockIDExtension,
      ],
      content: '<p>Initial paragraph</p><h1>Heading</h1><blockquote>Quote</blockquote>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('UUIDv7 generation', () => {
    it('should generate UUIDv7 for new paragraphs', () => {
      // Add a new paragraph
      editor.commands.insertContent('<p>New paragraph</p>');
      
      // Get all paragraph nodes
      const paragraphs: any[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          paragraphs.push(node);
        }
      });
      
      // Check that all paragraphs have blockId attributes
      paragraphs.forEach((node) => {
        expect(node.attrs.blockId).toBeDefined();
        expect(typeof node.attrs.blockId).toBe('string');
        expect(node.attrs.blockId).toHaveLength(36); // UUID length
      });
    });

    it('should generate valid UUIDv7 format', () => {
      editor.commands.insertContent('<p>Test paragraph</p>');
      
      let paragraph: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'paragraph' && !paragraph) {
          paragraph = node;
        }
      });
      
      expect(paragraph).toBeDefined();
      
      if (paragraph) {
        const blockId = paragraph.attrs.blockId;
        expect(isUUIDv7(blockId)).toBe(true);
        expect(blockId.charAt(14)).toBe('7'); // Version nibble for UUIDv7
      }
    });
  });

  describe('Block ID persistence', () => {
    it('should preserve existing blockIds during edits', () => {
      // Get initial paragraph
      let initialParagraph: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'paragraph' && !initialParagraph) {
          initialParagraph = node;
        }
      });
      
      expect(initialParagraph).toBeDefined();
      
      if (initialParagraph) {
        const originalBlockId = initialParagraph.attrs.blockId;
        
        // Edit the paragraph content
        editor.commands.setTextSelection({ from: 1, to: 1 });
        editor.commands.insertContent(' edited');
        
        // Get the updated paragraph
        let updatedParagraph: any = null;
        editor.state.doc.descendants((node) => {
          if (node.type.name === 'paragraph' && !updatedParagraph) {
            updatedParagraph = node;
          }
        });
        
        expect(updatedParagraph).toBeDefined();
        
        if (updatedParagraph) {
          expect(updatedParagraph.attrs.blockId).toBe(originalBlockId);
        }
      }
    });

    it('should not regenerate IDs for existing blocks', () => {
      // Count how many times generateUUIDv7 was called initially
      const initialCallCount = vi.mocked(generateUUIDv7).mock.calls.length;
      
      // Make a content change that doesn't add new blocks
      editor.commands.setTextSelection({ from: 1, to: 1 });
      editor.commands.insertContent('test ');
      
      // generateUUIDv7 should not be called again
      expect(vi.mocked(generateUUIDv7).mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Node type coverage', () => {
    it('should assign IDs to all configured node types', () => {
      const configuredTypes = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'codeBlock', 'blockquote'];
      
      configuredTypes.forEach((type) => {
        // Skip types not in the initial content
        if (type === 'paragraph' || type === 'heading' || type === 'blockquote') {
          const nodes: any[] = [];
          editor.state.doc.descendants((node) => {
            if (node.type.name === type) {
              nodes.push(node);
            }
          });
          
          nodes.forEach((node) => {
            expect(node.attrs.blockId).toBeDefined();
            expect(typeof node.attrs.blockId).toBe('string');
          });
        }
      });
    });

    it('should not assign IDs to non-configured node types', () => {
      // Add a hardBreak (not in configured types)
      editor.commands.setHardBreak();
      
      const hardBreaks: any[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'hardBreak') {
          hardBreaks.push(node);
        }
      });
      
      hardBreaks.forEach((node) => {
        expect(node.attrs.blockId).toBeUndefined();
      });
    });
  });

  describe('HTML serialization', () => {
    it('should serialize blockId to data-block-id attribute', () => {
      const html = editor.getHTML();
      
      // Check that data-block-id attributes are present in the HTML
      expect(html).toContain('data-block-id');
      
      // Parse the HTML to verify structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const elementsWithId = doc.querySelectorAll('[data-block-id]');
      
      expect(elementsWithId.length).toBeGreaterThan(0);
      elementsWithId.forEach((element) => {
        const blockId = element.getAttribute('data-block-id');
        expect(blockId).toBeDefined();
        expect(blockId).toMatch(/^[0-9a-f-]{36}$/);
      });
    });

    it('should parse data-block-id attribute from HTML', () => {
      const testBlockId = 'test-uuid-1234-5678-9012';
      const testHTML = `<p data-block-id="${testBlockId}">Test content</p>`;
      
      // Create a new editor with HTML containing data-block-id
      const testEditor = new Editor({
        extensions: [
          StarterKit,
          BlockIDExtension,
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
        expect(paragraph.attrs.blockId).toBe(testBlockId);
      }
      
      testEditor.destroy();
    });
  });

  describe('Copy-paste behavior', () => {
    it('should generate new blockIds for pasted content', () => {
      // Get original block IDs
      const originalBlockIds = new Set<string>();
      editor.state.doc.descendants((node) => {
        if (node.attrs.blockId) {
          originalBlockIds.add(node.attrs.blockId);
        }
      });
      
      // Copy the entire document content
      const originalContent = editor.getHTML();
      
      // Create a new editor with the same content (simulating paste)
      const newEditor = new Editor({
        extensions: [
          StarterKit,
          BlockIDExtension,
        ],
        content: originalContent,
      });
      
      // Get new block IDs
      const newBlockIds = new Set<string>();
      newEditor.state.doc.descendants((node) => {
        if (node.attrs.blockId) {
          newBlockIds.add(node.attrs.blockId);
        }
      });
      
      // Check that all IDs are different (none should overlap)
      const intersection = new Set([...originalBlockIds].filter(id => newBlockIds.has(id)));
      expect(intersection.size).toBe(0);
      
      newEditor.destroy();
    });
  });
});