// TicketListPage — 조회 상태의 URL 직렬화(IA-13) · IME 안전 검색(COMP-10)
//
// [왜 이 화면으로 못 박는가] useListState 자체의 계약은 shared/crud/useListState.test.tsx 가 덮는다.
// 여기서 증명하는 것은 **롤아웃이 실제로 배선되었는가**다 — 훅이 옳아도 페이지가 URL 대신 useState 를
// 읽거나 searchInputProps 를 스프레드하지 않으면 화면은 예전 그대로다. 그 배선은 tsc 로 잡히지 않는다.
// 트리아지 큐(상태+우선순위+채널+유형 4축)를 가진 이 화면이 그 손실이 가장 큰 대표 화면이라
// 배치(sales·support·reservations 10개 화면)의 회귀 방어선을 여기에 세운다.
import { useEffect, useRef } from 'react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import TicketListPage from './TicketListPage';

const SEARCH_LABEL = '제목·문의번호·고객 검색';

/** 픽스처 — tkt-1(진행중·긴급·카카오), tkt-2(접수·높음·웹·배송) */
const TICKET_IN_PROGRESS = '결제가 두 번 청구되었습니다';
const TICKET_RECEIVED = '배송이 일주일째 오지 않아요';

/**
 * 커밋된 검색어(=쿼리 키)의 **변화 이력**을 기록한다.
 *
 * 'q 가 몇 번 바뀌었나' 가 곧 '조회가 몇 번 나갔나' 다 — TanStack Query 는 keyword 를 쿼리 키에
 * 넣으므로 커밋 한 번이 조회 한 번이다. 조합 중 자모마다 커밋되면 여기 'ㅂ'·'배'·'배소' 가 쌓인다.
 */
function KeywordProbe({ onKeyword }: { readonly onKeyword: (keyword: string) => void }) {
  const [params] = useSearchParams();
  const keyword = params.get('q') ?? '';

  // 콜백은 렌더마다 새 함수로 올 수 있다 — deps 에 넣으면 이력이 부풀어 계수가 틀어진다
  const onKeywordRef = useRef(onKeyword);
  onKeywordRef.current = onKeyword;
  useEffect(() => {
    onKeywordRef.current(keyword);
  }, [keyword]);

  return <output data-testid="keyword">{keyword}</output>;
}

function renderPage(url: string, onKeyword: (keyword: string) => void = () => undefined) {
  // 재시도 없이 픽스처 지연만 기다린다
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[url]}>
          <TicketListPage />
          <KeywordProbe onKeyword={onKeyword} />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const selectOf = (name: string) => screen.getByRole('combobox', { name });

describe('TicketListPage — 조회 상태가 URL 에 있다 (IA-13)', () => {
  /**
   * 이것이 IA-13 의 핵심이다. 상세에서 Back 하면 브라우저는 **이 URL 로 돌아올 뿐**이다 —
   * 그 URL 이 트리아지 세팅을 담고 있지 않으면 필터는 그때 사라진다. F5 도, 링크 공유도 같다.
   */
  it('필터가 걸린 URL 로 들어오면 그 view 를 복원한다 — 상태·우선순위·검색어가 살아서 온다', async () => {
    renderPage('/support/tickets?status=received&priority=high&q=%EB%B0%B0%EC%86%A1');

    // 조건에 맞는 문의만 남는다 — 4축이 전부 URL 에서 읽혔다는 뜻이다
    expect(await screen.findByText(TICKET_RECEIVED)).not.toBeNull();
    expect(screen.queryByText(TICKET_IN_PROGRESS)).toBeNull();

    // 컨트롤도 그 상태를 그린다 — 화면이 '지금 무엇으로 걸러져 있는지' 를 말해야 한다
    expect(selectOf('상태로 거르기')).toHaveProperty('value', 'received');
    expect(selectOf('우선순위로 거르기')).toHaveProperty('value', 'high');
    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveProperty('value', '배송');
  });

  it('필터를 바꾸면 URL 에 쓴다 — 복사한 링크가 같은 view 를 재현한다', async () => {
    const user = userEvent.setup();
    renderPage('/support/tickets');
    await screen.findByText(TICKET_IN_PROGRESS);

    await user.selectOptions(selectOf('상태로 거르기'), 'received');

    await waitFor(() => {
      expect(screen.queryByText(TICKET_IN_PROGRESS)).toBeNull();
    });
    expect(screen.getByText(TICKET_RECEIVED)).not.toBeNull();
    // 기본값('all')과 같은 값은 URL 에 남지 않는다 — 같은 화면이 두 개의 URL 을 갖지 않게
    expect(selectOf('채널로 거르기')).toHaveProperty('value', 'all');
  });

  /** 손으로 고친 URL 이 목록을 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다 (parseFilter) */
  it('URL 의 모르는 필터 값은 전체로 접는다', async () => {
    renderPage('/support/tickets?status=%EA%B1%B0%EC%A7%93%EB%A7%90');

    expect(await screen.findByText(TICKET_IN_PROGRESS)).not.toBeNull();
    expect(selectOf('상태로 거르기')).toHaveProperty('value', 'all');
  });
});

describe('TicketListPage — 한글(IME) 안전 검색 (COMP-10)', () => {
  /**
   * '배송' 두 글자를 치는 동안 change 는 'ㅂ'→'배'→'배소'→'배송' 으로 온다. 조합 중 커밋하면
   * 자모 단위 부분 문자열로 조회가 네 번 나가고, 조합 중 Enter 는 '배소' 같은 반쪽 단어를 제출한다.
   * 한국 운영자는 **전부 IME 로 입력하므로** 이 축이 깨지면 검색이 상시 어긋난다.
   */
  it('조합 중에는 조회하지 않고 조합이 끝난 뒤 완성된 단어로 한 번만 조회한다', async () => {
    vi.useFakeTimers();
    const commits: string[] = [];
    renderPage('/support/tickets', (keyword) => commits.push(keyword));

    const input = screen.getByLabelText(SEARCH_LABEL);
    fireEvent.compositionStart(input);
    // 자모마다 디바운스를 **넘긴다** — 조합 판정이 없다면 여기서 커밋이 네 번 나간다.
    // (디바운스만으로는 이 축을 못 막는다: 사람의 타건 간격은 250ms 를 쉽게 넘긴다.)
    for (const partial of ['ㅂ', '배', '배소', '배송']) {
      fireEvent.change(input, { target: { value: partial } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
    }

    // 조합 중 Enter 는 IME 의 **확정 키**다 — 제출이 아니다 ('배소' 로 검색되면 안 된다)
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // 디바운스를 네 번 넘겼는데도 커밋이 없다 — 최초 마운트의 '' 하나뿐이다
    expect(commits).toStrictEqual(['']);

    fireEvent.compositionEnd(input, { target: { value: '배송' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // 조합 전체가 조회 **한 번**으로 끝난다 — 'ㅂ'·'배'·'배소' 는 한 번도 나가지 않았다
    expect(commits).toStrictEqual(['', '배송']);
    vi.useRealTimers();
  });

  it('조합이 아닌 Enter 는 디바운스를 기다리지 않고 즉시 조회한다 (명시적 제출)', async () => {
    const commits: string[] = [];
    renderPage('/support/tickets', (keyword) => commits.push(keyword));

    const input = screen.getByLabelText(SEARCH_LABEL);
    fireEvent.change(input, { target: { value: 'CS-20260714-002' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // 검색어가 URL 로 갔다 = 조회의 쿼리 키가 되었다 (IA-13 + COMP-10 이 한 배선이다)
    await waitFor(() => {
      expect(commits).toContain('CS-20260714-002');
    });
    expect(await screen.findByText(TICKET_RECEIVED)).not.toBeNull();
    expect(screen.queryByText(TICKET_IN_PROGRESS)).toBeNull();
  });
});
