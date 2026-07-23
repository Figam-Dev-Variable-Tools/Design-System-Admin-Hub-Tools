/**
 * Design System/Templates/Products/Points Policy — 적립금 정책 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Products`(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 GROUPS 에서
 * `['상품 관리', 'Products', '/products', …]` · 화면 `['/products/points', '적립금', 'Points']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/points/PointsPolicyPage.tsx (라우트 /products/points) 와
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
 *   적립 기준(FormField+SelectField) → FormField + SelectField (라벨·필수·힌트는 FormField 가 소유)
 *   6개 숫자 필드(FormField+input)   → TextField (라벨에 * 로 필수 표식 · 인라인 오류 자체 소유) + 힌트 <p>
 *   첫 조회 로딩(Skeleton)          → Skeleton 4줄
 *   조회 실패                        → Alert(danger) + 다시 시도 Button
 *   저장 툴바(footer 힌트 + 저장)     → 토큰 <p> + Button(primary)
 *
 * [DS 갭 메모] 실화면은 FormField 로 숫자 입력을 감싸(라벨·필수 표식·힌트·오류를 한 껍데기로) raw <input>
 * 을 넣는다. DS 에는 FormField 안에 넣을 '라벨 없는 입력' 원자가 없어(TextField 는 라벨을 자체 소유)
 * TextField 로 갈음했다 — 필수 표식은 라벨 끝의 * 로, 힌트는 필드 아래 <p> 로 옮겨 담는 정보를 보존한다
 * (Admins/Admin Form 선례). 적립 기준 셀렉트만 FormField+SelectField 로 실화면과 같게 둔다.
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
  Skeleton,
  SelectField,
  TextField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Points Policy',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 선택지·기본값 (실화면 types.ts / validation.ts 미러) ───────────────────────────────────── */

/** 적립 기준 — 결제금액/주문금액 (실화면 EARN_BASELINE_OPTIONS) */
const EARN_BASELINE_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'payment', label: '실결제금액' },
  { id: 'order', label: '주문금액(할인 전)' },
];

/** 적립금 정책 값 — 실화면 PointsPolicyValues 미러(전부 폼 문자열) */
interface PointsPolicyValues {
  earnRate: string;
  earnBaseline: string;
  signupBonus: string;
  minUseAmount: string;
  useUnit: string;
  maxUseRate: string;
  expireMonths: string;
}

/** 화면 진입 시 기본값(실화면 DEFAULT_POINTS_POLICY 픽스처) */
const DEFAULT_POINTS_POLICY: PointsPolicyValues = {
  earnRate: '1',
  earnBaseline: 'payment',
  signupBonus: '3000',
  minUseAmount: '5000',
  useUnit: '100',
  maxUseRate: '50',
  expireMonths: '12',
};

type NumericKey = Exclude<keyof PointsPolicyValues, 'earnBaseline'>;

interface NumberFieldSpec {
  readonly key: NumericKey;
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly hint?: string;
}

/** 6개 숫자 필드 — 실화면 NUMBER_FIELDS 미러(순서·라벨·힌트 그대로) */
const NUMBER_FIELDS: readonly NumberFieldSpec[] = [
  {
    key: 'earnRate',
    id: 'pts-earn-rate',
    label: '기본 적립률 (%)',
    placeholder: '예: 1',
    hint: '새 상품의 초기 적립률이에요. 상품별 적립 설정이 이 값을 덮어써요.',
  },
  { key: 'signupBonus', id: 'pts-signup', label: '회원가입 적립금 (원)', placeholder: '예: 3000' },
  {
    key: 'minUseAmount',
    id: 'pts-min-use',
    label: '최소 사용 포인트 (P)',
    placeholder: '예: 5000',
  },
  { key: 'useUnit', id: 'pts-use-unit', label: '사용 단위 (P)', placeholder: '예: 100' },
  {
    key: 'maxUseRate',
    id: 'pts-max-rate',
    label: '1회 사용 한도 (%)',
    placeholder: '예: 50',
    hint: '주문금액 대비 사용 상한',
  },
  { key: 'expireMonths', id: 'pts-expire', label: '유효기간 (개월)', placeholder: '예: 12' },
];

/** 검증 실패 스냅샷 — 실화면 zod(validation.ts)가 낼 메시지를 대표값으로 인라인 */
const INVALID_VALUES: PointsPolicyValues = {
  ...DEFAULT_POINTS_POLICY,
  earnRate: '',
  useUnit: '0',
  maxUseRate: '150',
};

const FIELD_ERRORS: Partial<Record<NumericKey, string>> = {
  earnRate: '적립률을 입력하세요.',
  useUnit: '사용 단위는 1 이상의 정수로 입력하세요.',
  maxUseRate: '1회 사용 한도는 0% 이상 100% 이하로 입력하세요.',
};

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
const fieldCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
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

function PointsPolicyScreen({ variant }: { variant: Variant }) {
  const loading = variant === 'loading';
  const loadFailed = variant === 'load-error';
  const saving = variant === 'saving';
  const showErrors = variant === 'validation';
  const dirty = variant === 'edited' || variant === 'saving' || variant === 'validation';
  const disabled = saving || loading;

  const [values, setValues] = useState<PointsPolicyValues>(() =>
    showErrors ? INVALID_VALUES : DEFAULT_POINTS_POLICY,
  );

  const set =
    <K extends keyof PointsPolicyValues>(key: K) =>
    (value: PointsPolicyValues[K]): void => {
      setValues((prev) => ({ ...prev, [key]: value }));
    };

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
        별표(*) 항목은 필수예요. 적립률은 상품별로 설정하며, 여기서는 새 상품의 기본 적립률과 적립금
        사용·소멸 규칙을 정해요.
      </p>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>적립금 정책</h2>

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
                <FormField htmlFor="pts-baseline" label="적립 기준" required>
                  <SelectField
                    id="pts-baseline"
                    value={values.earnBaseline}
                    disabled={disabled}
                    onChange={(event) => set('earnBaseline')(event.target.value)}
                  >
                    {EARN_BASELINE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                <div style={formRowStyle}>
                  {NUMBER_FIELDS.map((spec) => {
                    const fieldError = showErrors ? (FIELD_ERRORS[spec.key] ?? '') : '';
                    return (
                      <div key={spec.key} style={fieldCellStyle}>
                        <TextField
                          id={spec.id}
                          label={`${spec.label} *`}
                          value={values[spec.key]}
                          inputMode="numeric"
                          required
                          disabled={disabled}
                          placeholder={spec.placeholder}
                          error={fieldError}
                          onChange={(event) => set(spec.key)(event.target.value)}
                        />
                        {spec.hint !== undefined && fieldError === '' && (
                          <p style={hintStyle}>{spec.hint}</p>
                        )}
                      </div>
                    );
                  })}
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

/** 정상 — 값이 모두 채워진 적립금 정책(변경 없음 → 저장 버튼 비활성) */
export const Default: Story = {
  render: () => <PointsPolicyScreen variant="default" />,
};

/** 로딩 — 첫 조회에서 문서 미도착: 카드 본문 스켈레톤 4줄(STATE-01) */
export const Loading: Story = {
  render: () => <PointsPolicyScreen variant="loading" />,
};

/** 편집됨 — 변경 있음 → 저장 버튼 활성 + '저장하지 않은 변경 사항이 있습니다.' */
export const Edited: Story = {
  render: () => <PointsPolicyScreen variant="edited" />,
};

/** 저장 중 — 폼 잠금 + 저장 버튼 '저장 중…' + 안내 '저장하는 중입니다…' */
export const Saving: Story = {
  render: () => <PointsPolicyScreen variant="saving" />,
};

/** 검증 오류 — 필수 누락·범위 위반 필드에 인라인 오류(실화면 zod 메시지 미러) + 상단 danger 배너 */
export const ValidationError: Story = {
  render: () => <PointsPolicyScreen variant="validation" />,
};

/** 조회 실패 — 문서를 못 불러옴: 폼 대신 danger 배너 + 다시 시도(DocumentFormShell loadFailed) */
export const LoadError: Story = {
  render: () => <PointsPolicyScreen variant="load-error" />,
};
