'use client';

import { useEffect } from 'react';
import { useElderly } from '@/hooks/useElderly';
import ElderlyCard from './ElderlyCard';
import Loading from '../Common/Loading';
import Link from 'next/link';

export default function ElderlyList() {
  const { elderlyList, elderlyLoading, fetchList } = useElderly();

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  if (elderlyLoading && elderlyList.length === 0) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">어르신 목록</h2>
        <Link
          href="/elderly/add"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 어르신 추가
        </Link>
      </div>

      {elderlyList.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 어르신이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            새 어르신을 추가해주세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {elderlyList.map((elderly) => (
            <ElderlyCard key={elderly.id} elderly={elderly} />
          ))}
        </div>
      )}
    </div>
  );
}
