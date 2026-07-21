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
  /**
   * 행위자의 운영자 id — 이 값이 있으면 계정이 `/users/admins/:id` 로 가는 링크가 된다.
   *
   * **null 일 수 있다.** id 체계가 생기기 전에 쌓인 옛 행에는 애초에 값이 없고, 명부에서 지워진
   * 계정도 가리킬 레코드가 없다. 그때는 링크 대신 계정 글자만 남긴다 — 없는 화면으로 보내
   * '찾을 수 없습니다'를 띄우는 것보다 낫다 (회원 활동 로그의 memberId 와 같은 규칙).
   */
  readonly actorId: string | null;
  /** 행위자 계정(이메일) — 개인정보라 마스킹된 채로 내려온다 */
  readonly actorAccount: string;
  /** 행위자 이름 — 마스킹 ('한**') */
  readonly actorName: string;
  /** 그 시점의 역할. **로그에 박제된다** — 지금 역할이 바뀌어도 그때의 권한이 남아야 감사가 된다 */
  readonly actorRole: string;
  readonly action: AdminAction;
  /** 무엇에 했는가 ('회원' · '공지사항' · '역할') */
  readonly targetType: string;
  /**
   * 대상 레코드의 id — targetType 과 짝이 되어 이동 경로를 만든다 (adminLogTargetPath).
   *
   * **null 일 수 있다.** '회원 목록 내보내기'처럼 대상이 단건이 아닌 사건이 있고, 옛 행에는
   * id 가 없다. 그때는 대상 이름을 글자로만 그린다 — actorId 와 같은 이유다.
   */
  readonly targetId: string | null;
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

/* ── 로그에서 화면으로 (감사의 다음 한 걸음) ─────────────────────────────── */

/**
 * `targetType` → 그 대상의 화면 경로.
 *
 * **키 있는 Record 다.** 목록을 훑어 찾다가 못 찾으면 첫 항목으로 흘러가는 fallback
 * (`find(...) ?? [0]`)은 조용히 엉뚱한 화면을 연다 — 감사에서 그것은 오답보다 나쁘다.
 * 모르는 유형은 undefined 로 남고, 그 행은 링크가 아니라 글자로 그려진다(무엇의 기록인지는 여전히 읽힌다).
 *
 * ['역할' 만 id 를 쓰지 않는 이유] 역할은 단건 상세 라우트가 없다 — 권한 관리 화면 한 장이
 * 역할 전부를 다룬다. 있지도 않은 `/users/roles/:id` 를 지어내는 대신 그 화면으로 보낸다.
 */
const TARGET_ROUTES: Readonly<Record<string, (id: string) => string>> = {
  '관리자 계정': (id) => `/users/admins/${id}`,
  회원: (id) => `/users/members/${id}`,
  공지사항: (id) => `/content/notices/${id}`,
  역할: () => '/users/roles',
};

/** 행위자 → 운영자 상세. id 가 없으면 null(= 링크로 만들지 않는다) */
export function adminLogActorPath(entry: Pick<AdminLogEntry, 'actorId'>): string | null {
  return entry.actorId === null ? null : `/users/admins/${entry.actorId}`;
}

/** 대상 → 그 대상의 화면. id 가 없거나 모르는 유형이면 null(= 링크로 만들지 않는다) */
export function adminLogTargetPath(
  entry: Pick<AdminLogEntry, 'targetType' | 'targetId'>,
): string | null {
  if (entry.targetId === null) return null;
  const toPath = TARGET_ROUTES[entry.targetType];
  return toPath === undefined ? null : toPath(entry.targetId);
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
