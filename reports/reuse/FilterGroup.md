# Reuse Guard 판정 — FilterGroup

> 중복 컴포넌트 차단 (A75 Component Reuse AI) — G0 사전 조회 필수, 유사도 >= 85% 신규 생성 차단

- 실행 시각: 2026-07-14T20:32:12.205Z
- 입력: name=`FilterGroup`, props=[heading, items, value, onChange, active, count]
- 알고리즘: 이름 유사도(레벤슈타인 정규화) 40.0% + props 집합 자카드 60.0% 가중 평균
- 임계값: >= 85.0% CREATE_BLOCKED · 60.0%~85.0% EXTEND_RECOMMENDED · < 60.0% CREATE_OK
- 비교 대상 계약: 15건

## 판정: CREATE_OK — 신규 생성 가능

## 상위 후보

| 순위 | 기존 컴포넌트 | 버전 | 이름 유사도 | props 자카드 | 종합 | 공유 props |
|---|---|---|---|---|---|---|
| 1 | Tabs | 1.0.0 | 9.1% | 28.6% | 20.8% | value, items |
| 2 | ListCard | 1.0.0 | 27.3% | 9.1% | 16.4% | count |
| 3 | ListRow | 1.0.0 | 36.4% | 0.0% | 14.5% | - |
| 4 | SegmentedControl | 1.0.0 | 18.8% | 10.0% | 13.5% | value |
| 5 | Badge | 1.0.0 | 9.1% | 12.5% | 11.1% | count |

## 후속 조치

- 신규 계약 생성 진행 가능. 이 리포트를 G0 Task Graph / G1 Screen Spec 에 첨부한다.
