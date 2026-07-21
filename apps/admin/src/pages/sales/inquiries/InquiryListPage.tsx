// InquiryListPage — 문의 목록 (라우트: /sales/inquiries)
//
// 문의는 고객 채널이 만들고 관리자는 처리·답변만 한다. 그래서 삭제-CRUD 용 CrudListShell 이 아니라
// 읽기 전용 껍데기 CrudReadListShell 을 쓴다: 유형·채널·상태 필터 + 검색 + 행 → 상세(타임라인·답변).
// 표 골격은 그 껍데기가 공유하는 DS Table 이 소유한다(예전에는 이 파일이 <table> 을 손으로 그렸다).
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { formatDateTime } from '../../../shared/format';
import { hintStyle, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import {
  CrudReadListShell,
  DetailCellLink,
  parseFilter,
  useCrudListQuery,
  useListState,
  type CrudColumn,
  type RowTarget,
} from '../../../shared/crud';
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
import type {
  Inquiry,
  InquiryChannelFilter,
  InquiryStatusFilter,
  InquiryTypeFilter,
} from './types';
import { cssVar } from '@tds/ui';

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

/* 행 클릭 목적지 — 상세로 간다(타임라인·답변). read 로 게이팅되므로 조회 전용 역할도 갈 수 있다. */
const ROW_TARGET: RowTarget<Inquiry> = {
  kind: 'detail',
  href: (item) => `${LIST_PATH}/${item.id}`,
};

/* 열 정의 — 순번은 DS Table 이 자동으로 붙인다. 제목은 DetailCellLink 로 감싼다:
   행 클릭은 마우스 전용이라(계약) 키보드 사용자는 이 링크로 상세에 닿는다. '견적' 열의 링크는
   **다른 목적지**(견적)이며, DS Table 가드가 <a> 내부 클릭을 행 활성화에서 제외해 둘이 공존한다. */
const COLUMNS: readonly CrudColumn<Inquiry>[] = [
  {
    header: '유형',
    render: (item) => (
      <StatusBadge tone={inquiryPriorityTone(item.priority)} label={inquiryTypeLabel(item.type)} />
    ),
  },
  { header: '채널', render: (item) => inquiryChannelLabel(item.channel) },
  {
    // 제목은 상세로 가는 키보드 경로다(행 클릭은 마우스 전용 — DetailCellLink 머리말)
    header: '제목',
    render: (item) => <DetailCellLink to={`${LIST_PATH}/${item.id}`}>{item.title}</DetailCellLink>,
  },
  { header: '고객/거래처', render: (item) => `${item.customerName} / ${item.company}` },
  { header: '담당', render: (item) => (item.assignee === '' ? '미배정' : item.assignee) },
  { header: '접수일시', nowrap: true, render: (item) => formatDateTime(item.receivedAt) },
  {
    header: '상태',
    render: (item) => (
      <StatusBadge tone={inquiryStatusTone(item.status)} label={inquiryStatusLabel(item.status)} />
    ),
  },
  {
    header: '견적',
    // [보기와 고치기는 다르다] 이 링크는 '/:id/edit' 로 갔다 — 이름은 '견적 보기' 인데 열리는
    // 것은 편집 폼이었고, 발행 완료·수주 전환된 견적까지 수정 화면으로 열렸다. 읽기 전용 상세
    // (/sales/quotes/:id)로 보낸다. 고치려는 사람은 그 상세에서 '수정' 으로 간다.
    render: (item) =>
      hasIssuedQuote(item) ? (
        <Link
          to={`${QUOTE_PATH}/${item.quoteId}`}
          className="tds-ui-link tds-ui-focusable"
          aria-label={`${item.title} 발행 견적`}
        >
          견적 보기
        </Link>
      ) : (
        <span style={hintStyle}>—</span>
      ),
  },
];

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 4)` };

export default function InquiryListPage() {
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

  const toolbar: ReactNode = (
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
  );

  return (
    <CrudReadListShell
      entityLabel={ENTITY_LABEL}
      state={{
        firstLoading,
        refreshing: isFetching && !firstLoading,
        error,
        refetch: () => void refetch(),
      }}
      visibleItems={visible}
      columns={COLUMNS}
      nameOf={(item) => item.title}
      rowTarget={ROW_TARGET}
      toolbar={toolbar}
      empty={{
        createVerb: '접수',
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
    />
  );
}
