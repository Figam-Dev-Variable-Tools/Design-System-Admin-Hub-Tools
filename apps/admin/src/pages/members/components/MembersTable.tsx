// 회원 목록 표
//
// [a11y] 시각적으로 숨긴 <caption> · 모든 th 에 scope · 체크박스마다 보이지 않는 라벨.
// [행 액션] ⋯ 메뉴는 **회원 삭제 / 알림 발송 두 개뿐**이다 (요구사항).
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { cssVar, Menu } from '@tds/ui';

import {
  buttonStyle,
  checkboxStyle,
  Icon,
  numericCellStyle,
  SelectAllHeaderCell,
  SkeletonRows,
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
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  whiteSpace: 'nowrap',
};

const nowrapCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const checkboxCellStyle: CSSProperties = {
  ...tdStyle,
  width: cssVar('space.6'),
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: cssVar('space.6'),
  textAlign: 'right',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

/** 헤더 전체선택의 보이지 않는 라벨 — TriStateCheckbox 가 aria-labelledby 로 가리킨다 */
const SELECT_ALL_LABEL_ID = 'members-select-all-label';

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
  /** 알림 발송 권한 (EXC-03) — 없으면 ⋯ 메뉴에서 그 항목이 사라진다 */
  readonly canUpdate: boolean;
  /** 회원 삭제 권한 (EXC-03) — 단건 삭제와 일괄 삭제(체크박스)가 함께 사라진다 */
  readonly canRemove: boolean;
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
  canUpdate,
  canRemove,
}: MembersTableProps) {
  // 행 어디를 눌러도 상세로 간다 — 체크박스/메모/⋯ 버튼은 훅이 알아서 제외한다
  const { rowNavProps } = useRowNavigation();

  const selection = tableSelectionState(members, selectedIds);

  /**
   * 행 액션이 하나라도 있는가 (EXC-03).
   *
   * 체크박스와 ⋯ 열은 **액션이 있을 때만** 의미가 있다. 삭제도 발송도 못 하는 역할에게 선택
   * 체크박스를 남기면 '고르고 나서 할 일이 없는' 상태가 된다 — 회원 관리에서 이미 결함으로
   * 지적된 형태다. CrudListShell 이 canRemove 없이 SelectionBar 를 그리지 않는 것과 같은 판단.
   */
  const hasRowActions = canUpdate || canRemove;
  /** 표의 총 칸 수 — 체크박스·⋯ 두 열은 액션이 있을 때만 존재한다 (빈 상태의 colSpan 이 이걸 쓴다) */
  const totalColumns = COLUMNS.length + (hasRowActions ? 2 : 0);

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        회원 목록 — 행을 누르면 회원 상세로 이동해요. 체크박스·메모·액션 버튼은 각자 따로 동작해요.
      </caption>

      <thead>
        <tr>
          {hasRowActions && (
            <SelectAllHeaderCell
              label="이 페이지의 회원 전체 선택"
              labelId={SELECT_ALL_LABEL_ID}
              selection={selection}
              onToggleAll={onToggleAll}
            />
          )}
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
          {hasRowActions && (
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={PAGE_SIZE} cols={totalColumns} />
        ) : members.length === 0 ? (
          <tr>
            <td colSpan={totalColumns} style={emptyCellStyle}>
              검색 결과가 없어요.
            </td>
          </tr>
        ) : (
          members.map((member) => {
            const checked = selectedIds.has(member.id);
            const notifying = notifyingIds.has(member.id);
            const detailPath = `/users/members/${member.id}`;

            return (
              <tr key={member.id} className="tds-ui-row" {...rowNavProps(detailPath)}>
                {hasRowActions && (
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
                )}

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
                    <Icon name="pencil" />
                  </Link>
                </td>

                {/* ⋯ 메뉴는 권한이 있는 항목만 담는다 — 둘 다 없으면 열 자체가 없다 */}
                {hasRowActions && (
                  <td style={actionCellStyle}>
                    <Menu
                      label={`${member.nickname} 회원 액션`}
                      items={[
                        ...(canRemove ? [{ id: 'delete', label: '회원 삭제', danger: true }] : []),
                        ...(canUpdate
                          ? [
                              {
                                id: 'notify',
                                // 발송 중에는 라벨로 진행을 알리고 재클릭을 막는다
                                label: notifying ? '발송 중…' : '알림 발송',
                                disabled: notifying,
                              },
                            ]
                          : []),
                      ]}
                      onSelect={(id) => {
                        if (id === 'delete') onDelete(member);
                        else onNotify(member);
                      }}
                    />
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
