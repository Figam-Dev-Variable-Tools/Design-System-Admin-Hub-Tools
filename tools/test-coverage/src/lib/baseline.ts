/**
 * 축 4 래칫(ratchet) — **후퇴 금지 장치** (오케스트레이터/아키텍처 판정 2).
 *
 * 축 4(FS 예외 7축)는 major 로 유지한다. 713칸 미커버 상태에서 blocker 로 승격하면
 * 리포 전체가 무기한 RED 가 되고, **상시 RED 는 상시 GREEN 만큼 무용하다** — 사람이 게이트를
 * 우회하기 시작한다. 그러나 major 로만 두면 아무도 채우지 않는다.
 *
 * 그래서 **새 테스트를 요구하지는 않되, 있던 커버리지를 잃는 것은 차단한다.**
 *   커버 칸 수 < 직전 리포트의 커버 칸 수  →  **blocker**
 * 713칸은 0에서 시작해 **단조 증가만** 한다. 채우는 속도는 조직의 속도지 게이트의 문제가 아니다.
 *
 * **기준선 파일이 없으면(최초 실행) 기준선 0으로 시작한다.**
 * 이것은 `exit 2`(측정 불가) 사유가 **아니다** — 원천(계약·FS)이 있고 격자도 만들어졌으므로
 * 대조는 성립한다. 없는 것은 "비교할 과거"일 뿐이고, 과거가 없으면 후퇴도 없다.
 * (`tools/perf` 가 "입력이 없으니 통과"로 미끄러진 것과는 다른 상황이다 — 여기서 없는 것은
 *  측정 대상이 아니라 **비교 기준**이며, 기준선 0은 안전한 쪽으로 닫힌 기본값이다.)
 */
import fs from 'node:fs';
import path from 'node:path';

export interface Baseline {
  /** 직전 리포트의 축 4 커버 칸 수 */
  covered: number;
  /**
   * 직전 리포트의 축 2·3 **분모**(계약이 선언한 states / blockedWhen 총수).
   *
   * **왜 분모까지 기억하는가 — 분모 세탁(denominator laundering).**
   * 축 2·3은 "선언된 항목이 전부 덮였는가"를 잰다. 그런데 **분모가 줄면 커버리지는 저절로 오른다.**
   * 계약에서 `states: ["default","loading"]` → `["default"]` 로 한 줄 지우면 미커버 1건이
   * 조용히 사라지고 RED 가 GREEN 이 된다. 테스트는 한 줄도 늘지 않았는데.
   *
   * 실제로 이번 실행에서 계약 states 총수가 48 → 46 으로 줄었다(DataTable · LineAreaChart 가
   * 각각 `loading` 상실). 대조 결과 계약 엔지니어이 `loading` **prop 자체를 제거**하고 버전을 1.0.1로
   * 올린 **정당한 계약 변경**이었다 — 세탁이 아니었다. 그러나 **도구는 그 둘을 구분하지 못한 채
   * 통과시켰다.** 만약 계약 엔지니어이 prop 은 남기고 states 한 줄만 지웠다면 결과는 똑같이 GREEN 이었다.
   *
   * 그래서 분모 축소를 **major 로 신고**한다. 차단하지는 않는다 — 정당한 계약 축소가 실재하고,
   * 도구가 레지스트리에 없는 blocker 를 발명해선 안 된다(아키텍처 판정 3에서 확인된 원칙).
   * 대신 **사람(계약 리뷰 계약 리뷰어 · 코드 리뷰)이 반드시 눈으로 확인하게 만든다.**
   * blocker 승격은 아키텍처의 ADR 사안으로 올린다.
   */
  contractStatesTotal: number;
  contractBlockedTotal: number;
  /** 어디서 읽었는가 — 리포트에 근거로 남긴다 */
  source: string;
}

const AXIS_ID = 'fs-exception-axes';
const STATES_ID = 'contract-states';
const BLOCKED_ID = 'contract-blocked-when';

const EMPTY = (source: string): Baseline => ({
  covered: 0,
  contractStatesTotal: 0,
  contractBlockedTotal: 0,
  source,
});

/**
 * 축 4 래칫의 기준선을 읽는다 — **안정 파일명** `reports/test-coverage/<scope>.json`.
 *
 * `source` 는 상수(`reports/test-coverage/<scope>.json`)다. 이것이 결정론의 열쇠다:
 * 구 버전은 날짜 접두 파일 중 "가장 최근"을 골라서, 같은 날 두 번째 실행이 **자기 자신**을
 * 기준선으로 삼아 `source` 문자열이 실행 간에 달라졌다(= churn). 이제 항상 같은 파일을 읽는다.
 *
 * **마이그레이션**: 안정 파일이 아직 없으면(이 개편 이전의 리포만 있으면) 레거시
 * `YYYY-MM-DD-<scope>.json` 중 최신을 폴백으로 읽어 기준선 연속성을 지킨다. 폴백은 읽기 전용 —
 * 다음 실행이 `<scope>.json` 을 쓰면 레거시 파일은 고아가 되며, 도구는 그 목록을 콘솔에 알려
 * 사람이 지우게 한다(테스트 커버리지이 자기 소유 경로에서 정리).
 */
export function readBaseline(root: string, scope: string): Baseline {
  const dir = path.join(root, 'reports', 'test-coverage');
  if (!fs.existsSync(dir)) return EMPTY('(직전 리포트 없음 — 최초 실행. 기준선 0)');

  const stable = `${scope}.json`;
  let chosen: string | undefined;
  if (fs.existsSync(path.join(dir, stable))) {
    chosen = stable;
  } else {
    // 레거시 폴백 — 날짜 접두 파일 중 최신 (사전순 = 시간순)
    const legacy = fs
      .readdirSync(dir)
      .filter(
        (f) =>
          /^\d{4}-\d{2}-\d{2}-/.test(f) &&
          f.endsWith(`-${scope}.json`) &&
          !f.includes('-escalations'),
      )
      .sort();
    chosen = legacy[legacy.length - 1];
  }
  if (chosen === undefined) return EMPTY('(직전 리포트 없음 — 최초 실행. 기준선 0)');

  // source 는 **항상 안정 파일명**이다. 레거시에서 승계했더라도 그 값은 이제 <scope>.json 에
  // 살게 되므로, 마이그레이션 실행과 이후 실행이 같은 source 문자열을 갖는다(결정론 보존).
  // "레거시에서 승계했다"는 사실은 콘솔에만 알린다(index.ts) — 커밋 파일에는 넣지 않는다.
  const source = `reports/test-coverage/${stable}`;
  try {
    const prev = JSON.parse(fs.readFileSync(path.join(dir, chosen), 'utf8')) as {
      summary?: { id: string; covered: number; total: number }[];
    };
    const find = (id: string) => prev.summary?.find((s) => s.id === id);
    return {
      covered: find(AXIS_ID)?.covered ?? 0,
      contractStatesTotal: find(STATES_ID)?.total ?? 0,
      contractBlockedTotal: find(BLOCKED_ID)?.total ?? 0,
      source,
    };
  } catch {
    // 리포트가 깨졌으면 기준선을 0으로 낮추지 않는다 — 그러면 후퇴가 은폐된다.
    // 읽을 수 없다는 사실 자체를 드러내고 0으로 두되, source 에 사유를 남긴다.
    return EMPTY(
      `reports/test-coverage/${chosen} (파싱 실패 — 기준선 0. 리포트 손상 여부를 확인하라)`,
    );
  }
}

/**
 * 정리 대상 — 레거시 **날짜 접두** 파일들 (안정 파일명 도입 후 전부 고아가 된다).
 * scope 제약을 두지 않는다: `YYYY-MM-DD-` 로 시작하는 파일은 리포트든 에스컬레이션이든
 * 모두 구 명명 규칙의 잔재이므로 함께 정리한다.
 */
export function legacyReportFiles(root: string): string[] {
  const dir = path.join(root, 'reports', 'test-coverage');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-/.test(f))
    .map((f) => `reports/test-coverage/${f}`)
    .sort();
}

/** 축 2·3 공통 — 분모(계약 표면)가 줄었으면 major 로 신고한다. 차단하지는 않는다. */
export function surfaceShrinkGap(args: {
  axis: number;
  id: string;
  label: string;
  current: number;
  baseline: number;
  baselineSource: string;
  gates: string[];
}): {
  axis: number;
  id: string;
  severity: 'major';
  source: string;
  item: string;
  expectedTest: string;
  evidence: string;
  gates: string[];
}[] {
  if (args.current >= args.baseline || args.baseline === 0) return [];
  const lost = args.baseline - args.current;
  return [
    {
      axis: args.axis,
      id: args.id,
      severity: 'major' as const,
      source: 'contracts/*.contract.json',
      item: `**계약 표면 축소** — ${args.label} 총수 ${args.baseline} → ${args.current} (${lost}건 감소)`,
      expectedTest: '(테스트가 아니라 **계약 리뷰**가 필요하다 — 계약 리뷰)',
      evidence:
        `**분모가 줄면 커버리지는 저절로 오른다.** 계약에서 항목 한 줄을 지우면 미커버 ${lost}건이 ` +
        `조용히 사라지고 RED 가 GREEN 이 된다 — 테스트는 한 줄도 늘지 않았는데. ` +
        `이것이 정당한 계약 변경(동작·prop 자체가 제거됨)인지, 아니면 **분모 세탁**인지 ` +
        `계약 리뷰(Contract Reviewer)가 확인해야 한다. 확인 기준: 제거된 항목의 **prop·동작이 구현에서도 사라졌는가.** ` +
        `기준선: ${args.baselineSource}`,
      gates: args.gates,
    },
  ];
}
