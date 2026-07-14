/**
 * 축 2 — 도메인이 새는 공통 모듈 (blocker, 임계값 0건)
 *
 * 공통 모듈(`apps/admin/src/shared/ui/**`, `packages/ui/src/**`)이 도메인(회원·운영자·권한·등급)을
 * 알면 그것은 이미 공통이 아니다. 공통 모듈은 **값과 콜백만 받는다** — 도메인 값은 prop 주입.
 *
 * 두 갈래로 잡는다:
 *   (a) domain-module — 공통 모듈이 도메인 소스 경로(pages, shared/domain, shared/permissions)를 import
 *   (b) domain-symbol — import 한 심볼명이 도메인 어휘(Member…, Role…, TIER_… )에 걸림 (경로 무관)
 */
import type { ParsedFile } from '../lib/ast.ts';
import type { AxisResult, Violation } from '../report.ts';
import {
  COMMON_MODULE_ROOTS,
  DOMAIN_LEAK,
  DOMAIN_SOURCE_PATTERNS,
  DOMAIN_SYMBOL_PATTERNS,
} from '../thresholds.ts';

export function isCommonModule(file: string): boolean {
  return COMMON_MODULE_ROOTS.some((r) => file.startsWith(r));
}

function isDomainSource(target: string): boolean {
  return DOMAIN_SOURCE_PATTERNS.some((re) => re.test(target));
}

function domainSymbols(names: string[]): string[] {
  return names.filter((n) => DOMAIN_SYMBOL_PATTERNS.some((re) => re.test(n)));
}

export function checkDomainLeak(files: ParsedFile[]): AxisResult {
  const violations: Violation[] = [];
  let commonFiles = 0;

  for (const pf of files) {
    if (!isCommonModule(pf.file)) continue;
    commonFiles += 1;

    for (const edge of pf.imports) {
      // (a) 도메인 소스 경로 import — 해석된 대상이 도메인 영역이면 그 자체로 누수
      if (edge.to !== null && isDomainSource(edge.to)) {
        violations.push({
          axis: DOMAIN_LEAK.axis,
          id: DOMAIN_LEAK.id,
          severity: DOMAIN_LEAK.severity,
          file: pf.file,
          line: edge.line,
          symbol: edge.names.join(', ') || edge.specifier,
          measured: `공통 모듈 → 도메인 소스 \`${edge.to}\` (1건)`,
          threshold: DOMAIN_LEAK.threshold,
          message: `공통 모듈이 도메인 소스(${edge.to})를 import 한다 — 공통 모듈이 도메인을 알면 이미 공통이 아니다.`,
          suggestion:
            '도메인 값·라벨·타입은 공통 모듈이 import 하지 말고 **prop 으로 주입**받는다 (제네릭 또는 값/콜백 prop).',
          related: [{ file: edge.to, line: 1 }],
        });
        continue;
      }

      // (b) 도메인 어휘 심볼 import — 경로가 어디든 이름이 도메인이면 누수
      const hits = domainSymbols(edge.names);
      if (hits.length > 0) {
        violations.push({
          axis: DOMAIN_LEAK.axis,
          id: DOMAIN_LEAK.id,
          severity: DOMAIN_LEAK.severity,
          file: pf.file,
          line: edge.line,
          symbol: hits.join(', '),
          measured: `도메인 어휘 심볼 ${hits.length}건 (from '${edge.specifier}')`,
          threshold: DOMAIN_LEAK.threshold,
          message: `공통 모듈이 도메인 타입/상수(${hits.join(', ')})를 import 한다.`,
          suggestion:
            '도메인 값은 prop 으로 주입한다 (예: Badge 가 MemberTier 를 알지 말고 label·tone 을 받는다).',
        });
      }
    }
  }

  return {
    spec: DOMAIN_LEAK,
    scanned: `공통 모듈 파일 ${commonFiles}건 (${COMMON_MODULE_ROOTS.join(', ')})`,
    violations,
  };
}
