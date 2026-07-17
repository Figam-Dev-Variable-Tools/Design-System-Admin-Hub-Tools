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
  PencilIcon,
  SelectAllHeaderCell,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import { PAGE_SIZE } from '../types';
import type { AdminUser } from '../types';

const COLUMNS = ['닉네임', '계정', '그룹', '가입일', '부서', '직급', '연락처', '메모'] as const;

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

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

/** 헤더 전체선택의 보이지 않는 라벨 — TriStateCheckbox 가 aria-labelledby 로 가리킨다 */
const SELECT_ALL_LABEL_ID = 'admins-select-all-label';

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <tr key={`skeleton-${String(index)}`}>
          {/* 체크박스 + 본문 컬럼 */}
          {Array.from({ length: COLUMNS.length + 1 }, (_, cell) => (
            <td key={`cell-${String(cell)}`} style={tdStyle}>
              <span className="tds-ui-skeleton" aria-hidden="true" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface AdminsTableProps {
  readonly admins: readonly AdminUser[];
  readonly loading: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
}

export function AdminsTable({
  admins,
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
        운영자 목록 — 행을 누르면 운영자 상세로 이동합니다. 체크박스·메모 버튼은 각자의 동작을
        수행합니다.
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
          <SkeletonRows />
        ) : admins.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length + 1} style={emptyCellStyle}>
              검색 결과가 없습니다.
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
                    <PencilIcon />
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
