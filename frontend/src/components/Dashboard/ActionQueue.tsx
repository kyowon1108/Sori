'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { ActionNeededItem, ActionType } from '@/types/events';
import { EMPTY_STATES } from '@/utils/constants';
import EmptyState from '@/components/Common/EmptyState';

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

export default function ActionQueue({
  items,
  loading = false,
  maxItems = 5,
}: ActionQueueProps) {
  // 우선순위로 정렬
  const sortedItems = [...items]
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
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
            return (
              <Link
                key={item.id}
                href={item.cta.href}
                className={clsx(
                  'flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md',
                  item.priority === 'critical'
                    ? 'bg-red-50 border-red-200 hover:border-red-300'
                    : item.priority === 'high'
                    ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                )}
              >
                <div className={clsx('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', config.bgColor, config.color)}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.elderly_name} - {item.title}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{item.description}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
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
