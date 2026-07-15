// ConsultationListPage — 상담 이력 목록 (라우트: /sales/consultations) · A41 소유
//
// 상담 이력은 감사 성격이라 읽기 위주다(생성/수정/삭제 없음). 유형 필터 + 후속조치 대기 필터 + 검색 +
// 행 → 상세. 데이터는 프레임워크 useCrudListQuery(읽기)로 배선한다. 목록엔 이미지 열이 없다.
import { useMemo, useState } from 'react';
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
import { useCrudListQuery } from '../../../shared/crud';
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
  const [type, setType] = useState<ConsultTypeFilter>(CONSULT_FILTER_ALL);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [keyword, setKeyword] = useState('');

  const {
    data,
    isFetching: loading,
    error,
    refetch,
  } = useCrudListQuery(RESOURCE, consultationAdapter);

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
          value={keyword}
          onChange={setKeyword}
          label="거래처·주제·담당자 검색"
          placeholder="거래처 · 주제 · 담당자 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={type}
            onChange={(event) => setType(event.target.value as ConsultTypeFilter)}
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
            onChange={(event) => setPendingOnly(event.target.checked)}
          />
          후속조치 대기만
        </label>
      </div>

      <p style={hintStyle}>{loading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}</p>

      <table style={tableStyle} aria-busy={loading}>
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
          {loading ? (
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
              <tr key={item.id}>
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
