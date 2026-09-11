import React from 'react';
import { AlertOctagon, RotateCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Registry Communication Error',
  message = 'Failed to load ledger records. Please verify network credentials or check node connectivity.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`glass-panel p-8 rounded-xl border border-rose-900/60 bg-rose-950/20 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="p-3 rounded-full bg-rose-900/40 text-rose-400 mb-3 border border-rose-800/60">
        <AlertOctagon className="w-7 h-7" />
      </div>
      <h4 className="text-sm font-semibold text-rose-200 mb-1">{title}</h4>
      <p className="text-xs text-rose-300/80 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-900/50 text-rose-200 border border-rose-700 hover:bg-rose-900/80 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
