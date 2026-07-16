// ProductPricingCards — 상품 폼의 '가격·할인'·'배송' 섹션 카드 (A41 소유)
//
// ProductFormPage 에서 분리한 도메인 필드 조각이다(순환복잡도 완화 · 단일 책임). 페이지가 쥔 RHF
// register/errors/setValue 와 watch 값(할인 방식·과세·배송비 정책)을 props 로 받아 그대로 그린다.
// 검증·상태는 페이지(스키마)가 소유하고, 여기는 배치만 한다. 두 카드는 원래 순서를 지키려고 각각
// 별도 컴포넌트로 두고, 페이지가 사이(옵션·재고 카드)를 유지한다.
import type { CSSProperties } from 'react';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import {
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  SelectField,
  ToggleSwitch,
} from '../../../../shared/ui';
import type { ProductFormValues } from '../validation';

const DISCOUNT_TYPE_OPTIONS = [
  { id: 'none', label: '할인 없음' },
  { id: 'amount', label: '정액 할인(원)' },
  { id: 'percent', label: '정률 할인(%)' },
] as const;

const SHIPPING_METHOD_OPTIONS = [
  { id: 'courier', label: '택배' },
  { id: 'direct', label: '직접배송' },
  { id: 'pickup', label: '방문수령' },
] as const;

const SHIPPING_FEE_OPTIONS = [
  { id: 'free', label: '무료배송' },
  { id: 'paid', label: '유료배송' },
  { id: 'conditional', label: '조건부 무료' },
] as const;

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-4)',
};

interface PriceDiscountCardProps {
  readonly register: UseFormRegister<ProductFormValues>;
  readonly errors: FieldErrors<ProductFormValues>;
  readonly setValue: UseFormSetValue<ProductFormValues>;
  readonly disabled: boolean;
  readonly discountType: ProductFormValues['discountType'];
  readonly taxable: boolean;
}

export function ProductPriceDiscountCard({
  register,
  errors,
  setValue,
  disabled,
  discountType,
  taxable,
}: PriceDiscountCardProps) {
  const isPercent = discountType === 'percent';

  return (
    <Card>
      <CardTitle>가격 · 할인</CardTitle>

      <div style={rowStyle}>
        <FormField
          htmlFor="product-price"
          label="판매가 (원)"
          required
          error={errors.price?.message}
        >
          <input
            id="product-price"
            type="text"
            inputMode="numeric"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.price !== undefined)}
            placeholder="예: 129000"
            disabled={disabled}
            aria-invalid={errors.price !== undefined}
            aria-describedby={errors.price !== undefined ? errorIdOf('product-price') : undefined}
            {...register('price')}
          />
        </FormField>

        <FormField htmlFor="product-discount-type" label="할인 방식">
          <SelectField id="product-discount-type" disabled={disabled} {...register('discountType')}>
            {DISCOUNT_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField
          htmlFor="product-discount-value"
          label={isPercent ? '할인율 (%)' : '할인 금액 (원)'}
          error={errors.discountValue?.message}
        >
          <input
            id="product-discount-value"
            type="text"
            inputMode="numeric"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.discountValue !== undefined)}
            placeholder={isPercent ? '예: 20' : '예: 10000'}
            disabled={disabled || discountType === 'none'}
            aria-invalid={errors.discountValue !== undefined}
            aria-describedby={
              errors.discountValue !== undefined ? errorIdOf('product-discount-value') : undefined
            }
            {...register('discountValue')}
          />
        </FormField>
      </div>

      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>과세 여부</span>
        <ToggleSwitch
          checked={taxable}
          onChange={(next) => setValue('taxable', next, { shouldDirty: true })}
          disabled={disabled}
          label="과세 상품 여부"
          onLabel="과세"
          offLabel="면세"
        />
      </div>
    </Card>
  );
}

interface ShippingCardProps {
  readonly register: UseFormRegister<ProductFormValues>;
  readonly errors: FieldErrors<ProductFormValues>;
  readonly disabled: boolean;
  readonly feeType: ProductFormValues['shipping']['feeType'];
}

export function ProductShippingCard({ register, errors, disabled, feeType }: ShippingCardProps) {
  return (
    <Card>
      <CardTitle>배송</CardTitle>
      <div style={rowStyle}>
        <FormField htmlFor="product-ship-method" label="배송 방식">
          <SelectField
            id="product-ship-method"
            disabled={disabled}
            {...register('shipping.method')}
          >
            {SHIPPING_METHOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField htmlFor="product-ship-fee-type" label="배송비 정책">
          <SelectField
            id="product-ship-fee-type"
            disabled={disabled}
            {...register('shipping.feeType')}
          >
            {SHIPPING_FEE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
      </div>

      {feeType !== 'free' && (
        <div style={rowStyle}>
          <FormField
            htmlFor="product-ship-fee"
            label="기본 배송비 (원)"
            required
            error={errors.shipping?.fee?.message}
          >
            <input
              id="product-ship-fee"
              type="text"
              inputMode="numeric"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.shipping?.fee !== undefined)}
              placeholder="예: 3000"
              disabled={disabled}
              aria-invalid={errors.shipping?.fee !== undefined}
              aria-describedby={
                errors.shipping?.fee !== undefined ? errorIdOf('product-ship-fee') : undefined
              }
              {...register('shipping.fee')}
            />
          </FormField>

          {feeType === 'conditional' && (
            <FormField
              htmlFor="product-ship-threshold"
              label="무료배송 기준 (원)"
              required
              error={errors.shipping?.freeThreshold?.message}
              hint="이 금액 이상 주문 시 무료배송"
            >
              <input
                id="product-ship-threshold"
                type="text"
                inputMode="numeric"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(errors.shipping?.freeThreshold !== undefined)}
                placeholder="예: 50000"
                disabled={disabled}
                aria-invalid={errors.shipping?.freeThreshold !== undefined}
                aria-describedby={
                  errors.shipping?.freeThreshold !== undefined
                    ? errorIdOf('product-ship-threshold')
                    : undefined
                }
                {...register('shipping.freeThreshold')}
              />
            </FormField>
          )}
        </div>
      )}
    </Card>
  );
}
