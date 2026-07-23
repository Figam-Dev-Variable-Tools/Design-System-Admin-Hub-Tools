/**
 * Design System/Templates/Users/Customer Settings — 고객 설정(회원 등급 정책) 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Users`(사용자 관리)다 — packages/ui/pages/_data/pages.ts 의 Users 그룹에
 * `['/users/settings', '고객 설정', 'Customer Settings']` 로 확정된다(경로가 이름을 담지 못해 한국어
 * 라벨의 뜻을 살린 영문명).
 *
 * 대응 실화면: apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx (라우트 /users/settings) 와
 * 그 하위 조립(TierPolicyCard · TierCriteriaCard · TierDistributionCard · TierFormModal).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   등급 목록(추가/이름수정/삭제)     → Card + Button(등급 추가) + 행별 Button(ghost, 사유는 aria-label)
 *   등급 정책(승급 조건·할인율)       → TextField(등급별 · trailing 에 단위 원/%)
 *   등급 추가·이름 수정               → Modal + TextField
 *   등급 산정 기준(기간·강등·재계산)   → Card + FormField(help=HelpTip) + SelectField · Checkbox
 *   현재 등급 분포(읽기 전용 미리보기) → Card + Alert(info) + Table(등급×현재/예상/변화) + 요약 문구
 *   저장 툴바                         → Button(primary)
 *   저장 확인 / 등급 삭제 확인         → ConfirmDialog(intent=update / delete)
 *   조회 실패                         → Alert(danger) + 다시 시도 Button
 *   첫 로딩                           → Skeleton
 *
 * [잠금과 사유] 기본 제공 등급(일반회원·VIP·VVIP)은 이름 변경·삭제가 잠긴다. 실화면과 마찬가지로
 * **비활성 상태만으로 이유를 전달하지 않는다** — 버튼의 접근성 이름(aria-label)에 사유가 실린다.
 *
 * [검증은 모델의 몫] 실화면은 승급 조건 단조 증가·금액 중복 금지·할인율 범위를 validation.ts 가
 * 강제하고, 화면은 판정 결과(오류/경고)만 표시한다. 여기서는 그 판정을 스토리 로컬 순수 함수로
 * 미러한다(신규 DS 아님).
 *
 * [DS 갭 메모] 실화면 등급 정책은 <table> 이고 각 셀은 라벨 없는 raw <input> 이다(라벨은 행 헤더가
 * 대신). DS 텍스트 입력(TextField)은 자기 라벨을 소유하므로, 등급마다 라벨을 갖는 필드 그리드로
 * 갈음했다 — 담는 정보(등급·승급 조건·할인율·단위·오류·행 액션)는 모두 실린다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useMemo, useRef, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  FormField,
  HelpTip,
  Modal,
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

const BASE_TIER = 'normal';
const DISCOUNT_MAX = 100;
const TIER_LABEL_MAX = 20;

/** 기본 제공 등급의 고정 서열 — 이 순서가 뒤집히면 저장을 막는다 */
const BUILT_IN_ORDER: readonly string[] = ['normal', 'vip', 'vvip'];

/** 기본 제공 등급을 고칠 수 없는 이유 — 비활성 버튼의 접근성 이름으로 실린다 */
const SYSTEM_TIER_REASON =
  '기본 제공 등급이라 이름 변경·삭제를 할 수 없어요. 회원 목록·회원 CSV·쿠폰 발급 기준이 이 이름과 id 를 그대로 읽어요. 승급 조건과 할인율은 수정할 수 있어요.';

/** 등급 한 줄 — 기본 제공 등급과 추가한 등급이 같은 모양이다(`system` 한 칸이 잠금을 말한다) */
interface DraftRow {
  readonly id: string;
  readonly label: string;
  readonly system: boolean;
  readonly threshold: string;
  readonly discount: string;
}

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

interface PolicyDraft {
  readonly rows: readonly DraftRow[];
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

/** 기본 등급의 승급 조건은 입력과 무관하게 항상 0 이다 — 정책이 아니라 정의다 */
const amountOf = (row: DraftRow): number | null =>
  row.id === BASE_TIER ? 0 : parseAmount(row.threshold);

/* ── 이름 규칙 · 삭제 가드 (사유 문자열을 돌려준다 — boolean 이 아니다) ───────── */

function validateTierLabel(
  label: string,
  rows: readonly DraftRow[],
  ignoreTierId: string | null,
): string | null {
  const trimmed = label.trim();
  if (trimmed === '') return '등급 이름을 입력하세요.';
  if (trimmed.length > TIER_LABEL_MAX) {
    return `등급 이름은 ${String(TIER_LABEL_MAX)}자를 넘을 수 없어요.`;
  }
  const key = trimmed.toLocaleLowerCase();
  const duplicated = rows.some(
    (row) => row.id !== ignoreTierId && row.label.trim().toLocaleLowerCase() === key,
  );
  return duplicated ? '이미 같은 이름의 등급이 있어요.' : null;
}

/** null 은 '0명' 이 아니라 '확인 불가' 다 — 모르는 채로 지우게 두지 않는다(fail-closed) */
function tierDeletionBlock(row: DraftRow, memberCount: number | null): string | null {
  if (row.system) return `'${row.label}' 은(는) ${SYSTEM_TIER_REASON}`;
  if (memberCount === null) {
    return `'${row.label}' 등급을 쓰는 회원을 확인하지 못해 삭제할 수 없어요. 잠시 후 다시 시도해 주세요.`;
  }
  if (memberCount > 0) {
    return `'${row.label}' 등급을 쓰는 회원이 ${formatNumber(memberCount)}명 있어 삭제할 수 없어요. 회원 관리(/users/members)에서 이 회원들의 등급을 먼저 바꾼 뒤 다시 삭제해 주세요.`;
  }
  return null;
}

/* ── 검증 (실화면 validation.ts 규칙 미러 — 저장을 막는 error 만 다룬다) ─────────── */

interface Issue {
  readonly target: string;
  readonly message: string;
}

interface Validation {
  /** 승급 조건 오름차순으로 세운 등급 목록. error 가 하나라도 있으면 null(저장 불가) */
  readonly tiers: readonly DraftRow[] | null;
  readonly issues: readonly Issue[];
}

const labelOf = (row: DraftRow): string =>
  row.label.trim() === '' ? '이름 없는 등급' : row.label.trim();

function validateDraft(draft: PolicyDraft): Validation {
  const issues: Issue[] = [];

  for (const row of draft.rows) {
    if (amountOf(row) === null) {
      issues.push({
        target: `${row.id}-threshold`,
        message: `${labelOf(row)} 승급 조건은 0 이상의 정수(원)로 입력하세요.`,
      });
    }
    if (parsePercent(row.discount) === null) {
      issues.push({
        target: `${row.id}-discount`,
        message: `${labelOf(row)} 할인율은 0~${String(DISCOUNT_MAX)} 사이의 정수(%)로 입력하세요.`,
      });
    }
  }

  // 기본 제공 등급의 서열은 고정이다 — 일반회원 < VIP < VVIP
  for (let i = 1; i < BUILT_IN_ORDER.length; i += 1) {
    const lower = draft.rows.find((row) => row.id === BUILT_IN_ORDER[i - 1]);
    const upper = draft.rows.find((row) => row.id === BUILT_IN_ORDER[i]);
    if (lower === undefined || upper === undefined) continue;
    const lowerAmount = amountOf(lower);
    const upperAmount = amountOf(upper);
    if (lowerAmount === null || upperAmount === null || upperAmount > lowerAmount) continue;
    issues.push({
      target: `${upper.id}-threshold`,
      message: `${labelOf(upper)} 승급 조건(${withThousands(upperAmount)}원)은 ${labelOf(lower)} 승급 조건(${withThousands(lowerAmount)}원)보다 커야 해요.`,
    });
  }

  // 승급 조건이 겹치면 어느 등급이 위인지 정해지지 않는다 (서열은 금액에서 파생된다)
  const seen = new Map<number, DraftRow>();
  for (const row of draft.rows) {
    const amount = amountOf(row);
    if (amount === null) continue;
    const previous = seen.get(amount);
    if (previous === undefined) {
      seen.set(amount, row);
      continue;
    }
    issues.push({
      target: `${row.id}-threshold`,
      message: `${labelOf(row)} 승급 조건(${withThousands(amount)}원)이 ${labelOf(previous)} 과(와) 같아요. 등급마다 다른 금액이어야 어느 등급이 위인지 정해져요.`,
    });
  }

  if (issues.length > 0) return { tiers: null, issues };

  const tiers = [...draft.rows].sort((a, b) => (amountOf(a) ?? 0) - (amountOf(b) ?? 0));
  return { tiers, issues: [] };
}

/* ── 분포 계산 (실화면 distribution.ts 미러) ─────────────────────────────────── */

interface DemoMember {
  readonly tier: string;
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

/** 이 등급을 쓰는 회원 수 — 삭제 가드의 근거 */
const memberCountOf = (tierId: string): number =>
  MEMBERS.filter((member) => member.tier === tierId).length;

interface DistributionRow {
  readonly tierId: string;
  readonly label: string;
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

function computeDistribution(tiers: readonly DraftRow[], allowDemotion: boolean): Distribution {
  const rankOf = (tierId: string): number => tiers.findIndex((tier) => tier.id === tierId);
  const current = new Map<string, number>(tiers.map((tier) => [tier.id, 0]));
  const projected = new Map<string, number>(tiers.map((tier) => [tier.id, 0]));
  let promoted = 0;
  let demoted = 0;

  for (const member of MEMBERS) {
    let computed = tiers[0]?.id ?? BASE_TIER;
    for (const tier of tiers) {
      if (member.totalPurchase >= (amountOf(tier) ?? 0)) computed = tier.id;
    }
    const next = allowDemotion || rankOf(computed) >= rankOf(member.tier) ? computed : member.tier;

    current.set(member.tier, (current.get(member.tier) ?? 0) + 1);
    projected.set(next, (projected.get(next) ?? 0) + 1);

    const diff = rankOf(next) - rankOf(member.tier);
    if (diff > 0) promoted += 1;
    else if (diff < 0) demoted += 1;
  }

  return {
    rows: tiers.map((tier) => ({
      tierId: tier.id,
      label: tier.label,
      current: current.get(tier.id) ?? 0,
      projected: projected.get(tier.id) ?? 0,
      delta: (projected.get(tier.id) ?? 0) - (current.get(tier.id) ?? 0),
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

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
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
  gridTemplateColumns: `minmax(calc(${cssVar('space.6')} * 3), max-content) minmax(0, 1fr) minmax(0, 1fr) max-content`,
  gap: cssVar('space.3'),
  alignItems: 'start',
};

const tierNameStyle: CSSProperties = {
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  color: cssVar('color.text.default'),
  paddingTop: cssVar('space.2'),
};

const rowActionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.2'),
};

const modalBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
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
 * 카드 1 — 등급 정책 (추가 · 이름 수정 · 삭제 + 승급 조건/할인율)
 * ──────────────────────────────────────────────────────────────────────────── */

const numberUnit = (unit: string): ReactNode => <span style={hintStyle}>{unit}</span>;

function TierPolicyCard({
  rows,
  issues,
  showErrors,
  disabled,
  onAdd,
  onRename,
  onDelete,
  onThresholdChange,
  onThresholdBlur,
  onDiscountChange,
}: {
  rows: readonly DraftRow[];
  issues: readonly Issue[];
  showErrors: boolean;
  disabled: boolean;
  onAdd: () => void;
  onRename: (row: DraftRow) => void;
  onDelete: (row: DraftRow) => void;
  onThresholdChange: (tierId: string, raw: string) => void;
  onThresholdBlur: (tierId: string) => void;
  onDiscountChange: (tierId: string, raw: string) => void;
}) {
  const titleId = useId();
  const errorOf = (target: string): string | undefined => {
    if (!showErrors) return undefined;
    return issues.find((issue) => issue.target === target)?.message;
  };

  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <div style={cardHeaderStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            등급 정책
            <HelpTip label="등급 정책 설명">
              누적 구매금액이 승급 조건을 넘으면 해당 등급이 돼요. 할인율은 그 등급의 회원이 주문할
              때 적용돼요. 일반회원은 기본 등급이라 승급 조건이 없어요(항상 0원). 등급의 서열은 승급
              조건 금액이 정해요 — 그래서 금액은 등급마다 달라야 해요.
            </HelpTip>
          </h2>
          <Button variant="secondary" disabled={disabled} onClick={onAdd}>
            등급 추가
          </Button>
        </div>

        <div style={tierRowsStyle}>
          {rows.map((row) => {
            const isBase = row.id === BASE_TIER;
            const thresholdError = errorOf(`${row.id}-threshold`);
            const discountError = errorOf(`${row.id}-discount`);
            // 삭제를 막는 사유 — 기본 제공 등급이거나, 그 등급을 쓰는 회원이 남아 있거나
            const deleteBlock = tierDeletionBlock(row, memberCountOf(row.id));

            return (
              <div key={row.id} style={tierRowStyle}>
                <span style={tierNameStyle}>
                  {row.label}
                  {isBase ? ' (기본 등급)' : ''}
                  {row.system && !isBase ? ' (기본 제공)' : ''}
                </span>

                <TextField
                  id={`${row.id}-threshold`}
                  label="승급 조건 (누적 구매금액)"
                  value={isBase ? '0' : row.threshold}
                  disabled={disabled || isBase}
                  inputMode="numeric"
                  placeholder="0"
                  trailing={numberUnit('원 이상')}
                  {...(thresholdError !== undefined ? { error: thresholdError } : {})}
                  onChange={(event) => onThresholdChange(row.id, event.target.value)}
                  onBlur={() => onThresholdBlur(row.id)}
                />

                <TextField
                  id={`${row.id}-discount`}
                  label="할인율"
                  value={row.discount}
                  disabled={disabled}
                  inputMode="numeric"
                  placeholder="0"
                  trailing={numberUnit('%')}
                  {...(discountError !== undefined ? { error: discountError } : {})}
                  onChange={(event) => onDiscountChange(row.id, event.target.value)}
                />

                {/* 사유는 색·비활성 상태가 아니라 **접근성 이름**이 전달한다 */}
                <span style={rowActionsStyle}>
                  <Button
                    variant="ghost"
                    disabled={row.system || disabled}
                    aria-label={
                      row.system ? `${row.label} — ${SYSTEM_TIER_REASON}` : `${row.label} 이름 수정`
                    }
                    onClick={() => onRename(row)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={deleteBlock !== null || disabled}
                    aria-label={deleteBlock ?? `${row.label} 삭제`}
                    onClick={() => onDelete(row)}
                  >
                    삭제
                  </Button>
                </span>
              </div>
            );
          })}
        </div>

        <p style={hintStyle}>일반회원·VIP·VVIP 는 {SYSTEM_TIER_REASON}</p>
        <p style={hintStyle}>
          추가한 등급은 저장해야 실제로 만들어져요. 등급을 지우려면 그 등급을 쓰는 회원이 한 명도
          없어야 해요.
        </p>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 등급 추가 / 이름 수정 모달
 * ──────────────────────────────────────────────────────────────────────────── */

function TierFormModal({
  mode,
  initialLabel,
  rows,
  editingId,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'rename';
  initialLabel: string;
  rows: readonly DraftRow[];
  editingId: string | null;
  onClose: () => void;
  onSubmit: (label: string) => void;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [error, setError] = useState<string | null>(null);
  const labelId = useId();
  const labelRef = useRef<HTMLInputElement>(null);
  const creating = mode === 'create';

  const submit = (): void => {
    const invalid = validateTierLabel(label, rows, editingId);
    if (invalid !== null) {
      setError(invalid);
      labelRef.current?.focus();
      return;
    }
    onSubmit(label);
  };

  return (
    <Modal
      title={creating ? '등급 추가' : '등급 이름 수정'}
      onClose={onClose}
      onSubmit={submit}
      initialFocusRef={labelRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" type="submit">
            {creating ? '등급 만들기' : '저장'}
          </Button>
        </>
      }
    >
      <div style={modalBodyStyle}>
        <TextField
          ref={labelRef}
          id={labelId}
          label="등급 이름"
          value={label}
          maxLength={TIER_LABEL_MAX}
          placeholder="예: 골드"
          {...(error !== null ? { error } : {})}
          onChange={(event) => {
            setLabel(event.target.value);
            setError(null);
          }}
        />
        <p style={hintStyle}>
          {creating
            ? '새 등급의 승급 조건은 비어 있고 할인율은 0%로 시작해요. 만든 뒤 표에서 값을 채우고 저장하세요 — 승급 조건을 비운 채로는 저장할 수 없어요.'
            : '이름만 바뀌어요. 이 등급을 쓰는 회원은 그대로 유지돼요 — 회원은 이름이 아니라 등급 식별자를 참조해요.'}
        </p>
      </div>
    </Modal>
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
            hint="누적 구매금액을 합산할 구간이에요."
            help={
              <HelpTip label="집계 기간 설명">
                승급 조건과 비교할 누적 구매금액을 어느 구간에서 합산할지 정해요. '최근 12개월'을
                고르면 그보다 오래된 주문은 누적에서 빠져요.
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
                켜면 집계 기간의 누적 구매금액이 승급 조건에 미달할 때 등급이 내려가요. 끄면 한 번
                오른 등급은 조건에 미달해도 유지돼요. 오른쪽 '현재 등급 분포'가 이 설정을 반영해
                다시 계산돼요.
              </HelpTip>
            </div>
            <p style={hintStyle}>
              {allowDemotion
                ? '조건에 미달하면 등급이 내려가요.'
                : '한 번 오른 등급은 조건에 미달해도 유지돼요.'}
            </p>
          </div>

          <FormField
            htmlFor={recalcId}
            label="재계산 시점"
            hint="등급을 다시 산정하는 시점이에요."
            help={
              <HelpTip label="재계산 시점 설명">
                '주문 완료 시'는 결제가 확정될 때마다 그 회원만 다시 계산하고, '매일 자정'·'매월
                1일'은 전체 회원을 한 번에 다시 계산해요.
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
          id: row.tierId,
          cells: [
            row.label,
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
          아직 저장되지 않은 미리보기예요. 아래 숫자는 지금 입력한 정책을 적용했을 때의 예상값이며,
          저장하기 전에는 회원 등급이 바뀌지 않아요.
        </Alert>

        {distribution === null ? (
          <p style={hintStyle}>
            승급 조건 또는 할인율 값이 올바르지 않아 미리보기를 계산할 수 없어요. 왼쪽 표의 입력값을
            확인해 주세요.
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
                ? '강등 허용이 켜져 있어, 조건에 미달하는 회원은 등급이 내려간 것으로 계산했어요.'
                : '강등 허용이 꺼져 있어, 조건에 미달해도 현재 등급을 유지하는 것으로 계산했어요.'}
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
  rows: [
    { id: 'normal', label: '일반회원', system: true, threshold: '0', discount: '0' },
    { id: 'vip', label: 'VIP', system: true, threshold: '1,000,000', discount: '3' },
    { id: 'vvip', label: 'VVIP', system: true, threshold: '5,000,000', discount: '7' },
  ],
  period: 'all',
  allowDemotion: false,
  recalcTrigger: 'order-completed',
};

/** 이미 '골드' 를 추가해 둔 상태 — 수정·삭제 액션이 열려 있는 행을 보이기 위한 초안 */
const DRAFT_WITH_CUSTOM: PolicyDraft = {
  ...INITIAL_DRAFT,
  rows: [
    ...INITIAL_DRAFT.rows.slice(0, 2),
    { id: 'tier-gold', label: '골드', system: false, threshold: '3,000,000', discount: '5' },
    ...INITIAL_DRAFT.rows.slice(2),
  ],
};

type ModalState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'create' }
  | { readonly kind: 'rename'; readonly row: DraftRow };

interface ScreenProps {
  readonly loading?: boolean;
  readonly saving?: boolean;
  readonly loadFailed?: boolean;
  readonly initialDirty?: boolean;
  readonly confirming?: boolean;
  readonly initialDraft?: PolicyDraft;
  readonly initialModal?: ModalState;
  readonly showErrorsFirst?: boolean;
}

function CustomerSettingsScreen({
  loading = false,
  saving = false,
  loadFailed = false,
  initialDirty = false,
  confirming = false,
  initialDraft = INITIAL_DRAFT,
  initialModal = { kind: 'closed' },
  showErrorsFirst = false,
}: ScreenProps) {
  const [draft, setDraft] = useState<PolicyDraft>(initialDraft);
  const [attempted, setAttempted] = useState(showErrorsFirst);
  const [dirty, setDirty] = useState(initialDirty);
  const [confirmingSave, setConfirmingSave] = useState(confirming);
  const [modal, setModal] = useState<ModalState>(initialModal);
  const [pendingDelete, setPendingDelete] = useState<DraftRow | null>(null);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const distribution = useMemo(
    () =>
      validation.tiers === null ? null : computeDistribution(validation.tiers, draft.allowDemotion),
    [validation, draft.allowDemotion],
  );

  const patchRow = (tierId: string, patch: Partial<DraftRow>): void => {
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === tierId ? { ...row, ...patch } : row)),
    }));
    setDirty(true);
  };

  const onThresholdBlur = (tierId: string): void => {
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => {
        if (row.id !== tierId) return row;
        const parsed = parseAmount(row.threshold);
        return {
          ...row,
          threshold: parsed === null ? row.threshold.trim() : withThousands(parsed),
        };
      }),
    }));
  };

  /** 추가는 이름만 받는다 — 승급 조건은 비운 채로 만든다(금액을 지어내지 않는다) */
  const addTier = (label: string): void => {
    setDraft((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        {
          id: `tier-${String(prev.rows.length)}`,
          label: label.trim(),
          system: false,
          threshold: '',
          discount: '0',
        },
      ],
    }));
    setDirty(true);
    setModal({ kind: 'closed' });
  };

  const renameTier = (tierId: string, label: string): void => {
    patchRow(tierId, { label: label.trim() });
    setModal({ kind: 'closed' });
  };

  const removeTier = (tierId: string): void => {
    setDraft((prev) => ({ ...prev, rows: prev.rows.filter((row) => row.id !== tierId) }));
    setDirty(true);
    setPendingDelete(null);
  };

  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>등급 정책을 불러오지 못했어요.</span>
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
          <span style={footerHintStyle}>등급 정책을 불러오는 중이에요…</span>
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
            onAdd={() => setModal({ kind: 'create' })}
            onRename={(row) => setModal({ kind: 'rename', row })}
            onDelete={(row) => setPendingDelete(row)}
            onThresholdChange={(tierId, raw) =>
              patchRow(tierId, { threshold: sanitizeDigits(raw) })
            }
            onThresholdBlur={onThresholdBlur}
            onDiscountChange={(tierId, raw) => patchRow(tierId, { discount: sanitizeDigits(raw) })}
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
            ? '저장하는 중이에요…'
            : dirty
              ? '저장하지 않은 변경 사항이 있어요.'
              : '변경 사항이 없어요.'}
        </p>
        <Button
          variant="primary"
          disabled={!dirty || saving}
          onClick={() => {
            setAttempted(true);
            if (validation.tiers === null) return;
            setConfirmingSave(true);
          }}
        >
          {saving ? '저장 중…' : '저장'}
        </Button>
      </div>

      {modal.kind !== 'closed' && (
        <TierFormModal
          mode={modal.kind}
          initialLabel={modal.kind === 'rename' ? modal.row.label : ''}
          rows={draft.rows}
          editingId={modal.kind === 'rename' ? modal.row.id : null}
          onClose={() => setModal({ kind: 'closed' })}
          onSubmit={(label) => {
            if (modal.kind === 'rename') renameTier(modal.row.id, label);
            else addTier(label);
          }}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="등급 삭제"
          message={`'${pendingDelete.label}' 등급을 목록에서 지워요. 하단의 저장을 눌러야 실제로 반영돼요.`}
          confirmLabel="등급 삭제"
          onConfirm={() => removeTier(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {confirmingSave && (
        <ConfirmDialog
          intent="update"
          title="등급 정책 저장"
          message="등급 정책을 저장하면 이후 등급 산정부터 새 기준이 적용돼요. 저장할까요?"
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

/** 정상: 기본 제공 등급 3종(이름 변경·삭제 잠김) · 변경 없음 · 미리보기 계산됨 */
export const Default: Story = {
  render: () => <CustomerSettingsScreen />,
};

/** 등급 추가됨: 운영자가 만든 '골드' 행은 수정·삭제가 열려 있다(쓰는 회원이 0명) */
export const WithCustomTier: Story = {
  render: () => <CustomerSettingsScreen initialDraft={DRAFT_WITH_CUSTOM} />,
};

/** 등급 추가 모달: 이름만 받는다 — 승급 조건은 만든 뒤 표에서 채운다 */
export const AddTier: Story = {
  render: () => <CustomerSettingsScreen initialModal={{ kind: 'create' }} />,
};

/** 등급 이름 수정 모달: 이름만 바뀐다(회원은 식별자를 참조하므로 그대로 유지) */
export const RenameTier: Story = {
  render: () => (
    <CustomerSettingsScreen
      initialDraft={DRAFT_WITH_CUSTOM}
      initialModal={{
        kind: 'rename',
        row: DRAFT_WITH_CUSTOM.rows[2] as DraftRow,
      }}
    />
  ),
};

/** 저장 거부: 추가한 등급의 승급 조건이 비어 있어 인라인 오류가 남는다 */
export const InvalidTier: Story = {
  render: () => (
    <CustomerSettingsScreen
      showErrorsFirst
      initialDirty
      initialDraft={{
        ...INITIAL_DRAFT,
        rows: [
          ...INITIAL_DRAFT.rows,
          { id: 'tier-gold', label: '골드', system: false, threshold: '', discount: '0' },
        ],
      }}
    />
  ),
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
