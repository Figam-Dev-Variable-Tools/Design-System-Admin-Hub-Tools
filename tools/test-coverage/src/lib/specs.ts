/**
 * FSD 명세 파싱 — `docs/FSD/**\/*.md` 의 §7 예외 처리 표에서 (화면 ID × 예외 상황) 격자를 만든다.
 *
 * **핵심 판정: "동작이 정의된 예외"를 어떻게 추리는가.**
 *
 * FSD §7 은 **12개 상황을 전부** 적도록 강제된다 — 성립하지 않는 상황도 행을 지우지 못하고
 * `해당 없음 — 〈사유〉` 를 적어야 한다. 템플릿이 그 이유를 직접 말한다:
 *
 *   > 행을 지우지 않는다 — 빈 행은 '요구가 없다' 와 '아직 안 봤다' 를 구분하지 못한다.
 *   — `docs/FSD/_template.md` §7
 *
 * 그래서 판정을 **도구의 추측이 아니라 명세 자신의 문장**에 맡긴다:
 *
 *   → **동작이 정의된 칸** = `해당 없음` 도, 빈칸도, 다른 문서로의 순수 위임도 아닌 칸.
 *   → **테스트 대상 화면** = 그런 칸을 1개 이상 가진 화면.
 *
 * 즉 이 도구는 무엇이 테스트 대상인지 **판단하지 않고 센다**. 판단은 이미 기능 명세가 §7에 했다.
 * 어떤 상황을 테스트 대상에서 빼고 싶으면 도구의 규칙이 아니라 **명세의 칸을 `해당 없음` 으로**
 * 바꿔야 하고, 그것은 명세 리뷰의 검수를 거친다. 커버리지 하한을 조용히 낮출 경로가 없다.
 * (그마저도 이 도구는 **분모 축소**로 감지해 신고한다 — `axes/fs-exceptions.ts`.)
 *
 * 대조 단위를 왜 §7 로 골랐는가는 `thresholds.ts` 의 `EXCEPTION_SITUATIONS` 주석에 있다.
 */
import {
  DELEGATION_ONLY,
  DITTO_CELL,
  EMPTY_CELL,
  EXCEPTION_SITUATIONS,
  EXCEPTION_TABLE_HEADER,
  NA_CELL,
  SITUATION_SEPARATOR,
  SPEC_NON_SCREEN_FILES,
  SPECS_DIR,
} from '../thresholds.ts';
import { readText, walkFiles } from './fsutil.ts';

/**
 * 화면 ID — 라우트 경로 기반(`SCR-USERS-MEMBERS`) · 팝업(`POP-…`) · 탭(`TAB-…`).
 * `docs/FSD/id-convention.md` §3 이 정본이다.
 */
export const SCREEN_ID_TOKEN = /\b(?:SCR|POP|TAB)-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*/g;

export interface ExceptionCell {
  /** 화면 ID */
  screen: string;
  /** 상황 이름 (정본 12 중 하나, 또는 문서가 추가한 고유 상황) */
  situation: string;
  /** 정본 12 중 몇 번째인가 (0..11) · 문서 고유 상황이면 null */
  situationIndex: number | null;
  /** 명세 원문 (요약) — 리포트에 근거로 남긴다 */
  text: string;
  /** 동작이 정의된 칸인가 (= 테스트를 요구하는 칸인가) */
  behavioral: boolean;
  /** behavioral=false 인 사유 */
  excludedBy: 'not-applicable' | 'empty' | 'delegation' | null;
}

export interface Spec {
  /** 화면 ID — 대조 키 */
  id: string;
  file: string;
  cells: ExceptionCell[];
  /** §7 이 "…와 같다" 로 가리킨 문서에서 물려받은 상황 수 */
  inheritedFrom: string[];
  /** 템플릿이 강제한 12상황 중 §7 표에도, 상속으로도 채워지지 않은 것 */
  missingSituations: string[];
  /** 동작이 정의된 칸이 1개 이상인가 */
  isTestTarget: boolean;
  /** 대조 불가 사유 — 있으면 blocker (측정 불가 ≠ 통과) */
  unmeasurable: string | null;
}

/** 화면 문서가 아니어서 격자에 넣지 못한 파일 — 침묵하지 않고 리포트에 센다 */
export interface SkippedDoc {
  file: string;
  reason: string;
}

export interface SpecLoad {
  specs: Spec[];
  /** 화면 ID 가 없어 격자에 넣지 못한 문서 — 리포트에 드러낸다 (조용한 제외 금지) */
  skipped: SkippedDoc[];
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

/** 상황 라벨 정규화 — `**중복 데이터**(그룹명)` → `중복 데이터` */
function normalizeSituationLabel(raw: string): string {
  return normalizeCell(raw)
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .trim();
}

/** 라벨 → 정본 12 중 인덱스. 못 찾으면 -1 (문서 고유 상황) */
function situationIndexOf(label: string): number {
  const lower = label.toLowerCase();
  return EXCEPTION_SITUATIONS.findIndex((s) =>
    s.aliases.some((a) => lower === a.toLowerCase() || lower.startsWith(`${a.toLowerCase()} `)),
  );
}

/**
 * 동작이 정의된 칸인지 판정한다. 규칙은 thresholds.ts 에 상수로 노출돼 있다.
 * (규칙을 코드에 명시하고 리포트에 근거를 남긴다 — 판정이 재현 가능해야 차단할 수 있다.)
 */
function classify(raw: string): Pick<ExceptionCell, 'behavioral' | 'excludedBy'> {
  const text = normalizeCell(raw);
  if (EMPTY_CELL.test(text)) return { behavioral: false, excludedBy: 'empty' };
  if (NA_CELL.test(text)) return { behavioral: false, excludedBy: 'not-applicable' };
  if (DELEGATION_ONLY.test(text)) return { behavioral: false, excludedBy: 'delegation' };
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

/** `## <n>.` 절 하나를 잘라낸다 (다음 `## ` 직전까지) */
function sectionOf(src: string, n: number): string | null {
  const start = src.search(new RegExp(`^##[ \\t]*${n}\\.`, 'm'));
  if (start === -1) return null;
  const rest = src.slice(start + 3);
  const next = rest.search(/^##[ \t]/m);
  return next === -1 ? rest : rest.slice(0, next);
}

interface MdTable {
  header: string[];
  rows: string[][];
}

/** 절 안의 표들을 (헤더, 본문행) 으로 뽑는다 */
function tablesOf(section: string): MdTable[] {
  const lines = section.split('\n').map((l) => l.trim());
  const out: MdTable[] = [];
  for (let i = 0; i < lines.length; i++) {
    const sep = lines[i + 1] ?? '';
    if (!(lines[i] ?? '').startsWith('|') || !/^\|[\s\-:|]+\|$/.test(sep)) continue;
    const header = splitRow(lines[i] ?? '').map((c) => normalizeCell(c));
    const rows: string[][] = [];
    let j = i + 2;
    while (j < lines.length && (lines[j] ?? '').startsWith('|')) {
      rows.push(splitRow(lines[j] ?? ''));
      j++;
    }
    out.push({ header, rows });
    i = j;
  }
  return out;
}

const squeeze = (s: string): string => s.replace(/\s+/g, '');

/** §7 안에는 보조 표(격차 표 등)가 함께 온다 — **정본 헤더를 가진 표만** 격자로 읽는다 */
function isExceptionTable(header: string[]): boolean {
  return (
    header.length >= EXCEPTION_TABLE_HEADER.length &&
    EXCEPTION_TABLE_HEADER.every((h, i) => squeeze(header[i] ?? '') === squeeze(h))
  );
}

/**
 * §1 화면 개요 표의 `화면 ID` 칸에서 화면 ID 를 뽑는다.
 * `해당 없음 — …` 이면 이 문서는 라우트를 가진 화면이 아니다(예: `_common/index.md`).
 */
function screenIdOf(src: string): string | null {
  const sec = sectionOf(src, 1) ?? src;
  for (const t of tablesOf(sec)) {
    for (const row of t.rows) {
      if (squeeze(normalizeCell(row[0] ?? '')) !== '화면ID') continue;
      const value = normalizeCell(row[1] ?? '');
      SCREEN_ID_TOKEN.lastIndex = 0;
      const m = SCREEN_ID_TOKEN.exec(value);
      return m === null ? null : m[0];
    }
  }
  return null;
}

function parseExceptionTable(
  id: string,
  table: MdTable,
): { cells: ExceptionCell[]; seen: Set<number> } {
  const cells: ExceptionCell[] = [];
  const seen = new Set<number>();
  // `〃` 는 윗행 판정을 물려받는다. 첫 행에 오면 물려받을 것이 없으므로 빈칸으로 둔다.
  let previous: Pick<ExceptionCell, 'behavioral' | 'excludedBy'> = {
    behavioral: false,
    excludedBy: 'empty',
  };

  for (const row of table.rows) {
    const label = normalizeSituationLabel(row[0] ?? '');
    if (label === '') continue;
    const raw = row[1] ?? '';
    const verdict = DITTO_CELL.test(normalizeCell(raw)) ? previous : classify(raw);
    previous = verdict;

    // 한 행이 여러 상황을 겹쳐 적을 수 있다 — `저장 실패 · 수정 실패 · 삭제 실패`
    for (const part of label.split(SITUATION_SEPARATOR)) {
      const name = part.trim();
      if (name === '') continue;
      const idx = situationIndexOf(name);
      if (idx !== -1) {
        if (seen.has(idx)) continue; // 같은 상황이 두 행에 나오면 첫 행만 센다
        seen.add(idx);
      }
      cells.push({
        screen: id,
        situation: idx === -1 ? name : (EXCEPTION_SITUATIONS[idx]?.header ?? name),
        situationIndex: idx === -1 ? null : idx,
        text: normalizeCell(raw).slice(0, 160),
        behavioral: verdict.behavioral,
        excludedBy: verdict.excludedBy,
      });
    }
  }
  return { cells, seen };
}

/**
 * `[포트폴리오 §7](../items/index.md) 과 같다` — §7 **본문 산문**이 가리키는 다른 명세 문서.
 *
 * 실제 문서가 쓰는 관용이다: 형태가 같은 화면은 §7 을 다시 적지 않고 "…와 같다" 로 가리킨 뒤
 * **다른 줄만** 표로 적는다. 이것을 모르면 도구는 그 화면을 '예외를 안 적은 화면' 으로 오해한다.
 * 표 안(`|` 로 시작하는 줄)의 링크는 세지 않는다 — 그것은 복구 방법 안내지 절 위임이 아니다.
 */
function referencedDocs(section: string, file: string): string[] {
  const dir = file.slice(0, file.lastIndexOf('/'));
  const out: string[] = [];
  for (const line of section.split('\n')) {
    if (line.trim().startsWith('|')) continue;
    for (const m of line.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)) {
      const target = m[1];
      if (target === undefined || /^[a-z]+:/i.test(target)) continue;
      // 상대 경로를 리포 루트 기준 POSIX 경로로 정규화한다
      const parts = `${dir}/${target}`.split('/');
      const stack: string[] = [];
      for (const p of parts) {
        if (p === '.' || p === '') continue;
        if (p === '..') stack.pop();
        else stack.push(p);
      }
      out.push(stack.join('/'));
    }
  }
  return [...new Set(out)];
}

interface ParsedDoc {
  id: string;
  file: string;
  ownCells: ExceptionCell[];
  seen: Set<number>;
  references: string[];
  /** §7 절·정본 표가 아예 없다 (상속으로도 못 채우면 대조 불가) */
  noTable: string | null;
}

export function loadSpecs(root: string): SpecLoad {
  const files = walkFiles(root, SPECS_DIR, ['.md']).filter(
    (f) => !SPEC_NON_SCREEN_FILES.includes(f.slice(f.lastIndexOf('/') + 1)),
  );

  const skipped: SkippedDoc[] = [];
  const ALL_SITUATIONS = EXCEPTION_SITUATIONS.map((s) => s.header);

  /* ── 1차 — 문서마다 자기 §7 표를 읽는다 ─────────────────────────────────── */
  const parsed = new Map<string, ParsedDoc>();
  for (const file of files) {
    const src = readText(root, file);
    const id = screenIdOf(src);
    if (id === null) {
      skipped.push({
        file,
        reason:
          '§1 에 화면 ID 가 없다 — 라우트를 가진 화면이 아니므로 테스트 이름이 가리킬 좌표가 없다',
      });
      continue;
    }

    const section = sectionOf(src, 7);
    if (section === null) {
      parsed.set(file, {
        id,
        file,
        ownCells: [],
        seen: new Set(),
        references: [],
        noTable: '§7 예외 처리 절을 찾을 수 없다 — 예외 상황을 대조할 수 없다 (명세 리뷰)',
      });
      continue;
    }

    const references = referencedDocs(section, file);
    const table = tablesOf(section).find((t) => isExceptionTable(t.header));
    if (table === undefined) {
      parsed.set(file, {
        id,
        file,
        ownCells: [],
        seen: new Set(),
        references,
        noTable: `§7 에 정본 표(${EXCEPTION_TABLE_HEADER.join(' | ')})가 없다 — 대조할 격자가 없다 (명세 리뷰)`,
      });
      continue;
    }

    const { cells, seen } = parseExceptionTable(id, table);
    parsed.set(file, { id, file, ownCells: cells, seen, references, noTable: null });
  }

  /* ── 2차 — "…와 같다" 로 가리킨 문서에서 빠진 상황을 물려받는다 ────────────
   * 상속은 **분모를 줄이지 않는다.** 가리켜진 문서의 상황이 이 화면에도 성립한다고 명세가 말한
   * 것이므로, 그 칸은 이 화면 ID 로 테스트를 요구한다(라우트가 다르면 화면도 다르다). */
  function resolve(
    file: string,
    visiting: Set<string>,
  ): { cells: ExceptionCell[]; from: string[] } {
    const doc = parsed.get(file);
    if (doc === undefined || visiting.has(file)) return { cells: [], from: [] };
    visiting.add(file);

    const cells = [...doc.ownCells];
    const seen = new Set(doc.seen);
    const from: string[] = [];
    for (const ref of doc.references) {
      if (seen.size >= EXCEPTION_SITUATIONS.length) break;
      const inherited = resolve(ref, visiting);
      let took = 0;
      for (const cell of inherited.cells) {
        if (cell.situationIndex === null || seen.has(cell.situationIndex)) continue;
        seen.add(cell.situationIndex);
        cells.push({ ...cell, screen: doc.id });
        took++;
      }
      if (took > 0) from.push(ref);
    }
    visiting.delete(file);
    return { cells, from };
  }

  const specs: Spec[] = [];
  for (const doc of parsed.values()) {
    const { cells, from } = resolve(doc.file, new Set());
    const covered = new Set(cells.map((c) => c.situationIndex).filter((i) => i !== null));
    specs.push({
      id: doc.id,
      file: doc.file,
      cells,
      inheritedFrom: from,
      missingSituations: ALL_SITUATIONS.filter((_, i) => !covered.has(i)),
      isTestTarget: cells.some((c) => c.behavioral),
      unmeasurable:
        cells.length > 0
          ? null
          : (doc.noTable ??
            '§7 예외 표에 상황 행이 0건이다 — 대조할 격자가 없다 (명세 리뷰에 §7 보완 요청)'),
    });
  }

  return { specs, skipped };
}
