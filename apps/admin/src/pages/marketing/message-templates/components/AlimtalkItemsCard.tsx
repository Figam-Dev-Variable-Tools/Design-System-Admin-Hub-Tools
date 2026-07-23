// 알림톡 아이템리스트 편집 카드 — 강조 유형이 '아이템리스트형' 일 때만 나타난다
//
// [무엇이 이 유형의 핵심인가] 아이템리스트형은 본문 위에 **표**를 얹는다. 표의 각 행은 항목명(6자)과
// 항목값(23자) 두 칸이고, 행은 2~10개다. 규칙의 정본은 kakao.ts 이고 이 카드는 그것을 부르기만 한다.
//
// [왜 항목명이 6자인가] 표의 왼쪽 열이라 그렇다 — '주문번호'·'결제금액' 같은 짧은 이름을 위한 칸이다.
// 상한을 넉넉히 잡으면 운영자가 문장을 적고 수신 화면에서 왼쪽 열이 통째로 말줄임된다.
//
// [왜 항목명에 변수를 못 쓰나] 표의 머리글이 발송마다 달라지면 심사가 본 표와 다른 표가 나간다.
// KakaoButtonsCard 가 버튼명에 대해 같은 규칙을 거는 것과 같은 근거다.
import type { CSSProperties } from 'react';

import {
  Button,
  controlStyle,
  errorIdOf,
  errorTextStyle,
  FormField,
  Icon,
} from '../../../../shared/ui';
import {
  ALIMTALK_ITEM_DESCRIPTION_MAX,
  ALIMTALK_ITEM_LIST_MAX,
  ALIMTALK_ITEM_NAME_MAX,
} from '../kakao';
import type { AlimtalkItem } from '../kakao';
import { sectionHeadingStyle, sectionStyle } from '../styles';
import { cssVar } from '@tds/ui';

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

/**
 * 두 칸의 폭이 다른 것이 곧 설명이다 — 항목명은 짧고(6자) 항목값은 길다(23자).
 * 같은 폭으로 두면 운영자가 왼쪽 칸에도 문장을 적을 수 있다고 읽는다.
 */
const nameFieldStyle: CSSProperties = {
  flexGrow: 0,
  flexShrink: 1,
  flexBasis: `calc(${cssVar('space.10')} * 2)`,
  minWidth: 0,
};

const descriptionFieldStyle: CSSProperties = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: `calc(${cssVar('space.10')} * 4)`,
  minWidth: 0,
};

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
 * 새 행의 id — KakaoButtonsCard 의 buttonSeq 와 같은 이유로 단조 증가 카운터를 쓴다.
 * `items.length + 1` 은 가운데를 지우면 충돌해 두 행이 서로의 입력값을 물려받는다.
 */
let itemSeq = 0;

function newItem(): AlimtalkItem {
  itemSeq += 1;
  return { id: `item-new-${String(itemSeq)}`, name: '', description: '' };
}

interface AlimtalkItemsCardProps {
  readonly items: readonly AlimtalkItem[];
  readonly disabled: boolean;
  /** 목록 전체의 오류(개수·행 내용) — 규칙의 정본은 kakao.ts itemsError 다 */
  readonly error?: string | undefined;
  readonly onChange: (items: readonly AlimtalkItem[]) => void;
}

export function AlimtalkItemsCard({ items, disabled, error, onChange }: AlimtalkItemsCardProps) {
  const full = items.length >= ALIMTALK_ITEM_LIST_MAX;

  const replace = (index: number, next: AlimtalkItem) => {
    onChange(items.map((item, at) => (at === index ? next : item)));
  };

  return (
    <section style={sectionStyle}>
      <h3 style={sectionHeadingStyle}>아이템 리스트 *</h3>

      {items.length === 0 ? (
        <p style={emptyStyle}>
          {`아이템이 없어요. 아래에서 추가하세요(최소 2개, 최대 ${String(ALIMTALK_ITEM_LIST_MAX)}개).`}
        </p>
      ) : (
        <div style={listStyle}>
          {items.map((item, index) => {
            const nameFieldId = `alimtalk-item-name-${item.id}`;
            const descriptionFieldId = `alimtalk-item-description-${item.id}`;

            return (
              <div key={item.id} style={rowStyle}>
                <div style={rowHeadStyle}>
                  <span style={rowTitleStyle}>{`아이템 ${String(index + 1)}`}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onChange(items.filter((_, at) => at !== index))}
                  >
                    <Icon name="trash" />
                    삭제
                  </Button>
                </div>

                <div style={fieldsStyle}>
                  <span style={nameFieldStyle}>
                    <FormField
                      htmlFor={nameFieldId}
                      label={`항목명 (${String(ALIMTALK_ITEM_NAME_MAX)}자)`}
                      required
                    >
                      <input
                        id={nameFieldId}
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(false, disabled)}
                        value={item.name}
                        disabled={disabled}
                        onChange={(event) => replace(index, { ...item, name: event.target.value })}
                      />
                    </FormField>
                  </span>

                  <span style={descriptionFieldStyle}>
                    <FormField
                      htmlFor={descriptionFieldId}
                      label={`항목값 (${String(ALIMTALK_ITEM_DESCRIPTION_MAX)}자)`}
                      required
                    >
                      <input
                        id={descriptionFieldId}
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(false, disabled)}
                        value={item.description}
                        disabled={disabled}
                        onChange={(event) =>
                          replace(index, { ...item, description: event.target.value })
                        }
                      />
                    </FormField>
                  </span>
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
          // 상한에 닿으면 잠근다 — 눌러 보고 나서 '10개까지' 를 듣게 하지 않는다
          disabled={disabled || full}
          onClick={() => onChange([...items, newItem()])}
        >
          <Icon name="plus-circle" />
          아이템 추가
        </Button>
        <span style={countStyle}>
          {`${String(items.length)} / ${String(ALIMTALK_ITEM_LIST_MAX)}개`}
        </span>
      </div>

      {error !== undefined && (
        // [A11Y-11] 어느 행이 왜 잘못됐는지를 문구가 말한다(itemsError 가 '아이템 N:' 을 붙인다)
        <p id={errorIdOf('alimtalk-items')} style={errorTextStyle} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
