'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatMessage, MessageRole } from '@/types/calls';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CallTranscriptProps {
  messages: ChatMessage[];
  highlightMessageIndex?: number | null;
  onClearHighlight?: () => void;
}

// 메시지 역할에 따른 스타일
const ROLE_CONFIG: Record<MessageRole, { label: string; bg: string; align: 'left' | 'right' }> = {
  user: { label: '어르신', bg: 'bg-gray-100', align: 'left' },
  assistant: { label: 'AI', bg: 'bg-blue-500 text-white', align: 'right' },
  elderly: { label: '어르신', bg: 'bg-gray-100', align: 'left' },
  caregiver: { label: '보호자', bg: 'bg-green-100', align: 'left' },
  system: { label: '시스템', bg: 'bg-yellow-100', align: 'left' },
};

// 텍스트 하이라이트 함수
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-300 text-gray-900 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function CallTranscript({
  messages,
  highlightMessageIndex,
  onClearHighlight,
}: CallTranscriptProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색 결과 필터링
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  // 검색 결과 개수
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    return messages.filter(msg =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
  }, [messages, searchQuery]);

  // 하이라이트된 메시지로 스크롤
  const scrollToMessage = useCallback((index: number) => {
    const element = messageRefs.current.get(index);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 하이라이트 애니메이션
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        onClearHighlight?.();
      }, 2000);
    }
  }, [onClearHighlight]);

  // 외부에서 하이라이트 요청 시 스크롤
  useEffect(() => {
    if (highlightMessageIndex !== null && highlightMessageIndex !== undefined) {
      scrollToMessage(highlightMessageIndex);
    }
  }, [highlightMessageIndex, scrollToMessage]);

  // 메시지 ref 설정
  const setMessageRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      messageRefs.current.set(index, el);
    } else {
      messageRefs.current.delete(index);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 검색 바 */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
            aria-label="검색 토글"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {showSearch && (
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="대화 내용 검색..."
                className="w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {showSearch && searchQuery && (
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {matchCount}개 결과
            </span>
          )}

          <span className="text-sm text-gray-400 ml-auto">
            {messages.length}개 메시지
          </span>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            {searchQuery ? (
              <p>검색 결과가 없습니다.</p>
            ) : (
              <p>대화 내용이 없습니다.</p>
            )}
          </div>
        ) : (
          filteredMessages.map((message) => {
            // 원본 인덱스 찾기 (검색 필터링된 경우)
            const originalIndex = messages.findIndex(m => m.id === message.id);
            const roleConfig = ROLE_CONFIG[message.role] || ROLE_CONFIG.assistant;
            const isHighlighted = highlightMessageIndex === originalIndex;

            return (
              <div
                key={message.id}
                id={`msg-${originalIndex}`}
                ref={(el) => setMessageRef(originalIndex, el)}
                className={clsx(
                  'flex transition-all duration-300 rounded-lg',
                  roleConfig.align === 'right' ? 'justify-end' : 'justify-start',
                  isHighlighted && 'ring-2 ring-blue-500 ring-offset-2'
                )}
              >
                <div
                  className={clsx(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    roleConfig.bg,
                    roleConfig.align === 'right' ? 'rounded-br-md' : 'rounded-bl-md'
                  )}
                >
                  {/* 역할 라벨 */}
                  <div className={clsx(
                    'text-xs font-medium mb-1',
                    roleConfig.align === 'right' ? 'text-blue-100' : 'text-gray-500'
                  )}>
                    {roleConfig.label}
                  </div>

                  {/* 메시지 내용 */}
                  <p className={clsx(
                    'text-sm leading-relaxed whitespace-pre-wrap',
                    roleConfig.align === 'right' ? 'text-white' : 'text-gray-900'
                  )}>
                    {highlightText(message.content, searchQuery)}
                  </p>

                  {/* 시간 */}
                  {message.created_at && (
                    <div className={clsx(
                      'text-xs mt-1',
                      roleConfig.align === 'right' ? 'text-blue-200' : 'text-gray-400'
                    )}>
                      {format(parseISO(message.created_at), 'HH:mm', { locale: ko })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
