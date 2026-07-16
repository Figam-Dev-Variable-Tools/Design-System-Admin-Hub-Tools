// API Key 발급 모달 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [FEEDBACK-06] 폼을 담은 모달은 **네 이탈 경로 전부**(딤 클릭·Esc·×·취소)에서 dirty 를 가드한다.
// Modal 은 그 넷을 모두 onClose 하나로 모아 주므로, 취소 버튼도 같은 핸들러를 부르면 네 경로가
// 한 판정을 공유한다 — 경로마다 다른 동작이 생길 자리가 없다.
//
// [FEEDBACK-01] 발급 실패는 토스트가 아니라 **이 모달 안의 danger 배너**다. 모달 뒤에 뜬 토스트는
// 보이지 않는다.
//
// [A11Y-13] 열리면 첫 편집 필드(이름)로 포커스가 간다 — initialFocusRef.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { Checkbox } from '@tds/ui';

import { zodResolver } from '../../../../shared/form/zodResolver';
import {
  Alert,
  Button,
  ConfirmDialog,
  controlStyle,
  errorIdOf,
  FormField,
  Modal,
} from '../../../../shared/ui';
import { API_KEY_NAME_MAX, API_KEY_SCOPE_META } from '../types';
import type { ApiKeyDraft, ApiKeyScope } from '../types';
import { apiKeyDraftSchema, duplicateNameError } from '../validation';
import type { ApiKeyDraftValues } from '../validation';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
  borderStyle: 'none',
  borderWidth: 0,
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const legendStyle: CSSProperties = {
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const scopeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  minWidth: 0,
};

const scopeHintStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const errorTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-feedback-danger-text)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const DISCARD_MESSAGE = '입력한 내용이 사라집니다. 발급을 그만둘까요?';

const DEFAULT_VALUES: ApiKeyDraftValues = { name: '', scopes: ['read'] };

interface CreateApiKeyModalProps {
  /** 이름 중복 판정의 근거 — 이미 있는 키 이름들 */
  readonly existingNames: readonly string[];
  readonly busy: boolean;
  /** 발급 실패 — 모달 안 danger 배너. 재클릭이 곧 재시도다 */
  readonly error: string | null;
  readonly onSubmit: (draft: ApiKeyDraft) => void;
  readonly onClose: () => void;
}

export function CreateApiKeyModal({
  existingNames,
  busy,
  error,
  onSubmit,
  onClose,
}: CreateApiKeyModalProps) {
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<ApiKeyDraftValues>({
    resolver: zodResolver(apiKeyDraftSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const scopes = watch('scopes');
  const name = watch('name');

  const { ref: nameFieldRef, ...nameField } = register('name');

  const toggleScope = useCallback(
    (scope: ApiKeyScope, checked: boolean) => {
      const next = checked
        ? [...scopes, scope]
        : scopes.filter((item: ApiKeyScope) => item !== scope);
      // 정의 순서로 정규화 — 체크 순서가 저장값을 흔들지 않는다
      const ordered = API_KEY_SCOPE_META.map((meta) => meta.key).filter((item) =>
        next.includes(item),
      );
      setValue('scopes', ordered, { shouldDirty: true, shouldValidate: true });
    },
    [scopes, setValue],
  );

  const onValid = useCallback(
    (values: ApiKeyDraftValues) => {
      // 중복은 목록을 봐야 알 수 있어 스키마 밖에 있다 — 실패하면 그 필드에 붙인다 (EXC-07 과 같은 자리)
      const duplicate = duplicateNameError(values.name, existingNames);
      if (duplicate !== null) {
        setError('name', { type: 'duplicate', message: duplicate });
        nameRef.current?.focus();
        return;
      }
      onSubmit({ name: values.name, scopes: values.scopes });
    },
    [existingNames, onSubmit, setError],
  );

  /** 닫기 요청(딤·Esc·×·취소) — 네 경로가 이 하나를 지난다 (FEEDBACK-06) */
  const requestClose = useCallback(() => {
    if (busy) return; // 발급 중에는 닫지 않는다 — 취소는 확인 다이얼로그가 아니라 요청 abort 다
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmingDiscard(true);
  }, [busy, isDirty, onClose]);

  // 발급 중 포커스가 잠긴 버튼에 남지 않게 한다 (A11Y-04 취지)
  useEffect(() => {
    if (!busy) nameRef.current?.focus();
  }, [busy]);

  const nameInvalid = errors.name?.message !== undefined;

  return (
    <>
      <Modal
        title="API Key 발급"
        initialFocusRef={nameRef}
        onClose={requestClose}
        onSubmit={() => void handleSubmit(onValid)()}
        footer={
          <>
            <Button variant="secondary" onClick={requestClose}>
              취소
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              aria-busy={busy}
              onClick={() => void handleSubmit(onValid)()}
            >
              {busy ? '발급 중…' : '발급'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          {error !== null && <Alert tone="danger">{error}</Alert>}

          <Alert tone="info">
            발급된 키는 발급 직후 한 번만 전체를 볼 수 있습니다. 이후에는 마지막 4자리만 표시되며,
            다시 확인할 수 없습니다.
          </Alert>

          <FormField
            htmlFor="api-key-name"
            label="키 이름"
            required
            error={errors.name?.message ?? ''}
            hint="어디에 쓰는 키인지 알아볼 수 있게 적으세요. 키 값은 나중에 볼 수 없습니다."
            counter={`${String(name.length)}/${String(API_KEY_NAME_MAX)}`}
          >
            <input
              id="api-key-name"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(nameInvalid)}
              disabled={busy}
              maxLength={API_KEY_NAME_MAX}
              placeholder="예: 홈페이지 상품 연동"
              aria-invalid={nameInvalid}
              aria-describedby={nameInvalid ? errorIdOf('api-key-name') : undefined}
              {...nameField}
              ref={(node) => {
                nameFieldRef(node);
                nameRef.current = node;
              }}
            />
          </FormField>

          <fieldset style={groupStyle}>
            <legend style={legendStyle}>스코프</legend>

            {API_KEY_SCOPE_META.map((meta) => (
              <span key={meta.key} style={scopeRowStyle}>
                <Checkbox
                  id={`api-key-scope-${meta.key}`}
                  label={meta.label}
                  checked={scopes.includes(meta.key)}
                  disabled={busy}
                  onChange={(event) => {
                    toggleScope(meta.key, event.target.checked);
                  }}
                />
                <span style={scopeHintStyle}>{meta.description}</span>
              </span>
            ))}

            {errors.scopes?.message !== undefined && (
              <p role="alert" style={errorTextStyle}>
                {errors.scopes.message}
              </p>
            )}
          </fieldset>
        </div>
      </Modal>

      {confirmingDiscard && (
        <ConfirmDialog
          intent="discard"
          title="저장하지 않은 변경 사항이 있습니다"
          message={DISCARD_MESSAGE}
          busy={false}
          onConfirm={() => {
            setConfirmingDiscard(false);
            onClose();
          }}
          onCancel={() => {
            setConfirmingDiscard(false);
          }}
          suppressCancelToast
        />
      )}
    </>
  );
}
