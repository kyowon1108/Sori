'use client';

interface AnalysisSkeletonProps {
  isPolling?: boolean;
  pollCount?: number;
  maxPolls?: number;
  onRefresh?: () => void;
}

export default function AnalysisSkeleton({
  isPolling = false,
  pollCount = 0,
  maxPolls = 12,
  onRefresh,
}: AnalysisSkeletonProps) {
  const isTimedOut = pollCount >= maxPolls && !isPolling;

  return (
    <div className="space-y-4">
      {/* 상태 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          {isTimedOut ? (
            <>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  분석 결과가 아직 생성되지 않았습니다
                </p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  잠시 후 새로고침을 시도해주세요
                </p>
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-200 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  새로고침
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  리포트를 생성 중입니다
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  AI가 통화 내용을 분석하고 있습니다... ({pollCount}/{maxPolls})
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 스켈레톤 카드들 */}
      <div className="space-y-4">
        {/* 요약 스켈레톤 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>

        {/* 리스크 스켈레톤 */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-5 bg-gray-200 rounded-full w-12" />
              </div>
              <div className="h-2 bg-gray-200 rounded-full w-full" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-40" />
              </div>
            </div>
          </div>
        </div>

        {/* 액션 아이템 스켈레톤 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-5 bg-gray-200 rounded w-10 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
