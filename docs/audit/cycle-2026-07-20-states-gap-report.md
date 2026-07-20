# 사이클 3 — 계약 states 결손 해소 · `verify:all` 최초 완주

`cycle-2026-07-20-report.md` §7 이 남긴 **"`pnpm verify:all` 전체를 마지막에 돌리지 않았다"** 를 실행한 결과와, 그 실행이 드러낸 blocker 2건의 처리를 담는다.

프로세스 규약은 `docs/architecture/work-cycle.md`, 단 순서는 `docs/architecture/ssot-pipeline.md`.

---

## 1. 이 단이 실제로 한 일

직전 사이클은 개별 게이트가 전부 초록이었으나 **통합 실행을 하지 않았다.** 돌려 보니 빨간불이었다 — 축 2(contract-states)가 **163/165**, blocker 2건.

| blocker | 원인 | 처리 |
|---|---|---|
| `IconButton · state active` | 계약 `states[]` 에 `active` 가 있는데 **구현에 `:active` 규칙도, `tokens` 에 active 항목도 없었다** | 계약 `tokens.textActive` 신설 + `:active` 구현 + 테스트 |
| `Table · state selected` | 계약 `states[]` 에 `selected` 가 있는데 **`rows` 에 선택을 표현할 자리 자체가 없었다** (prop·CSS 전무) | `rows[].selected` 신설 + `aria-selected`·시각 구현 + 테스트·스토리 + CrudTable 배선 |

**둘 다 "테스트가 없다" 가 아니라 "구현이 없다" 였다.** 축 2 는 테스트 커버리지 축이지만 여기서는 **계약이 선언한 표면이 실재하지 않는다**는 사실을 대신 고발했다.

### 앞 단의 판단을 뒤집지 않고 이어받았다

`IconButton.test.tsx` 머리말에 앞 단이 이렇게 적어 두었다:

> 구현에 `:active` 규칙이 없고 계약의 tokens·variantTokens 에도 active 항목이 없다 — 단언할 대상 자체가 존재하지 않는다. **이름만 맞춘 빈 껍데기를 두는 것은 게이트를 속이는 것이므로 쓰지 않았다.** 구현/계약 쪽 결손으로 인계한다.

이 판단은 옳았다. `it('IconButton: renders active state')` 안에 `expect(true).toBe(true)` 를 넣으면 축 2 는 **이름만 보고** 초록을 내준다(`contract-states.ts`: "대조 키는 테스트/스토리 이름이다"). 게이트를 통과시키는 가장 싼 길이 곧 게이트를 무의미하게 만드는 길이었고, 앞 단은 그것을 거부하고 인계했다. **이 단은 그 인계를 받아 결손 자체를 메웠다.**

---

## 2. `IconButton · active` — DS 의 기존 어법을 따랐다

새 시각 언어를 만들지 않고 **Button 의 ghost 변형이 이미 쓰던 어법**을 그대로 가져왔다:

```
--tds-component-button-ghost-background-active: var(--tds-color-surface-raised);  /* hover 와 동일 */
--tds-component-button-ghost-text-active:       var(--tds-color-action-primary-active);  /* 여기만 깊어진다 */
```

투명 배경 버튼의 `:active` 는 **배경을 또 바꾸지 않고 글자색만 눌러 넣는다.** IconButton 도 같게 했다:

```css
.tds-icon-button:active:not(:disabled) {
  color: var(--tds-color-action-primary-active);
}
```

배경까지 바꾸면 hover(`raised`) 와 `pressed="on"`(`raised` + 테두리) 사이에 **구분되지 않는 세 번째 배경**이 생긴다. 테스트가 이 의도를 못 박는다 — `:active` 규칙에 `background` 선언이 나타나면 실패한다.

계약에는 `tokens.textActive: "color.action.primary.active"` 한 줄만 늘었다. `backgroundActive` 를 **일부러 넣지 않은 것**이 위 판단의 기록이다.

---

## 3. `Table · selected` — 무엇이 DS 이고 무엇이 앱인가

여기가 이 단의 유일한 설계 판단이다. 어드민에는 **이미 선택 기능이 있다** — `CrudTable.tsx` 가 체크박스 열·전체 선택·`selectedIds` 를 전부 갖고 있다. 그런데 DS `Table` 에는 선택이 한 조각도 없었다.

`Table.types.ts` 머리말이 이 경계를 이미 못 박아 두었다:

> CrudTable 은 다섯 가지를 한 파일에서 하고 있었다: (1) 표 골격·정렬 헤더·스켈레톤·빈 행의 시각과 상호작용 … **(4) 선택 상태와 체크박스** … **DS 는 (1)만 가진다.**

그래서 **선택 상태(4)를 DS 로 올리지 않았다.** 올린 것은 (1) 에 속하는 것 하나뿐이다 — **"이 행은 선택됐다" 는 사실의 시각·접근성 표현.**

```ts
rows: ReadonlyArray<{ …; onActivate?: () => void; selected?: boolean }>
```

`selected` 는 **판정의 결과**로 주입된다. 같은 계약의 `sortKey` 와, Sidebar 승격이 세운 `activeHref` 와 같은 어법이다 — 무엇이 선택됐는지 **고르는** 것도, 체크박스를 **그리는** 것도(체크박스는 여전히 `leading` 으로 통째로 들어온다) 앱에 남는다.

### 세 값이다 — `true` · `false` · 없음

```tsx
{...(row.selected === undefined ? {} : { 'aria-selected': row.selected })}
```

선택 개념이 없는 표의 행에 `aria-selected="false"` 를 달면 스크린리더가 **없는 선택지를 있다고 읽어** 사용자가 존재하지 않는 조작을 찾아 표를 헤맨다. IconButton 의 `pressed` 가 `off`/`unset` 을 구분하는 것과 **정확히 같은 판단**이고, 같은 리포가 이미 내린 결론을 재사용했다. `CrudTable` 도 선택 열이 있을 때(`showSelect`)만 이 값을 준다.

### 배경만으로 말하지 않는다

선택된 행의 배경은 hover 와 **같은** `surface.raised` 다. 구분은 inline-start 강조선이 짊어진다:

```css
.tds-table__row--selected > *:first-child {
  box-shadow: inset var(--tds-border-width-medium) 0 0 0 var(--tds-color-action-primary-default);
}
```

- 배경만으로 갈리면 **마우스가 얹힌 행과 선택된 행이 같아 보인다.**
- 선택을 색 하나로만 말하면 **색각 이상에서 사라진다.** 위치를 가진 선은 색에 기대지 않는다.
- `<tr>` 이 아니라 **첫 셀**에 거는 이유: `<tr>` 은 `border-inline-start` 를 그리지 못하는 표 박스라 선이 나오지 않는다. `inset box-shadow` 는 레이아웃을 밀지 않고 선을 내는 유일한 방법이다.

### TokenGuard 예외를 넓혔다 — 우회가 아니라 등재

TOKEN-04 는 모든 `box-shadow` 가 shadow 토큰을 참조하도록 강제한다. 이 강조선은 **elevation 이 아니라 렌더링 기법**이므로 shadow 토큰을 쓰는 것이 오히려 틀리다 — 이미 등재된 Checkbox 의 ring gap 과 같은 부류다. 규칙을 우회하지 않고 **예외 목록에 이유와 함께 등재**했다(`TokenGuard.test.ts`, 리뷰 대상). 값은 여전히 전부 토큰으로 조립된다(예외 목록도 raw 값을 금지하는 두 번째 단언이 지킨다).

---

## 4. 최종 게이트 — 전부 초록 (`EXIT=0`)

`pnpm verify:all` **완주**. 이 리포에서 처음이다.

| 단 | 결과 |
|---|---|
| codegen:check · nav:check · validate:contracts | PASS |
| contract-test | **계약 55건 · PASS 55 · FAIL 0 · SKIP 0** |
| coverage:check | **PASS** — 축1 2/2 · **축2 165/165** · 축3 26/26 · 축4 래칫 137→137 후퇴 0 |
| quality:check | PASS — 축1 page-coupling 0 · 축2 domain-leak 0 · 축6 layer-direction 0 |
| naming:check · typecheck · lint · format:check | PASS |
| test | **@tds/ui 625 passed · @tds/admin 1728 passed** |
| perf:gate | PASS — gzip **29.46KB** ≤ 예산 138KB (컴포넌트 54개) |

**축 2 는 163/165 → 165/165 · blocker 0.** 분모가 165 로 유지된 것이 중요하다 — 계약에서 상태를 빼서 초록을 만든 것이 아니라 **덮어서** 만들었다. (`surfaceShrinkGap` 이 분모 세탁을 감시하며, 이번 실행에서 신고 0건.)

### 게이트가 실제로 일한 사례 두 건

- **`format:check` 가 걸렸다.** 손으로 줄바꿈한 `box-shadow` 값 하나 때문에 2차 실행이 `EXIT=1` 이었다. prettier `--write` 후 3차에서 통과.
- **백그라운드 실행의 종료 코드를 믿을 뻔했다.** 1차 실행은 `pnpm verify:all | tail -60` 이었고 알림은 **exit 0** 이었다 — 그건 `tail` 의 종료 코드다. 실제로는 전역 pnpm 설치가 깨져(`Cannot find module '../dist/pnpm.cjs'`) **게이트가 아예 돌지 않았다.** 로그를 읽고서야 알았다. → **파이프 뒤의 exit code 는 게이트의 판정이 아니다.** 이후 전부 `> log 2>&1; echo "EXIT=$?" >> log` 형태로 바꿨다.

---

## 5. 환경 — 오너 조치 필요

**전역 pnpm 이 깨져 있다.** `C:\Users\ADMIN-F\AppData\Roaming\npm\node_modules\pnpm` 의 `dist/` 가 없어 `pnpm` 이 어떤 명령도 실행하지 못한다.

이 단은 **`corepack pnpm`** 으로 우회했다 — `package.json` 의 `packageManager: "pnpm@9.15.0"` 과 정확히 같은 버전이 나오므로 게이트 결과는 유효하다. 전역 설치는 건드리지 않았다(사용자 환경 변경이라 판단 보류).

오너가 자기 터미널에서 `pnpm` 을 그대로 쓰려면 재설치가 필요하다:

```
npm i -g pnpm@9.15.0     # 또는 corepack enable 로 corepack 에 위임
```

---

## 6. 이어서 하던 작업 — `cssVar()` 이관의 현재 위치

이 브랜치의 커밋되지 않은 대량 변경(254 파일)은 **손글씨 `var(--tds-*)` 문자열을 타입 있는 `cssVar('space.5')` 로 바꾸는 이관**이다. 이 단이 시작하지 않았고 끝내지도 않았으므로 **현재 위치를 실측해 남긴다.**

| 구분 | 건수 |
|---|---|
| `cssVar(` 호출부 (이관 완료) | **2,282** |
| 남은 raw `var(--tds-*)` | **923** |
| ├ typography 하위 속성 | **654** — *구조적으로 `cssVar()` 로 표현 불가* |
| ├ `calc()` 안에 낀 것 | **208** — 표현 가능, 손이 안 갔을 뿐 |
| └ 나머지 | 61 |

### 654 건은 손이 부족해서 남은 것이 아니다

`tokenVars` 에는 **합성 토큰만** 있다:

```
'typography.label.md': '--tds-typography-label-md'
```

그런데 코드가 쓰는 것은 그 **하위 속성**이다:

```tsx
fontSize:   'var(--tds-typography-label-md-font-size)',    // 127회
lineHeight: 'var(--tds-typography-label-md-line-height)',  //  97회
```

그리고 **`--tds-typography-label-md` 자체는 CSS 에 방출되지 않는다** — 방출되는 것은 `-font-family`/`-font-size`/`-font-weight`/`-line-height` 4개뿐이다(실측 확인). 즉 `cssVar('typography.label.md')` 를 쓰면 **실재하지 않는 var 를 참조하게 된다** — HEAD `1c06e51`·`80c6983` 이 가드를 세운 바로 그 사고 유형이다.

**→ 654건은 codegen 쪽 결정이 먼저다.** 둘 중 하나:

1. `tokenVars` 에 하위 속성 4종을 각각 등재해 `cssVar('typography.label.md.font-size')` 가 성립하게 한다.
2. **타이포그래피 헬퍼**를 만든다 — `typography('label.md')` 가 4속성을 한 번에 돌려주는 `CSSProperties` 조각. 호출부 654건이 **~164건으로 줄어든다**(4속성이 1호출로 접힌다). 이쪽이 반복 자체를 없애므로 더 낫다고 본다.

**208건(calc)은 지금도 가능하다** — `` `calc(${cssVar('space.6')} * 9)` `` 로 접근하면 되고 codegen 변경이 필요 없다. 다만 `no-blind-bulk-edits` 규약대로 dry-run + 사후 조건을 갖춘 스크립트로만 한다.

---

## 7. 미확인 — 비워 두지 않는다

- **브라우저에서 눈으로 보지 않았다.** `Table` 의 선택 강조선과 `IconButton` 의 `:active` 는 **jsdom 에서 규칙 존재와 토큰 참조만** 단언했다. `:active` 는 실제 포인터가 필요한 의사 클래스라 jsdom 에 상태 자체가 없다 — **픽셀은 미확인이다.**
- **VRT 기준 이미지가 없다.** 신규 스토리 `Table/SelectedRows` 1건. `pnpm vrt` 미실행.
- **`pnpm a11y` · `pnpm e2e` 미실행.** `verify:full` 이 아니라 `verify:all` 까지만 돌렸다. a11y 는 직전 사이클 §6-1(`known-violations.json` storyId 4건 stale)로 **이 단과 무관하게 빨갛다.**
- **IconButton 에 `:active` 전용 스토리를 만들지 않았다.** Button 은 `combo(…, 'active')` 로 24칸을 갖는데 IconButton 의 `States` 스토리는 `pressed` 축만 열거한다. 축 2 는 테스트로 이미 덮였으나 **Storybook 이 SSOT 라는 규범 기준으로는 비어 있는 칸**이다.
- **`selected` 를 쓰는 어드민 화면을 실제로 열어 보지 않았다.** `CrudTable` 배선은 테스트(1728건)가 초록이라는 것까지만 확인했다.
- 남은 raw `var()` 923건의 **분류는 문자열 패턴 집계**다. 각 호출부가 정말 그 토큰을 의도했는지는 정독하지 않았다.

---

## 8. 다음 단으로

1. **typography 헬퍼 설계** (§6) — 654건이 여기에 걸려 있다. codegen 단의 판단이 먼저다.
2. **calc 208건 이관** — 지금 가능. dry-run + 사후 조건 필수.
3. **VRT 기준 이미지 생성** — `Table/SelectedRows` 포함.
4. **IconButton `Active` 스토리** — Storybook 커버리지 규범 충족용.
5. **이 브랜치는 아직 커밋되지 않았다.** 254 파일이 워킹 트리에 떠 있다. `no-blind-bulk-edits` 가 경고한 대로 **커밋되지 않은 트리에서는 git 이 안전망이 아니다** — 체크포인트 커밋이 시급하다.
