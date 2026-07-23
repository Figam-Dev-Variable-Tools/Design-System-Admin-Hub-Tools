# 개인정보 처리방침

> 이 화면은 [약관 관리](../terms/index.md)(`SCR-CONTENT-TERMS`)와 **같은 화면**이다 —
> 버전 이력 표 · `현재` 배지 · 검색 · 새 버전 등록 · 선택 바 · 삭제 확인 둘 · 페이지네이션 없음 ·
> 요약 건수 줄 없음. **다른 것은 하나다: 약관 종류 축이 없다**(단일 문서다).
> 아래 각 절은 그 차이와 문구만 적는다. 판정 규칙(§4.5 시행일과 상태)은 약관 문서의 것을 그대로 따른다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 개인정보 처리방침 |
| 화면 ID | `SCR-CONTENT-PRIVACY` |
| 메뉴 경로 | 콘텐츠 관리 > 개인정보 처리방침 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 개인정보 처리방침의 **버전 이력**을 시행일·상태와 함께 훑고, 새 버전을 등록하거나 지운다.

**업무 배경** — 처리방침은 법정 고지 문서이고 개정 이력이 곧 증빙이다. 약관과 같은 이유로 버전을 쌓는다. 다만 문서가 하나뿐이라 **종류를 고르는 축이 없다** — `apps/admin/src/pages/content/privacy/types.ts:3-4`.

**화면 설명** — 툴바(검색 + '새 버전 등록') 아래에 선택 바와 버전 이력 표가 온다. 왼쪽 필터 패널이 없다.

**주요 사용자** — 최상위 관리자 · 개인정보 문서를 관리하는 운영자.

**사용 시나리오**

1. 개정본 v2.1 을 등록하고 시행일을 다음 달로, 상태를 '시행예정'으로 둔다.
2. 시행일이 되면 v2.1 을 '시행중'으로, v2.0 을 '만료'로 바꾼다(자동으로 바뀌지 않는다).
3. 잘못 등록한 버전을 지운다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈(`cms.pages`) — `apps/admin/src/shared/entitlements/module-resources.ts:71`.

**후행 처리** — 약관과 달리 **동의 이력 화면이 이 문서를 재동의 산출에 쓰는 배선은 코드에서 확인하지 못했다** — 공통 조회기(`apps/admin/src/shared/domain/terms-version.ts`)는 약관 종류만 다룬다.

**관련 화면** — [처리방침 버전 상세](detail.md)(`SCR-CONTENT-PRIVACY-DETAIL`) · [처리방침 버전 등록·수정](form.md)(`SCR-CONTENT-PRIVACY-FORM`) · [약관 관리](../terms/index.md)(같은 형태) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 콘텐츠 관리 가지의 일곱 번째(마지막) 잎 — `apps/admin/src/shared/layout/nav-config.ts:150`.

**관련 기능** — 없음 — 다른 화면의 값이 이 목록을 바꾸지 않는다.

**관련 API** — 버전 목록 조회 1건 · 삭제 1건. **백엔드가 없다** — `apps/admin/src/pages/content/privacy/data-source.ts:48`(목록) · `:100`(삭제).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx` (표 `apps/admin/src/shared/ui/VersionHistoryTable.tsx` · 조회 `queries.ts` · 데이터 `data-source.ts` · 타입 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 약관 관리와 같다. 쓰기가 픽스처를 바꾸지 않고(`apps/admin/src/pages/content/privacy/data-source.ts:78-104`), 쓰기 권한 게이팅이 없으며, 상태는 사람이 고른 값이라 시행일이 지나도 저절로 바뀌지 않는다.

## 2. 페이지(UI) 구성

약관 관리와 같되 **필터영역(왼쪽 약관 종류)이 없다.** 남는 영역은 검색 · 버튼 · 선택 바 · 목록 · 오류 다섯이다.

**조회 실패는 화면 전체를 대신한다** — 약관 관리는 툴바를 남기고 표만 배너로 바꾸지만, 이 화면은 툴바까지 사라지고 배너만 남는다 — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:183-201`.

## 3. UI 컴포넌트 정의

약관 관리와 같은 것(선택 체크박스 · 순번 · 버전 링크 · `현재` 배지 · 시행일 · 상태 배지 · 행 액션 둘 · 표 설명의 구조)은 다시 적지 않는다. 다른 값과 문구만 적는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 검색 입력 | SearchField | `처리방침 버전 검색` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:209` | 버전 표기에서 찾는다 | N | N | 없음 | 주소의 `q` | 없음 | — | 항상 | — |
| 2 | 새 버전 등록 | Button(primary) | `새 버전 등록` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:213` | 등록 폼으로 이동 | N | N | **없음**(약관과 달리 잠기지 않는다 — 고를 종류가 없다) | — | — | — | 항상 | ⚠ 권한과 무관하게 보인다(§9) |
| 3 | 일괄 삭제 | Button(danger) | `선택 {N}건 삭제` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:219` | — | N | N | 일괄 삭제 요청 중 | — | — | — | 선택 바 안 | — |
| 4 | 표 설명 | caption(보조기술 전용) | `개인정보 처리방침 버전 이력 — 체크박스로 선택하고, 행을 누르면 전문을 봐요. 수정/삭제 버튼으로 각 버전을 관리해요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:225` | — | N | Y | — | — | — | — | 항상 | — |
| 5 | 빈 상태 문구 | Text | 조회 중 `불러오는 중…` · 조회 후 `등록된 버전이 없어요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:230` | 0행일 때 | N | Y | — | — | — | — | 0행 | — |
| 6 | 조회 실패 배너 | Alert(danger) + Button | `개인정보 처리방침을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:188,194` | 화면 전체를 대신한다 | N | Y | — | 숨김 | — | — | 조회 실패 | — |

## 4. 기능 명세

약관 관리의 §4.2(이력 조회) · §4.3(검색) · §4.4(폼 이동) · §4.5(시행일과 상태) · §4.6(단건 삭제) · §4.7(일괄 삭제)와 **동작이 같다**. §4.1(종류 고르기)은 **성립하지 않는다.** 다른 것만 적는다.

| 항목 | 처리방침의 값 |
|---|---|
| 주소 파라미터 | `q` 하나뿐이다 — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:82`. 종류·페이지 파라미터가 없다 |
| 등록 이동 | `/content/privacy/new` — 종류를 실어 보내지 않는다 — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:212` |
| 수정 이동 | `/content/privacy/{id}/edit` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:226` |
| 상세 이동 | `/content/privacy/{id}` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:229` |
| 단건 성공 토스트 `MSG-CONTENT-PRIVACY-01` | `{버전} 버전을 삭제했어요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:130` |
| 단건 실패 배너 | `버전을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:134` |
| 단건 확인 다이얼로그 | 제목 `처리방침 버전 삭제` · 본문 `{버전} 버전을 삭제할까요? 되돌릴 수 없어요.` · 확인 `버전 삭제` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:244-246` |
| 일괄 성공 토스트 `MSG-CONTENT-PRIVACY-02` | `버전 {N}건을 삭제했어요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:177` |
| 일괄 실패 배너 | `버전 {총}건 중 {실패}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:171` |
| 일괄 확인 다이얼로그 | 제목 `처리방침 버전 일괄 삭제` · 본문 `선택한 버전 {N}건을 삭제할까요? 되돌릴 수 없어요.` · 확인 `{N}건 삭제` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:257-259` |
| 시행일·상태 판정 | 약관 관리 §4.5 와 **글자까지 같다** — `현재` 배지는 저장된 상태(`시행중`)만 보고, 시행일은 표시만 된다 — `apps/admin/src/pages/content/privacy/types.ts:37-39`. 세 가지 결함(자동 전이 없음 · 미래 시행일 + 시행중 허용 · 시행중 중복 허용)도 같다 |

**이 화면 고유의 기능은 없다.**

## 5. 이벤트 정의

약관 관리의 이벤트 표에서 **'종류 클릭' 한 줄을 뺀 것**이다. 나머지(진입 · 검색 · 행 클릭 · 연필 · 체크박스 · 삭제 둘 · 조회 실패 · 다시 시도 · 새 버전 등록)는 같고 목적지 경로와 문구만 다르다.

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 검색어 | 검증하지 않는다 | — | — | — |

이 화면에는 사용자에게 보이는 검증 오류가 없고, 접어야 할 주소 파라미터도 없다(검색어 하나뿐이다).

## 7. 예외 처리

약관 관리의 §7 과 같다. 문구만 다르다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `등록된 버전이 없어요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:230` | 표 안 한 줄 | 검색을 직접 지운다 |
| 조회 결과를 모름 | 조회 중에는 같은 자리에 `불러오는 중…` 이 뜬다 — 0건과 구분된다 | — | 기다린다 |
| 저장 실패 | 해당 없음 — 등록·수정은 폼 화면 | — | — |
| 수정 실패 | 해당 없음 — 인라인 수정이 없다 | — | — |
| 삭제 실패 | 단건 `버전을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:134` · 일괄 `버전 {총}건 중 {실패}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `:171` | 다이얼로그를 닫지 않고 배너 | 확인 재클릭 |
| API 오류 | `개인정보 처리방침을 불러오지 못했어요.` — `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:188` | **화면 전체가 배너로 바뀐다** + '다시 시도' | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | 읽기 권한이 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. ⚠ 쓰기 권한이 없을 때의 문구는 없다(§9) | 읽기는 라우트 가드가 막는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인 후 이 목록(검색어와 함께) |
| 데이터 충돌 | 충돌 문구가 없다 | 삭제 실패 문구로 뭉개진다 | 목록을 다시 조회 |
| 중복 데이터 | ⚠ 막지 않는다 — 같은 버전 표기를 여러 건 등록할 수 있고 `시행중` 이 여럿일 수도 있다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 파일 입력이 없다 | — | — |

## 8. 화면 상태(State)

약관 관리의 §8 과 같다. 다른 것은 둘이다 — 등록 버튼이 처음부터 눌리고, 조회 실패가 화면 전체를 대신한다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 툴바는 그려지고 표는 빈 행에 `불러오는 중…` | 새 버전 등록 ○ | Y | `불러오는 중…` |
| 데이터 있음 | 버전 행 · `시행중` 버전에 `현재` 배지 | 새 버전 등록 ○ · 행 액션 ○ | N | — |
| 데이터 없음(0건) | 표 안 한 줄 | 새 버전 등록 ○ | N | `등록된 버전이 없어요.` |
| 조회 실패 | **툴바까지 사라지고 배너만 남는다** | 다시 시도 ○ | N | `개인정보 처리방침을 불러오지 못했어요.` |
| 선택 있음 | 선택 바가 나타난다 | 일괄 삭제 ○ | N | — |
| 삭제 중 | 그 행의 액션이 잠기고 다이얼로그 확인이 `처리 중…` | 확인 × · 취소 ○ | Y | 라벨이 곧 안내다 |
| 삭제 실패 | 다이얼로그가 열린 채 배너 | 확인 ○ · 취소 ○ | N | §7 의 삭제 실패 문구 |
| 읽기 전용(권한) | 읽기 권한이 없으면 `접근 권한이 없어요` 화면. 쓰기 권한만 없는 상태는 화면에 나타나지 않는다 | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `page:/content/privacy` 권한을 따른다 | 〃 | 〃 | 〃 | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — 약관 관리와 같다. ⚠ 쓰기 권한이 없어도 등록·연필·삭제·선택 체크박스가 그대로 보이고 눌린다(`PrivacyPage.tsx` 에 `useRouteWritePermissions` 없음).

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-PRIVACY` | 행 클릭 · 버전 링크 클릭 | `SCR-CONTENT-PRIVACY-DETAIL` | N | 행이 그려져 있음 | 버전 id | 검색어가 복원된 이 목록 |
| `SCR-CONTENT-PRIVACY` | `새 버전 등록` 클릭 | `SCR-CONTENT-PRIVACY-FORM`(등록) | N | 없음 | 없음 | 저장·취소 후 이 목록 |
| `SCR-CONTENT-PRIVACY` | 행 연필 클릭 | `SCR-CONTENT-PRIVACY-FORM`(수정) | N | 그 행이 삭제 중이 아님 | 버전 id | 〃 |
| `SCR-CONTENT-PRIVACY` | 행 삭제 클릭 | 처리방침 버전 삭제 확인 다이얼로그 | Y | 〃 | 대상 1건 | 이 목록 |
| `SCR-CONTENT-PRIVACY` | 일괄 삭제 클릭 | 처리방침 버전 일괄 삭제 확인 다이얼로그 | Y | 1건 이상 선택 | 선택 id 목록·건수 | 이 목록 |
| `SCR-CONTENT-PRIVACY` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 목록 |

**이 화면이 여는 팝업(모달)은 없다.** 확인 다이얼로그 2건은 인벤토리의 `apps/admin/src/pages/content/privacy/PrivacyPage.tsx:242,255` 와 일치한다.

**이 화면의 결과 통지 토스트는 2건**이고 §4 의 표에 문구 그대로 적혀 있다. 인벤토리(성공 2 · 실패 0)와 일치한다.
