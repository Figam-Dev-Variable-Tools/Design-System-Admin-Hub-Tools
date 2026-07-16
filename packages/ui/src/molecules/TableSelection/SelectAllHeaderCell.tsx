// SelectAllHeaderCell — 표 헤더의 전체선택 칸 (molecule · contracts/SelectAllHeaderCell.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/SelectAllHeaderCell.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 계약 dependencies: TriStateCheckbox (atom). <th> 안에 숨긴 라벨 + 3상태 체크박스를 조립한다.
// 이 페이지의 행이 전부 선택됐으면 on, 일부면 mixed, 아니면 off. 회원·운영자·콘텐츠 목록이 같은 규칙으로 쓴다.
//
// [동반 유틸 tableSelectionState] 지금 페이지에 보이는 행들만 놓고 선택 상태를 계산한다(triStateProps 선례처럼
//   컴포넌트와 함께 공개되지만 계약 prop 이 아니라 함수다). 보이지 않는 행은 세지 않는다 — 다른 페이지의
//   선택이 남아 있어도 이 페이지가 전부 선택된 것처럼 보이면 안 되고, 그 반대도 마찬가지다.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import { TriStateCheckbox } from '../../atoms/TriStateCheckbox';
import type { SelectAllHeaderCellProps } from '../../../generated/types/SelectAllHeaderCell.types';
import './SelectAllHeaderCell.css';

/** 전체선택 체크박스가 가져야 할 두 플래그 (계약 selection prop 의 형태) */
export interface TableSelectionState {
  readonly allSelected: boolean;
  /** 일부만 선택됨 → aria-checked="mixed" */
  readonly someSelected: boolean;
}

/**
 * 지금 페이지에 보이는 행들만 놓고 선택 상태를 계산한다 (SelectAllHeaderCell 의 selection prop 을 만든다).
 * 보이지 않는 행은 세지 않는다 — 페이지 경계를 넘어 선택 상태가 새지 않게 한다.
 */
export function tableSelectionState(
  rows: readonly { readonly id: string }[],
  selectedIds: ReadonlySet<string>,
): TableSelectionState {
  const selectedOnPage = rows.filter((row) => selectedIds.has(row.id)).length;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  return { allSelected, someSelected: selectedOnPage > 0 && !allSelected };
}

export function SelectAllHeaderCell({
  label,
  labelId,
  selection,
  onToggleAll,
}: SelectAllHeaderCellProps) {
  return (
    <th scope="col" className="tds-selectallcell">
      <span className="tds-selectallcell__sr" id={labelId}>
        {label}
      </span>
      <TriStateCheckbox
        checked={selection.allSelected}
        indeterminate={selection.someSelected}
        labelledBy={labelId}
        onChange={(checked) => onToggleAll?.(checked)}
      />
    </th>
  );
}
