// 교환 옵션(SKU) 선택 + 재고 이동 미리보기 (교환/반품 상세 1곳 전용)
//
// 옵션 매트릭스의 정본은 상품(../../_shared/store)이다 — 여기서 조합을 다시 만들지 않고 상품이 이미
// 펼쳐 둔 variants 를 그대로 선택지로 쓴다. 재고가 수량보다 적은 조합은 고를 수 없게 막고(유효성),
// 고르면 완료 시 어떤 재고가 어떻게 움직이는지 먼저 보여 준다(되돌릴 수 없는 작업이라 예고한다).
//
// 선택 값은 옵션 조합이 아니라 **variant.id** 다 — 단일 SKU 상품의 빈 조합('')이 '미선택'과 부딪히지
// 않게 하려는 것이다.
import type { CSSProperties } from 'react';

import { errorIdOf, FormField, hintStyle, SelectField, StatusBadge } from '../../../../shared/ui';
import { formatNumber } from '../../../../shared/format';
import type { ProductVariant } from '../../_shared/store';
import { findVariant, optionLabel } from '../types';

/** '미선택' 센티넬 — variant.id 는 절대 빈 문자열이 아니라 충돌하지 않는다 */
const OPTION_NONE = '';

const previewStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-sm)',
  background: 'var(--tds-color-surface-raised)',
};

const moveRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const deltaStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

interface ExchangeOptionFieldProps {
  readonly variants: readonly ProductVariant[];
  /** 주문된(회수될) 옵션 조합 */
  readonly originValues: readonly string[];
  readonly value: readonly string[];
  readonly quantity: number;
  readonly disabled: boolean;
  readonly error: string | undefined;
  readonly onChange: (next: readonly string[]) => void;
}

export function ExchangeOptionField({
  variants,
  originValues,
  value,
  quantity,
  disabled,
  error,
  onChange,
}: ExchangeOptionFieldProps) {
  const selected = value.length === 0 ? undefined : findVariant(variants, value);
  const origin = findVariant(variants, originValues);
  const invalid = error !== undefined;
  // 같은 옵션으로의 교환은 입고·출고가 서로 상쇄한다 — 재고 변화를 두 줄로 보여 주면 거짓말이 된다.
  const sameOption = selected !== undefined && origin !== undefined && selected.id === origin.id;

  return (
    <>
      <FormField
        htmlFor="return-exchange-option"
        label="교환할 옵션"
        required
        error={error}
        hint="재고가 남은 옵션만 선택할 수 있습니다. 완료 처리 시 이 옵션으로 재발송됩니다."
      >
        <SelectField
          id="return-exchange-option"
          value={selected?.id ?? OPTION_NONE}
          disabled={disabled}
          isInvalid={invalid}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorIdOf('return-exchange-option') : undefined}
          onChange={(event) => {
            const next = variants.find((variant) => variant.id === event.target.value);
            onChange(next === undefined ? [] : next.optionValues);
          }}
        >
          <option value={OPTION_NONE}>옵션을 선택하세요</option>
          {variants.map((variant) => {
            const short = quantity > variant.stock;
            return (
              <option key={variant.id} value={variant.id} disabled={short}>
                {`${optionLabel(variant.optionValues)} — 재고 ${formatNumber(variant.stock)}개${short ? ' (재고 부족)' : ''}`}
              </option>
            );
          })}
        </SelectField>
      </FormField>

      {selected !== undefined && (
        <div style={previewStyle} aria-live="polite">
          <span style={hintStyle}>완료 처리 시 재고가 이렇게 움직입니다</span>
          {sameOption ? (
            <span style={moveRowStyle}>
              주문과 같은 옵션이라 회수분 입고와 재발송 출고가 서로 상쇄됩니다 — 재고 변화 없음.
            </span>
          ) : (
            <>
              {origin !== undefined && (
                <span style={moveRowStyle}>
                  <StatusBadge tone="success" label="입고" />
                  {`${optionLabel(origin.optionValues)} · ${origin.sku}`}
                  <span style={deltaStyle}>
                    {`${formatNumber(origin.stock)} → ${formatNumber(origin.stock + quantity)}개`}
                  </span>
                </span>
              )}
              <span style={moveRowStyle}>
                <StatusBadge tone="warning" label="출고" />
                {`${optionLabel(selected.optionValues)} · ${selected.sku}`}
                <span style={deltaStyle}>
                  {`${formatNumber(selected.stock)} → ${formatNumber(Math.max(0, selected.stock - quantity))}개`}
                </span>
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
