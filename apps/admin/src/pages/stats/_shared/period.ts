// 통계 조회 기간 — 프리셋·기간 산술·비교 기간
//
// [왜 여기 있나] 6개 통계 화면(방문자·회원·매출·주문·유입·검색어)이 **같은 기간 모델**을 쓴다.
// 기간 계산이 화면마다 흩어지면 '최근 7일'이 화면마다 하루씩 어긋난다.
//
// [타임존 — ERP-09] 통계의 '일자'는 **Asia/Seoul 기준의 달력 날짜**다. 브라우저 로컬 타임존을
// 따르면 같은 데이터가 관리자마다 다른 날짜에 잡힌다 (도쿄에서 보면 하루가 밀린다).
//
// 그 고정과 달력 산술은 이제 **shared/format.ts 한 벌**이다. 이 파일에는 서울 고정 Intl 포매터와
// 달력 날짜 산술의 사본이 따로 있었고, 같은 것의 사본이 로그 섹션에도 있었다 — 셋이 수렴했다
// (판정과 근거는 shared/format.ts 머리말). 특히 이 사본의 앵커는 **UTC 자정**이었고 정본은
// **UTC 정오**를 쓴다: 둘은 UTC 앵커라 동치이며 출력은 한 글자도 바뀌지 않는다.
// 이 파일의 isCalendarDate 가 갖고 있던 **타입가드 시그니처**는 정본으로 승격됐다.
//
// 여기 남는 것은 **이 섹션 고유의 기간 모델**이다 — 프리셋·비교 기간·기간 라벨.
import { dayCount, daysBetween, isCalendarDate, shiftDays } from '../../../shared/format';

/** 조회 기간 — 시작·종료 모두 포함(inclusive)하는 서울 기준 달력 날짜 */
export interface StatsPeriod {
  readonly start: string;
  readonly end: string;
}

/** 기간 비교 기준 — 통계 화면의 '심층 분석' 축 (대시보드에는 없다) */
export type CompareMode = 'none' | 'previous' | 'lastYear';

interface CompareDef {
  readonly id: CompareMode;
  readonly label: string;
}

export const COMPARE_MODES: readonly CompareDef[] = [
  { id: 'none', label: '비교 안 함' },
  { id: 'previous', label: '직전 기간' },
  { id: 'lastYear', label: '전년 동기' },
];

export const DEFAULT_COMPARE_MODE: CompareMode = 'previous';

export function isCompareMode(value: unknown): value is CompareMode {
  return typeof value === 'string' && COMPARE_MODES.some((mode) => mode.id === value);
}

/* ── 기간 산술 ───────────────────────────────────────────────────────────── */

/**
 * 기간에 포함된 날 수 — 시작·종료 포함이므로 최소 1.
 *
 * 날짜가 아니면 **0**이다. 예전에는 NaN 이 흘러나가 차트 축 길이·페이지 산술을 조용히
 * 오염시켰다. 0 이면 eachDay 가 빈 배열을 내고 화면은 '데이터 없음'이 된다 —
 * 잘못된 입력에 대해 **아무것도 그리지 않는 것**이 NaN 을 그리는 것보다 정직하다.
 * (애초에 화면은 periodErrorOf 가 먼저 막는다.)
 */
export function periodLength(period: StatsPeriod): number {
  return dayCount(period.start, period.end) ?? 0;
}

/** 기간의 모든 날짜 — 차트 x축·표 행의 원천 */
export function eachDay(period: StatsPeriod): readonly string[] {
  const days: string[] = [];
  for (let index = 0; index < periodLength(period); index += 1) {
    days.push(shiftDays(period.start, index));
  }
  return days;
}

/* ── 달(月) 산술 — 이 섹션에만 있는 축 ────────────────────────────────────────
 *
 * 공유 모듈에는 **일(日) 산술만** 있다 (shiftDays/dayCount). 달 산술은 여기서만 쓴다 —
 * '이번 달/지난 달' 프리셋과 '전년 동기' 비교뿐이다. 게다가 달 산술에는 일 산술에 없는 규칙,
 * **말일 보정**이 붙는다. 공유로 올리면 한 곳에서만 쓰는 규칙이 공용 API 가 된다.
 *
 * 앵커는 공유 모듈과 같은 **UTC 정오**다 (근거는 shared/format.ts 머리말 ①).
 * 여기만 자정을 쓰면 같은 파일 안에서 두 앵커가 섞인다 — 그 자체가 다음 사본의 씨앗이다.
 */

const NOON_HOUR_UTC = 12;

interface DayParts {
  readonly year: number;
  /** 0-based — Date.UTC 의 규약을 그대로 따른다 */
  readonly month: number;
  readonly day: number;
}

/** 'YYYY-MM-DD' → 달 산술용 조각. 프리셋/검증을 통과한 값만 들어온다 */
function partsOf(iso: string): DayParts {
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)) - 1,
    day: Number(iso.slice(8, 10)),
  };
}

/** 연·월·일 → 'YYYY-MM-DD' (UTC 정오 앵커. month/day 의 넘침은 Date 가 굴려 준다) */
function dayOf(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day, NOON_HOUR_UTC)).toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): string {
  const { year, month, day } = partsOf(iso);
  const shifted = month + months;
  // 말일 보정 — 1/31 의 한 달 전은 12/31 이지 3/03 이 아니다
  const lastDay = new Date(Date.UTC(year, shifted + 1, 0, NOON_HOUR_UTC)).getUTCDate();
  return dayOf(year, shifted, Math.min(day, lastDay));
}

function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function endOfMonth(iso: string): string {
  const { year, month } = partsOf(iso);
  // 다음 달의 0일 = 이번 달의 말일
  return dayOf(year, month + 1, 0);
}

/* ── 프리셋 ─────────────────────────────────────────────────────────────────
 *
 * 한국형 커머스 어드민의 관례 그대로다 (카페24·메이크샵·스마트스토어 공통).
 * 매 triage 를 수동 날짜 입력으로 시작하지 않게 하는 것이 목적이다 (COMP-11).
 */

export type PeriodPresetId =
  'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

interface PeriodPresetDef {
  readonly id: PeriodPresetId;
  readonly label: string;
  /** custom 은 사용자가 직접 고른 날짜라 계산식이 없다 */
  readonly resolve: ((today: string) => StatsPeriod) | null;
}

export const PERIOD_PRESETS: readonly PeriodPresetDef[] = [
  { id: 'today', label: '오늘', resolve: (today) => ({ start: today, end: today }) },
  {
    id: 'yesterday',
    label: '어제',
    resolve: (today) => ({ start: shiftDays(today, -1), end: shiftDays(today, -1) }),
  },
  // '최근 7일'은 오늘을 포함한 7일이다 (오늘 -6 ~ 오늘) — 업계 관례.
  {
    id: 'last7',
    label: '최근 7일',
    resolve: (today) => ({ start: shiftDays(today, -6), end: today }),
  },
  {
    id: 'last30',
    label: '최근 30일',
    resolve: (today) => ({ start: shiftDays(today, -29), end: today }),
  },
  {
    id: 'thisMonth',
    label: '이번 달',
    resolve: (today) => ({ start: startOfMonth(today), end: today }),
  },
  {
    id: 'lastMonth',
    label: '지난 달',
    resolve: (today) => {
      const previous = addMonths(startOfMonth(today), -1);
      return { start: previous, end: endOfMonth(previous) };
    },
  },
  { id: 'custom', label: '직접 입력', resolve: null },
];

export const DEFAULT_PRESET_ID: PeriodPresetId = 'last7';

export function isPeriodPresetId(value: unknown): value is PeriodPresetId {
  return typeof value === 'string' && PERIOD_PRESETS.some((preset) => preset.id === value);
}

/** 프리셋 → 기간. custom 이거나 모르는 id 면 null (호출부가 URL 의 날짜를 쓴다) */
export function resolvePreset(id: PeriodPresetId, today: string): StatsPeriod | null {
  return PERIOD_PRESETS.find((preset) => preset.id === id)?.resolve?.(today) ?? null;
}

/* ── 비교 기간 ───────────────────────────────────────────────────────────── */

/**
 * 비교 기간 — 대시보드에 없는 통계 전용 관점.
 * - previous: 같은 길이의 **직전** 기간 (7일 조회 → 그 앞 7일)
 * - lastYear: 같은 날짜의 **1년 전** (계절성 비교)
 */
export function comparePeriodOf(period: StatsPeriod, mode: CompareMode): StatsPeriod | null {
  if (mode === 'none') return null;
  if (mode === 'lastYear') {
    return { start: addMonths(period.start, -12), end: addMonths(period.end, -12) };
  }
  const length = periodLength(period);
  return { start: shiftDays(period.start, -length), end: shiftDays(period.start, -1) };
}

/* ── 검증 ───────────────────────────────────────────────────────────────── */

/** 종료일 < 시작일이면 조용한 empty 대신 이 문구를 띄운다 (COMP-11) */
const PERIOD_ORDER_ERROR = '종료일은 시작일보다 빠를 수 없습니다.';

export function periodErrorOf(period: StatsPeriod): string {
  if (!isCalendarDate(period.start) || !isCalendarDate(period.end)) {
    return '날짜 형식이 올바르지 않습니다.';
  }
  // 바로 위에서 두 끝이 달력 날짜임을 확인했다 — daysBetween 이 null 을 낼 수 없다
  return (daysBetween(period.start, period.end) ?? 0) < 0 ? PERIOD_ORDER_ERROR : '';
}

/* ── 표시 ───────────────────────────────────────────────────────────────── */

/** '2026.07.10' — 표·차트 축의 짧은 날짜 */
export function formatDayLabel(iso: string): string {
  return iso.replaceAll('-', '.');
}

/** '2026.07.10 ~ 2026.07.16 (7일)' — 조회 범위 요약 */
export function formatPeriodLabel(period: StatsPeriod): string {
  const days = periodLength(period);
  if (days === 1) return formatDayLabel(period.start);
  return `${formatDayLabel(period.start)} ~ ${formatDayLabel(period.end)} (${String(days)}일)`;
}
