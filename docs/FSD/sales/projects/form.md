# 프로젝트 등록·수정

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 프로젝트 수정 |
| 화면 ID | `SCR-SALES-PROJECTS-FORM` |
| 메뉴 경로 | 영업 관리 > 프로젝트 > (행 선택 · 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 프로젝트의 단계·확률·예상매출·기간·진척·마일스톤·산출물을 채우고 고친다. 사슬의 **마지막 칸**이라 여기서 다음으로 이어지는 화살표는 없다.

**업무 배경** — 계약에서 만들어진 프로젝트는 이름·거래처·기간·금액만 승계하고 진척·마일스톤·산출물은 비어 있다(계약은 그 정보를 갖지 않는다). 그 나머지를 채우고 파이프라인 단계를 옮기는 곳이 이 화면이다.

**화면 설명** — 라우트가 둘(`/new` · `/:id/edit`)이지만 같은 컴포넌트이고, `/new` 는 폼 대신 차단 안내 화면이 열린다. 수정 모드는 상황 배너 2종과 좌우 2단(입력 카드 4개 / 파이프라인 스텝퍼 미리보기)이다.

**주요 사용자** — 최상위 관리자 · 영업 담당 운영자.

**사용 시나리오**

1. 계약에서 방금 만들어진 프로젝트가 열린다 → 마일스톤 3개를 잡고 산출물 목록을 적는다.
2. 진행 중인 프로젝트의 진척률을 40%로 올리고 저장한다.
3. 거래가 무산됐다 → 단계를 '실주'로 바꾼다 → **실주 사유 칸이 나타나고 필수가 된다.**

**선행 조건** — 로그인 · `sales.pipeline` 모듈 · 수정 권한. **등록은 어떤 권한으로도 열리지 않는다.**

**후행 처리** — 저장하면 프로젝트 목록으로 돌아간다. 단계·확률·예상매출이 바뀌면 가중예상매출도 함께 바뀐다(파생값).

**관련 화면** — [프로젝트 목록](index.md) · [계약 수정](../contracts/form.md)(프로젝트가 태어나는 곳) · [거래처 등록·수정](../accounts/form.md) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자기 자리가 없다.

**관련 기능** — 단계를 바꾸면 **확률이 그 단계의 기본값으로 채워진다**(리드 10 · 상담 30 · 제안 50 · 협상 70 · 수주 100 · 실주 0). 사용자가 다시 조정할 수 있다 — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:254-258` · `apps/admin/src/pages/sales/projects/types.ts:81-88`.

**관련 API** — 프로젝트 상세 조회 1건 · 프로젝트 갱신 1건. **백엔드가 없다** — `TODO(backend): GET/POST /api/sales/projects · GET/PUT/DELETE /api/sales/projects/:id` — `apps/admin/src/pages/sales/projects/data-source.ts:170`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일** — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx` (검증 `validation.ts` · 마일스톤 `components/ProjectMilestonesField.tsx` · 차단 화면 `../_shared/ChainOnlyCreateNotice.tsx` · 거래처 선택 `../_shared/AccountSelectField.tsx`)

---

### 1.1 `/new` 가 폼을 열지 않는다

빈 폼으로 세운 프로젝트는 근거가 되는 계약이 없어 '무슨 일을 왜 하고 있는가'를 앱이 답하지 못한다 — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:3-7`. **막은 것은 생성뿐이다** — `/:id/edit` 는 평소처럼 열리고 삭제도 목록에서 그대로 된다.

## 2. 페이지(UI) 구성

### 2.1 차단 안내 모드 (`/sales/projects/new`)

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| Header | 제목 `프로젝트 등록` + 사슬 설명 한 줄 | `/new` 진입 | 전체 | 불가 | 표시 |
| 안내영역 | warning 배너 — 왜 못 만드는지 + 링크 2개 | 〃 | 전체 | 불가 | 표시 |

### 2.2 수정 모드 (`/sales/projects/:id/edit`)

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 돌아가기 | 목록으로 | 항상 | 전체 | 불가 | 표시 |
| Header | 제목 `프로젝트 수정` + 안내 한 줄 | 항상 | 전체 | 불가 | 표시 |
| 안내영역 | 원 계약 역링크 배너 · 계약 없는 프로젝트 경고 · 서버 오류 배너 | 조건부 | 전체 | 불가 | 조건부 |
| 입력영역 — 기회 정보 | 프로젝트명 · 거래처 · 담당자 · 단계 · 확률 · 예상매출 · (실주 사유) | 항상 | 전체 | 불가 | 표시 |
| 입력영역 — 기간 · 진척 | 프로젝트 기간 · 진척률 | 항상 | 전체 | 불가 | 표시 |
| 입력영역 — 마일스톤 | 이름·목표일·완료 체크 반복 | 항상 | 전체 | 불가 | 표시 |
| 입력영역 — 산출물 · 비고 | 산출물(한 줄에 하나) · 메모 | 항상 | 전체 | 불가 | 표시 |
| 미리보기 | 파이프라인 스텝퍼 + 예상매출 · 가중 예상매출 | 항상 | 전체 | 불가 | 표시 |
| 버튼영역 | `취소` · `저장` | 항상 | 전체 | 불가 | 표시 |

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 차단 제목 | Heading(h1) | `프로젝트 등록` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:264` | — | Y | Y | — | — | — | — | `/new` | — |
| 2 | 차단 설명 | Text(muted) | `영업 파이프라인(문의 → 견적 → 계약 → 프로젝트)은 앞 칸에서만 다음 칸이 생겨요.` — `apps/admin/src/pages/sales/_shared/ChainOnlyCreateNotice.tsx:68` | — | N | Y | — | — | — | — | 〃 | — |
| 3 | 차단 사유 | Alert(warning) | `프로젝트는 계약에서 만들어져요. 체결이 끝난 계약(진행중 · 서명완료) 상세에서 ‘프로젝트 만들기’를 누르세요.` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:265` | — | N | Y | — | — | — | — | 〃 | — |
| 4 | 만드는 곳 링크 | Link | `계약 목록으로` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:266` | — | N | N | 없음 | — | — | — | 〃 | — |
| 5 | 목록 링크 | Link | `프로젝트 목록으로` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:267` | — | N | N | 없음 | — | — | — | 〃 | — |
| 6 | 화면 제목 | Heading(h1) | `프로젝트 수정` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:311` | — | Y | Y | — | — | — | — | `/:id/edit` | — |
| 7 | 안내 한 줄 | Text(muted) | `별표(*) 항목은 필수예요. 단계를 바꾸면 확률이 기본값으로 채워져요.` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:313` | — | N | Y | — | — | — | — | 〃 | — |
| 8 | 원 계약 배너 | Alert(info) + Link | `원 계약 '{계약명}' 에서 만든 프로젝트예요. 거래처·기간·예상매출은 계약을 따라요.` + `원 계약 보기` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:321,326` | 계약 ↔ 프로젝트 양방향 | N | Y | — | — | — | — | `contractId` 가 있을 때 | — |
| 9 | 계약 없는 프로젝트 경고 | Alert(warning) | `계약 없이 등록된 프로젝트예요. 이 규칙(프로젝트는 계약에서만 만든다)이 생기기 전의 기록이라 원 계약으로 가는 길이 없어요. 프로젝트 내용은 그대로 수정할 수 있어요.` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:337-339` | 조용히 정상인 척하지 않는다 | N | Y | — | — | — | — | `contractId` 가 빈 값일 때 | 지우지도 않는다 |
| 10 | 프로젝트명 | TextField | `프로젝트명` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:353` | 필수 | Y | N | 저장 중·조회 중 | 저장값 | `예: 한빛소프트 ERP 구축` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:362` | 80자 — `apps/admin/src/pages/sales/projects/types.ts:60` | 항상 | 계약에서 만들면 계약명 |
| 11 | 거래처 | AccountSelectField | `거래처` — 기본 라벨 | 마스터에서 고른다 | Y | N | 저장 중·목록 미도착 | 저장값 | — | — | 항상 | 견적·계약 폼과 같은 컨트롤 |
| 12 | 담당자 | TextField | `담당자` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:390` | — | N | N | 저장 중 | 저장값 | `예: 이영업` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:396` | 없음 | 항상 | 계약에서 승계된다 |
| 13 | 단계 | SelectField | `단계` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:404` | 리드·상담·제안·협상·수주·실주 | Y | N | 저장 중 | 저장값 | — | — | 항상 | **바꾸면 확률이 기본값으로 채워진다** |
| 14 | 확률 | TextField(numeric) | `확률 (%)` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:423` | 0~100 | N | N | 저장 중 | 단계 기본값 | `예: 70` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:432` | 저장 시 100 에서 자른다 | 항상 | 가중예상매출의 재료 |
| 15 | 예상매출 | TextField(numeric) | `예상매출 (원)` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:439` | 숫자만 | N | N | 저장 중 | 저장값 | `예: 42000000` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:448` | 저장 시 숫자만 남긴다 | 항상 | 계약금액의 스냅숏 |
| 16 | 실주 사유 | TextField | `실주 사유` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:458` | 필수 | Y | N | 저장 중 | 저장값 | `예: 경쟁사 대비 납기 조건 불리` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:467` | 없음 | **단계가 '실주'일 때만 나타난다** | 다른 단계로 바꾸면 저장 시 빈 값으로 정리된다 |
| 17 | 프로젝트 기간 | DateRangeField | `프로젝트 기간` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:478` | 두 날짜의 관계까지 검증 | Y | N | 저장 중 | 저장값 | — | `YYYY-MM-DD` | 항상 | 계약 기간을 승계한다 |
| 18 | 진척률 | TextField(numeric) | `진척률 (%)` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:489` | 0~100 | N | N | 저장 중 | 저장값 | `예: 40` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:498` | 저장 시 100 에서 자른다 | 항상 | 목록의 진행바가 읽는다 |
| 19 | 마일스톤 편집기 | ProjectMilestonesField | `마일스톤` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:506` | 이름·목표일·완료 체크. 행 추가/삭제 | N | N | 저장 중 | 저장값(계약에서 만들면 비어 있다) | — | 최대 12개 — `apps/admin/src/pages/sales/projects/types.ts:61` | 항상 | — |
| 20 | 산출물 | TextareaField | `산출물 (한 줄에 하나)` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:518` | 줄바꿈으로 목록을 만든다 | N | N | 저장 중 | 저장값 | `예: 요구사항 정의서` / `예: 구축 제안서` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:529` | 1,000자 | 항상 | 저장 시 빈 줄은 버린다 |
| 21 | 비고 | TextareaField | `메모` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:533` | 2줄 | N | N | 저장 중 | 저장값 | `내부 메모` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:538` | 500자 | 항상 | — |
| 22 | 파이프라인 스텝퍼 | Stepper | `파이프라인 단계`(aria-label) — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:550` | 리드→상담→제안→협상→수주. **실주는 흐름 밖이라 스텝퍼가 아니라 배지로 말한다** | N | Y | — | — | — | — | 단계가 '실주'가 아닐 때 | `apps/admin/src/pages/sales/projects/types.ts:90-93` |
| 23 | 실주 배지 | StatusBadge(danger) | `실주 — 종료` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:548` | 스텝퍼를 대신한다 | N | Y | — | — | — | — | 단계가 '실주'일 때 | — |
| 24 | 미리보기 값 3줄 | Text | `현재 단계` · `예상매출` · `가중 예상매출 ({확률}%)` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:553,557,561` | 가중 예상매출 = 예상매출 × 확률/100(반올림) | N | Y | — | — | — | — | 항상 | `apps/admin/src/pages/sales/projects/types.ts:112-115` |
| 25 | 취소 | Button(secondary) | `취소` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:577` | — | N | N | 저장 중 | — | — | — | 항상 | — |
| 26 | 저장 | Button(primary) | `저장` · 저장 중 `저장 중…` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:581` | — | Y | N | 저장 중·조회 중 | — | — | — | 항상 | — |
| 27 | 서버 오류 배너 | FormServerError | §7 | 참조 코드가 붙는다 | N | Y | — | 없음 | — | — | 저장 실패 | — |
| 28 | 조회 실패 배너 | Alert(danger) + Button ×2 | §7 | 없음/오류를 가른다 | N | Y | — | — | — | — | 조회 실패 | — |

## 4. 기능 명세

### 4.1 사슬 밖 등록 차단 (`/sales/projects/new`)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 근거 없는 프로젝트가 만들어지는 것을 막고 만드는 곳을 알려 준다 |
| 실행 조건 | `:id` 가 없을 때 — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:261` |
| 사용자 동작 | 주소 입력 · 즐겨찾기 · 옛 링크 |
| 시스템 처리 | 폼을 조립하지 않고 안내 화면을 그린다 |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 안내 화면이 뜬다. 토스트 없음 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 권한 문제로 말하지 않는다 — 순서 문제다 |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 계약 목록 또는 프로젝트 목록으로 |
| 로그 기록 여부 | N |

### 4.2 프로젝트 조회 · 저장

| 항목 | 내용 |
|---|---|
| 기능 목적 | 프로젝트 내용을 채워 저장한다 |
| 실행 조건 | 수정 모드에서 조회가 끝났을 때 |
| 사용자 동작 | 값을 고치고 `저장` 클릭 |
| 시스템 처리 | 공통 폼 컨트롤러가 검증 → 제출을 맡는다. 저장 직전 정규화: 공백 다듬기 · 숫자 칸에서 숫자가 아닌 문자 제거 · 확률/진척률을 **100 에서 자름** · 산출물의 빈 줄 제거 · **단계가 '실주'가 아니면 실주 사유를 빈 값으로** — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:165-188` |
| 데이터 처리 | 프로젝트 한 벌이 통째로 갱신된다. `contractId`·`contractTitle` 은 폼이 값을 **보존만** 한다 |
| Validation | §6 전부 |
| API 호출 여부 | Y — 갱신 1건 |
| 성공 처리 | 프로젝트 목록으로 이동하고 공통 토스트 `MSG-COMMON-01`(success) `프로젝트을(를) 저장했어요.`(조사는 이름의 받침이 고른다) |
| 실패 처리 | 폼 배너 `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` + `오류 코드 {참조}`. 이동하지 않고 입력을 유지한다 |
| 예외 처리 | 서버 필드 거절(422)은 인라인 오류로 꽂힌다. 저장 중 다른 관리자가 지웠으면 409: `다른 사용자가 먼저 삭제한 프로젝트예요.` — `apps/admin/src/pages/sales/projects/data-source.ts:113` |
| 화면 변경 사항 | 안내영역 · 화면 전체(성공 시 이동) |
| 후속 동작 | 목록의 단계·진척·예상매출이 갱신된다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.3 단계 변경과 확률 자동 채움

| 항목 | 내용 |
|---|---|
| 기능 목적 | 단계와 확률이 따로 놀지 않게 한다 |
| 실행 조건 | 폼이 열려 있을 때 |
| 사용자 동작 | 단계 셀렉트 변경 |
| 시스템 처리 | 단계를 바꾸는 순간 확률 칸을 그 단계의 기본값으로 덮어쓴다 — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:254-258` |
| 데이터 처리 | 폼 값만 바뀐다(저장 전) |
| Validation | 확률은 0~100 숫자여야 한다(§6) |
| API 호출 여부 | N |
| 성공 처리 | 확률 칸과 미리보기의 가중 예상매출이 함께 바뀐다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | **덮어쓴 값은 사용자가 다시 조정할 수 있다** — 기본값이지 고정값이 아니다. '실주'로 바꾸면 확률이 0 이 되고 실주 사유 칸이 나타난다 |
| 화면 변경 사항 | 입력영역 · 미리보기 |
| 후속 동작 | 저장하면 목록의 단계 배지가 바뀐다 |
| 로그 기록 여부 | N |

**상태 전이 제약이 없다** — 리드에서 곧장 수주로, 수주에서 리드로도 갈 수 있다. 견적(`quoteStatusChangeBlock`)이나 고객센터 티켓(`canSetStatus`)과 달리 프로젝트 단계에는 전이 술어가 없다.

### 4.4 마일스톤 편집

| 항목 | 내용 |
|---|---|
| 기능 목적 | 언제까지 무엇을 끝낼지 적는다 |
| 실행 조건 | 폼이 열려 있을 때 |
| 사용자 동작 | 행 추가·삭제 · 이름/목표일 입력 · 완료 체크 |
| 시스템 처리 | 최대 12개까지 받는다 |
| 데이터 처리 | 저장 시 이름의 앞뒤 공백을 다듬는다 |
| Validation | §6 의 마일스톤 2규칙 |
| API 호출 여부 | N(저장 시 함께 간다) |
| 성공 처리 | 표가 갱신된다 |
| 실패 처리 | 위반은 편집기 위에 한 문장으로 뜬다 |
| 예외 처리 | 마일스톤 완료율(`milestoneProgress`)을 계산하는 순수 함수가 있으나 **이 폼도 목록도 그 값을 그리지 않는다** — 화면에 보이는 진척은 손으로 넣는 `진척률` 이다 |
| 화면 변경 사항 | 입력영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.5 원 계약으로 되짚기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이 프로젝트의 근거를 연다 |
| 실행 조건 | `contractId` 가 있을 때 |
| 사용자 동작 | 배너의 `원 계약 보기` 클릭 |
| 시스템 처리 | `/sales/contracts/{contractId}/edit` 로 이동한다(계약에는 읽기 전용 상세가 없다) |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N(이동만) |
| 성공 처리 | 계약 수정 폼이 열린다 |
| 실패 처리 | 계약이 지워졌으면 도착 화면이 `계약을 찾을 수 없어요. 이미 삭제되었을 수 있어요.` 를 띄운다 |
| 예외 처리 | 계약명은 **스냅숏**이라 계약명을 나중에 고쳐도 이 배너의 이름은 움직이지 않는다 — `apps/admin/src/pages/sales/projects/types.ts:54-55` |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.6 저장하지 않은 변경 보호

| 항목 | 내용 |
|---|---|
| 기능 목적 | 반쯤 채운 프로젝트를 잃지 않게 한다 |
| 실행 조건 | 폼이 dirty 이고 저장 중이 아닐 때 |
| 사용자 동작 | 앱 안 링크 · 뒤로가기 · 탭 닫기 · `취소` |
| 시스템 처리 | 공통 이탈 가드 `DLG-COMMON-LEAVE-FORM` |
| 데이터 처리 | 확인하면 입력이 버려진다 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 이동 또는 머무름. 토스트 없음 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 탭 닫기·새로고침은 브라우저 기본 확인창이다 |
| 화면 변경 사항 | 다이얼로그만 |
| 후속 동작 | — |
| 로그 기록 여부 | N |

**이 화면 고유 문구** — `프로젝트에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:63-64`.

**이 화면에는 자기 토스트가 없다** — [인벤토리](../../inventory.md) §9.3 에 `pages/sales/projects/ProjectFormPage.tsx` 가 없다.

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| `/new` 진입 | `:id` 없음 | 차단 안내 화면 | 화면 전체 | 안내 |
| `/:id/edit` 진입 | `:id` 있음 | 상세 조회 → 폼 값 채우기 | 화면 전체 | 로딩 → 폼 |
| 단계 변경 | 셀렉트 선택 | 확률을 기본값으로 덮어쓴다 · 스텝퍼/배지가 바뀐다 · '실주'면 사유 칸이 나타난다 | 기회 정보 카드 · 미리보기 | 폼 |
| 확률·예상매출 입력 | 타이핑 | 가중 예상매출이 다시 계산된다 | 미리보기 | 폼 |
| 마일스톤 편집 | 행 추가·삭제·입력 | 폼 값이 바뀐다 | 마일스톤 카드 | 폼 |
| 산출물 입력 | 줄바꿈 포함 타이핑 | 줄 단위 배열로 반영된다 | 산출물 카드 | 폼 |
| 거래처 선택 | 셀렉트 변경 | id·이름 동시 반영 | 거래처 | 폼 |
| 원 계약 보기 | 배너 링크 | 계약 수정 폼으로(dirty 면 이탈 가드) | 안내영역 | `SCR-SALES-CONTRACTS-FORM` |
| 제출 | `저장` 또는 Enter | 검증 → 전송 | 폼 | 저장 중 |
| 검증 실패 | 위반 있음 | 요청을 만들지 않고 첫 위반 필드로 포커스 | 입력영역 | 인라인 오류 |
| 저장 성공 | 서버 응답 | 목록으로 이동 + 공통 성공 토스트 | 화면 전체 | `SCR-SALES-PROJECTS` |
| 저장 실패 | 서버 오류 | 폼 배너 + 참조 코드 | 안내영역 | 폼 유지 |
| 저장 충돌 | 409/412 | `DLG-COMMON-FORM-CONFLICT` | 다이얼로그 | 폼 유지 |
| 취소 · 이탈 | 버튼·링크·뒤로가기 | dirty 면 `DLG-COMMON-LEAVE-FORM` | 다이얼로그 | 확인=이동 |

## 6. Validation

**규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/sales/projects/validation.ts`.

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 프로젝트명 | 필수 · 80자 이하 | 제출 시 | `requiredText('프로젝트명', 80)` | 제출 차단 · 그 필드로 포커스 |
| 거래처명 | 필수 · 60자 이하 | 〃 | `requiredText('거래처', 60)` | 〃 |
| `accountId` | **요구하지 않는다** | — | — | 계약 폼과 같은 이유 |
| 확률 — 형식 | 숫자만 | 제출 시 | `확률은 숫자만 입력할 수 있어요.`(조사는 런타임에 고른다) | 제출 차단 |
| 확률 — 범위 | 0~100 | 〃 | `확률은 0~100 사이여야 해요.` | 〃 |
| 진척률 — 형식 | 숫자만 | 〃 | `진척률은 숫자만 입력할 수 있어요.` | 〃 |
| 진척률 — 범위 | 0~100 | 〃 | `진척률은 0~100 사이여야 해요.` | 〃 |
| 예상매출 | 숫자만 | 〃 | `예상매출은 숫자만 입력할 수 있어요.` | 〃 |
| 기간 — 형식 | 실재하는 달력 날짜 | 〃 | `기간을 YYYY-MM-DD 형식으로 입력하세요.` | 〃 |
| 기간 — 관계 | 종료일 ≥ 시작일 | 〃 | `종료일은 시작일보다 빠를 수 없어요.` | 〃 |
| 실주 사유 | **단계가 '실주'일 때만** 필수 | 〃 | `실주 사유를 입력하세요.` | 〃 |
| 마일스톤 — 이름 | 모든 행에 이름 | 〃 | `모든 마일스톤의 이름을 입력하세요.` | 〃 |
| 마일스톤 — 목표일 | 모든 행에 실재하는 날짜 | 〃 | `모든 마일스톤의 목표일을 입력하세요.` | 〃 |
| `contractId` · `contractTitle` | 검증 대상이 아니다 | — | — | 사람이 채우는 칸이 아니다. 폼에 남겨 두는 이유는 계약 참조가 저장 왕복에서 조용히 사라지지 않게 하기 위해서다 |
| 산출물 · 비고 | 길이만 화면이 제한한다(1,000자 · 500자) | 입력 중 | 없음 | 더 입력되지 않는다 |

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `프로젝트 찾을 수 없어요. 이미 삭제되었을 수 있어요.` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:281` | 폼 대신 배너 + `목록으로`. 재시도를 주지 않는다 | `목록으로` |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` + `오류 코드 {참조}` | 이동하지 않고 입력을 유지 | `저장` 재클릭 |
| 수정 실패 | 저장 실패와 같은 경로 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에는 삭제가 없다(목록의 일이다) | — | — |
| API 오류 | `프로젝트 불러오지 못했어요.` — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:282` (조회) / 위 저장 실패 문구(쓰기) | 조회 실패는 `다시 시도` + `목록으로` | 〃 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도를 하지 않는다 | 〃 |
| 권한 없음 | `이 항목을 수정할 권한이 없어요. 필요하다면 관리자에게 권한을 요청해 주세요.` — `apps/admin/src/shared/crud/useCrudForm.ts:294` | 검증도 요청도 시작하지 않고 폼 배너로 막는다 | 관리자에게 권한 요청 |
| 세션 만료 | 로그인 화면이 `세션이 만료되었어요. 다시 로그인해 주세요.` 를 띄운다 | 세션을 지우고 경로를 보존해 이동 | 재인증 후 이 폼 |
| 데이터 충돌 | `DLG-COMMON-FORM-CONFLICT`. 저장소 사유: `다른 사용자가 먼저 삭제한 프로젝트예요.` — `apps/admin/src/pages/sales/projects/data-source.ts:113` | 성공 토스트도 이동도 없다. 입력은 살아 있다 | '최신 내용 불러오기' 또는 '이어서 편집' |
| 중복 데이터 | 해당 없음 — 이 폼은 아무것도 새로 만들지 않는다. 한 계약에 프로젝트 하나라는 규칙은 계약 폼과 프로젝트 저장소가 지킨다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 이 폼에 파일 입력이 없다 | — | — |

**⚠ 이 화면의 조회 실패 문구에 조사가 빠져 있다** — `프로젝트 찾을 수 없어요.` · `프로젝트 불러오지 못했어요.` 는 `프로젝트를` 가 되어야 자연스럽다(`apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:281-282`). 형제 화면들은 `견적을 찾을 수 없어요.` 처럼 조사를 갖는다. 코드에 있는 값을 그대로 옮긴다.

**⚠ 옛 데이터가 규칙을 어기는 자리** — 픽스처의 `prj-1`~`prj-3` 은 계약 없이 생긴 프로젝트다. 화면은 §3 No.9 의 warning 으로 그 사실을 말하고 지우지 않는다 — 실제로 진행 중인 일이고, 소급해서 계약을 지어내면 없던 계약이 하나 생긴다 — `apps/admin/src/pages/sales/projects/ProjectFormPage.tsx:332-334`.

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 차단 안내(`/new`) | 제목 + 설명 + warning 배너 + 링크 2개 | 링크 ○ | N | `프로젝트는 계약에서 만들어져요. …` |
| 최초 로딩(수정) | 폼 골격이 그려지되 입력이 잠긴다 | 저장 × | Y | 없음 |
| 데이터 있음 | 배너 + 좌 4카드 + 우 파이프라인 | 저장 ○ | N | 상단 안내 한 줄 |
| 조회 실패(없음) | 배너 + `목록으로` | 다시 시도 없음 | N | `프로젝트 찾을 수 없어요. …` |
| 조회 실패(오류) | 배너 + `다시 시도` + `목록으로` | 둘 다 ○ | N | `프로젝트 불러오지 못했어요.` |
| 저장 중 | 입력 전체가 잠기고 버튼이 `저장 중…` | 저장 × · 취소 × | Y | 라벨이 곧 안내다 |
| 검증 실패 | 위반 필드 아래 인라인 오류 + 첫 위반 필드로 포커스 | 저장 ○ | N | §6 문구 |
| 저장 실패 | 폼 상단 배너 + 참조 코드 | 저장 ○ | N | §7 문구 |
| 저장 충돌 | 다이얼로그. 폼은 살아 있다 | 저장 ○ | N | §7 문구 |
| 계약에서 만든 프로젝트 | info 배너 + `원 계약 보기` | — | N | `원 계약 '{이름}' 에서 만든 프로젝트예요. …` |
| 계약 없는 프로젝트(옛 데이터) | warning 배너 | — | N | `계약 없이 등록된 프로젝트예요. …` |
| 단계 = 실주 | 스텝퍼 대신 `실주 — 종료` 배지 + 실주 사유 칸이 나타난다 | 저장 ○ | N | — |
| 단계 = 그 외 | 5단 스텝퍼(리드→상담→제안→협상→수주) | 저장 ○ | N | — |
| 마일스톤 0개 | 편집기가 빈 상태로 그려진다. **'마일스톤 없음'과 '아직 안 채움'을 구분하지 않는다** — 저장 모델에 그 축이 없다 | 저장 ○ | N | — |
| 거래처 미등록 / 연결 끊김 / 목록 미도착 | 견적 폼과 같은 세 갈래 안내(§ [견적 수정](../quotes/form.md) §8) | — | 조건부 | 각 문구 |
| 읽기 전용(권한) | 저장 시 권한 배너가 막는다. 입력칸을 미리 잠그지는 않는다 | 저장 ○(누르면 배너) | N | §7 '권한 없음' |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | **×**(경로가 막혀 있다) | ○ | — | — | — | — | — |
| 운영자 | 역할의 `sales-projects` 매트릭스 | **×** | 〃 | — | — | — | — | — |
| 뷰어 | ○ | **×** | × | — | — | — | — | — |
| 권한 없음 | × | × | × | — | — | — | — | — |

**등록은 권한으로 열리지 않는다** — 전체 권한을 가진 최상위 관리자도 이 화면에서 프로젝트를 만들 수 없다.

**권한이 없을 때 화면이 어떻게 되는가** — 읽기가 없으면 본문이 권한 화면이 된다. 수정 권한만 없으면 폼은 열리지만 저장이 배너로 막힌다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-SALES-PROJECTS-FORM`(`/new`) | `계약 목록으로` | `SCR-SALES-CONTRACTS` | N | 언제나 | 없음 | — |
| `SCR-SALES-PROJECTS-FORM`(`/new`) | `프로젝트 목록으로` | `SCR-SALES-PROJECTS` | N | 언제나 | 없음 | — |
| `SCR-SALES-PROJECTS-FORM` | 상단 `목록으로` · `취소` | `SCR-SALES-PROJECTS` | N | dirty 면 이탈 가드를 먼저 거친다 | 없음 | — |
| `SCR-SALES-PROJECTS-FORM` | 저장 성공 | `SCR-SALES-PROJECTS` | N | 검증·저장 성공 | 없음 | — |
| `SCR-SALES-PROJECTS-FORM` | `원 계약 보기` | `SCR-SALES-CONTRACTS-FORM` | N | `contractId` 가 있을 때 | 계약 id | 이 폼(뒤로가기) |
| `SCR-SALES-PROJECTS-FORM` | 거래처 셀렉트의 `거래처 등록` | `SCR-SALES-ACCOUNTS-FORM` | N | 미등록을 골랐을 때 | 없음 | 이 폼(뒤로가기) |
| `SCR-SALES-PROJECTS-FORM` | 앱 안 링크 · 뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-SALES-PROJECTS-FORM` | 탭 닫기 · 새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-SALES-PROJECTS-FORM` | 저장 → 409/412 | `DLG-COMMON-FORM-CONFLICT` | Y | 서버가 충돌로 거절 | 서버 사유 | 같은 폼(입력 유지) |
| `SCR-SALES-PROJECTS-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면에는 자기 팝업이 없다** — 뜨는 것은 공통 이탈 가드와 공통 저장 충돌 다이얼로그뿐이다.
