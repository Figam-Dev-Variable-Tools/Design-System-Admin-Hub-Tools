// ApplicationListPage — 신청서 목록 (라우트: /reservations/applications) · A41 소유
//
// 신청은 고객 채널이 만든다 — 읽기 위주다(생성/삭제 없음). 상태 필터 + 검색 + 행 → 상세(처리).
// 데이터는 프레임워크 useCrudListQuery(읽기)로 배선한다. 목록엔 이미지 열이 없다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  buttonStyle,
  hintStyle,
  SearchField,
  SelectField,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { useCrudListQuery } from '../../../shared/crud';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import { applicationAdapter } from './data-source';
import {
  APPLICATION_FILTER_ALL,
  applicationStatusLabel,
  applicationStatusTone,
  applicationTypeLabel,
  filterApplications,
  isApplicationStatus,
  searchApplications,
} from './types';
import type { ApplicationStatus, ApplicationStatusFilter } from './types';

const RESOURCE = 'reservation-applications';
const LIST_PATH = '/reservations/applications';
const COLUMN_COUNT = 6;

const STATUS_FILTER_OPTIONS: readonly ApplicationStatus[] = [
  'received',
  'reviewing',
  'approved',
  'rejected',
  'completed',
];

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 5)' };

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const dateCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const actionCellStyle: CSSProperties = { ...tdStyle, textAlign: 'right' };

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

export default function ApplicationListPage() {
  const navigate = useNavigate();
  const { rowNavProps } = useRowNavigation();
  const [filter, setFilter] = useState<ApplicationStatusFilter>(APPLICATION_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const {
    data,
    isFetching: loading,
    error,
    refetch,
  } = useCrudListQuery(RESOURCE, applicationAdapter);

  const visible = useMemo(
    () => searchApplications(filterApplications(data ?? [], filter), keyword),
    [data, filter, keyword],
  );

  if (error !== null) {
    return (
      <div style={columnStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>신청서를 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={columnStyle}>
      <div style={toolbarStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="신청번호·신청자·연락처 검색"
          placeholder="신청번호 · 신청자 · 연락처 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => {
              const next = event.target.value;
              setFilter(
                next === APPLICATION_FILTER_ALL || isApplicationStatus(next)
                  ? next
                  : APPLICATION_FILTER_ALL,
              );
            }}
            aria-label="상태로 거르기"
          >
            <option value={APPLICATION_FILTER_ALL}>전체 상태</option>
            {STATUS_FILTER_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {applicationStatusLabel(status)}
              </option>
            ))}
          </SelectField>
        </span>
      </div>

      <p style={hintStyle}>{loading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}</p>

      <table style={tableStyle} aria-busy={loading}>
        <caption style={visuallyHiddenStyle}>
          신청서 목록 — 각 행에서 상세로 이동해 신청 내용을 확인하고 상태를 처리할 수 있습니다.
        </caption>
        <thead>
          <tr>
            <SeqHeaderCell />
            <th scope="col" style={thStyle}>
              접수일시
            </th>
            <th scope="col" style={thStyle}>
              신청번호
            </th>
            <th scope="col" style={thStyle}>
              신청유형
            </th>
            <th scope="col" style={thStyle}>
              신청자
            </th>
            <th scope="col" style={thStyle}>
              상태
            </th>
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }, (_, index) => (
              <tr key={`skeleton-${String(index)}`}>
                {Array.from({ length: COLUMN_COUNT + 1 }, (_, cell) => (
                  <td key={`cell-${String(cell)}`} style={tdStyle}>
                    <span className="tds-ui-skeleton" aria-hidden="true" />
                  </td>
                ))}
              </tr>
            ))
          ) : visible.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT + 1} style={emptyCellStyle}>
                신청서가 없습니다.
              </td>
            </tr>
          ) : (
            visible.map((item, index) => (
              <tr key={item.id} className="tds-ui-row" {...rowNavProps(`${LIST_PATH}/${item.id}`)}>
                <SeqCell seq={index + 1} />
                <td style={dateCellStyle}>{formatDateTime(item.submittedAt)}</td>
                <td style={tdStyle}>{item.code}</td>
                <td style={tdStyle}>{applicationTypeLabel(item.type)}</td>
                <td style={tdStyle}>{item.applicantName}</td>
                <td style={tdStyle}>
                  <StatusBadge
                    tone={applicationStatusTone(item.status)}
                    label={applicationStatusLabel(item.status)}
                  />
                </td>
                <td style={actionCellStyle}>
                  <button
                    type="button"
                    className="tds-ui-btn-secondary tds-ui-focusable"
                    style={buttonStyle('secondary')}
                    aria-label={`${item.code} 상세`}
                    onClick={() => navigate(`${LIST_PATH}/${item.id}`)}
                  >
                    상세
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
