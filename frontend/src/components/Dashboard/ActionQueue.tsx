'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { ActionNeededItem, ActionType } from '@/types/events';
import { EMPTY_STATES } from '@/utils/constants';
import EmptyState from '@/components/Common/EmptyState';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ActionQueueProps {
  items: ActionNeededItem[];
  loading?: boolean;
  maxItems?: number;
}

const ACTION_TYPE_CONFIG: Record<ActionType, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  missed_call: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 3.5l-5 5m0-5l5 5" />
      </svg>
    ),
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  no_device: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728" />
      </svg>
    ),
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  analysis_pending: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  analysis_failed: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  high_risk: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// 우선순위 표시 배지 설정
const PRIORITY_BADGES: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  critical: { icon: '⚠️', label: '긴급', color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { icon: '⏰', label: '주의', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { icon: '📌', label: '확인', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  low: { icon: '✅', label: '점검', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export default function ActionQueue({
  items,
  loading = false,
  maxItems = 5,
}: ActionQueueProps) {
  // 우선순위 정렬 규칙:
  // 1차: priority (critical → high → medium → low)
  // 2차: created_at (오래된 것 우선 - 방치 시간이 긴 항목이 더 긴급)
  // 3차: elderly_name (한글 가나다순)
  const sortedItems = [...items]
    .sort((a, b) => {
      // 1차: Priority
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 2차: Created time (older first)
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) return timeA - timeB;

      // 3차: Name
      return a.elderly_name.localeCompare(b.elderly_name, 'ko');
    })
    .slice(0, maxItems);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          조치 필요
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {items.length > 0 && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        )}
        조치 필요
        {items.length > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            {items.length}
          </span>
        )}
      </h2>

      {sortedItems.length === 0 ? (
        <EmptyState
          title={EMPTY_STATES.action_needed.title}
          description={EMPTY_STATES.action_needed.description}
          icon={
            <svg className="w-12 h-12 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedItems.map((item) => {
            const config = ACTION_TYPE_CONFIG[item.type];
            const priorityBadge = PRIORITY_BADGES[item.priority];
            const createdAt = parseISO(item.created_at);
            const relativeTime = formatDistanceToNow(createdAt, { addSuffix: true, locale: ko });
            const absoluteTime = format(createdAt, 'yyyy년 M월 d일 HH:mm', { locale: ko });

            return (
              <div
                key={item.id}
                className={clsx(
                  'flex items-start gap-4 p-4 rounded-lg border transition-all',
                  item.priority === 'critical'
                    ? 'bg-red-50 border-red-200 border-l-4 border-l-red-600'
                    : item.priority === 'high'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-gray-50 border-gray-200'
                )}
              >
                {/* 아이콘 */}
                <div className={clsx('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', config.bgColor, config.color)}>
                  {config.icon}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  {/* 헤더: 우선순위 배지 + 이름/제목 */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0',
                        priorityBadge.bgColor,
                        priorityBadge.color
                      )}
                      aria-label={`우선순위: ${priorityBadge.label}`}
                    >
                      <span aria-hidden="true">{priorityBadge.icon}</span>
                      {priorityBadge.label}
                    </span>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.elderly_name} - {item.title}
                    </p>
                  </div>

                  {/* 설명 */}
                  <p className="text-sm text-gray-500 mb-2">{item.description}</p>

                  {/* 타임스탬프 */}
                  <p
                    className="text-xs text-gray-400"
                    title={absoluteTime}
                    aria-label={`발생 시간: ${absoluteTime}`}
                  >
                    {relativeTime}
                  </p>
                </div>

                {/* CTA 버튼 */}
                <Link
                  href={item.cta.href}
                  className={clsx(
                    'flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center',
                    item.cta.variant === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : item.cta.variant === 'secondary'
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  )}
                  aria-label={`${item.elderly_name} - ${item.title}: ${item.cta.label}`}
                >
                  {item.cta.label}
                </Link>
              </div>
            );
          })}

          {items.length > maxItems && (
            <Link
              href="/alerts?requires_action=true"
              className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2"
            >
              {items.length - maxItems}건 더 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
