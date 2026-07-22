// 메뉴 관리 도메인 훅 (ADR-0008 §7.1 집행)
//
// 목록·등록·수정·삭제는 공용 CRUD 프레임워크가 소유한다. 여기 있는 둘(순서 이동·노출 토글)은
// 폼 제출이 아니라 목록에서 바로 일어나는 조작이라 그 틀에 들어가지 않는다.
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { MENU_RESOURCE, reorderSiteMenus, setSiteMenuVisible } from './data-source';

/** 공용 CRUD 훅과 **같은 키 모양** (shared/crud/crud.ts 의 listKey) — 어긋나면 목록이 낡는다 */
const listKey = [MENU_RESOURCE, 'list'] as const;

interface ReorderVars {
  readonly orderedIds: readonly string[];
  readonly signal: AbortSignal;
}

export function useReorderSiteMenus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ orderedIds, signal }: ReorderVars) => reorderSiteMenus(orderedIds, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKey });
    },
  });
}

interface VisibleVars {
  readonly id: string;
  readonly visible: boolean;
  readonly signal: AbortSignal;
}

export function useSetSiteMenuVisible() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, visible, signal }: VisibleVars) => setSiteMenuVisible(id, visible, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKey });
    },
  });
}
