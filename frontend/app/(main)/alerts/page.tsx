'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCalls } from '@/hooks/useCalls';
import { useElderly } from '@/hooks/useElderly';
import { SeverityBadge, StatusBadge, RiskBadge } from '@/components/Common/Badge';
import { ListItemSkeleton } from '@/components/Common/Skeleton';
import EmptyState from '@/components/Common/EmptyState';
import { EMPTY_STATES, EVENT_SEVERITY_COLORS } from '@/utils/constants';
import {
  callsToEvents,
  elderlyToActionItems,
  callToActionItem,
  formatRelativeTime,
} from '@/utils/eventMapper';
import { Event, EventSeverity, ActionNeededItem } from '@/types/events';
import clsx from 'clsx';

type FilterType = 'all' | 'action_needed' | 'info' | 'warning' | 'error' | 'success';

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const { callsList, fetchList: fetchCalls, callsLoading } = useCalls();
  const { elderlyList, fetchList: fetchElderly, elderlyLoading } = useElderly();
  const [filter, setFilter] = useState<FilterType>(
    (searchParams.get('requires_action') === 'true' ? 'action_needed' : 'all') as FilterType
  );
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchCalls(), fetchElderly()]).finally(() => {
      setDataLoaded(true);
    });
  }, [fetchCalls, fetchElderly]);

  // 이벤트 목록 생성
  const events = useMemo(() => {
    const elderlyMap = new Map(elderlyList.map((e) => [e.id, e.name]));
    return callsToEvents(callsList, elderlyMap).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [callsList, elderlyList]);

  // 조치 필요 항목 생성
  const actionItems = useMemo(() => {
    const items: ActionNeededItem[] = [];

    elderlyList.forEach((elderly) => {
      items.push(...elderlyToActionItems(elderly));
    });

    callsList
      .filter((call) => call.status === 'missed' || call.status === 'failed')
      .forEach((call) => {
        const elderly = elderlyList.find((e) => e.id === call.elderly_id);
        const item = callToActionItem(call, elderly?.name);
        if (item) items.push(item);
      });

    return items;
  }, [callsList, elderlyList]);

  // 필터링된 이벤트
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'action_needed') return []; // 조치 필요는 별도 표시
    return events.filter((e) => e.severity === filter);
  }, [events, filter]);

  const filters: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: '전체', count: events.length },
    { value: 'action_needed', label: '조치 필요', count: actionItems.length },
    { value: 'error', label: '위험', count: events.filter((e) => e.severity === 'error').length },
    { value: 'warning', label: '주의', count: events.filter((e) => e.severity === 'warning').length },
    { value: 'success', label: '성공', count: events.filter((e) => e.severity === 'success').length },
    { value: 'info', label: '정보', count: events.filter((e) => e.severity === 'info').length },
  ];

  const isLoading = !dataLoaded && (callsLoading || elderlyLoading);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">알림센터</h1>
        {actionItems.length > 0 && (
          <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-full">
            조치 필요 {actionItems.length}건
          </span>
        )}
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                filter === f.value
                  ? f.value === 'action_needed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {f.label}
              <span className="ml-1 text-xs">({f.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 조치 필요 항목 */}
      {filter === 'action_needed' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              조치가 필요한 항목
            </h2>
          </div>

          {isLoading ? (
            <div className="p-6">
              <ListItemSkeleton count={5} />
            </div>
          ) : actionItems.length === 0 ? (
            <EmptyState
              title={EMPTY_STATES.action_needed.title}
              description={EMPTY_STATES.action_needed.description}
              icon={
                <svg className="w-12 h-12 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              className="py-12"
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {actionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.cta.href}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={clsx(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      item.priority === 'critical'
                        ? 'bg-red-100 text-red-600'
                        : item.priority === 'high'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {item.type === 'missed_call' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    ) : item.type === 'high_risk' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {item.elderly_name} - {item.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(item.created_at)}
                    </span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 이벤트 목록 */}
      {filter !== 'action_needed' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">이벤트 기록</h2>
          </div>

          {isLoading ? (
            <div className="p-6">
              <ListItemSkeleton count={5} />
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              title={EMPTY_STATES.events.title}
              description={EMPTY_STATES.events.description}
              className="py-12"
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEvents.map((event) => {
                const colors = EVENT_SEVERITY_COLORS[event.severity];
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={clsx(
                        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                        colors.bg,
                        colors.icon
                      )}
                    >
                      {event.severity === 'error' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : event.severity === 'warning' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : event.severity === 'success' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <SeverityBadge severity={event.severity} size="sm" />
                      </div>
                      <p className="text-sm text-gray-500">{event.description}</p>
                      {event.cta && (
                        <Link
                          href={event.cta.href}
                          className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          {event.cta.label}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
