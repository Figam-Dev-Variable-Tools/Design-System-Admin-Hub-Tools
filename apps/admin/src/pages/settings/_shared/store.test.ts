// 낙관적 동시성 회귀 테스트 (시스템 설정 섹션 · EXC-04)
//
// 이 테스트가 지키는 것: **다른 관리자의 저장을 조용히 덮어쓰지 않는다.**
// 이것이 깨지면 마지막 저장이 이기고, 그 사실을 아무도 모른 채 설정이 사라진다.
import { describe, expect, it } from 'vitest';

import { createRevisionedStore, isSettingsConflict, SettingsConflictError } from './store';

interface Doc {
  readonly name: string;
}

const AUDIT = { updatedBy: '박관리', updatedAt: '2026-07-01T00:00:00.000Z' };

const signal = new AbortController().signal;

function storeOf() {
  return createRevisionedStore<Doc>('test-scope', { name: '처음' }, AUDIT);
}

describe('createRevisionedStore — 조회', () => {
  it('문서와 함께 revision·audit 를 싣는다', async () => {
    const store = storeOf();
    const loaded = await store.fetch(signal);

    expect(loaded.value).toEqual({ name: '처음' });
    expect(loaded.revision).not.toBe('');
    expect(loaded.audit).toEqual(AUDIT);
  });
});

describe('createRevisionedStore — 저장', () => {
  it('내가 읽은 revision 이 최신이면 저장된다', async () => {
    const store = storeOf();
    const loaded = await store.fetch(signal);

    const saved = await store.save({ value: { name: '바꿈' }, expectedRevision: loaded.revision });

    expect(saved.value).toEqual({ name: '바꿈' });
    // 저장은 새 토큰을 발급한다 — 낡은 토큰으로 두 번 저장할 수 없다
    expect(saved.revision).not.toBe(loaded.revision);
  });

  it('저장하면 감사 정보가 저장 주체·시각으로 갱신된다', async () => {
    const store = storeOf();
    const loaded = await store.fetch(signal);

    const saved = await store.save({ value: { name: '바꿈' }, expectedRevision: loaded.revision });

    expect(saved.audit.updatedBy).not.toBe(AUDIT.updatedBy);
    expect(saved.audit.updatedAt).not.toBe(AUDIT.updatedAt);
  });

  it('낡은 revision 으로 저장하면 덮어쓰지 않고 409 를 던진다', async () => {
    const store = storeOf();
    const mine = await store.fetch(signal);

    // 다른 관리자가 먼저 저장했다
    await store.save({ value: { name: '남이 먼저' }, expectedRevision: mine.revision });

    // 내가 들고 있던(이제 낡은) 토큰으로 저장 시도
    await expect(
      store.save({ value: { name: '내 변경' }, expectedRevision: mine.revision }),
    ).rejects.toBeInstanceOf(SettingsConflictError);

    // 거절됐으므로 상대의 값이 그대로 살아 있다 — 내 값이 덮어쓰지 않았다
    const after = await store.fetch(signal);
    expect(after.value).toEqual({ name: '남이 먼저' });
  });

  it('409 는 최신 문서를 실어 보낸다 — 화면이 무엇이 달라졌는지 짚을 수 있다', async () => {
    const store = storeOf();
    const mine = await store.fetch(signal);
    await store.save({ value: { name: '남이 먼저' }, expectedRevision: mine.revision });

    try {
      await store.save({ value: { name: '내 변경' }, expectedRevision: mine.revision });
      expect.unreachable('충돌이 나야 한다');
    } catch (cause: unknown) {
      expect(isSettingsConflict(cause)).toBe(true);
      if (!isSettingsConflict(cause)) return;
      expect(cause.latest.value).toEqual({ name: '남이 먼저' });
      expect(cause.latest.audit.updatedBy).not.toBe('');
    }
  });

  it('force 면 낡은 토큰이어도 덮어쓴다 — 사용자가 충돌 다이얼로그에서 고른 경우', async () => {
    const store = storeOf();
    const mine = await store.fetch(signal);
    await store.save({ value: { name: '남이 먼저' }, expectedRevision: mine.revision });

    const forced = await store.save({
      value: { name: '내 변경' },
      expectedRevision: mine.revision,
      force: true,
    });

    expect(forced.value).toEqual({ name: '내 변경' });
  });
});

describe('isSettingsConflict — 타입 가드', () => {
  it('일반 오류를 충돌로 오인하지 않는다', () => {
    expect(isSettingsConflict(new Error('그냥 실패'))).toBe(false);
    expect(isSettingsConflict(null)).toBe(false);
  });
});
