---
# ── D7 · Migration Guide 템플릿 ─────────────────────────────────────────
# 소유자: A03 (Release Manager) · 경로 규칙: docs/migration/vX-to-vY.md
# MAJOR 릴리스에는 이 문서가 반드시 존재해야 한다 — 없으면 G8에서 릴리스 차단.
doc: D7
id: vX-to-vY
owner: A03
from: X.0.0
to: Y.0.0
date: YYYY-MM-DD
components: []            # 영향받는 컴포넌트 목록 (예: [Button, Select])
codemod: null             # codemod 제공 시 실행 명령, 미제공 시 null
---

<!--
[작성 지침]
- Breaking마다 "Deprecated → 대체" 경로를 표로 제공한다. Deprecation 경로 없는
  Breaking은 금지다 (A03 notes, agents.json).
- codemod가 있으면 §3에 실행 명령과 커버리지를 기재한다. codemod 스크립트는
  tools/* 공유 패키지로만 배포한다 — 스킬 폴더·문서에 스크립트 복제 금지 (ADR-0001 결정 7).
- 마이그레이션 후 검증 절차(§5)는 실제 존재하는 pnpm 명령만 인용한다.
-->

# vX → vY 마이그레이션 가이드

## 1. 개요

<!-- 무엇이 왜 깨지는가, 영향 범위(컴포넌트·앱), 예상 작업량을 요약한다. -->

## 2. Deprecated → 대체 경로 표

<!-- 계약의 compat.deprecatedProps와 1:1 일치해야 한다. -->

| 컴포넌트 | Deprecated (vX) | 대체 (vY) | 제거 버전 (removeIn) | 자동 변환 (codemod) |
|---|---|---|---|---|
| Button | `type="primary"` | `variant="primary"` | 3.0.0 | O |
| | | | | |

## 3. Codemod 안내

<!-- codemod 미제공 시 이 섹션에 "제공 없음 — §4 수동 절차 참조"라고 명시한다. -->

- 실행 명령: `<frontmatter.codemod에 기재한 명령>`
- 적용 범위: `apps/**/src/**` (앱 코드), `packages/ui/pages/**` (조립 코드)
- 실행 전 조건: 작업 트리 clean 상태 (git stash 권장)

| 변경 | 자동 변환 | 비고 |
|---|---|---|
| | O / 부분 / X | X·부분인 항목은 §4에 수동 절차 필수 |

## 4. 수동 마이그레이션 절차

<!-- codemod가 못 하는 변경을 단계별로. 각 단계에 Before/After 코드 예시 포함. -->

### 4.1 <변경 항목>

```tsx
// Before (vX)

// After (vY)
```

## 5. 마이그레이션 후 검증

- [ ] `pnpm validate:contracts` — 계약 스키마 검증 통과
- [ ] `pnpm contract-test` — 4자 일치 통과 (reports/contract-test/)
- [ ] `pnpm lint` — 하드코딩·레이어 위반 0건
- [ ] `pnpm test` — 전체 테스트 통과
- [ ] `pnpm build` — 전체 빌드 성공
