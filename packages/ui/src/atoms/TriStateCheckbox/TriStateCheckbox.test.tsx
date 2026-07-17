// TriStateCheckbox — 계약 검증 테스트 (contracts/TriStateCheckbox.contract.json@1.0.0)
//
//   states[]            default · focus-visible · disabled · checked · indeterminate
//   events.onChange     blockedWhen: ["disabled"]
//
// 계약 a11y: indeterminate 는 DOM 프로퍼티(ref) · aria-checked 는 **mixed 일 때만** 낸다
//   (네이티브 체크박스에서 on/off 는 native checked 가 정본 — axe aria-conditional-attr · ADR-0011)
//   · 빈 aria 는 부여하지 않음.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import triStateCss from './TriStateCheckbox.css?raw';
import { TriStateCheckbox, triStateProps } from './TriStateCheckbox';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('TriStateCheckbox — 계약 states[]', () => {
  it('TriStateCheckbox: default 상태(off) — 미체크 활성 체크박스, aria-checked 는 내지 않는다', () => {
    render(
      <TriStateCheckbox
        checked={false}
        indeterminate={false}
        label="전체 선택"
        onChange={vi.fn()}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement;

    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(false);
    // off 에는 aria-checked 를 내지 않는다 — native checked 가 정본이다.
    // (네이티브 체크박스에서 aria-checked 는 "mixed" 일 때만 허용된다 — axe aria-conditional-attr)
    expect(box.getAttribute('aria-checked')).toBeNull();
  });

  it('TriStateCheckbox: checked 상태(on) — native checked, aria-checked 는 내지 않는다', () => {
    render(<TriStateCheckbox checked indeterminate={false} label="전체 선택" onChange={vi.fn()} />);
    const box = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement;

    expect(box.checked).toBe(true);
    expect(box.getAttribute('aria-checked')).toBeNull();
  });

  it('TriStateCheckbox: indeterminate 상태(mixed) — DOM 프로퍼티가 켜지고 aria-checked="mixed" 로 노출된다', () => {
    render(<TriStateCheckbox checked={false} indeterminate label="전체 선택" onChange={vi.fn()} />);
    const box = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement;

    // indeterminate 는 HTML 속성이 아니라 DOM 프로퍼티 — ref 로 설정된다
    expect(box.indeterminate).toBe(true);
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });

  /* ── aria-checked 는 DOM 을 따라간다 (axe aria-conditional-attr · ADR-0011) ────────
   * 아래 두 갈래는 a11y 게이트가 실제로 돌기 시작한 첫 실행에서 잡힌 **실측 결함**이다.
   * 예전 식(`indeterminate && !checked ? 'mixed' : checked`)은 두 경우 모두 DOM 과 모순이었다. */

  it('TriStateCheckbox: on + mixed — DOM 이 indeterminate 이면 aria 도 mixed 다 (전체 선택으로 읽히지 않는다)', () => {
    render(<TriStateCheckbox checked indeterminate label="전체 선택" onChange={vi.fn()} />);
    const box = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement;

    // indeterminate 는 화면에서 checked 를 이긴다 — aria 가 'true' 를 내면 스크린리더에만
    // '전체 선택' 으로 읽혀 화면과 어긋난다.
    expect(box.indeterminate).toBe(true);
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });

  it('TriStateCheckbox: mixed + disabled — indeterminate 표시를 끄면 aria-checked="mixed" 도 사라진다', () => {
    render(
      <TriStateCheckbox
        checked={false}
        indeterminate
        disabled
        label="전체 선택"
        onChange={vi.fn()}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement;

    // disabled 면 표시를 끈다(계약) — 그런데 aria-checked="mixed" 만 남으면
    // **존재하지 않는 부분 선택**을 알리게 된다.
    expect(box.indeterminate).toBe(false);
    expect(box.getAttribute('aria-checked')).toBeNull();
  });

  it('TriStateCheckbox: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(
      <TriStateCheckbox
        checked={false}
        indeterminate={false}
        label="전체 선택"
        onChange={vi.fn()}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '전체 선택' });

    await userEvent.tab();
    expect(document.activeElement).toBe(box);

    const ring = ruleBody(triStateCss, '.tds-tristate:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('TriStateCheckbox: disabled 상태 — native disabled 로 반영되고 indeterminate 표시를 끈다', () => {
    render(
      <TriStateCheckbox
        checked={false}
        indeterminate
        disabled
        label="전체 선택"
        onChange={vi.fn()}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement;

    expect(box.disabled).toBe(true);
    // disabled 이면 indeterminate 표시를 끈다 (계약: indeterminate && !disabled)
    expect(box.indeterminate).toBe(false);
  });
});

describe('TriStateCheckbox — 계약 events.onChange.blockedWhen', () => {
  it('TriStateCheckbox: disabled 상태에서 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled)', async () => {
    const onChange = vi.fn();
    render(
      <TriStateCheckbox
        checked={false}
        indeterminate={false}
        disabled
        label="전체 선택"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }), {
      pointerEventsCheck: 0,
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('TriStateCheckbox: 활성 상태에서는 onChange 가 다음 상태로 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onChange = vi.fn();
    render(
      <TriStateCheckbox
        checked={false}
        indeterminate={false}
        label="전체 선택"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('TriStateCheckbox — 접근성 이름 (빈 문자열은 속성을 부여하지 않는다)', () => {
  it('TriStateCheckbox: labelledBy 가 있으면 aria-labelledby 로, describedBy 가 있으면 aria-describedby 로 잇는다', () => {
    render(
      <>
        <span id="lbl">이 페이지의 회원 전체 선택</span>
        <span id="why">시스템 역할은 수정할 수 없습니다</span>
        <TriStateCheckbox
          checked={false}
          indeterminate={false}
          labelledBy="lbl"
          describedBy="why"
          onChange={vi.fn()}
        />
      </>,
    );
    const box = screen.getByRole('checkbox', { name: '이 페이지의 회원 전체 선택' });

    expect(box.getAttribute('aria-labelledby')).toBe('lbl');
    expect(box.getAttribute('aria-describedby')).toBe('why');
  });

  it('TriStateCheckbox: 빈 문자열 label/labelledBy/describedBy/id 는 속성을 부여하지 않는다', () => {
    render(
      <TriStateCheckbox
        checked={false}
        indeterminate={false}
        label="전체 선택"
        onChange={vi.fn()}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '전체 선택' });

    expect(box.getAttribute('aria-labelledby')).toBeNull();
    expect(box.getAttribute('aria-describedby')).toBeNull();
    expect(box.getAttribute('id')).toBeNull();
  });
});

describe('triStateProps — 모델 3상태 → 체크박스 props', () => {
  it("'on' → checked, 'off' → 둘 다 false, 'mixed' → indeterminate", () => {
    expect(triStateProps('on')).toEqual({ checked: true, indeterminate: false });
    expect(triStateProps('off')).toEqual({ checked: false, indeterminate: false });
    expect(triStateProps('mixed')).toEqual({ checked: false, indeterminate: true });
  });
});
