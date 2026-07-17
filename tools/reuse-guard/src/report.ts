/**
 * 리포트 기록 — reports/reuse/<name>.json + <name>.md
 * 리포트 경로 소유: 재사용 가드
 * G0 게이트: UI Planner(UI 기획)는 신규 컴포넌트 표기 전 이 리포트를 반드시 첨부한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './lib/fsutil.ts';
import type { Verdict } from './similarity.ts';
import {
  THRESHOLD_CREATE_BLOCKED,
  THRESHOLD_EXTEND_RECOMMENDED,
  WEIGHT_NAME,
  WEIGHT_PROPS,
} from './similarity.ts';

export interface CandidateScore {
  name: string;
  version: string;
  level: string | null;
  status: string | null;
  contractPath: string;
  nameSimilarity: number;
  /** name-only 모드에서는 null */
  propsJaccard: number | null;
  score: number;
  sharedProps: string[];
  candidateProps: string[];
}

export interface ReuseReport {
  generatedAt: string;
  target: {
    name: string;
    props: string[];
  };
  mode: 'name+props' | 'name-only';
  weights: { name: number; props: number };
  thresholds: { createBlocked: number; extendRecommended: number };
  contractsCompared: number;
  bestMatch: CandidateScore | null;
  verdict: Verdict;
  candidates: CandidateScore[];
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

const VERDICT_LABELS: Record<Verdict, string> = {
  CREATE_BLOCKED: 'CREATE_BLOCKED — 신규 생성 차단, EXTEND 강제',
  EXTEND_RECOMMENDED: 'EXTEND_RECOMMENDED — 기존 컴포넌트 확장 권고',
  CREATE_OK: 'CREATE_OK — 신규 생성 가능',
};

export function buildReportMd(report: ReuseReport): string {
  const lines: string[] = [];
  lines.push(`# Reuse Guard 판정 — ${report.target.name}`);
  lines.push('');
  lines.push(
    '> 중복 컴포넌트 차단 (재사용 가드 Component Reuse AI) — G0 사전 조회 필수, 유사도 >= 85% 신규 생성 차단',
  );
  lines.push('');
  lines.push(`- 실행 시각: ${report.generatedAt}`);
  lines.push(
    `- 입력: name=\`${report.target.name}\`${
      report.target.props.length > 0
        ? `, props=[${report.target.props.join(', ')}]`
        : ' (props 미제공 → 이름 단독 모드)'
    }`,
  );
  lines.push(
    `- 알고리즘: 이름 유사도(레벤슈타인 정규화) ${pct(WEIGHT_NAME)} + props 집합 자카드 ${pct(WEIGHT_PROPS)} 가중 평균${
      report.mode === 'name-only' ? ' — 이번 실행은 이름 유사도 단독' : ''
    }`,
  );
  lines.push(
    `- 임계값: >= ${pct(THRESHOLD_CREATE_BLOCKED)} CREATE_BLOCKED · ${pct(THRESHOLD_EXTEND_RECOMMENDED)}~${pct(THRESHOLD_CREATE_BLOCKED)} EXTEND_RECOMMENDED · < ${pct(THRESHOLD_EXTEND_RECOMMENDED)} CREATE_OK`,
  );
  lines.push(`- 비교 대상 계약: ${report.contractsCompared}건`);
  lines.push('');
  lines.push(`## 판정: ${VERDICT_LABELS[report.verdict]}`);
  lines.push('');

  if (report.candidates.length === 0) {
    lines.push(
      '비교할 기존 계약(contracts/*.contract.json)이 없다 — 신규 생성 가능 (부트스트랩 단계).',
    );
    lines.push('');
  } else {
    lines.push('## 상위 후보');
    lines.push('');
    lines.push('| 순위 | 기존 컴포넌트 | 버전 | 이름 유사도 | props 자카드 | 종합 | 공유 props |');
    lines.push('|---|---|---|---|---|---|---|');
    report.candidates.forEach((c, i) => {
      lines.push(
        `| ${i + 1} | ${c.name} | ${c.version} | ${pct(c.nameSimilarity)} | ${
          c.propsJaccard === null ? '-' : pct(c.propsJaccard)
        } | ${pct(c.score)} | ${c.sharedProps.length > 0 ? c.sharedProps.join(', ') : '-'} |`,
      );
    });
    lines.push('');
  }

  lines.push('## 후속 조치');
  lines.push('');
  const best = report.bestMatch;
  switch (report.verdict) {
    case 'CREATE_BLOCKED':
      lines.push(
        `- 신규 컴포넌트 생성 금지. **${best?.name ?? '기존 컴포넌트'}** 를 확장(EXTEND)한다.`,
      );
      lines.push(
        '- Contract Engineer(계약 엔지니어)에게 변경 요청 를 발행해 기존 계약에 필요한 prop 을 추가한다 (G3 재진입, additive 변경이면 MINOR).',
      );
      lines.push(
        '- 판정에 이의가 있으면 CEO AI(오케스트레이터)에 에스컬레이션한다 — 가드 우회 금지.',
      );
      break;
    case 'EXTEND_RECOMMENDED':
      lines.push(
        `- **${best?.name ?? '유사 컴포넌트'}** 확장을 우선 검토한다. 확장이 부적절하다는 근거를 Screen Spec 에 기록한 경우에만 신규 생성을 진행한다.`,
      );
      lines.push('- 신규 생성 시 이 리포트를 G1 산출물(Screen Spec)에 첨부한다.');
      break;
    case 'CREATE_OK':
      lines.push(
        '- 신규 계약 생성 진행 가능. 이 리포트를 G0 Task Graph / G1 Screen Spec 에 첨부한다.',
      );
      break;
  }
  lines.push('');
  return lines.join('\n');
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function writeReport(
  root: string,
  report: ReuseReport,
): { jsonPath: string; mdPath: string } {
  const dir = path.join(root, 'reports', 'reuse');
  ensureDir(dir);
  const base = sanitizeFileName(report.target.name);
  const jsonPath = path.join(dir, `${base}.json`);
  const mdPath = path.join(dir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, buildReportMd(report), 'utf8');
  return { jsonPath, mdPath };
}
