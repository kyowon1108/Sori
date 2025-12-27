'use client';

import { CallAnalysis, RiskLevel, RiskReason, getRiskLevel, getSentimentFromRiskScore } from '@/types/calls';
import clsx from 'clsx';

interface CallRiskPanelProps {
  analysis: CallAnalysis;
  onReasonClick?: (messageIndex: number) => void;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; border: string; icon: string }> = {
  low: {
    label: '정상',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-500',
  },
  medium: {
    label: '주의',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: 'text-yellow-500',
  },
  high: {
    label: '고위험',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-500',
  },
};

// 분석 데이터에서 리스크 근거 생성
function generateRiskReasons(analysis: CallAnalysis): RiskReason[] {
  const reasons: RiskReason[] = [];
  const riskLevel = getRiskLevel(analysis.risk_score);

  // 리스크 점수 기반 근거
  if (analysis.risk_score >= 70) {
    reasons.push({ label: '고위험 상태가 감지되었습니다' });
  } else if (analysis.risk_score >= 40) {
    reasons.push({ label: '주의가 필요한 상태입니다' });
  }

  // concerns 기반 근거 (백엔드에서 제공)
  if (analysis.concerns && analysis.concerns.trim()) {
    reasons.push({ label: analysis.concerns });
  }

  // 기본 근거 (reasons이 비어있을 경우)
  if (reasons.length === 0 && riskLevel !== 'low') {
    reasons.push({ label: '분석 결과 주의가 필요합니다' });
  }

  return reasons;
}

export default function CallRiskPanel({ analysis, onReasonClick }: CallRiskPanelProps) {
  const riskLevel = getRiskLevel(analysis.risk_score);
  const sentimentScore = getSentimentFromRiskScore(analysis.risk_score);
  const config = RISK_CONFIG[riskLevel];
  const reasons = analysis.risk_reasons || generateRiskReasons(analysis);

  return (
    <div className={clsx('rounded-xl border p-5', config.bg, config.border)}>
      <div className="flex items-start gap-4">
        {/* 위험도 아이콘 */}
        <div className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
          riskLevel === 'low' ? 'bg-green-100' :
          riskLevel === 'medium' ? 'bg-yellow-100' : 'bg-red-100'
        )}>
          {riskLevel === 'low' ? (
            <svg className={clsx('w-6 h-6', config.icon)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : riskLevel === 'medium' ? (
            <svg className={clsx('w-6 h-6', config.icon)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className={clsx('w-6 h-6', config.icon)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* 위험도 레이블 */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-500">상태/리스크</h3>
            <span className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
              riskLevel === 'low' ? 'bg-green-100 text-green-800' :
              riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
            )}>
              {config.label}
            </span>
          </div>

          {/* 리스크 점수 바 */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>리스크 점수</span>
              <span className="font-medium">{analysis.risk_score}점</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  analysis.risk_score < 40 ? 'bg-green-500' :
                  analysis.risk_score < 70 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${analysis.risk_score}%` }}
              />
            </div>
          </div>

          {/* 리스크 근거 목록 */}
          {reasons.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">근거:</p>
              <ul className="space-y-1">
                {reasons.map((reason, index) => (
                  <li key={index}>
                    {reason.message_index !== undefined ? (
                      <button
                        onClick={() => onReasonClick?.(reason.message_index!)}
                        className={clsx(
                          'text-sm flex items-start gap-2 hover:underline text-left w-full',
                          config.text
                        )}
                      >
                        <span className="text-current mt-1">-</span>
                        <span>{reason.label}</span>
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    ) : (
                      <span className={clsx('text-sm flex items-start gap-2', config.text)}>
                        <span className="text-current mt-1">-</span>
                        <span>{reason.label}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
