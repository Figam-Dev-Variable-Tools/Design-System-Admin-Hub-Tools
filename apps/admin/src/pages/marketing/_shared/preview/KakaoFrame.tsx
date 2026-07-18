// 카카오 알림톡 목업 프레임 (마케팅 발송 화면 공용)
//
// [왜 매체의 실제 색을 쓰나] 미리보기의 목적은 '수신자가 보게 될 모습' 을 재현하는 것이다. 종전
// 목업은 앱의 회색 surface 로 그려서 어떤 매체인지 알아볼 수 없었고, 그 결과 '큰 회색 상자' 처럼
// 보였다. 카카오 옐로와 대화방 배경은 이 목업 하나를 위해 토큰(color.channel.kakao.*)으로 들였다.
//
// [알림톡의 생김새 — 친구톡·일반 채팅과 다르다]
// - 상단에 채널(발신 프로필)명 띠가 옐로로 붙는다. 이것이 '광고가 아닌 정보성 메시지' 표식이다.
// - 말풍선 머리에 강조표기(굵은 제목)가 오고 본문이 따른다.
// - 본문 아래 버튼 영역(채널 추가·자세히 보기 등)이 붙을 수 있다.
import type { CSSProperties, ReactNode } from 'react';

import { PHONE_WIDTH } from '../preview-metrics';

const frameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: PHONE_WIDTH,
  marginLeft: 'auto',
  marginRight: 'auto',
  width: '100%',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-lg)',
  overflow: 'hidden',
};

/** 채널명 띠 — 알림톡임을 알리는 옐로 헤더 */
const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  background: 'var(--tds-color-channel-kakao-surface)',
  color: 'var(--tds-color-channel-kakao-text)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
};

const barTagStyle: CSSProperties = {
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 'var(--tds-space-2)',
  paddingRight: 'var(--tds-space-2)',
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-channel-kakao-text)',
  color: 'var(--tds-color-channel-kakao-surface)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'calc(var(--tds-space-5))',
};

/** 대화방 배경 — 말풍선이 떠 보이게 하는 푸른 회색 */
const chatStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-4)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  background: 'var(--tds-color-channel-kakao-chat-surface)',
};

const bubbleStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '92%',
  borderRadius: 'var(--tds-radius-lg)',
  background: 'var(--tds-color-surface-default)',
  overflow: 'hidden',
};

const bubbleBodyStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
};

const emphasisStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 'var(--tds-space-2)',
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
  overflowWrap: 'anywhere',
};

const textStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

/** 버튼 영역 — 말풍선 아래에 붙는다. 실제 알림톡은 여기에 '채널 추가' 등이 온다 */
const buttonAreaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  paddingTop: 0,
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-2)',
  paddingRight: 'var(--tds-space-2)',
};

const buttonStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  textAlign: 'center',
};

interface KakaoFrameProps {
  /** 발신 채널명 — 수신자가 보는 프로필 이름 */
  readonly channelName: string;
  /** 강조표기(제목) — 비면 그리지 않는다 */
  readonly emphasis?: ReactNode;
  readonly body: ReactNode;
  /** 말풍선 아래 버튼 라벨들 — 없으면 영역째 그리지 않는다 */
  readonly buttons?: readonly string[];
}

export function KakaoFrame({ channelName, emphasis, body, buttons = [] }: KakaoFrameProps) {
  return (
    <div style={frameStyle} aria-label="카카오 알림톡 미리보기">
      <div style={barStyle}>
        <span style={barTagStyle}>알림톡</span>
        <span>{channelName}</span>
      </div>

      <div style={chatStyle}>
        <div style={bubbleStyle}>
          <div style={bubbleBodyStyle}>
            {emphasis !== undefined && <p style={emphasisStyle}>{emphasis}</p>}
            <div style={textStyle}>{body}</div>
          </div>

          {buttons.length > 0 && (
            <div style={buttonAreaStyle}>
              {buttons.map((label) => (
                // 목업이라 누를 수 없다 — button 이 아니라 div 로 그린다(포커스 순서를 오염시키지 않는다)
                <div key={label} style={buttonStyle}>
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
