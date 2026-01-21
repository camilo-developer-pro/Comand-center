import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EmptyStateAction {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: EmptyStateAction;
    secondaryAction?: EmptyStateAction;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Base Empty State Component
 * V1.1 Phase 6: Optimistic UI & Polish
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    secondaryAction,
    className,
    size = 'md',
}: EmptyStateProps) {
    const sizeClasses = {
        sm: 'py-6',
        md: 'py-12',
        lg: 'py-20',
    };

    const iconSizes = {
        sm: 'w-10 h-10',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    const renderAction = (actionConfig: EmptyStateAction, isPrimary: boolean) => {
        const baseClasses = cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            isPrimary
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        );

        if (actionConfig.href) {
            return (
                <Link href={actionConfig.href} className={baseClasses}>
                    {actionConfig.label}
                </Link>
            );
        }

        return (
            <button onClick={actionConfig.onClick} className={baseClasses}>
                {actionConfig.label}
            </button>
        );
    };

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center',
                sizeClasses[size],
                className
            )}
        >
            {icon && (
                <div
                    className={cn(
                        'flex items-center justify-center rounded-full',
                        'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
                        'mb-4',
                        iconSizes[size]
                    )}
                >
                    {icon}
                </div>
            )}

            <h3 className={cn(
                'font-semibold text-gray-900 dark:text-white',
                size === 'lg' ? 'text-xl' : 'text-base'
            )}>
                {title}
            </h3>

            {description && (
                <p className={cn(
                    'mt-1 text-gray-500 dark:text-gray-400 max-w-sm',
                    size === 'sm' ? 'text-xs' : 'text-sm'
                )}>
                    {description}
                </p>
            )}

            {(action || secondaryAction) && (
                <div className="mt-4 flex items-center gap-3">
                    {action && renderAction(action, true)}
                    {secondaryAction && renderAction(secondaryAction, false)}
                </div>
            )}
        </div>
    );
}
