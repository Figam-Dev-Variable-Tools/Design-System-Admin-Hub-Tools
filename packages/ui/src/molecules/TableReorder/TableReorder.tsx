// TableReorder — 표 행 드래그 재정렬 (molecule 묶음 · 계약 비대상 · 순수 훅/유틸 + 표 조각)
//
// FAQ·배너 목록이 '행을 드래그해 정렬 순서를 바꾼다'를 공유한다. moveArrayItem(순수 연산) · 드래그 상태 훅
// (useReorderableRows) · grip/이동 버튼이 두 페이지에 복사되면 히트 영역·색·순서 계산이 어긋난다. 한 벌로 올린다.
// 도메인을 모른다 — id 목록과 onReorder 콜백, 각 행의 접근성 라벨만 받는다.
//
// [계약을 두지 않은 이유] 이 묶음의 실제 API 는 순수 훅 useReorderableRows(및 그 원자 연산 moveArrayItem)다 —
// 훅/유틸은 계약 대상이 아니라 함께 이동하는 유틸이다(TriStateCheckbox 의 triStateProps 선례). 남는 표시 조각
// (ReorderGripCell·ReorderGripHeaderCell·ReorderMoveButtons)은 이 훅의 표시 글루다. ReorderMoveButtons 의
// onMove 는 (index, delta) 2-인자로, 계약 events 의 단일 payload 시그니처로 정확히 표현되지 않는다 —
// 무리한 계약 대신 훅과 함께 이동하고 테스트로 동작을 고정한다.
//
// [마우스 + 키보드] 드래그는 마우스 전용이라, 각 행에 위/아래 이동 버튼(↑↓)을 함께 제공한다.
// 드래그와 버튼 둘 다 결국 moveArrayItem 으로 귀결된다(같은 순수 연산).
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
//
// [onReorder 는 **무엇이 움직였는지**도 함께 준다]
// 예전에는 새 순서 배열만 넘겼다. 그러면 호출부가 '무엇이 몇 번째로 갔는지' 를 배열 diff 로 되짚어야
// 하는데, 이웃한 두 행이 자리를 맞바꾼 경우 그 diff 는 **원리적으로 모호하다**(A 를 내린 것과 B 를
// 올린 것이 같은 배열을 만든다). 그래서 라이브 영역 낭독이 엉뚱한 행을 부르게 된다 —
// 순서 변경이 보조기술에 전달돼야 한다는 요구를 훅이 스스로 막고 있었던 셈이다.
// 훅은 두 경로 모두에서 움직인 id 를 이미 알고 있다(드래그: 끌던 행 · 버튼: 그 행). 버리지 않고 넘긴다.
// 두 번째 인자는 **덧붙임**이라 `(orderedIds) => …` 로 받던 기존 호출부는 그대로 성립한다.
import { useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';

import './TableReorder.css';

/**
 * 배열에서 한 항목을 from → to 로 옮긴 새 배열을 돌려준다(재정렬의 원자 연산).
 * 드래그(overId 위치로)와 키보드(±1)가 모두 이 순수 함수로 귀결된다. 범위를 벗어나면 원본 복사본을 돌려준다.
 */
export function moveArrayItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return [...items];
  next.splice(to, 0, moved);
  return next;
}

/* ── 재정렬 전용 아이콘 (이 모듈에서만 쓴다) ─────────────────────────────────── */

const ICON_BASE = {
  className: 'tds-reorder__glyph',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

/** 드래그 손잡이 — 세로 점 6개 */
function GripVerticalIcon() {
  return (
    <svg {...ICON_BASE}>
      <circle cx="9" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg {...ICON_BASE}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg {...ICON_BASE}>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </svg>
  );
}

/* ── 드래그 상태 훅 ──────────────────────────────────────────────────────────── */

interface ReorderableRows {
  /** <tr> 에 펼쳐 넣는 드래그 핸들러 */
  readonly rowProps: (id: string) => {
    readonly draggable: boolean;
    readonly onDragStart: (event: DragEvent<HTMLTableRowElement>) => void;
    readonly onDragOver: (event: DragEvent<HTMLTableRowElement>) => void;
    readonly onDrop: (event: DragEvent<HTMLTableRowElement>) => void;
    readonly onDragEnd: () => void;
  };
  /** 드래그 중 시각 피드백(끄는 행은 흐리게, 놓을 자리 위에 강조선)을 base 스타일에 얹는다 */
  readonly rowStyle: (id: string, base: CSSProperties) => CSSProperties;
  /** 키보드 이동 버튼 — index 를 delta(±1)만큼 옮긴 새 순서로 onReorder 를 부른다 */
  readonly moveBy: (index: number, delta: number) => void;
}

/**
 * 표 행 드래그 재정렬 상태. ids(현재 화면 순서)와 onReorder(새 순서 요청), locked(저장 중 잠금)를 받는다.
 * 저장/낙관적 업데이트·롤백은 호출부(페이지)가 한다 — 이 훅은 '새 순서 배열'만 만들어 넘긴다.
 *
 * onReorder 의 두 번째 인자 `movedId` 는 **이번에 움직인 행**이다(드래그: 끌던 행 · 버튼: 그 행).
 * 호출부가 '무엇이 몇 번째로 갔는지' 를 낭독할 때 쓴다 — 배열만으로는 되짚을 수 없다(파일 머리말).
 */
export function useReorderableRows(
  ids: readonly string[],
  onReorder: (orderedIds: readonly string[], movedId: string) => void,
  locked: boolean,
): ReorderableRows {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reorderTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    onReorder(moveArrayItem(ids, from, to), fromId);
  };

  const clear = () => {
    setDraggingId(null);
    setOverId(null);
  };

  const rowProps = (id: string) => ({
    draggable: !locked,
    onDragStart: (event: DragEvent<HTMLTableRowElement>) => {
      if (locked) return;
      setDraggingId(id);
      event.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
      if (draggingId === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (overId !== id) setOverId(id);
    },
    onDrop: (event: DragEvent<HTMLTableRowElement>) => {
      event.preventDefault();
      if (draggingId !== null) reorderTo(draggingId, id);
      clear();
    },
    onDragEnd: clear,
  });

  const rowStyle = (id: string, base: CSSProperties): CSSProperties => {
    const style: CSSProperties = { ...base };
    if (draggingId === id) style.opacity = 0.5;
    // 놓을 자리 위에 강조선 — 어디에 떨어질지 보여준다
    if (overId === id && draggingId !== null && draggingId !== id) {
      style.boxShadow = 'inset 0 var(--tds-border-width-medium) 0 0 var(--tds-color-border-focus)';
    }
    return style;
  };

  const moveBy = (index: number, delta: number) => {
    const movedId = ids[index];
    if (movedId === undefined) return;
    onReorder(moveArrayItem(ids, index, index + delta), movedId);
  };

  return { rowProps, rowStyle, moveBy };
}

/* ── 재사용 셀·버튼 ──────────────────────────────────────────────────────────── */

/** 헤더의 grip 열 — 보이지 않는 라벨만 둔다 */
export function ReorderGripHeaderCell() {
  return (
    <th scope="col" className="tds-reorder__griphead">
      <span className="tds-reorder__sr">정렬 손잡이</span>
    </th>
  );
}

/** 행의 grip 열 — 드래그 손잡이 아이콘 */
export function ReorderGripCell() {
  return (
    <td className="tds-reorder__gripcell" aria-hidden="true">
      <GripVerticalIcon />
    </td>
  );
}

interface ReorderMoveButtonsProps {
  /** 스크린 리더용 대상 이름 — 행마다 달라야 한다('첫 번째 질문') */
  readonly label: string;
  readonly index: number;
  /** 전체 행 수 — 마지막 행의 '아래로'를 잠근다 */
  readonly count: number;
  /** 저장 진행 중 — 전부 잠근다 */
  readonly locked: boolean;
  readonly onMove: (index: number, delta: number) => void;
}

/** 키보드/보조 접근 경로 — 위/아래 이동 버튼 한 쌍 */
export function ReorderMoveButtons({
  label,
  index,
  count,
  locked,
  onMove,
}: ReorderMoveButtonsProps) {
  return (
    <>
      <button
        type="button"
        className="tds-reorder__btn"
        aria-label={`${label} 위로 이동`}
        disabled={locked || index === 0}
        onClick={() => onMove(index, -1)}
      >
        <ArrowUpIcon />
      </button>
      <button
        type="button"
        className="tds-reorder__btn"
        aria-label={`${label} 아래로 이동`}
        disabled={locked || index === count - 1}
        onClick={() => onMove(index, 1)}
      >
        <ArrowDownIcon />
      </button>
    </>
  );
}
