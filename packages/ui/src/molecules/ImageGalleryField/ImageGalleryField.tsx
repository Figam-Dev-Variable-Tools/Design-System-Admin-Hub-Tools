// ImageGalleryField — 다중 이미지 업로드(갤러리) 필드 (molecule · contracts/ImageGalleryField.contract.json@1.0.0)
//
// 계약 dependencies: [] — ImageUploadField 와 검증(imageFileError)을 공유하고, FormField 의 id 헬퍼를 재사용한다.
// 드래그드롭·object URL·검증·개수 상한을 손코딩으로 유지한다(react-dropzone 기각). 아이콘은 인라인 글리프.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건. 드롭존 hover 는 CSS :hover 가 담당한다.
//
// [이 필드도 **업로드하지 않는다**] TODO(backend): POST /api/uploads — 파일을 보내고 응답 URL을
// onChange 로 넘겨야 한다. 지금 나가는 값은 object URL(미리보기 핸들)이고 언마운트 시 revoke 된다.
// 그대로 저장하면 폼을 떠나는 순간 깨진다. 전체 배경과 근거는 ImageUploadField 헤더에 적었다.
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, SVGProps } from 'react';

import { errorIdOf, hintIdOf } from '../FormField';
import { imageFileError } from '../ImageUploadField';
import type { ImageGalleryFieldProps } from '../../../generated/types/ImageGalleryField.types';
import './ImageGalleryField.css';

type GlyphProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

const GLYPH_BASE = {
  className: 'tds-imagegallery__glyph',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

function UploadGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH_BASE} {...props}>
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function ImageGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH_BASE} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

function CheckCircleGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH_BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** 닫기 — × (타일 제거) */
function CloseGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH_BASE} {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_SIZE_MB = 5;

/** 타일 하나 — URL 이 비거나 로드 실패면 이미지 아이콘 placeholder(role=img + alt) */
function GalleryTile({ src, alt }: { readonly src: string; readonly alt: string }) {
  const [failed, setFailed] = useState(false);
  const trimmed = src.trim();
  useEffect(() => {
    setFailed(false);
  }, [trimmed]);
  if (trimmed === '' || failed) {
    return (
      <span className="tds-imagegallery__tile-icon" role="img" aria-label={alt}>
        <ImageGlyph aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={trimmed}
      alt={alt}
      className="tds-imagegallery__tile-image"
      onError={() => setFailed(true)}
    />
  );
}

/** error/hint 는 exactOptionalPropertyTypes 경계에서 undefined 허용으로 넓힌다 (B2 선례) */
type ImageGalleryFieldComponentProps = Omit<ImageGalleryFieldProps, 'error' | 'hint'> & {
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
};

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
}: ImageGalleryFieldComponentProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 우리가 만든 object URL 만 추적 — 제거/언마운트 시 이것만 revoke 한다
  const createdRef = useRef<Set<string>>(new Set());
  const [dragActive, setDragActive] = useState(false);
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
    if (accepted.length > 0) onChange?.([...values, ...accepted]);
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
    onChange?.(values.filter((_, position) => position !== index));
  };

  const describedBy = invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined;

  const dragHandlers = {
    onDragOver: (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!disabled) setDragActive(true);
    },
    onDragLeave: () => setDragActive(false),
    onDrop,
  };

  const zoneClass = (tile: boolean) =>
    [
      'tds-imagegallery__zone',
      tile ? 'tds-imagegallery__zone--tile' : '',
      dragActive ? 'tds-imagegallery__zone--active' : '',
      invalid ? 'tds-imagegallery__zone--invalid' : '',
    ]
      .filter((token) => token !== '')
      .join(' ');

  return (
    <div className="tds-imagegallery">
      <div className="tds-imagegallery__label-row">
        <span className="tds-imagegallery__label">
          {label}
          {required && (
            <span className="tds-imagegallery__required" aria-hidden="true">
              {' *'}
            </span>
          )}
        </span>
        <span className="tds-imagegallery__counter">
          {values.length > 0 && (
            <span className="tds-imagegallery__counter-done" aria-hidden="true">
              <CheckCircleGlyph />
            </span>
          )}
          {`${String(values.length)}/${String(maxFiles)}`}
        </span>
      </div>

      {values.length === 0 ? (
        <button
          type="button"
          className={zoneClass(false)}
          disabled={disabled}
          aria-label={`${label} — 클릭하거나 이미지를 끌어다 놓으세요`}
          aria-describedby={describedBy}
          onClick={openPicker}
          {...dragHandlers}
        >
          <span className="tds-imagegallery__badge" aria-hidden="true">
            <UploadGlyph />
          </span>
          <span className="tds-imagegallery__zone-title">
            {dragActive ? '여기에 놓으면 업로드됩니다' : '파일을 올리세요 또는 드래그하여 업로드'}
          </span>
          <span className="tds-imagegallery__zone-hint">
            클릭하거나 이미지를 이 영역에 끌어다 놓으세요
          </span>
          <span className="tds-imagegallery__zone-hint">{`PNG · JPG · GIF · 최대 ${String(maxFiles)}장 · 장당 ${String(maxSizeMB)}MB`}</span>
        </button>
      ) : (
        <div className="tds-imagegallery__grid">
          {values.map((url, index) => (
            <div key={`${url}-${String(index)}`} className="tds-imagegallery__tile">
              <GalleryTile src={url} alt={`${label} ${String(index + 1)}번째 이미지`} />
              <button
                type="button"
                className="tds-imagegallery__remove"
                disabled={disabled}
                aria-label={`${String(index + 1)}번째 이미지 제거`}
                onClick={() => removeAt(index)}
              >
                <CloseGlyph />
              </button>
            </div>
          ))}

          {!full && (
            <button
              type="button"
              className={zoneClass(true)}
              disabled={disabled}
              aria-label={`${label} 이미지 추가`}
              aria-describedby={describedBy}
              onClick={openPicker}
              {...dragHandlers}
            >
              <span className="tds-imagegallery__add-icon" aria-hidden="true">
                <UploadGlyph />
              </span>
              <span className="tds-imagegallery__zone-hint">추가</span>
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
        className="tds-imagegallery__input"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={onInputChange}
      />

      {invalid ? (
        <p id={errorIdOf(id)} role="alert" className="tds-imagegallery__error">
          {shownError}
        </p>
      ) : (
        hint !== undefined && (
          <p id={hintIdOf(id)} className="tds-imagegallery__hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
