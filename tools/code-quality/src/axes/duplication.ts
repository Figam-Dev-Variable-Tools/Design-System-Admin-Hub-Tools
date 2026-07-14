/**
 * 축 3 — 중복 코드 (major, 임계값: 30줄 이상 블록이 2회 이상 반복 = 0건)
 *
 * 측정: 정규화된 코드 블록의 해시 일치.
 *   정규화 = 주석 제거(AST 토큰만 사용) + 공백 제거 + 식별자 익명화($) + 리터럴 익명화(@)
 *   → 변수명·문자열만 바꾼 복붙을 잡는다. 구조가 같으면 중복이다.
 *
 * 슬라이딩 윈도(30줄)로 해시를 만들고, 같은 해시가 2곳 이상이면 1건으로 보고한다.
 * 이미 보고한 클론의 연장선(1줄씩 밀린 윈도)은 중복 보고하지 않는다 (극대 클론만 남긴다).
 */
import crypto from 'node:crypto';
import type { ParsedFile } from '../lib/ast.ts';
import type { AxisResult, Violation } from '../report.ts';
import { DUPLICATION, DUPLICATION_MIN_LINES, DUPLICATION_MIN_OCCURRENCES } from '../thresholds.ts';

interface Occurrence {
  file: string;
  startIdx: number;
  endIdx: number;
  startLine: number;
  endLine: number;
}

export function checkDuplication(files: ParsedFile[]): AxisResult {
  const W = DUPLICATION_MIN_LINES;
  const groups = new Map<string, Occurrence[]>();
  let scannedLines = 0;

  for (const pf of files) {
    const lines = pf.normalizedLines;
    scannedLines += lines.length;
    if (lines.length < W) continue;

    for (let i = 0; i + W <= lines.length; i += 1) {
      const window = lines.slice(i, i + W);
      const text = window.map((l) => l.text).join('\n');
      const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
      const occ: Occurrence = {
        file: pf.file,
        startIdx: i,
        endIdx: i + W - 1,
        startLine: window[0]!.line,
        endLine: window[W - 1]!.line,
      };
      const list = groups.get(hash);
      if (list) list.push(occ);
      else groups.set(hash, [occ]);
    }
  }

  // 2회 이상 반복된 해시만. 결정적 순서(첫 등장 위치)로 정렬한다 — 리포트는 재현 가능해야 한다.
  const clones = [...groups.entries()]
    .filter(([, occs]) => occs.length >= DUPLICATION_MIN_OCCURRENCES)
    .sort((a, b) => {
      const x = a[1][0]!;
      const y = b[1][0]!;
      return x.file === y.file ? x.startIdx - y.startIdx : x.file.localeCompare(y.file);
    });

  /** 이미 보고된 클론이 덮은 라인 인덱스 구간 (file → [start,end][]) */
  const covered = new Map<string, [number, number][]>();
  const isCovered = (o: Occurrence): boolean =>
    (covered.get(o.file) ?? []).some(([s, e]) => o.startIdx >= s && o.startIdx <= e);
  const markCovered = (o: Occurrence): void => {
    const list = covered.get(o.file) ?? [];
    list.push([o.startIdx, o.endIdx]);
    covered.set(o.file, list);
  };

  const violations: Violation[] = [];
  for (const [hash, occs] of clones) {
    // 모든 등장 위치가 이미 보고된 클론 안이면 = 1줄 밀린 같은 클론이다. 건너뛴다.
    if (occs.every(isCovered)) continue;
    occs.forEach(markCovered);

    const head = occs[0]!;
    const rest = occs.slice(1);
    violations.push({
      axis: DUPLICATION.axis,
      id: DUPLICATION.id,
      severity: DUPLICATION.severity,
      file: head.file,
      line: head.startLine,
      symbol: `clone:${hash}`,
      measured: `정규화 ${W}줄 블록이 ${occs.length}곳에서 반복 (임계 ${DUPLICATION_MIN_LINES}줄 · ${DUPLICATION_MIN_OCCURRENCES}회)`,
      threshold: DUPLICATION.threshold,
      message: `동일 구조 블록(${head.file}:${head.startLine}-${head.endLine})이 ${occs.length}곳에 있다.`,
      suggestion:
        '공통 부분을 함수/컴포넌트로 추출한다. 두 곳 이상이 쓰면 공통 모듈(shared/ui · packages/ui)로 올린다.',
      related: rest.map((o) => ({ file: o.file, line: o.startLine })),
    });
  }

  return {
    spec: DUPLICATION,
    scanned: `소스 ${files.length}건 · 정규화 ${scannedLines}줄 (윈도 ${W}줄)`,
    violations,
  };
}
