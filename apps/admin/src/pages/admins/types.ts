// 관리자(운영진) 관리 도메인 타입
//
// [회원 관리와의 관계 — 목록의 생김새만 같고, 사람은 다른 종류다]
// - 목록 화면의 구조/스타일/패턴은 회원 관리(pages/members)와 같다.
// - 그러나 상세는 **운영자 전용 화면(AdminDetailPage)** 이다. 예전에는 회원 상세를 재사용하면서
//   운영자를 MemberDetail 로 꾸며 내려보냈는데(`buildAdminDetail`), 그 결과 운영자에게
//   '회원 유형: 일반회원' 이 붙고 적립금·쿠폰·동의정보 카드가 빈 채로 뜨는 한편, 목록이 이미
//   갖고 있던 부서·직급은 상세 어디에도 나오지 않았다. 더 나쁜 것은 ⋯ 메뉴였다 — 삭제·알림이
//   **회원 어댑터**를 불러 운영자 id 로 회원 엔드포인트를 때렸다(FS-005 §7 #3·#4).
//   화면을 아끼려다 도메인을 섞은 것이라, 재사용을 끊고 운영자 자신의 화면을 갖게 했다.
// - 운영진 그룹은 **이 화면에서 만들고 지운다**. 그룹 모델 자체는 이 폴더의 것이 아니다 —
//   메시지 템플릿의 '발신 프로필' 과 같은 실체로 합쳐져 shared/domain/admin-group.ts 가 갖는다.
//   (합친 근거는 그 파일 머리말. 여기서는 화면 편의를 위해 재수출만 한다.)

// 도메인 모델은 shared 의 것이다 — 관리자 화면 안에서는 './types' 하나만 보면 되도록 재수출한다
// (pages/members/types.ts 가 회원 도메인에 대해 하는 것과 같은 처리다).
import type { AdminGroupCounts } from '../../shared/domain/admin-group';

export type {
  AdminGroup,
  AdminGroupCounts,
  AdminGroupUsage,
} from '../../shared/domain/admin-group';

/** 그룹 필터의 '전체' 값 — 그룹 id 와 섞이지 않게 상수로 둔다 */
export const GROUP_ALL = 'all';

/**
 * 역할 필터의 '전체' 값 — GROUP_ALL 과 같은 이유로 상수다.
 *
 * 이 값은 URL 파라미터(`?role=`)의 기본값이기도 하다: 기본값과 같으면 URL 에서 지워져
 * '필터 없는 목록' 의 주소가 하나로 정해진다(useListState 규약).
 */
export const ROLE_ALL = 'all';

export interface AdminUser {
  readonly id: string;
  readonly nickname: string;
  readonly account: string;
  /** 그룹 id — 좌측 필터가 이 값으로 건다 */
  readonly groupId: string;
  /** 그룹 표시명 — 표가 그대로 쓴다 */
  readonly group: string;
  /**
   * 배정된 권한 역할의 id — 정본은 `shared/permissions/roles.ts` 의 Role 목록이다.
   *
   * [왜 이 필드가 여기 생겼나] 역할 모델은 '권한만' 다루도록 재설계되면서 운영자 배정(memberIds)을
   * 스스로에게서 **제거했고**, 그 머리말이 "누구에게 어떤 역할을 주는지는 관리자 관리(pages/admins)
   * 화면의 몫이다" 라고 못박았다. 그런데 그 배정 표면은 만들어진 적이 없었다 — 즉 앱에는
   * 역할은 있는데 '누가 그 역할인가' 를 적을 곳이 없었다. 그 자리가 이 필드다.
   *
   * [id 만 든다] 역할명·권한 매트릭스를 복사해 오지 않는다. 역할의 이름이 바뀌면 운영자 레코드가
   * 낡은 이름을 들고 있게 되고, 권한을 복사하면 역할 화면에서 켠 권한이 운영자에게 반영되지 않는다.
   * 화면은 이 id 로 권한 스토어에서 역할을 되찾아 이름을 보여 준다.
   */
  readonly roleId: string;
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

/**
 * 운영자 등록·수정 입력.
 *
 * id·group(표시명)·joinedAt 이 **없다**: id 와 가입일은 저장소가 붙이고(화면이 만든 id 를 믿지
 * 않는다 — AdminGroupDraft 와 같은 판단), 그룹 표시명은 groupId 에서 파생하는 값이라 입력이 아니다.
 * 두 벌로 받으면 언젠가 id 와 라벨이 서로 다른 그룹을 가리킨다.
 */
export interface AdminDraft {
  readonly nickname: string;
  readonly account: string;
  readonly groupId: string;
  readonly roleId: string;
  readonly department: string;
  readonly position: string;
  readonly phone: string;
  readonly memo: string;
}

/* 입력 길이 상한 — 폼과 검증이 같은 값을 본다(한쪽만 늘어나면 저장에서만 거절된다) */
export const ADMIN_NICKNAME_MAX_LENGTH = 30;
export const ADMIN_ACCOUNT_MAX_LENGTH = 100;
export const ADMIN_DEPARTMENT_MAX_LENGTH = 30;
export const ADMIN_POSITION_MAX_LENGTH = 30;
export const ADMIN_MEMO_MAX_LENGTH = 500;

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
