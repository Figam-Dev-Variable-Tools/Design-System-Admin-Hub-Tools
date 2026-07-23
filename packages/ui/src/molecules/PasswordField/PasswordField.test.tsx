// PasswordField — 계약 검증 테스트 (contracts/PasswordField.contract.json@1.1.0)
//
//   states[]                 default · hover · focus-visible · disabled · error
//   props                    name · autoComplete · placeholder · ref(forwardRef)
//   events.onChange          blockedWhen: ["disabled"]
//   events.onBlur            blockedWhen: ["disabled"]   ← CR-2026-0715-003 (축3 BLOCKER 해제)
//   events.onToggleReveal    blockedWhen: ["disabled"]
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import passwordCss from './PasswordField.css?raw';
import { PasswordField } from './PasswordField';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

/** type=password 는 role 이 없다 — id 로 찾는다 (계약상 id 는 필수 prop) */
function inputOf(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('#pw');
  if (!(input instanceof HTMLInputElement)) throw new Error('입력 요소를 찾지 못했다');
  return input;
}

describe('PasswordField — 계약 states[]', () => {
  it('PasswordField: default 상태 — type=password 로 가려지고 토글 버튼이 aria-pressed=false 다', () => {
    const { container } = render(<PasswordField id="pw" label="비밀번호" value="secret" />);

    expect(inputOf(container).type).toBe('password');
    const toggle = screen.getByRole('button', { name: '비밀번호 표시' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('pw');
  });

  it('PasswordField: default 상태 — 토글하면 type=text 로 바뀌고 aria-pressed/aria-label 이 함께 뒤집힌다', async () => {
    const { container } = render(<PasswordField id="pw" label="비밀번호" value="secret" />);

    await userEvent.click(screen.getByRole('button', { name: '비밀번호 표시' }));

    expect(inputOf(container).type).toBe('text');
    expect(
      screen.getByRole('button', { name: '비밀번호 숨기기' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('PasswordField: hover 상태 — 토글 버튼의 :hover 규칙이 텍스트를 진하게 만든다', () => {
    const rule = ruleBody(passwordCss, '.tds-password__toggle:hover:not(:disabled)');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-text-default)');
  });

  it('PasswordField: focus-visible 상태 — 토글 버튼이 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<PasswordField id="pw" label="비밀번호" value="secret" />);

    await userEvent.tab(); // input
    await userEvent.tab(); // toggle
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '비밀번호 표시' }));

    const ring = ruleBody(passwordCss, '.tds-password__toggle:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('PasswordField: disabled 상태 — 입력과 토글 버튼이 모두 native disabled 로 반영된다', () => {
    const { container } = render(
      <PasswordField id="pw" label="비밀번호" value="secret" disabled />,
    );

    expect(inputOf(container).disabled).toBe(true);
    const toggle = screen.getByRole('button', { name: '비밀번호 표시' }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
    expect(toggle.getAttribute('aria-disabled')).toBe('true');
    expect(ruleBody(passwordCss, '.tds-password__toggle:disabled')).toContain(
      'var(--tds-color-text-disabled)',
    );
  });

  it('PasswordField: error 상태 — 메시지를 렌더하고 aria-invalid + aria-describedby 로 연결한다', () => {
    const { container } = render(
      <PasswordField id="pw" label="비밀번호" value="x" error="8자 이상이어야 해요" />,
    );

    const input = inputOf(container);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('pw-error');
    expect(screen.getByText('8자 이상이어야 해요').id).toBe('pw-error');
  });
});

describe('PasswordField — 계약 events.blockedWhen', () => {
  it('PasswordField: disabled 상태에서 onChange 가 발화하지 않는다', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PasswordField id="pw" label="비밀번호" value="" disabled onChange={onChange} />,
    );

    // disabled 입력에는 타이핑이 도달하지 않으므로, change 이벤트를 직접 디스패치해
    // **컴포넌트의 차단 로직 자체**를 시험한다 (브라우저의 disabled 규칙만 시험하면 공허해진다).
    fireEvent.change(inputOf(container), { target: { value: 'secret' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('PasswordField: disabled 상태에서 onToggleReveal 이 발화하지 않는다', async () => {
    const onToggleReveal = vi.fn();
    const { container } = render(
      <PasswordField
        id="pw"
        label="비밀번호"
        value="secret"
        disabled
        onToggleReveal={onToggleReveal}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '비밀번호 표시' }));

    expect(onToggleReveal).not.toHaveBeenCalled();
    // 차단은 콜백뿐 아니라 상태 전환에도 적용된다 — 여전히 가려져 있어야 한다
    expect(inputOf(container).type).toBe('password');
  });

  it('PasswordField: 활성 상태에서는 onChange 와 onToggleReveal 이 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onChange = vi.fn();
    const onToggleReveal = vi.fn();
    const { container } = render(
      <PasswordField
        id="pw"
        label="비밀번호"
        value=""
        onChange={onChange}
        onToggleReveal={onToggleReveal}
      />,
    );

    fireEvent.change(inputOf(container), { target: { value: 'secret' } });
    await userEvent.click(screen.getByRole('button', { name: '비밀번호 표시' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onToggleReveal).toHaveBeenCalledTimes(1);
  });

  it('PasswordField: disabled 상태에서 onBlur 가 발화하지 않는다', () => {
    const onBlur = vi.fn();
    const { container } = render(
      <PasswordField id="pw" label="비밀번호" value="secret" disabled onBlur={onBlur} />,
    );
    const input = inputOf(container);

    // disabled 입력은 클릭·탭으로 포커스를 받지 못한다 — blur/focusout 을 **직접 디스패치해**
    // 컴포넌트의 차단 로직 자체를 시험한다 (브라우저의 포커스 규칙만 시험하면 단언이 공허해진다).
    input.focus();
    fireEvent.blur(input);
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

    expect(onBlur).not.toHaveBeenCalled();
  });

  it('PasswordField: 활성 상태에서는 onBlur 가 발화한다 (위 비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onBlur = vi.fn();
    const { container } = render(
      <PasswordField id="pw" label="비밀번호" value="secret" onBlur={onBlur} />,
    );

    inputOf(container).focus();
    await userEvent.tab();

    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

describe('PasswordField — 계약 props.name · autoComplete · placeholder · ref', () => {
  it('PasswordField: name · autoComplete · placeholder 를 자식 TextField 로 내려보낸다 (없으면 비밀번호 관리자 채우기가 퇴행한다)', () => {
    const { container } = render(
      <PasswordField
        id="pw"
        label="비밀번호"
        value=""
        name="password"
        autoComplete="current-password"
        placeholder="비밀번호를 입력하세요"
      />,
    );
    const input = inputOf(container);

    expect(input.getAttribute('name')).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('current-password');
    expect(input.getAttribute('placeholder')).toBe('비밀번호를 입력하세요');
  });

  it('PasswordField: ref 가 input 요소를 가리킨다 (호출부의 document.getElementById 우회를 없앤다)', () => {
    function Harness() {
      const ref = useRef<HTMLInputElement>(null);
      return (
        <>
          <PasswordField ref={ref} id="pw" label="비밀번호" value="secret" />
          <button
            type="button"
            onClick={() => {
              ref.current?.focus();
            }}
          >
            첫 오류로 이동
          </button>
        </>
      );
    }
    const { container } = render(<Harness />);

    screen.getByRole('button', { name: '첫 오류로 이동' }).click();

    expect(document.activeElement).toBe(inputOf(container));
  });

  it('PasswordField: 토글 후에도 입력값과 커서 위치가 유지된다 (내부 ref 로 복원한다)', async () => {
    const { container } = render(<PasswordField id="pw" label="비밀번호" value="hunter2" />);
    const input = inputOf(container);
    input.focus();
    input.setSelectionRange(3, 3);

    await userEvent.click(screen.getByRole('button', { name: '비밀번호 표시' }));

    expect(inputOf(container).type).toBe('text');
    expect(inputOf(container).value).toBe('hunter2');
    expect(inputOf(container).selectionStart).toBe(3);
  });
});

// A11Y-11 acceptanceCheck: "required input 이 aria-required 노출"
// PasswordField 는 required 를 TextField 로 내려보낸다 — 그 경로가 실제로 AT 까지 닿는지 확인한다.
describe('PasswordField — required 를 AT 에 노출한다 (A11Y-11)', () => {
  it('PasswordField: required=true — input 이 native required + aria-required 를 낸다', () => {
    render(<PasswordField id="pw" label="비밀번호" value="" required />);

    const input = screen.getByLabelText('비밀번호') as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('PasswordField: required=false — aria-required 를 남기지 않는다', () => {
    render(<PasswordField id="pw" label="비밀번호" value="" />);

    expect(screen.getByLabelText('비밀번호').hasAttribute('aria-required')).toBe(false);
  });
});
