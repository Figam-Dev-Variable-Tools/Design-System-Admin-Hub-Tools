// ListCard — 제목 + 카운트 뱃지 + 행 목록 카드 (organism · contracts/ListCard.contract.json@2.0.0)
//
// 계약 dependencies: Card + Badge (atoms) + ListRow (molecule).
// rows 는 데이터 prop — 최근 주문·최근 문의·최근 상담 등 도메인별 목록을 같은 껍데기로 렌더한다.
//
// [2.0.0 — SPA 내비게이션 탈출구] onRowClick 은 { id, event } 를 넘긴다 (1.x 는 id 문자열만 넘겼다).
//   호출부는 href 로 진짜 <a> 를 유지한 채 좌클릭만 event.preventDefault() 하고 navigate() 로
//   가로챌 수 있다 — 이 인자가 없으면 href 있는 행은 전체 페이지 새로고침이 된다.
import { useId } from 'react';
import type { MouseEvent } from 'react';

import { Badge } from '../../atoms/Badge';
import { Card } from '../../atoms/Card';
import { ListRow } from '../../molecules/ListRow';
import type { ListCardProps } from '../../../generated/types/ListCard.types';
import './ListCard.css';

export function ListCard({
  title,
  count = 0,
  rows,
  loading = false,
  empty = '표시할 항목이 없습니다.',
  icon = null,
  onRowClick,
}: ListCardProps) {
  const titleId = useId();

  const handleRowClick = (id: string) => (event: MouseEvent) => {
    // 계약 events.onRowClick.blockedWhen — loading 에서는 발화 금지.
    // 차단 시 <a> 의 기본 내비게이션도 함께 막는다 (콜백만 막고 링크를 살려두면 페이지가 떠난다).
    if (loading) {
      event.preventDefault();
      return;
    }
    onRowClick?.({ id, event });
  };

  return (
    <Card busy={loading} aria-labelledby={titleId}>
      <h2 id={titleId} className="tds-listcard__title">
        <span>{title}</span>
        <Badge count={count} />
      </h2>

      {loading ? (
        <div className="tds-listcard__skeletons">
          <span className="tds-listcard__skeleton" aria-hidden="true" />
          <span className="tds-listcard__skeleton" aria-hidden="true" />
        </div>
      ) : rows.length === 0 ? (
        <p className="tds-listcard__empty">{empty}</p>
      ) : (
        <ul className="tds-listcard__list">
          {rows.map((row) => (
            <li key={row.id}>
              <ListRow
                title={row.title}
                meta={row.meta ?? ''}
                href={row.href ?? ''}
                icon={icon}
                onClick={handleRowClick(row.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
