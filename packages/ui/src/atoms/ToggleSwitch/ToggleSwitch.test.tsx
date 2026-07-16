// ToggleSwitch — 계약 검증 테스트 (contracts/ToggleSwitch.contract.json@1.0.0)
//
//   states[]            default · focus-visible · disabled · checked
//   events.onChange     blockedWhen: ["disabled", "busy"]
//
// 계약 a11y: role=switch + aria-checked · ON/OFF 문구는 aria-hidden 장식(이름은 aria-label).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import toggleCss from './ToggleSwitch.css?raw';
import { ToggleSwitch } from './ToggleSwitch';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('ToggleSwitch — 계약 states[]', () => {
  it('ToggleSwitch: default 상태(off) — role=switch, aria-checked=false, OFF 문구를 보인다', () => {
    render(<ToggleSwitch checked={false} label="FAQ 노출" onChange={vi.fn()} />);
    const sw = screen.getByRole('switch', { name: 'FAQ 노출' });

    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect((sw as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText('OFF')).not.toBeNull();
  });

  it('ToggleSwitch: checked 상태(on) — aria-checked=true, ON 문구를 보인다', () => {
    render(<ToggleSwitch checked label="FAQ 노출" onChange={vi.fn()} />);
    const sw = screen.getByRole('switch', { name: 'FAQ 노출' });

    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('ON')).not.toBeNull();
  });

  it('ToggleSwitch: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<ToggleSwitch checked={false} label="FAQ 노출" onChange={vi.fn()} />);
    const sw = screen.getByRole('switch');

    await userEvent.tab();
    expect(document.activeElement).toBe(sw);

    const ring = ruleBody(toggleCss, '.tds-toggle:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('ToggleSwitch: disabled 상태 — native disabled 로 잠기고 잠금 시 트랙이 흐려진다', () => {
    render(<ToggleSwitch checked={false} label="FAQ 노출" onChange={vi.fn()} disabled />);
    const sw = screen.getByRole('switch');

    expect((sw as HTMLButtonElement).disabled).toBe(true);
    expect(ruleBody(toggleCss, '.tds-toggle:disabled .tds-toggle__track')).toContain('opacity');
  });

  it('ToggleSwitch: Space 키로 토글된다 (버튼 기본 동작)', async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked label="FAQ 노출" onChange={onChange} />);
    screen.getByRole('switch').focus();

    await userEvent.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('ToggleSwitch — 계약 events.onChange.blockedWhen', () => {
  it('ToggleSwitch: disabled 상태에서 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled)', async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} label="FAQ 노출" onChange={onChange} disabled />);

    await userEvent.click(screen.getByRole('switch'), { pointerEventsCheck: 0 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ToggleSwitch: busy 상태에서 onChange 가 발화하지 않고 aria-busy 로 진행을 알린다 (계약 blockedWhen: busy)', async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} label="FAQ 노출" onChange={onChange} busy />);
    const sw = screen.getByRole('switch');

    expect(sw.getAttribute('aria-busy')).toBe('true');
    expect((sw as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(sw, { pointerEventsCheck: 0 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ToggleSwitch: 활성 상태에서는 onChange 가 다음 상태로 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} label="FAQ 노출" onChange={onChange} />);

    await userEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
