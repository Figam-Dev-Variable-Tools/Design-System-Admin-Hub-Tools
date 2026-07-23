// 플랜·엔타이틀먼트 모델 — 이 어드민이 **받는 쪽**인 두 번째 게이팅 축
//
// ┌ 두 축은 서로 다른 질문에 답한다 ─────────────────────────────────────────┐
// │ 권한(RBAC, shared/permissions)  = **이 사용자**가 이 화면에서 무엇을 할 수 │
// │                                   있는가 (계정 안의 사실)                 │
// │ 엔타이틀먼트(이 폴더)           = **이 계정**이 그 기능을 샀는가          │
// │                                   (구독·결제·계약이 정하는 계정 밖 사실)  │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [판정 순서 — 플랜이 권한보다 먼저다. 이유가 전부다]
//   ① 인증        → 없으면 /login
//   ② 엔타이틀먼트 → 없으면 숨김(absent) 또는 잠금(locked · UpgradeScreen)
//   ③ 권한(RBAC)  → 없으면 403 (ForbiddenScreen)
//   ④ 도메인 설정  → off 면 화면 안에서 문맥 전환 (PG 스위치 등)
// 플랜은 계정 단위 사실이고 권한은 사용자 단위 사실이다. **사지 않은 기능에 '권한이 없습니다'**
// 라고 말하면 운영자는 관리자에게 권한을 요청하고, 관리자도 켤 수 없어 지원 티켓이 된다.
// 순서를 뒤집으면 진단이 틀린다 — 그래서 RequireEntitlement 가 RequirePermission **바깥**이다.
//
// [실패 방향이 권한과 정반대다 — 이 파일에서 가장 중요한 문장]
//   권한은 fail-**closed**: 모르면 막는다(모르는 채로 권한을 주면 그것이 사고다).
//   엔타이틀먼트는 fail-**open**: 모르면 연다(가용성 우선).
// 이 리포의 기존 이음매는 전부 fail-closed 관성이라(roleAssigneeCountOf 가 null 이면 삭제 거절,
// resources 의 GRANT_OFF …) 그 모양을 그대로 복사하면 **'엔타이틀먼트 조회 실패 = 전 기능 정지'**
// 가 된다. 고객이 돈을 낸 기능이 우리 조회 실패로 멈추는 것은 어떤 과금 실수보다 나쁘다.
// 그래서 이 파일의 모든 '모르겠다' 경로는 granted 로 수렴한다:
//   - 저장값 없음/파손        → DEFAULT_PLAN_STATE(전 기능 가용)
//   - 키가 응답에 없음        → granted (앱이 서버 카탈로그보다 앞서 있을 뿐이다)
//   - 경로에 매핑이 없음      → granted (route-entitlement.ts)
//
// TODO(backend): GET /api/tenant/entitlements → PlanState
//   · webhook /entitlements.updated (사내 어드민이 구독·결제·계약 변경 시 발행)
//   · 응답 바디 { version, tier, planLabel, entitlements, overrides, billingState, effectiveAt }
//   ⚠ 엔타이틀먼트를 액세스 토큰 클레임에 싣지 않는다 — 플랜 변경이 토큰 만료까지 반영되지 않는다.
// TODO(backend): 서버에서 동일 판정을 재검증한다 — 프론트 게이팅은 UX 층이지 보안이 아니다.

/* ── 플랜 티어 ─────────────────────────────────────────────────────────────── */

/** 낮은 순서 → 높은 순서. 배열 순서가 곧 포함 관계다(상위 티어는 하위 티어를 전부 포함한다) */
export const PLAN_TIERS = ['free', 'basic', 'pro', 'enterprise'] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

/**
 * 표시명 — **여기 한 벌만 둔다.**
 *
 * 잠금 화면의 '상위 플랜' 문구, 사이드바 배지, 플랜 화면의 제목이 같은 이름을 말해야 한다.
 * 두 벌이 되면 티어를 하나 추가한 날 한쪽에만 늘어나고 운영자는 화면마다 다른 이름을 본다
 * (shared/commerce/payment-settings.ts 의 PAYMENT_PROVIDER_LABEL 과 같은 판단).
 */
export const PLAN_TIER_LABEL: Readonly<Record<PlanTier, string>> = {
  free: '무료',
  basic: '베이직',
  pro: '프로',
  enterprise: '엔터프라이즈',
};

function tierRank(tier: PlanTier): number {
  return PLAN_TIERS.indexOf(tier);
}

/** 이 티어가 minTier 이상인가. minTier 가 null 이면 **어떤 티어에도 없다**(판매하지 않는 모듈) */
function tierIncludes(minTier: PlanTier | null, tier: PlanTier): boolean {
  return minTier !== null && tierRank(tier) >= tierRank(minTier);
}

/* ── 청구 상태 ─────────────────────────────────────────────────────────────── */

/**
 * 미납·정지는 기능을 **지우지 않는다**. 전부 읽기 전용으로 내려앉을 뿐이다 —
 * 데이터를 못 보게 만들면 운영자는 무엇을 결제해야 하는지조차 확인할 수 없다.
 */
export const BILLING_STATES = ['active', 'past_due', 'suspended'] as const;

export type BillingState = (typeof BILLING_STATES)[number];

export const BILLING_STATE_LABEL: Readonly<Record<BillingState, string>> = {
  active: '정상',
  past_due: '결제 지연',
  suspended: '이용 정지',
};

/* ── 값의 형태 3종 ─────────────────────────────────────────────────────────── */

/**
 * 엔타이틀먼트 값 — Chargebee 의 4종에서 Range 를 뺐다.
 *
 * Range(구간 과금)는 사용량을 서버가 집계해야 성립하는데 이 앱에는 그 집계가 없다.
 * 프론트가 흉내 내면 화면이 말하는 숫자와 청구서의 숫자가 갈라진다 — 그래서 아예 두지 않는다.
 */
export type Entitlement =
  | { readonly kind: 'switch'; readonly enabled: boolean }
  | { readonly kind: 'quota'; readonly limit: number | 'unlimited'; readonly usage: number }
  | { readonly kind: 'level'; readonly level: string };

/** level 종의 '없음' — 이 값이면 그 모듈은 꺼진 것으로 읽는다 */
const LEVEL_NONE = 'none';

/* ── 판정 결과 3상태 ───────────────────────────────────────────────────────── */

/**
 * 판정 결과는 3상태다 — **boolean 하나로 뭉치면 숨김과 잠금을 구분할 수 없다.**
 *
 * 숨김(absent)과 잠금(locked)은 운영자가 해야 할 행동이 다르다:
 *   locked → 사내 홈페이지에서 상위 플랜으로 올린다 (살 수 있다)
 *   absent → 할 수 있는 일이 없다 (살 수 없는 것을 티저하면 노이즈다)
 * 그래서 reason·upgradeTo 를 상태와 **한 벌로** 낸다. 화면이 사유 문구를 각자 짓지 않게 하는 것이
 * shared/commerce/payment-settings.ts 의 checkoutCta(kind+label+reason)와 같은 형태다.
 */
export type EntitlementState =
  | { readonly kind: 'granted' }
  | { readonly kind: 'locked'; readonly reason: string; readonly upgradeTo: PlanTier }
  | { readonly kind: 'absent' };

const GRANTED: EntitlementState = { kind: 'granted' };
const ABSENT: EntitlementState = { kind: 'absent' };

/* ── 모듈 카탈로그 ─────────────────────────────────────────────────────────── */

/**
 * 엔타이틀먼트 키는 **기능(모듈) 단위이지 화면이 아니다.**
 *
 * 화면은 늘고 줄고 이름이 바뀌지만 '무엇을 팔았는가' 는 그보다 훨씬 안정적이다. 키를 화면에
 * 매달면 메뉴를 하나 쪼갤 때마다 상용 패키징이 흔들린다 — 화면과의 연결은 파생값으로 두고
 * (module-resources.ts) 이 목록은 계약서에서 읽히는 낱말만 갖는다.
 */
export const ENTITLEMENT_KEYS = [
  'commerce.orders',
  'commerce.products',
  'commerce.coupons',
  'commerce.points',
  'commerce.shipping',
  'sales.pipeline',
  'cms.pages',
  'marketing.email',
  'marketing.sms',
  'ai.agent',
  'stats.advanced',
] as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

/**
 * 모듈 한 줄의 정의.
 *
 * [minTier === null 은 '어떤 플랜에도 번들되지 않는다' 다]
 * 티어 사다리로 팔지 않는 모듈이다(예: SMS — 발송사와의 별도 계약이 있어야 켤 수 있다). 그래서
 *   ① entitlementsForTier 는 이 키를 **아예 넣지 않는다** → 응답에 없으면 granted(fail-open)
 *   ② 사내 어드민이 명시적으로 꺼서 보내면 → **absent**(잠금이 아니라 완전 숨김)
 * 살 수 없는 것에 자물쇠를 달면 운영자는 결제 페이지를 뒤지다 아무것도 찾지 못한다 — 그래서
 * 이 값이 locked / absent 를 가르는 유일한 기준이다.
 *
 * [description 은 잠금 화면이 쓴다] '무엇을 사는 것인지' 를 잠금 화면이 스스로 지어내면 모듈마다
 * 말투가 갈린다. 기능 설명의 정본은 카탈로그다.
 */
type ModuleSpec = {
  readonly key: EntitlementKey;
  readonly label: string;
  readonly description: string;
  readonly minTier: PlanTier | null;
} & (
  | { readonly kind: 'switch' }
  | { readonly kind: 'quota'; readonly limits: Readonly<Record<PlanTier, number | 'unlimited'>> }
  | { readonly kind: 'level'; readonly levels: Readonly<Record<PlanTier, string>> }
);

/** level 종의 표시명 — 화면이 'advanced' 를 그대로 찍지 않게 한다 */
export const LEVEL_LABEL: Readonly<Record<string, string>> = {
  [LEVEL_NONE]: '미포함',
  basic: '기본',
  advanced: '고급',
};

export const MODULE_SPECS: readonly ModuleSpec[] = [
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
    // 다운그레이드해도 이미 등록한 상품은 지우지 않는다 — 초과분은 '201/200' 으로만 말하고
    // 신규 등록만 잠근다(권한 액션 5종 중 create 만 끈다).
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
    // 티어 번들이 아니다 — 발신번호 등록과 발송사 계약이 따로 있어야 켤 수 있어 플랜을 올려도
    // 저절로 열리지 않는다. 그래서 잠금(자물쇠)이 아니라 **계약이 없으면 완전 숨김**이 맞다.
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

const SPEC_BY_KEY: ReadonlyMap<EntitlementKey, ModuleSpec> = new Map(
  MODULE_SPECS.map((spec) => [spec.key, spec]),
);

function moduleSpecOf(key: EntitlementKey): ModuleSpec | null {
  return SPEC_BY_KEY.get(key) ?? null;
}

/* ── 플랜 상태 ─────────────────────────────────────────────────────────────── */

/** 저장 형태 버전 — 형태가 바뀌면 올리고, 낮은 값은 기본값으로 되돌린다(fail-open) */
export const PLAN_STATE_VERSION = 1;

export interface PlanState {
  readonly version: number;
  readonly tier: PlanTier;
  /** 계약서에 적힌 플랜 이름 — 티어 표시명과 다를 수 있다('프로 연간', '2026 전사 계약' 등) */
  readonly planLabel: string;
  readonly entitlements: Readonly<Record<EntitlementKey, Entitlement>>;
  /**
   * 티어 정의를 **이기는** 개별 예외.
   *
   * 영업 예외·grandfathering 은 여기로만 표현하고 티어 정의를 고객별로 포크하지 않는다.
   * 포크하면 '프로 플랜' 이라는 낱말이 고객 수만큼 갈라져 어떤 화면도 옳은 말을 할 수 없게 된다
   * (Chargebee 의 entitlement_overrides 와 같은 자리).
   */
  readonly overrides: Partial<Readonly<Record<EntitlementKey, Entitlement>>>;
  readonly billingState: BillingState;
  /** 예고된 플랜 변경의 적용 시각(ISO). 미래면 예고 배너를 띄운다. 없으면 null */
  readonly effectiveAt: string | null;
}

/**
 * 이 티어가 갖는 엔타이틀먼트 한 벌 — 티어 정의의 유일한 생성기(카탈로그가 정본이다).
 *
 * 번들되지 않는 모듈(minTier === null)은 **키 자체를 넣지 않는다.** 티어가 그 모듈에 대해 할 말이
 * 없다는 뜻이고, 말이 없으면 granted 로 읽힌다(fail-open) — 끄는 것은 사내 어드민이 명시적으로
 * 보낼 때뿐이다.
 */
export function entitlementsForTier(tier: PlanTier): Readonly<Record<EntitlementKey, Entitlement>> {
  const entries = MODULE_SPECS.filter((spec) => spec.minTier !== null).map(
    (spec): readonly [EntitlementKey, Entitlement] => {
      const included = tierIncludes(spec.minTier, tier);

      if (spec.kind === 'quota') {
        return [spec.key, { kind: 'quota', limit: included ? spec.limits[tier] : 0, usage: 0 }];
      }
      if (spec.kind === 'level') {
        return [spec.key, { kind: 'level', level: included ? spec.levels[tier] : LEVEL_NONE }];
      }
      return [spec.key, { kind: 'switch', enabled: included }];
    },
  );

  return Object.fromEntries(entries) as Readonly<Record<EntitlementKey, Entitlement>>;
}

/**
 * 아직 사내 어드민이 아무것도 주지 않았을 때의 상태 — **전 기능 가용**이다.
 *
 * [왜 가장 낮은 티어가 아닌가] 이 앱에는 백엔드가 없다. 즉 '주입 전' 이 정상 상태다. 그때 기본값을
 * 낮은 티어로 두면 이 층을 추가한 것만으로 기존 화면 절반이 사라진다 — 엔타이틀먼트 축이 존재하지도
 * 않던 어제와 오늘의 앱이 달라지면 안 된다. 실패 방향(fail-open)과도 같은 방향이다.
 * 낮은 티어의 화면을 보려면 스토어의 재현 액션(entitlement-store 의 devSetTier)이나 저장값
 * (localStorage `tds-admin.plan`)을 바꾼다 — 화면에는 그 손잡이가 없다(플랜 화면 머리말).
 */
export const DEFAULT_PLAN_STATE: PlanState = {
  version: PLAN_STATE_VERSION,
  tier: 'enterprise',
  planLabel: `${PLAN_TIER_LABEL.enterprise} 플랜`,
  entitlements: entitlementsForTier('enterprise'),
  overrides: {},
  billingState: 'active',
  effectiveAt: null,
};

/** 티어 하나로 만든 플랜 상태 — 개발용 전환 패널과 테스트가 같은 생성기를 쓴다 */
export function planStateForTier(tier: PlanTier): PlanState {
  return {
    version: PLAN_STATE_VERSION,
    tier,
    planLabel: `${PLAN_TIER_LABEL[tier]} 플랜`,
    entitlements: entitlementsForTier(tier),
    overrides: {},
    billingState: 'active',
    effectiveAt: null,
  };
}

/* ── 판정 ──────────────────────────────────────────────────────────────────── */

/**
 * 지금 유효한 값 — **overrides 가 tier 를 이긴다.**
 *
 * 키가 어느 쪽에도 없으면 undefined 를 돌려주고, 호출부는 그것을 granted 로 읽는다(fail-open).
 * 응답에 없는 키는 '이 계정이 못 산 기능' 이 아니라 **'서버 카탈로그가 앱보다 오래됐다'** 일
 * 가능성이 훨씬 높다 — 그것을 차단으로 읽으면 새 모듈이 출시일에 전 고객에게서 사라진다
 * (shared/permissions/resources.ts 의 unseenResourceGrant 가 배운 것과 같은 교훈이다).
 */
export function resolveEntitlement(plan: PlanState, key: EntitlementKey): Entitlement | undefined {
  return plan.overrides[key] ?? plan.entitlements[key];
}

/** 값 자체가 '켜져 있는가' — 3상태로 옮기기 전의 단순 판정 */
function entitlementEnabled(value: Entitlement): boolean {
  if (value.kind === 'switch') return value.enabled;
  // 한도 0 은 '쓸 수 없다' 다. 쿼터 소진(200/200)과는 다르다 — 그쪽은 생성만 막고 화면은 연다.
  if (value.kind === 'quota') return value.limit === 'unlimited' || value.limit > 0;
  return value.level !== LEVEL_NONE;
}

function lockReason(spec: ModuleSpec, upgradeTo: PlanTier): string {
  return `${spec.label} 기능은 ${PLAN_TIER_LABEL[upgradeTo]} 플랜부터 사용할 수 있어요.`;
}

/**
 * 이 모듈의 판정 3상태.
 *
 * 꺼져 있을 때 잠금인지 숨김인지는 **카탈로그의 minTier** 가 정한다:
 *   minTier 가 있다 → 상위 플랜에서 살 수 있다      → locked (자물쇠 + 업그레이드 안내)
 *   minTier 가 null → 어떤 플랜에도 없다(판매 안 함) → absent (메뉴째 사라진다)
 */
export function entitlementStateOf(plan: PlanState, key: EntitlementKey): EntitlementState {
  const value = resolveEntitlement(plan, key);
  // 모르면 연다 — 권한 축과 실패 방향이 정반대라는 사실을 여기서 한 번 더 못박는다
  if (value === undefined) return GRANTED;
  if (entitlementEnabled(value)) return GRANTED;

  const spec = moduleSpecOf(key);
  // 카탈로그에 없는 키가 꺼져 있다 — 무엇을 사야 하는지 말할 수 없으므로 열어 둔다(fail-open)
  if (spec === null) return GRANTED;
  if (spec.minTier === null) return ABSENT;

  return { kind: 'locked', reason: lockReason(spec, spec.minTier), upgradeTo: spec.minTier };
}

/* ── 청구 상태 → 읽기 전용 ─────────────────────────────────────────────────── */

/**
 * 미납·정지면 전부 읽기 전용으로 내려앉는다 — 기능을 지우지 않는다.
 *
 * 잠금은 값을 지우지 않는다는 원칙의 연장이다: 결제가 밀렸다고 데이터를 감추면 운영자는 무엇을
 * 결제해야 하는지도 확인할 수 없다. 볼 수는 있게 두고 쓰기만 막는다.
 */
export function planReadOnly(plan: PlanState): boolean {
  return plan.billingState !== 'active';
}

/** 읽기 전용으로 내려앉은 이유 — 정상이면 null(배너를 그리지 않는다) */
export function billingNotice(plan: PlanState): string | null {
  if (plan.billingState === 'past_due') {
    return '결제가 확인되지 않아 지금은 조회만 가능해요. 사내 홈페이지에서 결제 상태를 확인해 주세요.';
  }
  if (plan.billingState === 'suspended') {
    return '구독이 정지되어 지금은 조회만 가능해요. 사내 홈페이지에서 구독을 다시 활성화해 주세요.';
  }
  return null;
}

/* ── 쿼터 ──────────────────────────────────────────────────────────────────── */

export interface QuotaStatus {
  readonly key: EntitlementKey;
  readonly label: string;
  readonly limit: number | 'unlimited';
  readonly usage: number;
  /** 한도를 채웠거나 넘겼는가 — 넘긴 상태(201/200)는 다운그레이드 직후에 정상적으로 존재한다 */
  readonly exhausted: boolean;
  /** '상품 200/200' — 어느 항목이 초과분인지는 **앱이 정하지 않는다.** 숫자로만 말한다 */
  readonly text: string;
}

/** 쿼터 종이 아니면 null — switch/level 모듈에는 셀 것이 없다 */
export function quotaStatusOf(
  plan: PlanState,
  key: EntitlementKey,
  usage: number | null = null,
): QuotaStatus | null {
  const value = resolveEntitlement(plan, key);
  if (value === undefined || value.kind !== 'quota') return null;

  const spec = moduleSpecOf(key);
  const label = spec === null ? key : spec.label;
  // 실제 사용량은 픽스처가 안다 — 주입된 값이 있으면 그것이 이긴다(entitlement-store 의 조회기)
  const used = usage ?? value.usage;
  const limit = value.limit;

  return {
    key,
    label,
    limit,
    usage: used,
    exhausted: limit !== 'unlimited' && used >= limit,
    text:
      limit === 'unlimited'
        ? `${label} ${String(used)}건 · 무제한`
        : `${label} ${String(used)}/${String(limit)}`,
  };
}

/**
 * 신규 생성을 막아야 하는가 — 막아야 하면 그 사유 문구, 아니면 null.
 *
 * [왜 create 만인가] 다운그레이드로 한도를 넘긴 데이터는 ① 삭제하지 않고 ② 읽기·내보내기는 그대로
 * 열어 두며 ③ 어느 항목이 초과분인지 앱이 임의로 정하지 않는다. 남는 조치는 '더 만들지 못하게' 뿐이고,
 * 그것은 권한 액션 5종 중 create 하나로 이미 표현된다 — 새 개념을 만들지 않는다.
 */
export function quotaCreateBlock(
  plan: PlanState,
  key: EntitlementKey,
  usage: number | null = null,
): string | null {
  const status = quotaStatusOf(plan, key, usage);
  if (status === null || !status.exhausted) return null;
  return `${status.text} · 상위 플랜에서 늘릴 수 있어요.`;
}

/* ── 다운그레이드 예고 ─────────────────────────────────────────────────────── */

/**
 * effectiveAt 이 미래면 예고 문구, 아니면 null.
 *
 * [무엇을 말하지 않는가] '무엇이 사라지는지' 를 여기서 열거하지 않는다. 이 어드민은 받는 쪽이라
 * 다음 플랜의 엔타이틀먼트를 아직 모르고, 모르는 것을 지어내면 예고와 실제가 갈라진다.
 * 날짜와 '어디서 확인하는지' 까지만 말한다.
 */
export function planChangeNotice(plan: PlanState, now: Date = new Date()): string | null {
  if (plan.effectiveAt === null) return null;
  const at = new Date(plan.effectiveAt);
  if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) return null;
  return `${formatPlanDate(at)}에 플랜 변경이 적용돼요. 변경 내용은 사내 홈페이지에서 확인해 주세요.`;
}

/** YYYY-MM-DD — 예고 배너와 플랜 화면이 같은 형식을 쓴다 */
export function formatPlanDate(at: Date): string {
  const year = String(at.getFullYear());
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/* ── 바깥으로 나가는 길 ────────────────────────────────────────────────────── */

/**
 * 구독·결제·계약을 실제로 바꾸는 곳 — **사내 홈페이지다.**
 *
 * 이 어드민 안에 플랜 변경 UI 를 두지 않는 이유가 이 상수의 존재 이유다: 여기서 바꾸게 하면
 * 실제 계약과 어긋나는 **두 번째 정본**이 생긴다. 이 앱은 값을 받아 반영만 한다.
 */
export const PLAN_PORTAL_URL = 'https://spaceplanning.ai/pricing';

/** 플랜 현황을 읽는 화면 — 잠금 화면·배너가 여기로 보낸다 */
export const PLAN_PAGE_PATH = '/settings/plan';

/**
 * 잠긴 메뉴에 붙는 꼬리표.
 *
 * [왜 아이콘 배지가 아니라 글자인가] @tds/ui Sidebar 계약의 하위 항목은 `{ id, label, href }` 뿐이라
 * 배지를 꽂을 슬롯이 없다. 아이콘을 자물쇠로 바꾸는 방법은 최상위 잎에만 통해서 두 단계의 말이
 * 갈린다. 무엇보다 **색·아이콘만으로 상태를 전달하지 않는다**(WCAG 1.4.1) — 글자는 스크린리더가
 * 그대로 읽는다. 진짜 배지 슬롯은 Sidebar 계약을 넓혀야 하는 별도 판단이다.
 */
export const LOCKED_NAV_SUFFIX = ' · 잠금';

/* ── 저장값 방어 ───────────────────────────────────────────────────────────── */

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null;
}

function normalizeEntitlement(raw: unknown): Entitlement | null {
  if (!isRecord(raw)) return null;

  if (raw['kind'] === 'switch') {
    return { kind: 'switch', enabled: raw['enabled'] === true };
  }
  if (raw['kind'] === 'quota') {
    const limit = raw['limit'];
    const usage = raw['usage'];
    if (limit !== 'unlimited' && typeof limit !== 'number') return null;
    return { kind: 'quota', limit, usage: typeof usage === 'number' ? usage : 0 };
  }
  if (raw['kind'] === 'level') {
    const level = raw['level'];
    return typeof level === 'string' ? { kind: 'level', level } : null;
  }
  return null;
}

function normalizeEntitlementMap(raw: unknown): Partial<Record<EntitlementKey, Entitlement>> {
  const out: Partial<Record<EntitlementKey, Entitlement>> = {};
  if (!isRecord(raw)) return out;

  for (const key of ENTITLEMENT_KEYS) {
    const value = normalizeEntitlement(raw[key]);
    // 형태가 깨진 값은 **없는 것으로** 둔다 — 없으면 granted 로 읽히므로 파손이 차단이 되지 않는다
    if (value !== null) out[key] = value;
  }
  return out;
}

function normalizeTier(raw: unknown): PlanTier | null {
  return PLAN_TIERS.find((tier) => tier === raw) ?? null;
}

function normalizeBillingState(raw: unknown): BillingState {
  // 모르는 청구 상태를 정지로 읽으면 오탈자 하나가 전 고객을 읽기 전용으로 만든다 — 정상으로 읽는다
  return BILLING_STATES.find((state) => state === raw) ?? 'active';
}

/**
 * 저장값(JSON) → PlanState. **어느 갈래로 실패해도 기능이 늘어나는 쪽으로 수렴한다.**
 *
 * 티어를 못 읽으면 기본 상태(전 기능 가용)로 돌아가고, 개별 키가 깨졌으면 그 키만 없는 것으로 두어
 * granted 로 읽히게 한다. 권한 저장값 방어(normalizeMatrix)가 좁은 쪽으로 되돌리는 것과 정확히
 * 반대 방향이며, 그 이유는 이 파일 머리말에 적었다.
 */
export function normalizePlanState(raw: unknown): PlanState {
  if (!isRecord(raw)) return DEFAULT_PLAN_STATE;

  const tier = normalizeTier(raw['tier']);
  if (tier === null || raw['version'] !== PLAN_STATE_VERSION) return DEFAULT_PLAN_STATE;

  const planLabel = raw['planLabel'];
  const effectiveAt = raw['effectiveAt'];
  const stored = normalizeEntitlementMap(raw['entitlements']);

  return {
    version: PLAN_STATE_VERSION,
    tier,
    planLabel:
      typeof planLabel === 'string' && planLabel.trim() !== ''
        ? planLabel
        : `${PLAN_TIER_LABEL[tier]} 플랜`,
    // [응답에 없던 키를 티어 정의로 채우지 않는다] 채우면 **앱이 서버 카탈로그보다 앞선 순간**
    // 새 모듈이 전 고객에게서 잠긴다(minTier 가 그 계정의 티어보다 높게 잡히므로). 없는 채로 두면
    // resolveEntitlement 가 undefined 를 주고 그것은 granted 로 읽힌다 — fail-open 이 성립하는 자리다.
    //
    // 타입은 전체 Record 로 선언돼 있지만 런타임에는 키가 빌 수 있다. noUncheckedIndexedAccess 가
    // 켜져 있어 모든 소비자가 이미 `Entitlement | undefined` 를 다루므로 이 느슨함은 안전하다.
    entitlements: stored as Readonly<Record<EntitlementKey, Entitlement>>,
    overrides: normalizeEntitlementMap(raw['overrides']),
    billingState: normalizeBillingState(raw['billingState']),
    effectiveAt: typeof effectiveAt === 'string' && effectiveAt !== '' ? effectiveAt : null,
  };
}
