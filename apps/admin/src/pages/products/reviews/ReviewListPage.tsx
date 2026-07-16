// ReviewListPage — 리뷰 목록 (라우트: /products/reviews) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 별점 필터 + 검색 + 포토/신고 배지 +
// 노출 인라인 토글 + 삭제팝업을 얹는다. 행의 연필 액션은 상세(노출·답변)로 이동한다. 목록엔 이미지 열 없음.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { SearchField, SelectField, StatusBadge, ToggleSwitch } from '../../../shared/ui';
import { CrudListShell, useCrudList, useCrudRowUpdate } from '../../../shared/crud';
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

const RESOURCE = 'reviews';
const ENTITY_LABEL = '리뷰';
const LIST_PATH = '/products/reviews';

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = {
  width: 'calc(var(--tds-space-6) * 5)',
};

const starStyle: CSSProperties = {
  color: 'var(--tds-color-feedback-warning-text)',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const contentStyle: CSSProperties = {
  display: 'block',
  maxWidth: 'calc(var(--tds-space-6) * 10)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const badgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

const nameOf = (item: Review) => `${item.productName} 리뷰`;

export default function ReviewListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<RatingFilter>(RATING_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

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
        <ToggleSwitch
          checked={item.visible}
          busy={toggle.pendingId === item.id}
          onChange={(next) =>
            toggle.run(
              item.id,
              { ...toReviewInput(item), visible: next },
              {
                success: next
                  ? `${item.productName} 리뷰를 노출했습니다.`
                  : `${item.productName} 리뷰를 숨겼습니다.`,
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
          value={keyword}
          onChange={setKeyword}
          label="상품명·작성자 검색"
          placeholder="상품명 · 작성자 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={String(filter)}
            onChange={(event) =>
              setFilter(
                event.target.value === RATING_FILTER_ALL
                  ? RATING_FILTER_ALL
                  : (Number(event.target.value) as RatingFilter),
              )
            }
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
      selectAllLabelId="review-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}`)}
    />
  );
}
