// 최초 로드 중인 격자가 '0/4' 라고 말하지 않는다 (STATE-01) — apps/admin/src/pages/reservations/schedule/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면의 셀은 '<점유 자원 수>/<전체 자원 수>' 라는 **사실 진술**이다. 그런데 격자가 `data ?? []` 만
// 받으면 '아직 안 왔다'와 '예약이 0건이다'가 둘 다 빈 배열이라, 응답 도착 전부터 셀 77개가
// 전부 '0/4' 로 **완성된 사실처럼** 렌더됐다.
//
// 이건 단순한 '로딩 표시 누락'이 아니다. 스피너를 못 본 운영자는 기다리지만, '0/4' 를 본
// 운영자는 **그것을 믿고 그 시간에 예약을 잡는다** — 사실은 이미 마감된 슬롯일 수 있다.
// 화면이 침묵하는 것보다 거짓을 단정하는 것이 나쁘다. 그래서 도착 전에는 숫자를 말하지 않는다.
//
// [왜 컴포넌트 테스트로는 못 잡나]
// CalendarGrid 만 떼어 테스트하면 `all=[]` 을 넘겨 '0/4' 를 확인하고 초록이 된다 — 그게 바로
// 버그의 모습인데도. 결함은 **페이지가 격자에 무엇을 넘겼는가**(로딩 사실을 아예 안 넘겼다)에
// 있으므로, 페이지를 실제 QueryClient 에 태우고 **응답을 붙잡아 둔 채** 단언해야 잡힌다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDate } from '../../../shared/format';
import type { Reservation } from '../_shared/reservation';
import { DAY_SLOTS } from './schedule-data';

/**
 * 픽스처를 **오늘**에 고정한다 — 화면의 `anchor` 초기값이 오늘이고 주 뷰가 그 주를 그리므로,
 * 날짜를 상수로 박으면 그 주가 지난 순간 예약이 격자 밖으로 나가 테스트가 무의미해진다.
 * 페이지와 같은 헬퍼(`formatDate`)로 같은 기준의 날짜를 만든다 — 페이지의 '오늘'은 **서울의
 * 오늘**이므로(ERP-09) 여기서 로컬 기준으로 만들면 KST 가 아닌 존에서 하루 어긋난다.
 */
const TODAY = formatDate(new Date());

/**
 * 셀 안의 예약 칩 문구 — **상태(확정)가 글자로 들어 있어야 한다.**
 *
 * 예전엔 칩이 `10:00 김도현` 이었고 상태는 배지 **색**으로만 말했다 (tone=info). 그건 StatusBadge
 * 자신의 계약이 금지하는 것이다("색만으로 의미를 전달하지 않도록 label 문구가 상태 의미를 담는다"
 * — WCAG 1.4.1). 같은 화면 아래 상세 패널은 처음부터 label 에 상태를 넣고 있었으므로, 한 화면이
 * 같은 사실을 두 방식으로 말하던 셈이다. 이 상수가 그 수정을 고정한다 — '확정'이 빠지면 빨개진다.
 */
const CHIP_TEXT = '10:00 김도현 · 확정';

/** 시드 예약 한 벌 — 수용량 테스트가 이걸 바탕으로 자원·인원만 갈아 끼운다 */
const SEED_RESERVATION: Reservation = {
  id: 'rsv-1',
  code: 'RSV-TEST-001',
  customerName: '김도현',
  customerPhone: '010-1234-**56',
  date: TODAY,
  startTime: '10:00',
  endTime: '11:00',
  partySize: 3,
  resourceId: 'room-b',
  staffId: 'staff-kim',
  deposit: 30000,
  request: '',
  status: 'confirmed',
  memo: '',
};

const FIXTURE: readonly Reservation[] = [SEED_RESERVATION];

// 어댑터의 fetchAll 만 바꾼다 — 슬롯 정의·수용량·라벨은 진짜를 그대로 쓴다(importOriginal).
// 이 테스트의 주제는 '데이터가 오기 전/오는 중에 격자가 무엇을 말하는가' 이지 픽스처가 아니다.
const fetchAll = vi.hoisted(() => vi.fn());

vi.mock('../_shared/reservation-store', async (importOriginal) => {
  const original = await importOriginal<typeof import('../_shared/reservation-store')>();
  return {
    ...original,
    reservationAdapter: { ...original.reservationAdapter, fetchAll },
  };
});

const { default: ScheduleCalendarPage } = await import('./ScheduleCalendarPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/reservations/schedule']}>
        <ScheduleCalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

/** 스켈레톤은 aria-hidden 인 장식 span 이다 — 표시 여부를 그 존재로 읽는다 */
function skeletonCount(): number {
  return document.querySelectorAll('.tds-ui-skeleton').length;
}

/** 격자가 사실로 단정하는 '<점유 자원 수>/<전체 자원 수>' 셀 전부 — '0/4' · '1/4' … */
function countCells(): readonly HTMLElement[] {
  return screen.queryAllByText(/^\d+\/\d+$/);
}

/** 슬롯 셀 버튼(접근 이름 '<날짜> <슬롯> — 자원 N/M 사용') */
function slotButtons(): readonly HTMLElement[] {
  return screen.queryAllByRole('button', { name: /자원 \d+\/\d+ 사용/ });
}

/** 응답을 우리가 풀어 줄 때까지 pending 으로 붙잡는다 — '도는 동안'이 없으면 버그가 숨는다 */
function holdNextFetch(): (value: readonly Reservation[]) => void {
  let release: (value: readonly Reservation[]) => void = () => undefined;
  fetchAll.mockImplementationOnce(
    () =>
      new Promise<readonly Reservation[]>((resolve) => {
        release = resolve;
      }),
  );
  return (value) => {
    release(value);
  };
}

beforeEach(() => {
  fetchAll.mockReset();
  fetchAll.mockResolvedValue(FIXTURE);
});

describe('ScheduleCalendarPage — 최초 로드가 "예약 0건"으로 보이지 않는다 (STATE-01)', () => {
  it('응답 전에는 격자가 숫자를 말하지 않고 스켈레톤만 그린다 — 도착하면 숫자가 채워진다', async () => {
    const release = holdNextFetch();
    renderPage();

    // ── 최초 로드(data === undefined) ─────────────────────────────────────
    // 아직 아무것도 모른다. 여기서 '0/4' 가 하나라도 보이면 그건 화면이 거짓을 단정한 것이다.
    expect(countCells()).toHaveLength(0);
    expect(skeletonCount()).toBeGreaterThan(0);
    expect(screen.getByRole('grid', { name: '예약 일정 달력' }).getAttribute('aria-busy')).toBe(
      'true',
    );
    // 셀이 클릭 대상도 아니다 — 열어 봐야 '이 시간대에 예약이 없습니다'라는 또 하나의 거짓말뿐이다
    expect(slotButtons()).toHaveLength(0);
    expect(screen.getByText('불러오는 중…')).not.toBeNull();

    // ── 도착 ─────────────────────────────────────────────────────────────
    release(FIXTURE);

    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });
    // 이제 '0/4' 는 참이다 — '아직 모른다'가 아니라 '정말 0건'을 뜻한다
    expect(skeletonCount()).toBe(0);
    expect(countCells().length).toBeGreaterThan(0);
    expect(screen.getByText(CHIP_TEXT)).not.toBeNull();
    expect(screen.queryByText('불러오는 중…')).toBeNull();
  });

  it('데이터가 있는 채로 재조회하면 격자가 숫자를 그대로 유지한다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = renderPage();

    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    const release = holdNextFetch();
    // 예약 관리에서 저장·삭제하면 실제로 이것이 일어난다 (crud.ts 의 invalidateQueries — 같은 쿼리 키)
    void client.invalidateQueries({ queryKey: ['reservations', 'list'] });

    await waitFor(() => {
      expect(fetchAll).toHaveBeenCalledTimes(2);
    });

    // ── 재조회 중(isFetching && data !== undefined) ───────────────────────
    // 격자는 이전 예약을 그대로 들고 있어야 한다. 여기서 스켈레톤이 뜨면 운영자 눈앞에서
    // 방금 보던 일정이 사라진다 — 로딩이 아니라 고장으로 읽힌다.
    expect(skeletonCount()).toBe(0);
    expect(screen.getByText('1/4')).not.toBeNull();
    expect(screen.getByText(CHIP_TEXT)).not.toBeNull();
    expect(slotButtons().length).toBeGreaterThan(0);
    // 힌트도 최초 로드 문구로 되돌아가지 않는다 — 그리고 있는 격자가 이미 있다
    expect(screen.queryByText('불러오는 중…')).toBeNull();

    release(FIXTURE);
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });
  });
});

/**
 * 격자의 접근성 계약 — 이 화면을 FullCalendar 로 갈아엎지 **않기로 한** 판정의 근거이기도 하다.
 *
 * 도입 검토 결과(실측): FullCalendar v6 은 슬롯 간 화살표 이동이 없고(#6527·#6528, 2021 년부터
 * 열린 채 milestone v9), @fullcalendar/interaction 에는 키보드 리스너가 **0개**라 키보드로는
 * 슬롯을 아예 고를 수 없다. 게다가 TimeGrid 에는 (날짜 × 시간) 셀이 DOM 에 없어서 'N/M·마감'을
 * 걸 자리가 없다. 즉 91.86 kB(gzip)를 주고 이 파일이 지키는 것들을 **잃는** 거래였다.
 * 그래서 결함을 직접 고쳤고, 그 결과를 여기에 고정한다.
 */
describe('ScheduleCalendarPage — 격자 접근성 (WAI-ARIA Grid)', () => {
  it('role=grid 아래에 행이 있다 — 머리행 1 + 시간 슬롯 11', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    // 예전엔 행 래퍼가 display:contents + role 없음이라 **행이 0개**인 깨진 격자였다.
    const grid = screen.getByRole('grid', { name: '예약 일정 달력' });
    expect(within(grid).getAllByRole('row')).toHaveLength(DAY_SLOTS.length + 1);
  });

  it('셀은 gridcell 이고, 주 뷰는 11 슬롯 × 7 일 = 77칸이다', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    const grid = screen.getByRole('grid', { name: '예약 일정 달력' });
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(DAY_SLOTS.length * 7);
  });

  it('격자 전체가 탭 정지 하나다 — 77칸이 아니라 tabIndex=0 이 정확히 1칸', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    // 이것이 'Tab 77번' 결함의 본체다 — 격자는 목록이 아니라 2차원이므로 들고 나는 건 Tab 한 번이다.
    const tabbable = slotButtons().filter((cell) => cell.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(slotButtons().length).toBe(DAY_SLOTS.length * 7);
  });

  it('화살표로 칸을 옮긴다 — 오른쪽은 다음 날, 아래는 다음 시간', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    const cells = slotButtons();
    const first = cells[0];
    if (first === undefined) throw new Error('셀이 없다');
    first.focus();
    expect(document.activeElement).toBe(first);

    // → 같은 행(09:00)의 다음 열
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(cells[1]);

    // ↓ 같은 열의 다음 행 — 한 행은 7칸이므로 +7
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(cells[1 + 7]);

    // ← 되돌아온다
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(cells[7]);

    // End = 그 행의 마지막 열, Home = 첫 열
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(cells[7 + 6]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(cells[7]);
  });

  it('격자 가장자리에서 화살표는 넘어가지 않는다 — 첫 칸에서 ←/↑ 는 제자리', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    const cells = slotButtons();
    const first = cells[0];
    if (first === undefined) throw new Error('셀이 없다');
    first.focus();

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(first);
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(first);
  });

  it('오늘 열은 색으로만 말하지 않는다 — aria-current=date + 글자 표식', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    const grid = screen.getByRole('grid', { name: '예약 일정 달력' });
    const todayHeaders = within(grid)
      .getAllByRole('columnheader')
      .filter((head) => head.getAttribute('aria-current') === 'date');
    expect(todayHeaders).toHaveLength(1);
    expect(todayHeaders[0]?.textContent).toContain('오늘');
  });

  it('셀 이름이 칩과 마감을 삼키지 않는다 — 눈에 보이는 것은 귀에도 들린다', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    // 버튼의 aria-label 은 자기 안쪽을 통째로 덮는다 — 예전엔 SR 이 숫자만 듣고
    // 누가 예약했는지도 '마감'인지도 듣지 못했다.
    const booked = screen.getByRole('button', { name: /김도현/ });
    const label = booked.getAttribute('aria-label') ?? '';
    // 이 화면의 사실 자체는 그대로 앞에 남는다 — 숫자가 뜻하는 바(점유 자원 수)를 그대로 읽는다
    expect(label).toContain('자원 1/4 사용');
    expect(label).toContain('10:00 김도현');
    expect(label).toContain('확정'); // 상태는 색이 아니라 글자로도
  });

  it('뷰 토글이 눌린 상태를 사실로 말한다 — primary/secondary 는 색차일 뿐이다', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    // 초기값은 주 뷰다
    expect(screen.getByRole('button', { name: '주', pressed: true })).not.toBeNull();
    expect(screen.getByRole('button', { name: '일', pressed: false })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '일' }));
    expect(screen.getByRole('button', { name: '일', pressed: true })).not.toBeNull();
    expect(screen.getByRole('button', { name: '주', pressed: false })).not.toBeNull();

    // 일 뷰는 1열이므로 칸도 11개로 줄어든다 — 토글이 실제로 격자를 바꿨다는 확인
    const grid = screen.getByRole('grid', { name: '예약 일정 달력' });
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(DAY_SLOTS.length);
  });
});

/**
 * [수용량 모델] 셀의 숫자는 **점유된 자원 수**다 — 예약 건수가 아니다.
 *
 * 예전엔 분자가 `reservations.length` 였다. 건수(건)와 자원 수(개)는 **다른 양**인데 그 둘을
 * 비교했으니(비둘기집), 상담룸 B 한 곳에 4건이 몰리면 room-a·room-c·seat-1 이 텅 비었는데도
 * 격자가 '마감'이라 단언했다 — 그리고 같은 순간 폼은 room-a 신규 예약을 충돌 0건으로 통과시켰다.
 * 운영자는 달력을 보고 '자리가 없다'며 손님을 돌려보내지만 실제로는 방이 셋 비어 있었다.
 */
describe('ScheduleCalendarPage — 셀은 자원 점유를 센다', () => {
  /** 같은 자원(room-b)·같은 슬롯에 몰린 예약 n건 */
  function pileOnRoomB(count: number): readonly Reservation[] {
    return Array.from({ length: count }, (_, index) => ({
      ...SEED_RESERVATION,
      id: `rsv-pile-${String(index)}`,
      code: `RSV-PILE-${String(index)}`,
      resourceId: 'room-b',
    }));
  }

  it('한 자원에 4건이 몰려도 마감이 아니다 — 자원 3개는 그대로 비어 있다', async () => {
    fetchAll.mockResolvedValue(pileOnRoomB(4));
    renderPage();

    // 점유한 자원은 room-b 하나뿐 — 예전엔 여기가 '마감'이었다
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });
    expect(screen.queryByText('마감')).toBeNull();
  });

  it('한 자원에 예약이 겹치면 셀이 중복을 알린다 — 숫자만으로는 보이지 않으므로', async () => {
    fetchAll.mockResolvedValue(pileOnRoomB(4));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });

    // 색이 아니라 **글자**로 말한다 (WCAG 1.4.1) — 목록 화면의 '중복' 배지와 같은 낱말이다
    expect(screen.getByText('중복')).not.toBeNull();
    // 눈에 보이는 것은 귀에도 들린다 — 셀 이름에도 실린다
    const cell = screen.getByRole('button', { name: /자원 1\/4 사용/ });
    expect(cell.getAttribute('aria-label') ?? '').toContain('중복');
  });

  it('자원마다 1건씩이면 진짜 마감이다 — 중복은 아니다', async () => {
    fetchAll.mockResolvedValue(
      ['room-a', 'room-b', 'room-c', 'seat-1'].map((resourceId, index) => ({
        ...SEED_RESERVATION,
        id: `rsv-${resourceId}`,
        code: `RSV-FULL-${String(index)}`,
        partySize: 1,
        resourceId,
      })),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('마감')).not.toBeNull();
    });
    // 정상 만실은 중복이 아니다 — 예전엔 이 경우와 'room-b 4건'이 똑같이 보였다
    expect(screen.queryByText('중복')).toBeNull();
  });
});
