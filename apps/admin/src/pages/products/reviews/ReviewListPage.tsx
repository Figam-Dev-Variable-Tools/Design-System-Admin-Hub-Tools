// ReviewListPage — 리뷰 목록 (라우트: /products/reviews)
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 별점 필터 + 검색 + 포토/신고 배지 +
// 노출 인라인 토글 + 삭제팝업을 얹는다. 행의 연필 액션은 상세(노출·답변)로 이동한다. 목록엔 이미지 열 없음.
//
// [조회 상태의 소유자] rating·keyword 는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — 1점 리뷰만 골라 한 건을 열어 답변을 달고 Back 하면
// 예전에는 별점 필터가 풀린 전체 목록에 착지해, 방금 처리하던 악성 리뷰 줄을 처음부터 다시 찾아야 했다.
// 이 화면은 그 루프(낮은 별점 훑기 → 답변 → 다음)가 업무 자체라 손실이 특히 크다. 이제 그 조건이
// URL 에 남아 복원되고 링크로 공유된다. 검색은 IME 안전이다 (COMP-10) — '배송지연' 을 치는 도중
// 자모마다 조회가 나가거나 Enter 가 '배송지ㅇ' 으로 제출되지 않는다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import {
  CrudListShell,
  RowToggle,
  useCrudList,
  useCrudRowUpdate,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { reviewAdapter } from './data-source';
import {
  filterByRating,
  isPhotoReview,
  RATING_FILTER_ALL,
  RATING_FILTER_OPTIONS,
  searchReviews,
  starText,
  toReviewInput,
} from './types';
import type { RatingFilter, Review, ReviewInput } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'reviews';
const ENTITY_LABEL = '리뷰';
const LIST_PATH = '/products/reviews';

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_DEFAULTS = { rating: RATING_FILTER_ALL } as const;

/**
 * URL 문자열 → 별점 필터.
 *
 * [왜 parseFilter 가 아닌가] 다른 목록의 필터는 문자열 유니온이라 shared/crud 의 parseFilter 로 좁히지만,
 * 별점만은 `'all' | 1|2|3|4|5` 로 **숫자**가 섞인 유니온이다. URL 은 문자열만 담으므로 문자열 허용
 * 목록으로는 숫자 값을 되돌릴 수 없다. 옵션 목록(별점 선택지의 단일 원천)에서 id 를 찾아 돌려주면
 * `as` 없이 좁혀지고, 허용 목록과 select 가 그리는 값이 영원히 어긋나지 않는다.
 * 모르는 값(?rating=별하나 · ?rating=9)은 '전체'로 떨어진다 — 손으로 고친 URL 이 목록을 깨지 않는다.
 */
function toRatingFilter(raw: string): RatingFilter {
  return RATING_FILTER_OPTIONS.find((option) => String(option.id) === raw)?.id ?? RATING_FILTER_ALL;
}

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 5)`,
};

const starStyle: CSSProperties = {
  color: cssVar('color.feedback.warning.text'),
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const contentStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const badgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const nameOf = (item: Review) => `${item.productName} 리뷰`;

export default function ReviewListPage() {
  const navigate = useNavigate();
  // rating·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const filter: RatingFilter = toRatingFilter(list.filters['rating'] ?? RATING_FILTER_ALL);
  const { keyword } = list;

  const controller = useCrudList<Review, ReviewInput>({
    resource: RESOURCE,
    adapter: reviewAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;
  const toggle = useCrudRowUpdate<Review, ReviewInput>(RESOURCE, reviewAdapter);

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(() => {
    const byRating = filterByRating(controller.items, filter);
    return searchReviews(byRating, keyword);
  }, [controller.items, filter, keyword]);

  const columns: readonly CrudColumn<Review>[] = [
    { header: '상품명', render: (item) => item.productName },
    { header: '작성자', nowrap: true, render: (item) => item.author },
    {
      header: '별점',
      nowrap: true,
      render: (item) => (
        <span style={starStyle} role="img" aria-label={`5점 만점에 ${String(item.rating)}점`}>
          {starText(item.rating)}
        </span>
      ),
    },
    { header: '내용', render: (item) => <span style={contentStyle}>{item.content}</span> },
    {
      header: '표시',
      nowrap: true,
      render: (item) => (
        <span style={badgeRowStyle}>
          {isPhotoReview(item) && <StatusBadge tone="info" label="포토" />}
          {item.reply.trim() !== '' && <StatusBadge tone="success" label="답변" />}
          {item.reported && <StatusBadge tone="danger" label="신고" />}
        </span>
      ),
    },
    { header: '작성일', nowrap: true, render: (item) => item.createdAt },
    {
      header: '노출',
      nowrap: true,
      render: (item) => (
        <RowToggle
          checked={item.visible}
          busy={toggle.pendingId === item.id}
          canUpdate={toggle.canUpdate}
          onChange={(next) =>
            toggle.run(
              item.id,
              { ...toReviewInput(item), visible: next },
              {
                success: next
                  ? `${item.productName} 리뷰를 노출했어요.`
                  : `${item.productName} 리뷰를 숨겼어요.`,
              },
            )
          }
          label={`${item.productName} 리뷰 노출 여부`}
          onLabel="노출"
          offLabel="숨김"
        />
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="상품명·작성자 검색"
          placeholder="상품명 · 작성자 검색"
          // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={String(filter)}
            onChange={(event) => list.setFilter('rating', event.target.value)}
            aria-label="별점으로 거르기"
          >
            {RATING_FILTER_OPTIONS.map((option) => (
              <option key={String(option.id)} value={String(option.id)}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visible}
      columns={columns}
      nameOf={nameOf}
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="review-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}`)}
      /* 이 화면의 행 클릭은 **상세**로 간다 — 형제 목록 대부분(/:id/edit)과 다르다.
         예전에는 onEdit 라는 이름 뒤에 숨어 캡션이 '수정 화면' 이라고 잘못 읽었다. */
      rowTarget={{ kind: 'detail', href: (item) => `${LIST_PATH}/${item.id}` }}
    />
  );
}
