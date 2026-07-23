// 자료 카드 미리보기
//
// 폼 입력을 고객센터 자료실에 보일 카드 모양으로 실시간 반영한다. 도메인 값을 그대로 받아 표시만 한다.
import type { CSSProperties } from 'react';

import { Icon, StatusBadge } from '../../../../shared/ui';
import { fileKindLabel, fileKindOf, formatBytes, visibilityLabel, visibilityTone } from '../types';
import { cssVar } from '@tds/ui';

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const headStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.title.md.font-size'),
  fontWeight: cssVar('typography.title.md.font-weight'),
  lineHeight: cssVar('typography.title.md.line-height'),
  overflowWrap: 'anywhere',
};

const fileRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  overflowWrap: 'anywhere',
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  fontVariantNumeric: 'tabular-nums',
};

interface DownloadPreviewProps {
  readonly title: string;
  readonly categoryLabel: string;
  readonly version: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly visible: boolean;
}

export function DownloadPreview({
  title,
  categoryLabel,
  version,
  fileName,
  fileSize,
  visible,
}: DownloadPreviewProps) {
  return (
    <div style={cardStyle}>
      <div style={headStyle}>
        <StatusBadge tone="info" label={categoryLabel === '' ? '카테고리 미지정' : categoryLabel} />
        {version.trim() !== '' && <StatusBadge tone="neutral" label={version} />}
        <StatusBadge tone={visibilityTone(visible)} label={visibilityLabel(visible)} />
      </div>
      <h3 style={titleStyle}>{title.trim() === '' ? '제목을 입력하세요' : title}</h3>
      {fileName.trim() === '' ? (
        <span style={mutedStyle}>첨부 파일이 없어요.</span>
      ) : (
        <span style={fileRowStyle}>
          <Icon name="download" />
          {`${fileName} · ${fileKindLabel(fileKindOf(fileName))} · ${formatBytes(fileSize)}`}
        </span>
      )}
    </div>
  );
}
