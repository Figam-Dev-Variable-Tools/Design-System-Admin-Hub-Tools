// TodoCard — '오늘의 할일' 카드 (organism · contracts/TodoCard.contract.json@2.0.0)
//
// 계약 dependencies: Card + Badge (atoms). items 는 데이터 prop 이라 호출부(Pages)가 주입한다.
// count > 0 인 항목은 강조색, 0 인 항목은 흐리게 렌더한다 (계약 tokens.countPending / countEmpty).
//
// [2.0.0 — SPA 내비게이션 탈출구] onItemClick 은 { key, event } 를 넘긴다 (1.x 는 key 문자열만).
//   호출부가 event.preventDefault() 후 navigate() 로 기본 내비게이션을 가로챌 수 있다 (ListCard 동일).
import { useId } from 'react';
import type { MouseEvent } from 'react';

import { Badge } from '../../atoms/Badge';
import { Card } from '../../atoms/Card';
import type { TodoCardProps } from '../../../generated/types/TodoCard.types';
import './TodoCard.css';

export function TodoCard({
  title = '오늘의 할일',
  items,
  loading = false,
  showTotal = true,
  onItemClick,
}: TodoCardProps) {
  const titleId = useId();
  const total = items.reduce((sum, item) => sum + item.count, 0);

  const handleClick = (key: string) => (event: MouseEvent<HTMLElement>) => {
    // 계약 events.onItemClick.blockedWhen — loading 에서는 발화 금지.
    // 차단 시 <a> 의 기본 내비게이션도 함께 막는다.
    if (loading) {
      event.preventDefault();
      return;
    }
    onItemClick?.({ key, event });
  };

  return (
    <Card busy={loading} aria-labelledby={titleId}>
      <h2 id={titleId} className="tds-todocard__title">
        <span>{title}</span>
        {showTotal ? <Badge count={total} /> : null}
      </h2>

      {loading ? (
        <span className="tds-todocard__skeleton" aria-hidden="true" />
      ) : (
        <ul className="tds-todocard__list">
          {items.map((item) => {
            const countClass = `tds-todocard__count${
              item.count > 0 ? ' tds-todocard__count--pending' : ' tds-todocard__count--empty'
            }`;
            const body = (
              <>
                <span>{item.label}</span>
                <span className={countClass}>{item.count}</span>
              </>
            );
            return (
              <li key={item.key}>
                {item.href !== undefined && item.href !== '' ? (
                  <a
                    className="tds-todocard__item"
                    href={item.href}
                    onClick={handleClick(item.key)}
                  >
                    {body}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="tds-todocard__item"
                    onClick={handleClick(item.key)}
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
