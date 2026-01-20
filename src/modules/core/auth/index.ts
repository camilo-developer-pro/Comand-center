/**
 * Auth Module - Public API
 * 
 * V1.1 Phase 1: Authentication & User Flow
 */

// Types
export type {
    AuthUser,
    UserProfile,
    Workspace,
    WorkspaceMember,
    AuthState,
    AuthContextValue,
    AuthResult,
    AuthError,
    LoginFormData,
    RegisterFormData,
    OAuthProvider,
    OAuthConfig,
} from './types';

// Schemas
export {
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    updatePasswordSchema,
    updateProfileSchema,
    validateLogin,
    validateRegister,
    validateResetPassword,
    safeValidateLogin,
    safeValidateRegister,
    type LoginInput,
    type RegisterInput,
    type ResetPasswordInput,
    type UpdatePasswordInput,
    type UpdateProfileInput,
} from './schemas';

// Hooks (will be added in next prompt)
// export { useAuth } from './hooks/useAuth';

// Actions
export {
    signInWithPassword,
    signInWithOAuth,
    signUpWithPassword,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    getCurrentUser,
    refreshSession,
    createWorkspace,
    getCurrentWorkspace,
    updateWorkspace,
} from './actions';
