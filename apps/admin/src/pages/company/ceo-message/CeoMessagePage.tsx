// CeoMessagePage — CEO 인사말 (라우트: /company/ceo-message) · A41 소유
//
// 단일 문서 폼(제목 + 본문 textarea + 사진 URL). 단일 문서형 공통 껍데기(DocumentFormShell)를 쓴다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  controlStyle,
  errorIdOf,
  FormField,
  ImageUploadField,
  TextareaField,
  useToast,
} from '../../../shared/ui';
import { DocumentFormShell } from '../_shared/DocumentFormShell';
import { useDocumentQuery, useSaveDocument } from '../_shared/document';
import { ceoMessageKey, ceoMessageStore } from './data-source';
import { BODY_MAX_LENGTH, TITLE_MAX_LENGTH } from './types';
import { ceoMessageSchema } from './validation';
import type { CeoMessageFormValues } from './validation';

const UNSAVED_MESSAGE =
  'CEO 인사말에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const photoWrapStyle: CSSProperties = {
  maxWidth: 'calc(var(--tds-space-6) * 10)',
};

const EMPTY: CeoMessageFormValues = { title: '', body: '', photoUrl: '' };

export default function CeoMessagePage() {
  const toast = useToast();
  const { data, isFetching, error, refetch } = useDocumentQuery(ceoMessageKey, ceoMessageStore);
  const save = useSaveDocument(ceoMessageKey, ceoMessageStore);
  const saving = save.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CeoMessageFormValues>({
    resolver: zodResolver(ceoMessageSchema),
    defaultValues: EMPTY,
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(data);
  }, [data, reset]);

  const loading = isFetching && data === undefined;
  const body = watch('body');
  const photoUrl = watch('photoUrl');
  const disabled = saving || loading;

  const onValid = (values: CeoMessageFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    save.mutate(
      { input: values, signal: controller.signal },
      {
        onSuccess: () => {
          reset(values);
          toast.success('CEO 인사말을 저장했습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <DocumentFormShell
      cardTitle="CEO 인사말"
      description="별표(*) 항목은 필수입니다. 저장하면 사용자 화면의 인사말 페이지에 반영됩니다."
      loading={loading}
      loadFailed={error !== null}
      onRetry={() => void refetch()}
      serverError={serverError}
      saving={saving}
      dirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={(event) => void handleSubmit(onValid)(event)}
    >
      <FormField htmlFor="ceo-title" label="제목" required error={errors.title?.message}>
        <input
          id="ceo-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="예: 고객과 함께 성장하는 기업이 되겠습니다"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('ceo-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <TextareaField
        label="본문"
        required
        value={body}
        onChange={(value) => setValue('body', value, { shouldValidate: false, shouldDirty: true })}
        maxLength={BODY_MAX_LENGTH}
        disabled={disabled}
        error={errors.body?.message}
        placeholder="인사말 본문을 입력하세요."
        rows={10}
      />

      <div style={photoWrapStyle}>
        <ImageUploadField
          label="사진"
          value={photoUrl}
          onChange={(value) =>
            setValue('photoUrl', value, { shouldValidate: false, shouldDirty: true })
          }
          disabled={disabled}
          error={errors.photoUrl?.message}
          hint="대표/CEO 사진 URL (선택). 이미지를 끌어다 놓거나 클릭해 업로드합니다."
        />
      </div>
    </DocumentFormShell>
  );
}
