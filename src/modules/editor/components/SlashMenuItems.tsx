// src/modules/editor/components/SlashMenuItems.tsx
'use client'

import {
    DefaultReactSuggestionItem,
    getDefaultReactSlashMenuItems,
} from '@blocknote/react'
import { Users } from 'lucide-react'
import { CustomSchema } from '../schema'
import { BlockNoteEditor } from '@blocknote/core'

// Custom slash menu item for Lead List
export const insertLeadList = (
    editor: BlockNoteEditor<any, any, any>
): DefaultReactSuggestionItem => ({
    title: 'Lead List',
    subtext: 'Insert a CRM lead list widget',
    onItemClick: () => {
        const currentBlock = editor.getTextCursorPosition().block

        editor.insertBlocks(
            [
                {
                    type: 'leadList',
                    props: {
                        filterStatus: 'all',
                        limit: 10,
                    },
                },
            ],
            currentBlock,
            'after'
        )
    },
    aliases: ['leads', 'crm', 'customers'],
    group: 'Widgets',
    icon: <Users className="w-4 h-4" />,
})

// Get all slash menu items including custom ones
export function getCustomSlashMenuItems(
    editor: BlockNoteEditor<any, any, any>
): DefaultReactSuggestionItem[] {
    return [
        ...getDefaultReactSlashMenuItems(editor),
        insertLeadList(editor),
    ]
}
