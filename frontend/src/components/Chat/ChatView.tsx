'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCalls } from '@/hooks/useCalls';
import { useElderly } from '@/hooks/useElderly';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import CallSummary from './CallSummary';
import { StatusBadge, RiskBadge } from '@/components/Common/Badge';
import { CALL_STATUS, TRIGGER_TYPES } from '@/utils/constants';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';

interface ChatViewProps {
  callId: number;
}

export default function ChatView({ callId }: ChatViewProps) {
  const router = useRouter();
  const { currentCall, clearChatMessages } = useStore();
  const { sendMessage, disconnect, status: wsStatus } = useWebSocket(callId);
  const { fetchById, endCall, callsLoading } = useCalls();
  const { fetchById: fetchElderly, currentElderly } = useElderly();
  const [showAnalysis, setShowAnalysis] = useState(true);

  useEffect(() => {
    fetchById(callId);
    return () => {
      clearChatMessages();
    };
  }, [callId, fetchById, clearChatMessages]);

  // 어르신 정보 가져오기
  useEffect(() => {
    if (currentCall?.elderly_id) {
      fetchElderly(currentCall.elderly_id);
    }
  }, [currentCall?.elderly_id, fetchElderly]);

  const handleEndCall = async () => {
    try {
      disconnect();
      await endCall(callId);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleSendMessage = (content: string) => {
    sendMessage(content);
    useStore.getState().addChatMessage({
      role: 'user',
      content,
      is_streaming: false,
    });
  };

  const isCallEnded = currentCall?.status === 'completed' || currentCall?.status === 'failed' || currentCall?.status === 'cancelled';
  const isCallActive = currentCall?.status === 'in_progress';
  const hasAnalysis = currentCall?.analysis;
  const callTime = currentCall?.started_at || currentCall?.scheduled_for || currentCall?.created_at;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* 뒤로가기 */}
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="뒤로 가기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentElderly?.name || `어르신 #${currentCall?.elderly_id || '...'}`}
                </h2>
                {currentCall?.status && <StatusBadge status={currentCall.status} />}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>통화 #{callId}</span>
                {currentCall?.trigger_type && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span>{TRIGGER_TYPES[currentCall.trigger_type]}</span>
                  </>
                )}
                {callTime && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span>{format(parseISO(callTime), 'M월 d일 HH:mm', { locale: ko })}</span>
                  </>
                )}
                {currentCall?.duration && isCallEnded && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span>{Math.floor(currentCall.duration / 60)}분 {currentCall.duration % 60}초</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* WebSocket 상태 */}
            {isCallActive && (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full',
                    wsStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                  )}
                />
                <span className="text-gray-500">
                  {wsStatus === 'connected' ? '연결됨' : '연결 중...'}
                </span>
              </div>
            )}

            {/* 분석 토글 (데스크톱) */}
            {hasAnalysis && (
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {showAnalysis ? '분석 숨기기' : '분석 보기'}
              </button>
            )}

            {/* 통화 종료 버튼 */}
            {isCallActive && (
              <button
                onClick={handleEndCall}
                disabled={callsLoading}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {callsLoading ? '종료 중...' : '통화 종료'}
              </button>
            )}

            {/* 어르신 프로필 링크 */}
            {currentCall?.elderly_id && (
              <Link
                href={`/elderly/${currentCall.elderly_id}`}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                프로필 보기
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 대화 로그 */}
        <div className={clsx(
          'flex flex-col flex-1 min-w-0',
          hasAnalysis && showAnalysis ? 'lg:w-1/2' : 'w-full'
        )}>
          <div className="flex-1 overflow-hidden">
            <MessageList />
          </div>
          {!isCallEnded && (
            <div className="flex-shrink-0 border-t border-gray-200">
              <MessageInput onSend={handleSendMessage} disabled={isCallEnded} />
            </div>
          )}
        </div>

        {/* 분석 결과 패널 (우측) */}
        {hasAnalysis && showAnalysis && (
          <div className="hidden lg:flex flex-col w-1/2 border-l border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">분석 결과</h3>
                {currentCall.analysis && (
                  <RiskBadge level={currentCall.analysis.risk_level} />
                )}
              </div>
              <CallSummary analysis={currentCall.analysis!} />

              {/* 조치 버튼 */}
              <div className="mt-6 space-y-3">
                <Link
                  href={`/elderly/${currentCall.elderly_id}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  어르신 상세 정보
                </Link>
                <button
                  onClick={() => {
                    // TODO: 메모 기능 구현
                    alert('메모 기능은 추후 구현 예정입니다.');
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  메모 추가
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 모바일용 분석 결과 (하단 시트) */}
      {hasAnalysis && (
        <div className="lg:hidden flex-shrink-0 border-t border-gray-200 bg-white">
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              분석 결과
            </span>
            {currentCall.analysis && (
              <RiskBadge level={currentCall.analysis.risk_level} size="sm" />
            )}
          </button>
          {showAnalysis && (
            <div className="px-4 pb-4 max-h-64 overflow-y-auto">
              <CallSummary analysis={currentCall.analysis!} compact />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
