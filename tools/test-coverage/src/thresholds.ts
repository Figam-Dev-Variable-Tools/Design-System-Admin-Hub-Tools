/**
 * 임계값 · 판정 어휘 — 원천은 레지스트리(테스트 커버리지 blockCondition)과
 * skills/test-coverage-guard/SKILL.md 의 측정 기준 표다.
 *
 * **도구가 임의로 바꾸지 않는다.** 미달이 많다고 하한을 내리는 것은 아키텍처의 ADR 사안이다
 * (SKILL: "기준치 임의 변경 금지 — 하한의 원천은 레지스트리 blockCondition 과 아키텍처의 ADR").
 *
 * severity 규약:
 *   blocker — 1건이라도 있으면 exit 1 (G5·G6 BLOCKED)
 *   major   — 경고. exit 0 이지만 리포트에 남고 리뷰(스토리북 리뷰/코드 리뷰)의 evidence 가 된다
 */

export type Severity = 'blocker' | 'major';

export interface AxisSpec {
  /** 축 번호 — SKILL 측정 기준 표의 행 번호와 일치 */
  axis: number;
  id: string;
  title: string;
  severity: Severity;
  /** 사람이 읽는 임계값 표현 — 리포트에 그대로 실린다 */
  threshold: string;
  /** 이 축이 차단하는 게이트 */
  gates: string[];
}

/* ── 축 정의 (SKILL 측정 기준 표) ──────────────────────────────────────────── */

/**
 * 축 1 (임무의 축 C) — 테스트 존재. `--passWithNoTests` 에 대한 답이다.
 *
 * **스코프별로 독립 판정한다** (오케스트레이터/아키텍처 판정 1). 전역 카운트는 구멍이었다 —
 * `packages/ui` 의 초록이 `apps/admin` 의 0건을 가렸다. 스코프 목록은 하드코딩하지 않고
 * `pnpm-workspace.yaml` 에서 파생한다 (lib/workspace.ts).
 */
export const EXISTENCE: AxisSpec = {
  axis: 1,
  id: 'test-existence',
  title: '테스트 존재 (워크스페이스 스코프별 · 단언을 가진 실행 단위)',
  severity: 'blocker',
  threshold: '스코프마다 >= 1건',
  gates: ['G5', 'G6'],
};

/** 축 2 (임무의 축 A-1) — 계약 states 전수 렌더 검증 */
export const CONTRACT_STATES: AxisSpec = {
  axis: 2,
  id: 'contract-states',
  title: '계약 states 커버리지 (contracts/*.contract.json → states[])',
  severity: 'blocker',
  threshold: '미커버 상태 0건 (전수)',
  gates: ['G5', 'G6'],
};

/** 축 3 (임무의 축 A-2) — 계약 events.blockedWhen. 계약이 명시한 **금지 동작**이다. */
export const CONTRACT_BLOCKED_WHEN: AxisSpec = {
  axis: 3,
  id: 'contract-blocked-when',
  title: '계약 events.blockedWhen 커버리지 (금지 동작의 비발생 단언)',
  severity: 'blocker',
  threshold: '미커버 차단 조건 0건 (전수)',
  gates: ['G5', 'G6'],
};

/**
 * 축 4 (임무의 축 B) — FS 예외 7축 격자. E2E 테스트가 채워나가는 중일 수 있으므로 major.
 *
 * **단, 래칫(후퇴 금지)이 걸려 있다** (오케스트레이터/아키텍처 판정 2): 커버 칸 수가 직전 리포트보다
 * **줄어들면 blocker**. 새 테스트를 요구하지는 않되 **있던 커버리지를 잃는 것은 차단**한다.
 * (713칸 미커버 상태에서 blocker 로 승격하면 리포가 무기한 RED 가 되고,
 *  **상시 RED 는 상시 GREEN 만큼 무용하다** — 사람이 게이트를 우회하기 시작한다.)
 */
export const FS_EXCEPTIONS: AxisSpec = {
  axis: 4,
  id: 'fs-exception-axes',
  title: 'FS 예외 7축 커버리지 (요소 × 축 격자 — 동작이 정의된 칸만 · 래칫)',
  severity: 'major',
  threshold: '미커버 칸 0건 (major) · **커버 칸 수 후퇴 = blocker**',
  gates: ['G6'],
};

/**
 * 축 5 — 검증 도구 자체의 골든 픽스처.
 *
 * ⚠ SKILL 측정 기준 표는 이 축을 **blocker(G5·G6)** 로 적었으나, 레지스트리 테스트 커버리지의
 * `blockCondition` 은 "테스트 0건 또는 커버리지 하한 미달 — 계약의 states/events,
 * FS의 예외 7축" 만 열거하고 골든 픽스처를 포함하지 않는다.
 *
 * SKILL 자신이 "하한의 원천은 **레지스트리 blockCondition**과 아키텍처의 ADR" 이라고 명령하므로
 * 도구는 레지스트리를 따라 **major** 로 측정한다. 이 불일치는 도구가 임의로 해소하지 않고
 * 리포트의 REGISTRY-SKILL DISCREPANCY 절에 남겨 **아키텍처의 판정**을 요청한다.
 * (도구가 스스로 blocker 를 발명하는 것도, SKILL 요구를 조용히 버리는 것도 금지다.)
 */
export const TOOL_FIXTURES: AxisSpec = {
  axis: 5,
  id: 'tool-golden-fixtures',
  title: '검증 도구의 골든 픽스처 (codegen · contract-test)',
  severity: 'major',
  threshold: '도구당 골든 픽스처 >= 1건',
  gates: ['G5', 'G6'],
};

export const AXES: AxisSpec[] = [
  EXISTENCE,
  CONTRACT_STATES,
  CONTRACT_BLOCKED_WHEN,
  FS_EXCEPTIONS,
  TOOL_FIXTURES,
];

/* ── 스캔 범위 ────────────────────────────────────────────────────────────── */

/** 원천 — 이것들이 전부 없으면 **측정 불가 → exit 2**. 측정 불가는 통과가 아니다. */
export const CONTRACTS_DIR = 'contracts';
export const SPECS_DIR = 'specs';

/** 테스트가 존재할 수 있는 경로 (소유자: 컴포넌트 엔지니어 · 프론트 구현 · E2E 테스트) */
export const TEST_ROOTS = ['apps', 'packages', 'e2e'];

/** 단위·렌더 테스트 파일 */
export const TEST_FILE_SUFFIXES = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];

/** Storybook 스토리 — play function 은 테스트로 인정한다 (단, 단언이 있을 때만. 아래 참조) */
export const STORY_FILE_SUFFIXES = ['.stories.tsx', '.stories.ts'];

/** 축 5 — 골든 픽스처를 가져야 하는 검증 도구 (SKILL 축 5: "검증기를 검증한다") */
export const FIXTURE_REQUIRED_TOOLS = ['tools/codegen', 'tools/contract-test'];

/* ── 단언 판정 어휘 — 이 도구의 심장 ──────────────────────────────────────── */

/**
 * **단언이 없는 실행 단위는 테스트가 아니다.**
 *
 * `--passWithNoTests` 가 공집합 위에서 참인 것과 정확히 같은 이유로,
 * `expect` 가 없는 play function 은 **실패할 수 없다**. 실패할 수 없는 것은 검증하지 않는다.
 * 그런 단위는 테스트로 세지 않고 `assertionFree` 로 따로 집계해 리포트에 드러낸다.
 *
 * (실측 근거: `packages/ui/src/**\/*.stories.tsx` 에 play function 65개 · `expect` 0개.
 *  전부 userEvent.hover/tab/pointer 로 **상태를 만들기만** 하고 아무것도 단언하지 않는다.
 *  G5 exit "Play Function으로 events.blockedWhen 전수 검증" 이 이 65개의 초록불로 통과돼 왔다.)
 */
export const ASSERTION_PATTERNS: RegExp[] = [
  /\bexpect\s*\(/,
  /\bassert\s*[.(]/,
  /\.toHaveBeenCalled/,
  /\btoMatchSnapshot\s*\(/,
];

/**
 * **금지 동작(blockedWhen)의 검증은 비발생 단언을 요구한다.**
 *
 * "loading 중에 onClick 이 발화하지 않는다" 를 증명하려면 콜백을 **관찰**해야 한다 —
 * 스파이(`fn()`)를 주입하고 `not.toHaveBeenCalled()` 로 **비발생**을 단언해야 한다.
 * 버튼이 disabled 로 **렌더된다**는 단언은 onClick 이 발화하지 않음을 증명하지 못한다
 * (disabled 속성 없이 CSS 로만 흐리게 처리해도 그 단언은 통과한다).
 */
export const NON_INVOCATION_PATTERNS: RegExp[] = [
  /not\s*\.\s*toHaveBeenCalled/,
  /toHaveBeenCalledTimes\s*\(\s*0\s*\)/,
  /not\s*\.\s*toHaveBeenCalledWith/,
  /\.mock\.calls\s*\)\s*\.\s*toHaveLength\s*\(\s*0\s*\)/,
];

/** 스파이 생성 — 비발생을 관찰할 수단이 코드에 존재하는가 */
export const SPY_PATTERNS: RegExp[] = [
  /\bfn\s*\(\s*\)/,
  /\bvi\s*\.\s*fn\s*\(/,
  /\bjest\s*\.\s*fn\s*\(/,
];

/* ── FS 예외 7축 ──────────────────────────────────────────────────────────── */

export interface ExceptionAxis {
  /** FS §4 표의 헤더 문자열 (정본) */
  header: string;
  /** 테스트 이름에서 이 축을 지목하는 토큰 (E2E 테스트 명명 규칙: `FS-003-EL-042: 권한없음 — …`) */
  aliases: string[];
}

/** 순서가 곧 FS §4 표의 열 순서다 — 표 헤더와 대조해 검증한다 */
export const EXCEPTION_AXES: ExceptionAxis[] = [
  { header: '빈 상태', aliases: ['빈 상태', '빈상태', 'empty'] },
  { header: '로딩', aliases: ['로딩', 'loading'] },
  { header: '실패', aliases: ['실패', 'failure', 'error'] },
  { header: '유효성', aliases: ['유효성', 'validation'] },
  { header: '권한없음', aliases: ['권한없음', '권한 없음', 'forbidden', 'unauthorized'] },
  { header: '경합', aliases: ['경합', 'race', 'concurrent', '중복 제출', '동시'] },
  { header: '대량', aliases: ['대량', 'bulk', 'large'] },
];

/**
 * FS 예외 표에서 **동작이 정의되지 않은 칸**의 판정 규칙 (= 테스트 대상이 아닌 칸).
 *
 * 정적 표시 요소(라벨·아이콘·고정 문구)를 테스트하라고 요구하지 않기 위한 규칙이며,
 * **명세 자신이 쓴 문장으로만 판정한다** — 도구가 "이건 라벨 같다"고 추측하지 않는다.
 *
 *   1) 빈 칸 · `-` · `—`
 *   2) `N/A` 로 시작 (명세가 "이 축은 성립하지 않는다"고 사유와 함께 선언한 칸)
 *   3) 공통 규칙으로의 **순수 위임** — `§4.1 공통 규칙 적용` (뒤에 괄호 사유만 붙은 경우 포함).
 *      요소 고유의 동작이 한 글자도 없으므로 이 요소 × 축에 고유 테스트를 요구하지 않는다.
 *      반대로 `§4.1 공통 규칙 적용 — 두 항목 모두 항상 표시되며 비활성되지 않는다` 처럼
 *      **요소 고유의 단언이 덧붙은 칸은 동작이 정의된 칸**이다.
 *
 * 그 외 모든 칸은 **동작이 정의된 칸**이며 테스트 1건을 요구한다.
 * → **요소가 테스트 대상인가**의 판정도 여기서 파생된다: 7축 중 동작 칸이 1개 이상인 요소.
 */
export const NA_CELL = /^n\/a\b/i;
export const COMMON_RULE_DELEGATION_ONLY = /^§?\s*\d+(?:\.\d+)*\s*공통\s*규칙\s*적용\s*$/;
export const EMPTY_CELL = /^[-—–\s]*$/;
