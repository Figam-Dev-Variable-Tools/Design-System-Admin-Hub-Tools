// 선택 가능한 목록 표 (앱 공용 선언적 CRUD 프레임워크)
//
// 연혁·인증서·ESG 목록이 같은 표 골격을 쓴다: 체크박스 + 순번 + (열들) + 행 액션(수정/삭제).
// 열 구성만 다르므로 columns 로 받는다. 콘텐츠 목록이 쓰는 프리미티브(RowSelectCell·
// SelectAllHeaderCell·RowActions·tableSelectionState)를 그대로 재사용한다.
//
// [표의 골격은 @tds/ui 의 Table 이 소유한다 — 2026-07-20 승격]
//   <table>·<caption>·정렬 헤더·스켈레톤·빈 행·행 활성화 가드가 DS 로 갔다. 이 파일에 남은 것은
//   **앱만 아는 것**이다: 권한(canUpdate·canRemove)이 어떤 열을 만드는가, 캡션 문장, 선택 상태,
//   행 모델(TanStack), 빈 상태의 한국어 카피(Empty). DS 는 그 결과만 받아 그린다.
//
//   권한이 만든 열(체크박스·순번·액션)은 **완성된 <th>/<td> 배열**로 넘긴다 — DS 가 canRemove 를
//   배우지 않게 하려는 것이고, 배열 길이가 곧 열 수라 colSpan 을 손으로 셀 자리가 사라졌다.
//
// [행 모델은 @tanstack/react-table 이 소유한다 — 오너 확정 스택]
//   표에서 '무엇을 어떤 순서로 그릴 것인가'(행 모델 · 정렬 상태 · 정렬 비교)는 라이브러리가 갖고,
//   '어떻게 보일 것인가'(셀 마크업 · 토큰 · a11y)는 이 파일이 갖는다.
//
//   체크박스 · 순번 · 행 액션을 TanStack 의 display column 으로 넣지 않고 손으로 그리는 이유:
//   이 셋은 **데이터 열이 아니라 표의 골격**이다. 순번은 정렬과 무관하게 화면상 위치를 세고
//   (정렬해도 1,2,3 이다), 체크박스는 선택 상태를, 액션은 행 정체성을 다룬다. 이것을 컬럼 모델에
//   넣으면 flexRender 를 거치느라 25개 화면이 의존하는 DOM 이 바뀐다. 얻는 것 없이 위험만 산다.
//
// [정렬은 opt-in 이다] column.sortValue 를 준 열만 정렬 가능해진다. 아무 화면도 주지 않으면
//   렌더 결과는 도입 전과 **완전히 동일**하다 (getSortedRowModel 은 빈 sorting 에서 항등이다).
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { cssVar, Table } from '@tds/ui';

import { rowTargetSentence, type RowTarget } from './rowTarget';

import {
  Empty,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  tableSelectionState,
  thStyle,
  visuallyHiddenStyle,
} from '../ui';

export interface CrudColumn<T> {
  readonly header: string;
  readonly render: (item: T) => ReactNode;
  /** 숫자 열 — 우측 정렬 + tabular-nums */
  readonly numeric?: boolean;
  /** 줄바꿈 방지 */
  readonly nowrap?: boolean;
  /**
   * 이 열로 정렬할 때 비교할 값. 주면 헤더가 정렬 버튼이 되고 `aria-sort` 가 붙는다.
   * 없으면 이 열은 정렬 불가다 (기본).
   */
  readonly sortValue?: (item: T) => string | number;
}

/** 정렬 상태 — 열 header 를 키로 쓴다 (열의 고유 식별자) */
export interface CrudSort {
  readonly key: string;
  readonly direction: 'asc' | 'desc';
}

/* 액션 열의 <td> 는 이 파일이 그린다 — DS Table 은 trailing 을 완성된 셀로 받는다.
   폭·우측 정렬은 이 앱의 액션 버튼 두 개(연필·휴지통)에 맞춘 값이라 DS 로 올리지 않았다. */
const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('component.table.cell-padding-y'),
  paddingBottom: cssVar('component.table.cell-padding-y'),
  paddingLeft: cssVar('component.table.cell-padding-x'),
  paddingRight: cssVar('component.table.cell-padding-x'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('component.table.divider'),
  verticalAlign: 'middle',
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
};

const rowActionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
};

/**
 * 빈 상태의 맥락 (STATE-05) — '왜 비었는가' 를 표가 알아야 무엇을 권할지 정할 수 있다.
 *
 * 예전에는 `emptyLabel: string` 하나였고, 26개 호출부가 전부 '등록된 X이(가) 없습니다' 를 하드코딩
 * 했다. 그래서 **검색이 안 맞아서 비었을 때도** '아직 없으니 등록하세요' 라고 말했다 — 사용자는
 * 지우면 될 검색어를 그대로 둔 채 등록 버튼을 찾는다. 조사(이/가)도 26곳에 손으로 박혀 있었다.
 */
export interface EmptyContext {
  /** 검색어가 걸려 있는가 → '검색 지우기' */
  readonly hasQuery?: boolean;
  /** 필터가 걸려 있는가 → '필터 초기화' */
  readonly hasActiveFilters?: boolean;
  readonly onClearSearch?: () => void;
  readonly onResetFilters?: () => void;
  /** 정말 비었을 때만 보이는 생성 CTA */
  readonly createAction?: ReactNode;
  /** '{createVerb}된 {label}이(가) 없습니다' — 기본 '등록' */
  readonly createVerb?: string;
}

interface CrudTableProps<T extends { id: string }> {
  readonly items: readonly T[];
  /** **최초 로드만** — 재조회 중에는 false 여야 이전 행이 유지된다 (STATE-01) */
  readonly loading: boolean;
  readonly entityLabel: string;
  readonly columns: readonly CrudColumn<T>[];
  /** 각 행의 접근성 이름(선택 라벨·액션 라벨) */
  readonly nameOf: (item: T) => string;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  /** 연필 버튼이 하는 일 — **행 클릭과 다르다.** 행 클릭은 rowTarget 이 정한다 */
  readonly onEdit: (item: T) => void;
  readonly onDelete: (item: T) => void;
  /**
   * 행을 눌렀을 때 갈 곳. 캡션 문장이 여기서 파생된다 (rowTarget.ts 머리말 참조).
   * 주지 않으면 예전 동작 그대로 — onEdit 를 부르고 캡션은 '수정 화면으로 이동' 이다.
   */
  readonly rowTarget?: RowTarget<T>;
  /**
   * 이 행의 활성화 콜백. `undefined` 면 행이 눌리지 않는다(커서도 pointer 가 아니다).
   * 이동은 라우터를 아는 껍데기가 풀어 주므로 이 표는 계속 라우터를 모른다.
   */
  readonly activatorFor?: (item: T) => (() => void) | undefined;
  readonly deletingId: string | null;
  readonly selectAllLabelId: string;
  /** 빈 상태의 맥락 — 없으면 '진짜 비어있음' 으로 그린다 */
  readonly empty?: EmptyContext;
  /** 현재 정렬 — null 이면 items 가 온 순서 그대로다 (어댑터의 정본 순서) */
  readonly sort?: CrudSort | null;
  /** 정렬 가능한 헤더를 눌렀을 때. sort 를 주면서 이것을 빼면 헤더는 눌러도 조용하다 */
  readonly onToggleSort?: (key: string) => void;
  /**
   * 수정 권한 (EXC-03) — false 면 연필 버튼과 **행 클릭 이동**을 그리지 않는다.
   *
   * 연필만 숨기고 행 클릭을 남기면 게이팅이 무의미하다 — 행 아무 데나 누르면 폼이 열린다.
   * 기본 true: CrudListShell 밖에서 이 표를 직접 쓰는 호출부는 도입 전과 동일하게 동작한다.
   */
  readonly canUpdate?: boolean;
  /**
   * 삭제 권한 (EXC-03) — false 면 휴지통 버튼과 **선택 체크박스**를 그리지 않는다.
   *
   * 체크박스까지 지우는 이유: CrudListShell 에서 선택을 소비하는 것은 일괄 삭제뿐이다.
   * 삭제할 수 없는 역할에게 체크박스를 남기면 아무것도 일어나지 않는 UI 를 고르게 된다.
   */
  readonly canRemove?: boolean;
}

/* 예전 동작을 이름만 붙인 것 — 23개 화면 중 17개가 실제로 이것이다.
   나머지(상세로 가는 2개·모달 4개)는 자기 rowTarget 을 명시한다. */
const DEFAULT_ROW_TARGET = { kind: 'edit' as const, href: () => '' };

export function CrudTable<T extends { id: string }>({
  items,
  loading,
  entityLabel,
  columns,
  nameOf,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onEdit,
  onDelete,
  rowTarget = DEFAULT_ROW_TARGET,
  activatorFor,
  deletingId,
  selectAllLabelId,
  empty = {},
  sort = null,
  onToggleSort,
  canUpdate = true,
  canRemove = true,
}: CrudTableProps<T>) {
  const selection = tableSelectionState(items, selectedIds);
  /* 권한이 골격을 바꾼다 (EXC-03) — 체크박스 열과 액션 열이 통째로 사라질 수 있다.
     예전에는 여기서 colSpan 을 손으로 셌으나(`columns.length + 1 + …`), 지금은 DS Table 이
     leadingHead/trailingHead **배열의 길이**로 스스로 센다 — 식이 틀릴 자리가 사라졌다. */
  const showSelect = canRemove;
  const showActions = canUpdate || canRemove;

  /* ── TanStack 행 모델 ────────────────────────────────────────────────────
     열 정의는 header 를 id 로 삼는다 — CrudColumn 에 별도 id 가 없고, 한 표 안에서
     header 는 이미 유일하다 (기존 코드도 header 를 React key 로 쓰고 있었다).

     [useMemo 를 붙인 이유] TanStack 은 columns/data 의 **참조**로 캐시를 무효화한다.
     매 렌더마다 새 배열을 만들어 넘기면 행 모델·정렬을 매번 다시 계산한다. 지금은 3~22행이라
     티가 안 나지만, 이 도입의 목적이 '행이 늘어날 때'인 만큼 그때 정확히 새는 자리다. */
  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<T>();
    return columns.map((column) =>
      helper.accessor((item) => (column.sortValue === undefined ? '' : column.sortValue(item)), {
        id: column.header,
        header: column.header,
        enableSorting: column.sortValue !== undefined,
        // 셀은 CrudColumn.render 가 그대로 그린다 — 표시는 계속 호출부의 것이다
        cell: (context) => column.render(context.row.original),
      }),
    );
  }, [columns]);

  const data = useMemo(() => [...items], [items]);

  const sorting: SortingState = useMemo(
    () => (sort === null ? [] : [{ id: sort.key, desc: sort.direction === 'desc' }]),
    [sort],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    getRowId: (item) => item.id,
    manualSorting: false,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: () => {
      /* 정렬 상태의 단일 원천은 URL(useListState.sort)이다 — 헤더 버튼이 onToggleSort 로
         직접 올린다. TanStack 의 내부 상태 갱신 경로는 쓰지 않는다 (state 를 항상 주입한다). */
    },
  });

  const rows = table.getRowModel().rows;

  /* 껍데기가 activatorFor 를 주면 그것이 정본이다(목적지·게이팅을 이미 푼 결과).
     주지 않은 호출부는 도입 전과 동일하게 onEdit 로 떨어진다 — 점진 이관을 위한 사다리다. */
  const resolveActivator = (item: T): (() => void) | undefined =>
    activatorFor === undefined
      ? () => {
          onEdit(item);
        }
      : activatorFor(item);

  /* 캡션이 권한을 따라간다 — 없는 버튼을 있다고 읽어 주면 스크린리더 사용자는
     존재하지 않는 조작을 찾아 표를 헤맨다 (A11Y). DS Table 은 권한을 모르므로
     문장을 고르는 것은 계속 이 파일의 일이다.

     [첫 문장을 손으로 적지 않는다] 예전에는 여기서 "행을 누르면 해당 항목으로 이동합니다"
     를 **모든 화면에 똑같이** 읽어 줬다. 모달을 여는 4개 화면은 이동하지 않고, 게이팅된
     행은 아무 일도 하지 않는데도 그렇게 말했다. 이제 문장이 rowTarget 에서 파생되므로
     화면이 하는 일과 낭독이 갈라질 수 없다. */
  const caption =
    (canUpdate
      ? rowTargetSentence(rowTarget, entityLabel)
      : `${entityLabel} 목록 — 조회 전용이에요.`) +
    (showActions
      ? ` ${[showSelect && '체크박스', canUpdate && '수정', canRemove && '삭제']
          .filter((part) => part !== false)
          .join('·')} 버튼은 각자 따로 동작해요.`
      : '');

  /* 데이터 열만 DS 로 넘긴다 — header 가 곧 id 다(한 표 안에서 이미 유일하며 정렬 키로도 쓰인다).
     numeric/nowrap 은 표시 규칙이라 DS 의 align/nowrap 으로 그대로 옮겨간다. */
  const dsColumns = columns.map((column) => ({
    id: column.header,
    header: column.header,
    ...(column.numeric === true && { align: 'end' as const }),
    ...(column.nowrap === true && { nowrap: true }),
    ...(column.sortValue !== undefined && { sortable: true }),
  }));

  /* 체크박스·순번·액션 열은 **완성된 셀**로 넘긴다 — DS 가 canRemove 를 배우지 않도록.
     배열이라 길이가 곧 열 수이고 DS 가 colSpan 을 스스로 센다. */
  const leadingHead = [
    ...(showSelect
      ? [
          <SelectAllHeaderCell
            key="select"
            label={`이 페이지의 ${entityLabel} 전체 선택`}
            labelId={selectAllLabelId}
            selection={selection}
            onToggleAll={onToggleAll}
          />,
        ]
      : []),
    <SeqHeaderCell key="seq" />,
  ];

  const trailingHead = showActions
    ? [
        <th key="actions" scope="col" style={thStyle}>
          <span style={visuallyHiddenStyle}>행 액션</span>
        </th>,
      ]
    : [];

  /* 행 활성화 게이팅은 **목적지의 성격**이 정한다. 예전에는 무조건 canUpdate 에 묶여 있어
     조회 전용 역할이 상세로 가는 길까지 잃었다(읽기 전용 목록의 핵심 결함이자 Review 화면의
     잠재 버그였다).
       detail        → 읽기 권한만 있으면 누구나 간다. 라우트 진입을 RequirePermission 이 이미
                       막으므로 여기서 canUpdate 로 또 막을 이유가 없다.
       edit·modal    → 수정 권한(canUpdate)에 묶인다.
       레거시(무목적지) → 예전처럼 canUpdate 에 묶인다(onEdit 로 폼을 연다). */
  const activationAllowed = rowTarget.kind === 'detail' ? true : canUpdate;

  const dsRows = rows.map((row, index) => {
    const item = row.original;
    /* exactOptionalPropertyTypes — `(() => void) | undefined` 를 그대로 실어 보내면
       '키는 있는데 값이 undefined' 가 되어 DS 계약과 어긋난다. 키 자체를 뺀다. */
    const activate = activationAllowed ? resolveActivator(item) : undefined;

    return {
      id: row.id,
      cells: row
        .getVisibleCells()
        .map((cell) => flexRender(cell.column.columnDef.cell, cell.getContext())),
      leading: [
        ...(showSelect
          ? [
              <RowSelectCell
                key="select"
                id={item.id}
                label={`${nameOf(item)} 선택`}
                checked={selectedIds.has(item.id)}
                onToggle={(checked) => onToggleOne(item.id, checked)}
              />,
            ]
          : []),
        // 순번은 화면상 위치다 — 정렬해도 위에서부터 1,2,3 이다
        <SeqCell key="seq" seq={index + 1} />,
      ],
      ...(showActions && {
        trailing: [
          <td key="actions" style={actionCellStyle}>
            <span style={rowActionsWrapStyle}>
              {/* RowActions 는 콜백이 있을 때만 그 버튼을 그린다 — 권한을 콜백의
                  유무로 표현하면 계약을 바꾸지 않고 게이팅이 성립한다 */}
              <RowActions
                label={nameOf(item)}
                disabled={deletingId === item.id}
                {...(canUpdate && { onEdit: () => onEdit(item) })}
                {...(canRemove && { onDelete: () => onDelete(item) })}
              />
            </span>
          </td>,
        ],
      }),
      /* 수정 권한이 없으면 행 클릭 이동 자체를 걸지 않는다 — 연필만 숨기면
         행 아무 데나 눌러 폼이 열려 게이팅이 무의미해진다.
         인터랙티브 요소 가드와 드래그 선택 가드는 이제 DS Table 이 소유한다
         (useRowNavigation 이 갖고 있던 규칙을 그대로 옮겼다).

         [activatorFor 가 undefined 를 줄 수 있다] 행 목적지가 'none' 이거나 그 행이
         지금 갈 수 없으면(발송 완료된 캠페인 등) onActivate 를 **아예 넘기지 않는다.**
         예전에는 빈 콜백을 넘겨서 커서만 pointer 이고 눌러도 아무 일이 없었다. */
      ...(activate === undefined ? {} : { onActivate: activate }),
      /* 선택 여부는 체크박스 셀에만 있던 사실이었다 — 행 전체의 시각·aria-selected 로
         올린다. 선택 열이 없는 표에는 주지 않는다: 그러면 DS 가 aria-selected="false" 를
         달아 스크린리더가 없는 선택 조작을 있다고 읽는다. */
      ...(showSelect && { selected: selectedIds.has(item.id) }),
    };
  });

  return (
    <Table
      caption={caption}
      columns={dsColumns}
      rows={dsRows}
      leadingHead={leadingHead}
      trailingHead={trailingHead}
      loading={loading}
      sortKey={sort === null ? '' : sort.key}
      sortDirection={sort === null ? 'asc' : sort.direction}
      {...(onToggleSort !== undefined && { onSortToggle: onToggleSort })}
      empty={
        /* 조사(이/가)·3분기 copy·복구 액션은 전부 Empty 가 소유한다 — 호출부는 맥락만 준다 */
        <Empty
          label={entityLabel}
          createVerb={empty.createVerb ?? '등록'}
          hasQuery={empty.hasQuery ?? false}
          hasActiveFilters={empty.hasActiveFilters ?? false}
          action={empty.createAction ?? null}
          {...(empty.onClearSearch !== undefined && { onClearSearch: empty.onClearSearch })}
          {...(empty.onResetFilters !== undefined && {
            onResetFilters: empty.onResetFilters,
          })}
        />
      }
    />
  );
}
