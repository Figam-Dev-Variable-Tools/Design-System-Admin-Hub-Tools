// 다중 이미지 업로드(갤러리) 필드 (A41 소유 — apps/admin/src/shared/ui/**)
//
// 단일 ImageUploadField 와 같은 메커니즘(드래그드롭·파일 선택·object URL 프리뷰·클라이언트 검증)을
// 여러 장으로 확장한다. 값(values)은 이미지 URL **배열**이다(업로드 결과, mock 은 object/data URL).
//   TODO(backend): POST /api/uploads (다중) — 저장 시 어댑터가 파일들을 올리고 URL 배열로 교체한다.
//
// [백엔드 없음] 실제 업로드는 없다. 프리뷰는 그리드, 각 타일에 개별 제거 버튼. 순서는 추가 순서 유지.
// [검증] image/* · 파일당 용량 상한 · 개수 상한(maxFiles). 위반은 인라인 오류(토스트 아님).
// [접근성] 추가 영역은 버튼(키보드로 파일 선택), 각 제거 버튼은 focusable + aria-label. placeholder 는 장식.
// [누수 방지] 우리가 만든 object URL 만 추적해 제거/언마운트 시 revoke 한다.
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent } from 'react';

import { CheckCircleIcon, CloseIcon, ImageIcon, UploadIcon } from './icons';
import { imageFileError } from './imageFile';
import { errorIdOf, hintIdOf } from './FormField';
import {
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  hintStyle,
  visuallyHiddenStyle,
} from './styles';

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_SIZE_MB = 5;

const TILE_HEIGHT = 'calc(var(--tds-space-6) * 4)';

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-2)',
};

const labelStyle: CSSProperties = {
  ...fieldLabelStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

const requiredMarkStyle: CSSProperties = { color: 'var(--tds-color-feedback-danger-text)' };

const counterStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  ...hintStyle,
  fontVariantNumeric: 'tabular-nums',
};

// 완료 피드백 — 한 장이라도 담기면 카운터 앞에 성공 색 체크를 붙인다
const counterDoneStyle: CSSProperties = {
  display: 'inline-flex',
  color: 'var(--tds-color-feedback-success-text)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: 'var(--tds-space-3)',
};

const tileStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  height: TILE_HEIGHT,
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
  overflow: 'hidden',
};

const tileImageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const tileIconStyle: CSSProperties = {
  display: 'inline-flex',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  color: 'var(--tds-color-text-muted)',
};

const removeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 'var(--tds-space-1)',
  right: 'var(--tds-space-1)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 'var(--tds-space-1)',
  paddingRight: 'var(--tds-space-1)',
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-surface-default)',
  color: 'var(--tds-color-feedback-danger-text)',
  cursor: 'pointer',
};

// 드롭존 카드 — 기본/hover/드래그오버/오류 4상태. tile=true 는 그리드 안의 작은 '추가' 칸.
// (인라인 스타일이 CSS :hover 를 이기므로 hover 는 상태값으로 계산한다.)
function zoneStyle(
  active: boolean,
  hovered: boolean,
  invalid: boolean,
  disabled: boolean,
  tile: boolean,
): CSSProperties {
  const borderColor = active
    ? 'var(--tds-color-border-focus)'
    : invalid
      ? 'var(--tds-color-feedback-danger-border)'
      : hovered && !disabled
        ? 'var(--tds-color-action-primary-hover)'
        : 'var(--tds-color-border-default)';
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tile ? 'var(--tds-space-1)' : 'var(--tds-space-2)',
    boxSizing: 'border-box',
    width: '100%',
    minHeight: tile ? TILE_HEIGHT : 'calc(var(--tds-space-6) * 5)',
    height: tile ? TILE_HEIGHT : undefined,
    paddingTop: 'var(--tds-space-3)',
    paddingBottom: 'var(--tds-space-3)',
    paddingLeft: 'var(--tds-space-3)',
    paddingRight: 'var(--tds-space-3)',
    borderStyle: 'dashed',
    borderWidth:
      invalid || active ? 'var(--tds-border-width-medium)' : 'var(--tds-border-width-thin)',
    borderColor,
    borderRadius: 'var(--tds-radius-md)',
    background: active ? 'var(--tds-color-surface-default)' : 'var(--tds-color-surface-raised)',
    color: 'var(--tds-color-text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'center',
    transition:
      'border-color var(--tds-motion-duration-fast), background-color var(--tds-motion-duration-fast)',
  };
}

// 아이콘을 담는 둥근 배지 — 빈 드롭존에 초점을 준다(장식, aria-hidden)
const iconBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'calc(var(--tds-space-6) * 1.75)',
  height: 'calc(var(--tds-space-6) * 1.75)',
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-surface-default)',
  color: 'var(--tds-color-action-primary-default)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
};

// '추가' 칸의 작은 아이콘(배지 없이 인라인)
const iconWrapStyle: CSSProperties = {
  display: 'inline-flex',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  color: 'var(--tds-color-text-muted)',
};

const zoneTitleStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const zoneHintStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

function GalleryTile({ src, alt }: { readonly src: string; readonly alt: string }) {
  const [failed, setFailed] = useState(false);
  const trimmed = src.trim();
  useEffect(() => setFailed(false), [trimmed]);
  if (trimmed === '' || failed) {
    return (
      <span style={tileIconStyle} role="img" aria-label={alt}>
        <ImageIcon aria-hidden="true" />
      </span>
    );
  }
  return <img src={trimmed} alt={alt} style={tileImageStyle} onError={() => setFailed(true)} />;
}

interface ImageGalleryFieldProps {
  readonly label: string;
  readonly values: readonly string[];
  readonly onChange: (values: readonly string[]) => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly maxFiles?: number;
  readonly maxSizeMB?: number;
}

export function ImageGalleryField({
  label,
  values,
  onChange,
  required = false,
  disabled = false,
  error,
  hint,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
}: ImageGalleryFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 우리가 만든 object URL 만 추적 — 제거/언마운트 시 이것만 revoke 한다
  const createdRef = useRef<Set<string>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = error ?? localError ?? undefined;
  const invalid = shownError !== undefined && shownError !== '';
  const full = values.length >= maxFiles;

  useEffect(
    () => () => {
      for (const url of createdRef.current) URL.revokeObjectURL(url);
      createdRef.current.clear();
    },
    [],
  );

  const addFiles = (fileList: FileList) => {
    if (disabled) return;
    const remaining = maxFiles - values.length;
    if (remaining <= 0) {
      setLocalError(`이미지는 최대 ${String(maxFiles)}장까지 등록할 수 있습니다.`);
      return;
    }
    const accepted: string[] = [];
    let nextError: string | null = null;
    for (const file of Array.from(fileList)) {
      if (accepted.length >= remaining) {
        nextError = `이미지는 최대 ${String(maxFiles)}장까지 등록할 수 있습니다.`;
        break;
      }
      const fileError = imageFileError(file, maxSizeMB);
      if (fileError !== null) {
        nextError = fileError;
        continue;
      }
      const url = URL.createObjectURL(file);
      createdRef.current.add(url);
      accepted.push(url);
    }
    setLocalError(nextError);
    if (accepted.length > 0) onChange([...values, ...accepted]);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files !== null && event.target.files.length > 0) addFiles(event.target.files);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  };

  const openPicker = () => {
    if (!disabled && !full) inputRef.current?.click();
  };

  const removeAt = (index: number) => {
    const url = values[index];
    if (url !== undefined && createdRef.current.has(url)) {
      URL.revokeObjectURL(url);
      createdRef.current.delete(url);
    }
    setLocalError(null);
    onChange(values.filter((_, position) => position !== index));
  };

  const describedBy = invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined;
  const dragHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onDragOver: (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!disabled) setDragActive(true);
    },
    onDragLeave: () => setDragActive(false),
    onDrop,
  };

  return (
    <div style={fieldStyle}>
      <div style={labelRowStyle}>
        <span style={labelStyle}>
          {label}
          {required && (
            <span style={requiredMarkStyle} aria-hidden="true">
              {' *'}
            </span>
          )}
        </span>
        <span style={counterStyle}>
          {values.length > 0 && (
            <span style={counterDoneStyle} aria-hidden="true">
              <CheckCircleIcon />
            </span>
          )}
          {`${String(values.length)}/${String(maxFiles)}`}
        </span>
      </div>

      {values.length === 0 ? (
        <button
          type="button"
          className="tds-ui-focusable"
          style={zoneStyle(dragActive, hovered, invalid, disabled, false)}
          disabled={disabled}
          aria-label={`${label} — 클릭하거나 이미지를 끌어다 놓으세요`}
          aria-describedby={describedBy}
          onClick={openPicker}
          {...dragHandlers}
        >
          <span style={iconBadgeStyle} aria-hidden="true">
            <UploadIcon />
          </span>
          <span style={zoneTitleStyle}>
            {dragActive ? '여기에 놓으면 업로드됩니다' : '파일을 올리세요 또는 드래그하여 업로드'}
          </span>
          <span style={zoneHintStyle}>클릭하거나 이미지를 이 영역에 끌어다 놓으세요</span>
          <span
            style={zoneHintStyle}
          >{`PNG · JPG · GIF · 최대 ${String(maxFiles)}장 · 장당 ${String(maxSizeMB)}MB`}</span>
        </button>
      ) : (
        <div style={gridStyle}>
          {values.map((url, index) => (
            <div key={`${url}-${String(index)}`} style={tileStyle}>
              <GalleryTile src={url} alt={`${label} ${String(index + 1)}번째 이미지`} />
              <button
                type="button"
                className="tds-ui-focusable"
                style={removeButtonStyle}
                disabled={disabled}
                aria-label={`${String(index + 1)}번째 이미지 제거`}
                onClick={() => removeAt(index)}
              >
                <CloseIcon />
              </button>
            </div>
          ))}

          {!full && (
            <button
              type="button"
              className="tds-ui-focusable"
              style={zoneStyle(dragActive, hovered, invalid, disabled, true)}
              disabled={disabled}
              aria-label={`${label} 이미지 추가`}
              aria-describedby={describedBy}
              onClick={openPicker}
              {...dragHandlers}
            >
              <span style={iconWrapStyle} aria-hidden="true">
                <UploadIcon />
              </span>
              <span style={zoneHintStyle}>추가</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        multiple
        style={visuallyHiddenStyle}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={onInputChange}
      />

      {invalid ? (
        <p id={errorIdOf(id)} role="alert" style={errorTextStyle}>
          {shownError}
        </p>
      ) : (
        hint !== undefined && (
          <p id={hintIdOf(id)} style={hintStyle}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
