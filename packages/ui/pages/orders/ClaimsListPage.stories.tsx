/**
 * Design System/Templates/Orders/Claims — 클레임(취소·교환·반품) 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/orders/claims` → 메뉴 en = "Orders"(주문 관리), 화면 en = "Claims"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Orders 그룹의
 * `['/orders/claims', '취소/교환/반품', 'Claims']`).
 *
 * 대응 실화면: apps/admin/src/pages/orders/claims/ClaimsListPage.tsx (라우트 /orders/claims) 와
 * 그 하위 조립(types.ts · refund.ts) · 공용 껍데기(shared/crud/CrudReadListShell).
 *
 * [왜 '교환/반품' 이 '클레임' 이 되었나 — 취소가 갈 곳이 없었다] 예전 유형은 교환·반품 둘뿐이라
 * 운영자는 취소 건을 '반품' 으로 접수해 놓고 메모에 '실은 취소' 라고 적었다. 셋은 **같은 사건의 세
 * 시점**이다: 출고 전에 멈추면 취소, 나갔다 돌아오면 반품, 돌아오고 다시 나가면 교환. 그래서 한
 * 창구에서 다루고, 유형은 열 하나(배지)로 구분한다.
 *
 * [상태와 환불은 나란한 두 축이다 — 이 화면에 열이 둘인 이유] 클레임 완료와 환불 완료는 다른
 * 사건이다. 검수까지 끝났어도 정산일에 맞춰 며칠 뒤 송금하는 일이 흔하고, 반대로 불량이 확실해
 * 돈부터 보내는 경우도 있다. 상태 열만 있으면 '완료' 로 보이는 건들 중 어느 것이 아직 돈을 안
 * 보냈는지 목록에서 가려낼 수 없어, 운영자는 건마다 상세를 열어 확인하게 된다.
 * **교환은 '환불 없음' 이 아니라 '해당 없음' 이다** — 없는 일과 안 한 일은 다르다.
 *
 * [읽기 전용 목록] 클레임은 고객이 접수하고 관리자는 처리만 한다. 감사 성격이라 지우지도 않는다.
 * 그래서 선택 체크박스도 행 액션 열도 없고(CrudReadListShell), 행을 누르면 상세(처리)로 간다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudReadListShell → DS Table(leadingHead=순번만 · 선택 열 없음) + 툴바 + 요약 줄
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   주문번호·상품·신청자 검색  → SearchField
 *   유형 · 상태 필터           → SelectField ×2
 *   순번 열                   → SeqHeaderCell · SeqCell (선택 열은 없다)
 *   유형 배지(취소·교환·반품)   → StatusBadge (danger · info · warning)
 *   처리 상태 배지             → StatusBadge (접수·수거중·검수중·완료·반려·철회)
 *   환불 상태 배지             → StatusBadge (환불 없음·환불 접수·환불 완료 / 교환은 '해당 없음')
 *   목록 표                   → Table
 *   빈 결과                   → Empty (검색 지우기 · 필터 초기화)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Empty as EmptyState,
  SearchField,
  SelectField,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Orders/Claims',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 claims/types.ts · claims/refund.ts 미러) ─────────────────────────────── */

/** 클레임 유형 — 셋을 가르는 것은 '출고' 시점이다 */
type ClaimKind = 'cancel' | 'exchange' | 'return';

const KIND_OPTIONS: readonly { readonly id: ClaimKind; readonly label: string }[] = [
  { id: 'cancel', label: '취소' },
  { id: 'exchange', label: '교환' },
  { id: 'return', label: '반품' },
];

/** 키를 다 적은 Record — 유형이 하나 늘면 컴파일이 막아 준다 */
const KIND_TONE: Readonly<Record<ClaimKind, StatusBadgeTone>> = {
  cancel: 'danger',
  exchange: 'info',
  return: 'warning',
};

const KIND_LABEL: Readonly<Record<ClaimKind, string>> = {
  cancel: '취소',
  exchange: '교환',
  return: '반품',
};

/**
 * 처리 상태 — 접수 → 수거중 → 검수중 → 완료, 그리고 흐름 밖 종료 둘(반려·철회).
 * 철회는 접수를 되돌리는 유일한 역방향 전이라 '없던 일' 로 지우지 않는다.
 */
type ClaimStatus =
  'requested' | 'collecting' | 'inspecting' | 'completed' | 'rejected' | 'withdrawn';

const CLAIM_STATUSES: readonly ClaimStatus[] = [
  'requested',
  'collecting',
  'inspecting',
  'completed',
  'rejected',
  'withdrawn',
];

const STATUS_META: Readonly<
  Record<ClaimStatus, { readonly label: string; readonly tone: StatusBadgeTone }>
> = {
  requested: { label: '접수', tone: 'neutral' },
  collecting: { label: '수거중', tone: 'info' },
  inspecting: { label: '검수중', tone: 'warning' },
  completed: { label: '완료', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
  withdrawn: { label: '철회', tone: 'neutral' },
};

/** 환불 진행 — 없음 → 접수 → 완료. **클레임 상태와 나란한 별개의 축이다** */
type RefundStatus = 'none' | 'requested' | 'completed';

const REFUND_META: Readonly<
  Record<RefundStatus, { readonly label: string; readonly tone: StatusBadgeTone }>
> = {
  none: { label: '환불 없음', tone: 'neutral' },
  requested: { label: '환불 접수', tone: 'warning' },
  completed: { label: '환불 완료', tone: 'success' },
};

const FILTER_ALL = 'all';
type KindFilter = typeof FILTER_ALL | ClaimKind;
type StatusFilter = typeof FILTER_ALL | ClaimStatus;

const STATUS_FILTER_OPTIONS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: FILTER_ALL, label: '전체 상태' },
  ...CLAIM_STATUSES.map((status) => ({ id: status, label: STATUS_META[status].label })),
];

/* ── 데모 데이터(실화면 CLAIM_SEED 를 목록이 쓰는 필드만 축약해 미러) ────────────────────────── */

interface DemoClaim {
  readonly id: string;
  /** 주문 참조 — 값은 주문번호를 겸하는 주문 id 다 */
  readonly orderId: string;
  /** 접수 시점의 상품명(스냅숏) — 상품이 지워져도 이 행은 자기 이름을 말할 수 있어야 한다 */
  readonly productName: string;
  /** 주문된 옵션 조합. 단일 상품이면 빈 배열 */
  readonly optionValues: readonly string[];
  /** 신청자 — 마스킹된 이름(실명 아님) */
  readonly customer: string;
  readonly kind: ClaimKind;
  readonly reason: string;
  readonly requestedAt: string;
  readonly status: ClaimStatus;
  readonly refundStatus: RefundStatus;
}

/** 접수일 내림차순(최근이 위) — 실화면 sortClaims 가 낸 순서 그대로 */
const DEMO_CLAIMS: readonly DemoClaim[] = [
  {
    id: 'clm-8',
    orderId: 'ORD-20260720-0002',
    // 취소는 주문 단위라 대표 품목으로 적는다(목록의 '외 N건' 표기와 같은 규칙)
    productName: '오브제 미니멀 크로스백 외 1건',
    optionValues: [],
    customer: '오**',
    kind: 'cancel',
    reason: '배송 지연',
    requestedAt: '2026-07-21',
    status: 'requested',
    refundStatus: 'requested',
  },
  {
    id: 'clm-7',
    orderId: 'ORD-20260719-0003',
    productName: '루미엔 경량 패딩 점퍼',
    optionValues: ['베이지', 'M'],
    customer: '남**',
    kind: 'cancel',
    reason: '입금 전 취소',
    requestedAt: '2026-07-19',
    status: 'requested',
    refundStatus: 'none',
  },
  {
    id: 'clm-6',
    orderId: 'ORD-20260716-0005',
    productName: '테라 스니커즈 데일리',
    optionValues: ['250'],
    customer: '서**',
    kind: 'cancel',
    reason: '주문 실수',
    requestedAt: '2026-07-17',
    status: 'requested',
    refundStatus: 'requested',
  },
  {
    id: 'clm-1',
    orderId: 'ORD-20260712-0031',
    productName: '루미엔 경량 패딩 점퍼',
    optionValues: ['블랙', 'M'],
    customer: '김**',
    kind: 'exchange',
    reason: '사이즈 교환',
    requestedAt: '2026-07-12',
    status: 'requested',
    // 교환은 물건을 바꿔 줄 뿐 돈이 오가지 않는다 — 환불 축 자체가 해당 없음이다
    refundStatus: 'none',
  },
  {
    id: 'clm-2',
    orderId: 'ORD-20260710-0148',
    productName: '테라 스니커즈 데일리',
    optionValues: ['260'],
    customer: '박**',
    kind: 'return',
    reason: '단순 변심',
    requestedAt: '2026-07-10',
    status: 'collecting',
    refundStatus: 'requested',
  },
  {
    id: 'clm-3',
    orderId: 'ORD-20260708-0092',
    productName: '노바 베이직 코튼 티셔츠',
    optionValues: ['화이트'],
    customer: '이**',
    kind: 'return',
    reason: '상품 불량',
    requestedAt: '2026-07-08',
    // 검수는 끝나가는데 환불은 아직 시작도 안 했다 — 두 축이 별개라는 사실이 이 한 줄에 보인다
    status: 'inspecting',
    refundStatus: 'none',
  },
  {
    id: 'clm-4',
    orderId: 'ORD-20260705-0210',
    productName: '오브제 미니멀 크로스백',
    optionValues: [],
    customer: '최**',
    kind: 'return',
    reason: '단순 변심',
    requestedAt: '2026-07-05',
    status: 'completed',
    // 환불 완료에서만 적립금·쿠폰이 복원된다
    refundStatus: 'completed',
  },
  {
    id: 'clm-5',
    orderId: 'ORD-20260703-0177',
    productName: '카밀 워시드 데님 팬츠',
    optionValues: ['30'],
    customer: '정**',
    kind: 'exchange',
    reason: '변심 교환',
    requestedAt: '2026-07-03',
    status: 'rejected',
    refundStatus: 'none',
  },
];

/* ── 순수 규칙(실화면 미러) ───────────────────────────────────────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 옵션 조합 표기 — '블랙 / M'. 옵션이 없는 상품은 '단일 상품' */
const optionLabel = (values: readonly string[]): string =>
  values.length === 0 ? '단일 상품' : values.join(' / ');

/** 환불 대상 유형인가 — 교환은 물건을 바꿔 줄 뿐 돈이 오가지 않는다 */
const isRefundable = (kind: ClaimKind): boolean => kind !== 'exchange';

/**
 * 목록의 환불 열이 그리는 것 — 교환은 '해당 없음' 이라고 말한다.
 * 교환에 '환불 없음' 배지를 달면 '아직 환불하지 않았다' 로 읽혀 할 일처럼 보인다.
 */
function refundCellMeta(claim: DemoClaim): {
  readonly label: string;
  readonly tone: StatusBadgeTone;
} {
  if (!isRefundable(claim.kind)) return { label: '해당 없음', tone: 'neutral' };
  return REFUND_META[claim.refundStatus];
}

function searchClaims(list: readonly DemoClaim[], keyword: string): readonly DemoClaim[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (claim) =>
      claim.orderId.toLowerCase().includes(needle) ||
      claim.productName.toLowerCase().includes(needle) ||
      claim.customer.toLowerCase().includes(needle),
  );
}

/* ── 표 열 정의(데이터 열 9개 — 순번은 leading 으로 별도) ────────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'orderId', header: '주문번호', nowrap: true },
  { id: 'kind', header: '유형', nowrap: true },
  { id: 'product', header: '상품' },
  { id: 'option', header: '옵션', nowrap: true },
  { id: 'customer', header: '신청자', nowrap: true },
  { id: 'reason', header: '사유' },
  { id: 'requestedAt', header: '접수일', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'refund', header: '환불', nowrap: true },
];

const PAGE_SIZE = 8;

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

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

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
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

const orderNoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const reasonStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 8)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ClaimsListScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialKind?: KindFilter;
  readonly initialStatus?: StatusFilter;
}

function ClaimsListScreen({
  loading = false,
  initialKeyword = '',
  initialKind = FILTER_ALL,
  initialStatus = FILTER_ALL,
}: ClaimsListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);

  const visible = useMemo(() => {
    const byKind = kind === FILTER_ALL ? DEMO_CLAIMS : DEMO_CLAIMS.filter((c) => c.kind === kind);
    const byStatus =
      status === FILTER_ALL ? byKind : byKind.filter((claim) => claim.status === status);
    return searchClaims(byStatus, keyword);
  }, [kind, status, keyword]);

  const hasActiveFilters = kind !== FILTER_ALL || status !== FILTER_ALL;

  const rows: TableProps['rows'] = visible.map((claim, index) => {
    const statusMeta = STATUS_META[claim.status];
    const refundMeta = refundCellMeta(claim);
    return {
      id: claim.id,
      onActivate: () => {
        /* 실화면: 행 클릭 → 클레임 상세(/orders/claims/:id) */
      },
      leading: [<SeqCell key="seq" seq={index + 1} />],
      cells: [
        <span key="orderId" style={orderNoStyle}>
          {claim.orderId}
        </span>,
        <StatusBadge key="kind" tone={KIND_TONE[claim.kind]} label={KIND_LABEL[claim.kind]} />,
        <span key="product">{claim.productName}</span>,
        <span key="option">{optionLabel(claim.optionValues)}</span>,
        <span key="customer">{claim.customer}</span>,
        <span key="reason" style={reasonStyle}>
          {claim.reason}
        </span>,
        <span key="requestedAt" style={orderNoStyle}>
          {claim.requestedAt}
        </span>,
        <StatusBadge key="status" tone={statusMeta.tone} label={statusMeta.label} />,
        <StatusBadge key="refund" tone={refundMeta.tone} label={refundMeta.label} />,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>취소/교환/반품</h1>
      <p style={descriptionStyle}>
        고객이 접수하고 관리자는 처리해요. 클레임 처리와 환불은 별개의 축이라 열이 둘이에요 —
        적립금·쿠폰은 <strong>환불 완료</strong>에서만 복원돼요.
      </p>

      <div style={toolbarStyle}>
        <span style={searchWrapStyle}>
          <SearchField
            value={keyword}
            onChange={setKeyword}
            label="주문번호·상품·신청자 검색"
            placeholder="주문번호 · 상품 · 신청자 검색"
          />
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={kind}
            aria-label="유형으로 거르기"
            onChange={(event) => {
              const next = KIND_OPTIONS.find((option) => option.id === event.target.value);
              setKind(next === undefined ? FILTER_ALL : next.id);
            }}
          >
            <option value={FILTER_ALL}>전체 유형</option>
            {KIND_OPTIONS.map((option) => (
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
            onChange={(event) => {
              const next = STATUS_FILTER_OPTIONS.find(
                (option) => String(option.id) === event.target.value,
              );
              setStatus(next === undefined ? FILTER_ALL : next.id);
            }}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>

      <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}</p>

      <div style={tableScrollStyle}>
        <Table
          caption="클레임 목록 — 행을 누르면 클레임 상세(처리)로 이동해요. 상태와 환불은 별개의 축이라 열이 둘이에요."
          columns={COLUMNS}
          rows={rows}
          leadingHead={[<SeqHeaderCell key="seq" />]}
          loading={loading}
          skeletonRows={PAGE_SIZE}
          empty={
            <EmptyState
              label="클레임"
              createVerb="접수"
              hasQuery={keyword.trim() !== ''}
              hasActiveFilters={hasActiveFilters}
              onClearSearch={() => setKeyword('')}
              onResetFilters={() => {
                setKind(FILTER_ALL);
                setStatus(FILTER_ALL);
              }}
            />
          }
        />
      </div>
    </div>
  );
}

/**
 * 정상: 세 유형이 섞인 목록 — 상태와 환불이 어긋난 줄(검수중인데 환불 없음)과 교환의 '해당 없음'
 * 이 나란히 보인다.
 */
export const Default: Story = {
  render: () => <ClaimsListScreen />,
};

/** 최초 로드: 표 스켈레톤 — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ClaimsListScreen loading />,
};

/** 유형 필터(취소): 예전에는 갈 곳이 없어 '반품' 으로 접수되던 건들이 자기 유형으로 선다 */
export const CancelKind: Story = {
  render: () => <ClaimsListScreen initialKind="cancel" />,
};

/** 상태 필터(완료): 클레임이 끝난 건 — 환불까지 끝났는지는 **옆 열이 따로 말한다** */
export const CompletedStatus: Story = {
  render: () => <ClaimsListScreen initialStatus="completed" />,
};

/** 빈 결과: 검색이 맞지 않음 — Table empty 슬롯에 Empty(검색 지우기 · 필터 초기화) */
export const Empty: Story = {
  render: () => <ClaimsListScreen initialKeyword="존재하지 않는 주문" />,
};
