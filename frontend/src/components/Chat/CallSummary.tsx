'use client';

import { CallAnalysis } from '@/types/calls';
import clsx from 'clsx';

interface CallSummaryProps {
  analysis: CallAnalysis;
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

export default function CallSummary({ analysis }: CallSummaryProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">통화 분석 결과</h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">위험 수준:</span>
              <span
                className={clsx(
                  'px-2 py-1 text-sm font-medium rounded-full',
                  riskLevelColors[analysis.risk_level] || 'bg-gray-100 text-gray-800'
                )}
              >
                {riskLevelLabels[analysis.risk_level] || analysis.risk_level}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">감정 점수:</span>
              <span className="text-gray-900">{analysis.sentiment_score.toFixed(2)}</span>
            </div>

            {analysis.summary && (
              <div>
                <span className="text-sm font-medium text-gray-500">요약:</span>
                <p className="mt-1 text-gray-700">{analysis.summary}</p>
              </div>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-500">권장 사항:</span>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-gray-700">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-sm text-gray-500">
              분석 시간: {new Date(analysis.analyzed_at).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
