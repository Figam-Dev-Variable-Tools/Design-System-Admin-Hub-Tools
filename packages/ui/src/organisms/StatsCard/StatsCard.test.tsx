// StatsCard — 계약 검증 테스트 (contracts/StatsCard.contract.json@1.0.1)
//
//   states[]   default · loading · error   (error 는 loading 보다 우선한다)
//   action     loading/error 에서도 **계속 렌더한다** (1.0.1 — hiddenWhen 오기 정정).
//              그 액션은 기간 토글 자신이다: 토글을 누르면 재조회가 시작되고, 슬롯을 언마운트하면
//              그 순간 토글이 사라진다 (헤더 레이아웃 점프 + 포커스 상실).
//   events     없음 → blockedWhen 없음
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatsCard } from './StatsCard';

describe('StatsCard — 계약 states[]', () => {
  it('StatsCard: default 상태 — 제목 + 액션 슬롯 + 본문을 렌더하고 aria-busy 가 없다', () => {
    render(
      <StatsCard title="방문자 추이" action={<button type="button">새로고침</button>}>
        <p>본문</p>
      </StatsCard>,
    );
    const card = screen.getByRole('region', { name: '방문자 추이' });

    expect(card.getAttribute('aria-busy')).toBeNull();
    expect(screen.getByRole('button', { name: '새로고침' })).not.toBeNull();
    expect(screen.getByText('본문')).not.toBeNull();
  });

  it('StatsCard: loading 상태 — aria-busy=true + 본문만 스켈레톤으로 대체하고 액션 슬롯은 떠 있는 채 유지한다 (계약 1.0.1)', () => {
    const { container } = render(
      <StatsCard title="방문자 추이" action={<button type="button">새로고침</button>} loading>
        <p>본문</p>
      </StatsCard>,
    );
    const card = screen.getByRole('region', { name: '방문자 추이' });

    expect(card.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.tds-statscard__skeleton').length).toBeGreaterThan(0);
    // 액션은 본문을 다시 불러오는 손잡이다 — 로딩 중에 사라지면 자기 클릭에 자기가 없어진다
    expect(screen.getByRole('button', { name: '새로고침' })).not.toBeNull();
    expect(screen.queryByText('본문')).toBeNull();
  });

  it('StatsCard: error 상태에서도 액션 슬롯은 유지된다 — 재조회 손잡이가 사라지면 사용자가 복구할 길이 없다', () => {
    render(
      <StatsCard
        title="방문자 추이"
        action={<button type="button">새로고침</button>}
        error="데이터를 불러오지 못했습니다."
      >
        <p>본문</p>
      </StatsCard>,
    );

    expect(screen.getByRole('alert')).not.toBeNull();
    expect(screen.getByRole('button', { name: '새로고침' })).not.toBeNull();
  });

  it('StatsCard: 로딩 중 비활성은 호출부의 몫이다 — StatsCard 는 슬롯을 그대로 렌더한다 (disabled 를 발명하지 않는다)', () => {
    render(
      <StatsCard
        title="방문자 추이"
        action={
          <button type="button" disabled>
            일 · 주 · 월
          </button>
        }
        loading
      >
        <p>본문</p>
      </StatsCard>,
    );

    const toggle = screen.getByRole('button', { name: '일 · 주 · 월' }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
  });

  it('StatsCard: error 상태 — role=alert 로 에러 문구를 즉시 통지하고 본문을 대체한다', () => {
    render(
      <StatsCard title="방문자 추이" error="데이터를 불러오지 못했습니다.">
        <p>본문</p>
      </StatsCard>,
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('데이터를 불러오지 못했습니다.');
    expect(screen.queryByText('본문')).toBeNull();
  });

  it('StatsCard: error 상태는 loading 상태보다 우선한다 (둘 다 켜지면 에러를 보여준다)', () => {
    const { container } = render(
      <StatsCard title="방문자 추이" loading error="데이터를 불러오지 못했습니다.">
        <p>본문</p>
      </StatsCard>,
    );

    expect(screen.getByRole('alert')).not.toBeNull();
    expect(container.querySelector('.tds-statscard__skeleton')).toBeNull();
  });
});
