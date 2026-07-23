# 채용 공고

> 이 화면은 [연혁](../history/index.md)(`SCR-COMPANY-HISTORY`)과 **같은 공용 목록 껍데기**를 쓴다 —
> 알림 영역 · 요약 · 선택 바 · 표 · 조회 실패 배너 · 공통 삭제 확인 둘 · 권한에 따라 사라지는 컨트롤.
> 아래 각 절은 **다른 것만** 적는다. 다른 것은 셋이다: **검색 + 3축 필터(주소가 소유)** ·
> **행을 누르면 수정 폼으로 간다** · **상태 열이 저장값이 아니라 마감일과 오늘의 비교에서 나온다**(§4.3).

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 채용 공고 |
| 화면 ID | `SCR-COMPANY-CAREERS` |
| 메뉴 경로 | 기업 관리 > 채용 공고 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 홈페이지에 걸리는 채용 공고를 직무·고용형태·상태로 좁혀 훑고, 등록·수정·삭제한다.

**업무 배경** — 공고는 마감이 있다. 그런데 **마감일이 지나는 순간은 아무도 로그인해 있지 않은 새벽 0시**다. 상태를 컬럼으로 저장하면 그것을 바꿔 줄 배치가 필요해지고, 배치가 하루 실패하면 지난 공고가 '모집 중'으로 남아 지원서를 계속 받는다. 그래서 마감은 **저장하지 않고 계산한다** — `apps/admin/src/pages/company/careers/types.ts:3-8`.

**화면 설명** — 툴바 왼쪽에 검색과 select 세 개(직무·고용형태·상태), 오른쪽에 '채용 공고 등록'. 그 아래 요약 · (선택이 있으면) 선택 바 · 표가 온다. 페이지네이션이 없다.

**주요 사용자** — 최상위 관리자 · 채용을 담당하는 운영자.

**사용 시나리오**

1. '개발 · 정규직 · 모집 중'을 걸어 지금 열려 있는 공고만 본다.
2. 마감일이 지난 공고를 확인한다 → 아무도 손대지 않았는데 상태가 `마감`으로 보인다.
3. 작성 중인 공고를 비공개로 저장해 두었다가 나중에 열어 공개로 바꾼다.

**선행 조건** — 로그인 · **플랜 모듈 `cms.pages`**. 채용 공고는 기업 관리 가지에 있지만 **홈페이지 게시판이라 CMS 단위로 팔린다** — `apps/admin/src/shared/entitlements/module-resources.ts:75-76`. 기업 관리의 다른 여덟 잎은 이 매핑에 없다.

**후행 처리** — 공개된 공고가 홈페이지 채용 페이지에 걸린다. 홈페이지는 이 리포 밖이라 반영 경로를 코드에서 확인하지 못했다.

**관련 화면** — [채용 공고 등록·수정](form.md)(`SCR-COMPANY-CAREERS-FORM`) · [연혁](../history/index.md)(같은 껍데기) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md). **상세 화면이 없다.**

**관련 메뉴** — 기업 관리 가지의 아홉 번째(마지막) 잎 — `apps/admin/src/shared/layout/nav-config.ts:163`.

**관련 기능** — 없음. ⚠ **지원 폼을 만드는 화면이 없다** — '지원 폼' 선택지는 폼 관리 화면과 함께 걷혔다([폼 문서](form.md) §4.4).

**관련 API** — 목록 조회 1건 · 단건 삭제 1건. **백엔드가 없다** — `apps/admin/src/pages/company/careers/data-source.ts:80`. 그 주석이 계약도 함께 적는다: **마감 여부는 응답에 없다 — 서버도 저장하지 않는다** — `apps/admin/src/pages/company/careers/data-source.ts:81`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/careers/CareersListPage.tsx` (껍데기 `apps/admin/src/shared/crud/CrudListShell.tsx` · 순수 규칙 `apps/admin/src/pages/company/careers/types.ts` · 데이터 `apps/admin/src/pages/company/careers/data-source.ts`)

## 2. 페이지(UI) 구성

연혁 목록과 같되 **툴바 왼쪽에 검색과 필터 세 개가 더 있다** — `apps/admin/src/pages/company/careers/CareersListPage.tsx:152-208`.

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 알림영역(보조기술 전용) | 목록 상태를 한 줄로 읽어 준다 | 항상(비어 있어도 DOM 에 남는다) | 보조기술 | 불가 | 화면에는 보이지 않음 |
| 검색·필터영역(툴바 왼쪽) | 제목·근무지 검색 + 직무 · 고용형태 · 상태 세 축(AND) | 항상 | 전체 | 불가 | 표시 |
| 버튼영역(툴바 오른쪽) | 채용 공고 등록 | **등록 권한이 있을 때만** — `apps/admin/src/pages/company/careers/CareersListPage.tsx:211` | 권한자 | 불가 | 표시 |
| 요약영역 | 건수 · 재조회 중 표시 · 선택 건수 | 조회 실패가 아닐 때 | 전체 | 불가 | 표시 |
| 선택 바 | 일괄 삭제 | **삭제 권한이 있고** 1건 이상 선택했을 때 — `apps/admin/src/shared/crud/CrudListShell.tsx:178` | 권한자 | 불가 | 숨김 |
| 목록영역 | 채용 공고 표(가로 스크롤 가능) | 조회 실패가 아닐 때 | 전체 | 불가 | 표시 |
| 오류영역 | 조회 실패 배너 + 다시 시도 | 조회 실패 | 전체 | 불가 | 숨김 |

**왼쪽 필터 패널도 페이지네이션도 없다.**

## 3. UI 컴포넌트 정의

연혁 목록과 같은 것(라이브 영역 · 건수 표시 · 선택 체크박스 · 순번 · 일괄 삭제 버튼 · 행 액션 둘 · 조회 실패 배너의 구조)은 다시 적지 않는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 검색 입력 | SearchField | `공고 제목·근무지 검색` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:156` | **제목과 근무지 두 곳**에서 찾는다 — `apps/admin/src/pages/company/careers/types.ts:217-223` | N | N | 없음 | 주소의 `q` | `공고 제목 · 근무지` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:157` | — | 항상 | 한글 조합 중에는 조회하지 않는다 — `apps/admin/src/shared/crud/useListState.ts:49-54` |
| 2 | 직무 필터 | SelectField | 보조기술 이름 `직무 필터` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:162` | 첫 항목 `전체 직무` + 기획·디자인·개발·영업·마케팅·경영지원 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:168` · `apps/admin/src/pages/company/careers/types.ts:26-33` | N | N | 없음 | `전체 직무` | — | — | 항상 | 주소의 `job` 이 소유한다 |
| 3 | 고용형태 필터 | SelectField | 보조기술 이름 `고용형태 필터` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:179` | 첫 항목 `전체 고용형태` + 정규직·계약직·인턴·시간제 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:184` · `apps/admin/src/pages/company/careers/types.ts:38-43` | N | N | 없음 | `전체 고용형태` | — | — | 항상 | 주소의 `employment` 가 소유한다 |
| 4 | 상태 필터 | SelectField | 보조기술 이름 `상태 필터` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:195` | 첫 항목 `전체 상태` + `상시 채용`·`모집 중`·`마감`·`비공개` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:200` · `apps/admin/src/pages/company/careers/types.ts:123-128` | N | N | 없음 | `전체 상태` | — | — | 항상 | **저장된 상태가 아니라 파생값과 비교한다**(§4.3) |
| 5 | 채용 공고 등록 | Button(primary) | `채용 공고 등록` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:214` | 등록 폼으로 이동 | N | N | 없음 | — | — | — | **등록 권한이 있을 때만 존재한다** | 비활성이 아니라 사라진다 |
| 6 | 공고 제목 | 표 셀 | 열 머리 `공고 제목` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:131` | 공고의 이름 | N | Y | — | — | — | — | 행마다 | 삭제 확인 다이얼로그의 항목 이름이기도 하다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:85` |
| 7 | 직무 | 표 셀 | 열 머리 `직무` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:132` | 라벨. 모르는 값이면 저장된 값을 그대로 — `apps/admin/src/pages/company/careers/types.ts:47-49` | N | Y | — | — | — | — | 행마다 | — |
| 8 | 고용형태 | 표 셀 | 열 머리 `고용형태` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:135` | 〃 — `apps/admin/src/pages/company/careers/types.ts:51-53` | N | Y | — | — | — | — | 행마다 | — |
| 9 | 근무지 | 표 셀 | 열 머리 `근무지` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:138` | `서울 성동구` 처럼 사람이 읽는 문자열. 원격이면 `원격` — `apps/admin/src/pages/company/careers/types.ts:83` | N | Y | — | — | — | — | 행마다 | 검색 대상이다 |
| 10 | 마감일 | 표 셀 | 열 머리 `마감일` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:139` | 날짜가 있으면 그대로, 없으면 `상시 채용` — `apps/admin/src/pages/company/careers/types.ts:143-146` | N | Y | — | — | — | — | 행마다 | **빈 칸이 아니라 문장으로** 말한다 |
| 11 | 상태 | StatusBadge | 열 머리 `상태` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:141` | `비공개`(중립) · `상시 채용`(정보) · `모집 중`(성공) · `마감`(경고) — `apps/admin/src/pages/company/careers/types.ts:123-141` | N | Y | — | — | — | — | 행마다 | **저장값이 아니라 파생값이다**(§4.3) |
| 12 | 빈 상태 | Empty | 검색 때문이면 `조건에 맞는 {엔티티}{조사} 없어요` + `검색 지우기` · 필터 때문이면 `필터에 맞는 {엔티티}{조사} 없어요` + `필터 초기화` · 아니면 `{동사}된 {엔티티}{조사} 없어요` — `packages/ui/src/molecules/Empty/Empty.tsx:78-93`(엔티티=`채용 공고`) | 0행일 때 | N | Y | — | — | — | — | 0행 | 사유별로 복구 수단이 다르다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:227-232` |
| 13 | 조회 실패 배너 | Alert(danger) + Button | `{엔티티} 목록을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/shared/crud/CrudListShell.tsx:227,229` | 조회 실패의 유일한 표면 | N | Y | — | 숨김 | — | — | 조회 실패 | — |

## 4. 기능 명세

### 4.1 목록 조회 · 4.2 검색과 3축 필터

연혁 목록의 §4.1 과 동작이 같다(전체를 한 번 받아 화면에서 좁힌다 · 재조회 중에는 표를 비우지 않는다). 다른 것만 적는다.

| 항목 | 채용 공고의 값 |
|---|---|
| 주소 파라미터 | `job` · `employment` · `state` · `q` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:61-65`. **`page` 가 없다** |
| 좁히는 순서 | 세 축을 AND 로 건 뒤 검색어를 적용한다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:126` |
| 검색 대상 | **제목과 근무지 둘** — `apps/admin/src/pages/company/careers/types.ts:217-223` |
| 알 수 없는 파라미터 | 각 축의 허용 목록으로 좁혀 `전체` 로 접는다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:93-103` |
| 필터 변경 시 | **선택이 해제된다** — `apps/admin/src/pages/company/careers/CareersListPage.tsx:114-116` |

### 4.3 상태 판정 — 마감은 파생값이다 (이 화면 고유)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 마감 여부를 저장하지 않고 **마감일과 오늘의 비교**로 매번 만든다 |
| 실행 조건 | 목록을 그릴 때마다 |
| 사용자 동작 | 없음(자동) |
| 시스템 처리 | 네 상태를 이 순서로 판정한다 — ① 공개가 꺼져 있으면 `비공개` ② 마감일이 없으면(`null`) `상시 채용` ③ 마감일이 오늘보다 **이전**이면 `마감` ④ 아니면 `모집 중` — `apps/admin/src/pages/company/careers/types.ts:117-121` |
| 데이터 처리 | 아무것도 바꾸지 않는다. 시간이 흘러도 저장된 값은 그대로이고 답만 바뀐다 |
| Validation | 해당 없음 |
| API 호출 여부 | N — 화면에서 판정한다. **서버 응답에도 마감 여부가 없다** — `apps/admin/src/pages/company/careers/data-source.ts:81` |
| 성공 처리 | 상태 배지가 지금 기준으로 그려진다. 아무도 로그인하지 않은 새벽에 마감일이 지나도 다음 조회에서 곧바로 `마감` 으로 보인다 |
| 실패 처리 | 실패할 것이 없다 — 서버를 부르지 않는다 |
| 예외 처리 | **마감일 당일까지는 `모집 중` 이다** — D-day 에 지원서를 넣는 사람을 자정 기준으로 잘라 내면 마지막 날이 사실상 없는 날이 된다 — `apps/admin/src/pages/company/careers/types.ts:113-116`. '오늘'은 화면이 **한 번만** 만들어 고정한다 — 렌더마다 새로 만들면 자정 언저리에 같은 화면이 두 답을 낸다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:118-122` |
| 화면 변경 사항 | 상태 열 · (상태 필터가 걸려 있으면) 목록영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**`null` 은 '비었다'가 아니다** — 마감일이 `null` 인 것은 **상시 채용이라는 의도**이지 '아직 안 정함'이 아니다. 두 상태를 한 모양으로 두면 구별할 수 없어 타입이 이를 갈라 놓았다 — `apps/admin/src/pages/company/careers/types.ts:10-15`.

### 4.4 정렬

| 항목 | 내용 |
|---|---|
| 기능 목적 | 살아 있는 공고가 위, 지난 공고가 아래에 오게 한다 |
| 실행 조건 | 저장소가 목록을 내려줄 때 |
| 사용자 동작 | 없음 — 사람이 순서를 정하지 않는다 |
| 시스템 처리 | **상시 채용 → 마감일 있는 공개 공고 → 비공개** 순으로 묶고, 같은 묶음 안에서는 **마감일 내림차순**(먼 마감일이 위) · 같으면 id — `apps/admin/src/pages/company/careers/types.ts:235-248` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 표의 행 순서가 그 규칙을 따른다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | **정렬은 '오늘'을 받지 않는다** — 저장소의 정본 순서라, 오늘을 넣으면 같은 목록이 날마다 다른 순서로 저장되고 그 순서는 어디에도 기록되지 않는다. 마감일 내림차순이 같은 일을 한다 — `apps/admin/src/pages/company/careers/types.ts:226-233` |
| 화면 변경 사항 | 목록영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.5 단건 삭제 · 4.6 일괄 삭제 · 4.7 폼으로 이동

연혁 목록의 §4.3·4.4·4.5 와 **동작이 같다**(공통 층의 확인 다이얼로그와 토스트를 쓴다). 다른 것만 적는다.

| 자리 | 채용 공고의 값 |
|---|---|
| 엔티티 이름 | `채용 공고` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:41` |
| 항목 이름 | **공고 제목** — `apps/admin/src/pages/company/careers/CareersListPage.tsx:85` |
| 단건 성공 토스트 | `MSG-COMMON-02` — `'{항목 이름}'{조사} 삭제했어요.` — `apps/admin/src/shared/crud/useCrudList.tsx:170`(조사는 제목의 받침이 고른다) |
| 일괄 성공 토스트 | `MSG-COMMON-03` — `{엔티티} {N}건을 삭제했어요.` — `apps/admin/src/shared/crud/useCrudList.tsx:206` |
| 등록 이동 | `/company/careers/new` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:212` |
| 수정 이동 | **행 클릭과 연필 둘 다** → `/company/careers/{id}/edit` — `apps/admin/src/pages/company/careers/CareersListPage.tsx:235-236`. 상세가 없어 행 클릭의 목적지도 폼이다 |

**이 화면 고유의 토스트는 0건이다** — 인벤토리의 화면별 표에 `pages/company/careers/CareersListPage.tsx` 가 올라 있지 않은 것과 일치한다.

## 5. 이벤트 정의

연혁 목록의 이벤트 표에 아래가 더해진다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 검색어 입력 | 타이핑 후 잠시 멈춤 | 주소 갱신 · 화면에서 좁힌다 | 검색영역 | 좁혀진 목록 |
| 한글 조합 중 Enter | 조합 확정 | **제출로 읽지 않는다** | 검색영역 | 변화 없음 |
| 직무·고용형태·상태 필터 변경 | 각 select | 주소 갱신 · 선택 해제 · 다시 좁힌다 | 검색·필터영역 | 좁혀진 목록 |
| 행 클릭 | 표의 행 | **수정 폼으로** 이동 | 목록영역 | `SCR-COMPANY-CAREERS-FORM` |
| 자정 경과 | 날짜가 바뀐 뒤 다시 조회 | 상태 배지가 새 기준으로 다시 계산된다 | 목록영역 | `마감` 으로 바뀐 행 |
| 검색 지우기 · 필터 초기화 | 빈 상태의 복구 버튼 | 검색어 또는 세 축을 되돌린다 | 빈 상태 | 목록 |

나머지(진입 · 조회 성공/실패 · 다시 시도 · 체크박스 토글 · 행 삭제 · 일괄 삭제 · 삭제 확인/취소 · 행 연필 · 등록)는 연혁 목록과 같다.

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 직무 파라미터 | `all` + 여섯 직무 중 하나 | 주소를 읽을 때 | 없음(조용히 접는다) | 알 수 없는 값은 `all` 로 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:93` |
| 고용형태 파라미터 | `all` + 네 고용형태 중 하나 | 〃 | 없음 | 〃 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:94-98` |
| 상태 파라미터 | `all`·`always`·`open`·`closed`·`draft` 중 하나 | 〃 | 없음 | 〃 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:52,99-103` |
| 검색어 | 검증하지 않는다 | — | — | — |

이 화면에는 사용자에게 보이는 검증 오류가 없다. 등록·수정의 검증은 [폼 문서](form.md) §6 이 갖는다.

## 7. 예외 처리

연혁 목록의 §7 과 같다. 문구와 이 화면 고유의 상황만 적는다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | **사유별로 다르다** — 검색 때문이면 `조건에 맞는 {엔티티}{조사} 없어요` / `검색어를 바꾸거나 지워 보세요.`, 필터 때문이면 `필터에 맞는 {엔티티}{조사} 없어요` / `필터를 바꾸거나 초기화해 보세요.`, 정말 비었으면 `{동사}된 {엔티티}{조사} 없어요` / `새로 추가하면 여기에 표시돼요.` — `packages/ui/src/molecules/Empty/Empty.tsx:78-93` | 빈 상태 안내와 함께 복구 버튼을 준다 | `검색 지우기` · `필터 초기화` |
| 조회 결과를 모름 | 조회 전에는 건수를 0으로 그리지 않는다 — 요약이 `불러오는 중…` 이고 표는 스켈레톤이다 | — | 기다린다 |
| 저장 실패 | 해당 없음 — 등록·수정은 폼 화면 | — | — |
| 수정 실패 | 해당 없음 — 이 목록에는 인라인 수정이 없다 | — | — |
| 삭제 실패 | `삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/shared/crud/useCrudList.tsx:67`. 서버가 사유를 준 충돌(409)이면 **그 문장을 그대로** 보인다 — `apps/admin/src/shared/crud/useCrudList.tsx:66`. 일괄은 사유별로 갈린다 — `apps/admin/src/shared/crud/useCrudList.tsx:94-107` | 다이얼로그를 닫지 않고 배너 | 확인 재클릭 |
| API 오류 | 조회면 `{엔티티} 목록을 불러오지 못했어요.` — `apps/admin/src/shared/crud/CrudListShell.tsx:227` | 배너 + '다시 시도' | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 — `apps/admin/src/shared/query/queryClient.ts:82` | 〃 |
| 권한 없음 | 읽기 권한이 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. **쓰기 권한이 없으면 그 컨트롤이 사라진다** | 껍데기가 판정한다 — `apps/admin/src/shared/crud/CrudListShell.tsx:146` | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 — 앱이 로그인 화면으로 보낸다 | 세션 폐기 · 원래 경로 보존 | 재로그인 후 이 목록(조건과 함께) |
| 데이터 충돌 | 다른 관리자가 먼저 지운 공고를 지우려 하면 서버가 사유를 준다: `이미 삭제된 항목이에요.` — `apps/admin/src/shared/crud/crud.ts:164` | 그 문장이 다이얼로그 배너에 그대로 뜬다 | 목록을 다시 조회 |
| 중복 데이터 | 해당 없음 — 이 화면은 아무것도 만들지 않는다 | — | — |
| 파일 업로드 실패 | 해당 없음 — **이 화면에도, 채용 공고 폼에도 파일 입력이 없다** | — | — |
| 플랜 잠금 | `cms.pages` 모듈이 잠기면 메뉴에 글자 꼬리표가 붙거나 화면이 잠금 안내로 바뀐다 — `apps/admin/src/shared/entitlements/plan.ts:109-112` | 판정 순서는 인증 → 플랜 → 권한이다 — `apps/admin/src/shared/entitlements/plan.ts:10-17` | 플랜을 올린다(구독은 이 앱 밖의 일이다) |

## 8. 화면 상태(State)

연혁 목록의 §8 을 따른다. 다른 것만 적는다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 요약이 `불러오는 중…` · 표는 스켈레톤 · 라이브 영역은 침묵한다 | 등록 ○(권한자) | Y | `불러오는 중…` |
| 데이터 있음 | 표에 행이 그려지고 상태 배지가 오늘 기준으로 계산돼 있다 | 등록 ○ · 행 액션 ○(권한자) | N | 라이브 영역 `{엔티티} {N}건을 찾았어요.` — `apps/admin/src/shared/crud/CrudListShell.tsx:116` |
| 데이터 없음(검색 때문) | 빈 상태 + `검색 지우기` | 등록 ○ | N | `조건에 맞는 {엔티티}{조사} 없어요` |
| 데이터 없음(필터 때문) | 빈 상태 + `필터 초기화` | 등록 ○ | N | `필터에 맞는 {엔티티}{조사} 없어요` |
| 데이터 없음(정말 비었음) | 빈 상태 안내 | 등록 ○ | N | `{동사}된 {엔티티}{조사} 없어요` |
| 재조회 중(데이터 있음) | 표를 비우지 않고 요약에 ` · 새로고침 중…` 을 덧붙인다 | 그대로 | N(스켈레톤 없음) | ` · 새로고침 중…` — `apps/admin/src/shared/crud/CrudListShell.tsx:171` |
| 조회 실패 | 요약·선택 바·표가 사라지고 배너만 남는다 | 다시 시도 ○ | N | `{엔티티} 목록을 불러오지 못했어요.` |
| 선택 있음 | 요약 뒤에 ` · {N}건 선택됨` · 선택 바가 나타난다 | 일괄 삭제 ○ | N | — |
| 삭제 중 | 그 행의 액션이 잠기고 다이얼로그 확인이 `처리 중…` | 확인 × · 취소 ○ | Y | 라벨이 곧 안내다 |
| 읽기 전용(권한) | **등록 버튼 · 선택 체크박스 · 연필 · 휴지통 · 선택 바가 통째로 사라진다.** 표·검색·필터는 남고 행 클릭도 살아 있다 | — | N | — |
| 플랜 잠금 | 화면이 잠금 안내로 바뀌거나 메뉴에서 사라진다 | — | N | 플랜 층의 안내(공통) |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `page:/company/careers` 권한을 따른다 | 〃 | 〃 | 〃 | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — 연혁 목록과 같다. 다만 이 화면은 **플랜 축이 하나 더 걸린다**(`cms.pages`). 판정 순서는 인증 → 플랜 → 권한이며, 뒤집으면 사지 않은 기능에 '권한이 없다'고 말하게 된다 — `apps/admin/src/shared/entitlements/plan.ts:10-17`.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-CAREERS` | `채용 공고 등록` 클릭 | `SCR-COMPANY-CAREERS-FORM`(등록) | N | 등록 권한 있음 | 없음 | 저장·취소 후 이 목록 |
| `SCR-COMPANY-CAREERS` | 행 클릭 · 행 연필 클릭 | `SCR-COMPANY-CAREERS-FORM`(수정) | N | 행이 그려져 있음(연필은 수정 권한 필요) | 공고 id | 조건이 복원된 이 목록 |
| `SCR-COMPANY-CAREERS` | 행 삭제 클릭 | `DLG-COMMON-DELETE-ONE` | Y | 삭제 권한 있음 | 대상 1건의 id·제목 | 이 목록 |
| `SCR-COMPANY-CAREERS` | 일괄 삭제 클릭 | `DLG-COMMON-DELETE-BULK` | Y | 삭제 권한 있고 1건 이상 선택 | 선택 id 목록·건수 | 이 목록 |
| `SCR-COMPANY-CAREERS` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 목록 |

**이 화면이 여는 팝업(모달)은 없다.** 확인 다이얼로그 둘은 **공통 층의 것**이라 인벤토리의 화면 고유 51건에 들어 있지 않다.

**이 화면의 결과 통지 토스트는 0건이다**(공통 층의 삭제 토스트만 뜬다). 인벤토리 §9.3 에 이 화면이 올라 있지 않은 것과 일치한다.
