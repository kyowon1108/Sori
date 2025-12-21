'use client';

import { CallAnalysis } from '@/types/calls';

interface CallReportSummaryProps {
  analysis: CallAnalysis;
}

export default function CallReportSummary({ analysis }: CallReportSummaryProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-500 mb-1">이번 자동 통화 요약</h3>
          <p className="text-gray-900 leading-relaxed">
            {analysis.summary || '요약 정보가 없습니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}
