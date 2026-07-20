// EventListPage — 이벤트 목록 (라우트: /marketing/events)
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 기간·대상·혜택·상태 배지 + 삭제팝업.
// 관리자가 지정한 상태가 기간과 어긋나면 '기간상 XX' 힌트 배지로 알린다. 목록엔 이미지 열이 없다.
//
// [조회 상태의 소유자] phase·keyword 는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '진행' 중인 이벤트만 추려 하나를 열고 Back 하면 예전에는
// 필터 없는 전체 목록에 착지했다. 이제 그 조건이 URL 에 남아 복원되고, 링크로 그대로 공유된다.
// 검색은 IME 안전이다 (COMP-10) — '가정의달' 을 치는 도중 자모마다 조회가 나가지 않는다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate } from '../../../shared/format';
import { Button, Icon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { eventAdapter } from './data-source';
import { EVENT_FILTER_ALL, filterEvents, searchEvents } from './types';
import type { EventPhaseFilter, MarketingEvent, MarketingEventInput } from './types';
import {
  benefitTypeLabel,
  CAMPAIGN_PHASE_OPTIONS,
  campaignPhaseLabel,
  campaignPhaseTone,
  derivePhase,
} from '../_shared/campaign';
import { cssVar } from '@tds/ui';

const RESOURCE = 'marketing-events';
const ENTITY_LABEL = '이벤트';
const LIST_PATH = '/marketing/events';

/** 이 select 가 그리는 option id 전체 — URL 문자열을 `as` 없이 좁히는 허용 목록이다 */
const EVENT_PHASE_FILTER_VALUES: readonly EventPhaseFilter[] = [
  EVENT_FILTER_ALL,
  ...CAMPAIGN_PHASE_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_DEFAULTS = { phase: EVENT_FILTER_ALL } as const;

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

const periodStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

const nameOf = (item: MarketingEvent) => item.title;

function benefitText(item: MarketingEvent): string {
  if (item.benefitType === 'none') return benefitTypeLabel(item.benefitType);
  return `${benefitTypeLabel(item.benefitType)} · ${item.benefitDetail}`;
}

export default function EventListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();
  // phase·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?phase=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const filter: EventPhaseFilter = parseFilter(
    list.filters['phase'] ?? EVENT_FILTER_ALL,
    EVENT_PHASE_FILTER_VALUES,
    EVENT_FILTER_ALL,
  );
  const { keyword } = list;
  const today = formatDate(new Date());

  const controller = useCrudList<MarketingEvent, MarketingEventInput>({
    resource: RESOURCE,
    adapter: eventAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchEvents(filterEvents(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const columns: readonly CrudColumn<MarketingEvent>[] = [
    { header: '이벤트명', render: (item) => item.title },
    {
      header: '기간',
      nowrap: true,
      render: (item) => <span style={periodStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
    },
    { header: '대상', render: (item) => item.target },
    { header: '혜택', render: (item) => benefitText(item) },
    {
      header: '상태',
      nowrap: true,
      render: (item) => {
        const derived = derivePhase(item.startAt, item.endAt, today);
        return (
          <span style={statusCellStyle}>
            <StatusBadge
              tone={campaignPhaseTone(item.phase)}
              label={campaignPhaseLabel(item.phase)}
            />
            {derived !== item.phase && (
              <StatusBadge tone="warning" label={`기간상 ${campaignPhaseLabel(derived)}`} />
            )}
          </span>
        );
      },
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="이벤트명·대상 검색"
          placeholder="이벤트명 · 대상 검색"
          // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('phase', event.target.value)}
            aria-label="상태로 거르기"
          >
            <option value={EVENT_FILTER_ALL}>전체 상태</option>
            {CAMPAIGN_PHASE_OPTIONS.map((option) => (
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
          이벤트 등록
        </Button>
      )}
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visible}
      columns={columns}
      nameOf={nameOf}
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="marketing-events-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
