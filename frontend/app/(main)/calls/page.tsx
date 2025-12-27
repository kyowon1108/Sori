'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCalls } from '@/hooks/useCalls';
import { useElderly } from '@/hooks/useElderly';
import { StatusBadge, RiskBadge } from '@/components/Common/Badge';
import { TableSkeleton } from '@/components/Common/Skeleton';
import EmptyState from '@/components/Common/EmptyState';
import { CALL_STATUS, TRIGGER_TYPES, EMPTY_STATES } from '@/utils/constants';
import { formatRelativeTime } from '@/utils/eventMapper';
import { Call, CallStatus, getRiskLevel } from '@/types/calls';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';

type FilterStatus = CallStatus | 'all';

export default function CallsListPage() {
  const searchParams = useSearchParams();
  const { callsList, fetchList, callsLoading } = useCalls();
  const { elderlyList, fetchList: fetchElderlyList } = useElderly();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(
    (searchParams.get('status') as FilterStatus) || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchList(), fetchElderlyList()]).finally(() => {
      setDataLoaded(true);
    });
  }, [fetchList, fetchElderlyList]);

  // 어르신 ID → 이름 맵
  const elderlyMap = useMemo(
    () => new Map(elderlyList.map((e) => [e.id, e])),
    [elderlyList]
  );

  // 필터링된 통화 목록
  const filteredCalls = useMemo(() => {
    let filtered = callsList;

    // 상태 필터
    if (filterStatus !== 'all') {
      filtered = filtered.filter((call) => call.status === filterStatus);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((call) => {
        const elderly = elderlyMap.get(call.elderly_id);
        return (
          elderly?.name.toLowerCase().includes(query) ||
          call.id.toString().includes(query)
        );
      });
    }

    // 최신순 정렬
    return [...filtered].sort((a, b) => {
      const dateA = a.scheduled_for || a.started_at || a.created_at;
      const dateB = b.scheduled_for || b.started_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [callsList, filterStatus, searchQuery, elderlyMap]);

  const statusFilters: { value: FilterStatus; label: string; count: number }[] = [
    { value: 'all', label: '전체', count: callsList.length },
    { value: 'scheduled', label: '예정됨', count: callsList.filter((c) => c.status === 'scheduled').length },
    { value: 'in_progress', label: '진행 중', count: callsList.filter((c) => c.status === 'in_progress').length },
    { value: 'completed', label: '완료', count: callsList.filter((c) => c.status === 'completed').length },
    { value: 'missed', label: '미응답', count: callsList.filter((c) => c.status === 'missed').length },
    { value: 'failed', label: '실패', count: callsList.filter((c) => c.status === 'failed').length },
  ];

  const isLoading = !dataLoaded && callsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">통화 내역</h1>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 상태 필터 */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                  filterStatus === filter.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {filter.label}
                <span className="ml-1 text-xs">({filter.count})</span>
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div className="flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="어르신 이름 또는 통화 ID 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 통화 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : filteredCalls.length === 0 ? (
          <EmptyState
            title={EMPTY_STATES.calls.title}
            description={filterStatus !== 'all' ? '선택한 필터에 해당하는 통화가 없습니다.' : EMPTY_STATES.calls.description}
            className="py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    어르신
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    예정/시작 시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    분석 결과
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상세
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCalls.map((call) => {
                  const elderly = elderlyMap.get(call.elderly_id);
                  const callTime = call.scheduled_for || call.started_at || call.created_at;

                  return (
                    <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {elderly?.name || `어르신 #${call.elderly_id}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {call.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={call.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {TRIGGER_TYPES[call.trigger_type] || call.trigger_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(parseISO(callTime), 'M월 d일 HH:mm', { locale: ko })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatRelativeTime(callTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {call.analysis ? (
                          <div className="flex items-center gap-2">
                            <RiskBadge level={getRiskLevel(call.analysis.risk_score)} size="sm" />
                            {call.analysis.summary && (
                              <span className="text-sm text-gray-500 truncate max-w-[200px]">
                                {call.analysis.summary}
                              </span>
                            )}
                          </div>
                        ) : call.status === 'completed' ? (
                          <span className="text-sm text-gray-400">분석 대기중</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/calls/${call.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          보기
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
