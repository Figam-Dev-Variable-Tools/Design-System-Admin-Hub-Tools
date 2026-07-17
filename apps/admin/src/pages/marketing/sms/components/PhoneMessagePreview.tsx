// 휴대폰 말풍선 미리보기
//
// 입력한 발신번호·본문을 수신자 휴대폰 화면처럼 보여준다. 치환변수는 표본값으로 치환하고, 자동판정된
// 유형(SMS/LMS/MMS)·바이트를 함께 표시한다. SMS 발송 폼 1곳만 쓰므로 페이지 전용이다.
import type { CSSProperties } from 'react';

import { StatusBadge } from '../../../../shared/ui';
import {
  applyVariableSamples,
  byteLengthOf,
  formatPhone,
  smsByteLimit,
  smsKindLabel,
} from '../../_shared/messaging';
import type { SmsKind } from '../../_shared/messaging';

const frameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  maxWidth: 'calc(var(--tds-space-6) * 9)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-4)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thick)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-xl)',
  background: 'var(--tds-color-surface-raised)',
};

const senderStyle: CSSProperties = {
  textAlign: 'center',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

const bubbleStyle: CSSProperties = {
  alignSelf: 'flex-start',
  maxWidth: '92%',
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderRadius: 'var(--tds-radius-lg)',
  background: 'var(--tds-color-surface-default)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const imageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(var(--tds-space-6) * 3)',
  marginBottom: 'var(--tds-space-2)',
  borderRadius: 'var(--tds-radius-sm)',
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const byteStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

interface PhoneMessagePreviewProps {
  readonly senderNumber: string;
  readonly body: string;
  readonly kind: SmsKind;
  readonly hasImage: boolean;
}

export function PhoneMessagePreview({
  senderNumber,
  body,
  kind,
  hasImage,
}: PhoneMessagePreviewProps) {
  const rendered = applyVariableSamples(body);
  const bytes = byteLengthOf(body);
  const limit = smsByteLimit(kind);
  const over = bytes > limit;

  return (
    <div style={frameStyle} aria-label="휴대폰 메시지 미리보기">
      <span style={senderStyle}>
        {senderNumber === '' ? '(발신번호 미선택)' : formatPhone(senderNumber)}
      </span>

      <div style={bubbleStyle}>
        {hasImage && (
          <div style={imageStyle} aria-hidden="true">
            이미지 첨부 (MMS)
          </div>
        )}
        {rendered.trim() === '' ? '(본문 미입력)' : rendered}
      </div>

      <div style={metaStyle}>
        <StatusBadge tone={over ? 'danger' : 'info'} label={smsKindLabel(kind)} />
        <span style={byteStyle}>{`${String(bytes)} / ${String(limit)} byte`}</span>
      </div>
    </div>
  );
}
