// ConsultationDetailPage — 상담 이력 상세 (라우트: /sales/consultations/:id) · A41 소유
//
// 읽기 전용 상세 — 상담 정보 + 상담 내용 + 후속조치. 감사 이력이라 수정/삭제 없이 조회만 한다.
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { formatDateTime } from '../../../shared/format';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  ddStyle,
  dlStyle,
  dtStyle,
  fieldLabelStyle,
  pageTitleStyle,
  StatusBadge,
} from '../../../shared/ui';
import { consultationAdapter } from './data-source';
import {
  consultOutcomeLabel,
  consultOutcomeTone,
  consultTypeLabel,
  hasPendingFollowUp,
} from './types';

const RESOURCE = 'sales-consultations';
const LIST_PATH = '/sales/consultations';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const bodyTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

export default function ConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const detailQuery = useQuery({
    queryKey: [RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => consultationAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const consultation = detailQuery.data;

  if (detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>상담 이력을 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <ChevronLeftIcon />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>상담 이력</h1>
      </div>

      {consultation === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: 'var(--tds-color-text-muted)' }}>불러오는 중…</p>
        </Card>
      ) : (
        <>
          <Card>
            <CardTitle>
              {consultation.topic}
              <StatusBadge
                tone={consultOutcomeTone(consultation.outcome)}
                label={consultOutcomeLabel(consultation.outcome)}
              />
            </CardTitle>

            <div style={badgeRowStyle}>
              <StatusBadge tone="info" label={consultTypeLabel(consultation.consultType)} />
              {hasPendingFollowUp(consultation) && (
                <StatusBadge tone="warning" label="후속조치 대기" />
              )}
            </div>

            <dl style={dlStyle}>
              <dt style={dtStyle}>거래처</dt>
              <dd style={ddStyle}>{consultation.accountName}</dd>
              <dt style={dtStyle}>상담 대상자</dt>
              <dd style={ddStyle}>{consultation.contactPerson}</dd>
              <dt style={dtStyle}>상담일시</dt>
              <dd style={ddStyle}>{formatDateTime(consultation.consultedAt)}</dd>
              <dt style={dtStyle}>상담 담당자</dt>
              <dd style={ddStyle}>{consultation.consultant}</dd>
              <dt style={dtStyle}>관련</dt>
              <dd style={ddStyle}>{consultation.related === '' ? '—' : consultation.related}</dd>
            </dl>
          </Card>

          <Card>
            <CardTitle>상담 내용</CardTitle>
            <p style={bodyTextStyle}>{consultation.content}</p>
          </Card>

          <Card>
            <CardTitle>후속조치</CardTitle>
            {consultation.followUpAction === '' ? (
              <p style={{ ...bodyTextStyle, color: 'var(--tds-color-text-muted)' }}>
                등록된 후속조치가 없습니다.
              </p>
            ) : (
              <dl style={dlStyle}>
                <dt style={dtStyle}>조치 내용</dt>
                <dd style={ddStyle}>{consultation.followUpAction}</dd>
                <dt style={dtStyle}>예정일</dt>
                <dd style={ddStyle}>
                  {consultation.followUpAt === '' ? '—' : consultation.followUpAt}
                </dd>
                <dt style={dtStyle}>완료 여부</dt>
                <dd style={ddStyle}>
                  <StatusBadge
                    tone={consultation.followUpDone ? 'success' : 'warning'}
                    label={consultation.followUpDone ? '완료' : '대기'}
                  />
                </dd>
              </dl>
            )}
          </Card>

          <div style={actionsStyle}>
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
