import { Extension } from '@tiptap/core';
import { generateKeyBetween } from '@/lib/utils/fractional-index';
import { Plugin } from '@tiptap/pm/state';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';

/**
 * FractionalIndexExtension
 * 
 * Manages the `sortOrder` attribute for every block using Base62 Fractional Indexing.
 * This allows for O(1) reordering without re-indexing the entire document.
 */
export const FractionalIndexExtension = Extension.create({
    name: 'fractionalIndex',

    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'listItem'],
                attributes: {
                    sortOrder: {
                        default: null,
                        parseHTML: element => element.getAttribute('data-sort-order'),
                        renderHTML: attributes => {
                            if (!attributes.sortOrder) {
                                return {};
                            }

                            return {
                                'data-sort-order': attributes.sortOrder,
                            };
                        },
                    },
                },
            },
        ];
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                appendTransaction: (transactions, oldState, newState) => {
                    const docChanges = transactions.some(tr => tr.docChanged);
                    if (!docChanges) {
                        return null;
                    }

                    const tr = newState.tr;
                    let modified = false;

                    const blocks: { pos: number; sortOrder: string | null }[] = [];

                    newState.doc.forEach((node: ProsemirrorNode, pos: number) => {
                        if (node.isBlock) {
                            blocks.push({ pos, sortOrder: node.attrs.sortOrder });
                        }
                    });

                    // Check for missing sort orders and generate them
                    blocks.forEach((block, index) => {
                        if (!block.sortOrder) {
                            const prevKey = index > 0 ? blocks[index - 1].sortOrder : null;
                            const nextKey = index < blocks.length - 1 ? blocks[index + 1].sortOrder : null;

                            const newKey = generateKeyBetween(prevKey, nextKey);

                            tr.setNodeAttribute(block.pos, 'sortOrder', newKey);
                            block.sortOrder = newKey; // Update locally for next iteration
                            modified = true;
                        }
                    });

                    return modified ? tr : null;
                },
            }),
        ];
    },
});
