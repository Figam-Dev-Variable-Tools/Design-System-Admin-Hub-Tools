// SegmentedControl — 계약 검증 테스트 (contracts/SegmentedControl.contract.json@1.0.0)
//
//   states[]          default · hover · focus-visible · disabled · selected
//   events.onChange   blockedWhen: ["disabled"]
//   a11y.keyboard     Tab · ArrowLeft · ArrowRight · Space · Enter (라디오 그룹 로빙 tabindex)
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import segmentedCss from './SegmentedControl.css?raw';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
];

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('SegmentedControl — 계약 states[]', () => {
  it('SegmentedControl: default 상태 — radiogroup 이 ariaLabel 로 이름을 갖고 각 세그먼트가 role=radio 다', () => {
    render(<SegmentedControl value="day" options={options} ariaLabel="조회 기간" />);

    expect(screen.getByRole('radiogroup', { name: '조회 기간' })).not.toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('SegmentedControl: hover 상태 — :hover 규칙이 세그먼트 텍스트를 진하게 만든다', () => {
    const rule = ruleBody(segmentedCss, '.tds-segmented__segment:hover:not(:disabled)');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-text-default)');
  });

  it('SegmentedControl: focus-visible 상태 — 로빙 tabindex 로 선택된 세그먼트만 탭 순서에 들어간다', async () => {
    render(<SegmentedControl value="week" options={options} ariaLabel="조회 기간" />);
    const selected = screen.getByRole('radio', { name: '주' });

    expect(selected.getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('radio', { name: '일' }).getAttribute('tabindex')).toBe('-1');

    await userEvent.tab();
    expect(document.activeElement).toBe(selected);

    const ring = ruleBody(segmentedCss, '.tds-segmented__segment:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('SegmentedControl: focus-visible 상태 — 선택된 값이 options 에 없어도 첫 세그먼트가 탭 진입점이 된다 (그룹이 키보드로 도달 불가능해지지 않는다)', async () => {
    render(<SegmentedControl value="" options={options} ariaLabel="조회 기간" />);

    const first = screen.getByRole('radio', { name: '일' });
    expect(first.getAttribute('tabindex')).toBe('0');

    await userEvent.tab();
    expect(document.activeElement).toBe(first);
  });

  it('SegmentedControl: disabled 상태 — 그룹에 aria-disabled, 각 세그먼트에 native disabled 가 반영된다', () => {
    render(<SegmentedControl value="day" options={options} ariaLabel="조회 기간" disabled />);

    expect(
      screen.getByRole('radiogroup', { name: '조회 기간' }).getAttribute('aria-disabled'),
    ).toBe('true');
    for (const radio of screen.getAllByRole('radio')) {
      expect((radio as HTMLButtonElement).disabled).toBe(true);
    }
    expect(ruleBody(segmentedCss, '.tds-segmented__segment:disabled')).toContain(
      'var(--tds-color-text-disabled)',
    );
  });

  it('SegmentedControl: selected 상태 — value 와 일치하는 세그먼트만 aria-checked=true 이고 알약 표면 규칙이 붙는다', () => {
    render(<SegmentedControl value="month" options={options} ariaLabel="조회 기간" />);

    expect(screen.getByRole('radio', { name: '월' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '일' }).getAttribute('aria-checked')).toBe('false');

    const rule = ruleBody(segmentedCss, ".tds-segmented__segment[aria-checked='true']");
    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-surface-default)');
  });
});

describe('SegmentedControl — 계약 events.onChange.blockedWhen', () => {
  it('SegmentedControl: disabled 상태에서 onChange 가 발화하지 않는다', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        value="day"
        options={options}
        ariaLabel="조회 기간"
        disabled
        onChange={onChange}
      />,
    );

    // 클릭 경로 — disabled 속성을 지우고 CSS 로만 흐리게 처리하면 이 단언이 깨진다
    await userEvent.click(screen.getByRole('radio', { name: '주' }));

    // 키보드 경로 — 화살표 키도 차단돼야 한다 (선택이 포커스를 따르는 라디오 그룹이므로).
    // disabled 요소는 포커스를 받지 못하므로 이벤트를 직접 디스패치해 **핸들러의 차단 로직 자체**를 시험한다.
    fireEvent.keyDown(screen.getByRole('radio', { name: '일' }), { key: 'ArrowRight' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('SegmentedControl: 활성 상태에서는 클릭으로 onChange 가 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl value="day" options={options} ariaLabel="조회 기간" onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole('radio', { name: '월' }));

    expect(onChange).toHaveBeenCalledWith('month');
  });

  it('SegmentedControl: ArrowRight/ArrowLeft 가 선택과 포커스를 함께 옮긴다 (계약 a11y.keyboard · 핸들러는 radio 가 소유한다)', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl value="day" options={options} ariaLabel="조회 기간" onChange={onChange} />,
    );

    screen.getByRole('radio', { name: '일' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenLastCalledWith('week');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: '주' }));

    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('month'); // day 에서 왼쪽 → 순환하여 마지막
  });
});
