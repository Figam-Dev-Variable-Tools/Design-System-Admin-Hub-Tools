// 라우트 → 권한 리소스 매핑
//
// [왜 이 파일이 있나 — EXC-03]
// 권한 리소스는 **사이드바 잎(nav-config)** 에서 파생된다(resources.ts). 그런데 라우트는 잎보다
// 많다: `/content/notices` 는 잎이지만 `/content/notices/new` · `/content/notices/:id/edit` 는
// 잎이 아니다(사이드바에 없다). 그래서 '지금 이 화면의 리소스는 무엇인가' 를 물으면 상세·폼
// 라우트에서 답이 없어진다 — 바로 그 라우트들이 deep-link 로 열리는 곳인데도 말이다.
//
// 규칙은 하나다: **자기를 감싸는 가장 구체적인 잎이 곧 자기 리소스다.**
//   /content/notices/12/edit → 잎 /content/notices
//   /products/9/edit         → 잎 /products        ('/products/categories' 가 아니다 — 접두가 아니다)
//   /products/categories     → 잎 /products/categories (정확히 일치하는 더 긴 잎이 이긴다)
//
// [왜 화면마다 resourceId 를 받지 않나] 받으면 30여 개 화면이 각자 옳게 적어야 하고, 한 곳이라도
// 틀리면 그 화면만 조용히 무방비가 된다. 라우트는 이미 앱이 알고 있는 사실이므로 여기서 파생한다.
import { findCoveringLeaf } from '../layout/nav-config';
import { navPageResourceId } from './resources';
import type { ResourceId } from './resources';

/**
 * 권한 관리 화면의 라우트.
 *
 * [왜 상수로 뽑았나] 이 화면은 **권한 모델 자신을 편집하는 화면**이라, 저장소(permission-store)도
 * "이 편집을 해도 되는가" 를 물어야 한다(fail-closed). 그때 저장소가 쓰는 리소스와 화면이
 * `useRouteWritePermissions()` 로 얻는 리소스가 **같은 한 개**여야 한다 — 버튼을 잠그는 술어와
 * 저장을 거절하는 술어가 갈라지면, 버튼만 사라지고 저장 경로는 열린 상태가 된다.
 * 그래서 양쪽이 이 상수 하나를 통과한 `resourceIdForPath` 의 답을 쓴다
 * (permission-store.ts 의 ROLE_ADMIN_RESOURCE_ID · route-resource.test.ts 가 동치를 고정한다).
 */
export const ROLE_ADMIN_PATH = '/users/roles';

/**
 * 이 경로를 지배하는 권한 리소스 — 어떤 잎에도 속하지 않으면 null(= 권한 대상이 아님).
 *
 * null 은 '차단' 이 아니라 '해당 없음' 이다: 인덱스 리다이렉트('/')나 준비 중 화면처럼 권한
 * 모델에 등재되지 않은 경로까지 403 으로 막으면 앱이 스스로를 잠근다.
 *
 * ['가장 구체적인 잎' 규칙은 nav-config 가 소유한다]
 * 이 규칙(세그먼트 경계 covers + 최장 일치)은 원래 여기 있었다. 그런데 화면 제목(findNavLabel)이
 * **같은 질문에 다른 규칙으로** 답하고 있었고, 그래서 서브라우트에서 둘의 답이 갈렸다 —
 * 권한은 '/company/history' 로 옳게 풀면서 제목은 '기업 관리' 라고 말했다(IA-02).
 * 규칙이 두 벌이면 언젠가 갈라진다. 그래서 잎 판정은 잎을 아는 모듈(nav-config)이 갖는다.
 */
export function resourceIdForPath(pathname: string): ResourceId | null {
  const leaf = findCoveringLeaf(pathname);
  return leaf === null ? null : navPageResourceId(leaf.to);
}
