---
id: FS-052
title: "프로젝트 (영업 기회 — 목록·등록/수정)"
screen: SCR-052               # ⚠ 영업 관리 SCR 미작성 — §7 미결 사항 참조
route: /sales/projects
owner: 기능 명세
reviewer: 명세 리뷰
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-052. 프로젝트 (영업 기회 — 목록·등록/수정)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 영업 기회(파이프라인)를 단계·키워드로 좁혀 훑고, 단계·확률·예상매출·기간·진척·마일스톤·산출물을 등록/수정하며, 우측 미리보기로 **파이프라인 단계와 가중 예상매출**을 확인한다. 실주는 사유를 남긴다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — §4.1) |
| 진입 경로 | 좌측 GNB > 영업 관리 > 프로젝트 (`/sales/projects` — `nav-config.ts:160`) |
| 포함 화면 | 목록 `/sales/projects` · 등록 `/sales/projects/new` · 수정 `/sales/projects/:id/edit` (`App.tsx:252-254` — **`/new` 와 `/:id/edit` 가 같은 `<ProjectFormPage />`**) |
| **범위 안** | 등록·수정·**삭제**(단건 + 일괄) — 이 섹션의 다른 두 화면(FS-051 문의 · FS-053 상담 이력)과 달리 **전체 CRUD 를 갖는다.** 프로젝트는 관리자가 만드는 내부 레코드다 |
| **범위 밖** | **읽기 전용 상세 라우트가 없다** — 행을 클릭하면 상세가 아니라 **수정 폼**으로 간다(`ProjectListPage.tsx:209` `onEdit`). '보기'와 '고치기'가 한 화면이다. **견적·계약과의 연결이 없다** — `Project` 에 `quoteId`/`contractId` 같은 참조가 없고(`types.ts:18-38`) 화면에도 링크가 없다. 거래처도 **자유 텍스트 `accountName`** 이지 `/sales/accounts` 레코드 참조가 아니다(§7 #7) |
| 구현 경로 | `apps/admin/src/pages/sales/projects/**` (`ProjectListPage.tsx` · `ProjectFormPage.tsx` · `types.ts` · `validation.ts` · `data-source.ts` · `components/{PipelineStepper,ProjectMilestonesField}.tsx` · `projects.test.ts`) |
| 대응 SCR | SCR-052 (미작성 — §7 #1) |
| 공통 컴포넌트 | `shared/crud/{CrudListShell,CrudTable,useCrudList,useCrudForm,useListState,parseFilter,createCrudAdapter,FormServerError,FormConflictDialog,requiredText,dev}` · `shared/ui/{Alert,alertActionRowStyle,Button,Card,CardTitle,ChevronLeftIcon,controlStyle,DateRangeField,errorIdOf,errorTextStyle,fieldLabelStyle,FormField,hintStyle,pageTitleStyle,PlusCircleIcon,SearchField,SelectField,StatusBadge,TextareaField,ToggleSwitch,TrashIcon,useUnsavedChangesDialog}` · `shared/format(formatNumber·topicParticle)` · `pages/sales/_shared/business(formatWon)` |

> **이 화면은 이 섹션에서 유일하게 공용 CRUD 프레임워크를 전량 소비한다** — 목록은 `useCrudList` + `CrudListShell`(선택·일괄삭제·확인 다이얼로그·빈상태·실패배너 전부 셸이 소유), 폼은 `useCrudForm`(404 분기·409 충돌 다이얼로그·제출 락·멱등키·서버 참조코드). 그 결과 FS-051·FS-053 이 gap 으로 잡는 여러 요구가 **이 화면에서는 상속으로 충족된다**. 판정이 갈리는 이유가 기준이 아니라 **셸 소비 여부**임을 문서 전체에서 명시한다.

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-052-SEC-01 | 목록 툴바 | 검색 + 단계 필터(select) 좌측 · '프로젝트 등록' 우상단 |
| FS-052-SEC-02 | 목록 조회 요약·라이브 리전 | 건수·선택수·새로고침 표시 + 항상 마운트된 polite 리전(셸 소유) |
| FS-052-SEC-03 | 일괄 선택 바(비표시 기본) | 선택 건수 + '선택 N건 삭제'(셸 소유) |
| FS-052-SEC-04 | 목록 표 | 체크박스·순번·단계·프로젝트명·거래처·예상매출·기간·진척·행 액션(셸 소유) |
| FS-052-SEC-05 | 목록 조회 실패 배너(비표시 기본) | 요약·표 대체(셸 소유) |
| FS-052-SEC-06 | 삭제 확인 다이얼로그(비표시 기본) | 단건·일괄(셸 소유) |
| FS-052-SEC-07 | 폼 헤더 | '목록으로' 버튼 + 제목 + 설명 |
| FS-052-SEC-08 | 폼 — 기회 정보 카드 | 프로젝트명·거래처·담당자·단계·확률·예상매출·(실주 사유) |
| FS-052-SEC-09 | 폼 — 기간·진척 카드 | 날짜 범위 + 진척률 |
| FS-052-SEC-10 | 폼 — 마일스톤 카드 | 동적 배열 편집기 |
| FS-052-SEC-11 | 폼 — 산출물·비고 카드 | 산출물(줄바꿈 구분) + 메모 |
| FS-052-SEC-12 | 폼 — 파이프라인 미리보기 카드 | 스텝퍼(또는 실주 배지) + 단계·예상매출·가중 예상매출 |
| FS-052-SEC-13 | 폼 footer | 취소 · 등록/저장 |
| FS-052-SEC-14 | 폼 조회 실패 배너(비표시 기본) | 404 vs 오류 분기 |
| FS-052-SEC-15 | 폼 서버 오류·충돌·이탈 가드(비표시 기본) | 저장 실패 배너 + 409 다이얼로그 + 미저장 파기 확인 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-052-EL-001 | FS-052-SEC-01 | 검색 입력 | 입력 | `SearchField`, 접근 이름 '프로젝트명·거래처 검색', placeholder '프로젝트명 · 거래처 검색'. **IME 조합 중에는 커밋하지 않고 조합 종료 후 250ms 디바운스로 URL `?q=` 에 커밋**한다(`list.searchInputProps` 스프레드 — `ProjectListPage.tsx:163-170`, 주석 `:168` 이 '「신사옥」 을 치는 도중 「신사ㅇ」 로 검색되지 않는다'를 선언). 커밋된 `keyword` 로 프로젝트명·거래처명에 대해 대소문자 무시·앞뒤 공백 제거 부분 일치로 **클라이언트에서** 거른다(`searchProjects` — `types.ts:114-122`) | — | 서버 재조회 없음 |
| FS-052-EL-002 | FS-052-SEC-01 | 단계 필터 | 입력 | `SelectField`, 접근 이름 '단계로 거르기'. '전체 단계' + 리드·상담·제안·협상·수주·실주(`STAGES` — `types.ts:63-70`). 값은 URL `?stage=`, 모르는 값은 `parseFilter` 가 '전체'로 되돌린다(`:106-110`, 주석 `:105` '손으로 고친 ?stage=거짓말 이 조회를 깨지 않게 한다') | — | 클라이언트 필터(`filterProjects`) |
| FS-052-EL-003 | FS-052-SEC-01 | 조회 상태의 URL 소유 규칙 | 텍스트 | 단계·검색어의 **단일 원천이 URL 쿼리스트링**이다(`useListState({ filterDefaults: { stage: 'all' } })` — `:39,104`). 기본값과 같은 값은 URL 에서 지워지고, 갱신은 `replace` 다 | — | 비표시 규칙. 헤더 주석(`:6-8`)이 의도를 선언한다 — '「제안」 단계만 걸러 놓고 프로젝트 상세로 갔다 Back 하면 그 파이프라인 view 가 그대로 살아 있고, 주간 회의에 그 URL 을 그대로 붙여 넣을 수 있다'(IA-13) |
| FS-052-EL-004 | FS-052-SEC-01 | '프로젝트 등록' 버튼 | 버튼 | 툴바 우상단. `primary` `size="md"` + `PlusCircleIcon`. 클릭 시 `/sales/projects/new` 이동(`:186-189`) | — | **쓰기 권한을 묻지 않고 무조건 렌더된다**(§7 #10) |
| FS-052-EL-005 | FS-052-SEC-02 | 라이브 리전 | 텍스트 | **항상 마운트된** polite 리전(`aria-live="polite" aria-atomic="true"` + visually-hidden — `CrudListShell.tsx:107-109`). 최초 로드 중에는 침묵하고, 완료 후 `프로젝트 N건을 찾았습니다.` / 0건이면 `조건에 맞는 프로젝트 결과가 없습니다.` / 실패면 `프로젝트 목록을 불러오지 못했습니다.`(`:72-82` `announcementOf`) | — | 비표시. 셸이 소유. **내용과 함께 생성되는 리전이 아니라 지속 컨테이너**라 AT 가 신뢰성 있게 읽는다(주석 `:99-105`) |
| FS-052-EL-006 | FS-052-SEC-02 | 조회 요약 텍스트 | 텍스트 | 최초 로드 중 '불러오는 중…', 그 밖에는 `전체 N건`. **재조회 중에는 건수를 유지하고 '· 새로고침 중…' 을 덧붙인다**(`CrudListShell.tsx:118-122`). 선택이 있으면 `· N건 선택됨`. `aria-busy={refreshing}` | — | 비표시(셸 소유). N 은 필터·검색 적용 후 건수 |
| FS-052-EL-007 | FS-052-SEC-03 | 일괄 선택 바 | 버튼 | 선택이 1건 이상일 때 `SelectionBar`(건수 + 해제) + `danger` 버튼 `선택 N건 삭제`(`CrudListShell.tsx:125-133`). 삭제 진행 중이면 비활성 | — | 비표시(셸 소유). **선택 범위는 현재 보이는 행뿐**(`toggleAll(visibleItems.map(...))` — `:143-147`) |
| FS-052-EL-008 | FS-052-SEC-04 | 프로젝트 목록 표 | 표 | `CrudTable`(셸 소유). **전량을 한 화면에 렌더한다 — 페이지네이션이 없다**(§7 #2). 컬럼 9개: 체크박스 + 순번 + 6열(단계·프로젝트명·거래처·예상매출·기간·진척) + 행 액션(`ProjectListPage.tsx:133-158` `columns`). `aria-busy={loading}`(= `firstLoading`). caption '프로젝트 목록 — 행을 누르면 해당 항목으로 이동합니다. 체크박스·수정·삭제 버튼은 각자의 동작을 수행합니다.'. 기본 정렬은 **종료일 오름차순(임박이 위)**(어댑터 `sort: sortProjects` — 동시각은 id 오름차순 안정 정렬 — `types.ts:125-130`) | O | 정렬 변경 UI 없음 |
| FS-052-EL-008.1 | FS-052-SEC-04 | 행 선택 체크박스 | 입력 | `RowSelectCell`(DS), 접근 이름 `'<프로젝트명> 선택'`(`CrudTable.tsx:173-178`). 헤더는 `SelectAllHeaderCell`, 접근 이름 '이 페이지의 프로젝트 전체 선택' + `labelId="project-select-all"`(`ProjectListPage.tsx:207`) | — | 선택 상태는 `useCrudList`→`useRowSelection` 이 소유 |
| FS-052-EL-008.2 | FS-052-SEC-04 | 순번 셀 | 텍스트 | `SeqCell`, 값은 **`행index + 1`**(`CrudTable.tsx:179`) | — | 페이지네이션이 없어 현재는 어긋나지 않는다(§7 #2·#12) |
| FS-052-EL-008.3 | FS-052-SEC-04 | 단계 배지 | 배지 | `StatusBadge`. 라벨 `stageLabel` · 톤 `stageTone`(`STAGES` 의 `tone` — `types.ts:63-70`): 리드=neutral · 상담=info · 제안=info · 협상=warning · 수주=success · 실주=danger. `nowrap` | — | 톤이 단계 메타에 데이터로 붙어 있어 확장이 쉽다 |
| FS-052-EL-008.4 | FS-052-SEC-04 | 프로젝트명 셀 | 텍스트 | `item.name`(`:139`). **링크가 아니다** — 텍스트만 렌더한다 | — | **키보드 상세 진입 경로가 이 셀에 없다** — `RowActions` 의 수정 버튼이 그 역할을 겸한다(§7 #8) |
| FS-052-EL-008.5 | FS-052-SEC-04 | 거래처 셀 | 텍스트 | `item.accountName`(`:140`) — **자유 텍스트이며 `/sales/accounts` 레코드 참조가 아니다**(§7 #7) | — | truncate 없음 |
| FS-052-EL-008.6 | FS-052-SEC-04 | 예상매출 셀 | 텍스트 | `formatWon(item.expectedRevenue)` → '42,000,000원'(`_shared/business.ts:45-47`). `numeric: true` → 우측 정렬 + tabular-nums(`CrudTable.tsx:184`) | — | **'원' 단위가 숫자에 붙어 있어** 우측 정렬 시 단위가 마지막 자릿수를 따라다닌다(quality-bar ERP-07 P2 — §7 #13) |
| FS-052-EL-008.7 | FS-052-SEC-04 | 기간 셀 | 텍스트 | `` `${item.startAt} ~ ${item.endAt}` `` — **원본 'YYYY-MM-DD' 문자열 그대로**(`:145`). `nowrap` + tabular-nums + muted | — | **`shared/format` 을 경유하지 않는다** — 이 화면의 유일한 인라인 날짜 포맷이다(§7 #14) |
| FS-052-EL-008.8 | FS-052-SEC-04 | 진척 막대 | 표시 | 트랙(`aria-hidden`) + 채움(`width: <progress>%`, 0~100 클램프 — `:82-91`) + 라벨 `` `${formatNumber(item.progress)}%` ``(tabular-nums) | — | 막대가 `aria-hidden` 이라 **AT 는 옆의 숫자 라벨만 읽는다** — 이중 인코딩이 성립한다(색+숫자) |
| FS-052-EL-008.9 | FS-052-SEC-04 | 행 액션(수정·삭제) | 버튼 | `RowActions`(DS) — 연필/휴지통 아이콘 버튼, 접근 이름이 프로젝트명 기반. 삭제 진행 중인 행은 비활성(`CrudTable.tsx:190-199`) | — | **쓰기 권한을 묻지 않는다**(§7 #10) |
| FS-052-EL-008.10 | FS-052-SEC-04 | 행 전체 클릭 → 수정 | 텍스트 | 행 빈 영역 클릭 시 `onEdit(item)` = `/sales/projects/<id>/edit` 이동(`rowActivateProps` — `CrudTable.tsx:172` → `ProjectListPage.tsx:209`). 행 안의 체크박스·버튼·링크·입력은 자기 동작만 수행하고, 텍스트 드래그 선택 중이면 이동하지 않는다 | — | 비표시 규칙. **마우스 전용**(`<tr>` 에 tabIndex 없음). **읽기 전용 상세가 없어 클릭 = 편집 진입**이다(§1 범위 밖) |
| FS-052-EL-009 | FS-052-SEC-04 | 목록 로딩 스켈레톤 | 스켈레톤 | **최초 로드에서만**(`firstLoading = isFetching && data === undefined` — `useCrudList.tsx:71`) 표 본문을 5행 고정 스켈레톤으로 대체한다. 행 수는 하드코딩 `length: 5`, 셀 수는 `columns.length + 3` 으로 파생(`CrudTable.tsx:143-151`) | — | 비표시(셸 소유). **재조회 중에는 이전 행이 유지된다** — `placeholderData: (previous) => previous`(`crud.ts:254`)와 짝(STATE-01) |
| FS-052-EL-010 | FS-052-SEC-04 | 빈 상태 | 빈상태 | 조회 완료·0건이면 공유 `Empty` 를 표 본문 1행에 렌더한다(`CrudTable.tsx:153-169`). 화면이 맥락을 넘긴다(`ProjectListPage.tsx:201-206` — `hasQuery`·`hasActiveFilters`·`onClearSearch`·`onResetFilters`) → 3분기: 검색 0건 '조건에 맞는 프로젝트가 없습니다' + '검색 지우기' · 필터 0건 '필터에 맞는 프로젝트가 없습니다' + '필터 초기화' · 진짜 0건 '등록된 프로젝트가 없습니다'. **생성 CTA 슬롯(`createAction`)은 넘기지 않는다** — 진짜 0건일 때 등록 CTA 가 빈 상태 안에 뜨지 않는다(툴바에는 있다 — §7 #15) | — | 비표시. 조사(이/가)는 `Empty` 가 받침으로 고른다(`Empty.tsx:25-27`). `role="status"` |
| FS-052-EL-011 | FS-052-SEC-05 | 목록 조회 실패 배너 | 배너 | 조회 실패 시 요약·선택바·표 대신 위험 톤 `Alert` '프로젝트 목록을 불러오지 못했습니다.' + '다시 시도'(`refetch`)(`CrudListShell.tsx:156-165`). 자동 소멸하지 않는다 | O | 비표시(셸 소유). **툴바는 남는다** — 셸이 `toolbar` 를 배너 바깥에 그린다(`:111`). FS-051 과 갈리는 지점 |
| FS-052-EL-012 | FS-052-SEC-06 | 단건 삭제 확인 다이얼로그 | 모달 | `ConfirmDialog intent="delete"` · 제목 '프로젝트 삭제' · 문구 `'<프로젝트명>'<조사> 삭제합니다. 이 작업은 되돌릴 수 없습니다.` — **조사는 `objectParticle(nameOf(target))` 가 받침으로 고른다**(`useCrudList.tsx:158`) · confirmLabel '삭제' · `busy={deleting}` · `error={deleteError}` | O | 비표시(셸 소유). 실패 시 **다이얼로그를 열어둔 채 danger 배너**('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' — `:112`), 재클릭이 retry. 취소/Esc/dim 은 **in-flight 요청을 abort + `mutate.reset()`**(`:86-92`) |
| FS-052-EL-013 | FS-052-SEC-06 | 일괄 삭제 확인 다이얼로그 | 모달 | `ConfirmDialog intent="delete"` · 제목 '프로젝트 일괄 삭제' · 문구 `선택한 프로젝트 N건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` · confirmLabel `N건 삭제`(`useCrudList.tsx:166-176`). 부분 실패면 다이얼로그를 유지하고 `N건 중 M건을 삭제하지 못했습니다.` 배너(`:138-142`) | O | 비표시(셸 소유). `settleAll` 로 개별 실패를 센다(`crud.ts:349-350`). **실패한 id 를 알려주지 않아 retry 가 전체를 재실행한다**(quality-bar EXC-10 P1) |
| FS-052-EL-014 | FS-052-SEC-04 | 선택 해제 규칙 | 텍스트 | 단계 필터·검색어가 바뀌면 선택을 해제한다(`ProjectListPage.tsx:124-126` `useEffect(() => { clear(); }, [filter, keyword, clear])`) | — | 비표시 규칙. 주석(`:121-123`)이 이유를 밝힌다 — '화면에 없는 행이 선택된 채 「선택 3건 삭제」 가 되지 않게 한다'(STATE-04-b). **선택은 `useCrudList` 가 쥐고 있어 `useListState` 의 자체 선택 리셋(`useListState.ts:205-213`)이 아니라 이 다리가 그 일을 한다** |
| FS-052-EL-015 | FS-052-SEC-07 | 폼 '목록으로' 버튼 | 버튼 | 좌상단. `ChevronLeftIcon` + '목록으로'. 클릭 시 `navigate('/sales/projects')`(`ProjectFormPage.tsx:268-276`) | — | `<button>` + `navigate()` 프로그램 이동이라 이탈 가드가 가로채지 못한다(§7 #16) |
| FS-052-EL-016 | FS-052-SEC-07 | 폼 제목 | 텍스트 | `<h1 style={pageTitleStyle}>{isEdit ? '프로젝트 수정' : '프로젝트 등록'}</h1>`(`:279`, title.xl). `isEdit` 는 라우트의 `:id` 유무(`useCrudForm.ts:74-75`) | — | AppHeader 가 그리는 `<h1>`('프로젝트')과 **중복**된다(§7 #3) |
| FS-052-EL-017 | FS-052-SEC-07 | 폼 설명 | 텍스트 | '별표(*) 항목은 필수입니다. 단계를 바꾸면 확률이 기본값으로 채워집니다.'(`:280-282`) | — | 비가시 부수효과(확률 자동 채움 — FS-052-EL-023)를 미리 알린다 |
| FS-052-EL-018 | FS-052-SEC-14 | 폼 조회 실패 배너 | 배너 | 수정 진입 시 상세 조회 실패하면 폼 대신 위험 톤 `Alert`(`:242-264`). **404 와 오류를 가른다**(`loadFailure` — `useCrudForm.ts:144-149`, `isNotFound` 판정): `'not-found'` → '프로젝트 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + **'목록으로'만** · `'error'` → '프로젝트 불러오지 못했습니다.' + **'다시 시도'(`retryLoad`) + '목록으로'** | O | 비표시. 주석(`:240-241`)이 이유를 밝힌다 — '이미 삭제된 항목에 「다시 시도」를 권하면 영원히 실패하는 버튼을 누르게 된다'(EXC-12 충족). **⚠ 두 문구 모두 조사가 빠져 비문이다** — '프로젝트**를** 찾을 수 없습니다'/'프로젝트**를** 불러오지 못했습니다' 여야 한다. 형제 화면은 옳다(`QuoteFormPage.tsx:236-237` '견적을' · `ContractFormPage.tsx:222-223` '계약을') — **실재 결함**(§7 #4) |
| FS-052-EL-019 | FS-052-SEC-15 | 폼 서버 오류 배너 | 배너 | `<FormServerError serverError={serverError} errorReference={errorReference} />`(`:286`). 저장 실패 시 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' + **복사 가능한 참조 코드**(`referenceOf(cause)` — `useCrudForm.ts:194-195`) | O | 비표시. **409·422 는 이 배너로 오지 않는다** — 각각 FS-052-EL-034·EL-035 가 가로챈다 |
| FS-052-EL-020 | FS-052-SEC-08 | 프로젝트명 입력 | 입력 | `FormField htmlFor="project-name" label="프로젝트명" required`. `<input type="text" maxLength={80}>`(`PROJECT_NAME_MAX`), placeholder '예: 한빛소프트 ERP 구축'. `aria-invalid={errors.name !== undefined}` + `aria-describedby={errors.name !== undefined ? errorIdOf('project-name') : undefined}` **짝으로**(`:293-313`). RHF `register('name')` | O | 검증 `requiredText('프로젝트명', 80)`(`validation.ts:37`). `required` → `FormField` 가 `<input>` 자식에 **`aria-required` 를 런타임 주입**한다(`FormField.tsx:50-56`) |
| FS-052-EL-021 | FS-052-SEC-08 | 거래처 입력 | 입력 | `FormField htmlFor="project-account" label="거래처" required`. `<input type="text">`, placeholder '예: (주)한빛소프트웨어'. `aria-invalid`+`aria-describedby` **짝으로**(`:316-335`) | O | 검증 `requiredText('거래처', 60)`. **자유 텍스트 — 거래처 레코드 선택이 아니다**(§7 #7) |
| FS-052-EL-022 | FS-052-SEC-08 | 담당자 입력 | 입력 | `FormField htmlFor="project-owner" label="담당자"`(**required 아님**). `<input type="text">`, placeholder '예: 이영업'(`:336-346`) | O | 검증 없음(`z.string()` — `validation.ts:48`). 자유 텍스트라 운영자 계정과 연결되지 않는다(§7 #7) |
| FS-052-EL-023 | FS-052-SEC-08 | 단계 select + 확률 자동 채움 | 입력 | `FormField htmlFor="project-stage" label="단계" required`. `SelectField` 에 `STAGES` 6개 **전부**(`:350-366`). 선택 시 `onStageChange`(`:234-238`): ① `setValue('stage', next, { shouldDirty: true })` ② **`setValue('probability', String(defaultProbability(next)))`** — 확률을 그 단계 기본값(리드10·상담30·제안50·협상70·수주100·실주0)으로 **덮어쓴다** | O | **전이 규칙이 없다** — 어느 단계에서 어느 단계로도 갈 수 있다(§7 #5). `required` → `FormField` 가 `SelectField` 자식에 `aria-required` 주입(`FormField.tsx:40`이 `SelectField` 를 허용 대상으로 인정). **확률 덮어쓰기에 확인이 없다** — 손으로 조정한 확률이 단계 변경 한 번에 사라진다(§7 #17) |
| FS-052-EL-024 | FS-052-SEC-08 | 확률 입력 | 입력 | `FormField htmlFor="project-probability" label="확률 (%)" error={errors.probability?.message}`. `<input type="text" inputMode="numeric">`, placeholder '예: 70'(`:367-382`) | O | 검증 `percentString('확률')`(`validation.ts:25-33`) — 숫자만 + 0~100. **오류 문구의 조사를 `topicParticle('확률')` 이 런타임에 고른다**('확률은') — ERP-13 충족. **`aria-invalid`·`aria-describedby` 가 없다** — 오류 `<p role="alert">` 가 뜨지만 입력에 연결되지 않는다(§7 #6) |
| FS-052-EL-025 | FS-052-SEC-08 | 예상매출 입력 | 입력 | `FormField htmlFor="project-revenue" label="예상매출 (원)" error={errors.expectedRevenue?.message}`. `<input type="text" inputMode="numeric">`, placeholder '예: 42000000'(`:383-398`) | O | 검증 '예상매출은 숫자만 입력할 수 있습니다.'(`validation.ts:41-45` — **여기는 조사가 리터럴 '은'인데 '예상매출' 이 받침이라 우연히 맞다**). **실시간 천단위 마스킹이 없다** — 붙여넣은 '42,000,000' 은 검증에서 거절된다(§7 #18). `aria-invalid` 없음(§7 #6) |
| FS-052-EL-026 | FS-052-SEC-08 | 실주 사유 입력 | 입력 | **단계가 '실주'일 때만 렌더된다**(`:401-418`). `FormField htmlFor="project-lost-reason" label="실주 사유" required error={errors.lostReason?.message}`. `<input type="text">`, placeholder '예: 경쟁사 대비 납기 조건 불리' | O | 검증 `.check()` 에서 '실주 사유를 입력하세요.'(`validation.ts:77-87`). `required` → `aria-required` 주입 ✔. `aria-invalid` 없음(§7 #6). **실주가 아니면 저장 시 `''` 로 비운다**(`:168`) — 단계를 되돌리면 사유가 사라진다 |
| FS-052-EL-027 | FS-052-SEC-09 | 프로젝트 기간(날짜 범위) | 입력 | `DateRangeField label="프로젝트 기간" required`(`:423-432`). 두 `<input type="date">` 를 '~' 로 잇고, 각 칸에 visually-hidden 라벨('프로젝트 기간 시작일'/'… 종료일'). **`required` → 두 입력 각각에 native `required` + `aria-required` 를 컴포넌트가 직접 준다**(`DateRangeField.tsx:48`) — `FormField` 를 거치지 않는다. `error` 는 `errors.startAt?.message ?? errors.endAt?.message`(`:232`) → **invalid 시 두 입력에 `aria-invalid` + `aria-describedby` 를 짝으로**(`DateRangeField.tsx:45`) | O | 검증(`validation.ts:55-76`): 실재 날짜 아니면 `startAt` 경로에 '기간을 YYYY-MM-DD 형식으로 입력하세요.', 종료<시작이면 `endAt` 경로에 '종료일은 시작일보다 빠를 수 없습니다.'. **preset('오늘/최근 7일/…')이 없다**(quality-bar COMP-11 P1) |
| FS-052-EL-028 | FS-052-SEC-09 | 진척률 입력 | 입력 | `FormField htmlFor="project-progress" label="진척률 (%)" error={errors.progress?.message}`. `<input type="text" inputMode="numeric">`, placeholder '예: 40'(`:433-448`) | O | 검증 `percentString('진척률')` — 조사를 `topicParticle` 이 고른다('진척률은'). **마일스톤 진척(FS-052-EL-030.5)과 별개 값이다** — 마일스톤 힌트는 '완료 표시에 따라 아래 진척률이 계산됩니다'라 말하지만 **자동 계산은 일어나지 않는다**(§7 #9). `aria-invalid` 없음(§7 #6) |
| FS-052-EL-029 | FS-052-SEC-10 | 마일스톤 편집기 | 입력 | `ProjectMilestonesField`(`:453-458`). `watch('milestones')` 를 받아 변경 시 `setValue('milestones', [...next], { shouldDirty: true })` | O | 동적 배열. 상한 `PROJECT_MAX_MILESTONES = 12`(`types.ts:43`) |
| FS-052-EL-029.1 | FS-052-SEC-10 | 마일스톤 라벨·힌트 | 텍스트 | `<span>마일스톤</span>` + '주요 마일스톤을 등록하세요. 완료 표시에 따라 아래 진척률이 계산됩니다. (최대 12개)'(`ProjectMilestonesField.tsx:92-96`) | — | **힌트가 사실과 다르다** — 완료 표시가 진척률(EL-028)을 바꾸지 않는다(§7 #9). 라벨이 `<span>` 이라 어떤 컨트롤과도 연결되지 않는다(각 행이 자기 `aria-label` 을 갖는다) |
| FS-052-EL-029.2 | FS-052-SEC-10 | 마일스톤 행 — 이름 | 입력 | `<input type="text">`, placeholder `마일스톤 N (예: 계약 체결)`, `aria-label={\`마일스톤 N 이름\`}`(`:101-110`) | O | **`aria-invalid` 없음** — 검증 오류는 필드 전체 1개 문구로만 뜬다(EL-029.5) |
| FS-052-EL-029.3 | FS-052-SEC-10 | 마일스톤 행 — 목표일 | 입력 | `<input type="date">`, `aria-label={\`마일스톤 N 목표일\`}`(`:111-119`) | O | 위와 동일 |
| FS-052-EL-029.4 | FS-052-SEC-10 | 마일스톤 행 — 완료 토글 | 입력 | `ToggleSwitch checked={milestone.done}`, `label={\`마일스톤 N 완료 여부\`}`, onLabel '완료' / offLabel '진행'(`:120-127`) | O | **`ToggleSwitch` 는 quality-bar MOTION-03 이 명시 지목한 컴포넌트**다. ✔ **그 요구가 든 결함(reduced-motion off 누락)은 이번 기준(PR #26)에서 해소됐다** — `ToggleSwitch.css:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 transition 을 `prefers-reduced-motion: reduce` 에서 끈다(근거 `:76-78`). DS 소관인 것은 그대로이며 이 화면은 소비자다. 이 화면이 그 표면을 갖는 유일한 담당 화면이다(최대 12개) |
| FS-052-EL-029.5 | FS-052-SEC-10 | 마일스톤 행 — 삭제 | 버튼 | 손조립 아이콘 `<button>` + `TrashIcon`, `aria-label={\`마일스톤 N 삭제\`}`, danger 색(`:128-137`). **확인 다이얼로그 없이 즉시 제거**한다(`remove(id)` — `:84`) | — | **DS `<Button>` 이 아니다** — `iconButtonStyle` 손조립(`:39-52`). 다만 `tds-ui-focusable` 은 붙어 있다. 미저장 폼 상태의 제거라 이탈 가드가 최종 방어선이다 |
| FS-052-EL-029.6 | FS-052-SEC-10 | '마일스톤 추가' 버튼 | 버튼 | DS `<Button variant="secondary" size="md">` + `PlusCircleIcon`. **12개 미만일 때만 렌더된다**(`:142-149`). 새 행의 id 는 `ms-new-<Date.now()>-<0~1000 난수>`(`:59-64`) | — | **상한 도달 시 버튼이 사라진다** — 왜 사라졌는지 그 순간 설명이 없다(힌트에 '최대 12개'가 상시 표기돼 있을 뿐 — §7 #19). id 생성이 `Date.now()+난수` 라 이론상 충돌 가능(1/1000) |
| FS-052-EL-029.7 | FS-052-SEC-10 | 마일스톤 진척 요약 | 텍스트 | 마일스톤이 1개 이상이면 `마일스톤 진척 N%`(`milestoneProgress` = 완료수/전체수 반올림 — `types.ts:100-104`). tabular-nums(`:151-155`) | — | **표시 전용** — 이 값이 `progress` 필드(EL-028)에 반영되지 않는다(§7 #9) |
| FS-052-EL-029.8 | FS-052-SEC-10 | 마일스톤 오류 문구 | 텍스트 | `<p role="alert" style={errorTextStyle}>`(`:157-161`). 문구 2종(`validation.ts:88-108`): '모든 마일스톤의 이름을 입력하세요.' 또는 '모든 마일스톤의 목표일을 입력하세요.' | — | **어느 행이 틀렸는지 말하지 않는다** — 12행 중 하나가 비어도 문구는 같다. id 가 없어 `aria-describedby` 로 이을 수도 없다(§7 #6·#20) |
| FS-052-EL-030 | FS-052-SEC-11 | 산출물 textarea | 입력 | `TextareaField label="산출물 (한 줄에 하나)"`. 값은 `deliverables.join('\n')`, 변경 시 `value.split('\n').map(trimStart)` 로 되돌린다(`:463-477`). `maxLength=1000`, 3행, `N/1000` 카운터 | O | **배열을 문자열로 왕복 변환**한다. 저장 시 각 줄 trim + 빈 줄 제거(`:167`) — 즉 **편집 중 빈 줄은 남지만 저장하면 사라진다**. 검증 없음(`z.array(z.string())`) |
| FS-052-EL-031 | FS-052-SEC-11 | 메모 textarea | 입력 | `TextareaField label="메모"`, `maxLength=500`, 2행, placeholder '내부 메모'(`:478-486`) | O | 검증 없음. `TextareaField` 가 `aria-invalid`/`describedby`/`required` 를 내부 배선(`TextareaField.tsx:62-67`) |
| FS-052-EL-032 | FS-052-SEC-12 | 파이프라인 스텝퍼 | 표시 | **단계가 '실주'가 아닐 때**(`:493-497`) `PipelineStepper stage={stage}`. `<ol aria-label="파이프라인 단계">` + `PIPELINE_FLOW`(실주 제외 5단계 — `types.ts:73-75`) 각 스텝: 번호 점(`aria-hidden`) + 라벨. 현재 단계까지 채움(`done = index <= currentIndex`), 현재 단계는 테두리가 medium(`PipelineStepper.tsx:41`) | — | **읽기 전용 표시다 — 클릭할 수 없다.** 단계 변경은 EL-023 의 select 가 한다. 점이 `aria-hidden` 이라 AT 는 라벨만 읽고 **어느 단계가 현재인지 알 수 없다**(굵기·색으로만 인코딩 — §7 #21) |
| FS-052-EL-033 | FS-052-SEC-12 | 실주 배지 | 배지 | **단계가 '실주'일 때** 스텝퍼 대신 `StatusBadge tone="danger" label="실주 — 종료"`(`:494`) | — | 실주는 흐름 밖 종료라 스텝퍼에 자리가 없다(`PipelineStepper.tsx:3-4` 주석) |
| FS-052-EL-034 | FS-052-SEC-12 | 미리보기 요약 3행 | 텍스트 | ① '현재 단계' + `StatusBadge`(EL-008.3 과 같은 톤 규칙) ② '예상매출' + `formatWon(expectedRevenue)` ③ `가중 예상매출 (N%)` + `formatWon(weightedRevenue({ expectedRevenue, probability }))`(`:498-511`). 가중 = `Math.round(예상매출 × 확률 / 100)`(`types.ts:95-97`) | — | **입력 중 실시간 반영**된다(`watch` 기반). 입력값은 `digitsToNumber`/`clampPercent`(`:145-150`)로 정규화 — 확률 150 을 쳐도 미리보기는 100 으로 계산한다(검증은 별도로 거절) |
| FS-052-EL-035 | FS-052-SEC-13 | '취소' 버튼 | 버튼 | footer 우측 그룹의 왼쪽. `secondary` `size="md"`, `type="button"`. 저장 중 비활성. 클릭 시 `navigate('/sales/projects')`(`:517-525`) | — | FS-052-EL-015 와 **목적지가 같다**. 프로그램 이동이라 가드 밖(§7 #16) |
| FS-052-EL-036 | FS-052-SEC-13 | '등록'/'저장' 버튼 | 버튼 | footer 우측. `primary` `size="md"`, `type="submit"`. 라벨 '저장 중…'/(수정)'저장'/(등록)'등록'. 비활성 조건 `saving \|\| loadingDetail`(`:526-528`) | O | 진행 상태를 `loading` prop 이 아니라 **손으로 쓴 라벨**로 표현한다(§7 #22) |
| FS-052-EL-037 | FS-052-SEC-13 | 제출 규칙 | 텍스트 | `<form onSubmit={submit} noValidate>`(`:285`) → `form.handleSubmit(onValid, onInvalid)`(`useCrudForm.ts:260`). `onValid`(`:200-238`): ① **동기 제출 락** `if (submitLockRef.current) return; submitLockRef.current = true`(`:201-203`) ② 서버 오류·참조 초기화 ③ `AbortController` 생성 ④ `toInput(values)` ⑤ **제출 시도 단위 멱등키** `takeIdempotencyKey()`(`:211`) ⑥ `update.mutate`/`create.mutate` 에 `{ id?, input, signal, idempotencyKey }` ⑦ 성공 시 키 폐기 + 토스트 + `navigate(listPath, { replace: true })` ⑧ `onSettled` 가 락 해제. `onInvalid`(`:246-248`)도 락을 푼다 | O | 비표시 규칙. **RHF `shouldFocusError` 기본값이 첫 invalid 필드로 포커스를 옮기고, `onInvalid` 를 명시해 계약으로 고정**한다(주석 `:240-245` — A11Y-13) |
| FS-052-EL-038 | FS-052-SEC-13 | 저장 성공 토스트 | 토스트 | `` `프로젝트${objectParticle('프로젝트')} ${verb}했습니다.` `` → '프로젝트를 등록했습니다.' / '프로젝트를 저장했습니다.'(`useCrudForm.ts:222`) | — | 비표시. **조사를 `objectParticle` 이 런타임에 고른다**(ERP-13). 성공 후 목록으로 `replace` 이동 |
| FS-052-EL-039 | FS-052-SEC-15 | 409 충돌 다이얼로그 | 모달 | `<FormConflictDialog conflict={conflict} />`(`:532`). 저장이 409/412 로 실패하면(`isConflict(cause)` — `useCrudForm.ts:166`) **성공 토스트도 목록 이동도 없이** 다이얼로그를 띄운다: 메시지는 서버 문구(어댑터는 '다른 사용자가 먼저 삭제한 항목입니다.' — `crud.ts:127`), '최신 불러오기'(`reload` → `detailQuery.refetch()` → 폼을 서버 최신본으로 덮는다) / '닫기'(`dismiss` → **입력을 그대로 두고 사용자가 이어서 편집**) | O | 비표시. **입력이 보존된다**(EXC-04). 이 섹션에서 **이 화면만 이것을 갖는다** — FS-051 은 같은 409 를 generic 배너로 뭉갠다 |
| FS-052-EL-040 | FS-052-SEC-15 | 422 필드 오류 매핑 | 텍스트 | 저장이 422 로 실패하고 `violations` 가 있으면(`isUnprocessable` — `useCrudForm.ts:182`) 폼 배너가 아니라 **각 필드에 `setError(violation.field, { type:'server', message })`** 를 꽂고 **첫 필드로 `setFocus`**(`:184-191`) | O | 비표시 규칙. **서버 필드 오류가 클라이언트 zod 오류와 같은 인라인 슬롯을 재사용한다**(EXC-07). 단 그 슬롯의 `aria-describedby` 배선은 필드마다 다르다(§7 #6) |
| FS-052-EL-041 | FS-052-SEC-15 | 미저장 이탈 가드 | 모달 | `useUnsavedChangesDialog(isDirty && !saving, { message })`(`:223`). `isDirty` 는 **RHF `formState.isDirty`**(`useCrudForm.ts:261`). 3경로: beforeunload · 앱 내 링크 capture · popstate sentinel. 문구 '프로젝트에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.'(`:47-48`) | — | 비표시. **`navigate()` 프로그램 이동(EL-015·EL-035)과 저장 성공 후 `replace` 이동은 가로채지 않는다** — 후자는 의도된 통과다(저장 후 `isDirty` 가 아직 true 라도 `saving` 이 true 였다가 이동한다 — §7 #16) |
| FS-052-EL-042 | FS-052-SEC-15 | 언마운트 abort | 텍스트 | `useEffect(() => () => controllerRef.current?.abort(), [])`(`useCrudForm.ts:93`). abort 는 실패로 통지하지 않고(`isAbort(cause)` → return — `:162`), 성공 콜백도 `controller.signal.aborted` 면 아무것도 하지 않는다(`:218`) | — | 비표시 규칙(훅 소유) |
| FS-052-EL-043 | FS-052-SEC-08 | 폼 값 ↔ 입력 변환 규칙 | 텍스트 | `toInput`(`:152-171`): 문자열 → 숫자(`digitsToNumber` = 숫자 아닌 문자 제거 후 `Number`, 빈 값은 0) · 확률/진척은 `clampPercent`(100 상한) · 이름·거래처·담당자·메모·마일스톤 이름 trim · 산출물은 trim 후 빈 줄 제거 · **실주가 아니면 `lostReason = ''`**. `toValues`(`:173-189`): 숫자 → `String()`, 배열은 얕은 복사 | — | 비표시 규칙. **`clampPercent` 가 조용히 100 으로 자른다** — 검증이 먼저 거절하므로 도달하지 않지만, 검증을 우회한 값이 오면 소리 없이 바뀐다 |
| FS-052-EL-044 | FS-052-SEC-04 | 목록 → 폼 진입 규칙 | 텍스트 | 행 클릭(EL-008.10)·연필 버튼(EL-008.9)이 모두 `onEdit(item)` → `/sales/projects/<id>/edit`(`:209`). **읽기 전용 상세 라우트가 없다** | — | 비표시 규칙. 쓰기 권한 없는 역할도 편집 폼에 진입한다(§7 #10) |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-052-EL-001 | 매치 0건이면 EL-010 의 '검색 0건' 분기 | 조회 중에도 입력 가능(대상이 빈 배열) | N/A — 서버를 호출하지 않는다 | 자유 텍스트. 길이·문자 제약 없음. 앞뒤 공백 제거. 빈 문자열은 '검색 해제'라 언제나 커밋 | §4.1 공통 규칙 적용 | **조합 중에는 커밋하지 않는다.** URL 이 원천이라 뒤로가기가 이전 검색어를 되살린다. 커밋 시 선택이 해제된다(EL-014) | 커밋마다 전량을 훑는다 — 250ms 디바운스가 횟수를 줄이지만 건수 비례 비용은 남는다(§7 #2) |
| FS-052-EL-002 | 그 단계 0건이면 EL-010 의 '필터 0건' 분기 | 조회 중 조작 가능 | N/A — 클라이언트 필터 | 모르는 값은 `parseFilter` 가 '전체'로 되돌린다 | §4.1 공통 규칙 적용 | URL 이 원천. 변경 시 선택 해제(EL-014) | 선택지 6+1개 고정 |
| FS-052-EL-003 | N/A — 규칙 자체 | 조회와 무관하게 URL 이 먼저 결정된다 | N/A — 서버 호출 없음 | 모르는 값은 되돌리고 기본값은 URL 에서 지운다 | §4.1 공통 규칙 적용 | **이것이 경합 해소 규칙이다** — Back/F5/링크 공유가 같은 view 를 낸다 | 파라미터 2개(`stage`·`q`) |
| FS-052-EL-004 | N/A — 항상 표시 | 조회 중에도 표시·클릭 가능 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 — **쓰기 권한 없는 역할에게도 보인다**(§7 #10) | N/A — 이동만 | N/A — 단일 버튼 |
| FS-052-EL-005 | 0건이면 '조건에 맞는 프로젝트 결과가 없습니다.' | **최초 로드 중에는 침묵**(빈 문자열) — 알릴 사실이 없다 | 실패면 '프로젝트 목록을 불러오지 못했습니다.' | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회 완료 시 새 건수를 알린다 | 문구 1줄 고정 |
| FS-052-EL-006 | 0건이면 '전체 0건' | 최초 로드에만 '불러오는 중…' | 실패 시 EL-011 이 이 자리를 대체 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **재조회 중 건수를 유지하고 '· 새로고침 중…' 만 덧붙인다** — 사실이 사라지지 않는다 | 천 단위 구분(`formatNumber`) |
| FS-052-EL-007 | 선택 0건이면 렌더되지 않는다 | 조회 중에도 선택은 유지된다 | 실패 시 EL-011 이 대체 | N/A — 입력 없음 | §4.1 — **삭제 권한 없는 역할에게도 보인다**(§7 #10) | **필터·검색이 바뀌면 선택이 해제돼 이 바가 사라진다**(EL-014) | **선택 범위가 현재 보이는 행뿐**이다 — 'all-matching-filter' 선택 개념이 없다(quality-bar EXC-18 P1) |
| FS-052-EL-008 | 0건이면 EL-010 으로 본문 대체 | EL-009 스켈레톤(최초만) + `aria-busy` | EL-011 로 요약·표 대체(툴바는 남는다) | N/A — 표 자체 입력 없음 | §4.1 공통 규칙 적용 | 조회 시점 스냅샷. **다른 관리자가 지운 행을 편집하면 409**(EL-039) | **상한 없음**(§7 #2) |
| FS-052-EL-008.1 | 행 없으면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 이진 | §4.1 공통 규칙 적용 | 필터·검색 변경 시 해제(EL-014). **전체 선택은 보이는 행만** 담는다 | 행 수만큼. Shift 범위 선택 없음(EXC-18 P1) |
| FS-052-EL-008.2 | 행 없으면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 재조회·필터로 순서가 바뀌면 다시 매겨진다 | 페이지네이션 도입 시 공식이 틀어진다(§7 #12) |
| FS-052-EL-008.3 | 행 없으면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | 6개 단계 고정 |
| FS-052-EL-008.4 | 이름이 빈 문자열이면 빈 칸(**검증이 막으므로 서버 데이터가 깨졌을 때만**) | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | **truncate 없음** — 긴 이름이 열을 넓힌다(§7 #11) |
| FS-052-EL-008.5 | 거래처가 비면 빈 칸 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | **거래처 레코드가 개명돼도 이 문자열은 안 바뀐다** — 참조가 아니라 사본이다(§7 #7) | truncate 없음 |
| FS-052-EL-008.6 | 0원이면 '0원' | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | **단위가 숫자에 붙어 자릿수 정렬이 깨진다**(§7 #13) |
| FS-052-EL-008.7 | 날짜가 비면 `' ~ '` 만 남는다(**검증이 막으므로 서버 데이터가 깨졌을 때만**) | 조회 중 스켈레톤 | **유효하지 않은 날짜도 원본 그대로 렌더된다** — `formatDate` 폴백을 거치지 않기 때문(§7 #14) | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | nowrap + tabular-nums |
| FS-052-EL-008.8 | 0이면 빈 막대 + '0%' | 조회 중 스켈레톤 | 조회 실패 시 미표시 | 0~100 밖 값도 **막대는 클램프되지만 숫자 라벨은 원본을 보인다**(`:88` vs `:154`) — 서버가 150 을 주면 막대는 100%, 라벨은 '150%' | §4.1 공통 규칙 적용 | 조회 시점 값 | 행마다 순수 계산 1회 |
| FS-052-EL-008.9 | 행 없으면 없음 | 조회 중 스켈레톤 행이라 버튼이 없다 | 삭제 실패는 EL-012 의 다이얼로그 배너 | N/A — 입력 없음 | §4.1 — **권한 없는 역할에게도 보인다**(§7 #10) | 삭제 진행 중인 행은 비활성. **다른 관리자가 먼저 지웠으면 409**(`crud.ts:139-141`) | 행마다 2개 |
| FS-052-EL-008.10 | 행 없으면 규칙이 걸리지 않는다 | 조회 중 스켈레톤 행이라 걸리지 않는다 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 — **읽기만 되는 역할도 편집 폼에 진입한다**(§7 #10) | 이동 후 폼이 상세를 재조회한다. **그 사이 삭제됐으면 EL-018 의 404 분기** | N/A — 행 단위 |
| FS-052-EL-009 | N/A — 도착 전 상태 | 이것이 로딩 표현. 5행 × 9셀 | 조회 실패 시 EL-011 로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **재조회에서는 뜨지 않는다** — 이전 행이 유지된다(STATE-01) | 행 수가 하드코딩 5(§7 #12) |
| FS-052-EL-010 | 이것이 빈 상태 표현. 3분기 + 복구 액션 | 최초 로드 중에는 스켈레톤이 이 자리 | 조회 실패 시 EL-011 로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 복구 액션이 URL 을 고쳐 즉시 반영 | N/A — 1행. **진짜 0건에 생성 CTA 가 없다**(§7 #15) |
| FS-052-EL-011 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 스켈레톤으로 | 이것이 실패 표현. 1문구 고정. 복구 '다시 시도'. **status 로 분기하지 않는다**(§7 #23) | N/A — 입력 없음 | §4.1 — 권한 부족(403)도 이 배너 | 재시도는 같은 조회를 재발행. 조건은 URL 에 있어 유지 | N/A — 표시 전용 |
| FS-052-EL-012 | N/A — 대상이 있어야 성립 | **busy 중 confirm 비활성 + aria-busy**(DS `ConfirmDialog`) | **실패해도 다이얼로그가 열려 있고 danger 배너가 뜬다.** 재클릭이 retry | N/A — 입력 없음 | §4.1 — 서버 403 도 '삭제하지 못했습니다'로 뭉개진다 | **취소/Esc/dim 이 in-flight 를 abort + `reset()`** 해 false toast 없이 버튼 상태가 복원된다. 이미 지워진 항목이면 **409 '이미 삭제된 항목입니다.'**(`crud.ts:139-141`)가 배너 문구로 뭉개진다 | 단건 |
| FS-052-EL-013 | 선택 0건이면 `onConfirmBulkDelete` 가 즉시 return(`useCrudList.tsx:128`) | busy 중 confirm 비활성 | **부분 실패 시 다이얼로그 유지 + 'N건 중 M건' 배너.** 전량 성공에만 목록 무효화 + 선택 해제 + 토스트 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | `settleAll` 이 개별 실패를 센다. **abort 는 실패로 세지 않는다**(`crud.ts:352`) | **상한·진행률·취소가 없다** — 1,000건 선택 시 확인 문구만 커진다(quality-bar EXC-18 P1). **실패한 id 를 모른다**(EXC-10 P1) |
| FS-052-EL-014 | N/A — 선택이 있어야 의미 | 조회 중에도 규칙은 성립 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체다** — 보이지 않는 행이 선택된 채 남지 않는다 | N/A — 규칙 |
| FS-052-EL-015 | N/A — 항상 표시 | 조회 중에도 표시 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 중에도 누를 수 있다 — 이탈 시 EL-042 가 abort | N/A — 단일 버튼 |
| FS-052-EL-016 | N/A — 정적 문구 | `loadingDetail` 중에도 표시된다 | 조회 실패 시 EL-018 이 화면 전체를 대체해 이 제목도 사라진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | `isEdit` 는 라우트 고정값 | 문구 2종 |
| FS-052-EL-017 | N/A — 정적 문구 | 위와 동일 | 위와 동일 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A | 고정 문구 |
| FS-052-EL-018 | N/A — 실패 상태 | **`loadingDetail` 중에는 폼이 비활성(`disabled`)이지만 스켈레톤은 없다** — 빈 폼이 잠깐 보인다(§7 #24) | 이것이 실패 표현. **404 → 목록으로만 / 오류 → 다시 시도 + 목록으로**(EXC-12 충족). 어댑터가 `HttpError(404)` 를 던져(`crud.ts:105-107`) `isNotFound` 가 판정한다 | N/A — 입력 없음 | §4.1 — **404 은닉도 이 배너로 떨어진다**(BE-052 §7.1) | 다른 관리자가 그 사이 지웠으면 404 분기 — **재시도를 권하지 않는 것이 옳다** | N/A — 표시 전용. **⚠ 두 문구 모두 조사가 빠져 비문**(§7 #4) |
| FS-052-EL-019 | N/A — 오류 없으면 미렌더 | 재저장 시 먼저 지운다(`:205`) | 이것이 저장 실패 표현 + **참조 코드**. 409·422 는 여기로 오지 않는다 | **클라이언트 검증 실패는 여기 오지 않는다** — 필드 인라인으로 간다 | §4.1 — **403 은 이 배너로 뭉개진다**(§7 #23) | 409 는 EL-039 가 가로챈다 | 1건 |
| FS-052-EL-020 | 초기값 `''`(등록) / 원본(수정) | `disabled = saving \|\| loadingDetail` | 저장 실패는 EL-019 | **필수 + 80자**(`requiredText('프로젝트명', 80)`). 위반 시 `aria-invalid`+`aria-describedby`+`<p role="alert">` **짝으로** ✔ | §4.1 공통 규칙 적용 | 수정 진입 시 `reset(toValues(loaded))`(`useCrudForm.ts:131-134`) — **도착이 한 번뿐이라 편집 중 덮이지 않는다**(`loaded` 참조가 바뀔 때만) | `maxLength=80` 이 입력을 자른다 |
| FS-052-EL-021 | 초기값 `''` / 원본 | 위와 동일 | 저장 실패는 EL-019 | **필수 + 60자**. `aria-invalid`+`describedby` 짝 ✔. **`maxLength` 가 없어** 60자 초과 입력이 가능하고 제출 시 거절된다 | §4.1 공통 규칙 적용 | **거래처 레코드와 무관**하게 자유 편집(§7 #7) | 상한이 검증에만 있다 |
| FS-052-EL-022 | 초기값 `''` / 원본 | 위와 동일 | 저장 실패는 EL-019 | **검증 없음** — 빈 값·아무 문자열이나 통과 | §4.1 공통 규칙 적용 | 자유 텍스트 | 상한 없음 — 서버가 정해야 한다(BE-052 §4) |
| FS-052-EL-023 | N/A — 항상 값이 있다(기본 'lead') | `disabled` | N/A — 로컬 상태 | `z.enum(...)` 로 6개만 허용. **전이 검증은 없다**(§7 #5) | §4.1 공통 규칙 적용 | **다른 관리자가 먼저 단계를 바꿔도 감지하지 않는다** — 409 는 '존재 여부' 기반이라 잡지 못한다(BE-052 §7.3) | 선택지 6개 고정. **변경 시 확률을 조용히 덮는다**(§7 #17) |
| FS-052-EL-024 | 초기값 '10'(등록 기본) / 원본 | `disabled` | 저장 실패는 EL-019 | 숫자만 + 0~100(`percentString`). **음수는 `^\d+$` 가 막는다.** 소수점도 막힌다. 오류 `<p role="alert">` 는 뜨지만 **`aria-invalid`·`describedby` 가 없다**(§7 #6) | §4.1 공통 규칙 적용 | 단계 변경이 이 값을 덮는다(EL-023) | `maxLength` 없음 — 긴 입력도 검증이 거절 |
| FS-052-EL-025 | 초기값 '0' / 원본 | `disabled` | 저장 실패는 EL-019 | 숫자만(`^\d+$`). **상한이 없다** — 999조도 통과한다(§7 #25). 콤마·'원'·공백이 있으면 거절(§7 #18). `aria-invalid` 없음 | §4.1 공통 규칙 적용 | 조회 시점 값 | 상한 없음 — 서버가 정해야 한다 |
| FS-052-EL-026 | 실주가 아니면 **렌더되지 않는다** | `disabled` | 저장 실패는 EL-019 | 실주일 때만 필수. `aria-required` 주입 ✔ / `aria-invalid` 없음(§7 #6) | §4.1 공통 규칙 적용 | 단계를 실주에서 되돌리면 **입력값이 화면에서 사라지고 저장 시 `''` 가 된다**(EL-043) | 상한 없음 |
| FS-052-EL-027 | 초기값 `''`/`''`(등록) — **빈 값은 '실재 날짜 아님'이라 제출 시 거절** | `disabled` | 저장 실패는 EL-019 | 실재 날짜 + 종료≥시작. **⚠ 이번 기준(PR #28 · `5e86a3c`)에서 이 축의 동작이 바뀌었다** — 이전에는 이 화면의 사본 `isRealDate` 가 형식만 보고 실재 여부를 보지 않아 **`2026-02-31` 이 통과했다**. 정본 `isCalendarDate`(`shared/format.ts:244-249`)로 수렴해 **이제 거절한다**(`validation.ts:54` ×2). 회귀 테스트 `projects.test.ts:129` `달력에 없는 날짜(2026-02-31)를 주면 막는다`(주석 `:127-128` 이 사본의 결함을 기록). **두 오류가 같은 슬롯을 공유**(`errors.startAt?.message ?? errors.endAt?.message` — `:232`)라 **동시에 하나만 보인다**. invalid 시 `aria-invalid`+`describedby` 를 **두 입력에 짝으로** ✔. `required`+`aria-required` 도 **두 입력에** ✔ | §4.1 공통 규칙 적용 | 조회 시점 값 | **preset·범위 캘린더가 없다**(COMP-11 P1). 네이티브 date 입력이라 로케일은 브라우저가 정한다 |
| FS-052-EL-028 | 초기값 '0' / 원본 | `disabled` | 저장 실패는 EL-019 | 숫자만 + 0~100. `aria-invalid` 없음(§7 #6) | §4.1 공통 규칙 적용 | 조회 시점 값 | **마일스톤 완료가 이 값을 바꾸지 않는다** — 힌트가 그렇다고 말하는데도(§7 #9) |
| FS-052-EL-029 | 마일스톤 0개면 행이 없고 요약(EL-029.7)도 없다 — 추가 버튼만 | `disabled` 가 모든 행에 전파 | 저장 실패는 EL-019 | 필드 전체 오류 1개(EL-029.8) | §4.1 공통 규칙 적용 | 폼 로컬 상태 | **최대 12개**(`PROJECT_MAX_MILESTONES`) |
| FS-052-EL-029.1 | N/A — 항상 표시 | N/A | N/A | N/A — 표시 전용 | §4.1 공통 규칙 적용 | N/A | **힌트가 사실과 다르다**(§7 #9) |
| FS-052-EL-029.2 | 새 행의 초기값 `''` | `disabled` | 저장 실패는 EL-019 | **모든 행의 이름이 필수** — 하나라도 비면 EL-029.8. 저장 시 trim(`:165`) — **공백만 입력하면 검증은 통과하고(trim 전 판정) 저장에서 `''` 가 된다**(§7 #26) | §4.1 공통 규칙 적용 | 폼 로컬 | 최대 12행 × 상한 없는 길이 |
| FS-052-EL-029.3 | 새 행의 초기값 `''` — **저장 전에 반드시 채워야 한다** | `disabled` | 저장 실패는 EL-019 | **모든 행의 목표일이 실재 날짜여야 한다** — `milestones.some((m) => !isCalendarDate(m.dueDate))`(`validation.ts:95`). **⚠ 이번 기준(PR #28)에서 이 축도 정본으로 수렴했다** — **`2026-02-31` 을 목표일로 넣으면 이제 거절된다**(이전에는 통과했다). ⚠ **문구는 여전히 '모든 마일스톤의 목표일을 **입력**하세요.'(`:100`) 하나뿐이라** 빈 값과 실재하지 않는 날짜가 **같은 문구로 뭉개진다** — 날짜를 채웠는데 '입력하세요' 를 보게 된다(§7 #27) | §4.1 공통 규칙 적용 | 폼 로컬 | 최대 12행 |
| FS-052-EL-029.4 | 새 행의 초기값 `false` | `disabled` | 저장 실패는 EL-019 | N/A — 이진 | §4.1 공통 규칙 적용 | 폼 로컬 | 최대 12개. **transform transition 에 reduced-motion off 가 없다**(DS 소관 — MOTION-03) |
| FS-052-EL-029.5 | 행이 없으면 없음 | `disabled` | N/A — 로컬 제거 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 폼 로컬 | **확인 없이 즉시 제거.** 12행을 지우려면 12번 클릭 |
| FS-052-EL-029.6 | N/A — 12개 미만이면 항상 표시 | `disabled` | N/A — 로컬 추가 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 폼 로컬 | **12개에서 버튼이 사라진다** — 그 순간의 설명이 없다(§7 #19). id 가 `Date.now()+난수(0~1000)` 라 이론상 충돌 |
| FS-052-EL-029.7 | 0개면 렌더되지 않는다 | N/A — 순수 계산 | N/A | N/A — 파생값 | §4.1 공통 규칙 적용 | 폼 로컬 | 12개까지 순수 계산 1회 |
| FS-052-EL-029.8 | 오류 없으면 미렌더 | N/A | N/A — 클라이언트 검증 | **이것이 유효성 표현.** 문구 2종, **어느 행인지 말하지 않는다**(§7 #20) | §4.1 공통 규칙 적용 | N/A | 12행 중 하나만 틀려도 문구는 같다 |
| FS-052-EL-030 | 초기값 `[]` → `''` | `disabled` | 저장 실패는 EL-019 | 검증 없음. 1000자 상한(네이티브). 저장 시 빈 줄 제거 | §4.1 공통 규칙 적용 | 폼 로컬 | **1000자 상한이 배열 전체 합**이다. 카운터 `N/1000` |
| FS-052-EL-031 | 초기값 `''` | `disabled` | 저장 실패는 EL-019 | 검증 없음. 500자 상한(네이티브) | §4.1 공통 규칙 적용 | 폼 로컬 | 500자. 카운터 `N/500` |
| FS-052-EL-032 | N/A — 항상 5스텝 | 값이 없어도 렌더된다(기본 'lead') | N/A — 표시 전용 | N/A — 파생값 | §4.1 공통 규칙 적용 | 폼 로컬 값을 즉시 반영 | 5스텝 고정. **현재 단계가 색·굵기로만 인코딩**(§7 #21) |
| FS-052-EL-033 | N/A — 실주여야 성립 | 위와 동일 | N/A | N/A — 파생값 | §4.1 공통 규칙 적용 | 폼 로컬 | 1개 |
| FS-052-EL-034 | 값이 비면 '0원' / '가중 예상매출 (0%)' | 위와 동일 | N/A | **검증 실패 중에도 계산된다** — 확률 150 이면 `clampPercent` 가 100 으로 보정해 미리보기를 그린다(오류 문구는 별도로 뜬다) | §4.1 공통 규칙 적용 | 폼 로컬 값을 즉시 반영 | 3행 고정 |
| FS-052-EL-035 | N/A — 항상 표시 | 저장 중 비활성 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A | N/A |
| FS-052-EL-036 | N/A — 항상 표시 | 요청 중 '저장 중…' + 비활성. `loadingDetail` 중에도 비활성 | 실패 시 EL-019/EL-039/EL-040, 이동 없음, 입력 보존 | **클라이언트 검증 실패 시 제출되지 않고 첫 오류 필드로 포커스**(EL-037) | §4.1 — **권한 없는 역할에게도 보인다**(§7 #10) | **동기 락 + 멱등키가 있다** — 연타가 두 요청을 만들지 않는다(EL-037) | 단건 저장 |
| FS-052-EL-037 | N/A — 규칙 | 락이 첫 클릭에 걸린다 | `onSettled` 가 실패에도 락을 푼다 | `onInvalid` 도 락을 푼다 — **검증 실패 후 재제출이 막히지 않는다** | §4.1 공통 규칙 적용 | **재시도가 같은 멱등키를 재사용**한다(`idempotencyKeyRef`) — 어댑터 원장이 재생한다(`crud.ts:114,121`). **성공해야 키를 버린다**(`:220`) — 실패한 첫 시도가 키를 태우지 않는다 | 단건 |
| FS-052-EL-038 | N/A — 성공이 있어야 성립 | N/A | N/A — 실패는 배너/다이얼로그 | N/A | §4.1 공통 규칙 적용 | **유령 저장이 없다** — 없는 id 는 409(`crud.ts:126-128`) | 1건 |
| FS-052-EL-039 | N/A — 409 가 있어야 성립 | N/A — 결과 통지 | **이것이 409 표현.** 성공 토스트·이동 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 표현이다.** 단 어댑터의 409 는 **'대상이 존재하는가'만** 본다 — **둘 다 존재하는 동시 편집은 409 없이 last-write-wins**(BE-052 §7.3) | 1건 |
| FS-052-EL-040 | N/A — 422 + violations 가 있어야 성립 | N/A | **이것이 서버 필드 오류 표현** | **서버 오류가 클라이언트 오류와 같은 슬롯을 쓴다** | §4.1 공통 규칙 적용 | N/A | violations 수만큼 |
| FS-052-EL-041 | N/A — dirty 여야 성립 | 저장 중에는 비활성(`isDirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 성공 후 `replace` 이동 — 그때는 `saving` 이 true 라 가드가 꺼져 있다 | N/A — 표시 전용 |
| FS-052-EL-042 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | **abort 는 실패가 아니다** | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 이탈 시 취소 — **서버 도달 여부는 보장하지 않는다** | 단건 |
| FS-052-EL-043 | 빈 문자열 → 0 | N/A — 순수 변환 | N/A | **검증을 통과한 값만 도달한다** — 그러나 `clampPercent` 는 조용히 자른다 | §4.1 공통 규칙 적용 | N/A | 마일스톤 12개까지 map |
| FS-052-EL-044 | 행 없으면 성립 안 함 | N/A | 폼에서 404 면 EL-018 | N/A | §4.1 — **읽기 전용 역할도 폼에 진입**(§7 #10) | 진입 후 폼이 상세를 재조회 | N/A |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 목록 조회 실패는 인라인 배너(EL-011), 폼 상세 조회 실패는 404/오류 분기 배너(EL-018), 저장 실패는 폼 배너(EL-019). 삭제 실패는 다이얼로그 내부 배너(EL-012·EL-013). **오프라인 감지·복귀 재조회는 앱 전역에 없다**(`navigator.onLine` 0건) — §7 #27 |
| 세션 만료 | 앱 전역 401 인터셉터(`queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `RequireAuth` 감시자 → `/login?returnUrl=<현재경로>&reason=session_expired`). 재로그인 후 원래 경로로 복귀. **다만 미저장 폼 내용은 그때 사라진다** — 프로그램적 이동이라 EL-041 가드가 발화하지 않는다 — §7 #27 |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건). abort 는 화면 이탈(EL-042)·다이얼로그 취소(EL-012·EL-013) 시에만 발생한다 — §7 #27 |
| 중복 제출 | **충족.** 저장은 `disabled` + **동기 제출 락**(`submitLockRef` — `useCrudForm.ts:103,201-203`) + **제출 시도 단위 멱등키**(`idempotencyKeyRef`/`takeIdempotencyKey` — `:118-123`)로 3중 방어한다. 키는 `mutate` 의 **variables 로** 실려(`:228,235`) 재시도가 같은 키를 재사용하고, 어댑터의 원장(`crud.ts:62-72`)이 재생한다. **삭제는 멱등키를 쓰지 않는다**(`DeleteVars` 에 자리가 없다 — `crud.ts:319-322`) — 매번 확인 다이얼로그를 거치므로 의도된 설계다(`crud.ts:36-38` 주석) |
| 실패 통지의 자리 | ① 목록·상세 조회 실패는 인라인 배너 ② 저장 실패는 폼 상단 배너 + **참조 코드** ③ 409 는 **전용 다이얼로그** ④ 422 는 **필드 인라인 + 포커스** ⑤ 삭제 실패는 **다이얼로그 내부 배너**(토스트가 모달 뒤에 숨지 않는다) ⑥ 저장·삭제 **성공**은 토스트 ⑦ abort 는 아무것도 띄우지 않는다. **quality-bar FEEDBACK-01 의 배치 규칙을 전 경로에서 만족한다** |
| 낙관적 업데이트 | **이 화면에 없다.** 저장·삭제 모두 비관적(pending 잠금 → 성공 후 무효화·이동). `onMutate`/`setQueryData` 0건 — 롤백 경로가 필요 없다 |
| 동시 조회 | 목록/상세 조회는 각각 동시에 1건만 유지된다(react-query). `staleTime` 30초 · 자동 재시도 없음 · 창 포커스 재조회 없음. 검색어가 쿼리 키에 들어가지 않아(전량 조회) last-response-wins 경쟁이 없다 |
| 권한 없음 | **프론트 역할 분기 없음.** 라우트 read 권한은 `RequirePermission` 이 `<Outlet>` 을 감싸 가드해 403 화면을 렌더하고(`RequirePermission.tsx:61-64`), 라우트→리소스 파생이 `/sales/projects/new`·`/:id/edit` 까지 덮는다. 그러나 **쓰기 게이팅(`useRouteWritePermissions`)이 이 화면에 배선돼 있지 않다**(§7 #10) — 등록 버튼·행 액션·일괄 삭제·제출 버튼이 전부 무조건 렌더된다. 서버 권한 응답은 조회=인라인 배너, 저장=폼 배너, 삭제=다이얼로그 배너로 떨어진다. 은닉 정책(403 vs 404)은 BE-052 §7.1 이 확정 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary` 를 둔다 — 화면이 던져도 사이드바·헤더가 남고 복구 화면(`RouteErrorScreen`)이 뜬다 |
| 행 선택의 수명 | 선택은 `useCrudList`→`useRowSelection` 이 소유하고, **필터·검색 변경 시 화면이 `clear()` 로 잇는다**(EL-014). 일괄 삭제 성공 시에도 해제된다(`useCrudList.tsx:145`). **페이지 개념이 없어 page 변경 해제는 걸리지 않는다** |
| 단계 전이 규칙 | **없다.** 어느 단계에서 어느 단계로도 갈 수 있다 — `PipelineStepper` 는 **읽기 전용 표시**이고 검증에도 전이 규칙이 없다(`validation.ts` 는 `z.enum` 만). 유일한 부수효과는 **확률 자동 채움**(EL-023)이며 그것은 규칙이 아니라 편의다. FS-026 의 `STATUS_FLOW`·`canSetStatus` 에 대응하는 것이 이 도메인에 **없다** — 전이 규칙의 정본은 서버가 정해야 한다(BE-052 §7.2) |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| EL-005 / EL-006 / EL-008 / EL-011 | 프로젝트 목록 조회 | R | 프로젝트 전량(필터·검색·정렬·페이징 없이) | `projectAdapter.fetchAll(signal)` | 필터·검색·정렬이 **전부 클라이언트**다 |
| EL-018 / EL-020~EL-034 (수정 진입) | 프로젝트 상세 조회 | R | 프로젝트 1건 | `projectAdapter.fetchOne(id, signal)` (`useCrudItem` 경유 — `enabled: id !== ''`) | **없는 id 는 `HttpError(404)`**(`crud.ts:105-107`) → EL-018 의 404 분기 |
| EL-036 / EL-037 (등록) | 프로젝트 등록 | W | `ProjectInput` 전체 | `projectAdapter.create(input, { signal, idempotencyKey })` | 성공 시 목록 무효화(`crud.ts:290-292`) + 토스트 + 목록으로 `replace` |
| EL-036 / EL-037 (수정) | 프로젝트 수정 | W | id + `ProjectInput` 전체 | `projectAdapter.update(id, input, { signal, idempotencyKey })` | 전체 치환. 성공 시 목록·상세 무효화(`:312-315`). **없는 id 는 `HttpError(409)`** → EL-039 |
| EL-008.9 / EL-012 | 프로젝트 단건 삭제 | W | id | `projectAdapter.remove(id, { signal })` — **멱등키 없음** | 성공 시 목록 무효화. **없는 id 는 `HttpError(409, '이미 삭제된 항목입니다.')`**(`crud.ts:139-141`) |
| EL-007 / EL-013 | 프로젝트 일괄 삭제 | W | id 배열 | `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`) | **개별 요청 N개**를 병렬로 낸다 — 서버에 일괄 엔드포인트가 없다. 전량 성공에만 무효화 |

> **현재 구현 상태 (백엔드 명세 참고)**: 백엔드는 없다. `projectAdapter` 는 공용 `createCrudAdapter`(`shared/crud/crud.ts:86-147`)에 시드 3건(`PROJECT_SEED`)을 넣어 만든 것으로, 400ms 지연(`LATENCY_MS`)과 개발용 실패 스위치(`failIfRequested('sales-projects', op)`)를 얹어 CRUD 를 흉내 낸다 — 실제 네트워크 0건. `patch` 는 `(item, input) => ({ ...item, ...input })` 라 **부수효과가 없다**(FS-051 의 견적 발행과 갈리는 지점). 팩토리 덕에 **404**(`fetchOne`) · **409**(`update`/`remove` 의 없는 id) · **멱등 원장**이 전부 발현되고, **화면이 `useCrudForm` 을 써서 그 셋을 모두 소비한다** — 404 는 EL-018 분기로, 409 는 EL-039 다이얼로그로, 멱등키는 EL-037 이 실제로 넘긴다. `data-source.ts:66` 의 `// TODO(backend): GET/POST /api/sales/projects · GET/PUT/DELETE /api/sales/projects/:id` 가 유일한 연동 지점이다. 새로고침하면 시드로 되돌아간다. 위 표는 백엔드 연결 후 의도된 동작이다.

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `ProjectListPage.tsx` · `ProjectFormPage.tsx` · `types.ts` · `validation.ts` · `data-source.ts` · `components/{PipelineStepper,ProjectMilestonesField}.tsx` · `projects.test.ts` + 소비하는 공용 모듈(`shared/crud/{crud,useCrudList,useCrudForm,CrudListShell,CrudTable,useListState,useDebouncedSearch,parseFilter,dev}` · `packages/ui/.../{FormField,DateRangeField,TextareaField,Empty,ToggleSwitch}`)
- [x] **`PipelineStepper` 가 상태 전이 컨트롤이 아니라 읽기 전용 표시임을 코드로 확인**했다(`PipelineStepper.tsx:74-93` — onClick 0건, `<ol>` + `<span>` 만). 단계 변경은 EL-023 의 select 가 하고 **전이 규칙은 어느 층에도 없다**(§4.1 · §7 #5) — 없는 규칙을 있는 것처럼 쓰지 않았다
- [x] **`ProjectMilestonesField`(동적 배열)의 예외를 대량·유효성 축에 정직히** 적었다 — 상한 12(도달 시 버튼 소멸) · 행별 오류를 구분하지 않는 단일 문구 · 확인 없는 즉시 삭제 · `Date.now()+난수` id · 진척률 힌트가 사실과 다름
- [x] **실재 결함을 발견해 기록했다** — EL-018 의 '프로젝트 찾을 수 없습니다'/'프로젝트 불러오지 못했습니다'는 **조사가 빠진 비문**이며 형제 화면(`QuoteFormPage.tsx:236-237` · `ContractFormPage.tsx:222-223`)은 '견적을'/'계약을'로 옳다(§7 #4)
- [x] 보이지 않는 요소(라이브 리전·스켈레톤·빈 상태·실패 배너·삭제 다이얼로그·선택 해제 규칙·409 다이얼로그·422 매핑·이탈 가드·abort·제출 규칙·값 변환 규칙)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. **일괄 삭제가 서버 일괄 엔드포인트가 아니라 개별 요청 N개**임을 명시했다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-052 영역) — 단 어댑터가 실제로 던지는 `HttpError(404)`/`HttpError(409)` 는 **화면 동작의 원인**이라 §4·§5 에 사실로만 인용했다
- [x] **이 화면이 공용 CRUD 셸을 전량 소비해 FS-051·FS-053 과 판정이 갈린다는 사실**을 §1 에 명시했다 — 기준이 다른 것이 아니다
- [x] §7 의 미결 항목이 BE-052 §7.7 후속 이관 · NFR-052 §5 와 일치한다

## 7. 미결 사항 (UI 기획 / 아키텍처 / 백엔드 명세 / 프론트 구현 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (영업 관리 SCR 미작성) | UI 기획 / 아키텍처 |
| 2 | **페이지네이션이 없다** — `CrudListShell` 이 `<Pagination>` 을 렌더하지 않는다(`CrudListShell.tsx:97-169` 에 0건). 프로젝트는 누적 증가 컬렉션이다(quality-bar IA-04 P0 · ERP-15 P1). **셸 자체의 결함이라 이 화면만의 문제가 아니다 — 셸 소비 화면 전부에 걸린다** | UI 기획 (셸 배치) · 백엔드 명세 |
| 3 | 폼이 **자체 `<h1>`(`:279`)를 그리고 AppHeader 도 `<h1>` 을 그린다**. `findCoveringLeaf`(`nav-config.ts:269-279`) 덕에 AppHeader 는 가지 라벨('영업 관리')이 아니라 **잎 라벨 '프로젝트'** 를 보인다 — 절반은 해소됐다. 그러나 **`<h1>` 이 2개**이고 primary title 이 '등록'인지 '수정'인지 말하지 않는다(`nav-config.ts:293-295` 가 '행위는 제목에 넣지 않는다'를 의도로 선언)(quality-bar IA-02 P0) | 프론트 구현 · UI 기획 |
| 4 | **폼 조회 실패 문구가 비문이다** — `ProjectFormPage.tsx:249-250` 의 '프로젝트 찾을 수 없습니다'·'프로젝트 불러오지 못했습니다'에 **목적격 조사 '를' 이 빠졌다**. 형제 화면은 옳다(`QuoteFormPage.tsx:236-237` '견적을' · `ContractFormPage.tsx:222-223` '계약을'). `objectParticle('프로젝트')` 가 이미 있고(`shared/format.ts:306-308`) 같은 파일이 토스트에서 그것을 쓴다(`useCrudForm.ts:222`) — **헬퍼가 있는데 쓰지 않아 생긴 비문**이다(quality-bar ERP-13 P1 · ERP-06 P1). (`AccountFormPage.tsx:230-231` 이 같은 병을 앓는다 — 담당 밖이나 함께 고칠 것) | UI 기획 쪽 변경 요청 |
| 5 | **단계 전이 규칙이 어느 층에도 없다** — 리드에서 곧장 수주로, 수주에서 리드로 되돌아갈 수 있다. `PipelineStepper` 는 읽기 전용 표시라 아무것도 막지 않고, `validation.ts` 에도 전이 규칙이 없다(`z.enum` 만). **실주 → 다른 단계 복귀도 자유**인데, 그때 실주 사유가 조용히 `''` 로 지워진다(EL-043) | 아키텍처 (도메인 규칙 확정) · 백엔드 명세 (BE-052 §7.2) · UI 기획 |
| 6 | **4개 필드의 오류가 입력에 연결되지 않는다** — 확률(EL-024)·예상매출(EL-025)·진척률(EL-028)·실주 사유(EL-026)는 `FormField error={...}` 로 `<p role="alert" id="...-error">` 를 렌더하지만 **입력에 `aria-invalid` 도 `aria-describedby` 도 없다**. 같은 파일의 프로젝트명(`:307-310`)·거래처(`:329-332`)는 **짝을 정확히 세운다** — 한 폼 안에서 규칙이 갈렸다. 마일스톤 오류(EL-029.8)는 아예 id 가 없다. 시각 신호는 `controlStyle(errors.X !== undefined)` 의 **붉은 테두리뿐 — 색만의 오류 인코딩**이다(quality-bar A11Y-11 P0 · A11Y-16 P1) | UI 기획 쪽 변경 요청 |
| 7 | 거래처(EL-021)·담당자(EL-022)가 **선택지가 아니라 자유 텍스트**다 — `/sales/accounts` 레코드와 연결되지 않아 개명·병합이 반영되지 않고, 표기 흔들림('(주)한빛소프트웨어'/'한빛소프트웨어')을 막을 수단이 없다. 파이프라인 집계를 거래처별로 낼 수 없다 | 아키텍처 (도메인 경계) · 백엔드 명세 |
| 8 | 프로젝트명 셀(EL-008.4)이 **링크가 아니다** — 키보드 경로가 `RowActions` 의 연필 버튼뿐이다. 요구가 기대하는 형태는 'row 내 focusable name link'다(quality-bar A11Y-08 P1). **읽기 전용 상세가 없어** 이름 링크를 만들려면 목적지가 편집 폼이 된다 — IA 결정이 선행돼야 한다 | UI 기획 · 아키텍처 |
| 9 | **마일스톤 힌트가 거짓말이다** — '완료 표시에 따라 아래 진척률이 계산됩니다'(EL-029.1)라 쓰여 있지만 `milestoneProgress`(EL-029.7)는 **표시 전용**이고 `progress` 필드(EL-028)를 바꾸지 않는다. 운영자는 토글을 켜고 진척률이 안 바뀌는 것을 보게 된다. 문구를 고치거나 자동 계산을 구현해야 한다 | UI 기획 쪽 변경 요청 |
| 10 | **쓰기 권한 게이팅이 배선돼 있지 않다** — `useRouteWritePermissions` 소비자 7곳(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`)에 이 화면이 없다. **등록 버튼(EL-004)·행 액션(EL-008.9)·일괄 삭제(EL-007)·제출(EL-036)이 전부 무조건 렌더**되고, 읽기 전용 역할도 편집 폼에 진입한다(EL-044). `ProductListPage` 가 같은 셸을 쓰면서 게이팅을 하므로 **선례가 있다**(quality-bar EXC-03 P0) | UI 기획 쪽 변경 요청 |
| 11 | 프로젝트명·거래처 셀에 truncate 가 없어 긴 값이 표 열을 넓힌다(quality-bar COMP-09 P2) | UI 기획 쪽 변경 요청 |
| 12 | 스켈레톤 행 수가 하드코딩 `length: 5`(`CrudTable.tsx:144`)이고 `SeqCell seq={index + 1}`(`:179`)에 `startIndex` 가 없다 — #2 도입 시 2페이지 첫 행이 1로 리셋된다. **셸의 결함이라 소비 화면 전부에 걸린다**(quality-bar COMP-06 · COMP-07 P2) | UI 기획 (#2 와 함께) |
| 13 | 예상매출 셀(EL-008.6)이 `formatWon` 으로 '원'을 숫자에 붙여 **우측 정렬 시 단위가 마지막 자릿수를 따라다닌다**(quality-bar ERP-07 P2) | UI 기획 쪽 변경 요청 |
| 14 | 기간 셀(EL-008.7)이 `` `${item.startAt} ~ ${item.endAt}` `` 로 **원본 문자열을 직접 조립**한다 — 이 화면의 유일한 인라인 날짜 포맷이며 `shared/format` 을 경유하지 않는다. 유효하지 않은 날짜의 폴백도 없다(quality-bar ERP-08 P2) | UI 기획 쪽 변경 요청 |
| 15 | 빈 상태(EL-010)가 **진짜 0건일 때 생성 CTA 를 보이지 않는다** — 화면이 `empty.createAction` 을 넘기지 않는다(`:201-206`). 셸은 그 슬롯을 지원한다(`CrudTable.tsx:70-71,164`)(quality-bar STATE-05 P1) | UI 기획 쪽 변경 요청 |
| 16 | 이탈 가드(EL-041)가 **`navigate()` 프로그램 이동을 가로채지 못한다** — '목록으로'(EL-015)·'취소'(EL-035)를 누르면 미저장 내용이 조용히 사라진다. 훅이 가로채는 것은 `<a>` 클릭이다 | UI 기획 쪽 변경 요청 |
| 17 | 단계 변경(EL-023)이 **확률을 확인 없이 덮어쓴다** — 협상 단계에서 확률을 85로 손조정한 뒤 단계를 '제안'으로 되돌리면 50이 되고, 다시 '협상'으로 오면 **85가 아니라 70** 이다. 되돌릴 수 없다 | UI 기획 쪽 변경 요청 |
| 18 | 예상매출(EL-025)에 **실시간 천단위 마스킹이 없다** — 붙여넣은 '42,000,000' 이나 '42,000,000원' 은 `^\d+$` 검증에 걸려 거절되고, 운영자는 콤마를 손으로 지워야 한다. `toInput` 의 `digitsToNumber`(`:145-148`)는 콤마를 지울 수 있지만 **검증이 먼저 막는다**(quality-bar ERP-14 P1) | UI 기획 쪽 변경 요청 |
| 19 | 마일스톤이 12개에 도달하면 '추가' 버튼이 **설명 없이 사라진다**(EL-029.6) — 상한 고지는 힌트에만 상시 있다 | UI 기획 쪽 변경 요청 |
| 20 | 마일스톤 오류(EL-029.8)가 **어느 행인지 말하지 않는다** — 12행 중 하나가 비어도 '모든 마일스톤의 이름을 입력하세요.' 한 문구다. `path: ['milestones']` 로 배열 전체를 가리키기 때문(`validation.ts:94,104`) | UI 기획 쪽 변경 요청 |
| 21 | 파이프라인 스텝퍼(EL-032)의 현재 단계가 **테두리 굵기·색으로만 인코딩**된다 — 번호 점이 `aria-hidden` 이라 AT 는 라벨 5개만 읽고 어디까지 진행됐는지 모른다. `aria-current="step"` 이 없다(quality-bar A11Y-16 P1) | UI 기획 쪽 변경 요청 |
| 22 | '등록'/'저장'(EL-036)이 `loading` prop 대신 손으로 쓴 '저장 중…' 라벨을 쓴다. 마일스톤 삭제 버튼(EL-029.5)은 DS `<Button>` 이 아닌 손조립 아이콘 버튼이다(quality-bar COMP-01 P1) | UI 기획 쪽 변경 요청 |
| 23 | 목록 조회 실패(EL-011)·저장 실패(EL-019)가 **403·429·500 을 한 문구로 뭉갠다** — `HttpError` 는 status 를 실어 오는데 화면이 보지 않는다. **404 와 409 만 갈린다**(quality-bar EXC-06 P1) | UI 기획 쪽 변경 요청 |
| 24 | 수정 진입 시 **폼 스켈레톤이 없다** — `loadingDetail` 중에는 빈 폼이 `disabled` 로 잠깐 보인다(EL-018). 목록에는 스켈레톤이 있는데 폼에는 없다(quality-bar STATE-01 의 결은 지키나 형태가 다르다) | UI 기획 쪽 변경 요청 |
| 25 | 예상매출(EL-025)에 **상한이 없다** — `^\d+$` 만 본다. 999조를 넣으면 가중 예상매출·목록 셀이 그대로 그린다. 담당자(EL-022)·마일스톤 이름(EL-029.2)에도 길이 상한이 없다 — 서버가 정해야 한다 | 백엔드 명세 (BE-052 §4) |
| 26 | 마일스톤 이름 검증이 `trim()` **전** 값을 보지 않는다 — `name.trim() === ''` 로 판정하므로(`validation.ts:91`) 공백만 입력하면 **검증은 거절하지만**, 통과한 값도 `toInput` 이 다시 trim 한다(`:165`). 두 곳이 각자 trim 해 규칙이 이중화돼 있다 | UI 기획 (경미) |
| 27 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료 리다이렉트가 미저장 폼을 버린다(가드 미발화)(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | UI 기획 · 프론트 구현 |
| 28 | 일괄 삭제(EL-013)가 **실패한 id 를 알려주지 않아** retry 가 전체를 재실행한다. 진행률·취소·상한도 없다(quality-bar EXC-10 · EXC-18 P1). **셸 결함** | UI 기획 (셸 배치) |
| 29 | **낙관적 동시성 토큰이 없다** — `Project` 에 `version`/`updatedAt` 이 없어 어댑터의 409 는 '대상이 존재하는가'만 본다. **둘 다 존재하는 동시 편집은 409 없이 last-write-wins** 다. 409 다이얼로그(EL-039)는 '먼저 삭제됨' 경합에만 뜬다 | 백엔드 명세 (BE-052 §7.3) · UI 기획 |
| 30 | 날짜 범위(EL-027)에 **preset('오늘/최근 7일/이번 달')이 없고**, 시작·종료 오류가 **같은 슬롯을 공유해 동시에 하나만 보인다**(quality-bar COMP-11 P1) | UI 기획 쪽 변경 요청 |
| **31** | **⚠ 신규 — 마일스톤 목표일 오류 문구가 실재하지 않는 날짜를 '입력하세요' 로 뭉갠다.** PR #28(`5e86a3c`)이 `validation.ts:95` 를 정본 `isCalendarDate` 로 수렴시켜 **`2026-02-31` 을 이제 거절하는데**, 그 분기의 문구는 여전히 `'모든 마일스톤의 목표일을 입력하세요.'`(`:100`) 하나다. **날짜를 분명히 채운 사용자가 '입력하세요' 를 보게 된다** — 무엇이 틀렸는지 알 수 없고, EL-029.8 이 **어느 행인지도 말하지 않으므로**(#6·#20) 12행 중 어디를 고칠지도 모른다. **같은 PR 이 손댄 형제 화면과 대비된다** — 계약(`contracts/validation.ts:64`)·견적(`quotes/validation.ts:96`)·프로젝트 기간(`projects/validation.ts:59`)은 전부 `'… YYYY-MM-DD 형식으로 입력하세요.'` 라 **형식을 지목**한다. **마일스톤만 형식을 말하지 않는다.** 빈 값과 실재하지 않는 날짜를 갈라 문구를 나누는 것이 옳다 | UI 기획 쪽 변경 요청 |
