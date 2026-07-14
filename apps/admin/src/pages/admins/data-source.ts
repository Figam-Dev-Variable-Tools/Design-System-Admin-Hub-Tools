// 관리자(운영진) 데이터 소스 어댑터 (A40 소유)
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다.
// 지금은 fixtures.ts 의 더미 데이터를 돌려준다. 백엔드가 준비되면 **이 파일의 함수 본문만**
// 실제 HTTP 호출로 교체하면 되고, 화면 코드(AdminsPage/MemberDetailPage)는 한 줄도 바뀌지 않는다.
// 서버·엔드포인트·비즈니스 로직을 여기에 구현하지 않는다.
//
// [상세 재사용] fetchAdminDetail 은 회원 상세와 **같은 MemberDetail** 을 돌려준다.
// App.tsx 가 /users/admins/:id 라우트에서 MemberDetailPage 에 이 함수를 주입한다.
import type { MemberDetail } from '../../shared/domain/member';
import { ADMIN_GROUPS, ADMINS, buildAdminDetail } from './fixtures';
import { GROUP_ALL, PAGE_SIZE } from './types';
import type { AdminGroup, AdminGroupCounts, AdminListResult, AdminUser } from './types';

/** 네트워크 왕복 체감 — 화면의 로딩/스켈레톤 경로를 실제로 타게 하는 최소한의 지연 */
const LATENCY_MS = 400;

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('요청이 취소되었습니다.', 'AbortError'));
      },
      { once: true },
    );
  });
}

export interface AdminQuery {
  /** 그룹 id 또는 GROUP_ALL */
  readonly groupId: string;
  /** 닉네임·계정 검색어 */
  readonly keyword: string;
  readonly page: number;
}

function countByGroup(admins: readonly AdminUser[]): AdminGroupCounts {
  const counts: Record<string, number> = {};
  for (const group of ADMIN_GROUPS) counts[group.id] = 0;
  for (const admin of admins) {
    counts[admin.groupId] = (counts[admin.groupId] ?? 0) + 1;
  }
  return counts;
}

/** 그룹 + 닉네임/계정 키워드 — 서버 쿼리로 대체될 자리 */
function applyQuery(query: AdminQuery): readonly AdminUser[] {
  const keyword = query.keyword.trim().toLowerCase();
  return ADMINS.filter((admin) => {
    if (query.groupId !== GROUP_ALL && admin.groupId !== query.groupId) return false;
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

  // 좌측 패널의 숫자(전체/그룹별)는 검색과 무관한 전체 기준이어야 한다
  const filtered = applyQuery(query);
  const start = (query.page - 1) * PAGE_SIZE;

  return {
    admins: filtered.slice(start, start + PAGE_SIZE),
    totalAll: ADMINS.length,
    groupCounts: countByGroup(ADMINS),
    total: filtered.length,
  };
}

/** 좌측 패널의 운영진 그룹 목록 — 생성 기능은 없다(요구사항) */
// TODO(backend): GET /api/admin-groups
export async function fetchAdminGroups(signal: AbortSignal): Promise<readonly AdminGroup[]> {
  await wait(LATENCY_MS, signal);
  return ADMIN_GROUPS;
}

/** 운영자 상세 — 회원 상세 화면이 그대로 소비하는 MemberDetail 을 돌려준다 */
// TODO(backend): GET /api/admins/:id
export async function fetchAdminDetail(id: string, signal: AbortSignal): Promise<MemberDetail> {
  await wait(LATENCY_MS, signal);

  const admin = ADMINS.find((item) => item.id === id);
  if (admin === undefined) throw new Error('회원을 찾을 수 없습니다');

  return buildAdminDetail(admin);
}
