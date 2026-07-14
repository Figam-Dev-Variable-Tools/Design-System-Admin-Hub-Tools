# @tds/vrt — Visual Regression 파이프라인

> 소유: **A70 Visual Regression AI** (`orchestration/registry/agents.json`)
> 차단 조건: **Storybook ↔ Figma pixel diff > 0.1% → G7 차단** (`orchestration/registry/gates.json`)

Storybook 스토리 스크린샷과 Figma export 기준 이미지를 픽셀 단위로 비교해
G7(Figma 동기화) 게이트의 차단 입력을 생성한다. SLO: `storybookFigmaVisualDiff ≤ 0.1%`.

## 실행

```bash
pnpm vrt                                        # 루트 스크립트 (= pnpm --filter @tds/vrt run test)
pnpm --filter @tds/vrt run test -- --update-baseline   # 기준 이미지 최초 등록 모드
```

사전 조건: `pnpm sb:build` 로 `packages/ui/storybook-static` 생성,
`pnpm --filter @tds/vrt exec playwright install chromium` 으로 브라우저 설치.

## 파이프라인

1. `packages/ui/storybook-static/index.json` 에서 스토리 목록 수집
2. 내장 정적 서버 + Playwright(chromium)로 각 스토리의 `#storybook-root` 캡처
   (뷰포트 1280×720, `reducedMotion: reduce`, 중간물은 `reports/vrt/tmp/<date>/` — gitignore 대상)
3. 기준 이미지 탐색 (우선순위 순):
   - **1순위** `docs/figma/specs/**/exports/<storyId>.png` — Figma export가 정본 (A51~A55 산출)
   - **2순위** `reports/vrt/baseline/<storyId>.png` — 자체 관리 baseline
4. pixelmatch로 diff 비율 계산 → **0.1% 초과** 스토리를 실패 목록에 수집
5. `reports/vrt/<date>-summary.json` + 실패 건별 diff PNG(`reports/vrt/diff/<date>/<storyId>.png`) 기록

기준 이미지 파일명 규칙: 스토리 ID와 동일 (예: `atoms-button--primary.png`).

## baseline 등록 모드 (`--update-baseline`)

기준 이미지가 전혀 없는 스토리는 기본 실행에서 `no-baseline`(경고, 실패 아님)으로 기록된다.
`--update-baseline` 을 붙이면 해당 스토리의 현재 스크린샷을 `reports/vrt/baseline/` 에 등록한다.

- `docs/figma/specs/**` 는 A51~A55 소유 경로이므로 **이 도구는 절대 그 경로에 쓰지 않는다** (P1 단일 소유권).
- Figma export가 나중에 도착하면 그것이 자동으로 1순위 정본이 된다 (local baseline은 fallback).

## Graceful skip

다음 경우 실패 대신 `status: "skipped"` 리포트를 남기고 **exit 0** 으로 종료한다.

| 상황 | 안내 |
|---|---|
| `storybook-static` 없음 | `pnpm sb:build` 실행 |
| 스토리 인덱스 없음/비어있음 | Storybook 빌드 정상 여부 확인 |
| playwright 미설치 | `pnpm install` + `playwright install chromium` |
| pixelmatch/pngjs 미설치 | `pnpm install` |

## 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | 통과 · 또는 graceful skip |
| 1 | diff > 0.1% 스토리 존재 → **G7 차단** (A56 Figma Reviewer + A00에 escalation) |

## 출력 규격

`reports/vrt/README.md` 참조. 리포트는 기계 생성 전용이며 A56(Figma Reviewer)이 RR-G7 검수의 evidence로 인용한다.
