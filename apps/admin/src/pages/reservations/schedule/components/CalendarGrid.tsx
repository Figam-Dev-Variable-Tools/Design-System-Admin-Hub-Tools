// CalendarGrid — 예약 일정 시간슬롯 격자 (A41 소유 — apps/admin/src/pages/reservations/schedule/**)
//
// 라이브러리 없이 직접 그린 달력 격자다: 행=시간 슬롯, 열=날짜(일 뷰 1열·주 뷰 7열). 각 셀은 걸치는
// 유효 예약을 배지 칩으로 보여주고, 예약 수/수용량과 '마감'을 알린다. 셀 클릭·Enter → 슬롯 선택(상세 패널).
//
// [왜 라이브러리가 아닌가 — A80 절차 실측]
//   이 격자는 '이벤트를 시간축에 얹은 것'이 아니라 **슬롯별 수용량 행렬**이다: 셀이 말하는 것은
//   '예약 N건 / 수용 M건'이고 M 은 배정 가능한 **자원 수**다 (schedule-data.ts). FullCalendar 는
//   수용량 개념이 아예 없는 이벤트 모델이라 이 셀을 1급으로 표현하지 못한다 — 옮기면 이 화면의
//   유일한 사실(N/M·마감)을 커스텀 렌더로 되만들거나 버려야 한다. 게다가 아래 격자 의미론과
//   화살표 이동은 FullCalendar 가 주지 않는다(그쪽도 슬롯 간 화살표 이동이 없다).
//   그래서 여기서는 **접근성 결함을 직접 고쳤다** — 번들 +0 kB.
//
// [격자 의미론 — display:contents 를 쓰지 않는 이유]
//   예전에는 행 래퍼가 `display:contents` 였고 role 이 없어서, role="grid" 아래 **행이 0개**였다
//   (columnheader/rowheader/button 만 떠 있는 깨진 격자). display:contents 는 상자를 없애 버려서
//   접근성 트리 노출이 브라우저마다 갈린다 — 그 위에 role="row" 를 얹어 고치는 건 버그 이력에
//   기대는 짓이다. 그래서 **행마다 자기 그리드를 준다**: 행이 진짜 상자가 되어 role="row" 가
//   성립하고, 열은 모든 행이 **같은 grid-template-columns** 를 쓰는 것으로 맞춘다
//   (실측: 머리행·첫 행·끝 행의 열 x 좌표가 전부 동일). 컨테이너는 행을 쌓기만 한다 — gridStyle 참조.
import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

import { StatusBadge } from '../../../../shared/ui';
import { bookingStatusLabel, bookingStatusTone } from '../../_shared/booking';
import { formatDayLabel, isToday } from '../../_shared/calendar';
import type { Reservation } from '../../_shared/reservation';
import { DAY_SLOTS, slotCell } from '../schedule-data';
import type { Slot } from '../schedule-data';

const COMPLETED_LABEL = '방문완료';
/** 오늘 열 머리의 텍스트 표식 — 색(파랑)만으로 오늘을 말하지 않기 위한 두 번째 부호 (WCAG 1.4.1) */
const TODAY_MARK = '오늘';

const scrollStyle: CSSProperties = { overflowX: 'auto' };

/**
 * 컨테이너는 **행을 세로로 쌓기만 한다** — 열 나눔은 행이 스스로 한다.
 *
 * 여기에 grid-template-columns 를 두면 안 된다: 자식이 이제 셀이 아니라 **행**이므로, 열 템플릿이
 * 살아 있으면 자동 배치가 행들을 8개 열에 차례로 흩어 놓는다(1행이 1열에, 2행이 2열에 …).
 * 격자선은 그대로다 — 가로선은 이 gap, 세로선은 행 자신의 gap 이 배경색을 드러내 만든다.
 */
const gridStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-border-width-thin)',
  background: 'var(--tds-color-border-default)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  overflow: 'hidden',
  minWidth: 'calc(var(--tds-space-6) * 12)',
};

/** 행 — 열 템플릿은 행마다 **같은 값**이라 열이 저절로 맞는다 (gridTemplateColumns 는 호출부가 주입) */
const rowStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--tds-border-width-thin)',
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

/** 오늘 표식 — 색 위에 얹는 텍스트 부호라 굵기/크기로도 구분된다 */
const todayMarkStyle: CSSProperties = {
  marginLeft: 'var(--tds-space-1)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
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

/**
 * gridcell 은 **투명한 상자**다 — 칸의 배경/여백은 그대로 버튼이 그린다.
 * 이렇게 두면 격자선(컨테이너 gap + 배경)이 예전과 똑같이 보이면서, 버튼은 버튼으로 남는다
 * (버튼에 role="gridcell" 을 얹으면 button 역할을 잃는다 — 셀은 누를 수 있는 것이어야 한다).
 */
const cellWrapStyle: CSSProperties = { display: 'flex' };

const baseCellStyle: CSSProperties = {
  display: 'flex',
  flexGrow: 1,
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

// 스켈레톤 셀은 실제 셀과 **같은 상자**여야 한다(패딩·최소 높이·최소 폭 동일) — 데이터가 도착할 때
// 격자가 튀지 않고 그 자리에 숫자가 들어찬다. 클릭 대상이 아니므로 커서는 기본값이다.
const skeletonCellStyle: CSSProperties = {
  ...baseCellStyle,
  justifyContent: 'center',
  cursor: 'default',
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

/**
 * 셀의 접근 가능한 이름 — 버튼의 aria-label 은 **자기 안쪽을 통째로 덮는다.**
 * 그래서 예전엔 스크린리더가 칩(누가 예약했는지)도 '마감'도 듣지 못하고 'N건/M건'만 들었다.
 * 눈으로 읽을 수 있는 것은 귀로도 읽을 수 있어야 한다 — 칩의 상태·시각·이름을 이름에 싣는다.
 *
 * 앞부분 `예약 N건 / 수용 M건` 은 그대로 둔다 — 이 화면의 사실 자체이고, 테스트가 이 문구로 셀을 찾는다.
 */
function cellLabel(
  day: string,
  slot: Slot,
  booked: number,
  capacity: number,
  full: boolean,
  list: readonly Reservation[],
): string {
  const head = `${formatDayLabel(day)} ${slot.label} — 예약 ${String(booked)}건 / 수용 ${String(capacity)}건`;
  const state = full ? ' · 마감' : '';
  if (list.length === 0) return `${head}${state}`;
  const detail = list
    .map((r) => `${r.startTime} ${r.customerName} ${bookingStatusLabel(r.status, COMPLETED_LABEL)}`)
    .join(', ');
  return `${head}${state} · ${detail}`;
}

interface CalendarGridProps {
  readonly days: readonly string[];
  readonly all: readonly Reservation[];
  /**
   * [STATE-01] **최초 로드**(`data === undefined`)인가 — 재조회 중에는 false 다.
   *
   * 이 플래그가 없으면 격자는 `all` 만 보고 그리는데, 아직 도착하지 않은 데이터와 '예약 0건'이
   * 둘 다 빈 배열이라 **구별할 방법이 없다**. 호출부가 이 사실을 따로 넘겨 준다.
   */
  readonly loading: boolean;
  readonly selectedDate: string;
  readonly selectedSlotStart: number | null;
  readonly onSelectSlot: (date: string, slot: Slot) => void;
}

export function CalendarGrid({
  days,
  all,
  loading,
  selectedDate,
  selectedSlotStart,
  onSelectSlot,
}: CalendarGridProps) {
  const template = `calc(var(--tds-space-6) * 2) repeat(${String(days.length)}, minmax(0, 1fr))`;

  /**
   * [키보드] 로빙 tabindex — 격자 전체가 **탭 정지 하나**다.
   *
   * 예전엔 셀이 전부 tabIndex=0 이라 주 뷰에서 격자를 지나가려면 Tab 을 77번 눌러야 했다
   * (11 슬롯 × 7 일). 격자는 목록이 아니라 2차원이므로, 들어가고 나오는 건 Tab 한 번이고
   * 안에서 옮겨 다니는 건 화살표다 (WAI-ARIA APG Grid 패턴).
   */
  const [active, setActive] = useState<{ readonly row: number; readonly col: number }>({
    row: 0,
    col: 0,
  });
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const registerCell = useCallback((key: string, node: HTMLButtonElement | null) => {
    if (node === null) cellRefs.current.delete(key);
    else cellRefs.current.set(key, node);
  }, []);

  const moveTo = useCallback(
    (row: number, col: number) => {
      const nextRow = Math.min(Math.max(row, 0), DAY_SLOTS.length - 1);
      const nextCol = Math.min(Math.max(col, 0), days.length - 1);
      setActive({ row: nextRow, col: nextCol });
      cellRefs.current.get(`${String(nextRow)}-${String(nextCol)}`)?.focus();
    },
    [days.length],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, row: number, col: number) => {
      const moves: Record<string, readonly [number, number] | undefined> = {
        ArrowRight: [row, col + 1],
        ArrowLeft: [row, col - 1],
        ArrowDown: [row + 1, col],
        ArrowUp: [row - 1, col],
        Home: [row, 0],
        End: [row, days.length - 1],
        PageUp: [0, col],
        PageDown: [DAY_SLOTS.length - 1, col],
      };
      const next = moves[event.key];
      if (next === undefined) return;
      // 격자가 화살표를 먹었으므로 페이지 스크롤로도 새지 않게 한다
      event.preventDefault();
      moveTo(next[0], next[1]);
    },
    [days.length, moveTo],
  );

  return (
    <div style={scrollStyle}>
      <div style={gridStyle} role="grid" aria-label="예약 일정 달력" aria-busy={loading}>
        <div style={{ ...rowStyle, gridTemplateColumns: template }} role="row">
          <div style={headCellStyle} role="columnheader">
            시간
          </div>
          {days.map((day) => {
            const todays = isToday(day);
            return (
              <div
                key={day}
                style={todays ? todayHeadStyle : headCellStyle}
                role="columnheader"
                // 오늘은 색으로만 말하지 않는다 — aria-current 로 AT 에, 아래 표식으로 눈에.
                aria-current={todays ? 'date' : undefined}
              >
                {formatDayLabel(day)}
                {todays && <span style={todayMarkStyle}>{TODAY_MARK}</span>}
              </div>
            );
          })}
        </div>

        {DAY_SLOTS.map((slot, rowIndex) => (
          <div key={slot.label} style={{ ...rowStyle, gridTemplateColumns: template }} role="row">
            <div style={timeCellStyle} role="rowheader">
              {slot.label}
            </div>
            {days.map((day, colIndex) => {
              // [STATE-01] 최초 로드 중에는 셀을 **집계하지 않는다**.
              //
              // 예전엔 `all = data ?? []` 하나만 받아 도착 전에도 slotCell 을 돌렸고, 그 결과 셀 77개가
              // 전부 '0/4' 로 렌더됐다. 그건 로딩 표시가 아니라 **거짓 사실의 단정**이다 — 운영자는
              // '이 시간 비었네' 하고 그 위에 예약을 잡는다. 실제로는 이미 마감된 슬롯일 수 있다.
              // 스피너를 못 본 운영자는 기다리지만, '0/4' 를 본 운영자는 **그것을 믿고 행동한다.**
              // 그래서 도착 전에는 아무 숫자도 말하지 않고 올 모양(스켈레톤)만 그린다.
              // 클릭 대상도 아니다 — 열어 봐야 '이 시간대에 예약이 없습니다'라는 또 하나의 거짓말뿐이다.
              if (loading) {
                return (
                  <div key={`${day}-${slot.label}`} style={cellWrapStyle} role="gridcell">
                    <span style={skeletonCellStyle}>
                      <span className="tds-ui-skeleton" aria-hidden="true" />
                    </span>
                  </div>
                );
              }

              // 여기서부터는 조회가 끝난 뒤다 — '0/4' 는 '아직 모른다'가 아니라 '정말 0건'을 뜻한다.
              const cell = slotCell(all, day, slot);
              const selected = day === selectedDate && slot.startMin === selectedSlotStart;
              const focusable = active.row === rowIndex && active.col === colIndex;
              return (
                <div key={`${day}-${slot.label}`} style={cellWrapStyle} role="gridcell">
                  <button
                    ref={(node) => {
                      registerCell(`${String(rowIndex)}-${String(colIndex)}`, node);
                    }}
                    type="button"
                    className="tds-ui-focusable"
                    style={selected ? selectedCellStyle : baseCellStyle}
                    aria-label={cellLabel(
                      day,
                      slot,
                      cell.booked,
                      cell.capacity,
                      cell.full,
                      cell.reservations,
                    )}
                    aria-pressed={selected}
                    // 로빙 tabindex — 격자 안에서 Tab 이 멈추는 곳은 언제나 한 칸뿐이다
                    tabIndex={focusable ? 0 : -1}
                    onKeyDown={(event) => {
                      onKeyDown(event, rowIndex, colIndex);
                    }}
                    onFocus={() => {
                      setActive({ row: rowIndex, col: colIndex });
                    }}
                    onClick={() => {
                      onSelectSlot(day, slot);
                    }}
                  >
                    {cell.reservations.length > 0 && (
                      <span style={chipRowStyle}>
                        {cell.reservations.map((reservation) => (
                          <StatusBadge
                            key={reservation.id}
                            tone={bookingStatusTone(reservation.status)}
                            // 상태를 **색으로만** 말하지 않는다 — tone 은 색, label 이 뜻이다.
                            // StatusBadge 계약이 요구하는 바이기도 하다 (WCAG 1.4.1).
                            label={`${reservation.startTime} ${reservation.customerName} · ${bookingStatusLabel(reservation.status, COMPLETED_LABEL)}`}
                          />
                        ))}
                      </span>
                    )}
                    <span style={cell.full ? fullStyle : capacityStyle}>
                      {cell.full ? '마감' : `${String(cell.booked)}/${String(cell.capacity)}`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
