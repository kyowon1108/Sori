'use client';

import clsx from 'clsx';
import { CALL_STATUS_COLORS, RISK_LEVEL_COLORS, EVENT_SEVERITY_COLORS } from '@/utils/constants';
import type { CallStatus } from '@/types/calls';
import type { RiskLevel } from '@/types/elderly';
import type { EventSeverity } from '@/types/events';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatusBadgeProps {
  status: CallStatus;
  size?: 'sm' | 'md' | 'lg';
}

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

interface SeverityBadgeProps {
  severity: EventSeverity;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        sizeClasses[size],
        variant === 'outline' ? 'border bg-transparent' : '',
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = CALL_STATUS_COLORS[status] || CALL_STATUS_COLORS.scheduled;
  const labels: Record<CallStatus, string> = {
    scheduled: '예정됨',
    in_progress: '진행 중',
    completed: '완료',
    failed: '실패',
    cancelled: '취소',
    missed: '미응답',
  };

  return (
    <Badge
      size={size}
      className={clsx(colors.bg, colors.text)}
    >
      {labels[status]}
    </Badge>
  );
}

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const colors = RISK_LEVEL_COLORS[level] || RISK_LEVEL_COLORS.low;
  const labels: Record<RiskLevel, string> = {
    low: '낮음',
    medium: '보통',
    high: '높음',
  };

  return (
    <Badge
      size={size}
      className={clsx(colors.bg, colors.text)}
    >
      {labels[level]}
    </Badge>
  );
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const colors = EVENT_SEVERITY_COLORS[severity] || EVENT_SEVERITY_COLORS.info;
  const labels: Record<EventSeverity, string> = {
    info: '정보',
    warning: '주의',
    error: '위험',
    success: '성공',
  };

  return (
    <Badge
      size={size}
      className={clsx(colors.bg, colors.text)}
    >
      {labels[severity]}
    </Badge>
  );
}
