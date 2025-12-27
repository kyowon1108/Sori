'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatView from '@/components/Chat/ChatView';
import { callsService } from '@/services/calls';

interface CallPageProps {
  params: Promise<{ id: string }>;
}

export default function CallPage({ params }: CallPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const call = await callsService.getCall(parseInt(id));

        // 진행 중인 통화는 상세 페이지 접근 불가
        if (call.status === 'in_progress' || call.status === 'scheduled') {
          router.push('/calls');
          return;
        }

        setIsAllowed(true);
      } catch {
        router.push('/calls');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  // 보호자 대시보드에서는 항상 읽기 전용 모드로 표시
  return <ChatView callId={parseInt(id)} readOnly />;
}
