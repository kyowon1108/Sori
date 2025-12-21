'use client';

import { useEffect } from 'react';
import { useElderly } from '@/hooks/useElderly';
import { useCalls } from '@/hooks/useCalls';
import Link from 'next/link';

export default function DashboardPage() {
  const { elderlyList, fetchList: fetchElderlyList, elderlyLoading } = useElderly();
  const { callsList, fetchList: fetchCallsList, callsLoading } = useCalls();

  useEffect(() => {
    fetchElderlyList();
    fetchCallsList();
  }, [fetchElderlyList, fetchCallsList]);

  const recentCalls = callsList.slice(0, 5);
  const highRiskElderly = elderlyList.filter((e) => e.risk_level === 'high');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">등록된 어르신</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {elderlyLoading ? '-' : elderlyList.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">총 통화 수</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {callsLoading ? '-' : callsList.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">위험 수준 높음</h3>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {elderlyLoading ? '-' : highRiskElderly.length}
          </p>
        </div>
      </div>

      {/* 최근 통화 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">최근 통화</h2>
        </div>
        {recentCalls.length === 0 ? (
          <p className="text-gray-500">최근 통화 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {recentCalls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">통화 #{call.id}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(call.started_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  상태: {call.status} | 유형: {call.call_type}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 위험 수준 높은 어르신 */}
      {highRiskElderly.length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-4">
            주의가 필요한 어르신
          </h2>
          <div className="space-y-3">
            {highRiskElderly.map((elderly) => (
              <Link
                key={elderly.id}
                href={`/elderly/${elderly.id}`}
                className="block p-3 bg-white rounded-lg hover:bg-red-100 transition-colors"
              >
                <span className="font-medium text-red-900">{elderly.name}</span>
                {elderly.age && (
                  <span className="text-sm text-red-700 ml-2">{elderly.age}세</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
