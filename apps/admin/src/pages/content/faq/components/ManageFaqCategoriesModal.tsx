// FAQ 카테고리 관리 모달 — 목록(사용량) · 등록 · 삭제 (A41 소유, 오너 피드백 ④)
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 Modal 을 재사용한다.
// [삭제 안전 기본값] 카테고리에 속한 FAQ 가 1건이라도 있으면 삭제를 막는다 — 삭제 버튼을 잠그고
//   'N개 FAQ 가 사용 중'을 안내한다(고아 FAQ 를 만들지 않기 위해). 서버도 409 로 막는다(data-source).
// [확인 없는 삭제 금지] 삭제는 intent="delete" ConfirmDialog 경유. 등록도 intent="create" 확인.
// [모달은 열려 있는다] 등록/삭제 후에도 닫지 않는다(연속 관리) — 결과는 토스트로 호출부가 알린다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../../shared/async';
import { zodResolver } from '../../../../shared/form/zodResolver';
import { formatNumber } from '../../../../shared/format';
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
  Modal,
  TrashIcon,
} from '../../../../shared/ui';
import { useCreateFaqCategory, useDeleteFaqCategory, useFaqCategoryUsageQuery } from '../queries';
import type { FaqCategoryUsage } from '../types';
import { faqCategorySchema } from '../validation';
import type { FaqCategoryFormValues } from '../validation';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
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
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

const rowLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

const labelTextStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  overflowWrap: 'anywhere',
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: 'var(--tds-color-feedback-danger-text)',
};

const dividerStyle: CSSProperties = {
  marginTop: 'var(--tds-space-2)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  borderStyle: 'none',
  borderTopStyle: 'solid',
  borderTopWidth: 'var(--tds-border-width-thin)',
  borderTopColor: 'var(--tds-color-border-default)',
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
    formState: { errors },
    clearErrors,
  } = useForm<FaqCategoryFormValues>({
    resolver: zodResolver(faqCategorySchema),
    defaultValues: { name: '' },
  });

  const { data: categories, isFetching: loadingList } = useFaqCategoryUsageQuery(true);

  const [serverError, setServerError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FaqCategoryUsage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const create = useCreateFaqCategory();
  const remove = useDeleteFaqCategory();
  const saving = create.isPending;
  const deleting = remove.isPending;

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
          setServerError('카테고리를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
          setDeleteError('카테고리를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
        onClose={onClose}
        onSubmit={() => {
          setServerError(null);
          clearErrors();
          void handleSubmit(onValid, () => nameRef.current?.focus())();
        }}
        initialFocusRef={nameRef}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={onClose}>
              닫기
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={saving}>
              {saving ? '만드는 중…' : '카테고리 만들기'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          {list.length === 0 ? (
            <p style={hintStyle}>{loadingList ? '불러오는 중…' : '등록된 카테고리가 없습니다.'}</p>
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
                    <button
                      type="button"
                      className="tds-ui-btn-ghost tds-ui-focusable"
                      style={inUse ? buttonStyle('ghost', true) : dangerGhostStyle}
                      aria-label={
                        inUse
                          ? `${category.label} — ${usageLabel(category.faqCount)}라 삭제할 수 없습니다`
                          : `${category.label} 삭제`
                      }
                      title={
                        inUse ? `${usageLabel(category.faqCount)} — 삭제할 수 없습니다` : undefined
                      }
                      disabled={inUse || deleting}
                      onClick={() => {
                        setDeleteError(null);
                        setPendingDelete(category);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <hr style={dividerStyle} />

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

          {invalid && (
            <p id={errorIdOf('faq-category-name')} role="alert" style={errorTextStyle}>
              {shownError}
            </p>
          )}

          <p style={hintStyle}>
            카테고리를 만들면 FAQ 등록 화면의 분류 선택지에 추가됩니다. 사용 중인 카테고리는 삭제할
            수 없습니다 — 먼저 그 FAQ 들의 카테고리를 바꾸거나 삭제하세요.
          </p>
        </div>
      </Modal>

      {confirming !== null && (
        <ConfirmDialog
          intent="create"
          title="카테고리 만들기"
          message={`'${confirming}' 카테고리를 만듭니다.`}
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
          message={`'${pendingDelete.label}' 카테고리를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="카테고리 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </>
  );
}
