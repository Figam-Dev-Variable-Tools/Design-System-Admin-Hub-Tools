// API Key 도메인 모델 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// ┌ 이 모델에 **없는** 것이 이 모델의 핵심이다 ────────────────────────────────┐
// │ `ApiKey` 에는 평문 키 필드가 **없다.** 있어야 할 자리에 prefix + last4 만 있다.  │
// │                                                                          │
// │ 평문을 필드로 두면 언젠가 화면에 그려진다 — 목록에, 상세에, devtools 에,        │
// │ 스크린샷에. '지금은 안 그리면 되지' 는 방어가 아니다. 그릴 수 있는 값을 갖지     │
// │ 않는 것이 방어다. 그래서 `sk_test_••••0001` 은 **가린 표시가 아니라 우리가 아는  │
// │ 전부**이고, '평문 재노출' 은 구현 실수로도 불가능하다.                         │
// │                                                                          │
// │ 평문은 발급 응답에만 1회 실린다(ApiKeyIssued) — 그 타입은 목록에 들어가지 않고   │
// │ 노출 모달의 지역 state 로만 살다가 모달과 함께 사라진다.                        │
// └──────────────────────────────────────────────────────────────────────────┘
import type { SecretPreview } from '../_shared/secret';

/** 키가 할 수 있는 일 — 최소 권한으로 발급하도록 조회/쓰기를 나눈다 */
export const API_KEY_SCOPES = ['read', 'write'] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

interface ScopeMeta {
  readonly key: ApiKeyScope;
  readonly label: string;
  readonly description: string;
}

export const API_KEY_SCOPE_META: readonly ScopeMeta[] = [
  { key: 'read', label: '조회', description: '목록·상세 조회 (GET)' },
  { key: 'write', label: '쓰기', description: '생성·수정·삭제 (POST/PUT/DELETE)' },
];

export function scopeLabel(scope: ApiKeyScope): string {
  return API_KEY_SCOPE_META.find((meta) => meta.key === scope)?.label ?? scope;
}

/** 폐기는 되돌릴 수 없다 — 상태가 두 개뿐인 이유다(일시정지가 없다) */
type ApiKeyStatus = 'active' | 'revoked';

export interface ApiKey {
  readonly id: string;
  /** 운영자가 어디에 쓰는 키인지 알아보는 이름 — 키 자체를 보여줄 수 없으니 이것이 유일한 식별자다 */
  readonly name: string;
  /** 보여줄 수 있는 조각(prefix + last4). **평문은 여기 없다** */
  readonly preview: SecretPreview;
  readonly scopes: readonly ApiKeyScope[];
  readonly status: ApiKeyStatus;
  readonly createdAt: string;
  readonly createdBy: string;
  /** 한 번도 안 쓰였으면 null — '발급했는데 안 쓰는 키' 를 찾아 지우는 단서다 */
  readonly lastUsedAt: string | null;
  readonly revokedAt: string | null;
}

/**
 * 발급 응답 — **평문이 존재하는 유일한 순간.**
 *
 * 서버는 이 응답 이후 평문을 갖지 않는다(해시만 저장). 화면도 모달이 닫히면 버린다.
 * 그래서 이 타입은 목록/캐시/전역 상태 어디에도 들어가지 않는다 — 모달의 지역 state 전용이다.
 */
export interface ApiKeyIssued {
  readonly key: ApiKey;
  /** 다시는 볼 수 없는 값 */
  readonly plaintext: string;
}

/** 발급 폼의 입력 */
export interface ApiKeyDraft {
  readonly name: string;
  readonly scopes: readonly ApiKeyScope[];
}

export const API_KEY_NAME_MAX = 40;

/** 활성 키만 실제로 요청을 통과시킨다 — 목록의 정렬·필터가 이 판정을 공유한다 */
export function isActive(key: ApiKey): boolean {
  return key.status === 'active';
}
