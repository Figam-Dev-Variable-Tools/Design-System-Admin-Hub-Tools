# @tds/perf — 성능 감사

> 담당: 성능 감사
> 차단 조건: **Performance Budget 초과 → G6 차단**

packages/ui public entry의 gzip 번들 크기를 size-limit으로 측정하고
"컴포넌트당 +2KB" 예산 규칙으로 판정한다.

## 실행

```bash
pnpm perf        # 루트 스크립트 (= pnpm --filter @tds/perf run audit)
```

사전 조건: `pnpm --filter @tds/ui run build` 로 `packages/ui/dist` 생성.

## 번들 예산 규칙

| 항목 | 값 | 근거 |
|---|---|---|
| 기본 예산 (컴포넌트 0개) | 30 KB gzip | 런타임 + 유틸 몫 |
| 컴포넌트당 증분 | **+2 KB gzip** | G6 체크리스트 "컴포넌트 추가 gzip +2KB 이내" |
| 절대 상한 | 128 KB gzip | `tools/perf/.size-limit.json` (size-limit 정적 한도) |

- 판정식: `allowedKB = 30 + 2 × componentCount`
- 컴포넌트 수 = `packages/ui/src/{atoms,molecules,organisms,templates}/` 바로 아래 폴더 수
- `.size-limit.json` 은 정적 절대 상한만 정의하고, 실제 판정은 `src/index.ts` 의 동적 예산이 우선한다.
- 측정 대상: `packages/ui/dist/index.js`(또는 `index.mjs`) — 앱은 public entry로만 import 하므로
  이 파일이 소비자가 지불하는 실비용이다 (Tree Shaking 회귀도 여기서 드러난다).

## Graceful skip

| 상황 | 처리 |
|---|---|
| `packages/ui/dist` 없음 | 안내(`pnpm --filter @tds/ui run build`) + skipped 리포트 + exit 0 |
| size-limit 미설치/실행 불가 | 안내(`pnpm install`) + skipped 리포트 + exit 0 |

## 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | 예산 이내 · 또는 graceful skip |
| 1 | **예산 초과** → G6 차단 (코드 리뷰 + 오케스트레이터에 escalation, 성능 ↔ 기능 충돌은 아키텍처 판정) |

## 렌더 카운트 예산 가이드 (수동/Play Function 검증)

번들과 달리 렌더 횟수는 정적 측정이 불가능하다. 아래 예산을 G6 리뷰(코드 리뷰)와
Storybook Play Function에서 검증한다.

| 예산 | 기준 |
|---|---|
| 초기 마운트 | 컴포넌트당 렌더 **1회** (StrictMode 중복 제외) |
| 무관 상태 변경 | 재렌더 **0회** — context 분리·`memo`로 격리 |
| prop 불변 재렌더 | 0회 — 콜백은 `useCallback`, 파생값은 `useMemo`로 참조 안정화 |
| 리스트 100행 이상 | 가상화 필수 (G6 체크리스트) — 보이는 행만 렌더 |
| 입력 타이핑 | 키 입력당 재렌더는 해당 필드 서브트리로 한정 |

측정 도구: React DevTools Profiler(개발 중), `React.Profiler` 래퍼 + Play Function(자동화),
`why-did-you-render`(원인 추적). Suspense 경계·lazy 분할은 조립(Templates/Pages) 레벨에서만 도입한다.

## 출력 규격

`reports/perf/<date>.json` — 측정값(gzip bytes) · 예산 계산식 · size-limit 원본 결과.
코드 리뷰가 RR-G6 검수의 evidence로 인용한다.
