// ProgramInquiryListPage — 프로그램 문의 목록 (라우트: /programs/inquiries)
//
// [무엇을 보는 화면인가] 결제대행(PG)을 끈 프로그램의 페이지 버튼은 '후원하기' 대신 '문의하기' 다.
// 그 버튼을 누른 후원자의 글이 도착하는 곳이 여기다. 펀딩은 **마감이 있는 판매**라 답이 늦으면
// 후원 자체가 사라진다 — 그래서 이 목록의 중심 열은 제목이 아니라 **경과**다.
//
// [필터 축이 둘인 이유] 상태만으로는 '무엇부터 답할까' 가 정해지지 않는다. 리워드·배송 문의는
// 창작자 확인이 필요하고 환불·결제는 운영이 바로 답할 수 있어 **처리하는 사람이 다르다**. 그래서
// 좌측 레일에 상태와 유형 두 패널을 세우고, 둘 다 URL 이 소유한다(IA-13).
//
// [읽기 전용 껍데기] 문의는 후원자가 만들고 관리자는 답변·종결만 한다. 삭제·일괄작업·선택
// 체크박스가 어떤 역할에게도 없어야 하므로 CrudListShell 이 아니라 CrudReadListShell 을 쓴다.
import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cssVar } from '@tds/ui';

import { formatDateTime, formatNumber } from '../../../shared/format';
import { FilterPanel, FilterRail, hintStyle, SearchField, StatusBadge } from '../../../shared/ui';
import {
  CrudReadListShell,
  DetailCellLink,
  parseFilter,
  useCrudListQuery,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn, RowTarget } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { PROGRAM_INQUIRY_RESOURCE, programInquiryAdapter } from './data-source';
import type { ProgramInquiry } from './_shared/store';
import {
  countProgramInquiriesByStatus,
  countProgramInquiriesByTopic,
  elapsedLabel,
  elapsedTone,
  filterProgramInquiries,
  PROGRAM_INQUIRY_FILTER_ALL,
  PROGRAM_INQUIRY_STATUS_FILTER_VALUES,
  PROGRAM_INQUIRY_STATUS_FILTERS,
  PROGRAM_INQUIRY_TOPIC_FILTER_VALUES,
  PROGRAM_INQUIRY_TOPIC_FILTERS,
  programInquiryChannelLabel,
  programInquiryStatusLabel,
  programInquiryStatusTone,
  programInquiryTopicLabel,
  programInquiryTopicTone,
  searchProgramInquiries,
  unansweredCount,
} from './types';
import type { ProgramInquiryStatusFilter, ProgramInquiryTopicFilter } from './types';

const ENTITY_LABEL = '프로그램 문의';
const LIST_PATH = '/programs/inquiries';

/**
 * 경과의 기준일 — 화면이 `new Date()` 를 읽으면 픽스처의 '2일째 미답변' 이 실행하는 날마다 달라져
 * 스토리북 회귀 비교가 매일 깨진다(ProgramListPage 와 같은 판단).
 */
const TODAY = '2026-07-21';

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = {
  status: PROGRAM_INQUIRY_FILTER_ALL,
  topic: PROGRAM_INQUIRY_FILTER_ALL,
} as const;

/** 행 클릭 목적지 — 상세(답변 작성). 표의 캡션 문장도 여기서 파생된다 */
const ROW_TARGET: RowTarget<ProgramInquiry> = {
  kind: 'detail',
  href: (item) => `${LIST_PATH}/${item.id}`,
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

/** 문의번호는 후원자가 전화로 부르는 값이다 — 줄바꿈 없이 한 덩이로 읽힌다 */
const inquiryNoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  color: cssVar('color.text.muted'),
};

const programCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 8)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const nameOf = (item: ProgramInquiry) => item.subject;

export default function ProgramInquiryListPage() {
  // 답변 권한이 없으면 이 화면은 '읽는 화면' 이다 — 좌측 안내가 그 사실을 미리 밝힌다 (EXC-03)
  const { canUpdate } = useRouteWritePermissions();

  // status·topic·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체' 로 되돌린다
  const status: ProgramInquiryStatusFilter = parseFilter(
    list.filters['status'] ?? PROGRAM_INQUIRY_FILTER_ALL,
    PROGRAM_INQUIRY_STATUS_FILTER_VALUES,
    PROGRAM_INQUIRY_FILTER_ALL,
  );
  const topic: ProgramInquiryTopicFilter = parseFilter(
    list.filters['topic'] ?? PROGRAM_INQUIRY_FILTER_ALL,
    PROGRAM_INQUIRY_TOPIC_FILTER_VALUES,
    PROGRAM_INQUIRY_FILTER_ALL,
  );

  const { data, isFetching, error, refetch } = useCrudListQuery(
    PROGRAM_INQUIRY_RESOURCE,
    programInquiryAdapter,
  );
  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  const firstLoading = isFetching && data === undefined;

  const items = useMemo(() => data ?? [], [data]);

  // 건수는 **필터 이전** 전체 집합에서 센다. 아직 못 셌으면 null 이다 —
  // 0 과 '모름' 은 다른 사실이라 FilterPanel 이 '—' 를 띄운다.
  const loaded = !firstLoading && error === null;
  const statusCounts = useMemo(
    () => (loaded ? countProgramInquiriesByStatus(items) : null),
    [items, loaded],
  );
  const topicCounts = useMemo(
    () => (loaded ? countProgramInquiriesByTopic(items) : null),
    [items, loaded],
  );
  const pending = useMemo(() => unansweredCount(items), [items]);

  const visible = useMemo(
    () => searchProgramInquiries(filterProgramInquiries(items, status, topic), list.keyword),
    [items, status, topic, list.keyword],
  );

  const columns: readonly CrudColumn<ProgramInquiry>[] = [
    {
      header: '문의번호',
      nowrap: true,
      render: (item) => <span style={inquiryNoStyle}>{item.id}</span>,
    },
    {
      header: '프로그램명',
      render: (item) => <span style={programCellStyle}>{item.programName}</span>,
    },
    { header: '문의자', nowrap: true, render: (item) => item.customerName },
    {
      // 제목은 상세로 가는 **키보드 경로**다 — 행 클릭은 마우스 전용이다(DetailCellLink 머리말)
      header: '제목',
      render: (item) => (
        <DetailCellLink to={`${LIST_PATH}/${item.id}`}>{item.subject}</DetailCellLink>
      ),
    },
    {
      header: '유형',
      nowrap: true,
      render: (item) => (
        <StatusBadge
          tone={programInquiryTopicTone(item.topic)}
          label={programInquiryTopicLabel(item.topic)}
        />
      ),
    },
    { header: '채널', nowrap: true, render: (item) => programInquiryChannelLabel(item.channel) },
    {
      header: '상태',
      nowrap: true,
      render: (item) => (
        <StatusBadge
          tone={programInquiryStatusTone(item.status)}
          label={programInquiryStatusLabel(item.status)}
        />
      ),
    },
    { header: '접수일', nowrap: true, render: (item) => formatDateTime(item.createdAt) },
    {
      header: '경과',
      nowrap: true,
      // 색만으로 지연을 말하지 않는다 — 배지 안에 '2일째 미답변' 이라는 문구가 함께 실린다
      render: (item) => (
        <StatusBadge tone={elapsedTone(item, TODAY)} label={elapsedLabel(item, TODAY)} />
      ),
    },
  ];

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <span style={searchWrapStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="문의번호·프로그램명·문의자·제목 검색"
          placeholder="문의번호 · 프로그램명 · 문의자 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '헤드폰' 을 치는 도중 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
      </span>
    </div>
  );

  return (
    <div style={layoutStyle}>
      <FilterRail
        notice={
          <>
            <p style={hintStyle}>
              {loaded
                ? `답변을 기다리는 문의가 ${formatNumber(pending)}건 있습니다.`
                : '미답변 건수를 세는 중입니다.'}
            </p>
            <p style={hintStyle}>
              결제대행을 끈 프로그램은 후원하기 대신 문의하기 버튼이 노출되고, 그 문의가 이 목록으로
              들어옵니다. 마감이 있는 펀딩이라 답변이 늦으면 후원이 사라집니다.
            </p>
            {!canUpdate && <p style={hintStyle}>답변 권한이 없어 조회만 가능합니다.</p>}
          </>
        }
      >
        <FilterPanel
          navLabel="프로그램 문의 상태 필터"
          heading="처리 상태"
          options={PROGRAM_INQUIRY_STATUS_FILTERS}
          value={status}
          counts={statusCounts}
          onChange={(next) => list.setFilter('status', next)}
        />
        <FilterPanel
          navLabel="프로그램 문의 유형 필터"
          heading="문의 유형"
          options={PROGRAM_INQUIRY_TOPIC_FILTERS}
          value={topic}
          counts={topicCounts}
          onChange={(next) => list.setFilter('topic', next)}
        />
      </FilterRail>

      <CrudReadListShell
        entityLabel={ENTITY_LABEL}
        state={{
          firstLoading,
          refreshing: isFetching && !firstLoading,
          error,
          refetch: () => void refetch(),
        }}
        visibleItems={visible}
        columns={columns}
        nameOf={nameOf}
        rowTarget={ROW_TARGET}
        toolbar={toolbar}
        // 왜 비었는지에 따라 복구 수단이 다르다 — 검색 지우기 / 필터 초기화 (STATE-05)
        empty={{
          createVerb: '접수',
          hasQuery: list.hasQuery,
          hasActiveFilters: list.hasActiveFilters,
          onClearSearch: list.clearSearch,
          onResetFilters: list.resetFilters,
        }}
      />
    </div>
  );
}
