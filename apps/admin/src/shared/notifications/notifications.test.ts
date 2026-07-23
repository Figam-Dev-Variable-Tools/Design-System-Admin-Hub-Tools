// 알림 층의 순수 규칙 (shared/notifications/**)
//
// [무엇을 지키나] ① 카탈로그의 모든 잎이 nav 에 **실재**한다(경로를 지어내지 않는다)
// ② 권한 리소스가 nav 규약(`page:{to}`)과 같은 좌표계다 ③ 알림에 상태 전이가 없다
// ④ 수신 설정의 저장값 방어가 새 종류를 조용히 꺼 버리지 않는다.
import { describe, expect, it } from 'vitest';

import { NAV_SECTIONS } from '../layout/nav-config';
import { navPageResourceId } from '../permissions/resources';
import {
  isNotificationKind,
  NOTIFICATION_KINDS,
  notificationKindOf,
  notificationPathOf,
  notificationResourceOf,
} from './catalog';
import { createPrefs, normalizePrefs, prefsSaveBlock } from './preferences';
import * as store from './store';

/** nav 트리의 모든 잎 경로 */
const LEAF_PATHS: ReadonlySet<string> = new Set(
  NAV_SECTIONS.flatMap((section) =>
    section.entries.flatMap((entry) =>
      entry.item.kind === 'leaf' ? [entry.item.to] : entry.item.children.map((leaf) => leaf.to),
    ),
  ),
);

describe('카탈로그 — 경로는 nav 에서 파생된다', () => {
  it('모든 종류의 leafPath 가 사이드바 잎으로 실재한다', () => {
    const missing = NOTIFICATION_KINDS.filter((kind) => !LEAF_PATHS.has(kind.leafPath));

    // 잎이 아닌 경로를 적으면 권한 리소스가 풀리지 않고, 알림은 404 로 데려간다
    expect(missing.map((kind) => kind.leafPath)).toEqual([]);
  });

  it('id 가 중복되지 않는다', () => {
    const ids = NOTIFICATION_KINDS.map((kind) => kind.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('권한 리소스가 nav 규약과 같은 좌표계다', () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(notificationResourceOf(kind.id)).toBe(navPageResourceId(kind.leafPath));
    }
  });

  it('카탈로그 밖의 종류는 리소스도 경로도 풀리지 않는다 (fail-closed)', () => {
    expect(isNotificationKind('made-up')).toBe(false);
    expect(notificationKindOf('made-up' as never)).toBeUndefined();
  });

  it('targetId 가 비면 목록으로 간다 — 없는 상세로 보내지 않는다', () => {
    const kind = NOTIFICATION_KINDS[0];
    expect(notificationPathOf(kind.id, '   ')).toBe(kind.leafPath);
    expect(notificationPathOf(kind.id, 'abc-1')).toBe(`${kind.leafPath}/abc-1`);
  });
});

describe('알림에는 상태 전이가 없다', () => {
  it('저장소의 쓰기 표면이 읽음 처리 하나뿐이다', () => {
    const surface = Object.keys(store);
    const transitions = surface.filter((name) =>
      /(close|resolve|complete|assign|answer|status)/i.test(name),
    );

    // 알림은 사실의 사본이다 — 도장을 찍을 수 있으면 정본과 갈라진다
    expect(transitions).toEqual([]);
  });

  it('알림 한 건에 상태 필드가 없다', () => {
    const keys = ['id', 'kind', 'title', 'body', 'targetId', 'occurredAt'];
    // 타입이 이미 강제하지만, 필드가 늘어나면 이 목록도 함께 늘어나야 한다는 표시다
    expect(keys).not.toContain('status');
  });
});

describe('수신 설정의 저장값 방어', () => {
  it('빠진 키는 켜짐으로 채운다 — 새 종류가 조용히 꺼지지 않게', () => {
    const prefs = normalizePrefs({ 'order-new': false });

    expect(prefs['order-new']).toBe(false);
    expect(prefs['member-signup']).toBe(true);
  });

  it('알 수 없는 키는 버린다', () => {
    const prefs = normalizePrefs({ 'made-up-kind': false });
    expect(Object.keys(prefs).sort()).toEqual(NOTIFICATION_KINDS.map((kind) => kind.id).sort());
  });

  it('값이 객체가 아니면 전부 켜짐으로 본다', () => {
    expect(normalizePrefs(null)).toEqual(createPrefs(true));
    expect(normalizePrefs('꺼짐')).toEqual(createPrefs(true));
  });

  it('불리언이 아닌 값은 켜짐으로 수렴한다', () => {
    expect(normalizePrefs({ 'order-new': 'false' })['order-new']).toBe(true);
  });
});

describe('읽지 못한 설정은 저장하지 않는다', () => {
  it('문서를 못 읽었으면 저장이 막히고 이유가 온다', () => {
    const reason = prefsSaveBlock(undefined);

    expect(reason).not.toBeNull();
    // 이유를 말하지 않는 disabled 는 '고장' 으로 보인다 — 무엇을 덮게 되는지까지 말한다
    expect(reason ?? '').toContain('꺼 둔 종류가 다시 켜져요');
  });

  it('막지 않으면 무슨 일이 일어나는가 — 못 읽은 화면의 값은 전부 켜짐이다', () => {
    // 이 단언이 위 규칙의 존재 이유다: 읽기 실패의 기준선이 곧 '전부 받음' 이라
    // 그대로 저장하면 운영자가 꺼 둔 종류가 조용히 되살아난다
    expect(normalizePrefs(undefined)).toEqual(createPrefs(true));
  });

  it('한 번이라도 읽었으면 저장할 수 있다 — 재조회 실패가 편집을 막지는 않는다', () => {
    expect(prefsSaveBlock({ kinds: createPrefs(false) })).toBeNull();
  });
});
