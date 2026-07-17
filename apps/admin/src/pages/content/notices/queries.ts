// 공지사항 도메인 훅 (ADR-0008 §7.1 집행)
//
// **화면은 useQuery/useMutation 을 직접 부르지 않는다.** 여기 도메인 훅만 부른다 —
// 그래야 data-source.ts 의 본문이 fixture → HTTP 로 바뀌어도 화면에 도달하지 않는다.
//
// [백엔드 없음] 아래 훅이 부르는 것은 전부 data-source.ts 의 **fixture 어댑터**다.
// 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { settleAll } from '../../../shared/bulk';
import { createNotice, deleteNotice, fetchNotice, fetchNotices, updateNotice } from './data-source';
import type { NoticeInput, NoticeQuery } from './data-source';
import type { Notice, NoticeListResult } from './types';

const noticeKeys = {
  all: ['notices'] as const,
  lists: () => [...noticeKeys.all, 'list'] as const,
  list: (query: NoticeQuery) => [...noticeKeys.lists(), query] as const,
  detail: (id: string) => [...noticeKeys.all, 'detail', id] as const,
} as const;

/* ── 조회 ────────────────────────────────────────────────────────────────── */

export function useNoticesQuery(query: NoticeQuery): UseQueryResult<NoticeListResult, Error> {
  return useQuery({
    queryKey: noticeKeys.list(query),
    queryFn: ({ signal }) => fetchNotices(query, signal),
    // 필터/페이지가 바뀌는 동안 이전 목록을 계속 보여준다 — 표가 깜빡이며 비지 않는다
    placeholderData: (previous) => previous,
  });
}

export function useNoticeQuery(id: string): UseQueryResult<Notice, Error> {
  return useQuery({
    queryKey: noticeKeys.detail(id),
    queryFn: ({ signal }) => fetchNotice(id, signal),
  });
}

/* ── 쓰기 ────────────────────────────────────────────────────────────────── */
//
// 취소가 필요한 뮤테이션은 호출자가 AbortController 를 만들어 signal 을 variables 에 실어 보낸다.

interface CreateVars {
  readonly input: NoticeInput;
  readonly signal: AbortSignal;
}

export function useCreateNotice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateVars) => createNotice(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: noticeKeys.lists() });
    },
  });
}

interface UpdateVars {
  readonly id: string;
  readonly input: NoticeInput;
  readonly signal: AbortSignal;
}

export function useUpdateNotice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal }: UpdateVars) => updateNotice(id, input, signal),
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: noticeKeys.lists() });
      void client.invalidateQueries({ queryKey: noticeKeys.detail(id) });
    },
  });
}

interface DeleteVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useDeleteNotice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: DeleteVars) => deleteNotice(id, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: noticeKeys.lists() });
    },
  });
}

interface BulkDeleteVars {
  readonly ids: readonly string[];
  readonly signal: AbortSignal;
}

/** 일괄 삭제 — 선택된 공지 전원. 부분 실패도 건수(반환값)로 알린다. 전원 성공일 때만 목록을 무효화한다 */
export function useBulkDeleteNotices() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, signal }: BulkDeleteVars) =>
      settleAll(ids, (id) => deleteNotice(id, signal)),
    onSuccess: (failed, { signal }) => {
      if (signal.aborted) return;
      if (failed === 0) void client.invalidateQueries({ queryKey: noticeKeys.lists() });
    },
  });
}
