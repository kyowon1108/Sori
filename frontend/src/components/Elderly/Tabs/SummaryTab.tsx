'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/Common/Badge';
import { formatRelativeTime } from '@/utils/dateUtils';
import { formatScheduleTime } from '@/utils/eventMapper';
import { Elderly } from '@/types/elderly';
import { Call, getRiskLevel } from '@/types/calls';

interface SummaryTabProps {
  elderly: Elderly;
  recentCalls: Call[];
  connectedDevice: {
    id: number;
    platform: string;
    device_name: string | null;
    last_used_at: string | null;
  } | null;
}

export default function SummaryTab({ elderly, recentCalls, connectedDevice }: SummaryTabProps) {
  const lastCall = recentCalls[0];
  const completedCalls = recentCalls.filter(c => c.status === 'completed');
  const highRiskCalls = recentCalls.filter(c => c.analysis && getRiskLevel(c.analysis.risk_score) === 'high');

  return (
    <div className="p-6 space-y-6">
      {/* 핵심 정보 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 마지막 통화 */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            마지막 통화
          </div>
          {lastCall ? (
            <>
              <p className="text-lg font-semibold text-gray-900">
                {formatRelativeTime(lastCall.started_at || lastCall.created_at)}
              </p>
              <div className="mt-1">
                <StatusBadge status={lastCall.status} size="sm" />
              </div>
            </>
          ) : (
            <p className="text-gray-400">통화 기록 없음</p>
          )}
        </div>

        {/* 통화 통계 */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            통화 통계
          </div>
          <p className="text-lg font-semibold text-gray-900">
            완료 {completedCalls.length}건
          </p>
          <p className="text-sm text-gray-500">
            전체 {recentCalls.length}건 중
          </p>
        </div>

        {/* 디바이스 상태 */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            디바이스
          </div>
          {connectedDevice ? (
            <>
              <p className="text-lg font-semibold text-green-700">연결됨</p>
              <p className="text-sm text-gray-500">
                {connectedDevice.device_name || connectedDevice.platform}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-orange-600">미연결</p>
              <p className="text-sm text-gray-500">기기 연결이 필요합니다</p>
            </>
          )}
        </div>
      </div>

      {/* 건강 정보 */}
      {elderly.health_condition && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">건강 상태 메모</h4>
          <p className="text-gray-900">{elderly.health_condition}</p>
        </div>
      )}

      {/* 복용 약물 */}
      {elderly.medications && elderly.medications.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">복용 약물</h4>
          <div className="flex flex-wrap gap-2">
            {elderly.medications.map((med, i) => (
              <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-md">
                {med.name}{med.dosage ? ` (${med.dosage})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 주의가 필요한 경우 */}
      {highRiskCalls.length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-red-800">주의가 필요합니다</h4>
              <p className="text-sm text-red-700 mt-1">
                최근 통화에서 {highRiskCalls.length}건의 고위험 상황이 감지되었습니다.
                통화 내역을 확인해주세요.
              </p>
              <Link
                href={`/calls/${highRiskCalls[0].id}`}
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                최근 고위험 통화 확인
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 자동 통화 스케줄 안내 */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">자동 통화 스케줄</h4>
            {elderly.call_schedule.enabled ? (
              <>
                <p className="text-sm text-blue-700 mb-2">
                  매일 다음 시간에 자동으로 AI 통화가 진행됩니다 (KST):
                </p>
                <div className="flex flex-wrap gap-2">
                  {elderly.call_schedule.times.map((time, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-md font-medium"
                    >
                      {formatScheduleTime(time)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-blue-700">
                자동 통화가 비활성화되어 있습니다. 스케줄을 설정하면 자동으로 통화가 진행됩니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
        <Link
          href={`/elderly/${elderly.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          스케줄 관리
        </Link>
        <Link
          href={`/elderly/${elderly.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          정보 수정
        </Link>
      </div>
    </div>
  );
}
