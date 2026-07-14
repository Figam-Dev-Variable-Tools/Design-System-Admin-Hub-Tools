# reports/contract-test/ — 4자 일치 검증 리포트 (A74)

`tools/contract-test`(`@tds/contract-test`, `pnpm contract-test`)가 생성한다. 트리거는 PR open(CI) 및 G4~G7 완료 후 합류 배리어(contract-test-final)이며, Contract ↔ React Props ↔ Storybook argTypes ↔ Figma Properties 의 4자 일치를 검증해 **불일치가 1건이라도 있으면 G5/G6/G7을 동시 차단**한다 — "100% 동기화"의 실제 구현체. 포맷: `<component>.json`(컴포넌트 단위, 예: `Button.json`) — 검증 축별(Contract↔React/Storybook/Figma/Token) pass/fail 과 불일치 상세. A33·A42·A56 Reviewer가 각 RR evidence로 인용한다.
