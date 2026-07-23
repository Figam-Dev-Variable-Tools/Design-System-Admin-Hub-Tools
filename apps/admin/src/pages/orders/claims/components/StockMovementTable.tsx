// 재고 이동 이력 표 (클레임 상세 1곳 전용)
//
// 완료 처리로 확정된 이동만 들어온다(계획이 아니라 사실). 감사 성격이라 편집 수단이 없다.
// 취소 클레임에는 이 표가 늘 비어 있다 — 취소의 재고 복원은 주문이 한다(../types 의 movesStock).
import type { CSSProperties } from 'react';

import { formatDateTime, formatNumber } from '../../../../shared/format';
import {
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import type { StockMovement } from '../types';
import { cssVar } from '@tds/ui';

const emptyStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const skuCellStyle: CSSProperties = {
  ...tdStyle,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const qtyCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

interface StockMovementTableProps {
  readonly movements: readonly StockMovement[];
  /** 이동이 없을 때 그 이유 — 유형마다 다르다(취소는 애초에 움직일 재고가 없다) */
  readonly emptyHint: string;
}

export function StockMovementTable({ movements, emptyHint }: StockMovementTableProps) {
  if (movements.length === 0) {
    return <p style={emptyStyle}>{emptyHint}</p>;
  }

  return (
    <table style={tableStyle}>
      <caption style={visuallyHiddenStyle}>
        이 클레임으로 확정된 재고 이동 이력 — 입고는 회수분, 출고는 교환 재발송분이에요.
      </caption>
      <thead>
        <tr>
          <th scope="col" style={thStyle}>
            구분
          </th>
          <th scope="col" style={thStyle}>
            옵션
          </th>
          <th scope="col" style={thStyle}>
            SKU
          </th>
          <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
            수량
          </th>
          <th scope="col" style={thStyle}>
            반영 시각
          </th>
        </tr>
      </thead>
      <tbody>
        {movements.map((movement) => (
          <tr key={movement.id}>
            <td style={tdStyle}>
              {movement.direction === 'in' ? (
                <StatusBadge tone="success" label="입고" />
              ) : (
                <StatusBadge tone="warning" label="출고" />
              )}
            </td>
            <td style={tdStyle}>{movement.optionLabel}</td>
            <td style={skuCellStyle}>{movement.sku}</td>
            <td style={qtyCellStyle}>
              {`${movement.direction === 'in' ? '+' : '−'}${formatNumber(movement.quantity)}개`}
            </td>
            <td style={skuCellStyle}>{formatDateTime(movement.at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
