// EventFormPage — 이벤트 등록/수정 (라우트: /marketing/events/new · /:id/edit)
//
// 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 재사용한다. 필드: 이벤트명·기간·상태·대상·혜택
// (쿠폰/적립)·배너 연동·설명. 검증 정본은 ./validation.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  controlStyle,
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  formRowStyle,
  hintIdOf,
  SelectField,
  TextareaField,
  ToggleSwitch,
} from '../../../shared/ui';
import { useCrudForm, FormPageShell } from '../../../shared/crud';
import { eventAdapter } from './data-source';
import { eventSchema } from './validation';
import type { EventFormValues } from './validation';
import { EVENT_DESC_MAX, EVENT_TITLE_MAX } from './types';
import type { MarketingEvent, MarketingEventInput } from './types';
import {
  BENEFIT_TYPE_OPTIONS,
  benefitNeedsDetail,
  CAMPAIGN_PHASE_OPTIONS,
} from '../_shared/campaign';
import {
  bannerCatalog,
  bannerEditPath,
  findCatalogBanner,
} from '../../../shared/domain/banner-catalog';
import { cssVar } from '@tds/ui';

const RESOURCE = 'marketing-events';
const ENTITY_LABEL = '이벤트';
const LIST_PATH = '/marketing/events';
const UNSAVED_MESSAGE =
  '이벤트에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

/** 선택한 배너로 건너뛰는 줄 — 선택 바로 아래에 붙는다 */
const bannerLinkStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const EMPTY: EventFormValues = {
  title: '',
  startAt: '',
  endAt: '',
  phase: 'upcoming',
  target: '',
  benefitType: 'none',
  benefitDetail: '',
  bannerLinked: false,
  bannerId: '',
  description: '',
};

/**
 * 저장 시점의 배너명을 카탈로그에서 뜬다 — 목록이 조인 없이 그릴 표시용 사본이다(types.ts 주석).
 * 카탈로그를 모르거나(미배선) 사라진 id 면 빈 문자열 — 이름을 지어내지 않는다.
 */
function bannerTitleOf(bannerId: string): string {
  if (bannerId === '') return '';
  const catalog = bannerCatalog();
  if (catalog === null) return '';
  const banner = findCatalogBanner(catalog, bannerId);
  return banner === null ? '' : banner.title;
}

function toInput(values: EventFormValues): MarketingEventInput {
  const withBenefit = benefitNeedsDetail(values.benefitType);
  // 토글을 끄면 선택값을 버린다 — '연동 안 함 + 배너 id 남음' 이라는 어긋난 상태를 만들지 않는다
  const bannerId = values.bannerLinked ? values.bannerId : '';
  return {
    title: values.title.trim(),
    startAt: values.startAt,
    endAt: values.endAt,
    phase: values.phase,
    target: values.target.trim(),
    benefitType: values.benefitType,
    benefitDetail: withBenefit ? values.benefitDetail.trim() : '',
    bannerId,
    bannerTitle: bannerTitleOf(bannerId),
    description: values.description.trim(),
  };
}

function toValues(event: MarketingEvent): EventFormValues {
  return {
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    phase: event.phase,
    target: event.target,
    benefitType: event.benefitType,
    benefitDetail: event.benefitDetail,
    // 연동 여부는 저장하지 않는다 — id 가 있으면 연동된 것이다(types.ts 의 hasLinkedBanner)
    bannerLinked: event.bannerId !== '',
    bannerId: event.bannerId,
    description: event.description,
  };
}

export default function EventFormPage() {
  const {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
  } = useCrudForm<MarketingEvent, MarketingEventInput, EventFormValues>({
    resource: RESOURCE,
    adapter: eventAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: eventSchema,
    empty: EMPTY,
    toInput,
    toValues,
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;

  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const benefitType = watch('benefitType');
  const bannerLinked = watch('bannerLinked');
  const bannerId = watch('bannerId');
  // 선택 목록의 정본은 콘텐츠 관리 배너다 — 이 화면은 조회기가 주는 것만 그린다(null = 모른다)
  const bannerOptions = bannerCatalog();
  const periodError = errors.startAt?.message ?? errors.endAt?.message;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="이벤트 정보"
      description="별표(*) 항목은 필수예요. 기간·대상·혜택을 확인하세요."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailure={loadFailure}
      onRetryLoad={retryLoad}
      errorReference={errorReference}
      conflict={conflict}
      serverError={serverError}
      saving={saving}
      isDirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={submit}
    >
      <FormField htmlFor="event-title" label="이벤트명" required error={errors.title?.message}>
        <input
          id="event-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={EVENT_TITLE_MAX}
          placeholder="예: 여름맞이 리뷰 이벤트"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('event-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <DateRangeField
        label="이벤트 기간"
        required
        startValue={startAt}
        endValue={endAt}
        onStartChange={(value) => setValue('startAt', value, { shouldDirty: true })}
        onEndChange={(value) => setValue('endAt', value, { shouldDirty: true })}
        disabled={disabled}
        error={periodError}
      />

      <div style={formRowStyle}>
        <FormField htmlFor="event-phase" label="상태" required>
          <SelectField id="event-phase" disabled={disabled} {...register('phase')}>
            {CAMPAIGN_PHASE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
        <FormField htmlFor="event-target" label="대상" required error={errors.target?.message}>
          <input
            id="event-target"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.target !== undefined)}
            placeholder="예: 전체 회원 · VIP 등급"
            disabled={disabled}
            aria-invalid={errors.target !== undefined}
            aria-describedby={errors.target !== undefined ? errorIdOf('event-target') : undefined}
            {...register('target')}
          />
        </FormField>
      </div>

      <div style={formRowStyle}>
        <FormField htmlFor="event-benefit" label="혜택 유형">
          <SelectField id="event-benefit" disabled={disabled} {...register('benefitType')}>
            {BENEFIT_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
        {benefitNeedsDetail(benefitType) && (
          <FormField
            htmlFor="event-benefit-detail"
            label="혜택 상세"
            required
            error={errors.benefitDetail?.message}
          >
            <input
              id="event-benefit-detail"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.benefitDetail !== undefined)}
              placeholder="예: 3,000 적립금 · 10% 할인쿠폰"
              disabled={disabled}
              aria-invalid={errors.benefitDetail !== undefined}
              aria-describedby={
                errors.benefitDetail !== undefined ? errorIdOf('event-benefit-detail') : undefined
              }
              {...register('benefitDetail')}
            />
          </FormField>
        )}
      </div>

      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>배너 연동</span>
        <ToggleSwitch
          checked={bannerLinked}
          onChange={(next) =>
            setValue('bannerLinked', next, { shouldDirty: true, shouldValidate: true })
          }
          disabled={disabled}
          label="배너 연동 여부"
          onLabel="연동"
          offLabel="미연동"
        />
      </div>
      {bannerLinked &&
        // 카탈로그를 모르면(조회기 미배선) 빈 선택 목록을 그리지 않는다 — '고를 배너가 없다' 는
        // 완결된 문장이 되어 배선 사고를 데이터 사고로 읽게 만든다(banner-catalog.ts 머리말).
        (bannerOptions === null ? (
          <FormField
            htmlFor="event-banner"
            label="연동 배너"
            required
            error="배너 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
          >
            <SelectField id="event-banner" disabled isInvalid>
              <option value="">배너 목록을 불러오지 못했어요</option>
            </SelectField>
          </FormField>
        ) : (
          <FormField
            htmlFor="event-banner"
            label="연동 배너"
            required
            error={errors.bannerId?.message}
            hint="배너 관리에 등록된 배너만 고를 수 있어요."
          >
            <SelectField
              id="event-banner"
              disabled={disabled}
              isInvalid={errors.bannerId !== undefined}
              aria-describedby={
                errors.bannerId !== undefined ? errorIdOf('event-banner') : hintIdOf('event-banner')
              }
              {...register('bannerId')}
            >
              <option value="">배너를 선택하세요</option>
              {bannerOptions.map((banner) => (
                <option key={banner.id} value={banner.id}>
                  {`${banner.title} · ${banner.id}`}
                </option>
              ))}
            </SelectField>
          </FormField>
        ))}
      {bannerLinked && bannerId !== '' && (
        <p style={bannerLinkStyle}>
          {/* 참조는 건너갈 수 있어야 참조다 — 자유 텍스트였을 때는 여기서 갈 곳이 없었다 */}
          <Link to={bannerEditPath(bannerId)} className="tds-ui-link tds-ui-focusable">
            연동한 배너 상세 보기
          </Link>
        </p>
      )}

      <TextareaField
        label="설명"
        value={watch('description')}
        onChange={(value) => setValue('description', value, { shouldDirty: true })}
        maxLength={EVENT_DESC_MAX}
        disabled={disabled}
        error={errors.description?.message}
        placeholder="이벤트 안내 문구를 입력하세요."
        rows={4}
      />
    </FormPageShell>
  );
}
