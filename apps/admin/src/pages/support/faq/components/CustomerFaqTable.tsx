// 고객노출 FAQ 큐레이션 표
//
// 큐레이션 전용: 선택/삭제 열이 없다(작성은 콘텐츠 관리 소관). 대신 노출·BEST(고정) 토글과 표시 순서
// 재정렬(드래그/화살표)만 있다. 드래그 재정렬은 DS(@tds/ui TableReorder)를 그대로 쓴다.
//
// [EXC-03] 이 화면의 액션은 **전부 update 다** — 노출·BEST 고정·표시 순서. 손으로 만든 표라
// 껍데기의 게이팅을 하나도 받지 못했고, 조회 권한만 가진 역할이 고객센터 노출을 실제로 켜고 껐다.
// 노출·BEST 열은 데이터 열이기도 하므로 컨트롤만 사라지고 값은 배지로 남는다 (shared/crud/RowToggle).
import type { CSSProperties } from 'react';

import { RowToggle } from '../../../../shared/crud';
import {
  numericCellStyle,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  SeqCell,
  SeqHeaderCell,
  SkeletonRows,
  tableStyle,
  tdStyle,
  thStyle,
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import { formatNumber } from '../../../../shared/format';
import type { CustomerFaq } from '../types';
import { cssVar } from '@tds/ui';

const COLUMNS = ['질문', '카테고리', '노출', 'BEST', '순서'] as const;

const questionCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const nowrapCellStyle: CSSProperties = { ...tdStyle, whiteSpace: 'nowrap' };

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
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
  /**
   * 수정 권한 (EXC-03) — 이 표의 세 컨트롤이 모두 update 를 탄다.
   * false 면 순서 이동(드래그·버튼)과 두 스위치가 사라지고 값만 배지로 남는다.
   */
  readonly canUpdate: boolean;
}

export function CustomerFaqTable({
  faqs,
  loading,
  onReorder,
  reordering,
  onToggleVisible,
  onTogglePinned,
  togglingIds,
  canUpdate,
}: CustomerFaqTableProps) {
  const ids = faqs.map((faq) => faq.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);
  /* grip 열과 이동 버튼 열은 재정렬(=수정)의 것이다 — 권한이 없으면 둘 다 사라진다 */
  const totalCols = COLUMNS.length + 1 + (canUpdate ? 2 : 0);

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {canUpdate
          ? '고객노출 FAQ 큐레이션 — 각 행의 위/아래 버튼 또는 드래그로 고객센터 표시 순서를 바꾸고, 노출·BEST 를 토글해요.'
          : '고객노출 FAQ 큐레이션 — 조회 전용이에요.'}
      </caption>
      <thead>
        <tr>
          {canUpdate && <ReorderGripHeaderCell />}
          <SeqHeaderCell />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
          {canUpdate && (
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>순서 이동</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <SkeletonRows rows={5} cols={totalCols} />
        ) : faqs.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              큐레이션할 FAQ 가 없어요. 콘텐츠 관리에서 FAQ 를 등록·노출하면 이 목록에 올라와요.
            </td>
          </tr>
        ) : (
          faqs.map((faq, index) => (
            <tr
              key={faq.id}
              style={canUpdate ? rowStyle(faq.id, {}) : undefined}
              {...(canUpdate ? rowProps(faq.id) : {})}
            >
              {canUpdate && <ReorderGripCell />}
              <SeqCell seq={index + 1} />
              <td style={questionCellStyle}>{faq.question}</td>
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
              <td style={nowrapCellStyle}>
                <RowToggle
                  checked={faq.pinned}
                  busy={togglingIds.has(faq.id)}
                  canUpdate={canUpdate}
                  label={`${faq.question} BEST 고정`}
                  onLabel="고정"
                  offLabel="일반"
                  onChange={(next) => onTogglePinned(faq, next)}
                />
              </td>
              <td style={numericCellStyle}>{formatNumber(faq.order)}</td>
              {canUpdate && (
                <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <ReorderMoveButtons
                    label={faq.question}
                    index={index}
                    count={faqs.length}
                    locked={reordering}
                    onMove={moveBy}
                  />
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
