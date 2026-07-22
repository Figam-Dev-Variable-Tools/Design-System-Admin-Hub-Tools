// 알림 저장소 — 사실의 **사본**을 읽고, 읽음 여부만 쥔다
//
// ─────────────────────────────────────────────────────────────────────────────
// [알림에 상태 전이를 넣지 않는다 — 이 파일에서 가장 중요한 결정]
// 알림 하나에 '처리 완료' 를 달고 싶은 유혹이 늘 있다. 넣으면 안 된다: 문의의 정본 상태는
// 문의가 갖고 있고(답변 대기 → 답변 완료 → 종결), 알림은 그 사실을 **복사해 온 종이**다.
// 종이에 도장을 찍으면 정본과 갈라지고, 그때부터 두 화면이 서로 다른 진실을 말한다.
// 그래서 여기 있는 상태는 **읽음/안읽음** 하나뿐이다 — 그것만이 알림 자신의 사실이다.
//
// [폴링을 SSE 인 척하지 않는다]
// 실시간 수신 경로는 `TODO(backend): SSE /api/events` 다. 지금은 픽스처를 **한 번 읽는다.**
// setInterval 로 5초마다 다시 읽으면 화면은 실시간처럼 보이지만 실제로는 같은 배열을 다시
// 그리는 것뿐이고, 그 착시는 백엔드가 붙기 전까지 아무도 고치지 않는다.
//
// [읽음 여부는 어디에 사나] 지금은 이 모듈의 메모리다. 새로고침하면 초기화된다 —
// **서버가 가져야 하는 사실**이라(기기가 바뀌어도 따라와야 한다) localStorage 로 흉내 내지 않는다.
// localStorage 에 두면 '이 브라우저에서만 읽음' 이라는, 서버 도입 시 되레 지워야 할 상태가 생긴다.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';

import { wait } from '../async';
import { failIfRequested, LATENCY_MS } from '../crud';
import { formatDate, shiftDays } from '../format';
import type { NotificationKind } from './catalog';

const SCOPE = 'notifications';

export const notificationsKey = ['notifications'] as const;

/** 알림 한 건 — 무엇이 일어났고 어디를 보면 되는지가 전부다 */
export interface AppNotification {
  readonly id: string;
  readonly kind: NotificationKind;
  /** 목록에 굵게 나오는 한 줄 */
  readonly title: string;
  /** 한 줄 요약 — 열지 않고도 판단할 수 있게 */
  readonly body: string;
  /** 이 알림이 가리키는 항목 id. 비면 목록으로 간다 */
  readonly targetId: string;
  /** ISO 8601 */
  readonly occurredAt: string;
}

/* ── 픽스처 ──────────────────────────────────────────────────────────────────
 *
 * 실명 0건 — 이름은 마스킹, 도메인은 example.com(RFC 2606 예약).
 * 권한 필터가 실제로 걸리는지 보려면 **여러 리소스**의 알림이 섞여 있어야 한다.
 *
 * ┌ targetId 는 **실재하는 픽스처 id 다** ────────────────────────────────────┐
 * │ 아무 문자열이나 넣으면 알림을 눌렀을 때 '항목을 찾을 수 없습니다' 가 뜬다 —   │
 * │ 그러면 이 화면은 '알림이 상세로 데려간다' 를 증명하지 못한다. 그래서 각        │
 * │ 도메인 픽스처의 실제 id 를 **문자열로** 적어 둔다.                          │
 * │                                                                          │
 * │ ⚠ 이것은 import 가 아니다. 알림 층은 문의·주문 저장소를 알지 못하며(축1      │
 * │ page-coupling 이 그것을 금지한다), 조회기 이음매도 두지 않았다 — 진짜 알림은  │
 * │ **서버가 만든다**(SSE). 클라이언트가 다른 모듈의 저장소를 훑어 알림을 지어내면 │
 * │ 그것은 알림이 아니라 '목록을 대신 새로고침해 주는 코드' 이고, 그 착시가 있는  │
 * │ 한 아무도 SSE 를 붙이지 않는다.                                            │
 * │ 백엔드가 붙으면 이 배열 전체가 사라진다 — 유지할 짝이 남지 않는다.            │
 * └──────────────────────────────────────────────────────────────────────────┘ */

interface Spec {
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly targetId: string;
  readonly daysAgo: number;
  readonly hour: number;
}

const SPECS: readonly Spec[] = [
  {
    kind: 'product-inquiry-new',
    title: '새 상품 문의가 접수되었습니다',
    body: '‘접이식 회의 테이블’ 재고 문의 · 한**',
    targetId: 'PIQ-20260721-005',
    daysAgo: 0,
    hour: 9,
  },
  {
    kind: 'product-inquiry-sla',
    title: '상품 문의 응답 기한이 임박했습니다',
    body: '접수 후 3일 — 오늘 안에 답변해야 약속을 지킵니다.',
    targetId: 'PIQ-20260710-004',
    daysAgo: 0,
    hour: 8,
  },
  {
    kind: 'order-new',
    title: '새 주문이 접수되었습니다',
    body: 'ORD-20260721-0001 · 결제 대기',
    targetId: 'ORD-20260721-0001',
    daysAgo: 0,
    hour: 7,
  },
  {
    kind: 'order-claim',
    title: '반품 요청이 접수되었습니다',
    body: '주문 ORD-20260712-0031 · 사유: 단순 변심',
    targetId: 'clm-1',
    daysAgo: 1,
    hour: 18,
  },
  {
    kind: 'program-inquiry-new',
    title: '새 프로그램 문의가 접수되었습니다',
    body: '‘도심형 공유오피스’ 후원 조건 문의 · 유**',
    targetId: 'PGQ-20260721-005',
    daysAgo: 1,
    hour: 15,
  },
  {
    kind: 'member-signup',
    title: '새 회원이 가입했습니다',
    body: '차** (c***@example.com) · 유입: 네이버쇼핑',
    targetId: 'M-00001',
    daysAgo: 2,
    hour: 11,
  },
  {
    kind: 'support-ticket-new',
    title: '새 1:1 문의가 접수되었습니다',
    body: '배송 지연 문의 · 서**',
    targetId: 'tkt-1',
    daysAgo: 3,
    hour: 13,
  },
];

/** '오늘로부터 d일 전, 서울 기준 hh시' → UTC ISO (pages/logs/fixture-lib.ts 와 같은 규약) */
function atKst(daysAgo: number, hour: number, minute: number): string {
  const day = shiftDays(formatDate(new Date()), -daysAgo);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return new Date(`${day}T${pad(hour)}:${pad(minute)}:00+09:00`).toISOString();
}

const FIXTURE: readonly AppNotification[] = SPECS.map((spec, index) => ({
  id: `ntf-${String(index + 1).padStart(3, '0')}`,
  kind: spec.kind,
  title: spec.title,
  body: spec.body,
  targetId: spec.targetId,
  occurredAt: atKst(spec.daysAgo, spec.hour, (index * 11) % 60),
}));

/**
 * 알림 목록 — 최신이 위.
 *
 * TODO(backend): SSE /api/events — 서버가 이벤트를 밀어 준다. 그때 이 함수는 초기 스냅숏
 * (GET /api/notifications)만 담당하고, 이후 갱신은 EventSource 가 캐시에 붙인다.
 * **폴링으로 대신하지 않는다** — 폴링은 실시간이 아니고, 실시간인 척하면 아무도 SSE 를 붙이지 않는다.
 */
export async function fetchNotifications(signal: AbortSignal): Promise<readonly AppNotification[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'list');
  return [...FIXTURE].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

/* ── 읽음 여부 ───────────────────────────────────────────────────────────── */

interface ReadState {
  /** 읽은 알림 id — **안읽음 수는 저장하지 않는다.** 그건 이 집합에서 파생된다 */
  readonly readIds: ReadonlySet<string>;
  readonly markRead: (id: string) => void;
  readonly markAllRead: (ids: readonly string[]) => void;
}

// TODO(backend): PUT /api/notifications/:id/read · PUT /api/notifications/read-all
//   읽음은 사람에 매인 사실이라 서버가 갖는다 — 기기를 바꿔도 따라와야 한다.
export const useNotificationReadState = create<ReadState>((set) => ({
  readIds: new Set<string>(),

  markRead: (id) => {
    set((state) => {
      if (state.readIds.has(id)) return state;
      const next = new Set(state.readIds);
      next.add(id);
      return { readIds: next };
    });
  },

  markAllRead: (ids) => {
    set((state) => {
      const next = new Set(state.readIds);
      for (const id of ids) next.add(id);
      return { readIds: next };
    });
  },
}));
