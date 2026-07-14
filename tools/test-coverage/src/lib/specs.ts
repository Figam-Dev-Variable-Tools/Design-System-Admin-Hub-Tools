/**
 * FS 명세 파싱 — specs/**\/FS-*.md 의 §4 예외 명세 표에서 (요소 × 7축) 격자를 만든다.
 *
 * **핵심 판정: "동작이 정의된 요소"를 어떻게 추리는가.**
 *
 * FS 는 화면 요소를 전수 넘버링한다 — 정적 라벨(`FS-001-EL-002 브랜드 워드마크`)부터
 * 비표시 동작(`FS-001-EL-018 제출 로딩 상태`)까지. **전부를 테스트하라고 요구하면 안 된다.**
 * 라벨에 렌더 테스트를 붙이는 것은 커버리지가 아니라 소음이다.
 *
 * 그래서 판정을 **도구의 추측이 아니라 명세 자신의 문장**에 맡긴다:
 *
 *   FS §4 는 요소마다 7축(빈 상태·로딩·실패·유효성·권한없음·경합·대량)의 칸을 **빈칸 없이**
 *   채우도록 강제된다(G9 자기점검: "§4 예외 7축에 빈칸 0건. 모든 N/A 에 사유가 붙어 있다").
 *   축이 성립하지 않는 요소에 대해 명세 작가(A62)는 이미 **`N/A — 고정 문구다`** 처럼
 *   **사유와 함께 N/A 를 선언해 두었다.**
 *
 *   → **동작이 정의된 칸** = N/A 도, 빈칸도, 공통 규칙으로의 순수 위임도 아닌 칸.
 *   → **동작이 정의된 요소** = 그런 칸을 1개 이상 가진 요소.
 *
 * 즉 이 도구는 무엇이 테스트 대상인지 **판단하지 않고 센다**. 판단은 이미 A62가 §4에 했다.
 * 어떤 요소를 테스트 대상에서 빼고 싶으면 도구의 규칙이 아니라 **명세의 칸을 N/A 로 바꿔야** 하고,
 * 그것은 A62의 서명과 A64의 검수를 거친다. 커버리지 하한을 조용히 낮출 경로가 없다.
 */
import {
  EMPTY_CELL,
  EXCEPTION_AXES,
  COMMON_RULE_DELEGATION_ONLY,
  NA_CELL,
  SPECS_DIR,
} from '../thresholds.ts';
import { readText, walkFiles } from './fsutil.ts';

/** 요소 번호 — `FS-001-EL-016` · 하위 번호 `FS-001-EL-016.1` 도 정식 요소다 */
export const ELEMENT_TOKEN = /FS-\d{3}-EL-\d{3}(?:\.\d+)?/g;

export interface ExceptionCell {
  element: string;
  /** EXCEPTION_AXES 의 인덱스 (0..6) */
  axisIndex: number;
  axis: string;
  /** 명세 원문 (요약) — 리포트에 근거로 남긴다 */
  text: string;
  /** 동작이 정의된 칸인가 (= 테스트를 요구하는 칸인가) */
  behavioral: boolean;
  /** behavioral=false 인 사유 */
  excludedBy: 'n/a' | 'empty' | 'common-rule-delegation' | null;
}

export interface SpecElement {
  id: string;
  cells: ExceptionCell[];
  /** 7축 중 동작이 정의된 칸이 1개 이상인가 */
  isTestTarget: boolean;
}

export interface Spec {
  id: string;
  file: string;
  elements: SpecElement[];
  /** 대조 불가 사유 — 있으면 blocker (측정 불가 ≠ 통과) */
  unmeasurable: string | null;
}

/** 마크다운 셀 정규화 — 강조·코드·링크 껍데기를 벗겨 판정에 쓸 본문만 남긴다 */
function normalizeCell(raw: string): string {
  return raw
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\\\|/g, '|')
    .trim();
}

/**
 * 동작이 정의된 칸인지 판정한다. 규칙은 thresholds.ts 에 상수로 노출돼 있다.
 * (규칙을 코드에 명시하고 리포트에 근거를 남긴다 — 판정이 재현 가능해야 차단할 수 있다.)
 */
function classify(raw: string): Pick<ExceptionCell, 'behavioral' | 'excludedBy'> {
  const text = normalizeCell(raw);
  if (EMPTY_CELL.test(text)) return { behavioral: false, excludedBy: 'empty' };
  if (NA_CELL.test(text)) return { behavioral: false, excludedBy: 'n/a' };

  // 공통 규칙으로의 **순수 위임**만 제외한다. 괄호 사유가 붙어도 위임은 위임이다.
  // 요소 고유의 단언이 덧붙으면(— 뒤 문장, 마침표 뒤 문장 등) 그것은 동작이다.
  const withoutParenthetical = text.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (COMMON_RULE_DELEGATION_ONLY.test(withoutParenthetical)) {
    return { behavioral: false, excludedBy: 'common-rule-delegation' };
  }

  return { behavioral: true, excludedBy: null };
}

/** `| a | b | c |` → ['a','b','c'] (이스케이프된 `\|` 는 셀 구분자가 아니다) */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') {
      cur += '\\|';
      i++;
      continue;
    }
    if (line[i] === '|') {
      cells.push(cur);
      cur = '';
      continue;
    }
    cur += line[i];
  }
  cells.push(cur);
  // 선행·후행 파이프로 생긴 빈 셀 제거
  if ((cells[0] ?? '').trim() === '') cells.shift();
  if ((cells[cells.length - 1] ?? '').trim() === '') cells.pop();
  return cells;
}

export function loadSpecs(root: string): Spec[] {
  const files = walkFiles(root, SPECS_DIR, ['.md']).filter((f) => /\/FS-\d{3}[^/]*\.md$/.test(f));

  return files.map((file) => {
    const src = readText(root, file);
    const id = /FS-(\d{3})/.exec(file)?.[0] ?? file;

    // §4 예외 명세 절만 잘라낸다 (§3 요소 명세 표와 섞이면 대조가 오염된다)
    const start = src.search(/^##\s*4\.\s*예외\s*명세/m);
    if (start === -1) {
      return {
        id,
        file,
        elements: [],
        unmeasurable: '§4 예외 명세 절을 찾을 수 없다 — 예외 7축을 대조할 수 없다 (A62 경유 A64)',
      };
    }
    const rest = src.slice(start + 1);
    const nextHeading = rest.search(/^##\s/m);
    const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

    const rows = section
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|'));

    const elements: SpecElement[] = [];
    for (const row of rows) {
      const cells = splitRow(row);
      if (cells.length < 8) continue;
      const head = normalizeCell(cells[0] ?? '');
      const idMatch = /^FS-\d{3}-EL-\d{3}(?:\.\d+)?$/.exec(head);
      if (idMatch === null) continue; // 헤더행·구분행·요약행

      const exceptionCells: ExceptionCell[] = EXCEPTION_AXES.map((axis, i) => {
        const raw = cells[i + 1] ?? '';
        const { behavioral, excludedBy } = classify(raw);
        return {
          element: head,
          axisIndex: i,
          axis: axis.header,
          text: normalizeCell(raw).slice(0, 160),
          behavioral,
          excludedBy,
        };
      });

      elements.push({
        id: head,
        cells: exceptionCells,
        isTestTarget: exceptionCells.some((c) => c.behavioral),
      });
    }

    const unmeasurable =
      elements.length === 0
        ? '§4 예외 표에 요소 행이 0건이다 — 대조할 격자가 없다 (A62 경유 A64에 예외 표 보완 요청)'
        : null;

    return { id, file, elements, unmeasurable };
  });
}
