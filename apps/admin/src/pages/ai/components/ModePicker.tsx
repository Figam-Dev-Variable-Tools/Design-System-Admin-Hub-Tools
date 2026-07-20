// 응답 모드 선택 — 참조 디자인의 모델 선택 드롭다운 자리
//
// [menu 인 이유 — listbox 가 아니다] 이 팝업은 값의 집합만 담지 않는다. 네 개의 모드(값 성격)와
// '질의 문법 도움말'(명령 성격)이 한 표면에 함께 있고, 어떤 폼 필드에도 묶이지 않는다. listbox 는
// option 만 자식으로 가질 수 있어 이 구성을 표현할 수 없다. 그래서 role="menu" 로 두고,
// 단일 선택인 네 줄은 role="menuitemradio" + aria-checked 로 '이 중 하나가 켜져 있다' 를 말한다.
// (자유 텍스트를 편집하는 `@` 자동완성은 반대로 combobox 다 — Composer.tsx 머리말 참조.)
//
// [비활성 모드] 언어 모델이 없어 세 모드는 고를 수 없다(modes.ts 참조). aria-disabled 로 두어
// 스크린리더가 **읽되 선택할 수 없음**을 알리게 한다 — 목록에서 지우면 '왜 없지' 가 되고,
// 그냥 두면 '골랐는데 왜 같지' 가 된다.
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Link } from 'react-router-dom';

import { ChevronDownIcon } from '../../../shared/icons';
import {
  AI_PROVIDER_SETTINGS_PATH,
  enabledProviderNames,
  findMode,
  resolveResponseModes,
} from '../_shared/modes';
import type { ResponseModeId } from '../_shared/modes';
import { capabilityDetail } from '../_shared/answer';
import { cssVar } from '@tds/ui';

const wrapStyle: CSSProperties = { position: 'relative' };

/**
 * 트리거 — 참조 디자인처럼 **테두리 없는 글자 + 작은 꺾쇠**다.
 *
 * 알약형 입력줄 안에 들어앉으므로 자기 테두리를 갖지 않는다. 테두리를 두면 알약 안에 알약이
 * 겹쳐 보이고, 옆의 아이콘 버튼들과 무게가 맞지 않는다.
 */
const triggerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexShrink: 0,
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  border: 'none',
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.transparent'),
  color: cssVar('color.text.muted'),
  fontFamily: 'var(--tds-typography-label-sm-font-family)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

const menuStyle: CSSProperties = {
  position: 'absolute',
  // 트리거가 입력줄 **오른쪽 묶음**에 있으므로 오른쪽 모서리에 맞춘다 —
  // left 기준이면 메뉴가 알약 밖(화면 오른쪽)으로 삐져나간다.
  right: 0,
  bottom: 'calc(100% + var(--tds-space-2))',
  zIndex: 3,
  width: 'calc(var(--tds-space-10) * 6)',
  margin: 0,
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: 0,
  paddingRight: 0,
  border: 'thin solid var(--tds-color-border-default)',
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  listStyle: 'none',
};

function itemStyle(enabled: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: cssVar('space.2'),
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    border: 'none',
    background: cssVar('color.transparent'),
    color: enabled ? cssVar('color.text.default') : cssVar('color.text.disabled'),
    textAlign: 'left',
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: cssVar('space.2'),
};

const descStyle: CSSProperties = {
  display: 'block',
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const notWiredBadgeStyle: CSSProperties = {
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

/** 설정 화면으로 가는 줄 — 메뉴 안의 명령이라 menuitem 이다 */
const settingsLinkStyle: CSSProperties = {
  display: 'block',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  color: cssVar('color.action.primary.default'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  textDecoration: 'none',
};

const separatorStyle: CSSProperties = {
  marginTop: cssVar('space.2'),
  marginBottom: cssVar('space.2'),
  marginLeft: 0,
  marginRight: 0,
  border: 'none',
  borderTop: 'thin solid var(--tds-color-border-subtle)',
};

/**
 * 참조 디자인의 업그레이드/프로모션 카드 자리.
 *
 * [왜 프로모션이 아닌가] 그 카드는 그 제품의 요금제 장사다. 이 어드민에는 요금제도 결제도 없어
 * 옮겨 심으면 존재하지 않는 상품을 파는 화면이 된다. 자리는 남기되, 관리자에게 실제로 쓸모 있는
 * 것 — **이 에이전트가 무엇을 할 수 있는지** — 로 채운다.
 */
const noteStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: cssVar('space.3'),
  marginRight: cssVar('space.3'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

export interface ModePickerProps {
  readonly modeId: ResponseModeId;
  readonly onChange: (id: ResponseModeId) => void;
}

export function ModePicker({ modeId, onChange }: ModePickerProps) {
  const menuId = useId();
  const lockNoteId = useId();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 열릴 때마다 연동 상태를 다시 읽는다 — 설정에서 연동을 켜고 돌아오면 바로 반영된다
  const modes = resolveResponseModes();
  const lockedModes = modes.filter((mode) => !mode.available);
  const lockReason = lockedModes[0]?.lockReason ?? '';
  const providerNames = enabledProviderNames();
  const current = findMode(modeId);

  // 바깥을 누르거나 Escape 를 누르면 닫는다 — 열어 둔 채 다른 곳을 조작하지 못하게
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target;
      if (target instanceof Node && wrapRef.current?.contains(target) === true) return;
      setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={wrapStyle}>
      {/*
        보이는 글자는 짧은 이름 + 꺾쇠(참조 디자인의 `빠른 ⌄` 모양)지만, 접근 가능한 이름은
        무엇을 고르는 버튼인지까지 말한다 — '규칙 기반' 만 읽히면 그것이 모드인지 알 수 없다.
      */}
      <button
        ref={triggerRef}
        type="button"
        style={triggerStyle}
        aria-label={`응답 모드: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <span>{current.shortLabel}</span>
        <ChevronDownIcon />
      </button>

      {open ? (
        <ul id={menuId} role="menu" aria-label="응답 모드" style={menuStyle}>
          {modes.map((mode) => (
            <li key={mode.id}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={mode.id === modeId}
                aria-disabled={!mode.available}
                // 잠긴 모드는 '왜 잠겼는지'를 함께 읽힌다 — '미연결' 세 글자만으로는
                // 관리자가 무엇을 해야 하는지 알 수 없다
                aria-describedby={mode.available ? undefined : lockNoteId}
                style={itemStyle(mode.available)}
                onClick={() => {
                  if (!mode.available) return;
                  onChange(mode.id);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span aria-hidden="true">{mode.id === modeId ? '✓' : ' '}</span>
                <span>
                  <span style={labelRowStyle}>
                    <span>{mode.label}</span>
                    {mode.available ? null : <span style={notWiredBadgeStyle}>미연결</span>}
                  </span>
                  <span style={descStyle}>{mode.description}</span>
                </span>
              </button>
            </li>
          ))}

          <li aria-hidden="true">
            <hr style={separatorStyle} />
          </li>

          {/*
            연동 안내 — 상태에서 파생된다. 하드코딩된 '연결되어 있지 않습니다' 를 두면
            연동을 켠 뒤에도 그 문장이 남아 이번에는 그것이 거짓이 된다.
          */}
          <li>
            <p id={lockNoteId} style={noteStyle}>
              {lockedModes.length === 0
                ? `${providerNames.join(' · ')} 연동됨 — 모든 응답 모드를 고를 수 있습니다.`
                : `${lockReason} 규칙 기반 조회는 연동 없이도 동작합니다.`}
            </p>
          </li>

          {/* 무엇을 해야 열리는지 알았으면 갈 수 있어야 한다 */}
          {lockedModes.length === 0 ? null : (
            <li>
              <Link
                to={AI_PROVIDER_SETTINGS_PATH}
                role="menuitem"
                style={settingsLinkStyle}
                onClick={() => {
                  setOpen(false);
                }}
              >
                API Key 설정 열기
              </Link>
            </li>
          )}

          <li aria-hidden="true">
            <hr style={separatorStyle} />
          </li>

          <li>
            <button
              type="button"
              role="menuitem"
              style={itemStyle(true)}
              aria-expanded={helpOpen}
              onClick={() => {
                setHelpOpen((value) => !value);
              }}
            >
              <span aria-hidden="true">{' '}</span>
              <span>
                <span style={labelRowStyle}>질의 문법 도움말</span>
                {helpOpen ? <span style={descStyle}>{capabilityDetail()}</span> : null}
              </span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
