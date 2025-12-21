'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { formatScheduleTime } from '@/utils/dateUtils';
import { Elderly } from '@/types/elderly';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useMemo } from 'react';

interface ScheduleTabProps {
  elderly: Elderly;
}

export default function ScheduleTab({ elderly }: ScheduleTabProps) {
  const schedule = elderly.call_schedule;

  // 다음 7일 미리보기
  const next7Days = useMemo(() => {
    if (!schedule.enabled) return [];

    const preview: { date: Date; times: string[] }[] = [];
    const today = startOfDay(new Date());

    for (let i = 0; i < 7; i++) {
      preview.push({
        date: addDays(today, i),
        times: schedule.times,
      });
    }
    return preview;
  }, [schedule]);

  return (
    <div className="p-6 space-y-6">
      {/* 현재 스케줄 상태 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center',
              schedule.enabled ? 'bg-green-100' : 'bg-gray-100'
            )}
          >
            <svg
              className={clsx(
                'w-5 h-5',
                schedule.enabled ? 'text-green-600' : 'text-gray-400'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              자동 통화{' '}
              <span className={schedule.enabled ? 'text-green-600' : 'text-gray-500'}>
                {schedule.enabled ? '활성화됨' : '비활성화됨'}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              {schedule.enabled
                ? `매일 ${schedule.times.map(formatScheduleTime).join(', ')}에 자동으로 통화가 시작됩니다`
                : '스케줄이 설정되지 않았습니다. 활성화하면 정해진 시간에 자동으로 어르신께 전화가 갑니다.'}
            </p>
          </div>
        </div>
        <Link
          href={`/elderly/${elderly.id}/edit`}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          스케줄 변경
        </Link>
      </div>

      {/* 스케줄 시간 목록 */}
      {schedule.enabled && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">일일 통화 시간</h4>
          <div className="flex flex-wrap gap-2">
            {schedule.times.map((time, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">{formatScheduleTime(time)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-500">
            총 {schedule.times.length}회의 통화가 매일 진행됩니다
          </p>
        </div>
      )}

      {/* 다음 7일 미리보기 */}
      {schedule.enabled && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">다음 7일 예정된 통화</h4>
          <div className="grid grid-cols-7 gap-2">
            {next7Days.map((day, i) => {
              const isToday = isSameDay(day.date, new Date());
              return (
                <div
                  key={i}
                  className={clsx(
                    'p-3 rounded-lg text-center transition-colors',
                    isToday
                      ? 'bg-blue-50 border-2 border-blue-200 ring-2 ring-blue-100'
                      : 'bg-gray-50 border border-gray-100'
                  )}
                >
                  <p
                    className={clsx(
                      'text-xs font-medium',
                      isToday ? 'text-blue-600' : 'text-gray-500'
                    )}
                  >
                    {format(day.date, 'EEE', { locale: ko })}
                  </p>
                  <p
                    className={clsx(
                      'text-lg font-bold',
                      isToday ? 'text-blue-700' : 'text-gray-700'
                    )}
                  >
                    {format(day.date, 'd')}
                  </p>
                  <div className="mt-2 space-y-1">
                    {day.times.map((time, j) => (
                      <span
                        key={j}
                        className={clsx(
                          'block text-xs px-1 py-0.5 rounded truncate',
                          isToday
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-200 text-gray-600'
                        )}
                        title={formatScheduleTime(time)}
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-gray-500">
            다음 7일간 총 {next7Days.length * schedule.times.length}건의 통화가 예정되어 있습니다
          </p>
        </div>
      )}

      {/* 스케줄 비활성화 시 안내 */}
      {!schedule.enabled && (
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-orange-800">자동 통화가 비활성화되어 있습니다</h4>
              <p className="text-sm text-orange-700 mt-1">
                자동 통화를 활성화하면 정해진 시간에 SORI가 자동으로 어르신께 전화를 걸어 안부를 확인합니다.
              </p>
              <Link
                href={`/elderly/${elderly.id}/edit`}
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                스케줄 설정하기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
