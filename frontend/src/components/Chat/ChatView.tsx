'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCalls } from '@/hooks/useCalls';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import CallSummary from './CallSummary';

interface ChatViewProps {
  callId: number;
}

export default function ChatView({ callId }: ChatViewProps) {
  const router = useRouter();
  const { currentCall, clearChatMessages } = useStore();
  const { sendMessage, disconnect } = useWebSocket(callId);
  const { fetchById, endCall, callsLoading } = useCalls();

  useEffect(() => {
    fetchById(callId);
    return () => {
      clearChatMessages();
    };
  }, [callId, fetchById, clearChatMessages]);

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
    // Add user's message to the store immediately
    useStore.getState().addChatMessage({
      role: 'user',
      content,
      is_streaming: false,
    });
  };

  const isCallEnded = currentCall?.status === 'ended' || currentCall?.status === 'completed';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold">통화 #{callId}</h2>
          <p className="text-sm text-gray-500">
            상태: {currentCall?.status || '로딩 중...'}
          </p>
        </div>
        {!isCallEnded && (
          <button
            onClick={handleEndCall}
            disabled={callsLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {callsLoading ? '종료 중...' : '통화 종료'}
          </button>
        )}
        {isCallEnded && (
          <button
            onClick={() => router.push('/elderly')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            목록으로
          </button>
        )}
      </div>

      {isCallEnded && currentCall?.analysis ? (
        <CallSummary analysis={currentCall.analysis} />
      ) : (
        <>
          <MessageList />
          <MessageInput onSend={handleSendMessage} disabled={isCallEnded} />
        </>
      )}
    </div>
  );
}
