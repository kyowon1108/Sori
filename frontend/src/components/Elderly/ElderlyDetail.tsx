'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useElderly } from '@/hooks/useElderly';
import { useCalls } from '@/hooks/useCalls';
import { elderlyService } from '@/services/elderly';
import { RiskBadge } from '@/components/Common/Badge';
import { SummaryTab, ScheduleTab, CallsTab, DevicesTab, NotificationsTab } from './Tabs';

interface ElderlyDetailProps {
  elderlyId: number;
}

type TabType = 'summary' | 'schedule' | 'calls' | 'devices' | 'notifications';

interface PairingDevice {
  id: number;
  platform: string;
  device_name: string | null;
  last_used_at: string | null;
}

const validTabs: TabType[] = ['summary', 'schedule', 'calls', 'devices', 'notifications'];

export default function ElderlyDetail({ elderlyId }: ElderlyDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentElderly, elderlyLoading, fetchById, delete: deleteElderly } = useElderly();
  const { callsList, fetchList: fetchCalls, callsLoading } = useCalls();

  // Parse tab from URL query parameter
  const tabFromUrl = searchParams.get('tab');
  const initialTab = (tabFromUrl && validTabs.includes(tabFromUrl as TabType)) ? tabFromUrl as TabType : 'summary';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<PairingDevice | null>(null);

  // 페어링 상태 조회
  const fetchPairingStatus = useCallback(async () => {
    try {
      const status = await elderlyService.getPairingStatus(elderlyId);
      setConnectedDevice(status.paired_devices?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch pairing status:', error);
    }
  }, [elderlyId]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        fetchById(elderlyId),
        fetchCalls(elderlyId),
        fetchPairingStatus(),
      ]);
    } finally {
      setDataLoaded(true);
    }
  }, [elderlyId, fetchById, fetchCalls, fetchPairingStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 이 어르신의 통화만 필터
  const elderlyCalls = useMemo(
    () => callsList.filter((c) => c.elderly_id === elderlyId),
    [callsList, elderlyId]
  );

  // 삭제 핸들러
  const handleDelete = async () => {
    if (window.confirm(`${currentElderly?.name}님의 정보를 삭제하시겠습니까?\n삭제된 정보는 복구할 수 없습니다.`)) {
      try {
        await deleteElderly(elderlyId);
        router.push('/elderly');
      } catch {
        // Error is handled by the hook
      }
    }
  };

  // 로딩 상태
  if (elderlyLoading || !currentElderly) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          <span className="text-gray-600">정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // 탭 정의
  const tabs: { id: TabType; label: string; count?: number; icon: React.ReactNode }[] = [
    {
      id: 'summary',
      label: '요약',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'schedule',
      label: '스케줄',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'calls',
      label: '통화 내역',
      count: elderlyCalls.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
    {
      id: 'devices',
      label: '기기 연결',
      count: connectedDevice ? 1 : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: '알림',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 상단 프로필 카드 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* 왼쪽: 프로필 정보 */}
          <div className="flex items-start gap-4">
            {/* 뒤로가기 */}
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="뒤로가기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{currentElderly.name}</h1>
                <RiskBadge level={currentElderly.risk_level} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {currentElderly.age && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {currentElderly.age}세
                  </span>
                )}
                {currentElderly.phone && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {currentElderly.phone}
                  </span>
                )}
                {currentElderly.address && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {currentElderly.address}
                  </span>
                )}
              </div>

              {/* 디바이스 상태 */}
              <div className="flex items-center gap-2 mt-3">
                {connectedDevice ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    디바이스 연결됨
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                    <span className="w-2 h-2 bg-orange-400 rounded-full" />
                    디바이스 미연결
                  </span>
                )}
                {currentElderly.call_schedule.enabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    자동 통화 ON
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full border border-gray-200">
                    자동 통화 OFF
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 액션 버튼 */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/elderly/${elderlyId}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={clsx(
                      'px-2 py-0.5 text-xs rounded-full',
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* 탭 콘텐츠 */}
        <div>
          {activeTab === 'summary' && (
            <SummaryTab
              elderly={currentElderly}
              recentCalls={elderlyCalls}
              connectedDevice={connectedDevice}
            />
          )}
          {activeTab === 'schedule' && (
            <ScheduleTab elderly={currentElderly} />
          )}
          {activeTab === 'calls' && (
            <CallsTab
              calls={elderlyCalls}
              loading={callsLoading && !dataLoaded}
            />
          )}
          {activeTab === 'devices' && (
            <DevicesTab
              elderlyId={elderlyId}
              elderlyName={currentElderly.name}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationsTab elderly={currentElderly} />
          )}
        </div>
      </div>
    </div>
  );
}
