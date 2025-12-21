'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useElderly } from '@/hooks/useElderly';
import { useCalls } from '@/hooks/useCalls';
import Loading from '../Common/Loading';
import Link from 'next/link';
import clsx from 'clsx';

interface ElderlyDetailProps {
  elderlyId: number;
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

export default function ElderlyDetail({ elderlyId }: ElderlyDetailProps) {
  const router = useRouter();
  const { currentElderly, elderlyLoading, fetchById, delete: deleteElderly } = useElderly();
  const { startCall, callsLoading } = useCalls();

  useEffect(() => {
    fetchById(elderlyId);
  }, [elderlyId, fetchById]);

  const handleDelete = async () => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await deleteElderly(elderlyId);
        router.push('/elderly');
      } catch {
        // Error is handled by the hook
      }
    }
  };

  const handleStartCall = async () => {
    try {
      const call = await startCall(elderlyId);
      router.push(`/calls/${call.id}`);
    } catch {
      // Error is handled by the hook
    }
  };

  if (elderlyLoading || !currentElderly) {
    return <Loading />;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{currentElderly.name}</h1>
          {currentElderly.age && (
            <p className="text-gray-500">{currentElderly.age}세</p>
          )}
        </div>
        <span
          className={clsx(
            'px-3 py-1 text-sm font-medium rounded-full',
            riskLevelColors[currentElderly.risk_level] || 'bg-gray-100 text-gray-800'
          )}
        >
          위험도: {riskLevelLabels[currentElderly.risk_level] || currentElderly.risk_level}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentElderly.phone && (
            <div>
              <dt className="text-sm font-medium text-gray-500">전화번호</dt>
              <dd className="mt-1 text-gray-900">{currentElderly.phone}</dd>
            </div>
          )}
          {currentElderly.emergency_contact && (
            <div>
              <dt className="text-sm font-medium text-gray-500">긴급 연락처</dt>
              <dd className="mt-1 text-gray-900">{currentElderly.emergency_contact}</dd>
            </div>
          )}
          {currentElderly.call_schedule.enabled && (
            <div>
              <dt className="text-sm font-medium text-gray-500">정기 통화 시간</dt>
              <dd className="mt-1 text-gray-900">
                {currentElderly.call_schedule.times.join(', ')}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {currentElderly.health_condition && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">건강 상태</h2>
          <p className="text-gray-700">{currentElderly.health_condition}</p>
        </div>
      )}

      {currentElderly.medications && currentElderly.medications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">복용 약물</h2>
          <ul className="space-y-2">
            {currentElderly.medications.map((med, index) => (
              <li key={index} className="text-gray-700">
                <span className="font-medium">{med.name}</span> - {med.dosage} ({med.frequency})
              </li>
            ))}
          </ul>
        </div>
      )}

      {currentElderly.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">메모</h2>
          <p className="text-gray-700">{currentElderly.notes}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleStartCall}
          disabled={callsLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {callsLoading ? '연결 중...' : '통화 시작'}
        </button>
        <Link
          href={`/elderly/${elderlyId}/edit`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          수정하기
        </Link>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          삭제하기
        </button>
        <Link
          href="/elderly"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          목록으로
        </Link>
      </div>
    </div>
  );
}
