// FAQ 목록 표
//
// 행을 누르면 상세로 간다. 행 액션은 삭제(수정은 상세에서) — RowActions 공통 모듈.
//
// [정렬 순서 재정렬 — 오너 피드백 ③] 필터/검색이 없는 자연 순서 화면(reorderable)에서만 켠다.
//   드래그 핸들러·grip/화살표 아이콘·이동 버튼·moveArrayItem 은 배너 목록과 공유하는 공통 모듈이다
//   (@tds/ui TableReorder — useReorderableRows·ReorderGripCell·ReorderMoveButtons. shared/ui 배럴이 재수출한다).
//   순서 변경은 새 id 순서로 onReorder 를 부른다 — 저장/낙관적 업데이트·롤백은 호출부(FaqPage)가 한다.
//
// ┌ [EXC-03] 이 표가 게이팅을 하나도 받지 못하던 자리 ────────────────────────────────┐
// │ 손으로 만든 표라 CrudTable 의 canUpdate/canRemove 를 물려받지 못했다. 그래서 조회    │
// │ 권한만 가진 역할에게 **체크박스·휴지통·노출 스위치·순서 이동 버튼**이 전부 열려     │
// │ 있었고, 노출 스위치는 실제로 눌러 저장까지 됐다(인라인 토글 7종과 같은 결함이다).   │
// │ 노출 열은 **데이터 열이기도 하다** — 그래서 컨트롤만 사라지고 값은 배지로 남는다     │
// │ (shared/crud/RowToggle 이 그 규칙의 정본이다. 여기서 그것을 그대로 쓴다).           │
// └──────────────────────────────────────────────────────────────────────────────────┘
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { formatNumber } from '../../../../shared/format';
import {
  numericCellStyle,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  SkeletonRows,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import { RowToggle } from '../../../../shared/crud';
import { useRowNavigation } from '../../../../shared/useRowNavigation';
import { PAGE_SIZE } from '../types';
import type { FaqSummary } from '../types';
import { cssVar } from '@tds/ui';

const COLUMNS = ['질문', '카테고리', '노출', '정렬 순서'] as const;

const SELECT_ALL_LABEL_ID = 'faqs-select-all-label';

const questionCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const nowrapCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
};

const rowActionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

interface FaqTableProps {
  readonly faqs: readonly FaqSummary[];
  readonly loading: boolean;
  readonly onDelete: (faq: FaqSummary) => void;
  readonly deletingId: string | null;
  /** 정렬 재정렬을 켤지 — 필터/검색이 없는 자연 순서 화면에서만 true */
  readonly reorderable: boolean;
  /** 새 id 순서로 재정렬 요청 — 저장/낙관적 업데이트는 호출부가 한다 */
  readonly onReorder: (orderedIds: readonly string[]) => void;
  /** 재정렬 저장 진행 중 — 이동 버튼/드래그를 잠근다 */
  readonly reordering: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  readonly startIndex: number;
  /** 목록에서 바로 노출 여부 토글 */
  readonly onToggleVisible: (faq: FaqSummary, next: boolean) => void;
  /** 노출 토글 요청 중인 FAQ — 스위치를 잠근다 */
  readonly togglingIds: ReadonlySet<string>;
  /**
   * 수정 권한 (EXC-03) — false 면 노출 스위치가 **배지**가 되고 순서 이동 버튼·드래그가 사라진다.
   *
   * 호출부(FaqPage)가 한 번 읽은 값이 여기와 뮤테이션 거절에 **같이** 흘러간다.
   */
  readonly canUpdate: boolean;
  /** 삭제 권한 (EXC-03) — false 면 휴지통과 선택 체크박스를 그리지 않는다 */
  readonly canRemove: boolean;
}

export function FaqTable({
  faqs,
  loading,
  onDelete,
  deletingId,
  reorderable,
  onReorder,
  reordering,
  selectedIds,
  onToggleOne,
  onToggleAll,
  startIndex,
  onToggleVisible,
  togglingIds,
  canUpdate,
  canRemove,
}: FaqTableProps) {
  const { rowNavProps } = useRowNavigation();
  const ids = faqs.map((faq) => faq.id);
  /* 재정렬은 update 다 — 권한이 없으면 드래그도 이동 버튼도 걸지 않는다.
     핸들만 남기고 저장을 막으면 끌 수는 있는데 제자리로 튕기는 UI 가 된다. */
  const canReorder = reorderable && canUpdate;
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);
  const selection = tableSelectionState(faqs, selectedIds);

  /* 선택을 소비하는 것이 **둘**이다 — 일괄 노출/숨김(update)과 일괄 삭제(remove).
     그래서 체크박스는 canRemove 가 아니라 이 합집합을 탄다. remove 만 잃은 역할에게
     체크박스를 지우면 아직 할 수 있는 일괄 노출까지 사라진다(회원 목록과 같은 판정이다). */
  const canSelect = canUpdate || canRemove;
  /* 행 액션 열은 재정렬 버튼과 휴지통을 담는다 — 둘 다 없으면 열 자체가 사라진다 */
  const showActions = canReorder || canRemove;
  // 선행 열: (선택 가능 시 체크박스 1) + 순번(1) + (재정렬 가능 시 grip 1)
  const leadingCols = 1 + (canSelect ? 1 : 0) + (canReorder ? 1 : 0);
  const totalCols = COLUMNS.length + (showActions ? 1 : 0) + leadingCols;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {canRemove
          ? 'FAQ 목록 — 행을 누르면 상세로 이동해요. 체크박스·질문 링크·삭제 버튼은 각자 따로 동작해요.'
          : canSelect
            ? 'FAQ 목록 — 행을 누르면 상세로 이동해요. 체크박스·질문 링크는 각자 따로 동작해요.'
            : 'FAQ 목록 — 행을 누르면 상세로 이동해요. 질문 링크는 따로 동작해요.'}
        {canReorder && ' 각 행의 위/아래 버튼 또는 드래그로 정렬 순서를 바꿔요.'}
      </caption>

      <thead>
        <tr>
          {canSelect && (
            <SelectAllHeaderCell
              label="이 페이지의 FAQ 전체 선택"
              labelId={SELECT_ALL_LABEL_ID}
              selection={selection}
              onToggleAll={onToggleAll}
            />
          )}
          {canReorder && <ReorderGripHeaderCell />}
          <SeqHeaderCell />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
          {showActions && (
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={PAGE_SIZE} cols={totalCols} />
        ) : faqs.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              조회된 FAQ 가 없어요.
            </td>
          </tr>
        ) : (
          faqs.map((faq, index) => {
            const detailPath = `/content/faq/${faq.id}`;
            const nav = rowNavProps(detailPath);
            return (
              <tr
                key={faq.id}
                className="tds-ui-row"
                onClick={nav.onClick}
                style={canReorder ? rowStyle(faq.id, nav.style) : nav.style}
                {...(canReorder ? rowProps(faq.id) : {})}
              >
                {canSelect && (
                  <RowSelectCell
                    id={faq.id}
                    label={`${faq.question} 선택`}
                    checked={selectedIds.has(faq.id)}
                    onToggle={(checked) => onToggleOne(faq.id, checked)}
                  />
                )}
                {canReorder && <ReorderGripCell />}
                <SeqCell seq={startIndex + index + 1} />
                <td style={questionCellStyle}>
                  <Link to={detailPath} className="tds-ui-link tds-ui-focusable">
                    {faq.question}
                  </Link>
                </td>
                <td style={nowrapCellStyle}>{faq.categoryLabel}</td>
                <td style={nowrapCellStyle}>
                  {/* 권한이 없으면 스위치는 사라지고 '지금 노출인가' 라는 사실만 배지로 남는다 */}
                  <RowToggle
                    checked={faq.visible}
                    busy={togglingIds.has(faq.id)}
                    canUpdate={canUpdate}
                    label={`${faq.question} 노출 여부`}
                    onLabel="노출"
                    offLabel="숨김"
                    onChange={(next) => onToggleVisible(faq, next)}
                  />
                </td>
                <td style={numericCellStyle}>{formatNumber(faq.order)}</td>
                {showActions && (
                  <td style={actionCellStyle}>
                    <span style={rowActionsWrapStyle}>
                      {canReorder && (
                        <ReorderMoveButtons
                          label={faq.question}
                          index={index}
                          count={faqs.length}
                          locked={reordering}
                          onMove={moveBy}
                        />
                      )}
                      {canRemove && (
                        <RowActions
                          label={faq.question}
                          disabled={deletingId === faq.id}
                          onDelete={() => onDelete(faq)}
                        />
                      )}
                    </span>
                  </td>
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
