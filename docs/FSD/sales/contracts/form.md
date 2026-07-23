# 계약 등록·수정

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 계약 수정 |
| 화면 ID | `SCR-SALES-CONTRACTS-FORM` |
| 메뉴 경로 | 영업 관리 > 계약 > (행 선택 · 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 계약의 내용(금액 · 기간 · 자동갱신 · 서명 · 조항 · 첨부)을 채우고 상태를 옮긴다. **그리고 체결이 끝난 계약에서 프로젝트를 만든다** — 사슬의 세 번째 화살표가 여기 있다.

**업무 배경** — 견적 상세의 `계약 만들기` 는 초안만 만든다(금액·거래처만 승계하고 기간·조항·담당자는 비어 있다). 그 나머지를 채우고, 검토 → 진행중으로 올리고, 서명 상태를 관리하는 곳이 이 화면이다. 계약이 **진행중 + 서명완료**가 되면 그때 프로젝트로 넘어갈 수 있다.

**화면 설명** — 라우트가 둘(`/new` · `/:id/edit`)이지만 같은 컴포넌트이고, `/new` 는 폼 대신 차단 안내 화면이 열린다. 수정 모드는 머리 줄(제목 + `프로젝트 만들기`), 상황 배너 3종, 좌우 2단(입력 카드 5개 / 계약서 요약 미리보기)으로 구성된다.

**주요 사용자** — 최상위 관리자 · 영업 담당 운영자.

**사용 시나리오**

1. 견적에서 방금 만들어진 계약 초안이 열린다 → 기간·조항·담당자를 채우고 상태를 '검토중'으로 올린다.
2. 도장을 받았다 → 상태를 '진행중', 전자서명을 '서명완료'로 바꾸고 저장한다 → **머리에 `프로젝트 만들기` 가 나타난다.**
3. 견적 없이 등록된 옛 계약을 연다 → '이 규칙이 생기기 전의 기록'이라는 warning 배너가 뜨지만 내용은 그대로 고칠 수 있다.

**선행 조건** — 로그인 · `sales.pipeline` 모듈 · 수정 권한. **등록은 어떤 권한으로도 열리지 않는다.**

**후행 처리** — 저장하면 계약 목록으로 돌아간다. 프로젝트를 만들면 `SCR-SALES-PROJECTS` 에 행이 생기고 프로젝트 수정 폼으로 이동한다.

**관련 화면** — [계약 목록](index.md) · [견적 상세](../quotes/detail.md)(계약이 태어나는 곳) · [프로젝트 수정](../projects/form.md) · [거래처 등록·수정](../accounts/form.md) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자기 자리가 없다.

**관련 기능** — '계약 완료'라는 상태는 만들지 않았다. 상태 유니온은 `초안·검토중·진행중·만료·해지` 이고, 운영자가 말한 '계약 완료'는 **새 칸이 아니라 이미 있는 두 사실의 교집합**이다: 서명완료 + 진행중 — `apps/admin/src/pages/sales/contracts/types.ts:220-236`.

**관련 API** — 계약 상세 조회 1건 · 계약 갱신 1건 · 프로젝트 생성 1건. **백엔드가 없다** — `TODO(backend): GET/POST /api/sales/contracts · GET/PUT/DELETE /api/sales/contracts/:id`(`apps/admin/src/pages/sales/contracts/data-source.ts:182`) · `TODO(backend): POST /api/sales/contracts/:id/project — 이미 있으면 기존 프로젝트를 돌려준다`(`apps/admin/src/pages/sales/projects/data-source.ts:152`).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일** — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx` (검증 `validation.ts` · 미리보기 `components/ContractSummaryPreview.tsx` · 차단 화면 `../_shared/ChainOnlyCreateNotice.tsx` · 거래처 선택 `../_shared/AccountSelectField.tsx` · 프로젝트 생성 `../projects/data-source.ts`)

---

### 1.1 `/new` 가 폼을 열지 않는다

예전에는 이 화면이 `?quoteId=` 로 값을 미리 채운 빈 폼을 열었고, **그 폼은 견적 없이도 저장할 수 있었다** — 그래서 어디서 왔는지 앱이 모르는 계약이 생겼다 — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:6-10`. 지금 `/sales/contracts/new` 는 왜 여기서 만들 수 없는지와 만드는 곳을 말하는 화면으로 간다. **막은 것은 생성뿐이다** — `/:id/edit` 는 평소처럼 열리고 삭제도 목록에서 그대로 된다.

## 2. 페이지(UI) 구성

### 2.1 차단 안내 모드 (`/sales/contracts/new`)

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| Header | 제목 `계약 등록` + 사슬 설명 한 줄 | `/new` 진입 | 전체 | 불가 | 표시 |
| 안내영역 | warning 배너 — 왜 못 만드는지 + 링크 2개 | 〃 | 전체 | 불가 | 표시 |

### 2.2 수정 모드 (`/sales/contracts/:id/edit`)

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 돌아가기 | 목록으로 | 항상 | 전체 | 불가 | 표시 |
| Header | 제목 `계약 수정` + 안내 한 줄 + `프로젝트 만들기` | 항상 | 전체 | 불가 | 표시 |
| 안내영역 | 원 견적 역링크 배너 · 견적 없는 계약 경고 · 프로젝트 상태 배너 · 서버 오류 배너 | 조건부 | 전체 | 불가 | 조건부 |
| 입력영역 — 계약 정보 | 계약명 · 거래처 · 계약유형 · 담당자 | 항상 | 전체 | 불가 | 표시 |
| 입력영역 — 금액 · 기간 | 계약금액 · 부가세 포함 토글 · 계약 기간 | 항상 | 전체 | 불가 | 표시 |
| 입력영역 — 갱신 · 서명 · 상태 | 자동갱신 토글 · 갱신 통지기한 · 계약 상태 · 전자서명 상태 | 항상 | 전체 | 불가 | 표시 |
| 입력영역 — 조항 · 첨부 | 주요 조항 요약 · 계약서 스캔 첨부 | 항상 | 전체 | 불가 | 표시 |
| 입력영역 — 비고 | 내부 메모 | 항상 | 전체 | 불가 | 표시 |
| 미리보기 | 계약서 요약 카드 | 항상 | 전체 | 불가 | 표시 |
| 버튼영역 | `취소` · `저장` | 항상 | 전체 | 불가 | 표시 |

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 차단 제목 | Heading(h1) | `계약 등록` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:290` | — | Y | Y | — | — | — | — | `/new` | — |
| 2 | 차단 설명 | Text(muted) | `영업 파이프라인(문의 → 견적 → 계약 → 프로젝트)은 앞 칸에서만 다음 칸이 생겨요.` — `apps/admin/src/pages/sales/_shared/ChainOnlyCreateNotice.tsx:68` | — | N | Y | — | — | — | — | 〃 | — |
| 3 | 차단 사유 | Alert(warning) | `계약은 견적에서 만들어져요. 고객이 승인한 견적 상세에서 ‘계약 만들기’를 누르세요.` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:291` | — | N | Y | — | — | — | — | 〃 | — |
| 4 | 만드는 곳 링크 | Link | `견적 목록으로` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:292` | — | N | N | 없음 | — | — | — | 〃 | — |
| 5 | 목록 링크 | Link | `계약 목록으로` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:293` | — | N | N | 없음 | — | — | — | 〃 | — |
| 6 | 화면 제목 | Heading(h1) | `계약 수정` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:338` | — | Y | Y | — | — | — | — | `/:id/edit` | — |
| 7 | 안내 한 줄 | Text(muted) | `별표(*) 항목은 필수예요. 계약 기간·금액을 확인하세요.` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:339` | — | N | Y | — | — | — | — | 〃 | — |
| 8 | 프로젝트 만들기 | Button(secondary) | `프로젝트 만들기` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:345` | 사슬의 다음 칸을 연다 | N | N | — | — | — | — | **`projectDraftBlock` 이 null 일 때만 존재한다** | 막혔을 때는 버튼이 없고 그 자리에 사유 배너가 온다 |
| 9 | 원 견적 배너 | Alert(info) + Link | `원 견적 {견적번호} 에서 만든 계약이에요. 금액·거래처는 견적을 따라요.` + `원 견적 보기` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:354-356` | 계약 ↔ 견적 양방향 | N | Y | — | — | — | — | `quoteId` 가 있을 때 | — |
| 10 | 견적 없는 계약 경고 | Alert(warning) | `견적 없이 등록된 계약이에요. 이 규칙(계약은 견적에서만 만든다)이 생기기 전의 기록이라 원 견적으로 가는 길이 없어요. 계약 내용은 그대로 수정할 수 있어요.` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:367-369` | 조용히 정상인 척하지 않는다 | N | Y | — | — | — | — | `quoteId` 가 빈 값일 때 | 지우지도 않는다 — 실제로 맺어진 계약이다 |
| 11 | 프로젝트 상태 배너 | Alert(info 또는 success) + Link | 막힌 사유 문장(§6) + 프로젝트가 있으면 `연결된 프로젝트 열기` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:374-387` | 버튼이 없는 자리에 침묵을 두지 않는다 | N | Y | — | — | — | — | `projectDraftBlock` 이 null 이 아닐 때 | 프로젝트가 있으면 success 톤 |
| 12 | 계약명 | TextField | `계약명` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:401` | 필수 | Y | N | 저장 중·조회 중 | 저장값 | `예: 2026년 SaaS 연간 이용계약` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:410` | 80자 — `apps/admin/src/pages/sales/contracts/types.ts:59` | 항상 | 견적에서 만들면 `{견적번호} 기준 계약` |
| 13 | 거래처 | AccountSelectField | `거래처` — 기본 라벨(`apps/admin/src/pages/sales/_shared/AccountSelectField.tsx:93`) | 마스터에서 고른다 | Y | N | 저장 중·목록 미도착 | 저장값 | — | — | 항상 | 견적 폼과 같은 컨트롤 |
| 14 | 계약유형 | SelectField | `계약유형` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:439` | 공급계약·용역계약·유지보수·라이선스·임대·비밀유지(NDA) | Y | N | 저장 중 | 저장값 | — | — | 항상 | 견적에서 만들면 `공급계약` |
| 15 | 담당자 | TextField | `담당자` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:448` | — | N | N | 저장 중 | 저장값 | `예: 김영업` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:454` | 없음 | 항상 | 견적은 담당자를 갖지 않아 초안에서 비어 있다 |
| 16 | 계약금액 | TextField(numeric) | `계약금액 (원)` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:468` | 숫자만. 저장 시 숫자가 아닌 문자를 걷어낸다 | Y | N | 저장 중 | 저장값 | `예: 36000000` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:478` | 검증에서 정수·0 초과 | 항상 | 견적 합계의 승계값 |
| 17 | 부가세 토글 | ToggleSwitch | `부가세 포함 여부` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:492` · 켜짐 `포함` / 꺼짐 `별도` | — | N | N | 저장 중 | 저장값 | — | — | 항상 | 견적에서 만들면 **과세 견적일 때만 '포함'** 이다 |
| 18 | 계약 기간 | DateRangeField | `계약 기간` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:501` | 두 날짜의 관계까지 검증 | Y | N | 저장 중 | 저장값 | — | `YYYY-MM-DD` | 항상 | 견적에서 만들면 오늘부터 1년 |
| 19 | 자동갱신 토글 | ToggleSwitch | `자동갱신 여부` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:522` · 켜짐 `사용` / 꺼짐 `미사용` | — | N | N | 저장 중 | 저장값 | — | — | 항상 | 끄면 통지기한이 0 으로 저장된다 |
| 20 | 갱신 통지기한 | TextField(numeric) | `갱신 통지기한 (일)` · 힌트 `만료 N일 전 통지` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:530-532` | — | N | N | 저장 중 | 저장값 | `예: 30` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:540` | 숫자만(검증) | **자동갱신이 켜졌을 때만 나타난다** | 목록의 `갱신임박` 배지가 이 값을 읽는다 |
| 21 | 계약 상태 | SelectField | `계약 상태` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:549` | 초안·검토중·진행중·만료·해지 | Y | N | 저장 중 | 저장값 | — | — | 항상 | **전이 제약이 없다** — 어느 상태로든 바꿀 수 있다 |
| 22 | 전자서명 상태 | SelectField | `전자서명 상태` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:558` | 미발송·서명대기·일부서명·서명완료 | Y | N | 저장 중 | 저장값 | — | — | 항상 | 〃 |
| 23 | 주요 조항 요약 | TextareaField | `주요 조항 요약` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:573` | 4줄 | N | N | 저장 중 | 저장값 | `지급조건·해지조건·SLA 등 핵심 조항을 요약하세요.` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:579` | 1,000자 — `apps/admin/src/pages/sales/contracts/types.ts:60` | 항상 | — |
| 24 | 계약서 첨부 | ImageGalleryField | `계약서 첨부(스캔)` · 힌트 `계약서·부속합의서 스캔본을 업로드하세요.` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:583,588` | 최대 5개 — `apps/admin/src/pages/sales/contracts/types.ts:61` | N | N | 저장 중 | 저장값 | — | 이미지 · 최대 5MB | 항상 | **업로드 엔드포인트가 없다**(§7) |
| 25 | 비고 | TextareaField | `메모` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:595` | 2줄 | N | N | 저장 중 | 저장값 | `내부 메모` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:600` | 500자 | 항상 | — |
| 26 | 미리보기 | ContractSummaryPreview | `미리보기` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:607` | 입력이 바뀌는 즉시 요약이 다시 그려진다 | N | Y | — | — | — | — | 항상 | — |
| 27 | 취소 | Button(secondary) | `취소` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:631` | — | N | N | 저장 중 | — | — | — | 항상 | — |
| 28 | 저장 | Button(primary) | `저장` · 저장 중 `저장 중…` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:634` | — | Y | N | 저장 중·조회 중 | — | — | — | 항상 | — |
| 29 | 서버 오류 배너 | FormServerError | §7 | 참조 코드가 붙는다 | N | Y | — | 없음 | — | — | 저장 실패 | — |
| 30 | 조회 실패 배너 | Alert(danger) + Button ×2 | §7 | 없음/오류를 가른다 | N | Y | — | — | — | — | 조회 실패 | — |

## 4. 기능 명세

### 4.1 사슬 밖 등록 차단 (`/sales/contracts/new`)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 근거 없는 계약이 만들어지는 것을 막고 만드는 곳을 알려 준다 |
| 실행 조건 | `:id` 가 없을 때 — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:287` |
| 사용자 동작 | 주소 입력 · 즐겨찾기 · 옛 링크 |
| 시스템 처리 | 폼을 조립하지 않고 안내 화면을 그린다 |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 안내 화면이 뜬다. 토스트 없음 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 권한 문제로 말하지 않는다 — 순서 문제다 |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 견적 목록 또는 계약 목록으로 |
| 로그 기록 여부 | N |

### 4.2 계약 조회 · 저장

| 항목 | 내용 |
|---|---|
| 기능 목적 | 계약 내용을 채워 저장한다 |
| 실행 조건 | 수정 모드에서 조회가 끝났을 때 |
| 사용자 동작 | 값을 고치고 `저장` 클릭 |
| 시스템 처리 | 공통 폼 컨트롤러가 검증 → 제출을 맡는다. 저장 직전 정규화: 문자열 공백 다듬기 · 금액/통지기한에서 숫자가 아닌 문자 제거 · **자동갱신이 꺼져 있으면 통지기한을 0 으로 저장** — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:159-180` |
| 데이터 처리 | 계약 한 벌이 통째로 갱신된다. `quoteId`·`quoteNo` 는 폼이 값을 보존만 한다 |
| Validation | §6 전부 |
| API 호출 여부 | Y — 갱신 1건 |
| 성공 처리 | 계약 목록으로 이동하고 공통 토스트 `MSG-COMMON-01`(success) `계약을(를) 저장했어요.` |
| 실패 처리 | 폼 배너 `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` + `오류 코드 {참조}`. 이동하지 않고 입력을 유지한다 |
| 예외 처리 | 서버 필드 거절(422)은 그 입력의 인라인 오류로 꽂히고 포커스가 옮겨간다. 저장 중 다른 관리자가 지웠으면 409: `다른 사용자가 먼저 삭제한 계약이에요.` — `apps/admin/src/pages/sales/contracts/data-source.ts:123` |
| 화면 변경 사항 | 안내영역 · 화면 전체(성공 시 이동) |
| 후속 동작 | 목록의 상태·금액·기간이 갱신된다 |
| 로그 기록 여부 | 확인하지 못했다 |

**계약 상태에는 전이 제약이 없다** — 견적(`quoteStatusChangeBlock`)·고객센터 티켓(`canSetStatus`)과 달리 계약은 어느 상태로든 셀렉트로 바꿀 수 있다. **그것이 막다른 골목을 없애는 장치이기도 하다**: 만료·해지로 넘어간 뒤 프로젝트가 필요해지면 계약을 '진행중'으로 되돌릴 수 있다 — `apps/admin/src/pages/sales/contracts/types.ts:231-233`.

### 4.3 프로젝트 만들기 (사슬의 세 번째 화살표)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 체결이 끝난 계약에서 프로젝트를 만든다. **프로젝트가 생기는 유일한 문이다** |
| 실행 조건 | `projectDraftBlock(체결여부, 기존프로젝트id) === null` — 즉 ① 이 계약의 프로젝트가 아직 없고 ② 계약이 **진행중이고 서명완료**일 때 — `apps/admin/src/pages/sales/projects/types.ts:189-193` |
| 사용자 동작 | 머리의 `프로젝트 만들기` 클릭 |
| 시스템 처리 | **폼이 없다.** 이름·거래처·기간·금액은 계약이 이미 알고 있고, 진척·마일스톤은 프로젝트 수정에서 바로 채운다 — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:270-271` |
| 데이터 처리 | 프로젝트가 계약에서 승계하는 값: 이름=계약명 · 거래처(id·이름) · **단계=수주(`won`)** · 확률=100% · 예상매출=계약금액의 **스냅숏** · 기간=계약 기간 · 담당자 · `contractId`·`contractTitle`. 진척·마일스톤·산출물은 승계 대상이 아니다 — `apps/admin/src/pages/sales/projects/types.ts:206-229` |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 프로젝트 생성 1건 |
| 성공 처리 | **프로젝트 수정 폼(`/sales/projects/{id}/edit`)으로 이동한다.** 토스트 없음. 이동 직전 방금 만든 프로젝트 id 를 화면이 붙들어 두어(재조회 전에도) 배너가 즉시 '이미 있다'로 바뀐다 — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:256-258` |
| 실패 처리 | 저장소가 던지지 않는 경로다(같은 페이지 안의 배열 조작). 서버가 붙으면 이 자리에 실패 표시가 필요해진다 — 지금 코드에는 없다 |
| 예외 처리 | **중복 방어가 두 겹이다**: ① 렌더 시점 동기 조회로 버튼의 존재를 정한다 ② 저장소가 **계약 id 를 멱등키**로 한 번 더 막는다 — 이미 프로젝트가 있으면 그것을 그대로 돌려준다 — `apps/admin/src/pages/sales/projects/data-source.ts:144-147`. **되돌려 쓰기는 없다** — 계약에는 '프로젝트가 생겼다'를 적을 칸이 없고 만들지도 않는다. 그 사실의 정본은 프로젝트의 `contractId` 하나이며, 두 곳에 적으면 언젠가 갈라진다 — `apps/admin/src/pages/sales/projects/data-source.ts:149-150` |
| 화면 변경 사항 | 안내영역 · 화면 전체(이동) |
| 후속 동작 | 프로젝트 목록에 행이 생긴다. **그 프로젝트를 지우면 이 버튼이 다시 살아난다** — `apps/admin/src/pages/sales/projects/data-source.ts:133-134` |
| 로그 기록 여부 | 확인하지 못했다 |

**판정은 저장된 원본을 본다** — 폼에서 상태만 '진행중'으로 바꿔 놓고 **저장하지 않은 채** 프로젝트를 만들 수는 없다. 그 프로젝트의 근거인 계약은 여전히 검토중이기 때문이다. 잠금의 근거는 화면이 아니라 저장된 값이 갖는다 — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:260-266`.

**왜 견적 → 계약과 달리 되돌려 쓰기가 없는가** — 견적은 `ordered` 라는 **자기 상태**를 갖고 그것이 청구의 근거이기도 하다. 계약에는 그런 칸이 없고 만들지 않는다(파생값 금지). 그래서 계약 → 프로젝트에는 반쪽 저장이라는 상태 자체가 성립하지 않는다.

### 4.4 원 견적으로 되짚기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이 계약의 근거를 연다 |
| 실행 조건 | `quoteId` 가 있을 때 |
| 사용자 동작 | 배너의 `원 견적 보기` 클릭 |
| 시스템 처리 | `/sales/quotes/{quoteId}` 로 이동 |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N(이동만) |
| 성공 처리 | 견적 상세가 열린다 |
| 실패 처리 | 견적이 지워졌으면 도착 화면이 `견적을 찾을 수 없어요. 이미 삭제되었을 수 있어요.` 를 띄운다 |
| 예외 처리 | 견적 없이 등록된 옛 계약에는 이 배너 대신 §3 No.10 의 경고가 온다. 폼이 dirty 면 이탈 가드가 먼저 걸린다 |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.5 계약서 첨부

| 항목 | 내용 |
|---|---|
| 기능 목적 | 계약서·부속합의서 스캔본을 보관한다 |
| 실행 조건 | 폼이 열려 있을 때 |
| 사용자 동작 | 파일 선택 · 삭제 |
| 시스템 처리 | 최대 5개까지 받는다 |
| 데이터 처리 | **파일을 서버로 보내지 않는다** — 브라우저 안 미리보기 URL 만 만든다 |
| Validation | 이미지 파일 · 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:136`. 화면 안내 표기는 `PNG · JPG · GIF · 최대 5MB` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:271` |
| API 호출 여부 | N — **업로드 엔드포인트가 없다** |
| 성공 처리 | 썸네일이 붙는다 |
| 실패 처리 | 용량·종류 위반은 그 필드의 오류로 뜬다 |
| 예외 처리 | ⚠ **폼을 떠나면 썸네일이 깨진다** — 브라우저 안 URL 이라 화면을 벗어나면 살아 있지 않다. 검증을 조이면 저장 자체가 불가능해지므로 고칠 곳은 업로드 이음매다 — `apps/admin/src/shared/crud/validation.ts:41-62` |
| 화면 변경 사항 | 입력영역 |
| 후속 동작 | 저장하면 그 값이 계약에 남지만 위 제약이 그대로다 |
| 로그 기록 여부 | N |

### 4.6 저장하지 않은 변경 보호

| 항목 | 내용 |
|---|---|
| 기능 목적 | 반쯤 채운 계약을 잃지 않게 한다 |
| 실행 조건 | 폼이 dirty 이고 저장 중이 아닐 때 |
| 사용자 동작 | 앱 안 링크 · 뒤로가기 · 탭 닫기 · `취소` |
| 시스템 처리 | 공통 이탈 가드 `DLG-COMMON-LEAVE-FORM` |
| 데이터 처리 | 확인하면 입력이 버려진다 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 이동 또는 머무름. 토스트 없음 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | **`프로젝트 만들기` 로 이동할 때도 이 가드가 걸린다** — 저장하지 않은 입력이 있으면 확인을 거친다 |
| 화면 변경 사항 | 다이얼로그만 |
| 후속 동작 | — |
| 로그 기록 여부 | N |

**이 화면 고유 문구** — `계약에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:67-68`.

**이 화면에는 자기 토스트가 없다** — [인벤토리](../../inventory.md) §9.3 에 `pages/sales/contracts/ContractFormPage.tsx` 가 없다.

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| `/new` 진입 | `:id` 없음 | 차단 안내 화면 | 화면 전체 | 안내 |
| `/:id/edit` 진입 | `:id` 있음 | 상세 조회 → 폼 값 채우기 + 프로젝트 존재 여부 동기 조회 | 화면 전체 | 로딩 → 폼 |
| 자동갱신 토글 | 켜기/끄기 | 통지기한 칸이 나타나거나 사라진다 | 갱신 · 서명 · 상태 카드 | 폼 |
| 거래처 선택 | 셀렉트 변경 | id·이름 동시 반영 | 거래처 · 미리보기 | 폼 |
| 상태·서명 변경 | 셀렉트 변경 | 미리보기가 갱신된다. **`프로젝트 만들기` 는 아직 나타나지 않는다**(저장된 값을 본다) | 미리보기 | 폼 |
| 프로젝트 만들기 | 버튼이 존재할 때 | 프로젝트 생성 후 이동 | 화면 전체 | `SCR-SALES-PROJECTS-FORM` |
| 원 견적 보기 | 배너 링크 | 견적 상세로 이동(dirty 면 이탈 가드) | 안내영역 | `SCR-SALES-QUOTES-DETAIL` |
| 연결된 프로젝트 열기 | 배너 링크 | 프로젝트 수정 폼으로 | 안내영역 | `SCR-SALES-PROJECTS-FORM` |
| 제출 | `저장` 또는 Enter | 검증 → 전송 | 폼 | 저장 중 |
| 검증 실패 | 위반 있음 | 요청을 만들지 않고 첫 위반 필드로 포커스 | 입력영역 | 인라인 오류 |
| 저장 성공 | 서버 응답 | 목록으로 이동 + 공통 성공 토스트 | 화면 전체 | `SCR-SALES-CONTRACTS` |
| 저장 실패 | 서버 오류 | 폼 배너 + 참조 코드 | 안내영역 | 폼 유지 |
| 저장 충돌 | 409/412 | `DLG-COMMON-FORM-CONFLICT` | 다이얼로그 | 폼 유지 |
| 취소 · 이탈 | 버튼·링크·뒤로가기 | dirty 면 `DLG-COMMON-LEAVE-FORM` | 다이얼로그 | 확인=이동 |

## 6. Validation

**규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/sales/contracts/validation.ts`.

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 계약명 | 필수 · 80자 이하 | 제출 시 | 공통 필수 문구 생성기(`requiredText('계약명', 80)`) | 제출 차단 · 그 필드로 포커스 |
| 거래처명 | 필수 · 60자 이하 | 〃 | `requiredText('거래처', 60)` | 〃 |
| `accountId` | **요구하지 않는다** | — | — | 아직 등록되지 않은 거래처와의 첫 계약을 막지 않기 위해서다. 대신 폼이 대가를 경고로 드러낸다 |
| 계약금액 — 형식 | 숫자만 | 제출 시 | `계약금액은 숫자만 입력할 수 있어요.` | 제출 차단 |
| 계약금액 — 범위 | 0 초과 | 〃 | `계약금액은 0보다 커야 해요.` | 〃 |
| 계약 기간 — 형식 | 실재하는 달력 날짜 | 〃 | `계약 기간을 YYYY-MM-DD 형식으로 입력하세요.` | 〃 |
| 계약 기간 — 관계 | 종료일 ≥ 시작일 | 〃 | `종료일은 시작일보다 빠를 수 없어요.` | 〃 |
| 갱신 통지기한 | **자동갱신이 켜졌을 때만** 숫자 | 〃 | `갱신 통지기한(일)은 숫자만 입력할 수 있어요.` | 〃 |
| 조항 요약 | 1,000자 이하 | 〃 | `조항 요약은 1000자를 넘을 수 없어요.` | 〃 |
| 계약 상태 · 전자서명 | 알려진 값 중 하나 | 〃 | 없음(셀렉트라 다른 값이 들어오지 않는다) | — |
| `quoteId` · `quoteNo` | 검증 대상이 아니다 | — | — | 사람이 편집하지 않는 승계 값이다. 폼이 값을 잃지 않도록 스키마에 남긴다 |
| 첨부 | 이미지 · 최대 5MB · 5개 | 선택 시 | 업로드 필드가 낸다 | 그 파일만 거절 |

**프로젝트 생성의 거절 사유(전이 가드)**

| 상황 | 문구 | 화면 처리 |
|---|---|---|
| 이미 프로젝트가 있다 | `이미 프로젝트가 만들어진 계약이에요.` — `apps/admin/src/pages/sales/projects/types.ts:175` | 버튼을 그리지 않고 success 배너 + `연결된 프로젝트 열기` |
| 체결이 끝나지 않았다 | `체결이 끝난 계약(진행중 · 서명완료)만 프로젝트로 넘길 수 있어요.` — `apps/admin/src/pages/sales/projects/types.ts:173-174` | 버튼을 그리지 않고 info 배너 |

**순서가 중요하다** — '이미 있다'를 먼저 본다. 계약이 만료로 넘어간 뒤에도 그 사실이 '체결이 안 끝났다'보다 정확한 설명이다 — 운영자가 찾아야 할 것은 그 프로젝트다 — `apps/admin/src/pages/sales/projects/types.ts:186-188`.

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `계약을 찾을 수 없어요. 이미 삭제되었을 수 있어요.` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:307` | 폼 대신 배너 + `목록으로`. 재시도를 주지 않는다 | `목록으로` |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` + `오류 코드 {참조}` | 이동하지 않고 입력을 유지 | `저장` 재클릭 |
| 수정 실패 | 저장 실패와 같은 경로 — 이 폼의 쓰기는 수정 하나뿐이다 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에는 삭제가 없다(목록의 일이다) | — | — |
| API 오류 | `계약을 불러오지 못했어요.` — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:308` (조회) / 위 저장 실패 문구(쓰기) | 조회 실패는 `다시 시도` + `목록으로` | 〃 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도를 하지 않는다 | 〃 |
| 권한 없음 | `이 항목을 수정할 권한이 없어요. 필요하다면 관리자에게 권한을 요청해 주세요.` — `apps/admin/src/shared/crud/useCrudForm.ts:294` | 검증도 요청도 시작하지 않고 폼 배너로 막는다 | 관리자에게 권한 요청 |
| 세션 만료 | 로그인 화면이 `세션이 만료되었어요. 다시 로그인해 주세요.` 를 띄운다 | 세션을 지우고 경로를 보존해 이동 | 재인증 후 이 폼 |
| 데이터 충돌 | `DLG-COMMON-FORM-CONFLICT` — 서버 사유가 없으면 `다른 사용자가 먼저 변경했어요. 최신 내용을 확인해 주세요.`. 저장소 사유: `다른 사용자가 먼저 삭제한 계약이에요.` — `apps/admin/src/pages/sales/contracts/data-source.ts:123` | 성공 토스트도 이동도 없다. 입력은 살아 있다 | '최신 내용 불러오기' 또는 '이어서 편집' |
| 중복 데이터 | 프로젝트 중복 생성이 유일한 중복 위험이고 **두 겹으로 막혀 있다**(§4.3). 사용자에게는 버튼이 사라지고 `이미 프로젝트가 만들어진 계약이에요.` 배너가 뜨는 것으로 나타난다 | 두 번째 요청은 기존 프로젝트를 돌려준다 | `연결된 프로젝트 열기` |
| 파일 업로드 실패 | 용량·종류 위반은 그 필드의 오류로 뜬다. ⚠ **업로드 엔드포인트 자체가 없다** — 파일은 서버로 가지 않고 브라우저 안 미리보기만 만들어져, 폼을 떠나면 썸네일이 깨진다 | 저장은 성공한다(값이 남는다) | 백엔드 연동 시 업로드 이음매를 붙여야 한다 |

**⚠ 옛 데이터가 규칙을 어기는 자리** — 픽스처의 `ct-1`·`ct-3` 은 견적 없이 등록된 계약이다(`apps/admin/src/pages/sales/contracts/data-source.ts:51-52,94-95`). 화면은 §3 No.10 의 warning 으로 그 사실을 말하고 **지우지 않는다** — 실제로 맺어진 계약이고, 소급해서 견적을 지어내면 없던 거래가 하나 생긴다 — `apps/admin/src/pages/sales/contracts/ContractFormPage.tsx:362-364`.

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 차단 안내(`/new`) | 제목 + 설명 + warning 배너 + 링크 2개 | 링크 ○ | N | `계약은 견적에서 만들어져요. …` |
| 최초 로딩(수정) | 폼 골격이 그려지되 입력이 잠긴다 | 저장 × | Y | 없음 |
| 데이터 있음 | 머리 + 배너 + 좌 5카드 + 우 미리보기 | 저장 ○ | N | 상단 안내 한 줄 |
| 조회 실패(없음) | 배너 + `목록으로` | 다시 시도 없음 | N | `계약을 찾을 수 없어요. …` |
| 조회 실패(오류) | 배너 + `다시 시도` + `목록으로` | 둘 다 ○ | N | `계약을 불러오지 못했어요.` |
| 저장 중 | 입력 전체가 잠기고 버튼이 `저장 중…` | 저장 × · 취소 × | Y | 라벨이 곧 안내다 |
| 검증 실패 | 위반 필드 아래 인라인 오류 + 첫 위반 필드로 포커스 | 저장 ○ | N | §6 문구 |
| 저장 실패 | 폼 상단 배너 + 참조 코드 | 저장 ○ | N | §7 문구 |
| 저장 충돌 | 다이얼로그. 폼은 살아 있다 | 저장 ○ | N | §7 문구 |
| 견적에서 만든 계약 | info 배너 + `원 견적 보기` | — | N | `원 견적 {번호} 에서 만든 계약이에요. …` |
| 견적 없는 계약(옛 데이터) | warning 배너 | — | N | `견적 없이 등록된 계약이에요. …` |
| 프로젝트 만들 수 있음 | 머리에 `프로젝트 만들기` | 프로젝트 만들기 ○ | N | 배너 없음 |
| 체결 전 | 버튼이 없고 info 배너 | — | N | `체결이 끝난 계약(진행중 · 서명완료)만 프로젝트로 넘길 수 있어요.` |
| 프로젝트 이미 있음 | 버튼이 없고 success 배너 + `연결된 프로젝트 열기` | 링크 ○ | N | `이미 프로젝트가 만들어진 계약이에요.` |
| 자동갱신 꺼짐 | 통지기한 칸이 **사라진다** — 값이 0 으로 저장된다 | — | N | — |
| 거래처 미등록 / 연결 끊김 / 목록 미도착 | 견적 폼과 같은 세 갈래 안내(§ [견적 수정](../quotes/form.md) §8) | — | 조건부 | 각 문구 |
| 읽기 전용(권한) | 저장 시 권한 배너가 막는다. 입력칸을 미리 잠그지는 않는다 | 저장 ○(누르면 배너) | N | §7 '권한 없음' |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | **×**(경로가 막혀 있다) | ○ | — | — | ○ | — | — |
| 운영자 | 역할의 `sales-contracts` 매트릭스 | **×** | 〃 | — | — | 〃 | — | — |
| 뷰어 | ○ | **×** | × | — | — | × | — | — |
| 권한 없음 | × | × | × | — | — | × | — | — |

**등록은 권한으로 열리지 않는다** — 전체 권한을 가진 최상위 관리자도 이 화면에서 계약을 만들 수 없다.

**프로젝트 생성 버튼에는 권한 판정이 붙어 있지 않다** — 이 화면은 `canUpdate` 를 읽지 않고, 버튼의 존재는 전이 가드(`projectDraftBlock`)만 정한다. 견적 상세가 계약·청구 버튼을 `canUpdate` 로 함께 가리는 것과 다르다. 그래서 **읽기 권한만 있어도 이 버튼이 보인다** — 막는 것은 서버뿐이다.

**권한이 없을 때 화면이 어떻게 되는가** — 읽기가 없으면 본문이 권한 화면이 된다. 수정 권한만 없으면 폼은 열리지만 저장이 배너로 막힌다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-SALES-CONTRACTS-FORM`(`/new`) | `견적 목록으로` | `SCR-SALES-QUOTES` | N | 언제나 | 없음 | — |
| `SCR-SALES-CONTRACTS-FORM`(`/new`) | `계약 목록으로` | `SCR-SALES-CONTRACTS` | N | 언제나 | 없음 | — |
| `SCR-SALES-CONTRACTS-FORM` | 상단 `목록으로` · `취소` | `SCR-SALES-CONTRACTS` | N | dirty 면 이탈 가드를 먼저 거친다 | 없음 | — |
| `SCR-SALES-CONTRACTS-FORM` | 저장 성공 | `SCR-SALES-CONTRACTS` | N | 검증·저장 성공 | 없음 | — |
| `SCR-SALES-CONTRACTS-FORM` | `프로젝트 만들기` | `SCR-SALES-PROJECTS-FORM` | N | 체결 완료 + 프로젝트 없음 | 프로젝트 id | — |
| `SCR-SALES-CONTRACTS-FORM` | `연결된 프로젝트 열기` | `SCR-SALES-PROJECTS-FORM` | N | 프로젝트가 있을 때 | 프로젝트 id | 이 폼(뒤로가기) |
| `SCR-SALES-CONTRACTS-FORM` | `원 견적 보기` | `SCR-SALES-QUOTES-DETAIL` | N | `quoteId` 가 있을 때 | 견적 id | 이 폼(뒤로가기) |
| `SCR-SALES-CONTRACTS-FORM` | 거래처 셀렉트의 `거래처 등록` | `SCR-SALES-ACCOUNTS-FORM` | N | 미등록을 골랐을 때 | 없음 | 이 폼(뒤로가기) |
| `SCR-SALES-CONTRACTS-FORM` | 앱 안 링크 · 뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-SALES-CONTRACTS-FORM` | 탭 닫기 · 새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-SALES-CONTRACTS-FORM` | 저장 → 409/412 | `DLG-COMMON-FORM-CONFLICT` | Y | 서버가 충돌로 거절 | 서버 사유 | 같은 폼(입력 유지) |
| `SCR-SALES-CONTRACTS-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면에는 자기 팝업이 없다** — 뜨는 것은 공통 이탈 가드와 공통 저장 충돌 다이얼로그뿐이다. **프로젝트 생성에는 확인을 세우지 않는다**(되돌릴 수 있고, 두 번 눌러도 하나만 생긴다).
