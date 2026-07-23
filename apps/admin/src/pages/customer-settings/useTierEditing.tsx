// 등급 추가·이름 수정·삭제 — 화면 상태와 다이얼로그를 한 덩어리로 소유한다
//
// [왜 페이지에서 떼어냈나] 이 화면의 페이지 컴포넌트는 이미 정책 폼(초안·기준선·검증·저장 확인·
// 이탈 가드)을 들고 있다. 거기에 모달 상태 셋과 세 연산의 거절 분기까지 얹으면 한 함수의 분기가
// 스무 갈래를 넘어간다 — code-quality 축4(복잡도)가 잡는 자리이기도 하지만, 그 전에 **저장 흐름과
// 등급 편집 흐름이 한 스코프에서 섞여** 어느 setState 가 어느 흐름의 것인지 읽히지 않는다.
//
// [규율은 그대로다] 세 연산은 모델(types.ts)의 순수 함수가 판정하고, 거절은 **사유 문자열**로
// 돌아온다. 권한 술어도 여기서 다시 본다 — 버튼을 잠그는 술어와 거절하는 술어가 같아야 한다.
//
// [반영은 저장 때다] 여기서 바뀌는 것은 초안뿐이다. 실제 반영은 화면 하단의 저장이 한다 —
// 그래서 토스트 문구가 매번 '저장해야 반영됩니다' 라고 말한다.
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import { memberTierUsage } from '../../shared/domain/member-tier-catalog';
import { ConfirmDialog, useToast } from '../../shared/ui';
import { TierFormModal } from './components/TierFormModal';
import { addTier, removeTier, renameTier, tierDeletionBlock } from './types';
import type { PolicyDraft, TierDraftRow, TierMutationResult } from './types';

type TierModalState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'create' }
  | { readonly kind: 'rename'; readonly row: TierDraftRow };

interface TierEditingOptions {
  /** null 이면 아직 정책을 못 읽었다 — 그 상태에서는 아무 연산도 하지 않는다 */
  readonly draft: PolicyDraft | null;
  readonly onDraftChange: (next: PolicyDraft) => void;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
  /** 등급 id → 그 등급을 쓰는 회원 수 (null = 확인 불가) */
  readonly memberCounts: Readonly<Record<string, number | null>>;
}

interface TierEditing {
  readonly openCreate: () => void;
  readonly openRename: (row: TierDraftRow) => void;
  readonly requestDelete: (row: TierDraftRow) => void;
  /** 모달과 삭제 확인 다이얼로그 — 페이지가 그대로 렌더한다 */
  readonly dialogs: ReactNode;
}

const NOT_LOADED = '등급 정책을 아직 불러오지 못했어요.';

export function useTierEditing({
  draft,
  onDraftChange,
  canCreate,
  canUpdate,
  canRemove,
  memberCounts,
}: TierEditingOptions): TierEditing {
  const toast = useToast();
  const [modal, setModal] = useState<TierModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<TierDraftRow | null>(null);
  /** 삭제 거절 사유 — 확인 다이얼로그 안에 그대로 남는다(조용히 닫지 않는다) */
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const closeModal = useCallback(() => setModal({ kind: 'closed' }), []);

  /** 추가/개명 — 권한과 모델을 차례로 통과해야 초안이 바뀐다 */
  const submit = useCallback(
    (label: string): TierMutationResult => {
      if (draft === null) return { ok: false, error: NOT_LOADED };

      const result = mutateTier(draft, modal, label, { canCreate, canUpdate });
      if (!result.ok) return result;

      onDraftChange(result.draft);
      const creating = modal.kind === 'create';
      closeModal();
      toast.success(
        creating
          ? `'${label.trim()}' 등급을 추가했어요. 승급 조건을 채우고 저장하세요.`
          : `등급 이름을 '${label.trim()}' 으(로) 바꿨어요. 저장해야 반영돼요.`,
      );
      return result;
    },
    [canCreate, canUpdate, closeModal, draft, modal, onDraftChange, toast],
  );

  /**
   * 삭제 확인 — 화면이 이미 버튼을 잠갔더라도 여기서 다시 판정한다.
   * 잠금은 UX 이고 거절이 규칙이다(다른 탭에서 그 사이 회원이 이 등급으로 옮겨질 수 있다).
   */
  const confirmDelete = useCallback(() => {
    if (draft === null || pendingDelete === null) return;
    if (!canRemove) {
      setDeleteError('이 화면의 삭제 권한이 없어요.');
      return;
    }

    const result = removeTier(draft, pendingDelete.id, memberTierUsage(pendingDelete.id));
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }

    onDraftChange(result.draft);
    setPendingDelete(null);
    setDeleteError(null);
    toast.success(`'${pendingDelete.label}' 등급을 목록에서 지웠어요. 저장해야 반영돼요.`);
  }, [canRemove, draft, onDraftChange, pendingDelete, toast]);

  const dialogs = (
    <>
      {modal.kind !== 'closed' && (
        <TierFormModal
          mode={modal.kind}
          initialLabel={modal.kind === 'rename' ? modal.row.label : ''}
          onClose={closeModal}
          onSubmit={submit}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="등급 삭제"
          message={deleteMessageOf(pendingDelete, memberCounts[pendingDelete.id] ?? null)}
          confirmLabel="등급 삭제"
          busy={false}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteError(null);
            setPendingDelete(null);
          }}
        />
      )}
    </>
  );

  return {
    openCreate: () => setModal({ kind: 'create' }),
    openRename: (row) => setModal({ kind: 'rename', row }),
    requestDelete: (row) => {
      setDeleteError(null);
      setPendingDelete(row);
    },
    dialogs,
  };
}

/** 확인 문구 — 막힌 상태로도 열릴 수 있으므로(경합) 그때는 사유를 그대로 보여 준다 */
function deleteMessageOf(row: TierDraftRow, memberCount: number | null): string {
  return (
    tierDeletionBlock(row, memberCount) ??
    `'${row.label}' 등급을 목록에서 지워요. 하단의 저장을 눌러야 실제로 반영돼요.`
  );
}

/** 모달의 모드에 따라 어느 모델 연산을 부를지 — 권한 술어도 여기서 함께 본다 */
function mutateTier(
  draft: PolicyDraft,
  modal: TierModalState,
  label: string,
  can: { readonly canCreate: boolean; readonly canUpdate: boolean },
): TierMutationResult {
  if (modal.kind === 'create') {
    if (!can.canCreate) return { ok: false, error: '이 화면의 등록 권한이 없어요.' };
    return addTier(draft, label);
  }
  if (modal.kind === 'rename') {
    if (!can.canUpdate) return { ok: false, error: '이 화면의 수정 권한이 없어 저장할 수 없어요.' };
    return renameTier(draft, modal.row.id, label);
  }
  return { ok: false, error: '등급을 찾을 수 없어요.' };
}
