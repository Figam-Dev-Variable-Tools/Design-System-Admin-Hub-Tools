// HelpTip — 계약 검증 테스트 (contracts/HelpTip.contract.json@1.0.0)
//
//   states[]   default · hover · focus-visible · open · closed
//   events     없음 (열림 상태는 내부 useState 가 소유 — 외부 제어 이벤트 없음)
//
// 계약 a11y: 버튼 토글 disclosure — aria-expanded/aria-controls · 닫혔을 때 언마운트하지 않고 hidden.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import helpTipCss from './HelpTip.css?raw';
import { HelpTip } from './HelpTip';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('HelpTip — 계약 states[]', () => {
  it('HelpTip: default(closed) 상태 — 트리거가 aria-label 로 렌더되고 패널은 hidden, aria-expanded=false', () => {
    render(<HelpTip label="그룹 유형 설명">시스템 역할은 수정할 수 없습니다.</HelpTip>);
    const trigger = screen.getByRole('button', { name: '그룹 유형 설명' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // 패널은 언마운트되지 않는다 — hidden 으로 감춰진다 (aria-controls 대상 유지)
    const panel = screen.getByText('시스템 역할은 수정할 수 없습니다.');
    expect((panel as HTMLElement).hidden).toBe(true);
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('HelpTip: hover 상태 — :hover 규칙이 트리거 색을 또렷하게 만든다', () => {
    const rule = ruleBody(helpTipCss, '.tds-helptip__trigger:hover');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-text-default)');
  });

  it('HelpTip: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<HelpTip label="그룹 유형 설명">설명</HelpTip>);
    const trigger = screen.getByRole('button', { name: '그룹 유형 설명' });

    await userEvent.tab();
    expect(document.activeElement).toBe(trigger);

    const ring = ruleBody(helpTipCss, '.tds-helptip__trigger:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('HelpTip: open 상태 — 트리거를 누르면 aria-expanded=true 가 되고 패널이 보인다', async () => {
    render(<HelpTip label="그룹 유형 설명">시스템 역할은 수정할 수 없습니다.</HelpTip>);
    const trigger = screen.getByRole('button', { name: '그룹 유형 설명' });

    await userEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect((screen.getByText('시스템 역할은 수정할 수 없습니다.') as HTMLElement).hidden).toBe(
      false,
    );
  });

  it('HelpTip: closed 상태 — 다시 누르면 닫혀 aria-expanded=false 로 돌아가고 패널이 감춰진다', async () => {
    render(<HelpTip label="그룹 유형 설명">시스템 역할은 수정할 수 없습니다.</HelpTip>);
    const trigger = screen.getByRole('button', { name: '그룹 유형 설명' });

    await userEvent.click(trigger); // open
    await userEvent.click(trigger); // close

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect((screen.getByText('시스템 역할은 수정할 수 없습니다.') as HTMLElement).hidden).toBe(
      true,
    );
  });
});
