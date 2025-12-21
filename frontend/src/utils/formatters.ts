import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, 'yyyy년 MM월 dd일', { locale: ko });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: ko });
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};
