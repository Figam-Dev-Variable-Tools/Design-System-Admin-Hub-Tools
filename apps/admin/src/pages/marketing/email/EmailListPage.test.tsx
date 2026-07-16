// EmailListPage — 조회 상태의 URL 직렬화(IA-13) + IME 안전 검색(COMP-10)
//
// [훅의 계약은 이미 shared/crud 에서 못 박혀 있는데 왜 화면에서 또 보는가]
// 여기서 증명하는 것은 훅이 아니라 **배선**이다. useListState 가 아무리 옳아도 화면이 그것을 URL 에
// 연결하지 않았거나, 검색창에 searchInputProps 스프레드를 빠뜨렸거나, URL 문자열을 도메인 유니온으로
// 되돌리지 않으면 — 화면은 예전 그대로 조용히 틀린 채 초록불을 받는다. 컴파일도 되고 훅 테스트도 통과한다.
//
// 이 배치에서 마케팅·상품의 목록 8개가 같은 방식으로 전환됐고(email·events·newsletters·promotions·
// sms·templates·coupons·reviews), 이 화면이 그 전환의 대표 표본이다. 여덟 곳이 공유하는 형태가
// 여기서 깨지면 나머지도 같이 깨져 있다고 봐야 한다.
//
// E2E 는 이 배치에서 금지(포트 충돌)라 jsdom 에서 실제 provider · 실제 MemoryRouter 로 렌더한다 —
// URL 이 상태의 원천이라는 주장은 **진짜 라우터** 위에서만 증명된다.
import { useEffect } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import EmailListPage from './EmailListPage';

/** 픽스처(data-source.ts) — 상태가 서로 달라 필터 복원을 눈으로 관측할 수 있는 세 건 */
const SENT_NAME = '7월 뉴스레터 발송'; // status: sent
const SCHEDULED_NAME = 'VIP 단독 할인 안내'; // status: scheduled
const DRAFT_NAME = '장바구니 리마인드'; // status: draft

/**
 * URL 이 바뀔 때마다 search 를 기록한다.
 *
 * 최종값만 보면 '몇 번 조회가 나갔는가'를 알 수 없다 — COMP-10 이 막으려는 것이 정확히 그것(자모마다
 * 한 번씩)이므로, 커밋 **횟수**를 세려면 변화의 이력이 필요하다.
 */
let urlLog: string[] = [];

function UrlProbe() {
  const location = useLocation();
  useEffect(() => {
    urlLog.push(location.search);
  }, [location.search]);
  return null;
}

function renderAt(initialUrl: string) {
  // 재시도 없음 — 픽스처 지연만 기다리고 실패는 즉시 드러낸다
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialUrl]}>
          <UrlProbe />
          <EmailListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const lastUrl = (): string => urlLog[urlLog.length - 1] ?? '';
const paramOf = (key: string): string | null => new URLSearchParams(lastUrl()).get(key);
/** URL 에 커밋된 검색어의 이력 — 인코딩에 흔들리지 않게 파싱해서 본다 */
const keywordLog = (): string[] =>
  urlLog.map((search) => new URLSearchParams(search).get('q') ?? '');

/** getByLabelText 는 HTMLElement 를 준다 — select 로 좁히는 판정을 한곳에 모은다(캐스팅 금지) */
function selectByLabel(label: string): HTMLSelectElement {
  const element = screen.getByLabelText(label);
  if (!(element instanceof HTMLSelectElement)) throw new Error(`'${label}' 은 select 가 아니다`);
  return element;
}

function searchInput(): HTMLInputElement {
  const element = screen.getByLabelText('발송명·제목 검색');
  if (!(element instanceof HTMLInputElement)) throw new Error('검색창이 input 이 아니다');
  return element;
}

/** 픽스처 지연(400ms)과 디바운스(250ms)를 함께 넘긴다 — 실시간을 기다리면 느리고 불안정하다 */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  urlLog = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EmailListPage — 조회 상태의 원천은 URL 이다 (IA-13)', () => {
  /**
   * 이 배치가 고치는 운영 손실 그 자체: 필터를 걸고 한 건을 연 뒤 Back 하면 예전에는 필터가 풀린
   * 전체 목록에 착지했다. URL 이 원천이면 그 URL 이 곧 view 이므로 Back·F5 가 조건을 되살린다.
   */
  it('필터가 걸린 URL 이 그 view 를 복원한다 — 상세에서 Back 해도 조건이 살아 있다', async () => {
    renderAt('/marketing/email?status=scheduled');

    expect(await screen.findByText(SCHEDULED_NAME)).not.toBeNull();
    expect(screen.queryByText(SENT_NAME)).toBeNull();
    expect(screen.queryByText(DRAFT_NAME)).toBeNull();
    // 화면도 '무엇으로 걸러져 있는지'를 말해야 한다 — select 가 URL 을 따라간다
    expect(selectByLabel('발송상태로 거르기').value).toBe('scheduled');
  });

  it('검색어가 담긴 URL 이 그 view 를 복원한다 — F5 로 검색이 날아가지 않는다', async () => {
    renderAt('/marketing/email?q=장바구니');

    expect(await screen.findByText(DRAFT_NAME)).not.toBeNull();
    expect(screen.queryByText(SENT_NAME)).toBeNull();
    // 입력창도 복원된다 — 결과만 걸러지고 검색창이 비어 있으면 왜 걸러졌는지 알 수 없다
    expect(searchInput().value).toBe('장바구니');
  });

  it('필터와 검색어가 함께 걸린 URL 도 복원한다 — 공유 링크는 보통 두 축이 겹쳐 있다', async () => {
    // '뉴스레터' 는 em-1(sent) 만 맞는다 — status=sent 와 함께 걸어도 살아남는다
    renderAt('/marketing/email?status=sent&q=뉴스레터');

    expect(await screen.findByText(SENT_NAME)).not.toBeNull();
    expect(screen.queryByText(SCHEDULED_NAME)).toBeNull();
    expect(selectByLabel('발송상태로 거르기').value).toBe('sent');
    expect(searchInput().value).toBe('뉴스레터');
  });

  it('필터를 바꾸면 URL 에 쓴다 — 그래야 그 view 의 링크가 존재한다', async () => {
    renderAt('/marketing/email');
    await screen.findByText(SENT_NAME);

    fireEvent.change(selectByLabel('발송상태로 거르기'), { target: { value: 'draft' } });

    expect(paramOf('status')).toBe('draft');
    expect(await screen.findByText(DRAFT_NAME)).not.toBeNull();
    expect(screen.queryByText(SENT_NAME)).toBeNull();
  });

  /** '?status=all' 같은 URL 을 만들지 않는다 — 같은 화면이 두 개의 URL 을 갖게 된다 */
  it('기본값(전체)로 되돌리면 URL 에서 지운다', async () => {
    renderAt('/marketing/email?status=draft');
    await screen.findByText(DRAFT_NAME);

    fireEvent.change(selectByLabel('발송상태로 거르기'), { target: { value: 'all' } });

    expect(lastUrl()).toBe('');
    expect(await screen.findByText(SENT_NAME)).not.toBeNull();
  });

  /**
   * 손으로 고친 URL(오타·옛 링크)이 목록을 깨서는 안 된다. parseFilter 가 허용 목록에 없는 값을
   * '전체'로 되돌리므로 화면은 잘못된 상태로 좁혀지지 않는다.
   */
  it('모르는 status 값은 전체로 되돌린다 — 손으로 고친 URL 이 목록을 깨지 않는다', async () => {
    renderAt('/marketing/email?status=거짓말');

    expect(await screen.findByText(SENT_NAME)).not.toBeNull();
    expect(screen.getByText(SCHEDULED_NAME)).not.toBeNull();
    expect(screen.getByText(DRAFT_NAME)).not.toBeNull();
    expect(selectByLabel('발송상태로 거르기').value).toBe('all');
  });
});

describe('EmailListPage — IME 안전 검색 (COMP-10)', () => {
  /**
   * 한국 운영자는 전부 IME 로 입력한다. '장바구니'를 치는 동안 change 는 'ㅈ→자→장→장바구니'로
   * 여러 번 오는데, 조합 중에 커밋하면 자모 부분 문자열('자')로 조회가 나가고 화면이 그때마다 뒤집힌다.
   * 영어 QA 에는 조합 이벤트가 없어 이 축이 보이지 않는다 — 그래서 여기서 못 박는다.
   */
  it('조합 중에는 커밋하지 않고, 조합이 끝난 뒤 완성된 값으로 한 번만 커밋한다', async () => {
    vi.useFakeTimers();
    renderAt('/marketing/email');
    await advance(500); // 픽스처 로드까지 끝낸 상태에서 시작한다

    const input = searchInput();
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ㅈ' } });
    await advance(300);
    fireEvent.change(input, { target: { value: '자' } });
    await advance(300);
    fireEvent.change(input, { target: { value: '장' } });
    await advance(300);
    fireEvent.change(input, { target: { value: '장바구니' } });
    await advance(300);

    // 조합 중에는 디바운스를 몇 번 넘겨도 URL 이 그대로다 — 조회가 한 번도 나가지 않았다
    expect(keywordLog()).toEqual(['']);

    fireEvent.compositionEnd(input, { target: { value: '장바구니' } });
    await advance(300);

    // 커밋은 **정확히 한 번** — 완성된 '장바구니' 하나만 URL 에 남는다
    expect(keywordLog()).toEqual(['', '장바구니']);
    expect(screen.getByText(DRAFT_NAME)).not.toBeNull();
    expect(screen.queryByText(SENT_NAME)).toBeNull();
  });

  /**
   * 조합 중 Enter 는 **IME 의 확정 키**이지 제출이 아니다. 이것을 제출로 처리하면 '장바구ㄴ' 같은
   * 부분 문자열이 나간다 — 사용자는 글자를 완성했을 뿐인데 화면이 엉뚱한 결과로 바뀐다.
   */
  it('조합 중 Enter 는 제출하지 않는다 — 부분 문자열로 조회가 나가지 않는다', async () => {
    vi.useFakeTimers();
    renderAt('/marketing/email');
    await advance(500);

    const input = searchInput();
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '장바구ㄴ' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(keywordLog()).toEqual(['']);
  });

  it('조합이 아닌 Enter 는 디바운스를 기다리지 않고 즉시 커밋한다 (명시적 제출)', async () => {
    vi.useFakeTimers();
    renderAt('/marketing/email');
    await advance(500);

    const input = searchInput();
    fireEvent.change(input, { target: { value: 'VIP' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(paramOf('q')).toBe('VIP');
  });
});
