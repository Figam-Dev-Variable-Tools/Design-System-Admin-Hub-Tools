# 프로그램 카테고리

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 카테고리 |
| 화면 ID | `SCR-PROGRAMS-CATEGORIES` |
| 메뉴 경로 | 프로그램 관리 > 카테고리 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 프로그램을 분류하는 **2단계 카테고리**(대분류 → 중분류)를 만들고 고치고 지운다.

**업무 배경** — 프로그램 목록의 좌측 카테고리 필터가 이 화면이 만든 분류를 읽는다. 이 화면의 핵심 제약은 **'사용 중인 카테고리는 삭제할 수 없다'** 이고, 그래서 정리하려는 운영자는 '지울 수 있는 것만 보기'를 먼저 원한다 — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:8-10`.

**화면 설명** — 좌측 사용 여부 필터 + 우측 트리 목록이다. 대분류 아래에 중분류가 들여쓰기로 붙고, 하위가 있는 대분류는 접었다 펼 수 있다. 등록·수정은 팝업이 맡는다.

**주요 사용자** — 최상위 관리자 · 콘텐츠/펀딩 담당 운영자.

**사용 시나리오**

1. `카테고리 추가` 로 대분류를 만들고, 그 행의 `+` 로 중분류를 이어 만든다.
2. 좌측에서 '미사용'을 골라 지울 수 있는 것만 본다 → 휴지통으로 지운다.
3. 사용 중인 카테고리의 **건수 배지를 눌러** 그 카테고리로 걸러진 프로그램 목록을 열고, 거기서 프로그램의 카테고리를 옮긴 뒤 돌아와 지운다.

**선행 조건** — 로그인 · 이 화면의 읽기 권한.

**후행 처리** — 만든 카테고리가 프로그램 폼의 셀렉트와 목록의 좌측 필터에 나타난다. **이름을 고치면 그 카테고리를 쓰는 프로그램의 비정규화 라벨도 함께 갱신된다** — `apps/admin/src/pages/programs/_shared/store.ts:506-508`.

**관련 화면** — [카테고리 추가·수정 팝업](pop-category-form.md) `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` · [프로그램 목록](../index.md) `SCR-PROGRAMS` · [프로그램 등록·수정](../form.md) `SCR-PROGRAMS-FORM` · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바 `프로그램 관리 > 카테고리`.

**관련 기능** — 골격은 상품 카테고리 화면(`SCR-PRODUCTS-CATEGORIES`)과 같다 — **같은 2단계 규칙과 같은 삭제 차단**을 쓰기 때문이다. 규칙이 같은 화면이 서로 다른 골격을 갖기 시작하면 한쪽만 고쳐지는 날이 온다 — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:3-6`.

**관련 API** — 카테고리(사용량 포함) 목록 조회 1건 · 등록/수정 1건(팝업) · 삭제 1건. **백엔드가 없다** — `TODO(backend): GET/POST /api/programs/categories · PUT/DELETE /api/programs/categories/:id (사용 중이면 409)` — `apps/admin/src/pages/programs/data-source.ts:37`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일** — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx` (팝업 `components/ProgramCategoryFormModal.tsx` · 저장소 `../_shared/store.ts` · 표시 규칙 `../types.ts` · 어댑터 `../data-source.ts`)

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 필터 레일(좌) | 사용 여부 — 전체 · 사용 중 · 미사용 + 건수 배지 | 항상 | 전체 | 불가 | 표시 |
| 툴바 | 전체 건수 문구 + `카테고리 추가` | 항상 | 전체 | 불가 | 표시 |
| 목록영역 | 대분류 → 중분류 트리. 행마다 사용 배지·하위 배지·액션 3개 | 항상 | 전체 | **대분류 행마다 접기·펼치기** | 펼침 |
| 하단 안내 | 삭제가 왜 막히는지와 어떻게 푸는지 | 조회 성공 | 전체 | 불가 | 표시 |

**표가 아니라 목록이다** — 계층을 들여쓰기로 보이기 위해 `<ul>` 로 그린다. 그래서 선택 체크박스도 일괄 삭제도 없다.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 사용 여부 필터 | FilterPanel | `사용 여부`(제목) · `프로그램 카테고리 사용 여부 필터`(nav 라벨) — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:425-426` | 전체 · 사용 중 · 미사용 | N | N | 없음 | `전체` | — | 모르는 값은 '전체' | 항상 | 고른 값은 주소가 소유한다 |
| 2 | 건수 문구 | Text(hint) | 조회 전 `불러오는 중…` · 조회 후 `전체 {N}개` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:438` | **재조회 중에도 건수를 지우지 않는다** | N | Y | — | — | — | — | 항상 | 필터가 걸린 뒤의 보이는 건수다 |
| 3 | 카테고리 추가 | Button(primary) | `카테고리 추가` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:418` | 아이콘 `plus-circle` · **대분류**로 만든다 | N | N | 없음 | — | — | — | **등록 권한자에게만** | 빈 상태에도 이 버튼이 온다 |
| 4 | 펼침 토글 | IconButton | `{카테고리명} 하위 카테고리 접기/펼치기 ({N}개)`(aria-label) — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:234` | 아이콘이 `chevron-down`/`chevron-right` 로 바뀐다 | N | N | 없음 | 펼침 | — | — | **하위가 있는 대분류에만** | 토글이 없는 행도 라벨 시작점을 맞춘다(들쭉날쭉하지 않게) |
| 5 | 카테고리 이름 | Text | — | 대분류는 최상위, 중분류는 들여쓰기 | N | Y | — | — | — | — | 항상 | — |
| 6 | 사용 건수 배지 | StatusBadge (+Link) | 사용 중이면 `{N}개 프로그램`(info) · 미사용이면 `미사용`(neutral) — `apps/admin/src/pages/programs/types.ts:213-215` | **사용 중일 때만 링크다** — 누르면 그 카테고리로 걸러진 프로그램 목록이 열린다. aria-label: `'{카테고리명}' 카테고리를 쓰는 프로그램 보기 ({사용 표기})` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:252` | N | Y | — | — | — | — | 항상 | 미사용(0건)은 링크로 만들지 않는다 — 열어 봐야 빈 목록이다 |
| 7 | 하위 개수 배지 | StatusBadge(neutral) | `하위 {N}개` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:260` | — | N | Y | — | — | — | — | 하위가 있을 때 | — |
| 8 | 하위 추가 | IconButton | `{카테고리명} 하위 카테고리 추가`(aria-label) · 툴팁 `하위 카테고리 추가` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:270-271` | 아이콘 `plus-circle` | N | N | 없음 | — | — | — | **대분류 + 등록 권한자** | 2Depth 아래로는 만들지 않는다 |
| 9 | 수정 | IconButton | `{카테고리명} 수정`(aria-label) — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:281` | 아이콘 `pencil` | N | N | 없음 | — | — | — | 항상 | 팝업을 연다 |
| 10 | 삭제 | IconButton | 삭제 가능하면 `{카테고리명} 삭제` · 막혔으면 `{카테고리명} — {사유}이라 삭제할 수 없어요`(aria-label) · 툴팁 `{사유} — 삭제할 수 없어요` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:292,295` | 아이콘 `trash` · **막히면 비활성 + 사유가 툴팁과 aria-label 에 함께 실린다** | N | N | **사용 중이거나 하위가 있을 때** · 삭제 처리 중 | — | — | — | 항상 | 사유는 §6 |
| 11 | 빈 상태 안내 | Empty | `카테고리` 를 이름으로 상황별 문구를 조립한다 — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:458-463` | 필터 때문이면 `필터 초기화`, 정말 0건이면 `카테고리 추가` | N | Y | — | — | — | — | 결과 0건 | 문구는 §7 |
| 12 | 하단 안내 | Text(hint) | `사용 중인 카테고리는 삭제할 수 없어요 — 건수 배지를 누르면 그 카테고리로 걸러진 프로그램 목록이 열려요(대분류는 아래 중분류까지 함께 보여요). 거기서 카테고리를 바꾸거나 삭제하세요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:513-515` | 막힌 이유와 푸는 법을 한자리에 | N | Y | — | — | — | — | 조회 성공 | — |
| 13 | 조회 실패 배너 | Alert(danger) + Button | `카테고리를 불러오지 못했어요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:446` · `다시 시도` | — | N | Y | — | — | — | — | 조회 실패 | — |
| 14 | 삭제 확인 다이얼로그 | ConfirmDialog | 제목 `카테고리 삭제` · 본문 `'{카테고리명}' 카테고리를 삭제할까요? 되돌릴 수 없어요.` · 확인 `카테고리 삭제` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:532-534` | **이 화면 고유 다이얼로그다**(공통 삭제 확인이 아니다) | N | — | — | — | — | — | 삭제 클릭 시 | 실패해도 닫히지 않고 배너 + 재클릭이 재시도다 |

## 4. 기능 명세

### 4.1 카테고리 목록 조회

| 항목 | 내용 |
|---|---|
| 기능 목적 | 지금 어떤 분류가 있고 무엇이 쓰이는지 본다 |
| 실행 조건 | 진입 · 필터 변경 · 쓰기 성공 후 |
| 사용자 동작 | 없음(자동) |
| 시스템 처리 | 카테고리마다 **그것을 쓰는 프로그램 수와 하위 유무를 함께** 받아 대분류 → 중분류 트리로 조립한다 — `apps/admin/src/pages/programs/_shared/store.ts:452-458` |
| 데이터 처리 | 읽기만 한다 |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 사용량 포함 목록 1건 |
| 성공 처리 | 트리와 건수 문구가 그려진다. 토스트 없음 |
| 실패 처리 | 목록 자리에 danger 배너 + `다시 시도` |
| 예외 처리 | **스켈레톤·'불러오는 중…'은 최초 로드에만** 쓴다 — 재조회에도 쓰면 이미 보고 있던 목록이 덮인다 — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:335-336` |
| 화면 변경 사항 | 목록영역 · 건수 문구 · 좌측 배지 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 사용 여부 필터

| 항목 | 내용 |
|---|---|
| 기능 목적 | 지울 수 있는 것만 골라 본다 |
| 실행 조건 | 목록이 그려져 있을 때 |
| 사용자 동작 | 좌측 항목 클릭 |
| 시스템 처리 | 규칙은 표시 규칙 모듈이 갖는다(`filterCategoriesByUsage`) — 이 화면은 그 규칙을 세우는 표시 목록만 갖는다 — `apps/admin/src/pages/programs/types.ts:217-224` |
| 데이터 처리 | 없음 |
| Validation | 주소의 모르는 값은 '전체'로 되돌린다 |
| API 호출 여부 | N |
| 성공 처리 | 목록이 좁혀지고 주소가 바뀐다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 필터가 '사용 중'일 때 중분류만 남으면 그 대분류 행도 함께 보인다(트리를 유지한다) |
| 화면 변경 사항 | 목록영역 · 건수 문구 · 주소 |
| 후속 동작 | 뒤로가기·공유가 같은 조건을 재현한다 |
| 로그 기록 여부 | N |

### 4.3 카테고리 추가 (대분류 · 중분류)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 새 분류를 만든다 |
| 실행 조건 | 등록 권한이 있을 때 |
| 사용자 동작 | 툴바의 `카테고리 추가`(대분류) 또는 대분류 행의 `+`(그 아래 중분류) |
| 시스템 처리 | 팝업을 연다. `+` 로 열면 상위 카테고리가 **미리 채워진다** — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:520-521` |
| 데이터 처리 | 저장은 팝업이 한다([팝업 문서](pop-category-form.md) §4) |
| Validation | 팝업이 갖는다 |
| API 호출 여부 | Y — 팝업이 등록 1건을 보낸다 |
| 성공 처리 | 팝업이 닫히고 토스트 `MSG-PROGRAMS-CATEGORIES-01`(success) `'{카테고리명}' 카테고리를 추가했어요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:406` |
| 실패 처리 | 팝업 안 배너로 말한다(팝업은 닫히지 않는다) |
| 예외 처리 | **2단계가 상한이다** — 중분류 아래에는 `+` 가 없다 |
| 화면 변경 사항 | 팝업 · 목록영역 |
| 후속 동작 | 프로그램 폼의 셀렉트와 목록 필터에 나타난다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.4 카테고리 수정

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이름과 상위를 고친다 |
| 실행 조건 | 연필을 누를 때(권한 판정이 이 아이콘에는 붙어 있지 않다 — §9) |
| 사용자 동작 | 연필 클릭 → 팝업에서 저장 |
| 시스템 처리 | 팝업이 갱신 1건을 보낸다 |
| 데이터 처리 | **이름을 고치면 그 카테고리를 쓰는 프로그램의 비정규화 라벨도 함께 갱신된다** — `apps/admin/src/pages/programs/_shared/store.ts:506-508` |
| Validation | 팝업이 갖는다 |
| API 호출 여부 | Y — 갱신 1건 |
| 성공 처리 | 토스트 `MSG-PROGRAMS-CATEGORIES-01`(success) `'{카테고리명}' 카테고리를 저장했어요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:406` |
| 실패 처리 | 팝업 안 배너 |
| 예외 처리 | **하위가 있는 대분류는 다른 대분류 밑으로 옮길 수 없다** — 저장소가 막고, 팝업도 상위 셀렉트를 미리 잠근다(§6) |
| 화면 변경 사항 | 팝업 · 목록영역 |
| 후속 동작 | 프로그램 목록의 카테고리 열 표기가 바뀐다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.5 카테고리 삭제 (차단 규칙 포함)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 쓰이지 않는 분류를 지운다 |
| 실행 조건 | **사용 중이 아니고 하위도 없을 때만** 휴지통이 눌린다 |
| 사용자 동작 | 휴지통 클릭 → 확인 다이얼로그의 `카테고리 삭제` |
| 시스템 처리 | 확인 시 삭제 1건. 저장소가 같은 두 규칙으로 한 번 더 막는다 — `apps/admin/src/pages/programs/_shared/store.ts:512-520` |
| 데이터 처리 | 그 카테고리가 사라진다 |
| Validation | §6 의 삭제 2규칙 |
| API 호출 여부 | Y — 삭제 1건 |
| 성공 처리 | 다이얼로그가 닫히고 토스트 `MSG-PROGRAMS-CATEGORIES-02`(success) `'{카테고리명}' 카테고리를 삭제했어요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:394` |
| 실패 처리 | **다이얼로그가 닫히지 않고** 그 안 배너로 말한다: `삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:398`. 확인 재클릭이 재시도다 |
| 예외 처리 | 취소하면 진행 중 요청을 중단한다. **버튼의 비활성 조건과 저장소의 거절 조건이 같은 두 사실을 본다** — '눌리는데 실패하는 버튼'이 생기지 않는다 |
| 화면 변경 사항 | 다이얼로그 · 목록영역 |
| 후속 동작 | 목록 재조회 |
| 로그 기록 여부 | 확인하지 못했다 |

**토스트 대조** — [인벤토리](../../inventory.md) §9.3 은 `pages/programs/categories/ProgramCategoriesPage.tsx` 를 **성공 2 · 실패 0** 으로 센다. 이 문서의 §4.3·§4.4 가 한 건(추가/저장이 한 호출의 두 문구), §4.5 가 나머지 한 건이다. 삭제 실패는 토스트가 아니라 다이얼로그 안 배너다.

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 화면 진입 | `/programs/categories` 도달 | 주소의 필터로 목록 조회 | 화면 전체 | 목록 |
| 필터 클릭 | 좌측 항목 선택 | 주소 갱신 · 목록 재필터 | 필터 레일 · 목록영역 | 좁혀진 목록 |
| 펼침 토글 | 대분류 행의 토글 | 그 하위 목록을 접거나 편다 | 목록영역 | — |
| 건수 배지 클릭 | 사용 중인 카테고리 | 그 카테고리로 걸러진 프로그램 목록으로 이동 | 목록영역 | `SCR-PROGRAMS` |
| `카테고리 추가` | 툴바 버튼 | 팝업(대분류 모드) | 팝업 | `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` |
| `+`(하위 추가) | 대분류 행 | 팝업(상위가 채워진 모드) | 팝업 | 〃 |
| 연필 | 행 액션 | 팝업(수정 모드) | 팝업 | 〃 |
| 휴지통 | 삭제 가능한 행 | 삭제 확인 다이얼로그 | 다이얼로그 | 확인=삭제 |
| 막힌 휴지통 hover/포커스 | 사용 중이거나 하위가 있을 때 | **사유가 툴팁과 aria-label 에 실린다** | 행 액션 | — |
| 삭제 성공 | 서버 응답 | 다이얼로그 닫힘 + 성공 토스트 + 목록 갱신 | 목록영역 | 갱신된 목록 |
| 삭제 실패 | 서버 오류 | 다이얼로그 안 배너 | 다이얼로그 | 다이얼로그 유지 |
| 팝업 저장 성공 | 서버 응답 | 팝업 닫힘 + 성공 토스트 | 목록영역 | 갱신된 목록 |
| 조회 실패 | 목록 요청 실패 | 배너 + `다시 시도` | 목록영역 | 배너 |
| 필터 초기화 | 빈 상태의 버튼 | 필터를 기본값으로 | 필터 레일 | 목록 |

## 6. Validation

**입력 칸은 팝업에 있다.** 이 화면이 갖는 것은 **삭제 차단 규칙**과 그 사유 문구다.

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 삭제 — 사용 중 | 그 카테고리를 쓰는 프로그램이 0건이어야 한다 | 렌더 · 클릭 · 저장소 | 화면: 툴팁·aria-label 에 사용 표기(`{N}개 프로그램`)가 사유로 실린다 — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:219`. 저장소: `사용 중인 카테고리는 삭제할 수 없어요.` — `apps/admin/src/pages/programs/_shared/store.ts:514` | 휴지통 비활성 + 사유 노출 |
| 삭제 — 하위 있음 | 하위 카테고리가 없어야 한다 | 〃 | 화면 사유는 `하위 카테고리 있음` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:219`. 저장소: `하위 카테고리가 있는 카테고리는 삭제할 수 없어요.` — `apps/admin/src/pages/programs/_shared/store.ts:517` | 〃 |
| 상위 지정 — 3단계 금지 | 상위는 1Depth 만 | 저장소 | `카테고리는 2단계까지만 만들 수 있어요.` — `apps/admin/src/pages/programs/_shared/store.ts:479` | 팝업이 애초에 대분류만 후보로 준다 |
| 상위 지정 — 자기 자신 | 자기를 상위로 지정할 수 없다 | 저장소 | `자기 자신을 상위 카테고리로 지정할 수 없어요.` — `apps/admin/src/pages/programs/_shared/store.ts:474` | 팝업이 후보에서 자기를 뺀다 |
| 상위 지정 — 없는 상위 | 상위가 실재해야 한다 | 저장소 | `상위 카테고리를 찾을 수 없어요.` — `apps/admin/src/pages/programs/_shared/store.ts:477` | 팝업 안 배너 |
| 상위 이동 — 하위 보유 | 하위가 있는 대분류는 옮길 수 없다 | 저장소 | `하위 카테고리가 있는 카테고리는 다른 카테고리 밑으로 옮길 수 없어요.` — `apps/admin/src/pages/programs/_shared/store.ts:499` | 팝업이 상위 셀렉트를 잠근다 |
| 사용 여부 필터 | 알려진 값 중 하나 | 주소를 읽는 시점 | 없음 | 모르는 값은 '전체'로 되돌린다 |

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 필터 때문이면 `필터에 맞는 카테고리가 없어요` / `필터를 바꾸거나 초기화해 보세요.` · 정말 0건이면 `등록된 카테고리가 없어요` / `새로 추가하면 여기에 표시돼요.` — `packages/ui/src/molecules/Empty/Empty.tsx:71-84`. **이 화면에는 검색이 없어 '검색 때문에 비었다'는 상태가 없다** | 목록 대신 빈 상태 카드 | `필터 초기화` 또는 `카테고리 추가` |
| 저장 실패 | 팝업이 말한다: `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx:99` | 팝업이 닫히지 않고 입력을 유지한다 | 팝업에서 다시 저장 |
| 수정 실패 | 저장 실패와 같은 경로다 — 팝업이 등록과 수정을 겸한다 | 〃 | 〃 |
| 삭제 실패 | `삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:398` | **다이얼로그를 닫지 않고** 그 안 배너로 알린다 | 확인 재클릭이 재시도 |
| API 오류 | `카테고리를 불러오지 못했어요.` — `apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:446` | 목록 자리에 배너 | `다시 시도` |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | **자동 재시도를 하지 않는다** — `apps/admin/src/shared/query/queryClient.ts:82` | 〃 |
| 권한 없음 | 읽기가 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. **등록 권한이 없으면 `카테고리 추가` 와 `+` 가 사라진다.** ⚠ 연필·휴지통에는 권한 판정이 붙어 있지 않다(§9) | 사이드바는 남는다 | 관리자에게 권한 요청 |
| 세션 만료 | 로그인 화면이 `세션이 만료되었어요. 다시 로그인해 주세요.` 를 띄운다 — `apps/admin/src/pages/login/LoginPage.tsx:58` | 세션을 지우고 경로를 보존해 이동 | 재인증 후 이 화면 |
| 데이터 충돌 | 다른 관리자가 먼저 지웠거나 고쳤으면 서버가 준 사유를 그 자리(다이얼로그 또는 팝업)의 배너에 싣는다 | 덮어쓰지 않는다 | 목록을 다시 읽는다 |
| 중복 데이터 | ⚠ **같은 이름의 카테고리를 막는 규칙이 없다.** 대분류 이름도 중분류 이름도 중복될 수 있다(옵션명 중복을 막는 프로그램 폼과 다르다) | 그대로 저장된다 | 목록에서 눈으로 확인해 정리한다 |
| 파일 업로드 실패 | 해당 없음 — 이 화면에 파일 입력이 없다 | — | — |

**'0건'과 '모름'을 다르게 말한다** — 사용 건수 배지의 `미사용` 은 **센 결과가 0** 이라는 뜻이다. 아직 못 센 상태에서는 목록 자체가 `불러오는 중…` 이라 배지가 그려지지 않는다.

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 카드 안에 `불러오는 중…` · 건수 문구도 `불러오는 중…` | 추가 ○ | Y | `불러오는 중…` |
| 데이터 있음 | 대분류 → 중분류 트리 | 추가 ○ · 행 액션 조건부 | N | `전체 {N}개` |
| 데이터 없음(0건) | 빈 상태 카드 + `필터 초기화` 또는 `카테고리 추가` | 〃 | N | §7 의 두 문구 |
| 조회 실패 | 배너 + `다시 시도`. **목록도 하단 안내도 그리지 않는다** | 다시 시도 ○ | N | `카테고리를 불러오지 못했어요.` |
| 재조회 중 | **이전 목록을 유지한다**(덮지 않는다) | 〃 | N | 건수 문구가 그대로 남는다 |
| 삭제 중 | 확인 버튼이 처리 중으로 바뀌고 그 행의 휴지통이 잠긴다 | 확인 × · 취소 ○ | Y | — |
| 삭제 실패 | 다이얼로그 안 danger 배너 | 확인 ○ | N | §7 문구 |
| 사용 중 | 배지가 `{N}개 프로그램`(info · 링크) · **휴지통 비활성** | 삭제 × | N | 툴팁 `{N}개 프로그램 — 삭제할 수 없어요` |
| 미사용 | 배지가 `미사용`(neutral · 링크 아님) · 휴지통 활성 | 삭제 ○ | N | — |
| 하위 있음 | `하위 {N}개` 배지 + 펼침 토글 · **휴지통 비활성** | 삭제 × | N | 툴팁 `하위 카테고리 있음 — 삭제할 수 없어요` |
| 접힌 대분류 | 하위 목록이 감춰지고 토글 아이콘이 바뀐다 | — | N | — |
| 중분류 행 | 토글 자리를 빈 칸으로 맞추고 `+` 가 없다 | 하위 추가 없음 | N | — |
| 읽기 전용(권한) | `카테고리 추가` 와 `+` 가 **사라진다**. ⚠ 연필·휴지통은 남는다 | — | N | 없음 |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `program-categories` 리소스 매트릭스를 따른다 | 〃 | 〃 | 〃 | — | — | — | — |
| 뷰어 | ○ | × | ○(화면상) | ○(화면상) | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

**⚠ 화면이 가리는 것은 `create` 하나뿐이다** — 이 화면은 `canCreate` 만 읽어 `카테고리 추가` 와 `+` 를 감춘다(`apps/admin/src/pages/programs/categories/ProgramCategoriesPage.tsx:414`). **연필과 휴지통에는 권한 판정이 붙어 있지 않아** 읽기 권한만 있어도 보이고 눌린다. 막는 것은 서버뿐이다. 형제 화면(프로그램 목록)이 수정·삭제 컨트롤을 권한으로 감추는 것과 다른 자리다.

**⚠ 플랜(엔타이틀먼트) 매핑이 없다** — 모듈 표에 `/programs/categories` 가 없어 fail-open 으로 언제나 열린다 — `apps/admin/src/shared/entitlements/module-resources.ts`.

**권한이 없을 때 화면이 어떻게 되는가** — 읽기가 없으면 본문이 통째로 권한 화면이 된다. 등록 권한이 없으면 추가 버튼 둘이 사라진다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-PROGRAMS-CATEGORIES` | `카테고리 추가` | `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` | Y | 등록 권한 | 상위 없음(대분류 모드) | 이 화면 |
| `SCR-PROGRAMS-CATEGORIES` | 대분류 행의 `+` | 〃 | Y | 등록 권한 + 대분류 행 | 상위 카테고리 id | 이 화면 |
| `SCR-PROGRAMS-CATEGORIES` | 연필 | 〃 | Y | 언제나 | 수정 대상 카테고리 | 이 화면 |
| `SCR-PROGRAMS-CATEGORIES` | 휴지통 | 카테고리 삭제 확인 다이얼로그 | Y | 사용 중이 아니고 하위도 없을 때 | 대상 카테고리명 | 이 화면 |
| `SCR-PROGRAMS-CATEGORIES` | 사용 건수 배지 | `SCR-PROGRAMS` | N | 사용 중일 때만 링크다 | 주소 쿼리 `category` | 뒤로가기로 이 화면 |
| `SCR-PROGRAMS-CATEGORIES` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 화면 |

**이 화면의 확인 다이얼로그는 공통 층이 아니다** — [인벤토리](../../inventory.md) §8.2 가 화면 고유 확인 다이얼로그로 세는 그 한 건이다(`pages/programs/categories/ProgramCategoriesPage.tsx`). 목록 껍데기를 쓰지 않아 공통 삭제 확인(`DLG-COMMON-DELETE-ONE`)이 걸리지 않기 때문이다.
