'use client';

import { CallAnalysis, getRiskLevel } from '@/types/calls';
import clsx from 'clsx';

interface CallSummaryProps {
  analysis: CallAnalysis;
  compact?: boolean;
}

export default function CallSummary({ analysis, compact = false }: CallSummaryProps) {
  const riskLevel = getRiskLevel(analysis.risk_score);

  if (compact) {
    return (
      <div className="space-y-3">
        {analysis.summary && (
          <div>
            <p className="text-sm font-medium text-gray-700">{analysis.summary}</p>
          </div>
        )}
        {analysis.recommendations && analysis.recommendations.trim() && (
          <div>
            <span className="text-xs font-medium text-gray-500">권장 사항:</span>
            <p className="mt-1 text-xs text-gray-600">{analysis.recommendations}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 요약 */}
      {analysis.summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">요약</h4>
          <p className="text-gray-900">{analysis.summary}</p>
        </div>
      )}

      {/* 주요 지표 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">리스크 점수</h4>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full',
                  analysis.risk_score < 40
                    ? 'bg-green-500'
                    : analysis.risk_score < 70
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${analysis.risk_score}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {analysis.risk_score}점
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">분석 시간</h4>
          <p className="text-sm text-gray-900">
            {new Date(analysis.created_at).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* 우려 사항 */}
      {analysis.concerns && analysis.concerns.trim() && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">우려 사항</h4>
          <p className="text-sm text-yellow-900">{analysis.concerns}</p>
        </div>
      )}

      {/* 권장 사항 */}
      {analysis.recommendations && analysis.recommendations.trim() && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">권장 사항</h4>
          <p className="text-sm text-blue-900">{analysis.recommendations}</p>
        </div>
      )}
    </div>
  );
}
