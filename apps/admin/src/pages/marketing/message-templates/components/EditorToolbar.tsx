// 편집기 중앙 카드의 툴바
//
//   [◧ 좌측 접기] ......... [실행취소] [다시실행] │ [✨ Variable] [내려받기] │ [◨ 우측 접기] [👁 미리보기]
//
// [접기 아이콘의 상태를 어떻게 알리나] 접힘/펼침은 **눌린 상태**다 — aria-pressed 로 알린다. 아이콘만
// 바꾸면 스크린리더 사용자에게는 아무 일도 일어나지 않은 것과 같다.
//
// [눈 아이콘은 언제 나오나] 좌·우가 모두 접혀 미리보기가 화면에서 사라졌을 때만이다. 미리보기가
// 이미 보이는데 '미리보기 토글' 이 또 있으면 무엇을 켜는 버튼인지 알 수 없다.
import type { CSSProperties, ReactNode } from 'react';

import { Icon } from '../../../../shared/ui';
import { TemplateVariablePicker } from '../../_shared/TemplateVariablePicker';
import { LABEL_VARIABLE } from '../copy';
import { iconButtonStyle } from '../styles';
import { cssVar } from '@tds/ui';

const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const spacerStyle: CSSProperties = { flexGrow: 1, minWidth: 0 };

const dividerStyle: CSSProperties = {
  width: cssVar('border-width.thin'),
  alignSelf: 'stretch',
  background: cssVar('color.border.subtle'),
};

/** 보라 테두리 pill — '✨ Variable' 은 아이콘 전용 버튼이 아니라 글자가 함께 있는 액션이다 */
const variableButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.action.primary.default'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.action.primary.default'),
  fontFamily: 'var(--tds-typography-label-sm-font-family)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
  cursor: 'pointer',
};

// [삭제됨] variableListStyle / variableChipStyle / captionStyle
//   변수 목록을 이 툴바가 직접 알약 버튼으로 그리던 시절의 것이다. 표면이
//   `_shared/TemplateVariablePicker` 로 옮겨 가면서 소비자가 0 이 됐다(클린코드 점검 축5).

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

function IconButton({
  label,
  onClick,
  disabled = false,
  pressed,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  /** 토글 버튼일 때만 준다 — 일반 액션(실행취소 등)에 aria-pressed 를 달면 거짓 시맨틱이다 */
  readonly pressed?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="tds-ui-focusable"
      style={iconButtonStyle(disabled)}
      disabled={disabled}
      aria-label={label}
      title={label}
      {...(pressed !== undefined && { 'aria-pressed': pressed })}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface EditorToolbarProps {
  readonly leftCollapsed: boolean;
  readonly rightCollapsed: boolean;
  readonly onToggleLeft: () => void;
  readonly onToggleRight: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly variablesOpen: boolean;
  readonly onToggleVariables: () => void;
  readonly onInsertVariable: (token: string) => void;
  readonly onDownload: () => void;
  readonly disabled: boolean;
}

export function EditorToolbar({
  leftCollapsed,
  rightCollapsed,
  onToggleLeft,
  onToggleRight,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  variablesOpen,
  onToggleVariables,
  onInsertVariable,
  onDownload,
  disabled,
}: EditorToolbarProps) {
  return (
    <div style={panelStyle}>
      <div style={barStyle}>
        <IconButton
          label={leftCollapsed ? '발신 프로필 패널 펼치기' : '발신 프로필 패널 접기'}
          pressed={leftCollapsed}
          onClick={onToggleLeft}
        >
          <Icon name="collapse-left" />
        </IconButton>

        <span style={spacerStyle} />

        <IconButton label="실행취소" onClick={onUndo} disabled={disabled || !canUndo}>
          <Icon name="undo" />
        </IconButton>
        <IconButton label="다시실행" onClick={onRedo} disabled={disabled || !canRedo}>
          <Icon name="redo" />
        </IconButton>

        <span style={dividerStyle} aria-hidden="true" />

        <button
          type="button"
          className="tds-ui-focusable"
          style={variableButtonStyle}
          disabled={disabled}
          aria-pressed={variablesOpen}
          aria-label={`치환변수 삽입 ${variablesOpen ? '닫기' : '열기'}`}
          onClick={onToggleVariables}
        >
          <Icon name="sparkle" />
          {LABEL_VARIABLE}
        </button>

        <IconButton label="본문 텍스트 파일로 내려받기" onClick={onDownload} disabled={disabled}>
          <Icon name="download" />
        </IconButton>

        <span style={dividerStyle} aria-hidden="true" />

        <IconButton
          label={rightCollapsed ? '미리보기 패널 펼치기' : '미리보기 패널 접기'}
          pressed={rightCollapsed}
          onClick={onToggleRight}
        >
          <Icon name="collapse-right" />
        </IconButton>

        {rightCollapsed && (
          <IconButton label="미리보기 보기" pressed={false} onClick={onToggleRight}>
            <Icon name="eye" />
          </IconButton>
        )}
      </div>

      {variablesOpen && (
        <div style={panelStyle}>
          {/*
            [_shared/VariableInsertBar 를 쓰지 않는 이유는 그대로다] 그 컴포넌트의 안내문은
            '미리보기에서 표본값으로 치환됩니다' 인데 이 화면의 미리보기는 **치환하지 않는다**
            (VariableText 머리말). 그대로 쓰면 화면이 하지 않는 일을 설명하게 된다.

            달라진 것은 공유하는 것의 크기다 — 예전에는 목록(MESSAGE_VARIABLES)만 빌려 쓰고
            칩 줄은 여기서 그렸다. 이제 목록의 정본이 6개 도메인 카탈로그가 되면서 '그리는 일'
            자체가 검색·그룹을 갖는 물건이 됐고, 그것을 두 화면이 각자 그릴 이유는 없다.
            그래서 표면은 TemplateVariablePicker 로 넘기고 이 화면은 **문구만** 소유한다.
          */}
          <TemplateVariablePicker
            onInsert={onInsertVariable}
            disabled={disabled}
            caption="치환변수 삽입 — 커서 자리에 들어갑니다. 미리보기에는 토큰 그대로 보이고, 발송 시점에 값으로 치환됩니다."
          />
        </div>
      )}
    </div>
  );
}
