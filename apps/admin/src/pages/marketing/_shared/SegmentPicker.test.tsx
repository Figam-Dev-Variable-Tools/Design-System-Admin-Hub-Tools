// SegmentPicker — required 가 AT 에 닿는 경로 (A11Y-11) · apps/admin/src/pages/marketing/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 그리고 무엇을 **하지 않기로** 했나]
// 이 필드의 마커(*)는 aria-hidden 장식이고, 이 필드는 FormField 를 거치지 않으므로
// withAriaRequired 주입도 받지 못한다 — required 가 AT 에 닿는 경로가 0개였다.
//
// ⚠ **고치는 방법이 두 가지인데 하나는 거짓말이다.** 각 체크박스에 aria-required 를 붙이면
// grep 도 통과하고 axe 도 통과하지만, AT 는 '이 세그먼트를 반드시 체크해야 한다'고 읽는다 —
// 실제 요구는 '아무거나 최소 한 개'다. 그래서 **묶음(role=group)의 이름**에 필수를 싣는다.
// 아래 마지막 두 테스트가 그 거짓 시맨틱이 되돌아오는 것을 막는 잠금이다.
// ─────────────────────────────────────────────────────────────────────────────
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentPicker } from './SegmentPicker';
import type { Segment } from './messaging';

const SEGMENTS: readonly Segment[] = [
  { id: 'all', label: '전체 회원', recipientCount: 1200, description: '탈퇴 제외' },
  { id: 'vip', label: 'VIP', recipientCount: 80, description: '누적 100만원 이상' },
];

function renderPicker(props: { readonly required?: boolean; readonly error?: string } = {}) {
  return render(
    <SegmentPicker
      label="수신자 세그먼트"
      segments={SEGMENTS}
      selectedIds={[]}
      onChange={vi.fn()}
      {...props}
    />,
  );
}

describe('SegmentPicker — required 의 AT 경로 (A11Y-11)', () => {
  it('required 면 묶음의 접근성 이름이 필수임을 밝힌다', () => {
    renderPicker({ required: true });
    expect(screen.getByRole('group', { name: '수신자 세그먼트 (필수)' })).toBeTruthy();
  });

  it('required 가 아니면 이름이 라벨 그대로다 (대조)', () => {
    renderPicker();
    expect(screen.getByRole('group', { name: '수신자 세그먼트' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: /필수/ })).toBeNull();
  });

  it('개별 체크박스에는 aria-required 를 붙이지 않는다 — 어느 한 개도 필수가 아니다', () => {
    const { container } = renderPicker({ required: true });
    // 체크박스는 실재해야 한다 — '없어서 통과' 하는 공허한 단언을 막는다
    expect(screen.getAllByRole('checkbox')).toHaveLength(SEGMENTS.length);
    expect(container.querySelectorAll('[aria-required]')).toHaveLength(0);
  });

  it('묶음이 대상 수 안내를 aria-describedby 로 잇는다 — 짝 없는 설명을 남기지 않는다', () => {
    const { container } = renderPicker({ required: true });
    const describedBy = screen.getByRole('group').getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(container.querySelector(`#${CSS.escape(describedBy ?? '')}`)?.textContent).toContain(
      '선택 대상',
    );
  });

  it('오류가 있으면 묶음의 설명이 그 오류를 가리킨다 (안내 <p> 가 오류 <p> 로 바뀌어도 짝이 유지된다)', () => {
    const { container } = renderPicker({ required: true, error: '수신자를 한 개 이상 고르세요.' });
    const describedBy = screen.getByRole('group').getAttribute('aria-describedby');
    const note = container.querySelector(`#${CSS.escape(describedBy ?? '')}`);
    expect(note?.getAttribute('role')).toBe('alert');
    expect(note?.textContent).toContain('한 개 이상');
  });
});
