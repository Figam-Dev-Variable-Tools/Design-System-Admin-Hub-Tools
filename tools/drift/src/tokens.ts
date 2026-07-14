/**
 * 미사용 토큰 분석 모듈.
 *
 * "사용됨"의 정의 (셋 중 하나라도 충족):
 *   1. contracts/*.contract.json 의 tokens 블록 값으로 참조됨 (예: "color.action.primary.default")
 *   2. tokens.json 내부에서 DTCG alias({color.brand.500})로 다른 토큰이 참조함 (중간 계층 보호)
 *   3. packages/ui/src 코드에서 var(--tds-<path-with-dashes>) 로 사용됨
 *
 * CSS 변수명 ↔ 토큰 경로 매칭은 양쪽 모두 구분자를 '-'로 정규화해 비교한다
 * (토큰 세그먼트에 하이픈이 포함될 수 있어 역변환이 모호하기 때문 — 예: focus-visible).
 */
import fs from 'node:fs';
import path from 'node:path';

/** DTCG 트리에서 $value를 가진 노드의 dot-path 전체 목록을 수집한다. */
export function flattenTokenPaths(
  node: unknown,
  prefix: string[] = [],
  out: string[] = [],
): string[] {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return out;
  const record = node as Record<string, unknown>;
  if ('$value' in record) {
    out.push(prefix.join('.'));
    return out;
  }
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('$')) continue; // $schema, $description 등 메타 키
    flattenTokenPaths(value, [...prefix, key], out);
  }
  return out;
}

/** tokens.json 내부의 DTCG alias 참조({a.b.c})를 전부 수집한다. */
export function collectAliasReferences(node: unknown, out = new Set<string>()): Set<string> {
  if (typeof node === 'string') {
    for (const m of node.matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)) {
      const ref = m[1];
      if (ref) out.add(ref);
    }
    return out;
  }
  if (node !== null && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectAliasReferences(value, out);
    }
  }
  return out;
}

/** contracts/*.contract.json 의 tokens 블록 값(dot-path)을 전부 수집한다. */
export function collectContractTokenRefs(contractsDir: string): Set<string> {
  const refs = new Set<string>();
  if (!fs.existsSync(contractsDir)) return refs;
  for (const entry of fs.readdirSync(contractsDir)) {
    if (!entry.endsWith('.contract.json')) continue;
    try {
      const contract = JSON.parse(fs.readFileSync(path.join(contractsDir, entry), 'utf8')) as {
        tokens?: Record<string, string>;
      };
      for (const value of Object.values(contract.tokens ?? {})) refs.add(value);
    } catch {
      // 계약 파싱 실패는 A74/A19 관할 — 여기서는 조용히 건너뛴다
    }
  }
  return refs;
}

/** 파일 목록에서 var(--tds-...) 사용 변수명(--tds- 이후 부분)을 전부 수집한다. */
export function collectCssVarUsage(files: string[]): Set<string> {
  const used = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(/var\(\s*--tds-([a-zA-Z0-9-]+)/g)) {
      const name = m[1];
      if (name) used.add(name.toLowerCase());
    }
  }
  return used;
}

/** dot-path → 하이픈 정규화 (color.action.primary.default → color-action-primary-default) */
export function normalizeTokenPath(tokenPath: string): string {
  return tokenPath.replace(/\./g, '-').toLowerCase();
}

export interface UnusedTokenAnalysis {
  totalTokens: number;
  usedCount: number;
  unusedCount: number;
  /** 0 ~ 1 */
  unusedRatio: number;
  unused: string[];
}

/** 전체 토큰 대비 미사용 토큰 비율을 계산한다. */
export function analyzeUnusedTokens(
  tokensJson: unknown,
  contractRefs: Set<string>,
  cssVarUsage: Set<string>,
): UnusedTokenAnalysis {
  const all = flattenTokenPaths(tokensJson);
  const aliasRefs = collectAliasReferences(tokensJson);

  const unused = all.filter((tokenPath) => {
    if (contractRefs.has(tokenPath)) return false;
    if (aliasRefs.has(tokenPath)) return false;
    if (cssVarUsage.has(normalizeTokenPath(tokenPath))) return false;
    return true;
  });

  return {
    totalTokens: all.length,
    usedCount: all.length - unused.length,
    unusedCount: unused.length,
    unusedRatio: all.length === 0 ? 0 : unused.length / all.length,
    unused,
  };
}
