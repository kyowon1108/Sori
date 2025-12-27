'use client';

import { use } from 'react';
import ChatView from '@/components/Chat/ChatView';

interface CallPageProps {
  params: Promise<{ id: string }>;
}

export default function CallPage({ params }: CallPageProps) {
  const { id } = use(params);

  // 보호자 대시보드에서는 항상 읽기 전용 모드로 표시
  // 채팅 입력 및 WebSocket 실시간 연결 비활성화
  return <ChatView callId={parseInt(id)} readOnly />;
}
