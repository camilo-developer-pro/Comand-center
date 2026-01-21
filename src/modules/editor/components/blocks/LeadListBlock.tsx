// src/modules/editor/components/blocks/LeadListBlock.tsx
'use client'

import { createReactBlockSpec } from '@blocknote/react'
import { LeadListWidget } from '@/modules/crm/components/LeadListWidget'
import { defaultLeadListBlockAttributes, LeadListBlockAttributes } from '../../schema/leadListBlock'
import { useWorkspace } from '@/modules/core/hooks/useWorkspace'

// BlockNote Block Specification
export const LeadListBlock = createReactBlockSpec(
    {
        type: 'leadList' as const,
        propSchema: {
            filterStatus: {
                default: defaultLeadListBlockAttributes.filterStatus,
            },
            limit: {
                default: defaultLeadListBlockAttributes.limit,
            },
        },
        content: 'none', // This block doesn't contain editable content
    },
    {
        render: (props: any) => {
            return <LeadListBlockRenderer {...props} />
        },
    }
)

// Separate renderer component to use hooks
function LeadListBlockRenderer(props: {
    block: {
        id: string
        props: LeadListBlockAttributes
    }
}) {
    // Get workspace ID from context
    const { workspaceId } = useWorkspace()

    if (!workspaceId) {
        return (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    No workspace selected. Please select a workspace to view leads.
                </p>
            </div>
        )
    }

    return (
        <div
            className="my-2"
            contentEditable={false}
            data-block-id={props.block.id}
        >
            <LeadListWidget
                config={{
                    filterStatus: props.block.props.filterStatus === 'all' ? undefined : [props.block.props.filterStatus as any],
                    maxItems: props.block.props.limit
                }}
            />
        </div>
    )
}
