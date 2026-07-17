---
id: ADR-0005
title: boolean prop 네이밍 규칙 확장 — 표시 토글 접두(show/hide/dim) 및 상태 형용사 추가
status: accepted
date: 2026-07-15
owner: 아키텍처
supersedes: null
relatedTo: [ADR-0002, ADR-0003]
---

# ADR-0005. boolean prop 네이밍 규칙 확장

## 맥락

계약 15종(ADR-0003)을 작성하자 네이밍 가드가 boolean prop 6건을 차단했다.

| prop | 계약 | 성격 |
|---|---|---|
| `busy` | Card | 상태 형용사 (aria-busy) |
| `revealed` | PasswordField | 상태 형용사 (비밀번호 표시 여부) |
| `showLegend` | LineAreaChart | 표시 토글 |
| `showTotal` | TodoCard | 표시 토글 |
| `hideWhenZero` | Badge | 표시 토글 |
| `dimZero` | DataTable | 표시 토글 |

규칙은 `is/has/can` 접두 또는 상태 형용사 화이트리스트만 허용한다. 화이트리스트는
`loading`/`disabled`/`readonly` 같은 단어로 채워져 있는데, 이는 **이 컴포넌트들이 존재하기 전에**
작성된 목록이다.

## 결정

두 가지를 추가한다.

**(1) 상태 형용사 화이트리스트에 `busy`, `revealed` 추가.**
`loading`, `disabled` 와 문법적으로 완전히 같은 부류다 — 컴포넌트의 현재 상태를 서술하는 형용사.
규칙이 이미 허용하려던 것이 목록에서 빠져 있었을 뿐이다.

**(2) 표시 토글 접두 `show` / `hide` / `dim` 허용.**
`BOOL_DISPLAY_PREFIX_RE = /^(?:show|hide|dim)[A-Z][A-Za-z0-9]*$/`

**접두 3개는 열거 가능한 전체 집합이다.** 늘리려면 아키텍처 승인(새 ADR)이 필요하다.

## 근거

- 규칙의 의도는 "boolean prop 이 **술어로 읽힐 것**"이다. `showLegend` 는 그 의도를 이미 만족한다 —
  "범례를 보여주는가?"로 읽힌다. 명령형처럼 보이지만 prop 으로서의 의미는 상태 서술이다.
- `show*` 는 React 생태계의 사실상 표준이다. 이를 금지하면 `isLegendVisible` 같은 우회 이름이 생기는데,
  이는 **더 길고 덜 관용적일 뿐 규칙의 목적을 더 잘 달성하지 않는다.** 규칙이 얻는 것 없이 마찰만 만든다.
- 계약을 바꾸면 15종 중 6종이 MAJOR 버전 범프 대상이 된다 (prop 이름 변경 = 하위호환 파괴).
  규칙 한 줄로 해결될 문제에 SemVer 부채를 지는 것은 균형이 맞지 않는다.

## 대안

1. **계약의 prop 을 규칙에 맞게 개명** (`showLegend` → `isLegendVisible` 등) — 위 근거대로
   더 나쁜 이름을 얻고 MAJOR 범프까지 치른다. 기각.
2. **동사 접두를 전면 허용** (`/^[a-z]+[A-Z]/`) — 규칙이 사실상 무의미해진다. `renderFooter`,
   `updateOnBlur` 같은 것까지 통과하며, boolean 이 술어로 읽히도록 강제하는 장치가 사라진다. 기각.
3. **가드 우회 / 예외 주석** — 네이밍 가드 리포트가 명시하듯 "가드는 우회하지 않는다". 규칙에 이의가 있으면
   규칙을 고치는 것이 조직의 절차다 (ADR-0002 에서 확립한 패턴). 기각.

## 결과

- `tools/naming-guard/src/rules.ts`: `BOOL_DISPLAY_PREFIX_RE` 추가, `BOOLEAN_STATE_WHITELIST` 에
  `busy`/`revealed` 추가, `checkContractContent` 가 세 조건을 OR 로 검사.
- `pnpm naming:check` 위반 0건.
- 계약 15종 **무변경** — MAJOR 범프 없음. 4자 일치(계약 테스트) PASS 15/15 유지.
- 접두 목록을 늘리려는 시도는 이 ADR 을 superseding 하는 새 ADR 을 요구한다.
