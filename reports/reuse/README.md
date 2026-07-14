# reports/reuse/ — 재사용 판정 리포트 (A75)

`tools/reuse-guard`(`@tds/reuse-guard`, `pnpm reuse:check`)가 생성한다. 트리거는 G0 신규 컴포넌트 요청 접수 시 A00의 사전 조회(판정 없이 신규 계약 생성 금지)이며, 기존 Storybook 컴포넌트와의 유사도를 판정해 **유사도 85% 이상이면 신규 생성을 차단하고 EXTEND를 강제**한다 (컴포넌트 중복률 SLO ≤ 3%). 포맷: `<component>.json`(요청 대상 단위) — REUSE/EXTEND/CREATE 판정, 유사 후보 목록과 유사도 점수, 판정 근거. A11(UI Planner)이 Screen Spec에 첨부하고 A12(Planning Reviewer)가 G1 evidence로 인용한다.
