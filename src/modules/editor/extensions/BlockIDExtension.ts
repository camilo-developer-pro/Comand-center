import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { generateUUIDv7 } from '@/lib/utils';

export interface BlockIDOptions {
  types: string[]; // Node types to track (paragraph, heading, bulletList, etc.)
}

export const BlockIDExtension = Extension.create<BlockIDOptions>({
  name: 'blockId',
  
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'codeBlock', 'blockquote'],
    };
  },
  
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attributes) => {
              if (!attributes.blockId) return {};
              return { 'data-block-id': attributes.blockId };
            },
          },
        },
      },
    ];
  },
  
  onCreate() {
    this.editor.state.doc.descendants((node, pos) => {
      if (this.options.types.includes(node.type.name) && !node.attrs.blockId) {
        this.editor.commands.updateAttributes(node.type.name, { blockId: generateUUIDv7() });
      }
    });
  },

  addProseMirrorPlugins() {
    const { types } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('blockIdGenerator'),
        appendTransaction: (transactions, oldState, newState) => {
          // Only process if document changed
          if (!transactions.some(tr => tr.docChanged)) return null;
          
          const tr = newState.tr;
          let modified = false;
          
          newState.doc.descendants((node, pos) => {
            if (types.includes(node.type.name) && !node.attrs.blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: generateUUIDv7(),
              });
              modified = true;
            }
          });
          
          return modified ? tr : null;
        },
      }),
    ];
  },
});
