import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 border-dashed dark:border-neutral-800 rounded-lg min-h-[300px]">
      <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4">
        <Icon className="text-neutral-400" size={24} />
      </div>
      <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 mb-6 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
