// 회원 목록 표
//
// [a11y] 시각적으로 숨긴 <caption> · 모든 th 에 scope · 체크박스마다 보이지 않는 라벨.
// [행 액션] ⋯ 메뉴는 **회원 삭제 / 알림 발송 두 개뿐**이다 (요구사항).
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  buttonStyle,
  checkboxStyle,
  numericCellStyle,
  PencilIcon,
  SelectAllHeaderCell,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { formatActivity, formatNumber, formatRelativeOrDate } from '../../../shared/format';
import { PAGE_SIZE, TIER_LABEL } from '../types';
import type { Member } from '../types';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import { ActionMenu } from './ActionMenu';

const COLUMNS = [
  '닉네임',
  '계정',
  '회원 유형',
  '그룹',
  '가입일',
  '적립금',
  '글·댓글·구매평·문의',
  '누적 구매금액',
  '메모',
] as const;

const nicknameCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
  whiteSpace: 'nowrap',
};

const nowrapCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const checkboxCellStyle: CSSProperties = {
  ...tdStyle,
  width: 'var(--tds-space-6)',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: 'var(--tds-space-6)',
  textAlign: 'right',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

/** 헤더 전체선택의 보이지 않는 라벨 — TriStateCheckbox 가 aria-labelledby 로 가리킨다 */
const SELECT_ALL_LABEL_ID = 'members-select-all-label';

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <tr key={`skeleton-${String(index)}`}>
          {/* 체크박스 + 본문 컬럼 + 액션 = COLUMNS.length + 2 */}
          {Array.from({ length: COLUMNS.length + 2 }, (_, cell) => (
            <td key={`cell-${String(cell)}`} style={tdStyle}>
              <span className="tds-ui-skeleton" aria-hidden="true" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface MembersTableProps {
  readonly members: readonly Member[];
  readonly loading: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  readonly onDelete: (member: Member) => void;
  readonly onNotify: (member: Member) => void;
  /** 알림 발송이 진행 중인 회원 — 해당 행의 메뉴 항목이 '발송 중…' 으로 잠긴다 */
  readonly notifyingIds: ReadonlySet<string>;
}

export function MembersTable({
  members,
  loading,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onDelete,
  onNotify,
  notifyingIds,
}: MembersTableProps) {
  // 행 어디를 눌러도 상세로 간다 — 체크박스/메모/⋯ 버튼은 훅이 알아서 제외한다
  const { rowNavProps } = useRowNavigation();

  const selection = tableSelectionState(members, selectedIds);

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        회원 목록 — 행을 누르면 회원 상세로 이동합니다. 체크박스·메모·액션 버튼은 각자의 동작을
        수행합니다.
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label="이 페이지의 회원 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={onToggleAll}
          />
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
          <SkeletonRows />
        ) : members.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length + 2} style={emptyCellStyle}>
              검색 결과가 없습니다.
            </td>
          </tr>
        ) : (
          members.map((member) => {
            const checked = selectedIds.has(member.id);
            const notifying = notifyingIds.has(member.id);
            const detailPath = `/users/members/${member.id}`;

            return (
              <tr key={member.id} className="tds-ui-row" {...rowNavProps(detailPath)}>
                <td style={checkboxCellStyle}>
                  <span style={visuallyHiddenStyle} id={`select-${member.id}`}>
                    {member.nickname} 선택
                  </span>
                  <input
                    type="checkbox"
                    className="tds-ui-focusable"
                    style={checkboxStyle}
                    checked={checked}
                    aria-labelledby={`select-${member.id}`}
                    onChange={(event) => onToggleOne(member.id, event.target.checked)}
                  />
                </td>

                <td style={nicknameCellStyle}>
                  <Link to={detailPath} className="tds-ui-link tds-ui-focusable">
                    {member.nickname}
                  </Link>
                </td>

                <td style={nowrapCellStyle}>{member.account}</td>
                <td style={nowrapCellStyle}>{TIER_LABEL[member.tier]}</td>
                <td style={nowrapCellStyle}>{member.group}</td>
                <td style={nowrapCellStyle}>{formatRelativeOrDate(member.joinedAtIso)}</td>
                <td style={numericCellStyle}>{formatNumber(member.points)}</td>
                <td style={nowrapCellStyle}>{formatActivity(member.activity)}</td>
                <td style={numericCellStyle}>{formatNumber(member.totalPurchase)}</td>

                <td style={tdStyle}>
                  {/* 메모 편집은 상세 화면의 '관리자 메모' 카드가 담당한다 — 여기서는 그리로 보낸다 */}
                  <Link
                    to={detailPath}
                    className="tds-ui-btn-ghost tds-ui-focusable"
                    style={buttonStyle('ghost')}
                    aria-label={`${member.nickname} 관리자 메모`}
                    title={member.memo === '' ? '메모 없음' : member.memo}
                  >
                    <PencilIcon />
                  </Link>
                </td>

                <td style={actionCellStyle}>
                  <ActionMenu
                    label={`${member.nickname} 회원 액션`}
                    actions={[
                      {
                        id: 'delete',
                        label: '회원 삭제',
                        danger: true,
                        onSelect: () => onDelete(member),
                      },
                      {
                        id: 'notify',
                        // 발송 중에는 라벨로 진행을 알리고 재클릭을 막는다
                        label: notifying ? '발송 중…' : '알림 발송',
                        disabled: notifying,
                        onSelect: () => onNotify(member),
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
