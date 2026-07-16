// 한글(IME) 안전 검색 입력 (A40 소유 — apps/admin/src/pages/stats/**)
//
// [COMP-10 — 왜 이게 필요한가] 한국 운영자는 전부 IME 로 입력한다. '홍길동'을 치면 브라우저는
// ㅎ·호·홍·홍ㄱ·홍기·홍길… 처럼 **조합 중간 값마다** input 이벤트를 낸다. 그대로 조회를 걸면
//   (1) 자모마다 요청이 나가고
//   (2) 조합 중 Enter 가 '홍길'로 검색을 확정해 버리고
//   (3) 느린 응답이 뒤늦게 도착해 최신 결과를 덮는다.
// 영어 QA 에서는 절대 보이지 않지만 실사용 1순위 불만이다.
//
// [해법]
//   - compositionstart~end 사이에는 **커밋하지 않는다** (조합 중 값은 아직 단어가 아니다).
//   - compositionend 또는 명시적 submit(Enter)에서만 커밋한다.
//   - 커밋은 250ms 디바운스 — 조합이 끝난 뒤에도 계속 타이핑하면 마지막 것만 나간다.
//   - Enter 는 nativeEvent.isComposing 을 확인한다. 조합 확정용 Enter 와 검색용 Enter 는
//     같은 키지만 다른 뜻이다.
//
// [응답 경합] '최신 키 입력이 이긴다'는 여기서 풀지 않는다 — 커밋된 검색어가 react-query 의
// **쿼리 키에 들어가므로**, 늦게 온 이전 검색어의 응답은 다른 키의 캐시로 들어갈 뿐 현재 화면을
// 덮지 못한다. 경합은 구조가 막는다 (queries.ts 참조).
import { useCallback, useEffect, useState } from 'react';
import type { CompositionEvent, KeyboardEvent } from 'react';

/** 조합이 끝난 뒤 커밋까지 기다리는 시간 */
const SEARCH_DEBOUNCE_MS = 250;

interface ImeSearchInputProps {
  readonly onCompositionStart: () => void;
  readonly onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

interface ImeSearch {
  /** 입력창에 그대로 보이는 값 — 조합 중에도 즉시 반영된다 */
  readonly value: string;
  readonly onChange: (next: string) => void;
  /** SearchField 에 펼쳐 넣는다 — native 속성이라 그대로 <input> 에 닿는다 */
  readonly inputProps: ImeSearchInputProps;
}

/**
 * @param committed 현재 확정된 검색어 (URL 이 원천)
 * @param onCommit  확정 시 호출 — URL 을 갱신한다
 */
export function useImeSearch(committed: string, onCommit: (keyword: string) => void): ImeSearch {
  const [draft, setDraft] = useState(committed);

  // [ref 가 아니라 state 인 이유 — 실제로 났던 버그]
  // 처음에는 조합 여부를 useRef 로 들었다. 그러면 **한글 검색이 영원히 발행되지 않는다**:
  // compositionend 시점의 최종 값('홍길동')은 직전 조합 input 이 이미 draft 에 넣어 둔 값과
  // 같아서 setDraft 가 no-op → 리렌더 없음 → 아래 효과가 다시 돌지 않음 → 디바운스가 예약되지
  // 않는다. ref 변경은 효과를 깨우지 못한다. 조합 종료는 **렌더를 유발해야 하는 상태 전이**다.
  const [isComposing, setIsComposing] = useState(false);

  // 뒤로가기·링크 진입처럼 **밖에서** 검색어가 바뀌면 입력창을 맞춘다.
  // (사용자 타이핑은 draft 가 원천이므로 이 효과가 덮지 않는다 — committed 가 바뀔 때만 돈다.)
  useEffect(() => {
    setDraft(committed);
  }, [committed]);

  useEffect(() => {
    // 조합 중에는 예약조차 하지 않는다 — 자모마다 타이머가 서는 것을 막는다
    if (isComposing) return undefined;
    if (draft === committed) return undefined;

    const timer = setTimeout(() => {
      onCommit(draft);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, committed, onCommit, isComposing]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      // 조합을 확정하는 Enter 다 — 검색이 아니다
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      onCommit(event.currentTarget.value);
    },
    [onCommit],
  );

  const onCompositionEnd = useCallback((event: CompositionEvent<HTMLInputElement>) => {
    // 이 두 setState 가 함께 리렌더를 일으켜 효과를 깨우고, 그때 isComposing 이 false 라서
    // 디바운스 커밋이 예약된다. setDraft 만으로는 값이 같아 no-op 이 될 수 있다(위 주석 참조).
    setIsComposing(false);
    setDraft(event.currentTarget.value);
  }, []);

  const onCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  return {
    value: draft,
    onChange: setDraft,
    inputProps: { onCompositionStart, onCompositionEnd, onKeyDown },
  };
}
