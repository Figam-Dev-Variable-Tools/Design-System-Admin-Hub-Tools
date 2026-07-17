// 표 행 선택 상태 훅
//
// [왜 공통인가] 콘텐츠 목록 6종이 같은 규칙으로 행을 고른다 — 체크박스로 하나씩, 헤더로 이 페이지
// 전체. MembersPage 가 손으로 들고 있던 selectedIds/toggleOne/toggleAll 을 여섯 화면이 복사하는
// 대신 여기로 올린다(shared/ui/README 규칙 1). 도메인을 모른다 — id 문자열만 다룬다.
//
// [보이지 않는 행은 고르지 않는다] toggleAll 은 '지금 페이지의 id 들'을 받는다. 페이지/필터가 바뀌면
// 호출부가 clear() 로 비운다 — 안 보이는 행이 선택된 채 남지 않게.
import { useCallback, useState } from 'react';

interface RowSelection {
  readonly selectedIds: ReadonlySet<string>;
  readonly toggleOne: (id: string, checked: boolean) => void;
  /** 이 페이지의 id 목록으로 전체선택/해제 */
  readonly toggleAll: (ids: readonly string[], checked: boolean) => void;
  readonly clear: () => void;
}

export function useRowSelection(): RowSelection {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: readonly string[], checked: boolean) => {
    setSelectedIds(checked ? new Set(ids) : new Set());
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return { selectedIds, toggleOne, toggleAll, clear };
}
