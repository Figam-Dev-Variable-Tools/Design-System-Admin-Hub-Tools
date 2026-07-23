/**
 * 축 4 (임무의 축 B) — FSD §7 예외 처리 커버리지.
 *
 * 대조 격자 = **동작이 정의된 (화면 ID × 예외 상황) 칸**뿐이다. 판정 규칙은 lib/specs.ts 의 주석 참조 —
 * 요약하면 *"명세가 `해당 없음` 으로 선언하지 않은 칸"* 이다. 성립하지 않는 상황은 기능 명세가 이미
 * §7에서 `해당 없음 — 사유` 로 배제해 두었으므로 도구가 따로 추측하지 않는다.
 *
 * 대조 키는 **테스트 이름의 화면 ID + 상황 이름**이다 (E2E 테스트 명명 규칙):
 *   `SCR-USERS-MEMBERS / 권한 없음 — 쓰기 권한이 없으면 체크박스 열이 사라진다`
 * 이름에 화면 ID 가 없으면 추적이 불가능하므로 **미검증으로 센다** — 이것이 대조의 전제다.
 *
 * severity=major: E2E 테스트가 채워나가는 중일 수 있다. 경고로 남기고 차단하지 않는다.
 * (단, 예외 표 자체가 없으면 blocker — 측정 불가는 통과가 아니다.)
 *
 * **세 가지 세탁 경로를 함께 막는다.**
 *   ① 테스트를 지운다                    → 커버 칸 후퇴 = blocker (래칫)
 *   ② 명세의 칸을 `해당 없음` 으로 바꾼다 → 분모 축소 = major (신고)
 *   ③ 명세의 §7 행 자체를 지운다          → 12상황 누락 = major (신고)
 * ②③ 이 없으면 "분모를 줄여 커버리지를 올리는" 길이 열린 채로 남는다.
 */
import type { Baseline } from '../lib/baseline.ts';
import { SCREEN_ID_TOKEN, type Spec } from '../lib/specs.ts';
import type { TestUnit } from '../lib/tests.ts';
import type { AxisResult, Gap } from '../report.ts';
import { EXCEPTION_SITUATIONS, FS_EXCEPTIONS, RATCHET_UNIT } from '../thresholds.ts';

export interface FsStats {
  /** §7 격자에 오른 화면 총수 */
  screensTotal: number;
  /** 그중 동작이 정의된 칸을 1개 이상 가진 화면 (= 테스트 대상) */
  screensTargeted: number;
  /** 동작 칸 총수 (화면 × 상황) */
  cellsBehavioral: number;
  /** `해당 없음` 등으로 배제된 칸 */
  cellsExcluded: number;
  excludedBy: Record<string, number>;
  /** 화면 ID 를 이름에 박은 테스트 수 */
  unitsWithScreenToken: number;
  /** 템플릿이 강제한 12상황 중 §7 표에서 빠진 칸 (누락 건수 합) */
  situationsMissing: number;
  /** 화면 ID 가 없어 격자에서 빠진 문서 수 */
  docsSkipped: number;
}

/** alias 를 긴 것부터 — `파일 업로드 실패` 가 `업로드 실패` 보다 먼저 걸려야 한다 */
const ALIAS_INDEX = EXCEPTION_SITUATIONS.flatMap((s) =>
  s.aliases.map((a) => ({ header: s.header, alias: a.toLowerCase() })),
).sort((x, y) => y.alias.length - x.alias.length);

/**
 * 명명 규칙의 **상황 칸**: `<화면 ID> / <상황> — <단언>`.
 *
 * 이 칸을 먼저 보는 이유는 거짓 양성 때문이다. 단언 설명에는 다른 상황의 이름이 자연스럽게
 * 섞인다(`/ 삭제 실패 — … 조회 결과 없음 …`). 이름 전체를 훑으면 **더 긴 단어가 이겨** 엉뚱한
 * 칸이 커버로 세어진다. 규칙이 정한 자리를 먼저 읽고, 거기서 못 찾을 때만 전체를 훑는다.
 */
const SITUATION_SLOT = /\/\s*([^/—]{1,30}?)\s*—/;

/** 테스트 이름 → 그 이름이 지목하는 (화면, 상황) 좌표들 */
function coordsOf(unit: TestUnit): { screen: string; situation: string | null }[] {
  const name = unit.name;
  SCREEN_ID_TOKEN.lastIndex = 0;
  const screens = [...new Set(name.match(SCREEN_ID_TOKEN) ?? [])];
  if (screens.length === 0) return [];

  const slot = SITUATION_SLOT.exec(name)?.[1]?.toLowerCase();
  const inSlot =
    slot === undefined
      ? undefined
      : ALIAS_INDEX.find((x) => slot === x.alias || slot.startsWith(`${x.alias} `));
  const hit = inSlot ?? ALIAS_INDEX.find((x) => name.toLowerCase().includes(x.alias));
  return screens.map((screen) => ({ screen, situation: hit?.header ?? null }));
}

export function checkFsExceptions(
  specs: Spec[],
  units: TestUnit[],
  baseline: Baseline,
  docsSkipped = 0,
): { result: AxisResult; stats: FsStats } {
  const gaps: Gap[] = [];
  const stats: FsStats = {
    screensTotal: 0,
    screensTargeted: 0,
    cellsBehavioral: 0,
    cellsExcluded: 0,
    excludedBy: {},
    unitsWithScreenToken: 0,
    situationsMissing: 0,
    docsSkipped,
  };

  // 테스트가 덮은 좌표 색인
  const coveredCells = new Set<string>(); // `${screen}#${situation}`
  const coveredScreens = new Set<string>(); // 상황 미지정이라도 화면은 추적된다
  for (const u of units) {
    const coords = coordsOf(u);
    if (coords.length > 0) stats.unitsWithScreenToken += 1;
    for (const { screen, situation } of coords) {
      coveredScreens.add(screen);
      if (situation !== null) coveredCells.add(`${screen}#${situation}`);
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
        expectedTest: '(§7 예외 표 보완 후 재측정)',
        evidence: spec.unmeasurable,
        gates: FS_EXCEPTIONS.gates,
      });
      continue;
    }

    stats.screensTotal += 1;
    if (spec.isTestTarget) stats.screensTargeted += 1;

    /* ── 세탁 경로 ③ — 템플릿이 강제한 12상황 중 행 자체가 없는 것 ──────────
     * 템플릿: "아래 12개 상황을 전부 적는다 … 행을 지우지 않는다."
     * 행이 사라지면 분모가 줄어 커버리지가 저절로 오른다. 도구가 blocker 를 발명하지는 않되
     * (레지스트리 blockCondition 밖이다) 반드시 **보이게** 만든다. */
    if (spec.missingSituations.length > 0) {
      stats.situationsMissing += spec.missingSituations.length;
      gaps.push({
        axis: FS_EXCEPTIONS.axis,
        id: FS_EXCEPTIONS.id,
        severity: 'major',
        source: spec.file,
        item: `${spec.id} — §7 상황 ${spec.missingSituations.length}개 누락: ${spec.missingSituations.join(' · ')}`,
        expectedTest: '(테스트가 아니라 **명세 보완**이 필요하다 — 명세 리뷰)',
        evidence:
          '템플릿 §7: "아래 12개 상황을 **전부** 적는다. 이 화면에서 성립하지 않으면 `해당 없음 — 〈사유〉` 를 쓴다. ' +
          "행을 지우지 않는다 — 빈 행은 '요구가 없다' 와 '아직 안 봤다' 를 구분하지 못한다.\" " +
          '행이 없으면 이 도구의 분모도 함께 줄어든다 — **테스트를 한 줄도 안 쓰고 커버리지가 오르는 길**이다.',
        gates: FS_EXCEPTIONS.gates,
      });
    }

    for (const cell of spec.cells) {
      if (!cell.behavioral) {
        stats.cellsExcluded += 1;
        const key = cell.excludedBy ?? 'unknown';
        stats.excludedBy[key] = (stats.excludedBy[key] ?? 0) + 1;
        continue;
      }
      stats.cellsBehavioral += 1;

      if (coveredCells.has(`${spec.id}#${cell.situation}`)) {
        covered += 1;
        continue;
      }

      gaps.push({
        axis: FS_EXCEPTIONS.axis,
        id: FS_EXCEPTIONS.id,
        severity: 'major',
        source: spec.file,
        item: `${spec.id} × ${cell.situation}`,
        expectedTest: `${spec.id} / ${cell.situation} — ${cell.text.slice(0, 60)}`,
        evidence: coveredScreens.has(spec.id)
          ? `화면은 테스트에 등장하지만 \`${cell.situation}\` 상황을 지목한 테스트가 없다 (E2E 테스트 명명 규칙: 상황마다 테스트를 나눈다)`
          : `명세 §7: "${cell.text}" — 이 칸을 덮는 테스트가 없다`,
        gates: FS_EXCEPTIONS.gates,
      });
    }
  }

  /* ── 래칫 — 후퇴 금지 (오케스트레이터/아키텍처 판정 2) ──────────────────────────────────
   * 새 테스트를 요구하지는 않는다(그래서 major). 그러나 **있던 커버리지를 잃는 것은 차단한다.**
   * 커버 칸 수는 0에서 시작해 단조 증가만 한다. 채우는 속도는 조직의 속도지 게이트의 문제가 아니다.
   * 최초 실행(기준선 파일 없음)은 기준선 0이므로 후퇴가 성립하지 않는다 — exit 2 사유가 아니다.
   *
   * **단위가 다르면 비교하지 않는다.** 옛 기준선 137은 (요소 × 7축) 칸이었고 지금은
   * (화면 × §7 상황) 칸이다 — 크기 비교가 성립하지 않는다. 조용히 0으로 떨어뜨리는 대신
   * 재수립 사실을 major 로 신고한다(아래). */
  const comparable = baseline.unit === RATCHET_UNIT;
  if (comparable && covered < baseline.covered) {
    gaps.push({
      axis: FS_EXCEPTIONS.axis,
      id: FS_EXCEPTIONS.id,
      severity: 'blocker',
      source: baseline.source,
      item: `**커버리지 후퇴** — 축 4 커버 ${covered}칸 < 기준선 ${baseline.covered}칸 (${baseline.covered - covered}칸 상실)`,
      expectedTest: '(삭제·약화된 e2e 테스트를 복구하라 — E2E 테스트)',
      evidence:
        `축 4는 major 지만 **후퇴는 blocker 다.** 직전 리포트(${baseline.source})가 ${baseline.covered}칸을 커버했는데 ` +
        `지금 ${covered}칸이다. 테스트가 삭제됐거나, 이름에서 화면 ID·상황 이름이 빠졌거나, 단언이 제거되어 ` +
        `실행 단위로 세지 않게 됐다. 프론트 리팩터의 규율("테스트 삭제·약화·기대값 수정 금지")의 기계 집행자가 이 래칫이다.`,
      gates: FS_EXCEPTIONS.gates,
    });
  }
  if (!comparable && baseline.covered > 0) {
    gaps.push({
      axis: FS_EXCEPTIONS.axis,
      id: FS_EXCEPTIONS.id,
      severity: 'major',
      source: baseline.source,
      item: `**래칫 기준선 재수립** — 옛 단위 \`${baseline.unit}\` ${baseline.covered}칸 → 새 단위 \`${RATCHET_UNIT}\` ${covered}칸`,
      expectedTest: '(테스트가 아니라 **판정 확인**이 필요하다 — 코드 리뷰)',
      evidence:
        `**두 수는 서로 다른 자로 잰 값이라 크기 비교가 성립하지 않는다.** 옛 단위는 삭제된 specs/** 의 ` +
        `(요소 FS-nnn-EL-nnn × 예외 7축) 칸을 셌고, 새 단위는 docs/FSD/** 의 (화면 ID × §7 예외 상황) 칸을 센다. ` +
        `그래서 이번 실행은 후퇴 판정을 하지 않고 기준선을 **${covered}칸으로 재수립**한다. ` +
        `다음 실행부터 이 수가 래칫의 바닥이다. 이 항목이 리포트에 남는 것 자체가 "숫자가 바뀐 이유"의 증거다 — 조용한 리셋 금지.`,
      gates: FS_EXCEPTIONS.gates,
    });
  }

  /* ── 세탁 경로 ② — 분모(동작 칸 총수) 축소 ─────────────────────────────── */
  if (comparable && baseline.fsCellsTotal > 0 && stats.cellsBehavioral < baseline.fsCellsTotal) {
    gaps.push({
      axis: FS_EXCEPTIONS.axis,
      id: FS_EXCEPTIONS.id,
      severity: 'major',
      source: baseline.source,
      item: `**명세 표면 축소** — 축 4 동작 칸 ${baseline.fsCellsTotal} → ${stats.cellsBehavioral} (${baseline.fsCellsTotal - stats.cellsBehavioral}칸 감소)`,
      expectedTest: '(테스트가 아니라 **명세 리뷰**가 필요하다 — 명세 리뷰)',
      evidence:
        `**분모가 줄면 커버리지는 저절로 오른다.** §7 의 칸을 \`해당 없음\` 으로 바꾸거나 행을 지우면 ` +
        `미커버가 조용히 사라진다 — 테스트는 한 줄도 늘지 않았는데. 이것이 정당한 명세 변경(그 기능이 실제로 사라졌다)인지 ` +
        `아니면 **분모 세탁**인지 명세 리뷰가 확인해야 한다. 기준선: ${baseline.source}`,
      gates: FS_EXCEPTIONS.gates,
    });
  }

  return {
    result: {
      spec: FS_EXCEPTIONS,
      scanned:
        `FSD 화면 ${stats.screensTotal}건(화면 ID 없어 제외 ${stats.docsSkipped}건) 중 동작 정의 화면 ${stats.screensTargeted}건 · ` +
        `동작 칸 ${stats.cellsBehavioral}칸 (해당없음 등 배제 ${stats.cellsExcluded}칸 · §7 상황 누락 ${stats.situationsMissing}칸) · ` +
        `단위 ${RATCHET_UNIT} · 래칫 기준선 ${comparable ? `${baseline.covered}칸` : `비교 불가(옛 단위 ${baseline.unit})`}`,
      covered,
      total: stats.cellsBehavioral,
      gaps,
    },
    stats,
  };
}
