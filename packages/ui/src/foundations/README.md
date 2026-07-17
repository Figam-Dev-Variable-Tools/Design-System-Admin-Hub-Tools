# Foundations 스토리 — 토큰 맵 동적 렌더

Storybook 사이드바 `Foundations/*` 카테고리의 원천 코드. **토큰 값을 하드코딩하지 않는다** —
`tokens/tokens.json`(단일 원천, SSOT)에서 생성된 산출물만 순회/해석해 렌더하므로,
토큰을 추가·변경하면 **codegen 재실행만으로 모든 Foundations 페이지가 자동 갱신**된다.
Figma Variables 도 같은 tokens.json 에서 생성되므로(Figma 변수) Storybook ↔ Figma 는 구조적으로 동일함이 보장된다.

## 동작 원리

| 무엇 | 어디서 읽나 | 방식 |
|---|---|---|
| 토큰 **목록** (경로, CSS 변수명) | `generated/tokens/tokens.ts` 의 `tokenVars` 타입드 맵 | import 후 순회 |
| 토큰 **값** (라이트/다크) | `generated/tokens/tokens.css` (preview.ts 가 로드) | CSSOM 에서 `:root`(라이트) / `[data-theme='dark']`(다크) 선언을 읽고 var() 참조 체인을 런타임에 해석 |

화면에 보이는 hex/px/ms 문자열은 전부 **런타임 데이터**이며 코드 리터럴이 아니다
(조직 규칙 "하드코딩 색상/px 금지"는 리터럴 금지이지, 토큰 값의 데이터 렌더링 금지가 아니다).

## 선행 조건

`generated/tokens/*` 는 codegen 산출물이라 리포 초기 상태에 존재하지 않는다.
Storybook 실행/빌드 전 **반드시 루트에서 `pnpm codegen` 선행** (packages/ui/README.md 참고).

## 파일 구성

| 파일 | 사이드바 타이틀 | 내용 |
|---|---|---|
| `Colors.stories.tsx` | Foundations/Colors | primitive/semantic/component 계층별 스와치 그리드 (경로·변수명·라이트/다크 값) |
| `FontColors.stories.tsx` | Foundations/Font Colors | `color.text.*` 를 실제 텍스트에 적용 + 라이트/다크 나란히 대비 확인 |
| `Typography.stories.tsx` | Foundations/Typography | 컴포지트별 스펙 표(패밀리/사이즈/행간/웨이트) + 샘플 문장 |
| `Spacing.stories.tsx` | Foundations/Spacing | 간격 스케일 바 시각화 |
| `Radius.stories.tsx` | Foundations/Radius | 반경 미리보기 박스 |
| `Shadow.stories.tsx` | Foundations/Shadow | 그림자 데모 — 현재 토큰 0건이라 안내만 표시, 토큰 추가 시 자동 채워짐 |
| `Motion.stories.tsx` | Foundations/Motion | duration/easing 재생 데모 + 값 표 |
| `_shared.tsx` | (스토리 아님) | 공용 렌더 유틸 — `TokenTable`, `SwatchGrid`, `ThemePanel`, CSSOM 해석기 |

## 토큰을 추가하려면

1. `tokens/tokens.json` 수정은 토큰 엔지니어 소유, 토큰 리뷰(G4) 승인 필요 — 여기서는 수정하지 않는다.
2. G4 승인 + `pnpm codegen` 후 Foundations 는 자동 반영된다. 새 그룹(예: shadow)이 생겨도
   스토리가 맵을 동적 순회하므로 이 폴더의 코드 수정은 원칙적으로 불필요하다.

담당: 컴포넌트 엔지니어 · 검수: 스토리북 리뷰 (G5)
