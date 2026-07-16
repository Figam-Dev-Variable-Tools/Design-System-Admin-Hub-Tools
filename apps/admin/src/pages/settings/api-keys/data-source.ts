// API Key 데이터 소스 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [백엔드 0] **실제 키 발급은 없다.** 여기서 만드는 평문은 `DUMMY` 가 박힌 시연용 문자열이고,
// 어떤 서버도 이 값을 알지 못한다(호출해도 아무 일도 일어나지 않는다).
//
// [픽스처의 시크릿은 명백한 더미다] prefix 는 `sk_test_`(운영 키의 `sk_live_` 가 아니다), last4 는
// 0001/0002 처럼 사람이 지은 티가 나는 값이다 — 어딘가에 붙여넣어졌을 때 진짜 키로 오인되지 않아야 한다.
// 무엇보다 **픽스처에도 평문이 없다** (types.ts 의 설계 근거 참조).
//
// [실패 재현] /settings/api-keys?fail=load · ?fail=create · ?fail=revoke · ?fail=all
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { createDummyPlaintextKey, previewOf } from '../_shared/secret';
import type { ApiKey, ApiKeyDraft, ApiKeyIssued } from './types';

export const apiKeysKey = ['settings', 'api-keys'] as const;

/** 발급되는 모든 키의 접두어 — 더미임이 드러나는 `sk_test_` 로 고정한다 */
const KEY_PREFIX = 'sk_test_';

// TODO(backend): 발급 주체는 서버가 세션에서 읽는다 — 프론트가 보내는 값을 신뢰하면 안 된다.
const CURRENT_ADMIN = '김운영';

/** 이미 발급돼 있다고 가정하는 키들 — 전부 더미다 */
const SEED_KEYS: readonly ApiKey[] = [
  {
    id: 'key-0001',
    name: '홈페이지 상품 연동',
    preview: { prefix: KEY_PREFIX, last4: '0001' },
    scopes: ['read'],
    status: 'active',
    createdAt: '2026-03-02T01:10:00.000Z',
    createdBy: '박관리',
    lastUsedAt: '2026-07-16T00:12:00.000Z',
    revokedAt: null,
  },
  {
    id: 'key-0002',
    name: '정산 배치',
    preview: { prefix: KEY_PREFIX, last4: '0002' },
    scopes: ['read', 'write'],
    status: 'active',
    createdAt: '2026-05-19T07:30:00.000Z',
    createdBy: '김운영',
    // 발급만 하고 한 번도 안 쓴 키 — 목록이 이것을 드러내야 정리할 수 있다
    lastUsedAt: null,
    revokedAt: null,
  },
  {
    id: 'key-0003',
    name: '구 모바일 앱(사용 중지)',
    preview: { prefix: KEY_PREFIX, last4: '0003' },
    scopes: ['read'],
    status: 'revoked',
    createdAt: '2025-11-04T02:00:00.000Z',
    createdBy: '박관리',
    lastUsedAt: '2026-01-08T09:41:00.000Z',
    revokedAt: '2026-01-09T00:00:00.000Z',
  },
];

/** 목록(mutable) — create/revoke 가 갱신한다. 새로고침하면 SEED 로 돌아간다 */
let keys: readonly ApiKey[] = SEED_KEYS;

let issueSeq = 0;

/** 최신 발급이 위로 — 방금 만든 키를 찾으려고 스크롤하지 않게 한다 */
function sorted(items: readonly ApiKey[]): readonly ApiKey[] {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

// TODO(backend): GET /api/settings/api-keys
//   응답에 평문은 **절대 실리지 않는다** — prefix/last4/스코프/상태/마지막 사용 시각만.
export async function fetchApiKeys(signal: AbortSignal): Promise<readonly ApiKey[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('api-keys', 'load');
  return sorted(keys);
}

/**
 * 발급 — 평문을 **이 응답에만** 싣는다.
 *
 * 백엔드가 붙으면: 서버가 키를 만들고 **해시만 저장**한 뒤 평문을 201 응답 1회에 실어 보낸다.
 * 그 뒤로는 서버도 평문을 모른다 — 그래서 '다시 보여주기' 엔드포인트는 존재할 수 없다.
 */
// TODO(backend): POST /api/settings/api-keys
//   요청: { name, scopes[] } · 응답 201: { key: {...}, plaintext } ← plaintext 는 이 응답이 처음이자 마지막
//   422 → 이름 중복/스코프 없음
export async function createApiKey(
  draft: ApiKeyDraft,
  signal?: AbortSignal,
): Promise<ApiKeyIssued> {
  await wait(LATENCY_MS, signal);
  failIfRequested('api-keys', 'create');

  const plaintext = createDummyPlaintextKey(KEY_PREFIX);
  issueSeq += 1;

  const key: ApiKey = {
    id: `key-new-${String(issueSeq)}`,
    name: draft.name.trim(),
    preview: previewOf(plaintext, KEY_PREFIX),
    scopes: draft.scopes,
    status: 'active',
    createdAt: new Date().toISOString(),
    createdBy: CURRENT_ADMIN,
    lastUsedAt: null,
    revokedAt: null,
  };

  // 목록에는 **평문 없이** 들어간다 — 목록이 평문을 아는 경로 자체를 만들지 않는다
  keys = [key, ...keys];

  return { key, plaintext };
}

/**
 * 폐기 — 되돌릴 수 없다. 지우지 않고 revoked 로 남기는 이유는 감사다:
 * '이 키가 언제까지 살아 있었나' 는 사고 조사에서 반드시 필요한 기록이다.
 */
// TODO(backend): DELETE /api/settings/api-keys/:id (soft — status=revoked, revokedAt 기록)
export async function revokeApiKey(id: string, signal?: AbortSignal): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('api-keys', 'revoke');

  keys = keys.map((key) =>
    key.id === id ? { ...key, status: 'revoked', revokedAt: new Date().toISOString() } : key,
  );
}
