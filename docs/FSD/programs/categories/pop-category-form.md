# 프로그램 카테고리 추가·수정 (팝업)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 카테고리 추가 / 카테고리 수정 |
| 화면 ID | `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` |
| 메뉴 경로 | 프로그램 관리 > 카테고리 > (추가 · 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 카테고리 한 건의 **이름**과 **상위 카테고리**를 받아 만들거나 고친다.

**업무 배경** — 카테고리는 2단계까지만 만든다. 상위를 고르지 않으면 대분류(1Depth), 고르면 그 아래 중분류(2Depth)가 된다. 3단계를 만들지 않는 규칙은 저장소가 강제하고, 이 팝업은 **애초에 대분류만 후보로 준다**.

**화면 설명** — 입력 두 칸(이름 · 상위 카테고리)과 버튼 둘(취소 · 추가/저장)이 전부다. 등록과 수정을 한 팝업이 겸한다.

**주요 사용자** — 최상위 관리자 · 콘텐츠/펀딩 담당 운영자.

**사용 시나리오**

1. 목록의 `카테고리 추가` 로 열어 이름만 넣고 저장한다 → 대분류가 생긴다.
2. 대분류 행의 `+` 로 열면 **상위가 이미 채워진 채** 뜬다 → 이름만 넣으면 중분류가 된다.
3. 하위를 가진 대분류를 연필로 연다 → **상위 셀렉트가 잠기고** 그 이유가 힌트에 뜬다.

**선행 조건** — 부모 화면(`SCR-PROGRAMS-CATEGORIES`)이 열려 있고, 그 화면의 추가·수정 컨트롤을 눌렀을 때.

**후행 처리** — 저장하면 팝업이 닫히고 부모 목록이 갱신되며 부모가 성공 토스트를 띄운다. 이름을 고치면 그 카테고리를 쓰는 프로그램의 비정규화 라벨도 함께 갱신된다 — `apps/admin/src/pages/programs/_shared/store.ts:506-508`.

**관련 화면** — [카테고리 목록](index.md) `SCR-PROGRAMS-CATEGORIES`(부모) · [프로그램 등록·수정](../form.md)(여기서 만든 분류를 고르는 곳) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 해당 없음 — 메뉴 항목이 아니다.

**관련 기능** — 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 모달을 재사용한다. 쓰기 배선은 공통 CRUD 프레임워크의 저수준 훅이다 — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:3-4`.

**관련 API** — 카테고리 등록 1건 또는 갱신 1건. **백엔드가 없다** — `TODO(backend): GET/POST /api/programs/categories · PUT/DELETE /api/programs/categories/:id (사용 중이면 409)` — `apps/admin/src/pages/programs/data-source.ts:37`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일** — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx` (검증 `../../validation.ts` · 저장소 `../../_shared/store.ts` · 어댑터 `../../data-source.ts`)

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 딤(배경 가림막) | 뒤 화면을 덮고, 클릭하면 닫기 요청이 된다 | 팝업이 열린 동안 | 전체 | 불가 | 표시 |
| 모달 헤더 | 제목 + 닫기(×) | 〃 | 전체 | 불가 | 표시 |
| 안내영역 | 저장 실패 배너 | 저장 실패 시 | 전체 | 불가 | 숨김 |
| 입력영역 | 카테고리 이름 · 상위 카테고리 | 팝업이 열린 동안 | 전체 | 불가 | 표시 |
| 모달 푸터 | `취소` · `추가`/`저장` | 〃 | 전체 | 불가 | 표시 |

**이 팝업의 확인 다이얼로그는 팝업 밖에 렌더된다** — 안에 두면 팝업의 포커스 트랩이 다이얼로그를 가둔다 — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:196`.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 모달 제목 | Heading(h2) | `카테고리 추가` / `카테고리 수정` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:122` | 수정 대상 유무로 갈린다 | Y | Y | — | — | — | — | 항상 | 모달의 `aria-labelledby` 대상 |
| 2 | 닫기(×) | IconButton | `닫기` — `packages/ui/src/organisms/Modal/Modal.tsx:239` | 취소와 같은 결과를 낸다 | N | N | 없음 | — | — | — | 항상 | aria-label 로만 존재하는 라벨 |
| 3 | 저장 실패 배너 | Alert(danger) | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:99` | 팝업 안 맨 위 | N | Y | — | 없음 | — | — | 저장 실패 시 | — |
| 4 | 카테고리 이름 | TextField | `카테고리 이름` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:146` | 필수. **팝업이 열리면 이 칸에 포커스가 간다** | Y | N | 저장 중 | 수정이면 기존 이름, 추가면 빈 값 | `예: 테크·가전` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:156` | 40자 — `apps/admin/src/pages/programs/_shared/store.ts:132` | 항상 | `initialFocusRef` |
| 5 | 상위 카테고리 | SelectField | `상위 카테고리` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:173` · 힌트가 갈린다: 잠겼으면 `하위 카테고리가 있어 상위를 바꿀 수 없어요.` · 아니면 `선택하지 않으면 대분류(1Depth)로 만들어져요. 카테고리는 2단계까지 만들 수 있어요.` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:176-177` | **대분류만 후보다.** 수정 중이면 자기 자신을 후보에서 뺀다 | N | N | 저장 중 · **하위를 가진 대분류를 수정할 때** | 수정이면 기존 상위, `+` 로 열었으면 그 대분류, 그 밖에는 없음 | 첫 항목 `없음 (대분류)` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:185` | — | 항상 | `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:55-59` |
| 6 | 취소 | Button(secondary) | `취소` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:133` | 입력이 있으면 이탈 가드를 세운다 | N | N | 저장 중 | — | — | — | 항상 | — |
| 7 | 추가/저장 | Button(primary) | `추가`(신규) / `저장`(수정) / 저장 중 `저장 중…` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:136` | 폼 제출 버튼 | Y | N | 저장 중 | — | — | — | 항상 | — |

## 4. 기능 명세

### 4.1 카테고리 등록

| 항목 | 내용 |
|---|---|
| 기능 목적 | 새 분류를 만든다 |
| 실행 조건 | 부모가 `카테고리 추가` 또는 대분류 행의 `+` 로 팝업을 열었을 때 |
| 사용자 동작 | 이름을 넣고 (필요하면 상위를 고른 뒤) `추가` 클릭 |
| 시스템 처리 | 이름의 앞뒤 공백을 다듬고, 상위 셀렉트의 빈 문자열('없음')은 **최상위를 뜻하므로 저장소에는 없음으로 넘긴다** — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:94-95` |
| 데이터 처리 | 카테고리 1건이 생긴다 |
| Validation | §6 전부 |
| API 호출 여부 | Y — 등록 1건 |
| 성공 처리 | 팝업이 닫히고 **부모가** 토스트를 띄운다: `'{카테고리명}' 카테고리를 추가했어요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:406` |
| 실패 처리 | 팝업이 닫히지 않고 안쪽 danger 배너로 말한다. 입력은 그대로 남는다 |
| 예외 처리 | 사용자가 팝업을 닫아 요청이 중단되면 아무 표시도 하지 않는다 — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:98` |
| 화면 변경 사항 | 팝업 · 부모 목록 |
| 후속 동작 | 프로그램 폼의 셀렉트와 목록 필터에 나타난다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.2 카테고리 수정

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이름과 상위를 고친다 |
| 실행 조건 | 부모가 연필로 팝업을 열었을 때 |
| 사용자 동작 | 값을 고치고 `저장` 클릭 |
| 시스템 처리 | 갱신 1건을 보낸다 |
| 데이터 처리 | 이름이 바뀌면 **그 카테고리를 쓰는 프로그램의 비정규화 라벨도 함께 갱신된다** — `apps/admin/src/pages/programs/_shared/store.ts:506-508` |
| Validation | §6 전부 |
| API 호출 여부 | Y — 갱신 1건 |
| 성공 처리 | 팝업이 닫히고 부모가 토스트를 띄운다: `'{카테고리명}' 카테고리를 저장했어요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:406` |
| 실패 처리 | §4.1 과 같다 |
| 예외 처리 | **하위를 가진 대분류는 상위를 바꿀 수 없다** — 셀렉트가 잠기고 그 이유가 힌트로 뜬다. 저장소도 같은 규칙으로 한 번 더 막는다(§6) |
| 화면 변경 사항 | 팝업 · 부모 목록 |
| 후속 동작 | 프로그램 목록의 카테고리 열 표기가 바뀐다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.3 저장하지 않은 변경 보호 (모달 닫기)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 반쯤 채운 입력이 조용히 사라지는 것을 막는다 |
| 실행 조건 | 폼이 dirty 이고 저장 중이 아닐 때 — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:82` |
| 사용자 동작 | Esc · 딤 클릭 · 닫기(×) · `취소` — **네 경로가 모두 같은 요청으로 모인다** |
| 시스템 처리 | 공통 모달 닫기 가드 `DLG-COMMON-LEAVE-MODAL` 을 세운다. dirty 가 아니면 프롬프트 없이 즉시 닫는다 |
| 데이터 처리 | 확인하면 입력이 버려지고 팝업이 닫힌다 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 팝업이 닫힌다. **토스트를 띄우지 않는다** |
| 실패 처리 | 실패할 것이 없다(서버를 부르지 않는다) |
| 예외 처리 | 이 다이얼로그는 **팝업 밖에** 렌더된다 — 안에 두면 포커스 트랩이 다이얼로그를 가둔다 |
| 화면 변경 사항 | 다이얼로그만. 팝업은 그대로 있다 |
| 후속 동작 | 팝업 닫힘 또는 머무름 |
| 로그 기록 여부 | N |

**이 팝업에는 자기 토스트가 없다** — [인벤토리](../../inventory.md) §9.3 에 `pages/programs/categories/components/ProgramCategoryFormModal.tsx` 가 없다. 성공 통지는 **부모 화면이** 낸다.

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 팝업 열림 | 부모가 추가·수정을 요청 | 배경 스크롤 잠금 · 배경 격리 · **이름 칸에 포커스** | 모달 껍데기 | 팝업 표시 |
| 이름 입력 | 타이핑 | dirty 가 된다(이탈 가드가 켜진다) | 카테고리 이름 | — |
| 상위 선택 | 셀렉트 변경 | 〃 | 상위 카테고리 | — |
| 제출 | `추가`/`저장` 또는 Enter | 서버 오류 배너를 지우고 검증 → 전송 | 팝업 | 저장 중 |
| 검증 실패 | 위반 있음 | 요청을 만들지 않고 **이름 칸으로 포커스** | 카테고리 이름 | 인라인 오류 |
| 저장 성공 | 서버 응답 | 팝업 닫힘 + 부모 목록 갱신 + 부모 토스트 | 부모 화면 | 갱신된 목록 |
| 저장 실패 | 서버 오류 | 팝업 안 danger 배너 | 안내영역 | 팝업 유지 |
| 저장 중단 | 팝업이 닫혀 요청 취소 | 아무 표시도 하지 않는다 | — | — |
| Esc · 딤 · × · 취소 | 닫기 요청 | dirty 면 `DLG-COMMON-LEAVE-MODAL`, 아니면 즉시 닫힘 | 다이얼로그 또는 팝업 | 확인=닫힘 |
| 팝업 닫힘 | 위 어느 경로로든 | 포커스가 **연 버튼으로 복귀** | 모달 껍데기 | 부모 화면 |

## 6. Validation

**규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/programs/validation.ts`.

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 카테고리 이름 | 필수 · 40자 이하 | 제출 시 | 공통 필수 문구 생성기가 만든다(`requiredText('카테고리 이름', 40)` — `apps/admin/src/pages/programs/validation.ts:106`) | 제출 차단 · 이름 칸으로 포커스 · 인라인 오류 |
| 상위 카테고리 | 검증하지 않는다(빈 값이면 최상위) | — | — | 빈 문자열을 저장소의 '없음'으로 옮긴다 |
| 상위 — 3단계 금지 | 상위는 1Depth 만 | 저장소 | `카테고리는 2단계까지만 만들 수 있어요.` — `apps/admin/src/pages/programs/_shared/store.ts:479` | 팝업이 대분류만 후보로 주므로 화면에서는 고를 수 없다 |
| 상위 — 자기 자신 | 자기를 상위로 지정할 수 없다 | 저장소 | `자기 자신을 상위 카테고리로 지정할 수 없어요.` — `apps/admin/src/pages/programs/_shared/store.ts:474` | 팝업이 후보에서 자기를 뺀다 |
| 상위 — 없는 상위 | 상위가 실재해야 한다 | 저장소 | `상위 카테고리를 찾을 수 없어요.` — `apps/admin/src/pages/programs/_shared/store.ts:477` | 팝업 안 배너 |
| 상위 이동 — 하위 보유 | 하위가 있는 대분류는 다른 대분류 밑으로 못 간다 | 저장소 | `하위 카테고리가 있는 카테고리는 다른 카테고리 밑으로 옮길 수 없어요.` — `apps/admin/src/pages/programs/_shared/store.ts:499` | 셀렉트가 미리 잠긴다 |
| 이름 중복 | ⚠ **검증하지 않는다** | — | — | 같은 이름의 카테고리를 여럿 만들 수 있다 |

**화면 잠금과 저장소 거절이 같은 사실을 본다** — 상위 셀렉트가 잠기는 조건(하위 보유)과 저장소가 거절하는 조건이 같아서, 화면에서 고를 수 있는데 저장이 실패하는 경로가 생기지 않는다. 다만 **저장소의 세 문구는 다른 관리자가 그 사이에 구조를 바꾼 경우에만 화면에 닿는다.**

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 해당 없음 — 이 팝업은 조회하지 않는다. 값은 부모가 넘겨준다 | — | — |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:99` | 팝업이 닫히지 않고 입력을 유지한다 | `추가`/`저장` 재클릭 |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로다 — 한 팝업이 등록과 수정을 겸한다 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 팝업에는 삭제가 없다(부모의 일이다) | — | — |
| API 오류 | 위 저장 실패 문구를 그대로 쓴다. 서버 응답 원문·상태 코드를 문장으로 노출하지 않는다 | 〃 | 〃 |
| 서버 오류 | 위와 같다 — 5xx 에 별도 문구를 두지 않는다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | **자동 재시도를 하지 않는다** — `apps/admin/src/shared/query/queryClient.ts:108` | 〃 |
| 권한 없음 | **이 팝업에는 권한 판정이 없다.** 부모가 `카테고리 추가`·`+` 를 등록 권한으로 가리지만, 연필에는 판정이 없어 읽기 권한만으로도 이 팝업이 열린다. 막는 것은 서버뿐이고 그 거절은 위 저장 실패 배너로 나타난다 | 팝업은 그대로 열린다 | 관리자에게 권한 요청 |
| 세션 만료 | 이 팝업은 자기 문구를 갖지 않는다. 401 이면 앱 전체가 로그인 화면으로 이동하고 그 화면이 `세션이 만료되었어요. 다시 로그인해 주세요.` 를 띄운다 — `apps/admin/src/pages/login/LoginPage.tsx:58` | 세션을 지우고 원래 경로를 보존해 이동 | 재인증하면 부모 화면으로 돌아온다 |
| 데이터 충돌 | **이 팝업에는 충돌 다이얼로그가 없다.** 다른 관리자가 먼저 지웠거나 구조를 바꿨으면 저장소의 거절 사유가 위 저장 실패 배너 자리에 뜨는 것이 아니라, 화면은 일반 실패 문구를 쓴다 | 덮어쓰지 않는다 | 팝업을 닫고 목록을 다시 읽는다 |
| 중복 데이터 | ⚠ **막지 않는다** — 같은 이름의 카테고리를 여럿 만들 수 있다(§6) | 그대로 저장된다 | 목록에서 눈으로 확인해 정리한다 |
| 파일 업로드 실패 | 해당 없음 — 이 팝업에 파일 입력이 없다 | — | — |

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 성립하지 않는다 — 조회 없이 즉시 그려진다(값은 부모가 넘긴다) | 추가/저장 ○ | N | 상위 셀렉트의 힌트 |
| 데이터 있음(추가) | 빈 이름 칸 + 상위 셀렉트 | 추가 ○ | N | `선택하지 않으면 대분류(1Depth)로 만들어져요. 카테고리는 2단계까지 만들 수 있어요.` |
| 데이터 있음(수정) | 기존 값이 채워진 두 칸 | 저장 ○ | N | 〃 |
| 하위 추가 모드 | 상위가 **미리 채워진 채** 열린다 | 추가 ○ | N | 〃 |
| 상위 잠김 | 상위 셀렉트가 비활성 | 저장 ○ | N | `하위 카테고리가 있어 상위를 바꿀 수 없어요.` |
| 데이터 없음 | 성립하지 않는다 — 이 팝업은 목록을 그리지 않는다 | — | N | — |
| 조회 실패 | 성립하지 않는다 — 조회가 없다 | — | N | — |
| 저장 중 | 두 입력과 버튼 둘이 전부 잠기고 라벨이 `저장 중…` | 취소 × · 저장 × | Y | 라벨이 곧 안내다 |
| 검증 실패 | 이름 칸 아래 인라인 오류 + 그 칸으로 포커스 | 저장 ○ | N | §6 의 해당 문구 |
| 저장 실패 | 팝업 안 맨 위 danger 배너, 입력 유지 | 저장 ○ | N | §7 문구 |
| 미저장 이탈 시도 | 팝업 위에 `DLG-COMMON-LEAVE-MODAL` | 확인·취소 ○ | N | 그 다이얼로그의 문구 |
| 읽기 전용(권한) | **성립하지 않는다** — 이 팝업은 권한으로 잠기지 않는다. 저장 시 서버가 거절한다 | 저장 ○ | N | §7 '권한 없음' |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | — | — | — |
| 운영자 | 역할의 `program-categories` 매트릭스 | 〃 | 〃 | — | — | — | — | — |
| 뷰어 | ○ | × (부모가 버튼을 감춘다) | ○(화면상 열린다) | — | — | — | — | — |
| 권한 없음 | × | × | × | — | — | — | — | — |

**이 팝업 자체에는 권한 축이 없다** — 부모 기능의 권한을 물려받는다. 부모가 `카테고리 추가`·`+` 를 `create` 로 감추므로 등록 경로는 막히지만, **연필에는 판정이 없어 수정 팝업은 읽기 권한만으로도 열린다**(§ [카테고리 목록](index.md) §9).

**권한이 없을 때 화면이 어떻게 되는가** — 등록 권한이 없으면 이 팝업을 여는 버튼이 부모에 없다. 수정 경로는 열리되 저장이 서버에서 거절된다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-PROGRAMS-CATEGORIES` | `카테고리 추가` · `+` · 연필 | `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` | Y | 부모의 컨트롤이 보일 때 | 수정 대상 또는 상위 카테고리 id | 부모 화면 |
| `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` | 저장 성공 | 부모 화면(팝업 닫힘) | — | 검증·저장 성공 | 저장된 이름 · 수정 여부 | `SCR-PROGRAMS-CATEGORIES` |
| `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` | Esc · 딤 · × · `취소` | `DLG-COMMON-LEAVE-MODAL` | Y | 입력이 있을 때 | 없음 | 확인=부모 화면 · 취소=팝업 |
| `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` | 〃 (입력이 없을 때) | 부모 화면(즉시 닫힘) | — | dirty 가 아닐 때 | 없음 | `SCR-PROGRAMS-CATEGORIES` |
| `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 부모 화면 |

**이 팝업이 여는 다이얼로그는 공통 층 하나뿐이다** — 모달 닫기 가드. [인벤토리](../../inventory.md) §8.2 의 화면 고유 확인 다이얼로그 목록에 이 팝업이 없다.
