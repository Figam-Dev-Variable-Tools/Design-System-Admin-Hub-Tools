// 권한 라우트 가드 + 쓰기 액션 게이팅 (A41 소유 — apps/admin/src/shared/permissions/**)
//
// [EXC-03] 예전에는 AppShell 이 **사이드바에서 메뉴를 숨기는 것**이 전부였다. 그래서
//   ① 숨겨진 화면도 deep-link 하면 완전히 렌더됐고,
//   ② read 전용 역할이 등록·수정·삭제 버튼을 **그대로 보고 누를 수 있었다**.
// 메뉴 가시성은 권한 표현이 아니라 편의였던 셈이다. 여기서 그 둘을 실제 게이팅으로 바꾼다.
//
// [프론트 권한은 보안 경계가 아니다 — 이 결정의 범위]
// 이 가드는 **UX** 다: 할 수 없는 일을 보여 주지 않고, 할 수 없는 화면에서 빈 표 대신 이유를
// 보여 준다. 실제 차단은 여전히 서버의 몫이며(위조된 localStorage 로 이 가드는 우회된다),
// 그래서 서버의 403 응답 처리(isForbidden)도 별도로 남는다. 둘은 대체재가 아니라 층이다.
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { ForbiddenScreen } from '../errors/ErrorScreens';
import { usePermissions } from './PermissionProvider';
import { resourceIdForPath } from './route-resource';
import type { PermissionAction } from './resources';

/**
 * 현재 라우트에서 이 액션이 허용되는가.
 *
 * 화면이 resourceId 를 알 필요가 없다 — 지금 서 있는 라우트가 곧 리소스다(route-resource.ts).
 * 권한 스토어가 바뀌면(다른 탭의 강등 포함) 이 훅을 쓰는 컴포넌트가 재렌더되므로,
 * **강등 reconcile 은 별도 코드 없이 성립한다**: 버튼이 그냥 사라진다.
 */
export function useRouteCan(action: PermissionAction): boolean {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const resourceId = resourceIdForPath(pathname);

  // 권한 모델에 없는 경로(인덱스 리다이렉트·준비 중 화면)는 게이팅 대상이 아니다
  if (resourceId === null) return true;
  return can(resourceId, action);
}

/** 목록/폼이 쓰는 쓰기 권한 묶음 — 한 번 구독해 네 갈래를 함께 받는다 */
export interface RouteWritePermissions {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
  readonly canExport: boolean;
}

export function useRouteWritePermissions(): RouteWritePermissions {
  return {
    canCreate: useRouteCan('create'),
    canUpdate: useRouteCan('update'),
    canRemove: useRouteCan('remove'),
    canExport: useRouteCan('export'),
  };
}

/**
 * read 권한이 없는 화면은 본문 대신 403 을 렌더한다.
 *
 * AppShell 의 <Outlet> 을 감싸므로 **모든 라우트가 한 번에** 덮인다 — 화면마다 가드를 붙이는
 * 방식은 새 화면이 추가될 때마다 빠뜨릴 수 있다. 셸 바깥이 아니라 안쪽이라 사이드바·헤더는
 * 남고, 운영자는 권한 있는 메뉴로 걸어 나갈 수 있다.
 */
export function RequirePermission({ children }: { readonly children: ReactNode }) {
  const allowed = useRouteCan('read');
  return allowed ? <>{children}</> : <ForbiddenScreen />;
}
