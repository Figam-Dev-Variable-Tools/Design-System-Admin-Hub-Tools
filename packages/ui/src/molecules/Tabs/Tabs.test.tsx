// Tabs — 계약 검증 테스트 (contracts/Tabs.contract.json@1.0.0)
//
//   states[]          default · hover · focus-visible · selected
//   events.onChange   blockedWhen 없음 — 항상 발화해야 한다
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import tabsCss from './Tabs.css?raw';
import { tabId, tabPanelId, Tabs } from './Tabs';

const items = [
  { id: 'product', label: '상품' },
  { id: 'inquiry', label: '문의' },
  { id: 'sales', label: '영업' },
];

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('Tabs — 계약 states[]', () => {
  it('Tabs: default 상태 — tablist 가 ariaLabel 로 이름을 갖고 각 탭이 안정적인 id(tabId)를 노출해 패널이 aria-labelledby 로 되짚을 수 있다', () => {
    render(<Tabs value="product" items={items} ariaLabel="업무 구분" />);

    expect(screen.getByRole('tablist', { name: '업무 구분' })).not.toBeNull();
    const tab = screen.getByRole('tab', { name: '문의' });
    // 탭↔패널 연결은 패널이 `aria-labelledby={tabId(id)}` 로 건다(늘 유효). 그 되짚기의 대상이 되는
    // 탭 id 가 규약대로인지 고정한다. 반대 방향(탭→패널 aria-controls)은 두지 않는다 — 이 컴포넌트가
    // 패널을 소유하지 않아 그 참조의 유효성을 보장할 수 없기 때문이다(Tabs.tsx 머리말).
    expect(tab.id).toBe(tabId('inquiry'));
    expect(tab.getAttribute('aria-controls')).toBeNull();
    // 패널 id 규약은 조립부용으로 계속 공개된다
    expect(tabPanelId('inquiry')).toBe('inquiry-panel');
  });

  it('Tabs: hover 상태 — :hover 규칙이 탭 텍스트를 진하게 만든다', () => {
    const rule = ruleBody(tabsCss, '.tds-tabs__tab:hover');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-text-default)');
  });

  it('Tabs: focus-visible 상태 — 로빙 tabindex 로 선택된 탭만 탭 순서에 들어가고 포커스 링 규칙이 있다', async () => {
    render(<Tabs value="inquiry" items={items} ariaLabel="업무 구분" />);
    const selected = screen.getByRole('tab', { name: '문의' });

    expect(selected.getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tab', { name: '상품' }).getAttribute('tabindex')).toBe('-1');

    await userEvent.tab();
    expect(document.activeElement).toBe(selected);

    const ring = ruleBody(tabsCss, '.tds-tabs__tab:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('Tabs: selected 상태 — value 와 일치하는 탭만 aria-selected=true 이고 [aria-selected=true] 규칙이 밑줄을 그린다', () => {
    render(<Tabs value="sales" items={items} ariaLabel="업무 구분" />);

    expect(screen.getByRole('tab', { name: '영업' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: '상품' }).getAttribute('aria-selected')).toBe('false');

    const rule = ruleBody(tabsCss, ".tds-tabs__tab[aria-selected='true']");
    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-action-primary-default)');
  });
});

describe('Tabs — 계약 events.onChange · a11y.keyboard', () => {
  it('Tabs: onChange 는 탭 클릭 시 해당 탭의 id 를 전달한다', async () => {
    const onChange = vi.fn();
    render(<Tabs value="product" items={items} ariaLabel="업무 구분" onChange={onChange} />);

    await userEvent.click(screen.getByRole('tab', { name: '문의' }));

    expect(onChange).toHaveBeenCalledWith('inquiry');
  });

  it('Tabs: ArrowRight/Home/End 로 선택이 이동한다 (계약 a11y.keyboard)', async () => {
    const onChange = vi.fn();
    render(<Tabs value="product" items={items} ariaLabel="업무 구분" onChange={onChange} />);

    screen.getByRole('tab', { name: '상품' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('inquiry');

    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('sales');

    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('product');
  });
});
