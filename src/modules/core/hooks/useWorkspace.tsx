// src/modules/core/hooks/useWorkspace.tsx
'use client'

import React, { createContext, useContext, ReactNode } from 'react'

interface WorkspaceContextValue {
    workspaceId: string | null
    workspaceName: string | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({
    children,
    workspaceId,
    workspaceName
}: {
    children: ReactNode
    workspaceId: string | null
    workspaceName: string | null
}) {
    return (
        <WorkspaceContext.Provider value={{ workspaceId, workspaceName }}>
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext)
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider')
    }
    return context
}
export * from './useUser';
