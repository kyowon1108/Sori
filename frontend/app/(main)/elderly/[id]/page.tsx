'use client';

import { use } from 'react';
import ElderlyDetail from '@/components/Elderly/ElderlyDetail';

interface ElderlyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ElderlyDetailPage({ params }: ElderlyDetailPageProps) {
  const { id } = use(params);

  return <ElderlyDetail elderlyId={parseInt(id)} />;
}
