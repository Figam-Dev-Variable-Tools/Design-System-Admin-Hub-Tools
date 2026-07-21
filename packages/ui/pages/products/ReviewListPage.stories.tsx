/**
 * Design System/Templates/Products/Review List — 리뷰 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/products/reviews` → 메뉴 en = "Products"(상품 관리), 화면 en = "Reviews"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Products 그룹의 `['/products/reviews', '리뷰', 'Reviews']`).
 *
 * 대응 실화면: apps/admin/src/pages/products/reviews/ReviewListPage.tsx (라우트 /products/reviews).
 * 리뷰는 **삭제 가능 CRUD 목록**이라 선택 체크박스 + 순번 + 행 액션(수정 연필·삭제 휴지통) + 일괄 삭제
 * 바를 갖는다. 실화면은 shared/crud 의 CrudListShell → CrudTable → DS Table 로 조립된다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   상품명·작성자 검색          → SearchField
 *   별점 필터                  → SelectField
 *   전체선택 헤더 / 행 선택칸    → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   포토·답변·신고 배지          → StatusBadge ×3
 *   노출 인라인 토글            → ToggleSwitch
 *   행 액션(수정·삭제)          → RowActions (연필 → 상세, 휴지통 → 삭제 확인)
 *   선택 일괄 삭제 바           → SelectionBar + Button(danger)
 *   삭제 확인                  → ConfirmDialog(intent=delete)
 *   목록 표                    → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                    → Empty
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·em 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  ToggleSwitch,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Review List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 Review 를 화면이 쓰는 필드만 축약해 흉내) ─────────────────────────────── */

type ReviewRating = 1 | 2 | 3 | 4 | 5;

interface DemoReview {
  readonly id: string;
  readonly productName: string;
  readonly author: string;
  readonly rating: ReviewRating;
  readonly content: string;
  readonly imageCount: number;
  readonly createdAt: string;
  readonly visible: boolean;
  readonly reported: boolean;
  readonly reply: string;
}

/** 별점 → 채운 별 문자열(장식) — 실화면 starText 미러. 접근성 라벨은 호출부가 '5점 만점에 N점' */
const starText = (rating: ReviewRating): string =>
  '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);

const RATING_FILTER_ALL = 'all';
type RatingFilter = typeof RATING_FILTER_ALL | ReviewRating;

/** 별점 필터 선택지 — 실화면 RATING_FILTER_OPTIONS 미러 */
const RATING_FILTER_OPTIONS: readonly { readonly id: RatingFilter; readonly label: string }[] = [
  { id: 'all', label: '전체 별점' },
  { id: 5, label: '★ 5점' },
  { id: 4, label: '★ 4점' },
  { id: 3, label: '★ 3점' },
  { id: 2, label: '★ 2점' },
  { id: 1, label: '★ 1점' },
];

const DEMO_REVIEWS: readonly DemoReview[] = [
  {
    id: 'rv-1',
    productName: '베이직 크루넥 니트',
    author: '하루***',
    rating: 5,
    content: '핏이 딱 맞고 도톰해서 좋아요. 세탁 후에도 늘어나지 않네요.',
    imageCount: 2,
    createdAt: '2026-07-19',
    visible: true,
    reported: false,
    reply: '소중한 후기 감사합니다. 앞으로도 좋은 상품으로 보답하겠습니다.',
  },
  {
    id: 'rv-2',
    productName: '워시드 데님 팬츠',
    author: '준호***',
    rating: 2,
    content: '배송이 너무 늦었고 포장도 아쉬웠습니다.',
    imageCount: 0,
    createdAt: '2026-07-17',
    visible: true,
    reported: true,
    reply: '',
  },
  {
    id: 'rv-3',
    productName: '오버핏 후디',
    author: '민지***',
    rating: 4,
    content: '색감이 화면과 거의 같아요. 도톰한 기모라 가을에 딱입니다.',
    imageCount: 3,
    createdAt: '2026-07-15',
    visible: true,
    reported: false,
    reply: '',
  },
  {
    id: 'rv-4',
    productName: '레더 스니커즈',
    author: '유진***',
    rating: 1,
    content: '한 번 신었는데 밑창이 벌어졌어요. 실망입니다.',
    imageCount: 1,
    createdAt: '2026-07-12',
    visible: false,
    reported: true,
    reply: '불편을 드려 죄송합니다. 교환 또는 환불 도와드리겠습니다.',
  },
  {
    id: 'rv-5',
    productName: '코튼 셔츠',
    author: '우성***',
    rating: 5,
    content: '재구매입니다. 무난하게 입기 좋아요.',
    imageCount: 0,
    createdAt: '2026-07-10',
    visible: true,
    reported: false,
    reply: '',
  },
  {
    id: 'rv-6',
    productName: '패딩 베스트',
    author: '아름***',
    rating: 3,
    content: '가볍고 따뜻한데 지퍼가 조금 뻑뻑해요.',
    imageCount: 1,
    createdAt: '2026-07-08',
    visible: true,
    reported: false,
    reply: '',
  },
];

const ENTITY_LABEL = '리뷰';
const nameOf = (item: DemoReview): string => `${item.productName} 리뷰`;
const SELECT_ALL_LABEL_ID = 'review-select-all';
const PAGE_SIZE = 10;

/* ── 표 열 정의(데이터 열 7개 — 선택·순번은 leading, 액션은 trailing 으로 별도) ────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'product', header: '상품명' },
  { id: 'author', header: '작성자', nowrap: true },
  { id: 'rating', header: '별점', nowrap: true },
  { id: 'content', header: '내용' },
  { id: 'badges', header: '표시', nowrap: true },
  { id: 'createdAt', header: '작성일', nowrap: true },
  { id: 'visible', header: '노출', nowrap: true },
];

/* ── 스타일(토큰·rem·em 만) ───────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 5)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
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

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
};

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ReviewsScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialSelectedIds?: readonly string[];
}

function ReviewsScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
}: ReviewsScreenProps) {
  const [reviews, setReviews] = useState<readonly DemoReview[]>(DEMO_REVIEWS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<RatingFilter>(RATING_FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoReview | null>(null);

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return reviews.filter((review) => {
      if (filter !== RATING_FILTER_ALL && review.rating !== filter) return false;
      if (kw === '') return true;
      return (
        review.productName.toLowerCase().includes(kw) || review.author.toLowerCase().includes(kw)
      );
    });
  }, [reviews, keyword, filter]);

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const review of visible) {
        if (checked) next.add(review.id);
        else next.delete(review.id);
      }
      return next;
    });
  };

  const setVisibleFlag = (id: string, nextVisible: boolean): void => {
    setReviews((prev) =>
      prev.map((review) => (review.id === id ? { ...review, visible: nextVisible } : review)),
    );
  };

  const removeReview = (id: string): void => {
    setReviews((prev) => prev.filter((review) => review.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((review, index) => ({
    id: review.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 리뷰 상세(/products/reviews/:id) */
    },
    // 선택 열이 있는 표라 selected 를 항상 실어 보낸다(실화면 CrudTable 미러) — false 는
    // 정의된 boolean 이라 exactOptionalPropertyTypes 위반이 아니다.
    selected: selectedIds.has(review.id),
    leading: [
      <RowSelectCell
        key="select"
        id={review.id}
        label={`${nameOf(review)} 선택`}
        checked={selectedIds.has(review.id)}
        onToggle={(checked) => toggleOne(review.id, checked)}
      />,
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      review.productName,
      review.author,
      <span style={starStyle} role="img" aria-label={`5점 만점에 ${String(review.rating)}점`}>
        {starText(review.rating)}
      </span>,
      <span style={contentStyle}>{review.content}</span>,
      <span style={badgeRowStyle}>
        {review.imageCount > 0 && <StatusBadge tone="info" label="포토" />}
        {review.reply.trim() !== '' && <StatusBadge tone="success" label="답변" />}
        {review.reported && <StatusBadge tone="danger" label="신고" />}
      </span>,
      review.createdAt,
      <ToggleSwitch
        checked={review.visible}
        onChange={(next) => setVisibleFlag(review.id, next)}
        label={`${review.productName} 리뷰 노출 여부`}
        onLabel="노출"
        offLabel="숨김"
      />,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={nameOf(review)}
          onEdit={() => {
            /* 실화면: 연필 → 리뷰 상세(노출·답변 편집)로 이동 */
          }}
          onDelete={() => setConfirming(review)}
        />
      </td>,
    ],
  }));

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={searchWrapStyle}>
        <SearchField
          label="상품명·작성자 검색"
          value={keyword}
          placeholder="상품명 · 작성자 검색"
          onChange={setKeyword}
        />
      </div>
      <span style={selectWrapStyle}>
        <SelectField
          value={String(filter)}
          aria-label="별점으로 거르기"
          onChange={(event) => {
            const raw = event.target.value;
            setFilter(
              RATING_FILTER_OPTIONS.find((option) => String(option.id) === raw)?.id ??
                RATING_FILTER_ALL,
            );
          }}
        >
          {RATING_FILTER_OPTIONS.map((option) => (
            <option key={String(option.id)} value={String(option.id)}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>리뷰</h1>

      {toolbar}

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${visible.length.toLocaleString('ko-KR')}건`}
        {selectedCount > 0 ? ` · ${selectedCount.toLocaleString('ko-KR')}건 선택됨` : ''}
      </p>

      {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          onClick={() => {
            for (const id of selectedIds) removeReview(id);
          }}
        >
          {`선택 ${selectedCount.toLocaleString('ko-KR')}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="리뷰 목록 — 행을 누르면 리뷰 상세로 이동합니다. 체크박스·수정·삭제 버튼은 각자의 동작을 수행합니다."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 리뷰 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={toggleAll}
          />,
          <SeqHeaderCell key="seq" />,
        ]}
        trailingHead={[
          <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
            <span style={visuallyHidden}>행 액션</span>
          </th>,
        ]}
        loading={loading}
        skeletonRows={PAGE_SIZE}
        empty={
          <EmptyState
            label={ENTITY_LABEL}
            hasQuery={keyword.trim() !== ''}
            onClearSearch={() => setKeyword('')}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="리뷰 삭제"
          message={`${confirming.productName} 리뷰를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="리뷰 삭제"
          onConfirm={() => {
            removeReview(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/** 정상: 리뷰 목록이 채워진 기본 상태(선택 없음) */
export const Default: Story = {
  render: () => <ReviewsScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ReviewsScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <ReviewsScreen initialKeyword="등록되지 않은 상품" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <ReviewsScreen initialSelectedIds={['rv-2', 'rv-4']} />,
};
