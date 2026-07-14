---
# ── D8 · TDS Guideline 템플릿 ───────────────────────────────────────────
# 소유자: A60 (TDS Documentation AI) · 경로 규칙: docs/tds/{patterns|guidelines|components}/<주제>.md
# 게이트: G8 (승인자 A61 Docs Reviewer) · 체크리스트: docs/_templates/checklists/G8.md
doc: D8
id: TDS-GL-NNN
title: "<가이드라인 제목>"
owner: A60
reviewer: A61
gate: G8
category: pattern         # pattern | best-practice | component-usage
status: draft             # draft | in_review | approved
date: YYYY-MM-DD
relatedContracts: []      # 관련 계약 (예: [contracts/Button.contract.json])
---

<!--
[작성 지침]
- API 표(props/events)는 수기로 작성하지 않는다 — 계약에서 자동 생성된 문서를
  참조·링크한다 (pnpm codegen, agents.json A60 note). 수기 API 표는 G8 반려 사유.
- 코드 예제는 실제 빌드·실행 가능해야 한다 (G8 체크리스트 "문서 코드 예제가
  실제 빌드/실행됨"). import 경로는 public entry만 사용한다.
- Do/Don't는 반드시 쌍으로, 이유와 함께 쓴다. "하지 마세요"만 있고 대안이 없으면 반려.
- 용어는 TDS 표준 용어집을 따른다 — 동일 개념에 복수 용어 사용 금지 (A61 검수 항목).
-->

# <가이드라인 제목>

## 1. 패턴 개요

<!-- 이 패턴이 해결하는 문제, 언제 쓰는가 / 언제 쓰지 않는가를 명시한다. -->

| 항목 | 내용 |
|---|---|
| 해결하는 문제 | |
| 사용하는 경우 | |
| 사용하지 않는 경우 (대안 포함) | |
| 관련 컴포넌트 | |

## 2. Best Practice

<!-- 번호 목록. 각 항목은 "규칙 → 이유" 구조로 쓴다. -->

1. **<규칙>** — <이유. 가능하면 메트릭·접근성·계약 근거 연결>

## 3. Do / Don't

| ✅ Do | ❌ Don't | 이유 |
|---|---|---|
| | | |

## 4. 코드 예제

<!-- 빌드 가능한 완결 예제. 하드코딩 값 금지 — 토큰/컴포넌트 prop만 사용. -->

```tsx
import { Button } from "@tds/ui";

export function Example() {
  return <Button variant="primary">저장</Button>;
}
```

## 5. 참고

- 계약: <relatedContracts 링크>
- 자동 생성 API 문서: <codegen 산출물 링크>
- 관련 가이드라인: 
