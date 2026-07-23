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
 * 축 4 (임무의 축 B) — FSD §7 예외 처리 격자. E2E 테스트가 채워나가는 중일 수 있으므로 major.
 *
 * **단, 래칫(후퇴 금지)이 걸려 있다** (오케스트레이터/아키텍처 판정 2): 커버 칸 수가 직전 리포트보다
 * **줄어들면 blocker**. 새 테스트를 요구하지는 않되 **있던 커버리지를 잃는 것은 차단**한다.
 * (수천 칸 미커버 상태에서 blocker 로 승격하면 리포가 무기한 RED 가 되고,
 *  **상시 RED 는 상시 GREEN 만큼 무용하다** — 사람이 게이트를 우회하기 시작한다.)
 */
export const FS_EXCEPTIONS: AxisSpec = {
  axis: 4,
  id: 'fs-exception-axes',
  title: 'FSD §7 예외 처리 커버리지 (화면 ID × 예외 상황 격자 — 동작이 정의된 칸만 · 래칫)',
  severity: 'major',
  threshold: '미커버 칸 0건 (major) · **커버 칸 수 후퇴 = blocker**',
  gates: ['G6'],
};

/**
 * **래칫 단위 표식** — 이 문자열이 바뀌면 기준선은 비교 불가가 되어 재수립된다.
 *
 * 왜 필요한가: 축 4의 커버 칸 수는 *무엇을 세는가*가 바뀌면 옛 수와 **비교할 수 없다.**
 * 옛 단위(`el-x-axis/v1`)는 삭제된 `specs/` 의 `FS-nnn.md §4` 에서 (요소 × 7축) 칸을 셌고 기준선이 137이었다.
 * 새 단위는 `docs/FSD/**` 의 (화면 ID × §7 예외 상황) 칸을 센다 — 137 과 새 수를 크기 비교하면
 * 그것은 **서로 다른 자를 대는 것**이다. 그래서 단위가 다르면 후퇴 판정을 하지 않고,
 * 대신 재수립 사실을 major 로 신고해 사람이 보게 만든다. (조용한 리셋은 세탁이다.)
 */
export const RATCHET_UNIT = 'fsd-screen-x-situation/v1';

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

/**
 * 원천 — 이것들이 전부 없으면 **측정 불가 → exit 2**. 측정 불가는 통과가 아니다.
 *
 * `SPECS_DIR` 는 2026-07 재작성으로 `specs/` → `docs/FSD/` 로 옮겨졌다. 옛 `specs/**` 218건은
 * 삭제됐고 되살리지 않는다(`docs/FSD/plan.md` §4). 양식도 통째로 바뀌었다 — 파서는 `lib/specs.ts`.
 */
export const CONTRACTS_DIR = 'contracts';
export const SPECS_DIR = 'docs/FSD';

/**
 * FSD 디렉터리 안의 **화면 문서가 아닌 파일** — 규약·목록·계획 문서다.
 * 파일명으로 거른다(경로가 아니라): 하위 폴더가 늘어도 규칙이 흔들리지 않는다.
 */
export const SPEC_NON_SCREEN_FILES = [
  '_template.md',
  'inventory.md',
  'plan.md',
  'README.md',
  'id-convention.md',
];

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

/* ── FSD §7 예외 상황 (옛 '예외 7축' 의 후신) ─────────────────────────────── */

/**
 * **왜 §7 인가 — 대조 단위를 다시 고른 근거.**
 *
 * 옛 양식(`specs/**`)의 격자는 (요소 `FS-nnn-EL-nnn` × 예외 7축)이었다. 새 양식(`docs/FSD/**`)에는
 * 요소 좌표가 없다 — §3 은 `No` 열(1,2,3…)이라 문서 안에서만 유효하고 행이 하나 늘면 어긋난다.
 * 그래서 **좌표를 다시 정해야** 했고, 후보는 넷이었다.
 *
 * | 후보 | 왜 아닌가 / 왜인가 |
 * |---|---|
 * | §3 UI 컴포넌트 `No` + 화면 ID | `No` 가 **안정 식별자가 아니다**(행 삽입으로 밀린다). 게다가 §3 은 정적 라벨까지 전수 나열하므로, 옛 도구가 §3 을 일부러 피하고 §4 예외표를 쓴 이유가 그대로 되살아난다 — 라벨에 렌더 테스트를 붙이는 것은 커버리지가 아니라 소음이다 |
 * | §4 기능 명세의 기능명 | 기능명은 자유 문장이라 리워딩 한 번에 대조가 끊긴다. 번호(`§4.2`)로 가리키는 것은 [ID 규약](../../../docs/FSD/id-convention.md) §6 이 **명시적으로 금지**한다("절 번호로 남의 문서를 가리키지 않는다 — 절이 하나 늘면 조용히 틀린다") |
 * | §8 화면 상태 | 대부분이 **정상 경로**(데이터 있음 등)다. 레지스트리 `blockCondition` 이 축 4에 인가한 것은 "FS의 **예외**" 이며, 상태 전수 렌더는 축 2(계약 states)가 이미 잰다. 여기에 §8 을 얹으면 도구가 인가받지 않은 범위를 스스로 넓히는 것이 된다 |
 * | **§7 예외 처리** ✅ | 새 양식에서 **오직 예외 경로만** 담은 절이다. 12상황이 **템플릿으로 고정**돼 있고, 성립하지 않으면 `해당 없음 — 〈사유〉` 를 **적도록 강제**된다("행을 지우지 않는다 — 빈 행은 '요구가 없다' 와 '아직 안 봤다' 를 구분하지 못한다"). 이 규율은 옛 §4 의 `N/A — 사유` 규율과 **같은 모양**이라, "명세 자신의 문장으로 테스트 대상을 판정한다"는 이 도구의 심장을 그대로 옮길 수 있다 |
 *
 * → **대조 단위 = (화면 ID, 예외 상황).** 둘 다 **바뀌지 않기로 못박힌 이름**이다:
 *   화면 ID 는 라우트 경로에서 나오고(ID 규약 §2 "화면이 늘거나 줄어도 다른 화면의 ID 는 하나도
 *   바뀌지 않는다"), 상황 12개는 템플릿이 고정한 **닫힌 어휘**다. 테스트 이름과 명세가 서로를
 *   가리키려면 양쪽 다 안 바뀌는 이름이어야 한다 — 그것이 이 선택의 유일한 이유다.
 *
 * **옛 7축 중 새 §7 에 자리가 없는 것 3개** — 이 도구는 그 상실을 숨기지 않는다:
 *   `로딩`·`유효성`(각각 §8 화면 상태 · §6 Validation 으로 옮겨 갔다) · `대량`(새 양식에 자리 없음).
 *   리포트의 자기 감사에 남긴다.
 */
export interface ExceptionSituation {
  /** FSD §7 표 '발생 상황' 열의 정본 문자열 (템플릿 순서 = 이 배열 순서) */
  header: string;
  /** 명세의 행 라벨 · 테스트 이름에서 이 상황을 지목하는 토큰 */
  aliases: string[];
}

/**
 * 순서가 곧 FSD `_template.md` §7 표의 행 순서다.
 *
 * alias 는 **좁게** 둔다. `실패`·`오류`·`중복` 같은 조각을 넣으면 무관한 테스트 이름이 우연히
 * 걸려 **거짓 양성**(검증한 적 없는 칸이 커버로 세어짐)이 된다 — 그것이 이 도구가 막으려는 것과
 * 정확히 같은 종류의 거짓말이다.
 */
export const EXCEPTION_SITUATIONS: ExceptionSituation[] = [
  { header: '조회 결과 없음', aliases: ['조회 결과 없음', '조회결과 없음', '빈 상태'] },
  { header: '저장 실패', aliases: ['저장 실패'] },
  { header: '수정 실패', aliases: ['수정 실패'] },
  { header: '삭제 실패', aliases: ['삭제 실패'] },
  { header: 'API 오류', aliases: ['api 오류'] },
  { header: '서버 오류', aliases: ['서버 오류'] },
  { header: '네트워크 오류', aliases: ['네트워크 오류'] },
  { header: '권한 없음', aliases: ['권한 없음', '권한없음'] },
  { header: '세션 만료', aliases: ['세션 만료'] },
  { header: '데이터 충돌', aliases: ['데이터 충돌'] },
  { header: '중복 데이터', aliases: ['중복 데이터'] },
  { header: '파일 업로드 실패', aliases: ['파일 업로드 실패'] },
];

/** §7 표의 정본 헤더 — 이 헤더를 가진 표만 예외 격자로 읽는다 (§7 안의 보조 표를 섞지 않는다) */
export const EXCEPTION_TABLE_HEADER = ['발생 상황', '사용자 메시지', '시스템 처리', '복구 방법'];

/** 한 행이 여러 상황을 겹쳐 적을 때의 구분자 — `저장 실패 · 수정 실패 · 삭제 실패` */
export const SITUATION_SEPARATOR = /\s*[·،]\s*/;

/**
 * FSD §7 표에서 **동작이 정의되지 않은 칸**의 판정 규칙 (= 테스트 대상이 아닌 칸).
 *
 * 화면에서 성립하지 않는 상황을 테스트하라고 요구하지 않기 위한 규칙이며,
 * **명세 자신이 쓴 문장으로만 판정한다** — 도구가 "이건 안 쓰는 기능 같다"고 추측하지 않는다.
 *
 *   1) 빈 칸 · `-` · `—`
 *   2) `해당 없음` 으로 시작 (템플릿이 강제한 선언: "성립하지 않으면 `해당 없음 — 〈사유〉` 를 쓴다")
 *      옛 양식의 `N/A — 사유` 도 계속 인식한다 — 판정 규칙은 같고 표기만 바뀌었다.
 *   3) 다른 문서로의 **순수 위임** — 링크 하나뿐이고 이 화면 고유의 문장이 한 글자도 없는 칸.
 *      (`[공통 규약](../_common/index.md)` 처럼). 위임 뒤에 고유 단언이 붙으면 동작 칸이다.
 *
 * 그 외 모든 칸은 **동작이 정의된 칸**이며 테스트 1건을 요구한다.
 */
export const NA_CELL = /^(?:n\/a\b|해당\s*없음)/i;
export const DELEGATION_ONLY =
  /^(?:\[[^\]]+\]\([^)]+\)|[^\s]+\.md|(?:SCR|POP|TAB|DLG|MSG)-[A-Z0-9-]+)(?:\s*(?:을|를|의)?\s*(?:따른다|참조|참조한다|같다))?\s*$/;
export const EMPTY_CELL = /^[-—–\s]*$/;

/**
 * 반복 부호 — `〃` 한 글자짜리 칸은 **윗행과 같다**는 뜻이다(실제 문서에서 흔하다).
 * 빈 칸으로 세면 '동작이 정의된 칸'을 잃고, 동작 칸으로 세면 윗행이 `해당 없음` 일 때 헛칸이 생긴다.
 * 그래서 **윗행의 판정을 그대로 물려받는다** — 문서가 쓴 뜻 그대로.
 */
export const DITTO_CELL = /^[〃"″”]+$/;
