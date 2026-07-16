// 한글(IME) 안전 검색 입력 (A41 소유 — apps/admin/src/shared/crud/**)
//
// [왜 이 훅이 있나 — COMP-10 (P0)]
// 한국 운영자는 **전부 IME 로 입력한다**. 그런데 앱 전체에서 `isComposing`/`compositionend` grep 이
// 0건이었다. 그 결과 영어 QA 에는 보이지 않는 세 가지가 실사용 1순위 불만이 된다:
//
//   ① 조합 중 Enter 가 제출한다. '홍길동' 을 치는 도중 Enter 를 누르면 IME 는 **조합을 확정**하려
//      Enter 를 먹는데, keydown 은 그대로 폼에 도달해 '홍길ㄷ' 같은 부분 문자열로 검색이 나간다.
//      사용자는 조합을 끝냈을 뿐인데 화면이 엉뚱한 결과로 바뀐다.
//   ② 자모마다 조회가 나간다. 'ㅎ→호→홍→홍ㄱ→홍기…' 가 전부 change 이벤트라, 디바운스가 없으면
//      글자 하나에 요청 5~6개가 붙는다.
//   ③ 늦게 온 이전 응답이 최신 결과를 덮는다(last-response-wins).
//
// [③ 은 여기서 풀지 않는다 — 이미 풀려 있다]
// TanStack Query 가 keyword 를 **쿼리 키**에 넣으므로 각 키워드의 응답은 자기 캐시 엔트리로 간다.
// 화면은 언제나 '현재 키' 의 데이터만 읽으므로 늦게 도착한 옛 응답이 최신 화면을 덮을 수 없다.
// (FS-003 'EL-008: 조회 중 키워드가 바뀌면 마지막 키워드만 반영된다' 가 그 회귀 방어선이다.)
// 그래서 이 훅의 책임은 ①②뿐이다 — 취소 로직을 손으로 만들면 react-query 와 두 벌이 된다.
import { useEffect, useRef, useState } from 'react';
import type { CompositionEvent, KeyboardEvent } from 'react';

/** 타이핑 한 글자마다 조회하지 않는다 — 조합 완료 후 이 시간만큼 잠잠하면 커밋한다 */
const DEBOUNCE_MS = 250;

interface DebouncedSearchConfig {
  /** URL 등에서 복원한 초기 검색어 (IA-13) */
  readonly initial: string;
  /** 커밋된 검색어가 바뀌면 호출 — 보통 URL 에 쓴다 */
  readonly onCommit: (keyword: string) => void;
  /**
   * 이 길이 미만이면 커밋하지 않는다(빈 문자열은 '검색 해제' 라 언제나 커밋한다).
   * 기본 1 = 제한 없음. 대형 목록에서 한 글자 검색이 사실상 전체 스캔이면 올린다.
   */
  readonly minLength?: number;
}

/** 훅의 반환 — 검색 UI 를 자기 컴포넌트로 분리한 화면이 prop 타입으로 쓴다 (logs LogToolbar) */
export interface DebouncedSearch {
  /** 입력창에 그대로 묶는 값 — 조합 중에도 사용자가 친 그대로 보인다 */
  readonly input: string;
  readonly setInput: (value: string) => void;
  /** 입력창에 스프레드한다 — 조합 판정과 Enter 차단이 여기 붙어 있다 */
  readonly inputProps: {
    readonly onCompositionStart: (event: CompositionEvent<HTMLInputElement>) => void;
    readonly onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
    readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  };
}

export function useDebouncedSearch({
  initial,
  onCommit,
  minLength = 1,
}: DebouncedSearchConfig): DebouncedSearch {
  const [input, setInput] = useState(initial);

  /**
   * 조합 중인가 — **state 와 ref 를 함께 둔다.** 둘 다 필요하다:
   *   · state: 아래 커밋 effect 가 반응해야 한다. 조합이 끝나는 순간 effect 가 다시 돌아
   *     디바운스를 건다. ref 뿐이었다면 compositionend 가 리렌더를 안 일으켜 커밋이 영영 안 걸린다.
   *   · ref: onKeyDown 은 **동기적으로** 판정해야 한다. setState 는 다음 렌더에 반영되므로
   *     조합 시작 직후의 Enter 를 state 로 막으려 하면 이미 늦는다.
   */
  const [composing, setComposing] = useState(false);
  const composingRef = useRef(false);

  const setComposingBoth = (value: boolean) => {
    composingRef.current = value;
    setComposing(value);
  };

  // onCommit 은 렌더마다 새 함수로 올 수 있다 — deps 에 넣으면 타이머가 매 렌더 재설정된다
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // 외부(뒤로가기·필터 초기화)가 검색어를 바꾸면 입력창도 따라간다
  const lastInitialRef = useRef(initial);
  useEffect(() => {
    if (lastInitialRef.current === initial) return;
    lastInitialRef.current = initial;
    setInput(initial);
  }, [initial]);

  useEffect(() => {
    // ① 조합 중에는 커밋하지 않는다 — 자모 단위 부분 문자열로 조회가 나가는 것을 막는다.
    //    compositionend 가 composing 을 내리면 이 effect 가 다시 돌아 그때 디바운스를 건다.
    if (composing) return;

    const trimmed = input.trim();
    // 빈 문자열은 '검색 해제' 라 길이 정책과 무관하게 통과시킨다
    if (trimmed !== '' && trimmed.length < minLength) return;

    const timer = setTimeout(() => {
      commitRef.current(trimmed);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [input, composing, minLength]);

  return {
    input,
    setInput,
    inputProps: {
      onCompositionStart: () => setComposingBoth(true),
      onCompositionEnd: (event) => {
        setComposingBoth(false);
        // compositionend 의 확정 문자열이 change 보다 늦게 오는 브라우저가 있다 —
        // 여기서 값을 한 번 더 맞춰 두면 마지막 글자가 누락되지 않는다.
        setInput(event.currentTarget.value);
      },
      onKeyDown: (event) => {
        // ② 조합 중 Enter 는 **IME 의 확정 키**다 — 폼 제출이 아니다.
        //    '홍길ㄷ' 같은 부분 문자열이 제출되는 것을 막는다.
        //
        //    [두 신호를 함께 본다] `nativeEvent.isComposing` 은 표준이지만 **우리가 관측한
        //    compositionstart** 도 같은 사실을 말한다. 둘 중 하나만 믿지 않는 이유: isComposing 은
        //    합성 이벤트(자동화·일부 IME 구현)에서 누락될 수 있고, 그때 조합 중 Enter 가 그대로
        //    통과한다. 우리 자신의 관측을 곁들이면 그 구멍이 닫힌다.
        if (event.nativeEvent.isComposing || composingRef.current) {
          event.stopPropagation();
          return;
        }
        // 조합이 아닌 Enter 는 즉시 커밋(디바운스를 기다리지 않는다) — 명시적 제출이다
        if (event.key === 'Enter') {
          event.preventDefault();
          commitRef.current(event.currentTarget.value.trim());
        }
      },
    },
  };
}
