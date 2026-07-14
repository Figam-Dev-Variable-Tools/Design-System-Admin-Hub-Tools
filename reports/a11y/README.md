# reports/a11y/ — 접근성 감사 리포트 (A72)

`tools/a11y`(`@tds/a11y`, `pnpm a11y`)가 생성한다. 트리거는 PR open(CI) 및 G5/G6 검수 요청 시점이며, Storybook test-runner + axe-playwright 로 전 스토리를 감사해 **critical/serious 위반이 1건이라도 있으면 G5/G6를 차단**한다 (exit 1). 포맷: `<date>.json` — impact별 집계(`axe.critical/serious/moderate/minor`)와 스토리별 위반 상세(axe rule id, help URL, 대상 노드). A33(Storybook Reviewer)·A42(Code Reviewer)가 RR-G5/RR-G6 evidence로 인용하며, `tmp/` 하위 JSONL 중간물은 gitignore 대상이다.
