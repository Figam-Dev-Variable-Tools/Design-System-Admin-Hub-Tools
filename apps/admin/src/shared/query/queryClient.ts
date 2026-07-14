// 서버 상태 클라이언트 (A41 — ADR-0008 §7.1 집행)
//
// 손으로 만든 shared/useAsyncData.ts 를 대체한다. 두 벌을 공존시키지 않는다 —
// 공존하면 캐시가 두 개가 되고 어느 쪽이 진실인지 알 수 없다 (ADR-0008 §7.1).
//
// [기본값은 전부 '명시'한다] react-query 의 기본값을 그대로 쓰지 않는다.
// 기본값 하나하나가 이 앱의 동작(요청 횟수·실패 표시 시점·중복 지급 여부)을 바꾸기 때문이다.
import { QueryClient } from '@tanstack/react-query';

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

export const queryClient = new QueryClient({
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
