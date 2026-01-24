'use client';

import { CheckCircle, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useBlockSync, type UseBlockSyncResult } from '../hooks/useBlockSync';

export interface SyncStatusProps {
  documentId: string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SyncStatus({
  documentId,
  className,
  showLabel = true,
  size = 'md',
}: SyncStatusProps) {
  const { status, isSyncing, isError, isSuccess } = useBlockSync({
    documentId,
    debounceMs: 1000,
  });

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: Loader2,
          iconClass: 'text-yellow-500 animate-spin',
          text: 'Syncing...',
          textClass: 'text-yellow-600',
        };
      case 'error':
        return {
          icon: CloudOff,
          iconClass: 'text-red-500',
          text: 'Sync failed',
          textClass: 'text-red-600',
        };
      case 'success':
        return {
          icon: CheckCircle,
          iconClass: 'text-green-500',
          text: 'Synced',
          textClass: 'text-green-600',
        };
      case 'idle':
      default:
        return {
          icon: Cloud,
          iconClass: 'text-gray-400',
          text: 'Ready to sync',
          textClass: 'text-gray-500',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${config.text}`}
    >
      <Icon
        className={cn(
          sizeClasses[size],
          config.iconClass
        )}
        aria-hidden="true"
      />
      
      {showLabel && (
        <span
          className={cn(
            'font-medium',
            textSizeClasses[size],
            config.textClass
          )}
        >
          {config.text}
        </span>
      )}
    </div>
  );
}

// Helper component for inline usage
export function InlineSyncStatus({ documentId }: { documentId: string }) {
  return (
    <SyncStatus
      documentId={documentId}
      showLabel={false}
      size="sm"
      className="inline-flex"
    />
  );
}

// Helper component for toolbar usage
export function ToolbarSyncStatus({ documentId }: { documentId: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
      <SyncStatus
        documentId={documentId}
        showLabel={true}
        size="sm"
      />
    </div>
  );
}

// Status badge for document lists
export function SyncStatusBadge({ documentId }: { documentId: string }) {
  const { status } = useBlockSync({ documentId });

  const statusConfig = {
    syncing: {
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      text: 'Syncing',
    },
    error: {
      className: 'bg-red-100 text-red-800 border-red-200',
      text: 'Error',
    },
    success: {
      className: 'bg-green-100 text-green-800 border-green-200',
      text: 'Synced',
    },
    idle: {
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      text: 'Ready',
    },
  };

  // Type-safe access to status config
  const config = (statusConfig as Record<string, { className: string; text: string }>)[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
        config?.className || 'bg-gray-100 text-gray-800 border-gray-200'
      )}
    >
      {config?.text || 'Ready'}
    </span>
  );
}