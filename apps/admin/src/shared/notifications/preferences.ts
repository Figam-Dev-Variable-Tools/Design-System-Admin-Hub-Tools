// 알림 수신 설정 — 종류마다 받을지 말지
//
// [왜 shared 에 있나] 설정을 읽는 쪽(헤더의 벨)과 쓰는 쪽(/settings/notifications)이 서로 다른
// 층에 있다. 문서를 설정 화면이 소유하면 shared/notifications → pages/settings 역의존이 되고
// (레이어 규칙 위반), 조회기 이음매를 하나 더 놓자니 이 문서는 애초에 알림 층의 것이다 —
// '어떤 알림을 받을지' 는 알림의 성질이지 설정 화면의 성질이 아니다. 설정 화면은 이 문서를
// 편집하는 **한 표면**일 뿐이다.
//
// [끈 알림은 만들어지지도 않는다] 목록에서 감추는 것이 아니라 애초에 목록에 넣지 않는다 —
// 감추기만 하면 안읽음 수는 계속 오르고, 벨에 빨간 점이 떠 있는데 열면 아무것도 없는 상태가 된다.
import { createDocumentStore } from '../crud';
import { NOTIFICATION_KINDS } from './catalog';
import type { NotificationKind } from './catalog';

export const notificationPrefsKey = ['notifications', 'preferences'] as const;

/** 종류별 수신 여부 — 카탈로그의 모든 종류가 키를 갖는다(빠진 키가 생기지 않게 타입이 강제한다) */
export type NotificationPrefs = Readonly<Record<NotificationKind, boolean>>;

export interface NotificationPrefsDoc {
  readonly kinds: NotificationPrefs;
}

/** 전부 같은 값으로 채운 한 벌 */
export function createPrefs(enabled: boolean): NotificationPrefs {
  return Object.fromEntries(
    NOTIFICATION_KINDS.map((kind) => [kind.id, enabled]),
  ) as NotificationPrefs;
}

/**
 * 저장값 방어 — 알 수 없는 키는 버리고, 빠진 키는 **켜짐**으로 채운다.
 *
 * 왜 켜짐인가: 새 알림 종류가 카탈로그에 추가됐을 때 옛 저장값에는 그 키가 없다. 꺼짐으로
 * 채우면 새 알림이 **아무에게도 도착하지 않고**, 그 사실은 아무도 모른다(알림이 안 오는 것을
 * 알아채는 방법이 없다). 반대로 켜짐이면 최악의 경우 소음이 늘고, 소음은 운영자가 끌 수 있다.
 */
export function normalizePrefs(raw: unknown): NotificationPrefs {
  const allOn = createPrefs(true);
  if (typeof raw !== 'object' || raw === null) return allOn;

  const source = raw as Record<string, unknown>;
  return Object.fromEntries(
    NOTIFICATION_KINDS.map((kind) => {
      const value = source[kind.id];
      return [kind.id, typeof value === 'boolean' ? value : true];
    }),
  ) as NotificationPrefs;
}

// TODO(backend): GET/PUT /api/notifications/preferences — 사람에 매인 설정이라 서버가 갖는다.
export const notificationPrefsStore = createDocumentStore<NotificationPrefsDoc>(
  'notification-prefs',
  { kinds: createPrefs(true) },
);
