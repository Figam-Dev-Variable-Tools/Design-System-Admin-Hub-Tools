// 배너 실시간 미리보기 (오너 피드백 ⑤)
//
// 팝업과 같은 결이되 배너는 '가로로 긴 띠'다 — 넓은 이미지 스트립 + 제목 + 링크로 보여준다.
// 배너 화면 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { ImageIcon } from '../../../../shared/ui';

const stageStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-4)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderStyle: 'dashed',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

const stripStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  boxSizing: 'border-box',
  width: '100%',
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-default)',
};

// 배너는 가로로 긴 띠 — 이미지를 넓고 낮게 cover 한다
const imageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'calc(var(--tds-space-6) * 4)',
  objectFit: 'cover',
  borderRadius: 'var(--tds-radius-sm)',
  background: 'var(--tds-color-surface-raised)',
};

const imagePlaceholderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--tds-space-1)',
  boxSizing: 'border-box',
  width: '100%',
  height: 'calc(var(--tds-space-6) * 4)',
  borderStyle: 'dashed',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-sm)',
  color: 'var(--tds-color-text-muted)',
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
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
  overflowWrap: 'anywhere',
};

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderRadius: 'var(--tds-component-button-radius)',
  background: 'var(--tds-component-button-background)',
  color: 'var(--tds-component-button-text)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-typography-label-sm-font-weight)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
  whiteSpace: 'nowrap',
};

const captionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  marginTop: 'var(--tds-space-3)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
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
                <ImageIcon />
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
