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

import { ImageIcon, UploadIcon } from './icons';
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

function dropZoneStyle(active: boolean, invalid: boolean, disabled: boolean): CSSProperties {
  const borderColor = active
    ? 'var(--tds-color-border-focus)'
    : invalid
      ? 'var(--tds-color-feedback-danger-border)'
      : 'var(--tds-color-border-default)';
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--tds-space-2)',
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 'calc(var(--tds-space-6) * 5)',
    paddingTop: 'var(--tds-space-4)',
    paddingBottom: 'var(--tds-space-4)',
    paddingLeft: 'var(--tds-space-4)',
    paddingRight: 'var(--tds-space-4)',
    borderStyle: 'dashed',
    borderWidth: invalid ? 'var(--tds-border-width-medium)' : 'var(--tds-border-width-thin)',
    borderColor,
    borderRadius: 'var(--tds-radius-md)',
    background: 'var(--tds-color-surface-raised)',
    color: 'var(--tds-color-text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'center',
  };
}

const previewImageStyle: CSSProperties = {
  maxWidth: '100%',
  maxHeight: 'calc(var(--tds-space-6) * 6)',
  objectFit: 'contain',
};

const iconWrapStyle: CSSProperties = {
  display: 'inline-flex',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  color: 'var(--tds-color-text-muted)',
};

const zoneTextStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const zoneHintStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
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
        style={dropZoneStyle(dragActive, invalid, disabled)}
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
            style={previewImageStyle}
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <>
            <span style={iconWrapStyle} aria-hidden="true">
              {loadFailed ? <ImageIcon /> : <UploadIcon />}
            </span>
            <span style={zoneTextStyle}>
              {loadFailed
                ? '이미지를 불러오지 못했습니다. 다시 선택하세요.'
                : '클릭하거나 이미지를 이 영역에 끌어다 놓으세요'}
            </span>
            <span style={zoneHintStyle}>{`PNG · JPG · GIF · 최대 ${String(maxSizeMB)}MB`}</span>
          </>
        )}
      </button>

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
