// DateRangeField — 계약 검증 테스트 (contracts/DateRangeField.contract.json@1.1.0)
//
//   states[]                     default · focus-visible · disabled · error
//   events onStartChange/onEndChange  payload string (값 콜백)
//   props                        label(그룹+숨김 라벨) · required(마커) · error(role=alert)
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import dateRangeCss from './DateRangeField.css?raw';
import { DateRangeField } from './DateRangeField';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

const noop = vi.fn();

describe('DateRangeField — 계약 states[]', () => {
  it('DateRangeField: default 상태 — 시작/종료 두 날짜 입력을 숨김 라벨로 구분해 그린다', () => {
    render(
      <DateRangeField
        label="노출 기간"
        startValue="2026-07-01"
        endValue="2026-07-31"
        onStartChange={noop}
        onEndChange={noop}
      />,
    );

    const start = screen.getByLabelText('노출 기간 시작일') as HTMLInputElement;
    const end = screen.getByLabelText('노출 기간 종료일') as HTMLInputElement;
    expect(start.type).toBe('date');
    expect(start.value).toBe('2026-07-01');
    expect(end.value).toBe('2026-07-31');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('DateRangeField: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(
      <DateRangeField
        label="노출 기간"
        startValue=""
        endValue=""
        onStartChange={noop}
        onEndChange={noop}
      />,
    );

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('노출 기간 시작일'));

    const ring = ruleBody(dateRangeCss, '.tds-daterange__control:focus-visible');
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('DateRangeField: disabled 상태 — 두 날짜 입력이 모두 native disabled 다', () => {
    render(
      <DateRangeField
        label="노출 기간"
        startValue=""
        endValue=""
        disabled
        onStartChange={noop}
        onEndChange={noop}
      />,
    );

    expect((screen.getByLabelText('노출 기간 시작일') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('노출 기간 종료일') as HTMLInputElement).disabled).toBe(true);
  });

  it('DateRangeField: error 상태 — role=alert 오류 + 두 입력에 aria-invalid + 붉은 테두리', () => {
    render(
      <DateRangeField
        label="노출 기간"
        startValue="2026-07-31"
        endValue="2026-07-01"
        error="종료일은 시작일 이후여야 합니다"
        onStartChange={noop}
        onEndChange={noop}
      />,
    );

    expect(screen.getByRole('alert').textContent).toBe('종료일은 시작일 이후여야 합니다');
    const start = screen.getByLabelText('노출 기간 시작일');
    expect(start.getAttribute('aria-invalid')).toBe('true');
    expect(start.className).toContain('tds-daterange__control--invalid');
    expect(ruleBody(dateRangeCss, '.tds-daterange__control--invalid')).toContain(
      'var(--tds-color-feedback-danger-border)',
    );
  });

  it('DateRangeField: A11Y-11 — 두 입력의 aria-invalid 가 aria-describedby 로 오류 <p> id 와 짝을 이룬다', () => {
    render(
      <DateRangeField
        label="노출 기간"
        startValue="2026-07-31"
        endValue="2026-07-01"
        error="종료일은 시작일 이후여야 합니다"
        onStartChange={noop}
        onEndChange={noop}
      />,
    );

    const errorEl = screen.getByRole('alert');
    for (const name of ['노출 기간 시작일', '노출 기간 종료일']) {
      const input = screen.getByLabelText(name);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      // describedby 없는 aria-invalid 금지 — 대상은 실제로 존재하는 오류 요소여야 한다
      const describedby = input.getAttribute('aria-describedby');
      expect(describedby).toBe(errorEl.id);
      expect(document.getElementById(describedby ?? '')).toBe(errorEl);
    }
  });

  it('DateRangeField: A11Y-11 — 유효하면 aria-invalid/aria-describedby 를 부여하지 않는다', () => {
    render(
      <DateRangeField
        label="노출 기간"
        startValue="2026-07-01"
        endValue="2026-07-31"
        onStartChange={noop}
        onEndChange={noop}
      />,
    );

    for (const name of ['노출 기간 시작일', '노출 기간 종료일']) {
      const input = screen.getByLabelText(name);
      expect(input.getAttribute('aria-invalid')).toBeNull();
      expect(input.getAttribute('aria-describedby')).toBeNull();
    }
  });
});

describe('DateRangeField — 값 콜백 · 힌트', () => {
  it('DateRangeField: onStartChange/onEndChange 는 새 문자열(값)을 넘긴다', () => {
    const onStartChange = vi.fn();
    const onEndChange = vi.fn();
    render(
      <DateRangeField
        label="노출 기간"
        startValue=""
        endValue=""
        onStartChange={onStartChange}
        onEndChange={onEndChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('노출 기간 시작일'), {
      target: { value: '2026-07-05' },
    });
    fireEvent.change(screen.getByLabelText('노출 기간 종료일'), {
      target: { value: '2026-07-09' },
    });

    expect(onStartChange).toHaveBeenCalledWith('2026-07-05');
    expect(onEndChange).toHaveBeenCalledWith('2026-07-09');
  });

  it('DateRangeField: 오류가 없으면 힌트를 그린다', () => {
    render(
      <DateRangeField
        label="노출 기간"
        startValue=""
        endValue=""
        hint="비워 두면 상시 노출됩니다"
        onStartChange={noop}
        onEndChange={noop}
      />,
    );

    expect(screen.getByText('비워 두면 상시 노출됩니다').className).toContain(
      'tds-daterange__hint',
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// A11Y-11 acceptanceCheck: "required input 이 aria-required 노출"
// 그룹 라벨의 마커(*)는 aria-hidden 장식이라 두 칸 어디에도 필수 여부가 닿지 않았다.
describe('DateRangeField — required 를 두 칸 모두에 노출한다 (A11Y-11)', () => {
  it('DateRangeField: required=true — 시작·종료 입력이 각각 native required + aria-required 를 낸다', () => {
    render(<DateRangeField label="노출 기간" startValue="" endValue="" required />);

    for (const name of ['노출 기간 시작일', '노출 기간 종료일']) {
      const input = screen.getByLabelText(name) as HTMLInputElement;
      expect(input.required, name).toBe(true);
      expect(input.getAttribute('aria-required'), name).toBe('true');
    }
  });

  it('DateRangeField: required=true + error — required 와 invalid 배선이 서로를 지우지 않는다', () => {
    render(
      <DateRangeField
        label="노출 기간"
        startValue=""
        endValue=""
        required
        error="기간을 확인하세요"
      />,
    );

    for (const name of ['노출 기간 시작일', '노출 기간 종료일']) {
      const input = screen.getByLabelText(name);
      expect(input.getAttribute('aria-required'), name).toBe('true');
      expect(input.getAttribute('aria-invalid'), name).toBe('true');
      const describedby = input.getAttribute('aria-describedby');
      expect(document.getElementById(describedby ?? ''), name).not.toBeNull();
    }
  });

  it('DateRangeField: required=false — 두 칸 모두 aria-required 를 남기지 않는다', () => {
    render(<DateRangeField label="노출 기간" startValue="" endValue="" />);

    for (const name of ['노출 기간 시작일', '노출 기간 종료일']) {
      expect(screen.getByLabelText(name).hasAttribute('aria-required'), name).toBe(false);
    }
  });
});
