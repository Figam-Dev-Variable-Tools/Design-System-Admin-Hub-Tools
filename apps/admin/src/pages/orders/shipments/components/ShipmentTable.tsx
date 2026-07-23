// 배송 처리 목록 표
//
// [왜 CrudListShell / CrudReadListShell 이 아닌가] 주문 목록(OrderTable)과 같은 이유다 — 읽기 전용
// 껍데기에는 체크박스가 없고, 쓰기 껍데기의 체크박스는 **일괄 삭제**에 묶여 있다. 이 화면의 선택은
// 삭제가 아니라 '골라서 내보낸다' 이고, 배송 건은 지우지 않는다. 그래서 프리미티브(RowSelectCell·
// SeqCell·DS Table)는 그대로 쓰되 껍데기는 이 화면이 조립한다.
//
// [행 클릭은 주문 상세로 간다] 이 화면에는 '배송 건 상세' 가 없다 — 배송에 관해 알아야 할 것은
// 이 표의 한 줄에 다 있고(택배사·송장·상태), 그 이상은 주문의 맥락이다. 없는 화면을 만들지 않는다.
//
// [추적은 링크까지만] 송장번호 옆의 링크는 택배사 사이트를 새 창으로 연다. 여기서 배송 진행률을
// 그리지 않는다 — 백엔드가 없으므로 그것은 지어낸 값이 된다(도메인 규칙 5).
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cssVar, Table } from '@tds/ui';

import { DetailCellLink } from '../../../../shared/crud';
import { formatDateTime } from '../../../../shared/format';
import {
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  tableSelectionState,
} from '../../../../shared/ui';
import { findCarrier, trackingUrl } from '../../../../shared/domain/shipment';
import type { Shipment } from '../../../../shared/domain/shipment';
import { orderLinesSummary } from '../../types';
import { carrierSummary, partialLabel, shipmentWorkLabel, shipmentWorkTone } from '../types';
import type { ShipmentRow } from '../types';

const COLUMNS = [
  { id: 'no', header: '주문번호', nowrap: true },
  { id: 'orderedAt', header: '주문일', nowrap: true },
  { id: 'receiver', header: '수령인', nowrap: true },
  { id: 'lines', header: '품목' },
  { id: 'carrier', header: '택배사', nowrap: true },
  { id: 'invoice', header: '송장번호', nowrap: true },
  { id: 'work', header: '배송 상태', nowrap: true },
] as const;

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

/** 송장 한 줄 — 추적 URL 을 만들 수 있으면 링크, 아니면 번호만 */
function InvoiceCell({ shipment }: { readonly shipment: Shipment }) {
  const carrier = findCarrier(shipment.carrierId);
  const url = carrier === null ? null : trackingUrl(carrier, shipment.invoiceNo);

  if (url === null) {
    return <span style={numberStyle}>{shipment.invoiceNo}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      // 새 창으로 여는 외부 링크 — opener 를 넘겨주지 않는다
      rel="noreferrer noopener"
      className="tds-ui-link tds-ui-focusable"
      style={numberStyle}
      aria-label={`${shipment.invoiceNo} 배송 조회 (새 창)`}
    >
      {shipment.invoiceNo}
    </a>
  );
}

interface ShipmentTableProps {
  readonly rows: readonly ShipmentRow[];
  /** **최초 로드만** — 재조회 중에는 false 여야 이전 행이 유지된다 (STATE-01) */
  readonly loading: boolean;
  readonly orderPathOf: (row: ShipmentRow) => string;
  /** 선택(체크박스)을 그리는가 — 배송을 처리할 수 있는 역할에게만 (EXC-03) */
  readonly selectable: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  readonly selectAllLabelId: string;
  /** 빈 상태 — '왜 비었는가' 의 판단은 화면이 한다(STATE-05) */
  readonly empty: ReactNode;
}

export function ShipmentTable({
  rows,
  loading,
  orderPathOf,
  selectable,
  selectedIds,
  onToggleOne,
  onToggleAll,
  selectAllLabelId,
  empty,
}: ShipmentTableProps) {
  const navigate = useNavigate();
  const selection = tableSelectionState(rows, selectedIds);

  const leadingHead = [
    ...(selectable
      ? [
          <SelectAllHeaderCell
            key="select"
            label="이 페이지의 배송 건 전체 선택"
            labelId={selectAllLabelId}
            selection={selection}
            onToggleAll={onToggleAll}
          />,
        ]
      : []),
    <SeqHeaderCell key="seq" />,
  ];

  const tableRows = rows.map((row, index) => {
    const orderPath = orderPathOf(row);
    const partial = partialLabel(row);

    return {
      id: row.id,
      cells: [
        <DetailCellLink key="no" to={orderPath} ariaLabel={`${row.id} 주문 상세`}>
          <span style={numberStyle}>{row.id}</span>
        </DetailCellLink>,
        formatDateTime(row.order.orderedAt),
        row.order.receiver.name,
        <span key="lines" style={linesStyle}>
          {orderLinesSummary(row.order)}
        </span>,
        carrierSummary(row),
        row.shipments.length === 0 ? (
          '—'
        ) : (
          <span key="invoice" style={invoiceListStyle}>
            {row.shipments.map((shipment) => (
              <InvoiceCell key={shipment.id} shipment={shipment} />
            ))}
          </span>
        ),
        <span key="work" style={badgeRowStyle}>
          <StatusBadge tone={shipmentWorkTone(row.work)} label={shipmentWorkLabel(row.work)} />
          {/* 색만으로 말하지 않는다 — 얼마나 나갔는지는 글자로 함께 선다 */}
          {partial !== null && <StatusBadge tone="warning" label={partial} />}
        </span>,
      ],
      leading: [
        ...(selectable
          ? [
              <RowSelectCell
                key="select"
                id={row.id}
                label={`${row.id} 배송 건 선택`}
                checked={selectedIds.has(row.id)}
                onToggle={(checked) => {
                  onToggleOne(row.id, checked);
                }}
              />,
            ]
          : []),
        <SeqCell key="seq" seq={index + 1} />,
      ],
      onActivate: () => {
        navigate(orderPath);
      },
      // 선택 열이 없는 표에는 selected 를 주지 않는다 — 없는 선택 조작을 있다고 낭독하게 된다
      ...(selectable && { selected: selectedIds.has(row.id) }),
    };
  });

  return (
    <Table
      caption={
        selectable
          ? '배송 처리 목록 — 행을 누르면 주문 상세로 이동해요. 체크박스로 여러 건을 골라 송장을 등록하고 발송처리할 수 있어요.'
          : '배송 처리 목록 — 행을 누르면 주문 상세로 이동해요. 배송을 처리할 권한이 없어 조회만 가능해요.'
      }
      columns={COLUMNS}
      rows={tableRows}
      leadingHead={leadingHead}
      loading={loading}
      empty={empty}
    />
  );
}
