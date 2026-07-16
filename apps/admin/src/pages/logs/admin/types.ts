// 관리자 로그 **전용** 타입 (apps/admin/src/pages/logs/admin/**)
//
// [무엇을 기록하는가] **운영자가 시스템에 한 일.** 누가(actor) · 무엇을(target) · 어떻게(action) ·
// 됐는가(outcome). 이 화면은 "그 회원 등급 누가 바꿨어요?" 에 답하기 위해 존재한다.
//
// [쓰기 payload 타입이 없다] 회원 관리의 CreateGroupInput 에 해당하는 것이 여기엔 없다 —
// 감사 로그는 이 앱이 만들지도 고치지도 않는다. 없다는 것이 설계다 (../types.ts 참조).
import type { LogEntryBase, LogFilterAxis, RetentionPolicy } from '../types';
import { ALL_FILTER } from '../types';

/* ── 액션 ────────────────────────────────────────────────────────────────── */

/**
 * 운영자가 할 수 있는 일의 종류.
 * 권한 매트릭스의 액션 5종(read/create/update/remove/export)과 **일부러 다르다** —
 * 권한은 '무엇을 할 수 있는가'이고 로그는 '무엇을 했는가'다. 로그인/로그아웃·권한 변경처럼
 * 권한 액션에 없는 사건이 감사에서는 가장 중요하다.
 */
export type AdminAction =
  'login' | 'logout' | 'create' | 'update' | 'delete' | 'export' | 'permission';

export const ADMIN_ACTION_LABEL: Record<AdminAction, string> = {
  login: '로그인',
  logout: '로그아웃',
  create: '등록',
  update: '수정',
  delete: '삭제',
  export: '내보내기',
  permission: '권한 변경',
};

export type AdminOutcome = 'success' | 'failure';

export const ADMIN_OUTCOME_LABEL: Record<AdminOutcome, string> = {
  success: '성공',
  failure: '실패',
};

/* ── 항목 ────────────────────────────────────────────────────────────────── */

export interface AdminLogEntry extends LogEntryBase {
  /** 시도 시각 — **오프셋을 가진 ISO** (표시는 KST 로 환산한다 — ../time.ts) */
  readonly occurredAtIso: string;
  /** 행위자 계정(이메일) — 개인정보라 마스킹된 채로 내려온다 */
  readonly actorAccount: string;
  /** 행위자 이름 — 마스킹 ('한**') */
  readonly actorName: string;
  /** 그 시점의 역할. **로그에 박제된다** — 지금 역할이 바뀌어도 그때의 권한이 남아야 감사가 된다 */
  readonly actorRole: string;
  readonly action: AdminAction;
  /** 무엇에 했는가 ('회원' · '공지사항' · '역할') */
  readonly targetType: string;
  /** 대상의 사람이 읽는 이름 ('user1042@example.com' · '7월 정기점검 안내') */
  readonly targetLabel: string;
  readonly outcome: AdminOutcome;
  /** 성공이면 null */
  readonly failureReason: string | null;
  readonly ip: string;
  /**
   * 요청 본문 또는 변경 전/후. **날것 그대로** 담는다 —
   * 마스킹은 화면에 그리는 순간 masking.ts 가 한다 (여기서 가리면 한 곳만 잊어도 유출이다).
   */
  readonly payload: unknown;
}

/* ── 좌측 필터 축 ────────────────────────────────────────────────────────── */

export const ADMIN_LOG_AXES: readonly LogFilterAxis[] = [
  {
    key: 'outcome',
    heading: '결과',
    ariaLabel: '처리 결과 필터',
    options: [
      { id: ALL_FILTER, label: '전체' },
      { id: 'success', label: '성공' },
      { id: 'failure', label: '실패' },
    ],
  },
  {
    key: 'action',
    heading: '액션',
    ariaLabel: '액션 종류 필터',
    options: [
      { id: ALL_FILTER, label: '전체' },
      ...(Object.keys(ADMIN_ACTION_LABEL) as AdminAction[]).map((action) => ({
        id: action,
        label: ADMIN_ACTION_LABEL[action],
      })),
    ],
  },
];

/* ── 보존기간 ────────────────────────────────────────────────────────────── */

/**
 * 관리자 로그는 **가장 오래 남는다.**
 * 내부 통제·감사 대응의 1차 증거이고, 사고는 몇 달 뒤에 발견되는 일이 흔하다 —
 * 90일만 남기면 그때는 이미 기록이 없다.
 */
export const ADMIN_LOG_RETENTION: RetentionPolicy = {
  label: '3년',
  basis: '내부 통제·감사 대응 기록. 보존기간이 지나면 자동 폐기됩니다.',
};
