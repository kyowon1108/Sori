import { Call, CallStatus, CallAnalysis } from '@/types/calls';
import { Elderly } from '@/types/elderly';
import { Event, EventType, EventSeverity, ActionNeededItem, ActionType } from '@/types/events';
import { EVENT_TYPES, CALL_STATUS } from './constants';
import { formatDistanceToNow, format, isToday, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// ===========================================
// Call Status → Event Type 매핑
// ===========================================
const CALL_STATUS_TO_EVENT_TYPE: Record<CallStatus, EventType> = {
  scheduled: 'call_scheduled',
  in_progress: 'call_started',
  completed: 'call_completed',
  failed: 'call_failed',
  cancelled: 'call_cancelled',
  missed: 'call_missed',
};

const CALL_STATUS_TO_SEVERITY: Record<CallStatus, EventSeverity> = {
  scheduled: 'info',
  in_progress: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
  missed: 'error',
};

// ===========================================
// Call → Event 변환
// ===========================================
export function callToEvent(call: Call, elderlyName?: string): Event {
  const eventType = CALL_STATUS_TO_EVENT_TYPE[call.status];
  const severity = CALL_STATUS_TO_SEVERITY[call.status];
  const name = elderlyName || call.elderly_name || `어르신 #${call.elderly_id}`;

  let description = '';
  switch (call.status) {
    case 'scheduled':
      description = call.scheduled_for
        ? `${format(parseISO(call.scheduled_for), 'HH:mm', { locale: ko })}에 상담 예정`
        : '상담이 예정되어 있습니다';
      break;
    case 'in_progress':
      description = '현재 상담이 진행 중입니다';
      break;
    case 'completed':
      description = call.duration
        ? `${Math.floor(call.duration / 60)}분간 상담 완료`
        : '상담이 완료되었습니다';
      break;
    case 'missed':
      description = '예정된 상담에 응답하지 않았습니다';
      break;
    case 'failed':
      description = '상담 연결에 실패했습니다';
      break;
    case 'cancelled':
      description = '상담이 취소되었습니다';
      break;
  }

  const timestamp = call.started_at || call.scheduled_for || call.created_at;

  return {
    id: `call-${call.id}-${call.status}`,
    type: eventType,
    severity,
    timestamp,
    elderly_id: call.elderly_id,
    elderly_name: name,
    call_id: call.id,
    title: `${name} - ${EVENT_TYPES[eventType]}`,
    description,
    cta: {
      label: '상세 보기',
      href: `/calls/${call.id}`,
    },
  };
}

// ===========================================
// CallAnalysis → Event 변환
// ===========================================
export function analysisToEvent(analysis: CallAnalysis, call: Call, elderlyName?: string): Event {
  const name = elderlyName || call.elderly_name || `어르신 #${call.elderly_id}`;
  const isHighRisk = analysis.risk_level === 'high';

  return {
    id: `analysis-${analysis.id}`,
    type: 'analysis_completed',
    severity: isHighRisk ? 'warning' : 'success',
    timestamp: analysis.analyzed_at,
    elderly_id: call.elderly_id,
    elderly_name: name,
    call_id: call.id,
    title: `${name} - 분석 완료`,
    description: analysis.summary || `위험도: ${analysis.risk_level}`,
    cta: {
      label: '분석 결과 보기',
      href: `/calls/${call.id}`,
    },
    metadata: {
      risk_level: analysis.risk_level,
      sentiment_score: analysis.sentiment_score,
    },
  };
}

// ===========================================
// Elderly → ActionNeededItem 변환 (조치 필요 항목)
// ===========================================
export function elderlyToActionItems(elderly: Elderly): ActionNeededItem[] {
  const items: ActionNeededItem[] = [];

  // 디바이스 미등록
  if (!elderly.device) {
    items.push({
      id: `action-no-device-${elderly.id}`,
      type: 'no_device',
      priority: 'medium',
      elderly_id: elderly.id,
      elderly_name: elderly.name,
      title: '디바이스 미등록',
      description: `${elderly.name}님의 디바이스가 등록되지 않았습니다`,
      created_at: elderly.updated_at,
      cta: {
        label: '등록 안내',
        href: `/elderly/${elderly.id}`,
      },
    });
  }

  // 고위험
  if (elderly.risk_level === 'high') {
    items.push({
      id: `action-high-risk-${elderly.id}`,
      type: 'high_risk',
      priority: 'critical',
      elderly_id: elderly.id,
      elderly_name: elderly.name,
      title: '고위험 어르신',
      description: `${elderly.name}님의 위험도가 높음으로 설정되어 있습니다`,
      created_at: elderly.updated_at,
      cta: {
        label: '상세 확인',
        href: `/elderly/${elderly.id}`,
        variant: 'danger',
      },
    });
  }

  // 미응답 통화 있음
  if (elderly.missed_calls_count && elderly.missed_calls_count > 0) {
    items.push({
      id: `action-missed-${elderly.id}`,
      type: 'missed_call',
      priority: 'high',
      elderly_id: elderly.id,
      elderly_name: elderly.name,
      title: '미응답 상담',
      description: `${elderly.name}님이 ${elderly.missed_calls_count}건의 상담에 응답하지 않았습니다`,
      created_at: elderly.updated_at,
      cta: {
        label: '확인하기',
        href: `/elderly/${elderly.id}`,
        variant: 'primary',
      },
    });
  }

  return items;
}

// ===========================================
// Call → ActionNeededItem 변환
// ===========================================
export function callToActionItem(call: Call, elderlyName?: string): ActionNeededItem | null {
  const name = elderlyName || call.elderly_name || `어르신 #${call.elderly_id}`;

  if (call.status === 'missed') {
    return {
      id: `action-missed-call-${call.id}`,
      type: 'missed_call',
      priority: 'high',
      elderly_id: call.elderly_id,
      elderly_name: name,
      call_id: call.id,
      title: '미응답 상담',
      description: `${name}님이 ${format(parseISO(call.scheduled_for || call.created_at), 'M월 d일 HH:mm', { locale: ko })} 상담에 응답하지 않았습니다`,
      created_at: call.updated_at || call.created_at,
      cta: {
        label: '상세 보기',
        href: `/calls/${call.id}`,
        variant: 'primary',
      },
    };
  }

  if (call.status === 'failed') {
    return {
      id: `action-failed-call-${call.id}`,
      type: 'analysis_failed',
      priority: 'medium',
      elderly_id: call.elderly_id,
      elderly_name: name,
      call_id: call.id,
      title: '상담 실패',
      description: `${name}님과의 상담 연결에 실패했습니다`,
      created_at: call.updated_at || call.created_at,
      cta: {
        label: '상세 보기',
        href: `/calls/${call.id}`,
      },
    };
  }

  return null;
}

// ===========================================
// 오늘의 상담 필터
// ===========================================
export function filterTodayCalls(calls: Call[]): {
  scheduled: Call[];
  in_progress: Call[];
  completed: Call[];
  missed: Call[];
} {
  const today = new Date();

  const todayCalls = calls.filter((call) => {
    const callDate = call.scheduled_for || call.started_at || call.created_at;
    return isToday(parseISO(callDate));
  });

  return {
    scheduled: todayCalls.filter((c) => c.status === 'scheduled'),
    in_progress: todayCalls.filter((c) => c.status === 'in_progress'),
    completed: todayCalls.filter((c) => c.status === 'completed'),
    missed: todayCalls.filter((c) => c.status === 'missed'),
  };
}

// ===========================================
// 최근 이벤트 목록 생성 (Calls에서)
// ===========================================
export function callsToEvents(calls: Call[], elderlyMap?: Map<number, string>): Event[] {
  return calls.map((call) => {
    const elderlyName = elderlyMap?.get(call.elderly_id);
    return callToEvent(call, elderlyName);
  });
}

// ===========================================
// 시간 포맷 유틸리티
// ===========================================
export function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true, locale: ko });
  } catch {
    return dateString;
  }
}

export function formatScheduleTime(timeString: string): string {
  // "HH:mm" 형식을 "오전/오후 H시 M분" 형식으로 변환
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours < 12 ? '오전' : '오후';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return minutes === 0 ? `${period} ${hour12}시` : `${period} ${hour12}시 ${minutes}분`;
}
