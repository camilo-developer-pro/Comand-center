'use server';

/**
 * Authentication Server Actions
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * These actions handle all authentication operations using Supabase Auth.
 * All actions are server-side only and use httpOnly cookies for sessions.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    type LoginInput,
    type RegisterInput,
} from '../schemas';
import type { AuthResult, OAuthProvider, UserProfile, Workspace } from '../types';

// ============================================================
// Helper Functions
// ============================================================

function getURL() {
    // Use environment variable or default to localhost
    let url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    // Ensure URL has protocol
    url = url.startsWith('http') ? url : `https://${url}`;

    // Ensure URL doesn't end with /
    url = url.endsWith('/') ? url.slice(0, -1) : url;

    return url;
}

function formatAuthError(error: unknown): string {
    if (error instanceof Error) {
        // Map common Supabase errors to user-friendly messages
        const errorMap: Record<string, string> = {
            'Invalid login credentials': 'Invalid email or password. Please try again.',
            'Email not confirmed': 'Please verify your email address before signing in.',
            'User already registered': 'An account with this email already exists.',
            'Password should be at least 6 characters': 'Password must be at least 8 characters.',
            'Email rate limit exceeded': 'Too many attempts. Please try again later.',
        };

        return errorMap[error.message] || error.message;
    }
    return 'An unexpected error occurred. Please try again.';
}

// ============================================================
// Sign In Actions
// ============================================================

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
    formData: FormData
): Promise<AuthResult> {
    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
    };

    // Validate input
    const validationResult = loginSchema.safeParse(rawData);
    if (!validationResult.success) {
        return {
            success: false,
            error: validationResult.error.issues[0]?.message || 'Invalid input',
        };
    }

    const { email, password } = validationResult.data;

    try {
        const supabase = await createClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('[authActions] signInWithPassword error:', error);
            return { success: false, error: formatAuthError(error) };
        }

        if (!data.user) {
            return { success: false, error: 'Failed to retrieve user data' };
        }

        // Revalidate to refresh server components
        revalidatePath('/', 'layout');

        return {
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email!,
                fullName: data.user.user_metadata?.full_name || null,
                avatarUrl: data.user.user_metadata?.avatar_url || null,
                createdAt: data.user.created_at,
            },
            redirectTo: '/documents',
        };
    } catch (error) {
        console.error('[authActions] signInWithPassword unexpected error:', error);
        return { success: false, error: formatAuthError(error) };
    }
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${getURL()}/auth/callback`,
        },
    });

    if (error) {
        console.error('[authActions] signInWithOAuth error:', error);
        throw new Error(formatAuthError(error));
    }

    if (data.url) {
        redirect(data.url);
    }
}

// ============================================================
// Sign Up Actions
// ============================================================

/**
 * Sign up with email and password
 * Creates user account and personal workspace
 */
export async function signUpWithPassword(
    formData: FormData
): Promise<AuthResult> {
    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        fullName: formData.get('fullName'),
        workspaceName: formData.get('workspaceName'),
    };

    // Validate input
    const validationResult = registerSchema.safeParse(rawData);
    if (!validationResult.success) {
        return {
            success: false,
            error: validationResult.error.issues[0]?.message || 'Invalid input',
        };
    }

    const { email, password, fullName, workspaceName } = validationResult.data;

    try {
        const supabase = await createClient();

        // Create the user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${getURL()}/auth/callback`,
                data: {
                    full_name: fullName,
                    workspace_name: workspaceName,
                },
            },
        });

        if (authError) {
            console.error('[authActions] signUpWithPassword error:', authError);
            return { success: false, error: formatAuthError(authError) };
        }

        if (!authData.user) {
            return { success: false, error: 'Failed to create user account' };
        }

        // Note: Workspace creation is handled by a database trigger
        // See migration 00004_auth_triggers.sql

        return {
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email!,
                fullName: fullName,
                avatarUrl: null,
                createdAt: authData.user.created_at,
            },
            redirectTo: authData.session ? '/documents' : '/auth/verify-email',
        };
    } catch (error) {
        console.error('[authActions] signUpWithPassword unexpected error:', error);
        return { success: false, error: formatAuthError(error) };
    }
}

// ============================================================
// Sign Out Actions
// ============================================================

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('[authActions] signOut error:', error);
        throw new Error(formatAuthError(error));
    }

    // Revalidate to clear cached data
    revalidatePath('/', 'layout');

    redirect('/login');
}

// ============================================================
// Password Reset Actions
// ============================================================

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
    formData: FormData
): Promise<AuthResult> {
    const rawData = {
        email: formData.get('email'),
    };

    const validationResult = resetPasswordSchema.safeParse(rawData);
    if (!validationResult.success) {
        return {
            success: false,
            error: validationResult.error.issues[0]?.message || 'Invalid input',
        };
    }

    const { email } = validationResult.data;

    try {
        const supabase = await createClient();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${getURL()}/auth/reset-password`,
        });

        if (error) {
            console.error('[authActions] sendPasswordResetEmail error:', error);
            return { success: false, error: formatAuthError(error) };
        }

        // Always return success to prevent email enumeration
        return {
            success: true,
            user: { id: '', email, fullName: null, avatarUrl: null, createdAt: '' },
        };
    } catch (error) {
        console.error('[authActions] sendPasswordResetEmail unexpected error:', error);
        return { success: false, error: formatAuthError(error) };
    }
}

/**
 * Update password (for authenticated users)
 */
export async function updatePassword(
    newPassword: string
): Promise<AuthResult> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            console.error('[authActions] updatePassword error:', error);
            return { success: false, error: formatAuthError(error) };
        }

        if (!data.user) {
            return { success: false, error: 'Failed to update password' };
        }

        return {
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email!,
                fullName: data.user.user_metadata?.full_name || null,
                avatarUrl: data.user.user_metadata?.avatar_url || null,
                createdAt: data.user.created_at,
            },
        };
    } catch (error) {
        console.error('[authActions] updatePassword unexpected error:', error);
        return { success: false, error: formatAuthError(error) };
    }
}

// ============================================================
// Session Actions
// ============================================================

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Get default workspace
    let workspace = null;
    if (profile?.default_workspace_id) {
        const { data: ws } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', profile.default_workspace_id)
            .single();
        workspace = ws;
    }

    return {
        user: {
            id: user.id,
            email: user.email!,
            fullName: user.user_metadata?.full_name || profile?.full_name || null,
            avatarUrl: user.user_metadata?.avatar_url || profile?.avatar_url || null,
            createdAt: user.created_at,
        },
        profile,
        workspace,
    };
}

/**
 * Refresh the current session
 */
export async function refreshSession() {
    const supabase = await createClient();

    const { error } = await supabase.auth.refreshSession();

    if (error) {
        console.error('[authActions] refreshSession error:', error);
        throw new Error(formatAuthError(error));
    }

    revalidatePath('/', 'layout');
}
