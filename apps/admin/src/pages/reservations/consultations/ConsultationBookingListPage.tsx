// ConsultationBookingListPage — 상담 예약 목록 (라우트: /reservations/consultations)
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 상담유형·희망일시·담당·상태 배지 +
// 삭제팝업. 목록엔 이미지 열이 없다.
//
// [조회 상태의 소유자] 상태 필터·검색어는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '요청' 만 걸러 확정 처리를 이어 가다 Back 하면 그 대기열이
// 그대로 살아 있다. 검색은 IME 안전이다 (COMP-10).
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
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
} from '../_shared/booking';
import type { BookingStatusFilter } from '../_shared/booking';
import { staffName } from '../_shared/resources';

const RESOURCE = 'reservation-consultations';
const ENTITY_LABEL = '상담 예약';
const LIST_PATH = '/reservations/consultations';

const STATUS_OPTIONS = bookingStatusOptions(CHANNEL_COMPLETED_LABEL);
/** 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — select 가 그리는 옵션 전체가 허용 목록이다 */
const STATUS_FILTER_VALUES: readonly BookingStatusFilter[] = [
  BOOKING_FILTER_ALL,
  ...STATUS_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13) */
const FILTER_DEFAULTS = { status: BOOKING_FILTER_ALL } as const;

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

  // 상태·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const filter: BookingStatusFilter = parseFilter(
    list.filters['status'] ?? BOOKING_FILTER_ALL,
    STATUS_FILTER_VALUES,
    BOOKING_FILTER_ALL,
  );
  const { keyword } = list;

  const controller = useCrudList<ConsultBooking, ConsultBookingInput>({
    resource: RESOURCE,
    adapter: consultBookingAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear, items } = controller;

  // 보고 있는 행 집합이 바뀌면 선택은 무의미해진다 — 화면에 없는 행이 선택된 채
  // '선택 3건 삭제' 가 되지 않게 한다. 선택은 useCrudList(=CrudListShell)가 쥐고 있으므로
  // 조건 변화를 여기서 그 선택에 이어 준다 (STATE-04-b)
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
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="상담예약번호·고객·주제 검색"
          placeholder="상담예약번호 · 고객 · 주제 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '이서연' 을 치는 도중 '이서ㅇ' 로 검색되지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('status', event.target.value)}
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
      // 왜 비었는지에 따라 복구 수단이 다르다 — 검색 지우기 / 필터 초기화 (STATE-05)
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="reservation-consultations-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
