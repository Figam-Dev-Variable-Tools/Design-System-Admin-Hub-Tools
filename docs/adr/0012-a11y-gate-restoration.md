---
id: ADR-0012
title: a11y 게이트 복원 — 0건 검사하고 "위반 0" 을 쓰던 공허한 검사를 끝내고, 실측된 부채를 열거해 등재한다
status: accepted
date: 2026-07-17
owner: A72 (Accessibility Audit AI)
supersedes: null
relatedTo: [ADR-0009, ADR-0010, ADR-0011]
evidence: reports/a11y/2026-07-17.json
---

# ADR-0012. a11y 게이트 복원

## 맥락

`pnpm a11y` 는 **한 번도 스토리를 검사한 적이 없다.** 그러면서 exit 0 을 냈다.

`tools/a11y/src/index.ts` 의 `skip()` 은 리포트에 이렇게 적었다:

```json
{ "status": "skipped", "axe": { "critical": 0, "serious": 0, "moderate": 0, "minor": 0 }, "stories": [] }
```

**0건 검사하고 "위반 0건"** 을 나란히 기록한 것이다. `stories: []` 와 `critical: 0` 은 같은 뜻이 아닌데
같은 파일에 나란히 있었고, 그 초록불이 CI 의 `a11y` job 을 통과시켜 **G5/G6 의 증거로 쓰였다.**
공집합 위에서 참인 명제이며 아무것도 보증하지 않는다.

이것은 이 저장소에서 **세 번째** 같은 계열이다:

| 도구 | 공허 통과의 형태 | 해소 |
|---|---|---|
| `tools/perf` | `packages/ui/dist` 없으면 graceful skip → exit 0 | ADR-0009 등재 후 **#44 복원** |
| `tools/vrt` | 기준 이미지 0건인데 "비교 0건 중 실패 0건 → PASS" | **#34 복원** (exit 2 NOT_VERIFIED 설계는 원래 옳았다) |
| `tools/a11y` | **0건 검사하고 `axe.critical: 0`** | **이 ADR** |

F1 배치가 초기에 정확히 보고했다 — *"`pnpm a11y`: exit 0 but SKIP — test-runner env is not wired
(pre-existing baseline limitation)"*. 그 보고는 옳았고, **"기존 한계" 로 분류되어 후속 처리되지 않았다.**
'알려진 한계' 라는 이름표가 붙는 순간 그것은 더 이상 조사되지 않는다 — 이 ADR 이 그 이름표를 뗀다.

### skip 의 근본 원인 — 셋이 겹쳐 있었고, 전부 exit 0 이 삼켰다

README 는 "test-runner 실행 환경 미구성" 이라고만 적혀 있었다. 실제로 확인해보니 원인이 셋이었다:

1. **`packages/ui/.storybook/test-runner.ts` re-export 가 존재하지 않았다.**
   README 는 이 파일을 "A30 에게 change_request 로 요청한다" 고 적어두었고, **아무도 만들지 않았다.**
   test-runner 는 config-dir 안의 `test-runner.ts` 만 읽으므로 훅이 없으면 **axe 는 애초에 주입되지 않는다.**
   설계 문서에 절차만 적히고 실행되지 않은 전형이다 (ADR-0010 의 "조직은 실패한 게 아니라 시작되지 않았다" 와 같은 형태).
2. **`test-storybook` 을 찾을 수 없었다.** 그것은 `@tds/a11y` 의 devDependency 인데
   `spawnSync` 의 cwd 가 `REPO_ROOT` 라 루트 `node_modules/.bin` 에서 해석에 실패한다 → `Command not found`.
3. **jest testMatch 가 0 matches 였다.** test-runner 는 jest 위에서 돌고 testMatch 를
   `path.join(projectRoot, glob)` 으로 만든다. Windows 에서 그 결과에 섞인 `\` 를 micromatch 가
   **이스케이프로 읽어 경로 구분자가 사라진다.**

원인 2·3 은 `run.status !== 0 && !jsonlExists` 분기가 그대로 `skip()` 으로 흡수했다. 그 분기의 주석은
*"위반으로 인한 실패라면 JSONL이 존재한다"* 였는데, **실행조차 안 된 경우와 구별되지 않았다.**

## 결정

### 1. test-storybook/jest 계층을 걷어내고 tools/vrt 와 같은 방식으로 검사한다

`index.json` 순회 + 내장 정적 서버 + Playwright 로 `iframe.html?id=<storyId>` 에 axe 주입.
자매 도구 `tools/vrt` 가 **501건을 이미 그렇게 순회하고 있다** — 같은 저장소에 동작하는 선례가 있는데
동작하지 않는 두 번째 방식을 유지할 이유가 없다. 원인 1·2·3 이 전부 사라진다.

### 2. 측정 불가는 통과가 아니다 — `skip()` 제거, exit 2 (NOT_VERIFIED)

`storybook-static` 부재 · playwright 미설치 · 스토리 인덱스 0건 → **exit 2**.
스토리 검사 실패가 **1건이라도** 있으면 나머지가 전부 통과여도 초록불을 켜지 않는다 (vrt 와 같은 규율):
"검사되지 않은 위반" 과 "위반 없음" 은 구별할 수 없으므로, 구별할 수 없다고 말한다.

### 3. 검사 범위를 `#storybook-root` → `body` 로 넓힌다

이전 훅은 `#storybook-root` 로 범위를 좁혔다. Modal·ConfirmDialog 는 `createPortal` 로
`document.body` 에 붙으므로(VRT 가 실측한 '포털 스토리' 21건) **그 범위에서는 영원히 검사되지 않았다** —
포커스 트랩과 `aria-modal` 이 가장 중요한 바로 그 컴포넌트들이 사각지대였다.

### 4. 파이프라인 배선 — `verify:full` 과 CI 에 잇는다 (`verify:all` 이 아니다)

`a11y:gate`(= `sb:build && a11y`) 를 만들어 **`verify:full`** 과 CI 에 잇는다.

**`verify:all` 에는 넣지 않는다** — `verify:all` 은 `.husky/pre-commit` 이 매 커밋 실행하는 체인이고,
`a11y:gate` 는 실측 **3분 05초**(sb:build + 스토리 501건 axe · idle 머신)다. 이 저장소는 이미 같은 판단을
문서로 남겨두었다 — pre-commit 훅이 **50초짜리 E2E 를 뺀 근거**가 그것이다:

> *"매 커밋에 붙이면 개발자가 --no-verify 로 우회하기 시작하고, **우회되는 훅은 없는 훅이다**."*

50초가 그 이유로 빠졌다면 3분은 그 기준을 이미 넘는다. 그리고 이 도구에 한해서 그 위험은 특히 아프다 —
**우회당해서 안 도는 게이트와 skip 으로 안 도는 게이트는 결과가 같다.** 방금 후자에서 복원한 것을
전자로 되돌릴 이유가 없다. 저장소의 기존 분업(`커밋=verify:all` · `CI=verify:full`)을 그대로 따른다.

**CI 는 이미 배선되어 있었다** — `pr-gates.yml`·`deploy.yml` 이 `sb:build` 후 `pnpm a11y` 를 부르고
있었고, `deploy.yml` 의 `build-admin` 은 `needs: [gates, a11y]` 다. 즉 **배선은 처음부터 옳았고
게이트만 공허했다.** ("a11y 가 어디서도 안 불린다" 는 의심은 코드 확인 결과 사실이 아니었다.)
CI job 에는 리포트 업로드 + 실패 전파 스텝을 더한다 (vrt job 과 같은 형태) — exit 1(위반)과
exit 2(NOT_VERIFIED) 가 **둘 다** job 을 빨간불로 만든다.

### 5. 실측된 부채 5건을 **열거해서** 등재한다 — 임계는 건드리지 않는다

첫 실행이 스토리 501건 전건에서 **critical 1 + serious 20** 을 찾았다. 16건은 이 배치에서 고쳤고,
`color-contrast` 5건은 `tools/a11y/known-violations.json` 에 **(storyId, ruleId) 단위로 열거**했다.

**규칙 단위 비활성화(`color-contrast` 를 끈다)가 아니다.** 임계(critical/serious ≥ 1)도 그대로다 —
agents.json A72 가 원천이므로 여기서 바꾸지 않는다. 등재된 조합만 차단에서 빠지고,
**등재되지 않은 위반은 전부 차단한다.** 리포트에는 `known` 으로 그대로 실린다.

목록이 썩지 않도록: **등재해 둔 위반이 더 이상 재현되지 않으면 게이트가 실패한다**(stale entry).
고쳐놓고 목록을 안 지우면 같은 (스토리, 규칙) 의 **새 위반이 그 예외 뒤에 조용히 숨기** 때문이다.

초록불의 문구도 바꾼다 — 등재된 부채가 남아 있으면 `pnpm a11y` 는
*"이 초록불은 '위반 0' 이 아니라 '새 위반 0' 입니다"* 를 함께 출력한다.

## 실측 — axe 가 처음 돌아서 찾은 것 (2026-07-17, 스토리 501건 전건 · auditErrors 0)

| 규칙 | impact | 스토리 | 처리 |
|---|---|---|---|
| `aria-input-field-name` | serious | 13 | **고침** — RichTextField |
| `color-contrast` | serious | 5 | **등재** (아래) |
| `aria-conditional-attr` | serious | 2 | **고침** — TriStateCheckbox |
| `image-alt` | **critical** | 1 | **고침** — sanitizeRichText |
| `region` | moderate | 275 | 차단 대상 아님 (아래) |

### 고친 것

- **`aria-input-field-name` (13건)** — RichTextField 의 `div[role="textbox"]`(contenteditable) 에
  **접근성 이름이 없었다.** `FormField` 는 `<label for={id}>` 로 잇는데, `<label for>` 는
  **labelable element**(input/select/textarea)에만 닿는다 — ARIA 위젯인 contenteditable 에는 아무 효과가 없다.
  스크린리더는 그 편집기를 "편집, 비어 있음" 으로만 읽었다. `labelIdOf()` 를 `hintIdOf`/`errorIdOf` 와 같은
  파생 규약으로 더하고, 편집기가 `aria-labelledby` 로 label 을 직접 가리키게 했다.
- **`aria-conditional-attr` (2건)** — TriStateCheckbox 의 `aria-checked` 가 DOM 과 어긋났다.
  네이티브 체크박스에서 aria-checked 는 `"mixed"` 일 때만 허용되고, 화면에 실제로 그려지는 mixed 는
  useEffect 가 넣는 DOM 프로퍼티 `indeterminate && !disabled` 다. 옛 식
  `indeterminate && !checked ? 'mixed' : checked` 는 두 갈래에서 모순이었다:
  · `OnMixed` — DOM 은 indeterminate 인데 `aria-checked="true"` 를 내보내 **'전체 선택' 으로 읽혔다**
  · `MixedDisabled` — 표시는 껐는데 `aria-checked="mixed"` 를 남겨 **없는 부분 선택을 알렸다**
  이제 mixed 가 아니면 속성을 내지 않고 native `checked` 에 맡긴다.
- **`image-alt` (critical, 1건)** — `alt` 속성이 **아예 없는** img 를 스크린리더는 파일명/URL 로 읽는다
  (저장 값의 `<img src="x">` → "x"). `sanitizeRichText` 의 `afterSanitizeAttributes` 훅에
  (target=_blank → rel 강제와 **같은 자리, 같은 논리로**) alt 없는 img 에 `alt=""` 를 넣어 장식으로 표시한다.
  저자가 쓴 alt 는 건드리지 않는다. 에디터가 삽입 시 alt 를 묻게 하는 것은 별개 과제이고, 그때도 이 훅은
  '과거 값·붙여넣은 HTML' 의 마지막 방어선으로 남는다.

### 등재한 것 — `color-contrast` 5건 (`tools/a11y/known-violations.json`)

두 갈래이고 **둘 다 거짓 양성이 아니다.**

**(a) 토큰 자체의 결함 2건 — 실제 앱에도 존재한다**

| 스토리 | 실측 | 요구 |
|---|---|---|
| `foundations-font-colors--specimen` | `#6B7280`(text.muted) on `#111827`(dark surface) = **3.66:1** | 4.5:1 |
| `atoms-alert--with-block-children` | `#2563EB`(ghost 버튼) on `#FEE2E2`(danger surface) = **4.23:1** | 4.5:1 |

**(b) Storybook 전용 결함 3건** — `atoms-card--dark-theme` · `molecules-imagegalleryfield--dark-theme` ·
`molecules-imageuploadfield--dark-theme`.

원인은 하나다: 스토리의 `darkFrame` 데코레이터가 `data-theme="dark"` 와 `background` 는 주지만
**`color` 를 주지 않는다.** 그래서 텍스트가 html(light)에서 **검정을 상속한 채** 다크 배경 위에 그려진다.
실측(computed style): `atoms-card--dark-theme` 의 카드는 `background #111827` 에 `color rgb(0,0,0)` 이다.
실제 앱은 `app.css` 의 `body { color: var(--tds-color-text-default) }` 가 덮으므로 재현되지 않는다 —
Storybook 프리뷰에는 그 규칙이 없다.

**그래도 거짓 양성이 아니다**: 지금 Storybook 의 다크 스토리는 **실제로 읽기 어렵게 그려지고 있고**,
그 상태가 **VRT 기준 이미지 501건에 그대로 굳어 있다.** 아무도 눈치채지 못한 이유는 a11y 게이트가
공허했고 VRT 는 '과거의 자신' 과만 비교하기 때문이다.

**왜 이 배치에서 고치지 않는가** — (a)는 `tokens/tokens.json` 의 색 값을, (b)는 스토리 데코레이터(또는
Card 가 background 와 함께 color 도 선언하도록)를 바꿔야 한다. **둘 다 이 배치의 소유 경계 밖이고**,
어느 쪽이든 픽셀이 바뀌어 **VRT 기준 이미지를 무효화한다**(A70 소유, #34 가 방금 복원한 영역).
게이트를 진짜로 만드는 것과 토큰/기준이미지를 바꾸는 것은 분리해야 각각 검증 가능하다.

### 차단하지 않는 것 — `region` (moderate, 275 스토리 / 816 노드)

"모든 콘텐츠는 랜드마크 안에 있어야 한다" 는 **페이지 단위 규칙**이다. 컴포넌트 스토리는 페이지가 아니므로
이 규칙이 구조적으로 항상 발화한다. impact 가 moderate 라 차단 조건(critical/serious)에 애초에 닿지 않는다.
**끄지 않는다** — 리포트에는 그대로 남아 Pages 계층 스토리를 볼 때의 신호로 쓰인다.
임계를 이 때문에 조정하지도 않는다.

## 결과

- `pnpm a11y` 는 이제 **스토리 501건을 실제로 검사한다** (auditErrors 0).
- 게이트가 **진짜로 빨간불이 되는 것을 위반을 심어 확인했다** — 검증 절차는 PR 본문 참조.
- 초록불의 의미가 정확해졌다: "검사 501건 중 차단 대상 0건, 등재된 부채 5건(노드 8개) 잔존".
  `pnpm a11y` 가 그 문장을 **매 실행 출력한다** — 초록불을 "위반 0" 으로 오해할 여지를 없앤다.

## 이 게이트가 **덮지 않는** 것 — ADR-0011(차트·표)과의 경계

이 게이트의 입력은 `storybook-static` 이고, Storybook 의 stories 글롭은
`packages/ui/src/**` 와 `packages/ui/pages/**` **뿐**이다. `apps/admin` 에는 스토리가 **0건**이다(실측).

따라서 **ADR-0011 이 도입한 Recharts 차트(`apps/admin/src/pages/stats/**`)와 TanStack Table 은
이 a11y 게이트가 검사하지 않는다.** 차트는 SVG 를 그리므로 접근성 이름·대비·역할에서
위반이 나기 쉬운 부류인데, 지금 그 표면은 axe 가 한 번도 보지 않았다.

이것을 여기 적어두는 이유는 이 ADR 이 고친 것이 정확히 그 실패이기 때문이다 —
**'게이트가 있다' 와 '게이트가 그것을 본다' 는 다르다.** 501건 초록불을 앱 화면의 접근성
보증으로 오해하면, 이 문서가 끝낸 착각을 다른 자리에서 다시 시작하는 것이다.
(앱 화면 감사는 `skills/a11y-audit` 의 nightly 수동 시나리오가 별도로 다룬다.)

## 후속 (이 ADR 이 만드는 부채)

1. **토큰 대비 2건** — text.muted(dark) 3.66:1 · primary-on-danger 4.23:1. 소유: 토큰 소유자.
   해소 시 VRT 기준 이미지 광범위 갱신 필요(A70).
2. **darkFrame 데코레이터 3건** — `color: var(--tds-color-text-default)` 를 함께 주면 3건이 한 번에 해소된다.
   소유: A30. 해소 시 다크 스토리 기준 이미지 갱신 필요(A70).
3. 해소되면 `known-violations.json` 에서 **반드시 지운다** — 안 지우면 stale 규율이 게이트를 빨간불로 만든다.
