// 최초 로드 중인 격자가 '0/4' 라고 말하지 않는다 (STATE-01) — apps/admin/src/pages/reservations/schedule/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면의 셀은 '<예약 수>/<수용량>' 이라는 **사실 진술**이다. 그런데 격자가 `data ?? []` 만
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
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDate } from '../../../shared/format';
import type { Reservation } from '../_shared/reservation';

/**
 * 픽스처를 **오늘**에 고정한다 — 화면의 `anchor` 초기값이 오늘이고 주 뷰가 그 주를 그리므로,
 * 날짜를 상수로 박으면 그 주가 지난 순간 예약이 격자 밖으로 나가 테스트가 무의미해진다.
 * 페이지와 같은 헬퍼(`formatDate`)로 같은 기준의 날짜를 만든다 — 페이지의 '오늘'은 **서울의
 * 오늘**이므로(ERP-09) 여기서 로컬 기준으로 만들면 KST 가 아닌 존에서 하루 어긋난다.
 */
const TODAY = formatDate(new Date());

const FIXTURE: readonly Reservation[] = [
  {
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
  },
];

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

/** 격자가 사실로 단정하는 '<예약 수>/<수용량>' 셀 전부 — '0/4' · '1/4' … */
function countCells(): readonly HTMLElement[] {
  return screen.queryAllByText(/^\d+\/\d+$/);
}

/** 슬롯 셀 버튼(접근 이름 '<날짜> <슬롯> — 예약 N건 / 수용 M건') */
function slotButtons(): readonly HTMLElement[] {
  return screen.queryAllByRole('button', { name: /예약 \d+건 \/ 수용 \d+건/ });
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
    expect(screen.getByText(`10:00 ${FIXTURE[0]?.customerName ?? ''}`)).not.toBeNull();
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
    expect(screen.getByText(`10:00 ${FIXTURE[0]?.customerName ?? ''}`)).not.toBeNull();
    expect(slotButtons().length).toBeGreaterThan(0);
    // 힌트도 최초 로드 문구로 되돌아가지 않는다 — 그리고 있는 격자가 이미 있다
    expect(screen.queryByText('불러오는 중…')).toBeNull();

    release(FIXTURE);
    await waitFor(() => {
      expect(screen.getByText('1/4')).not.toBeNull();
    });
  });
});
