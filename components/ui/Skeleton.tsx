import React from 'react';
import { radius } from '../../lib/designTokens';
import type { Radius } from '../../lib/designTokens';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: Radius;
  className?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  rounded = 'md',
  className = '',
  animate = true,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`bg-slate-200 ${radius[rounded]} ${animate ? 'animate-pulse' : ''} ${className}`}
      style={style}
    />
  );
};

// Pre-configured skeleton variants
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={16}
        width={i === lines - 1 && lines > 1 ? '75%' : '100%'}
        rounded="sm"
      />
    ))}
  </div>
);

export const SkeletonCircle: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 40, className = '' }) => (
  <Skeleton width={size} height={size} rounded="full" className={className} />
);

// Table row skeleton for LeadList
export const SkeletonRow: React.FC<{
  columns?: number;
  className?: string;
}> = ({ columns = 5, className = '' }) => (
  <div className={`flex items-center gap-4 p-4 ${className}`}>
    <Skeleton width={20} height={20} rounded="sm" />
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton
        key={i}
        height={16}
        className="flex-1"
        rounded="sm"
      />
    ))}
  </div>
);

// Lead list skeleton
export const LeadListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="divide-y divide-slate-100">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4">
        <Skeleton width={20} height={20} rounded="sm" />
        <div className="flex-1 space-y-2">
          <Skeleton height={18} width="60%" rounded="sm" />
          <Skeleton height={14} width="40%" rounded="sm" />
        </div>
        <Skeleton height={24} width={80} rounded="full" />
        <div className="flex gap-1">
          <SkeletonCircle size={24} />
          <SkeletonCircle size={24} />
          <SkeletonCircle size={24} />
        </div>
        <Skeleton height={14} width={60} rounded="sm" />
      </div>
    ))}
  </div>
);

// Dashboard card skeleton
export const DashboardCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton height={20} width={120} rounded="sm" />
      <SkeletonCircle size={32} />
    </div>
    <Skeleton height={48} width={80} rounded="sm" />
    <Skeleton height={14} width="60%" rounded="sm" />
  </div>
);

// Activity ring skeleton
export const ActivityRingSkeleton: React.FC = () => (
  <div className="flex items-center gap-4">
    <SkeletonCircle size={80} />
    <div className="space-y-2">
      <Skeleton height={18} width={100} rounded="sm" />
      <Skeleton height={14} width={60} rounded="sm" />
    </div>
  </div>
);

// Task card skeleton
export const TaskCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-3">
      <SkeletonCircle size={40} />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="70%" rounded="sm" />
        <Skeleton height={14} width="50%" rounded="sm" />
      </div>
    </div>
    <Skeleton height={32} width="100%" rounded="md" />
  </div>
);

Skeleton.displayName = 'Skeleton';
