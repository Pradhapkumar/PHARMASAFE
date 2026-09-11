import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'No items match your active filters or registry queries.',
  icon,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`glass-panel p-10 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center ${className}`}>
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-500 mb-4">
        {icon || <PackageOpen className="w-8 h-8" />}
      </div>
      <h4 className="text-base font-semibold text-slate-200 mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
