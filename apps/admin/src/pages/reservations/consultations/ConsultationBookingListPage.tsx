// ConsultationBookingListPage — 상담 예약 목록 (라우트: /reservations/consultations) · A41 소유
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 상담유형·희망일시·담당·상태 배지 +
// 삭제팝업. 목록엔 이미지 열이 없다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { consultBookingAdapter } from './data-source';
import {
  consultChannelLabel,
  CHANNEL_COMPLETED_LABEL,
  filterConsultBookings,
  searchConsultBookings,
} from './types';
import type { ConsultBooking, ConsultBookingInput } from './types';
import {
  BOOKING_FILTER_ALL,
  bookingStatusLabel,
  bookingStatusOptions,
  bookingStatusTone,
  isBookingStatus,
} from '../_shared/booking';
import type { BookingStatusFilter } from '../_shared/booking';
import { staffName } from '../_shared/resources';

const RESOURCE = 'reservation-consultations';
const ENTITY_LABEL = '상담 예약';
const LIST_PATH = '/reservations/consultations';

const STATUS_OPTIONS = bookingStatusOptions(CHANNEL_COMPLETED_LABEL);

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

const nameOf = (item: ConsultBooking) => `${item.customerName} (${item.code})`;

export default function ConsultationBookingListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BookingStatusFilter>(BOOKING_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const controller = useCrudList<ConsultBooking, ConsultBookingInput>({
    resource: RESOURCE,
    adapter: consultBookingAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear, items } = controller;

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchConsultBookings(filterConsultBookings(items, filter), keyword),
    [items, filter, keyword],
  );

  const columns: readonly CrudColumn<ConsultBooking>[] = [
    { header: '상담예약번호', nowrap: true, render: (item) => item.code },
    { header: '상담유형', render: (item) => consultChannelLabel(item.channel) },
    {
      header: '희망일시',
      nowrap: true,
      render: (item) => (
        <span style={whenStyle}>{`${item.preferredDate} ${item.preferredTime}`}</span>
      ),
    },
    { header: '고객', render: (item) => item.customerName },
    { header: '주제', render: (item) => item.topic },
    {
      header: '담당',
      render: (item) => (item.staffId === '' ? '미배정' : staffName(item.staffId)),
    },
    {
      header: '상태',
      nowrap: true,
      render: (item) => (
        <StatusBadge
          tone={bookingStatusTone(item.status)}
          label={bookingStatusLabel(item.status, CHANNEL_COMPLETED_LABEL)}
        />
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="상담예약번호·고객·주제 검색"
          placeholder="상담예약번호 · 고객 · 주제 검색"
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
        상담 예약 등록
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
      selectAllLabelId="reservation-consultations-select-all"
      emptyLabel="등록된 상담 예약이 없습니다."
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
