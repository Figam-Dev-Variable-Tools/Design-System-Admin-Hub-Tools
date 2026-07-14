/**
 * 축 4 (임무의 축 B) — FS 예외 7축 커버리지.
 *
 * 대조 격자 = **동작이 정의된 (요소 × 축) 칸**뿐이다. 판정 규칙은 lib/specs.ts 의 주석 참조 —
 * 요약하면 *"명세가 N/A 로 선언하지 않은 칸"* 이다. 정적 라벨·아이콘은 A62가 이미 §4에서
 * `N/A — 고정 문구다` 로 배제해 두었으므로 도구가 따로 추측하지 않는다.
 *
 * 대조 키는 **테스트 이름의 요소 번호 토큰**이다 (A85 명명 규칙):
 *   `FS-003-EL-042: 권한없음 — 목록 진입 시 403이 아니라 404로 은닉된다`
 * 이름에 번호가 없으면 추적이 불가능하므로 **미검증으로 센다** — 이것이 대조의 전제다.
 *
 * severity=major: A85가 채워나가는 중일 수 있다. 경고로 남기고 차단하지 않는다.
 * (단, 예외 표 자체가 없으면 blocker — 측정 불가는 통과가 아니다.)
 */
import type { Baseline } from '../lib/baseline.ts';
import { ELEMENT_TOKEN, type Spec } from '../lib/specs.ts';
import type { TestUnit } from '../lib/tests.ts';
import type { AxisResult, Gap } from '../report.ts';
import { EXCEPTION_AXES, FS_EXCEPTIONS } from '../thresholds.ts';

export interface FsStats {
  /** FS §4 에 등장한 요소 총수 */
  elementsTotal: number;
  /** 그중 동작이 정의된 요소 (= 테스트 대상) */
  elementsTargeted: number;
  /** 동작 칸 총수 (요소 × 축) */
  cellsBehavioral: number;
  /** N/A · 위임 등으로 배제된 칸 */
  cellsExcluded: number;
  excludedBy: Record<string, number>;
  /** 요소 번호를 이름에 박은 테스트 수 */
  unitsWithElementToken: number;
}

/** 테스트 이름 → 그 이름이 지목하는 (요소, 축) 좌표들 */
function coordsOf(unit: TestUnit): { element: string; axisIndex: number | null }[] {
  const name = unit.name;
  ELEMENT_TOKEN.lastIndex = 0;
  const elements = [...new Set(name.match(ELEMENT_TOKEN) ?? [])];
  if (elements.length === 0) return [];

  const lower = name.toLowerCase();
  const axisIndex = EXCEPTION_AXES.findIndex((a) =>
    a.aliases.some((al) => lower.includes(al.toLowerCase())),
  );
  return elements.map((element) => ({
    element,
    axisIndex: axisIndex === -1 ? null : axisIndex,
  }));
}

export function checkFsExceptions(
  specs: Spec[],
  units: TestUnit[],
  baseline: Baseline,
): { result: AxisResult; stats: FsStats } {
  const gaps: Gap[] = [];
  const stats: FsStats = {
    elementsTotal: 0,
    elementsTargeted: 0,
    cellsBehavioral: 0,
    cellsExcluded: 0,
    excludedBy: {},
    unitsWithElementToken: 0,
  };

  // 테스트가 덮은 좌표 색인
  const coveredCells = new Set<string>(); // `${element}#${axisIndex}`
  const coveredElements = new Set<string>(); // 축 미지정이라도 요소는 추적된다
  for (const u of units) {
    const coords = coordsOf(u);
    if (coords.length > 0) stats.unitsWithElementToken += 1;
    for (const { element, axisIndex } of coords) {
      coveredElements.add(element);
      if (axisIndex !== null) coveredCells.add(`${element}#${axisIndex}`);
    }
  }

  let covered = 0;
  for (const spec of specs) {
    if (spec.unmeasurable !== null) {
      gaps.push({
        axis: FS_EXCEPTIONS.axis,
        id: FS_EXCEPTIONS.id,
        severity: 'blocker', // 측정 불가는 통과가 아니다 — 이 케이스만 blocker 로 승격한다
        source: spec.file,
        item: `${spec.id} — 대조 불가`,
        expectedTest: '(예외 표 보완 후 재측정)',
        evidence: spec.unmeasurable,
        gates: FS_EXCEPTIONS.gates,
      });
      continue;
    }

    for (const el of spec.elements) {
      stats.elementsTotal += 1;
      if (el.isTestTarget) stats.elementsTargeted += 1;

      for (const cell of el.cells) {
        if (!cell.behavioral) {
          stats.cellsExcluded += 1;
          const key = cell.excludedBy ?? 'unknown';
          stats.excludedBy[key] = (stats.excludedBy[key] ?? 0) + 1;
          continue;
        }
        stats.cellsBehavioral += 1;

        if (coveredCells.has(`${el.id}#${cell.axisIndex}`)) {
          covered += 1;
          continue;
        }

        gaps.push({
          axis: FS_EXCEPTIONS.axis,
          id: FS_EXCEPTIONS.id,
          severity: 'major',
          source: spec.file,
          item: `${el.id} × ${cell.axis}`,
          expectedTest: `${el.id}: ${cell.axis} — ${cell.text.slice(0, 60)}`,
          evidence: coveredElements.has(el.id)
            ? `요소는 테스트에 등장하지만 \`${cell.axis}\` 축을 지목한 테스트가 없다 (A85 명명 규칙: 축마다 테스트를 나눈다)`
            : `명세 §4: "${cell.text}" — 이 칸을 덮는 테스트가 없다`,
          gates: FS_EXCEPTIONS.gates,
        });
      }
    }
  }

  /* ── 래칫 — 후퇴 금지 (A00/A01 판정 2) ──────────────────────────────────
   * 새 테스트를 요구하지는 않는다(그래서 major). 그러나 **있던 커버리지를 잃는 것은 차단한다.**
   * 커버 칸 수는 0에서 시작해 단조 증가만 한다. 채우는 속도는 조직의 속도지 게이트의 문제가 아니다.
   * 최초 실행(기준선 파일 없음)은 기준선 0이므로 후퇴가 성립하지 않는다 — exit 2 사유가 아니다. */
  if (covered < baseline.covered) {
    gaps.push({
      axis: FS_EXCEPTIONS.axis,
      id: FS_EXCEPTIONS.id,
      severity: 'blocker',
      source: baseline.source,
      item: `**커버리지 후퇴** — 축 4 커버 ${covered}칸 < 기준선 ${baseline.covered}칸 (${baseline.covered - covered}칸 상실)`,
      expectedTest: '(삭제·약화된 e2e 테스트를 복구하라 — A85)',
      evidence:
        `축 4는 major 지만 **후퇴는 blocker 다.** 직전 리포트(${baseline.source})가 ${baseline.covered}칸을 커버했는데 ` +
        `지금 ${covered}칸이다. 테스트가 삭제됐거나, 이름에서 요소 번호가 빠졌거나, 단언이 제거되어 ` +
        `실행 단위로 세지 않게 됐다. A41의 규율("테스트 삭제·약화·기대값 수정 금지")의 기계 집행자가 이 래칫이다.`,
      gates: FS_EXCEPTIONS.gates,
    });
  }

  return {
    result: {
      spec: FS_EXCEPTIONS,
      scanned:
        `FS ${specs.length}건 · 요소 ${stats.elementsTotal}개 중 동작 정의 요소 ${stats.elementsTargeted}개 · ` +
        `동작 칸 ${stats.cellsBehavioral}칸 (N/A 등 배제 ${stats.cellsExcluded}칸) · 래칫 기준선 ${baseline.covered}칸`,
      covered,
      total: stats.cellsBehavioral,
      gaps,
    },
    stats,
  };
}
