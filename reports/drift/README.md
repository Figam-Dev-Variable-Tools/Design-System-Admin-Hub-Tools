# reports/drift/ — Design Drift 리포트 (A71)

`tools/drift`(`@tds/drift`, `pnpm drift:check`)가 생성한다. 트리거는 nightly(상시 감시 루프)이며 stale codegen 생성물 · `packages/ui/src` 하드코딩 값(contract-test와 동일 정규식, warning 수집) · 미사용 토큰 비율(5% 초과 시 정리 요구 플래그)을 검사한다. **게이트를 차단하지 않는다** — 드리프트 발견 시 exit 2(알림 레벨)로 CI 자동 Fix PR 파이프라인을 트리거하며, 수정 리드타임 SLO는 24h다. 포맷: `<date>.json`(검사별 findings 전체) + `<date>.md`(사람 판독용 요약 — Reviewer·A20 Token Engineer가 evidence로 인용).
