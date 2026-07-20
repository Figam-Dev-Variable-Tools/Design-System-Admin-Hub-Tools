// 배너 실시간 미리보기 (오너 피드백 ⑤)
//
// 팝업과 같은 결이되 배너는 '가로로 긴 띠'다 — 넓은 이미지 스트립 + 제목 + 링크로 보여준다.
// 배너 화면 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { Icon } from '../../../../shared/ui';
import { cssVar } from '@tds/ui';

const stageStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const stripStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  boxSizing: 'border-box',
  width: '100%',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

// 배너는 가로로 긴 띠 — 이미지를 넓고 낮게 cover 한다
const imageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'calc(var(--tds-space-6) * 4)',
  objectFit: 'cover',
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
};

const imagePlaceholderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  boxSizing: 'border-box',
  width: '100%',
  height: 'calc(var(--tds-space-6) * 4)',
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.sm'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const placeholderIconStyle: CSSProperties = {
  display: 'inline-flex',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
  overflowWrap: 'anywhere',
};

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('component.button.radius'),
  background: cssVar('component.button.background'),
  color: cssVar('component.button.text'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-typography-label-sm-font-weight)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
  whiteSpace: 'nowrap',
};

const captionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

interface BannerPreviewProps {
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly placementLabel: string;
  readonly enabled: boolean;
}

export function BannerPreview({
  title,
  imageUrl,
  linkUrl,
  placementLabel,
  enabled,
}: BannerPreviewProps) {
  const trimmedImage = imageUrl.trim();
  const trimmedLink = linkUrl.trim();
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [trimmedImage]);

  return (
    <div>
      <div style={stageStyle}>
        <div style={{ ...stripStyle, opacity: enabled ? 1 : 0.55 }}>
          {trimmedImage !== '' && !loadFailed ? (
            <img src={trimmedImage} alt="" style={imageStyle} onError={() => setLoadFailed(true)} />
          ) : (
            <div style={imagePlaceholderStyle}>
              <span style={placeholderIconStyle} aria-hidden="true">
                <Icon name="image" />
              </span>
              <span>{loadFailed ? '이미지를 불러오지 못했습니다' : '이미지 미리보기'}</span>
            </div>
          )}

          <div style={rowStyle}>
            <h3 style={titleStyle}>{title.trim() === '' ? '배너 제목' : title}</h3>
            {trimmedLink !== '' && <span style={linkButtonStyle}>바로가기</span>}
          </div>
        </div>
      </div>

      <p style={captionStyle}>
        <span>{placementLabel} 영역에 노출</span>
        <span aria-hidden="true">·</span>
        <span>{enabled ? '노출 ON' : '노출 OFF (저장해도 사용자에게 보이지 않습니다)'}</span>
      </p>
    </div>
  );
}
