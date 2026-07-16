// SelectField — 계약 검증 테스트 (contracts/SelectField.contract.json@1.1.0)
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

  it('SelectField: 선택 값 글리프가 잘리지 않게 line-height 는 글꼴 자연 메트릭(normal)을 쓴다', () => {
    // 네이티브 <select> 는 값 텍스트를 라인박스로 자른다 — 무단위 line-height 가 한글(CJK) 잉크보다
    // 좁으면 어센더·디센더가 잘린다. `normal` 이어야 글꼴 메트릭이 잉크를 온전히 담는다.
    const rule = ruleBody(selectCss, '.tds-select__control');

    expect(rule).not.toBeNull();
    expect(rule).toContain('line-height: normal');
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

  it('SelectField: error 상태(isInvalid) — <select aria-invalid="true"> 로 AT 에 무효를 알린다 (A11Y-05)', () => {
    render(
      <SelectField id="kind" aria-label="구분" isInvalid>
        {options()}
      </SelectField>,
    );

    expect(screen.getByRole('combobox', { name: '구분' }).getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('SelectField: isInvalid 가 false 면 aria-invalid 속성이 없다', () => {
    render(
      <SelectField id="kind" aria-label="구분">
        {options()}
      </SelectField>,
    );

    expect(screen.getByRole('combobox', { name: '구분' }).getAttribute('aria-invalid')).toBeNull();
  });

  it('SelectField: A11Y-05 — 호출부 aria-describedby(에러 메시지 연결)를 네이티브 패스스루로 흘려보낸다', () => {
    render(
      <div>
        <SelectField id="kind" aria-label="구분" isInvalid aria-describedby="kind-error">
          {options()}
        </SelectField>
        <p id="kind-error">구분을 선택해 주세요</p>
      </div>,
    );
    const select = screen.getByRole('combobox', { name: '구분' });
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe('kind-error');
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

// A11Y-11 acceptanceCheck: "required input 이 aria-required 노출"
describe('SelectField — required 를 AT 에 노출한다 (A11Y-11)', () => {
  it('SelectField: required=true — <select> 가 native required + aria-required 를 낸다', () => {
    render(
      <SelectField aria-label="등급" required>
        <option value="a">A</option>
      </SelectField>,
    );

    const select = screen.getByLabelText('등급') as HTMLSelectElement;
    expect(select.required).toBe(true);
    expect(select.getAttribute('aria-required')).toBe('true');
  });

  it('SelectField: required=false — 두 속성 모두 남기지 않는다', () => {
    render(
      <SelectField aria-label="등급">
        <option value="a">A</option>
      </SelectField>,
    );

    const select = screen.getByLabelText('등급') as HTMLSelectElement;
    expect(select.required).toBe(false);
    expect(select.hasAttribute('aria-required')).toBe(false);
  });

  it('SelectField: 호출부가 aria-required 를 직접 주면 그 값이 우선한다 (native 를 마지막에 spread)', () => {
    render(
      <SelectField aria-label="등급" required aria-required={false}>
        <option value="a">A</option>
      </SelectField>,
    );

    expect(screen.getByLabelText('등급').getAttribute('aria-required')).toBe('false');
  });
});
