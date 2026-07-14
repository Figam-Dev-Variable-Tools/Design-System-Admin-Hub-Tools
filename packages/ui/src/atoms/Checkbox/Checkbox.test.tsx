// Checkbox — 계약 검증 테스트 (contracts/Checkbox.contract.json@1.0.0)
//
//   states[]            default · hover · focus-visible · disabled · checked
//   events.onChange     blockedWhen: ["disabled"]
//
// 계약 a11y: "aria-checked 는 native input[type=checkbox] 가 스스로 노출한다" ·
//            "이 버전은 부분 선택(indeterminate)을 지원하지 않는다" — 그래서 indeterminate 테스트는 없다.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import checkboxCss from './Checkbox.css?raw';
import { Checkbox } from './Checkbox';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('Checkbox — 계약 states[]', () => {
  it('Checkbox: default 상태 — 체크되지 않은 활성 체크박스로 렌더되고 라벨이 htmlFor 로 연결된다', () => {
    render(<Checkbox id="agree" label="동의합니다" checked={false} />);
    const box = screen.getByRole('checkbox', { name: '동의합니다' });

    expect((box as HTMLInputElement).checked).toBe(false);
    expect((box as HTMLInputElement).disabled).toBe(false);
    expect(box.id).toBe('agree');
  });

  it('Checkbox: hover 상태 — :hover 규칙이 히트 영역 표면을 알린다', () => {
    const rule = ruleBody(checkboxCss, '.tds-checkbox__control:hover:not(:disabled)');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-surface-raised)');
  });

  it('Checkbox: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<Checkbox id="agree" label="동의합니다" checked={false} />);
    const box = screen.getByRole('checkbox', { name: '동의합니다' });

    await userEvent.tab();
    expect(document.activeElement).toBe(box);

    const ring = ruleBody(checkboxCss, '.tds-checkbox__control:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('Checkbox: disabled 상태 — native disabled 로 반영되고 라벨도 비활성 토큰을 쓴다', () => {
    render(<Checkbox id="agree" label="동의합니다" checked={false} disabled />);
    const box = screen.getByRole('checkbox', { name: '동의합니다' });

    expect((box as HTMLInputElement).disabled).toBe(true);
    expect(ruleBody(checkboxCss, '.tds-checkbox__control:disabled')).toContain(
      'var(--tds-color-action-primary-disabled)',
    );
    expect(
      ruleBody(checkboxCss, '.tds-checkbox__control:disabled + .tds-checkbox__label'),
    ).toContain('var(--tds-color-text-disabled)');
  });

  it('Checkbox: checked 상태 — native checked 로 반영되어 aria-checked=true 로 노출된다', () => {
    render(<Checkbox id="agree" label="동의합니다" checked />);
    const box = screen.getByRole('checkbox', { name: '동의합니다', checked: true });

    expect((box as HTMLInputElement).checked).toBe(true);
  });
});

describe('Checkbox — 계약 events.onChange.blockedWhen', () => {
  it('Checkbox: disabled 상태에서 onChange 가 발화하지 않는다', async () => {
    const onChange = vi.fn();
    render(<Checkbox id="agree" label="동의합니다" checked={false} disabled onChange={onChange} />);

    // 라벨 클릭도 히트 영역이다 — 두 경로 모두에서 비발생을 확인한다
    await userEvent.click(screen.getByRole('checkbox', { name: '동의합니다' }));
    await userEvent.click(screen.getByText('동의합니다'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('Checkbox: 활성 상태에서는 onChange 가 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onChange = vi.fn();
    render(<Checkbox id="agree" label="동의합니다" checked={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole('checkbox', { name: '동의합니다' }));

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Checkbox — 계약 props.name (폼 제출 키)', () => {
  it('Checkbox: name 이 있으면 체크 상태가 폼 제출 데이터에 실린다 (LoginForm: rememberEmail)', () => {
    render(
      <form data-testid="form">
        <Checkbox id="remember" label="로그인 상태 유지" name="rememberEmail" checked />
      </form>,
    );

    const form = screen.getByTestId('form') as HTMLFormElement;
    expect(screen.getByRole('checkbox', { name: '로그인 상태 유지' }).getAttribute('name')).toBe(
      'rememberEmail',
    );
    expect(new FormData(form).get('rememberEmail')).toBe('on');
  });

  it('Checkbox: name 이 빈 문자열이면 속성을 부여하지 않는다 (계약 props.name 기본값)', () => {
    render(<Checkbox id="agree" label="동의합니다" checked={false} />);

    expect(screen.getByRole('checkbox', { name: '동의합니다' }).getAttribute('name')).toBeNull();
  });
});
