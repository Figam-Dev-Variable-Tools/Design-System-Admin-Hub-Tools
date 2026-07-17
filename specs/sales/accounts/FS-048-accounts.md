---
id: FS-048
title: "거래처 (목록·등록·수정)"
screen: SCR-048               # ⚠ 영업 관리 SCR 미작성 — §7 미결 사항 참조
route: /sales/accounts
owner: 기능 명세
reviewer: 명세 리뷰
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-048. 거래처 (목록·등록·수정)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 국내 ERP 거래처 원장을 관리한다 — 사업자정보(상호·사업자등록번호·대표자·업태/종목·주소)와 거래조건(거래유형·과세유형·신용등급·여신한도·결제조건), 거래처 담당자(복수, 대표담당 1명)를 등록·수정하고, 목록에서 거래유형·키워드로 좁혀 훑으며 거래 상태를 인라인으로 켜고 끈다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — §4.1) |
| 진입 경로 | 좌측 GNB > 영업 관리 > 거래처 (`nav-config.ts:155`) |
| 포함 화면 | 목록 `/sales/accounts` · 등록 `/sales/accounts/new` · 수정 `/sales/accounts/:id/edit` (`App.tsx:241-243`) |
| **범위 밖** | **거래처 상세 뷰** — 읽기 전용 상세 라우트가 없다. 행을 누르면 곧바로 수정 폼으로 간다(`CrudTable.tsx:172` `rowActivateProps(() => onEdit(item))` → `AccountListPage.tsx:228`). **거래 이력·미수금·세금계산서** — 이 화면은 원장만 소유한다. `lastTradeAt` 은 사람이 입력하는 필드이지 거래에서 파생되지 않는다(§7 #9) |
| 구현 경로 | `apps/admin/src/pages/sales/accounts/**` · 도메인 공용 `apps/admin/src/pages/sales/_shared/business.ts` |
| 대응 SCR | SCR-048 (미작성 — §7 #1) |
| 공통 컴포넌트 | `shared/crud/{useCrudList,useCrudRowUpdate,useCrudForm,useListState,parseFilter,CrudListShell,CrudTable,FormServerError,FormConflictDialog,createCrudAdapter,requiredText,dev(LATENCY_MS·failIfRequested)}` · `shared/ui/{SearchField,SelectField,StatusBadge,ToggleSwitch,Button,Card,CardTitle,FormField,TextareaField,Alert,PlusCircleIcon,ChevronLeftIcon,TrashIcon,controlStyle,errorIdOf,fieldLabelStyle,fieldStyle,hintStyle,errorTextStyle,checkboxStyle,pageTitleStyle,alertActionRowStyle,useUnsavedChangesDialog,useToast}` · `shared/format{objectParticle,formatNumber}` |

> **검증의 정본은 `validation.ts` 의 zod 스키마다**(`accountSchema`). 사업자등록번호 체크섬·원화 표기 같은 도메인 순수 규칙은 `_shared/business.ts` 가 소유하며 견적(FS-050)과 공유한다 — 두 섹션만 쓰므로 결합이 아니라 섹션 그룹 내부 공용이다(`business.ts:1-4`).

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-048-SEC-01 | 목록 툴바 | 검색 + 거래유형 필터(select) + 우상단 '거래처 등록' primary 버튼 |
| FS-048-SEC-02 | 목록 라이브 리전 · 조회 요약 | 스크린리더 전용 상태 한 줄 + 건수 텍스트 |
| FS-048-SEC-03 | 선택 바 (비표시 기본) | 선택이 1건 이상일 때만. 일괄 삭제 버튼 |
| FS-048-SEC-04 | 목록 표 | 선택·순번·사업자명·대표자·거래유형·신용등급·대표담당·최근거래·상태 토글·행 액션. **페이지네이션이 없다**(§7 #2) |
| FS-048-SEC-05 | 목록 조회 실패 배너 (비표시 기본) | 요약·선택바·표를 대체 |
| FS-048-SEC-06 | 삭제 확인 다이얼로그 (비표시 기본) | 단건 / 일괄 |
| FS-048-SEC-07 | 폼 헤더 | '목록으로' + `<h1>` + 설명 |
| FS-048-SEC-08 | 폼 카드 — 사업자 정보 | 상호·사업자등록번호·대표자·업태·종목·과세유형·주소·대표전화 |
| FS-048-SEC-09 | 폼 카드 — 거래 조건 | 거래유형·신용등급·여신한도·결제조건·최근거래일·거래 상태 |
| FS-048-SEC-10 | 폼 카드 — 담당자 | 동적 배열 편집기(최대 8명) + 대표담당 라디오 |
| FS-048-SEC-11 | 폼 카드 — 비고 | 메모 textarea |
| FS-048-SEC-12 | 폼 미리보기 카드 | 사업자등록증 요약 카드 |
| FS-048-SEC-13 | 폼 푸터 액션 | 취소 / 등록·저장 |
| FS-048-SEC-14 | 폼 상세 조회 실패 배너 (비표시 기본) | 404 / 일반 오류 분기 — 폼 전체를 대체 |
| FS-048-SEC-15 | 폼 쓰기 실패·충돌·이탈 가드 (비표시 기본) | 저장 실패 배너 · 충돌 다이얼로그 · 미저장 이탈 가드 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-048-EL-001 | FS-048-SEC-01 | 검색 입력 | 입력 | `SearchField`(`AccountListPage.tsx:182-189`), 접근 이름 '사업자명·사업자번호·대표자 검색'. `{...list.searchInputProps}` 스프레드로 **IME 조합 중 커밋 금지 + 조합 중 Enter 차단 + 250ms 디바운스**를 상속한다(`useDebouncedSearch.ts:87,121-129`). 커밋된 값은 URL `?q=` 로 간다 | — | 필터링 자체는 **클라이언트**다(`searchAccounts`) — 서버 재조회 없음. 조합이 아닌 Enter 는 디바운스를 기다리지 않고 즉시 커밋(`useDebouncedSearch.ts:126-129`) |
| FS-048-EL-001.1 | FS-048-SEC-01 | 검색 매칭 규칙 | 텍스트 | `searchAccounts`(`types.ts:134-144`): 앞뒤 공백 제거·소문자화 후 **상호 · 대표자명**에 부분 일치, 그리고 검색어에서 숫자만 뽑은 값이 비어 있지 않으면 **사업자등록번호(하이픈 제거)** 에 부분 일치. 세 축은 **OR** | — | 비표시 규칙. '124' 를 치면 사업자번호에도, 상호에 '124' 가 든 거래처에도 걸린다 |
| FS-048-EL-002 | FS-048-SEC-01 | 거래유형 필터 | 입력 | `SelectField`, 접근 이름 '거래유형으로 거르기'. '전체 유형' + 매출처·매입처·매입매출(`TRADE_TYPE_OPTIONS`). 선택 시 `list.setFilter('trade', …)` → URL `?trade=` | — | 기본값(`all`)과 같은 값은 **URL 에서 지운다**(`useListState.ts:115-117`) — 공유 링크가 짧아진다 |
| FS-048-EL-003 | FS-048-SEC-01 | 필터 값 정규화 규칙 | 텍스트 | `parseFilter(list.filters['trade'] ?? 'all', TRADE_FILTER_VALUES, 'all')`(`AccountListPage.tsx:91-95`) — 손으로 고친 `?trade=거짓말` 은 **'전체'로 되돌린다**(`parseFilter.ts:19`) | — | 비표시 규칙. 잘못된 URL 이 빈 목록을 만들지 않는다 |
| FS-048-EL-004 | FS-048-SEC-01 | '거래처 등록' 버튼 | 버튼 | 툴바 우상단. DS `<Button variant="primary" size="md">` + `PlusCircleIcon`. 클릭 시 `/sales/accounts/new` 이동 | — | **쓰기 권한을 묻지 않는다** — `useRouteWritePermissions` 미소비(§7 #3) |
| FS-048-EL-005 | FS-048-SEC-01 | 조회 상태 URL 직렬화 규칙 | 텍스트 | 거래유형·검색어의 **단일 원천이 URL 쿼리스트링**이다(`useListState.ts` · `AccountListPage.tsx:89`). 갱신은 `replace: true`(`useListState.ts:125`)라 필터를 만질 때마다 history 가 쌓이지 않는다. 뒤로/새로고침/링크 공유가 같은 view 를 재현한다 | — | 비표시 규칙. **`page` 파라미터는 이 화면에서 쓰이지 않는다** — 페이지네이션이 없다(§7 #2) |
| FS-048-EL-006 | FS-048-SEC-02 | 목록 라이브 리전 | 텍스트 | **항상 마운트된** `aria-live="polite" aria-atomic="true"` 시각 숨김 컨테이너(`CrudListShell.tsx:107-109`). 최초 로드 중에는 침묵, 이후 `거래처 N건을 찾았습니다.` / `조건에 맞는 거래처 결과가 없습니다.` / `거래처 목록을 불러오지 못했습니다.` (`:72-82`) | — | 비표시. 내용과 함께 생성되는 live region 은 AT 가 신뢰하지 않아 **껍데기가 지속 컨테이너를 소유**한다 |
| FS-048-EL-007 | FS-048-SEC-02 | 조회 요약 텍스트 | 텍스트 | 최초 로드 중 '불러오는 중…', 그 외 `전체 N건`(`formatNumber`). **재조회 중에는 건수를 지우지 않고** ' · 새로고침 중…' 만 덧붙인다. 선택이 있으면 ' · N건 선택됨'. `aria-busy={refreshing}` (`CrudListShell.tsx:118-122`) | — | N 은 필터·검색을 적용한 뒤의 건수다 |
| FS-048-EL-008 | FS-048-SEC-03 | 선택 바 · 일괄 삭제 버튼 | 버튼 | `SelectionBar`(선택 0건이면 렌더 안 함) 안에 `<Button variant="danger">선택 N건 삭제</Button>`. 단건 삭제 진행 중이면 비활성(`CrudListShell.tsx:125-133`) | O | 클릭 시 FS-048-EL-014 다이얼로그 |
| FS-048-EL-009 | FS-048-SEC-04 | 거래처 표 | 표 | `CrudTable`(`CrudListShell.tsx:135-154`). `aria-busy={firstLoading}`. caption(시각 숨김) '거래처 목록 — 행을 누르면 해당 항목으로 이동합니다. 체크박스·수정·삭제 버튼은 각자의 동작을 수행합니다.' 컬럼 10개(선택·순번·7열·행 액션). **전량 렌더 — 페이지네이션이 없다**(§7 #2) | O | 기본 정렬은 상호 가나다 오름차순(FS-048-EL-017) |
| FS-048-EL-009.1 | FS-048-SEC-04 | 전체 선택 헤더 셀 | 입력 | `SelectAllHeaderCell`, 라벨 '이 페이지의 거래처 전체 선택', `labelId="account-select-all"`. **화면에 보이는 행만** 토글한다(`CrudListShell.tsx:143-148` — `visibleItems.map(id)`) | — | 선택 범위는 '현재 보이는 결과' 다 |
| FS-048-EL-009.2 | FS-048-SEC-04 | 행 선택 셀 | 입력 | `RowSelectCell`, 접근 이름 `'<상호> 선택'` | — | raw checkbox 손조립이 아니다 |
| FS-048-EL-009.3 | FS-048-SEC-04 | 순번 셀 | 텍스트 | `SeqCell seq={index + 1}`(`CrudTable.tsx:179`) — 화면에 보이는 순서의 일련번호 | — | 페이지네이션이 없어 현재는 어긋나지 않는다. 도입 시 `startIndex + index + 1` 로 바뀌어야 한다(§7 #2) |
| FS-048-EL-009.4 | FS-048-SEC-04 | 사업자명 셀 | 텍스트 | `item.name` 그대로 | — | **truncate 없음** — 긴 상호가 열을 넓힌다(§7 #10) |
| FS-048-EL-009.5 | FS-048-SEC-04 | 대표자 셀 | 텍스트 | `item.ceoName`, `nowrap` | — | 개인정보 — 은닉 정책은 BE-048 §7.4 |
| FS-048-EL-009.6 | FS-048-SEC-04 | 거래유형 배지 | 배지 | `StatusBadge`. 라벨 `tradeTypeLabel` · 톤 `tradeTypeTone`(`types.ts:105-109`): 매출처=info · 매입처=warning · 매입매출=success | — | 톤 레지스트리가 `pages/sales/accounts/types.ts` 지역이다(§7 #11) |
| FS-048-EL-009.7 | FS-048-SEC-04 | 신용등급 배지 | 배지 | `StatusBadge`. 라벨 `creditGradeLabel`('A (우량)'…) · 톤 `creditGradeTone`(`types.ts:112-117`): A=success · B=info · C=warning · D=danger | — | — |
| FS-048-EL-009.8 | FS-048-SEC-04 | 대표담당 셀 | 텍스트 | `primaryContact(item)?.name ?? '—'`. `primary` 플래그를 우선하고, 없으면 **첫 담당자**, 그것도 없으면 '—' (`types.ts:120-122`) | — | 담당자 이름 = 개인정보 |
| FS-048-EL-009.9 | FS-048-SEC-04 | 최근거래 셀 | 텍스트 | `item.lastTradeAt` 문자열 그대로('YYYY-MM-DD'), 빈 문자열이면 '—'. muted + `tabular-nums` | — | **사람이 입력한 값**이지 거래에서 파생된 값이 아니다(§7 #9). `formatDate` 를 거치지 않는다 — 이미 달력일 문자열이다 |
| FS-048-EL-009.10 | FS-048-SEC-04 | 거래 상태 인라인 토글 | 입력 | `ToggleSwitch`(`AccountListPage.tsx:156-175`). 접근 이름 `'<상호> 거래 여부'`, onLabel '거래중' / offLabel '중지'. 변경 시 `toggle.run(id, { ...toAccountInput(item), active: next })` — **전체 입력을 되돌려 보내며 `active` 만 바꾼다**. 진행 중 행은 `busy` | O | 성공 토스트는 조사 주입: 켜면 `'<상호>'을/를 거래중으로 바꿨습니다.`(`objectParticle`), 끄면 `'<상호>' 거래를 중지했습니다.` — 끄는 쪽은 조사가 필요 없는 문형이다 |
| FS-048-EL-009.11 | FS-048-SEC-04 | 행 액션 (수정·삭제) | 버튼 | `RowActions`(연필/휴지통), 접근 이름 기준 `nameOf(item)` = 상호. 수정 → `/sales/accounts/<id>/edit`. 삭제 → FS-048-EL-013. 그 행의 삭제 진행 중이면 비활성 | O | **쓰기 게이팅 없음**(§7 #3) |
| FS-048-EL-009.12 | FS-048-SEC-04 | 행 전체 클릭 이동 | 텍스트 | 행 빈 영역 클릭 시 **수정 폼**으로 이동한다(`CrudTable.tsx:172` `rowActivateProps` → `onEdit`). 행 안의 버튼·입력은 자기 동작만 수행한다 | — | 비표시 규칙. 읽기 전용 상세가 없어 행 클릭의 목적지가 곧 편집이다(§1 범위 밖) |
| FS-048-EL-010 | FS-048-SEC-04 | 목록 로딩 스켈레톤 | 스켈레톤 | **최초 로드에서만**(`loading = controller.firstLoading` — `useCrudList.tsx:71` `isFetching && data === undefined`) 표 본문을 **5행 고정** 스켈레톤으로 대체(`CrudTable.tsx:143-152`). 셀 수는 `columns.length + 3` 로 파생 | — | 비표시. **재조회 중에는 이전 행이 유지된다** — `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:254`)와 짝이다. 행 수는 하드코딩 5(§7 #12) |
| FS-048-EL-011 | FS-048-SEC-04 | 빈 상태 (3분기) | 빈상태 | 조회 완료·0행이면 공유 `Empty`(`CrudTable.tsx:157-167`)가 맥락으로 갈린다: 검색어가 있으면 '검색 지우기'(`list.clearSearch`), 필터가 걸렸으면 '필터 초기화'(`list.resetFilters`), 아무것도 없으면 '등록된 거래처가 없습니다' 계열. 조사는 `Empty` 가 런타임에 고른다 | — | 비표시. 맥락은 `AccountListPage.tsx:220-225` 가 넘긴다. **생성 CTA(`createAction`)는 넘기지 않는다** — 진짜 빈 상태에서도 등록 버튼이 툴바에만 있다(§7 #13) |
| FS-048-EL-012 | FS-048-SEC-05 | 목록 조회 실패 배너 | 배너 | 조회 실패 시 요약·선택바·표 대신 위험 톤 `Alert` '거래처 목록을 불러오지 못했습니다.' + '다시 시도'(`refetch`) (`CrudListShell.tsx:157-164`). 자동 소멸하지 않는다. 토스트가 아니다 | O | **툴바는 남는다**(`:111` 이 조건 밖) — 필터·검색 조건이 화면에서 사라지지 않는다 |
| FS-048-EL-013 | FS-048-SEC-06 | 단건 삭제 확인 다이얼로그 | 모달 | `ConfirmDialog intent="delete"`(`useCrudList.tsx:154-165`). 제목 '거래처 삭제', 문구 `'<상호>'을/를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`(조사 주입). 확인 버튼은 busy 중 비활성 + `aria-busy` + 라벨 '처리 중…'. 실패 시 **다이얼로그를 열어둔 채** error 배너 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' | O | 취소/Esc/dim 클릭은 진행 중 요청을 abort 한다(`:87`) |
| FS-048-EL-014 | FS-048-SEC-06 | 일괄 삭제 확인 다이얼로그 | 모달 | `ConfirmDialog intent="delete"`(`useCrudList.tsx:166-177`). 제목 '거래처 일괄 삭제', 문구 '선택한 거래처 N건을 삭제하시겠습니까? …', 확인 라벨 'N건 삭제'. **부분 실패**면 다이얼로그를 유지한 채 'N건 중 M건을 삭제하지 못했습니다.' | O | 전건 성공에만 선택 해제 + '거래처 N건을 삭제했습니다.' 토스트 |
| FS-048-EL-015 | FS-048-SEC-04 | 선택 해제 규칙 | 텍스트 | 거래유형 필터·검색어가 바뀌면 선택을 **전부 해제**한다(`AccountListPage.tsx:110-112` — `useEffect(() => clear(), [filter, keyword, clear])`) — 화면에 없는 행이 선택된 채 '선택 3건 삭제'가 되지 않게 한다 | — | 비표시 규칙. 선택은 `useCrudList`(=`useRowSelection`)가 쥐고 있으므로 조건 변화를 화면이 그 선택에 이어 준다 |
| FS-048-EL-016 | FS-048-SEC-04 | 정렬 규칙 | 텍스트 | `sortAccounts`(`types.ts:147-149`) — **상호 가나다 오름차순**(`localeCompare(…, 'ko')`). 어댑터가 `fetchAll`·쓰기 직후에 적용한다(`crud.ts:89-90,115,130`). **정렬 변경 UI 가 없다** | — | 비표시 규칙. 동명이인(같은 상호)의 순서는 정의되지 않는다 — `localeCompare` 가 0 을 주면 `sort` 의 안정성에 맡긴다 |
| FS-048-EL-017 | FS-048-SEC-04 | 필터·검색 결합 규칙 | 텍스트 | `searchAccounts(filterAccounts(items, filter), keyword)`(`AccountListPage.tsx:114-117`) — 거래유형으로 먼저 좁히고 그 결과에 검색어를 건다. `useMemo` 로 items·filter·keyword 가 바뀔 때만 재계산 | — | 비표시 규칙 |
| FS-048-EL-018 | FS-048-SEC-07 | 폼 '목록으로' 버튼 | 버튼 | 좌상단. `ChevronLeftIcon` + '목록으로'. `navigate('/sales/accounts')` | — | **`navigate()` 프로그램 이동이라 이탈 가드가 가로채지 못한다**(§7 #4) |
| FS-048-EL-019 | FS-048-SEC-07 | 폼 화면 제목 | 텍스트 | `<h1 style={pageTitleStyle}>{isEdit ? '거래처 수정' : '거래처 등록'}</h1>`(`AccountFormPage.tsx:260`). `pageTitleStyle` 은 `--tds-typography-title-xl-*` 를 참조한다(`shared/ui/styles.ts:51-61`) | — | **AppHeader 가 그리는 `<h1>`(`AppHeader.tsx:101`)과 중복된다** — 그 자리는 `findCoveringLeaf` 가 푼 '거래처'를 보인다. 화면에 h1 이 2개다(§7 #5) |
| FS-048-EL-020 | FS-048-SEC-07 | 폼 설명 문구 | 텍스트 | '별표(*) 항목은 필수입니다. 사업자등록번호는 국세청 형식으로 검증됩니다.' | — | 정적 문구 |
| FS-048-EL-021 | FS-048-SEC-15 | 저장 실패 배너 | 배너 | `FormServerError`(`FormFeedback.tsx:38-47`). 위험 톤 `Alert` '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' + 있으면 `오류 코드 <reference>`(복사 가능 — `userSelect: 'all'`) | O | **raw 서버 본문·스택·status 를 산문으로 쓰지 않는다.** 422 필드 거절은 여기 오지 않는다(FS-048-EL-047) |
| FS-048-EL-022 | FS-048-SEC-08 | 상호 입력 | 입력 | `FormField htmlFor="account-name" label="상호(거래처명)" required`, 자식 `<input type="text">` → **`aria-required` 런타임 주입**(`FormField.tsx:50-56`). `maxLength=60`(`ACCOUNT_NAME_MAX`). 오류 시 `aria-invalid` + `aria-describedby={errorIdOf('account-name')}` 짝 | O | 검증: `requiredText('상호', 60)` — 공백만이면 '상호를 입력하세요.', 초과면 '상호는 60자를 넘을 수 없습니다.'(조사 주입 — `shared/crud/validation.ts:19-28`) |
| FS-048-EL-023 | FS-048-SEC-08 | 사업자등록번호 입력 | 입력 | `FormField htmlFor="account-biz-no" required`, 자식 `<input type="text" inputMode="numeric">`(aria-required 주입). **제어 입력**이며 키 입력마다 `formatBizNo` 로 하이픈을 다시 넣는다(`AccountFormPage.tsx:316-318` — `setValue('bizNo', formatBizNo(v), { shouldDirty: true })`). placeholder '000-00-00000' | O | 검증: `isValidBizNo`(10자리 + **국세청 체크섬** — `business.ts:29-42`). 실패 문구 '올바른 사업자등록번호가 아닙니다. (000-00-00000)'. `bizNoDigits` 가 11자리째부터 **버린다**(`business.ts:13`) — 붙여넣기 초과분이 조용히 잘린다(§7 #14) |
| FS-048-EL-024 | FS-048-SEC-08 | 대표자명 입력 | 입력 | `FormField htmlFor="account-ceo" required`, `<input>`(주입). `maxLength=40`. 오류 시 aria 짝 | O | 검증 `requiredText('대표자명', 40)`. 개인정보 |
| FS-048-EL-025 | FS-048-SEC-08 | 업태 입력 | 입력 | `FormField htmlFor="account-biz-type" label="업태"`(필수 아님), `<input>`. placeholder '예: 서비스' | O | 스키마는 `z.string()` — 제약 없음. `controlStyle(false)` 고정 |
| FS-048-EL-026 | FS-048-SEC-08 | 종목 입력 | 입력 | `FormField htmlFor="account-biz-item" label="종목"`(필수 아님), `<input>`. placeholder '예: 소프트웨어 개발' | O | 위와 동일 |
| FS-048-EL-027 | FS-048-SEC-08 | 과세유형 select | 입력 | `FormField htmlFor="account-tax" required`, 자식 **`SelectField`** → aria-required 주입 대상(`FormField.tsx:40`). 일반과세·간이과세·면세·영세율 | O | `z.enum` 이라 위반 값이 존재할 수 없다 |
| FS-048-EL-028 | FS-048-SEC-08 | 사업장 주소 입력 | 입력 | `FormField htmlFor="account-address"`(필수 아님), `<input>` | O | **주소 검색(우편번호) 연동이 없다** — 자유 텍스트다(§7 #15) |
| FS-048-EL-029 | FS-048-SEC-08 | 대표 전화 입력 | 입력 | `FormField htmlFor="account-phone"`(필수 아님), `<input>`. placeholder '예: 02-1234-5678' | O | **형식 검증·마스킹이 없다**(§7 #14) |
| FS-048-EL-030 | FS-048-SEC-09 | 거래유형 select (폼) | 입력 | `FormField htmlFor="account-trade-type" required`, `SelectField`(주입) | O | 목록 필터(FS-048-EL-002)와 같은 선택지를 쓰되 '전체'가 없다 |
| FS-048-EL-031 | FS-048-SEC-09 | 신용등급 select | 입력 | `FormField htmlFor="account-credit-grade" required`, `SelectField`(주입). 기본값 'B' | O | **등급 산정 근거가 없다** — 사람이 고르는 값이다(§7 #9) |
| FS-048-EL-032 | FS-048-SEC-09 | 여신한도 입력 | 입력 | `FormField htmlFor="account-credit-limit" label="여신한도 (원)" required hint="0 이면 미설정"`, `<input inputMode="numeric">`(주입). 오류 시 aria 짝 | O | 검증: `/^\d+$/` — '여신한도는 숫자만 입력할 수 있습니다.' **천단위 구분·'원' 마스킹이 없고**(§7 #14), **hint 가 유효할 때 `aria-describedby` 로 연결되지 않는다**(§7 #6). 폼 값은 문자열, 저장 시 `digitsToNumber` 로 숫자화(`AccountFormPage.tsx:128-131`) |
| FS-048-EL-033 | FS-048-SEC-09 | 결제조건 select | 입력 | `FormField htmlFor="account-payment-term" required`, `SelectField`(주입). 현금·말일결제·Net-30·Net-60·익월말 | O | 기본값 `net_30` |
| FS-048-EL-034 | FS-048-SEC-09 | 최근 거래일 입력 | 입력 | `FormField htmlFor="account-last-trade"`(필수 아님), **`<input type="date">`** | O | 스키마 `z.string()` — **날짜 실재 검증이 없다**. 브라우저 네이티브 date 위젯이 유일한 방어다(§7 #9) |
| FS-048-EL-035 | FS-048-SEC-09 | 거래 상태 토글 (폼) | 입력 | `<span style={fieldLabelStyle}>거래 상태</span>` + `ToggleSwitch`(`AccountFormPage.tsx:486-496`). 접근 이름 '거래처 거래 여부'. `setValue('active', next, { shouldDirty: true })` | O | **`FormField` 밖에서 라벨을 손으로 그린다** — 필수가 아니라 마커 문제는 없으나 오류 슬롯도 없다 |
| FS-048-EL-036 | FS-048-SEC-10 | 담당자 편집기 | 입력 | `AccountContactsField`(페이지 전용 — 소비자 1개). 라벨 **`<span style={fieldLabelStyle}>담당자 *</span>`(`AccountContactsField.tsx:161`)** + 힌트 '거래처 담당자를 등록하세요. 대표담당 1명이 목록·견적서에 노출됩니다. (최대 8명)' | O | **`FormField` 를 쓰지 않는다** — `*` 가 리터럴 텍스트고 `aria-required` 가 어느 입력에도 없다(§7 #6 · quality-bar COMP-04·A11Y-11) |
| FS-048-EL-036.1 | FS-048-SEC-10 | 담당자 행 입력 5종 | 입력 | 행마다 `ContactCell` 5개: 이름(`aria` 이름 `담당자 N 이름`)·부서·직급·연락처·이메일. `<label htmlFor>` + `<input type="text">`. 저장 중 비활성 | O | **길이 상한이 없다**(`maxLength` 없음). 이메일만 형식 검증 |
| FS-048-EL-036.2 | FS-048-SEC-10 | 대표담당 라디오 | 입력 | 행마다 `<input type="radio" name="primary-contact">` + '대표담당으로 지정'. 선택 시 **다른 모든 행의 `primary` 를 false 로**(`AccountContactsField.tsx:139-141`) | — | `name` 이 하드코딩 `'primary-contact'` 라 한 폼에 편집기가 두 개면 충돌한다 — 현재 소비자는 1개다 |
| FS-048-EL-036.3 | FS-048-SEC-10 | 담당자 삭제 버튼 | 버튼 | **행이 2개 이상일 때만** 렌더(`:224`). `TrashIcon` + '담당자 삭제'. **DS `<Button>` 이 아니라 `<button className="tds-ui-focusable" style={iconButtonStyle}>` 손조립**이다 | — | 접근 이름이 행을 식별하지 못한다 — 세 행 모두 '담당자 삭제'다(§7 #16). 확인 절차 없이 즉시 지운다 |
| FS-048-EL-036.4 | FS-048-SEC-10 | 담당자 추가 버튼 | 버튼 | **8명 미만일 때만** 렌더(`:241`). DS `<Button variant="secondary">` + `PlusCircleIcon` + '담당자 추가'. 새 행의 id 는 `ct-new-<Date.now()>-<0~1000 난수>`(`:86`) | — | 상한 도달 시 **버튼이 사라질 뿐 사유를 말하지 않는다**(§7 #17). id 충돌 확률은 낮으나 0 이 아니다 — 서버가 채번해야 한다(BE-048 §7.2) |
| FS-048-EL-036.5 | FS-048-SEC-10 | 담당자 오류 문구 | 텍스트 | 배열 전체에 대한 단일 `<p role="alert" style={errorTextStyle}>`(`:250-254`). 3단계 순차 판정(`validation.ts:69-102`): ① 0명 → '담당자를 한 명 이상 등록하세요.' ② 이름 공백 → '담당자 이름을 입력하세요.' ③ 이메일 형식 → '담당자 이메일 형식이 올바르지 않습니다.' | — | 비표시 기본. **어느 행이 문제인지 말하지 않는다**(§7 #18). 각 단계가 `return` 이라 **한 번에 한 문구만** 뜬다. 어떤 입력과도 `aria-describedby` 로 연결되지 않는다 |
| FS-048-EL-036.6 | FS-048-SEC-10 | 대표담당 승격 규칙 | 텍스트 | ① 첫 행을 추가하면 자동으로 대표담당(`:156` — `primary: contacts.length === 0`) ② 대표담당을 삭제하면 **남은 첫 행을 대표로 승격**(`:146-148`) ③ 마지막 1명은 삭제 버튼이 없어 지울 수 없다 | — | 비표시 규칙. 그래서 '대표담당 0명'은 UI 로 도달 불가하다 — 다만 **스키마가 그것을 강제하지 않는다**(BE-048 §3) |
| FS-048-EL-037 | FS-048-SEC-11 | 비고 textarea | 입력 | `TextareaField label="메모"`, `maxLength=500`(`ACCOUNT_NOTE_MAX`), 3행, 우측 상단 `N/500` 카운터. `aria-invalid`/`aria-describedby` 를 내부에서 짝으로 배선(`TextareaField.tsx:66-67`) | O | 상한 도달 시 **경고 없이 네이티브가 입력을 자른다**(카운터만 — quality-bar COMP-12). 스키마도 500자 초과를 막는다(중복 방어) |
| FS-048-EL-038 | FS-048-SEC-12 | 사업자 정보 미리보기 | 표시 | `AccountBusinessPreview`(`aria-label="사업자 정보 미리보기"`). 상호(미입력이면 '(상호 미입력)') + 거래유형 배지 / 사업자번호·대표자·업태·종목·과세유형·사업장 / 신용·여신(`formatWon`)·결제조건 배지 3개. **`watch()` 로 키 입력마다 갱신** | — | 순수 표시 — 상호작용 없음. 값이 비면 '—' |
| FS-048-EL-039 | FS-048-SEC-13 | '취소' 버튼 | 버튼 | 푸터 우측 그룹 왼쪽. `secondary`. 저장 중 비활성. `navigate('/sales/accounts')` | — | FS-048-EL-018 과 목적지가 같다(중복). **가드가 발화하지 않는다**(§7 #4) |
| FS-048-EL-040 | FS-048-SEC-13 | '등록'/'저장' 버튼 | 버튼 | 푸터 우측. `type="submit" variant="primary"`. 라벨 `saving ? '저장 중…' : isEdit ? '저장' : '등록'`. `disabled={saving \|\| loadingDetail}` | O | 진행 상태를 `loading` prop 이 아니라 **손으로 쓴 라벨**로 표현한다(quality-bar COMP-01 — §7 #19) |
| FS-048-EL-041 | FS-048-SEC-14 | 상세 조회 실패 배너 | 배너 | **수정 진입 시에만.** `loadFailure` 로 갈린다(`AccountFormPage.tsx:223-245`): `'not-found'` → **'거래처 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만**(재시도 없음) · `'error'` → '거래처 불러오지 못했습니다.' + '다시 시도' + '목록으로' | O | 폼 전체를 대체한다. **두 문구 모두 목적격 조사가 빠져 있다**('거래처**를** 찾을 수 없습니다'가 옳다) — 실재 결함(§7 #7) |
| FS-048-EL-042 | FS-048-SEC-15 | 충돌 다이얼로그 | 모달 | `FormConflictDialog`(`FormFeedback.tsx:58-74`). 409/412 시 제목 '다른 사용자가 먼저 변경했습니다', 확인 '최신 내용 불러오기'(내 입력을 버리고 재조회) / 취소 '이어서 편집'(다이얼로그만 닫는다 — 토스트 없음). **입력은 언마운트되지 않는다** | O | 비표시. 현재 발현 경로: 다른 관리자가 먼저 지운 거래처를 저장(`crud.ts:126-128` — `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`) 또는 `?status=save:409` |
| FS-048-EL-043 | FS-048-SEC-15 | 미저장 이탈 가드 | 모달 | `useUnsavedChangesDialog(isDirty && !saving, { message: … })`(`AccountFormPage.tsx:215`). 문구 '거래처에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.' 3경로: 브라우저 이탈(beforeunload) · 앱 내 링크 클릭(capture 가로채기 — `_self`·수식키 클릭 예외 처리) · 뒤로/앞으로(popstate sentinel) | — | 비표시. `isDirty` 는 RHF 판정이다. **`navigate()` 프로그램 이동은 3경로 밖이다**(§7 #4) |
| FS-048-EL-044 | FS-048-SEC-13 | 저장 성공 토스트 · 이동 | 토스트 | `useCrudForm` 이 `거래처를 저장했습니다.` / `거래처를 등록했습니다.`(조사 주입 — `useCrudForm.ts:222`) 후 `/sales/accounts` 로 `replace: true` 이동 | — | 비표시. 실패는 토스트가 아니라 배너(FS-048-EL-021)·다이얼로그(FS-048-EL-042) |
| FS-048-EL-045 | FS-048-SEC-13 | 제출 잠금 · 멱등키 규칙 | 텍스트 | ① **동기 제출 락** `submitLockRef`(`useCrudForm.ts:103,201-202`) — `disabled={saving}` 이 렌더되기 전의 두 번째 Enter/클릭을 막는다 ② **제출 시도 단위 멱등키** `idempotencyKeyRef`(`:118-123`)를 mutationFn **밖**에서 만들어 variables 로 싣는다(`:228,235`) → 어댑터 `WriteContext.idempotencyKey`(`crud.ts:41`) → 멱등 원장(`crud.ts:114,121`). 성공하면 키를 버린다(`:220`) | O | 비표시 규칙. **삭제(FS-048-EL-013·014)와 인라인 토글(FS-048-EL-009.10)에는 키가 없다** — 프레임워크의 명시적 판정이다(`crud.ts:32-41`) |
| FS-048-EL-046 | FS-048-SEC-13 | 언마운트 abort | 텍스트 | `useEffect(() => () => controllerRef.current?.abort(), [])`(`useCrudForm.ts:93` · `useCrudRowUpdate.ts:36`). abort 는 실패가 아니다 — `isAbort(cause)` 면 즉시 return(`useCrudForm.ts:162`). 성공 콜백도 `controller.signal.aborted` 면 아무것도 하지 않는다(`:218`) | — | 비표시 규칙. `useCrudRowUpdate.run` 은 **새 요청 전에 이전 요청을 abort** 한다(`:39`) |
| FS-048-EL-047 | FS-048-SEC-08 | 서버 422 → 필드 인라인 규칙 | 텍스트 | 서버가 422 + `violations` 를 주면 `setError(field, …)` 로 **그 입력에** 인라인 오류를 꽂고 첫 위반 필드로 포커스를 옮긴다(`useCrudForm.ts:182-192`). 폼 레벨 배너로 가지 않는다 | O | 비표시 규칙. **백엔드가 없어 현재 발현되지 않는다** — `?status=save:422` 는 `violations` 가 빈 `HttpError` 라 배너로 떨어진다(`dev.ts:84`) |
| FS-048-EL-048 | FS-048-SEC-08 | 폼 값 ↔ 입력 변환 규칙 | 텍스트 | `toInput`(`AccountFormPage.tsx:133-159`): 문자열 필드 전부 `trim`, `bizNo` 는 `formatBizNo` 로 재정규화, `creditLimit` 는 `digitsToNumber`, 담당자 각 행도 `trim`. `toValues`(`:161-180`): `creditLimit` 를 `String()` 으로, 담당자를 얕은 복사 | — | 비표시 규칙. **`lastTradeAt` 은 trim 하지 않는다**(date 입력이라 공백이 들어올 수 없다) |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-048-EL-001 / EL-001.1 | 매치 0건이면 FS-048-EL-011 의 '검색 결과 없음' 분기 | 조회 중에도 입력 가능 — 대상 배열이 비어 결과 0건 | N/A — 서버를 호출하지 않는다(클라이언트 필터) | 자유 텍스트. 길이·문자 제약 없음. 앞뒤 공백 제거. 빈 문자열이면 조건 해제 | §4.1 공통 규칙 적용 | URL 이 원천이라 뒤로/새로고침이 값을 보존한다. 조합 중에는 커밋하지 않아 자모 부분 문자열이 URL 에 남지 않는다 | 전량이 메모리에 있어 커밋마다 전체를 훑는다 — 디바운스가 그 횟수를 250ms 로 묶는다 |
| FS-048-EL-002 / EL-003 | 그 거래유형이 0건이면 '필터 결과 없음' 분기 | 조회 중 조작 가능(결과 0건) | N/A — 클라이언트 필터 | `parseFilter` 가 모르는 값을 '전체'로 되돌린다 | §4.1 공통 규칙 적용 | URL 이 원천 — 뒤로/새로고침/공유가 값을 보존한다 | 선택지 3+1개 고정 |
| FS-048-EL-004 | N/A — 항상 표시 | 조회 중에도 누를 수 있다 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | **쓰기 권한 없는 역할에게도 보인다**(§7 #3) | N/A — 이동만 한다 | N/A — 단일 버튼 |
| FS-048-EL-005 | N/A — 규칙 | N/A — 동기 | N/A — 서버 호출 없음 | 알 수 없는 파라미터는 FS-048-EL-003 이 정규화 | §4.1 공통 규칙 적용 | **이것이 경합 대비 자체** — 상세→뒤로가 조건을 잃지 않는다 | URL 길이 상한(브라우저 ~2KB)에 닿을 표면이 없다(파라미터 2개) |
| FS-048-EL-006 | 0행이면 '조건에 맞는 거래처 결과가 없습니다.' | 최초 로드 중에는 **침묵**(아직 알릴 사실이 없다) | '거래처 목록을 불러오지 못했습니다.' | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회로 건수가 바뀌면 다시 announce | 건수만 읽는다 — 행 수와 무관 |
| FS-048-EL-007 | 0건이면 '전체 0건' | 최초 로드만 '불러오는 중…'. **재조회는 건수를 유지하고 '· 새로고침 중…'** | 조회 실패 시 FS-048-EL-012 가 이 줄을 대체 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 재조회 시점에 갱신 | `formatNumber` 로 천 단위 구분 |
| FS-048-EL-008 | 선택 0건이면 렌더되지 않는다 | 조회 중에도 선택은 가능(스켈레톤 행에는 체크박스가 없다) | 실패 시 화면이 배너로 대체돼 사라진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 쓰기 게이팅 없음 | 단건 삭제 진행 중이면 비활성 | **선택 범위는 '보이는 결과' 뿐**(FS-048-EL-009.1). cross-page 전체 선택이 없다 — 페이지네이션 자체가 없다 |
| FS-048-EL-009 | 0행이면 FS-048-EL-011 로 본문 대체 | FS-048-EL-010 스켈레톤 + `aria-busy` | FS-048-EL-012 로 요약·표 대체 | N/A — 표 자체 입력 없음 | §4.1 공통 규칙 적용 | 조회 시점 스냅샷. 다른 관리자의 변경은 재조회 시점에만 반영 | **상한 없음** — 거래처 수에 비례해 행이 는다(§7 #2 · quality-bar ERP-15) |
| FS-048-EL-009.1 / .2 | 행 없으면 없음 | 스켈레톤 행에는 없다 | 실패 시 미표시 | N/A — 이진 선택 | §4.1 공통 규칙 적용 | **필터·검색이 바뀌면 선택이 해제된다**(FS-048-EL-015) | 전체 선택이 화면의 모든 행을 한 번에 담는다 |
| FS-048-EL-009.3 | 행 없으면 없음 | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회·필터로 순서가 바뀌면 순번도 다시 매겨진다 | 페이지네이션 도입 시 값 공식이 틀어진다(§7 #2) |
| FS-048-EL-009.4 | 상호가 빈 문자열이면 빈 칸(스키마가 막으므로 도달 불가) | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | **truncate 없음** — 긴 상호가 열을 넓힌다(§7 #10) |
| FS-048-EL-009.5 | 빈 문자열이면 빈 칸(스키마가 막는다) | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 — 개인정보 은닉은 BE-048 §7.4 | 조회 시점 값 | `nowrap` |
| FS-048-EL-009.6 / .7 | 행 없으면 없음 | 스켈레톤 | 실패 시 미표시 | N/A — `z.enum` 이라 미정의 값이 없다 | §4.1 공통 규칙 적용 | 조회 시점 값 | 각각 3개·4개 고정 |
| FS-048-EL-009.8 | 담당자 0명이면 '—'. 스키마가 0명을 막으나 **서버 데이터가 0명이면 그대로 '—'** | 스켈레톤 | 실패 시 미표시 | N/A — 파생값 | §4.1 공통 규칙 적용 | 조회 시점 값 | 담당자가 8명이어도 **1명만 보인다** |
| FS-048-EL-009.9 | `''` 이면 '—' | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 사람이 고치는 값이라 다른 관리자와 어긋날 수 있다(§7 #9) | `nowrap` + `tabular-nums` |
| FS-048-EL-009.10 | 행 없으면 없음 | 진행 중 `busy` — 그 행만 잠긴다 | 실패 시 **토스트** '변경하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`useCrudRowUpdate.ts:53`). 배너가 아니다 | N/A — 이진 토글이라 위반 값이 없다 | §4.1 공통 규칙 적용 — **쓰기 게이팅 없음** | **낙관적 업데이트가 아니다**(비관적 — 응답 후 무효화). 없는 id 면 어댑터가 409 를 주는데 **이 경로엔 충돌 다이얼로그가 없어 일반 토스트로 뭉개진다**(§7 #20). 새 요청이 이전 요청을 abort 한다 | 행마다 독립. 일괄 토글 없음 |
| FS-048-EL-009.11 | 행 없으면 없음 | 스켈레톤 행에는 없다 | 삭제 실패는 FS-048-EL-013 의 다이얼로그 배너 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **쓰기 게이팅 없음** | 그 행 삭제 진행 중이면 비활성 | 행마다 2개 |
| FS-048-EL-009.12 | 행 없으면 규칙이 걸리지 않는다 | 스켈레톤 행에는 걸리지 않는다 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이미 삭제된 행을 클릭하면** 폼이 404 를 받아 FS-048-EL-041 로 떨어진다 | N/A — 행 단위 |
| FS-048-EL-010 | N/A — 도착 전 상태 | 이것이 로딩 표현. **최초 로드만**(`firstLoading`) | 조회 실패 시 FS-048-EL-012 로 바뀐다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **재조회에서는 발현되지 않는다** — 이전 행이 유지된다 | 행 수가 결과 수와 무관하게 5 고정(§7 #12) |
| FS-048-EL-011 | 이것이 빈 상태 표현 — 검색/필터/진짜 3분기 | 최초 로드 중에는 스켈레톤이 이긴다 | 조회 실패 시 FS-048-EL-012 로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 표시 전용 | N/A — 1행 |
| FS-048-EL-012 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 이전 데이터가 있으면 그것이, 없으면 스켈레톤이 뜬다 | 이것이 실패 표현. **status 로 분기하지 않는다** — 403·404·500·타임아웃이 같은 문구다(quality-bar EXC-06) | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 권한 부족(403)도 이 배너 | 재시도는 같은 조회를 재발행. 툴바·URL 조건은 유지된다 | N/A — 표시 전용 |
| FS-048-EL-013 | N/A — 대상이 있어야 성립 | 확인 중 확인 버튼 비활성 + `aria-busy` + '처리 중…' | 이것이 실패 표현 — **다이얼로그를 열어둔 채** 배너. 재클릭이 재시도 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 같은 문구로 뭉개진다 | 이미 삭제된 항목이면 어댑터가 409('이미 삭제된 항목입니다.' — `crud.ts:140`)를 주는데 **같은 배너 문구로 뭉개진다**. 취소/Esc/dim 은 진행 중 요청을 abort | 단건 |
| FS-048-EL-014 | 선택 0건이면 아무것도 하지 않는다(`useCrudList.tsx:128`) | 확인 버튼 busy | **부분 실패**를 건수로 보고하고 다이얼로그를 유지 — 어느 행이 실패했는지는 말하지 않는다(quality-bar EXC-10) | N/A — 입력 없음 | §4.1 공통 규칙 적용 | `settleAll` 이 전건을 시도한다 — 일부가 이미 삭제됐으면 그 건만 409 로 실패 count 에 든다. **전건 성공에만** 목록 무효화·선택 해제 | **상한·진행률·취소가 없다**(quality-bar EXC-18). 선택 가능한 최대치 = 화면의 전체 행 |
| FS-048-EL-015 | N/A — 선택이 있어야 의미 | N/A — 동기 효과 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체** — 보이지 않는 행의 선택을 남기지 않는다 | 조건이 바뀔 때마다 전체 해제 |
| FS-048-EL-016 | 0행이면 정렬할 것이 없다 | 어댑터가 응답 직전에 적용 | N/A — 순수 함수 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 쓰기 직후에도 재정렬된다(`crud.ts:115,130`) — 상호를 바꾸면 행이 **자리를 옮긴다** | 건수에 비례한 정렬 비용(O(n log n)). 매 `fetchAll` 마다 |
| FS-048-EL-017 | 두 축의 결과가 0건이면 FS-048-EL-011 | 조회 중에는 대상이 빈 배열 | N/A — 클라이언트 연산 | N/A — select + 자유 텍스트 | §4.1 공통 규칙 적용 | `useMemo` 라 items 가 갱신되면 다시 계산 | 결과가 많아도 전량 렌더(§7 #2) |
| FS-048-EL-018 | N/A — 항상 표시 | 상세 로딩 중에도 표시 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 중에도 누를 수 있다 — 이탈 시 FS-048-EL-046 이 abort | N/A — 단일 버튼 |
| FS-048-EL-019 / EL-020 | N/A — 정적 | N/A — 조회 안 함 | 상세 조회 실패 시 **FS-048-EL-041 이 폼 전체를 대체해 제목도 사라진다** | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 상태 없음 | 고정 문구 |
| FS-048-EL-021 | N/A — 오류 없으면 미렌더 | 재저장 시 `setServerError(null)` 로 먼저 지운다(`useCrudForm.ts:205`) | 이것이 저장 실패 표현. 문구 1종 + 오류 코드. abort·409·422 는 여기 오지 않는다 | 클라이언트 검증 위반은 여기 오지 않는다 — 각 필드의 인라인 오류로 간다 | §4.1 공통 규칙 적용 — **403 도 같은 문구**(quality-bar EXC-06) | N/A — 표시 전용 | 1건만 표시 |
| FS-048-EL-022 | 초기값 `''`. 등록 폼은 빈 채로 시작 | 상세 로딩 중 비활성(`disabled = saving \|\| loadingDetail`) | 저장 실패는 FS-048-EL-021 — **입력은 보존된다** | 공백만이면 '상호를 입력하세요.', 60자 초과면 '상호는 60자를 넘을 수 없습니다.' `maxLength` 가 네이티브로도 막는다 | §4.1 공통 규칙 적용 | 수정 폼은 상세 도착 시 `reset()`(`useCrudForm.ts:131-134`) — **`loaded` 참조가 바뀔 때만** 돌아 편집 중 덮어쓰기가 일어나지 않는다 | 60자 상한 |
| FS-048-EL-023 | 초기값 `''`, placeholder '000-00-00000' | 상세 로딩 중 비활성 | 저장 실패는 FS-048-EL-021 | **국세청 체크섬**이 정본 — 10자리라도 검증숫자가 틀리면 거절. 자리수 미달도 거절 | §4.1 공통 규칙 적용 | 위와 동일 | **10자리 초과 입력은 조용히 버려진다**(`business.ts:13` `.slice(0, 10)`) — '1234567890123' 을 붙여넣으면 앞 10자리만 남는다(§7 #14) |
| FS-048-EL-024 | 초기값 `''` | 상세 로딩 중 비활성 | FS-048-EL-021 | `requiredText('대표자명', 40)` + `maxLength=40` | §4.1 공통 규칙 적용 | 위와 동일 | 40자 상한 |
| FS-048-EL-025 / EL-026 / EL-028 / EL-029 | 초기값 `''` — 비워 둔 채 저장할 수 있다 | 상세 로딩 중 비활성 | FS-048-EL-021 | **제약 없음**(`z.string()`) — 어떤 문자열도 통과한다. `maxLength` 도 없다(§7 #14) | §4.1 공통 규칙 적용 | 위와 동일 | **상한 없음** — 아주 긴 값도 저장된다 |
| FS-048-EL-027 / EL-030 / EL-031 / EL-033 | N/A — 항상 하나가 선택돼 있다 | 상세 로딩 중 비활성 | FS-048-EL-021 | `z.enum` — 위반 값이 존재할 수 없다 | §4.1 공통 규칙 적용 | 위와 동일 | 선택지 3~5개 고정 |
| FS-048-EL-032 | 초기값 `'0'`(EMPTY) — '0 이면 미설정' | 상세 로딩 중 비활성 | FS-048-EL-021 | `/^\d+$/` 만 — **음수·소수·콤마를 거절**하고 상한이 없다. '1,000,000' 은 거절된다(§7 #14) | §4.1 공통 규칙 적용 | 위와 동일 | 상한 없음 — `Number()` 안전 정수 범위를 넘는 자릿수도 통과한다(§7 #21) |
| FS-048-EL-034 | 초기값 `''` — 비워 두면 목록에 '—' | 상세 로딩 중 비활성 | FS-048-EL-021 | **없다** — `z.string()`. 네이티브 date 위젯이 유일한 방어다 | §4.1 공통 규칙 적용 | 위와 동일 | 단일 값 |
| FS-048-EL-035 | N/A — 항상 켜짐/꺼짐 중 하나(EMPTY 는 `true`) | 상세 로딩 중 비활성 | FS-048-EL-021 | N/A — 이진 | §4.1 공통 규칙 적용 | 위와 동일. **목록 토글(FS-048-EL-009.10)과 같은 필드를 다툰다** — 둘 다 last-write-wins | N/A |
| FS-048-EL-036 | **담당자 0명이면 행이 없고 '담당자 추가' 버튼만 보인다.** 등록 폼의 초기값이 그 상태다(`EMPTY.contacts = []`) | 상세 로딩 중 전 행 비활성 | FS-048-EL-021 | 배열 전체 3단계 판정(FS-048-EL-036.5) | §4.1 공통 규칙 적용 | 배열 전체가 매 저장마다 치환된다 — 다른 관리자가 추가한 담당자는 **덮여 사라진다**(BE-048 §7.2) | **최대 8명**(`ACCOUNT_MAX_CONTACTS`) |
| FS-048-EL-036.1 | 각 셀 초기값 `''` | 저장·로딩 중 비활성 | FS-048-EL-021 | 이름만 필수(공백 불가), 이메일은 채우면 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. **부서·직급·연락처는 무제약** | §4.1 공통 규칙 적용 | 위와 동일 | **길이 상한 없음** — 5필드 × 8행 = 40개 무제약 입력 |
| FS-048-EL-036.2 | 담당자 0명이면 라디오가 없다 | 저장·로딩 중 비활성 | N/A — 서버 호출 없음 | N/A — 라디오 그룹이라 항상 0 또는 1개 선택 | §4.1 공통 규칙 적용 | N/A — 로컬 상태 | **행마다 1개 · 그룹 `name` 이 폼 전역 하드코딩**(FS-048-EL-036.2 비고) |
| FS-048-EL-036.3 | **행이 1개면 렌더되지 않는다** — 마지막 담당자는 지울 수 없다 | 저장·로딩 중 비활성 | N/A — 로컬 배열 조작 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 로컬 상태 | **확인 절차 없이 즉시 삭제**. 접근 이름이 행을 구분하지 못한다(§7 #16) |
| FS-048-EL-036.4 | 담당자 0명일 때 유일한 진입점 | 저장·로딩 중 비활성 | N/A — 로컬 배열 조작 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 로컬 상태 | **8명에서 버튼이 사라진다** — `add()` 자신도 상한을 재확인한다(`:154`). 사유 문구가 없다(§7 #17) |
| FS-048-EL-036.5 | 담당자 0명이면 이 문구가 뜬다('한 명 이상 등록하세요') | 저장 중에도 판정 유지 | N/A — 클라이언트 검증 | **이것이 유효성 표현.** 순차 판정이라 한 번에 한 문구 | §4.1 공통 규칙 적용 | N/A — 로컬 판정 | **행 수와 무관하게 1문구** — 어느 행인지 말하지 않는다(§7 #18) |
| FS-048-EL-036.6 | 0명 → 첫 추가가 자동 대표 | N/A — 순수 규칙 | N/A — 서버 호출 없음 | **스키마가 '대표담당 1명'을 강제하지 않는다** — UI 규칙일 뿐이다(BE-048 §3) | §4.1 공통 규칙 적용 | N/A — 로컬 규칙 | 8명 중 정확히 1명 |
| FS-048-EL-037 | 초기값 `''` | 저장·로딩 중 비활성 | FS-048-EL-021 — 본문 보존 | 500자 상한(`maxLength` + 스키마 이중). **상한 도달 시 조용히 멈춘다**(카운터만) | §4.1 공통 규칙 적용 | 상세 도착 시 `reset` | 500자. 카운터 `N/500` |
| FS-048-EL-038 | 값이 비면 '—' / '(상호 미입력)' | 상세 로딩 중에도 렌더된다 — **빈 값으로**(EMPTY 기준) | N/A — 순수 표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | N/A — 파생 표시 | 키 입력마다 `watch()` 로 전 필드를 다시 읽는다 — 리렌더 비용이 폼 전체에 걸린다 |
| FS-048-EL-039 | N/A — 항상 표시 | 저장 중 비활성(`disabled={saving}` — **로딩 중에는 살아 있다**) | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A | N/A |
| FS-048-EL-040 | N/A — 항상 표시 | 저장 중 '저장 중…' + 비활성. 상세 로딩 중에도 비활성 | 실패 시 FS-048-EL-021 배너 · 이동 없음 · **입력 보존** | 검증 실패면 서버를 호출하지 않고 첫 오류 필드로 포커스(RHF `shouldFocusError` + `onInvalid` — `useCrudForm.ts:246-248`) | §4.1 공통 규칙 적용 — **쓰기 게이팅 없음**(§7 #3) | 409 면 FS-048-EL-042 다이얼로그 — 성공 토스트·이동 없음 | FS-048-EL-045 의 락·멱등키가 연타를 1건으로 묶는다 |
| FS-048-EL-041 | N/A — 수정 진입에서만 성립 | `loadingDetail` 중에는 뜨지 않는다(`error` 가 있어야 성립) | 이것이 실패 표현. **404 와 5xx 를 문구·액션으로 가른다**(`isNotFound` — `useCrudForm.ts:144-149`). 어댑터가 `HttpError(404)` 를 준다(`crud.ts:105-107`) | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **404 은닉 응답도 '찾을 수 없습니다'로 보인다**(BE-048 §7.4) | **다른 관리자가 먼저 지운 거래처를 열면 이 배너가 뜬다** — 유령 폼이 아니다 | N/A — 표시 전용 |
| FS-048-EL-042 | N/A — 충돌이 있어야 성립 | 재조회('최신 내용 불러오기') 중에는 상세 쿼리가 돈다 | **이것이 409/412 표현.** 그 밖의 실패는 FS-048-EL-021 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 표현 자체.** 단, 409 는 **'존재 여부' 기반**이지 `version`/`ETag` 토큰이 아니다 — **둘 다 존재하는 동시 편집은 여전히 last-write-wins** 로 조용히 덮는다(§7 #22 · BE-048 §7.1) | 1건 |
| FS-048-EL-043 | N/A — 변경이 있어야 성립 | 저장 중에는 가드가 비활성(`isDirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 성공 후 `navigate(replace)` 로 떠나므로 가드가 걸릴 자리가 없다 | N/A |
| FS-048-EL-044 | N/A — 성공이 있어야 성립 | N/A — 결과 통지 | N/A — 실패는 배너·다이얼로그가 담당 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **유령 저장이 없다** — 어댑터가 없는 id 에 409 를 던진다(`crud.ts:126-128`) | 1건 |
| FS-048-EL-045 | N/A — 제출이 있어야 성립 | 이것이 중복 제출 방어 | 실패해도 키를 **버리지 않는다**(`:220` 은 성공 경로에만) — 재시도가 같은 키를 재사용 | `onInvalid` 가 락을 푼다(`:246-248`) — 검증 실패 후 다시 제출할 수 있다 | §4.1 공통 규칙 적용 | 픽스처 원장은 **적용에 성공한 뒤에만** 키를 기록한다(`crud.ts:56-60`) — 실패한 첫 시도가 키를 태워 재시도를 no-op 로 만들지 않는다 | 단건 |
| FS-048-EL-046 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | **abort 는 실패가 아니다** — 배너·토스트를 띄우지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 이탈 시 진행 중 저장이 취소된다 — **서버 도달 여부는 보장하지 않는다**(§7 #23) | 단건 |
| FS-048-EL-047 | N/A — 422 가 있어야 성립 | N/A — 응답 처리 | 이것이 필드 거절 표현 | **이것이 서버 유효성 표현.** 첫 위반 필드로 포커스 | §4.1 공통 규칙 적용 | N/A | `violations` 전건을 꽂는다 |
| FS-048-EL-048 | 빈 문자열은 trim 후에도 빈 문자열 | N/A — 순수 변환 | N/A — 동기 | `digitsToNumber('')` = 0 — **여신한도 빈 값이 0(미설정)이 된다** | §4.1 공통 규칙 적용 | N/A | 담당자 배열 전체를 매 저장마다 변환·전송 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 목록 조회 실패는 인라인 배너(FS-048-EL-012), 상세 조회 실패는 폼 대체 배너(FS-048-EL-041), 저장 실패는 폼 상단 배너(FS-048-EL-021), 인라인 토글 실패는 토스트(FS-048-EL-009.10). **오프라인 감지·복귀 재조회는 앱 전역에 없다**(`navigator.onLine` 0건 — quality-bar EXC-11) |
| 세션 만료 | 조회·쓰기 어디서든 401 이 오면 **앱 전역 401 인터셉터**(`shared/query/queryClient.ts:38,42-43` — `QueryCache`/`MutationCache` 의 `onError` → `notifySessionExpired()`)가 세션을 폐기하고 `/login?returnUrl=<현재경로>&reason=session_expired` 로 보낸다. **미저장 입력은 그때 사라진다** — 프로그램적 이동이라 FS-048-EL-043 가드가 발화하지 않는다(quality-bar EXC-19) |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건 — quality-bar EXC-05). abort 는 언마운트·다이얼로그 취소·인라인 토글 재발사에서만 발생한다 |
| 중복 제출 | 폼 저장은 **동기 락 + 멱등키**로 막는다(FS-048-EL-045). **삭제 확인·인라인 토글은 `disabled`/`busy` 뿐**이라 렌더 전 연타의 창이 남는다 — 다만 두 조작 모두 **값이 멱등**이라(같은 id 삭제 / 같은 `active` 값) 두 번 나가도 최종 상태가 같다 |
| 실패 통지의 자리 | ① 목록·상세 조회 실패 = 인라인 배너 ② 폼 저장 실패 = 폼 상단 배너 + 오류 코드 ③ 폼 저장 성공 = 토스트 ④ 다이얼로그 안의 실패 = **그 다이얼로그의 배너**(토스트가 modal 뒤에 숨지 않는다) ⑤ 인라인 토글 = 성공·실패 모두 토스트 ⑥ abort = 아무것도 띄우지 않는다 |
| 낙관적 업데이트 | **이 화면에 없다.** 폼 저장·삭제·인라인 토글이 전부 비관적(응답 후 무효화)이다 — 롤백 경로가 필요 없다(quality-bar EXC-14 의 위반 표면 없음) |
| 동시 조회 | 목록/상세 조회는 각각 동시에 1건만 유지된다(react-query). `staleTime` 30초 · **자동 재시도 없음**(`retry: false`) · **창 포커스 재조회 없음**(`refetchOnWindowFocus: false`) — `queryClient.ts:47,59,67` |
| 권한 없음 | **프론트 역할 분기 없음.** 라우트 read 권한은 AppShell 이 `<Outlet>` 을 감싸는 `RequirePermission`(`AppShell.tsx:490-492`)으로 가드하고, 리소스 파생이 `findCoveringLeaf` 라 `/sales/accounts/new`·`/:id/edit` 까지 `/sales/accounts` 잎으로 덮인다(`route-resource.ts:33-36`). **그러나 쓰기 게이팅(`useRouteWritePermissions`)이 이 화면에 배선돼 있지 않다** — 소비처 9곳에 `pages/sales/**` 가 없다(§7 #3). 서버 403 은 조회=배너, 저장=배너, 토글=토스트로 뭉개진다. 은닉 정책(403 vs 404)은 BE-048 §7.4 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary` 를 둔다(`AppShell.tsx:484-493`) — 화면이 던져도 사이드바·헤더가 남고 복구 화면이 뜬다 |
| 이미지·첨부 | **이 화면에 없다.** 거래처는 사업자등록증 사본 등을 첨부하지 않는다 — 이미지 필드가 0개다 |
| 목록 정렬·페이징 | 정렬은 고정(FS-048-EL-016), 페이징은 **없다**(§7 #2). 그래서 `useListState` 의 `page`·`clampPage`·`setSort` 는 이 화면에서 소비되지 않는다 |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| FS-048-EL-006 / EL-007 / EL-009 / EL-010 / EL-011 / EL-012 / EL-016 | 거래처 목록 조회 | R | 거래처 전량(담당자 포함) | `accountAdapter.fetchAll(signal)` | 필터·검색·정렬이 **전부 클라이언트**다. 서버는 조건을 받지 않는다 |
| FS-048-EL-022~EL-038 / EL-041 | 거래처 상세 조회 | R | 거래처 1건 | `accountAdapter.fetchOne(id, signal)` | 없으면 **`HttpError(404)`**(`crud.ts:105-107`) — FS-048-EL-041 의 404 분기가 여기서 온다 |
| FS-048-EL-040 / EL-044 / EL-045 (등록) | 거래처 등록 | W | `AccountInput` 전체 + `Idempotency-Key` | `accountAdapter.create(input, { signal, idempotencyKey })` | id 는 서버가 채번해야 한다 — 픽스처는 `acc-<seq>`(`data-source.ts:114-117`) |
| FS-048-EL-040 / EL-044 / EL-045 (수정) | 거래처 수정 | W | id + `AccountInput` 전체 + `Idempotency-Key` | `accountAdapter.update(id, input, { signal, idempotencyKey })` | 부분 갱신이 아니라 **전체 치환**. 없는 id 면 `HttpError(409)`(`crud.ts:126-128`) |
| FS-048-EL-009.10 | 거래 상태 인라인 토글 | W | id + `AccountInput` 전체(`active` 만 다름) | `accountAdapter.update(id, input, { signal })` — **멱등키 없음** | 저장 폼과 **같은 엔드포인트**를 쓴다. 전용 토글 API 가 아니다 |
| FS-048-EL-013 | 거래처 단건 삭제 | W | id | `accountAdapter.remove(id, { signal })` — **멱등키 없음** | 없는 id 면 `HttpError(409)`(`crud.ts:139-141`) |
| FS-048-EL-014 | 거래처 일괄 삭제 | W | id 배열 | `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`) | **전용 일괄 엔드포인트가 아니다** — N 건의 개별 삭제를 병렬로 낸다 |

> **현재 구현 상태 (백엔드 명세 참고)**: 백엔드는 없다. `accountAdapter` 는 `createCrudAdapter`(`shared/crud/crud.ts:86-147`)로 조립돼 브라우저 안 클로저 배열에 400ms 지연(`LATENCY_MS`)과 개발용 실패 스위치(`failIfRequested('sales-accounts', op)`)를 얹어 CRUD 를 흉내 낸다 — 실제 네트워크 0건. 새로고침하면 시드 3건으로 되돌아간다. `fetchOne` 은 없는 id 에 `HttpError(404)`, `update`/`remove` 는 없는 id 에 `HttpError(409)` 를 던지고, `create`/`update` 는 멱등 원장(`createIdempotencyLedger`)으로 재생을 흉내 낸다. **연동 지점은 `data-source.ts:110` 의 `// TODO(backend): GET/POST /api/sales/accounts · GET/PUT/DELETE /api/sales/accounts/:id` 한 줄이며, 이것이 이 화면의 유일한 심이다.** 일괄 삭제·인라인 토글·주소 검색에는 **별도 심이 없다**(BE-048 §4). 위 표는 백엔드 연결 후 의도된 동작이다.

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `AccountListPage.tsx` · `AccountFormPage.tsx` · `data-source.ts` · `types.ts` · `validation.ts` · `accounts.test.ts` · `components/{AccountBusinessPreview,AccountContactsField}.tsx` · `_shared/business.ts`, 그리고 이 화면이 소비하는 공용 코드(`shared/crud/{crud,useCrudList,useCrudForm,useCrudRowUpdate,useListState,useDebouncedSearch,CrudListShell,CrudTable,FormFeedback,parseFilter,validation,dev}.ts(x)` · `packages/ui/.../FormField.tsx`)
- [x] 읽기 전용 상세 라우트가 **실제로 없음을 코드로 재확인**하고(`App.tsx:241-243` 에 `/:id` 없음 · `CrudTable.tsx:172` 의 행 클릭이 `onEdit` 으로 감) §1 에 범위 밖으로 선언했다
- [x] 보이지 않는 요소(URL 직렬화 규칙·라이브 리전·스켈레톤·빈 상태 3분기·실패 배너·선택 해제 규칙·정렬 규칙·결합 규칙·대표담당 승격 규칙·제출 락/멱등키·abort·422 매핑·값 변환)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. 심이 **한 줄뿐**임을 명시했다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-048 영역) — `HttpError(404)`/`HttpError(409)` 는 **어댑터가 던지는 프론트 값**이라 계약이 아니라 현재 동작으로 적었다
- [x] `createCrudAdapter` 소비를 **직접 확인**했다(`data-source.ts:111`) — 409 가 '존재 여부' 기반이지 version/ETag 토큰이 아님을 §4·§7 에 명시했다
- [x] `useListState`·`useDebouncedSearch` 소비를 직접 확인했다(`AccountListPage.tsx:89,188`) — IA-13·COMP-10 판정 근거
- [x] `useRouteWritePermissions` **미소비**를 grep 으로 확인하고(소비처 9곳에 `pages/sales/**` 없음) §4.1·§7 에 정직히 적었다
- [x] required FormField 자식 타입을 전수 확인했다 — 8개 전부 `input`/`SelectField` 라 `aria-required` 가 주입된다. **`AccountContactsField` 만 `FormField` 밖 손조립**임을 §7 #6 에 남겼다

## 7. 미결 사항 (UI 기획 / 아키텍처 / 백엔드 명세 / 프론트 구현 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (영업 관리 SCR 미작성 — `specs/sales/` 에 이 문서가 최초다) | UI 기획 / 아키텍처 |
| 2 | **페이지네이션이 없다** — `CrudTable` 이 `visibleItems` 전량을 렌더한다(`CrudTable.tsx:171`). 거래처는 상한 없이 늘어나는 원장이다. 그래서 `useListState` 의 `page`·`clampPage` 가 소비되지 않고, `SeqCell seq={index + 1}` 도 페이징 도입 시 2페이지에서 1로 리셋된다(quality-bar IA-04 P0 · ERP-15 P1 · COMP-07 P2) | UI 기획 · 백엔드 명세 (BE-048 §7.5) |
| 3 | **쓰기 권한 게이팅이 배선돼 있지 않다** — `useRouteWritePermissions` 소비처 9곳에 `pages/sales/**` 가 없다. read 전용 역할도 '거래처 등록'·행 수정/삭제·상태 토글을 보고 누른다. read 게이팅은 `RequirePermission` 이 정상 수행(quality-bar EXC-03 P0) | UI 기획 쪽 변경 요청 |
| 4 | 이탈 가드(EL-043)가 **`navigate()` 프로그램 이동을 가로채지 못한다** — '목록으로'(EL-018)·'취소'(EL-039)를 누르면 미저장 입력이 조용히 사라진다. 훅의 3경로 계약 밖이다 | UI 기획 쪽 변경 요청 |
| 5 | 폼이 **자체 `<h1>`(EL-019)을 그리고 AppHeader 도 `<h1>` 을 그린다** — `<h1>` 2개. `findCoveringLeaf` 수렴으로 **가지 라벨 폴백은 해소**됐으나(`/sales/accounts/new` → '거래처'), '등록/수정' 행위가 AppHeader 제목에 반영되지 않는 것은 의도된 설계다(`nav-config.ts:294-296`). 목록에는 in-content h1 이 없어 **title 소스 모델이 화면 타입마다 모순**이다(quality-bar IA-02 P0) | 프론트 구현 · UI 기획 |
| 6 | **A11Y-11 잔여 2건**: ① `FormField` 의 `hint`(여신한도 '0 이면 미설정')가 **유효할 때 `hintIdOf` 로 `aria-describedby` 에 연결되지 않는다** — 힌트가 AT 에 닿지 않는다 ② `AccountContactsField` 가 `FormField` 밖에서 `<span>담당자 *</span>` 를 손으로 그려 **`*` 가 리터럴 텍스트이고 어느 담당자 입력에도 `aria-required` 가 없다**(quality-bar A11Y-11 P0 · COMP-04 P1) | UI 기획 쪽 변경 요청 |
| 7 | **상세 조회 실패 문구에 조사가 빠졌다** — `'거래처 찾을 수 없습니다.'` · `'거래처 불러오지 못했습니다.'`(`AccountFormPage.tsx:230-231`). 형제 화면은 `'계약을 찾을 수 없습니다.'`(`ContractFormPage.tsx:222`) · `'견적을 찾을 수 없습니다.'`(`QuoteFormPage.tsx:236`)로 조사가 있다 — **이 화면만 누락**이다. `objectParticle('거래처')` = '를' 이므로 헬퍼로 풀 수 있다(quality-bar ERP-13 P1 · ERP-06 P1) | UI 기획 쪽 변경 요청 |
| 8 | 목록 조회 실패(EL-012)·저장 실패(EL-021)·삭제 실패(EL-013)가 **status 로 분기하지 않는다** — 403·404·409·429·500·타임아웃이 같은 문구다. `HttpError` 는 status 를 갖고 `?status=<op>:<code>` 로 재현 가능한데도 소비하지 않는다(quality-bar EXC-06 P1) | UI 기획 |
| 9 | **`lastTradeAt`·`creditGrade` 가 사람이 손으로 넣는 값**이다 — 최근거래일이 거래 이력에서 파생되지 않고, 신용등급에 산정 근거가 없다. 게다가 `lastTradeAt` 은 스키마 검증이 `z.string()` 뿐이라 날짜 실재를 확인하지 않는다. 원장의 신뢰가 입력자의 성실성에 걸린다 | 아키텍처 (도메인 경계) · 백엔드 명세 |
| 10 | 사업자명 셀(EL-009.4)·주소·비고에 truncate 가 없어 긴 값이 표 열을 넓힌다(quality-bar COMP-09 P2) | UI 기획 쪽 변경 요청 |
| 11 | 거래유형·신용등급 톤 레지스트리가 `pages/sales/accounts/types.ts` **지역**이다 — 계약(FS-049)·견적(FS-050)과 통합된 앱 전역 status→tone 레지스트리가 아니다(quality-bar ERP-01 P1) | UI 기획 · 아키텍처 |
| 12 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })` 다(`CrudTable.tsx:144`). 셀 수만 `columns.length + 3` 로 파생된다. 페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다(quality-bar COMP-06 P2) | UI 기획 (#2 와 함께) |
| 13 | 빈 상태(EL-011)에 **생성 CTA 를 넘기지 않는다** — `empty.createAction` 이 비어 진짜 빈 상태에서도 등록 버튼이 툴바에만 있다(quality-bar STATE-05 P1 의 '(a) 진짜 비어있음 → primary create CTA') | UI 기획 쪽 변경 요청 |
| 14 | **한국형 ERP 입력 마스킹이 반쪽이다**(quality-bar ERP-14 P1) — 사업자등록번호만 실시간 하이픈 + 체크섬을 갖췄다. **여신한도**는 천단위 구분·'원' 표기가 없고 `'1,000,000'` 붙여넣기를 거절한다. **전화번호**(대표전화·담당자 연락처)는 형식 검증·마스킹이 전무하다. 사업자번호 붙여넣기가 10자리를 넘으면 **초과분이 조용히 잘린다**(`business.ts:13`) | UI 기획 쪽 변경 요청 |
| 15 | 사업장 주소가 자유 텍스트다 — 우편번호·주소 검색 연동이 없다 | 아키텍처 · UI 기획 |
| 16 | 담당자 삭제 버튼(EL-036.3)이 **DS `<Button>` 이 아닌 손조립**이고 접근 이름이 `'담당자 삭제'` 로 **행을 구분하지 못한다** — 세 행 모두 같은 이름이다. 확인 절차도 없다(quality-bar COMP-01 P1 · A11Y-16 P1) | UI 기획 쪽 변경 요청 |
| 17 | 담당자 8명 상한(EL-036.4)에 도달하면 **버튼이 조용히 사라질 뿐** 사유를 말하지 않는다. 품목 상한(FS-050)도 같은 결이다 | UI 기획 쪽 변경 요청 |
| 18 | 담당자 오류(EL-036.5)가 **어느 행이 문제인지 말하지 않고**, 어떤 입력과도 `aria-describedby` 로 연결되지 않으며, 순차 `return` 이라 한 번에 한 문구만 뜬다 — 8행 중 3행의 이메일이 틀려도 한 줄만 본다 | UI 기획 쪽 변경 요청 |
| 19 | 저장 버튼(EL-040)이 `loading` prop 대신 손으로 쓴 `'저장 중…'` 라벨을 쓴다(quality-bar COMP-01 P1) | UI 기획 쪽 변경 요청 |
| 20 | 인라인 토글(EL-009.10)의 **409 가 일반 토스트로 뭉개진다** — `useCrudRowUpdate` 에 충돌 다이얼로그가 없어 '다른 사용자가 먼저 삭제한 항목입니다'가 '변경하지 못했습니다'로 바뀐다 | UI 기획 쪽 변경 요청 |
| 21 | 여신한도에 **상한이 없다** — `/^\d+$/` 만 보므로 20자리 숫자도 통과하고 `Number()` 가 안전 정수 범위를 넘으면 값이 뭉개진다. 금액 필드의 상한은 서버 계약에도 필요하다(BE-048 §3) | UI 기획 · 백엔드 명세 |
| 22 | **낙관적 동시성 토큰이 없다** — `Account` 에 `version`/`updatedAt` 필드가 없고 어댑터가 `If-Match` 를 보내지 않는다. 현재 409 는 **'대상이 사라졌는가'** 만 본다 → **둘 다 존재하는 동시 편집은 last-write-wins 로 조용히 덮인다**(BE-048 §7.1) | 백엔드 명세 (BE-048 §7.1) · UI 기획 |
| 23 | 이탈 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다 — 이미 반영된 저장이 화면에 안 보일 수 있다 | 백엔드 명세 (BE-048) |
| 24 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료 리다이렉트가 미저장 입력을 버린다(가드 미발화) — 전부 **앱 전역** 사안(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | UI 기획 · 프론트 구현 |
| 25 | 일괄 삭제(EL-014)에 **진행률·취소·실패 행 식별이 없다** — 'N중 M건 실패'만 알린다. Shift-click 범위 선택도 없다(quality-bar EXC-10 P1 · EXC-18 P1) | UI 기획 |
| 26 | 목록에 **엑셀 내보내기가 없다** — 거래처 원장은 세무·오프라인 검토의 대표 대상이다(quality-bar ERP-12 P1) | UI 기획 |
</content>
</invoke>
