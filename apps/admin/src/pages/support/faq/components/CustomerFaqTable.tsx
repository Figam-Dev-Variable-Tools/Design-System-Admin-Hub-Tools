// 고객노출 FAQ 큐레이션 표
//
// 큐레이션 전용: 선택/삭제 열이 없다(작성은 콘텐츠 관리 소관). 대신 노출·BEST(고정) 토글과 표시 순서
// 재정렬(드래그/화살표)만 있다. 드래그 재정렬은 공통 모듈(shared/ui tableReorder)을 그대로 쓴다.
import type { CSSProperties } from 'react';

import {
  numericCellStyle,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  SeqCell,
  SeqHeaderCell,
  tableStyle,
  tdStyle,
  thStyle,
  ToggleSwitch,
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import { formatNumber } from '../../../../shared/format';
import type { CustomerFaq } from '../types';

const COLUMNS = ['질문', '카테고리', '노출', 'BEST', '순서'] as const;

const questionCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
};

const nowrapCellStyle: CSSProperties = { ...tdStyle, whiteSpace: 'nowrap' };

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

interface CustomerFaqTableProps {
  readonly faqs: readonly CustomerFaq[];
  readonly loading: boolean;
  readonly onReorder: (orderedIds: readonly string[]) => void;
  readonly reordering: boolean;
  readonly onToggleVisible: (faq: CustomerFaq, next: boolean) => void;
  readonly onTogglePinned: (faq: CustomerFaq, next: boolean) => void;
  /** 토글 요청 중인 FAQ — 스위치를 잠근다 */
  readonly togglingIds: ReadonlySet<string>;
}

export function CustomerFaqTable({
  faqs,
  loading,
  onReorder,
  reordering,
  onToggleVisible,
  onTogglePinned,
  togglingIds,
}: CustomerFaqTableProps) {
  const ids = faqs.map((faq) => faq.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);
  const totalCols = COLUMNS.length + 3; // grip + 순번 + 액션(이동 버튼)

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        고객노출 FAQ 큐레이션 — 각 행의 위/아래 버튼 또는 드래그로 고객센터 표시 순서를 바꾸고,
        노출·BEST 를 토글합니다.
      </caption>
      <thead>
        <tr>
          <ReorderGripHeaderCell />
          <SeqHeaderCell />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
          <th scope="col" style={thStyle}>
            <span style={visuallyHiddenStyle}>순서 이동</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 5 }, (_, index) => (
            <tr key={`skeleton-${String(index)}`}>
              {Array.from({ length: totalCols }, (_, cell) => (
                <td key={`cell-${String(cell)}`} style={tdStyle}>
                  <span className="tds-ui-skeleton" aria-hidden="true" />
                </td>
              ))}
            </tr>
          ))
        ) : faqs.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              고객센터에 노출할 FAQ 가 없습니다.
            </td>
          </tr>
        ) : (
          faqs.map((faq, index) => (
            <tr key={faq.id} style={rowStyle(faq.id, {})} {...rowProps(faq.id)}>
              <ReorderGripCell />
              <SeqCell seq={index + 1} />
              <td style={questionCellStyle}>{faq.question}</td>
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
              <td style={nowrapCellStyle}>
                <ToggleSwitch
                  checked={faq.pinned}
                  label={`${faq.question} BEST 고정`}
                  busy={togglingIds.has(faq.id)}
                  onLabel="고정"
                  offLabel="일반"
                  onChange={(next) => onTogglePinned(faq, next)}
                />
              </td>
              <td style={numericCellStyle}>{formatNumber(faq.order)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                <ReorderMoveButtons
                  label={faq.question}
                  index={index}
                  count={faqs.length}
                  locked={reordering}
                  onMove={moveBy}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
