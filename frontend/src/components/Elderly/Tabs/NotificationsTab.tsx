'use client';

import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Elderly } from '@/types/elderly';

interface NotificationsTabProps {
  elderly: Elderly;
}

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function NotificationsTab({ elderly }: NotificationsTabProps) {
  // 알림 설정 상태 (실제 구현 시 API와 연동)
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'missed_call',
      label: '미응답 알림',
      description: '예정된 상담에 어르신이 응답하지 않으면 알림을 받습니다',
      enabled: true,
    },
    {
      id: 'high_risk',
      label: '고위험 상황 알림',
      description: '상담 분석 결과 위험 수준이 높으면 즉시 알림을 받습니다',
      enabled: true,
    },
    {
      id: 'call_completed',
      label: '상담 완료 알림',
      description: '상담이 완료되면 요약과 함께 알림을 받습니다',
      enabled: false,
    },
    {
      id: 'daily_summary',
      label: '일일 요약 알림',
      description: '매일 저녁 그날의 상담 내용을 요약해서 알림을 받습니다',
      enabled: false,
    },
  ]);

  const handleToggle = (settingId: string) => {
    setSettings(prev =>
      prev.map(s =>
        s.id === settingId ? { ...s, enabled: !s.enabled } : s
      )
    );
    // TODO: API 호출로 설정 저장
  };

  const enabledCount = settings.filter(s => s.enabled).length;

  return (
    <div className="p-6 space-y-6">
      {/* 요약 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              알림 설정
            </p>
            <p className="text-sm text-gray-500">
              {enabledCount}개의 알림이 활성화되어 있습니다
            </p>
          </div>
        </div>
      </div>

      {/* 알림 설정 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{setting.label}</p>
                {setting.id === 'high_risk' && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded">
                    중요
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{setting.description}</p>
            </div>
            <button
              onClick={() => handleToggle(setting.id)}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                setting.enabled ? 'bg-blue-600' : 'bg-gray-200'
              )}
              role="switch"
              aria-checked={setting.enabled}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  setting.enabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">알림 수신 방법</p>
            <p className="text-sm text-blue-700 mt-1">
              알림은 웹 브라우저 푸시 알림과 이메일로 전송됩니다.
              브라우저 알림을 받으려면 알림 권한을 허용해주세요.
            </p>
          </div>
        </div>
      </div>

      {/* 비상 연락처 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">비상 연락처</h4>
          <Link
            href={`/elderly/${elderly.id}/edit`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            수정
          </Link>
        </div>
        {elderly.emergency_contact ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{elderly.emergency_contact}</p>
              <p className="text-sm text-gray-500">고위험 상황 시 연락됩니다</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-orange-800">비상 연락처가 등록되지 않았습니다</p>
              <p className="text-sm text-orange-700">
                비상 연락처를 등록하면 고위험 상황 시 즉시 연락을 취할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
