/**
 * Design System/Templates/Users/Consents — 동의 이력 관리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/users/consents` → 메뉴 en = "Users"(사용자 관리), 화면 en =
 * "Consents" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Users 그룹의
 * `['/users/consents', '동의 이력', 'Consents']`).
 *
 * 대응 실화면: apps/admin/src/pages/users/consents/ConsentsPage.tsx (라우트 /users/consents) 와
 * 그 세 패널(components/ConsentItemsCard · ConsentHistoryPanel · CompliancePanel) · 규칙(rules.ts).
 *
 * [탭이 셋인 이유 — 세 질문의 답이 같은 이력에서 나온다]
 *   ① 우리는 무엇에 동의를 받는가, 그중 무엇이 필수인가 → 동의 항목
 *   ② 누가 언제 무엇에 동의하고 철회했는가              → 동의 이력(append-only)
 *   ③ 지금 다시 물어야 할 사람과, 지워야 할 기록은      → 재동의 · 파기
 * 나누면 어느 화면이 정본인지 흐려지고, 항목 정의를 바꾼 결과가 다른 화면에서만 보인다.
 *
 * [/content/terms 와 무엇이 다른가] 그쪽은 **문서 본문**을 관리한다. 문서가 있다는 것과 누가
 * 그것에 동의했다는 것은 다른 사실이고, 분쟁에서 요구되는 것은 후자다.
 *
 * [필수로 바꿀 수 없는 항목이 있다 — 과태료가 걸린 판정] 마케팅 수신·선택 개인정보·제3자 제공은
 * 서비스 이용의 조건이 될 수 없다. 묶는 순간 그 동의는 자유로운 의사가 아니라 이용 조건이 되고,
 * 마케팅 수신 동의의 경우 **최대 1,000만 원의 과태료** 대상이다. 그래서 토글이 잠기고, **왜
 * 잠겼는지를 그 자리에서 말한다** — 이유 없는 disabled 는 운영자에게 고장으로 읽힌다.
 * 토글의 disabled 와 저장의 거절은 같은 술어를 읽는다: 판단이 두 벌이면 언젠가 갈라진다.
 *
 * [이력은 append-only 이고 열어 볼 상세가 없다] 고칠 수 있는 기록은 증거가 되지 못한다. 그래서
 * 수정·삭제 표면이 없고, 마음이 바뀐 것은 **철회 이벤트를 한 줄 더 쌓아** 표현한다. 현재 상태는
 * 저장되지 않고 이력의 마지막 줄에서 파생된다. 행에는 갈 곳이 없다 — 줄 자체가 사실의 전부이고,
 * 갈 곳이 없는데 커서를 pointer 로 바꾸면 그것이 조용한 무반응이다.
 *
 * [모르는 것을 0으로 그리지 않는다] 약관 조회가 미배선이면 '재동의 대상 0명' 이 아니라 **판정할
 * 수 없다는 사실**을 말한다. 0명이라고 적으면 운영자는 개정 공지를 보내지 않는다 — 배선 사고가
 * 법적 사고로 번지는 경로다. 파기 버튼도 없다: 실제 삭제는 원장·백업까지 다뤄야 하는 서버의
 * 일이고, 할 수 없는 일을 버튼으로 만들지 않는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   탭 3개                     → Tabs (+ tabId · tabPanelId 로 패널 연결)
 *   동의 항목 카드              → Card + 토큰 <h2> + StatusBadge(필수/선택 · 성격)
 *   필수/선택 토글(잠김 + 사유)  → ToggleSwitch(disabled) + 토큰 <span>
 *   규칙 거절 · 조회 권한 안내    → Alert(danger · info)
 *   이력 목록                  → Table (행 클릭 없음 · 선택 열 없음 · SeqHeaderCell/SeqCell)
 *   이력 검색 · 항목/구분 필터   → SearchField · SelectField ×2
 *   동의/철회 배지              → StatusBadge (success · warning)
 *   재동의 대상 · 파기 대상 표    → Card + Table
 *   판정 불가 안내              → Alert(warning)
 *   빈 이력                    → Empty
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Empty as EmptyState,
  SearchField,
  SelectField,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  Tabs,
  ToggleSwitch,
  cssVar,
  tabId,
  tabPanelId,
  typography,
  inlineBadgeRowStyle,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Users/Consents',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 types.ts 미러) ─────────────────────────────────────────────────────── */

/**
 * 무엇을 위한 동의인가.
 * 이 축이 필수/선택을 정하지는 않지만 **제한한다**: 마케팅·선택 개인정보·제3자 제공은 서비스
 * 이용의 조건이 될 수 없어 필수가 될 수 없다. 그래서 성격은 운영자가 고르는 값이 아니라
 * 항목이 태어날 때 정해지는 사실이다.
 */
type ConsentPurpose =
  'service' | 'privacy-essential' | 'privacy-optional' | 'third-party' | 'marketing';

const CONSENT_PURPOSE_LABEL: Readonly<Record<ConsentPurpose, string>> = {
  service: '서비스 이용',
  'privacy-essential': '개인정보 (필수)',
  'privacy-optional': '개인정보 (선택)',
  'third-party': '제3자 제공',
  marketing: '광고성 정보 수신',
};

/** 화면에서 바꿀 수 있는 유일한 축이다 — 그마저도 한쪽으로만 */
type ConsentNecessity = 'required' | 'optional';

const NECESSITY_LABEL: Readonly<Record<ConsentNecessity, string>> = {
  required: '필수',
  optional: '선택',
};

/** 필수는 강한 표시(danger 가 아니라 info — 위험이 아니라 성격이다), 선택은 중립 */
const necessityTone = (necessity: ConsentNecessity): StatusBadgeTone =>
  necessity === 'required' ? 'info' : 'neutral';

interface ConsentItemDef {
  readonly id: string;
  readonly label: string;
  /** 가입 화면에 그대로 노출되는 안내 — 무엇에 동의하는지가 여기서 끝나야 한다 */
  readonly description: string;
  readonly purpose: ConsentPurpose;
  readonly necessity: ConsentNecessity;
  /** 약관 문서가 없는 항목은 null — 없는 참조를 지어내지 않는다 */
  readonly termsTypeId: string | null;
  /**
   * 보관 기간(개월). 철회 후 이 기간이 지나면 파기 대상이다.
   * 0 이 아니라 양수인 이유: 철회 직후 지우면 '동의했었다는 사실' 자체가 사라져 분쟁 시
   * 아무것도 증명할 수 없다.
   */
  readonly retentionMonths: number;
}

/** 무슨 일이 일어났는가 — 둘뿐이다. '수정' 은 없다 */
type ConsentAction = 'granted' | 'withdrawn';

const CONSENT_ACTION_LABEL: Readonly<Record<ConsentAction, string>> = {
  granted: '동의',
  withdrawn: '철회',
};

const consentActionTone = (action: ConsentAction): StatusBadgeTone =>
  action === 'granted' ? 'success' : 'warning';

/**
 * 어디서 받은 동의인가 — **출처가 없는 동의는 증명력이 약하다.**
 * 어휘를 상수로 고정하는 이유: 자유 입력이면 같은 화면이 네 이름으로 쌓인다.
 */
const CONSENT_SOURCES = [
  { id: 'signup', label: '회원가입 폼' },
  { id: 'mypage', label: '마이페이지 설정' },
  { id: 'order', label: '주문서' },
  { id: 'inquiry', label: '문의 폼' },
  { id: 'event', label: '이벤트 응모' },
  { id: 'unsubscribe', label: '수신거부 링크' },
  { id: 'admin', label: '관리자 대행 접수' },
] as const;

type ConsentSource = (typeof CONSENT_SOURCES)[number]['id'];

const consentSourceLabel = (source: ConsentSource): string =>
  CONSENT_SOURCES.find((entry) => entry.id === source)?.label ?? source;

/**
 * 이력 한 줄 — **일어난 일의 사본이며 고쳐지지 않는다.**
 * 표시값을 함께 들고 있는 이유: 회원이 탈퇴해도 그 사람의 동의 사실은 보관 기간 동안 남아야
 * 하고, 그때 이력이 이름을 잃으면 '누구의 동의였는지 모르는 동의' 가 된다.
 * 표시값은 **마스킹된 것**만 담는다 — 관리자에게 전체 성명을 흘릴 이유가 없다.
 */
interface ConsentEvent {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectLabel: string;
  readonly itemId: string;
  readonly action: ConsentAction;
  /** 'YYYY-MM-DD HH:mm' — 스토리는 시각을 고정한다(회귀 비교가 날짜에 흔들리면 안 된다) */
  readonly occurredAt: string;
  /** 그때 보여 준 약관 버전. 약관이 없는 항목이거나 철회면 null */
  readonly termsVersion: string | null;
  readonly source: ConsentSource;
}

/* ── 순수 규칙(실화면 rules.ts 미러) ───────────────────────────────────────────────────────── */

/** 선택으로만 존재할 수 있는 성격들 — 셋 다 이용 조건으로 묶을 수 없는 동의다 */
const OPTIONAL_ONLY: readonly ConsentPurpose[] = ['marketing', 'privacy-optional', 'third-party'];

/** 필수로 세울 수 없는 항목이면 그 사유, 세울 수 있으면 null */
function forcedRequiredReason(item: ConsentItemDef): string | null {
  if (!OPTIONAL_ONLY.includes(item.purpose)) return null;
  return `‘${item.label}’ 은 ${CONSENT_PURPOSE_LABEL[item.purpose]} 동의라 필수로 바꿀 수 없어요. 이 동의를 강제하면 미동의 이용자의 가입이 막히고, 마케팅 수신 동의의 경우 최대 1,000만 원의 과태료 대상이에요.`;
}

/**
 * 이 항목을 `next` 로 바꿔도 되는가 — 안 되면 **사유 문자열**을 돌려준다.
 * boolean 이 아닌 이유: 버튼을 흐리게 만드는 판단과 저장을 거절하는 판단이 갈라지면 안 된다.
 */
const necessityChangeBlock = (item: ConsentItemDef, next: ConsentNecessity): string | null =>
  next === 'required' ? forcedRequiredReason(item) : null;

/** (회원 × 항목) 한 쌍의 **가장 최근** 사실 */
interface ConsentDecision {
  readonly subjectId: string;
  readonly subjectLabel: string;
  readonly itemId: string;
  readonly action: ConsentAction;
  readonly occurredAt: string;
  readonly termsVersion: string | null;
}

const pairKey = (subjectId: string, itemId: string): string => `${subjectId} ${itemId}`;

/** 같은 시각이면 id 로 안정 비교 — 픽스처든 서버든 순서가 흔들리지 않게 */
function isNewer(candidate: ConsentEvent, current: ConsentEvent): boolean {
  if (candidate.occurredAt !== current.occurredAt) return candidate.occurredAt > current.occurredAt;
  return candidate.id > current.id;
}

/**
 * 각 (회원 × 항목)의 최신 사실.
 * **동의만 세면 현재 상태를 알 수 없다** — 동의했다가 철회한 사람과 계속 동의 중인 사람이
 * 똑같이 '동의 1건' 으로 보인다.
 */
function latestDecisions(events: readonly ConsentEvent[]): readonly ConsentDecision[] {
  const latest = new Map<string, ConsentEvent>();
  for (const event of events) {
    const key = pairKey(event.subjectId, event.itemId);
    const current = latest.get(key);
    if (current === undefined || isNewer(event, current)) latest.set(key, event);
  }
  return [...latest.values()].map((event) => ({
    subjectId: event.subjectId,
    subjectLabel: event.subjectLabel,
    itemId: event.itemId,
    action: event.action,
    occurredAt: event.occurredAt,
    termsVersion: event.termsVersion,
  }));
}

/** 시행 중인 약관 버전 — 미배선이면 목록 자체가 null 이다 */
interface ActiveTermsVersion {
  readonly typeId: string;
  readonly version: string;
  readonly effectiveDate: string;
}

interface ReconsentGroup {
  readonly item: ConsentItemDef;
  readonly version: string;
  readonly effectiveDate: string;
  readonly subjects: readonly ConsentDecision[];
}

interface ReconsentReport {
  readonly groups: readonly ReconsentGroup[];
  /** 시행 중 버전을 못 찾은 항목 — '대상 0명' 과 '판정 못 함' 은 다른 사실이다 */
  readonly unresolvedItems: readonly string[];
}

/**
 * 재동의 대상 산출 — **약관 버전을 모르면 null 을 돌려준다(빈 결과가 아니다).**
 * 빈 결과를 주면 화면이 '재동의 대상 0명' 이라는 완결된 문장을 그리고, 운영자는 개정 공지를
 * 보내지 않는다.
 */
function reconsentTargets(
  events: readonly ConsentEvent[],
  items: readonly ConsentItemDef[],
  active: readonly ActiveTermsVersion[] | null,
): ReconsentReport | null {
  if (active === null) return null;

  const decisions = latestDecisions(events);
  const groups: ReconsentGroup[] = [];
  const unresolvedItems: string[] = [];

  for (const item of items) {
    if (item.termsTypeId === null) continue;
    const current = active.find((entry) => entry.typeId === item.termsTypeId);
    if (current === undefined) {
      unresolvedItems.push(item.label);
      continue;
    }
    // 철회한 사람은 대상이 아니다 — 개정을 이유로 다시 권유하는 것은 철회 의사를 무시하는 재권유다
    const subjects = decisions.filter(
      (decision) =>
        decision.itemId === item.id &&
        decision.action === 'granted' &&
        decision.termsVersion !== current.version,
    );
    if (subjects.length > 0) {
      groups.push({
        item,
        version: current.version,
        effectiveDate: current.effectiveDate,
        subjects,
      });
    }
  }

  return { groups, unresolvedItems };
}

interface PurgeTarget {
  readonly subjectId: string;
  readonly subjectLabel: string;
  readonly item: ConsentItemDef;
  readonly withdrawnOn: string;
  readonly purgeableFrom: string;
  /** 이 쌍에 쌓여 있는 이력 줄 수 — 지우면 함께 사라지는 양이다 */
  readonly eventCount: number;
}

/**
 * 'YYYY-MM-DD' 에 개월을 더한다 — 말일은 그 달의 마지막 날로 붙인다.
 * 개인정보 보관은 '넉넉하게' 가 미덕이 아니다: 지정된 기간을 넘겨 들고 있는 것 자체가 위반이다.
 */
function addMonths(date: string, months: number): string {
  const parts = date.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return date;

  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = total - nextYear * 12 + 1;
  // 0일 = 다음 달의 0번째 = 이번 달 말일
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const nextDay = Math.min(day, lastDay);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${String(nextYear)}-${pad(nextMonth)}-${pad(nextDay)}`;
}

/**
 * 보관 기간이 지난 철회 이력 — **파기 '대상' 이지 파기가 아니다.**
 * 동의 중인 사람은 대상이 아니다 — 보관 기간은 **관계가 끝난 뒤부터** 흐른다.
 */
function purgeTargets(
  events: readonly ConsentEvent[],
  items: readonly ConsentItemDef[],
  today: string,
): readonly PurgeTarget[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const key = pairKey(event.subjectId, event.itemId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const targets: PurgeTarget[] = [];
  for (const decision of latestDecisions(events)) {
    if (decision.action !== 'withdrawn') continue;
    const item = items.find((entry) => entry.id === decision.itemId);
    if (item === undefined) continue;

    const withdrawnOn = decision.occurredAt.slice(0, 10);
    const purgeableFrom = addMonths(withdrawnOn, item.retentionMonths);
    if (purgeableFrom > today) continue;

    targets.push({
      subjectId: decision.subjectId,
      subjectLabel: decision.subjectLabel,
      item,
      withdrawnOn,
      purgeableFrom,
      eventCount: counts.get(pairKey(decision.subjectId, decision.itemId)) ?? 0,
    });
  }

  // 오래 넘긴 것부터 — 먼저 처리해야 하는 순서가 곧 목록의 순서다
  return targets.sort((a, b) => a.purgeableFrom.localeCompare(b.purgeableFrom));
}

const CONSENT_FILTER_ALL = 'all';
type ConsentActionFilter = typeof CONSENT_FILTER_ALL | ConsentAction;

const CONSENT_ACTION_FILTERS: readonly {
  readonly id: ConsentActionFilter;
  readonly label: string;
}[] = [
  { id: CONSENT_FILTER_ALL, label: '전체' },
  { id: 'granted', label: '동의' },
  { id: 'withdrawn', label: '철회' },
];

/** 최신순 — 조사 화면이 먼저 보아야 하는 것은 방금 일어난 일이다 */
const newestFirst = (events: readonly ConsentEvent[]): readonly ConsentEvent[] =>
  [...events].sort((a, b) => (isNewer(a, b) ? -1 : 1));

/* ── 데모 데이터(실화면 data-source.ts 미러 — 실명 0건 · example.com 만) ───────────────────── */

/** 오늘 — 스토리가 날짜에 흔들리지 않도록 고정한다 */
const TODAY = '2026-07-22';

/**
 * 마케팅 수신(이메일) — **필수로 올릴 수 없는 항목의 대표**다. 이 상수를 따로 두는 이유는
 * 스토리가 인덱스 접근(`DEMO_ITEMS[3]`)으로 항목을 집으면 배열 순서가 바뀌는 날 조용히
 * 다른 항목의 사유를 보여 주기 때문이다.
 */
const MARKETING_EMAIL_ITEM: ConsentItemDef = {
  id: 'marketing-email',
  label: '광고성 정보 수신 동의 (이메일)',
  description: '신규 상품·할인 소식을 이메일로 보내요.',
  purpose: 'marketing',
  necessity: 'optional',
  termsTypeId: 'marketing',
  retentionMonths: 12,
};

const DEMO_ITEMS: readonly ConsentItemDef[] = [
  {
    id: 'terms-service',
    label: '이용약관 동의',
    description: '서비스 이용에 필요한 기본 약관이에요.',
    purpose: 'service',
    necessity: 'required',
    termsTypeId: 'service',
    retentionMonths: 60,
  },
  {
    id: 'privacy-essential',
    label: '개인정보 수집·이용 동의 (필수)',
    description: '회원 식별·주문 처리에 필요한 최소 항목을 수집해요.',
    purpose: 'privacy-essential',
    necessity: 'required',
    termsTypeId: null,
    retentionMonths: 60,
  },
  {
    id: 'privacy-optional',
    label: '개인정보 수집·이용 동의 (선택)',
    description: '맞춤 추천을 위한 관심 분야·생년월일을 추가로 수집해요.',
    purpose: 'privacy-optional',
    necessity: 'optional',
    termsTypeId: null,
    retentionMonths: 12,
  },
  MARKETING_EMAIL_ITEM,
  {
    id: 'marketing-sms',
    label: '광고성 정보 수신 동의 (문자)',
    description: '신규 상품·할인 소식을 문자로 보내요.',
    purpose: 'marketing',
    necessity: 'optional',
    termsTypeId: 'marketing',
    retentionMonths: 12,
  },
];

/** 시행 중인 약관 버전 — 재동의 판정의 기준선 */
const ACTIVE_TERMS: readonly ActiveTermsVersion[] = [
  { typeId: 'service', version: 'v1.1', effectiveDate: '2026-03-01' },
  { typeId: 'marketing', version: 'v1.1', effectiveDate: '2026-03-01' },
];

/**
 * 이력 픽스처 — 판정이 갈리는 네 경우만 골라 만든다:
 *   계속 동의 중(최신 버전) → 재동의 아님 / 계속 동의 중(옛 버전) → 재동의 대상
 *   철회 · 기간 안 → 파기 아님 / 철회 · 기간 경과 → 파기 대상
 */
const DEMO_EVENTS: readonly ConsentEvent[] = [
  // 한** — 가입 시 전부 동의(최신 버전). 나중에 문자만 철회(기간 안)
  {
    id: 'cev-0001',
    subjectId: 'mem-1001',
    subjectLabel: '한** (h***@example.com)',
    itemId: 'terms-service',
    action: 'granted',
    occurredAt: '2026-03-24 10:00',
    termsVersion: 'v1.1',
    source: 'signup',
  },
  {
    id: 'cev-0002',
    subjectId: 'mem-1001',
    subjectLabel: '한** (h***@example.com)',
    itemId: 'privacy-essential',
    action: 'granted',
    occurredAt: '2026-03-24 10:00',
    termsVersion: null,
    source: 'signup',
  },
  {
    id: 'cev-0003',
    subjectId: 'mem-1001',
    subjectLabel: '한** (h***@example.com)',
    itemId: 'marketing-email',
    action: 'granted',
    occurredAt: '2026-03-24 10:00',
    termsVersion: 'v1.1',
    source: 'signup',
  },
  {
    id: 'cev-0004',
    subjectId: 'mem-1001',
    subjectLabel: '한** (h***@example.com)',
    itemId: 'marketing-sms',
    action: 'granted',
    occurredAt: '2026-03-24 10:00',
    termsVersion: 'v1.1',
    source: 'signup',
  },
  {
    id: 'cev-0005',
    subjectId: 'mem-1001',
    subjectLabel: '한** (h***@example.com)',
    itemId: 'marketing-sms',
    action: 'withdrawn',
    occurredAt: '2026-07-02 21:14',
    termsVersion: null,
    source: 'unsubscribe',
  },

  // 유** — 선택 항목을 **끄고** 가입했다. 선택은 미동의로도 가입된다는 사실이 픽스처에 있어야 한다
  {
    id: 'cev-0006',
    subjectId: 'mem-1002',
    subjectLabel: '유** (y***@example.com)',
    itemId: 'terms-service',
    action: 'granted',
    occurredAt: '2026-04-17 14:05',
    termsVersion: 'v1.1',
    source: 'signup',
  },
  {
    id: 'cev-0007',
    subjectId: 'mem-1002',
    subjectLabel: '유** (y***@example.com)',
    itemId: 'privacy-essential',
    action: 'granted',
    occurredAt: '2026-04-17 14:05',
    termsVersion: null,
    source: 'signup',
  },
  {
    id: 'cev-0008',
    subjectId: 'mem-1002',
    subjectLabel: '유** (y***@example.com)',
    itemId: 'marketing-email',
    action: 'granted',
    occurredAt: '2026-06-22 09:31',
    termsVersion: 'v1.1',
    source: 'event',
  },

  // 서** — 옛 약관 버전(v1.0)에 동의한 채 남아 있다 → 재동의 대상
  {
    id: 'cev-0009',
    subjectId: 'mem-1003',
    subjectLabel: '서** (s***@example.com)',
    itemId: 'terms-service',
    action: 'granted',
    occurredAt: '2025-09-25 11:20',
    termsVersion: 'v1.0',
    source: 'signup',
  },
  {
    id: 'cev-0010',
    subjectId: 'mem-1003',
    subjectLabel: '서** (s***@example.com)',
    itemId: 'privacy-essential',
    action: 'granted',
    occurredAt: '2025-09-25 11:20',
    termsVersion: null,
    source: 'signup',
  },
  {
    id: 'cev-0011',
    subjectId: 'mem-1003',
    subjectLabel: '서** (s***@example.com)',
    itemId: 'marketing-email',
    action: 'granted',
    occurredAt: '2025-09-25 11:20',
    termsVersion: 'v1.0',
    source: 'signup',
  },

  // 노** — 오래전 철회, 보관 기간(12개월) 경과 → 파기 대상
  {
    id: 'cev-0012',
    subjectId: 'mem-1004',
    subjectLabel: '노** (n***@example.com)',
    itemId: 'terms-service',
    action: 'granted',
    occurredAt: '2025-01-08 08:12',
    termsVersion: 'v1.0',
    source: 'signup',
  },
  {
    id: 'cev-0013',
    subjectId: 'mem-1004',
    subjectLabel: '노** (n***@example.com)',
    itemId: 'marketing-email',
    action: 'granted',
    occurredAt: '2025-01-08 08:12',
    termsVersion: 'v1.0',
    source: 'signup',
  },
  {
    id: 'cev-0014',
    subjectId: 'mem-1004',
    subjectLabel: '노** (n***@example.com)',
    itemId: 'marketing-email',
    action: 'withdrawn',
    occurredAt: '2025-05-10 19:40',
    termsVersion: null,
    source: 'mypage',
  },
  {
    id: 'cev-0015',
    subjectId: 'mem-1004',
    subjectLabel: '노** (n***@example.com)',
    itemId: 'marketing-sms',
    action: 'granted',
    occurredAt: '2025-01-08 08:12',
    termsVersion: 'v1.0',
    source: 'signup',
  },
  {
    id: 'cev-0016',
    subjectId: 'mem-1004',
    subjectLabel: '노** (n***@example.com)',
    itemId: 'marketing-sms',
    action: 'withdrawn',
    occurredAt: '2025-05-10 19:41',
    termsVersion: null,
    source: 'mypage',
  },

  // 차** — 주문서에서 받은 동의와 관리자 대행 접수, 그리고 최근 철회(기간 안 → 파기 대상 아님)
  {
    id: 'cev-0017',
    subjectId: 'mem-1005',
    subjectLabel: '차** (c***@example.com)',
    itemId: 'terms-service',
    action: 'granted',
    occurredAt: '2026-07-14 16:03',
    termsVersion: 'v1.1',
    source: 'order',
  },
  {
    id: 'cev-0018',
    subjectId: 'mem-1005',
    subjectLabel: '차** (c***@example.com)',
    itemId: 'privacy-optional',
    action: 'granted',
    occurredAt: '2026-07-19 13:27',
    termsVersion: null,
    source: 'admin',
  },
  {
    id: 'cev-0019',
    subjectId: 'mem-1005',
    subjectLabel: '차** (c***@example.com)',
    itemId: 'privacy-optional',
    action: 'withdrawn',
    occurredAt: '2026-07-21 22:48',
    termsVersion: null,
    source: 'mypage',
  },
];

const fmt = (value: number): string => value.toLocaleString('ko-KR');

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

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const itemRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.subtle'),
};

const infoStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const itemLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const toggleColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: cssVar('space.2'),
};

const lockNoteStyle: CSSProperties = {
  ...hintStyle,
  maxWidth: `calc(${cssVar('space.6')} * 9)`,
  textAlign: 'right',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const selectWrapStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 6)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const stampStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const groupHeadStyle: CSSProperties = {
  // 항목 이름 옆 배지 둘 — 간격의 정의는 DS 한 곳이다(@tds/ui inlineBadgeRowStyle)
  ...inlineBadgeRowStyle,
  display: 'flex',
  marginTop: cssVar('space.4'),
  marginBottom: cssVar('space.2'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

/* ── 탭 ───────────────────────────────────────────────────────────────────────────────────── */

const TAB_ITEMS = [
  { id: 'items', label: '동의 항목' },
  { id: 'history', label: '동의 이력' },
  { id: 'compliance', label: '재동의 · 파기' },
] as const;

type TabId = (typeof TAB_ITEMS)[number]['id'];

const isTabId = (value: string): value is TabId => TAB_ITEMS.some((tab) => tab.id === value);

/* ── 동의 항목 패널(ConsentItemsCard 미러) ─────────────────────────────────────────────────── */

interface ConsentItemsPanelProps {
  readonly items: readonly ConsentItemDef[];
  readonly canUpdate: boolean;
  /** 잠긴 토글을 눌러 본 결과 — 규칙이 돌려준 사유를 그대로 세워 둔다 */
  readonly initialRejected?: string;
}

function ConsentItemsPanel({ items, canUpdate, initialRejected }: ConsentItemsPanelProps) {
  const [draft, setDraft] = useState<readonly ConsentItemDef[]>(items);
  const [rejected, setRejected] = useState<string | null>(initialRejected ?? null);

  const dirty = draft.some((item, index) => item.necessity !== items[index]?.necessity);

  const toggle = (item: ConsentItemDef, next: ConsentNecessity): void => {
    const block = necessityChangeBlock(item, next);
    if (block !== null) {
      // 잠긴 토글은 애초에 눌리지 않지만, 거절의 책임은 화면이 아니라 규칙이 진다
      setRejected(block);
      return;
    }
    setRejected(null);
    setDraft((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, necessity: next } : entry)),
    );
  };

  return (
    <Card>
      <div style={cardBodyStyle}>
        <h2 style={cardTitleStyle}>동의 항목</h2>
        <p style={hintStyle}>
          각 항목은 가입 화면에서 <strong>구분해</strong> 안내하고 따로 동의를 받아요. 선택 항목에
          동의하지 않아도 가입은 완료되어야 해요.
        </p>

        {rejected !== null && <Alert tone="danger">{rejected}</Alert>}
        {!canUpdate && <Alert tone="info">조회 권한만 있어 동의 항목을 변경할 수 없어요.</Alert>}

        {draft.map((item) => {
          const lockReason = necessityChangeBlock(item, 'required');
          const locked = lockReason !== null;

          return (
            <div key={item.id} style={itemRowStyle}>
              <span style={infoStyle}>
                <span style={titleRowStyle}>
                  <span style={itemLabelStyle}>{item.label}</span>
                  <StatusBadge
                    tone={necessityTone(item.necessity)}
                    label={NECESSITY_LABEL[item.necessity]}
                  />
                  <StatusBadge tone="neutral" label={CONSENT_PURPOSE_LABEL[item.purpose]} />
                </span>
                <span style={hintStyle}>{item.description}</span>
                <span style={hintStyle}>
                  {`보관 기간 ${fmt(item.retentionMonths)}개월 · `}
                  {item.termsTypeId === null
                    ? '연결된 약관 문서 없음'
                    : `약관 종류 ‘${item.termsTypeId}’ 의 시행 중 버전을 함께 기록`}
                </span>
              </span>

              <span style={toggleColumnStyle}>
                <ToggleSwitch
                  checked={item.necessity === 'required'}
                  label={`${item.label} 필수 여부`}
                  onLabel="필수"
                  offLabel="선택"
                  disabled={!canUpdate || locked}
                  onChange={(next) => toggle(item, next ? 'required' : 'optional')}
                />
                {/* 왜 잠겼는지를 그 자리에서 말한다 — 이유 없는 disabled 는 고장으로 읽힌다 */}
                {locked && <span style={lockNoteStyle}>{lockReason}</span>}
              </span>
            </div>
          );
        })}

        {/* 수정 권한이 없으면 저장 컨트롤 자체가 없다 — 눌러 보고 거절당하는 자리를 만들지 않는다 */}
        {canUpdate && (
          <div style={actionsStyle}>
            <p style={hintStyle}>
              {dirty ? '저장하지 않은 변경 사항이 있어요.' : '변경 사항이 없어요.'}
            </p>
            <Button variant="primary" size="md" disabled={!dirty}>
              저장
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── 동의 이력 패널(ConsentHistoryPanel 미러 — 조회 전용) ──────────────────────────────────── */

const HISTORY_COLUMNS: TableProps['columns'] = [
  { id: 'occurredAt', header: '시각', nowrap: true },
  { id: 'subject', header: '대상' },
  { id: 'item', header: '항목' },
  { id: 'action', header: '구분', nowrap: true },
  { id: 'version', header: '약관 버전', nowrap: true },
  { id: 'source', header: '출처', nowrap: true },
];

interface ConsentHistoryPanelProps {
  readonly items: readonly ConsentItemDef[];
  readonly events: readonly ConsentEvent[];
  readonly loading: boolean;
  readonly initialKeyword: string;
  readonly initialItemId: string;
  readonly initialAction: ConsentActionFilter;
}

function ConsentHistoryPanel({
  items,
  events,
  loading,
  initialKeyword,
  initialItemId,
  initialAction,
}: ConsentHistoryPanelProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [itemId, setItemId] = useState(initialItemId);
  const [action, setAction] = useState<ConsentActionFilter>(initialAction);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    const filtered = events.filter((event) => {
      if (itemId !== CONSENT_FILTER_ALL && event.itemId !== itemId) return false;
      if (action !== CONSENT_FILTER_ALL && event.action !== action) return false;
      if (needle === '') return true;
      // 조사자가 손에 쥔 것이 대개 셋 중 하나다 — 표시값·회원 id·약관 버전
      return [event.subjectLabel, event.subjectId, event.termsVersion ?? ''].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });
    return newestFirst(filtered);
  }, [events, itemId, action, keyword]);

  const labelOf = (id: string): string => items.find((item) => item.id === id)?.label ?? id;

  const rows: TableProps['rows'] = visible.map((event, index) => ({
    id: event.id,
    // 이력 한 줄에는 '상세' 가 없다 — 줄 자체가 사실의 전부다(onActivate 를 주지 않는다)
    leading: [<SeqCell key="seq" seq={index + 1} />],
    cells: [
      <span key="occurredAt" style={stampStyle}>
        {event.occurredAt}
      </span>,
      <span key="subject">{event.subjectLabel}</span>,
      <span key="item">{labelOf(event.itemId)}</span>,
      <StatusBadge
        key="action"
        tone={consentActionTone(event.action)}
        label={CONSENT_ACTION_LABEL[event.action]}
      />,
      // 철회에는 버전이 없다 — 없는 것을 '—' 로 적는 것이 v1.1 로 지어내는 것보다 정확하다
      <span key="version">{event.termsVersion ?? '—'}</span>,
      <span key="source">{consentSourceLabel(event.source)}</span>,
    ],
  }));

  return (
    <div style={columnStyle}>
      <div style={toolbarStyle}>
        <span style={searchWrapStyle}>
          <SearchField
            value={keyword}
            onChange={setKeyword}
            label="대상·회원 ID·약관 버전 검색"
            placeholder="대상 · 회원 ID · 약관 버전"
          />
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={itemId}
            aria-label="동의 항목 필터"
            onChange={(event) => setItemId(event.target.value)}
          >
            <option value={CONSENT_FILTER_ALL}>전체 항목</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={action}
            aria-label="구분 필터"
            onChange={(event) => {
              const next = CONSENT_ACTION_FILTERS.find((entry) => entry.id === event.target.value);
              setAction(next === undefined ? CONSENT_FILTER_ALL : next.id);
            }}
          >
            {CONSENT_ACTION_FILTERS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>

      <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}</p>

      <div style={tableScrollStyle}>
        <Table
          caption="동의 이력 — 조회 전용이에요. 덧붙이기만 하며 수정·삭제 표면이 없고, 행에는 열어 볼 상세가 없어요."
          columns={HISTORY_COLUMNS}
          rows={rows}
          leadingHead={[<SeqHeaderCell key="seq" />]}
          loading={loading}
          skeletonRows={10}
          empty={
            <EmptyState
              label="동의 이력"
              createVerb="기록"
              hasQuery={keyword.trim() !== ''}
              hasActiveFilters={itemId !== CONSENT_FILTER_ALL || action !== CONSENT_FILTER_ALL}
              onClearSearch={() => setKeyword('')}
              onResetFilters={() => {
                setItemId(CONSENT_FILTER_ALL);
                setAction(CONSENT_FILTER_ALL);
              }}
            />
          }
        />
      </div>
    </div>
  );
}

/* ── 재동의 · 파기 패널(CompliancePanel 미러) ──────────────────────────────────────────────── */

const RECONSENT_COLUMNS: TableProps['columns'] = [
  { id: 'subject', header: '대상' },
  { id: 'version', header: '동의한 버전', nowrap: true },
];

const PURGE_COLUMNS: TableProps['columns'] = [
  { id: 'subject', header: '대상' },
  { id: 'item', header: '항목' },
  { id: 'withdrawnOn', header: '철회일', nowrap: true },
  { id: 'purgeableFrom', header: '파기 가능일', nowrap: true },
  { id: 'eventCount', header: '함께 사라지는 이력', align: 'end', nowrap: true },
];

interface CompliancePanelProps {
  readonly items: readonly ConsentItemDef[];
  readonly events: readonly ConsentEvent[];
  readonly active: readonly ActiveTermsVersion[] | null;
}

function CompliancePanel({ items, events, active }: CompliancePanelProps) {
  const report = reconsentTargets(events, items, active);
  const purge = purgeTargets(events, items, TODAY);

  return (
    <div style={columnStyle}>
      <Card>
        <div style={cardBodyStyle}>
          <h2 style={cardTitleStyle}>재동의 대상</h2>
          <p style={hintStyle}>
            지금 시행 중인 약관 버전과 <strong>다른 버전</strong>에 동의한 채로 남아 있는
            이용자예요. 철회한 이용자는 대상에 넣지 않아요 — 개정을 이유로 다시 권유하는 것은 철회
            의사를 무시하는 재권유예요.
          </p>

          {report === null ? (
            <Alert tone="warning">
              시행 중인 약관 버전을 확인할 수 없어 재동의 대상을 <strong>판정하지 못했어요</strong>.
              대상이 없다는 뜻이 아니에요 — 약관 관리 연동을 확인해 주세요.
            </Alert>
          ) : (
            <>
              {report.unresolvedItems.length > 0 && (
                <Alert tone="warning">
                  {`시행 중인 버전을 찾지 못한 항목이 있어 그 항목은 판정에서 빠졌어요: ${report.unresolvedItems.join(' · ')}`}
                </Alert>
              )}

              {report.groups.length === 0 ? (
                <p style={hintStyle}>모든 동의가 시행 중인 버전 기준이에요.</p>
              ) : (
                report.groups.map((group) => (
                  <div key={group.item.id}>
                    <p style={groupHeadStyle}>
                      {group.item.label}
                      <StatusBadge tone="info" label={`시행 ${group.version}`} />
                      <StatusBadge tone="warning" label={`${fmt(group.subjects.length)}명`} />
                    </p>
                    <div style={tableScrollStyle}>
                      <Table
                        caption={`${group.item.label} — ${group.effectiveDate} 시행 ${group.version} 기준 재동의 대상`}
                        columns={RECONSENT_COLUMNS}
                        rows={group.subjects.map((subject) => ({
                          id: `${subject.subjectId}-${subject.itemId}`,
                          cells: [
                            <span key="subject">{subject.subjectLabel}</span>,
                            <span key="version">{subject.termsVersion ?? '기록 없음'}</span>,
                          ],
                        }))}
                      />
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </Card>

      <Card>
        <div style={cardBodyStyle}>
          <h2 style={cardTitleStyle}>보관 기간 경과 (파기 대상)</h2>
          <p style={hintStyle}>
            철회한 뒤 항목별 보관 기간이 지난 이력이에요. 이 화면은 <strong>세어 보여 줄 뿐</strong>{' '}
            지우지 않아요 — 실제 파기는 백업까지 함께 다뤄야 하는 서버의 일이에요.
          </p>

          {purge.length === 0 ? (
            <p style={hintStyle}>보관 기간이 지난 이력이 없어요.</p>
          ) : (
            <div style={tableScrollStyle}>
              <Table
                caption={`파기 대상 ${fmt(purge.length)}건 (기준일 ${TODAY})`}
                columns={PURGE_COLUMNS}
                rows={purge.map((target) => ({
                  id: `${target.subjectId}-${target.item.id}`,
                  cells: [
                    <span key="subject">{target.subjectLabel}</span>,
                    <span key="item">{target.item.label}</span>,
                    <span key="withdrawnOn" style={stampStyle}>
                      {target.withdrawnOn}
                    </span>,
                    <span key="purgeableFrom" style={stampStyle}>
                      {target.purgeableFrom}
                    </span>,
                    <span key="eventCount">{`${fmt(target.eventCount)}줄`}</span>,
                  ],
                }))}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ConsentsScreenProps {
  readonly initialTab?: TabId;
  readonly canUpdate?: boolean;
  readonly loadingHistory?: boolean;
  readonly initialKeyword?: string;
  readonly initialItemId?: string;
  readonly initialAction?: ConsentActionFilter;
  /** 약관 조회기가 배선되지 않은 상태 — null 은 '대상 0명' 이 아니라 '판정 못 함' 이다 */
  readonly termsUnavailable?: boolean;
  /** 시행 중 버전을 찾지 못한 항목이 섞인 상태 */
  readonly partialTerms?: boolean;
  readonly initialRejected?: string;
}

function ConsentsScreen({
  initialTab = 'items',
  canUpdate = true,
  loadingHistory = false,
  initialKeyword = '',
  initialItemId = CONSENT_FILTER_ALL,
  initialAction = CONSENT_FILTER_ALL,
  termsUnavailable = false,
  partialTerms = false,
  initialRejected,
}: ConsentsScreenProps) {
  const [tab, setTab] = useState<TabId>(initialTab);

  const active = termsUnavailable
    ? null
    : partialTerms
      ? ACTIVE_TERMS.filter((entry) => entry.typeId !== 'marketing')
      : ACTIVE_TERMS;

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>동의 이력</h1>
      <p style={descriptionStyle}>
        동의 항목의 정의와 동의·철회 이력을 관리해요. 이력은 <strong>덧붙이기만</strong> 하며
        수정·삭제 표면이 없어요 — 고칠 수 있는 기록은 증거가 되지 못해요.
      </p>

      <Tabs
        value={tab}
        items={[...TAB_ITEMS]}
        ariaLabel="동의 이력 관리 영역"
        onChange={(next) => {
          if (isTabId(next)) setTab(next);
        }}
      />

      <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)}>
        {tab === 'items' && (
          <ConsentItemsPanel
            items={DEMO_ITEMS}
            canUpdate={canUpdate}
            {...(initialRejected !== undefined && { initialRejected })}
          />
        )}

        {tab === 'history' && (
          <ConsentHistoryPanel
            items={DEMO_ITEMS}
            events={DEMO_EVENTS}
            loading={loadingHistory}
            initialKeyword={initialKeyword}
            initialItemId={initialItemId}
            initialAction={initialAction}
          />
        )}

        {tab === 'compliance' && (
          <CompliancePanel items={DEMO_ITEMS} events={DEMO_EVENTS} active={active} />
        )}
      </div>
    </div>
  );
}

/**
 * 정상(동의 항목): 필수 둘과 선택 셋. 선택 셋 중 마케팅·선택 개인정보는 **필수로 올릴 수 없어**
 * 토글이 잠겨 있고, 왜 잠겼는지가 토글 바로 아래 문장으로 붙는다.
 */
export const Default: Story = {
  render: () => <ConsentsScreen />,
};

/** 조회 권한만: 토글이 전부 잠기고 저장 컨트롤 자체가 없다 — 눌러 보고 거절당하는 자리를 만들지 않는다 */
export const ReadOnly: Story = {
  render: () => <ConsentsScreen canUpdate={false} />,
};

/**
 * 규칙 거절: 잠긴 토글이 어떻게든 눌렸을 때 화면이 지어낸 문장이 아니라 **규칙이 돌려준 사유**가
 * 그대로 선다. 토글의 disabled 와 저장의 거절이 같은 술어를 읽는다.
 */
export const NecessityRejected: Story = {
  render: () => (
    <ConsentsScreen initialRejected={forcedRequiredReason(MARKETING_EMAIL_ITEM) ?? ''} />
  ),
};

/** 동의 이력: 최신순 append-only 원장 — 행 클릭이 없고 철회에는 약관 버전이 없다 */
export const History: Story = {
  render: () => <ConsentsScreen initialTab="history" />,
};

/** 이력 조회 중: 표 스켈레톤 — 첫 로드에서만 켠다(STATE-01) */
export const HistoryLoading: Story = {
  render: () => <ConsentsScreen initialTab="history" loadingHistory />,
};

/** 이력 필터(철회만): '마케팅 문자 철회만' 을 걸어 둔 화면을 링크로 그대로 넘길 수 있어야 한다 */
export const HistoryWithdrawn: Story = {
  render: () => <ConsentsScreen initialTab="history" initialAction="withdrawn" />,
};

/**
 * 재동의 · 파기: 옛 버전에 동의한 채 남은 이용자와, 철회 후 보관 기간이 지난 이력이 각각 표로
 * 선다. **파기 버튼은 없다** — 실제 삭제는 원장·백업까지 다뤄야 하는 서버의 일이다.
 */
export const Compliance: Story = {
  render: () => <ConsentsScreen initialTab="compliance" />,
};

/**
 * 약관 조회 미배선: '재동의 대상 0명' 이 아니라 **판정하지 못했다**고 말한다. 0명이라고 적으면
 * 운영자는 개정 공지를 보내지 않는다 — 배선 사고가 법적 사고로 번지는 경로다.
 */
export const ReconsentUnresolved: Story = {
  render: () => <ConsentsScreen initialTab="compliance" termsUnavailable />,
};

/** 일부 항목만 판정 불가: 판정에서 빠진 항목의 이름을 밝힌다 — 조용히 건너뛰지 않는다 */
export const ReconsentPartial: Story = {
  render: () => <ConsentsScreen initialTab="compliance" partialTerms />,
};
