// StatsCard — 통계 카드 껍데기 (organism · contracts/StatsCard.contract.json@1.0.1)
//
// 계약 dependencies: Card (atom). 헤더(제목 + 액션 슬롯) + 본문 슬롯만 소유하고,
// 본문에 무엇이 오는지(차트/표)는 조립하는 쪽(Pages)이 정한다 (ADR-0003).
// error 는 loading 보다 우선하며 role="alert" 로 즉시 통지한다.
//
// [1.0.1 — 액션 슬롯은 loading/error 에서도 계속 렌더한다]
//   실화면에서 그 액션은 **기간 토글 자신**이고 loading 은 재조회(isFetching)다. 로딩 중에 슬롯을
//   언마운트하면 토글을 누른 순간 토글이 사라진다 (헤더 레이아웃 점프 + 포커스 상실).
//   로딩 중 비활성이 필요하면 호출부가 슬롯 컴포넌트에 disabled 를 준다 — StatsCard 는 렌더만 한다.
import { useId } from 'react';

import { Card } from '../../atoms/Card';
import type { StatsCardProps } from '../../../generated/types/StatsCard.types';
import './StatsCard.css';

export function StatsCard({
  title,
  action = null,
  children,
  loading = false,
  error = '',
}: StatsCardProps) {
  const titleId = useId();
  const failed = error !== '';
  const hasAction = action !== null && action !== undefined && action !== false;

  return (
    <Card busy={loading} aria-labelledby={titleId}>
      <div className="tds-statscard__header">
        <h2 id={titleId} className="tds-statscard__title">
          {title}
        </h2>
        {/* 액션 슬롯 — loading/error 중에도 떠 있는다 (계약 1.0.1: 본문을 다시 불러오는 손잡이다) */}
        {hasAction ? <div className="tds-statscard__action">{action}</div> : null}
      </div>

      {failed ? (
        <p className="tds-statscard__error" role="alert">
          {error}
        </p>
      ) : loading ? (
        <div className="tds-statscard__body">
          <span className="tds-statscard__skeleton" aria-hidden="true" />
          <span className="tds-statscard__skeleton" aria-hidden="true" />
        </div>
      ) : (
        <div className="tds-statscard__body">{children}</div>
      )}
    </Card>
  );
}
