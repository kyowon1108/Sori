'use client';

import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { elderlyService } from '@/services/elderly';
import { formatRelativeTime, formatCountdown, parseUTCDate } from '@/utils/dateUtils';

interface PairingDevice {
  id: number;
  platform: string;
  device_name: string | null;
  last_used_at: string | null;
}

interface DevicesTabProps {
  elderlyId: number;
  elderlyName: string;
}

const PAIRING_CODE_VALIDITY_MINUTES = 10;

export default function DevicesTab({ elderlyId, elderlyName }: DevicesTabProps) {
  // 페어링 상태
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiry, setPairingExpiry] = useState<Date | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<PairingDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [countdown, setCountdown] = useState<string>('');

  // 페어링 상태 조회
  const fetchPairingStatus = useCallback(async () => {
    try {
      const status = await elderlyService.getPairingStatus(elderlyId);
      setConnectedDevice(status.paired_devices?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch pairing status:', error);
    } finally {
      setLoading(false);
    }
  }, [elderlyId]);

  useEffect(() => {
    fetchPairingStatus();
  }, [fetchPairingStatus]);

  // 카운트다운 타이머
  useEffect(() => {
    if (!pairingExpiry) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const result = formatCountdown(pairingExpiry);
      setCountdown(result);

      if (result === '만료됨') {
        setPairingCode(null);
        setPairingExpiry(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [pairingExpiry]);

  // 페어링 코드 생성
  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const result = await elderlyService.generatePairingCode(elderlyId);
      setPairingCode(result.code);
      const expiryDate = parseUTCDate(result.expires_at);
      setPairingExpiry(expiryDate);
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
    } finally {
      setGenerating(false);
    }
  };

  // 기기 연결 해제
  const handleDisconnect = async () => {
    if (!connectedDevice) return;
    if (!window.confirm('정말로 기기 연결을 해제하시겠습니까?\n연결 해제 후 새 기기를 연결해야 합니다.')) return;

    try {
      await elderlyService.disconnectDevice(elderlyId, connectedDevice.id);
      setConnectedDevice(null);
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {connectedDevice ? (
        /* 기기가 연결된 경우 */
        <>
          {/* 연결된 기기 정보 */}
          <div className="bg-green-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-green-900">
                    {connectedDevice.device_name || `${connectedDevice.platform.toUpperCase()} 기기`}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    연결됨
                  </span>
                </div>
                <div className="space-y-1 text-sm text-green-700">
                  <p className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    플랫폼: {connectedDevice.platform === 'ios' ? 'iOS' : connectedDevice.platform.toUpperCase()}
                  </p>
                  <p className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    마지막 사용: {connectedDevice.last_used_at
                      ? formatRelativeTime(connectedDevice.last_used_at)
                      : '아직 사용 기록 없음'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 기기 변경 안내 */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
            <h4 className="font-medium text-gray-900 mb-2">기기를 변경하시겠습니까?</h4>
            <p className="text-sm text-gray-600 mb-4">
              새 기기로 변경하려면 먼저 현재 연결된 기기를 해제해야 합니다.
              연결 해제 후 새 기기에서 SORI 앱을 열고 페어링 코드를 입력하세요.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDisconnect}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                연결 해제
              </button>
            </div>
          </div>
        </>
      ) : (
        /* 기기가 연결되지 않은 경우 */
        <>
          {/* 기기 연결 안내 */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  {elderlyName}님의 기기를 연결하세요
                </h3>
                <p className="text-sm text-blue-700">
                  어르신의 iOS 기기에서 SORI 앱을 설치하고, 아래 페어링 코드를 입력하면 연결됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* 페어링 코드 섹션 */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            {pairingCode ? (
              /* 코드가 생성된 경우 */
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 mb-4">
                  어르신의 앱에서 아래 코드를 입력하세요
                </p>

                {/* 코드 표시 */}
                <div className="inline-flex gap-2 mb-4">
                  {pairingCode.split('').map((digit, i) => (
                    <span
                      key={i}
                      className="w-14 h-16 flex items-center justify-center text-3xl font-bold bg-gray-50 text-gray-900 rounded-xl border-2 border-gray-200"
                    >
                      {digit}
                    </span>
                  ))}
                </div>

                {/* 타이머 */}
                <div className={clsx(
                  'flex items-center justify-center gap-2 text-sm mb-4',
                  countdown === '만료됨' ? 'text-red-600' : 'text-gray-600'
                )}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {countdown === '만료됨' ? (
                    <span className="font-medium">코드가 만료되었습니다</span>
                  ) : (
                    <span>
                      남은 시간: <span className="font-mono font-bold text-blue-600">{countdown}</span>
                    </span>
                  )}
                </div>

                {/* 안내 메시지 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                  <strong>안내:</strong> 코드는 {PAIRING_CODE_VALIDITY_MINUTES}분간 유효합니다.
                  만료 시 새 코드를 생성해주세요.
                </div>

                {/* 재발급 버튼 */}
                <button
                  onClick={handleGenerateCode}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  새 코드 생성
                </button>
              </div>
            ) : (
              /* 코드가 없는 경우 */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">페어링 코드 생성</h4>
                <p className="text-sm text-gray-500 mb-4">
                  버튼을 클릭하면 6자리 코드가 생성됩니다.<br />
                  코드는 {PAIRING_CODE_VALIDITY_MINUTES}분간 유효합니다.
                </p>
                <button
                  onClick={handleGenerateCode}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      페어링 코드 생성
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 연결 방법 안내 */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
            <h4 className="font-medium text-gray-900 mb-3">연결 방법</h4>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <span>어르신의 iOS 기기에서 <strong>SORI 앱</strong>을 설치합니다</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <span>앱을 열고 <strong>&quot;보호자 연결&quot;</strong> 메뉴를 선택합니다</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <span>위에서 생성한 <strong>6자리 코드</strong>를 입력합니다</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>연결 완료! 이제 정해진 시간에 자동으로 상담이 시작됩니다</span>
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
