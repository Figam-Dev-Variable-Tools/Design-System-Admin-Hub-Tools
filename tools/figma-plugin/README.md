# @tds/figma-plugin — TDS Sync

contracts/tokens 산출물을 Figma에 동기화하는 플러그인. 소유: A50 (Figma Plugin
Engineer), 검수: A56 (G7). 모든 입력은 UI의 파일 업로드/붙여넣기로만 유입된다
(manifest `networkAccess: none`).

## 기능

| 액션 | 입력 | 결과 |
|---|---|---|
| 토큰 → Variables 동기화 | `generated/tokens/figma-variables.json` | 'TDS Tokens' 컬렉션 (light/dark 2모드) 생성/갱신 |
| 계약 → Variant Property 동기화 | `generated/<Name>.figma.json` | Component Set의 Variant Property 생성/갱신 |
| **TDS 문서 생성** | figma-variables.json + `<Name>.figma.json`(들) + pages 메타(선택) | 📕 Cover / 🎨 Foundations-Colors / Aa Typography / 📐 Spacing·Radius·Shadow / 🧩 Components / 📄 Pages 페이지를 'TDS 문서 스타일'로 생성/재생성 |
| Detached 스타일 스캔 | (없음) | Variable/Style 미바인딩 raw 값 리포트 — G7 "바인딩률 100%" 입력값 |

TDS 문서의 페이지 구성·치수·바인딩 규칙은 **docs/figma/specs/tds-doc-style.md**가
단일 규격이다. 문서의 모든 색은 생성된 Variable에 바인딩되므로(Detach 0), 컬러
팔레트·폰트 컬러·타이포그래피가 Storybook과 동일한 tokens.json 원천을 그대로 보여준다.

## 사용 절차 (순서 고정)

1. **codegen** — 리포 루트에서:

   ```sh
   pnpm codegen
   ```

   `tools/figma-plugin/generated/`에 페이로드가 갱신된다
   (`tokens/figma-variables.json`, `<Name>.figma.json` — 수동 편집 금지,
   상세: `generated/README.md`).

2. **플러그인 빌드/로드** — `tools/figma-plugin/`에서:

   ```sh
   pnpm build   # dist/main.js + dist/ui.html
   ```

   Figma 데스크톱 → Plugins → Development → Import plugin from manifest… →
   `tools/figma-plugin/manifest.json` 선택 후 실행.

3. **토큰 → Variables 동기화** — UI에서 `generated/tokens/figma-variables.json`을
   업로드(또는 붙여넣기)하고 "토큰 → Variables 동기화" 실행.
   TDS 문서 생성의 선행 조건이다 — 문서의 모든 색/치수 바인딩이 이 Variables를 참조한다.

4. **TDS 문서 생성** — "TDS 문서 생성" 다중 파일 입력에
   `figma-variables.json` + 문서화할 `<Name>.figma.json`(들) + (선택) pages 메타
   JSON을 함께 선택하고 "TDS 문서 생성" 실행. 파일 내용이 자동 분류되어
   combined 페이로드로 조립된다. 같은 이름의 문서 페이지가 이미 있으면 내용을
   비우고 재생성한다(멱등) — 문서 페이지 위에 수동 작업물을 두지 말 것.

   pages 메타 형식 (docs/plan/ui/SCR-NNN.md의 Screen Spec ID 기준, 수기 작성):

   ```json
   { "$kind": "tds-pages", "pages": [ { "id": "SCR-001", "name": "대시보드" } ] }
   ```

5. (선택) **계약 → Variant Property 동기화** — Component Set을 만들고,
   A51이 🧩 Components 페이지의 'Variant 매트릭스 자리'를 채운다.

6. **Detached 스타일 스캔** — 결과 위반 0건이어야 G7 통과. 문서 생성기의 허용
   예외(line-height/font-family, 헤어라인)는 tds-doc-style.md §10 참조.

## 개발

```sh
pnpm typecheck   # tsc --noEmit (@figma/plugin-typings)
pnpm build       # esbuild 번들 — 별도 런타임 의존성 없음
```

- `src/main.ts` — 메인 스레드: 메시지 라우팅 + Variables/Component/스캔 로직
- `src/tds-doc.ts` — TDS 문서 생성기 (규격: docs/figma/specs/tds-doc-style.md)
- `src/ui.html` — UI 스레드: 페이로드 로드/분류/전송
- `generated/` — codegen 산출물 (수동 편집 금지)
