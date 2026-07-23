# 팝업 관리

> 이 화면은 [공지사항 목록](../notices/index.md)(`SCR-CONTENT-NOTICES`)과 **같은 골격**이다 —
> 검색 · 등록 · 선택 바 · 표 · 페이지네이션 · 조회 실패 배너 · 삭제 확인 둘.
> 아래 각 절은 **다른 것만** 적는다. 다른 것은 셋이다: **왼쪽 필터가 없고 툴바의 세그먼트 필터가
> 그 자리를 대신한다** · **행에서 바로 켜고 끄는 ON/OFF 토글(일괄 포함)** · **행이 상세로 가지 않는다**
> (상세 화면이 없다 — 목록 행이 곧 요약이다 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:4`).
>
> [배너 관리](../banners/index.md)는 이 화면과 다시 한 번 같은 형태다 — 그쪽 문서가 이 화면과의 차이만 적는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 팝업 관리 |
| 화면 ID | `SCR-CONTENT-POPUPS` |
| 메뉴 경로 | 콘텐츠 관리 > 팝업 관리 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 홈페이지에 뜨는 팝업을 찾고, 켜고 끄고, 지운다. 등록·수정은 별도 폼 화면이 맡는다.

**업무 배경** — 팝업은 사고가 나면 **즉시 내려야 하는** 자산이다. 잘못된 안내가 떠 있는 동안 방문자 전원이 그것을 본다. 그래서 이 화면의 중심은 목록이 아니라 **ON/OFF 를 한 번에 끄는 경로**다.

**화면 설명** — 툴바 왼쪽에 검색과 ON/OFF 세그먼트 필터, 오른쪽에 '팝업 등록'. 아래에 표와 페이지네이션이 온다. 각 행에는 노출 토글이 있다.

**주요 사용자** — 최상위 관리자 · 콘텐츠를 다루는 운영자.

**사용 시나리오**

1. 잘못 올라간 팝업을 찾아 행의 토글을 끈다 → 즉시 저장되고 성공 토스트가 뜬다.
2. 'OFF' 만 걸어 놓고 지난 팝업을 하나씩 정리한다 → 수정 폼에 갔다 돌아와도 그 필터가 살아 있다.
3. 종료된 이벤트 팝업 여러 건을 체크해 한 번에 지운다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈(`cms.pages`) — `apps/admin/src/shared/entitlements/module-resources.ts:68`.

**후행 처리** — ON/OFF 는 홈페이지 노출을 정한다. 끄면 **기간 안이라도 노출되지 않는다** — `apps/admin/src/pages/content/popups/types.ts:30`. 홈페이지는 이 리포 밖이라 반영 경로를 코드에서 확인하지 못했다.

**관련 화면** — [팝업 등록·수정](form.md)(`SCR-CONTENT-POPUPS-FORM`) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md). **상세 화면이 없다.**

**관련 메뉴** — 콘텐츠 관리 가지의 네 번째 잎 — `apps/admin/src/shared/layout/nav-config.ts:147`.

**관련 기능** — 없음 — 다른 화면의 값이 이 목록을 바꾸지 않는다.

**관련 API** — 목록 조회 · 단건 삭제 · ON/OFF 변경 셋. **백엔드가 없다** — `apps/admin/src/pages/content/popups/data-source.ts:72`(목록) · `:161`(삭제) · `:117`(ON/OFF).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/popups/PopupsPage.tsx` (표 `components/PopupsTable.tsx` · 조회 `queries.ts` · 데이터 `data-source.ts` · 타입 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 등록·수정·삭제는 픽스처를 바꾸지 않고 성공만 돌려준다(`apps/admin/src/pages/content/popups/data-source.ts:142-164`). **ON/OFF 변경은 실제로 픽스처를 바꾼다**(`:117-126`). 쓰기 권한 게이팅은 없다(§9).

## 2. 페이지(UI) 구성

공지사항 목록과 같되 **왼쪽 필터영역이 없다.** 그 자리를 툴바 안의 세그먼트 컨트롤이 대신한다 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:272-277`.

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 검색영역(툴바 왼쪽) | 제목으로 좁힌다 | 항상 | 전체 | 불가 | 표시 |
| 필터영역(툴바 왼쪽) | 전체 · ON · OFF 세 갈래 | 항상 | 전체 | 불가 | 표시 |
| 버튼영역(툴바 오른쪽) | 팝업 등록 | 항상 | 전체 | 불가 | 표시 |
| 선택 바 | 일괄 ON · 일괄 OFF · 일괄 삭제 **세 버튼** | 1건 이상 선택 | 전체 | 불가 | 숨김 |
| 요약 · 목록 · 페이지 · 오류 | 공지사항 목록과 같다 | 〃 | 전체 | 불가 | 〃 |

## 3. UI 컴포넌트 정의

공지사항 목록과 같은 것(검색 입력 · 요약 건수 · 체크박스 · 순번 · 스켈레톤 · 페이지네이션 · 조회 실패 배너의 구조)은 다시 적지 않는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 검색 입력 | SearchField | `팝업 제목 검색` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:269` | 제목에서 찾는다 | N | N | 없음 | 주소의 `q` | 없음 | — | 항상 | — |
| 2 | 상태 필터 | SegmentedControl | 보조기술 이름 `팝업 상태 필터` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:275` | 전체 · ON · OFF — `apps/admin/src/pages/content/popups/types.ts:43-47` | N | N | 없음 | `전체` | — | — | 항상 | 왼쪽 필터 패널이 아니라 툴바 안에 있다 |
| 3 | 팝업 등록 | Button(primary) | `팝업 등록` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:281` | 등록 폼으로 이동 | N | N | 없음 | — | — | — | 항상 | ⚠ 권한과 무관하게 보인다(§9) |
| 4 | 일괄 ON | Button(secondary) | `일괄 ON` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:300` | 선택한 팝업을 한 번에 켠다 | N | N | 일괄 ON/OFF 요청 중 | — | — | — | 선택 바 안 | — |
| 5 | 일괄 OFF | Button(secondary) | `일괄 OFF` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:307` | 선택한 팝업을 한 번에 끈다 | N | N | 〃 | — | — | — | 〃 | — |
| 6 | 일괄 삭제 | Button(danger) | `선택 {N}건 삭제` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:310` | — | N | N | 일괄 삭제 요청 중 | — | — | — | 〃 | — |
| 7 | 제목 | 표 셀 | 열 머리 `제목` — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:26` | **링크가 아니다** — 상세 화면이 없다 | N | Y | — | — | — | — | 행마다 | 행 클릭으로도 이동하지 않는다 |
| 8 | 위치 | 표 셀 | 열 머리 `위치` | `메인 홈` · `이벤트 페이지` · `전체 페이지` — `apps/admin/src/pages/content/popups/types.ts:9-13` | N | Y | — | — | — | — | 행마다 | — |
| 9 | 노출 기간 | 표 셀 | 열 머리 `노출 기간` | `{시작} ~ {종료}` — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:135` | N | Y | — | — | — | — | 행마다 | 날짜만 다룬다(시각이 없다) |
| 10 | 상태 토글 | ToggleSwitch | 보조기술 이름 `{제목} 노출 여부` — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:139` | 목록에서 바로 켜고 끈다 | N | N | 그 행이 토글 요청 중일 때 | 데이터의 값 | — | — | 행마다 | 열 머리는 `상태` |
| 11 | 우선순위 | 표 셀(수치) | 열 머리 `우선순위` | 작을수록 먼저 뜬다 — `apps/admin/src/pages/content/popups/types.ts:32-33` | N | Y | — | — | — | — | 행마다 | **드래그로 바꿀 수 없다** — 폼의 숫자 칸으로만 바꾼다 |
| 12 | 행 수정 | IconButton(행 액션) | 공통 `RowActions` 가 제목으로 이름을 만든다 — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:146-151` | 수정 폼으로 이동 | N | N | 그 행이 삭제 요청 중 | — | — | — | 행마다 | 상세가 없어 **행 액션에 수정이 있다**(공지·FAQ 는 삭제만 있다) |
| 13 | 행 삭제 | IconButton(행 액션) | 〃 | 확인 다이얼로그를 연다 | N | N | 〃 | — | — | — | 행마다 | — |
| 14 | 빈 상태 문구 | Text | `등록된 팝업이 없어요.` — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:120` | 0행일 때 | N | Y | — | — | — | — | 0행 | 검색·필터로 0건이 되어도 같은 문장이다 |
| 15 | 표 설명 | caption(보조기술 전용) | `팝업 목록 — 체크박스로 선택하고 수정/삭제 버튼으로 각 팝업을 관리해요.` — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:90-91` | — | N | Y | — | — | — | — | 항상 | 행 클릭 이동을 말하지 않는다(없기 때문이다) |
| 16 | 조회 실패 배너 | Alert(danger) + Button | `팝업 목록을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:343,349` | — | N | Y | — | 숨김 | — | — | 조회 실패 | — |
| 17 | 페이지네이션 | Pagination | `팝업 페이지` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:337` | 한 페이지 10건 — `apps/admin/src/pages/content/popups/types.ts:54` | N | N | — | 1페이지 | — | — | 항상 | — |

## 4. 기능 명세

### 4.1 목록 조회 · 4.2 상태 필터 · 4.3 제목 검색

공지사항 목록의 같은 기능과 동작이 같다. 다른 것만 적는다.

| 항목 | 차이 |
|---|---|
| 주소 파라미터 | `enabled` · `q` · `page` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:42` |
| 필터 축 | 하나뿐이다(ON/OFF). 분류 축이 없다 |
| 배지 건수 | **없다** — 세그먼트 컨트롤은 건수를 그리지 않는다 |
| 조회 실패 문구 | `팝업 목록을 불러오지 못했어요.` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:343` |
| 빈 상태 문구 | `등록된 팝업이 없어요.` — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:120` |

### 4.4 ON/OFF 토글 (단건)

FAQ 목록의 노출 토글과 **동작이 같다**([그 문서](../faq/index.md) §4.4). 문구만 다르다.

| 자리 | 팝업의 문구 | 출처 |
|---|---|---|
| 성공(켬) `MSG-CONTENT-POPUPS-01` | `'{제목}' 을 켰어요.` | `apps/admin/src/pages/content/popups/PopupsPage.tsx:193` |
| 성공(끔) `MSG-CONTENT-POPUPS-02` | `'{제목}' 을 껐어요.` | `apps/admin/src/pages/content/popups/PopupsPage.tsx:193` |
| 실패 `MSG-CONTENT-POPUPS-E01` | `상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.` ('다시 시도' 가 붙는다) | `apps/admin/src/pages/content/popups/PopupsPage.tsx:197-198` |

### 4.5 일괄 ON · 일괄 OFF

FAQ 목록의 일괄 노출·숨김과 **동작이 같다**([그 문서](../faq/index.md) §4.8) — 확인 다이얼로그를 거치지 않는 것까지 같다. 문구만 다르다.

| 자리 | 팝업의 문구 | 출처 |
|---|---|---|
| 성공 `MSG-CONTENT-POPUPS-03` | `팝업 {N}건을 {ON\|OFF} 처리했어요.` | `apps/admin/src/pages/content/popups/PopupsPage.tsx:222` |
| 실패 `MSG-CONTENT-POPUPS-E02` | `팝업 {총}건 중 {실패}건을 {ON\|OFF} 처리하지 못했어요.` ('다시 시도' 가 붙는다) | `apps/admin/src/pages/content/popups/PopupsPage.tsx:216` |

### 4.6 단건 삭제 · 4.7 일괄 삭제

공지사항 목록의 4.4·4.5 와 동작이 같다. 문구만 다르다.

| 자리 | 팝업의 문구 | 출처 |
|---|---|---|
| 단건 확인 다이얼로그 | 제목 `팝업 삭제` · 본문 `'{제목}' 팝업을 삭제할까요? 되돌릴 수 없어요.` · 확인 `팝업 삭제` | `apps/admin/src/pages/content/popups/PopupsPage.tsx:359-361` |
| 단건 성공 토스트 `MSG-CONTENT-POPUPS-04` | `팝업을 삭제했어요.` (**제목이 들어가지 않는다**) | `apps/admin/src/pages/content/popups/PopupsPage.tsx:165` |
| 단건 실패 배너 | `팝업을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` | `apps/admin/src/pages/content/popups/PopupsPage.tsx:169` |
| 일괄 확인 다이얼로그 | 제목 `팝업 일괄 삭제` · 본문 `선택한 팝업 {N}건을 삭제할까요? 되돌릴 수 없어요.` · 확인 `{N}건 삭제` | `apps/admin/src/pages/content/popups/PopupsPage.tsx:372-374` |
| 일괄 성공 토스트 `MSG-CONTENT-POPUPS-05` | `팝업 {N}건을 삭제했어요.` | `apps/admin/src/pages/content/popups/PopupsPage.tsx:256` |
| 일괄 실패 배너 | `팝업 {총}건 중 {실패}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` | `apps/admin/src/pages/content/popups/PopupsPage.tsx:250` |

### 4.8 수정 폼으로 이동

| 항목 | 내용 |
|---|---|
| 기능 목적 | 팝업 한 건을 고치러 간다 |
| 실행 조건 | 그 행이 삭제 요청 중이 아닐 때 |
| 사용자 동작 | 행의 연필 클릭 |
| 시스템 처리 | `/content/popups/{id}/edit` 로 이동한다 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:317` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N — 도착한 폼이 자기 조회를 한다 |
| 성공 처리 | 폼이 기존 값으로 채워져 열린다 |
| 실패 처리 | 이동이 실패하는 경로가 코드에 없다 |
| 예외 처리 | **행 클릭으로는 이동하지 않는다** — 이 표는 행 이동을 배선하지 않는다 |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 폼에서 저장하면 **이 목록으로** 돌아온다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:191` |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

공지사항 목록의 이벤트 표를 따르되 **행 클릭 → 상세 이동이 없다.** 더해지는 이벤트는 FAQ 목록의 토글·일괄 토글과 같다(문구만 다르다).

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 세그먼트 필터 클릭 | 전체·ON·OFF | 주소 갱신 · 1페이지로 · 선택 해제 · 재조회 | 필터영역 | 좁혀진 목록 |
| 행 토글 클릭 | 행의 토글 | 그 행만 잠그고 요청 1건 | 상태 토글 | 전환 또는 실패 토스트 |
| 일괄 ON·OFF 클릭 | 선택 바 버튼 | 확인 없이 즉시 실행 | 선택 바 | 토스트 |
| 행 연필 클릭 | 행 액션 | 수정 폼으로 이동 | — | `SCR-CONTENT-POPUPS-FORM` |
| 행 클릭 | 표의 행 | **아무 일도 하지 않는다** | 목록영역 | 변화 없음 |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 상태 파라미터 | `all`·`on`·`off` 중 하나 | 주소를 읽을 때 | 없음 | 알 수 없는 값은 `all` 로 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:93-97` |
| 페이지 파라미터 | 1 이상의 정수 | 〃 | 없음 | 그 밖은 1페이지로 |
| 검색어 | 검증하지 않는다 | — | — | — |

이 화면에도 사용자에게 보이는 검증 오류는 없다.

## 7. 예외 처리

공지사항 목록의 §7 을 그대로 따른다. 문구와 이 화면 고유의 실패만 적는다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `등록된 팝업이 없어요.` — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:120` | 표 안 한 줄 | 조건을 직접 되돌린다(전용 컨트롤이 없다) |
| 조회 결과를 모름 | 조회 전에는 건수를 0으로 그리지 않는다 — 요약 `불러오는 중…` · 스켈레톤 10행 | — | 기다린다 |
| 저장 실패 | 해당 없음 — 등록·수정은 폼 화면 | — | — |
| 수정 실패 | **ON/OFF 변경 실패**가 이 화면의 수정 실패다: `상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:197`. 일괄이면 `팝업 {총}건 중 {실패}건을 {ON\|OFF} 처리하지 못했어요.` — `:216` | 실패 토스트(자동으로 사라지지 않는다) + '다시 시도' | 토스트의 '다시 시도' |
| 삭제 실패 | 단건·일괄 문구는 §4.6·4.7 의 표 | 다이얼로그를 닫지 않고 배너 | 확인 재클릭 |
| API 오류 | 조회면 `팝업 목록을 불러오지 못했어요.` — `apps/admin/src/pages/content/popups/PopupsPage.tsx:343`. 그 밖은 위 문구들 | 배너 또는 토스트 | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | 읽기 권한이 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. ⚠ 쓰기 권한이 없을 때의 문구는 없다(§9) | 읽기는 라우트 가드가 막는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인 후 이 목록 |
| 데이터 충돌 | 충돌 문구가 없다. ON/OFF 는 마지막에 쓰는 쪽이 이긴다 | 실패 문구로 뭉개진다 | 새로 조회해 확인 |
| 중복 데이터 | 해당 없음 — 이 화면은 아무것도 만들지 않는다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 파일 입력은 폼 화면에 있다 | — | — |

## 8. 화면 상태(State)

공지사항 목록의 §8 을 따른다. 더해지는 상태만 적는다(FAQ 목록의 토글 상태와 같다).

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 행 토글 중 | 그 행의 토글만 잠긴다 | 다른 행 ○ | N | — |
| 일괄 ON/OFF 중 | 선택 바의 두 버튼이 잠긴다 | 일괄 ON × · 일괄 OFF × · 일괄 삭제 ○ | N | — |
| 데이터 없음(0건) | 표 안 한 줄 | 등록 ○ | N | `등록된 팝업이 없어요.` |
| 읽기 전용(권한) | 읽기 권한이 없으면 `접근 권한이 없어요` 화면. 쓰기 권한만 없는 상태는 화면에 나타나지 않는다 | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `page:/content/popups` 권한을 따른다 | 〃 | 〃 | 〃 | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

ON/OFF 토글은 **수정(`update`)** 축이다.

**권한이 없을 때 화면이 어떻게 되는가** — 공지사항 목록과 같다. 읽기 권한이 없으면 `접근 권한이 없어요` 화면이 뜨고, ⚠ 쓰기 권한이 없어도 등록·연필·토글·삭제가 그대로 보이고 눌린다(`PopupsPage.tsx` 에 `useRouteWritePermissions` 없음).

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-POPUPS` | `팝업 등록` 클릭 | `SCR-CONTENT-POPUPS-FORM`(등록) | N | 없음 | 없음 | 저장·취소 후 이 목록 |
| `SCR-CONTENT-POPUPS` | 행 연필 클릭 | `SCR-CONTENT-POPUPS-FORM`(수정) | N | 그 행이 삭제 중이 아님 | 팝업 id | 〃 |
| `SCR-CONTENT-POPUPS` | 행 삭제 클릭 | 팝업 삭제 확인 다이얼로그 | Y | 〃 | 대상 1건 | 이 목록 |
| `SCR-CONTENT-POPUPS` | 일괄 삭제 클릭 | 팝업 일괄 삭제 확인 다이얼로그 | Y | 1건 이상 선택 | 선택 id 목록·건수 | 이 목록 |
| `SCR-CONTENT-POPUPS` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 목록 |

**행 클릭으로 가는 상세가 없다.** 일괄 ON/OFF 는 확인 다이얼로그를 거치지 않는다.

**이 화면의 결과 통지 토스트는 6건**(성공 4 · 실패 2)이고 전부 §4 에 문구 그대로 적혀 있다. 인벤토리(성공 4 · 실패 2)와 일치한다. 확인 다이얼로그는 2건으로 인벤토리의 `apps/admin/src/pages/content/popups/PopupsPage.tsx:357,370` 과 일치한다.
