# reports/perf/ — 성능 감사 리포트 (A73)

`tools/perf`(`@tds/perf`, `pnpm perf`)가 생성한다. 트리거는 PR open(CI bundle size diff) 및 G6 검수 요청 시점이며, size-limit으로 측정한 `packages/ui` public entry gzip 크기가 **동적 예산(30KB + 컴포넌트당 2KB)을 초과하면 G6를 차단**한다 (exit 1, 성능 ↔ 기능 충돌은 A01 판정). 포맷: `<date>.json` — 측정 바이트, 예산 계산식(`allowedKB = baseKB + perComponentKB × componentCount`), size-limit 원본 결과. A42(Code Reviewer)가 RR-G6 evidence로 인용한다. 렌더 카운트 예산은 정적 측정 불가로 `tools/perf/README.md` 가이드에 따라 리뷰·Play Function에서 검증한다.
