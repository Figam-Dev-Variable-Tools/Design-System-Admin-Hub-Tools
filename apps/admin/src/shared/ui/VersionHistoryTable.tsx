// 버전 이력 표 (A41 소유 — apps/admin/src/shared/ui/**)
//
// [왜 공통인가] 약관 관리와 개인정보 처리방침이 똑같이 '버전 이력 + 현재 시행본'을 보여준다.
// 두 화면이 각자 버전 표(버전·시행일·상태·현재 표식·액션)를 복사하면 배치가 어긋난다.
//
// [도메인을 모른다] 무슨 문서의 버전인지 알지 못한다 — 이미 만들어진 행(version/effectiveDate/
// 상태 tone·label/current)과 콜백만 받는다. '시행중'이 초록이어야 한다는 규칙은 호출부의 것이다.
//
// [행 클릭 → 상세] detailPathOf 를 주면 행을 눌러 상세(전문 조회)로 간다 — 경로 문자열만 받으므로
// 도메인을 모른다(약관/개인정보 어느 쪽인지 알지 못한다). 수정/삭제 버튼 클릭은 이동을 가로채지 않는다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { RowActions } from './RowActions';
import { StatusBadge } from './StatusBadge';
import type { StatusTone } from './StatusBadge';
import { numericCellStyle, tableStyle, tdStyle, thStyle, visuallyHiddenStyle } from './styles';
import { useRowNavigation } from '../useRowNavigation';

export interface VersionRow {
  readonly id: string;
  /** 버전 표기 ('v1.2' 등) */
  readonly version: string;
  /** 시행일 — 이미 사람이 읽는 문자열 */
  readonly effectiveDate: string;
  readonly statusTone: StatusTone;
  readonly statusLabel: string;
  /** 현재 시행본인가 — '현재' 표식을 단다 */
  readonly current: boolean;
}

const COLUMNS = ['버전', '시행일', '상태'] as const;

const versionCellStyle: CSSProperties = {
  ...numericCellStyle,
  textAlign: 'left',
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
};

const nowrapCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const badgeGroupStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: 'calc(var(--tds-space-6) * 2)',
  textAlign: 'right',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

interface VersionHistoryTableProps {
  readonly versions: readonly VersionRow[];
  readonly caption: string;
  readonly onEdit: (id: string) => void;
  readonly onDelete: (id: string) => void;
  /** 삭제 요청 중인 버전 — 해당 행 액션이 잠긴다 */
  readonly deletingId?: string | null;
  readonly emptyMessage?: string;
  /** 있으면 행을 눌러 상세(전문 조회)로 간다 — 버전 id → 경로 문자열 */
  readonly detailPathOf?: (id: string) => string;
}

export function VersionHistoryTable({
  versions,
  caption,
  onEdit,
  onDelete,
  deletingId = null,
  emptyMessage = '등록된 버전이 없습니다.',
  detailPathOf,
}: VersionHistoryTableProps) {
  const { rowNavProps } = useRowNavigation();
  const linkable = detailPathOf !== undefined;

  return (
    <table style={tableStyle}>
      <caption style={visuallyHiddenStyle}>{caption}</caption>
      <thead>
        <tr>
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
        {versions.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length + 1} style={emptyCellStyle}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          versions.map((row) => {
            const path = detailPathOf?.(row.id);
            const nav = path !== undefined ? rowNavProps(path) : null;
            return (
              <tr
                key={row.id}
                className={linkable ? 'tds-ui-row' : undefined}
                onClick={nav?.onClick}
                style={nav?.style}
              >
                <td style={versionCellStyle}>
                  <span style={badgeGroupStyle}>
                    {path !== undefined ? (
                      <Link to={path} className="tds-ui-link tds-ui-focusable">
                        {row.version}
                      </Link>
                    ) : (
                      row.version
                    )}
                    {row.current && <StatusBadge tone="info" label="현재" />}
                  </span>
                </td>
                <td style={nowrapCellStyle}>{row.effectiveDate}</td>
                <td style={nowrapCellStyle}>
                  <StatusBadge tone={row.statusTone} label={row.statusLabel} />
                </td>
                <td style={actionCellStyle}>
                  <RowActions
                    label={`버전 ${row.version}`}
                    disabled={deletingId === row.id}
                    onEdit={() => onEdit(row.id)}
                    onDelete={() => onDelete(row.id)}
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
