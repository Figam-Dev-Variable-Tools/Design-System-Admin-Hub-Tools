// 쿠폰 사용 대상 연쇄 선택 — 1차 카테고리 → 2차 카테고리 → (상품)
//
// [상품 등록 화면의 관용구를 그대로 쓴다] ProductFormPage 의 '카테고리(대분류)' + '카테고리(중분류)'
// 두 셀렉트가 이 리포의 원본이다: 위 셀렉트가 아래 셀렉트의 목록을 정하고, 아래를 고르지 않으면
// 위가 곧 답이다. 여기서 달라지는 것은 **대상이 여럿일 수 있다**는 점뿐이라, 그 위에 '추가' 한 단과
// 고른 것들의 목록을 얹었다. 좁혀 가는 규칙과 초기화 규칙은 순수 함수(../types)가 소유한다.
//
// [카테고리 대상과 상품 대상이 같은 부품이다] '특정 카테고리' 는 2단(1차 → 2차)에서 멈추고
// '특정 상품' 은 3단째를 하나 더 편다. 둘을 다른 컴포넌트로 나누면 초기화 규칙이 두 벌이 되고,
// 한쪽만 고쳐진 채로 남는다 — 이 종류 UI 에서 가장 흔한 버그가 정확히 그것이다.
//
// [모른다 ≠ 비었다] 목록을 못 읽었으면 빈 셀렉트를 그리지 않는다. 빈 셀렉트는 '고를 것이 없다' 는
// **완결된 문장**이라, 운영자는 카테고리를 다시 만들러 간다. 그래서 '지금은 고를 수 없다' 고 말하고
// 이유를 함께 적는다.
import { useState } from 'react';
import type { CSSProperties } from 'react';

import {
  Button,
  errorTextStyle,
  fieldLabelStyle,
  hintStyle,
  Icon,
  SelectField,
} from '../../../../shared/ui';
import { cssVar } from '@tds/ui';
import {
  EMPTY_SCOPE,
  productsInScope,
  scopeAddableId,
  scopeCategoryPath,
  scopeChildOptions,
  scopeRootOptions,
  withScopeChild,
  withScopeProduct,
  withScopeRoot,
} from '../types';
import type { CouponScope, CouponTarget, ScopeCategory, ScopeProduct } from '../types';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/** 연쇄 셀렉트는 세로로 쌓는다 — 한 줄에 입력 하나 (날짜 한 쌍만 예외다) */
const chainStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const stepStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const addRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
};

const chipListStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.full'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
};

interface CouponScopePickerProps {
  /** 'category' 면 2단에서 멈추고 'product' 면 상품 셀렉트가 한 단 더 붙는다 */
  readonly target: Extract<CouponTarget, 'category' | 'product'>;
  readonly label: string;
  /** null = 목록을 모른다(조회 실패·미배선) */
  readonly categories: readonly ScopeCategory[] | null;
  /** target === 'product' 에서만 쓴다. null = 모른다 */
  readonly products: readonly ScopeProduct[] | null;
  /** 조회 중인가 — '모른다' 와 다른 말이다 */
  readonly loading?: boolean;
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
  readonly disabled?: boolean;
  readonly error?: string | undefined;
}

export function CouponScopePicker({
  target,
  label,
  categories,
  products,
  loading = false,
  selectedIds,
  onChange,
  disabled = false,
  error,
}: CouponScopePickerProps) {
  /**
   * 좌표는 화면 상태다 — 저장되는 것은 '추가' 를 눌러 selectedIds 로 옮겨 간 id 뿐이다.
   * (사용 대상을 바꾸면 호출부가 key 로 이 컴포넌트를 새로 세워 좌표까지 함께 버린다.)
   */
  const [scope, setScope] = useState<CouponScope>(EMPTY_SCOPE);

  const invalid = error !== undefined && error !== '';
  const needsProducts = target === 'product';
  const known = categories !== null && (!needsProducts || products !== null);

  if (loading) {
    return (
      <div style={wrapStyle}>
        <span style={fieldLabelStyle}>
          {label}
          <span aria-hidden="true"> *</span>
        </span>
        <p style={hintStyle}>선택지를 불러오는 중이에요…</p>
      </div>
    );
  }

  if (!known) {
    return (
      <div style={wrapStyle}>
        <span style={fieldLabelStyle}>
          {label}
          <span aria-hidden="true"> *</span>
        </span>
        {/* 빈 셀렉트로 뭉개지 않는다 — '없다' 가 아니라 '지금은 고를 수 없다' 다 */}
        <p style={errorTextStyle}>
          {categories === null
            ? '카테고리 목록을 불러오지 못해 지금은 대상을 고를 수 없어요.'
            : '상품 목록을 불러오지 못해 지금은 대상을 고를 수 없어요.'}{' '}
          잠시 후 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  const rootOptions = scopeRootOptions(categories);
  const childOptions = scopeChildOptions(categories, scope.rootId);
  const productOptions = needsProducts
    ? productsInScope(products ?? [], categories, scope)
    : ([] as readonly ScopeProduct[]);

  const addableId = scopeAddableId(target, scope);
  const alreadyAdded = addableId !== '' && selectedIds.includes(addableId);

  const labelFor = (id: string): string => {
    if (needsProducts) {
      const product = (products ?? []).find((item) => item.id === id);
      return product === undefined ? id : `${product.name} (${product.code})`;
    }
    return scopeCategoryPath(categories, id);
  };

  const add = () => {
    if (addableId === '' || alreadyAdded) return;
    onChange([...selectedIds, addableId]);
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((value) => value !== id));
  };

  return (
    <div style={wrapStyle}>
      <span style={fieldLabelStyle}>
        {label}
        <span aria-hidden="true"> *</span>
      </span>

      <div style={chainStyle}>
        <div style={stepStyle}>
          <label style={fieldLabelStyle} htmlFor="coupon-scope-root">
            1차 카테고리
          </label>
          <SelectField
            id="coupon-scope-root"
            disabled={disabled}
            value={scope.rootId}
            onChange={(event) => {
              // 1차를 바꾸면 2차·상품은 버린다 (../types 의 withScopeRoot 가 그 규칙이다)
              setScope(withScopeRoot(event.target.value));
            }}
          >
            <option value="">1차 카테고리 선택</option>
            {rootOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectField>
        </div>

        <div style={stepStyle}>
          <label style={fieldLabelStyle} htmlFor="coupon-scope-child">
            2차 카테고리
          </label>
          <SelectField
            id="coupon-scope-child"
            disabled={disabled || childOptions.length === 0}
            value={scope.childId}
            onChange={(event) => {
              setScope(withScopeChild(scope, event.target.value));
            }}
          >
            <option value="">
              {scope.rootId === ''
                ? '1차를 먼저 선택하세요'
                : childOptions.length === 0
                  ? '이 1차에는 2차가 없어요'
                  : '2차 전체'}
            </option>
            {childOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectField>
        </div>

        {needsProducts && (
          <div style={stepStyle}>
            <label style={fieldLabelStyle} htmlFor="coupon-scope-product">
              상품
            </label>
            <SelectField
              id="coupon-scope-product"
              disabled={disabled || productOptions.length === 0}
              value={scope.productId}
              onChange={(event) => {
                setScope(withScopeProduct(scope, event.target.value));
              }}
            >
              <option value="">
                {scope.rootId === ''
                  ? '1차 카테고리를 먼저 선택하세요'
                  : productOptions.length === 0
                    ? '이 분류에 등록된 상품이 없어요'
                    : '상품 선택'}
              </option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.code})
                </option>
              ))}
            </SelectField>
          </div>
        )}
      </div>

      <div style={addRowStyle}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || addableId === '' || alreadyAdded}
          onClick={add}
          aria-label={alreadyAdded ? `${label}에 추가 — 이미 추가된 대상이에요` : `${label}에 추가`}
        >
          추가
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <ul style={chipListStyle}>
          {selectedIds.map((id) => (
            <li key={id} style={chipStyle}>
              {labelFor(id)}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  remove(id);
                }}
                aria-label={`${labelFor(id)} 제외`}
              >
                <Icon name="close" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p style={invalid ? errorTextStyle : hintStyle}>
        {invalid ? error : `${String(selectedIds.length)}개 선택됨`}
      </p>
    </div>
  );
}
