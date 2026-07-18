// AUTO-GENERATED from contracts/Empty.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Feedback · 상태: beta

import type { ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type EmptyState = 'default';

/**
 * 빈 결과 상태 — data view 가 0행일 때 '왜 비었는지'와 '어떻게 벗어나는지'를 구분해 보여주는 전용 컴포넌트. 단일 '표시할 항목이 없습니다' 문구는 '아직 없으니 추가하라'와 '검색이 안 맞으니 지워라'를 구분할 수 없다 (STATE-05).

[3가지 상태 — context 로 자동 분기] hasQuery / hasActiveFilters 로 상태를 고른다.
  (a) 진짜 비어있음(no query · no filters) → 아이콘 + '{createVerb}된 {label}이(가) 없습니다' + (있으면) 생성 CTA 슬롯(action).
  (b) 검색 결과 없음(hasQuery) → '조건에 맞는 {label}이(가) 없습니다' + '검색 지우기'(onClearSearch).
  (c) 필터 결과 없음(hasActiveFilters) → '필터에 맞는 {label}이(가) 없습니다' + '필터 초기화'(onResetFilters).
분기 우선순위: hasQuery > hasActiveFilters > 진짜 비어있음.

[조사(助詞) 처리 — ERP-13] label 의 마지막 한글 음절 받침 유무로 '이/가' 를 고른다 — '회원이' vs '카페가'. 리터럴 '이(가)' 를 출하하지 않는다.

[도메인 무지] 무엇이 비었는지(label)·동사(createVerb)·context(hasQuery/hasActiveFilters)·복구 콜백만 받는다. 생성 CTA 는 대상 route 를 아는 앱이 슬롯(action)으로 넣는다.

[imperative props — 계약 밖 경계] onClearSearch·onResetFilters 는 명령형 배선이라 Figma 대응이 없다. 지정되지 않으면 해당 복구 버튼을 그리지 않는다.
 */
export interface EmptyProps {
  /**
   * 대상 명사 — '회원', '공지', '문의' 등. 조사('이/가')는 마지막 음절 받침으로 자동 선택된다
   */
  label: string;
  /**
   * 진짜 비어있음 상태 문구의 동사 — '등록'/'접수' 등. '{createVerb}된 {label}…' 로 조립된다
   * @default "등록"
   */
  createVerb?: string;
  /**
   * 검색어가 적용된 상태. true 면 '검색 결과 없음'(b) 으로 분기한다 (filter/empty 보다 우선)
   * @default false
   */
  hasQuery?: boolean;
  /**
   * 필터가 적용된 상태. hasQuery 가 false 이고 이것이 true 면 '필터 결과 없음'(c) 으로 분기한다
   * @default false
   */
  hasActiveFilters?: boolean;
  /**
   * 진짜 비어있음(a) 상태의 primary 생성 CTA 슬롯 — 대상 route 를 아는 앱이 <Button> 을 넣는다. 검색/필터 상태에서는 렌더하지 않는다
   * 허용 컴포넌트: Button
   * @default null
   */
  action?: ReactNode;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 검색 결과 없음(b) 상태에서 '검색 지우기' 클릭. 지정되면 버튼을 그린다 — 미지정이면 그리지 않는다
   */
  onClearSearch?: (payload: void) => void;
  /**
   * 필터 결과 없음(c) 상태에서 '필터 초기화' 클릭. 지정되면 버튼을 그린다 — 미지정이면 그리지 않는다
   */
  onResetFilters?: (payload: void) => void;
}
