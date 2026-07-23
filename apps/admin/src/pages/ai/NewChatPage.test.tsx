// 새 채팅 화면 — 답변이 **실제 데이터**이고, 못 알아들으면 그렇게 말한다
//
// [이 파일이 지키는 것] 파서 단위 테스트(_shared/parser.test.ts)는 문장 → 질의를 고정한다.
// 여기서는 화면까지 붙였을 때 관리자가 **무엇을 읽게 되는가**를 고정한다. 특히:
//   · 사용자 예시 질의가 실제 회원 행을 돌려주고, 기간을 걸 수 없었다는 사실을 함께 말한다
//   · 못 알아들은 요청에 표를 그리지 않는다 (지어낸 답이 나오지 않는다)
//   · 0건·실패·삭제된 대화에서 대화가 살아남는다
//
// [데이터를 목으로 바꾸지 않는다] 픽스처(shared/fixtures/members.ts)를 그대로 조회한다 —
// 목을 끼우면 '실제 데이터를 조회한다'는 바로 그 성질이 검증에서 빠진다.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { ToastProvider } from '../../shared/ui';
import { listConversations, resetConversations } from './_shared/conversations';
import NewChatPage from './NewChatPage';
// 회원 제공자 등록 부수효과 — 화면이 data-source 를 거쳐 얻는 것과 같은 배선이다
import './_shared/provider-members';

function newClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage(initialEntry = '/ai/chat') {
  return render(
    <QueryClientProvider client={newClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/ai/chat" element={<NewChatPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function ask(question: string): Promise<void> {
  const user = userEvent.setup();
  const input = screen.getByRole('combobox', { name: '질문 입력' });
  // paste 로 넣는다 — `@` 자동완성이 Enter 를 가로채지 않게(자동완성은 별도 테스트가 덮는다)
  await user.click(input);
  await user.paste(question);
  await user.click(screen.getByRole('button', { name: '보내기' }));
}

beforeEach(() => {
  resetConversations();

  /**
   * 픽스처 지연을 1ms 로 줄인다.
   *
   * 어댑터는 기본 400ms 를 기다린다(shared/crud 의 LATENCY_MS) — 화면에서 로딩 경로를 실제로
   * 보기 위한 값이다. 한 테스트가 조회를 여러 번 타므로 그대로 두면 파일 전체가 20초에 육박하고,
   * 병렬 실행에서 시간 초과로 넘어간다(실제로 그렇게 깨졌다). 지연 자체를 검증하는 테스트는
   * 없으므로 **제품이 이미 뚫어 둔 재현 스위치**(`?delay=`)로 줄인다 — 테스트용 목을 새로
   * 만들지 않는다. 라우터 상태(MemoryRouter)와는 별개라 `?q=` 검증에 영향이 없다.
   */
  window.history.replaceState({}, '', '/?delay=1');
});

describe('NewChatPage — 사용자 예시 질의', () => {
  const QUESTION = '@고객목록 의 이번달 구매 VIP 뽑아줘';

  it('기간을 걸 수 없었다는 사실을 먼저 말한다', async () => {
    renderPage();
    await ask(QUESTION);

    const notice = await screen.findByText(/누적 구매액.*기간 정보가 없어/);
    expect(notice).not.toBeNull();
  });

  it('기간을 뺀 조건으로 실제 회원 행을 돌려준다', async () => {
    renderPage();
    await ask(QUESTION);

    // 픽스처 규칙상 등급 VIP(i%5==0, i%17!=0) ∩ 누적구매>0(i%11==0) = i%55==0 → 9명
    expect(await screen.findByText('회원 목록 9건을 찾았어요.')).not.toBeNull();
    expect(screen.getByText('조건 — 등급 VIP · 누적 구매액 있음')).not.toBeNull();

    // 표의 값이 실제 픽스처 행이어야 한다 — 등급 칸이 전부 VIP 다
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(9);
    for (const row of rows) {
      expect(within(row).getAllByRole('cell')[2]?.textContent).toBe('VIP');
    }
  });

  it('원본 목록 화면으로 건너갈 링크를 준다', async () => {
    renderPage();
    await ask(QUESTION);

    const link = await screen.findByRole('link', { name: '목록 화면에서 보기' });
    expect(link.getAttribute('href')).toBe('/users/members?tier=vip');
  });

  it('대신 해볼 수 있는 질의를 후속 제안으로 띄운다', async () => {
    renderPage();
    await ask(QUESTION);

    const followUp = await screen.findByRole('button', { name: /↳.*가입/ });
    expect(followUp).not.toBeNull();
  });
});

describe('NewChatPage — 알아듣지 못한 요청', () => {
  it('멘션이 없으면 표를 그리지 않고 할 수 있는 것을 말한다', async () => {
    renderPage();
    await ask('이번달 매출이 왜 떨어졌어?');

    expect(await screen.findByText('어떤 데이터를 봐야 할지 알 수 없어요.')).not.toBeNull();
    // 표가 없어야 한다 — 못 알아들은 요청에 결과를 지어내지 않는다
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('모르는 도메인을 멘션하면 그 이름을 짚어 말한다', async () => {
    renderPage();
    await ask('@배송목록 보여줘');

    expect(
      await screen.findByText(/'@배송목록' 는 조회할 수 있는 데이터가 아니에요/),
    ).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('분석·예측 요청은 할 수 없다고 말한다', async () => {
    renderPage();
    await ask('@회원목록 이탈 원인 분석해줘');

    expect(await screen.findByText(/이 화면이 할 수 없는 요청이에요/)).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('NewChatPage — 결과가 0건', () => {
  it('빈 상태를 보여주고 조건을 푸는 후속 제안을 준다', async () => {
    renderPage();
    // 오늘 가입한 VVIP — 픽스처의 가입일은 2026-06~07 범위라 '오늘'에는 걸리지 않는다
    await ask('@회원목록 오늘 가입한 VVIP 보여줘');

    expect(await screen.findByText('회원 목록에서 조건에 맞는 대상이 없어요.')).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('button', { name: /↳ 조건 없이/ })).not.toBeNull();
  });
});

describe('NewChatPage — 접근성', () => {
  it('응답 도착을 라이브 리전으로 알린다', async () => {
    renderPage();
    // 토스트 영역도 role="status" 라 이름으로 집는다
    const status = screen.getByRole('status', { name: '응답 상태' });
    expect(status.getAttribute('aria-live')).toBe('polite');

    await ask('@회원목록 VIP 보여줘');
    await waitFor(() => {
      expect(status.textContent).toContain('응답이 도착했어요');
    });
  });

  it('결과 표에 접근 가능한 이름(caption)이 붙는다', async () => {
    renderPage();
    await ask('@회원목록 VIP 보여줘');

    const table = await screen.findByRole('table');
    expect(within(table).getByText(/회원 목록 조회 결과/)).not.toBeNull();
  });
});

describe('NewChatPage — 최초 로드가 빈 상태로 번쩍이지 않는다 (STATE-01)', () => {
  it('대화를 처음 불러오는 동안 빈 상태 대신 로딩을 그린다', async () => {
    // 먼저 대화를 하나 만들어 id 를 얻는다
    renderPage();
    await ask('@회원목록 VIP 보여줘');
    await screen.findByText(/회원 목록 \d+건을 찾았어요\./);
    const [conversation] = listConversations();
    expect(conversation).not.toBeUndefined();

    // 그 대화를 `?c=` 로 새로 연다 — 조회가 도착하기 전 프레임이 관심사다
    cleanup();
    renderPage(`/ai/chat?c=${conversation?.id ?? ''}`);

    // 도착 전에는 '무엇을 조회할까요?' 가 아니라 로딩이어야 한다.
    // (이 단언이 곧 회귀 방지다 — 예전에는 빈 상태가 렌더됐다.)
    expect(screen.queryByText('무엇을 조회할까요?')).toBeNull();
    expect(screen.getByText('대화를 불러오는 중…')).not.toBeNull();

    // 도착하면 메시지가 나온다
    await screen.findByText('@회원목록 VIP 보여줘');
    expect(screen.queryByText('대화를 불러오는 중…')).toBeNull();
  });
});

describe('NewChatPage — 레일 검색어가 URL 에 실린다 (IA-13)', () => {
  it('`?q=` 로 들어오면 기록이 그 검색어로 좁혀진 채 복원된다', async () => {
    renderPage();
    await ask('@회원목록 VIP 보여줘');
    await screen.findByText(/회원 목록 \d+건을 찾았어요\./);

    cleanup();
    // 링크 공유·새로고침을 재현한다 — 검색어가 URL 에서 온다
    renderPage('/ai/chat?q=없는검색어');

    const search = await screen.findByRole('searchbox', { name: '대화 검색' });
    expect(search).toHaveProperty('value', '없는검색어');
    await waitFor(() => {
      expect(screen.getByText('검색 결과가 없어요.')).not.toBeNull();
    });
  });
});

describe('NewChatPage — 대화가 이어진다', () => {
  it('두 번 물으면 두 질문과 두 답이 모두 남는다', async () => {
    renderPage();
    await ask('@회원목록 VIP 보여줘');
    await screen.findByText(/회원 목록 \d+건을 찾았어요\./);

    await ask('@회원목록 VVIP 보여줘');
    await waitFor(() => {
      expect(screen.getByText('@회원목록 VIP 보여줘')).not.toBeNull();
      expect(screen.getByText('@회원목록 VVIP 보여줘')).not.toBeNull();
    });
  });
});
