# @tds/contract-test — 4자 일치 검증 도구

> 담당: 계약 테스트 (Layer 3 · Verification)
> 근거: `docs/architecture/org-design-v2.md` §5.3
> 차단 규칙: **불일치 1건 → G5(Storybook) · G6(React) · G7(Figma) 동시 차단** — "100% 동기화"의 실제 구현체

## 실행

```bash
# 리포 루트에서 (권장)
pnpm contract-test

# 또는 직접
pnpm --filter @tds/contract-test run test
```

인자 없음 — `contracts/*.contract.json` 전체를 검증한다.

## 검증 축 4종

| 축 | 검사 내용 |
|---|---|
| 1. Contract ↔ React | `packages/ui/generated/types/<Name>.types.ts` 존재 + 계약과 동일 세대(파일 내 계약 버전 주석 비교) + `packages/ui/src/**/<Name>.tsx` 가 generated 타입을 import 하는지 정적 검사 |
| 2. Contract ↔ Storybook | `packages/ui/generated/**/<Name>.argtypes.ts` 존재 + `<Name>.stories.tsx` 가 generated argTypes 를 import + combinationMatrix 기준 Story 커버리지 휴리스틱 (export 된 Story 수 vs 필요 조합 수) |
| 3. Contract ↔ Figma | `tools/figma-plugin/generated/<Name>.figma.json` 의 properties 가 계약 props 의 `figmaProperty` 와 **이름/타입/값 완전 일치** (계약에 없는 property 존재도 불일치) |
| 4. Contract ↔ Token | 계약 `tokens` 블록의 모든 경로가 `tokens/tokens.json` 에 실존 + 해당 컴포넌트의 `packages/ui/src/**` 소스에 하드코딩 hex/px 스캔 |

### 판정 상태

- **PASS** — 일치 확인
- **FAIL** — 불일치(mismatch). 1건이라도 있으면 exit 1
- **SKIP** — 검증 대상 산출물이 아직 없음. **차단하지 않는다** (계약만 존재하는 부트스트랩 단계 배려). 4개 축이 전부 SKIP이면 컴포넌트 상태도 SKIP

### 축 1 — 세대(계약 버전) 비교 규약

생성 타입 파일 헤더에 `contract` 단어와 semver 가 **같은 줄**에 있으면 세대로 인식한다.
codegen(`tools/codegen`)이 생성하는 권장 헤더:

```ts
// 자동 생성 — 수정 금지. 원천: contracts/Button.contract.json@2.1.0 (tools/codegen)
```

버전 주석이 없거나 계약 버전과 다르면 **FAIL** (오래된 세대 = drift).

### 축 2 — 커버리지 휴리스틱

- 필요 조합 수 = (모든 enum prop 의 values 개수 곱) × (boolean prop 당 ×2)
- export 된 Story 수 = Story 파일의 `export const <PascalCase>` 고유 개수 (CSF 규약)
- Story 수 ≥ 필요 조합 수 → PASS. 정밀 검증(어떤 조합이 빠졌는지)은 G5 스토리북 리뷰와
  `scripts/validate-coverage` 계열 도구의 몫이며, 본 도구는 게이트 차단용 휴리스틱만 제공한다.

### 축 3 — figma.json 허용 형태

`properties` 는 객체 맵(`{ "Variant": { "type": "VARIANT", "values": [...] } }`)과
배열(`[{ "name": "Variant", "type": "VARIANT", "values": [...] }]`) 두 형태를 모두 허용한다.
타입 비교는 대소문자/구분자 무시(`INSTANCE_SWAP` = `instanceSwap`). 매핑 표:

| 계약 prop type | 허용 Figma type |
|---|---|
| enum | VARIANT |
| boolean | BOOLEAN |
| string | TEXT, STRING |
| number | NUMBER, TEXT |
| slot / node | INSTANCE_SWAP, SLOT/NODE/TEXT |

문서에 `contractVersion` 필드가 있으면 계약 버전과 세대 비교도 수행한다.

### 축 4 — 하드코딩 스캔 제외 규칙 (명시)

| 제외 대상 | 사유 |
|---|---|
| `packages/ui/generated/**` | 스캔 범위가 `src/**` 이므로 원천 배제 (+ 코드상 방어적 재확인) |
| `*.stories.tsx` | Story 데모 데이터 성격의 값 허용 — G5 검수에서 별도 관리 |
| `*.mdx`, `*.md` | 문서 예시 코드 허용 |

스캔 정규식: `#[0-9a-fA-F]{3,8}\b` (hex), `\b\d+(\.\d+)?px\b` (px).
휴리스틱이므로 SVG `url(#...)` 참조 등 드문 오탐이 가능하다 — 오탐 시 해당 값을 토큰으로
치환하거나 식별자 명명을 변경한다(순수 hex 문자로만 된 id 지양).

## 산출물

| 경로 | 내용 |
|---|---|
| `reports/contract-test/<component>.json` | 컴포넌트별 축/검사 단위 상세 결과 |
| `reports/contract-test/summary.md` | 전체 요약 (G5/G6/G7 리뷰어가 검수 시 첨부) |

## 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | 불일치 0건 (SKIP 포함 — 부트스트랩 단계는 차단하지 않음) |
| 1 | 불일치 1건 이상 → G5/G6/G7 동시 차단 |
| 2 | 실행 오류 (리포 루트 탐색 실패 등) |

## 경계 (Hard Boundary)

- 본 도구는 **검증만** 한다 — `contracts/**`, `packages/**`, `tokens/**` 를 수정하지 않는다 (P1 단일 소유권).
- 리포트 경로 `reports/contract-test/**` 는 계약 테스트 담당 소유.
- 생성물 재생성이 필요하면 `pnpm codegen` (`@tds/codegen`) 을 실행하는 것은 생성(codegen) 담당의 몫이다.
