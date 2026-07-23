# 공지사항

> **이 문서는 콘텐츠 관리 목록 화면의 정본이다.** FAQ · 팝업 관리 · 배너 관리 · 뉴스·보도자료의 목록 문서는
> 여기서 정한 공통 형태를 되풀이해 적지 않고 **차이만** 적는다. 코드에서도 같은 판단이 적혀 있다 —
> `apps/admin/src/pages/content/notices/NoticesPage.tsx:4`.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 공지사항 |
| 화면 ID | `SCR-CONTENT-NOTICES` |
| 메뉴 경로 | 콘텐츠 관리 > 공지사항 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 서비스 이용자에게 알릴 공지를 한 화면에서 찾고, 열어 보고, 지운다. 등록·수정은 별도 폼 화면이 맡는다.

**업무 배경** — 점검 안내·이벤트 고지·정책 변경 같은 알림은 운영자가 수시로 올린다. 개발자를 부르지 않고 올릴 수 있어야 하고, 반대로 잘못 올라간 글을 즉시 찾아 내릴 수 있어야 한다. 목록은 그 두 일이 만나는 자리다.

**화면 설명** — 왼쪽에 분류·상태 필터 두 벌, 오른쪽에 검색 + 등록 버튼 + 표 + 페이지네이션이 선다. 행을 누르면 상세로 가고, 행의 휴지통은 확인 다이얼로그를 거쳐 지운다. 여러 건을 체크하면 선택 바가 나타나 한 번에 지울 수 있다.

**주요 사용자** — 최상위 관리자 · 콘텐츠를 다루는 운영자.

**사용 시나리오**

1. 운영자가 '점검 · 예약'을 걸고 3페이지에서 공지 한 건을 열어 본 뒤 브라우저 뒤로가기를 누른다 → 걸어 둔 조건과 페이지가 그대로 복원된다.
2. 운영자가 잘못 올라간 공지 한 건을 찾아 행의 휴지통을 누른다 → 확인 다이얼로그가 뜨고, 확인하면 목록이 갱신되며 성공 토스트가 뜬다.
3. 운영자가 지난 이벤트 공지 여러 건을 체크해 한 번에 지운다.

**선행 조건** — 로그인. 이 화면은 콘텐츠 관리 가지에 속하므로 플랜 모듈 `cms.pages` 가 열려 있어야 한다 — `apps/admin/src/shared/entitlements/module-resources.ts:64-66`.

**후행 처리** — 삭제 결과는 이 목록에 반영된다. 목록의 값은 고객이 보는 홈페이지 공지 게시판에 쓰이지만, 그 홈페이지는 이 리포 밖에 있어 반영 경로를 코드에서 확인하지 못했다.

**관련 화면** — [공지 상세](detail.md)(`SCR-CONTENT-NOTICES-DETAIL`) · [공지 등록·수정](form.md)(`SCR-CONTENT-NOTICES-FORM`) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 콘텐츠 관리 가지의 두 번째 잎 — `apps/admin/src/shared/layout/nav-config.ts:145`. 조건부 노출이 아니다.

**관련 기능** — 없음 — 다른 화면의 기능이 이 목록을 바꾸지 않는다. 등록·수정은 폼 화면의 결과로 이 목록에 들어온다.

**관련 API** — 목록 조회 1건(분류·상태·검색어·페이지를 조건으로 받는다) · 단건 삭제 1건. **백엔드가 없다** — 지금은 픽스처가 응답하고, 실제 엔드포인트는 `TODO(backend)` 주석이 자리를 잡고 있다: `apps/admin/src/pages/content/notices/data-source.ts:151`(목록) · `:213`(삭제).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일** — `apps/admin/src/pages/content/notices/NoticesPage.tsx` (필터 `components/NoticeFilters.tsx` · 표 `components/NoticesTable.tsx` · 조회 `queries.ts` · 데이터 `data-source.ts` · 타입 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실 둘**

| 무엇 | 근거 |
|---|---|
| 쓰기 결과가 저장되지 않는다 | 이 화면의 데이터 소스는 삭제 요청을 받아 성공만 돌려주고 픽스처를 바꾸지 않는다. 그래서 성공 토스트가 떠도 목록의 행은 그대로 남는다 — `apps/admin/src/pages/content/notices/data-source.ts:180`(`쓰기 계열 (지금은 저장하지 않는다 — resolve 만 한다)`) · `:213-217` |
| 이 화면에는 쓰기 권한 게이팅이 없다 | 목록 껍데기(`CrudListShell`)를 쓰지 않고 화면이 직접 조립하는데, 그 껍데기가 하던 `useRouteWritePermissions` 판정을 이 화면은 부르지 않는다. 등록 버튼·선택 체크박스·행 삭제가 권한과 무관하게 보인다. 자세한 범위는 §9 |

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 필터영역(왼쪽) | 분류·상태 두 축을 각각 고른다. 두 축은 AND 로 걸린다 | 항상 | 전체 | 불가 | 표시 |
| 검색영역(툴바 왼쪽) | 제목으로 좁힌다 | 항상 | 전체 | 불가 | 표시 |
| 버튼영역(툴바 오른쪽) | 공지 등록 | 항상 | 전체 | 불가 | 표시 |
| 요약영역 | 조회 건수 · 선택 건수 | 조회 실패가 아닐 때 | 전체 | 불가 | 표시 |
| 선택 바 | 선택된 행에 대한 일괄 작업(삭제) | 1건 이상 선택했을 때 | 전체 | 불가 | 숨김 |
| 목록영역 | 공지 표 | 조회 실패가 아닐 때 | 전체 | 불가 | 표시 |
| 페이지영역 | 페이지 이동 | 〃 | 전체 | 불가 | 표시 |
| 오류영역 | 조회 실패를 인라인 배너로 알리고 '다시 시도'를 준다 | 조회가 실패했을 때만 | 전체 | 불가 | 숨김 |

**목록영역과 오류영역은 서로를 대신한다** — 조회가 실패하면 요약·선택 바·표·페이지네이션이 통째로 사라지고 그 자리에 배너만 남는다 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:257,295-309`.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 분류 필터 | FilterPanel | 제목 `분류` · 보조기술 이름 `공지 분류 필터` — `apps/admin/src/pages/content/notices/components/NoticeFilters.tsx:29-30` | 전체 · 공지 · 이벤트 · 점검 — `apps/admin/src/pages/content/notices/types.ts:65-70` | N | N | 없음 | `전체` | — | — | 항상 | 항목마다 건수 배지. **검색과 무관하게 전체 기준**이다 — `apps/admin/src/pages/content/notices/data-source.ts:166-168` |
| 2 | 상태 필터 | FilterPanel | 제목 `상태` · 보조기술 이름 `공지 상태 필터` — `apps/admin/src/pages/content/notices/components/NoticeFilters.tsx:39-40` | 전체 · 게시 · 임시저장 · 예약 — `apps/admin/src/pages/content/notices/types.ts:72-77` | N | N | 없음 | `전체` | — | — | 항상 | 〃 |
| 3 | 검색 입력 | SearchField | `공지 제목 검색` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:248` | 제목에서 찾는다 | N | N | 없음 | URL 의 `q` 값 | 없음 | — | 항상 | 입력이 멈춘 뒤 자동으로 조회된다. 한글 조합 중에는 조회하지 않고 조합 확정용 Enter 도 제출로 읽지 않는다 — `apps/admin/src/shared/crud/useListState.ts:49-54` |
| 4 | 공지 등록 | Button(primary) | `공지 등록` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:253` | 등록 폼으로 이동 | N | N | 없음 | — | — | — | 항상 | ⚠ 등록 권한이 없어도 보인다(§9) |
| 5 | 건수 표시 | Text(hint) | 조회 전 `불러오는 중…` · 조회 후 `전체 {N}건` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:261` | 필터·검색을 적용한 뒤의 전체 건수 | N | Y | — | — | — | — | 항상 | 선택이 있으면 ` · {N}건 선택됨` 이 뒤에 붙는다 — `:262` |
| 6 | 선택 바 | SelectionBar | 선택 건수와 해제 컨트롤은 공통 컴포넌트가 그린다 | 일괄 삭제 버튼을 담는다 | N | N | — | 숨김 | — | — | 1건 이상 선택 | `apps/admin/src/pages/content/notices/NoticesPage.tsx:266` |
| 7 | 일괄 삭제 | Button(danger) | `선택 {N}건 삭제` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:268` | 선택한 공지를 한 번에 지운다 | N | N | 일괄 삭제 요청 중 | — | — | — | 선택 바 안 | — |
| 8 | 전체 선택 체크박스 | Checkbox(헤더) | `이 페이지의 공지 전체 선택` — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:98` | 현재 페이지의 행 전체 | N | N | 없음 | 해제 | — | — | 항상 | 일부만 선택되면 중간 상태로 그려진다 |
| 9 | 행 선택 체크박스 | Checkbox | `{제목} 선택` — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:131` | 그 행 하나 | N | N | 없음 | 해제 | — | — | 행마다 | — |
| 10 | 순번 | 표 셀 | 열 이름 없음(보조기술 전용) | 그 행이 목록 전체에서 몇 번째인가 — (현재 페이지 − 1) × 10 에 행 번호를 더한다 — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:135` | N | Y | — | — | — | — | 행마다 | — |
| 11 | 제목 | Link | 열 머리 `제목` — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:30` | 상세로 가는 링크 | N | Y | — | — | — | — | 행마다 | 고정 공지면 앞에 `고정` 배지(warning) — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:138` |
| 12 | 분류 | 표 셀 | 열 머리 `분류` | `공지` · `이벤트` · `점검` — `apps/admin/src/pages/content/notices/types.ts:17-21` | N | Y | — | — | — | — | 행마다 | — |
| 13 | 상태 | StatusBadge | 열 머리 `상태` | `게시`(success) · `임시저장`(neutral) · `예약`(info) — `apps/admin/src/pages/content/notices/types.ts:23-34` | N | Y | — | — | — | — | 행마다 | 색만으로 말하지 않는다 — 글자 라벨이 함께 있다 |
| 14 | 작성자 | 표 셀 | 열 머리 `작성자` | 글을 올린 사람 | N | Y | — | — | — | — | 행마다 | — |
| 15 | 게시일 | 표 셀 | 열 머리 `게시일` | 예약이면 예약 시각 — `apps/admin/src/pages/content/notices/types.ts:45-47` | N | Y | — | — | — | — | 행마다 | 표시는 KST 고정 — `apps/admin/src/shared/format.ts:62-68` |
| 16 | 조회수 | 표 셀(수치) | 열 머리 `조회수` | 천 단위 구분 | N | Y | — | — | — | — | 행마다 | — |
| 17 | 행 삭제 | IconButton(행 액션) | 보조기술 이름은 공통 `RowActions` 가 제목으로 만든다 — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:156` | 확인 다이얼로그를 연다 | N | N | 그 행이 삭제 요청 중일 때 | — | — | — | 행마다 | **행에는 수정이 없다** — 수정은 상세에서 연다 — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:4` |
| 18 | 스켈레톤 행 | 상태 표시 | (없음) | 최초 로딩 중 10행 | N | Y | — | — | — | — | 최초 로딩 | `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:117` |
| 19 | 빈 상태 문구 | Text | `조회된 공지사항이 없어요.` — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:121` | 0행일 때 표 안에 한 줄 | N | Y | — | — | — | — | 0행 | 이 화면은 사유별 빈 상태(검색/필터/진짜 비어 있음)를 가르지 않는다 |
| 20 | 표 설명 | caption(보조기술 전용) | `공지사항 목록 — 행을 누르면 상세로 이동해요. 체크박스·제목 링크·삭제 버튼은 각자 따로 동작해요.` — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:91-92` | 표의 조작 방법 | N | Y | — | — | — | — | 항상 | 화면에는 보이지 않는다 |
| 21 | 페이지네이션 | Pagination | `공지사항 페이지` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:292` | 한 페이지 10건 — `apps/admin/src/pages/content/notices/types.ts:111` | N | N | 페이지가 1개면 이동 컨트롤이 의미가 없다 | 1페이지 | — | — | 항상 | — |
| 22 | 조회 실패 배너 | Alert(danger) + Button | `공지사항을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:298,304` | 조회 실패의 유일한 표면 | N | Y | — | 숨김 | — | — | 조회 실패 | — |

## 4. 기능 명세

### 4.1 목록 조회

| 항목 | 내용 |
|---|---|
| 기능 목적 | 분류·상태·검색어·페이지를 조건으로 공지 목록과 축별 건수를 가져온다 |
| 실행 조건 | 화면 진입, 또는 네 조건 중 하나가 바뀔 때 |
| 사용자 동작 | 진입 · 필터 클릭 · 검색어 입력 · 페이지 이동 |
| 시스템 처리 | 네 조건은 **주소 쿼리스트링**이 갖는다(`category` · `status` · `q` · `page`). 기본값과 같은 값은 주소에서 지운다 — `apps/admin/src/shared/crud/useListState.ts:113-118`. 조건이 바뀌면 페이지를 1로 되돌리고 선택을 해제한다 — `apps/admin/src/shared/crud/useListState.ts:120-121,205-213` |
| 데이터 처리 | 서버에서 아무것도 바꾸지 않는다. 응답은 그 페이지의 행 · 분류별 건수 · 상태별 건수 · 조건 적용 후 전체 건수다 |
| Validation | 주소를 손으로 고쳐 알 수 없는 값이 들어오면 기본값으로 접는다 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:105-114`. `?page=0`·`?page=abc` 같은 값도 1페이지로 접는다 — `apps/admin/src/shared/crud/useListState.ts:79-80` |
| API 호출 여부 | Y — 목록 조회 1건 |
| 성공 처리 | 표가 그려지고 요약이 `전체 {N}건` 으로 바뀐다. **재조회 중에는 표를 비우지 않는다** — 스켈레톤은 데이터가 아직 없을 때만 뜬다 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:145` |
| 실패 처리 | 표·요약·페이지네이션이 사라지고 배너가 대신 뜬다: `공지사항을 불러오지 못했어요.` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:298`. '다시 시도'가 같은 조건으로 다시 부른다 |
| 예외 처리 | 자동 재시도를 하지 않는다 — `apps/admin/src/shared/query/queryClient.ts:82`. 다른 관리자가 지워 총 페이지가 줄면 현재 페이지를 마지막 페이지로 보정한다 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:153-156` |
| 화면 변경 사항 | 요약영역 · 목록영역 · 페이지영역 · 필터 배지 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 분류·상태 필터

| 항목 | 내용 |
|---|---|
| 기능 목적 | 두 축으로 목록을 좁힌다 |
| 실행 조건 | 목록이 조회 실패 상태가 아닐 때 |
| 사용자 동작 | 왼쪽 필터 항목 클릭 |
| 시스템 처리 | 고른 값을 주소에 쓰고 1페이지로 되돌린다. **같은 값을 다시 고르면 아무 일도 하지 않는다**(페이지를 되돌리지도 않는다) — `apps/admin/src/shared/crud/useListState.ts:156-157` |
| 데이터 처리 | 없음 — 조회 조건만 바뀐다 |
| Validation | 알 수 없는 값은 `전체` 로 접는다 |
| API 호출 여부 | Y — 4.1 과 같은 조회를 새 조건으로 부른다 |
| 성공 처리 | 표가 좁혀지고 요약 건수가 바뀐다. 배지 숫자는 바뀌지 않는다(전체 기준이다) |
| 실패 처리 | 4.1 의 조회 실패와 같다 |
| 예외 처리 | 필터가 바뀌면 선택이 해제된다 — 보이지 않는 행이 선택된 채 남아 일괄 삭제에 끌려가지 않게 한다 — `apps/admin/src/shared/crud/useListState.ts:14-15` |
| 화면 변경 사항 | 목록영역 · 요약영역 · 주소 |
| 후속 동작 | 상세에서 뒤로 왔을 때 이 조건이 복원된다 |
| 로그 기록 여부 | N |

### 4.3 제목 검색

| 항목 | 내용 |
|---|---|
| 기능 목적 | 제목의 일부로 공지를 찾는다 |
| 실행 조건 | 〃 |
| 사용자 동작 | 검색 입력에 타이핑 |
| 시스템 처리 | 입력이 멈추면 검색어를 주소에 커밋하고 1페이지로 되돌린다. 한글 조합 중에는 커밋하지 않는다 |
| 데이터 처리 | 없음 |
| Validation | 없음 — 어떤 문자열도 받는다. 앞뒤 공백은 조회 시 무시된다 — `data-source.ts` 의 `applyQuery` |
| API 호출 여부 | Y — 4.1 과 같은 조회 |
| 성공 처리 | 표가 좁혀진다 |
| 실패 처리 | 4.1 과 같다 |
| 예외 처리 | 검색어가 바뀌지 않았으면 커밋하지 않는다 — `?page=3` 링크로 들어온 사용자가 잠시 뒤 1페이지로 튕기지 않게 한다 — `apps/admin/src/shared/crud/useListState.ts:146-151` |
| 화면 변경 사항 | 목록영역 · 요약영역 · 주소 |
| 후속 동작 | 4.2 와 같다 |
| 로그 기록 여부 | N |

### 4.4 단건 삭제

| 항목 | 내용 |
|---|---|
| 기능 목적 | 공지 한 건을 지운다 |
| 실행 조건 | 행의 휴지통 클릭. 그 행이 이미 삭제 요청 중이면 눌리지 않는다 |
| 사용자 동작 | 휴지통 클릭 → 확인 다이얼로그에서 `공지 삭제` 또는 `취소` |
| 시스템 처리 | 확인 시 삭제 요청 1건. 확인 버튼이 잠겨 두 번째 요청이 생기지 않는다 |
| 데이터 처리 | 그 공지 1건이 사라진다. 되돌리는 수단은 없다. **지금은 픽스처가 실제로 지우지 않는다**(§1 의 확인된 사실) |
| Validation | 해당 없음 — 입력 칸이 없다 |
| API 호출 여부 | Y — 대상 1건 삭제 |
| 성공 처리 | 다이얼로그가 닫히고 목록이 다시 조회된다. 토스트 `MSG-CONTENT-NOTICES-01`: `'{제목}' 공지를 삭제했어요.` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:185` |
| 실패 처리 | **다이얼로그가 닫히지 않는다.** 본문 아래 danger 배너: `공지를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:189`. 확인 버튼이 되살아나 재클릭이 곧 재시도다 |
| 예외 처리 | 취소·Esc·딤 클릭은 진행 중인 요청을 중단하고 실패로 치지 않는다(배너도 토스트도 없다) — `apps/admin/src/pages/content/notices/NoticesPage.tsx:163-169,188` |
| 화면 변경 사항 | 다이얼로그 · 목록영역 · 요약영역 |
| 후속 동작 | 목록 재조회. 페이지가 비면 마지막 페이지로 보정된다(4.1) |
| 로그 기록 여부 | 확인하지 못했다 — 이 화면의 삭제를 관리자 로그에 남기는 배선을 코드에서 찾지 못했다 |

**확인 다이얼로그** — 제목 `공지 삭제` · 본문 `'{제목}' 공지를 삭제할까요? 되돌릴 수 없어요.` · 확인 `공지 삭제` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:316-318`. 취소 라벨은 공통 기본값을 쓴다.

### 4.5 일괄 삭제

| 항목 | 내용 |
|---|---|
| 기능 목적 | 선택한 공지를 한 번에 지운다 |
| 실행 조건 | 1건 이상 선택 |
| 사용자 동작 | 선택 바의 `선택 {N}건 삭제` → 다이얼로그에서 `{N}건 삭제` 또는 `취소` |
| 시스템 처리 | 선택된 id 전부에 삭제를 시도하고 실패 건수를 모은다. 선택이 0건이면 확인해도 아무 요청도 만들지 않는다 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:206` |
| 데이터 처리 | 성공한 건만 사라진다. 부분 실패가 성립한다 |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 선택 건수만큼 |
| 성공 처리 | 전부 성공했을 때만 다이얼로그가 닫히고 선택이 해제된다. 토스트 `MSG-CONTENT-NOTICES-02`: `공지 {N}건을 삭제했어요.` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:225` |
| 실패 처리 | **한 건이라도 실패하면 다이얼로그가 열린 채** 배너로 말한다: `공지 {총}건 중 {실패}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:219`. 선택은 유지된다 |
| 예외 처리 | 취소는 진행 중 요청을 중단한다 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:197-203`. 부분 실패에서는 목록을 다시 조회하지 않는다 — `queries.ts` 의 일괄 삭제 훅이 전부 성공했을 때만 무효화한다 |
| 화면 변경 사항 | 다이얼로그 · 목록영역 · 선택 바 |
| 후속 동작 | 목록 재조회(전부 성공 시) · 선택 해제 |
| 로그 기록 여부 | 4.4 와 같다 — 확인하지 못했다 |

**확인 다이얼로그** — 제목 `공지 일괄 삭제` · 본문 `선택한 공지 {N}건을 삭제할까요? 되돌릴 수 없어요.` · 확인 `{N}건 삭제` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:329-331`.

### 4.6 상세로 이동 · 등록 폼으로 이동

| 항목 | 내용 |
|---|---|
| 기능 목적 | 한 건을 열어 보거나 새 공지를 쓴다 |
| 실행 조건 | 행이 그려져 있을 때(상세) · 언제나(등록) |
| 사용자 동작 | 행 클릭 또는 제목 링크 클릭 · `공지 등록` 클릭 |
| 시스템 처리 | 행 클릭은 상세 경로로, 등록 버튼은 `/content/notices/new` 로 보낸다. 체크박스·삭제 버튼 클릭은 행 이동을 가로채지 않는다 — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:3-4` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N — 이동 자체는 서버를 부르지 않는다(도착 화면이 자기 조회를 한다) |
| 성공 처리 | 화면이 바뀐다. 목록의 조건은 주소에 남아 있어 뒤로가기로 그대로 돌아온다 |
| 실패 처리 | 이동이 실패하는 경로가 코드에 없다. 도착한 상세가 없는 id 면 그 화면이 알린다 |
| 예외 처리 | 새 탭·수식키 클릭은 브라우저에 맡긴다 — 제목이 실제 링크라 새 탭 열기가 성립한다 |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 상세 또는 등록 폼 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 화면 진입 | `/content/notices` 도달 | 주소의 조건을 읽어 조회한다 | 화면 전체 | 목록 또는 스켈레톤 |
| 필터 클릭 | 분류·상태 항목 클릭 | 주소 갱신 · 1페이지로 · 선택 해제 · 재조회 | 필터영역 | 좁혀진 목록 |
| 검색어 입력 | 타이핑 후 잠시 멈춤 | 주소 갱신 · 1페이지로 · 재조회 | 검색영역 | 〃 |
| 한글 조합 중 Enter | 조합 확정 | **제출로 읽지 않는다** | 검색영역 | 변화 없음 |
| 페이지 이동 | 페이지네이션 클릭 | 주소의 `page` 갱신 · 선택 해제 · 재조회 | 페이지영역 | 다른 페이지 |
| 총 페이지 감소 | 응답의 전체 건수가 줄었을 때 | 현재 페이지를 마지막 유효 페이지로 보정 | 페이지영역 | 마지막 페이지 |
| 행 클릭 | 표의 행 클릭 | 상세로 이동 | 목록영역 | `SCR-CONTENT-NOTICES-DETAIL` |
| 체크박스 토글 | 행/헤더 체크박스 | 선택 집합 갱신 | 목록영역 · 선택 바 | 선택 바 표시/숨김 |
| 행 삭제 클릭 | 휴지통 클릭 | 단건 삭제 확인 다이얼로그를 연다 | 목록영역 | 다이얼로그 |
| 일괄 삭제 클릭 | 선택 바의 danger 버튼 | 일괄 삭제 확인 다이얼로그를 연다 | 선택 바 | 다이얼로그 |
| 삭제 확인 | 다이얼로그의 확인 | 요청 1건(또는 N건) · 버튼 잠금 | 다이얼로그 | 성공=닫힘 · 실패=배너 |
| 삭제 취소 | 취소 · Esc · 딤 · × | 진행 중 요청 중단 후 닫힘 + `MSG-COMMON-06` | 다이얼로그 | 목록 |
| 조회 실패 | 조회가 오류로 끝남 | 표를 감추고 배너를 세운다 | 오류영역 | 배너 |
| 다시 시도 클릭 | 배너의 버튼 | 같은 조건으로 재조회 | 오류영역 | 목록 또는 배너 |
| 등록 클릭 | 툴바 버튼 | `/content/notices/new` 로 이동 | 버튼영역 | `SCR-CONTENT-NOTICES-FORM` |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 분류 파라미터 | `all`·`notice`·`event`·`maintenance` 중 하나 | 주소를 읽을 때 | 없음(조용히 접는다) | 알 수 없는 값은 `all` 로 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:105-109` |
| 상태 파라미터 | `all`·`published`·`draft`·`scheduled` 중 하나 | 〃 | 없음 | 알 수 없는 값은 `all` 로 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:110-114` |
| 페이지 파라미터 | 1 이상의 정수 | 〃 | 없음 | 그 밖은 1페이지로 — `apps/admin/src/shared/crud/useListState.ts:79-80` |
| 검색어 | 검증하지 않는다 | — | — | — |

**이 화면에는 사용자에게 보이는 검증 오류가 없다.** 입력 칸이 검색 하나뿐이고 그 값은 무엇이든 받는다. 잘못된 주소 파라미터는 오류로 알리지 않고 기본값으로 접는다 — 링크를 받은 사람이 빈 화면에 착지하지 않게 하려는 선택이다(`apps/admin/src/pages/content/terms/TermsPage.tsx:120-125` 가 같은 판단을 문장으로 적어 두었다).

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `조회된 공지사항이 없어요.` — `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:121` | 표 안에 한 줄만 남긴다. 필터·검색은 그대로 유지된다 | 필터·검색을 직접 되돌린다(이 화면에는 '검색 지우기'·'필터 초기화' 컨트롤이 없다) |
| 조회 결과를 모름 | 조회가 아직 끝나지 않은 동안에는 건수를 **0으로 그리지 않는다** — 요약이 `불러오는 중…` 이고 표는 스켈레톤 10행이다 — `apps/admin/src/pages/content/notices/NoticesPage.tsx:261` · `apps/admin/src/pages/content/notices/components/NoticesTable.tsx:117` | — | 기다린다 |
| 저장 실패 | 해당 없음 — 이 화면에 저장 기능이 없다(등록·수정은 폼 화면) | — | — |
| 수정 실패 | 해당 없음 — 같은 이유 | — | — |
| 삭제 실패 | 단건 `공지를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/notices/NoticesPage.tsx:189` · 일괄 `공지 {총}건 중 {실패}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `:219` | 다이얼로그를 닫지 않고 배너로 알린다 | 확인 재클릭이 곧 재시도 |
| API 오류 | 조회면 `공지사항을 불러오지 못했어요.`, 삭제면 위 문구. 서버 응답 원문·상태 코드를 문장으로 노출하지 않는다 | 인라인 배너 또는 다이얼로그 배너 | 다시 시도 |
| 서버 오류 | 위와 같다 — 코드가 5xx 에 별도 문구를 두지 않는다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 — 별도 문구가 없다 | 자동 재시도를 하지 않는다 — `apps/admin/src/shared/query/queryClient.ts:82,108` | 사용자가 '다시 시도'를 누른다 |
| 권한 없음 | 화면 읽기 권한이 없으면 본문 자리에 `접근 권한이 없어요` 화면이 뜬다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. **쓰기 권한이 없을 때의 문구는 이 화면에 없다** — 컨트롤이 그대로 보이기 때문이다(§9) | 읽기 권한은 라우트 가드가 막는다 | 관리자에게 권한 요청 |
| 세션 만료 | 이 화면에는 자기 문구가 없다. 401 이 관측되면 앱이 로그인 화면으로 보내고 그 화면이 `세션이 만료되었어요. 다시 로그인해 주세요.` 를 띄운다 — `apps/admin/src/pages/login/LoginPage.tsx:58` | 세션을 지우고 원래 경로를 보존한 채 이동 | 재로그인하면 이 목록으로 조건과 함께 돌아온다 |
| 데이터 충돌 | 이 화면에는 충돌 문구가 없다 — 목록은 읽기만 하고, 삭제는 마지막에 쓰는 쪽이 이긴다. 다른 관리자가 먼저 지운 공지를 다시 지우려 하면 삭제 실패 문구가 뜬다 | 삭제 실패 배너 | 목록을 다시 조회해 대상이 남아 있는지 확인 |
| 중복 데이터 | 해당 없음 — 이 화면은 아무것도 만들지 않는다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 이 화면에 파일 입력이 없다 | — | — |

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 요약이 `불러오는 중…` · 표는 스켈레톤 10행 · 필터 배지는 비어 있다 | 등록 ○ · 일괄 삭제 —(선택 바 없음) | Y | `불러오는 중…` |
| 데이터 있음 | 표에 행이 그려지고 요약이 `전체 {N}건` | 등록 ○ · 행 삭제 ○ | N | — |
| 데이터 없음(0건) | 표 안에 한 줄 | 등록 ○ | N | `조회된 공지사항이 없어요.` |
| 재조회 중(데이터 있음) | **표를 비우지 않는다** — 이전 행이 그대로 있고 새 응답이 오면 바뀐다 | 그대로 | N(스켈레톤 없음) | — |
| 조회 실패 | 요약·선택 바·표·페이지네이션이 사라지고 배너만 남는다 | 다시 시도 ○ | N | `공지사항을 불러오지 못했어요.` |
| 선택 있음 | 요약 뒤에 ` · {N}건 선택됨` · 선택 바가 나타난다 | 일괄 삭제 ○ | N | — |
| 삭제 중 | 그 행의 액션이 잠기고 다이얼로그 확인 버튼이 `처리 중…` 으로 바뀐다 | 확인 × · 취소 ○ | Y | 라벨이 곧 안내다 |
| 삭제 실패 | 다이얼로그가 열린 채 배너 | 확인 ○ · 취소 ○ | N | §7 의 삭제 실패 문구 |
| 읽기 전용(권한) | 화면 읽기 권한이 없으면 본문이 `접근 권한이 없어요` 화면으로 바뀐다. **쓰기 권한만 없는 상태는 지금 화면에 나타나지 않는다** — 컨트롤이 그대로 보인다(§9) | — | N | `접근 권한이 없어요` |
| 플랜 잠금 | `cms.pages` 모듈이 잠기면 메뉴에 꼬리표가 붙거나 화면이 잠금 안내로 바뀐다 — `apps/admin/src/shared/entitlements/plan.ts:109-112` | — | N | 플랜 층의 안내(공통) |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `page:/content/notices` 리소스 권한을 따른다 | 〃 | 〃 | 〃 | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

리소스 키는 경로에서 파생된다: `page:/content/notices` — `apps/admin/src/shared/permissions/resources.ts:66-68`. 액션은 다섯이다(`read`·`create`·`update`·`remove`·`export`) — `apps/admin/src/shared/permissions/resources.ts:31`. 다운로드(내보내기)·승인·반려는 이 화면에 없다.

**권한이 없을 때 화면이 어떻게 되는가**

| 축 | 지금 화면이 하는 일 |
|---|---|
| 읽기(`read`) 없음 | 본문 자리에 `접근 권한이 없어요` 화면. 사이드바·헤더는 남는다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73` |
| 쓰기(`create`/`update`/`remove`) 없음 | ⚠ **컨트롤이 그대로 보인다.** 이 화면은 목록 껍데기의 쓰기 게이팅을 쓰지 않는다 — `apps/admin/src/pages/content/notices/NoticesPage.tsx` 에 `useRouteWritePermissions` 호출이 없다. 같은 상태가 FAQ·팝업·배너·약관·개인정보 목록에도 있다. 목록 껍데기를 쓰는 화면(뉴스·연혁·인증서·ESG·채용)은 이 판정을 껍데기가 대신한다 — `apps/admin/src/shared/crud/CrudListShell.tsx:138-146` |
| 플랜(`cms.pages`) | 판정 순서는 인증 → 플랜 → 권한이다 — `apps/admin/src/shared/entitlements/plan.ts:10-17` |

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-NOTICES` | 행 클릭 · 제목 링크 클릭 | `SCR-CONTENT-NOTICES-DETAIL` | N | 행이 그려져 있음 | 공지 id(경로) | 뒤로가기로 조건이 복원된 이 목록 |
| `SCR-CONTENT-NOTICES` | `공지 등록` 클릭 | `SCR-CONTENT-NOTICES-FORM`(등록) | N | 없음 | 없음 | 저장·취소 후 이 목록 |
| `SCR-CONTENT-NOTICES` | 행 삭제 클릭 | 공지 삭제 확인 다이얼로그 | Y | 그 행이 삭제 중이 아님 | 대상 1건의 id·제목 | 같은 목록 |
| `SCR-CONTENT-NOTICES` | 일괄 삭제 클릭 | 공지 일괄 삭제 확인 다이얼로그 | Y | 1건 이상 선택 | 선택 id 목록·건수 | 같은 목록 |
| `SCR-CONTENT-NOTICES` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 목록 |

**이 화면이 여는 팝업(모달)은 없다.** 확인 다이얼로그 둘은 화면 고유이며 인벤토리의 `apps/admin/src/pages/content/notices/NoticesPage.tsx:314,327` 두 건과 일치한다.

**이 화면의 결과 통지 토스트는 2건**(`MSG-CONTENT-NOTICES-01`·`02`)이고, 둘 다 §4 에 문구 그대로 적혀 있다. 인벤토리의 화면별 표(성공 2 · 실패 0)와 일치한다.
