---
id: ADR-0003
title: 계약 스키마에 데이터 prop(array/object) 추가 · 대시보드 모듈 분류 확정
status: accepted
date: 2026-07-14
owner: 아키텍처
supersedes: null
relatedTo: [ADR-0001, ADR-0002]
---

# ADR-0003. 계약 스키마에 데이터 prop 추가 · 대시보드 모듈 분류 확정

## 맥락

Admin 로그인·대시보드 화면이 확정되어, 페이지-모듈 파이프라인 ②③단계(모듈 추출 → 계약 → Storybook)에
진입한다. `pnpm reuse:scan` 결과(reports/reuse/module-candidates-*)를 근거로 승격 대상을 추렸다.

두 가지 결정이 필요했다.

**(1) 데이터 기반 컴포넌트를 계약으로 표현할 수 없다.**
`component.v1.json` 의 prop 타입은 `enum | boolean | string | number | slot | node | function` 뿐이라
테이블의 `rows`, 차트의 `points` 같은 **배열/객체 데이터 prop** 을 기술할 방법이 없다. 계약 없이는 G3 를
통과할 수 없고, 통과하지 못하면 Storybook·Figma 로 올라가지 못한다.

**(2) 승격 대상의 Atomic 레벨 분류.**
스캐너는 구조 휴리스틱이라 SVG `<path>` 반복까지 후보로 올린다(PathItem 57회 등). 기존 Button 은
REUSE 로 정확히 판정했으나, 나머지는 사람이 큐레이션해야 한다.

## 결정

### (1) prop 타입에 `array` / `object` 추가

- 두 타입은 **Figma Component Property 대응이 없다.** Figma 의 Variant/Boolean/Text/InstanceSwap 중
  무엇으로도 배열 데이터를 표현할 수 없기 때문이다. 따라서 `figmaProperty` 를 요구하지 않고,
  codegen 의 Figma 산출물에서도 제외한다(`generate-figma.ts` → `null`).
- 대신 **`itemShape` 를 필수**로 요구한다 — TS 타입 표현 문자열(예: `{ id: string; label: string }`)이며
  codegen 이 생성 타입에 그대로 박는다(`ReadonlyArray<{ id: string; label: string }>`).
- Storybook control 은 비활성(`false`)이며, 데이터는 Story `args` 로 직접 준다.

### (2) 모듈 분류 (Atomic Design)

| 레벨 | 컴포넌트 | 근거 |
|---|---|---|
| **atom** | `Button`(기존) · `Badge` · `Card` · `TextField` · `Checkbox` · `Alert` | 더 쪼갤 수 없는 최소 단위. 다른 TDS 컴포넌트를 조립하지 않는다 |
| **molecule** | `PasswordField` · `SegmentedControl` · `Tabs` · `ListRow` · `DataTable` · `LineAreaChart` | atom 을 조립하거나(PasswordField=TextField+토글), 단일 목적의 복합 UI 단위 |
| **organism** | `TodoCard` · `ListCard` · `StatsCard` | Card + Badge + molecule 을 조립한 완결된 업무 위젯 |

경계 규칙:

- **`SegmentedControl` 은 molecule** — 버튼들의 묶음이며 라디오 그룹 시맨틱(단일 선택 상태)을 소유한다.
  개별 세그먼트는 독립적으로 의미가 없어 atom 으로 분리하지 않는다.
- **`DataTable` / `LineAreaChart` 는 molecule** — 데이터를 받아 렌더하는 **범용** 표현 단위다.
  "기간별 분석", "방문자 차트" 같은 도메인 이름을 컴포넌트에 박지 않는다. 도메인 결합은 organism 이 한다.
- **`StatsCard` 는 organism** — Card 헤더(제목 + 액션 슬롯) + 본문 슬롯. 방문자 차트든 기간별 표든
  본문에 무엇이 오는지는 조립하는 쪽(Pages)이 정한다.
- **`TodoCard` / `ListCard` 는 organism** — 데이터 prop 을 받되 도메인(할일·리스트) 의미를 갖는다.

Pages(`packages/ui/pages/`)는 위 organism 을 **조립만** 한다. Pages 에서 신규 컴포넌트를 만들지 않는다.

## 근거

- (1) 데이터 prop 없이는 표·차트가 영원히 계약 밖에 남는다. 그러면 4자 일치(계약 테스트) 검증 대상에서 빠지고,
  "계약이 유일한 명세"라는 P2 가 표·차트에 대해서만 깨진 채로 굳는다. Figma 대응이 없다는 사실은
  **스키마에 명시적으로 기록**하는 편이, 억지로 Text property 로 매핑해 Figma 를 오염시키는 것보다 낫다.
- (2) 도메인 이름을 molecule 에 박으면(`PeriodTable`, `VisitorChart`) 재사용이 막힌다. 매출 표, 회원 표가
  생길 때마다 사실상 같은 표를 복제하게 된다. 범용 molecule + 도메인 organism 으로 나누면
  재사용 가드의 중복률 SLO(≤3%)를 구조적으로 지킬 수 있다.

## 대안

1. **prop 타입에 `json` 하나만 추가하고 타입은 `unknown`** — 계약은 통과하지만 생성 타입이 `unknown` 이라
   구현부가 캐스팅으로 도배된다. 계약이 타입 안전성을 제공하지 못하면 존재 이유가 절반 사라진다. 기각.
2. **표·차트를 계약 밖 "인프라 컴포넌트"로 분류** — 4자 일치 검증에서 영구 제외된다. Drift 가 발생해도
   계약 테스트가 잡지 못한다. 기각.
3. **도메인 이름 그대로 승격(PeriodTable/VisitorChart)** — 지금은 빠르지만 두 번째 표가 나오는 순간
   중복이 시작된다. 기각 (근거 (2) 참조).

## 결과

- `contracts/schemas/component.v1.json`: prop 타입 2종 추가, `itemShape` 필드 추가, array/object 는
  `itemShape` 필수.
- `tools/codegen`: `shared.ts`(PropType·ContractProp), `generate-types.ts`(TS 타입 매핑),
  `generate-argtypes.ts`(control 비활성 · type summary), `generate-figma.ts`(Figma 산출물에서 제외) 갱신.
- 승격 대상 15종의 계약을 `contracts/` 에 작성하고 G3 를 태운다.
- Figma 에는 atom/molecule 의 **시각 variant** 만 Component Set 으로 올라간다. 데이터 prop 은 Figma 에
  존재하지 않으며, 이는 4자 일치 검증에서 정상(미대응)으로 처리된다.
