// ConsultationListPage — 상담 이력 목록 (라우트: /sales/consultations) · A41 소유
//
// 상담 이력은 감사 성격이라 읽기 위주다(생성/수정/삭제 없음). 유형 필터 + 후속조치 대기 필터 + 검색 +
// 행 → 상세. 데이터는 프레임워크 useCrudListQuery(읽기)로 배선한다. 목록엔 이미지 열이 없다.
//
// [조회 상태의 소유자] 유형·후속조치 대기·검색어는 이 파일의 useState 3개였다. 이제 shared/crud 의
// useListState 가 **URL 쿼리스트링**으로 소유한다 (IA-13) — '후속조치 대기만' 을 켜 놓고 상담 상세로
// 들어갔다 Back 하면 전체 목록이 아니라 그 대기 목록으로 돌아온다. 그 URL 을 담당자에게 그대로
// 넘길 수도 있다. 검색은 IME 안전이다 (COMP-10).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  buttonStyle,
  checkboxStyle,
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
import { consultationAdapter } from './data-source';
import {
  CONSULT_FILTER_ALL,
  CONSULT_TYPE_OPTIONS,
  consultOutcomeLabel,
  consultOutcomeTone,
  consultTypeLabel,
  filterConsultations,
  hasPendingFollowUp,
  searchConsultations,
} from './types';
import type { ConsultTypeFilter } from './types';

const RESOURCE = 'sales-consultations';
const LIST_PATH = '/sales/consultations';
const COLUMN_COUNT = 8;
const CONSULT_TYPE_FILTER_VALUES: readonly ConsultTypeFilter[] = [
  CONSULT_FILTER_ALL,
  ...CONSULT_TYPE_OPTIONS.map((option) => option.id),
];

/**
 * URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13).
 * 체크박스(후속조치 대기만)는 URL 이 문자열만 담으므로 'true'/'false' 로 직렬화한다 —
 * 꺼진 상태가 기본이라 '?pending=false' 같은 군더더기는 URL 에 남지 않는다.
 */
const PENDING_ON = 'true';
const PENDING_OFF = 'false';
const FILTER_DEFAULTS = { type: CONSULT_FILTER_ALL, pending: PENDING_OFF } as const;

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 5)' };

const checkLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  cursor: 'pointer',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const dateCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const actionCellStyle: CSSProperties = { ...tdStyle, textAlign: 'right' };

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

export default function ConsultationListPage() {
  const navigate = useNavigate();
  const { rowNavProps } = useRowNavigation();

  // 유형·후속조치 대기·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?type=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const type: ConsultTypeFilter = parseFilter(
    list.filters['type'] ?? CONSULT_FILTER_ALL,
    CONSULT_TYPE_FILTER_VALUES,
    CONSULT_FILTER_ALL,
  );
  const pendingOnly = list.filters['pending'] === PENDING_ON;
  const { keyword } = list;

  const { data, isFetching, error, refetch } = useCrudListQuery(RESOURCE, consultationAdapter);
  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  // useCrudListQuery 는 placeholderData 로 이전 행을 들고 있는데, 예전엔 `isFetching` 을 그대로
  // loading 이라 불러 그 행을 스켈레톤으로 덮었다.
  const firstLoading = isFetching && data === undefined;

  const visible = useMemo(
    () => searchConsultations(filterConsultations(data ?? [], type, pendingOnly), keyword),
    [data, type, pendingOnly, keyword],
  );

  if (error !== null) {
    return (
      <div style={columnStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>상담 이력을 불러오지 못했습니다.</span>
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
          label="거래처·주제·담당자 검색"
          placeholder="거래처 · 주제 · 담당자 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '김영수' 를 치는 도중 '김영ㅅ' 로 검색되지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={type}
            onChange={(event) => list.setFilter('type', event.target.value)}
            aria-label="상담유형으로 거르기"
          >
            <option value={CONSULT_FILTER_ALL}>전체 유형</option>
            {CONSULT_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={pendingOnly}
            onChange={(event) =>
              list.setFilter('pending', event.target.checked ? PENDING_ON : PENDING_OFF)
            }
          />
          후속조치 대기만
        </label>
      </div>

      <p style={hintStyle}>
        {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}
      </p>

      {/* aria-busy 는 재조회 중에도 참이다 — 행은 남기되 보조기기에는 갱신 중임을 알린다 */}
      <table style={tableStyle} aria-busy={isFetching}>
        <caption style={visuallyHiddenStyle}>
          상담 이력 목록 — 각 행에서 상세로 이동해 상담 내용·후속조치를 볼 수 있습니다.
        </caption>
        <thead>
          <tr>
            <SeqHeaderCell />
            <th scope="col" style={thStyle}>
              상담일시
            </th>
            <th scope="col" style={thStyle}>
              거래처
            </th>
            <th scope="col" style={thStyle}>
              유형
            </th>
            <th scope="col" style={thStyle}>
              주제
            </th>
            <th scope="col" style={thStyle}>
              담당자
            </th>
            <th scope="col" style={thStyle}>
              후속조치
            </th>
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {firstLoading ? (
            Array.from({ length: 5 }, (_, index) => (
              <tr key={`skeleton-${String(index)}`}>
                {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                  <td key={`cell-${String(cell)}`} style={tdStyle}>
                    <span className="tds-ui-skeleton" aria-hidden="true" />
                  </td>
                ))}
              </tr>
            ))
          ) : visible.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} style={emptyCellStyle}>
                상담 이력이 없습니다.
              </td>
            </tr>
          ) : (
            visible.map((item, index) => (
              <tr key={item.id} className="tds-ui-row" {...rowNavProps(`${LIST_PATH}/${item.id}`)}>
                <SeqCell seq={index + 1} />
                <td style={dateCellStyle}>{formatDateTime(item.consultedAt)}</td>
                <td style={tdStyle}>{item.accountName}</td>
                <td style={tdStyle}>
                  <StatusBadge
                    tone={consultOutcomeTone(item.outcome)}
                    label={consultTypeLabel(item.consultType)}
                  />
                </td>
                <td style={tdStyle}>{item.topic}</td>
                <td style={tdStyle}>{item.consultant}</td>
                <td style={tdStyle}>
                  {hasPendingFollowUp(item) ? (
                    <StatusBadge tone="warning" label="대기" />
                  ) : (
                    <StatusBadge tone="neutral" label={consultOutcomeLabel(item.outcome)} />
                  )}
                </td>
                <td style={actionCellStyle}>
                  <button
                    type="button"
                    className="tds-ui-btn-secondary tds-ui-focusable"
                    style={buttonStyle('secondary')}
                    aria-label={`${item.topic} 상세`}
                    onClick={() => navigate(`${LIST_PATH}/${item.id}`)}
                  >
                    상세
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
