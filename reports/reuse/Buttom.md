# Reuse Guard 판정 — Buttom

> 중복 컴포넌트 차단 (A75 Component Reuse AI) — G0 사전 조회 필수, 유사도 >= 85% 신규 생성 차단

- 실행 시각: 2026-07-14T10:53:12.062Z
- 입력: name=`Buttom`, props=[variant, size, loading, disabled, iconLeft, children]
- 알고리즘: 이름 유사도(레벤슈타인 정규화) 40.0% + props 집합 자카드 60.0% 가중 평균
- 임계값: >= 85.0% CREATE_BLOCKED · 60.0%~85.0% EXTEND_RECOMMENDED · < 60.0% CREATE_OK
- 비교 대상 계약: 1건

## 판정: CREATE_BLOCKED — 신규 생성 차단, EXTEND 강제

## 상위 후보

| 순위 | 기존 컴포넌트 | 버전 | 이름 유사도 | props 자카드 | 종합 | 공유 props |
|---|---|---|---|---|---|---|
| 1 | Button | 1.0.0 | 83.3% | 100.0% | 93.3% | variant, size, loading, disabled, iconLeft, children |

## 후속 조치

- 신규 컴포넌트 생성 금지. **Button** 를 확장(EXTEND)한다.
- Contract Engineer(A18)에게 change_request 를 발행해 기존 계약에 필요한 prop 을 추가한다 (G3 재진입, additive 변경이면 MINOR).
- 판정에 이의가 있으면 CEO AI(A00)에 에스컬레이션한다 — 가드 우회 금지.
