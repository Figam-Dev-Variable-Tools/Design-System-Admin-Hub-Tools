// 주문 목록 표
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 CrudListShell / CrudReadListShell 이 아니라 DS Table 을 직접 쓰나]
// 두 껍데기는 이 화면의 모양을 표현하지 못한다.
//   · CrudReadListShell — 선택 체크박스가 **어떤 역할에게도** 없다. 그런데 이 화면의 핵심 동작이
//     '여러 건을 골라 한 번에 배송준비중으로 옮기는 것' 이다(카페24 운영의 절반이 이 조작이다).
//   · CrudListShell — 선택은 있지만 그 선택을 소비하는 것이 **일괄 삭제 하나뿐**이고, 체크박스가
//     `canRemove` 에 묶여 있다. 주문은 지우지 않는다(거래 기록이다). 삭제 권한으로 게이팅된
//     체크박스와 빨간 '선택 N건 삭제' 버튼을 주문 목록에 세우는 것은 없는 동작을 있다고 말하는 것이다.
// 그래서 **같은 프리미티브(RowSelectCell·SeqCell·DS Table)를 쓰되 껍데기는 이 화면이 조립한다** —
// 로그인 이력(LoginHistoryTable)이 같은 이유로 이미 그렇게 서 있다. 손으로 <table> 을 그리는 것이
// 아니라, 골격은 여전히 DS Table 의 것이다.
//
// [선택은 canUpdate 에 묶인다 — canRemove 가 아니다] 이 화면에서 선택이 하는 일은 **상태 전이**,
// 곧 수정이다. 수정 권한이 없는 역할에게 체크박스를 남기면 아무것도 일어나지 않는 UI 를 고르게 된다.
//
// [취소 행] 색만으로 말하지 않는다 — tone='danger' 는 보강일 뿐이고, 상태 칸에 '취소' 배지가
// 함께 선다. 취소는 상태가 아니므로(도메인 머리말) 상태 배지를 지우지 않고 옆에 세운다.
// ─────────────────────────────────────────────────────────────────────────────
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cssVar, Table } from '@tds/ui';

import { DetailCellLink } from '../../../shared/crud';
import { formatDateTime, formatNumber } from '../../../shared/format';
import {
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  tableSelectionState,
} from '../../../shared/ui';
import { PAYMENT_METHOD_LABEL } from '../../../shared/commerce/payment-settings';
import { orderStatusLabel } from '../../../shared/domain/order';
import type { Order } from '../../../shared/domain/order';
import {
  isCanceled,
  orderLinesSummary,
  orderStatusTone,
  orderTotal,
  partialShipmentLabel,
} from '../types';

const COLUMNS = [
  { id: 'no', header: '주문번호', nowrap: true },
  { id: 'orderedAt', header: '주문일시', nowrap: true },
  { id: 'customer', header: '주문자', nowrap: true },
  { id: 'lines', header: '상품' },
  { id: 'method', header: '결제수단', nowrap: true },
  { id: 'total', header: '결제금액', align: 'end' as const, nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
] as const;

/** 주문번호는 고객이 전화로 부르는 값이다 — 줄바꿈 없이 한 덩이로 읽힌다 */
const orderNoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/** 상품 요약 — 열이 길어져 금액·상태를 밀어내지 않게 한 줄로 자른다 */
const linesStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 상태 칸 — 배지 두 개(상태 + 취소·부분배송)가 나란히 선다 */
const badgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

interface OrderTableProps {
  readonly orders: readonly Order[];
  /** **최초 로드만** — 재조회 중에는 false 여야 이전 행이 유지된다 (STATE-01) */
  readonly loading: boolean;
  readonly detailPathOf: (order: Order) => string;
  /** 선택(체크박스)을 그리는가 — 상태를 바꿀 수 있는 역할에게만 (EXC-03) */
  readonly selectable: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  readonly selectAllLabelId: string;
  /** 빈 상태 — '왜 비었는가' 의 판단은 화면이 한다(STATE-05) */
  readonly empty: ReactNode;
}

export function OrderTable({
  orders,
  loading,
  detailPathOf,
  selectable,
  selectedIds,
  onToggleOne,
  onToggleAll,
  selectAllLabelId,
  empty,
}: OrderTableProps) {
  /* 이동은 라우터를 아는 이 파일이 푼다 — 행 클릭은 마우스 보조 수단이고, 키보드 사용자는
     주문번호 링크(DetailCellLink)로 상세에 닿는다. DS Table 의 가드가 <a> 내부 클릭을
     행 활성화에서 제외하므로 둘은 충돌하지 않는다. */
  const navigate = useNavigate();
  const selection = tableSelectionState(orders, selectedIds);

  const leadingHead = [
    ...(selectable
      ? [
          <SelectAllHeaderCell
            key="select"
            label="이 페이지의 주문 전체 선택"
            labelId={selectAllLabelId}
            selection={selection}
            onToggleAll={onToggleAll}
          />,
        ]
      : []),
    <SeqHeaderCell key="seq" />,
  ];

  const rows = orders.map((order, index) => {
    const canceled = isCanceled(order);
    const partial = partialShipmentLabel(order);
    const detailPath = detailPathOf(order);

    return {
      id: order.id,
      cells: [
        <DetailCellLink key="no" to={detailPath} ariaLabel={`${order.id} 주문 상세`}>
          <span style={orderNoStyle}>{order.id}</span>
        </DetailCellLink>,
        formatDateTime(order.orderedAt),
        order.customer.name,
        <span key="lines" style={linesStyle}>
          {orderLinesSummary(order)}
        </span>,
        PAYMENT_METHOD_LABEL[order.payment.method],
        `${formatNumber(orderTotal(order))}원`,
        <span key="status" style={badgeRowStyle}>
          <StatusBadge
            tone={orderStatusTone(order.status)}
            label={orderStatusLabel(order.status)}
          />
          {canceled && <StatusBadge tone="danger" label="취소" />}
          {!canceled && partial !== null && <StatusBadge tone="warning" label={partial} />}
        </span>,
      ],
      leading: [
        ...(selectable
          ? [
              <RowSelectCell
                key="select"
                id={order.id}
                label={`${order.id} 주문 선택`}
                checked={selectedIds.has(order.id)}
                onToggle={(checked) => {
                  onToggleOne(order.id, checked);
                }}
              />,
            ]
          : []),
        // 순번은 화면상 위치다 — 정렬해도 위에서부터 1,2,3 이다
        <SeqCell key="seq" seq={index + 1} />,
      ],
      onActivate: () => {
        navigate(detailPath);
      },
      // 취소 행은 위험 색조 — 뜻은 상태 칸의 '취소' 배지가 전한다(색만으로 말하지 않는다)
      ...(canceled && { tone: 'danger' as const }),
      // 선택 열이 없는 표에는 selected 를 주지 않는다 — 없는 선택 조작을 있다고 낭독하게 된다
      ...(selectable && { selected: selectedIds.has(order.id) }),
    };
  });

  return (
    <Table
      caption={
        selectable
          ? '주문 목록 — 행을 누르면 주문 상세로 이동합니다. 체크박스로 여러 건을 골라 상태를 한 번에 처리할 수 있습니다.'
          : '주문 목록 — 행을 누르면 주문 상세로 이동합니다. 상태를 바꿀 권한이 없어 조회만 가능합니다.'
      }
      columns={COLUMNS}
      rows={rows}
      leadingHead={leadingHead}
      loading={loading}
      empty={empty}
    />
  );
}
