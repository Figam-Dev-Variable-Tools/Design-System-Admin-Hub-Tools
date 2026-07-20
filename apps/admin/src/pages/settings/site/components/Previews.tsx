// 미리보기 목업 — 브라우저 탭 / 공유 카드(OG) (사이트 설정 전용)
//
// [왜 미리보기가 있는가] 파비콘과 대표 이미지는 **이 화면 밖에서만** 보인다 — 브라우저 탭, 카카오톡·
// Facebook 의 링크 카드. 그래서 파일명만 보여 주면 운영자는 결과를 상상해야 한다. 목업은 그 상상을
// 없앤다. 특히 OG 카드는 위 섹션의 사이트 이름·설명을 **실시간으로** 받아 그린다 — 이름을 고치는
// 순간 공유 카드가 어떻게 바뀌는지가 같은 화면에서 보인다. 그 연결이 이 목업의 존재 이유다.
//
// [a11y] 목업은 **장식**이다. 안의 글자는 전부 위쪽 입력 필드의 값을 되풀이한 것이라, 스크린리더가
// 읽으면 같은 문장을 두 번 듣게 된다. 그래서 목업 본체는 aria-hidden 이고, 무엇을 보여 주는
// 자리인지는 그 **바깥의 캡션**이 말한다(캡션은 숨기지 않는다).
//
// [모든 시각 값은 토큰 CSS 변수] 하드코딩 hex/px 0건.
import type { CSSProperties } from 'react';
import { cssVar } from '@tds/ui';

const figureStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  minWidth: 0,
};

const captionStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

/* ── 브라우저 탭 목업 ──────────────────────────────────────────────────────── */

const chromeStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  maxWidth: 'calc(var(--tds-space-10) * 7)',
  minWidth: 0,
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const tabStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  maxWidth: 'calc(var(--tds-space-10) * 4)',
  minWidth: 0,
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderTopLeftRadius: cssVar('radius.md'),
  borderTopRightRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

const tabIconStyle: CSSProperties = {
  width: cssVar('space.4'),
  height: cssVar('space.4'),
  flexShrink: 0,
  borderRadius: cssVar('radius.sm'),
  objectFit: 'cover',
};

/** 파비콘이 없을 때 탭에 들어가는 빈 사각형 — 실제 브라우저도 회색 자리를 남긴다 */
const tabIconEmptyStyle: CSSProperties = {
  ...tabIconStyle,
  display: 'inline-block',
  background: cssVar('color.surface.disabled'),
};

const tabTitleStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const addressBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

interface BrowserTabPreviewProps {
  readonly faviconUrl: string;
  readonly siteName: string;
  readonly siteUrl: string;
}

/** 방문자의 브라우저 탭 — 파비콘 + 사이트 이름, 그 아래 주소창 */
export function BrowserTabPreview({ faviconUrl, siteName, siteUrl }: BrowserTabPreviewProps) {
  return (
    <figure style={figureStyle}>
      <figcaption style={captionStyle}>브라우저 탭 미리보기</figcaption>

      <div style={chromeStyle} aria-hidden="true">
        <div style={tabStyle}>
          {faviconUrl === '' ? (
            <span style={tabIconEmptyStyle} />
          ) : (
            <img src={faviconUrl} alt="" style={tabIconStyle} />
          )}
          <span style={tabTitleStyle}>{siteName === '' ? '사이트 이름' : siteName}</span>
        </div>
        <div style={addressBarStyle}>{siteUrl}</div>
      </div>
    </figure>
  );
}

/* ── 공유 카드(OG) 목업 ────────────────────────────────────────────────────── */

const ogCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  maxWidth: 'calc(var(--tds-space-10) * 6)',
  minWidth: 0,
  boxSizing: 'border-box',
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const ogImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  // 링크 카드의 관례 비율(가로가 세로의 약 2배) — 토큰에 없는 파생 치수라 space 배수로 못박는다
  height: 'calc(var(--tds-space-10) * 2)',
  objectFit: 'cover',
  background: cssVar('color.surface.disabled'),
};

const ogImageEmptyStyle: CSSProperties = {
  ...ogImageStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
};

const ogBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
};

const ogTitleStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const ogDescriptionStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const ogUrlStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

interface OgCardPreviewProps {
  readonly imageUrl: string;
  readonly siteName: string;
  readonly siteDescription: string;
  readonly siteUrl: string;
}

/**
 * 링크를 공유했을 때 상대가 보는 카드 — 이미지 + 사이트 이름 + 설명 + 주소.
 * 이름·설명은 위 섹션의 입력을 그대로 받는다(실시간 반영).
 */
export function OgCardPreview({
  imageUrl,
  siteName,
  siteDescription,
  siteUrl,
}: OgCardPreviewProps) {
  return (
    <figure style={figureStyle}>
      <figcaption style={captionStyle}>공유 카드 미리보기 (카카오톡 · Facebook 등)</figcaption>

      <div style={ogCardStyle} aria-hidden="true">
        {imageUrl === '' ? (
          <span style={ogImageEmptyStyle}>대표 이미지가 없습니다</span>
        ) : (
          <img src={imageUrl} alt="" style={ogImageStyle} />
        )}
        <div style={ogBodyStyle}>
          <span style={ogTitleStyle}>{siteName === '' ? '사이트 이름' : siteName}</span>
          <span style={ogDescriptionStyle}>
            {siteDescription === '' ? '사이트 설명이 비어 있습니다.' : siteDescription}
          </span>
          <span style={ogUrlStyle}>{siteUrl}</span>
        </div>
      </div>
    </figure>
  );
}
