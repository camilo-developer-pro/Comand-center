import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { CursorPosition } from '@/lib/realtime/presence-types';

export interface CursorTrackingOptions {
    onCursorChange: (position: CursorPosition | null) => void;
    throttleMs?: number;
}

const cursorTrackingPluginKey = new PluginKey('cursorTracking');

export const CursorTrackingExtension = Extension.create<CursorTrackingOptions>({
    name: 'cursorTracking',

    addOptions() {
        return {
            onCursorChange: () => { },
            throttleMs: 33 // ~30fps
        };
    },

    addProseMirrorPlugins() {
        const { onCursorChange, throttleMs } = this.options;
        let lastUpdate = 0;
        let pendingPosition: CursorPosition | null = null;
        let rafId: number | null = null;

        const throttledUpdate = () => {
            const now = Date.now();
            if (now - lastUpdate >= (throttleMs ?? 33)) {
                onCursorChange(pendingPosition);
                lastUpdate = now;
                pendingPosition = null;
            } else if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    rafId = null;
                    throttledUpdate();
                });
            }
        };

        return [
            new Plugin({
                key: cursorTrackingPluginKey,

                view() {
                    return {
                        update(view, prevState) {
                            const { selection } = view.state;

                            if (selection.eq(prevState.selection)) return;

                            // Get the block ID from the resolved position
                            const $pos = selection.$anchor;
                            const blockNode = $pos.node($pos.depth);
                            const blockId = blockNode?.attrs?.blockId || null;

                            if (!blockId) {
                                pendingPosition = null;
                                throttledUpdate();
                                return;
                            }

                            // Get screen coordinates for cursor rendering
                            // We use selection.anchor to get the exact cursor tip position
                            const coords = view.coordsAtPos(selection.anchor);

                            pendingPosition = {
                                block_id: blockId,
                                offset: selection.anchor,
                                anchor_rect: {
                                    top: coords.top,
                                    left: coords.left,
                                    height: coords.bottom - coords.top
                                }
                            };

                            throttledUpdate();
                        },

                        destroy() {
                            if (rafId) {
                                cancelAnimationFrame(rafId);
                            }
                        }
                    };
                }
            })
        ];
    }
});
