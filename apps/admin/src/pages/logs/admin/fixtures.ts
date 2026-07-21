// 관리자 로그 더미 데이터 (apps/admin/src/pages/logs/admin/**)
//
// [이 파일의 역할] 백엔드가 없는 동안 화면을 그리기 위한 **표시용 픽스처**다.
// 비즈니스 로직·저장소가 아니다. 백엔드가 붙으면 data-source.ts 가 실제 HTTP 응답을 돌려주고
// 이 파일은 삭제된다. 실명·실재 호스트 0건의 규율은 ../fixture-lib.ts 에 적혀 있다.
//
// [무엇을 이야기하는 데이터인가 — 픽스처도 시나리오다]
// 무작위 노이즈는 화면을 검증하지 못한다. 이 픽스처에는 감사가 실제로 찾는 **세 가지 사건**이 있다:
//   ① 일상 — 매일의 로그인·등록·수정. 대부분은 아무 일도 아니다(그래서 신호가 눈에 띈다).
//   ② **권한 변경** — 가장 위험한 액션. 누가 누구에게 무슨 권한을 줬는지가 페이로드에 남는다.
//   ③ **삭제 실패 후 성공** — 권한이 없어 막혔다가(실패) 권한을 얻은 뒤 지운 흔적.
//      감사가 읽어내야 하는 것은 개별 행이 아니라 이 **연쇄**다.
// 그리고 페이로드에는 비밀번호·토큰이 **실제로 들어 있다** — 마스킹이 도는지 눈으로 보기 위해서다.
import { atKst, foreignIp, HISTORY_DAYS, newestFirst, padId, usualIp } from '../fixture-lib';
import type { AdminAction, AdminLogEntry, AdminOutcome } from './types';

interface Actor {
  /** 운영자 명부(pages/admins/fixtures.ts)의 id — 행위자를 눌렀을 때 갈 곳 */
  readonly id: string;
  readonly account: string;
  readonly name: string;
  readonly role: string;
}

/**
 * 행위자 4명. **역할은 명부의 A-00001~A-00004 와 같은 순서로 맞춘다** —
 * '최상위 관리자가 뷰어에게 권한을 줬다' 는 이야기가 운영자 관리 화면에서도 그대로 읽혀야
 * 로그의 링크가 거짓말이 되지 않는다. (계정·이름은 감사 로그의 관례대로 마스킹된 값이다.)
 */
const ACTORS: readonly Actor[] = [
  { id: 'A-00001', account: 'ops01@example.com', name: '한**', role: '최상위 관리자' },
  { id: 'A-00002', account: 'ops02@example.com', name: '오**', role: '운영자' },
  { id: 'A-00003', account: 'ops03@example.com', name: '서**', role: '운영자' },
  { id: 'A-00004', account: 'ops04@example.com', name: '신**', role: '뷰어' },
];

interface Draft {
  readonly actor: Actor;
  readonly occurredAtIso: string;
  readonly action: AdminAction;
  readonly targetType: string;
  /** 가리킬 레코드가 없는 사건(목록 내보내기 등)은 null — 그 행은 링크가 되지 않는다 */
  readonly targetId: string | null;
  readonly targetLabel: string;
  readonly outcome: AdminOutcome;
  readonly failureReason: string | null;
  readonly ip: string;
  readonly payload: unknown;
}

/** 일상 — 로그인과 소소한 등록·수정. 대부분의 날은 아무 일도 일어나지 않는다 */
function routine(now: Date): readonly Draft[] {
  const out: Draft[] = [];

  for (let day = 0; day < HISTORY_DAYS; day += 1) {
    ACTORS.forEach((actor, index) => {
      if ((day + index) % 3 !== 0) return;
      const seed = day * 13 + index;

      out.push({
        actor,
        occurredAtIso: atKst(day, 9 + (index % 3), (seed * 7) % 60, seed % 60, now),
        action: 'login',
        targetType: '관리자 계정',
        // 로그인은 자기 계정에 대한 사건이다 — 대상 id 가 곧 행위자 id 다
        targetId: actor.id,
        targetLabel: actor.account,
        outcome: 'success',
        failureReason: null,
        ip: usualIp(seed),
        payload: { method: 'POST', path: '/api/admin/session', rememberMe: index % 2 === 0 },
      });

      if ((day + index) % 6 !== 0) return;
      out.push({
        actor,
        occurredAtIso: atKst(day, 11 + (index % 4), (seed * 11) % 60, (seed * 3) % 60, now),
        action: 'update',
        targetType: '공지사항',
        // 공지 id 는 콘텐츠 관리 픽스처의 'NT-001' 형식과 같은 모양이어야 링크가 산다
        targetId: `NT-${padId((day % 12) + 1, 3)}`,
        targetLabel: `정기점검 안내 (${padId((day % 12) + 1, 2)}월)`,
        outcome: 'success',
        failureReason: null,
        ip: usualIp(seed),
        payload: {
          method: 'PATCH',
          path: `/api/notices/${padId(day + 1, 4)}`,
          before: { isPinned: false },
          after: { isPinned: true },
        },
      });
    });
  }

  return out;
}

/**
 * 권한 변경 — 이 화면이 가장 주의 깊게 보여줘야 하는 액션.
 * '뷰어' 였던 계정이 '운영자' 가 된 순간이 여기 남는다. 페이로드에 전/후가 함께 있어야
 * "누가 언제 무엇을 열어줬는가" 에 답할 수 있다.
 */
function permissionChanges(now: Date): readonly Draft[] {
  const granter = ACTORS[0];
  const target = ACTORS[3];
  if (granter === undefined || target === undefined) return [];

  return [
    {
      actor: granter,
      occurredAtIso: atKst(2, 14, 3, 12, now),
      action: 'permission',
      targetType: '역할',
      // 바뀐 것은 '뷰어' 역할의 권한이다 — 대상은 사람이 아니라 역할이고, 링크는 권한 관리 화면으로 간다.
      // 값은 아래 payload 의 경로(/api/roles/role-viewer/permissions)와 같은 역할 id 다.
      targetId: 'role-viewer',
      targetLabel: `${target.name} (${target.account})`,
      outcome: 'success',
      failureReason: null,
      ip: usualIp(3),
      payload: {
        method: 'PUT',
        path: '/api/roles/role-viewer/permissions',
        before: { role: '뷰어', remove: false, export: false },
        after: { role: '운영자', remove: true, export: true },
        reason: '휴가 대체 인력 — 2주 한시 부여',
      },
    },
  ];
}

/**
 * 삭제: 막힘 → 허용 → 실행.
 * 개별 행은 평범하다. **연쇄가 이야기다** — 권한이 없어 막힌 시도(실패)가 있었고,
 * 위의 권한 변경이 있었고, 그 다음 같은 계정이 같은 대상을 지웠다.
 */
function deletionChain(now: Date): readonly Draft[] {
  const actor = ACTORS[3];
  if (actor === undefined) return [];

  const targetLabel = 'user1042@example.com';
  // 지워진 그 회원 — 회원 활동 로그의 M-00042 와 같은 사람이다(두 화면이 같은 사건을 가리킨다)
  const targetId = 'M-00042';

  return [
    {
      actor,
      occurredAtIso: atKst(3, 16, 40, 8, now),
      action: 'delete',
      targetType: '회원',
      targetId,
      targetLabel,
      outcome: 'failure',
      failureReason: '권한 없음 (403)',
      ip: usualIp(9),
      payload: { method: 'DELETE', path: '/api/members/M-00042', status: 403 },
    },
    {
      actor,
      occurredAtIso: atKst(1, 10, 5, 51, now),
      action: 'delete',
      targetType: '회원',
      targetId,
      targetLabel,
      outcome: 'success',
      failureReason: null,
      ip: usualIp(9),
      payload: { method: 'DELETE', path: '/api/members/M-00042', status: 200, softDelete: true },
    },
  ];
}

/**
 * 낯선 IP 에서의 로그인 실패 — 페이로드에 **비밀번호가 그대로 들어 있다.**
 *
 * 이것은 실수가 아니라 **의도한 픽스처**다. 실제 시스템의 로그에는 이런 것이 실제로 남고
 * (프레임워크가 요청 본문을 통째로 찍는다), 그것이 masking.ts 가 존재하는 이유다.
 * 이 행의 상세를 열면 `password` 는 반드시 가려져 있어야 한다 — 그러지 않으면 이 화면은
 * 감사 도구가 아니라 자격증명 열람 창구다. (`logs.test.ts` 가 그것을 단언한다.)
 */
function suspiciousLogins(now: Date): readonly Draft[] {
  const actor = ACTORS[1];
  if (actor === undefined) return [];

  return Array.from({ length: 4 }, (_, i) => ({
    actor,
    occurredAtIso: atKst(1, 3, 12 + i * 2, (i * 17) % 60, now),
    action: 'login' as AdminAction,
    targetType: '관리자 계정',
    targetId: actor.id,
    targetLabel: actor.account,
    outcome: 'failure' as AdminOutcome,
    failureReason: i + 1 < 4 ? '비밀번호 불일치' : '계정 잠김',
    ip: foreignIp(9),
    payload: {
      method: 'POST',
      path: '/api/admin/session',
      body: { email: actor.account, password: 'Sup3rSecret!2026' },
      headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature' },
    },
  }));
}

/** 대량 내보내기 — 개인정보가 파일로 나간 사건. 감사에서 이것은 '조회'가 아니라 '반출'이다 */
function exports_(now: Date): readonly Draft[] {
  const actor = ACTORS[1];
  if (actor === undefined) return [];

  return [
    {
      actor,
      occurredAtIso: atKst(5, 17, 22, 4, now),
      action: 'export',
      targetType: '회원 목록',
      // 반출은 **단건 레코드에 대한 사건이 아니다** — 가리킬 id 가 없으므로 링크도 없다.
      // 없는 대상을 억지로 회원 목록 링크로 만들면 '이 로그가 가리키는 그 회원' 이 있다고 거짓말하게 된다.
      targetId: null,
      targetLabel: '전체 회원 (필터: 등급=VIP)',
      outcome: 'success',
      failureReason: null,
      ip: usualIp(5),
      payload: { method: 'GET', path: '/api/members/export', rows: 1284, format: 'csv' },
    },
  ];
}

function build(now: Date = new Date()): readonly AdminLogEntry[] {
  const drafts = [
    ...routine(now),
    ...permissionChanges(now),
    ...deletionChain(now),
    ...suspiciousLogins(now),
    ...exports_(now),
  ];

  const entries = drafts.map((draft, index) => ({
    id: `AL-${padId(index + 1, 5)}`,
    occurredAtIso: draft.occurredAtIso,
    actorId: draft.actor.id,
    actorAccount: draft.actor.account,
    actorName: draft.actor.name,
    actorRole: draft.actor.role,
    action: draft.action,
    targetType: draft.targetType,
    targetId: draft.targetId,
    targetLabel: draft.targetLabel,
    outcome: draft.outcome,
    failureReason: draft.failureReason,
    ip: draft.ip,
    payload: draft.payload,
  }));

  return newestFirst(entries);
}

/** 목록 화면이 소비하는 픽스처 — '오늘' 기준으로 만들어진다(‘오늘/최근 7일’ 필터가 비지 않게) */
export const ADMIN_LOGS: readonly AdminLogEntry[] = build();
