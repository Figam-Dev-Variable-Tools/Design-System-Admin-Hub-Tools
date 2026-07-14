// ListCard — 계약 검증 테스트 (contracts/ListCard.contract.json@2.0.0)
//
//   states[]             default · loading
//   events.onRowClick    payload { id, event } · blockedWhen: ["loading"]
//
// **2.0.0 파괴적 변경**: payload 가 string(row.id) → { id, event } 로 바뀌었다.
// 이 event 가 없으면 href 있는 행은 좌클릭 시 전체 페이지 새로고침이 된다 (SPA 내비 불가).
// 그래서 "호출부가 preventDefault 로 기본 내비게이션을 가로챌 수 있다"를 직접 단언한다.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListCard } from './ListCard';

const rows = [
  { id: 'o-1', title: '주문 1024번', meta: '김철수 · 3분 전' },
  { id: 'o-2', title: '주문 1025번', meta: '이영희 · 9분 전' },
];

describe('ListCard — 계약 states[]', () => {
  it('ListCard: default 상태 — 제목 + 카운트 뱃지 + 행 목록을 렌더하고 aria-busy 가 없다', () => {
    render(<ListCard title="최근 주문" count={12} rows={rows} />);
    const card = screen.getByRole('region', { name: /최근 주문/ });

    expect(card.getAttribute('aria-busy')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('12');
    expect(screen.getAllByRole('button')).toHaveLength(rows.length);
  });

  it('ListCard: default 상태 — rows 가 비면 empty 문구를 렌더한다', () => {
    render(<ListCard title="최근 주문" rows={[]} empty="주문이 없습니다." />);

    expect(screen.getByText('주문이 없습니다.')).not.toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('ListCard: loading 상태 — aria-busy=true + 스켈레톤을 렌더하고 행을 렌더하지 않는다', () => {
    const { container } = render(<ListCard title="최근 주문" count={12} rows={rows} loading />);
    const card = screen.getByRole('region', { name: /최근 주문/ });

    expect(card.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.tds-listcard__skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('주문 1024번')).toBeNull();
  });
});

describe('ListCard — 계약 events.onRowClick.blockedWhen', () => {
  it('ListCard: loading 상태에서 onRowClick 이 발화하지 않는다', async () => {
    const onRowClick = vi.fn();
    render(<ListCard title="최근 주문" rows={rows} loading onRowClick={onRowClick} />);

    // loading 중에는 클릭할 행 자체가 렌더되지 않는다 — 그 사실을 먼저 못박고,
    // 카드 표면을 실제로 클릭해도 콜백이 발화하지 않음을 스파이로 단언한다.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    await userEvent.click(screen.getByRole('region', { name: /최근 주문/ }));

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('ListCard: loading 이 아니면 행 클릭이 { id, event } 로 onRowClick 을 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onRowClick = vi.fn();
    render(<ListCard title="최근 주문" rows={rows} onRowClick={onRowClick} />);

    await userEvent.click(screen.getByRole('button', { name: /주문 1025번/ }));

    expect(onRowClick).toHaveBeenCalledTimes(1);
    const payload = onRowClick.mock.calls[0]?.[0] as { id: string; event: { type: string } };
    expect(payload.id).toBe('o-2');
    expect(payload.event.type).toBe('click'); // 원본 MouseEvent 를 그대로 넘긴다 (2.0.0)
  });
});

describe('ListCard — 2.0.0 SPA 내비게이션 탈출구', () => {
  it('ListCard: href 있는 행에서 호출부가 event.preventDefault() 로 기본 내비게이션을 가로챌 수 있다', () => {
    const navigate = vi.fn();
    const onRowClick = vi.fn((payload: { id: string; event: { preventDefault: () => void } }) => {
      payload.event.preventDefault();
      navigate(`/orders/${payload.id}`);
    });
    render(
      <ListCard
        title="최근 주문"
        rows={[{ id: 'o-1', title: '주문 1024번', href: '#/orders/o-1' }]}
        onRowClick={onRowClick}
      />,
    );

    // fireEvent.click 은 기본 동작이 **취소되면** false 를 돌려준다 — 그게 preventDefault 의 증거다.
    const notCancelled = fireEvent.click(screen.getByRole('link', { name: /주문 1024번/ }));

    expect(notCancelled).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/orders/o-1');
  });

  it('ListCard: 호출부가 preventDefault 를 하지 않으면 링크의 기본 동작이 살아 있다 (수식키·새탭은 브라우저에 맡긴다)', () => {
    const onRowClick = vi.fn();
    render(
      <ListCard
        title="최근 주문"
        rows={[{ id: 'o-1', title: '주문 1024번', href: '#/orders/o-1' }]}
        onRowClick={onRowClick}
      />,
    );

    const notCancelled = fireEvent.click(screen.getByRole('link', { name: /주문 1024번/ }));

    expect(notCancelled).toBe(true);
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });
});
