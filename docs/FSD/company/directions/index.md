# 오시는 길

> 이 화면은 [회사 정보](../profile/index.md)(`SCR-COMPANY-PROFILE`)와 **같은 껍데기**를 쓰고
> **같은 주소 부품**을 쓴다 — 목록 없음 · 카드 하나 · 바뀐 것이 있을 때만 저장 가능 ·
> 수정 권한이 없으면 화면 자체가 열리지 않음 · 읽기 전용 주소 칸 + 검색 팝업.
> 아래 각 절은 **다른 것만** 적는다. 다른 것은 입력 세 칸과 문구뿐이다.
>
> ⚠ **이 화면에는 좌표(위도·경도)도 지도도 없다.** 그 사실과 대가는 §4.4 가 적는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 오시는 길 |
| 화면 ID | `SCR-COMPANY-DIRECTIONS` |
| 메뉴 경로 | 기업 관리 > 오시는 길 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 방문자가 찾아올 수 있도록 **주소 · 상세주소 · 교통편** 세 값을 고쳐 저장한다.

**업무 배경** — 홈페이지의 '오시는 길'은 방문자가 실제로 그 자리에 도착해야 성립하는 페이지다. 그래서 두 가지가 중요하다 — ① 주소가 **우편번호 체계에 실재해야 하고**(자유 입력을 열면 찾아갈 수 없는 주소가 화면 어디에도 틀렸다는 표시 없이 뜬다), ② 주소만으로 못 찾는 것(정문 위치·주차 입구)은 **사람이 읽는 문장**으로 적을 수 있어야 한다.

**화면 설명** — 안내문 한 줄 아래 카드 하나에 주소(읽기 전용) · 상세주소 · 교통편 세 칸이 놓이고, 맨 아래에 주소 검색에 대한 안내 한 줄이 붙는다.

**주요 사용자** — 최상위 관리자 · 기업 정보를 다루는 운영자.

**사용 시나리오**

1. 사무실을 옮겨 '주소 검색'으로 새 주소를 고르고 상세주소에 층·호수를 적어 저장한다.
2. 정문이 건물 뒤편이라 그 사실을 교통편 칸에 문장으로 적는다.
3. 반쯤 고치다 다른 메뉴를 누른다 → 저장하지 않은 변경 확인이 뜬다.

**선행 조건** — 로그인 · **이 화면의 수정 권한**(없으면 화면이 열리지 않는다 — §9). 플랜 모듈 매핑에 없어 플랜 축으로 잠기지 않는다.

**후행 처리** — 저장된 세 값이 홈페이지의 오시는 길 페이지에 쓰인다. ⚠ **좌표를 내려보내지 않으므로**, 홈페이지가 지도를 그린다면 **주소 문자열로 직접 지오코딩**해야 한다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:25-26`.

**관련 화면** — [주소 검색](pop-address-search.md)(`POP-COMPANY-DIRECTIONS-ADDRESS-SEARCH`) · [회사 정보](../profile/index.md)(같은 껍데기·같은 주소 부품) · [CEO 인사말](../ceo-message/index.md) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 기업 관리 가지의 네 번째 잎 — `apps/admin/src/shared/layout/nav-config.ts:158`.

**관련 기능** — 회사 정보도 같은 주소 부품을 쓴다. **두 화면의 주소는 서로 다른 문서**이며 값이 자동으로 맞춰지지 않는다.

**관련 API** — 문서 조회 1건 · 저장 1건. **백엔드가 없다** — `apps/admin/src/pages/company/directions/data-source.ts:16`. **주소 검색은 우리 서버를 부르지 않는다** — 브라우저가 외부 스크립트를 내려받아 돌며 앱 키도 백엔드도 필요 없다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:28-29`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/directions/DirectionsPage.tsx` (껍데기 `apps/admin/src/shared/crud/DocumentFormShell.tsx` · 주소 부품 `apps/admin/src/shared/address-search/AddressField.tsx` · 검증 `validation.ts` · 상수 `types.ts`)

## 2. 페이지(UI) 구성

회사 정보와 같다(권한 없음 화면 · 안내 · 오류 · 입력 · 버튼 · 조회 실패). **더해지는 것 하나** — 입력 아래에 주소 검색 안내 한 줄이 붙는다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:185-187`.

## 3. UI 컴포넌트 정의

회사 정보와 같은 것(저장 상태 문구 · 저장 버튼 · 조회 실패 배너 · 스켈레톤 · 권한 없음 화면 · 주소 칸과 '주소 검색' 버튼의 동작)은 다시 적지 않는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 안내문 | Text | `별표(*)는 꼭 입력해야 하는 항목이에요. 주소는 '주소 검색'으로 찾아서 골라요.` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:124` | — | N | Y | — | — | — | — | 항상 | — |
| 2 | 카드 제목 | Heading(h2) | `오시는 길` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:123` | — | N | Y | — | — | — | — | 항상 | h1 페이지 제목이 없다 |
| 3 | 저장 실패 배너 | Alert(danger) | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:115` | — | N | Y | — | 숨김 | — | — | 저장 실패 | — |
| 4 | 주소 | TextField(**읽기 전용**) | `주소` — `apps/admin/src/shared/address-search/AddressField.tsx:83` | 누르면 검색 팝업이 열린다. **직접 타이핑할 수 없다** | Y | **Y** | 저장 중 또는 최초 로딩 중 | 서버 값 | `주소 검색으로 선택하세요` — `apps/admin/src/shared/address-search/AddressField.tsx:92` | 200자 — `apps/admin/src/pages/company/directions/types.ts:19` | 항상 | 힌트 `주소 칸이나 '주소 검색' 버튼을 누르면 검색창이 열려요. 층·호수는 아래 상세주소에 적어 주세요.` — `apps/admin/src/shared/address-search/AddressField.tsx:43-44` |
| 5 | 주소 검색 | Button(secondary) | `주소 검색` — `apps/admin/src/shared/address-search/AddressField.tsx:104` | 검색 팝업을 여는 정식 트리거 | N | N | 저장 중 또는 최초 로딩 중 | — | — | — | 항상 | 보조기술에 보이는 트리거는 이 버튼이다 |
| 6 | 상세주소 | TextField | `상세주소` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:145` | 건물명·층·호수 | N | N | 저장 중 또는 최초 로딩 중 | 서버 값 | `예: 예시타워 8층` — `:155` | 100자 — `apps/admin/src/pages/company/directions/types.ts:20` | 항상 | 힌트 `건물명·층·호수 등 (선택)` — `:147`. **회사 정보와 같은 길이를 쓴다** — `apps/admin/src/pages/company/profile/types.ts:29` |
| 7 | 교통편 | Textarea(5행) | `교통편` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:167` | 지하철·버스·주차·정문 위치 안내 | N | N | 저장 중 또는 최초 로딩 중 | 서버 값 | `예: 지하철 2호선 예시역 3번 출구 도보 5분` — `:177` | 1,000자 — `apps/admin/src/pages/company/directions/types.ts:21`(입력에서도 잘린다 — `:176`) | 항상 | 힌트 `지하철·버스·주차 안내 등 (선택). 정문 위치처럼 주소만으로는 찾기 어려운 안내도 여기에 적어 주세요.` — `:169`. 세로로 늘릴 수 있다 — `:52` |
| 8 | 주소 검색 안내 | Text(hint) | `주소 검색은 카카오(다음) 우편번호 서비스를 그대로 써요. 따로 설정할 것은 없어요.` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:186` | 별도 설정이 필요 없다는 사실 | N | Y | — | — | — | — | 항상 | 입력 맨 아래에 붙는다 |

**이 화면에 없는 것** — 위도·경도 입력 칸, 지도 미리보기, 지도 앱 키 안내. 셋 다 코드에 존재하지 않는다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:16-26` · `apps/admin/src/pages/company/directions/types.ts:5-9` · `apps/admin/src/shared/address-search/contract.ts:4-8`.

## 4. 기능 명세

### 4.1 문서 조회 · 4.2 저장 · 4.5 저장하지 않은 채 떠나기

회사 정보의 같은 기능과 동작이 같다. 다른 것만 적는다.

| 항목 | 오시는 길의 값 |
|---|---|
| 폼을 채우는 값 | 주소 · 상세주소 · 교통편 세 칸 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:55-59,83-86` |
| 저장 성공 | 기준선을 갱신해 저장 버튼이 다시 잠기고 토스트 `MSG-COMPANY-DIRECTIONS-01` `오시는 길을 저장했어요.` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:110-111`. 화면 이동이 없다 |
| 저장 실패 배너 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:115` |
| 조회 실패 배너 | `내용을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121-124`(공통 문장) |
| 이탈 가드 문구 | `오시는 길에 아직 저장하지 않은 내용이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:46-47` |

### 4.3 주소 고르기

회사 정보의 §4.3 과 **동작이 같다** — 세 경로(주소 칸 클릭 · Enter/Space · '주소 검색' 버튼)가 같은 팝업을 열고, 고른 표기를 존중해 저장하며, **상세주소가 비어 있을 때만** 건물명을 제안한다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:91-99`.

| 항목 | 오시는 길의 값 |
|---|---|
| 주소 칸의 DOM id | `dir-address` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:135`(회사 정보는 `profile-address`) |
| 우편번호 | 저장하지 않는다 — 어느 폼에도 칸이 없다 — `apps/admin/src/shared/address-search/contract.ts:38-39` |

### 4.4 좌표와 지도 — 지금 무엇이 없고 무엇을 잃었나

| 항목 | 내용 |
|---|---|
| 기능 목적 | 해당 없음 — **이 화면에는 좌표를 다루는 기능이 없다.** 이 절은 그 사실과 대가를 남긴다 |
| 실행 조건 | 성립하지 않는다 |
| 사용자 동작 | 없다 — 위도·경도를 입력할 칸도, 지도에서 핀을 옮길 수단도 없다 |
| 시스템 처리 | 저장 페이로드에 좌표 칸이 없다 — `apps/admin/src/pages/company/directions/types.ts:5-17` |
| 데이터 처리 | **좌표를 저장하지 않는다.** 좌표는 주소에서 파생되는 값이라, 함께 저장하면 주소를 고친 뒤 좌표가 그대로 남는 순간이 반드시 오고 그때 어느 쪽이 진실인지 알 수 없다 — `apps/admin/src/pages/company/directions/types.ts:6-9` |
| Validation | 해당 없음 |
| API 호출 여부 | N — 지오코딩도 지도 렌더도 이 앱에 없다. 그 둘만 요구하던 지도 앱 키도 함께 사라졌다 — `apps/admin/src/shared/address-search/contract.ts:4-8` |
| 성공 처리 | 해당 없음 |
| 실패 처리 | 해당 없음. 예전에 키가 없는 동안 떠 있던 '키를 등록하라' 배너도 없다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:20-21` |
| 예외 처리 | ⚠ **잃은 것이 있다.** 지오코딩이 주는 점은 '주소의 대표점'이라 실제 출입구·주차 입구와 다를 수 있는데, 그 차이를 표현할 수단(핀 미세조정)이 사라졌다. 운영자가 받아들인 손실이며, 대신 그 안내는 **교통편 칸에 사람이 읽는 문장으로** 적는다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:22-24` |
| 화면 변경 사항 | 해당 없음 |
| 후속 동작 | 홈페이지가 지도를 그린다면 주소 문자열로 직접 지오코딩해야 한다 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

회사 정보의 이벤트 표와 같다(진입 · 권한 없음 · 조회 실패 · 다시 시도 · 값 입력 · 주소 칸 클릭·Enter·Space · 주소 검색 클릭 · 주소 선택 · 제출 · 검증 실패 · 저장 중 · 저장 성공/실패 · dirty 이탈). **다른 것 하나** — 파일 선택·드롭 이벤트가 없다(이 화면에 이미지 입력이 없다).

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 주소 | 공백만이면 안 된다 | 제출 시 | `주소를 입력하세요.` — `apps/admin/src/shared/crud/validation.ts:21-23` 의 규칙에 `주소` 라벨이 들어간 값 | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 주소 | 200자 이하 | 제출 시 | `주소는 200자를 넘을 수 없어요.` — `apps/admin/src/pages/company/directions/validation.ts:24-26` 의 규칙 | 〃 |
| 상세주소 | **선택** — 100자 이하 | 제출 시 | `상세주소는 100자를 넘을 수 없어요.` — `apps/admin/src/pages/company/directions/validation.ts:9-14,18` | 〃 |
| 교통편 | **선택** — 1,000자 이하 | 제출 시 | `교통편은 1000자를 넘을 수 없어요.` — `apps/admin/src/pages/company/directions/validation.ts:9-14,19` | 〃 (입력 자체도 1,000자에서 막힌다) |
| 좌표 | 해당 없음 — 칸이 없다 | — | — | — |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/company/directions/validation.ts`. 선택 항목의 길이 규칙은 이 파일이 자기 조각으로 갖는다 — `apps/admin/src/pages/company/directions/validation.ts:9-14`.

## 7. 예외 처리

회사 정보의 §7 과 같다(같은 껍데기·같은 한계). 문구와 이 화면 고유의 상황만 적는다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 해당 없음 — 문서가 언제나 한 건이다. 조회 실패는 아래 'API 오류' | — | — |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:115` | 화면에 남고 배너 · 입력 유지 | 저장 재클릭 |
| 수정 실패 | 저장 실패와 같다 — 이 화면의 저장은 언제나 수정이다 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 삭제 기능이 없다 | — | — |
| API 오류 | 조회면 `내용을 불러오지 못했어요.` — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121`. 저장이면 위 문구 | 배너 | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다. **주소 검색 스크립트를 못 받는 경우는 팝업이 따로 말한다** — [그 문서](pop-address-search.md) §7 | 자동 재시도 없음 | 다시 시도 |
| 권한 없음 | 화면 전체가 `접근 권한이 없어요` 로 바뀐다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73` | 폼을 그리지 않는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | ⚠ 충돌 처리가 없다 — 마지막에 저장한 쪽이 이긴다 | 배너도 뜨지 않는다 | 새로고침해 최신 값 확인 |
| 중복 데이터 | 해당 없음 — 문서가 한 건이다 | — | — |
| 파일 업로드 실패 | 해당 없음 — **이 화면에 파일 입력이 없다** | — | — |

## 8. 화면 상태(State)

회사 정보의 §8 과 같다. 채워지는 칸이 셋이라는 것만 다르다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 카드 안 스켈레톤 4행 · 입력 잠금 | 저장 × | Y | 안내문 |
| 데이터 있음(바뀐 것 없음) | 세 칸이 서버 값으로 채워져 있다 | **저장 ×** | N | `변경 사항이 없어요.` |
| 데이터 있음(바뀐 것 있음) | 고친 값이 그대로 보인다 | 저장 ○ | N | `저장하지 않은 변경 사항이 있어요.` |
| 데이터 없음 | 성립하지 않는다 — 값이 빈 문자열이면 주소 칸에 `주소 검색으로 선택하세요` 가 보인다 | 저장 × | N | `변경 사항이 없어요.` |
| 조회 실패 | 폼이 사라지고 배너 하나 | 다시 시도 ○ | N | `내용을 불러오지 못했어요.` |
| 저장 중 | 입력과 저장이 잠기고 라벨이 `저장 중…` | 저장 × | Y | `저장하는 중이에요…` |
| 저장 실패 | 카드 맨 위 배너 · 입력 유지 | 저장 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 저장 ○ | N | §6 의 해당 문구 |
| 읽기 전용(권한) | **폼이 열리지 않는다** — 화면 전체가 `접근 권한이 없어요` | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | — | ○ | — | — | — | — | — |
| 운영자 | 역할의 `page:/company/directions` 권한을 따른다 | — | 〃 | — | — | — | — | — |
| 뷰어 | 화면이 열리지 않는다 | — | × | — | — | — | — | — |
| 권한 없음 | × | — | × | — | — | — | — | — |

업로드 축이 없다 — 이 화면에 파일 입력이 없다.

**권한이 없을 때 화면이 어떻게 되는가** — 회사 정보와 같다. ⚠ **수정 권한이 없으면 조회조차 할 수 없다.**

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-DIRECTIONS` | 주소 칸 클릭·Enter·Space · '주소 검색' 클릭 | `POP-COMPANY-DIRECTIONS-ADDRESS-SEARCH` | Y | 저장 중·로딩 중이 아님 | 없음 | 이 화면(고른 주소가 칸에 들어온다) |
| `SCR-COMPANY-DIRECTIONS` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=이 화면 |
| `SCR-COMPANY-DIRECTIONS` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-COMPANY-DIRECTIONS` | 수정 권한 없이 진입 | `접근 권한이 없어요` 화면 | N | 수정 권한 없음 | 없음 | 사이드바로 다른 메뉴 |
| `SCR-COMPANY-DIRECTIONS` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 화면 |

**저장에 성공해도 화면이 바뀌지 않는다.**

**이 화면의 결과 통지 토스트는 1건**(`MSG-COMPANY-DIRECTIONS-01`)이고 §4 의 표에 문구 그대로 적혀 있다. 인벤토리(성공 1 · 실패 0)와 일치한다. 화면 고유 확인 다이얼로그는 0건이다.
