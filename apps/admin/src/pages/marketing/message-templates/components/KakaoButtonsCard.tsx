// 카카오 버튼 편집 카드 — 알림톡 · 브랜드 메시지가 공유한다
//
// [왜 버튼이 카드 하나를 차지하는가] 종전 모델에는 버튼이 아예 없었다. 그런데 카카오에서 버튼은
// 장식이 아니다 — **알림톡은 버튼명 글자 수가 본문 1,000자에 합산되고**, 유형(AC)에 따라 쓸 수 있는
// 메시지 유형이 갈리며, 버튼명에는 치환변수를 쓸 수 없다. 문자열 배열이었다면 이 규칙 중 어느
// 하나도 화면에 걸 수 없다. 규칙의 정본은 kakao.ts 이고 이 카드는 그것을 부르기만 한다.
//
// [왜 오류를 버튼마다 그리는가] 목록 전체에 한 줄로 붙이면 '3번 버튼의 이름이 길다' 가
// '버튼에 문제가 있다' 로 뭉개진다 — 다섯 개 중 어느 것을 고쳐야 하는지가 사라진다.
import type { CSSProperties } from 'react';

import {
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  Icon,
  SelectField,
} from '../../../../shared/ui';
import { KAKAO_LABEL_BUTTONS } from '../copy';
import {
  AC_BUTTON_NAME,
  allowsChannelAddButton,
  buttonCountMaxOf,
  buttonError,
  buttonNameMaxOf,
  KAKAO_BUTTON_TYPE_LABEL,
  usesLink,
} from '../kakao';
import type { KakaoButton, KakaoButtonContext, KakaoButtonType } from '../kakao';
import { sectionHeadingStyle, sectionStyle } from '../styles';
import { cssVar } from '@tds/ui';

const BUTTON_TYPES: readonly KakaoButtonType[] = ['WL', 'AL', 'DS', 'BK', 'MD', 'AC'];

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

const rowHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const rowTitleStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

const fieldsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const fieldStyle: CSSProperties = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: `calc(${cssVar('space.10')} * 2)`,
  minWidth: 0,
};

/* 입력 표면은 공용 controlStyle 의 것이다 — 테두리·라운드·여백·오류 테두리·잠금 배경이 앱의
   다른 입력과 같아야 한다(ContentInputCard 가 textarea 에 대해 그런 것과 같은 결). */

const emptyStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};

const footStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const countStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  fontVariantNumeric: 'tabular-nums',
};

/**
 * 새 버튼의 초기값 — 웹링크가 가장 흔하다.
 *
 * [왜 개수로 id 를 만들지 않는가] `btn-${buttons.length + 1}` 은 **가운데를 지우면 충돌한다**:
 * [btn-1, btn-2] 에서 btn-1 을 지우면 [btn-2] 가 남고, 거기에 추가하면 다시 btn-2 가 된다.
 * 그러면 React key 가 겹쳐 두 행이 서로의 입력값을 물려받는다. 단조 증가 카운터는 지우기와
 * 무관하게 새 값을 준다 — 이 id 는 화면 안에서만 쓰이고 저장 후에는 서버가 다시 매긴다.
 */
let buttonSeq = 0;

function newButton(): KakaoButton {
  buttonSeq += 1;
  return { id: `btn-new-${String(buttonSeq)}`, type: 'WL', name: '', linkMobile: '', linkPc: '' };
}

interface KakaoButtonsCardProps {
  readonly buttons: readonly KakaoButton[];
  /**
   * 이 버튼들이 놓이는 자리 — 개수·이름 상한과 AC 버튼 가능 여부가 전부 여기서 나온다.
   *
   * [왜 kind 하나가 아닌가] 브랜드 메시지 **안에서도** 유형마다 상한이 다르다(와이드 이미지형은
   * 2개·8자, 나머지는 5개·14자). kind 만 받으면 그 차이를 표현할 수 없어 카드가 틀린 상한을
   * 화면에 적는다 — 판정의 정본은 kakao.ts 의 KakaoButtonContext 다.
   */
  readonly context: KakaoButtonContext;
  readonly disabled: boolean;
  readonly onChange: (buttons: readonly KakaoButton[]) => void;
}

export function KakaoButtonsCard({ buttons, context, disabled, onChange }: KakaoButtonsCardProps) {
  const nameMax = buttonNameMaxOf(context);
  const countMax = buttonCountMaxOf(context);
  const full = buttons.length >= countMax;

  const replace = (index: number, next: KakaoButton) => {
    onChange(buttons.map((button, at) => (at === index ? next : button)));
  };

  /**
   * 유형을 바꾸면 그 유형이 쓰지 않는 값은 **비운다**.
   * 남겨 두면 배송조회 버튼이 예전 웹링크 주소를 몰래 들고 저장된다 — 화면에는 보이지 않는 값이다.
   * AC 로 바꿀 때 이름을 고정값으로 덮는 것도 같은 이유다(카카오가 정하는 글자다).
   */
  const changeType = (index: number, button: KakaoButton, type: KakaoButtonType) => {
    replace(index, {
      id: button.id,
      type,
      name: type === 'AC' ? AC_BUTTON_NAME : button.name,
      linkMobile: usesLink(type) ? button.linkMobile : '',
      linkPc: usesLink(type) ? button.linkPc : '',
    });
  };

  return (
    <section style={sectionStyle}>
      <h3 style={sectionHeadingStyle}>{KAKAO_LABEL_BUTTONS}</h3>

      {buttons.length === 0 ? (
        <p style={emptyStyle}>버튼이 없어요. 필요하면 아래에서 추가하세요.</p>
      ) : (
        <div style={listStyle}>
          {buttons.map((button, index) => {
            const error = buttonError(button, context);
            const fixedName = button.type === 'AC';
            const nameFieldId = `kakao-button-name-${button.id}`;
            const linkFieldId = `kakao-button-link-${button.id}`;

            return (
              <div key={button.id} style={rowStyle}>
                <div style={rowHeadStyle}>
                  <span style={rowTitleStyle}>{`버튼 ${String(index + 1)}`}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onChange(buttons.filter((_, at) => at !== index))}
                  >
                    <Icon name="trash" />
                    삭제
                  </Button>
                </div>

                <div style={fieldsStyle}>
                  <span style={fieldStyle}>
                    <FormField htmlFor={`kakao-button-type-${button.id}`} label="유형">
                      <SelectField
                        id={`kakao-button-type-${button.id}`}
                        value={button.type}
                        disabled={disabled}
                        onChange={(event) => {
                          const picked = BUTTON_TYPES.find((type) => type === event.target.value);
                          if (picked !== undefined) changeType(index, button, picked);
                        }}
                      >
                        {BUTTON_TYPES.map((type) => (
                          <option
                            key={type}
                            value={type}
                            /* 채널추가는 채널추가형·복합형에서만 — 고를 수 없는 것을 고를 수 있게
                               두면 저장 단계에서야 막힌다(kakao.ts allowsChannelAddButton) */
                            disabled={
                              type === 'AC' &&
                              context.kind === 'alimtalk' &&
                              !allowsChannelAddButton(context.messageType)
                            }
                          >
                            {`${type} · ${KAKAO_BUTTON_TYPE_LABEL[type]}`}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>
                  </span>

                  <span style={fieldStyle}>
                    <FormField
                      htmlFor={nameFieldId}
                      label={`버튼명 (${String(nameMax)}자 이내)`}
                      {...(error !== null && { error })}
                    >
                      <input
                        id={nameFieldId}
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(error !== null, disabled || fixedName)}
                        value={fixedName ? AC_BUTTON_NAME : button.name}
                        /* 채널추가 버튼명은 카카오가 고정한다 — 고칠 수 있게 두면 심사에서 반려된다 */
                        disabled={disabled || fixedName}
                        aria-invalid={error !== null}
                        /* [A11Y-11] '잘못됨' 만 알리고 이유를 말하지 않는 입력을 만들지 않는다 —
                           FormField 가 error 를 이 id 로 그린다 */
                        {...(error !== null && { 'aria-describedby': errorIdOf(nameFieldId) })}
                        onChange={(event) =>
                          replace(index, { ...button, name: event.target.value })
                        }
                      />
                    </FormField>
                  </span>

                  {usesLink(button.type) && (
                    <span style={fieldStyle}>
                      <FormField htmlFor={linkFieldId} label="모바일 링크" required>
                        <input
                          id={linkFieldId}
                          type="text"
                          className="tds-ui-input tds-ui-focusable"
                          style={controlStyle(false, disabled)}
                          value={button.linkMobile}
                          disabled={disabled}
                          onChange={(event) =>
                            replace(index, { ...button, linkMobile: event.target.value })
                          }
                        />
                      </FormField>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={footStyle}>
        <Button
          variant="secondary"
          size="sm"
          // 상한에 닿으면 버튼을 잠근다 — 눌러 보고 나서 '5개까지' 를 듣게 하지 않는다
          disabled={disabled || full}
          onClick={() => onChange([...buttons, newButton()])}
        >
          <Icon name="plus-circle" />
          버튼 추가
        </Button>
        <span style={countStyle}>{`${String(buttons.length)} / ${String(countMax)}개`}</span>
      </div>
    </section>
  );
}
