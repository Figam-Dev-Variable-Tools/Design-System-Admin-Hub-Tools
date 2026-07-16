// 알림(트랜잭션/시스템) 도메인 타입 · 순수 규칙 (apps/admin/src/pages/notifications/**)
//
// [마케팅 관리와 무엇이 다른가 — 역할 차별화의 정본]
//   마케팅 관리(/marketing/**)는 **캠페인/프로모션성 발송**이다: 운영자가 세그먼트(수신자 그룹)를 고르고
//   문구를 써서 특정 시각에 대량 발송한다. 수명주기가 초안→예약→발송중→발송완료다.
//   알림 관리(/notifications/**)는 **트랜잭션/시스템 알림**이다: 운영자가 보내지 않는다. 주문·배송·계정·보안
//   **이벤트가 발생하면 시스템이 그 이벤트의 당사자 한 명에게 자동 발송**한다. 그래서 축이 전부 다르다:
//
//     축          | 마케팅 관리(캠페인)              | 알림 관리(트랜잭션)
//     ------------|----------------------------------|----------------------------------------
//     발송 주체   | 운영자가 직접 발송               | 이벤트 트리거로 시스템이 자동 발송
//     수신자      | 세그먼트(그룹) 선택              | 이벤트 당사자 1명(선택 불가)
//     시점        | 예약 시각(운영자 지정)           | 이벤트 발생 즉시
//     수명주기    | 초안→예약→발송중→발송완료→취소   | 규칙 ON/OFF(상시 대기) + 실패 시 재시도
//     법적 성격   | 광고성 정보(원칙)                | 정보성 정보(원칙)
//     운영 단위   | 캠페인 1건                       | 트리거→템플릿 발송 규칙 1건
//
//   이 파일은 위 오른쪽 열만 안다. 세그먼트·예약·발송통계·(광고) 표기·알림톡 승인은 여기에 없다.
//   선례: 고객센터 FAQ(/support/faq · 노출 큐레이션) vs 콘텐츠 FAQ(/content/faq · 작성·관리) 가 같은 방식으로
//   한 도메인을 역할로 갈라 놓았다. 화면 상단 안내와 라우트 링크로 서로를 가리키되 **import 하지 않는다**
//   (pages/A → pages/B 결합은 code-quality 축1 blocker).
//
// [국내 규제 채택 — 트랜잭션 알림은 광고가 아니므로 규칙이 반대다]
//   · 정보통신망법 제50조는 **영리 목적의 광고성 정보**에만 적용된다. 주문/배송/계정/보안 알림은 거래관계에
//     따른 **정보성 정보**라 다음이 **적용되지 않는다**:
//       - (광고) 표기 의무 없음 (제50조 제4항)
//       - 야간(21:00~08:00) 전송 제한 없음 (제50조 제3항) — 인증번호·보안 알림은 새벽에도 보내야 한다
//       - 수신거부 의무 없음 — 수신거부한 회원에게도 거래 정보는 발송한다
//     → 그래서 이 도메인엔 야간 차단·(광고) 표기 검사·수신거부 문구 검사가 **없다**. 마케팅 쪽에 있다.
//   · 단, **정보성으로 위장한 광고는 위법**이다(방통위 '영리목적 광고성 정보 전송 가이드라인' — 거래정보에
//     광고를 부가하면 전체가 광고성이 된다). 그래서 detectAdWords 가 광고성 낱말을 잡아 **저장을 막고**
//     마케팅 관리로 보낸다 — 두 섹션의 법적 경계를 UI 로 드러내는 장치다.
//   · 바이트: SMS 90byte(한글 45자), LMS 2,000byte. 한글=2byte·ASCII=1byte (EUC-KR 기준).
//   · 치환변수 문법은 `#{변수}` — 국내 발송사(솔라피·카카오) 공통 표기라 채널 무관하게 따른다.
import type { StatusTone } from '../../../shared/ui';

/* 조사(助詞)는 shared/format 이 소유한다 (ERP-13). 이 섹션이 갖고 있던 사본은 그리로 수렴됐다 —
 * 세 곳(logs·notifications·@tds/ui Empty)이 같은 받침 판정을 각자 구현하고 있었다. */

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

const optionLabel = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

/* ── 이벤트 트리거 ──────────────────────────────────────────────────────────────
 *
 * 알림 관리의 심장. 마케팅엔 이 개념이 없다(거기선 운영자가 시점을 고른다). 트리거는 시스템이 발생시키는
 * 도메인 이벤트이고, 발송 규칙이 이것을 템플릿에 묶는다. */

type TriggerCategory = 'order' | 'delivery' | 'account' | 'security';

export const TRIGGER_CATEGORY_OPTIONS: readonly Option<TriggerCategory>[] = [
  { id: 'order', label: '주문' },
  { id: 'delivery', label: '배송' },
  { id: 'account', label: '계정' },
  { id: 'security', label: '보안' },
] as const;

export const triggerCategoryLabel = (v: TriggerCategory): string =>
  optionLabel(TRIGGER_CATEGORY_OPTIONS, v);

const TRIGGER_CATEGORY_TONE: Record<TriggerCategory, StatusTone> = {
  order: 'info',
  delivery: 'success',
  account: 'neutral',
  security: 'warning',
};

export function triggerCategoryTone(category: TriggerCategory): StatusTone {
  return TRIGGER_CATEGORY_TONE[category];
}

/** zod 스키마가 그대로 쓰는 리터럴 튜플 — 트리거 목록과 단일 원천을 이룬다 */
export const TRIGGER_ID_VALUES = [
  'order.placed',
  'order.paid',
  'order.canceled',
  'delivery.started',
  'delivery.completed',
  'account.created',
  'account.password-reset',
  'account.dormant',
  'security.login-new-device',
  'security.verification-code',
] as const;

export type TriggerId = (typeof TRIGGER_ID_VALUES)[number];

interface NotificationTrigger {
  readonly id: TriggerId;
  readonly label: string;
  readonly category: TriggerCategory;
  /** 언제 발생하는가 — 폼 힌트로 그대로 보여준다 */
  readonly description: string;
}

export const NOTIFICATION_TRIGGERS: readonly NotificationTrigger[] = [
  {
    id: 'order.placed',
    label: '주문 접수',
    category: 'order',
    description: '회원이 주문을 완료한 직후 발생합니다.',
  },
  {
    id: 'order.paid',
    label: '결제 완료',
    category: 'order',
    description: '결제 승인이 확인된 직후 발생합니다.',
  },
  {
    id: 'order.canceled',
    label: '주문 취소',
    category: 'order',
    description: '주문이 취소·환불 접수된 직후 발생합니다.',
  },
  {
    id: 'delivery.started',
    label: '배송 출발',
    category: 'delivery',
    description: '송장번호가 등록되어 배송이 시작되면 발생합니다.',
  },
  {
    id: 'delivery.completed',
    label: '배송 완료',
    category: 'delivery',
    description: '택배사 배송완료 신호를 받으면 발생합니다.',
  },
  {
    id: 'account.created',
    label: '가입 완료',
    category: 'account',
    description: '회원가입이 완료된 직후 발생합니다.',
  },
  {
    id: 'account.password-reset',
    label: '비밀번호 재설정',
    category: 'account',
    description: '회원이 비밀번호 재설정을 요청하면 발생합니다.',
  },
  {
    id: 'account.dormant',
    label: '휴면 전환 예고',
    category: 'account',
    description: '장기 미접속으로 휴면 전환 30일 전에 발생합니다.',
  },
  {
    id: 'security.login-new-device',
    label: '새 기기 로그인',
    category: 'security',
    description: '기존에 없던 기기·위치에서 로그인하면 발생합니다.',
  },
  {
    id: 'security.verification-code',
    label: '인증번호 발송',
    category: 'security',
    description: '본인확인 인증번호가 필요할 때 발생합니다.',
  },
] as const;

export function findTrigger(id: TriggerId): NotificationTrigger | undefined {
  return NOTIFICATION_TRIGGERS.find((trigger) => trigger.id === id);
}

/** 트리거 표시명 — 모르는 id 는 id 를 그대로(픽스처/서버 불일치 방어) */
export function triggerLabel(id: TriggerId): string {
  return findTrigger(id)?.label ?? id;
}

export function triggerCategoryOf(id: TriggerId): TriggerCategory | null {
  return findTrigger(id)?.category ?? null;
}

/* ── 채널 ───────────────────────────────────────────────────────────────────────
 *
 * 트랜잭션 알림은 이메일·SMS 두 채널만 쓴다. 마케팅의 알림톡(사전 승인·광고 심사)은 여기 없다 —
 * 승인 개념 자체가 캠페인 규제의 산물이다. */

export const NOTIFICATION_CHANNEL_VALUES = ['email', 'sms'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNEL_VALUES)[number];

export const NOTIFICATION_CHANNEL_OPTIONS: readonly Option<NotificationChannel>[] = [
  { id: 'email', label: '이메일' },
  { id: 'sms', label: 'SMS' },
] as const;

export const notificationChannelLabel = (v: NotificationChannel): string =>
  optionLabel(NOTIFICATION_CHANNEL_OPTIONS, v);

/* ── 치환변수 (트랜잭션 전용) ────────────────────────────────────────────────────
 *
 * 마케팅 변수(#{쿠폰명}·#{적립금} — 혜택 소구)와 겹치지 않는 **거래 사실 변수**다. 트리거가 주는 값만
 * 쓸 수 있다: 주문번호·송장번호·인증번호처럼 그 이벤트에서만 나오는 값. */

interface NotificationVariable {
  readonly token: string;
  readonly label: string;
  /** 미리보기용 표본값 */
  readonly sample: string;
  /** 이 변수를 제공하는 트리거 — 비어 있으면 전 트리거 공통 */
  readonly triggers: readonly TriggerId[];
}

const NOTIFICATION_VARIABLES: readonly NotificationVariable[] = [
  { token: '#{이름}', label: '이름', sample: '홍길동', triggers: [] },
  {
    token: '#{주문번호}',
    label: '주문번호',
    sample: '20260716-0001',
    triggers: ['order.placed', 'order.paid', 'order.canceled'],
  },
  {
    token: '#{결제금액}',
    label: '결제금액',
    sample: '128,000',
    triggers: ['order.paid', 'order.canceled'],
  },
  {
    token: '#{송장번호}',
    label: '송장번호',
    sample: '123456789012',
    triggers: ['delivery.started', 'delivery.completed'],
  },
  {
    token: '#{택배사}',
    label: '택배사',
    sample: 'CJ대한통운',
    triggers: ['delivery.started', 'delivery.completed'],
  },
  {
    token: '#{인증번호}',
    label: '인증번호',
    sample: '482913',
    triggers: ['account.password-reset', 'security.verification-code'],
  },
  {
    token: '#{접속기기}',
    label: '접속기기',
    sample: 'iPhone 16 · 서울',
    triggers: ['security.login-new-device'],
  },
  {
    token: '#{휴면예정일}',
    label: '휴면예정일',
    sample: '2026-08-15',
    triggers: ['account.dormant'],
  },
];

/** 해당 트리거에서 쓸 수 있는 변수 — 공통 변수 + 그 트리거 전용 변수 */
export function variablesFor(trigger: TriggerId): readonly NotificationVariable[] {
  return NOTIFICATION_VARIABLES.filter(
    (variable) => variable.triggers.length === 0 || variable.triggers.includes(trigger),
  );
}

/** 본문에 실제로 쓰인 `#{...}` 변수 토큰(중복 제거) */
function usedVariables(text: string): readonly string[] {
  return [...new Set(text.match(/#\{[^}]+\}/g) ?? [])];
}

/**
 * 그 트리거가 주지 않는 변수를 쓴 경우 — 발송 때 빈칸으로 나가는 사고를 저장 전에 막는다.
 * 마케팅엔 없는 검사다(거기선 세그먼트 회원 속성이라 트리거 종속성이 없다).
 */
export function unknownVariablesFor(text: string, trigger: TriggerId): readonly string[] {
  const allowed = new Set(variablesFor(trigger).map((variable) => variable.token));
  return usedVariables(text).filter((token) => !allowed.has(token));
}

/** 미리보기용 — 알려진 변수는 표본값으로, 모르는 변수는 그대로 둔다 */
export function applyVariableSamples(text: string): string {
  return NOTIFICATION_VARIABLES.reduce(
    (acc, variable) => acc.replaceAll(variable.token, variable.sample),
    text,
  );
}

/* ── 광고성 문구 감지 (정보성 위장 광고 차단) ────────────────────────────────────
 *
 * 트랜잭션 템플릿에 광고 문구가 섞이면 그 메시지는 광고성 정보가 되어 (광고) 표기·야간제한·수신거부
 * 의무가 생긴다. 이 섹션은 그 의무를 다루지 않으므로(마케팅 관리 소관) 저장을 막고 안내한다. */

const AD_WORDS: readonly string[] = [
  '할인',
  '쿠폰',
  '특가',
  '세일',
  '이벤트',
  '프로모션',
  '무료체험',
  '광고',
  '홍보',
];

/** 본문에 섞인 광고성 낱말 — 하나라도 있으면 정보성으로 보낼 수 없다 */
export function detectAdWords(text: string): readonly string[] {
  return AD_WORDS.filter((word) => text.includes(word));
}

/* ── 바이트 · SMS 유형 판정 (SMS 템플릿 — COMP-12) ─────────────────────────────── */

export const SMS_MAX_BYTES = 90;
export const LMS_MAX_BYTES = 2000;

/** EUC-KR 기준 바이트 길이 — 한글/비ASCII 2byte, ASCII 1byte */
export function byteLengthOf(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code > 0x7f ? 2 : 1;
  }
  return bytes;
}

type SmsKind = 'sms' | 'lms';

/** 90byte 이하 SMS · 초과 LMS 로 자동 승격. 트랜잭션 알림은 이미지가 없어 MMS 가 없다 */
export function classifySms(bytes: number): SmsKind {
  return bytes <= SMS_MAX_BYTES ? 'sms' : 'lms';
}

export function smsKindLabel(kind: SmsKind): string {
  return kind === 'sms' ? 'SMS' : 'LMS';
}

export function smsByteLimit(kind: SmsKind): number {
  return kind === 'sms' ? SMS_MAX_BYTES : LMS_MAX_BYTES;
}

/* ── 재시도 정책 (트랜잭션 전용) ────────────────────────────────────────────────
 *
 * 캠페인은 실패하면 다음 캠페인이 있지만, 거래 알림은 반드시 도달해야 한다 — 인증번호가 안 가면
 * 로그인을 못 한다. 그래서 규칙마다 재시도 정책을 둔다. 마케팅엔 없는 축이다. */

export const RETRY_POLICY_VALUES = ['none', 'once', 'thrice'] as const;

type RetryPolicy = (typeof RETRY_POLICY_VALUES)[number];

export const RETRY_POLICY_OPTIONS: readonly Option<RetryPolicy>[] = [
  { id: 'none', label: '재시도 안 함' },
  { id: 'once', label: '1회 재시도' },
  { id: 'thrice', label: '3회 재시도' },
] as const;

export const retryPolicyLabel = (v: RetryPolicy): string => optionLabel(RETRY_POLICY_OPTIONS, v);

/* ── 템플릿 (트리거에 묶인 문구) ─────────────────────────────────────────────────
 *
 * 마케팅 MessageTemplate 과 결정적으로 다른 점: **trigger 를 갖는다**. 마케팅 템플릿은 채널로만 구분되고
 * 캠페인이 자유롭게 골라 쓰지만, 알림 템플릿은 특정 이벤트의 문구라 그 트리거가 주는 변수만 쓸 수 있다.
 * 승인상태(알림톡 심사)·반려사유가 없다 — 트랜잭션 알림은 사전 심사 대상이 아니다. */

export const TEMPLATE_NAME_MAX = 60;
export const EMAIL_SUBJECT_MAX = 100;
export const EMAIL_BODY_MAX = 2000;

/**
 * SMS 본문 **글자수** 상한 — 진짜 제약은 바이트(LMS 2,000byte)이지 글자수가 아니다.
 * 한글은 2byte 라 1,000자면 이미 한도지만 ASCII 는 1byte 라 2,000자까지 들어간다. 그래서 글자수 cap 은
 * 이론상 최대치(전부 ASCII)인 2,000 으로 두고, 실제 판정은 byteLengthOf 로 한다 — 여기를 1,000 으로
 * 잡으면 2,000자짜리 영문 본문(2,000byte 로 적법)이 이유 없이 막힌다.
 */
export const SMS_BODY_MAX = LMS_MAX_BYTES;

/** 이메일 템플릿 — 제목 + 본문 */
export interface EmailTemplate {
  readonly id: string;
  readonly name: string;
  readonly trigger: TriggerId;
  readonly subject: string;
  readonly body: string;
  readonly updatedAt: string;
}

export type EmailTemplateInput = Omit<EmailTemplate, 'id' | 'updatedAt'>;

/** SMS 템플릿 — 본문만(제목 없음). 바이트가 곧 비용이라 폼이 90byte 경계를 실시간으로 알린다 */
export interface SmsTemplate {
  readonly id: string;
  readonly name: string;
  readonly trigger: TriggerId;
  readonly body: string;
  readonly updatedAt: string;
}

export type SmsTemplateInput = Omit<SmsTemplate, 'id' | 'updatedAt'>;

/* ── 발송 규칙 (알림 발송 화면의 엔티티) ─────────────────────────────────────────
 *
 * '이 이벤트가 나면 이 템플릿을 이 채널로 보낸다'. 캠페인처럼 '언제 보낼지'를 고르지 않는다 —
 * 이벤트가 곧 시점이다. enabled 가 운영 스위치다(끄면 그 이벤트에 알림이 안 나간다). */

export interface NotificationRule {
  readonly id: string;
  readonly trigger: TriggerId;
  readonly channel: NotificationChannel;
  /** 연결된 템플릿 id — 채널에 따라 이메일/SMS 템플릿 저장소를 가리킨다 */
  readonly templateId: string;
  readonly enabled: boolean;
  readonly retryPolicy: RetryPolicy;
  readonly updatedAt: string;
}

export type NotificationRuleInput = Omit<NotificationRule, 'id' | 'updatedAt'>;

/* ── 분류 필터 · 검색 · 정렬 (규칙·템플릿 공용 · 순수) ───────────────────────── */

export const FILTER_ALL = 'all';
export type CategoryFilter = typeof FILTER_ALL | TriggerCategory;

/**
 * 분류 필터를 싣는 URL 쿼리 파라미터 (IA-13).
 *
 * 세 목록(규칙·이메일·SMS)이 같은 키를 써야 링크가 한 가지 뜻을 갖는다 — 공유 useListState 의
 * filterDefaults 키이자 parseCategoryFilter 의 입력 위치라 리터럴을 흩뿌리지 않고 여기 한 벌만 둔다.
 */
export const CATEGORY_PARAM = 'cat';

/** 좌측 필터가 그리는 항목 — '전체' + 이벤트 분류 (공유 FilterPanel 에 그대로 넘긴다) */
export const NOTIFICATION_CATEGORY_OPTIONS: readonly {
  readonly id: CategoryFilter;
  readonly label: string;
}[] = [{ id: FILTER_ALL, label: '전체' }, ...TRIGGER_CATEGORY_OPTIONS];

const CATEGORY_VALUES = ['order', 'delivery', 'account', 'security'] as const;

function isTriggerCategory(value: unknown): value is TriggerCategory {
  return typeof value === 'string' && (CATEGORY_VALUES as readonly string[]).includes(value);
}

/** URL/드롭다운 문자열 → 분류 필터(모르면 전체). IA-13 복원 시 `as` 없이 좁힌다 */
export function parseCategoryFilter(value: string | null): CategoryFilter {
  if (value === null) return FILTER_ALL;
  return isTriggerCategory(value) ? value : FILTER_ALL;
}

/** 트리거에 묶인 모든 것(규칙·이메일 템플릿·SMS 템플릿)의 공통 최소 형태 */
interface TriggerBound {
  readonly trigger: TriggerId;
}

/** 이름을 갖는 트리거 바인딩 — 템플릿(정렬·검색 대상) */
interface NamedTriggerBound extends TriggerBound {
  readonly name: string;
}

export function filterByCategory<T extends TriggerBound>(
  list: readonly T[],
  filter: CategoryFilter,
): readonly T[] {
  if (filter === FILTER_ALL) return list;
  return list.filter((item) => triggerCategoryOf(item.trigger) === filter);
}

/** 분류별 건수 — 좌측 필터 배지('전체' 포함) */
export function countByCategory<T extends TriggerBound>(
  list: readonly T[],
): Record<string, number> {
  const counts: Record<string, number> = { [FILTER_ALL]: list.length };
  for (const option of TRIGGER_CATEGORY_OPTIONS) {
    counts[option.id] = list.filter((item) => triggerCategoryOf(item.trigger) === option.id).length;
  }
  return counts;
}

/** 트리거 정의 순서(주문→배송→계정→보안)로 정렬 — 운영자가 이벤트 흐름대로 읽는다 */
export function sortByTrigger<T extends NamedTriggerBound>(list: readonly T[]): readonly T[] {
  const rank = new Map(TRIGGER_ID_VALUES.map((id, index) => [id, index]));
  return [...list].sort((a, b) => {
    const diff = (rank.get(a.trigger) ?? 0) - (rank.get(b.trigger) ?? 0);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ko-KR');
  });
}

/** 템플릿 검색 — 템플릿명 또는 트리거명 */
export function searchTemplates<T extends NamedTriggerBound>(
  list: readonly T[],
  keyword: string,
): readonly T[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (item) =>
      item.name.toLowerCase().includes(needle) ||
      triggerLabel(item.trigger).toLowerCase().includes(needle),
  );
}

/* ── 규칙 전용 순수 규칙 ─────────────────────────────────────────────────────── */

/** 규칙 정렬 — 트리거 순서, 같으면 이메일→SMS */
export function sortRules(list: readonly NotificationRule[]): readonly NotificationRule[] {
  const rank = new Map(TRIGGER_ID_VALUES.map((id, index) => [id, index]));
  return [...list].sort((a, b) => {
    const diff = (rank.get(a.trigger) ?? 0) - (rank.get(b.trigger) ?? 0);
    return diff !== 0 ? diff : a.channel.localeCompare(b.channel);
  });
}

/** 규칙 검색 — 트리거명 또는 연결된 템플릿명(템플릿명은 화면이 조회해 넘긴다) */
export function searchRules(
  list: readonly NotificationRule[],
  keyword: string,
  templateNameOf: (rule: NotificationRule) => string,
): readonly NotificationRule[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (rule) =>
      triggerLabel(rule.trigger).toLowerCase().includes(needle) ||
      templateNameOf(rule).toLowerCase().includes(needle),
  );
}

/** 활성 규칙 수 — 상단 요약('전체 N건 · 켜짐 M건') */
export function countEnabled(list: readonly NotificationRule[]): number {
  return list.filter((rule) => rule.enabled).length;
}

/**
 * 같은 트리거+채널에 규칙이 둘이면 한 이벤트에 알림이 두 번 나간다 — 저장 전에 막는다.
 * 수정 중인 자신(selfId)은 제외한다. 마케팅엔 없는 검사다(캠페인은 중복 발송이 정상이다).
 */
export function hasDuplicateRule(
  list: readonly NotificationRule[],
  trigger: TriggerId,
  channel: NotificationChannel,
  selfId: string | null,
): boolean {
  return list.some(
    (rule) => rule.id !== selfId && rule.trigger === trigger && rule.channel === channel,
  );
}
