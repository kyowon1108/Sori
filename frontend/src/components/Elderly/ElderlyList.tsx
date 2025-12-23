'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useElderly } from '@/hooks/useElderly';
import ElderlyCard from './ElderlyCard';
import { CardSkeleton } from '@/components/Common/Skeleton';
import EmptyState from '@/components/Common/EmptyState';
import { EMPTY_STATES, RISK_LEVELS } from '@/utils/constants';
import { RiskLevel } from '@/types/elderly';
import Link from 'next/link';
import clsx from 'clsx';

type FilterRisk = RiskLevel | 'all';
type FilterDevice = 'all' | 'with' | 'without';
type FilterMissed = 'all' | 'with';

export default function ElderlyList() {
  const searchParams = useSearchParams();
  const { elderlyList, elderlyLoading, fetchList } = useElderly();
  const [dataLoaded, setDataLoaded] = useState(false);

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<FilterRisk>(
    (searchParams.get('risk_level') as FilterRisk) || 'all'
  );
  const [filterDevice, setFilterDevice] = useState<FilterDevice>('all');
  const [filterMissed, setFilterMissed] = useState<FilterMissed>('all');

  useEffect(() => {
    fetchList().finally(() => setDataLoaded(true));
  }, [fetchList]);

  // 필터링된 목록
  const filteredList = useMemo(() => {
    let filtered = elderlyList;

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.phone?.includes(query) ||
          e.address?.toLowerCase().includes(query)
      );
    }

    // 위험도 필터
    if (filterRisk !== 'all') {
      filtered = filtered.filter((e) => e.risk_level === filterRisk);
    }

    // 디바이스 필터
    if (filterDevice === 'with') {
      filtered = filtered.filter((e) => !!e.device);
    } else if (filterDevice === 'without') {
      filtered = filtered.filter((e) => !e.device);
    }

    // 미응답 필터
    if (filterMissed === 'with') {
      filtered = filtered.filter((e) => e.missed_calls_count && e.missed_calls_count > 0);
    }

    return filtered;
  }, [elderlyList, searchQuery, filterRisk, filterDevice, filterMissed]);

  // 통계
  const stats = useMemo(() => ({
    total: elderlyList.length,
    highRisk: elderlyList.filter((e) => e.risk_level === 'high').length,
    noDevice: elderlyList.filter((e) => !e.device).length,
    hasMissed: elderlyList.filter((e) => e.missed_calls_count && e.missed_calls_count > 0).length,
  }), [elderlyList]);

  const isLoading = !dataLoaded && elderlyLoading;

  // 활성 필터 개수
  const activeFilterCount = [
    filterRisk !== 'all',
    filterDevice !== 'all',
    filterMissed !== 'all',
    searchQuery.trim() !== '',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterRisk('all');
    setFilterDevice('all');
    setFilterMissed('all');
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">어르신 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            총 {elderlyList.length}명 등록
            {stats.highRisk > 0 && (
              <span className="text-red-600 ml-2">
                (고위험 {stats.highRisk}명)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/elderly/add"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          어르신 추가
        </Link>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        {/* 검색 */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="이름, 전화번호, 주소로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              필터 초기화 ({activeFilterCount})
            </button>
          )}
        </div>

        {/* 필터 버튼 */}
        <div className="flex flex-wrap gap-4">
          {/* 위험도 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">위험도:</span>
            <div className="flex gap-1">
              {(['all', 'low', 'medium', 'high'] as const).map((risk) => (
                <button
                  key={risk}
                  onClick={() => setFilterRisk(risk)}
                  className={clsx(
                    'px-3 py-1 text-sm rounded-full transition-colors',
                    filterRisk === risk
                      ? risk === 'high'
                        ? 'bg-red-100 text-red-700'
                        : risk === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : risk === 'low'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {risk === 'all' ? '전체' : RISK_LEVELS[risk]}
                </button>
              ))}
            </div>
          </div>

          {/* 디바이스 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">디바이스:</span>
            <div className="flex gap-1">
              {(['all', 'with', 'without'] as const).map((device) => (
                <button
                  key={device}
                  onClick={() => setFilterDevice(device)}
                  className={clsx(
                    'px-3 py-1 text-sm rounded-full transition-colors',
                    filterDevice === device
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {device === 'all' ? '전체' : device === 'with' ? '있음' : '없음'}
                  {device === 'without' && stats.noDevice > 0 && (
                    <span className="ml-1 text-xs">({stats.noDevice})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 미응답 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">미응답:</span>
            <div className="flex gap-1">
              {(['all', 'with'] as const).map((missed) => (
                <button
                  key={missed}
                  onClick={() => setFilterMissed(missed)}
                  className={clsx(
                    'px-3 py-1 text-sm rounded-full transition-colors',
                    filterMissed === missed
                      ? missed === 'with'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {missed === 'all' ? '전체' : '있음'}
                  {missed === 'with' && stats.hasMissed > 0 && (
                    <span className="ml-1 text-xs">({stats.hasMissed})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          title={elderlyList.length === 0 ? EMPTY_STATES.elderly.title : '검색 결과가 없습니다'}
          description={
            elderlyList.length === 0
              ? EMPTY_STATES.elderly.description
              : '다른 검색어나 필터를 시도해보세요.'
          }
          action={
            elderlyList.length === 0
              ? { label: '어르신 추가', href: '/elderly/add' }
              : activeFilterCount > 0
              ? { label: '필터 초기화', onClick: clearFilters }
              : undefined
          }
          icon={
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((elderly) => (
            <ElderlyCard key={elderly.id} elderly={elderly} />
          ))}
        </div>
      )}
    </div>
  );
}
