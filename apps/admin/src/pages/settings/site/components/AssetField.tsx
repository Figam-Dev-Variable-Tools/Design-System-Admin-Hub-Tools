// 자산 한 자리 — 지금 걸린 파일 칩 + 드롭존 + 실패 문구 (사이트 설정 전용)
//
// 파비콘·대표 이미지·비공개용 이미지가 같은 골격을 쓴다. 다른 것은 안내 문구와 accept 뿐이다.
// 업로드 순서·검증은 이 컴포넌트가 아니라 useAssetUpload 가 소유한다 — 여기는 **보여 주기만** 한다.
import type { CSSProperties } from 'react';

// FileChip · FileDropzone 은 @tds/ui 의 것이다 (File 승격) — 승격된 DS 컴포넌트는 앱 배럴을
// 거치지 않고 public entry 에서 직접 가져온다 (Tabs·SegmentedControl·Empty 선례 · shared/ui README 규칙 7).
import { cssVar, FileChip, FileDropzone } from '@tds/ui';

import { errorTextStyle } from '../../../../shared/ui';
import type { SiteAsset } from '../validation';

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const busyStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

interface AssetFieldProps {
  readonly label: string;
  readonly asset: SiteAsset;
  /** 드롭존 1차 안내 — 화면 문구가 자리마다 다르다 */
  readonly dropTitle: string;
  /** 드롭존 형식·크기 안내 */
  readonly dropMeta: string;
  readonly accept: string;
  readonly disabled: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  /** 오류/진행 문단의 id — 드롭존이 aria-describedby 로 잇는다 */
  readonly messageId: string;
  /** 오류가 없을 때 이을 설명 문단의 id (왼쪽 라벨 열의 힌트) */
  readonly hintId?: string | undefined;
  readonly onSelect: (file: File) => void;
  readonly onRemove: () => void;
}

export function AssetField({
  label,
  asset,
  dropTitle,
  dropMeta,
  accept,
  disabled,
  busy,
  error,
  messageId,
  hintId,
  onSelect,
  onRemove,
}: AssetFieldProps) {
  const invalid = error !== null;
  // 오류·진행 문구가 있으면 그것을, 없으면 왼쪽 열의 설명을 읽어 준다
  const describedBy = invalid || busy ? messageId : hintId;

  return (
    <>
      <div style={rowStyle}>
        {asset !== null && (
          <FileChip
            src={asset.url}
            name={asset.name}
            size={asset.size}
            disabled={disabled || busy}
            onRemove={onRemove}
          />
        )}
        <FileDropzone
          label={label}
          title={dropTitle}
          meta={dropMeta}
          accept={accept}
          disabled={disabled || busy}
          isInvalid={invalid}
          {...(describedBy === undefined ? {} : { describedBy })}
          onSelect={onSelect}
        />
      </div>

      {invalid ? (
        <p id={messageId} role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : (
        busy && (
          <p id={messageId} style={busyStyle}>
            올리는 중이에요…
          </p>
        )
      )}
    </>
  );
}
