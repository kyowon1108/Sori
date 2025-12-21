'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useElderly } from '@/hooks/useElderly';
import { Elderly, ElderlyCreateRequest } from '@/types/elderly';

interface ElderlyFormProps {
  elderly?: Elderly;
  isEdit?: boolean;
}

export default function ElderlyForm({ elderly, isEdit = false }: ElderlyFormProps) {
  const router = useRouter();
  const { create, update, elderlyLoading } = useElderly();

  const [formData, setFormData] = useState<ElderlyCreateRequest>({
    name: elderly?.name || '',
    age: elderly?.age,
    phone: elderly?.phone || '',
    call_schedule: elderly?.call_schedule || { enabled: false, times: [] },
    health_condition: elderly?.health_condition || '',
    medications: elderly?.medications || [],
    emergency_contact: elderly?.emergency_contact || '',
    notes: elderly?.notes || '',
  });

  const [callTimes, setCallTimes] = useState<string>(
    elderly?.call_schedule?.times?.join(', ') || ''
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleScheduleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      call_schedule: {
        ...prev.call_schedule!,
        enabled: e.target.checked,
      },
    }));
  };

  const handleCallTimesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCallTimes(e.target.value);
    const times = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      call_schedule: {
        ...prev.call_schedule!,
        times,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && elderly) {
        await update(elderly.id, formData);
        router.push(`/elderly/${elderly.id}`);
      } else {
        const newElderly = await create(formData);
        router.push(`/elderly/${newElderly.id}`);
      }
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          이름 *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700">
            나이
          </label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            전화번호
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700">
          긴급 연락처
        </label>
        <input
          type="tel"
          id="emergency_contact"
          name="emergency_contact"
          value={formData.emergency_contact}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="schedule_enabled"
            checked={formData.call_schedule?.enabled}
            onChange={handleScheduleToggle}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="schedule_enabled" className="text-sm font-medium text-gray-700">
            정기 통화 일정 활성화
          </label>
        </div>

        {formData.call_schedule?.enabled && (
          <div>
            <label htmlFor="call_times" className="block text-sm font-medium text-gray-700">
              통화 시간 (쉼표로 구분, 예: 09:00, 14:00)
            </label>
            <input
              type="text"
              id="call_times"
              value={callTimes}
              onChange={handleCallTimesChange}
              placeholder="09:00, 14:00"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="health_condition" className="block text-sm font-medium text-gray-700">
          건강 상태
        </label>
        <textarea
          id="health_condition"
          name="health_condition"
          rows={3}
          value={formData.health_condition}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          메모
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={elderlyLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {elderlyLoading ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  );
}
