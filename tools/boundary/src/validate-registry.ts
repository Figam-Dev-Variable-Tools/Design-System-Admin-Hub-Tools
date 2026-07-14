/**
 * validate-registry.ts — agents.json 스키마 검증 + 교차 검증
 *
 * 검증 항목:
 *  1. orchestration/schemas/agent-registry.v1.json(draft 2020-12)으로 ajv 검증
 *  2. 에이전트 수 = 스키마의 minItems/maxItems (하드코딩 금지)
 *  3. id / slug 유일성
 *  4. reviewer 참조 실존 (+ 참조 대상 type이 reviewer인지 — 경고)
 *     sequentialExclusiveWith 참조 실존 + 상호 대칭
 *     escalatesTo 참조 실존 ('human' 허용)
 *  5. gates.json의 approver / producers / verifiers / blockedBy.agent 전부 레지스트리에 실존
 *     (+ GN 게이트 approver의 approves에 해당 게이트 포함 여부 — 경고)
 *  6. 동일 owns 경로 중복 소유 검출 — 상호 sequentialExclusiveWith 쌍만 허용 예외
 *  7. 각 에이전트 owns의 전부-가상-경로 여부 (리포 내 검수 가능한 미러 경로 필요)
 *  8. reads 스코프 — 전역 읽기 글롭 보유자가 ADR 허용 목록/상한을 넘는지 (경고, ADR-0010)
 *  9. skills/<slug>/SKILL.md frontmatter ↔ 레지스트리 정합성 (skills/_templates/ 제외)
 *     - 오류: SKILL.md 부재 · frontmatter 블록 부재 · agent ≠ id · name ≠ slug
 *             · gate 불일치 · reviewer 불일치(frontmatter slug → id 매핑 후 비교)
 *     - 경고: owns 경로 집합 불일치 · escalates-to 불일치
 *             · verifier의 blocks / block-condition / schedule 항목 부재(존재 여부만)
 *     frontmatter는 자체 YAML 단순 파서로 해석 — 외부 yaml 의존성 없음
 *     (key: value 스칼라, [a, b] flow 리스트, 'a, b' 쉼표 연결 스칼라, # 주석 지원)
 *
 * 종료 코드: 오류 ≥ 1 → 1, 경고만 → 0
 * 소유자: A02 (Boundary Enforcer AI)
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import {
  AGENTS_JSON,
  GATES_JSON,
  REGISTRY_SCHEMA_JSON,
  ROOT,
  isVirtualPath,
  loadGates,
  loadRegistry,
  readJson,
  type Agent,
} from './registry.js';

/**
 * 기대 에이전트 수의 정본은 스키마(agent-registry.v1.json)의 minItems/maxItems 다.
 * 여기에 숫자를 또 박으면 조직이 늘어날 때마다 두 곳이 갈라진다 — 스키마에서 읽는다.
 */
function readExpectedAgentCount(): number {
  const schema = readJson(REGISTRY_SCHEMA_JSON) as {
    properties?: { agents?: { minItems?: number; maxItems?: number } };
  };
  const agents = schema.properties?.agents;
  if (agents?.minItems === undefined || agents.minItems !== agents.maxItems) {
    throw new Error(
      'agent-registry.v1.json 의 properties.agents.minItems/maxItems 가 없거나 서로 다릅니다 — 기대 수를 확정할 수 없습니다.',
    );
  }
  return agents.minItems;
}

const EXPECTED_AGENT_COUNT = readExpectedAgentCount();

/**
 * 전역 읽기 스코프 통제 (ADR-0010 T3).
 *
 * `reads: ["**\/*"]` 는 887파일 / 14MB 를 가리킨다 — 정독 비용의 근원이다.
 * 감사 실측(org-audit-2026-07-15 §3.1)에서 7명이 이를 보유했고, 그중 4명(A76·A80·A81·A82)은
 * 도구 출력(리포트)만 읽으면 되는 에이전트였다.
 *
 * 전역 읽기가 **정당한 유일한 근거**는 "판정 대상이 리포 전체"인 경우다:
 *   A00 오케스트레이션(전역 판단) · A01 설계 거부권 · A02 경계 전수 검사 · A86 보안(비밀 노출은 어디에나 있을 수 있다).
 * 감사 처방은 3명(A00/A01/A02)이었고, A86 신설로 상한이 4가 됐다 — 늘리려면 ADR이 필요하다.
 */
const GLOBAL_READ_GLOB = '**/*';
const GLOBAL_READ_ALLOWLIST = new Set(['A00', 'A01', 'A02', 'A86']);
const GLOBAL_READ_LIMIT = GLOBAL_READ_ALLOWLIST.size;

const errors: string[] = [];
const warnings: string[] = [];

// ── SKILL.md frontmatter 단순 YAML 파서 ─────────────────────────────
// SKILL frontmatter가 실제로 쓰는 부분집합만 지원한다 (외부 yaml 의존성 금지):
//   key: value 스칼라 · [a, b] flow 리스트 · 'a, b' 쉼표 연결 스칼라 · # 주석.
// 블록(들여쓰기) 리스트·중첩 맵은 지원하지 않는다 — 템플릿/기존 스킬에 없음.

/**
 * 한 줄에서 YAML 주석을 제거한다.
 * '#'가 줄 시작이거나 공백 뒤에 올 때만 주석 시작으로 본다 — 따옴표 내부는 보존.
 * (예: "package.json#version"의 '#'은 값의 일부)
 */
function stripYamlComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]!))) {
      return line.slice(0, i);
    }
  }
  return line;
}

/**
 * 최상위 쉼표로만 분할한다 — 괄호()/대괄호[]/따옴표 내부의 쉼표는 보존.
 * (예: allowed-tools의 "Bash(pnpm lint, pnpm test)"는 한 항목)
 */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (const ch of text) {
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (!inSingle && !inDouble) {
      if (ch === '(' || ch === '[') depth += 1;
      else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
      else if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
        continue;
      }
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/** 양끝 공백 제거 후 감싸는 따옴표(' 또는 ")를 벗긴다 */
function unquote(value: string): string {
  const trimmed = value.trim();
  const first = trimmed[0];
  if (trimmed.length >= 2 && (first === "'" || first === '"') && trimmed.endsWith(first)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** 스칼라 값 해석 — 빈 값 / 'null' / '~'는 null */
function parseScalar(value: string): string | null {
  const scalar = unquote(value);
  return scalar === '' || scalar === 'null' || scalar === '~' ? null : scalar;
}

/**
 * 리스트 값 해석 — flow 리스트([a, b])와 쉼표 연결 스칼라('a, b')를
 * 문자열 배열로 정규화한다 (각 항목 trim + 따옴표 제거, 빈 항목 제외).
 */
function parseList(value: string): string[] {
  let body = value.trim();
  if (body.startsWith('[') && body.endsWith(']')) body = body.slice(1, -1);
  return splitTopLevel(body)
    .map((item) => unquote(item))
    .filter((item) => item !== '' && item !== 'null');
}

/**
 * SKILL.md 선두의 '---' frontmatter 블록을 key → 원문 값 Map으로 파싱한다.
 * 블록이 없거나 닫는 '---'가 없으면 null. 값 비교는 parseScalar/parseList로 수행.
 */
function parseFrontmatter(markdown: string): Map<string, string> | null {
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  if ((lines[0] ?? '').trim() !== '---') return null;
  const fields = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === '---') return fields;
    const line = stripYamlComment(lines[i]!).trim();
    if (line === '') continue;
    const match = /^([A-Za-z][\w-]*):(?:\s+(.*))?$/.exec(line);
    if (match) fields.set(match[1]!, (match[2] ?? '').trim());
  }
  return null; // 닫는 '---' 없음 — 미종결 블록
}

/** owns 경로 집합 정규화 — 공백 trim(파서에서 완료) + 중복 제거 */
function toPathSet(paths: string[]): Set<string> {
  return new Set(paths.map((p) => p.trim()).filter((p) => p !== ''));
}

function main(): void {
  const registry = loadRegistry();
  const agents = registry.agents ?? [];
  const byId = new Map<string, Agent>(agents.map((a) => [a.id, a]));

  // 1. JSON Schema 검증 (draft 2020-12)
  const schema = readJson<Record<string, unknown>>(REGISTRY_SCHEMA_JSON);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(registry)) {
    for (const err of validate.errors ?? []) {
      errors.push(`[schema] ${err.instancePath || '(root)'} ${err.message ?? ''}`);
    }
  }

  // 2. 에이전트 수
  if (agents.length !== EXPECTED_AGENT_COUNT) {
    errors.push(
      `[count] 에이전트 수 ${agents.length} — 정확히 ${EXPECTED_AGENT_COUNT}개여야 함 (ADR-0001)`,
    );
  }

  // 3. id / slug 유일성
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  for (const agent of agents) {
    if (seenIds.has(agent.id)) errors.push(`[unique] id 중복: ${agent.id}`);
    if (seenSlugs.has(agent.slug)) errors.push(`[unique] slug 중복: ${agent.slug}`);
    seenIds.add(agent.id);
    seenSlugs.add(agent.slug);
  }

  // 4. 참조 무결성 (reviewer / sequentialExclusiveWith / escalatesTo)
  for (const agent of agents) {
    if (agent.reviewer !== null) {
      const reviewer = byId.get(agent.reviewer);
      if (!reviewer) {
        errors.push(`[ref] ${agent.id}.reviewer=${agent.reviewer} — 레지스트리에 없음`);
      } else if (reviewer.type !== 'reviewer') {
        warnings.push(
          `[ref] ${agent.id}.reviewer=${agent.reviewer} — type이 'reviewer'가 아님 (${reviewer.type})`,
        );
      }
      if (agent.reviewer === agent.id) {
        errors.push(`[ref] ${agent.id} — 자가 검수 금지 (P3): reviewer가 자기 자신`);
      }
    }
    if (agent.sequentialExclusiveWith) {
      const peer = byId.get(agent.sequentialExclusiveWith);
      if (!peer) {
        errors.push(
          `[ref] ${agent.id}.sequentialExclusiveWith=${agent.sequentialExclusiveWith} — 레지스트리에 없음`,
        );
      } else if (peer.sequentialExclusiveWith !== agent.id) {
        errors.push(`[ref] ${agent.id} ↔ ${peer.id} — sequentialExclusiveWith가 상호 대칭이 아님`);
      }
    }
    if (agent.escalatesTo !== 'human' && !byId.has(agent.escalatesTo)) {
      errors.push(
        `[ref] ${agent.id}.escalatesTo=${agent.escalatesTo} — 레지스트리에 없음 ('human' 또는 실존 id)`,
      );
    }
  }

  // 5. gates.json 교차 검증
  const gateRegistry = loadGates();
  const gateIds = new Set(gateRegistry.gates.map((g) => g.id));
  for (const gate of gateRegistry.gates) {
    if (!byId.has(gate.approver)) {
      errors.push(`[gates] ${gate.id}.approver=${gate.approver} — 레지스트리에 없음`);
    }
    for (const producer of gate.producers) {
      if (!byId.has(producer))
        errors.push(`[gates] ${gate.id}.producers: ${producer} — 레지스트리에 없음`);
    }
    for (const verifier of gate.verifiers) {
      if (!byId.has(verifier))
        errors.push(`[gates] ${gate.id}.verifiers: ${verifier} — 레지스트리에 없음`);
    }
    for (const blocked of gate.blockedBy ?? []) {
      if (!byId.has(blocked.agent))
        errors.push(`[gates] ${gate.id}.blockedBy: ${blocked.agent} — 레지스트리에 없음`);
    }
    if (/^G\d$/.test(gate.id)) {
      const approver = byId.get(gate.approver);
      if (approver && !approver.approves.includes(gate.id)) {
        warnings.push(`[gates] ${gate.id} approver ${gate.approver}의 approves에 ${gate.id} 없음`);
      }
    }
  }
  // 에이전트의 approves가 gates.json에 실존하는지 (역방향)
  for (const agent of agents) {
    for (const approved of agent.approves) {
      if (!gateIds.has(approved)) {
        errors.push(`[gates] ${agent.id}.approves=${approved} — gates.json에 없는 게이트`);
      }
    }
  }

  // 6. 동일 owns 경로 중복 소유 (sequentialExclusiveWith 상호 쌍만 허용)
  const ownersByPath = new Map<string, Agent[]>();
  for (const agent of agents) {
    for (const path of agent.owns) {
      const list = ownersByPath.get(path) ?? [];
      list.push(agent);
      ownersByPath.set(path, list);
    }
  }
  for (const [path, owners] of ownersByPath) {
    if (owners.length < 2) continue;
    const mutuallyExclusive = owners.every((a) =>
      owners.every(
        (b) =>
          a.id === b.id ||
          (a.sequentialExclusiveWith === b.id && b.sequentialExclusiveWith === a.id),
      ),
    );
    const ownerIds = owners.map((a) => a.id).join(', ');
    if (mutuallyExclusive) {
      warnings.push(`[owns] '${path}' 공동 소유 허용 (순차 배타 쌍): ${ownerIds}`);
    } else {
      errors.push(`[owns] '${path}' 중복 소유 위반 (P1 단일 소유권): ${ownerIds}`);
    }
  }

  // 7. owns 전부-가상-경로 검출
  for (const agent of agents) {
    // 참고: 가상 경로(figma://)는 파일 검증 불가 — check-boundary/CODEOWNERS 대상에서도 제외됨
    if (agent.owns.every((p) => isVirtualPath(p))) {
      errors.push(
        `[owns] ${agent.id} — owns가 전부 가상 경로: 리포 내 검수 가능한 미러 경로 필요 (ADR-0001)`,
      );
    }
  }

  // 8. reads 스코프 — 전역 읽기(`**/*`) 통제 (ADR-0010 T3)
  //    차단(error)이 아니라 경고다: reads 는 owns 와 달리 물리적 강제 대상이 아니라
  //    "정독 예산"의 선언이며, 위반의 대가는 사고가 아니라 토큰 비용이기 때문이다.
  const globalReaders = agents.filter((a) => a.reads.includes(GLOBAL_READ_GLOB));
  for (const agent of globalReaders) {
    if (!GLOBAL_READ_ALLOWLIST.has(agent.id)) {
      warnings.push(
        `[reads] ${agent.id}(${agent.slug}) — reads에 '${GLOBAL_READ_GLOB}' 보유. ` +
          `전역 읽기 허용 목록은 ${[...GLOBAL_READ_ALLOWLIST].join(', ')} 뿐이다 (ADR-0010 T3). ` +
          `실제 필요 경로로 좁히거나 ADR로 허용 목록을 개정하라.`,
      );
    }
  }
  if (globalReaders.length > GLOBAL_READ_LIMIT) {
    warnings.push(
      `[reads] 전역 읽기(${GLOBAL_READ_GLOB}) 보유 ${globalReaders.length}명 — 상한 ${GLOBAL_READ_LIMIT}명 초과 ` +
        `(${globalReaders.map((a) => a.id).join(', ')}). 전역 스코프 1명 = 887파일/14MB 정독 예산 (ADR-0010 T3).`,
    );
  }

  // 9. skills/<slug>/SKILL.md frontmatter ↔ 레지스트리 정합성
  //    레지스트리의 slug만 순회하므로 skills/_templates/는 자연히 검증 대상에서 제외된다.
  //    SKILL.md 부재는 오류 — frontmatter가 레지스트리의 파생물임을 강제한다 (기존 경고에서 승격).
  const idBySlug = new Map<string, string>(agents.map((a) => [a.slug, a.id]));
  for (const agent of agents) {
    const relPath = `skills/${agent.slug}/SKILL.md`;
    const skillPath = resolve(ROOT, relPath);
    if (!existsSync(skillPath)) {
      errors.push(`[skills] ${relPath} 없음 (${agent.id})`);
      continue;
    }
    const fields = parseFrontmatter(readFileSync(skillPath, 'utf8'));
    if (fields === null) {
      errors.push(`[skills] ${relPath} — frontmatter('---' 블록)가 없거나 미종결 (${agent.id})`);
      continue;
    }

    // (e) name ≠ slug
    const name = parseScalar(fields.get('name') ?? '');
    if (name !== agent.slug) {
      errors.push(`[skills] ${relPath} — name=${name ?? '(없음)'} ≠ 레지스트리 slug=${agent.slug}`);
    }

    // (b) agent ≠ id
    const fmAgent = parseScalar(fields.get('agent') ?? '');
    if (fmAgent !== agent.id) {
      errors.push(`[skills] ${relPath} — agent=${fmAgent ?? '(없음)'} ≠ 레지스트리 id=${agent.id}`);
    }

    // (c) gate 불일치 — frontmatter에 gate가 있을 때만 판정.
    //     레지스트리 gate=null이면 frontmatter는 생략 또는 null만 허용.
    if (fields.has('gate')) {
      const fmGate = parseScalar(fields.get('gate')!);
      if (fmGate !== agent.gate) {
        errors.push(
          `[skills] ${relPath} — gate=${fmGate ?? 'null'} ≠ 레지스트리 gate=${agent.gate ?? 'null'}`,
        );
      }
    } else if (agent.gate !== null) {
      warnings.push(`[skills] ${relPath} — gate 항목 없음 (레지스트리 gate=${agent.gate})`);
    }

    // (d) reviewer 불일치 — frontmatter는 slug 표기, 레지스트리는 id 표기 → slug→id 매핑 후 비교.
    //     레지스트리 reviewer=null이면 생략 또는 null만 허용.
    const fmReviewer = fields.has('reviewer') ? parseScalar(fields.get('reviewer')!) : null;
    if (agent.reviewer === null) {
      if (fmReviewer !== null) {
        errors.push(
          `[skills] ${relPath} — reviewer=${fmReviewer} ≠ 레지스트리 reviewer=null (생략 또는 null이어야 함)`,
        );
      }
    } else if (fmReviewer === null) {
      errors.push(`[skills] ${relPath} — reviewer 없음 ≠ 레지스트리 reviewer=${agent.reviewer}`);
    } else {
      const mappedId = idBySlug.get(fmReviewer);
      if (!mappedId) {
        errors.push(`[skills] ${relPath} — reviewer=${fmReviewer} — 해당 slug가 레지스트리에 없음`);
      } else if (mappedId !== agent.reviewer) {
        errors.push(
          `[skills] ${relPath} — reviewer=${fmReviewer}(${mappedId}) ≠ 레지스트리 reviewer=${agent.reviewer}`,
        );
      }
    }

    // owns 경로 집합 불일치 (경고) — figma:// 가상 경로 포함, trim + 중복 제거 후 집합 비교
    const fmOwns = toPathSet(parseList(fields.get('owns') ?? ''));
    const registryOwns = toPathSet(agent.owns);
    const missingOwns = [...registryOwns].filter((p) => !fmOwns.has(p));
    const extraOwns = [...fmOwns].filter((p) => !registryOwns.has(p));
    if (missingOwns.length > 0 || extraOwns.length > 0) {
      const detail = [
        missingOwns.length > 0 ? `누락: ${missingOwns.join(', ')}` : null,
        extraOwns.length > 0 ? `초과: ${extraOwns.join(', ')}` : null,
      ]
        .filter((part) => part !== null)
        .join(' / ');
      warnings.push(`[skills] ${relPath} — owns 집합이 레지스트리와 다름 (${detail})`);
    }

    // escalates-to 불일치 (경고)
    const fmEscalatesTo = parseScalar(fields.get('escalates-to') ?? '');
    if (fmEscalatesTo !== agent.escalatesTo) {
      warnings.push(
        `[skills] ${relPath} — escalates-to=${fmEscalatesTo ?? '(없음)'} ≠ 레지스트리 escalatesTo=${agent.escalatesTo}`,
      );
    }

    // verifier의 blocks / block-condition / schedule — 존재 여부만 확인 (경고)
    if (agent.type === 'verifier') {
      for (const key of ['blocks', 'block-condition', 'schedule']) {
        if (!fields.has(key)) {
          warnings.push(`[skills] ${relPath} — verifier인데 frontmatter에 '${key}' 항목 없음`);
        }
      }
    }
  }

  // 결과 출력
  for (const message of errors) console.error(`ERROR   ${message}`);
  for (const message of warnings) console.warn(`WARN    ${message}`);
  console.log(
    `[validate-registry] agents=${agents.length}, gates=${gateRegistry.gates.length}, ` +
      `오류=${errors.length}, 경고=${warnings.length} → ${errors.length > 0 ? 'FAIL' : 'PASS'}`,
  );
  console.log(`[validate-registry] 대상: ${AGENTS_JSON}`);
  console.log(`[validate-registry] 교차: ${GATES_JSON}`);
  console.log(
    `[validate-registry] 스킬: ${resolve(ROOT, 'skills')} (frontmatter 정합성 · _templates 제외)`,
  );
  if (errors.length > 0) process.exit(1);
}

main();
