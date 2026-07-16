// RowSelectCell — 표 행의 선택 칸 (molecule · contracts/RowSelectCell.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/RowSelectCell.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// <td> 안에 보이지 않는 라벨 + 단일 체크박스. 목록 표(회원·운영자·공지·FAQ·팝업·배너·버전 이력)가 공유한다.
// 도메인을 모른다 — id·라벨 문구·checked·토글 콜백만 받는다. 보이는 라벨이 없으므로 숨긴 문구를 두고
// aria-labelledby(id 파생)로 잇는다. 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import type { RowSelectCellProps } from '../../../generated/types/RowSelectCell.types';
import './RowSelectCell.css';

export function RowSelectCell({ id, label, checked, onToggle }: RowSelectCellProps) {
  const labelId = `select-${id}`;
  return (
    <td className="tds-rowselectcell">
      <span className="tds-rowselectcell__sr" id={labelId}>
        {label}
      </span>
      <input
        type="checkbox"
        className="tds-rowselectcell__input"
        checked={checked}
        aria-labelledby={labelId}
        onChange={(event) => onToggle?.(event.target.checked)}
      />
    </td>
  );
}
