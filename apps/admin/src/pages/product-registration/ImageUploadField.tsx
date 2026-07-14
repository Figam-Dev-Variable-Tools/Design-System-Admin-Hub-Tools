// 이미지 업로드 위젯 (SCR-003 §3.1) — 드롭존 + 파일 선택 + 파일별 진행/실패/삭제.
//
// a11y: 드롭존은 role="button" + tabIndex로 키보드 접근 가능(Enter·Space로 파일 대화상자 열기).
//       파일 목록은 role="list", 진행률은 role="progressbar"로 노출한다.
import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import {
  dropzoneStyle,
  errorTextStyle,
  hintStyle,
  imageActionsStyle,
  imageListStyle,
  imageMetaStyle,
  imageNameStyle,
  imageRowStyle,
  progressBarStyle,
  progressTrackStyle,
  thumbnailFallbackStyle,
  thumbnailStyle,
  visuallyHiddenStyle,
} from './styles';
import { Badge, Button } from './ui';
import type { ImageItem, ImageUploads } from './useImageUploads';
import { IMAGE_ACCEPTED_TYPES, IMAGE_MAX_COUNT } from './validation';

/** §3.1 대기(선택 전) 상태의 고정 안내 문구 */
const UPLOAD_HINT = 'JPG·PNG·WebP, 1장당 5MB 이하, 최대 5장';

interface ImageUploadFieldProps {
  uploads: ImageUploads;
  /** 제출/임시저장 진행 중에는 전 입력 요소 비활성(§3 등록-로딩) */
  disabled: boolean;
  /** 필드 단위 에러(§5.2 이미지 필수·장수) */
  error?: string | undefined;
  /** 드롭존 id — 제출 시 첫 위반 필드 포커스 이동 대상 */
  dropzoneId: string;
  hintId: string;
  errorId: string;
  labelId: string;
}

/** 섬네일 — 복원된 임시저장본의 URL이 만료된 경우 대체 표시로 전환한다 */
function Thumbnail({ item }: { item: ImageItem }) {
  const [broken, setBroken] = useState(false);
  if (item.previewUrl.length === 0 || broken) {
    return (
      <span style={thumbnailFallbackStyle} aria-hidden="true">
        이미지
      </span>
    );
  }
  return (
    <img
      src={item.previewUrl}
      alt={`${item.name} 미리보기`}
      style={thumbnailStyle}
      onError={() => {
        setBroken(true);
      }}
    />
  );
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toString()}KB`;
}

export default function ImageUploadField({
  uploads,
  disabled,
  error,
  dropzoneId,
  hintId,
  errorId,
  labelId,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openPicker();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const { files } = event.dataTransfer;
    if (files.length > 0) uploads.addFiles(files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setDragActive(true);
  };

  const describedBy = [hintId, error === undefined ? null : errorId]
    .filter((id): id is string => id !== null)
    .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tds-space-3)' }}>
      <div
        id={dropzoneId}
        className="tds-pr-focusable"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={labelId}
        // 오류는 aria-describedby 로 읽힌다(describedBy 가 errorId 를 포함한다).
        // aria-invalid 는 role="button" 이 지원하지 않아 보조기술이 무시한다 —
        // 달아 두면 '상태를 알린다'는 착각만 남는다 (jsx-a11y/role-supports-aria-props).
        aria-describedby={describedBy}
        aria-disabled={disabled}
        style={dropzoneStyle(dragActive, disabled)}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={() => {
          setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <strong>이미지를 여기에 끌어다 놓거나 눌러서 파일을 선택하세요</strong>
        <span style={hintStyle} id={hintId}>
          {UPLOAD_HINT}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_ACCEPTED_TYPES.join(',')}
        style={visuallyHiddenStyle}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={(event) => {
          const { files } = event.target;
          if (files && files.length > 0) uploads.addFiles(files);
          // 같은 파일 재선택이 가능하도록 값 초기화
          event.target.value = '';
        }}
      />

      {uploads.selectionError === null ? null : (
        <p style={errorTextStyle} role="alert">
          오류: {uploads.selectionError}
        </p>
      )}

      {uploads.items.length === 0 ? null : (
        <ul
          style={imageListStyle}
          aria-label={`업로드한 이미지 (최대 ${String(IMAGE_MAX_COUNT)}장)`}
        >
          {uploads.items.map((item, index) => {
            const isPrimary = item.status === 'success' && index === 0;
            return (
              <li key={item.key} style={imageRowStyle}>
                <Thumbnail item={item} />
                <div style={imageMetaStyle}>
                  <span style={imageNameStyle} title={item.name}>
                    {item.name}
                    {formatSize(item.size).length === 0 ? '' : ` (${formatSize(item.size)})`}
                  </span>

                  {item.status === 'uploading' ? (
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.progress}
                      aria-label={`${item.name} 업로드 진행률`}
                      style={progressTrackStyle}
                    >
                      <div style={progressBarStyle(item.progress)} />
                    </div>
                  ) : null}

                  {item.status === 'error' && item.error !== null ? (
                    <span style={errorTextStyle} role="alert">
                      오류: {item.error}
                    </span>
                  ) : null}

                  {isPrimary ? <Badge>대표</Badge> : null}
                </div>

                <div style={imageActionsStyle}>
                  {item.status === 'uploading' ? (
                    <Button
                      variant="text"
                      onClick={() => {
                        uploads.cancel(item.key);
                      }}
                      ariaLabel={`${item.name} 업로드 취소`}
                    >
                      취소
                    </Button>
                  ) : null}
                  {item.status === 'error' && !item.restored ? (
                    <Button
                      variant="text"
                      disabled={disabled}
                      onClick={() => {
                        uploads.retry(item.key);
                      }}
                      ariaLabel={`${item.name} 다시 시도`}
                    >
                      다시 시도
                    </Button>
                  ) : null}
                  {item.status === 'uploading' ? null : (
                    <Button
                      variant="text"
                      disabled={disabled}
                      onClick={() => {
                        uploads.remove(item.key);
                      }}
                      ariaLabel={`${item.name} 삭제`}
                    >
                      삭제
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
