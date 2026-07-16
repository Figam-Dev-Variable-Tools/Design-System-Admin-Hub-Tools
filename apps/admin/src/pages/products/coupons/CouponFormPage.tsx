// CouponFormPage — 쿠폰 등록/수정 (라우트: /products/coupons/new · /:id/edit) · A41 소유
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드 + 우측 실시간
// 쿠폰 카드 미리보기 2단으로 구성한다. 검증의 정본은 ./validation 의 zod 스키마다.
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  controlStyle,
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  pageTitleStyle,
  SelectField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { couponAdapter } from './data-source';
import { couponSchema } from './validation';
import type { CouponFormValues } from './validation';
import { CouponCardPreview } from './components/CouponCardPreview';
import {
  COUPON_CODE_MAX,
  COUPON_ISSUE_OPTIONS,
  COUPON_NAME_MAX,
  COUPON_TARGET_OPTIONS,
} from './types';
import type { Coupon, CouponInput } from './types';

const RESOURCE = 'coupons';
const ENTITY_LABEL = '쿠폰';
const LIST_PATH = '/products/coupons';
const UNSAVED_MESSAGE =
  '쿠폰에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const descriptionStyle: CSSProperties = {
  marginTop: 'var(--tds-space-1)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))',
  gap: 'var(--tds-space-5)',
  alignItems: 'start',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-4)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const EMPTY: CouponFormValues = {
  name: '',
  code: '',
  issueType: 'amount',
  discountValue: '',
  maxDiscount: '0',
  minOrderAmount: '0',
  target: 'all',
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
    target: values.target,
    totalQuantity: Number(values.totalQuantity.trim() || '0'),
    issuedCount: values.issuedCount,
    startAt: values.startAt,
    endAt: values.endAt,
    enabled: values.enabled,
  };
}

function toValues(coupon: Coupon): CouponFormValues {
  return {
    name: coupon.name,
    code: coupon.code,
    issueType: coupon.issueType,
    discountValue: coupon.issueType === 'free_shipping' ? '' : String(coupon.discountValue),
    maxDiscount: String(coupon.maxDiscount),
    minOrderAmount: String(coupon.minOrderAmount),
    target: coupon.target,
    totalQuantity: String(coupon.totalQuantity),
    startAt: coupon.startAt,
    endAt: coupon.endAt,
    enabled: coupon.enabled,
    issuedCount: coupon.issuedCount,
  };
}

export default function CouponFormPage() {
  const navigate = useNavigate();
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
  const target = watch('target');
  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const enabled = watch('enabled');

  const periodError = errors.startAt?.message ?? errors.endAt?.message;
  const toNum = (raw: string) => Number((raw.trim() || '0').replace(/\D/g, '')) || 0;

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
        <ChevronLeftIcon />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '쿠폰 수정' : '쿠폰 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 오른쪽 미리보기로 고객 쿠폰함에 보일 모습을 확인하세요.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
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
                aria-describedby={errors.name !== undefined ? errorIdOf('coupon-name') : undefined}
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

              <FormField htmlFor="coupon-target" label="발급 대상" required>
                <SelectField id="coupon-target" disabled={disabled} {...register('target')}>
                  {COUPON_TARGET_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <div style={rowStyle}>
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
            </div>

            <div style={rowStyle}>
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
            </div>

            <DateRangeField
              label="사용 기간"
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

          <Card>
            <CardTitle>미리보기</CardTitle>
            <CouponCardPreview
              name={name}
              issueType={issueType}
              discountValue={toNum(discountValue)}
              minOrderAmount={toNum(minOrderAmount)}
              maxDiscount={toNum(maxDiscount)}
              target={target}
              startAt={startAt}
              endAt={endAt}
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
