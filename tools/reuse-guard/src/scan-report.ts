/**
 * 모듈 추출 스캔 리포트 기록 — reports/reuse/module-candidates-<YYYY-MM-DD>.json + .md
 * 리포트 경로 소유: 재사용 가드
 * page-module-pipeline ② 단계 산출물: ③의 G0 접수 입력값이 된다
 * (docs/tds/guidelines/page-module-pipeline.md — 후보 리포트 없이 신규 모듈 계약 생성 금지).
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './lib/fsutil.ts';

/** 스캔 권고 — check 모드의 Verdict 와 달리 page-module-pipeline 용어(REUSE/EXTEND/CREATE)를 쓴다 */
export type ScanRecommendation = 'REUSE' | 'EXTEND' | 'CREATE';

export type SuggestedLevel = 'atom' | 'molecule' | 'organism';

export interface ScanContractMatch {
  name: string;
  version: string;
  level: string | null;
  contractPath: string;
  nameSimilarity: number;
  /** 후보 루트 속성 키가 없으면 null (이름 단독 비교) */
  propsJaccard: number | null;
  score: number;
}

export interface ScanOccurrence {
  /** 리포 루트 기준 POSIX 상대경로 */
  file: string;
  /** 1-based 시작 라인 */
  line: number;
}

export interface ModuleCandidate {
  /** 구조 기반 제안 후보명 (확정 명칭 아님 — G0 접수 시 재검토) */
  name: string;
  /** 정규화 시그니처: 태그 구조 + 주요 속성 키 */
  signature: string;
  rootTag: string;
  /** 루트 엘리먼트의 정규화 속성 키 (key/ref/스프레드 제외, 정렬) */
  rootAttrs: string[];
  suggestedLevel: SuggestedLevel;
  nodeCount: number;
  depth: number;
  occurrenceCount: number;
  fileCount: number;
  occurrences: ScanOccurrence[];
  /** 대표 시그니처에 병합된 유사 시그니처 (구조 유사도 병합 결과) */
  mergedSignatures: string[];
  bestContract: ScanContractMatch | null;
  recommendation: ScanRecommendation;
}

export interface ModuleScanReport {
  generatedAt: string;
  /** 파일명에 쓰인 스캔 일자 (YYYY-MM-DD) */
  scanDate: string;
  /** 스캔 대상 루트 (apps/<app>/src) */
  scanRoots: string[];
  scannedFiles: number;
  elementsSeen: number;
  /** 모듈 후보 판정 최소 출현 수 */
  minOccurrences: number;
  /** 시그니처 병합에 쓴 구조 유사도 임계값 */
  similarStructureThreshold: number;
  thresholds: { reuse: number; extend: number };
  contractsCompared: number;
  candidates: ModuleCandidate[];
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

const RECOMMENDATION_LABELS: Record<ScanRecommendation, string> = {
  REUSE: 'REUSE — 기존 컴포넌트 소비로 교체 (사본 제거)',
  EXTEND: 'EXTEND — 기존 계약 확장 검토 (계약 엔지니어 변경 요청)',
  CREATE: 'CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)',
};

/** 표 셀용 위치 요약: 앞 3곳 + "외 n곳" */
function summarizeLocations(occ: ScanOccurrence[]): string {
  const shown = occ.slice(0, 3).map((o) => `${o.file}:${o.line}`);
  const rest = occ.length - shown.length;
  return shown.join('<br>') + (rest > 0 ? `<br>외 ${rest}곳` : '');
}

export function buildScanReportMd(report: ModuleScanReport): string {
  const lines: string[] = [];
  lines.push(`# 모듈 추출 스캔 — ${report.scanDate}`);
  lines.push('');
  lines.push(
    '> page-module-pipeline **② 페이지 조사 · 공통 모듈 후보 추출** (재사용 가드 Component Reuse AI) — 어드민 페이지의 반복 UI 패턴을 공통 모듈 후보로 승격 제안한다 (docs/tds/guidelines/page-module-pipeline.md).',
  );
  lines.push('');
  lines.push(`- 실행 시각: ${report.generatedAt}`);
  lines.push(
    `- 스캔 범위: ${report.scanRoots.length > 0 ? report.scanRoots.join(', ') : '(대상 없음)'} — .tsx ${report.scannedFiles}개 파일, JSX 엘리먼트 ${report.elementsSeen}개`,
  );
  lines.push(
    `- 후보 기준: 정규화 시그니처(태그 구조 + 주요 속성 키) 동일 — 또는 유사 구조(태그 골격 동일 + 속성 키 자카드 >= ${pct(report.similarStructureThreshold)}) 병합 — 출현 ${report.minOccurrences}회 이상`,
  );
  lines.push(
    `- 권고 기준(기존 계약 유사도): >= ${pct(report.thresholds.reuse)} REUSE · ${pct(report.thresholds.extend)}~${pct(report.thresholds.reuse)} EXTEND · < ${pct(report.thresholds.extend)} CREATE (비교 계약 ${report.contractsCompared}건)`,
  );
  lines.push(
    '- 제안 레벨 기준: 리프(깊이 1) atom · 깊이 2 molecule · 깊이 3+ organism (Storybook 카테고리 판정 기준과 동일)',
  );
  lines.push('');

  if (report.candidates.length === 0) {
    lines.push('## 모듈 후보: 없음');
    lines.push('');
    lines.push(
      `최소 출현 수(${report.minOccurrences}회) 기준을 넘는 반복 패턴이 발견되지 않았다. 페이지 구현이 진행된 뒤 다시 스캔한다.`,
    );
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`## 모듈 후보 (${report.candidates.length}건)`);
  lines.push('');
  lines.push('| # | 후보명 | 출현 수 | 위치 | 제안 레벨 | 기존 계약 유사도 | 권고 |');
  lines.push('|---|---|---|---|---|---|---|');
  report.candidates.forEach((c, i) => {
    const contract = c.bestContract
      ? `${c.bestContract.name} ${pct(c.bestContract.score)}`
      : '- (비교 계약 없음)';
    lines.push(
      `| ${i + 1} | ${c.name} | ${c.occurrenceCount} (${c.fileCount}개 파일) | ${summarizeLocations(c.occurrences)} | ${c.suggestedLevel} | ${contract} | ${c.recommendation} |`,
    );
  });
  lines.push('');

  lines.push('## 후보 상세');
  lines.push('');
  report.candidates.forEach((c, i) => {
    lines.push(`### ${i + 1}. ${c.name} — ${RECOMMENDATION_LABELS[c.recommendation]}`);
    lines.push('');
    lines.push('```');
    lines.push(c.signature);
    lines.push('```');
    lines.push('');
    lines.push(
      `- 구조: 루트 \`${c.rootTag}\` · 노드 ${c.nodeCount}개 · 깊이 ${c.depth} → 제안 레벨 **${c.suggestedLevel}**`,
    );
    lines.push(
      `- 루트 속성 키: ${c.rootAttrs.length > 0 ? c.rootAttrs.map((a) => `\`${a}\``).join(', ') : '(없음)'}`,
    );
    lines.push(`- 출현 위치 (${c.occurrenceCount}곳):`);
    for (const o of c.occurrences) {
      lines.push(`  - ${o.file}:${o.line}`);
    }
    if (c.mergedSignatures.length > 0) {
      lines.push(`- 병합된 유사 시그니처 ${c.mergedSignatures.length}건:`);
      for (const s of c.mergedSignatures) {
        lines.push(`  - \`${s}\``);
      }
    }
    if (c.bestContract) {
      lines.push(
        `- 최근접 계약: **${c.bestContract.name}**@${c.bestContract.version} (${c.bestContract.contractPath}) — 이름 유사도 ${pct(c.bestContract.nameSimilarity)}${
          c.bestContract.propsJaccard === null
            ? ''
            : ` · 속성 자카드 ${pct(c.bestContract.propsJaccard)}`
        } · 종합 ${pct(c.bestContract.score)}`,
      );
    } else {
      lines.push('- 최근접 계약: 없음 (contracts/ 비어 있음 — 부트스트랩 단계)');
    }
    lines.push('');
  });

  lines.push('## 후속 조치');
  lines.push('');
  lines.push(
    '- **REUSE** 후보: 페이지 로컬 사본을 기존 컴포넌트 소비로 교체한다 (프론트 구현) — 사본 잔존은 중복률 SLO(<= 3%) 위반.',
  );
  lines.push(
    '- **EXTEND** 후보: 기존 계약 확장을 우선 검토한다 — 계약 엔지니어에 변경 요청 발행 (G3 재진입, additive 변경이면 MINOR).',
  );
  lines.push(
    '- **CREATE** 후보: 후보 1건 = 1 Task 로 G0 접수한다. 접수 시 `pnpm --filter @tds/reuse-guard run check --name <후보명> --props <속성들>` 로 정밀 판정을 다시 받는다 (본 스캔의 속성 키는 계약 props 만큼 정제되지 않았다).',
  );
  lines.push(
    '- 이 리포트 없이 신규 모듈 계약(G3)을 생성하는 것은 금지된다 (page-module-pipeline §2-②).',
  );
  lines.push('');
  return lines.join('\n');
}

export function writeScanReport(
  root: string,
  report: ModuleScanReport,
): { jsonPath: string; mdPath: string } {
  const dir = path.join(root, 'reports', 'reuse');
  ensureDir(dir);
  const base = `module-candidates-${report.scanDate}`;
  const jsonPath = path.join(dir, `${base}.json`);
  const mdPath = path.join(dir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, buildScanReportMd(report), 'utf8');
  return { jsonPath, mdPath };
}
