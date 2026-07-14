# Atomic Design 규칙 — A30 Storybook Component Engineer

> 원천: 계약 스키마 `contracts/schemas/component.v1.json`의 `level` · `dependencies` 필드,
> 설계서 §4 금지 규칙("Atom이 Organism을 import — 역방향 의존" → `dependency-cruiser` 검출).

## 1. 레벨 정의와 폴더 매핑

| level (계약) | 폴더 | 정의 | 예시 |
|---|---|---|---|
| `atom` | `packages/ui/src/atoms/<Name>/` | 더 이상 쪼갤 수 없는 최소 단위. **다른 TDS 컴포넌트 import 0건** | Button, Input, Badge, Icon |
| `molecule` | `packages/ui/src/molecules/<Name>/` | atom 2개 이상의 조합 | SearchField(Input+Button), FormField(Label+Input+HelpText) |
| `organism` | `packages/ui/src/organisms/<Name>/` | atom/molecule의 복합 블록, 독립적 의미 단위 | DataTable, Modal, NavigationBar |
| `template` | `packages/ui/src/templates/<Name>/` | 레이아웃 골격. 콘텐츠 없이 배치만 담당 | ListPageTemplate, DetailPageTemplate |
| `page` | `packages/ui/pages/**` | **A32 소유 — A30 작성 금지.** 실데이터(mock) 조립 전용 | DashboardPage |

## 2. 의존 방향 (단방향 강제)

```
atom  ←  molecule  ←  organism  ←  template  ←  page(A32)
```

| import 하는 쪽 | 허용되는 import 대상 |
|---|---|
| atom | (컴포넌트 없음) — generated 타입, 토큰 CSS 변수만 |
| molecule | atom |
| organism | atom, molecule |
| template | atom, molecule, organism |

- 역방향 import(예: atom → organism)는 `dependency-cruiser`가 커밋/PR에서 차단한다.
- 같은 레벨 간 import도 금지가 원칙 (molecule → molecule 필요 시 organism으로 승격을 A18에 change_request로 제안).

## 3. 계약과의 일치 검증

- 계약의 `level` 필드가 폴더 위치의 유일한 원천이다. 폴더를 임의로 정하지 않는다.
- 계약의 `dependencies` 배열 = 실제 import하는 TDS 컴포넌트 목록. **atom은 반드시 `[]`** (component.v1.json 주석: "레이어 역방향 의존 검출용").
- 구현 중 `dependencies`에 없는 컴포넌트가 필요해지면 → 작업 중단, A18에 change_request (`proposed: { "dependencies": [...] }`, impact는 보통 PATCH/MINOR).
- 레벨 변경(예: atom → molecule 승격)은 계약 변경이므로 G3 재진입 대상 — 임의 이동 금지.

## 4. 토큰 참조 규칙

- 3계층: `primitive → semantic → component`. **컴포넌트 코드는 semantic/component 계층 토큰만 참조** — primitive 직접 참조 금지 (G4 체크리스트).
- 참조 방법: codegen이 생성한 CSS Variables만 사용. 하드코딩 hex/px/ms 0건 (ESLint `no-raw-value` 커스텀 룰이 커밋 차단).
- 계약 `tokens` 블록에 명시된 토큰 경로 밖의 시각 속성이 필요하면 → A18에 change_request (계약의 tokens 블록 확장), 신규 토큰 자체가 필요하면 → A20에 change_request.

## 5. 폴더/파일 네이밍 (A76 Naming Guard가 pre-commit 차단)

```
packages/ui/src/atoms/Button/
  Button.tsx            ← 구현 (PascalCase, 계약 name과 동일)
  Button.stories.tsx    ← Story (CSF3)
  index.ts              ← re-export (public entry 구성용)
```

- 컴포넌트명 = 계약 `name` (PascalCase, `^[A-Z][A-Za-z0-9]*$`).
- Story title은 레벨 경로를 반영: `Atoms/Button`, `Molecules/SearchField`, `Organisms/DataTable`, `Templates/ListPageTemplate`.
- `Button.mdx`는 **만들지 않는다** — A31 소유.

## 6. 자주 하는 위반과 교정

| 위반 | 교정 |
|---|---|
| atom Button 안에서 Icon 컴포넌트 import | 계약이 `iconLeft: { type: "slot", accepts: ["Icon"] }`이면 slot으로 받는다 — 직접 import 금지 |
| molecule에서 organism import | 구조 재설계 — 해당 로직을 organism으로 올리거나 A18에 레벨 재판정 요청 |
| 스타일 편의로 `#3B82F6`, `12px` 직접 기입 | 계약 `tokens` 블록의 토큰 CSS 변수로 치환 |
| 계약에 없는 편의 prop 추가 (`className` 확장 등) | 계약 우선(P2) — A18 change_request 없이 추가 금지 |
| `packages/ui/generated/**` 결과를 복사해 수동 수정 | 금지 — `pnpm codegen` 재실행으로만 갱신 |
