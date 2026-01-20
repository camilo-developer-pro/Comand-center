/**
 * Authentication Validation Schemas
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Using Zod for runtime validation of auth forms.
 */

import { z } from 'zod';

// ============================================================
// Common Validators
// ============================================================

const emailSchema = z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address');

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    );

const nameSchema = z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

const workspaceNameSchema = z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(50, 'Workspace name must be less than 50 characters');

// ============================================================
// Form Schemas
// ============================================================

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    fullName: nameSchema,
    workspaceName: workspaceNameSchema,
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
    email: emailSchema,
});

export const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
});

export const updateProfileSchema = z.object({
    fullName: nameSchema.optional(),
    avatarUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

// ============================================================
// Type Inference
// ============================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============================================================
// Validation Helpers
// ============================================================

export function validateLogin(data: unknown): LoginInput {
    return loginSchema.parse(data);
}

export function validateRegister(data: unknown): RegisterInput {
    return registerSchema.parse(data);
}

export function validateResetPassword(data: unknown): ResetPasswordInput {
    return resetPasswordSchema.parse(data);
}

export function safeValidateLogin(data: unknown) {
    return loginSchema.safeParse(data);
}

export function safeValidateRegister(data: unknown) {
    return registerSchema.safeParse(data);
}
