/**
 * tools/boundary 공유 모듈 — 레지스트리 로딩 · 글롭 매칭 · 소유권 엔트리 정렬
 *
 * generate-codeowners.ts / check-boundary.ts / validate-registry.ts 가 모두
 * 이 모듈을 사용한다. CODEOWNERS 생성과 경계 검사(check-boundary)가 서로 다른
 * 매칭/정렬 로직을 갖지 않도록 여기서 단일화한다.
 *
 * 원천(SSOT): orchestration/registry/agents.json
 * 소유자: A02 (Boundary Enforcer AI)
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 리포지토리 루트 (tools/boundary/src → 3단계 상위) */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const AGENTS_JSON = resolve(ROOT, 'orchestration/registry/agents.json');
export const GATES_JSON = resolve(ROOT, 'orchestration/registry/gates.json');
export const REGISTRY_SCHEMA_JSON = resolve(ROOT, 'orchestration/schemas/agent-registry.v1.json');
export const CODEOWNERS_PATH = resolve(ROOT, '.github/CODEOWNERS');
export const REPORTS_DIR = resolve(ROOT, 'reports/boundary');

/** GitHub 팀 표기 컨벤션: @tds-agents/<slug> */
export const TEAM_PREFIX = '@tds-agents/';

/** 계층 표제 (org-design-v2 §2) */
export const LAYER_TITLES: Record<number, string> = {
  0: 'GOVERNANCE',
  1: 'DEFINITION',
  2: 'PRODUCTION',
  3: 'VERIFICATION',
};

export interface Agent {
  id: string;
  slug: string;
  title: string;
  layer: 0 | 1 | 2 | 3;
  division: string;
  type: 'orchestrator' | 'governor' | 'producer' | 'reviewer' | 'verifier';
  owns: string[];
  reads: string[];
  gate: string | null;
  approves: string[];
  reviewer: string | null;
  blocks: string[];
  blockCondition?: string;
  outputs: string[];
  escalatesTo: string;
  notes?: string | null;
  sequentialExclusiveWith?: string;
}

export interface AgentRegistry {
  version: string;
  description?: string;
  note?: string;
  agents: Agent[];
}

export interface Gate {
  id: string;
  title: string;
  approver: string;
  producers: string[];
  verifiers: string[];
  blockedBy?: { agent: string; condition: string }[];
  [key: string]: unknown;
}

export interface GateRegistry {
  version: string;
  gates: Gate[];
  [key: string]: unknown;
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function loadRegistry(): AgentRegistry {
  return readJson<AgentRegistry>(AGENTS_JSON);
}

export function loadGates(): GateRegistry {
  return readJson<GateRegistry>(GATES_JSON);
}

/** figma:// 가상 경로 — 리포 외부라 CODEOWNERS/파일 매칭 대상이 아니다 */
export const isVirtualPath = (path: string): boolean => path.startsWith('figma://');

/** package.json#version 같은 파일 내부 필드 특수 표기 */
export const isFragmentPath = (path: string): boolean => path.includes('#');

function escapeRegExp(literal: string): string {
  return literal.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/**
 * 글롭 → 정규식 (자체 구현 — minimatch 수준의 부분집합).
 * 지원: `**`(0개 이상의 경로 세그먼트), `*`(세그먼트 내 0개 이상 문자, '/' 제외),
 *       `?`(세그먼트 내 1문자), 나머지는 리터럴.
 * '/'가 없는 패턴(예: tsconfig*.json, *.config.*)은 gitignore 관례에 따라
 * 모든 깊이에서 매칭한다(비앵커). '/'가 있으면 리포 루트 기준 앵커.
 */
export function globToRegExp(glob: string): RegExp {
  const segments = glob.split('/');
  let body = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    const isLast = i === segments.length - 1;
    if (segment === '**') {
      // '**'는 뒤따르는 '/'까지 스스로 소비한다
      body += isLast ? '.*' : '(?:[^/]+/)*';
      continue;
    }
    let segmentRe = '';
    for (const ch of segment) {
      if (ch === '*') segmentRe += '[^/]*';
      else if (ch === '?') segmentRe += '[^/]';
      else segmentRe += escapeRegExp(ch);
    }
    body += segmentRe + (isLast ? '' : '/');
  }
  const anchor = glob.includes('/') ? '^' : '^(?:.*/)?';
  return new RegExp(`${anchor}${body}$`);
}

export interface OwnershipEntry {
  /** 레지스트리 원문 글롭 */
  pattern: string;
  /** 첫 소유자의 layer — 정렬 1키 */
  layer: number;
  /** '/' 세그먼트 수 = 경로 특이도(깊이) — 정렬 2키 */
  depth: number;
  /** 레지스트리 배열 내 첫 소유자 인덱스 — 정렬 3키 (결정성 보장) */
  agentIndex: number;
  /** 첫 소유자의 owns 배열 내 인덱스 — 정렬 4키 (결정성 보장) */
  ownsIndex: number;
  /** 동일 패턴 공동 소유자 (예: A40/A41 apps/*\/src/**) — 레지스트리 순서 유지 */
  owners: Agent[];
  regex: RegExp;
  /** 'file#field' 특수 표기 여부 (check-boundary 전용) */
  fragment: boolean;
  fragmentBase?: string;
  fragmentField?: string;
}

export interface ExcludedPath {
  agent: Agent;
  path: string;
  reason: string;
}

export interface OwnershipModel {
  /**
   * CODEOWNERS 배치 순서로 정렬된 엔트리.
   * GitHub CODEOWNERS는 last-match-wins이므로 layer 오름차순 → 깊이(특이도)
   * 오름차순으로 두어, review/** 등 더 특이한 경로가 뒤에서 상위 소유를 덮는다.
   * check-boundary도 같은 순서를 사용해 "마지막 매치 = 유효 소유자"로 판정한다.
   */
  entries: OwnershipEntry[];
  /** CODEOWNERS에서 제외되는 경로 (figma:// 가상 경로, file#field 특수 표기) */
  excluded: ExcludedPath[];
}

export function buildOwnership(
  agents: Agent[],
  options: { includeFragments?: boolean } = {},
): OwnershipModel {
  const byPattern = new Map<string, OwnershipEntry>();
  const excluded: ExcludedPath[] = [];

  agents.forEach((agent, agentIndex) => {
    agent.owns.forEach((path, ownsIndex) => {
      if (isVirtualPath(path)) {
        excluded.push({ agent, path, reason: 'Figma 가상 경로' });
        return;
      }
      if (isFragmentPath(path)) {
        excluded.push({ agent, path, reason: '파일 내부 필드 특수 표기' });
        if (options.includeFragments) {
          const [base = '', field = ''] = path.split('#');
          byPattern.set(path, {
            pattern: path,
            layer: agent.layer,
            depth: base.split('/').length,
            agentIndex,
            ownsIndex,
            owners: [agent],
            // 필드 소유는 루트 기준 정확히 그 파일에만 해당 (비앵커 규칙 미적용)
            regex: new RegExp(`^${escapeRegExp(base)}$`),
            fragment: true,
            fragmentBase: base,
            fragmentField: field,
          });
        }
        return;
      }
      const existing = byPattern.get(path);
      if (existing) {
        existing.owners.push(agent); // 동일 패턴 공동 소유 (sequentialExclusiveWith 쌍)
        return;
      }
      byPattern.set(path, {
        pattern: path,
        layer: agent.layer,
        depth: path.split('/').length,
        agentIndex,
        ownsIndex,
        owners: [agent],
        regex: globToRegExp(path),
        fragment: false,
      });
    });
  });

  const entries = [...byPattern.values()].sort(
    (a, b) =>
      a.layer - b.layer ||
      a.depth - b.depth ||
      a.agentIndex - b.agentIndex ||
      a.ownsIndex - b.ownsIndex,
  );

  return { entries, excluded };
}

/** 리포 상대 경로 정규화: 백슬래시 → 슬래시, 선행 './' 제거 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}
