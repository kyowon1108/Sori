'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { Call } from '@/types/calls';
import { CALL_STATUS } from '@/utils/constants';

interface TodaySummaryProps {
  scheduled: number;
  inProgress: number;
  completed: number;
  missed: number;
  loading?: boolean;
}

export default function TodaySummary({
  scheduled,
  inProgress,
  completed,
  missed,
  loading = false,
}: TodaySummaryProps) {
  const stats = [
    {
      label: '예정됨',
      value: scheduled,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      href: '/calls?status=scheduled',
    },
    {
      label: '진행 중',
      value: inProgress,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      href: '/calls?status=in_progress',
      pulse: inProgress > 0,
    },
    {
      label: '완료',
      value: completed,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      href: '/calls?status=completed',
    },
    {
      label: '미응답',
      value: missed,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      href: '/calls?status=missed',
      highlight: missed > 0,
    },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">오늘의 상담</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse p-4 rounded-lg bg-gray-100">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">오늘의 상담</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={clsx(
              'relative p-4 rounded-lg border transition-all hover:shadow-md',
              stat.bgColor,
              stat.borderColor,
              stat.highlight && 'ring-2 ring-orange-400 ring-offset-2'
            )}
          >
            {stat.pulse && (
              <span className="absolute top-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            )}
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className={clsx('mt-1 text-3xl font-bold', stat.color)}>
              {stat.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
