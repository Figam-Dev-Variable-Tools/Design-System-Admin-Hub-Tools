// 프로그램 화면 전용 타입 + 뷰 헬퍼
//
// 정본(픽스처·규칙)은 ./_shared/store 다. 여기는 화면이 읽는 **표시 규칙**만 둔다 —
// 상태 문구·색, 목록 필터 축, 진행률 문구. 순수 함수라 테스트가 화면 없이 고정한다.
import { formatNumber } from '../../shared/format';
import type { StatusBadgeTone } from '@tds/ui';
import { fundingRate, isGoalReached } from './_shared/store';
import type {
  Program,
  ProgramCategory,
  ProgramCategoryUsage,
  ProgramOptionGroup,
  ProgramReward,
  ProgramStatus,
} from './_shared/store';

/* ── 상태 표시 ────────────────────────────────────────────────────────────── */

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

const STATUS_META: Record<ProgramStatus, StatusMeta> = {
  draft: { label: '작성 중', tone: 'neutral' },
  scheduled: { label: '오픈 예정', tone: 'info' },
  live: { label: '진행 중', tone: 'success' },
  succeeded: { label: '성공', tone: 'success' },
  failed: { label: '실패', tone: 'danger' },
};

export function programStatusLabel(status: ProgramStatus): string {
  return STATUS_META[status].label;
}

export function programStatusTone(status: ProgramStatus): StatusBadgeTone {
  return STATUS_META[status].tone;
}

export const PROGRAM_STATUS_OPTIONS: readonly {
  readonly id: ProgramStatus;
  readonly label: string;
}[] = (['draft', 'scheduled', 'live', 'succeeded', 'failed'] as const).map((status) => ({
  id: status,
  label: STATUS_META[status].label,
}));

/* ── 목록 필터: 상태 ──────────────────────────────────────────────────────── */

export const PROGRAM_STATUS_ALL = 'all';

export type ProgramStatusFilter = typeof PROGRAM_STATUS_ALL | ProgramStatus;

export const PROGRAM_STATUS_FILTERS: readonly {
  readonly id: ProgramStatusFilter;
  readonly label: string;
}[] = [{ id: PROGRAM_STATUS_ALL, label: '전체' }, ...PROGRAM_STATUS_OPTIONS];

export const PROGRAM_STATUS_FILTER_VALUES: readonly ProgramStatusFilter[] =
  PROGRAM_STATUS_FILTERS.map((option) => option.id);

export function filterProgramsByStatus(
  list: readonly Program[],
  filter: ProgramStatusFilter,
): readonly Program[] {
  if (filter === PROGRAM_STATUS_ALL) return list;
  return list.filter((program) => program.status === filter);
}

/* ── 목록 필터: 카테고리 (2Depth 롤업) ───────────────────────────────────── */

export const PROGRAM_CATEGORY_ALL = 'all';

/**
 * 어떤 카테고리 id 들이 이 필터에 걸리는가 — 자기 자신 + (대분류라면) 그 아래 중분류 전부.
 *
 * 2단계가 상한이므로(_shared/store.ts) 재귀가 필요 없다. **키 있는 Set** 으로 한 번에 판정한다.
 */
function categoryFamily(
  categoryId: string,
  categories: readonly ProgramCategory[],
): ReadonlySet<string> {
  const family = new Set<string>([categoryId]);
  for (const category of categories) {
    if (category.parentId === categoryId) family.add(category.id);
  }
  return family;
}

/**
 * 카테고리 필터 — **대분류를 고르면 그 아래 중분류까지 함께 걸린다.**
 *
 * [왜 롤업인가] 프로그램은 대개 중분류('음향기기')에 붙는다. 롤업이 없으면 '테크·가전' 을 고른
 * 운영자는 빈 목록을 본다 — 좌측 배지는 '테크·가전 2' 라고 말하는데 표는 0건인 상태다.
 * 필터가 자기 건수에 대해 거짓말하게 된다. 그래서 **거르는 규칙과 세는 규칙이 같은 롤업 위에 선다**
 * (countProgramsByCategory 도 같은 규칙이다 — 둘이 갈라지는 순간 배지가 다시 거짓말한다).
 *
 * 모르는 id(손으로 고친 URL·지워진 카테고리)는 아무것도 걸리지 않아 빈 목록이 된다 —
 * 조회가 깨지는 것보다 낫고, 빈 상태 화면이 '필터 초기화'로 되돌릴 길을 준다 (STATE-05).
 */
export function filterProgramsByCategory(
  list: readonly Program[],
  categoryId: string,
  categories: readonly ProgramCategory[],
): readonly Program[] {
  if (categoryId === PROGRAM_CATEGORY_ALL) return list;
  const family = categoryFamily(categoryId, categories);
  return list.filter((program) => family.has(program.categoryId));
}

/**
 * 카테고리 id → 프로그램 수. 좌측 필터의 건수 배지가 쓴다.
 *
 * 중분류의 한 건은 **그 대분류의 한 건이기도 하다** — 필터가 그렇게 걸리기 때문이다.
 * 건수는 다른 축(상태) 필터를 반영하지 않는다: 두 축이 서로의 배지를 흔들면 비교 기준이 사라진다.
 */
export function countProgramsByCategory(
  list: readonly Program[],
  categories: readonly ProgramCategory[],
): Readonly<Record<string, number>> {
  // 부모를 되짚는 키 있는 Record — 목록을 훑다 못 찾으면 첫 항목으로 흘러가는 fallback 을 쓰지 않는다
  const parentOf: Record<string, string | null> = {};
  const counts: Record<string, number> = {};
  for (const category of categories) {
    parentOf[category.id] = category.parentId;
    counts[category.id] = 0;
  }

  for (const program of list) {
    const own = program.categoryId;
    counts[own] = (counts[own] ?? 0) + 1;
    const parent = parentOf[own];
    if (parent !== null && parent !== undefined) counts[parent] = (counts[parent] ?? 0) + 1;
  }
  return counts;
}

/** 제목·창작자로 찾는다 — 목록 검색 */
export function searchPrograms(list: readonly Program[], keyword: string): readonly Program[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (program) =>
      program.title.toLowerCase().includes(needle) ||
      program.creator.toLowerCase().includes(needle),
  );
}

export function countProgramsByStatus(
  list: readonly Program[],
): Record<ProgramStatusFilter, number> {
  const counts = {
    [PROGRAM_STATUS_ALL]: list.length,
    draft: 0,
    scheduled: 0,
    live: 0,
    succeeded: 0,
    failed: 0,
  } as Record<ProgramStatusFilter, number>;
  for (const program of list) counts[program.status] += 1;
  return counts;
}

/* ── 진행률 문구 ──────────────────────────────────────────────────────────── */

/** '143% · 14,320,000원' — 달성률과 모금액을 함께 읽힌다 */
export function fundingSummary(program: Program): string {
  const rate = fundingRate(program.goalAmount, program.pledgedAmount);
  return `${formatNumber(rate)}% · ${formatNumber(program.pledgedAmount)}원`;
}

/** 달성 여부에 따른 색 — 색만으로 전달하지 않게 문구와 함께 쓴다 */
export function fundingTone(program: Program): StatusBadgeTone {
  return isGoalReached(program.goalAmount, program.pledgedAmount) ? 'success' : 'info';
}

/* ── 옵션 문구 ────────────────────────────────────────────────────────────── */

/** '색상 2개 · 케이블 길이 2개' — 옵션 구획과 미리보기가 같은 문구를 쓴다. 없으면 '없음' */
export function programOptionSummary(groups: readonly ProgramOptionGroup[]): string {
  const named = groups.filter((group) => group.name.trim() !== '' && group.values.length > 0);
  if (named.length === 0) return '없음';
  return named
    .map((group) => `${group.name.trim()} ${formatNumber(group.values.length)}개`)
    .join(' · ');
}

/**
 * 한 리워드가 후원자에게 고르게 하는 옵션 이름들 — '색상 · 케이블 길이'. 없으면 '옵션 없음'.
 *
 * 그룹은 id 로 매단다. 목록을 훑어 찾지 않고 **키 있는 Record** 로 되짚는 이유는, 찾지 못했을 때
 * 첫 그룹으로 흘러가는 fallback(`find() ?? [0]`)이 조용히 다른 옵션 이름을 붙이기 때문이다.
 */
export function rewardOptionSummary(
  reward: Pick<ProgramReward, 'optionGroupIds'>,
  groups: readonly ProgramOptionGroup[],
): string {
  const byId: Record<string, ProgramOptionGroup> = {};
  for (const group of groups) byId[group.id] = group;

  const names: string[] = [];
  for (const id of reward.optionGroupIds) {
    const group = byId[id];
    // 가리킬 곳이 없는 참조는 조용히 건너뛴다 — 저장 경로가 떼어내기 전의 화면에서도 거짓말하지 않는다
    if (group === undefined) continue;
    names.push(group.name.trim() === '' ? '이름 없는 옵션' : group.name.trim());
  }
  return names.length === 0 ? '옵션 없음' : names.join(' · ');
}

/* ── 카테고리 사용량 문구 (상품 카테고리와 같은 규칙) ─────────────────────── */

export function categoryUsageLabel(programCount: number): string {
  return programCount === 0 ? '미사용' : `${formatNumber(programCount)}개 프로그램`;
}

export function filterCategoriesByUsage(
  list: readonly ProgramCategoryUsage[],
  filter: 'all' | 'in-use' | 'unused',
): readonly ProgramCategoryUsage[] {
  if (filter === 'all') return list;
  if (filter === 'in-use') return list.filter((category) => category.programCount > 0);
  return list.filter((category) => category.programCount === 0);
}

/** 카테고리 등록/수정 입력 */
export interface ProgramCategoryInput {
  readonly name: string;
  readonly parentId: string | null;
}
