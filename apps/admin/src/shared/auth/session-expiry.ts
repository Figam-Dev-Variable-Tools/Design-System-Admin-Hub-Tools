// 세션 만료 통지 (A41 소유 — apps/admin/src/shared/auth/**)
//
// [왜 pub/sub 인가 — 이 파일이 있는 진짜 이유]
// 401 을 가장 먼저 보는 곳은 **queryClient(shared/query/queryClient.ts)** 다. 그런데 queryClient 는
// 모듈 최상단에서 한 번 만들어지는 **React 밖의 값**이라 useNavigate 를 부를 수 없다. 반대로
// 라우팅을 할 수 있는 컴포넌트는 401 이 어디서 났는지 모른다.
//
// 그래서 둘을 **한 줄짜리 이벤트**로 잇는다: 캐시 계층이 notify 하고, 라우터 안의 감시 컴포넌트가
// subscribe 해서 이동한다. 화면 코드는 이 파일을 알 필요가 없다 — 401 처리는 앱 전체에서 한 곳이다.
//
// TODO(lib): Axios 도입 시 이 notify 의 호출부는 **response interceptor 한 곳**으로 옮겨간다
//   (`if (error.response?.status === 401) notifySessionExpired()`). 구독자(SessionExpiryWatcher)와
//   이 파일의 계약은 그대로 둔다 — 바뀌는 것은 '누가 401 을 알아채는가' 뿐이다.

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * 이미 만료 처리를 시작했는가.
 *
 * 대시보드처럼 **여러 쿼리가 동시에** 뜨는 화면은 401 도 동시에 여러 번 온다. 가드가 없으면
 * 한 번의 만료가 navigate 를 N번 호출한다. 첫 통지만 통과시키고 나머지는 삼킨다.
 */
let expiring = false;

/** 401 을 관측했다 — 세션을 버리고 재인증 경로로 보낸다 */
export function notifySessionExpired(): void {
  if (expiring) return;
  expiring = true;
  listeners.forEach((listener) => {
    listener();
  });
}

/** 감시 컴포넌트가 mount 시 구독하고 unmount 시 해제한다 */
export function subscribeToSessionExpiry(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 만료 래치를 푼다 — 재인증에 성공해 새 세션이 생긴 시점에만 부른다.
 * (풀지 않으면 다음 만료를 통지하지 못한다.)
 */
export function resetSessionExpiry(): void {
  expiring = false;
}
