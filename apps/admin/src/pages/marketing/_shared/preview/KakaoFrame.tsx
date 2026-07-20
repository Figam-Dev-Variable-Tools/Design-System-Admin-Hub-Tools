// 카카오 알림톡 목업 프레임 (마케팅 발송 화면 공용)
//
// [왜 매체의 실제 색을 쓰나] 미리보기의 목적은 '수신자가 보게 될 모습' 을 재현하는 것이다. 종전
// 목업은 앱의 회색 surface 로 그려서 어떤 매체인지 알아볼 수 없었고, 그 결과 '큰 회색 상자' 처럼
// 보였다. 카카오 옐로와 대화방 배경은 이 목업 하나를 위해 토큰(color.channel.kakao.*)으로 들였다.
//
// [알림톡의 생김새 — 일반 채팅과 다르다]
// - 상단에 채널(발신 프로필)명 띠가 옐로로 붙는다. 이것이 '광고가 아닌 정보성 메시지' 표식이다.
// - 말풍선 머리에 강조표기(굵은 제목)가 오고 본문이 따른다.
// - 본문 아래 버튼 영역(채널 추가·자세히 보기 등)이 붙을 수 있다.
//
// [브랜드 메시지도 이 프레임을 쓴다 — 두 번째 카카오 목업을 만들지 않는다]
// 브랜드 메시지(구 친구톡 — 2025-12-31 종료, message-templates/kakao.ts 머리말)와 알림톡은
// **대화방·옐로 띠·말풍선·버튼 영역이 같은 물건**이다. 프레임을 포크하면 카카오 목업이 앱에 여러 벌
// 생기고, 그중 하나만 고쳐진 채 남는다.
//
// [그래서 유형이 정하는 것은 '어느 슬롯을 그리는가' 뿐이다]
// 아홉 개의 유형(알림톡 강조 4 + 브랜드 메시지 5)이 각자 다른 모습을 갖지만, 프레임이 갈리는 것이
// 아니라 **슬롯이 켜지고 꺼진다**:
//   tag · emphasis/subtitle(강조표기형) · imageFileName + wideImage(이미지형·와이드)
//   itemHeader/highlight*/items(아이템리스트형) · listItems(와이드 리스트형) · cards(캐러셀형)
//   extraInfo/channelAddGuide(부가정보형·채널추가형·복합형)
// 전부 선택 prop 이고 기본값이 종전 모습이라, 기존 호출부(marketing/templates 발송 미리보기)는
// 한 글자도 바뀌지 않는다.
//
// [호출부가 유형을 판정한다 — 이 파일은 도메인을 모른다]
// 여기에 `emphasisType === 'title'` 같은 판정을 들이면 _shared 의 목업이 message-templates 의
// 도메인 타입을 알게 된다(클린코드 점검 축2 도메인 누수). 무엇을 그릴지는 KakaoPreviewCard 가
// 정하고, 이 파일은 **받은 슬롯만** 그린다.
import type { CSSProperties, ReactNode } from 'react';

import { PHONE_WIDTH } from '../preview-metrics';
import { cssVar } from '@tds/ui';

const frameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: PHONE_WIDTH,
  marginLeft: 'auto',
  marginRight: 'auto',
  width: '100%',
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  overflow: 'hidden',
};

/** 채널명 띠 — 알림톡임을 알리는 옐로 헤더 */
const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  background: cssVar('color.channel.kakao.surface'),
  color: cssVar('color.channel.kakao.text'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
};

const barTagStyle: CSSProperties = {
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.channel.kakao.text'),
  color: cssVar('color.channel.kakao.surface'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'calc(var(--tds-space-5))',
};

/** 대화방 배경 — 말풍선이 떠 보이게 하는 푸른 회색 */
const chatStyle: CSSProperties = {
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  background: cssVar('color.channel.kakao.chat-surface'),
};

const bubbleStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '92%',
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const bubbleBodyStyle: CSSProperties = {
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
};

const emphasisStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: cssVar('space.2'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
  overflowWrap: 'anywhere',
};

const textStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

/** 버튼 영역 — 말풍선 아래에 붙는다. 실제 알림톡은 여기에 '채널 추가' 등이 온다 */
const buttonAreaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  paddingTop: 0,
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
};

const buttonStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  textAlign: 'center',
};

/** 기본 태그 — 이 목업이 처음 생긴 자리(알림톡 발송 미리보기)의 값이다 */
const DEFAULT_TAG = '알림톡';

/**
 * 브랜드 메시지 이미지형의 이미지 자리.
 *
 * [왜 실제 이미지를 그리지 않는가] 이 화면이 저장하는 값은 **파일명(문자열)** 이다 — 바이트는 아직
 * 어디에도 올라가지 않았다(ImageAttachRow 의 TODO(backend)). 있지도 않은 주소로 <img> 를 걸면
 * 깨진 이미지 아이콘이 뜬다. 자리와 파일명을 보이는 편이 '여기에 이 파일이 온다' 를 더 정확히 말한다.
 */
const imageSlotStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'calc(var(--tds-space-10) * 2)',
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  textAlign: 'center',
  overflowWrap: 'anywhere',
};

/** 강조표기형의 보조 문구 — 굵은 제목 위에 작게 붙는다 */
const subtitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: cssVar('space.1'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  overflowWrap: 'anywhere',
};

/* ── 아이템리스트형 ───────────────────────────────────────────────────────────
 *
 * 수신 화면에서 이것은 **표**다: 왼쪽에 짧은 항목명, 오른쪽에 값. 목업이 이것을 그냥 여러 줄 글로
 * 그리면 운영자는 항목명이 6자로 제한된 이유를 화면 어디에서도 볼 수 없다. */

const itemHeaderStyle: CSSProperties = {
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

const highlightStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: cssVar('space.3'),
  marginLeft: 0,
  marginRight: 0,
};

const highlightTitleStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
  overflowWrap: 'anywhere',
};

const highlightDescriptionStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  overflowWrap: 'anywhere',
};

/** 표 — 두 열의 폭 차이가 곧 '항목명은 짧다' 는 설명이다 */
const itemTableStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: cssVar('space.3'),
  marginLeft: 0,
  marginRight: 0,
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: 0,
  paddingRight: 0,
  borderTopStyle: 'solid',
  borderBottomStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderBottomWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
  borderBottomColor: cssVar('color.border.default'),
};

const itemRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const itemNameStyle: CSSProperties = {
  flexGrow: 0,
  flexShrink: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  overflowWrap: 'anywhere',
};

const itemValueStyle: CSSProperties = {
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  textAlign: 'right',
  overflowWrap: 'anywhere',
};

/**
 * 부가정보·채널추가 안내 영역.
 *
 * 카카오는 이 글자를 **버튼 아래 Description 영역**에 본문보다 한 단계 작고 흐린 색으로 그린다
 * (제작가이드 §1-2). 본문과 같은 크기로 그리면 운영자는 부가정보가 본문처럼 눈에 띈다고 착각하고
 * 중요한 안내를 거기 적는다.
 */
const descriptionAreaStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

/* ── 와이드 리스트형 ─────────────────────────────────────────────────────────── */

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const listRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

const listThumbStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexGrow: 0,
  flexShrink: 0,
  width: 'calc(var(--tds-space-10) * 1)',
  height: 'calc(var(--tds-space-8) * 1)',
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  overflow: 'hidden',
};

const listTitleStyle: CSSProperties = {
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  overflowWrap: 'anywhere',
};

/* ── 캐러셀형 ─────────────────────────────────────────────────────────────────
 *
 * 캐러셀은 **가로로 넘겨 보는** 물건이다. 세로로 쌓아 그리면 와이드 리스트형과 구분되지 않고,
 * '카드가 2~6장' 이라는 제약이 왜 있는지도 화면에서 사라진다. 그래서 가로 스크롤로 그린다. */

const carouselStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
  overflowX: 'auto',
  overflowY: 'hidden',
  paddingTop: 0,
  paddingBottom: cssVar('space.2'),
  paddingLeft: 0,
  paddingRight: 0,
};

const carouselCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 0,
  flexShrink: 0,
  /* 카드 폭은 말풍선보다 좁다 — 옆 카드의 가장자리가 보여야 '넘길 수 있다' 가 읽힌다 */
  width: 'calc(var(--tds-space-10) * 4)',
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const carouselHeaderStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: cssVar('space.1'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  overflowWrap: 'anywhere',
};

const carouselBodyStyle: CSSProperties = {
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

/**
 * 와이드 이미지형의 이미지 — 말풍선을 **가득 채운다**.
 *
 * 기본 이미지 자리(imageSlotStyle)보다 키운 것이 곧 설명이다: 이 유형에서 글자가 76자로 줄어드는
 * 이유가 '이미지가 자리를 통째로 차지해서' 라는 것을 목업이 스스로 보여 준다.
 */
const wideImageSlotStyle: CSSProperties = {
  ...imageSlotStyle,
  minHeight: 'calc(var(--tds-space-10) * 4)',
};

/** 아이템리스트 한 행 — 미리보기에 쓰는 얕은 모양(도메인 타입을 _shared 가 알지 않는다) */
interface KakaoPreviewItem {
  readonly name: string;
  readonly description: ReactNode;
}

interface KakaoPreviewListItem {
  readonly title: ReactNode;
  readonly imageFileName: string;
}

interface KakaoPreviewCard {
  readonly id: string;
  readonly header: string;
  readonly body: ReactNode;
  readonly imageFileName: string;
  readonly buttons: readonly string[];
}

interface KakaoFrameProps {
  /** 발신 채널명 — 수신자가 보는 프로필 이름 */
  readonly channelName: string;
  /**
   * 옐로 띠의 태그 — 어느 카카오 상품으로 나가는가.
   * 기본값은 '알림톡' 이라 기존 호출부(발송 템플릿 미리보기)는 그대로 둔다.
   */
  readonly tag?: string;
  /** 강조표기(제목) — 비면 그리지 않는다 */
  readonly emphasis?: ReactNode;
  /** 강조표기의 보조 문구 — 제목 위 작은 줄. 비면 그리지 않는다 */
  readonly subtitle?: ReactNode;
  /** 이미지형의 파일명 — 있으면 말풍선 머리에 이미지 자리를 그린다 */
  readonly imageFileName?: string;
  /** 이미지가 말풍선을 가득 채우는가 — 와이드 이미지형 */
  readonly wideImage?: boolean;
  /** 아이템리스트형의 헤더 — 표 위 굵은 한 줄 */
  readonly itemHeader?: string;
  /** 아이템 하이라이트 — 표 위의 큰 제목·설명 */
  readonly highlightTitle?: ReactNode;
  readonly highlightDescription?: ReactNode;
  /** 아이템리스트형의 행들 — 비면 표째 그리지 않는다 */
  readonly items?: readonly KakaoPreviewItem[];
  /** 와이드 리스트형의 항목들 */
  readonly listItems?: readonly KakaoPreviewListItem[];
  /** 캐러셀형의 카드들 — 있으면 말풍선 대신 가로 카드 줄을 그린다 */
  readonly cards?: readonly KakaoPreviewCard[];
  /** 부가정보 — 버튼 아래 작고 흐린 영역 */
  readonly extraInfo?: string;
  /** 채널 추가 안내 — 부가정보와 같은 영역에 붙는다 */
  readonly channelAddGuide?: string;
  readonly body: ReactNode;
  /** 말풍선 아래 버튼 라벨들 — 없으면 영역째 그리지 않는다 */
  readonly buttons?: readonly string[];
}

/** 버튼 줄 — 말풍선 바닥과 캐러셀 카드 바닥이 같은 모양을 쓴다 */
function ButtonArea({ buttons }: { readonly buttons: readonly string[] }) {
  if (buttons.length === 0) return null;
  return (
    <div style={buttonAreaStyle}>
      {buttons.map((label, index) => (
        // 목업이라 누를 수 없다 — button 이 아니라 div 로 그린다(포커스 순서를 오염시키지 않는다)
        // 같은 이름의 버튼이 둘 있을 수 있어(편집 중에는 흔하다) 라벨만으로는 키가 되지 않는다
        <div key={`${String(index)}-${label}`} style={buttonStyle}>
          {label}
        </div>
      ))}
    </div>
  );
}

/** 말풍선 머리 — 강조표기(제목·보조문구)와 아이템리스트(하이라이트·헤더·표) */
function BubbleHead({
  subtitle,
  emphasis,
  highlightTitle,
  highlightDescription,
  itemHeader,
  items,
}: {
  /* [왜 Pick<KakaoFrameProps, …> 이 아닌가 — exactOptionalPropertyTypes]
     Pick 은 `?` 를 그대로 물려받아 '속성이 없는 것' 만 허용하고 **`undefined` 를 넘기는 것**은
     막는다. 부모는 구조분해한 값을 그대로 넘기므로(없으면 undefined 다) 그 형태가 필요하다.
     그래서 `?` 가 아니라 `| undefined` 로 적는다 — 둘은 이 옵션 아래에서 다른 타입이다. */
  readonly subtitle: ReactNode | undefined;
  readonly emphasis: ReactNode | undefined;
  readonly highlightTitle: ReactNode | undefined;
  readonly highlightDescription: ReactNode | undefined;
  readonly itemHeader: string | undefined;
  readonly items: readonly KakaoPreviewItem[];
}) {
  const hasHighlight = highlightTitle !== undefined || highlightDescription !== undefined;

  return (
    <>
      {subtitle !== undefined && <p style={subtitleStyle}>{subtitle}</p>}
      {emphasis !== undefined && <p style={emphasisStyle}>{emphasis}</p>}

      {/* 아이템 하이라이트 — 표 위에 크게 붙는 제목·설명 */}
      {hasHighlight && (
        <div style={highlightStyle}>
          {highlightTitle !== undefined && (
            <span style={highlightTitleStyle}>{highlightTitle}</span>
          )}
          {highlightDescription !== undefined && (
            <span style={highlightDescriptionStyle}>{highlightDescription}</span>
          )}
        </div>
      )}

      {itemHeader !== undefined && itemHeader.trim() !== '' && (
        <p style={itemHeaderStyle}>{itemHeader}</p>
      )}

      {/* 두 열의 표 — 이 모양이 '항목명은 짧다(6자)' 를 화면에서 설명한다 */}
      {items.length > 0 && (
        <div style={itemTableStyle}>
          {items.map((item, index) => (
            <div key={`${String(index)}-${item.name}`} style={itemRowStyle}>
              <span style={itemNameStyle}>{item.name}</span>
              <span style={itemValueStyle}>{item.description}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * 부가정보·채널추가 안내 — **버튼 아래**에 온다(제작가이드 §1-2 — Description 영역).
 *
 * 본문 옆이 아니라 여기인 것이 요점이다: 운영자가 '본문 뒤에 이어 붙는 문장' 으로 착각해 문맥이
 * 이어지는 글을 적으면, 실제 수신 화면에서는 버튼에 끊겨 뜬금없는 줄이 된다.
 */
function DescriptionArea({
  extraInfo,
  channelAddGuide,
}: {
  /* 위 BubbleHead 와 같은 이유로 `| undefined` 다(exactOptionalPropertyTypes) */
  readonly extraInfo: string | undefined;
  readonly channelAddGuide: string | undefined;
}) {
  const hasExtra = extraInfo !== undefined && extraInfo.trim() !== '';
  const hasGuide = channelAddGuide !== undefined && channelAddGuide.trim() !== '';
  if (!hasExtra && !hasGuide) return null;

  return (
    <div style={descriptionAreaStyle}>
      {hasExtra && <div>{extraInfo}</div>}
      {hasGuide && <div>{channelAddGuide}</div>}
    </div>
  );
}

/**
 * 캐러셀 — 말풍선 하나가 아니라 **카드 줄**이다.
 *
 * 말풍선 안에 우겨넣으면 '가로로 넘긴다' 는 이 유형의 유일한 특징이 사라지고 와이드 리스트형과
 * 똑같아 보인다. 그래서 본문 말풍선과 카드 줄을 따로 그린다.
 */
function CarouselRow({
  cards,
  body,
}: {
  readonly cards: readonly KakaoPreviewCard[];
  readonly body: ReactNode;
}) {
  return (
    <>
      <div style={bubbleStyle}>
        <div style={bubbleBodyStyle}>
          <div style={textStyle}>{body}</div>
        </div>
      </div>
      <div style={carouselStyle}>
        {cards.map((card) => (
          <div key={card.id} style={carouselCardStyle}>
            {card.imageFileName.trim() !== '' && (
              <div style={imageSlotStyle}>{card.imageFileName}</div>
            )}
            <div style={carouselBodyStyle}>
              {card.header.trim() !== '' && <p style={carouselHeaderStyle}>{card.header}</p>}
              {card.body}
            </div>
            <ButtonArea buttons={card.buttons} />
          </div>
        ))}
      </div>
    </>
  );
}

/** 와이드 리스트형 — 항목마다 썸네일 + 제목 한 줄 */
function ListRows({ listItems }: { readonly listItems: readonly KakaoPreviewListItem[] }) {
  if (listItems.length === 0) return null;
  return (
    <div style={listStyle}>
      {listItems.map((item, index) => (
        <div key={`${String(index)}-${item.imageFileName}`} style={listRowStyle}>
          <span style={listThumbStyle}>{item.imageFileName === '' ? '이미지' : ''}</span>
          <span style={listTitleStyle}>{item.title}</span>
        </div>
      ))}
    </div>
  );
}

export function KakaoFrame({
  channelName,
  tag = DEFAULT_TAG,
  emphasis,
  subtitle,
  imageFileName,
  wideImage = false,
  itemHeader,
  highlightTitle,
  highlightDescription,
  items = [],
  listItems = [],
  cards = [],
  extraInfo,
  channelAddGuide,
  body,
  buttons = [],
}: KakaoFrameProps) {
  const hasImage = imageFileName !== undefined && imageFileName.trim() !== '';

  return (
    <div style={frameStyle} aria-label={`카카오 ${tag} 미리보기`}>
      <div style={barStyle}>
        <span style={barTagStyle}>{tag}</span>
        <span>{channelName}</span>
      </div>

      <div style={chatStyle}>
        {cards.length > 0 ? (
          <CarouselRow cards={cards} body={body} />
        ) : (
          <div style={bubbleStyle}>
            {hasImage && (
              <div style={wideImage ? wideImageSlotStyle : imageSlotStyle}>{imageFileName}</div>
            )}

            <div style={bubbleBodyStyle}>
              <BubbleHead
                subtitle={subtitle}
                emphasis={emphasis}
                highlightTitle={highlightTitle}
                highlightDescription={highlightDescription}
                itemHeader={itemHeader}
                items={items}
              />
              <div style={textStyle}>{body}</div>
            </div>

            <ListRows listItems={listItems} />
            <ButtonArea buttons={buttons} />
            <DescriptionArea extraInfo={extraInfo} channelAddGuide={channelAddGuide} />
          </div>
        )}
      </div>
    </div>
  );
}
