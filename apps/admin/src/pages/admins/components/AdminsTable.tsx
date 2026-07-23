// 운영자 목록 표
//
// 회원 목록 표(MembersTable)와 같은 규칙을 따른다.
// [a11y] 시각적으로 숨긴 <caption> · 모든 th 에 scope · 체크박스마다 보이지 않는 라벨.
// [행 이동] 행 어디를 눌러도 상세로 간다 — 체크박스·메모 버튼은 useRowNavigation 이 알아서 제외한다.
// [부서·직급] 비어 있을 수 있다 — 빈 문자열이면 빈 셀로 둔다(값을 지어내지 않는다).
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  buttonStyle,
  checkboxStyle,
  Icon,
  SelectAllHeaderCell,
  SkeletonRows,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import { PAGE_SIZE } from '../types';
import type { AdminUser } from '../types';
import { cssVar } from '@tds/ui';

/**
 * '역할' 은 그룹 바로 뒤다 — 이 화면이 답해야 하는 핵심 질문이 '누가 무슨 권한인가' 인데,
 * 예전에는 그 답이 등록 폼과 상세에만 있었다(목록 어디에도 없었다).
 */
const COLUMNS = [
  '닉네임',
  '계정',
  '그룹',
  '역할',
  '가입일',
  '부서',
  '직급',
  '연락처',
  '메모',
] as const;

/** 배정된 역할이 사라졌을 때의 표시 — 이름을 지어내지 않는다 (AdminDetailPage 와 같은 태도) */
const UNKNOWN_ROLE_LABEL = '—';

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

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

/** 헤더 전체선택의 보이지 않는 라벨 — TriStateCheckbox 가 aria-labelledby 로 가리킨다 */
const SELECT_ALL_LABEL_ID = 'admins-select-all-label';

interface AdminsTableProps {
  readonly admins: readonly AdminUser[];
  /**
   * 역할 id → 역할명. 정본은 권한 스토어이고 이 표는 받아서 그리기만 한다
   * (운영자 레코드는 id 만 들고 있다 — types.ts 의 roleId 주석).
   *
   * 키 있는 Record 인 이유: 배열을 받아 find 하면 못 찾았을 때 **다른 역할 이름**으로 폴백하기
   * 쉽고, 그 화면은 '권한이 잘못 표시된 목록' 이 된다.
   */
  readonly roleNames: Readonly<Record<string, string>>;
  readonly loading: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
}

export function AdminsTable({
  admins,
  roleNames,
  loading,
  selectedIds,
  onToggleOne,
  onToggleAll,
}: AdminsTableProps) {
  const { rowNavProps } = useRowNavigation();

  const selection = tableSelectionState(admins, selectedIds);

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        운영자 목록 — 행을 누르면 운영자 상세로 이동해요. 체크박스·메모 버튼은 각자 따로 동작해요.
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label="이 페이지의 운영자 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={onToggleAll}
          />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={PAGE_SIZE} cols={COLUMNS.length + 1} />
        ) : admins.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length + 1} style={emptyCellStyle}>
              검색 결과가 없어요.
            </td>
          </tr>
        ) : (
          admins.map((admin) => {
            const checked = selectedIds.has(admin.id);
            const detailPath = `/users/admins/${admin.id}`;

            return (
              <tr key={admin.id} className="tds-ui-row" {...rowNavProps(detailPath)}>
                <td style={checkboxCellStyle}>
                  <span style={visuallyHiddenStyle} id={`select-${admin.id}`}>
                    {admin.nickname} 선택
                  </span>
                  <input
                    type="checkbox"
                    className="tds-ui-focusable"
                    style={checkboxStyle}
                    checked={checked}
                    aria-labelledby={`select-${admin.id}`}
                    onChange={(event) => onToggleOne(admin.id, event.target.checked)}
                  />
                </td>

                <td style={nicknameCellStyle}>
                  <Link to={detailPath} className="tds-ui-link tds-ui-focusable">
                    {admin.nickname}
                  </Link>
                </td>

                <td style={nowrapCellStyle}>{admin.account}</td>
                <td style={nowrapCellStyle}>{admin.group}</td>
                {/* 역할명은 권한 스토어에서 온다 — 없는 역할을 가리키면 빈칸이 아니라 '—' 로 둔다 */}
                <td style={nowrapCellStyle}>{roleNames[admin.roleId] ?? UNKNOWN_ROLE_LABEL}</td>
                <td style={nowrapCellStyle}>{admin.joinedAt}</td>
                {/* 부서·직급은 비어 있을 수 있다 — 빈 셀 */}
                <td style={nowrapCellStyle}>{admin.department}</td>
                <td style={nowrapCellStyle}>{admin.position}</td>
                <td style={nowrapCellStyle}>{admin.phone}</td>

                <td style={tdStyle}>
                  {/* 메모 편집은 상세 화면의 '관리자 메모' 카드가 담당한다 — 여기서는 그리로 보낸다 */}
                  <Link
                    to={detailPath}
                    className="tds-ui-btn-ghost tds-ui-focusable"
                    style={buttonStyle('ghost')}
                    aria-label={`${admin.nickname} 관리자 메모`}
                    title={admin.memo === '' ? '메모 없음' : admin.memo}
                  >
                    <Icon name="pencil" />
                  </Link>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
