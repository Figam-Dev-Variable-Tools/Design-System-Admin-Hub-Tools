// AccountListPage — 거래처 목록 (라우트: /sales/accounts)
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 거래유형 필터 + 검색 + 신용등급 배지 +
// 거래 상태 인라인 토글 + 삭제팝업을 얹는다. 목록엔 이미지 열이 없다(상세/폼에서 다룬다).
//
// [조회 상태의 소유자] 거래유형·검색어는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '세금계산서 발행처만' 으로 걸러 놓고 거래처 상세로 갔다
// Back 하면 그 필터가 그대로 살아 있고, 그 URL 을 영업팀에 그대로 붙여 넣을 수 있다.
// 검색은 IME 안전이다 (COMP-10) — '㈜한빛' 을 치는 도중 자모마다 조회가 나가지 않는다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Icon,
  SearchField,
  SelectField,
  StatusBadge,
  ToggleSwitch,
} from '../../../shared/ui';
import {
  CrudListShell,
  DetailCellLink,
  parseFilter,
  useCrudList,
  useCrudRowUpdate,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { accountAdapter } from './data-source';
import {
  creditGradeLabel,
  creditGradeTone,
  filterAccounts,
  primaryContact,
  searchAccounts,
  toAccountInput,
  TRADE_FILTER_ALL,
  tradeTypeLabel,
  tradeTypeTone,
  TRADE_TYPE_OPTIONS,
} from './types';
import type { Account, AccountInput, TradeFilter } from './types';
import { objectParticle } from '../../../shared/format';
import { cssVar } from '@tds/ui';

const RESOURCE = 'sales-accounts';
const ENTITY_LABEL = '거래처';
const LIST_PATH = '/sales/accounts';
const TRADE_FILTER_VALUES: readonly TradeFilter[] = [
  TRADE_FILTER_ALL,
  ...TRADE_TYPE_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13) */
const FILTER_DEFAULTS = { trade: TRADE_FILTER_ALL } as const;

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

const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 5)`,
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

const nameOf = (item: Account) => item.name;

export default function AccountListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  // 거래유형·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?trade=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const filter: TradeFilter = parseFilter(
    list.filters['trade'] ?? TRADE_FILTER_ALL,
    TRADE_FILTER_VALUES,
    TRADE_FILTER_ALL,
  );
  const { keyword } = list;

  const controller = useCrudList<Account, AccountInput>({
    resource: RESOURCE,
    adapter: accountAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;
  const toggle = useCrudRowUpdate<Account, AccountInput>(RESOURCE, accountAdapter);

  // 보고 있는 행 집합이 바뀌면 선택은 무의미해진다 — 화면에 없는 행이 선택된 채
  // '선택 3건 삭제' 가 되지 않게 한다. 선택은 useCrudList(=CrudListShell)가 쥐고 있으므로
  // 조건 변화를 여기서 그 선택에 이어 준다 (STATE-04-b)
  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchAccounts(filterAccounts(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const columns: readonly CrudColumn<Account>[] = [
    {
      header: '사업자명',
      // 행 클릭(마우스)의 **키보드 짝** — 이 링크가 없으면 Tab 으로 상세에 닿을 길이 사라진다
      // (DetailCellLink 머리말). 경로는 rowTarget 과 같은 값을 쓴다.
      render: (item) => <DetailCellLink to={`${LIST_PATH}/${item.id}`}>{item.name}</DetailCellLink>,
    },
    { header: '대표자', nowrap: true, render: (item) => item.ceoName },
    {
      header: '거래유형',
      nowrap: true,
      render: (item) => (
        <StatusBadge tone={tradeTypeTone(item.tradeType)} label={tradeTypeLabel(item.tradeType)} />
      ),
    },
    {
      header: '신용등급',
      nowrap: true,
      render: (item) => (
        <StatusBadge
          tone={creditGradeTone(item.creditGrade)}
          label={creditGradeLabel(item.creditGrade)}
        />
      ),
    },
    {
      header: '대표담당',
      render: (item) => primaryContact(item)?.name ?? '—',
    },
    {
      header: '최근거래',
      nowrap: true,
      render: (item) => (
        <span style={mutedStyle}>{item.lastTradeAt === '' ? '—' : item.lastTradeAt}</span>
      ),
    },
    {
      header: '상태',
      nowrap: true,
      render: (item) => (
        <ToggleSwitch
          checked={item.active}
          busy={toggle.pendingId === item.id}
          onChange={(next) =>
            toggle.run(
              item.id,
              { ...toAccountInput(item), active: next },
              {
                success: next
                  ? `'${item.name}'${objectParticle(item.name)} 거래중으로 바꿨습니다.`
                  : `'${item.name}' 거래를 중지했습니다.`,
              },
            )
          }
          label={`${item.name} 거래 여부`}
          onLabel="거래중"
          offLabel="중지"
        />
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="사업자명·사업자번호·대표자 검색"
          placeholder="사업자명 · 사업자번호 · 대표자 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '㈜한빛' 을 치는 도중 '㈜한ㅂ' 로 검색되지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('trade', event.target.value)}
            aria-label="거래유형으로 거르기"
          >
            <option value={TRADE_FILTER_ALL}>전체 유형</option>
            {TRADE_TYPE_OPTIONS.map((option) => (
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
          거래처 등록
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
      // 왜 비었는지에 따라 복구 수단이 다르다 — 검색 지우기 / 필터 초기화 (STATE-05)
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="account-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
      /* [행 클릭은 상세로 간다] 예전에는 수정 폼이었다 — 담당자·여신한도·결제조건을 **보기만**
         하려는 조회 전용 역할이 편집 화면을 열어야 했다는 뜻이다. 수정은 연필 액션의 몫으로
         남기고, 목적지를 이름으로 밝혀 표의 캡션도 '상세 화면으로 이동합니다' 로 따라오게 한다. */
      rowTarget={{ kind: 'detail', href: (item) => `${LIST_PATH}/${item.id}` }}
    />
  );
}
