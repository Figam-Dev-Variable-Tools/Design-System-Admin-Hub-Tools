// DirectionsPage — 오시는 길 (라우트: /company/directions)
//
// 단일 폼(주소·상세주소·좌표·교통편). 지도는 외부 임베드 없이 좌표 필드 + placeholder 로 대신한다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { controlStyle, errorIdOf, FormField, hintStyle, useToast } from '../../../shared/ui';
import { DocumentFormShell, useDocumentQuery, useSaveDocument } from '../../../shared/crud';
import { directionsKey, directionsStore } from './data-source';
import { ADDRESS_DETAIL_MAX_LENGTH, ADDRESS_MAX_LENGTH, TRANSIT_MAX_LENGTH } from './types';
import { directionsSchema } from './validation';
import type { DirectionsFormValues } from './validation';
import { cssVar } from '@tds/ui';

const UNSAVED_MESSAGE =
  '오시는 길에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: cssVar('space.4'),
};

const textareaStyle = (invalid: boolean): CSSProperties => ({
  ...controlStyle(invalid),
  minHeight: 'calc(var(--tds-space-6) * 3)',
  resize: 'vertical',
});

const mapPlaceholderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 'calc(var(--tds-space-6) * 6)',
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

const coordTextStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  color: cssVar('color.text.default'),
};

const EMPTY: DirectionsFormValues = {
  address: '',
  addressDetail: '',
  latitude: '',
  longitude: '',
  transit: '',
};

export default function DirectionsPage() {
  const toast = useToast();
  const { data, isFetching, error, refetch } = useDocumentQuery(directionsKey, directionsStore);
  const save = useSaveDocument(directionsKey, directionsStore);
  const saving = save.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<DirectionsFormValues>({
    resolver: zodResolver(directionsSchema),
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
  const disabled = saving || loading;
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const hasCoords = latitude.trim() !== '' && longitude.trim() !== '';

  const onValid = (values: DirectionsFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    save.mutate(
      { input: values, signal: controller.signal },
      {
        onSuccess: () => {
          reset(values);
          toast.success('오시는 길을 저장했습니다.');
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
      cardTitle="오시는 길"
      description="별표(*) 항목은 필수입니다. 좌표(위도·경도)는 지도 표시에 사용됩니다."
      loading={loading}
      loadFailed={error !== null}
      onRetry={() => void refetch()}
      serverError={serverError}
      saving={saving}
      dirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={(event) => void handleSubmit(onValid)(event)}
    >
      <FormField htmlFor="dir-address" label="주소" required error={errors.address?.message}>
        <input
          id="dir-address"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.address !== undefined)}
          maxLength={ADDRESS_MAX_LENGTH}
          placeholder="예: 서울특별시 예시구 가상대로 123"
          disabled={disabled}
          aria-invalid={errors.address !== undefined}
          aria-describedby={errors.address !== undefined ? errorIdOf('dir-address') : undefined}
          {...register('address')}
        />
      </FormField>

      <FormField
        htmlFor="dir-address-detail"
        label="상세주소"
        error={errors.addressDetail?.message}
        hint="건물명·층·호수 등 (선택)"
      >
        <input
          id="dir-address-detail"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.addressDetail !== undefined)}
          maxLength={ADDRESS_DETAIL_MAX_LENGTH}
          placeholder="예: 예시타워 8층"
          disabled={disabled}
          aria-invalid={errors.addressDetail !== undefined}
          aria-describedby={
            errors.addressDetail !== undefined ? errorIdOf('dir-address-detail') : undefined
          }
          {...register('addressDetail')}
        />
      </FormField>

      <div style={rowStyle}>
        <FormField
          htmlFor="dir-lat"
          label="위도"
          required
          error={errors.latitude?.message}
          hint="예: 37.5000"
        >
          <input
            id="dir-lat"
            type="text"
            inputMode="decimal"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.latitude !== undefined)}
            placeholder="37.5000"
            disabled={disabled}
            aria-invalid={errors.latitude !== undefined}
            aria-describedby={errors.latitude !== undefined ? errorIdOf('dir-lat') : undefined}
            {...register('latitude')}
          />
        </FormField>

        <FormField
          htmlFor="dir-lng"
          label="경도"
          required
          error={errors.longitude?.message}
          hint="예: 127.0300"
        >
          <input
            id="dir-lng"
            type="text"
            inputMode="decimal"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.longitude !== undefined)}
            placeholder="127.0300"
            disabled={disabled}
            aria-invalid={errors.longitude !== undefined}
            aria-describedby={errors.longitude !== undefined ? errorIdOf('dir-lng') : undefined}
            {...register('longitude')}
          />
        </FormField>
      </div>

      {/* TODO(backend): 지도 임베드 — 좌표를 지도 SDK(예: 카카오/구글 맵) 로 렌더한다.
          지금은 외부 스크립트를 로드하지 않고 좌표를 그대로 보여주는 placeholder 만 둔다. */}
      <div style={mapPlaceholderStyle} aria-hidden="true">
        <span>지도 미리보기</span>
        <span style={coordTextStyle}>
          {hasCoords
            ? `위도 ${latitude.trim()} · 경도 ${longitude.trim()}`
            : '좌표를 입력하면 위치가 표시됩니다.'}
        </span>
      </div>

      <FormField
        htmlFor="dir-transit"
        label="교통편"
        error={errors.transit?.message}
        hint="지하철·버스·주차 안내 등 (선택)"
      >
        <textarea
          id="dir-transit"
          className="tds-ui-input tds-ui-focusable"
          style={textareaStyle(errors.transit !== undefined)}
          rows={5}
          maxLength={TRANSIT_MAX_LENGTH}
          placeholder="예: 지하철 2호선 예시역 3번 출구 도보 5분"
          disabled={disabled}
          aria-invalid={errors.transit !== undefined}
          aria-describedby={errors.transit !== undefined ? errorIdOf('dir-transit') : undefined}
          {...register('transit')}
        />
      </FormField>

      <p style={hintStyle}>지도는 백엔드 연동 시 좌표 기반 지도 임베드로 대체됩니다.</p>
    </DocumentFormShell>
  );
}
