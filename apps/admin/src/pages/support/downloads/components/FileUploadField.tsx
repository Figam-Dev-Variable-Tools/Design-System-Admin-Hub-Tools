// 자료 파일 업로드 필드 (A41 소유 — apps/admin/src/pages/support/downloads/**)
//
// [왜 페이지 전용인가] 공통 업로드(shared/ui ImageUploadField)는 이미지 전용(image/*)이다. 자료실은
// 문서·이미지·압축을 모두 받으므로 검증 규칙(downloadFileError)이 다르고, 미리보기 대신 파일명·용량 칩을
// 보여준다. 도메인 특화라 자료실 안에 둔다(공통으로 승격하지 않는다 — 소비자가 여기 하나뿐).
//
// [백엔드 없음] 실제 업로드는 없다. 파일을 고르면 이름·용량만 폼으로 넘긴다.
//   TODO(backend): POST /api/uploads — 저장 시 어댑터가 파일을 올리고 받은 URL 을 함께 저장한다.
import { useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent } from 'react';

import {
  buttonStyle,
  errorIdOf,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  hintIdOf,
  hintStyle,
  UploadIcon,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import {
  downloadFileError,
  fileKindLabel,
  fileKindOf,
  formatBytes,
  MAX_FILE_SIZE_MB,
} from '../types';

const labelStyle: CSSProperties = {
  ...fieldLabelStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

const requiredMarkStyle: CSSProperties = { color: 'var(--tds-color-feedback-danger-text)' };

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
    minHeight: 'calc(var(--tds-space-6) * 4)',
    paddingTop: 'var(--tds-space-4)',
    paddingBottom: 'var(--tds-space-4)',
    paddingLeft: 'var(--tds-space-4)',
    paddingRight: 'var(--tds-space-4)',
    borderStyle: 'dashed',
    borderWidth:
      invalid || active ? 'var(--tds-border-width-medium)' : 'var(--tds-border-width-thin)',
    borderColor,
    borderRadius: 'var(--tds-radius-md)',
    background: 'var(--tds-color-surface-raised)',
    color: 'var(--tds-color-text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'center',
  };
}

const chipStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

const fileMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  minWidth: 0,
};

const fileNameStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
  overflowWrap: 'anywhere',
};

const fileSubStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

const actionsRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexShrink: 0,
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: 'var(--tds-color-feedback-danger-text)',
};

interface FileUploadFieldProps {
  readonly label: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly onSelect: (fileName: string, fileSize: number) => void;
  readonly onClear: () => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  /** 스키마가 내려주는 오류 — 로컬 검증(종류·용량)보다 우선 */
  readonly error?: string | undefined;
}

export function FileUploadField({
  label,
  fileName,
  fileSize,
  onSelect,
  onClear,
  required = false,
  disabled = false,
  error,
}: FileUploadFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = error ?? localError ?? undefined;
  const invalid = shownError !== undefined && shownError !== '';
  const hasFile = fileName.trim() !== '';

  const acceptFile = (file: File) => {
    const fileError = downloadFileError(file, MAX_FILE_SIZE_MB);
    if (fileError !== null) {
      setLocalError(fileError);
      return;
    }
    setLocalError(null);
    onSelect(file.name, file.size);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file !== undefined) acceptFile(file);
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

  const remove = () => {
    setLocalError(null);
    onClear();
  };

  const describedBy = invalid ? errorIdOf(id) : hasFile ? undefined : hintIdOf(id);

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

      {hasFile ? (
        <div style={chipStyle}>
          <span style={fileMetaStyle}>
            <span style={fileNameStyle}>{fileName}</span>
            <span
              style={fileSubStyle}
            >{`${fileKindLabel(fileKindOf(fileName))} · ${formatBytes(fileSize)}`}</span>
          </span>
          <span style={actionsRowStyle}>
            <button
              type="button"
              className="tds-ui-btn-secondary tds-ui-focusable"
              style={buttonStyle('secondary', disabled)}
              disabled={disabled}
              onClick={openPicker}
            >
              파일 교체
            </button>
            <button
              type="button"
              className="tds-ui-btn-ghost tds-ui-focusable"
              style={disabled ? buttonStyle('ghost', true) : dangerGhostStyle}
              disabled={disabled}
              onClick={remove}
            >
              제거
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="tds-ui-focusable"
          style={dropZoneStyle(dragActive, invalid, disabled)}
          disabled={disabled}
          aria-label={`${label} 업로드 — 클릭하거나 파일을 끌어다 놓으세요`}
          aria-describedby={describedBy}
          onClick={openPicker}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <UploadIcon aria-hidden="true" />
          <span>{dragActive ? '여기에 놓으면 첨부됩니다' : '파일을 올리거나 드래그하여 첨부'}</span>
          <span
            style={fileSubStyle}
          >{`문서 · 이미지 · 압축 · 최대 ${String(MAX_FILE_SIZE_MB)}MB`}</span>
        </button>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
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
        !hasFile && (
          <p id={hintIdOf(id)} style={hintStyle}>
            제품 카탈로그·매뉴얼·양식 등 배포용 파일을 올리세요.
          </p>
        )
      )}
    </div>
  );
}
