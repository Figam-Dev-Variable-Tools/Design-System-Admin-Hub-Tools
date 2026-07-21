/**
 * Design System/Templates/Users/Customer Settings — 고객 설정(회원 등급 정책) 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Users`(사용자 관리)다 — packages/ui/pages/_data/pages.ts 의 Users 그룹에
 * `['/users/settings', '고객 설정', 'Customer Settings']` 로 확정된다(경로가 이름을 담지 못해 한국어
 * 라벨의 뜻을 살린 영문명).
 *
 * 대응 실화면: apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx (라우트 /users/settings) 와
 * 그 하위 조립(TierPolicyCard · TierCriteriaCard · TierDistributionCard).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   등급 정책(승급 조건·할인율)       → Card + 로컬 제목 + HelpTip + TextField(등급별 · trailing 에 단위 원/%)
 *   등급 산정 기준(기간·강등·재계산)   → Card + FormField(help=HelpTip) + SelectField · Checkbox
 *   현재 등급 분포(읽기 전용 미리보기) → Card + Alert(info) + Table(등급×현재/예상/변화) + 요약 문구
 *   저장 툴바                         → Button(primary)
 *   저장 확인                         → ConfirmDialog(intent=update)
 *   조회 실패                         → Alert(danger) + 다시 시도 Button
 *   첫 로딩                           → Skeleton
 *
 * [검증은 모델의 몫] 실화면은 승급 조건 단조 증가·할인율 범위를 validation.ts 가 강제하고, 화면은
 * 판정 결과(오류/경고)만 표시한다. 여기서는 그 판정을 스토리 로컬 순수 함수로 미러한다(신규 DS 아님).
 *
 * [DS 갭 메모] 실화면 등급 정책은 승급 조건/할인율을 열로 가진 <table> 이고 각 셀은 라벨 없는 raw
 * <input> 이다(라벨은 행 헤더가 대신). DS 텍스트 입력(TextField)은 자기 라벨을 소유하므로, 등급마다
 * 라벨을 갖는 필드 그리드로 갈음했다 — 담는 정보(등급·승급 조건·할인율·단위·오류)는 모두 실린다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  FormField,
  HelpTip,
  SelectField,
  Skeleton,
  Table,
  TextField,
  cssVar,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Users/Customer Settings',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ────────────────────────────────────────────────────────────────────────────
 * 도메인 모델 (실화면 types.ts · distribution.ts 를 화면이 쓰는 만큼 인라인)
 * ──────────────────────────────────────────────────────────────────────────── */

type MemberTier = 'normal' | 'vip' | 'vvip';
const TIER_ORDER: readonly MemberTier[] = ['normal', 'vip', 'vvip'];
const TIER_LABEL: Record<MemberTier, string> = { normal: '일반회원', vip: 'VIP', vvip: 'VVIP' };
const BASE_TIER: MemberTier = 'normal';
const DISCOUNT_MAX = 100;

const rankOf = (tier: MemberTier): number => TIER_ORDER.indexOf(tier);

type AggregationPeriod = 'all' | 'last-12m' | 'last-6m';
const PERIOD_OPTIONS: readonly { readonly id: AggregationPeriod; readonly label: string }[] = [
  { id: 'all', label: '전체 기간' },
  { id: 'last-12m', label: '최근 12개월' },
  { id: 'last-6m', label: '최근 6개월' },
];

type RecalcTrigger = 'order-completed' | 'daily' | 'monthly';
const RECALC_OPTIONS: readonly { readonly id: RecalcTrigger; readonly label: string }[] = [
  { id: 'order-completed', label: '주문 완료 시' },
  { id: 'daily', label: '매일 자정' },
  { id: 'monthly', label: '매월 1일' },
];

interface DraftRow {
  readonly threshold: string;
  readonly discount: string;
}
type DraftRows = Record<MemberTier, DraftRow>;
interface PolicyDraft {
  readonly rows: DraftRows;
  readonly period: AggregationPeriod;
  readonly allowDemotion: boolean;
  readonly recalcTrigger: RecalcTrigger;
}

const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const formatNumber = (value: number): string => KO_NUMBER.format(value);
const formatSigned = (value: number): string =>
  value === 0 ? '0' : `${value > 0 ? '+' : '−'}${KO_NUMBER.format(Math.abs(value))}`;

const sanitizeDigits = (raw: string): string => raw.replace(/\D/g, '');
const withThousands = (value: number): string => KO_NUMBER.format(value);

/** '1,000,000'/'1000000' → 1000000. 정수가 아니거나 비었으면 null */
function parseAmount(raw: string): number | null {
  const compact = raw.replace(/,/g, '').trim();
  if (compact === '' || !/^\d+$/.test(compact)) return null;
  const value = Number(compact);
  return Number.isSafeInteger(value) ? value : null;
}

/** '3' → 3. 0~100 정수가 아니면 null */
function parsePercent(raw: string): number | null {
  const compact = raw.trim();
  if (compact === '' || !/^\d+$/.test(compact)) return null;
  const value = Number(compact);
  return Number.isSafeInteger(value) && value >= 0 && value <= DISCOUNT_MAX ? value : null;
}

/* ── 검증 (실화면 validation.ts 규칙 미러 — 저장을 막는 error 만 다룬다) ─────────── */

type FieldId = `${MemberTier}-threshold` | `${MemberTier}-discount`;
interface Issue {
  readonly target: FieldId;
  readonly message: string;
}

interface Rules {
  readonly threshold: number;
  readonly discountPercent: number;
}
type TierRules = Record<MemberTier, Rules>;

interface Validation {
  readonly rules: TierRules | null;
  readonly issues: readonly Issue[];
}

/**
 * 초안 검증 — 할인율 범위 · 승급 조건 정수 · 등급 간 단조 증가.
 * error 가 하나라도 있으면 rules 는 null(저장 불가).
 */
function validateDraft(draft: PolicyDraft): Validation {
  const issues: Issue[] = [];
  const parsed: Record<MemberTier, { threshold: number | null; discount: number | null }> = {
    normal: { threshold: 0, discount: parsePercent(draft.rows.normal.discount) },
    vip: {
      threshold: parseAmount(draft.rows.vip.threshold),
      discount: parsePercent(draft.rows.vip.discount),
    },
    vvip: {
      threshold: parseAmount(draft.rows.vvip.threshold),
      discount: parsePercent(draft.rows.vvip.discount),
    },
  };

  for (const tier of TIER_ORDER) {
    if (tier !== BASE_TIER && parsed[tier].threshold === null) {
      issues.push({ target: `${tier}-threshold`, message: '0 이상의 정수를 입력하세요.' });
    }
    if (parsed[tier].discount === null) {
      issues.push({
        target: `${tier}-discount`,
        message: `할인율은 0~${String(DISCOUNT_MAX)} 사이 정수여야 합니다.`,
      });
    }
  }

  // 단조 증가 — 낮은 등급의 승급 조건이 높은 등급보다 크면 안 된다
  const vip = parsed.vip.threshold;
  const vvip = parsed.vvip.threshold;
  if (vip !== null && vvip !== null && vvip <= vip) {
    issues.push({
      target: 'vvip-threshold',
      message: 'VVIP 승급 조건은 VIP 조건보다 커야 합니다.',
    });
  }

  if (issues.length > 0) return { rules: null, issues };

  return {
    rules: {
      normal: { threshold: 0, discountPercent: parsed.normal.discount ?? 0 },
      vip: { threshold: vip ?? 0, discountPercent: parsed.vip.discount ?? 0 },
      vvip: { threshold: vvip ?? 0, discountPercent: parsed.vvip.discount ?? 0 },
    },
    issues: [],
  };
}

/* ── 분포 계산 (실화면 distribution.ts 미러) ─────────────────────────────────── */

interface DemoMember {
  readonly tier: MemberTier;
  readonly totalPurchase: number;
}

/** 회원 표본 — 등급 분포 미리보기 계산 근거(shared/fixtures/members 축약) */
const MEMBERS: readonly DemoMember[] = [
  { tier: 'normal', totalPurchase: 98000 },
  { tier: 'normal', totalPurchase: 210000 },
  { tier: 'normal', totalPurchase: 452000 },
  { tier: 'normal', totalPurchase: 640000 },
  { tier: 'vip', totalPurchase: 1284000 },
  { tier: 'vip', totalPurchase: 1740000 },
  { tier: 'vip', totalPurchase: 2740000 },
  { tier: 'vip', totalPurchase: 3120000 },
  { tier: 'vvip', totalPurchase: 5410000 },
  { tier: 'vvip', totalPurchase: 8730000 },
  { tier: 'vvip', totalPurchase: 11200000 },
  { tier: 'normal', totalPurchase: 4300000 },
];

function tierForAmount(rules: TierRules, amount: number): MemberTier {
  let matched: MemberTier = 'normal';
  for (const tier of TIER_ORDER) if (amount >= rules[tier].threshold) matched = tier;
  return matched;
}

interface DistributionRow {
  readonly tier: MemberTier;
  readonly current: number;
  readonly projected: number;
  readonly delta: number;
}
interface Distribution {
  readonly rows: readonly DistributionRow[];
  readonly total: number;
  readonly promoted: number;
  readonly demoted: number;
}

function computeDistribution(rules: TierRules, allowDemotion: boolean): Distribution {
  const current: Record<MemberTier, number> = { normal: 0, vip: 0, vvip: 0 };
  const projected: Record<MemberTier, number> = { normal: 0, vip: 0, vvip: 0 };
  let promoted = 0;
  let demoted = 0;

  for (const member of MEMBERS) {
    const computed = tierForAmount(rules, member.totalPurchase);
    const next = allowDemotion || rankOf(computed) >= rankOf(member.tier) ? computed : member.tier;
    current[member.tier] += 1;
    projected[next] += 1;
    const diff = rankOf(next) - rankOf(member.tier);
    if (diff > 0) promoted += 1;
    else if (diff < 0) demoted += 1;
  }

  return {
    rows: TIER_ORDER.map((tier) => ({
      tier,
      current: current[tier],
      projected: projected[tier],
      delta: projected[tier] - current[tier],
    })),
    total: MEMBERS.length,
    promoted,
    demoted,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 스타일 (토큰·rem 만)
 * ──────────────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
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
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const tierRowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const tierRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(calc(${cssVar('space.6')} * 3), max-content) minmax(0, 1fr) minmax(0, 1fr)`,
  gap: cssVar('space.3'),
  alignItems: 'start',
};

const tierNameStyle: CSSProperties = {
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  color: cssVar('color.text.default'),
  paddingTop: cssVar('space.2'),
};

const summaryListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const strongStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  fontVariantNumeric: 'tabular-nums',
};

const footerStyle: CSSProperties = {
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

const skeletonStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 1 — 등급 정책
 * ──────────────────────────────────────────────────────────────────────────── */

const numberUnit = (unit: string): ReactNode => <span style={hintStyle}>{unit}</span>;

function TierPolicyCard({
  rows,
  issues,
  showErrors,
  disabled,
  onThresholdChange,
  onThresholdBlur,
  onDiscountChange,
}: {
  rows: DraftRows;
  issues: readonly Issue[];
  showErrors: boolean;
  disabled: boolean;
  onThresholdChange: (tier: MemberTier, raw: string) => void;
  onThresholdBlur: (tier: MemberTier) => void;
  onDiscountChange: (tier: MemberTier, raw: string) => void;
}) {
  const titleId = useId();
  const errorOf = (target: FieldId): string | undefined => {
    if (!showErrors) return undefined;
    return issues.find((issue) => issue.target === target)?.message;
  };

  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          등급 정책
          <HelpTip label="등급 정책 설명">
            누적 구매금액이 승급 조건을 넘으면 해당 등급이 됩니다. 할인율은 그 등급의 회원이 주문할
            때 적용됩니다. 일반회원은 기본 등급이라 승급 조건이 없습니다(항상 0원).
          </HelpTip>
        </h2>

        <div style={tierRowsStyle}>
          {TIER_ORDER.map((tier) => {
            const row = rows[tier];
            const isBase = tier === BASE_TIER;
            const thresholdError = errorOf(`${tier}-threshold`);
            const discountError = errorOf(`${tier}-discount`);
            return (
              <div key={tier} style={tierRowStyle}>
                <span style={tierNameStyle}>
                  {TIER_LABEL[tier]}
                  {isBase ? ' (기본 등급)' : ''}
                </span>

                <TextField
                  id={`${tier}-threshold`}
                  label="승급 조건 (누적 구매금액)"
                  value={isBase ? '0' : row.threshold}
                  disabled={disabled || isBase}
                  inputMode="numeric"
                  placeholder="0"
                  trailing={numberUnit('원 이상')}
                  {...(thresholdError !== undefined ? { error: thresholdError } : {})}
                  onChange={(event) => onThresholdChange(tier, event.target.value)}
                  onBlur={() => onThresholdBlur(tier)}
                />

                <TextField
                  id={`${tier}-discount`}
                  label="할인율"
                  value={row.discount}
                  disabled={disabled}
                  inputMode="numeric"
                  placeholder="0"
                  trailing={numberUnit('%')}
                  {...(discountError !== undefined ? { error: discountError } : {})}
                  onChange={(event) => onDiscountChange(tier, event.target.value)}
                />
              </div>
            );
          })}
        </div>

        <p style={hintStyle}>
          일반회원은 기본 등급이라 승급 조건을 수정할 수 없습니다 — 가입 직후의 모든 회원이 여기에
          속합니다.
        </p>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 2 — 등급 산정 기준
 * ──────────────────────────────────────────────────────────────────────────── */

const criteriaBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

function TierCriteriaCard({
  period,
  allowDemotion,
  recalcTrigger,
  disabled,
  onPeriodChange,
  onAllowDemotionChange,
  onRecalcTriggerChange,
}: {
  period: AggregationPeriod;
  allowDemotion: boolean;
  recalcTrigger: RecalcTrigger;
  disabled: boolean;
  onPeriodChange: (value: AggregationPeriod) => void;
  onAllowDemotionChange: (value: boolean) => void;
  onRecalcTriggerChange: (value: RecalcTrigger) => void;
}) {
  const titleId = useId();
  const periodId = useId();
  const recalcId = useId();

  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          등급 산정 기준
        </h2>

        <div style={criteriaBodyStyle}>
          <FormField
            htmlFor={periodId}
            label="집계 기간"
            hint="누적 구매금액을 합산할 구간입니다."
            help={
              <HelpTip label="집계 기간 설명">
                승급 조건과 비교할 누적 구매금액을 어느 구간에서 합산할지 정합니다. '최근 12개월'을
                고르면 그보다 오래된 주문은 누적에서 빠집니다.
              </HelpTip>
            }
          >
            <SelectField
              id={periodId}
              value={period}
              disabled={disabled}
              onChange={(event) => {
                const next = PERIOD_OPTIONS.find((option) => option.id === event.target.value);
                onPeriodChange(next?.id ?? 'all');
              }}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </FormField>

          <div>
            <div style={checkboxRowStyle}>
              <Checkbox
                id="allow-demotion"
                label="강등 허용"
                checked={allowDemotion}
                disabled={disabled}
                onChange={(event) => onAllowDemotionChange(event.target.checked)}
              />
              <HelpTip label="강등 허용 설명">
                켜면 집계 기간의 누적 구매금액이 승급 조건에 미달할 때 등급이 내려갑니다. 끄면 한 번
                오른 등급은 조건에 미달해도 유지됩니다. 오른쪽 '현재 등급 분포'가 이 설정을 반영해
                다시 계산됩니다.
              </HelpTip>
            </div>
            <p style={hintStyle}>
              {allowDemotion
                ? '조건에 미달하면 등급이 내려갑니다.'
                : '한 번 오른 등급은 조건에 미달해도 유지됩니다.'}
            </p>
          </div>

          <FormField
            htmlFor={recalcId}
            label="재계산 시점"
            hint="등급을 다시 산정하는 시점입니다."
            help={
              <HelpTip label="재계산 시점 설명">
                '주문 완료 시'는 결제가 확정될 때마다 그 회원만 다시 계산하고, '매일 자정'·'매월
                1일'은 전체 회원을 한 번에 다시 계산합니다.
              </HelpTip>
            }
          >
            <SelectField
              id={recalcId}
              value={recalcTrigger}
              disabled={disabled}
              onChange={(event) => {
                const next = RECALC_OPTIONS.find((option) => option.id === event.target.value);
                onRecalcTriggerChange(next?.id ?? 'order-completed');
              }}
            >
              {RECALC_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </FormField>
        </div>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 3 — 현재 등급 분포 (읽기 전용 미리보기)
 * ──────────────────────────────────────────────────────────────────────────── */

const DISTRIBUTION_COLUMNS: TableProps['columns'] = [
  { id: 'tier', header: '등급', nowrap: true },
  { id: 'current', header: '현재', align: 'end' },
  { id: 'projected', header: '저장 후 (예상)', align: 'end' },
  { id: 'delta', header: '변화', align: 'end' },
];

function TierDistributionCard({
  distribution,
  allowDemotion,
}: {
  distribution: Distribution | null;
  allowDemotion: boolean;
}) {
  const titleId = useId();

  const rows: TableProps['rows'] =
    distribution === null
      ? []
      : distribution.rows.map((row) => ({
          id: row.tier,
          cells: [
            TIER_LABEL[row.tier],
            `${formatNumber(row.current)}명`,
            `${formatNumber(row.projected)}명`,
            row.delta === 0 ? '변화 없음' : `${formatSigned(row.delta)}명`,
          ] as ReactNode[],
        }));

  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          현재 등급 분포
        </h2>

        <Alert tone="info">
          아직 저장되지 않은 미리보기입니다. 아래 숫자는 지금 입력한 정책을 적용했을 때의
          예상값이며, 저장하기 전에는 회원 등급이 바뀌지 않습니다.
        </Alert>

        {distribution === null ? (
          <p style={hintStyle}>
            승급 조건 또는 할인율 값이 올바르지 않아 미리보기를 계산할 수 없습니다. 왼쪽 표의
            입력값을 확인해 주세요.
          </p>
        ) : (
          <>
            <Table
              caption={`전체 회원 ${formatNumber(distribution.total)}명의 등급 분포 — 현재 인원과 이 정책을 저장했을 때의 예상 인원, 그리고 변화량`}
              columns={DISTRIBUTION_COLUMNS}
              rows={rows}
            />

            <ul style={summaryListStyle} aria-live="polite">
              <li>
                <span style={strongStyle}>{`승급 ${formatNumber(distribution.promoted)}명`}</span>
                {' · '}
                <span style={strongStyle}>{`강등 ${formatNumber(distribution.demoted)}명`}</span>
                {` / 전체 ${formatNumber(distribution.total)}명`}
              </li>
            </ul>

            <p style={hintStyle}>
              {allowDemotion
                ? '강등 허용이 켜져 있어, 조건에 미달하는 회원은 등급이 내려간 것으로 계산했습니다.'
                : '강등 허용이 꺼져 있어, 조건에 미달해도 현재 등급을 유지하는 것으로 계산했습니다.'}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 화면 조립 (제어 상태는 이 Capitalized 컴포넌트가 소유)
 * ──────────────────────────────────────────────────────────────────────────── */

const INITIAL_DRAFT: PolicyDraft = {
  rows: {
    normal: { threshold: '0', discount: '0' },
    vip: { threshold: '1,000,000', discount: '3' },
    vvip: { threshold: '5,000,000', discount: '7' },
  },
  period: 'all',
  allowDemotion: false,
  recalcTrigger: 'order-completed',
};

interface ScreenProps {
  readonly loading?: boolean;
  readonly saving?: boolean;
  readonly loadFailed?: boolean;
  readonly initialDirty?: boolean;
  readonly confirming?: boolean;
}

function CustomerSettingsScreen({
  loading = false,
  saving = false,
  loadFailed = false,
  initialDirty = false,
  confirming = false,
}: ScreenProps) {
  const [draft, setDraft] = useState<PolicyDraft>(INITIAL_DRAFT);
  const [attempted, setAttempted] = useState(false);
  const [dirty, setDirty] = useState(initialDirty);
  const [confirmingSave, setConfirmingSave] = useState(confirming);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const distribution = useMemo(
    () =>
      validation.rules === null ? null : computeDistribution(validation.rules, draft.allowDemotion),
    [validation, draft.allowDemotion],
  );

  const patchRow = (tier: MemberTier, patch: Partial<DraftRow>): void => {
    setDraft((prev) => ({
      ...prev,
      rows: { ...prev.rows, [tier]: { ...prev.rows[tier], ...patch } },
    }));
    setDirty(true);
  };

  const onThresholdBlur = (tier: MemberTier): void => {
    setDraft((prev) => {
      const parsed = parseAmount(prev.rows[tier].threshold);
      const threshold = parsed === null ? prev.rows[tier].threshold.trim() : withThousands(parsed);
      return { ...prev, rows: { ...prev.rows, [tier]: { ...prev.rows[tier], threshold } } };
    });
  };

  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>등급 정책을 불러오지 못했습니다.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={skeletonStackStyle} aria-busy="true" aria-live="polite">
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <span style={footerHintStyle}>등급 정책을 불러오는 중입니다…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <div style={columnStyle}>
          <TierPolicyCard
            rows={draft.rows}
            issues={validation.issues}
            showErrors={attempted}
            disabled={saving}
            onThresholdChange={(tier, raw) => patchRow(tier, { threshold: sanitizeDigits(raw) })}
            onThresholdBlur={onThresholdBlur}
            onDiscountChange={(tier, raw) => patchRow(tier, { discount: sanitizeDigits(raw) })}
          />

          <TierCriteriaCard
            period={draft.period}
            allowDemotion={draft.allowDemotion}
            recalcTrigger={draft.recalcTrigger}
            disabled={saving}
            onPeriodChange={(value) => {
              setDraft((prev) => ({ ...prev, period: value }));
              setDirty(true);
            }}
            onAllowDemotionChange={(value) => {
              setDraft((prev) => ({ ...prev, allowDemotion: value }));
              setDirty(true);
            }}
            onRecalcTriggerChange={(value) => {
              setDraft((prev) => ({ ...prev, recalcTrigger: value }));
              setDirty(true);
            }}
          />
        </div>

        <div style={columnStyle}>
          <TierDistributionCard distribution={distribution} allowDemotion={draft.allowDemotion} />
        </div>
      </div>

      <div style={footerStyle}>
        <p style={footerHintStyle}>
          {saving
            ? '저장하는 중입니다…'
            : dirty
              ? '저장하지 않은 변경 사항이 있습니다.'
              : '변경 사항이 없습니다.'}
        </p>
        <Button
          variant="primary"
          disabled={!dirty || saving}
          onClick={() => {
            setAttempted(true);
            if (validation.rules === null) return;
            setConfirmingSave(true);
          }}
        >
          {saving ? '저장 중…' : '저장'}
        </Button>
      </div>

      {confirmingSave && (
        <ConfirmDialog
          intent="update"
          title="등급 정책 저장"
          message="등급 정책을 저장하면 이후 등급 산정부터 새 기준이 적용됩니다. 저장할까요?"
          busy={saving}
          onConfirm={() => {
            setConfirmingSave(false);
            setDirty(false);
          }}
          onCancel={() => setConfirmingSave(false)}
        />
      )}
    </div>
  );
}

/** 정상: 정책이 채워진 기본 상태(변경 없음 · 미리보기 계산됨) */
export const Default: Story = {
  render: () => <CustomerSettingsScreen />,
};

/** 최초 로드: 스켈레톤(첫 조회에서만 · STATE-01) */
export const Loading: Story = {
  render: () => <CustomerSettingsScreen loading />,
};

/** 편집됨: 변경 있음 → 저장 버튼 활성 + '저장하지 않은 변경 사항이 있습니다' */
export const Edited: Story = {
  render: () => <CustomerSettingsScreen initialDirty />,
};

/** 저장 중: 폼 잠금 + 저장 버튼 '저장 중…' */
export const Saving: Story = {
  render: () => <CustomerSettingsScreen saving initialDirty />,
};

/** 저장 확인: 정책 변경은 전 회원에 영향 → intent=update 확인 모달 */
export const SaveConfirm: Story = {
  render: () => <CustomerSettingsScreen initialDirty confirming />,
};

/** 조회 실패: 폼 대신 danger 배너 + 다시 시도 (STATE-02) */
export const LoadFailed: Story = {
  render: () => <CustomerSettingsScreen loadFailed />,
};
