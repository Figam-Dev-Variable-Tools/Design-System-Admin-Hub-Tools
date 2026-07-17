// ApplicationListPage — 신청서 목록 (라우트: /reservations/applications)
//
// 신청은 고객 채널이 만든다 — 읽기 위주다(생성/삭제 없음). 상태 필터 + 검색 + 행 → 상세(처리).
// 데이터는 프레임워크 useCrudListQuery(읽기)로 배선한다. 목록엔 이미지 열이 없다.
//
// [조회 상태의 소유자] 상태 필터·검색어는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — 신청 처리는 '접수' 만 걸러 위에서부터 하나씩 열고 처리하고
// 돌아오는 반복 작업이다. 상태가 useState 에만 있으면 Back 할 때마다 전체 목록으로 튕겨 매번 필터를
// 다시 걸어야 했다. 검색은 IME 안전이다 (COMP-10).
import { useMemo } from 'react';
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
import { parseFilter, useCrudListQuery, useListState } from '../../../shared/crud';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import { applicationAdapter } from './data-source';
import {
  APPLICATION_FILTER_ALL,
  applicationStatusLabel,
  applicationStatusTone,
  applicationTypeLabel,
  filterApplications,
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
/** 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — select 가 그리는 옵션 전체가 허용 목록이다 */
const APPLICATION_STATUS_FILTER_VALUES: readonly ApplicationStatusFilter[] = [
  APPLICATION_FILTER_ALL,
  ...STATUS_FILTER_OPTIONS,
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13) */
const FILTER_DEFAULTS = { status: APPLICATION_FILTER_ALL } as const;

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

  // 상태·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const filter: ApplicationStatusFilter = parseFilter(
    list.filters['status'] ?? APPLICATION_FILTER_ALL,
    APPLICATION_STATUS_FILTER_VALUES,
    APPLICATION_FILTER_ALL,
  );
  const { keyword } = list;

  const { data, isFetching, error, refetch } = useCrudListQuery(RESOURCE, applicationAdapter);

  /**
   * [STATE-01] 스켈레톤은 **최초 로드에만** 뜬다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 그래서 invalidate 가 걸릴
   * 때마다 **이미 채워져 있던 행이 스켈레톤으로 지워졌다** — 표를 훑던 운영자 밑에서 데이터가
   * 사라진다. 'refetch 중에는 이전 행을 유지한다' 가 react-query 를 쓰는 이유 그 자체인데
   * (ADR-0008 §3.2) 화면이 그 이득을 스스로 버리고 있었다.
   * (정의는 공유 useCrudList 와 글자까지 같다 — 이 화면은 그 훅을 쓰지 않아 규칙만 같이 둔다.)
   */
  const firstLoading = isFetching && data === undefined;
  /** 데이터가 있는 채로 백그라운드 재조회 중 — 가벼운 인디케이터용, 표를 비우지 않는다 (STATE-03) */
  const refreshing = isFetching && data !== undefined;

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
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="신청번호·신청자·연락처 검색"
          placeholder="신청번호 · 신청자 · 연락처 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '김민준' 을 치는 도중 '김민ㅈ' 로 검색되지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('status', event.target.value)}
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

      <p style={hintStyle} aria-busy={refreshing}>
        {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}
        {refreshing && ' · 새로고침 중…'}
      </p>

      <table style={tableStyle} aria-busy={firstLoading}>
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
          {firstLoading ? (
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
