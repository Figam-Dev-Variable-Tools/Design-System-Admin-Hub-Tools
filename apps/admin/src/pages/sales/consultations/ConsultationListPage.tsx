// ConsultationListPage — 상담 이력 목록 (라우트: /sales/consultations)
//
// 상담 이력은 감사 성격이라 읽기 위주다(생성/수정/삭제 없음). 그래서 읽기 전용 껍데기
// CrudReadListShell 을 쓴다: 유형 필터 + 후속조치 대기 필터 + 검색 + 행 → 상세. 표 골격은 그
// 껍데기가 공유하는 DS Table 이 소유한다(예전에는 이 파일이 <table> 을 손으로 그렸다).
//
// [조회 상태의 소유자] 유형·후속조치 대기·검색어는 useListState 가 **URL 쿼리스트링**으로 소유한다
// (IA-13) — '후속조치 대기만' 을 켜 놓고 상세로 들어갔다 Back 하면 그 대기 목록으로 돌아온다.
// 그 URL 을 담당자에게 그대로 넘길 수도 있다. 검색은 IME 안전이다 (COMP-10).
import { useMemo, type CSSProperties, type ReactNode } from 'react';

import { formatDateTime } from '../../../shared/format';
import { checkboxStyle, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import {
  CrudReadListShell,
  DetailCellLink,
  parseFilter,
  useCrudListQuery,
  useListState,
  type CrudColumn,
  type RowTarget,
} from '../../../shared/crud';
import { AccountLink } from '../_shared/AccountLink';
import { consultationAdapter } from './data-source';
import {
  CONSULT_FILTER_ALL,
  CONSULT_TYPE_OPTIONS,
  consultOutcomeLabel,
  consultOutcomeTone,
  consultTypeLabel,
  filterConsultations,
  hasPendingFollowUp,
  searchConsultations,
} from './types';
import type { Consultation, ConsultTypeFilter } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'sales-consultations';
const LIST_PATH = '/sales/consultations';
const ENTITY_LABEL = '상담 이력';
const CONSULT_TYPE_FILTER_VALUES: readonly ConsultTypeFilter[] = [
  CONSULT_FILTER_ALL,
  ...CONSULT_TYPE_OPTIONS.map((option) => option.id),
];

/**
 * URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13).
 * 체크박스(후속조치 대기만)는 URL 이 문자열만 담으므로 'true'/'false' 로 직렬화한다.
 */
const PENDING_ON = 'true';
const PENDING_OFF = 'false';
const FILTER_DEFAULTS = { type: CONSULT_FILTER_ALL, pending: PENDING_OFF } as const;

/* 행 클릭 목적지 — 상세로 간다. read 로 게이팅되므로 조회 전용 역할도 갈 수 있다. */
const ROW_TARGET: RowTarget<Consultation> = {
  kind: 'detail',
  href: (item) => `${LIST_PATH}/${item.id}`,
};

/* 열 정의 — 순번은 DS Table 이 자동으로 붙인다. 예전의 '상세' 액션 버튼 열은 뺐고, 대신 주제를
   DetailCellLink 로 감싼다: 행 클릭은 마우스 전용이라(계약) 키보드 사용자는 이 링크로 상세에 닿는다. */
const COLUMNS: readonly CrudColumn<Consultation>[] = [
  { header: '상담일시', nowrap: true, render: (item) => formatDateTime(item.consultedAt) },
  { header: '거래처', render: (item) => <AccountLink account={item} /> },
  {
    header: '유형',
    render: (item) => (
      <StatusBadge
        tone={consultOutcomeTone(item.outcome)}
        label={consultTypeLabel(item.consultType)}
      />
    ),
  },
  {
    // 주제는 상세로 가는 키보드 경로다(행 클릭은 마우스 전용 — DetailCellLink 머리말)
    header: '주제',
    render: (item) => <DetailCellLink to={`${LIST_PATH}/${item.id}`}>{item.topic}</DetailCellLink>,
  },
  { header: '담당자', render: (item) => item.consultant },
  {
    header: '후속조치',
    render: (item) =>
      hasPendingFollowUp(item) ? (
        <StatusBadge tone="warning" label="대기" />
      ) : (
        <StatusBadge tone="neutral" label={consultOutcomeLabel(item.outcome)} />
      ),
  },
];

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const checkLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  cursor: 'pointer',
};

export default function ConsultationListPage() {
  // 유형·후속조치 대기·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?type=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const type: ConsultTypeFilter = parseFilter(
    list.filters['type'] ?? CONSULT_FILTER_ALL,
    CONSULT_TYPE_FILTER_VALUES,
    CONSULT_FILTER_ALL,
  );
  const pendingOnly = list.filters['pending'] === PENDING_ON;
  const { keyword } = list;

  const { data, isFetching, error, refetch } = useCrudListQuery(RESOURCE, consultationAdapter);
  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  const firstLoading = isFetching && data === undefined;

  const visible = useMemo(
    () => searchConsultations(filterConsultations(data ?? [], type, pendingOnly), keyword),
    [data, type, pendingOnly, keyword],
  );

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <SearchField
        value={list.searchInput}
        onChange={list.setSearchInput}
        label="거래처·주제·담당자 검색"
        placeholder="거래처 · 주제 · 담당자 검색"
        {...list.searchInputProps}
      />
      <span style={selectWrapStyle}>
        <SelectField
          value={type}
          onChange={(event) => list.setFilter('type', event.target.value)}
          aria-label="상담유형으로 거르기"
        >
          <option value={CONSULT_FILTER_ALL}>전체 유형</option>
          {CONSULT_TYPE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      <label style={checkLabelStyle}>
        <input
          type="checkbox"
          style={checkboxStyle}
          checked={pendingOnly}
          onChange={(event) =>
            list.setFilter('pending', event.target.checked ? PENDING_ON : PENDING_OFF)
          }
        />
        후속조치 대기만
      </label>
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
      nameOf={(item) => item.topic}
      rowTarget={ROW_TARGET}
      toolbar={toolbar}
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
    />
  );
}
