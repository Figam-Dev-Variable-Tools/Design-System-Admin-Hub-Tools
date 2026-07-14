// Badge — 계약 검증 테스트 (contracts/Badge.contract.json@1.0.0)
//
//   states[]   default
//   events     없음 → blockedWhen 없음 (비대화형 표시 전용 — 클릭 이벤트를 갖지 않는다)
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';

describe('Badge — 계약 states[]', () => {
  it('Badge: default 상태 — count 를 role=status 로 렌더한다', () => {
    render(<Badge count={7} />);
    const badge = screen.getByRole('status');

    expect(badge.textContent).toBe('7');
    expect(badge.className).toContain('tds-badge--neutral');
  });

  it('Badge: default 상태 — hideWhenZero=true(기본) 이고 count<=0 이면 렌더하지 않는다', () => {
    const { container } = render(<Badge count={0} />);

    expect(container.querySelector('.tds-badge')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('Badge: default 상태 — hideWhenZero=false 면 count=0 도 렌더한다', () => {
    render(<Badge count={0} hideWhenZero={false} />);

    expect(screen.getByRole('status').textContent).toBe('0');
  });
});
