// MessageTemplateListPage — 메시지 템플릿 목록 (라우트: /marketing/templates)
//
// 열: 템플릿명 · 종류 · 상태 · 발신 프로필 · 최종 수정. 데이터·선택·삭제 배선은 공용 CRUD
// 프레임워크(useCrudList + CrudListShell), 조회 상태(검색·필터)는 URL 이 소유한다(useListState · IA-13).
//
// [행을 누르면 어디로 가나] 상세다(수정이 아니다). 이 도메인에서 가장 흔한 조작은 '켜고 끄기' 이고
// 그것은 상세의 헤더에 있다 — 편집기로 곧장 보내면 켜기만 하려던 운영자가 매번 편집기를 열고 나온다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime } from '../../../shared/format';
import { Button, Icon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { NewTemplateKindDialog } from './components/NewTemplateKindDialog';
import {
  MESSAGE_TEMPLATE_RESOURCE,
  messageTemplateAdapter,
  messageTemplateDetailPath,
  messageTemplateNewPath,
} from './data-source';
import { senderProfileName } from './store';
import type { MessageTemplateDraft } from './store';
import { statusToneOf } from './status';
import { TEMPLATE_KIND_LABEL, TEMPLATE_STATUS_LABEL, templateKindOf } from './types';
import type { MessageTemplate, TemplateKind, TemplateStatus } from './types';
import { cssVar } from '@tds/ui';

const ENTITY_LABEL = '메시지 템플릿';

/** '전체' 를 뜻하는 필터 값 — 기본값과 같으면 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_ALL = 'all';
type StatusFilter = typeof FILTER_ALL | TemplateStatus;
type KindFilter = typeof FILTER_ALL | TemplateKind;

const STATUS_FILTER_VALUES: readonly StatusFilter[] = [FILTER_ALL, 'draft', 'active', 'inactive'];
const KIND_FILTER_VALUES: readonly KindFilter[] = [
  FILTER_ALL,
  'text',
  'email',
  'alimtalk',
  'brandmessage',
];

/** 종류 필터의 선택지 — 위 허용 목록에서 '전체' 만 뺀 것이라 둘이 어긋날 수 없다 */
const KIND_OPTIONS: readonly TemplateKind[] = ['text', 'email', 'alimtalk', 'brandmessage'];

const FILTER_DEFAULTS = { status: FILTER_ALL, kind: FILTER_ALL } as const;

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

/** '전체 종류'·'전체 상태' 가 잘리지 않는 폭 (chevron 자리까지 포함한다) */
const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 6)' };

const mutedCellStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  whiteSpace: 'nowrap',
};

const dateStyle: CSSProperties = {
  ...mutedCellStyle,
  fontVariantNumeric: 'tabular-nums',
};

const nameOf = (item: MessageTemplate) => item.name;

const COLUMNS: readonly CrudColumn<MessageTemplate>[] = [
  { header: '템플릿명', render: (item) => item.name },
  {
    header: '종류',
    nowrap: true,
    render: (item) => (
      <StatusBadge tone="neutral" label={TEMPLATE_KIND_LABEL[templateKindOf(item)]} />
    ),
  },
  {
    header: '상태',
    nowrap: true,
    render: (item) => (
      <StatusBadge tone={statusToneOf(item.status)} label={TEMPLATE_STATUS_LABEL[item.status]} />
    ),
  },
  {
    header: '발신 프로필',
    render: (item) => <span style={mutedCellStyle}>{senderProfileName(item.senderProfileId)}</span>,
  },
  {
    header: '최종 수정',
    nowrap: true,
    render: (item) => (
      <span style={dateStyle}>{`${formatDateTime(item.lastEditedAt)} · ${item.lastEditedBy}`}</span>
    ),
  },
];

/**
 * 검색이 훑을 '내용' — 종류마다 그것이 사는 자리가 다르다.
 *
 * [왜 switch 인가] 종류가 넷이 됐다. 삼항으로 늘어놓으면 다섯 번째가 생겼을 때 조용히 마지막
 * 갈래로 흘러가 **검색되지 않는 종류**가 된다 — 화면을 봐서는 알 수 없는 종류의 버그다.
 * switch 는 그때 컴파일 오류로 빠진 자리를 알려 준다.
 */
function searchableContentOf(template: MessageTemplate): string {
  const content = template.content;
  switch (content.kind) {
    case 'text':
      return content.body;
    case 'email':
      return content.subject;
    case 'alimtalk':
      // 강조 제목도 함께 훑는다 — 운영자가 기억하는 문구가 본문이 아니라 제목일 때가 잦다
      return `${content.emphasisTitle} ${content.body}`;
    case 'brandmessage':
      return content.body;
  }
}

/** 템플릿명 · 내용으로 찾는다 */
function searchTemplates(
  list: readonly MessageTemplate[],
  keyword: string,
): readonly MessageTemplate[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (template) =>
      template.name.toLowerCase().includes(needle) ||
      searchableContentOf(template).toLowerCase().includes(needle) ||
      // 종류 라벨도 건초더미에 넣는다 — '친구톡' 으로 찾는 사람을 빈 화면으로 보내지 않기 위해서다.
      // 코드상 종류는 brandmessage 지만 라벨이 '브랜드 메시지 (구 친구톡)' 이라, 라벨을 훑으면
      // 옛 이름으로도 걸린다. '친구톡' 을 여기 문자열로 박지 않는 이유가 그것이다 — 옛 이름은
      // 라벨 한 곳에만 있어야 카카오가 그 낱말을 완전히 거둘 때 한 번에 지워진다.
      // 목록 배지가 보여주는 것과 **같은** 표를 쓴다(위 TEMPLATE_KIND_LABEL) — 보이는 말로
      // 검색이 되어야 하고, 두 표를 쓰면 배지엔 있는데 검색은 안 되는 상태가 생긴다.
      TEMPLATE_KIND_LABEL[templateKindOf(template)].toLowerCase().includes(needle),
  );
}

export default function MessageTemplateListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();
  const [picking, setPicking] = useState(false);

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const status = parseFilter(
    list.filters['status'] ?? FILTER_ALL,
    STATUS_FILTER_VALUES,
    FILTER_ALL,
  );
  const kind = parseFilter(list.filters['kind'] ?? FILTER_ALL, KIND_FILTER_VALUES, FILTER_ALL);
  const { keyword } = list;

  const controller = useCrudList<MessageTemplate, MessageTemplateDraft>({
    resource: MESSAGE_TEMPLATE_RESOURCE,
    adapter: messageTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  useEffect(() => {
    clear();
  }, [status, kind, keyword, clear]);

  const visibleItems = useMemo(() => {
    const byStatus =
      status === FILTER_ALL
        ? controller.items
        : controller.items.filter((item) => item.status === status);
    const byKind =
      kind === FILTER_ALL ? byStatus : byStatus.filter((item) => templateKindOf(item) === kind);
    return searchTemplates(byKind, keyword);
  }, [controller.items, status, kind, keyword]);

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="템플릿명·내용 검색"
          placeholder="템플릿명 · 내용 검색"
          // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={kind}
            onChange={(event) => list.setFilter('kind', event.target.value)}
            aria-label="종류로 거르기"
          >
            <option value={FILTER_ALL}>전체 종류</option>
            {KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {TEMPLATE_KIND_LABEL[kind]}
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
            <option value={FILTER_ALL}>전체 상태</option>
            <option value="draft">{TEMPLATE_STATUS_LABEL.draft}</option>
            <option value="active">{TEMPLATE_STATUS_LABEL.active}</option>
            <option value="inactive">{TEMPLATE_STATUS_LABEL.inactive}</option>
          </SelectField>
        </span>
      </div>
      {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03).
          이 화면의 CTA 는 폼 이동이 아니라 종류 선택 팝업을 여는데, 가려야 하는 이유는 같다 —
          팝업에서 종류를 고르면 곧바로 편집기(등록)로 들어간다. */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={() => setPicking(true)}>
          <Icon name="plus-circle" />새 템플릿
        </Button>
      )}
    </div>
  );

  return (
    <>
      <CrudListShell
        entityLabel={ENTITY_LABEL}
        controller={controller}
        visibleItems={visibleItems}
        columns={COLUMNS}
        nameOf={nameOf}
        empty={{
          hasQuery: list.hasQuery,
          onClearSearch: list.clearSearch,
          hasActiveFilters: list.hasActiveFilters,
          onResetFilters: list.resetFilters,
        }}
        selectAllLabelId="marketing-message-templates-select-all"
        toolbar={toolbar}
        onEdit={(item) => navigate(messageTemplateDetailPath(item.id))}
      />

      {picking && (
        <NewTemplateKindDialog
          onPick={(picked) => navigate(messageTemplateNewPath(picked))}
          onCancel={() => setPicking(false)}
        />
      )}
    </>
  );
}
