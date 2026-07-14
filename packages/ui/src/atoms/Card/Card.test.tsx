// Card — 계약 검증 테스트 (contracts/Card.contract.json@1.0.0)
//
//   states[]   default · loading   (loading 은 busy prop 으로 진입 — 계약 a11y.ariaBusy: "when busy")
//   events     없음 → blockedWhen 없음
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card — 계약 states[]', () => {
  it('Card: default 상태 — aria-busy 없이 children 을 담은 surface 로 렌더된다', () => {
    render(
      <Card aria-label="통계">
        <p>본문</p>
      </Card>,
    );
    const card = screen.getByRole('region', { name: '통계' });

    expect(card.getAttribute('aria-busy')).toBeNull();
    expect(card.className).toContain('tds-card--md');
    expect(card.textContent).toContain('본문');
  });

  it('Card: loading 상태 — busy=true 가 aria-busy="true" 로 반영된다', () => {
    render(
      <Card busy aria-label="통계">
        <p>본문</p>
      </Card>,
    );
    const card = screen.getByRole('region', { name: '통계' });

    expect(card.getAttribute('aria-busy')).toBe('true');
  });

  it('Card: default 상태 — padding prop 이 클래스로 반영된다 (계약 enum: none | sm | md | lg)', () => {
    render(
      <Card padding="lg" aria-label="통계">
        <p>본문</p>
      </Card>,
    );

    expect(screen.getByRole('region', { name: '통계' }).className).toContain('tds-card--lg');
  });
});
