// 견적 라인아이템 편집 표
//
// 품목·규격·수량·단가를 인라인 편집하면 공급가액이 자동 계산되고, 하단에 공급가액/세액/합계를 합산한다.
// 견적 폼 1곳만 쓰므로 페이지 전용이다(소비자 1개). 계산 규칙(computeTotals·lineSupply)의 정본은 ../types.
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../../shared/format';
import {
  Button,
  controlStyle,
  errorTextStyle,
  fieldLabelStyle,
  hintStyle,
  Icon,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../../../shared/ui';
import {
  computeTotals,
  lineSupply,
  QUOTE_ITEM_NAME_MAX,
  QUOTE_MAX_ITEMS,
  taxModeLabel,
} from '../types';
import type { QuoteLineItem, QuoteTaxMode } from '../types';
import { cssVar } from '@tds/ui';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const tableWrapStyle: CSSProperties = { width: '100%', overflowX: 'auto' };

const textInputStyle: CSSProperties = {
  ...controlStyle(false),
  minWidth: `calc(${cssVar('space.6')} * 4)`,
};

const numberInputStyle: CSSProperties = {
  ...controlStyle(false),
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const amountCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const totalsRowStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const totalsLabelStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  color: cssVar('color.text.muted'),
};

const iconButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.feedback.danger.text'),
  cursor: 'pointer',
};

const toDigits = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

const newLine = (): QuoteLineItem => ({
  id: `li-new-${String(Date.now())}-${String(Math.round(Math.random() * 1000))}`,
  name: '',
  spec: '',
  quantity: 1,
  unitPrice: 0,
});

interface QuoteLineItemsTableProps {
  readonly items: readonly QuoteLineItem[];
  readonly taxMode: QuoteTaxMode;
  readonly disabled: boolean;
  readonly onChange: (next: readonly QuoteLineItem[]) => void;
  readonly error?: string | undefined;
}

export function QuoteLineItemsTable({
  items,
  taxMode,
  disabled,
  onChange,
  error,
}: QuoteLineItemsTableProps) {
  const totals = computeTotals(items, taxMode);

  const patch = (id: string, part: Partial<QuoteLineItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...part } : item)));
  };
  const remove = (id: string) => onChange(items.filter((item) => item.id !== id));
  const add = () => {
    if (items.length >= QUOTE_MAX_ITEMS) return;
    onChange([...items, newLine()]);
  };

  return (
    <div style={sectionStyle}>
      <span style={fieldLabelStyle}>품목 *</span>
      <p style={hintStyle}>
        품목을 추가하면 공급가액(수량 × 단가)이 자동 계산되고, 하단에 {taxModeLabel(taxMode)} 기준
        합계가 나와요. (최대 {QUOTE_MAX_ITEMS}개)
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th scope="col" style={thStyle}>
                품목명
              </th>
              <th scope="col" style={thStyle}>
                규격
              </th>
              <th scope="col" style={thStyle}>
                수량
              </th>
              <th scope="col" style={thStyle}>
                단가(원)
              </th>
              <th scope="col" style={thStyle}>
                공급가액(원)
              </th>
              <th scope="col" style={thStyle}>
                <span
                  style={{
                    ...fieldLabelStyle,
                    fontSize: cssVar('typography.label.sm.font-size'),
                  }}
                >
                  삭제
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ ...tdStyle, textAlign: 'center', color: cssVar('color.text.muted') }}
                >
                  품목을 추가하세요.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      className="tds-ui-input tds-ui-focusable"
                      style={textInputStyle}
                      value={item.name}
                      maxLength={QUOTE_ITEM_NAME_MAX}
                      placeholder="예: ERP 라이선스"
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 품목명`}
                      onChange={(event) => patch(item.id, { name: event.target.value })}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      className="tds-ui-input tds-ui-focusable"
                      style={textInputStyle}
                      value={item.spec}
                      placeholder="예: 100석"
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 규격`}
                      onChange={(event) => patch(item.id, { spec: event.target.value })}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="tds-ui-input tds-ui-focusable"
                      style={numberInputStyle}
                      value={String(item.quantity)}
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 수량`}
                      onChange={(event) =>
                        patch(item.id, { quantity: toDigits(event.target.value) })
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="tds-ui-input tds-ui-focusable"
                      style={numberInputStyle}
                      value={String(item.unitPrice)}
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 단가`}
                      onChange={(event) =>
                        patch(item.id, { unitPrice: toDigits(event.target.value) })
                      }
                    />
                  </td>
                  <td style={amountCellStyle}>{formatNumber(lineSupply(item))}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      type="button"
                      className="tds-ui-focusable"
                      style={iconButtonStyle}
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 삭제`}
                      onClick={() => remove(item.id)}
                    >
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={totalsLabelStyle}>
                공급가액 합계
              </td>
              <td style={totalsRowStyle}>{formatNumber(totals.supply)}</td>
              <td style={tdStyle} aria-hidden="true" />
            </tr>
            <tr>
              <td colSpan={4} style={totalsLabelStyle}>
                부가세({taxModeLabel(taxMode)})
              </td>
              <td style={totalsRowStyle}>{formatNumber(totals.vat)}</td>
              <td style={tdStyle} aria-hidden="true" />
            </tr>
            <tr>
              <td colSpan={4} style={totalsLabelStyle}>
                합계금액
              </td>
              <td style={totalsRowStyle}>{formatNumber(totals.total)}</td>
              <td style={tdStyle} aria-hidden="true" />
            </tr>
          </tfoot>
        </table>
      </div>

      {items.length < QUOTE_MAX_ITEMS && (
        <span>
          <Button variant="secondary" size="md" disabled={disabled} onClick={add}>
            <Icon name="plus-circle" />
            품목 추가
          </Button>
        </span>
      )}

      {error !== undefined && error !== '' && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}
