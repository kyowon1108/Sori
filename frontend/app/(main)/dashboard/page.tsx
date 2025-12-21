'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useElderly } from '@/hooks/useElderly';
import { useCalls } from '@/hooks/useCalls';
import { useStore } from '@/store/useStore';
import TodaySummary from '@/components/Dashboard/TodaySummary';
import ActionQueue from '@/components/Dashboard/ActionQueue';
import EventTimeline from '@/components/Dashboard/EventTimeline';
import { RiskBadge } from '@/components/Common/Badge';
import { StatCardSkeleton } from '@/components/Common/Skeleton';
import EmptyState from '@/components/Common/EmptyState';
import { filterTodayCalls, callsToEvents, elderlyToActionItems, callToActionItem } from '@/utils/eventMapper';
import { ActionNeededItem, Event } from '@/types/events';
import { isToday, parseISO } from 'date-fns';

export default function DashboardPage() {
  const { elderlyList, fetchList: fetchElderlyList, elderlyLoading } = useElderly();
  const { callsList, fetchList: fetchCallsList, callsLoading } = useCalls();
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([fetchElderlyList(), fetchCallsList()]);
    } catch {
      // Errors are handled in the hooks
    } finally {
      setDataLoaded(true);
    }
  }, [fetchElderlyList, fetchCallsList]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 오늘의 상담 통계
  const todayStats = useMemo(() => {
    const todayCalls = filterTodayCalls(callsList);
    return {
      scheduled: todayCalls.scheduled.length,
      inProgress: todayCalls.in_progress.length,
      completed: todayCalls.completed.length,
      missed: todayCalls.missed.length,
    };
  }, [callsList]);

  // 어르신 통계
  const elderlyStats = useMemo(() => ({
    total: elderlyList.length,
    highRisk: elderlyList.filter((e) => e.risk_level === 'high').length,
    noDevice: elderlyList.filter((e) => !e.device).length,
  }), [elderlyList]);

  // 조치 필요 항목 생성
  const actionItems = useMemo(() => {
    const items: ActionNeededItem[] = [];

    // 어르신별 조치 항목
    elderlyList.forEach((elderly) => {
      items.push(...elderlyToActionItems(elderly));
    });

    // 미응답/실패 통화 조치 항목
    callsList
      .filter((call) => call.status === 'missed' || call.status === 'failed')
      .slice(0, 10) // 최대 10개
      .forEach((call) => {
        const elderly = elderlyList.find((e) => e.id === call.elderly_id);
        const item = callToActionItem(call, elderly?.name);
        if (item) items.push(item);
      });

    return items;
  }, [elderlyList, callsList]);

  // 최근 이벤트 목록
  const recentEvents = useMemo(() => {
    const elderlyMap = new Map(elderlyList.map((e) => [e.id, e.name]));
    const events = callsToEvents(callsList, elderlyMap);
    // 시간순 정렬 (최신 먼저)
    return events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 20);
  }, [callsList, elderlyList]);

  // 고위험 어르신
  const highRiskElderly = useMemo(
    () => elderlyList.filter((e) => e.risk_level === 'high'),
    [elderlyList]
  );

  const isLoading = !dataLoaded && (elderlyLoading || callsLoading);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">오류 발생</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setDataLoaded(false);
              loadData();
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </div>
      </div>

      {/* 오늘의 상담 요약 */}
      <TodaySummary
        scheduled={todayStats.scheduled}
        inProgress={todayStats.inProgress}
        completed={todayStats.completed}
        missed={todayStats.missed}
        loading={isLoading}
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Link
              href="/elderly"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">등록된 어르신</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {elderlyStats.total}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {elderlyStats.noDevice > 0 && (
                  <span className="text-orange-600">디바이스 미등록 {elderlyStats.noDevice}명</span>
                )}
              </p>
            </Link>

            <Link
              href="/calls"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">총 상담 수</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {callsList.length}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                오늘 {todayStats.completed + todayStats.inProgress}건 진행
              </p>
            </Link>

            <Link
              href="/elderly?risk_level=high"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">고위험 어르신</h3>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {elderlyStats.highRisk}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                주의 깊은 관찰이 필요합니다
              </p>
            </Link>
          </>
        )}
      </div>

      {/* 조치 필요 + 이벤트 타임라인 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionQueue items={actionItems} loading={isLoading} maxItems={5} />
        <EventTimeline events={recentEvents} loading={isLoading} maxItems={10} />
      </div>

      {/* 고위험 어르신 */}
      {!isLoading && highRiskElderly.length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-red-800">
              주의가 필요한 어르신
            </h2>
            <Link
              href="/elderly?risk_level=high"
              className="text-sm text-red-600 hover:text-red-700"
            >
              전체 보기
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {highRiskElderly.slice(0, 6).map((elderly) => (
              <Link
                key={elderly.id}
                href={`/elderly/${elderly.id}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-red-100 transition-colors border border-red-100"
              >
                <div className="min-w-0">
                  <span className="font-medium text-red-900 truncate block">
                    {elderly.name}
                  </span>
                  {elderly.age && (
                    <span className="text-sm text-red-700">{elderly.age}세</span>
                  )}
                </div>
                <RiskBadge level="high" size="sm" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
