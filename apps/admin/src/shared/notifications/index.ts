// 알림 층 배럴
//
// **바깥에서는 반드시 여기서만 import 한다** (shared/ui · shared/crud 와 같은 규약).
//   허용: import { NotificationBell } from '../notifications';
//   금지: import { NotificationBell } from '../notifications/NotificationBell';
//
// [무엇이 여기 있나] 알림 종류의 카탈로그, 픽스처 저장소와 읽음 상태, 수신 설정 문서,
// 목록 훅, 그리고 헤더에 붙는 벨 하나. 알림에 관한 사실은 전부 이 폴더 안에서 끝난다 —
// 화면(/settings/notifications)은 이 층의 수신 설정을 편집하는 한 표면일 뿐이다.
//
// [백엔드 경계] 실시간 수신은 `TODO(backend): SSE /api/events` 다. 폴링으로 흉내 내지 않는다.

export { NotificationBell } from './NotificationBell';

export { useNotifications } from './useNotifications';
export type { NotificationRow, NotificationsApi } from './useNotifications';

export {
  NOTIFICATION_KINDS,
  isNotificationKind,
  notificationKindOf,
  notificationPathOf,
  notificationResourceOf,
} from './catalog';
export type { NotificationKind, NotificationSeverity } from './catalog';

export {
  createPrefs,
  normalizePrefs,
  notificationPrefsKey,
  notificationPrefsStore,
} from './preferences';
export type { NotificationPrefs, NotificationPrefsDoc } from './preferences';

export { fetchNotifications, notificationsKey, useNotificationReadState } from './store';
export type { AppNotification } from './store';
