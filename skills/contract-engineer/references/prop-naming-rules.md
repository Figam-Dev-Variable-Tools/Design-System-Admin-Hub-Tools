# Prop 네이밍 규칙 — Component Contract (A18)

> 원천: 설계서 §8 G3 체크리스트 · contracts/schemas/component.v1.json 패턴 · A76(Naming Guard) pre-commit 규칙
> 이 규칙 위반은 A19가 G3에서 **major**로 반려하고, A76이 커밋을 차단한다.

## 1. Prop 이름 — camelCase

- 스키마 패턴: `^[a-z][A-Za-z0-9]*$` (소문자 시작, 특수문자 금지)
- 허용: `variant`, `size`, `iconLeft`, `maxLength` / 금지: `Variant`, `icon_left`, `icon-left`

## 2. Boolean prop — `is/has/can` 접두 **또는** 상태 형용사

boolean은 "참이면 그 상태다"로 읽혀야 한다. 두 형태만 허용:

| 형태 | 예 |
|---|---|
| `is/has/can` 접두 | `isOpen`, `hasError`, `canResize` |
| 상태 형용사 (단독) | `loading`, `disabled`, `readonly`, `selected`, `checked`, `open`, `closed`, `required`, `fullWidth`, `active`, `visible`, `indeterminate` |

- 금지: 동사형(`load`, `disable`, `show`), 명사형(`error` — boolean이면 `hasError`), 부정형(`notVisible`, `hideIcon` — `visible`/`iconHidden`처럼 긍정형으로), 모호형(`flag`, `mode`)
- default는 **false를 기본으로 설계**한다 (미지정 시 가장 안전한 상태). `default: true`인 boolean은 계약 description에 사유 필수.

## 3. 이벤트 — `on` + PascalCase 동작명

- 스키마 패턴: `^on[A-Z][A-Za-z0-9]*$`
- 허용: `onClick`, `onChange`, `onOpenChange`, `onRowSelect` / 금지: `click`, `handleClick`, `onclicked`
- `payload`는 TS 타입명으로 명시 (`MouseEvent`, `ChangeEvent<HTMLInputElement>`)
- 상태에 따라 발화가 막히는 이벤트는 반드시 `blockedWhen`에 상태 나열 — Storybook Play Function(G5)이 전수 검증한다

## 4. Enum — 이름은 명사, 값은 소문자 kebab

- 값 패턴: `^[a-z][a-z0-9-]*$` — 허용: `primary`, `focus-visible`, `size-fixed` / 금지: `Primary`, `FOCUS_VISIBLE`
- enum prop은 `values`(2개 이상) + `default` + `figmaProperty` 전부 필수
- 값 순서는 디자인 스펙의 위계 순서와 일치시킨다 (Figma Variant 순서로 그대로 전파됨)
- boolean 2값을 enum으로 표현 금지 (`state: ["on","off"]` → boolean prop으로)

## 5. Slot / Node

- slot은 위치·역할을 이름에 담는다: `iconLeft`, `iconRight`, `prefix`, `suffix`, `footer`
- slot은 `accepts`(허용 컴포넌트명 목록) 필수 — 아무거나 받는 slot 금지, 자유 콘텐츠는 `node` 타입(`children`) 사용
- 본문 콘텐츠 슬롯의 이름은 항상 `children` (React 관례 고정)

## 6. Figma Property 매핑

- enum/boolean prop은 `figmaProperty` 필수 (G3 체크리스트 "매핑 누락 0건")
- 매핑명은 공백 없는 PascalCase: `variant → "Variant"`, `size → "Size"`, `iconLeft → "IconLeft"` (공백·kebab 금지)
- 계약 prop 1개 = Figma Property 1개. 하나의 prop을 여러 Property로 쪼개거나 병합 금지 (A74 4자 일치 검증이 차단)

## 7. 공통 금지

- 축약 금지: `btn`, `bg`, `msg` → `button`, `background`, `message`
- 계약에 구현 세부 누설 금지: `className`, `style`, `ref`는 계약 prop이 아니다 (React 관용 prop은 codegen이 처리)
- 동일 의미 다른 이름 금지: 조직 전체에서 `variant`(시각 위계) · `size`(크기) · `disabled`(비활성)로 통일 — 기존 계약을 Grep으로 확인 후 동일 어휘 재사용
