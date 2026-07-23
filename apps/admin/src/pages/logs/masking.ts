// 민감정보 마스킹 (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 로그 섹션의 심장인가]
//
// 감사 로그의 상세 페이로드는 **요청 본문 그대로**다. 그 안에는 비밀번호·토큰·API 키·
// 카드번호·주민등록번호가 실제로 들어 있다. 그것을 그대로 그리면 이 화면은 감사 도구가 아니라
// **자격증명 열람 창구**가 된다 — 로그를 볼 수 있는 모든 운영자가 모든 회원의 비밀번호를 본다.
//
// 로그 화면의 목적은 '무엇이 일어났는가'를 보는 것이지 '비밀이 무엇인가'를 보는 것이 아니다.
// **`password` 필드가 있었다는 사실**은 감사에 필요하고, **그 값**은 필요하지 않다.
// 그래서 키는 남기고 값만 가린다 — 필드를 통째로 지우면 '무엇을 보냈는지'가 사라져 감사가 안 된다.
//
// [마스킹은 화면이 아니라 여기서 한다]
// 컴포넌트가 각자 마스킹하면 한 곳만 빠뜨려도 유출이다. 페이로드는 **이 파일을 통과한 뒤에만**
// 화면에 닿는다 (LogPayloadDialog 는 maskPayload 의 결과만 받는다).
//
// [실제 서버라면 서버가 먼저 가려야 한다]
// 클라이언트 마스킹은 **두 번째 방어선**이다. 진짜 방어선은 '애초에 비밀을 로그에 쓰지 않는 것'
// 이고 그 다음이 '서버가 저장 시점에 가리는 것'이다. 여기서 가리는 것은 이미 저장돼 버린
// 페이로드가 화면에 닿는 마지막 순간을 막을 뿐이다 — 그래서 백엔드 연동 시 이 규칙은
// 사라지는 것이 아니라 **서버 규칙과 이중으로** 남는다.
// ─────────────────────────────────────────────────────────────────────────────

/** 가려진 값의 표기 — '값이 있었고, 가렸다'를 함께 말한다 (빈 문자열이면 없었던 것과 같아진다) */
export const REDACTED_LABEL = '●●●●●● [마스킹됨]';

/** 값을 어떻게 가릴 것인가 */
type MaskKind =
  /** 전부 가린다 — 부분도 남기지 않는다 (비밀번호·토큰) */
  | 'redact'
  /** 뒤 4자만 남긴다 — 어느 키/카드였는지 대조할 수 있어야 감사가 된다 */
  | 'tail'
  | 'email'
  | 'phone';

interface KeyRule {
  readonly pattern: RegExp;
  readonly kind: MaskKind;
}

/**
 * 키 이름 → 마스킹 방식.
 *
 * **순서가 규칙이다** — 위에서부터 처음 걸리는 것이 이긴다. 그래서 가장 위험한 것
 * (비밀번호·토큰)이 맨 위다: `password_hint` 같은 이름이 다른 규칙에 먼저 걸려
 * 덜 가려지는 일이 없어야 한다. 모르는 키는 가리지 않는다 — 다 가리면 감사가 불가능해진다.
 */
const KEY_RULES: readonly KeyRule[] = [
  { pattern: /pass(word|wd|phrase)|비밀번호|secret|credential|private[-_]?key/i, kind: 'redact' },
  { pattern: /token|authorization|bearer|jwt|cookie|session[-_]?id|refresh/i, kind: 'redact' },
  // 커넥션 문자열에는 비밀번호가 통째로 박혀 있다 ('postgres://user:pass@host') — 조각내지 않고 전부 가린다
  { pattern: /connection[-_]?(string|uri|url)|^dsn$/i, kind: 'redact' },
  { pattern: /(api|access|client)[-_]?(key|secret)|signature/i, kind: 'tail' },
  //
  // [`^card$` 가 있는 이유 — 실제로 뚫렸던 구멍]
  // 카드 정보는 `{ card: { number, cvc } }` 처럼 **객체로 감싸져 온다.** 예전 규칙은
  // `card[-_]?(no|number)` 라서 'cardNumber' 는 잡았지만 감싼 `card` 는 잡지 못했고,
  // 자식 키 `number` 는 너무 흔해 규칙에 넣을 수 없다 — 그래서 카드번호가 그대로 화면에 찍혔다.
  // (테스트가 그것을 잡아냈다.) 이제 `card` 라는 이름의 **가지 자체**를 가린다:
  // 민감한 키는 더 내려가지 않으므로(walk 참조) 그 아래 전부가 함께 사라진다.
  {
    pattern: /^card$|card[-_]?(no|number)|cvc|cvv|ssn|resident|jumin|주민|계좌|account[-_]?no/i,
    kind: 'tail',
  },
  //
  // [`recipient` 가 있는 이유 — `^card$` 와 같은 종류의 구멍]
  // 규칙이 자격증명만 겨냥한 동안, 발송 실패 오류의 페이로드
  // (`{ context: { recipient: 'user1099@example.com' } }` — errors/fixtures 의 EMAIL_BOUNCED)는
  // 수신자 메일 주소를 **원문 그대로** 화면에 찍었다. 'recipient' 에는 'mail' 이 없어 아래 규칙에
  // 걸리지 않는다. 마스킹은 키 이름으로만 판단하므로(walk 는 값의 생김새를 보지 않는다), 이메일을
  // 담은 키는 이름마다 여기 적어 줘야 한다.
  { pattern: /e[-_]?mail|이메일|recipient|수신자/i, kind: 'email' },
  { pattern: /phone|mobile|tel(ephone)?|휴대|전화/i, kind: 'phone' },
];

/** 그 키가 민감한가 — 아니면 undefined */
function ruleOf(key: string): MaskKind | undefined {
  return KEY_RULES.find((rule) => rule.pattern.test(key))?.kind;
}

/** 뒤 몇 자를 남길 것인가 — 대조에는 충분하고 재구성에는 부족한 수 */
const TAIL_KEEP = 4;

/** 뒤 4자만 남긴다: 'sk_live_a1b2c3d4' → '●●●●c3d4' */
export function maskTail(value: string): string {
  if (value.length <= TAIL_KEEP) return REDACTED_LABEL;
  return `●●●●${value.slice(-TAIL_KEEP)}`;
}

/**
 * 이메일 — 앞 2자와 도메인만 남긴다: 'user1042@example.com' → 'us●●●●●●@example.com'.
 * 도메인을 남기는 이유: '어느 조직에서 왔는가'가 감사의 단서이고, 그것만으로 개인이 특정되지 않는다.
 */
export function maskEmail(value: string): string {
  const at = value.lastIndexOf('@');
  if (at <= 0) return maskTail(value);

  const local = value.slice(0, at);
  const domain = value.slice(at);
  const keep = local.length <= 2 ? 1 : 2;
  return `${local.slice(0, keep)}●●●●●●${domain}`;
}

/** 전화번호 — 가운데만 가린다: '010-1234-5678' → '010-●●●●-5678' */
export function maskPhone(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) return maskTail(value);
  return `${parts[0] ?? ''}-●●●●-${parts[2] ?? ''}`;
}

function maskString(value: string, kind: MaskKind): string {
  if (kind === 'redact') return REDACTED_LABEL;
  if (kind === 'tail') return maskTail(value);
  if (kind === 'email') return maskEmail(value);
  return maskPhone(value);
}

/**
 * 민감한 키의 값을 가린다.
 *
 * 문자열이 아닌 값(숫자·객체)이 민감한 키에 있으면 **통째로 가린다** — 숫자로 된
 * 카드번호나 객체로 감싼 토큰을 '문자열이 아니라서' 통과시키면 마스킹은 뚫린 것이다.
 */
function maskSensitive(value: unknown, kind: MaskKind): unknown {
  if (typeof value === 'string') return maskString(value, kind);
  if (value === null || value === undefined) return value;
  return REDACTED_LABEL;
}

/**
 * 너무 깊은 구조는 더 내려가지 않는다 — 페이로드가 화면을 무한히 밀지 않게 한다.
 * (깊이를 넘은 자리는 '…' 로 남긴다: 잘렸다는 사실 자체가 정보다.)
 */
const MAX_DEPTH = 6;

const TRUNCATED_LABEL = '… [더 깊은 구조 생략]';
const CIRCULAR_LABEL = '… [순환 참조]';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) return TRUNCATED_LABEL;

  if (Array.isArray(value)) {
    if (seen.has(value)) return CIRCULAR_LABEL;
    seen.add(value);
    return value.map((item) => walk(item, depth + 1, seen));
  }

  if (isPlainRecord(value)) {
    if (seen.has(value)) return CIRCULAR_LABEL;
    seen.add(value);

    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const kind = ruleOf(key);
      // 민감한 키는 **더 내려가지 않는다** — 안을 들여다보는 순간 가릴 이유가 사라진다
      out[key] = kind === undefined ? walk(item, depth + 1, seen) : maskSensitive(item, kind);
    }
    return out;
  }

  return value;
}

/**
 * 페이로드 전체를 훑어 민감한 값을 가린다.
 *
 * **화면에 닿는 모든 페이로드는 이 함수를 통과한다.** 원본은 바꾸지 않는다(새 객체를 만든다) —
 * 감사 로그는 불변이고, 마스킹은 *표시*의 일이지 *기록*의 일이 아니다.
 */
export function maskPayload(payload: unknown): unknown {
  return walk(payload, 0, new WeakSet<object>());
}

/**
 * 상세 다이얼로그에 그릴 문자열 — 마스킹된 페이로드의 들여쓴 JSON.
 * 직렬화할 수 없는 값(BigInt 등)이 섞여도 화면이 죽지 않게 한 번 감싼다.
 */
export function formatMaskedPayload(payload: unknown): string {
  try {
    return JSON.stringify(maskPayload(payload), null, 2) ?? String(payload);
  } catch {
    return '[페이로드를 표시할 수 없어요]';
  }
}
