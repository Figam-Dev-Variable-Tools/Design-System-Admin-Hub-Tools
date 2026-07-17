// 통계의 빈 상태
//
// [STATE-05 — 왜 얇은 껍데기가 하나 더 있나] @tds/ui 의 Empty 가 3분기(진짜 비어있음 / 검색 결과
// 없음 / 필터 결과 없음)와 조사(이/가) 처리를 이미 갖는다. 여기서 더하는 것은 **통계에만 맞는
// 동사**뿐이다: 통계는 사용자가 '등록'하는 게 아니라 서버가 '집계'한다. '등록된 방문 기록이
// 없습니다'는 틀린 문장이고, 통계 화면에는 생성 CTA 도 없다(만들 수 있는 게 아니다).
//
// createVerb='집계' → '집계된 방문 기록이 없습니다' — 조사는 Empty 가 받침을 보고 고른다 (ERP-13).
import { Empty } from '@tds/ui';

interface StatsEmptyProps {
  /** 무엇이 비었는가 — 조사 없는 맨 명사를 넘긴다 ('방문 기록', '검색어') */
  readonly label: string;
  readonly hasQuery?: boolean | undefined;
  readonly hasActiveFilters?: boolean | undefined;
  readonly onClearSearch?: (() => void) | undefined;
  readonly onResetFilters?: (() => void) | undefined;
}

export function StatsEmpty({
  label,
  hasQuery = false,
  hasActiveFilters = false,
  onClearSearch,
  onResetFilters,
}: StatsEmptyProps) {
  // Empty 는 콜백이 '주어졌는지'로 복구 버튼을 그릴지 정한다. exactOptionalPropertyTypes 아래에서
  // undefined 를 명시로 넘기는 것과 키를 빼는 것은 다르므로, 없는 콜백은 키째로 뺀다.
  const recovery = {
    ...(onClearSearch === undefined ? {} : { onClearSearch }),
    ...(onResetFilters === undefined ? {} : { onResetFilters }),
  };

  return (
    <Empty
      label={label}
      createVerb="집계"
      hasQuery={hasQuery}
      hasActiveFilters={hasActiveFilters}
      {...recovery}
    />
  );
}
