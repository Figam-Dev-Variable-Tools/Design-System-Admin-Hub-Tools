// ListRow — 리스트 한 줄 (molecule · contracts/ListRow.contract.json@1.0.0)
//
// href 가 있으면 링크(<a>), 없으면 클릭 가능한 행(<button>)으로 렌더한다.
// 목록 컨테이너(ul/li)와 도메인 의미는 조립하는 organism(ListCard 등)이 소유한다.
import type { MouseEvent, ReactNode } from 'react';

import type { ListRowProps } from '../../../generated/types/ListRow.types';
import './ListRow.css';

/** 좌측 아이콘 슬롯 — 장식용이므로 aria-hidden (계약 a11y) */
function IconSlot({ children }: { readonly children: ReactNode }) {
  return (
    <span className="tds-listrow__icon" aria-hidden="true">
      {children}
    </span>
  );
}

export function ListRow({ title, meta = '', icon = null, href = '', onClick }: ListRowProps) {
  const hasIcon = icon !== null && icon !== undefined && icon !== false;
  const isLink = href !== '';

  const handleClick = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    // href 가 있어도 라우팅 가로채기/분석 계측을 위해 함께 발화한다 (계약 events.onClick)
    onClick?.(event);
  };

  const body = (
    <>
      {hasIcon ? <IconSlot>{icon}</IconSlot> : null}
      <span className="tds-listrow__body">
        <span className="tds-listrow__title">{title}</span>
        {meta !== '' ? <span className="tds-listrow__meta">{meta}</span> : null}
      </span>
    </>
  );

  if (isLink) {
    return (
      <a className="tds-listrow" href={href} onClick={handleClick}>
        {body}
      </a>
    );
  }

  return (
    <button type="button" className="tds-listrow" onClick={handleClick}>
      {body}
    </button>
  );
}
