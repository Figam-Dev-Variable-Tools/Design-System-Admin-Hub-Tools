// EmailListPage — 이메일 발송 목록 (라우트: /marketing/email) · A41 소유
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 대상수·발송상태·오픈율/클릭율 열을
// 얹는다. 목록엔 이미지 열이 없다.
//
// [조회 상태의 소유자] status·keyword 는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '예약' 만 걸어 둔 채 발송 건을 열고 Back 하면 예전에는
// 필터 없는 전체 목록에 착지했다. 그 셋업이 날아가지 않고, '이 조건 좀 봐주세요' 하며 그 URL 을
// 그대로 공유할 수 있다. 검색은 IME 안전이다 (COMP-10) — '가정의달' 을 치는 도중 자모마다 조회가
// 나가거나 Enter 가 '가정의ㄷ' 로 제출되지 않는다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { emailAdapter } from './data-source';
import { EMAIL_FILTER_ALL, filterEmailCampaigns, searchEmailCampaigns } from './types';
import type { EmailCampaign, EmailCampaignInput, EmailStatusFilter } from './types';
import {
  clickRate,
  openRate,
  SEND_STATUS_OPTIONS,
  sendStatusLabel,
  sendStatusTone,
} from '../_shared/messaging';

const RESOURCE = 'marketing-email';
const ENTITY_LABEL = '이메일 발송';
const LIST_PATH = '/marketing/email';

/** 이 select 가 그리는 option id 전체 — URL 문자열을 `as` 없이 좁히는 허용 목록이다 */
const EMAIL_STATUS_FILTER_VALUES: readonly EmailStatusFilter[] = [
  EMAIL_FILTER_ALL,
  ...SEND_STATUS_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_DEFAULTS = { status: EMAIL_FILTER_ALL } as const;

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 5)' };

const numStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

const mutedStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const nameOf = (item: EmailCampaign) => item.name;

const COLUMNS: readonly CrudColumn<EmailCampaign>[] = [
  { header: '발송명', render: (item) => item.name },
  { header: '제목', render: (item) => item.subject },
  {
    header: '대상수',
    numeric: true,
    render: (item) => <span style={numStyle}>{`${formatNumber(item.recipientCount)}명`}</span>,
  },
  {
    header: '발송상태',
    nowrap: true,
    render: (item) => (
      <span style={statusCellStyle}>
        <StatusBadge tone={sendStatusTone(item.status)} label={sendStatusLabel(item.status)} />
        {item.scheduledAt !== '' && (
          <span style={mutedStyle}>{formatDateTime(item.scheduledAt)}</span>
        )}
      </span>
    ),
  },
  {
    header: '오픈율/클릭율',
    numeric: true,
    render: (item) =>
      item.status === 'sent' ? (
        <span
          style={numStyle}
        >{`${String(openRate(item.stats))}% / ${String(clickRate(item.stats))}%`}</span>
      ) : (
        <span style={mutedStyle}>—</span>
      ),
  },
];

export default function EmailListPage() {
  const navigate = useNavigate();
  // status·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const filter: EmailStatusFilter = parseFilter(
    list.filters['status'] ?? EMAIL_FILTER_ALL,
    EMAIL_STATUS_FILTER_VALUES,
    EMAIL_FILTER_ALL,
  );
  const { keyword } = list;

  const controller = useCrudList<EmailCampaign, EmailCampaignInput>({
    resource: RESOURCE,
    adapter: emailAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchEmailCampaigns(filterEmailCampaigns(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="발송명·제목 검색"
          placeholder="발송명 · 제목 검색"
          // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('status', event.target.value)}
            aria-label="발송상태로 거르기"
          >
            <option value={EMAIL_FILTER_ALL}>전체 상태</option>
            {SEND_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        이메일 발송 등록
      </Button>
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visible}
      columns={COLUMNS}
      nameOf={nameOf}
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="marketing-email-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
