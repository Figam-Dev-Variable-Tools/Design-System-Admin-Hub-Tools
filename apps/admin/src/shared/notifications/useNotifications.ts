// 알림 목록 훅 — 권한·수신 설정을 통과한 것만, 안읽음 수는 파생값
//
// ┌ 알림이 권한 우회로가 되면 안 된다 ─────────────────────────────────────────┐
// │ '새 주문이 접수되었습니다 · ORD-… · 3건 · 결제 대기' — 이 한 줄은 주문 목록을   │
// │ 볼 수 없는 역할에게 **주문이 존재한다는 사실과 그 요약**을 흘린다. 화면은 막고   │
// │ 알림은 열어 두면 권한 모델에 구멍이 하나 뚫린 것이다.                          │
// │                                                                          │
// │ 그래서 종류마다 권한 리소스를 달아 두고(./catalog.ts), `can(resourceId,'read')` │
// │ 를 통과한 것만 목록에 넣는다. 리소스를 풀지 못하는 종류도 **버린다** —          │
// │ 모르는 것을 보여 주는 쪽이 아니라 감추는 쪽으로 떨어진다(fail-closed).          │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [안읽음 수를 저장하지 않는다] 저장하면 목록과 갈라지는 날이 온다 — 배지는 3인데 열면 5개가
// 안읽음인 상태. 수는 언제나 목록에서 센다.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { usePermissions } from '../permissions/PermissionProvider';
import { notificationPathOf, notificationResourceOf } from './catalog';
import { normalizePrefs, notificationPrefsKey, notificationPrefsStore } from './preferences';
import type { NotificationPrefs } from './preferences';
import { fetchNotifications, notificationsKey, useNotificationReadState } from './store';
import type { AppNotification } from './store';

/** 화면이 그대로 그리는 한 줄 — 경로와 읽음 여부가 이미 풀려 있다 */
export interface NotificationRow extends AppNotification {
  /** 클릭했을 때 갈 곳 — 잎 경로에서 파생된다(./catalog.ts) */
  readonly path: string;
  readonly read: boolean;
}

export interface NotificationsApi {
  readonly rows: readonly NotificationRow[];
  /** 안읽음 수 — **파생값이다** */
  readonly unreadCount: number;
  readonly firstLoading: boolean;
  readonly error: Error | null;
  readonly markRead: (id: string) => void;
  readonly markAllRead: () => void;
}

export function useNotifications(): NotificationsApi {
  const { can } = usePermissions();
  const readIds = useNotificationReadState((state) => state.readIds);
  const markRead = useNotificationReadState((state) => state.markRead);
  const markAllReadIds = useNotificationReadState((state) => state.markAllRead);

  const list = useQuery({
    queryKey: notificationsKey,
    queryFn: ({ signal }) => fetchNotifications(signal),
  });

  const prefsQuery = useQuery({
    queryKey: notificationPrefsKey,
    queryFn: ({ signal }) => notificationPrefsStore.fetch(signal),
  });

  /**
   * 수신 설정 — 아직 못 읽었으면 **전부 켜짐**으로 본다.
   *
   * 조회가 늦다고 알림을 감추면, 느린 네트워크에서 새 주문 알림이 통째로 사라진다.
   * 설정이 도착하면 그때 꺼진 종류가 빠진다(늘어났다 줄어드는 쪽이, 없다가 생기는 쪽보다 안전하다).
   */
  const prefs: NotificationPrefs = useMemo(
    () => normalizePrefs(prefsQuery.data?.kinds),
    [prefsQuery.data],
  );

  const rows = useMemo(() => {
    const items = list.data ?? [];

    return items.flatMap<NotificationRow>((notification) => {
      if (!prefs[notification.kind]) return [];

      const resourceId = notificationResourceOf(notification.kind);
      // 리소스를 풀지 못하면 버린다 — 모르는 것은 보여 주지 않는다(fail-closed)
      if (resourceId === null || !can(resourceId, 'read')) return [];

      const path = notificationPathOf(notification.kind, notification.targetId);
      if (path === null) return [];

      return [{ ...notification, path, read: readIds.has(notification.id) }];
    });
  }, [list.data, prefs, can, readIds]);

  return {
    rows,
    unreadCount: rows.filter((row) => !row.read).length,
    firstLoading: list.isFetching && list.data === undefined,
    error: list.error,
    markRead,
    markAllRead: () => {
      // 보이는 것만 읽음 처리한다 — 권한이 없어 목록에 없던 알림까지 읽음으로 만들지 않는다
      markAllReadIds(rows.map((row) => row.id));
    },
  };
}
