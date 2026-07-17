// 모달 미저장 이탈 가드 (A40 소유 — apps/admin/src/shared/ui/**)
//
// [왜 필요한가 — FEEDBACK-06 (P0)]
// `useUnsavedChangesDialog` 는 **페이지 폼**의 세 이탈 경로(unload·링크·뒤로가기)를 막는다. 그런데
// IA-06 이 짧은 taxonomy 엔티티(그룹·카테고리·역할)를 **모달에서** 편집하도록 정했기 때문에,
// FEEDBACK-04 가 페이지에서 지켜 주는 바로 그 상호작용(입력 + 실수 이탈)이 모달에서는 무방비였다.
// 감사 시점에 폼을 담은 모달 8개가 dirty 를 추적조차 하지 않았다 — 빗나간 딤 클릭이나
// 반사적 Esc 하나가 반쯤 채운 폼을 조용히 삭제했다.
//
// [지금 덮이는 범위 — 세어 본 값이다] 폼 모달은 **9개**다: 이 훅을 쓰는 7개 +
// CreateApiKeyModal(같은 규칙을 인라인으로 손조립 — busy 예외까지 더 얹었다) +
// ManageFaqCategoriesModal. 마지막 것은 감사가 셈에서 빠뜨려 오래 무방비였다(목록·삭제가
// 주인공이라 '새 카테고리' 입력이 폼으로 보이지 않았다) — 이제 이 훅을 쓴다.
// 즉 "8개 전부"라던 옛 문장은 **감사 당시의 셈**이었지 전수가 아니었다.
//
// 대조적으로 CreateGroupModal 은 **생성** 방향은 ConfirmDialog 로 막아 뒀다('엔터를 눌렀더니
// 생겼다'가 되면 안 된다는 이유로). 즉 커밋은 지키고 폐기는 안 지키는 비대칭이었다.
//
// [왜 이 훅 하나로 4경로가 덮이는가]
// DS Modal 은 Esc · 딤 클릭 · × 를 **모두 onClose 한 곳으로** 모은다. 그래서 onClose 를 감싸면
// 세 경로가 한 번에 덮이고, 나머지 하나(취소 버튼)는 호출부가 같은 requestClose 를 쓰면 된다.
// 경로마다 가드를 붙이면 반드시 한 경로를 빠뜨린다.
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import { ConfirmDialog } from './ConfirmDialog';

const DEFAULT_TITLE = '저장하지 않은 변경 사항이 있습니다';
const DEFAULT_MESSAGE = '입력한 내용이 사라집니다. 저장하지 않고 닫으시겠습니까?';

interface ModalDirtyGuardOptions {
  readonly title?: string;
  readonly message?: string;
}

interface ModalDirtyGuard {
  /**
   * 모달의 `onClose` 와 취소 버튼에 **둘 다** 이것을 넘긴다.
   * dirty 면 확인을 세우고, 아니면 즉시 닫는다(손대지 않은 모달은 프롬프트 없이 닫혀야 한다).
   */
  readonly requestClose: () => void;
  /** 모달 **밖**에 렌더한다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */
  readonly discardDialog: ReactNode;
}

/**
 * @param dirty 저장하지 않은 변경이 있는가. 보통 `form.formState.isDirty && !saving` 을 넘긴다 —
 *   저장 중에는 가드가 필요 없다(닫기 버튼이 이미 잠겨 있고, 곧 성공해서 닫힌다).
 * @param onClose 실제로 닫는 동작 (확인했거나 애초에 pristine 일 때 부른다)
 */
export function useModalDirtyGuard(
  dirty: boolean,
  onClose: () => void,
  options: ModalDirtyGuardOptions = {},
): ModalDirtyGuard {
  const { title = DEFAULT_TITLE, message = DEFAULT_MESSAGE } = options;
  const [asking, setAsking] = useState(false);

  const requestClose = useCallback(() => {
    if (!dirty) {
      onClose();
      return;
    }
    setAsking(true);
  }, [dirty, onClose]);

  const confirm = useCallback(() => {
    setAsking(false);
    onClose();
  }, [onClose]);

  const discardDialog = asking ? (
    <ConfirmDialog
      intent="discard"
      title={title}
      message={message}
      busy={false}
      onConfirm={confirm}
      onCancel={() => setAsking(false)}
      // 여기서 '취소'는 작업 취소가 아니라 '이 모달에 머무른다'는 뜻이다 — 토스트를 띄우지 않는다
      suppressCancelToast
    />
  ) : null;

  return { requestClose, discardDialog };
}
