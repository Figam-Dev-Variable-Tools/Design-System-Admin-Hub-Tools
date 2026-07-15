// PromotionFormPage — 프로모션 등록/수정 (라우트: /marketing/promotions/new · /:id/edit) · A41 소유
//
// 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 재사용한다. 필드: 프로모션명·기간·상태·대상·할인
// (정률/정액)·최소주문금액·쿠폰 연동·설명. 검증 정본은 ./validation.
import type { CSSProperties } from 'react';

import {
  controlStyle,
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  SelectField,
  TextareaField,
  ToggleSwitch,
} from '../../../shared/ui';
import { useCrudForm, FormPageShell } from '../../../shared/crud';
import { promotionAdapter } from './data-source';
import { promotionSchema } from './validation';
import type { PromotionFormValues } from './validation';
import { DISCOUNT_TYPE_OPTIONS, PROMOTION_DESC_MAX, PROMOTION_TITLE_MAX } from './types';
import type { Promotion, PromotionInput } from './types';
import { CAMPAIGN_PHASE_OPTIONS } from '../_shared/campaign';

const RESOURCE = 'marketing-promotions';
const ENTITY_LABEL = '프로모션';
const LIST_PATH = '/marketing/promotions';
const UNSAVED_MESSAGE =
  '프로모션에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: 'var(--tds-space-4)',
};

const EMPTY: PromotionFormValues = {
  title: '',
  startAt: '',
  endAt: '',
  phase: 'upcoming',
  target: '',
  discountType: 'rate',
  discountValue: '10',
  minOrderAmount: '0',
  couponLinked: false,
  couponCode: '',
  description: '',
};

const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

function toInput(values: PromotionFormValues): PromotionInput {
  return {
    title: values.title.trim(),
    startAt: values.startAt,
    endAt: values.endAt,
    phase: values.phase,
    target: values.target.trim(),
    discountType: values.discountType,
    discountValue: digitsToNumber(values.discountValue),
    minOrderAmount: digitsToNumber(values.minOrderAmount),
    couponLinked: values.couponLinked,
    couponCode: values.couponLinked ? values.couponCode.trim() : '',
    description: values.description.trim(),
  };
}

function toValues(promotion: Promotion): PromotionFormValues {
  return {
    title: promotion.title,
    startAt: promotion.startAt,
    endAt: promotion.endAt,
    phase: promotion.phase,
    target: promotion.target,
    discountType: promotion.discountType,
    discountValue: String(promotion.discountValue),
    minOrderAmount: String(promotion.minOrderAmount),
    couponLinked: promotion.couponLinked,
    couponCode: promotion.couponCode,
    description: promotion.description,
  };
}

export default function PromotionFormPage() {
  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<Promotion, PromotionInput, PromotionFormValues>({
      resource: RESOURCE,
      adapter: promotionAdapter,
      entityLabel: ENTITY_LABEL,
      listPath: LIST_PATH,
      schema: promotionSchema,
      empty: EMPTY,
      toInput,
      toValues,
    });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;

  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const discountType = watch('discountType');
  const couponLinked = watch('couponLinked');
  const periodError = errors.startAt?.message ?? errors.endAt?.message;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="프로모션 정보"
      description="별표(*) 항목은 필수입니다. 기간·할인 조건을 확인하세요."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailed={loadFailed}
      serverError={serverError}
      saving={saving}
      isDirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={submit}
    >
      <FormField htmlFor="promo-title" label="프로모션명" required error={errors.title?.message}>
        <input
          id="promo-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={PROMOTION_TITLE_MAX}
          placeholder="예: 전 상품 20% 할인"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('promo-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <DateRangeField
        label="프로모션 기간"
        required
        startValue={startAt}
        endValue={endAt}
        onStartChange={(value) => setValue('startAt', value, { shouldDirty: true })}
        onEndChange={(value) => setValue('endAt', value, { shouldDirty: true })}
        disabled={disabled}
        error={periodError}
      />

      <div style={rowStyle}>
        <FormField htmlFor="promo-phase" label="상태" required>
          <SelectField id="promo-phase" disabled={disabled} {...register('phase')}>
            {CAMPAIGN_PHASE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
        <FormField htmlFor="promo-target" label="대상" required error={errors.target?.message}>
          <input
            id="promo-target"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.target !== undefined)}
            placeholder="예: 전체 회원 · 신규 가입 회원"
            disabled={disabled}
            aria-invalid={errors.target !== undefined}
            {...register('target')}
          />
        </FormField>
      </div>

      <div style={rowStyle}>
        <FormField htmlFor="promo-discount-type" label="할인 유형" required>
          <SelectField id="promo-discount-type" disabled={disabled} {...register('discountType')}>
            {DISCOUNT_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
        <FormField
          htmlFor="promo-discount-value"
          label={discountType === 'rate' ? '할인율 (%)' : '할인액 (원)'}
          required
          error={errors.discountValue?.message}
        >
          <input
            id="promo-discount-value"
            type="text"
            inputMode="numeric"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.discountValue !== undefined)}
            placeholder={discountType === 'rate' ? '예: 20' : '예: 5000'}
            disabled={disabled}
            aria-invalid={errors.discountValue !== undefined}
            {...register('discountValue')}
          />
        </FormField>
        <FormField
          htmlFor="promo-min-order"
          label="최소 주문금액 (원)"
          error={errors.minOrderAmount?.message}
          hint="0 이면 조건 없음"
        >
          <input
            id="promo-min-order"
            type="text"
            inputMode="numeric"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.minOrderAmount !== undefined)}
            placeholder="예: 30000"
            disabled={disabled}
            {...register('minOrderAmount')}
          />
        </FormField>
      </div>

      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>쿠폰 연동</span>
        <ToggleSwitch
          checked={couponLinked}
          onChange={(next) =>
            setValue('couponLinked', next, { shouldDirty: true, shouldValidate: true })
          }
          disabled={disabled}
          label="쿠폰 연동 여부"
          onLabel="연동"
          offLabel="미연동"
        />
      </div>
      {couponLinked && (
        <FormField
          htmlFor="promo-coupon"
          label="연동 쿠폰코드"
          required
          error={errors.couponCode?.message}
          hint="상품 관리 쿠폰과 연결됩니다."
        >
          <input
            id="promo-coupon"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.couponCode !== undefined)}
            placeholder="예: SUMMER20"
            disabled={disabled}
            aria-invalid={errors.couponCode !== undefined}
            {...register('couponCode')}
          />
        </FormField>
      )}

      <TextareaField
        label="설명"
        value={watch('description')}
        onChange={(value) => setValue('description', value, { shouldDirty: true })}
        maxLength={PROMOTION_DESC_MAX}
        disabled={disabled}
        error={errors.description?.message}
        placeholder="프로모션 조건·안내 문구를 입력하세요."
        rows={4}
      />
    </FormPageShell>
  );
}
