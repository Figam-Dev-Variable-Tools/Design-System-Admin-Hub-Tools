// TextareaField — 계약 검증 테스트 (contracts/TextareaField.contract.json@1.1.0)
//
//   states[]            default · focus-visible · disabled · error
//   events.onChange     payload string · blockedWhen: ["disabled"]  (스파이 비발생 단언)
//   조립                FormField — 라벨/카운터('N/max')/오류/힌트를 껍데기가 그린다
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import textareaCss from './TextareaField.css?raw';
import { TextareaField } from './TextareaField';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('TextareaField — 계약 states[]', () => {
  it('TextareaField: default 상태 — textbox 로 렌더하고 카운터(N/max)를 그린다', () => {
    render(<TextareaField label="본문" value="hello" maxLength={500} onChange={vi.fn()} />);

    const textarea = screen.getByRole('textbox', { name: '본문' });
    expect(textarea.tagName).toBe('TEXTAREA');
    expect((textarea as HTMLTextAreaElement).value).toBe('hello');
    // 카운터는 FormField 껍데기가 그린다 — 5/500
    expect(screen.getByText('5/500')).not.toBeNull();
  });

  it('TextareaField: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<TextareaField label="본문" value="" maxLength={500} onChange={vi.fn()} />);

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '본문' }));

    const ring = ruleBody(textareaCss, '.tds-textarea__control:focus-visible');
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('TextareaField: disabled 상태 — native disabled 로 입력을 막는다', () => {
    render(<TextareaField label="본문" value="" maxLength={500} disabled onChange={vi.fn()} />);

    expect((screen.getByRole('textbox', { name: '본문' }) as HTMLTextAreaElement).disabled).toBe(
      true,
    );
  });

  it('TextareaField: error 상태 — role=alert 오류 + 붉은 테두리 클래스', () => {
    render(
      <TextareaField
        label="본문"
        value=""
        maxLength={500}
        error="본문을 입력하세요"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert').textContent).toBe('본문을 입력하세요');
    const textarea = screen.getByRole('textbox', { name: '본문' });
    expect(textarea.className).toContain('tds-textarea__control--invalid');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(ruleBody(textareaCss, '.tds-textarea__control--invalid')).toContain(
      'var(--tds-color-feedback-danger-border)',
    );
  });
});

describe('TextareaField — 계약 events.onChange.blockedWhen', () => {
  it('TextareaField: onChange 는 새 문자열(값)을 넘긴다 — 이벤트가 아니다', () => {
    let received = '';
    const onChange = vi.fn((v: string) => {
      received = v;
    });
    render(<TextareaField label="본문" value="" maxLength={500} onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), {
      target: { value: '새 본문' },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(received).toBe('새 본문');
  });

  it('TextareaField: disabled 상태에서 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled)', () => {
    const onChange = vi.fn();
    render(<TextareaField label="본문" value="" maxLength={500} disabled onChange={onChange} />);

    // disabled 입력에는 타이핑이 도달하지 않으므로 change 를 직접 디스패치해 **차단 로직 자체**를 시험한다
    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), {
      target: { value: 'x' },
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});

// A11Y-11 acceptanceCheck: "required input 이 aria-required 노출"
// required 는 FormField 마커(aria-hidden 장식)로만 그려져 <textarea> 자신에는 아무 속성도 닿지 않았다 —
// 이 스위트가 그 회귀를 막는다.
describe('TextareaField — required 를 AT 에 노출한다 (A11Y-11)', () => {
  it('TextareaField: required=true — <textarea> 가 native required + aria-required 를 낸다', () => {
    render(<TextareaField label="본문" value="" maxLength={500} required />);

    const textarea = screen.getByLabelText(/본문/) as HTMLTextAreaElement;
    expect(textarea.required).toBe(true);
    expect(textarea.getAttribute('aria-required')).toBe('true');
  });

  it('TextareaField: required=false — 두 속성 모두 남기지 않는다', () => {
    render(<TextareaField label="본문" value="" maxLength={500} />);

    const textarea = screen.getByLabelText(/본문/) as HTMLTextAreaElement;
    expect(textarea.required).toBe(false);
    expect(textarea.hasAttribute('aria-required')).toBe(false);
  });
});
