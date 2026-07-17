// 이메일/뉴스레터 미리보기
//
// [왜 _shared 인가] 이메일 발송·뉴스레터 두 폼이 같은 '메일 클라이언트 미리보기(제목·발신자·본문·수신거부
// 링크)'를 쓴다. 한 벌만 둔다(marketing 한 페이지 안이라 결합이 아니다).
//
// 치환변수는 표본값으로 치환하고, 수신거부 링크 포함 여부를 하단에 반영한다.
import type { CSSProperties } from 'react';

import { StatusBadge } from '../../../shared/ui';
import { applyVariableSamples } from './messaging';

const frameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-default)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderBottomStyle: 'solid',
  borderBottomWidth: 'var(--tds-border-width-thin)',
  borderBottomColor: 'var(--tds-color-border-default)',
  background: 'var(--tds-color-surface-raised)',
};

const subjectStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
  overflowWrap: 'anywhere',
};

const fromStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  overflowWrap: 'anywhere',
};

const bodyStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-4)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  minHeight: 'calc(var(--tds-space-6) * 3)',
};

const footerStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderTopStyle: 'solid',
  borderTopWidth: 'var(--tds-border-width-thin)',
  borderTopColor: 'var(--tds-color-border-default)',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const unsubStyle: CSSProperties = {
  textDecorationLine: 'underline',
  color: 'var(--tds-color-text-muted)',
};

interface EmailPreviewProps {
  readonly subject: string;
  readonly senderName: string;
  readonly senderEmail: string;
  readonly body: string;
  readonly includeUnsubscribe: boolean;
}

export function EmailPreview({
  subject,
  senderName,
  senderEmail,
  body,
  includeUnsubscribe,
}: EmailPreviewProps) {
  const renderedSubject = applyVariableSamples(subject);
  const renderedBody = applyVariableSamples(body);
  const from = senderEmail === '' ? '(발신자 미선택)' : `${senderName} <${senderEmail}>`;

  return (
    <div style={frameStyle} aria-label="이메일 미리보기">
      <div style={headerStyle}>
        <span style={subjectStyle}>
          {renderedSubject.trim() === '' ? '(제목 미입력)' : renderedSubject}
        </span>
        <span style={fromStyle}>보낸사람: {from}</span>
      </div>

      <div style={bodyStyle}>{renderedBody.trim() === '' ? '(본문 미입력)' : renderedBody}</div>

      <div style={footerStyle}>
        {includeUnsubscribe ? (
          <span>
            본 메일을 원치 않으시면 <span style={unsubStyle}>수신거부</span> 하실 수 있습니다.
          </span>
        ) : (
          <StatusBadge tone="danger" label="수신거부 링크 없음 — 마케팅 이메일 필수" />
        )}
      </div>
    </div>
  );
}
