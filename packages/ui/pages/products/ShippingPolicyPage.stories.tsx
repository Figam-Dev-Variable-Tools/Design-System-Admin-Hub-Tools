/**
 * Design System/Templates/Products/Shipping Policy — 배송 정책 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Products`(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 GROUPS 에서
 * `['상품 관리', 'Products', '/products', …]` · 화면 `['/products/shipping', '배송', 'Shipping']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/shipping/ShippingPolicyPage.tsx (라우트 /products/shipping) 와
 * 그 골격(shared/crud/DocumentFormShell — 단일 문서형 폼: 문서 1건을 불러와 고치고 저장한다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 공용 DocumentFormShell 은 DS 로 노출돼 있지 않으므로
 * 그 골격(안내문 · 카드 + 제목 · serverError 배너 · 저장 툴바)을 토큰만 쓴 로컬 레이아웃으로 재현한다.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   안내문(description)             → 토큰 <p>(muted)
 *   폼 카드 + CardTitle             → Card + 토큰 <h2>(DS Card 는 표면만 소유)
 *   저장 실패 배너(serverError)     → Alert(danger)
 *   택배사 · 배송비 필드(FormField+input) → TextField (라벨에 * 로 필수 표식 · 인라인 오류 자체 소유)
 *   배송비 정책(FormField+SelectField)  → FormField + SelectField (실화면과 같게)
 *   묶음배송(fieldLabel + ToggleSwitch) → 토큰 <span> 라벨 + ToggleSwitch(사용/미사용)
 *   첫 조회 로딩(Skeleton)          → Skeleton 4줄
 *   조회 실패                        → Alert(danger) + 다시 시도 Button
 *   저장 툴바(footer 힌트 + 저장)     → 토큰 <p> + Button(primary)
 *
 * [DS 갭 메모] 실화면은 FormField 로 텍스트/숫자 입력을 감싸 raw <input> 을 넣는다. DS 에는 FormField
 * 안에 넣을 '라벨 없는 입력' 원자가 없어(TextField 는 라벨을 자체 소유) TextField 로 갈음했다 — 필수
 * 표식은 라벨 끝의 * 로, 힌트는 필드 아래 <p> 로 옮겨 담는 정보를 보존한다(Admins/Admin Form 선례).
 * 배송비 정책 셀렉트만 FormField+SelectField 로 실화면과 같게 둔다.
 *
 * [조건부 필드] 배송비 정책에 따라 요금 칸이 갈린다(실화면 조건부 렌더 미러): '무료배송'이면 기본 배송비
 * 칸이 사라지고, '조건부 무료배송'일 때만 무료배송 기준 칸이 나타난다. Default 는 실화면 픽스처와 같은
 * '조건부 무료'(5만원 이상 무료) 상태이며, 셀렉트를 바꾸면 요금 칸이 실시간으로 갈린다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 vh 만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  Skeleton,
  SelectField,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Shipping Policy',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 선택지·기본값 (실화면 types.ts / validation.ts 미러) ───────────────────────────────────── */

type FeeType = 'free' | 'paid' | 'conditional';

/** 배송비 정책 — 무료/유료/조건부무료 (실화면 SHIPPING_FEE_OPTIONS) */
const SHIPPING_FEE_OPTIONS: readonly { readonly id: FeeType; readonly label: string }[] = [
  { id: 'free', label: '무료배송' },
  { id: 'paid', label: '유료배송' },
  { id: 'conditional', label: '조건부 무료배송' },
];

/** 배송 정책 값 — 실화면 ShippingPolicyValues 미러(요금은 폼 문자열) */
interface ShippingPolicyValues {
  carrier: string;
  feeType: FeeType;
  baseFee: string;
  freeThreshold: string;
  jejuExtraFee: string;
  islandExtraFee: string;
  returnFee: string;
  bundleShipping: boolean;
}

/** 화면 진입 시 기본값(실화면 DEFAULT_SHIPPING_POLICY 픽스처) — 조건부 무료(5만원 이상 무료) */
const DEFAULT_SHIPPING_POLICY: ShippingPolicyValues = {
  carrier: '가상택배',
  feeType: 'conditional',
  baseFee: '3000',
  freeThreshold: '50000',
  jejuExtraFee: '3000',
  islandExtraFee: '5000',
  returnFee: '3000',
  bundleShipping: true,
};

function toFeeType(value: string): FeeType {
  return SHIPPING_FEE_OPTIONS.find((option) => option.id === value)?.id ?? 'conditional';
}

/** 검증 실패 스냅샷 — 실화면 zod(validation.ts)가 낼 메시지를 대표값으로 인라인 */
const INVALID_VALUES: ShippingPolicyValues = {
  ...DEFAULT_SHIPPING_POLICY,
  carrier: '',
  baseFee: '',
  freeThreshold: '',
};

const CARRIER_ERROR = '택배사를 입력하세요.';
const BASE_FEE_ERROR = '기본 배송비를 입력하세요.';
const FREE_THRESHOLD_ERROR = '무료배송 기준 금액을 1원 이상 입력하세요.';

/* ── 스타일(토큰만) ──────────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

/** 한 줄에 필드 여럿 — 좁아지면 자동으로 접힌다(실화면 rowStyle) */
const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 6), 1fr))`,
  gap: cssVar('space.4'),
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const footerHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const errorRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 화면 조립 (rules-of-hooks: Decorator 화살표가 아닌 Capitalized 컴포넌트에서 useState) ────── */

type Variant = 'default' | 'loading' | 'edited' | 'saving' | 'validation' | 'load-error';

function ShippingPolicyScreen({ variant }: { variant: Variant }) {
  const loading = variant === 'loading';
  const loadFailed = variant === 'load-error';
  const saving = variant === 'saving';
  const showErrors = variant === 'validation';
  const dirty = variant === 'edited' || variant === 'saving' || variant === 'validation';
  const disabled = saving || loading;

  const [values, setValues] = useState<ShippingPolicyValues>(() =>
    showErrors ? INVALID_VALUES : DEFAULT_SHIPPING_POLICY,
  );

  const set =
    <K extends keyof ShippingPolicyValues>(key: K) =>
    (value: ShippingPolicyValues[K]): void => {
      setValues((prev) => ({ ...prev, [key]: value }));
    };

  const footerHint = saving
    ? '저장하는 중입니다…'
    : dirty
      ? '저장하지 않은 변경 사항이 있습니다.'
      : '변경 사항이 없습니다.';

  // 조회 실패 — 폼 대신 재시도 배너를 그린다(실화면 DocumentFormShell loadFailed 분기)
  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorRowStyle}>
            <span>내용을 불러오지 못했습니다.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        별표(*) 항목은 필수입니다. 저장하면 스토어 전체 배송비 계산에 반영됩니다.
      </p>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>배송 정책</h2>

            {showErrors && (
              <Alert tone="danger">
                입력값을 확인해 주세요. 아래 항목을 바로잡아야 저장됩니다.
              </Alert>
            )}

            {loading ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            ) : (
              <div style={bodyStyle}>
                <div style={rowStyle}>
                  <TextField
                    id="ship-carrier"
                    label="택배사 *"
                    value={values.carrier}
                    required
                    disabled={disabled}
                    placeholder="예: 가상택배"
                    error={showErrors ? CARRIER_ERROR : ''}
                    onChange={(event) => set('carrier')(event.target.value)}
                  />

                  <FormField htmlFor="ship-fee-type" label="배송비 정책" required>
                    <SelectField
                      id="ship-fee-type"
                      value={values.feeType}
                      disabled={disabled}
                      onChange={(event) => set('feeType')(toFeeType(event.target.value))}
                    >
                      {SHIPPING_FEE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                </div>

                {/* 요금 칸은 배송비 정책에 따라 갈린다 — 무료면 기본 배송비 없음, 조건부만 무료 기준 노출 */}
                {values.feeType !== 'free' && (
                  <div style={rowStyle}>
                    <TextField
                      id="ship-base-fee"
                      label="기본 배송비 (원) *"
                      value={values.baseFee}
                      inputMode="numeric"
                      required
                      disabled={disabled}
                      placeholder="예: 3000"
                      error={showErrors ? BASE_FEE_ERROR : ''}
                      onChange={(event) => set('baseFee')(event.target.value)}
                    />

                    {values.feeType === 'conditional' && (
                      <div style={fieldStyle}>
                        <TextField
                          id="ship-free-threshold"
                          label="무료배송 기준 (원) *"
                          value={values.freeThreshold}
                          inputMode="numeric"
                          required
                          disabled={disabled}
                          placeholder="예: 50000"
                          error={showErrors ? FREE_THRESHOLD_ERROR : ''}
                          onChange={(event) => set('freeThreshold')(event.target.value)}
                        />
                        {!showErrors && (
                          <p style={footerHintStyle}>이 금액 이상 주문 시 무료배송</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div style={rowStyle}>
                  <TextField
                    id="ship-jeju"
                    label="제주 추가배송비 (원) *"
                    value={values.jejuExtraFee}
                    inputMode="numeric"
                    required
                    disabled={disabled}
                    placeholder="예: 3000"
                    onChange={(event) => set('jejuExtraFee')(event.target.value)}
                  />
                  <TextField
                    id="ship-island"
                    label="도서산간 추가배송비 (원) *"
                    value={values.islandExtraFee}
                    inputMode="numeric"
                    required
                    disabled={disabled}
                    placeholder="예: 5000"
                    onChange={(event) => set('islandExtraFee')(event.target.value)}
                  />
                  <TextField
                    id="ship-return-fee"
                    label="반품 배송비 (원) *"
                    value={values.returnFee}
                    inputMode="numeric"
                    required
                    disabled={disabled}
                    placeholder="예: 3000"
                    onChange={(event) => set('returnFee')(event.target.value)}
                  />
                </div>

                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>묶음배송</span>
                  <ToggleSwitch
                    checked={values.bundleShipping}
                    label="묶음배송 사용 여부"
                    onLabel="사용"
                    offLabel="미사용"
                    disabled={disabled}
                    onChange={(next) => set('bundleShipping')(next)}
                  />
                </div>
              </div>
            )}

            <div style={actionsStyle}>
              <p style={footerHintStyle}>{footerHint}</p>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!dirty || saving || loading}
              >
                {saving ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

/** 정상 — 값이 모두 채워진 배송 정책(조건부 무료 · 변경 없음 → 저장 버튼 비활성) */
export const Default: Story = {
  render: () => <ShippingPolicyScreen variant="default" />,
};

/** 로딩 — 첫 조회에서 문서 미도착: 카드 본문 스켈레톤 4줄(STATE-01) */
export const Loading: Story = {
  render: () => <ShippingPolicyScreen variant="loading" />,
};

/** 편집됨 — 변경 있음 → 저장 버튼 활성 + '저장하지 않은 변경 사항이 있습니다.' */
export const Edited: Story = {
  render: () => <ShippingPolicyScreen variant="edited" />,
};

/** 저장 중 — 폼 잠금 + 저장 버튼 '저장 중…' + 안내 '저장하는 중입니다…' */
export const Saving: Story = {
  render: () => <ShippingPolicyScreen variant="saving" />,
};

/** 검증 오류 — 택배사·기본 배송비·무료배송 기준 누락에 인라인 오류(실화면 zod 미러) + 상단 danger 배너 */
export const ValidationError: Story = {
  render: () => <ShippingPolicyScreen variant="validation" />,
};

/** 조회 실패 — 문서를 못 불러옴: 폼 대신 danger 배너 + 다시 시도(DocumentFormShell loadFailed) */
export const LoadError: Story = {
  render: () => <ShippingPolicyScreen variant="load-error" />,
};
