// 라우트 → 권한 리소스 매핑 (A41 소유 — apps/admin/src/shared/permissions/**)
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
import { collectNavRoutes } from '../layout/nav-config';
import { navPageResourceId } from './resources';
import type { ResourceId } from './resources';

/**
 * `to` 가 pathname 을 **세그먼트 경계에서** 감싸는가.
 *
 * 단순 startsWith 는 '/products' 가 '/products-archive' 를 삼킨다 — 남남인 두 화면이 권한을
 * 공유하게 된다. 그래서 정확히 같거나, 뒤에 '/' 가 오는 경우만 인정한다.
 */
function covers(to: string, pathname: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * 이 경로를 지배하는 권한 리소스 — 어떤 잎에도 속하지 않으면 null(= 권한 대상이 아님).
 *
 * null 은 '차단' 이 아니라 '해당 없음' 이다: 인덱스 리다이렉트('/')나 준비 중 화면처럼 권한
 * 모델에 등재되지 않은 경로까지 403 으로 막으면 앱이 스스로를 잠근다.
 */
export function resourceIdForPath(pathname: string): ResourceId | null {
  let best: string | null = null;

  for (const leaf of collectNavRoutes()) {
    if (!covers(leaf.to, pathname)) continue;
    // 더 긴 잎이 더 구체적이다 — '/products/categories' 가 '/products' 를 이긴다
    if (best === null || leaf.to.length > best.length) best = leaf.to;
  }

  return best === null ? null : navPageResourceId(best);
}
