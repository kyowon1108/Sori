'use client';

import Link from 'next/link';
import { Elderly } from '@/types/elderly';
import clsx from 'clsx';

interface ElderlyCardProps {
  elderly: Elderly;
}

const riskLevelColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const riskLevelLabels: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};

export default function ElderlyCard({ elderly }: ElderlyCardProps) {
  return (
    <Link
      href={`/elderly/${elderly.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{elderly.name}</h3>
          {elderly.age && (
            <p className="text-sm text-gray-500">{elderly.age}세</p>
          )}
        </div>
        <span
          className={clsx(
            'px-2 py-1 text-xs font-medium rounded-full',
            riskLevelColors[elderly.risk_level] || 'bg-gray-100 text-gray-800'
          )}
        >
          {riskLevelLabels[elderly.risk_level] || elderly.risk_level}
        </span>
      </div>

      {elderly.phone && (
        <p className="mt-2 text-sm text-gray-600">{elderly.phone}</p>
      )}

      {elderly.call_schedule.enabled && (
        <div className="mt-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-gray-500">
            {elderly.call_schedule.times.join(', ')}
          </span>
        </div>
      )}

      {elderly.health_condition && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
          {elderly.health_condition}
        </p>
      )}
    </Link>
  );
}
