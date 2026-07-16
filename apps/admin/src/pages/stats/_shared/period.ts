// 통계 조회 기간 — 프리셋·기간 산술·비교 기간 (A40 소유 — apps/admin/src/pages/stats/**)
//
// [왜 여기 있나] 6개 통계 화면(방문자·회원·매출·주문·유입·검색어)이 **같은 기간 모델**을 쓴다.
// 기간 계산이 화면마다 흩어지면 '최근 7일'이 화면마다 하루씩 어긋난다.
//
// [타임존 — ERP-09] 통계의 '일자'는 **Asia/Seoul 기준의 달력 날짜**다. 브라우저 로컬 타임존을
// 따르면 같은 데이터가 관리자마다 다른 날짜에 잡힌다 (도쿄에서 보면 하루가 밀린다).
// 그래서 '오늘'은 언제나 서울 기준으로 정하고, 그 뒤의 산술은 **달력 날짜 문자열**('YYYY-MM-DD')
// 위에서만 한다. 한국은 서머타임이 없고 날짜 자체를 불투명한 civil date 로 다루므로
// UTC 자정 기준 산술이 정확하다 — 시각(clock)을 더하는 게 아니라 날짜(calendar day)를 더한다.
//
// shared/format.ts 의 formatDate 는 브라우저 로컬 getter 라서 여기서 쓰지 않는다 (ERP-09 위반).

/** 통계 표시의 고정 타임존 — 서버가 UTC 를 주더라도 화면은 언제나 이 기준이다 */
const SEOUL_TIME_ZONE = 'Asia/Seoul';

const DAY_MS = 24 * 60 * 60 * 1000;

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

/* ── 서울 기준 '오늘' ─────────────────────────────────────────────────────── */

const seoulParts = new Intl.DateTimeFormat('ko-KR', {
  timeZone: SEOUL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * 서울 기준 달력 날짜 'YYYY-MM-DD'.
 * formatToParts 로 조립한다 — 로케일이 붙이는 구분자('2026. 07. 16.')에 의존하지 않는다.
 */
export function toSeoulDate(value: Date): string {
  const parts = seoulParts.formatToParts(value);
  const pick = (type: 'year' | 'month' | 'day'): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

/* ── 달력 날짜 산술 ──────────────────────────────────────────────────────── */

/** 'YYYY-MM-DD' → UTC 자정 ms. 파싱 불가면 NaN */
function toDayMs(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) return Number.NaN;
  const [, year, month, day] = match;
  if (year === undefined || month === undefined || day === undefined) return Number.NaN;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

function fromDayMs(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getUTCFullYear())}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** 달력 날짜인가 — 존재하지 않는 날짜('2026-02-31')는 false */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const ms = toDayMs(value);
  return !Number.isNaN(ms) && fromDayMs(ms) === value;
}

export function addDays(iso: string, days: number): string {
  return fromDayMs(toDayMs(iso) + days * DAY_MS);
}

/** 두 날짜 사이의 일수 — 같은 날이면 0 */
export function daysBetween(start: string, end: string): number {
  return Math.round((toDayMs(end) - toDayMs(start)) / DAY_MS);
}

/** 기간에 포함된 날 수 — 시작·종료 포함이므로 최소 1 */
export function periodLength(period: StatsPeriod): number {
  return daysBetween(period.start, period.end) + 1;
}

/** 기간의 모든 날짜 — 차트 x축·표 행의 원천 */
export function eachDay(period: StatsPeriod): readonly string[] {
  const days: string[] = [];
  for (let index = 0; index < periodLength(period); index += 1) {
    days.push(addDays(period.start, index));
  }
  return days;
}

function addMonths(iso: string, months: number): string {
  const ms = toDayMs(iso);
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  // 말일 보정 — 1/31 의 한 달 전은 12/31 이지 3/03 이 아니다
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return fromDayMs(Date.UTC(year, month, Math.min(day, lastDay)));
}

function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function endOfMonth(iso: string): string {
  const ms = toDayMs(iso);
  const date = new Date(ms);
  return fromDayMs(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
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
    resolve: (today) => ({ start: addDays(today, -1), end: addDays(today, -1) }),
  },
  // '최근 7일'은 오늘을 포함한 7일이다 (오늘 -6 ~ 오늘) — 업계 관례.
  {
    id: 'last7',
    label: '최근 7일',
    resolve: (today) => ({ start: addDays(today, -6), end: today }),
  },
  {
    id: 'last30',
    label: '최근 30일',
    resolve: (today) => ({ start: addDays(today, -29), end: today }),
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
  return { start: addDays(period.start, -length), end: addDays(period.start, -1) };
}

/* ── 검증 ───────────────────────────────────────────────────────────────── */

/** 종료일 < 시작일이면 조용한 empty 대신 이 문구를 띄운다 (COMP-11) */
const PERIOD_ORDER_ERROR = '종료일은 시작일보다 빠를 수 없습니다.';

export function periodErrorOf(period: StatsPeriod): string {
  if (!isCalendarDate(period.start) || !isCalendarDate(period.end)) {
    return '날짜 형식이 올바르지 않습니다.';
  }
  return daysBetween(period.start, period.end) < 0 ? PERIOD_ORDER_ERROR : '';
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
