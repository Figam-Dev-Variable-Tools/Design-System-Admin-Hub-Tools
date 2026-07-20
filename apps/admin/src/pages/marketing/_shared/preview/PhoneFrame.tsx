// 휴대폰 문자(SMS/LMS/MMS) 목업 프레임 (마케팅 발송 화면 공용)
//
// [세 유형을 한 프레임이 그린다] SMS·LMS·MMS 는 다른 매체가 아니라 **같은 문자의 등급**이다:
// 90byte 를 넘으면 LMS, 이미지가 붙으면 MMS 로 승격될 뿐 수신 화면은 같은 문자 앱이다. 그래서
// 프레임을 셋으로 나누지 않고, 이미지 영역을 얹고 배지를 바꾸는 한 벌로 그린다
// (MMS 는 SMS 를 포함한다 — classifySms 의 판정 규칙과 같은 모양).
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 프레임이 드러내야 하는 두 가지 — 화면을 봐서는 알 수 없는 것들]
//
// 1) **승격 경계**. 종전 목업은 `n / 한도 byte` 만 적었다. 그런데 LMS 로 승격된 뒤의 한도는
//    2,000 이라, 정작 운영자가 알아야 할 90byte 라는 경계가 화면에서 사라진다 — '왜 SMS 가
//    아니라 LMS 로 나갔나' 를 목업이 설명하지 못한다. 그래서 막대(게이지)에 **90byte 자리에
//    눈금**을 찍고, 넘었으면 넘은 만큼을 다른 색으로 칠한다. 단가가 갈리는 경계라 숫자 한 줄로는
//    부족하다.
//
// 2) **제목이 나가는가**. SMS 에는 제목 필드가 아예 없다(messaging.ts showsSubject). 제목을 적으면
//    그 문자는 90byte 안이어도 LMS 로 승격된다. 목업이 제목을 항상 그리면 운영자는 SMS 에도 제목이
//    붙는 줄 알고, 반대로 항상 감추면 제목을 왜 입력했는지 알 수 없다 — 그래서 **등급이 정한다**.
// ─────────────────────────────────────────────────────────────────────────────
import type { CSSProperties, ReactNode } from 'react';

import { StatusBadge } from '../../../../shared/ui';
import { showsSubject, smsByteLimit, smsKindLabel, SMS_PROMOTION_THRESHOLD } from '../messaging';
import type { SmsKind } from '../messaging';
import { PHONE_WIDTH } from '../preview-metrics';
import { cssVar } from '@tds/ui';

const frameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  maxWidth: PHONE_WIDTH,
  marginLeft: 'auto',
  marginRight: 'auto',
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thick'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.xl'),
  background: cssVar('color.surface.raised'),
};

const notchStyle: CSSProperties = {
  alignSelf: 'center',
  width: 'calc(var(--tds-space-6) * 2)',
  height: cssVar('space.1'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.border.default'),
};

const senderStyle: CSSProperties = {
  textAlign: 'center',
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

const bubbleStyle: CSSProperties = {
  alignSelf: 'flex-start',
  maxWidth: '92%',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  color: cssVar('color.text.default'),
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
  marginBottom: cssVar('space.2'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

/**
 * 제목 줄 — LMS·MMS 만 갖는다(SMS 에는 제목 필드가 없다).
 *
 * 수신 화면에서 제목은 본문 위에 굵게 한 줄로 붙는다. 본문과 같은 크기로 그리면 '첫 줄' 과
 * 구분되지 않아 목업이 제목의 존재를 설명하지 못한다.
 */
const subjectStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: cssVar('space.2'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  overflowWrap: 'anywhere',
};

/** 제목을 적었는데 SMS 라 나가지 않을 때의 안내 — 값을 감추기만 하면 사라진 이유를 알 수 없다 */
const subjectDroppedStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: cssVar('space.2'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const metaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const byteStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

/* ── 승격 게이지 ──────────────────────────────────────────────────────────────
 *
 * 막대 하나에 두 가지를 겹쳐 그린다: 채워진 만큼(fill)과 90byte 자리의 눈금(tick).
 * 폭은 **백분율**이라 px 리터럴이 아니다 — 높이·간격만 space 토큰의 calc 로 잡는다. */

const gaugeStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  overflow: 'hidden',
};

const gaugeFillStyle = (percent: number, over: boolean): CSSProperties => ({
  position: 'absolute',
  insetBlockStart: 0,
  insetInlineStart: 0,
  height: '100%',
  width: `${String(percent)}%`,
  borderRadius: cssVar('radius.full'),
  background: over ? cssVar('color.feedback.danger.text') : cssVar('color.feedback.info.text'),
});

/** 90byte 눈금 — 여기를 넘는 순간 SMS 가 LMS 가 된다. 등급과 무관하게 늘 같은 자리다 */
const gaugeTickStyle = (percent: number): CSSProperties => ({
  position: 'absolute',
  insetBlockStart: 0,
  insetInlineStart: `${String(percent)}%`,
  height: '100%',
  width: cssVar('border-width.thick'),
  background: cssVar('color.text.default'),
});

/** 눈금이 무엇을 뜻하는지 — 막대만 있으면 검은 선이 왜 거기 있는지 알 수 없다 */
const gaugeLegendStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'center',
};

/** 0~100 으로 가둔다 — 상한을 넘긴 본문이 막대를 프레임 밖으로 밀어내지 않게 한다 */
function clampPercent(value: number, of: number): number {
  if (of <= 0) return 0;
  return Math.min(100, Math.max(0, (value / of) * 100));
}

/**
 * 지금 이 등급이 된 **이유**를 한 줄로.
 *
 * [왜 '90byte 를 넘어서' 로 뭉뚱그리지 않는가] LMS 가 되는 길은 둘이다 — 본문이 90byte 를 넘었거나,
 * **제목을 적었거나**(SMS 에는 제목 필드가 없다). 후자는 본문이 20byte 여도 LMS 다. 이유를 하나로
 * 적으면 짧은 본문에 제목만 붙인 운영자가 '90byte 를 넘었다' 는 틀린 설명을 읽는다.
 */
function promotionReasonOf(kind: SmsKind, bytes: number, limit: number): string {
  if (kind === 'mms') return `이미지가 붙어 MMS 입니다 · 본문 ${String(limit)} byte 까지`;
  if (kind === 'sms') return `${String(SMS_PROMOTION_THRESHOLD)} byte 를 넘으면 LMS 로 승격됩니다`;
  return bytes > SMS_PROMOTION_THRESHOLD
    ? `본문이 ${String(SMS_PROMOTION_THRESHOLD)} byte 눈금을 넘어 LMS 입니다`
    : '제목이 있어 LMS 입니다 — SMS 에는 제목 필드가 없습니다';
}

interface PhoneFrameProps {
  /** 상단 발신번호 줄 — 템플릿처럼 발신번호가 없는 화면은 넘기지 않는다 */
  readonly sender?: ReactNode;
  /**
   * 제목 — LMS·MMS 만 수신자에게 보여 준다. 값이 있어도 등급이 SMS 면 **그리지 않고 왜 안 나가는지를
   * 대신 적는다**(감추기만 하면 사라진 이유를 알 수 없다). 제목이 없는 화면은 넘기지 않는다.
   */
  readonly subject?: string;
  readonly body: ReactNode;
  readonly kind: SmsKind;
  /** 소비된 바이트 — 유형 배지 옆에 `n / 한도` 로 띄운다 */
  readonly bytes: number;
}

export function PhoneFrame({ sender, subject, body, kind, bytes }: PhoneFrameProps) {
  const limit = smsByteLimit(kind);
  const over = bytes > limit;

  const hasSubject = subject !== undefined && subject.trim() !== '';
  const subjectVisible = hasSubject && showsSubject(kind);

  /* 게이지는 **현재 등급의 한도**를 기준으로 채우고, 눈금은 그 위 90byte 자리에 찍는다.
     SMS 일 때는 한도 자체가 90 이라 눈금이 막대 끝과 겹치므로 그리지 않는다 — 끝에 붙은 선은
     경계가 아니라 테두리로 보인다. */
  const fillPercent = clampPercent(bytes, limit);
  const showTick = limit > SMS_PROMOTION_THRESHOLD;
  const tickPercent = clampPercent(SMS_PROMOTION_THRESHOLD, limit);

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
        {subjectVisible && <p style={subjectStyle}>{subject}</p>}
        {hasSubject && !subjectVisible && (
          <p style={subjectDroppedStyle}>제목은 SMS 로는 발송되지 않습니다.</p>
        )}
        {body}
      </div>

      <div style={metaStyle}>
        <div style={metaRowStyle}>
          <StatusBadge tone={over ? 'danger' : 'info'} label={smsKindLabel(kind)} />
          <span style={byteStyle}>{`${String(bytes)} / ${String(limit)} byte`}</span>
        </div>

        {/*
          [왜 aria-hidden 인가] 같은 사실을 위 배지와 바이트 수가 이미 글자로 말한다. 막대는 그
          숫자를 눈으로 잡히게 만드는 장치라, 스크린리더에 한 번 더 읽히면 중복이 된다.
          대신 아래 범례는 **읽히게 둔다** — 거기에만 있는 정보(승격 경계)가 있다.
        */}
        <div style={gaugeStyle} aria-hidden="true">
          <span style={gaugeFillStyle(fillPercent, over)} />
          {showTick && <span style={gaugeTickStyle(tickPercent)} />}
        </div>

        <span style={gaugeLegendStyle}>{promotionReasonOf(kind, bytes, limit)}</span>
      </div>
    </div>
  );
}
