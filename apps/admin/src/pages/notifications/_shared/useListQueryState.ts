// 목록 조회 상태(분류 필터 + 검색어)를 URL 에 싣는 훅 (apps/admin/src/pages/notifications/**)
//
// [왜 페이지가 갖는가] 공용 CRUD 프레임워크는 "필터·검색은 페이지 소유"로 선을 긋는다
// (shared/crud/index.ts: "필터 : 페이지가 visibleItems 를 계산해 넘긴다 — 좌측 필터 패널·검색은 페이지 소유").
// shared/** 는 이번 배치에서 수정 금지라 이 세 화면이 쓰는 훅을 섹션 잎 모듈에 둔다.
// → 앱 전역 공용(useCrudList 통합)으로 승격할 대상이라 보고서에 올린다.
//
// [IA-13] page/filter/keyword 를 URL 쿼리스트링에 직렬화해 **단일 원천**으로 삼는다. 그래서
//   (a) 뒤로/앞으로·새로고침이 같은 화면을 복원하고 (b) 필터 걸린 목록 링크를 그대로 공유할 수 있다.
//   커밋은 replace 로 한다 — 글자마다 히스토리를 쌓으면 뒤로가기가 타이핑 재생이 되어버린다.
//
// [COMP-10] 한글 IME 대응. 한국 운영자는 전부 조합 입력을 한다:
//   · 조합 중(compositionstart~compositionend)에는 **커밋하지 않는다** — 자모마다 커밋하면
//     'ㅎ','호','홍'…이 전부 질의가 된다. 조합이 끝난 뒤에만 debounce 타이머를 건다.
//   · 조합 중 Enter 는 submit 이 아니다(`isComposing` 가드) — '홍길동' 완성 중의 Enter 가
//     '홍기'로 확정 질의를 보내는 사고를 막는다. 조합이 끝난 Enter 는 debounce 를 건너뛰고 즉시 커밋한다.
//   · 응답 경합(stale last-response-wins)은 이 섹션에 없다 — 목록은 캐시된 배열을 동기 필터하므로
//     질의당 네트워크가 발생하지 않는다. 커밋된 URL 값이 언제나 유일한 진실이다.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompositionEvent, KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { FILTER_ALL, parseCategoryFilter } from './notification';
import type { CategoryFilter } from './notification';

/** 조합이 끝난 뒤 커밋까지 기다리는 시간 — 스펙 권장 250~300ms */
const SEARCH_DEBOUNCE_MS = 250;

const CATEGORY_PARAM = 'cat';
const KEYWORD_PARAM = 'q';

/** SearchField 에 그대로 spread 하는 네이티브 핸들러 묶음 (SearchField 는 native props 를 통과시킨다) */
interface ImeSearchProps {
  readonly onCompositionStart: (event: CompositionEvent<HTMLInputElement>) => void;
  readonly onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

interface ListQueryState {
  readonly category: CategoryFilter;
  readonly setCategory: (next: CategoryFilter) => void;
  /** 입력창에 보이는 값(조합 중인 글자 포함) */
  readonly draft: string;
  readonly setDraft: (next: string) => void;
  /** 실제로 목록을 거르는 값 — 조합이 끝나고 debounce 를 지난 뒤에만 바뀐다 */
  readonly keyword: string;
  readonly imeProps: ImeSearchProps;
  readonly clearSearch: () => void;
  readonly resetFilters: () => void;
  /** STATE-05 Empty 문맥 — 검색 때문에 비었는가 */
  readonly hasQuery: boolean;
  /** STATE-05 Empty 문맥 — 필터 때문에 비었는가 */
  readonly hasActiveFilters: boolean;
}

export function useListQueryState(): ListQueryState {
  const [params, setParams] = useSearchParams();

  const category = parseCategoryFilter(params.get(CATEGORY_PARAM));
  const keyword = params.get(KEYWORD_PARAM) ?? '';

  const [draft, setDraft] = useState(keyword);
  const [composing, setComposing] = useState(false);

  // 우리가 마지막으로 URL 에 쓴 값. '내가 만든 URL 변화'와 '밖에서 온 URL 변화'를 가른다.
  const lastCommitted = useRef(keyword);

  // URL → 입력창. **밖에서 온** 변화(뒤로/앞으로·링크 복원)일 때만 입력창을 맞춘다.
  // 자기 커밋에도 되받아 쓰면 안 된다: 커밋은 trim 을 하므로 '홍 ' 를 치고 잠깐 멈추면 URL 은 '홍' 이 되고,
  // 그 값을 입력창에 되쓰면 사용자가 친 공백이 타이핑 도중에 사라진다(다음 글자가 '홍길'로 붙는다).
  useEffect(() => {
    if (keyword === lastCommitted.current) return;
    lastCommitted.current = keyword;
    setDraft(keyword);
  }, [keyword]);

  const writeParam = useCallback(
    (key: string, value: string, emptyValue: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === emptyValue) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const commit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      lastCommitted.current = trimmed;
      writeParam(KEYWORD_PARAM, trimmed, '');
    },
    [writeParam],
  );

  // 조합이 끝난 뒤에만 debounce 를 건다. composing 을 ref 가 아니라 state 로 두는 이유:
  // compositionend 가 이 효과를 **다시 돌게** 해야 완성된 낱말이 커밋되기 때문이다.
  useEffect(() => {
    if (composing) return undefined;
    if (draft.trim() === keyword) return undefined;
    const timer = window.setTimeout(() => commit(draft), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, keyword, composing, commit]);

  const imeProps: ImeSearchProps = {
    onCompositionStart: () => setComposing(true),
    onCompositionEnd: (event) => {
      // 조합 확정본이 state 반영보다 먼저 도착할 수 있어 여기서 직접 읽는다.
      setDraft(event.currentTarget.value);
      setComposing(false);
    },
    onKeyDown: (event) => {
      if (event.key !== 'Enter') return;
      // 조합 중 Enter 는 '한글 확정'이지 '검색 실행'이 아니다 — 삼켜야 한다.
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      commit(draft); // 명시적 submit — debounce 를 건너뛴다
    },
  };

  return {
    category,
    setCategory: (next) => writeParam(CATEGORY_PARAM, next, FILTER_ALL),
    draft,
    setDraft,
    keyword,
    imeProps,
    clearSearch: () => {
      setDraft('');
      commit('');
    },
    resetFilters: () => writeParam(CATEGORY_PARAM, FILTER_ALL, FILTER_ALL),
    hasQuery: keyword !== '',
    hasActiveFilters: category !== FILTER_ALL,
  };
}
