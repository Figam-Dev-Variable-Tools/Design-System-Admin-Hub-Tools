# generated — AUTO-GENERATED. 수동 편집 금지.

이 폴더의 모든 파일은 `tools/codegen`이 `contracts/*.contract.json`과 `tokens/tokens.json`에서
자동 생성한다. 재생성: 리포 루트에서 `pnpm codegen`.

예정 산출물:

- `tokens/tokens.css` — CSS 변수 (light 기본 + `[data-theme='dark']` 페어). `.storybook/preview.ts`가 import한다.
- `tokens/tokens.ts` — 토큰 경로 → CSS 변수명 타입드 맵 + `cssVar()` 헬퍼.
- `types/<Name>.types.ts` — 계약에서 생성된 React Props 타입 (수동 타입 선언 금지, G6 체크리스트).
- `argtypes/<Name>.argtypes.ts` — Storybook argTypes.

이 폴더를 손으로 고치면 Contract Test AI(A74)의 4자 일치 검증이 실패해 G5/G6/G7이 동시에 차단된다.
