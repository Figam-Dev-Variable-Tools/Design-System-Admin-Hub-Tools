// StatusBadge — 계약 검증 테스트 (contracts/StatusBadge.contract.json@1.0.0)
//
//   states[]   default
//   events     없음 → blockedWhen 없음 (비대화형 표시 전용 — 클릭 이벤트를 갖지 않는다)
//
// 계약 a11y: 색만으로 의미를 전달하지 않는다(WCAG 1.4.1) — label 텍스트가 상태 의미를 담는다 ·
//            별도 role(라이브 리전)을 두지 않는다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { StatusBadgeTone } from '../../../generated/types/StatusBadge.types';
import { StatusBadge } from './StatusBadge';

const ALL_TONES: readonly StatusBadgeTone[] = ['neutral', 'success', 'warning', 'danger', 'info'];

describe('StatusBadge — 계약 states[]', () => {
  it('StatusBadge: default 상태 — label 텍스트를 <span> 으로 렌더한다 (색이 아니라 문구가 의미를 담는다)', () => {
    render(<StatusBadge tone="success" label="게시" />);
    const badge = screen.getByText('게시');

    expect(badge.tagName).toBe('SPAN');
    expect(badge.className).toContain('tds-status-badge');
    expect(badge.className).toContain('tds-status-badge--success');
  });

  it('StatusBadge: default 상태 — 5개 tone 이 각자의 tone 클래스로 렌더된다 (combinationMatrix 전수)', () => {
    for (const tone of ALL_TONES) {
      const { unmount } = render(<StatusBadge tone={tone} label={`상태-${tone}`} />);
      const badge = screen.getByText(`상태-${tone}`);

      expect(badge.className).toContain(`tds-status-badge--${tone}`);
      unmount();
    }
  });

  it('StatusBadge: 비대화형 — 별도 role(라이브 리전)을 두지 않는다 (계약 a11y: no-live-region)', () => {
    render(<StatusBadge tone="danger" label="만료" />);

    // status 라이브 리전이 아니다 — 목록에 다수가 렌더되므로 과도한 통지를 피한다
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('만료').getAttribute('role')).toBeNull();
  });

  it('StatusBadge: 색만으로 의미를 전달하지 않는다 (WCAG 1.4.1) — label 문구가 항상 존재한다', () => {
    render(<StatusBadge tone="warning" label="예약" />);

    expect(screen.getByText('예약').textContent).toBe('예약');
  });
});
