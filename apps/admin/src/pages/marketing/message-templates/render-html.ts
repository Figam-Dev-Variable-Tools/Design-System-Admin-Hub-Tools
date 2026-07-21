// 이메일 블록 → HTML (순수 함수 · DOM 없이 돈다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 위한 변환인가]
// 이메일 템플릿의 본문은 **블록 목록**(EmailTemplateContent.blocks)이다. 반면 이메일 발송 폼의
// 본문은 리치 텍스트 한 덩어리다. 발송 화면이 템플릿을 불러오려면 그 사이를 누군가 옮겨야 하고,
// 그 변환의 정본이 이 파일이다.
//
// [왜 DOM 을 쓰지 않는가] 이 함수는 vitest(node)에서 그대로 검증돼야 한다. document 에 기대면
// 변환 규칙을 테스트할 수 없고, 나중에 서버가 같은 변환을 하게 될 때 옮길 수도 없다.
//
// [이 함수는 sanitize 하지 않는다 — 호출부가 한다]
// 여기서는 **이메일이 실제로 나갈 때의 모습**(캔버스 색·폰트가 인라인 style 로 박힌 HTML)을 만든다.
// 수신자의 메일함에는 우리 스타일시트가 없으므로 이메일 HTML 은 인라인 style 이 정상이다.
// 그런데 발송 폼의 본문 필드는 더 엄격하다: sanitizeRichText(@tds/ui)가 style·div·h1 을 전부
// 걷어낸다("본문이 자기 색·크기를 들고 다니면 디자인 시스템 밖의 값이 문서에 굳는다" — 그쪽 주석).
// 그래서 **폼에 넣는 쪽이** sanitize 를 통과시킨다. 두 소비자의 규칙이 다르므로 변환과 소독을
// 한 함수에 합치지 않는다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 <div> 가 아니라 표(table)인가 — 이 파일의 가장 중요한 제약]
// 예전 이 파일은 <div>·<p> 에 CSS `padding` 을 얹었다. 그것은 화면에서는 맞지만 **메일에서는
// 조용히 무너진다**: Windows 판 고전 Outlook 은 브라우저 엔진이 아니라 **Word 렌더링 엔진**으로
// 메일을 그리고, Word 는 블록 요소의 padding 을 무시한다. 즉 운영자가 캔버스에서 맞춘 여백이
// 수신자에게는 **전부 0** 으로 도착한다. 화면과 결과가 다른데 아무도 오류를 보지 못하는,
// 최악의 종류의 버그다.
//
// 그래서 모든 블록은 `<tr><td style="padding:...">` 한 줄로 나간다 — Word 가 존중하는 것은
// **표 칸의 padding** 이다. 레이아웃용 표에는 `role="presentation"` 을 붙여 스크린리더가 이것을
// '자료가 담긴 표' 로 읽지 않게 한다(붙이지 않으면 '2열 5행 표' 라고 읽어 준다).
//
// 고전 Outlook 은 2029 년까지 지원된다(Microsoft 의 새 Outlook 이행 문서 기준) — '곧 사라질
// 예외' 가 아니라 지금 다수의 업무용 수신함이다.
//
// [다단(컬럼)은 왜 flex 가 아닌가] Word 엔진에는 flexbox·grid 가 없다. 다단은 (1) inline-block
// div 로 만들고 (2) Outlook 에게만 보이는 조건부 주석 안에 **유령 표(ghost table)** 를 세워
// 두 세계 모두에서 나란히 놓이게 한다. 이때 div 사이에 **공백 문자가 하나라도 있으면** 칸
// 사이에 4px 틈이 생기므로 이 파일은 조각을 빈 문자열로 잇는다(join('')).
// ─────────────────────────────────────────────────────────────────────────────
import { COLUMN_RATIO_WEIGHTS, SOCIAL_PLATFORM_LABEL, UNSUBSCRIBE_LABEL } from './types';
import type {
  BlockAlign,
  BlockPadding,
  ButtonBlock,
  ButtonSize,
  ColumnsBlock,
  EmailBlock,
  EmailCanvasStyle,
  FontWeight,
} from './types';

/** 텍스트 → HTML 텍스트 노드. 사용자가 친 `<b>` 가 태그로 살아나지 않게 한다 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 링크 주소를 안전한 것만 통과시킨다. **빈 문자열은 '이 주소로는 아무 데도 못 간다' 는 뜻이다.**
 *
 * [왜 export 하나] 발송 전 점검(preflight.ts)이 같은 판정을 해야 한다. 점검이 `url !== ''` 만
 * 보면 `#{TRACKING_URL}` 처럼 **적혀 있지만 렌더러가 버리는** 주소를 통과시키고, 그러면 버튼은
 * 그려지는데 눌러도 아무 일이 없는 메일이 나간다. 화면의 판정과 발송물의 판정이 갈리는 순간
 * 점검은 거짓 안심이 되므로, 규칙은 이 함수 하나뿐이다.
 *
 * [왜 필요한가] 주소는 운영자가 친 자유 문자열이고, 본문에는 마크다운 링크까지 들어온다.
 * `javascript:` 를 그대로 href 에 넣으면 그것을 실행하는 클라이언트(주로 웹메일 미리보기)에서
 * 스크립트가 된다. 화이트리스트로 막는다 — 블랙리스트는 `JaVaScRiPt:` 같은 변형을 놓친다.
 */
export function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === '') return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  // 스킴이 없으면 상대/도메인 표기로 보고 https 를 붙인다 (`example.com/a` → `https://example.com/a`)
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

function hrefAttr(url: string): string {
  const safe = safeUrl(url);
  return safe === '' ? '' : ` href="${escapeHtml(safe)}"`;
}

/* ── 인라인 마크다운 ──────────────────────────────────────────────────────────
 *
 * [왜 여기 있나] TextBlock 에는 `markdown` 스위치가 있는데, 예전에는 **렌더러가 그 값을 아예
 * 읽지 않았다** — 운영자가 켜도 결과가 같았다. 화면에만 영향을 주는 컨트롤은 거짓말이므로
 * 실제로 해석하게 만든다. 다만 해석 범위는 **인라인 세 가지**(굵게·기울임·링크)로 못박는다:
 * 표·인용·코드블록까지 받아들이면 Word 엔진에서 무너지는 마크업을 운영자가 만들 수 있게 된다.
 *
 * 토큰으로 내보내는 이유는 소비자가 둘이기 때문이다 — 이 파일은 HTML 로, 캔버스(BlockView)는
 * React 노드로 그린다. 둘이 각자 파싱하면 화면과 결과가 갈린다. */

export type InlineToken =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'bold'; readonly text: string }
  | { readonly kind: 'italic'; readonly text: string }
  | { readonly kind: 'link'; readonly text: string; readonly url: string }
  | { readonly kind: 'break' };

/** `**굵게**` · `*기울임*` · `[문구](주소)` — 이 셋만 본다 */
const INLINE_PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * 본문 한 덩어리 → 토큰 목록.
 * `markdown` 이 꺼져 있으면 글자와 줄바꿈만 낸다(입력 그대로).
 */
export function parseInlineMarkdown(text: string, markdown: boolean): readonly InlineToken[] {
  const tokens: InlineToken[] = [];

  text.split('\n').forEach((line, index) => {
    if (index > 0) tokens.push({ kind: 'break' });
    if (!markdown) {
      if (line !== '') tokens.push({ kind: 'text', text: line });
      return;
    }

    let cursor = 0;
    INLINE_PATTERN.lastIndex = 0;
    let match = INLINE_PATTERN.exec(line);
    while (match !== null) {
      if (match.index > cursor) {
        tokens.push({ kind: 'text', text: line.slice(cursor, match.index) });
      }
      const [whole, boldText, italicText, linkText, linkUrl] = match;
      if (boldText !== undefined) {
        tokens.push({ kind: 'bold', text: boldText });
      } else if (italicText !== undefined) {
        tokens.push({ kind: 'italic', text: italicText });
      } else if (linkText !== undefined && linkUrl !== undefined) {
        tokens.push({ kind: 'link', text: linkText, url: linkUrl });
      }
      cursor = match.index + whole.length;
      match = INLINE_PATTERN.exec(line);
    }
    if (cursor < line.length) tokens.push({ kind: 'text', text: line.slice(cursor) });
  });

  return tokens;
}

/** 토큰 → HTML. 링크 색은 본문 색을 물려받게 두지 않는다(링크임을 알아볼 수 있어야 한다) */
function tokensToHtml(tokens: readonly InlineToken[], linkColor: string): string {
  return tokens
    .map((token) => {
      switch (token.kind) {
        case 'text':
          return escapeHtml(token.text);
        case 'bold':
          return `<strong>${escapeHtml(token.text)}</strong>`;
        case 'italic':
          return `<em>${escapeHtml(token.text)}</em>`;
        case 'link': {
          const href = hrefAttr(token.url);
          if (href === '') return escapeHtml(token.text);
          const attr = styleAttr([['color', linkColor]]);
          return `<a${href}${attr}>${escapeHtml(token.text)}</a>`;
        }
        case 'break':
          return '<br />';
      }
    })
    .join('');
}

/** 본문을 토큰으로 바꿔 HTML 로 — 마크다운이 꺼져 있어도 줄바꿈은 <br> 로 살린다 */
function inlineHtml(text: string, markdown: boolean, linkColor: string): string {
  return tokensToHtml(parseInlineMarkdown(text, markdown), linkColor);
}

/* ── 치수·스타일 도우미 ──────────────────────────────────────────────────── */

/**
 * 캔버스 테두리 두께(px)와 본문 폭.
 *
 * [왜 토큰이 아니라 숫자인가] 이 파일이 만드는 것은 **화면 스타일이 아니라 발송되는 메일의 HTML**
 * 이다. 수신자의 메일함에는 우리 스타일시트가 없어 `var(--tds-border-width-thin)` 은 아무것도
 * 해석되지 않고 테두리가 통째로 사라진다. 같은 이유로 블록의 padding·font-size 도 실제 px 로 나간다.
 */
const CANVAS_BORDER_WIDTH = 1;

/**
 * 본문 폭 600px — 다단의 각 칸 폭을 px 로 계산하려면 기준 폭이 필요하다.
 * (Outlook 유령 표는 % 를 제대로 못 쓰므로 칸 폭이 반드시 px 여야 한다.)
 */
export const EMAIL_BODY_WIDTH = 600;

const FONT_WEIGHT_VALUE: Readonly<Record<FontWeight, string>> = {
  regular: '400',
  medium: '500',
  bold: '700',
};

/** `key:value;` 들을 하나의 style 속성으로 — 빈 값은 버린다(빈 style="" 을 남기지 않는다) */
function styleAttr(declarations: readonly (readonly [string, string | null])[]): string {
  const body = declarations
    .filter((pair): pair is readonly [string, string] => pair[1] !== null && pair[1] !== '')
    .map(([property, value]) => `${property}:${value}`)
    .join(';');
  return body === '' ? '' : ` style="${escapeHtml(body)}"`;
}

function px(value: number): string {
  return `${String(Math.round(value))}px`;
}

function paddingCss(padding: BlockPadding): string {
  return `${px(padding.top)} ${px(padding.right)} ${px(padding.bottom)} ${px(padding.left)}`;
}

function alignCss(align: BlockAlign): string {
  return align;
}

/** 헤딩 단계 → 태그. h1 은 문서에 하나뿐이어야 하므로 본문에서는 h2 부터 쓴다 */
const HEADING_TAG: Readonly<Record<'h1' | 'h2' | 'h3', string>> = {
  h1: 'h2',
  h2: 'h2',
  h3: 'h3',
};

/** 헤딩 단계별 글자 크기 — 캔버스(BlockView)의 headingFontSize 와 같은 표를 쓴다 */
const HEADING_FONT_SIZE: Readonly<Record<'h1' | 'h2' | 'h3', number>> = { h1: 32, h2: 24, h3: 20 };

/**
 * 레이아웃 표 한 겹. `role="presentation"` 은 선택이 아니라 필수다 — 없으면 스크린리더가
 * 레이아웃용 표를 자료표로 읽어 '3행 2열' 따위를 낭독한다.
 */
function table(rows: string, styleDeclarations: readonly (readonly [string, string | null])[]) {
  const attr = styleAttr([['border-collapse', 'collapse'], ...styleDeclarations]);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${attr}><tbody>${rows}</tbody></table>`;
}

/** 블록 한 개 = 표의 한 행. 여백은 **여기(td)** 에 얹힌다 — Word 가 존중하는 유일한 자리다 */
function row(
  content: string,
  padding: BlockPadding,
  extra: readonly (readonly [string, string | null])[],
  align?: BlockAlign,
): string {
  const attr = styleAttr([['padding', paddingCss(padding)], ...extra]);
  const alignAttr = align === undefined ? '' : ` align="${alignCss(align)}"`;
  return `<tr><td${alignAttr}${attr}>${content}</td></tr>`;
}

/**
 * 파일만 있고 URL 이 없는 블록(이미지·로고·아바타·비디오 썸네일)의 표현.
 *
 * [왜 <img src="파일명"> 을 내지 않는가] 파일명은 URL 이 아니다 — 그대로 src 에 넣으면 수신자에게
 * **깨진 이미지**가 나간다. 업로드 이음매가 생기기 전까지는 '여기에 이 파일이 붙는다' 는 사실을
 * 글자로 남기는 편이 정직하다.
 * TODO(backend): POST /api/uploads 가 응답 URL 을 주면 그 URL 로 <img alt="..."> 를 낸다.
 */
function fileNote(kind: string, fileName: string): string {
  return `[${kind}: ${escapeHtml(fileName)}]`;
}

/* ── 버튼 (Outlook 대응 VML) ──────────────────────────────────────────────────
 *
 * [왜 이 고생을 하나] 예전에는 버튼을 `<a style="display:inline-block;background:...">` 하나로
 * 냈다. Word 엔진은 인라인 요소의 background-color·padding·border-radius 를 그리지 않으므로
 * 고전 Outlook 수신자에게는 **색도 모양도 없는 맨 링크 글자**가 도착했다. 캔버스는 브랜드색
 * 알약을 보여 주는데 결과는 파란 밑줄 글자인, 화면과 결과가 갈리는 자리였다.
 *
 * 해법은 업계 표준인 'bulletproof button': Outlook 에게만 보이는 조건부 주석 안에 VML 도형
 * (v:roundrect)을 세우고, 그 밖의 클라이언트에는 평범한 <a> 를 준다. 두 벌이 서로를 가리므로
 * 어느 쪽에서도 버튼이 두 번 보이지 않는다.
 *
 * [폭·높이를 왜 계산하나] VML 도형은 % 를 모른다 — px 로 못박아야 한다. 블록에 폭 필드가 없으므로
 * 글자 수와 글자 크기로 **추정**한다. 정확한 값이 아니라 근사이고, 한글은 라틴 문자보다 넓으므로
 * 코드포인트를 보고 가중치를 달리한다. (운영자가 폭을 직접 정하고 싶어지면 그때 필드를 만든다.) */

const BUTTON_PADDING: Readonly<Record<ButtonSize, readonly [number, number]>> = {
  xs: [6, 12],
  sm: [8, 16],
  md: [12, 24],
  lg: [16, 32],
};

/** 라틴은 글자 크기의 0.6배, 그 밖(한글·CJK·이모지)은 1.05배로 어림한다 */
function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    units += char.charCodeAt(0) < 0x0250 ? 0.6 : 1.05;
  }
  return Math.ceil(units * fontSize);
}

/** 모서리 둥글기 — VML 의 arcsize 는 '짧은 변의 절반' 대비 백분율이다 */
function arcSize(shape: ButtonBlock['shape']): string {
  if (shape === 'pill') return '50%';
  if (shape === 'rounded') return '12%';
  return '0%';
}

function renderButtonRow(block: ButtonBlock): string {
  const [padY, padX] = BUTTON_PADDING[block.size];
  const height = padY * 2 + Math.round(block.fontSize * 1.4);
  const innerWidth =
    block.width === 'full'
      ? EMAIL_BODY_WIDTH - block.padding.left - block.padding.right
      : padX * 2 + estimateTextWidth(block.content, block.fontSize);
  const href = hrefAttr(block.url);
  const label = escapeHtml(block.content);

  // Outlook 전용 — VML 도형. <w:anchorlock/> 이 없으면 글자가 링크가 아니라 편집 가능 텍스트가 된다
  const vml =
    `<!--[if mso]>` +
    `<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"${href} ` +
    `style="height:${String(height)}px;v-text-anchor:middle;width:${String(innerWidth)}px;" ` +
    `arcsize="${arcSize(block.shape)}" stroke="f" fillcolor="${escapeHtml(block.buttonColor)}">` +
    `<w:anchorlock/>` +
    `<center style="color:${escapeHtml(block.textColor)};font-family:${escapeHtml(block.fontFamily)};` +
    `font-size:${String(block.fontSize)}px;font-weight:${FONT_WEIGHT_VALUE[block.fontWeight]};">${label}</center>` +
    `</v:roundrect>` +
    `<![endif]-->`;

  // 그 밖의 클라이언트 — 평범한 <a>. `mso-hide:all` 없이 조건부 주석으로 Outlook 에서만 감춘다
  const anchorStyle = styleAttr([
    ['background-color', block.buttonColor],
    [
      'border-radius',
      block.shape === 'pill' ? px(height / 2) : block.shape === 'rounded' ? px(6) : null,
    ],
    ['color', block.textColor],
    ['display', block.width === 'full' ? 'block' : 'inline-block'],
    ['font-family', block.fontFamily],
    ['font-size', px(block.fontSize)],
    ['font-weight', FONT_WEIGHT_VALUE[block.fontWeight]],
    ['line-height', px(Math.round(block.fontSize * 1.4))],
    ['padding', `${px(padY)} ${px(padX)}`],
    ['text-align', 'center'],
    ['text-decoration', 'none'],
  ]);
  const anchor = `<!--[if !mso]><!--><a${href}${anchorStyle}>${label}</a><!--<![endif]-->`;

  return row(
    `${vml}${anchor}`,
    block.padding,
    [['background-color', block.backgroundColor]],
    block.align,
  );
}

/* ── 블록 → 표의 한 행 ───────────────────────────────────────────────────────
 *
 * blockKind 로 전수 분기한다 — default 를 두지 않아 블록이 하나 늘면 **여기서 타입 에러가 난다**
 * (캔버스에만 그리고 메일에는 안 나가는 블록이 생기지 않게 하는 장치다). */
function renderLeafRow(block: EmailBlock, canvas: EmailCanvasStyle): string {
  switch (block.blockKind) {
    case 'heading': {
      const tag = HEADING_TAG[block.level];
      const attr = styleAttr([
        ['color', block.textColor],
        ['font-family', block.fontFamily],
        ['font-size', px(HEADING_FONT_SIZE[block.level])],
        ['font-weight', FONT_WEIGHT_VALUE[block.fontWeight]],
        ['line-height', '1.3'],
        // Word 는 블록 요소의 margin 도 제멋대로 준다 — 0 으로 못박고 여백은 td 가 준다
        ['margin', '0'],
        ['text-align', alignCss(block.align)],
      ]);
      const body = `<${tag}${attr}>${inlineHtml(block.content, false, block.textColor)}</${tag}>`;
      return row(body, block.padding, [['background-color', block.backgroundColor]]);
    }

    case 'text': {
      const attr = styleAttr([
        ['color', block.textColor],
        ['font-family', block.fontFamily],
        ['font-size', px(block.fontSize)],
        ['font-weight', FONT_WEIGHT_VALUE[block.fontWeight]],
        ['line-height', '1.6'],
        ['margin', '0'],
        ['text-align', alignCss(block.align)],
      ]);
      const body = `<p${attr}>${inlineHtml(block.content, block.markdown, canvas.textColor)}</p>`;
      return row(body, block.padding, [['background-color', block.backgroundColor]]);
    }

    case 'button':
      return renderButtonRow(block);

    case 'image': {
      // 장식용 이미지는 alt="" 로 내보내 스크린리더가 건너뛰게 한다(빈 alt 와 alt 없음은 다르다)
      const note = fileNote('이미지', block.fileName);
      const described = block.decorative ? note : `${note} ${escapeHtml(block.alt)}`;
      const href = hrefAttr(block.clickThroughUrl);
      const body = href === '' ? described : `<a${href}>${described}</a>`;
      return row(
        body,
        block.padding,
        [['background-color', block.backgroundColor]],
        block.horizontalAlign,
      );
    }

    case 'logo':
    case 'avatar': {
      const label = block.blockKind === 'logo' ? '로고' : '아바타';
      return row(fileNote(label, block.fileName), block.padding, [], block.align);
    }

    case 'video': {
      const note =
        block.thumbnailFileName.trim() === ''
          ? escapeHtml(block.alt)
          : `${fileNote('비디오 썸네일', block.thumbnailFileName)} ${escapeHtml(block.alt)}`;
      const href = hrefAttr(block.videoUrl);
      const body = href === '' ? note : `<a${href}>${note}</a>`;
      return row(body, block.padding, [['background-color', block.backgroundColor]], block.align);
    }

    case 'divider': {
      // <hr> 은 클라이언트마다 굵기·색이 다르다 — 높이를 가진 빈 td 가 어디서나 같게 그려진다
      const rule = table(
        `<tr><td${styleAttr([
          ['background-color', block.color],
          ['font-size', '0'],
          ['height', px(block.height)],
          ['line-height', '0'],
        ])}>&nbsp;</td></tr>`,
        [],
      );
      return row(rule, block.padding, [['background-color', block.backgroundColor]]);
    }

    case 'spacer': {
      // font-size:0 / line-height:0 이 없으면 클라이언트가 &nbsp; 의 줄 높이만큼 더 벌린다
      const attr = styleAttr([
        ['background-color', block.backgroundColor],
        ['font-size', '0'],
        ['height', px(block.height)],
        ['line-height', '0'],
      ]);
      return `<tr><td height="${String(Math.round(block.height))}"${attr}>&nbsp;</td></tr>`;
    }

    case 'social': {
      const attr = styleAttr([
        ['color', block.textColor],
        ['font-family', block.fontFamily],
        ['font-size', px(block.fontSize)],
      ]);
      // 아이콘이 아니라 글자 링크로 낸다 — 업로드 이음매가 없어 아이콘 이미지의 URL 을 만들 수 없고,
      // 깨진 아이콘보다 읽히는 글자가 낫다. (이미지 차단 수신자에게도 그대로 읽힌다.)
      const links = block.links
        .map((link) => {
          const href = hrefAttr(link.url);
          const label = escapeHtml(SOCIAL_PLATFORM_LABEL[link.platform]);
          const linkStyle = styleAttr([['color', block.textColor]]);
          return href === '' ? label : `<a${href}${linkStyle}>${label}</a>`;
        })
        .join('<span aria-hidden="true"> · </span>');
      return row(
        `<div${attr}>${links}</div>`,
        block.padding,
        [['background-color', block.backgroundColor]],
        block.align,
      );
    }

    case 'menu': {
      const attr = styleAttr([
        ['color', block.textColor],
        ['font-family', block.fontFamily],
        ['font-size', px(block.fontSize)],
        ['font-weight', FONT_WEIGHT_VALUE[block.fontWeight]],
      ]);
      const separator = `<span aria-hidden="true"> ${escapeHtml(block.separator)} </span>`;
      const items = block.items
        .map((item) => {
          const href = hrefAttr(item.url);
          const label = escapeHtml(item.label);
          const linkStyle = styleAttr([
            ['color', block.textColor],
            ['text-decoration', 'none'],
          ]);
          return href === '' ? label : `<a${href}${linkStyle}>${label}</a>`;
        })
        .join(separator);
      return row(
        `<nav${attr}>${items}</nav>`,
        block.padding,
        [['background-color', block.backgroundColor]],
        block.align,
      );
    }

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const attr = styleAttr([
        ['color', block.textColor],
        ['font-family', block.fontFamily],
        ['font-size', px(block.fontSize)],
        ['line-height', '1.6'],
        ['margin', '0'],
        // Word 는 목록의 들여쓰기 기본값이 과하다 — px 로 못박는다
        ['padding-left', px(24)],
        ['text-align', alignCss(block.align)],
      ]);
      const items = block.items
        .map((item) => `<li>${inlineHtml(item.text, true, canvas.textColor)}</li>`)
        .join('');
      return row(`<${tag}${attr}>${items}</${tag}>`, block.padding, [
        ['background-color', block.backgroundColor],
      ]);
    }

    case 'footer': {
      // 법이 요구하는 순서 — 전송자 명칭·연락처가 먼저, 수신거부가 끝(types.ts FooterBlock 머리말)
      const attr = styleAttr([
        ['color', block.textColor],
        ['font-family', block.fontFamily],
        ['font-size', px(block.fontSize)],
        ['line-height', '1.6'],
        ['margin', '0'],
        ['text-align', alignCss(block.align)],
      ]);
      const lines = [block.companyName, block.companyAddress, block.contactEmail]
        .filter((line) => line.trim() !== '')
        .map((line) => escapeHtml(line))
        .join('<br />');
      const href = hrefAttr(block.unsubscribeUrl);
      const linkStyle = styleAttr([['color', block.linkColor]]);
      const unsubscribe =
        href === ''
          ? escapeHtml(UNSUBSCRIBE_LABEL)
          : `<a${href}${linkStyle}>${escapeHtml(UNSUBSCRIBE_LABEL)}</a>`;
      const body = `<div${attr}>${lines}${lines === '' ? '' : '<br /><br />'}${unsubscribe}</div>`;
      return row(body, block.padding, [['background-color', block.backgroundColor]]);
    }

    case 'columns':
      return renderColumnsRow(block, canvas);
  }
}

/* ── 다단 ────────────────────────────────────────────────────────────────────
 *
 * 두 세계를 동시에 만족시킨다:
 *   Outlook(Word)  — 조건부 주석 안의 유령 표가 칸을 나란히 잡아 준다.
 *   그 밖의 클라이언트 — inline-block div 가 나란히 놓인다.
 *
 * stackOnMobile 이 참이면 각 칸은 `width:100%; max-width:Wpx` 다. 부모가 W 보다 좁아지는 순간
 * 칸이 한 줄에 하나씩 내려온다 — **미디어 쿼리 없이** 폭 계산만으로 일어나므로 <style> 을 걷어내는
 * 클라이언트(GANGA 등)에서도 똑같이 동작한다. 거짓이면 `width:P%` 라 어느 폭에서도 나란히 남는다. */
function renderColumnsRow(block: ColumnsBlock, canvas: EmailCanvasStyle): string {
  const weights = COLUMN_RATIO_WEIGHTS[block.ratio];
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  /**
   * 칸이 설 수 있는 실제 폭.
   *
   * [왜 테두리를 빼는가 — 빼지 않으면 2단이 통째로 무너진다] 바깥 표는 `width:600px` 에
   * **테두리 1px** 을 두르므로(renderBlocksToHtml), 칸이 실제로 쓸 수 있는 폭은 600px 이 아니라
   * 그보다 좁다. 그런데 칸 폭은 `floor(600 - 여백)` 을 비율로 나눈 값이라 2단·3단에서 **합이
   * 정확히 600 - 여백** 이 된다 — 1px 이 모자라 마지막 칸이 다음 줄로 내려가고, 나란히 서야 할
   * 두 칸이 위아래로 쌓인다. 칸이 `box-sizing:border-box` 라 여백을 늘려도 합은 그대로여서
   * 여백으로는 이 1px 을 만들 수 없다.
   *
   * 실제로 이렇게 무너졌다: 프로모션 프리셋의 상품 2×2 그리드가 4개 세로 스택으로 나갔다.
   * 캔버스(BlockView)는 flex 로 그려서 멀쩡했기 때문에 **발송 HTML 을 직접 렌더해 보기 전까지
   * 아무도 보지 못하는** 종류의 어긋남이었다.
   */
  const innerWidth =
    EMAIL_BODY_WIDTH - CANVAS_BORDER_WIDTH * 2 - block.padding.left - block.padding.right;

  const cells = block.columns.map((column, index) => {
    const weight = weights[index] ?? 1;
    const width = Math.floor((innerWidth * weight) / totalWeight);
    const percent = ((weight / totalWeight) * 100).toFixed(4);

    const inner =
      column.blocks.length === 0
        ? '&nbsp;'
        : table(column.blocks.map((child) => renderLeafRow(child, canvas)).join(''), []);

    const divStyle = styleAttr([
      ['display', 'inline-block'],
      ['vertical-align', block.verticalAlign],
      ['width', block.stackOnMobile ? '100%' : `${percent}%`],
      ['max-width', block.stackOnMobile ? px(width) : null],
      // 간격은 칸 안쪽 여백으로 준다 — 표 폭을 건드리지 않아 유령 표와 어긋나지 않는다
      ['padding-left', index === 0 ? '0' : px(block.gap / 2)],
      ['padding-right', index === block.columns.length - 1 ? '0' : px(block.gap / 2)],
      ['box-sizing', 'border-box'],
    ]);

    const ghostOpen = `<!--[if mso]><td width="${String(width)}" valign="${block.verticalAlign}"><![endif]-->`;
    const ghostClose = `<!--[if mso]></td><![endif]-->`;
    return `${ghostOpen}<div${divStyle}>${inner}</div>${ghostClose}`;
  });

  const ghostTableOpen = `<!--[if mso]><table role="presentation" width="${String(innerWidth)}" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->`;
  const ghostTableClose = `<!--[if mso]></tr></table><![endif]-->`;

  // join('') 이 중요하다 — 조각 사이에 공백이 들어가면 inline-block 칸 사이에 틈이 생긴다
  const body = `${ghostTableOpen}${cells.join('')}${ghostTableClose}`;
  return row(body, block.padding, [
    ['background-color', block.backgroundColor],
    ['font-size', '0'],
  ]);
}

/* ── 블록 → 평문 ──────────────────────────────────────────────────────────────
 *
 * [왜 HTML 말고 평문도 필요한가]
 * 이메일 발송 폼의 본문 필드는 **평범한 textarea** 다(EmailBodyCard). 거기에 위에서 만든 HTML 을
 * 넣으면 운영자 화면에 `<h2>이달의 소식</h2>` 이 **글자 그대로** 보인다 — 마크업이 사람에게
 * 노출되는 것은 그 자체로 결함이고, 그 상태로 저장되면 수신자에게도 태그가 나간다.
 *
 * [왜 HTML 을 만들어 놓고 다시 벗기지 않는가] `richTextToPlainText` 처럼 태그를 지우는 길도 있지만,
 * 그것은 **한 번 잃은 정보를 되찾으려는 일**이다: 버튼의 주소, 이미지의 대체 텍스트, 목록의 글머리처럼
 * 태그 바깥에 있던 뜻이 이미 사라진 뒤다. 블록 모델에는 그 뜻이 그대로 있으므로 여기서 직접 평문을
 * 만든다 — 같은 원본에서 두 표현이 나온다.
 *
 * [무엇을 보존하는가] 문단 경계와 읽는 순서다. 제목·문단은 빈 줄로 끊고, 목록은 글머리표를 붙이고,
 * 버튼·링크는 '라벨 (주소)' 로 주소를 살린다. 다단은 왼쪽 칸부터 차례로 편다 — 평문에는 나란함이
 * 없으므로 위아래로 펴는 것이 유일하게 정직한 표현이다. */

/** 토큰 → 평문. 링크는 주소를 괄호로 살린다(평문에서는 그것이 유일한 단서다) */
function tokensToPlainText(tokens: readonly InlineToken[]): string {
  return tokens
    .map((token) => {
      switch (token.kind) {
        case 'text':
        case 'bold':
        case 'italic':
          return token.text;
        case 'link': {
          const safe = safeUrl(token.url);
          return safe === '' ? token.text : `${token.text} (${safe})`;
        }
        case 'break':
          return '\n';
      }
    })
    .join('');
}

/** 라벨과 주소를 한 줄로 — 주소가 없으면 라벨만 남긴다 */
function labelWithUrl(label: string, url: string): string {
  const safe = safeUrl(url);
  const trimmed = label.trim();
  if (safe === '') return trimmed;
  return trimmed === '' ? safe : `${trimmed} (${safe})`;
}

/** 블록 하나 → 평문 덩어리. 빈 문자열이면 호출부가 버린다 */
function blockToPlainText(block: EmailBlock): string {
  switch (block.blockKind) {
    case 'heading':
      return block.content.trim();
    case 'text':
      return tokensToPlainText(parseInlineMarkdown(block.content, block.markdown)).trim();
    case 'button':
      return labelWithUrl(block.content, block.url);
    case 'image':
      // 장식용 이미지는 읽을 것이 없다 — 평문에서는 통째로 빠지는 것이 맞다
      return block.decorative ? '' : labelWithUrl(block.alt, block.clickThroughUrl);
    case 'video':
      return labelWithUrl(block.alt, block.videoUrl);
    case 'list':
      return block.items
        .map((item) => tokensToPlainText(parseInlineMarkdown(item.text, true)).trim())
        .filter((line) => line !== '')
        .map((line, index) => (block.ordered ? `${String(index + 1)}. ${line}` : `- ${line}`))
        .join('\n');
    case 'menu':
      return block.items
        .map((item) => labelWithUrl(item.label, item.url))
        .filter((line) => line !== '')
        .join('\n');
    case 'social':
      return block.links
        .map((link) => labelWithUrl(SOCIAL_PLATFORM_LABEL[link.platform], link.url))
        .filter((line) => line !== '')
        .join('\n');
    case 'footer': {
      const lines = [block.companyName, block.companyAddress, block.contactEmail]
        .map((line) => line.trim())
        .filter((line) => line !== '');
      return [...lines, labelWithUrl(UNSUBSCRIBE_LABEL, block.unsubscribeUrl)].join('\n');
    }
    case 'divider':
      // 평문에서 선을 흉내 내면 그것대로 노이즈다 — 문단 경계만 남긴다
      return '';
    case 'spacer':
      return '';
    case 'logo':
    case 'avatar':
      // 파일명은 사람이 읽을 문구가 아니다 — 평문 본문에 넣지 않는다
      return '';
    case 'columns':
      // 왼쪽 칸부터 차례로 편다(위 머리말)
      return block.columns
        .flatMap((column) => column.blocks.map(blockToPlainText))
        .filter((chunk) => chunk !== '')
        .join('\n\n');
  }
}

/**
 * 블록 목록 → 평문 본문.
 *
 * 발송 폼의 본문 필드(textarea)가 쓴다. 마크업은 한 글자도 나가지 않는다 — 그것이 이 함수의 계약이다.
 */
export function renderBlocksToPlainText(blocks: readonly EmailBlock[]): string {
  return (
    blocks
      .map(blockToPlainText)
      .filter((chunk) => chunk.trim() !== '')
      .join('\n\n')
      // 블록이 비어 문단이 겹치면 빈 줄이 불어난다 — 하나까지만 남긴다
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * 블록 목록 → 이메일 본문 HTML.
 *
 * 바깥은 폭 600px 의 레이아웃 표다(캔버스 배경·글꼴·글자색이 여기 인라인으로 붙는다). 블록이
 * 하나도 없으면 빈 문자열을 돌려준다 — 빈 껍데기를 만들어 '내용이 있는 것처럼' 보이게 하지 않는다.
 */
export function renderBlocksToHtml(
  blocks: readonly EmailBlock[],
  canvas: EmailCanvasStyle,
  preheader = '',
): string {
  if (blocks.length === 0) return '';

  const rows = blocks.map((block) => renderLeafRow(block, canvas)).join('');
  return `${preheaderHtml(preheader)}${table(rows, [
    ['background-color', canvas.canvasColor],
    ['border', `${String(CANVAS_BORDER_WIDTH)}px solid ${canvas.canvasBorderColor}`],
    // Word 는 border-radius 를 그리지 않는다 — 다른 클라이언트를 위해 남기되 기대하지 않는다
    ['border-radius', px(canvas.canvasBorderRadius)],
    ['color', canvas.textColor],
    ['font-family', canvas.fontFamily],
    ['max-width', px(EMAIL_BODY_WIDTH)],
    ['width', px(EMAIL_BODY_WIDTH)],
  ])}`;
}

/* ── 프리헤더 (감춰진 첫 줄) ──────────────────────────────────────────────────
 *
 * [무엇을 만드나] 본문 맨 앞에 놓이는, **화면에는 안 보이고 수신함 목록에만 보이는** 한 줄이다.
 * 제목 뒤에 이어 붙는 그 자리를 클라이언트가 본문 맨 앞에서 주워 가는데, 우리 본문의 맨 앞은
 * 대개 로고 밴드라 `[로고: logo.png]` 가 수신함에 뜬다(types.ts PREHEADER_MAX 머리말).
 *
 * [왜 display:none 하나로 끝내지 않나] Gmail 을 비롯한 여러 클라이언트가 `display:none` 요소를
 * 프리뷰 텍스트 수집에서 **빼 버린다** — 감추는 데는 성공하고 목적에는 실패한다. 그래서 업계
 * 표준은 '보이지 않을 만큼 작게' 만드는 쪽이다: 높이·글자 크기 0 에 투명도 0, 화면 밖 오프셋.
 * 여기 있는 선언은 하나하나가 특정 클라이언트를 위한 것이라 겹쳐 보여도 뺄 것이 없다.
 *
 * [뒤의 &zwnj;&nbsp; 반복은 무엇인가] 프리헤더가 짧으면 클라이언트가 **모자란 만큼 본문에서 더
 * 끌어와** 붙인다. 폭 없는 문자를 뒤에 깔아 그 자리를 미리 채운다 — 수신함에서는 아무것도
 * 보이지 않고, 본문이 새어 나오지도 않는다.
 *
 * ※ 이 함수가 만드는 것은 **발송되는 메일의 HTML** 이다 — 어드민 화면의 스타일 규칙(토큰만)이
 *   아니라 메일 클라이언트의 제약(인라인 style·px)을 따른다. 경계는 이 파일 머리말에 있다. */

const PREHEADER_FILLER = '&zwnj;&nbsp;'.repeat(60);

function preheaderHtml(preheader: string): string {
  const text = preheader.trim();
  if (text === '') return '';
  const attr = styleAttr([
    ['display', 'none'],
    /* 치수는 px() 를 지난다 — 리터럴 `1px` 은 이 리포의 하드코딩 px 방어선에 걸린다.
       그 규칙이 막으려는 것은 **화면 스타일의 매직 넘버**이고, 여기 값은 발송 메일의 인라인
       style 이다(이 파일 머리말의 경계). 방어선을 끄는 대신 같은 헬퍼를 지나게 둔다. */
    ['font-size', px(1)],
    ['color', 'transparent'],
    ['line-height', px(1)],
    ['max-height', px(0)],
    ['max-width', px(0)],
    ['opacity', '0'],
    ['overflow', 'hidden'],
    // Outlook(Word)은 위 선언 대부분을 무시한다 — 이것만 존중한다
    ['mso-hide', 'all'],
  ]);
  return `<div${attr}>${escapeHtml(text)}${PREHEADER_FILLER}</div>`;
}
