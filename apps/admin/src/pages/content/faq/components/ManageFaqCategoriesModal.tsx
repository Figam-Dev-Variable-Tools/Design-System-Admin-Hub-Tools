// FAQ 카테고리 관리 모달 — 목록(사용량) · 등록 · 삭제 (오너 피드백 ④)
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 Modal 을 재사용한다.
// [삭제 안전 기본값] 카테고리에 속한 FAQ 가 1건이라도 있으면 삭제를 막는다 — 삭제 버튼을 잠그고
//   'N개 FAQ 가 사용 중'을 안내한다(고아 FAQ 를 만들지 않기 위해). 서버도 409 로 막는다(data-source).
// [확인 없는 삭제 금지] 삭제는 intent="delete" ConfirmDialog 경유. 등록도 intent="create" 확인.
// [모달은 열려 있는다] 등록/삭제 후에도 닫지 않는다(연속 관리) — 결과는 토스트로 호출부가 알린다.
//
// [EXC-03 · 권한] 이 팝업은 **부모의 판정을 물려받지 않는다.** 부모(FaqPage)는 쓰기 권한이 하나도
// 없으면 여는 버튼을 만들지 않지만, 그것은 '열리지 않는다' 는 보장일 뿐 '저장되지 않는다' 는 보장이
// 아니다 — 열려 있는 동안 다른 탭에서 강등되면 부모의 판정은 이미 지나간 과거다. 그래서 같은
// 술어(같은 라우트의 create·remove)를 여기서 다시 읽고, 컨트롤을 없애는 것과 **같은 값**으로
// 저장 경로를 거절한다. 목록(사용량)은 조회 사실이라 권한과 무관하게 남는다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../../shared/async';
import { zodResolver } from '../../../../shared/form/zodResolver';
import { formatNumber } from '../../../../shared/format';
import {
  useRouteWritePermissions,
  WRITE_DENIED,
} from '../../../../shared/permissions/RequirePermission';
import {
  badgeStyle,
  Button,
  buttonStyle,
  ConfirmDialog,
  controlStyle,
  errorIdOf,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  hintStyle,
  Icon,
  Modal,
  useModalDirtyGuard,
} from '../../../../shared/ui';
import { useCreateFaqCategory, useDeleteFaqCategory, useFaqCategoryUsageQuery } from '../queries';
import type { FaqCategoryUsage } from '../types';
import { faqCategorySchema } from '../validation';
import type { FaqCategoryFormValues } from '../validation';
import { cssVar } from '@tds/ui';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const rowLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const labelTextStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: cssVar('color.feedback.danger.text'),
};

const dividerStyle: CSSProperties = {
  marginTop: cssVar('space.2'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  borderStyle: 'none',
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

/** 삭제 가능 여부 문구 — 사용 중이면 왜 못 지우는지 알린다 */
function usageLabel(faqCount: number): string {
  return faqCount === 0 ? '미사용' : `${formatNumber(faqCount)}개 FAQ 사용 중`;
}

interface ManageFaqCategoriesModalProps {
  readonly onClose: () => void;
  readonly onCreated: (name: string) => void;
  readonly onDeleted: (label: string) => void;
}

export function ManageFaqCategoriesModal({
  onClose,
  onCreated,
  onDeleted,
}: ManageFaqCategoriesModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    clearErrors,
  } = useForm<FaqCategoryFormValues>({
    resolver: zodResolver(faqCategorySchema),
    defaultValues: { name: '' },
  });

  const { data: categories, isFetching: loadingList } = useFaqCategoryUsageQuery(true);

  /** 부모가 버튼을 없앨 때 읽은 것과 **같은 술어**다 (같은 라우트의 create·remove) */
  const { canCreate, canRemove } = useRouteWritePermissions();

  const [serverError, setServerError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FaqCategoryUsage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const create = useCreateFaqCategory();
  const remove = useDeleteFaqCategory();
  const saving = create.isPending;
  const deleting = remove.isPending;

  /**
   * [FEEDBACK-06] 입력이 있는 채로 닫으려 하면 확인을 세운다 — 다른 폼 모달 8개와 같은 가드다.
   * 이 모달만 빠져 있었다: 목록·삭제가 주인공이라 '새 카테고리' 입력이 폼으로 보이지 않았지만
   * 사용자 입장에선 다를 게 없다 — 반쯤 친 이름이 빗나간 딤 클릭 하나로 조용히 사라졌다.
   * requestClose 를 Modal.onClose(=Esc·딤·×)와 푸터 '닫기' 에 **둘 다** 넘겨 4경로를 덮는다.
   */
  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const createControllerRef = useRef<AbortController | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      createControllerRef.current?.abort();
      deleteControllerRef.current?.abort();
    },
    [],
  );

  /* ── 등록 ─────────────────────────────────────────────────────────────── */

  const onValid = (values: FaqCategoryFormValues) => {
    setServerError(null);
    setConfirming(values.name.trim());
  };

  const confirmCreate = () => {
    if (confirming === null) return;
    // 확인 다이얼로그를 닫고 폼 자리에 사유를 남긴다 — 거절은 침묵이 아니다
    if (!canCreate) {
      setConfirming(null);
      setServerError(WRITE_DENIED.create);
      return;
    }
    const trimmed = confirming;
    setServerError(null);
    const controller = new AbortController();
    createControllerRef.current = controller;

    create.mutate(
      { input: { name: trimmed }, signal: controller.signal },
      {
        onSuccess: () => {
          setConfirming(null);
          reset({ name: '' });
          onCreated(trimmed);
          nameRef.current?.focus();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setConfirming(null);
          setServerError('카테고리를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const cancelCreate = () => {
    createControllerRef.current?.abort();
    createControllerRef.current = null;
    create.reset();
    setConfirming(null);
  };

  /* ── 삭제 ─────────────────────────────────────────────────────────────── */

  const confirmDelete = () => {
    if (pendingDelete === null) return;
    if (!canRemove) {
      setDeleteError(WRITE_DENIED.remove);
      return;
    }
    const target = pendingDelete;
    setDeleteError(null);
    const controller = new AbortController();
    deleteControllerRef.current = controller;

    remove.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          onDeleted(target.label);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('카테고리를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const cancelDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    remove.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const nameField = register('name');
  const shownError = errors.name?.message ?? serverError;
  const invalid = shownError !== null && shownError !== undefined;
  const list = categories ?? [];

  return (
    <>
      <Modal
        title="FAQ 카테고리 관리"
        onClose={requestClose}
        onSubmit={() => {
          setServerError(null);
          clearErrors();
          void handleSubmit(onValid, () => nameRef.current?.focus())();
        }}
        initialFocusRef={nameRef}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={requestClose}>
              닫기
            </Button>
            {canCreate && (
              <Button variant="primary" size="md" type="submit" disabled={saving}>
                {saving ? '만드는 중…' : '카테고리 만들기'}
              </Button>
            )}
          </>
        }
      >
        <div style={bodyStyle}>
          {list.length === 0 ? (
            <p style={hintStyle}>{loadingList ? '불러오는 중…' : '등록된 카테고리가 없어요.'}</p>
          ) : (
            <ul style={listStyle}>
              {list.map((category) => {
                const inUse = category.faqCount > 0;
                return (
                  <li key={category.id} style={rowStyle}>
                    <span style={rowLeftStyle}>
                      <span style={labelTextStyle}>{category.label}</span>
                      <span style={badgeStyle}>{usageLabel(category.faqCount)}</span>
                    </span>
                    {/* 아래 disabled 와 헷갈리지 말 것: 그쪽은 **권한은 있는데 이 대상에는 못
                        한다**(사용 중)는 뜻이라 남아서 이유를 말한다. 권한 없음은 그 일 자체가
                        내 것이 아니라는 뜻이라 컨트롤이 사라진다. */}
                    {canRemove && (
                      <button
                        type="button"
                        className="tds-ui-btn-ghost tds-ui-focusable"
                        style={inUse ? buttonStyle('ghost', true) : dangerGhostStyle}
                        aria-label={
                          inUse
                            ? `${category.label} — ${usageLabel(category.faqCount)}이라 삭제할 수 없어요`
                            : `${category.label} 삭제`
                        }
                        title={
                          inUse ? `${usageLabel(category.faqCount)} — 삭제할 수 없어요` : undefined
                        }
                        disabled={inUse || deleting}
                        onClick={() => {
                          setDeleteError(null);
                          setPendingDelete(category);
                        }}
                      >
                        <Icon name="trash" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* 등록 권한이 없으면 입력칸도 사라진다 — 채울 수 있는데 저장만 막히는 폼을 남기지 않는다.
              (서버 거절 배너는 canCreate 가 렌더 이후 뒤집힌 경우를 위해 그대로 둔다.) */}
          {canCreate && <hr style={dividerStyle} />}

          {canCreate && (
            <div style={fieldStyle}>
              <label htmlFor="faq-category-name" style={fieldLabelStyle}>
                새 카테고리
              </label>
              <input
                id="faq-category-name"
                type="text"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(invalid)}
                placeholder="예: 결제"
                aria-invalid={invalid}
                // [A11Y-11] aria-invalid 는 **항상** 그 이유(에러 <p>)와 함께 나간다
                aria-describedby={invalid ? errorIdOf('faq-category-name') : undefined}
                disabled={saving}
                name={nameField.name}
                ref={(element) => {
                  nameField.ref(element);
                  nameRef.current = element;
                }}
                onChange={nameField.onChange}
                onBlur={nameField.onBlur}
              />
            </div>
          )}

          {invalid && (
            <p id={errorIdOf('faq-category-name')} role="alert" style={errorTextStyle}>
              {shownError}
            </p>
          )}

          <p style={hintStyle}>
            카테고리를 만들면 FAQ 등록 화면의 분류 선택지에 추가돼요. 사용 중인 카테고리는 삭제할 수
            없어요 — 먼저 그 FAQ 들의 카테고리를 바꾸거나 삭제하세요.
          </p>
        </div>
      </Modal>

      {confirming !== null && (
        <ConfirmDialog
          intent="create"
          title="카테고리 만들기"
          message={`'${confirming}' 카테고리를 만들어요.`}
          confirmLabel="카테고리 만들기"
          busy={saving}
          onConfirm={confirmCreate}
          onCancel={cancelCreate}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="카테고리 삭제"
          message={`'${pendingDelete.label}' 카테고리를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="카테고리 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
