'use client';

import Link from 'next/link';
import { Elderly } from '@/types/elderly';
import { RiskBadge } from '@/components/Common/Badge';
import { formatScheduleTime } from '@/utils/eventMapper';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';

interface ElderlyCardProps {
  elderly: Elderly;
}

export default function ElderlyCard({ elderly }: ElderlyCardProps) {
  // 다음 상담 시간 포맷
  const getNextCallText = () => {
    if (!elderly.next_scheduled_call) {
      if (elderly.call_schedule.enabled && elderly.call_schedule.times.length > 0) {
        const nextTime = elderly.call_schedule.times[0];
        return `다음 상담: 오늘 ${formatScheduleTime(nextTime)}`;
      }
      return null;
    }

    const nextCall = parseISO(elderly.next_scheduled_call);
    if (isToday(nextCall)) {
      return `오늘 ${format(nextCall, 'HH:mm', { locale: ko })}`;
    } else if (isTomorrow(nextCall)) {
      return `내일 ${format(nextCall, 'HH:mm', { locale: ko })}`;
    }
    return format(nextCall, 'M/d HH:mm', { locale: ko });
  };

  const nextCallText = getNextCallText();
  const hasDevice = !!elderly.device;
  const hasMissedCalls = elderly.missed_calls_count && elderly.missed_calls_count > 0;

  return (
    <Link
      href={`/elderly/${elderly.id}`}
      className={clsx(
        'block bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-all',
        elderly.risk_level === 'high'
          ? 'border-red-200 hover:border-red-300'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      {/* 헤더: 이름 + 위험도 */}
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{elderly.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {elderly.age && <span>{elderly.age}세</span>}
            {elderly.phone && (
              <>
                {elderly.age && <span className="text-gray-300">|</span>}
                <span>{elderly.phone}</span>
              </>
            )}
          </div>
        </div>
        <RiskBadge level={elderly.risk_level} />
      </div>

      {/* 상태 표시 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* 디바이스 상태 */}
        <span
          className={clsx(
            'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full',
            hasDevice
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-500'
          )}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {hasDevice ? '디바이스 연결됨' : '디바이스 없음'}
        </span>

        {/* 미응답 통화 */}
        {hasMissedCalls && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-orange-50 text-orange-700">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            미응답 {elderly.missed_calls_count}건
          </span>
        )}
      </div>

      {/* 다음 상담 / 스케줄 */}
      <div className="border-t border-gray-100 pt-3">
        {elderly.call_schedule.enabled ? (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-600">
              {nextCallText ? (
                <>다음 상담: <span className="font-medium text-gray-900">{nextCallText}</span></>
              ) : (
                <>매일 {elderly.call_schedule.times.map(formatScheduleTime).join(', ')}</>
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span>자동 상담 비활성</span>
          </div>
        )}
      </div>

      {/* 건강 상태 요약 */}
      {elderly.health_condition && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-1">
          {elderly.health_condition}
        </p>
      )}
    </Link>
  );
}
