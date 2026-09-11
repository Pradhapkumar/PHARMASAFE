import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Querying PharmaSafe national ledger...',
  className = '',
}) => {
  return (
    <div className={`p-12 flex flex-col items-center justify-center text-center ${className}`}>
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
      <span className="text-xs font-medium text-slate-400 tracking-wide">{message}</span>
    </div>
  );
};

export default LoadingState;
