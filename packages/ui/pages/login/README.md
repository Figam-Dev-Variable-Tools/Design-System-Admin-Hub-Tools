# pages/login — 로그인 페이지 조립 (Pages/로그인)

- **대응 화면정의서**: `docs/plan/ui/SCR-001-login.md` (status: draft)
- **스토리**: `LoginPage.stories.tsx` — placeholder 골격 (토큰 CSS 변수만 사용, 실제 컴포넌트 미조립)
- **담당**: 스토리북 페이지 · **게이트**: G5 (승인자 스토리북 리뷰)

## 필요 모듈 (SCR-001 §4 기준)

| 모듈 | 분류 | 계약 | 비고 |
|---|---|---|---|
| TextField | 신규(잠정) — 재사용 가드 판정 대기 | 없음 — G3 계약 작성 전 | 이메일 입력 + 비밀번호 입력(표시/숨김 토글 내장) |
| Checkbox | 신규(잠정) — 재사용 가드 판정 대기 | 없음 — G3 계약 작성 전 | '이메일 저장' |
| Alert | 신규(잠정) — 재사용 가드 판정 대기 | 없음 — G3 계약 작성 전 | 로그인 실패 · 계정 잠금 · 서버 오류 · 세션 만료 안내 |
| Button | 기존 | contracts/Button.contract.json@1.0.0 (beta) | 제출 버튼 — variant: primary, loading/disabled 사용 |

## 조립 전 체크리스트 — 모듈 G5 통과 후 조립

placeholder 골격은 아래 항목이 전부 체크되기 전까지 실제 컴포넌트로 교체하지 않는다.
모듈별 승인 여부는 해당 모듈의 G5 승인 상태(APPROVED)로 확인한다.

- [ ] TextField — G3 계약 승인 + G5 APPROVED
- [ ] Checkbox — G3 계약 승인 + G5 APPROVED
- [ ] Alert — G3 계약 승인 + G5 APPROVED
- [ ] Button — G5 APPROVED (계약은 v1.0.0 존재)
- [ ] placeholder 골격을 실제 컴포넌트 조립으로 교체 (SCR-001 §3 상태: 실패/잠금/서버 오류/로딩/세션 만료 시나리오 스토리 포함)
- [ ] 교체 후에도 하드코딩 색상(hex)/px 리터럴 0건 유지
- [ ] 부족한 컴포넌트 발견 시 이 폴더에서 만들지 말고 계약 엔지니어에게 변경 요청 발행
