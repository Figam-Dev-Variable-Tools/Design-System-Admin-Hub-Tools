// 동의 이력 데이터 소스 (라우트: /users/consents)
//
// ┌ 쓰기 계열이 **하나뿐**이다 — 그것이 이 파일의 요점이다 ─────────────────────┐
// │ 이력에는 update 도 delete 도 없다. 있는 것은 `appendConsentEvent` 하나다.      │
// │ 동의 이력을 고칠 수 있으면 그것은 증거가 아니다 — pages/logs/adapter.ts 가     │
// │ 삭제 엔드포인트를 아예 만들지 않은 것과 같은 판단이고, **없는 것은 부를 수      │
// │ 없다** 는 것이 이 불변성의 첫 방어선이다.                                     │
// │ (./rules.test.ts 가 이 모듈의 공개 표면을 훑어 그 사실을 단언한다.)             │
// │                                                                          │
// │ 항목 **정의**는 다르다 — 그것은 이력이 아니라 설정이라 저장된다.               │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [백엔드 없음] 실제 HTTP 호출은 한 줄도 없다. 아래 // TODO(backend) 가 연동 지점이다.
// [픽스처 규율] 실명 0건 — 이름은 마스킹('한**'), 이메일 도메인은 example.com(RFC 2606 예약).
import { wait } from '../../../shared/async';
import { createDocumentStore, failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { formatDate, shiftDays } from '../../../shared/format';
import { newestFirst } from './rules';
import type { ConsentEvent, ConsentItemDef, ConsentItemsDoc, ConsentSource } from './types';

const SCOPE = 'consents';

export const consentItemsKey = ['users', 'consents', 'items'] as const;
export const consentEventsKey = ['users', 'consents', 'events'] as const;

/* ── 항목 정의 ───────────────────────────────────────────────────────────────
 *
 * 다섯 항목이 실제 가입 폼의 최소 구성이다. 마케팅 수신은 **채널마다** 나눈다 — 문자만 끊고
 * 메일은 받겠다는 사람이 흔한데, 하나로 묶으면 그 의사를 표현할 수단이 없어 전부 끄게 된다. */

const DEFAULT_ITEMS: readonly ConsentItemDef[] = [
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
  {
    id: 'marketing-email',
    label: '광고성 정보 수신 동의 (이메일)',
    description: '신규 상품·할인 소식을 이메일로 보내요.',
    purpose: 'marketing',
    necessity: 'optional',
    termsTypeId: 'marketing',
    retentionMonths: 12,
  },
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

/** 항목 정의만 저장된다 — 이력은 이 문서에 실리지 않는다(성격이 다르므로 저장소도 다르다) */
// TODO(backend): GET/PUT /api/users/consent-items
export const consentItemsStore = createDocumentStore<ConsentItemsDoc>(SCOPE, {
  items: DEFAULT_ITEMS,
});

/** 화면이 항목을 아직 못 불러왔을 때 쓰는 기준선 — 빈 목록을 그리지 않기 위한 것 */
export const CONSENT_ITEM_SEED: readonly ConsentItemDef[] = DEFAULT_ITEMS;

/* ── 이력 픽스처 ─────────────────────────────────────────────────────────────
 *
 * 다섯 사람 × 다섯 항목의 조합에서 **판정이 갈리는 경우만** 골라 만든다:
 *   · 계속 동의 중 (최신 버전)      → 재동의 대상 아님
 *   · 계속 동의 중 (옛 버전 v1.0)   → 재동의 대상
 *   · 동의 후 철회, 기간 안         → 파기 대상 아님
 *   · 동의 후 철회, 기간 경과       → 파기 대상
 * 픽스처가 네 경우를 다 담아야 화면의 네 문장이 실제로 그려지는지 볼 수 있다. */

interface Subject {
  readonly id: string;
  readonly label: string;
}

const SUBJECTS: readonly Subject[] = [
  { id: 'mem-1001', label: '한** (h***@example.com)' },
  { id: 'mem-1002', label: '유** (y***@example.com)' },
  { id: 'mem-1003', label: '서** (s***@example.com)' },
  { id: 'mem-1004', label: '노** (n***@example.com)' },
  { id: 'mem-1005', label: '차** (c***@example.com)' },
];

/** '오늘로부터 d일 전, 서울 기준 hh:mm' → UTC ISO (pages/logs/fixture-lib.ts 와 같은 규약) */
function atKst(daysAgo: number, hour: number, minute: number): string {
  const day = shiftDays(formatDate(new Date()), -daysAgo);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return new Date(`${day}T${pad(hour)}:${pad(minute)}:00+09:00`).toISOString();
}

interface EventSpec {
  readonly subject: number;
  readonly itemId: string;
  readonly action: ConsentEvent['action'];
  readonly daysAgo: number;
  readonly hour: number;
  readonly termsVersion: string | null;
  readonly source: ConsentSource;
}

/**
 * 보관 기간(마케팅 12개월)을 확실히 넘긴 철회 — 파기 대상 표를 실제로 채우기 위한 것.
 * 400일이면 12개월 + 여유라, 오늘이 언제든 판정이 뒤집히지 않는다.
 */
const LONG_AGO_DAYS = 400;

const EVENT_SPECS: readonly EventSpec[] = [
  // 한** — 가입 시 전부 동의, 최신 약관 버전. 나중에 문자만 철회(기간 안)
  {
    subject: 0,
    itemId: 'terms-service',
    action: 'granted',
    daysAgo: 120,
    hour: 10,
    termsVersion: 'v1.1',
    source: 'signup',
  },
  {
    subject: 0,
    itemId: 'privacy-essential',
    action: 'granted',
    daysAgo: 120,
    hour: 10,
    termsVersion: null,
    source: 'signup',
  },
  {
    subject: 0,
    itemId: 'privacy-optional',
    action: 'granted',
    daysAgo: 120,
    hour: 10,
    termsVersion: null,
    source: 'signup',
  },
  {
    subject: 0,
    itemId: 'marketing-email',
    action: 'granted',
    daysAgo: 120,
    hour: 10,
    termsVersion: 'v1.1',
    source: 'signup',
  },
  {
    subject: 0,
    itemId: 'marketing-sms',
    action: 'granted',
    daysAgo: 120,
    hour: 10,
    termsVersion: 'v1.1',
    source: 'signup',
  },
  {
    subject: 0,
    itemId: 'marketing-sms',
    action: 'withdrawn',
    daysAgo: 20,
    hour: 21,
    termsVersion: null,
    source: 'unsubscribe',
  },

  // 유** — 선택 항목을 **끄고** 가입했다. 선택은 미동의로도 가입된다는 사실이 픽스처에 있어야 한다
  {
    subject: 1,
    itemId: 'terms-service',
    action: 'granted',
    daysAgo: 96,
    hour: 14,
    termsVersion: 'v1.1',
    source: 'signup',
  },
  {
    subject: 1,
    itemId: 'privacy-essential',
    action: 'granted',
    daysAgo: 96,
    hour: 14,
    termsVersion: null,
    source: 'signup',
  },
  // 나중에 이벤트 응모하며 이메일 수신만 켰다
  {
    subject: 1,
    itemId: 'marketing-email',
    action: 'granted',
    daysAgo: 30,
    hour: 9,
    termsVersion: 'v1.1',
    source: 'event',
  },

  // 서** — 옛 약관 버전(v1.0)에 동의한 채 남아 있다 → 재동의 대상
  {
    subject: 2,
    itemId: 'terms-service',
    action: 'granted',
    daysAgo: 300,
    hour: 11,
    termsVersion: 'v1.0',
    source: 'signup',
  },
  {
    subject: 2,
    itemId: 'privacy-essential',
    action: 'granted',
    daysAgo: 300,
    hour: 11,
    termsVersion: null,
    source: 'signup',
  },
  {
    subject: 2,
    itemId: 'marketing-email',
    action: 'granted',
    daysAgo: 300,
    hour: 11,
    termsVersion: 'v1.0',
    source: 'signup',
  },

  // 노** — 오래전 철회, 보관 기간 경과 → 파기 대상
  {
    subject: 3,
    itemId: 'terms-service',
    action: 'granted',
    daysAgo: LONG_AGO_DAYS + 40,
    hour: 8,
    termsVersion: 'v1.0',
    source: 'signup',
  },
  {
    subject: 3,
    itemId: 'marketing-email',
    action: 'granted',
    daysAgo: LONG_AGO_DAYS + 40,
    hour: 8,
    termsVersion: 'v1.0',
    source: 'signup',
  },
  {
    subject: 3,
    itemId: 'marketing-email',
    action: 'withdrawn',
    daysAgo: LONG_AGO_DAYS,
    hour: 19,
    termsVersion: null,
    source: 'mypage',
  },
  {
    subject: 3,
    itemId: 'marketing-sms',
    action: 'granted',
    daysAgo: LONG_AGO_DAYS + 40,
    hour: 8,
    termsVersion: 'v1.0',
    source: 'signup',
  },
  {
    subject: 3,
    itemId: 'marketing-sms',
    action: 'withdrawn',
    daysAgo: LONG_AGO_DAYS,
    hour: 19,
    termsVersion: null,
    source: 'mypage',
  },

  // 차** — 주문서에서 선택 개인정보만 받았고, 관리자 대행 접수 기록도 있다
  {
    subject: 4,
    itemId: 'terms-service',
    action: 'granted',
    daysAgo: 8,
    hour: 16,
    termsVersion: 'v1.1',
    source: 'order',
  },
  {
    subject: 4,
    itemId: 'privacy-essential',
    action: 'granted',
    daysAgo: 8,
    hour: 16,
    termsVersion: null,
    source: 'order',
  },
  {
    subject: 4,
    itemId: 'privacy-optional',
    action: 'granted',
    daysAgo: 3,
    hour: 13,
    termsVersion: null,
    source: 'admin',
  },
  {
    subject: 4,
    itemId: 'privacy-optional',
    action: 'withdrawn',
    daysAgo: 1,
    hour: 22,
    termsVersion: null,
    source: 'mypage',
  },
];

function buildEvents(): ConsentEvent[] {
  return EVENT_SPECS.map((spec, index) => {
    const subject = SUBJECTS[spec.subject] ?? SUBJECTS[0];
    return {
      id: `cev-${String(index + 1).padStart(4, '0')}`,
      subjectId: subject?.id ?? 'mem-0000',
      subjectLabel: subject?.label ?? '알 수 없음',
      itemId: spec.itemId,
      action: spec.action,
      occurredAt: atKst(spec.daysAgo, spec.hour, (index * 7) % 60),
      termsVersion: spec.termsVersion,
      source: spec.source,
    };
  });
}

/** 이력 원장 — **덧붙이기만 한다.** 이 배열을 줄이는 코드는 이 파일 어디에도 없다 */
const LEDGER: ConsentEvent[] = buildEvents();

/* ── 조회 ────────────────────────────────────────────────────────────────── */

// TODO(backend): GET /api/users/consent-events?from=&to=&itemId=&action=
//   서버는 **커서 페이지네이션**을 쓴다 — 이력은 지워지지 않으므로 오프셋이 계속 밀린다.
export async function fetchConsentEvents(signal: AbortSignal): Promise<readonly ConsentEvent[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'list');
  return newestFirst(LEDGER);
}

/**
 * 이력 한 줄 추가 — **관리자 화면에는 이것을 부르는 버튼이 없다.**
 *
 * 동의는 고객이 하는 행위지 운영자가 대신 눌러 주는 것이 아니다. 이 함수가 있는 이유는
 * 가입 폼·수신거부 링크 같은 **고객 접점**이 붙을 자리를 비워 두기 위해서이고, 그때도 호출은
 * 서버가 한다. 관리자 대행 접수(source: 'admin')는 서면 동의서를 받은 예외 경로다.
 */
// TODO(backend): POST /api/users/consent-events — 서버가 세션·서버 시각으로 기록한다.
//   프론트가 보내는 occurredAt 을 신뢰하면 안 된다(동의 시각은 위조되면 안 되는 값이다).
export function appendConsentEvent(event: ConsentEvent): void {
  LEDGER.push(event);
}
