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

export const PREFS_SAVE_UNREAD =
  '알림 설정을 불러오지 못했어요. 지금 보이는 값은 실제 설정이 아니라 기본값(전부 받음)이라, 이대로 저장하면 예전에 꺼 둔 종류가 다시 켜져요. 다시 시도해 설정을 불러온 뒤 저장해 주세요.';

/**
 * 저장을 막는 이유 — 막지 않으면 null. 토글의 disabled 와 저장 버튼이 **같은 술어**를 읽는다.
 *
 * [왜 필요한가] 위 `normalizePrefs` 가 빠진 키를 켜짐으로 채우는 것은 의도다(새 종류가 조용히
 * 꺼지지 않게). 그런데 **문서를 아예 못 읽은 상태**에서는 8키가 전부 빠진 것과 같아 화면이
 * '전부 받음' 을 그린다. 그 상태에서 토글 하나를 만지고 저장하면 문서가 「기본값 + 그 하나」로
 * 치환되고, 운영자가 예전에 꺼 둔 종류가 **조용히 켜진다.** 읽기 실패가 쓰기 사고가 되는 경로다.
 *
 * [왜 부분 저장이 아니라 차단인가] 부분 저장을 하려면 '이 키만 바꿔라' 는 계약이 필요한데
 * `createDocumentStore.save` 는 문서를 **통째로 치환**한다(shared/crud/document.ts). 없는 계약을
 * 화면이 흉내 내면, 서버가 붙는 날 그 흉내와 실제 PATCH 의미가 갈린다. 그래서 **모르는 것을
 * '켜짐' 으로 덮어쓰지 않는다** 는 목적만 지키고, 수단은 가장 정직한 것을 고른다 — 읽지 못한
 * 동안에는 저장하지 않고 그 이유를 말한다.
 *
 * @param loaded 서버에서 실제로 읽은 문서 — `undefined` 는 '아직/끝내 못 읽었다' 다
 */
export function prefsSaveBlock(loaded: NotificationPrefsDoc | undefined): string | null {
  return loaded === undefined ? PREFS_SAVE_UNREAD : null;
}

// TODO(backend): GET/PUT /api/notifications/preferences — 사람에 매인 설정이라 서버가 갖는다.
export const notificationPrefsStore = createDocumentStore<NotificationPrefsDoc>(
  'notification-prefs',
  { kinds: createPrefs(true) },
);
