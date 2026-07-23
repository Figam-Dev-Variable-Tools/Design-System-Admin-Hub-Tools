// ProductPricingCards — 상품 폼의 '가격·할인'·'적립금'·'배송' 섹션 카드
//
// ProductFormPage 에서 분리한 도메인 필드 조각이다(순환복잡도 완화 · 단일 책임). 페이지가 쥔 RHF
// register/errors/setValue 와 watch 값(할인 방식·과세·적립 방식·배송비 정책)을 props 로 받아 그대로
// 그린다. 검증·상태는 페이지(스키마)가 소유하고, 여기는 배치만 한다. 카드들은 원래 순서를 지키려고
// 각각 별도 컴포넌트로 두고, 페이지가 사이(옵션·재고 카드)를 유지한다.
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import { formatNumber } from '../../../../shared/format';
import {
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  formRowStyle,
  hintStyle,
  SelectField,
  ToggleSwitch,
} from '../../../../shared/ui';
import { PgLockNotice } from '../../../../shared/commerce/PgLockNotice';
import type { PgLock } from '../../../../shared/commerce/pg-lock';
import { POINTS_MODE_OPTIONS } from '../types';
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

interface PriceDiscountCardProps {
  readonly register: UseFormRegister<ProductFormValues>;
  readonly errors: FieldErrors<ProductFormValues>;
  readonly setValue: UseFormSetValue<ProductFormValues>;
  readonly disabled: boolean;
  readonly discountType: ProductFormValues['discountType'];
  readonly taxable: boolean;
  /**
   * 판매가·할인·과세를 잠글 것인가 — resolvePriceDisplay 가 낸 답이다(이 카드가 다시 판단하지 않는다).
   *
   * **잠겨도 값은 남는다**: 저장된 판매가·할인율·과세 구분은 그대로 보존되고, 결제 연동을 마치면
   * 그대로 살아난다. 지우는 구현이면 되돌리는 순간 운영자가 기억으로 복원해야 한다.
   */
  readonly amountFieldsLocked: boolean;
  /** 왜 지금 잠겼는지 — 규칙이 함께 돌려준 문구(목록·미리보기가 쓰는 것과 같은 문장) */
  readonly displayReason: string;
}

export function ProductPriceDiscountCard({
  register,
  errors,
  setValue,
  disabled,
  discountType,
  taxable,
  amountFieldsLocked,
  displayReason,
}: PriceDiscountCardProps) {
  const isPercent = discountType === 'percent';
  const amountDisabled = disabled || amountFieldsLocked;

  return (
    <Card>
      <CardTitle>가격 · 할인</CardTitle>

      {/* 왜 금액 칸이 잠겼는가 — 사유·다음 행동(결제 설정)·값 보존 약속을 한 벌로 말한다.
          문의 링크는 붙이지 않는다: 여기서 운영자가 할 일은 '이 상품의 값을 고치는 것' 이고,
          그것을 다시 열 수 있는 곳은 결제 설정 하나뿐이다(문의함은 이 카드의 다음 행동이 아니다). */}
      {amountFieldsLocked && (
        <PgLockNotice reason={displayReason}>
          {' '}
          입력한 판매가·할인·과세 구분은 지워지지 않고 그대로 보존돼요.
        </PgLockNotice>
      )}

      <div style={formRowStyle}>
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
            disabled={amountDisabled}
            aria-invalid={errors.price !== undefined}
            aria-describedby={errors.price !== undefined ? errorIdOf('product-price') : undefined}
            {...register('price')}
          />
        </FormField>

        {/* 할인·과세도 금액이 노출될 때만 의미가 있다 — 잠그되 값은 그대로 둔다(되살아난다) */}
        <FormField htmlFor="product-discount-type" label="할인 방식">
          <SelectField
            id="product-discount-type"
            disabled={amountDisabled}
            {...register('discountType')}
          >
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
            disabled={amountDisabled || discountType === 'none'}
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
          disabled={amountDisabled}
          label="과세 상품 여부"
          onLabel="과세"
          offLabel="면세"
        />
      </div>
    </Card>
  );
}

interface PointsCardProps {
  readonly register: UseFormRegister<ProductFormValues>;
  readonly errors: FieldErrors<ProductFormValues>;
  readonly disabled: boolean;
  readonly mode: ProductFormValues['points']['mode'];
  /** 지금 입력값 기준 적립 포인트 — 페이지가 earnedPoints(순수 규칙)로 계산해 넘긴다 */
  readonly earned: number;
  /** 결제가 없어 적립이 발생하지 않는가 — pgLock('product-points') 의 답 */
  readonly lock: PgLock;
}

/**
 * 상품별 적립 설정 (F).
 *
 * [왜 상품 폼에 있는가] 적립률은 상품의 속성이다 — 마진이 다르면 적립도 달라야 한다. 전역
 * 적립금 정책(`/products/points`)은 **기본 적립률**과 상품에 속하지 않는 규칙(회원가입 적립금·
 * 사용 단위·유효기간 등)을 계속 소유하고, 여기서는 그 기본값을 이 상품에 한해 덮어쓴다.
 * 배송(전역 배송 정책 ↔ 상품별 배송 카드)과 같은 구조다.
 */
export function ProductPointsCard({
  register,
  errors,
  disabled,
  mode,
  earned,
  lock,
}: PointsCardProps) {
  // 잠금은 입력만 막는다 — 저장된 적립률·적립액은 그대로 남아 PG 를 다시 켜면 살아난다
  const fieldsDisabled = disabled || lock.locked;

  return (
    <Card>
      <CardTitle>적립금</CardTitle>

      {lock.locked && <PgLockNotice reason={lock.reason} />}

      <div style={formRowStyle}>
        <FormField htmlFor="product-points-mode" label="적립 방식">
          <SelectField
            id="product-points-mode"
            disabled={fieldsDisabled}
            {...register('points.mode')}
          >
            {POINTS_MODE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        {mode === 'rate' && (
          <FormField
            htmlFor="product-points-rate"
            label="적립률 (%)"
            required
            error={errors.points?.rate?.message}
            hint="전역 적립금 정책의 기본 적립률을 이 상품에 한해 덮어써요."
          >
            <input
              id="product-points-rate"
              type="text"
              inputMode="numeric"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.points?.rate !== undefined)}
              placeholder="예: 2"
              disabled={fieldsDisabled}
              aria-invalid={errors.points?.rate !== undefined}
              aria-describedby={
                errors.points?.rate !== undefined ? errorIdOf('product-points-rate') : undefined
              }
              {...register('points.rate')}
            />
          </FormField>
        )}

        {mode === 'fixed' && (
          <FormField
            htmlFor="product-points-amount"
            label="적립액 (원)"
            required
            error={errors.points?.amount?.message}
            hint="판매가와 무관하게 이 금액을 적립해요."
          >
            <input
              id="product-points-amount"
              type="text"
              inputMode="numeric"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.points?.amount !== undefined)}
              placeholder="예: 2000"
              disabled={fieldsDisabled}
              aria-invalid={errors.points?.amount !== undefined}
              aria-describedby={
                errors.points?.amount !== undefined ? errorIdOf('product-points-amount') : undefined
              }
              {...register('points.amount')}
            />
          </FormField>
        )}
      </div>

      {/* 입력이 곧 결과로 보이게 한다 — 적립률만 보고 실제 적립액을 암산하게 두지 않는다 */}
      <p style={hintStyle}>
        {mode === 'none'
          ? '이 상품은 적립금을 지급하지 않아요.'
          : `이 상품 1개 구매 시 ${formatNumber(earned)}P 적립돼요. (할인 반영 최종가 기준)`}
      </p>
    </Card>
  );
}

interface ShippingCardProps {
  readonly register: UseFormRegister<ProductFormValues>;
  readonly errors: FieldErrors<ProductFormValues>;
  readonly disabled: boolean;
  readonly feeType: ProductFormValues['shipping']['feeType'];
  /** 배송비는 결제 금액의 일부다 — 결제가 없으면 잠긴다. pgLock('product-shipping') 의 답 */
  readonly lock: PgLock;
}

export function ProductShippingCard({
  register,
  errors,
  disabled,
  feeType,
  lock,
}: ShippingCardProps) {
  // 값은 남는다 — 결제를 다시 켜면 저장된 배송 방식·배송비가 그대로 살아난다
  const fieldsDisabled = disabled || lock.locked;

  return (
    <Card>
      <CardTitle>배송</CardTitle>

      {lock.locked && <PgLockNotice reason={lock.reason} />}

      <div style={formRowStyle}>
        <FormField htmlFor="product-ship-method" label="배송 방식">
          <SelectField
            id="product-ship-method"
            disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
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
        <div style={formRowStyle}>
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
              disabled={fieldsDisabled}
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
                disabled={fieldsDisabled}
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
