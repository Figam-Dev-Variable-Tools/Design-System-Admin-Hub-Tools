// 프로그램(펀딩) 저장소 — 화면들이 공유하는 정본 픽스처 + 순수 규칙
//
// [무엇인가] 텀블벅류의 **후원형 펀딩 프로그램**이다. 창작자가 목표 금액과 기간을 걸고 열면,
// 후원자가 리워드를 골라 후원한다. 기간이 끝나는 순간 목표 달성 여부로 성공/실패가 갈린다.
//
// [왜 목표·모금액을 저장소가 갖고 달성률은 함수인가] 달성률·남은 기간·성공 여부는 전부
// **저장된 두 값에서 계산되는 파생값**이다. 파생값을 필드로 두면 모금액만 바뀌고 달성률이
// 옛값으로 남는 순간이 생긴다 — 그래서 여기서는 계산 함수로만 노출한다.
//
// [카테고리는 2단계다] 상품 카테고리와 같은 규칙(대분류 → 중분류, 3단계 금지)을 쓴다.
// 백엔드가 붙으면 이 파일의 함수 시그니처가 그대로 API 경계가 된다.

/* ── 카테고리 (2Depth) ────────────────────────────────────────────────────── */

export interface ProgramCategory {
  readonly id: string;
  readonly label: string;
  /** 상위 카테고리 id. null 이면 최상위(1Depth) */
  readonly parentId: string | null;
}

/** 카테고리 + 쓰는 프로그램 수 — 삭제 차단 판단·목록 배지에 쓴다 */
export interface ProgramCategoryUsage extends ProgramCategory {
  readonly programCount: number;
  readonly hasChildren: boolean;
}

/* ── 프로그램 ─────────────────────────────────────────────────────────────── */

/**
 * 진행 상태.
 *
 * `draft`(작성 중) → `scheduled`(오픈 예정) → `live`(진행 중) → `succeeded`/`failed`(종료).
 * 성공/실패는 **기간이 끝난 뒤 목표 달성 여부**로 갈린다 — 진행 중에는 아직 정해지지 않는다.
 */
export type ProgramStatus = 'draft' | 'scheduled' | 'live' | 'succeeded' | 'failed';

/**
 * 옵션 그룹 — '색상: [블랙, 화이트]' 처럼 이름 + 값 목록.
 *
 * 상품(ProductOptionGroup)과 같은 모양이지만 **쓰이는 자리가 다르다**: 상품은 그룹의 데카르트 곱을
 * SKU 매트릭스로 펼쳐 재고를 붙이고, 펀딩은 재고 대신 **리워드**가 옵션을 든다. 후원자는 상품을
 * 고르는 것이 아니라 리워드를 고르고, 색상·사이즈는 그 리워드를 받을 때 정하는 값이기 때문이다.
 * 그래서 여기에는 variants(조합)가 없다 — 조합마다 값을 붙일 축(재고·SKU)이 펀딩에 없다.
 */
export interface ProgramOptionGroup {
  readonly id: string;
  readonly name: string;
  readonly values: readonly string[];
}

/** 리워드 한 칸 — 후원 금액과 그 대가 */
export interface ProgramReward {
  readonly id: string;
  readonly title: string;
  /** 이 리워드를 받는 최소 후원 금액(원) */
  readonly amount: number;
  readonly description: string;
  /** 수량 한정. 0 이면 무제한 */
  readonly limitCount: number;
  readonly claimedCount: number;
  /**
   * 이 리워드를 고를 때 후원자가 함께 정하는 옵션 그룹의 id 목록.
   *
   * [왜 리워드에 매다나] '초판 1권' 에는 고를 것이 없고 '2대 세트' 에는 색상이 두 번 필요하다 —
   * 옵션을 프로그램 전체에 일괄 적용하면 없는 선택지를 모든 리워드가 떠안는다.
   * 정의는 프로그램(옵션 그룹 목록)이 갖고, **적용 여부는 리워드가 고른다**.
   */
  readonly optionGroupIds: readonly string[];
}

export interface Program {
  readonly id: string;
  readonly title: string;
  readonly categoryId: string;
  /** 비정규화 라벨 — 목록이 카테고리를 다시 조회하지 않게 한다 */
  readonly categoryLabel: string;
  readonly creator: string;
  readonly summary: string;
  readonly story: string;
  /**
   * 상세 설명 — **sanitize 된 HTML** 이다(평문 아님). 스토리와 나란히 있지만 읽는 방식이 다르다:
   * 스토리는 '왜 만들었나' 를 파는 글이고, 상세 설명은 사양·구성·배송 유의사항처럼 후원 직전에
   * **사실을 확인하는 글**이다. 길이 상한(PROGRAM_DESCRIPTION_MAX)은 마크업이 아니라 평문 길이에
   * 건다 — richTextLength 참조.
   */
  readonly description: string;
  /** 목표 금액(원) */
  readonly goalAmount: number;
  /** 현재 모금액(원) */
  readonly pledgedAmount: number;
  readonly backerCount: number;
  /** ISO yyyy-mm-dd */
  readonly startDate: string;
  readonly endDate: string;
  readonly status: ProgramStatus;
  /**
   * 대표 이미지 — **상세 상단에 크게** 걸리는 그림. 가로가 긴 배너 비율이다.
   *
   * [왜 썸네일과 나누나] 목록·카드는 작은 정사각에 가깝고 상세 상단은 넓은 가로다. 같은 그림을
   * 두 자리에 쓰면 한쪽은 반드시 잘린다 — 카드에서 제목이 잘려나가거나, 상세에서 위아래가
   * 뭉텅이로 없어진다. 그래서 자리마다 그림을 따로 받는다.
   */
  readonly coverImageUrl: string;
  /** 썸네일 — 목록·카드에서 **작게** 쓰이는 그림. 위 coverImageUrl 주석의 짝이다. */
  readonly thumbnailUrl: string;
  /** 프로그램이 정의하는 옵션 그룹. 적용 여부는 리워드가 optionGroupIds 로 고른다 */
  readonly optionGroups: readonly ProgramOptionGroup[];
  readonly rewards: readonly ProgramReward[];
}

/** 등록/수정 입력 — 모금액·후원자수는 후원이 만드는 값이라 입력에 없다 */
export interface ProgramInput {
  readonly title: string;
  readonly categoryId: string;
  readonly creator: string;
  readonly summary: string;
  readonly story: string;
  readonly description: string;
  readonly goalAmount: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: ProgramStatus;
  readonly coverImageUrl: string;
  readonly thumbnailUrl: string;
  readonly optionGroups: readonly ProgramOptionGroup[];
  readonly rewards: readonly ProgramReward[];
}

export const PROGRAM_TITLE_MAX = 60;
export const PROGRAM_SUMMARY_MAX = 120;
export const PROGRAM_CATEGORY_NAME_MAX = 40;
/** 상세 설명 상한 — 평문 길이 기준(마크업은 세지 않는다) */
export const PROGRAM_DESCRIPTION_MAX = 2000;
/**
 * 옵션 그룹 상한 — 상품(MAX_OPTION_GROUPS)과 같은 3개.
 * 리워드 한 줄에서 고르는 선택지라, 넷을 넘으면 후원 화면에서 무엇을 고르는지 읽히지 않는다.
 */
export const MAX_PROGRAM_OPTION_GROUPS = 3;

/* ── 파생값 (순수 함수) ───────────────────────────────────────────────────── */

/** 달성률(%) — 목표가 0이면 0. 100을 넘을 수 있다(초과 달성) */
export function fundingRate(goalAmount: number, pledgedAmount: number): number {
  if (goalAmount <= 0) return 0;
  return Math.round((pledgedAmount / goalAmount) * 100);
}

/** 목표를 채웠나 */
export function isGoalReached(goalAmount: number, pledgedAmount: number): boolean {
  return goalAmount > 0 && pledgedAmount >= goalAmount;
}

/**
 * 남은 일수 — 종료일 포함으로 센다. 이미 지났으면 0.
 * `today` 를 인자로 받는다(테스트가 시계를 고정할 수 있게).
 */
export function daysLeft(endDate: string, today: string): number {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(end) || Number.isNaN(now)) return 0;
  const diff = Math.ceil((end - now) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/* ── 옵션 규칙 (순수 함수 — 폼과 저장이 같은 규칙을 쓴다) ─────────────────── */

/**
 * 저장 직전의 옵션 그룹 정리.
 *
 * 세 가지를 버린다 — **셋 다 후원자에게 고를 것을 주지 못하는 그룹**이라서다:
 *   1) 값이 하나도 없는 그룹 — 이름만 만들어 두고 값을 못 채운 상태다. 막지 않고 버린다:
 *      작성 중에 그룹 자리를 먼저 잡는 것은 정상적인 순서라 저장 자체를 세울 이유가 없다.
 *   2) 값 안의 빈 문자열·중복 — '블랙, , 블랙' 을 붙여 넣어도 선택지는 '블랙' 하나다.
 *   3) 이름이 같은 그룹 — 리워드 편집기에서 어느 쪽을 고른 것인지 구분되지 않는다.
 *      (폼에서는 programSchema 가 먼저 문구로 막고, 여기서는 다른 경로로 들어온 값을 눕힌다)
 */
export function normalizeProgramOptionGroups(
  groups: readonly ProgramOptionGroup[],
): readonly ProgramOptionGroup[] {
  const seenNames = new Set<string>();
  const normalized: ProgramOptionGroup[] = [];

  for (const group of groups) {
    const name = group.name.trim();
    const values: string[] = [];
    for (const raw of group.values) {
      const value = raw.trim();
      if (value !== '' && !values.includes(value)) values.push(value);
    }
    if (name === '' || values.length === 0) continue;
    if (seenNames.has(name)) continue;
    seenNames.add(name);
    normalized.push({ id: group.id, name, values });
  }

  return normalized;
}

/**
 * 리워드가 든 옵션 참조를 살아 있는 그룹에만 맞춘다.
 *
 * 그룹을 지우거나 값이 비어 버려지면 그 id 를 가리키던 리워드의 참조는 **가리킬 곳이 없는 id** 가
 * 된다. 남겨 두면 후원 화면이 이름 없는 선택지를 그리게 되므로 저장 경로에서 떼어낸다.
 */
export function applyOptionGroupsToRewards(
  rewards: readonly ProgramReward[],
  groups: readonly ProgramOptionGroup[],
): readonly ProgramReward[] {
  const liveIds = new Set(groups.map((group) => group.id));
  return rewards.map((reward) => {
    const kept = reward.optionGroupIds.filter((id) => liveIds.has(id));
    return kept.length === reward.optionGroupIds.length
      ? reward
      : { ...reward, optionGroupIds: kept };
  });
}

/* ── 픽스처 (가상 데이터 — 실명 없음) ─────────────────────────────────────── */

let categories: ProgramCategory[] = [
  // 1Depth (대분류)
  { id: 'tech', label: '테크·가전', parentId: null },
  { id: 'life', label: '리빙·생활', parentId: null },
  { id: 'culture', label: '문화·예술', parentId: null },
  // 2Depth (중분류)
  { id: 'tech-audio', label: '음향기기', parentId: 'tech' },
  { id: 'tech-mobile', label: '모바일 액세서리', parentId: 'tech' },
  { id: 'life-kitchen', label: '주방', parentId: 'life' },
  { id: 'life-furniture', label: '가구', parentId: 'life' },
  { id: 'culture-book', label: '출판', parentId: 'culture' },
];

const labelOf = (categoryId: string): string =>
  categories.find((category) => category.id === categoryId)?.label ?? categoryId;

function reward(
  id: string,
  title: string,
  amount: number,
  description: string,
  limitCount: number,
  claimedCount: number,
  /** 이 리워드가 고르게 할 옵션 그룹 — 고를 것이 없는 리워드(책 1권 등)는 비운다 */
  optionGroupIds: readonly string[] = [],
): ProgramReward {
  return { id, title, amount, description, limitCount, claimedCount, optionGroupIds };
}

/** 픽스처 썸네일 — 목록·카드 자리의 그림. 실사진 대신 자리표시 이미지를 쓴다(가상 데이터) */
const THUMB = '/fixtures/placeholder-image.svg';

let programs: Program[] = [
  {
    id: 'pgm-1',
    title: '무선 스튜디오 모니터 헤드폰',
    categoryId: 'tech-audio',
    categoryLabel: '음향기기',
    creator: '사운드랩',
    summary: '스튜디오 모니터링을 그대로 옮긴 무선 헤드폰',
    story: '작업실 밖에서도 같은 소리를 듣고 싶었어요. 지연 없는 무선 전송을 목표로 만들었어요.',
    description:
      '<p>드라이버 40mm · 재생 시간 32시간 · 무게 268g</p><ul><li>구성품: 본체, USB-C 케이블, 파우치</li><li>배송 예정: 2026년 11월</li></ul>',
    goalAmount: 10_000_000,
    pledgedAmount: 14_320_000,
    backerCount: 412,
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    status: 'live',
    coverImageUrl: '',
    thumbnailUrl: THUMB,
    optionGroups: [{ id: 'pog-1-color', name: '색상', values: ['미드나이트 블랙', '오프 화이트'] }],
    rewards: [
      reward('rw-1-1', '얼리버드 1대', 189_000, '정가 대비 30% 할인', 100, 100, ['pog-1-color']),
      reward('rw-1-2', '일반 1대', 219_000, '본품 + 파우치', 0, 280, ['pog-1-color']),
      reward('rw-1-3', '2대 세트', 398_000, '본품 2대 + 스탠드', 50, 32, ['pog-1-color']),
    ],
  },
  {
    id: 'pgm-2',
    title: '접이식 원목 사이드테이블',
    categoryId: 'life-furniture',
    categoryLabel: '가구',
    creator: '노크우드',
    summary: '한 손으로 접히는 원목 사이드테이블',
    story: '좁은 집에서도 쓰던 자리를 돌려받을 수 있게 접히는 구조로 설계했어요.',
    description:
      '<p>펼침 420×420×520mm · 접힘 두께 60mm · 내하중 15kg</p><ul><li>소재: 원목(오크·월넛), 수성 도료 마감</li><li>조립 필요 없음</li></ul>',
    goalAmount: 5_000_000,
    pledgedAmount: 2_150_000,
    backerCount: 86,
    startDate: '2026-07-05',
    endDate: '2026-08-15',
    status: 'live',
    coverImageUrl: '',
    thumbnailUrl: THUMB,
    optionGroups: [{ id: 'pog-2-wood', name: '원목', values: ['오크', '월넛'] }],
    rewards: [
      reward('rw-2-1', '테이블 1개', 79_000, '오크 / 월넛 택 1', 0, 74, ['pog-2-wood']),
      reward('rw-2-2', '테이블 2개', 149_000, '색상 조합 자유', 30, 12, ['pog-2-wood']),
    ],
  },
  {
    id: 'pgm-3',
    title: '도시 산책 에세이집',
    categoryId: 'culture-book',
    categoryLabel: '출판',
    creator: '걷는사람',
    summary: '열두 도시의 골목을 걸어 적은 산문집',
    story: '2년간 기록한 골목의 표정을 한 권으로 묶었어요.',
    description:
      '<p>128×188mm · 284쪽 · 무선제본</p><ul><li>초판 한정 엽서 2종 동봉</li><li>배송 예정: 2026년 7월</li></ul>',
    goalAmount: 3_000_000,
    pledgedAmount: 3_480_000,
    backerCount: 231,
    startDate: '2026-04-01',
    endDate: '2026-05-31',
    status: 'succeeded',
    coverImageUrl: '',
    thumbnailUrl: THUMB,
    // 옵션이 없는 프로그램 — 책 한 권에는 후원자가 고를 축이 없다(빈 배열이 정상이라는 예시다)
    optionGroups: [],
    rewards: [reward('rw-3-1', '초판 1권', 18_000, '작가 사인본', 200, 200)],
  },
  {
    id: 'pgm-4',
    title: '휴대용 커피 드리퍼',
    categoryId: 'life-kitchen',
    categoryLabel: '주방',
    creator: '데일리브루',
    summary: '납작하게 접히는 스테인리스 드리퍼',
    story: '캠핑과 출장에서 쓰려고 만들었어요.',
    description:
      '<p>스테인리스 304 · 접힘 두께 8mm · 무게 92g</p><ul><li>식기세척기 사용 가능</li><li>구성품: 드리퍼, 전용 파우치</li></ul>',
    goalAmount: 8_000_000,
    pledgedAmount: 1_960_000,
    backerCount: 54,
    startDate: '2026-03-01',
    endDate: '2026-04-15',
    status: 'failed',
    coverImageUrl: '',
    thumbnailUrl: THUMB,
    optionGroups: [{ id: 'pog-4-size', name: '용량', values: ['1~2인용', '3~4인용'] }],
    rewards: [reward('rw-4-1', '드리퍼 1개', 39_000, '전용 파우치 포함', 0, 54, ['pog-4-size'])],
  },
  {
    id: 'pgm-5',
    title: '마그네틱 충전 스탠드',
    categoryId: 'tech-mobile',
    categoryLabel: '모바일 액세서리',
    creator: '스냅기어',
    summary: '각도가 고정되는 자석식 충전 거치대',
    story: '책상 위에서 각도가 흘러내리지 않는 거치대를 목표로 했어요.',
    description:
      '<p>각도 조절 15~70° · 마그넷 유지력 1.2kg · 15W 무선 충전</p><ul><li>구성품: 스탠드, USB-C 케이블</li><li>배송 예정: 2026년 12월</li></ul>',
    goalAmount: 6_000_000,
    pledgedAmount: 0,
    backerCount: 0,
    startDate: '2026-08-01',
    endDate: '2026-09-10',
    status: 'scheduled',
    coverImageUrl: '',
    thumbnailUrl: THUMB,
    optionGroups: [
      { id: 'pog-5-color', name: '색상', values: ['화이트', '그레이'] },
      { id: 'pog-5-cable', name: '케이블 길이', values: ['1m', '2m'] },
    ],
    rewards: [
      reward('rw-5-1', '스탠드 1개', 49_000, '얼리버드 20% 할인', 150, 0, [
        'pog-5-color',
        'pog-5-cable',
      ]),
    ],
  },
];

let programSeq = programs.length;
let categorySeq = categories.length;

/* ── 프로그램 저장소 API ──────────────────────────────────────────────────── */

export function listPrograms(): readonly Program[] {
  return programs;
}

export function getProgram(id: string): Program {
  const found = programs.find((program) => program.id === id);
  if (found === undefined) throw new Error('프로그램을 찾을 수 없어요');
  return found;
}

export function addProgram(input: ProgramInput): void {
  programSeq += 1;
  programs = [
    ...programs,
    {
      id: `pgm-${String(programSeq)}`,
      ...input,
      categoryLabel: labelOf(input.categoryId),
      pledgedAmount: 0,
      backerCount: 0,
    },
  ];
}

export function updateProgram(id: string, input: ProgramInput): void {
  programs = programs.map((program) =>
    program.id === id
      ? { ...program, ...input, categoryLabel: labelOf(input.categoryId) }
      : program,
  );
}

export function removeProgram(id: string): void {
  programs = programs.filter((program) => program.id !== id);
}

/** 이 카테고리를 쓰는 프로그램 수 — 삭제 차단에 쓴다 */
export function countProgramsUsingCategory(categoryId: string): number {
  return programs.filter((program) => program.categoryId === categoryId).length;
}

/* ── 카테고리 저장소 API (상품 카테고리와 같은 2단계 규칙) ────────────────── */

export function listProgramCategories(): readonly ProgramCategory[] {
  return categories;
}

/** 1Depth(대분류)만 */
export function listProgramCategoryRoots(): readonly ProgramCategory[] {
  return categories.filter((category) => category.parentId === null);
}

/** 특정 대분류의 2Depth(중분류) */
export function listProgramCategoryChildren(parentId: string): readonly ProgramCategory[] {
  return categories.filter((category) => category.parentId === parentId);
}

export function hasProgramCategoryChildren(id: string): boolean {
  return categories.some((category) => category.parentId === id);
}

/** '테크·가전 > 음향기기' 표기 */
export function programCategoryPath(id: string): string {
  const found = categories.find((category) => category.id === id);
  if (found === undefined) return id;
  if (found.parentId === null) return found.label;
  const parent = categories.find((category) => category.id === found.parentId);
  return parent === undefined ? found.label : `${parent.label} > ${found.label}`;
}

export function listProgramCategoryUsage(): readonly ProgramCategoryUsage[] {
  return categories.map((category) => ({
    ...category,
    programCount: countProgramsUsingCategory(category.id),
    hasChildren: categories.some((child) => child.parentId === category.id),
  }));
}

export function getProgramCategoryUsage(id: string): ProgramCategoryUsage {
  const found = categories.find((category) => category.id === id);
  if (found === undefined) throw new Error('카테고리를 찾을 수 없어요');
  return {
    ...found,
    programCount: countProgramsUsingCategory(found.id),
    hasChildren: categories.some((child) => child.parentId === found.id),
  };
}

/** 부모는 1Depth 만 — 3단계를 만들지 않는다 */
function assertAssignableParent(parentId: string | null, selfId?: string): void {
  if (parentId === null) return;
  if (selfId !== undefined && parentId === selfId) {
    throw new Error('자기 자신을 상위 카테고리로 지정할 수 없어요.');
  }
  const parent = categories.find((category) => category.id === parentId);
  if (parent === undefined) throw new Error('상위 카테고리를 찾을 수 없어요.');
  if (parent.parentId !== null) {
    throw new Error('카테고리는 2단계까지만 만들 수 있어요.');
  }
}

export function addProgramCategory(label: string, parentId: string | null = null): void {
  assertAssignableParent(parentId);
  categorySeq += 1;
  categories = [
    ...categories,
    { id: `pgm-cat-${String(categorySeq)}`, label: label.trim(), parentId },
  ];
}

export function updateProgramCategory(
  id: string,
  label: string,
  parentId: string | null = null,
): void {
  assertAssignableParent(parentId, id);
  if (parentId !== null && hasProgramCategoryChildren(id)) {
    throw new Error('하위 카테고리가 있는 카테고리는 다른 카테고리 밑으로 옮길 수 없어요.');
  }

  const trimmed = label.trim();
  categories = categories.map((category) =>
    category.id === id ? { ...category, label: trimmed, parentId } : category,
  );
  programs = programs.map((program) =>
    program.categoryId === id ? { ...program, categoryLabel: trimmed } : program,
  );
}

/** 쓰는 프로그램이 있거나 하위가 있으면 삭제하지 않는다(서버는 409 로 막는다) */
export function removeProgramCategory(id: string): void {
  if (countProgramsUsingCategory(id) > 0) {
    throw new Error('사용 중인 카테고리는 삭제할 수 없어요.');
  }
  if (hasProgramCategoryChildren(id)) {
    throw new Error('하위 카테고리가 있는 카테고리는 삭제할 수 없어요.');
  }
  categories = categories.filter((category) => category.id !== id);
}
