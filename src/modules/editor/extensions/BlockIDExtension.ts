import { Extension } from '@tiptap/core';
import { v7 as uuidv7 } from 'uuid';
import { Plugin } from '@tiptap/pm/state';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';

/**
 * BlockIDExtension
 * 
 * Automatically assigns a unique UUIDv7 to every block node (paragraph, heading, etc.)
 * when it is created. This ID is persistent and serves as the primary key
 * in the database `blocks` table.
 */
export const BlockIDExtension = Extension.create({
    name: 'blockId',

    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'listItem'],
                attributes: {
                    id: {
                        default: null,
                        parseHTML: element => element.getAttribute('data-id'),
                        renderHTML: attributes => {
                            if (!attributes.id) {
                                return {};
                            }

                            return {
                                'data-id': attributes.id,
                            };
                        },
                    },
                },
            },
        ];
    },

    onCreate() {
        this.editor.state.doc.descendants((node, pos) => {
            if (node.isBlock && !node.attrs.id) {
                this.editor.commands.updateAttributes(node.type.name, { id: uuidv7() });
            }
        });
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

                    newState.doc.descendants((node: ProsemirrorNode, pos: number) => {
                        if (node.isBlock && node.type.name !== 'doc') {
                            const id = node.attrs.id;

                            if (!id) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    id: uuidv7(),
                                });
                                modified = true;
                            }
                        }
                    });

                    return modified ? tr : null;
                },
            }),
        ];
    },
});
