# 고객사

> **이 화면은 [파트너사](../partners/index.md)(`SCR-COMPANY-PARTNERS`)와 같은 화면이다.**
> 두 라우트가 한 컴포넌트를 공유하고, 주입되는 값 셋만 다르다 — 자원 이름 `clients` ·
> 엔티티 라벨 `고객사` · 데이터 소스 — `apps/admin/src/pages/company/clients/ClientsPage.tsx:8`.
>
> 그래서 이 문서는 **차이만** 적는다. 각 절의 내용은 [파트너사](../partners/index.md)의 같은 절을 그대로 따르되,
> 문구 안의 `{엔티티}` 가 `고객사` 로, 경로가 `/company/clients` 로, 권한 키가 `page:/company/clients` 로 바뀐다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 고객사 |
| 화면 ID | `SCR-COMPANY-CLIENTS` |
| 메뉴 경로 | 기업 관리 > 고객사 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 홈페이지의 고객사 로고 띠에 걸릴 항목을 모아 두고, 보일 순서와 노출 여부를 목록에서 바로 다루며, 등록·수정·삭제한다.

**업무 배경** — 파트너사와 같다. 데이터 모양(로고·이름·링크·정렬·노출)과 화면이 동일해 **한 모듈을 설정으로 공유한다** — 두 화면이 각자 표·모달·필터를 복사하면 배치가 어긋나기 때문이다 — `apps/admin/src/pages/company/logo-list/types.ts:3-5`.

**화면 설명** — 파트너사와 같다.

**주요 사용자** — 최상위 관리자 · 기업 정보를 다루는 운영자.

**사용 시나리오**

1. 새 고객사를 '고객사 추가'로 등록한다 → 목록 맨 끝에 노출 상태로 붙는다.
2. 대표 고객사를 맨 앞으로 끌어 올린다 → 놓는 즉시 저장된다.
3. 노출 계약이 끝난 고객사의 토글을 꺼 홈페이지에서만 내린다.

**선행 조건** — 로그인. 플랜 모듈 매핑에 없어 플랜 축으로 잠기지 않는다 — `apps/admin/src/shared/entitlements/module-resources.ts:64-76`.

**후행 처리** — 저장된 목록이 홈페이지의 고객사 로고 띠에 쓰인다. 홈페이지는 이 리포 밖이라 반영 경로를 코드에서 확인하지 못했다.

**관련 화면** — [파트너사](../partners/index.md)(`SCR-COMPANY-PARTNERS` — 같은 화면) · [로고 등록·수정](../../_common/pop-logo-form.md)(`POP-COMMON-LOGO-FORM`) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md). **상세 화면이 없다.**

**관련 메뉴** — 기업 관리 가지의 일곱 번째 잎 — `apps/admin/src/shared/layout/nav-config.ts:161`. 파트너사 바로 다음이다.

**관련 기능** — 파트너사와 **데이터가 섞이지 않는다** — 자원 이름이 다르므로 조회·쓰기 대상이 갈리고, 두 화면이 각자 자기 주소를 가지므로 검색어도 서로 섞이지 않는다 — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:9-10`.

**관련 API** — 목록 조회 · 등록 · 수정 · 삭제 · 순서 저장 · 노출 토글 여섯. **백엔드가 없다** — `apps/admin/src/pages/company/clients/data-source.ts:35`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/clients/ClientsPage.tsx` → `apps/admin/src/pages/company/logo-list/LogoListPage.tsx`(파트너사와 같은 모듈)

---

**⚠ 지금 코드에서 확인되는 사실** — 파트너사와 같다(§1 의 세 줄). 쓰기가 실제로 반영되고, 없는 항목에 대한 쓰기는 409 로 막히며, 쓰기 권한 게이팅이 없다 — `apps/admin/src/pages/company/logo-list/adapter.ts:40-44,52-82`.

## 2. 페이지(UI) 구성

파트너사와 **같다**(검색 · 버튼 · 요약 · 선택 바 · 목록 · 오류 여섯 영역, 페이지영역 없음). 다른 것이 없다.

## 3. UI 컴포넌트 정의

파트너사의 §3 표를 그대로 따른다. **바뀌는 것은 문구 안의 엔티티 값 하나뿐이다.**

| 자리 | 고객사에서의 값 | 출처 |
|---|---|---|
| 검색 입력 라벨 | `{엔티티} 이름 검색`(엔티티=`고객사`) | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:268` |
| 추가 버튼 | `{엔티티} 추가` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:273` |
| 전체 선택 체크박스 | `이 페이지의 {엔티티} 전체 선택` | `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:127` |
| 빈 상태 문구 | `등록된 {엔티티}가 없어요.` | `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:151` |
| 표 설명 | `{엔티티} 목록 — 체크박스로 선택, 각 행에서 노출 여부를 ON/OFF 토글하거나 수정·삭제할 수 있어요.` | `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:119-120` |
| 조회 실패 배너 | `{엔티티} 목록을 불러오지 못했어요.` + `다시 시도` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:318,324` |

열 구성(이름 · 링크 · 상태)과 행 컨트롤(체크박스 · 손잡이 · 순번 · 토글 · 이동 버튼 · 연필 · 휴지통)은 파트너사와 동일하다.

## 4. 기능 명세

파트너사의 §4.1(목록 조회) · §4.2(이름 검색) · §4.3(노출 토글) · §4.4(순서 바꾸기) · §4.5(등록·수정 팝업) · §4.6·4.7(단건·일괄 삭제)과 **동작이 같다.** 아래만 다르다.

| 항목 | 고객사의 값 |
|---|---|
| 자원 이름 | `clients` — `apps/admin/src/pages/company/clients/ClientsPage.tsx:8`(파트너사는 `partners`) |
| 엔티티 라벨 | `고객사` — 같은 줄 |
| 목록 경로 | `/company/clients` |
| 데이터 소스 | `apps/admin/src/pages/company/clients/data-source.ts` — 자기 시드로 같은 어댑터 팩토리를 부른다 |
| 새 항목의 id | 자원 이름을 접두로 붙인다 — `apps/admin/src/pages/company/logo-list/adapter.ts:56` |
| 실패 재현 스코프 | `clients` 로 갈린다 — 파트너사만, 또는 고객사만 실패시킬 수 있다 — `apps/admin/src/pages/company/logo-list/adapter.ts:49,54,62,68,74,79` |

**토스트 문구는 같은 한 벌이 만든다** — 엔티티 라벨과 항목 이름만 바뀐다.

| 토스트 | 문구 | 출처 |
|---|---|---|
| `MSG-COMPANY-CLIENTS-01` | `정렬 순서를 변경했어요.` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:143` |
| `MSG-COMPANY-CLIENTS-02` | `'{이름}'{조사} 노출해요.` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:162` |
| `MSG-COMPANY-CLIENTS-03` | `'{이름}'{조사} 숨겨요.` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:163` |
| `MSG-COMPANY-CLIENTS-04` | `'{이름}'{조사} 추가했어요.` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:258` |
| `MSG-COMPANY-CLIENTS-05` | `'{이름}'{조사} 저장했어요.` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:257` |
| `MSG-COMPANY-CLIENTS-06` | `'{이름}'{조사} 삭제했어요.` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:209` |
| `MSG-COMPANY-CLIENTS-07` | `{엔티티} {N}건을 삭제했어요.` | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:247` |
| `MSG-COMPANY-CLIENTS-E01` | `정렬 순서를 변경하지 못했어요.`('다시 시도' 가 붙는다) | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:147` |
| `MSG-COMPANY-CLIENTS-E02` | `노출 여부를 변경하지 못했어요.`('다시 시도' 가 붙는다) | `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:168` |

## 5. 이벤트 정의

파트너사의 이벤트 표와 **글자까지 같다**(진입 · 검색 · 조합 중 Enter · 체크박스 · 행 토글 · 드래그 · 이동 버튼 · 재정렬 저장 중 · 검색어가 걸림 · 추가 · 연필 · 팝업 저장 성공 · 행 삭제 · 일괄 삭제 · 삭제 확인/취소 · 조회 실패 · 다시 시도). **이 화면에만 있는 이벤트는 없다.**

## 6. Validation

파트너사와 같다 — 이 화면에는 사용자에게 보이는 검증 오류가 없고, 접어야 할 주소 파라미터도 없다(검색어 하나뿐이다).

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 검색어 | 검증하지 않는다 | — | — | — |

등록·수정의 검증은 [로고 등록·수정](../../_common/pop-logo-form.md) §6 이 갖는다.

## 7. 예외 처리

파트너사의 §7 을 그대로 따른다. 문구 안의 엔티티 값만 `고객사` 로 바뀐다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `등록된 {엔티티}가 없어요.` — `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:151` | 표 안 한 줄. 검색 때문인지 정말 비었는지 가르지 않는다 | 검색을 직접 지운다 |
| 조회 결과를 모름 | 조회 전에는 건수를 0으로 그리지 않는다 — 요약이 `불러오는 중…` 이고 표는 스켈레톤이다 | — | 기다린다 |
| 저장 실패 | 등록·수정 실패는 팝업 안에서 말한다 — [그 문서](../../_common/pop-logo-form.md) §7 | 팝업이 닫히지 않는다 | 제출 재클릭 |
| 수정 실패 | 노출 토글 실패 `노출 여부를 변경하지 못했어요.` — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:168` · 순서 저장 실패 `정렬 순서를 변경하지 못했어요.` — 같은 파일 `:147` | 실패 토스트(자동으로 사라지지 않는다) + '다시 시도' | 토스트의 '다시 시도' |
| 삭제 실패 | 단건 `삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:213` · 일괄 `{총}건 중 {실패}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — 같은 파일 `:241` | 다이얼로그를 닫지 않고 배너 | 확인 재클릭 |
| API 오류 | 조회면 `{엔티티} 목록을 불러오지 못했어요.` — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:318` | 배너 또는 토스트 | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 — `apps/admin/src/shared/query/queryClient.ts:82,108` | 〃 |
| 권한 없음 | 읽기 권한이 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. ⚠ 쓰기 권한이 없을 때의 문구는 없다(§9) | 읽기는 라우트 가드가 막는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인 후 이 목록(검색어와 함께) |
| 데이터 충돌 | 수정·토글이면 `다른 사용자가 먼저 삭제한 항목이에요.` — `apps/admin/src/pages/company/logo-list/adapter.ts:63,80` · 삭제면 `이미 삭제된 항목이에요.` — 같은 파일 `:69` | ⚠ 이 화면은 그 사유를 갈라 보여 주지 않는다 | 목록을 다시 조회 |
| 중복 데이터 | 해당 없음 — 이름 중복을 막는 규칙이 없다 | — | — |
| 파일 업로드 실패 | 이 목록에 파일 입력이 없다. 업로드 실패는 팝업이 다룬다 | — | 팝업에서 다른 파일을 고른다 |

## 8. 화면 상태(State)

파트너사의 §8 표를 그대로 따른다(최초 로딩 · 재정렬 가능 · 검색어가 걸림 · 0건 · 재조회 중 · 조회 실패 · 선택 있음 · 행 토글 중 · 재정렬 저장 중 · 삭제 중 · 삭제 실패 · 읽기 전용). **문구 안의 엔티티 값만 `고객사` 로 바뀐다.** 이 화면에만 있는 상태는 없다.

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | ○ | — | — |
| 운영자 | 역할의 `page:/company/clients` 권한을 따른다 | 〃 | 〃 | 〃 | — | 〃 | — | — |
| 뷰어 | ○ | × | × | × | — | × | — | — |
| 권한 없음 | × | × | × | × | — | × | — | — |

**파트너사와 권한 키가 다르다** — 리소스는 경로에서 파생되므로 `page:/company/clients` 와 `page:/company/partners` 는 별개다 — `apps/admin/src/shared/permissions/resources.ts:66-68`. 한쪽만 열어 줄 수 있다.

**권한이 없을 때 화면이 어떻게 되는가** — 파트너사와 같다. 읽기 권한이 없으면 `접근 권한이 없어요` 화면이 뜨고, ⚠ 쓰기 권한이 없어도 컨트롤이 그대로 보이고 눌린다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-CLIENTS` | `{엔티티} 추가` 클릭 | `POP-COMMON-LOGO-FORM`(등록) | Y | 없음 | 자원 이름 `clients` · 엔티티 라벨 `고객사` | 같은 목록 |
| `SCR-COMPANY-CLIENTS` | 행 연필 클릭 | `POP-COMMON-LOGO-FORM`(수정) | Y | 그 행이 삭제 중이 아님 | 대상 로고 1건 | 같은 목록 |
| `SCR-COMPANY-CLIENTS` | 행 삭제 클릭 | 고객사 삭제 확인 다이얼로그 | Y | 〃 | 대상 1건의 id·이름 | 같은 목록 |
| `SCR-COMPANY-CLIENTS` | 일괄 삭제 클릭 | 고객사 일괄 삭제 확인 다이얼로그 | Y | 1건 이상 선택 | 선택 id 목록·건수 | 같은 목록 |
| `SCR-COMPANY-CLIENTS` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 목록 |

**행 클릭으로 가는 상세가 없다.**

**토스트·확인 다이얼로그의 건수는 파트너사와 한 벌을 공유한다** — 인벤토리도 그것을 `pages/company/logo-list/LogoListPage.tsx` 한 줄(성공 5 · 실패 2)과 `LogoListPage.tsx:343,356` 두 다이얼로그로 세고 있어, 두 화면 몫을 따로 더하지 않는다.
