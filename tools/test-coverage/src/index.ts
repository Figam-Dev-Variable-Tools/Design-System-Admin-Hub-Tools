/**
 * @tds/test-coverage — 커버리지 5축 대조 진입점 (테스트 커버리지 Test Coverage Guard)
 *
 * 실행:
 *   pnpm coverage:check                            # PR 게이트 (의존성 관리이 루트 스크립트 등록)
 *   pnpm --filter @tds/test-coverage run check
 *
 * 산출물: reports/test-coverage/<scope>.json + .md  (커밋 · 안정 파일명 · 결정론 — 벽시계 없음)
 *         reports/test-coverage/tmp/<scope>-escalations.json  (gitignore · failure-only)
 * 종료 코드:
 *   0 — blocker 0건 (major 는 경고로 남고 통과)
 *   1 — blocker >= 1건 → **G5 · G6 BLOCKED**
 *   2 — 실행 오류 / **측정 불가** (계약도 명세도 없으면 PASS 가 아니라 NOT_VERIFIED 다)
 *
 * 이 도구는 "통과했다"와 "검증되지 않았다"를 구분한다.
 * `pnpm test` 의 exit code 를 읽지 않는다 — `--passWithNoTests` 의 초록불은 증거가 아니라
 * 공집합 위에서 참인 명제일 뿐이다. 대신 **소스에 실제로 존재하는 단언**을 센다.
 *
 * 테스트 커버리지은 테스트를 대신 쓰지 않는다 (컴포넌트 엔지니어/프론트 구현/E2E 테스트의 일). 검증 대상은 전부 읽기 전용이다.
 */
import { checkBlockedWhen } from './axes/contract-blocked-when.ts';
import { checkContractStates } from './axes/contract-states.ts';
import { checkExistence } from './axes/existence.ts';
import { checkFsExceptions } from './axes/fs-exceptions.ts';
import { checkToolFixtures } from './axes/tool-fixtures.ts';
import { legacyReportFiles, readBaseline } from './lib/baseline.ts';
import { loadContracts } from './lib/contracts.ts';
import { exists, findRepoRoot } from './lib/fsutil.ts';
import { loadSpecs } from './lib/specs.ts';
import { scanTests } from './lib/tests.ts';
import { productScopes } from './lib/workspace.ts';
import { writeEnvelopes } from './escalation.ts';
import { buildReport, writeReport, type AxisResult } from './report.ts';
import { CONTRACTS_DIR, RATCHET_UNIT, SPECS_DIR } from './thresholds.ts';

function main(): void {
  const root = findRepoRoot(process.cwd());
  const scope = process.argv[2] ?? 'all';

  /* ── 측정 가능성 확인 — 측정 불가는 통과가 아니다 ────────────────────────
   * tools/perf 가 dist 부재 시 조용히 exit 0 한 것이 정확히 이 실수였고,
   * 그래서 bundle-size job 이 제거됐다 (ADR-0009). 같은 실수를 반복하지 않는다. */
  const hasContracts = exists(root, CONTRACTS_DIR);
  const hasSpecs = exists(root, SPECS_DIR);
  if (!hasContracts && !hasSpecs) {
    console.error(
      `[test-coverage] 원천이 하나도 없다 — ${CONTRACTS_DIR}/ 도 ${SPECS_DIR}/ 도 없다. ` +
        '대조할 기준이 없으면 커버리지는 PASS 가 아니라 **NOT_VERIFIED** 다. exit 2',
    );
    process.exitCode = 2;
    return;
  }

  const contracts = hasContracts ? loadContracts(root) : [];
  const { specs, skipped } = hasSpecs ? loadSpecs(root) : { specs: [], skipped: [] };
  if (contracts.length === 0 && specs.length === 0) {
    console.error(
      '[test-coverage] 계약 0종 · FSD 화면 0건 — 대조표를 만들 수 없다. 측정 불가 ≠ 통과. exit 2',
    );
    process.exitCode = 2;
    return;
  }

  const scan = scanTests(root);

  // 축 1의 스코프는 워크스페이스에서 **파생**한다 — 새 앱/패키지가 자동 편입되도록 (판정 1).
  const scopes = productScopes(root);
  // 축 4의 래칫 기준선 — 직전 리포트의 커버 칸 수. 없으면 0 (최초 실행, 후퇴 불가) (판정 2).
  const baseline = readBaseline(root, scope);

  /* ── 5축 대조 ─────────────────────────────────────────────────────────── */
  const existence = checkExistence(scan, scopes);
  const states = checkContractStates(contracts, scan.units, baseline);
  const blocked = checkBlockedWhen(contracts, scan.units, baseline);
  const fs4 = checkFsExceptions(specs, scan.units, baseline, skipped.length);
  const fixtures = checkToolFixtures(root, scan.units);

  const results: AxisResult[] = [existence.result, states, blocked, fs4.result, fixtures];

  /* ── 자기 감사 — 이 도구가 공허 통과할 수 있는 경로를 스스로 신고한다 ──── */
  const selfAudit: string[] = [
    `대조 키는 **테스트 이름**이다. 이름이 계약 상태·FSD 화면 ID 와 상황 이름을 인용하지 않으면 이 도구는 그것을 "없는 것"으로 센다 — 거짓 음성(실제로 검증했는데 미커버로 셈)이 가능하다. 반대로 **이름만 맞고 단언이 엉뚱한 테스트**는 커버로 세어질 수 있다 — 거짓 양성이다. 도구는 단언의 **존재**를 보지만 단언의 **내용이 옳은지**는 보지 않는다. 그 판정은 스토리북 리뷰(G5)·코드 리뷰(G6)의 사람 검수 몫이다.`,
    `축 3(blockedWhen)만 예외적으로 단언의 **종류**까지 본다 (비발생 단언 필수). 금지 동작은 렌더 단언으로 증명되지 않기 때문이다.`,
    `축 4의 대조 격자는 **FSD §7 예외 처리 표**에서 파생된다(2026-07 재조준 — 옛 \`specs/**\` §4 의 요소 × 7축 격자는 원천이 삭제돼 성립하지 않는다). **기능 명세가 동작 칸을 \`해당 없음\` 으로 바꾸거나 12상황의 행을 지우면 대조 대상이 줄어든다** — 커버리지 하한을 낮추는 우회로가 명세 쪽에 열려 있다. 이 경로는 명세 리뷰(G9)의 검수를 지나야 하며, 도구는 **분모 축소**와 **상황 누락**을 각각 major 로 신고해 그 변화를 눈에 보이게 만든다.`,
    `**옛 7축 중 3개는 §7 에 자리가 없다.** \`로딩\`·\`유효성\` 은 새 양식에서 §8 화면 상태 · §6 Validation 으로 옮겨 갔고, \`대량\` 은 어느 절에도 자리가 없다. 축 4는 그 셋을 **더 이상 기계로 지키지 않는다.** §8·§6 을 격자에 넣지 않은 이유는 레지스트리 \`blockCondition\` 이 축 4에 인가한 것이 "FS의 **예외**" 이기 때문이다(§8 은 대부분 정상 경로이고, 상태 전수 렌더는 축 2가 이미 잰다). 범위를 넓히려면 아키텍처의 ADR 이 필요하다 — 도구가 스스로 넓히지 않는다.`,
    `축 4의 대조 키는 **화면 ID**다. \`docs/FSD/_common/index.md\` 처럼 §1 에 화면 ID 가 없는 문서(라우트가 없는 공통 층)는 테스트 이름이 가리킬 좌표가 없어 격자에서 빠진다. 그 수를 리포트에 드러내며(\`ratchet\`·축 4 \`scanned\`), **조용히 빼지 않는다.** 공통 층의 예외 동작은 그것을 쓰는 각 화면의 §7 에서 측정된다.`,
    `\`pnpm test\` 의 exit code 를 읽지 않는다. 따라서 **테스트가 존재하지만 실패하는** 경우를 이 도구는 잡지 못한다 — 그것은 CI 의 test job (CI·CD) 이 잡아야 한다. 테스트 커버리지 은 "무엇이 검증되지 않았는가"를 재고, "검증된 것이 통과했는가"는 재지 않는다. **두 장치가 모두 있어야 게이트가 닫힌다.**`,
    `\`describe\` 블록 이름은 대조에 쓰지 않는다 (테스트 이름만 본다). \`describe('Button disabled')\` + \`it('does not fire')\` 조합은 미커버로 셈될 수 있다 — E2E 테스트 명명 규칙(접두를 테스트 이름에 박는다)이 이 한계를 전제로 만들어졌다.`,
    `**[해소됨 — 오케스트레이터/아키텍처 판정 1]** 이전 버전의 축 1은 **리포 전역 카운트**여서, 컴포넌트 엔지니어이 \`packages/ui\` 에 테스트를 채우면 \`apps/admin\` 이 0건이어도 초록으로 바뀌었다 — 한쪽의 초록이 다른 쪽의 빈칸을 가렸다. 이제 축 1은 \`pnpm-workspace.yaml\` 에서 파생한 **스코프별로 독립 판정**한다. **남은 한계**: \`e2e/\` 는 워크스페이스 패키지가 아니므로 축 1의 스코프가 아니다 — e2e 커버리지는 축 4(major + 래칫)만 잰다. 즉 **e2e 테스트를 한 건도 쓰지 않아도 blocker 는 뜨지 않는다** (래칫 기준선이 0이므로 후퇴도 없다). E2E 테스트가 첫 테스트를 쓰는 순간부터 래칫이 물린다.`,
    `**[해소됨 — 오케스트레이터/아키텍처 판정 1]** \`tools/*\` 는 워크스페이스 패키지지만 축 1의 스코프에서 **의도적으로 제외**했다 (lib/workspace.ts). 검증 도구의 테스트 요구는 축 5(골든 픽스처)가 담당하며, \`tools/*\` 11개를 축 1에 넣으면 레지스트리가 인가하지 않은 blocker 11건을 **도구가 발명하는 것**이 된다. 이 경계를 바꾸는 것은 아키텍처의 ADR 사안이다.`,
    `**축 4 래칫의 한계**: 기준선은 \`reports/test-coverage/\` 의 **직전 리포트 파일**에서 읽는다. 리포트가 삭제되면 기준선이 0으로 떨어져 **후퇴가 은폐된다.** \`reports/**\` 는 테스트 커버리지 소유이므로 다른 에이전트가 지울 수 없지만, **테스트 커버리지 자신이(또는 CI 캐시 초기화가) 지우면 래칫이 풀린다.** 항구적 방어는 기준선을 리포에 커밋된 파일로 유지하는 것이다 — CI·CD가 CI에서 \`reports/\` 를 커밋/아티팩트로 보존하도록 배선해야 완성된다.`,
  ];

  const discrepancies: string[] = [
    `**[아키텍처 판정 완료]** SKILL 축 5 vs 레지스트리 \`blockCondition\`: **레지스트리가 정본**이라는 판정을 받았다. 축 5는 **major 유지**. \`skills/test-coverage-guard/SKILL.md\` 의 측정 기준 표를 레지스트리에 맞춰 수정 완료 — 도구가 blocker 를 발명하지 않는다는 원칙이 확인됐다.`,
  ];

  if (scan.assertionFree.length > 0 && scan.units.length === 0) {
    discrepancies.push(
      `**G5 exit 조건이 검증된 적이 없다**: \`packages/ui/src/**/*.stories.tsx\` 에 play function ${scan.assertionFree.length}건이 있으나 \`expect\` 0건 · 스파이(\`fn()\`) 0건이다. play 들은 \`userEvent.hover/tab/pointer\` 로 **상태를 만들기만** 하고 아무것도 단언하지 않는다. G5 exit *"Play Function으로 events.blockedWhen 전수 검증"* 은 실패할 수 없는 ${scan.assertionFree.length}개의 초록불로 통과돼 왔다. **blockedWhen 검증은 현재 코드베이스에서 없는 것이 아니라 물리적으로 불가능하다** — 콜백을 관찰할 스파이가 하나도 주입되지 않았기 때문이다. → 컴포넌트 엔지니어(packages/ui) 에 blocker.`,
    );
  }

  const unmeasurable = false; // 여기까지 왔으면 원천은 있다. 개별 원천의 대조 불가는 blocker gap 으로 처리된다.
  // 벽시계 값은 **커밋되는 리포트에 넣지 않는다** — 콘솔과 gitignore 되는 에스컬레이션에만 쓴다.
  const runAt = new Date().toISOString();
  const runDate = runAt.slice(0, 10);
  const report = buildReport({
    scope,
    inputs: {
      contracts: contracts.length,
      specs: specs.length,
      testFiles: scan.files.tests.length,
      storyFiles: scan.files.stories.length,
      testUnits: scan.units.length,
      assertionFreeUnits: scan.assertionFree.length,
    },
    results,
    scopes: existence.rows,
    ratchet: {
      baseline: baseline.covered,
      current: fs4.result.covered,
      source: baseline.source,
      regressed: baseline.unit === RATCHET_UNIT && fs4.result.covered < baseline.covered,
      unit: RATCHET_UNIT,
      baselineUnit: baseline.unit,
      total: fs4.result.total,
    },
    assertionFree: scan.assertionFree.map((u) => ({
      file: u.file,
      line: u.line,
      name: u.name,
      kind: u.kind,
    })),
    selfAudit,
    discrepancies,
    unmeasurable,
  });

  const paths = writeReport(root, report);
  // 차단 시 에스컬레이션 봉투를 **파일로** 남긴다 (P2: 산문 전달 금지) — gitignore 되는 tmp/ 에.
  // 감사 발견 9: 변경 요청 29건이 문서 안의 표로만 존재해 아무도 읽지 않았다.
  const envelopePath = report.counts.blocker > 0 ? writeEnvelopes(root, report, runDate) : null;

  // 안정 파일명 도입으로 고아가 된 레거시 날짜 접두 리포트를 알린다 (테스트 커버리지이 정리 — 자기 소유 경로).
  const legacy = legacyReportFiles(root);

  /* ── 콘솔 ─────────────────────────────────────────────────────────────── */
  console.log(`[test-coverage] 실행 시각: ${runAt} (커밋되는 리포트에는 기록하지 않는다 — 결정론)`);
  console.log(
    `[test-coverage] 입력: 계약 ${report.inputs.contracts}종 · FSD 화면 ${report.inputs.specs}건(화면 ID 없어 제외 ${skipped.length}건) · 테스트 파일 ${report.inputs.testFiles}개 · 스토리 파일 ${report.inputs.storyFiles}개`,
  );
  console.log(
    `[test-coverage] 단언을 가진 실행 단위(= 테스트): ${report.inputs.testUnits}건 / 단언 없는 실행 단위: ${report.inputs.assertionFreeUnits}건`,
  );
  console.log('');
  console.log(
    `[test-coverage] 축 1 스코프 (pnpm-workspace.yaml 파생, ${report.scopes.length}개) — 한쪽의 초록이 다른 쪽의 빈칸을 가리지 못한다:`,
  );
  for (const s of report.scopes) {
    console.log(
      `[test-coverage]   ${s.dir.padEnd(16)} ${s.name.padEnd(12)} 테스트 ${String(s.testUnits).padStart(3)}건 · 단언 없는 단위 ${String(s.assertionFreeUnits).padStart(3)}건 — ${s.status}`,
    );
  }
  console.log(
    `[test-coverage] 축 4 래칫 단위 ${report.ratchet.unit} — (화면 ID × §7 예외 상황) 칸을 센다`,
  );
  console.log(
    `[test-coverage] 축 4 래칫: 기준선 ${report.ratchet.baseline}칸 → 현재 ${report.ratchet.current}칸 / 분모 ${report.ratchet.total}칸 — ${
      report.ratchet.unit !== report.ratchet.baselineUnit
        ? `**단위 변경(${report.ratchet.baselineUnit} → ${report.ratchet.unit}) — 비교 불가, 기준선 재수립**`
        : report.ratchet.regressed
          ? `**후퇴 ${report.ratchet.baseline - report.ratchet.current}칸 → BLOCKER**`
          : '후퇴 없음'
    }  (출처: ${report.ratchet.source})`,
  );
  console.log('');
  for (const s of report.summary) {
    const mark = s.status === 'PASS' ? 'PASS' : s.severity === 'blocker' ? 'BLOCKER' : 'MAJOR';
    console.log(
      `[test-coverage] 축 ${s.axis} ${s.id.padEnd(22)} ${String(s.covered).padStart(3)}/${String(s.total).padEnd(3)} 커버 · 미커버 ${String(s.gaps).padStart(3)}건 — ${mark}`,
    );
  }
  console.log('');
  console.log(
    `[test-coverage] FSD 판정: 화면 ${fs4.stats.screensTotal}건 중 **동작이 정의된 화면 ${fs4.stats.screensTargeted}건**이 테스트 대상 ` +
      `(동작 칸 ${fs4.stats.cellsBehavioral} · 배제 ${fs4.stats.cellsExcluded} = ${Object.entries(
        fs4.stats.excludedBy,
      )
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')} · §7 상황 누락 ${fs4.stats.situationsMissing})`,
  );
  if (skipped.length > 0) {
    console.log(
      `[test-coverage] 화면 ID 가 없어 격자에서 제외된 문서 ${skipped.length}건 (조용히 빼지 않는다): ${skipped
        .map((s) => s.file)
        .join(', ')}`,
    );
  }

  for (const g of report.gaps.filter((x) => x.severity === 'blocker').slice(0, 20)) {
    console.error(`[test-coverage] BLOCKER 축${g.axis} ${g.item}  → 기대: "${g.expectedTest}"`);
  }
  const restBlockers = report.gaps.filter((x) => x.severity === 'blocker').length - 20;
  if (restBlockers > 0)
    console.error(`[test-coverage] BLOCKER … 외 ${restBlockers}건 (리포트 참조)`);

  console.log('');
  console.log(`[test-coverage] 리포트(커밋 · 안정 파일명): ${paths.json}, ${paths.md}`);
  if (envelopePath !== null) {
    console.log(
      `[test-coverage] 에스컬레이션 봉투(gitignore tmp/): ${envelopePath} (→ 컴포넌트 엔지니어 · 스토리북 리뷰 · 프론트 구현 · E2E 테스트 · 코드 리뷰 · 오케스트레이터)`,
    );
  }
  if (legacy.length > 0) {
    console.warn(
      `[test-coverage] 정리 대상 — 레거시 날짜 접두 리포트 ${legacy.length}건 (안정 파일명 도입으로 고아):`,
    );
    for (const f of legacy) console.warn(`[test-coverage]   git rm ${f}`);
  }

  if (report.counts.blocker > 0) {
    const verdict = report.inputs.testUnits === 0 ? 'NOT_VERIFIED' : 'FAIL';
    console.error(
      `[test-coverage] ${verdict} — blocker ${report.counts.blocker}건 → **${report.blockedGates.join(' · ')} BLOCKED** (exit 1). major ${report.counts.major}건.`,
    );
    if (report.inputs.testUnits === 0) {
      console.error(
        '[test-coverage] 이것은 PASS 가 아니다. `pnpm test` 가 exit 0 을 돌려주더라도 그것은 ' +
          '`--passWithNoTests` 가 만든 공집합 위의 참이며, 아무것도 보증하지 않는다.',
      );
    }
    process.exitCode = 1;
    return;
  }

  if (report.counts.major > 0) {
    console.warn(
      `[test-coverage] blocker 0건 → 통과 (exit 0). major ${report.counts.major}건은 경고로 남는다 — 리포트 참조.`,
    );
    process.exitCode = 0;
    return;
  }

  console.log('[test-coverage] 5축 전부 커버 — 미커버 0건 (exit 0)');
  process.exitCode = 0;
}

try {
  main();
} catch (e) {
  console.error(`[test-coverage] 실행 오류: ${(e as Error).message}`);
  process.exitCode = 2;
}
