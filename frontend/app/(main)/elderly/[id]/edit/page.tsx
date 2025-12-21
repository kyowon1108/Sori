'use client';

import { use, useEffect } from 'react';
import { useElderly } from '@/hooks/useElderly';
import ElderlyForm from '@/components/Elderly/ElderlyForm';
import Loading from '@/components/Common/Loading';

interface EditElderlyPageProps {
  params: Promise<{ id: string }>;
}

export default function EditElderlyPage({ params }: EditElderlyPageProps) {
  const { id } = use(params);
  const elderlyId = parseInt(id);
  const { currentElderly, elderlyLoading, fetchById } = useElderly();

  useEffect(() => {
    fetchById(elderlyId);
  }, [elderlyId, fetchById]);

  if (elderlyLoading || !currentElderly) {
    return <Loading />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">어르신 정보 수정</h1>
      <ElderlyForm elderly={currentElderly} isEdit />
    </div>
  );
}
