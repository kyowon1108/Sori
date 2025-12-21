'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import MessageBubble from './MessageBubble';

export default function MessageList() {
  const { chatMessages } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {chatMessages.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          <p>대화를 시작해주세요.</p>
        </div>
      ) : (
        chatMessages.map((message, index) => (
          <MessageBubble
            key={index}
            role={message.role}
            content={message.content}
            isStreaming={message.is_streaming}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
