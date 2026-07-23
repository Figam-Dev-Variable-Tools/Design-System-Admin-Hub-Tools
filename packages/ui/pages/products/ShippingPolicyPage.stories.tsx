/**
 * Design System/Templates/Products/Shipping Policy — 배송 정책 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Products`(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 GROUPS 에서
 * `['상품 관리', 'Products', '/products', …]` · 화면 `['/products/shipping', '배송', 'Shipping']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/shipping/ShippingPolicyPage.tsx (라우트 /products/shipping) ·
 * 그 하위 조립(components/CarrierSection.tsx) · 골격(shared/crud/DocumentFormShell — 단일 문서형 폼).
 *
 * [화면에 표가 하나 붙었다 — 택배사] 정책 문서 아래에 택배사 CRUD 섹션이 선다. 행이 서넛인 참조
 * 테이블이라 자기 메뉴 잎을 가질 무게가 아니고, 배송비를 정하러 온 운영자와 택배사를 등록하러 온
 * 운영자는 같은 사람이다 — 메뉴를 하나 더 만들면 그 하나가 둘로 쪼개진다.
 *
 * [택배사가 자유 입력에서 select 로 바뀌었다 — 이 화면에서 가장 중요한 변화] 예전 정책 문서의
 * 택배사는 텍스트 한 줄이라 '대한통운' 과 'CJ대한통운' 이 공존할 수 있었고, 그러면 **추적 URL 을
 * 만들 키가 없다**. 이제는 등록된 목록에서 고른 **id** 를 들고, 각 택배사가 자기 추적 주소를 갖는다.
 * 이 값은 배송 처리 화면에서 송장을 붙일 때의 기본 선택이 된다.
 *
 * [삭제 차단 — 사용 여부를 끄는 것이 정답이다] 그 택배사로 나간 배송 건이 1건이라도 있으면 지울 수
 * 없다. 지우면 그 배송 건은 어느 택배로 나갔는지 영영 말할 수 없게 된다. 사유는 버튼의 접근성
 * 이름에 함께 싣는다 — 왜 못 누르는지가 버튼 옆에 있어야 한다.
 *
 * [끈 택배사도 지금 값이면 선택지에 남긴다] 빼 버리면 select 가 조용히 첫 항목으로 튀어, 운영자가
 * 건드리지도 않은 정책이 저장 시 바뀐다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 공용 DocumentFormShell 은 DS 로 노출돼 있지 않으므로
 * 그 골격(안내문 · 카드 + 제목 · serverError 배너 · 저장 툴바)을 토큰만 쓴 로컬 레이아웃으로 재현한다.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   안내문(description)             → 토큰 <p>(muted)
 *   폼 카드 + CardTitle             → Card + 토큰 <h2>(DS Card 는 표면만 소유)
 *   저장 실패 배너(serverError)     → Alert(danger)
 *   기본 택배사(FormField+SelectField) → FormField + SelectField (등록된 목록에서만 고른다)
 *   배송비 필드(FormField+input)     → TextField (라벨에 * 로 필수 표식 · 인라인 오류 자체 소유)
 *   배송비 정책(FormField+SelectField)  → FormField + SelectField (실화면과 같게)
 *   묶음배송(fieldLabel + ToggleSwitch) → 토큰 <span> 라벨 + ToggleSwitch(사용/미사용)
 *   택배사 목록(CarrierSection)      → Card + Table + StatusBadge(사용/미사용) + IconButton ×2
 *   택배사 추가                      → Button(secondary) + Icon(plus-circle)
 *   삭제 차단 사유                   → IconButton disabled + 접근성 이름에 사유를 싣는다
 *   첫 조회 로딩(Skeleton)          → Skeleton 4줄
 *   조회 실패                        → Alert(danger) + 다시 시도 Button
 *   저장 툴바(footer 힌트 + 저장)     → 토큰 <p> + Button(primary)
 *
 * [DS 갭 메모] 실화면은 FormField 로 숫자 입력을 감싸 raw <input> 을 넣는다. DS 에는 FormField
 * 안에 넣을 '라벨 없는 입력' 원자가 없어(TextField 는 라벨을 자체 소유) TextField 로 갈음했다 — 필수
 * 표식은 라벨 끝의 * 로, 힌트는 필드 아래 <p> 로 옮겨 담는 정보를 보존한다(Admins/Admin Form 선례).
 * 택배사·배송비 정책 셀렉트만 FormField+SelectField 로 실화면과 같게 둔다.
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
  formRowStyle,
  Icon,
  IconButton,
  Skeleton,
  SelectField,
  StatusBadge,
  Table,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

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

/**
 * 배송 정책 값 — 실화면 ShippingPolicyValues 미러(요금은 폼 문자열).
 *
 * `carrier`(자유 텍스트)가 **`defaultCarrierId`(등록된 택배사의 id)** 로 바뀌었다 — 이름은 사람이
 * 읽는 표기라 언제든 바뀌고, 바뀔 수 있는 값을 키로 쓰면 추적 URL 을 만들 수 없다.
 */
interface ShippingPolicyValues {
  defaultCarrierId: string;
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
  defaultCarrierId: 'car-1',
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

/* ── 택배사(실화면 shared/domain/shipment.ts · CARRIER_SEED 미러) ────────────────────────────── */

/**
 * 등록된 택배사 1곳 — 이름이 아니라 **code 가 식별자**다.
 * 표기가 바뀌어도(‘대한통운’ → ‘CJ대한통운’) 이 값은 그대로라 지난 배송 건이 자기 택배사를 잃지 않는다.
 */
interface DemoCarrier {
  readonly id: string;
  readonly name: string;
  /** 연동 키 — 영문 대문자·숫자·하이픈. 시스템이 대조하는 값이라 대소문자를 섞지 않는다 */
  readonly code: string;
  /** 추적 URL 템플릿 — `{{invoice}}` 자리에 송장번호가 들어간다. 비우면 추적 링크를 만들지 않는다 */
  readonly trackingUrlTemplate: string;
  /** 사용 여부 — 끄면 새 송장의 선택지에서 빠진다. 이미 나간 배송 건은 그대로 남는다 */
  readonly active: boolean;
  /** 이 택배사로 나간 배송 건수 — 배송 원장이 답한다(이 화면은 배송 화면을 모른다) */
  readonly usage: number;
}

/** 상호도 추적 주소도 전부 가상이다 — 진짜 조회 주소를 넣으면 실 추적이라는 거짓 인상을 준다 */
const DEMO_CARRIERS: readonly DemoCarrier[] = [
  {
    id: 'car-1',
    name: '가상택배',
    code: 'VIRTUAL',
    trackingUrlTemplate: 'https://tracking.example.com/virtual?invoice={{invoice}}',
    active: true,
    usage: 4,
  },
  {
    id: 'car-2',
    name: '한빛로지스',
    code: 'HANBIT',
    trackingUrlTemplate: 'https://tracking.example.com/hanbit?no={{invoice}}',
    active: true,
    usage: 2,
  },
  {
    id: 'car-3',
    name: '새벽퀵',
    code: 'DAWN-QUICK',
    // 추적 페이지가 없는 택배사도 있다 — 없는 링크를 그리는 것보다 안 그리는 편이 정직하다
    trackingUrlTemplate: '',
    active: true,
    usage: 0,
  },
  {
    id: 'car-4',
    name: '옛길택배',
    code: 'OLDROAD',
    trackingUrlTemplate: 'https://tracking.example.com/oldroad?invoice={{invoice}}',
    // 계약이 끝난 택배사 — 지우지 않고 끈다. 지난 배송 건이 이름을 잃지 않는다
    active: false,
    usage: 0,
  },
];

/** 삭제 버튼 옆에 서는 사용 현황 문구 */
const carrierUsageLabel = (usage: number): string =>
  usage === 0 ? '미사용' : `배송 ${usage.toLocaleString('ko-KR')}건 사용 중`;

/**
 * 택배사 삭제를 막아야 하는 이유 — 없으면 null.
 * 배송 건이 있는 택배사를 지우면 그 배송 건은 다시는 어느 택배로 나갔는지 말할 수 없게 된다.
 */
function carrierDeleteBlock(carrier: DemoCarrier): string | null {
  if (carrier.usage > 0) {
    return `'${carrier.name}' 으로 나간 배송 ${carrier.usage.toLocaleString('ko-KR')}건이 있어 삭제할 수 없어요. 사용 여부를 끄면 새 송장의 선택지에서만 빠져요.`;
  }
  return null;
}

const CARRIER_COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '택배사', nowrap: true },
  { id: 'code', header: '코드', nowrap: true },
  { id: 'tracking', header: '추적 URL' },
  { id: 'usage', header: '사용 현황', nowrap: true },
  { id: 'active', header: '사용 여부', nowrap: true },
];

/** 검증 실패 스냅샷 — 실화면 zod(validation.ts)가 낼 메시지를 대표값으로 인라인 */
const INVALID_VALUES: ShippingPolicyValues = {
  ...DEFAULT_SHIPPING_POLICY,
  defaultCarrierId: '',
  baseFee: '',
  freeThreshold: '',
};

const CARRIER_ERROR = '기본 택배사를 선택하세요.';
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

/** 한 줄에 필드 여럿 — 좁아지면 자동으로 접힌다(실화면 formRowStyle) */
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

/* ── 택배사 표 스타일 ───────────────────────────────────────────────────────────────────── */

const carrierToolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 코드는 기호가 많아 폭이 흔들린다 — 숫자 폭을 고정해 열이 춤추지 않게 한다 */
const codeStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/** 템플릿은 길다 — 한 줄로 자르고 전체는 수정 모달이 보여 준다 */
const templateStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
};

const rowActionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.1'),
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
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

  /* 끈 택배사도 **지금 값이면** 선택지에 남긴다. 빼 버리면 select 가 조용히 첫 항목으로 튀어
     운영자가 건드리지도 않은 정책이 저장 시 바뀐다. */
  const carrierOptions = DEMO_CARRIERS.filter(
    (carrier) => carrier.active || carrier.id === values.defaultCarrierId,
  );

  const footerHint = saving
    ? '저장하는 중이에요…'
    : dirty
      ? '저장하지 않은 변경 사항이 있어요.'
      : '변경 사항이 없어요.';

  // 조회 실패 — 폼 대신 재시도 배너를 그린다(실화면 DocumentFormShell loadFailed 분기)
  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorRowStyle}>
            <span>내용을 불러오지 못했어요.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        별표(*) 항목은 필수예요. 저장하면 스토어 전체 배송비 계산에 반영돼요.
      </p>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>배송 정책</h2>

            {showErrors && (
              <Alert tone="danger">입력값을 확인해 주세요. 아래 항목을 바로잡아야 저장돼요.</Alert>
            )}

            {loading ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            ) : (
              <div style={bodyStyle}>
                <div style={formRowStyle}>
                  {/* 등록된 목록에서만 고른다 — 자유 입력이면 같은 택배사가 여러 이름으로 쌓이고
                      추적 URL 을 만들 키가 사라진다. 끈 택배사도 '지금 값' 이면 선택지에 남긴다. */}
                  <FormField
                    htmlFor="ship-carrier"
                    label="기본 택배사"
                    required
                    hint="이 스토어의 대표 택배사예요. 송장 입력의 기본 선택이 돼요."
                    {...(showErrors ? { error: CARRIER_ERROR } : {})}
                  >
                    <SelectField
                      id="ship-carrier"
                      value={values.defaultCarrierId}
                      disabled={disabled || carrierOptions.length === 0}
                      isInvalid={showErrors}
                      onChange={(event) => set('defaultCarrierId')(event.target.value)}
                    >
                      {/* 목록이 비면 고를 것이 없다는 사실을 선택지 자체가 말한다 — 빈 select 는 침묵한다 */}
                      {carrierOptions.length === 0 ? (
                        <option value="">등록된 택배사가 없어요</option>
                      ) : (
                        carrierOptions.map((carrier) => (
                          <option key={carrier.id} value={carrier.id}>
                            {carrier.active ? carrier.name : `${carrier.name} (미사용)`}
                          </option>
                        ))
                      )}
                    </SelectField>
                  </FormField>

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
                  <div style={formRowStyle}>
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

                <div style={formRowStyle}>
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

      {/* 택배사 표는 폼 **밖**에 선다 — 안에 두면 <form> 안에 폼 모달의 <form> 이 겹친다.
          정책 폼과 별개의 저장소를 쓰므로 저장 버튼도 서로를 건드리지 않는다. */}
      <CarrierSection loading={loading} />
    </div>
  );
}

/* ── 택배사 목록 섹션(CarrierSection 미러) ────────────────────────────────────────────────── */

function CarrierSection({ loading }: { readonly loading: boolean }) {
  const rows: TableProps['rows'] = DEMO_CARRIERS.map((carrier) => {
    const blockReason = carrierDeleteBlock(carrier);
    return {
      id: carrier.id,
      cells: [
        <span key="name">{carrier.name}</span>,
        <span key="code" style={codeStyle}>
          {carrier.code}
        </span>,
        carrier.trackingUrlTemplate === '' ? (
          <span key="tracking" style={footerHintStyle}>
            추적 링크 없음
          </span>
        ) : (
          <span key="tracking" style={templateStyle} title={carrier.trackingUrlTemplate}>
            {carrier.trackingUrlTemplate}
          </span>
        ),
        <span key="usage">{carrierUsageLabel(carrier.usage)}</span>,
        <StatusBadge
          key="active"
          tone={carrier.active ? 'success' : 'neutral'}
          label={carrier.active ? '사용' : '미사용'}
        />,
      ],
      trailing: [
        <td key="actions" style={actionCellStyle}>
          <span style={rowActionsStyle}>
            <IconButton icon={<Icon name="pencil" />} label={`${carrier.name} 수정`} size="sm" />
            {/* 왜 못 누르는지를 버튼 이름에 함께 싣는다 — 비활성 버튼 옆에 이유가 있어야 한다 */}
            <IconButton
              icon={<Icon name="trash" />}
              label={
                blockReason === null ? `${carrier.name} 삭제` : `${carrier.name} — ${blockReason}`
              }
              size="sm"
              disabled={blockReason !== null}
            />
          </span>
        </td>,
      ],
    };
  });

  return (
    <Card>
      <div style={cardBodyStyle}>
        <h2 style={cardTitleStyle}>택배사</h2>

        <div style={carrierToolbarStyle}>
          <p style={footerHintStyle}>
            {loading ? '불러오는 중…' : `전체 ${String(DEMO_CARRIERS.length)}곳`}
          </p>
          <Button variant="secondary" size="md" iconLeft={<Icon name="plus-circle" />}>
            택배사 추가
          </Button>
        </div>

        <div style={tableScrollStyle}>
          <Table
            caption="택배사 목록 — 송장을 등록할 때 이 목록에서 택배사를 골라요. 배송 건이 있는 택배사는 삭제할 수 없어요."
            columns={CARRIER_COLUMNS}
            rows={rows}
            trailingHead={[
              <th key="actions" scope="col" className="tds-table__head tds-table__head--end">
                <span style={visuallyHidden}>행 액션</span>
              </th>,
            ]}
            loading={loading}
            skeletonRows={DEMO_CARRIERS.length}
            empty="등록된 택배사가 없어요. 택배사를 추가해야 송장을 붙일 수 있어요."
          />
        </div>

        <p style={footerHintStyle}>
          송장은 이 목록에 있는 택배사로만 등록돼요 — 자유 입력이면 같은 택배사가 여러 이름으로
          쌓이고 추적 링크를 만들 수 없어요. 계약이 끝난 택배사는 삭제하지 말고 사용 여부를 끄세요.
        </p>
      </div>
    </Card>
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
