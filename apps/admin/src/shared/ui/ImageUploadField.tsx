// 이미지 업로드 필드 (A41 소유 — apps/admin/src/shared/ui/**)
//
// [URL 입력 → 업로드 UX] 예전 ImageUrlField(URL 텍스트 입력)를 대체한다. 파일을 끌어다 놓거나
// 클릭해 선택하면 즉시 클라이언트 프리뷰를 보여준다. 값(value)은 여전히 **이미지 URL 문자열**이다 —
// 지금은 URL.createObjectURL(file) 로 만든 object URL(백엔드가 붙으면 업로드 응답 URL).
//   TODO(backend): POST /api/uploads — 저장 시 어댑터가 파일을 올리고 받은 URL 로 교체한다.
//
// [백엔드 없음] 실제 업로드는 없다. 미선택/로드 실패면 이미지 아이콘 placeholder(장식 — aria-hidden).
// [검증] 이미지 타입(image/*)·용량 상한(기본 5MB)을 클라이언트에서 막고 인라인 오류로 알린다.
// [접근성] 드롭존 버튼이 Enter/Space 로 파일 선택을 연다(키보드 접근). 파일 input 은 그 트리거일 뿐.
// [누수 방지] 만든 object URL 은 교체/제거/언마운트 시 revokeObjectURL 한다.
//
// [도메인을 모른다] 무슨 이미지인지 알지 못한다 — value/onChange 와 라벨/힌트만 받는다.
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent } from 'react';

import { CheckCircleIcon, ImageIcon, UploadIcon } from './icons';
import { imageFileError } from './imageFile';
import { errorIdOf, hintIdOf } from './FormField';
import {
  buttonStyle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  hintStyle,
  visuallyHiddenStyle,
} from './styles';

const DEFAULT_MAX_SIZE_MB = 5;

const labelStyle: CSSProperties = {
  ...fieldLabelStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

const requiredMarkStyle: CSSProperties = {
  color: 'var(--tds-color-feedback-danger-text)',
};

// 드롭존 카드 — 기본/hover/드래그오버/오류 4상태를 테두리·배경 토큰으로 이중 표현한다.
// (인라인 스타일이 CSS :hover 를 이기므로 hover 는 클래스가 아니라 상태값으로 계산한다.)
function dropZoneStyle(
  active: boolean,
  hovered: boolean,
  invalid: boolean,
  disabled: boolean,
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
    gap: 'var(--tds-space-2)',
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 'calc(var(--tds-space-6) * 6)',
    paddingTop: 'var(--tds-space-5)',
    paddingBottom: 'var(--tds-space-5)',
    paddingLeft: 'var(--tds-space-4)',
    paddingRight: 'var(--tds-space-4)',
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

const previewImageStyle: CSSProperties = {
  maxWidth: '100%',
  maxHeight: 'calc(var(--tds-space-6) * 6)',
  objectFit: 'contain',
};

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

// 드롭존 1차 안내(강조) · 2차 안내 · 형식/용량 메타
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

const zoneMetaStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
};

// 업로드 완료 피드백 — 체크 아이콘 + 성공 색
const successRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  color: 'var(--tds-color-feedback-success-text)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const actionsRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 'var(--tds-space-2)',
  paddingRight: 'var(--tds-space-2)',
  color: 'var(--tds-color-feedback-danger-text)',
};

// 빈 드롭존 안내(아이콘 배지 · 1차/2차 안내 · 형식·용량 메타). 컴포넌트 본문에서 분기를 덜어낸다.
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
      <span style={iconBadgeStyle} aria-hidden="true">
        {loadFailed ? <ImageIcon /> : <UploadIcon />}
      </span>
      <span style={zoneTitleStyle}>{title}</span>
      {!loadFailed && (
        <span style={zoneHintStyle}>클릭하거나 이미지를 이 영역에 끌어다 놓으세요</span>
      )}
      <span style={zoneMetaStyle}>{meta}</span>
    </>
  );
}

interface ImageUploadFieldProps {
  readonly label: string;
  /** 현재 이미지 URL (object URL · data URL · 업로드 응답 URL). 비면 미등록 */
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  /** 스키마가 내려주는 오류 — 로컬 검증 오류(타입·용량)보다 우선 */
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly maxSizeMB?: number;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  hint,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
}: ImageUploadFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 우리가 만든 object URL — 교체/제거/언마운트 시 이것만 revoke 한다(외부 URL 은 건드리지 않는다)
  const objectUrlRef = useRef<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [hovered, setHovered] = useState(false);
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
    onChange(url);
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
    onChange('');
  };

  const hasImage = trimmed !== '' && !loadFailed;
  const describedBy = invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined;

  return (
    <div style={fieldStyle}>
      <span style={labelStyle}>
        {label}
        {required && (
          <span style={requiredMarkStyle} aria-hidden="true">
            {' *'}
          </span>
        )}
      </span>

      <button
        type="button"
        className="tds-ui-focusable"
        style={dropZoneStyle(dragActive, hovered, invalid, disabled)}
        disabled={disabled}
        aria-label={`${label} 이미지 업로드 — 클릭하거나 파일을 끌어다 놓으세요`}
        aria-describedby={describedBy}
        onClick={openPicker}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
            style={previewImageStyle}
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
        <span style={successRowStyle}>
          <CheckCircleIcon aria-hidden="true" />
          업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있습니다.
        </span>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        style={visuallyHiddenStyle}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={onInputChange}
      />

      {trimmed !== '' && (
        <span style={actionsRowStyle}>
          <button
            type="button"
            className="tds-ui-btn-secondary tds-ui-focusable"
            style={buttonStyle('secondary', disabled)}
            disabled={disabled}
            onClick={openPicker}
          >
            이미지 교체
          </button>
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={disabled ? buttonStyle('ghost', true) : dangerGhostStyle}
            disabled={disabled}
            onClick={removeImage}
          >
            제거
          </button>
        </span>
      )}

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
