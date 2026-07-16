// 오류 로그 **전용** 타입 (apps/admin/src/pages/logs/errors/**)
//
// [무엇을 기록하는가] **시스템이 스스로 실패한 사건.** 앞의 세 화면이 '누가 무엇을 했나'라면
// 이 화면은 '무엇이 깨졌나'다. 그래서 유일하게 **행위자가 없다** — 아무도 하지 않았는데 일어난 일이다.
//
// [해결 버튼이 없는 이유]
// 오류 추적 도구(Sentry 등)에는 '해결됨' 토글이 있다. **여기에는 없다.**
// 이것은 이슈 트래커가 아니라 감사 로그다 — 일어난 일은 일어난 일이고, 그 사실을 나중에
// '해결됨'으로 덧칠할 수 있다면 그것은 이미 불변 기록이 아니다. 고치는 일은 이슈 트래커에서 하고,
// 여기에는 **일어났다는 사실만** 남는다.
import type { LogEntryBase, LogFilterAxis, RetentionPolicy } from '../types';
import { ALL_FILTER } from '../types';

/* ── 심각도 ──────────────────────────────────────────────────────────────── */

/**
 * 심각도 3단계.
 * **경고(warning)를 오류와 섞지 않는다** — 섞으면 진짜 사고가 잡음에 묻힌다.
 * 그것이 '오류 로그를 아무도 안 보는' 가장 흔한 이유다.
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning';

export const ERROR_SEVERITY_LABEL: Record<ErrorSeverity, string> = {
  critical: '치명',
  error: '오류',
  warning: '경고',
};

/** 심각한 순서 — 정렬이 '치명 → 오류 → 경고' 로 읽히게 한다 (사전순이면 '경고'가 맨 위로 온다) */
export const ERROR_SEVERITY_RANK: Record<ErrorSeverity, number> = {
  critical: 0,
  error: 1,
  warning: 2,
};

/* ── 항목 ────────────────────────────────────────────────────────────────── */

export interface ErrorLogEntry extends LogEntryBase {
  readonly occurredAtIso: string;
  readonly severity: ErrorSeverity;
  /** 어디서 깨졌나 ('결제 서비스' · '주문 API') */
  readonly source: string;
  /** 오류 코드 — 같은 오류를 묶는 열쇠 ('PAYMENT_GATEWAY_TIMEOUT') */
  readonly code: string;
  /** 한 줄 메시지 — 사람이 읽는 요약 */
  readonly message: string;
  /**
   * **같은 오류가 몇 번 일어났나.** 1회와 340회는 완전히 다른 사건이다 —
   * 이 숫자가 없으면 표에서 둘이 똑같이 한 줄로 보인다.
   */
  readonly occurrences: number;
  /**
   * 서버 로그와 대조하는 추적 ID (EXC-20 의 reference).
   * 운영자가 이것을 복사해 개발자에게 준다 — 없으면 '오류 났어요' 로 끝나 아무도 못 찾는다.
   */
  readonly traceId: string;
  /** 스택·컨텍스트. 날것 그대로 (마스킹은 표시 시점에 — ../masking.ts) */
  readonly payload: unknown;
}

/* ── 좌측 필터 축 ────────────────────────────────────────────────────────── */

/** 발생 위치 — 픽스처가 쓰는 목록과 같아야 한다 (축의 값은 fixtures 의 source 와 1:1) */
export const ERROR_SOURCES = [
  '결제 서비스',
  '주문 API',
  '알림 발송',
  '정산 배치',
  '이미지 업로드',
] as const;

export const ERROR_LOG_AXES: readonly LogFilterAxis[] = [
  {
    key: 'severity',
    heading: '심각도',
    ariaLabel: '심각도 필터',
    options: [
      { id: ALL_FILTER, label: '전체' },
      ...(Object.keys(ERROR_SEVERITY_LABEL) as ErrorSeverity[]).map((id) => ({
        id,
        label: ERROR_SEVERITY_LABEL[id],
      })),
    ],
  },
  {
    key: 'source',
    heading: '발생 위치',
    ariaLabel: '발생 위치 필터',
    options: [
      { id: ALL_FILTER, label: '전체' },
      ...ERROR_SOURCES.map((source) => ({ id: source, label: source })),
    ],
  },
];

/* ── 보존기간 ────────────────────────────────────────────────────────────── */

/**
 * 오류 로그는 **180일**. API 로그(90일)보다 길고 관리자 로그(3년)보다 짧다.
 * 부피는 크지만 '작년에도 이랬나'(재발 판단)를 물을 일이 실제로 있고, 반기면 대개 답이 된다.
 */
export const ERROR_LOG_RETENTION: RetentionPolicy = {
  label: '180일',
  basis: '재발 추적에 필요한 기간. 보존기간이 지나면 자동 폐기됩니다.',
};
