---
id: FS-068
title: "언어 관리"
screen: SCR-068               # ⚠ 시스템 설정 SCR 미작성 — §7 미결 사항 참조
route: /settings/languages
owner: A62
reviewer: A64
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-068. 언어 관리

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 사이트가 노출할 **지원 언어 목록**과 **기본 언어**·**폴백 언어**를 정하고 저장한다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — 권한은 `useRouteWritePermissions` 로 게이팅. §4.1) |
| 진입 경로 | 좌측 GNB > 시스템 > 시스템 설정 > 언어 관리 (`nav-config.ts:228` `['언어 관리', '/settings/languages']`) |
| 포함 화면 | 단일 라우트 `/settings/languages` — **하위 라우트가 없다(잎)** |
| **범위 밖** | **실제 번역 적용** — 이 앱은 **한국어 단일**이고 i18n 라이브러리가 없다. 이 화면은 언어 **정책만** 저장하며 저장한다고 화면이 번역되지 않는다. **화면이 그 사실을 감추지 않고 상단 info 배너로 밝힌다**(FS-068-EL-010). 근거·심: `validation.ts:3-18` (`// TODO(lib): i18n`). **로케일 추가** — 후보 4종(`ko`·`en`·`ja`·`zh-CN`)이 코드 상수이며 화면에서 새 언어를 만들 수 없다 |
| 구현 경로 | `apps/admin/src/pages/settings/languages/**` (`LanguagesPage.tsx` · `data-source.ts` · `validation.ts` · `languages.test.ts`) · 공유 `pages/settings/_shared/**` |
| 대응 SCR | SCR-068 (미작성 — §7 #1) |
| 공통 컴포넌트 | `settings/_shared/{SettingsFormShell,ConflictDialog,AuditNote,useSettingsQuery,useSaveSettings,useSubmitLock,createRevisionedStore,divergedLabels,formatAuditAt}` · `shared/ui/{Alert,ConfirmDialog,FormField,SelectField,errorIdOf,useToast,useUnsavedChangesDialog}` · **`@tds/ui` 의 `Checkbox`(앱 배럴이 내보내지 않아 DS public entry 에서 직접 — `LanguagesPage.tsx:16-18`)** · `shared/permissions/RequirePermission` · `shared/form/zodResolver` · `shared/async(isAbort)` |

> **정직한 화면**: `LanguagesPage.tsx:5-7` 이 원칙을 선언한다 — '설정을 저장할 뿐 **번역을 적용하지 않는다** — 그 사실을 감추지 않고 화면 상단에 info 배너로 밝힌다. 감추면 운영자는 영어를 켜 놓고 사이트가 영어로 나오길 기다리게 된다.' **이것은 결함이 아니라 명세된 동작이다.**

### 1.1 이 화면의 설계 원칙 (요구사항 — 명세에 고정한다)

| 원칙 | 내용과 이유 (코드 근거) |
|---|---|
| **모델이 규칙을 갖는다** | '기본 언어는 지원 목록에 있어야 한다'는 화면이 아니라 **zod 스키마**가 강제한다(`validation.ts:52-85`). FS-007 §1.1 · FS-067 §1.1 과 같은 원칙 |
| **만들 수 있는 실수는 애초에 만들지 않는다** | 기본/폴백 언어의 체크박스는 **끌 수 없다**(`LanguagesPage.tsx:305` `locked`). 끄는 순간 스키마가 거부할 값이 되므로 만들게 두고 혼내지 않는다(`:172-173` '검증으로 잡을 수도 있지만, 막을 수 있는 실수를 만들게 두고 나서 혼내지 않는다') |
| **고를 수 없는 선택지를 보여주지 않는다** | 기본·폴백 select 의 선택지는 **지원 목록에 켜진 언어만**(`:273` `selectable`) |
| **체크 순서가 저장값을 흔들지 않는다** | 토글 시 `LANGUAGE_META` 정의 순서로 정규화한다(`:182-183` `ordered`) — 무의미한 dirty 를 막는다 |
| **동시 편집을 덮어쓰지 않는다** | revision 토큰 기반 409 → 충돌 다이얼로그(`_shared/store.ts:124-126`). FS-067 과 같은 계약 |

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-068-SEC-01 | 화면 안내문 | 카드 위 muted 문구 |
| FS-068-SEC-02 | 설정 카드 | 제목 + (저장 실패 배너 · 읽기전용 안내 · **i18n 미도입 info 배너**) + 지원 언어 fieldset + 기본/폴백 select + 요약 문구 |
| FS-068-SEC-03 | 지원 언어 fieldset | `<fieldset>` + `<legend>` + 체크박스 4행 + 그룹 오류 |
| FS-068-SEC-04 | 카드 푸터 | 감사 기록 + 저장 상태 문구 + 저장 버튼 |
| FS-068-SEC-05 | 조회 실패 배너(비표시 기본) | 폼 전체를 대체 |
| FS-068-SEC-06 | 첫 로딩 스켈레톤(비표시 기본) | 필드 자리를 대체 |
| FS-068-SEC-07 | 저장 확인 다이얼로그(비표시 기본) | 고정 문구 |
| FS-068-SEC-08 | 동시 편집 충돌 다이얼로그(비표시 기본) | 3-액션 |
| FS-068-SEC-09 | 미저장 이탈 가드(비표시 기본) | 3경로 discard 확인 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-068-EL-001 | FS-068-SEC-01 | 화면 안내문 | 텍스트 | `<p>` '사이트가 노출할 언어와 기본·폴백 언어를 정합니다.'(`LanguagesPage.tsx:279`) | — | **in-content `<h1>` 이 없다** — 제목은 AppHeader 가 nav 잎 라벨('언어 관리')로 그린다(IA-02 pass 근거) |
| FS-068-EL-002 | FS-068-SEC-02 | 카드 제목 | 텍스트 | `CardTitle` '언어 설정'(`:278`) | — | ⚠ **nav 라벨('언어 관리')과 카드 제목('언어 설정')이 다르다** — AppHeader `<h1>` 은 '언어 관리', 카드는 '언어 설정'을 보인다(§7 #5) |
| FS-068-EL-003 | FS-068-SEC-03 | 지원 언어 그룹 | 텍스트 | `<fieldset style={groupStyle}>` + `<legend style={legendStyle}>지원 언어</legend>`(`:298-299`) | — | 체크박스 그룹의 접근 가능한 그룹 이름을 `<legend>` 가 제공한다 — `role="group"` 을 손으로 쓰지 않는다 |
| FS-068-EL-004 | FS-068-SEC-03 | 언어 체크박스 목록 | 표시 | `<ul style={listStyle}>` 안에 `LANGUAGE_META` 4건을 `<li>` 로(`:301-328`). 순서는 정의 순서 고정: 한국어 · 영어 · 일본어 · 중국어(간체) | O | `listStyle: 'none'` — 마커 없는 목록. 정렬·검색·필터 없음 |
| FS-068-EL-004.1 | FS-068-SEC-03 | 언어 체크박스 | 입력 | `@tds/ui` `Checkbox id={'lang-supported-<code>'}` `label={meta.label}`. `checked = supported.includes(meta.code)`. `onChange` → `toggleSupported(code, checked)` | O | **보이는 라벨은 Checkbox 가 그린다** — 옆에 또 쓰면 접근 가능한 이름이 두 번 읽힌다(`:309`). `disabled = disabled \|\| locked` |
| FS-068-EL-004.2 | FS-068-SEC-03 | 원어 표기 | 텍스트 | `<span style={nativeStyle}>{meta.native}</span>`(`:319`) — 한국어 · English · 日本語 · 简体中文 | — | 그 언어 화자가 읽는 이름을 함께 보여 **무엇을 켜는지 오해가 없게** 한다(`validation.ts:30-31`). **체크박스의 접근 이름에는 포함되지 않는다**(형제 span) |
| FS-068-EL-004.3 | FS-068-SEC-03 | 잠금 사유 문구 | 텍스트 | `locked` 일 때만 `<span style={lockedStyle}>` — `'기본 언어라 끌 수 없습니다'` 또는 `'폴백 언어라 끌 수 없습니다'`(`:320-324`) | — | 비표시 기본. 이탤릭 muted. ⚠ **`disabled` 체크박스와 이 문구가 프로그램적으로 연결돼 있지 않다**(`aria-describedby` 없음) — 왜 비활성인지 AT 가 알 수 없다(§7 #4) |
| FS-068-EL-004.4 | FS-068-SEC-03 | 잠금 판정 규칙 | 텍스트 | `locked = meta.code === defaultLanguage \|\| meta.code === fallback`(`:305`) — **드래프트 값 기준**(watch) | — | 비표시 규칙. 기본/폴백을 바꾸면 잠금 대상도 즉시 따라 바뀐다 |
| FS-068-EL-005 | FS-068-SEC-03 | 지원 목록 토글 규칙 | 텍스트 | `toggleSupported(code, checked)`(`:175-188`): ① 현재 `supported` 를 읽어 추가/제거 ② **`LANGUAGE_META` 순서로 정규화**(`ordered`) ③ `setValue('supported', ordered, { shouldDirty: true, shouldValidate: true })` | — | 비표시 규칙. 정규화가 없으면 체크 순서가 배열 순서를 흔들어 **아무것도 안 바꿔도 dirty** 가 된다(`:182`) |
| FS-068-EL-006 | FS-068-SEC-03 | 지원 언어 그룹 오류 | 텍스트 | `errors.supported?.message` 가 있으면 `<p id={errorIdOf('lang-supported')} role="alert">` — '지원 언어를 하나 이상 선택하세요.'(`:330-334`) | — | 비표시. ⚠ **`errorIdOf('lang-supported')` id 를 만들지만 그것을 `aria-describedby` 로 참조하는 컨트롤이 없다** — `lang-supported` 라는 id 의 요소가 존재하지 않는다(체크박스 id 는 `lang-supported-ko` 등). **오류가 어느 그룹의 것인지 프로그램적으로 연결되지 않는다**(§7 #3). `role="alert"` 라 announce 는 된다 |
| FS-068-EL-007 | FS-068-SEC-02 | 기본 언어 select | 입력 | `FormField htmlFor="lang-default"` 라벨 '기본 언어', **required**, 힌트 '사이트에 처음 들어온 방문자가 보게 될 언어입니다.'. 자식이 DS `SelectField` 라 `aria-required` 가 주입된다(`FormField.tsx:40`). `isInvalid` + `aria-describedby`(오류 시 `errorIdOf('lang-default')`) 를 **호출부가 직접 배선**한다(`:345-354`) | O | 선택지 = `selectable`(지원 목록에 켜진 언어만 — `:273`) |
| FS-068-EL-008 | FS-068-SEC-02 | 폴백 언어 select | 입력 | `FormField htmlFor="lang-fallback"` 라벨 '폴백 언어', **required**, 힌트 '번역이 없는 문구를 대신 보여줄 언어입니다.'. 배선은 EL-007 과 동일(`:371-378`) | O | 선택지 = `selectable` |
| FS-068-EL-009 | FS-068-SEC-02 | 구성 요약 문구 | 텍스트 | `<p style={nativeStyle}>` — `기본 언어 {languageLabel(defaultLanguage)} · 폴백 {languageLabel(fallback)} · 지원 {supported.length}개`(`:389-392`) | — | 드래프트 기준. `languageLabel` 은 못 찾으면 코드를 그대로 돌려준다(`validation.ts:41-43`) |
| FS-068-EL-010 | FS-068-SEC-02 | i18n 미도입 안내 배너 | 배너 | **항상 표시**되는 info `Alert`(`warning` 슬롯 — `:290-295`): '현재 이 어드민과 사이트는 한국어로만 제공됩니다. 이 화면은 언어 정책을 저장할 뿐, 저장한다고 화면이 번역되지는 않습니다. 실제 번역 적용은 준비 중입니다.' | — | **조건 없이 렌더된다** — 사이트 설정의 warning 슬롯이 조건부인 것과 다르다. **이 화면의 정직성 장치**이며 §1 범위 밖 선언의 화면 표현이다 |
| FS-068-EL-011 | FS-068-SEC-04 | 감사 기록 | 텍스트 | `AuditNote` — '마지막 변경: 박관리 · …'. 픽스처 초기값 `{ updatedBy: '박관리', updatedAt: '2026-06-28T05:40:00.000Z' }`(`data-source.ts:26`) | O | FS-067-EL-013 과 같은 컴포넌트·규칙 |
| FS-068-EL-012 | FS-068-SEC-04 | 저장 상태 문구 | 텍스트 | `canUpdate` 일 때만. 3분기(`SettingsFormShell.tsx:168-174`) | — | FS-067-EL-014 와 동일 |
| FS-068-EL-013 | FS-068-SEC-04 | 저장 버튼 | 버튼 | `type="submit"` · `primary`. 비활성 조건 `!dirty \|\| saving \|\| loading` | O | **`canUpdate` 가 false 면 렌더되지 않는다**(EXC-03) |
| FS-068-EL-014 | FS-068-SEC-02 | 읽기 전용 안내 | 배너 | `!canUpdate` 면 info `Alert`: '조회 권한만 있습니다. 언어 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.'(`:44-45`) | — | 비표시 기본 |
| FS-068-EL-015 | FS-068-SEC-02 | 필드 일괄 비활성 규칙 | 텍스트 | `disabled = saving \|\| loading \|\| !canUpdate`(`:167`) | — | 비표시 규칙. 체크박스는 `disabled \|\| locked` 로 한 겹 더 |
| FS-068-EL-016 | FS-068-SEC-05 | 조회 실패 배너 | 배너 | 폼 대신 danger `Alert` '설정을 불러오지 못했습니다.' + '다시 시도'(`SettingsFormShell.tsx:125-138`) | O | 비표시. **i18n 안내 배너(EL-010)도 함께 사라진다** |
| FS-068-EL-017 | FS-068-SEC-06 | 첫 로딩 스켈레톤 | 스켈레톤 | `loading = isFetching && data === undefined`(`:165`) 면 4행 스켈레톤 + `aria-busy="true"` | — | 비표시. **재조회에서는 뜨지 않는다**(STATE-01 pass) |
| FS-068-EL-018 | FS-068-SEC-02 | 저장 실패 배너 | 배너 | danger `Alert` '언어 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`:219`) | O | 비표시. 표시 조건 `saveError !== null && pending === null && conflict === null`(`:283`) — **확인·충돌 다이얼로그가 떠 있으면 그 안에만 보인다.** ✔ 사이트 설정(`SiteSettingsPage.tsx:264`)이 `conflict === null` 을 빠뜨린 것과 달리 **이 화면은 정확하다** |
| FS-068-EL-019 | FS-068-SEC-07 | 저장 확인 다이얼로그 | 모달 | `onValid` → `setPending(values)`(`:227-230`) → `ConfirmDialog intent="update"` 제목 '언어 설정 저장', 문구 **고정** '언어 설정을 저장하면 이후 사이트가 노출하는 언어 목록이 바뀝니다. 저장할까요?'(`:47-48`) | — | 비표시. 사이트 설정과 달리 **분기 문구가 없다** — 이 화면의 저장은 방향(켜기/끄기)이 여럿이라 한 문장으로 요약된다. ⚠ **'무엇이' 바뀌는지 이름으로 말하지 않는다**(OAuth 화면은 말한다 — FS-070-EL-018.1)(§7 #6) |
| FS-068-EL-019.1 | FS-068-SEC-07 | 확인 취소 | 버튼 | `cancelSave`(`:237-244`) — abort · `save.reset()` · `lock.release()` · `saveError`·`pending` 비움 | — | 비표시. 진행 중 저장도 취소 |
| FS-068-EL-020 | FS-068-SEC-02 | 저장 실행 규칙 | 텍스트 | `runSave(values, force)`(`:190-225`): revision 없으면 중단 → `lock.acquire()` → `save.mutate({ value, expectedRevision, force, signal })` | O | 비표시 규칙. FS-067-EL-022 와 동일 구조 |
| FS-068-EL-020.1 | FS-068-SEC-02 | 동기 제출 잠금 | 텍스트 | `useSubmitLock()`(`_shared/queries.ts:58-75`) — `if (!lock.acquire()) return`(`:194`) | — | 비표시. **멱등키는 없다**(§7 #7) |
| FS-068-EL-020.2 | FS-068-SEC-02 | 저장 성공 처리 | 텍스트 | `lock.release()` → aborted 면 중단 → `reset(values)` → `pending`·`conflict` 비움 → 토스트 '언어 설정을 저장했습니다.'(`:203-210`) | O | 비표시. `useSaveSettings.onSuccess` 가 새 revision 을 캐시에 심는다(`_shared/queries.ts:45`) |
| FS-068-EL-021 | FS-068-SEC-02 | 언마운트 abort | 텍스트 | `useEffect(() => () => controllerRef.current?.abort(), [])`(`:154`) | — | 비표시 규칙 |
| FS-068-EL-021.1 | FS-068-SEC-02 | abort 는 실패가 아니다 | 텍스트 | `if (isAbort(cause) \|\| controller.signal.aborted) return;`(`:213`) · `onSuccess` 도 aborted 면 중단(`:205`) | — | 비표시 규칙(EXC-09) |
| FS-068-EL-022 | FS-068-SEC-08 | 충돌 다이얼로그 | 모달 | `isSettingsConflict(cause)`(`:214`) → `ConflictDialog subject="언어 설정"` 제목 '언어 설정이 이미 변경되었습니다' | O | 비표시. **입력 보존.** FS-067-EL-024 와 같은 계약 |
| FS-068-EL-022.1 | FS-068-SEC-08 | 달라진 항목 목록 | 텍스트 | `divergedLabels(getValues(), conflict.value, LANGUAGE_FIELD_LABELS)`(`:267-270`) — 라벨 '기본 언어'·'지원 언어'·'폴백 언어'(`data-source.ts:30-34`) | — | 비표시. **`supported` 는 배열이라 `diff.ts:13-20` 의 내용 비교가 필수** — 참조 비교면 `['ko']` 와 `['ko']` 가 '달라졌다'고 거짓말한다(`diff.ts:9-11` 이 이 화면을 예로 든다) |
| FS-068-EL-022.2 | FS-068-SEC-08 | '최신 내용 불러오기' | 버튼 | `reset(latest.value)` → `conflict` 비움 → `refetch()` → 토스트 '최신 언어 설정을 불러왔습니다.'(`:246-253`) | O | 내 입력을 버리는 선택 |
| FS-068-EL-022.3 | FS-068-SEC-08 | '내 변경으로 덮어쓰기' | 버튼 | `danger`. `runSave(getValues(), true)`(`:255-257`) | O | 상대의 변경을 버리는 선택 |
| FS-068-EL-022.4 | FS-068-SEC-08 | 충돌 다이얼로그 닫기 | 버튼 | `closeConflict`(`:259-265`) — abort · reset · `conflict` 비움 | — | 비표시. 세 번째 갈래 |
| FS-068-EL-023 | FS-068-SEC-09 | 미저장 이탈 가드 | 모달 | `useUnsavedChangesDialog(dirty && !saving, { message })`(`SettingsFormShell.tsx:122`). 문구 '언어 설정에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.'(`:41-42`) | — | 비표시. 3경로 |
| FS-068-EL-024 | FS-068-SEC-02 | 폼 초기값·리셋 규칙 | 텍스트 | `DEFAULT_FORM_VALUES = { defaultLanguage: 'ko', supported: ['ko'], fallback: 'ko' }`(`:118-122`)로 시작해 도착 시 `reset(data.value)`(`:156-159`) | O | 비표시. **편집 중 재조회가 오면 입력이 덮인다**(§7 #8) |
| FS-068-EL-025 | FS-068-SEC-02 | dirty 판정 | 텍스트 | RHF `formState.isDirty`(`:143`) | — | 비표시. EL-005 의 정규화가 무의미한 dirty 를 막는다 |
| FS-068-EL-026 | FS-068-SEC-02 | 제출 경로 | 텍스트 | `<form onSubmit={handleSubmit(onValid)} noValidate>`(`SettingsFormShell.tsx:144`) | — | 비표시. **`onInvalid` 가 없다** — 첫 오류로 포커스가 가지 않는다(§7 #2) |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-068-EL-001 | N/A — 정적 문구 | 로딩 중에도 표시(카드 밖) | 조회 실패 시 EL-016 이 화면을 대체해 함께 사라진다 | N/A — 입력 없음 | 권한과 무관 | N/A — 정적 | 고정 문구 |
| FS-068-EL-002 | N/A — 정적 문구 | 로딩 중에도 표시 | 조회 실패 시 사라진다 | N/A — 입력 없음 | 권한과 무관 | N/A — 정적 | 고정 문구 |
| FS-068-EL-003 | N/A — 항상 렌더 | 로딩 중에는 스켈레톤이 카드 본문을 대체해 미표시 | 조회 실패 시 미표시 | N/A — 컨테이너 | 권한과 무관하게 표시 | N/A — 정적 | 고정 |
| FS-068-EL-004 | **후보가 코드 상수 4건이라 0건이 될 수 없다**(`LANGUAGE_META`) | 로딩 중 미표시(스켈레톤) | 조회 실패 시 미표시 | N/A — 컨테이너 | 비활성 | 후보 목록은 서버가 주지 않는다 — 재조회와 무관 | **4건 고정** — 상한 문제가 없다 |
| FS-068-EL-004.1 | N/A — 항상 4개 | `disabled`(EL-015) | 저장 실패는 EL-018 | 개별 체크박스에 검증이 없다 — 그룹 규칙이 EL-006 에 뜬다 | `!canUpdate` 면 값이 보이되 비활성 | 재조회가 오면 체크 상태가 덮인다(EL-024 · §7 #8) | 4개 고정 |
| FS-068-EL-004.2 | N/A — 메타 상수 | 위와 동일 | 위와 동일 | N/A — 표시 전용 | 권한과 무관하게 표시 | N/A — 상수 | 4개 고정 |
| FS-068-EL-004.3 | N/A — 잠겨야 성립 | 로딩 중 미표시 | N/A — 표시 전용 | N/A — 표시 전용 | 권한과 무관 — **읽기 전용 역할도 왜 잠겼는지 본다** | 기본/폴백이 바뀌면 즉시 따라 바뀐다 | 최대 2개(기본·폴백이 같으면 1개) |
| FS-068-EL-004.4 | N/A — 규칙 | N/A — 동기 판정 | N/A — 서버 호출 없음 | **이 규칙이 유효성 위반을 예방한다** — 스키마가 거부할 상태를 만들지 않는다 | N/A | 드래프트 기준이라 재조회와 무관 | N/A — 순수 판정 |
| FS-068-EL-005 | 마지막 하나를 끄면 `supported` 가 `[]` 가 될 수 있다 — **잠금(EL-004.4)이 기본/폴백을 지키므로 실제로는 최소 1개가 남는다**(기본·폴백이 항상 지원 목록 안에 있어야 하고 둘 다 잠겨 있다) | 비활성이라 토글이 걸리지 않는다 | N/A — 서버 호출 없음 | `shouldValidate: true` 라 토글 즉시 스키마가 돈다 | 비활성 | N/A — 로컬 변환 | 4건 정규화 — 상수 비용 |
| FS-068-EL-006 | **`supported` 가 0건이면 이 오류가 뜬다** — 그것이 이 요소의 존재 이유 | 로딩 중 미표시 | N/A — 로컬 검증 | **이것이 그룹 유효성 표현.** '지원 언어를 하나 이상 선택하세요.' | 비활성이라 위반을 만들 수 없다 | N/A — 로컬 판정 | 1건만 표시 |
| FS-068-EL-007 | **`selectable` 이 비면 `<option>` 이 0개** — 빈 select 가 된다(§7 #9) | `disabled` | 저장 실패는 EL-018 | `z.enum(LANGUAGE_CODES)` + 교차 규칙('기본 언어는 지원 언어 목록에 있어야 합니다.'). 오류 시 `isInvalid` + `aria-describedby` | 비활성 | 충돌 시 '기본 언어'로 짚힌다 | 최대 4개 옵션 |
| FS-068-EL-008 | 위와 동일 | `disabled` | 저장 실패는 EL-018 | `z.enum` + 교차 규칙('폴백 언어는 지원 언어 목록에 있어야 합니다.') | 비활성 | 충돌 시 '폴백 언어'로 짚힌다 | 최대 4개 옵션 |
| FS-068-EL-009 | `supported` 가 0이면 '지원 0개' | 로딩 중 미표시 | 조회 실패 시 미표시 | N/A — 파생 표시 | 권한과 무관하게 표시 | 드래프트 기준 — 즉시 갱신 | 상수 비용 |
| FS-068-EL-010 | N/A — **조건 없이 항상 표시** | **로딩 중에도 표시된다**(warning 슬롯이 스켈레톤 위에 있다 — `SettingsFormShell.tsx:150-152`) | 조회 실패 시 폼째 사라진다 | N/A — 표시 전용 | 권한과 무관하게 표시 | N/A — 정적 | 고정 문구 |
| FS-068-EL-011 | `audit === null` 이면 미표시 | `loading` 이면 미표시 | 조회 실패 시 폼째 사라진다 | N/A — 표시 전용 | 권한과 무관 — 읽기 전용 역할도 본다 | 저장 성공 시 새 감사 정보로 갱신 | 1건 |
| FS-068-EL-012 | N/A — 3분기 중 하나 | '저장하는 중입니다…' | N/A — 실패는 EL-018 | N/A — 표시 전용 | **`!canUpdate` 면 렌더되지 않는다** | 기준선이 바뀌면 판정도 바뀐다 | 고정 문구 |
| FS-068-EL-013 | N/A — 항상 표시(권한 있으면) | '저장 중…' + 비활성 | 실패 시 EL-018, 버튼 재활성, **입력 보존** | 미변경·로딩 중 비활성. 검증 실패는 제출을 막는다 | **렌더되지 않는다**(EXC-03) | 성공이 새 revision 을 캐시에 심는다 | 단건 |
| FS-068-EL-014 | N/A — 권한이 없어야 성립 | 로딩 중에도 표시 | 조회 실패 시 폼째 사라진다 | N/A — 표시 전용 | **이것이 권한없음 표현** | 권한 스토어 변경 시 재렌더(강등 reconcile) | 1건 |
| FS-068-EL-015 | N/A — 규칙 | `loading` 이 입력 | `saving` 이 입력 | N/A | `!canUpdate` 가 입력 | N/A | 전 필드 일괄 |
| FS-068-EL-016 | N/A — 실패 상태 | 재시도 시 스켈레톤으로 | **이것이 조회 실패 표현.** 문구 1종 + '다시 시도'. **status 를 구분하지 않는다**(§7 #10) | N/A — 입력 없음 | read 권한 부족은 여기 오지 않는다 — `RequirePermission` 이 403 화면(§4.1) | 재시도는 같은 조회를 재발행 | N/A |
| FS-068-EL-017 | N/A — 도착 전 | **이것이 로딩 표현.** 4행 + `aria-busy` | 조회 실패 시 EL-016 으로 | N/A | 권한과 무관 | **재조회에서는 뜨지 않는다** | 4행 고정(실제 필드 수와 무관) |
| FS-068-EL-018 | N/A — 오류가 있어야 성립 | 재저장 시 먼저 지운다(`:196`) | **이것이 저장 실패 표현.** 문구 1종. abort 는 표시하지 않는다 | 검증 실패는 여기 오지 않는다 | 서버 403 도 이 문구로 뭉개진다 | **409 는 여기 오지 않는다** — EL-022 로 갈린다 | 1건 |
| FS-068-EL-019 | N/A — 제출이 있어야 성립 | `busy={saving}` → 확인 버튼 '처리 중…' + 잠김. 취소는 살아 있다 | 실패해도 **닫지 않는다** — 다이얼로그 안 배너 | **검증 통과 값만 도달** | 저장 버튼이 없어 도달 불가 | 확인 중 상대가 저장하면 확인 후 409 → EL-022 | 1건 |
| FS-068-EL-019.1 | N/A — 다이얼로그가 떠야 성립 | 저장 중에도 누를 수 있다(abort 경로) | abort 는 통지하지 않는다 | N/A | N/A | 서버 도달 여부는 보장하지 않는다(§7 #11) | 단건 |
| FS-068-EL-020 | N/A — 규칙 | revision 없으면(로딩 중) 중단 | 실패는 EL-018 또는 EL-022 로 갈린다 | N/A — 검증은 상류에서 | N/A | `expectedRevision` 이 핵심 | 단건 |
| FS-068-EL-020.1 | N/A — 규칙 | 렌더와 무관하게 즉시 | 양쪽에서 `release`(`:204,212`) | N/A | N/A | **연타의 2번째가 멈춘다** | **멱등키 없음** — 재시도는 낡은 revision 때문에 409(§7 #7) |
| FS-068-EL-020.2 | N/A — 성공이 있어야 성립 | N/A | N/A | N/A | N/A | `setQueryData` 로 새 revision 즉시 반영 | 단건 |
| FS-068-EL-021 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | abort 는 실패가 아니다 | N/A | N/A | 서버 도달 여부는 미보장(§7 #11) | 단건 |
| FS-068-EL-021.1 | N/A — 규칙 | N/A | **이것이 abort 판정 규칙**(EXC-09) | N/A | N/A | `signal.aborted` 를 양쪽에서 확인 | 단건 |
| FS-068-EL-022 | N/A — 충돌이 있어야 성립 | `busy={saving}` — 두 액션 잠김 | 덮어쓰기 실패 시 다이얼로그 안 배너. ✔ EL-018 이 중복 표시되지 않는다(`:283` 이 `conflict === null` 검사) | N/A — 입력 없음 | 저장 불가라 도달 불가 | **이것이 경합 표현.** revision 토큰 기반(BE-068 §7.2) | 1건 |
| FS-068-EL-022.1 | 갈린 항목이 0개면 목록을 그리지 않는다 | N/A — 순수 계산 | N/A | N/A | N/A | `getValues()` vs `conflict.value` | 최대 3개 라벨 |
| FS-068-EL-022.2 | N/A | `busy` 면 잠김 | `refetch()` 실패 시 EL-016 이 폼을 대체 — 불러온 값은 이미 폼에 있다 | N/A | N/A | reset 후 refetch 로 최신 revision 재취득 | 단건 |
| FS-068-EL-022.3 | N/A | `busy` 면 '처리 중…' | 실패 시 다이얼로그 유지 + 배너. 재클릭이 재시도 | N/A | N/A | **`force: true` — 상대 변경이 사라진다** | 단건 |
| FS-068-EL-022.4 | N/A | 진행 중 저장을 abort | abort 는 통지하지 않는다 | N/A | N/A | 닫아도 revision 이 낡아 재저장 시 또 409 | 단건 |
| FS-068-EL-023 | N/A — dirty 여야 성립 | **저장 중 가드가 꺼진다**(`dirty && !saving`) | N/A — 서버 호출 없음 | N/A | `!canUpdate` 면 편집 불가라 dirty 가 안 된다 | 저장 성공 후 `reset` 으로 dirty 해제 | N/A |
| FS-068-EL-024 | 도착 전 `DEFAULT_FORM_VALUES`(스켈레톤에 덮인다) | `data === undefined` 면 reset 안 함 | 조회 실패 시 폼 미렌더 | N/A — 규칙 | N/A | **편집 중 재조회가 입력을 덮는다**(§7 #8) | 단건 문서 |
| FS-068-EL-025 | 기준선과 같으면 not-dirty | N/A — 동기 | N/A | N/A | N/A | 기준선이 바뀌면 판정도 바뀐다 | N/A |
| FS-068-EL-026 | N/A — 제출이 있어야 성립 | 저장 중 버튼 비활성 + EL-020.1 | N/A — 검증은 로컬 | **이것이 유효성 게이트.** `noValidate` + zod | 권한 없으면 submit 버튼이 없다 | N/A | 3필드 일괄 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 조회 실패는 폼을 대체하는 인라인 배너(EL-016), 저장 실패는 카드 배너(EL-018). **오프라인 감지·복귀 재조회가 앱 전역에 없다**(`navigator.onLine` grep 0건) — §7 #11 |
| 세션 만료 | 401 은 앱 전역 인터셉터(`shared/query/queryClient.ts`)가 받아 `/login?returnUrl=/settings/languages&reason=session_expired` 로 보낸다. **미저장 입력은 그때 사라진다** — 프로그램적 이동이라 EL-023 가드가 발화하지 않는다 — §7 #11 |
| 요청 타임아웃 | 프론트 상한 없음(`AbortSignal.timeout` 앱 전역 0건). abort 는 언마운트·확인 취소·충돌 닫기에서만 — §7 #11 |
| 중복 제출 | `disabled` + **동기 잠금 `useSubmitLock`**(EL-020.1). **멱등키 없음** — `expectedRevision` 이 있어 재시도는 **중복 적용이 아니라 409**(§7 #7) |
| 실패 통지의 자리 | ① 조회 실패 = 폼 대체 배너 ② 저장 실패 = 카드 배너(다이얼로그가 떠 있으면 그 안에만 — `:283` 이 세 조건을 전부 본다) ③ 저장 **성공** = 토스트 ④ 409 = 충돌 다이얼로그 ⑤ abort = 아무것도 띄우지 않는다 |
| 낙관적 업데이트 | **이 화면에 없다.** 저장은 비관적 — 롤백 경로가 필요 없다 |
| 동시 조회 | `useSettingsQuery` 가 `queryKey: ['settings','languages']` 로 1건만 유지. 전역 `staleTime` 30초 · `retry: false` · `refetchOnWindowFocus: false` 를 따른다(재정의 없음) |
| 권한 없음 | **read** — `RequirePermission` 이 `<Outlet>` 을 감싸 403 화면(`AppShell.tsx:20`). 리소스는 `page:/settings/languages`(`route-resource.ts:32-35`). **write** — `useRouteWritePermissions().canUpdate`(`:126`)가 저장 컨트롤을 게이팅(EL-013·EL-014). 권한 스토어 변경 시 재렌더 → **강등 reconcile 이 별도 코드 없이 성립**(`RequirePermission.tsx:23-25`). 서버 403 은닉 정책은 BE-068 §7.5 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바깥에 `ErrorBoundary`(`AppShell.tsx:484`) — 사이드바가 남고 `RouteErrorScreen` |
| 프론트 검증은 보증이 아니다 | zod 는 UX 다. 서버가 같은 규칙을 다시 검증한다(BE-068 §7.1) — `data-source.ts:22` 심이 `422 → 검증 실패` 를 명시 |
| **DS 배럴 우회** | `Checkbox` 를 앱 배럴(`shared/ui`)이 아니라 `@tds/ui` public entry 에서 직접 가져온다(`:16-18`). 이유가 코드에 있다: 'LoginForm 선례 — 배럴은 F2 소유라 이번 배치에서 넓히지 않는다'. **의도된 우회이며 결함이 아니다** — 다만 배럴 일관성 축에서 §7 #12 |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 | 비고 |
|---|---|---|---|---|---|
| FS-068-EL-011 / EL-016 / EL-017 / EL-024 | 언어 설정 조회 | R | `{ value: LanguageSettingsValues, revision, audit }` | `languageSettingsStore.fetch(signal)` (`_shared/store.ts:108-112`) | `useSettingsQuery(languageSettingsKey, languageSettingsStore)` |
| FS-068-EL-013 / EL-018 / EL-020 / EL-020.2 / EL-022 | 언어 설정 저장 | W | `{ value, expectedRevision, force? }` | `languageSettingsStore.save(input, signal)` (`_shared/store.ts:114-134`) | `useSaveSettings`. **revision 불일치 → `SettingsConflictError`(최신 문서 동봉)** |
| FS-068-EL-022.2 | 최신 내용 재조회 | R | 위와 동일 | `refetch()` (react-query) | 충돌 해소 경로 |
| FS-068-EL-004 / EL-004.2 | 언어 후보 목록 | — | — | **없음 — `LANGUAGE_META` 코드 상수**(`validation.ts:34-39`) | **서버를 거치지 않는다.** 후보 4종(`ko`·`en`·`ja`·`zh-CN`)은 빌드 시점에 고정되며, 새 언어를 추가하려면 코드를 고쳐야 한다. **이것은 누락이 아니라 의도** — 번역할 두 번째 언어가 아직 없다(§1 범위 밖 · BE-068 §7.6) |

> **현재 구현 상태 (A63 참고)**: 백엔드는 없다. `languageSettingsStore` 는 `createRevisionedStore('languages', DEFAULT_LANGUAGE_SETTINGS, { updatedBy: '박관리', updatedAt: '2026-06-28T05:40:00.000Z' })`(`data-source.ts:23-27`)로 만든 **브라우저 안 mutable 클로저 1건**에 400ms 지연(`LATENCY_MS`)과 실패 스위치(`failIfRequested('languages', op)`)를 얹은 것이다 — 실제 네트워크 0건. 픽스처는 **한국어 하나만 켜져 있다**(`{ defaultLanguage: 'ko', supported: ['ko'], fallback: 'ko' }`) — `data-source.ts:11-13` 이 그 이유를 밝힌다: '이 앱의 사실을 그대로 반영한 픽스처다(영어를 켜 두면 화면은 "지원함" 이라 말하는데 번역이 없어 거짓말이 된다)'. 저장 주체는 하드코딩 `CURRENT_ADMIN = '김운영'`(`store.ts:84`). 새로고침하면 시드로 돌아간다. 연동 심은 `data-source.ts:20-22` 의 `// TODO(backend): GET /api/settings/languages · PUT /api/settings/languages` 하나이며 **`If-Match: <revision>` 헤더·바디·응답(200/409·412/422)까지 명시돼 있다** — BE-068 §4 는 이 심을 그대로 계약으로 옮긴 것이며 발명한 엔드포인트가 없다. 위 표는 백엔드 연결 후 의도된 동작이다. |

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `LanguagesPage.tsx` · `data-source.ts` · `validation.ts` · `languages.test.ts` · `_shared/{SettingsFormShell,ConflictDialog,AuditNote,queries,store,diff}`
- [x] 보이지 않는 요소(스켈레톤·조회/저장 실패 배너·읽기전용 안내·확인/충돌 다이얼로그·이탈 가드·잠금 판정·토글 정규화·동기 잠금·abort 규칙·dirty 판정·reset 규칙)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. **어댑터를 거치지 않는 언어 후보 목록(코드 상수)을 '없음'으로 명시**하고 그것이 의도임을 밝혔다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-068 영역)
- [x] **in-content `<h1>` 이 없음을 grep 으로 확인**하고 EL-001 에 기록했다 — IA-02 판정 근거
- [x] **'번역이 적용되지 않는다'가 결함이 아니라 명세된 동작**임을 §1 범위 밖 + EL-010 에 고정했다
- [x] §7 의 미결 항목이 BE-068 §7.6 · NFR-068 §5 와 일치한다

## 7. 미결 사항 (A11 / A01 / A63 / A40 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (시스템 설정 SCR 미작성) | A11 / A01 |
| 2 | **검증 실패 시 첫 오류 필드로 포커스가 가지 않는다** — `handleSubmit(onValid)`(`:296`)에 `onInvalid` 가 없다(quality-bar A11Y-13 P1). 설정 4화면 공통 | A11 change_request |
| 3 | **지원 언어 그룹 오류(EL-006)가 어느 컨트롤의 것인지 프로그램적으로 연결되지 않는다** — `errorIdOf('lang-supported')` id 를 만들지만 `lang-supported` 라는 id 의 요소가 **존재하지 않고**(체크박스는 `lang-supported-ko` 등), 어떤 컨트롤도 이 오류를 `aria-describedby` 로 참조하지 않는다. `role="alert"` 라 announce 는 되나 필드 연결은 끊겨 있다. `<fieldset>` 에 `aria-describedby` 를 물리는 것이 옳은 해법 | A11 change_request |
| 4 | **잠긴 체크박스(EL-004.1)와 잠금 사유(EL-004.3)가 연결돼 있지 않다** — `disabled` 체크박스에 `aria-describedby` 가 없어 **왜 끌 수 없는지 AT 가 알 수 없다.** 시각 사용자만 이탤릭 문구를 본다 | A11 change_request |
| 5 | **nav 라벨('언어 관리')과 카드 제목('언어 설정')이 다르다** — AppHeader `<h1>` 은 '언어 관리', 카드는 '언어 설정'. 같은 화면을 두 이름으로 부른다. 다른 3화면은 일치한다(사이트 설정·API Key·OAuth 설정) | A11 change_request · A01 |
| 6 | 저장 확인 문구(EL-019)가 **고정 문구라 무엇이 바뀌는지 말하지 않는다** — '이후 사이트가 노출하는 언어 목록이 바뀝니다'까지만이고 어느 언어를 켜고 끄는지 이름으로 말하지 않는다. **OAuth 화면은 말한다**(`OAuthPage.tsx:48-74` `saveConfirmMessage` — '카카오 로그인을 끕니다…'). 같은 섹션 안에서 확인 문구의 구체성이 갈렸다 | A11 change_request |
| 7 | 저장에 **멱등키가 없다** — 동기 잠금(EL-020.1)은 연타를 막지만 응답 유실 후 재시도는 새 요청이 된다. `expectedRevision` 덕에 중복 적용이 아니라 **409** 가 되나 사용자는 영문 모를 충돌 다이얼로그를 본다. 선례: `members/components/PointsCard.tsx:103,162-173`(quality-bar EXC-08 P0) | A11 · A63 (BE-068 §7.4) |
| 8 | 데이터 도착 시 `reset(data.value)` 하는 효과(EL-024)가 **편집 중 재조회에서도 돈다** — 입력이 덮인다. 설정 4화면 공통 | A11 change_request |
| 9 | **`selectable` 이 비면 기본/폴백 select 가 빈 `<option>` 목록이 된다**(EL-007) — 잠금 규칙(EL-004.4) 덕에 현재는 도달 불가하나, 잠금이 드래프트 기준이라 **기본·폴백을 같은 언어로 몰아 둔 채 그 언어를 끄는 경로가 없음을 보장하는 것은 잠금 하나뿐**이다. select 가 비면 사용자는 아무것도 고를 수 없고 오류 문구도 없다 — 방어가 한 겹이다 | A11 change_request |
| 10 | 조회 실패(EL-016)·저장 실패(EL-018)가 **status 를 구분하지 않는다** — 401/403/404/500 이 한 문구다. `createRevisionedStore` 가 `HttpError`(status 보유)를 던지지 않아 화면이 분기할 근거가 없다(quality-bar EXC-06 · EXC-12 P1) | A11 · A63 |
| 11 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료 리다이렉트가 미저장 입력을 버린다 · 이탈 시 abort 가 서버 도달 여부를 보장하지 않는다(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | A11 · A40 · A63 |
| 12 | `Checkbox` 를 앱 배럴이 아니라 `@tds/ui` 에서 직접 가져온다(`:16-18`) — **의도된 우회**(배럴은 F2 소유)이나 배럴 일관성이 깨져 있다. `CreateApiKeyModal.tsx:15` 도 같다 — 두 곳이다 | A11 (배럴 확장은 F2) |
| 13 | 스켈레톤 행 수가 하드코딩 `[0, 1, 2, 3]`(`SettingsFormShell.tsx:154`) — 이 화면의 실제 필드 수(체크박스 4 + select 2)와 무관(quality-bar COMP-06 P2) | A11 change_request |
| 14 | **i18n 미도입이 이 화면 전체를 '저장은 되지만 아무 일도 일어나지 않는' 상태로 둔다**(§1 범위 밖 · EL-010). 화면이 정직하게 밝히므로 결함은 아니나, **소비자가 생기기 전까지 이 계약은 죽은 데이터를 쌓는다.** `validation.ts:12-18` 의 `// TODO(lib): i18n` 이 도입 조건(두 번째 로케일이 실제로 필요해지는 시점)과 선행 조건(EXC-17 문자열 추출)을 밝힌다 | A01 (도메인 경계) · A11 |
</content>
