import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div 
      className={`animate-pulse rounded bg-slate-200 ${className}`}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard = () => (
  <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-10 rounded-lg" />
    </div>
    <div className="mt-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-16" />
    </div>
  </div>
);
