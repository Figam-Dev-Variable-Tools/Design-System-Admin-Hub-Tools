// ReturnsListPage — 교환/반품 요청 목록 (라우트: /products/returns) · A41 소유
//
// 요청은 감사 성격이라 삭제·일괄작업이 없다(고객이 만들고 관리자는 처리만 한다). 그래서 CrudListShell
// 대신 읽기 전용 표를 쓴다: 유형·상태 필터 + 검색 + 행 → 상세(상태 처리). 데이터는 프레임워크
// useCrudListQuery(읽기)로 배선한다. 목록엔 이미지 열이 없다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  buttonStyle,
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
import { parseFilter, useCrudListQuery } from '../../../shared/crud';
import { returnAdapter } from './data-source';
import {
  filterByStatus,
  kindLabel,
  KIND_OPTIONS,
  kindTone,
  searchReturns,
  STATUS_FILTER_ALL,
  STATUS_FILTER_OPTIONS,
  statusMeta,
} from './types';
import type { ReturnKind, StatusFilter } from './types';

const RESOURCE = 'returns';
const LIST_PATH = '/products/returns';
const KIND_FILTER_ALL = 'all';
type KindFilter = typeof KIND_FILTER_ALL | ReturnKind;
const KIND_FILTER_VALUES: readonly KindFilter[] = [
  KIND_FILTER_ALL,
  ...KIND_OPTIONS.map((option) => option.id),
];
const STATUS_FILTER_VALUES: readonly StatusFilter[] = STATUS_FILTER_OPTIONS.map(
  (option) => option.id,
);

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

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const orderCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

export default function ReturnsListPage() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<KindFilter>(KIND_FILTER_ALL);
  const [status, setStatus] = useState<StatusFilter>(STATUS_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const { data, isFetching: loading, error, refetch } = useCrudListQuery(RESOURCE, returnAdapter);

  const visible = useMemo(() => {
    const items = data ?? [];
    const byKind = kind === KIND_FILTER_ALL ? items : items.filter((item) => item.kind === kind);
    const byStatus = filterByStatus(byKind, status);
    return searchReturns(byStatus, keyword);
  }, [data, kind, status, keyword]);

  if (error !== null) {
    return (
      <div style={columnStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
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
          value={keyword}
          onChange={setKeyword}
          label="주문번호·상품·신청자 검색"
          placeholder="주문번호 · 상품 · 신청자 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={kind}
            onChange={(event) =>
              setKind(parseFilter(event.target.value, KIND_FILTER_VALUES, KIND_FILTER_ALL))
            }
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
            onChange={(event) =>
              setStatus(parseFilter(event.target.value, STATUS_FILTER_VALUES, STATUS_FILTER_ALL))
            }
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

      <p style={hintStyle}>{loading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}</p>

      <table style={tableStyle} aria-busy={loading}>
        <caption style={visuallyHiddenStyle}>
          교환/반품 요청 목록 — 각 행에서 상세로 이동해 상태를 처리할 수 있습니다.
        </caption>
        <thead>
          <tr>
            <SeqHeaderCell />
            <th scope="col" style={thStyle}>
              접수번호
            </th>
            <th scope="col" style={thStyle}>
              상품
            </th>
            <th scope="col" style={thStyle}>
              신청자
            </th>
            <th scope="col" style={thStyle}>
              유형
            </th>
            <th scope="col" style={thStyle}>
              사유
            </th>
            <th scope="col" style={thStyle}>
              접수일
            </th>
            <th scope="col" style={thStyle}>
              상태
            </th>
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }, (_, index) => (
              <tr key={`skeleton-${String(index)}`}>
                {Array.from({ length: 9 }, (_, cell) => (
                  <td key={`cell-${String(cell)}`} style={tdStyle}>
                    <span className="tds-ui-skeleton" aria-hidden="true" />
                  </td>
                ))}
              </tr>
            ))
          ) : visible.length === 0 ? (
            <tr>
              <td colSpan={9} style={emptyCellStyle}>
                교환/반품 요청이 없습니다.
              </td>
            </tr>
          ) : (
            visible.map((item, index) => {
              const meta = statusMeta(item.status);
              return (
                <tr key={item.id}>
                  <SeqCell seq={index + 1} />
                  <td style={orderCellStyle}>{item.orderNo}</td>
                  <td style={tdStyle}>{item.productName}</td>
                  <td style={tdStyle}>{item.customer}</td>
                  <td style={tdStyle}>
                    <StatusBadge tone={kindTone(item.kind)} label={kindLabel(item.kind)} />
                  </td>
                  <td style={tdStyle}>{item.reason}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{item.requestedAt}</td>
                  <td style={tdStyle}>
                    <StatusBadge tone={meta.tone} label={meta.label} />
                  </td>
                  <td style={actionCellStyle}>
                    <button
                      type="button"
                      className="tds-ui-btn-secondary tds-ui-focusable"
                      style={buttonStyle('secondary')}
                      onClick={() => navigate(`${LIST_PATH}/${item.id}`)}
                    >
                      상세
                    </button>
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
