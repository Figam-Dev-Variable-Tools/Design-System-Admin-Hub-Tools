# Figma 네이밍 규격 (G7 공용 레퍼런스)

> 적용 범위: A51~A55 생산물 전체 + A56 검수 기준.
> 원천: `docs/architecture/org-design-v2.md` §8 G7, `contracts/schemas/component.v1.json`, A76 Naming Guard.
> 이 문서는 A51(figma-component-engineer) 스킬 폴더가 소유하며, A52~A56은 상대 경로로 인용만 한다.

## 1. Component / Variant / Component Set

| 대상 | 규칙 | 예 |
|---|---|---|
| Component Set 이름 | 계약 `name` 그대로 (PascalCase) | `Button` |
| Variant 노드 이름 | `Property=value` 쌍을 `, `로 연결 | `Variant=primary, Size=md` |
| 전체 표기 (검수·미러용) | `Component/Variant=primary, Size=md` | `Button/Variant=ghost, Size=sm` |
| Property 이름 | 계약 prop의 `figmaProperty` 값 **그대로** (PascalCase) | `Variant`, `Size`, `Loading`, `Disabled` |
| enum 값 | 계약 `values` 그대로 (lowercase kebab) | `primary`, `focus-visible` |
| boolean 값 | `true` / `false` 리터럴만 | `Loading=true` |

- Property 이름의 임의 축약·번역·복수형 변경 금지. 계약에 없는 Property 생성 금지 (A74가 Contract ↔ Figma 불일치로 G7 차단).
- Figma가 자동 생성하는 Variant 노드 이름 형식을 유지한다 — 수동 리네임 금지.

## 2. Variables

- 토큰 경로의 `.`을 `/`로 치환: `color.action.primary.default` → Variable 이름 `color/action/primary/default`
- Collection = 토큰 최상위 그룹 5종: `color` / `type` / `radius` / `spacing` / `shadow`
- Mode 이름은 `Light` / `Dark` 고정 (tokens/themes/** 페어링과 1:1)
- Variable 이름은 A52 플러그인 import가 자동 부여 — Figma UI에서 수동 리네임 금지

## 3. Icons

- 규격: `Icon/<name>/<size>/<style>`
  - `<name>`: `assets/icons/**` 원본 SVG 파일명과 동일한 kebab-case (예: `chevron-down`)
  - `<size>` ∈ { `12`, `16`, `20`, `24` }
  - `<style>` ∈ { `Filled`, `Outlined`, `Rounded`, `Sharp` }
- 예: `Icon/chevron-down/16/Outlined`

## 4. Pages / Frames (Layout · Prototype)

- 페이지 이름: `Components`, `Icons`, `Layout`, `Prototype` (figma:// 가상 경로 소유 구획과 1:1)
- 화면 프레임 이름: Screen Spec ID 접두 — `SCR-012 회원관리` 형식 (`docs/plan/ui/SCR-NNN.md`와 매칭)
- 반응형 프레임: `SCR-012 회원관리 / sm|md|lg` — 브레이크포인트 접미사는 계약 `responsive.breakpoints` 값 그대로

## 5. 검증 방법

- 커밋 전: `pnpm naming:check` (A76 Naming Guard — 위반 시 커밋 차단)
- 미러 JSON의 `naming.violations` 배열이 비어 있어야 G7 통과 (`references/spec-mirror-format.md` 참조)
- A56이 G7 체크리스트 항목 「네이밍: `Component/Variant=primary, Size=md` 규격」으로 최종 재확인
