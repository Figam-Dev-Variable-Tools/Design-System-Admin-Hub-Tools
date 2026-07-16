// 시스템 설정 도메인 훅 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// 화면은 useQuery/useMutation 을 직접 부르지 않는다 — 여기 도메인 훅만 부른다
// (shared/crud/document.ts 와 같은 규약. 다른 점은 revision(동시성 토큰)을 함께 나른다는 것뿐이다).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import type { Revisioned, RevisionedStore } from './store';

export function useSettingsQuery<T>(
  key: readonly unknown[],
  store: RevisionedStore<T>,
): UseQueryResult<Revisioned<T>, Error> {
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => store.fetch(signal),
  });
}

interface SaveSettingsVars<T> {
  readonly value: T;
  /** 내가 읽은 문서의 토큰 — 어긋나면 저장소가 409 로 거절한다 */
  readonly expectedRevision: string;
  /** 충돌 다이얼로그에서 '덮어쓰기' 를 고른 경우에만 true */
  readonly force?: boolean;
  /** 다이얼로그를 닫으면 진행 중이던 저장을 취소한다 — 뮤테이션에는 signal 이 없어 화면이 넘긴다 */
  readonly signal: AbortSignal;
}

export function useSaveSettings<T>(
  key: readonly unknown[],
  store: RevisionedStore<T>,
): UseMutationResult<Revisioned<T>, Error, SaveSettingsVars<T>> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ value, expectedRevision, force, signal }: SaveSettingsVars<T>) =>
      store.save(
        force === undefined ? { value, expectedRevision } : { value, expectedRevision, force },
        signal,
      ),
    onSuccess: (saved) => {
      // 저장이 돌려준 최신 문서를 캐시에 직접 심는다 — 다음 저장이 쓸 revision 이 곧바로 최신이 된다.
      // (invalidate 만 하면 재조회가 끝나기 전의 낡은 revision 으로 두 번째 저장이 409 를 맞는다.)
      client.setQueryData(key, saved);
      void client.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * 중복 제출 잠금 (EXC-08).
 *
 * `disabled={saving}` 만으로는 부족하다 — 클릭과 리렌더 사이에 틈이 있어 빠른 더블 클릭/Enter 연타의
 * 두 번째가 통과한다. 동기 ref 잠금은 **렌더를 기다리지 않으므로** 그 틈을 닫는다.
 * (login 화면이 쓰는 submitLockRef 와 같은 장치다.)
 */
export function useSubmitLock(): {
  readonly acquire: () => boolean;
  readonly release: () => void;
} {
  const locked = useRef(false);

  const acquire = useCallback((): boolean => {
    if (locked.current) return false;
    locked.current = true;
    return true;
  }, []);

  const release = useCallback((): void => {
    locked.current = false;
  }, []);

  return { acquire, release };
}
