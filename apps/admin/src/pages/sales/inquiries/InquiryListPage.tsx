// InquiryListPage — 문의 목록 (라우트: /sales/inquiries) · A41 소유
//
// 문의는 고객 채널이 만들고 관리자는 처리·답변만 한다. 그래서 CrudListShell(삭제·일괄) 대신 읽기 전용
// 표를 쓴다: 유형·채널·상태 필터 + 검색 + 행 → 상세(타임라인·답변). 데이터는 useCrudListQuery(읽기).
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../shared/format';
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
import { inquiryAdapter } from './data-source';
import {
  filterInquiries,
  INQUIRY_CHANNEL_OPTIONS,
  INQUIRY_FILTER_ALL,
  INQUIRY_STATUS_OPTIONS,
  INQUIRY_TYPE_OPTIONS,
  inquiryChannelLabel,
  inquiryPriorityTone,
  inquiryStatusLabel,
  inquiryStatusTone,
  inquiryTypeLabel,
  searchInquiries,
} from './types';
import type { InquiryChannelFilter, InquiryStatusFilter, InquiryTypeFilter } from './types';

const RESOURCE = 'sales-inquiries';
const LIST_PATH = '/sales/inquiries';
const INQUIRY_TYPE_FILTER_VALUES: readonly InquiryTypeFilter[] = [
  INQUIRY_FILTER_ALL,
  ...INQUIRY_TYPE_OPTIONS.map((option) => option.id),
];
const INQUIRY_CHANNEL_FILTER_VALUES: readonly InquiryChannelFilter[] = [
  INQUIRY_FILTER_ALL,
  ...INQUIRY_CHANNEL_OPTIONS.map((option) => option.id),
];
const INQUIRY_STATUS_FILTER_VALUES: readonly InquiryStatusFilter[] = [
  INQUIRY_FILTER_ALL,
  ...INQUIRY_STATUS_OPTIONS.map((option) => option.id),
];

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

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 4)' };

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

const COLUMN_COUNT = 9;

export default function InquiryListPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<InquiryTypeFilter>(INQUIRY_FILTER_ALL);
  const [channel, setChannel] = useState<InquiryChannelFilter>(INQUIRY_FILTER_ALL);
  const [status, setStatus] = useState<InquiryStatusFilter>(INQUIRY_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const { data, isFetching: loading, error, refetch } = useCrudListQuery(RESOURCE, inquiryAdapter);

  const visible = useMemo(
    () => searchInquiries(filterInquiries(data ?? [], type, channel, status), keyword),
    [data, type, channel, status, keyword],
  );

  if (error !== null) {
    return (
      <div style={columnStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>문의를 불러오지 못했습니다.</span>
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
          label="제목·문의번호·고객·거래처 검색"
          placeholder="제목 · 문의번호 · 고객 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={type}
            onChange={(event) =>
              setType(
                parseFilter(event.target.value, INQUIRY_TYPE_FILTER_VALUES, INQUIRY_FILTER_ALL),
              )
            }
            aria-label="유형으로 거르기"
          >
            <option value={INQUIRY_FILTER_ALL}>전체 유형</option>
            {INQUIRY_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={channel}
            onChange={(event) =>
              setChannel(
                parseFilter(event.target.value, INQUIRY_CHANNEL_FILTER_VALUES, INQUIRY_FILTER_ALL),
              )
            }
            aria-label="채널로 거르기"
          >
            <option value={INQUIRY_FILTER_ALL}>전체 채널</option>
            {INQUIRY_CHANNEL_OPTIONS.map((option) => (
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
              setStatus(
                parseFilter(event.target.value, INQUIRY_STATUS_FILTER_VALUES, INQUIRY_FILTER_ALL),
              )
            }
            aria-label="상태로 거르기"
          >
            <option value={INQUIRY_FILTER_ALL}>전체 상태</option>
            {INQUIRY_STATUS_OPTIONS.map((option) => (
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
          문의 목록 — 각 행에서 상세로 이동해 답변·상태를 처리할 수 있습니다.
        </caption>
        <thead>
          <tr>
            <SeqHeaderCell />
            <th scope="col" style={thStyle}>
              유형
            </th>
            <th scope="col" style={thStyle}>
              채널
            </th>
            <th scope="col" style={thStyle}>
              제목
            </th>
            <th scope="col" style={thStyle}>
              고객/거래처
            </th>
            <th scope="col" style={thStyle}>
              담당
            </th>
            <th scope="col" style={thStyle}>
              접수일시
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
                문의가 없습니다.
              </td>
            </tr>
          ) : (
            visible.map((item, index) => (
              <tr key={item.id}>
                <SeqCell seq={index + 1} />
                <td style={tdStyle}>
                  <StatusBadge
                    tone={inquiryPriorityTone(item.priority)}
                    label={inquiryTypeLabel(item.type)}
                  />
                </td>
                <td style={tdStyle}>{inquiryChannelLabel(item.channel)}</td>
                <td style={tdStyle}>{item.title}</td>
                <td style={tdStyle}>{`${item.customerName} / ${item.company}`}</td>
                <td style={tdStyle}>{item.assignee === '' ? '미배정' : item.assignee}</td>
                <td style={dateCellStyle}>{formatDateTime(item.receivedAt)}</td>
                <td style={tdStyle}>
                  <StatusBadge
                    tone={inquiryStatusTone(item.status)}
                    label={inquiryStatusLabel(item.status)}
                  />
                </td>
                <td style={actionCellStyle}>
                  <button
                    type="button"
                    className="tds-ui-btn-secondary tds-ui-focusable"
                    style={buttonStyle('secondary')}
                    aria-label={`${item.title} 상세`}
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
