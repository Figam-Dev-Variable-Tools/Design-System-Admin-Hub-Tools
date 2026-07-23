// ProductCouponCard — 상품 폼의 '쿠폰 사용 설정' 구획
//
// [왜 상품 폼에 있는가] 쿠폰 사용 가능 여부는 **상품의 원가 사실**이다 — 특가·공동구매·역마진
// 사은품은 마진이 이미 0 이라 그 위에 할인이 얹히면 팔수록 손해다. 쿠폰 화면에서 상품을 하나씩
// 빼는 것으로는 표현되지 않는다(내일 만드는 새 쿠폰까지 자동으로 막아야 한다). 배송·적립과 같은
// 결의 '상품별 오버라이드' 구획이다.
//
// [충돌이 나면 누가 이기나 — 상품이다] 이 상품을 대상으로 지목한 쿠폰이 있는데 여기서 쿠폰을
// 막아 두면, 계산은 상품 편으로 끝난다(_shared/store 의 productAllowsCoupon 머리말). 다만
// **조용히 이기지는 않는다** — 아래 경고가 어느 쿠폰이 무력해지는지 이름을 대고 말한다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import {
  Alert,
  Card,
  CardTitle,
  checkboxStyle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  formRowStyle,
  hintStyle,
  SelectField,
  ToggleSwitch,
} from '../../../../shared/ui';
import { couponEditPath } from '../../../../shared/domain/coupon-catalog';
import { COUPON_POLICY_MODE_OPTIONS } from '../types';
import { PgLockNotice } from '../../../../shared/commerce/PgLockNotice';
import type { PgLock } from '../../../../shared/commerce/pg-lock';
import type { ProductFormValues } from '../validation';
import { cssVar } from '@tds/ui';

const listStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(calc(${cssVar('space.6')} * 5), 1fr))`,
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
  maxHeight: `calc(${cssVar('space.6')} * 6)`,
  overflowY: 'auto',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  minWidth: 0,
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
  cursor: 'pointer',
};

/** 쿠폰 선택지 한 줄 — 도메인 모델이 아니라 이 카드가 그리는 데 필요한 최소값만 받는다 */
export interface CouponChoice {
  readonly id: string;
  readonly name: string;
  /** 이 쿠폰이 이 상품을 대상으로 지목했는가 — 충돌 경고의 근거 */
  readonly targetsThisProduct: boolean;
}

interface ProductCouponCardProps {
  readonly register: UseFormRegister<ProductFormValues>;
  readonly errors: FieldErrors<ProductFormValues>;
  readonly setValue: UseFormSetValue<ProductFormValues>;
  readonly disabled: boolean;
  readonly usable: boolean;
  readonly mode: ProductFormValues['coupons']['mode'];
  readonly couponIds: readonly string[];
  readonly choices: readonly CouponChoice[];
  readonly loading: boolean;
  /**
   * 결제가 없어 쿠폰을 쓸 시점이 없는가 — pgLock('product-coupons') 의 답.
   *
   * 잠기면 **쿠폰 후보 조회도 호출하지 않는다**(페이지가 useQuery 를 끈다) — 쓸 수 없는 목록을
   * 불러오느라 화면이 기다릴 이유가 없다. 저장된 쿠폰 사용 설정은 그대로 보존된다.
   */
  readonly lock: PgLock;
}

export function ProductCouponCard({
  register,
  errors,
  setValue,
  disabled,
  usable,
  mode,
  couponIds,
  choices,
  loading,
  lock,
}: ProductCouponCardProps) {
  const fieldsDisabled = disabled || lock.locked;
  const selected = new Set(couponIds);
  const idsError = (errors.coupons?.couponIds as { message?: string } | undefined)?.message;
  // 지목당했는데 못 받는다 = 운영자가 모르는 채로 두면 안 되는 어긋남
  const conflicting = usable ? [] : choices.filter((choice) => choice.targetsThisProduct);

  const toggle = (id: string, checked: boolean) => {
    const next = checked ? [...couponIds, id] : couponIds.filter((value) => value !== id);
    setValue('coupons.couponIds', next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Card>
      <CardTitle>쿠폰 사용 설정</CardTitle>

      {lock.locked && <PgLockNotice reason={lock.reason} />}

      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>쿠폰 사용 가능 여부</span>
        <ToggleSwitch
          checked={usable}
          onChange={(next) => setValue('coupons.usable', next, { shouldDirty: true })}
          disabled={fieldsDisabled}
          label="이 상품에 쿠폰 사용 가능 여부"
          onLabel="사용 가능"
          offLabel="사용 불가"
        />
        <p style={hintStyle}>
          끄면 이 상품에는 <strong>어떤 쿠폰도</strong> 적용되지 않아요. 특가·공동구매처럼 마진이
          없는 상품에 써요.
        </p>
      </div>

      {usable && (
        <>
          <div style={formRowStyle}>
            <FormField
              htmlFor="product-coupon-mode"
              label="적용 범위"
              hint="특정 쿠폰만 받거나, 특정 쿠폰만 뺄 수 있어요."
            >
              <SelectField
                id="product-coupon-mode"
                disabled={fieldsDisabled}
                {...register('coupons.mode')}
              >
                {COUPON_POLICY_MODE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FormField>
          </div>

          {mode !== 'all' &&
            (loading ? (
              <p style={hintStyle}>쿠폰 목록을 불러오는 중이에요…</p>
            ) : choices.length === 0 ? (
              <p style={hintStyle}>등록된 쿠폰이 없어요. 먼저 쿠폰을 등록해 주세요.</p>
            ) : (
              <div style={fieldStyle}>
                {/* 필수인 것은 '어느 한 쿠폰' 이 아니라 '고르는 행위' 다 — 묶음 이름에 싣는다 (A11Y-11) */}
                <span style={fieldLabelStyle}>
                  {mode === 'include' ? '허용할 쿠폰' : '제외할 쿠폰'}
                  <span aria-hidden="true"> *</span>
                </span>
                <ul
                  style={listStyle}
                  role="group"
                  aria-label={`${mode === 'include' ? '허용할 쿠폰' : '제외할 쿠폰'} (필수)`}
                >
                  {choices.map((choice) => (
                    <li key={choice.id} style={itemStyle}>
                      <label style={labelRowStyle}>
                        <input
                          type="checkbox"
                          style={checkboxStyle}
                          checked={selected.has(choice.id)}
                          disabled={fieldsDisabled}
                          onChange={(event) => {
                            toggle(choice.id, event.target.checked);
                          }}
                        />
                        {choice.name}
                      </label>
                    </li>
                  ))}
                </ul>
                {idsError !== undefined && <p style={errorTextStyle}>{idsError}</p>}
              </div>
            ))}
        </>
      )}

      {conflicting.length > 0 && (
        <Alert tone="warning">
          이 상품을 대상으로 지정한 쿠폰이 {String(conflicting.length)}건 있어요 — 쿠폰 사용 불가로
          두면 적용되지 않아요.{' '}
          {conflicting.map((choice, index) => (
            <span key={choice.id}>
              {index > 0 && ', '}
              <Link to={couponEditPath(choice.id)} className="tds-ui-link tds-ui-focusable">
                {choice.name}
              </Link>
            </span>
          ))}
        </Alert>
      )}
    </Card>
  );
}
