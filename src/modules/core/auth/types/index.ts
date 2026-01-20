/**
 * Authentication Types
 * 
 * V1.1 Phase 1: Authentication & User Flow
 */

import { User, Session } from '@supabase/supabase-js';

// ============================================================
// User Types
// ============================================================

export interface AuthUser {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    createdAt: string;
}

export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    default_workspace_id: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================================
// Workspace Types
// ============================================================

export interface Workspace {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    created_at: string;
}

// ============================================================
// Auth State Types
// ============================================================

export interface AuthState {
    user: AuthUser | null;
    session: Session | null;
    workspace: Workspace | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
    signIn: (email: string, password: string) => Promise<AuthResult>;
    signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

// ============================================================
// Auth Result Types
// ============================================================

export type AuthResult =
    | { success: true; user: AuthUser; redirectTo?: string }
    | { success: false; error: string; code?: string };

export type AuthError = {
    message: string;
    code?: string;
    status?: number;
};

// ============================================================
// Form Types
// ============================================================

export interface LoginFormData {
    email: string;
    password: string;
}

export interface RegisterFormData {
    email: string;
    password: string;
    fullName: string;
    workspaceName: string;
}

export interface ResetPasswordFormData {
    email: string;
}

// ============================================================
// OAuth Types
// ============================================================

export type OAuthProvider = 'google' | 'github' | 'azure';

export interface OAuthConfig {
    provider: OAuthProvider;
    scopes?: string[];
    redirectTo?: string;
}
