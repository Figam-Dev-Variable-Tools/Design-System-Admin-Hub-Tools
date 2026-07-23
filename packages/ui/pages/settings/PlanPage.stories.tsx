/**
 * Design System/Templates/Settings/Plan — 플랜·이용 현황 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/settings/plan` → 메뉴 en = "Settings"(시스템 설정), 화면 en =
 * "Plan" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Settings 그룹의
 * `['/settings/plan', '플랜·이용 현황', 'Plan']`).
 *
 * 대응 실화면: apps/admin/src/pages/settings/plan/PlanPage.tsx (라우트 /settings/plan) 와 그 모델
 * (shared/entitlements/plan.ts).
 *
 * [왜 이런 구조인가 — 이 화면은 **읽기 전용**이다] 플랜을 바꾸지 않는다. 구독·결제·계약은 사내
 * 홈페이지 소관이고 이 어드민은 그 값을 **받는 쪽**이다. 여기에 변경 수단을 두면 실제 계약과
 * 어긋나는 두 번째 정본이 생긴다 — 화면에서는 프로인데 청구는 베이직인 상태가 만들어지고, 그때
 * 어느 쪽이 맞는지 아무도 답할 수 없다. 카드 등록·재청구·업그레이드 버튼도 같은 이유로 없다.
 * 그래서 이 템플릿에는 저장 툴바도 폼도 없고, 바깥으로 나가는 링크 하나만 있다.
 * (예전에 화면 아래에 있던 DEV 전용 '개발용 플랜 전환' 패널도 사라졌다 — 읽기 전용이라고 말하는
 * 화면 안의 플랜 변경 select 는 개발·스테이징을 보는 사람에게 그대로 변경 UI 로 읽힌다.)
 *
 * [탭 셋 — 한 구독을 세 각도로 본다]
 *   이용현황 — 무엇을 계약했고 무엇이 열려 있나 (모듈 3상태 · 쿼터)
 *   결제     — 어떻게 청구되고 있나 (청구 상태 · 결제 수단 · 다음 청구)
 *   결제내역 — 얼마를 냈나 (지난 청구)
 * 셋 다 읽기 화면이다. 탭이 늘어난 것은 **볼 것**이 늘어난 것이지 할 수 있는 일이 늘어난 것이
 * 아니다. 실화면에서 활성 탭은 라우트가 아니라 쿼리스트링(`?tab=`)에 실린다 — 같은 화면의 상태이지
 * 다른 화면이 아니기 때문이고, 그래도 새로고침·뒤로가기·링크 공유는 살아야 하기 때문이다.
 *
 * [결제내역은 /sales/billing 이 아니다 — 두 화면이 서로를 흉내 내지 않게]
 *   /sales/billing (영업 관리 > 청구·입금) = 우리가 **고객에게** 청구한 건. 받을 돈이고 쓰기가 있다.
 *   이 탭 (/settings/plan · 결제내역)      = 우리가 **사내에** 낸 구독료. 낼 돈이고 쓰기가 없다.
 * 낱말이 거의 같아서(청구·금액·상태·미납) 한쪽을 만들다 보면 다른 쪽을 흉내 내게 되고, 그 순간
 * 운영자는 돈의 방향을 잃는다. 그래서 이 표에는 '입금 확인' 같은 행 액션이 없다.
 *
 * [모름(null)은 0원·0건이 아니다] 결제 수단·다음 청구일·지난 청구 목록은 사내 어드민이 내려 주는
 * 값이다. 아직 받지 못한 상태를 '₩0'·'내역이 없습니다' 로 그리면 화면이 **거짓 사실을 단정한다** —
 * 3년째 결제 중인 고객에게도 같은 문장이 나온다. 그래서 세 상태를 갈라 그린다:
 *   null → 받지 못했다(모른다) · [] → 받았고 정말 0건이다 · 목록 → 받았고 건이 있다.
 *
 * [배너는 탭 위에 있다] 미납·정지와 변경 예고는 특정 탭의 사실이 아니라 이 계정의 사실이다.
 * 결제 탭에만 두면 이용현황을 보러 온 운영자는 자기 앱이 조회 전용이라는 것을 모른 채 저장 버튼이
 * 잠긴 화면을 만난다.
 *
 * [그래서 무엇을 하는 화면인가] 잠금을 만난 운영자가 **'무엇을 쓰고 있고 무엇이 잠겨 있는지'** 를
 * 한 번에 확인하는 곳이다. 이용현황의 카드가 둘인 것도 그 두 질문에 대응한다: 현재 플랜(무엇을
 * 계약했나) · 포함 기능(그래서 무엇이 열려 있나).
 *
 * [잠김은 권한 거부가 아니다] 잠긴 기능의 상태 칸은 **'프로 플랜부터'** 라고 말한다 — 사지 않은
 * 기능에 권한 문구를 쓰면 운영자는 관리자에게 권한을 요청하고, 관리자도 켤 수 없어 지원 티켓이
 * 된다. 잠금은 이미 쌓인 데이터를 지우지도 않는다.
 *
 * [팔지 않는 모듈은 목록에도 없다] 티어 사다리로 팔지 않는 모듈(예: SMS — 발송사 계약이 따로 있어야
 * 켤 수 있다)은 행 자체를 그리지 않는다. 살 수 없는 것에 자물쇠를 달면 그것이 곧 티저이고,
 * 운영자는 결제 페이지를 뒤지다 아무것도 찾지 못한다.
 *
 * [쿼터는 숫자로만 말한다] '214/200' 은 다운그레이드 직후 정상적으로 존재하는 상태다. 어느 항목이
 * 초과분인지는 앱이 임의로 정하지 않는다 — 정하면 그 순간 앱이 데이터를 판결한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   CardTitle(action 슬롯) → Card + 토큰 <h2> + 우측 StatusBadge
 *   tableStyle 이 붙은 raw <table> → DS Table(행 머리 열은 첫 셀의 강조 텍스트로 갈음)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   미납·정지 안내             → Alert(warning) — 기능을 지우지 않고 조회만 남긴다
 *   플랜 변경 예고             → Alert(info) — 날짜와 확인처까지만 말한다
 *   탭 3개                    → Tabs + tabId/tabPanelId 로 이은 바깥 tabpanel
 *   현재 플랜 카드 + 계약명 배지  → Card + 토큰 <h2> + StatusBadge(info)
 *   플랜 등급 · 적용 예정        → 토큰 <dl>
 *   사내 홈페이지로 나가는 링크   → 토큰 <a>(target=_blank · rel=noopener noreferrer)
 *   포함 기능 표               → Table (기능 · 종류 · 상태 · 사용량/수준)
 *   포함 · 잠김 배지            → StatusBadge (success / neutral — '프로 플랜부터')
 *   청구 상태 카드 + 배지        → Card + StatusBadge(success/warning/danger)
 *   결제 수단·다음 청구 목록      → 토큰 <dl> — 모르는 칸은 '확인할 수 없음'
 *   결제내역 표                → Table (청구일 · 이용 기간 · 계약 · 금액 · 상태 · 영수증)
 *   결제내역 0건               → Empty(label='구독료 청구' · createVerb='발생')
 *   결제내역 모름               → Alert(info) — Empty 를 쓰지 않는다(없음이 아니라 모름이므로)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Card,
  Empty,
  StatusBadge,
  Table,
  Tabs,
  cssVar,
  tabId,
  tabPanelId,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/Plan',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 shared/entitlements/plan.ts 미러) ────────────────────────────────────── */

/** 낮은 순서 → 높은 순서. 배열 순서가 곧 포함 관계다(상위 티어는 하위 티어를 전부 포함한다) */
const PLAN_TIERS = ['free', 'basic', 'pro', 'enterprise'] as const;

type PlanTier = (typeof PLAN_TIERS)[number];

const PLAN_TIER_LABEL: Readonly<Record<PlanTier, string>> = {
  free: '무료',
  basic: '베이직',
  pro: '프로',
  enterprise: '엔터프라이즈',
};

const tierRank = (tier: PlanTier): number => PLAN_TIERS.indexOf(tier);

/** 이 티어가 minTier 이상인가. minTier 가 null 이면 **어떤 티어에도 없다**(판매하지 않는 모듈) */
const tierIncludes = (minTier: PlanTier | null, tier: PlanTier): boolean =>
  minTier !== null && tierRank(tier) >= tierRank(minTier);

/** 미납·정지는 기능을 **지우지 않는다** — 전부 읽기 전용으로 내려앉을 뿐이다 */
type BillingState = 'active' | 'past_due' | 'suspended';

const BILLING_STATE_LABEL: Readonly<Record<BillingState, string>> = {
  active: '정상',
  past_due: '결제 지연',
  suspended: '이용 정지',
};

/** 문구가 의미를 싣고 색은 보조다 (WCAG 1.4.1) */
const BILLING_TONE: Readonly<Record<BillingState, StatusBadgeTone>> = {
  active: 'success',
  past_due: 'warning',
  suspended: 'danger',
};

type EntitlementKey =
  | 'commerce.orders'
  | 'commerce.products'
  | 'commerce.coupons'
  | 'commerce.points'
  | 'commerce.shipping'
  | 'sales.pipeline'
  | 'cms.pages'
  | 'marketing.email'
  | 'marketing.sms'
  | 'ai.agent'
  | 'stats.advanced';

/** level 종의 '없음' — 이 값이면 그 모듈은 꺼진 것으로 읽는다 */
const LEVEL_NONE = 'none';

const LEVEL_LABEL: Readonly<Record<string, string>> = {
  [LEVEL_NONE]: '미포함',
  basic: '기본',
  advanced: '고급',
};

/**
 * 모듈 한 줄의 정의.
 *
 * [minTier === null 은 '어떤 플랜에도 번들되지 않는다' 다] 티어 사다리로 팔지 않는 모듈이고,
 * 사내 어드민이 명시적으로 꺼서 보내면 **잠금이 아니라 완전 숨김**이 된다.
 */
type ModuleSpec = {
  readonly key: EntitlementKey;
  readonly label: string;
  /** 기능 설명의 정본은 카탈로그다 — 화면이 지어내면 모듈마다 말투가 갈린다 */
  readonly description: string;
  readonly minTier: PlanTier | null;
} & (
  | { readonly kind: 'switch' }
  | { readonly kind: 'quota'; readonly limits: Readonly<Record<PlanTier, number | 'unlimited'>> }
  | { readonly kind: 'level'; readonly levels: Readonly<Record<PlanTier, string>> }
);

const MODULE_SPECS: readonly ModuleSpec[] = [
  {
    kind: 'switch',
    key: 'commerce.orders',
    label: '주문 관리',
    description: '고객 주문의 접수·상태 변경·환불 처리를 한 곳에서 봐요.',
    minTier: 'basic',
  },
  {
    kind: 'quota',
    key: 'commerce.products',
    label: '상품 관리',
    description: '판매 상품과 카테고리를 등록하고 노출을 관리해요.',
    minTier: 'free',
    // 다운그레이드해도 이미 등록한 상품은 지우지 않는다 — 초과분은 숫자로만 말하고 신규 등록만 잠근다
    limits: { free: 20, basic: 200, pro: 2000, enterprise: 'unlimited' },
  },
  {
    kind: 'switch',
    key: 'commerce.coupons',
    label: '쿠폰',
    description: '할인 쿠폰을 발급하고 사용 조건·기간을 관리해요.',
    minTier: 'pro',
  },
  {
    kind: 'switch',
    key: 'commerce.points',
    label: '적립금',
    description: '적립·차감 원장과 적립 정책을 운영해요.',
    minTier: 'pro',
  },
  {
    kind: 'switch',
    key: 'commerce.shipping',
    label: '배송·교환/반품',
    description: '배송 정책과 교환·반품 접수를 관리해요.',
    minTier: 'basic',
  },
  {
    kind: 'switch',
    key: 'sales.pipeline',
    label: '영업 관리',
    description: '거래처·계약·견적·프로젝트를 잇는 영업 파이프라인이에요.',
    minTier: 'pro',
  },
  {
    kind: 'switch',
    key: 'cms.pages',
    label: '콘텐츠 관리',
    description: '공지·FAQ·팝업·배너 등 홈페이지 콘텐츠를 편집해요.',
    minTier: 'free',
  },
  {
    kind: 'switch',
    key: 'marketing.email',
    label: '이메일·뉴스레터 발송',
    description: '뉴스레터와 이메일 캠페인을 만들고 발송해요.',
    minTier: 'basic',
  },
  {
    kind: 'switch',
    key: 'marketing.sms',
    label: 'SMS 발송',
    description: '문자·알림톡을 발송하고 발송 이력을 봐요.',
    // 티어 번들이 아니다 — 발신번호 등록과 발송사 계약이 따로 있어야 켤 수 있다
    minTier: null,
  },
  {
    kind: 'switch',
    key: 'ai.agent',
    label: 'AI 에이전트',
    description: '멘션한 데이터를 조건으로 조회하는 대화형 도우미예요.',
    minTier: 'enterprise',
  },
  {
    kind: 'level',
    key: 'stats.advanced',
    label: '고급 통계',
    description: '유입 분석·검색어 분석·매출 통계 등 심화 리포트를 봐요.',
    minTier: 'pro',
    levels: { free: LEVEL_NONE, basic: LEVEL_NONE, pro: 'basic', enterprise: 'advanced' },
  },
];

/** 구독·결제·계약을 실제로 바꾸는 곳 — **사내 홈페이지다** */
const PLAN_PORTAL_URL = 'https://spaceplanning.ai/pricing';

const PAGE_DESCRIPTION =
  '지금 계약된 플랜과 그 플랜에 포함된 기능이에요. 플랜 변경·결제는 사내 홈페이지에서 진행해요.';

/** 예고 배너의 기준일 — 화면이 `new Date()` 를 읽으면 스토리 비교가 매일 깨진다 */
const TODAY = '2026-07-22';

/* ── 탭(실화면 pages/settings/plan/tabs.ts 미러) ─────────────────────────────────────────────── */

/** 표시 순서 = 읽는 순서. 무엇을 쓰고 있나 → 어떻게 내고 있나 → 얼마를 냈나 */
const PLAN_TABS = [
  { id: 'usage', label: '이용현황' },
  { id: 'billing', label: '결제' },
  { id: 'history', label: '결제내역' },
] as const;

type PlanTabId = (typeof PLAN_TABS)[number]['id'];

/* ── 구독 결제(실화면 pages/settings/plan/subscription.ts 미러) ───────────────────────────────── */

type BillingMethodKind = 'card' | 'transfer' | 'invoice';

const BILLING_METHOD_LABEL: Readonly<Record<BillingMethodKind, string>> = {
  card: '신용카드 자동결제',
  transfer: '계좌 자동이체',
  invoice: '세금계산서 발행 후 입금',
};

interface BillingMethod {
  readonly kind: BillingMethodKind;
  /** 사람이 자기 수단을 알아보는 최소 조각. 전체 번호는 이 어드민에 오지 않는다 */
  readonly hint: string | null;
}

type BillingCycle = 'monthly' | 'yearly';

const BILLING_CYCLE_LABEL: Readonly<Record<BillingCycle, string>> = {
  monthly: '월간',
  yearly: '연간',
};

/** 통화를 값과 **한 벌로** 든다 — 숫자만 들고 '원' 을 붙이면 해외 계약에서 조용히 틀린다 */
interface Money {
  readonly currency: string;
  readonly amount: number;
}

/** 청구 상태(정상·지연·정지)는 여기 없다 — 그것은 플랜 상태가 이미 갖고 있다 */
interface SubscriptionBilling {
  readonly method: BillingMethod | null;
  readonly cycle: BillingCycle | null;
  readonly nextChargeAt: string | null;
  readonly nextChargeAmount: Money | null;
  readonly invoiceEmail: string | null;
}

type InvoiceState = 'paid' | 'unpaid' | 'refunded' | 'void';

const INVOICE_STATE_LABEL: Readonly<Record<InvoiceState, string>> = {
  paid: '결제 완료',
  unpaid: '미납',
  refunded: '환불',
  void: '청구 취소',
};

const INVOICE_TONE: Readonly<Record<InvoiceState, StatusBadgeTone>> = {
  paid: 'success',
  unpaid: 'warning',
  refunded: 'info',
  void: 'neutral',
};

interface SubscriptionInvoice {
  readonly id: string;
  readonly chargedAt: string;
  /** 이 청구가 덮는 이용 기간 — 금액만으로는 무엇에 대한 청구인지 알 수 없다 */
  readonly periodStart: string;
  readonly periodEnd: string;
  /** 그때의 계약명 — 지금 플랜과 다를 수 있다 */
  readonly planLabel: string;
  readonly amount: Money;
  readonly state: InvoiceState;
  readonly receiptUrl: string | null;
}

/**
 * 모를 때 칸에 쓰는 말 — **한 벌만 둔다.**
 * '—'·'없음'·'미확인' 이 섞이면 어느 것이 0 이고 어느 것이 모름인지 구분할 수 없다.
 */
const UNKNOWN_TEXT = '확인할 수 없음';

function formatMoney(money: Money): string {
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: money.currency,
      currencyDisplay: 'narrowSymbol',
    }).format(money.amount);
  } catch {
    // ISO 4217 이 아닌 코드로 화면이 통째로 죽는 것이 최악이다 — 숫자 + 코드 원문으로 되돌아간다
    return `${money.amount.toLocaleString('ko-KR')} ${money.currency}`;
  }
}

function formatBillingMethod(method: BillingMethod): string {
  const label = BILLING_METHOD_LABEL[method.kind];
  return method.hint === null ? label : `${label} · ${method.hint}`;
}

function orUnknown<T>(value: T | null, format: (value: T) => string): string {
  return value === null ? UNKNOWN_TEXT : format(value);
}

/* ── 데모 데이터(실화면 PlanState 미러) ───────────────────────────────────────────────────── */

interface DemoPlan {
  readonly tier: PlanTier;
  /** 계약서에 적힌 플랜 이름 — 티어 표시명과 다를 수 있다('프로 연간' 등) */
  readonly planLabel: string;
  readonly billingState: BillingState;
  /** 예고된 플랜 변경의 적용일 'YYYY-MM-DD'. 없으면 null */
  readonly effectiveAt: string | null;
  /**
   * 사내 어드민이 **명시적으로 꺼서 보낸** 키 — 티어 정의를 이긴다.
   * 티어 번들이 아닌 모듈(minTier === null)이 여기 들어오면 잠금이 아니라 완전 숨김이 된다.
   */
  readonly disabledKeys: readonly EntitlementKey[];
  /** 쿼터 종 모듈의 실제 사용량 — 픽스처가 안다 */
  readonly usage: Readonly<Partial<Record<EntitlementKey, number>>>;
}

/** 베이직 — 상품 180/200 을 쓰는 중이고 프로부터 열리는 기능 넷이 잠겨 있다 */
const BASIC_PLAN: DemoPlan = {
  tier: 'basic',
  planLabel: '베이직 플랜',
  billingState: 'active',
  effectiveAt: null,
  // 발송사 계약이 없어 사내 어드민이 꺼서 보냈다 — SMS 행은 목록에 아예 없다
  disabledKeys: ['marketing.sms'],
  usage: { 'commerce.products': 180 },
};

const FREE_PLAN: DemoPlan = {
  tier: 'free',
  planLabel: '무료 플랜',
  billingState: 'active',
  effectiveAt: null,
  disabledKeys: ['marketing.sms'],
  usage: { 'commerce.products': 18 },
};

const ENTERPRISE_PLAN: DemoPlan = {
  tier: 'enterprise',
  planLabel: '2026 전사 계약',
  billingState: 'active',
  effectiveAt: null,
  disabledKeys: [],
  usage: { 'commerce.products': 4210 },
};

/** 다운그레이드 예고 + 쿼터 초과 — 214/200 은 정상적으로 존재하는 상태다 */
const DOWNGRADE_PLAN: DemoPlan = {
  tier: 'basic',
  planLabel: '베이직 플랜',
  billingState: 'active',
  effectiveAt: '2026-08-01',
  disabledKeys: ['marketing.sms'],
  usage: { 'commerce.products': 214 },
};

/** 결제 지연 — 기능을 지우지 않는다. 조회는 그대로 열려 있고 쓰기만 잠긴다 */
const PAST_DUE_PLAN: DemoPlan = {
  tier: 'pro',
  planLabel: '프로 연간',
  billingState: 'past_due',
  effectiveAt: null,
  disabledKeys: ['marketing.sms'],
  usage: { 'commerce.products': 640 },
};

/** 이용 정지 — 조회 전용이지만 쌓인 데이터는 지워지지 않는다 */
const SUSPENDED_PLAN: DemoPlan = {
  tier: 'pro',
  planLabel: '프로 연간',
  billingState: 'suspended',
  effectiveAt: null,
  disabledKeys: ['marketing.sms'],
  usage: { 'commerce.products': 640 },
};

/* ── 결제 데모 데이터 ─────────────────────────────────────────────────────────────────────── */

const KNOWN_BILLING: SubscriptionBilling = {
  method: { kind: 'card', hint: '신한 ····1234' },
  cycle: 'yearly',
  nextChargeAt: '2026-08-01',
  nextChargeAmount: { currency: 'KRW', amount: 1_200_000 },
  invoiceEmail: 'billing@example.com',
};

/** 문서는 받았는데 칸이 비어 있다 — '받지 못했다' 와 다른 사실이라 화면도 다르게 말한다 */
const PARTIAL_BILLING: SubscriptionBilling = {
  method: null,
  cycle: null,
  nextChargeAt: null,
  nextChargeAmount: null,
  invoiceEmail: null,
};

const INVOICES: readonly SubscriptionInvoice[] = [
  {
    id: 'inv-2026-07',
    chargedAt: '2026-07-01',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    planLabel: '프로 연간',
    amount: { currency: 'KRW', amount: 100_000 },
    state: 'paid',
    receiptUrl: 'https://spaceplanning.ai/receipts/inv-2026-07',
  },
  {
    id: 'inv-2026-06',
    chargedAt: '2026-06-01',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    planLabel: '프로 연간',
    amount: { currency: 'KRW', amount: 100_000 },
    state: 'unpaid',
    // 미납 건에는 영수증이 없다 — 없는 링크를 만들지 않는다
    receiptUrl: null,
  },
  {
    id: 'inv-2026-05',
    chargedAt: '2026-05-01',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    planLabel: '베이직 플랜',
    amount: { currency: 'KRW', amount: 30_000 },
    state: 'refunded',
    receiptUrl: 'https://spaceplanning.ai/receipts/inv-2026-05',
  },
];

/* ── 순수 규칙(실화면 미러) ───────────────────────────────────────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 읽기 전용으로 내려앉은 이유 — 정상이면 null(배너를 그리지 않는다) */
function billingNotice(plan: DemoPlan): string | null {
  if (plan.billingState === 'past_due') {
    return '결제가 확인되지 않아 지금은 조회만 가능해요. 사내 홈페이지에서 결제 상태를 확인해 주세요.';
  }
  if (plan.billingState === 'suspended') {
    return '구독이 정지되어 지금은 조회만 가능해요. 사내 홈페이지에서 구독을 다시 활성화해 주세요.';
  }
  return null;
}

/**
 * 다운그레이드 예고 — **무엇이 사라지는지는 말하지 않는다.**
 * 이 어드민은 받는 쪽이라 다음 플랜의 엔타이틀먼트를 아직 모르고, 모르는 것을 지어내면 예고와
 * 실제가 갈라진다. 날짜와 '어디서 확인하는지' 까지만 말한다.
 */
function planChangeNotice(plan: DemoPlan): string | null {
  if (plan.effectiveAt === null || plan.effectiveAt <= TODAY) return null;
  return `${plan.effectiveAt}에 플랜 변경이 적용돼요. 변경 내용은 사내 홈페이지에서 확인해 주세요.`;
}

/**
 * 이 모듈의 판정 3상태 — boolean 하나로 뭉치면 **숨김과 잠금을 구분할 수 없다.**
 *   locked → 사내 홈페이지에서 상위 플랜으로 올린다 (살 수 있다)
 *   absent → 할 수 있는 일이 없다 (살 수 없는 것을 티저하면 노이즈다)
 */
type EntitlementState =
  | { readonly kind: 'granted' }
  | { readonly kind: 'locked'; readonly upgradeTo: PlanTier }
  | { readonly kind: 'absent' };

function entitlementStateOf(plan: DemoPlan, spec: ModuleSpec): EntitlementState {
  const disabled = plan.disabledKeys.includes(spec.key);
  // 티어가 그 모듈에 대해 할 말이 없으면 granted 로 읽는다(fail-open) — 끄는 것은 명시적일 때뿐이다
  if (spec.minTier === null) return disabled ? { kind: 'absent' } : { kind: 'granted' };
  if (!disabled && tierIncludes(spec.minTier, plan.tier)) return { kind: 'granted' };
  return { kind: 'locked', upgradeTo: spec.minTier };
}

/**
 * 값의 형태(switch·quota·level)를 사람의 말로 옮긴다.
 * 쿼터는 **숫자로만** 말한다 — 어느 항목이 초과분인지는 앱이 정하지 않는다.
 */
function moduleDetail(plan: DemoPlan, spec: ModuleSpec): string {
  if (spec.kind === 'quota') {
    const limit = spec.limits[plan.tier];
    const used = plan.usage[spec.key] ?? 0;
    return limit === 'unlimited'
      ? `${spec.label} ${fmt(used)}건 · 무제한`
      : `${spec.label} ${fmt(used)}/${fmt(limit)}`;
  }
  if (spec.kind === 'level') {
    const level = spec.levels[plan.tier];
    return `${LEVEL_LABEL[level] ?? level} 수준`;
  }
  return '';
}

/**
 * 값의 형태를 사람의 말로 — '종류' 열이 쓴다.
 *
 * 셋을 한 낱말('포함')로 뭉치면 '포함인데 왜 등록이 안 되죠?'(쿼터 소진)를 화면이 설명하지 못한다.
 * **한도 종은 잠기지 않는다** — 한도를 넘겨도 화면은 열리고 신규 등록만 막힌다.
 */
const KIND_LABEL: Readonly<Record<ModuleSpec['kind'], string>> = {
  switch: '포함 여부',
  quota: '한도',
  level: '수준',
};

interface ModuleRow {
  readonly key: EntitlementKey;
  readonly label: string;
  readonly description: string;
  readonly kind: string;
  readonly tone: StatusBadgeTone;
  readonly status: string;
  /** 쿼터 사용량·수준처럼 '얼마나' 를 말하는 값. 말할 것이 없으면 빈 문자열 */
  readonly detail: string;
}

function toRows(plan: DemoPlan): readonly ModuleRow[] {
  const rows: ModuleRow[] = [];
  for (const spec of MODULE_SPECS) {
    const state = entitlementStateOf(plan, spec);
    // 판매하지 않는 모듈 — 목록에도 올리지 않는다
    if (state.kind === 'absent') continue;
    rows.push({
      key: spec.key,
      label: spec.label,
      description: spec.description,
      kind: KIND_LABEL[spec.kind],
      tone: state.kind === 'granted' ? 'success' : 'neutral',
      status: state.kind === 'granted' ? '포함' : `${PLAN_TIER_LABEL[state.upgradeTo]} 플랜부터`,
      detail: state.kind === 'granted' ? moduleDetail(plan, spec) : '',
    });
  }
  return rows;
}

/* ── 표 열 정의 ───────────────────────────────────────────────────────────────────────────── */

const MODULE_COLUMNS: TableProps['columns'] = [
  { id: 'feature', header: '기능' },
  { id: 'kind', header: '종류', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'detail', header: '사용량 · 수준', nowrap: true },
];

const INVOICE_COLUMNS: TableProps['columns'] = [
  { id: 'chargedAt', header: '청구일', nowrap: true },
  { id: 'period', header: '이용 기간', nowrap: true },
  { id: 'plan', header: '계약' },
  { id: 'amount', header: '금액', align: 'end', nowrap: true },
  { id: 'state', header: '상태', nowrap: true },
  { id: 'receipt', header: '영수증', nowrap: true },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const noteRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/** 탭 패널 한 장 — 카드들을 세로로 쌓는다. 세 패널이 같은 간격을 쓴다 */
const panelStyle: CSSProperties = {
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

const cardHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 4) minmax(0, 1fr)`,
  gap: cssVar('space.2'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const ddStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const featureNameStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const featureCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const numericStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function PlanCard({
  title,
  action,
  children,
}: {
  readonly title: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <Card aria-labelledby={titleId}>
        <div style={cardBodyStyle}>
          <div style={cardHeadStyle}>
            <h2 id={titleId} style={cardTitleStyle}>
              {title}
            </h2>
            {action}
          </div>
          {children}
        </div>
      </Card>
    </section>
  );
}

/* ── 이용현황 탭 ──────────────────────────────────────────────────────────────────────────── */

function UsagePanel({ plan }: { readonly plan: DemoPlan }) {
  const rows = toRows(plan);

  const tableRows: TableProps['rows'] = rows.map((row) => ({
    id: row.key,
    cells: [
      <span key="feature" style={featureCellStyle}>
        <span style={featureNameStyle}>{row.label}</span>
        <span style={hintStyle}>{row.description}</span>
      </span>,
      <span key="kind">{row.kind}</span>,
      <StatusBadge key="status" tone={row.tone} label={row.status} />,
      <span key="detail" style={numericStyle}>
        {row.detail === '' ? '—' : row.detail}
      </span>,
    ],
  }));

  return (
    <div style={panelStyle}>
      <PlanCard title="현재 플랜" action={<StatusBadge tone="info" label={plan.planLabel} />}>
        <p style={hintStyle}>{PAGE_DESCRIPTION}</p>

        <dl style={dlStyle}>
          <dt style={dtStyle}>플랜 등급</dt>
          <dd style={ddStyle}>{PLAN_TIER_LABEL[plan.tier]}</dd>

          {/* 청구 상태는 여기 없다 — 결제 탭이 그 사실의 집이다. 같은 사실을 두 곳에 두면
              언젠가 두 카드가 서로 다른 말을 한다 */}
          <dt style={dtStyle}>변경 적용 예정</dt>
          <dd style={{ ...ddStyle, ...numericStyle }}>{plan.effectiveAt ?? '없음'}</dd>
        </dl>

        <p style={hintStyle}>
          플랜을 바꾸려면{' '}
          <a href={PLAN_PORTAL_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            사내 홈페이지의 요금제 안내
          </a>
          에서 진행해 주세요. 이 화면에서는 바꿀 수 없어요.
        </p>
      </PlanCard>

      <PlanCard title="포함 기능">
        <p style={hintStyle}>
          잠긴 기능은 메뉴에 남아 있고, 들어가면 어떤 플랜에서 열리는지 안내해요. 잠금은 이미 쌓인
          데이터를 지우지 않아요.
        </p>
        <p style={hintStyle}>
          <strong>한도</strong> 종은 잠기지 않아요 — 한도를 넘겨도 화면은 그대로 열리고 신규 등록만
          막혀요.
        </p>

        <div style={tableScrollStyle}>
          <Table
            caption="플랜에 포함된 기능과 사용량 — 팔지 않는 모듈은 목록에 올리지 않아요."
            columns={MODULE_COLUMNS}
            rows={tableRows}
            empty="표시할 기능이 없어요."
          />
        </div>
      </PlanCard>
    </div>
  );
}

/* ── 결제 탭 ──────────────────────────────────────────────────────────────────────────────── */

/**
 * 상태가 **지금 앱에 무엇을 하고 있는지**.
 * 배너(billingNotice)는 '무엇을 해야 하는가' 를 말한다 — 둘은 다른 질문이라 문장이 둘이다.
 */
const BILLING_EFFECT: Readonly<Record<BillingState, string>> = {
  active: '등록·수정·삭제가 모두 열려 있어요.',
  past_due:
    '이 어드민은 지금 조회 전용이에요 — 등록·수정·삭제가 잠겨요. 기능이 사라지지는 않고 조회·내보내기는 그대로예요.',
  suspended:
    '이 어드민은 지금 조회 전용이에요 — 등록·수정·삭제가 잠겨요. 쌓인 데이터는 지워지지 않아요.',
};

const BILLING_NOT_RECEIVED =
  '이 어드민은 아직 결제 수단·다음 청구 정보를 받지 못했어요. 값이 없다는 뜻이 아니라 이 화면이 모른다는 뜻이에요 — 사내 홈페이지에서 확인해 주세요.';

function BillingPanel({
  plan,
  billing,
}: {
  readonly plan: DemoPlan;
  /** null 은 '아직 받지 못했다' 이지 '없다' 가 아니다 */
  readonly billing: SubscriptionBilling | null;
}) {
  const notice = billingNotice(plan);
  const readOnly = plan.billingState !== 'active';

  return (
    <div style={panelStyle}>
      <PlanCard
        title="청구 상태"
        action={
          <StatusBadge
            tone={BILLING_TONE[plan.billingState]}
            label={BILLING_STATE_LABEL[plan.billingState]}
          />
        }
      >
        <p style={hintStyle}>{BILLING_EFFECT[plan.billingState]}</p>
        {notice !== null && <Alert tone="warning">{notice}</Alert>}
        {readOnly && (
          <p style={hintStyle}>
            결제 상태를 되돌리는 일은 이 화면에서 할 수 없어요.{' '}
            <a href={PLAN_PORTAL_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              사내 홈페이지
            </a>
            에서 처리해 주세요.
          </p>
        )}
      </PlanCard>

      <PlanCard title="결제 수단 · 다음 청구">
        {billing === null ? (
          <Alert tone="info">{BILLING_NOT_RECEIVED}</Alert>
        ) : (
          <dl style={dlStyle}>
            <dt style={dtStyle}>결제 수단</dt>
            <dd style={ddStyle}>{orUnknown(billing.method, formatBillingMethod)}</dd>

            <dt style={dtStyle}>청구 주기</dt>
            <dd style={ddStyle}>
              {orUnknown(billing.cycle, (cycle) => BILLING_CYCLE_LABEL[cycle])}
            </dd>

            <dt style={dtStyle}>다음 청구일</dt>
            <dd style={{ ...ddStyle, ...numericStyle }}>
              {orUnknown(billing.nextChargeAt, (at) => at)}
            </dd>

            <dt style={dtStyle}>다음 청구 금액</dt>
            <dd style={{ ...ddStyle, ...numericStyle }}>
              {orUnknown(billing.nextChargeAmount, formatMoney)}
            </dd>

            <dt style={dtStyle}>청구서 수신처</dt>
            <dd style={ddStyle}>{orUnknown(billing.invoiceEmail, (email) => email)}</dd>
          </dl>
        )}

        <p style={hintStyle}>
          결제 수단 등록·변경과 청구 주기 변경은 이 화면에 없어요 — 여기서 바꾸면 실제 계약과
          어긋나는 두 번째 정본이 생겨요.{' '}
          <a href={PLAN_PORTAL_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            사내 홈페이지의 요금제 안내
          </a>
          에서 진행해 주세요.
        </p>
      </PlanCard>
    </div>
  );
}

/* ── 결제내역 탭 ──────────────────────────────────────────────────────────────────────────── */

const INVOICES_NOT_RECEIVED =
  '이 어드민은 아직 지난 청구 목록을 받지 못했어요. 청구가 없다는 뜻이 아니라 이 화면이 모른다는 뜻이에요 — 청구서·영수증은 사내 홈페이지에서 확인해 주세요.';

const INVOICE_SCOPE_NOTE =
  '여기 있는 것은 우리가 사내에 내는 구독료예요. 고객에게 청구한 건은 영업 관리 > 청구·입금(/sales/billing) 화면에서 봐요.';

function InvoiceHistoryPanel({
  invoices,
}: {
  /** null = 받지 못했다(모름) · [] = 받았고 정말 0건이다 · 목록 = 건이 있다 */
  readonly invoices: readonly SubscriptionInvoice[] | null;
}) {
  const tableRows: TableProps['rows'] = (invoices ?? []).map((invoice) => ({
    id: invoice.id,
    cells: [
      <span key="chargedAt" style={numericStyle}>
        {invoice.chargedAt}
      </span>,
      <span key="period" style={numericStyle}>
        {invoice.periodStart} ~ {invoice.periodEnd}
      </span>,
      <span key="plan">{invoice.planLabel}</span>,
      <span key="amount">{formatMoney(invoice.amount)}</span>,
      <StatusBadge
        key="state"
        tone={INVOICE_TONE[invoice.state]}
        label={INVOICE_STATE_LABEL[invoice.state]}
      />,
      // 영수증이 없는 청구가 정상적으로 있다(미납·취소) — 없는 링크를 만들지 않는다
      invoice.receiptUrl === null ? (
        <span key="receipt">—</span>
      ) : (
        <a
          key="receipt"
          href={invoice.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          영수증 보기
        </a>
      ),
    ],
  }));

  return (
    <div style={panelStyle}>
      <PlanCard title="결제내역">
        <p style={hintStyle}>{INVOICE_SCOPE_NOTE}</p>

        {/* 모름은 Empty 가 아니다 — Empty 는 '없다' 를 단정하는 컴포넌트다 */}
        {invoices === null && <Alert tone="info">{INVOICES_NOT_RECEIVED}</Alert>}

        {invoices !== null && invoices.length === 0 && (
          <>
            <Empty label="구독료 청구" createVerb="발생" />
            <p style={hintStyle}>
              첫 청구가 아직 발생하지 않았어요. 다음 청구일은 결제 탭에서 확인해요.
            </p>
          </>
        )}

        {invoices !== null && invoices.length > 0 && (
          <div style={tableScrollStyle}>
            <Table
              caption="구독료 청구 내역 — 최근 건이 위에 와요. 이 표에는 행 액션이 없어요."
              columns={INVOICE_COLUMNS}
              rows={tableRows}
              empty="표시할 청구가 없어요."
            />
          </div>
        )}
      </PlanCard>
    </div>
  );
}

/* ── 화면(탭 하나만 상태다 — 실화면에서는 그 상태가 URL 에 산다) ──────────────────────────── */

function PlanScreen({
  plan,
  billing = null,
  invoices = null,
  initialTab = 'usage',
}: {
  readonly plan: DemoPlan;
  readonly billing?: SubscriptionBilling | null;
  readonly invoices?: readonly SubscriptionInvoice[] | null;
  readonly initialTab?: PlanTabId;
}) {
  const [tab, setTab] = useState<PlanTabId>(initialTab);

  const notice = billingNotice(plan);
  const change = planChangeNotice(plan);

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>플랜·이용 현황</h1>

      {/* 배너는 탭 위에 있다 — 미납·정지는 특정 탭의 사실이 아니라 이 계정의 사실이다 */}
      {(notice !== null || change !== null) && (
        <div style={noteRowStyle}>
          {/* 미납·정지는 기능을 지우지 않는다 — 조회는 그대로 열려 있고 쓰기만 잠긴다 */}
          {notice !== null && <Alert tone="warning">{notice}</Alert>}
          {/* 다운그레이드 예고 — 무엇이 사라지는지는 말하지 않는다 */}
          {change !== null && <Alert tone="info">{change}</Alert>}
        </div>
      )}

      <Tabs
        value={tab}
        items={[...PLAN_TABS]}
        ariaLabel="플랜·이용 현황 영역"
        onChange={(next) => {
          // Tabs 는 도메인을 모른다 — onChange 로 string 을 준다. 목록에서 되찾아 좁힌다
          const found = PLAN_TABS.find((item) => item.id === next);
          if (found !== undefined) setTab(found.id);
        }}
      />

      <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)}>
        {tab === 'usage' && <UsagePanel plan={plan} />}
        {tab === 'billing' && <BillingPanel plan={plan} billing={billing} />}
        {tab === 'history' && <InvoiceHistoryPanel invoices={invoices} />}
      </div>
    </div>
  );
}

/* ── 이용현황 탭 ──────────────────────────────────────────────────────────────────────────── */

/**
 * 정상(베이직): 상품 180/200 을 쓰는 중이고 프로부터 열리는 넷(쿠폰·적립금·영업 관리·고급 통계)과
 * 엔터프라이즈의 AI 에이전트가 잠겨 있다. SMS 는 발송사 계약이 없어 **행 자체가 없다**.
 */
export const Default: Story = {
  render: () => <PlanScreen plan={BASIC_PLAN} />,
};

/** 무료: 잠금이 가장 많은 상태 — 상품 쿼터도 20건으로 좁다(18/20) */
export const Free: Story = {
  render: () => <PlanScreen plan={FREE_PLAN} />,
};

/** 엔터프라이즈: 잠금 0 · 상품은 무제한 — 계약명이 티어 표시명과 다를 수 있다('2026 전사 계약') */
export const Enterprise: Story = {
  render: () => <PlanScreen plan={ENTERPRISE_PLAN} />,
};

/**
 * 다운그레이드 예고 + 쿼터 초과: '214/200' 은 버그가 아니라 정상적으로 존재하는 상태다.
 * 이미 등록한 상품을 지우지 않고 신규 등록만 잠근다 — 어느 항목이 초과분인지는 앱이 정하지 않는다.
 */
export const Downgrade: Story = {
  render: () => <PlanScreen plan={DOWNGRADE_PLAN} />,
};

/** 결제 지연: 배너가 탭 위에 있어 이용현황을 보고 있어도 조회 전용이라는 사실이 보인다 */
export const PastDue: Story = {
  render: () => <PlanScreen plan={PAST_DUE_PLAN} />,
};

/* ── 결제 탭 ──────────────────────────────────────────────────────────────────────────────── */

/**
 * 결제 탭 · **모름**(기본): 백엔드가 붙기 전 이 화면의 실제 모습이다.
 * '₩0' 도 '등록된 카드 없음' 도 아니다 — 화면이 모른다는 사실을 그대로 말한다.
 */
export const Billing: Story = {
  render: () => <PlanScreen plan={BASIC_PLAN} initialTab="billing" />,
};

/** 결제 탭 · 값을 받았을 때: 아는 값은 그대로 말한다 */
export const BillingKnown: Story = {
  render: () => <PlanScreen plan={ENTERPRISE_PLAN} billing={KNOWN_BILLING} initialTab="billing" />,
};

/**
 * 결제 탭 · 문서는 받았지만 칸이 비었을 때: 다섯 칸이 전부 '확인할 수 없음' 이다.
 * '받지 못했다'(위 Billing)와 다른 사실이라 문장도 다르다.
 */
export const BillingPartial: Story = {
  render: () => <PlanScreen plan={BASIC_PLAN} billing={PARTIAL_BILLING} initialTab="billing" />,
};

/** 결제 탭 · 결제 지연: 무엇이 잠겼는지(쓰기)와 무엇이 그대로인지(조회)를 함께 말한다 */
export const BillingPastDue: Story = {
  render: () => <PlanScreen plan={PAST_DUE_PLAN} billing={KNOWN_BILLING} initialTab="billing" />,
};

/** 결제 탭 · 이용 정지: 조회 전용이지만 쌓인 데이터는 지워지지 않는다 */
export const BillingSuspended: Story = {
  render: () => <PlanScreen plan={SUSPENDED_PLAN} billing={KNOWN_BILLING} initialTab="billing" />,
};

/* ── 결제내역 탭 ──────────────────────────────────────────────────────────────────────────── */

/** 결제내역 · **모름**(기본): 청구가 없다고 단정하지 않는다 — 이 화면 최악의 결함이 그것이다 */
export const History: Story = {
  render: () => <PlanScreen plan={BASIC_PLAN} initialTab="history" />,
};

/** 결제내역 · 0건: 받았고 정말 없다. 여기서는 단정해도 된다 — 위 History 와 문장이 다르다 */
export const HistoryEmpty: Story = {
  render: () => <PlanScreen plan={BASIC_PLAN} invoices={[]} initialTab="history" />,
};

/**
 * 결제내역 · 목록: 미납 건에는 영수증 링크가 없고, 환불 건의 계약명은 그때의 이름('베이직 플랜')이다.
 * 행 액션이 없다 — 이 표는 우리가 **낸** 돈이고, 입금을 확인하는 화면(/sales/billing)이 아니다.
 */
export const HistoryList: Story = {
  render: () => <PlanScreen plan={PAST_DUE_PLAN} invoices={INVOICES} initialTab="history" />,
};
