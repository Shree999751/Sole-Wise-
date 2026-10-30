import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const ValidationBadge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-300';

  if (status === 'Verified Lab Test') {
    colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  } else if (status === 'Supplier Declared') {
    colorStyles = 'bg-blue-50 text-blue-800 border-blue-300';
  } else if (status === 'User Entered') {
    colorStyles = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (status === 'Archived') {
    colorStyles = 'bg-rose-50 text-rose-800 border-rose-300';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border ${colorStyles} ${className}`}
    >
      {status}
    </span>
  );
};
