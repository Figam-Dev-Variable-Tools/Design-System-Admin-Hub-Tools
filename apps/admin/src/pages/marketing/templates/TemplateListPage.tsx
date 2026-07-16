// TemplateListPage — 발송 템플릿 목록 (라우트: /marketing/templates) · A41 소유
//
// 채널(SMS/이메일/알림톡) 필터 + 검색 + 채널/승인상태 배지. 데이터·선택·삭제 배선은 공용 CRUD
// 프레임워크(useCrudList + CrudListShell). 알림톡만 승인상태 배지가 의미를 갖는다(발송 화면이 승인
// 템플릿만 삽입). 목록엔 이미지 열이 없다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { templateAdapter, TEMPLATE_RESOURCE } from './data-source';
import {
  approvalStatusLabel,
  approvalStatusTone,
  filterTemplatesByChannel,
  MESSAGE_CHANNEL_OPTIONS,
  messageChannelLabel,
  parseMessageChannel,
  requiresApproval,
  searchTemplates,
  TEMPLATE_FILTER_ALL,
} from '../_shared/messaging';
import type {
  MessageTemplate,
  MessageTemplateInput,
  TemplateChannelFilter,
} from '../_shared/messaging';

const ENTITY_LABEL = '발송 템플릿';
const LIST_PATH = '/marketing/templates';

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

const bodyPreviewStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  display: 'block',
  maxWidth: 'calc(var(--tds-space-6) * 12)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const dateStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

function bodyPreview(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 60)}…` : oneLine;
}

const nameOf = (item: MessageTemplate) => item.name;

const COLUMNS: readonly CrudColumn<MessageTemplate>[] = [
  { header: '템플릿명', render: (item) => item.name },
  {
    header: '채널',
    nowrap: true,
    render: (item) => <StatusBadge tone="info" label={messageChannelLabel(item.channel)} />,
  },
  {
    header: '승인상태',
    nowrap: true,
    render: (item) =>
      requiresApproval(item.channel) ? (
        <StatusBadge
          tone={approvalStatusTone(item.approvalStatus)}
          label={approvalStatusLabel(item.approvalStatus)}
        />
      ) : (
        <span style={dateStyle}>—</span>
      ),
  },
  {
    header: '본문',
    render: (item) => <span style={bodyPreviewStyle}>{bodyPreview(item.body)}</span>,
  },
  {
    header: '수정일시',
    nowrap: true,
    render: (item) => <span style={dateStyle}>{formatDateTime(item.updatedAt)}</span>,
  },
];

export default function TemplateListPage() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<TemplateChannelFilter>(TEMPLATE_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const controller = useCrudList<MessageTemplate, MessageTemplateInput>({
    resource: TEMPLATE_RESOURCE,
    adapter: templateAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  useEffect(() => {
    clear();
  }, [channel, keyword, clear]);

  const visibleItems = useMemo(
    () => searchTemplates(filterTemplatesByChannel(controller.items, channel), keyword),
    [controller.items, channel, keyword],
  );

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="템플릿명·본문 검색"
          placeholder="템플릿명 · 본문 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={channel}
            onChange={(event) =>
              setChannel(parseMessageChannel(event.target.value) ?? TEMPLATE_FILTER_ALL)
            }
            aria-label="채널로 거르기"
          >
            <option value={TEMPLATE_FILTER_ALL}>전체 채널</option>
            {MESSAGE_CHANNEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        템플릿 등록
      </Button>
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visibleItems}
      columns={COLUMNS}
      nameOf={nameOf}
      selectAllLabelId="marketing-templates-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
