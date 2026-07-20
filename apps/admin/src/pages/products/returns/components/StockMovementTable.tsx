// 재고 이동 이력 표 (교환/반품 상세 1곳 전용)
//
// 완료 처리로 확정된 이동만 들어온다(계획이 아니라 사실). 감사 성격이라 편집 수단이 없다.
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
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
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
}

export function StockMovementTable({ movements }: StockMovementTableProps) {
  if (movements.length === 0) {
    return <p style={emptyStyle}>아직 반영된 재고 이동이 없습니다. 완료 처리 시 기록됩니다.</p>;
  }

  return (
    <table style={tableStyle}>
      <caption style={visuallyHiddenStyle}>
        이 요청으로 확정된 재고 이동 이력 — 입고는 회수분, 출고는 교환 재발송분입니다.
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
