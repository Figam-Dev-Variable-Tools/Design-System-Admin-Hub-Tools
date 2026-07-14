/**
 * 축 4 — 순환 복잡도 (major, 임계값: 함수당 <= 15)
 *
 * 측정: 함수 단위 cyclomatic complexity = 1 + 분기 수
 *   분기 = if · for · for-in · for-of · while · do · case · catch · ?: · && · || · ??
 *   중첩 함수의 분기는 그 함수의 것으로 따로 센다 (인라인 핸들러가 부모를 부풀리지 않게).
 *
 * "함수가 길어 보인다"는 판정 사유가 아니다. **분기 수 > 15** 만 판정 사유다.
 */
import type { ParsedFile } from '../lib/ast.ts';
import type { AxisResult, Violation } from '../report.ts';
import { COMPLEXITY, COMPLEXITY_MAX } from '../thresholds.ts';

export function checkComplexity(files: ParsedFile[]): AxisResult {
  const violations: Violation[] = [];
  let functionCount = 0;
  let max = 0;

  for (const pf of files) {
    for (const fn of pf.functions) {
      functionCount += 1;
      if (fn.complexity > max) max = fn.complexity;
      if (fn.complexity <= COMPLEXITY_MAX) continue;

      violations.push({
        axis: COMPLEXITY.axis,
        id: COMPLEXITY.id,
        severity: COMPLEXITY.severity,
        file: fn.file,
        line: fn.line,
        symbol: fn.name,
        measured: `복잡도 ${fn.complexity} > 상한 ${COMPLEXITY_MAX}`,
        threshold: COMPLEXITY.threshold,
        message: `함수 '${fn.name}' 의 순환 복잡도가 ${fn.complexity} 이다 (상한 ${COMPLEXITY_MAX}).`,
        suggestion:
          '분기를 조기 반환·룩업 테이블·하위 함수로 분해한다. 상한 조정은 A01의 ADR 사안이다.',
      });
    }
  }

  return {
    spec: COMPLEXITY,
    scanned: `함수 ${functionCount}개 (최대 복잡도 ${max})`,
    violations,
  };
}
