'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCalls } from '@/hooks/useCalls';
import { useElderly } from '@/hooks/useElderly';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { AgentStatus, TypingIndicator } from './AgentStatus';
import { StatusBadge } from '@/components/Common/Badge';
import {
  CallReportSummary,
  CallRiskPanel,
  CallActionItems,
  CallTranscript,
  AnalysisSkeleton,
} from '@/components/Calls';
import { TRIGGER_TYPES } from '@/utils/constants';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { ChatMessage } from '@/types/calls';

interface ChatViewProps {
  callId: number;
  /** 읽기 전용 모드 - 보호자 대시보드용. 메시지 입력 및 WebSocket 연결 비활성화 */
  readOnly?: boolean;
}

type TabType = 'summary' | 'transcript' | 'meta';

const TABS: { id: TabType; label: string }[] = [
  { id: 'summary', label: '요약' },
  { id: 'transcript', label: '대화 원문' },
  { id: 'meta', label: '통화 메타' },
];

const POLL_INTERVAL = 5000; // 5초
const MAX_POLLS = 12; // 최대 12회 (60초)

export default function ChatView({ callId, readOnly = false }: ChatViewProps) {
  const router = useRouter();
  const {
    currentCall,
    clearChatMessages,
    chatMessages,
    agentPhase,
    isAgentProcessing,
    toolExecutions,
    resetAgentStatus,
  } = useStore();
  // readOnly 모드에서는 WebSocket 연결하지 않음 (callId를 0으로 전달하여 연결 비활성화)
  const { sendMessage, status: wsStatus } = useWebSocket(readOnly ? 0 : callId);
  const { fetchById } = useCalls();
  const { fetchById: fetchElderly, currentElderly } = useElderly();

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // 분석 폴링 상태
  const [pollCount, setPollCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 앵커 하이라이트 상태
  const [highlightMessageIndex, setHighlightMessageIndex] = useState<number | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    fetchById(callId);
    return () => {
      clearChatMessages();
      resetAgentStatus();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [callId, fetchById, clearChatMessages, resetAgentStatus]);

  // 어르신 정보 가져오기
  useEffect(() => {
    if (currentCall?.elderly_id) {
      fetchElderly(currentCall.elderly_id);
    }
  }, [currentCall?.elderly_id, fetchElderly]);

  // 분석 폴링 로직 - effect 내에서 직접 관리
  useEffect(() => {
    const callEnded = currentCall?.status === 'completed' || currentCall?.status === 'failed' || currentCall?.status === 'cancelled';

    // 분석이 있거나 통화가 끝나지 않았으면 폴링 불필요
    if (!callEnded || currentCall?.analysis) {
      return;
    }

    // 이미 폴링 중이면 중복 시작 방지
    if (pollIntervalRef.current) {
      return;
    }

    let localPollCount = 0;
    setIsPolling(true);

    const poll = () => {
      if (localPollCount >= MAX_POLLS) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsPolling(false);
        setPollCount(localPollCount);
        return;
      }
      localPollCount++;
      setPollCount(localPollCount);
      fetchById(callId);
    };

    // 초기 폴링 즉시 실행하지 않고 interval로만
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [currentCall?.status, currentCall?.analysis, callId, fetchById]);

  // 분석 결과가 들어오면 폴링 중단
  useEffect(() => {
    if (currentCall?.analysis && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setIsPolling(false);
    }
  }, [currentCall?.analysis]);

  // 수동 새로고침
  const handleManualRefresh = useCallback(() => {
    // 기존 폴링 중지
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setPollCount(0);
    setIsPolling(true);
    fetchById(callId);

    // 새로운 폴링 시작
    let localPollCount = 0;
    pollIntervalRef.current = setInterval(() => {
      if (localPollCount >= MAX_POLLS) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsPolling(false);
        setPollCount(localPollCount);
        return;
      }
      localPollCount++;
      setPollCount(localPollCount);
      fetchById(callId);
    }, POLL_INTERVAL);
  }, [callId, fetchById]);

  // 리스크 근거 클릭 시 해당 메시지로 이동
  const handleReasonClick = useCallback((messageIndex: number) => {
    setActiveTab('transcript');
    setHighlightMessageIndex(messageIndex);
  }, []);

  const handleSendMessage = (content: string) => {
    sendMessage(content);
    useStore.getState().addChatMessage({
      role: 'user',
      content,
      is_streaming: false,
    });
  };

  const isCallEnded = currentCall?.status === 'completed' || currentCall?.status === 'failed' || currentCall?.status === 'cancelled';
  // readOnly 모드에서는 항상 비활성 상태로 처리 (채팅 입력 불가)
  const isCallActive = !readOnly && currentCall?.status === 'in_progress';
  const hasAnalysis = !!currentCall?.analysis;
  const callTime = currentCall?.started_at || currentCall?.scheduled_for || currentCall?.created_at;

  // 메시지 데이터: API에서 가져온 메시지 또는 실시간 메시지
  const messagesData: ChatMessage[] = currentCall?.messages && currentCall.messages.length > 0
    ? currentCall.messages
    : chatMessages.map((msg, idx) => ({
        id: idx,
        call_id: callId,
        role: msg.role as ChatMessage['role'],
        content: msg.content,
        is_streaming: msg.is_streaming,
        created_at: new Date().toISOString(),
      }));

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
                <span>자동 통화 #{callId}</span>
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
            {/* readOnly 모드 표시 */}
            {readOnly && (
              <div className="flex items-center gap-2 text-sm px-3 py-1 bg-gray-100 rounded-full">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-gray-600">읽기 전용</span>
              </div>
            )}

            {/* WebSocket 상태 (진행 중인 통화 모니터링용 - readOnly 모드에서는 표시 안함) */}
            {isCallActive && !readOnly && (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full',
                    wsStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                  )}
                />
                <span className="text-gray-500">
                  {wsStatus === 'connected' ? '실시간 연결됨' : '연결 중...'}
                </span>
              </div>
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

      {/* 통화 진행 중일 때: 기존 실시간 채팅 UI */}
      {isCallActive && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MessageList />
          </div>

          {/* Agent Status - 에이전트 처리 상태 표시 */}
          {(isAgentProcessing || toolExecutions.length > 0) && (
            <div className="flex-shrink-0 px-4 py-2 border-t border-gray-100 bg-gray-50">
              <AgentStatus
                currentPhase={agentPhase}
                toolExecutions={toolExecutions}
                isProcessing={isAgentProcessing}
              />
            </div>
          )}

          {/* Typing Indicator - AI 응답 작성 중 표시 */}
          {isAgentProcessing && agentPhase === 'act' && (
            <div className="flex-shrink-0 px-4 py-2">
              <TypingIndicator />
            </div>
          )}

          <div className="flex-shrink-0 border-t border-gray-200">
            <MessageInput onSend={handleSendMessage} disabled={false} />
          </div>
        </div>
      )}

      {/* 통화 종료 후 또는 readOnly 모드: 탭 기반 UI */}
      {(isCallEnded || readOnly) && (
        <>
          {/* 탭 네비게이션 */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            <div className="px-6">
              <nav className="flex gap-6" aria-label="Tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'py-3 px-1 border-b-2 text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {/* 요약 탭 */}
            {activeTab === 'summary' && (
              <div className="p-6 max-w-3xl mx-auto space-y-4">
                {hasAnalysis ? (
                  <>
                    <CallReportSummary analysis={currentCall.analysis!} />
                    <CallRiskPanel
                      analysis={currentCall.analysis!}
                      onReasonClick={handleReasonClick}
                    />
                    <CallActionItems
                      analysis={currentCall.analysis!}
                      elderlyId={currentCall.elderly_id}
                    />
                  </>
                ) : (
                  <AnalysisSkeleton
                    isPolling={isPolling}
                    pollCount={pollCount}
                    maxPolls={MAX_POLLS}
                    onRefresh={handleManualRefresh}
                  />
                )}
              </div>
            )}

            {/* 대화 원문 탭 */}
            {activeTab === 'transcript' && (
              <div className="h-full">
                <CallTranscript
                  messages={messagesData}
                  highlightMessageIndex={highlightMessageIndex}
                  onClearHighlight={() => setHighlightMessageIndex(null)}
                />
              </div>
            )}

            {/* 통화 메타 탭 */}
            {activeTab === 'meta' && (
              <div className="p-6 max-w-3xl mx-auto">
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">통화 정보</h3>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500">통화 ID</dt>
                      <dd className="font-medium text-gray-900">#{currentCall?.id}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">통화 유형</dt>
                      <dd className="font-medium text-gray-900">
                        {currentCall?.call_type === 'voice' ? '음성' : currentCall?.call_type}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">트리거</dt>
                      <dd className="font-medium text-gray-900">
                        {currentCall?.trigger_type && TRIGGER_TYPES[currentCall.trigger_type]}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">상태</dt>
                      <dd className="font-medium text-gray-900">{currentCall?.status}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">시작 시각</dt>
                      <dd className="font-medium text-gray-900">
                        {currentCall?.started_at &&
                          format(parseISO(currentCall.started_at), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">종료 시각</dt>
                      <dd className="font-medium text-gray-900">
                        {currentCall?.ended_at &&
                          format(parseISO(currentCall.ended_at), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">통화 시간</dt>
                      <dd className="font-medium text-gray-900">
                        {currentCall?.duration
                          ? `${Math.floor(currentCall.duration / 60)}분 ${currentCall.duration % 60}초`
                          : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">메시지 수</dt>
                      <dd className="font-medium text-gray-900">{messagesData.length}개</dd>
                    </div>
                  </div>

                  {hasAnalysis && currentCall?.analysis?.created_at && (
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">분석 정보</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-gray-500">분석 시각</dt>
                          <dd className="font-medium text-gray-900">
                            {format(parseISO(currentCall.analysis.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">리스크 점수</dt>
                          <dd className="font-medium text-gray-900">
                            {currentCall.analysis.risk_score}점
                          </dd>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
                    <p>TODO: 연결 품질, 모델 응답 시간 등 추가 메타 데이터 표시 예정</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
