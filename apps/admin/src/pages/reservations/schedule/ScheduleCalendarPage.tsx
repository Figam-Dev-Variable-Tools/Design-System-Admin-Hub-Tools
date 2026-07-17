// ScheduleCalendarPage — 예약 일정(달력) (라우트: /reservations/schedule) · A41 소유
//
// 라이브러리 없이 직접 만든 일/주 캘린더다. 시간 슬롯별 예약·가용량·마감을 격자로 보여주고, 슬롯을
// 클릭하면 그 슬롯의 예약 목록(상세로 이동)을 아래 패널에 편다. 예약 데이터는 예약 화면과 같은
// 어댑터(_shared/reservation-store)를 읽는다 — 별도 데이터 소스가 아니다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate, formatNumber } from '../../../shared/format';
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
import { addDays, formatDayLabel, isToday, weekDates } from '../_shared/calendar';
import { bookingStatusLabel, bookingStatusTone } from '../_shared/booking';
import { resourceName } from '../_shared/resources';
import type { Slot } from './schedule-data';
import { CalendarGrid } from './components/CalendarGrid';

const RESOURCE = 'reservations';
const RESERVATION_PATH = '/reservations';
const COMPLETED_LABEL = '방문완료';

/**
 * 셀의 숫자는 **예약 건수가 아니라 점유된 자원 수**다 (schedule-data). 한 자원에 예약이 몰려도
 * 숫자는 자원 하나로 세므로, 그 사실을 '중복'이 따로 알린다 — 읽는 법을 여기서 정확히 말해 둔다.
 */
const READ_HINT =
  "셀의 숫자는 사용 중인 자원 수/전체 자원 수입니다. '중복'은 한 자원에 시간이 겹치는 예약이 있다는 뜻입니다. 슬롯을 클릭하면 아래에서 예약을 확인·수정할 수 있습니다.";
/** 앱 전역의 최초 로드 문구와 **글자까지 같게** 둔다 (CrudListShell·MembersPage 등과 동일) */
const FIRST_LOADING_HINT = '불러오는 중…';
const REFETCHING_HINT = '최신 예약을 확인하는 중…';

/**
 * [STATE-01] 힌트도 격자와 **같은 상태**를 말한다 — 한 화면이 두 가지를 말하면 안 된다.
 *
 * 최초 로드면 읽는 법을 안내할 격자가 아직 없으니 로딩만 알린다. 재조회 중이면 격자에 이전 예약이
 * 그대로 있으므로 읽는 법을 유지한 채 갱신 중이라는 사실만 덧붙인다 — 이 한 줄을 '불러오는 중…'
 * 으로 바꿔 버리면 눈앞의 숫자가 유효한지 아닌지를 운영자가 알 수 없다.
 */
function gridHint(firstLoading: boolean, refetching: boolean): string {
  if (firstLoading) return FIRST_LOADING_HINT;
  if (refetching) return `${READ_HINT} · ${REFETCHING_HINT}`;
  return READ_HINT;
}

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
  // [ERP-09] '오늘'은 **서울의 오늘**이다 — toDateString(new Date()) 로 잡으면 보는 사람의 OS
  // 타임존이 달력의 시작 칸을 정한다(뉴욕에서 열면 하루 전 주가 열린다). 기준은 shared/format 한 벌.
  const today = formatDate(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  const { data, isFetching, error, refetch } = useCrudListQuery(RESOURCE, reservationAdapter);

  /**
   * [STATE-01] 데이터 뷰는 {최초 로드 · 재조회 중 · 빈 · 실패} 중 **정확히 하나**만 그린다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 부르고 격자에는 `data ?? []` 만 넘겼다. 그러면
   * '아직 안 왔다'와 '예약이 0건이다'가 **둘 다 빈 배열**이 되어 격자가 도착 전부터 '0/4' 로
   * 완성돼 보였다 — 달력이 아직 모르는 것을 안다고 단정한 것이다. 운영자에게 이건 스피너보다
   * 나쁘다: 스피너는 기다리게 하지만 '0/4' 는 **그 시간이 비었다고 믿고 예약을 잡게 만든다.**
   * 사실은 이미 마감된 슬롯일 수 있다.
   *
   * 그래서 두 사실을 분리해 격자에 넘긴다:
   *  - firstLoading — 스켈레톤을 그릴 유일한 조건. 데이터가 아직 **없을** 때만 참이다.
   *  - refetching   — 데이터를 든 채 도는 재조회. 격자는 이전 값을 그대로 유지한다(비우지 않는다).
   * 실패는 아래 이른 반환이, 빈(예약 0건)은 조회가 끝난 뒤의 격자 자신이 '0/4' 로 참되게 말한다.
   */
  const firstLoading = isFetching && data === undefined;
  const refetching = isFetching && data !== undefined;

  // firstLoading 이 거짓일 때만 읽힌다 — 격자는 이 배열이 '빈' 것인지 '없는' 것인지 묻지 않아도 된다
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
        {/*
          뷰 토글 — primary/secondary 는 **색만** 다르다 (shared/ui/styles.ts). 그래서 예전엔 지금 어느
          뷰인지가 색으로만 표시됐고, AT 에는 아예 드러나지 않았다(두 버튼이 똑같이 '일'·'주' 버튼).
          aria-pressed 로 눌린 상태를 사실로 말한다 — 색은 그 위에 얹는 두 번째 부호다 (WCAG 1.4.1).
        */}
        <div style={navGroupStyle} role="group" aria-label="달력 보기 범위">
          <Button
            variant={view === 'day' ? 'primary' : 'secondary'}
            aria-pressed={view === 'day'}
            onClick={() => {
              setView('day');
              setSelected(null);
            }}
          >
            일
          </Button>
          <Button
            variant={view === 'week' ? 'primary' : 'secondary'}
            aria-pressed={view === 'week'}
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

      <p style={hintStyle}>{gridHint(firstLoading, refetching)}</p>

      <CalendarGrid
        days={days}
        all={all}
        loading={firstLoading}
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
