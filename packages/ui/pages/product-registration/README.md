# pages/product-registration — 상품 등록 페이지 조립 (Pages/상품 등록)

- **대응 화면정의서**: `docs/plan/ui/SCR-003-product-registration.md` (status: draft)
- **스토리**: `ProductRegistrationPage.stories.tsx` — placeholder 골격 (토큰 CSS 변수만 사용, 실제 컴포넌트 미조립)
- **소유**: A32 (Page Composer) · **게이트**: G5 (승인자 A33)

## 필요 모듈 (SCR-003 §4 기준)

| 모듈 | 분류 | 계약 | 비고 |
|---|---|---|---|
| TextField | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 상품명 입력 (글자 수 카운터, SCR-001과 공동 수요) |
| TextArea | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 상품 설명 (여러 줄 + 글자 수 카운터) |
| NumberField | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 판매가 · 재고 수량 (천 단위 구분 표시) |
| Select | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 카테고리 선택 (SCR-002와 공동 수요) |
| FileUpload | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 이미지 업로드 (드롭존 · 파일별 진행/실패/삭제) |
| FormSection | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 폼 구획 래퍼 (섹션 제목 · 설명 · 필드 그룹) |
| Alert | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 복원 안내 · 서버 오류 · 성공 안내 (SCR-001/002와 공동 수요) |
| EmptyState | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | 권한없음 안내 (SCR-002와 공동 수요) |
| Badge | 신규(잠정) — A75 판정 대기 | 없음 — G3 계약 작성 전 | '대표' 이미지 표시 (SCR-002와 공동 수요) |
| Button | 기존 | contracts/Button.contract.json@1.0.0 (beta) | [등록] primary · [임시저장] secondary — loading/disabled 사용 |

## 조립 전 체크리스트 — 모듈 G5 통과 후 조립

placeholder 골격은 아래 항목이 전부 체크되기 전까지 실제 컴포넌트로 교체하지 않는다.
모듈별 승인 여부는 `orchestration/state/<component>.json`의 `gates.G5.status = APPROVED`로 확인한다.

- [ ] TextField — G3 계약 승인 + G5 APPROVED
- [ ] TextArea — G3 계약 승인 + G5 APPROVED
- [ ] NumberField — G3 계약 승인 + G5 APPROVED
- [ ] Select — G3 계약 승인 + G5 APPROVED
- [ ] FileUpload — G3 계약 승인 + G5 APPROVED
- [ ] FormSection — G3 계약 승인 + G5 APPROVED
- [ ] Alert — G3 계약 승인 + G5 APPROVED
- [ ] EmptyState — G3 계약 승인 + G5 APPROVED
- [ ] Badge — G3 계약 승인 + G5 APPROVED
- [ ] Button — G5 APPROVED (계약은 v1.0.0 존재)
- [ ] placeholder 골격을 실제 컴포넌트 조립으로 교체 (SCR-003 §3 상태: 제출 로딩/필드·서버 에러/권한없음 + §3.1 이미지 업로드 · §3.2 임시저장 복원 · §3.3 카테고리 로드 보충 상태 스토리 포함)
- [ ] 교체 후에도 하드코딩 색상(hex)/px 리터럴 0건 유지
- [ ] 부족한 컴포넌트 발견 시 이 폴더에서 만들지 말고 A18에게 change_request 발행
