/**
 * 축 4 — Contract ↔ Token (설계서 §5.3)
 *
 * 검사 항목:
 *  1) 계약 tokens 블록의 모든 경로가 tokens/tokens.json(DTCG)에 실존하는지
 *  2) 해당 컴포넌트의 packages/ui/src/** 소스에 하드코딩 hex/px 가 없는지 스캔
 *
 * 하드코딩 스캔 제외 규칙(명시):
 *  - packages/ui/generated/** — 스캔 대상 자체가 src/** 이므로 원천 배제 + 방어적 재확인
 *  - *.stories.tsx — Story 는 데모 데이터 성격의 값 허용 (G5 는 별도 검수)
 *  - *.mdx / *.md — 문서 예시 코드 허용
 *
 * 스캔 정규식: hex = #[0-9a-fA-F]{3,8}\b, px = \b\d+(\.\d+)?px\b
 */
import fs from 'node:fs';
import path from 'node:path';
import { posixBasename, readJson, readText } from '../lib/fsutil.ts';
import type { AxisContext, AxisResult, Check } from '../lib/types.ts';
import { summarizeStatuses } from '../lib/types.ts';

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const PX_RE = /\b\d+(?:\.\d+)?px\b/g;
/** 하드코딩 스캔 대상 확장자 */
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.css', '.scss', '.less'];

/** DTCG tokens.json 에서 점 표기 경로가 실존 토큰인지 확인 */
export function resolveTokenPath(tokens: unknown, dotted: string): boolean {
  const segments = dotted.split('.');
  let node: unknown = tokens;
  for (const seg of segments) {
    if (
      node !== null &&
      typeof node === 'object' &&
      !Array.isArray(node) &&
      seg in (node as Record<string, unknown>)
    ) {
      node = (node as Record<string, unknown>)[seg];
    } else {
      return false;
    }
  }
  if (node !== null && typeof node === 'object') {
    return (
      '$value' in (node as Record<string, unknown>) || 'value' in (node as Record<string, unknown>)
    );
  }
  // 원시값 리프(legacy 포맷)도 존재로 인정
  return node !== undefined && node !== null;
}

interface HardcodeHit {
  file: string;
  line: number;
  match: string;
}

export interface TokenAxisOptions {
  /**
   * true 면 컴포넌트가 계약만 존재(다른 3개 축 산출물 전무)하는 상태 —
   * 축 전체를 SKIP 처리한다 (부트스트랩 단계 배려, 차단 아님).
   */
  contractOnly?: boolean;
}

export function checkTokenAxis(ctx: AxisContext, options?: TokenAxisOptions): AxisResult {
  const { root, contract, ui } = ctx;
  const name = contract.name;
  const checks: Check[] = [];

  if (options?.contractOnly === true) {
    checks.push({
      id: 'token.not-implemented',
      title: 'Token 검증 대상 여부',
      status: 'SKIP',
      detail: '계약만 존재하는 컴포넌트 — 구현 착수 후 tokens 경로/하드코딩 검증 수행 (차단 아님)',
    });
    return { axis: 'token', title: 'Contract ↔ Token', status: 'SKIP', checks };
  }

  // 1) 계약 tokens 경로 실존 검사
  const tokenEntries = Object.entries(contract.tokens ?? {});
  const tokensAbs = path.join(root, 'tokens', 'tokens.json');

  if (tokenEntries.length === 0) {
    checks.push({
      id: 'token.paths',
      title: '계약 tokens 경로 실존',
      status: 'SKIP',
      detail: '계약에 tokens 블록이 없음 (스키마상 필수 — validate:contracts 에서 별도 검출)',
    });
  } else if (!fs.existsSync(tokensAbs)) {
    checks.push({
      id: 'token.paths',
      title: '계약 tokens 경로 실존',
      status: 'SKIP',
      detail: `tokens/tokens.json 미존재 — 토큰 SSOT 생성 전 부트스트랩 단계 (경로 ${tokenEntries.length}건 검증 보류)`,
    });
  } else {
    let tokensDoc: unknown;
    try {
      tokensDoc = readJson<unknown>(tokensAbs);
      for (const [key, tokenPath] of tokenEntries) {
        const exists = resolveTokenPath(tokensDoc, tokenPath);
        checks.push({
          id: `token.path.${key}`,
          title: `tokens.${key} → "${tokenPath}" 실존`,
          status: exists ? 'PASS' : 'FAIL',
          ...(exists
            ? {}
            : {
                detail: `tokens/tokens.json 에 "${tokenPath}" 경로 없음 — Token Engineer(A20)에게 change_request 필요`,
              }),
        });
      }
    } catch (e) {
      checks.push({
        id: 'token.paths',
        title: '계약 tokens 경로 실존',
        status: 'FAIL',
        detail: `tokens/tokens.json 파싱 실패 — ${(e as Error).message}`,
      });
    }
  }

  // 2) 하드코딩 hex/px 스캔 — 해당 컴포넌트의 src/** 소스만 대상
  const sourceRels = ui.files.filter((r) => {
    if (!r.startsWith('src/')) return false;
    if (r.includes('/generated/')) return false; // 방어적 제외 (제외 규칙)
    const base = posixBasename(r);
    if (base.includes('.stories.')) return false; // 제외 규칙: stories
    if (base.endsWith('.mdx') || base.endsWith('.md')) return false; // 제외 규칙: 문서
    const ext = base.slice(base.lastIndexOf('.'));
    if (!SCAN_EXTENSIONS.includes(ext)) return false;
    // 컴포넌트 폴더 하위이거나 <Name>.* 파일명인 소스만 이 컴포넌트 소속으로 판단
    return r.includes(`/${name}/`) || base.startsWith(`${name}.`);
  });

  if (sourceRels.length === 0) {
    checks.push({
      id: 'token.hardcoded',
      title: '하드코딩 hex/px 0건',
      status: 'SKIP',
      detail: `packages/ui/src/** 에 ${name} 소스 없음 — 구현 전 부트스트랩 단계`,
    });
  } else {
    const hits: HardcodeHit[] = [];
    for (const rel of sourceRels) {
      const content = readText(path.join(ui.base, ...rel.split('/')));
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        for (const re of [HEX_RE, PX_RE]) {
          re.lastIndex = 0;
          for (const m of line.matchAll(re)) {
            hits.push({ file: `packages/ui/${rel}`, line: i + 1, match: m[0] });
          }
        }
      }
    }
    if (hits.length === 0) {
      checks.push({
        id: 'token.hardcoded',
        title: '하드코딩 hex/px 0건',
        status: 'PASS',
        detail: `${sourceRels.length}개 파일 스캔 — 위반 없음`,
      });
    } else {
      const shown = hits
        .slice(0, 20)
        .map((h) => `${h.file}:${h.line} "${h.match}"`)
        .join(' | ');
      const more = hits.length > 20 ? ` 외 ${hits.length - 20}건` : '';
      checks.push({
        id: 'token.hardcoded',
        title: '하드코딩 hex/px 0건',
        status: 'FAIL',
        detail: `${hits.length}건 검출 — ${shown}${more} (100% 토큰 참조 필수, SLO: 하드코딩 0건)`,
      });
    }
  }

  return {
    axis: 'token',
    title: 'Contract ↔ Token',
    status: summarizeStatuses(checks.map((c) => c.status)),
    checks,
  };
}
