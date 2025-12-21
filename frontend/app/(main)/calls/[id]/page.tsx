'use client';

import { use } from 'react';
import ChatView from '@/components/Chat/ChatView';

interface CallPageProps {
  params: Promise<{ id: string }>;
}

export default function CallPage({ params }: CallPageProps) {
  const { id } = use(params);

  return <ChatView callId={parseInt(id)} />;
}
