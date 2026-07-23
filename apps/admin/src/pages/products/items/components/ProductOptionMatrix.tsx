// 옵션 · SKU(조합형) 매트릭스 편집기 (오너 지시 — 엔터프라이즈 옵션 관리)
//
// [국내 커머스 어드민 관례] 옵션 그룹(색상·사이즈 등)을 정의하면 그 조합(데카르트 곱)이 SKU 매트릭스로
// 펼쳐지고, 각 조합의 재고·추가금액·품절을 표에서 인라인 편집한다. 옵션이 없으면 단일 SKU 한 줄.
// 조합 생성·보존 규칙(buildVariantMatrix)의 정본은 ../_shared/store 다 — 여기는 편집 UI 만 얹는다.
//
// 상품 폼 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개). 도메인 값/콜백만 다룬다.
import type { CSSProperties } from 'react';

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
  ToggleSwitch,
} from '../../../../shared/ui';
import { buildVariantMatrix, MAX_OPTION_GROUPS, totalStock } from '../../_shared/store';
import type { ProductOptionGroup, ProductVariant } from '../../_shared/store';
import { cssVar } from '@tds/ui';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const groupsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const groupRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 4) minmax(0, 1fr) auto`,
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const tableWrapStyle: CSSProperties = {
  width: '100%',
  overflowX: 'auto',
};

const numberInputStyle: CSSProperties = {
  ...controlStyle(false),
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const skuInputStyle: CSSProperties = {
  ...controlStyle(false),
  minWidth: `calc(${cssVar('space.6')} * 4)`,
};

const summaryStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
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

interface MatrixValue {
  readonly optionGroups: readonly ProductOptionGroup[];
  readonly variants: readonly ProductVariant[];
}

interface ProductOptionMatrixProps {
  readonly disabled: boolean;
  readonly code: string;
  readonly optionGroups: readonly ProductOptionGroup[];
  readonly variants: readonly ProductVariant[];
  readonly onChange: (next: MatrixValue) => void;
  readonly error?: string | undefined;
  /**
   * 재고 수량·품절 토글만 잠근다 — pgLock('product-stock') 의 답.
   *
   * **옵션은 잠기지 않는다.** 결제가 없어도 색상·사이즈는 '무엇을 문의하는가' 의 축이고,
   * 문의로 받은 요청의 품목 명세로 그대로 쓰인다. 잠기는 것은 차감 주체(주문)가 없는 수량뿐이다.
   */
  readonly stockLocked?: boolean;
}

export function ProductOptionMatrix({
  disabled,
  code,
  optionGroups,
  variants,
  onChange,
  error,
  stockLocked = false,
}: ProductOptionMatrixProps) {
  // 값은 남는다 — 결제를 다시 켜면 입력해 둔 재고가 그대로 살아난다
  const stockDisabled = disabled || stockLocked;
  const regenerate = (nextGroups: readonly ProductOptionGroup[]) => {
    onChange({
      optionGroups: nextGroups,
      variants: buildVariantMatrix(nextGroups, variants, code || 'SKU'),
    });
  };

  const addGroup = () => {
    if (optionGroups.length >= MAX_OPTION_GROUPS) return;
    regenerate([...optionGroups, { id: `og-${String(Date.now())}`, name: '', values: [] }]);
  };

  const removeGroup = (id: string) => {
    regenerate(optionGroups.filter((group) => group.id !== id));
  };

  const patchGroup = (id: string, patch: Partial<Pick<ProductOptionGroup, 'name' | 'values'>>) => {
    regenerate(optionGroups.map((group) => (group.id === id ? { ...group, ...patch } : group)));
  };

  const patchVariant = (id: string, patch: Partial<ProductVariant>) => {
    onChange({
      optionGroups,
      variants: variants.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)),
    });
  };

  const hasOptions = optionGroups.some((group) => group.values.length > 0);
  const groupNames = optionGroups
    .filter((group) => group.values.length > 0)
    .map((group) => group.name);

  return (
    <div style={sectionStyle}>
      <span style={fieldLabelStyle}>옵션 · 재고(SKU)</span>
      <p style={hintStyle}>
        색상·사이즈 등 옵션을 추가하면 조합이 아래 표로 펼쳐져요. 옵션값은 쉼표(,)로 구분하세요.
        옵션이 없으면 단일 재고로 관리돼요. (최대 {MAX_OPTION_GROUPS}개 옵션)
      </p>

      <div style={groupsStyle}>
        {optionGroups.map((group, index) => (
          <div key={group.id} style={groupRowStyle}>
            <input
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(false)}
              value={group.name}
              placeholder={`옵션명 ${String(index + 1)} (예: 색상)`}
              disabled={disabled}
              aria-label={`옵션 ${String(index + 1)} 이름`}
              onChange={(event) => patchGroup(group.id, { name: event.target.value })}
            />
            <input
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(false)}
              value={group.values.join(', ')}
              placeholder="옵션값 (예: 블랙, 화이트, 베이지)"
              disabled={disabled}
              aria-label={`옵션 ${String(index + 1)} 값`}
              onChange={(event) =>
                patchGroup(group.id, {
                  values: event.target.value
                    .split(',')
                    .map((value) => value.trim())
                    .filter((value) => value !== ''),
                })
              }
            />
            <button
              type="button"
              className="tds-ui-focusable"
              style={iconButtonStyle}
              disabled={disabled}
              aria-label={`옵션 ${String(index + 1)} 삭제`}
              onClick={() => removeGroup(group.id)}
            >
              <Icon name="trash" />
            </button>
          </div>
        ))}
      </div>

      {optionGroups.length < MAX_OPTION_GROUPS && (
        <span>
          <Button variant="secondary" size="md" disabled={disabled} onClick={addGroup}>
            <Icon name="plus-circle" />
            옵션 추가
          </Button>
        </span>
      )}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {hasOptions ? (
                groupNames.map((name, index) => (
                  <th key={`${name}-${String(index)}`} scope="col" style={thStyle}>
                    {name.trim() === '' ? `옵션 ${String(index + 1)}` : name}
                  </th>
                ))
              ) : (
                <th scope="col" style={thStyle}>
                  구분
                </th>
              )}
              <th scope="col" style={thStyle}>
                SKU
              </th>
              <th scope="col" style={thStyle}>
                추가금액(원)
              </th>
              <th scope="col" style={thStyle}>
                재고
              </th>
              <th scope="col" style={thStyle}>
                품절
              </th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id}>
                {hasOptions ? (
                  variant.optionValues.map((value, index) => (
                    <td key={`${variant.id}-${String(index)}`} style={tdStyle}>
                      {value}
                    </td>
                  ))
                ) : (
                  <td style={tdStyle}>단일 상품</td>
                )}
                <td style={tdStyle}>
                  <input
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={skuInputStyle}
                    value={variant.sku}
                    disabled={disabled}
                    aria-label={`${variant.optionValues.join(' ') || '단일'} SKU`}
                    onChange={(event) => patchVariant(variant.id, { sku: event.target.value })}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={numberInputStyle}
                    value={String(variant.addPrice)}
                    disabled={disabled}
                    aria-label={`${variant.optionValues.join(' ') || '단일'} 추가금액`}
                    onChange={(event) =>
                      patchVariant(variant.id, { addPrice: toDigits(event.target.value) })
                    }
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={numberInputStyle}
                    value={String(variant.stock)}
                    disabled={stockDisabled}
                    aria-label={`${variant.optionValues.join(' ') || '단일'} 재고`}
                    onChange={(event) =>
                      patchVariant(variant.id, { stock: toDigits(event.target.value) })
                    }
                  />
                </td>
                <td style={tdStyle}>
                  <ToggleSwitch
                    checked={variant.soldOut}
                    onChange={(next) => patchVariant(variant.id, { soldOut: next })}
                    disabled={stockDisabled}
                    label={`${variant.optionValues.join(' ') || '단일'} 품절 여부`}
                    onLabel="품절"
                    offLabel="판매"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={summaryStyle}>
        <span
          style={hintStyle}
        >{`총 재고 ${totalStock({ variants }).toLocaleString('ko-KR')}개 · SKU ${String(variants.length)}종`}</span>
      </div>

      {error !== undefined && error !== '' && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}
