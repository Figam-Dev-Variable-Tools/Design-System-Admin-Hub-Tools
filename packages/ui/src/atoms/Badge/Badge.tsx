// Badge — 카운트 뱃지 (atom · contracts/Badge.contract.json@1.0.0)
//
// 비대화형 표시 전용 — 클릭 이벤트를 갖지 않는다. hideWhenZero=true 이고 count<=0 이면 렌더하지 않는다.
// 숫자만으로는 의미가 없으므로 인접 제목(CardTitle 등)이 접근 가능한 문맥을 제공해야 한다 (계약 a11y).
import type { BadgeProps } from '../../../generated/types/Badge.types';
import './Badge.css';

export function Badge({ count, tone = 'neutral', hideWhenZero = true }: BadgeProps) {
  if (hideWhenZero && count <= 0) return null;
  return (
    <span className={`tds-badge tds-badge--${tone}`} role="status">
      {count}
    </span>
  );
}
