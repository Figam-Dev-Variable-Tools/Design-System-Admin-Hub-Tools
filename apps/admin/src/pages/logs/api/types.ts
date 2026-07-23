// API 로그 **전용** 타입 (apps/admin/src/pages/logs/api/**)
//
// [무엇을 기록하는가] **시스템이 주고받은 HTTP 요청.** 어떤 클라이언트가 어느 엔드포인트를
// 어떤 결과·얼마의 시간으로 호출했는가. 이 화면은 "연동이 왜 안 되죠?" · "누가 우리 API 를
// 두드리고 있죠?" 에 답한다.
//
// [앞의 두 화면과 무엇이 다른가] 행위자가 사람이 아니라 **키(client)** 다. 그래서
//   · 검색은 경로·클라이언트·요청 ID 로 하고,
//   · 축은 '결과'가 아니라 **상태 코드 계열**(2xx/4xx/5xx)이며,
//   · 응답 시간이라는 **숫자 컬럼**이 처음 등장한다 (정렬·tabular-nums — ERP-04).
import type { LogEntryBase, LogFilterAxis, RetentionPolicy } from '../types';
import { ALL_FILTER } from '../types';

/* ── 메서드 ──────────────────────────────────────────────────────────────── */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

const HTTP_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

/* ── 상태 코드 계열 ──────────────────────────────────────────────────────── */

/**
 * 상태 코드를 **낱개가 아니라 계열로** 나눈다.
 * 운영자가 묻는 것은 '404 가 몇 건인가'가 아니라 '깨진 게 있나(5xx)' · '누가 잘못 부르나(4xx)' 다.
 */
type StatusClass = '2xx' | '4xx' | '5xx';

const STATUS_CLASS_LABEL: Record<StatusClass, string> = {
  '2xx': '성공 (2xx)',
  '4xx': '요청 오류 (4xx)',
  '5xx': '서버 오류 (5xx)',
};

/** 상태 코드 → 계열. 3xx 는 이 API 에 없어 2xx 로 접는다(리다이렉트를 쓰지 않는 JSON API 다) */
export function statusClassOf(status: number): StatusClass {
  if (status >= 500) return '5xx';
  if (status >= 400) return '4xx';
  return '2xx';
}

/* ── 항목 ────────────────────────────────────────────────────────────────── */

export interface ApiLogEntry extends LogEntryBase {
  readonly occurredAtIso: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly status: number;
  /** 응답 시간(밀리초) — 숫자 컬럼. 느린 엔드포인트를 찾는 유일한 단서다 */
  readonly durationMs: number;
  /** 부른 쪽의 이름 ('모바일 앱' · '파트너사 정산 배치') */
  readonly client: string;
  /**
   * 클라이언트가 쓴 API 키. **날것 그대로 담는다** — 표시할 때 뒤 4자만 남기고 가린다.
   * 뒤 4자를 남기는 이유: '어느 키였나'를 대조해야 그 키를 폐기할 수 있다.
   */
  readonly apiKey: string;
  /** 요청 추적 ID — 서버 로그와 대조하는 열쇠 (EXC-20 의 reference) */
  readonly requestId: string;
  readonly clientIp: string;
  readonly payload: unknown;
}

/* ── 좌측 필터 축 ────────────────────────────────────────────────────────── */

export const API_LOG_AXES: readonly LogFilterAxis[] = [
  {
    key: 'status',
    heading: '상태',
    ariaLabel: '응답 상태 필터',
    options: [
      { id: ALL_FILTER, label: '전체' },
      ...(Object.keys(STATUS_CLASS_LABEL) as StatusClass[]).map((id) => ({
        id,
        label: STATUS_CLASS_LABEL[id],
      })),
    ],
  },
  {
    key: 'method',
    heading: '메서드',
    ariaLabel: 'HTTP 메서드 필터',
    options: [
      { id: ALL_FILTER, label: '전체' },
      ...HTTP_METHODS.map((method) => ({ id: method, label: method })),
    ],
  },
];

/* ── 표시 규칙 ───────────────────────────────────────────────────────────── */

/**
 * 이 시간을 넘으면 느린 것으로 본다(밀리초).
 * 1초는 사람이 '멈췄다'고 느끼기 시작하는 지점이고, API 에서는 이미 사고다.
 */
export const SLOW_THRESHOLD_MS = 1000;

/* ── 보존기간 ────────────────────────────────────────────────────────────── */

/**
 * API 로그는 **가장 짧게** 남긴다 (90일).
 * 부피가 압도적이고(관리자 로그의 수천 배) 가치는 빨리 식는다 —
 * 석 달 전의 응답 시간은 아무도 묻지 않는다. 오래 남길수록 비용만 남는 로그다.
 */
export const API_LOG_RETENTION: RetentionPolicy = {
  label: '90일',
  basis: '트래픽 부피가 커 단기 보존해요. 보존기간이 지나면 자동 폐기돼요.',
};
