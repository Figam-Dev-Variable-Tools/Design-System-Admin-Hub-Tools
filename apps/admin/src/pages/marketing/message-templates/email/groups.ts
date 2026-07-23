// 블록 묶음 — 한 번 눌러 여러 장이 들어가는 '구성'
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 '상품 카드' 블록을 새로 만들지 않았나 — 이 파일의 존재 이유]
//
// 이메일 템플릿이 실제로 가장 많이 필요로 하는 것 중 하나가 **상품/소식 카드 목록**이다. 그것을
// 새 blockKind(`product`)로 만드는 길이 있었고, 만들지 않았다. 근거 셋:
//
//   (1) **판별 유니온이 14종에서 15종이 된다.** 그 대가는 한 곳이 아니다 — 팩토리·캔버스 렌더·
//       INSPECT 폼·발송 HTML·평문 변환·미완성 판정·점검 규칙 여섯 곳이 함께 늘어난다. 카드가
//       '이미지 + 제목 + 설명 + 가격 + 버튼' 이라는 사실은 그 여섯 곳에 각각 다시 적히게 된다.
//   (2) **카드는 새로운 표현이 아니다.** 이미 있는 것(다단 행 + 이미지 + 제목 + 본문 + 버튼)의
//       **배치**일 뿐이다. 없는 것은 표현력이 아니라 '그 배치를 손으로 다섯 번 만들어야 한다' 는
//       수고였다. 없는 것이 수고라면 답은 새 타입이 아니라 시작점이다.
//   (3) **전용 블록은 편집을 좁힌다.** 상품 카드 블록은 가격 칸을 지울 수 없고 이미지를 오른쪽으로
//       옮길 수 없다 — 그 순간 운영자는 '카드처럼 생긴 무언가' 를 만들려고 다시 다단을 조립한다.
//
// 그래서 묶음은 **블록을 낳고 사라진다**. 넣은 뒤에는 평범한 다단 행과 그 안의 블록들이라, 칸을
// 지우든 버튼을 옮기든 아무 제약이 없다. (프리셋과 같은 사고방식이다. 다른 점은 프리셋이 본문을
// **통째로 갈아치우는** 반면 묶음은 **지금 자리에 끼워 넣는다**는 것 하나다.)
//
// [프리셋과 묶음의 경계]
//   프리셋(presets.ts) — '이 메일은 무엇인가'. 처음 한 번, 본문 전체.
//   묶음(이 파일)      — '여기에 무엇을 놓을까'. 편집 도중, 커서 자리.
// ─────────────────────────────────────────────────────────────────────────────
import {
  applyColumnRatio,
  COLUMN_CHILD_PADDING,
  createBlock,
  createLeafBlock,
  hexColor,
  ZERO_PADDING,
} from './blocks';
import type { ColumnRatio, EmailBlock, EmailLeafBlock } from '../types';

export type EmailBlockGroupId = 'product-grid' | 'product-row' | 'article-cards' | 'cta-banner';

/** 블록 id 를 만들어 주는 쪽 — 빌더가 자기 카운터를 넘긴다(presets.ts 와 같은 계약) */
export type IdFactory = () => string;

export interface EmailBlockGroup {
  readonly id: EmailBlockGroupId;
  readonly label: string;
  /** 피커의 카드에 한 줄로 붙는 설명 — 이름만으로는 무엇이 들어오는지 알 수 없다 */
  readonly description: string;
  readonly build: (nextId: IdFactory) => readonly EmailBlock[];
}

/* ── 팔레트 (블록 데이터의 초기값 — 토큰이 아니다) ───────────────────────────
 *
 * blocks.ts·presets.ts 머리말과 같은 이유로 `#` 를 코드로 붙인다: 이 값들은 어드민 화면 크롬의
 * 색이 아니라 **운영자가 컬러 피커로 바꾸는 데이터의 초기값**이고, 수신자의 메일함에는 우리
 * 스타일시트가 없어 `var(--tds-…)` 가 해석되지 않는다. */

const TITLE_INK = hexColor('191919');
const BODY_INK = hexColor('5A5B70');
const PRICE_INK = hexColor('19234B');
const PANEL_FILL = hexColor('F7F8FA');
const BRAND = hexColor('6B4EFF');
const ON_BRAND = hexColor('FFFFFF');
const TRANSPARENT = hexColor('FFFFFF00');

/* ── 조각 ────────────────────────────────────────────────────────────────────
 *
 * createLeafBlock 이 만든 기본 블록에 문구·색·여백만 덮어쓴다 — 기본값을 여기서 다시 적지 않는다
 * (기본값의 주인은 blocks.ts 하나다).
 *
 * [왜 전부 `blockKind !== '…' ? base : …` 인가] 팩토리는 EmailLeafBlock 유니온을 돌려주므로
 * 좁히지 않으면 그 종류의 필드를 쓸 수 없다. `as` 로 우기는 대신 좁힘을 통과시킨다 — 팩토리가
 * 다른 종류를 내주도록 바뀌면 그 자리에서 드러난다. */

/**
 * 카드 이미지 — **파일명은 비운 채로 넣는다.**
 *
 * [왜 비워 두나] 채워 넣을 그럴듯한 파일명(`product-1.jpg`)을 박으면 캔버스는 멀쩡해 보이고
 * 미완성 표시도 뜨지 않는다 — 운영자가 **자기 상품 사진을 넣어야 한다는 사실을 모른 채** 발행한다.
 * 비어 있으면 캔버스가 '설정이 덜 됐다' 고 말하고 발송 전 점검이 오류로 잡는다. 대체 텍스트는
 * 반대로 채워 둔다: 그것은 운영자가 잊기 쉬운 것이고, 문구는 상품명으로 고치면 그만이다.
 */
function cardImage(nextId: IdFactory, alt: string, width: number): EmailLeafBlock {
  const base = createLeafBlock('image', nextId());
  if (base.blockKind !== 'image') return base;
  return {
    ...base,
    alt,
    width,
    height: null,
    horizontalAlign: 'center',
    padding: ZERO_PADDING,
  };
}

/** 카드 제목 — heading 이 아니라 굵은 text 다(작은 소제목에 h3 를 쓰면 20px 로 나간다) */
function cardTitle(nextId: IdFactory, content: string): EmailLeafBlock {
  const base = createLeafBlock('text', nextId());
  if (base.blockKind !== 'text') return base;
  return {
    ...base,
    content,
    fontSize: 15,
    fontWeight: 'bold',
    textColor: TITLE_INK,
    align: 'left',
    padding: { top: 12, bottom: 0, left: 0, right: 0 },
  };
}

function cardBody(nextId: IdFactory, content: string): EmailLeafBlock {
  const base = createLeafBlock('text', nextId());
  if (base.blockKind !== 'text') return base;
  return {
    ...base,
    content,
    fontSize: 13,
    textColor: BODY_INK,
    align: 'left',
    padding: { top: 6, bottom: 0, left: 0, right: 0 },
  };
}

/** 가격 줄 — 본문과 같은 크기지만 굵고 진하다. 카드에서 눈이 두 번째로 닿는 자리다 */
function cardPrice(nextId: IdFactory, content: string): EmailLeafBlock {
  const base = createLeafBlock('text', nextId());
  if (base.blockKind !== 'text') return base;
  return {
    ...base,
    content,
    fontSize: 15,
    fontWeight: 'bold',
    textColor: PRICE_INK,
    align: 'left',
    padding: { top: 8, bottom: 0, left: 0, right: 0 },
  };
}

/**
 * 카드 안의 작은 버튼.
 *
 * [주소를 왜 example.com 으로 채우나 — 이미지와 반대로 간 이유] 주소를 비우면 캔버스에서
 * 미완성으로 잡히는 것은 같지만, 운영자가 **버튼 자체를 지우고 다시 만드는** 일이 잦다. 살아 있는
 * 자리표시 주소가 있으면 '여기를 상품 주소로 바꾸면 된다' 가 눈에 보인다. 실재하지 않는
 * 도메인이라 잘못 발송돼도 어디로도 데려가지 않는다(example.com 은 IANA 예약 도메인이다).
 */
function cardButton(nextId: IdFactory, content: string, size: 'sm' | 'md'): EmailLeafBlock {
  const base = createLeafBlock('button', nextId());
  if (base.blockKind !== 'button') return base;
  return {
    ...base,
    content,
    url: 'https://example.com/products',
    size,
    width: 'auto',
    align: 'left',
    buttonColor: BRAND,
    textColor: ON_BRAND,
    padding: { top: 14, bottom: 0, left: 0, right: 0 },
  };
}

/**
 * 다단 행 하나에 칸 내용을 채워 넣는다.
 *
 * [여백을 조각이 각자 갖는 이유] blocks.ts 의 COLUMN_CHILD_PADDING(사방 8px)을 일괄로 씌우면
 * 카드가 무너진다 — 카드는 '사진이 위쪽을 꽉 채우고 그 아래 글이 붙는' 모양이라 조각마다
 * 위쪽 간격이 다르다(사진 0 · 제목 12 · 설명 6 · 버튼 14). 그래서 각 조각 함수가 자기 여백을
 * 들고 오고, 여기서는 덮어쓰지 않는다. 칸 **바깥**의 숨 쉴 공간은 행의 padding·gap 이 만든다.
 */
function columnsOf(
  nextId: IdFactory,
  ratio: ColumnRatio,
  fill: readonly (readonly EmailLeafBlock[])[],
  background: string,
): EmailBlock {
  const base = createBlock('columns', nextId());
  if (base.blockKind !== 'columns') return base;
  const next = applyColumnRatio(base, ratio);
  return {
    ...next,
    backgroundColor: background,
    gap: 24,
    verticalAlign: 'top',
    padding: { top: 24, bottom: 24, left: 32, right: 32 },
    columns: next.columns.map((column, index) => ({ ...column, blocks: fill[index] ?? [] })),
  };
}

/* ── 묶음 ────────────────────────────────────────────────────────────────────
 *
 * 목록이 곧 피커의 '구성' 칸이다. 하나 늘리면 화면에 항목이 생긴다. */

export const EMAIL_BLOCK_GROUPS: readonly EmailBlockGroup[] = [
  {
    id: 'product-grid',
    label: '상품 카드 2단',
    description: '사진·상품명·설명·가격·버튼이 든 카드 두 장을 나란히 놓아요.',
    build: (nextId) => [
      columnsOf(
        nextId,
        '1:1',
        [
          [
            cardImage(nextId, '첫 번째 상품 사진', 240),
            cardTitle(nextId, '상품명을 입력하세요'),
            cardBody(nextId, '상품을 한 줄로 설명해 주세요.'),
            cardPrice(nextId, '00,000원'),
            cardButton(nextId, '구매하기', 'sm'),
          ],
          [
            cardImage(nextId, '두 번째 상품 사진', 240),
            cardTitle(nextId, '상품명을 입력하세요'),
            cardBody(nextId, '상품을 한 줄로 설명해 주세요.'),
            cardPrice(nextId, '00,000원'),
            cardButton(nextId, '구매하기', 'sm'),
          ],
        ],
        TRANSPARENT,
      ),
    ],
  },

  {
    id: 'product-row',
    label: '상품 카드 가로형',
    description: '왼쪽 사진 · 오른쪽 설명. 상품 하나를 크게 소개할 때 써요.',
    build: (nextId) => [
      columnsOf(
        nextId,
        '1:2',
        [
          [cardImage(nextId, '상품 사진', 160)],
          [
            cardTitle(nextId, '상품명을 입력하세요'),
            cardBody(nextId, '이 상품을 왜 지금 사야 하는지 두 줄 안으로 적어 주세요.'),
            cardPrice(nextId, '00,000원'),
            cardButton(nextId, '자세히 보기', 'sm'),
          ],
        ],
        PANEL_FILL,
      ),
    ],
  },

  {
    id: 'article-cards',
    label: '소식 카드 3단',
    description: '사진과 제목만 있는 카드 세 장. 뉴스레터의 지난 소식 묶음에 써요.',
    build: (nextId) => [
      columnsOf(
        nextId,
        '1:1:1',
        [
          [cardImage(nextId, '첫 번째 소식 사진', 150), cardTitle(nextId, '첫 번째 소식')],
          [cardImage(nextId, '두 번째 소식 사진', 150), cardTitle(nextId, '두 번째 소식')],
          [cardImage(nextId, '세 번째 소식 사진', 150), cardTitle(nextId, '세 번째 소식')],
        ],
        TRANSPARENT,
      ),
    ],
  },

  {
    id: 'cta-banner',
    label: 'CTA 배너',
    description: '옅은 면 위에 한 문장과 버튼 하나. 본문 끝에서 행동을 요청해요.',
    build: (nextId) => {
      const headline = createLeafBlock('heading', nextId());
      const cta = createLeafBlock('button', nextId());
      return [
        columnsOf(
          nextId,
          '1:1',
          [
            [
              headline.blockKind === 'heading'
                ? {
                    ...headline,
                    content: '지금 시작해 보세요',
                    level: 'h3',
                    textColor: TITLE_INK,
                    align: 'left',
                    padding: COLUMN_CHILD_PADDING,
                  }
                : headline,
            ],
            [
              cta.blockKind === 'button'
                ? {
                    ...cta,
                    content: '바로 가기',
                    url: 'https://example.com',
                    size: 'md',
                    align: 'right',
                    buttonColor: BRAND,
                    textColor: ON_BRAND,
                    padding: COLUMN_CHILD_PADDING,
                  }
                : cta,
            ],
          ],
          PANEL_FILL,
        ),
      ];
    },
  },
];

/** id 로 찾는다 — 없으면 undefined(피커가 내준 id 만 들어오지만 `!` 로 우기지 않는다) */
export function findBlockGroup(id: EmailBlockGroupId): EmailBlockGroup | undefined {
  return EMAIL_BLOCK_GROUPS.find((group) => group.id === id);
}

/** 문자열을 묶음 id 로 좁힌다 — `as` 대신 허용 목록에서 되찾는다 */
export function isBlockGroupId(value: string): value is EmailBlockGroupId {
  return EMAIL_BLOCK_GROUPS.some((group) => group.id === value);
}
