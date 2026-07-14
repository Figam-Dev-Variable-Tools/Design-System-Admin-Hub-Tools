// 표의 행 선택 — 전체선택 헤더 셀 + 선택 상태 계산 (A41 소유 — apps/admin/src/shared/ui/**)
//
// [왜 여기 있는가] 회원 목록과 운영자 목록이 **같은 규칙**으로 행을 고른다: 이 페이지의 행이 전부
// 선택됐으면 on, 일부만이면 mixed, 아니면 off. 두 표가 그 계산과 헤더 셀 마크업을 각자 갖고 있었다
// (A83 축3 `clone:634b193e5d383352`). 소비자가 둘이고 도메인을 모르므로 여기로 올린다
// (shared/ui/README 규칙: 2곳 이상이 쓰면 공통 모듈).
//
// [도메인을 모른다] 회원인지 운영자인지 알지 못한다 — id 를 가진 행 목록과 라벨 문구만 받는다.
import { TriStateCheckbox } from './TriStateCheckbox';
import { thStyle, visuallyHiddenStyle } from './styles';

/** 이 페이지의 선택 상태 — 전체선택 체크박스가 가져야 할 두 플래그 (배럴에 내보내지 않는다) */
interface TableSelectionState {
  readonly allSelected: boolean;
  /** 일부만 선택됨 → aria-checked="mixed" */
  readonly someSelected: boolean;
}

/**
 * 지금 페이지에 보이는 행들만 놓고 선택 상태를 계산한다.
 *
 * **보이지 않는 행은 세지 않는다** — 다른 페이지의 선택이 남아 있어도 이 페이지가 전부 선택된 것처럼
 * 보이면 안 되고, 그 반대도 마찬가지다.
 */
export function tableSelectionState(
  rows: readonly { readonly id: string }[],
  selectedIds: ReadonlySet<string>,
): TableSelectionState {
  const selectedOnPage = rows.filter((row) => selectedIds.has(row.id)).length;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  return { allSelected, someSelected: selectedOnPage > 0 && !allSelected };
}

interface SelectAllHeaderCellProps {
  /** 보이지 않는 라벨 문구 — 예: '이 페이지의 회원 전체 선택' */
  readonly label: string;
  /** 라벨 요소의 id — 표마다 달라야 한다 (한 문서에 두 표가 있을 수 있다) */
  readonly labelId: string;
  readonly selection: TableSelectionState;
  readonly onToggleAll: (checked: boolean) => void;
}

/**
 * 표 헤더의 전체선택 칸.
 *
 * 보이는 라벨이 없으므로 시각적으로 숨긴 문구를 두고 aria-labelledby 로 잇는다 —
 * 스크린리더 사용자에게 '이 체크박스가 무엇을 고르는지'가 들려야 한다.
 */
export function SelectAllHeaderCell({
  label,
  labelId,
  selection,
  onToggleAll,
}: SelectAllHeaderCellProps) {
  return (
    <th scope="col" style={thStyle}>
      <span style={visuallyHiddenStyle} id={labelId}>
        {label}
      </span>
      <TriStateCheckbox
        checked={selection.allSelected}
        indeterminate={selection.someSelected}
        labelledBy={labelId}
        onChange={onToggleAll}
      />
    </th>
  );
}
