'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CallAnalysis, ActionItem, ActionPriority, getRiskLevel } from '@/types/calls';
import clsx from 'clsx';

interface CallActionItemsProps {
  analysis: CallAnalysis;
  elderlyId: number;
}

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; bg: string; text: string }> = {
  high: { label: '높음', bg: 'bg-red-100', text: 'text-red-700' },
  med: { label: '중간', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  low: { label: '낮음', bg: 'bg-gray-100', text: 'text-gray-700' },
};

// 분석 데이터에서 액션 아이템 생성
function generateActionItems(analysis: CallAnalysis, elderlyId: number): ActionItem[] {
  const items: ActionItem[] = [];
  const riskLevel = getRiskLevel(analysis.risk_score);

  // 고위험인 경우
  if (riskLevel === 'high') {
    items.push({
      title: '어르신 상태 즉시 확인',
      description: '고위험 상태가 감지되었습니다. 빠른 시일 내 연락하세요.',
      priority: 'high',
      cta: { type: 'open_elderly', targetId: elderlyId },
    });
    items.push({
      title: '긴급 연락처 확인',
      description: '비상 연락처가 최신 정보인지 확인하세요.',
      priority: 'high',
      cta: { type: 'open_elderly', targetId: elderlyId },
    });
  }

  // 중간 위험인 경우
  if (riskLevel === 'medium') {
    items.push({
      title: '어르신 상태 확인 권장',
      description: '주의가 필요한 상태입니다. 안부 확인을 권장합니다.',
      priority: 'med',
      cta: { type: 'open_elderly', targetId: elderlyId },
    });
  }

  // recommendations가 있는 경우 (string)
  if (analysis.recommendations && analysis.recommendations.trim()) {
    items.push({
      title: analysis.recommendations,
      priority: 'med',
    });
  }

  // 기본 액션 (빈 경우)
  if (items.length === 0) {
    items.push({
      title: '다음 통화 스케줄 확인',
      description: '정기 통화 일정을 확인하세요.',
      priority: 'low',
      cta: { type: 'open_schedule', targetId: elderlyId },
    });
  }

  return items.slice(0, 5); // 최대 5개
}

export default function CallActionItems({ analysis, elderlyId }: CallActionItemsProps) {
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const actionItems = analysis.action_items || generateActionItems(analysis, elderlyId);

  const handleSaveNote = () => {
    // TODO: 메모 저장 API 연동
    console.log('Note saved:', note);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const renderCTA = (item: ActionItem) => {
    if (!item.cta) return null;

    switch (item.cta.type) {
      case 'open_elderly':
        return (
          <Link
            href={`/elderly/${item.cta.targetId}`}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            프로필 보기
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        );
      case 'open_schedule':
        return (
          <Link
            href={`/elderly/${item.cta.targetId}?tab=schedule`}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            스케줄 보기
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-500">권장 조치</h3>
      </div>

      {/* 액션 아이템 목록 */}
      <ul className="space-y-3 mb-4">
        {actionItems.map((item, index) => {
          const priorityConfig = PRIORITY_CONFIG[item.priority];
          return (
            <li key={index} className="flex items-start gap-3">
              <span className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-0.5',
                priorityConfig.bg, priorityConfig.text
              )}>
                {priorityConfig.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                )}
                <div className="mt-1">
                  {renderCTA(item)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* 메모 입력 섹션 */}
      <div className="border-t border-gray-100 pt-4">
        <label className="block text-xs font-medium text-gray-500 mb-2">
          메모 추가 (로컬 저장)
        </label>
        <div className="flex gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이 통화에 대한 메모를 입력하세요..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">
            TODO: 메모 저장 API 연동 예정
          </span>
          <button
            onClick={handleSaveNote}
            disabled={!note.trim()}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              note.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {noteSaved ? '저장됨!' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
