// ReturnsListPage — 교환/반품 요청 목록 (라우트: /products/returns)
//
// 요청은 감사 성격이라 삭제·일괄작업이 없다(고객이 만들고 관리자는 처리만 한다). 그래서 CrudListShell
// 대신 읽기 전용 표를 쓴다: 유형·상태 필터 + 검색 + 행 → 상세(상태 처리). 데이터는 프레임워크
// useCrudListQuery(읽기)로 배선한다. 목록엔 이미지 열이 없다.
//
// 조회 상태(유형·상태·검색어)의 단일 원천은 URL 이다(IA-13) — 필터를 건 목록 링크를 공유할 수 있고,
// 상세에서 Back 하면 그 조건이 그대로 복원된다. 검색 입력은 IME 조합을 존중한다(COMP-10).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Empty,
  hintStyle,
  SearchField,
  SelectField,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { parseFilter, useCrudListQuery, useListState } from '../../../shared/crud';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import { returnAdapter } from './data-source';
import {
  filterByStatus,
  kindLabel,
  KIND_OPTIONS,
  kindTone,
  optionLabel,
  searchReturns,
  STATUS_FILTER_ALL,
  STATUS_FILTER_OPTIONS,
  statusMeta,
} from './types';
import type { ReturnKind, StatusFilter } from './types';

const RESOURCE = 'returns';
const LIST_PATH = '/products/returns';
const ENTITY_LABEL = '교환/반품 요청';

const KIND_FILTER_ALL = 'all';
type KindFilter = typeof KIND_FILTER_ALL | ReturnKind;
const KIND_FILTER_VALUES: readonly KindFilter[] = [
  KIND_FILTER_ALL,
  ...KIND_OPTIONS.map((option) => option.id),
];
const STATUS_FILTER_VALUES: readonly StatusFilter[] = STATUS_FILTER_OPTIONS.map(
  (option) => option.id,
);

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_DEFAULTS = { kind: KIND_FILTER_ALL, status: STATUS_FILTER_ALL } as const;

/** skeleton 은 실제 표와 같은 모양이어야 한다 — 열 수를 손으로 세지 않는다 (COMP-06) */
const COLUMNS: readonly string[] = [
  '접수번호',
  '상품',
  '옵션',
  '신청자',
  '유형',
  '사유',
  '접수일',
  '상태',
];
const SKELETON_ROWS = 5;

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = {
  width: 'calc(var(--tds-space-6) * 5)',
};

const orderCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
};

export default function ReturnsListPage() {
  const { rowNavProps } = useRowNavigation();
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const kind = parseFilter(
    list.filters['kind'] ?? KIND_FILTER_ALL,
    KIND_FILTER_VALUES,
    KIND_FILTER_ALL,
  );
  const status = parseFilter(
    list.filters['status'] ?? STATUS_FILTER_ALL,
    STATUS_FILTER_VALUES,
    STATUS_FILTER_ALL,
  );

  const { data, isFetching, error, refetch } = useCrudListQuery(RESOURCE, returnAdapter);
  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  const firstLoading = isFetching && data === undefined;

  const visible = useMemo(() => {
    const items = data ?? [];
    const byKind = kind === KIND_FILTER_ALL ? items : items.filter((item) => item.kind === kind);
    return searchReturns(filterByStatus(byKind, status), list.keyword);
  }, [data, kind, status, list.keyword]);

  if (error !== null) {
    return (
      <div style={columnStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>교환/반품 요청을 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={columnStyle}>
      <div style={toolbarStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="주문번호·상품·신청자 검색"
          placeholder="주문번호 · 상품 · 신청자 검색"
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={kind}
            onChange={(event) => list.setFilter('kind', event.target.value)}
            aria-label="유형으로 거르기"
          >
            <option value={KIND_FILTER_ALL}>전체 유형</option>
            {KIND_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
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
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>

      <p style={hintStyle}>
        {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}
      </p>

      <table style={tableStyle} aria-busy={isFetching}>
        <caption style={visuallyHiddenStyle}>
          교환/반품 요청 목록 — 각 행에서 상세로 이동해 상태를 처리할 수 있습니다.
        </caption>
        <thead>
          <tr>
            <SeqHeaderCell />
            {COLUMNS.map((header) => (
              <th key={header} scope="col" style={thStyle}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {firstLoading ? (
            Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <tr key={`skeleton-${String(index)}`}>
                {Array.from({ length: COLUMNS.length + 1 }, (_, cell) => (
                  <td key={`cell-${String(cell)}`} style={tdStyle}>
                    <span className="tds-ui-skeleton" aria-hidden="true" />
                  </td>
                ))}
              </tr>
            ))
          ) : visible.length === 0 ? (
            <tr>
              {/* [STATE-05] '없다'는 세 가지다 — 아직 없는 것, 검색이 안 맞는 것, 필터가 가린 것.
                  각기 복구 수단이 다르므로 Empty 가 맥락을 받아 분기한다. */}
              <td colSpan={COLUMNS.length + 1} style={emptyCellStyle}>
                <Empty
                  label={ENTITY_LABEL}
                  createVerb="접수"
                  hasQuery={list.hasQuery}
                  hasActiveFilters={list.hasActiveFilters}
                  onClearSearch={list.clearSearch}
                  onResetFilters={list.resetFilters}
                />
              </td>
            </tr>
          ) : (
            visible.map((item, index) => {
              const meta = statusMeta(item.status);
              return (
                <tr
                  key={item.id}
                  className="tds-ui-row"
                  {...rowNavProps(`${LIST_PATH}/${item.id}`)}
                >
                  <SeqCell seq={index + 1} />
                  <td style={orderCellStyle}>
                    {/* [A11Y-08] 행 클릭은 마우스 전용이다 — 키보드로도 같은 곳에 닿는 링크를 행 안에 둔다. */}
                    <Link
                      to={`${LIST_PATH}/${item.id}`}
                      className="tds-ui-link tds-ui-focusable"
                      aria-label={`${item.orderNo} 상세`}
                    >
                      {item.orderNo}
                    </Link>
                  </td>
                  <td style={tdStyle}>{item.productName}</td>
                  <td style={tdStyle}>{optionLabel(item.optionValues)}</td>
                  <td style={tdStyle}>{item.customer}</td>
                  <td style={tdStyle}>
                    <StatusBadge tone={kindTone(item.kind)} label={kindLabel(item.kind)} />
                  </td>
                  <td style={tdStyle}>{item.reason}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{item.requestedAt}</td>
                  <td style={tdStyle}>
                    <StatusBadge tone={meta.tone} label={meta.label} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
