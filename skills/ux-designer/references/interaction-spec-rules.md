# Interaction Spec(DS-NNN, ux) 작성 규칙

> D3 문서 규격의 UX 절반 (org-design-v2.md §6). A17(Design Reviewer)이 G2 체크리스트로 검증하고,
> A18(Contract Engineer)이 계약의 `a11y` 블록으로, A54가 Figma Prototype으로 옮겨 적는 원천이다.

## 1. 파일 규칙

- 경로: `docs/design/ux/DS-NNN.md` — NNN은 대상과 매핑 (A14의 `docs/design/ui/DS-NNN.md`와 동일 번호 = 동일 대상)
- frontmatter 필수 필드:

```yaml
---
id: DS-012
title: 회원 관리 — 목록 (Interaction)
scr: SCR-012                # 원천 Screen Spec
status: draft               # draft | in_review | approved
date: 2026-07-14
producer: A13
---
```

## 2. 키보드 맵 (필수)

컴포넌트/영역별 표. **모든 상호작용 요소에 대해 아래 키를 전수 판정한다** — 지원하지 않는 키도 "미지원"으로 명시(침묵 금지).

| Key | 조건/상태 | 동작 | 결과 (focus/aria 변화) |
|---|---|---|---|
| Tab / Shift+Tab | 항상 | 다음/이전 포커스 이동 | Focus Order §3 순서 준수 |
| Enter | 행 포커스 시 | 상세 진입 | 상세 패널 open, focus는 패널 제목으로 |
| Space | 체크박스 포커스 시 | 선택 토글 | `aria-checked` 반전 |
| Esc | 모달 open 시 | 모달 닫기 | focus는 트리거 버튼으로 복귀 |
| ArrowUp/Down | 리스트박스 open 시 | 옵션 이동 | `aria-activedescendant` 갱신 |

규칙:
- `disabled`/`loading` 상태에서의 키 동작(차단 여부)을 반드시 기술 — 계약의 `events.blockedWhen` 원천이 된다
- 단축키 충돌(브라우저/스크린리더 기본 동작) 검토 결과를 비고로 남긴다

## 3. Focus Order (필수)

1. **초기 포커스**: 화면/모달 진입 시 포커스 위치 (예: "모달 열림 → 제목 h2")
2. **Tab 순서**: 번호 목록으로 전수 나열 (시각 배치가 아니라 의미 순서 기준)
3. **Focus trap**: trap 범위(모달/드로어/데이트피커), trap 진입·탈출 조건
4. **복귀 규칙**: 닫힘(Esc/저장/취소)별 포커스 복귀 위치
5. **focus-visible**: 링 표시 조건(키보드 조작 시에만). 링의 시각 값(색/두께)은 A14 Visual Spec 영역 — 여기서는 "표시된다"는 사실과 조건만

## 4. Motion Spec (필수)

모든 모션은 표로 정의하고, **duration/easing은 반드시 `tokens/tokens.json`의 motion 토큰 경로로 참조**한다.

| 트리거 | 대상 속성 | duration | easing | prefers-reduced-motion 대체 |
|---|---|---|---|---|
| 모달 open | opacity, transform | `motion.duration.normal` | `motion.easing.emphasized` | opacity만 `motion.duration.instant` |
| 토스트 진입 | transform | `motion.duration.fast` | `motion.easing.standard` | 즉시 표시 (전환 없음) |

금지:
- `200ms`, `0.3s`, `cubic-bezier(0.4, 0, 0.2, 1)` 등 **원시값 기입 금지** — G2 반려 (하드코딩 0건)
- reduced-motion 대체 열 공란 금지 — 모든 행에 즉시 전환 / opacity-only / 생략 중 하나를 명시
- 참조 토큰이 tokens.json에 없으면 스펙 완성 전 A20에 change_request 발행 (blocking)

자가 검사(Grep 패턴 예):

```
[0-9]+ms|[0-9.]+s\b|cubic-bezier|linear\(
```

## 5. Responsive 규칙 (필수)

sm / md / lg 3개 브레이크포인트 **전부**에 대해:
- 인터랙션 대체: hover 불가 환경(터치)에서의 대체 동작
- 터치 타깃 최소 크기 충족 방식 (값 자체는 토큰 — 예: `size.touch-target.min`)
- 제스처(스와이프/롱프레스)와 그 키보드/버튼 대체 수단 (제스처 단독 의존 금지)

## 6. 흔한 반려 사유 (A17 실측 기준)

- Esc 동작이 "닫힌다"까지만 있고 **포커스 복귀 위치 누락** → major
- 모션 표에 easing이 `ease-in-out` 원시 키워드 → blocker성 하드코딩
- reduced-motion 열 누락 → major
- disabled 상태 키 동작 미기술 → 계약 blockedWhen 공란으로 전파되어 G3에서 반송
