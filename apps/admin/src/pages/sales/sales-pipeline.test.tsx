// 영업 파이프라인이 **한 줄로 이어져 있는가** (저장소 + 렌더)
//
// ─────────────────────────────────────────────────────────────────────────────
// [운영자가 본 것 — 지어낸 상황이 아니다]
// "화면들이 따로 노는 느낌" 이었다. 실제로 끊겨 있었다:
//   ① 계약을 만들어도 **견적 상태가 그대로**였다 — 목록에서는 아무 일도 안 일어난 것처럼 보였다.
//   ② 견적 상세에 **상태를 바꾸는 컨트롤이 하나도 없었다** — 다음 칸(계약)은 '승인' 에서만 열리는데
//      발송을 승인으로 넘길 방법이 화면에 없어 버튼이 영원히 잠겨 있었다.
//   ③ 계약 → 프로젝트는 **아예 없었다**(프로젝트에 계약을 가리키는 필드가 한 칸도 없었다).
//
// [이 파일이 고정하는 것]
//   · 각 전이와 **거절 사유 문자열** — 거절은 boolean 이 아니라 문장이고 title/aria-label 에 실린다
//   · 되돌려 쓰기 — 계약이 생기면 견적이 실제로 '수주(계약 진행)'가 된다
//   · 중복 방어 — 두 번 눌러도 계약·프로젝트는 하나다(그리고 막다른 골목이 아니다)
//   · **반쪽 저장** — 트랜잭션이 없다. 계약은 됐는데 견적이 안 바뀌면 화면이 그 사실을 말한다
//   · 사슬 밖 생성 차단 — `/new` 주소로 들어와도 빈 폼이 아니라 다음 행동을 알려 주는 문장이 뜬다
//
// [왜 저장소와 렌더를 함께 태우나] 규칙만 보면 절반이다. 규칙이 열어 준 것을 화면이 실제로 그리고,
// 막은 것을 실제로 안 그리는지가 나머지 절반이다 — 그 둘이 갈라지는 것이 이 리포가 결함이라 부르는
// 바로 그 모양이다(./billing/BillingDetailPage.test.tsx 와 같은 관용구).
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { createWidgets } from '../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../shared/permissions/permission-store';
import { createMatrix } from '../../shared/permissions/resources';
import { ROLE_STATE_VERSION } from '../../shared/permissions/roles';
import { ToastProvider } from '../../shared/ui';

import QuoteDetailPage from './quotes/QuoteDetailPage';
import QuoteFormPage from './quotes/QuoteFormPage';
import ContractFormPage from './contracts/ContractFormPage';
import ProjectFormPage from './projects/ProjectFormPage';
import { findQuote, listQuotes, markQuoteOrdered, quoteAdapter } from './quotes/data-source';
import {
  QUOTE_CONVERT_NOT_ACCEPTED,
  quoteStatusAlready,
  quoteStatusTerminal,
  toQuoteInput,
} from './quotes/types';
import { createContractFromQuote, findContractIdByQuote } from './contracts/data-source';
import {
  createProjectFromContract,
  findProjectIdByContract,
  projectAdapter,
} from './projects/data-source';
import { PROJECT_DRAFT_DONE, PROJECT_DRAFT_NOT_CONCLUDED } from './projects/types';

/** 픽스처 응답 지연(400ms)이 있으므로 기본 1초로는 빠듯하다 */
const WAIT = { timeout: 4000 } as const;

/** 시드의 계약 — ct-1 은 진행중·서명완료(체결 끝), ct-2 는 검토중·서명대기(아직) */
const CONCLUDED_CONTRACT = {
  id: 'ct-1',
  title: '2026년 SaaS 연간 이용계약',
  accountId: 'acc-1',
  accountName: '(주)한빛소프트웨어',
  amount: 36000000,
  startAt: '2026-01-01',
  endAt: '2026-12-31',
  ownerName: '김영업',
} as const;

function seedFullPermissions(): void {
  usePermissionStore.setState({
    roleState: {
      version: ROLE_STATE_VERSION,
      roles: [
        {
          id: 'role-test',
          name: '테스트 역할',
          system: false,
          scope: 'all',
          permissions: createMatrix(true),
          widgets: createWidgets(true),
        },
      ],
      activeRoleId: 'role-test',
    },
  });
}

beforeEach(seedFullPermissions);

function renderAt(path: string, route: string, Page: ComponentType): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={<Page />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 저장소를 실제로 바꾼다 — 시드는 모듈 싱글턴이라 케이스마다 원하는 상태를 만들어 둔다 */
async function setQuoteStatus(id: string, status: 'draft' | 'sent' | 'accepted'): Promise<void> {
  const quote = await quoteAdapter.fetchOne(id, new AbortController().signal);
  await quoteAdapter.update(id, { ...toQuoteInput(quote), status });
}

/* ── ⓑ 상태 관리 UI — 전이와 거절 사유 ─────────────────────────────────────── */

describe('견적 상세의 상태 관리', () => {
  /* 이것이 없어서 '계약 만들기' 가 영원히 잠겨 있었다 — 사슬이 끊긴 자리 그 자체다. */
  it('발송된 견적은 승인·반려로 넘길 수 있다', async () => {
    await setQuoteStatus('qt-1', 'sent');
    renderAt('/sales/quotes/qt-1', '/sales/quotes/:id', QuoteDetailPage);

    const approve = await screen.findByRole('button', { name: /승인/ }, WAIT);
    expect(approve.hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: /반려/ }).hasAttribute('disabled')).toBe(false);
  });

  /* 거절은 boolean 이 아니라 사유 문자열이다 — 마우스에도(title) 스크린리더에도(aria-label)
     같은 문장이 실린다. 버튼만 죽어 있으면 운영자는 왜 못 누르는지 알 수 없다. */
  it('갈 수 없는 칸은 왜 못 가는지를 문장으로 말한다', async () => {
    await setQuoteStatus('qt-1', 'sent');
    renderAt('/sales/quotes/qt-1', '/sales/quotes/:id', QuoteDetailPage);

    const send = await screen.findByRole('button', { name: /발송/ }, WAIT);
    expect(send.hasAttribute('disabled')).toBe(true);
    expect(send.getAttribute('title')).toBe(quoteStatusAlready('sent'));
    expect(send.getAttribute('aria-label')).toContain(quoteStatusAlready('sent'));
  });

  /* 되돌리는 전이를 열면 '계약이 이미 생긴 견적을 되돌리면 무엇이 되는가' 에 답해야 한다.
     답할 수 없으므로 막고, 막은 이유를 화면이 말한다. */
  it('수주(계약 진행) 견적은 어느 칸으로도 되돌아가지 않는다', async () => {
    renderAt('/sales/quotes/qt-2', '/sales/quotes/:id', QuoteDetailPage);
    // qt-2 는 아래 되돌려 쓰기 테스트가 ordered 로 만들어 둘 수 있으므로 상태를 직접 맞춘다
    await waitFor(() => expect(findQuote('qt-2')).not.toBeUndefined(), WAIT);
    markQuoteOrdered('qt-2');

    renderAt('/sales/quotes/qt-2', '/sales/quotes/:id', QuoteDetailPage);
    const buttons = await screen.findAllByRole('button', { name: /발송/ }, WAIT);
    const terminal = buttons.find(
      (button) => button.getAttribute('title') === quoteStatusTerminal('ordered'),
    );
    expect(terminal).not.toBeUndefined();
  });
});

/* ── ⓒ 되돌려 쓰기 + 반쪽 저장 ─────────────────────────────────────────────── */

describe('계약 생성이 견적 상태를 실제로 바꾼다', () => {
  it('승인된 견적으로 계약을 만들면 견적이 수주(계약 진행)가 된다', async () => {
    await setQuoteStatus('qt-1', 'accepted');
    const quote = findQuote('qt-1');
    expect(quote).not.toBeUndefined();
    if (quote === undefined) return;

    const result = createContractFromQuote(quote, '2026-07-22');

    expect(result.created).toBe(true);
    // 되돌려 쓰기가 실제로 일어났다 — 이 단언이 예전에는 성립하지 않았다.
    expect(findQuote('qt-1')?.status).toBe('ordered');
    expect(result.quoteWriteBack).toBeNull();
    expect(findContractIdByQuote('qt-1')).toBe(result.contract.id);
  });

  /* 백엔드가 없어 트랜잭션이 없다. 계약은 만들어졌는데 견적 상태 갱신이 막히는 순간이 실재한다 —
     그때 성공을 흉내 내지 않고 **무엇이 됐고 무엇이 안 됐는지** 따로 말한다. */
  it('반쪽만 성공하면 성공을 흉내 내지 않는다 — 계약은 남고 사유가 돌아온다', async () => {
    await setQuoteStatus('qt-3', 'sent');
    const quote = findQuote('qt-3');
    expect(quote).not.toBeUndefined();
    if (quote === undefined) return;

    const result = createContractFromQuote(quote, '2026-07-22');

    expect(result.created).toBe(true);
    expect(result.quoteWriteBack).toBe(QUOTE_CONVERT_NOT_ACCEPTED);
    // 계약은 정말로 남아 있다 — 실패했다고 지어내지 않는다
    expect(findContractIdByQuote('qt-3')).toBe(result.contract.id);
    // 견적은 정말로 안 바뀌었다 — 바뀌었다고 지어내지도 않는다
    expect(findQuote('qt-3')?.status).toBe('sent');
  });

  /* 그 어긋남은 화면이 말한다. 픽스처의 ct-2 ↔ qt-2 도 같은 모양이라(이 규칙 이전에 맺은 계약)
     조용히 정상인 척하지 않는다. */
  it('계약은 있는데 상태가 따라오지 않은 견적은 화면이 그 사실과 고칠 길을 준다', async () => {
    await setQuoteStatus('qt-2', 'accepted');
    expect(findContractIdByQuote('qt-2')).not.toBe('');

    renderAt('/sales/quotes/qt-2', '/sales/quotes/:id', QuoteDetailPage);

    expect(await screen.findByText(/이미 계약이 있는데/, undefined, WAIT)).not.toBeNull();
    const fix = screen.getByRole('button', { name: '견적 상태 맞추기' });
    fireEvent.click(fix);
    await waitFor(() => expect(findQuote('qt-2')?.status).toBe('ordered'), WAIT);
  });

  /* 첫 번째 방어선은 버튼의 존재 조건, 두 번째가 이것이다 — 버튼이 잠깐 살아 있다가 죽는 사이에
     두 번 누른 사람이 두 번째 계약을 만들지 못하게 한다. */
  it('두 번 눌러도 계약은 하나다 — 견적 id 가 멱등키다', async () => {
    await setQuoteStatus('qt-1', 'accepted');
    const quote = findQuote('qt-1');
    if (quote === undefined) throw new Error('시드 없음');

    const first = createContractFromQuote(quote, '2026-07-22');
    const second = createContractFromQuote(quote, '2026-07-22');

    expect(second.contract.id).toBe(first.contract.id);
    expect(second.created).toBe(false);
  });
});

/* ── ⓓ 계약 완료 → 프로젝트 ────────────────────────────────────────────────── */

describe('체결된 계약이 프로젝트가 된다', () => {
  it('진행중·서명완료 계약에는 프로젝트 만들기가 있다', async () => {
    const existing = findProjectIdByContract('ct-1');
    if (existing !== '') await projectAdapter.remove(existing);

    renderAt('/sales/contracts/ct-1/edit', '/sales/contracts/:id/edit', ContractFormPage);

    expect(await screen.findByRole('button', { name: '프로젝트 만들기' }, WAIT)).not.toBeNull();
  });

  /* '계약 완료' 라는 상태는 없다 — 진행중 + 서명완료로 정의했고(./contracts/types 의
     isConcludedContract), 아직 아닌 계약은 **왜 아닌지**를 문장으로 말한다. */
  it('아직 체결이 안 끝난 계약은 이유를 말하고 버튼을 두지 않는다', async () => {
    renderAt('/sales/contracts/ct-2/edit', '/sales/contracts/:id/edit', ContractFormPage);

    expect(await screen.findByText(PROJECT_DRAFT_NOT_CONCLUDED, undefined, WAIT)).not.toBeNull();
    expect(screen.queryByRole('button', { name: '프로젝트 만들기' })).toBeNull();
  });

  it('두 번 눌러도 프로젝트는 하나다 — 계약 id 가 멱등키다', () => {
    const existing = findProjectIdByContract('ct-1');
    if (existing === '') createProjectFromContract(CONCLUDED_CONTRACT, '2026-07-22');

    const first = createProjectFromContract(CONCLUDED_CONTRACT, '2026-07-22');
    const second = createProjectFromContract(CONCLUDED_CONTRACT, '2026-07-22');

    expect(second.project.id).toBe(first.project.id);
    expect(second.created).toBe(false);
    expect(first.project.contractId).toBe('ct-1');
    // 계약이 파이프라인의 앞 칸을 이미 다 지났다 — 방금 도장 찍은 거래가 확률 10% 로 잡히지 않는다
    expect(first.project.stage).toBe('won');
  });

  /* 수동 등록을 막은 뒤 남는 걱정: 실수로 만든 프로젝트를 지우면 다시 만들 길이 없어지는가.
     없어지지 않는다 — 역방향 조회가 다시 '' 를 주고 계약의 버튼이 되살아난다. */
  it('잘못 만든 프로젝트를 지우면 다시 만들 수 있다 — 막다른 골목이 아니다', async () => {
    const { project } = createProjectFromContract(CONCLUDED_CONTRACT, '2026-07-22');
    expect(findProjectIdByContract('ct-1')).toBe(project.id);

    await projectAdapter.remove(project.id);

    expect(findProjectIdByContract('ct-1')).toBe('');
    const again = createProjectFromContract(CONCLUDED_CONTRACT, '2026-07-22');
    expect(again.created).toBe(true);
  });

  it('이미 프로젝트가 있으면 그 사실을 말하고 그리로 가는 길을 준다', async () => {
    if (findProjectIdByContract('ct-1') === '') {
      createProjectFromContract(CONCLUDED_CONTRACT, '2026-07-22');
    }

    renderAt('/sales/contracts/ct-1/edit', '/sales/contracts/:id/edit', ContractFormPage);

    expect(await screen.findByText(PROJECT_DRAFT_DONE, undefined, WAIT)).not.toBeNull();
    expect(screen.getByRole('link', { name: '연결된 프로젝트 열기' })).not.toBeNull();
  });
});

/* ── 사슬 밖 생성 차단 ─────────────────────────────────────────────────────── */

describe('/new 주소로 들어와도 빈 폼이 아니다', () => {
  /* 목록의 등록 버튼만 숨기면 막은 것이 아니다 — 주소창·즐겨찾기·옛 링크가 그대로 살아 있다.
     조용한 404 나 빈 화면은 고장과 구분되지 않으므로 **다음 행동**까지 말한다. */
  it('견적 — 문의에서 발행된다고 말하고 문의로 가는 길을 준다', () => {
    renderAt('/sales/quotes/new', '/sales/quotes/new', QuoteFormPage);

    expect(screen.getByText(/견적은 문의에서 발행돼요/)).not.toBeNull();
    expect(screen.getByRole('link', { name: '문의 내역으로' })).not.toBeNull();
    // 빈 폼이 열리지 않았다 — 저장 버튼 자체가 없다
    expect(screen.queryByRole('button', { name: '등록' })).toBeNull();
  });

  it('계약 — 견적에서 만들어진다고 말한다', () => {
    renderAt('/sales/contracts/new', '/sales/contracts/new', ContractFormPage);

    expect(screen.getByText(/계약은 견적에서 만들어져요/)).not.toBeNull();
    expect(screen.getByRole('link', { name: '견적 목록으로' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: '등록' })).toBeNull();
  });

  it('프로젝트 — 계약에서 만들어진다고 말한다', () => {
    renderAt('/sales/projects/new', '/sales/projects/new', ProjectFormPage);

    expect(screen.getByText(/프로젝트는 계약에서 만들어져요/)).not.toBeNull();
    expect(screen.getByRole('link', { name: '계약 목록으로' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: '등록' })).toBeNull();
  });
});

/* ── 픽스처가 규칙을 어기는 자리 ──────────────────────────────────────────── */

describe('이 규칙 이전의 데이터', () => {
  /* 시드에는 견적 없는 계약(ct-1·ct-3)과 계약 없는 프로젝트(prj-1~3)가 있다. 지우지 않는다 —
     실제로 있었던 거래이고, 소급해서 견적·계약을 지어내면 없던 문서가 생긴다. 대신 화면이 말한다. */
  it('견적 없는 계약은 그 사실을 밝힌다', async () => {
    renderAt('/sales/contracts/ct-3/edit', '/sales/contracts/:id/edit', ContractFormPage);

    expect(await screen.findByText(/견적 없이 등록된 계약이에요/, undefined, WAIT)).not.toBeNull();
  });

  it('계약 없는 프로젝트는 그 사실을 밝힌다', async () => {
    renderAt('/sales/projects/prj-2/edit', '/sales/projects/:id/edit', ProjectFormPage);

    expect(
      await screen.findByText(/계약 없이 등록된 프로젝트예요/, undefined, WAIT),
    ).not.toBeNull();
  });

  it('견적 목록의 시드는 문의 없는 견적을 포함한다 — 사슬 이전의 기록이다', () => {
    expect(listQuotes().some((quote) => quote.sources.length === 0)).toBe(true);
  });
});
