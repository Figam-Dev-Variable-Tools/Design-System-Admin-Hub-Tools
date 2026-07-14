// PasswordField — TextField + 표시/숨김 토글 (molecule · contracts/PasswordField.contract.json@1.1.0)
//
// 계약 dependencies: TextField (atom). 표시/숨김은 순수 표현 관심사라 이 컴포넌트가 소유하되,
// revealed 는 제어 가능한 prop 으로도 노출한다(부모가 값을 바꾸면 그 값을 따른다).
//
// [ref] input 참조는 계약 prop 이 아니라 forwardRef 로 노출한다 (TextField 와 동일 판정).
//   내부에서도 같은 ref 를 쓴다 — 토글 시 커서 복원을 위해 document.getElementById(id) 로 DOM 을
//   더듬던 우회를 없앤다. 호출부(LoginPage)는 이 ref 로 첫 오류 필드에 포커스를 옮길 수 있다.
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, MouseEvent } from 'react';

import { TextField } from '../../atoms/TextField';
import type { PasswordFieldProps } from '../../../generated/types/PasswordField.types';
import './PasswordField.css';

/** 눈 아이콘(숨김 상태 → 표시하기) / 눈 감김 아이콘(표시 상태 → 숨기기). currentColor·1em 기준 */
function EyeGlyph({ revealed }: { readonly revealed: boolean }) {
  return (
    <svg
      className="tds-password__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {revealed ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    {
      id,
      label,
      value,
      error = '',
      disabled = false,
      required = false,
      name = '',
      autoComplete = '',
      placeholder = '',
      revealed = false,
      onChange,
      onBlur,
      onToggleReveal,
    },
    ref,
  ) {
    const [shown, setShown] = useState(revealed);
    /** 내부 참조 — 커서 복원에 쓰고, 호출부의 forwardRef 와 같은 노드를 가리킨다 */
    const inputRef = useRef<HTMLInputElement | null>(null);
    /** 토글 시 커서 위치 복원용 (표시/숨김 전환 후 입력값·커서 유지) */
    const selectionRef = useRef<{ start: number | null; end: number | null } | null>(null);

    /** 내부 ref 와 외부 forwardRef 를 같은 노드에 함께 물린다 */
    const setInputRef = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref !== null) ref.current = node;
      },
      [ref],
    );

    // 제어 prop 동기화 — 부모가 revealed 를 바꾸면 그 값을 따른다
    useEffect(() => {
      setShown(revealed);
    }, [revealed]);

    // 전환 후 포커스·커서 위치 복원
    useEffect(() => {
      const selection = selectionRef.current;
      selectionRef.current = null;
      if (selection === null) return;
      const input = inputRef.current;
      if (input === null) return;
      input.focus();
      const end = selection.end ?? input.value.length;
      const start = selection.start ?? end;
      input.setSelectionRange(start, end);
    }, [shown]);

    const handleToggle = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        // 계약 events.onToggleReveal.blockedWhen — disabled 에서는 발화 금지
        if (disabled) return;
        const input = inputRef.current;
        selectionRef.current =
          input === null
            ? { start: null, end: null }
            : { start: input.selectionStart, end: input.selectionEnd };
        setShown((current) => !current);
        onToggleReveal?.(event);
      },
      [disabled, onToggleReveal],
    );

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      // 계약 events.onChange.blockedWhen — disabled 에서는 발화 금지
      if (disabled) return;
      onChange?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      // 계약 events.onBlur.blockedWhen — disabled 에서는 발화 금지
      // (자식 TextField 도 같은 가드를 갖지만, 계약이 이 컴포넌트에 건 금지이므로 여기서도 지킨다)
      if (disabled) return;
      onBlur?.(event);
    };

    const toggle = (
      <button
        type="button"
        className="tds-password__toggle"
        aria-pressed={shown}
        aria-controls={id}
        aria-label={shown ? '비밀번호 숨기기' : '비밀번호 표시'}
        aria-disabled={disabled ? true : undefined}
        disabled={disabled}
        onClick={handleToggle}
      >
        <EyeGlyph revealed={shown} />
      </button>
    );

    return (
      <TextField
        ref={setInputRef}
        id={id}
        label={label}
        type={shown ? 'text' : 'password'}
        value={value}
        error={error}
        disabled={disabled}
        required={required}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        trailing={toggle}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );
  },
);
