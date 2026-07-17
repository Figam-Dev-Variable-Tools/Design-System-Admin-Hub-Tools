// 팝업 실시간 미리보기 (오너 피드백 ⑤)
//
// 왼쪽 입력이 바뀌면 오른쪽에서 실제 팝업처럼 즉시 반영한다 — 이미지·제목·링크·노출 위치·ON/OFF.
// 이미지 URL 이 이미지를 가리키지 않으면 자리표시로 대체한다(ImageUploadField 와 같은 결).
// 팝업 화면 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { CloseIcon, ImageIcon } from '../../../../shared/ui';

const stageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 'calc(var(--tds-space-6) * 9)',
  paddingTop: 'var(--tds-space-5)',
  paddingBottom: 'var(--tds-space-5)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderStyle: 'dashed',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

const cardStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: 'calc(var(--tds-space-6) * 11)',
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-4)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-lg)',
  background: 'var(--tds-color-surface-default)',
};

const closeStyle: CSSProperties = {
  position: 'absolute',
  top: 'var(--tds-space-2)',
  right: 'var(--tds-space-2)',
  display: 'inline-flex',
  color: 'var(--tds-color-text-muted)',
};

const imageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxHeight: 'calc(var(--tds-space-6) * 7)',
  objectFit: 'cover',
  borderRadius: 'var(--tds-radius-md)',
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
  minHeight: 'calc(var(--tds-space-6) * 5)',
  borderStyle: 'dashed',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  textAlign: 'center',
};

const placeholderIconStyle: CSSProperties = {
  display: 'inline-flex',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
};

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 'calc(var(--tds-space-5))',
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
  justifyContent: 'center',
  gap: 'var(--tds-space-1)',
  alignSelf: 'flex-start',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderRadius: 'var(--tds-component-button-radius)',
  background: 'var(--tds-component-button-background)',
  color: 'var(--tds-component-button-text)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  overflowWrap: 'anywhere',
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

interface PopupPreviewProps {
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly positionLabel: string;
  readonly enabled: boolean;
}

export function PopupPreview({
  title,
  imageUrl,
  linkUrl,
  positionLabel,
  enabled,
}: PopupPreviewProps) {
  const trimmedImage = imageUrl.trim();
  const trimmedLink = linkUrl.trim();
  const [loadFailed, setLoadFailed] = useState(false);

  // URL 이 바뀌면 실패 상태를 초기화한다 — 새 주소는 다시 시도해 봐야 한다
  useEffect(() => {
    setLoadFailed(false);
  }, [trimmedImage]);

  return (
    <div>
      <div style={stageStyle}>
        <div style={{ ...cardStyle, opacity: enabled ? 1 : 0.55 }}>
          <span style={closeStyle} aria-hidden="true">
            <CloseIcon />
          </span>

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

          <h3 style={titleStyle}>{title.trim() === '' ? '팝업 제목' : title}</h3>

          {trimmedLink !== '' && <span style={linkButtonStyle}>자세히 보기</span>}
        </div>
      </div>

      <p style={captionStyle}>
        <span>{positionLabel} 에 노출</span>
        <span aria-hidden="true">·</span>
        <span>{enabled ? '노출 ON' : '노출 OFF (저장해도 사용자에게 보이지 않습니다)'}</span>
      </p>
    </div>
  );
}
