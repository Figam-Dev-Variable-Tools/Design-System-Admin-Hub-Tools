# 배너 관리

> 이 화면은 [팝업 관리](../popups/index.md)(`SCR-CONTENT-POPUPS`)와 **같은 화면 형태**다 —
> 툴바(검색 + 세그먼트 필터 + 등록) · 선택 바 셋(일괄 ON · 일괄 OFF · 일괄 삭제) · 표(행마다 ON/OFF 토글 ·
> 행 액션 수정/삭제) · 페이지네이션 · 조회 실패 배너 · 삭제 확인 둘. 상세 화면이 없는 것도 같다.
> 아래 각 절은 **다른 것만** 적는다. 다른 것은 둘이다: **위치 축이 메인/서브** · **드래그로 순서를 바꾼다**.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 배너 관리 |
| 화면 ID | `SCR-CONTENT-BANNERS` |
| 메뉴 경로 | 콘텐츠 관리 > 배너 관리 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 홈페이지의 메인·서브 배너를 찾고, 순서를 바꾸고, 켜고 끄고, 지운다.

**업무 배경** — 배너는 순서가 곧 노출 우선순위다. 그리고 노출 사고가 나면 "메인 배너 2페이지의 그 배너"를 서로 링크로 주고받으며 확인한다 — 그래서 조회 조건이 주소에 남아야 한다 — `apps/admin/src/pages/content/banners/BannersPage.tsx:87-91`.

**화면 설명** — 팝업 관리와 같은 배치이며, 조건이 걸리지 않은 상태에서는 행을 끌어 순서를 바꿀 수 있다.

**주요 사용자** — 최상위 관리자 · 콘텐츠를 다루는 운영자.

**사용 시나리오**

1. 새 기획전 배너를 맨 앞으로 끌어 올린다 → 놓는 즉시 저장되고 성공 토스트가 뜬다.
2. 잘못 올라간 배너의 토글을 끈다 → 즉시 저장된다.
3. '서브' 만 걸어 놓고 지난 배너를 정리한다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈(`cms.pages`) — `apps/admin/src/shared/entitlements/module-resources.ts:69`.

**후행 처리** — 팝업 관리와 같다. 홈페이지는 이 리포 밖이라 반영 경로를 코드에서 확인하지 못했다.

**관련 화면** — [배너 등록·수정](form.md)(`SCR-CONTENT-BANNERS-FORM`) · [팝업 관리](../popups/index.md)(같은 형태) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md). **상세 화면이 없다.**

**관련 메뉴** — 콘텐츠 관리 가지의 다섯 번째 잎 — `apps/admin/src/shared/layout/nav-config.ts:148`.

**관련 기능** — 없음.

**관련 API** — 목록 조회 · 단건 삭제 · ON/OFF 변경 · 순서 저장 넷. **백엔드가 없다** — `apps/admin/src/pages/content/banners/data-source.ts:72`(목록) · `:189`(삭제) · `:117`(ON/OFF) · `:160`(순서).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/banners/BannersPage.tsx` (표 `components/BannersTable.tsx` · 미리보기 `components/BannerPreview.tsx` · 조회 `queries.ts` · 데이터 `data-source.ts` · 타입 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 등록·수정·삭제는 픽스처를 바꾸지 않는다(`apps/admin/src/pages/content/banners/data-source.ts:170-193`). **ON/OFF 와 순서 저장은 실제로 바꾼다**(`:117-133,160-168`). 쓰기 권한 게이팅은 없다(§9).

## 2. 페이지(UI) 구성

팝업 관리와 같다. 목록영역의 표가 **조건이 없을 때 드래그 손잡이 열을 하나 더 갖는다** — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:128`.

## 3. UI 컴포넌트 정의

팝업 관리와 같은 것은 다시 적지 않는다. 다른 값과 문구만 적는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 검색 입력 | SearchField | `배너 제목 검색` — `apps/admin/src/pages/content/banners/BannersPage.tsx:296` | 제목에서 찾는다 | N | N | 없음 | 주소의 `q` | 없음 | — | 항상 | — |
| 2 | 위치 필터 | SegmentedControl | 보조기술 이름 `배너 위치 필터` — `apps/admin/src/pages/content/banners/BannersPage.tsx:302` | 전체 · 메인 · 서브 — `apps/admin/src/pages/content/banners/types.ts:42-49` | N | N | 없음 | `전체` | — | — | 항상 | 팝업의 ON/OFF 필터와 **축이 다르다** |
| 3 | 배너 등록 | Button(primary) | `배너 등록` — `apps/admin/src/pages/content/banners/BannersPage.tsx:308` | 등록 폼으로 | N | N | 없음 | — | — | — | 항상 | ⚠ 권한과 무관하게 보인다(§9) |
| 4 | 일괄 ON · 일괄 OFF · 일괄 삭제 | Button 셋 | `일괄 ON` · `일괄 OFF` · `선택 {N}건 삭제` — `apps/admin/src/pages/content/banners/BannersPage.tsx:327,334,337` | 팝업 관리와 같다 | N | N | 각 요청 중 | — | — | — | 선택 바 안 | — |
| 5 | 드래그 손잡이 | 표 셀(손잡이) | 열 이름은 공통 컴포넌트가 만든다 | 행을 끌어 순서를 바꾼다 | N | N | 저장 중 | — | — | — | **재정렬 가능할 때만** 열이 생긴다 — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:128,163` | 조건은 §4.4 |
| 6 | 제목 | 표 셀 | 열 머리 `제목` — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:35` | 링크가 아니다(상세가 없다) | N | Y | — | — | — | — | 행마다 | — |
| 7 | 위치 | 표 셀 | 열 머리 `위치` | `메인` · `서브` — `apps/admin/src/pages/content/banners/types.ts:8-11` | N | Y | — | — | — | — | 행마다 | — |
| 8 | 노출 기간 | 표 셀 | 열 머리 `노출 기간` | `{시작} ~ {종료}` | N | Y | — | — | — | — | 행마다 | — |
| 9 | 상태 토글 | ToggleSwitch | 보조기술 이름 `{제목} 노출 여부` — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:171` | 목록에서 바로 켜고 끈다 | N | N | 그 행이 토글 요청 중 | 데이터의 값 | — | — | 행마다 | 열 머리는 `상태` |
| 10 | 정렬 순서 | 표 셀(수치) | 열 머리 `정렬 순서` — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:35` | 작을수록 앞 — `apps/admin/src/pages/content/banners/types.ts:31-32` | N | Y | — | — | — | — | 행마다 | 팝업은 `우선순위` 라는 이름이다 |
| 11 | 순서 이동 버튼 | IconButton 둘 | 공통 컴포넌트가 제목으로 이름을 만든다 — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:180-186` | 키보드로 한 칸씩 | N | N | 재정렬 저장 중 | — | — | — | 재정렬 가능할 때만 | — |
| 12 | 행 수정 · 행 삭제 | IconButton 둘 | 공통 `RowActions` — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:188-192` | 폼 이동 · 확인 다이얼로그 | N | N | 그 행이 삭제 요청 중 | — | — | — | 행마다 | — |
| 13 | 빈 상태 문구 | Text | `등록된 배너가 없어요.` — `BannersTable.tsx` 의 빈 행 | 0행일 때 | N | Y | — | — | — | — | 0행 | — |
| 14 | 표 설명 | caption(보조기술 전용) | 배너 목록의 조작 방법 + 재정렬 가능하면 ` 각 행의 위/아래 버튼 또는 드래그로 정렬 순서를 바꿔요.` — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:115-118` | — | N | Y | — | — | — | — | 항상 | 캡션이 실제 조작 가능 여부를 따라간다 |
| 15 | 조회 실패 배너 | Alert(danger) + Button | `배너 목록을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/pages/content/banners/BannersPage.tsx:373,379` | — | N | Y | — | 숨김 | — | — | 조회 실패 | — |
| 16 | 페이지네이션 | Pagination | `배너 페이지` — `apps/admin/src/pages/content/banners/BannersPage.tsx:367` | 한 페이지 10건 — `apps/admin/src/pages/content/banners/types.ts:56` | N | N | — | 1페이지 | — | — | 항상 | — |

## 4. 기능 명세

### 4.1 목록 조회 · 위치 필터 · 제목 검색

팝업 관리의 같은 기능과 동작이 같다. 다른 것만 적는다.

| 항목 | 차이 |
|---|---|
| 주소 파라미터 | `placement` · `q` · `page` — `apps/admin/src/pages/content/banners/BannersPage.tsx:41` |
| 필터 축 | 위치(전체·메인·서브). **ON/OFF 축이 필터에 없다** |
| 조회 실패 문구 | `배너 목록을 불러오지 못했어요.` — `apps/admin/src/pages/content/banners/BannersPage.tsx:373` |
| 빈 상태 문구 | `등록된 배너가 없어요.` |

### 4.2 ON/OFF 토글 · 4.3 일괄 ON/OFF

팝업 관리의 §4.4·4.5 와 동작이 같다. 문구만 다르다.

| 자리 | 배너의 문구 | 출처 |
|---|---|---|
| 단건 성공(켬) `MSG-CONTENT-BANNERS-02` | `'{제목}' 을 켰어요.` | `apps/admin/src/pages/content/banners/BannersPage.tsx:220` |
| 단건 성공(끔) `MSG-CONTENT-BANNERS-03` | `'{제목}' 을 껐어요.` | `apps/admin/src/pages/content/banners/BannersPage.tsx:220` |
| 단건 실패 `MSG-CONTENT-BANNERS-E02` | `상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.` ('다시 시도' 가 붙는다) | `apps/admin/src/pages/content/banners/BannersPage.tsx:224-225` |
| 일괄 성공 `MSG-CONTENT-BANNERS-04` | `배너 {N}건을 {ON\|OFF} 처리했어요.` | `apps/admin/src/pages/content/banners/BannersPage.tsx:249` |
| 일괄 실패 `MSG-CONTENT-BANNERS-E03` | `배너 {총}건 중 {실패}건을 {ON\|OFF} 처리하지 못했어요.` ('다시 시도' 가 붙는다) | `apps/admin/src/pages/content/banners/BannersPage.tsx:243` |

### 4.4 정렬 순서 바꾸기 (드래그 · 이동 버튼)

FAQ 목록의 §4.5 와 **동작이 같다**([그 문서](../faq/index.md)) — 놓는 즉시 저장하고, 실패하면 되돌리고, 조건이 걸리면 손잡이가 사라진다. 다른 것만 적는다.

| 항목 | 배너의 값 |
|---|---|
| 재정렬 가능 조건 | **위치 필터가 `전체` 이고 검색어가 비어 있을 때** — `apps/admin/src/pages/content/banners/BannersPage.tsx:120`. 축이 둘뿐이라 FAQ 보다 하나 적다 |
| 성공 토스트 `MSG-CONTENT-BANNERS-01` | `정렬 순서를 변경했어요.` — `apps/admin/src/pages/content/banners/BannersPage.tsx:134` |
| 실패 토스트 `MSG-CONTENT-BANNERS-E01` | `정렬 순서를 변경하지 못했어요.` ('다시 시도' 가 붙어 같은 순서로 재시도) — `apps/admin/src/pages/content/banners/BannersPage.tsx:138` |
| 순서 계산 | 전체 순서가 1부터 다시 매겨지고, 보이지 않는 항목의 상대 순서는 보존된다 — `apps/admin/src/pages/content/banners/data-source.ts:148-158` |
| 사유 안내 | ⚠ FAQ 와 같다 — **왜 못 바꾸는지 말하지 않는다.** 손잡이와 이동 버튼이 조용히 사라진다 |

### 4.5 단건 삭제 · 4.6 일괄 삭제 · 4.7 수정 폼으로 이동

팝업 관리의 같은 기능과 동작이 같다. 문구만 다르다.

| 자리 | 배너의 문구 | 출처 |
|---|---|---|
| 단건 확인 다이얼로그 | 제목 `배너 삭제` · 본문 `'{제목}' 배너를 삭제할까요? 되돌릴 수 없어요.` · 확인 `배너 삭제` | `apps/admin/src/pages/content/banners/BannersPage.tsx:389-391` |
| 단건 성공 토스트 `MSG-CONTENT-BANNERS-05` | `배너를 삭제했어요.` (**제목이 들어가지 않는다**) | `apps/admin/src/pages/content/banners/BannersPage.tsx:192` |
| 단건 실패 배너 | `배너를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` | `apps/admin/src/pages/content/banners/BannersPage.tsx:196` |
| 일괄 확인 다이얼로그 | 제목 `배너 일괄 삭제` · 본문 `선택한 배너 {N}건을 삭제할까요? 되돌릴 수 없어요.` · 확인 `{N}건 삭제` | `apps/admin/src/pages/content/banners/BannersPage.tsx:402-404` |
| 일괄 성공 토스트 `MSG-CONTENT-BANNERS-06` | `배너 {N}건을 삭제했어요.` | `apps/admin/src/pages/content/banners/BannersPage.tsx:283` |
| 일괄 실패 배너 | `배너 {총}건 중 {실패}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` | `apps/admin/src/pages/content/banners/BannersPage.tsx:277` |
| 수정 이동 | 행의 연필 → `/content/banners/{id}/edit` | `apps/admin/src/pages/content/banners/BannersPage.tsx:344` |

## 5. 이벤트 정의

팝업 관리의 이벤트 표에 FAQ 목록의 재정렬 이벤트(드래그 시작·놓기 · 이동 버튼 · 저장 중 잠금 · 조건이 걸려 손잡이가 사라짐)를 더한 것이다. **이 화면에만 있는 이벤트는 없다.**

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 위치 파라미터 | `all`·`main`·`sub` 중 하나 | 주소를 읽을 때 | 없음 | 알 수 없는 값은 `all` 로 — `apps/admin/src/pages/content/banners/BannersPage.tsx:94-98` |
| 페이지 파라미터 | 1 이상의 정수 | 〃 | 없음 | 그 밖은 1페이지로 |
| 검색어 | 검증하지 않는다 | — | — | — |

이 화면에도 사용자에게 보이는 검증 오류는 없다.

## 7. 예외 처리

팝업 관리의 §7 과 같다. 문구만 다르며, **정렬 저장 실패**가 하나 더 있다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `등록된 배너가 없어요.` | 표 안 한 줄 | 조건을 직접 되돌린다 |
| 조회 결과를 모름 | 조회 전에는 건수를 0으로 그리지 않는다 — 요약 `불러오는 중…` · 스켈레톤 10행 | — | 기다린다 |
| 저장 실패 | 해당 없음 — 등록·수정은 폼 화면 | — | — |
| 수정 실패 | ON/OFF 변경 실패 `상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/banners/BannersPage.tsx:224` · 일괄 `배너 {총}건 중 {실패}건을 {ON\|OFF} 처리하지 못했어요.` — `:243` · **정렬 저장 실패** `정렬 순서를 변경하지 못했어요.` — `:138` | 실패 토스트(자동으로 사라지지 않는다) + '다시 시도'. 정렬은 행이 원래 자리로 되돌아간다 | 토스트의 '다시 시도' |
| 삭제 실패 | §4.5 의 표 | 다이얼로그를 닫지 않고 배너 | 확인 재클릭 |
| API 오류 | 조회면 `배너 목록을 불러오지 못했어요.` — `apps/admin/src/pages/content/banners/BannersPage.tsx:373`. 그 밖은 위 문구들 | 배너 또는 토스트 | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | 읽기 권한이 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. ⚠ 쓰기 권한이 없을 때의 문구는 없다(§9) | 읽기는 라우트 가드가 막는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인 후 이 목록 |
| 데이터 충돌 | 충돌 문구가 없다. 순서·ON/OFF 는 마지막에 쓰는 쪽이 이긴다 | 실패 문구로 뭉개진다 | 새로 조회해 확인 |
| 중복 데이터 | 해당 없음 — 이 화면은 아무것도 만들지 않는다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 파일 입력은 폼 화면에 있다 | — | — |

## 8. 화면 상태(State)

팝업 관리의 §8 에 FAQ 목록의 재정렬 상태(재정렬 가능 · 불가 · 저장 중 · 실패)를 더한 것이다. 문구만 다르다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 재정렬 가능 | 손잡이 열과 행마다 위/아래 버튼 | 이동 버튼 ○ | N | 캡션의 ` 각 행의 위/아래 버튼 또는 드래그로 정렬 순서를 바꿔요.` |
| 재정렬 불가(조건이 걸림) | 손잡이 열과 이동 버튼이 통째로 사라진다 | — | N | ⚠ 없음 — 사유를 말하지 않는다 |
| 재정렬 저장 중 | 드래그·이동 버튼이 잠긴다 | 이동 버튼 × | N | — |
| 재정렬 실패 | 행이 원래 자리로 되돌아간다 | — | N | `정렬 순서를 변경하지 못했어요.` |
| 데이터 없음(0건) | 표 안 한 줄 | 등록 ○ | N | `등록된 배너가 없어요.` |
| 읽기 전용(권한) | 읽기 권한이 없으면 `접근 권한이 없어요` 화면. 쓰기 권한만 없는 상태는 화면에 나타나지 않는다 | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `page:/content/banners` 권한을 따른다 | 〃 | 〃 | 〃 | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

ON/OFF 토글과 정렬 저장은 **수정(`update`)** 축이다.

**권한이 없을 때 화면이 어떻게 되는가** — 팝업 관리와 같다. ⚠ 쓰기 권한이 없어도 등록·연필·토글·드래그·삭제가 그대로 보이고 눌린다(`BannersPage.tsx` 에 `useRouteWritePermissions` 없음).

## 10. 화면 이동(Screen Flow)

팝업 관리의 §10 과 같은 표이며 화면 ID 만 `SCR-CONTENT-BANNERS`·`SCR-CONTENT-BANNERS-FORM` 으로 바뀐다.

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-BANNERS` | `배너 등록` 클릭 | `SCR-CONTENT-BANNERS-FORM`(등록) | N | 없음 | 없음 | 저장·취소 후 이 목록 |
| `SCR-CONTENT-BANNERS` | 행 연필 클릭 | `SCR-CONTENT-BANNERS-FORM`(수정) | N | 그 행이 삭제 중이 아님 | 배너 id | 〃 |
| `SCR-CONTENT-BANNERS` | 행 삭제 클릭 | 배너 삭제 확인 다이얼로그 | Y | 〃 | 대상 1건 | 이 목록 |
| `SCR-CONTENT-BANNERS` | 일괄 삭제 클릭 | 배너 일괄 삭제 확인 다이얼로그 | Y | 1건 이상 선택 | 선택 id 목록·건수 | 이 목록 |
| `SCR-CONTENT-BANNERS` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 목록 |

**이 화면의 결과 통지 토스트는 8건**(성공 5 · 실패 3)이고 전부 §4 에 문구 그대로 적혀 있다. 인벤토리(성공 5 · 실패 3)와 일치한다. 확인 다이얼로그는 2건으로 인벤토리의 `apps/admin/src/pages/content/banners/BannersPage.tsx:387,400` 과 일치한다.
