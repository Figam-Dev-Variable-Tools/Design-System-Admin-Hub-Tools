// 팝업 실시간 미리보기 (오너 피드백 ⑤)
//
// 왼쪽 입력이 바뀌면 오른쪽에서 실제 팝업처럼 즉시 반영한다 — 이미지·제목·링크·노출 위치·ON/OFF.
// 이미지 URL 이 이미지를 가리키지 않으면 자리표시로 대체한다(ImageUploadField 와 같은 결).
// 팝업 화면 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { Icon } from '../../../../shared/ui';
import { cssVar, typography } from '@tds/ui';

const stageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: `calc(${cssVar('space.6')} * 9)`,
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const cardStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: `calc(${cssVar('space.6')} * 11)`,
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const closeStyle: CSSProperties = {
  position: 'absolute',
  top: cssVar('space.2'),
  right: cssVar('space.2'),
  display: 'inline-flex',
  color: cssVar('color.text.muted'),
};

const imageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxHeight: `calc(${cssVar('space.6')} * 7)`,
  objectFit: 'cover',
  borderRadius: cssVar('radius.md'),
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
  minHeight: `calc(${cssVar('space.6')} * 5)`,
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
  textAlign: 'center',
};

const placeholderIconStyle: CSSProperties = {
  display: 'inline-flex',
  fontSize: cssVar('typography.title.lg.font-size'),
};

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: `calc(${cssVar('space.5')})`,
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
  overflowWrap: 'anywhere',
};

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  alignSelf: 'flex-start',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderRadius: cssVar('component.button.radius'),
  background: cssVar('component.button.background'),
  color: cssVar('component.button.text'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('typography.label.md.font-weight'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
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
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
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
            <Icon name="close" />
          </span>

          {trimmedImage !== '' && !loadFailed ? (
            <img src={trimmedImage} alt="" style={imageStyle} onError={() => setLoadFailed(true)} />
          ) : (
            <div style={imagePlaceholderStyle}>
              <span style={placeholderIconStyle} aria-hidden="true">
                <Icon name="image" />
              </span>
              <span>{loadFailed ? '이미지를 불러오지 못했어요' : '이미지 미리보기'}</span>
            </div>
          )}

          <h3 style={titleStyle}>{title.trim() === '' ? '팝업 제목' : title}</h3>

          {trimmedLink !== '' && <span style={linkButtonStyle}>자세히 보기</span>}
        </div>
      </div>

      <p style={captionStyle}>
        <span>{positionLabel} 에 노출</span>
        <span aria-hidden="true">·</span>
        <span>{enabled ? '노출 ON' : '노출 OFF (저장해도 사용자에게 보이지 않아요)'}</span>
      </p>
    </div>
  );
}
