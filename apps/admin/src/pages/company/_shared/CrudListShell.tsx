// 목록형 화면 본문 껍데기 (A41 소유 — apps/admin/src/pages/company/**)
//
// 연혁·인증서·ESG 의 '툴바 + 요약 + 일괄 삭제 바(SelectionBar) + 표 + 조회 실패 배너 + 삭제 다이얼로그'
// 를 한 벌로 모은다. 화면은 필터를 적용한 visibleItems 와 열/툴바만 넘긴다. 좌측 필터 패널이 있는
// 화면(ESG)은 이 껍데기를 자기 레이아웃(그리드)의 오른쪽 열로 감싼다.
import type { CSSProperties, ReactNode } from 'react';

import { formatNumber } from '../../../shared/format';
import { Alert, Button, hintStyle, SelectionBar } from '../../../shared/ui';
import { CrudTable } from './CrudTable';
import type { CrudColumn } from './CrudTable';

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

interface CrudListShellController<T extends { id: string }> {
  readonly loading: boolean;
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
  readonly emptyLabel: string;
  /** 상단 툴바(등록 버튼·검색·필터 등) */
  readonly toolbar: ReactNode;
  readonly onEdit: (item: T) => void;
}

export function CrudListShell<T extends { id: string }>({
  entityLabel,
  controller,
  visibleItems,
  columns,
  nameOf,
  selectAllLabelId,
  emptyLabel,
  toolbar,
  onEdit,
}: CrudListShellProps<T>) {
  const { loading, error, selectedCount } = controller;

  return (
    <div style={columnStyle}>
      {toolbar}

      {error === null ? (
        <>
          <div style={summaryRowStyle}>
            <p style={hintStyle}>
              {loading ? '불러오는 중…' : `전체 ${formatNumber(visibleItems.length)}건`}
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
            loading={loading}
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
            emptyLabel={emptyLabel}
          />
        </>
      ) : (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
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
