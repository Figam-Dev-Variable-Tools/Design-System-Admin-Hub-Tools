# @tds/figma-plugin — TDS Sync

contracts/tokens 산출물을 Figma에 동기화하는 플러그인. 담당: Figma 플러그인,
검수: Figma 리뷰 (G7). 모든 입력은 UI의 파일 적재로만 유입된다
(manifest `networkAccess: none`).

## 기능

모든 액션은 `generated/` 폴더를 UI에 적재한 뒤 실행한다. 적재분이 `generated/manifest.json`과
어긋나면(누락·스테일) UI가 실행을 잠근다 — 아래 "조용한 누락 차단" 참조.

| 액션 | 요구 입력 | 바뀌는 것 |
|---|---|---|
| 토큰 → Variables 동기화 | `tokens/figma-variables.json` | 'TDS Tokens' 컬렉션 (light/dark 2모드) 생성/갱신. 기존 Variable은 삭제하지 않고 경고만 |
| 계약 → Variant Property 동기화 | `<Name>.figma.json` (전체 또는 개별 선택) | Component Set의 Variant Property 생성/갱신. 계약에 없는 값은 삭제하지 않고 경고 |
| **TDS 문서 생성** | figma-variables.json + `<Name>.figma.json` **전량** + pages 메타(선택) | ⚠️ **파괴적** — 📕 Cover / 🎨 Foundations-Colors / Aa Typography / 📐 Spacing·Radius·Shadow / 🧩 Components / 📄 Pages 페이지를 **내용을 비우고 재생성**. UI가 확인 체크박스를 요구한다 |
| Detached 스타일 스캔 | (없음) | **없음 — 읽기 전용.** Variable/Style 미바인딩 raw 값 리포트 — G7 "바인딩률 100%" 입력값 |

TDS 문서의 페이지 구성·치수·바인딩 규칙은 **docs/figma/specs/tds-doc-style.md**가
단일 규격이다. 문서의 모든 색은 생성된 Variable에 바인딩되므로(Detach 0), 컬러
팔레트·폰트 컬러·타이포그래피가 Storybook과 동일한 tokens.json 원천을 그대로 보여준다.

## 조용한 누락(silent omission) 차단

이 플러그인은 `networkAccess: none`이라 리포를 읽지 못한다. 그래서 codegen이
**`generated/manifest.json`**(계약 목록·수·체크섬)을 함께 낸다 — UI가 "무엇이 전량인가"를
아는 유일한 수단이다. UI는 적재분을 이 매니페스트와 대조하고, 어긋나면 **실행을 잠근다**:

| 상황 | UI 동작 |
|---|---|
| 매니페스트 없음 | 전 액션 차단 — 기대치를 모르면 누락을 판정할 수 없다 |
| 계약 누락 (예: 38개 중 37개) | 누락 이름을 표시하고 **TDS 문서 생성·전체 동기화 차단** |
| 체크섬 불일치 (스테일 산출물) | 해당 계약/토큰 표시 후 차단 — `pnpm codegen` 후 재적재 |
| 매니페스트에 없는 파일·분류 불가 | 경고만 (진행 허용) |

개별 컴포넌트 동기화는 누락 상태에서도 허용한다 — 단건 동기화는 의도된 선택이기 때문이다.
반면 '전체'와 'TDS 문서 생성'은 전량을 전제하므로 전량이 갖춰져야만 실행된다.

## 사용 절차 (순서 고정)

1. **codegen** — 리포 루트에서:

   ```sh
   pnpm codegen
   ```

   `tools/figma-plugin/generated/`에 페이로드가 갱신된다
   (`manifest.json`, `tokens/figma-variables.json`, `<Name>.figma.json` — 수동 편집 금지,
   상세: `generated/README.md`).

2. **플러그인 빌드/로드** — `tools/figma-plugin/`에서:

   ```sh
   pnpm build   # dist/main.js + dist/ui.html
   ```

   Figma 데스크톱 → Plugins → Development → Import plugin from manifest… →
   `tools/figma-plugin/manifest.json` 선택 후 실행.

3. **산출물 적재 (1회)** — UI의 드롭존에 **`generated/` 폴더를 통째로** 끌어다 놓거나
   "폴더 선택…"으로 고른다. 파일을 하나씩 고르다 빠뜨리는 경로를 없애기 위한 것이다.
   적재 결과 패널이 매니페스트·토큰·계약(N/전체)·페이지 메타를 즉시 보고한다.
   파일 **내용**으로 분류하므로 파일명을 바꿔도 동작한다.

4. **토큰 → Variables 동기화** — "Variables 동기화" 실행.
   TDS 문서 생성의 선행 조건이다 — 문서의 모든 색/치수 바인딩이 이 Variables를 참조한다.

5. **TDS 문서 생성** — 계약 전량 + 토큰이 갖춰져야 버튼이 열린다.
   같은 이름의 문서 페이지가 이미 있으면 내용을 비우고 재생성한다(멱등) —
   **파괴적 작업이므로 UI가 확인 체크박스를 요구한다**. 문서 페이지 위에 수동 작업물을 두지 말 것.

   pages 메타 형식 (docs/plan/ui/SCR-NNN.md의 Screen Spec ID 기준, 수기 작성):

   ```json
   { "$kind": "tds-pages", "pages": [ { "id": "SCR-001", "name": "대시보드" } ] }
   ```

6. (선택) **계약 → Variant Property 동기화** — 대상(전체 또는 개별)을 고르고 실행.
   Component Set을 만들고, Figma 컴포넌트가 🧩 Components 페이지의 'Variant 매트릭스 자리'를 채운다.

7. **Detached 스타일 스캔** — 입력이 필요 없는 읽기 전용 액션. 결과 위반 0건이어야 G7 통과.
   문서 생성기의 허용 예외(line-height/font-family, 헤어라인)는 tds-doc-style.md §10 참조.

## UI 디자인

플러그인 UI는 앱과 분리된 별도 문서(iframe)라 `packages/ui`의 CSS를 import할 수 없다.
그래서 `pnpm build`가 codegen 산출물인 `packages/ui/generated/tokens/tokens.css`를
`src/ui.html`의 `/* @tds-tokens-inject */` 지점에 **인라인**한다.

- UI 규칙은 `var(--tds-*)`만 쓴다 — **hex/px 리터럴 금지**. 값은 전부 `tokens/tokens.json`에서 온다.
- light/dark: 토큰의 `:root` / `[data-theme='dark']`를 그대로 쓴다. Figma는 `themeColors: true`일 때
  `<html>`에 `figma-dark` 클래스를 붙이므로, UI가 그것을 `data-theme`로 옮긴다
  (브라우저로 `dist/ui.html`을 직접 열면 OS 설정을 따른다 — 육안 검증용).
- a11y: 모든 컨트롤에 라벨, 이중 live 영역(`role=status` 적재 리포트 + `role=log` 실행 로그),
  차단 사유는 `aria-describedby`로 버튼에 연결, 상태는 색만이 아니라 기호+스크린리더 텍스트 병기.

## 개발

```sh
pnpm typecheck   # tsc --noEmit (@figma/plugin-typings)
pnpm build       # esbuild 번들 + 토큰 인라인 — 별도 런타임 의존성 없음
```

- `src/main.ts` — 메인 스레드: 메시지 라우팅 + Variables/Component/스캔 로직
- `src/tds-doc.ts` — TDS 문서 생성기 (규격: docs/figma/specs/tds-doc-style.md)
- `src/ui.html` — UI 스레드: 적재/매니페스트 대조/액션 게이팅/전송
- `generated/` — codegen 산출물 (수동 편집 금지). `manifest.json`이 UI의 대조 기준이다.

`manifest.json`의 체크섬 알고리즘은 `tools/codegen/src/generate-figma-manifest.ts`와
`src/ui.html`에 각각 구현돼 있다(별도 문서라 import 불가) — **한쪽을 바꾸면 반드시 다른 쪽도 바꿀 것.**
