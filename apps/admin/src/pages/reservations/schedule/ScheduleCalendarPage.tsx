// ScheduleCalendarPage — 예약 일정(달력) (라우트: /reservations/schedule) · A41 소유
//
// 라이브러리 없이 직접 만든 일/주 캘린더다. 시간 슬롯별 예약·가용량·마감을 격자로 보여주고, 슬롯을
// 클릭하면 그 슬롯의 예약 목록(상세로 이동)을 아래 패널에 편다. 예약 데이터는 예약 화면과 같은
// 어댑터(_shared/reservation-store)를 읽는다 — 별도 데이터 소스가 아니다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  ChevronRightIcon,
  hintStyle,
  StatusBadge,
} from '../../../shared/ui';
import { useCrudListQuery } from '../../../shared/crud';
import { reservationAdapter } from '../_shared/reservation-store';
import { reservationsInSlot } from '../_shared/reservation';
import { addDays, formatDayLabel, isToday, toDateString, weekDates } from '../_shared/calendar';
import { bookingStatusLabel, bookingStatusTone } from '../_shared/booking';
import { resourceName } from '../_shared/resources';
import type { Slot } from './schedule-data';
import { CalendarGrid } from './components/CalendarGrid';

const RESOURCE = 'reservations';
const RESERVATION_PATH = '/reservations';
const COMPLETED_LABEL = '방문완료';

type CalendarView = 'day' | 'week';

interface SelectedSlot {
  readonly date: string;
  readonly slot: Slot;
}

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const controlsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const navGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const rangeStyle: CSSProperties = {
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  color: 'var(--tds-color-text-default)',
  fontVariantNumeric: 'tabular-nums',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const panelListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
};

const panelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
  flexWrap: 'wrap',
};

const panelInfoStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

export default function ScheduleCalendarPage() {
  const navigate = useNavigate();
  const today = toDateString(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  const {
    data,
    isFetching: loading,
    error,
    refetch,
  } = useCrudListQuery(RESOURCE, reservationAdapter);
  const all = useMemo(() => data ?? [], [data]);

  const days = useMemo(() => (view === 'day' ? [anchor] : weekDates(anchor)), [view, anchor]);
  const step = view === 'day' ? 1 : 7;

  const selectedReservations = useMemo(
    () =>
      selected === null
        ? []
        : reservationsInSlot(all, selected.date, selected.slot.startMin, selected.slot.endMin),
    [selected, all],
  );

  if (error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>예약 일정을 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const rangeLabel =
    view === 'day' ? formatDayLabel(anchor) : `${days[0]} ~ ${days[days.length - 1]}`;

  const shift = (direction: -1 | 1) => {
    setAnchor((current) => addDays(current, direction * step));
    setSelected(null);
  };

  return (
    <div style={pageStyle}>
      <div style={controlsStyle}>
        <div style={navGroupStyle}>
          <Button
            variant={view === 'day' ? 'primary' : 'secondary'}
            onClick={() => {
              setView('day');
              setSelected(null);
            }}
          >
            일
          </Button>
          <Button
            variant={view === 'week' ? 'primary' : 'secondary'}
            onClick={() => {
              setView('week');
              setSelected(null);
            }}
          >
            주
          </Button>
        </div>

        <div style={navGroupStyle}>
          <Button variant="secondary" onClick={() => shift(-1)} aria-label="이전">
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="secondary"
            disabled={anchor === today}
            onClick={() => {
              setAnchor(today);
              setSelected(null);
            }}
          >
            오늘
          </Button>
          <Button variant="secondary" onClick={() => shift(1)} aria-label="다음">
            <ChevronRightIcon />
          </Button>
          <span style={rangeStyle}>{rangeLabel}</span>
        </div>
      </div>

      <p style={hintStyle}>
        {loading
          ? '불러오는 중…'
          : '셀의 숫자는 예약 수/수용량입니다. 슬롯을 클릭하면 아래에서 예약을 확인·수정할 수 있습니다.'}
      </p>

      <CalendarGrid
        days={days}
        all={all}
        selectedDate={selected?.date ?? ''}
        selectedSlotStart={selected?.slot.startMin ?? null}
        onSelectSlot={(date, slot) => setSelected({ date, slot })}
      />

      {selected !== null && (
        <Card>
          <CardTitle>
            {`${formatDayLabel(selected.date)} ${selected.slot.label}`}
            {isToday(selected.date) && <StatusBadge tone="info" label="오늘" />}
          </CardTitle>
          {selectedReservations.length === 0 ? (
            <p style={hintStyle}>이 시간대에 예약이 없습니다.</p>
          ) : (
            <div style={panelListStyle}>
              {selectedReservations.map((reservation) => (
                <div key={reservation.id} style={panelRowStyle}>
                  <span style={panelInfoStyle}>
                    <StatusBadge
                      tone={bookingStatusTone(reservation.status)}
                      label={bookingStatusLabel(reservation.status, COMPLETED_LABEL)}
                    />
                    <span>{`${reservation.code} · ${reservation.startTime}~${reservation.endTime}`}</span>
                    <span>{`${reservation.customerName} · ${formatNumber(reservation.partySize)}명`}</span>
                    <span>{resourceName(reservation.resourceId)}</span>
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`${RESERVATION_PATH}/${reservation.id}/edit`)}
                  >
                    예약 상세
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
