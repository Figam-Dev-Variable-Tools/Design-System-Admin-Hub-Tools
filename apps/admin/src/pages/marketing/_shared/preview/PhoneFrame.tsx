// 휴대폰 문자(SMS/LMS/MMS) 목업 프레임 (마케팅 발송 화면 공용)
//
// [세 유형을 한 프레임이 그린다] SMS·LMS·MMS 는 다른 매체가 아니라 **같은 문자의 등급**이다:
// 90byte 를 넘으면 LMS, 이미지가 붙으면 MMS 로 승격될 뿐 수신 화면은 같은 문자 앱이다. 그래서
// 프레임을 셋으로 나누지 않고, 이미지 영역을 얹고 배지를 바꾸는 한 벌로 그린다
// (MMS 는 SMS 를 포함한다 — classifySms 의 판정 규칙과 같은 모양).
import type { CSSProperties, ReactNode } from 'react';

import { StatusBadge } from '../../../../shared/ui';
import { smsByteLimit, smsKindLabel } from '../messaging';
import type { SmsKind } from '../messaging';
import { PHONE_WIDTH } from '../preview-metrics';

const frameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  maxWidth: PHONE_WIDTH,
  marginLeft: 'auto',
  marginRight: 'auto',
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: 'var(--tds-space-5)',
  paddingBottom: 'var(--tds-space-5)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thick)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-xl)',
  background: 'var(--tds-color-surface-raised)',
};

const notchStyle: CSSProperties = {
  alignSelf: 'center',
  width: 'calc(var(--tds-space-6) * 2)',
  height: 'var(--tds-space-1)',
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-border-default)',
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

/** 이미지 자리 — MMS 일 때만. 실제 이미지가 아니라 '여기에 붙는다' 는 표시다 */
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

interface PhoneFrameProps {
  /** 상단 발신번호 줄 — 템플릿처럼 발신번호가 없는 화면은 넘기지 않는다 */
  readonly sender?: ReactNode;
  readonly body: ReactNode;
  readonly kind: SmsKind;
  /** 소비된 바이트 — 유형 배지 옆에 `n / 한도` 로 띄운다 */
  readonly bytes: number;
}

export function PhoneFrame({ sender, body, kind, bytes }: PhoneFrameProps) {
  const limit = smsByteLimit(kind);
  const over = bytes > limit;

  return (
    <div style={frameStyle} aria-label="휴대폰 메시지 미리보기">
      {sender === undefined ? (
        <span style={notchStyle} aria-hidden="true" />
      ) : (
        <span style={senderStyle}>{sender}</span>
      )}

      <div style={bubbleStyle}>
        {kind === 'mms' && (
          <div style={imageStyle} aria-hidden="true">
            이미지 첨부 (MMS)
          </div>
        )}
        {body}
      </div>

      <div style={metaStyle}>
        <StatusBadge tone={over ? 'danger' : 'info'} label={smsKindLabel(kind)} />
        <span style={byteStyle}>{`${String(bytes)} / ${String(limit)} byte`}</span>
      </div>
    </div>
  );
}
