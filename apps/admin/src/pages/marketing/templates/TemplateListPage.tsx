// TemplateListPage — 알림톡 템플릿 목록 (라우트: /marketing/templates/alimtalk)
//
// ⚠ [알림톡/브랜드메시지 재구축 대기 중 — 사이드바에 없다]
// /marketing/templates 는 이제 **메시지 템플릿(이메일·문자)** 화면이다. 이 화면은 그 모델이 아직
// 덮지 못하는 것을 들고 있어서 지우지 않고 여기 세워 뒀다: 카카오 **사전 심사** 상태(검수중·승인·반려),
// 승인된 문구의 편집 잠금, 반려 사유. 심사의 주체가 우리가 아니라는 점이 새 모델의 발행 상태
// (운영자가 켜고 끄는 Draft→Publish→Active↔Inactive)와 근본적으로 다르다.
// 알림톡이 **세 번째 종류**로 다시 들어올 때 이 규칙들을 그쪽으로 옮긴다 — 그때까지 기능도 링크도
// 잃지 않게 라우트만 남긴다 (App.tsx 의 /marketing/templates 블록 주석 참고).
//
// 채널(SMS/이메일/알림톡) 필터 + 검색 + 채널/승인상태 배지. 데이터·선택·삭제 배선은 공용 CRUD
// 프레임워크(useCrudList + CrudListShell). 알림톡만 승인상태 배지가 의미를 갖는다(발송 화면이 승인
// 템플릿만 삽입). 목록엔 이미지 열이 없다.
//
// [조회 상태의 소유자] channel·keyword 는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — 알림톡 템플릿만 걸러 하나를 열어 문구를 고치고 Back 하면
// 예전에는 전체 채널 목록에 착지해 방금 보던 자리를 다시 찾아야 했다. 이제 그 조건이 URL 에 남아
// 복원되고, 링크로 공유된다. 검색은 IME 안전이다 (COMP-10) — '배송완료' 를 치는 도중 자모마다
// 조회가 나가거나 Enter 가 '배송완ㄹ' 로 제출되지 않는다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime } from '../../../shared/format';
import { Button, Icon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { templateAdapter, TEMPLATE_RESOURCE } from './data-source';
import {
  approvalStatusLabel,
  approvalStatusTone,
  filterTemplatesByChannel,
  MESSAGE_CHANNEL_OPTIONS,
  messageChannelLabel,
  requiresApproval,
  searchTemplates,
  TEMPLATE_FILTER_ALL,
} from '../_shared/messaging';
import type {
  MessageTemplate,
  MessageTemplateInput,
  TemplateChannelFilter,
} from '../_shared/messaging';
import { cssVar } from '@tds/ui';

const ENTITY_LABEL = '발송 템플릿';
const LIST_PATH = '/marketing/templates/alimtalk';

/** 이 select 가 그리는 option id 전체 — URL 문자열을 `as` 없이 좁히는 허용 목록이다 */
const TEMPLATE_CHANNEL_FILTER_VALUES: readonly TemplateChannelFilter[] = [
  TEMPLATE_FILTER_ALL,
  ...MESSAGE_CHANNEL_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_DEFAULTS = { channel: TEMPLATE_FILTER_ALL } as const;

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 5)' };

const bodyPreviewStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  display: 'block',
  maxWidth: 'calc(var(--tds-space-6) * 12)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const dateStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
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
  const { canCreate } = useRouteWritePermissions();
  // channel·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?channel=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const channel: TemplateChannelFilter = parseFilter(
    list.filters['channel'] ?? TEMPLATE_FILTER_ALL,
    TEMPLATE_CHANNEL_FILTER_VALUES,
    TEMPLATE_FILTER_ALL,
  );
  const { keyword } = list;

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
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="템플릿명·본문 검색"
          placeholder="템플릿명 · 본문 검색"
          // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={channel}
            onChange={(event) => list.setFilter('channel', event.target.value)}
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
      {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
          <Icon name="plus-circle" />
          템플릿 등록
        </Button>
      )}
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visibleItems}
      columns={COLUMNS}
      nameOf={nameOf}
      // 채널 필터가 가린 경우의 분기(hasActiveFilters)는 이 화면이 원래 갖고 있지 않다 —
      // STATE-05 의 미비점이지만 상태 배선 교체에서 화면 동작까지 바꾸지 않는다(별도 건).
      empty={{
        hasQuery: list.hasQuery,
        onClearSearch: list.clearSearch,
      }}
      selectAllLabelId="marketing-templates-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
