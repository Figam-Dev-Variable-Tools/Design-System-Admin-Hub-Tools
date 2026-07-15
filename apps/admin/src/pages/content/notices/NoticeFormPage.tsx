// NoticeFormPage — 공지 등록/수정 (라우트: /content/notices/new · /content/notices/:id/edit) · A41 소유
//
// 하나의 폼이 등록과 수정을 겸한다 — :id 가 있으면 수정(기존 값 로드), 없으면 등록.
// (회원 상세를 회원/운영자가 재사용하는 것과 같은 결: 컨텍스트만 다르고 화면은 하나다.)
//
// [폼 = RHF + zod/mini] 검증 규칙의 정본은 ./validation.ts 의 zod 스키마다.
//   제어형 공통 컨트롤(TextareaField)은 watch + setValue 로 RHF 에 물린다.
// [본문] 리치 텍스트는 도입하지 않는다 — 제어 textarea(글자수 카운터)로 받는다(TextareaField 상단 TODO).
// [저장 결과] 성공/실패는 토스트. 필드 오류는 인라인. 저장하지 않은 이탈은 discard 가드가 막는다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  FormField,
  SelectField,
  TextareaField,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { submitButtonLabel } from '../../../shared/crud';
import { useCreateNotice, useNoticeQuery, useUpdateNotice } from './queries';
import { BODY_MAX_LENGTH, CATEGORY_OPTIONS, STATUS_OPTIONS, TITLE_MAX_LENGTH } from './types';
import { noticeSchema } from './validation';
import type { NoticeFormValues } from './validation';

const UNSAVED_MESSAGE =
  '공지에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  fontFamily: 'var(--tds-typography-title-lg-font-family)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-typography-title-lg-font-weight)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
};

const descriptionStyle: CSSProperties = {
  marginTop: 'var(--tds-space-1)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 8), 1fr))',
  gap: 'var(--tds-space-4)',
};

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

const checkStyle: CSSProperties = {
  width: 'var(--tds-space-4)',
  height: 'var(--tds-space-4)',
  accentColor: 'var(--tds-color-action-primary-default)',
  cursor: 'pointer',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const EMPTY: NoticeFormValues = {
  title: '',
  category: 'notice',
  status: 'draft',
  pinned: false,
  publishedAt: '',
  body: '',
};

export default function NoticeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: EMPTY,
  });

  const createNotice = useCreateNotice();
  const updateNotice = useUpdateNotice();
  const saving = createNotice.isPending || updateNotice.isPending;

  // 수정 모드 — 기존 공지를 불러와 폼을 채운다
  const detailQuery = useNoticeQuery(id ?? '');
  const loadingDetail = isEdit && detailQuery.isFetching && detailQuery.data === undefined;
  const disabled = saving || loadingDetail;
  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const loaded = detailQuery.data;
  useEffect(() => {
    if (loaded === undefined) return;
    reset({
      title: loaded.title,
      category: loaded.category,
      status: loaded.status,
      pinned: loaded.pinned,
      publishedAt: loaded.publishedAtIso.slice(0, 10),
      body: loaded.body,
    });
  }, [loaded, reset]);

  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const body = watch('body');
  const status = watch('status');
  const pinned = watch('pinned');

  const onValid = (values: NoticeFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && id !== undefined) {
      updateNotice.mutate(
        { id, input: values, signal: controller.signal },
        {
          onSuccess: () => {
            toast.success('공지를 저장했습니다.');
            navigate(`/content/notices/${id}`, { replace: true });
          },
          onError,
        },
      );
      return;
    }

    createNotice.mutate(
      { input: values, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success('공지를 등록했습니다.');
          navigate('/content/notices', { replace: true });
        },
        onError,
      },
    );
  };

  const scheduled = status === 'scheduled';
  const publishedAtField = useMemo(() => register('publishedAt'), [register]);

  if (isEdit && detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>공지를 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate('/content/notices')}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={titleStyle}>{isEdit ? '공지 수정' : '공지 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 상태를 '예약'으로 두면 게시일 이후 자동으로 게시됩니다.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(onValid)(event)} noValidate>
        <Card>
          <CardTitle>공지 정보</CardTitle>

          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <div style={bodyStyle}>
            <FormField htmlFor="notice-title" label="제목" required error={errors.title?.message}>
              <input
                id="notice-title"
                type="text"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(errors.title !== undefined)}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="예: 서비스 이용 안내"
                disabled={disabled}
                aria-invalid={errors.title !== undefined}
                aria-describedby={
                  errors.title !== undefined ? errorIdOf('notice-title') : undefined
                }
                {...register('title')}
              />
            </FormField>

            <div style={rowStyle}>
              <FormField htmlFor="notice-category" label="분류" required>
                <SelectField id="notice-category" disabled={disabled} {...register('category')}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField htmlFor="notice-status" label="상태" required>
                <SelectField id="notice-status" disabled={disabled} {...register('status')}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField
                htmlFor="notice-published-at"
                label="게시일"
                required={scheduled}
                error={errors.publishedAt?.message}
                hint={scheduled ? '예약 게시할 날짜' : '예약 상태에서만 사용됩니다.'}
              >
                <input
                  id="notice-published-at"
                  type="date"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.publishedAt !== undefined)}
                  disabled={disabled || !scheduled}
                  aria-invalid={errors.publishedAt !== undefined}
                  {...publishedAtField}
                />
              </FormField>
            </div>

            <div style={checkboxRowStyle}>
              <input
                id="notice-pinned"
                type="checkbox"
                className="tds-ui-focusable"
                style={checkStyle}
                checked={pinned}
                disabled={disabled}
                onChange={(event) =>
                  setValue('pinned', event.target.checked, { shouldDirty: true })
                }
              />
              <label htmlFor="notice-pinned" style={fieldLabelStyle}>
                목록 상단에 고정
              </label>
            </div>

            <TextareaField
              label="본문"
              required
              value={body}
              onChange={(value) =>
                setValue('body', value, { shouldValidate: false, shouldDirty: true })
              }
              maxLength={BODY_MAX_LENGTH}
              disabled={disabled}
              error={errors.body?.message}
              placeholder="공지 본문을 입력하세요."
            />
          </div>

          <div style={actionsStyle}>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => navigate(-1)}
            >
              취소
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={disabled}>
              {submitButtonLabel(saving, isEdit)}
            </Button>
          </div>
        </Card>
      </form>

      {unsavedDialog}
    </div>
  );
}
