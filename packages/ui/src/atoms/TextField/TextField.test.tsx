// TextField — 계약 검증 테스트 (contracts/TextField.contract.json@1.1.0)
//
//   states[]          default · hover · focus-visible · disabled · error
//   props.required    라벨에 시각 마커(*)를 주입하지 않는다 (접근 가능한 이름 오염 금지)
//   props.name/autoComplete/inputMode   폼 동작 표면 — <input> 으로 전달
//   ref               forwardRef<HTMLInputElement>
//   events.onBlur     blockedWhen: ["disabled"]
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import textFieldCss from './TextField.css?raw';
import { TextField, textFieldErrorId } from './TextField';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('TextField — 계약 states[]', () => {
  it('TextField: default 상태 — 라벨이 연결된 활성 입력이고 aria-invalid 가 없다', () => {
    render(<TextField id="email" label="이메일" value="" />);
    const input = screen.getByLabelText('이메일');

    expect((input as HTMLInputElement).disabled).toBe(false);
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('TextField: hover 상태 — :hover 규칙이 테두리 색을 바꾼다', () => {
    const rule = ruleBody(textFieldCss, '.tds-textfield__input:hover:not(:disabled)');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-text-muted)');
  });

  it('TextField: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<TextField id="email" label="이메일" value="" />);
    const input = screen.getByLabelText('이메일');

    await userEvent.tab();
    expect(document.activeElement).toBe(input);

    const ring = ruleBody(textFieldCss, '.tds-textfield__input:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('TextField: disabled 상태 — native disabled 로 반영되고 포커스를 받지 않는다', async () => {
    render(<TextField id="email" label="이메일" value="" disabled />);
    const input = screen.getByLabelText('이메일');

    expect((input as HTMLInputElement).disabled).toBe(true);

    await userEvent.tab();
    expect(document.activeElement).not.toBe(input);

    expect(ruleBody(textFieldCss, '.tds-textfield__input:disabled')).toContain(
      'var(--tds-color-surface-disabled)',
    );
  });

  it('TextField: error 상태 — 메시지 텍스트를 렌더하고 aria-invalid + aria-describedby 로 연결한다 (색상만으로 전달하지 않는다 · WCAG 1.4.1)', () => {
    render(<TextField id="email" label="이메일" value="x" error="이메일 형식이 아닙니다" />);
    const input = screen.getByLabelText('이메일');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(textFieldErrorId('email'));
    expect(screen.getByText('이메일 형식이 아닙니다').id).toBe(textFieldErrorId('email'));
    expect(ruleBody(textFieldCss, '.tds-textfield--error .tds-textfield__input')).toContain(
      'var(--tds-color-feedback-danger-border)',
    );
  });

  it('TextField: error 상태 — 에러 메시지 <p> 가 role="alert" 를 가진다 (포커스된 필드의 on-blur 에러도 announce · A11Y-10)', () => {
    render(<TextField id="email" label="이메일" value="x" error="이메일 형식이 아닙니다" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('이메일 형식이 아닙니다');
    expect(alert.id).toBe(textFieldErrorId('email'));
  });

  it('TextField: A11Y-11 — aria-invalid 는 반드시 aria-describedby 로 에러 <p> id 와 짝을 이룬다', () => {
    render(<TextField id="email" label="이메일" value="x" error="이메일 형식이 아닙니다" />);
    const input = screen.getByLabelText('이메일');
    // aria-invalid 가 있으면 describedby 도 있고, 그 대상은 실제 에러 요소 id 다 (dangling 금지)
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedby = input.getAttribute('aria-describedby');
    expect(describedby).toBe(textFieldErrorId('email'));
    expect(document.getElementById(describedby ?? '')).not.toBeNull();
  });

  it('TextField: A11Y-11 — required=true 는 native required 로 노출된다 (aria-required)', () => {
    render(<TextField id="email" label="이메일" value="" required />);
    expect((screen.getByLabelText('이메일') as HTMLInputElement).required).toBe(true);
  });
});

describe('TextField — 계약 events.onBlur.blockedWhen', () => {
  it('TextField: disabled 상태에서 onBlur 가 발화하지 않는다', () => {
    const onBlur = vi.fn();
    render(<TextField id="email" label="이메일" value="" disabled onBlur={onBlur} />);
    const input = screen.getByLabelText('이메일') as HTMLInputElement;

    // disabled 입력에 포커스를 강제로 주고 blur 이벤트를 직접 발생시켜도 콜백은 발화하면 안 된다.
    // (userEvent.tab() 만 쓰면 disabled 라 애초에 포커스가 안 가서 "발화하지 않음"이 공허해진다 —
    //  그건 컴포넌트의 차단 로직이 아니라 브라우저의 포커스 규칙을 시험하는 것이다.)
    input.focus();
    input.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

    expect(onBlur).not.toHaveBeenCalled();
  });

  it('TextField: 활성 상태에서는 onBlur 가 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onBlur = vi.fn();
    render(<TextField id="email" label="이메일" value="" onBlur={onBlur} />);

    await userEvent.click(screen.getByLabelText('이메일'));
    await userEvent.tab();

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('TextField: onChange 는 입력마다 발화한다 (계약 events.onChange — blockedWhen 없음)', async () => {
    const onChange = vi.fn();
    render(<TextField id="email" label="이메일" value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('이메일'), 'a');

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('TextField — 계약 props.required (라벨에 마커를 주입하지 않는다)', () => {
  it('TextField: required=true 여도 라벨 텍스트는 라벨 그대로다 — 마커(*)가 접근 가능한 이름을 오염시키지 않는다', () => {
    render(<TextField id="email" label="이메일" value="" required />);

    // 정확일치 셀렉터가 살아 있어야 한다 (E2E FS-001 이 이 셀렉터로 필드를 집는다)
    const input = screen.getByLabelText('이메일') as HTMLInputElement;
    expect(input.required).toBe(true);

    const label = document.querySelector('label[for="email"]');
    expect(label?.textContent).toBe('이메일');
    expect(label?.textContent).not.toContain('*');
  });

  it('TextField: required=false — native required 속성이 없다', () => {
    render(<TextField id="email" label="이메일" value="" />);

    expect((screen.getByLabelText('이메일') as HTMLInputElement).required).toBe(false);
  });
});

describe('TextField — 계약 props.name · autoComplete · inputMode (폼 동작 표면)', () => {
  it('TextField: name · autoComplete · inputMode 를 <input> 으로 전달한다 (없으면 자격증명 자동완성이 퇴행한다)', () => {
    render(
      <TextField
        id="email"
        label="이메일"
        value=""
        type="email"
        name="email"
        autoComplete="username"
        inputMode="email"
      />,
    );
    const input = screen.getByLabelText('이메일');

    expect(input.getAttribute('name')).toBe('email');
    expect(input.getAttribute('autocomplete')).toBe('username');
    expect(input.getAttribute('inputmode')).toBe('email');
  });

  it('TextField: 빈 문자열이면 속성을 부여하지 않는다 (계약: name · autoComplete · inputMode · placeholder)', () => {
    render(<TextField id="email" label="이메일" value="" />);
    const input = screen.getByLabelText('이메일');

    expect(input.getAttribute('name')).toBeNull();
    expect(input.getAttribute('autocomplete')).toBeNull();
    expect(input.getAttribute('inputmode')).toBeNull();
    expect(input.getAttribute('placeholder')).toBeNull();
  });

  it('TextField: name 이 있으면 폼 제출 데이터의 키가 된다', () => {
    render(
      <form data-testid="form">
        <TextField id="email" label="이메일" value="admin@company.com" name="email" readOnly />
      </form>,
    );

    const form = screen.getByTestId('form') as HTMLFormElement;
    expect(new FormData(form).get('email')).toBe('admin@company.com');
  });
});

describe('TextField — forwardRef (제출 실패 시 첫 오류 필드로 포커스 이동)', () => {
  it('TextField: ref 가 input 요소를 가리켜 호출부가 포커스를 옮길 수 있다', () => {
    function Harness() {
      const ref = useRef<HTMLInputElement>(null);
      return (
        <>
          <TextField ref={ref} id="email" label="이메일" value="" error="이메일을 입력하세요." />
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
    render(<Harness />);

    screen.getByRole('button', { name: '첫 오류로 이동' }).click();

    expect(document.activeElement).toBe(screen.getByLabelText('이메일'));
  });
});
