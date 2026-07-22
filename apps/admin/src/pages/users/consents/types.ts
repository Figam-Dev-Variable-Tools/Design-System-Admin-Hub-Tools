// 동의 이력 화면의 모델 (라우트: /users/consents)
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 화면이 왜 필요한가 — 지금 앱에는 '동의' 라는 사실이 없다]
// /content/terms · /content/privacy 는 **문서 본문**을 관리한다. 문서가 있다는 것과 누가 그것에
// 동의했다는 것은 다른 사실이고, 분쟁에서 요구되는 것은 후자다. 지금 앱에는 동의 항목의 정의도
// 이력 조회도 없었다.
//
// [법이 정한 두 가지 — 화면이 이것을 강제한다]
//   ① 동의는 **항목마다 구분해** 알리고 받는다. 마케팅 수신 동의를 필수로 강제하면 최대
//      1,000만 원의 과태료 대상이다 → 선택 항목은 '선택' 밖으로 나갈 수 없다(rules.ts 의 가드).
//   ② 동의 없이 이용하면 5년 이하 징역 또는 5천만 원 이하 벌금이다 → 그러므로 '동의했는가' 를
//      **언제든 증명할 수 있어야** 하고, 증명은 이력이 한다.
//
// [이력은 append-only 다 — 이 파일에 update/delete 타입이 없는 이유]
// 동의 이력을 고칠 수 있으면 그것은 증거가 아니다. 그래서 이 모델에는 '수정된 동의' 라는 상태가
// 없고, 마음이 바뀐 것은 **철회 이벤트를 한 줄 더 쌓아** 표현한다(감사 로그 pages/logs 와 같은 규율).
// 현재 상태는 저장되지 않는다 — 이력의 마지막 줄에서 **파생**된다(rules.ts 의 currentDecision).
// ─────────────────────────────────────────────────────────────────────────────
import type { StatusTone } from '../../../shared/ui';

/* ── 동의 항목의 성격 ────────────────────────────────────────────────────── */

/**
 * 무엇을 위한 동의인가.
 *
 * 이 축이 필수/선택을 **정하지는 않지만 제한한다**: 마케팅·선택 개인정보·제3자 제공은 서비스
 * 이용의 조건이 될 수 없으므로 필수가 될 수 없다(rules.ts 의 necessityChangeBlock).
 * 그래서 성격은 운영자가 고르는 값이 아니라 항목이 태어날 때 정해지는 사실이다.
 */
export type ConsentPurpose =
  'service' | 'privacy-essential' | 'privacy-optional' | 'third-party' | 'marketing';

export const CONSENT_PURPOSE_LABEL: Readonly<Record<ConsentPurpose, string>> = {
  service: '서비스 이용',
  'privacy-essential': '개인정보 (필수)',
  'privacy-optional': '개인정보 (선택)',
  'third-party': '제3자 제공',
  marketing: '광고성 정보 수신',
};

/** 필수/선택 — 화면에서 바꿀 수 있는 유일한 축이다(그마저도 한쪽으로만) */
export type ConsentNecessity = 'required' | 'optional';

export const NECESSITY_LABEL: Readonly<Record<ConsentNecessity, string>> = {
  required: '필수',
  optional: '선택',
};

/** 필수는 강한 표시(danger 가 아니라 info — 위험이 아니라 성격이다), 선택은 중립 */
export function necessityTone(necessity: ConsentNecessity): StatusTone {
  return necessity === 'required' ? 'info' : 'neutral';
}

/**
 * 동의 항목 하나의 정의.
 *
 * `termsTypeId` 는 콘텐츠 관리 약관의 종류 id 다 — 동의를 받을 때 **어느 문서의 어느 버전**을
 * 보여 줬는지가 이 참조로 이어진다(shared/domain/terms-version.ts). 약관 문서가 없는 항목
 * (예: 만 14세 이상 확인)은 null 이다: 없는 참조를 지어내지 않는다.
 */
export interface ConsentItemDef {
  readonly id: string;
  readonly label: string;
  /** 가입 화면에 그대로 노출되는 안내 — 무엇에 동의하는지가 여기서 끝나야 한다 */
  readonly description: string;
  readonly purpose: ConsentPurpose;
  readonly necessity: ConsentNecessity;
  readonly termsTypeId: string | null;
  /**
   * 보관 기간(개월). 철회 후 이 기간이 지나면 파기 대상이다.
   *
   * 0 이 아니라 양수인 이유: 철회 직후 곧바로 지우면 '동의했었다는 사실' 자체가 사라져
   * 분쟁 시 아무것도 증명할 수 없다. 법정 보관 기간 동안은 남기고, 그 뒤에 지운다.
   */
  readonly retentionMonths: number;
}

/** 화면이 저장하는 문서 — 항목 정의 묶음 하나 */
export interface ConsentItemsDoc {
  readonly items: readonly ConsentItemDef[];
}

/* ── 이력 ────────────────────────────────────────────────────────────────── */

/** 무슨 일이 일어났는가 — 둘뿐이다. '수정' 은 없다 */
export type ConsentAction = 'granted' | 'withdrawn';

export const CONSENT_ACTION_LABEL: Readonly<Record<ConsentAction, string>> = {
  granted: '동의',
  withdrawn: '철회',
};

export function consentActionTone(action: ConsentAction): StatusTone {
  return action === 'granted' ? 'success' : 'warning';
}

/**
 * 어디서 받은 동의인가 — **출처가 없는 동의는 증명력이 약하다.**
 *
 * '동의함' 만 남으면 나중에 "그 체크박스가 어느 화면에 어떤 문구로 있었나" 에 답할 수 없다.
 * 어휘를 상수로 고정하는 이유는 채널 카탈로그와 같다: 자유 입력이면 같은 화면이 네 이름으로 쌓인다.
 */
export const CONSENT_SOURCES = [
  { id: 'signup', label: '회원가입 폼' },
  { id: 'mypage', label: '마이페이지 설정' },
  { id: 'order', label: '주문서' },
  { id: 'inquiry', label: '문의 폼' },
  { id: 'event', label: '이벤트 응모' },
  { id: 'unsubscribe', label: '수신거부 링크' },
  { id: 'admin', label: '관리자 대행 접수' },
] as const;

export type ConsentSource = (typeof CONSENT_SOURCES)[number]['id'];

export function consentSourceLabel(source: ConsentSource): string {
  return CONSENT_SOURCES.find((entry) => entry.id === source)?.label ?? source;
}

/**
 * 이력 한 줄 — **일어난 일의 사본이며 고쳐지지 않는다.**
 *
 * [왜 subjectLabel 을 함께 들고 있나] 이력은 회원 명부를 조회해 이름을 붙이지 않는다. 회원이
 * 탈퇴하면 명부에서 사라지지만 그 사람의 동의 사실은 보관 기간 동안 남아야 하고, 그때 이력이
 * 이름을 잃으면 '누구의 동의였는지 모르는 동의' 가 된다. 사건 시점의 표시값을 그 줄이 스스로
 * 들고 있는 것이 append-only 로그의 성질이다(pages/logs 와 같은 판단).
 * 표시값은 **마스킹된 것**만 담는다 — 관리자에게 전체 성명을 흘릴 이유가 없다.
 */
export interface ConsentEvent {
  readonly id: string;
  /** 회원 id — 같은 사람의 이력을 잇는 유일한 키 */
  readonly subjectId: string;
  /** 마스킹된 표시값 ('한**' · 'h***@example.com') */
  readonly subjectLabel: string;
  readonly itemId: string;
  readonly action: ConsentAction;
  /** ISO 8601 — 초 단위까지 남긴다 */
  readonly occurredAt: string;
  /** 그때 보여 준 약관 버전 ('v1.1'). 약관이 없는 항목이거나 철회면 null */
  readonly termsVersion: string | null;
  readonly source: ConsentSource;
}

/* ── 필터 어휘 ───────────────────────────────────────────────────────────── */

export const CONSENT_FILTER_ALL = 'all';

export type ConsentActionFilter = typeof CONSENT_FILTER_ALL | ConsentAction;

export const CONSENT_ACTION_FILTERS: readonly { id: ConsentActionFilter; label: string }[] = [
  { id: CONSENT_FILTER_ALL, label: '전체' },
  { id: 'granted', label: '동의' },
  { id: 'withdrawn', label: '철회' },
];

export const CONSENT_ACTION_FILTER_VALUES: readonly ConsentActionFilter[] =
  CONSENT_ACTION_FILTERS.map((entry) => entry.id);
