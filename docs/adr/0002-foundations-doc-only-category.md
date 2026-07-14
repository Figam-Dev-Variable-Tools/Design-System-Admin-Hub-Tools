---
id: ADR-0002
title: Foundations를 문서 전용 카테고리로 규정하고 네이밍 규칙에 반영
status: accepted
date: 2026-07-14
owner: A01 (Architecture AI)
supersedes: null
relatedTo: [ADR-0001]
---

# ADR-0002. Foundations를 문서 전용 카테고리로 규정하고 네이밍 규칙에 반영

## 맥락

Phase 2에서 `packages/ui/src/foundations/`가 신설됐다. 이 폴더는 `tokens.json`(SSOT)에서 파생된
`generated/tokens/tokens.ts` 맵을 순회해 **컬러 팔레트 · 폰트 컬러 · 타이포그래피 · 스페이싱 ·
라디우스 · 섀도 · 모션**을 Storybook에 렌더하는 스펙시멘 스토리 7종을 담는다. Figma Variables와
동일 원천에서 파생되므로 두 뷰의 일치가 구조적으로 보장된다 (page-module-pipeline §4).

A76(Naming Guard)이 이 폴더를 두 건의 위반으로 차단했다:

1. `component-dir` — 폴더명 `foundations`가 PascalCase도, Atomic 레벨 폴더
   (`atoms`/`molecules`/`organisms`/`templates`/`pages`)도 아니다.
2. `component-file` — 스토리 공용 렌더 유틸 `_shared.tsx`가 `<Name>.tsx` 규칙에 어긋난다.

A76의 리포트는 "규칙 자체에 이의가 있으면 A01에 규칙 개정을 제안한다 — 가드는 우회하지 않는다"고
명시한다. 이 ADR이 그 개정 기록이다.

## 결정

`foundations`를 **문서 전용(doc-only) 카테고리**로 정식 규정하고, 네이밍 규칙에 두 가지를 추가한다.

1. `DOC_ONLY_DIRS = { foundations }` — 문서 전용 폴더는 `component-dir` PascalCase 규칙의 대상이
   아니다. Atomic 레벨 폴더 화이트리스트와 동급으로 취급한다.
2. 문서 전용 폴더 **안에서만** `_` 접두 비공개 모듈(`_shared.tsx` 등)을 `component-file` 규칙의
   추가 허용 패턴으로 인정한다. 이 모듈은 `src/index.ts`(public entry)로 재노출하지 않는다.

경계 조건:

- Foundations는 **배포되는 컴포넌트를 담지 않는다.** 여기에 재사용 컴포넌트를 두려는 시도는
  Atomic 레벨 폴더로 옮겨야 하며, 계약(G3) 없이 만들 수 없다.
- `_` 접두 허용은 문서 전용 폴더에 한정된다. `atoms/`~`templates/`에서는 여전히 위반이다.

## 근거

- 규칙의 의도는 **배포 컴포넌트의 식별자 일관성**이다. Foundations는 컴포넌트가 아니라 토큰
  문서이므로 규칙의 적용 대상이 애초에 아니었다 — 규칙의 공백이지 코드의 결함이 아니다.
- Foundations 스토리는 토큰을 데이터로 렌더할 뿐 어떤 UI 계약도 소유하지 않는다. 여기에 Atomic
  네이밍을 강제하면 `TokenTable.tsx`, `SwatchGrid.tsx` 같은 파일이 컴포넌트 카탈로그에 섞여
  "계약 없는 컴포넌트"로 오인될 위험이 생긴다 — 규칙이 막으려던 것과 정반대 결과다.
- `_` 접두는 "공개 API가 아님"을 파일명 수준에서 드러내는 널리 쓰이는 관례이며, public entry
  재노출 금지 조항과 함께 쓰면 경계가 코드로 강제된다.

## 대안

1. **`_shared.tsx`를 `TokenSpecimens.tsx`로 개명하고 폴더를 `Foundations/`로 변경** — 규칙 개정
   없이 통과 가능하나, 위 근거대로 문서 유틸이 컴포넌트로 위장된다. 카테고리의 성격을 규칙에
   반영하지 않은 채 이름만 맞추는 회피에 가깝다. 기각.
2. **Foundations를 `packages/ui/src` 밖(예: `packages/ui/docs/`)으로 이동** — 네이밍 규칙 적용
   범위에서 빠지지만 `.storybook/main.ts`의 stories 글롭과 Storybook 사이드바 정렬(storySort)이
   `src` 기준으로 짜여 있어 설정이 흩어진다. 카테고리 하나 때문에 빌드 구성이 갈라지는 비용이
   규칙 한 줄 추가보다 크다. 기각.
3. **`_` 접두를 `packages/ui/src` 전역에서 허용** — 문서 폴더 밖에서도 계약 없는 헬퍼 컴포넌트가
   자랄 통로가 된다. P2(계약 우선)를 침식하므로 기각.

## 결과

- `tools/naming-guard/src/rules.ts`에 `DOC_ONLY_DIRS`와 `DOC_ONLY_FILE_PATTERNS`를 추가했다.
  `pnpm naming:check` 위반 0건.
- Foundations에 컴포넌트를 추가하려는 시도는 여전히 막힌다 — 규칙이 넓어진 범위는 문서 전용
  폴더의 폴더명과 `_` 접두 비공개 모듈 두 가지뿐이다.
- 향후 문서 전용 카테고리가 늘어나면(예: `patterns`) `DOC_ONLY_DIRS`에 추가하되, 이 ADR의 경계
  조건(배포 컴포넌트 금지 · public entry 재노출 금지)을 동일하게 적용한다.
