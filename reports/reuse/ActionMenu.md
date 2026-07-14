# Reuse Guard 판정 — ActionMenu

> 중복 컴포넌트 차단 (A75 Component Reuse AI) — G0 사전 조회 필수, 유사도 >= 85% 신규 생성 차단

- 실행 시각: 2026-07-14T20:32:17.509Z
- 입력: name=`ActionMenu`, props=[items, label, disabled]
- 알고리즘: 이름 유사도(레벤슈타인 정규화) 40.0% + props 집합 자카드 60.0% 가중 평균
- 임계값: >= 85.0% CREATE_BLOCKED · 60.0%~85.0% EXTEND_RECOMMENDED · < 60.0% CREATE_OK
- 비교 대상 계약: 15건

## 판정: CREATE_OK — 신규 생성 가능

## 상위 후보

| 순위 | 기존 컴포넌트 | 버전 | 이름 유사도 | props 자카드 | 종합 | 공유 props |
|---|---|---|---|---|---|---|
| 1 | Checkbox | 1.0.0 | 10.0% | 40.0% | 28.0% | label, disabled |
| 2 | PasswordField | 1.0.0 | 23.1% | 25.0% | 24.2% | label, disabled |
| 3 | Button | 1.0.0 | 30.0% | 12.5% | 19.5% | disabled |
| 4 | SegmentedControl | 1.0.0 | 18.8% | 14.3% | 16.1% | disabled |
| 5 | Tabs | 1.0.0 | 10.0% | 20.0% | 16.0% | items |

## 후속 조치

- 신규 계약 생성 진행 가능. 이 리포트를 G0 Task Graph / G1 Screen Spec 에 첨부한다.
