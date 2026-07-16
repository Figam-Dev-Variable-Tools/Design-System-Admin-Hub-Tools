// 낙관적 동시성 제어가 붙은 단일 문서 저장소 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [왜 shared/crud 의 createDocumentStore 를 그대로 쓰지 않는가]
// 그 저장소는 **마지막 저장이 이긴다**(last-write-wins). 회사 정보·적립금 정책에는 충분하지만
// 시스템 설정에는 부족하다: 유지보수 모드·API 스코프·OAuth 자격증명은 두 관리자가 동시에 편집하면
// 한쪽의 변경이 **조용히 사라진다**. 그래서 이 섹션의 저장소는 문서와 함께 **revision(동시성 토큰)** 을
// 들고 다니고, 저장 시 토큰이 어긋나면 덮어쓰지 않고 409 로 거절한다 (EXC-04).
// 백엔드가 붙으면 revision 은 ETag / If-Match 헤더가 되고, 이 파일의 본문만 교체된다.
//
// [감사 추적] 설정 화면은 '누가 언제 바꿨는가' 를 보여야 한다 — 문서마다 audit 를 함께 싣는다.
//
// [백엔드 0] 실제 HTTP 호출은 한 줄도 없다. 여기 있는 것은 지연·취소·실패/충돌 재현뿐이다.
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';

/** 감사 추적 — 마지막으로 이 설정을 바꾼 사람과 시각 */
export interface AuditInfo {
  readonly updatedBy: string;
  /** ISO 8601 */
  readonly updatedAt: string;
}

/** 문서 + 동시성 토큰 + 감사 추적 — 조회가 돌려주는 한 덩어리 */
export interface Revisioned<T> {
  readonly value: T;
  /** 낙관적 동시성 토큰. 저장 때 그대로 되돌려 보낸다 (백엔드에서는 ETag) */
  readonly revision: string;
  readonly audit: AuditInfo;
}

/**
 * 409 — 내가 읽은 뒤 다른 관리자가 먼저 저장했다.
 *
 * **입력을 버리지 않는다.** 최신 문서를 실어 보내 화면이 '다시 불러오기 / 덮어쓰기' 를 묻고
 * 어느 항목이 달라졌는지 짚을 수 있게 한다 (EXC-04).
 */
export class SettingsConflictError extends Error {
  readonly latest: Revisioned<unknown>;

  constructor(latest: Revisioned<unknown>) {
    super('다른 관리자가 이미 이 설정을 변경했습니다.');
    this.name = 'SettingsConflictError';
    this.latest = latest;
  }
}

/** 타입 가드 — 화면은 이것으로 충돌과 일반 실패를 가른다 */
export function isSettingsConflict(cause: unknown): cause is SettingsConflictError {
  return cause instanceof SettingsConflictError;
}

/**
 * 충돌 재현 스위치(개발용) — dev.ts 의 `?fail=` 규약과 같은 자리에 산다.
 *
 *   /settings/site?fail=conflict        → 저장이 409 로 거절된다
 *   /settings/site?fail=site:conflict   → 이 화면에서만
 *
 * 백엔드가 붙으면 이 함수는 사라진다 — 진짜 동시 편집이 그 자리를 대신한다.
 */
function conflictRequested(scope: string): boolean {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return false;
  const requested = flags.split(',').map((flag) => flag.trim());
  return requested.includes('conflict') || requested.includes(`${scope}:conflict`);
}

export interface RevisionedStore<T> {
  readonly fetch: (signal: AbortSignal) => Promise<Revisioned<T>>;
  /**
   * 저장 — expectedRevision 이 현재 revision 과 다르면 SettingsConflictError.
   * force=true 면 토큰을 무시하고 덮어쓴다 (사용자가 충돌 다이얼로그에서 '덮어쓰기' 를 고른 경우).
   */
  readonly save: (input: SaveInput<T>, signal?: AbortSignal) => Promise<Revisioned<T>>;
}

interface SaveInput<T> {
  readonly value: T;
  readonly expectedRevision: string;
  readonly force?: boolean;
}

/** 지금 이 앱에는 세션 사용자 개념이 없다 — 저장이 남기는 감사 주체는 고정 더미다 */
// TODO(backend): 저장 주체는 서버가 세션에서 읽어 기록한다 — 프론트가 보내는 값을 신뢰하면 안 된다.
const CURRENT_ADMIN = '김운영';

let revisionSeq = 0;

function nextRevision(): string {
  revisionSeq += 1;
  return `rev-${String(revisionSeq)}`;
}

/**
 * 픽스처 1건을 들고 fetch/save 를 흉내 내는 저장소(mutable — save 가 갱신한다).
 *
 * @param scope `?fail=` 스위치의 스코프 이름
 * @param seed  초기 문서
 * @param audit 초기 감사 정보(픽스처가 '이미 누군가 저장해 둔 값' 이라는 뜻)
 */
export function createRevisionedStore<T>(
  scope: string,
  seed: T,
  audit: AuditInfo,
): RevisionedStore<T> {
  let current: Revisioned<T> = { value: seed, revision: nextRevision(), audit };

  return {
    async fetch(signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'load');
      return current;
    },

    async save(input, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'save');

      // 다른 관리자가 먼저 저장한 상황을 재현한다 — 토큰을 어긋나게 만든다
      if (conflictRequested(scope)) {
        current = { ...current, revision: nextRevision() };
      }

      // 낙관적 동시성 — 내가 읽은 문서가 아직 최신인가
      if (input.force !== true && input.expectedRevision !== current.revision) {
        throw new SettingsConflictError(current);
      }

      current = {
        value: input.value,
        revision: nextRevision(),
        audit: { updatedBy: CURRENT_ADMIN, updatedAt: new Date().toISOString() },
      };
      return current;
    },
  };
}
