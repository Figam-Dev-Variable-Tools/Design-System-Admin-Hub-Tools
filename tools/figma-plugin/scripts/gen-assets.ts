// generated/render-assets.json 생성기 — VRT 베이스라인 스크린샷을 컴포넌트·스토리로 매핑한다.
//
// [왜] Storybook 의 모든 스토리는 이미 reports/vrt/baseline/<level>-<kebab>--<story>.png 로
// 캡처돼 있다(실제 React+CSS+토큰 렌더). 이 실사(實寫)를 Figma 에 그대로 붙이려면, 파일명을
// 계약(38개 컴포넌트)에 매핑한 소형 매니페스트가 필요하다. 이미지 바이트 자체는 런타임에
// localhost 자산 서버(scripts/serve-assets.mjs)에서 fetch 하므로 여기엔 경로·치수만 담는다.
//
// [경계] tools 가 자기 산출물(generated/*.figma.json 의 name·level)과 reports/ 를 읽는다.
// 결정론(커밋 diff 안정)을 위해 타임스탬프는 넣지 않는다 — codegen 산출물과 같은 규율.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.join(HERE, '..', 'generated');
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const BASELINE_DIR = path.join(REPO_ROOT, 'reports', 'vrt', 'baseline');
const OUT = path.join(GEN, 'render-assets.json');

// Storybook 은 스토리 kind id 에서 컴포넌트 이름을 하이픈 없이 소문자화한다
// ('HelpTip' → 'helptip', 'DataTable' → 'datatable'). 그래서 계약 이름도 같은 방식으로
// 정규화(영숫자만, 소문자)해 대조한다 — kebab 으로는 'help-tip' ≠ 'helptip' 이라 어긋난다.
function norm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** PNG IHDR 에서 픽셀 치수를 읽는다(8B 시그니처 + 4B 길이 + 4B 'IHDR' 다음 width/height). */
function pngSize(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// 1) 계약 → kebab 색인 (name·level 원천은 codegen 산출물)
const contracts = readdirSync(GEN)
  .filter((f) => f.endsWith('.figma.json'))
  .map(
    (f) => JSON.parse(readFileSync(path.join(GEN, f), 'utf8')) as { name: string; level?: string },
  );
const byName = new Map<string, { name: string; level: string }>();
for (const c of contracts) {
  byName.set(norm(c.name), { name: c.name, level: typeof c.level === 'string' ? c.level : 'atom' });
}

interface StoryAsset {
  component: string;
  level: string;
  story: string;
  file: string;
  w: number;
  h: number;
}

const stories: StoryAsset[] = [];
const unmatched: string[] = [];

for (const file of readdirSync(BASELINE_DIR)
  .filter((f) => f.endsWith('.png'))
  .sort()) {
  const base = file.replace(/\.png$/, '');
  const sepAt = base.indexOf('--');
  if (sepAt < 0) {
    unmatched.push(file);
    continue;
  }
  const kind = base.slice(0, sepAt); // 예: 'atoms-alert', 'molecules-tableselection-rowselectcell'
  const story = base.slice(sepAt + 2); // 예: 'danger'
  // 컴포넌트 이름은 title 경로의 **마지막 세그먼트**다(중첩 그룹 'TableSelection/RowSelectCell' 대응)
  const componentKey = norm(kind.split('-').pop() ?? '');
  const hit = byName.get(componentKey);
  if (!hit) {
    unmatched.push(file);
    continue;
  }
  const { w, h } = pngSize(readFileSync(path.join(BASELINE_DIR, file)));
  stories.push({ component: hit.name, level: hit.level, story, file, w, h });
}

mkdirSync(GEN, { recursive: true });
const doc = {
  $kind: 'tds-render-assets',
  $source: 'reports/vrt/baseline',
  // 플러그인 UI 가 `${serverBase}/${base}/${file}` 로 fetch 한다
  base: 'vrt/baseline',
  stories,
  unmatched,
};
writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);

const comps = new Set(stories.map((s) => s.component)).size;
console.log(
  `기록 완료: generated/render-assets.json — 컴포넌트 ${comps}/${contracts.length} · 스토리 ${stories.length} · 미매칭 ${unmatched.length}`,
);
if (unmatched.length > 0) {
  console.log(
    `  미매칭(계약 밖 스토리): ${unmatched.slice(0, 8).join(', ')}${unmatched.length > 8 ? ' …' : ''}`,
  );
}
