// StatusBadge — 상태 배지 (atom · contracts/StatusBadge.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/StatusBadge.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 도메인을 모른다 — tone(색 의도)과 label(문구)만 받는다. 색만으로 의미를 전달하지 않도록
// label 문구가 상태 의미를 담는다 (WCAG 1.4.1). 루트는 별도 role 없는 <span> — 목록에 다수가
// 렌더되므로 라이브 리전(role=status)을 두지 않는다 (계약 a11y). neutral 은 회색 표면,
// 나머지 4종은 feedback 토큰 페어. 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import type { StatusBadgeProps } from '../../../generated/types/StatusBadge.types';
import './StatusBadge.css';

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return <span className={`tds-status-badge tds-status-badge--${tone}`}>{label}</span>;
}
