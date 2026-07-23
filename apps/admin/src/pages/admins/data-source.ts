// 관리자(운영진) 데이터 소스 어댑터
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다.
// 지금은 fixtures.ts 의 더미 데이터를 돌려준다. 백엔드가 준비되면 **이 파일의 함수 본문만**
// 실제 HTTP 호출로 교체하면 되고, 화면 코드(AdminsPage/MemberDetailPage)는 한 줄도 바뀌지 않는다.
// 서버·엔드포인트·비즈니스 로직을 여기에 구현하지 않는다.
//
//
// [운영자 상세는 운영자의 것이다] 예전에는 `fetchAdminDetail` 이 운영자를 **회원 상세와 같은
// MemberDetail** 로 꾸며 돌려주고, App.tsx 가 그것을 회원 상세 화면에 주입했다. 그 결과 상세의
// ⋯ 메뉴가 **회원 어댑터**의 삭제·알림을 불러 운영자 id 로 회원 엔드포인트를 때렸다. 재사용이
// 아니라 오배선이었다 — 함수와 변환기(buildAdminDetail)를 함께 지우고 아래 운영자 CRUD 로 바꿨다.
import { currentOperatorAccount } from '../../shared/auth/current-operator';
import { adminGroupDeletionBlock } from '../../shared/domain/admin-group';
import type { AdminGroupDraft } from '../../shared/domain/admin-group';
import { HTTP_STATUS, HttpError } from '../../shared/errors/http-error';
// 시스템 역할이 무엇인지는 권한 스토어가 안다 — 훅이 아니라 getState() 로 읽는다(여기는 React 밖이다)
import { usePermissionStore } from '../../shared/permissions/permission-store';
import type { CrudAdapter } from '../../shared/crud';
import {
  REGISTERED_SENDER_PHONES,
  addAdminGroup,
  findAdminGroup,
  listAdminGroups,
  removeAdminGroup,
  senderTemplateNamesOf,
} from '../../shared/fixtures/admin-groups';
// [경계 넘기 1건 — 의도적이다] 삭제 가드는 '이 그룹을 가리키는 것이 남아 있는가' 라는
// **참조 무결성** 규칙이고, 실물 서버에서는 DELETE 가 422 로 거절하며 스스로 판정한다. 백엔드가
// 없는 지금 그 두 사실(운영자 명부 · 템플릿 명부)이 한자리에 모이는 곳은 이 어댑터뿐이다.
// 어댑터는 명시적인 '백엔드 자리' 이므로(파일 머리말) 화면이 아니라 여기서 넘어간다 —
// 백엔드가 붙으면 이 import 는 픽스처와 함께 사라진다.
import { adminDeletionBlock, adminRoleChangeBlock } from './guards';
import type { AdminGuardContext } from './guards';
import {
  addAdmin,
  DUPLICATE_ADMIN_ACCOUNT,
  findAdmin,
  listAdmins,
  patchAdmin,
  removeAdmin,
} from './fixtures';
import { GROUP_ALL, PAGE_SIZE, ROLE_ALL } from './types';
import type {
  AdminDraft,
  AdminGroup,
  AdminGroupCounts,
  AdminGroupUsage,
  AdminListResult,
  AdminUser,
} from './types';

/** 네트워크 왕복 체감 — 화면의 로딩/스켈레톤 경로를 실제로 타게 하는 최소한의 지연 */
const LATENCY_MS = 400;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('요청이 취소되었어요.', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * 실패 경로 재현 스위치 (개발용) — `pages/members/data-source.ts` 의 같은 이름 함수와 동일한 규약이다.
 *
 * 백엔드가 없어 이 어댑터는 항상 성공한다 — 그러면 화면의 실패 분기(다이얼로그 안 오류 배너·
 * 재시도)를 눈으로 확인할 방법이 없다. 그래서 쿼리 파라미터로만 실패를 재현한다.
 *
 *   /users/admins?fail=createGroup   → 그룹 생성이 실패한다
 *   /users/admins?fail=deleteGroup   → 그룹 삭제가 실패한다
 *   /users/admins/A-00002?fail=detail       → 운영자 상세 조회가 실패한다
 *   /users/admins/new?fail=createAdmin      → 운영자 등록이 실패한다
 *   /users/admins/A-00002/edit?fail=updateAdmin → 운영자 수정이 실패한다
 *   /users/admins/A-00002?fail=deleteAdmin  → 운영자 삭제가 실패한다
 *   /users/admins?fail=all           → 이 화면의 모든 호출이 실패한다
 *
 * 백엔드가 붙으면 이 함수와 호출부는 함께 사라진다.
 */
type FailureOp =
  | 'all'
  | 'admins'
  | 'groups'
  | 'detail'
  | 'createGroup'
  | 'deleteGroup'
  | 'groupUsage'
  | 'createAdmin'
  | 'updateAdmin'
  | 'deleteAdmin';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;

  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했어요.');
  }
}

export interface AdminQuery {
  /** 그룹 id 또는 GROUP_ALL */
  readonly groupId: string;
  /**
   * 역할 id 또는 ROLE_ALL.
   *
   * [왜 화면에서 거르지 않고 조회 조건인가] 목록은 서버 페이지네이션이다(PAGE_SIZE 단위로 잘라
   * 돌려준다). 받아 온 10건에서 역할을 거르면 '1페이지에 3건, 2페이지에 7건' 처럼 페이지마다
   * 건수가 들쭉날쭉해지고 total 도 거짓이 된다. 거르는 일은 자르기 **전에** 일어나야 한다.
   */
  readonly roleId: string;
  /** 닉네임·계정 검색어 */
  readonly keyword: string;
  readonly page: number;
}

function countByGroup(admins: readonly AdminUser[]): AdminGroupCounts {
  const counts: Record<string, number> = {};
  // 그룹이 생기고 사라져도 배지가 따라온다 — 정본 저장소를 매번 다시 읽는다(스냅샷을 붙들지 않는다)
  for (const group of listAdminGroups()) counts[group.id] = 0;
  for (const admin of admins) {
    counts[admin.groupId] = (counts[admin.groupId] ?? 0) + 1;
  }
  return counts;
}

/** 그룹 + 역할 + 닉네임/계정 키워드 — 서버 쿼리로 대체될 자리 */
function applyQuery(query: AdminQuery): readonly AdminUser[] {
  const keyword = query.keyword.trim().toLowerCase();
  return listAdmins().filter((admin) => {
    if (query.groupId !== GROUP_ALL && admin.groupId !== query.groupId) return false;
    if (query.roleId !== ROLE_ALL && admin.roleId !== query.roleId) return false;
    if (keyword === '') return true;
    return (
      admin.nickname.toLowerCase().includes(keyword) ||
      admin.account.toLowerCase().includes(keyword)
    );
  });
}

// TODO(backend): GET /api/admins?groupId=&keyword=&page=&size=
export async function fetchAdmins(
  query: AdminQuery,
  signal: AbortSignal,
): Promise<AdminListResult> {
  await wait(LATENCY_MS, signal);
  failIfRequested('admins');

  // 좌측 패널의 숫자(전체/그룹별)는 검색과 무관한 전체 기준이어야 한다
  const all = listAdmins();
  const filtered = applyQuery(query);
  const start = (query.page - 1) * PAGE_SIZE;

  return {
    admins: filtered.slice(start, start + PAGE_SIZE),
    totalAll: all.length,
    groupCounts: countByGroup(all),
    total: filtered.length,
  };
}

/** 좌측 패널의 운영진 그룹 목록 = 발신 프로필 목록 (정본은 shared/fixtures/admin-groups.ts) */
// TODO(backend): GET /api/admin-groups
export async function fetchAdminGroups(signal: AbortSignal): Promise<readonly AdminGroup[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('groups');
  return listAdminGroups();
}

/**
 * 그룹 생성 폼이 고를 수 있는 발신번호 — **사전등록된 것만**.
 *
 * 화면이 번호를 손으로 치게 두면 저장은 되고 발송만 실패한다(발신번호 사전등록제 —
 * shared/fixtures/admin-groups.ts 머리말). 그래서 목록을 받아 셀렉트로 고르게 한다.
 */
// TODO(backend): GET /api/sender-phones
export async function fetchRegisteredSenderPhones(signal: AbortSignal): Promise<readonly string[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('groups');
  return REGISTERED_SENDER_PHONES;
}

/* ── 쓰기 계열 ──────────────────────────────────────────────────────────────
 *
 * 모달·다이얼로그가 닫히면 화면이 abort 한다 — 취소된 요청의 결과는 배너로 튀어나오지 않는다.
 */

/** '+ 새 그룹 만들기' 제출 */
// TODO(backend): POST /api/admin-groups
//   요청: { name, phoneNumbers: string[], emails: string[], usableAsSender: boolean }
//   응답 201: AdminGroup  /  409 ADMIN_GROUP_NAME_DUPLICATED
export async function createAdminGroup(
  draft: AdminGroupDraft,
  signal?: AbortSignal,
): Promise<AdminGroup> {
  await wait(LATENCY_MS, signal);
  failIfRequested('createGroup');
  // 이름 중복은 저장소가 판정한다 — 서버가 409 로 거절하는 자리다
  return addAdminGroup(draft);
}

/**
 * 삭제 전 참조 현황 — 화면이 '지울 수 있는가' 를 **누르기 전에** 말하기 위한 조회다.
 *
 * [왜 삭제 요청의 실패로만 알리지 않는가] ConfirmDialog 에는 확인 버튼을 잠그는 수단이 없다
 * (@tds/ui 계약에 confirmDisabled 가 없다). 막힌 그룹에 대해 다이얼로그를 띄우면 눌러도 매번
 * 같은 오류만 나오는 버튼을 보여 주게 된다. 그래서 **막힌 경우에는 다이얼로그를 열지 않고**
 * 이유를 화면에 띄운다. 삭제 자체의 가드는 아래 deleteAdminGroup 이 그대로 갖는다(경합 대비).
 */
/**
 * 발신 사용처 — 조회기가 배선되지 않았으면 **삭제를 막는다**.
 *
 * 모르는 것을 '없음' 으로 읽으면 발신 프로필로 쓰이는 그룹이 조용히 지워진다. 확인할 수 없을
 * 때는 거절하는 쪽이 옳다 (shared/fixtures/admin-groups.ts 의 registerSenderUsageLookup 머리말).
 */
const UNKNOWN_SENDER_USAGE = '__사용처 확인 불가__';

function senderUsageOrBlock(id: string): readonly string[] {
  return senderTemplateNamesOf(id) ?? [UNKNOWN_SENDER_USAGE];
}

// TODO(backend): GET /api/admin-groups/:id/usage
export async function fetchAdminGroupUsage(
  id: string,
  signal?: AbortSignal,
): Promise<AdminGroupUsage> {
  await wait(LATENCY_MS, signal);
  failIfRequested('groupUsage');
  return {
    adminCount: listAdmins().filter((admin) => admin.groupId === id).length,
    senderTemplateNames: senderUsageOrBlock(id),
  };
}

/**
 * 그룹 삭제.
 *
 * 가드는 **여기에도** 있다. 화면이 미리 조회한 현황과 삭제 시점 사이에 다른 관리자가 운영자를
 * 옮기거나 템플릿을 만들 수 있기 때문이다 — 화면의 사전 확인은 안내이고, 거절의 책임은 서버(이
 * 어댑터)에 있다.
 */
// TODO(backend): DELETE /api/admin-groups/:id
//   응답 204  /  404 ADMIN_GROUP_NOT_FOUND  /  422 ADMIN_GROUP_IN_USE (본문 message 를 그대로 표시)
export async function deleteAdminGroup(id: string, signal?: AbortSignal): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('deleteGroup');

  const group = findAdminGroup(id);
  if (group === null) throw new Error('그룹을 찾을 수 없어요.');

  const blocked = adminGroupDeletionBlock(group.name, {
    adminCount: listAdmins().filter((admin) => admin.groupId === id).length,
    senderTemplateNames: senderUsageOrBlock(id),
  });
  if (blocked !== null) throw new Error(blocked);

  removeAdminGroup(id);
}

/* ── 운영자 CRUD ─────────────────────────────────────────────────────────────
 *
 * [가드는 화면에도 있고 여기에도 있다 — 중복이 아니라 역할 분담이다]
 * 화면은 누르기 전에 이유를 말하기 위해(버튼을 잠그고 사유를 띄운다) 가드를 본다. 그러나 그 확인과
 * 실제 요청 사이에는 시간이 있다: 다른 탭의 관리자가 그 사이에 유일한 시스템 관리자를 강등하면,
 * 화면이 '지워도 된다' 고 판단했던 대상이 삭제 시점에는 마지막 한 명이 되어 있다. 화면의 사전 확인은
 * **안내**이고 거절의 책임은 서버(이 어댑터)에 있다 — deleteAdminGroup 이 같은 이유로 같은 모양이다.
 * 문구는 양쪽 모두 guards.ts 에서 온다(경로에 따라 다른 문장을 말하지 않기 위해서다).
 */

/**
 * 지금 판정에 쓸 사실들을 모은다.
 *
 * 가드 자체는 아무것도 읽지 않는 순수 함수라(guards.ts), '무엇이 사실인가' 를 아는 이 자리가
 * 명부·역할·세션을 한 번에 긁어 넘긴다. 백엔드가 붙으면 이 세 줄은 서버 세션과 DB 조회가 된다.
 */
function guardContext(): AdminGuardContext {
  const { roles } = usePermissionStore.getState().roleState;
  return {
    admins: listAdmins(),
    systemRoleIds: new Set(roles.filter((role) => role.system).map((role) => role.id)),
    currentAccount: currentOperatorAccount(),
  };
}

/** 운영자 상세 — 회원이 아니라 **운영자**(AdminUser)를 그대로 돌려준다 */
// TODO(backend): GET /api/admins/:id
//   응답 200: AdminUser  /  404 ADMIN_NOT_FOUND
export async function fetchAdmin(id: string, signal: AbortSignal): Promise<AdminUser> {
  await wait(LATENCY_MS, signal);
  failIfRequested('detail');

  const admin = findAdmin(id);
  // [EXC-12] 404 와 5xx 는 복구 수단이 다르다 — status 를 실어야 화면이 '목록으로' 와 '다시 시도' 를 가른다
  if (admin === null) throw new HttpError(HTTP_STATUS.notFound, '운영자를 찾을 수 없어요.');

  return admin;
}

/**
 * 페이지네이션 없는 전체 명부.
 *
 * [왜 fetchAdmins 와 따로 있나 — 묻는 질문이 다르다]
 * 목록 화면은 '이 필터·이 페이지에 보일 사람들' 을 묻고, 가드는 **'시스템 관리자가 몇 명 남았나'**
 * 를 묻는다. 뒤의 질문은 한 페이지를 봐서는 답할 수 없다 — 10명씩 끊긴 목록으로 세면 11번째
 * 시스템 관리자가 없는 것으로 보이고, 가드는 지워도 되는 사람을 막거나(가벼운 실패) 막아야 할
 * 사람을 통과시킨다(치명적 실패). CrudAdapter 계약의 fetchAll 자리이기도 하다.
 */
// TODO(backend): GET /api/admins/roster (권한 판정용 축약 명부 — id·account·roleId 만으로 충분하다)
export async function fetchAdminRoster(signal: AbortSignal): Promise<readonly AdminUser[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('admins');
  return listAdmins();
}

/** 계정 중복은 명부를 쥔 쪽이 판정한다 — 폼 스키마는 명부를 모른다(validation.ts) */
function toWriteError(cause: unknown): Error {
  if (cause instanceof Error && cause.message === DUPLICATE_ADMIN_ACCOUNT) {
    // 422 로 던지면 useCrudForm 이 그 필드에 인라인 오류를 꽂고 포커스를 옮긴다 (EXC-07)
    return new HttpError(HTTP_STATUS.unprocessable, cause.message, {
      violations: [{ field: 'account', message: cause.message }],
    });
  }
  return cause instanceof Error ? cause : new Error('요청을 처리하지 못했어요.');
}

/**
 * 운영자 등록.
 *
 * [왜 export 하지 않나] 이 함수를 부르는 곳은 아래 adminAdapter 하나다 — 폼은 어댑터를 통해서만
 * 쓰기에 닿는다(useCrudForm 계약). export 하면 import 하는 곳 0건인 공개 표면이 되고, 그것은
 * 지울 때 파급 범위를 알 수 없게 만드는 죽은 표면이다(클린코드 점검 축5). 백엔드 연동 지점으로서의
 * 계약은 export 여부가 아니라 **아래 TODO(backend) 주석과 시그니처**가 진다.
 */
// TODO(backend): POST /api/admins
//   요청: AdminDraft  /  응답 201: AdminUser  /  409 ADMIN_ACCOUNT_DUPLICATED
async function createAdmin(draft: AdminDraft, signal?: AbortSignal): Promise<AdminUser> {
  await wait(LATENCY_MS, signal);
  failIfRequested('createAdmin');

  try {
    return addAdmin(draft);
  } catch (cause) {
    throw toWriteError(cause);
  }
}

/** 운영자 수정 — 역할 변경만 따로 가드가 걸린다 (createAdmin 과 같은 이유로 지역 함수다) */
// TODO(backend): PUT /api/admins/:id
//   응답 200: AdminUser  /  404 ADMIN_NOT_FOUND  /  409 ADMIN_ACCOUNT_DUPLICATED
//   422 ADMIN_ROLE_CHANGE_BLOCKED (본문 message 를 그대로 표시)
async function updateAdmin(
  id: string,
  draft: AdminDraft,
  signal?: AbortSignal,
): Promise<AdminUser> {
  await wait(LATENCY_MS, signal);
  failIfRequested('updateAdmin');

  const current = findAdmin(id);
  // [EXC-04] 없는 id 를 조용히 지나쳐 성공을 돌려주면 '유령 저장' 이다 — 409 로 알린다
  if (current === null) {
    throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 운영자예요.');
  }

  const blocked = adminRoleChangeBlock(current, draft.roleId, guardContext());
  if (blocked !== null) {
    throw new HttpError(HTTP_STATUS.unprocessable, blocked, {
      violations: [{ field: 'roleId', message: blocked }],
    });
  }

  try {
    return patchAdmin(id, draft);
  } catch (cause) {
    throw toWriteError(cause);
  }
}

/** 운영자 삭제 — 되돌릴 수 없다 */
// TODO(backend): DELETE /api/admins/:id
//   응답 204  /  404 ADMIN_NOT_FOUND  /  422 ADMIN_DELETE_BLOCKED (본문 message 를 그대로 표시)
export async function deleteAdmin(id: string, signal?: AbortSignal): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('deleteAdmin');

  const admin = findAdmin(id);
  if (admin === null) throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 운영자예요.');

  const blocked = adminDeletionBlock(admin, guardContext());
  if (blocked !== null) throw new HttpError(HTTP_STATUS.unprocessable, blocked);

  removeAdmin(id);
}

/**
 * 폼(useCrudForm)이 소비하는 어댑터 표면.
 *
 * 위의 이름 있는 함수들을 **다시 구현하지 않고 묶기만 한다** — 백엔드 연동 시 고칠 자리가 한 곳으로
 * 남는다. 어댑터의 write 계약이 Promise<void> 라 생성/수정의 반환값은 여기서 버린다(폼은 목록으로
 * 돌아가므로 새 레코드를 쓰지 않는다).
 */
export const adminAdapter: CrudAdapter<AdminUser, AdminDraft> = {
  fetchAll: fetchAdminRoster,
  fetchOne: fetchAdmin,
  create: async (input, context) => {
    await createAdmin(input, context?.signal);
  },
  update: async (id, input, context) => {
    await updateAdmin(id, input, context?.signal);
  },
  remove: (id, context) => deleteAdmin(id, context?.signal),
};
