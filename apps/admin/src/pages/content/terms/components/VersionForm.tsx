// 약관 버전 등록/수정 폼
//
// 목록과 같은 화면에 뜨는 인라인 폼. 폼 = RHF + zod/mini. 본문은 제어 textarea(TextareaField).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../../shared/async';
import { zodResolver } from '../../../../shared/form/zodResolver';
import {
  useRouteCanSubmitForm,
  WRITE_DENIED,
} from '../../../../shared/permissions/RequirePermission';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  FormField,
  formRowStyle,
  SelectField,
  TextareaField,
  useToast,
  useUnsavedChangesDialog,
} from '../../../../shared/ui';
import { useCreateTermsVersion, useUpdateTermsVersion } from '../queries';
import { BODY_MAX_LENGTH, STATUS_OPTIONS, VERSION_MAX_LENGTH } from '../types';
import type { TermsVersion } from '../types';
import { termsVersionSchema } from '../validation';
import type { TermsVersionFormValues } from '../validation';
import { cssVar } from '@tds/ui';

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

function toValues(version: TermsVersion | null): TermsVersionFormValues {
  if (version === null) {
    return { version: '', effectiveDate: '', status: 'scheduled', body: '' };
  }
  return {
    version: version.version,
    effectiveDate: version.effectiveDate,
    status: version.status,
    body: version.body,
  };
}

interface VersionFormProps {
  readonly typeId: string;
  readonly editing: TermsVersion | null;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

export function VersionForm({ typeId, editing, onSaved, onCancel }: VersionFormProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<TermsVersionFormValues>({
    resolver: zodResolver(termsVersionSchema),
    defaultValues: toValues(editing),
  });

  const create = useCreateTermsVersion();
  const update = useUpdateTermsVersion();
  const saving = create.isPending || update.isPending;

  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  /**
   * [EXC-03] 이 폼은 부모(폼 페이지)의 판정을 물려받지 않는다.
   *
   * 부모는 권한이 없으면 화면을 403 으로 덮지만, 그것은 '열리지 않는다' 는 보장일 뿐
   * '저장되지 않는다' 는 보장이 아니다 — 렌더 이후 다른 탭에서 강등되면 부모의 판정은 이미
   * 지나간 과거다. 부모가 읽은 것과 **같은 술어**(같은 라우트 · 등록이면 create, 수정이면
   * update)를 여기서 다시 읽어 제출 경로에서 거절한다.
   */
  const isEdit = editing !== null;
  const canSubmit = useRouteCanSubmitForm(isEdit);

  useEffect(() => {
    reset(toValues(editing));
  }, [editing, reset]);

  // 반쯤 쓴 약관 전문이 링크·뒤로가기·새로고침 한 번에 사라지지 않게 — 다른 폼 페이지와 같은 가드
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, {
    message: '약관 본문에 저장하지 않은 변경이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.',
  });

  const body = watch('body');

  const onValid = (values: TermsVersionFormValues) => {
    if (!canSubmit) {
      setServerError(isEdit ? WRITE_DENIED.update : WRITE_DENIED.create);
      return;
    }
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    const input = { typeId, ...values };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    };

    if (editing !== null) {
      update.mutate(
        { id: editing.id, input, signal: controller.signal },
        {
          onSuccess: () => {
            toast.success('약관 버전을 저장했어요.');
            onSaved();
          },
          onError,
        },
      );
      return;
    }

    create.mutate(
      { input, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success('약관 버전을 등록했어요.');
          onSaved();
        },
        onError,
      },
    );
  };

  return (
    <Card>
      <CardTitle>{editing !== null ? '약관 버전 수정' : '새 약관 버전 등록'}</CardTitle>

      <form onSubmit={(event) => void handleSubmit(onValid)(event)} noValidate style={formStyle}>
        {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

        <div style={bodyStyle}>
          <div style={formRowStyle}>
            <FormField
              htmlFor="terms-version"
              label="버전"
              required
              error={errors.version?.message}
            >
              <input
                id="terms-version"
                type="text"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(errors.version !== undefined)}
                maxLength={VERSION_MAX_LENGTH}
                placeholder="예: v1.2"
                disabled={saving}
                aria-invalid={errors.version !== undefined}
                aria-describedby={
                  errors.version !== undefined ? errorIdOf('terms-version') : undefined
                }
                {...register('version')}
              />
            </FormField>

            <FormField
              htmlFor="terms-effective"
              label="시행일"
              required
              error={errors.effectiveDate?.message}
            >
              <input
                id="terms-effective"
                type="date"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(errors.effectiveDate !== undefined)}
                disabled={saving}
                aria-invalid={errors.effectiveDate !== undefined}
                aria-describedby={
                  errors.effectiveDate !== undefined ? errorIdOf('terms-effective') : undefined
                }
                {...register('effectiveDate')}
              />
            </FormField>

            <FormField htmlFor="terms-status" label="상태" required>
              <SelectField id="terms-status" disabled={saving} {...register('status')}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FormField>
          </div>

          <TextareaField
            label="본문"
            required
            value={body}
            onChange={(value) =>
              setValue('body', value, { shouldValidate: false, shouldDirty: true })
            }
            maxLength={BODY_MAX_LENGTH}
            disabled={saving}
            error={errors.body?.message}
            rows={12}
            placeholder="약관 조문을 입력하세요."
          />
        </div>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? '저장 중…' : editing !== null ? '저장' : '등록'}
          </Button>
        </div>
      </form>
      {unsavedDialog}
    </Card>
  );
}
