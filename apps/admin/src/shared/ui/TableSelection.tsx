// 표의 행 선택 — 전체선택 헤더 셀 + 선택 상태 계산 (A41 소유 — apps/admin/src/shared/ui/**)
//
// [왜 여기 있는가] 회원 목록과 운영자 목록이 **같은 규칙**으로 행을 고른다: 이 페이지의 행이 전부
// 선택됐으면 on, 일부만이면 mixed, 아니면 off. 두 표가 그 계산과 헤더 셀 마크업을 각자 갖고 있었다
// (A83 축3 `clone:634b193e5d383352`). 소비자가 둘이고 도메인을 모르므로 여기로 올린다
// (shared/ui/README 규칙: 2곳 이상이 쓰면 공통 모듈).
//
// [도메인을 모른다] 회원인지 운영자인지 알지 못한다 — id 를 가진 행 목록과 라벨 문구만 받는다.
import type { CSSProperties } from 'react';

import { formatNumber } from '../format';
import { TriStateCheckbox } from './TriStateCheckbox';
import { checkboxStyle, tdStyle, thStyle, visuallyHiddenStyle } from './styles';

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

const selectCellStyle: CSSProperties = {
  ...tdStyle,
  width: 'var(--tds-space-6)',
};

interface RowSelectCellProps {
  /** 행 식별자 — 보이지 않는 라벨의 id 를 만든다(한 문서에 여러 표가 있어도 안 겹치게 접두사를 받는다) */
  readonly id: string;
  /** 보이지 않는 라벨 문구 — 예: `'${공지 제목} 선택'` */
  readonly label: string;
  readonly checked: boolean;
  readonly onToggle: (checked: boolean) => void;
}

/**
 * 표 행의 선택 칸 — 보이지 않는 라벨 + 단일 체크박스.
 *
 * MembersTable 이 손으로 그리던 마크업을 콘텐츠 목록(공지·FAQ·팝업·배너·버전 이력)이 다섯 번째
 * 소비자가 되며 올렸다. 도메인을 모른다 — id·라벨 문구·checked·콜백만 받는다.
 */
/* ── 순번 열 (여러 목록 공유 — 가운데 정렬) ───────────────────────────────────
 *
 * 목록 표 대부분이 '순번' 열을 갖는다(체크박스 다음, 1-based). 헤더/셀을 각 표가 손으로 그리면
 * 정렬(가운데)·숫자 표기(tabular-nums)가 표마다 어긋난다. RowSelectCell 과 같은 결로 여기 한 벌만 둔다.
 * 도메인을 모른다 — 순번 숫자만 받는다. */

const seqHeadStyle: CSSProperties = { ...thStyle, textAlign: 'center' };

const seqCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
};

/** 표 헤더의 순번 열 — 가운데 정렬 */
export function SeqHeaderCell() {
  return (
    <th scope="col" style={seqHeadStyle}>
      순번
    </th>
  );
}

/** 표 행의 순번 셀 — 가운데 정렬, 1-based 숫자 표기 */
export function SeqCell({ seq }: { readonly seq: number }) {
  return <td style={seqCellStyle}>{formatNumber(seq)}</td>;
}

export function RowSelectCell({ id, label, checked, onToggle }: RowSelectCellProps) {
  const labelId = `select-${id}`;
  return (
    <td style={selectCellStyle}>
      <span style={visuallyHiddenStyle} id={labelId}>
        {label}
      </span>
      <input
        type="checkbox"
        className="tds-ui-check tds-ui-focusable"
        style={checkboxStyle}
        checked={checked}
        aria-labelledby={labelId}
        onChange={(event) => onToggle(event.target.checked)}
      />
    </td>
  );
}
