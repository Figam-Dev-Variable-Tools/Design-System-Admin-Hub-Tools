// 캔버스 위 툴바
//
// 왼쪽: [레일 접기] [✏️ edit] [👁 preview]      오른쪽: [undo][redo] | [✨ Variable][내보내기] |
//        [🖥|📱] | [패널 접기]
//
// [탭과 세그먼트를 구분한다] edit/preview 는 **보는 방식이 통째로 바뀌는** 전환이라 탭(role=tab)이고,
// desktop/mobile 은 같은 화면의 폭만 바꾸는 선택이라 세그먼트다. 둘 다 '두 개 중 하나' 지만
// 스크린리더가 읽어야 할 의미가 다르다.
//
// [DS 이관 — 이 화면이 파일럿 소비자다] 아이콘 버튼 5개와 구획선 3개가 인라인 스타일에서
// @tds/ui 의 IconButton · Divider 로 옮겨 갔다. 옮기면서 실제로 고쳐진 것 둘:
//   · 구획선이 `<div>`(접근성 트리에 generic 노드로 남음) → `aria-hidden` 이 붙은 Divider 가 됐다.
//   · 아이콘 버튼에 `title` 이 생겼다 — 마우스 사용자가 아이콘의 뜻을 알 길이 없던 것이 문자·
//     알림톡 편집기 쪽에는 이미 있었고, 이 화면에만 없었다.
// pressed 는 boolean 이 아니라 3값이다. 일반 액션(되돌리기·다시하기)에 aria-pressed 를 아예 내지
// 않기 위한 것이며, 그것이 `unset` 기본값이다 (contracts/IconButton.contract.json).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Icon } from '../../../../shared/ui';
import { cssVar, Divider, IconButton, SegmentedControl, Tabs } from '@tds/ui';
import { VariableMenu } from './VariableMenu';
import { toolbarSpacerStyle, toolbarStyle } from './styles';

export type EditorTab = 'edit' | 'preview';
export type DeviceMode = 'desktop' | 'mobile';

const tabRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/** 탭리스트 앞의 장식 글리프 — 지금 보고 있는 모드를 그림으로 한 번 더 알린다 */
const tabGlyphStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  color: cssVar('color.action.primary.default'),
};

/** Variable 버튼 — 드롭다운이 이 버튼을 기준으로 뜬다 */
const variableAnchorStyle: CSSProperties = { position: 'relative' };

const variableButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  cursor: 'pointer',
};

/**
 * 기기 전환 — 목업의 [🖥|📱] 두 칸.
 *
 * [DS SegmentedControl 로 이관됨 — 계약 1.1.0] 예전에는 계약의 options[].label 이 string 뿐이라
 * 아이콘만 있는 세그먼트를 표현할 수 없어 로컬 IconToggleGroup 에 남아 있었다. 계약이
 * options[].icon · labelHidden 을 갖추면서 이 자리가 원래 있어야 할 곳으로 갔다.
 *
 * [왜 여기가 정렬 줄과 다른가] 캔버스 폭은 '데스크톱이거나 모바일' 인 **배타 선택**이라
 * radiogroup + aria-checked + 로빙 tabindex(그룹 전체가 탭 순서에서 한 칸)가 맞는 시맨틱이다.
 * 반면 InspectPanel 의 정렬 줄은 스펙이 aria-pressed 토글 묶음으로 못박은 것이라 그대로 둔다 —
 * 두 벌이 남은 것이 아니라 서로 다른 물건이다.
 *
 * labelHidden 이 라벨을 시각적으로만 감추므로 '데스크톱 폭'·'모바일 폭' 이라는 이름은 그대로 남는다.
 */
const DEVICE_OPTIONS = [
  { id: 'desktop', label: '데스크톱 폭', icon: 'desktop', labelHidden: true },
  { id: 'mobile', label: '모바일 폭', icon: 'mobile', labelHidden: true },
] as const;

function isEditorTab(value: string): value is EditorTab {
  return value === 'edit' || value === 'preview';
}

function isDeviceMode(value: string): value is DeviceMode {
  return value === 'desktop' || value === 'mobile';
}

interface EmailToolbarProps {
  readonly tab: EditorTab;
  readonly device: DeviceMode;
  readonly leftOpen: boolean;
  readonly rightOpen: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly disabled?: boolean;
  readonly onTabChange: (next: EditorTab) => void;
  readonly onDeviceChange: (next: DeviceMode) => void;
  readonly onToggleLeft: () => void;
  readonly onToggleRight: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  /** 변수 잎을 눌렀을 때 — `#{KEY}` */
  readonly onInsertVariable: (token: string) => void;
}

export function EmailToolbar({
  tab,
  device,
  leftOpen,
  rightOpen,
  canUndo,
  canRedo,
  disabled,
  onTabChange,
  onDeviceChange,
  onToggleLeft,
  onToggleRight,
  onUndo,
  onRedo,
  onInsertVariable,
}: EmailToolbarProps) {
  const locked = disabled === true;
  const [variableOpen, setVariableOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 닫는다 — 열어 둔 채로 캔버스를 조작하면 패널이 내용을 가린다
  useEffect(() => {
    if (!variableOpen) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      const { current } = anchorRef;
      if (current !== null && event.target instanceof Node && !current.contains(event.target)) {
        setVariableOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [variableOpen]);

  return (
    <div style={toolbarStyle}>
      <IconButton
        icon={<Icon name="collapse-left" />}
        label="템플릿 설정 접기"
        pressed={leftOpen ? 'off' : 'on'}
        onClick={onToggleLeft}
      />

      {/* [탭 옆 글리프는 탭 밖에 둔다] Tabs 계약의 items[].label 은 **string** 이다(생성 타입).
          ReactNode 를 넣으려면 캐스팅으로 계약을 우회해야 하는데, 그것은 이 리포가 금지한다.
          그래서 아이콘은 탭리스트 앞에 장식으로 두고, 탭 자체는 계약대로 문자열 라벨만 갖는다 —
          아이콘이 접근 가능한 이름을 오염시키지 않는다는 부수 효과도 얻는다. */}
      <div style={tabRowStyle}>
        <span style={tabGlyphStyle} aria-hidden="true">
          {tab === 'edit' ? <Icon name="pencil" /> : <Icon name="eye" />}
        </span>
        <Tabs
          value={tab}
          ariaLabel="편집 모드"
          items={[
            { id: 'edit', label: '편집' },
            { id: 'preview', label: '미리보기' },
          ]}
          onChange={(next) => {
            if (isEditorTab(next)) onTabChange(next);
          }}
        />
      </div>

      <div style={toolbarSpacerStyle} />

      {/* [pressed 를 주지 않는다] 되돌리기·다시하기는 상태가 없는 일반 액션이다. aria-pressed 를
          달면 스크린리더가 '토글 버튼, 안 눌림' 이라고 읽어 거짓 시맨틱이 된다 (IconButton 계약). */}
      <IconButton
        icon={<Icon name="undo" />}
        label="되돌리기"
        disabled={locked || !canUndo}
        onClick={onUndo}
      />
      <IconButton
        icon={<Icon name="redo" />}
        label="다시하기"
        disabled={locked || !canRedo}
        onClick={onRedo}
      />

      <Divider orientation="vertical" />

      <div style={variableAnchorStyle} ref={anchorRef}>
        <button
          type="button"
          style={variableButtonStyle}
          aria-expanded={variableOpen}
          aria-haspopup="menu"
          disabled={locked}
          /*
            [포커스를 뺏지 않는다] 변수는 본문의 **커서 자리**에 꽂힌다. 그런데 버튼을 누르는
            순간 브라우저가 포커스를 버튼으로 옮기면, 삽입 시점에 '어디에 꽂을지' 를 읽을
            노드가 사라진다(_shared/caret.ts activeCaretRange 머리말). mousedown 기본동작만
            막으면 포커스는 본문에 남고 click 은 그대로 발생한다.
            키보드 사용자에게는 영향이 없다 — Enter/Space 는 mousedown 을 내지 않는다.
          */
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            setVariableOpen((open) => !open);
          }}
        >
          <Icon name="sparkle" />
          변수
        </button>
        {variableOpen && (
          <VariableMenu
            onInsert={(token) => {
              onInsertVariable(token);
              setVariableOpen(false);
            }}
          />
        )}
      </div>

      <IconButton icon={<Icon name="download" />} label="HTML 내려받기" disabled={locked} />

      <Divider orientation="vertical" />

      <SegmentedControl
        size="sm"
        ariaLabel="캔버스 너비"
        value={device}
        options={DEVICE_OPTIONS}
        disabled={locked}
        onChange={(next) => {
          if (isDeviceMode(next)) onDeviceChange(next);
        }}
      />

      <Divider orientation="vertical" />

      <IconButton
        icon={<Icon name="collapse-right" />}
        label="속성 패널 접기"
        pressed={rightOpen ? 'off' : 'on'}
        onClick={onToggleRight}
      />
    </div>
  );
}
