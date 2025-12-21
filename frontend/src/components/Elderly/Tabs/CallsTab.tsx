'use client';

import Link from 'next/link';
import { StatusBadge, RiskBadge } from '@/components/Common/Badge';
import EmptyState from '@/components/Common/EmptyState';
import { ListItemSkeleton } from '@/components/Common/Skeleton';
import { formatRelativeTime, formatDuration, formatLocalDateTime } from '@/utils/dateUtils';
import { Call } from '@/types/calls';

interface CallsTabProps {
  calls: Call[];
  loading?: boolean;
  onStartCall: () => void;
}

export default function CallsTab({ calls, loading, onStartCall }: CallsTabProps) {
  if (loading) {
    return (
      <div className="divide-y divide-gray-200">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4">
            <ListItemSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="상담 내역이 없습니다"
          description="아직 진행된 상담이 없습니다. 첫 상담을 시작해보세요."
          icon={
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
          action={{
            label: '첫 상담 시작하기',
            onClick: onStartCall,
          }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {/* 헤더 */}
      <div className="hidden md:grid md:grid-cols-5 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <span>상태</span>
        <span>일시</span>
        <span>통화 시간</span>
        <span>위험도</span>
        <span></span>
      </div>

      {/* 상담 목록 */}
      {calls.map((call) => (
        <Link
          key={call.id}
          href={`/calls/${call.id}`}
          className="flex flex-col md:grid md:grid-cols-5 gap-2 md:gap-4 p-4 hover:bg-gray-50 transition-colors"
        >
          {/* 상태 */}
          <div className="flex items-center gap-3">
            <StatusBadge status={call.status} />
            <span className="md:hidden text-sm text-gray-500">
              #{call.id}
            </span>
          </div>

          {/* 일시 */}
          <div className="text-sm">
            <span className="md:hidden text-gray-500 mr-2">일시:</span>
            <span className="text-gray-900">
              {formatLocalDateTime(call.scheduled_for || call.started_at || call.created_at)}
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              {formatRelativeTime(call.started_at || call.created_at)}
            </span>
          </div>

          {/* 통화 시간 */}
          <div className="text-sm">
            <span className="md:hidden text-gray-500 mr-2">통화 시간:</span>
            <span className="text-gray-900">{formatDuration(call.duration)}</span>
          </div>

          {/* 위험도 */}
          <div className="flex items-center">
            <span className="md:hidden text-gray-500 mr-2">분석:</span>
            {call.analysis ? (
              <RiskBadge level={call.analysis.risk_level} size="sm" />
            ) : (
              <span className="text-xs text-gray-400">분석 없음</span>
            )}
          </div>

          {/* 화살표 */}
          <div className="hidden md:flex items-center justify-end">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      ))}

      {/* 상담 시작 버튼 */}
      <div className="p-4 bg-gray-50">
        <button
          onClick={onStartCall}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 상담 시작
        </button>
      </div>
    </div>
  );
}
