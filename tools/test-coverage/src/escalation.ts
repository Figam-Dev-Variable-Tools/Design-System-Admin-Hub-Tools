/**
 * 에스컬레이션 봉투 — `orchestration/schemas/handoff.v1.json` 규격 (P2 계약 우선: 산문 전달 금지).
 *
 * SKILL 절차 6: 차단 시 봉투를 작성해 **소유자(A30/A40/A85) · approver(A33/A42) · A00** 에 전달한다.
 *
 * 파일은 `reports/test-coverage/` 에 쓴다 — `orchestration/tasks/` 는 **A00 소유**이므로
 * A77이 직접 쓰지 않는다 (P1 단일 소유권). A00이 이 봉투를 Task Graph 로 흡수한다.
 * 감사 발견 9: change_request 29건이 "명세 문서 안의 표"로만 존재해 아무도 읽지 않았다 —
 * 그래서 이 봉투는 **파일**이어야 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './lib/fsutil.ts';
import type { Report } from './report.ts';

export interface Envelope {
  id: string;
  type: 'escalation';
  from: 'A77';
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
    to: 'A30',
    gate: 'G5',
    role: '소유자 (packages/ui/src/** — 컴포넌트 렌더 테스트 · Story play function)',
    axes: ['contract-states', 'contract-blocked-when'],
    sla: 8,
  },
  {
    to: 'A33',
    gate: 'G5',
    role: 'approver (G5) — 이 리포트를 검수 evidence 로 인용한다',
    axes: ['test-existence', 'contract-states', 'contract-blocked-when'],
    sla: 8,
  },
  {
    to: 'A40',
    gate: 'G6',
    role: '소유자 (apps/*/src/**/*.test.* — 화면 단위 렌더 테스트)',
    axes: ['test-existence'],
    sla: 8,
  },
  {
    to: 'A85',
    gate: 'G6',
    role: '소유자 (e2e/** — FS 예외 7축 시나리오)',
    axes: ['fs-exception-axes'],
    sla: 24,
  },
  {
    to: 'A42',
    gate: 'G6',
    role: 'approver (G6) — 체크리스트 #7 "계약의 모든 상태에 대한 렌더 테스트"의 evidence',
    axes: ['test-existence', 'contract-states', 'contract-blocked-when'],
    sla: 8,
  },
  {
    to: 'A00',
    gate: 'G6',
    role: 'orchestrator — Task Graph 흡수 · 게이트 전이 판정',
    axes: ['test-existence', 'contract-states', 'contract-blocked-when', 'fs-exception-axes'],
    sla: 24,
  },
];

export function buildEnvelopes(report: Report, seq: number): Envelope[] {
  const date = report.date;
  const taskDate = `${date.slice(0, 4)}-${date.slice(5, 7)}${date.slice(8, 10)}`;
  const artifacts = [
    `reports/test-coverage/${date}-${report.scope}.json`,
    `reports/test-coverage/${date}-${report.scope}.md`,
  ];

  const checks: Record<string, string> = {
    test_units: `${report.inputs.testUnits} (단언을 가진 실행 단위)`,
    assertion_free_units: `${report.inputs.assertionFreeUnits} (play function — expect 0건, 테스트로 세지 않음)`,
    pnpm_test: 'exit 0 — 단, `--passWithNoTests` 다. **증거로 인정하지 않는다**',
  };
  for (const s of report.summary) {
    checks[s.id] = `${s.covered}/${s.total} 커버 · 미커버 ${s.gaps}건 — ${s.status}`;
  }

  // 봉투를 받을 사람 = 자기 축에 blocker 든 major 든 **할 일이 있는** 사람 + 항상 A00(orchestrator).
  // major 만 있는 A85(FS 예외 7축 713칸)도 반드시 받아야 한다 — 경고라고 통보를 생략하면
  // 감사 발견 9(change_request 29건이 아무에게도 전달되지 않음)를 그대로 반복한다.
  const workFor = (r: Recipient, sev: 'blocker' | 'major') =>
    report.gaps.filter(
      (g) => r.axes.includes(g.id) && g.gates.includes(r.gate) && g.severity === sev,
    );

  let n = seq;
  return RECIPIENTS.filter(
    (r) => r.to === 'A00' || workFor(r, 'blocker').length > 0 || workFor(r, 'major').length > 0,
  ).map((r) => {
    const mine = workFor(r, 'blocker');
    const majors = workFor(r, 'major');
    n += 1;
    return {
      id: `TASK-${taskDate}-${String(n).padStart(3, '0')}`,
      type: 'escalation' as const,
      from: 'A77' as const,
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
          since: date,
        })),
        ...(mine.length > 20
          ? [
              {
                reason: `… 외 ${mine.length - 20}건 — 전수 목록은 ${artifacts[0]} 의 gaps[] 참조`,
                owner: r.to,
                since: date,
              },
            ]
          : []),
      ],
      sla_hours: r.sla,
      escalation_count: 0,
    };
  });
}

export function writeEnvelopes(root: string, report: Report): string {
  const dir = path.join(root, 'reports', 'test-coverage');
  ensureDir(dir);
  const rel = `reports/test-coverage/${report.date}-escalations.json`;
  const envelopes = buildEnvelopes(report, 0);
  fs.writeFileSync(
    path.join(dir, `${report.date}-escalations.json`),
    `${JSON.stringify(
      {
        $schema: '../../orchestration/schemas/handoff.v1.json',
        note: 'handoff.v1 봉투 배열. 각 원소가 스키마를 개별 만족한다. orchestration/tasks/ 는 A00 소유이므로 A77은 여기에 쓰고 A00이 흡수한다.',
        envelopes,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return rel;
}
