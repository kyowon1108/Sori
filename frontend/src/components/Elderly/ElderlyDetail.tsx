'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useElderly } from '@/hooks/useElderly';
import { useCalls } from '@/hooks/useCalls';
import { useStore } from '@/store/useStore';
import { RiskBadge, StatusBadge } from '@/components/Common/Badge';
import { ListItemSkeleton } from '@/components/Common/Skeleton';
import EmptyState from '@/components/Common/EmptyState';
import { callsToEvents, formatScheduleTime, formatRelativeTime } from '@/utils/eventMapper';
import { EVENT_SEVERITY_COLORS, CALL_STATUS } from '@/utils/constants';
import { Event } from '@/types/events';
import { format, parseISO, addDays, startOfDay, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';

interface ElderlyDetailProps {
  elderlyId: number;
}

type TabType = 'timeline' | 'schedule' | 'calls' | 'insights';

export default function ElderlyDetail({ elderlyId }: ElderlyDetailProps) {
  const router = useRouter();
  const { currentElderly, elderlyLoading, fetchById, delete: deleteElderly } = useElderly();
  const { callsList, startCall, fetchList: fetchCalls, callsLoading } = useCalls();
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchById(elderlyId),
      fetchCalls(elderlyId),
    ]).finally(() => setDataLoaded(true));
  }, [elderlyId, fetchById, fetchCalls]);

  // 이 어르신의 통화만 필터
  const elderlyCalls = useMemo(
    () => callsList.filter((c) => c.elderly_id === elderlyId),
    [callsList, elderlyId]
  );

  // 이벤트 목록
  const events = useMemo(() => {
    if (!currentElderly) return [];
    const elderlyMap = new Map([[elderlyId, currentElderly.name]]);
    return callsToEvents(elderlyCalls, elderlyMap).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [elderlyCalls, currentElderly, elderlyId]);

  // 다음 7일 미리보기
  const next7DaysPreview = useMemo(() => {
    if (!currentElderly?.call_schedule.enabled) return [];
    const times = currentElderly.call_schedule.times;
    const preview: { date: Date; times: string[] }[] = [];
    const today = startOfDay(new Date());

    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      preview.push({ date, times });
    }
    return preview;
  }, [currentElderly]);

  // 분석 결과 집계
  const insights = useMemo(() => {
    const completedWithAnalysis = elderlyCalls.filter((c) => c.analysis);
    if (completedWithAnalysis.length === 0) return null;

    const riskCounts = { low: 0, medium: 0, high: 0 };
    let totalSentiment = 0;
    const allRecommendations: string[] = [];

    completedWithAnalysis.forEach((c) => {
      if (c.analysis) {
        riskCounts[c.analysis.risk_level]++;
        totalSentiment += c.analysis.sentiment_score;
        if (c.analysis.recommendations) {
          allRecommendations.push(...c.analysis.recommendations);
        }
      }
    });

    return {
      totalCalls: completedWithAnalysis.length,
      riskCounts,
      avgSentiment: totalSentiment / completedWithAnalysis.length,
      topRecommendations: [...new Set(allRecommendations)].slice(0, 5),
      recentAnalysis: completedWithAnalysis[0]?.analysis,
    };
  }, [elderlyCalls]);

  const handleDelete = async () => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await deleteElderly(elderlyId);
        router.push('/elderly');
      } catch {
        // Error is handled by the hook
      }
    }
  };

  const handleStartCall = async () => {
    try {
      const call = await startCall(elderlyId);
      router.push(`/calls/${call.id}`);
    } catch {
      // Error is handled by the hook
    }
  };

  if (elderlyLoading || !currentElderly) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'timeline', label: '타임라인', count: events.length },
    { id: 'schedule', label: '스케줄' },
    { id: 'calls', label: '상담 내역', count: elderlyCalls.length },
    { id: 'insights', label: '인사이트' },
  ];

  return (
    <div className="space-y-6">
      {/* 상단 프로필 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* 뒤로가기 */}
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{currentElderly.name}</h1>
                <RiskBadge level={currentElderly.risk_level} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {currentElderly.age && <span>{currentElderly.age}세</span>}
                {currentElderly.phone && <span>{currentElderly.phone}</span>}
                {currentElderly.address && <span>{currentElderly.address}</span>}
              </div>

              {/* 디바이스 상태 */}
              <div className="flex items-center gap-2 mt-3">
                {currentElderly.device ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    디바이스 연결됨 ({currentElderly.device.device_type})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                    <span className="w-2 h-2 bg-gray-400 rounded-full" />
                    디바이스 미등록
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleStartCall}
              disabled={callsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {callsLoading ? '연결 중...' : '통화 시작'}
            </button>
            <Link
              href={`/elderly/${elderlyId}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 타임라인 탭 */}
        {activeTab === 'timeline' && (
          <div className="p-6">
            {events.length === 0 ? (
              <EmptyState
                title="이벤트가 없습니다"
                description="아직 기록된 이벤트가 없습니다."
              />
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-4">
                  {events.map((event) => {
                    const colors = EVENT_SEVERITY_COLORS[event.severity];
                    return (
                      <div key={event.id} className="relative flex items-start gap-3 pl-1">
                        <div className={clsx(
                          'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white',
                          colors.bg, colors.icon
                        )}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{event.title}</p>
                              <p className="text-sm text-gray-500">{event.description}</p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatRelativeTime(event.timestamp)}
                            </span>
                          </div>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 스케줄 탭 */}
        {activeTab === 'schedule' && (
          <div className="p-6 space-y-6">
            {/* 현재 스케줄 상태 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  currentElderly.call_schedule.enabled ? 'bg-green-100' : 'bg-gray-100'
                )}>
                  <svg className={clsx(
                    'w-5 h-5',
                    currentElderly.call_schedule.enabled ? 'text-green-600' : 'text-gray-400'
                  )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    자동 상담 {currentElderly.call_schedule.enabled ? '활성화' : '비활성화'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentElderly.call_schedule.enabled
                      ? `매일 ${currentElderly.call_schedule.times.map(formatScheduleTime).join(', ')}`
                      : '스케줄이 설정되지 않았습니다'}
                  </p>
                </div>
              </div>
              <Link
                href={`/elderly/${elderlyId}/edit`}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                스케줄 수정
              </Link>
            </div>

            {/* 다음 7일 미리보기 */}
            {currentElderly.call_schedule.enabled && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">다음 7일 미리보기</h3>
                <div className="grid grid-cols-7 gap-2">
                  {next7DaysPreview.map((day, i) => {
                    const isToday = isSameDay(day.date, new Date());
                    return (
                      <div
                        key={i}
                        className={clsx(
                          'p-3 rounded-lg text-center',
                          isToday ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                        )}
                      >
                        <p className={clsx(
                          'text-xs font-medium',
                          isToday ? 'text-blue-600' : 'text-gray-500'
                        )}>
                          {format(day.date, 'EEE', { locale: ko })}
                        </p>
                        <p className={clsx(
                          'text-lg font-bold',
                          isToday ? 'text-blue-700' : 'text-gray-700'
                        )}>
                          {format(day.date, 'd')}
                        </p>
                        <div className="mt-2 space-y-1">
                          {day.times.map((time, j) => (
                            <span
                              key={j}
                              className={clsx(
                                'block text-xs px-1 py-0.5 rounded',
                                isToday ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                              )}
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 상담 내역 탭 */}
        {activeTab === 'calls' && (
          <div className="divide-y divide-gray-200">
            {elderlyCalls.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="상담 내역이 없습니다"
                  description="아직 진행된 상담이 없습니다."
                  action={{
                    label: '상담 시작',
                    onClick: handleStartCall,
                  }}
                />
              </div>
            ) : (
              elderlyCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <StatusBadge status={call.status} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        통화 #{call.id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(call.scheduled_for || call.started_at || call.created_at), 'M월 d일 HH:mm', { locale: ko })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {call.analysis && (
                      <RiskBadge level={call.analysis.risk_level} size="sm" />
                    )}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* 인사이트 탭 */}
        {activeTab === 'insights' && (
          <div className="p-6">
            {!insights ? (
              <EmptyState
                title="분석 데이터가 없습니다"
                description="상담 완료 후 분석 결과가 표시됩니다."
              />
            ) : (
              <div className="space-y-6">
                {/* 통계 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500">총 상담</p>
                    <p className="text-2xl font-bold text-gray-900">{insights.totalCalls}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500">평균 감정 점수</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(insights.avgSentiment * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600">낮은 위험도</p>
                    <p className="text-2xl font-bold text-green-700">{insights.riskCounts.low}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-600">높은 위험도</p>
                    <p className="text-2xl font-bold text-red-700">{insights.riskCounts.high}</p>
                  </div>
                </div>

                {/* 권장 사항 */}
                {insights.topRecommendations.length > 0 && (
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">주요 권장 사항</h4>
                    <ul className="space-y-2">
                      {insights.topRecommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-900">
                          <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 최근 분석 */}
                {insights.recentAnalysis && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">최근 분석 요약</h4>
                    <p className="text-gray-900">{insights.recentAnalysis.summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
