// a11y 정적 가드
//
// [왜 정적 스캔인가]
// A11Y-11/12 는 **부재(不在)** 를 요구한다: 'aria-describedby 없는 aria-invalid 가 0건', '필터에
// current 계열 속성 0건'. 부재는 컴포넌트 테스트로 지킬 수 없다 — 새 화면이 새 위반을 들고 오면
// 그 화면의 테스트를 아무도 안 썼기 때문에 아무도 실패하지 않는다. 그래서 shared/token-guard.test.ts
// 와 같은 방식(소스 전수 스캔)으로 못 박는다.
//
// 이 가드는 F2 에서 75건(A11Y-11)과 1건(A11Y-12)을 0으로 만든 뒤 그 상태를 고정한다.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');

interface SourceFile {
  readonly path: string;
  readonly text: string;
}

function collectTsx(dir: string, out: SourceFile[] = []): SourceFile[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsx(full, out);
      continue;
    }
    if (!entry.name.endsWith('.tsx')) continue;
    if (entry.name.endsWith('.test.tsx')) continue;
    out.push({ path: full.replace(SRC, 'src'), text: readFileSync(full, 'utf8') });
  }
  return out;
}

const FILES = collectTsx(SRC);

/** 주석은 지운다 — 규칙을 **설명하는** 주석이 그 규칙의 위반으로 잡히면 안 된다 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** JSX 여는 태그 하나 — 속성 안의 `{...}` 표현식을 삼킨다 */
const OPEN_TAG = /<([A-Za-z][\w.]*)((?:[^<>]|\{[^{}]*\}|\{\{[^{}]*\}\})*?)\/?>/gs;

describe('A11Y-11 — field-association 계약', () => {
  /**
   * aria-invalid 만 있고 aria-describedby 가 없으면 스크린리더는 '잘못됨' 만 알리고 **'왜'를
   * 말하지 못한다**. 감사 시점 위반 75건 → 0건.
   */
  it('aria-invalid 를 쓰는 모든 컨트롤이 aria-describedby 로 이유를 연결한다', () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      const text = stripComments(file.text);
      for (const match of text.matchAll(OPEN_TAG)) {
        const attrs = match[2] ?? '';
        if (!attrs.includes('aria-invalid')) continue;
        if (attrs.includes('aria-describedby')) continue;
        offenders.push(`${file.path} <${match[1] ?? '?'}>`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('A11Y-12 — 필터 선택 상태는 aria-pressed 하나로 말한다', () => {
  /**
   * 같은 toggle 필터가 화면마다 다른 속성으로 노출되면 AT 가 다르게 읽는다. 좌측 필터는
   * navigation 이 아니라 toggle 이므로 current 계열 속성을 쓰지 않는다.
   * (Pagination 의 `aria-current="page"` 는 **진짜 navigation** 이라 정당하다 — @tds/ui 소유이고
   *  이 스캔 범위(apps/admin/src)에 없다.)
   */
  it('필터·패널 컴포넌트에 current 계열 속성이 없다', () => {
    const filters = FILES.filter(
      (file) => file.path.includes('Filter') || file.path.includes('Panel'),
    );
    // 스캔이 실제로 무언가를 보고 있는지 먼저 확인한다 — 0개 파일을 스캔하고 통과하면 그건 통과가 아니다
    expect(filters.length).toBeGreaterThan(0);

    const offenders = filters
      .filter((file) => /aria-current\s*=/.test(stripComments(file.text)))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('선택 가능한 필터 항목은 aria-pressed 로 상태를 노출한다', () => {
    // EsgCategoryFilter 는 사라졌다 — ESG·알림 관리가 복제하던 그 골격이 공유 FilterPanel 로
    // 수렴했다. 이제 이 규칙을 지켜야 하는 자리가 한 곳이라 여기만 보면 된다.
    const tierFilter = FILES.find((file) => file.path.endsWith('TierFilter.tsx'));
    // 경로 구분자는 OS 마다 다르다(join 이 만든 경로다) — 파일명으로만 찾는다
    const filterPanel = FILES.find((file) => file.path.endsWith('FilterPanel.tsx'));

    // find 가 undefined 를 돌려주면 단언이 조용히 무의미해진다 — 파일이 실재하는지 먼저 못 박는다
    expect(tierFilter).toBeDefined();
    expect(filterPanel).toBeDefined();

    expect(tierFilter?.text).toContain('aria-pressed');
    expect(filterPanel?.text).toContain('aria-pressed');
  });
});

describe('스캔 자기 방어', () => {
  /**
   * 이 파일의 모든 단언은 '없음' 을 확인한다 — 스캔이 **0개 파일**을 읽어도 전부 통과한다.
   * 그건 통과가 아니라 측정 불가다. (shared/token-guard.test.ts 의 같은 방어와 같은 이유.)
   */
  it('스캔 대상 tsx 가 내용과 함께 로드된다', () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(FILES.every((file) => file.text.length > 0)).toBe(true);
    // 실제로 aria-invalid 를 쓰는 폼이 스캔 범위 안에 있어야 위 단언이 의미를 갖는다
    expect(FILES.some((file) => file.text.includes('aria-invalid'))).toBe(true);
  });

  it('주석 제거가 코드를 지우지 않는다', () => {
    const sample = stripComments('const a = 1; // aria-current=x\nconst b = 2;');
    expect(sample).toContain('const a = 1;');
    expect(sample).toContain('const b = 2;');
    expect(sample).not.toContain('aria-current');
  });
});
