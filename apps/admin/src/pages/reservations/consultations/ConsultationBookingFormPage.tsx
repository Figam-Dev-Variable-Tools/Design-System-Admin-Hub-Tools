// ConsultationBookingFormPage — 상담 예약 등록/수정 (라우트: /reservations/consultations/new · /:id/edit) · A41 소유
//
// 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 재사용한다. 필드: 고객·상담유형·주제·희망일시·담당·
// 상태·메모. 상태는 전이 규칙(_shared/booking)이 허용하는 후보로만 좁혀 강제한다(영업/CS 상태전이 패턴 재사용).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'react-router-dom';

import { controlStyle, errorIdOf, FormField, SelectField, TextareaField } from '../../../shared/ui';
import { FormPageShell, useCrudForm, useCrudItem } from '../../../shared/crud';
import { consultBookingAdapter } from './data-source';
import {
  CHANNEL_COMPLETED_LABEL,
  CONSULT_BOOKING_NOTE_MAX,
  CONSULT_BOOKING_TOPIC_MAX,
  CONSULT_CHANNEL_OPTIONS,
} from './types';
import type { ConsultBooking, ConsultBookingInput } from './types';
import { consultBookingSchema } from './validation';
import type { ConsultBookingFormValues } from './validation';
import { bookingStatusLabel, isBookingStatus, statusChoices } from '../_shared/booking';
import { listStaff } from '../_shared/resources';

const RESOURCE = 'reservation-consultations';
const ENTITY_LABEL = '상담 예약';
const LIST_PATH = '/reservations/consultations';
const UNSAVED_MESSAGE =
  '상담 예약에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const STAFF = listStaff();

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: 'var(--tds-space-4)',
};

const EMPTY: ConsultBookingFormValues = {
  customerName: '',
  customerPhone: '',
  channel: 'visit',
  topic: '',
  preferredDate: '',
  preferredTime: '',
  staffId: '',
  status: 'requested',
  note: '',
};

function toInput(values: ConsultBookingFormValues): ConsultBookingInput {
  return {
    customerName: values.customerName.trim(),
    customerPhone: values.customerPhone.trim(),
    channel: values.channel,
    topic: values.topic.trim(),
    preferredDate: values.preferredDate,
    preferredTime: values.preferredTime,
    staffId: values.staffId,
    status: values.status,
    note: values.note.trim(),
  };
}

function toValues(booking: ConsultBooking): ConsultBookingFormValues {
  return {
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    channel: booking.channel,
    topic: booking.topic,
    preferredDate: booking.preferredDate,
    preferredTime: booking.preferredTime,
    staffId: booking.staffId,
    status: booking.status,
    note: booking.note,
  };
}

export default function ConsultationBookingFormPage() {
  const { id } = useParams<{ id: string }>();
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
  } = useCrudForm<ConsultBooking, ConsultBookingInput, ConsultBookingFormValues>({
    resource: RESOURCE,
    adapter: consultBookingAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: consultBookingSchema,
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

  // 로드된 항목의 '원래 상태'를 기준으로 전이 후보를 좁힌다(폼 내부 상세 조회와 같은 키라 캐시가 공유된다).
  const loaded = useCrudItem(RESOURCE, consultBookingAdapter, id ?? '');
  const originalStatus = loaded.data?.status ?? 'requested';
  const statusOptions = useMemo(() => statusChoices(originalStatus), [originalStatus]);
  const status = watch('status');

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="상담 예약 정보"
      description="별표(*) 항목은 필수입니다. 상담유형·희망일시·담당을 확인하세요."
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
      <div style={rowStyle}>
        <FormField
          htmlFor="csb-customer"
          label="고객명"
          required
          error={errors.customerName?.message}
        >
          <input
            id="csb-customer"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.customerName !== undefined)}
            maxLength={40}
            placeholder="예: 윤아름"
            disabled={disabled}
            aria-invalid={errors.customerName !== undefined}
            aria-describedby={
              errors.customerName !== undefined ? errorIdOf('csb-customer') : undefined
            }
            {...register('customerName')}
          />
        </FormField>
        <FormField
          htmlFor="csb-phone"
          label="연락처"
          required
          error={errors.customerPhone?.message}
        >
          <input
            id="csb-phone"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.customerPhone !== undefined)}
            maxLength={20}
            placeholder="예: 010-1234-5678"
            disabled={disabled}
            aria-invalid={errors.customerPhone !== undefined}
            aria-describedby={
              errors.customerPhone !== undefined ? errorIdOf('csb-phone') : undefined
            }
            {...register('customerPhone')}
          />
        </FormField>
      </div>

      <div style={rowStyle}>
        <FormField htmlFor="csb-channel" label="상담유형" required>
          <SelectField id="csb-channel" disabled={disabled} {...register('channel')}>
            {CONSULT_CHANNEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
        <FormField htmlFor="csb-staff" label="담당">
          <SelectField id="csb-staff" disabled={disabled} {...register('staffId')}>
            <option value="">미배정</option>
            {STAFF.map((member) => (
              <option key={member.id} value={member.id}>
                {`${member.name} · ${member.role}`}
              </option>
            ))}
          </SelectField>
        </FormField>
      </div>

      <FormField htmlFor="csb-topic" label="상담 주제" required error={errors.topic?.message}>
        <input
          id="csb-topic"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.topic !== undefined)}
          maxLength={CONSULT_BOOKING_TOPIC_MAX}
          placeholder="예: 인테리어 리모델링 상담"
          disabled={disabled}
          aria-invalid={errors.topic !== undefined}
          aria-describedby={errors.topic !== undefined ? errorIdOf('csb-topic') : undefined}
          {...register('topic')}
        />
      </FormField>

      <div style={rowStyle}>
        <FormField
          htmlFor="csb-date"
          label="희망 날짜"
          required
          error={errors.preferredDate?.message}
        >
          <input
            id="csb-date"
            type="date"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.preferredDate !== undefined)}
            disabled={disabled}
            aria-invalid={errors.preferredDate !== undefined}
            aria-describedby={
              errors.preferredDate !== undefined ? errorIdOf('csb-date') : undefined
            }
            {...register('preferredDate')}
          />
        </FormField>
        <FormField
          htmlFor="csb-time"
          label="희망 시각"
          required
          error={errors.preferredTime?.message}
        >
          <input
            id="csb-time"
            type="time"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.preferredTime !== undefined)}
            disabled={disabled}
            aria-invalid={errors.preferredTime !== undefined}
            aria-describedby={
              errors.preferredTime !== undefined ? errorIdOf('csb-time') : undefined
            }
            {...register('preferredTime')}
          />
        </FormField>
      </div>

      <FormField htmlFor="csb-status" label="상태" required>
        <SelectField
          id="csb-status"
          value={status}
          disabled={disabled}
          onChange={(event) => {
            if (isBookingStatus(event.target.value)) {
              setValue('status', event.target.value, { shouldDirty: true });
            }
          }}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {bookingStatusLabel(option, CHANNEL_COMPLETED_LABEL)}
            </option>
          ))}
        </SelectField>
      </FormField>

      <TextareaField
        label="상담 메모"
        value={watch('note')}
        onChange={(value) => setValue('note', value, { shouldDirty: true })}
        maxLength={CONSULT_BOOKING_NOTE_MAX}
        disabled={disabled}
        error={errors.note?.message}
        placeholder="상담 준비·요청사항 등을 기록하세요."
        rows={4}
      />
    </FormPageShell>
  );
}
