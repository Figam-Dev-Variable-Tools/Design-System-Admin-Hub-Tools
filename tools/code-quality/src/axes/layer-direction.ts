/**
 * 축 6 — 레이어 역방향 의존 (blocker, 임계값 0건)
 *
 * `packages/ui/src` 의 의존 방향: atoms ← molecules ← organisms ← templates ← pages.
 * atom 이 molecule/organism 을 import 하면 역방향이다 (atom 이 조립물을 알면 atom 이 아니다).
 *
 * 배럴(`packages/ui/src/index.ts`)을 레이어 내부에서 import 하는 것은 규칙에 정의되어 있지
 * 않으므로 **차단하지 않고** UNDEFINED 로 기록한다 (규칙 없는 차단 금지 — 네이밍 가드이 확립한 패턴).
 */
import type { ParsedFile } from '../lib/ast.ts';
import type { AxisResult, UndefinedCase, Violation } from '../report.ts';
import { LAYER_DIRECTION, LAYER_RANK } from '../thresholds.ts';

const UI_LAYER_RE = /^packages\/ui\/src\/(atoms|molecules|organisms|templates|pages)\//;
const UI_BARREL = 'packages/ui/src/index.ts';

function layerOf(file: string): string | null {
  const m = UI_LAYER_RE.exec(file);
  return m ? (m[1] ?? null) : null;
}

export function checkLayerDirection(files: ParsedFile[]): {
  result: AxisResult;
  undefinedCases: UndefinedCase[];
} {
  const violations: Violation[] = [];
  const undefinedCases: UndefinedCase[] = [];
  let layerFiles = 0;

  for (const pf of files) {
    const fromLayer = layerOf(pf.file);
    if (fromLayer === null) continue;
    layerFiles += 1;
    const fromRank = LAYER_RANK[fromLayer] ?? 0;

    for (const edge of pf.imports) {
      if (edge.to === null) continue;

      if (edge.to === UI_BARREL) {
        undefinedCases.push({
          file: pf.file,
          line: edge.line,
          note: `레이어(${fromLayer}) 내부에서 공개 배럴(${UI_BARREL})을 import — 상위 레이어를 간접적으로 끌어온다. 규칙 미정의이므로 차단하지 않음. 아키텍처에 규칙 제정 요청.`,
        });
        continue;
      }

      const toLayer = layerOf(edge.to);
      if (toLayer === null) continue;
      const toRank = LAYER_RANK[toLayer] ?? 0;
      if (toRank <= fromRank) continue; // 정상 방향 (또는 동일 레이어)

      violations.push({
        axis: LAYER_DIRECTION.axis,
        id: LAYER_DIRECTION.id,
        severity: LAYER_DIRECTION.severity,
        file: pf.file,
        line: edge.line,
        symbol: edge.names.join(', ') || edge.specifier,
        measured: `${fromLayer}(rank ${fromRank}) → ${toLayer}(rank ${toRank}) — 역방향 1건`,
        threshold: LAYER_DIRECTION.threshold,
        message: `${fromLayer} 가 상위 레이어 ${toLayer} 를 import 한다 (의존은 atoms 방향으로만 흐른다).`,
        suggestion: `공통 로직이면 하위 레이어(atoms) 또는 레이어 밖 유틸로 내리고, 조립이 필요하면 상위 레이어에서 조립한다.`,
        related: [{ file: edge.to, line: 1 }],
      });
    }
  }

  return {
    result: {
      spec: LAYER_DIRECTION,
      scanned: `packages/ui 레이어 파일 ${layerFiles}건`,
      violations,
    },
    undefinedCases,
  };
}
