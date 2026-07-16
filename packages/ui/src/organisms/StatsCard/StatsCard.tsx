// StatsCard — 통계 카드 껍데기 (organism · contracts/StatsCard.contract.json@1.1.0)
//
// 계약 dependencies: Card (atom). 헤더(제목 + 액션 슬롯) + 본문 슬롯만 소유하고,
// 본문에 무엇이 오는지(차트/표)는 조립하는 쪽(Pages)이 정한다 (ADR-0003).
// error 는 loading 보다 우선하며 role="alert" 로 즉시 통지한다.
//
// [1.0.1 — 액션 슬롯은 loading/error 에서도 계속 렌더한다]
//   실화면에서 그 액션은 **기간 토글 자신**이고 loading 은 재조회(isFetching)다. 로딩 중에 슬롯을
//   언마운트하면 토글을 누른 순간 토글이 사라진다 (헤더 레이아웃 점프 + 포커스 상실).
//   로딩 중 비활성이 필요하면 호출부가 슬롯 컴포넌트에 disabled 를 준다 — StatsCard 는 렌더만 한다.
//
// [1.1.0 — value(KPI 수치)] 주면 본문 위에 display 타이포(typography.display.sm)로 세운다.
//   대시보드의 지배적 숫자다 (TOKEN-05: 제목/본문/KPI 가 한 크기대에 몰려 밋밋하던 것을
//   body-md 위 tier 로 끌어올린다). 포맷팅은 호출부(shared/format)가 끝낸 문자열을 받는다 — 카드는 숫자를 모른다.
import { useId } from 'react';

import { Card } from '../../atoms/Card';
import type { StatsCardProps } from '../../../generated/types/StatsCard.types';
import './StatsCard.css';

export function StatsCard({
  title,
  action = null,
  value = '',
  children,
  loading = false,
  error = '',
}: StatsCardProps) {
  const titleId = useId();
  const failed = error !== '';
  const hasAction = action !== null && action !== undefined && action !== false;
  const hasValue = value !== '';

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
        <div className="tds-statscard__body">
          {hasValue ? <p className="tds-statscard__value">{value}</p> : null}
          {children}
        </div>
      )}
    </Card>
  );
}
