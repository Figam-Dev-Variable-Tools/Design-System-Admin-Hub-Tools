// StatsCard — 계약 검증 테스트 (contracts/StatsCard.contract.json@1.1.0)
//
//   states[]   default · loading · error   (error 는 loading 보다 우선한다)
//   action     loading/error 에서도 **계속 렌더한다** (1.0.1 — hiddenWhen 오기 정정).
//              그 액션은 기간 토글 자신이다: 토글을 누르면 재조회가 시작되고, 슬롯을 언마운트하면
//              그 순간 토글이 사라진다 (헤더 레이아웃 점프 + 포커스 상실).
//   value      1.1.0 — KPI 수치는 display tier 로 body-md 위에 세운다 (TOKEN-05)
//   events     없음 → blockedWhen 없음
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import statsCardCss from './StatsCard.css?raw';
import { StatsCard } from './StatsCard';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

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

  it('StatsCard: default 상태 — value 를 주면 KPI 수치를 본문 위에 렌더한다 (1.1.0)', () => {
    render(
      <StatsCard title="방문자" value="12,345">
        <p>본문</p>
      </StatsCard>,
    );

    expect(screen.getByText('12,345')).not.toBeNull();
  });

  it('StatsCard: default 상태 — value 가 없으면 KPI 요소를 그리지 않는다 (차트/표 전용 카드)', () => {
    const { container } = render(
      <StatsCard title="방문자 추이">
        <p>본문</p>
      </StatsCard>,
    );

    expect(container.querySelector('.tds-statscard__value')).toBeNull();
  });

  it('StatsCard: TOKEN-05 — KPI 수치는 display tier 토큰으로 body-md 보다 크게 렌더된다', () => {
    // 대시보드의 지배적 숫자 — 제목/본문과 같은 크기대에 몰리면 KPI 가 읽히지 않는다
    const value = ruleBody(statsCardCss, '.tds-statscard__value');
    const body = ruleBody(statsCardCss, '.tds-statscard__body');

    expect(value).toContain('var(--tds-typography-display-sm-font-size)');
    expect(body).toContain('var(--tds-typography-body-md-font-size)');
    // 자릿수 폭 고정 — 값이 갱신돼도 숫자가 흔들리지 않는다
    expect(value).toContain('tabular-nums');
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
        error="데이터를 불러오지 못했어요."
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
      <StatsCard title="방문자 추이" error="데이터를 불러오지 못했어요.">
        <p>본문</p>
      </StatsCard>,
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('데이터를 불러오지 못했어요.');
    expect(screen.queryByText('본문')).toBeNull();
  });

  it('StatsCard: error 상태는 loading 상태보다 우선한다 (둘 다 켜지면 에러를 보여준다)', () => {
    const { container } = render(
      <StatsCard title="방문자 추이" loading error="데이터를 불러오지 못했어요.">
        <p>본문</p>
      </StatsCard>,
    );

    expect(screen.getByRole('alert')).not.toBeNull();
    expect(container.querySelector('.tds-statscard__skeleton')).toBeNull();
  });
});
