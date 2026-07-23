// 질의 파서 — 자연어처럼 생긴 **제한된 문법**을 구조화된 질의로 바꾼다
//
// [이것은 언어 모델이 아니다] 이 앱에는 백엔드도 LLM 도 없다. 여기 있는 것은 정해진 어휘를
// 훑는 결정적 파서다. 같은 문장은 언제나 같은 질의가 되고, 어휘 밖의 문장은 **추측하지 않고
// 실패를 돌려준다**. 실패를 그럴듯한 답으로 메우는 순간 이 화면은 거짓말을 시작한다.
//
// [문법]
//   질의   := 멘션 조건* 지시어?
//   멘션   := '@' 도메인별칭                     — 없으면 파싱 실패(가장 흔한 경우)
//   조건   := 기간 | 값조건 | 존재조건
//   기간   := '오늘' | '어제' | '이번주' | '이번달' | '지난달' | '올해' | '최근 N일'
//   값조건 := 필드값 라벨/별칭            (예: 'VIP' → tier=vip)
//   존재조건 := 필드명사                  (예: '구매' → totalPurchase 가 0보다 큼)
//   지시어 := '뽑아줘' | '보여줘' | '알려줘' | … (목록) | '몇 명' | '건수' (개수)
//
// [기간 결합(binding) — 이 파서의 핵심]
// 기간 표현은 **혼자 뜻을 갖지 않는다.** '이번달' 은 이번달 무엇인가? 파서는 기간 표현 **뒤에**
// 오는 가장 가까운 필드 명사를 찾아 거기 묶는다.
//   '이번달 가입한 VIP' → 이번달 ⇢ 가입일 (period 축 있음)  → 정상 실행
//   '이번달 구매 VIP'   → 이번달 ⇢ 누적구매액 (period 축 **없음**) → 축 불가 통지 + 기간을 뺀 나머지 실행
//   '이번달 VIP'        → 이번달 ⇢ 도메인 기본 날짜 필드(가입일)   → 정상 실행
// 두 번째가 사용자의 예시 질의다. 누적 구매액에는 기간 정보가 없으므로(domains.ts 참조) 계산할
// 수 없다 — 파서는 이 사실을 notices 로 올려보내고, 화면은 그것을 답변에 **먼저** 적는다.
import { fieldSupports, findDomainByAlias, findDomainById } from './domains';
import type { DomainDef, DomainField, DomainFieldValue, DomainId } from './domains';

/* ── 결과 타입 ───────────────────────────────────────────────────────────── */

export type Intent = 'list' | 'count';

/** 기간 — 실행기가 [from, to] 로 바꿔 쓴다 (경계 포함) */
export interface PeriodRange {
  readonly kind:
    'today' | 'yesterday' | 'this-week' | 'this-month' | 'last-month' | 'this-year' | 'last-days';
  readonly label: string;
  /** kind 가 'last-days' 일 때만 의미가 있다 */
  readonly days: number;
}

export type Condition =
  | {
      readonly kind: 'equals';
      readonly fieldId: string;
      readonly valueId: string;
      readonly label: string;
    }
  | { readonly kind: 'present'; readonly fieldId: string; readonly label: string }
  | {
      readonly kind: 'period';
      readonly fieldId: string;
      readonly period: PeriodRange;
      readonly label: string;
    };

/**
 * 실행은 되지만 **요청 그대로는 아니라는** 통지.
 * 화면은 이것을 답변 맨 앞에 적는다 — 사용자가 자기가 물은 것과 답이 다르다는 사실을 알아야 한다.
 */
export interface ParseNotice {
  readonly code: 'period-unsupported' | 'period-domain-unsupported';
  readonly message: string;
  /** 대신 해볼 수 있는 질의 — 화면이 후속 제안(↳)으로 띄운다 */
  readonly suggestion: string | null;
}

export interface ParsedQuery {
  readonly domainId: DomainId;
  readonly intent: Intent;
  readonly conditions: readonly Condition[];
  readonly notices: readonly ParseNotice[];
}

/** 파싱 결과 — 성공이 아니면 **왜 실패했는지**가 전부 다르다. 화면이 다르게 답해야 하기 때문이다. */
export type ParseResult =
  | { readonly kind: 'ok'; readonly query: ParsedQuery }
  /** `@` 가 아예 없다 — 가장 흔한 경우다. 이 화면은 자유 질문에 답하지 않는다 */
  | { readonly kind: 'no-mention' }
  /** `@` 는 있는데 모르는 이름이다 */
  | { readonly kind: 'unknown-domain'; readonly alias: string }
  /** 도메인은 알겠는데 요구한 행위(분석·예측·요약)를 이 화면이 할 수 없다 */
  | { readonly kind: 'unsupported-intent'; readonly domainId: DomainId; readonly verb: string };

/* ── 어휘 ────────────────────────────────────────────────────────────────── */

interface PeriodToken {
  readonly token: string;
  readonly kind: PeriodRange['kind'];
}

/** 긴 것이 먼저 — '이번달' 이 '이번' 보다 먼저 걸려야 한다 */
const PERIOD_TOKENS: readonly PeriodToken[] = [
  { token: '이번달', kind: 'this-month' },
  { token: '이번 달', kind: 'this-month' },
  { token: '금월', kind: 'this-month' },
  { token: '지난달', kind: 'last-month' },
  { token: '지난 달', kind: 'last-month' },
  { token: '전월', kind: 'last-month' },
  { token: '이번주', kind: 'this-week' },
  { token: '이번 주', kind: 'this-week' },
  { token: '올해', kind: 'this-year' },
  { token: '금년', kind: 'this-year' },
  { token: '오늘', kind: 'today' },
  { token: '어제', kind: 'yesterday' },
];

/** '최근 30일' · '최근 7일' */
const RECENT_DAYS = /최근\s*(\d{1,3})\s*일/;

/** 목록을 달라는 말 */
const LIST_VERBS: readonly string[] = [
  '뽑아줘',
  '뽑아',
  '보여줘',
  '보여',
  '알려줘',
  '알려',
  '찾아줘',
  '찾아',
  '추려줘',
  '추려',
  '목록',
  '리스트',
];

/** 개수를 묻는 말 */
const COUNT_VERBS: readonly string[] = [
  '몇 명',
  '몇명',
  '몇 건',
  '몇건',
  '몇 개',
  '몇개',
  '건수',
  '카운트',
];

/**
 * 이 화면이 **할 수 없는** 행위. 도메인을 제대로 멘션했더라도 이런 말이 붙으면 거절한다 —
 * 집계·추론·생성은 결정적 조회로 흉내 낼 수 없고, 흉내 내면 그것이 곧 거짓말이다.
 */
const UNSUPPORTED_VERBS: readonly string[] = [
  '분석',
  '예측',
  '추천',
  '요약',
  '작성',
  '이유',
  '원인',
  '왜',
  '전망',
  '제안',
];

const MENTION = /@([가-힣A-Za-z0-9_]+)/;

/** 기간 표현과 필드 명사가 '붙어 있다' 고 볼 거리 — 이보다 멀면 다른 얘기다 */
const BINDING_WINDOW = 12;

/* ── 파서 ────────────────────────────────────────────────────────────────── */

function findPeriod(text: string): { readonly period: PeriodRange; readonly at: number } | null {
  const recent = RECENT_DAYS.exec(text);
  if (recent !== null) {
    const raw = recent[1];
    const days = raw === undefined ? 0 : Number(raw);
    if (days > 0) {
      return {
        period: { kind: 'last-days', label: `최근 ${String(days)}일`, days },
        at: recent.index,
      };
    }
  }

  for (const candidate of PERIOD_TOKENS) {
    const at = text.indexOf(candidate.token);
    if (at >= 0) {
      return { period: { kind: candidate.kind, label: candidate.token, days: 0 }, at };
    }
  }
  return null;
}

/**
 * 기간 표현을 어느 필드에 묶을지 고른다.
 *
 * 규칙: 기간 표현 **뒤쪽**에서 가장 가까운 필드 명사. 창(window) 밖이면 묶지 않는다.
 * 뒤쪽만 보는 이유 — 한국어에서 수식은 앞에서 뒤로 간다('이번달 가입'). 앞을 보면
 * 'VIP 중에 이번달' 같은 문장에서 엉뚱하게 VIP 에 기간이 붙는다.
 */
function bindPeriodField(domain: DomainDef, text: string, periodAt: number): DomainField | null {
  let best: { readonly field: DomainField; readonly distance: number } | null = null;

  for (const field of domain.fields) {
    for (const noun of field.nouns) {
      const at = text.indexOf(noun, periodAt);
      if (at < 0) continue;
      const distance = at - periodAt;
      if (distance > BINDING_WINDOW) continue;
      if (best === null || distance < best.distance) best = { field, distance };
    }
  }

  return best?.field ?? null;
}

/** 이 값이 문장에서 걸릴 수 있는 말 중 가장 긴 것 — 길이 비교의 기준 */
function longestWord(value: DomainFieldValue): string {
  return [value.label, ...value.aliases].reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    '',
  );
}

/** 문장에서 이 도메인의 값 조건(등급=VIP 등)을 전부 걷는다 */
function collectEqualityConditions(domain: DomainDef, text: string): readonly Condition[] {
  const found: Condition[] = [];

  for (const field of domain.fields) {
    if (!fieldSupports(field, 'equality')) continue;
    // 긴 라벨을 먼저 본다 — 'VVIP' 는 'VIP' 를 부분문자열로 포함한다. 짧은 것을 먼저 보면
    // 'VVIP 회원' 이 등급 VIP 로 걸린다(조용히 틀린 답이 나온다).
    const byLongest = [...field.values].sort(
      (a, b) => longestWord(b).length - longestWord(a).length,
    );
    for (const value of byLongest) {
      const words = [value.label, ...value.aliases];
      const hit = words.some((word) => text.toLowerCase().includes(word.toLowerCase()));
      if (!hit) continue;
      // 같은 필드에 값이 두 번 걸리지 않게 — 먼저 걸린 값을 남긴다
      if (found.some((condition) => condition.fieldId === field.id)) continue;
      found.push({
        kind: 'equals',
        fieldId: field.id,
        valueId: value.id,
        label: `${field.label} ${value.label}`,
      });
    }
  }

  return found;
}

/**
 * 존재 조건 — 필드 명사가 값 없이 홀로 나오면 '그 값이 있는 것' 을 뜻한다.
 * '구매 VIP' = 구매액이 0보다 큰 VIP. 기간에 묶인 필드는 여기서 제외한다(이미 기간으로 걸렸다).
 */
function collectPresenceConditions(
  domain: DomainDef,
  text: string,
  excludeFieldId: string | null,
): readonly Condition[] {
  const found: Condition[] = [];

  for (const field of domain.fields) {
    if (!fieldSupports(field, 'presence')) continue;
    if (field.id === excludeFieldId) continue;
    const hit = field.nouns.some((noun) => text.includes(noun));
    if (!hit) continue;
    found.push({ kind: 'present', fieldId: field.id, label: `${field.label} 있음` });
  }

  return found;
}

function detectIntent(text: string): Intent | null {
  if (COUNT_VERBS.some((verb) => text.includes(verb))) return 'count';
  if (LIST_VERBS.some((verb) => text.includes(verb))) return 'list';
  return null;
}

function detectUnsupportedVerb(text: string): string | null {
  return UNSUPPORTED_VERBS.find((verb) => text.includes(verb)) ?? null;
}

/**
 * 질의 한 줄을 파싱한다. **순수 함수** — 저장소·시계·네트워크를 건드리지 않는다.
 * 기간의 실제 날짜 범위는 실행기(execute.ts)가 '지금' 을 받아 계산한다.
 */
export function parseQuery(input: string): ParseResult {
  const text = input.trim();

  const mention = MENTION.exec(text);
  if (mention === null) return { kind: 'no-mention' };

  const alias = mention[1] ?? '';
  const domain = findDomainByAlias(alias);
  if (domain === null) return { kind: 'unknown-domain', alias };

  // 멘션을 걷어낸 나머지가 조건과 지시어의 무대다
  const rest = `${text.slice(0, mention.index)} ${text.slice(mention.index + mention[0].length)}`;

  const unsupported = detectUnsupportedVerb(rest);
  if (unsupported !== null) {
    return { kind: 'unsupported-intent', domainId: domain.id, verb: unsupported };
  }

  const notices: ParseNotice[] = [];
  const conditions: Condition[] = [];
  let periodFieldId: string | null = null;

  const periodHit = findPeriod(rest);
  if (periodHit !== null) {
    const bound = bindPeriodField(domain, rest, periodHit.at);
    const fallbackId = domain.defaultPeriodFieldId;
    const fallback = fallbackId === null ? null : domain.fields.find((f) => f.id === fallbackId);
    const target = bound ?? fallback ?? null;

    if (target === null) {
      // 이 도메인에는 날짜 필드가 아예 없다 (예: 상품)
      notices.push({
        code: 'period-domain-unsupported',
        message: `'${domain.label}' 에는 기간으로 거를 수 있는 날짜 항목이 없어요. 기간 조건 '${periodHit.period.label}' 을 빼고 조회했어요.`,
        suggestion: null,
      });
    } else if (!fieldSupports(target, 'period')) {
      // 사용자가 기간을 **기간이 없는 필드**에 걸었다 — 사용자 예시 질의가 여기로 온다
      const alt =
        fallback !== undefined && fallback !== null && fieldSupports(fallback, 'period')
          ? `@${domain.aliases[0] ?? domain.label} ${periodHit.period.label} ${fallback.nouns[0] ?? ''}한 회원 보여줘`
          : null;
      notices.push({
        code: 'period-unsupported',
        message: `'${target.label}' 에는 기간 정보가 없어 '${periodHit.period.label}' 로 거를 수 없어요. 기간 조건을 빼고 '${target.label}' 이 있는 대상만 조회했어요.`,
        suggestion: alt,
      });
    } else {
      periodFieldId = target.id;
      conditions.push({
        kind: 'period',
        fieldId: target.id,
        period: periodHit.period,
        label: `${target.label} ${periodHit.period.label}`,
      });
    }
  }

  conditions.push(...collectEqualityConditions(domain, rest));
  conditions.push(...collectPresenceConditions(domain, rest, periodFieldId));

  // 지시어가 없으면 목록으로 본다 — '@회원목록 VIP' 는 VIP 목록을 달라는 뜻으로 읽는 편이
  // 자연스럽고, 이 해석이 틀려도 사용자는 결과를 보고 바로 안다(값을 지어내지 않는다).
  const intent = detectIntent(rest) ?? 'list';

  return {
    kind: 'ok',
    query: { domainId: domain.id, intent, conditions, notices },
  };
}

/** 자동완성·안내 문구가 쓰는 도메인 목록 (화면이 domains.ts 를 직접 알지 않아도 되게) */
export function mentionSuggestions(): readonly {
  readonly alias: string;
  readonly label: string;
}[] {
  return DOMAIN_SUGGESTIONS;
}

const DOMAIN_SUGGESTIONS: readonly { readonly alias: string; readonly label: string }[] = (() => {
  const ids: readonly DomainId[] = ['members', 'products', 'tickets'];
  return ids.flatMap((id) => {
    const domain = findDomainById(id);
    if (domain === null) return [];
    const alias = domain.aliases[0];
    return alias === undefined ? [] : [{ alias, label: domain.label }];
  });
})();
