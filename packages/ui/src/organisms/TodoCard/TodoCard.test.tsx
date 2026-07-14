// TodoCard — 계약 검증 테스트 (contracts/TodoCard.contract.json@2.0.0)
//
//   states[]              default · loading
//   events.onItemClick    payload { key, event } · blockedWhen: ["loading"]
//
// **2.0.0 파괴적 변경**: payload 가 string(item.key) → { key, event } 로 바뀌었다 (ListCard 동일 판정).
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TodoCard } from './TodoCard';

const items = [
  { key: 'orders', label: '신규 주문', count: 3 },
  { key: 'inquiries', label: '미답변 문의', count: 0 },
];

describe('TodoCard — 계약 states[]', () => {
  it('TodoCard: default 상태 — 항목과 합계 뱃지를 렌더하고 aria-busy 가 없다', () => {
    render(<TodoCard items={items} />);
    const card = screen.getByRole('region', { name: /오늘의 할일/ });

    expect(card.getAttribute('aria-busy')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('3'); // 합계 = 3 + 0
    expect(screen.getByRole('button', { name: /신규 주문/ })).not.toBeNull();
  });

  it('TodoCard: default 상태 — count>0 은 강조, count=0 은 흐린 카운트 클래스를 쓴다', () => {
    const { container } = render(<TodoCard items={items} />);

    expect(container.querySelectorAll('.tds-todocard__count--pending')).toHaveLength(1);
    expect(container.querySelectorAll('.tds-todocard__count--empty')).toHaveLength(1);
  });

  it('TodoCard: loading 상태 — aria-busy=true + 스켈레톤을 렌더하고 항목을 렌더하지 않는다', () => {
    const { container } = render(<TodoCard items={items} loading />);
    const card = screen.getByRole('region', { name: /오늘의 할일/ });

    expect(card.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.tds-todocard__skeleton')).not.toBeNull();
    expect(screen.queryByText('신규 주문')).toBeNull();
  });
});

describe('TodoCard — 계약 events.onItemClick.blockedWhen', () => {
  it('TodoCard: loading 상태에서 onItemClick 이 발화하지 않는다', async () => {
    const onItemClick = vi.fn();
    render(<TodoCard items={items} loading onItemClick={onItemClick} />);

    // loading 중에는 클릭할 항목 자체가 렌더되지 않는다 — 그 사실을 못박고,
    // 카드 표면을 실제로 클릭해도 콜백이 발화하지 않음을 스파이로 단언한다.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    await userEvent.click(screen.getByRole('region', { name: /오늘의 할일/ }));

    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('TodoCard: loading 이 아니면 항목 클릭이 { key, event } 로 onItemClick 을 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onItemClick = vi.fn();
    render(<TodoCard items={items} onItemClick={onItemClick} />);

    await userEvent.click(screen.getByRole('button', { name: /신규 주문/ }));

    expect(onItemClick).toHaveBeenCalledTimes(1);
    const payload = onItemClick.mock.calls[0]?.[0] as { key: string; event: { type: string } };
    expect(payload.key).toBe('orders');
    expect(payload.event.type).toBe('click'); // 원본 MouseEvent 를 그대로 넘긴다 (2.0.0)
  });
});

describe('TodoCard — 2.0.0 SPA 내비게이션 탈출구', () => {
  it('TodoCard: href 있는 항목에서 호출부가 event.preventDefault() 로 기본 내비게이션을 가로챌 수 있다', () => {
    const navigate = vi.fn();
    const onItemClick = vi.fn((payload: { key: string; event: { preventDefault: () => void } }) => {
      payload.event.preventDefault();
      navigate(`/orders?status=${payload.key}`);
    });
    render(
      <TodoCard
        items={[{ key: 'new-order', label: '신규주문', count: 3, href: '#/orders?status=new' }]}
        onItemClick={onItemClick}
      />,
    );

    // fireEvent.click 은 기본 동작이 **취소되면** false 를 돌려준다 — preventDefault 의 증거다.
    const notCancelled = fireEvent.click(screen.getByRole('link', { name: /신규주문/ }));

    expect(notCancelled).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/orders?status=new-order');
  });

  it('TodoCard: 호출부가 preventDefault 를 하지 않으면 링크의 기본 동작이 살아 있다 (수식키·새탭은 브라우저에 맡긴다)', () => {
    const onItemClick = vi.fn();
    render(
      <TodoCard
        items={[{ key: 'new-order', label: '신규주문', count: 3, href: '#/orders?status=new' }]}
        onItemClick={onItemClick}
      />,
    );

    const notCancelled = fireEvent.click(screen.getByRole('link', { name: /신규주문/ }));

    expect(notCancelled).toBe(true);
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });
});
