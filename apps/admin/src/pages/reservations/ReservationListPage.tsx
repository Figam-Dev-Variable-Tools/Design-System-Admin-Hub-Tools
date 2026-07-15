// ReservationListPage — 예약 목록 (라우트: /reservations) · A41 소유
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 일시·인원·자원·담당·예약금·상태
// 배지 + 삭제팝업. 같은 자원에 시간이 겹치는 유효 예약은 '중복(더블부킹)' 배지로 한눈에 알린다.
// 목록엔 이미지 열이 없다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../shared/ui';
import { CrudListShell, useCrudList } from '../../shared/crud';
import type { CrudColumn } from '../../shared/crud';
import { reservationAdapter } from './_shared/reservation-store';
import { filterReservations, hasConflict, searchReservations } from './_shared/reservation';
import type { Reservation, ReservationInput } from './_shared/reservation';
import {
  BOOKING_FILTER_ALL,
  bookingStatusLabel,
  bookingStatusOptions,
  bookingStatusTone,
  isBookingStatus,
} from './_shared/booking';
import type { BookingStatusFilter } from './_shared/booking';
import { resourceName, staffName } from './_shared/resources';

const RESOURCE = 'reservations';
const ENTITY_LABEL = '예약';
const LIST_PATH = '/reservations';
const COMPLETED_LABEL = '방문완료';

const STATUS_OPTIONS = bookingStatusOptions(COMPLETED_LABEL);

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 5)' };

const whenStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  flexWrap: 'wrap',
};

const nameOf = (item: Reservation) => `${item.customerName} (${item.code})`;

export default function ReservationListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BookingStatusFilter>(BOOKING_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const controller = useCrudList<Reservation, ReservationInput>({
    resource: RESOURCE,
    adapter: reservationAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear, items } = controller;

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchReservations(filterReservations(items, filter), keyword),
    [items, filter, keyword],
  );

  const columns: readonly CrudColumn<Reservation>[] = [
    { header: '예약번호', nowrap: true, render: (item) => item.code },
    { header: '고객', render: (item) => item.customerName },
    {
      header: '일시',
      nowrap: true,
      render: (item) => (
        <span style={whenStyle}>{`${item.date} ${item.startTime}~${item.endTime}`}</span>
      ),
    },
    { header: '인원', numeric: true, render: (item) => `${formatNumber(item.partySize)}명` },
    { header: '자원', render: (item) => resourceName(item.resourceId) },
    {
      header: '담당',
      render: (item) => (item.staffId === '' ? '미배정' : staffName(item.staffId)),
    },
    {
      header: '예약금',
      numeric: true,
      render: (item) => `${formatNumber(item.deposit)}원`,
    },
    {
      header: '상태',
      nowrap: true,
      render: (item) => (
        <span style={statusCellStyle}>
          <StatusBadge
            tone={bookingStatusTone(item.status)}
            label={bookingStatusLabel(item.status, COMPLETED_LABEL)}
          />
          {hasConflict(items, item) && <StatusBadge tone="danger" label="중복" />}
        </span>
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="예약번호·고객·연락처 검색"
          placeholder="예약번호 · 고객 · 연락처 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => {
              const next = event.target.value;
              setFilter(
                next === BOOKING_FILTER_ALL || isBookingStatus(next) ? next : BOOKING_FILTER_ALL,
              );
            }}
            aria-label="상태로 거르기"
          >
            <option value={BOOKING_FILTER_ALL}>전체 상태</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        예약 등록
      </Button>
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visible}
      columns={columns}
      nameOf={nameOf}
      selectAllLabelId="reservations-select-all"
      emptyLabel="등록된 예약이 없습니다."
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
