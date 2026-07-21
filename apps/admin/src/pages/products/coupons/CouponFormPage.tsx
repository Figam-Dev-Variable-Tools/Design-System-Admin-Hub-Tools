// CouponFormPage — 쿠폰 등록/수정 (라우트: /products/coupons/new · /:id/edit)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드 3장(쿠폰 정보 ·
// 발급 기준 · 사용 조건) + 우측 실시간 쿠폰 카드 미리보기 2단으로 구성한다.
// 검증의 정본은 ./validation 의 zod 스키마다.
//
// [폼은 평평하고 도메인은 유니온이다] 트리거·사용기간은 종류마다 필요한 값이 달라 도메인에서
// 판별 유니온이다(types.ts). 폼은 칸을 전부 들고 있다가 저장 지점(toInput)에서 buildCouponTrigger·
// buildUsagePeriod 를 지나며 **고른 종류의 값만** 남긴다 — 종류를 바꾼 뒤 예전 값이 되살아나지 않는다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  controlStyle,
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  hintStyle,
  Icon,
  pageTitleStyle,
  SelectField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { conflictingProductsOf, couponAdapter } from './data-source';
import { couponSchema } from './validation';
import type { CouponFormValues } from './validation';
import { CouponCardPreview } from './components/CouponCardPreview';
import { CouponTargetPicker } from './components/CouponTargetPicker';
import type { CouponTargetOption } from './components/CouponTargetPicker';
import {
  BIRTHDAY_DAYS_MAX,
  buildCouponTrigger,
  buildUsagePeriod,
  conflictLabel,
  COUPON_CODE_MAX,
  COUPON_ISSUE_OPTIONS,
  COUPON_NAME_MAX,
  COUPON_TARGET_OPTIONS,
  COUPON_TRIGGER_OPTIONS,
  MEMBER_TIER_TARGETS,
  targetNeedsIds,
  targetPickerLabel,
  triggerSummary,
  USAGE_DAYS_MAX,
  usagePeriodLabel,
} from './types';
import type { Coupon, CouponInput } from './types';
import { listProducts, productCategoryPath } from '../_shared/store';
import { fetchProductCategoryOptions } from '../items/data-source';
import { cssVar } from '@tds/ui';

const RESOURCE = 'coupons';
const ENTITY_LABEL = '쿠폰';
const LIST_PATH = '/products/coupons';
const UNSAVED_MESSAGE =
  '쿠폰에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 5), 1fr))`,
  gap: cssVar('space.4'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const EMPTY: CouponFormValues = {
  name: '',
  code: '',
  issueType: 'amount',
  discountValue: '',
  maxDiscount: '0',
  minOrderAmount: '0',
  triggerType: 'manual',
  triggerTier: 'vip',
  triggerBirthdayDays: '7',
  triggerFrom: '',
  triggerTo: '',
  target: 'all',
  targetIds: [],
  // 국내 커머스의 기본은 1주문 1쿠폰이다 — 중복 허용은 명시적 결정이어야 한다
  stackable: false,
  usageKind: 'fixed',
  usageDays: '30',
  totalQuantity: '0',
  startAt: '',
  endAt: '',
  enabled: true,
  issuedCount: 0,
};

function toInput(values: CouponFormValues): CouponInput {
  const isFree = values.issueType === 'free_shipping';
  return {
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    issueType: values.issueType,
    discountValue: isFree ? 0 : Number(values.discountValue.trim() || '0'),
    maxDiscount: Number(values.maxDiscount.trim() || '0'),
    minOrderAmount: Number(values.minOrderAmount.trim() || '0'),
    trigger: buildCouponTrigger({
      type: values.triggerType,
      tier: values.triggerTier,
      birthdayDays: Number(values.triggerBirthdayDays.trim() || '0'),
      from: values.triggerFrom,
      to: values.triggerTo,
    }),
    target: values.target,
    // '전체 회원' 으로 되돌린 뒤 예전 대상이 남아 있으면 모델이 거짓을 들고 있게 된다
    targetIds: targetNeedsIds(values.target) ? [...values.targetIds] : [],
    stackable: values.stackable,
    usagePeriod: buildUsagePeriod(values.usageKind, Number(values.usageDays.trim() || '0')),
    totalQuantity: Number(values.totalQuantity.trim() || '0'),
    issuedCount: values.issuedCount,
    startAt: values.startAt,
    endAt: values.endAt,
    enabled: values.enabled,
  };
}

function toValues(coupon: Coupon): CouponFormValues {
  const { trigger, usagePeriod } = coupon;
  return {
    name: coupon.name,
    code: coupon.code,
    issueType: coupon.issueType,
    discountValue: coupon.issueType === 'free_shipping' ? '' : String(coupon.discountValue),
    maxDiscount: String(coupon.maxDiscount),
    minOrderAmount: String(coupon.minOrderAmount),
    triggerType: trigger.type,
    // 고르지 않은 종류의 칸은 기본값으로 채운다 — 종류를 바꿔 보는 동안 빈 칸이 오류로 보이지 않게
    triggerTier: trigger.type === 'tier_up' ? trigger.tier : 'vip',
    triggerBirthdayDays: trigger.type === 'birthday' ? String(trigger.daysBefore) : '7',
    triggerFrom: trigger.type === 'download' ? trigger.from : '',
    triggerTo: trigger.type === 'download' ? trigger.to : '',
    target: coupon.target,
    targetIds: [...coupon.targetIds],
    stackable: coupon.stackable,
    usageKind: usagePeriod.kind,
    usageDays: usagePeriod.kind === 'days_from_issue' ? String(usagePeriod.days) : '30',
    totalQuantity: String(coupon.totalQuantity),
    startAt: coupon.startAt,
    endAt: coupon.endAt,
    enabled: coupon.enabled,
    issuedCount: coupon.issuedCount,
  };
}

export default function CouponFormPage() {
  const navigate = useNavigate();
  /** 수정 화면의 쿠폰 id — 충돌 판정이 상품의 허용/제외 목록과 맞춰 보는 값 */
  const { id: couponId } = useParams<{ id: string }>();
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
  } = useCrudForm<Coupon, CouponInput, CouponFormValues>({
    resource: RESOURCE,
    adapter: couponAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: couponSchema,
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

  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const name = watch('name');
  const issueType = watch('issueType');
  const discountValue = watch('discountValue');
  const maxDiscount = watch('maxDiscount');
  const minOrderAmount = watch('minOrderAmount');
  const triggerType = watch('triggerType');
  const triggerTier = watch('triggerTier');
  const triggerBirthdayDays = watch('triggerBirthdayDays');
  const triggerFrom = watch('triggerFrom');
  const triggerTo = watch('triggerTo');
  const target = watch('target');
  const targetIds = watch('targetIds');
  const stackable = watch('stackable');
  const usageKind = watch('usageKind');
  const usageDays = watch('usageDays');
  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const enabled = watch('enabled');

  const periodError = errors.startAt?.message ?? errors.endAt?.message;
  const downloadError = errors.triggerFrom?.message ?? errors.triggerTo?.message;
  const targetIdsError = (errors.targetIds as { message?: string } | undefined)?.message;
  const toNum = (raw: string) => Number((raw.trim() || '0').replace(/\D/g, '')) || 0;

  // 카테고리 선택지는 상품 화면과 같은 조회기를 쓴다 — 목록의 정본을 두 벌로 만들지 않는다
  const categoriesQuery = useQuery({
    queryKey: ['products', 'category-options'],
    queryFn: ({ signal }) => fetchProductCategoryOptions(signal),
    // 상품 대상일 때는 부르지 않는다 — 쓰지 않을 목록을 불러오지 않는다
    enabled: target === 'category',
  });

  const targetOptions = useMemo<readonly CouponTargetOption[]>(() => {
    if (target === 'member_grade') {
      return MEMBER_TIER_TARGETS.map((tier) => ({ id: tier.id, label: tier.label }));
    }
    if (target === 'category') {
      return (categoriesQuery.data ?? []).map((category) => ({
        id: category.id,
        label: category.label,
        note: productCategoryPath(category.id),
      }));
    }
    if (target === 'product') {
      return listProducts().map((product) => ({
        id: product.id,
        label: product.name,
        note: product.code,
      }));
    }
    return [];
  }, [target, categoriesQuery.data]);

  /**
   * 지금 입력 기준 충돌 — 대상으로 지목했는데 그 상품이 쿠폰을 거부한다.
   *
   * [왜 저장을 막지 않나] 승자는 상품이므로(store.productAllowsCoupon) 저장해도 계산은 어긋나지
   * 않는다. 막아야 할 것은 **운영자가 모르는 채로 두는 것**이지 저장 자체가 아니다 — 특가가
   * 끝나 상품 설정이 풀리면 이 쿠폰은 그대로 살아난다. 그래서 경고이고, 목록에도 배지로 남는다.
   */
  const conflicts = useMemo(
    // 신규 쿠폰은 아직 id 가 없다 — 그래도 판정은 성립한다. 없는 id 는 어느 상품의
    // 허용/제외 목록에도 없으므로 '쿠폰 사용 불가(usable=false)' 상품만 걸러진다.
    () => conflictingProductsOf({ id: couponId ?? '', target, targetIds }),
    [couponId, target, targetIds],
  );

  const triggerHint =
    COUPON_TRIGGER_OPTIONS.find((option) => option.id === triggerType)?.hint ?? '';

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '쿠폰을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '쿠폰을 불러오지 못했습니다.'}
            </span>
            {loadFailure === 'error' && (
              <Button variant="secondary" onClick={retryLoad}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '쿠폰 수정' : '쿠폰 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 발급 기준은 쿠폰이 언제 나가는지를, 사용 조건은 어디에 쓸 수
          있는지를 정합니다.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>쿠폰 정보</CardTitle>

              <FormField htmlFor="coupon-name" label="쿠폰명" required error={errors.name?.message}>
                <input
                  id="coupon-name"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.name !== undefined)}
                  maxLength={COUPON_NAME_MAX}
                  placeholder="예: 신규 가입 15% 할인"
                  disabled={disabled}
                  aria-invalid={errors.name !== undefined}
                  aria-describedby={
                    errors.name !== undefined ? errorIdOf('coupon-name') : undefined
                  }
                  {...register('name')}
                />
              </FormField>

              <div style={rowStyle}>
                <FormField
                  htmlFor="coupon-code"
                  label="쿠폰 코드"
                  required
                  error={errors.code?.message}
                >
                  <input
                    id="coupon-code"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.code !== undefined)}
                    maxLength={COUPON_CODE_MAX}
                    placeholder="예: WELCOME15"
                    disabled={disabled}
                    aria-invalid={errors.code !== undefined}
                    aria-describedby={
                      errors.code !== undefined ? errorIdOf('coupon-code') : undefined
                    }
                    {...register('code')}
                  />
                </FormField>

                <FormField htmlFor="coupon-issue-type" label="발급 유형" required>
                  <SelectField
                    id="coupon-issue-type"
                    disabled={disabled}
                    {...register('issueType')}
                  >
                    {COUPON_ISSUE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <div style={rowStyle}>
                {issueType !== 'free_shipping' && (
                  <FormField
                    htmlFor="coupon-discount-value"
                    label={issueType === 'percent' ? '할인율 (%)' : '할인 금액 (원)'}
                    required
                    error={errors.discountValue?.message}
                  >
                    <input
                      id="coupon-discount-value"
                      type="text"
                      inputMode="numeric"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.discountValue !== undefined)}
                      placeholder={issueType === 'percent' ? '예: 15' : '예: 5000'}
                      disabled={disabled}
                      aria-invalid={errors.discountValue !== undefined}
                      aria-describedby={
                        errors.discountValue !== undefined
                          ? errorIdOf('coupon-discount-value')
                          : undefined
                      }
                      {...register('discountValue')}
                    />
                  </FormField>
                )}

                {issueType === 'percent' && (
                  <FormField
                    htmlFor="coupon-max-discount"
                    label="최대 할인 (원)"
                    error={errors.maxDiscount?.message}
                    hint="0 이면 상한 없음"
                  >
                    <input
                      id="coupon-max-discount"
                      type="text"
                      inputMode="numeric"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.maxDiscount !== undefined)}
                      placeholder="예: 20000"
                      disabled={disabled}
                      {...register('maxDiscount')}
                    />
                  </FormField>
                )}

                <FormField
                  htmlFor="coupon-quantity"
                  label="발급 수량"
                  required
                  error={errors.totalQuantity?.message}
                  hint="0 이면 무제한"
                >
                  <input
                    id="coupon-quantity"
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.totalQuantity !== undefined)}
                    placeholder="예: 1000"
                    disabled={disabled}
                    {...register('totalQuantity')}
                  />
                </FormField>
              </div>

              <DateRangeField
                label="쿠폰 사용 기간"
                required
                startValue={startAt}
                endValue={endAt}
                onStartChange={(value) => setValue('startAt', value, { shouldDirty: true })}
                onEndChange={(value) => setValue('endAt', value, { shouldDirty: true })}
                disabled={disabled}
                error={periodError}
              />

              <div style={fieldStyle}>
                <span style={fieldLabelStyle}>발급 상태</span>
                <ToggleSwitch
                  checked={enabled}
                  onChange={(next) => setValue('enabled', next, { shouldDirty: true })}
                  disabled={disabled}
                  label="쿠폰 발급 여부"
                  onLabel="발급중"
                  offLabel="중지"
                />
              </div>
            </Card>

            {/* ── 발급 기준 — 이 쿠폰이 언제 누구에게 나가는가 ── */}
            <Card>
              <CardTitle>발급 기준</CardTitle>

              <div style={rowStyle}>
                <FormField
                  htmlFor="coupon-trigger-type"
                  label="발급 시점"
                  required
                  hint={triggerHint}
                >
                  <SelectField
                    id="coupon-trigger-type"
                    disabled={disabled}
                    {...register('triggerType')}
                  >
                    {COUPON_TRIGGER_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                {/* 승급 대상 등급 — '회원 등급 승급 시' 에서만 뜻이 있다 */}
                {triggerType === 'tier_up' && (
                  <FormField
                    htmlFor="coupon-trigger-tier"
                    label="승급 대상 등급"
                    required
                    hint="이 등급으로 올라간 회원에게 발급됩니다."
                  >
                    <SelectField
                      id="coupon-trigger-tier"
                      disabled={disabled}
                      {...register('triggerTier')}
                    >
                      {MEMBER_TIER_TARGETS.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                )}

                {triggerType === 'birthday' && (
                  <FormField
                    htmlFor="coupon-trigger-birthday"
                    label="생일 며칠 전 발급"
                    required
                    error={errors.triggerBirthdayDays?.message}
                    hint={`0 이면 생일 당일. 최대 ${String(BIRTHDAY_DAYS_MAX)}일 전까지.`}
                  >
                    <input
                      id="coupon-trigger-birthday"
                      type="text"
                      inputMode="numeric"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.triggerBirthdayDays !== undefined)}
                      placeholder="예: 7"
                      disabled={disabled}
                      aria-invalid={errors.triggerBirthdayDays !== undefined}
                      aria-describedby={
                        errors.triggerBirthdayDays !== undefined
                          ? errorIdOf('coupon-trigger-birthday')
                          : undefined
                      }
                      {...register('triggerBirthdayDays')}
                    />
                  </FormField>
                )}
              </div>

              {triggerType === 'download' && (
                <DateRangeField
                  label="다운로드 기간"
                  required
                  startValue={triggerFrom}
                  endValue={triggerTo}
                  onStartChange={(value) => setValue('triggerFrom', value, { shouldDirty: true })}
                  onEndChange={(value) => setValue('triggerTo', value, { shouldDirty: true })}
                  disabled={disabled}
                  error={downloadError}
                />
              )}

              <p style={hintStyle}>
                요약 —{' '}
                {triggerSummary(
                  buildCouponTrigger({
                    type: triggerType,
                    tier: triggerTier,
                    birthdayDays: toNum(triggerBirthdayDays),
                    from: triggerFrom,
                    to: triggerTo,
                  }),
                )}
              </p>
            </Card>

            {/* ── 사용 조건 — 어디에 쓸 수 있는 쿠폰인가 ── */}
            <Card>
              <CardTitle>사용 조건</CardTitle>

              <div style={rowStyle}>
                <FormField htmlFor="coupon-target" label="사용 대상" required>
                  <SelectField id="coupon-target" disabled={disabled} {...register('target')}>
                    {COUPON_TARGET_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                <FormField
                  htmlFor="coupon-min-order"
                  label="최소 주문 금액 (원)"
                  required
                  error={errors.minOrderAmount?.message}
                  hint="0 이면 조건 없음"
                >
                  <input
                    id="coupon-min-order"
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

              {targetNeedsIds(target) && (
                <CouponTargetPicker
                  label={targetPickerLabel(target)}
                  options={targetOptions}
                  selectedIds={targetIds}
                  onChange={(next) =>
                    setValue('targetIds', [...next], { shouldDirty: true, shouldValidate: true })
                  }
                  disabled={disabled}
                  error={targetIdsError}
                  loading={target === 'category' && categoriesQuery.isPending}
                />
              )}

              <div style={rowStyle}>
                <FormField
                  htmlFor="coupon-usage-kind"
                  label="사용 가능 기간"
                  required
                  hint="발급일 기준을 고르면 회원마다 만료일이 달라집니다."
                >
                  <SelectField
                    id="coupon-usage-kind"
                    disabled={disabled}
                    {...register('usageKind')}
                  >
                    <option value="fixed">쿠폰 사용 기간과 동일</option>
                    <option value="days_from_issue">발급일 기준 N일</option>
                  </SelectField>
                </FormField>

                {usageKind === 'days_from_issue' && (
                  <FormField
                    htmlFor="coupon-usage-days"
                    label="사용 가능 일수"
                    required
                    error={errors.usageDays?.message}
                    hint={`최대 ${String(USAGE_DAYS_MAX)}일. 쿠폰 사용 종료일이 먼저 오면 그날 만료됩니다.`}
                  >
                    <input
                      id="coupon-usage-days"
                      type="text"
                      inputMode="numeric"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.usageDays !== undefined)}
                      placeholder="예: 30"
                      disabled={disabled}
                      aria-invalid={errors.usageDays !== undefined}
                      aria-describedby={
                        errors.usageDays !== undefined ? errorIdOf('coupon-usage-days') : undefined
                      }
                      {...register('usageDays')}
                    />
                  </FormField>
                )}
              </div>

              <div style={fieldStyle}>
                <span style={fieldLabelStyle}>중복 사용</span>
                <ToggleSwitch
                  checked={stackable}
                  onChange={(next) => setValue('stackable', next, { shouldDirty: true })}
                  disabled={disabled}
                  label="다른 쿠폰과 중복 사용 여부"
                  onLabel="중복 사용 가능"
                  offLabel="1주문 1쿠폰"
                />
              </div>

              {/* 쿠폰이 지목한 상품이 쿠폰을 거부한다 — 저장은 되지만 그 상품에는 붙지 않는다 */}
              {conflicts.length > 0 && (
                <Alert tone="warning">
                  {conflictLabel(conflicts.length)}이 대상에 들어 있습니다 (
                  {conflicts.map((product) => product.name).join(', ')}). 해당 상품은 쿠폰 사용
                  불가로 설정되어 있어 이 쿠폰이 적용되지 않습니다 — 상품의 쿠폰 사용 설정을 먼저
                  풀어 주세요.
                </Alert>
              )}
            </Card>
          </div>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <CouponCardPreview
              name={name}
              issueType={issueType}
              discountValue={toNum(discountValue)}
              minOrderAmount={toNum(minOrderAmount)}
              maxDiscount={toNum(maxDiscount)}
              stackable={stackable}
              target={target}
              periodText={usagePeriodLabel({
                usagePeriod: buildUsagePeriod(usageKind, toNum(usageDays)),
                startAt,
                endAt,
              })}
              triggerText={triggerSummary(
                buildCouponTrigger({
                  type: triggerType,
                  tier: triggerTier,
                  birthdayDays: toNum(triggerBirthdayDays),
                  from: triggerFrom,
                  to: triggerTo,
                }),
              )}
              enabled={enabled}
            />
          </Card>
        </div>

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
