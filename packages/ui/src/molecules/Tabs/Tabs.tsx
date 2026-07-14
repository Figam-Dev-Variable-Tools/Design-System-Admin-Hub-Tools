// Tabs — 하단 밑줄형 탭 목록 (molecule · contracts/Tabs.contract.json@1.0.0)
//
// 탭 패널은 렌더하지 않는다 — aria-controls 로 바깥 패널(`${item.id}-panel`)을 가리킨다.
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

/** 탭이 제어하는 패널 요소의 id — 조립하는 쪽이 이 id 로 패널을 렌더한다 */
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
              aria-controls={tabPanelId(item.id)}
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
