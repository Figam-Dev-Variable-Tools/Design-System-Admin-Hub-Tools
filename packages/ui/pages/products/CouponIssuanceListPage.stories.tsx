/**
 * Design System/Templates/Products/Coupon Issuance — 쿠폰 발급 현황·이력 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/products/coupons/issuance` → 메뉴 en = "Products"(상품 관리),
 * 화면 en = "Coupons" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Products 그룹의
 * `['/products/coupons', '쿠폰', 'Coupons']`. 발급 현황은 그 잎의 하위 경로라 별도 인벤토리 행을
 * 갖지 않는다).
 *
 * 대응 실화면: apps/admin/src/pages/products/coupons/CouponIssuanceListPage.tsx
 * (라우트 /products/coupons/issuance) 와 그 하위 조립(types.ts) · 공용 껍데기(CrudReadListShell).
 *
 * [왜 별도 화면인가] 쿠폰 목록이 답하는 질문은 '무엇을 걸어 뒀나' 이고, 여기가 답하는 질문은
 * **'그래서 얼마나 나갔고 얼마나 쓰였나'** 다. 두 질문을 한 표에 넣으면 열이 열두 개가 되고 어느
 * 쪽도 읽히지 않는다. 그래서 화면이 위아래로 갈린다: 위는 쿠폰별 요약(집계), 아래는 발급 이력(원본).
 *
 * [발급은 트리거가 만든다 — 여기서 만들지 않는다] 이력은 도메인 읽기 전용이라 선택·삭제·등록이
 * 없다(CrudReadListShell). 운영자가 하는 일은 보는 것과, 어긋난 쿠폰 설정을 고치러 가는 것뿐이라
 * 행을 누르면 그 쿠폰의 설정으로 간다.
 *
 * [두 숫자가 무엇을 세는지 화면이 밝힌다] 위 표의 '발급/사용/사용률' 은 **아래 이력 표본**에서 센
 * 값이고, '소진율' 은 쿠폰이 들고 있는 **운영 누계**(issuedCount)다. 픽스처 단계라 둘이 다르므로
 * 캡션이 각각 무엇인지 적어 둔다 — 숫자가 어긋나 보이는 것을 버그로 오해하지 않게.
 *
 * [트리거는 사용 대상과 다른 축이다] '누구에게 쓸 수 있나(target)' 와 '언제 손에 들어오나
 * (trigger)' 는 다른 질문이라 배지도 따로 선다. 여섯 기준(수동·가입·첫구매·등급승급·생일·다운로드)이
 * 픽스처에 모두 한 번씩 등장한다 — 화면의 분기가 데이터에서 실제로 밟힌다.
 *
 * [만료일은 발급 1건마다 다르다] '발급일로부터 30일' 쿠폰을 캠페인 마지막 날 받으면 산술로는
 * 캠페인이 끝난 뒤에도 30일이 남는다. 그래서 둘 중 **빠른 날**이 만료다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   Card + CardTitle  → Card + 토큰 <h2>
 *   raw <table>       → DS Table (요약 표 · 이력 표 모두)
 *   CrudReadListShell → DS Table(leadingHead=순번만 · 선택 열 없음) + 툴바 + 요약 줄
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   회원·쿠폰명 검색           → SearchField
 *   쿠폰 · 발급 기준 필터       → SelectField ×2
 *   쿠폰별 요약 표             → Table (발급·사용·소진율은 align='end')
 *   사용률 배지                → StatusBadge (0% warning · 50% 이상 success · 그 사이 info)
 *   트리거별 발급 배지          → StatusBadge(info) ×N — 발급이 없으면 '발급 없음'
 *   순번 열                   → SeqHeaderCell · SeqCell (선택 열은 없다)
 *   사용 여부 배지             → StatusBadge (미사용 neutral · 'YYYY-MM-DD 사용' success)
 *   쿠폰 설정으로 가는 링크      → 토큰 <a>
 *   발급 이력 표               → Table
 *   빈 결과                   → Empty (검색 지우기 · 필터 초기화)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';

import {
  Card,
  Empty as EmptyState,
  SearchField,
  SelectField,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Coupon Issuance',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 products/coupons/types.ts 미러) ──────────────────────────────────────── */

/** 발급 기준의 종류 — 발급 이력의 '어디서 왔는가' 축이기도 하다 */
type TriggerType = 'manual' | 'signup' | 'tier_up' | 'birthday' | 'first_order' | 'download';

const TRIGGER_OPTIONS: readonly { readonly id: TriggerType; readonly label: string }[] = [
  { id: 'manual', label: '운영자 직접 발급' },
  { id: 'signup', label: '회원 가입 시' },
  { id: 'tier_up', label: '회원 등급 승급 시' },
  { id: 'birthday', label: '생일' },
  { id: 'first_order', label: '첫 구매' },
  { id: 'download', label: '고객 다운로드' },
];

const TRIGGER_LABEL: Readonly<Record<TriggerType, string>> = {
  manual: '운영자 직접 발급',
  signup: '회원 가입 시',
  tier_up: '회원 등급 승급 시',
  birthday: '생일',
  first_order: '첫 구매',
  download: '고객 다운로드',
};

type MemberTier = 'normal' | 'vip' | 'vvip';

const TIER_LABEL: Readonly<Record<MemberTier, string>> = {
  normal: '일반회원',
  vip: 'VIP',
  vvip: 'VVIP',
};

/**
 * 발급 기준 — **종류마다 필요한 값이 달라 판별 유니온이다.**
 * 평평한 객체로 두면 '가입 시 발급인데 승급 등급이 VVIP' 같은 말이 안 되는 값이 만들어진다.
 */
type CouponTrigger =
  | { readonly type: 'manual' }
  | { readonly type: 'signup' }
  | { readonly type: 'tier_up'; readonly tier: MemberTier }
  | { readonly type: 'birthday'; readonly daysBefore: number }
  | { readonly type: 'first_order' }
  | { readonly type: 'download'; readonly from: string; readonly to: string };

/**
 * 사용 기간의 두 방식 — 캠페인 기간(startAt~endAt)과는 다른 축이다.
 * 가입 축하 쿠폰은 캠페인이 석 달이어도 **한 장은 발급일로부터 30일**이다.
 */
type UsagePeriod =
  { readonly kind: 'fixed' } | { readonly kind: 'days_from_issue'; readonly days: number };

const FILTER_ALL = 'all';
type TriggerFilter = typeof FILTER_ALL | TriggerType;
type CouponFilter = typeof FILTER_ALL | string;

/* ── 데모 데이터(실화면 COUPON_SEED · ISSUANCE_SEED 미러 — 회원 이름은 전부 가상이다) ────────── */

interface DemoCoupon {
  readonly id: string;
  readonly name: string;
  readonly trigger: CouponTrigger;
  readonly usagePeriod: UsagePeriod;
  /** 발급 수량 — 0 이면 무제한 */
  readonly totalQuantity: number;
  /** 발급(다운로드)된 **운영 누계** — 아래 이력 표본과 다른 숫자다 */
  readonly issuedCount: number;
  readonly endAt: string;
}

/** 사용기간 내림차순(최근 시작이 위) — 실화면 sortCoupons 가 낸 순서 그대로 */
const DEMO_COUPONS: readonly DemoCoupon[] = [
  {
    id: 'cpn-3',
    name: '무료배송 데이',
    trigger: { type: 'download', from: '2026-08-01', to: '2026-08-05' },
    usagePeriod: { kind: 'fixed' },
    totalQuantity: 0,
    issuedCount: 3120,
    endAt: '2026-08-07',
  },
  {
    id: 'cpn-5',
    name: '크로스백 단독 3,000원',
    trigger: { type: 'manual' },
    usagePeriod: { kind: 'fixed' },
    totalQuantity: 200,
    issuedCount: 18,
    endAt: '2026-08-20',
  },
  {
    id: 'cpn-1',
    name: '신규 가입 15% 할인',
    trigger: { type: 'signup' },
    usagePeriod: { kind: 'days_from_issue', days: 30 },
    totalQuantity: 1000,
    issuedCount: 640,
    endAt: '2026-09-30',
  },
  {
    id: 'cpn-7',
    name: 'VVIP 승급 20% 쿠폰',
    trigger: { type: 'tier_up', tier: 'vvip' },
    usagePeriod: { kind: 'days_from_issue', days: 90 },
    totalQuantity: 100,
    issuedCount: 24,
    endAt: '2026-12-31',
  },
  {
    id: 'cpn-2',
    name: 'VIP 승급 축하 5,000원',
    trigger: { type: 'tier_up', tier: 'vip' },
    usagePeriod: { kind: 'days_from_issue', days: 60 },
    // 발급 수량을 다 쓴 쿠폰 — 소진율 100%
    totalQuantity: 500,
    issuedCount: 500,
    endAt: '2026-08-31',
  },
  {
    id: 'cpn-4',
    name: '아우터 카테고리 10% 쿠폰',
    trigger: { type: 'first_order' },
    usagePeriod: { kind: 'fixed' },
    totalQuantity: 300,
    issuedCount: 45,
    endAt: '2026-06-30',
  },
  {
    id: 'cpn-6',
    name: '생일 축하 10% 쿠폰',
    trigger: { type: 'birthday', daysBefore: 7 },
    usagePeriod: { kind: 'days_from_issue', days: 30 },
    totalQuantity: 0,
    issuedCount: 212,
    endAt: '2026-12-31',
  },
];

/**
 * 발급 1건 — 회원이 들고 있는 쿠폰의 **관리자 쪽 기록**.
 * 회원 상세의 보유 쿠폰과 같은 사건을 반대편에서 본 것이다.
 */
interface DemoIssuance {
  readonly id: string;
  readonly couponId: string;
  /** 어느 발급 기준이 이 건을 냈는가 — 트리거별 집계의 축 */
  readonly source: TriggerType;
  readonly member: string;
  readonly issuedAt: string;
  /** 사용일 — 미사용이면 null */
  readonly usedAt: string | null;
}

const DEMO_ISSUANCES: readonly DemoIssuance[] = [
  {
    id: 'iss-1',
    couponId: 'cpn-1',
    source: 'signup',
    member: '초록달팽이',
    issuedAt: '2026-07-02',
    usedAt: '2026-07-05',
  },
  {
    id: 'iss-2',
    couponId: 'cpn-1',
    source: 'signup',
    member: '바다안개',
    issuedAt: '2026-07-04',
    usedAt: null,
  },
  // 자동 발급 쿠폰이라도 운영자가 손으로 한 장 더 줄 수 있다 — 트리거는 발급 1건의 출처다
  {
    id: 'iss-3',
    couponId: 'cpn-1',
    source: 'manual',
    member: '느린우체통',
    issuedAt: '2026-07-06',
    usedAt: '2026-07-09',
  },
  {
    id: 'iss-4',
    couponId: 'cpn-2',
    source: 'tier_up',
    member: '노을그림자',
    issuedAt: '2026-06-11',
    usedAt: '2026-06-20',
  },
  {
    id: 'iss-5',
    couponId: 'cpn-2',
    source: 'tier_up',
    member: '겨울나무',
    issuedAt: '2026-06-18',
    usedAt: null,
  },
  {
    id: 'iss-6',
    couponId: 'cpn-3',
    source: 'download',
    member: '푸른새벽',
    issuedAt: '2026-08-01',
    usedAt: '2026-08-03',
  },
  {
    id: 'iss-7',
    couponId: 'cpn-3',
    source: 'download',
    member: '조약돌하나',
    issuedAt: '2026-08-02',
    usedAt: null,
  },
  {
    id: 'iss-8',
    couponId: 'cpn-4',
    source: 'first_order',
    member: '모래시계',
    issuedAt: '2026-05-14',
    usedAt: '2026-05-30',
  },
  {
    id: 'iss-9',
    couponId: 'cpn-5',
    source: 'manual',
    member: '고요한숲',
    issuedAt: '2026-07-12',
    usedAt: null,
  },
  {
    id: 'iss-10',
    couponId: 'cpn-6',
    source: 'birthday',
    member: '연둣빛오후',
    issuedAt: '2026-07-15',
    usedAt: '2026-07-19',
  },
  {
    id: 'iss-11',
    couponId: 'cpn-6',
    source: 'birthday',
    member: '작은등대',
    issuedAt: '2026-07-18',
    usedAt: null,
  },
  {
    id: 'iss-12',
    couponId: 'cpn-7',
    source: 'tier_up',
    member: '별헤는밤',
    issuedAt: '2026-06-25',
    usedAt: '2026-07-02',
  },
];

/* ── 순수 규칙(실화면 미러) ───────────────────────────────────────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 날짜를 하루 단위로 민다 — UTC 로만 계산해 뷰어의 표준시가 결과를 흔들지 않게 한다 */
function shiftDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * 발급 기준 한 줄 요약 — 파라미터를 문구에 실어야 규칙이 읽힌다.
 * 'VIP 승급 시' 와 'VVIP 승급 시' 는 다른 정책인데 둘 다 '회원 등급 승급 시' 로만 보이면 구분할 수 없다.
 */
function triggerSummary(trigger: CouponTrigger): string {
  switch (trigger.type) {
    case 'manual':
      return '운영자 직접 발급';
    case 'signup':
      return '회원 가입 시';
    case 'tier_up':
      return `${TIER_LABEL[trigger.tier]} 승급 시`;
    case 'birthday':
      return trigger.daysBefore === 0 ? '생일 당일' : `생일 ${fmt(trigger.daysBefore)}일 전`;
    case 'first_order':
      return '첫 구매 시';
    case 'download':
      return `고객 다운로드 (${trigger.from} ~ ${trigger.to})`;
  }
}

/**
 * 이 발급 1건의 실제 만료일 — 캠페인 종료일과 산술 만료일 중 **빠른 날**이다.
 * 그러지 않으면 쿠폰이 끝났는데 쓸 수 있다고 말하는 화면이 된다.
 */
function couponExpiryFor(coupon: DemoCoupon, issuedAt: string): string {
  if (coupon.usagePeriod.kind === 'fixed') return coupon.endAt;
  const byDays = shiftDays(issuedAt, coupon.usagePeriod.days);
  return byDays < coupon.endAt ? byDays : coupon.endAt;
}

/** 소진율(%) — 발급수량 대비 발급된 누계. 무제한(0)이면 0 */
function usageRate(coupon: DemoCoupon): number {
  if (coupon.totalQuantity <= 0) return 0;
  return Math.min(100, Math.round((coupon.issuedCount / coupon.totalQuantity) * 100));
}

interface IssuanceStats {
  readonly issued: number;
  readonly used: number;
  readonly usedRate: number;
  /** 트리거별 발급 건수 — 여섯 키가 **항상** 있어 화면이 폴백을 적지 않는다 */
  readonly bySource: Readonly<Record<TriggerType, number>>;
}

function summarizeIssuances(list: readonly DemoIssuance[]): IssuanceStats {
  const bySource: Record<TriggerType, number> = {
    manual: 0,
    signup: 0,
    tier_up: 0,
    birthday: 0,
    first_order: 0,
    download: 0,
  };
  let used = 0;
  for (const entry of list) {
    bySource[entry.source] += 1;
    if (entry.usedAt !== null) used += 1;
  }
  const issued = list.length;
  return {
    issued,
    used,
    usedRate: issued === 0 ? 0 : Math.round((used / issued) * 100),
    bySource,
  };
}

/** 쿠폰 id → 그 쿠폰의 발급 이력. `find` 로 매번 훑지 않는다(쿠폰 수 × 발급 수만큼 돈다) */
function issuancesByCoupon(
  list: readonly DemoIssuance[],
): Readonly<Record<string, readonly DemoIssuance[]>> {
  const byCoupon: Record<string, DemoIssuance[]> = {};
  for (const entry of list) {
    const bucket = byCoupon[entry.couponId];
    if (bucket === undefined) byCoupon[entry.couponId] = [entry];
    else bucket.push(entry);
  }
  return byCoupon;
}

/** 사용률 배지 톤 — 절반을 넘기면 성공, 아무도 안 쓰면 경고(걸어 둔 의미가 없다) */
function usedRateTone(rate: number, issued: number): StatusBadgeTone {
  if (issued === 0) return 'info';
  if (rate === 0) return 'warning';
  return rate >= 50 ? 'success' : 'info';
}

const COUPON_NAMES: Readonly<Record<string, string>> = (() => {
  const names: Record<string, string> = {};
  for (const coupon of DEMO_COUPONS) names[coupon.id] = coupon.name;
  return names;
})();

/* ── 표 열 정의 ───────────────────────────────────────────────────────────────────────────── */

const SUMMARY_COLUMNS: TableProps['columns'] = [
  { id: 'coupon', header: '쿠폰' },
  { id: 'trigger', header: '발급 기준', nowrap: true },
  { id: 'issued', header: '발급', align: 'end', nowrap: true },
  { id: 'used', header: '사용', align: 'end', nowrap: true },
  { id: 'usedRate', header: '사용률', nowrap: true },
  { id: 'exhaust', header: '소진율', align: 'end', nowrap: true },
  { id: 'bySource', header: '트리거별 발급' },
];

const HISTORY_COLUMNS: TableProps['columns'] = [
  { id: 'coupon', header: '쿠폰' },
  { id: 'source', header: '발급 기준', nowrap: true },
  { id: 'member', header: '회원', nowrap: true },
  { id: 'issuedAt', header: '발급일', nowrap: true },
  { id: 'expiry', header: '만료일', nowrap: true },
  { id: 'used', header: '사용', nowrap: true },
];

const PAGE_SIZE = 8;

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

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 6)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const sourceListStyle: CSSProperties = {
  display: 'inline-flex',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const numericStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
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

function SectionCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <Card aria-labelledby={titleId}>
        <div style={cardBodyStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            {title}
          </h2>
          {children}
        </div>
      </Card>
    </section>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface CouponIssuanceScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialCoupon?: CouponFilter;
  readonly initialSource?: TriggerFilter;
}

function CouponIssuanceScreen({
  loading = false,
  initialKeyword = '',
  initialCoupon = FILTER_ALL,
  initialSource = FILTER_ALL,
}: CouponIssuanceScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [couponFilter, setCouponFilter] = useState<CouponFilter>(initialCoupon);
  const [source, setSource] = useState<TriggerFilter>(initialSource);

  const byCoupon = useMemo(() => issuancesByCoupon(DEMO_ISSUANCES), []);

  const visible = useMemo(() => {
    const bySource =
      source === FILTER_ALL
        ? DEMO_ISSUANCES
        : DEMO_ISSUANCES.filter((entry) => entry.source === source);
    const byCouponId =
      couponFilter === FILTER_ALL
        ? bySource
        : bySource.filter((entry) => entry.couponId === couponFilter);
    const needle = keyword.trim().toLowerCase();
    if (needle === '') return byCouponId;
    return byCouponId.filter(
      (entry) =>
        entry.member.toLowerCase().includes(needle) ||
        (COUPON_NAMES[entry.couponId] ?? '').toLowerCase().includes(needle),
    );
  }, [source, couponFilter, keyword]);

  const summaryRows: TableProps['rows'] = DEMO_COUPONS.map((coupon) => {
    const stats = summarizeIssuances(byCoupon[coupon.id] ?? []);
    const sources = TRIGGER_OPTIONS.filter((option) => stats.bySource[option.id] > 0);
    return {
      id: coupon.id,
      cells: [
        <a key="coupon" href="#coupon-edit" style={linkStyle}>
          {coupon.name}
        </a>,
        <span key="trigger">{triggerSummary(coupon.trigger)}</span>,
        <span key="issued" style={numericStyle}>
          {fmt(stats.issued)}
        </span>,
        <span key="used" style={numericStyle}>
          {fmt(stats.used)}
        </span>,
        <StatusBadge
          key="usedRate"
          tone={usedRateTone(stats.usedRate, stats.issued)}
          label={`${fmt(stats.usedRate)}%`}
        />,
        <span key="exhaust" style={numericStyle}>
          {coupon.totalQuantity <= 0 ? '무제한' : `${fmt(usageRate(coupon))}%`}
        </span>,
        sources.length === 0 ? (
          <span key="bySource" style={mutedStyle}>
            발급 없음
          </span>
        ) : (
          <span key="bySource" style={sourceListStyle}>
            {sources.map((option) => (
              <StatusBadge
                key={option.id}
                tone="info"
                label={`${option.label} ${fmt(stats.bySource[option.id])}`}
              />
            ))}
          </span>
        ),
      ],
    };
  });

  const historyRows: TableProps['rows'] = visible.map((entry, index) => {
    const coupon = DEMO_COUPONS.find((item) => item.id === entry.couponId);
    return {
      id: entry.id,
      onActivate: () => {
        /* 실화면: 행 클릭 → 그 쿠폰의 설정(/products/coupons/:id/edit) */
      },
      leading: [<SeqCell key="seq" seq={index + 1} />],
      cells: [
        <span key="coupon">
          {COUPON_NAMES[entry.couponId] ?? `삭제된 쿠폰 (${entry.couponId})`}
        </span>,
        <span key="source">{TRIGGER_LABEL[entry.source]}</span>,
        <span key="member">{entry.member}</span>,
        <span key="issuedAt" style={numericStyle}>
          {entry.issuedAt}
        </span>,
        <span key="expiry" style={numericStyle}>
          {coupon === undefined ? '—' : couponExpiryFor(coupon, entry.issuedAt)}
        </span>,
        entry.usedAt === null ? (
          <StatusBadge key="used" tone="neutral" label="미사용" />
        ) : (
          <StatusBadge key="used" tone="success" label={`${entry.usedAt} 사용`} />
        ),
      ],
    };
  });

  const hasActiveFilters = couponFilter !== FILTER_ALL || source !== FILTER_ALL;

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={headingStyle}>쿠폰 발급 현황</h1>
        <p style={descriptionStyle}>
          쿠폰별 발급·사용 건수와 트리거별 유입을 확인해요. 행을 누르면 해당 쿠폰 설정으로 이동해요.
        </p>
      </div>

      <SectionCard title="쿠폰별 요약">
        <p style={hintStyle}>
          발급·사용·사용률은 아래 발급 이력에서 센 값이고, 소진율은 쿠폰의 운영 누계 기준이에요.
        </p>
        <div style={tableScrollStyle}>
          <Table
            caption="쿠폰별 요약 — 발급·사용·사용률은 이력 표본에서, 소진율은 운영 누계에서 세요."
            columns={SUMMARY_COLUMNS}
            rows={summaryRows}
            loading={loading}
            skeletonRows={DEMO_COUPONS.length}
            empty="등록된 쿠폰이 없어요."
          />
        </div>
      </SectionCard>

      <div style={toolbarStyle}>
        <span style={searchWrapStyle}>
          <SearchField
            value={keyword}
            onChange={setKeyword}
            label="회원·쿠폰명 검색"
            placeholder="회원 · 쿠폰명 검색"
          />
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={couponFilter}
            aria-label="쿠폰으로 거르기"
            onChange={(event) => setCouponFilter(event.target.value)}
          >
            <option value={FILTER_ALL}>전체 쿠폰</option>
            {DEMO_COUPONS.map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.name}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={source}
            aria-label="발급 기준으로 거르기"
            onChange={(event) => {
              const next = TRIGGER_OPTIONS.find((option) => option.id === event.target.value);
              setSource(next === undefined ? FILTER_ALL : next.id);
            }}
          >
            <option value={FILTER_ALL}>전체 발급 기준</option>
            {TRIGGER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>

      <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}</p>

      <div style={tableScrollStyle}>
        <Table
          caption="발급 이력 — 행을 누르면 그 쿠폰의 설정으로 이동해요. 만료일은 캠페인 종료일과 발급일 기준 만료 중 빠른 날이에요."
          columns={HISTORY_COLUMNS}
          rows={historyRows}
          leadingHead={[<SeqHeaderCell key="seq" />]}
          loading={loading}
          skeletonRows={PAGE_SIZE}
          empty={
            <EmptyState
              label="발급 이력"
              createVerb="발급"
              hasQuery={keyword.trim() !== ''}
              hasActiveFilters={hasActiveFilters}
              onClearSearch={() => setKeyword('')}
              onResetFilters={() => {
                setCouponFilter(FILTER_ALL);
                setSource(FILTER_ALL);
              }}
            />
          }
        />
      </div>

      <p style={hintStyle}>
        <a href="#coupons" style={linkStyle}>
          쿠폰 목록으로 돌아가기
        </a>
      </p>
    </div>
  );
}

/**
 * 정상: 쿠폰 7종 요약 + 발급 이력 12건 — 여섯 트리거가 모두 한 번씩 등장한다.
 * 소진율 100%(VIP 승급)와 무제한(무료배송·생일)이 나란히 보인다.
 */
export const Default: Story = {
  render: () => <CouponIssuanceScreen />,
};

/** 최초 로드: 두 표 모두 스켈레톤 — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <CouponIssuanceScreen loading />,
};

/** 발급 기준 필터(등급 승급): 어느 등급에서 나온 건인지는 요약 표의 '발급 기준' 열이 말한다 */
export const ByTrigger: Story = {
  render: () => <CouponIssuanceScreen initialSource="tier_up" />,
};

/** 쿠폰 필터(신규 가입 15% 할인): 자동 발급 쿠폰인데 운영자가 손으로 준 한 장이 섞여 있다 */
export const ByCoupon: Story = {
  render: () => <CouponIssuanceScreen initialCoupon="cpn-1" />,
};

/** 빈 결과: 검색이 맞지 않음 — 이력 표의 empty 슬롯에 Empty(검색 지우기 · 필터 초기화) */
export const Empty: Story = {
  render: () => <CouponIssuanceScreen initialKeyword="존재하지 않는 회원" />,
};
