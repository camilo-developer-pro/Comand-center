import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { generateKeyBetween } from '@/lib/utils';

export interface FractionalIndexOptions {
  types: string[];
}

export const FractionalIndexExtension = Extension.create<FractionalIndexOptions>({
  name: 'fractionalIndex',
  
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
          sortOrder: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-sort-order'),
            renderHTML: (attributes) => {
              if (!attributes.sortOrder) return {};
              return { 'data-sort-order': attributes.sortOrder };
            },
          },
        },
      },
    ];
  },
  
  addProseMirrorPlugins() {
    const { types } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('fractionalIndexGenerator'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some(tr => tr.docChanged)) return null;
          
          const tr = newState.tr;
          let modified = false;
          let prevSortOrder: string | null = null;
          
          newState.doc.descendants((node, pos) => {
            if (!types.includes(node.type.name)) return;
            
            if (!node.attrs.sortOrder) {
              // Find next sibling's sortOrder for midpoint calculation
              let nextSortOrder: string | null = null;
              const $pos = newState.doc.resolve(pos);
              const parentDepth = $pos.depth - 1;
              
              if (parentDepth >= 0) {
                const parent = $pos.node(parentDepth);
                const indexInParent = $pos.index(parentDepth);
                
                // Look for next sibling with sortOrder
                for (let i = indexInParent + 1; i < parent.childCount; i++) {
                  const sibling = parent.child(i);
                  if (sibling.attrs.sortOrder) {
                    nextSortOrder = sibling.attrs.sortOrder;
                    break;
                  }
                }
              }
              
              const newSortOrder = generateKeyBetween(prevSortOrder, nextSortOrder, true);
              
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                sortOrder: newSortOrder,
              });
              modified = true;
              prevSortOrder = newSortOrder;
            } else {
              prevSortOrder = node.attrs.sortOrder;
            }
          });
          
          return modified ? tr : null;
        },
      }),
    ];
  },
});
