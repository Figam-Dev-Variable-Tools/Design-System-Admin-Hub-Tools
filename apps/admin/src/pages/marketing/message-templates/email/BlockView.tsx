// 캔버스 위의 블록 하나를 그린다
//
// [여기서만 hex 가 style 로 흐른다] 아래 style 객체의 색·치수는 **운영자가 정한 데이터**다
// (blocks.ts 주석 참조). 크롬(테두리·선택 윤곽)은 토큰이고, 내용물은 데이터다 — 두 출처가
// 한 파일에서 만나므로 어느 쪽이 어느 쪽인지 주석으로 표시해 둔다.
//
// [미완성 블록] isBlockIncomplete(types.ts) 가 참이면 자리표시 도형 + 붉은 안내를 함께 그린다.
// 빈 칸으로 두면 운영자가 비어 있다는 사실을 모른 채 Publish 한다.
import type { CSSProperties, ReactNode } from 'react';

import { parseInlineMarkdown } from '../render-html';
import type { InlineToken } from '../render-html';
import {
  COLUMN_RATIO_WEIGHTS,
  isBlockIncomplete,
  SOCIAL_PLATFORM_LABEL,
  UNSUBSCRIBE_LABEL,
} from '../types';
import type {
  BlockAlign,
  BlockPadding,
  ButtonSize,
  EmailBlock,
  EmailLeafBlock,
  FontWeight,
  MediaShape,
} from '../types';
import { incompleteTextStyle, placeholderShapeStyle } from './styles';
import { cssVar } from '@tds/ui';

/** 미완성 안내 문구 — 목업 확정(영문) */
export const INCOMPLETE_MESSAGE = '이 블록의 설정이 아직 비어 있습니다.';

/* ── 데이터 → CSS 변환 ───────────────────────────────────────────────────── */

/** 여백은 데이터(숫자)다 — 단축 속성을 쓰지 않고 네 변을 개별 속성으로 낸다 */
function paddingStyle(padding: BlockPadding): CSSProperties {
  return {
    paddingTop: padding.top,
    paddingBottom: padding.bottom,
    paddingLeft: padding.left,
    paddingRight: padding.right,
  };
}

function textAlignOf(align: BlockAlign): CSSProperties['textAlign'] {
  return align;
}

/** flex 정렬 — 이미지/로고/아바타처럼 '덩어리' 를 놓을 때 */
function justifyOf(align: BlockAlign): CSSProperties['justifyContent'] {
  if (align === 'left') return 'flex-start';
  if (align === 'right') return 'flex-end';
  return 'center';
}

function fontWeightOf(weight: FontWeight): CSSProperties['fontWeight'] {
  if (weight === 'bold') return 700;
  if (weight === 'medium') return 500;
  return 400;
}

/** 제목 단계별 글자 크기 — 메일에서 흔히 쓰는 값(데이터가 아니라 이 화면의 표현 규약) */
function headingFontSize(level: 'h1' | 'h2' | 'h3'): number {
  if (level === 'h1') return 32;
  if (level === 'h2') return 24;
  return 20;
}

function buttonPaddingOf(size: ButtonSize): CSSProperties {
  const scale: Readonly<Record<ButtonSize, readonly [number, number]>> = {
    xs: [6, 12],
    sm: [8, 16],
    md: [12, 24],
    lg: [16, 32],
  };
  const [y, x] = scale[size];
  return { paddingTop: y, paddingBottom: y, paddingLeft: x, paddingRight: x };
}

function mediaRadiusOf(shape: MediaShape): CSSProperties['borderRadius'] {
  if (shape === 'circle') return '50%';
  if (shape === 'rounded') return cssVar('radius.md');
  return 0;
}

/** 자리표시 도형의 라운드 — 아바타는 동그라미, 로고는 모서리만 둥글게 */
function placeholderRadiusOf(shape: MediaShape): string {
  if (shape === 'circle') return '50%';
  if (shape === 'rounded') return cssVar('radius.md');
  return '0';
}

/* ── 렌더 ────────────────────────────────────────────────────────────────── */

/** 파일이 없어 그릴 것이 없을 때 — 회색 도형 + 붉은 안내 */
function IncompletePlaceholder({ radius }: { readonly radius: string }) {
  return (
    <>
      <span style={placeholderShapeStyle(radius)} aria-hidden="true" />
      <p style={incompleteTextStyle}>{INCOMPLETE_MESSAGE}</p>
    </>
  );
}

/**
 * 마크다운 토큰 → React 노드.
 *
 * [왜 파서를 여기 두지 않나] 토큰을 만드는 일은 render-html.ts 가 한다 — 캔버스와 발송 HTML 이
 * **같은 해석**을 해야 하기 때문이다. 각자 파싱하면 화면에서 굵던 글자가 메일에서는 별표로 나간다.
 */
function InlineTokens({
  tokens,
  linkColor,
}: {
  readonly tokens: readonly InlineToken[];
  readonly linkColor: string;
}) {
  return (
    <>
      {tokens.map((token, index) => {
        // 토큰은 순서가 곧 정체성이라 인덱스 키가 맞다(재정렬되지 않는 목록이다)
        const key = `${token.kind}-${String(index)}`;
        switch (token.kind) {
          case 'text':
            return <span key={key}>{token.text}</span>;
          case 'bold':
            return <strong key={key}>{token.text}</strong>;
          case 'italic':
            return <em key={key}>{token.text}</em>;
          case 'link':
            // 캔버스는 미리보기다 — 실제로 눌러 나가지 않게 span 으로 그리고 색만 링크처럼 준다
            return (
              <span key={key} style={{ color: linkColor, textDecoration: 'underline' }}>
                {token.text}
              </span>
            );
          case 'break':
            return <br key={key} />;
        }
      })}
    </>
  );
}

interface BlockViewProps {
  readonly block: EmailBlock;
  /** 캔버스 전역 폰트 — 블록이 따로 정하지 않는 곳(divider 등)의 기준 */
  readonly canvasFontFamily: string;
  /** 캔버스 전역 글자색 — 링크 색의 기준 */
  readonly canvasTextColor?: string;
  /**
   * 컬럼 **안**의 블록을 어떻게 그릴지 — 편집 중에는 캔버스가 선택 껍데기를 씌워 넘긴다.
   * 주지 않으면(미리보기) 평범한 BlockView 로 그린다.
   */
  readonly renderChild?: (child: EmailLeafBlock) => ReactNode;
  /**
   * 빈 칸에 무엇을 그릴지 — 편집 중에는 '여기에 넣어라' 는 + 를 넣는다.
   *
   * [왜 캔버스가 아니라 여기서 그리나] 빈 칸의 자리표시는 **칸 안에** 있어야 한다. 캔버스가
   * 행 바깥에 따로 그리면 3단인데 자리표시는 행 아래에 세로로 쌓이는 꼴이 된다(실제로 그렇게
   * 만들었다가 브라우저에서 드러났다). 칸의 위치를 아는 것은 이 컴포넌트뿐이다.
   */
  readonly renderEmptyColumn?: (columnId: string, columnIndex: number) => ReactNode;
}

export function BlockView({
  block,
  canvasFontFamily,
  canvasTextColor,
  renderChild,
  renderEmptyColumn,
}: BlockViewProps) {
  const incomplete = isBlockIncomplete(block);
  // 캔버스 글자색을 모르면 부모 색을 그대로 물려받는다(임의의 색을 지어내지 않는다)
  const linkColor = canvasTextColor ?? 'inherit';

  switch (block.blockKind) {
    case 'heading': {
      const style: CSSProperties = {
        ...paddingStyle(block.padding),
        // ↓ 전부 데이터 — 운영자가 INSPECT 에서 정한 값이다
        color: block.textColor,
        background: block.backgroundColor,
        fontFamily: block.fontFamily,
        fontSize: headingFontSize(block.level),
        fontWeight: fontWeightOf(block.fontWeight),
        textAlign: textAlignOf(block.align),
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        overflowWrap: 'anywhere',
      };
      if (incomplete) {
        return (
          <div style={style}>
            <p style={incompleteTextStyle}>{INCOMPLETE_MESSAGE}</p>
          </div>
        );
      }
      // 캔버스는 문서가 아니라 미리보기다 — 실제 <h1> 을 내면 관리자 화면의 제목 위계를 어지럽힌다
      return (
        <div style={style} role="heading" aria-level={Number(block.level.slice(1))}>
          {block.content}
        </div>
      );
    }

    case 'text': {
      const style: CSSProperties = {
        ...paddingStyle(block.padding),
        color: block.textColor,
        background: block.backgroundColor,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
        fontWeight: fontWeightOf(block.fontWeight),
        textAlign: textAlignOf(block.align),
        // 마크다운을 켜면 파서가 줄바꿈을 <br> 로 바꾸므로 pre-wrap 이 필요 없다
        whiteSpace: block.markdown ? 'normal' : 'pre-wrap',
        overflowWrap: 'anywhere',
      };
      if (incomplete) {
        return (
          <div style={style}>
            <p style={incompleteTextStyle}>{INCOMPLETE_MESSAGE}</p>
          </div>
        );
      }
      // 마크다운이 꺼져 있으면 토큰은 글자 하나뿐이라 결과가 예전과 같다
      return (
        <div style={style}>
          {block.markdown ? (
            <InlineTokens tokens={parseInlineMarkdown(block.content, true)} linkColor={linkColor} />
          ) : (
            block.content
          )}
        </div>
      );
    }

    case 'button': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        display: 'flex',
        justifyContent: justifyOf(block.align),
        background: block.backgroundColor,
      };
      if (incomplete) {
        return (
          <div style={wrapperStyle}>
            <p style={incompleteTextStyle}>{INCOMPLETE_MESSAGE}</p>
          </div>
        );
      }
      const pillStyle: CSSProperties = {
        ...buttonPaddingOf(block.size),
        display: 'inline-block',
        width: block.width === 'full' ? '100%' : 'auto',
        boxSizing: 'border-box',
        background: block.buttonColor,
        color: block.textColor,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
        fontWeight: fontWeightOf(block.fontWeight),
        borderRadius:
          block.shape === 'pill' ? '9999em' : block.shape === 'rounded' ? cssVar('radius.md') : 0,
        textAlign: 'center',
      };
      return (
        <div style={wrapperStyle}>
          <span style={pillStyle}>{block.content}</span>
        </div>
      );
    }

    case 'image': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        display: 'flex',
        justifyContent: justifyOf(block.horizontalAlign),
        alignItems:
          block.verticalAlign === 'top'
            ? 'flex-start'
            : block.verticalAlign === 'bottom'
              ? 'flex-end'
              : 'center',
        flexDirection: 'column',
        background: block.backgroundColor,
      };
      if (incomplete) {
        return (
          <div style={wrapperStyle}>
            <IncompletePlaceholder radius="0" />
          </div>
        );
      }
      // 실제 업로드가 붙기 전이므로 파일명만 있는 자리표시 상자를 그린다(외부 URL 을 만들지 않는다)
      const boxStyle: CSSProperties = {
        width: block.width,
        maxWidth: '100%',
        height: block.height ?? 'auto',
        minHeight: cssVar('space.10'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: cssVar('color.surface.skeleton'),
        color: cssVar('color.text.muted'),
        fontSize: 'var(--tds-typography-caption-md-font-size)',
        overflowWrap: 'anywhere',
      };
      return (
        <div style={wrapperStyle}>
          <div style={boxStyle}>{block.fileName}</div>
        </div>
      );
    }

    case 'logo':
    case 'avatar': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        display: 'flex',
        flexDirection: 'column',
        alignItems:
          block.align === 'left' ? 'flex-start' : block.align === 'right' ? 'flex-end' : 'center',
      };
      if (incomplete) {
        return (
          <div style={wrapperStyle}>
            <IncompletePlaceholder radius={placeholderRadiusOf(block.shape)} />
          </div>
        );
      }
      const mediaStyle: CSSProperties = {
        width: block.size,
        height: block.size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: mediaRadiusOf(block.shape),
        background: cssVar('color.surface.skeleton'),
        color: cssVar('color.text.muted'),
        fontFamily: canvasFontFamily,
        fontSize: 'var(--tds-typography-caption-md-font-size)',
        overflow: 'hidden',
      };
      return (
        <div style={wrapperStyle}>
          <div style={mediaStyle} title={block.fileName} />
        </div>
      );
    }

    case 'divider': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        background: block.backgroundColor,
      };
      const ruleStyle: CSSProperties = {
        height: block.height,
        background: block.color,
        borderStyle: 'none',
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      };
      return (
        <div style={wrapperStyle}>
          <hr style={ruleStyle} />
        </div>
      );
    }

    case 'spacer': {
      // 빈 높이 그 자체가 내용이다 — 편집 중에 보이지 않으면 고를 수 없으므로 옅은 빗금을 깐다
      const style: CSSProperties = {
        ...paddingStyle(block.padding),
        height: block.height,
        background: block.backgroundColor,
        boxSizing: 'border-box',
      };
      return <div style={style} />;
    }

    case 'social': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        display: 'flex',
        flexWrap: 'wrap',
        gap: cssVar('space.2'),
        justifyContent: justifyOf(block.align),
        background: block.backgroundColor,
        color: block.textColor,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
      };
      if (incomplete) {
        return (
          <div style={wrapperStyle}>
            <p style={incompleteTextStyle}>{INCOMPLETE_MESSAGE}</p>
          </div>
        );
      }
      return (
        <div style={wrapperStyle}>
          {block.links.map((link) => (
            <span key={link.id} style={{ textDecoration: 'underline' }}>
              {SOCIAL_PLATFORM_LABEL[link.platform]}
            </span>
          ))}
        </div>
      );
    }

    case 'menu': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        display: 'flex',
        flexWrap: 'wrap',
        gap: cssVar('space.2'),
        justifyContent: justifyOf(block.align),
        background: block.backgroundColor,
        color: block.textColor,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
        fontWeight: fontWeightOf(block.fontWeight),
      };
      if (incomplete) {
        return (
          <div style={wrapperStyle}>
            <p style={incompleteTextStyle}>{INCOMPLETE_MESSAGE}</p>
          </div>
        );
      }
      return (
        <div style={wrapperStyle}>
          {block.items.map((item, index) => (
            <span key={item.id}>
              {index > 0 && (
                <span aria-hidden="true" style={{ paddingRight: cssVar('space.2') }}>
                  {block.separator}
                </span>
              )}
              {item.label}
            </span>
          ))}
        </div>
      );
    }

    case 'video': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        display: 'flex',
        justifyContent: justifyOf(block.align),
        background: block.backgroundColor,
      };
      if (incomplete) {
        return (
          <div style={wrapperStyle}>
            <IncompletePlaceholder radius="var(--tds-radius-md)" />
          </div>
        );
      }
      // 재생기가 아니라 '재생 버튼이 얹힌 썸네일' 이다 — 메일에서 재생되지 않는다는 사실을 그림으로 알린다
      const thumbStyle: CSSProperties = {
        position: 'relative',
        width: block.width,
        maxWidth: '100%',
        minHeight: cssVar('space.10'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: cssVar('radius.md'),
        background: cssVar('color.surface.skeleton'),
        color: cssVar('color.text.muted'),
        fontSize: 'var(--tds-typography-caption-md-font-size)',
        overflowWrap: 'anywhere',
      };
      return (
        <div style={wrapperStyle}>
          <div style={thumbStyle}>
            <span aria-hidden="true">▶</span>
          </div>
        </div>
      );
    }

    case 'list': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        background: block.backgroundColor,
        color: block.textColor,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
        textAlign: textAlignOf(block.align),
      };
      if (incomplete) {
        return (
          <div style={wrapperStyle}>
            <p style={incompleteTextStyle}>{INCOMPLETE_MESSAGE}</p>
          </div>
        );
      }
      const listStyle: CSSProperties = {
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        paddingLeft: cssVar('space.6'),
      };
      const items = block.items.map((item) => (
        <li key={item.id}>
          <InlineTokens tokens={parseInlineMarkdown(item.text, true)} linkColor={linkColor} />
        </li>
      ));
      return (
        <div style={wrapperStyle}>
          {block.ordered ? <ol style={listStyle}>{items}</ol> : <ul style={listStyle}>{items}</ul>}
        </div>
      );
    }

    case 'footer': {
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        background: block.backgroundColor,
        color: block.textColor,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
        textAlign: textAlignOf(block.align),
        overflowWrap: 'anywhere',
      };
      if (incomplete) {
        return (
          <div style={wrapperStyle}>
            <p style={incompleteTextStyle}>{INCOMPLETE_MESSAGE}</p>
          </div>
        );
      }
      const lines = [block.companyName, block.companyAddress, block.contactEmail].filter(
        (line) => line.trim() !== '',
      );
      return (
        <div style={wrapperStyle}>
          {lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
          <div style={{ paddingTop: cssVar('space.3') }}>
            <span style={{ color: block.linkColor, textDecoration: 'underline' }}>
              {UNSUBSCRIBE_LABEL}
            </span>
          </div>
        </div>
      );
    }

    case 'columns': {
      const weights = COLUMN_RATIO_WEIGHTS[block.ratio];
      const wrapperStyle: CSSProperties = {
        ...paddingStyle(block.padding),
        display: 'flex',
        alignItems:
          block.verticalAlign === 'top'
            ? 'flex-start'
            : block.verticalAlign === 'bottom'
              ? 'flex-end'
              : 'center',
        gap: block.gap,
        background: block.backgroundColor,
      };
      return (
        <div style={wrapperStyle}>
          {block.columns.map((column, index) => {
            const weight = weights[index] ?? 1;
            const columnStyle: CSSProperties = {
              flexGrow: weight,
              flexShrink: 1,
              // flex-basis 0 이라야 가중치가 그대로 폭 비율이 된다(내용 폭이 비율을 흔들지 않게)
              flexBasis: 0,
              minWidth: 0,
            };
            return (
              <div key={column.id} style={columnStyle}>
                {column.blocks.length === 0 && renderEmptyColumn !== undefined
                  ? renderEmptyColumn(column.id, index)
                  : column.blocks.map((child) =>
                      renderChild === undefined ? (
                        <BlockView
                          key={child.id}
                          block={child}
                          canvasFontFamily={canvasFontFamily}
                          {...(canvasTextColor === undefined ? {} : { canvasTextColor })}
                        />
                      ) : (
                        renderChild(child)
                      ),
                    )}
              </div>
            );
          })}
        </div>
      );
    }
  }
}
