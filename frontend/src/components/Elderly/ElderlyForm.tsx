'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import axios from 'axios';
import { apiClient } from '@/services/api';
import { Elderly } from '@/types/elderly';

// Extended schema with schedule
const elderlyFormSchema = z.object({
  name: z.string().min(2, '이름은 2글자 이상이어야 합니다.').max(50, '이름은 50글자 이하여야 합니다.'),
  age: z.number()
    .min(50, '나이는 50세 이상이어야 합니다.')
    .max(120, '나이는 120세 이하여야 합니다.')
    .positive('나이는 양수여야 합니다.'),
  phone_number: z.string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678).'),
  address: z.string().optional(),
  guardian_contact: z.string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678).'),
  notes: z.string().max(500, '특이사항은 500자 이하여야 합니다.').optional(),
  schedule_enabled: z.boolean(),
  schedule_times: z.array(z.object({
    time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '올바른 시간 형식이 아닙니다 (예: 09:00)')
  })),
});

type ElderlyFormData = z.infer<typeof elderlyFormSchema>;

interface ElderlyFormProps {
  elderly?: Elderly;
  isEdit?: boolean;
}

export default function ElderlyForm({ elderly, isEdit = false }: ElderlyFormProps) {
  const router = useRouter();

  const defaultTimes = elderly?.call_schedule?.times?.length
    ? elderly.call_schedule.times.map(t => ({ time: t }))
    : [{ time: '09:00' }, { time: '14:00' }, { time: '19:00' }];

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    setError
  } = useForm<ElderlyFormData>({
    resolver: zodResolver(elderlyFormSchema),
    defaultValues: elderly ? {
      name: elderly.name,
      age: elderly.age || 65,
      phone_number: elderly.phone || '',
      guardian_contact: elderly.emergency_contact || '',
      address: elderly.address || '',
      notes: elderly.notes || '',
      schedule_enabled: elderly.call_schedule?.enabled ?? true,
      schedule_times: defaultTimes,
    } : {
      name: '',
      age: 65,
      phone_number: '',
      guardian_contact: '',
      address: '',
      notes: '',
      schedule_enabled: true,
      schedule_times: [{ time: '09:00' }, { time: '14:00' }, { time: '19:00' }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'schedule_times',
  });

  const scheduleEnabled = watch('schedule_enabled');

  const onSubmit = async (data: ElderlyFormData) => {
    try {
      // Map form data to API format
      const apiData = {
        name: data.name,
        age: data.age,
        phone: data.phone_number,
        emergency_contact: data.guardian_contact,
        address: data.address,
        notes: data.notes,
        call_schedule: {
          enabled: data.schedule_enabled,
          times: data.schedule_times.map(t => t.time),
        },
      };

      if (isEdit && elderly) {
        await apiClient.getClient().put(`/api/elderly/${elderly.id}`, apiData);
      } else {
        await apiClient.getClient().post('/api/elderly', apiData);
      }
      router.push('/elderly');
      router.refresh();
    } catch (error: unknown) {
      console.error('Failed to save elderly:', error);
      let errorMessage = isEdit ? '어르신 정보 수정에 실패했습니다.' : '어르신 등록에 실패했습니다.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      setError('root', { message: errorMessage });
    }
  };

  const addScheduleTime = () => {
    if (fields.length < 5) {
      append({ time: '12:00' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto p-6">
      {errors.root && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {errors.root.message}
        </div>
      )}

      {/* 기본 정보 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>

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

        <div className="mt-6">
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

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            특이사항
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="건강 상태나 주의사항을 입력하세요"
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {/* 스케줄 설정 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">자동 통화 스케줄</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              {...register('schedule_enabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {scheduleEnabled ? '활성화' : '비활성화'}
            </span>
          </label>
        </div>

        {scheduleEnabled && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              설정된 시간에 자동으로 AI 통화가 시작됩니다. 최대 5개까지 설정할 수 있습니다.
            </p>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      {...register(`schedule_times.${index}.time`)}
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.schedule_times?.[index]?.time && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.schedule_times[index]?.time?.message}
                      </p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {fields.length < 5 && (
              <button
                type="button"
                onClick={addScheduleTime}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                시간 추가
              </button>
            )}
          </div>
        )}

        {!scheduleEnabled && (
          <p className="text-sm text-gray-500">
            자동 통화가 비활성화되어 있습니다. 활성화하면 설정된 시간에 자동으로 통화가 시작됩니다.
          </p>
        )}
      </div>

      {/* 버튼 */}
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
