# generated — codegen 산출물 위치. 수동 편집 금지.

`tools/codegen`이 계약/토큰에서 자동 생성한다. 재생성: 리포 루트에서 `pnpm codegen`.

산출물 (플러그인 UI가 업로드로 소비하는 페이로드):

- `manifest.json` — **적재 대조표**. 계약 목록·수(`contractCount`)·파일명·체크섬과 토큰 페이로드 메타를
  담는다 (`generate-figma-manifest`). 플러그인은 `networkAccess: none`이라 리포를 읽을 수 없으므로,
  UI가 "무엇이 전량인가"를 아는 **유일한 수단**이다. UI는 업로드분을 이 목록과 대조해
  누락(38개 중 37개만 고르는 사고)·스테일(오래된 산출물)을 검출하고 실행을 차단한다.
  - `checksum` 은 정규화 JSON(키 정렬·공백 제거)의 FNV-1a 32비트 — 줄바꿈/들여쓰기 차이에 영향받지 않는다.
    위변조 방지가 아니라 스테일 검출용이다. 알고리즘은 `src/ui.html` 의 동명 함수와 1:1로 유지할 것.
- `<Name>.figma.json` — 계약(`contracts/<Name>.contract.json`)의 `figmaProperty` 매핑에서 생성.
  형식: `{ "name": "Button", "variantProperties": { "Variant": { "values": [...], "default": "..." } } }`
- `tokens/figma-variables.json` — `tokens/tokens.json`(DTCG)에서 생성한 Variables 페이로드 (`generate-figma-variables`).
  형식: `{ "$generated": "...", "collection": "TDS Tokens", "modes": ["light","dark"],
  "variables": [{ "name": "color/action/primary/default", "type": "COLOR|FLOAT|STRING|BOOLEAN",
  "values": { "light": ..., "dark": ... }, "alias"?: { "light"?: "...", "dark"?: "..." } }] }`
  - `values` 는 참조 체인을 모드별로 끝까지 해석한 raw 값 — `COLOR` 는 hex 문자열(RGBA 변환은
    플러그인 `parseHexColor` 담당), `FLOAT` 는 숫자로 정규화(`'4px'`→`4`, `'0.75rem'`→`12`, `'150ms'`→`150`).
  - `alias` 는 참조 토큰(`{a.b.c}`)의 대상 Variable 이름(슬래시 표기, 예: `a/b/c`) —
    현행 플러그인은 무시하며, 추후 이름→ID 해석 후 `VARIABLE_ALIAS` 승격용 메타데이터다.

소비자: 이 플러그인의 UI(src/ui.html) · A51/A52(Figma 생산) · A74(Contract Test — 4자 일치 검증).

이 폴더를 손으로 고치면 Contract ↔ Figma 축이 어긋나 A74가 G5/G6/G7을 동시에 차단한다.
