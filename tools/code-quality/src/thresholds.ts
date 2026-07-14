/**
 * 임계값 — 원천은 orchestration/registry/agents.json(A83 blockCondition)과 ADR-0009 다.
 *
 * **도구가 임의로 바꾸지 않는다.** 위반이 많다고 임계값을 올리는 것은 A01의 ADR 사안이며,
 * A83은 임계값 완화 요청을 반려하고 구조 개선 ADR을 요청한다 (SKILL: "임계값 표류 감시").
 *
 * severity 규약:
 *   blocker — 1건이라도 있으면 exit 1 (PR 차단)
 *   major   — 경고. exit 0 이지만 리포트에 수치와 함께 남고 리뷰(A42)의 evidence 가 된다
 */

export type Severity = 'blocker' | 'major';

export interface AxisSpec {
  /** 축 번호 (1~6) — 리포트/ADR의 표 순서와 일치 */
  axis: number;
  id: string;
  title: string;
  severity: Severity;
  /** 사람이 읽는 임계값 표현 — 리포트에 그대로 실린다 */
  threshold: string;
}

/** 축 1 — 페이지 간 결합: pages/A 가 pages/B 를 import (side-effect CSS import 포함) */
export const PAGE_COUPLING: AxisSpec = {
  axis: 1,
  id: 'page-coupling',
  title: '페이지 간 결합 (pages/A → pages/B)',
  severity: 'blocker',
  threshold: '0건',
};

/** 축 2 — 도메인 누수: 공통 모듈이 도메인 타입/상수를 import */
export const DOMAIN_LEAK: AxisSpec = {
  axis: 2,
  id: 'domain-leak',
  title: '도메인 누수 (공통 모듈 → 도메인 타입/상수)',
  severity: 'blocker',
  threshold: '0건',
};

/** 축 3 — 중복 코드: 정규화 블록이 MIN_LINES 이상 · MIN_OCCURRENCES 회 이상 반복 */
export const DUPLICATION: AxisSpec = {
  axis: 3,
  id: 'duplication',
  title: '중복 코드 (정규화 블록 해시)',
  severity: 'major',
  threshold: '30줄 이상 블록이 2회 이상 반복 = 0건',
};
export const DUPLICATION_MIN_LINES = 30;
export const DUPLICATION_MIN_OCCURRENCES = 2;

/** 축 4 — 순환 복잡도: 함수당 분기 수 (if/for/while/case/&&/||/??/?:) + 1 */
export const COMPLEXITY: AxisSpec = {
  axis: 4,
  id: 'complexity',
  title: '순환 복잡도 (함수 단위 cyclomatic complexity)',
  severity: 'major',
  threshold: '함수당 <= 15',
};
export const COMPLEXITY_MAX = 15;

/** 축 5 — 죽은 코드: export 됐으나 어디서도 import 되지 않는 심볼 (배럴 재export 는 사용으로 세지 않는다) */
export const DEAD_CODE: AxisSpec = {
  axis: 5,
  id: 'dead-code',
  title: '죽은 코드 (미사용 export)',
  severity: 'major',
  threshold: '0건',
};

/** 축 6 — 레이어 역방향: packages/ui/src 의 atoms ← molecules ← organisms ← templates 방향 위배 */
export const LAYER_DIRECTION: AxisSpec = {
  axis: 6,
  id: 'layer-direction',
  title: '레이어 역방향 의존 (atoms → molecules/organisms/…)',
  severity: 'blocker',
  threshold: '0건',
};

export const AXES: AxisSpec[] = [
  PAGE_COUPLING,
  DOMAIN_LEAK,
  DUPLICATION,
  COMPLEXITY,
  DEAD_CODE,
  LAYER_DIRECTION,
];

/* ── 스캔 범위 ────────────────────────────────────────────────────────────── */

/** 측정 대상 루트 (리포 루트 기준 POSIX 상대경로) */
export const SCAN_ROOTS = ['apps/admin/src', 'packages/ui/src'];

/** 소스 확장자 — AST 파싱 대상 */
export const SOURCE_EXTENSIONS = ['.ts', '.tsx'];

/**
 * 측정 제외 — **사람이 쓴 코드가 아닌 것**. 기계가 만든 코드의 중복·죽은 export 를
 * 사람에게 청구하지 않는다 (생성물의 소유자는 계약/스키마이지 개발자가 아니다).
 *   - `*.d.ts`      선언 파일 (openapi:types 등 생성물 포함)
 *   - `generated/`  codegen 산출물 (계약·토큰에서 생성 — SSOT는 계약이다)
 */
export const EXCLUDE_PATTERNS: RegExp[] = [/\.d\.ts$/, /(^|\/)generated\//];

/** import 해석 대상 확장자 — CSS 는 side-effect import 결합 탐지에 필요하다 */
export const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.d.ts', '.css', '.json'];

/** 워크스페이스 alias — package.json 의 entry 와 일치해야 한다 */
export const WORKSPACE_ALIASES: Record<string, string> = {
  '@tds/ui': 'packages/ui/src/index.ts',
};

/* ── 축 2 도메인 어휘 ─────────────────────────────────────────────────────── */

/**
 * 공통 모듈 — 도메인을 몰라야 하는 경로.
 * (apps/admin/src/shared/ui/README.md 규칙 4: "여기 있는 컴포넌트는 도메인 로직을 모른다")
 */
export const COMMON_MODULE_ROOTS = ['apps/admin/src/shared/ui/', 'packages/ui/src/'];

/** 도메인 소스 — 공통 모듈이 여기서 import 하면 그 자체로 누수다 */
export const DOMAIN_SOURCE_PATTERNS: RegExp[] = [
  /^apps\/[^/]+\/src\/pages\//,
  /^apps\/[^/]+\/src\/shared\/domain\//,
  /^apps\/[^/]+\/src\/shared\/permissions\//,
  /^apps\/[^/]+\/src\/shared\/fixtures\//,
];

/**
 * 도메인 어휘 — 이 이름의 심볼을 공통 모듈이 import 하면 누수다 (경로와 무관).
 * 예: 공통 Badge 가 MemberTier / TIER_LABEL 을 import → 위반 (ADR-0006 맥락).
 * 도메인 값은 prop 으로 주입되어야 한다.
 */
export const DOMAIN_SYMBOL_PATTERNS: RegExp[] = [
  /^(Member|Admin|Role|Tier|Permission|Consent|Coupon)[A-Z0-9]?\w*$/,
  /^(MEMBER|ADMIN|ROLE|TIER|PERMISSION|CONSENT|COUPON)_\w+$/,
];

/* ── 축 6 레이어 순위 ─────────────────────────────────────────────────────── */

/** 의존은 낮은 순위 방향으로만 흐른다 (organisms → atoms 는 정상, atoms → organisms 는 위반) */
export const LAYER_RANK: Record<string, number> = {
  atoms: 0,
  molecules: 1,
  organisms: 2,
  templates: 3,
  pages: 4,
};
