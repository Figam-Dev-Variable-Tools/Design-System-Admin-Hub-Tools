// 사이트 연동의 순수 규칙 (라우트: /settings/site-connect)
//
// [가드는 사유를 돌려준다] boolean 을 돌려주면 화면이 문구를 따로 적게 되고, 그 문구는 판정과
// 갈라진다. '막힘 + 이유' 를 함께 돌려주면 토글의 disabled 와 저장의 거절이 **같은 문장**을 읽는다.
import { toTrafficSource } from '../../../shared/domain/traffic-source';
import type { TrafficSource } from '../../../shared/domain/traffic-source';
import type { SiteConnectValues } from './validation';

/* ── 허용 출처 ───────────────────────────────────────────────────────────── */

/** 줄바꿈·쉼표로 나눈 뒤 빈 줄을 버린다 — 빈 문자열을 목록에 넣지 않는다 */
export function parseAllowedOrigins(raw: string): readonly string[] {
  return raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

const ORIGIN_RE = /^https:\/\/[^\s/?#]+\.[^\s/?#]+$/;

/**
 * 형식이 틀린 출처의 첫 줄 — 없으면 null.
 *
 * 경로가 붙은 값(`https://shop.example.com/kr`)도 거절한다. 출처(origin)는 스킴+호스트까지이고,
 * 경로를 넣으면 브라우저가 보내는 Origin 헤더와 영영 일치하지 않아 **모든 이벤트가 조용히 거절된다.**
 */
export function firstInvalidOrigin(raw: string): string | null {
  return parseAllowedOrigins(raw).find((origin) => !ORIGIN_RE.test(origin)) ?? null;
}

/* ── 연동을 켤 수 있는가 ─────────────────────────────────────────────────── */

/**
 * 연동을 **켤 수 없는 이유** — 켤 수 있으면 null.
 *
 * [왜 저장 버튼이 아니라 토글에 거는가] '켤 수 없는 상태로 저장' 을 애초에 만들지 않는다.
 * 저장 버튼을 막으면 도메인만 고치러 들어온 운영자까지 저장을 못 하게 되고, 그때 화면은
 * 아무 이유도 말하지 못한다. 막아야 하는 것은 저장이 아니라 **성립하지 않는 연동**이다.
 */
export function enableBlock(values: SiteConnectValues): string | null {
  if (values.siteUrl.trim() === '') {
    return '홈페이지 도메인을 입력해야 연동을 켤 수 있습니다. 어느 사이트에서 온 이벤트인지 확인할 방법이 없습니다.';
  }

  const invalid = firstInvalidOrigin(values.allowedOrigins);
  if (invalid !== null) {
    return `추가 허용 출처 ‘${invalid}’ 의 형식이 올바르지 않습니다. https://호스트 형태로, 경로 없이 적어 주세요.`;
  }

  if (!values.hasSecret && values.secretInput.trim() === '') {
    return '연동 키가 저장돼 있지 않습니다. 키 없이 연동을 켜면 들어오는 이벤트를 검증할 수 없어 모두 거절됩니다.';
  }

  return null;
}

/**
 * 저장해도 되는가 — 저장 경로가 마지막으로 보는 술어.
 *
 * 토글이 이미 막고 있는데 또 보는 이유: 폼 값은 다른 탭·개발자도구에서 바뀔 수 있고, 거절의
 * 책임은 화면이 아니라 저장 경로가 진다(shared/permissions 의 역할 삭제 가드와 같은 분담).
 */
export function saveBlock(values: SiteConnectValues): string | null {
  const invalid = firstInvalidOrigin(values.allowedOrigins);
  if (invalid !== null) {
    return `추가 허용 출처 ‘${invalid}’ 의 형식이 올바르지 않습니다. https://호스트 형태로, 경로 없이 적어 주세요.`;
  }
  return values.enabled ? enableBlock(values) : null;
}

/* ── 저장 문서 만들기 ────────────────────────────────────────────────────── */

/** 저장 문서 — **평문 키는 담기지 않는다.** 입력이 있으면 '저장돼 있다' 는 사실만 남는다 */
export interface SiteConnectDoc {
  readonly enabled: boolean;
  readonly siteUrl: string;
  readonly allowedOrigins: readonly string[];
  readonly hasSecret: boolean;
}

/**
 * 폼 값 → 저장 문서. 평문은 여기서 마지막으로 존재하고 **버려진다**.
 *
 * ../api-keys 의 applyCredentials 와 같은 규약이다: 자리를 만들지 않는 것이 방어다.
 */
export function toDoc(values: SiteConnectValues): SiteConnectDoc {
  return {
    enabled: values.enabled,
    siteUrl: values.siteUrl.trim(),
    allowedOrigins: parseAllowedOrigins(values.allowedOrigins),
    // 새 키를 넣었으면 저장된다. 비워 두면 기존 상태가 그대로다(빈 문자열 = '그대로 둔다')
    hasSecret: values.hasSecret || values.secretInput.trim() !== '',
  };
}

/** 저장 문서 → 폼 값. 키 입력 칸은 **언제나 비어서** 온다(채울 값을 우리도 갖고 있지 않다) */
export function toValues(doc: SiteConnectDoc): SiteConnectValues {
  return {
    enabled: doc.enabled,
    siteUrl: doc.siteUrl,
    allowedOrigins: doc.allowedOrigins.join('\n'),
    hasSecret: doc.hasSecret,
    secretInput: '',
  };
}

/* ── 수신 이벤트의 해석 — 백엔드가 붙었을 때 이 함수가 그 자리에 선다 ───────── */

/** 관측 한 건 — 화면이 목록으로 그리는 값 */
export interface TrafficObservation {
  readonly id: string;
  /** 마스킹된 대상 표시값 */
  readonly subjectLabel: string;
  readonly domain: 'order' | 'inquiry' | 'member';
  readonly subjectId: string;
  readonly source: TrafficSource;
}

/**
 * 들어온 이벤트를 관측으로 바꾼다 — **해석할 수 없으면 null.**
 *
 * TODO(backend): POST /api/site-connect/events 가 도착하면 이 함수가 그 본문을 받는다.
 * 지금은 픽스처가 같은 함수를 통과한다 — 그래야 픽스처와 실연동이 **같은 해석**을 밟는다.
 * (웹훅 수신을 흉내 내지 않는다: 이벤트를 만드는 코드는 이 앱에 없다.)
 */
export function toObservation(
  id: string,
  subjectLabel: string,
  domain: TrafficObservation['domain'],
  subjectId: string,
  raw: Parameters<typeof toTrafficSource>[0],
): TrafficObservation | null {
  const source = toTrafficSource(raw);
  if (source === null) return null;
  return { id, subjectLabel, domain, subjectId, source };
}
