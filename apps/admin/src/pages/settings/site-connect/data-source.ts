// 사이트 연동 데이터 소스 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/site-connect/**)
//
// ┌ 웹훅 수신을 흉내 내지 않는다 ──────────────────────────────────────────────┐
// │ 이벤트를 만드는 코드는 이 앱에 없다. 여기 있는 관측 픽스처는 **이미 도착해     │
// │ 있던 것**이고, 새 이벤트가 생기는 경로는 하나뿐이다:                         │
// │   TODO(backend): POST /api/site-connect/events                             │
// │ 프론트가 setInterval 로 이벤트를 지어내면 화면은 잘 도는 것처럼 보이지만,      │
// │ 실제로는 아무것도 연동되지 않은 상태다 — 가짜 성공을 만들지 않는다             │
// │ (../api-keys/ai-connections.ts 와 같은 규율).                               │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [평문 키는 이 파일에도 오지 않는다] 저장 요청에는 실리지만 문서에는 `hasSecret` 만 남는다
// (./rules.ts 의 toDoc). 그래서 이 모듈이 든 문서를 통째로 출력해도 키는 없다.
//
// [실패/충돌 재현] /settings/site-connect?fail=load · ?fail=save · ?fail=conflict
import { createRevisionedStore } from '../_shared/store';
import { toObservation } from './rules';
import type { SiteConnectDoc, TrafficObservation } from './rules';
import type { TrafficSource, TrafficSubjectRef } from '../../../shared/domain/traffic-source';

const SCOPE = 'site-connect';

export const siteConnectKey = ['settings', 'site-connect'] as const;

/**
 * 초기값 — **연동 꺼짐이다.**
 *
 * 픽스처로 '이미 연동된 것처럼' 채우지 않는다: 그러면 아무것도 설정하지 않은 계정이 유입 통계를
 * 사실로 읽는다. 운영자가 실제로 도메인과 키를 넣어야 켜진다.
 */
const DEFAULT_DOC: SiteConnectDoc = {
  enabled: false,
  siteUrl: '',
  allowedOrigins: [],
  hasSecret: false,
};

// TODO(backend): GET/PUT /api/settings/site-connect
//   요청에만 평문 키가 실리고 응답에는 실리지 않는다. 요청 본문을 로깅하지 않는다.
export const siteConnectStore = createRevisionedStore<SiteConnectDoc>(SCOPE, DEFAULT_DOC, {
  updatedBy: '김운영',
  updatedAt: '2026-07-10T01:20:00.000Z',
});

/** 충돌 다이얼로그가 '무엇이 달라졌는가' 를 짚을 때 쓰는 라벨 (../_shared/diff.ts) */
export const SITE_CONNECT_FIELD_LABELS: Readonly<Record<keyof SiteConnectDoc, string>> = {
  enabled: '연동 사용',
  siteUrl: '홈페이지 도메인',
  allowedOrigins: '추가 허용 출처',
  hasSecret: '연동 키',
};

/* ── 관측 픽스처 ─────────────────────────────────────────────────────────────
 *
 * 세 도메인(주문·문의·회원)이 **같은 한 벌**을 쓴다는 사실이 픽스처에서부터 보여야 한다 —
 * 도메인마다 모양이 다르면 공통 타입을 만든 이유가 없다.
 *
 * 실명 0건 · 실재 호스트 0건: 이름은 마스킹, 도메인은 example.com(RFC 2606 예약)만 쓴다. */

interface ObservationSpec {
  readonly id: string;
  readonly subjectLabel: string;
  readonly domain: TrafficObservation['domain'];
  readonly subjectId: string;
  readonly channel: string;
  readonly campaign: string | null;
  readonly referrer: string | null;
  readonly landedAt: string;
}

const SPECS: readonly ObservationSpec[] = [
  {
    id: 'obs-1',
    subjectLabel: '한** (h***@example.com)',
    domain: 'member',
    subjectId: 'mem-1001',
    channel: 'instagram',
    campaign: 'spring-brand',
    referrer: 'https://ads.example.com/c/1',
    landedAt: '2026-03-11T02:14:00.000Z',
  },
  {
    id: 'obs-2',
    subjectLabel: '주문 ORD-20260705-0021',
    domain: 'order',
    subjectId: 'ord-0021',
    channel: 'naver-shopping',
    campaign: null,
    referrer: 'https://search.example.com/?q=%EA%B3%B5%EA%B0%84',
    landedAt: '2026-07-05T05:02:00.000Z',
  },
  {
    id: 'obs-3',
    subjectLabel: '문의 INQ-0142',
    domain: 'inquiry',
    subjectId: 'inq-0142',
    // 리퍼러가 없는 유입 — '알 수 없음' 이라는 열 번째 채널을 만들지 않고 direct 로 흡수한다
    channel: '',
    campaign: null,
    referrer: null,
    landedAt: '2026-07-12T23:40:00.000Z',
  },
  {
    id: 'obs-4',
    subjectLabel: '유** (y***@example.com)',
    domain: 'member',
    subjectId: 'mem-1002',
    channel: 'google',
    campaign: 'always-on-search',
    referrer: 'https://search.example.org/',
    landedAt: '2026-04-21T07:31:00.000Z',
  },
];

/** 관측 원장 — 해석에 실패한 이벤트는 애초에 담기지 않는다(시각 없는 이벤트는 버려진다) */
const OBSERVATIONS: readonly TrafficObservation[] = SPECS.flatMap((spec) => {
  const observation = toObservation(spec.id, spec.subjectLabel, spec.domain, spec.subjectId, {
    channel: spec.channel,
    campaign: spec.campaign,
    referrer: spec.referrer,
    landedAt: spec.landedAt,
  });
  return observation === null ? [] : [observation];
});

/** 최근 관측 — **최초 접점 순**으로 최신이 위 */
export function listTrafficObservations(): readonly TrafficObservation[] {
  return [...OBSERVATIONS].sort((a, b) => b.source.landedAt.localeCompare(a.source.landedAt));
}

/**
 * 이 주문/문의/회원의 최초 유입원 — 없으면 null.
 *
 * `src/wiring.ts` 가 이 함수를 공통 층의 조회기로 꽂는다. 주문·문의·회원 화면은 이 파일도,
 * '사이트 연동' 이라는 모듈도 끝까지 모른다(shared/domain/traffic-source.ts 머리말).
 *
 * ⚠ 짝이 되는 쓰기 함수는 없다 — 유입은 관측값이고 관리자가 고칠 수 있으면 측정이 아니다.
 */
export function findTrafficSource(ref: TrafficSubjectRef): TrafficSource | null {
  const found = OBSERVATIONS.find(
    (observation) => observation.domain === ref.domain && observation.subjectId === ref.id,
  );
  return found?.source ?? null;
}
