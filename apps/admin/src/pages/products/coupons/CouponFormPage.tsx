// CouponFormPage — 쿠폰 등록/수정 (라우트: /products/coupons/new · /:id/edit)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드 3장(쿠폰 정보 ·
// 발급 기준 · 사용 조건) + 우측 실시간 쿠폰 카드 미리보기 2단으로 구성한다.
// 검증의 정본은 ./validation 의 zod 스키마다.
//
// [폼은 평평하고 도메인은 유니온이다] 트리거·사용기간은 종류마다 필요한 값이 달라 도메인에서
// 판별 유니온이다(types.ts). 폼은 칸을 전부 들고 있다가 저장 지점(toInput)에서 buildCouponTrigger·
// buildUsagePeriod 를 지나며 **고른 종류의 값만** 남긴다 — 종류를 바꾼 뒤 예전 값이 되살아나지 않는다.
//
// [한 줄에 입력 하나] 입력 카드 안의 칸은 전부 세로로 쌓는다(Card 가 space.4 로 쌓아 준다).
// 가로로 두는 것은 **한 쌍이 곧 하나의 값**인 날짜 범위(DateRangeField)뿐이다 — 시작일과 종료일은
// 따로 읽을 수 없는 한 값이라 나란히 있어야 뜻이 산다. 나머지를 2열로 접으면 '쿠폰 코드'와
// '발급 유형'처럼 서로 무관한 두 질문이 한 줄에 묶여 짝처럼 읽힌다.
import { useMemo } from 'react';
import type { CSSProperties, FormEvent } from 'react';
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
import { memberTierCatalog } from '../../../shared/domain/member-tier-catalog';
import { conflictingProductsOf, couponAdapter, fetchCouponTargetProducts } from './data-source';
import { couponSchema } from './validation';
import type { CouponFormValues } from './validation';
import { CouponCardPreview } from './components/CouponCardPreview';
import { CouponScopePicker } from './components/CouponScopePicker';
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
  couponSaveBlockReason,
  isBuiltInTier,
  targetNeedsIds,
  targetPickerLabel,
  triggerCondition,
  triggerSummary,
  USAGE_DAYS_MAX,
  usagePeriodLabel,
} from './types';
import type { Coupon, CouponInput, CouponTarget, OptionsState } from './types';
import { fetchProductCategoryOptions } from '../items/data-source';
import { cssVar } from '@tds/ui';

const RESOURCE = 'coupons';
const ENTITY_LABEL = '쿠폰';
const LIST_PATH = '/products/coupons';
const UNSAVED_MESSAGE =
  '쿠폰에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

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

  /* ── 선택지 세 벌 ────────────────────────────────────────────────────────────
   *
   * 카테고리·상품은 같은 섹션(pages/products)의 것이라 그 data-source 를 그대로 쓴다 — 카테고리
   * 조회기는 상품 화면과 **같은 것**이다(목록의 정본을 두 벌로 만들지 않는다).
   *
   * 회원 등급만 다른 페이지 모듈(고객 설정)의 것이라 그 화면을 import 할 수 없다(축1, 임계값 0).
   * 그래서 이미 있는 이음매를 읽는다 — shared/domain/member-tier-catalog, `src/wiring.ts` 가 꽂는다.
   * 배선이 없으면 빈 배열이 아니라 **null** 이 온다: '등급이 없다' 와 '등급을 모른다' 는 다른 말이다.
   */
  const wantsCategories = target === 'category' || target === 'product';

  const categoriesQuery = useQuery({
    queryKey: ['products', 'category-options'],
    queryFn: ({ signal }) => fetchProductCategoryOptions(signal),
    // 쓰지 않을 목록을 불러오지 않는다
    enabled: wantsCategories,
  });
  const productsQuery = useQuery({
    queryKey: ['coupons', 'target-products'],
    queryFn: ({ signal }) => fetchCouponTargetProducts(signal),
    enabled: target === 'product',
  });

  const categories = wantsCategories ? (categoriesQuery.data ?? null) : null;
  const products = target === 'product' ? (productsQuery.data ?? null) : null;
  const scopeLoading =
    (wantsCategories && categoriesQuery.isPending) ||
    (target === 'product' && productsQuery.isPending);

  /** 등급 카탈로그 — null 이면 '모른다'. 이 화면은 그 사실을 숨기지 않는다 */
  const tierCatalog = memberTierCatalog();

  const gradeOptions = useMemo<readonly CouponTargetOption[] | null>(
    () =>
      tierCatalog === null ? null : tierCatalog.map((tier) => ({ id: tier.id, label: tier.label })),
    [tierCatalog],
  );

  /**
   * 승급 대상 등급의 선택지 — 카탈로그에서 **기본 제공 3종만** 남는다.
   *
   * `CouponTrigger.tier` 가 닫힌 유니온이라 운영자가 추가한 등급은 아직 발급 기준이 들 수 없다.
   * 그 등급들을 조용히 빼지 않고 아래에 이름을 적는다 — 등급 정책 화면(TierUpCouponCard)이
   * 반대편에서 같은 사실을 말하고 있고, 두 화면의 말이 어긋나면 운영자는 어느 쪽도 믿지 못한다.
   */
  const triggerTierOptions = (tierCatalog ?? []).filter((tier) => isBuiltInTier(tier.id));
  const unsupportedTierLabels = (tierCatalog ?? [])
    .filter((tier) => !isBuiltInTier(tier.id))
    .map((tier) => tier.label);

  const tierOptionsState: OptionsState = tierCatalog === null ? 'unknown' : 'known';
  const targetOptionsState: OptionsState =
    target === 'all'
      ? 'known'
      : target === 'member_grade'
        ? tierOptionsState
        : scopeLoading
          ? 'loading'
          : categories === null || (target === 'product' && products === null)
            ? 'unknown'
            : 'known';

  /**
   * 사용 대상을 바꾼다 — **이전에 고른 id 는 함께 버린다.**
   *
   * 상품 id 를 골라 둔 채 '특정 카테고리' 로 바꾸면, 화면에는 카테고리 선택지가 뜨는데 폼은 여전히
   * 상품 id 를 들고 있다. 그대로 저장하면 화면에 보이지 않던 값이 저장된다 — 이 리포는 그것을
   * 결함으로 친다(toInput 이 '전체 회원' 만 비우던 것으로는 이 경우를 못 막는다).
   * 연쇄 셀렉트의 좌표(1차·2차·상품)는 아래 key 가 컴포넌트를 새로 세워 함께 버린다.
   */
  const changeTarget = (next: CouponTarget) => {
    setValue('target', next, { shouldDirty: true });
    setValue('targetIds', [], { shouldDirty: true, shouldValidate: true });
  };

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

  /**
   * 저장을 막아야 하는 이유 — **버튼과 제출이 같은 이 값을 읽는다.**
   *
   * 버튼만 잠그면 Enter 제출이 그대로 지나가고, 제출만 막으면 왜 눌리지 않는지 화면이 말하지 않는다.
   * 술어는 한 벌이고(types.couponSaveBlockReason), 이 문자열이 곧 화면에 나가는 말이다.
   */
  const blockReason = couponSaveBlockReason({
    target,
    targetIds,
    triggerType,
    triggerTier,
    targetOptions: targetOptionsState,
    tierOptions: tierOptionsState,
  });

  const guardedSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (blockReason !== null) {
      event.preventDefault();
      return;
    }
    submit(event);
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '쿠폰을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '쿠폰을 불러오지 못했어요.'}
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
          별표(*) 항목은 필수예요. 발급 기준은 쿠폰이 언제 나가는지를, 사용 조건은 어디에 쓸 수
          있는지를 정해요.
        </p>
      </div>

      <form onSubmit={guardedSubmit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card aria-labelledby="coupon-info-title">
              <CardTitle id="coupon-info-title">쿠폰 정보</CardTitle>

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
                <SelectField id="coupon-issue-type" disabled={disabled} {...register('issueType')}>
                  {COUPON_ISSUE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

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

              {/*
                [최소 주문 금액이 왜 '사용 조건' 이 아니라 여기인가 — 운영자 지시 + 읽는 순서]
                이 값은 '얼마나 깎아 주는가(할인값·최대 할인)' 와 한 문장으로 읽힌다:
                "3만원 이상 사면 15%, 최대 2만원." 할인 칸 바로 아래에 둬야 그 문장이 이어지고,
                '몇 장 뿌리는가(발급 수량)'·'언제까지인가(사용 기간)' 는 그다음 질문이라 뒤에 온다.
                '사용 조건' 카드는 **어디에 쓸 수 있는 쿠폰인가**(대상·기간 방식·중복)를 다루는 곳이라,
                금액 조건이 거기 있으면 대상 셀렉트 옆에서 홀로 다른 축을 말하고 있었다.
              */}
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

              {/* 날짜 한 쌍만 가로다 — 시작일·종료일은 따로 읽을 수 없는 한 값이다 */}
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
            <Card aria-labelledby="coupon-trigger-title">
              <CardTitle id="coupon-trigger-title">발급 기준</CardTitle>

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

              {/*
                [조건 칸은 시점이 요구할 때만 뜬다 — triggerCondition 이 그 판정의 정본이다]
                여섯 중 셋만 더 묻는다. 나머지 셋(운영자 직접·가입·첫 구매)에 억지로 셀렉트를 붙이면
                저장은 되고 아무 데도 쓰이지 않는 값이 생긴다 — 그 이유는 types.ts 에 적었고,
                발급 시점의 힌트 문구가 화면에서 같은 말을 한다.
              */}

              {/* 승급 대상 등급 — 목록의 정본은 고객 설정 화면이고 이 화면은 이음매로만 읽는다 */}
              {triggerCondition(triggerType) === 'tier' &&
                (tierCatalog === null ? (
                  <Alert tone="warning">
                    회원 등급 목록을 불러오지 못해 승급 대상 등급을 고를 수 없어요. 등급 정보가
                    연결된 뒤에 이 쿠폰을 저장할 수 있어요.
                  </Alert>
                ) : (
                  <FormField
                    htmlFor="coupon-trigger-tier"
                    label="승급 대상 등급"
                    required
                    hint="이 등급으로 올라간 회원에게 발급돼요."
                  >
                    <SelectField
                      id="coupon-trigger-tier"
                      disabled={disabled}
                      {...register('triggerTier')}
                    >
                      {triggerTierOptions.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                ))}

              {/* 운영자가 추가한 등급은 아직 발급 기준이 들 수 없다 — 숨기지 않고 이름을 적는다 */}
              {triggerCondition(triggerType) === 'tier' && unsupportedTierLabels.length > 0 && (
                <p style={hintStyle}>
                  {unsupportedTierLabels.join(' · ')} 등급은 아직 발급 기준으로 고를 수 없어요 —
                  기본 제공 등급으로만 승급 발급을 걸 수 있어요.
                </p>
              )}

              {triggerCondition(triggerType) === 'birthday-days' && (
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

              {triggerCondition(triggerType) === 'download-period' && (
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
            <Card aria-labelledby="coupon-usage-title">
              <CardTitle id="coupon-usage-title">사용 조건</CardTitle>

              <FormField htmlFor="coupon-target" label="사용 대상" required>
                <SelectField
                  id="coupon-target"
                  disabled={disabled}
                  value={target}
                  onChange={(event) => {
                    changeTarget(event.target.value as CouponTarget);
                  }}
                >
                  {COUPON_TARGET_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              {/*
                회원등급은 짧은 평면 목록이라 체크박스가 맞고, 카테고리·상품은 갈래가 깊어 연쇄
                셀렉트가 맞다. 뒤의 둘은 **같은 부품**(CouponScopePicker)이 그린다 — '특정 카테고리'
                는 2단에서 멈추고 '특정 상품' 은 3단째를 편다. key 로 대상마다 새로 세워, 대상을
                바꿨을 때 이전 좌표(1차·2차·상품)가 남지 않게 한다.
              */}
              {target === 'member_grade' && (
                <CouponTargetPicker
                  label={targetPickerLabel(target)}
                  options={gradeOptions}
                  selectedIds={targetIds}
                  onChange={(next) =>
                    setValue('targetIds', [...next], { shouldDirty: true, shouldValidate: true })
                  }
                  disabled={disabled}
                  error={targetIdsError}
                  unknownReason="회원 등급 목록을 불러오지 못했어요."
                />
              )}

              {(target === 'category' || target === 'product') && (
                <CouponScopePicker
                  key={target}
                  target={target}
                  label={targetPickerLabel(target)}
                  categories={categories}
                  products={products}
                  loading={scopeLoading}
                  selectedIds={targetIds}
                  onChange={(next) =>
                    setValue('targetIds', [...next], { shouldDirty: true, shouldValidate: true })
                  }
                  disabled={disabled}
                  error={targetIdsError}
                />
              )}

              <FormField
                htmlFor="coupon-usage-kind"
                label="사용 가능 기간"
                required
                hint="발급일 기준을 고르면 회원마다 만료일이 달라져요."
              >
                <SelectField id="coupon-usage-kind" disabled={disabled} {...register('usageKind')}>
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
                  hint={`최대 ${String(USAGE_DAYS_MAX)}일. 쿠폰 사용 종료일이 먼저 오면 그날 만료돼요.`}
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
                  {conflictLabel(conflicts.length)}이 대상에 들어 있어요 (
                  {conflicts.map((product) => product.name).join(', ')}). 해당 상품은 쿠폰 사용
                  불가로 설정되어 있어 이 쿠폰이 적용되지 않아요 — 상품의 쿠폰 사용 설정을 먼저 풀어
                  주세요.
                </Alert>
              )}
            </Card>
          </div>

          <Card aria-labelledby="coupon-preview-title">
            <CardTitle id="coupon-preview-title">미리보기</CardTitle>
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

        {/* 잠긴 버튼은 이유를 달고 있어야 한다 — 같은 술어가 아래 disabled 도 정한다 */}
        {blockReason !== null && <Alert tone="warning">{blockReason}</Alert>}

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
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={disabled || blockReason !== null}
            aria-label={
              blockReason === null ? undefined : `${isEdit ? '저장' : '등록'} — ${blockReason}`
            }
          >
            {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
