// 편집기 공용 껍데기 — 문자·이메일 두 편집기가 같은 머리를 쓴다
//
//   [← 뒤로]
//   [편집 가능한 큰 제목                          ]        [취소] [초안 저장] [발행]
//   [SMS/LMS/MMS ▾]                                        (발행본 수정이면 [취소] [저장])
//   ──────────────────────────────────────────────────────────────────────────────────────
//   children (3단 본문)
//
// [왜 껍데기를 나누나] 두 편집기의 본문은 공유할 것이 하나도 없다(블록 빌더 vs 단일 본문). 반대로
// 머리는 글자 하나 다르지 않다 — 제목·취소·저장·발행의 배치와 잠금 규칙이 같다. 나중에 이메일 쪽만
// '발행' 을 다른 문구로 바꾸는 일이 생겨도, 그때 갈라야 할 곳이 여기 한 군데로 보인다.
//
// [저장 버튼이 왜 처음부터 회색인가] 목업의 규칙이다: 폼이 유효하기 전에는 '초안 저장' 도 '발행' 도
// 잠겨 있다. 눌러 보고 나서 오류를 만나는 대신, **누를 수 있게 되는 것**으로 진행 상태를 알린다.
// 잠긴 이유는 각 입력 옆 인라인 오류가 말한다(버튼 옆에 다시 적지 않는다).
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, controlStyle, errorIdOf, errorTextStyle, Icon } from '../../../shared/ui';
import { ACTION_CANCEL, TITLE_PLACEHOLDER } from './copy';
import { MESSAGE_TEMPLATE_LIST_PATH } from './data-source';
import { editorPageStyle } from './styles';
import { cssVar } from '@tds/ui';

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const headingColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  flexGrow: 1,
  minWidth: 0,
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

/** 제목 입력 — 큰 굵은 글씨. 테두리는 포커스 전까지 없는 것처럼 보이게 표면만 눕힌다 */
function titleInputStyle(invalid: boolean, disabled: boolean): CSSProperties {
  return {
    ...controlStyle(invalid, disabled),
    paddingLeft: cssVar('space.2'),
    paddingRight: cssVar('space.2'),
    borderColor: invalid ? cssVar('color.feedback.danger.border') : 'transparent',
    background: 'transparent',
    fontFamily: 'var(--tds-typography-title-xl-font-family)',
    fontSize: 'var(--tds-typography-title-xl-font-size)',
    fontWeight: cssVar('primitive.typography.font-weight.bold'),
    lineHeight: 'var(--tds-typography-title-xl-line-height)',
  };
}

/** 종류 표시 — 발행본을 수정할 때 '무엇을 수정하고 있는가' 를 제목 위에 적는다 */
const eyebrowStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const TITLE_FIELD_ID = 'message-template-name';

interface TemplateEditorShellProps {
  readonly title: string;
  readonly onTitleChange: (title: string) => void;
  readonly titleError?: string | undefined;
  /** 제목 위 한 줄 — '문자 템플릿' 처럼 지금 무엇을 고치는지 (없으면 그리지 않는다) */
  readonly eyebrow?: string | undefined;
  /** 제목 아래 칩 — 문자 편집기의 SMS/LMS/MMS. 이메일 편집기는 넘기지 않는다 */
  readonly chip?: ReactNode;
  /** 저장·발행 버튼들 — 상태별 구성은 각 편집기가 정한다 */
  readonly actions: ReactNode;
  readonly disabled: boolean;
  readonly children: ReactNode;
}

export function TemplateEditorShell({
  title,
  onTitleChange,
  titleError,
  eyebrow,
  chip,
  actions,
  disabled,
  children,
}: TemplateEditorShellProps) {
  const navigate = useNavigate();

  return (
    <div style={editorPageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(MESSAGE_TEMPLATE_LIST_PATH)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div style={headerStyle}>
        <div style={headingColumnStyle}>
          {eyebrow !== undefined && <span style={eyebrowStyle}>{eyebrow}</span>}

          {/* 라벨은 보이지 않는다 — 큰 제목 칸 위에 '템플릿명' 을 또 적으면 제목이 둘이 된다.
              그래도 AT 는 이름이 필요하므로 aria-label 로 준다 (A11Y-11). */}
          <input
            id={TITLE_FIELD_ID}
            type="text"
            className="tds-ui-focusable"
            style={titleInputStyle(titleError !== undefined, disabled)}
            value={title}
            placeholder={TITLE_PLACEHOLDER}
            disabled={disabled}
            aria-label="템플릿명"
            aria-invalid={titleError !== undefined}
            // [A11Y-11] '잘못됨' 만 알리고 이유를 말하지 않는 입력을 만들지 않는다
            aria-describedby={titleError !== undefined ? errorIdOf(TITLE_FIELD_ID) : undefined}
            onChange={(event) => onTitleChange(event.target.value)}
          />

          {titleError !== undefined && (
            <p id={errorIdOf(TITLE_FIELD_ID)} style={errorTextStyle} role="alert">
              {titleError}
            </p>
          )}

          {chip}
        </div>

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={disabled}
            onClick={() => navigate(MESSAGE_TEMPLATE_LIST_PATH)}
          >
            {ACTION_CANCEL}
          </Button>
          {actions}
        </div>
      </div>

      {children}
    </div>
  );
}
