import { toast } from 'sonner';

/**
 * Toast utility functions for consistent UX
 * V1.1 Phase 6: Optimistic UI & Polish
 */

type ToastOptions = {
    description?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
};

export const showToast = {
    /**
     * Success toast - green theme
     */
    success: (message: string, options?: ToastOptions) => {
        toast.success(message, {
            description: options?.description,
            duration: options?.duration ?? 3000,
            action: options?.action ? {
                label: options.action.label,
                onClick: options.action.onClick,
            } : undefined,
        });
    },

    /**
     * Error toast - red theme
     */
    error: (message: string, options?: ToastOptions) => {
        toast.error(message, {
            description: options?.description,
            duration: options?.duration ?? 5000,
            action: options?.action ? {
                label: options.action.label,
                onClick: options.action.onClick,
            } : undefined,
        });
    },

    /**
     * Warning toast - yellow theme
     */
    warning: (message: string, options?: ToastOptions) => {
        toast.warning(message, {
            description: options?.description,
            duration: options?.duration ?? 4000,
        });
    },

    /**
     * Info toast - blue theme
     */
    info: (message: string, options?: ToastOptions) => {
        toast.info(message, {
            description: options?.description,
            duration: options?.duration ?? 4000,
        });
    },

    /**
     * Loading toast with ID for updates
     */
    loading: (message: string, id: string) => {
        toast.loading(message, { id });
    },

    /**
     * Dismiss a specific toast by ID
     */
    dismiss: (id: string) => {
        toast.dismiss(id);
    },

    /**
     * Promise toast - shows loading, then success/error
     */
    promise: <T>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: Error) => string);
        }
    ) => {
        return toast.promise(promise, messages);
    },

    /**
     * Confirmation toast with action
     */
    confirm: (
        message: string,
        options: {
            description?: string;
            confirmLabel?: string;
            onConfirm: () => void;
            onCancel?: () => void;
        }
    ) => {
        toast(message, {
            description: options.description,
            duration: 10000, // Longer for confirmations
            action: {
                label: options.confirmLabel ?? 'Confirm',
                onClick: options.onConfirm,
            },
            cancel: options.onCancel ? {
                label: 'Cancel',
                onClick: options.onCancel,
            } : undefined,
        });
    },
};
