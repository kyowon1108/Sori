'use client';

import { CallAnalysis } from '@/types/calls';
import clsx from 'clsx';

interface CallSummaryProps {
  analysis: CallAnalysis;
  compact?: boolean;
}

export default function CallSummary({ analysis, compact = false }: CallSummaryProps) {
  if (compact) {
    return (
      <div className="space-y-3">
        {analysis.summary && (
          <div>
            <p className="text-sm font-medium text-gray-700">{analysis.summary}</p>
          </div>
        )}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500">권장 사항:</span>
            <ul className="mt-1 space-y-1">
              {analysis.recommendations.slice(0, 2).map((rec, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-1">
                  <span className="text-blue-500 mt-0.5">-</span>
                  {rec}
                </li>
              ))}
              {analysis.recommendations.length > 2 && (
                <li className="text-xs text-gray-400">
                  +{analysis.recommendations.length - 2}개 더
                </li>
              )}
            </ul>
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
          <h4 className="text-sm font-medium text-gray-500 mb-2">감정 점수</h4>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full',
                  analysis.sentiment_score >= 0.6
                    ? 'bg-green-500'
                    : analysis.sentiment_score >= 0.4
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${analysis.sentiment_score * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {(analysis.sentiment_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">분석 시간</h4>
          <p className="text-sm text-gray-900">
            {new Date(analysis.analyzed_at).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* 감정 상태 */}
      {analysis.emotional_state && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">감정 상태</h4>
          <p className="text-gray-900">{analysis.emotional_state}</p>
        </div>
      )}

      {/* 주요 토픽 */}
      {analysis.key_topics && analysis.key_topics.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">주요 토픽</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.key_topics.map((topic, index) => (
              <span
                key={index}
                className="px-2.5 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 건강 관련 언급 */}
      {analysis.health_mentions && analysis.health_mentions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">건강 관련 언급</h4>
          <ul className="space-y-1">
            {analysis.health_mentions.map((mention, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {mention}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 권장 사항 */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">권장 사항</h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
