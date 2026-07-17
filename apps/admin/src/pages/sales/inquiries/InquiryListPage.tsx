// InquiryListPage — 문의 목록 (라우트: /sales/inquiries)
//
// 문의는 고객 채널이 만들고 관리자는 처리·답변만 한다. 그래서 CrudListShell(삭제·일괄) 대신 읽기 전용
// 표를 쓴다: 유형·채널·상태 필터 + 검색 + 행 → 상세(타임라인·답변). 데이터는 useCrudListQuery(읽기).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../shared/format';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Empty,
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
import { inquiryAdapter } from './data-source';
import {
  filterInquiries,
  hasIssuedQuote,
  INQUIRY_CHANNEL_OPTIONS,
  INQUIRY_FILTER_ALL,
  INQUIRY_STATUS_OPTIONS,
  INQUIRY_TYPE_OPTIONS,
  inquiryChannelLabel,
  inquiryPriorityTone,
  inquiryStatusLabel,
  inquiryStatusTone,
  inquiryTypeLabel,
  searchInquiries,
} from './types';
import type { InquiryChannelFilter, InquiryStatusFilter, InquiryTypeFilter } from './types';

const RESOURCE = 'sales-inquiries';
const LIST_PATH = '/sales/inquiries';
const QUOTE_PATH = '/sales/quotes';
const ENTITY_LABEL = '문의';

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(IA-13) */
const FILTER_DEFAULTS = {
  type: INQUIRY_FILTER_ALL,
  channel: INQUIRY_FILTER_ALL,
  status: INQUIRY_FILTER_ALL,
} as const;
const INQUIRY_TYPE_FILTER_VALUES: readonly InquiryTypeFilter[] = [
  INQUIRY_FILTER_ALL,
  ...INQUIRY_TYPE_OPTIONS.map((option) => option.id),
];
const INQUIRY_CHANNEL_FILTER_VALUES: readonly InquiryChannelFilter[] = [
  INQUIRY_FILTER_ALL,
  ...INQUIRY_CHANNEL_OPTIONS.map((option) => option.id),
];
const INQUIRY_STATUS_FILTER_VALUES: readonly InquiryStatusFilter[] = [
  INQUIRY_FILTER_ALL,
  ...INQUIRY_STATUS_OPTIONS.map((option) => option.id),
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
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 4)' };

const dateCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
};

/** skeleton 은 실제 표와 같은 모양이어야 한다 — 열 수를 손으로 세지 않는다 (COMP-06) */
const COLUMNS: readonly string[] = [
  '유형',
  '채널',
  '제목',
  '고객/거래처',
  '담당',
  '접수일시',
  '상태',
  '견적',
];
const SKELETON_ROWS = 5;

export default function InquiryListPage() {
  const { rowNavProps } = useRowNavigation();
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const type: InquiryTypeFilter = parseFilter(
    list.filters['type'] ?? INQUIRY_FILTER_ALL,
    INQUIRY_TYPE_FILTER_VALUES,
    INQUIRY_FILTER_ALL,
  );
  const channel: InquiryChannelFilter = parseFilter(
    list.filters['channel'] ?? INQUIRY_FILTER_ALL,
    INQUIRY_CHANNEL_FILTER_VALUES,
    INQUIRY_FILTER_ALL,
  );
  const status: InquiryStatusFilter = parseFilter(
    list.filters['status'] ?? INQUIRY_FILTER_ALL,
    INQUIRY_STATUS_FILTER_VALUES,
    INQUIRY_FILTER_ALL,
  );

  const { data, isFetching, error, refetch } = useCrudListQuery(RESOURCE, inquiryAdapter);
  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  const firstLoading = isFetching && data === undefined;

  const visible = useMemo(
    () => searchInquiries(filterInquiries(data ?? [], type, channel, status), list.keyword),
    [data, type, channel, status, list.keyword],
  );

  if (error !== null) {
    return (
      <div style={columnStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>문의를 불러오지 못했습니다.</span>
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
          label="제목·문의번호·고객·거래처 검색"
          placeholder="제목 · 문의번호 · 고객 검색"
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={type}
            onChange={(event) => list.setFilter('type', event.target.value)}
            aria-label="유형으로 거르기"
          >
            <option value={INQUIRY_FILTER_ALL}>전체 유형</option>
            {INQUIRY_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={channel}
            onChange={(event) => list.setFilter('channel', event.target.value)}
            aria-label="채널로 거르기"
          >
            <option value={INQUIRY_FILTER_ALL}>전체 채널</option>
            {INQUIRY_CHANNEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={status}
            onChange={(event) => list.setFilter('status', event.target.value)}
            aria-label="상태로 거르기"
          >
            <option value={INQUIRY_FILTER_ALL}>전체 상태</option>
            {INQUIRY_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>

      <p style={hintStyle}>
        {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}
      </p>

      <table style={tableStyle} aria-busy={isFetching}>
        <caption style={visuallyHiddenStyle}>
          문의 목록 — 각 행에서 상세로 이동해 답변·상태를 처리할 수 있습니다.
        </caption>
        <thead>
          <tr>
            <SeqHeaderCell />
            {COLUMNS.map((header) => (
              <th key={header} scope="col" style={thStyle}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {firstLoading ? (
            Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <tr key={`skeleton-${String(index)}`}>
                {Array.from({ length: COLUMNS.length + 1 }, (_, cell) => (
                  <td key={`cell-${String(cell)}`} style={tdStyle}>
                    <span className="tds-ui-skeleton" aria-hidden="true" />
                  </td>
                ))}
              </tr>
            ))
          ) : visible.length === 0 ? (
            <tr>
              {/* [STATE-05] '없다'는 세 가지다 — 아직 없는 것, 검색이 안 맞는 것, 필터가 가린 것. */}
              <td colSpan={COLUMNS.length + 1} style={emptyCellStyle}>
                <Empty
                  label={ENTITY_LABEL}
                  createVerb="접수"
                  hasQuery={list.hasQuery}
                  hasActiveFilters={list.hasActiveFilters}
                  onClearSearch={list.clearSearch}
                  onResetFilters={list.resetFilters}
                />
              </td>
            </tr>
          ) : (
            visible.map((item, index) => (
              <tr key={item.id} className="tds-ui-row" {...rowNavProps(`${LIST_PATH}/${item.id}`)}>
                <SeqCell seq={index + 1} />
                <td style={tdStyle}>
                  <StatusBadge
                    tone={inquiryPriorityTone(item.priority)}
                    label={inquiryTypeLabel(item.type)}
                  />
                </td>
                <td style={tdStyle}>{inquiryChannelLabel(item.channel)}</td>
                <td style={tdStyle}>
                  {/* [A11Y-08] 행 클릭은 마우스 전용이다 — 키보드로도 같은 곳에 닿는 링크를 행 안에 둔다. */}
                  <Link to={`${LIST_PATH}/${item.id}`} className="tds-ui-link tds-ui-focusable">
                    {item.title}
                  </Link>
                </td>
                <td style={tdStyle}>{`${item.customerName} / ${item.company}`}</td>
                <td style={tdStyle}>{item.assignee === '' ? '미배정' : item.assignee}</td>
                <td style={dateCellStyle}>{formatDateTime(item.receivedAt)}</td>
                <td style={tdStyle}>
                  <StatusBadge
                    tone={inquiryStatusTone(item.status)}
                    label={inquiryStatusLabel(item.status)}
                  />
                </td>
                {/* 발행된 견적으로 가는 역링크 — 문의 ↔ 견적은 양방향이다 */}
                <td style={tdStyle}>
                  {hasIssuedQuote(item) ? (
                    <Link
                      to={`${QUOTE_PATH}/${item.quoteId}/edit`}
                      className="tds-ui-link tds-ui-focusable"
                      aria-label={`${item.title} 발행 견적`}
                    >
                      견적 보기
                    </Link>
                  ) : (
                    <span style={hintStyle}>—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
