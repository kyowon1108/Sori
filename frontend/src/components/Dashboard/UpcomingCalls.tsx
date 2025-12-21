'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Elderly } from '@/types/elderly';
import { formatScheduleTime } from '@/utils/dateUtils';
import { format, addDays, setHours, setMinutes, differenceInMinutes, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface UpcomingCallsProps {
  elderlyList: Elderly[];
  loading?: boolean;
  maxItems?: number;
}

interface UpcomingCall {
  elderlyId: number;
  elderlyName: string;
  scheduledTime: Date;
  timeString: string;
}

export default function UpcomingCalls({ elderlyList, loading = false, maxItems = 3 }: UpcomingCallsProps) {
  // Calculate upcoming calls from elderly schedules
  const upcomingCalls = useMemo(() => {
    const now = new Date();
    const calls: UpcomingCall[] = [];

    elderlyList.forEach((elderly) => {
      if (!elderly.call_schedule.enabled || elderly.call_schedule.times.length === 0) {
        return;
      }

      // Check each scheduled time
      elderly.call_schedule.times.forEach((timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);

        // Try today first
        let scheduledTime = setMinutes(setHours(new Date(), hours), minutes);
        scheduledTime.setSeconds(0, 0);

        // If time has passed today, use tomorrow
        if (scheduledTime <= now) {
          scheduledTime = addDays(scheduledTime, 1);
        }

        calls.push({
          elderlyId: elderly.id,
          elderlyName: elderly.name,
          scheduledTime,
          timeString: timeStr,
        });
      });
    });

    // Sort by scheduled time and take top N
    return calls
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
      .slice(0, maxItems);
  }, [elderlyList, maxItems]);

  // Format relative time for upcoming call
  const formatRelativeUpcoming = (scheduledTime: Date): string => {
    const now = new Date();
    const diffMins = differenceInMinutes(scheduledTime, now);

    if (diffMins < 1) {
      return '곧';
    } else if (diffMins < 60) {
      return `${diffMins}분 후`;
    } else if (diffMins < 1440 && isToday(scheduledTime)) {
      const hours = Math.floor(diffMins / 60);
      return `${hours}시간 후`;
    } else {
      return format(scheduledTime, 'M월 d일', { locale: ko });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">다음 자동 통화</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (upcomingCalls.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">다음 자동 통화</h3>
        <div className="text-center py-4">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">예정된 자동 통화가 없습니다</p>
          <Link
            href="/elderly"
            className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            어르신 스케줄 설정하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">다음 자동 통화</h3>
        <Link href="/calls?status=scheduled" className="text-xs text-blue-600 hover:text-blue-700">
          전체 보기
        </Link>
      </div>
      <div className="space-y-3">
        {upcomingCalls.map((call, index) => {
          const isImminent = differenceInMinutes(call.scheduledTime, new Date()) <= 30;

          return (
            <Link
              key={`${call.elderlyId}-${call.timeString}-${index}`}
              href={`/elderly/${call.elderlyId}?tab=schedule`}
              className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isImminent ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {call.elderlyName}
                </p>
                <p className="text-xs text-gray-500">
                  {formatScheduleTime(call.timeString)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs font-medium ${
                  isImminent ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {formatRelativeUpcoming(call.scheduledTime)}
                </span>
                {isImminent && (
                  <span className="flex h-2 w-2 ml-auto mt-1">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
