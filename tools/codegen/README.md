# @tds/codegen — 계약 기반 코드 생성 파이프라인

`contracts/*.contract.json` 과 `tokens/tokens.json` (W3C DTCG)을 **단일 진실 공급원(SSOT)** 으로 삼아
React 타입 · Storybook argTypes · Figma Component Properties · API 문서 · CSS 변수 · Figma Variables 페이로드를 자동 생성한다.

**이 4곳은 손으로 쓰지 않는다. 계약에서 생성한다.** → Drift가 구조적으로 발생 불가능.

## 파이프라인

```
tokens/tokens.json (DTCG) ──┬─► tokens-to-css ──┬─► packages/ui/generated/tokens/tokens.css
                            │                   └─► packages/ui/generated/tokens/tokens.ts
                            └─► generate-figma-variables ──► tools/figma-plugin/generated/tokens/figma-variables.json
contracts/<Name>.contract.json
        │
        ▼
  validate-contract  (ajv: contracts/schemas/component.v1.json + 의미 검증)
        │  통과 시에만 ↓
        ├─► generate-types    ──► packages/ui/generated/types/<Name>.types.ts
        ├─► generate-argtypes ──► packages/ui/generated/argtypes/<Name>.argtypes.ts
        ├─► generate-figma    ──► tools/figma-plugin/generated/<Name>.figma.json
        └─► generate-docs     ──► docs/tds/components/<Name>.api.md
```

## 명령

| 명령 (리포 루트) | 패키지 스크립트 | 동작 |
|---|---|---|
| `pnpm codegen` | `pnpm --filter @tds/codegen run generate` | 검증 → 전체 생성 (변경분만 기록, 고아 생성물 삭제) |
| `pnpm codegen:check` | `pnpm --filter @tds/codegen run check` | 생성물이 계약과 일치하는지 비교 — stale 이면 **exit 1** (CI 게이트) |
| `pnpm validate:contracts` | `pnpm --filter @tds/codegen run validate` | 계약 검증만 수행 |

## 검증 규칙 (validate-contract)

1. **스키마**: `contracts/schemas/component.v1.json` (draft 2020-12) 통과
2. **토큰 실존**: `tokens` 블록의 모든 경로가 `tokens/tokens.json` 에 존재 (`$value` 보유 노드 기준)
3. **enum default**: `default ∈ values`
4. **deprecatedProps**: `compat.deprecatedProps[].name` 이 `props` 에 실존
5. **dependencies**: 대상 계약 파일 실존 + 레벨 위계 — `atom` 은 dependencies 가 비어야 하며, 상위 레벨(역방향) 의존 금지
6. **파일명**: `<name>.contract.json` 과 계약 `name` 일치

위반이 하나라도 있으면 위반 목록을 출력하고 exit 1 — 생성은 진행되지 않는다.

## 토큰 변환 규칙 (tokens-to-css)

- 경로 → CSS 변수명: `color.action.primary.default` → `--tds-color-action-primary-default`
- 참조 토큰 `{token.path}` 는 값으로 풀지 않고 `var(--tds-token-path)` **체인**으로 해석
  → 다크 테마에서 참조 대상 변수만 바뀌어도 자동 반영
- 라이트 값은 `:root`, 다크 오버라이드는 `[data-theme='dark']` 블록에 출력
- 다크 인코딩 지원: ① 최상위 `dark`/`light` 그룹 ② 토큰별 `$extensions`
  (`tds.dark` · `tds.themes.dark` · `mode.dark` · `modes.dark` · `dark` 키, `{ $value }` 래핑 허용).
  다크 전용 토큰은 라이트에도 동일 값으로 정의해 `var()` 미정의를 방지한다.
- number 값: `$type: dimension` → `px`, `duration` → `ms`, 그 외 무단위
- 합성 값: shadow 는 단일 `box-shadow` 선언으로 조립, typography 등 기타 객체는
  하위 키별 서브 변수(`--tds-…-font-size` 등)로 전개
- `tokens.ts` 는 `tokenVars` (as const 타입드 맵) + `TokenPath` 타입 + `cssVar()` 헬퍼를 export

## 토큰 변환 규칙 (generate-figma-variables)

`tokens/tokens.json` → `tools/figma-plugin/generated/tokens/figma-variables.json` —
Figma 플러그인(`tools/figma-plugin/src/main.ts`)의 `TokensPayload` 규격과 필드명이 1:1 대응한다.

- 페이로드: `{ collection: 'TDS Tokens', modes: ['light','dark'], variables: [{ name, type, values: { light, dark }, alias? }] }`
- Variable 이름: 토큰 경로의 점 → 슬래시 그룹 (`color.action.primary.default` → `color/action/primary/default`)
- 타입 매핑: `color`→`COLOR` · `dimension`/`spacing`/`radius`/`sizing`/`borderWidth`/`duration`/`number`/`fontWeight`→`FLOAT`
  · `fontFamily`/`cubicBezier`→`STRING` · boolean 값→`BOOLEAN` · 그 외 문자열→`STRING`
- `COLOR` 값은 hex 문자열로 출력 — hex→RGBA 변환은 플러그인(`parseHexColor`)이 수행한다
- `FLOAT` 값은 숫자로 정규화: `'4px'`→`4` · `'0.75rem'`→`12` (1rem=16px 기준) · `'150ms'`→`150` · `'0.4s'`→`400`
- 참조 토큰 `{a.b.c}` 는 **모드별로 체인 끝까지 해석한 raw 값**을 `values` 에 기록하고,
  대상 Variable 이름(`a/b/c`)을 `alias` 에 병기한다 — Figma `VARIABLE_ALIAS` 는 파일별 Variable ID가
  필요해 codegen 시점에 만들 수 없다. 현행 플러그인은 `values` 만 바인딩하고 `alias` 는 무시한다
  (추후 이름→ID 해석 후 alias 승격용 메타데이터).
- 다크 값 우선순위: 토큰별 `$extensions['tds.modes'].dark` → 최상위 `dark` 그룹/`$extensions` 다크 계열 → 라이트 값 복제
  (플러그인은 light/dark 두 모드 값을 모두 `setValueForMode` 하므로 다크 누락이 없다)
- `typography` 등 합성 객체는 하위 키별 서브 Variable 로 전개 (`typography/label/md/font-size` 등),
  `cubicBezier` 는 `'cubic-bezier(x1, y1, x2, y2)'` 문자열로 출력

## 생성물 수동 편집 금지 정책

- `packages/ui/generated/**`, `tools/figma-plugin/generated/**`, `docs/tds/components/*.api.md`
  는 **전부 생성물**이다. 손으로 고치지 않는다 — 파일 헤더의 `AUTO-GENERATED … DO NOT EDIT` 경고 참조.
- 변경이 필요하면 원천을 고친다: 계약(`contracts/`)은 Contract Engineer(A18),
  토큰(`tokens/`)은 Token Engineer(A20) 소유 — 변경 요청서를 통해 진행한다.
- 수동 편집은 CI 의 `pnpm codegen:check` 에서 stale 로 검출되어 게이트가 막힌다.
- 계약 파일이 삭제되면 다음 `pnpm codegen` 실행 시 대응 생성물이 **고아로 삭제**된다.

## 커버리지 행렬 (combinationMatrix)

`<Name>.argtypes.ts` 는 argTypes 외에 `combinationMatrix` 를 export 한다 —
모든 enum prop 값 × `states` 의 데카르트 곱. Storybook Story 커버리지는 이 행렬 대비
100%여야 G5(Storybook Reviewer) 게이트를 통과한다.

## 구현 메모

- Node 20 ESM + `tsx` 실행 (빌드 산출물 없음, `noEmit`)
- 입력은 전부 glob 기반 — 특정 계약/토큰 파일의 존재를 하드코딩하지 않는다.
  `tokens/tokens.json` 이 아직 없으면 토큰 생성 단계만 건너뛴다
  (단, 계약의 토큰 참조 검증은 실패 처리된다).
- `--check` 비교는 CRLF/LF 차이를 무시한다 (Windows 안전).
