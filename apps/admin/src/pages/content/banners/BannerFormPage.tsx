// BannerFormPage — 배너 등록/수정 (라우트: /content/banners/new · /content/banners/:id/edit) · A41 소유
//
// [별도 상세 페이지 — 오너 피드백 ⑥] 목록+인라인 폼을 없애고 별도 폼 라우트로 옮겼다(:id 유무로 갈린다).
// [오른쪽 실시간 미리보기 — 오너 피드백 ⑤] 왼쪽 입력 / 오른쪽 미리보기 2단. 좁으면 세로로 쌓인다.
import { useEffect, useRef, useState } from 'react';
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
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  FormField,
  ImageUrlField,
  SelectField,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { BannerPreview } from './components/BannerPreview';
import { useBannerQuery, useCreateBanner, useNextBannerOrder, useUpdateBanner } from './queries';
import { PLACEMENT_LABEL, PLACEMENT_OPTIONS, TITLE_MAX_LENGTH } from './types';
import { bannerSchema } from './validation';
import type { BannerFormValues } from './validation';

const UNSAVED_MESSAGE =
  '배너에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))',
  gap: 'var(--tds-space-5)',
  alignItems: 'start',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 6), 1fr))',
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

const EMPTY: BannerFormValues = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  placement: 'main',
  startAt: '',
  endAt: '',
  enabled: true,
  order: '1',
};

export default function BannerFormPage() {
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
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: EMPTY,
  });

  const create = useCreateBanner();
  const update = useUpdateBanner();
  const saving = create.isPending || update.isPending;

  const detailQuery = useBannerQuery(id ?? '');
  const loadingDetail = isEdit && detailQuery.isFetching && detailQuery.data === undefined;
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
      placement: loaded.placement,
      startAt: loaded.startAt,
      endAt: loaded.endAt,
      enabled: loaded.enabled,
      order: String(loaded.order),
    });
  }, [loaded, reset]);

  // 정렬 순서 자동 채움 — 새 등록이면 현재 최대 + 1 을 기본값으로(사용자는 수정 가능).
  const nextOrderQuery = useNextBannerOrder(!isEdit);
  const orderPrefilledRef = useRef(false);
  useEffect(() => {
    if (isEdit || orderPrefilledRef.current || nextOrderQuery.data === undefined) return;
    orderPrefilledRef.current = true;
    setValue('order', String(nextOrderQuery.data));
  }, [isEdit, nextOrderQuery.data, setValue]);

  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const title = watch('title');
  const imageUrl = watch('imageUrl');
  const linkUrl = watch('linkUrl');
  const placement = watch('placement');
  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const enabled = watch('enabled');

  const onValid = (values: BannerFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    const input = {
      title: values.title,
      imageUrl: values.imageUrl,
      linkUrl: values.linkUrl,
      placement: values.placement,
      startAt: values.startAt,
      endAt: values.endAt,
      enabled: values.enabled,
      order: Number(values.order.trim()),
    };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && id !== undefined) {
      update.mutate(
        { id, input, signal: controller.signal },
        {
          onSuccess: () => {
            toast.success('배너를 저장했습니다.');
            navigate('/content/banners', { replace: true });
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
          toast.success('배너를 등록했습니다.');
          navigate('/content/banners', { replace: true });
        },
        onError,
      },
    );
  };

  const periodError = errors.startAt?.message ?? errors.endAt?.message;

  if (isEdit && detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>배너를 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate('/content/banners')}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={titleStyle}>{isEdit ? '배너 수정' : '배너 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 오른쪽 미리보기로 사용자에게 보일 모습을 확인하세요.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(onValid)(event)} noValidate style={pageStyle}>
        <div style={layoutStyle}>
          <Card>
            <CardTitle>배너 정보</CardTitle>

            {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

            <div style={bodyStyle}>
              <FormField htmlFor="banner-title" label="제목" required error={errors.title?.message}>
                <input
                  id="banner-title"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.title !== undefined)}
                  maxLength={TITLE_MAX_LENGTH}
                  placeholder="예: 봄 시즌 기획전"
                  disabled={saving || loadingDetail}
                  aria-invalid={errors.title !== undefined}
                  aria-describedby={
                    errors.title !== undefined ? errorIdOf('banner-title') : undefined
                  }
                  {...register('title')}
                />
              </FormField>

              <ImageUrlField
                label="이미지 URL"
                required
                value={imageUrl}
                onChange={(value) =>
                  setValue('imageUrl', value, { shouldValidate: false, shouldDirty: true })
                }
                disabled={saving || loadingDetail}
                error={errors.imageUrl?.message}
                hint="업로드 대신 호스팅된 이미지 URL 을 입력합니다."
              />

              <FormField
                htmlFor="banner-link"
                label="링크 URL"
                error={errors.linkUrl?.message}
                hint="클릭 시 이동할 주소 (선택)"
              >
                <input
                  id="banner-link"
                  type="url"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.linkUrl !== undefined)}
                  placeholder="https://example.com/promo"
                  disabled={saving || loadingDetail}
                  aria-invalid={errors.linkUrl !== undefined}
                  {...register('linkUrl')}
                />
              </FormField>

              <div style={rowStyle}>
                <FormField htmlFor="banner-placement" label="노출 위치" required>
                  <SelectField
                    id="banner-placement"
                    disabled={saving || loadingDetail}
                    {...register('placement')}
                  >
                    {PLACEMENT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                <FormField
                  htmlFor="banner-order"
                  label="정렬 순서"
                  required
                  error={errors.order?.message}
                  hint="작을수록 앞에 노출됩니다."
                >
                  <input
                    id="banner-order"
                    type="number"
                    min={0}
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.order !== undefined)}
                    disabled={saving || loadingDetail}
                    aria-invalid={errors.order !== undefined}
                    {...register('order')}
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
                disabled={saving || loadingDetail}
                error={periodError}
              />

              <div style={checkboxRowStyle}>
                <input
                  id="banner-enabled"
                  type="checkbox"
                  className="tds-ui-focusable"
                  style={checkStyle}
                  checked={enabled}
                  disabled={saving || loadingDetail}
                  onChange={(event) =>
                    setValue('enabled', event.target.checked, { shouldDirty: true })
                  }
                />
                <label htmlFor="banner-enabled" style={fieldLabelStyle}>
                  노출 ON
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <BannerPreview
              title={title}
              imageUrl={imageUrl}
              linkUrl={linkUrl}
              placementLabel={PLACEMENT_LABEL[placement]}
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
            onClick={() => navigate('/content/banners')}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={saving || loadingDetail}>
            {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>

      {unsavedDialog}
    </div>
  );
}
