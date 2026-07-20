// FAQ 목록 표
//
// 행을 누르면 상세로 간다. 행 액션은 삭제(수정은 상세에서) — RowActions 공통 모듈.
//
// [정렬 순서 재정렬 — 오너 피드백 ③] 필터/검색이 없는 자연 순서 화면(reorderable)에서만 켠다.
//   드래그 핸들러·grip/화살표 아이콘·이동 버튼·moveArrayItem 은 배너 목록과 공유하는 공통 모듈이다
//   (shared/ui/tableReorder — useReorderableRows·ReorderGripCell·ReorderMoveButtons).
//   순서 변경은 새 id 순서로 onReorder 를 부른다 — 저장/낙관적 업데이트·롤백은 호출부(FaqPage)가 한다.
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
  ToggleSwitch,
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
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
  width: 'calc(var(--tds-space-6) * 3)',
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
}: FaqTableProps) {
  const { rowNavProps } = useRowNavigation();
  const ids = faqs.map((faq) => faq.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);
  const selection = tableSelectionState(faqs, selectedIds);

  // 선행 열: 체크박스(1) + 순번(1) + (재정렬 가능 시 grip 1)
  const leadingCols = 2 + (reorderable ? 1 : 0);
  const totalCols = COLUMNS.length + 1 + leadingCols;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        FAQ 목록 — 행을 누르면 상세로 이동합니다. 체크박스·질문 링크·삭제 버튼은 각자의 동작을
        수행합니다.
        {reorderable && ' 각 행의 위/아래 버튼 또는 드래그로 정렬 순서를 바꿉니다.'}
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label="이 페이지의 FAQ 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={onToggleAll}
          />
          {reorderable && <ReorderGripHeaderCell />}
          <SeqHeaderCell />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
          <th scope="col" style={thStyle}>
            <span style={visuallyHiddenStyle}>행 액션</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={PAGE_SIZE} cols={totalCols} />
        ) : faqs.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              조회된 FAQ 가 없습니다.
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
                style={reorderable ? rowStyle(faq.id, nav.style) : nav.style}
                {...(reorderable ? rowProps(faq.id) : {})}
              >
                <RowSelectCell
                  id={faq.id}
                  label={`${faq.question} 선택`}
                  checked={selectedIds.has(faq.id)}
                  onToggle={(checked) => onToggleOne(faq.id, checked)}
                />
                {reorderable && <ReorderGripCell />}
                <SeqCell seq={startIndex + index + 1} />
                <td style={questionCellStyle}>
                  <Link to={detailPath} className="tds-ui-link tds-ui-focusable">
                    {faq.question}
                  </Link>
                </td>
                <td style={nowrapCellStyle}>{faq.categoryLabel}</td>
                <td style={nowrapCellStyle}>
                  <ToggleSwitch
                    checked={faq.visible}
                    label={`${faq.question} 노출 여부`}
                    busy={togglingIds.has(faq.id)}
                    onLabel="노출"
                    offLabel="숨김"
                    onChange={(next) => onToggleVisible(faq, next)}
                  />
                </td>
                <td style={numericCellStyle}>{formatNumber(faq.order)}</td>
                <td style={actionCellStyle}>
                  <span style={rowActionsWrapStyle}>
                    {reorderable && (
                      <ReorderMoveButtons
                        label={faq.question}
                        index={index}
                        count={faqs.length}
                        locked={reordering}
                        onMove={moveBy}
                      />
                    )}
                    <RowActions
                      label={faq.question}
                      disabled={deletingId === faq.id}
                      onDelete={() => onDelete(faq)}
                    />
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
