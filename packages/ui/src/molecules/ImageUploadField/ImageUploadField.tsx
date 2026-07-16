// ImageUploadField — 이미지 업로드 필드 (molecule · contracts/ImageUploadField.contract.json@1.0.0)
//
// 계약 dependencies: [] — FormField 의 id 헬퍼(errorIdOf/hintIdOf)만 재사용한다(같은 layer 유틸).
// 드래그드롭·object URL·검증·placeholder 를 손코딩으로 유지한다(react-dropzone 기각). 아이콘은 인라인 글리프.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건. 출처 인라인 스타일을 클래스로 옮긴 것
// (드롭존 hover 는 이제 CSS :hover 가 담당한다 — 인라인 스타일이 아니므로 상태값 계산이 필요 없다).
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 필드는 **업로드하지 않는다** — 호출부가 반드시 알아야 하는 한계]
//
// TODO(backend): POST /api/uploads — 파일을 보내고 **응답 URL**을 onChange 로 넘겨야 한다.
//
// 지금 onChange 로 나가는 것은 `URL.createObjectURL(file)` 이 만든 **미리보기 핸들**이다.
// 저장된 자산이 아니다. 그리고 계약이 요구하는 대로(누수 방지) 이 필드는 교체·제거·**언마운트**
// 시 그 핸들을 revoke 한다. 그래서 이 값을 그대로 저장하면:
//   · 폼을 떠나는 순간(언마운트) 그 URL 은 죽는다 — 목록의 썸네일이 **즉시** 깨진다.
//   · 새로고침하면 당연히 깨진다(blob: 는 그 문서 세션의 것이다).
// 즉 '업로드된 것처럼 보이지만 아무것도 업로드되지 않았다'.
//
// 이 컴포넌트는 계약대로 동작하고 있다(계약: "mock 은 URL.createObjectURL, 백엔드가 붙으면
// 업로드 응답 URL"). 고쳐야 할 곳은 **저장 경로**다: 백엔드가 붙기 전까지 이 값을 영속 자산으로
// 취급하는 화면은 깨진 값을 저장한다. 가짜 업로드 성공을 여기서 지어내지 않는다 — 그건 문제를
// 숨길 뿐이고, 계약이 약속한 값(업로드 응답 URL)과도 다르다.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, SVGProps } from 'react';

import { errorIdOf, hintIdOf } from '../FormField';
import type { ImageUploadFieldProps } from '../../../generated/types/ImageUploadField.types';
import './ImageUploadField.css';

// 이미지 파일 클라이언트 검증 (계약 비대상 순수 유틸 — ImageGalleryField 와 공유).
// 단일/다중 업로드가 같은 규칙으로 파일을 막는다: 이미지 타입(image/*)·용량 상한. 두 곳이 복사하지 않게 한 벌만 둔다.
// (파일 네이밍 규칙상 컴포넌트 폴더의 .ts 는 index/types 만 허용되므로 이 유틸은 컴포넌트 파일에 co-locate 한다 —
//  TableSelection 이 tableSelectionState 를 SelectAllHeaderCell.tsx 에 두는 것과 같은 선례.)
/** 위반이면 인라인에 띄울 오류 문구, 통과면 null. 테스트가 이 순수 함수를 직접 부른다. */
export function imageFileError(file: File, maxSizeMB: number): string | null {
  if (!file.type.startsWith('image/')) return '이미지 파일만 올릴 수 있습니다.';
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `파일 용량은 ${String(maxSizeMB)}MB 를 넘을 수 없습니다.`;
  }
  return null;
}

type GlyphProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

const GLYPH_BASE = {
  className: 'tds-imageupload__glyph',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

/** 업로드 — 위로 향하는 화살표 + 받침 */
function UploadGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH_BASE} {...props}>
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 20h16" />
    </svg>
  );
}

/** 이미지 — 액자 안 사진 (로드 실패 placeholder) */
function ImageGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH_BASE} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

/** 성공 — 원 안에 체크 */
function CheckCircleGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH_BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** 빈 드롭존 안내(아이콘 배지 · 1차/2차 안내 · 형식·용량 메타) */
function DropzonePrompt({
  loadFailed,
  dragActive,
  meta,
}: {
  readonly loadFailed: boolean;
  readonly dragActive: boolean;
  readonly meta: string;
}) {
  const title = loadFailed
    ? '이미지를 불러오지 못했습니다. 다시 선택하세요.'
    : dragActive
      ? '여기에 놓으면 업로드됩니다'
      : '파일을 올리세요 또는 드래그하여 업로드';
  return (
    <>
      <span className="tds-imageupload__badge" aria-hidden="true">
        {loadFailed ? <ImageGlyph /> : <UploadGlyph />}
      </span>
      <span className="tds-imageupload__zone-title">{title}</span>
      {!loadFailed && (
        <span className="tds-imageupload__zone-hint">
          클릭하거나 이미지를 이 영역에 끌어다 놓으세요
        </span>
      )}
      <span className="tds-imageupload__zone-meta">{meta}</span>
    </>
  );
}

const DEFAULT_MAX_SIZE_MB = 5;

/** error/hint 는 exactOptionalPropertyTypes 경계에서 undefined 허용으로 넓힌다 (B2 선례) */
type ImageUploadFieldComponentProps = Omit<ImageUploadFieldProps, 'error' | 'hint'> & {
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
};

export function ImageUploadField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  hint,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
}: ImageUploadFieldComponentProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 우리가 만든 object URL — 교체/제거/언마운트 시 이것만 revoke 한다(외부 URL 은 건드리지 않는다)
  const objectUrlRef = useRef<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const trimmed = value.trim();
  const shownError = error ?? localError ?? undefined;
  const invalid = shownError !== undefined && shownError !== '';

  useEffect(() => {
    setLoadFailed(false);
  }, [trimmed]);

  useEffect(
    () => () => {
      if (objectUrlRef.current !== null) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const revokePrevious = () => {
    if (objectUrlRef.current !== null) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const acceptFile = (file: File) => {
    const fileError = imageFileError(file, maxSizeMB);
    if (fileError !== null) {
      setLocalError(fileError);
      return;
    }
    setLocalError(null);
    revokePrevious();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLoadFailed(false);
    onChange?.(url);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file !== undefined) acceptFile(file);
    // 같은 파일을 다시 골라도 change 가 나게 값을 비운다
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file !== undefined) acceptFile(file);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const removeImage = () => {
    revokePrevious();
    setLocalError(null);
    setLoadFailed(false);
    onChange?.('');
  };

  const hasImage = trimmed !== '' && !loadFailed;
  const describedBy = invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined;

  const dropzoneClass = [
    'tds-imageupload__dropzone',
    dragActive ? 'tds-imageupload__dropzone--active' : '',
    invalid ? 'tds-imageupload__dropzone--invalid' : '',
  ]
    .filter((token) => token !== '')
    .join(' ');

  return (
    <div className="tds-imageupload">
      <span className="tds-imageupload__label">
        {label}
        {required && (
          <span className="tds-imageupload__required" aria-hidden="true">
            {' *'}
          </span>
        )}
      </span>

      <button
        type="button"
        className={dropzoneClass}
        disabled={disabled}
        aria-label={`${label} 이미지 업로드 — 클릭하거나 파일을 끌어다 놓으세요`}
        aria-describedby={describedBy}
        onClick={openPicker}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        {hasImage ? (
          <img
            src={trimmed}
            alt={`${label} 미리보기`}
            className="tds-imageupload__preview"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <DropzonePrompt
            loadFailed={loadFailed}
            dragActive={dragActive}
            meta={`PNG · JPG · GIF · 최대 ${String(maxSizeMB)}MB`}
          />
        )}
      </button>

      {hasImage && (
        <span className="tds-imageupload__success">
          <CheckCircleGlyph aria-hidden="true" />
          업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있습니다.
        </span>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="tds-imageupload__input"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={onInputChange}
      />

      {trimmed !== '' && (
        <span className="tds-imageupload__actions">
          <button
            type="button"
            className="tds-imageupload__btn tds-imageupload__btn--replace"
            disabled={disabled}
            onClick={openPicker}
          >
            이미지 교체
          </button>
          <button
            type="button"
            className="tds-imageupload__btn tds-imageupload__btn--remove"
            disabled={disabled}
            onClick={removeImage}
          >
            제거
          </button>
        </span>
      )}

      {invalid ? (
        <p id={errorIdOf(id)} role="alert" className="tds-imageupload__error">
          {shownError}
        </p>
      ) : (
        hint !== undefined && (
          <p id={hintIdOf(id)} className="tds-imageupload__hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
