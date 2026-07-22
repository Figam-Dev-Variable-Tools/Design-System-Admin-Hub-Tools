// 알림 종류 카탈로그 — **운영자가 발명하지 않는다**
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 상수인가] 알림 종류를 자유 문자열로 두면 같은 사건이 '신규문의'·'새 문의'·'inquiry-new'
// 세 이름으로 쌓이고, 그 순간 '문의 알림만 끄기' 같은 설정은 만들 수 없게 된다. 종류는 코드가
// 아는 사실이지 운영자가 짓는 이름이 아니다.
//
// [경로는 nav 에서 파생된다] 각 종류는 **사이드바 잎 하나**를 가리킨다. 알림이 자기 경로를
// 통째로 들고 있으면 메뉴가 옮겨진 날 알림만 옛 주소로 간다 — 그리고 그 사실은 사용자가
// 404 를 만나고 나서야 알려진다. 여기서는 잎 경로만 적고, 상세 주소는 그 잎 + 항목 id 로 만든다.
// (`./notifications.test.ts` 가 카탈로그의 모든 잎이 nav 에 실재하는지 전수로 확인한다.)
//
// [권한 리소스도 여기서 정해진다] 잎 경로가 곧 권한 리소스다(`page:{to}` — shared/permissions/
// resources.ts 의 규약). 그래서 '알림을 볼 수 있는가' 는 '그 화면을 볼 수 있는가' 와 **같은
// 질문**이 되고, 알림이 권한 우회로가 되는 경로가 애초에 없다.
// ─────────────────────────────────────────────────────────────────────────────
import { navPageResourceId } from '../permissions/resources';
import type { ResourceId } from '../permissions/resources';

/** 색 의도 — SLA 초과처럼 이미 늦은 것과 방금 도착한 것을 눈으로 가른다 */
export type NotificationSeverity = 'info' | 'warning';

interface NotificationKindDef {
  readonly id: string;
  /** 목록 그룹 제목·설정 화면의 항목 이름 */
  readonly label: string;
  /** 이 종류가 무엇을 알리는지 — 설정 화면이 그대로 보여 준다 */
  readonly description: string;
  /**
   * 이 알림이 데려가는 **사이드바 잎**. 상세 주소는 `${leafPath}/${targetId}` 로 만든다.
   * 잎이 아닌 경로를 적으면 권한 리소스가 풀리지 않는다(nav 파생 규약).
   */
  readonly leafPath: string;
  readonly severity: NotificationSeverity;
}

/**
 * 알림 종류 8종.
 *
 * 고른 기준: **운영자가 모르면 손해가 나는 것**만. '상품이 수정되었습니다' 처럼 운영자가 직접
 * 한 일은 알림이 아니다 — 자기가 방금 한 일을 다시 알려 주는 것은 소음이고, 소음이 쌓이면
 * 정말 중요한 알림도 함께 무시된다.
 */
export const NOTIFICATION_KINDS = [
  {
    id: 'product-inquiry-new',
    label: '상품 문의 접수',
    description: '새 상품 문의가 들어오면 알립니다.',
    leafPath: '/products/inquiries',
    severity: 'info',
  },
  {
    id: 'product-inquiry-sla',
    label: '상품 문의 응답 기한 임박',
    description: '약속한 응답 기한(3일)을 넘길 상품 문의를 알립니다.',
    leafPath: '/products/inquiries',
    severity: 'warning',
  },
  {
    id: 'program-inquiry-new',
    label: '프로그램 문의 접수',
    description: '새 프로그램 문의가 들어오면 알립니다.',
    leafPath: '/programs/inquiries',
    severity: 'info',
  },
  {
    id: 'program-inquiry-sla',
    label: '프로그램 문의 응답 기한 임박',
    description: '약속한 응답 기한(2일)을 넘길 프로그램 문의를 알립니다.',
    leafPath: '/programs/inquiries',
    severity: 'warning',
  },
  {
    id: 'order-new',
    label: '주문 접수',
    description: '새 주문이 들어오면 알립니다.',
    leafPath: '/orders',
    severity: 'info',
  },
  {
    id: 'order-claim',
    label: '취소·교환·반품 요청',
    description: '클레임이 접수되면 알립니다.',
    leafPath: '/orders/claims',
    severity: 'warning',
  },
  {
    id: 'member-signup',
    label: '신규 회원가입',
    description: '새 회원이 가입하면 알립니다.',
    leafPath: '/users/members',
    severity: 'info',
  },
  {
    id: 'support-ticket-new',
    label: '1:1 문의 접수',
    description: '새 1:1 문의가 들어오면 알립니다.',
    leafPath: '/support/tickets',
    severity: 'info',
  },
] as const satisfies readonly NotificationKindDef[];

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]['id'];

const BY_ID: ReadonlyMap<string, NotificationKindDef> = new Map(
  NOTIFICATION_KINDS.map((kind) => [kind.id, kind]),
);

export function isNotificationKind(value: unknown): value is NotificationKind {
  return typeof value === 'string' && BY_ID.has(value);
}

/** 종류 정의 — 카탈로그에 없으면 undefined(지어내지 않는다) */
export function notificationKindOf(kind: NotificationKind): NotificationKindDef | undefined {
  return BY_ID.get(kind);
}

/**
 * 이 알림이 요구하는 권한 리소스 — 없으면 null.
 *
 * 알림을 만들 때가 아니라 **보여 줄 때** 이 값으로 거른다(./useNotifications.ts).
 */
export function notificationResourceOf(kind: NotificationKind): ResourceId | null {
  const def = BY_ID.get(kind);
  return def === undefined ? null : navPageResourceId(def.leafPath);
}

/**
 * 클릭했을 때 갈 곳 — 잎 경로 + 항목 id.
 *
 * targetId 가 비어 있으면 목록으로 간다. '없는 상세' 로 보내지 않는다: 404 를 만나는 것보다
 * 목록에서 스스로 찾는 편이 언제나 낫다.
 */
export function notificationPathOf(kind: NotificationKind, targetId: string): string | null {
  const def = BY_ID.get(kind);
  if (def === undefined) return null;
  const id = targetId.trim();
  return id === '' ? def.leafPath : `${def.leafPath}/${id}`;
}
