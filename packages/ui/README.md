# @tds/ui — TDS 디자인 시스템 UI 패키지

Storybook 기반 컴포넌트 워크스페이스. 담당(역할 기준):

| 영역 | 담당 | 게이트 |
|---|---|---|
| `src/**` (컴포넌트 + 스토리) | 컴포넌트 엔지니어 | G5 |
| `**/*.mdx` (문서) | 스토리북 문서 | G5 |
| `pages/**` (조립 전용 페이지 스토리) | 스토리북 페이지 | G5 |
| 검수 | 스토리북 리뷰 — `packages/ui/review/**` | G5 승인권 |

## 선행 조건 — codegen 필수

`.storybook/preview.ts`가 `generated/tokens/tokens.css`를 import한다. 이 파일은 `tools/codegen`
산출물이므로 **Storybook 실행/빌드 전 반드시 리포 루트에서 codegen을 선행**해야 한다:

```bash
pnpm codegen        # tokens.json / contracts → generated/** 생성
pnpm sb             # = pnpm --filter @tds/ui run storybook (포트 6006)
pnpm sb:build       # = pnpm --filter @tds/ui run build-storybook
```

codegen 없이 실행하면 `generated/tokens/tokens.css`가 없어 Vite import 에러가 난다.
import 구문을 지우는 것이 아니라 codegen을 실행하는 것이 올바른 해결이다.

## Public Entry 규칙

- 소비 앱(`apps/*`)은 **`@tds/ui` 단일 entry(`src/index.ts`)로만** import한다.
  내부 경로 직접 import는 eslint(no-restricted-imports) + G6 체크리스트가 차단한다.
- 라이브러리 자체 번들(`build` 스크립트)은 현재 소비 앱(Vite)이 소스를 직접 컴파일하는
  워크스페이스 방식이며, vite lib mode 도입은 추후(G8 릴리스 라인)로 미룬다.

## 레이어 규칙 (G6 의존 방향)

`atoms ← molecules ← organisms ← templates` — 역방향 import는 `eslint.config.js`가 차단한다.
각 폴더 README에 1줄 규칙이 있다. `pages/`는 조립 전용(신규 컴포넌트 생성 금지, 스토리북 페이지).

## 금지 사항

- 하드코딩 색상(hex)/px 리터럴 — eslint no-restricted-syntax가 차단 (토큰 필요 시 토큰 엔지니어에 요청).
- `generated/**` 수동 편집 — `pnpm codegen`으로만 재생성.
- 계약(G3 APPROVED) 없는 컴포넌트 구현 착수.
