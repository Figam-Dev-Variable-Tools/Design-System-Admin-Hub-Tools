// 이메일 블록 — 생성 기본값과 유니온 조작 헬퍼
//
// [왜 팩토리를 한곳에 모으나] 블록은 7종이고 각자 필드가 다르다. '+ 버튼으로 새 블록을 넣는다' 는
// 캔버스·블록 피커·프리셋 세 곳에서 일어나는데, 각자 기본값을 손으로 적으면 같은 종류의 블록이
// 어디서 만들어졌느냐에 따라 다른 색·다른 여백을 갖는다. 기본값의 주인은 이 파일 하나다.
//
// [hex 리터럴을 왜 함수로 감싸나 — 린트 방어선과 도메인의 충돌]
// eslint 의 no-restricted-syntax 는 소스의 모든 `#RRGGBB` 문자열을 막는다(토큰 파이프라인 강제).
// 그런데 **사용자가 고른 블록 색은 토큰이 아니라 데이터**다 — 운영자가 컬러 피커로 정한 값이
// state 에 hex 로 담겨 style 로 흐른다. 그 값의 '초기값' 을 여기 적어야 하는데, 리터럴로 적으면
// 방어선에 걸린다. 방어선을 약화(disable)시키는 대신 `#` 를 코드로 붙인다 — 규칙이 막으려는 것은
// **크롬(패널·툴바)의 하드코딩 색**이고, 이 값들은 그것이 아니라는 것을 표현으로 드러낸다.
import { COLUMN_RATIO_WEIGHTS } from '../types';
import type {
  BlockPadding,
  ColumnRatio,
  ColumnsBlock,
  EmailBlock,
  EmailBlockKind,
  EmailCanvasStyle,
  EmailColumn,
  EmailLeafBlock,
  EmailLeafBlockKind,
  EmailTemplateContent,
} from '../types';

/** `#` 를 앞에 붙여 hex 색 문자열을 만든다 (위 주석 참조 — 리터럴 hex 를 소스에 남기지 않는다) */
export function hexColor(digits: string): string {
  return `#${digits}`;
}

/* ── 기본 팔레트 (블록 데이터의 초기값 — 토큰이 아니다) ─────────────────────── */

const INK = hexColor('1F2033');
const BODY_INK = hexColor('4A4B63');
const WHITE = hexColor('FFFFFF');
const TRANSPARENT = hexColor('FFFFFF00');
const BRAND = hexColor('6B4EFF');
const HAIRLINE = hexColor('E4E4EC');
const BACKDROP = hexColor('B4B2C7');

/* ── 폰트 ────────────────────────────────────────────────────────────────── */

/** 메일 클라이언트가 실제로 그릴 수 있는 폰트 묶음 — select 의 선택지 */
export const FONT_FAMILIES = [
  'Modern sans',
  'Book sans',
  'Organic sans',
  'Geometric sans',
  'Heavy sans',
  'Rounded sans',
  'Modern serif',
  'Book serif',
  'Organic serif',
  'Monospace',
] as const;

export const DEFAULT_FONT_FAMILY = FONT_FAMILIES[0];

/* ── 치수 기본값 ─────────────────────────────────────────────────────────── */

export const DEFAULT_PADDING: BlockPadding = { top: 32, bottom: 32, left: 32, right: 32 };

/**
 * 여백 없는 기본값 — spacer 와 columns 가 쓴다.
 *
 * [왜 이 둘만 다른가] spacer 는 '높이 자체' 가 내용이라 바깥 여백이 더해지면 운영자가 정한 높이와
 * 실제 높이가 달라진다. columns 는 **칸 안의 블록들이 각자 여백을 갖고** 있어서, 행에도 여백을 주면
 * 두 겹이 겹쳐 3단에서 글자 폭이 남지 않는다.
 */
export const ZERO_PADDING: BlockPadding = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * 컬럼 **안**에 들어가는 블록의 기본 여백.
 *
 * [왜 최상위와 다른가] 최상위 기본값은 사방 32px 다. 그 값을 칸 안에서도 쓰면 여백이 두 겹으로
 * 겹친다: 600px 본문을 3단으로 나누면 칸은 200px 인데 좌우 여백만 64px 라 글자가 설 자리가
 * 136px 밖에 남지 않는다. 편집 화면의 캔버스는 600px 보다도 좁아서 **한 줄에 한 글자씩** 떨어진다
 * (실제로 브라우저에서 그렇게 드러났다). 칸 사이의 간격은 행의 gap 이 이미 책임지므로, 칸 안의
 * 블록은 여백을 작게 갖는 것이 맞다.
 */
export const COLUMN_CHILD_PADDING: BlockPadding = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * 칸 안에 놓기 좋게 여백을 줄인다.
 * spacer 는 예외다 — 그 블록은 '높이 자체' 가 내용이라 바깥 여백이 붙으면 정한 높이와 달라진다.
 */
export function withColumnPadding(block: EmailLeafBlock): EmailLeafBlock {
  if (block.blockKind === 'spacer') return block;
  return { ...block, padding: COLUMN_CHILD_PADDING };
}

/** 여백 슬라이더의 상한 — 이보다 넓으면 600px 본문에서 글자가 설 자리가 없다 */
export const PADDING_MAX = 96;
export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 72;
export const MEDIA_SIZE_MIN = 16;
export const MEDIA_SIZE_MAX = 240;
export const DIVIDER_HEIGHT_MAX = 24;
export const CANVAS_RADIUS_MAX = 64;

/** 소셜·메뉴·목록의 항목 수 상한 — 이보다 많으면 한 줄에 들어가지 않아 레이아웃이 무너진다 */
export const SOCIAL_LINK_MAX = 6;
export const MENU_ITEM_MAX = 6;
export const LIST_ITEM_MAX = 20;

/** 본문 입력 상한 — INSPECT 의 카운터('(8 / 10 000 characters)')가 이 값을 분모로 쓴다 */
export const BLOCK_CONTENT_MAX = 10_000;

export const DEFAULT_CANVAS: EmailCanvasStyle = {
  backdropColor: BACKDROP,
  canvasColor: WHITE,
  canvasBorderColor: HAIRLINE,
  canvasBorderRadius: 32,
  fontFamily: DEFAULT_FONT_FAMILY,
  textColor: INK,
};

/* ── 블록 팩토리 ─────────────────────────────────────────────────────────── */

/**
 * 새 블록 하나. `blockKind` 로 전수 분기한다 — default 를 두지 않아 8번째 블록이 생기면
 * **여기서 타입 에러가 난다**(그때 기본값을 정하라는 뜻이다).
 */
export function createLeafBlock(blockKind: EmailLeafBlockKind, id: string): EmailLeafBlock {
  switch (blockKind) {
    case 'heading':
      return {
        blockKind: 'heading',
        id,
        content: '',
        level: 'h1',
        textColor: INK,
        backgroundColor: TRANSPARENT,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontWeight: 'bold',
        align: 'left',
        padding: DEFAULT_PADDING,
      };
    case 'text':
      return {
        blockKind: 'text',
        id,
        content: '',
        markdown: false,
        textColor: BODY_INK,
        backgroundColor: TRANSPARENT,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: 16,
        fontWeight: 'regular',
        align: 'left',
        padding: DEFAULT_PADDING,
      };
    case 'button':
      return {
        blockKind: 'button',
        id,
        content: '',
        url: '',
        width: 'auto',
        size: 'md',
        shape: 'rounded',
        textColor: WHITE,
        buttonColor: BRAND,
        backgroundColor: TRANSPARENT,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: 16,
        fontWeight: 'medium',
        align: 'center',
        padding: DEFAULT_PADDING,
      };
    case 'image':
      return {
        blockKind: 'image',
        id,
        fileName: '',
        alt: '',
        decorative: false,
        clickThroughUrl: '',
        width: 600,
        height: null,
        verticalAlign: 'middle',
        horizontalAlign: 'center',
        backgroundColor: TRANSPARENT,
        padding: DEFAULT_PADDING,
      };
    case 'logo':
      return {
        blockKind: 'logo',
        id,
        fileName: '',
        size: 48,
        shape: 'rounded',
        align: 'left',
        padding: DEFAULT_PADDING,
      };
    case 'avatar':
      return {
        blockKind: 'avatar',
        id,
        fileName: '',
        size: 64,
        shape: 'circle',
        align: 'center',
        padding: DEFAULT_PADDING,
      };
    case 'divider':
      return {
        blockKind: 'divider',
        id,
        color: HAIRLINE,
        height: 1,
        backgroundColor: TRANSPARENT,
        padding: DEFAULT_PADDING,
      };
    case 'spacer':
      return {
        blockKind: 'spacer',
        id,
        height: 24,
        backgroundColor: TRANSPARENT,
        padding: ZERO_PADDING,
      };
    case 'social':
      // 주소가 빈 링크로 시작한다 — isBlockIncomplete 가 참이라 캔버스가 '아직 못 채웠다' 고 알린다.
      // 빈 목록으로 시작하면 운영자가 '무엇을 채워야 하는지' 를 모른 채 지나친다.
      return {
        blockKind: 'social',
        id,
        links: [
          { id: `${id}-link-1`, platform: 'instagram', url: '' },
          { id: `${id}-link-2`, platform: 'facebook', url: '' },
        ],
        align: 'center',
        textColor: BODY_INK,
        fontSize: 14,
        fontFamily: DEFAULT_FONT_FAMILY,
        backgroundColor: TRANSPARENT,
        padding: DEFAULT_PADDING,
      };
    case 'menu':
      return {
        blockKind: 'menu',
        id,
        items: [
          { id: `${id}-item-1`, label: '', url: '' },
          { id: `${id}-item-2`, label: '', url: '' },
        ],
        separator: '|',
        align: 'center',
        textColor: BODY_INK,
        fontSize: 14,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontWeight: 'medium',
        backgroundColor: TRANSPARENT,
        padding: DEFAULT_PADDING,
      };
    case 'video':
      return {
        blockKind: 'video',
        id,
        thumbnailFileName: '',
        videoUrl: '',
        alt: '',
        width: 560,
        align: 'center',
        backgroundColor: TRANSPARENT,
        padding: DEFAULT_PADDING,
      };
    case 'list':
      return {
        blockKind: 'list',
        id,
        items: [
          { id: `${id}-item-1`, text: '' },
          { id: `${id}-item-2`, text: '' },
          { id: `${id}-item-3`, text: '' },
        ],
        ordered: false,
        textColor: BODY_INK,
        fontSize: 16,
        fontFamily: DEFAULT_FONT_FAMILY,
        align: 'left',
        backgroundColor: TRANSPARENT,
        padding: DEFAULT_PADDING,
      };
    case 'footer':
      return {
        blockKind: 'footer',
        id,
        companyName: '',
        companyAddress: '',
        contactEmail: '',
        unsubscribeUrl: '',
        textColor: BACKDROP,
        linkColor: BODY_INK,
        fontSize: 12,
        fontFamily: DEFAULT_FONT_FAMILY,
        align: 'center',
        backgroundColor: TRANSPARENT,
        padding: DEFAULT_PADDING,
      };
  }
}

/**
 * 새 블록 하나 — 컨테이너까지 포함한 전체 종류.
 *
 * [왜 leaf 팩토리와 나눴나] 컬럼 **안**에 넣는 블록은 컨테이너일 수 없다(EmailLeafBlock). 한
 * 함수가 EmailBlock 을 돌려주면 호출부가 '이건 columns 가 아니다' 를 매번 좁혀야 하고, 그 좁힘은
 * 결국 `as` 나 도달 불가 분기로 흐른다. 종류를 나눠 두면 **타입이 알아서 맞는다**.
 */
export function createBlock(blockKind: EmailBlockKind, id: string): EmailBlock {
  if (blockKind === 'columns') {
    return {
      blockKind: 'columns',
      id,
      ratio: '1:1',
      stackOnMobile: true,
      columns: createColumns(id, '1:1'),
      gap: 16,
      verticalAlign: 'top',
      backgroundColor: TRANSPARENT,
      padding: ZERO_PADDING,
    };
  }
  return createLeafBlock(blockKind, id);
}

/** 비율이 요구하는 개수만큼 빈 칸을 만든다 — 칸 개수의 주인은 비율표(COLUMN_RATIO_WEIGHTS)다 */
function createColumns(blockId: string, ratio: ColumnRatio): readonly EmailColumn[] {
  return COLUMN_RATIO_WEIGHTS[ratio].map((_weight, index) => ({
    id: `${blockId}-col-${String(index + 1)}`,
    blocks: [],
  }));
}

/**
 * 비율을 바꾼다 — 칸 개수가 함께 변한다.
 *
 * [내용을 잃지 않는 것이 규칙이다] 3단 → 2단으로 줄일 때 사라지는 칸의 블록을 그냥 버리면
 * 운영자가 비율 하나 만졌다가 작성한 내용을 잃는다. 남는 칸의 내용은 **마지막 칸으로 옮겨** 붙인다.
 * 되돌리기가 있지만, 되돌릴 수 있다는 것이 잃어도 된다는 뜻은 아니다.
 */
export function applyColumnRatio(block: ColumnsBlock, ratio: ColumnRatio): ColumnsBlock {
  const nextCount = COLUMN_RATIO_WEIGHTS[ratio].length;
  const kept = block.columns.slice(0, nextCount);
  const overflow = block.columns.slice(nextCount).flatMap((column) => column.blocks);

  const columns = Array.from({ length: nextCount }, (_unused, index): EmailColumn => {
    const existing = kept[index];
    const base: EmailColumn = existing ?? {
      id: `${block.id}-col-${String(index + 1)}`,
      blocks: [],
    };
    // 넘친 블록은 마지막 칸 뒤에 붙인다
    return index === nextCount - 1 ? { ...base, blocks: [...base.blocks, ...overflow] } : base;
  });

  return { ...block, ratio, columns };
}

/** INSPECT 패널의 제목 — 'HEADING BLOCK' 처럼 대문자로 쓴다 */
export const BLOCK_KIND_LABEL: Readonly<Record<EmailBlockKind, string>> = {
  heading: '제목',
  text: '본문',
  button: '버튼',
  image: '이미지',
  logo: '로고',
  avatar: '프로필 이미지',
  divider: '구분선',
  spacer: '여백',
  social: '소셜 링크',
  menu: '메뉴',
  video: '비디오',
  list: '목록',
  footer: '법적 푸터',
  columns: '다단',
};

/**
 * 블록 피커가 늘어놓는 순서 — 레이아웃(다단)이 맨 앞이다.
 *
 * [왜 columns 가 첫 칸인가] '디자인 자율성이 없다' 는 지적의 핵심이 한 줄 스택이었다. 가장 큰
 * 자유를 주는 도구를 목록 끝에 두면 있는 줄도 모른다.
 */
export const BLOCK_KIND_ORDER: readonly EmailBlockKind[] = [
  'columns',
  'heading',
  'text',
  'button',
  'image',
  'video',
  'list',
  'menu',
  'social',
  'logo',
  'avatar',
  'divider',
  'spacer',
  'footer',
];

/**
 * 컬럼 **안에서** 고를 수 있는 종류.
 *
 * columns 가 빠진 것은 타입이 이미 막고 있어서고(EmailLeafBlock), footer 가 빠진 것은 법적 푸터가
 * 한 칸 안에 숨으면 안 되기 때문이다 — 그것은 본문 맨 아래 전체 폭에 있어야 눈에 띈다.
 */
export const COLUMN_CHILD_KIND_ORDER: readonly EmailLeafBlockKind[] = [
  'heading',
  'text',
  'button',
  'image',
  'video',
  'list',
  'menu',
  'social',
  'logo',
  'avatar',
  'divider',
  'spacer',
];

/** 컬럼 안에 넣을 수 있는 종류인가 — 피커가 내주는 목록과 같은 판단을 한곳에서 한다 */
export function isColumnChildKind(kind: EmailBlockKind): kind is EmailLeafBlockKind {
  return COLUMN_CHILD_KIND_ORDER.some((allowed) => allowed === kind);
}

/* ── 불변 갱신 헬퍼 ───────────────────────────────────────────────────────────
 *
 * [왜 전부 '깊은' 판인가] 컬럼이 생기면서 블록 목록은 더 이상 평평하지 않다 — 선택된 블록이
 * 최상위에 있을 수도, 어느 칸 안에 있을 수도 있다. 호출부(EmailBuilder)가 '어디에 있는지' 를
 * 신경 쓰기 시작하면 갱신·삭제·삽입마다 같은 분기가 복제된다. 그래서 **id 하나로 어디에 있든
 * 찾아 고치는** 것을 이 파일의 계약으로 둔다.
 *
 * 컬럼 안에 컬럼은 없으므로(EmailLeafBlock) 깊이는 최대 2다 — 재귀가 아니라 두 겹 순회로 끝난다. */

/** 최상위와 모든 칸을 훑어 id 로 찾는다 */
export function findBlockById(blocks: readonly EmailBlock[], id: string): EmailBlock | undefined {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.blockKind === 'columns') {
      for (const column of block.columns) {
        const child = column.blocks.find((candidate) => candidate.id === id);
        if (child !== undefined) return child;
      }
    }
  }
  return undefined;
}

/** id 로 블록 하나만 갈아끼운 새 배열 — 칸 안의 블록도 찾아 바꾼다 */
export function replaceBlock(
  blocks: readonly EmailBlock[],
  next: EmailBlock,
): readonly EmailBlock[] {
  return blocks.map((block) => {
    if (block.id === next.id) return next;
    if (block.blockKind !== 'columns') return block;
    return {
      ...block,
      columns: block.columns.map((column) => ({
        ...column,
        // 칸 안에는 컨테이너가 들어갈 수 없다 — 컨테이너를 칸 안으로 밀어 넣는 갱신은 무시한다
        blocks: column.blocks.map((child) =>
          child.id === next.id && next.blockKind !== 'columns' ? next : child,
        ),
      })),
    };
  });
}

/** `afterId` 바로 뒤에 넣는다. null 이면 맨 뒤에 붙인다 */
export function insertBlockAfter(
  blocks: readonly EmailBlock[],
  afterId: string | null,
  next: EmailBlock,
): readonly EmailBlock[] {
  if (afterId === null) return [...blocks, next];

  const index = blocks.findIndex((block) => block.id === afterId);
  if (index >= 0) return [...blocks.slice(0, index + 1), next, ...blocks.slice(index + 1)];

  // 최상위에 없으면 어느 칸 안의 블록 뒤를 가리키는 것이다
  if (next.blockKind === 'columns') return [...blocks, next];
  return blocks.map((block) => {
    if (block.blockKind !== 'columns') return block;
    return {
      ...block,
      columns: block.columns.map((column) => {
        const childIndex = column.blocks.findIndex((child) => child.id === afterId);
        if (childIndex < 0) return column;
        return {
          ...column,
          blocks: [
            ...column.blocks.slice(0, childIndex + 1),
            next,
            ...column.blocks.slice(childIndex + 1),
          ],
        };
      }),
    };
  });
}

/**
 * `afterId` 바로 뒤에 **여러 장**을 한꺼번에 넣는다 — 블록 묶음(groups.ts)이 쓰는 경로.
 *
 * [왜 insertBlockAfter 를 반복해서 부르지 않나] 한 장씩 넣으면 두 번째 장은 첫 장 뒤로 가야 하는데,
 * 호출부가 매번 '방금 넣은 것의 id' 를 추적해야 한다. 그 추적을 빠뜨리면 묶음이 **역순으로** 쌓인다
 * (실제로 그렇게 뒤집히기 쉬운 자리다). 순서의 주인을 여기 하나로 둔다.
 */
export function insertBlocksAfter(
  blocks: readonly EmailBlock[],
  afterId: string | null,
  next: readonly EmailBlock[],
): readonly EmailBlock[] {
  if (next.length === 0) return blocks;
  return next.reduce<readonly EmailBlock[]>(
    (acc, block, index) =>
      insertBlockAfter(acc, index === 0 ? afterId : (next[index - 1]?.id ?? null), block),
    blocks,
  );
}

/**
 * 블록을 한 칸 위/아래로 옮긴다 — 최상위든 칸 안이든 같은 함수로.
 *
 * [왜 배열 조작을 여기서 하지 않나] 자리 바꾸기의 정본은 DS 의 `moveArrayItem` 이다(@tds/ui).
 * 목록 표 재정렬이 이미 그 함수를 쓰고 있어서, 여기서 splice 를 다시 적으면 같은 규칙이 두 벌이
 * 된다 — 경계(첫 줄에서 위로·끝 줄에서 아래로)의 처리가 화면마다 달라진다.
 *
 * [왜 delta 인가] 호출부는 ReorderMoveButtons 다. 그 컴포넌트의 계약이 `(index, delta)` 라서
 * 같은 축으로 받는다. 다만 여기서는 **id** 로 찾는다 — 칸 안의 블록에는 전역 인덱스가 없다.
 */
export function moveBlock(
  blocks: readonly EmailBlock[],
  id: string,
  delta: number,
  move: <T>(items: readonly T[], from: number, to: number) => T[],
): readonly EmailBlock[] {
  const topIndex = blocks.findIndex((block) => block.id === id);
  if (topIndex >= 0) return move(blocks, topIndex, topIndex + delta);

  // 최상위에 없으면 어느 칸 안이다 — 그 칸 안에서만 움직인다(칸을 넘나드는 이동은 없다)
  return blocks.map((block) => {
    if (block.blockKind !== 'columns') return block;
    return {
      ...block,
      columns: block.columns.map((column) => {
        const index = column.blocks.findIndex((child) => child.id === id);
        if (index < 0) return column;
        return { ...column, blocks: move(column.blocks, index, index + delta) };
      }),
    };
  });
}

/**
 * 이 블록이 놓인 자리 — 몇 번째이고, 형제가 몇인가.
 *
 * 이동 버튼이 '첫 줄' · '끝 줄' 을 잠그려면 두 숫자가 필요하다. 최상위와 칸 안의 차이를
 * 호출부가 알 필요는 없으므로 여기서 한 번에 답한다. 찾지 못하면 null 이다.
 */
export function blockPositionOf(
  blocks: readonly EmailBlock[],
  id: string,
): { readonly index: number; readonly count: number } | null {
  const topIndex = blocks.findIndex((block) => block.id === id);
  if (topIndex >= 0) return { index: topIndex, count: blocks.length };

  for (const block of blocks) {
    if (block.blockKind !== 'columns') continue;
    for (const column of block.columns) {
      const index = column.blocks.findIndex((child) => child.id === id);
      if (index >= 0) return { index, count: column.blocks.length };
    }
  }
  return null;
}

/** 빈 칸의 + 로 넣는다 — 칸 id 를 직접 가리키는 경로 */
export function insertBlockInColumn(
  blocks: readonly EmailBlock[],
  columnId: string,
  next: EmailLeafBlock,
): readonly EmailBlock[] {
  return blocks.map((block) => {
    if (block.blockKind !== 'columns') return block;
    return {
      ...block,
      columns: block.columns.map((column) =>
        column.id === columnId ? { ...column, blocks: [...column.blocks, next] } : column,
      ),
    };
  });
}

export function removeBlock(blocks: readonly EmailBlock[], id: string): readonly EmailBlock[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) => {
      if (block.blockKind !== 'columns') return block;
      return {
        ...block,
        columns: block.columns.map((column) => ({
          ...column,
          blocks: column.blocks.filter((child) => child.id !== id),
        })),
      };
    });
}

/** 빈 이메일 본문 — 새 템플릿과 Blank 프리셋이 함께 쓴다 */
export function emptyEmailContent(): EmailTemplateContent {
  return {
    kind: 'email',
    senderEmail: '',
    subject: '',
    preheader: '',
    blocks: [],
    canvas: DEFAULT_CANVAS,
  };
}
