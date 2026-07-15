// TicketListPage — 1:1 문의 목록 (라우트: /support/tickets) · A41 소유
//
// 문의는 고객 채널이 만들고 관리자는 처리·답변만 한다 → 읽기 전용 트리아지 표(삭제·일괄 없음).
// 상태·우선순위·채널·유형 필터 + 검색, 행 → 상세. SLA 임박/초과 배지로 마감시계를 시각화한다
// (국내 CS 관례: 목록에서 상태·우선순위·SLA·담당을 한눈에 훑을 수 있어야 한다).
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
import { ticketAdapter, TICKET_RESOURCE } from './data-source';
import { listActiveCategories } from '../_shared/store';
import {
  filterTickets,
  isTicketChannel,
  isTicketPriority,
  isTicketStatus,
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

const LIST_PATH = '/support/tickets';
const CONTENT_COLUMNS = 10;

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

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 3.5)' };

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

export default function TicketListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TicketStatusFilter>(TICKET_FILTER_ALL);
  const [priority, setPriority] = useState<TicketPriorityFilter>(TICKET_FILTER_ALL);
  const [channel, setChannel] = useState<TicketChannelFilter>(TICKET_FILTER_ALL);
  const [categoryId, setCategoryId] = useState<string>(TICKET_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const categories = useMemo(() => listActiveCategories(), []);

  const {
    data,
    isFetching: loading,
    error,
    refetch,
  } = useCrudListQuery(TICKET_RESOURCE, ticketAdapter);

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
          value={keyword}
          onChange={setKeyword}
          label="제목·문의번호·고객 검색"
          placeholder="제목 · 문의번호 · 고객 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={status}
            onChange={(event) => {
              const next = event.target.value;
              setStatus(
                next === TICKET_FILTER_ALL || isTicketStatus(next) ? next : TICKET_FILTER_ALL,
              );
            }}
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
            onChange={(event) => {
              const next = event.target.value;
              setPriority(
                next === TICKET_FILTER_ALL || isTicketPriority(next) ? next : TICKET_FILTER_ALL,
              );
            }}
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
            onChange={(event) => {
              const next = event.target.value;
              setChannel(
                next === TICKET_FILTER_ALL || isTicketChannel(next) ? next : TICKET_FILTER_ALL,
              );
            }}
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
            onChange={(event) => setCategoryId(event.target.value)}
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

      <p style={hintStyle}>{loading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}</p>

      <table style={tableStyle} aria-busy={loading}>
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
          {loading ? (
            Array.from({ length: 5 }, (_, index) => (
              <tr key={`skeleton-${String(index)}`}>
                {Array.from({ length: CONTENT_COLUMNS + 1 }, (_, cell) => (
                  <td key={`cell-${String(cell)}`} style={tdStyle}>
                    <span className="tds-ui-skeleton" aria-hidden="true" />
                  </td>
                ))}
              </tr>
            ))
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
                <tr key={ticket.id}>
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
