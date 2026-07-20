// 리뷰 고객 화면 미리보기 (오너 지시 — 고객 화면 렌더 확인)
//
// 상세에서 리뷰가 고객 상품 페이지에 어떻게 보이는지 그대로 비춘다 — 별점·작성자·작성일·본문·
// 포토리뷰·판매자 답변. 리뷰 상세 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import type { CSSProperties } from 'react';

import { ImageThumb } from '../../../../shared/ui';
import { starText } from '../types';
import type { ReviewRating } from '../types';
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

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  boxSizing: 'border-box',
  width: '100%',
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

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const starStyle: CSSProperties = {
  color: cssVar('color.feedback.warning.text'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  letterSpacing: '0.1em',
};

const authorStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
};

const contentStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const photoRowStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const replyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const replyLabelStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const replyTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const hiddenNoteStyle: CSSProperties = {
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
};

interface ReviewPreviewProps {
  readonly author: string;
  readonly rating: ReviewRating;
  readonly createdAt: string;
  readonly content: string;
  readonly imageUrls: readonly string[];
  readonly reply: string;
  readonly visible: boolean;
}

export function ReviewPreview({
  author,
  rating,
  createdAt,
  content,
  imageUrls,
  reply,
  visible,
}: ReviewPreviewProps) {
  return (
    <div style={stageStyle}>
      <div style={{ ...cardStyle, opacity: visible ? 1 : 0.55 }}>
        <div style={headRowStyle}>
          <span style={starStyle} role="img" aria-label={`5점 만점에 ${String(rating)}점`}>
            {starText(rating)}
          </span>
          <span style={authorStyle}>
            {author} · {createdAt}
          </span>
        </div>

        <p style={contentStyle}>{content.trim() === '' ? '리뷰 내용' : content}</p>

        {imageUrls.length > 0 && (
          <div style={photoRowStyle}>
            {imageUrls.map((url, index) => (
              <ImageThumb
                key={`${url}-${String(index)}`}
                src={url}
                alt={`포토리뷰 ${String(index + 1)}`}
              />
            ))}
          </div>
        )}

        {reply.trim() !== '' && (
          <div style={replyStyle}>
            <span style={replyLabelStyle}>판매자 답변</span>
            <p style={replyTextStyle}>{reply}</p>
          </div>
        )}
      </div>

      {!visible && <p style={hiddenNoteStyle}>숨김 상태 — 고객 상품 페이지에 노출되지 않습니다.</p>}
    </div>
  );
}
