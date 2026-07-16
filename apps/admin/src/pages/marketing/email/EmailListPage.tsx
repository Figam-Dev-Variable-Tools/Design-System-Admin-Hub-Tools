// EmailListPage — 이메일 발송 목록 (라우트: /marketing/email) · A41 소유
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 대상수·발송상태·오픈율/클릭율 열을
// 얹는다. 목록엔 이미지 열이 없다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { emailAdapter } from './data-source';
import { EMAIL_FILTER_ALL, filterEmailCampaigns, searchEmailCampaigns } from './types';
import type { EmailCampaign, EmailCampaignInput, EmailStatusFilter } from './types';
import {
  clickRate,
  openRate,
  parseSendStatus,
  SEND_STATUS_OPTIONS,
  sendStatusLabel,
  sendStatusTone,
} from '../_shared/messaging';

const RESOURCE = 'marketing-email';
const ENTITY_LABEL = '이메일 발송';
const LIST_PATH = '/marketing/email';

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
  const [filter, setFilter] = useState<EmailStatusFilter>(EMAIL_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

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
          value={keyword}
          onChange={setKeyword}
          label="발송명·제목 검색"
          placeholder="발송명 · 제목 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => setFilter(parseSendStatus(event.target.value) ?? EMAIL_FILTER_ALL)}
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
        hasQuery: keyword !== '',
        hasActiveFilters: filter !== EMAIL_FILTER_ALL,
        onClearSearch: () => setKeyword(''),
        onResetFilters: () => setFilter(EMAIL_FILTER_ALL),
      }}
      selectAllLabelId="marketing-email-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
