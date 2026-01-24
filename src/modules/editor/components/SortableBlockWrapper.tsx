'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SortableBlockWrapperProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SortableBlockWrapper({
  id,
  children,
  disabled = false,
}: SortableBlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'opacity-50 bg-blue-50 dark:bg-blue-900/20 rounded'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'cursor-grab active:cursor-grabbing',
          'p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800',
          disabled && 'pointer-events-none'
        )}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      
      {children}
    </div>
  );
}