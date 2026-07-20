// 입력줄 — 한 줄 알약형. `+` · 입력 · 모드 선택 · 마이크 · 보내기
//
// [combobox 인 이유] `@` 를 치면 도메인 후보가 뜨고, 고르면 **입력값이 바뀐다.** 값을 편집하는
// 텍스트 입력에 팝업 목록이 붙는 형태 — WAI-ARIA 의 combobox 그대로다. 그래서 입력에
// role="combobox" · aria-expanded · aria-controls · aria-activedescendant 를 붙이고, 목록은
// role="listbox", 항목은 role="option" 이다. 포커스는 **입력에 머문다**(aria-activedescendant 로
// 활성 항목만 가리킨다) — 그래야 계속 타이핑할 수 있다.
//
// [모드 선택이 listbox 가 아닌 이유] 그것은 값을 편집하는 컨트롤이 아니라 **명령 표면**이다.
// 목록 안에 값이 아닌 항목(질의 문법 도움말)이 함께 있고, 폼 필드에 묶이지도 않는다. listbox 는
// 값의 집합만 담을 수 있어 그 구성을 표현하지 못한다. (ModePicker.tsx 참조)
//
// ─────────────────────────────────────────────────────────────────────────────
// [연결되지 않은 컨트롤을 다루는 방식 — 이 파일의 핵심 판정]
//
// 참조 디자인의 `+`(첨부)와 마이크(음성)는 이 제품에 **대응하는 기능이 없다.** 백엔드도
// 음성 처리도 없기 때문이다. 세 가지 선택지가 있었다:
//   ① 지운다        — 요청받은 레이아웃이 아니게 된다
//   ② 눌리게 둔다   — 눌러도 아무 일이 없다. FEEDBACK-03 이 금지하는 no-op 다
//   ③ 그리되 '연결되지 않음'을 말한다  ← 이것을 택했다
//
// 그래서 둘은 `aria-disabled="true"` + 흐린 표시 + `aria-describedby` 로 **이유를 함께** 갖는다.
// 핸들러를 아예 붙이지 않아 눌러도 실행될 코드가 없고, 스크린리더는 이름과 함께 '사용 불가'와
// 그 사유를 읽는다. 응답 모드의 `빠른/전문가/헤비` 를 다룬 방식과 같다(modes.ts).
//
// [native disabled 대신 aria-disabled 인 이유] `disabled` 는 요소를 탭 순서에서 빼버려
// 키보드·스크린리더 사용자가 **그 컨트롤이 있다는 사실조차 알 수 없다.** '왜 안 되는지'를
// 읽히게 하려면 초점을 받을 수 있어야 한다.
//
// [오른쪽 원형 버튼은 보내기다 — 파형이 아니다] 참조 디자인의 그 자리는 음성 파형이지만,
// 파형을 그리면 없는 기능을 약속하게 된다. 같은 자리·같은 모양을 쓰되 **실제로 동작하는
// 보내기**를 넣었다. 이렇게 하지 않으면 이 레이아웃에는 보낼 수단이 Enter 키밖에 남지 않는다
// (icons.tsx 의 SendIcon 주석 참조).
// ─────────────────────────────────────────────────────────────────────────────
import { useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

import { visuallyHiddenStyle } from '../../../shared/ui';
import { mentionSuggestions } from '../_shared/parser';
import type { ResponseModeId } from '../_shared/modes';
import { MicIcon, PlusIcon, SendIcon } from '../icons';
import { ModePicker } from './ModePicker';
import { cssVar } from '@tds/ui';

/** 한 줄 알약 — 참조 디자인의 컴팩트한 단일 행 */
const shellStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  border: 'thin solid var(--tds-color-border-default)',
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.default'),
};

/**
 * 입력 자체에는 테두리도 초점 링도 두지 않는다 — 감싼 알약이 둘 다 갖는다.
 *
 * [TOKEN-02 를 어기지 않는다] 초점 표시를 **없앤 것이 아니라 옮겼다** — 알약이
 * `.tds-ai-composer:focus-within` 으로 링을 그린다(ai.css). 둘 다 그리면 알약 링과 입력 링이
 * 겹쳐 이중 테두리로 보인다(실제로 그렇게 보였다). 대체 없이 outline 만 지우는 것이 금지된
 * 것이지, 링의 자리를 옮기는 것은 아니다.
 */
const inputStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: cssVar('color.transparent'),
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-body-md-font-family)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

/** 오른쪽 묶음 — 모드 · 마이크 · 보내기 */
const trailingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexShrink: 0,
};

/** 아이콘 버튼 한 칸 — 정사각형이라 원형으로 잘려도 찌그러지지 않는다 */
const ICON_BUTTON_SIZE = 'calc(var(--tds-space-4) + var(--tds-space-3))';

function iconButtonStyle(enabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    border: 'none',
    borderRadius: cssVar('radius.full'),
    background: cssVar('color.transparent'),
    color: enabled ? cssVar('color.text.muted') : cssVar('color.text.disabled'),
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

/**
 * 보내기 — 채워진 원형. 색은 토큰에서 온다(`text-default` 는 라이트에서 거의 검정,
 * 다크에서 거의 흰색이라 두 테마 모두에서 대비가 뒤집히지 않는다). raw `#000` 을 쓰지 않는다.
 */
function sendButtonStyle(enabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    border: 'none',
    borderRadius: cssVar('radius.full'),
    background: enabled ? cssVar('color.text.default') : cssVar('color.surface.disabled'),
    color: enabled ? cssVar('color.surface.default') : cssVar('color.text.disabled'),
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

const listboxStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  // 알약의 위 모서리 기준으로 띄운다 — 알약이 한 줄로 낮아져도 겹치지 않는다
  bottom: 'calc(100% + var(--tds-space-2))',
  zIndex: 2,
  maxHeight: 'calc(var(--tds-space-10) * 4)',
  overflowY: 'auto',
  margin: 0,
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  border: 'thin solid var(--tds-color-border-default)',
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  listStyle: 'none',
};

function optionStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'baseline',
    gap: cssVar('space.2'),
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    background: active ? cssVar('color.surface.raised') : cssVar('color.transparent'),
    color: cssVar('color.text.default'),
    cursor: 'pointer',
  };
}

const optionMetaStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

/** 연결되지 않은 컨트롤이 공통으로 다는 사유 — 화면 문구와 스크린리더 안내가 같은 문장이다 */
const NOT_WIRED_REASON = '이 기능은 아직 연결되지 않았습니다.';

/** 커서 앞의 미완성 멘션(`@회원` 등) — 없으면 null */
function activeMentionPrefix(value: string): string | null {
  const match = /@([가-힣A-Za-z0-9_]*)$/.exec(value);
  return match === null ? null : (match[1] ?? '');
}

export interface ComposerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly busy: boolean;
  readonly modeId: ResponseModeId;
  readonly onModeChange: (id: ResponseModeId) => void;
}

export function Composer({ value, onChange, onSubmit, busy, modeId, onModeChange }: ComposerProps) {
  const listboxId = useId();
  const optionPrefix = useId();
  const reasonId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const prefix = activeMentionPrefix(value);
  const candidates =
    prefix === null ? [] : mentionSuggestions().filter((item) => item.alias.startsWith(prefix));
  const open = candidates.length > 0;
  const safeIndex = activeIndex < candidates.length ? activeIndex : 0;
  const canSend = !busy && value.trim() !== '';

  const optionId = (index: number): string => `${optionPrefix}-${String(index)}`;

  const complete = (alias: string): void => {
    // 미완성 멘션을 고른 별칭으로 갈아끼운다 — 뒤에 공백을 붙여 바로 조건을 이어 쓰게 한다
    onChange(`${value.replace(/@[가-힣A-Za-z0-9_]*$/, `@${alias}`)} `);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    /**
     * 한글 조합 중의 Enter 는 **글자를 확정하는 키**지 보내는 키가 아니다 (COMP-10).
     * 이 검사가 없으면 '뽑아줘' 의 마지막 글자를 확정하려고 누른 Enter 가 질문을 보내 버려
     * 조합이 덜 끝난 문장이 그대로 날아간다. 후보 목록 조작도 같은 이유로 막는다.
     */
    if (event.nativeEvent.isComposing) return;

    if (open) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % candidates.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + candidates.length) % candidates.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const picked = candidates[safeIndex];
        if (picked !== undefined) {
          event.preventDefault();
          complete(picked.alias);
          return;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        // 멘션을 지우지 않고 목록만 닫는다 — 공백을 붙여 접두사 상태를 벗어난다
        onChange(`${value} `);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!busy) onSubmit();
    }
  };

  return (
    <div className="tds-ai-composer" style={shellStyle}>
      {open ? (
        <ul id={listboxId} role="listbox" aria-label="데이터 멘션 후보" style={listboxStyle}>
          {candidates.map((candidate, index) => (
            <li
              key={candidate.alias}
              id={optionId(index)}
              role="option"
              aria-selected={index === safeIndex}
              style={optionStyle(index === safeIndex)}
              // 입력의 포커스를 뺏지 않게 mousedown 을 막고 선택만 한다
              onMouseDown={(event) => {
                event.preventDefault();
                complete(candidate.alias);
              }}
            >
              <span>{`@${candidate.alias}`}</span>
              <span style={optionMetaStyle}>{candidate.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* 사유 문장 한 벌 — 아래 두 버튼이 aria-describedby 로 같은 문장을 가리킨다 */}
      <span id={reasonId} style={visuallyHiddenStyle}>
        {NOT_WIRED_REASON}
      </span>

      {/*
        첨부 — 연결되지 않았다. 핸들러가 없어 눌러도 실행될 코드가 없고,
        aria-disabled 로 '사용 불가'와 사유가 함께 읽힌다 (파일 머리말 참조).
      */}
      <button
        type="button"
        aria-label="내용 첨부"
        aria-disabled="true"
        aria-describedby={reasonId}
        title={`내용 첨부 — ${NOT_WIRED_REASON}`}
        style={iconButtonStyle(false)}
      >
        <PlusIcon />
      </button>

      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="질문 입력"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? optionId(safeIndex) : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="무엇을 알고 싶으세요?"
        value={value}
        disabled={busy}
        style={inputStyle}
        onChange={(event) => {
          onChange(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={onKeyDown}
      />

      <span style={trailingStyle}>
        <ModePicker modeId={modeId} onChange={onModeChange} />

        {/* 음성 입력 — 연결되지 않았다. 첨부와 같은 방식으로 사유를 갖는다 */}
        <button
          type="button"
          aria-label="음성 입력"
          aria-disabled="true"
          aria-describedby={reasonId}
          title={`음성 입력 — ${NOT_WIRED_REASON}`}
          style={iconButtonStyle(false)}
        >
          <MicIcon />
        </button>

        {/*
          보내기 — 참조 디자인의 채워진 원형 자리. 이 자리만은 **실제로 동작한다**
          (파형 글리프를 쓰지 않는 이유는 파일 머리말과 icons.tsx 참조).
          입력이 비었거나 조회 중이면 native disabled 다 — 이쪽은 '아직 할 수 없다'가 아니라
          '지금 보낼 것이 없다'라서, 초점을 잡아 둘 이유가 없다.
        */}
        <button
          type="button"
          aria-label={busy ? '조회 중' : '보내기'}
          disabled={!canSend}
          style={sendButtonStyle(canSend)}
          onClick={onSubmit}
        >
          <SendIcon />
        </button>
      </span>
    </div>
  );
}
