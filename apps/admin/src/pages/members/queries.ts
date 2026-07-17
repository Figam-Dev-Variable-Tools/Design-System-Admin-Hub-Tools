// 회원 도메인 훅 (ADR-0008 §7.1 집행)
//
// **화면은 useQuery/useMutation 을 직접 부르지 않는다.** 여기 도메인 훅만 부른다 —
// 그래야 data-source.ts 의 본문이 mock → HTTP 로 바뀌어도 화면에 도달하지 않는다 (ADR-0008 §7.1).
//
// [백엔드 없음] 아래 훅이 부르는 것은 전부 data-source.ts 의 **fixture 어댑터**다.
// 실제 네트워크 요청은 이 앱 어디에도 없다 — 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
//
// [AbortSignal] 조회는 react-query 가 주는 signal 을 그대로 흘려보낸다 —
// 언마운트/키 변경 시 진행 중이던 요청이 취소된다 (useAsyncData 가 하던 일과 같다).
// 뮤테이션에는 react-query 가 signal 을 주지 않는다 — 모달/다이얼로그가 자기 AbortController 를
// 만들어 variables 로 넘긴다 (닫으면 취소되는 동작을 유지해야 하기 때문이다).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { isAbort } from '../../shared/async';
import {
  addPointHistory,
  changePassword,
  createGroup,
  deleteMember,
  fetchGroups,
  fetchMembers,
  fetchMembersForExport,
  removePointHistory,
  saveMemo,
  sendNotification,
} from './data-source';
import type { MemberQuery } from './data-source';
import type {
  CreateGroupInput,
  Member,
  MemberDetail,
  MemberGroup,
  MemberListResult,
  PointAdjustInput,
  PointEntry,
} from './types';

/** 상세 조회 계약 — 회원/운영자 어느 쪽이든 같은 MemberDetail 을 돌려준다 */
export type FetchDetail = (id: string, signal: AbortSignal) => Promise<MemberDetail>;

/**
 * 캐시 키.
 *
 * 상세 키에 `listPath` 가 들어가는 이유: /users/members/:id 와 /users/admins/:id 는 **같은 화면**이
 * 서로 다른 fetchDetail 로 도는 것이라(App.tsx), id 만으로 키를 잡으면 두 컨텍스트가 같은 캐시 칸을
 * 공유해 **운영자 상세에 회원 데이터가 뜬다.** useAsyncData 의 deps 도 [memberId, listPath] 였다.
 */
const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (query: MemberQuery) => [...memberKeys.lists(), query] as const,
  groups: () => [...memberKeys.all, 'groups'] as const,
  detail: (listPath: string, id: string) => [...memberKeys.all, 'detail', listPath, id] as const,
} as const;

/* ── 조회 ────────────────────────────────────────────────────────────────── */

export function useMembersQuery(query: MemberQuery): UseQueryResult<MemberListResult, Error> {
  return useQuery({
    queryKey: memberKeys.list(query),
    queryFn: ({ signal }) => fetchMembers(query, signal),
    // 필터/페이지가 바뀌는 동안 이전 목록을 계속 보여준다 —
    // useAsyncData 는 재조회 중에도 data 를 비우지 않았다(loading 만 true). 그 동작을 유지한다.
    placeholderData: (previous) => previous,
  });
}

export function useMemberGroupsQuery(): UseQueryResult<readonly MemberGroup[], Error> {
  return useQuery({
    queryKey: memberKeys.groups(),
    queryFn: ({ signal }) => fetchGroups(signal),
  });
}

export function useMemberDetailQuery(
  id: string,
  listPath: string,
  fetchDetail: FetchDetail,
): UseQueryResult<MemberDetail, Error> {
  return useQuery({
    queryKey: memberKeys.detail(listPath, id),
    queryFn: ({ signal }) => fetchDetail(id, signal),
  });
}

/* ── 쓰기 ────────────────────────────────────────────────────────────────── */
//
// 취소가 필요한 뮤테이션은 호출자가 AbortController 를 만들어 signal 을 variables 에 실어 보낸다.
// (모달을 Esc·딤 클릭으로 닫으면 진행 중이던 요청이 취소되어야 한다 — 기존 동작.)

interface DeleteMembersVars {
  readonly targets: readonly Member[];
  readonly signal: AbortSignal;
}

/** 행 ⋯ 삭제(1명)와 일괄 삭제(N명)가 같은 뮤테이션을 쓴다 — 부분 실패 건수를 돌려준다 */
export function useDeleteMembers() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ targets, signal }: DeleteMembersVars) =>
      Promise.allSettled(targets.map((member) => deleteMember(member.id, signal))),
    onSuccess: (results, { signal }) => {
      // 취소된 삭제는 없던 일이다 — 목록을 건드리지 않는다
      if (signal.aborted) return;
      const failed = results.filter(
        (result) => result.status === 'rejected' && !isAbort(result.reason),
      ).length;
      // 한 명이라도 실패하면 다이얼로그가 열린 채 남고 재시도를 기다린다 —
      // 그때는 목록을 갱신하지 않았다(기존 reload() 위치와 동일하게 **전원 성공일 때만** 무효화한다)
      if (failed > 0) return;
      void client.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

interface DeleteMemberVars {
  readonly memberId: string;
  readonly signal: AbortSignal;
}

/** 상세 화면의 삭제 — 1명, 성공하면 목록으로 돌아간다 */
export function useDeleteMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, signal }: DeleteMemberVars) => deleteMember(memberId, signal),
    onSuccess: () => {
      // 삭제된 회원이 목록 캐시에 남아 있으면 안 된다 — 돌아갈 때 사라진 채로 보여야 한다
      void client.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useSendNotification() {
  return useMutation({
    mutationFn: (memberId: string) => sendNotification(memberId),
  });
}

/** 일괄 알림 — 부분 실패도 건수로 알려야 하므로 allSettled 결과를 그대로 돌려준다 */
export function useBulkSendNotification() {
  return useMutation({
    mutationFn: async (targets: readonly Member[]) =>
      Promise.allSettled(targets.map((member) => sendNotification(member.id))),
  });
}

interface ExportMembersVars {
  readonly query: MemberQuery;
  readonly signal: AbortSignal;
}

export function useExportMembers() {
  return useMutation({
    mutationFn: ({ query, signal }: ExportMembersVars): Promise<readonly Member[]> =>
      fetchMembersForExport(query, signal),
  });
}

interface CreateGroupVars {
  readonly input: CreateGroupInput;
  readonly signal: AbortSignal;
}

export function useCreateGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateGroupVars) => createGroup(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: memberKeys.groups() });
    },
  });
}

interface ChangePasswordVars {
  readonly memberId: string;
  readonly password: string;
  readonly signal: AbortSignal;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ memberId, password, signal }: ChangePasswordVars) =>
      changePassword(memberId, password, signal),
  });
}

interface AddPointHistoryVars {
  readonly memberId: string;
  readonly input: PointAdjustInput;
  /**
   * 멱등키 — **호출자가 제출 시도 단위로 만들어 넘긴다** (BE-004-EP-03).
   *
   * [react-query 의 자동 재시도와의 상호작용 — 결론]
   * react-query 가 뮤테이션을 재시도하면 **같은 variables 로 mutationFn 을 다시 부른다.**
   * 따라서 키가 여기(variables) 있는 한, 자동 재시도가 켜지더라도 **같은 키가 실려** 서버는
   * 최초 응답을 재생한다 — 중복 지급이 생기지 않는다.
   * 반대로 `mutationFn` **안에서** `crypto.randomUUID()` 를 부르면 재시도마다 **새 키**가 생겨
   * 서버가 두 요청을 별개 거래로 보고 **적립금을 두 번 지급한다.** 그래서 키 생성을 여기 두지 않는다.
   *
   * 그럼에도 이 앱은 자동 재시도를 **끈다**(queryClient 의 mutations.retry = false):
   * 실패 후 재시도 여부는 **사용자가 '확인'을 다시 누르는 것**으로만 결정되고, 그때 PointsCard 의
   * idempotencyKeyRef 가 **같은 키를 재사용**한다(성공해야 키를 버린다). 즉 자동/수동 어느 경로로도
   * 같은 거래는 같은 키를 갖는다 — 이것이 중복 지급을 구조적으로 막는다.
   */
  readonly idempotencyKey: string;
}

export function useAddPointHistory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, input, idempotencyKey }: AddPointHistoryVars): Promise<PointEntry> =>
      addPointHistory(memberId, input, idempotencyKey),
    onSuccess: () => {
      // 적립금이 바뀌면 **목록의 적립금 열이 낡는다.** 상세 화면은 서버가 돌려준 행을 그대로 반영하므로
      // 다시 조회하지 않는다 (BE-004 §7.5 — 쓰기 후 재조회 안 함). 목록만 무효화한다.
      void client.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

interface RemovePointHistoryVars {
  readonly memberId: string;
  readonly entryId: string;
  readonly signal: AbortSignal;
}

export function useRemovePointHistory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, entryId, signal }: RemovePointHistoryVars) =>
      removePointHistory(memberId, entryId, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

interface SaveMemoVars {
  readonly memberId: string;
  readonly memo: string;
  /** 메모 저장에는 취소 경로가 없다(모달이 아니라 카드 안에서 저장한다) — signal 은 선택이다 */
  readonly signal?: AbortSignal;
}

export function useSaveMemo() {
  return useMutation({
    mutationFn: ({ memberId, memo, signal }: SaveMemoVars) => saveMemo(memberId, memo, signal),
  });
}
