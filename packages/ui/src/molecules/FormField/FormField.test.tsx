// FormField — 계약 검증 테스트 (contracts/FormField.contract.json@1.1.0)
//
//   states[]   default(힌트) · error(role=alert)
//   props      htmlFor · label · required(마커) · error · hint · counter · help(HelpTip 조립)
//   헬퍼       errorIdOf/hintIdOf — 오류/힌트 <p> id 파생 (호출부 aria-describedby 배선)
//   의존       HelpTip (dependencies) — help 가 있으면 disclosure 를 그린다
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SelectField } from '../../atoms/SelectField';
import formFieldCss from './FormField.css?raw';
import { errorIdOf, FormField, hintIdOf } from './FormField';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

/** 자식 컨트롤 자리 — 껍데기는 이 슬롯을 감싸지 않고 그대로 렌더한다 */
function control(id: string) {
  return <input id={id} defaultValue="" aria-label="control-probe" />;
}

describe('FormField — 계약 states[]', () => {
  it('FormField: default 상태 — 라벨과 힌트를 그리고 오류(role=alert)는 없다', () => {
    render(
      <FormField htmlFor="title" label="제목" hint="최대 50자">
        {control('title')}
      </FormField>,
    );

    expect(screen.getByText('제목').tagName).toBe('LABEL');
    const hint = screen.getByText('최대 50자');
    expect(hint.id).toBe(hintIdOf('title'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('FormField: error 상태 — role=alert 오류를 그리고 힌트 대신 표시한다 (색+시맨틱 이중 전달)', () => {
    render(
      <FormField htmlFor="title" label="제목" hint="최대 50자" error="필수 항목입니다">
        {control('title')}
      </FormField>,
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('필수 항목입니다');
    expect(alert.id).toBe(errorIdOf('title'));
    // 오류가 있으면 힌트는 그리지 않는다
    expect(screen.queryByText('최대 50자')).toBeNull();
    // 오류 텍스트는 붉은색 + 굵게
    const rule = ruleBody(formFieldCss, '.tds-formfield__error');
    expect(rule).toContain('var(--tds-color-feedback-danger-text)');
    expect(rule).toContain('var(--tds-primitive-typography-font-weight-bold)');
  });
});

describe('FormField — 계약 props', () => {
  it('FormField: htmlFor 로 라벨과 컨트롤을 잇는다 — 라벨 클릭이 컨트롤에 포커스를 준다', async () => {
    render(
      <FormField htmlFor="title" label="제목">
        {control('title')}
      </FormField>,
    );

    await userEvent.click(screen.getByText('제목'));
    expect(document.activeElement).toBe(screen.getByLabelText('control-probe'));
  });

  it('FormField: required 상태 — 라벨 옆에 aria-hidden 마커(*)를 붙인다 (라벨 이름을 오염시키지 않는다)', () => {
    render(
      <FormField htmlFor="title" label="제목" required>
        {control('title')}
      </FormField>,
    );

    const marker = screen.getByText('*', { exact: false, selector: '.tds-formfield__required' });
    expect(marker.getAttribute('aria-hidden')).toBe('true');
  });
});

// A11Y-11 acceptanceCheck: "required input 이 aria-required 노출"
// 마커(*)가 aria-hidden 이라 required 의 AT 경로는 오직 이 주입뿐이다 — 그래서 여기서 전수로 못 박는다.
describe('FormField — required 를 자식 컨트롤의 aria-required 로 잇는다 (A11Y-11)', () => {
  it('FormField: required + 네이티브 input 자식 — input 이 aria-required 를 노출한다', () => {
    render(
      <FormField htmlFor="title" label="제목" required>
        {control('title')}
      </FormField>,
    );

    expect(screen.getByLabelText('control-probe').getAttribute('aria-required')).toBe('true');
  });

  it.each(['select', 'textarea'] as const)(
    'FormField: required + 네이티브 %s 자식 — 그 컨트롤이 aria-required 를 노출한다',
    (tag) => {
      const Tag = tag;
      render(
        <FormField htmlFor="x" label="구분" required>
          <Tag id="x" aria-label="control-probe" />
        </FormField>,
      );

      expect(screen.getByLabelText('control-probe').getAttribute('aria-required')).toBe('true');
    },
  );

  it('FormField: required + SelectField 자식 — native 패스스루로 <select> 에 aria-required 가 닿는다', () => {
    render(
      <FormField htmlFor="tier" label="등급" required>
        <SelectField id="tier" aria-label="control-probe">
          <option value="a">A</option>
        </SelectField>
      </FormField>,
    );

    const select = screen.getByLabelText('control-probe');
    expect(select.tagName).toBe('SELECT');
    expect(select.getAttribute('aria-required')).toBe('true');
  });

  it('FormField: required=false — aria-required 를 부여하지 않는다 (aria-required="false" 를 남기지 않는다)', () => {
    render(
      <FormField htmlFor="title" label="제목">
        {control('title')}
      </FormField>,
    );

    expect(screen.getByLabelText('control-probe').hasAttribute('aria-required')).toBe(false);
  });

  it('FormField: 호출부가 aria-required 를 명시하면 그 값이 우선한다 (override)', () => {
    render(
      <FormField htmlFor="title" label="제목" required>
        <input id="title" aria-label="control-probe" aria-required={false} defaultValue="" />
      </FormField>,
    );

    expect(screen.getByLabelText('control-probe').getAttribute('aria-required')).toBe('false');
  });

  it('FormField: 래퍼 <div> 자식에는 주입하지 않는다 — 컨트롤 아닌 요소의 거짓 시맨틱 방지', () => {
    const { container } = render(
      <FormField htmlFor="rsv-start" label="시간" required>
        <div data-testid="wrap">
          <input id="rsv-start" aria-label="start-probe" defaultValue="" />
        </div>
      </FormField>,
    );

    expect(screen.getByTestId('wrap').hasAttribute('aria-required')).toBe(false);
    // 래퍼 안의 컨트롤도 건드리지 않는다 (주입은 '단일 컨트롤 자식' 에만)
    expect(screen.getByLabelText('start-probe').hasAttribute('aria-required')).toBe(false);
    expect(container.querySelectorAll('[aria-required]')).toHaveLength(0);
  });

  it('FormField: 표시 전용 <p> 자식에는 주입하지 않는다', () => {
    render(
      <FormField htmlFor="preview" label="미리보기" required>
        <p data-testid="preview-body">본문</p>
      </FormField>,
    );

    expect(screen.getByTestId('preview-body').hasAttribute('aria-required')).toBe(false);
  });

  it('FormField: counter — 우측 상단에 글자수 문자열을 그린다', () => {
    render(
      <FormField htmlFor="body" label="본문" counter="12/500">
        {control('body')}
      </FormField>,
    );

    expect(screen.getByText('12/500').className).toContain('tds-formfield__counter');
  });

  it('FormField: help — HelpTip(atom) 을 조립해 ⓘ 도움말 disclosure 를 그린다 (dependencies)', async () => {
    render(
      <FormField htmlFor="kind" label="구분" help={<span>적립/차감 설명</span>}>
        {control('kind')}
      </FormField>,
    );

    const trigger = screen.getByRole('button', { name: '구분 설명' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('적립/차감 설명')).not.toBeNull();
  });
});

describe('FormField — 헬퍼(errorIdOf/hintIdOf)', () => {
  it('FormField: errorIdOf/hintIdOf 가 htmlFor 에서 id 를 파생한다 (호출부 aria-describedby 배선)', () => {
    expect(errorIdOf('title')).toBe('title-error');
    expect(hintIdOf('title')).toBe('title-hint');
  });
});
