---
id: FS-049
title: "계약 (목록·등록·수정)"
screen: SCR-049               # ⚠ 영업 관리 SCR 미작성 — §7 미결 사항 참조
route: /sales/contracts
owner: 기능 명세
reviewer: 명세 리뷰
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-049. 계약 (목록·등록·수정)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 거래처와 맺은 계약을 관리한다 — 계약명·거래처·계약유형·기간·금액(부가세 포함/별도)·자동갱신(통지기한)·계약 상태(초안→검토→진행→만료/해지)·전자서명 상태·주요 조항 요약·계약서 스캔 첨부를 등록·수정하고, 목록에서 상태·키워드로 좁혀 훑으며 **갱신 임박** 계약을 배지로 식별한다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — §4.1) |
| 진입 경로 | 좌측 GNB > 영업 관리 > 계약 (`nav-config.ts:156`) |
| 포함 화면 | 목록 `/sales/contracts` · 등록 `/sales/contracts/new` · 수정 `/sales/contracts/:id/edit` (`App.tsx:244-246`) |
| **범위 밖** | **계약 상세 뷰** — 읽기 전용 상세 라우트가 없다. 행을 누르면 곧바로 수정 폼으로 간다(`CrudTable.tsx:172` → `ContractListPage.tsx:184`). **전자서명 발송·서명 수집** — `signStatus` 는 사람이 고르는 select 일 뿐 서명 워크플로가 없다(§7 #9). **자동갱신 실행·통지 발송** — `autoRenew`·`renewNoticeDays` 는 데이터이고 이를 실행하는 배치·알림이 없다. 화면은 `isRenewalDue` 로 **배지만** 띄운다(§7 #10). **계약↔견적/프로젝트 연결** — 계약은 견적을 참조하지 않는다 |
| 구현 경로 | `apps/admin/src/pages/sales/contracts/**` · 도메인 공용 `apps/admin/src/pages/sales/_shared/business.ts`(`formatWon`) |
| 대응 SCR | SCR-049 (미작성 — §7 #1) |
| 공통 컴포넌트 | `shared/crud/{useCrudList,useCrudForm,useListState,parseFilter,CrudListShell,CrudTable,FormServerError,FormConflictDialog,createCrudAdapter,requiredText,dev}` · `shared/ui/{SearchField,SelectField,StatusBadge,ToggleSwitch,DateRangeField,ImageGalleryField,Button,Card,CardTitle,FormField,TextareaField,Alert,PlusCircleIcon,ChevronLeftIcon,controlStyle,errorIdOf,fieldLabelStyle,fieldStyle,pageTitleStyle,alertActionRowStyle,useUnsavedChangesDialog,useToast}` · `shared/format{formatDate,formatNumber,objectParticle}` |

> **검증의 정본은 `validation.ts` 의 zod 스키마다**(`contractSchema`). 잔여일수·갱신임박 판정은 `types.ts:104-116` 의 순수 함수(`daysRemaining`·`isRenewalDue`)가 소유하며 테스트가 이를 고정한다(`contracts.test.ts:37-64`).

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-049-SEC-01 | 목록 툴바 | 검색 + 계약 상태 필터(select) + 우상단 '계약 등록' primary 버튼 |
| FS-049-SEC-02 | 목록 라이브 리전 · 조회 요약 | 스크린리더 전용 상태 한 줄 + 건수 텍스트 |
| FS-049-SEC-03 | 선택 바 (비표시 기본) | 선택이 1건 이상일 때만. 일괄 삭제 버튼 |
| FS-049-SEC-04 | 목록 표 | 선택·순번·계약명·거래처·유형·계약기간·금액·상태(+갱신임박)·행 액션. **페이지네이션이 없다**(§7 #2) |
| FS-049-SEC-05 | 목록 조회 실패 배너 (비표시 기본) | 요약·선택바·표를 대체 |
| FS-049-SEC-06 | 삭제 확인 다이얼로그 (비표시 기본) | 단건 / 일괄 |
| FS-049-SEC-07 | 폼 헤더 | '목록으로' + `<h1>` + 설명 |
| FS-049-SEC-08 | 폼 카드 — 계약 정보 | 계약명·거래처·계약유형·담당자 |
| FS-049-SEC-09 | 폼 카드 — 금액 · 기간 | 계약금액·부가세 토글·계약 기간(DateRangeField) |
| FS-049-SEC-10 | 폼 카드 — 갱신 · 서명 · 상태 | 자동갱신 토글 + **조건부** 통지기한 · 계약 상태 · 전자서명 상태 |
| FS-049-SEC-11 | 폼 카드 — 조항 · 첨부 | 주요 조항 요약 textarea + 계약서 스캔 갤러리(최대 5장) |
| FS-049-SEC-12 | 폼 카드 — 비고 | 내부 메모 textarea |
| FS-049-SEC-13 | 폼 미리보기 카드 | 계약서 표제부 요약 |
| FS-049-SEC-14 | 폼 푸터 액션 | 취소 / 등록·저장 |
| FS-049-SEC-15 | 폼 상세 조회 실패 배너 (비표시 기본) | 404 / 일반 오류 분기 — 폼 전체를 대체 |
| FS-049-SEC-16 | 폼 쓰기 실패·충돌·이탈 가드 (비표시 기본) | 저장 실패 배너 · 충돌 다이얼로그 · 미저장 이탈 가드 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-049-EL-001 | FS-049-SEC-01 | 검색 입력 | 입력 | `SearchField`(`ContractListPage.tsx:138-145`), 접근 이름 '계약명·거래처 검색'. `{...list.searchInputProps}` 스프레드로 **IME 조합 중 커밋 금지 + 조합 중 Enter 차단 + 250ms 디바운스**를 상속한다(`useDebouncedSearch.ts:87,121-129`). 커밋된 값은 URL `?q=` 로 | — | 필터링은 **클라이언트**(`searchContracts`) — 서버 재조회 없음 |
| FS-049-EL-001.1 | FS-049-SEC-01 | 검색 매칭 규칙 | 텍스트 | `searchContracts`(`types.ts:129-137`): 앞뒤 공백 제거·소문자화 후 **계약명 · 거래처명**에 부분 일치(OR) | — | 비표시 규칙. **담당자·조항 요약은 검색 대상이 아니다** |
| FS-049-EL-002 | FS-049-SEC-01 | 계약 상태 필터 | 입력 | `SelectField`, 접근 이름 '상태로 거르기'. '전체 상태' + 초안·검토중·진행중·만료·해지(`CONTRACT_STATUS_OPTIONS`). 선택 시 `list.setFilter('status', …)` → URL `?status=` | — | 기본값(`all`)과 같은 값은 URL 에서 지운다(`useListState.ts:115-117`). **⚠ 이 파라미터 이름이 개발용 실패 스위치 `?status=<op>:<code>`(`dev.ts:24`)와 충돌한다**(§7 #11) |
| FS-049-EL-003 | FS-049-SEC-01 | 필터 값 정규화 규칙 | 텍스트 | `parseFilter(list.filters['status'] ?? 'all', CONTRACT_STATUS_FILTER_VALUES, 'all')`(`ContractListPage.tsx:82-86`) — 손으로 고친 `?status=거짓말` 은 '전체'로 되돌린다 | — | 비표시 규칙 |
| FS-049-EL-004 | FS-049-SEC-01 | '계약 등록' 버튼 | 버튼 | 툴바 우상단. DS `<Button variant="primary" size="md">` + `PlusCircleIcon`. `/sales/contracts/new` 이동 | — | **쓰기 권한을 묻지 않는다**(§7 #3) |
| FS-049-EL-005 | FS-049-SEC-01 | 조회 상태 URL 직렬화 규칙 | 텍스트 | 상태 필터·검색어의 **단일 원천이 URL 쿼리스트링**이다(`ContractListPage.tsx:80`). `replace: true` 갱신(`useListState.ts:125`)이라 history 가 쌓이지 않으면서 상세→Back 이 조건을 복원한다 | — | 비표시 규칙. **`page`·`sort` 는 소비되지 않는다**(§7 #2) |
| FS-049-EL-006 | FS-049-SEC-02 | 목록 라이브 리전 | 텍스트 | **항상 마운트된** `aria-live="polite" aria-atomic="true"` 시각 숨김 컨테이너(`CrudListShell.tsx:107-109`). `계약 N건을 찾았습니다.` / `조건에 맞는 계약 결과가 없습니다.` / `계약 목록을 불러오지 못했습니다.` | — | 비표시. 최초 로드 중에는 침묵 |
| FS-049-EL-007 | FS-049-SEC-02 | 조회 요약 텍스트 | 텍스트 | 최초 로드 중 '불러오는 중…', 그 외 `전체 N건`. **재조회 중에는 건수를 유지**하고 ' · 새로고침 중…' 만 덧붙인다. 선택이 있으면 ' · N건 선택됨'. `aria-busy={refreshing}`(`CrudListShell.tsx:118-122`) | — | N 은 필터·검색 적용 후 건수 |
| FS-049-EL-008 | FS-049-SEC-03 | 선택 바 · 일괄 삭제 버튼 | 버튼 | `SelectionBar` 안 `<Button variant="danger">선택 N건 삭제</Button>`(`CrudListShell.tsx:125-133`) | O | 클릭 시 FS-049-EL-014 |
| FS-049-EL-009 | FS-049-SEC-04 | 계약 목록 표 | 표 | `CrudTable`. `aria-busy={firstLoading}`. caption(시각 숨김) '계약 목록 — 행을 누르면 해당 항목으로 이동합니다…'. 컬럼 9개(선택·순번·6열·행 액션). **전량 렌더**(§7 #2) | O | 기본 정렬은 시작일 내림차순(FS-049-EL-016) |
| FS-049-EL-009.1 | FS-049-SEC-04 | 전체 선택 헤더 셀 | 입력 | `SelectAllHeaderCell`, 라벨 '이 페이지의 계약 전체 선택', `labelId="contract-select-all"`. **화면에 보이는 행만** 토글 | — | 선택 범위 = '현재 보이는 결과' |
| FS-049-EL-009.2 | FS-049-SEC-04 | 행 선택 셀 | 입력 | `RowSelectCell`, 접근 이름 `'<계약명> 선택'` | — | — |
| FS-049-EL-009.3 | FS-049-SEC-04 | 순번 셀 | 텍스트 | `SeqCell seq={index + 1}`(`CrudTable.tsx:179`) | — | 페이지네이션 도입 시 공식이 틀어진다(§7 #2) |
| FS-049-EL-009.4 | FS-049-SEC-04 | 계약명 셀 | 텍스트 | `item.title` 그대로 | — | **truncate 없음**(§7 #12) |
| FS-049-EL-009.5 | FS-049-SEC-04 | 거래처 셀 | 텍스트 | `item.accountName` 그대로 | — | **거래처 FK 가 아니라 이름 문자열이다**(`types.ts:16-17` 주석이 자백한다) — 링크가 아니고 거래처(FS-048)로 갈 수 없다(§7 #8) |
| FS-049-EL-009.6 | FS-049-SEC-04 | 유형 셀 | 텍스트 | `contractTypeLabel(item.contractType)`, `nowrap`. 공급계약·용역계약·유지보수·라이선스·임대·비밀유지(NDA) | — | — |
| FS-049-EL-009.7 | FS-049-SEC-04 | 계약기간 셀 | 텍스트 | `` `${item.startAt} ~ ${item.endAt}` `` — **달력일 문자열 그대로**(`ContractListPage.tsx:117`). muted + `tabular-nums` + `nowrap` | — | `formatDate` 를 거치지 않는다 — 이미 'YYYY-MM-DD' 다 |
| FS-049-EL-009.8 | FS-049-SEC-04 | 금액 셀 | 텍스트 | `formatWon(item.amount)` → '36,000,000원'. `numeric: true` 라 우측 정렬 + `tabular-nums`(`CrudTable.tsx:184`) | — | **'원'이 숫자에 붙어 있어** 우측 정렬 grid 에서 단위가 마지막 자릿수를 따라다닌다(quality-bar ERP-07 — §7 #13). **부가세 포함/별도가 목록에 보이지 않는다** — 같은 열의 두 값이 다른 기준일 수 있다(§7 #14) |
| FS-049-EL-009.9 | FS-049-SEC-04 | 상태 배지 (+ 갱신임박) | 배지 | `StatusBadge`(`contractStatusMeta` — `types.ts:84-94`): 초안=neutral · 검토중=info · 진행중=success · 만료=neutral · 해지=danger. **`isRenewalDue(item, today)` 면 warning '갱신임박' 배지를 덧붙인다**(`ContractListPage.tsx:128`) | — | `isRenewalDue`(`types.ts:112-116`) = 상태가 `active` **AND** `autoRenew` **AND** 잔여일수가 0 이상 `renewNoticeDays` 이하. **만료=neutral 이라 '만료'와 '초안'이 같은 톤**이다(§7 #15) |
| FS-049-EL-009.10 | FS-049-SEC-04 | 행 액션 (수정·삭제) | 버튼 | `RowActions`(연필/휴지통), 접근 이름 기준 `nameOf(item)` = 계약명. 수정 → `/sales/contracts/<id>/edit`. 삭제 → FS-049-EL-013 | O | **쓰기 게이팅 없음**(§7 #3) |
| FS-049-EL-009.11 | FS-049-SEC-04 | 행 전체 클릭 이동 | 텍스트 | 행 빈 영역 클릭 시 **수정 폼**으로(`CrudTable.tsx:172` → `onEdit`) | — | 비표시 규칙. 읽기 전용 상세가 없다(§1) |
| FS-049-EL-010 | FS-049-SEC-04 | 갱신임박 기준일 규칙 | 텍스트 | `const today = formatDate(new Date())`(`ContractListPage.tsx:88`) — **렌더마다 다시 계산**한다(`useMemo` 로 고정하지 않는다). `formatDate` 는 **서울 고정** 달력일을 준다(`shared/format.ts:161-165` → `partsOfDate`) | — | 비표시 규칙. FS-026 의 SLA 가 마운트 시각을 고정한 것과 **반대**이며, 여기서는 렌더마다 갱신이라 시계가 멈추지 않는다. 다만 리렌더가 없으면 날짜 경계를 넘어도 갱신되지 않는다 |
| FS-049-EL-010.1 | FS-049-SEC-04 | 잔여일수 계산 규칙 | 텍스트 | `daysRemaining(endAt, today)`(`types.ts:104-109`) = `Math.round((end − now) / 86,400,000)`. 두 끝을 `new Date('YYYY-MM-DDT00:00:00')` 으로 **브라우저 로컬** 파싱한다. 해석 실패면 0 | — | 비표시 규칙. **앵커가 혼용된다** — `today` 는 서울 고정(`formatDate`), 파싱은 로컬. 두 끝이 같은 로컬 존이고 `Math.round` 가 있어 **DST 존에서도 일수가 맞는다**(±1시간 → 0.04일). 관측되는 어긋남은 없다(§7 #16) |
| FS-049-EL-011 | FS-049-SEC-04 | 목록 로딩 스켈레톤 | 스켈레톤 | **최초 로드에서만**(`firstLoading` — `useCrudList.tsx:71`) 표 본문을 **5행 고정** 스켈레톤으로 대체(`CrudTable.tsx:143-152`) | — | 비표시. **재조회 중에는 이전 행이 유지된다**(`crud.ts:254` `placeholderData`). 행 수 하드코딩 5(§7 #17) |
| FS-049-EL-012 | FS-049-SEC-04 | 빈 상태 (3분기) | 빈상태 | 조회 완료·0행이면 공유 `Empty`(`CrudTable.tsx:157-167`)가 맥락으로 갈린다: 검색어 → '검색 지우기', 필터 → '필터 초기화', 아무것도 없으면 '등록된 계약이 없습니다' 계열. 조사는 `Empty` 가 런타임에 고른다 | — | 비표시. 맥락은 `ContractListPage.tsx:176-181` 이 넘긴다. **생성 CTA 를 넘기지 않는다**(§7 #18) |
| FS-049-EL-013 | FS-049-SEC-06 | 단건 삭제 확인 다이얼로그 | 모달 | `ConfirmDialog intent="delete"`(`useCrudList.tsx:154-165`). 제목 '계약 삭제', 문구 `'<계약명>'을/를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`(조사 주입). 확인 버튼 busy 중 비활성 + `aria-busy` + '처리 중…'. 실패 시 다이얼로그 유지 + error 배너 | O | 취소/Esc/dim 이 진행 중 요청을 abort(`:87`). **서명완료·진행중 계약도 아무 경고 없이 지울 수 있다**(§7 #19) |
| FS-049-EL-014 | FS-049-SEC-06 | 일괄 삭제 확인 다이얼로그 | 모달 | `ConfirmDialog intent="delete"`(`useCrudList.tsx:166-177`). '계약 일괄 삭제' · '선택한 계약 N건을 삭제하시겠습니까? …' · 확인 라벨 'N건 삭제'. 부분 실패면 다이얼로그 유지 + 'N건 중 M건을 삭제하지 못했습니다.' | O | 전건 성공에만 선택 해제 + '계약 N건을 삭제했습니다.' 토스트 |
| FS-049-EL-015 | FS-049-SEC-04 | 선택 해제 규칙 | 텍스트 | 상태 필터·검색어가 바뀌면 선택을 **전부 해제**한다(`ContractListPage.tsx:101-103` — `useEffect(() => clear(), [filter, keyword, clear])`) | — | 비표시 규칙. 화면에 없는 행이 선택된 채 '선택 3건 삭제'가 되지 않게 한다 |
| FS-049-EL-016 | FS-049-SEC-04 | 정렬 규칙 | 텍스트 | `sortContracts`(`types.ts:140-145`) — **시작일 내림차순**(최근이 위), 같은 날짜는 **id 내림차순 안정 정렬**. 어댑터가 `fetchAll`·쓰기 직후에 적용(`crud.ts:89-90,115,130`). **정렬 변경 UI 가 없다** | — | 비표시 규칙. **종료일·금액·상태로 정렬할 수 없다** — 만료 임박 순으로 훑을 수 없다는 뜻이다(§7 #20) |
| FS-049-EL-017 | FS-049-SEC-04 | 필터·검색 결합 규칙 | 텍스트 | `searchContracts(filterContracts(items, filter), keyword)`(`ContractListPage.tsx:105-108`) — 상태로 먼저 좁히고 그 결과에 검색어를 건다. `useMemo` | — | 비표시 규칙 |
| FS-049-EL-018 | FS-049-SEC-07 | 폼 '목록으로' 버튼 | 버튼 | 좌상단. `ChevronLeftIcon` + '목록으로'. `navigate('/sales/contracts')` | — | **`navigate()` 라 이탈 가드가 가로채지 못한다**(§7 #4) |
| FS-049-EL-019 | FS-049-SEC-07 | 폼 화면 제목 | 텍스트 | `<h1 style={pageTitleStyle}>{isEdit ? '계약 수정' : '계약 등록'}</h1>`(`ContractFormPage.tsx:252`) | — | **AppHeader 의 `<h1>`(`AppHeader.tsx:101`)과 중복** — 그 자리는 `findCoveringLeaf` 가 푼 '계약'을 보인다. h1 2개(§7 #5) |
| FS-049-EL-020 | FS-049-SEC-07 | 폼 설명 문구 | 텍스트 | '별표(*) 항목은 필수입니다. 계약 기간·금액을 확인하세요.' | — | 정적 문구 |
| FS-049-EL-021 | FS-049-SEC-16 | 저장 실패 배너 | 배너 | `FormServerError`(`FormFeedback.tsx:38-47`). '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' + 있으면 `오류 코드 <reference>`(복사 가능) | O | raw 서버 본문·스택·status 를 산문으로 쓰지 않는다 |
| FS-049-EL-022 | FS-049-SEC-08 | 계약명 입력 | 입력 | `FormField htmlFor="contract-title" required`, 자식 `<input type="text">` → **`aria-required` 주입**. `maxLength=80`(`CONTRACT_TITLE_MAX`). 오류 시 `aria-invalid` + `aria-describedby` 짝 | O | 검증 `requiredText('계약명', 80)` — '계약명을 입력하세요.' / '계약명은 80자를 넘을 수 없습니다.'(조사 주입) |
| FS-049-EL-023 | FS-049-SEC-08 | 거래처 입력 | 입력 | `FormField htmlFor="contract-account" required`, `<input>`(주입). placeholder '예: (주)한빛소프트웨어'. 오류 시 aria 짝 | O | 검증 `requiredText('거래처', 60)`. **자유 텍스트다** — 거래처 목록(FS-048)에서 고르는 선택기가 없어 오타가 곧 새 거래처다(§7 #8) |
| FS-049-EL-024 | FS-049-SEC-08 | 계약유형 select | 입력 | `FormField htmlFor="contract-type" required`, 자식 **`SelectField`** → 주입 대상(`FormField.tsx:40`). 6종. 기본값 `supply` | O | `z.enum` |
| FS-049-EL-025 | FS-049-SEC-08 | 담당자 입력 | 입력 | `FormField htmlFor="contract-owner" label="담당자"`(필수 아님), `<input>`. placeholder '예: 김영업' | O | **제약 없음**(`z.string()`), `maxLength` 없음. **선택지가 아니라 자유 텍스트**라 운영자 계정과 연결되지 않는다(§7 #21) |
| FS-049-EL-026 | FS-049-SEC-09 | 계약금액 입력 | 입력 | `FormField htmlFor="contract-amount" label="계약금액 (원)" required`, `<input inputMode="numeric">`(주입). 오류 시 aria 짝 | O | 검증 2단계(`validation.ts:38-58`): ① `/^\d+$/` 아니면 '계약금액은 숫자만 입력할 수 있습니다.' ② `Number(raw) <= 0` 이면 '계약금액은 0보다 커야 합니다.' — **첫 단계에서 `return` 하므로 한 번에 한 문구.** 폼 값은 문자열, 저장 시 `digitsToNumber`. **천단위 구분·'원' 마스킹 없음**(§7 #22) |
| FS-049-EL-027 | FS-049-SEC-09 | 부가세 토글 | 입력 | `<span style={fieldLabelStyle}>부가세</span>` + `ToggleSwitch`(`ContractFormPage.tsx:355-365`). 접근 이름 '부가세 포함 여부', onLabel '포함' / offLabel '별도'. `setValue('vatIncluded', next, { shouldDirty: true })` | O | **`FormField` 밖 손조립 라벨** — 필수가 아니라 마커 문제는 없다. **금액이 포함인지 별도인지에 따라 실제 청구액이 10% 다른데 목록에는 이 값이 없다**(§7 #14) |
| FS-049-EL-028 | FS-049-SEC-09 | 계약 기간 (DateRangeField) | 입력 | DS `DateRangeField label="계약 기간" required`(`ContractFormPage.tsx:368-377`). 시작~종료 `<input type="date">` 2개를 '~' 로 잇는다. **`required` 를 두 입력 각각에 `required` + `aria-required` 로 잇는다**(`DateRangeField.tsx:48,70,88`) — 컴포넌트가 스스로 처리한다. 각 칸에 시각 숨김 `<label>`('계약 기간 시작일'/'… 종료일'). 오류 시 **두 입력 모두** `aria-invalid` + `aria-describedby={errorId}` 짝(`:45`) | O | 검증(`validation.ts:59-80`): ① 두 값이 `/^\d{4}-\d{2}-\d{2}$/` + 실재 날짜가 아니면 `startAt` 경로에 '계약 기간을 YYYY-MM-DD 형식으로 입력하세요.' ② `end < start` 면 `endAt` 경로에 '종료일은 시작일보다 빠를 수 없습니다.' 화면은 `errors.startAt?.message ?? errors.endAt?.message`(`ContractFormPage.tsx:211`)로 **하나만** 표시한다 |
| FS-049-EL-029 | FS-049-SEC-10 | 자동갱신 토글 | 입력 | `<span style={fieldLabelStyle}>자동갱신</span>` + `ToggleSwitch`. 접근 이름 '자동갱신 여부', onLabel '사용' / offLabel '미사용' | O | **`FormField` 밖 손조립 라벨**. 이 값이 FS-049-EL-030 의 렌더 여부를 지배한다 |
| FS-049-EL-030 | FS-049-SEC-10 | 갱신 통지기한 입력 (조건부) | 입력 | **`autoRenew` 가 true 일 때만 렌더된다**(`ContractFormPage.tsx:395-413`). `FormField htmlFor="contract-renew-notice" label="갱신 통지기한 (일)" hint="만료 N일 전 통지"`(**필수 아님**), `<input inputMode="numeric">`. 기본값 `'30'` | O | 검증(`validation.ts:81-92`): `autoRenew` 일 때만 `/^\d+$/`. **오류 시 `controlStyle(true)` 로 테두리만 붉어지고 `aria-invalid`·`aria-describedby` 가 없다** — 오류 `<p role="alert">` 는 `FormField` 가 렌더하지만 입력과 연결되지 않는다(§7 #6). **hint 도 valid 일 때 연결되지 않는다**(§7 #6). 저장 시 `autoRenew` 가 false 면 **0 으로 강제**된다(`ContractFormPage.tsx:142`) |
| FS-049-EL-031 | FS-049-SEC-10 | 계약 상태 select | 입력 | `FormField htmlFor="contract-status" required`, `SelectField`(주입). 초안·검토중·진행중·만료·해지. 기본값 `draft` | O | **상태 전이 규칙이 없다** — '해지'에서 '초안'으로 되돌릴 수 있고 아무도 막지 않는다. FS-026 의 `STATUS_FLOW`·`canSetStatus` 같은 순수 규칙이 이 도메인에 **없다**(§7 #23) |
| FS-049-EL-032 | FS-049-SEC-10 | 전자서명 상태 select | 입력 | `FormField htmlFor="contract-sign" required`, `SelectField`(주입). 미발송·서명대기·일부서명·서명완료. 기본값 `unsigned` | O | **사람이 고르는 값이다** — 서명 워크플로가 없다(§1 범위 밖 · §7 #9). '서명완료'인데 첨부가 0장이어도 아무도 막지 않는다 |
| FS-049-EL-033 | FS-049-SEC-11 | 주요 조항 요약 textarea | 입력 | `TextareaField label="주요 조항 요약"`, `maxLength=1000`(`CONTRACT_TERMS_MAX`), 4행, 우측 상단 `N/1000` 카운터. `aria-invalid`/`aria-describedby` 를 내부 배선(`TextareaField.tsx:66-67`) | O | 상한 도달 시 **경고 없이 네이티브가 자른다**(카운터만). 스키마도 1000자 초과를 막는다(중복 방어). **계약의 법적 실체가 이 1000자 요약이 아니라 첨부 스캔본에 있다**(§7 #24) |
| FS-049-EL-034 | FS-049-SEC-11 | 계약서 첨부 갤러리 | 입력 | DS `ImageGalleryField label="계약서 첨부(스캔)"`(`ContractFormPage.tsx:450-457`), `maxFiles=5`(`CONTRACT_MAX_ATTACHMENTS`), hint '계약서·부속합의서 스캔본을 업로드하세요.'. 드래그드롭 + 클릭 선택. 타일 그리드 + 개별 제거(`N번째 이미지 제거`) + `N/5` 카운터 | O | **⚠ 알려진 빚 — 이 필드는 업로드하지 않는다.** 낼 수 있는 값이 `URL.createObjectURL(file)` = **`blob:…`** 뿐이고(`ImageGalleryField.tsx:153`) 언마운트 시 revoke 된다(`:126-132`). **그대로 저장하면 계약서 스캔본이 깨진다** — 그것을 아는 채로 통과시킨다(§7 #7). 검증도 없다 — `attachments: z.array(z.string())`(`validation.ts:30`) |
| FS-049-EL-034.1 | FS-049-SEC-11 | 첨부 파일 검증 규칙 | 텍스트 | `imageFileError(file, maxSizeMB)`(`ImageGalleryField.tsx:148`)가 **업로드 전** 타입(`image/*`)·크기(기본 5MB)를 본다. 위반 파일은 거절하고 나머지는 받는다(`:149-151`). 5장 초과분은 '이미지는 최대 5장까지 등록할 수 있습니다.' | — | 비표시 규칙. **계약서는 보통 PDF 인데 `accept="image/*"` 라 PDF 를 받지 않는다**(§7 #25) |
| FS-049-EL-035 | FS-049-SEC-12 | 비고 textarea | 입력 | `TextareaField label="메모"`, `maxLength=500`, 2행, `N/500` 카운터. placeholder '내부 메모' | O | **`error` prop 을 넘기지 않는다**(`ContractFormPage.tsx:462-470`) — 스키마도 `note: z.string()` 으로 무제약이라 오류가 날 수 없다. `maxLength` 만이 방어다 |
| FS-049-EL-036 | FS-049-SEC-13 | 계약서 요약 미리보기 | 표시 | `ContractSummaryPreview`(`aria-label="계약서 요약 미리보기"`). 계약명(미입력이면 '(계약명 미입력)') / 상태·서명·자동갱신 배지 / 거래처·계약유형·계약기간·계약금액(+'(부가세 포함)'/'(부가세 별도)'). **`watch()` 로 키 입력마다 갱신** | — | 순수 표시. 기간은 두 값이 모두 있어야 표시되고 아니면 '—'(`ContractSummaryPreview.tsx:86`). **여기서만 부가세 포함/별도가 보인다** — 목록에는 없다(§7 #14) |
| FS-049-EL-037 | FS-049-SEC-14 | '취소' 버튼 | 버튼 | 푸터 우측 그룹 왼쪽. `secondary`. 저장 중 비활성. `navigate('/sales/contracts')` | — | FS-049-EL-018 과 목적지 중복. **가드가 발화하지 않는다**(§7 #4) |
| FS-049-EL-038 | FS-049-SEC-14 | '등록'/'저장' 버튼 | 버튼 | 푸터 우측. `type="submit" variant="primary"`. 라벨 `saving ? '저장 중…' : isEdit ? '저장' : '등록'`. `disabled={saving \|\| loadingDetail}` | O | 진행 상태를 `loading` prop 이 아니라 **손으로 쓴 라벨**로(§7 #26) |
| FS-049-EL-039 | FS-049-SEC-15 | 상세 조회 실패 배너 | 배너 | **수정 진입 시에만.** `loadFailure` 로 갈린다(`ContractFormPage.tsx:215-237`): `'not-found'` → **'계약을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만** · `'error'` → '계약을 불러오지 못했습니다.' + '다시 시도' + '목록으로' | O | 폼 전체를 대체한다. 어댑터가 `HttpError(404)` 를 던져(`crud.ts:105-107`) 이 분기가 실제로 발현된다 |
| FS-049-EL-040 | FS-049-SEC-16 | 충돌 다이얼로그 | 모달 | `FormConflictDialog`(`FormFeedback.tsx:58-74`). 409/412 시 '다른 사용자가 먼저 변경했습니다' + '최신 내용 불러오기'(내 입력을 버리고 재조회) / '이어서 편집'(다이얼로그만 닫는다). **입력은 언마운트되지 않는다** | O | 비표시. 발현 경로: 다른 관리자가 먼저 지운 계약을 저장(`crud.ts:126-128`) 또는 `?status=save:409` |
| FS-049-EL-041 | FS-049-SEC-16 | 미저장 이탈 가드 | 모달 | `useUnsavedChangesDialog(isDirty && !saving, { message: … })`(`ContractFormPage.tsx:204`). 문구 '계약에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.' 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel) | — | 비표시. `isDirty` 는 RHF 판정. **`navigate()` 프로그램 이동은 3경로 밖**(§7 #4) |
| FS-049-EL-042 | FS-049-SEC-14 | 저장 성공 토스트 · 이동 | 토스트 | `useCrudForm` 이 `계약을 저장했습니다.` / `계약을 등록했습니다.`(조사 주입 — `useCrudForm.ts:222`) 후 `/sales/contracts` 로 `replace: true` 이동 | — | 비표시. 실패는 배너(EL-021)·다이얼로그(EL-040) |
| FS-049-EL-043 | FS-049-SEC-14 | 제출 잠금 · 멱등키 규칙 | 텍스트 | ① **동기 제출 락** `submitLockRef`(`useCrudForm.ts:103,201-202`) ② **제출 시도 단위 멱등키** `idempotencyKeyRef`(`:118-123`)를 mutationFn 밖에서 만들어 variables 로(`:228,235`) → `WriteContext.idempotencyKey`(`crud.ts:41`) → 멱등 원장(`:114,121`). 성공하면 키를 버린다(`:220`) | O | 비표시 규칙. **삭제(EL-013·014)에는 키가 없다** — 프레임워크의 명시적 판정(`crud.ts:32-41`) |
| FS-049-EL-044 | FS-049-SEC-14 | 언마운트 abort | 텍스트 | `useEffect(() => () => controllerRef.current?.abort(), [])`(`useCrudForm.ts:93`). abort 는 실패가 아니다 — `isAbort(cause)` 면 즉시 return(`:162`). 성공 콜백도 `signal.aborted` 면 아무것도 하지 않는다(`:218`) | — | 비표시 규칙 |
| FS-049-EL-045 | FS-049-SEC-08 | 서버 422 → 필드 인라인 규칙 | 텍스트 | 서버가 422 + `violations` 를 주면 `setError(field, …)` 로 그 입력에 인라인 오류를 꽂고 첫 위반 필드로 포커스(`useCrudForm.ts:182-192`) | O | 비표시 규칙. **백엔드가 없어 현재 발현되지 않는다** — `?status=save:422` 는 `violations` 가 빈 `HttpError`(`dev.ts:84`) |
| FS-049-EL-046 | FS-049-SEC-08 | 폼 값 ↔ 입력 변환 규칙 | 텍스트 | `toInput`(`ContractFormPage.tsx:132-150`): 문자열 `trim`, `amount` 는 `digitsToNumber`, **`renewNoticeDays` 는 `autoRenew` 가 false 면 0**(`:142`), `attachments` 얕은 복사. `toValues`(`:152-170`): `amount`·`renewNoticeDays` 를 `String()` 으로 | — | 비표시 규칙. **`startAt`·`endAt` 은 trim 하지 않는다**(date 입력) |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-049-EL-001 / EL-001.1 | 매치 0건이면 FS-049-EL-012 의 '검색 결과 없음' 분기 | 조회 중에도 입력 가능 — 대상 배열이 비어 결과 0건 | N/A — 서버를 호출하지 않는다(클라이언트 필터) | 자유 텍스트. 길이·문자 제약 없음. 앞뒤 공백 제거. 빈 문자열이면 조건 해제 | §4.1 공통 규칙 적용 | URL 이 원천이라 뒤로/새로고침이 값을 보존한다. 조합 중에는 커밋하지 않는다 | 전량이 메모리에 있어 커밋마다 전체를 훑는다 — 디바운스가 250ms 로 묶는다 |
| FS-049-EL-002 / EL-003 | 그 상태가 0건이면 '필터 결과 없음' 분기 | 조회 중 조작 가능(결과 0건) | N/A — 클라이언트 필터 | `parseFilter` 가 모르는 값을 '전체'로 되돌린다 | §4.1 공통 규칙 적용 | URL 이 원천 — 뒤로/새로고침/공유가 값을 보존한다 | 선택지 5+1개 고정. **`?status=` 이름이 개발 스위치와 충돌한다**(§7 #11) |
| FS-049-EL-004 | N/A — 항상 표시 | 조회 중에도 누를 수 있다 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | **쓰기 권한 없는 역할에게도 보인다**(§7 #3) | N/A — 이동만 한다 | N/A — 단일 버튼 |
| FS-049-EL-005 | N/A — 규칙 | N/A — 동기 | N/A — 서버 호출 없음 | 알 수 없는 파라미터는 FS-049-EL-003 이 정규화 | §4.1 공통 규칙 적용 | **이것이 경합 대비 자체** — 상세→뒤로가 조건을 잃지 않는다 | URL 파라미터 2개 — 길이 상한에 닿을 표면이 없다 |
| FS-049-EL-006 | 0행이면 '조건에 맞는 계약 결과가 없습니다.' | 최초 로드 중에는 **침묵** | '계약 목록을 불러오지 못했습니다.' | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회로 건수가 바뀌면 다시 announce | 건수만 읽는다 |
| FS-049-EL-007 | 0건이면 '전체 0건' | 최초 로드만 '불러오는 중…'. **재조회는 건수 유지 + '· 새로고침 중…'** | 조회 실패 시 FS-049-EL-005 배너가 이 줄을 대체 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 재조회 시점에 갱신 | `formatNumber` 로 천 단위 구분 |
| FS-049-EL-008 | 선택 0건이면 렌더되지 않는다 | 조회 중에도 선택 가능(스켈레톤 행에는 체크박스가 없다) | 실패 시 화면이 배너로 대체돼 사라진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 단건 삭제 진행 중이면 비활성 | **선택 범위는 '보이는 결과' 뿐**. cross-page 전체 선택이 없다 — 페이지네이션 자체가 없다 |
| FS-049-EL-009 | 0행이면 FS-049-EL-012 로 본문 대체 | FS-049-EL-011 스켈레톤 + `aria-busy` | 목록 조회 실패 배너로 요약·표 대체 | N/A — 표 자체 입력 없음 | §4.1 공통 규칙 적용 | 조회 시점 스냅샷. 다른 관리자의 변경은 재조회 시점에만 반영 | **상한 없음** — 계약은 해마다 쌓인다(§7 #2) |
| FS-049-EL-009.1 / .2 | 행 없으면 없음 | 스켈레톤 행에는 없다 | 실패 시 미표시 | N/A — 이진 선택 | §4.1 공통 규칙 적용 | **필터·검색이 바뀌면 선택이 해제된다**(FS-049-EL-015) | 전체 선택이 화면의 모든 행을 한 번에 담는다 |
| FS-049-EL-009.3 | 행 없으면 없음 | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회·필터로 순서가 바뀌면 순번도 다시 매겨진다 | 페이지네이션 도입 시 값 공식이 틀어진다(§7 #2) |
| FS-049-EL-009.4 | 계약명이 빈 문자열이면 빈 칸(스키마가 막으므로 도달 불가) | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | **truncate 없음** — 긴 계약명이 열을 넓힌다(§7 #12) |
| FS-049-EL-009.5 | 빈 문자열이면 빈 칸(스키마가 막는다) | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | **거래처가 이름 문자열이라** 거래처 화면에서 상호를 바꿔도 이 값은 그대로다 — 어긋난 채 남는다(§7 #8) | truncate 없음 |
| FS-049-EL-009.6 | 행 없으면 없음 | 스켈레톤 | 실패 시 미표시 | N/A — `z.enum` | §4.1 공통 규칙 적용 | 조회 시점 값 | 6종 고정 |
| FS-049-EL-009.7 | 두 값이 비면 ' ~ ' 만 보인다 — **스키마가 실재 날짜를 요구하므로 폼 경유로는 도달 불가**하나 서버 데이터가 비면 그대로 렌더된다 | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | `nowrap` + `tabular-nums` |
| FS-049-EL-009.8 | 금액 0 이면 '0원' — **스키마가 0 초과를 요구하므로 폼 경유로는 도달 불가** | 스켈레톤 | 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | **'원'이 숫자에 붙어 자릿수 정렬을 깬다**(§7 #13). **부가세 기준이 안 보인다**(§7 #14) |
| FS-049-EL-009.9 | 행 없으면 없음 | 스켈레톤 | 실패 시 미표시 | N/A — 파생값 | §4.1 공통 규칙 적용 | **기준일이 렌더마다 갱신**된다(FS-049-EL-010) — 화면을 열어 둔 채 날짜가 넘어가도 리렌더가 없으면 배지가 그대로다 | 행마다 순수 계산 1회. **만료=neutral 이라 '초안'과 구분되지 않는다**(§7 #15) |
| FS-049-EL-009.10 | 행 없으면 없음 | 스켈레톤 행에는 없다 | 삭제 실패는 FS-049-EL-013 의 다이얼로그 배너 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **쓰기 게이팅 없음** | 그 행 삭제 진행 중이면 비활성 | 행마다 2개 |
| FS-049-EL-009.11 | 행 없으면 규칙이 걸리지 않는다 | 스켈레톤 행에는 걸리지 않는다 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이미 삭제된 행을 클릭하면** 폼이 404 를 받아 FS-049-EL-039 로 떨어진다 | N/A — 행 단위 |
| FS-049-EL-010 / EL-010.1 | 행이 없어도 규칙은 성립 | 조회 중에도 `today` 는 이미 계산돼 있다 | N/A — 순수 계산 | 해석 불가 날짜면 `daysRemaining` 이 **0 을 반환**한다(`types.ts:107`) → 잔여 0일 = '갱신임박'으로 읽힌다. 유효하지 않은 날짜가 임박으로 보인다 | §4.1 공통 규칙 적용 | **렌더마다 재계산** — FS-026 의 마운트 고정과 반대다. 시계는 멈추지 않으나 리렌더가 없으면 갱신되지 않는다 | 행마다 순수 계산 1회 |
| FS-049-EL-011 | N/A — 도착 전 상태 | 이것이 로딩 표현. **최초 로드만**(`firstLoading`) | 조회 실패 시 배너로 바뀐다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **재조회에서는 발현되지 않는다** — 이전 행이 유지된다 | 행 수가 결과 수와 무관하게 5 고정(§7 #17) |
| FS-049-EL-012 | 이것이 빈 상태 표현 — 검색/필터/진짜 3분기 | 최초 로드 중에는 스켈레톤이 이긴다 | 조회 실패 시 배너로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 표시 전용 | N/A — 1행 |
| FS-049-EL-013 | N/A — 대상이 있어야 성립 | 확인 중 확인 버튼 비활성 + `aria-busy` + '처리 중…' | 이것이 실패 표현 — **다이얼로그를 열어둔 채** 배너. 재클릭이 재시도 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 같은 문구 | 이미 삭제된 항목이면 어댑터가 409('이미 삭제된 항목입니다.' — `crud.ts:140`)를 주는데 **같은 배너 문구로 뭉개진다** | 단건. **서명완료·진행중 계약도 경고 없이 지운다**(§7 #19) |
| FS-049-EL-014 | 선택 0건이면 아무것도 하지 않는다(`useCrudList.tsx:128`) | 확인 버튼 busy | **부분 실패**를 건수로 보고하고 다이얼로그 유지 — 어느 행이 실패했는지 말하지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | `settleAll` 이 전건을 시도한다. **전건 성공에만** 목록 무효화·선택 해제 | **상한·진행률·취소가 없다**. 선택 최대치 = 화면의 전체 행 |
| FS-049-EL-015 | N/A — 선택이 있어야 의미 | N/A — 동기 효과 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체** | 조건이 바뀔 때마다 전체 해제 |
| FS-049-EL-016 | 0행이면 정렬할 것이 없다 | 어댑터가 응답 직전에 적용 | N/A — 순수 함수 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 쓰기 직후에도 재정렬된다(`crud.ts:115,130`) — 시작일을 바꾸면 행이 **자리를 옮긴다** | 건수에 비례한 정렬 비용. **종료일·금액 정렬 불가**(§7 #20) |
| FS-049-EL-017 | 두 축의 결과가 0건이면 FS-049-EL-012 | 조회 중에는 대상이 빈 배열 | N/A — 클라이언트 연산 | N/A — select + 자유 텍스트 | §4.1 공통 규칙 적용 | `useMemo` 라 items 갱신 시 재계산 | 결과가 많아도 전량 렌더(§7 #2) |
| FS-049-EL-018 | N/A — 항상 표시 | 상세 로딩 중에도 표시 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 중에도 누를 수 있다 — 이탈 시 FS-049-EL-044 가 abort | N/A |
| FS-049-EL-019 / EL-020 | N/A — 정적 | N/A — 조회 안 함 | 상세 조회 실패 시 **FS-049-EL-039 가 폼 전체를 대체해 제목도 사라진다** | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 상태 없음 | 고정 문구 |
| FS-049-EL-021 | N/A — 오류 없으면 미렌더 | 재저장 시 `setServerError(null)` 로 먼저 지운다(`useCrudForm.ts:205`) | 이것이 저장 실패 표현. 문구 1종 + 오류 코드. abort·409·422 는 여기 오지 않는다 | 클라이언트 검증 위반은 여기 오지 않는다 — 각 필드의 인라인 오류로 | §4.1 공통 규칙 적용 — **403 도 같은 문구** | N/A — 표시 전용 | 1건만 표시 |
| FS-049-EL-022 | 초기값 `''` | 상세 로딩 중 비활성(`disabled = saving \|\| loadingDetail`) | 저장 실패는 FS-049-EL-021 — **입력 보존** | 공백만이면 '계약명을 입력하세요.', 80자 초과면 '계약명은 80자를 넘을 수 없습니다.' `maxLength` 가 네이티브로도 막는다 | §4.1 공통 규칙 적용 | 상세 도착 시 `reset()`(`useCrudForm.ts:131-134`) — **`loaded` 참조가 바뀔 때만** 돌아 편집 중 덮어쓰기가 없다 | 80자 상한 |
| FS-049-EL-023 | 초기값 `''` | 상세 로딩 중 비활성 | FS-049-EL-021 | `requiredText('거래처', 60)`. **`maxLength` 가 없다** — 스키마만 60자를 막아 61자를 치면 제출 시점에야 안다 | §4.1 공통 규칙 적용 | 위와 동일 | **거래처 선택기가 없어 오타가 곧 새 거래처다**(§7 #8) |
| FS-049-EL-024 / EL-031 / EL-032 | N/A — 항상 하나가 선택돼 있다 | 상세 로딩 중 비활성 | FS-049-EL-021 | `z.enum` — 위반 값이 존재할 수 없다. **상태 전이 규칙은 없다**(§7 #23) | §4.1 공통 규칙 적용 | 위와 동일. **다른 관리자가 먼저 상태를 바꿔도 감지하지 않는다** | 선택지 4~6개 고정 |
| FS-049-EL-025 | 초기값 `''` — 비워 둔 채 저장할 수 있다 | 상세 로딩 중 비활성 | FS-049-EL-021 | **제약 없음**(`z.string()`) — `maxLength` 도 없다 | §4.1 공통 규칙 적용 | 위와 동일 | **상한 없음** — 아주 긴 값도 저장된다 |
| FS-049-EL-026 | 초기값 `'0'`(EMPTY) — **그 값 그대로 제출하면 '0보다 커야 합니다'로 막힌다** | 상세 로딩 중 비활성 | FS-049-EL-021 | 2단계 순차: 숫자 아님 → 0 이하. **첫 단계에서 `return` 하므로 한 번에 한 문구.** `'1,000,000'` 은 거절된다(§7 #22). **상한이 없다** — `Number()` 안전 정수 범위를 넘는 자릿수도 통과 | §4.1 공통 규칙 적용 | 위와 동일 | 상한 없음 |
| FS-049-EL-027 / EL-029 | N/A — 항상 켜짐/꺼짐 중 하나(EMPTY 는 둘 다 `false`) | 상세 로딩 중 비활성 | FS-049-EL-021 | N/A — 이진 | §4.1 공통 규칙 적용 | 위와 동일 | N/A |
| FS-049-EL-028 | 초기값 `''`/`''` — **두 값이 비면 '계약 기간을 YYYY-MM-DD 형식으로 입력하세요.'** 로 막힌다(필수와 등가) | 상세 로딩 중 두 입력 모두 비활성 | FS-049-EL-021 | 실재 날짜 + `end >= start`. **⚠ 이번 기준(PR #28 · `5e86a3c`)에서 이 축의 동작이 바뀌었다** — 이전에는 이 화면의 사본 `isRealDate` 가 형식만 보고 실재 여부를 보지 않아 **`2026-02-31` 이 통과했다**(`Date` 가 3/3 으로 굴린 뒤 `!Number.isNaN` 이 참). 정본 `isCalendarDate`(`shared/format.ts:244-249` — `noonUtcOf` + 왕복 `dayOfUtc(noon) === value`)로 수렴해 **이제 거절한다**(`validation.ts:59` ×2). 회귀 테스트 `contracts.test.ts:133` `달력에 없는 날짜(2026-02-31)를 기간으로 주면 막는다`(주석 `:131` 이 사본의 결함을 기록). 두 오류가 **하나의 슬롯을 공유**해(`ContractFormPage.tsx:211` — `startAt ?? endAt`) 형식 오류가 있으면 역전 오류를 볼 수 없다. **`required` + `aria-required` 는 컴포넌트가 두 입력에 준다**(`DateRangeField.tsx:48`) | §4.1 공통 규칙 적용 | 위와 동일 | 두 값. **preset('오늘/최근 7일')이 없다** — quality-bar COMP-11 은 목록 기간 필터를 겨냥하나 이 입력에도 관례가 없다 |
| FS-049-EL-030 | **`autoRenew` 가 false 면 렌더되지 않는다.** 그때 저장 값은 `0` 으로 강제된다(`ContractFormPage.tsx:142`) | 상세 로딩 중 비활성 | FS-049-EL-021 | `autoRenew` 일 때만 `/^\d+$/`. **`'0'` 도 통과한다** — 자동갱신 사용인데 통지기한 0일이면 만료 당일에야 임박 배지가 뜬다. **상한도 없다** — `'9999'` 면 계약 시작부터 임박이다(§7 #27) | §4.1 공통 규칙 적용 | 위와 동일 | 단일 값. **오류가 `aria-invalid` 없이 테두리 색으로만 인코딩된다**(§7 #6) |
| FS-049-EL-033 | 초기값 `''` — 비워 둔 채 저장할 수 있다 | 상세 로딩 중 비활성 | FS-049-EL-021 — 본문 보존 | 1000자 상한(`maxLength` + 스키마 이중). **상한 도달 시 조용히 멈춘다**(카운터만) | §4.1 공통 규칙 적용 | 상세 도착 시 `reset` | 1000자. 카운터 `N/1000` |
| FS-049-EL-034 / EL-034.1 | **첨부 0장이면 드롭존 하나만 보인다.** 필수가 아니라 0장으로 저장할 수 있다 — '서명완료' 계약도 첨부 없이 저장된다(§7 #24) | 상세 로딩 중 드롭존·제거 버튼 비활성 | FS-049-EL-021. **파일 자체의 실패**(타입·크기·개수)는 컴포넌트 로컬 오류 `<p role="alert">`(`ImageGalleryField.tsx:300`)로 — 요청이 나가지 않는다 | 타입 `image/*` · 크기 5MB · 개수 5장. **스키마 검증은 없다**(`z.array(z.string())`) — 어떤 문자열 배열이든 통과 | §4.1 공통 규칙 적용 | 배열 전체가 매 저장마다 치환된다 — 다른 관리자가 추가한 첨부는 **덮여 사라진다**(BE-049 §7.2) | **최대 5장 × 5MB.** ⚠ **값이 `blob:` 이라 폼을 떠나면 죽는다 — 저장해도 깨진다**(§7 #7). **PDF 를 받지 않는다**(§7 #25) |
| FS-049-EL-035 | 초기값 `''` | 상세 로딩 중 비활성 | FS-049-EL-021 | **없다** — `note: z.string()` 무제약. `maxLength=500` 만이 방어. `error` prop 도 안 넘긴다 | §4.1 공통 규칙 적용 | 상세 도착 시 `reset` | 500자. 카운터 `N/500` |
| FS-049-EL-036 | 값이 비면 '—' / '(계약명 미입력)'. 기간은 두 값이 모두 있어야 표시 | 상세 로딩 중에도 렌더된다 — **빈 값으로**(EMPTY 기준) | N/A — 순수 표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | N/A — 파생 표시 | 키 입력마다 `watch()` 로 전 필드를 다시 읽는다 — 리렌더 비용이 폼 전체에 걸린다 |
| FS-049-EL-037 | N/A — 항상 표시 | 저장 중 비활성(`disabled={saving}` — **로딩 중에는 살아 있다**) | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A | N/A |
| FS-049-EL-038 | N/A — 항상 표시 | 저장 중 '저장 중…' + 비활성. 상세 로딩 중에도 비활성 | 실패 시 FS-049-EL-021 배너 · 이동 없음 · **입력 보존** | 검증 실패면 서버를 호출하지 않고 첫 오류 필드로 포커스(RHF `shouldFocusError` + `onInvalid` — `useCrudForm.ts:246-248`) | §4.1 공통 규칙 적용 — **쓰기 게이팅 없음**(§7 #3) | 409 면 FS-049-EL-040 다이얼로그 — 성공 토스트·이동 없음 | FS-049-EL-043 의 락·멱등키가 연타를 1건으로 묶는다 |
| FS-049-EL-039 | N/A — 수정 진입에서만 성립 | `loadingDetail` 중에는 뜨지 않는다 | 이것이 실패 표현. **404 와 5xx 를 문구·액션으로 가른다**(`isNotFound` — `useCrudForm.ts:144-149`). 어댑터가 `HttpError(404)` 를 준다(`crud.ts:105-107`) | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **404 은닉 응답도 '찾을 수 없습니다'로 보인다**(BE-049 §7.4) | **다른 관리자가 먼저 지운 계약을 열면 이 배너가 뜬다** | N/A — 표시 전용 |
| FS-049-EL-040 | N/A — 충돌이 있어야 성립 | 재조회('최신 내용 불러오기') 중 상세 쿼리가 돈다 | **이것이 409/412 표현.** 그 밖의 실패는 FS-049-EL-021 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 표현 자체.** 단, 409 는 **'존재 여부' 기반**이지 `version`/`ETag` 토큰이 아니다 — **둘 다 존재하는 동시 편집은 여전히 last-write-wins**(§7 #28 · BE-049 §7.1) | 1건 |
| FS-049-EL-041 | N/A — 변경이 있어야 성립 | 저장 중에는 가드가 비활성(`isDirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 성공 후 `navigate(replace)` 로 떠나므로 가드가 걸릴 자리가 없다 | N/A |
| FS-049-EL-042 | N/A — 성공이 있어야 성립 | N/A — 결과 통지 | N/A — 실패는 배너·다이얼로그가 담당 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **유령 저장이 없다** — 어댑터가 없는 id 에 409(`crud.ts:126-128`) | 1건 |
| FS-049-EL-043 | N/A — 제출이 있어야 성립 | 이것이 중복 제출 방어 | 실패해도 키를 **버리지 않는다**(`:220` 은 성공 경로에만) — 재시도가 같은 키를 재사용 | `onInvalid` 가 락을 푼다(`:246-248`) | §4.1 공통 규칙 적용 | 픽스처 원장은 **적용에 성공한 뒤에만** 키를 기록한다(`crud.ts:56-60`) | 단건 |
| FS-049-EL-044 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | **abort 는 실패가 아니다** | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 이탈 시 진행 중 저장이 취소된다 — **서버 도달 여부는 보장하지 않는다**(§7 #29) | 단건 |
| FS-049-EL-045 | N/A — 422 가 있어야 성립 | N/A — 응답 처리 | 이것이 필드 거절 표현 | **이것이 서버 유효성 표현.** 첫 위반 필드로 포커스 | §4.1 공통 규칙 적용 | N/A | `violations` 전건을 꽂는다 |
| FS-049-EL-046 | 빈 문자열은 trim 후에도 빈 문자열 | N/A — 순수 변환 | N/A — 동기 | `digitsToNumber('')` = 0 — **금액 빈 값이 0 이 되나 스키마가 먼저 막는다**. `autoRenew` false → `renewNoticeDays` 0 강제 | §4.1 공통 규칙 적용 | N/A | `attachments` 배열 전체를 매 저장마다 전송 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 목록 조회 실패는 인라인 배너(`CrudListShell.tsx:157-164`), 상세 조회 실패는 폼 대체 배너(FS-049-EL-039), 저장 실패는 폼 상단 배너(FS-049-EL-021). **오프라인 감지·복귀 재조회는 앱 전역에 없다**(`navigator.onLine` 0건 — quality-bar EXC-11) |
| 세션 만료 | 조회·쓰기 어디서든 401 이 오면 **앱 전역 401 인터셉터**(`shared/query/queryClient.ts:38,42-43`)가 세션을 폐기하고 `/login?returnUrl=<현재경로>&reason=session_expired` 로 보낸다. **미저장 입력은 그때 사라진다** — 프로그램적 이동이라 FS-049-EL-041 가드가 발화하지 않는다(quality-bar EXC-19) |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건 — quality-bar EXC-05). abort 는 언마운트·다이얼로그 취소에서만 |
| 중복 제출 | 폼 저장은 **동기 락 + 멱등키**로 막는다(FS-049-EL-043). **삭제 확인은 `disabled`/`busy` 뿐**이라 렌더 전 연타의 창이 남는다 — 다만 값이 멱등이라(같은 id 삭제) 최종 상태가 같다 |
| 실패 통지의 자리 | ① 목록·상세 조회 실패 = 인라인 배너 ② 폼 저장 실패 = 폼 상단 배너 + 오류 코드 ③ 폼 저장 성공 = 토스트 ④ 다이얼로그 안의 실패 = **그 다이얼로그의 배너** ⑤ 첨부 파일 거절 = 그 필드의 로컬 `<p role="alert">`(요청 미발사) ⑥ abort = 아무것도 띄우지 않는다. **이 화면에 인라인 토글이 없어 목록 write 토스트 경로가 없다**(거래처 FS-048 과 다르다) |
| 낙관적 업데이트 | **이 화면에 없다.** 폼 저장·삭제가 전부 비관적(응답 후 무효화)이다 — 롤백 경로가 필요 없다(quality-bar EXC-14 의 위반 표면 없음) |
| 동시 조회 | 목록/상세 조회는 각각 동시에 1건만 유지된다(react-query). `staleTime` 30초 · **자동 재시도 없음** · **창 포커스 재조회 없음** — `queryClient.ts:47,59,67` |
| 권한 없음 | **프론트 역할 분기 없음.** 라우트 read 권한은 AppShell 의 `RequirePermission`(`AppShell.tsx:490-492`)이 가드하고, 리소스 파생이 `findCoveringLeaf` 라 `/sales/contracts/new`·`/:id/edit` 까지 `/sales/contracts` 잎으로 덮인다(`route-resource.ts:33-36`). **그러나 쓰기 게이팅(`useRouteWritePermissions`)이 배선돼 있지 않다** — 소비처 9곳에 `pages/sales/**` 가 없다(§7 #3). 서버 403 은 배너로 뭉개진다. 은닉 정책은 BE-049 §7.4 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary` 를 둔다(`AppShell.tsx:484-493`) |
| 이미지·첨부 | **알려진 빚**: `ImageGalleryField` 가 업로드하지 않아 값이 `blob:…` 뿐이고 언마운트 시 revoke 된다. 스키마가 http(s) 를 **강제하지 않는 것이 의도**다 — 강제하면 제출이 불가능해진다(`shared/crud/validation.ts:39-63` 이 그 판정을 길게 적어 두었다). `TODO(backend): POST /api/uploads` 가 붙으면 뒤집힌다(§7 #7) |
| 목록 정렬·페이징 | 정렬은 고정(FS-049-EL-016), 페이징은 **없다**(§7 #2). `useListState` 의 `page`·`clampPage`·`setSort` 가 소비되지 않는다 |
| 상태 전이 | **규칙이 없다.** 계약 상태·서명 상태 모두 어느 값에서 어느 값으로도 갈 수 있다 — FS-026 의 `STATUS_FLOW`/`canSetStatus` 같은 순수 규칙이 이 도메인에 없다(§7 #23). 서버가 정본을 세워야 한다(BE-049 §7.3) |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| FS-049-EL-006 / EL-007 / EL-009 / EL-011 / EL-012 / EL-016 | 계약 목록 조회 | R | 계약 전량(첨부·조항 포함) | `contractAdapter.fetchAll(signal)` | 필터·검색·정렬이 **전부 클라이언트**다 |
| FS-049-EL-022~EL-036 / EL-039 | 계약 상세 조회 | R | 계약 1건 | `contractAdapter.fetchOne(id, signal)` | 없으면 **`HttpError(404)`**(`crud.ts:105-107`) — FS-049-EL-039 의 404 분기가 여기서 온다 |
| FS-049-EL-038 / EL-042 / EL-043 (등록) | 계약 등록 | W | `ContractInput` 전체 + `Idempotency-Key` | `contractAdapter.create(input, { signal, idempotencyKey })` | id 는 서버가 채번해야 한다 — 픽스처는 `ct-<seq>`(`data-source.ts:72-75`) |
| FS-049-EL-038 / EL-042 / EL-043 (수정) | 계약 수정 | W | id + `ContractInput` 전체 + `Idempotency-Key` | `contractAdapter.update(id, input, { signal, idempotencyKey })` | 부분 갱신이 아니라 **전체 치환**. 없는 id 면 `HttpError(409)`(`crud.ts:126-128`) |
| FS-049-EL-013 | 계약 단건 삭제 | W | id | `contractAdapter.remove(id, { signal })` — **멱등키 없음** | 없는 id 면 `HttpError(409)`(`crud.ts:139-141`) |
| FS-049-EL-014 | 계약 일괄 삭제 | W | id 배열 | `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`) | **전용 일괄 엔드포인트가 아니다** — N 건의 개별 삭제를 병렬로 |
| FS-049-EL-034 | 계약서 첨부 업로드 | W | 파일 → URL | **없음 — `ImageGalleryField` 가 업로드하지 않는다** | 값이 `URL.createObjectURL(file)` = `blob:…`(`ImageGalleryField.tsx:153`). **심은 `ImageGalleryField.tsx:8` 의 `TODO(backend): POST /api/uploads`** 이며 **DS 컴포넌트 소유**다 — 이 화면의 `data-source.ts` 에는 없다(BE-049 §4 EP-06) |

> **현재 구현 상태 (백엔드 명세 참고)**: 백엔드는 없다. `contractAdapter` 는 `createCrudAdapter`(`shared/crud/crud.ts:86-147`)로 조립돼 브라우저 안 클로저 배열에 400ms 지연(`LATENCY_MS`)과 개발용 실패 스위치(`failIfRequested('sales-contracts', op)`)를 얹어 CRUD 를 흉내 낸다 — 실제 네트워크 0건. 새로고침하면 시드 3건으로 되돌아간다. `fetchOne` 은 없는 id 에 `HttpError(404)`, `update`/`remove` 는 없는 id 에 `HttpError(409)` 를 던지고, `create`/`update` 는 멱등 원장으로 재생을 흉내 낸다. **연동 지점은 `data-source.ts:68` 의 `// TODO(backend): GET/POST /api/sales/contracts · GET/PUT/DELETE /api/sales/contracts/:id` 한 줄이며, 이것이 이 화면 data-source 의 유일한 심이다.** 일괄 삭제에는 **심이 없고**, 첨부 업로드의 심은 **DS 컴포넌트가 소유**한다(BE-049 §4). 위 표는 백엔드 연결 후 의도된 동작이다.

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `ContractListPage.tsx` · `ContractFormPage.tsx` · `data-source.ts` · `types.ts` · `validation.ts` · `contracts.test.ts` · `components/ContractSummaryPreview.tsx`, 그리고 소비하는 공용 코드(`shared/crud/**` · `packages/ui/.../{FormField,DateRangeField,ImageGalleryField,TextareaField}.tsx`)
- [x] 읽기 전용 상세 라우트가 **실제로 없음을 코드로 재확인**하고(`App.tsx:244-246` 에 `/:id` 없음 · `CrudTable.tsx:172` 의 행 클릭이 `onEdit` 으로 감) §1 에 범위 밖으로 선언했다
- [x] 보이지 않는 요소(URL 직렬화·라이브 리전·스켈레톤·빈 상태 3분기·실패 배너·선택 해제·정렬·결합·갱신임박 기준일·잔여일수 계산·첨부 검증·제출 락/멱등키·abort·422 매핑·값 변환)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. **첨부 업로드의 심이 DS 컴포넌트 소유임을 구분**해 적었다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-049 영역) — `HttpError(404)`/`HttpError(409)` 는 **어댑터가 던지는 프론트 값**이라 현재 동작으로 적었다
- [x] `createCrudAdapter` 소비를 **직접 확인**했다(`data-source.ts:69`) — 409 가 '존재 여부' 기반이지 version/ETag 토큰이 아님을 §4·§7 에 명시했다
- [x] `useListState`·`useDebouncedSearch` 소비를 직접 확인했다(`ContractListPage.tsx:80,144`) — IA-13·COMP-10 판정 근거
- [x] `useRouteWritePermissions` **미소비**를 grep 으로 확인하고(소비처 9곳에 `pages/sales/**` 없음) §4.1·§7 에 정직히 적었다
- [x] required FormField 자식 타입을 전수 확인했다 — 6개 전부 `input`/`SelectField` 라 `aria-required` 주입. **`DateRangeField` 는 자기가 두 입력에 `required`+`aria-required` 를 준다**(`DateRangeField.tsx:48`) — 예약 화면(FS-037)이 래퍼 `div` 로 gap 이 된 그 패턴이 **이 화면에는 없다**
- [x] `blob:` 첨부를 **'결함'이 아니라 '알려진 빚 + 그 근거'** 로 적었다(`shared/crud/validation.ts:39-63` 이 그 판정의 정본)

## 7. 미결 사항 (UI 기획 / 아키텍처 / 백엔드 명세 / 프론트 구현 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (영업 관리 SCR 미작성) | UI 기획 / 아키텍처 |
| 2 | **페이지네이션이 없다** — `CrudTable` 이 `visibleItems` 전량을 렌더한다(`CrudTable.tsx:171`). 계약은 해마다 쌓인다. `useListState` 의 `page`·`clampPage` 가 소비되지 않고, `SeqCell seq={index + 1}` 도 페이징 도입 시 2페이지에서 1로 리셋된다(quality-bar IA-04 P0 · ERP-15 P1 · COMP-07 P2) | UI 기획 · 백엔드 명세 (BE-049 §7.6) |
| 3 | **쓰기 권한 게이팅이 배선돼 있지 않다** — `useRouteWritePermissions` 소비처 9곳에 `pages/sales/**` 가 없다. read 전용 역할도 '계약 등록'·행 수정/삭제를 보고 누른다. read 게이팅은 정상(quality-bar EXC-03 P0) | UI 기획 쪽 변경 요청 |
| 4 | 이탈 가드(EL-041)가 **`navigate()` 프로그램 이동을 가로채지 못한다** — '목록으로'(EL-018)·'취소'(EL-037)를 누르면 미저장 입력이 조용히 사라진다 | UI 기획 쪽 변경 요청 |
| 5 | 폼이 **자체 `<h1>`(EL-019)을 그리고 AppHeader 도 `<h1>` 을 그린다** — `<h1>` 2개. `findCoveringLeaf` 수렴으로 **가지 라벨 폴백은 해소**됐으나(`/sales/contracts/new` → '계약') '등록/수정' 행위가 AppHeader 제목에 반영되지 않는 것은 의도된 설계다(`nav-config.ts:294-296`). 목록에는 in-content h1 이 없어 title 소스 모델이 모순이다(quality-bar IA-02 P0) | 프론트 구현 · UI 기획 |
| 6 | **A11Y-11 잔여 2건**: ① **`renewNoticeDays`(EL-030)의 오류가 `aria-invalid` 없이 테두리 색으로만 인코딩된다** — `controlStyle(errors.renewNoticeDays !== undefined)`(`ContractFormPage.tsx:407`)로 붉어지지만 입력에 `aria-invalid`·`aria-describedby` 가 없다. `FormField` 가 `<p id="contract-renew-notice-error" role="alert">` 를 렌더하나 **연결되지 않는다** ② **`FormField` 의 `hint`(EL-030 '만료 N일 전 통지')가 유효할 때 `hintIdOf` 로 연결되지 않는다** — 힌트가 AT 에 닿지 않는다(quality-bar A11Y-11 P0 · A11Y-16 P1) | UI 기획 쪽 변경 요청 |
| 7 | **알려진 빚 — 계약서 첨부(EL-034)가 저장되지 않는다.** `ImageGalleryField` 가 업로드하지 않아 값이 `blob:…` 뿐이고(`ImageGalleryField.tsx:153`) 언마운트 시 revoke 된다(`:126-132`). **그대로 저장하면 계약서 스캔본이 깨진다 — 그것을 아는 채로 통과시킨다.** 스키마가 http(s) 를 강제하지 **않는 것이 의도**다(강제하면 제출 불가 — `shared/crud/validation.ts:39-63`). `TODO(backend): POST /api/uploads`(`ImageGalleryField.tsx:8`)가 붙으면 뒤집힌다. **계약서는 이 화면에서 가장 법적 무게가 큰 데이터라 다른 화면의 같은 빚보다 위험하다** | 백엔드 명세 (선행) · UI 기획 |
| 8 | **거래처가 FK 가 아니라 이름 문자열이다** — `types.ts:16-17` 의 주석이 자백한다(`/** 거래처명 — FE 전용이라 이름 문자열로 보관(연동 시 거래처 FK) */`). 결과: ① 거래처 화면(FS-048)에서 상호를 바꿔도 계약은 옛 이름 ② 거래처를 지워도 계약이 고아로 남고 서버가 그것을 알 수 없다 ③ 오타가 곧 새 거래처 ④ 목록의 거래처 셀이 링크가 아니라 거래처로 갈 수 없다. **BE-048 §7.7 · BE-050 §7.6 과 공동 판정** | **백엔드 명세 (BE-049 §7.5)** · 아키텍처 |
| 9 | **전자서명 상태(EL-032)가 사람이 고르는 select 다** — 서명 발송·수집·검증 워크플로가 없다. '서명완료'로 바꾸는 것과 실제 서명 사이에 아무 연결이 없고, 첨부가 0장이어도 막지 않는다 | 아키텍처 (도메인 경계) · 백엔드 명세 |
| 10 | **자동갱신이 실행되지 않는다** — `autoRenew`·`renewNoticeDays` 는 데이터이고 이를 실행하는 배치·통지 발송이 없다. 화면은 `isRenewalDue` 로 **배지만** 띄운다. 배지를 못 보고 지나가면 계약이 조용히 자동갱신된 것으로 간주되는데 실제로는 아무 일도 일어나지 않는다 | 아키텍처 · 백엔드 명세 |
| 11 | **목록 필터의 URL 파라미터 이름이 `?status=` 라 개발용 실패 스위치(`?status=<op>:<code>` — `dev.ts:24`)와 충돌한다.** `?status=active` 는 `requestedStatus` 가 `split(':')` 후 `code === undefined` 라 `continue` 하므로(`dev.ts:63`) **현재는 무해**하다. 그러나 `?status=save:409` 로 충돌을 재현하면 `parseFilter` 가 그것을 '전체'로 되돌려(`ContractListPage.tsx:82-86`) **필터가 조용히 초기화된다** — 두 기능이 같은 이름을 다툰다 | UI 기획 쪽 변경 요청 |
| 12 | 계약명·거래처 셀에 truncate 가 없어 긴 값이 표 열을 넓힌다(quality-bar COMP-09 P2) | UI 기획 쪽 변경 요청 |
| 13 | 금액 셀(EL-009.8)이 `formatWon` 으로 '원'을 숫자에 붙여 **우측 정렬 tabular grid 에서 단위가 마지막 자릿수를 따라다닌다**(quality-bar ERP-07 P2) | UI 기획 쪽 변경 요청 |
| 14 | **부가세 포함/별도가 목록에 없다** — 같은 금액 열의 두 값이 다른 기준일 수 있고 실제 청구액이 10% 다르다. 미리보기에만 보인다(`ContractSummaryPreview.tsx:111`) | UI 기획 쪽 변경 요청 |
| 15 | **'만료'와 '초안'이 같은 톤(neutral)** 이다(`types.ts:85,88`) — 끝난 계약과 시작 전 계약이 배지로 구분되지 않는다 | UI 기획 · 아키텍처 |
| 16 | `daysRemaining`(EL-010.1)이 **앵커를 혼용한다** — `today` 는 서울 고정(`formatDate` → `partsOfDate`)인데 두 끝을 `new Date('...T00:00:00')` 으로 **브라우저 로컬** 파싱한다. 두 끝이 같은 로컬 존이고 `Math.round` 가 있어 **관측되는 어긋남은 없으나**, `format.ts` 헤더가 정한 '달력일은 문자열로 다룬다 — 중간에 로컬 Date 로 왕복하면 하루가 밀린다' 규칙에서 이탈해 있다(quality-bar ERP-09 P2) | UI 기획 쪽 변경 요청 |
| 17 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })` 다(`CrudTable.tsx:144`)(quality-bar COMP-06 P2) | UI 기획 (#2 와 함께) |
| 18 | 빈 상태(EL-012)에 **생성 CTA 를 넘기지 않는다** — `empty.createAction` 이 비어 진짜 빈 상태에서도 등록 버튼이 툴바에만 있다(quality-bar STATE-05 P1) | UI 기획 쪽 변경 요청 |
| 19 | 삭제(EL-013)가 **서명완료·진행중 계약도 아무 경고 없이 지운다** — 계약은 법적 증거이고 감사 대상이다. 상태 기반 삭제 제약(예: 진행중은 '해지' 후에만 삭제)이나 soft-delete 가 없다 | 아키텍처 · 백엔드 명세 (BE-049 §7.5) |
| 20 | **정렬이 시작일 내림차순 고정**이다(EL-016) — 종료일·금액·상태로 정렬할 수 없어 **만료 임박 순으로 훑을 수 없다.** 갱신임박 배지가 있으나 그것으로 거르거나 정렬할 수단이 없다(quality-bar ERP-04 P1) | UI 기획 쪽 변경 요청 |
| 21 | 담당자(EL-025)가 **선택지가 아니라 자유 텍스트**다 — 오타가 곧 새 담당자가 되고 운영자 계정과 연결되지 않는다(FS-026 §7 #15 와 같은 결) | 아키텍처 · 백엔드 명세 |
| 22 | 금액(EL-026)에 **천단위 구분·'원' 마스킹이 없고** `'1,000,000'` 붙여넣기를 거절한다. **상한도 없다**(quality-bar ERP-14 P1) | UI 기획 쪽 변경 요청 |
| 23 | **계약 상태·서명 상태에 전이 규칙이 없다**(EL-031·EL-032) — '해지'에서 '초안'으로 되돌릴 수 있고 '서명완료'에서 '미발송'으로 갈 수 있다. FS-026 의 `STATUS_FLOW`/`canSetStatus` 같은 순수 규칙이 이 도메인에 없다 | 아키텍처 · 백엔드 명세 (BE-049 §7.3) |
| 24 | **계약의 법적 실체가 1000자 조항 요약(EL-033)이 아니라 첨부 스캔본(EL-034)에 있는데 첨부가 필수가 아니고 저장되지도 않는다**(#7) — '서명완료' 계약을 첨부 0장으로 저장할 수 있다 | 아키텍처 · 백엔드 명세 |
| 25 | 첨부(EL-034)가 **`accept="image/*"` 라 PDF 를 받지 않는다** — 계약서 스캔본은 보통 PDF 다. `ImageGalleryField` 는 이름 그대로 이미지 갤러리이며 문서 첨부용 컴포넌트가 아니다(quality-bar EXC-15 P1) | UI 기획 · 프론트 리팩터 (DS) |
| 26 | 저장 버튼(EL-038)이 `loading` prop 대신 손으로 쓴 `'저장 중…'` 라벨을 쓴다(quality-bar COMP-01 P1) | UI 기획 쪽 변경 요청 |
| 27 | 통지기한(EL-030)에 **하한·상한이 없다** — `'0'` 이면 만료 당일에야 배지가 뜨고 `'9999'` 면 계약 시작부터 임박이다 | UI 기획 · 백엔드 명세 |
| 28 | **낙관적 동시성 토큰이 없다** — `Contract` 에 `version`/`updatedAt` 필드가 없고 어댑터가 `If-Match` 를 보내지 않는다. 현재 409 는 **'대상이 사라졌는가'** 만 본다 → **둘 다 존재하는 동시 편집은 last-write-wins 로 조용히 덮인다.** 계약금액이 조용히 되돌려질 수 있다(BE-049 §7.1) | 백엔드 명세 (BE-049 §7.1) · UI 기획 |
| 29 | 이탈 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다 | 백엔드 명세 (BE-049) |
| 30 | 프론트 타임아웃 상한 없음 · 오프라인 감지 없음 · 세션 만료 리다이렉트가 미저장 입력을 버린다 — 전부 **앱 전역**(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | UI 기획 · 프론트 구현 |
| 31 | 일괄 삭제(EL-014)에 **진행률·취소·실패 행 식별이 없다**. Shift-click 범위 선택도 없다(quality-bar EXC-10 P1 · EXC-18 P1) | UI 기획 |
| 32 | 목록에 **엑셀 내보내기가 없다** — 계약 목록은 법무·회계 검토의 대표 대상이다(quality-bar ERP-12 P1) | UI 기획 |
</content>
