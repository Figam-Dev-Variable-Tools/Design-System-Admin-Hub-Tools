// 브랜드 메시지 카드형 편집 카드 — 와이드 리스트형의 '항목' 과 캐러셀형의 '카드'
//
// [왜 한 파일에 둘이 있는가] 둘은 화면에서 하는 일이 같다: **고정 개수 범위의 배열을 늘리고 줄이며
// 각 칸에 이미지와 글자를 채운다.** 다른 것은 칸의 개수(리스트는 제목 하나, 카드는 헤더·본문·버튼)와
// 상한뿐이다. 파일을 둘로 쪼개면 추가/삭제 버튼·개수 카운터·상한 잠금이 두 벌이 되고, 실제로는
// 한쪽만 고쳐진 채 남는다(KakaoButtonsCard 가 알림톡·브랜드 메시지를 함께 그리는 것과 같은 결).
//
// [왜 카드마다 버튼 편집기를 다시 그리는가] 캐러셀은 **카드마다 버튼이 따로**다 — 말풍선 바닥의
// 공용 버튼과 다른 물건이다. 규칙(1~2개·8자)도 달라서 KakaoButtonsCard 에 'carousel-card' 문맥을
// 넘긴다(kakao.ts KakaoButtonContext).
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
  BRAND_CAROUSEL_CARD_MAX,
  BRAND_CAROUSEL_HEADER_MAX,
  BRAND_LIST_ITEM_MAX,
  BRAND_LIST_ITEM_TITLE_MAX,
  BRAND_MESSAGE_BODY_MAX,
} from '../kakao';
import type { BrandCarouselCard, BrandListItem, KakaoButton } from '../kakao';
import { sectionHeadingStyle, sectionStyle } from '../styles';
import { ImageAttachRow } from './ImageAttachRow';
import { KakaoButtonsCard } from './KakaoButtonsCard';
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

const cardBodyStyle = (disabled: boolean): CSSProperties => ({
  ...controlStyle(false, disabled),
  minHeight: `calc(${cssVar('space.10')} * 3)`,
  resize: 'vertical',
  fontFamily: cssVar('typography.body.md.font-family'),
  lineHeight: cssVar('typography.body.md.line-height'),
});

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

/** 단조 증가 카운터 — 가운데를 지워도 새 id 를 준다(KakaoButtonsCard 의 buttonSeq 와 같은 근거) */
let cardSeq = 0;

function nextId(prefix: string): string {
  cardSeq += 1;
  return `${prefix}-new-${String(cardSeq)}`;
}

/* ── 와이드 리스트형의 항목 ──────────────────────────────────────────────── */

interface BrandListItemsCardProps {
  readonly items: readonly BrandListItem[];
  readonly disabled: boolean;
  readonly error?: string | undefined;
  readonly onChange: (items: readonly BrandListItem[]) => void;
}

export function BrandListItemsCard({ items, disabled, error, onChange }: BrandListItemsCardProps) {
  const full = items.length >= BRAND_LIST_ITEM_MAX;

  const replace = (index: number, next: BrandListItem) => {
    onChange(items.map((item, at) => (at === index ? next : item)));
  };

  return (
    <section style={sectionStyle}>
      <h3 style={sectionHeadingStyle}>리스트 항목 *</h3>

      {items.length === 0 ? (
        <p style={emptyStyle}>
          {`항목이 없어요. 아래에서 추가하세요(3~${String(BRAND_LIST_ITEM_MAX)}개).`}
        </p>
      ) : (
        <div style={listStyle}>
          {items.map((item, index) => {
            const titleFieldId = `brand-list-title-${item.id}`;
            return (
              <div key={item.id} style={rowStyle}>
                <div style={rowHeadStyle}>
                  <span style={rowTitleStyle}>{`항목 ${String(index + 1)}`}</span>
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

                <FormField
                  htmlFor={titleFieldId}
                  label={`제목 (${String(BRAND_LIST_ITEM_TITLE_MAX)}자)`}
                  required
                >
                  <input
                    id={titleFieldId}
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false, disabled)}
                    value={item.title}
                    disabled={disabled}
                    onChange={(event) => replace(index, { ...item, title: event.target.value })}
                  />
                </FormField>

                <ImageAttachRow
                  fileName={item.imageFileName}
                  disabled={disabled}
                  onChange={(fileName: string) =>
                    replace(index, { ...item, imageFileName: fileName })
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <div style={footStyle}>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || full}
          onClick={() => onChange([...items, { id: nextId('li'), title: '', imageFileName: '' }])}
        >
          <Icon name="plus-circle" />
          항목 추가
        </Button>
        <span style={countStyle}>
          {`${String(items.length)} / ${String(BRAND_LIST_ITEM_MAX)}개`}
        </span>
      </div>

      {error !== undefined && (
        <p id={errorIdOf('brand-list-items')} style={errorTextStyle} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/* ── 캐러셀형의 카드 ─────────────────────────────────────────────────────── */

interface BrandCarouselCardsCardProps {
  readonly cards: readonly BrandCarouselCard[];
  readonly disabled: boolean;
  readonly error?: string | undefined;
  readonly onChange: (cards: readonly BrandCarouselCard[]) => void;
}

export function BrandCarouselCardsCard({
  cards,
  disabled,
  error,
  onChange,
}: BrandCarouselCardsCardProps) {
  const full = cards.length >= BRAND_CAROUSEL_CARD_MAX;

  const replace = (index: number, next: BrandCarouselCard) => {
    onChange(cards.map((card, at) => (at === index ? next : card)));
  };

  return (
    <section style={sectionStyle}>
      <h3 style={sectionHeadingStyle}>캐러셀 카드 *</h3>

      {cards.length === 0 ? (
        <p style={emptyStyle}>
          {`카드가 없어요. 아래에서 추가하세요(2~${String(BRAND_CAROUSEL_CARD_MAX)}장).`}
        </p>
      ) : (
        <div style={listStyle}>
          {cards.map((card, index) => {
            const headerFieldId = `brand-card-header-${card.id}`;
            const bodyFieldId = `brand-card-body-${card.id}`;

            return (
              <div key={card.id} style={rowStyle}>
                <div style={rowHeadStyle}>
                  <span style={rowTitleStyle}>{`카드 ${String(index + 1)}`}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onChange(cards.filter((_, at) => at !== index))}
                  >
                    <Icon name="trash" />
                    삭제
                  </Button>
                </div>

                <FormField
                  htmlFor={headerFieldId}
                  label={`헤더 (선택 · ${String(BRAND_CAROUSEL_HEADER_MAX)}자)`}
                >
                  <input
                    id={headerFieldId}
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false, disabled)}
                    value={card.header}
                    disabled={disabled}
                    onChange={(event) => replace(index, { ...card, header: event.target.value })}
                  />
                </FormField>

                <FormField
                  htmlFor={bodyFieldId}
                  label={`본문 (${String(BRAND_MESSAGE_BODY_MAX.carousel)}자)`}
                  required
                >
                  <textarea
                    id={bodyFieldId}
                    className="tds-ui-input tds-ui-focusable"
                    style={cardBodyStyle(disabled)}
                    value={card.body}
                    disabled={disabled}
                    onChange={(event) => replace(index, { ...card, body: event.target.value })}
                  />
                </FormField>

                <ImageAttachRow
                  fileName={card.imageFileName}
                  disabled={disabled}
                  onChange={(fileName: string) =>
                    replace(index, { ...card, imageFileName: fileName })
                  }
                />

                {/* 카드마다 버튼이 따로다 — 말풍선 바닥의 공용 버튼과 다른 물건이다(머리말) */}
                <KakaoButtonsCard
                  buttons={card.buttons}
                  context={{ kind: 'carousel-card' }}
                  disabled={disabled}
                  onChange={(buttons: readonly KakaoButton[]) =>
                    replace(index, { ...card, buttons })
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <div style={footStyle}>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || full}
          onClick={() =>
            onChange([
              ...cards,
              { id: nextId('cc'), header: '', body: '', imageFileName: '', buttons: [] },
            ])
          }
        >
          <Icon name="plus-circle" />
          카드 추가
        </Button>
        <span style={countStyle}>
          {`${String(cards.length)} / ${String(BRAND_CAROUSEL_CARD_MAX)}장`}
        </span>
      </div>

      {error !== undefined && (
        <p id={errorIdOf('brand-cards')} style={errorTextStyle} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
