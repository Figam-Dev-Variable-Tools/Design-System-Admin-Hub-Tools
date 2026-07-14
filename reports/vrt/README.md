# reports/vrt/ — Visual Regression 리포트 (A70)

`tools/vrt`(`@tds/vrt`, `pnpm vrt`)가 생성한다. 트리거는 nightly 및 PR merge 후 Storybook 배포 시점이며, Storybook 스토리 스크린샷과 Figma export 기준 이미지(`docs/figma/specs/**/exports/*.png`, fallback: `baseline/`)의 픽셀 diff 비율이 **0.1%를 초과하면 G7을 차단**한다 (exit 1, A56 Figma Reviewer가 RR-G7 evidence로 인용). 포맷: `<date>-summary.json`(전체 판정 + 스토리별 diff 비율), 실패 건별 diff 시각화 PNG `diff/<date>/<storyId>.png`, 자체 관리 기준 이미지 `baseline/<storyId>.png`(`--update-baseline` 로만 등록). `tmp/` 하위 스크린샷 중간물은 gitignore 대상이다.
