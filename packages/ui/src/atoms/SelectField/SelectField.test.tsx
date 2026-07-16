// SelectField — 계약 검증 테스트 (contracts/SelectField.contract.json@1.0.0)
//
//   states[]   default · focus-visible · disabled · error(isInvalid)
//   events     없음 — onChange 는 네이티브 <select> 로 그대로 패스스루된다 (계약 event 아님)
//
// 계약: raw <select> 의 무손실 드롭인 — 네이티브 combobox 로 렌더되고 value/onChange/disabled/ref/
//       aria-* 를 그대로 흘려보내며 <option> children 을 그대로 그린다.
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import selectCss from './SelectField.css?raw';
import { SelectField } from './SelectField';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

function options() {
  return (
    <>
      <option value="grant">적립</option>
      <option value="deduct">차감</option>
    </>
  );
}

describe('SelectField — 계약 states[] + 무손실 패스스루', () => {
  it('SelectField: default 상태 — 네이티브 <select>(combobox)로 렌더하고 option 을 그대로 그린다', () => {
    render(
      <SelectField id="kind" aria-label="구분" defaultValue="grant">
        {options()}
      </SelectField>,
    );
    const select = screen.getByRole('combobox', { name: '구분' });

    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: '적립' })).not.toBeNull();
    expect(screen.getByRole('option', { name: '차감' })).not.toBeNull();
  });

  it('SelectField: default 상태 — 네이티브 화살표를 지운다 (appearance:none) — 커스텀 chevron 을 얹기 위해', () => {
    const rule = ruleBody(selectCss, '.tds-select__control');

    expect(rule).not.toBeNull();
    expect(rule).toContain('appearance: none');
  });

  it('SelectField: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(
      <SelectField id="kind" aria-label="구분">
        {options()}
      </SelectField>,
    );
    const select = screen.getByRole('combobox', { name: '구분' });

    await userEvent.tab();
    expect(document.activeElement).toBe(select);

    const ring = ruleBody(selectCss, '.tds-select__control:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('SelectField: disabled 상태 — native disabled 를 그대로 흘려보낸다', () => {
    render(
      <SelectField id="kind" aria-label="구분" disabled>
        {options()}
      </SelectField>,
    );

    expect((screen.getByRole('combobox', { name: '구분' }) as HTMLSelectElement).disabled).toBe(
      true,
    );
  });

  it('SelectField: error 상태(isInvalid) — 붉은(feedback.danger) 테두리 클래스를 붙인다', () => {
    render(
      <SelectField id="kind" aria-label="구분" isInvalid>
        {options()}
      </SelectField>,
    );

    expect(screen.getByRole('combobox', { name: '구분' }).className).toContain(
      'tds-select__control--invalid',
    );
    expect(ruleBody(selectCss, '.tds-select__control--invalid')).toContain(
      'var(--tds-color-feedback-danger-border)',
    );
  });
});

describe('SelectField — 네이티브 속성 패스스루', () => {
  it('SelectField: onChange 를 그대로 흘려보낸다 — 값을 고르면 선택 값과 함께 발화한다', async () => {
    let selectedAtFire = '';
    const onChange = vi.fn((event: { target: { value: string } }) => {
      selectedAtFire = event.target.value;
    });
    render(
      <SelectField id="kind" aria-label="구분" defaultValue="grant" onChange={onChange}>
        {options()}
      </SelectField>,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: '구분' }), 'deduct');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(selectedAtFire).toBe('deduct');
  });

  it('SelectField: ref 로 네이티브 <select> 에 닿는다 (RHF register 가 물릴 수 있게)', () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <SelectField id="kind" aria-label="구분" ref={ref}>
        {options()}
      </SelectField>,
    );

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('SELECT');
  });

  it('SelectField: name 을 그대로 흘려보낸다 — 폼 제출 데이터에 실린다', () => {
    render(
      <form data-testid="form">
        <SelectField id="kind" aria-label="구분" name="pointKind" defaultValue="deduct">
          {options()}
        </SelectField>
      </form>,
    );

    const form = screen.getByTestId('form') as HTMLFormElement;
    expect(new FormData(form).get('pointKind')).toBe('deduct');
  });
});
