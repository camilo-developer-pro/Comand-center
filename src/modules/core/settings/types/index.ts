/**
 * Settings Module Types
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

export interface WorkspaceSettings {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    owner_id: string;
    memberCount: number;
}

export type SettingsActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };
