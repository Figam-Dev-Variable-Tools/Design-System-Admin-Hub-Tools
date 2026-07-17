---
# ── D3 · Design Spec (디자인 스펙) 템플릿 ───────────────────────────────
# 경로 규칙: docs/design/DS-NNN.md
id: DS-NNN
title: "<컴포넌트/화면명> 디자인 스펙"
owner: [UX 디자인, UI 디자인]
reviewer: 디자인 리뷰
gate: G2
status: draft             # draft | in_review | approved
date: YYYY-MM-DD
screenSpec: docs/plan/ui/SCR-NNN.md
newTokens: []             # 신규 토큰 요청 목록 (토큰 경로). 비어있지 않으면 §6 정당화 필수
---

<!--
[작성 지침]
- 모든 시각 값은 tokens/tokens.json의 토큰 경로로만 기술한다. hex/px 직접 기입은
  G2 blocker다 (하드코딩 0건). 참고값이 필요하면 "(참고: #1A73E8)"처럼 괄호 병기만 허용.
- 접근성 ↔ 비주얼 충돌 시 접근성이 우선한다 — 디자인 리뷰가 반려한다.
- 신규 토큰이 필요하면 frontmatter의 newTokens에 나열하고 §6에 정당화를 쓴다.
  토큰 생성 자체는 토큰 엔지니어의 일이다 — 이 문서는 요청만 한다.
-->

# DS-NNN. <컴포넌트/화면명>

## 1. 개요

<!-- 대상, 대응 Screen Spec, 디자인 의도를 2~3문장으로 기술한다. -->

## 2. 토큰 참조 표 (UI 디자인)

<!-- 시각 속성별 토큰 매핑. 라이트/다크 열은 참고값(계산·검수용)이며 원천은 토큰이다.
     대비비 기준: 본문 텍스트 4.5:1, 대형 텍스트·UI 요소 3:1 (라이트/다크 각각 충족). -->

| 속성 | 토큰 경로 | 라이트 (참고값) | 다크 (참고값) | 대비 대상 | 대비비 |
|---|---|---|---|---|---|
| background | color.action.primary.default | | | | |
| text | | | | | |
| border | | | | | |
| radius | | | — | — | — |
| paddingX / paddingY | | | — | — | — |
| shadow | | | | — | — |

## 3. 키보드 · Focus (UX 디자인)

### 3.1 Keyboard Map

| 키 | 동작 | 조건 (상태별 차이) |
|---|---|---|
| Tab / Shift+Tab | | |
| Enter | | |
| Space | | |
| Esc | | |
| ↑ ↓ ← → | | |

### 3.2 Focus 규칙

<!-- Focus 순서는 번호 목록으로, DOM 순서와 다르면 사유를 명시한다. -->

- Focus 순서: 1. … 2. … 3. …
- Focus 링: `focus-visible` 시 토큰 `<focus ring 토큰 경로>` 적용
- Focus trap: (모달/오버레이인 경우) 적용 여부와 탈출 방법(Esc 등)
- 열림/닫힘 시 Focus 이동 대상: 

## 4. 반응형 — 3 브레이크포인트 (UI 디자인)

<!-- sm/md/lg 3개 브레이크포인트 전부 명세해야 G2 통과. "동일"도 명시적으로 쓴다. -->

| 항목 | sm | md | lg |
|---|---|---|---|
| 레이아웃/그리드 | | | |
| 크기/배치 변화 | | | |
| 노출/숨김 요소 | | | |

## 5. 모션 (UX 디자인)

<!-- duration/easing은 반드시 motion 토큰 참조. prefers-reduced-motion 열은 필수. -->

| 트랜지션 | duration 토큰 | easing 토큰 | prefers-reduced-motion 대응 |
|---|---|---|---|
| | motion.duration.* | motion.easing.* | (예: 트랜지션 제거, 즉시 전환) |

## 6. 신규 토큰 정당화

<!-- frontmatter newTokens가 비어있으면 "해당 없음"으로 기재.
     신규 토큰마다: 왜 기존 토큰으로 불가능한가 / 어느 계층(semantic·component)인가 /
     라이트·다크 페어 값 제안. -->
