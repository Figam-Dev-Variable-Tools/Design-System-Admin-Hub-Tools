/**
 * Design System/Templates/Products/Returns List — 교환/반품 요청 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/products/returns` → 메뉴 en = "Products"(상품 관리), 화면 en = "Returns"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Products 그룹의 `['/products/returns', '교환/반품', 'Returns']`).
 *
 * 대응 실화면: apps/admin/src/pages/products/returns/ReturnsListPage.tsx (라우트 /products/returns).
 * 이 화면은 **읽기 전용 목록**이라 삭제·일괄작업·선택 체크박스가 없다(고객이 요청을 만들고 관리자는
 * 처리만 한다). 실화면은 shared/crud 의 CrudReadListShell → CrudTable → DS Table 로 조립된다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudReadListShell/CrudTable → DS Table(+ SeqHeaderCell·SeqCell 로 순번 열)
 *   DetailCellLink(접수번호)     → 토큰만 쓴 <a> (실화면은 키보드 상세 진입용 링크)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   주문번호·상품·신청자 검색   → SearchField
 *   유형 필터 · 상태 필터       → SelectField ×2
 *   순번 열                    → SeqHeaderCell · SeqCell (실화면 CrudTable 이 자동으로 붙인다)
 *   유형·상태 배지              → StatusBadge
 *   목록 표(8열 + 순번)         → Table (leadingHead=순번, 조회 전용이라 선택·액션 열 없음)
 *   빈 결과                    → Empty (검색/필터/진짜 비어있음 3분기)
 *   조회 실패                  → Alert(danger) + 다시 시도 Button
 *
 * [페이지네이션 없음] 실화면의 CrudReadListShell 은 페이지네이션을 두지 않는다(요약 한 줄 + 표뿐).
 * 없는 UI 를 지어내지 않기 위해 여기서도 두지 않는다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Empty as EmptyState,
  SearchField,
  SeqCell,
  SeqHeaderCell,
  SelectField,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Returns List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 ReturnRequest 를 화면이 쓰는 필드만 축약해 흉내) ──────────────────────── */

type ReturnKind = 'exchange' | 'return';
type ReturnStatus = 'requested' | 'collecting' | 'inspecting' | 'completed' | 'rejected';

interface DemoReturn {
  readonly id: string;
  readonly orderNo: string;
  readonly productName: string;
  readonly optionValues: readonly string[];
  readonly customer: string;
  readonly kind: ReturnKind;
  readonly reason: string;
  readonly requestedAt: string;
  readonly status: ReturnStatus;
}

/** 유형 라벨·색 — 실화면 kindLabel/kindTone 미러(교환=info, 반품=warning) */
const KIND_LABEL: Record<ReturnKind, string> = { exchange: '교환', return: '반품' };
const KIND_TONE: Record<ReturnKind, StatusBadgeTone> = { exchange: 'info', return: 'warning' };

/** 상태 라벨·색 — 실화면 STATUS_META 미러 */
const STATUS_META: Record<
  ReturnStatus,
  { readonly label: string; readonly tone: StatusBadgeTone }
> = {
  requested: { label: '접수', tone: 'neutral' },
  collecting: { label: '수거중', tone: 'info' },
  inspecting: { label: '검수중', tone: 'warning' },
  completed: { label: '완료', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
};

const KIND_FILTER_ALL = 'all';
const STATUS_FILTER_ALL = 'all';
type KindFilter = typeof KIND_FILTER_ALL | ReturnKind;
type StatusFilter = typeof STATUS_FILTER_ALL | ReturnStatus;

/** 상태 필터 선택지 — 실화면 STATUS_FILTER_OPTIONS 미러 */
const STATUS_FILTER_OPTIONS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: 'all', label: '전체 상태' },
  { id: 'requested', label: '접수' },
  { id: 'collecting', label: '수거중' },
  { id: 'inspecting', label: '검수중' },
  { id: 'completed', label: '완료' },
  { id: 'rejected', label: '반려' },
];

const KIND_FILTER_OPTIONS: readonly { readonly id: ReturnKind; readonly label: string }[] = [
  { id: 'exchange', label: '교환' },
  { id: 'return', label: '반품' },
];

/** 옵션 조합 표기 — '블랙 / M'. 옵션이 없으면 '단일 상품' (실화면 optionLabel 미러) */
const optionLabel = (values: readonly string[]): string =>
  values.length === 0 ? '단일 상품' : values.join(' / ');

const DEMO_RETURNS: readonly DemoReturn[] = [
  {
    id: 'r-1',
    orderNo: 'ORD-24817',
    productName: '베이직 크루넥 니트',
    optionValues: ['차콜', 'M'],
    customer: '김*연',
    kind: 'exchange',
    reason: '사이즈 교환 요청',
    requestedAt: '2026-07-18',
    status: 'requested',
  },
  {
    id: 'r-2',
    orderNo: 'ORD-24790',
    productName: '워시드 데님 팬츠',
    optionValues: ['인디고', '30'],
    customer: '이*호',
    kind: 'return',
    reason: '단순 변심',
    requestedAt: '2026-07-16',
    status: 'collecting',
  },
  {
    id: 'r-3',
    orderNo: 'ORD-24765',
    productName: '오버핏 후디',
    optionValues: [],
    customer: '박*지',
    kind: 'exchange',
    reason: '색상 불량 — 얼룩',
    requestedAt: '2026-07-14',
    status: 'inspecting',
  },
  {
    id: 'r-4',
    orderNo: 'ORD-24712',
    productName: '레더 스니커즈',
    optionValues: ['화이트', '250'],
    customer: '최*진',
    kind: 'return',
    reason: '제품 하자 — 접착 불량',
    requestedAt: '2026-07-11',
    status: 'completed',
  },
  {
    id: 'r-5',
    orderNo: 'ORD-24688',
    productName: '코튼 셔츠',
    optionValues: ['스카이', 'L'],
    customer: '정*성',
    kind: 'exchange',
    reason: '오배송 — 다른 옵션 수령',
    requestedAt: '2026-07-09',
    status: 'rejected',
  },
  {
    id: 'r-6',
    orderNo: 'ORD-24651',
    productName: '패딩 베스트',
    optionValues: ['블랙', 'S'],
    customer: '강*늘',
    kind: 'return',
    reason: '사이즈 상이',
    requestedAt: '2026-07-05',
    status: 'requested',
  },
];

const ENTITY_LABEL = '교환/반품 요청';

/* ── 표 열 정의(데이터 열 8개 — 순번 열은 leadingHead·leading 으로 별도) ──────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'orderNo', header: '접수번호', nowrap: true },
  { id: 'product', header: '상품' },
  { id: 'option', header: '옵션' },
  { id: 'customer', header: '신청자' },
  { id: 'kind', header: '유형', nowrap: true },
  { id: 'reason', header: '사유' },
  { id: 'requestedAt', header: '접수일', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
];

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

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

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  whiteSpace: 'nowrap',
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const PAGE_SIZE = 10;

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ReturnsScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 조회 실패 — 실화면 CrudReadListShell 의 error 분기(Alert + 다시 시도) */
  readonly errored?: boolean;
  /** 검색 초기값 — Empty(검색 결과 없음) 상태를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
}

function ReturnsScreen({
  loading = false,
  errored = false,
  initialKeyword = '',
}: ReturnsScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [kind, setKind] = useState<KindFilter>(KIND_FILTER_ALL);
  const [status, setStatus] = useState<StatusFilter>(STATUS_FILTER_ALL);

  // 유형 + 상태(AND) + 주문번호/상품/신청자 키워드 — 실화면 필터 파이프라인 미러
  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_RETURNS.filter((item) => {
      if (kind !== KIND_FILTER_ALL && item.kind !== kind) return false;
      if (status !== STATUS_FILTER_ALL && item.status !== status) return false;
      if (kw === '') return true;
      return (
        item.orderNo.toLowerCase().includes(kw) ||
        item.productName.toLowerCase().includes(kw) ||
        item.customer.toLowerCase().includes(kw)
      );
    });
  }, [keyword, kind, status]);

  const rows: TableProps['rows'] = visible.map((item, index) => ({
    id: item.id,
    onActivate: () => {
      /* 실화면에서는 상세(/products/returns/:id)로 이동한다 — 템플릿에서는 조작 없음 */
    },
    leading: [<SeqCell key="seq" seq={index + 1} />],
    cells: [
      <a href={`#return-${item.id}`} style={linkStyle} aria-label={`${item.orderNo} 상세`}>
        {item.orderNo}
      </a>,
      item.productName,
      optionLabel(item.optionValues),
      item.customer,
      <StatusBadge tone={KIND_TONE[item.kind]} label={KIND_LABEL[item.kind]} />,
      item.reason,
      item.requestedAt,
      <StatusBadge tone={STATUS_META[item.status].tone} label={STATUS_META[item.status].label} />,
    ],
  }));

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={searchWrapStyle}>
        <SearchField
          label="주문번호·상품·신청자 검색"
          value={keyword}
          placeholder="주문번호 · 상품 · 신청자 검색"
          onChange={setKeyword}
        />
      </div>
      <span style={selectWrapStyle}>
        <SelectField
          value={kind}
          aria-label="유형으로 거르기"
          onChange={(event) => setKind(event.target.value as KindFilter)}
        >
          <option value={KIND_FILTER_ALL}>전체 유형</option>
          {KIND_FILTER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={status}
          aria-label="상태로 거르기"
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>교환/반품</h1>

      {toolbar}

      {errored ? (
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>{`${ENTITY_LABEL} 목록을 불러오지 못했습니다.`}</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      ) : (
        <>
          <p style={summaryStyle}>
            {loading ? '불러오는 중…' : `전체 ${visible.length.toLocaleString('ko-KR')}건`}
          </p>

          <Table
            caption={`${ENTITY_LABEL} 목록 — 조회 전용입니다.`}
            columns={COLUMNS}
            rows={rows}
            leadingHead={[<SeqHeaderCell key="seq" />]}
            loading={loading}
            skeletonRows={PAGE_SIZE}
            empty={
              <EmptyState
                label={ENTITY_LABEL}
                createVerb="접수"
                hasQuery={keyword.trim() !== ''}
                onClearSearch={() => setKeyword('')}
              />
            }
          />
        </>
      )}
    </div>
  );
}

/** 정상: 요청 목록이 채워진 기본 상태(조회 전용 · 순번 열) */
export const Default: Story = {
  render: () => <ReturnsScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ReturnsScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <ReturnsScreen initialKeyword="존재하지 않는 주문" />,
};

/** 조회 실패: CrudReadListShell 의 error 분기 — 표 대신 Alert(danger) + 다시 시도 */
export const LoadError: Story = {
  render: () => <ReturnsScreen errored />,
};
