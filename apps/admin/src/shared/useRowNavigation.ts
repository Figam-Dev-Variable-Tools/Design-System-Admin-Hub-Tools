// 목록 행 전체를 클릭하면 상세로 이동시키는 훅 (A40 소유 — apps/admin/src/**)
//
// 목록 화면의 공통 규칙이다: 이름 링크만이 아니라 **행 어디를 눌러도** 상세로 간다.
// 회원 목록뿐 아니라 앞으로 만들 모든 목록(상품·주문·문의…)이 이 훅을 쓴다.
//
// [핵심] 행 안의 인터랙티브 요소(체크박스·버튼·링크·select)는 자기 일을 해야 하므로
// 행 이동을 트리거하지 않는다. 이걸 놓치면 체크박스를 누를 때마다 화면이 튄다.
//
// [접근성] 행 자체를 button/link 로 만들지 않는다 — <tr> 에 role 을 씌우면 표 시맨틱이 깨진다.
// 키보드 사용자는 행 안의 이름 링크로 이동하므로, 행 클릭은 마우스 사용자를 위한 **보조 수단**이다.
// 따라서 tabIndex 를 주지 않으며, 접근 가능한 경로가 이미 존재한다는 전제 위에서만 쓴다.
import { useCallback } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/** 행 이동을 가로채는 요소들 — 이 안에서 발생한 클릭은 행 이동으로 취급하지 않는다 */
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, [role="menu"], [role="menuitem"]';

const CURSOR_POINTER = { cursor: 'pointer' } as const;

interface RowActivateProps {
  readonly onClick: (event: MouseEvent<HTMLElement>) => void;
  readonly style: { readonly cursor: 'pointer' };
}

interface UseRowNavigationResult {
  /** <tr> 에 그대로 펼친다: {...rowNavProps(detailPath)} — 행 클릭 시 to 로 이동한다 */
  readonly rowNavProps: (to: string) => RowActivateProps;
  /**
   * 경로가 아니라 콜백을 실행하는 변형: {...rowActivateProps(() => onEdit(item))}.
   * 이동 대상을 페이지가 콜백으로 쥐고 있는 목록(선언적 CRUD 프레임워크의 onEdit 등)에서 쓴다.
   * 인터랙티브 요소 가드는 rowNavProps 와 동일하다.
   */
  readonly rowActivateProps: (onActivate: () => void) => RowActivateProps;
}

export function useRowNavigation(): UseRowNavigationResult {
  const navigate = useNavigate();

  // 행 클릭을 이동/실행으로 볼지 판정하고, 통과하면 run() 을 부른다 — 두 변형이 같은 가드를 공유한다.
  const guardedClick = useCallback(
    (run: () => void) => (event: MouseEvent<HTMLElement>) => {
      // 텍스트를 드래그해 선택하던 중이면 이동하지 않는다 (셀 값 복사를 막지 않기 위해)
      if (window.getSelection()?.toString() !== '') return;

      const target = event.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTOR) !== null) return;

      run();
    },
    [],
  );

  const rowNavProps = useCallback(
    (to: string) => ({ onClick: guardedClick(() => navigate(to)), style: CURSOR_POINTER }),
    [guardedClick, navigate],
  );

  const rowActivateProps = useCallback(
    (onActivate: () => void) => ({ onClick: guardedClick(onActivate), style: CURSOR_POINTER }),
    [guardedClick],
  );

  return { rowNavProps, rowActivateProps };
}
