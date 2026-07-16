// PromotionListPage — 프로모션 목록 (라우트: /marketing/promotions) · A41 소유
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 기간·대상·할인·상태 배지 + 삭제팝업.
// 지정 상태가 기간과 어긋나면 '기간상 XX' 힌트 배지로 알린다. 목록엔 이미지 열이 없다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { promotionAdapter } from './data-source';
import { discountLabel, filterPromotions, PROMOTION_FILTER_ALL, searchPromotions } from './types';
import type { Promotion, PromotionInput, PromotionPhaseFilter } from './types';
import {
  CAMPAIGN_PHASE_OPTIONS,
  campaignPhaseLabel,
  campaignPhaseTone,
  derivePhase,
  parseCampaignPhase,
} from '../_shared/campaign';

const RESOURCE = 'marketing-promotions';
const ENTITY_LABEL = '프로모션';
const LIST_PATH = '/marketing/promotions';

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

const periodStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const numStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  flexWrap: 'wrap',
};

const nameOf = (item: Promotion) => item.title;

export default function PromotionListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PromotionPhaseFilter>(PROMOTION_FILTER_ALL);
  const [keyword, setKeyword] = useState('');
  const today = formatDate(new Date());

  const controller = useCrudList<Promotion, PromotionInput>({
    resource: RESOURCE,
    adapter: promotionAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchPromotions(filterPromotions(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const columns: readonly CrudColumn<Promotion>[] = [
    { header: '프로모션명', render: (item) => item.title },
    {
      header: '기간',
      nowrap: true,
      render: (item) => <span style={periodStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
    },
    { header: '대상', render: (item) => item.target },
    {
      header: '할인',
      numeric: true,
      render: (item) => (
        <span style={numStyle}>{discountLabel(item.discountType, item.discountValue)}</span>
      ),
    },
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
          value={keyword}
          onChange={setKeyword}
          label="프로모션명·대상 검색"
          placeholder="프로모션명 · 대상 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) =>
              setFilter(parseCampaignPhase(event.target.value) ?? PROMOTION_FILTER_ALL)
            }
            aria-label="상태로 거르기"
          >
            <option value={PROMOTION_FILTER_ALL}>전체 상태</option>
            {CAMPAIGN_PHASE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        프로모션 등록
      </Button>
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
        hasQuery: keyword !== '',
        hasActiveFilters: filter !== PROMOTION_FILTER_ALL,
        onClearSearch: () => setKeyword(''),
        onResetFilters: () => setFilter(PROMOTION_FILTER_ALL),
      }}
      selectAllLabelId="marketing-promotions-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
