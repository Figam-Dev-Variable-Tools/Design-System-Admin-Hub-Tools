---
# ── D4 · Component Contract 작성 가이드 ─────────────────────────────────
# 소유자: A18 (Component Contract Engineer) · 경로 규칙: contracts/<Name>.contract.json
# 게이트: G3 (승인자 A19 Contract Reviewer) · 체크리스트: docs/_templates/checklists/G3.md
# 스키마(정본): contracts/schemas/component.v1.json — 이 가이드와 스키마가 다르면 스키마가 이긴다.
doc: D4
owner: A18
reviewer: A19
gate: G3
schema: contracts/schemas/component.v1.json
---

<!--
[작성 지침]
- 이 문서는 "빈칸 채우기" 템플릿이 아니라 contract.json 작성 가이드다.
  실제 계약 파일은 JSON이며, 제출 전 반드시 `pnpm validate:contracts`를 통과해야
  리뷰 큐에 진입할 수 있다 (gates.json G3 entry 조건).
- G3 승인 시 계약은 Frozen된다. 이후 변경은 change_request → G3 재진입 + SemVer
  재판정만 가능하며, Layer 2 작업물은 계약 버전 불일치 시 자동 무효다.
-->

# D4. Component Contract 작성 가이드

계약은 4자(Contract ↔ React ↔ Storybook ↔ Figma) 동기화의 단일 원천(SSOT)이다.
React 타입 · Storybook argTypes · Figma Properties · Docs는 손으로 쓰지 않고
`pnpm codegen`으로 계약에서 생성한다.

## 1. 작성 절차

1. A75 Reuse 판정 확인 — CREATE 판정 없이 신규 계약 생성 금지 (`reports/reuse/`)
2. `contracts/<Name>.contract.json` 작성 (아래 필드 규칙 준수)
3. `pnpm validate:contracts` — 스키마 검증 통과 (자동 pre-check, 실패 시 리뷰 요청 불가)
4. SemVer 판정 기록 (아래 §3 표) 후 A19에 review_request 발행
5. G3 APPROVED → 계약 Frozen, `pnpm codegen` 자동 실행 → Layer 2 병렬 착수

## 2. 스키마 필드별 규칙

| 필드 | 필수 | 규칙 |
|---|---|---|
| `name` | O | PascalCase (`^[A-Z][A-Za-z0-9]*$`). 파일명과 일치 (`<Name>.contract.json`) |
| `version` | O | SemVer. 판정 기준은 §3 표. G3 재진입 시마다 재판정 |
| `level` | O | `atom` \| `molecule` \| `organism` \| `template` \| `page` |
| `status` | O | `draft` → `beta` → `stable` → `deprecated` 순방향만 |
| `owner` | O | `code`/`design`/`figma` 3개 모두 agent id (`A\d{2}`) — 예: A30/A14/A51 |
| `props` | O | 키는 camelCase. boolean prop은 `is/has/can` 접두 또는 형용사(`disabled`, `loading`) |
| `props.*.type` | O | `enum` \| `boolean` \| `string` \| `number` \| `slot` \| `node` \| `function` |
| `props.*.values` | enum이면 O | kebab-case 소문자, 2개 이상, 중복 금지. 디자인 스펙(DS-NNN) variant와 완전 일치 |
| `props.*.default` / `required` | O(택1) | 모든 prop은 `default`가 있거나 `required: true` — 스키마가 강제 |
| `props.*.figmaProperty` | enum·boolean이면 O | Figma Component Property 매핑명. 누락 시 스키마 검증 실패 |
| `props.*.accepts` | slot이면 O | 허용 컴포넌트명 목록 (예: `["Icon"]`) |
| `events` | — | 키는 `on*` 강제 (`^on[A-Z]`). `payload`는 TS 타입명. `blockedWhen`은 이벤트가 차단되는 상태 목록 — Storybook Play Function이 전수 검증 |
| `states` | O | 스키마 enum 내 값만 (`default`, `hover`, `active`, `focus-visible`, `disabled`, `loading`, …) |
| `tokens` | O | 값은 tokens.json에 실존하는 토큰 경로 (`color.action.primary.default` 형식). 하드코딩 값 금지 |
| `a11y` | O | `role` · `keyboard`(1개 이상) · `focusVisible` 필수. `contrastMin` ≥ 3 |
| `responsive` | — | `breakpoints`(sm/md/lg/xl) + `behavior`(size-fixed/fluid/stack/hide/collapse) |
| `compat.deprecatedProps` | — | 항목마다 `name` + `replacedBy` + `removeIn`(버전) 3개 모두 필수 |
| `dependencies` | — | 조립에 사용하는 하위 컴포넌트명 목록. **atom은 빈 배열** — 레이어 역방향 의존(Atom→Organism)을 계약 수준에서 검출 (ADR-0001 결정 9) |

## 3. SemVer 판정 표

| 변경 유형 | 판정 | 비고 |
|---|---|---|
| prop 제거 | **MAJOR** | 반드시 한 버전 이상 `deprecatedProps` 경유 (Deprecation 경로 필수) |
| prop 타입 변경 | **MAJOR** | |
| `default` 값 변경 | **MAJOR** | 렌더 결과가 달라지므로 Breaking |
| enum `values` 항목 제거·이름 변경 | **MAJOR** | |
| `events.*.blockedWhen` 축소(차단 해제) | **MAJOR** | 동작 계약 변경 |
| prop 추가 (default 있음) | MINOR | additive-only → G3 우선순위 큐, SLA 2h (gates.json) |
| enum `values` 항목 추가 | MINOR | |
| event 추가 · `states` 추가 | MINOR | |
| `deprecatedProps` 등록 (동작 유지) | MINOR | `removeIn` 명시 필수 |
| `description` 등 문서 필드만 변경 | PATCH | |
| `tokens` 참조 경로 교체 (시각 결과 동일) | PATCH | 시각 결과가 달라지면 MINOR 이상 |

## 4. Frozen 이후 변경 절차

1. 변경 필요 발견자(예: A30)가 change_request 발행 (`orchestration/schemas/change-request.v1.json`)
2. A18이 계약 수정 → §3 표로 SemVer 재판정 → `version` 갱신
3. G3 재진입 (A19 재승인) → 재Frozen → `pnpm codegen` 재실행
4. 계약 버전이 바뀌면 이전 버전 기준 Layer 2 산출물은 무효 — 각 생산자가 재작업
