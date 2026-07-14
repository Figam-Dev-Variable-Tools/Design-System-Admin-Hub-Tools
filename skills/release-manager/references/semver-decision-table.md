# SemVer 판정표 v1

> A03(release-manager)의 버전 판정 기준. 판정 근거는 항상 **계약(contract.json) diff**이며, 이 표의 항목 번호를 판정 기록에 인용한다.
> G3에서 A18(선판정)·A19(검증)가 같은 표를 사용하고, G8에서 A03이 최종 확정한다. 불일치 시 A03 판정 우선.

## 1. 판정 알고리즘

1. 직전 릴리스 태그의 계약과 현행 계약의 diff를 필드 단위로 추출한다
2. 각 변경을 아래 표에 매핑한다 — 표에 없는 변경은 **보수적으로 한 단계 위** 등급 + A01에 표 개정 제안
3. 변경 집합의 **최고 등급이 릴리스 등급** (MAJOR > MINOR > PATCH)
4. `status: draft/beta`(0.x) 컴포넌트는 MINOR에서 Breaking 허용 — 단 CHANGELOG에 BREAKING 표기는 동일하게 필수

## 2. 판정표 — props

| # | 변경 | 판정 | 근거 |
|---|---|---|---|
| P1 | prop 제거 | **MAJOR** | 소비 코드 컴파일 실패 |
| P2 | prop 타입 변경 (`type` 필드) | **MAJOR** | 시그니처 파괴 |
| P3 | `default` 값 변경 | **MAJOR** | 코드 수정 없이 런타임 동작 변경 |
| P4 | optional → `required: true` 승격 | **MAJOR** | 기존 호출부 오류 |
| P5 | enum `values` 항목 제거/이름 변경 | **MAJOR** | 기존 값 사용처 파괴 |
| P6 | 신규 optional prop 추가 (default 있음) | MINOR | 하위호환 (G3 체크리스트 "추가 → MINOR") |
| P7 | enum `values` 항목 추가 | MINOR | 기존 사용처 무영향 |
| P8 | required → optional 완화 | MINOR | 기존 호출부 유효 |
| P9 | slot `accepts` 확대 | MINOR / 축소는 **MAJOR** | 허용 집합 축소는 파괴 |
| P10 | 미정의 동작의 명세화 (`hiddenWhen` 추가 등) | MINOR | 설계서 §10 CR 예시(impact: MINOR) 준용 |
| P11 | prop `description`/`figmaProperty` 표기만 변경 | PATCH | API 무영향 (figmaProperty 변경은 A74 4자 일치 재검 필요) |

## 3. 판정표 — events · states · a11y

| # | 변경 | 판정 |
|---|---|---|
| E1 | 이벤트 제거 / `payload` 타입 변경 | **MAJOR** |
| E2 | 이벤트 추가 | MINOR |
| E3 | `blockedWhen`에 상태 추가 — 기존에 발화되던 이벤트가 차단됨 | **MAJOR** (명백한 계약 의도의 결함 수정만 PATCH — 판정 기록에 사유 필수) |
| E4 | `blockedWhen`에서 상태 제거 (발화 확대) | MINOR |
| S1 | `states` 항목 제거 | **MAJOR** |
| S2 | `states` 항목 추가 | MINOR |
| A1 | `a11y.role` 변경 | **MAJOR** (보조기술 동작 변경) |
| A2 | `a11y.keyboard` 항목 추가, aria 보강 | MINOR |

## 4. 판정표 — tokens · docs · compat

| # | 변경 | 판정 |
|---|---|---|
| T1 | 계약 `tokens` 매핑이 참조하는 **토큰 값 조정** (tokens.json 쪽 값 변경, 참조 경로 불변) | PATCH |
| T2 | 계약 `tokens` 매핑의 참조 경로 교체 (API 불변, 시각만 변경) | PATCH — 단 A70 VRT diff ≤ 0.1% 재확인 필요 |
| D1 | 문서만 변경 (docs/tds, MDX, 주석) | PATCH |
| C1 | prop을 `deprecatedProps`에 추가 (동작 유지 + 경고) | MINOR |
| C2 | `removeIn` 도달로 deprecated prop 실제 제거 | **MAJOR** (P1과 동일하나 Deprecation 경로가 이미 존재하므로 승인 가능) |
| C3 | `removeIn` **미도달** 상태의 제거 | **판정 불가 — 무조건 반려** |

## 5. Deprecation 정책 (Breaking의 유일한 합법 경로)

```
N.x.0  (MINOR)  deprecatedProps 등재: { name, replacedBy, removeIn: "(N+1).0.0" }
   │            + 콘솔 경고 구현 (dev 모드)  + 문서 배너 (docs/tds)
   ▼            유예: 최소 1 MAJOR 사이클
(N+1).0.0 (MAJOR)  실제 제거 + Migration Guide (docs/migration/vN-to-vN+1.md)
```

- **removeIn 필수**: `compat.deprecatedProps` 항목은 component.v1.json 스키마상 `name`/`replacedBy`/`removeIn` 필수. removeIn 값은 반드시 미래의 MAJOR 버전이어야 하며, A03이 G8에서 타당성을 판정한다.
- **콘솔 경고**: deprecated prop 사용 시 dev 빌드에서 경고 1회 출력. 형식 예:
  `[TDS] Button: prop 'type' is deprecated — use 'variant'. Removal in 3.0.0`
  구현 소유는 A30/A40, 존재 검증은 A03(G8 체크리스트 "Deprecated 컴포넌트에 콘솔 경고 + 문서 배너").
- **문서 배너**: `docs/tds/components/<name>.md` 상단 배너 — 소유 A60, 검수 A61.
- 경고·배너·removeIn 셋 중 하나라도 없으면 **release 차단** (A03 blocks: release).

## 6. CHANGELOG · Migration 규칙

- `CHANGELOG.md`(D6): 버전별 `Added / Changed / Deprecated / Removed / Fixed` 섹션. Breaking은 별도 `BREAKING` 블록으로 최상단 명시 + Migration Guide 링크 (G8 체크리스트).
- `docs/migration/vX-to-vY.md`(D7): MAJOR 필수. 필수 구성 — 변경 요약 표(deprecated → 대체 경로), 코드 전/후 예시, 영향받는 컴포넌트 목록, 자동 마이그레이션(codemod) 가능 여부.
- 릴리스 태그 CI(설계서 §11)가 Changelog 생성·Migration Guide 존재를 검증하며 실패 시 릴리스가 차단된다.
