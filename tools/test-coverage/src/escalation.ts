/**
 * 에스컬레이션 봉투 — 인계 규격 (계약 우선: 산문 전달 금지).
 *
 * 차단 시 봉투를 작성해 **소유자(컴포넌트 엔지니어/프론트 구현/E2E 테스트) · approver(스토리북 리뷰/코드 리뷰) · 오케스트레이터** 에 전달한다.
 *
 * 파일은 `reports/test-coverage/` 에 쓴다 — 작업 큐는 오케스트레이터 소유이므로
 * 테스트 커버리지 도구가 직접 쓰지 않는다 (단일 소유권). 오케스트레이터가 이 봉투를 Task Graph 로 흡수한다.
 * 교훈: 변경 요청이 "명세 문서 안의 표"로만 존재하면 아무도 읽지 않는다 —
 * 그래서 이 봉투는 **파일**이어야 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './lib/fsutil.ts';
import type { Report } from './report.ts';

export interface Envelope {
  id: string;
  type: 'escalation';
  from: 'test-coverage-guard';
  to: string;
  gate: 'G5' | 'G6';
  subject: string;
  artifacts: string[];
  preconditions_met: {
    contract_approved: boolean;
    contract_version: string | null;
    tokens_available: boolean;
  };
  automated_checks: Record<string, string>;
  blockers: { reason: string; owner: string; since: string }[];
  sla_hours: number;
  escalation_count: number;
}

interface Recipient {
  to: string;
  gate: 'G5' | 'G6';
  role: string;
  axes: string[];
  sla: number;
}

/** 누가 무엇을 고쳐야 하는가 — 축 → 소유자 매핑 (레지스트리 owns 기준) */
const RECIPIENTS: Recipient[] = [
  {
    to: 'storybook-component-engineer',
    gate: 'G5',
    role: '소유자 (packages/ui/src/** — 컴포넌트 렌더 테스트 · Story play function)',
    axes: ['contract-states', 'contract-blocked-when'],
    sla: 8,
  },
  {
    to: 'storybook-reviewer',
    gate: 'G5',
    role: 'approver (G5) — 이 리포트를 검수 evidence 로 인용한다',
    axes: ['test-existence', 'contract-states', 'contract-blocked-when'],
    sla: 8,
  },
  {
    to: 'react-engineer',
    gate: 'G6',
    role: '소유자 (apps/*/src/**/*.test.* — 화면 단위 렌더 테스트)',
    axes: ['test-existence'],
    sla: 8,
  },
  {
    to: 'e2e-test-engineer',
    gate: 'G6',
    role: '소유자 (e2e/** — FS 예외 7축 시나리오)',
    axes: ['fs-exception-axes'],
    sla: 24,
  },
  {
    to: 'code-reviewer',
    gate: 'G6',
    role: 'approver (G6) — 체크리스트 #7 "계약의 모든 상태에 대한 렌더 테스트"의 evidence',
    axes: ['test-existence', 'contract-states', 'contract-blocked-when'],
    sla: 8,
  },
  {
    to: 'orchestrator',
    gate: 'G6',
    role: 'orchestrator — Task Graph 흡수 · 게이트 전이 판정',
    axes: ['test-existence', 'contract-states', 'contract-blocked-when', 'fs-exception-axes'],
    sla: 24,
  },
];

export function buildEnvelopes(report: Report, runDate: string, seq: number): Envelope[] {
  // runDate 는 **호출부에서 명시적으로 주입**한다 (report 에는 이제 날짜가 없다 — 결정론).
  // 에스컬레이션은 failure-only 이벤트 기록이고 gitignore 되는 tmp/ 에만 쓰이므로,
  // TASK id 에 실제 발생일이 들어가도 커밋 트리를 더럽히지 않는다.
  const taskDate = `${runDate.slice(0, 4)}-${runDate.slice(5, 7)}${runDate.slice(8, 10)}`;
  const artifacts = [
    `reports/test-coverage/${report.scope}.json`,
    `reports/test-coverage/${report.scope}.md`,
  ];

  const checks: Record<string, string> = {
    test_units: `${report.inputs.testUnits} (단언을 가진 실행 단위)`,
    assertion_free_units: `${report.inputs.assertionFreeUnits} (play function — expect 0건, 테스트로 세지 않음)`,
    pnpm_test: 'exit 0 — 단, `--passWithNoTests` 다. **증거로 인정하지 않는다**',
  };
  for (const s of report.summary) {
    checks[s.id] = `${s.covered}/${s.total} 커버 · 미커버 ${s.gaps}건 — ${s.status}`;
  }

  // 봉투를 받을 사람 = 자기 축에 blocker 든 major 든 **할 일이 있는** 사람 + 항상 오케스트레이터.
  // major 만 있는 E2E 테스트(FS 예외 7축 713칸)도 반드시 받아야 한다 — 경고라고 통보를 생략하면
  // 변경 요청이 아무에게도 전달되지 않던 실패를 그대로 반복한다.
  const workFor = (r: Recipient, sev: 'blocker' | 'major') =>
    report.gaps.filter(
      (g) => r.axes.includes(g.id) && g.gates.includes(r.gate) && g.severity === sev,
    );

  let n = seq;
  return RECIPIENTS.filter(
    (r) =>
      r.to === 'orchestrator' || workFor(r, 'blocker').length > 0 || workFor(r, 'major').length > 0,
  ).map((r) => {
    const mine = workFor(r, 'blocker');
    const majors = workFor(r, 'major');
    n += 1;
    return {
      id: `TASK-${taskDate}-${String(n).padStart(3, '0')}`,
      type: 'escalation' as const,
      from: 'test-coverage-guard' as const,
      to: r.to,
      gate: r.gate,
      subject:
        `[${report.status}] 커버리지 미달 — ${r.role}. ` +
        `blocker ${mine.length}건 · major ${majors.length}건. ` +
        `커버리지는 라인 %가 아니다 — 계약의 states/events 전부 + FS 예외 축 전부다.`,
      artifacts,
      preconditions_met: {
        // RR-G3 0건 — 계약을 Frozen 으로 승인한 기록이 리포에 없다 (감사 발견 1 · §1.4).
        // 그럼에도 계약은 대조의 원천으로 쓴다: 승인 기록의 부재가 계약의 부재는 아니다.
        contract_approved: false,
        contract_version: '1.0.0',
        tokens_available: true,
      },
      automated_checks: checks,
      blockers: [
        ...mine.slice(0, 20).map((g) => ({
          reason: `${g.item} — 기대 테스트: "${g.expectedTest}" (원천: ${g.source})`,
          owner: r.to,
          since: runDate,
        })),
        ...(mine.length > 20
          ? [
              {
                reason: `… 외 ${mine.length - 20}건 — 전수 목록은 ${artifacts[0]} 의 gaps[] 참조`,
                owner: r.to,
                since: runDate,
              },
            ]
          : []),
      ],
      sla_hours: r.sla,
      escalation_count: 0,
    };
  });
}

/**
 * 에스컬레이션 봉투를 **gitignore 되는** `reports/test-coverage/tmp/` 에 쓴다.
 *
 * 왜 커밋 트리가 아닌가: 에스컬레이션은 (1) **failure-only** 이벤트이고, (2) TASK id·`since` 에
 * 발생일(벽시계)을 담으며, (3) 커밋된 기준선 + 계약/명세로부터 **매 실행 재현 가능**하다.
 * 즉 래칫 기준선처럼 영속될 이유가 없다 — 커밋하면 실패가 지속되는 동안 날짜만 churn 한다.
 * tmp/ 는 `.gitignore` 의 "reports 하위 tmp 디렉터리" 규칙으로 무시되므로 커밋 트리를 더럽히지 않는다.
 * 오케스트레이터는 이 파일을 **그 실행에서** 읽어 Task Graph 로 흡수한다(교훈 유지 —
 * 산문이 아니라 파일이다. 다만 영속이 아니라 실행 산출물이다).
 */
export function writeEnvelopes(root: string, report: Report, runDate: string): string {
  const dir = path.join(root, 'reports', 'test-coverage', 'tmp');
  ensureDir(dir);
  const rel = `reports/test-coverage/tmp/${report.scope}-escalations.json`;
  const envelopes = buildEnvelopes(report, runDate, 0);
  fs.writeFileSync(
    path.join(dir, `${report.scope}-escalations.json`),
    `${JSON.stringify(
      {
        $schema: '인계.v1',
        note: '인계 봉투 배열. gitignore 되는 실행 산출물이다(커밋되지 않는다). 작업 큐는 오케스트레이터 소유이므로 테스트 커버리지 도구는 여기에 쓰고 오케스트레이터가 그 실행에서 흡수한다.',
        generatedAt: new Date().toISOString(),
        envelopes,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return rel;
}
