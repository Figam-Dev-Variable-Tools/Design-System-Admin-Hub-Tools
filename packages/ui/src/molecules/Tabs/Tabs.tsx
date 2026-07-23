// Tabs — 하단 밑줄형 탭 목록 (molecule · contracts/Tabs.contract.json@1.0.0)
//
// 탭 패널은 렌더하지 않는다 — 패널을 소유하지 않으므로 탭에서 패널로 향하는 aria-controls 는 두지 않는다.
// (한때 각 탭에 `aria-controls="${item.id}-panel"` 을 달았으나, 이 컴포넌트는 그 패널이 실제로
//  DOM 에 있는지 보장할 수 없다: 조립하는 쪽이 필터형 탭처럼 패널을 아예 안 그리거나(예: 연동 목록),
//  오류일 때 패널을 감추거나, 고정 id 로 그려 `${item.id}-panel` 과 어긋날 수 있다. 그러면 선택된
//  탭의 aria-controls 가 없는 id 를 가리켜 axe `aria-valid-attr-value`(critical)로 걸린다 —
//  axe-core 는 aria-selected!=='false' 인 탭의 끊긴 aria-controls 만 실패로 본다. aria-controls 는
//  WAI-ARIA APG 에서 탭에 **선택 사항**이므로, 지킬 수 없는 참조를 없앤다. 패널→탭 연결은
//  조립부가 패널에 `aria-labelledby={tabId(id)}` 로 건다 — 그 방향은 tabId 가 항상 있어 늘 유효하다.)
// 비선택 탭도 같은 두께의 투명 밑줄을 둬 전환 시 라벨이 밀리지 않는다.
// 로빙 tabindex + ArrowLeft/Right/Home/End — WAI-ARIA Tabs 패턴(자동 활성화).
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

import type { TabsProps } from '../../../generated/types/Tabs.types';
import './Tabs.css';

/** 탭 버튼 요소의 id — 바깥 tabpanel 이 aria-labelledby 로 되짚을 수 있게 규약을 공개한다 */
export function tabId(id: string): string {
  return `${id}-tab`;
}

/** 패널 요소의 id 규약 — 조립하는 쪽이 이 id 로 패널을 렌더하고 `aria-labelledby={tabId(id)}` 로 탭을 되짚는다 */
export function tabPanelId(id: string): string {
  return `${id}-panel`;
}

export function Tabs({ value, items, ariaLabel, onChange }: TabsProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const focusTab = (id: string) => {
    listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (items.length === 0) return;
    const index = items.findIndex((item) => item.id === value);
    if (index < 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = items[nextIndex];
    if (next === undefined) return;
    onChange?.(next.id);
    focusTab(next.id);
  };

  return (
    <ul
      ref={listRef}
      className="tds-tabs"
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <li key={item.id} className="tds-tabs__item" role="presentation">
            <button
              type="button"
              role="tab"
              id={tabId(item.id)}
              data-tab-id={item.id}
              className="tds-tabs__tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange?.(item.id)}
            >
              {item.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
