// EmailTemplateListPage — 이메일 템플릿 목록 (라우트: /notifications/email-templates)
//
// [마케팅 '발송 템플릿 관리'와 무엇이 다른가] 저긴 채널로 나뉜 캠페인 문구 창고이고 알림톡 승인상태가
// 핵심 축이다. 여긴 **이벤트 트리거에 묶인 거래 문구**다 — 첫 열이 '이벤트'이고 좌측 필터가 주문/배송/
// 계정/보안이다. 승인상태 열이 없다(정보성 알림은 사전 심사 대상이 아니다).
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime } from '../../../shared/format';
import { Button, FilterPanel, PlusCircleIcon, SearchField } from '../../../shared/ui';
import { CrudListShell, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { emailTemplateAdapter, EMAIL_TEMPLATE_RESOURCE } from './data-source';
import { TransactionalNotice } from '../_shared/TransactionalNotice';
import { triggerColumn } from '../_shared/triggerColumn';
import {
  ellipsisCellStyle,
  listLayoutStyle,
  numericMutedStyle,
  pageStyle,
  toolbarFiltersStyle,
  toolbarStyle,
} from '../_shared/styles';
import {
  CATEGORY_PARAM,
  countByCategory,
  filterByCategory,
  FILTER_ALL,
  NOTIFICATION_CATEGORY_OPTIONS,
  parseCategoryFilter,
  searchTemplates,
} from '../_shared/notification';
import type { EmailTemplate, EmailTemplateInput } from '../_shared/notification';

const ENTITY_LABEL = '이메일 템플릿';
const LIST_PATH = '/notifications/email-templates';

const nameOf = (item: EmailTemplate) => item.name;

const COLUMNS: readonly CrudColumn<EmailTemplate>[] = [
  triggerColumn<EmailTemplate>(),
  { header: '템플릿명', render: (item) => item.name },
  { header: '제목', render: (item) => <span style={ellipsisCellStyle}>{item.subject}</span> },
  {
    header: '수정일시',
    nowrap: true,
    render: (item) => <span style={numericMutedStyle}>{formatDateTime(item.updatedAt)}</span>,
  },
];

export default function EmailTemplateListPage() {
  const navigate = useNavigate();
  // IA-13 + COMP-10 — 조회 상태(분류·검색어)의 원천은 URL 이고, 검색창의 IME 조합 판정은
  // 공유 훅이 소유한다. 이 섹션이 갖고 있던 사본(useListQueryState)은 여기로 수렴됐다.
  const list = useListState({ filterDefaults: { [CATEGORY_PARAM]: FILTER_ALL } });
  const { keyword, hasQuery, hasActiveFilters } = list;
  const category = parseCategoryFilter(list.filters[CATEGORY_PARAM] ?? null);

  const controller = useCrudList<EmailTemplate, EmailTemplateInput>({
    resource: EMAIL_TEMPLATE_RESOURCE,
    adapter: emailTemplateAdapter,
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
            판정은 공유 훅(useDebouncedSearch)이 한다 — 이 화면은 핸들러를 스프레드하기만 한다. */}
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
        이메일 템플릿 등록
      </Button>
    </div>
  );

  return (
    <div style={pageStyle}>
      <TransactionalNotice>주문·배송·계정·보안 이메일 문구를 관리합니다.</TransactionalNotice>

      <div style={listLayoutStyle}>
        <FilterPanel
          navLabel="이벤트 분류 필터"
          heading="이벤트 분류"
          options={NOTIFICATION_CATEGORY_OPTIONS}
          value={category}
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
          selectAllLabelId="notification-email-templates-select-all"
          empty={{
            hasQuery,
            hasActiveFilters,
            onClearSearch: list.clearSearch,
            onResetFilters: list.resetFilters,
            createAction: (
              <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
                <PlusCircleIcon />
                이메일 템플릿 등록
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
