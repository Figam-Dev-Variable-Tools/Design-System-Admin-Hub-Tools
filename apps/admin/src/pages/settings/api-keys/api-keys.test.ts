// API Key 회귀 테스트 (시스템 설정 섹션)
//
// 이 테스트가 지키는 것: **평문은 발급 응답에만 있고, 목록에는 어디에도 없다.**
// 이것이 깨지면 '1회 노출 · 평문 재노출 금지' 가 무너진다.
import { describe, expect, it } from 'vitest';

import { createApiKey, fetchApiKeys, revokeApiKey } from './data-source';
import { isActive } from './types';
import { apiKeyDraftSchema, duplicateNameError } from './validation';

const signal = new AbortController().signal;

/** 서로 다른 발급 시도 — 시도마다 새 멱등키다(같은 키는 재생을 뜻한다) */
function keyOf(): string {
  return crypto.randomUUID();
}

describe('픽스처 — 시크릿이 새지 않는다', () => {
  it('목록의 어떤 키에도 평문 필드가 없다', async () => {
    const keys = await fetchApiKeys(signal);

    for (const key of keys) {
      // 모델에 평문 자리가 아예 없다 — 실수로 되살아나면 여기서 잡힌다
      expect(Object.keys(key)).not.toContain('plaintext');
      expect(Object.keys(key)).not.toContain('secret');
      expect(Object.keys(key)).not.toContain('value');
    }
  });

  it('픽스처의 키는 명백한 더미다 — 운영 접두어(sk_live_)를 쓰지 않는다', async () => {
    const keys = await fetchApiKeys(signal);

    for (const key of keys) {
      expect(key.preview.prefix).toBe('sk_test_');
      expect(key.preview.prefix.startsWith('sk_live_')).toBe(false);
    }
  });

  it('한 번도 쓰이지 않은 키는 lastUsedAt 이 null 이다 — 화면이 그것을 드러낸다', async () => {
    const keys = await fetchApiKeys(signal);
    expect(keys.some((key) => key.lastUsedAt === null)).toBe(true);
  });
});

describe('createApiKey — 발급', () => {
  it('평문을 응답에만 싣고, 목록에 들어가는 키는 미리보기 조각만 갖는다', async () => {
    const issued = await createApiKey({ name: '테스트 발급', scopes: ['read'] }, keyOf(), signal);

    expect(issued.plaintext).toContain('DUMMY');
    // 목록에 들어간 항목에는 평문이 없다
    expect(Object.keys(issued.key)).not.toContain('plaintext');
    // 미리보기의 last4 는 평문의 마지막 4자와 일치한다(운영자가 알아보는 유일한 단서)
    expect(issued.key.preview.last4).toBe(issued.plaintext.slice(-4));
  });

  it('발급된 키는 조회 목록에 평문 없이 나타난다', async () => {
    const issued = await createApiKey(
      { name: `목록 확인 ${String(Date.now())}`, scopes: ['read'] },
      keyOf(),
      signal,
    );
    const keys = await fetchApiKeys(signal);

    const found = keys.find((key) => key.id === issued.key.id);
    expect(found).toBeDefined();
    // 목록 응답 전체를 문자열로 훑어도 평문이 없다 — 이것이 '재노출 불가' 의 증거다
    expect(JSON.stringify(keys)).not.toContain(issued.plaintext);
  });

  it('발급 직후 상태는 활성이고 아직 쓰인 적이 없다', async () => {
    const issued = await createApiKey(
      { name: `상태 확인 ${String(Date.now())}`, scopes: ['write'] },
      keyOf(),
      signal,
    );

    expect(isActive(issued.key)).toBe(true);
    expect(issued.key.lastUsedAt).toBeNull();
    expect(issued.key.revokedAt).toBeNull();
  });
});

/* ── 멱등 발급 (EXC-08) ───────────────────────────────────────────────────────
 *
 * 응답이 유실되면 화면은 실패로 보고, 모달은 열린 채 남고, 운영자는 '발급'을 다시 누른다
 * (ApiKeysPage 의 'FEEDBACK-01 — 재클릭이 곧 재시도다'). 그 재클릭이 두 번째 키를 만들면,
 * 첫 키의 평문은 이미 사라졌으므로 **아무도 쓸 수 없고 누구 것인지도 모르는 활성 키**가
 * 목록에 남는다. 동기 잠금(createLock)은 동시 클릭만 막을 뿐 이 순서를 막지 못한다. */

describe('createApiKey — 같은 시도의 재요청은 키를 두 번 만들지 않는다', () => {
  it('같은 멱등키의 재요청은 최초 응답을 그대로 재생한다', async () => {
    const key = keyOf();
    const draft = { name: `멱등 발급 ${String(Date.now())}`, scopes: ['read'] } as const;

    const first = await createApiKey(draft, key, signal);
    const second = await createApiKey(draft, key, signal);

    // 같은 키 · 같은 평문 — 운영자가 손에 쥔 평문이 실제로 저장된 키의 것이어야 한다
    expect(second.key.id).toBe(first.key.id);
    expect(second.plaintext).toBe(first.plaintext);
  });

  it('재요청이 목록에 유령 키를 남기지 않는다', async () => {
    const key = keyOf();
    const draft = { name: `유령 방지 ${String(Date.now())}`, scopes: ['read'] } as const;

    await createApiKey(draft, key, signal);
    await createApiKey(draft, key, signal);

    const keys = await fetchApiKeys(signal);
    expect(keys.filter((item) => item.name === draft.name)).toHaveLength(1);
  });

  it('다른 시도(다른 멱등키)는 정상적으로 새 키를 만든다 — 전부 막으면 그건 고침이 아니다', async () => {
    const draft = { name: `별개 발급 ${String(Date.now())}`, scopes: ['read'] } as const;

    const first = await createApiKey(draft, keyOf(), signal);
    const second = await createApiKey(draft, keyOf(), signal);

    expect(second.key.id).not.toBe(first.key.id);
    expect(second.plaintext).not.toBe(first.plaintext);
  });
});

describe('revokeApiKey — 폐기', () => {
  it('지우지 않고 revoked 로 남긴다 — 감사 기록이 사라지지 않는다', async () => {
    const issued = await createApiKey(
      { name: `폐기 대상 ${String(Date.now())}`, scopes: ['read'] },
      keyOf(),
      signal,
    );

    await revokeApiKey(issued.key.id, signal);
    const keys = await fetchApiKeys(signal);
    const found = keys.find((key) => key.id === issued.key.id);

    expect(found).toBeDefined();
    expect(found?.status).toBe('revoked');
    expect(found?.revokedAt).not.toBeNull();
  });
});

describe('apiKeyDraftSchema — 발급 폼 검증', () => {
  it('이름이 비면 막는다', () => {
    expect(apiKeyDraftSchema.safeParse({ name: '  ', scopes: ['read'] }).success).toBe(false);
  });

  it('스코프가 하나도 없으면 막는다 — 아무것도 못 하는 키를 만들지 않는다', () => {
    expect(apiKeyDraftSchema.safeParse({ name: '이름', scopes: [] }).success).toBe(false);
  });

  it('이름과 스코프가 있으면 통과한다', () => {
    expect(apiKeyDraftSchema.safeParse({ name: '이름', scopes: ['read', 'write'] }).success).toBe(
      true,
    );
  });
});

describe('duplicateNameError — 이름 중복', () => {
  it('대소문자·공백을 무시하고 중복을 잡는다', () => {
    expect(duplicateNameError(' 정산 배치 ', ['정산 배치'])).not.toBeNull();
  });

  it('겹치지 않으면 통과한다', () => {
    expect(duplicateNameError('새 키', ['정산 배치'])).toBeNull();
  });
});
