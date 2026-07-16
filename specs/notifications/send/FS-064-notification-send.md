---
id: FS-064
title: "알림 발송 (이벤트별 자동 발송 규칙)"
screen: SCR-064               # ⚠ 알림 관리 SCR 미작성 — §7 미결 사항 참조
route: /notifications/send
owner: A62
reviewer: A64
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-064. 알림 발송 (이벤트별 자동 발송 규칙)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | '이 이벤트가 발생하면 이 템플릿을 이 채널로 자동 발송한다'는 **발송 규칙**을 등록·수정·삭제하고, 규칙별 자동 발송 스위치를 켜고 끈다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — §4.1) |
| 진입 경로 | 좌측 GNB > 알림 관리 > 알림 발송 (`/notifications/send`) — `nav-config.ts:215` |
| 포함 화면 | 목록 `/notifications/send` · 등록 `/notifications/send/new` · 수정 `/notifications/send/:id/edit` (`App.tsx:292-294`) |
| **⚠ 화면 이름과 실제 동작의 괴리** | **이 화면은 아무것도 발송하지 않는다.** 화면 이름이 '알림 발송'이지만 발송 버튼·예약 시각·수신자 선택이 없다. 발송 주체는 이벤트를 받은 **서버**다 — 화면은 서버가 따를 규칙을 정의할 뿐이다. 근거: `RuleListPage.tsx:4-8` ('이 화면은 아무것도 보내지 않는다… 이벤트가 나면 시스템이 자동으로 보낼 규칙을 관리한다') · `data-source.ts:5-7` ('이 화면은 무엇을 언제 보낼지를 **정의**할 뿐 보내지 않는다… 여기엔 마케팅의 POST /api/.../send 같은 발송 트리거가 없다') · `RuleFormPage.tsx:144` 폼 설명 문구 '이 화면에서 직접 발송하지는 않습니다.'. 따라서 **비가역 발송 액션이 이 화면에 존재하지 않는다**(NFR-064 FEEDBACK-02 판정의 근거) |
| **범위 밖** | **실 발송·발송 이력·발송 통계** — 서버 몫이다(`data-source.ts:14-17` TODO 주석이 '발송은 서버 몫이다'로 못박는다). **세그먼트·예약 시각·(광고) 표기·야간 제한·수신거부·알림톡 승인** — 마케팅 관리 소관이다(§1 아래 표) |
| 구현 경로 | `apps/admin/src/pages/notifications/send/**` · 공용 도메인 `apps/admin/src/pages/notifications/_shared/**` |
| 대응 SCR | SCR-064 (미작성 — §7 #1) |
| 공통 컴포넌트 | `shared/crud/{useCrudList,useCrudForm,useCrudRowUpdate,useListState,CrudListShell,CrudTable,FormPageShell,createStoreAdapter,requiredText}` · `shared/ui/{FilterPanel,SearchField,Button,SelectField,FormField,ToggleSwitch,StatusBadge,Alert,ConfirmDialog,PlusCircleIcon,hintStyle,errorIdOf,hintIdOf,useToast,useUnsavedChangesDialog}` · `shared/format/{formatNumber,objectParticle}` · 섹션 공용 `_shared/{TransactionalNotice,triggerColumn,useInitialFocus,styles,notification,store}` |

> **트랜잭션(정보성) 알림이 이 섹션의 성격이다 — 마케팅 관리와 법적으로 다르다.**
> 정본은 `_shared/notification.ts:3-34` 의 헤더 주석이다. 그 표를 그대로 옮긴다:
>
> | 축 | 마케팅 관리(캠페인) | 알림 관리(트랜잭션) |
> |---|---|---|
> | 발송 주체 | 운영자가 직접 발송 | 이벤트 트리거로 시스템이 자동 발송 |
> | 수신자 | 세그먼트(그룹) 선택 | 이벤트 당사자 1명(선택 불가) |
> | 시점 | 예약 시각(운영자 지정) | 이벤트 발생 즉시 |
> | 수명주기 | 초안→예약→발송중→발송완료→취소 | 규칙 ON/OFF(상시 대기) + 실패 시 재시도 |
> | 법적 성격 | 광고성 정보(원칙) | 정보성 정보(원칙) |
> | 운영 단위 | 캠페인 1건 | 트리거→템플릿 발송 규칙 1건 |
>
> **법적 근거(코드가 명시한 것만 적는다)**: `notification.ts:23-32` · `TransactionalNotice.tsx:8-10` — 정보통신망법 제50조는 **영리 목적의 광고성 정보에만** 적용되므로 주문·배송·계정·보안 알림에는 ① (광고) 표기 의무 없음(제50조 제4항) ② 야간(21:00~08:00) 전송 제한 없음(제50조 제3항 — '인증번호·보안 알림은 새벽에도 보내야 한다') ③ 수신거부 의무 없음('수신거부한 회원에게도 거래 정보는 발송한다')이 **적용되지 않는다**. 그래서 이 도메인엔 야간 차단·(광고) 표기 검사·수신거부 문구 검사가 **없다**. 단 **정보성으로 위장한 광고는 위법**이므로(방통위 '영리목적 광고성 정보 전송 가이드라인' — `notification.ts:30-32`) 광고성 낱말 감지가 저장을 막는다 — 그 검사는 **템플릿 폼**(FS-065·FS-066)이 갖고 이 화면엔 없다(이 화면은 문구를 편집하지 않는다).
>
> **두 섹션은 서로를 import 하지 않는다** — 라우트 링크로만 가리킨다(`VariableInsertBar.tsx:6` · `notification.ts:19-21`: 'pages/A → pages/B 결합은 code-quality 축1 blocker'). grep 확인: `pages/notifications` → `pages/marketing` import 0건 · 역방향 0건. 이 화면이 마케팅을 가리키는 유일한 지점은 FS-064-EL-001.1 의 `<Link to="/marketing/templates">` 다.

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-064-SEC-01 | 트랜잭션 안내 배너 | 목록 최상단 info `Alert` + 마케팅 관리 링크. 세 화면이 같은 문구 골격을 공유 |
| FS-064-SEC-02 | 좌측 이벤트 분류 필터 | '전체' + 주문·배송·계정·보안 토글 + 건수 배지 |
| FS-064-SEC-03 | 목록 툴바 | 검색 + 켜짐 건수 힌트(좌) · '발송 규칙 등록' primary 버튼(우) |
| FS-064-SEC-04 | 목록 상태 요약 | 지속 live region + 건수/새로고침/선택 요약 |
| FS-064-SEC-05 | 선택 일괄 삭제 바(비표시 기본) | 선택 1건 이상일 때만 |
| FS-064-SEC-06 | 규칙 표 | 선택·순번·이벤트·채널·템플릿·실패 시·자동 발송·행 액션. **페이지네이션 없음** |
| FS-064-SEC-07 | 목록 로딩·빈 상태·조회 실패(비표시 기본) | 스켈레톤 / `Empty` 3분기 / danger `Alert` |
| FS-064-SEC-08 | 삭제 확인 다이얼로그(비표시 기본) | 단건 · 일괄 |
| FS-064-SEC-09 | 폼 헤더 | '목록으로' + `<h1>` + 설명 |
| FS-064-SEC-10 | 폼 카드 '규칙 내용' | 이벤트·채널·템플릿·재시도·자동 발송 + 취소/저장 |
| FS-064-SEC-11 | 폼 로딩·조회 실패(비표시 기본) | 스켈레톤 4줄 / 404·5xx 분기 배너 |
| FS-064-SEC-12 | 폼 충돌·미저장 가드(비표시 기본) | 409 충돌 다이얼로그 · 이탈 가드 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-064-EL-001 | FS-064-SEC-01 | 트랜잭션 안내 배너 | 배너 | info 톤 `Alert`(`TransactionalNotice.tsx:23`). 문구 = 화면별 한 줄(`RuleListPage.tsx:181` '이벤트별 자동 발송 규칙을 관리합니다. 이 화면에서 직접 발송하지는 않습니다.') + 공통 문구 '이벤트가 발생하면 시스템이 당사자에게 자동 발송하는 정보성 알림이라 (광고) 표기·야간 발송 제한·수신거부가 적용되지 않습니다. 할인·쿠폰 같은 광고성 발송은 마케팅 관리에서 합니다.'(`TransactionalNotice.tsx:26-28`) | — | 항상 표시. 닫기 없음 — 역할 경계는 상시 사실이다 |
| FS-064-EL-001.1 | FS-064-SEC-01 | '마케팅 관리로 이동' 링크 | 버튼 | `<Link to="/marketing/templates">` + `tds-ui-link tds-ui-focusable`(`TransactionalNotice.tsx:30-32`) | — | **두 섹션을 잇는 유일한 지점**(import 아님 — §1). `RuleListPage.test.tsx:47-48` 이 href 를 단언 |
| FS-064-EL-002 | FS-064-SEC-02 | 이벤트 분류 필터 | 입력 | 공유 `FilterPanel`(`RuleListPage.tsx:185-192`). `<nav aria-label="이벤트 분류 필터">` + `<h2>이벤트 분류</h2>` + 항목 5개(`NOTIFICATION_CATEGORY_OPTIONS` = '전체' + 주문·배송·계정·보안 — `notification.ts:424-427`) | — | 값은 **URL 쿼리 `cat`**(`CATEGORY_PARAM` — `notification.ts:421`). 세 목록이 같은 키를 써야 링크가 한 뜻을 갖는다 |
| FS-064-EL-002.1 | FS-064-SEC-02 | 필터 항목 버튼 | 버튼 | `<button aria-pressed={active}>`(`FilterPanel.tsx:65`). 클릭 시 `list.setFilter('cat', next)`. **`aria-current` 를 쓰지 않는다** — 토글 필터이지 현재 위치가 아니다(`FilterPanel.tsx:14-16`) | — | `RuleListPage.test.tsx:61-69` 가 aria-pressed=true/false 와 aria-current 부재를 단언 |
| FS-064-EL-002.2 | FS-064-SEC-02 | 분류별 건수 배지 | 텍스트 | `countByCategory(controller.items)`(`notification.ts:460-468`) — **필터·검색 적용 전 전량 기준**. `formatNumber` 경유 | — | '전체'는 전량 건수. 0건인 분류도 배지 0 을 보인다 |
| FS-064-EL-003 | FS-064-SEC-03 | 검색 입력 | 입력 | `SearchField`, 접근 이름 '이벤트·템플릿 검색', placeholder '이벤트 · 템플릿 검색'(`RuleListPage.tsx:162-168`). 값은 `list.searchInput`, 핸들러는 `{...list.searchInputProps}` 스프레드 | — | 커밋된 값은 **URL 쿼리 `q`**. 클라이언트 필터(`searchRules`) — 서버 재조회 없음 |
| FS-064-EL-003.1 | FS-064-SEC-03 | IME 조합·디바운스 커밋 규칙 | 텍스트 | 비표시. `useListState` → `useDebouncedSearch`(`useListState.ts:24,227-230`): ① 조합 중(`composing`)엔 커밋하지 않는다(`useDebouncedSearch.ts:87`) ② 조합 종료 후 **250ms** 잠잠하면 커밋(`:23,93-95`) ③ 조합 중 Enter 는 `stopPropagation` 으로 삼킨다 — `nativeEvent.isComposing` **과** 자체 관측 `composingRef` 를 함께 본다(`:121-124`) ④ 조합 아닌 Enter 는 즉시 커밋(`:126-129`) ⑤ 늦게 온 이전 응답이 최신을 덮지 않는 것은 TanStack Query 의 쿼리 키가 보장한다(`:14-18`) | — | **quality-bar COMP-10 의 세 절이 전부 이 훅에 있다.** 화면은 핸들러를 스프레드만 한다 |
| FS-064-EL-004 | FS-064-SEC-03 | 켜짐 건수 힌트 | 텍스트 | `켜짐 N건`(`RuleListPage.tsx:169`). N = `countEnabled(visibleItems)`(`notification.ts:520-522`) — **필터·검색을 적용한 뒤**의 켜진 규칙 수 | — | 전체 켜짐 수가 아니다. 필터를 좁히면 값이 함께 줄어든다(§7 #2) |
| FS-064-EL-005 | FS-064-SEC-03 | '발송 규칙 등록' 버튼 | 버튼 | DS `<Button variant="primary" size="md">` + `PlusCircleIcon`(`RuleListPage.tsx:171-174`). 클릭 시 `/notifications/send/new` 이동 | — | 툴바 우상단(IA-04). 빈 상태에도 같은 버튼이 CTA 로 들어간다(FS-064-EL-011) |
| FS-064-EL-006 | FS-064-SEC-04 | 목록 상태 live region | 텍스트 | 비표시(시각). **항상 마운트된** `aria-live="polite" aria-atomic="true"`(`CrudListShell.tsx:107-109`). 문구(`:72-82`): 최초 로드 중 침묵 · 실패 시 '발송 규칙 목록을 불러오지 못했습니다.' · 0건 '조건에 맞는 발송 규칙 결과가 없습니다.' · 그 외 '발송 규칙 N건을 찾았습니다.' | — | 내용과 함께 생성되는 region 은 AT 가 신뢰성 있게 읽지 않아 **껍데기가 지속 region 을 소유**한다(`:99-106`) |
| FS-064-EL-007 | FS-064-SEC-04 | 조회 요약 텍스트 | 텍스트 | `firstLoading` 이면 '불러오는 중…', 아니면 `전체 N건`. `refreshing` 이면 ` · 새로고침 중…` 덧붙임. 선택 1건 이상이면 ` · N건 선택됨`. `aria-busy={refreshing}`(`CrudListShell.tsx:118-122`) | — | **재조회 중에도 건수가 살아 있다** — STATE-01/03 의 핵심 |
| FS-064-EL-008 | FS-064-SEC-05 | 선택 일괄 삭제 바 | 배너 | `SelectionBar count={selectedCount}`(`CrudListShell.tsx:125-133`). 선택 0건이면 렌더되지 않는다 | — | 비표시 기본 |
| FS-064-EL-008.1 | FS-064-SEC-05 | '선택 N건 삭제' 버튼 | 버튼 | `<Button variant="danger">`(`CrudListShell.tsx:126-132`). 삭제 진행 중이면 비활성. 클릭 시 일괄 삭제 다이얼로그(FS-064-EL-014) | O | — |
| FS-064-EL-009 | FS-064-SEC-06 | 규칙 표 | 표 | 공유 `CrudTable`(`CrudListShell.tsx:135`). `aria-busy={firstLoading}`. caption(스크린리더 전용) '발송 규칙 목록 — 행을 누르면 해당 항목으로 이동합니다. 체크박스·수정·삭제 버튼은 각자의 동작을 수행합니다.'(`CrudTable.tsx:117-120`). **전량을 한 화면에 렌더한다 — 페이지네이션이 없다**(§7 #3) | O | 정렬은 FS-064-EL-017 |
| FS-064-EL-009.1 | FS-064-SEC-06 | 전체 선택 헤더 체크박스 | 입력 | `SelectAllHeaderCell`, 라벨 '이 페이지의 발송 규칙 전체 선택'(`CrudTable.tsx:124-129`). **보이는 행(visibleItems) 전체**를 토글한다(`CrudListShell.tsx:143-148`) | — | 페이지네이션이 없어 '이 페이지' = 필터 결과 전량이다 |
| FS-064-EL-009.2 | FS-064-SEC-06 | 행 선택 체크박스 | 입력 | `RowSelectCell`, 라벨 `'<이벤트명> <채널명> 선택'`(`CrudTable.tsx:173-178` · 이름은 `nameOf` — `RuleListPage.tsx:56-57`) | — | **규칙엔 이름이 없다** — 이름 자리를 '이벤트 + 채널'이 대신한다(`:55`) |
| FS-064-EL-009.3 | FS-064-SEC-06 | 순번 셀 | 텍스트 | `SeqCell seq={index + 1}`(`CrudTable.tsx:179`) | — | 페이지네이션이 없어 현재는 전역 순번과 어긋나지 않는다. 도입 시 `startIndex + index + 1` 로 바뀌어야 한다(§7 #3) |
| FS-064-EL-009.4 | FS-064-SEC-06 | 이벤트 열 | 배지 | 섹션 공용 `triggerColumn()`(`triggerColumn.tsx:16-29`). `StatusBadge` 라벨=`triggerLabel` · 톤=분류(`TRIGGER_CATEGORY_TONE` — 주문=info · 배송=success · 계정=neutral · 보안=warning, `notification.ts:65-70`). **모르는 트리거면 배지 대신 id 를 글자로**(`triggerColumn.tsx:22-25`) | — | **첫 열이 '이벤트'인 것이 이 섹션을 마케팅과 가르는 축**(`triggerColumn.tsx:3-5`). 색만으로 정보를 전달하지 않는다 — 분류=색, 이벤트명=글자(`:15`) |
| FS-064-EL-009.5 | FS-064-SEC-06 | 채널 열 | 배지 | `StatusBadge tone="neutral"` 라벨 `notificationChannelLabel`(이메일/SMS — `RuleListPage.tsx:121-123`) | — | **알림톡이 없다** — 승인 개념 자체가 캠페인 규제의 산물이다(`notification.ts:176-179`) |
| FS-064-EL-009.6 | FS-064-SEC-06 | 템플릿 열 | 텍스트 | `templateNameOf(rule.channel, rule.templateId)`(`store.ts:377-380`). 이름이 있으면 글자, **빈 문자열이면 `StatusBadge tone="danger"` '템플릿 없음 — 발송되지 않습니다'**(`RuleListPage.tsx:127-135`) | O | 연결된 템플릿이 지워지면 이벤트가 나도 보낼 문구가 없다 — **조용히 실패하지 않도록 드러낸다**(`:129`) |
| FS-064-EL-009.7 | FS-064-SEC-06 | '실패 시' 열 | 텍스트 | `retryPolicyLabel`(재시도 안 함 / 1회 재시도 / 3회 재시도 — `notification.ts:343-349`). `numericMutedStyle` | — | **마케팅엔 없는 축**이다 — '캠페인은 실패하면 다음 캠페인이 있지만, 거래 알림은 반드시 도달해야 한다'(`notification.ts:334-337`) |
| FS-064-EL-009.8 | FS-064-SEC-06 | '자동 발송' 토글 | 입력 | DS `ToggleSwitch`(`RuleListPage.tsx:146-153`). `role="switch"` + `aria-checked` + `aria-label='<이벤트명> <채널명> 자동 발송 여부'` + `aria-busy`(`ToggleSwitch.tsx:24-31`). ON/OFF 문구('켜짐'/'꺼짐')로 상태를 **색과 글자로 이중 전달**. 갱신 중이면 `busy` → `disabled` | O | **운영의 핵심 스위치** — 끄면 그 이벤트에 알림이 안 나간다(점검·장애 대응 중 실제로 쓴다 — `RuleListPage.tsx:7-8`). 확인 다이얼로그 없이 즉시 저장(§7 #4) |
| FS-064-EL-009.9 | FS-064-SEC-06 | 행 액션(수정·삭제) | 버튼 | `RowActions`(`CrudTable.tsx:192-197`), 라벨 기준 = `nameOf`. 삭제 진행 중인 행은 비활성 | O | 수정 → `/notifications/send/<id>/edit`(`RuleListPage.tsx:215`) |
| FS-064-EL-009.10 | FS-064-SEC-06 | 행 전체 클릭 이동 | 텍스트 | 비표시 규칙. `rowActivateProps(() => onEdit(item))`(`CrudTable.tsx:172`) — 행 빈 영역 클릭 시 수정 화면으로. 행 안의 버튼·체크박스·토글은 자기 동작만 | — | 키보드 등가물은 FS-064-EL-009.9 의 '수정' 버튼이다 |
| FS-064-EL-010 | FS-064-SEC-07 | 목록 로딩 스켈레톤 | 스켈레톤 | 비표시. `loading={firstLoading}` 일 때만 표 본문을 **5행 고정**(`length: 5`) × `columns.length + 3` 셀 스켈레톤으로 대체(`CrudTable.tsx:143-152`) | — | **조건이 `firstLoading` 이라 데이터가 있는 재조회에서는 행을 덮지 않는다**(`useCrudList.tsx:71`). 행 수 하드코딩은 §7 #5 |
| FS-064-EL-011 | FS-064-SEC-07 | 빈 상태 | 빈상태 | 비표시. 조회 완료·0건이면 공유 `Empty`(`CrudTable.tsx:157-167`)가 **3분기**한다(`RuleListPage.tsx:202-213` 이 맥락을 준다): ① 검색 0건(`hasQuery`) → '검색 지우기' ② 필터 0건(`hasActiveFilters`) → '필터 초기화' ③ 진짜 0건 → '발송 규칙 등록' CTA | — | **조사(이/가)는 `Empty` 가 고른다** — 호출부는 맥락만 준다(`RuleListPage.tsx:194` · `CrudTable.tsx:156`) |
| FS-064-EL-012 | FS-064-SEC-07 | 목록 조회 실패 배너 | 배너 | 비표시. 조회 실패 시 요약·표 대신 danger `Alert` '발송 규칙 목록을 불러오지 못했습니다.' + '다시 시도'(`refetch`)(`CrudListShell.tsx:157-164`). 자동 소멸하지 않는다 | O | **툴바·필터는 남는다** — 배너가 대체하는 것은 요약+표뿐이다(`:113-165`) |
| FS-064-EL-013 | FS-064-SEC-08 | 단건 삭제 확인 다이얼로그 | 모달 | 비표시. `ConfirmDialog intent="delete"` 제목 '발송 규칙 삭제', 문구 `'<이벤트명> <채널명>'{조사} 삭제합니다. 이 작업은 되돌릴 수 없습니다.`(`useCrudList.tsx:154-165`). 확인 중 `busy` → 확인 버튼 비활성 + `aria-busy` + 라벨 '처리 중…'(`ConfirmDialog.tsx:151-155`). 실패 시 다이얼로그를 **열어 둔 채** error 배너 | O | 취소/닫기는 진행 중 요청을 abort 한다(`useCrudList.tsx:87-88`) |
| FS-064-EL-014 | FS-064-SEC-08 | 일괄 삭제 확인 다이얼로그 | 모달 | 비표시. 문구 '선택한 발송 규칙 N건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'(`useCrudList.tsx:166-177`). 부분 실패면 'N건 중 M건을 삭제하지 못했습니다…' 를 다이얼로그 안에 남긴다(`:138-142`) | O | — |
| FS-064-EL-015 | — | URL 조회 상태 동기화 규칙 | 텍스트 | 비표시. `useListState({ filterDefaults: { cat: 'all' } })`(`RuleListPage.tsx:70`). 분류=`cat` · 검색어=`q`. 기본값과 같은 값은 URL 에서 **지운다**(`useListState.ts:115-117`). 갱신은 `{ replace: true }`(`:125`) — 검색어 한 줄에 history 를 쌓지 않는다. 모르는 `cat` 값은 `parseCategoryFilter` 가 '전체'로 되돌린다(`notification.ts:436-439`) | — | **이 화면에 `page`·`sort` 파라미터는 쓰이지 않는다** — 페이지네이션·정렬 UI 가 없다 |
| FS-064-EL-016 | — | 필터·검색 변경 시 선택 해제 규칙 | 텍스트 | 비표시. `useEffect(() => { clear(); }, [category, keyword, clear])`(`RuleListPage.tsx:88-90`). `useListState` 도 view 서명이 바뀌면 선택을 지운다(`useListState.ts:205-213`) | — | 보이지 않는 행이 선택된 채 남아 '선택 N건 삭제'가 화면에 없는 행을 지우는 것을 막는다(STATE-04-b) |
| FS-064-EL-017 | — | 목록 정렬 규칙 | 텍스트 | 비표시. `sortRules`(`notification.ts:496-502`) — **트리거 정의 순서**(주문→배송→계정→보안), 같으면 채널 문자열 오름차순(email→sms). 저장소가 이미 정렬해 돌려준다(`store.ts:339-341`) | — | 정렬 변경 UI 없음. 운영자가 이벤트 흐름대로 읽게 한 의도(`notification.ts:470`) |
| FS-064-EL-018 | — | 토글 결과 토스트 | 토스트 | 성공: `'<이벤트명> <채널명> 알림을 켰습니다. 이제 이 이벤트가 나면 자동 발송합니다.'` / `'… 알림을 껐습니다. 이 이벤트에는 알림이 나가지 않습니다.'`. 실패: `'… 알림 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.'`(`RuleListPage.tsx:108-112` · 배선은 `useCrudRowUpdate.ts:49,53`) | — | **ERP-13** — `objectParticle('알림')` 이 조사를 받침으로 고른다. 주석이 못박는다: '조사를 앞 낱말의 받침에 맞춰 고른다. 리터럴 을(를) 을 내지 않는다'(`RuleListPage.tsx:107`) |
| FS-064-EL-019 | FS-064-SEC-09 | 폼 '목록으로' 버튼 | 버튼 | 좌상단. `ChevronLeftIcon` + '목록으로'(`FormPageShell.tsx:148-156`). 클릭 시 `/notifications/send` | — | 이탈 가드(FS-064-EL-037)가 `navigate()` 프로그램 이동을 가로채는지는 §7 #6 |
| FS-064-EL-020 | FS-064-SEC-09 | 폼 제목 | 텍스트 | `<h1 style={pageTitleStyle}>{isEdit ? '발송 규칙 수정' : '발송 규칙 등록'}</h1>`(`FormPageShell.tsx:160`) | — | **AppHeader 도 `<h1>` 을 그린다**(`AppHeader.tsx:101`) — `/notifications/send/new` 에서 `findCoveringLeaf` 가 '알림 발송'을 돌려주므로 **h1 이 2개**다(§7 #7) |
| FS-064-EL-021 | FS-064-SEC-09 | 폼 설명 | 텍스트 | '이벤트가 발생하면 시스템이 당사자에게 자동 발송합니다. 이 화면에서 직접 발송하지는 않습니다.'(`RuleFormPage.tsx:144`) | — | 목록 배너와 같은 사실을 폼에서 다시 말한다 |
| FS-064-EL-022 | FS-064-SEC-10 | 저장 실패 배너 | 배너 | 비표시. `FormServerError`(`FormPageShell.tsx:168`) — 문구 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' + **복사 가능한 참조 코드**(`useCrudForm.ts:194-195` `referenceOf(cause)`) | O | 409 는 여기가 아니라 FS-064-EL-036 이, 422 는 필드 인라인이 받는다 |
| FS-064-EL-023 | FS-064-SEC-11 | 폼 상세 로딩 스켈레톤 | 스켈레톤 | 비표시. 수정 진입 시 카드 본문을 **4줄** 스켈레톤으로 대체 + `aria-busy="true"`(`FormPageShell.tsx:170-175`). 조건 = `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:136`) | — | 등록(`/new`)에는 걸리지 않는다 |
| FS-064-EL-024 | FS-064-SEC-11 | 폼 상세 조회 실패 배너 | 배너 | 비표시. **404 와 5xx 를 가른다**(`FormPageShell.tsx:116-144`): `loadFailure === 'not-found'` → `'발송 규칙을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'` + **'목록으로'만**(재시도해도 영원히 없다 — `:117-121`) · `'error'` → `'발송 규칙을 불러오지 못했습니다.'` + '다시 시도' + '목록으로' | O | 분기 근거는 `createStoreAdapter.fetchOne` 이 없는 id 에 `HttpError(404)` 를 던지는 것(`crud.ts:192-194`) → `isNotFound`(`useCrudForm.ts:144-149`). 조사는 `objectParticle` 이 고른다(`FormPageShell.tsx:129-130`) |
| FS-064-EL-025 | FS-064-SEC-10 | '이벤트' select | 입력 | `FormField htmlFor="rule-trigger" label="이벤트" required`(`RuleFormPage.tsx:158-184`). 선택지 = `NOTIFICATION_TRIGGERS` 10개, 표기 `'<분류> · <이벤트명>'`. **힌트가 선택에 따라 바뀐다** — `'<분류> · <설명>'`(예: '주문 · 회원이 주문을 완료한 직후 발생합니다.') | — | **폼 진입 시 첫 포커스 대상**(A11Y-13) — `useInitialFocus(!loadingDetail)`(`:116`) 의 ref 와 RHF register ref 를 함께 문다(`:173-176`) |
| FS-064-EL-026 | FS-064-SEC-10 | '채널' select | 입력 | `FormField htmlFor="rule-channel" required`, 선택지 이메일·SMS. 힌트 '한 이벤트에 이메일·SMS 규칙을 하나씩 둘 수 있습니다. 같은 채널을 두 번 두면 알림이 두 번 나갑니다.'(`RuleFormPage.tsx:186-208`). 중복 위반 오류가 **이 필드에** 꽂힌다(FS-064-EL-035) | — | `isInvalid` + `aria-describedby` 를 오류/힌트로 배타 전환(`:196-199`) |
| FS-064-EL-027 | FS-064-SEC-10 | '템플릿' select | 입력 | `FormField htmlFor="rule-template" required`. 첫 옵션 '템플릿을 고르세요'(빈 값). 선택지 = `templateOptionsFor(channel, trigger)`(`store.ts:366-374`) — **채널과 트리거가 둘 다 맞는 템플릿만**. 후보 0건이면 비활성(`RuleFormPage.tsx:219`). 힌트 `'<이벤트명>' 이벤트의 <채널명> 템플릿만 고를 수 있습니다.` | O | 트리거가 다른 템플릿을 걸면 **그 이벤트가 주지 않는 변수가 빈칸으로 나간다**(`RuleFormPage.tsx:126-127` · `store.ts:365`). **어댑터를 거치지 않고 store 를 동기 직접 호출**한다 — §5 · §7 #8 |
| FS-064-EL-028 | FS-064-SEC-10 | 템플릿 후보 없음 경고 | 배너 | 후보가 0건일 때만. warning `Alert` `'<이벤트명>' 이벤트의 <채널명> 템플릿이 아직 없습니다. 먼저 템플릿을 등록해 주세요.` + `<Link>` `'<채널명> 템플릿 등록'` → `/notifications/{email,sms}-templates/new`(`RuleFormPage.tsx:236-247`) | — | **막다른 길에 두지 않는다**(`:235`) |
| FS-064-EL-029 | FS-064-SEC-10 | 템플릿 자동 비움 규칙 | 텍스트 | 비표시. 채널·이벤트를 바꿔 현재 `templateId` 가 후보에 없어지면 `setValue('templateId', '', { shouldDirty: true })`(`RuleFormPage.tsx:131-135`) | — | '조용히 깨진 값을 남기지 않고 비운다'(`:130`). 비워진 값은 FS-064-EL-035 가 저장 시 막는다 |
| FS-064-EL-030 | FS-064-SEC-10 | '실패 시 재시도' select | 입력 | `FormField htmlFor="rule-retry"`, **required 아님**. 선택지 3개. 힌트 '거래 알림은 반드시 도달해야 합니다. 인증번호·보안 알림은 3회 재시도를 권합니다.'(`RuleFormPage.tsx:249-266`) | — | 기본값 `'once'`(`:48`) |
| FS-064-EL-031 | FS-064-SEC-10 | '자동 발송' 토글(폼) | 입력 | `FormField htmlFor="rule-enabled"`, **required 아님**. `ToggleSwitch label="자동 발송 여부"`(`RuleFormPage.tsx:274-281`). 힌트 '끄면 이 이벤트가 발생해도 알림이 나가지 않습니다. 점검·장애 대응 중에 잠시 끌 수 있습니다.' | — | `setValue('enabled', next, { shouldDirty: true })` — `<input>` 이 아니라 버튼이라 RHF register 가 아니다 |
| FS-064-EL-032 | FS-064-SEC-10 | 자동 발송 요약 힌트 | 텍스트 | 토글 우측. 켜짐이면 `'<이벤트명>' 이벤트가 발생하면 <채널명>로 자동 발송합니다(<재시도정책>).`, 꺼짐이면 '지금은 발송하지 않습니다.'(`RuleFormPage.tsx:282-287`) | — | 네 필드의 선택을 한 문장으로 되읽어 준다 |
| FS-064-EL-033 | FS-064-SEC-10 | '취소' 버튼 | 버튼 | 카드 하단 우측 그룹 좌측. `<Button variant="secondary">`, 저장 중 비활성(`FormPageShell.tsx:181-188`). 클릭 시 `/notifications/send` | — | — |
| FS-064-EL-034 | FS-064-SEC-10 | '등록'/'저장' 버튼 | 버튼 | 카드 하단 우측. `<Button type="submit" variant="primary" size="md">`. 라벨 = 저장 중 '저장 중…' · 수정 '저장' · 등록 '등록'. 비활성 조건 = `saving \|\| loadingDetail`(`FormPageShell.tsx:189-191`) | O | 성공 시 토스트(FS-064-EL-038) + `navigate(listPath, { replace: true })`(`useCrudForm.ts:222-223`) |
| FS-064-EL-035 | FS-064-SEC-10 | 저장 검증 규칙 | 텍스트 | 비표시. 검증 정본은 zod 스키마 `createRuleSchema(selfId)`(`validation.ts:23-55`): ① `templateId.trim() === ''` → templateId 에 '이 이벤트에 쓸 템플릿을 고르세요.' ② `hasDuplicateRule(listRules(), trigger, channel, selfId)` → channel 에 `'<이벤트명>' 이벤트의 <채널명> 규칙이 이미 있습니다. 수신자가 같은 알림을 두 번 받게 되므로 기존 규칙을 수정해 주세요.` | — | **중복 금지는 마케팅엔 없는 검사다**(캠페인은 같은 대상에 여러 번 보내는 것이 정상 — `validation.ts:45`). 스키마가 저장소를 읽으므로 **팩토리**다(`:7-9`) — 수정 중인 자신을 `selfId` 로 제외(`RuleFormPage.tsx:82`). '실 백엔드라면 서버가 409 로 거절할 규칙'(`validation.ts:9`) |
| FS-064-EL-036 | FS-064-SEC-12 | 409 충돌 다이얼로그 | 모달 | 비표시. 저장이 409/412 로 실패하면 **입력을 보존한 채** 다이얼로그(`useCrudForm.ts:166-178` → `FormPageShell.tsx:196`). 문구 = 서버 메시지(어댑터는 '다른 사용자가 먼저 삭제한 항목입니다.' — `crud.ts:220`). 두 선택: **최신 다시 불러오기**(내 입력을 버리고 폼을 덮는다) / **닫기**(입력을 남기고 이어서 편집) | O | **성공 토스트도 목록 이동도 없다** — 유령 저장 금지(`useCrudForm.ts:164-165`) |
| FS-064-EL-037 | FS-064-SEC-12 | 미저장 이탈 가드 | 모달 | 비표시. `useUnsavedChangesDialog(isDirty && !saving, { message })`(`FormPageShell.tsx:114`). 문구 '발송 규칙에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.'(`RuleFormPage.tsx:40-41`). 3경로: 브라우저 이탈(beforeunload) · 앱 내 링크 클릭(capture 가로채기) · 뒤로/앞으로(popstate sentinel) | — | `isDirty` = RHF `formState.isDirty`(`useCrudForm.ts:261`). 저장 성공 후엔 `navigate(replace)` 로 이탈하며 dirty 가 남아 있다 — §7 #6 |
| FS-064-EL-038 | — | 저장 성공 토스트 | 토스트 | `'발송 규칙을 등록했습니다.'` / `'발송 규칙을 저장했습니다.'`(`useCrudForm.ts:222`) | — | **ERP-13** — `objectParticle(entityLabel)` 이 조사를 고른다 |
| FS-064-EL-039 | — | 언마운트 abort 규칙 | 텍스트 | 비표시. 폼: `useEffect(() => () => controllerRef.current?.abort(), [])`(`useCrudForm.ts:93`). 목록 토글: 같은 배선(`useCrudRowUpdate.ts:36`) + **새 토글이 이전 요청을 abort**(`:39`). 삭제: 다이얼로그를 닫으면 abort(`useCrudList.tsx:87-88`). abort 는 **실패로 통지하지 않는다** — 공유 `isAbort` predicate(`shared/async.ts`)로 판정 | — | 성공 콜백도 `controller.signal.aborted` 면 아무것도 하지 않는다(`useCrudForm.ts:218` · `useCrudRowUpdate.ts:48`) |
| FS-064-EL-040 | — | 중복 제출 방지 규칙 | 텍스트 | 비표시. **폼 저장만** 3중이다: ① 버튼 비활성(`FormPageShell.tsx:189`) ② **동기 제출 락** `submitLockRef`(`useCrudForm.ts:103,201-202`) — RHF 비동기 검증 탓에 `saving` 이 true 가 되기 전의 두 번째 Enter 를 렌더를 기다리지 않고 막는다 ③ **제출 시도 단위 멱등키** `idempotencyKeyRef`(`:118-123`) — 재시도가 같은 키를 재사용하고 성공하면 버린다(`:220`). 키는 `WriteContext.idempotencyKey` 로 어댑터에 실제 도달한다(`crud.ts:30-41` · `:201,208` `ledger.isReplay`) | O | **토글(FS-064-EL-009.8)·삭제(FS-064-EL-013)에는 ②③이 없다** — §7 #9 |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-064-EL-001 | N/A — 정적 문구, 항상 표시 | 조회 중에도 표시(조회와 무관) | N/A — 서버를 호출하지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 정적 | 고정 문구 |
| FS-064-EL-001.1 | N/A — 항상 표시 | 조회 중에도 표시 | N/A — 라우터 내부 이동. 대상(`/marketing/templates`) 권한이 없으면 이동 후 403 화면 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **이 링크는 대상 권한을 묻지 않는다**(§7 #10) | N/A — 정적 | 단일 링크 |
| FS-064-EL-002 | 항목은 항상 5개(전체+4분류) — 데이터 0건이어도 그려진다 | 조회 중에도 조작 가능. `counts` 는 빈 배열 기준 전부 0 | N/A — 클라이언트 파생 | 모르는 `cat` 값은 '전체'로 되돌린다(`parseCategoryFilter`) | §4.1 공통 규칙 적용 | 값의 원천이 URL 이라 뒤로가기·새로고침에 살아남는다 | 분류 4개 고정 — 트리거가 늘어도 항목 수는 불변 |
| FS-064-EL-002.1 | N/A — 항상 5개 | 조회 중에도 누를 수 있다 | N/A — 서버 호출 없음 | N/A — 버튼(자유 입력 없음) | §4.1 공통 규칙 적용 | 클릭 시 URL 을 `replace` 로 갱신 — history 를 쌓지 않는다 | 5개 고정 |
| FS-064-EL-002.2 | 데이터 0건이면 전부 '0' | 조회 중 전부 '0'(items 가 빈 배열) | 조회 실패 시 필터 패널은 남고 배지는 '0' | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회 시점에만 갱신 | 전량을 5회 순회(`countByCategory`) — 규칙 상한이 20건이라 비용이 무의미하다(§7 #3) |
| FS-064-EL-003 | 매치 0건이면 FS-064-EL-011 검색 빈 상태 | 조회 중에도 입력 가능(대상이 빈 배열이라 결과 0건) | N/A — 서버를 호출하지 않는다(클라이언트 필터) | 자유 텍스트. 길이·문자 제약 없음. 커밋 시 `trim`. 빈 문자열은 '검색 해제'라 최소 길이 정책과 무관하게 통과(`useDebouncedSearch.ts:90-91`) | §4.1 공통 규칙 적용 | **URL 이 원천이라 뒤로가기·새로고침·링크 공유에 살아남는다**. 외부가 `q` 를 바꾸면 입력창이 따라간다(`useDebouncedSearch.ts:78-82`) | 전량이 메모리에 있어 커밋마다 전체를 다시 건다 — 250ms 디바운스가 그 횟수를 지배한다 |
| FS-064-EL-003.1 | N/A — 규칙 자체 | 조회 중에도 규칙은 성립 | N/A — 서버 호출 없음 | **이것이 유효성 게이트다** — 조합 중 값은 커밋되지 않는다 | §4.1 공통 규칙 적용 | **늦게 온 이전 응답이 최신을 덮지 않는다** — 쿼리 키가 보장(`useDebouncedSearch.ts:14-18`). 마운트 직후 커밋이 `page` 를 지우지 않도록 `commitKeyword` 가 값 동일 시 무시(`useListState.ts:146-152`) | 커밋 1회 = 클라이언트 필터 1회. 요청 0건 |
| FS-064-EL-004 | 0건이면 '켜짐 0건' | 조회 중 '켜짐 0건'(items 가 빈 배열) | 조회 실패 시 툴바는 남으므로 '켜짐 0건'이 남는다(§7 #11) | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회 시점 값 | `formatNumber` 천 단위 구분. 규칙 상한 20건 |
| FS-064-EL-005 | N/A — 항상 표시 | 조회 중에도 누를 수 있다 | 조회 실패 시에도 남는다 — 등록은 목록 조회에 종속되지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 보인다**(§7 #10) | N/A — 이동 | N/A — 단일 버튼 |
| FS-064-EL-006 | 0건이면 '조건에 맞는 발송 규칙 결과가 없습니다.' | **최초 로드 중에는 침묵한다** — 아직 알릴 사실이 없다(`CrudListShell.tsx:78`) | 실패 시 '발송 규칙 목록을 불러오지 못했습니다.' | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 실패 문구로 announce | 재조회로 건수가 바뀌면 다시 announce | 문구 1줄 고정 |
| FS-064-EL-007 | 0건이면 '전체 0건' | 최초 로드 '불러오는 중…' · **재조회는 '전체 N건 · 새로고침 중…'** — 건수를 지우지 않는다 | 조회 실패 시 FS-064-EL-012 가 이 줄을 대체 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | `aria-busy={refreshing}` 로 재조회를 AT 에 알린다 | `formatNumber` |
| FS-064-EL-008 | 선택 0건이면 렌더되지 않는다 | 조회 중엔 행이 없어 선택도 없다 | 조회 실패 시 미표시 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **필터·검색이 바뀌면 선택이 해제돼 바가 사라진다**(FS-064-EL-016) | 선택 수만큼 문구가 바뀔 뿐 |
| FS-064-EL-008.1 | N/A — 선택이 있어야 성립 | 삭제 진행 중 비활성 | 실패는 다이얼로그 안 배너(FS-064-EL-014) | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 보인다**(§7 #10) | 선택한 행을 다른 관리자가 먼저 지웠으면 그 건은 409 로 실패해 '중 M건' 에 잡힌다 | `settleAll` 로 병렬 처리, 실패 수만 집계(`useCrudList.tsx:136-142`) |
| FS-064-EL-009 | 0건이면 FS-064-EL-011 로 본문 대체 | FS-064-EL-010 스켈레톤 + `aria-busy` | FS-064-EL-012 로 요약+표 대체 | N/A — 표 자체 입력 없음 | §4.1 공통 규칙 적용 | 조회 시점 스냅샷. 다른 관리자의 변경은 재조회 시점에만 | **상한 없음(코드) / 실질 20건(도메인)** — 트리거 10 × 채널 2, 중복 금지(FS-064-EL-035)가 상한을 강제한다 |
| FS-064-EL-009.1 | 행 0건이면 미표시 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 이진 | §4.1 공통 규칙 적용 | 보이는 행 기준이라 필터가 바뀌면 대상이 바뀐다 | 전량 토글 |
| FS-064-EL-009.2 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 이진 | §4.1 공통 규칙 적용 | 선택은 로컬 상태 — 재조회로 행이 사라져도 id 가 남는다. FS-064-EL-016 이 필터 변경 시 지운다 | 행마다 1개 |
| FS-064-EL-009.3 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 재조회·필터로 순서가 바뀌면 다시 매겨진다 | 페이지네이션 도입 시 값 공식이 틀어진다(§7 #3) |
| FS-064-EL-009.4 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | **모르는 트리거 id 는 배지 대신 글자로 폴백** — 화면이 깨지지 않는다(`triggerColumn.tsx:22-25`) | §4.1 공통 규칙 적용 | 트리거는 코드 상수라 서버 변경과 어긋날 수 있다(§7 #12) | 10개 트리거 고정 |
| FS-064-EL-009.5 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용(값은 2개 유니온) | §4.1 공통 규칙 적용 | 조회 시점 값 | 2개 고정 |
| FS-064-EL-009.6 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | **끊어진 연결(삭제된 템플릿)은 danger 배지로 드러낸다** — 빈 칸으로 두지 않는다 | §4.1 공통 규칙 적용 | **템플릿 화면에서 템플릿을 지우면 이 열이 즉시 깨진다** — 같은 store 를 읽으므로 재조회 시 반영된다(§7 #13) | 규칙마다 store 조회 1회(`templateNameOf`) |
| FS-064-EL-009.7 | 행 0건이면 없음 | 조회 중 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 조회 시점 값 | 3개 정책 고정 |
| FS-064-EL-009.8 | 행 0건이면 없음 | 조회 중 스켈레톤 행이라 토글이 없다. **갱신 중에는 `busy` → `disabled` + `aria-busy`** | 실패 시 **토스트**(FS-064-EL-018) — 배너가 아니다. 토글은 **낙관적 갱신을 하지 않아** 실패해도 스위치가 되돌아가지 않는다(원본 값 그대로) | N/A — 이진 선택이라 위반 값이 없다 | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 조작할 수 있다**(§7 #10) | **새 토글이 이전 요청을 abort 한다**(`useCrudRowUpdate.ts:39`) — 연타 시 마지막 것만 남는다. 다른 관리자가 먼저 규칙을 지웠으면 어댑터가 **409** 를 던져(`crud.ts:219-221`) 실패 토스트가 뜬다 — 그러나 **문구가 일반 실패와 같다**(§7 #14) | **동기 락·멱등키가 없다**(§7 #9). 행마다 1개 |
| FS-064-EL-009.9 | 행 0건이면 없음 | 조회 중 스켈레톤 행이라 버튼이 없다. 삭제 진행 중인 행은 비활성 | 삭제 실패는 다이얼로그 안 배너 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 보인다**(§7 #10) | 이미 삭제된 항목이면 어댑터가 409 '이미 삭제된 항목입니다.'(`crud.ts:232-234`) | 행마다 2개 |
| FS-064-EL-009.10 | 행 0건이면 규칙이 걸리지 않는다 | 조회 중 스켈레톤 행이라 걸리지 않는다 | N/A — 라우터 내부 이동 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 이동 후 폼이 상세를 재조회한다 — 그 사이 삭제됐으면 FS-064-EL-024 의 404 분기 | N/A — 행 단위 |
| FS-064-EL-010 | N/A — 도착 전 상태 | 이것이 로딩 표현. 5행 × (열수+3)셀 | 조회 실패 시 FS-064-EL-012 로 바뀐다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **데이터가 있는 재조회에서는 뜨지 않는다**(`firstLoading` 조건) | 행 수가 결과 수와 무관하게 5 고정(§7 #5) |
| FS-064-EL-011 | **이것이 빈 상태 표현.** 3분기(검색/필터/진짜) | 최초 로드 중에는 스켈레톤이 이 자리를 갖는다 — 빈 상태가 번쩍이지 않는다 | 조회 실패 시 FS-064-EL-012 로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 권한 부족은 실패 배너이지 빈 상태가 아니다 | N/A — 표시 전용 | N/A — 1행 |
| FS-064-EL-012 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 스켈레톤으로 | **이것이 실패 표현.** 문구 1종 + '다시 시도'. **403·429·500·504 를 문구로 구분하지 않는다**(§7 #14) | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 이 배너 | 재시도는 같은 조회를 재발행. **필터·검색은 URL 에 있어 유지된다** | N/A — 표시 전용 |
| FS-064-EL-013 | N/A — 대상이 있어야 성립 | 확인 중 `busy` → 확인 버튼 비활성 + '처리 중…' | **실패해도 다이얼로그가 열려 있고** error 배너가 뜬다 — 재클릭이 곧 재시도(`useCrudList.tsx:161-163`) | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 '삭제하지 못했습니다' 문구 | 이미 삭제된 항목이면 409 → 같은 문구로 뭉개진다(§7 #14) | 단건. **멱등키 없음**(§7 #9) |
| FS-064-EL-014 | 선택 0건이면 `onConfirmBulkDelete` 가 즉시 return(`useCrudList.tsx:128`) | 진행 중 확인 버튼 비활성 | 부분 실패는 'N건 중 M건…' 배너, 다이얼로그 유지. 전건 성공이어야 닫히고 선택이 지워진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 그 사이 삭제된 건은 409 로 실패 수에 든다 | 선택 수만큼 병렬. **abort 는 실패 수에서 제외되지 않는다**(`settleAll` 이 거절 수만 센다 — §7 #15) |
| FS-064-EL-015 | N/A — 규칙 자체 | 조회 중에도 URL 은 이미 확정돼 있다 | N/A — 서버 호출 없음 | 손으로 고친 `?cat=bogus` 는 '전체'로 되돌린다(`notification.ts:436-439`) | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체다** — URL 이 단일 원천이라 뒤로가기·새로고침·링크 공유가 조건을 복원한다 | 파라미터 2개(`cat`·`q`) |
| FS-064-EL-016 | 선택이 없으면 no-op | 조회 중에도 성립 | N/A — 로컬 상태 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체다**(STATE-04-b) | 선택 집합 전체를 비운다 |
| FS-064-EL-017 | 0건이면 빈 배열 | N/A — 순수 정렬(동기) | N/A — 서버 호출 없음 | 모르는 트리거는 rank 0 으로 앞에 온다(`notification.ts:499` `?? 0`) — §7 #12 | §4.1 공통 규칙 적용 | 저장소·화면이 같은 함수를 쓴다 | O(n log n), n ≤ 20 |
| FS-064-EL-018 | N/A — 결과가 있어야 성립 | N/A — 결과 통지 | 실패 토스트는 **자동 소멸한다** — read 실패의 인라인 배너와 다르다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 403 도 같은 실패 문구 | **abort 된 요청은 토스트를 내지 않는다**(`useCrudRowUpdate.ts:48,52`) | 1건 |
| FS-064-EL-019 | N/A — 항상 표시 | 상세 로딩 중에도 표시 | 조회 실패 시 배너 안의 '목록으로'가 대신한다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 중에도 누를 수 있다 — 이탈 시 FS-064-EL-039 가 abort | N/A — 단일 버튼 |
| FS-064-EL-020 | N/A — 정적 문구 | 상세 로딩 중에도 표시(스켈레톤은 카드 본문만 덮는다) | 조회 실패 시 배너가 화면을 대체해 제목이 **사라진다**(§7 #16) | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 정적 | 등록/수정 2종 |
| FS-064-EL-021 | N/A — 정적 문구 | 상세 로딩 중에도 표시 | 조회 실패 시 사라진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 정적 | 고정 문구 |
| FS-064-EL-022 | N/A — 오류 없으면 미렌더 | 재저장 시 먼저 지운다(`useCrudForm.ts:205-206`) | **이것이 저장 실패 표현.** 문구 1종 + 참조 코드. abort·409·422 는 여기 오지 않는다 | 클라이언트 검증 위반은 여기가 아니라 필드 인라인으로 | §4.1 공통 규칙 적용 — **403 도 이 배너**(권한 문구로 갈리지 않는다 — §7 #14) | N/A — 표시 전용 | 1건 |
| FS-064-EL-023 | N/A — 도착 전 상태 | 이것이 로딩 표현. 4줄 고정 + `aria-busy` | 조회 실패 시 FS-064-EL-024 로 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 조건이 `data === undefined` 라 재조회(409 후 '최신 다시 불러오기') 중에는 뜨지 않는다 | 4줄 고정 |
| FS-064-EL-024 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 스켈레톤으로 | **이것이 실패 표현. 404 와 5xx 가 갈린다** — 404 는 '다시 시도'를 주지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **403 은 5xx 와 같은 '불러오지 못했습니다'** 로 뭉개진다(§7 #14) | 다른 관리자가 먼저 지운 규칙의 수정 링크를 열면 **404 분기가 정확히 발현된다** | N/A — 표시 전용 |
| FS-064-EL-025 | N/A — 항상 10개 | 상세 로딩 중 카드 본문이 스켈레톤이라 미렌더. **로딩이 끝나는 첫 순간 포커스를 받는다**(`useInitialFocus.ts:21-25` — 한 번만) | 조회 실패 시 미렌더 | 선택지가 enum 이라 위반 값이 없다(`z.enum(TRIGGER_ID_VALUES)`). `required` 는 `SelectField` 자식이라 `aria-required` 가 주입된다(`FormField.tsx:36-41,50-56`) | §4.1 공통 규칙 적용 | 트리거를 바꾸면 FS-064-EL-029 가 템플릿을 비울 수 있다 | 10개 고정 |
| FS-064-EL-026 | N/A — 항상 2개 | 상세 로딩 중 미렌더 | 조회 실패 시 미렌더 | enum. **중복 위반 오류가 이 필드에 꽂힌다**(FS-064-EL-035) → `isInvalid` + `aria-describedby`→오류 id | §4.1 공통 규칙 적용 | **중복 판정이 스키마 생성 시점(첫 렌더)의 `selfId` 와 호출 시점의 `listRules()` 를 쓴다** — 다른 관리자가 그 사이 같은 규칙을 만들면 클라이언트가 못 잡는다(§7 #17) | 2개 고정 |
| FS-064-EL-027 | **후보 0건이면 비활성 + FS-064-EL-028 경고** | 상세 로딩 중 미렌더. **로딩·실패 상태가 없다** — 동기 store 호출이라 즉시 값이 있다 | **실패 상태가 없다** — 동기 호출이 던지면 라우트 ErrorBoundary 가 받는다(§4.1 렌더 예외) | 빈 값이면 스키마가 막는다(FS-064-EL-035) | §4.1 공통 규칙 적용 | **`useMemo([channel, trigger])` 라 다른 화면에서 템플릿을 추가·삭제해도 이 폼을 다시 열기 전에는 갱신되지 않는다**(§7 #8) | 후보는 채널+트리거 일치분만 — 실질 소수 |
| FS-064-EL-028 | **이것이 후보 0건 표현** | 상세 로딩 중 미렌더 | N/A — 서버 호출 없음 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 템플릿을 등록하고 돌아와도 **이 폼이 살아 있으면 후보가 갱신되지 않는다**(§7 #8) | 1건 |
| FS-064-EL-029 | 값이 이미 `''` 면 no-op(`RuleFormPage.tsx:132`) | 상세 로딩 중에는 폼이 `EMPTY` 라 no-op | N/A — 서버 호출 없음 | **이것이 정합 규칙이다** — 후보에 없는 값을 남기지 않는다 | §4.1 공통 규칙 적용 | **수정 진입 시 프리필된 templateId 가 후보에 있으면 유지된다** — reset 이 먼저 돌고 이 효과가 검증한다 | 후보 배열 1회 순회 |
| FS-064-EL-030 | N/A — 항상 3개 | 상세 로딩 중 미렌더 | 조회 실패 시 미렌더 | enum. **required 가 아니라 `aria-required` 주입 대상이 아니다** | §4.1 공통 규칙 적용 | N/A — 로컬 값 | 3개 고정 |
| FS-064-EL-031 | N/A — 항상 표시 | 상세 로딩 중 미렌더. `disabled = saving \|\| loadingDetail` | 조회 실패 시 미렌더 | N/A — 이진 | §4.1 공통 규칙 적용 | N/A — 로컬 값 | 1개 |
| FS-064-EL-032 | N/A — 항상 표시 | 상세 로딩 중 미렌더 | N/A — 파생 문구 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 네 필드의 현재 값을 즉시 되읽는다 | 1문장 |
| FS-064-EL-033 | N/A — 항상 표시 | 저장 중 비활성 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **미저장 변경이 있으면 FS-064-EL-037 이 가로채지 못한다** — `navigate()` 프로그램 이동이다(§7 #6) | N/A — 단일 버튼 |
| FS-064-EL-034 | N/A — 항상 표시 | 저장 중 '저장 중…' + 비활성. 상세 로딩 중에도 비활성 | 실패 시 FS-064-EL-022 배너(또는 EL-036 충돌 / 필드 인라인), 버튼 재활성, 이동 없음, **입력 보존** | 검증 실패면 서버를 호출하지 않고 **첫 오류 필드로 포커스**(RHF `shouldFocusError` — `useCrudForm.ts:240-248`) | §4.1 공통 규칙 적용 — **쓰기 권한이 없어도 보이고 눌린다**(§7 #10) | 대상이 사라졌으면 409 → FS-064-EL-036 | 단건. **동기 락 + 멱등키 있음**(FS-064-EL-040) |
| FS-064-EL-035 | 템플릿 후보가 0건이면 `templateId` 가 `''` 라 반드시 위반한다 — FS-064-EL-028 이 그 출구를 준다 | N/A — 순수 검증(동기) | **저장소를 동기로 읽는다** — 실패 경로가 없다 | **이것이 유효성 표현.** 두 규칙(템플릿 필수 · 트리거+채널 중복) | §4.1 공통 규칙 적용 | **`listRules()` 를 검증 시점에 읽지만 그것은 클라이언트 픽스처다** — 실 서버에서는 서버가 정본이어야 한다(BE-064 §7.2) | 전량 1회 순회(`hasDuplicateRule`) |
| FS-064-EL-036 | N/A — 충돌이 있어야 성립 | '최신 다시 불러오기'를 누르면 상세를 재조회한다 | **이것이 충돌 표현.** 서버 메시지를 그대로 보인다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **이것이 경합 규칙 자체다.** ⚠ 어댑터의 409 는 **'대상이 아직 있는가'**만 본다(`crud.ts:219-221`) — `version`/`ETag` 토큰이 아니다. **둘 다 존재하는 동시 편집은 여전히 last-write-wins** 다(§7 #18) | 1건 |
| FS-064-EL-037 | N/A — 변경이 있어야 성립 | 저장 중에는 비활성(`isDirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **저장 성공 후 `navigate(replace)` 는 프로그램 이동이라 가드가 발화하지 않는다** — 의도된 통과다 | N/A — 표시 전용 |
| FS-064-EL-038 | N/A — 성공이 있어야 성립 | N/A — 결과 통지 | N/A — 실패는 배너가 담당 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **어댑터가 409 를 내므로 유령 저장 토스트가 나지 않는다**(`crud.ts:219-221`) | 1건 |
| FS-064-EL-039 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | **abort 는 실패가 아니다** — 배너·토스트를 띄우지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 이탈 시 진행 중 쓰기가 취소된다 — **서버 도달 여부는 보장하지 않는다**(§7 #19) | 일괄 삭제의 abort 는 실패 수에서 제외되지 않는다(§7 #15) |
| FS-064-EL-040 | N/A — 제출이 있어야 성립 | 이것이 잠금 규칙 | 실패 시 락이 풀리고(`onSettled`) **멱등키는 남는다** — 재시도가 같은 키를 재사용한다 | 검증 실패 시 락을 즉시 푼다(`useCrudForm.ts:246-248`) | §4.1 공통 규칙 적용 | 같은 키의 두 번째 요청은 어댑터가 재생한다(`crud.ts:201,208`). **기록은 성공한 뒤에만** — 실패한 시도가 키를 태워 재시도를 no-op 으로 만들지 않는다(`crud.ts:55-60`) | **폼 저장에만 적용된다 — 토글·삭제엔 없다**(§7 #9) |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 목록 조회 실패는 인라인 배너(FS-064-EL-012), 폼 상세 실패는 404/5xx 분기 배너(FS-064-EL-024), 저장 실패는 카드 배너(FS-064-EL-022), 토글·삭제 실패는 토스트/다이얼로그 배너. **오프라인 감지·복귀 재조회는 앱 전역에 없다**(`navigator.onLine` grep 0건) — §7 #20 |
| 세션 만료 | 조회·쓰기 어디서든 401 이 오면 **앱 전역 401 인터셉터**(`shared/query/queryClient.ts` 의 `QueryCache`/`MutationCache` `onError`)가 `notifySessionExpired()` 를 쏘고, `RequireAuth` 의 감시자가 세션을 폐기한 뒤 `/login?returnUrl=<현재경로>&reason=session_expired` 로 보낸다. 재로그인 후 원래 경로(쿼리 포함)로 복귀한다 — **URL 에 필터·검색이 있어 조건까지 복원된다**(FS-064-EL-015). 다만 **폼의 미저장 입력은 그때 사라진다** — 프로그램적 이동이라 FS-064-EL-037 가드가 발화하지 않는다 |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 grep 0건). abort 는 언마운트·다이얼로그 닫기·새 토글에서만 발생한다 — §7 #20 |
| 중복 제출 | **폼 저장**은 3중(비활성 + 동기 락 + 멱등키 — FS-064-EL-040). **토글·삭제**는 비활성(`busy`)뿐이고 동기 락·멱등키가 없다 — §7 #9. `crud.ts:36-39` 는 '확인 다이얼로그를 거치는 조작은 키 없이 온다'를 의도로 선언하나, 토글에는 확인 다이얼로그조차 없다 |
| 실패 통지의 자리 | ① 목록 조회 실패 = 인라인 배너(요약+표 대체) ② 폼 상세 실패 = 화면 대체 배너(404/5xx 분기) ③ 저장 실패 = 카드 상단 배너 + 참조 코드 ④ 저장 충돌(409/412) = 다이얼로그(입력 보존) ⑤ 저장 필드 거절(422) = 필드 인라인 + 포커스 ⑥ 삭제 실패 = 그 다이얼로그 안 배너 ⑦ 토글 실패 = 토스트 ⑧ 쓰기 성공 = 토스트 ⑨ abort = 아무것도 띄우지 않는다 |
| 낙관적 업데이트 | **이 화면에 없다.** 토글도 비관적이다(요청 완료 후 무효화) — `useCrudRowUpdate` 에 `onMutate`/`setQueryData` 가 없다. 롤백 경로가 필요 없다 |
| 동시 조회 | 목록/상세 조회는 각각 동시에 1건만 유지된다(react-query). `staleTime` 30초 · 자동 재시도 없음 · 창 포커스 재조회 없음. **템플릿 후보 조회(FS-064-EL-027)·중복 검증(FS-064-EL-035)·템플릿명 조회(FS-064-EL-009.6)는 쿼리가 아니라 동기 store 호출**이라 이 규칙 밖에 있다 |
| 권한 없음 | **프론트 역할 분기 없음.** 라우트 read 권한은 AppShell 의 `RequirePermission` 이 `<Outlet>` 바깥에서 가드해 403 화면을 렌더한다(`AppShell.tsx:490-491`). 그러나 **쓰기 게이팅(`useRouteWritePermissions`)이 이 화면에 배선돼 있지 않다** — 소비처 8곳(logs · products×3 · settings×4)에 알림 관리가 없다 → 쓰기 권한 없는 역할도 등록·수정·삭제·토글을 보고 누른다(§7 #10). 서버 권한 응답은 조회=배너, 저장=배너, 토글=토스트로 떨어진다. 은닉 정책(403 vs 404)은 BE-064 §7.5 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary` 를 둔다(`AppShell.tsx:484-493`) — 화면이 던져도 사이드바·헤더가 남고 복구 화면(`RouteErrorScreen`)이 뜬다. FS-064-EL-027·EL-035·EL-009.6 의 동기 store 호출이 던지는 경우도 여기서 멈춘다 |
| 행 선택의 수명 | 필터·검색이 바뀌면 해제된다(FS-064-EL-016). 페이지네이션이 없어 'page 변경 시 해제'는 걸릴 표면이 없다 |
| 중복 규칙의 3중 방어 | ① 폼 스키마가 저장 전에 막는다(FS-064-EL-035) ② 템플릿 후보를 채널+트리거로 좁혀 잘못된 연결을 예방한다(FS-064-EL-027) ③ 서버가 정본으로 409 를 낸다(BE-064 §7.2). 현재 ①만 실재하고 ③은 계약이다 |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| FS-064-EL-006 / EL-007 / EL-009 / EL-012 | 발송 규칙 목록 조회 | R | 규칙 전량(필터·검색·정렬·페이징 없이) | `ruleAdapter.fetchAll(signal)` | 분류 필터·검색·정렬이 **전부 클라이언트**다. 서버는 조건을 받지 않는다 |
| FS-064-EL-023 / EL-024 / EL-025~EL-032 | 발송 규칙 상세 조회 | R | 규칙 1건 | `ruleAdapter.fetchOne(id, signal)` | 없는 id → `HttpError(404)`(`crud.ts:192-194`) |
| FS-064-EL-034 (등록) | 발송 규칙 등록 | W | `NotificationRuleInput`(trigger·channel·templateId·enabled·retryPolicy) + 멱등키 | `ruleAdapter.create(input, { signal, idempotencyKey })` | 멱등키가 어댑터까지 도달한다(`crud.ts:197-204`) |
| FS-064-EL-034 (수정) / EL-036 | 발송 규칙 수정 | W | id + `NotificationRuleInput` + 멱등키 | `ruleAdapter.update(id, input, { signal, idempotencyKey })` | 대상이 없으면 `HttpError(409)`(`crud.ts:219-221`) |
| FS-064-EL-009.8 / EL-018 | 자동 발송 ON/OFF | W | id + `NotificationRuleInput`(`enabled` 만 바뀐 전체 입력) | `ruleAdapter.update(id, { ...toInput(rule), enabled: next }, { signal })` — `useCrudRowUpdate.ts:44-45` | **전용 엔드포인트를 두지 않는다** — `data-source.ts:15` 가 'ON/OFF 는 PUT …/:id (enabled) 로 같이 나간다'로 못박는다. **멱등키가 실리지 않는다**(§7 #9) |
| FS-064-EL-013 / EL-014 | 발송 규칙 삭제(단건·일괄) | W | id | `ruleAdapter.remove(id, { signal })` — `useCrudList.tsx:101-103` | 일괄은 id 마다 `remove` 를 병렬 호출(`settleAll`). **멱등키가 실리지 않는다** |
| FS-064-EL-027 | 템플릿 후보 조회 | R | 채널+트리거가 맞는 템플릿 목록 | **없음 — `_shared/store.templateOptionsFor()` 를 동기 직접 호출**(`RuleFormPage.tsx:128`) | 어댑터·쿼리를 거치지 않는다. **연동 심이 없다** — BE-064 §7.3. 엔드포인트는 BE-065/BE-066 소관 |
| FS-064-EL-009.6 | 규칙 목록의 템플릿명 조회 | R | templateId → 템플릿명 | **없음 — `_shared/store.templateNameOf()` 를 동기 직접 호출**(`RuleListPage.tsx:95-97,128`) | 위와 동일. 서버 연동 시 목록 응답이 이름을 조인해 내려주는 편이 옳다 — BE-064 §7.4 |
| FS-064-EL-035 | 중복 규칙 검증 | R | 규칙 전량 | **없음 — `_shared/store.listRules()` 를 스키마가 동기 직접 호출**(`validation.ts:20,46`) | 위와 동일. **검증 정본은 서버여야 한다** — BE-064 §7.2 |

> **현재 구현 상태 (A63 참고)**: 백엔드는 없다. `ruleAdapter` 는 공용 `createStoreAdapter`(`shared/crud/crud.ts:165-239`)로 `_shared/store.ts` 의 브라우저 안 mutable 배열(`rules` — `store.ts:253-335`) 위에 배선된다. 400ms 지연(`LATENCY_MS` — `dev.ts:12`)과 개발용 실패 스위치(`failIfRequested(scope, op)`)를 얹어 CRUD 를 흉내 낸다 — **실제 네트워크 0건 · 실제 발송 0건**(`store.ts:3`). 팩토리가 주는 것: `fetchOne` 없는 id → `HttpError(404)`(`:192-194`) · `create`/`update`/`remove` 의 멱등 재생(`:200-203,208,229`) · `update`/`remove` 대상 부재 → `HttpError(409)`(`:219-221,232-234`). 새로고침하면 시드로 되돌아간다. `data-source.ts:14-17` 의 `// TODO(backend): GET/POST /api/notifications/rules · GET/PUT/DELETE /api/notifications/rules/:id` 가 유일한 연동 지점이며, **템플릿 후보·템플릿명·중복 검증 조회에는 심이 없다.** 위 표는 백엔드 연결 후 의도된 동작이다.

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `RuleListPage.tsx` · `RuleFormPage.tsx` · `data-source.ts` · `validation.ts` · `send.test.ts` · `RuleListPage.test.tsx` · `_shared/{notification,store,styles,TransactionalNotice,triggerColumn,useInitialFocus}.ts(x)` · 공용 `shared/crud/{crud,useCrudList,useCrudForm,useCrudRowUpdate,useListState,useDebouncedSearch,CrudListShell,CrudTable,FormPageShell,dev}.ts(x)`
- [x] **'이 화면은 발송하지 않는다'를 코드 네 겹으로 확인**하고 §1 에 못박았다(`RuleListPage.tsx:4-10` · `data-source.ts:5-7,14-17` · `RuleFormPage.tsx:144` · 화면에 발송 버튼 부재) — NFR-064 의 FEEDBACK-02 판정이 이 사실에 종속된다
- [x] **마케팅 관리(FS-036)와의 관계를 코드 근거로 판정**했다 — `notification.ts:3-34` 의 7축 비교표와 법적 근거를 §1 에 인용하고, 두 섹션이 **import 하지 않고 라우트 링크로만 연결**됨을 grep 으로 확인해 FS-064-EL-001.1 에 기록했다
- [x] 보이지 않는 요소(live region · 스켈레톤 · 3분기 빈 상태 · 실패 배너 · URL 동기화 · 선택 해제 · 정렬 · IME 커밋 · 템플릿 자동 비움 · 검증 · 충돌 · 이탈 가드 · abort · 제출 락/멱등키)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. 어댑터를 거치지 않는 동기 store 호출 3건(EL-027 · EL-009.6 · EL-035)을 '없음'으로 명시했다
- [x] **409 를 '존재 여부 기반'으로 정확히 기술**했다 — `version`/`ETag` 토큰이 아니며 동시 편집은 last-write-wins 임을 FS-064-EL-036 과 §7 #18 에 분리해 적었다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-064 영역)

## 7. 미결 사항 (A11 / A01 / A63 / A40 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (알림 관리 SCR 미작성) | A11 / A01 |
| 2 | **'켜짐 N건'(EL-004)이 필터·검색 적용 후 기준**이라 분류를 좁히면 값이 함께 준다 — 운영자가 '전체 켜짐 수'로 읽을 여지가 있다. '전체 N건'(EL-007)과 같은 줄이 아니라 툴바에 있어 기준이 더 흐리다 | A11 change_request |
| 3 | **페이지네이션이 없다** — 전량 렌더(quality-bar IA-04 P0). 규칙은 트리거 10 × 채널 2 = **최대 20건**이 도메인 규칙(EL-035 중복 금지)으로 강제되나, 앱 관례 `PAGE_SIZE = 10`(`pages/members/types.ts:71` 등) 기준으로는 **한 page 를 넘길 수 있다**. `SeqCell` 이 `index + 1`(quality-bar COMP-07 P2)이라 도입 시 함께 고쳐야 한다 | A11 change_request |
| 4 | **자동 발송 토글(EL-009.8)에 확인 절차가 없다** — 클릭 한 번으로 즉시 저장된다. 끄면 그 이벤트의 알림이 나가지 않고(인증번호 규칙이면 로그인 불가), 켜면 다음 이벤트부터 실제 발송이 시작된다. 되돌릴 수 있으므로 quality-bar FEEDBACK-02(파괴적/비가역)의 대상은 아니나, **운영 영향이 큰 스위치가 가장 가벼운 상호작용**이라는 비대칭은 남는다 | A11 change_request |
| 5 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`)다 — 페이지네이션이 없어 'row 수 === PAGE_SIZE' 기준값 자체가 없다(quality-bar COMP-06 P2) | A41 (공용 `CrudTable` 소관) |
| 6 | 이탈 가드(EL-037)가 **`navigate()` 프로그램 이동을 가로채지 못한다** — '목록으로'(EL-019)·'취소'(EL-033)를 누르면 미저장 입력이 조용히 사라진다. 훅의 3경로 계약(brower unload · 앱 내 링크 · popstate) 밖이다 | A11 change_request |
| 7 | **폼 화면에 `<h1>` 이 2개다** — AppHeader 가 `findCoveringLeaf` 로 '알림 발송'을 그리고(`AppHeader.tsx:92,101` · `nav-config.ts:270-278`) `FormPageShell.tsx:160` 이 '발송 규칙 등록'을 또 그린다. 또한 `nav-config.ts:294-296` 이 밝히듯 **'등록/수정' 행위는 제목에 넣지 않는 것이 의도**라 AppHeader 의 primary title 은 목록 이름 그대로다(quality-bar IA-02 P0 의 '공지 등록' 예시 미충족). **목록 화면은 nav 잎이고 in-content h1 이 없어 pass 다** — gap 은 `/new`·`/:id/edit` 에서만 발생한다 | A40 · A11 |
| 8 | **템플릿 후보(EL-027)·후보 없음 경고(EL-028)가 어댑터를 거치지 않고 store 를 동기 직접 호출**한다 — 로딩·실패·재조회가 없고, `useMemo` 라 다른 화면에서 템플릿을 등록해도 이 폼을 다시 열기 전에는 갱신되지 않는다. 백엔드가 붙으면 `Promise` 를 반환하므로 **호출부가 `useQuery` 로 바뀌어야 한다**(어댑터 본문만 고쳐서는 연결 불가) | A11 · A63 (BE-064 §7.3) |
| 9 | **토글(EL-009.8)·삭제(EL-013·EL-014)에 동기 제출 락·멱등키가 없다**(quality-bar EXC-08 P0). `useCrudRowUpdate.ts:44-45` 와 `useCrudList.tsx:101-103` 이 `idempotencyKey` 를 싣지 않는다. `crud.ts:36-39` 는 '확인 다이얼로그를 거치는 조작은 키 없이 온다'를 의도로 선언하나 **토글에는 확인 다이얼로그조차 없다**. 완화 요인: 새 토글이 이전 요청을 abort 한다(`useCrudRowUpdate.ts:39`) | A11 · A63 |
| 10 | **쓰기 권한 게이팅이 배선돼 있지 않다** — `useRouteWritePermissions` 소비처 8곳에 알림 관리가 없다(grep 확인). read 전용 역할도 등록·수정·삭제·**토글**을 보고 누른다(quality-bar EXC-03 P0). 마케팅 링크(EL-001.1)도 대상 권한을 묻지 않아 권한 없는 운영자를 403 화면으로 보낸다 | A11 change_request |
| 11 | 목록 조회 실패 시 **툴바의 '켜짐 0건'(EL-004)이 남는다** — 배너가 대체하는 것은 요약+표뿐이라, 데이터를 못 불러온 화면이 '켜짐 0건'이라는 **사실이 아닌 값**을 보인다 | A11 change_request |
| 12 | 트리거 목록이 **코드 상수**(`TRIGGER_ID_VALUES` — `notification.ts:77-88`)다. 서버가 새 이벤트를 추가하면 배지가 id 폴백으로 떨어지고(EL-009.4) 정렬 rank 가 `?? 0` 이라 맨 앞에 온다(EL-017). 트리거 카탈로그의 소유자가 미정이다 | A01 (도메인 경계) · A63 |
| 13 | 템플릿 화면에서 템플릿을 지우면 **이 화면의 규칙이 조용히 무력화된다** — 목록은 'templateId 없음' danger 배지로 드러내지만(EL-009.6), **템플릿 삭제 시점에 그 사실을 경고하는 것은 템플릿 화면의 몫**이다. `store.ts:383-385` 에 `rulesUsingTemplate(templateId)` 가 그 용도로 존재하나 **소비처가 0건이다**(grep 확인) — FS-065/FS-066 §7 과 같은 항목 | A11 change_request |
| 14 | **status 별 surface 가 갈리지 않는다** — 목록 실패(EL-012)가 403·429·500·504 를 한 문구로, 저장 실패(EL-022)가 403·429·500 을 한 배너로, 토글 실패(EL-018)가 403·409·500 을 한 토스트로 뭉갠다. `?status=<op>:<code>` 로 status 를 실을 수 있고(`dev.ts:14-71`) `HttpError` 가 status 를 갖는데도 화면이 분기하지 않는다(quality-bar EXC-06 P1). **404 만 갈린다**(EL-024) | A11 change_request |
| 15 | 일괄 삭제(EL-014)에서 **abort 가 실패 수에서 제외되지 않는다** — `settleAll` 이 거절 수만 세므로 이탈 시 'N건 중 M건을 삭제하지 못했습니다'가 뜰 수 있다(quality-bar EXC-09 P0 의 마지막 절) | A41 (공용 `shared/bulk` 소관) |
| 16 | 폼 상세 조회 실패(EL-024) 시 **배너가 화면 전체를 대체**해 제목(EL-020)·'목록으로'(EL-019)·설명(EL-021)이 사라진다 — 복구 버튼은 배너 안에 있으나 맥락이 통째로 없어진다 | A41 (공용 `FormPageShell` 소관) |
| 17 | 중복 검증(EL-035)의 스키마가 **첫 렌더에 고정**된다(`RuleFormPage.tsx:82` `useMemo(..., [id])` — resolver 는 `useForm` 첫 렌더에 박힌다). `listRules()` 는 호출 시점에 읽지만 그것은 **클라이언트 픽스처**라, 다른 관리자가 그 사이 같은 트리거+채널 규칙을 만들면 클라이언트가 못 잡는다 — 서버가 정본이어야 한다 | A63 (BE-064 §7.2) |
| 18 | **낙관적 동시성 토큰이 없다.** 어댑터의 409(EL-036)는 **'대상이 아직 있는가'** 만 본다(`crud.ts:219-221`) — `NotificationRule.updatedAt`(`notification.ts:405`)이 있는데도 `If-Match`/`version` 으로 실리지 않는다. **유령 저장은 해소됐으나 둘 다 존재하는 동시 편집은 여전히 last-write-wins** 다(quality-bar EXC-04 P0). 두 운영자가 같은 규칙의 채널을 각각 바꾸면 나중 저장이 조용히 이긴다 | A63 (BE-064 §7.1) · A11 |
| 19 | 이탈 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다 — 이미 반영된 토글이 화면에 안 보일 수 있다 | A63 (BE-064) |
| 20 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` grep 0건) · 오프라인 감지 없음(`navigator.onLine` grep 0건) · 세션 만료 리다이렉트가 폼의 미저장 입력을 버린다(가드 미발화) | A11 · A40 (quality-bar EXC-05 · EXC-11 · EXC-19 P1) |
</content>
</invoke>
