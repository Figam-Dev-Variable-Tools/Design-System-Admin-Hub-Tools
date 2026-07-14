# SemVer 판정 규칙 — Component Contract (A18)

> 원천: 설계서 §8 G3 체크리스트 · gates.json G3(reentryRule/bottleneckMitigation) · contracts/schemas/component.v1.json
> 계약 버전은 컴포넌트 소비자(React/Storybook/Figma/Docs 4자)에 대한 **호환성 약속**이다. 판정이 애매하면 항상 더 큰 쪽(MAJOR 방향)으로 판정한다.

## 1. 판정표

| 변경 | 판정 | 근거 |
|---|---|---|
| prop 제거 | **MAJOR** | 소비 코드 컴파일 파괴 |
| prop `type` 변경 (예: boolean → enum) | **MAJOR** | 타입 파괴 |
| prop `default` 값 변경 | **MAJOR** | 명시하지 않은 소비자의 렌더 결과가 바뀜 (조용한 시각 파괴) |
| `required: false → true` | **MAJOR** | 기존 호출부가 깨짐 |
| enum `values`에서 값 제거 | **MAJOR** | 해당 값 사용처 파괴 |
| 이벤트 제거 · `payload` 타입 변경 | **MAJOR** | 핸들러 시그니처 파괴 |
| `events.*.blockedWhen`에 상태 추가 | **MAJOR** | 기존에 발화되던 이벤트가 차단됨 (동작 변경) |
| `tokens` 블록 경로를 다른 semantic 의미로 교체 | **MAJOR** | 시각 계약 변경 (동일 의미의 경로 개명은 A20 토큰 마이그레이션과 동기화 필수) |
| `states` 항목 제거 | **MAJOR** | Story/Figma variant 파괴 |
| prop 추가 (default 필수 동반) | **MINOR** | additive — 기존 소비자 무영향 |
| enum `values`에 값 추가 | **MINOR** | additive |
| 이벤트 추가 | **MINOR** | additive |
| `states` 항목 추가 | **MINOR** | additive (Story/Figma 커버리지 확장 필요 — G5/G7 재작업 유발함을 handoff에 명시) |
| slot `accepts` 확장 · `hiddenWhen` 추가 | **MINOR** | additive (단, 기존 표시가 숨겨지는 `hiddenWhen`은 동작 변경 → MAJOR) |
| prop `deprecated: true` 마킹 (+compat 등록) | **MINOR** | 제거가 아닌 예고 |
| `required: true → false` | **MINOR** | 완화는 하위호환 |
| `description` · a11y 서술 필드 보강 (동작 불변) | **PATCH** | 문서성 |
| `contrastMin` 상향 등 a11y 기준 강화 | **MINOR** 이상 | 토큰 변경 유발 시 A20와 동기 판정 |

## 2. Frozen 재진입 절차 (gates.json G3.reentryRule)

1. 변경은 **change_request(CR-YYYY-MMDD-NNN, change-request.v1.json) 수신으로만 시작**한다. CR 없는 개정 금지.
2. 위 판정표로 SemVer 판정 → CR의 `impact`와 불일치 시 판정을 우선하고 `resolution`에 근거 기록.
3. 계약 수정 + `version` 갱신 → `pnpm validate:contracts` 통과 → G3 재진입(review_request → A19).
4. **Layer 2 산출물은 계약 버전 불일치 시 자동 무효** — 재진입 사실을 A00에 handoff로 통보해 G4~G7 재작업을 트리거한다.
5. additive-only **MINOR**는 우선순위 큐: 리뷰 SLA 4h → **2h** (gates.json bottleneckMitigation).

## 3. Deprecation 규칙 (MAJOR 전 필수 경로)

- 제거 대상 prop은 먼저 `deprecated: true` + `compat.deprecatedProps`에 등록한다:
  `{ "name": "type", "replacedBy": "variant", "removeIn": "3.0.0" }`
- `removeIn`은 **최소 한 개의 MAJOR 버전 유예** (2.x에서 deprecated → 3.0.0에서 제거).
- `replacedBy` 없는 제거 금지 — 대체재가 없으면 A03(Release Manager)와 협의 후 ADR 필요.
- Deprecation 경로 없는 Breaking은 A03이 G8에서 릴리스를 차단한다.

## 4. 버전 상태 규칙

| status | 의미 | 버전 규칙 |
|---|---|---|
| draft | G3 미승인 작업본 | 0.x.y 또는 `-draft.N` 프리릴리스 |
| beta | G3 승인, 초기 안정화 | 1.0.0부터. breaking도 신속 처리하되 판정표는 동일 적용 |
| stable | 프로덕션 계약 | 판정표 엄격 적용 |
| deprecated | 컴포넌트 자체 폐기 예고 | 신규 소비 금지, `removeIn` 명시 |
