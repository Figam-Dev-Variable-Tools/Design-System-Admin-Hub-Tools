// 로고 등록/수정 모달
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 Modal 을 재사용한다. 하나의 모달이 등록과 수정을
// 겸한다(editing 유무로 갈린다). 정렬 순서는 목록의 드래그로 관리하므로 여기서 받지 않는다.
//
// [EXC-03 · 권한] 이 팝업은 **부모의 판정을 물려받지 않는다.** 부모(LogoListPage)는 권한이 없으면
// 여는 버튼(추가·연필)을 만들지 않지만, 그것은 '열리지 않는다' 는 보장일 뿐 '저장되지 않는다' 는
// 보장이 아니다 — 열려 있는 동안 다른 탭에서 강등되면 부모의 판정은 이미 지나간 과거다.
// 그래서 같은 술어를 여기서 다시 읽는다: 등록이면 create, 수정이면 update (useRouteCanSubmitForm).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { useRouteCanSubmitForm, WRITE_DENIED } from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  ImageUploadField,
  Modal,
  useModalDirtyGuard,
} from '../../../shared/ui';
import type { LogoAdapter } from './adapter';
import { useCreateLogo, useUpdateLogo } from './queries';
import { NAME_MAX_LENGTH } from './types';
import type { LogoItem } from './types';
import { logoSchema } from './validation';
import type { LogoFormValues } from './validation';
import { cssVar } from '@tds/ui';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

interface LogoFormModalProps {
  readonly resource: string;
  readonly adapter: LogoAdapter;
  /** 화면 도메인 명칭 — '파트너사'/'고객사' */
  readonly entityLabel: string;
  /** 수정 대상 — null 이면 등록 */
  readonly editing: LogoItem | null;
  readonly onClose: () => void;
  readonly onSaved: (name: string, isEdit: boolean) => void;
}

export function LogoFormModal({
  resource,
  adapter,
  entityLabel,
  editing,
  onClose,
  onSaved,
}: LogoFormModalProps) {
  const isEdit = editing !== null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<LogoFormValues>({
    resolver: zodResolver(logoSchema),
    defaultValues: {
      name: editing?.name ?? '',
      logoUrl: editing?.logoUrl ?? '',
      linkUrl: editing?.linkUrl ?? '',
    },
  });

  const create = useCreateLogo(resource, adapter);
  const update = useUpdateLogo(resource, adapter);
  const saving = create.isPending || update.isPending;

  /**
   * [FEEDBACK-06] 입력이 있는 채로 닫으려 하면 확인을 세운다. requestClose 를 Modal.onClose 와
   * 취소 버튼에 **둘 다** 넘겨 4경로(Esc·딤 클릭·×·취소)를 한 번에 덮는다.
   */
  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  const [serverError, setServerError] = useState<string | null>(null);
  /** 부모가 버튼을 없앨 때 읽은 것과 **같은 술어**다 (같은 라우트 · 등록이면 create, 수정이면 update) */
  const canSubmit = useRouteCanSubmitForm(isEdit);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const logoUrl = watch('logoUrl');

  const onValid = (values: LogoFormValues) => {
    if (!canSubmit) {
      setServerError(isEdit ? WRITE_DENIED.update : WRITE_DENIED.create);
      return;
    }
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    const input = { name: values.name, logoUrl: values.logoUrl, linkUrl: values.linkUrl };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && editing !== null) {
      update.mutate(
        { id: editing.id, input, signal: controller.signal },
        {
          onSuccess: () => onSaved(values.name.trim(), true),
          onError,
        },
      );
      return;
    }

    create.mutate(
      { input, signal: controller.signal },
      {
        onSuccess: () => onSaved(values.name.trim(), false),
        onError,
      },
    );
  };

  const nameField = register('name');
  const nameInvalid = errors.name !== undefined;

  return (
    <>
      <Modal
        title={isEdit ? `${entityLabel} 수정` : `${entityLabel} 추가`}
        onClose={requestClose}
        onSubmit={() => {
          setServerError(null);
          clearErrors();
          void handleSubmit(onValid, () => nameRef.current?.focus())();
        }}
        initialFocusRef={nameRef}
        footer={
          <>
            <Button variant="secondary" size="md" disabled={saving} onClick={requestClose}>
              취소
            </Button>
            {canSubmit && (
              <Button variant="primary" size="md" type="submit" disabled={saving}>
                {saving ? '저장 중…' : isEdit ? '저장' : '추가'}
              </Button>
            )}
          </>
        }
      >
        <div style={bodyStyle}>
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <FormField htmlFor="logo-name" label="이름" required error={errors.name?.message}>
            <input
              id="logo-name"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(nameInvalid)}
              maxLength={NAME_MAX_LENGTH}
              placeholder={`예: ${entityLabel} 이름`}
              disabled={saving}
              aria-invalid={nameInvalid}
              aria-describedby={nameInvalid ? errorIdOf('logo-name') : undefined}
              name={nameField.name}
              ref={(element) => {
                nameField.ref(element);
                nameRef.current = element;
              }}
              onChange={nameField.onChange}
              onBlur={nameField.onBlur}
            />
          </FormField>

          <ImageUploadField
            label="로고 이미지"
            required
            value={logoUrl}
            onChange={(value) =>
              setValue('logoUrl', value, { shouldValidate: false, shouldDirty: true })
            }
            disabled={saving}
            error={errors.logoUrl?.message}
            hint="이미지를 끌어다 놓거나 클릭해 업로드해요."
          />

          <FormField
            htmlFor="logo-link"
            label="링크 URL"
            error={errors.linkUrl?.message}
            hint="클릭 시 이동할 주소 (선택)"
          >
            <input
              id="logo-link"
              type="url"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.linkUrl !== undefined)}
              placeholder="https://example.com"
              disabled={saving}
              aria-invalid={errors.linkUrl !== undefined}
              aria-describedby={errors.linkUrl !== undefined ? errorIdOf('logo-link') : undefined}
              {...register('linkUrl')}
            />
          </FormField>
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
