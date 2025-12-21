/**
 * UTC 날짜 처리 유틸리티
 * 백엔드가 'Z' 없이 UTC를 보내는 경우에도 일관되게 처리
 */
import { format, formatDistanceToNow, parseISO, isToday, isYesterday, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * UTC 문자열을 Date 객체로 파싱
 * 'Z' suffix가 없는 경우에도 UTC로 처리
 */
export function parseUTCDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  // 이미 'Z'나 timezone offset이 있으면 그대로 파싱
  if (dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
    return parseISO(dateString);
  }

  // 'Z' 없는 UTC 문자열 → 'Z' 추가
  return parseISO(dateString + 'Z');
}

/**
 * UTC 문자열을 로컬 시간으로 포맷
 */
export function formatLocalDateTime(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';
  return format(date, 'yyyy년 M월 d일 HH:mm', { locale: ko });
}

/**
 * UTC 문자열을 로컬 날짜로 포맷 (시간 제외)
 */
export function formatLocalDate(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';
  return format(date, 'yyyy년 M월 d일', { locale: ko });
}

/**
 * UTC 문자열을 로컬 시간으로 포맷 (날짜 제외)
 */
export function formatLocalTime(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';
  return format(date, 'HH:mm', { locale: ko });
}

/**
 * 상대 시간 표시 (예: "3분 전", "어제", "2일 전")
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';

  const now = new Date();
  const diffMinutes = differenceInMinutes(now, date);

  // 1분 미만
  if (diffMinutes < 1) {
    return '방금 전';
  }

  // 60분 미만
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  // 오늘
  if (isToday(date)) {
    return `오늘 ${format(date, 'HH:mm', { locale: ko })}`;
  }

  // 어제
  if (isYesterday(date)) {
    return `어제 ${format(date, 'HH:mm', { locale: ko })}`;
  }

  // 그 외
  return formatDistanceToNow(date, { addSuffix: true, locale: ko });
}

/**
 * 카운트다운 포맷 (mm:ss)
 */
export function formatCountdown(expiryDate: Date | null): string {
  if (!expiryDate) return '';

  const now = new Date();
  const diffSeconds = differenceInSeconds(expiryDate, now);

  if (diffSeconds <= 0) {
    return '만료됨';
  }

  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 스케줄 시간 포맷 (HH:mm → 오전/오후 H시 mm분)
 */
export function formatScheduleTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  if (minutes === 0) {
    return `${period} ${displayHour}시`;
  }
  return `${period} ${displayHour}시 ${minutes}분`;
}

/**
 * 짧은 날짜 포맷 (M/d 또는 오늘/어제)
 */
export function formatShortDate(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';

  if (isToday(date)) return '오늘';
  if (isYesterday(date)) return '어제';

  return format(date, 'M/d', { locale: ko });
}

/**
 * 통화 시간 포맷 (초 → M분 S초)
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '-';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) {
    return `${secs}초`;
  }

  return secs > 0 ? `${mins}분 ${secs}초` : `${mins}분`;
}
