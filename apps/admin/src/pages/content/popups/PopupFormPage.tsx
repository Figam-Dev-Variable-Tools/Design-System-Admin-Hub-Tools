// PopupFormPage — 팝업 등록/수정 (라우트: /content/popups/new · /content/popups/:id/edit)
//
// [별도 상세 페이지 — 오너 피드백 ⑥] 목록+인라인 폼을 없애고 공지/FAQ 처럼 별도 폼 라우트로 옮겼다.
//   하나의 폼이 등록과 수정을 겸한다(:id 유무로 갈린다). 폼 = RHF + zod/mini.
// [오른쪽 실시간 미리보기 — 오너 피드백 ⑤] 왼쪽 입력 / 오른쪽 미리보기 2단. 좁으면 세로로 쌓인다.
// [저장 결과] 성공/실패는 토스트. 필드 오류는 인라인. 저장하지 않은 이탈은 discard 가드가 막는다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { ForbiddenScreen } from '../../../shared/errors/ErrorScreens';
import { useRouteCanSubmitForm, WRITE_DENIED } from '../../../shared/permissions/RequirePermission';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  controlStyle,
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  FormField,
  formRowStyle,
  ImageUploadField,
  pageTitleStyle,
  SelectField,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { PopupPreview } from './components/PopupPreview';
import { useCreatePopup, useNextPopupPriority, usePopupQuery, useUpdatePopup } from './queries';
import { POSITION_LABEL, POSITION_OPTIONS, TITLE_MAX_LENGTH } from './types';
import { popupSchema } from './validation';
import type { PopupFormValues } from './validation';
import { cssVar } from '@tds/ui';

const UNSAVED_MESSAGE =
  '팝업에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

// 2단 레이아웃 — 넓으면 좌(입력)/우(미리보기), 좁으면 세로 스택(auto-fit)
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const checkStyle: CSSProperties = {
  width: cssVar('space.4'),
  height: cssVar('space.4'),
  accentColor: cssVar('color.action.primary.default'),
  cursor: 'pointer',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const EMPTY: PopupFormValues = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  position: 'home',
  startAt: '',
  endAt: '',
  enabled: true,
  priority: '1',
};

export default function PopupFormPage() {
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
  } = useForm<PopupFormValues>({
    resolver: zodResolver(popupSchema),
    defaultValues: EMPTY,
  });

  const create = useCreatePopup();
  const update = useUpdatePopup();
  const saving = create.isPending || update.isPending;

  const detailQuery = usePopupQuery(id ?? '');
  /* [EXC-03] 이 폼은 FormPageShell 을 쓰지 않아 껍데기의 403 을 받지 못했다 — RequirePermission 은
     read 만 보므로 등록 라우트가 조회 권한만으로 열리고 제출까지 됐다. 판정은 폼 껍데기·폼
     컨트롤러와 같은 한 벌이다: 등록이면 create, 수정이면 update. */
  const canSubmit = useRouteCanSubmitForm(isEdit);
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
      imageUrl: loaded.imageUrl,
      linkUrl: loaded.linkUrl,
      position: loaded.position,
      startAt: loaded.startAt,
      endAt: loaded.endAt,
      enabled: loaded.enabled,
      priority: String(loaded.priority),
    });
  }, [loaded, reset]);

  // 우선순위 자동 채움 — 새 등록이면 현재 최대 + 1 을 기본값으로(사용자는 수정 가능).
  const nextPriorityQuery = useNextPopupPriority(!isEdit);
  const priorityPrefilledRef = useRef(false);
  useEffect(() => {
    if (isEdit || priorityPrefilledRef.current || nextPriorityQuery.data === undefined) return;
    priorityPrefilledRef.current = true;
    setValue('priority', String(nextPriorityQuery.data));
  }, [isEdit, nextPriorityQuery.data, setValue]);

  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const title = watch('title');
  const imageUrl = watch('imageUrl');
  const linkUrl = watch('linkUrl');
  const position = watch('position');
  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const enabled = watch('enabled');

  const onValid = (values: PopupFormValues) => {
    // 화면을 403 으로 덮은 술어가 저장 경로도 막는다
    if (!canSubmit) {
      setServerError(isEdit ? WRITE_DENIED.update : WRITE_DENIED.create);
      return;
    }
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    const input = {
      title: values.title,
      imageUrl: values.imageUrl,
      linkUrl: values.linkUrl,
      position: values.position,
      startAt: values.startAt,
      endAt: values.endAt,
      enabled: values.enabled,
      priority: Number(values.priority.trim()),
    };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && id !== undefined) {
      update.mutate(
        { id, input, signal: controller.signal },
        {
          onSuccess: () => {
            toast.success('팝업을 저장했어요.');
            navigate('/content/popups', { replace: true });
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
          toast.success('팝업을 등록했어요.');
          navigate('/content/popups', { replace: true });
        },
        onError,
      },
    );
  };

  const periodError = errors.startAt?.message ?? errors.endAt?.message;

  /* 쓸 수 없는 폼은 열지 않는다 — 조회 실패 분기보다 앞선다 (FormPageShell 과 같은 순서) */
  if (!canSubmit) return <ForbiddenScreen />;

  if (isEdit && detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>팝업을 불러오지 못했어요. </span>
          <Button variant="secondary" onClick={() => navigate('/content/popups')}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '팝업 수정' : '팝업 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 오른쪽 미리보기로 사용자에게 보일 모습을 확인하세요.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(onValid)(event)} noValidate style={pageStyle}>
        <div style={layoutStyle}>
          <Card>
            <CardTitle>팝업 정보</CardTitle>

            {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

            <div style={bodyStyle}>
              <FormField htmlFor="popup-title" label="제목" required error={errors.title?.message}>
                <input
                  id="popup-title"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.title !== undefined)}
                  maxLength={TITLE_MAX_LENGTH}
                  placeholder="예: 신규 가입 혜택"
                  disabled={disabled}
                  aria-invalid={errors.title !== undefined}
                  aria-describedby={
                    errors.title !== undefined ? errorIdOf('popup-title') : undefined
                  }
                  {...register('title')}
                />
              </FormField>

              <ImageUploadField
                label="이미지"
                required
                value={imageUrl}
                onChange={(value) =>
                  setValue('imageUrl', value, { shouldValidate: false, shouldDirty: true })
                }
                disabled={disabled}
                error={errors.imageUrl?.message}
                hint="이미지를 끌어다 놓거나 클릭해 업로드해요."
              />

              <FormField
                htmlFor="popup-link"
                label="링크 URL"
                error={errors.linkUrl?.message}
                hint="클릭 시 이동할 주소 (선택)"
              >
                <input
                  id="popup-link"
                  type="url"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.linkUrl !== undefined)}
                  placeholder="https://example.com/event"
                  disabled={disabled}
                  aria-invalid={errors.linkUrl !== undefined}
                  aria-describedby={
                    errors.linkUrl !== undefined ? errorIdOf('popup-link') : undefined
                  }
                  {...register('linkUrl')}
                />
              </FormField>

              <div style={formRowStyle}>
                <FormField htmlFor="popup-position" label="노출 위치" required>
                  <SelectField id="popup-position" disabled={disabled} {...register('position')}>
                    {POSITION_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                <FormField
                  htmlFor="popup-priority"
                  label="우선순위"
                  required
                  error={errors.priority?.message}
                  hint="작을수록 먼저 노출돼요."
                >
                  <input
                    id="popup-priority"
                    type="number"
                    min={0}
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.priority !== undefined)}
                    disabled={disabled}
                    aria-invalid={errors.priority !== undefined}
                    aria-describedby={
                      errors.priority !== undefined ? errorIdOf('popup-priority') : undefined
                    }
                    {...register('priority')}
                  />
                </FormField>
              </div>

              <DateRangeField
                label="노출 기간"
                required
                startValue={startAt}
                endValue={endAt}
                onStartChange={(value) => setValue('startAt', value, { shouldDirty: true })}
                onEndChange={(value) => setValue('endAt', value, { shouldDirty: true })}
                disabled={disabled}
                error={periodError}
              />

              <div style={checkboxRowStyle}>
                <input
                  id="popup-enabled"
                  type="checkbox"
                  className="tds-ui-focusable"
                  style={checkStyle}
                  checked={enabled}
                  disabled={disabled}
                  onChange={(event) =>
                    setValue('enabled', event.target.checked, { shouldDirty: true })
                  }
                />
                <label htmlFor="popup-enabled" style={fieldLabelStyle}>
                  노출 ON
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <PopupPreview
              title={title}
              imageUrl={imageUrl}
              linkUrl={linkUrl}
              positionLabel={POSITION_LABEL[position]}
              enabled={enabled}
            />
          </Card>
        </div>

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={saving}
            onClick={() => navigate('/content/popups')}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>

      {unsavedDialog}
    </div>
  );
}
