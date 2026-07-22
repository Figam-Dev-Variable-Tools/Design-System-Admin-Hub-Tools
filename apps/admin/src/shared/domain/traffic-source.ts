// 유입원(마케팅 접점) 공통 모델 — 주문·문의·회원이 **같은 한 벌**을 쓴다
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 문의의 channel 로는 안 되는가 — 다른 질문에 답하는 값이다]
// 문의에는 이미 `channel`(storefront/app/phone/…)이 있다. 그것은 **접점**이다 — 고객이 어느
// 창구로 말을 걸었는가. 유입원은 다른 질문에 답한다: 고객이 **어디서 왔는가**(네이버 검색? 인스타
// 광고? 즐겨찾기?). 둘을 한 필드에 뭉치면 '전화로 문의한 네이버 광고 유입' 을 표현할 수 없고,
// 광고비 판단이 창구 통계와 섞인다. 그래서 축을 나눠 놓고 이름도 다르게 뒀다.
//
// [왜 주문·문의·회원이 이 파일을 공유하는가]
// 세 도메인이 각자 유입원 타입을 만들면 채널 어휘가 셋으로 갈라진다('naver' vs '네이버' vs 'NAVER').
// 그러면 '네이버에서 온 주문 대비 문의 전환율' 같은 질문에 답하려면 매핑 표를 손으로 유지해야 하고,
// 그 표는 반드시 한쪽만 갱신된 채 남는다. 어휘의 정본은 하나여야 한다 — 그 하나가 여기다.
//
// [왜 pages 가 아니라 shared/domain 인가]
// 정본을 `/settings/site-connect` 에 두면 주문·문의·회원 화면이 그 페이지를 import 하게 되고,
// 그건 code-quality 축1(page-coupling, blocker, 임계값 0건)이다. 공통 층은 **어휘와 규칙**을 갖고,
// 실제 값을 꽂는 일은 두 도메인을 아는 `src/wiring.ts` 가 한다 (shared/domain/site-policy.ts 선례).
//
// [백엔드 없음] 유입 이벤트를 실제로 받는 곳은 `TODO(backend): POST /api/site-connect/events` 다.
// 이 파일은 그 이벤트가 도착했을 때 **무엇으로 해석되는가**만 정한다.
// ─────────────────────────────────────────────────────────────────────────────

/* ── 채널 카탈로그 ───────────────────────────────────────────────────────────
 *
 * 운영자가 발명하지 않는다. 자유 입력이면 같은 채널이 'naver'·'Naver'·'네이버'·'naver.com' 네
 * 갈래로 쌓이고, 그 순간 유입 통계는 합계를 낼 수 없는 문자열 더미가 된다.
 *
 * 8개 채널 + `direct`. `direct` 는 아홉 번째 채널이 아니라 **나머지 전부를 받는 자리**다
 * (아래 toChannel 머리말). */

interface TrafficChannelDef {
  readonly id: string;
  readonly label: string;
  /** 목록 배지의 색 의도 — 검색·소셜·직접을 눈으로 가른다 */
  readonly group: 'search' | 'social' | 'direct';
}

export const TRAFFIC_CHANNELS = [
  { id: 'direct', label: '직접 유입', group: 'direct' },
  { id: 'naver', label: '네이버', group: 'search' },
  { id: 'naver-shopping', label: '네이버쇼핑', group: 'search' },
  { id: 'google', label: '구글', group: 'search' },
  { id: 'daum', label: '다음', group: 'search' },
  { id: 'kakao', label: '카카오', group: 'social' },
  { id: 'instagram', label: '인스타그램', group: 'social' },
  { id: 'facebook', label: '페이스북', group: 'social' },
  { id: 'youtube', label: '유튜브', group: 'social' },
] as const satisfies readonly TrafficChannelDef[];

export type TrafficChannel = (typeof TRAFFIC_CHANNELS)[number]['id'];

/**
 * 미상이 떨어지는 자리.
 *
 * '알 수 없음' 이라는 열 번째 값을 만들지 않는다: 그 값이 생기면 운영자는 그것을 채널로 읽고
 * '알 수 없음 유입이 30%' 라는 문장을 만든다. 실제로는 리퍼러가 없었을 뿐이고, 리퍼러가 없는
 * 유입은 **직접 유입이 맞다**(즐겨찾기·주소창·앱). 어휘를 늘리는 대신 뜻을 정확히 붙인다.
 */
export const DEFAULT_TRAFFIC_CHANNEL: TrafficChannel = 'direct';

const CHANNEL_IDS: ReadonlySet<string> = new Set(TRAFFIC_CHANNELS.map((channel) => channel.id));

export function isTrafficChannel(value: unknown): value is TrafficChannel {
  return typeof value === 'string' && CHANNEL_IDS.has(value);
}

export function trafficChannelLabel(channel: TrafficChannel): string {
  return TRAFFIC_CHANNELS.find((entry) => entry.id === channel)?.label ?? '직접 유입';
}

/**
 * 카탈로그에 없는 값을 `direct` 로 흡수한다 — **빈 문자열을 만들지 않는다.**
 *
 * 이벤트는 브라우저가 보낸다. 리퍼러는 비어 있을 수 있고, 손으로 붙인 utm_source 는 오타가 난다.
 * 그때 `channel: ''` 를 저장하면 목록의 채널 열이 공백이 되고, 필터의 어느 항목에도 걸리지 않아
 * **화면에서 사라진 행**이 된다 — 데이터는 있는데 아무도 보지 못하는 상태가 가장 나쁘다.
 */
export function toTrafficChannel(raw: unknown): TrafficChannel {
  return isTrafficChannel(raw) ? raw : DEFAULT_TRAFFIC_CHANNEL;
}

/* ── 유입원 한 벌 ─────────────────────────────────────────────────────────── */

/**
 * 한 사람이 우리에게 처음 닿은 접점.
 *
 * campaign·referrer 가 `string | null` 인 이유: **빈 문자열은 값이 아니다.** ''를 허용하면
 * '캠페인 없음' 과 '캠페인 이름이 빈칸으로 저장됨' 이 같은 모양이 되고, 집계가 ''를 하나의
 * 캠페인으로 센다. 없으면 없다고 적는다.
 */
export interface TrafficSource {
  readonly channel: TrafficChannel;
  /** 광고/캠페인 식별자(utm_campaign 상당) — 없으면 null */
  readonly campaign: string | null;
  /** 직전 페이지 주소 — 없으면 null(직접 유입) */
  readonly referrer: string | null;
  /** 이 접점이 관측된 시각 (ISO 8601) */
  readonly landedAt: string;
}

/** 이벤트가 실어 오는 날것 — 어느 칸도 믿지 않는다 */
export interface TrafficSourceInput {
  readonly channel?: unknown;
  readonly campaign?: unknown;
  readonly referrer?: unknown;
  readonly landedAt?: unknown;
}

/** 공백만 있는 문자열은 없는 것과 같다 — null 로 수렴시킨다 */
function textOrNull(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return value === '' ? null : value;
}

/**
 * 날것 → 유입원. **landedAt 이 없으면 null 을 돌려준다(시각을 지어내지 않는다).**
 *
 * `new Date()` 로 채우고 싶은 유혹이 있다 — 그러면 이 함수는 언제나 성공한다. 하지만 그 시각은
 * '고객이 들어온 때' 가 아니라 '우리가 이벤트를 열어 본 때' 다. 기여도 분석의 시간축이 통째로
 * 어긋나므로, 모르면 만들지 않고 거절한다.
 */
export function toTrafficSource(input: TrafficSourceInput): TrafficSource | null {
  const landedAt = textOrNull(input.landedAt);
  if (landedAt === null || Number.isNaN(new Date(landedAt).getTime())) return null;

  return {
    channel: toTrafficChannel(input.channel),
    campaign: textOrNull(input.campaign),
    referrer: textOrNull(input.referrer),
    landedAt,
  };
}

/**
 * **최초 접점 하나만 남긴다** — 이 파일에서 가장 중요한 한 줄.
 *
 * ┌ 왜 마지막 접점으로 덮어쓰지 않는가 ─────────────────────────────────────┐
 * │ 고객의 실제 경로는 대개 이렇다:                                          │
 * │   인스타 광고를 보고 알게 됨 → 며칠 뒤 '브랜드명' 을 검색해 들어와 구매    │
 * │ 마지막 접점으로 덮어쓰면 이 구매의 공은 전부 **검색**에게 돌아가고, 광고는  │
 * │ 기여 0으로 집계된다. 그 숫자를 보고 광고를 끄면 검색 유입도 함께 마른다 —   │
 * │ 애초에 검색어를 만든 것이 그 광고였기 때문이다.                          │
 * │                                                                        │
 * │ 그래서 이미 값이 있으면 **건드리지 않는다.** 새 접점은 버리는 것이 아니라  │
 * │ 이벤트 로그에 남되, '이 사람을 데려온 것' 자리는 처음 것이 계속 차지한다.   │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export function firstTouch(existing: TrafficSource | null, incoming: TrafficSource): TrafficSource {
  return existing ?? incoming;
}

/* ── 조회기 자리 — 값은 여기 살지 않는다 ─────────────────────────────────── */

/** 유입원을 물어볼 수 있는 대상 — 세 도메인이 같은 좌표계를 쓴다 */
export interface TrafficSubjectRef {
  readonly domain: 'order' | 'inquiry' | 'member';
  readonly id: string;
}

type TrafficSourceLookup = (ref: TrafficSubjectRef) => TrafficSource | null;

/** 미배선 상태 — null 은 '유입원이 없다' 가 아니라 '읽을 통로가 없다' 다 */
let lookup: TrafficSourceLookup | null = null;

/** 조회기를 꽂는다 — 멱등. 호출자는 `src/wiring.ts` 하나다 */
export function registerTrafficSourceLookup(next: TrafficSourceLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetTrafficSourceLookup(): void {
  lookup = null;
}

/**
 * 이 주문/문의/회원의 최초 유입원 — **배선되지 않았거나 관측되지 않았으면 null**.
 *
 * ⚠ 짝이 되는 `setTrafficSourceOf` 는 **없다. 앞으로도 만들지 않는다.**
 * 유입원은 관측값이다 — 운영자가 '이건 인스타에서 온 것 같은데' 하며 고칠 수 있으면 그 순간
 * 이 데이터는 측정이 아니라 의견이 되고, 광고비 판단의 근거로 쓸 수 없어진다.
 * 쓰기 표면을 만들지 않는 것이 그 규칙의 유일하게 확실한 구현이다.
 */
export function trafficSourceOf(ref: TrafficSubjectRef): TrafficSource | null {
  if (lookup === null) return null;
  try {
    return lookup(ref);
  } catch {
    return null;
  }
}
