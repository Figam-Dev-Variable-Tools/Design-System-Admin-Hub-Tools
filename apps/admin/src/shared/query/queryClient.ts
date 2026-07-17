// 서버 상태 클라이언트 (A41 — ADR-0008 §7.1 집행)
//
// 손으로 만든 shared/useAsyncData.ts 를 대체한다. 두 벌을 공존시키지 않는다 —
// 공존하면 캐시가 두 개가 되고 어느 쪽이 진실인지 알 수 없다 (ADR-0008 §7.1).
//
// [기본값은 전부 '명시'한다] react-query 의 기본값을 그대로 쓰지 않는다.
// 기본값 하나하나가 이 앱의 동작(요청 횟수·실패 표시 시점·중복 지급 여부)을 바꾸기 때문이다.
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { notifySessionExpired } from '../auth/session-expiry';
import { isUnauthorized } from '../errors/http-error';

/**
 * 신선도 유지 시간.
 *
 * **이것이 react-query 를 도입한 이유 그 자체다** (ADR-0008 §3.2).
 * `useAsyncData` 에는 캐시가 없어 탭·라우트를 오갈 때마다 같은 데이터를 다시 조회했고,
 * BE-002 §4.1 이 그 결과로 레이트리밋(세션 분당 120회)을 계약에 넣어야 했다.
 *
 * 30초로 잡은 근거: 이 화면들의 데이터(회원 목록·운영자 목록·등급 정책·대시보드 집계)는
 * 관리자 한 명의 조작으로만 바뀐다. 쓰기 직후에는 아래 뮤테이션들이 **명시적으로 무효화**하므로
 * 자기 변경은 즉시 보인다. 남는 것은 '다른 관리자의 변경'뿐이고, 그건 30초 지연이 허용된다.
 */
const STALE_TIME_MS = 30_000;

/**
 * 401 인터셉터 — **앱 전체에서 한 곳** (EXC-02).
 *
 * 조회든 쓰기든 401 이면 세션이 죽은 것이고, 할 일은 언제나 같다: 재인증 경로로 보낸다.
 * 그 판단을 화면마다 onError 에 복사하면 반드시 빠뜨리는 화면이 생긴다 — 캐시 계층이 모든
 * 실패를 통과시키므로 여기 한 줄이 전수를 덮는다.
 *
 * 여기서 navigate 를 부르지 못하는 이유(React 밖)와 pub/sub 로 잇는 이유는
 * shared/auth/session-expiry.ts 헤더에 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Axios 도입 후 — 여기가 401 **통지**의 정본이다. 옮기지 않았다]
 *
 * 옛 TODO(lib) 는 'Axios 를 넣으면 이 판정을 response interceptor 로 옮기고 이 두 캐시 훅은
 * 사라진다'고 적어 두었다. Axios 는 들어왔지만(shared/api/client.ts) **옮기지 않았다.**
 * 세어 보면 옮길 수 없기 때문이다:
 *
 *   · axios 인스턴스를 지나는 것  — shared/crud/crud.ts 의 두 어댑터 팩토리 경유분
 *   · 지나지 않는 것             — `failIfRequested` 로 401 을 직접 던지는 데이터 소스 **15개**
 *     (pages/members · pages/content/* · pages/stats · pages/settings · pages/support · pages/logs …)
 *
 * 통지를 인터셉터로 옮기면 그 15개의 401 은 **아무도 통지하지 않고**, crud 경유분만 두 곳에서
 * 통지된다 — 전수도 못 덮고 이중화만 남는다. 반면 캐시 계층은 axios 경유든 아니든 **모든**
 * query/mutation 실패가 수렴하는 자리라 지금도 전수를 덮는다.
 *
 * 그래서 분담을 못박는다:
 *   · **status → HttpError 변환의 정본** = shared/api/client.ts 의 응답 인터셉터 (전송 관심사)
 *   · **401 통지의 정본**                = 여기 (전수 수렴 지점)
 * 인터셉터는 401 을 HttpError 로 만들어 줄 뿐 통지하지 않는다 — 통지하는 곳은 이 한 곳이다.
 *
 * TODO(lib): 15개 데이터 소스가 전부 fixtureRequest 를 지나게 되면 그때 통지를 인터셉터로 내리고
 *   이 두 캐시 훅을 지운다. 그 전에 옮기면 401 처리에 구멍이 생긴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function handleQueryLayerError(cause: unknown): void {
  if (isUnauthorized(cause)) notifySessionExpired();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleQueryLayerError }),
  mutationCache: new MutationCache({ onError: handleQueryLayerError }),

  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,

      /**
       * `retry: false` — 기본값 **3 을 쓰지 않는다.**
       *
       * ① 지금 데이터 소스는 fixture 어댑터다. 실패는 `?fail=` 스위치로 **결정적으로** 난다 —
       *    재시도해도 절대 성공하지 않는다. 지연(400ms × 3 + 지수 백오프)만 늘어나고
       *    실패 배너가 몇 초 늦게 뜬다. 실패를 3배로 늘릴 뿐이다.
       * ② 조회 실패 화면에는 **이미 '다시 시도' 버튼이 있다** (FS-002-EL-041.1 · FS-003-EL-014.1 ·
       *    FS-004-EL-011.1). 복구 경로는 사용자가 쥐고 있어야 한다 — 몰래 3번 치지 않는다.
       * ③ `useAsyncData` 도 재시도하지 않았다 — **동작 보존**.
       */
      retry: false,

      /**
       * `refetchOnWindowFocus: false` — 기본값 **true 를 쓰지 않는다.**
       *
       * `useAsyncData` 는 창 포커스로 재조회하지 않았다. 켜 두면 다른 탭에 다녀오는 것만으로
       * 요청이 늘고, 보고 있던 표가 예고 없이 갱신된다 — **없던 동작이다.**
       */
      refetchOnWindowFocus: false,
    },

    mutations: {
      /**
       * `retry: false` — 뮤테이션 기본값도 0 이지만 **명시한다. 돈이 걸려 있기 때문이다.**
       *
       * 적립금 지급(`POST /api/members/:id/points`)은 `Idempotency-Key` 로 중복 지급을 막는다
       * (BE-004-EP-03). 자동 재시도가 켜지면 react-query 는 **같은 variables 로 `mutationFn` 을
       * 다시 부른다.** 그래서 멱등키는 **반드시 variables 안에** 있어야 한다 —
       * `mutationFn` **안에서** 키를 만들면 재시도마다 새 키가 생기고,
       * 서버는 두 요청을 별개 거래로 보아 **적립금을 두 번 지급한다.**
       *
       * 결론: ① 키는 `mutationFn` 밖(제출 시도 단위 ref)에서 만들어 variables 로 넘긴다
       *       ② 이 뮤테이션의 자동 재시도는 끈다 — 재시도는 사용자가 '확인'을 다시 누르는 것뿐이고,
       *          그때 같은 키가 재사용되어 서버가 최초 응답을 재생한다.
       * 자세한 근거는 pages/members/queries.ts 의 useAddPointHistory 주석에 있다.
       */
      retry: false,
    },
  },
});
