---
id: FS-066
title: "SMS 템플릿 (트랜잭션 알림 문구)"
screen: SCR-066               # ⚠ 알림 관리 SCR 미작성 — §7 미결 사항 참조
route: /notifications/sms-templates
owner: A62
reviewer: A64
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-066. SMS 템플릿 (트랜잭션 알림 문구)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 주문·배송·계정·보안 **이벤트가 발생하면 시스템이 자동 발송할 SMS 문구**를 이벤트별로 등록·수정·삭제한다. **바이트가 곧 비용**이라 90byte(SMS)/2,000byte(LMS) 경계를 실시간으로 알린다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — §4.1) |
| 진입 경로 | 좌측 GNB > 알림 관리 > SMS 템플릿 (`/notifications/sms-templates`) — `nav-config.ts:218` |
| 포함 화면 | 목록 `/notifications/sms-templates` · 등록 `/new` · 수정 `/:id/edit` (`App.tsx:298-300`) |
| **⚠ 이 화면은 발송하지 않는다** | 문구만 관리한다. **실제 발송은 이벤트를 받은 서버가 발송 규칙(FS-064)에 따라 이 템플릿을 렌더해 보낸다** — 프론트에 발송 경로가 **0건**이다(`data-source.ts:4-5,18-20`). 폼 설명이 그것을 말한다: '이벤트가 발생하면 시스템이 이 문구로 SMS 를 자동 발송합니다. 이 화면에서 발송하지는 않습니다.'(`SmsTemplateFormPage.tsx:129`) |
| **범위 밖** | **발신번호 사전등록·세그먼트·예약 시각·발송 통계·알림톡 승인·(광고) 표기·야간 제한·수신거부** — 마케팅 관리 소관(아래). **발송 규칙(트리거↔템플릿 연결·ON/OFF·재시도)** — FS-064 소관. **MMS** — 트랜잭션 알림엔 이미지가 없다(`notification.ts:321`) |
| 구현 경로 | `apps/admin/src/pages/notifications/sms-templates/**` · 공용 도메인 `apps/admin/src/pages/notifications/_shared/**` |
| 대응 SCR | SCR-066 (미작성 — §7 #1) |
| 공통 컴포넌트 | `shared/crud/{useCrudList,useCrudForm,useListState,CrudListShell,CrudTable,FormPageShell,createStoreAdapter,requiredText}` · `shared/ui/{FilterPanel,SearchField,Button,FormField,TextareaField,StatusBadge,Alert,ConfirmDialog,PlusCircleIcon,hintStyle,useToast,useUnsavedChangesDialog}` · `shared/format/{formatDateTime,formatNumber,objectParticle}` · 섹션 공용 `_shared/{TransactionalNotice,TemplateIdentityFields,VariableInsertBar,triggerColumn,useInitialFocus,styles,notification,store}` |

> **트랜잭션(정보성) 알림 — 마케팅 '발송 템플릿 관리'(FS-036)·'SMS 발송'(FS-034)과 개념이 겹치지 않는다.**
> 두 화면 헤더 주석이 경계를 선언한다:
> - 목록(`SmsTemplateListPage.tsx:3-6`): '저긴 채널(SMS/이메일/알림톡)로 나뉜 **캠페인 문구 창고**이고 알림톡 승인상태가 핵심 축이다. 여긴 **이벤트 트리거에 묶인 거래 문구**다 — 첫 열이 이벤트이고 좌측 필터가 주문/배송/계정/보안이다. **승인상태 열이 없다**(정보성 알림은 사전 심사 대상이 아니다). 바이트/유형(SMS·LMS) 열을 두어 **건당 비용이 바뀌는 90byte 경계를 목록에서 바로 본다.**'
> - 폼(`SmsTemplateFormPage.tsx:6-7`): '**저기엔 발신번호·세그먼트·예약시각·(광고) 표기 검사가 있다. 여긴 없다** — 수신자도 시점도 이벤트가 정한다. 대신 **이벤트 선택**과 그 이벤트가 주는 변수만 쓰게 하는 장치가 있다.'
>
> **엔티티가 다르다 (코드 대조)**:
>
> | | 마케팅 `MessageTemplate`(`marketing/_shared/messaging.ts:137-147`) | 알림 `SmsTemplate`(`_shared/notification.ts:382-388`) |
> |---|---|---|
> | 키 축 | `channel`: `sms` \| `email` \| `alimtalk` | **`trigger`: TriggerId(10종)** |
> | 심사 | `approvalStatus` · `rejectReason` | **없음** |
> | 필드 | id · name · channel · title · body · approvalStatus · rejectReason · updatedAt | id · name · **trigger** · body · updatedAt (**제목 없음** — `notification.ts:381`) |
>
> `notification.ts:351-355` 가 정본으로 못박는다 — '마케팅 MessageTemplate 과 **결정적으로 다른 점: trigger 를 갖는다.** … 알림 템플릿은 특정 이벤트의 문구라 **그 트리거가 주는 변수만 쓸 수 있다.** 승인상태(알림톡 심사)·반려사유가 없다.'
>
> **법적 근거 — 검증 규칙이 서로 거울상이다**: `notification.ts:23-32` · `validation.ts:3-6`. 정보통신망법 제50조는 **광고성 정보에만** 적용되므로 이 화면엔 **(광고) 표기·무료수신거부 문구·야간(21~08시) 예약 차단이 없다.** 반대로 **마케팅에 없는 검사 두 개가 여기 있다**: ① 광고성 문구 혼입 차단 ② 트리거가 주지 않는 변수 차단. `validation.ts:3-6` 이 그 목록을 축별로 적는다 — '**마케팅에 있고 여기 없는 것** — (광고) 표기·무료수신거부 문구·야간(21~08시) 예약 차단. 정보성 알림엔 그 의무가 없다(정보통신망법 제50조는 광고성 정보에만 적용). **여기 있고 마케팅에 없는 것** — 광고성 문구 혼입 차단, 트리거가 주지 않는 변수 차단.'
>
> **두 섹션은 서로를 import 하지 않는다** — 라우트 링크로만 가리킨다(`VariableInsertBar.tsx:6` · `notification.ts:19-21`). grep 확인: 양방향 import 0건. 유일한 연결은 FS-066-EL-001.1 의 `<Link to="/marketing/templates">` 다.

> **⚠ 이 화면의 고유 축 — 바이트**: `notification.ts:33` 이 규약을 못박는다 — '**SMS 90byte(한글 45자), LMS 2,000byte. 한글=2byte·ASCII=1byte (EUC-KR 기준).**' 그리고 `notification.ts:361-367` 이 글자수 cap 을 2,000 으로 둔 이유를 설명한다 — '**진짜 제약은 바이트(LMS 2,000byte)이지 글자수가 아니다.** 한글은 2byte 라 1,000자면 이미 한도지만 ASCII 는 1byte 라 2,000자까지 들어간다. 그래서 글자수 cap 은 이론상 최대치(전부 ASCII)인 2,000 으로 두고, **실제 판정은 `byteLengthOf` 로 한다** — 여기를 1,000 으로 잡으면 2,000자짜리 영문 본문(2,000byte 로 적법)이 이유 없이 막힌다.' **FS-065(이메일)와 결정적으로 다른 점이며, quality-bar COMP-12 의 'counting 기준(code point vs byte)을 정의하고 서버 강제와 일치시킨다'에 정면으로 답하는 유일한 화면이다.**

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-066-SEC-01 | 트랜잭션 안내 배너 | info `Alert` + 마케팅 관리 링크 |
| FS-066-SEC-02 | 좌측 이벤트 분류 필터 | '전체' + 주문·배송·계정·보안 + 건수 배지 |
| FS-066-SEC-03 | 목록 툴바 | 검색(좌) · 'SMS 템플릿 등록' primary(우) |
| FS-066-SEC-04 | 목록 상태 요약 | 지속 live region + 건수/새로고침/선택 요약 |
| FS-066-SEC-05 | 선택 일괄 삭제 바(비표시 기본) | — |
| FS-066-SEC-06 | 템플릿 표 | 선택·순번·이벤트·템플릿명·본문·**유형(SMS/LMS)**·**바이트**·수정일시·행 액션. **페이지네이션 없음** |
| FS-066-SEC-07 | 목록 로딩·빈 상태·조회 실패(비표시 기본) | 스켈레톤 / `Empty` 3분기 / danger `Alert` |
| FS-066-SEC-08 | 삭제 확인 다이얼로그(비표시 기본) | 단건 · 일괄 |
| FS-066-SEC-09 | 폼 헤더 | '목록으로' + `<h1>` + 설명 |
| FS-066-SEC-10 | 폼 카드 '템플릿 내용' | 템플릿명·이벤트·본문 + 취소/저장 |
| FS-066-SEC-11 | **바이트 카운터 행** | 유형 배지 + `N / M byte` + 승격·초과 안내 |
| FS-066-SEC-12 | 변수 삽입 바 · 광고성 경고(비표시 기본) · 미리보기(비표시 기본) | — |
| FS-066-SEC-13 | 폼 로딩·조회 실패·충돌·이탈 가드(비표시 기본) | 스켈레톤 / 404·5xx 분기 / 409 / discard |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-066-EL-001 | FS-066-SEC-01 | 트랜잭션 안내 배너 | 배너 | info `Alert`(`TransactionalNotice.tsx:23`). 화면별 한 줄 '주문·배송·계정·보안 SMS 문구를 관리합니다.'(`SmsTemplateListPage.tsx:125`) + 공통 문구(`TransactionalNotice.tsx:26-28`) | — | 항상 표시. 닫기 없음 |
| FS-066-EL-001.1 | FS-066-SEC-01 | '마케팅 관리로 이동' 링크 | 버튼 | `<Link to="/marketing/templates">`(`TransactionalNotice.tsx:30-32`) | — | **두 섹션을 잇는 유일한 지점**(§1) |
| FS-066-EL-002 | FS-066-SEC-02 | 이벤트 분류 필터 | 입력 | 공유 `FilterPanel`(`SmsTemplateListPage.tsx:128-135`). `<nav aria-label="이벤트 분류 필터">` + 항목 5개 | — | 값은 **URL 쿼리 `cat`**(`notification.ts:421` — 세 목록이 같은 키) |
| FS-066-EL-002.1 | FS-066-SEC-02 | 필터 항목 버튼 | 버튼 | `<button aria-pressed={active}>`(`FilterPanel.tsx:65`). `aria-current` 를 쓰지 않는다(`:14-16`) | — | — |
| FS-066-EL-002.2 | FS-066-SEC-02 | 분류별 건수 배지 | 텍스트 | `countByCategory(controller.items)`(`SmsTemplateListPage.tsx:97`) — **필터·검색 적용 전 전량 기준** | — | — |
| FS-066-EL-003 | FS-066-SEC-03 | 검색 입력 | 입력 | `SearchField`, 접근 이름 '템플릿명·이벤트 검색'(`SmsTemplateListPage.tsx:108-114`). `{...list.searchInputProps}` 스프레드 | — | 커밋 값은 **URL 쿼리 `q`**. 클라이언트 필터 `searchTemplates`(`notification.ts:480-491`) — **템플릿명 또는 이벤트명**. **본문은 검색 대상이 아니다**(§7 #4) |
| FS-066-EL-003.1 | FS-066-SEC-03 | IME 조합·디바운스 커밋 규칙 | 텍스트 | 비표시. `useListState` → `useDebouncedSearch`: 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) · 250ms 디바운스(`:23,93-95`) · 조합 중 Enter 차단(`:121-124`, `isComposing` **과** 자체 관측 병행) · 최소 길이(`:90-91`) · stale 응답은 쿼리 키가 방지(`:14-18`) | — | `SmsTemplateListPage.tsx:106-107` 주석이 '`SearchField` 는 계약 밖 native prop 을 `<input>` 으로 흘려보내므로 composition 핸들러가 그대로 붙는다'를 명시 |
| FS-066-EL-004 | FS-066-SEC-03 | 'SMS 템플릿 등록' 버튼 | 버튼 | DS `<Button variant="primary" size="md">` + `PlusCircleIcon`(`SmsTemplateListPage.tsx:116-119`). → `/notifications/sms-templates/new` | — | 툴바 우상단(IA-04) |
| FS-066-EL-005 | FS-066-SEC-04 | 목록 상태 live region | 텍스트 | 비표시(시각). 항상 마운트된 `aria-live="polite"`(`CrudListShell.tsx:107-109`). 최초 로드 중 침묵 · 실패 'SMS 템플릿 목록을 불러오지 못했습니다.' · 0건 '조건에 맞는 SMS 템플릿 결과가 없습니다.' · 그 외 'SMS 템플릿 N건을 찾았습니다.' | — | — |
| FS-066-EL-006 | FS-066-SEC-04 | 조회 요약 텍스트 | 텍스트 | `firstLoading` → '불러오는 중…', 아니면 `전체 N건`. `refreshing` → ' · 새로고침 중…'. 선택 시 ' · N건 선택됨'. `aria-busy={refreshing}`(`CrudListShell.tsx:118-122`) | — | 재조회 중에도 건수가 살아 있다 |
| FS-066-EL-007 | FS-066-SEC-05 | 선택 일괄 삭제 바 | 배너 | `SelectionBar`(`CrudListShell.tsx:125-133`) + '선택 N건 삭제' danger 버튼 | O | 선택 0건이면 미렌더 |
| FS-066-EL-008 | FS-066-SEC-06 | 템플릿 표 | 표 | 공유 `CrudTable`. `aria-busy={firstLoading}`. caption 'SMS 템플릿 목록 — 행을 누르면 해당 항목으로 이동합니다…'(`CrudTable.tsx:117-120`). **전량 렌더 — 페이지네이션 없음**(§7 #3). **열이 6개로 형제 중 가장 많다** | O | 정렬은 FS-066-EL-017 |
| FS-066-EL-008.1 | FS-066-SEC-06 | 전체 선택 헤더 체크박스 | 입력 | `SelectAllHeaderCell`, 라벨 '이 페이지의 SMS 템플릿 전체 선택' | — | 보이는 행 전체를 토글 |
| FS-066-EL-008.2 | FS-066-SEC-06 | 행 선택 체크박스 | 입력 | `RowSelectCell`, 라벨 `'<템플릿명> 선택'`(`nameOf = item.name` — `SmsTemplateListPage.tsx:43`) | — | — |
| FS-066-EL-008.3 | FS-066-SEC-06 | 순번 셀 | 텍스트 | `SeqCell seq={index + 1}`(`CrudTable.tsx:179`) | — | 페이지네이션 도입 시 `startIndex + index + 1` 로 바뀌어야 한다(§7 #3) |
| FS-066-EL-008.4 | FS-066-SEC-06 | 이벤트 열 | 배지 | 섹션 공용 `triggerColumn()`(`SmsTemplateListPage.tsx:46`). `StatusBadge` 라벨=`triggerLabel` · 톤=분류. 모르는 트리거면 배지 대신 id 글자(`triggerColumn.tsx:22-25`) | — | **첫 열이 '이벤트'인 것이 마케팅과의 차이**. 색만으로 정보를 전달하지 않는다(`triggerColumn.tsx:15`) |
| FS-066-EL-008.5 | FS-066-SEC-06 | 템플릿명 열 | 텍스트 | `item.name`(`SmsTemplateListPage.tsx:47`). **truncate 없음** | — | 운영자만 보는 이름(`TemplateIdentityFields.tsx:58`). 상한 60자 |
| FS-066-EL-008.6 | FS-066-SEC-06 | 본문 열 | 텍스트 | `<span style={ellipsisCellStyle}>{oneLinePreview(item.body, 50)}</span>`(`SmsTemplateListPage.tsx:50`). **2중으로 줄인다** — `oneLinePreview`(`_shared/styles.ts:73-76`)가 **모든 공백을 한 칸으로 접고 50자에서 `…` 로 자른** 뒤, `ellipsisCellStyle`(`:53-61`)이 CSS 로 또 자른다 | — | **치환 전 원문**이다 — `#{주문번호}` 가 그대로 보인다(§7 #5). **FS-065 의 '제목' 열 자리를 본문이 대신한다**(SMS 엔 제목이 없다) |
| FS-066-EL-008.7 | FS-066-SEC-06 | 유형 열 | 배지 | `classifySms(byteLengthOf(item.body))`(`SmsTemplateListPage.tsx:56`) → `StatusBadge tone={kind === 'lms' ? 'warning' : 'neutral'}` 라벨 'SMS'/'LMS'(`:58-60`) | — | **'LMS 는 건당 단가가 오르는 경계라 목록에서 바로 눈에 띄어야 한다'**(`:57`). **이 화면 고유 열** |
| FS-066-EL-008.8 | FS-066-SEC-06 | 바이트 열 | 텍스트 | `formatNumber(byteLengthOf(item.body))`(`SmsTemplateListPage.tsx:67`). **`numeric: true`** → 우측 정렬 + tabular-nums(`CrudTable.tsx:184` → `numericCellStyle`) | — | **이 화면 고유 열.** `byteLengthOf`(`notification.ts:310-317`) = EUC-KR 기준 — 코드포인트 > 0x7f 면 2byte, 아니면 1byte |
| FS-066-EL-008.9 | FS-066-SEC-06 | 수정일시 열 | 텍스트 | `formatDateTime(item.updatedAt)`(`SmsTemplateListPage.tsx:73`). `numericMutedStyle`(nowrap + tabular-nums) | — | **브라우저 로컬 타임존 기준**(§7 #6) |
| FS-066-EL-008.10 | FS-066-SEC-06 | 행 액션(수정·삭제) | 버튼 | `RowActions`(`CrudTable.tsx:192-197`), 라벨 기준 = 템플릿명. 삭제 중인 행은 비활성 | O | 수정 → `/notifications/sms-templates/<id>/edit`(`SmsTemplateListPage.tsx:158`) |
| FS-066-EL-008.11 | FS-066-SEC-06 | 행 전체 클릭 이동 | 텍스트 | 비표시. `rowActivateProps(() => onEdit(item))`(`CrudTable.tsx:172`) | — | 키보드 등가물은 FS-066-EL-008.10 의 '수정' |
| FS-066-EL-009 | FS-066-SEC-07 | 목록 로딩 스켈레톤 | 스켈레톤 | 비표시. `loading={firstLoading}` 일 때만 5행 × (열수+3 = 9)셀(`CrudTable.tsx:143-152`) | — | **재조회에서는 행을 덮지 않는다**. 행 수 하드코딩은 §7 #7 |
| FS-066-EL-010 | FS-066-SEC-07 | 빈 상태 | 빈상태 | 비표시. 공유 `Empty` 3분기(`SmsTemplateListPage.tsx:145-156`): 검색 0건 → '검색 지우기' · 필터 0건 → '필터 초기화' · 진짜 0건 → 'SMS 템플릿 등록' CTA | — | 조사(이/가)는 `Empty` 가 고른다(`:137` · `CrudTable.tsx:156`) |
| FS-066-EL-011 | FS-066-SEC-07 | 목록 조회 실패 배너 | 배너 | 비표시. danger `Alert` 'SMS 템플릿 목록을 불러오지 못했습니다.' + '다시 시도'(`CrudListShell.tsx:157-164`) | O | 툴바·필터는 남는다 |
| FS-066-EL-012 | FS-066-SEC-08 | 단건 삭제 확인 다이얼로그 | 모달 | 비표시. `ConfirmDialog intent="delete"` 제목 'SMS 템플릿 삭제', 문구 `'<템플릿명>'{조사} 삭제합니다. 이 작업은 되돌릴 수 없습니다.`(`useCrudList.tsx:154-165`). `busy` → 확인 비활성 + '처리 중…'. 실패 시 다이얼로그 유지 + error 배너 | O | **⚠ 이 템플릿을 쓰는 발송 규칙이 있어도 *미리* 경고하지 않는다** — 다만 **확인 후 삭제 자체는 막힌다**: `store.ts:95-101` 이 409 를 던진다. 그때 다이얼로그는 열린 채 error 배너를 그리나 **문구가 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 고정**이라(`useCrudList.tsx:112`) 진짜 사유('발송 규칙 N건이 쓰고 있다')를 버린다(§7 #2) |
| FS-066-EL-013 | FS-066-SEC-08 | 일괄 삭제 확인 다이얼로그 | 모달 | 비표시. '선택한 SMS 템플릿 N건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'(`useCrudList.tsx:166-177`). 부분 실패는 'N건 중 M건…' | O | 위와 같은 경고 부재 |
| FS-066-EL-014 | — | URL 조회 상태 동기화 규칙 | 텍스트 | 비표시. `useListState({ filterDefaults: { cat: 'all' } })`(`SmsTemplateListPage.tsx:80`). 분류=`cat` · 검색어=`q`. 기본값과 같으면 URL 에서 제거(`useListState.ts:115-117`). `{ replace: true }`(`:125`). 모르는 `cat` 은 '전체'로(`notification.ts:436-439`) | — | `page`·`sort` 미사용 |
| FS-066-EL-015 | — | 필터·검색 변경 시 선택 해제 규칙 | 텍스트 | 비표시. `useEffect(() => { clear(); }, [category, keyword, clear])`(`SmsTemplateListPage.tsx:93-95`) + `useListState.ts:205-213` | — | STATE-04-b |
| FS-066-EL-016 | — | 목록 정렬 규칙 | 텍스트 | 비표시. `sortByTrigger`(`notification.ts:471-477`) — 트리거 정의 순서, 같은 트리거는 이름 `localeCompare('ko-KR')`. 저장소가 이미 정렬해 돌려준다(`store.ts:68`) | — | 정렬 변경 UI 없음. **바이트순 정렬이 없다** — 비용 축인데 정렬할 수 없다(§7 #8) |
| FS-066-EL-017 | FS-066-SEC-09 | 폼 '목록으로' 버튼 | 버튼 | `ChevronLeftIcon` + '목록으로'(`FormPageShell.tsx:148-156`) | — | `navigate()` 라 이탈 가드가 가로채지 못한다(§7 #9) |
| FS-066-EL-018 | FS-066-SEC-09 | 폼 제목 | 텍스트 | `<h1 style={pageTitleStyle}>{isEdit ? 'SMS 템플릿 수정' : 'SMS 템플릿 등록'}</h1>`(`FormPageShell.tsx:160`) | — | **AppHeader 도 `<h1>`('SMS 템플릿')을 그린다 → h1 2개**(§7 #10) |
| FS-066-EL-019 | FS-066-SEC-09 | 폼 설명 | 텍스트 | '이벤트가 발생하면 시스템이 이 문구로 SMS 를 자동 발송합니다. 이 화면에서 발송하지는 않습니다.'(`SmsTemplateFormPage.tsx:129`) | — | — |
| FS-066-EL-020 | FS-066-SEC-10 | 저장 실패 배너 | 배너 | 비표시. `FormServerError`(`FormPageShell.tsx:168`) — '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' + **복사 가능한 참조 코드**(`useCrudForm.ts:194-195`) | O | 409 는 FS-066-EL-032, 422 는 필드 인라인이 받는다 |
| FS-066-EL-021 | FS-066-SEC-13 | 폼 상세 로딩 스켈레톤 | 스켈레톤 | 비표시. 수정 진입 시 카드 본문을 4줄 스켈레톤 + `aria-busy="true"`(`FormPageShell.tsx:170-175`). 조건 = `loadingDetail`(`useCrudForm.ts:136`) | — | 등록에는 걸리지 않는다 |
| FS-066-EL-022 | FS-066-SEC-13 | 폼 상세 조회 실패 배너 | 배너 | 비표시. **404 와 5xx 를 가른다**(`FormPageShell.tsx:116-144`): 404 → 'SMS 템플릿을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + **'목록으로'만** · 5xx → 'SMS 템플릿을 불러오지 못했습니다.' + '다시 시도' + '목록으로' | O | 분기 근거는 `createStoreAdapter.fetchOne` 의 `HttpError(404)`(`crud.ts:192-194`). 조사는 `objectParticle`(`FormPageShell.tsx:129-130`) — **'SMS 템플릿'은 한글로 끝나 받침 판정이 성립한다** |
| FS-066-EL-023 | FS-066-SEC-10 | '템플릿명' 입력 | 입력 | 섹션 공용 `TemplateIdentityFields`(`SmsTemplateFormPage.tsx:145-157` → `TemplateIdentityFields.tsx:53-74`). `FormField htmlFor="sms-template-name" label="템플릿명" required`, 힌트 '운영자만 보는 이름입니다. 수신자에게는 보이지 않습니다.'. `<input type="text">` + `maxLength=60`, placeholder '예: 주문 접수 안내(SMS)'. `aria-invalid`/`aria-describedby` 를 **짝으로** 전환(`:69-70`) | — | **폼 진입 시 첫 포커스 대상**(A11Y-13) — `useInitialFocus(!loadingDetail)`(`SmsTemplateFormPage.tsx:107`)의 ref 와 register ref 를 함께 문다(`:149-152`) |
| FS-066-EL-024 | FS-066-SEC-10 | '이벤트' select | 입력 | `TemplateIdentityFields`(`TemplateIdentityFields.tsx:76-98`). `FormField htmlFor="sms-template-trigger" label="이벤트" required`. 선택지 = `NOTIFICATION_TRIGGERS` 10개, 표기 `'<분류> · <이벤트명>'`. **힌트가 선택에 따라 바뀐다** — `'<분류> · <설명>'` | — | **이 섹션의 정체성**. 바꾸면 FS-066-EL-027 의 변수 칩과 FS-066-EL-029 의 검증이 함께 바뀐다 |
| FS-066-EL-025 | FS-066-SEC-10 | '본문' textarea | 입력 | DS `TextareaField`(`SmsTemplateFormPage.tsx:159-169`). 라벨 '본문', `required`, `maxLength=2000`(`SMS_BODY_MAX = LMS_MAX_BYTES`), **5행**(이메일은 10행), **카운터 `N/2000`**(`TextareaField` 내부), placeholder '예: [스페이스플래닝] #{이름}님, 주문(#{주문번호})이 접수되었습니다.'. **힌트가 없다**(이메일과 다름) | — | `aria-invalid`/`aria-describedby`/`aria-required` 를 `TextareaField` 가 내부 배선(`TextareaField.tsx:62-67`). **⚠ 이 카운터는 글자수이며 진짜 제약이 아니다** — FS-066-EL-026 이 그것을 보완한다 |
| FS-066-EL-026 | FS-066-SEC-11 | 바이트 카운터 행 | 표시 | **이 화면의 핵심 요소.** 세 부분(`SmsTemplateFormPage.tsx:173-185`): ① **유형 배지** — `StatusBadge tone={overLimit ? 'danger' : kind === 'lms' ? 'warning' : 'neutral'}` 라벨 'SMS'/'LMS'(`:174-177`) ② **바이트 카운터** — `'<N> / <M> byte'`(`formatNumber` 경유 — `:179`) ③ **상태 문구** — LMS 승격이면 `' — 90 byte 를 넘어 LMS 로 발송됩니다(건당 단가가 오릅니다).'`(`:180-182`) · 초과면 `' — 한도를 넘었습니다. 저장하려면 문구를 줄여 주세요.'`(`:183`) | — | **`:171-172` 주석**: 'COMP-12 — 실시간 바이트 카운터 + 상한 근접/초과 경고. **90byte 를 넘는 순간 LMS 로 승격되어 건당 단가가 오르므로** 유형 배지를 함께 낸다.' **`:113-114`**: '**글자수(TextareaField 의 N/max 카운터)와 바이트는 다른 축이다. 한글 1자 = 2byte 라 45자에서 이미 SMS 한도(90byte)를 넘는다. 두 카운터를 모두 보여준다.**' |
| FS-066-EL-026.1 | FS-066-SEC-11 | 유형·한도 판정 규칙 | 텍스트 | 비표시. `bytes = byteLengthOf(body)`(`:115`) → `kind = classifySms(bytes)`(`:116` — 90byte 이하면 `'sms'`, 초과면 `'lms'` — `notification.ts:322-324`) → `limit = smsByteLimit(kind)`(`:117` — SMS 90 / LMS 2,000) → `overLimit = bytes > limit`(`:118`) | — | **`overLimit` 은 LMS 구간에서만 참이 된다** — SMS 구간(≤90)에서 90 을 넘으면 `kind` 가 `'lms'` 로 바뀌어 `limit` 이 2,000 이 되므로 `overLimit` 이 false 다. 즉 **90byte 초과는 '초과'가 아니라 '승격'이다**(§7 #11 이 그 표현의 함정을 다룬다) |
| FS-066-EL-027 | FS-066-SEC-12 | 치환변수 삽입 바 | 버튼 | 섹션 공용 `VariableInsertBar`(`SmsTemplateFormPage.tsx:187`). 라벨 '치환변수 삽입 — **이 이벤트가 주는 값만 쓸 수 있습니다.** 미리보기에서 표본값으로 치환됩니다.'(`VariableInsertBar.tsx:60`). 칩 = `variablesFor(trigger)`(`notification.ts:254-258`). 각 칩은 `<button aria-label='<변수명> 변수 삽입'>`(`:71`) | — | **마케팅의 동명 컴포넌트와 다르다** — '저긴 전 변수를 항상 보여준다… 이쪽은 선택한 트리거가 주는 변수만'(`VariableInsertBar.tsx:3-5`) |
| FS-066-EL-027.1 | FS-066-SEC-12 | 변수 삽입 규칙 | 텍스트 | 비표시. `setValue('body', `${body}${token}`, { shouldDirty: true, shouldValidate: true })`(`SmsTemplateFormPage.tsx:122-123`) — **현재 본문 끝에 이어 붙인다**(커서 위치가 아니다 — `VariableInsertBar.tsx:8-9`) | — | **⚠ 삽입이 바이트를 늘린다** — `#{송장번호}` 는 6한글자+2ASCII = 14byte 다. 90byte 경계 근처에서 칩 한 번이 LMS 승격을 일으킨다. **경고 없이 일어난다**(§7 #12) |
| FS-066-EL-028 | FS-066-SEC-12 | 광고성 문구 경고 | 배너 | `detectAdWords(body)`(`SmsTemplateFormPage.tsx:120`)가 1건 이상이면 warning `Alert`: `광고성 문구(<낱말들>)가 있습니다. 정보성 알림에 광고를 섞으면 메시지 전체가 광고성 정보가 되어 (광고) 표기·야간 발송 제한·무료수신거부 안내 의무가 생깁니다. 광고성 발송은 마케팅 관리에서 해 주세요.`(`:190-194`) | — | '**입력 중에 경계를 드러낸다 — 저장은 스키마가 막고 이유는 여기서 말한다**'(`:189`). **본문만 본다**(이메일은 제목+본문). 감지 낱말 9개(`notification.ts:287-297`). **단순 `includes` 라 오탐이 있다**(§7 #13) |
| FS-066-EL-029 | FS-066-SEC-12 | 미리보기 | 표시 | 본문이 비어 있지 않으면 렌더(`SmsTemplateFormPage.tsx:196`). `FormField label="미리보기(표본값 치환)"` 안에 `<p style={previewStyle}>`(`pre-wrap` + `break-word` — `:50-56`). 값은 `applyVariableSamples(body)`(`notification.ts:275-280`) | — | **⚠ 미리보기의 바이트를 보여주지 않는다** — 치환 후 실제 발송 문구가 90byte 를 넘는지 알 수 없다(§7 #14) |
| FS-066-EL-030 | FS-066-SEC-10 | 저장 검증 규칙 | 텍스트 | 비표시. 정본은 zod `smsTemplateSchema`(`validation.ts:20-62`): ① `requiredText('템플릿명', 60)` · `requiredText('본문', 2000)` — 문구는 공용 헬퍼가 **조사를 받침으로 골라** 만든다 ② **바이트 상한** — `byteLengthOf(body) > 2000` 이면 body 에 `본문이 <N> byte 라 LMS 한도(2000 byte)를 넘습니다. 문구를 줄여 주세요.`(`:26-37`). 주석: '**LMS 2,000byte 를 넘으면 발송사가 거절한다. 글자수(maxLength)와 다른 축이라 따로 본다**' ③ **광고성 문구** → body 에 `광고성 문구(…)가 있어 정보성 알림으로 보낼 수 없습니다. 광고성 발송은 마케팅 관리에서 하세요.`(`:38-50`) ④ **트리거가 주지 않는 변수** → `unknownVariablesFor(body, trigger)` → body 에 `이 이벤트가 주지 않는 변수(…)가 있습니다. 아래 삽입 바에 있는 변수만 쓸 수 있습니다.`(`:51-61`) | — | ②③④ 전부 **마케팅엔 없는 검사**다(`validation.ts:3-6`). **⚠ 90byte 초과는 막지 않는다** — LMS 승격이 정상 경로다(`sms-templates.test.ts:50-52` 가 그것을 단언) |
| FS-066-EL-031 | FS-066-SEC-10 | '취소'/'등록'·'저장' 버튼 | 버튼 | 취소 = `<Button variant="secondary">`, 저장 중 비활성. 저장 = `<Button type="submit" variant="primary" size="md">`, 라벨 '저장 중…'/'저장'/'등록', 비활성 = `saving \|\| loadingDetail`(`FormPageShell.tsx:181-191`) | O | 성공 시 토스트 + `navigate(listPath, { replace: true })`. 저장 전 `toInput` 이 모든 문자열을 `trim`(`SmsTemplateFormPage.tsx:58-64`) |
| FS-066-EL-032 | FS-066-SEC-13 | 409 충돌 다이얼로그 | 모달 | 비표시. 409/412 시 **입력을 보존한 채** 다이얼로그(`useCrudForm.ts:166-178` → `FormPageShell.tsx:196`). 문구 = 서버 메시지('다른 사용자가 먼저 삭제한 항목입니다.' — `crud.ts:220`). '최신 다시 불러오기' / '닫기' | O | **성공 토스트도 목록 이동도 없다**(유령 저장 금지 — `useCrudForm.ts:164-165`) |
| FS-066-EL-033 | FS-066-SEC-13 | 미저장 이탈 가드 | 모달 | 비표시. `useUnsavedChangesDialog(isDirty && !saving, { message })`(`FormPageShell.tsx:114`). 문구 'SMS 템플릿에 저장하지 않은 변경 사항이 있습니다…'(`SmsTemplateFormPage.tsx:34-35`). 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel) | — | `isDirty` = RHF `formState.isDirty`(`useCrudForm.ts:261`). **변수 삽입도 `shouldDirty: true`**(`SmsTemplateFormPage.tsx:123`) |
| FS-066-EL-034 | — | 저장 성공 토스트 | 토스트 | `'SMS 템플릿을 등록했습니다.'` / `'SMS 템플릿을 저장했습니다.'`(`useCrudForm.ts:222`) | — | **ERP-13** — `objectParticle('SMS 템플릿')`. 앞 낱말이 '템플릿'(받침 없음)이라 '를'이 아니라… **'템플릿'은 'ㅅ' 받침이 있으므로 '을'** 이 옳다. 헬퍼가 마지막 글자로 판정한다 |
| FS-066-EL-035 | — | 삭제 성공 토스트 | 토스트 | `'<템플릿명>'{조사} 삭제했습니다.`(`useCrudList.tsx:108`) · 일괄은 'SMS 템플릿 N건을 삭제했습니다.'(`:146`) | — | **ERP-13** — `objectParticle(nameOf(target))` 이 **이름의 받침**으로 고른다. 시드 이름이 '주문 접수 안내(SMS)' 처럼 **괄호·ASCII 로 끝나면** 헬퍼가 받침 없음으로 본다(`format.ts` 주석: '영문·숫자로 끝나는 말은 관용을 따라 받침 없음으로 본다') → '…(SMS)를 삭제했습니다' |
| FS-066-EL-036 | — | 언마운트 abort 규칙 | 텍스트 | 비표시. 폼 `useCrudForm.ts:93` · 삭제 다이얼로그 닫기 `useCrudList.tsx:87-88`. abort 는 **실패로 통지하지 않는다** — 공유 `isAbort`(`shared/async.ts`) | — | 성공 콜백도 `signal.aborted` 면 아무것도 하지 않는다 |
| FS-066-EL-037 | — | 중복 제출 방지 규칙 | 텍스트 | 비표시. 폼 저장 3중: 버튼 비활성 · **동기 락** `submitLockRef`(`useCrudForm.ts:103,201-202`) · **제출 시도 단위 멱등키** `idempotencyKeyRef`(`:118-123`) → `WriteContext.idempotencyKey`(`crud.ts:30-41`) → `ledger.isReplay`(`:201,208`). 삭제는 **확인 다이얼로그 + `busy`** 가 게이트하며 키가 없다 — `crud.ts:36-39` 가 그 생략을 의도로 선언 | O | ledger 는 **성공한 뒤에만 기록**(`crud.ts:55-60`) |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-066-EL-001 | N/A — 정적 문구, 항상 표시 | 조회와 무관하게 표시 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 정적 | 고정 문구 |
| FS-066-EL-001.1 | N/A — 항상 표시 | 조회 중에도 표시 | N/A — 라우터 내부 이동. 대상 권한이 없으면 이동 후 403 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **대상 권한을 묻지 않는다**(§7 #15) | N/A — 정적 | 단일 링크 |
| FS-066-EL-002 | 항목은 항상 5개 — 데이터 0건이어도 그려진다 | 조회 중에도 조작 가능(counts 전부 0) | N/A — 클라이언트 파생 | 모르는 `cat` 은 '전체'로 | §4.1 공통 규칙 적용 | 원천이 URL 이라 뒤로가기·새로고침에 살아남는다 | 분류 4개 고정 |
| FS-066-EL-002.1 | N/A — 항상 5개 | 조회 중에도 누를 수 있다 | N/A — 서버 호출 없음 | N/A — 버튼 | §4.1 공통 규칙 적용 | URL 을 `replace` 로 갱신 | 5개 고정 |
| FS-066-EL-002.2 | 0건이면 전부 '0' | 조회 중 전부 '0' | 조회 실패 시 패널은 남고 배지는 '0' | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회 시점에만 갱신 | 전량을 5회 순회 — **상한이 없다**(§7 #3) |
| FS-066-EL-003 | 매치 0건이면 FS-066-EL-010 검색 빈 상태 | 조회 중에도 입력 가능(결과 0건) | N/A — 클라이언트 필터 | 자유 텍스트. 제약 없음. 커밋 시 `trim`. 빈 문자열은 '검색 해제'라 최소 길이 면제 | §4.1 공통 규칙 적용 | **URL 이 원천이라 뒤로가기·새로고침·링크 공유에 살아남는다** | 전량이 메모리에 있어 커밋마다 전체를 훑는다 — 250ms 디바운스가 횟수를 지배. **템플릿명 + 이벤트명 2축(본문 제외 — §7 #4)** |
| FS-066-EL-003.1 | N/A — 규칙 자체 | 조회 중에도 성립 | N/A — 서버 호출 없음 | **이것이 유효성 게이트다** — 조합 중 값은 커밋되지 않는다 | §4.1 공통 규칙 적용 | **늦게 온 이전 응답이 최신을 덮지 않는다**(쿼리 키) | 커밋 1회 = 필터 1회. 요청 0건 |
| FS-066-EL-004 | N/A — 항상 표시 | 조회 중에도 누를 수 있다 | 조회 실패 시에도 남는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 보인다**(§7 #15) | N/A — 이동 | N/A — 단일 버튼 |
| FS-066-EL-005 | 0건이면 '조건에 맞는 SMS 템플릿 결과가 없습니다.' | **최초 로드 중 침묵**(`CrudListShell.tsx:78`) | 실패 시 'SMS 템플릿 목록을 불러오지 못했습니다.' | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 실패 문구로 announce | 재조회로 건수가 바뀌면 다시 announce | 문구 1줄 |
| FS-066-EL-006 | 0건이면 '전체 0건' | 최초 '불러오는 중…' · **재조회는 '전체 N건 · 새로고침 중…'** | 조회 실패 시 FS-066-EL-011 이 대체 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | `aria-busy={refreshing}` | `formatNumber` |
| FS-066-EL-007 | 선택 0건이면 미렌더 | 조회 중엔 행이 없어 선택도 없다 | 조회 실패 시 미표시 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 보인다** | 필터·검색이 바뀌면 선택 해제(FS-066-EL-015) | `settleAll` 병렬. **상한 없음** |
| FS-066-EL-008 | 0건이면 FS-066-EL-010 으로 본문 대체 | FS-066-EL-009 스켈레톤 + `aria-busy` | FS-066-EL-011 로 요약+표 대체 | N/A — 표 입력 없음 | §4.1 공통 규칙 적용 | 조회 시점 스냅샷 | **상한 없다** — 한 트리거에 템플릿을 여럿(§7 #3). **열 6개 + 선택·순번·액션 = 9열이라 가로 공간이 형제 중 가장 빠듯하다**(§7 #16) |
| FS-066-EL-008.1 | 행 0건이면 미표시 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 이진 | §4.1 공통 규칙 적용 | 보이는 행 기준 | 전량 토글 |
| FS-066-EL-008.2 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 이진 | §4.1 공통 규칙 적용 | 선택은 로컬 — 재조회로 행이 사라져도 id 가 남는다 | 행마다 1개 |
| FS-066-EL-008.3 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회·필터로 순서가 바뀌면 다시 매겨진다 | **페이지네이션 도입 시 값 공식이 틀어진다**(§7 #3) |
| FS-066-EL-008.4 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | **모르는 트리거는 배지 대신 글자 폴백**(`triggerColumn.tsx:22-25`) | §4.1 공통 규칙 적용 | 트리거가 코드 상수라 서버 변경과 어긋날 수 있다(§7 #17) | 10개 트리거 고정 |
| FS-066-EL-008.5 | 이름이 빈 문자열이면 빈 칸(스키마가 막으므로 서버 데이터에서만) | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | **truncate 없음** — 60자 이름이 열을 넓힌다(§7 #18) |
| FS-066-EL-008.6 | 본문이 빈 문자열이면 빈 칸 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | **2중으로 줄인다** — `oneLinePreview(body, 50)` + `ellipsisCellStyle`. 2,000byte 본문도 열을 밀지 않는다(COMP-09 충족) |
| FS-066-EL-008.7 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 파생값 | §4.1 공통 규칙 적용 | 조회 시점 본문으로 매 렌더 재계산 | **행마다 `byteLengthOf` 1회**(본문 길이에 선형). 2,000자 × 1,000행이면 200만 자 순회 — **상한 없는 목록에서 비용이 는다**(§7 #3) |
| FS-066-EL-008.8 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 파생값 | §4.1 공통 규칙 적용 | 위와 동일 | **위와 같은 계산을 한 번 더 한다** — `classifySms(byteLengthOf(...))`(유형 열)와 `byteLengthOf(...)`(바이트 열)가 **같은 값을 각각 센다**(`SmsTemplateListPage.tsx:56,67`) — 행마다 2회다(§7 #19) |
| FS-066-EL-008.9 | 행 0건이면 없음 | 조회 중 스켈레톤 | `updatedAt` 이 유효하지 않으면 `formatDateTime` 폴백 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | **저장할 때마다 서버 시각으로 갱신된다**(`store.ts:230,238`) | nowrap + tabular-nums |
| FS-066-EL-008.10 | 행 0건이면 없음 | 조회 중 스켈레톤 행이라 버튼이 없다. 삭제 중인 행은 비활성 | 삭제 실패는 다이얼로그 안 배너 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 보인다**(§7 #15) | 이미 삭제된 항목이면 어댑터가 409(`crud.ts:232-234`) | 행마다 2개 |
| FS-066-EL-008.11 | 행 0건이면 걸리지 않는다 | 조회 중 스켈레톤 행이라 걸리지 않는다 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 이동 후 폼이 상세를 재조회 — 그 사이 삭제됐으면 FS-066-EL-022 의 404 분기 | N/A — 행 단위 |
| FS-066-EL-009 | N/A — 도착 전 상태 | 이것이 로딩 표현. 5행 × 9셀 | 조회 실패 시 FS-066-EL-011 로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **데이터가 있는 재조회에서는 뜨지 않는다** | 행 수 5 고정(§7 #7) |
| FS-066-EL-010 | **이것이 빈 상태 표현.** 3분기 | 최초 로드 중엔 스켈레톤이 이 자리 | 조회 실패 시 FS-066-EL-011 로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 권한 부족은 실패 배너이지 빈 상태가 아니다 | N/A — 표시 전용 | N/A — 1행 |
| FS-066-EL-011 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 스켈레톤으로 | **이것이 실패 표현.** 문구 1종 + '다시 시도'. **403·429·500·504 를 구분하지 않는다**(§7 #20) | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 이 배너 | 재시도는 같은 조회 재발행. **필터·검색은 URL 에 있어 유지된다** | N/A — 표시 전용 |
| FS-066-EL-012 | N/A — 대상이 있어야 성립 | 확인 중 `busy` → 비활성 + '처리 중…' | **실패해도 다이얼로그가 열려 있고** error 배너 — 재클릭이 재시도 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 '삭제하지 못했습니다' | 이미 삭제된 항목이면 409 → 같은 문구로 뭉개진다(§7 #20). **⚠ 이 템플릿을 쓰는 규칙이 있어도 막지 않는다**(§7 #2) | 단건. 멱등키 없음(의도 — `crud.ts:36-39`) |
| FS-066-EL-013 | 선택 0건이면 즉시 return(`useCrudList.tsx:128`) | 진행 중 확인 비활성 | 부분 실패는 'N건 중 M건…' 배너, 다이얼로그 유지 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 그 사이 삭제된 건은 409 로 실패 수에 든다 | 선택 수만큼 병렬. **abort 가 실패 수에서 제외되지 않는다**(§7 #21) |
| FS-066-EL-014 | N/A — 규칙 자체 | 조회 중에도 URL 은 확정돼 있다 | N/A — 서버 호출 없음 | 손으로 고친 `?cat=bogus` 는 '전체'로 | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체다** — URL 이 단일 원천 | 파라미터 2개 |
| FS-066-EL-015 | 선택이 없으면 no-op | 조회 중에도 성립 | N/A — 로컬 상태 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체다**(STATE-04-b) | 선택 집합 전체 |
| FS-066-EL-016 | 0건이면 빈 배열 | N/A — 순수 정렬(동기) | N/A — 서버 호출 없음 | 모르는 트리거는 rank 0 으로 앞에 온다(`notification.ts:474` `?? 0`) — §7 #17 | §4.1 공통 규칙 적용 | 저장소·화면이 같은 함수를 쓴다 | O(n log n) + `localeCompare`. **n 상한 없음** |
| FS-066-EL-017 | N/A — 항상 표시 | 상세 로딩 중에도 표시 | 조회 실패 시 배너 안 '목록으로'가 대신 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 중에도 누를 수 있다 — 이탈 시 abort | N/A — 단일 버튼 |
| FS-066-EL-018 | N/A — 정적 문구 | 상세 로딩 중에도 표시 | 조회 실패 시 배너가 화면을 대체해 **제목이 사라진다**(§7 #22) | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 정적 | 등록/수정 2종 |
| FS-066-EL-019 | N/A — 정적 문구 | 상세 로딩 중에도 표시 | 조회 실패 시 사라진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 정적 | 고정 문구 |
| FS-066-EL-020 | N/A — 오류 없으면 미렌더 | 재저장 시 먼저 지운다(`useCrudForm.ts:205-206`) | **이것이 저장 실패 표현.** 문구 1종 + 참조 코드 | 클라이언트 검증 위반은 필드 인라인으로 | §4.1 공통 규칙 적용 — **403 도 이 배너**(§7 #20) | N/A — 표시 전용 | 1건 |
| FS-066-EL-021 | N/A — 도착 전 상태 | 이것이 로딩 표현. 4줄 + `aria-busy` | 조회 실패 시 FS-066-EL-022 로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 조건이 `data === undefined` 라 409 후 재조회 중에는 뜨지 않는다 | 4줄 고정 |
| FS-066-EL-022 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 스켈레톤으로 | **이것이 실패 표현. 404 와 5xx 가 갈린다** — 404 는 '다시 시도'를 주지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **403 은 5xx 와 같은 문구**(§7 #20) | 다른 관리자가 먼저 지운 템플릿의 수정 링크를 열면 **404 분기가 정확히 발현된다** | N/A — 표시 전용 |
| FS-066-EL-023 | 등록 시 빈 문자열 + placeholder | 상세 로딩 중 카드 본문이 스켈레톤이라 미렌더. **로딩이 끝나는 첫 순간 포커스**(`useInitialFocus.ts:21-25` — 한 번만) | 조회 실패 시 미렌더. 저장 실패는 FS-066-EL-020 | `requiredText('템플릿명', 60)` — 공백만이면 거절, 60자 초과면 거절. `maxLength=60` 네이티브. **`required` 자식이 `<input>` 이라 `aria-required` 가 주입된다**(`FormField.tsx:36-41,50-56`) | §4.1 공통 규칙 적용 | 상세 도착 시 `reset(toValues(loaded))` 가 폼을 덮는다 — **편집 중 재조회가 오면 입력이 사라질 수 있다**(§7 #23) | 60자 상한. **카운터가 없다**(§7 #24) |
| FS-066-EL-024 | N/A — 항상 10개 | 상세 로딩 중 미렌더 | 조회 실패 시 미렌더 | `z.enum(TRIGGER_ID_VALUES)` 라 위반 값이 없다. **`required` 자식이 `SelectField` 라 `aria-required` 주입**(`FormField.tsx:41`) | §4.1 공통 규칙 적용 | **트리거를 바꾸면 기존 본문의 변수가 갑자기 '주지 않는 변수'가 될 수 있다** — 저장 시 FS-066-EL-030 ④가 막는다. 자동 정리는 없다(§7 #25) | 10개 고정 |
| FS-066-EL-025 | 등록 시 빈 문자열 + placeholder. **카운터는 '0/2000'** | 상세 로딩 중 미렌더. `disabled = saving \|\| loadingDetail` | 저장 실패는 FS-066-EL-020. **실패 시 본문은 보존된다** | `requiredText('본문', 2000)` + 바이트(②) + 광고성(③) + 변수(④). `TextareaField` 가 `aria-invalid`/`aria-describedby`/`aria-required` 를 내부 배선(`TextareaField.tsx:62-67`) | §4.1 공통 규칙 적용 | 위와 동일 | **⚠ `maxLength=2000` 은 글자수라 한글 본문에서 절대 걸리지 않는다** — 1,001자에서 이미 바이트 한도를 넘어 스키마가 먼저 막는다. **글자수 cap 이 이론상 최대치(전부 ASCII)로 설계됐기 때문**(`notification.ts:361-367`) |
| FS-066-EL-026 | 본문이 비면 '0 / 90 byte' + 'SMS' neutral 배지 | 상세 로딩 중 미렌더 | N/A — 순수 파생(동기) | **이것이 상한 표현.** 초과(>2,000byte)면 danger 배지 + '한도를 넘었습니다…'. 저장 차단은 FS-066-EL-030 ②가 한다 | §4.1 공통 규칙 적용 | 입력마다 즉시 재계산 | 본문 길이에 선형(`byteLengthOf` 가 코드포인트 순회 — `notification.ts:311-316`). **`useMemo` 없이 렌더마다 3회 파생**(`bytes`·`kind`·`limit` — `SmsTemplateFormPage.tsx:115-117`) |
| FS-066-EL-026.1 | 본문이 비면 `kind='sms'` · `limit=90` · `overLimit=false` | N/A — 순수 판정 | N/A — 서버 호출 없음 | **90byte 초과는 '초과'가 아니라 '승격'이다** — `limit` 이 2,000 으로 바뀌어 `overLimit` 이 false 다 | §4.1 공통 규칙 적용 | N/A — 로컬 파생 | O(n). **`sms-templates.test.ts:112-117,124-129` 가 경계를 고정**한다 |
| FS-066-EL-027 | 트리거가 주는 변수가 최소 1개(`#{이름}` 공통) | 상세 로딩 중 미렌더. `disabled` 시 칩 비활성 | N/A — 서버 호출 없음(순수 파생) | N/A — 버튼 | §4.1 공통 규칙 적용 | 트리거를 바꾸면 칩이 즉시 따라 바뀐다 | 트리거당 최대 4개 |
| FS-066-EL-027.1 | 본문이 비어 있으면 토큰만 남는다 | 상세 로딩 중 걸리지 않는다 | N/A — 로컬 setValue | `shouldValidate: true` 라 삽입 즉시 검증이 돈다 | §4.1 공통 규칙 적용 | N/A — 로컬 | **⚠ 삽입이 바이트를 늘린다** — `#{송장번호}` = 14byte. **90byte 경계에서 칩 한 번이 LMS 승격(비용 상승)을 일으키며 경고가 없다**(§7 #12). 본문 끝에만 붙는다 |
| FS-066-EL-028 | 광고성 낱말 0건이면 미렌더 | 상세 로딩 중 미렌더 | N/A — 순수 파생(동기) | **이것이 경고 표현.** 저장 차단은 FS-066-EL-030 ③이 한다 | §4.1 공통 규칙 적용 | N/A — 로컬 파생 | 낱말 9개 `includes`. **오탐**: '이벤트'가 목록에 있어 정상 문구도 잡는다(§7 #13) |
| FS-066-EL-029 | 본문이 비면 미렌더(`SmsTemplateFormPage.tsx:196`) | 상세 로딩 중 미렌더 | N/A — 순수 파생 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 입력마다 즉시 재계산 | 변수 8개 `replaceAll`(`notification.ts:276-279`). **⚠ 치환 후 바이트를 보여주지 않는다** — 실제 발송 문구가 90byte 를 넘는지 알 수 없다(§7 #14) |
| FS-066-EL-030 | 두 필드가 비면 두 오류가 동시에 뜬다 | N/A — 순수 검증(동기) | N/A — 서버 호출 없음 | **이것이 유효성 표현.** 4규칙(필수·길이 / **바이트 상한** / 광고성 / 변수 종속). **셋(②③④)이 전부 `body` 에 꽂힌다** — 이메일과 달리 제목이 없어 필드 혼동이 없다 | §4.1 공통 규칙 적용 | **클라이언트 검증이다** — 서버가 정본이어야 한다(BE-066 §7.4) | 문자열 길이에 선형. `byteLengthOf` + `detectAdWords` + 정규식 1회 |
| FS-066-EL-031 | N/A — 항상 표시 | 저장 중 '저장 중…' + 비활성. 상세 로딩 중에도 비활성 | 실패 시 FS-066-EL-020(또는 EL-032 충돌 / 필드 인라인), 버튼 재활성, 이동 없음, **입력 보존** | 검증 실패면 서버 미호출 + **첫 오류 필드로 포커스**(RHF `shouldFocusError`) | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 보이고 눌린다**(§7 #15) | 대상이 사라졌으면 409 → FS-066-EL-032. **취소는 `navigate()` 라 이탈 가드가 발화하지 않는다**(§7 #9) | 단건. **동기 락 + 멱등키 있음**(FS-066-EL-037) |
| FS-066-EL-032 | N/A — 충돌이 있어야 성립 | '최신 다시 불러오기' 시 상세 재조회 | **이것이 충돌 표현.** 서버 메시지를 그대로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체다.** ⚠ 어댑터의 409 는 **'대상이 아직 있는가'** 만 본다(`crud.ts:219-221`) — `version`/`ETag` 가 아니다. **둘 다 존재하는 동시 편집은 여전히 last-write-wins**(§7 #26) | 1건 |
| FS-066-EL-033 | N/A — 변경이 있어야 성립 | 저장 중에는 비활성(`isDirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **저장 성공 후 `navigate(replace)` 는 프로그램 이동이라 가드가 발화하지 않는다** — 의도된 통과 | N/A — 표시 전용 |
| FS-066-EL-034 | N/A — 성공이 있어야 성립 | N/A — 결과 통지 | N/A — 실패는 배너 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **어댑터가 409 를 내므로 유령 저장 토스트가 나지 않는다** | 1건 |
| FS-066-EL-035 | N/A — 성공이 있어야 성립 | N/A — 결과 통지 | N/A — 실패는 다이얼로그 배너 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **삭제된 템플릿을 쓰던 규칙은 이 시점에 깨지나 토스트가 그것을 말하지 않는다**(§7 #2) | 단건/일괄 각 1건 |
| FS-066-EL-036 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | **abort 는 실패가 아니다** | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 이탈 시 진행 중 쓰기가 취소된다 — **서버 도달 여부는 보장하지 않는다**(§7 #27) | 일괄 삭제의 abort 는 실패 수에서 제외되지 않는다(§7 #21) |
| FS-066-EL-037 | N/A — 제출이 있어야 성립 | 이것이 잠금 규칙 | 실패 시 락이 풀리고(`onSettled`) **멱등키는 남는다** | 검증 실패 시 락을 즉시 푼다(`useCrudForm.ts:246-248`) | §4.1 공통 규칙 적용 | 같은 키의 두 번째 요청은 어댑터가 재생(`crud.ts:201,208`). **기록은 성공한 뒤에만**(`:55-60`) | **폼 저장에만. 삭제는 확인 다이얼로그가 게이트**(`crud.ts:36-39` 의 의도) |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 목록 조회 실패는 인라인 배너(FS-066-EL-011), 폼 상세 실패는 404/5xx 분기 배너(EL-022), 저장 실패는 카드 배너(EL-020), 삭제 실패는 다이얼로그 배너. **오프라인 감지·복귀 재조회는 앱 전역에 없다**(`navigator.onLine` grep 0건) — §7 #28 |
| 세션 만료 | 401 → **앱 전역 인터셉터**(`shared/query/queryClient.ts`) → `notifySessionExpired()` → `RequireAuth` 감시자가 세션 폐기 후 `/login?returnUrl=<현재경로>&reason=session_expired`. 재로그인 후 원래 경로(쿼리 포함)로 복귀 — **URL 에 필터·검색이 있어 조건까지 복원된다**(EL-014). 다만 **폼의 미저장 입력은 사라진다**(프로그램 이동이라 EL-033 미발화) |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` grep 0건). abort 는 언마운트·다이얼로그 닫기에서만 — §7 #28 |
| 중복 제출 | **폼 저장**은 3중(비활성 + 동기 락 + 멱등키 — EL-037). **삭제**는 확인 다이얼로그 + `busy` 비활성이며 멱등키가 없다 — `crud.ts:36-39` 가 '확인 다이얼로그를 거치는 조작은 키 없이 온다'를 **의도로 선언**한다. **이 화면엔 확인 없는 쓰기가 0건이다**(FS-064 와 다른 점) |
| 실패 통지의 자리 | ① 목록 조회 실패 = 인라인 배너(요약+표 대체) ② 폼 상세 실패 = 화면 대체 배너(404/5xx 분기) ③ 저장 실패 = 카드 상단 배너 + 참조 코드 ④ 저장 충돌(409/412) = 다이얼로그(입력 보존) ⑤ 저장 필드 거절(422) = 필드 인라인 + 포커스 ⑥ 삭제 실패 = 그 다이얼로그 안 배너 ⑦ 쓰기 성공 = 토스트 ⑧ abort = 아무것도 띄우지 않는다 |
| 낙관적 업데이트 | **이 화면에 없다.** 저장·삭제가 전부 비관적이다 — `onMutate`/`setQueryData` 0건 |
| 동시 조회 | 목록/상세는 각각 동시에 1건(react-query). `staleTime` 30초 · 자동 재시도 없음 · 창 포커스 재조회 없음. **이 화면엔 쿼리 밖 동기 store 호출이 없다** — FS-064 와 다른 점 |
| 권한 없음 | **프론트 역할 분기 없음.** 라우트 read 권한은 `RequirePermission` 이 `<Outlet>` 바깥에서 가드(`AppShell.tsx:490-491`). 그러나 **쓰기 게이팅(`useRouteWritePermissions`)이 배선돼 있지 않다** — 소비처 8곳에 알림 관리 없음(§7 #15). 은닉 정책(403 vs 404)은 BE-066 §7.5 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary`(`AppShell.tsx:484-493`) |
| 행 선택의 수명 | 필터·검색이 바뀌면 해제된다(EL-015). 페이지네이션이 없어 'page 변경 시 해제'는 표면이 없다 |
| 정보성 vs 광고성 경계 | **2중이다**: ① 입력 중 경고(EL-028) ② 저장 차단(EL-030 ③). **야간·(광고) 표기·무료수신거부 검사는 이 화면에 없다** — 정보성 알림엔 그 의무가 없다(§1) |
| **바이트 vs 글자수** | **두 축이 공존하며 진짜 제약은 바이트다**(`notification.ts:361-367`). ① `maxLength=2000`(글자수) — 네이티브 cap, **한글 본문에서는 절대 걸리지 않는다** ② `byteLengthOf > 2000` — 스키마가 막는다(EL-030 ②) ③ 90byte — **막지 않는다.** LMS 승격이 정상 경로다(`sms-templates.test.ts:50-52` 가 단언). 이 규약은 **quality-bar COMP-12 의 'counting 기준(code point vs byte)을 정의하고 서버 강제와 일치시킨다'에 정면으로 답하는 유일한 화면**이다 |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| FS-066-EL-002.2 / EL-005 / EL-006 / EL-008 / EL-011 | SMS 템플릿 목록 조회 | R | 템플릿 전량(필터·검색·정렬·페이징 없이) | `smsTemplateAdapter.fetchAll(signal)` | 분류·검색·정렬이 **전부 클라이언트**다. **유형·바이트도 클라이언트 파생**이다(EL-008.7·008.8) — 서버가 내려주지 않는다 |
| FS-066-EL-021 / EL-022 / EL-023~EL-029 | SMS 템플릿 상세 조회 | R | 템플릿 1건 | `smsTemplateAdapter.fetchOne(id, signal)` | 없는 id → `HttpError(404)`(`crud.ts:192-194`) |
| FS-066-EL-031 (등록) | SMS 템플릿 등록 | W | `SmsTemplateInput`(name·trigger·body) + 멱등키 | `smsTemplateAdapter.create(input, { signal, idempotencyKey })` | 멱등키가 어댑터까지 도달(`crud.ts:197-204`) |
| FS-066-EL-031 (수정) / EL-032 | SMS 템플릿 수정 | W | id + `SmsTemplateInput` + 멱등키 | `smsTemplateAdapter.update(id, input, { signal, idempotencyKey })` | 대상 부재 시 `HttpError(409)`(`crud.ts:219-221`) |
| FS-066-EL-012 / EL-013 | SMS 템플릿 삭제(단건·일괄) | W | id | `smsTemplateAdapter.remove(id, { signal })` | 일괄은 id 마다 병렬 호출(`settleAll`). 멱등키 없음(의도) |
| FS-066-EL-027 / EL-029 / EL-030 ④ | 트리거·변수 카탈로그 | R | 트리거 10종 + 변수 8종 + 표본값 | **없음 — 프론트 코드 상수**(`notification.ts:77-88,100-161,207-251`) | **연동 심이 없다.** 서버 소유 여부 **미정** — BE-066 §7.6 |
| FS-066-EL-026 / EL-030 ② | 바이트 규약(EUC-KR · 90/2,000) | — | — | **없음 — 프론트 코드 상수**(`notification.ts:33,306-307,310-317`) | **서버 발송사와 일치해야 한다** — 어긋나면 저장은 되고 발송이 거절된다. BE-066 §7.2 |
| FS-066-EL-012 (경고 부재) | 이 템플릿을 쓰는 규칙 수 | R | templateId → 참조 규칙 수 | **`_shared/store.rulesUsingTemplate()`** — ⚠ **소비처가 생겼다**: `store.remove`(`:95`)가 삭제 차단에 쓴다. **그러나 다이얼로그는 여전히 부르지 않는다** | **삭제 *차단*은 구현됐다(409). *삭제 전 경고*는 여전히 없다** — BE-066 §7.3 |

> **현재 구현 상태 (A63 참고)**: 백엔드는 없다. `smsTemplateAdapter` 는 공용 `createStoreAdapter`(`shared/crud/crud.ts:165-239`)로 `_shared/store.ts` 의 브라우저 안 mutable 배열 위에 배선된다. 그 배열은 **템플릿 저장소 골격**(`store.ts:62-106` `createTemplateStore`)이 관리하며 **이메일·SMS 가 같은 골격에 build/patch 만 주입**해 쓴다(`:26-31`). 400ms 지연(`LATENCY_MS`)과 실패 스위치(`failIfRequested`)를 얹어 CRUD 를 흉내 낸다 — **실제 네트워크 0건 · 실제 발송 0건**(`store.ts:3`). 시드 5건(`store.ts:184-220`)은 '90byte 안팎으로 맞춘 정보성 문구'이고 **`ntf-sms-3`(주문 취소 안내)은 일부러 90byte 를 넘겨 LMS 로 승격되는 표본**이다 — '폼의 바이트 카운터·승격 안내가 실제로 걸리는지 눈으로 확인할 수 있게 둔다'(`:181-182`). 팩토리가 주는 것: 404(`:192-194`) · 멱등 재생(`:200-203,208,229`) · 409(`:219-221,232-234`). 새로고침하면 시드로 되돌아간다. `data-source.ts:18-20` 의 `// TODO(backend): GET/POST /api/notifications/sms-templates · GET/PUT/DELETE /api/notifications/sms-templates/:id` 가 유일한 연동 지점이며, **트리거·변수 카탈로그·바이트 규약·참조 규칙 수 조회에는 심이 없다.**

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `SmsTemplateListPage.tsx` · `SmsTemplateFormPage.tsx` · `data-source.ts` · `validation.ts` · `sms-templates.test.ts` · `_shared/{notification,store,styles,TransactionalNotice,TemplateIdentityFields,VariableInsertBar,triggerColumn,useInitialFocus}.ts(x)` · 공용 `shared/crud/**` · `packages/ui` 의 `FormField`·`TextareaField`
- [x] **마케팅(FS-036 발송 템플릿 · FS-034 SMS 발송)과의 관계를 코드로 판정**했다 — **중복이 아니라 별개**다. 엔티티 필드가 다르고(`trigger` 있음 / `channel`·`approvalStatus`·`rejectReason` 없음), **검증 규칙이 서로 거울상**이며(`validation.ts:3-6` 이 축별로 명시), 두 섹션이 **import 하지 않는다**(grep 양방향 0건). §1 에 비교표로 기록
- [x] **'이 화면은 발송하지 않는다'를 코드로 확인**하고 §1 에 못박았다(`data-source.ts:4-5,18-20` · `SmsTemplateFormPage.tsx:129`)
- [x] **바이트 규약을 코드 근거로 정확히 기술**했다 — 90/2,000byte · EUC-KR 한글 2byte(`notification.ts:33,306-317`) · **글자수 cap 을 2,000 으로 둔 이유**(`:361-367`) · **90byte 초과는 차단이 아니라 승격**(EL-026.1 · `sms-templates.test.ts:50-52`)
- [x] 보이지 않는 요소(live region · 스켈레톤 · 3분기 빈 상태 · 실패 배너 · URL 동기화 · 선택 해제 · 정렬 · IME 커밋 · **유형/한도 판정** · 변수 삽입 · 검증 · 충돌 · 이탈 가드 · abort · 제출 락/멱등키)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. **심이 없는 3건(트리거·변수 카탈로그 · 바이트 규약 · 참조 규칙 수)을 '없음'으로 명시**했다
- [x] **409 를 '존재 여부 기반'으로 정확히 기술**했다 — `version`/`ETag` 가 아니며 동시 편집은 last-write-wins 임을 EL-032 와 §7 #26 에 분리해 적었다
- [x] **실재 결함을 기록했다** — **`a5c2639` 기준으로 '삭제가 조용히 깨뜨린다'는 해소됐다**(`store.ts:95-101` · 회귀 `store.test.ts:70-78`); 남은 **삭제 전 경고 부재**와 **409 문구를 화면이 버림**(신규 발현)만 §7 #2 에 적었다 · `AD_WORDS` 의 '이벤트' 오탐(§7 #13) · **바이트를 행마다 2번 센다**(§7 #19) · **미리보기가 치환 후 바이트를 안 보여준다**(§7 #14) · **변수 삽입이 경고 없이 LMS 승격을 일으킨다**(§7 #12)
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-066 영역)

## 7. 미결 사항 (A11 / A01 / A63 / A40 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (알림 관리 SCR 미작성) | A11 / A01 |
| 2 | **⚠ `a5c2639` 기준으로 뒤집혔다 — 삭제는 더 이상 조용히 깨뜨리지 않는다.** `_shared/store.ts:82-103` 의 `remove` 가 `rulesUsingTemplate(id)`(`:403-405`)를 **호출해** 참조 규칙이 있으면 `HttpError(409, '발송 규칙 N건이 이 템플릿을 쓰고 있어 삭제할 수 없습니다. 규칙에서 먼저 템플릿을 바꾸세요.')` 를 던진다. **이 화면의 사례가 그 수정의 명시적 동기였다** — 주석 `:86-90` 이 '인증번호 템플릿(`ntf-sms-4`)을 지우면 … **로그인이 막힌다**'를 근거로 들고, 회귀 테스트의 첫 항목이 `store.test.ts:70-78` **'인증번호 SMS 템플릿은 지워지지 않는다 — 지우면 로그인이 막힌다'** 다(던진 뒤 잔존까지 단언 — `:77`). **남은 결함 2건**: ① **삭제 *전* 경고 부재** — 다이얼로그(EL-012)는 여전히 `rulesUsingTemplate` 을 부르지 않아 운영자가 확인을 누른 **뒤에야** 안다 ② **★ 신규 발현 — 409 문구를 화면이 버린다.** `useCrudList.tsx:112` 가 status 를 분기하지 않고 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 고정을 보인다 — **영원히 실패할 일에 재시도를 권한다.** 삭제가 막히기 시작하면서 비로소 관측 가능해진 결함 | A11 change_request · A63 (BE-066 §7.3) |
| 3 | **페이지네이션이 없다** — 전량 렌더(quality-bar IA-04 P0). **FS-064 와 달리 상한이 없다.** `SeqCell` 이 `index + 1`(COMP-07 P2). **이 화면은 행마다 `byteLengthOf` 를 2회 도는 열이 있어**(EL-008.7·008.8) 건수 증가 비용이 형제 중 가장 크다 | A11 · A41 change_request |
| 4 | **검색이 본문을 보지 않는다** — `searchTemplates`(`notification.ts:480-491`)가 템플릿명·이벤트명만 훑는다. SMS 는 제목이 없어 **본문이 유일한 내용 축**인데 그것으로 찾을 수 없다. 목록이 본문 미리보기 열을 보여주면서(EL-008.6) 그 값으로 검색은 안 되는 비대칭 | A11 change_request |
| 5 | 목록의 본문 열(EL-008.6)이 **치환 전 원문**이라 `#{주문번호}` 가 그대로 보인다 — 50자 미리보기의 상당 부분을 토큰이 차지한다. 미리보기(EL-029)는 폼에만 있다 | A11 change_request |
| 6 | 수정일시(EL-008.9)가 `formatDateTime` 을 거치나 **브라우저 로컬 타임존 기준**이다(quality-bar ERP-09 P2) | A40 (`shared/format` 소관) |
| 7 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`)다(quality-bar COMP-06 P2) | A41 (공용 `CrudTable` 소관) |
| 8 | **바이트순·유형순 정렬이 없다**(EL-016) — 비용 축(LMS 는 단가가 오른다)인데 정렬할 수 없다. 좌측 필터도 이벤트 분류뿐이라 **'LMS 인 것만 보기'가 불가능**하다. 목록이 그 정보를 열로 강조하면서 그것으로 좁힐 수단을 주지 않는다(quality-bar ERP-04 P1) | A11 change_request |
| 9 | 이탈 가드(EL-033)가 **`navigate()` 프로그램 이동을 가로채지 못한다** — '목록으로'(EL-017)·'취소'(EL-031)를 누르면 미저장 입력이 조용히 사라진다 | A11 change_request |
| 10 | **폼 화면에 `<h1>` 이 2개다** — AppHeader 가 `findCoveringLeaf` 로 'SMS 템플릿'을 그리고(`AppHeader.tsx:92,101`) `FormPageShell.tsx:160` 이 'SMS 템플릿 등록'을 또 그린다. `nav-config.ts:294-296` 이 밝히듯 **'등록/수정' 행위는 제목에 넣지 않는 것이 의도**다(quality-bar IA-02 P0). **목록은 pass** — gap 은 `/new`·`/:id/edit` 에서만 | A40 · A11 |
| 11 | **'초과'와 '승격'의 표현이 겹친다**(EL-026·EL-026.1) — 90byte 를 넘으면 `kind` 가 `'lms'` 로 바뀌어 `limit` 이 2,000 이 되므로 **`overLimit` 이 false 다.** 즉 카운터가 '95 / 2,000 byte'로 바뀌며 **한도가 갑자기 22배로 늘어난 것처럼 보인다.** 운영자는 '90byte 를 넘었다'는 사실을 배지 색(neutral→warning)과 안내 문구로만 읽는다 — **숫자가 그 경계를 말해 주지 않는다** | A11 change_request |
| 12 | **변수 삽입(EL-027.1)이 경고 없이 LMS 승격을 일으킨다** — `#{송장번호}` 는 14byte 다. 88byte 본문에서 칩 한 번이 102byte(LMS)가 되며 **건당 단가가 오른다.** 칩에는 그 변수의 바이트도, 삽입 후 결과도 표시되지 않는다. 게다가 **삽입은 토큰 길이지 치환값 길이가 아니다** — 실제 발송 시 `#{송장번호}`(14byte)가 '123456789012'(12byte)로 바뀌어 **오히려 줄어든다.** 카운터가 원문 기준이라 **실제 발송 바이트를 알 수 없다**(#14 와 같은 뿌리) | A11 change_request |
| 13 | **광고성 문구 감지(EL-028·EL-030 ③)가 단순 `includes` 라 오탐이 있다** — `AD_WORDS` 에 **'이벤트'** 가 있어(`notification.ts:292`) '이벤트가 발생하면…' 같은 **정상 트랜잭션 문구가 저장을 막힌다.** **우회 수단이 없다 — 경고가 아니라 차단이다.** 미탐도 자명하다('할 인'·'쿠-폰') | A11 change_request · A01 (낱말 목록 소유) |
| 14 | **미리보기(EL-029)가 치환 후 바이트를 보여주지 않는다 — 이 화면의 핵심 결함.** 카운터(EL-026)는 **원문 기준**(`#{이름}` = 8byte)이고 미리보기는 **치환 결과**('홍길동' = 6byte)인데 **둘이 만나지 않는다.** 실제 발송 문구가 90byte 를 넘는지(= 비용이 오르는지) 화면 어디에서도 알 수 없다. 변수가 많은 문구일수록 오차가 커진다 — `#{주문번호}`(12byte) → '20260716-0001'(13byte)처럼 늘어날 수도 있다. **바이트가 이 화면의 존재 이유인데 그 숫자가 실제 발송을 대변하지 않는다** | A11 change_request (우선) |
| 15 | **쓰기 권한 게이팅이 배선돼 있지 않다** — `useRouteWritePermissions` 소비처 8곳에 알림 관리가 없다(grep). read 전용 역할도 등록·수정·삭제를 보고 누른다(quality-bar EXC-03 P0). 마케팅 링크(EL-001.1)도 대상 권한을 묻지 않는다 | A11 change_request |
| 16 | **열이 9개(선택·순번·이벤트·템플릿명·본문·유형·바이트·수정일시·액션)로 형제 중 가장 많다** — `listLayoutStyle` 이 좌측 필터에 `calc(var(--tds-space-6) * 8)` 을 고정으로 주고 목록에 `minmax(0, 1fr)` 을 준다(`_shared/styles.ts:22`). **가로 scroll 컨테이너가 없어** 좁은 화면에서 셀이 접힌다(quality-bar IA-14 P1 · ERP-15 P1) | A11 · A41 change_request |
| 17 | 트리거 목록이 **코드 상수**(`notification.ts:77-88`)다. 서버가 새 이벤트를 추가하면 배지가 id 폴백으로 떨어지고(EL-008.4) 정렬 rank 가 `?? 0` 이라 맨 앞에 온다(EL-016). **변수 카탈로그도 같다**(`:207-251`). **바이트 규약(EUC-KR · 90/2,000)도 코드 상수다**(`:33,306-307`) — **서버 발송사와 어긋나면 저장은 되고 발송이 거절된다.** 소유자 미정 | A01 (도메인 경계) · A63 (BE-066 §7.2·§7.6) |
| 18 | 템플릿명 열(EL-008.5)에 truncate 가 없다 — **`ellipsisCellStyle` 이 있고 본문 열은 쓰는데**(EL-008.6) 이름 열만 안 쓴다(quality-bar COMP-09 P2) | A11 change_request |
| 19 | **바이트를 행마다 2번 센다** — 유형 열이 `classifySms(byteLengthOf(item.body))`(`SmsTemplateListPage.tsx:56`), 바이트 열이 `byteLengthOf(item.body)`(`:67`)를 **각각** 호출한다. 같은 값이고 `COLUMNS` 가 모듈 상수라 메모이즈할 자리가 없다. 2,000자 × 1,000행이면 **400만 자 순회**다(#3 과 같은 뿌리) | A11 change_request (경미) |
| 20 | **status 별 surface 가 갈리지 않는다** — 목록 실패(EL-011)가 403·429·500·504 를, 저장 실패(EL-020)가 403·429·500 을 한 문구로 뭉갠다(quality-bar EXC-06 P1). **404 만 갈린다**(EL-022) | A11 change_request |
| 21 | 일괄 삭제(EL-013)에서 **abort 가 실패 수에서 제외되지 않는다** — `settleAll` 이 거절 수만 센다(quality-bar EXC-09 P0 의 마지막 절) | A41 (공용 `shared/bulk` 소관) |
| 22 | 폼 상세 조회 실패(EL-022) 시 **배너가 화면 전체를 대체**해 제목·'목록으로'·설명이 사라진다 | A41 (공용 `FormPageShell` 소관) |
| 23 | 상세 도착 시 `reset(toValues(loaded))`(`useCrudForm.ts:131-134`)가 **편집 중 재조회에서도 돈다** — 409 후 '최신 다시 불러오기'는 의도된 동작이나, 그 밖의 재조회가 오면 입력이 덮인다 | A41 (공용 `useCrudForm` 소관) |
| 24 | **템플릿명(EL-023)에 카운터가 없다** — `maxLength=60` 이 조용히 입력을 멈춘다. 본문은 카운터가 **두 개**(글자수 + 바이트)인데 이름만 없다(quality-bar COMP-12 P2) | A11 change_request |
| 25 | **트리거를 바꿔도 본문의 변수가 자동 정리되지 않는다**(EL-024) — '배송 출발'에서 '주문 접수'로 바꾸면 `#{송장번호}` 가 남아 저장 시 오류가 난다. FS-064 의 템플릿 select 는 후보에 없는 값을 **자동으로 비우는데**(`RuleFormPage.tsx:131-135`) 여기엔 그 대칭이 없다 | A11 change_request |
| 26 | **낙관적 동시성 토큰이 없다.** 어댑터의 409(EL-032)는 **'대상이 아직 있는가'** 만 본다(`crud.ts:219-221`) — `SmsTemplate.updatedAt`(`notification.ts:387`)이 목록에 **표시까지 되는데**(EL-008.9) `If-Match`/`version` 으로 실리지 않는다. **유령 저장은 해소됐으나 둘 다 존재하는 동시 편집은 여전히 last-write-wins**(quality-bar EXC-04 P0) | A63 (BE-066 §7.1) · A11 |
| 27 | 이탈 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다 | A63 (BE-066) |
| 28 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` grep 0건) · 오프라인 감지 없음(`navigator.onLine` grep 0건) · 세션 만료 리다이렉트가 폼의 미저장 입력을 버린다 | A11 · A40 (quality-bar EXC-05 · EXC-11 · EXC-19 P1) |
</content>
