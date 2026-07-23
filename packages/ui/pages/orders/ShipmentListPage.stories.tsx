/**
 * Design System/Templates/Orders/Shipments — 배송 처리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/orders/shipments` → 메뉴 en = "Orders"(주문 관리), 화면 en =
 * "Shipments" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Orders 그룹의
 * `['/orders/shipments', '배송 처리', 'Shipments']`).
 *
 * 대응 실화면: apps/admin/src/pages/orders/shipments/ShipmentListPage.tsx (라우트 /orders/shipments)
 * 와 그 하위 조립(components/ShipmentTable.tsx · components/InvoiceBulkDialog.tsx · types.ts).
 *
 * [왜 이런 구조인가 — 행은 배송 건이 아니라 주문이다] 이 화면이 답하는 질문은 '오늘 무엇을
 * 내보내야 하는가' 이고 그 단위는 주문이다. 배송 건(송장)을 행으로 삼으면 **송장이 아직 없는
 * 주문이 목록에서 사라진다**(배송 건이 0개니까) — 정작 할 일이 가장 많은 주문이 화면에서 없어지는
 * 셈이다. 그래서 행은 주문이고, 배송 건은 그 주문에 딸린다.
 *
 * [순서가 곧 규칙이다] 배송준비중 → 송장 입력(= 배송대기) → 발송처리(= 배송중). 가운데를 건너뛰지
 * 않는 이유는 '배송대기' 가 실제 구간이기 때문이다: 운송장은 출력됐지만 아직 인수인계 전인 시간이
 * 있고, 그것을 이름으로 부르지 못하면 운영자는 나가지도 않은 물건을 '배송중' 이라 말하게 된다.
 *
 * [부분 발송은 상태를 밀지 않는다] 일부만 나간 주문은 상태가 그대로이고 **발송대기에 남는다** —
 * 운영자에게 남은 일이 있기 때문이다. 얼마나 나갔는지는 '부분발송 1/3' 배지가 말한다. 이 목록의
 * 건수는 곧 오늘 처리할 양이어야 하고, 반쯤 끝난 일을 완료 쪽에 놓으면 그 숫자가 거짓말이 된다.
 *
 * [일괄 버튼은 처리 가능한 건수를 글자에 싣는다] 세 버튼 모두 술어를 먼저 통과한 건수를 세고, 0 이면
 * 누를 수 없다. 이 픽스처에서 '배송준비중 처리' 가 늘 0 인 것은 버그가 아니다 — **입금전 주문은
 * 애초에 이 목록에 오지 않기 때문**이고(취소·입금전은 배송 대상이 아니다), 버튼은 그 사실을
 * 숫자로 정직하게 말한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   FilterRail/FilterPanel → aria-pressed 토글 버튼 목록 + 건수 Badge
 *   ShipmentTable         → DS Table(leading=선택·순번) + StatusBadge
 *   InvoiceBulkDialog     → Modal + SelectField·토큰 <input> 한 줄씩
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 배송 상태 필터        → aria-pressed 토글 버튼 목록 + Badge 건수 (실화면 FilterPanel)
 *   주문번호·수령인·송장번호 검색 → SearchField
 *   전체선택 헤더 / 행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                   → SeqHeaderCell · SeqCell
 *   배송 상태 · 부분발송 배지    → StatusBadge ×2
 *   송장번호 추적 링크          → 토큰 <a> (rel="noreferrer noopener" · 추적 URL 이 없으면 번호만)
 *   일괄 처리 3종 바           → SelectionBar + Button(secondary) ×3
 *   배송준비중 · 발송처리 확인   → ConfirmDialog(intent=update)
 *   송장 일괄 입력             → Modal + SelectField(등록된 택배사) + 토큰 <input>(송장번호)
 *   목록 표                   → Table
 *   빈 결과                   → Empty (검색 지우기 · 필터 초기화)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Modal,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Orders/Shipments',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 shared/domain/shipment.ts · shipments/types.ts 미러) ─────────────────── */

/**
 * 주문 하나의 **작업 상태** — 배송 건 하나의 상태(대기·중·완료)보다 값이 하나 많다.
 * 'pending'(발송대기)은 '배송 건이 아직 다 붙지 않았다' 는 사실이라 배송 건의 상태가 아니다.
 */
type WorkStatus = 'pending' | 'waiting' | 'shipping' | 'delivered';

const WORK_LABEL: Readonly<Record<WorkStatus, string>> = {
  pending: '발송대기',
  waiting: '배송대기',
  shipping: '배송중',
  delivered: '배송완료',
};

const WORK_TONE: Readonly<Record<WorkStatus, StatusBadgeTone>> = {
  pending: 'warning',
  waiting: 'info',
  shipping: 'info',
  delivered: 'success',
};

const WORK_FILTER_ALL = 'all';
type WorkFilter = typeof WORK_FILTER_ALL | WorkStatus;

/** 좌측 필터 항목 — 전체 · 네 갈래. 순서는 일이 흘러가는 순서다 */
const WORK_FILTERS: readonly { readonly id: WorkFilter; readonly label: string }[] = [
  { id: WORK_FILTER_ALL, label: '전체' },
  { id: 'pending', label: WORK_LABEL.pending },
  { id: 'waiting', label: WORK_LABEL.waiting },
  { id: 'shipping', label: WORK_LABEL.shipping },
  { id: 'delivered', label: WORK_LABEL.delivered },
];

type ShipmentStatus = 'waiting' | 'shipping' | 'delivered';

/** 등록된 택배사 — 이름이 아니라 **code 가 식별자**다(표기는 언제든 바뀐다) */
interface DemoCarrier {
  readonly id: string;
  readonly name: string;
  /** 추적 URL 템플릿 — `{{invoice}}` 자리에 송장번호가 들어간다. 비면 링크를 만들지 않는다 */
  readonly trackingUrlTemplate: string;
  readonly active: boolean;
}

/** 실화면 CARRIER_SEED 미러 — 상호도 추적 주소도 전부 가상이다 */
const CARRIERS: readonly DemoCarrier[] = [
  {
    id: 'car-1',
    name: '가상택배',
    trackingUrlTemplate: 'https://tracking.example.com/virtual?invoice={{invoice}}',
    active: true,
  },
  {
    id: 'car-2',
    name: '한빛로지스',
    trackingUrlTemplate: 'https://tracking.example.com/hanbit?no={{invoice}}',
    active: true,
  },
  // 추적 페이지가 없는 택배사도 있다 — 그때는 송장번호만 남기고 링크를 만들지 않는다
  { id: 'car-3', name: '새벽퀵', trackingUrlTemplate: '', active: true },
  // 계약이 끝난 택배사 — 지우지 않고 끈다. 지난 배송 건이 이름을 잃지 않는다
  {
    id: 'car-4',
    name: '옛길택배',
    trackingUrlTemplate: 'https://tracking.example.com/oldroad?invoice={{invoice}}',
    active: false,
  },
];

const INVOICE_TOKEN = '{{invoice}}';
const INVOICE_NO_MAX = 30;
/** 숫자와 하이픈만. 양 끝은 숫자다 — 한글·공백이 섞이면 택배사 접수 파일이 그 행에서 깨진다 */
const INVOICE_NO_RE = /^\d(?:[\d-]*\d)?$/;

/* ── 데모 데이터(실화면 ORDER_SEED × SHIPMENT_SEED 를 행 모델로 합친 결과) ───────────────────── */

interface DemoShipment {
  readonly id: string;
  readonly carrierId: string;
  readonly invoiceNo: string;
  readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
  readonly status: ShipmentStatus;
}

interface DemoRow {
  /** 행 id = 주문번호. 선택 상태가 이 값으로 움직인다 */
  readonly id: string;
  readonly orderedAt: string;
  readonly receiverName: string;
  readonly lines: readonly {
    readonly sku: string;
    readonly productName: string;
    readonly quantity: number;
  }[];
  readonly shipments: readonly DemoShipment[];
}

const DEMO_ROWS: readonly DemoRow[] = [
  {
    id: 'ORD-20260720-0002',
    orderedAt: '2026-07-20T05:02:00.000Z',
    receiverName: '오세린',
    lines: [
      { sku: 'OBJ-BAG-338', productName: '오브제 미니멀 크로스백', quantity: 1 },
      { sku: 'NVA-TEE-014-네이비', productName: '노바 베이직 코튼 티셔츠', quantity: 1 },
    ],
    // 배송 건이 아예 없다 — 송장을 붙이는 것이 오늘의 일이다
    shipments: [],
  },
  {
    id: 'ORD-20260718-0004',
    orderedAt: '2026-07-18T01:30:00.000Z',
    receiverName: '문가온',
    lines: [{ sku: 'LMN-PAD-001-차콜-L', productName: '루미엔 경량 패딩 점퍼', quantity: 1 }],
    shipments: [],
  },
  {
    id: 'ORD-20260716-0005',
    orderedAt: '2026-07-16T07:05:00.000Z',
    receiverName: '서다인',
    lines: [{ sku: 'TRA-SNK-207-250', productName: '테라 스니커즈 데일리', quantity: 1 }],
    // 송장은 붙었고 아직 안 나갔다 — 발송처리가 남았다
    shipments: [
      {
        id: 'shp-0005-1',
        carrierId: 'car-1',
        invoiceNo: '4415-2280-0091',
        lines: [{ sku: 'TRA-SNK-207-250', quantity: 1 }],
        status: 'waiting',
      },
    ],
  },
  {
    id: 'ORD-20260712-0031',
    orderedAt: '2026-07-12T03:18:00.000Z',
    receiverName: '김서연',
    lines: [
      { sku: 'LMN-PAD-001-블랙-M', productName: '루미엔 경량 패딩 점퍼', quantity: 1 },
      { sku: 'NVA-TEE-014-화이트', productName: '노바 베이직 코튼 티셔츠', quantity: 2 },
    ],
    // 부분발송 — 패딩만 실렸다. 티셔츠 2개는 아직 송장이 없다
    shipments: [
      {
        id: 'shp-0031-1',
        carrierId: 'car-1',
        invoiceNo: '4415-2280-0072',
        lines: [{ sku: 'LMN-PAD-001-블랙-M', quantity: 1 }],
        status: 'shipping',
      },
    ],
  },
  {
    id: 'ORD-20260710-0148',
    orderedAt: '2026-07-10T00:44:00.000Z',
    receiverName: '박지훈',
    lines: [{ sku: 'TRA-SNK-207-260', productName: '테라 스니커즈 데일리', quantity: 1 }],
    shipments: [
      {
        id: 'shp-0148-1',
        carrierId: 'car-2',
        invoiceNo: '77024471',
        lines: [{ sku: 'TRA-SNK-207-260', quantity: 1 }],
        status: 'delivered',
      },
    ],
  },
  {
    id: 'ORD-20260708-0092',
    orderedAt: '2026-07-08T06:12:00.000Z',
    receiverName: '이하늘',
    lines: [{ sku: 'NVA-TEE-014-화이트', productName: '노바 베이직 코튼 티셔츠', quantity: 2 }],
    shipments: [
      {
        id: 'shp-0092-1',
        carrierId: 'car-1',
        invoiceNo: '8834-0217-0011',
        lines: [{ sku: 'NVA-TEE-014-화이트', quantity: 2 }],
        status: 'delivered',
      },
    ],
  },
  {
    id: 'ORD-20260705-0210',
    orderedAt: '2026-07-05T02:50:00.000Z',
    receiverName: '최유진',
    lines: [{ sku: 'OBJ-BAG-338', productName: '오브제 미니멀 크로스백', quantity: 1 }],
    shipments: [
      {
        id: 'shp-0210-1',
        carrierId: 'car-2',
        invoiceNo: '33905521',
        lines: [{ sku: 'OBJ-BAG-338', quantity: 1 }],
        status: 'delivered',
      },
    ],
  },
  {
    id: 'ORD-20260703-0177',
    orderedAt: '2026-07-03T08:05:00.000Z',
    receiverName: '정민우',
    lines: [{ sku: 'CML-DNM-051-30', productName: '카밀 워시드 데님 팬츠', quantity: 1 }],
    shipments: [
      {
        id: 'shp-0177-1',
        carrierId: 'car-1',
        invoiceNo: '7126-4408-0003',
        lines: [{ sku: 'CML-DNM-051-30', quantity: 1 }],
        status: 'delivered',
      },
    ],
  },
];

/* ── 순수 규칙(실화면 도메인 미러 — 화면이 각자 다시 세지 않는다) ────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** ISO → 'YYYY-MM-DD HH:mm'. 문자열을 자른다 — 뷰어의 표준시가 스토리를 흔들지 않게 한다 */
const formatDateTime = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

const findCarrier = (id: string): DemoCarrier | null =>
  CARRIERS.find((carrier) => carrier.id === id) ?? null;

/** 표에 쓰는 택배사 이름 — 삭제된 택배사를 가리키는 옛 배송 건도 무언가는 말해야 한다 */
const carrierNameOf = (id: string): string => findCarrier(id)?.name ?? '알 수 없는 택배사';

const isValidInvoiceNo = (value: string): boolean => {
  const normalized = value.trim();
  return normalized !== '' && normalized.length <= INVOICE_NO_MAX && INVOICE_NO_RE.test(normalized);
};

/** 추적 링크 — 만들 수 없으면 null. 실시간 추적을 흉내 내지 않는다(템플릿 치환까지가 전부다) */
function trackingUrl(carrier: DemoCarrier, invoiceNo: string): string | null {
  const template = carrier.trackingUrlTemplate.trim();
  if (template === '' || !template.includes(INVOICE_TOKEN)) return null;
  if (!isValidInvoiceNo(invoiceNo)) return null;
  return template.replaceAll(INVOICE_TOKEN, encodeURIComponent(invoiceNo.trim()));
}

/** 배송 건이 실제로 창고를 떠났는가 — '배송대기' 는 송장만 붙은 상태라 아직 나간 것이 아니다 */
const hasLeft = (shipment: DemoShipment): boolean => shipment.status !== 'waiting';

/** 지금 발송처리할 수 있는 배송 건인가 — 일괄 처리 버튼의 건수가 이것을 센다 */
const canDispatch = (shipment: DemoShipment): boolean =>
  shipment.status === 'waiting' && isValidInvoiceNo(shipment.invoiceNo);

interface Coverage {
  readonly covered: number;
  readonly total: number;
  readonly complete: boolean;
  readonly partial: boolean;
}

/**
 * 송장이 덮은 정도 — **SKU 단위로 맞춰 본다**. 배송 건 개수로는 답할 수 없다(규칙 2).
 * 품목 수량을 넘겨 배정하지 않는다: 과다 입력이 다른 품목까지 '발송됨' 으로 만들면 창고에
 * 남아 있는 물건이 화면에서 사라진다.
 */
function coverageOf(row: DemoRow, shipments: readonly DemoShipment[]): Coverage {
  const pool = new Map<string, number>();
  for (const shipment of shipments) {
    for (const line of shipment.lines) {
      pool.set(line.sku, (pool.get(line.sku) ?? 0) + line.quantity);
    }
  }
  let covered = 0;
  for (const line of row.lines) {
    const available = pool.get(line.sku) ?? 0;
    const taken = Math.min(line.quantity, available);
    pool.set(line.sku, available - taken);
    covered += taken;
  }
  const total = row.lines.reduce((sum, line) => sum + line.quantity, 0);
  return {
    covered,
    total,
    complete: total > 0 && covered >= total,
    partial: covered > 0 && covered < total,
  };
}

/** 아직 송장이 붙지 않은 잔량 — 비어 있으면 이 주문에 붙일 송장이 없다 */
function remainingOf(row: DemoRow): readonly { readonly sku: string; readonly quantity: number }[] {
  const pool = new Map<string, number>();
  for (const shipment of row.shipments) {
    for (const line of shipment.lines) {
      pool.set(line.sku, (pool.get(line.sku) ?? 0) + line.quantity);
    }
  }
  return row.lines
    .map((line) => {
      const available = pool.get(line.sku) ?? 0;
      const taken = Math.min(line.quantity, available);
      pool.set(line.sku, available - taken);
      return { sku: line.sku, quantity: line.quantity - taken };
    })
    .filter((line) => line.quantity > 0);
}

/** 이 주문의 작업 상태 — **부분발송은 발송대기다**(운영자에게 남은 일이 있다) */
function workStatusOf(row: DemoRow): WorkStatus {
  if (!coverageOf(row, row.shipments).complete) return 'pending';
  if (row.shipments.every((shipment) => shipment.status === 'delivered')) return 'delivered';
  if (row.shipments.some((shipment) => hasLeft(shipment))) return 'shipping';
  return 'waiting';
}

/** 택배사 열 — 배송 건이 없으면 '—', 여럿이면 첫 이름에 건수를 붙인다 */
function carrierSummary(row: DemoRow): string {
  const [first] = row.shipments;
  if (first === undefined) return '—';
  const names = new Set(row.shipments.map((shipment) => shipment.carrierId));
  const label = carrierNameOf(first.carrierId);
  return names.size === 1 ? label : `${label} 외 ${fmt(names.size - 1)}곳`;
}

/** 부분발송 표기 — 실제로 나간 배송 건만으로 센다. 부분이 아니면 null */
function partialLabel(row: DemoRow): string | null {
  const { covered, total, partial } = coverageOf(
    row,
    row.shipments.filter((shipment) => hasLeft(shipment)),
  );
  if (!partial) return null;
  return `부분발송 ${fmt(covered)}/${fmt(total)}`;
}

function orderLinesSummary(row: DemoRow): string {
  const [first] = row.lines;
  if (first === undefined) return '품목 없음';
  const rest = row.lines.length - 1;
  return rest === 0 ? first.productName : `${first.productName} 외 ${fmt(rest)}건`;
}

/** 좌측 필터의 건수 배지 — **필터 이전** 전체 집합에서 센다(키를 다 적은 Record) */
const WORK_COUNTS: Readonly<Record<WorkFilter, number>> = (() => {
  const counts: Record<WorkFilter, number> = {
    [WORK_FILTER_ALL]: DEMO_ROWS.length,
    pending: 0,
    waiting: 0,
    shipping: 0,
    delivered: 0,
  };
  for (const row of DEMO_ROWS) counts[workStatusOf(row)] += 1;
  return counts;
})();

function filterRows(rows: readonly DemoRow[], filter: WorkFilter): readonly DemoRow[] {
  if (filter === WORK_FILTER_ALL) return rows;
  return rows.filter((row) => workStatusOf(row) === filter);
}

/**
 * 주문번호·수령인·송장번호 검색.
 *
 * 송장번호를 대상에 넣는 이유: 고객이 부르는 것은 주문번호지만 택배사가 부르는 것은 송장번호다 —
 * 배송 사고 문의는 대개 후자로 들어온다.
 */
function searchRows(rows: readonly DemoRow[], keyword: string): readonly DemoRow[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return rows;
  return rows.filter(
    (row) =>
      row.id.toLowerCase().includes(needle) ||
      row.receiverName.toLowerCase().includes(needle) ||
      row.shipments.some((shipment) => shipment.invoiceNo.toLowerCase().includes(needle)),
  );
}

/* ── 표 열 정의(데이터 열 7개 — 선택·순번은 leading 으로 별도) ───────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'no', header: '주문번호', nowrap: true },
  { id: 'orderedAt', header: '주문일', nowrap: true },
  { id: 'receiver', header: '수령인', nowrap: true },
  { id: 'lines', header: '품목' },
  { id: 'carrier', header: '택배사', nowrap: true },
  { id: 'invoice', header: '송장번호', nowrap: true },
  { id: 'work', header: '배송 상태', nowrap: true },
];

const SELECT_ALL_LABEL_ID = 'shipments-select-all';
const PAGE_SIZE = 8;

/** 지금 열려 있는 일괄 작업 — 셋은 서로를 밀어낸다(동시에 두 개가 열리지 않는다) */
type PendingAction = 'prepare' | 'invoice' | 'dispatch';

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
  marginBottom: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const railStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const railNoticeStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
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

const bulkActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** 주문번호·송장번호는 고객·택배사가 전화로 부르는 값이다 — 한 덩이로 읽히게 둔다 */
const numberStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const linesStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 송장이 여러 장이면 세로로 쌓는다 — 한 줄에 이어 붙이면 어느 번호가 어느 건인지 알 수 없다 */
const invoiceListStyle: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  alignItems: 'flex-start',
};

const badgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
  ...numberStyle,
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/* ── 송장 일괄 입력 다이얼로그 스타일 ────────────────────────────────────────────────────────── */

const dialogBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const entryListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const entryRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const entryHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const entryOrderNoStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  fontVariantNumeric: 'tabular-nums',
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

/** 택배사 : 송장번호 = 좁게 : 넓게. 송장번호가 잘리면 오입력을 눈으로 잡을 수 없다 */
const entryFieldRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
  gap: cssVar('space.2'),
  alignItems: 'center',
};

const controlStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

/* ── 좌측 필터 패널 조립(FilterPanel 미러) ───────────────────────────────────────────────────── */

function WorkFilterPanel({
  value,
  onChange,
  counts,
}: {
  readonly value: WorkFilter;
  readonly onChange: (next: WorkFilter) => void;
  readonly counts: Readonly<Record<string, number>> | null;
}) {
  return (
    <nav aria-label="배송 상태 필터">
      <p style={filterHeadingStyle}>배송 상태</p>
      <ul style={filterListStyle}>
        {WORK_FILTERS.map((option) => {
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

/* ── 송장 한 줄 — 추적 URL 을 만들 수 있으면 링크, 아니면 번호만 ────────────────────────────── */

function InvoiceCell({ shipment }: { readonly shipment: DemoShipment }) {
  const carrier = findCarrier(shipment.carrierId);
  const url = carrier === null ? null : trackingUrl(carrier, shipment.invoiceNo);

  if (url === null) return <span style={numberStyle}>{shipment.invoiceNo}</span>;

  return (
    <a
      href={url}
      target="_blank"
      // 새 창으로 여는 외부 링크 — opener 를 넘겨주지 않는다
      rel="noreferrer noopener"
      style={linkStyle}
      aria-label={`${shipment.invoiceNo} 배송 조회 (새 창)`}
    >
      {shipment.invoiceNo}
    </a>
  );
}

/* ── 송장 일괄 입력 다이얼로그(InvoiceBulkDialog 미러) ───────────────────────────────────────── */

interface InvoiceEntry {
  readonly orderId: string;
  readonly carrierId: string;
  readonly invoiceNo: string;
}

function InvoiceBulkDialog({
  rows,
  onClose,
}: {
  readonly rows: readonly DemoRow[];
  readonly onClose: () => void;
}) {
  const options = CARRIERS.filter((carrier) => carrier.active);
  /* 첫 선택값은 목록의 첫 줄이다. 비어 있으면 '' — 그 상태에서는 저장이 잠긴다.
     임의의 택배사를 골라 두면 운영자가 확인하지 않은 값으로 송장이 등록된다. */
  const initialCarrierId = options[0]?.id ?? '';

  const [entries, setEntries] = useState<readonly InvoiceEntry[]>(() =>
    rows.map((row) => ({ orderId: row.id, carrierId: initialCarrierId, invoiceNo: '' })),
  );
  /** 주문번호 → 사유. 제출을 눌렀을 때만 채워진다(치는 도중 붉게 물들이지 않는다) */
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});

  const patch = (orderId: string, next: Partial<InvoiceEntry>): void => {
    setEntries((current) =>
      current.map((entry) => (entry.orderId === orderId ? { ...entry, ...next } : entry)),
    );
  };

  /**
   * 전부 검증한다 — 한 줄이라도 틀리면 아무것도 저장하지 않는다. 절반만 들어가면 어느 주문에
   * 송장이 붙었는지 다시 세어 봐야 한다. 중복은 화면 안 다른 줄까지 본다(붙여넣기 실수가 거기서 난다).
   */
  const validate = (): Readonly<Record<string, string>> => {
    const found: Record<string, string> = {};
    const seen = new Map<string, string>();
    for (const entry of entries) {
      if (entry.carrierId === '') {
        found[entry.orderId] = '택배사를 선택하세요.';
        continue;
      }
      if (!isValidInvoiceNo(entry.invoiceNo)) {
        found[entry.orderId] =
          '송장번호는 숫자와 하이픈(-)만 입력할 수 있어요. 한글·공백이 섞이면 택배사 접수 파일이 깨져요.';
        continue;
      }
      const key = `${entry.carrierId}:${entry.invoiceNo.trim()}`;
      const clash = seen.get(key);
      if (clash !== undefined) {
        found[entry.orderId] = `이 다이얼로그의 ${clash} 줄과 송장번호가 같아요.`;
        continue;
      }
      seen.set(key, entry.orderId);
    }
    return found;
  };

  return (
    <Modal
      title="송장 일괄 입력"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            닫기
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={options.length === 0}
            onClick={() => {
              const found = validate();
              setErrors(found);
              if (Object.keys(found).length === 0) onClose();
            }}
          >
            {`${fmt(rows.length)}건 등록`}
          </Button>
        </>
      }
    >
      <div style={dialogBodyStyle}>
        <p style={hintStyle}>
          택배사는 배송 설정에 등록된 목록에서만 고를 수 있어요. 송장을 등록하면 배송대기가 되고,
          발송처리해야 배송중이 돼요.
        </p>
        <ul style={entryListStyle}>
          {rows.map((row) => {
            const entry = entries.find((candidate) => candidate.orderId === row.id);
            const remaining = remainingOf(row);
            const remainingCount = remaining.reduce((sum, line) => sum + line.quantity, 0);
            const error = errors[row.id];
            return (
              <li key={row.id} style={entryRowStyle}>
                <div style={entryHeadStyle}>
                  <span style={entryOrderNoStyle}>{row.id}</span>
                  <span
                    style={hintStyle}
                  >{`${row.receiverName} · 잔량 ${fmt(remainingCount)}개`}</span>
                </div>
                <div style={entryFieldRowStyle}>
                  <SelectField
                    value={entry?.carrierId ?? ''}
                    aria-label={`${row.id} 택배사`}
                    onChange={(event) => patch(row.id, { carrierId: event.target.value })}
                  >
                    {options.length === 0 ? (
                      <option value="">등록된 택배사가 없어요</option>
                    ) : (
                      options.map((carrier) => (
                        <option key={carrier.id} value={carrier.id}>
                          {carrier.name}
                        </option>
                      ))
                    )}
                  </SelectField>
                  <input
                    type="text"
                    inputMode="numeric"
                    style={controlStyle}
                    value={entry?.invoiceNo ?? ''}
                    maxLength={INVOICE_NO_MAX}
                    placeholder="예: 4415-2280-0091"
                    aria-label={`${row.id} 송장번호`}
                    onChange={(event) => patch(row.id, { invoiceNo: event.target.value })}
                  />
                </div>
                {error !== undefined && <Alert tone="danger">{error}</Alert>}
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ShipmentListScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialSelectedIds?: readonly string[];
  /** 처음부터 열려 있는 일괄 작업 — 다이얼로그 스토리가 쓴다 */
  readonly initialAction?: PendingAction | null;
}

function ShipmentListScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
  initialAction = null,
}: ShipmentListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [work, setWork] = useState<WorkFilter>(WORK_FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [pending, setPending] = useState<PendingAction | null>(initialAction);

  const visible = useMemo(() => searchRows(filterRows(DEMO_ROWS, work), keyword), [work, keyword]);

  const selection = tableSelectionState(visible, selectedIds);
  const selectedRows = visible.filter((row) => selectedIds.has(row.id));
  const selectedCount = selectedRows.length;

  /* 세 버튼 모두 **처리 가능한 건수**를 미리 세어 글자에 싣는다 — 판정은 전부 순수 함수다.
     배송준비중은 입금전 주문에만 걸리는데 그런 주문은 이 목록에 오지 않으므로 늘 0 이다. */
  const prepareTargets: readonly DemoRow[] = [];
  const invoiceTargets = selectedRows.filter((row) => remainingOf(row).length > 0);
  const dispatchTargets = selectedRows.filter((row) => row.shipments.some(canDispatch));

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
      for (const row of visible) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((row, index) => {
    const work_ = workStatusOf(row);
    const partial = partialLabel(row);
    return {
      id: row.id,
      selected: selectedIds.has(row.id),
      onActivate: () => {
        /* 실화면: 행 클릭 → 주문 상세(/orders/:id). 배송 건 상세는 없다 —
           배송에 관해 알아야 할 것은 이 표의 한 줄에 다 있다. */
      },
      leading: [
        <RowSelectCell
          key="select"
          id={row.id}
          label={`${row.id} 배송 건 선택`}
          checked={selectedIds.has(row.id)}
          onToggle={(checked) => toggleOne(row.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        <span key="no" style={numberStyle}>
          {row.id}
        </span>,
        <span key="orderedAt" style={numberStyle}>
          {formatDateTime(row.orderedAt)}
        </span>,
        <span key="receiver">{row.receiverName}</span>,
        <span key="lines" style={linesStyle}>
          {orderLinesSummary(row)}
        </span>,
        <span key="carrier">{carrierSummary(row)}</span>,
        row.shipments.length === 0 ? (
          <span key="invoice">—</span>
        ) : (
          <span key="invoice" style={invoiceListStyle}>
            {row.shipments.map((shipment) => (
              <InvoiceCell key={shipment.id} shipment={shipment} />
            ))}
          </span>
        ),
        <span key="work" style={badgeRowStyle}>
          <StatusBadge tone={WORK_TONE[work_]} label={WORK_LABEL[work_]} />
          {/* 색만으로 말하지 않는다 — 얼마나 나갔는지는 글자로 함께 선다 */}
          {partial !== null && <StatusBadge tone="warning" label={partial} />}
        </span>,
      ],
    };
  });

  const bulkButtons: readonly {
    readonly action: PendingAction;
    readonly label: string;
    readonly count: number;
  }[] = [
    { action: 'prepare', label: '배송준비중 처리', count: prepareTargets.length },
    { action: 'invoice', label: '송장 입력', count: invoiceTargets.length },
    { action: 'dispatch', label: '발송처리', count: dispatchTargets.length },
  ];

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>배송 처리</h1>

      <div style={layoutStyle}>
        <aside style={railStyle}>
          <p style={railNoticeStyle}>
            송장을 등록하면 배송대기, 발송처리하면 배송중이 돼요. 일부만 나간 주문은 남은 품목
            기준으로 발송대기에 남아요.
          </p>
          <p style={railNoticeStyle}>택배사는 배송 설정에 등록된 목록에서만 고를 수 있어요.</p>
          <WorkFilterPanel value={work} onChange={setWork} counts={loading ? null : WORK_COUNTS} />
        </aside>

        <div style={columnStyle}>
          <div style={toolbarStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                value={keyword}
                onChange={setKeyword}
                label="주문번호·수령인·송장번호 검색"
                placeholder="주문번호 · 수령인 · 송장번호 검색"
              />
            </span>
          </div>

          <p style={summaryStyle}>
            {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
            {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
          </p>

          <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
            <span style={bulkActionsStyle}>
              {bulkButtons.map((button) => (
                <Button
                  key={button.action}
                  variant="secondary"
                  // 처리 가능한 건이 하나도 없으면 누를 수 없다 — 눌러 놓고 전부 거절당하지 않는다
                  disabled={button.count === 0}
                  onClick={() => setPending(button.action)}
                >
                  {`${button.label} (${fmt(button.count)})`}
                </Button>
              ))}
            </span>
          </SelectionBar>

          <div style={tableScrollStyle}>
            <Table
              caption="배송 처리 목록 — 행을 누르면 주문 상세로 이동해요. 체크박스로 여러 건을 골라 송장을 등록하고 발송처리할 수 있어요."
              columns={COLUMNS}
              rows={rows}
              leadingHead={[
                <SelectAllHeaderCell
                  key="select-all"
                  label="이 페이지의 배송 건 전체 선택"
                  labelId={SELECT_ALL_LABEL_ID}
                  selection={selection}
                  onToggleAll={toggleAll}
                />,
                <SeqHeaderCell key="seq" />,
              ]}
              loading={loading}
              skeletonRows={PAGE_SIZE}
              empty={
                <EmptyState
                  label="배송 건"
                  createVerb="접수"
                  hasQuery={keyword.trim() !== ''}
                  hasActiveFilters={work !== WORK_FILTER_ALL}
                  onClearSearch={() => setKeyword('')}
                  onResetFilters={() => setWork(WORK_FILTER_ALL)}
                />
              }
            />
          </div>
        </div>
      </div>

      {pending === 'prepare' && (
        <ConfirmDialog
          intent="update"
          title="배송준비중 일괄 처리"
          message={`선택한 ${fmt(selectedCount)}건 중 ${fmt(prepareTargets.length)}건만 배송준비중으로 진행해요. 나머지는 이미 지난 단계이거나 입금이 확인되지 않은 주문이에요.`}
          confirmLabel={`${fmt(prepareTargets.length)}건 처리`}
          onConfirm={() => setPending(null)}
          onCancel={() => setPending(null)}
        />
      )}

      {pending === 'invoice' && (
        <InvoiceBulkDialog rows={invoiceTargets} onClose={() => setPending(null)} />
      )}

      {pending === 'dispatch' && (
        <ConfirmDialog
          intent="update"
          title="발송처리"
          message={`선택한 ${fmt(dispatchTargets.length)}건을 발송처리해요. 전 품목이 나간 주문만 배송중이 되고, 일부만 나간 주문은 발송대기에 남아요. 되돌릴 수 없어요.`}
          confirmLabel={`${fmt(dispatchTargets.length)}건 발송처리`}
          onConfirm={() => {
            setPending(null);
            setSelectedIds(new Set());
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

/**
 * 정상: 네 갈래가 모두 있는 목록 — 송장이 없는 발송대기 2건, 송장만 붙은 배송대기 1건,
 * 부분발송 1건('부분발송 1/3'), 배송완료 4건.
 */
export const Default: Story = {
  render: () => <ShipmentListScreen />,
};

/** 최초 로드: 표 스켈레톤 + 좌측 건수 '—'(0 과 '모름' 은 다르다 · STATE-01) */
export const Loading: Story = {
  render: () => <ShipmentListScreen loading />,
};

/**
 * 선택됨: 세 건 선택 → 일괄 버튼이 각자 처리 가능한 건수를 글자에 싣는다.
 * '배송준비중 처리 (0)' 은 비활성 — 입금전 주문은 이 목록에 오지 않기 때문이다.
 */
export const Selection: Story = {
  render: () => (
    <ShipmentListScreen
      initialSelectedIds={['ORD-20260720-0002', 'ORD-20260716-0005', 'ORD-20260712-0031']}
    />
  ),
};

/** 송장 일괄 입력: 잔량이 남은 주문마다 택배사 select + 송장번호 한 줄. 한 줄이라도 틀리면 저장하지 않는다 */
export const InvoiceDialog: Story = {
  render: () => (
    <ShipmentListScreen
      initialSelectedIds={['ORD-20260720-0002', 'ORD-20260712-0031']}
      initialAction="invoice"
    />
  ),
};

/** 빈 결과: 검색이 맞지 않음 — Table empty 슬롯에 Empty(검색 지우기 · 필터 초기화) */
export const Empty: Story = {
  render: () => <ShipmentListScreen initialKeyword="9999-9999-9999" />,
};
