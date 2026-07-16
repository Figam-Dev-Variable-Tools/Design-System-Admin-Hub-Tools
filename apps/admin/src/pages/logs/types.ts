// 로그 관리 4화면이 공유하는 타입·상수 (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 섹션의 성격 — 읽기 전용 감사(audit) 로그]
//
// **삭제 없음 · 수정 없음 · 행 ⋯ 메뉴 없음 · 체크박스 없음.**
//
//   · 감사 기록은 **불변**이어야 한다. 지울 수 있는 감사 로그는 감사 로그가 아니다 —
//     침입자가 가장 먼저 지우는 것이 자기 흔적이다. 그래서 이 파일에는 **쓰기 payload 타입이
//     하나도 없다.** 회원 관리의 `CreateGroupInput`·`PointAdjustInput` 에 해당하는 것이
//     여기에는 **존재하지 않으며, 없다는 것이 설계다.**
//   · 일괄 액션이 없으므로 **선택(체크박스)도 없다** (FS-003 검수에서 지적된 결함 — 반복하지 않는다).
//
// 이 섹션이 하는 일은 **조회 · 필터 · 검색 · 정렬 · 상세 열람 · 내보내기** 여섯뿐이다.
// 정본은 로그인 이력(pages/login-history) 이며, 그 불변성 패턴을 그대로 따른다.
//
// [왜 사본인가 — 페이지 간 결합 금지]
// 기간 계산·검증은 로그인 이력에도 있지만 `pages/login-history` 를 import 하지 않는다.
// 페이지가 페이지를 import 하면 '재사용'이 아니라 **결합**이다 (code-quality 축1 blocker:
// login-history 를 지우면 logs 가 죽는다). 승격 위치는 `shared/**` 이나 그곳은 이번 배치의
// 소유가 아니다 — 보고서에 승격 후보로 남긴다.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';

/* ── 로그 항목의 공통 골격 ───────────────────────────────────────────────── */

/**
 * 4화면의 로그가 공유하는 최소 골격.
 * `occurredAtIso` 는 **오프셋을 가진 ISO 문자열**이다 (예: '2026-07-14T02:31:00Z').
 * 표시는 언제나 KST 로 환산한다 — 근거와 규칙은 ./time.ts (ERP-09).
 */
export interface LogEntryBase {
  readonly id: string;
  readonly occurredAtIso: string;
}

/** 행 강조 톤 — 색만으로 전달하지 않는다 (아이콘 + 글자가 함께 간다) */
export type LogTone = 'neutral' | 'danger' | 'warning';

/* ── 좌측 필터 축 ────────────────────────────────────────────────────────── */

/** 필터 한 칸 — id 는 URL 쿼리에 그대로 실린다 (IA-13) */
interface LogFilterOption {
  readonly id: string;
  readonly label: string;
}

/**
 * 필터 축 하나 (예: '결과' · '액션 종류').
 * 화면마다 축의 **개수와 어휘만** 다르고 구조는 같다 — 그래서 셸이 이것만 받는다.
 */
export interface LogFilterAxis {
  /** URL 쿼리 파라미터 이름 */
  readonly key: string;
  readonly heading: string;
  readonly ariaLabel: string;
  readonly options: readonly LogFilterOption[];
}

/** 모든 축이 갖는 기본값 — '전체' */
export const ALL_FILTER = 'all';

/** 축의 배지 숫자 — optionId → 건수. 아직 안 불러왔으면 null */
export type LogAxisCounts = Readonly<Record<string, number>>;

/* ── 기간 ────────────────────────────────────────────────────────────────── */

/** 기간 프리셋. 'custom' 만 사용자 입력(직접 지정)을 받는다 */
export type PeriodId = 'today' | 'last-7d' | 'last-30d' | 'custom';

export const PERIOD_FILTERS: readonly LogFilterOption[] = [
  { id: 'today', label: '오늘' },
  { id: 'last-7d', label: '최근 7일' },
  { id: 'last-30d', label: '최근 30일' },
  { id: 'custom', label: '직접 지정' },
];

/**
 * 프리셋이 덮는 날짜 수 — **오늘을 포함한다.**
 * '최근 7일' = 오늘 + 앞선 6일. (6일이 아니라 7일로 읽히도록 여기서 한 번만 정의한다.)
 */
export const PERIOD_DAYS: Record<Exclude<PeriodId, 'custom'>, number> = {
  today: 1,
  'last-7d': 7,
  'last-30d': 30,
};

/** 직접 지정으로 조회할 수 있는 최대 기간 — 그 이상은 내보내기로 받는다 */
export const MAX_RANGE_DAYS = 90;

/** 조회 구간 — 양 끝 포함. 'YYYY-MM-DD' (KST 기준 달력일) */
export interface DateRange {
  readonly from: string;
  readonly to: string;
}

/** 처음 열었을 때의 기간 — 최근 30일. 오늘만 보면 어제 새벽의 사건을 놓친다 */
export const DEFAULT_PERIOD: PeriodId = 'last-30d';

export function isPeriodId(value: string): value is PeriodId {
  return PERIOD_FILTERS.some((option) => option.id === value);
}

/* ── 정렬 (ERP-04) ───────────────────────────────────────────────────────── */

type SortDirection = 'asc' | 'desc';

export interface SortState {
  /** 정렬 기준 컬럼의 id */
  readonly key: string;
  readonly direction: SortDirection;
}

export function isSortDirection(value: string): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

/**
 * 감사 로그의 기본 정렬 — **언제나 최신순**이다.
 * 감사 화면에서 먼저 보아야 하는 것은 방금 일어난 일이다.
 */
export const TIME_COLUMN = 'occurredAt';
export const DEFAULT_SORT: SortState = { key: TIME_COLUMN, direction: 'desc' };

/* ── 표 컬럼 ─────────────────────────────────────────────────────────────── */

/** 정렬 비교에 쓰는 값 — 문자열은 사전순, 숫자는 수의 크기순 */
export type SortValue = string | number;

/**
 * 정렬 키 → 비교값 추출기.
 *
 * **컬럼(UI)이 아니라 데이터가 소유한다.** 정렬은 페이지네이션보다 먼저 일어나야 하고
 * (10페이지 중 1페이지만 정렬하면 그것은 정렬이 아니다), 페이지네이션은 어댑터의 일이다.
 * 그래서 어댑터가 부를 수 있는 자리에 둔다 — 컬럼에 달면 데이터 계층이 React 를 import 하게 된다.
 *
 * 키는 `LogColumn.id` 와 같다: 여기 항목이 있는 컬럼이 곧 정렬 가능한 컬럼이다 (ERP-04).
 * 백엔드가 붙으면 이 맵은 사라지고 `sort=&dir=` 이 서버로 간다.
 */
export type SortValues<E extends LogEntryBase> = Readonly<Record<string, (entry: E) => SortValue>>;

export interface LogColumn<E extends LogEntryBase> {
  /** React key 이자 **정렬 키** — SortValues 에 같은 id 가 있으면 그 컬럼은 정렬된다 */
  readonly id: string;
  readonly label: string;
  /** 숫자 컬럼 — 우측 정렬 + tabular-nums (ERP-04) */
  readonly numeric?: boolean;
  /** 좁은 화면에서 줄바꿈하지 않을 컬럼 (시각·IP 등) */
  readonly nowrap?: boolean;
  readonly render: (entry: E) => ReactNode;
}

/* ── 상세 (페이로드 뷰) ──────────────────────────────────────────────────── */

interface LogDetailField {
  readonly label: string;
  readonly value: ReactNode;
}

/**
 * 한 건의 상세 — 읽기 전용이다. **저장 버튼이 없다.**
 *
 * `payload` 는 **날것 그대로** 담는다. 마스킹은 화면에 그리는 순간 masking.ts 가 한다 —
 * 여기서 미리 가리면 화면마다 '가렸는지' 를 기억해야 하고, 한 곳만 잊으면 그것이 유출이다.
 */
export interface LogDetail {
  readonly title: string;
  readonly fields: readonly LogDetailField[];
  /** 요청/응답 본문·변경 전후·스택 등 — 없으면 null (지어내지 않는다) */
  readonly payload: unknown;
  readonly payloadLabel: string;
}

/* ── 페이지네이션 (ERP-05 · ERP-15) ──────────────────────────────────────── */

/**
 * 한 페이지에 담을 수 있는 행 수 — 운영자가 고른다 (ERP-05 page-size selector).
 *
 * **상한이 100 인 것은 타협이 아니라 계약이다** (ERP-15 대형 list 렌더 계약).
 * 가상화(virtualization) 없이 1,000행을 DOM 에 그리면 저사양 사무 PC 에서 스크롤과
 * 선택이 끊긴다. 그래서 **effective page size 를 캡한다** — 1,000행을 보고 싶으면
 * 내보내기(CSV)로 받는다. 그것이 엑셀에서 훨씬 잘 하는 일이다.
 */
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 20;

/**
 * URL 의 size 값이 우리가 허용한 크기인가.
 *
 * **이 함수가 곧 렌더 캡이다** (ERP-15). 주소창에 `?size=5000` 을 쳐도 목록은 20줄로 떨어진다 —
 * 캡을 별도 상수로 두면 목록과 상수가 따로 놀 수 있지만, 허용 목록 자체가 판정이면 어긋날 수 없다.
 */
export function isPageSize(value: number): value is PageSize {
  return PAGE_SIZE_OPTIONS.some((size) => size === value);
}

/* ── 조회 ────────────────────────────────────────────────────────────────── */

/**
 * 어댑터에 닿는 조회 조건 — 화면이 이미 해석을 끝낸 **확정값**이다.
 * (프리셋이든 직접 지정이든 여기 올 때는 구간이 정해져 있다.)
 */
export interface LogQuery {
  readonly range: DateRange;
  /** 축 key → 선택된 optionId ('all' 포함) */
  readonly axes: Readonly<Record<string, string>>;
  readonly keyword: string;
  readonly sort: SortState;
  readonly page: number;
  readonly pageSize: PageSize;
}

export interface LogResult<E extends LogEntryBase> {
  readonly entries: readonly E[];
  /** 좌측 필터의 배지 숫자 — 축 key → (optionId → 건수) */
  readonly axisCounts: Readonly<Record<string, LogAxisCounts>>;
  /** 필터·검색까지 전부 적용한 뒤의 건수 (페이지네이션용) */
  readonly total: number;
}

/* ── 화면 정의 ───────────────────────────────────────────────────────────── */

/**
 * 한 화면(관리자 로그 · 회원 활동 로그 · API 로그 · 오류 로그)의 **전부**.
 *
 * [왜 이런 모양인가] 4화면은 축의 어휘와 컬럼만 다르고 나머지(URL 상태·IME 검색·정렬·
 * 페이지네이션·빈 상태·에러·권한·내보내기·상세)가 전부 같다. 그 '같은 것'을 4벌 쓰면
 * 4개 화면이 조금씩 다르게 동작하고, 그 차이는 아무도 의도하지 않는다 (IA-04 — 목록은 한 템플릿).
 * 그래서 **다른 것만 여기 적고** 같은 것은 LogListShell 이 한 벌만 갖는다.
 */
export interface LogScreenSpec<E extends LogEntryBase> {
  /** 캐시 키 · 개발용 실패 스위치의 스코프 ('logs-admin') */
  readonly scope: string;
  /** 권한 리소스를 여는 열쇠 — nav-config 의 잎 경로와 같아야 한다 ('/logs/admin') */
  readonly route: string;
  /** 빈 상태·토스트가 쓰는 이름 ('관리자 로그') */
  readonly entityLabel: string;
  readonly retention: RetentionPolicy;
  readonly axes: readonly LogFilterAxis[];
  readonly columns: readonly LogColumn<E>[];
  readonly sortValues: SortValues<E>;
  /** 표의 시각적으로 숨긴 caption — 이 표가 무엇이고 무엇을 할 수 없는지 */
  readonly caption: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly toneOf: (entry: E) => LogTone;
  readonly detailOf: (entry: E) => LogDetail;
  /** 내려받는 파일 이름의 앞부분 ('admin-log') */
  readonly csvBaseName: string;
  readonly toCsv: (entries: readonly E[]) => string;
  readonly fetchPage: (query: LogQuery, signal: AbortSignal) => Promise<LogResult<E>>;
  readonly fetchExport: (query: LogQuery, signal: AbortSignal) => Promise<readonly E[]>;
  /**
   * 요약 줄의 **경고 한 줄** — '이 기간의 실패 12건' 처럼 그냥 지나치면 안 되는 수.
   * 없으면 null 을 돌려준다.
   */
  readonly highlightOf: (result: LogResult<E>) => string | null;
}

/* ── 보존기간 ────────────────────────────────────────────────────────────── */

/**
 * 로그 종류마다 보존기간이 다르다 — 법정 의무와 데이터 부피가 다르기 때문이다.
 * 화면에 **반드시 표시한다**: '없는 것'과 '보존기간이 지나 폐기된 것'은 다른 사건이고,
 * 운영자가 그 차이를 모르면 지워진 기록을 찾아 헤맨다.
 */
export interface RetentionPolicy {
  /** 사람이 읽는 기간 ('3년') */
  readonly label: string;
  /** 왜 그 기간인지 — 근거가 없으면 임의의 숫자로 읽힌다 */
  readonly basis: string;
}
