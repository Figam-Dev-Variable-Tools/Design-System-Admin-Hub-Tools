// 데이터 소스 어댑터 (A40 소유)
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다.
// 지금은 fixtures.ts 의 더미 데이터를 돌려준다. 백엔드가 준비되면 **이 파일의 함수 본문만**
// 실제 HTTP 호출로 교체하면 되고, 화면 코드(MembersPage/MemberDetailPage)는 한 줄도 바뀌지 않는다.
// 서버·엔드포인트·비즈니스 로직을 여기에 구현하지 않는다.
//
// [쓰기 계열] 지금은 저장하지 않는다 — resolve 만 하고, 화면이 성공 안내를 띄운다.
// 실제 저장은 백엔드가 붙을 때 아래 TODO(backend) 엔드포인트로 연결된다.
//
// [회원 생성 없음] 고객은 회원가입으로만 유입된다(요구사항). 관리자가 회원을 만드는 API 는
// 계약에 존재하지 않는다 — 조회/검색/필터/내보내기와 위의 쓰기 계열이 전부다.
import { wait } from '../../shared/async';
import { toCsvText } from '../../shared/download';
// 생성 타입(OpenAPI) — 이 어댑터가 돌려주는 값이 **서버 응답 스키마와 일치**함을 컴파일 타임에 고정한다.
// 어긋나면 tsc 가 여기서 멈춘다. 근거와 검사 원리는 shared/api/contract.ts 참조 (ADR-0008 §3.5).
import type { Wire } from '../../shared/api/contract';
import { buildMemberDetail, GROUPS, indexFromId, MEMBERS } from '../../shared/fixtures/members';
import { GROUP_ALL, PAGE_SIZE, TIER_LABEL } from './types';
import type {
  CreateGroupInput,
  GroupCounts,
  Member,
  MemberDetail,
  MemberGroup,
  MemberListResult,
  MemberTier,
  PointAdjustInput,
  PointEntry,
  TierCounts,
} from './types';

/** 네트워크 왕복 체감 — 화면의 로딩/스켈레톤 경로를 실제로 타게 하는 최소한의 지연 */
const LATENCY_MS = 400;

/**
 * 지연·빈 상태 재현 스위치 (개발용) — dashboard/api.ts 의 `readMockOptions()` 패턴을 그대로 따른다.
 * 아래 `failIfRequested` 와 형제이며, 백엔드가 붙으면 함께 사라진다.
 *
 *   /users/members?delay=3000          → 이 화면의 모든 호출이 3초 걸린다 (로딩·스켈레톤 관측)
 *   /users/members?empty=groups        → 그룹 목록이 0건으로 온다 (그룹 필터 빈 상태)
 *   /users/members/1?empty=points      → 적립 내역이 0건으로 온다 (적립금 카드 빈 상태)
 *   /users/members/1?empty=all         → 위 빈 상태를 한 번에
 *
 * 데이터를 지우는 것이 아니라(fixtures 는 그대로다) **응답만** 비우는 스위치다.
 */
interface MockOptions {
  readonly delayMs: number;
}

function readMockOptions(): MockOptions {
  const params = new URLSearchParams(window.location.search);
  const rawDelay = Number(params.get('delay'));
  return {
    delayMs: Number.isFinite(rawDelay) && rawDelay > 0 ? rawDelay : LATENCY_MS,
  };
}

/** 모든 어댑터가 이 지연을 탄다 — `?delay=<ms>` 가 없으면 기본 LATENCY_MS */
function latency(signal?: AbortSignal): Promise<void> {
  return wait(readMockOptions().delayMs, signal);
}

/** 빈 응답을 재현할 대상 — `?empty=points,groups` 처럼 콤마로 여러 개를 준다 */
type EmptyOp = 'all' | 'points' | 'groups';

function isEmptyRequested(op: EmptyOp): boolean {
  const flags = new URLSearchParams(window.location.search).get('empty');
  if (flags === null) return false;

  const requested = flags.split(',').map((flag) => flag.trim());
  return requested.includes('all') || requested.includes(op);
}

/**
 * 실패 경로 재현 스위치 (개발용).
 *
 * 백엔드가 없어 이 어댑터는 항상 성공한다 — 그러면 화면의 실패 분기(실패 배너·재시도·인라인
 * 에러)를 눈으로 확인할 방법이 없다. 그래서 **쿼리 파라미터로만** 실패를 재현한다.
 * 서버를 흉내 내는 것이 아니라(상태를 만들지도, 저장하지도 않는다) 실패 분기를 여는 스위치다.
 *
 *   /users/members?fail=notify          → 알림 발송이 실패한다
 *   /users/members?fail=export,groups   → 여러 개를 한 번에
 *   /users/members/1?fail=all           → 이 화면의 모든 호출이 실패한다
 *
 * 백엔드가 붙으면 이 함수와 호출부는 함께 사라진다.
 */
type FailureOp =
  | 'all'
  | 'members'
  | 'groups'
  | 'detail'
  | 'export'
  | 'createGroup'
  | 'password'
  | 'points'
  | 'pointsDelete'
  | 'memo'
  | 'delete'
  | 'notify';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;

  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}

export interface MemberQuery {
  readonly tier: MemberTier | 'all';
  /** 그룹 id 또는 GROUP_ALL — 등급과 AND 로 걸린다 */
  readonly groupId: string;
  readonly keyword: string;
  readonly page: number;
}

function countByTier(members: readonly Member[]): TierCounts {
  return {
    all: members.length,
    normal: members.filter((m) => m.tier === 'normal').length,
    vip: members.filter((m) => m.tier === 'vip').length,
    vvip: members.filter((m) => m.tier === 'vvip').length,
  };
}

function countByGroup(members: readonly Member[]): GroupCounts {
  const counts: Record<string, number> = {};
  for (const group of GROUPS) counts[group.id] = 0;
  for (const member of members) {
    counts[member.groupId] = (counts[member.groupId] ?? 0) + 1;
  }
  return counts;
}

/** 등급 + 그룹(AND) + 닉네임/계정 키워드 — 서버 쿼리로 대체될 자리 */
function applyQuery(query: MemberQuery): readonly Member[] {
  const keyword = query.keyword.trim().toLowerCase();
  return MEMBERS.filter((member) => {
    if (query.tier !== 'all' && member.tier !== query.tier) return false;
    if (query.groupId !== GROUP_ALL && member.groupId !== query.groupId) return false;
    if (keyword === '') return true;
    return (
      member.nickname.toLowerCase().includes(keyword) ||
      member.account.toLowerCase().includes(keyword)
    );
  });
}

// TODO(backend): GET /api/members?tier=&groupId=&keyword=&page=&size=
export async function fetchMembers(
  query: MemberQuery,
  signal: AbortSignal,
): Promise<MemberListResult> {
  await latency(signal);
  failIfRequested('members');

  // 등급/그룹 카운트는 검색과 무관하게 전체 기준 — 좌측 패널의 숫자는 고정이어야 한다
  const filtered = applyQuery(query);
  const start = (query.page - 1) * PAGE_SIZE;

  // Wire<'MemberListResult'> 대입 = 프론트 모델 → 스키마 검사. 반환 타입이 스키마 → 프론트 검사다.
  const result: Wire<'MemberListResult'> = {
    members: filtered.slice(start, start + PAGE_SIZE),
    counts: countByTier(MEMBERS),
    groupCounts: countByGroup(MEMBERS),
    total: filtered.length,
  };
  return result;
}

/** 좌측 패널의 그룹 목록 */
// TODO(backend): GET /api/member-groups
export async function fetchGroups(signal: AbortSignal): Promise<readonly MemberGroup[]> {
  await latency(signal);
  failIfRequested('groups');
  // 빈 그룹 목록 재현 — 그룹 필터의 빈 상태 축 (?empty=groups)
  const groups: readonly Wire<'MemberGroup'>[] = isEmptyRequested('groups') ? [] : GROUPS;
  return groups;
}

/** '새 그룹 만들기' 모달 제출 — 지금은 저장하지 않는다 */
// TODO(backend): POST /api/member-groups
export async function createGroup(input: CreateGroupInput, signal: AbortSignal): Promise<void> {
  void input;
  await latency(signal);
  failIfRequested('createGroup');
}

/** 내보내기 — 현재 페이지가 아니라 필터/검색에 걸린 전체를 내려준다 */
// TODO(backend): GET /api/members/export?tier=&keyword=
export async function fetchMembersForExport(
  query: MemberQuery,
  signal: AbortSignal,
): Promise<readonly Member[]> {
  await latency(signal);
  failIfRequested('export');
  return applyQuery(query);
}

// TODO(backend): GET /api/members/:id
export async function fetchMemberDetail(id: string, signal: AbortSignal): Promise<MemberDetail> {
  await latency(signal);
  failIfRequested('detail');

  const index = indexFromId(id);
  const member = index < 0 ? undefined : MEMBERS[index];
  if (member === undefined) throw new Error('회원을 찾을 수 없습니다');

  // 양방향 검사 지점 — 프론트 MemberDetail ↔ 스키마 MemberDetail (shared/api/contract.ts)
  const built = buildMemberDetail(member);
  // 빈 적립 내역 재현 — 적립금 카드의 빈 상태 축 (?empty=points). 잔액은 그대로 두고 내역만 비운다
  const detail: Wire<'MemberDetail'> = isEmptyRequested('points')
    ? { ...built, pointHistory: [] }
    : built;
  return detail;
}

/* ── 쓰기 계열 ──────────────────────────────────────────────────────────────
 *
 * 전부 optional signal 을 받는다. 모달/다이얼로그가 닫히면 화면이 abort 하고, 취소된 요청의
 * 응답은 화면에 반영되지 않는다(성공/실패 배너도 뜨지 않는다).
 */

/** 관리자가 바꿀 수 있는 유일한 회원 정보 — 계정 복구 목적 */
// TODO(backend): PATCH /api/members/:id/password
export async function changePassword(
  id: string,
  password: string,
  signal?: AbortSignal,
): Promise<void> {
  void id;
  void password;
  await latency(signal);
  failIfRequested('password');
}

/**
 * 적립금 지급/차감 — 서버가 생성한 내역 행을 돌려주는 자리.
 *
 * `idempotencyKey` 는 **제출 시도 단위**로 호출자가 만들어 넘긴다. 응답이 유실돼 사용자가
 * 재시도하면 같은 키가 실려 서버가 최초 응답을 재생한다 — 중복 지급이 구조적으로 불가능해진다.
 * 여기서 키를 만들면 호출마다 달라져 그 보호가 사라진다.
 */
// TODO(backend): POST /api/members/:id/points
//   헤더: Idempotency-Key: <idempotencyKey>  (UUID v4, 24h 보존)
//   같은 키 + 같은 바디 → 최초 응답 재생 / 같은 키 + 다른 바디 → 409
export async function addPointHistory(
  id: string,
  input: PointAdjustInput,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<PointEntry> {
  await latency(signal);
  failIfRequested('points');

  const signedAmount = input.kind === 'grant' ? input.amount : -input.amount;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  // 서버가 채워줄 값(id/date)을 흉내만 낸 응답 — 저장되지 않는다.
  // Wire<'PointEntry'> 대입으로 스키마와의 일치를 컴파일 타임에 고정한다 (shared/api/contract.ts)
  const entry: Wire<'PointEntry'> = {
    id: `${id}-${String(now.getTime())}`,
    date,
    reason: input.reason,
    orderNo: null,
    amount: signedAmount,
  };
  return entry;
}

// TODO(backend): DELETE /api/members/:id/points/:entryId
export async function removePointHistory(
  id: string,
  entryId: string,
  signal?: AbortSignal,
): Promise<void> {
  void id;
  void entryId;
  await latency(signal);
  failIfRequested('pointsDelete');
}

// TODO(backend): PUT /api/members/:id/memo
export async function saveMemo(id: string, memo: string, signal?: AbortSignal): Promise<void> {
  void id;
  void memo;
  await latency(signal);
  failIfRequested('memo');
}

// TODO(backend): DELETE /api/members/:id
export async function deleteMember(id: string, signal?: AbortSignal): Promise<void> {
  void id;
  await latency(signal);
  failIfRequested('delete');
}

// TODO(backend): POST /api/members/:id/notifications
export async function sendNotification(id: string, signal?: AbortSignal): Promise<void> {
  void id;
  await latency(signal);
  failIfRequested('notify');
}

/**
 * 내보내기 CSV 직렬화 — **어느 열을 어떤 라벨로 내보낼지**만 여기서 정한다.
 * 이스케이프·BOM·파일 저장은 도메인을 모르는 shared/download.ts 가 맡는다 (회원·로그인 이력 공용).
 * 서버가 CSV 를 직접 내려주게 되면 이 함수는 사라진다.
 */
export function toCsv(members: readonly Member[]): string {
  const header = ['닉네임', '계정', '회원 유형', '그룹', '가입일', '적립금', '누적 구매금액'];
  const rows = members.map((m) => [
    m.nickname,
    m.account,
    TIER_LABEL[m.tier],
    m.group,
    m.joinedAt,
    String(m.points),
    String(m.totalPurchase),
  ]);
  return toCsvText(header, rows);
}
