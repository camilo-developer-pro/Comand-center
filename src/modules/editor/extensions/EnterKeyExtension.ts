import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface EnterKeyOptions {
  onEnterAtEnd: () => void; // Callback when Enter pressed at end of content
}

export const EnterKeyExtension = Extension.create<EnterKeyOptions>({
  name: 'enterKeyHandler',
  
  addOptions() {
    return {
      onEnterAtEnd: () => {},
    };
  },
  
  addProseMirrorPlugins() {
    const { onEnterAtEnd } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('enterKeyHandler'),
        props: {
          handleKeyDown: (view, event) => {
            if (event.key !== 'Enter' || event.shiftKey) {
              return false; // Shift+Enter allows newline
            }
            
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            
            // Check if cursor is at the end of the document
            const isAtEnd = $from.pos === state.doc.content.size - 1;
            const isEmptyParagraph = state.doc.textContent === '';
            
            if (isAtEnd || isEmptyParagraph) {
              event.preventDefault();
              onEnterAtEnd();
              return true;
            }
            
            return false;
          },
        },
      }),
    ];
  },
});