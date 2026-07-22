// 페이지 관리 도메인 훅 (ADR-0008 §7.1 집행)
//
// **화면은 useMutation 을 직접 부르지 않는다.** 여기 도메인 훅만 부른다 — 그래야 data-source 의
// 본문이 fixture → HTTP 로 바뀌어도 화면에 도달하지 않는다.
//
// [왜 이 두 개만 여기 있나] 목록·등록·수정·삭제는 공용 CRUD 프레임워크(useCrudList/useCrudForm)가
// 이미 소유한다. 되돌리기와 미리보기 링크 발급은 폼 제출이 아니라 **버튼 하나로 끝나는 조작**이라
// 그 틀에 들어가지 않는다 — 그 둘만 여기서 배선한다.
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { issuePreviewToken, revertSitePageVersion, SITE_PAGE_RESOURCE } from './data-source';

/**
 * 공용 CRUD 훅이 쓰는 키와 **같은 모양**이어야 한다 (shared/crud/crud.ts 의 listKey/detailKey).
 * 그 두 함수는 공개 표면이 아니므로 여기서 같은 규약으로 만든다 — 어긋나면 되돌린 뒤에도
 * 화면이 옛 내용을 계속 보여 준다.
 */
const listKey = [SITE_PAGE_RESOURCE, 'list'] as const;
const detailKey = (id: string) => [SITE_PAGE_RESOURCE, 'detail', id] as const;

interface RevertVars {
  readonly id: string;
  readonly versionId: string;
  readonly signal: AbortSignal;
}

export function useRevertSitePage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, versionId, signal }: RevertVars) =>
      revertSitePageVersion(id, versionId, signal),
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: listKey });
      void client.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

interface PreviewVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useIssuePreviewToken() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: PreviewVars) => issuePreviewToken(id, signal),
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}
