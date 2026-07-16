// SmsTemplateListPage — SMS 템플릿 목록 (라우트: /notifications/sms-templates)
//
// [마케팅 '발송 템플릿 관리'와 무엇이 다른가] 저긴 채널(SMS/이메일/알림톡)로 나뉜 캠페인 문구 창고이고
// 알림톡 승인상태가 핵심 축이다. 여긴 **이벤트 트리거에 묶인 거래 문구**다 — 목록의 첫 열이 '이벤트'이고
// 좌측 필터가 주문/배송/계정/보안이다. 승인상태 열이 없다(정보성 알림은 사전 심사 대상이 아니다).
// 바이트/유형(SMS·LMS) 열을 두어 건당 비용이 바뀌는 90byte 경계를 목록에서 바로 본다.
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { smsTemplateAdapter, SMS_TEMPLATE_RESOURCE } from './data-source';
import { CategoryFilter } from '../_shared/CategoryFilter';
import { TransactionalNotice } from '../_shared/TransactionalNotice';
import { triggerColumn } from '../_shared/triggerColumn';
import {
  ellipsisCellStyle,
  listLayoutStyle,
  numericMutedStyle,
  oneLinePreview,
  pageStyle,
  toolbarFiltersStyle,
  toolbarStyle,
} from '../_shared/styles';
import {
  byteLengthOf,
  CATEGORY_PARAM,
  classifySms,
  countByCategory,
  filterByCategory,
  FILTER_ALL,
  parseCategoryFilter,
  searchTemplates,
  smsKindLabel,
} from '../_shared/notification';
import type { SmsTemplate, SmsTemplateInput } from '../_shared/notification';

const ENTITY_LABEL = 'SMS 템플릿';
const LIST_PATH = '/notifications/sms-templates';

const nameOf = (item: SmsTemplate) => item.name;

const COLUMNS: readonly CrudColumn<SmsTemplate>[] = [
  triggerColumn<SmsTemplate>(),
  { header: '템플릿명', render: (item) => item.name },
  {
    header: '본문',
    render: (item) => <span style={ellipsisCellStyle}>{oneLinePreview(item.body, 50)}</span>,
  },
  {
    header: '유형',
    nowrap: true,
    render: (item) => {
      const kind = classifySms(byteLengthOf(item.body));
      // LMS 는 건당 단가가 오르는 경계라 목록에서 바로 눈에 띄어야 한다.
      return (
        <StatusBadge tone={kind === 'lms' ? 'warning' : 'neutral'} label={smsKindLabel(kind)} />
      );
    },
  },
  {
    header: '바이트',
    numeric: true,
    render: (item) => (
      <span style={numericMutedStyle}>{formatNumber(byteLengthOf(item.body))}</span>
    ),
  },
  {
    header: '수정일시',
    nowrap: true,
    render: (item) => <span style={numericMutedStyle}>{formatDateTime(item.updatedAt)}</span>,
  },
];

export default function SmsTemplateListPage() {
  const navigate = useNavigate();
  // IA-13 + COMP-10 — 조회 상태의 원천은 URL, IME 조합 판정은 공유 훅 소유 (사본 수렴됨).
  const list = useListState({ filterDefaults: { [CATEGORY_PARAM]: FILTER_ALL } });
  const { keyword, hasQuery, hasActiveFilters } = list;
  const category = parseCategoryFilter(list.filters[CATEGORY_PARAM] ?? null);

  const controller = useCrudList<SmsTemplate, SmsTemplateInput>({
    resource: SMS_TEMPLATE_RESOURCE,
    adapter: smsTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  // STATE-04 — 필터/검색이 바뀌면 이제 숨겨진 행의 선택을 해제한다.
  useEffect(() => {
    clear();
  }, [category, keyword, clear]);

  const counts = useMemo(() => countByCategory(controller.items), [controller.items]);
  const visibleItems = useMemo(
    () => searchTemplates(filterByCategory(controller.items, category), keyword),
    [controller.items, category, keyword],
  );

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={toolbarFiltersStyle}>
        {/* COMP-10 — 조합(IME) 중에는 커밋하지 않고, 조합이 끝난 뒤 debounce 로 한 번만 커밋한다.
            SearchField 는 계약 밖 native prop 을 <input> 으로 흘려보내므로 composition 핸들러가 그대로 붙는다. */}
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="템플릿명·이벤트 검색"
          placeholder="템플릿명 · 이벤트 검색"
          {...list.searchInputProps}
        />
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        SMS 템플릿 등록
      </Button>
    </div>
  );

  return (
    <div style={pageStyle}>
      <TransactionalNotice>주문·배송·계정·보안 SMS 문구를 관리합니다.</TransactionalNotice>

      <div style={listLayoutStyle}>
        <CategoryFilter
          filter={category}
          counts={counts}
          onChange={(next) => list.setFilter(CATEGORY_PARAM, next)}
        />

        {/* STATE-05 — 왜 비었는지에 따라 문구·복구 수단이 갈린다. 조사(이/가)는 Empty 가 고른다. */}
        <CrudListShell
          entityLabel={ENTITY_LABEL}
          controller={controller}
          visibleItems={visibleItems}
          columns={COLUMNS}
          nameOf={nameOf}
          selectAllLabelId="notification-sms-templates-select-all"
          empty={{
            hasQuery,
            hasActiveFilters,
            onClearSearch: list.clearSearch,
            onResetFilters: list.resetFilters,
            createAction: (
              <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
                <PlusCircleIcon />
                SMS 템플릿 등록
              </Button>
            ),
          }}
          toolbar={toolbar}
          onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
        />
      </div>
    </div>
  );
}
