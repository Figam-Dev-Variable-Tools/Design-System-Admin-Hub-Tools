// PromotionFormPage — 프로모션 등록/수정 (라우트: /marketing/promotions/new · /:id/edit)
//
// 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 재사용한다. 필드: 프로모션명·기간·상태·대상·할인
// (정률/정액)·최소주문금액·쿠폰 연동·설명. 검증 정본은 ./validation.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  controlStyle,
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  hintIdOf,
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
import {
  couponCatalog,
  couponEditPath,
  findCatalogCoupon,
} from '../../../shared/domain/coupon-catalog';
import { cssVar } from '@tds/ui';

const RESOURCE = 'marketing-promotions';
const ENTITY_LABEL = '프로모션';
const LIST_PATH = '/marketing/promotions';
const UNSAVED_MESSAGE =
  '프로모션에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.4'),
};

/** 선택한 쿠폰으로 건너뛰는 줄 — 선택 바로 아래에 붙는다 */
const couponLinkStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
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
  couponId: '',
  description: '',
};

const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

/**
 * 저장 시점의 쿠폰명을 카탈로그에서 뜬다 — 목록이 조인 없이 그릴 표시용 사본이다(types.ts 주석).
 * 카탈로그를 모르거나(미배선) 사라진 id 면 빈 문자열 — 이름을 지어내지 않는다.
 */
function couponNameOf(couponId: string): string {
  if (couponId === '') return '';
  const catalog = couponCatalog();
  if (catalog === null) return '';
  const coupon = findCatalogCoupon(catalog, couponId);
  return coupon === null ? '' : coupon.name;
}

function toInput(values: PromotionFormValues): PromotionInput {
  // 토글을 끄면 선택값을 버린다 — '연동 안 함 + 쿠폰 id 남음' 이라는 어긋난 상태를 만들지 않는다
  const couponId = values.couponLinked ? values.couponId : '';
  return {
    title: values.title.trim(),
    startAt: values.startAt,
    endAt: values.endAt,
    phase: values.phase,
    target: values.target.trim(),
    discountType: values.discountType,
    discountValue: digitsToNumber(values.discountValue),
    minOrderAmount: digitsToNumber(values.minOrderAmount),
    couponId,
    couponName: couponNameOf(couponId),
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
    // 연동 여부는 저장하지 않는다 — id 가 있으면 연동된 것이다(types.ts 의 hasLinkedCoupon)
    couponLinked: promotion.couponId !== '',
    couponId: promotion.couponId,
    description: promotion.description,
  };
}

export default function PromotionFormPage() {
  const {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
  } = useCrudForm<Promotion, PromotionInput, PromotionFormValues>({
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
  const couponId = watch('couponId');
  // 선택 목록의 정본은 상품 관리 쿠폰이다 — 이 화면은 조회기가 주는 것만 그린다(null = 모른다)
  const couponOptions = couponCatalog();
  const periodError = errors.startAt?.message ?? errors.endAt?.message;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="프로모션 정보"
      description="별표(*) 항목은 필수입니다. 기간·할인 조건을 확인하세요."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailure={loadFailure}
      onRetryLoad={retryLoad}
      errorReference={errorReference}
      conflict={conflict}
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
            aria-describedby={errors.target !== undefined ? errorIdOf('promo-target') : undefined}
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
            aria-describedby={
              errors.discountValue !== undefined ? errorIdOf('promo-discount-value') : undefined
            }
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
      {couponLinked &&
        // 카탈로그를 모르면(조회기 미배선) 빈 선택 목록을 그리지 않는다 — '고를 쿠폰이 없다' 는
        // 완결된 문장이 되어 배선 사고를 데이터 사고로 읽게 만든다(coupon-catalog.ts 머리말).
        (couponOptions === null ? (
          <FormField
            htmlFor="promo-coupon"
            label="연동 쿠폰"
            required
            error="쿠폰 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
          >
            <SelectField id="promo-coupon" disabled isInvalid>
              <option value="">쿠폰 목록을 불러오지 못했습니다</option>
            </SelectField>
          </FormField>
        ) : (
          <FormField
            htmlFor="promo-coupon"
            label="연동 쿠폰"
            required
            error={errors.couponId?.message}
            hint="상품 관리에 등록된 쿠폰만 고를 수 있습니다."
          >
            <SelectField
              id="promo-coupon"
              disabled={disabled}
              isInvalid={errors.couponId !== undefined}
              aria-describedby={
                errors.couponId !== undefined ? errorIdOf('promo-coupon') : hintIdOf('promo-coupon')
              }
              {...register('couponId')}
            >
              <option value="">쿠폰을 선택하세요</option>
              {couponOptions.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {`${coupon.name} · ${coupon.code} · ${coupon.benefitLabel}`}
                </option>
              ))}
            </SelectField>
          </FormField>
        ))}
      {couponLinked && couponId !== '' && (
        <p style={couponLinkStyle}>
          {/* 참조는 건너갈 수 있어야 참조다 — 자유 텍스트였을 때는 여기서 갈 곳이 없었다 */}
          <Link to={couponEditPath(couponId)} className="tds-ui-link tds-ui-focusable">
            연동한 쿠폰 상세 보기
          </Link>
        </p>
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
