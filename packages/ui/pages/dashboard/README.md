# pages/dashboard — 대시보드 페이지 조립 (Pages/대시보드)

- **대응 화면정의서**: `docs/plan/ui/SCR-002-dashboard.md` (status: draft)
- **스토리**: `DashboardPage.stories.tsx` — placeholder 골격 (토큰 CSS 변수만 사용, 실제 컴포넌트 미조립)
- **소유**: A32 (Page Composer) · **게이트**: G5 (승인자 A33)

## 필요 모듈 (SCR-002 §4 기준)

| 모듈 | 분류 | 계약 | 비고 |
|---|---|---|---|
| StatCard | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | KPI 스탯 카드 4종 (제목 · 집계값 · 증감 Badge 슬롯) |
| Table | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 최근 활동 테이블 (스켈레톤 행 상태 포함) |
| Pagination | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 테이블 하단 페이지 이동 (Table 계약 포함 여부는 G0 결정) |
| Select | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 기간 필터 (오늘/최근 7일/최근 30일) |
| Badge | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 활동 유형 · KPI 증감 표시 |
| EmptyState | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 테이블 빈 상태 · 권한없음 상태 |
| Skeleton | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 테이블 행 · KPI 값 로딩 표시 |
| Alert | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 위젯 인라인 에러 안내 (SCR-001과 공동 수요) |
| Button | 기존 | contracts/Button.contract.json@1.0.0 (beta) | [다시 시도] 액션 |

## 조립 전 체크리스트 — 모듈 G5 통과 후 조립

placeholder 골격은 아래 항목이 전부 체크되기 전까지 실제 컴포넌트로 교체하지 않는다.
모듈별 승인 여부는 `orchestration/state/<component>.json`의 `gates.G5.status = APPROVED`로 확인한다.

- [ ] StatCard — G3 계약 승인 + G5 APPROVED
- [ ] Table — G3 계약 승인 + G5 APPROVED
- [ ] Pagination — G3 계약 승인 + G5 APPROVED (Table 계약 통합 시 Table로 대체)
- [ ] Select — G3 계약 승인 + G5 APPROVED
- [ ] Badge — G3 계약 승인 + G5 APPROVED
- [ ] EmptyState — G3 계약 승인 + G5 APPROVED
- [ ] Skeleton — G3 계약 승인 + G5 APPROVED
- [ ] Alert — G3 계약 승인 + G5 APPROVED
- [ ] Button — G5 APPROVED (계약은 v1.0.0 존재)
- [ ] placeholder 골격을 실제 컴포넌트 조립으로 교체 (SCR-002 §3 상태: 위젯별 빈/에러/로딩/권한없음 + §3.1 KPI · §3.2 차트 보충 상태 스토리 포함)
- [ ] 교체 후에도 하드코딩 색상(hex)/px 리터럴 0건 유지
- [ ] 부족한 컴포넌트 발견 시 이 폴더에서 만들지 말고 A18에게 change_request 발행
