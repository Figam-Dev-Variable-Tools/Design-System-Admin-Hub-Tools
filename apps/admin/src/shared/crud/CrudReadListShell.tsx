// 읽기 전용 목록 껍데기 (앱 공용 선언적 CRUD 프레임워크)
//
// [왜 CrudListShell 과 나누는가] 문의·상담·티켓·반품 같은 목록은 **도메인 읽기 전용**이다 —
// 항목을 만드는 것은 고객·채널이고 관리자는 분류·처리만 한다. 이런 화면에는 삭제도, 일괄작업도,
// 선택 체크박스도 **어떤 역할에게도** 없어야 한다. 대신 누구나(조회 권한만 있으면) 행을 눌러
// 상세로 갈 수 있어야 한다.
//
// CrudListShell 은 이것을 표현하지 못한다: 삭제 가능 controller 를 강제하고, 선택을 canRemove 에,
// 행 클릭을 canUpdate 에 묶는다. 그 껍데기에 읽기 전용 분기를 덧대면 삭제-CRUD 모양에 이질적인
// 가지가 붙는다. 그래서 **같은 표 렌더러(CrudTable)를 공유하되 껍데기만 둘로 나눈다** —
// 이것은 '같은 것을 두 번 찍어내는' 중복이 아니라, 서로 다른 두 모양에 각자의 껍데기를 주는 것이다.
// 손으로 쓴 17개의 <table> 을 없애는 것이 이 분리의 목적이다.
//
// [행 클릭은 read 로 게이팅된다] 목적지가 detail 이면 CrudTable 이 canUpdate 가 아니라 읽기 권한으로
// 활성화를 판정한다(라우트 진입을 RequirePermission 이 이미 막는다). 그래서 이 껍데기는
// canUpdate·canRemove 를 false 로 넘겨 선택·액션 열을 없애면서도 행 클릭은 살린다.
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../format';
import { Alert, alertActionRowStyle, Button, hintStyle, visuallyHiddenStyle } from '../ui';
import { CrudTable } from './CrudTable';
import type { CrudColumn, CrudSort, EmptyContext } from './CrudTable';
import { rowActivator, type RowTarget } from './rowTarget';
import { cssVar } from '@tds/ui';

/* CrudListShell 과 같은 section gap — 두 껍데기가 같은 리듬으로 읽히게 한다 (TOKEN-08). */
const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

/** 표의 가로 스크롤 — 근거는 CrudListShell.tableScrollStyle 머리말과 같다 */
const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/** 읽기 전용 목록의 조회 상태 — UseQueryResult 에서 화면이 뽑아 넘긴다 */
interface ReadListState {
  /** 최초 로드 — 스켈레톤의 유일한 조건 (STATE-01) */
  readonly firstLoading: boolean;
  /** 데이터가 있는 채 재조회 중 — 표를 비우지 않고 요약만 알린다 (STATE-03) */
  readonly refreshing: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

interface CrudReadListShellProps<T extends { id: string }> {
  readonly entityLabel: string;
  readonly state: ReadListState;
  /** 필터·검색을 적용한 뒤 화면에 보일 항목 */
  readonly visibleItems: readonly T[];
  readonly columns: readonly CrudColumn<T>[];
  /** 각 행의 접근성 이름 */
  readonly nameOf: (item: T) => string;
  /**
   * 행을 눌렀을 때 갈 곳. 읽기 전용 목록에서는 사실상 `detail` 이다 (rowTarget.ts).
   * 활성화가 read 로 게이팅되므로 조회 전용 역할도 상세로 갈 수 있다.
   */
  readonly rowTarget: RowTarget<T>;
  /** 상단 툴바(검색·필터) */
  readonly toolbar: ReactNode;
  /** 빈 상태의 맥락 — 검색/필터/진짜 비어있음을 구분한다 (STATE-05) */
  readonly empty?: EmptyContext;
  readonly sort?: CrudSort | null;
  readonly onToggleSort?: (key: string) => void;
}

/** 선택이 없는 목록의 announce — CrudListShell 의 것과 같은 문장 규약 */
function announcementOf(
  firstLoading: boolean,
  error: Error | null,
  entityLabel: string,
  count: number,
): string {
  if (firstLoading) return '';
  if (error !== null) return `${entityLabel} 목록을 불러오지 못했습니다.`;
  if (count === 0) return `조건에 맞는 ${entityLabel} 결과가 없습니다.`;
  return `${entityLabel} ${formatNumber(count)}건을 찾았습니다.`;
}

/* 선택·삭제가 없으므로 CrudTable 의 선택 관련 prop 은 빈 값을 준다.
   canUpdate·canRemove=false 가 체크박스·액션 열을 지우고, rowTarget=detail 이 행 클릭을 살린다. */
const NO_SELECTION: ReadonlySet<string> = new Set();
const noop = () => {
  /* 읽기 전용 — 선택·수정·삭제 콜백은 불릴 일이 없다 */
};

export function CrudReadListShell<T extends { id: string }>({
  entityLabel,
  state,
  visibleItems,
  columns,
  nameOf,
  rowTarget,
  toolbar,
  empty,
  sort = null,
  onToggleSort,
}: CrudReadListShellProps<T>) {
  const navigate = useNavigate();
  const { firstLoading, refreshing, error } = state;

  return (
    <div style={columnStyle}>
      {/* [A11Y-16] 항상 마운트된 polite live region — CrudListShell 과 같은 이유(그쪽 주석 참조) */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {announcementOf(firstLoading, error, entityLabel, visibleItems.length)}
      </div>

      {toolbar}

      {error === null ? (
        <>
          <p style={hintStyle} aria-busy={refreshing}>
            {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visibleItems.length)}건`}
            {refreshing && ' · 새로고침 중…'}
          </p>

          <div style={tableScrollStyle}>
            <CrudTable
              items={visibleItems}
              loading={firstLoading}
              entityLabel={entityLabel}
              columns={columns}
              nameOf={nameOf}
              selectedIds={NO_SELECTION}
              onToggleOne={noop}
              onToggleAll={noop}
              onEdit={noop}
              rowTarget={rowTarget}
              activatorFor={(item: T) =>
                rowActivator(rowTarget, item, (href) => {
                  navigate(href);
                })
              }
              onDelete={noop}
              deletingId={null}
              selectAllLabelId=""
              /* 읽기 전용 — 선택 열도 액션 열도 어떤 역할에게든 없다. 행 클릭은 detail 이라
                 canUpdate 와 무관하게 read 로 게이팅된다(CrudTable 의 activationAllowed). */
              canUpdate={false}
              canRemove={false}
              {...(empty !== undefined && { empty })}
              sort={sort}
              {...(onToggleSort !== undefined && { onToggleSort })}
            />
          </div>
        </>
      ) : (
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>{entityLabel} 목록을 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={state.refetch}>
              다시 시도
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
