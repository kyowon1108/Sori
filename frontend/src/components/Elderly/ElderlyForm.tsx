'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { elderlySchema, ElderlyFormData } from '@/schemas/elderly';
import { apiClient } from '@/services/api';
import { Elderly } from '@/types/elderly';

interface ElderlyFormProps {
  elderly?: Elderly;
  isEdit?: boolean;
}

export default function ElderlyForm({ elderly, isEdit = false }: ElderlyFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<ElderlyFormData>({
    resolver: zodResolver(elderlySchema),
    defaultValues: elderly ? {
      name: elderly.name,
      age: elderly.age || 65,
      phone_number: elderly.phone || '',
      guardian_contact: elderly.emergency_contact || '',
      address: '',
      notes: elderly.notes || '',
    } : {
      name: '',
      age: 65,
      phone_number: '',
      guardian_contact: '',
      address: '',
      notes: '',
    }
  });

  const onSubmit = async (data: ElderlyFormData) => {
    try {
      // Map form data to API format
      const apiData = {
        name: data.name,
        age: data.age,
        phone: data.phone_number,
        emergency_contact: data.guardian_contact,
        notes: data.notes,
      };

      if (isEdit && elderly) {
        await apiClient.getClient().put(`/api/elderly/${elderly.id}`, apiData);
      } else {
        await apiClient.getClient().post('/api/elderly', apiData);
      }
      router.push('/elderly');
      router.refresh();
    } catch (error: any) {
      console.error('Failed to save elderly:', error);
      setError('root', {
        message: error.response?.data?.message || (isEdit ? '어르신 정보 수정에 실패했습니다.' : '어르신 등록에 실패했습니다.'),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto p-6">
      {errors.root && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {errors.root.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="홍길동"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            나이 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('age', { valueAsNumber: true })}
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.age && (
            <p className="mt-1 text-sm text-red-500">{errors.age.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            연락처 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('phone_number')}
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="010-0000-0000"
          />
          {errors.phone_number && (
            <p className="mt-1 text-sm text-red-500">{errors.phone_number.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            보호자 연락처 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('guardian_contact')}
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="010-0000-0000"
          />
          {errors.guardian_contact && (
            <p className="mt-1 text-sm text-red-500">{errors.guardian_contact.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          주소
        </label>
        <input
          {...register('address')}
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="주소를 입력하세요"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          특이사항
        </label>
        <textarea
          {...register('notes')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="건강 상태나 주의사항을 입력하세요"
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end pt-4 pb-16 gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (isEdit ? '수정 중...' : '등록 중...') : (isEdit ? '수정하기' : '등록하기')}
        </button>
      </div>
    </form>
  );
}
