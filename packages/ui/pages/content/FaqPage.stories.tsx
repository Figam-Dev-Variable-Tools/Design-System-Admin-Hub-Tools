/**
 * Design System/Templates/Content/FAQ — FAQ 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/faq` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "FAQ"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의 `['/content/faq', 'FAQ', 'FAQ']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/faq/FaqPage.tsx (라우트 /content/faq) 와 그 하위 조립
 * (components/FaqFilters.tsx · components/FaqTable.tsx · components/ManageFaqCategoriesModal.tsx).
 * FAQ 는 공지와 두 가지가 다르다: (1) **노출 여부를 목록에서 바로 토글**하고 일괄 노출/숨김이 있다,
 * (2) **정렬 순서를 행에서 직접 바꾼다** — 다만 재정렬은 필터/검색이 없는 자연 순서 화면에서만 켠다
 * (걸러진 부분집합을 재정렬하면 '한 칸 위' 가 무엇인지 말할 수 없다). 카테고리는 서버가 만드는 값이라
 * 목록에서 모달로 관리한다(사용 중인 카테고리는 삭제가 잠긴다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각은 DS 표면으로 갈음한다:
 *   FilterRail/FilterPanel(앱) → aria-pressed 토글 버튼 목록 + Badge 건수
 *   FaqTable(앱)              → DS Table(+ 선택·순번·재정렬·행 액션 조각)
 *   useReorderableRows 의 드래그 → moveArrayItem + ReorderMoveButtons(키보드 경로만 — DS Table 은 <tr> 을 소유한다)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   FAQ 질문 검색(IME 안전)     → SearchField
 *   좌측 카테고리·노출 여부 필터  → aria-pressed 토글 버튼 목록 + Badge 건수 (실화면 FilterPanel ×2)
 *   카테고리 관리 · FAQ 등록      → Button(secondary) · Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸     → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   정렬 손잡이 열 / 이동 버튼    → ReorderGripHeaderCell · ReorderGripCell · ReorderMoveButtons (+ moveArrayItem)
 *   순번 열                      → SeqHeaderCell · SeqCell
 *   노출 인라인 토글              → ToggleSwitch (onLabel 노출 / offLabel 숨김)
 *   행 액션(삭제만)               → RowActions (수정은 상세에서 — onEdit 를 주지 않는다)
 *   일괄 노출/숨김/삭제 바        → SelectionBar + Button(secondary ×2 · danger)
 *   삭제 확인 · 일괄 삭제 확인     → ConfirmDialog(intent=delete)
 *   카테고리 관리 모달            → Modal + StatusBadge(사용량) + IconButton(trash) + TextField
 *   목록 표                      → Table (leadingHead=선택+손잡이+순번 / trailingHead=행 액션)
 *   빈 결과                      → Empty (검색 지우기 · 필터 초기화 · 등록)
 *   페이지네이션(범위+번호)       → Pagination
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  IconButton,
  Modal,
  Pagination,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  TextField,
  ToggleSwitch,
  cssVar,
  moveArrayItem,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/FAQ',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인(실화면 content/faq/types.ts 미러 — @tds/ui 경계라 값으로 복사) ────────────────────── */

/** 카테고리 필터의 '전체' 값 — 카테고리 id 와 섞이지 않게 상수로 둔다 */
const CATEGORY_ALL = 'all';

type VisibilityFilter = 'all' | 'visible' | 'hidden';

const VISIBILITY_FILTERS: readonly { readonly id: VisibilityFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'visible', label: '노출' },
  { id: 'hidden', label: '숨김' },
];

interface DemoCategory {
  readonly id: string;
  readonly label: string;
}

/** 카테고리는 서버가 만든다 — 컴파일 시점의 유니온이 없어 문자열 id 를 그대로 쓴다(캐스팅이 아니다) */
const FAQ_CATEGORIES: readonly DemoCategory[] = [
  { id: 'account', label: '계정' },
  { id: 'payment', label: '결제' },
  { id: 'delivery', label: '배송' },
  { id: 'etc', label: '기타' },
];

/* ── 데모 데이터(실화면 data-source 픽스처를 목록이 쓰는 필드만 축약해 미러) ──────────────────── */

interface DemoFaq {
  readonly id: string;
  readonly question: string;
  readonly categoryId: string;
  /** 카테고리 라벨 — 서버가 조인해 내려준다 */
  readonly categoryLabel: string;
  /** 노출 여부 — 끄면 사용자 화면에서 숨는다 */
  readonly visible: boolean;
  /** 정렬 순서 — 작을수록 위에 온다 */
  readonly order: number;
}

const DEMO_FAQS: readonly DemoFaq[] = [
  {
    id: 'FAQ-001',
    question: '비밀번호를 잊어버렸어요',
    categoryId: 'account',
    categoryLabel: '계정',
    visible: false,
    order: 1,
  },
  {
    id: 'FAQ-002',
    question: '결제 수단은 무엇이 있나요',
    categoryId: 'payment',
    categoryLabel: '결제',
    visible: true,
    order: 2,
  },
  {
    id: 'FAQ-003',
    question: '배송은 얼마나 걸리나요',
    categoryId: 'delivery',
    categoryLabel: '배송',
    visible: true,
    order: 3,
  },
  {
    id: 'FAQ-004',
    question: '탈퇴는 어떻게 하나요',
    categoryId: 'etc',
    categoryLabel: '기타',
    visible: true,
    order: 4,
  },
  {
    id: 'FAQ-005',
    question: '회원 정보를 수정하고 싶어요',
    categoryId: 'account',
    categoryLabel: '계정',
    visible: true,
    order: 5,
  },
  {
    id: 'FAQ-006',
    question: '결제 취소는 언제까지 가능한가요',
    categoryId: 'payment',
    categoryLabel: '결제',
    visible: false,
    order: 6,
  },
  {
    id: 'FAQ-007',
    question: '배송지를 변경할 수 있나요',
    categoryId: 'delivery',
    categoryLabel: '배송',
    visible: true,
    order: 7,
  },
  {
    id: 'FAQ-008',
    question: '쿠폰은 어디서 확인하나요',
    categoryId: 'etc',
    categoryLabel: '기타',
    visible: true,
    order: 8,
  },
  {
    id: 'FAQ-009',
    question: '아이디를 찾고 싶어요',
    categoryId: 'account',
    categoryLabel: '계정',
    visible: true,
    order: 9,
  },
  {
    id: 'FAQ-010',
    question: '현금영수증을 발급받고 싶어요',
    categoryId: 'payment',
    categoryLabel: '결제',
    visible: true,
    order: 10,
  },
  {
    id: 'FAQ-011',
    question: '해외 배송도 되나요',
    categoryId: 'delivery',
    categoryLabel: '배송',
    visible: false,
    order: 11,
  },
  {
    id: 'FAQ-012',
    question: '고객센터 운영 시간이 궁금해요',
    categoryId: 'etc',
    categoryLabel: '기타',
    visible: true,
    order: 12,
  },
];

const PAGE_SIZE = 10;

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계라 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* 건수 배지는 **검색·필터 이전** 전체 집합에서 센다 — 실화면도 좌측 배지는 전체 기준이다 */

const CATEGORY_COUNTS: Record<string, number> = (() => {
  const counts: Record<string, number> = { [CATEGORY_ALL]: DEMO_FAQS.length };
  for (const category of FAQ_CATEGORIES) counts[category.id] = 0;
  for (const faq of DEMO_FAQS) counts[faq.categoryId] = (counts[faq.categoryId] ?? 0) + 1;
  return counts;
})();

const VISIBILITY_COUNTS: Record<VisibilityFilter, number> = {
  all: DEMO_FAQS.length,
  visible: DEMO_FAQS.filter((faq) => faq.visible).length,
  hidden: DEMO_FAQS.filter((faq) => !faq.visible).length,
};

/** 카테고리 관리 모달의 사용량 — 1건 이상이면 삭제를 막는다(고아 FAQ 방지) */
const usageLabel = (faqCount: number): string =>
  faqCount === 0 ? '미사용' : `${fmt(faqCount)}개 FAQ 사용 중`;

/* ── 표 열 정의(데이터 열 4개 — 선택·손잡이·순번은 leading, 액션은 trailing 으로 별도) ────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'question', header: '질문' },
  { id: 'category', header: '카테고리', nowrap: true },
  { id: 'visible', header: '노출', nowrap: true },
  { id: 'order', header: '정렬 순서', align: 'end' },
];

/** 헤더 전체선택의 보이지 않는 라벨 id — TriStateCheckbox 가 aria-labelledby 로 가리킨다 */
const SELECT_ALL_LABEL_ID = 'faqs-select-all-label';

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

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

/** 좌: 고정 폭 필터 레일 / 우: 남는 폭 전부(minmax(0,…) 이라야 표가 그리드를 밀지 않는다) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const railStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const filterGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const filterHeadingStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const filterButtonStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: active ? cssVar('color.border.default') : 'transparent',
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.text.default') : cssVar('color.text.muted'),
  cursor: 'pointer',
  textAlign: 'start',
  ...typography('typography.label.md'),
});

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const toolbarActionsStyle: CSSProperties = {
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

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const questionTextStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  color: cssVar('color.action.primary.default'),
};

const actionCellWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.1'),
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

/* ── 카테고리 관리 모달 스타일 ────────────────────────────────────────────────────────────── */

const modalBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const categoryListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const categoryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const categoryLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const categoryLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
};

const dividerStyle: CSSProperties = {
  marginTop: cssVar('space.2'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  borderStyle: 'none',
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

/* ── 좌측 필터 패널 조립(FilterPanel 미러: 제목 + 목록 + aria-pressed + 건수 Badge) ─────────── */

interface FilterGroupProps<V extends string> {
  readonly heading: string;
  readonly navLabel: string;
  readonly options: readonly { readonly id: V; readonly label: string }[];
  readonly value: V;
  readonly counts: Readonly<Record<string, number>> | null;
  readonly onChange: (value: V) => void;
}

function FilterGroup<V extends string>({
  heading,
  navLabel,
  options,
  value,
  counts,
  onChange,
}: FilterGroupProps<V>) {
  return (
    <nav aria-label={navLabel} style={filterGroupStyle}>
      <p style={filterHeadingStyle}>{heading}</p>
      <ul style={filterListStyle}>
        {options.map((option) => {
          const active = option.id === value;
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={active}
                style={filterButtonStyle(active)}
                onClick={() => onChange(option.id)}
              >
                <span>{option.label}</span>
                {/* 건수를 아직 모르면 '—' 를 둔다(0 과 '모름' 은 다르다) — 첫 로드 중이 그렇다 */}
                {counts === null ? (
                  <span aria-hidden>—</span>
                ) : (
                  <Badge count={counts[option.id] ?? 0} hideWhenZero={false} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── 카테고리 관리 모달(ManageFaqCategoriesModal 미러: 목록 + 사용량 + 삭제 잠금 + 등록) ────── */

function ManageCategoriesModal({
  usage,
  onClose,
}: {
  readonly usage: Readonly<Record<string, number>>;
  readonly onClose: () => void;
}) {
  const [name, setName] = useState('');

  return (
    <Modal
      title="FAQ 카테고리 관리"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            닫기
          </Button>
          <Button variant="primary" size="md" type="submit">
            카테고리 만들기
          </Button>
        </>
      }
    >
      <div style={modalBodyStyle}>
        <ul style={categoryListStyle}>
          {FAQ_CATEGORIES.map((category) => {
            const faqCount = usage[category.id] ?? 0;
            const inUse = faqCount > 0;
            return (
              <li key={category.id} style={categoryRowStyle}>
                <span style={categoryLeftStyle}>
                  <span style={categoryLabelStyle}>{category.label}</span>
                  <StatusBadge tone={inUse ? 'info' : 'neutral'} label={usageLabel(faqCount)} />
                </span>
                {/* 사용 중이면 삭제를 잠근다 — 서버도 409 로 막는 안전 기본값 */}
                <IconButton
                  icon={<Icon name="trash" />}
                  label={
                    inUse
                      ? `${category.label} — ${usageLabel(faqCount)}라 삭제할 수 없어요`
                      : `${category.label} 삭제`
                  }
                  size="sm"
                  disabled={inUse}
                />
              </li>
            );
          })}
        </ul>

        <hr style={dividerStyle} />

        <TextField
          id="faq-category-name"
          label="새 카테고리"
          value={name}
          placeholder="예: 결제"
          onChange={(event) => setName(event.target.value)}
        />

        <p style={hintStyle}>
          카테고리를 만들면 FAQ 등록 화면의 분류 선택지에 추가돼요. 사용 중인 카테고리는 삭제할 수
          없어요 — 먼저 그 FAQ 들의 카테고리를 바꾸거나 삭제하세요.
        </p>
      </div>
    </Modal>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface FaqScreenProps {
  /** 최초 로드 스켈레톤 — Table loading (재조회가 아니라 첫 로드만 · STATE-01) */
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialCategoryId?: string;
  readonly initialVisibility?: VisibilityFilter;
  readonly initialSelectedIds?: readonly string[];
}

function FaqScreen({
  loading = false,
  initialKeyword = '',
  initialCategoryId = CATEGORY_ALL,
  initialVisibility = 'all',
  initialSelectedIds = [],
}: FaqScreenProps) {
  const [faqs, setFaqs] = useState<readonly DemoFaq[]>(DEMO_FAQS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [visibility, setVisibility] = useState<VisibilityFilter>(initialVisibility);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [pendingDelete, setPendingDelete] = useState<DemoFaq | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [managing, setManaging] = useState(false);

  // 카테고리 + 노출 여부(AND) + 질문 키워드 — 실화면 data-source.applyQuery 미러
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return faqs.filter((faq) => {
      if (categoryId !== CATEGORY_ALL && faq.categoryId !== categoryId) return false;
      if (visibility === 'visible' && !faq.visible) return false;
      if (visibility === 'hidden' && faq.visible) return false;
      if (kw === '') return true;
      return faq.question.toLowerCase().includes(kw);
    });
  }, [faqs, keyword, categoryId, visibility]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIndex = (safePage - 1) * PAGE_SIZE;

  const selection = tableSelectionState(pageRows, selectedIds);
  const selectedCount = selectedIds.size;
  const hasActiveFilters = categoryId !== CATEGORY_ALL || visibility !== 'all';

  /**
   * [재정렬은 자연 순서에서만] 필터·검색이 걸린 부분집합에서 '한 칸 위'는 무엇인지 말할 수 없다 —
   * 실화면 reorderable 판정을 그대로 미러한다.
   */
  const reorderable = categoryId === CATEGORY_ALL && visibility === 'all' && keyword === '';

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
      for (const faq of pageRows) {
        if (checked) next.add(faq.id);
        else next.delete(faq.id);
      }
      return next;
    });
  };

  // 조건이 바뀌면 1페이지로 되돌리고 선택을 비운다(실화면 useListState 미러 · STATE-04-b)
  const changeKeyword = (next: string): void => {
    setKeyword(next);
    setPage(1);
    setSelectedIds(new Set());
  };
  const changeCategory = (next: string): void => {
    setCategoryId(next);
    setPage(1);
    setSelectedIds(new Set());
  };
  const changeVisibility = (next: VisibilityFilter): void => {
    setVisibility(next);
    setPage(1);
    setSelectedIds(new Set());
  };

  const setVisibleFlag = (ids: readonly string[], nextVisible: boolean): void => {
    const targets = new Set(ids);
    setFaqs((prev) =>
      prev.map((faq) => (targets.has(faq.id) ? { ...faq, visible: nextVisible } : faq)),
    );
  };

  const removeFaqs = (ids: readonly string[]): void => {
    const doomed = new Set(ids);
    setFaqs((prev) =>
      prev.filter((faq) => !doomed.has(faq.id)).map((faq, index) => ({ ...faq, order: index + 1 })),
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of doomed) next.delete(id);
      return next;
    });
  };

  /** 위/아래 이동 — moveArrayItem 으로 새 순서를 만들고 order 를 1..n 으로 다시 매긴다 */
  const moveBy = (index: number, delta: number): void => {
    setFaqs((prev) =>
      moveArrayItem(prev, startIndex + index, startIndex + index + delta).map((faq, position) => ({
        ...faq,
        order: position + 1,
      })),
    );
  };

  const createButton = (
    <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
      FAQ 등록
    </Button>
  );

  const categoryOptions: readonly { readonly id: string; readonly label: string }[] = [
    { id: CATEGORY_ALL, label: '전체' },
    ...FAQ_CATEGORIES,
  ];

  const rows: TableProps['rows'] = pageRows.map((faq, index) => ({
    id: faq.id,
    // 선택 열이 있는 표라 selected 를 항상 실어 보낸다(실화면 FaqTable 미러)
    selected: selectedIds.has(faq.id),
    onActivate: () => {
      /* 실화면: 행을 누르면 FAQ 상세(/content/faq/:id)로 이동한다 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={faq.id}
        label={`${faq.question} 선택`}
        checked={selectedIds.has(faq.id)}
        onToggle={(checked) => toggleOne(faq.id, checked)}
      />,
      ...(reorderable ? [<ReorderGripCell key="grip" />] : []),
      <SeqCell key="seq" seq={startIndex + index + 1} />,
    ],
    cells: [
      <span key="question" style={questionTextStyle}>
        {faq.question}
      </span>,
      faq.categoryLabel,
      <ToggleSwitch
        key="visible"
        checked={faq.visible}
        label={`${faq.question} 노출 여부`}
        onLabel="노출"
        offLabel="숨김"
        onChange={(next) => setVisibleFlag([faq.id], next)}
      />,
      fmt(faq.order),
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <span style={actionCellWrapStyle}>
          {reorderable && (
            <ReorderMoveButtons
              label={faq.question}
              index={index}
              count={pageRows.length}
              locked={false}
              onMove={moveBy}
            />
          )}
          {/* 수정은 상세에서 한다 — 실화면도 행에는 삭제만 둔다(onEdit 없음) */}
          <RowActions label={faq.question} onDelete={() => setPendingDelete(faq)} />
        </span>
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>FAQ</h1>

      <div style={layoutStyle}>
        <aside style={railStyle}>
          <FilterGroup
            heading="카테고리"
            navLabel="FAQ 카테고리 필터"
            options={categoryOptions}
            value={categoryId}
            counts={loading ? null : CATEGORY_COUNTS}
            onChange={changeCategory}
          />
          <FilterGroup
            heading="노출 여부"
            navLabel="FAQ 노출 여부 필터"
            options={VISIBILITY_FILTERS}
            value={visibility}
            counts={loading ? null : VISIBILITY_COUNTS}
            onChange={changeVisibility}
          />
        </aside>

        <div style={columnStyle}>
          <div style={toolbarStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                label="FAQ 질문 검색"
                value={keyword}
                placeholder="FAQ 질문 검색"
                onChange={changeKeyword}
              />
            </span>
            <span style={toolbarActionsStyle}>
              <Button variant="secondary" size="md" onClick={() => setManaging(true)}>
                카테고리 관리
              </Button>
              {createButton}
            </span>
          </div>

          <p style={summaryStyle} aria-busy={loading}>
            {loading ? '불러오는 중…' : `전체 ${fmt(total)}건`}
            {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
          </p>

          {/* 일괄 노출·숨김·삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
          <SelectionBar count={selectedCount} noun="건" onClear={() => setSelectedIds(new Set())}>
            <Button variant="secondary" onClick={() => setVisibleFlag([...selectedIds], true)}>
              일괄 노출
            </Button>
            <Button variant="secondary" onClick={() => setVisibleFlag([...selectedIds], false)}>
              일괄 숨김
            </Button>
            <Button variant="danger" onClick={() => setBulkOpen(true)}>
              {`선택 ${fmt(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <Table
            caption={
              reorderable
                ? 'FAQ 목록 — 행을 누르면 FAQ 상세로 이동해요. 체크박스·노출 토글·삭제 버튼은 각자의 동작을 수행하며, 각 행의 위/아래 버튼으로 정렬 순서를 바꿔요.'
                : 'FAQ 목록 — 행을 누르면 FAQ 상세로 이동해요. 체크박스·노출 토글·삭제 버튼은 각자 따로 동작해요. 필터·검색이 걸려 있어 정렬 순서는 바꿀 수 없어요.'
            }
            columns={COLUMNS}
            rows={rows}
            leadingHead={[
              <SelectAllHeaderCell
                key="select-all"
                label="이 페이지의 FAQ 전체 선택"
                labelId={SELECT_ALL_LABEL_ID}
                selection={selection}
                onToggleAll={toggleAll}
              />,
              ...(reorderable ? [<ReorderGripHeaderCell key="grip-head" />] : []),
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
                label="FAQ"
                hasQuery={keyword.trim() !== ''}
                hasActiveFilters={hasActiveFilters}
                action={createButton}
                onClearSearch={() => changeKeyword('')}
                onResetFilters={() => {
                  changeCategory(CATEGORY_ALL);
                  setVisibility('all');
                }}
              />
            }
          />

          <Pagination
            page={safePage}
            totalPages={totalPages}
            label="FAQ 페이지"
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      </div>

      {managing && (
        <ManageCategoriesModal usage={CATEGORY_COUNTS} onClose={() => setManaging(false)} />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="FAQ 삭제"
          message={`'${pendingDelete.question}' FAQ 를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="FAQ 삭제"
          onConfirm={() => {
            removeFaqs([pendingDelete.id]);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="FAQ 일괄 삭제"
          message={`선택한 FAQ ${fmt(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel={`${fmt(selectedCount)}건 삭제`}
          onConfirm={() => {
            removeFaqs([...selectedIds]);
            setBulkOpen(false);
          }}
          onCancel={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

/** 정상: 자연 순서 화면 — 정렬 손잡이 열 + 행 위/아래 이동 버튼이 켜져 있고 노출 토글이 살아 있다 */
export const Default: Story = {
  render: () => <FaqScreen />,
};

/** 최초 로드: 표 스켈레톤 + 좌측 건수 '—'(모름) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <FaqScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 · 등록 복구 경로) */
export const Empty: Story = {
  render: () => <FaqScreen initialKeyword="등록되지 않은 질문" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 노출 · 일괄 숨김 · 일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <FaqScreen initialSelectedIds={['FAQ-002', 'FAQ-006', 'FAQ-011']} />,
};

/** 필터 적용: 카테고리=결제 · 노출 여부=숨김(AND) — 부분집합이라 재정렬 손잡이·이동 버튼이 사라진다 */
export const Filtered: Story = {
  render: () => <FaqScreen initialCategoryId="payment" initialVisibility="hidden" />,
};
