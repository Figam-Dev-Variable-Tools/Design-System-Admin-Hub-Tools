// ReservationFormPage — 예약 등록/수정 (라우트: /reservations/new · /:id/edit) · A41 소유
//
// 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 재사용한다. 필드: 고객·일시(슬롯)·인원·자원배정·
// 담당·예약금·요청사항·상태. 검증 정본은 ./reservation-validation.
// [경고(비차단)] 같은 자원에 시간이 겹치는 유효 예약(더블부킹)·과거 일시는 저장 전에 경고로 알린다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'react-router-dom';

import { formatNumber } from '../../shared/format';
import {
  Alert,
  controlStyle,
  errorIdOf,
  FormField,
  SelectField,
  TextareaField,
} from '../../shared/ui';
import { FormPageShell, useCrudForm, useCrudListQuery } from '../../shared/crud';
import { reservationAdapter } from './_shared/reservation-store';
import {
  findConflicts,
  RESERVATION_MEMO_MAX,
  RESERVATION_REQUEST_MAX,
} from './_shared/reservation';
import type { Reservation, ReservationInput } from './_shared/reservation';
import { reservationSchema } from './reservation-validation';
import type { ReservationFormValues } from './reservation-validation';
import { bookingStatusLabel, isBookingStatus } from './_shared/booking';
import { listResources, listStaff } from './_shared/resources';
import { isPastDateTime } from './_shared/calendar';

const RESOURCE = 'reservations';
const ENTITY_LABEL = '예약';
const LIST_PATH = '/reservations';
const COMPLETED_LABEL = '방문완료';
const UNSAVED_MESSAGE =
  '예약에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const FORM_STATUSES = ['requested', 'confirmed', 'visited', 'noshow', 'cancelled'] as const;
const RESOURCES = listResources();
const STAFF = listStaff();

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: 'var(--tds-space-4)',
};

const conflictListStyle: CSSProperties = {
  marginTop: 'var(--tds-space-1)',
  marginBottom: 0,
  paddingLeft: 'var(--tds-space-4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
};

const EMPTY: ReservationFormValues = {
  customerName: '',
  customerPhone: '',
  date: '',
  startTime: '',
  endTime: '',
  partySize: '1',
  resourceId: '',
  staffId: '',
  deposit: '0',
  request: '',
  status: 'requested',
  memo: '',
};

function toInput(values: ReservationFormValues): ReservationInput {
  return {
    customerName: values.customerName.trim(),
    customerPhone: values.customerPhone.trim(),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    partySize: Number(values.partySize.trim() || '0'),
    resourceId: values.resourceId,
    staffId: values.staffId,
    deposit: Number(values.deposit.trim() || '0'),
    request: values.request.trim(),
    status: values.status,
    memo: values.memo.trim(),
  };
}

function toValues(reservation: Reservation): ReservationFormValues {
  return {
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    partySize: String(reservation.partySize),
    resourceId: reservation.resourceId,
    staffId: reservation.staffId,
    deposit: String(reservation.deposit),
    request: reservation.request,
    status: reservation.status,
    memo: reservation.memo,
  };
}

export default function ReservationFormPage() {
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
  } = useCrudForm<Reservation, ReservationInput, ReservationFormValues>({
    resource: RESOURCE,
    adapter: reservationAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: reservationSchema,
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

  // 더블부킹 판정을 위해 전체 예약을 읽는다(폼과 목록이 같은 어댑터·캐시를 공유한다).
  const listQuery = useCrudListQuery(RESOURCE, reservationAdapter);
  const all = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const date = watch('date');
  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const resourceId = watch('resourceId');
  const status = watch('status');

  const conflicts = useMemo(
    () => findConflicts(all, { id, date, startTime, endTime, resourceId, status }),
    [all, id, date, startTime, endTime, resourceId, status],
  );
  const past = isPastDateTime(date, startTime);
  const timeError = errors.startTime?.message ?? errors.endTime?.message;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="예약 정보"
      description="별표(*) 항목은 필수입니다. 일시·자원·인원을 확인하세요."
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
      {conflicts.length > 0 && (
        <Alert tone="warning">
          <span>
            같은 자원에 시간이 겹치는 예약이 {formatNumber(conflicts.length)}건 있습니다(더블부킹).
            일정을 조정하거나 다른 자원을 선택하세요.
          </span>
          <ul style={conflictListStyle}>
            {conflicts.map((conflict) => (
              <li key={conflict.id}>
                {`${conflict.code} · ${conflict.startTime}~${conflict.endTime} · ${conflict.customerName}`}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {past && (
        <Alert tone="warning">
          과거 일시입니다. 지난 시각으로 예약을 저장하려는 것이 맞는지 확인하세요.
        </Alert>
      )}

      <div style={rowStyle}>
        <FormField
          htmlFor="rsv-customer"
          label="고객명"
          required
          error={errors.customerName?.message}
        >
          <input
            id="rsv-customer"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.customerName !== undefined)}
            maxLength={40}
            placeholder="예: 김도현"
            disabled={disabled}
            aria-invalid={errors.customerName !== undefined}
            aria-describedby={
              errors.customerName !== undefined ? errorIdOf('rsv-customer') : undefined
            }
            {...register('customerName')}
          />
        </FormField>
        <FormField
          htmlFor="rsv-phone"
          label="연락처"
          required
          error={errors.customerPhone?.message}
        >
          <input
            id="rsv-phone"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.customerPhone !== undefined)}
            maxLength={20}
            placeholder="예: 010-1234-5678"
            disabled={disabled}
            aria-invalid={errors.customerPhone !== undefined}
            aria-describedby={
              errors.customerPhone !== undefined ? errorIdOf('rsv-phone') : undefined
            }
            {...register('customerPhone')}
          />
        </FormField>
      </div>

      <FormField htmlFor="rsv-date" label="방문 날짜" required error={errors.date?.message}>
        <input
          id="rsv-date"
          type="date"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.date !== undefined)}
          disabled={disabled}
          aria-invalid={errors.date !== undefined}
          aria-describedby={errors.date !== undefined ? errorIdOf('rsv-date') : undefined}
          {...register('date')}
        />
      </FormField>

      <FormField htmlFor="rsv-start" label="이용 시간" required error={timeError}>
        <div style={rowStyle}>
          <input
            id="rsv-start"
            type="time"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(timeError !== undefined)}
            disabled={disabled}
            aria-label="시작 시각"
            aria-invalid={timeError !== undefined}
            aria-describedby={timeError !== undefined ? errorIdOf('rsv-start') : undefined}
            {...register('startTime')}
          />
          <input
            id="rsv-end"
            type="time"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(timeError !== undefined)}
            disabled={disabled}
            aria-label="종료 시각"
            aria-invalid={timeError !== undefined}
            aria-describedby={timeError !== undefined ? errorIdOf('rsv-start') : undefined}
            {...register('endTime')}
          />
        </div>
      </FormField>

      <div style={rowStyle}>
        <FormField
          htmlFor="rsv-resource"
          label="자원 배정"
          required
          error={errors.resourceId?.message}
        >
          <SelectField id="rsv-resource" disabled={disabled} {...register('resourceId')}>
            <option value="">자원 선택</option>
            {RESOURCES.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {`${resource.name} (정원 ${formatNumber(resource.capacity)}명)`}
              </option>
            ))}
          </SelectField>
        </FormField>
        <FormField htmlFor="rsv-party" label="예약 인원" required error={errors.partySize?.message}>
          <input
            id="rsv-party"
            type="number"
            inputMode="numeric"
            min={1}
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.partySize !== undefined)}
            disabled={disabled}
            aria-invalid={errors.partySize !== undefined}
            aria-describedby={errors.partySize !== undefined ? errorIdOf('rsv-party') : undefined}
            {...register('partySize')}
          />
        </FormField>
      </div>

      <div style={rowStyle}>
        <FormField htmlFor="rsv-staff" label="담당">
          <SelectField id="rsv-staff" disabled={disabled} {...register('staffId')}>
            <option value="">미배정</option>
            {STAFF.map((member) => (
              <option key={member.id} value={member.id}>
                {`${member.name} · ${member.role}`}
              </option>
            ))}
          </SelectField>
        </FormField>
        <FormField htmlFor="rsv-deposit" label="예약금(원)" error={errors.deposit?.message}>
          <input
            id="rsv-deposit"
            type="number"
            inputMode="numeric"
            min={0}
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.deposit !== undefined)}
            disabled={disabled}
            aria-invalid={errors.deposit !== undefined}
            aria-describedby={errors.deposit !== undefined ? errorIdOf('rsv-deposit') : undefined}
            {...register('deposit')}
          />
        </FormField>
      </div>

      <FormField htmlFor="rsv-status" label="상태" required>
        <SelectField
          id="rsv-status"
          value={status}
          disabled={disabled}
          onChange={(event) => {
            if (isBookingStatus(event.target.value)) {
              setValue('status', event.target.value, { shouldDirty: true });
            }
          }}
        >
          {FORM_STATUSES.map((value) => (
            <option key={value} value={value}>
              {bookingStatusLabel(value, COMPLETED_LABEL)}
            </option>
          ))}
        </SelectField>
      </FormField>

      <TextareaField
        label="요청사항"
        value={watch('request')}
        onChange={(value) => setValue('request', value, { shouldDirty: true })}
        maxLength={RESERVATION_REQUEST_MAX}
        disabled={disabled}
        error={errors.request?.message}
        placeholder="고객 요청사항을 입력하세요."
        rows={3}
      />

      <TextareaField
        label="관리자 메모"
        value={watch('memo')}
        onChange={(value) => setValue('memo', value, { shouldDirty: true })}
        maxLength={RESERVATION_MEMO_MAX}
        disabled={disabled}
        error={errors.memo?.message}
        placeholder="내부 처리 메모를 입력하세요."
        rows={3}
      />
    </FormPageShell>
  );
}
