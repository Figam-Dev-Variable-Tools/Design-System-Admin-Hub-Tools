// 관리자(운영진) 관리 도메인 타입
//
// [회원 관리와의 관계]
// - 목록 화면의 구조/스타일/패턴은 회원 관리(pages/members)와 같다.
// - 상세 화면(/users/admins/:id)은 **회원 상세(MemberDetailPage)를 그대로 재사용**한다.
//   그래서 운영자 상세 데이터는 회원과 같은 MemberDetail 타입(shared/domain/member)으로 내려간다.
// - 회원 관리와 달리 **그룹을 만드는 기능이 없다** — 운영진 그룹은 조회/필터 대상일 뿐이다.

/** 운영진 그룹 — 좌측 패널은 '운영 - {label}' 로 보여주고, 표는 label 을 그대로 쓴다 */
export interface AdminGroup {
  readonly id: string;
  readonly label: string;
}

/** 그룹 필터의 '전체' 값 — 그룹 id 와 섞이지 않게 상수로 둔다 */
export const GROUP_ALL = 'all';

/** 그룹별 운영자 수 — 좌측 목록에 배지로 붙는다 (키 = 그룹 id) */
export type AdminGroupCounts = Readonly<Record<string, number>>;

export interface AdminUser {
  readonly id: string;
  readonly nickname: string;
  readonly account: string;
  /** 그룹 id — 좌측 필터가 이 값으로 건다 */
  readonly groupId: string;
  /** 그룹 표시명 — 표가 그대로 쓴다 */
  readonly group: string;
  /** ISO yyyy-mm-dd */
  readonly joinedAt: string;
  /** 부서 — 비어 있을 수 있다 (빈 문자열이면 빈 셀) */
  readonly department: string;
  /** 직급 — 비어 있을 수 있다 (빈 문자열이면 빈 셀) */
  readonly position: string;
  /** '010-9235-8367' 형식 */
  readonly phone: string;
  readonly memo: string;
}

export interface AdminListResult {
  readonly admins: readonly AdminUser[];
  /** 필터/검색과 무관한 전체 운영자 수 — 좌측 '전체 운영자' 배지 */
  readonly totalAll: number;
  readonly groupCounts: AdminGroupCounts;
  /** 필터/검색 적용 후 건수 (페이지네이션용) */
  readonly total: number;
}

export const PAGE_SIZE = 10;

/* ── 우측 탭 ──────────────────────────────────────────────────────────────
 * 지금은 '운영진 목록' 하나뿐이지만, 탭 구조(role=tablist/tab)는 유지한다.
 * 탭이 늘어나면 여기에 항목만 추가하면 된다.
 */
export type AdminTabId = 'list';

interface AdminTabDef {
  readonly id: AdminTabId;
  readonly label: string;
}

export const ADMIN_TABS: readonly AdminTabDef[] = [{ id: 'list', label: '운영진 목록' }];
