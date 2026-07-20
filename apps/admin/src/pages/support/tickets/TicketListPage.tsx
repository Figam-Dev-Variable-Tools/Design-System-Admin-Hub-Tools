// TicketListPage — 1:1 문의 목록 (라우트: /support/tickets)
//
// 문의는 고객 채널이 만들고 관리자는 처리·답변만 한다 → 읽기 전용 트리아지 표(삭제·일괄 없음).
// 상태·우선순위·채널·유형 필터 + 검색, 행 → 상세. SLA 임박/초과 배지로 마감시계를 시각화한다
// (국내 CS 관례: 목록에서 상태·우선순위·SLA·담당을 한눈에 훑을 수 있어야 한다).
//
// [조회 상태의 소유자] 상태·우선순위·채널·유형·검색어는 이 파일의 useState 5개였다. 이제 shared/crud 의
// useListState 가 **URL 쿼리스트링**으로 소유한다 (IA-13). 이 화면이 그 손실이 가장 큰 곳이다 —
// 트리아지는 '미답변 + 긴급' 처럼 축 네 개를 조합해 세팅한 뒤 문의를 하나씩 열고 닫는 반복 작업인데,
// 상태가 useState 에만 있으면 상세에서 Back 할 때마다 그 세팅이 통째로 날아가 매번 다시 걸어야 했다.
// 이제 그 트리아지 큐가 URL 로 남아 Back·F5 를 견디고, 그대로 담당자에게 공유된다.
// 검색은 IME 안전이다 (COMP-10).
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
  SkeletonRows,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { parseFilter, useCrudListQuery, useListState } from '../../../shared/crud';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import { ticketAdapter, TICKET_RESOURCE } from './data-source';
import { listActiveCategories } from '../_shared/store';
import {
  filterTickets,
  searchTickets,
  slaStateLabel,
  slaTone,
  TICKET_CHANNEL_OPTIONS,
  TICKET_FILTER_ALL,
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
  ticketChannelLabel,
  ticketPriorityLabel,
  ticketPriorityTone,
  ticketSlaState,
  ticketStatusLabel,
  ticketStatusTone,
} from '../_shared/domain';
import type {
  TicketChannelFilter,
  TicketPriorityFilter,
  TicketStatusFilter,
} from '../_shared/domain';
import { cssVar } from '@tds/ui';

const LIST_PATH = '/support/tickets';
const CONTENT_COLUMNS = 10;

/** 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 각 select 가 그리는 옵션 전체가 허용 목록이다 */
const TICKET_STATUS_FILTER_VALUES: readonly TicketStatusFilter[] = [
  TICKET_FILTER_ALL,
  ...TICKET_STATUS_OPTIONS.map((option) => option.id),
];
const TICKET_PRIORITY_FILTER_VALUES: readonly TicketPriorityFilter[] = [
  TICKET_FILTER_ALL,
  ...TICKET_PRIORITY_OPTIONS.map((option) => option.id),
];
const TICKET_CHANNEL_FILTER_VALUES: readonly TicketChannelFilter[] = [
  TICKET_FILTER_ALL,
  ...TICKET_CHANNEL_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13) */
const FILTER_DEFAULTS = {
  status: TICKET_FILTER_ALL,
  priority: TICKET_FILTER_ALL,
  channel: TICKET_FILTER_ALL,
  category: TICKET_FILTER_ALL,
} as const;

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 3.5)' };

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
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
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

export default function TicketListPage() {
  const navigate = useNavigate();
  const { rowNavProps } = useRowNavigation();

  // 상태·우선순위·채널·유형·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const status: TicketStatusFilter = parseFilter(
    list.filters['status'] ?? TICKET_FILTER_ALL,
    TICKET_STATUS_FILTER_VALUES,
    TICKET_FILTER_ALL,
  );
  const priority: TicketPriorityFilter = parseFilter(
    list.filters['priority'] ?? TICKET_FILTER_ALL,
    TICKET_PRIORITY_FILTER_VALUES,
    TICKET_FILTER_ALL,
  );
  const channel: TicketChannelFilter = parseFilter(
    list.filters['channel'] ?? TICKET_FILTER_ALL,
    TICKET_CHANNEL_FILTER_VALUES,
    TICKET_FILTER_ALL,
  );
  // 유형은 운영자가 만드는 카테고리라 닫힌 유니온이 없다 — 모르는 id 는 filterTickets 가
  // '일치하는 문의 없음' 으로 흘려보낸다(빈 목록일 뿐, 조회가 깨지지 않는다).
  const categoryId = list.filters['category'] ?? TICKET_FILTER_ALL;
  const { keyword } = list;

  const categories = useMemo(() => listActiveCategories(), []);

  const { data, isFetching, error, refetch } = useCrudListQuery(TICKET_RESOURCE, ticketAdapter);

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
    () => searchTickets(filterTickets(data ?? [], status, channel, priority, categoryId), keyword),
    [data, status, channel, priority, categoryId, keyword],
  );

  // SLA 는 현재 시각 기준 파생값 — 마운트 시 한 번 고정해 행마다 일관되게 쓴다
  const now = useMemo(() => new Date(), []);

  if (error !== null) {
    return (
      <div style={columnStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
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
          label="제목·문의번호·고객 검색"
          placeholder="제목 · 문의번호 · 고객 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '배송 지연' 을 치는 도중 '배송 지ㅇ' 로 검색되지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={status}
            onChange={(event) => list.setFilter('status', event.target.value)}
            aria-label="상태로 거르기"
          >
            <option value={TICKET_FILTER_ALL}>전체 상태</option>
            {TICKET_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={priority}
            onChange={(event) => list.setFilter('priority', event.target.value)}
            aria-label="우선순위로 거르기"
          >
            <option value={TICKET_FILTER_ALL}>전체 우선순위</option>
            {TICKET_PRIORITY_OPTIONS.map((option) => (
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
            <option value={TICKET_FILTER_ALL}>전체 채널</option>
            {TICKET_CHANNEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={categoryId}
            onChange={(event) => list.setFilter('category', event.target.value)}
            aria-label="유형으로 거르기"
          >
            <option value={TICKET_FILTER_ALL}>전체 유형</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
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
          1:1 문의 목록 — 각 행에서 상세로 이동해 답변·상태·담당을 처리할 수 있습니다.
        </caption>
        <thead>
          <tr>
            <SeqHeaderCell />
            <th scope="col" style={thStyle}>
              상태
            </th>
            <th scope="col" style={thStyle}>
              우선순위
            </th>
            <th scope="col" style={thStyle}>
              유형
            </th>
            <th scope="col" style={thStyle}>
              채널
            </th>
            <th scope="col" style={thStyle}>
              제목
            </th>
            <th scope="col" style={thStyle}>
              고객
            </th>
            <th scope="col" style={thStyle}>
              담당
            </th>
            <th scope="col" style={thStyle}>
              SLA
            </th>
            <th scope="col" style={thStyle}>
              접수일시
            </th>
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {firstLoading ? (
            <SkeletonRows rows={5} cols={CONTENT_COLUMNS + 1} />
          ) : visible.length === 0 ? (
            <tr>
              <td colSpan={CONTENT_COLUMNS + 1} style={emptyCellStyle}>
                문의가 없습니다.
              </td>
            </tr>
          ) : (
            visible.map((ticket, index) => {
              const sla = ticketSlaState(ticket, now);
              return (
                <tr
                  key={ticket.id}
                  className="tds-ui-row"
                  {...rowNavProps(`${LIST_PATH}/${ticket.id}`)}
                >
                  <SeqCell seq={index + 1} />
                  <td style={tdStyle}>
                    <StatusBadge
                      tone={ticketStatusTone(ticket.status)}
                      label={ticketStatusLabel(ticket.status)}
                    />
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge
                      tone={ticketPriorityTone(ticket.priority)}
                      label={ticketPriorityLabel(ticket.priority)}
                    />
                  </td>
                  <td style={tdStyle}>{ticket.categoryLabel}</td>
                  <td style={tdStyle}>{ticketChannelLabel(ticket.channel)}</td>
                  <td style={tdStyle}>{ticket.title}</td>
                  <td style={tdStyle}>{ticket.customerName}</td>
                  <td style={tdStyle}>{ticket.assignee === '' ? '미배정' : ticket.assignee}</td>
                  <td style={tdStyle}>
                    <StatusBadge tone={slaTone(sla)} label={slaStateLabel(sla)} />
                  </td>
                  <td style={dateCellStyle}>{formatDateTime(ticket.receivedAt)}</td>
                  <td style={actionCellStyle}>
                    <button
                      type="button"
                      className="tds-ui-btn-secondary tds-ui-focusable"
                      style={buttonStyle('secondary')}
                      aria-label={`${ticket.title} 상세`}
                      onClick={() => navigate(`${LIST_PATH}/${ticket.id}`)}
                    >
                      상세
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
