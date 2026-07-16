---
id: FS-067
title: "사이트 설정"
screen: SCR-067               # ⚠ 시스템 설정 SCR 미작성 — §7 미결 사항 참조
route: /settings/site
owner: A62
reviewer: A64
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-067. 사이트 설정

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 사이트의 이름·설명·기본 URL·대표 연락처·표시 시간대와 **두 개의 스위치**(회원가입 허용 · 유지보수 모드)를 한 폼에서 정하고 저장한다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — 권한은 `useRouteWritePermissions` 로 게이팅한다. §4.1) |
| 진입 경로 | 좌측 GNB > 시스템 > 시스템 설정 > 사이트 설정 (`nav-config.ts:227` `['사이트 설정', '/settings/site']`) |
| 포함 화면 | 단일 라우트 `/settings/site` — **하위 라우트가 없다(잎)** |
| **범위 밖** | **유지보수 모드의 실제 적용** — 이 화면은 값을 저장할 뿐 방문자 사이트를 내리는 주체가 아니다(백엔드·프론트 게이트웨이 소관). **시간대의 실제 적용** — `timezone` 은 저장되지만 이 앱의 날짜 렌더가 그 값을 읽지 않는다(`shared/format` 은 브라우저 로컬·UTC 정오 앵커) — §7 #6 |
| 구현 경로 | `apps/admin/src/pages/settings/site/**` (`SiteSettingsPage.tsx` · `data-source.ts` · `validation.ts` · `site.test.ts`) · 공유 `pages/settings/_shared/**` |
| 대응 SCR | SCR-067 (미작성 — §7 #1) |
| 공통 컴포넌트 | `settings/_shared/{SettingsFormShell,ConflictDialog,AuditNote,TextInputField(fields.tsx),useSettingsQuery,useSaveSettings,useSubmitLock,createRevisionedStore,divergedLabels,formatAuditAt,normalizePhone}` · `shared/ui/{Alert,ConfirmDialog,FormField,SelectField,ToggleSwitch,useToast,useUnsavedChangesDialog}` · `shared/permissions/RequirePermission(useRouteWritePermissions)` · `shared/form/zodResolver` · `shared/async(isAbort)` |

> **검증의 정본은 화면이 아니라 zod 스키마다**(`validation.ts` `siteSettingsSchema`) — FS-007 §1.1 이 고객 설정에서 세운 원칙을 그대로 따른다. 화면은 입력을 막지 않고, 제출 시점에 스키마가 판정한다.

### 1.1 이 화면의 설계 원칙 (요구사항 — 명세에 고정한다)

| 원칙 | 내용과 이유 (코드 근거) |
|---|---|
| **유지보수 모드는 세 겹으로 막는다** | ① 스위치를 켜면 그 자리에서 danger 경고(`SiteSettingsPage.tsx:271-278`) ② 저장이 확인 다이얼로그를 거치고 문구가 전환 방향을 명시(`:97-105` `saveConfirmMessage`) ③ 안내 문구가 비면 스키마가 저장을 거부(`validation.ts:60-67`). 켜는 순간 방문자가 사이트를 쓸 수 없기 때문이다 |
| **동시 편집을 덮어쓰지 않는다** | 저장은 내가 읽은 `revision`(낙관적 동시성 토큰)을 함께 보내고, 어긋나면 409 로 거절돼 충돌 다이얼로그가 뜬다(`_shared/store.ts:124-126`). **입력은 그대로 살아 있다** — FS-067-EL-024 |
| **권한이 없으면 저장 컨트롤이 없다** | `canUpdate` 가 false 면 저장 버튼·상태 문구를 **렌더하지 않는다**(`_shared/SettingsFormShell.tsx:166-184`) — 눌러 보고 403 을 받는 자리를 만들지 않는다 |
| **첫 로딩과 재조회를 구분한다** | `loading = isFetching && data === undefined`(`SiteSettingsPage.tsx:153`) — 재조회 중에는 이전 값을 유지한다(STATE-01) |

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-067-SEC-01 | 화면 안내문 | 카드 위 muted 문구. 필수 표기 규칙을 밝힌다 |
| FS-067-SEC-02 | 설정 카드 | 제목 + (저장 실패 배너 · 읽기전용 안내 · 유지보수 경고) + 필드 9종 + 푸터 |
| FS-067-SEC-03 | 카드 푸터 | 감사 기록 + 저장 상태 문구 + 저장 버튼 |
| FS-067-SEC-04 | 조회 실패 배너(비표시 기본) | 폼 전체를 대체 |
| FS-067-SEC-05 | 첫 로딩 스켈레톤(비표시 기본) | 필드 자리를 대체 |
| FS-067-SEC-06 | 저장 확인 다이얼로그(비표시 기본) | 유지보수 전환이면 문구가 그 사실을 앞세운다 |
| FS-067-SEC-07 | 동시 편집 충돌 다이얼로그(비표시 기본) | 3-액션(불러오기·덮어쓰기·닫기) |
| FS-067-SEC-08 | 미저장 이탈 가드(비표시 기본) | 3경로 discard 확인 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-067-EL-001 | FS-067-SEC-01 | 화면 안내문 | 텍스트 | `<p>` '별표(*) 항목은 필수입니다. 저장하면 사이트 전반에 즉시 반영됩니다.'(`SiteSettingsPage.tsx:260`) | — | **in-content `<h1>` 이 없다** — 화면 제목은 AppHeader 가 nav 잎 라벨('사이트 설정')로 그린다(IA-02 pass 근거 — NFR-067 §2) |
| FS-067-EL-002 | FS-067-SEC-02 | 카드 제목 | 텍스트 | `CardTitle` '사이트 설정'(`:259`) | — | `<h1>` 이 아니다 — 카드 제목 시맨틱 |
| FS-067-EL-003 | FS-067-SEC-02 | 사이트명 입력 | 입력 | `TextInputField id="site-name"` 라벨 '사이트명', **required**. `maxLength=60`(`SITE_NAME_MAX`), 카운터 `N/60`, placeholder '예: TDS 스페이스플래닝'. 자식이 `<input>` 이라 `FormField` 가 `aria-required` 를 주입한다 | O | 비면 '사이트명을 입력하세요.' · 60자 초과 시 '사이트명은 60자를 넘을 수 없습니다.'(`validation.ts:29-32`) |
| FS-067-EL-004 | FS-067-SEC-02 | 사이트 설명 입력 | 입력 | `TextInputField id="site-description"` 라벨 '사이트 설명', **선택**. `maxLength=160`, 카운터 `N/160`, 힌트 '검색 결과에 노출되는 문구입니다.' | O | 빈 값 허용(`optionalText`) |
| FS-067-EL-005 | FS-067-SEC-02 | 기본 URL 입력 | 입력 | `TextInputField id="site-base-url"` 라벨 '기본 URL', **required**, `type="url"` · `inputMode="url"`, 힌트 'https:// 로 시작하는 사이트 주소입니다.', placeholder 'https://example.com' | O | **https 만 받는다**(`HTTPS_URL_RE` — `validation.ts:25`). 근거: 사이트 주소가 http 면 로그인 쿠키가 평문으로 흐른다. `maxLength` 없음 |
| FS-067-EL-006 | FS-067-SEC-02 | 대표 이메일 입력 | 입력 | `TextInputField id="site-contact-email"` 라벨 '대표 이메일', **required**, `type="email"` · `inputMode="email"` | O | 형식 검사는 '@ 앞뒤가 비지 않고 도메인에 점이 있다'까지만(`_shared/validation.ts:35` `EMAIL_RE`) — RFC 5322 전체를 흉내 내지 않는다(실재 주소를 거절하지 않기 위해) |
| FS-067-EL-007 | FS-067-SEC-02 | 대표 전화번호 입력 | 입력 | `TextInputField id="site-contact-phone"` 라벨 '대표 전화번호', **required**, `inputMode="tel"`, placeholder '02-1234-5678' | O | 규칙 `PHONE_RE`(`_shared/validation.ts:45`): `02-000-0000` · `010-0000-0000` · `1588-0000` |
| FS-067-EL-007.1 | FS-067-SEC-02 | 전화번호 blur 정규화 | 텍스트 | 포커스를 잃을 때 `normalizePhone(value)` 결과가 원본과 다르면 `setValue(..., { shouldDirty: true, shouldValidate: true })` 로 갈아끼운다(`SiteSettingsPage.tsx:339-349`) | — | 비표시 규칙. `'+82 2 1234 5678'` → `'02-1234-5678'`. 붙여넣은 값을 사람이 고치게 하지 않는다(ERP-14 취지). **입력 중에는 정규화하지 않는다**(커서가 튀지 않게) |
| FS-067-EL-008 | FS-067-SEC-02 | 표시 시간대 select | 입력 | `FormField htmlFor="site-timezone"` 라벨 '표시 시간대', **required**. 자식이 DS `SelectField` 라 `aria-required` 가 주입된다(`FormField.tsx:40`). 선택지 2개: '(GMT+09:00) 서울'(`Asia/Seoul`) · '(GMT+00:00) UTC' | O | 목록이 짧은 이유는 '운영진이 보는 시각'이지 사용자별 로컬 타임존이 아니기 때문(`validation.ts:14-20`). **저장될 뿐 이 앱의 날짜 렌더가 이 값을 읽지 않는다** — §7 #6 |
| FS-067-EL-009 | FS-067-SEC-02 | 회원가입 허용 스위치 | 입력 | `ToggleSwitch` 접근 이름 '회원가입 허용'. 행 좌측에 라벨 + 힌트 '끄면 새 회원이 가입할 수 없습니다. 기존 회원은 그대로입니다.'. `onChange` → `setValue('signupEnabled', next, { shouldDirty: true })` | O | **`shouldValidate` 를 주지 않는다**(유지보수 스위치와 다르다 — 이 값에는 교차 규칙이 없다). 라벨이 시각 텍스트(`switchLabelStyle`)와 ToggleSwitch 의 접근 이름 양쪽에 있다 |
| FS-067-EL-010 | FS-067-SEC-02 | 유지보수 모드 스위치 | 입력 | `ToggleSwitch` 접근 이름 '유지보수 모드'. 힌트 '켜면 방문자는 사이트를 이용할 수 없고 안내 문구만 보게 됩니다. 관리자는 계속 접속할 수 있습니다.'. `onChange` → `setValue('maintenanceMode', next, { shouldDirty: true, shouldValidate: true })` | O | **`shouldValidate: true`** — 켜는 즉시 안내 문구 필수 규칙이 걸려야 하기 때문(`validation.ts:60-67`) |
| FS-067-EL-011 | FS-067-SEC-02 | 유지보수 경고 배너 | 배너 | `maintenanceMode` 가 true 면 카드 상단(필드 위) danger `Alert`: '유지보수 모드가 켜져 있습니다. 저장하면 방문자는 사이트를 이용할 수 없고 아래 안내 문구만 보게 됩니다.'(`SiteSettingsPage.tsx:272-277`) | — | 비표시 기본. **저장 전에** 무슨 일이 일어날지 알린다 — 저장된 상태가 아니라 **드래프트** 값을 따른다 |
| FS-067-EL-012 | FS-067-SEC-02 | 유지보수 안내 문구 입력 | 입력 | **`maintenanceMode` 가 true 일 때만 렌더된다**(`:399-412`). `TextInputField id="site-maintenance-message"` 라벨 '유지보수 안내 문구', **required**, `maxLength=200`, 카운터 `N/200`, 힌트 '방문자가 보게 될 문구입니다.' | O | 비면 '유지보수 모드를 켜면 방문자에게 보여줄 안내 문구가 필요합니다.'(`validation.ts:65`). **꺼져 있으면 자리를 차지하지 않는다** — 값은 폼 상태에 남는다 |
| FS-067-EL-013 | FS-067-SEC-03 | 감사 기록 | 텍스트 | `AuditNote` — '마지막 변경: 김운영 · 3시간전'. 본문은 상대 시각(`formatRelativeOrDate`), `title` 속성은 절대 시각(`formatDateTime`)(`AuditNote.tsx:31-33`). `audit !== null && !loading` 일 때만 | O | 상대만 쓰면 감사 정확도가 없고, 절대만 쓰면 '최근인가'를 즉시 알 수 없다 — 둘 다 준다 |
| FS-067-EL-014 | FS-067-SEC-03 | 저장 상태 문구 | 텍스트 | `canUpdate` 일 때만. 3분기: 저장 중 '저장하는 중입니다…' / dirty '저장하지 않은 변경 사항이 있습니다.' / 그 외 '변경 사항이 없습니다.'(`SettingsFormShell.tsx:168-174`) | — | 비활성 버튼이 '왜' 비활성인지 문구가 말한다 |
| FS-067-EL-015 | FS-067-SEC-03 | 저장 버튼 | 버튼 | `type="submit"` · `primary` · `size="md"`. 라벨 '저장 중…'/'저장'. **비활성 조건**: `!dirty \|\| saving \|\| loading`(`SettingsFormShell.tsx:179`) | O | **`canUpdate` 가 false 면 이 버튼과 EL-014 가 아예 렌더되지 않는다**(EXC-03) |
| FS-067-EL-016 | FS-067-SEC-02 | 읽기 전용 안내 | 배너 | `!canUpdate` 면 카드 상단 info `Alert`: '조회 권한만 있습니다. 사이트 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.'(`SiteSettingsPage.tsx:54-55`) | — | 비표시 기본. 버튼을 감추기만 하지 않고 **이유**를 말한다 |
| FS-067-EL-017 | FS-067-SEC-02 | 필드 일괄 비활성 규칙 | 텍스트 | `disabled = saving \|\| loading \|\| !canUpdate`(`SiteSettingsPage.tsx:254`) 를 9개 필드 전부에 넘긴다 | — | 비표시 규칙. 읽기 전용 역할에게는 값이 **보이되 편집되지 않는다** |
| FS-067-EL-018 | FS-067-SEC-04 | 조회 실패 배너 | 배너 | 조회 실패 시 **폼 대신** danger `Alert` '설정을 불러오지 못했습니다.' + '다시 시도'(`refetch`)(`SettingsFormShell.tsx:125-138`) | O | 비표시 기본. 토스트로 알리지 않는다(STATE-02). 이때 안내문·카드·푸터가 전부 사라진다 |
| FS-067-EL-019 | FS-067-SEC-05 | 첫 로딩 스켈레톤 | 스켈레톤 | `loading` 이면 필드 자리에 `tds-ui-skeleton` **4행 고정** + `aria-busy="true"`(`SettingsFormShell.tsx:152-157`) | — | 비표시. **`isFetching && data === undefined` 기준** — 재조회에서는 뜨지 않고 이전 값이 유지된다(STATE-01 pass). 행 수는 하드코딩 `[0,1,2,3]` |
| FS-067-EL-020 | FS-067-SEC-02 | 저장 실패 배너 | 배너 | 카드 상단 danger `Alert` '사이트 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`SiteSettingsPage.tsx:194`) | O | 비표시. 표시 조건 `saveError !== null && pending === null`(`:264`) — **확인 다이얼로그가 떠 있는 동안에는 다이얼로그 안에만 보인다.** ⚠ `conflict === null` 을 검사하지 않아 충돌 다이얼로그가 떠 있을 때 **배너가 중복 표시**된다(언어·OAuth 화면과 다르다 — §7 #5) |
| FS-067-EL-021 | FS-067-SEC-06 | 저장 확인 다이얼로그 | 모달 | 제출이 검증을 통과하면 **저장하지 않고** 이 다이얼로그를 세운다(`onValid` → `setPending(values)` — `:203-206`). `ConfirmDialog intent="update"` 제목 '사이트 설정 저장' | — | 비표시. `busy={saving}` · `error={saveError}` — **실패해도 닫지 않는다**(재클릭이 곧 재시도) |
| FS-067-EL-021.1 | FS-067-SEC-06 | 확인 문구 분기 규칙 | 텍스트 | `saveConfirmMessage(pending, savedMaintenance)`(`:97-105`) 3분기: **켜는 중**(드래프트 true + 저장값 false) → '유지보수 모드를 켭니다. 저장하는 즉시 방문자는 사이트를 이용할 수 없고 안내 문구만 보게 됩니다. 저장할까요?' · **끄는 중** → '유지보수 모드를 끕니다. 저장하는 즉시 사이트가 다시 열립니다. 저장할까요?' · **그 외** → '사이트 설정을 저장하면 사이트 전반에 즉시 반영됩니다. 저장할까요?' | — | 비표시 규칙. 기준은 `data?.value.maintenanceMode ?? false`(`:150`) — **서버가 아는 상태**이지 폼 초기값이 아니다 |
| FS-067-EL-021.2 | FS-067-SEC-06 | 확인 취소 | 버튼 | `onCancel` → `controllerRef.current?.abort()` · `save.reset()` · `lock.release()` · `saveError`·`pending` 을 비운다(`:215-222`) | — | 비표시. **진행 중이던 저장도 함께 취소한다** — busy 중에도 취소는 살아 있다(`ConfirmDialog.tsx:144`) |
| FS-067-EL-022 | FS-067-SEC-02 | 저장 실행 규칙 | 텍스트 | `runSave(values, force)`(`:157-200`): ① `data?.revision` 이 없으면 아무것도 하지 않는다 ② `lock.acquire()` 가 false 면 중단(EXC-08) ③ `saveError` 를 비우고 새 `AbortController` 로 `save.mutate({ value, expectedRevision, force, signal })` | O | 비표시 규칙 |
| FS-067-EL-022.1 | FS-067-SEC-02 | 동기 제출 잠금 | 텍스트 | `useSubmitLock()`(`_shared/queries.ts:58-75`) — `useRef` 잠금이라 **렌더를 기다리지 않는다**. `disabled={saving}` 만으로는 클릭과 리렌더 사이 틈으로 두 번째 클릭이 통과한다 | — | 비표시 규칙. **멱등키는 없다** — 응답 유실 후 재시도는 새 요청이 된다(§7 #4) |
| FS-067-EL-022.2 | FS-067-SEC-02 | 저장 성공 처리 | 텍스트 | `lock.release()` → `controller.signal.aborted` 면 중단 → `reset(values)`(저장한 값이 새 기준선 = dirty 해제 = 이탈 가드 내려감) → `pending`·`conflict` 비움 → 토스트 '사이트 설정을 저장했습니다.'(`:173-181`) | O | 비표시. `useSaveSettings` 의 `onSuccess` 가 **저장 응답을 캐시에 직접 심는다**(`_shared/queries.ts:45`) — invalidate 만 하면 재조회 전 낡은 revision 으로 두 번째 저장이 409 를 맞는다 |
| FS-067-EL-023 | FS-067-SEC-02 | 언마운트 abort | 텍스트 | `useEffect(() => () => controllerRef.current?.abort(), [])`(`:136`) | — | 비표시 규칙 |
| FS-067-EL-023.1 | FS-067-SEC-02 | abort 는 실패가 아니다 | 텍스트 | `onError` 에서 `isAbort(cause) \|\| controller.signal.aborted` 면 즉시 return — 배너·토스트를 띄우지 않는다(`:185`). `onSuccess` 도 `aborted` 면 아무것도 하지 않는다(`:175`) | — | 비표시 규칙(EXC-09). 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 |
| FS-067-EL-024 | FS-067-SEC-07 | 충돌 다이얼로그 | 모달 | 저장이 `SettingsConflictError` 로 실패하면(`isSettingsConflict(cause)` — `:188`) `pending` 을 비우고 **최신 문서를 쥔 채** `ConflictDialog` 를 세운다. 제목 '사이트 설정이 이미 변경되었습니다' | O | 비표시. **입력은 그대로 살아 있다** — 사용자가 고르기 전에는 아무것도 사라지지 않는다(`ConflictDialog.tsx:11-13`) |
| FS-067-EL-024.1 | FS-067-SEC-07 | 충돌 본문 | 텍스트 | '내가 이 화면을 연 뒤에 다른 관리자가 사이트 설정을 저장했습니다. 그대로 저장하면 그 변경이 사라집니다.' + '마지막 저장: `<updatedBy>` · `<formatAuditAt(updatedAt)>`' + 하단 안내 2줄. `useId` 로 만든 id 가 `Modal` 의 `aria-describedby` 로 연결된다(`ConflictDialog.tsx:88,94,107`) | O | 비표시. A11Y-02 pass 근거 |
| FS-067-EL-024.2 | FS-067-SEC-07 | 달라진 항목 목록 | 텍스트 | `divergedLabels(getValues(), conflict.value, SITE_FIELD_LABELS)`(`:249-252`)로 값이 갈린 필드의 **라벨**만 `<ul>` 로 나열한다. 빈 배열이면 목록을 그리지 않는다 | — | 비표시. 배열은 **내용**으로 비교한다(`diff.ts:13-20`) — 참조 비교면 안 바꾼 필드가 '달라졌다'고 거짓말한다. 라벨 정본은 `data-source.ts:40-50`(필드 키와 1:1) |
| FS-067-EL-024.3 | FS-067-SEC-07 | '최신 내용 불러오기' | 버튼 | `secondary`. `reset(latest.value)` → `conflict` 비움 → `refetch()` → 토스트 '최신 사이트 설정을 불러왔습니다.'(`:227-234`) | O | **내 입력을 버리는 선택** — 라벨이 그렇게 말한다 |
| FS-067-EL-024.4 | FS-067-SEC-07 | '내 변경으로 덮어쓰기' | 버튼 | **`danger`**. `runSave(getValues(), true)`(`:237-239`) — `force: true` 로 토큰 검사를 건너뛴다(`_shared/store.ts:124`) | O | **상대의 변경을 버리는 선택.** 파괴적일수록 라벨이 결과를 말한다(`ConflictDialog.tsx:9-10`). `busy` 중 두 액션 버튼이 잠긴다 |
| FS-067-EL-024.5 | FS-067-SEC-07 | 충돌 다이얼로그 닫기 | 버튼 | `onClose`(딤·Esc·×) → abort · `save.reset()` · `lock.release()` · `conflict` 비움(`:241-247`) | — | 비표시. **아무것도 하지 않고 그대로 두는 세 번째 갈래** — 그래서 `ConfirmDialog`(이지선다)가 아니다 |
| FS-067-EL-025 | FS-067-SEC-08 | 미저장 이탈 가드 | 모달 | `useUnsavedChangesDialog(dirty && !saving, { message })`(`SettingsFormShell.tsx:122`). 문구 '사이트 설정에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.' | — | 비표시. 3경로: beforeunload · 앱 내 링크 capture · popstate sentinel. **저장 중에는 가드하지 않는다**(곧 not-dirty 가 된다) |
| FS-067-EL-026 | FS-067-SEC-02 | 폼 초기값·리셋 규칙 | 텍스트 | `DEFAULT_FORM_VALUES`(`:445-455`)로 시작해 데이터 도착 시 `reset(data.value)`(`:139-142`). 이 값이 **dirty 판정의 기준선**이다 | O | 비표시. `useEffect([data, reset])` — **편집 중 재조회가 오면 입력이 덮인다**(§7 #7) |
| FS-067-EL-027 | FS-067-SEC-02 | dirty 판정 | 텍스트 | RHF `formState.isDirty`(`:123`) — 기준선 대비 비교 | — | 비표시. EL-007.1 의 blur 정규화가 값을 바꾸면 `shouldDirty: true` 로 dirty 가 된다 |
| FS-067-EL-028 | FS-067-SEC-02 | 제출 경로 | 텍스트 | `<form onSubmit={handleSubmit(onValid)} noValidate>`(`SettingsFormShell.tsx:144`) — 브라우저 기본 검증을 끄고 zod 가 판정한다. 검증 실패 시 `onValid` 가 불리지 않고 각 필드에 오류가 꽂힌다 | — | 비표시. **`onInvalid` 핸들러가 없다** — 첫 오류 필드로 포커스가 가지 않는다(§7 #3) |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-067-EL-001 | N/A — 정적 문구 | 로딩 중에도 표시(카드 밖) | 조회 실패 시 EL-018 이 화면을 대체해 함께 사라진다 | N/A — 입력 없음 | 권한과 무관하게 표시 | N/A — 정적 | 고정 문구 |
| FS-067-EL-002 | N/A — 정적 문구 | 로딩 중에도 표시 | 조회 실패 시 사라진다 | N/A — 입력 없음 | 권한과 무관 | N/A — 정적 | 고정 문구 |
| FS-067-EL-003 | 초기값 `''`, 도착 시 서버 값으로 reset | `disabled`(EL-017) + 스켈레톤이 자리를 대체 | 저장 실패는 EL-020. 입력 보존 | 비면 missing · 60자 초과 시 tooLong(**trim 후 판정** — `_shared/validation.ts:21-23`). `maxLength=60` 이 입력을 먼저 자른다 | `!canUpdate` 면 값이 보이되 비활성 | 재조회가 오면 입력이 덮인다(EL-026 · §7 #7). 충돌 시 EL-024.2 가 '사이트명'을 짚는다 | 60자 상한 + 카운터 |
| FS-067-EL-004 | 초기값 `''`. 빈 값이 정상 | 위와 동일 | 위와 동일 | **비어도 통과**(`optionalText`). 160자 초과만 거절 | 위와 동일 | 위와 동일 | 160자 상한 + 카운터 |
| FS-067-EL-005 | 초기값 `''` | 위와 동일 | 위와 동일 | 비면 '기본 URL을 입력하세요.' · https 아니면 '기본 URL은 https:// 로 시작해야 합니다.'. **`maxLength` 가 없어 입력 길이 상한이 없다** | 위와 동일 | 위와 동일 | **상한 없음** — 긴 URL 을 붙여넣어도 잘리지 않는다 |
| FS-067-EL-006 | 초기값 `''` | 위와 동일 | 위와 동일 | 비면 missing · `EMAIL_RE` 불통과 시 '대표 이메일 형식이 올바르지 않습니다.'. **길이 상한 없음** | 위와 동일 | 위와 동일 | 상한 없음 |
| FS-067-EL-007 | 초기값 `''` | 위와 동일 | 위와 동일 | 비면 missing · `PHONE_RE` 불통과 시 '대표 전화번호 형식이 올바르지 않습니다. 예: 02-1234-5678' | 위와 동일 | 위와 동일 | 상한 없음 |
| FS-067-EL-007.1 | 빈 값이면 `normalizePhone('')` → `''`(8자 미만이라 trim 만) — 아무 일도 없다 | 저장 중 필드가 비활성이라 blur 가 발생하지 않는다 | N/A — 서버 호출 없음 | **정규화가 검증을 대신하지 않는다** — 정규화 결과가 `PHONE_RE` 를 통과하지 못하면 그대로 오류가 뜬다 | 비활성이라 blur 정규화가 걸리지 않는다 | N/A — 로컬 변환 | 8자 미만이면 `raw.trim()` 을 그대로 돌려준다(`_shared/validation.ts:60`) |
| FS-067-EL-008 | N/A — 항상 한 값이 선택돼 있다 | `disabled` | 저장 실패는 EL-020 | `z.enum(TIMEZONE_IDS)` — 목록 밖 값은 파싱 실패. 화면에 그 선택지가 없어 실현되지 않는다 | 비활성 | 충돌 시 '표시 시간대'로 짚힌다 | 선택지 2개 고정 |
| FS-067-EL-009 | N/A — 불리언(초기값 `true`) | `disabled` | 저장 실패는 EL-020 | `z.boolean()` — 위반 값이 없다 | 비활성 | 충돌 시 '회원가입 허용'으로 짚힌다 | N/A — 불리언 |
| FS-067-EL-010 | N/A — 불리언(초기값 `false`) | `disabled` | 저장 실패는 EL-020 | `z.boolean()`. **교차 규칙**(안내 문구 필수)이 EL-012 에 오류를 꽂는다 | 비활성 | 충돌 시 '유지보수 모드'로 짚힌다. **다른 관리자가 먼저 켰다면 EL-024 가 그것을 알린다** | N/A — 불리언 |
| FS-067-EL-011 | N/A — 켜져야 성립 | 로딩 중에는 폼이 스켈레톤이라 미표시 | 조회 실패 시 미표시 | N/A — 표시 전용 | `!canUpdate` 면 스위치를 켤 수 없어 실질적으로 뜨지 않는다(저장된 값이 이미 true 면 뜬다) | 드래프트 기준이라 재조회와 무관 | 1건 |
| FS-067-EL-012 | 초기값 `''`. **모드가 꺼져 있으면 렌더되지 않는다** | `disabled` | 저장 실패는 EL-020 | 모드가 켜졌는데 trim 이 비면 '유지보수 모드를 켜면 방문자에게 보여줄 안내 문구가 필요합니다.' · 200자 초과 시 '안내 문구는 200자를 넘을 수 없습니다.' | 비활성 | 충돌 시 '유지보수 안내 문구'로 짚힌다 | 200자 상한 + 카운터 |
| FS-067-EL-013 | `audit === null`(도착 전)이면 렌더되지 않는다 | `loading` 이면 렌더되지 않는다(`SettingsFormShell.tsx:163`) | 조회 실패 시 폼째 사라진다 | N/A — 표시 전용 | 권한과 무관하게 표시 — **읽기 전용 역할도 누가 바꿨는지 본다** | 저장 성공 시 캐시가 갱신돼 새 감사 정보로 바뀐다 | 1건 |
| FS-067-EL-014 | N/A — 항상 3분기 중 하나 | '저장하는 중입니다…' | N/A — 실패는 EL-020 | N/A — 표시 전용 | **`!canUpdate` 면 렌더되지 않는다** | 재조회로 기준선이 바뀌면 dirty 판정이 바뀐다 | 고정 문구 |
| FS-067-EL-015 | N/A — 항상 표시(권한 있으면) | 요청 중 '저장 중…' + 비활성 | 실패 시 EL-020 배너, 버튼 재활성, 이동 없음, **입력 보존** | 미변경·로딩 중이면 비활성. 검증 실패는 제출을 막고 필드에 오류를 꽂는다 | **`!canUpdate` 면 렌더되지 않는다**(EXC-03) | 저장 성공이 새 revision 을 캐시에 심어 다음 저장이 곧바로 최신을 쓴다 | 단건 저장 |
| FS-067-EL-016 | N/A — 권한이 없어야 성립 | 로딩 중에도 표시(카드 상단) | 조회 실패 시 폼째 사라진다 | N/A — 표시 전용 | **이것이 권한없음 표현** | 권한 스토어가 바뀌면 재렌더된다(`RequirePermission.tsx:23-25` — 강등 reconcile) | 1건 |
| FS-067-EL-017 | N/A — 규칙 | `loading` 이 이 규칙의 입력 | `saving` 이 이 규칙의 입력 | N/A — 규칙 | `!canUpdate` 가 이 규칙의 입력 | N/A — 파생 규칙 | 9개 필드 일괄 |
| FS-067-EL-018 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 스켈레톤으로 | **이것이 조회 실패 표현.** 문구 1종 + '다시 시도'. **401/403/404/500 을 구분하지 않는다**(§7 #2) | N/A — 입력 없음 | 라우트 read 권한 부족은 여기 오지 않는다 — `RequirePermission` 이 `<Outlet>` 밖에서 403 화면을 그린다(§4.1) | 재시도는 같은 조회를 재발행 | N/A — 표시 전용 |
| FS-067-EL-019 | N/A — 도착 전 상태 | **이것이 로딩 표현.** 4행 고정 + `aria-busy` | 조회 실패 시 EL-018 로 바뀐다 | N/A — 입력 없음 | 권한과 무관 | **재조회에서는 뜨지 않는다**(`data !== undefined`) — 이전 값 유지 | 행 수가 실제 필드 수(9)와 무관하게 4 고정(§7 #8) |
| FS-067-EL-020 | N/A — 오류가 있어야 성립 | 재저장 시 `setSaveError(null)` 로 먼저 지운다(`:165`) | **이것이 저장 실패 표현.** 문구 1종 — 403/409(충돌 외)/422/500 을 구분하지 않는다(§7 #2). abort 는 표시하지 않는다 | 검증 실패는 여기 오지 않는다(필드 오류로 간다) | 서버 403 도 이 문구로 뭉개진다 | **409 는 여기 오지 않는다** — EL-024 로 갈린다(`isSettingsConflict`) | 1건 |
| FS-067-EL-021 | N/A — 제출이 있어야 성립 | `busy={saving}` → 확인 버튼이 '처리 중…' + 잠김. **취소는 살아 있다** | 실패해도 **닫지 않는다** — 다이얼로그 안 danger 배너(`ConfirmDialog.tsx` `error`) | **검증을 통과한 값만 여기 온다** — `handleSubmit(onValid)` 이 게이트다 | 권한 없으면 저장 버튼이 없어 도달 불가 | 확인 중 다른 관리자가 저장하면 확인 후 409 → EL-024 | 1건 |
| FS-067-EL-021.1 | N/A — 규칙 | N/A — 순수 조립(동기) | N/A — 서버 호출 없음 | N/A — 규칙 | N/A | **기준이 `data?.value.maintenanceMode` 라 재조회가 오면 문구가 바뀐다** — 확인 다이얼로그가 떠 있는 동안 갱신될 수 있다 | 3분기 고정 |
| FS-067-EL-021.2 | N/A — 다이얼로그가 떠야 성립 | 저장 중에도 누를 수 있다 — 그것이 abort 경로다 | abort 는 실패로 통지되지 않는다(EL-023.1) | N/A — 입력 없음 | N/A | 취소해도 서버 도달 여부는 보장되지 않는다(§7 #9) | 단건 |
| FS-067-EL-022 | N/A — 규칙 | `loading` 중에는 revision 이 없어 아무것도 하지 않는다 | 실패는 EL-020 또는 EL-024 로 갈린다 | N/A — 검증은 상류에서 끝났다 | N/A | **`expectedRevision` 이 이 규칙의 핵심** — 낡으면 409 | 단건 |
| FS-067-EL-022.1 | N/A — 규칙 | 잠금은 렌더와 무관하게 즉시 건다 | 성공·실패 어느 쪽이든 `lock.release()`(`:174,183`) | N/A | N/A | **연타의 2번째가 여기서 멈춘다** | **멱등키가 없다** — 응답 유실 후 재시도는 새 요청이 되고 낡은 revision 때문에 409 가 된다(§7 #4) |
| FS-067-EL-022.2 | N/A — 성공이 있어야 성립 | N/A — 결과 처리 | N/A — 성공 경로 | N/A | N/A | **`setQueryData(key, saved)`** 로 새 revision 을 즉시 심는다 — 연속 저장이 409 를 맞지 않는다 | 단건 |
| FS-067-EL-023 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | abort 는 실패가 아니다 | N/A | N/A | 이탈 시 진행 중 저장 취소 — **서버 도달 여부는 보장하지 않는다**(§7 #9) | 단건 |
| FS-067-EL-023.1 | N/A — 규칙 | N/A | **이것이 abort 판정 규칙**(EXC-09) | N/A | N/A | `signal.aborted` 를 성공·실패 양쪽에서 본다 | 단건 |
| FS-067-EL-024 | N/A — 충돌이 있어야 성립 | `busy={saving}` — 덮어쓰기 중 두 액션이 잠긴다 | 덮어쓰기 실패 시 다이얼로그 안 danger 배너(`error={saveError}`). ⚠ 동시에 EL-020 배너도 뜬다(§7 #5) | N/A — 입력 없음 | 권한 없으면 저장 불가라 도달 불가 | **이것이 경합 표현.** 토큰 기반 — '존재 여부'가 아니라 **revision 불일치**로 판정한다(BE-067 §7.2) | 1건 |
| FS-067-EL-024.1 | N/A — 충돌이 있어야 성립 | N/A | N/A — 표시 전용 | N/A | N/A | 최신 문서의 `audit` 를 그대로 보인다 | 고정 문구 |
| FS-067-EL-024.2 | **갈린 항목이 0개면 목록을 그리지 않는다**(`ConflictDialog.tsx:115`) | N/A — 순수 계산 | N/A | N/A | N/A | `getValues()`(내 입력) vs `conflict.value`(최신) 비교 | 최대 9개 라벨 |
| FS-067-EL-024.3 | N/A | `busy` 면 잠김 | `refetch()` 가 실패하면 EL-018 이 폼을 대체한다 — **불러온 값은 폼에 이미 들어가 있다** | N/A | N/A | reset 후 refetch 라 최신 revision 을 다시 받는다 | 단건 |
| FS-067-EL-024.4 | N/A | `busy` 면 잠김 + '처리 중…' | 실패 시 다이얼로그 유지 + 배너. **재클릭이 재시도** | N/A | N/A | **`force: true` 라 토큰 검사를 건너뛴다** — 상대 변경이 사라진다(사용자가 알고 고른 것) | 단건 |
| FS-067-EL-024.5 | N/A | 진행 중 저장을 abort 한다 | abort 는 통지하지 않는다 | N/A | N/A | 닫아도 내 입력은 그대로 — 다시 저장하면 또 409 를 맞는다(revision 이 여전히 낡음) | 단건 |
| FS-067-EL-025 | N/A — dirty 여야 성립 | **저장 중에는 가드가 꺼진다**(`dirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | `!canUpdate` 면 편집이 불가해 dirty 가 되지 않는다 | 저장 성공 후 `reset(values)` 로 dirty 가 풀려 가드가 내려간다 | N/A — 표시 전용 |
| FS-067-EL-026 | 도착 전에는 `DEFAULT_FORM_VALUES` 가 보인다(스켈레톤에 덮여 사실상 안 보인다) | `data === undefined` 면 reset 하지 않는다 | 조회 실패 시 폼이 렌더되지 않는다 | N/A — 규칙 | N/A | **`useEffect([data, reset])` 가 편집 중 재조회에서도 돈다** — 입력이 덮인다(§7 #7) | 단건 문서 |
| FS-067-EL-027 | 기준선과 같으면 not-dirty | N/A — 동기 판정 | N/A | N/A | N/A | 기준선이 바뀌면 판정도 바뀐다 | N/A — 순수 판정 |
| FS-067-EL-028 | N/A — 제출이 있어야 성립 | 저장 중 버튼이 비활성이라 재제출이 막힌다(+ EL-022.1) | N/A — 검증은 로컬 | **이것이 유효성 게이트.** `noValidate` 로 브라우저 검증을 끄고 zod 가 판정 | 권한 없으면 submit 버튼이 없다(Enter 제출은 가능 — §7 #10) | N/A | 9필드 일괄 검증 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 조회 실패는 폼을 대체하는 인라인 배너(EL-018), 저장 실패는 카드 배너(EL-020). **오프라인 감지·복귀 재조회가 앱 전역에 없다**(`navigator.onLine` grep 0건) — §7 #11 |
| 세션 만료 | 401 은 **앱 전역 인터셉터**(`shared/query/queryClient.ts` 의 `QueryCache`/`MutationCache` `onError`)가 받아 `notifySessionExpired()` 를 쏘고, `RequireAuth` 가 세션을 폐기한 뒤 `/login?returnUrl=/settings/site&reason=session_expired` 로 보낸다. **미저장 입력은 그때 사라진다** — 프로그램적 이동이라 EL-025 가드가 발화하지 않는다(§7 #11) |
| 요청 타임아웃 | 프론트 상한 없음(`AbortSignal.timeout` 앱 전역 grep 0건). abort 는 언마운트(EL-023)·확인 취소(EL-021.2)·충돌 닫기(EL-024.5)에서만 발생한다 — §7 #11 |
| 중복 제출 | `disabled={!dirty \|\| saving \|\| loading}` + **동기 잠금 `useSubmitLock`**(EL-022.1). **멱등키는 없다** — 다만 `expectedRevision` 이 있어 응답 유실 후 재시도는 **중복 적용이 아니라 409** 가 된다(§7 #4) |
| 실패 통지의 자리 | ① 조회 실패 = 폼을 대체하는 인라인 배너 ② 저장 실패 = 카드 배너(확인 다이얼로그가 떠 있으면 다이얼로그 안) ③ 저장 **성공** = 토스트 ④ 409 = 충돌 다이얼로그 ⑤ abort = 아무것도 띄우지 않는다 |
| 낙관적 업데이트 | **이 화면에 없다.** 저장은 비관적(응답 후 `reset` + 캐시 심기) — 롤백 경로가 필요 없다 |
| 동시 조회 | `useSettingsQuery` 가 `queryKey: ['settings','site']` 로 1건만 유지한다. 전역 기본 `staleTime` 30초 · `retry: false` · `refetchOnWindowFocus: false` 를 따른다 — 이 화면이 재정의하지 않는다 |
| 권한 없음 | **read** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:20`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더한다. 리소스는 라우트에서 파생된다(`route-resource.ts:32-35` → `page:/settings/site`). **write** — `useRouteWritePermissions().canUpdate`(`SiteSettingsPage.tsx:109`)가 저장 컨트롤을 게이팅한다(EL-015·EL-016). 권한 스토어가 바뀌면 재렌더돼 **강등 reconcile 이 별도 코드 없이 성립한다**(`RequirePermission.tsx:23-25`). 서버 403 은닉 정책은 BE-067 §7.5 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary` 를 둔다(`AppShell.tsx:484`) — 화면이 던져도 사이드바·헤더가 남고 `RouteErrorScreen` 이 뜬다 |
| 프론트 검증은 보증이 아니다 | zod 는 UX 다. 서버가 같은 규칙을 다시 검증한다(BE-067 §7.1) — `data-source.ts:31-32` 의 심이 `422 → 필드 검증 실패` 를 명시한다 |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 | 비고 |
|---|---|---|---|---|---|
| FS-067-EL-013 / EL-018 / EL-019 / EL-026 | 사이트 설정 조회 | R | `{ value: SiteSettingsValues, revision, audit }` | `siteSettingsStore.fetch(signal)` (`_shared/store.ts:108-112`) | `useSettingsQuery(siteSettingsKey, siteSettingsStore)`. **revision·audit 를 문서와 함께 나른다** |
| FS-067-EL-015 / EL-020 / EL-022 / EL-022.2 / EL-024 | 사이트 설정 저장 | W | `{ value, expectedRevision, force? }` | `siteSettingsStore.save(input, signal)` (`_shared/store.ts:114-134`) | `useSaveSettings`. **`expectedRevision` 불일치 → `SettingsConflictError`(최신 문서 동봉)**. `force: true` 면 토큰 검사를 건너뛴다 |
| FS-067-EL-024.3 | 최신 내용 재조회 | R | 위와 동일 | `refetch()` (react-query) | 충돌 해소 경로 |

> **현재 구현 상태 (A63 참고)**: 백엔드는 없다. `siteSettingsStore` 는 `createRevisionedStore('site', DEFAULT_SITE_SETTINGS, { updatedBy: '박관리', updatedAt: '2026-07-09T02:14:00.000Z' })`(`data-source.ts:33-37`)로 만든 **브라우저 안 mutable 클로저 1건**에 400ms 지연(`LATENCY_MS`)과 개발용 실패 스위치(`failIfRequested('site', op)`)를 얹은 것이다 — 실제 네트워크 0건. `revision` 은 `rev-<seq>` 단조 증가 문자열(`store.ts:86-91`)이고, 저장 주체는 **하드코딩 `CURRENT_ADMIN = '김운영'`**(`store.ts:84`)이다. 새로고침하면 시드로 돌아간다. 연동 심은 `data-source.ts:28-32` 의 `// TODO(backend): GET /api/settings/site · PUT /api/settings/site` 하나이며 **요청 헤더(`If-Match: <revision>`)·바디·응답(200/409·412/422)까지 명시돼 있다** — BE-067 §4 는 이 심을 그대로 계약으로 옮긴 것이며 발명한 엔드포인트가 없다. 위 표는 백엔드 연결 후 의도된 동작이다. |

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `SiteSettingsPage.tsx` · `data-source.ts` · `validation.ts` · `site.test.ts` · `_shared/{SettingsFormShell,ConflictDialog,AuditNote,fields,queries,store,diff,validation}`
- [x] 보이지 않는 요소(스켈레톤·조회/저장 실패 배너·읽기전용 안내·확인/충돌 다이얼로그·이탈 가드·blur 정규화·동기 잠금·abort 규칙·dirty 판정·reset 규칙·필드 일괄 비활성)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다 — 이 화면에 어댑터를 거치지 않는 호출이 **없다**
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-067 영역)
- [x] **`in-content <h1>` 이 없음을 grep 으로 확인**(`grep -rn "h1" apps/admin/src/pages/settings/` → 0건)하고 EL-001 에 기록했다 — IA-02 판정의 근거
- [x] 낙관적 동시성이 **'존재 여부'가 아니라 revision 토큰 기반**임을 `store.ts:124` 로 확인하고 EL-024 에 명시했다
- [x] §7 의 미결 항목이 BE-067 §7.6 · NFR-067 §5 와 일치한다

## 7. 미결 사항 (A11 / A01 / A63 / A40 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (시스템 설정 SCR 미작성) | A11 / A01 |
| 2 | 조회 실패(EL-018)·저장 실패(EL-020)가 **status 를 구분하지 않는다** — 401/403/404/500 이 한 문구다. `createRevisionedStore` 가 `HttpError`(status 보유)가 아니라 일반 `Error`/`SettingsConflictError` 만 던져 화면이 분기할 근거가 없다(quality-bar EXC-06 · EXC-12 P1) | A11 · A63 |
| 3 | **검증 실패 시 첫 오류 필드로 포커스가 가지 않는다** — `handleSubmit(onValid)` 에 `onInvalid` 가 없다. `useCrudForm` 의 `setFocus` 경로를 상속하지 못했다(quality-bar A11Y-13 P1) | A11 change_request |
| 4 | 저장에 **멱등키가 없다** — 동기 잠금(EL-022.1)은 연타를 막지만, 응답 유실 후 재시도는 새 요청이 된다. `expectedRevision` 덕에 **중복 적용이 아니라 409** 가 되므로 데이터는 안전하나, 사용자는 영문 모를 충돌 다이얼로그를 본다. 앱에 선례가 있다(`pages/members/components/PointsCard.tsx:103,162-173`)(quality-bar EXC-08 P0) | A11 · A63 (BE-067 §7.4) |
| 5 | **저장 실패 배너가 충돌 다이얼로그와 중복 표시된다** — `serverError={saveError !== null && pending === null ? … }`(`SiteSettingsPage.tsx:264`)가 `conflict === null` 을 검사하지 않는다. **언어(`LanguagesPage.tsx:283`)·OAuth(`OAuthPage.tsx:247`)는 검사한다** — 이 화면만 빠졌다. 덮어쓰기가 실패하면 같은 문구가 다이얼로그와 그 뒤 카드에 동시에 뜬다 | A11 change_request |
| 6 | **`timezone` 이 저장될 뿐 적용되지 않는다** — 이 앱의 날짜 렌더(`shared/format`)는 브라우저 로컬/UTC 정오 앵커를 쓰고 이 값을 읽지 않는다. 화면은 그 사실을 **알리지 않는다**(언어 화면은 같은 상황을 info 배너로 밝힌다 — FS-068-EL-010). 운영자는 UTC 를 골라 두고 화면이 UTC 로 바뀌길 기다리게 된다 | A11 change_request · A01 (도메인 경계) |
| 7 | 데이터 도착 시 `reset(data.value)` 하는 효과(EL-026)가 **편집 중 재조회에서도 돈다** — 저장 후 재조회는 정상이나, 그 밖의 재조회(수동 refetch·캐시 무효화)가 오면 입력이 덮인다 | A11 change_request |
| 8 | 스켈레톤 행 수가 하드코딩 `[0, 1, 2, 3]`(`SettingsFormShell.tsx:154`) — 실제 필드 수(9)와 무관하다(quality-bar COMP-06 P2) | A11 change_request |
| 9 | 이탈·취소 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다 — 이미 반영된 저장이 화면에 안 보일 수 있다 | A63 (BE-067) |
| 10 | 읽기 전용 역할에게 저장 **버튼**은 없지만 `<form onSubmit>` 은 남아 있다 — 텍스트 입력에서 Enter 를 누르면 제출이 발화한다. 필드가 전부 `disabled` 라 실현되지 않으나(`disabled` 입력은 Enter 제출을 만들지 않는다) **방어가 구조가 아니라 우연**이다 | A11 change_request |
| 11 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료 리다이렉트가 미저장 입력을 버린다(가드 미발화)(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | A11 · A40 |
| 12 | `SiteSettingsPage.tsx:15` 주석이 권한 게이트를 **`_shared/access.tsx`** 로 지목하나 **그 파일은 존재하지 않는다** — 실제 게이트는 `shared/permissions/RequirePermission` 이다(`:32`). 낡은 주석 | A11 change_request |
| 13 | 기본 URL(EL-005)·대표 이메일(EL-006)·전화번호(EL-007)에 `maxLength` 가 없다 — 사이트명·설명·안내 문구와 달리 입력 길이 상한이 없고 스키마도 길이를 보지 않는다 | A11 change_request |
</content>
</invoke>
