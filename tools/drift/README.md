# @tds/drift — Design Drift 상시 감시

> 담당: 디자인 드리프트
> 차단 조건: **없음** — 드리프트 발견 시 알림 + 자동 Fix PR 트리거 (수정 리드타임 SLO ≤ 24h)

Storybook ≠ Figma ≠ Token 간 이탈을 nightly로 감시한다. 게이트를 막지 않는 대신
**exit 2**(알림 레벨)로 CI에 신호를 보내 자동 Fix PR 파이프라인을 기동한다.

## 실행

```bash
pnpm drift:check        # 루트 스크립트 (= pnpm --filter @tds/drift run check)
```

## 검사 항목

| id | 내용 | 심각도 |
|---|---|---|
| `stale-codegen` | `pnpm --filter @tds/codegen run check` 재실행 — 계약 대비 오래된 생성물 검출 (생성물 수기 편집·갱신 누락 감시) | error |
| `hardcoded-values` | `packages/ui/src` 하드코딩 스캔 — HEX 색상 · px 수치 · rgb()/hsl() 함수. **contract-test(계약 테스트)와 동일 정규식**(`src/rules.ts`) — 단 여기서는 warning으로 수집만, 차단 판정은 계약 테스트 관할 | warning |
| `unused-tokens` | `tokens/tokens.json` 전체 토큰 대비 미참조 토큰 비율 — 계약 `tokens` 블록 + DTCG alias(`{a.b.c}`) + `packages/ui/src` 의 `var(--tds-*)` 사용을 대조. **5% 초과 시 정리 요구 플래그** (G4 체크리스트) | warning |

- 정규식 목록(`src/rules.ts`)을 바꾸려면 아키텍처 승인 후 tools/contract-test 쪽과 **동시 수정**해야 한다.
- 정당한 예외 줄에는 `tds-ignore-hardcode` 마커를 사용한다 (남용은 리포트로 집계).
- CSS 변수 ↔ 토큰 경로 매칭은 양쪽을 하이픈으로 정규화해 비교한다
  (`color.action.primary.default` ↔ `var(--tds-color-action-primary-default)`).

## Graceful skip

`tools/codegen` · `packages/ui/src` · `tokens/tokens.json` 이 아직 없으면 해당 항목만
`skipped`로 기록하고 계속 진행한다 (조기 파이프라인 단계에서도 항상 실행 가능).

## 출력 · 종료 코드

- `reports/drift/<date>.json` — 기계 판독용 (검사별 findings 전체)
- `reports/drift/<date>.md` — 사람 판독용 요약 (Reviewer evidence 인용용)

| 코드 | 의미 |
|---|---|
| 0 | 드리프트 없음 (또는 전 항목 skipped) |
| 2 | **드리프트 발견** — 알림 레벨. CI가 이 코드를 받아 자동 Fix PR을 트리거한다. 게이트 차단 아님 |

Fix PR은 별도 브랜치 + PR로만 제안하며 직접 머지하지 않는다 (Verifier 하드 바운더리).
