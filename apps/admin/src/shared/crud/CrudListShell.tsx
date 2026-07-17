// 목록형 화면 본문 껍데기 (앱 공용 선언적 CRUD 프레임워크)
//
// 연혁·인증서·ESG 의 '툴바 + 요약 + 일괄 삭제 바(SelectionBar) + 표 + 조회 실패 배너 + 삭제 다이얼로그'
// 를 한 벌로 모은다. 화면은 필터를 적용한 visibleItems 와 열/툴바만 넘긴다. 좌측 필터 패널이 있는
// 화면(ESG)은 이 껍데기를 자기 레이아웃(그리드)의 오른쪽 열로 감싼다.
import type { CSSProperties, ReactNode } from 'react';

import { formatNumber } from '../format';
import {
  Alert,
  alertActionRowStyle,
  Button,
  hintStyle,
  SelectionBar,
  visuallyHiddenStyle,
} from '../ui';
import { CrudTable } from './CrudTable';
import type { CrudColumn, CrudSort, EmptyContext } from './CrudTable';

/* 목록 페이지의 section gap — space.5(20px). 제목 · 필터 · 표 · 페이지네이션이
   각각 다른 덩어리로 읽히게 띄운다 (TOKEN-08). */
const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  minWidth: 0,
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
};

interface CrudListShellController<T extends { id: string }> {
  /** 최초 로드 — 스켈레톤의 유일한 조건 (STATE-01) */
  readonly firstLoading: boolean;
  /** 데이터가 있는 채로 재조회 중 — 표를 비우지 않고 요약만 알린다 (STATE-03) */
  readonly refreshing: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
  readonly selectedIds: ReadonlySet<string>;
  readonly toggleOne: (id: string, checked: boolean) => void;
  readonly toggleAll: (ids: readonly string[], checked: boolean) => void;
  readonly clear: () => void;
  readonly selectedCount: number;
  readonly deletingId: string | null;
  readonly requestDelete: (item: T) => void;
  readonly requestBulkDelete: () => void;
  readonly dialogs: ReactNode;
}

interface CrudListShellProps<T extends { id: string }> {
  readonly entityLabel: string;
  readonly controller: CrudListShellController<T>;
  /** 필터·검색을 적용한 뒤 화면에 보일 항목 */
  readonly visibleItems: readonly T[];
  readonly columns: readonly CrudColumn<T>[];
  readonly nameOf: (item: T) => string;
  readonly selectAllLabelId: string;
  /** 빈 상태의 맥락 — 검색/필터/진짜 비어있음을 구분한다 (STATE-05) */
  readonly empty?: EmptyContext;
  /** 상단 툴바(등록 버튼·검색·필터 등) */
  readonly toolbar: ReactNode;
  readonly onEdit: (item: T) => void;
  /**
   * 현재 정렬 — 주지 않으면 visibleItems 가 온 순서 그대로다 (어댑터의 정본 순서).
   * 단일 원천은 URL 이다: 화면이 useListState 의 sort/setSort 를 그대로 흘려보낸다 (IA-13).
   */
  readonly sort?: CrudSort | null;
  readonly onToggleSort?: (key: string) => void;
}

/**
 * 스크린리더에 알릴 목록 상태 한 줄 (A11Y-16).
 *
 * 최초 로드 중에는 침묵한다 — 아직 알릴 사실이 없고, 로드가 끝나면 결과를 알린다.
 */
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

export function CrudListShell<T extends { id: string }>({
  entityLabel,
  controller,
  visibleItems,
  columns,
  nameOf,
  selectAllLabelId,
  empty,
  toolbar,
  onEdit,
  sort = null,
  onToggleSort,
}: CrudListShellProps<T>) {
  const { firstLoading, refreshing, error, selectedCount } = controller;

  return (
    <div style={columnStyle}>
      {/*
        [A11Y-16] **항상 마운트된** polite live region.

        Empty 자신도 role="status" 를 갖지만, 그 노드는 **내용과 함께 생성**된다 — 그렇게 삽입된
        live region 은 NVDA/JAWS 에서 신뢰성 있게 announce 되지 않는다(ToastProvider 가 지속
        컨테이너를 두는 것과 정확히 같은 이유다 — A11Y-01). 그래서 지속 region 은 몰리큘이 아니라
        **껍데기**가 소유하고, 여기에 텍스트만 주입한다. 필터·검색으로 0행이 되는 전환이 이 줄로 들린다.
      */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {announcementOf(firstLoading, error, entityLabel, visibleItems.length)}
      </div>

      {toolbar}

      {error === null ? (
        <>
          <div style={summaryRowStyle}>
            {/* 재조회 중에는 건수를 지우지 않는다 — 이전 값을 유지한 채 '새로고침 중' 만 덧붙인다.
                예전에는 재조회도 '불러오는 중…' 으로 덮어 화면의 사실이 사라졌다 (STATE-01/03). */}
            <p style={hintStyle} aria-busy={refreshing}>
              {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visibleItems.length)}건`}
              {refreshing && ' · 새로고침 중…'}
              {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
            </p>
          </div>

          <SelectionBar count={selectedCount} onClear={controller.clear}>
            <Button
              variant="danger"
              disabled={controller.deletingId !== null}
              onClick={controller.requestBulkDelete}
            >
              {`선택 ${formatNumber(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <CrudTable
            items={visibleItems}
            loading={firstLoading}
            entityLabel={entityLabel}
            columns={columns}
            nameOf={nameOf}
            selectedIds={controller.selectedIds}
            onToggleOne={controller.toggleOne}
            onToggleAll={(checked) =>
              controller.toggleAll(
                visibleItems.map((item) => item.id),
                checked,
              )
            }
            onEdit={onEdit}
            onDelete={controller.requestDelete}
            deletingId={controller.deletingId}
            selectAllLabelId={selectAllLabelId}
            {...(empty !== undefined && { empty })}
            sort={sort}
            {...(onToggleSort !== undefined && { onToggleSort })}
          />
        </>
      ) : (
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>{entityLabel} 목록을 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={controller.refetch}>
              다시 시도
            </Button>
          </div>
        </Alert>
      )}

      {controller.dialogs}
    </div>
  );
}
