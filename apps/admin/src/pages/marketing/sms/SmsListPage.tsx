// SmsListPage — SMS 발송 목록 (라우트: /marketing/sms)
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 유형(SMS/LMS/MMS)·대상수·발송상태·
// 성공률 열을 얹는다. 목록엔 이미지 열이 없다.
//
// [조회 상태의 소유자] status·keyword 는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '예약' 건만 골라 하나를 열고 Back 하면 예전에는 필터 없는
// 1페이지에 착지해 셋업이 날아갔다. 이제 그 조건이 URL 에 남아 복원되고, 링크로 공유된다.
// 검색은 IME 안전이다 (COMP-10) — '추석안내' 를 치는 도중 자모마다 조회가 나가지 않는다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../shared/format';
import { Button, Icon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { smsAdapter } from './data-source';
import { filterSmsCampaigns, searchSmsCampaigns, SMS_FILTER_ALL } from './types';
import type { SmsCampaign, SmsCampaignInput, SmsStatusFilter } from './types';
import {
  SEND_STATUS_OPTIONS,
  sendActionsFor,
  sendStatusLabel,
  sendStatusTone,
  smsKindLabel,
  successRate,
} from '../_shared/messaging';
import { cssVar } from '@tds/ui';

const RESOURCE = 'marketing-sms';
const ENTITY_LABEL = 'SMS 발송';
const LIST_PATH = '/marketing/sms';

/** 이 select 가 그리는 option id 전체 — URL 문자열을 `as` 없이 좁히는 허용 목록이다 */
const SMS_STATUS_FILTER_VALUES: readonly SmsStatusFilter[] = [
  SMS_FILTER_ALL,
  ...SEND_STATUS_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_DEFAULTS = { status: SMS_FILTER_ALL } as const;

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

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const numStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const nameOf = (item: SmsCampaign) => item.name;

const COLUMNS: readonly CrudColumn<SmsCampaign>[] = [
  { header: '발송명', render: (item) => item.name },
  {
    header: '유형',
    nowrap: true,
    render: (item) => <StatusBadge tone="info" label={smsKindLabel(item.kind)} />,
  },
  {
    header: '대상수',
    numeric: true,
    render: (item) => <span style={numStyle}>{`${formatNumber(item.recipientCount)}명`}</span>,
  },
  {
    header: '예약/발송상태',
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
    header: '성공률',
    numeric: true,
    render: (item) =>
      item.status === 'sent' ? (
        <span style={numStyle}>{`${String(successRate(item.stats))}%`}</span>
      ) : (
        <span style={mutedStyle}>—</span>
      ),
  },
];

export default function SmsListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();
  // status·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const filter: SmsStatusFilter = parseFilter(
    list.filters['status'] ?? SMS_FILTER_ALL,
    SMS_STATUS_FILTER_VALUES,
    SMS_FILTER_ALL,
  );
  const { keyword } = list;

  const controller = useCrudList<SmsCampaign, SmsCampaignInput>({
    resource: RESOURCE,
    adapter: smsAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchSmsCampaigns(filterSmsCampaigns(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="발송명·발신번호 검색"
          placeholder="발송명 · 발신번호 검색"
          // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('status', event.target.value)}
            aria-label="발송상태로 거르기"
          >
            <option value={SMS_FILTER_ALL}>전체 상태</option>
            {SEND_STATUS_OPTIONS.map((option) => (
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
          SMS 발송 등록
        </Button>
      )}
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
      selectAllLabelId="marketing-sms-select-all"
      toolbar={toolbar}
      /* 발송 상태가 편집 진입을 가른다 — 권한(canUpdate)과는 다른 축이다. 발송중·발송완료·취소
         캠페인을 열면 상태가 조용히 '초안'으로 강등돼 발송 이력이 뒤집혔다(FS-034 §7 #11).
         행 클릭·연필이 CrudTable 한 곳에서 이 콜백으로 모이므로 여기서 한 번 막으면 둘 다 막힌다.
         어댑터도 같은 판정으로 422 를 던진다(data-source.ts) — 주소창 직접 입력이 이 게이팅을
         지나치기 때문이다. 화면은 UX, 어댑터가 정본이다. */
      onEdit={(item) => {
        if (!sendActionsFor(item.status).canEdit) return;
        navigate(`${LIST_PATH}/${item.id}/edit`);
      }}
      /* 발송이 끝난 항목은 행 클릭이 **조용히 무반응** 이었다 — 커서는 pointer 이고
         캡션은 이동을 약속하는데 눌러도 아무 일이 없었다. disabled 로 밝히면
         표가 onActivate 자체를 걸지 않아 어포던스가 사라진다. */
      rowTarget={{
        kind: 'edit',
        href: (item) => `${LIST_PATH}/${item.id}/edit`,
        disabled: (item) =>
          sendActionsFor(item.status).canEdit ? false : '발송이 끝나 수정할 수 없어요',
      }}
    />
  );
}
