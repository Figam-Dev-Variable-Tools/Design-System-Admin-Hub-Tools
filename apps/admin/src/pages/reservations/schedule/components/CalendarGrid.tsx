// CalendarGrid — 예약 일정 시간슬롯 격자 (A41 소유 — apps/admin/src/pages/reservations/schedule/**)
//
// 라이브러리 없이 직접 그린 달력 격자다: 행=시간 슬롯, 열=날짜(일 뷰 1열·주 뷰 7열). 각 셀은 걸치는
// 유효 예약을 배지 칩으로 보여주고, 예약 수/수용량과 '마감'을 알린다. 셀 클릭 → 슬롯 선택(상세 패널),
// 칩 클릭 → 해당 예약 수정으로 이동.
import type { CSSProperties } from 'react';

import { StatusBadge } from '../../../../shared/ui';
import { bookingStatusTone } from '../../_shared/booking';
import { formatDayLabel, isToday } from '../../_shared/calendar';
import type { Reservation } from '../../_shared/reservation';
import { DAY_SLOTS, slotCell } from '../schedule-data';
import type { Slot } from '../schedule-data';

const scrollStyle: CSSProperties = { overflowX: 'auto' };

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--tds-border-width-thin)',
  background: 'var(--tds-color-border-default)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  overflow: 'hidden',
  minWidth: 'calc(var(--tds-space-6) * 12)',
};

const headCellStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-2)',
  paddingRight: 'var(--tds-space-2)',
  background: 'var(--tds-color-surface-raised)',
  textAlign: 'center',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  color: 'var(--tds-color-text-default)',
  whiteSpace: 'nowrap',
};

const todayHeadStyle: CSSProperties = {
  ...headCellStyle,
  color: 'var(--tds-color-action-primary-default)',
};

const timeCellStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-2)',
  paddingRight: 'var(--tds-space-2)',
  background: 'var(--tds-color-surface-raised)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--tds-color-text-muted)',
  whiteSpace: 'nowrap',
  textAlign: 'center',
};

const baseCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-2)',
  paddingRight: 'var(--tds-space-2)',
  minHeight: 'calc(var(--tds-space-6) * 2)',
  minWidth: 'calc(var(--tds-space-6) * 3)',
  borderStyle: 'none',
  borderWidth: 0,
  background: 'var(--tds-color-surface-default)',
  textAlign: 'left',
  cursor: 'pointer',
};

const selectedCellStyle: CSSProperties = {
  ...baseCellStyle,
  background: 'var(--tds-color-feedback-info-surface)',
};

const chipRowStyle: CSSProperties = {
  display: 'inline-flex',
  flexWrap: 'wrap',
  gap: 'var(--tds-space-1)',
};

const capacityStyle: CSSProperties = {
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
};

const fullStyle: CSSProperties = {
  ...capacityStyle,
  color: 'var(--tds-color-feedback-danger-text)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

interface CalendarGridProps {
  readonly days: readonly string[];
  readonly all: readonly Reservation[];
  readonly selectedDate: string;
  readonly selectedSlotStart: number | null;
  readonly onSelectSlot: (date: string, slot: Slot) => void;
}

export function CalendarGrid({
  days,
  all,
  selectedDate,
  selectedSlotStart,
  onSelectSlot,
}: CalendarGridProps) {
  const template = `calc(var(--tds-space-6) * 2) repeat(${String(days.length)}, minmax(0, 1fr))`;

  return (
    <div style={scrollStyle}>
      <div
        style={{ ...gridStyle, gridTemplateColumns: template }}
        role="grid"
        aria-label="예약 일정 달력"
      >
        <div style={headCellStyle} role="columnheader">
          시간
        </div>
        {days.map((day) => (
          <div key={day} style={isToday(day) ? todayHeadStyle : headCellStyle} role="columnheader">
            {formatDayLabel(day)}
          </div>
        ))}

        {DAY_SLOTS.map((slot) => (
          <div key={slot.label} style={{ display: 'contents' }}>
            <div style={timeCellStyle} role="rowheader">
              {slot.label}
            </div>
            {days.map((day) => {
              const cell = slotCell(all, day, slot);
              const selected = day === selectedDate && slot.startMin === selectedSlotStart;
              return (
                <button
                  key={`${day}-${slot.label}`}
                  type="button"
                  className="tds-ui-focusable"
                  style={selected ? selectedCellStyle : baseCellStyle}
                  aria-label={`${formatDayLabel(day)} ${slot.label} — 예약 ${String(cell.booked)}건 / 수용 ${String(cell.capacity)}건`}
                  aria-pressed={selected}
                  onClick={() => onSelectSlot(day, slot)}
                >
                  {cell.reservations.length > 0 && (
                    <span style={chipRowStyle}>
                      {cell.reservations.map((reservation) => (
                        <StatusBadge
                          key={reservation.id}
                          tone={bookingStatusTone(reservation.status)}
                          label={`${reservation.startTime} ${reservation.customerName}`}
                        />
                      ))}
                    </span>
                  )}
                  <span style={cell.full ? fullStyle : capacityStyle}>
                    {cell.full ? '마감' : `${String(cell.booked)}/${String(cell.capacity)}`}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
