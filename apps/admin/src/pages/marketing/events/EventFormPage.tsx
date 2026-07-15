// EventFormPage — 이벤트 등록/수정 (라우트: /marketing/events/new · /:id/edit) · A41 소유
//
// 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 재사용한다. 필드: 이벤트명·기간·상태·대상·혜택
// (쿠폰/적립)·배너 연동·설명. 검증 정본은 ./validation.
import type { CSSProperties } from 'react';

import {
  controlStyle,
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
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

const RESOURCE = 'marketing-events';
const ENTITY_LABEL = '이벤트';
const LIST_PATH = '/marketing/events';
const UNSAVED_MESSAGE =
  '이벤트에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: 'var(--tds-space-4)',
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
  bannerLabel: '',
  description: '',
};

function toInput(values: EventFormValues): MarketingEventInput {
  const withBenefit = benefitNeedsDetail(values.benefitType);
  return {
    title: values.title.trim(),
    startAt: values.startAt,
    endAt: values.endAt,
    phase: values.phase,
    target: values.target.trim(),
    benefitType: values.benefitType,
    benefitDetail: withBenefit ? values.benefitDetail.trim() : '',
    bannerLinked: values.bannerLinked,
    bannerLabel: values.bannerLinked ? values.bannerLabel.trim() : '',
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
    bannerLinked: event.bannerLinked,
    bannerLabel: event.bannerLabel,
    description: event.description,
  };
}

export default function EventFormPage() {
  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<MarketingEvent, MarketingEventInput, EventFormValues>({
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
  const periodError = errors.startAt?.message ?? errors.endAt?.message;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="이벤트 정보"
      description="별표(*) 항목은 필수입니다. 기간·대상·혜택을 확인하세요."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailed={loadFailed}
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

      <div style={rowStyle}>
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
            {...register('target')}
          />
        </FormField>
      </div>

      <div style={rowStyle}>
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
      {bannerLinked && (
        <FormField
          htmlFor="event-banner"
          label="연동 배너명"
          required
          error={errors.bannerLabel?.message}
          hint="배너 관리에서 노출 중인 배너와 연결됩니다."
        >
          <input
            id="event-banner"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.bannerLabel !== undefined)}
            placeholder="예: 메인 상단 여름 배너"
            disabled={disabled}
            aria-invalid={errors.bannerLabel !== undefined}
            {...register('bannerLabel')}
          />
        </FormField>
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
