/**
 * @tds/flow-render — 플로우 차트 렌더 생성기
 *
 * 실행: pnpm flow:render        (= pnpm --filter @tds/flow-render run render)
 * 검사: pnpm flow:check         (= pnpm --filter @tds/flow-render run check)
 *
 * [왜 이 도구가 생겼나]
 * 플로우 차트의 정본은 `docs/flow/mmd/**\/*.mmd` 하나다. `docs/flow/html/**` 는 그 렌더
 * 결과물인데, **그 렌더를 도는 스크립트가 리포에 등록돼 있지 않았다** (`package.json` 에 없음).
 * 그래서 예상대로 표류했다(2026-07-22 실측).
 *   · .mmd 83건 중 html 이 아예 없는 것 10건 (orders·programs 3종·sales-billing·settings 2종 …)
 *   · 남은 html 은 마지막 .mmd 수정보다 낡았다 (03-sales-pipeline · 09/09a/09b)
 *   · 반대로 .mmd 가 삭제됐는데 html 만 남은 고아 3건 (09-ia-sitemap · marketing-alimtalk ·
 *     products-returns)
 * `tds-pages.json` 이 `codegen:check` 밖에 있던 것과 같은 계열의 공백이다. 생성기를 등록하고
 * nav-sync 처럼 신선도 검사(--check)를 붙이는 것이 정방향이라, 그걸 이 도구가 한다.
 *
 * [왜 mmdc(@mermaid-js/mermaid-cli) 가 아니라 클라이언트 렌더인가]
 * 기존 html 은 mmdc 가 뽑은 SVG 를 파일에 구워 넣은 것이었다. 그 경로는 이 환경에서 죽어 있다 —
 * mmdc 는 puppeteer 가 내려받는 Chromium 을 띄워야 하는데 그게 기동하지 않는다. 즉 렌더가
 * **브라우저 설치 여부에 인질로 잡혀 있다**. 그래서 SVG 를 굽지 않고, mermaid 번들과 .mmd
 * 원문을 페이지에 담아 **열릴 때 브라우저가 그리게** 한다. 생성기 자체는 문자열 조립뿐이라
 * Node 만 있으면 돌고, 출력은 타임스탬프도 난수 id 도 없어 **결정론적**이다 — 두 번 돌려도
 * 바이트가 같다. --check 가 성립하는 근거가 이것이다.
 *
 * [왜 mermaid 를 각 페이지에 인라인하지 않고 _assets 로 빼는가]
 * `mermaid.min.js` 는 3.4MB 다. 83개 페이지에 인라인하면 `docs/flow/html/**` 만 290MB 가 된다 —
 * 리포에 넣을 수 없는 크기다. 대신 **같은 디렉터리 트리 안의 사본 1부**를 고전 script 태그로
 * 부른다. 요구의 본질("CDN·네트워크 의존 없이 디스크에서 바로 열린다")은 그대로 지킨다:
 * file:// 페이지에서 상대 경로 고전 스크립트 로드는 브라우저가 허용한다(막히는 것은 fetch/XHR 과
 * ES module 이다 — 그래서 원문도 fetch 하지 않고 페이지 안에 심는다).
 *
 * 종료 코드: 0 = 전건 최신 / 1 = 표류 1건 이상 (차단)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

/** 정본 — 이 도구는 절대 여기에 쓰지 않는다 */
const MMD_DIR = path.join(REPO_ROOT, 'docs/flow/mmd');
/** 산출물 — 이 도구가 통째로 소유한다(고아 파일은 지운다) */
const HTML_DIR = path.join(REPO_ROOT, 'docs/flow/html');
/** 페이지들이 공유하는 mermaid 번들의 리포 내 사본 */
const ASSET_REL = '_assets/mermaid.min.js';
const MERMAID_SRC = path.join(__dirname, '../node_modules/mermaid/dist/mermaid.min.js');

/** 차트 1건 — 정본 .mmd 와 거기서 뽑아낸 표시 정보 */
interface Chart {
  /** mmd 루트 기준 상대 경로 (posix). 예: `menus/orders.mmd` */
  readonly mmdRel: string;
  /** html 루트 기준 상대 경로 (posix). 예: `menus/orders.html` */
  readonly htmlRel: string;
  /** 헤더 h1 · <title> 에 쓰는 이름 */
  readonly title: string;
  /** 헤더 부제 (라우트 경로나 보조 설명). 없으면 빈 문자열 */
  readonly subtitle: string;
  /** .mmd 원문 그대로 */
  readonly source: string;
}

/** 이 도구가 만들어야 할 파일 1건 */
interface Artifact {
  /** html 루트 기준 상대 경로 (posix) */
  readonly rel: string;
  readonly content: Buffer;
}

// ────────────────────────────────────────────────────────────────────────────
// 수집
// ────────────────────────────────────────────────────────────────────────────

/** `dir` 아래 .mmd 를 전부 모은다. 순서는 경로 사전순으로 고정한다 — 결정론의 일부다. */
function collectMmd(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectMmd(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.mmd')) out.push(rel);
  }
  return out;
}

/**
 * 제목은 .mmd 첫 줄의 `%%` 주석에서 뽑는다 — 기존 html 이 쓰던 규칙 그대로다.
 * `%% 새 채팅 · /ai/chat` → 제목 `새 채팅` · 부제 `/ai/chat`
 * 첫 ` · ` 하나에서만 자른다(부제 안의 ` · ` 는 부제로 남는다).
 * `%%{init: …}%%` 는 mermaid 지시자이지 제목이 아니므로 건너뛴다.
 */
function readHeading(source: string): { title: string; subtitle: string } {
  for (const line of source.split('\n')) {
    const t = line.trim();
    if (t === '') continue;
    if (!t.startsWith('%%') || t.startsWith('%%{')) break;
    const text = t.slice(2).trim();
    const at = text.indexOf(' · ');
    if (at === -1) return { title: text, subtitle: '' };
    return { title: text.slice(0, at).trim(), subtitle: text.slice(at + 3).trim() };
  }
  return { title: '(제목 없음)', subtitle: '' };
}

function loadCharts(): Chart[] {
  return collectMmd(MMD_DIR).map((mmdRel) => {
    // 정본은 읽기만 한다. 개행은 정규화하지 않고 그대로 페이지에 싣는다.
    const source = fs.readFileSync(path.join(MMD_DIR, mmdRel), 'utf8');
    const { title, subtitle } = readHeading(source);
    return { mmdRel, htmlRel: mmdRel.replace(/\.mmd$/, '.html'), title, subtitle, source };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 조립
// ────────────────────────────────────────────────────────────────────────────

/** 텍스트를 HTML 본문에 그대로 실을 수 있게 이스케이프한다. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** html 루트 기준 상대 경로에서 위로 몇 단계인지 */
function depthOf(htmlRel: string): number {
  return htmlRel.split('/').length - 1;
}

/** html 루트를 가리키는 상대 접두사 (`./` · `../` · `../../` …) */
function upTo(htmlRel: string): string {
  const depth = depthOf(htmlRel);
  return depth === 0 ? './' : '../'.repeat(depth);
}

/** 두 페이지 종류가 공유하는 색·타이포 변수. 기존 렌더의 셸을 그대로 옮겨 왔다. */
const PALETTE = `
 :root{--bg:#ffffff;--fg:#111827;--muted:#6b7280;--line:#e5e7eb;--chip:#f3f4f6;--accent:#2563eb}
 @media (prefers-color-scheme:dark){:root{--bg:#0b0f19;--fg:#e5e7eb;--muted:#9ca3af;--line:#1f2937;--chip:#111827;--accent:#60a5fa}}`;

function renderChartPage(chart: Chart): string {
  const up = upTo(chart.htmlRel);
  // mmd 루트는 html 루트의 형제다 — 한 단계 더 올라간다.
  const mmdHref = `${'../'.repeat(depthOf(chart.htmlRel) + 1)}mmd/${chart.mmdRel}`;
  const indexHref = `${up}index.html`;
  const assetHref = `${up}${ASSET_REL}`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(chart.title)} · 어드민 플로우</title>
<style>${PALETTE}
  *{box-sizing:border-box}
  body{margin:0;font:14px/1.5 -apple-system,"Segoe UI","Malgun Gothic",sans-serif;background:var(--bg);color:var(--fg)}
  header{position:sticky;top:0;z-index:5;display:flex;gap:12px;align-items:center;flex-wrap:wrap;
         padding:10px 16px;border-bottom:1px solid var(--line);background:var(--bg)}
  h1{font-size:15px;margin:0;font-weight:600}
  .sub{color:var(--muted);font-size:12px;font-family:ui-monospace,Consolas,monospace}
  .spacer{flex:1}
  a,button{font:inherit}
  a{color:var(--accent);text-decoration:none}
  a:hover{text-decoration:underline}
  button{border:1px solid var(--line);background:var(--chip);color:var(--fg);border-radius:6px;
         padding:4px 10px;cursor:pointer}
  button:hover{border-color:var(--accent)}
  #stage{position:relative;overflow:hidden;height:calc(100vh - 49px);cursor:grab;background:var(--bg)}
  #stage.grabbing{cursor:grabbing}
  #pan{transform-origin:0 0;position:absolute;top:0;left:0}
  /* 다크에서도 도형 안 글자가 읽히게 — mermaid 가 흰 배경 전제로 그린다 */
  @media (prefers-color-scheme:dark){#stage{background:#f8fafc}}
  /* 그리기 전의 원문이 잠깐 보이지 않게 숨긴다. 렌더가 끝나면 스크립트가 드러낸다. */
  #src{margin:0;visibility:hidden}
  #src.ready{visibility:visible}
  #err{display:none;padding:16px;color:#b91c1c;white-space:pre-wrap;
       font-family:ui-monospace,Consolas,monospace;font-size:12px}
  .hint{position:fixed;right:14px;bottom:12px;color:var(--muted);font-size:11px;
        background:var(--chip);border:1px solid var(--line);border-radius:6px;padding:4px 8px}
</style>
</head>
<body>
<header>
  <h1>${esc(chart.title)}</h1>
  <span class="sub">${esc(chart.subtitle)}</span>
  <span class="spacer"></span>
  <button id="fit">전체 보기</button>
  <button id="reset">100%</button>
  <a href="${esc(mmdHref)}" download>mermaid 원본</a>
  <a href="${esc(indexHref)}">← 목록</a>
</header>
<div id="stage"><div id="pan"><pre class="mermaid" id="src">${esc(chart.source)}</pre></div></div>
<pre id="err"></pre>
<div class="hint">휠 = 확대 · 드래그 = 이동</div>
<script src="${esc(assetHref)}"></script>
<script>
(function(){
  var stage=document.getElementById('stage'),pan=document.getElementById('pan'),
      src=document.getElementById('src'),err=document.getElementById('err');
  var W=1000,H=1000,scale=1,x=0,y=0,svg=null;
  function apply(){pan.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';}
  function fit(){
    var r=stage.getBoundingClientRect();
    scale=Math.min(r.width/W,r.height/H)*0.96;
    x=(r.width-W*scale)/2;y=(r.height-H*scale)/2;apply();
  }
  function measure(){
    svg=pan.querySelector('svg');
    if(!svg)return;
    var vb=(svg.getAttribute('viewBox')||'0 0 1000 1000').split(/\\s+/).map(Number);
    W=vb[2];H=vb[3];
    // mermaid 는 max-width 로 폭을 접는다 — 팬/줌은 고유 크기를 알아야 하므로 되돌린다.
    svg.removeAttribute('style');
    svg.setAttribute('width',W);svg.setAttribute('height',H);
    svg.style.display='block';svg.style.width=W+'px';svg.style.height=H+'px';
  }
  document.getElementById('fit').onclick=fit;
  document.getElementById('reset').onclick=function(){scale=1;x=0;y=0;apply();};
  stage.addEventListener('wheel',function(e){
    e.preventDefault();
    var r=stage.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
    var k=Math.exp(-e.deltaY*0.0015),ns=Math.min(8,Math.max(0.05,scale*k));
    x=mx-(mx-x)*(ns/scale);y=my-(my-y)*(ns/scale);scale=ns;apply();
  },{passive:false});
  var dragging=false,px=0,py=0;
  stage.addEventListener('pointerdown',function(e){
    dragging=true;px=e.clientX;py=e.clientY;stage.classList.add('grabbing');
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove',function(e){
    if(!dragging)return;x+=e.clientX-px;y+=e.clientY-py;px=e.clientX;py=e.clientY;apply();
  });
  stage.addEventListener('pointerup',function(){dragging=false;stage.classList.remove('grabbing');});
  window.addEventListener('resize',fit);

  if(!window.mermaid){
    err.style.display='block';
    err.textContent='mermaid 번들을 불러오지 못했습니다 — ${esc(assetHref)} 가 있는지 확인하세요. '+
                    '(pnpm flow:render 로 다시 만듭니다)';
    return;
  }
  // theme:'default' 고정 — 다크에서도 #stage 배경을 밝게 두고 밝은 테마로 그린다.
  //   mermaid 의 dark 테마는 도형 배경만 어둡게 바꾸고 이 셸의 변수와는 무관해, 섞으면
  //   대비가 무너진다. 배경을 통제하는 쪽(#stage)에 테마를 맞추는 편이 읽힌다.
  window.mermaid.initialize({startOnLoad:false,theme:'default',securityLevel:'strict',
                             maxTextSize:500000,maxEdges:2000});
  window.mermaid.run({nodes:[src]}).then(function(){
    src.classList.add('ready');measure();fit();
  }).catch(function(e){
    src.classList.add('ready');
    err.style.display='block';err.textContent='mermaid 렌더 실패\\n'+(e&&e.message?e.message:String(e));
  });
})();
</script>
</body>
</html>
`;
}

/** 목차 카드 1장 */
function card(href: string, title: string, subtitle: string): string {
  return `<a class="card" href="${esc(href)}"><b>${esc(title)}</b><span>${esc(subtitle)}</span></a>`;
}

function renderIndexPage(charts: Chart[]): string {
  const crosscut = charts.filter((c) => !c.htmlRel.includes('/'));
  const menus = charts.filter((c) => c.htmlRel.startsWith('menus/'));
  // 위 두 갈래에 안 들어가는 하위 디렉터리가 새로 생겨도 목차에서 빠지지 않게 받아 둔다.
  const rest = charts.filter((c) => c.htmlRel.includes('/') && !c.htmlRel.startsWith('menus/'));
  const section = (title: string, items: Chart[]): string =>
    items.length === 0
      ? ''
      : `<h2>${esc(title)} (${items.length})</h2>\n<div class="grid">${items
          .map((c) => card(`./${c.htmlRel}`, c.title, c.subtitle))
          .join('')}</div>\n`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>어드민 플로우 차트</title>
<style>${PALETTE}
 *{box-sizing:border-box}
 body{margin:0;padding:28px 20px 60px;font:14px/1.6 -apple-system,"Segoe UI","Malgun Gothic",sans-serif;
      background:var(--bg);color:var(--fg);max-width:1180px;margin-inline:auto}
 h1{font-size:22px;margin:0 0 6px}
 h2{font-size:15px;margin:32px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
 p.lead{color:var(--muted);margin:0 0 8px}
 .grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
 .card{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border:1px solid var(--line);
       border-radius:8px;background:var(--chip);text-decoration:none;color:var(--fg)}
 .card:hover{border-color:var(--accent)}
 .card b{font-weight:600;font-size:13px}
 .card span{color:var(--muted);font-size:11px;font-family:ui-monospace,Consolas,monospace;word-break:break-all}
</style>
</head>
<body>
<h1>어드민 플로우 차트</h1>
<p class="lead">코드(App.tsx 라우트 · 각 도메인 types.ts · data-source · queries)를 읽고 그린 것이다. 상태값과 가드 이름이 실제와 일치한다.</p>
<p class="lead">각 장에서 휠로 확대, 드래그로 이동한다. '전체 보기'가 화면에 맞춘다.</p>
<p class="lead">이 목차와 각 장은 <code>docs/flow/mmd/**/*.mmd</code> 에서 <code>pnpm flow:render</code> 가 만든다 — 손으로 고치지 않는다.</p>
${section('횡단 — 전체 흐름과 도메인 워크플로', crosscut)}${section('메뉴별 — 사이드바 전수', menus)}${section('기타', rest)}</body>
</html>
`;
}

// ────────────────────────────────────────────────────────────────────────────
// 실행
// ────────────────────────────────────────────────────────────────────────────

/** 만들어야 할 파일 전체 목록 — write 와 check 가 같은 목록을 본다. */
function buildArtifacts(charts: Chart[]): Artifact[] {
  const out: Artifact[] = charts.map((c) => ({
    rel: c.htmlRel,
    content: Buffer.from(renderChartPage(c), 'utf8'),
  }));
  out.push({ rel: 'index.html', content: Buffer.from(renderIndexPage(charts), 'utf8') });
  // mermaid 번들은 가공 없이 그대로 복사한다 — 버전이 바뀌면 바이트가 바뀌어 check 가 잡는다.
  out.push({ rel: ASSET_REL, content: fs.readFileSync(MERMAID_SRC) });
  return out;
}

/** html 루트 아래 실재하는 파일 전부 (posix 상대 경로) */
function collectExisting(dir: string, prefix = ''): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectExisting(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const charts = loadCharts();
  const artifacts = buildArtifacts(charts);
  const expected = new Map(artifacts.map((a) => [a.rel, a.content]));
  const existing = collectExisting(HTML_DIR);

  const stale: string[] = [];
  const missing: string[] = [];
  const orphans = existing.filter((rel) => !expected.has(rel));

  for (const a of artifacts) {
    const abs = path.join(HTML_DIR, a.rel);
    if (!fs.existsSync(abs)) {
      missing.push(a.rel);
      continue;
    }
    if (!fs.readFileSync(abs).equals(a.content)) stale.push(a.rel);
  }

  if (checkOnly) {
    const bad = missing.length + stale.length + orphans.length;
    if (bad === 0) {
      console.log(`✔ flow-render — 차트 ${charts.length}건 전부 최신 (docs/flow/html)`);
      return;
    }
    console.error('✖ flow-render — docs/flow/html 이 docs/flow/mmd 와 어긋난다\n');
    for (const rel of missing) console.error(`  누락  docs/flow/html/${rel}`);
    for (const rel of stale) console.error(`  낡음  docs/flow/html/${rel}`);
    for (const rel of orphans) console.error(`  고아  docs/flow/html/${rel}  (대응 .mmd 없음)`);
    console.error(`\n  ${bad}건. \`pnpm flow:render\` 로 다시 만든다.`);
    process.exitCode = 1;
    return;
  }

  for (const a of artifacts) {
    const abs = path.join(HTML_DIR, a.rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, a.content);
  }
  // 정본에서 사라진 .mmd 의 렌더는 남겨 두면 '없는 화면을 광고하는' 문서가 된다 — 지운다.
  for (const rel of orphans) fs.rmSync(path.join(HTML_DIR, rel));

  console.log(
    `✔ flow-render — 차트 ${charts.length}건 렌더 (신규 ${missing.length} · 갱신 ${stale.length} · 고아 제거 ${orphans.length})`,
  );
}

main();
