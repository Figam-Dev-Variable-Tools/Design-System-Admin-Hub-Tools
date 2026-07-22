---
id: NFR-078
title: "결제 설정 비기능 명세"
functionalSpec: FS-078
backendSpec: BE-078
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-078. 결제 설정 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-078 결제 설정 (`/settings/payment`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-078(요소·예외) · BE-078(계약·판정) · `specs/quality-bar.md`(요구 정본) · **NFR-079**(반대 방향 축) · `docs/adr/0014-pg-switch-screen-impact.md` |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-078 §7 · BE-078 §7.9 와 대응해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 + 섹션 공용 `pages/settings/_shared/**`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(queryClient·RequireAuth·ToastProvider·RequirePermission)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**단일 문서 폼이지만, 저장이 이 화면 밖 12개 지점의 동작을 바꾼다**(BE-078 §7.4). 그래서 목록 화면의 P0 상당수(STATE-04 · COMP-10 · IA-04 · IA-05 · IA-13)가 **표면 부재로 n-a** 가 되는 대신, **비가역에 준하는 저장의 게이트(FEEDBACK-02) · 동시 편집(EXC-04) · 중복 제출(EXC-08) · 쓰기 권한(EXC-03)** 을 형제 설정 화면보다 무겁게 읽어야 한다.

**이 화면의 축은 fail-closed 다.** `pgSellable(settings) = usePg && merchantId.trim() !== ''`(`shared/commerce/payment-settings.ts:128-130`) — PG 를 켜 두고 상점 ID 가 공란이면 **판매 불가로 수렴한다.** 검증(`validation.ts:54-64`)이 그런 저장을 막지만 규칙 자체도 닫는 쪽으로 간다. **형제 축인 플랜/엔타이틀먼트는 방향이 정반대(fail-open)** 이며(NFR-079 §1.2 · BE-079 §7.2), 이 차이가 EXC-21·EXC-22 판정의 근거다.

**형제 설정 화면과 갈리는 두 지점**: ① **A11Y-11 이 pass 다** — 이 화면은 `FormField` + `TextInputField`(`_shared/fields.tsx`) 경로를 쓰므로 `required` 주입과 `aria-invalid ↔ aria-describedby` 짝이 컴포넌트에 붙어 있다(NFR-067 은 그 경로를 버려 gap 이 됐다). ② **EXC-04 의 '달라진 항목' 표시가 거짓말하지 않는다** — 이 문서는 완전한 평면 6필드라 `_shared/diff.ts:13-20` 의 비교기가 그대로 감당한다.

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** `PaymentSettingsPage.tsx:230` 이 `const loading = isFetching && data === undefined` 로 **첫 로딩만** 판정한다. 그 값이 `SettingsFormShell.tsx:154-162` 의 스켈레톤 분기를 지배하므로 **재조회 중에는 이전 폼 값이 유지된다.** 셸이 세 상태를 배타적으로 그린다: 조회 실패 → 배너만(`:127-140`, early return) / 첫 로딩 → 스켈레톤만(`:154-159`) / 그 외 → 폼(`:161`). `empty` 는 단일 문서라 해당 없음 | `/settings/payment` 진입 → 폼 렌더 확인 → `staleTime` 30초 경과 후 재진입(또는 devtools invalidate). **폼이 스켈레톤으로 바뀌지 않고 값이 유지되면 pass.** `?fail=load` → 배너만, 폼 없음. ⚠ **로딩 중 PG 미사용 배너가 뜨는 것은 STATE-01 위반이 아니다** — `warning` 슬롯이 스켈레톤 분기 밖이라 벌어지는 별건이다(§5 #3) | **pass** |
| STATE-02 | STATE | 직접 | **충족.** 조회 실패는 **폼 대신** `<Alert tone="danger">` + '다시 시도'(`SettingsFormShell.tsx:127-140` ← `PaymentSettingsPage.tsx:362-363` `loadFailed={error !== null}` · `onRetry={() => void refetch()}`). **read 실패에 toast 를 쓰지 않는다** — 이 화면의 `toast` 호출은 성공 2건뿐(`:259-263` 저장 · `:318` 최신 불러오기). 저장 실패도 toast 가 아니라 카드 배너(`:277` → `:364`)이며 **다이얼로그가 떠 있으면 그 안에만** 보인다(`:364` 의 `pending === null && conflict === null` 검사) | `/settings/payment?fail=load` 진입 → **danger Alert + '다시 시도' 가 뜨고 토스트가 없으면 pass.** 폼·안내문·푸터가 함께 사라지는지도 확인 | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** ① 페이지네이션이 없다 ② 행 선택이 없다 ③ 목록 자체가 없다 — **단일 문서 폼**이다(§1.2). 'total 축소 시 page clamp' · '필터/page 변경 시 selection 리셋'이 걸릴 표면이 존재하지 않는다. **페이지네이션 부재는 결함이 아니라 화면 성격**이며 IA-04 도 같은 이유로 n-a 다 | 목록·선택이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | **충족.** `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/settings/payment/` → **0건**(실측 2026-07-22, `components/CheckoutCtaPreview.tsx` 포함). 모든 스타일 객체가 `var(--tds-*)` 만 참조하고, 파생 치수도 토큰 배수로만 표현한다 — 구획 그리드 `minmax(calc(${cssVar('space.6')} * 6), 1fr)`(`:104`) · 결제수단 그리드 `* 4`(`:118`). border-width 도 토큰(`:81` `cssVar('border-width.thin')`) | 위 grep → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: 상점 ID `tds-ui-input tds-ui-focusable`(`_shared/fields.tsx:74`) · 결제수단 체크박스 `tds-ui-check tds-ui-focusable`(`:484`) · 문의 링크 2개 `tds-ui-link tds-ui-focusable`(`:376,380`) · DS `<SelectField>`·`<TextareaField>`·`<ToggleSwitch>`·`<Button>`. **이 화면이 focus ring 을 직접 선언하지 않는다**(로컬 `:focus-visible` 0건) | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`SettingsFormShell.tsx:157`) · **Toast**(저장 성공·최신 불러오기) · **Modal 3종**(저장 확인 · 충돌 · 이탈 가드) · DS `<Button>`·`<ToggleSwitch>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다** — `grep -rniE "transition\|animation\|transform" pages/settings/payment/` = **0건**(실측) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`SettingsFormShell.tsx:147`) · Modal 3종 · Toast. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건, 위와 같은 실측) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다** — `grep -rn "<h1" apps/admin/src/pages/settings/` = **0건**(실측). 화면 제목은 AppHeader 가 nav 잎 라벨('결제 설정' — `nav-config.ts:291`)로 그린다(FS-078-EL-001). 구획 제목 `<h3>`(`:152`)은 `typography('typography.title.md')`(`:92`)로 **>18px tier 토큰만 참조**하며 값을 손으로 재현하지 않는다. 카드 제목 `CardTitle` 은 heading 시맨틱이 아니다. ⚠ **h1 → h3 로 건너뛴다**(h2 없음) — 문서 구조 축이며 이 요구의 대상은 아니다(§5 #6) | AppHeader `titleStyle` 이 title tier 토큰을 참조하는지 확인. 이 화면에서는 로컬 타이포 값 선언이 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** 이 화면에 **검색·필터 입력이 없다** — `grep -rn "SearchField\|useDebouncedSearch\|useListState" pages/settings/payment/` = **0건**. 단일 문서 폼이라 커밋할 query 자체가 없다. **텍스트 입력(상점 ID·안내 문구)은 있지만 서버 query 를 발화하지 않는다** — 폼 값일 뿐이고, 미리보기(`CheckoutCtaPreview`)는 순수 렌더다. 'IME 조합 중 커밋 금지 + 디바운스 + stale 응답 무효'가 걸릴 자리가 없다 | 검색 입력이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | 직접 | **충족.** 이 화면의 저장은 **되돌리기 어려운 액션**이다 — `usePg` 를 끄는 저장은 사이트의 모든 구매 버튼을 한 번에 문의로 바꾸고, `mode: 'live'` 저장은 고객의 결제가 실제로 승인되기 시작하는 스위치다(BE-078 §7.6). ① **게이트가 있다** — 제출이 검증을 통과하면 **저장하지 않고** `ConfirmDialog intent="update"` 를 세운다(`:286-293` → `:534-544`). ② **확인 문구가 결과를 말한다** — `saveConfirmMessage`(`:169-179`)가 끄는 중/켜는 중(테스트·운영)/그 밖 **4문구로 갈린다.** ③ **강제실패가 다이얼로그를 유지한다** — `onError` 가 `setSaveError(...)`(`:277`)만 하고 `setPending(null)` 을 하지 않아 다이얼로그가 살아 있고 `error={saveError}`(`:540`)로 그 안에 배너가 뜬다. **재클릭이 곧 재시도**다. ④ **중간닫기 = abort** — `cancelSave`(`:301-308`)가 `controllerRef.current?.abort()` + `save.reset()` + `lock.release()` 를 한다. intent→tone/label/icon 매핑과 초기 포커스는 DS 소유 | `/settings/payment?fail=save` 에서 스위치를 내리고 저장 → 확인. **다이얼로그가 열린 채 danger 배너가 뜨고 확인 버튼이 재활성되면 pass.** 확인 문구가 'PG 결제를 끕니다…'로 시작하는지도 확인. 저장 중(400ms) '취소' → 실패 토스트·배너가 뜨지 않아야 한다 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `SettingsFormShell.tsx:124` 가 `useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage })` 를 배선한다. `dirty` 는 RHF `formState.isDirty`(`:203` → `:366`)이고 기준선은 `reset(toPaymentFormValues(data.value))`(`:219-222`)다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다. **스위치·체크박스·textarea 가 전부 `shouldDirty: true`** 로 dirty 를 만든다(`:402,349,521`). 저장 성공 시 `reset(toPaymentFormValues(next))`(`:256`)로 새 기준선이 서서 가드가 내려간다. **저장 중에는 가드하지 않는다**(`dirty && !saving`) | 스위치를 내린 뒤 ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** ⚠ **PG 미사용 배너의 문의 링크 2개(`:376,380`)도 앱 내 링크라 이 가드에 잡힌다** — 의도된 동작이다(FS-078-EL-025). 저장 성공 후 같은 이동은 프롬프트 없이 통과 | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 폼은 라우트 본문의 `<Card>` 로 렌더된다(`SettingsFormShell.tsx:147`). modal 3개는 전부 **입력 필드가 없는 확인/선택 다이얼로그**다: 저장 확인 `ConfirmDialog`(`:534-544`) · 충돌 `ConflictDialog`(`:546-558`, 본문이 `<p>`·`<ul>`·`<Alert>` 뿐) · 이탈 가드. 'modal 4경로 dirty 가드'가 걸릴 dirty 상태가 modal 안에 존재하지 않는다 — **라우트 레벨 dirty 는 FEEDBACK-04 가 담당한다** | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 **2건**: 저장 성공(`:259-263` — **값에 따라 2분기**) · 충돌 해소 '최신 결제 설정을 불러왔습니다.'(`:318`). 지속 live region 은 `ToastProvider` 가 소유한다(비-error=polite · error=assertive) — 이 화면은 주입만 한다. **error toast 는 0건**이다 | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 **3건** 모두 `aria-describedby` 가 배선돼 있다: ① 저장 확인 — DS `ConfirmDialog` 가 `useId` 로 message id 를 만들어 `Modal` 에 넘긴다 ② 충돌 — `ConflictDialog.tsx:89,94` 가 `useId` → `describedBy` → `<p id>` 를 잇는다(FS-078-EL-024.1) ③ 이탈 가드 — 훅이 `ConfirmDialog` 를 렌더한다 | DS 판정에 종속. 이 화면에서는 충돌 다이얼로그 open 시 본문 문구가 title 과 함께 읽히는지 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족 — 형제 화면(NFR-067)이 gap 인 자리에서 이 화면은 pass 다.** 폼 컨트롤 **10개를 전수 확인**했다. ① **상점 ID** — `TextInputField`(`_shared/fields.tsx:71-83`)가 `aria-invalid={invalid}` 와 `aria-describedby={describedBy(id, error, hint)}` 를 **같은 요소에 짝으로** 세우고, 그 헬퍼(`:16-24`)가 **오류가 있으면 `errorIdOf`, 없고 힌트가 있으면 `hintIdOf`** 를 고른다 — 요구의 '힌트는 valid 일 때만' 절을 정확히 구현한다. `required`(`:456`)는 `FormField` 가 받아 자식 DS 컨트롤에 `aria-required` 를 주입한다. 컴포넌트 머리말(`:7-9`)이 그 계약을 스스로 못박는다: '**호출부가 이 배선을 잊을 수 있는 자리를 없앤다**' ② **PG사·연동 모드 select** — `FormField … required`(`:423,436`) + DS `SelectField`. 오류 상태가 없어 짝 요구가 발생하지 않는다 ③ **안내 문구 textarea** — DS `TextareaField label required error hint`(`:516-529`)가 내부 배선 ④ **결제수단 체크박스 5개** — 개별 필수가 아니라 **'고르는 행위'가 필수**이므로 `<ul role="group" aria-label="결제수단 (필수)">`(`:473-478`)로 묶고, 오류가 있을 때만 `aria-describedby={methodsErrorId}` 를 붙이며 그 id 의 `<p role="alert">`(`:501-503`)를 렌더한다. 시각 별표는 `aria-hidden`(`:469`)이라 **낭독은 `(필수)` 한 번뿐**이다 ⑤ **PG 결제 스위치** — DS `ToggleSwitch` 가 `aria-checked` 로 상태를 소유. **짝 없는 `aria-invalid` 0건**(이 디렉터리 히트 0건 — 배선이 전부 `_shared/fields.tsx` 와 DS 안에 있다) | `grep -rn "aria-invalid" apps/admin/src/pages/settings/payment` → 0건(배선은 `_shared/fields.tsx:77-78` 과 DS). RTL: PG 를 켜고 상점 ID 를 비운 채 저장 → `input.getAttribute('aria-describedby')` 가 `screen.getByRole('alert').id` 와 일치하고 `aria-required === 'true'` 인지 assert. 결제수단을 0개로 만들고 `<ul>` 의 `aria-describedby` 가 오류 `<p>` 를 가리키는지 확인 | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면에 **좌측 필터 list item 이 없다** — 필터·목록이 전혀 없는 단일 문서 폼이다. `grep -rn "aria-current\|aria-pressed" pages/settings/payment/` = **0건**(실측). `ToggleSwitch`·체크박스는 필터가 아니라 **폼 값**이며 DS 가 `aria-checked`/`checked` 로 상태를 노출한다 — 이 요구의 appliesTo 가 아니다 | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면 **3종**(저장 확인 · 충돌 · 이탈 가드)이 실재한다. enter/exit transition·`AnimatePresence` 상당의 unmount 지연은 DS `Modal` organism 이 소유하며 **이 화면은 애니메이션을 선언하지 않는다**(grep 0건). **잔여** — 애니메이션되는 닫힘은 Modal 소유 3경로(Esc·딤·×)뿐이고 **footer 버튼은 즉시 언마운트**인데, **이 화면의 세 다이얼로그는 footer 가 주 닫기 수단**이다 | DS Modal 판정에 종속. 저장 확인 다이얼로그를 Esc 로 닫아 exit 를 관찰하고, footer '취소' 로 닫으면 즉시 사라지는 것과 대조 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면이 실재한다(저장 성공 `:259-263` · 최신 불러오기 `:318`). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속. 저장 성공 토스트가 fade + translate 로 사라지는지만 확인 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: **`ToggleSwitch`(요구가 명시 지목한 컨트롤 — `:395-404`)** · 스켈레톤 펄스 · Toast · Modal 3종 · DS `<Button>`. **이 화면 자신은 transition/animation 을 0건 선언한다**(grep) | 전역 motion config·DS CSS 판정에 종속. OS 를 reduced-motion 으로 두고 PG 스위치를 토글해 손잡이가 즉시 점프하는지 확인 | **종속** |
| IA-01 | IA | 직접 | **충족.** 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:473` `{ path: '/settings/payment', element: <PaymentSettingsPage />, implemented: true }`). **이 화면은 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 셸의 평범한 `<div style={pageStyle}>`(`SettingsFormShell.tsx:143`, column + gap 뿐)이고 화면은 그 안의 구획만 그린다 | `/settings/payment` 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족.** `/settings/payment` 는 **nav 잎**이다(`nav-config.ts:291` `['결제 설정', '/settings/payment']`) — 하위 라우트가 없다(`App.tsx:473`). `findCoveringLeaf` 가 자기 자신을 정확히 찾아 AppHeader 가 `<h1>결제 설정</h1>` 을 그리고, **화면은 in-content `<h1>` 을 그리지 않는다**(grep 0건). 따라서 **`<h1>` 이 정확히 1개이고 title 메커니즘이 단일하다.** ✅ **nav 라벨과 카드 제목이 일치한다**('결제 설정' — `:359`) — 형제 화면 `../site` 가 갈려 있는 지점이다 | `/settings/payment` 진입 → `document.querySelectorAll('h1').length === 1` 이고 그 문구가 '결제 설정'이면 pass | **pass** |
| IA-04 | IA | N/A | **표면이 없다.** 이 화면은 **list 화면이 아니다** — 단일 문서 폼이다(§1.2). 표·결과 count·우상단 목록 action·SelectionBar·Pagination 이 **하나도 없고 있어야 할 이유도 없다**(문서가 1건이다). **이것은 페이지네이션 누락이 아니라 목록 부재다** | 이 라우트에 목록이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| IA-05 | IA | N/A | **표면이 없다.** `/settings/payment` 단일 라우트이며 `/new`·`/:id/edit` 가 없다 — **설정 문서는 생성·삭제되지 않고 편집만 된다**(BE-078 §5 의 404 축: '문서는 항상 존재한다'). '`new` 와 `:id/edit` 가 동일 폼 컴포넌트'라는 요구 자체가 걸리지 않는다 | 폼 라우트 쌍이 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | N/A | **표면이 없다.** URL 에 직렬화할 **list state 가 없다** — 필터·검색·정렬·페이지가 하나도 없고 `grep -rn "useListState\|useSearchParams" pages/settings/payment/` = **0건**. 폼 입력값은 list state 가 아니다 — **URL 에 넣으면 미저장 결제 설정이 히스토리·리퍼러에 남는다.** 넣지 않는 것이 옳다. `?fail=`·`?status=` 개발 스위치는 URL 을 읽지만 list state 가 아니다(`_shared/store.ts:60-65`) | 필터·검색이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:395-400` + `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① **진입 가드** — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 `Navigate` ② **세션 중 401** — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()`(`shared/query/queryClient.ts:60-66`). **이 화면의 조회·저장이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. ⚠ **미저장 입력은 그때 사라진다**(프로그램적 이동이라 이탈 가드가 발화하지 않는다 — EXC-19 P1 · §4.2) | auth/session 소유 문서 판정에 종속. `?status=load:401` 로 조회를 401 시켜 `/login?returnUrl=%2Fsettings%2Fpayment&reason=session_expired` 로 이동하는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **충족.** ① **read 게이팅(상속)** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:407-411`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더한다. 리소스는 라우트에서 파생된다(`page:/settings/payment`) ② **write 게이팅(직접)** — `:185` `const { canUpdate } = useRouteWritePermissions()` → `:367` → `SettingsFormShell.tsx:168` `{canUpdate && (…저장 버튼·상태 문구…)}`. **버튼을 disabled 로 두지 않고 렌더 자체를 하지 않는다**(`:167` '눌러 보고 403 을 받는 자리를 만들지 않는다'). 대신 info 배너로 **이유를 말한다**(`READ_ONLY_NOTICE` — `:67-68` → 셸 `:151`) ③ **컨트롤 10개가 전부 비활성** — `disabled = saving \|\| loading \|\| !canUpdate`(`:232`)가 스위치 1 · select 2 · 텍스트 1 · 체크박스 5 · textarea 1 에 전달된다 ④ **강등 reconcile** — 훅이 권한 스토어를 구독하므로 스토어가 바뀌면 재렌더돼 버튼이 그냥 사라진다 | 권한 스토어에서 `page:/settings/payment` 의 `update` 를 끄고 진입. **저장 버튼·상태 문구가 사라지고 '조회 권한만 있습니다…' 배너가 뜨며 컨트롤 10개가 전부 비활성이면 pass.** `read` 를 끄면 403 화면이 뜨는지도 확인. ⚠ **`<form onSubmit>` 은 남아 Enter 제출이 발화한다** — 필드가 전부 disabled 라 실현되지 않으나 방어가 구조가 아니라 우연이다(§5 #7) | **pass** |
| EXC-04 | EXC | 직접 | **충족 — 그리고 이 화면에서는 '달라진 항목' 표시까지 옳다.** ① **토큰 기반 conflict** — `_shared/store.ts:144-146` 이 `expectedRevision !== current.revision` 이면 `SettingsConflictError(current)` 를 던지고, 화면이 `isSettingsConflict(cause)`(`:271`)로 일반 실패와 갈라 `ConflictDialog` 를 세운다(`:546-558`). **3-액션**(최신 불러오기 · 덮어쓰기 · 닫기)이며 그것이 `ConfirmDialog`(이지선다)가 아닌 이유를 컴포넌트가 적는다 ② **입력 보존** — `setConflict` 만 하고 `reset` 을 하지 않는다(`:272-274`) ③ **유령 저장 없음** — `createRevisionedStore` 는 클로저 1건을 통째로 교체하므로 '없는 대상을 조용히 지나치고 성공'하는 경로가 **구조적으로 없다.** **`createStoreAdapter`(존재 여부 기반 409 → 동시 편집은 last-write-wins)와 다르다**(BE-078 §7.7) ④ **'가능하면 diverge 표시' 절도 참이다** — `divergedLabels`(`:333-337`)가 쓰는 비교기(`_shared/diff.ts:13-20`)는 배열을 내용 비교하고 나머지는 `Object.is` 인데, **이 문서는 완전한 평면 6필드**(불리언 1 · 문자열 4 · 문자열 배열 1)라 거짓 양성이 없다. 배열 순서 정규화(`:341-352`)가 그것을 뒷받침한다 — **형제 화면 `../site` 가 객체 필드로 거짓말하는 자리다**(NFR-067 §5 #10) | `/settings/payment?fail=conflict` 에서 값을 바꿔 저장 → 확인. **'결제 설정이 이미 변경되었습니다' 다이얼로그가 뜨고 내 입력이 폼에 그대로 있으면 pass.** **상점 ID 만 고쳤을 때 '달라진 항목'에 '상점 ID' 하나만 뜨는지** 확인(둘 이상 뜨면 비교기 결함의 재현이다 — 현재는 하나만 뜬다). 결제수단을 껐다 켠 뒤에도 그 항목이 뜨지 않아야 한다(순서 정규화) | **pass** |
| EXC-08 | EXC | 직접 | **부분 미충족.** ① **`submitLockRef` + disable — 충족.** `useSubmitLock()`(`_shared/queries.ts:58-75`)이 `useRef` 동기 잠금을 제공하고 `runSave` 첫머리에서 `if (!lock.acquire()) return;`(`:242`)으로 건다. 성공·실패 양쪽에서 `release`(`:253,266`). 버튼도 `disabled={!dirty \|\| saving \|\| loading}`(`SettingsFormShell.tsx:181`). `queries.ts:54-55` 가 왜 disabled 만으로 부족한지 적는다 ② **'retry 가 동일 Idempotency-Key' — 미충족.** `grep -rn "Idempotency\|idempotencyKey" pages/settings/payment` = **0건**(실측). 앱에 선례가 둘 있는데도 쓰지 않는다(`members/components/PointsCard.tsx` · **같은 섹션의** `api-keys/ApiKeysPage.tsx`). **완화 요인(중요)**: PUT + `expectedRevision` 이라 응답 유실 후 재시도는 **중복 적용이 아니라 409/412** 가 된다 — **데이터는 안전하고**(BE-078 §7.7) 판매 방식도 바뀌지 않는다(부수효과가 성공 뒤에만 실행된다 — `data-source.ts:41-46`). **남는 결함은 UX 다** — 사용자는 자기 저장이 이미 성공한 줄 모르고 재시도했다가 **거짓 충돌 다이얼로그**를 본다 | 확인 다이얼로그의 확인 버튼을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 1건만 나가면 ①은 pass.** `grep -rn "Idempotency" pages/settings/payment` → **0건이면 ②는 gap** | **gap** |
| EXC-09 | EXC | 직접 | **충족. 네 지점이 배선돼 있다.** ① **onError** — `if (isAbort(cause) \|\| controller.signal.aborted) return;`(`:268`)로 abort 를 실패로 처리하지 않는다. 공유 predicate `isAbort`(`shared/async`)를 쓴다 — 로컬 판정을 재발명하지 않는다 ② **onSuccess** — `if (controller.signal.aborted) return;`(`:254`)로 취소된 요청의 성공 콜백이 토스트·reset·부수효과를 일으키지 않는다 ③ **mutation.reset** — `cancelSave`(`:304`)·`closeConflict`(`:328`)가 `save.reset()` + `lock.release()` 를 부른다 ④ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:216`). bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 저장 중(400ms 창) 확인 다이얼로그의 '취소' 클릭. **error toast·실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다. 저장 중 사이드바 링크로 이탈 → 콘솔 경고 0건 | **pass** |
| EXC-21 | EXC | 직접 | **충족.** 요구의 판정 순서(**인증 → 플랜 → 권한 → 설정**)를 이 화면이 **한 계열씩만** 보인다. ① **인증** — `RequireAuth` 가 `<Outlet>` 밖에서 `/login` 으로 보낸다 ② **플랜** — **이 라우트는 판정 대상이 아니다.** `MODULE_RESOURCES`(`shared/entitlements/module-resources.ts:29-91`)에 `/settings/**` 가 없어 `entitlementStateForResource` 가 곧바로 `granted` 를 준다(`route-entitlement.ts:27-28`, 회귀 `route-entitlement.test.ts:56-57`) — **화면 안에 업그레이드 안내가 0건인 것이 정답이다** ③ **권한** — read 부족은 `<Outlet>` 밖 `ForbiddenScreen`(403 계열), write 부족은 **화면 안 info 배너 + 저장 컨트롤 미렌더**(EXC-03). 둘은 동시에 뜰 수 없다(read 가 없으면 화면 자체가 없다) ④ **설정** — 이 화면은 **④계열의 원인**이며(`pgSellable` 이 다른 화면을 문맥 전환시킨다) 자기 화면에서는 거절이 아니다. ⚠ **읽기 전용 안내(③)와 PG 미사용 안내(④)가 함께 뜰 수 있다** — 그러나 후자는 **다른 화면의 상태를 예고하는 안내이지 이 화면의 거절이 아니므로** 두 계열이 섞인 것이 아니다 | 권한 `read` 를 끄고 진입 → **403 화면만**(업그레이드 문구 0건). `update` 만 끄고 진입 → **읽기 전용 배너만**. 플랜에서 아무 모듈이나 내려도 이 화면은 **잠기지 않아야 한다**(그것이 `/settings/**` 매핑 부재의 의도다). `grep -rn "entitlement\|Upgrade" pages/settings/payment/` = 0건 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **12** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · **A11Y-11** · IA-01 · IA-02 · EXC-03 · EXC-04 · EXC-09 · **EXC-21** |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **7** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 |
| `gap` | **1** | EXC-08 |
| **합계** | **31** | 12 + 11 + 7 + 1 = **31** ✓ |

**검산 (P0 31건 전수 · 지정 순서대로 나열해 셈)**

| # | 요구 ID | 판정 | # | 요구 ID | 판정 |
|---|---|---|---|---|---|
| 1 | STATE-01 | pass | 17 | MOTION-01 | 종속 |
| 2 | STATE-02 | pass | 18 | MOTION-02 | 종속 |
| 3 | STATE-04 | n-a | 19 | MOTION-03 | 종속 |
| 4 | TOKEN-01 | pass | 20 | IA-01 | pass |
| 5 | TOKEN-02 | 종속 | 21 | IA-02 | pass |
| 6 | TOKEN-03 | 종속 | 22 | IA-04 | n-a |
| 7 | TOKEN-04 | 종속 | 23 | IA-05 | n-a |
| 8 | TOKEN-05 | 종속 | 24 | IA-13 | n-a |
| 9 | COMP-10 | n-a | 25 | EXC-01 | 종속 |
| 10 | FEEDBACK-02 | pass | 26 | EXC-02 | 종속 |
| 11 | FEEDBACK-04 | pass | 27 | EXC-03 | pass |
| 12 | FEEDBACK-06 | n-a | 28 | EXC-04 | pass |
| 13 | A11Y-01 | 종속 | 29 | EXC-08 | **gap** |
| 14 | A11Y-02 | 종속 | 30 | EXC-09 | pass |
| 15 | A11Y-11 | pass | 31 | EXC-21 | pass |
| 16 | A11Y-12 | n-a | | | |

> 31행 전수 · `pass` 12 + `종속` 11 + `n-a` 7 + `gap` 1 = **31** ✓
>
> **P0 gap 1건 — quality-bar '배치 실패' 사유.** EXC-08(멱등키 부재)이며, `If-Match` 가 데이터 안전을 이미 보장해 **잔여 위험은 UX 다**(BE-078 §7.7). **선례가 같은 섹션 안에 있는데 이 화면만 쓰지 않는다.**
>
> **형제 화면과 갈린 두 판정**: **A11Y-11** 은 NFR-067 이 gap 인데 여기는 **pass** 다 — 이 화면이 `FormField`/`TextInputField` 경로를 **유지**했기 때문이며, 판정 기준이 느슨해진 것이 아니라 **표면이 다르다.** **EXC-04** 는 둘 다 pass 이나 이 화면은 **'달라진 항목' 표시까지 참**이다(평면 문서).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(목록·검색·필터·페이지네이션·재정렬·CSV·이미지 업로드·시크릿·낙관적 업데이트)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 재조회 중 이전 폼 값이 유지된다(`loading` 판정이 첫 로딩만 본다 — `:230`). **그러나 `useEffect([data, reset])`(`:219-222`)가 편집 중 재조회에서도 `reset` 을 돌려 입력을 덮는다.** **이 화면에서는 더 나쁘다** — 덮이는 값이 `usePg` 면 **구획이 통째로 갈아 끼워져** 입력하던 자리가 화면에서 사라진다(FS-078-EL-012 · §7 #4) | 값을 고치는 중 devtools 로 invalidate → 입력이 유지되는지. **구획이 바뀌면 재현** | **gap** |
| STATE-05 | P1 | **표면이 없다** — 단일 문서라 empty 상태가 존재하지 않는다 | — | **n-a** |
| STATE-06 | P1 | 저장 성공이 `setQueryData(key, saved)` 로 **새 문서를 캐시에 직접 심고** invalidate 한다(`_shared/queries.ts:45-46`). 그래서 연속 저장이 낡은 revision 으로 409 를 맞지 않는다 — 코드가 그 함정을 주석으로 못박는다(`:43-44`). **다만 이 화면의 저장은 화면 밖 12개 지점도 바꾸는데**(BE-078 §7.4) 그쪽은 캐시가 아니라 모듈 지역 변수라 **무효화 대상에 없다** | 저장 후 상품 목록으로 이동 → 버튼·금액 칸이 바뀌어 있는지. **새로고침하면 시드로 되돌아가는지**(현재 그렇다 — §5 #5) | **pass(캐시) · gap(화면 밖 전파)** |
| COMP-01 | P1 | 모든 버튼이 DS `<Button>` 이다(셸 `:133,177` · 다이얼로그는 DS 소유). `grep -rn "buttonStyle(\|tds-ui-btn-" pages/settings/payment` 의 유일한 히트는 **미리보기의 `<span>`**(`CheckoutCtaPreview.tsx:98`)인데, 그것은 **버튼이 아니라 버튼처럼 보이는 표시물**이며 코드가 그 판단을 적는다(`:10-12` '누를 것이 없는 자리에 진짜 버튼을 두면 운영자는 눌러 보고 아무 일도 일어나지 않는 것을 확인하게 된다') | 그 grep 히트가 미리보기 1건뿐인지 | **pass** |
| COMP-04 | P1 | required 입력이 전부 `FormField required`(또는 그것을 감싼 `TextInputField`)로 노출돼 라벨 옆 `*` 가 렌더된다 — PG사·연동 모드·상점 ID·안내 문구(`:423,436,456,518`). **결제수단만 예외이며 그것은 묶음 필수라 `<ul>` 의 `aria-label` 이 '(필수)'를 싣는다**(`:476`) | 각 required 필드에 `*` 가 보이는지 | **pass** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `[0,1,2,3]`(`SettingsFormShell.tsx:156`) — **이 화면은 특히 어긋난다**: 꺼진 상태의 실제 shape 는 '스위치 1 + 미리보기 2칸 + textarea 1'이고 켜진 상태는 'select 2 + 텍스트 1 + 체크박스 5 + 미리보기 2칸'이라 **두 벌인데 로딩은 한 벌이다** | 켜짐/꺼짐 각각에서 스켈레톤과 실제 shape 를 대조 | **gap** |
| COMP-12 | P2 | 카운터가 하나 있다 — 상점 ID `N/60`(`:461`). **안내 문구(200자)에는 카운터가 명시돼 있지 않고**(DS `TextareaField` 의 `maxLength` 만 넘긴다 — `:523`) 두 필드 모두 **상한 근접 경고가 없으며** `maxLength` 가 조용히 자른다. counting 기준은 `value.length`(UTF-16 code unit)이며 **화면에 명시되지 않았다** | 60자·200자에 근접시켜 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패 = 폼을 대체하는 인라인 Alert · write 성공 = toast(2분기 — `:259-263`) · write 실패 = 카드 배너(`:277`) · **다이얼로그가 떠 있으면 그 안에만**(`:364` 의 `pending === null && conflict === null`). ✅ **형제 화면 `../site` 가 빠뜨린 `conflict === null` 검사를 이 화면은 한다**(FS-067 §7 #5) | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지. 충돌 중에는 카드 배너가 중복되지 않는지 | **pass** |
| FEEDBACK-03 | P1 | 성공·실패 양 경로가 배선돼 있다(성공 toast `:259-263` / 실패 배너 `:277` / 충돌 다이얼로그 `:271-275`). **no-op 클릭이 없다** — 저장 버튼은 `!dirty` 면 비활성이고 확인 다이얼로그는 실패해도 닫히지 않는다 | `?fail=save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 저장에 확인 게이트가 있다(FEEDBACK-02). **undo window·snapshot 은 없다** — 이전 설정으로 되돌리는 경로가 없고 감사도 마지막 1건뿐이다(BE-078 §7.7). 삭제가 없어 요구의 delete 절은 걸리지 않는다 | 잘못 저장한 뒤 되돌릴 수단이 있는지 → 없다 | **pass(confirm) · gap(undo)** |
| A11Y-03 | P1 | ConfirmDialog 표면 3종. 초기 포커스(update intent → Confirm / discard intent → Cancel)는 DS `ConfirmDialog` 가 소유한다. **충돌 다이얼로그는 3-액션이라 DS ConfirmDialog 가 아니다** — `ConflictDialog` 의 초기 포커스 규칙이 명시돼 있는지는 그 컴포넌트 소유 판정이다 | DS 판정에 종속 | **종속** |
| A11Y-13 | P1 | **미충족.** `handleSubmit(onValid)`(`:387`)에 **`onInvalid` 가 없어** 검증 실패 시 첫 오류 필드로 포커스가 가지 않는다. 폼 진입 첫 필드 자동 포커스도 없다. ✅ **다만 오류 필드가 화면 밖에 있을 수는 없다** — 검증 규칙이 `usePg` 로 갈리고 구획도 같은 값으로 갈려, 오류가 꽂히는 필드는 **언제나 렌더된 구획 안**에 있다(FS-078-EL-027) | PG 를 켜고 상점 ID 를 비운 채 저장 → `document.activeElement` 가 상점 ID 입력인지 | **gap** |
| A11Y-16 | P1 | 새 인터랙티브 표면이 표준 계약을 대체로 충족한다 — 구획이 `<section aria-labelledby>` + `<h3 id>`(`:151-154`) · 결제수단이 `role="group" aria-label`(`:475-476`) · 오류 문단이 `role="alert"`(`:501`) · 링크에 접근 이름. **잔여**: **미리보기(FS-078-EL-006)가 `usePg`·상점 ID 변경에 따라 즉시 다시 계산되는데 live region 이 없다** — 시각 사용자만 CTA 라벨이 바뀌는 것을 본다 | 스위치를 토글할 때 스크린리더가 미리보기 변화를 읽는지(현재 안 읽는다) | **gap(경미)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 확인 문구가 결과를 말한다(`:169-179`). 숫자 표시가 카운터 하나뿐이라 포맷 축이 거의 걸리지 않는다 | 셀·문구에 raw `toString()` 이 없는지 | **pass** |
| ERP-13 | P1 | 이 화면의 사용자 대상 문자열에 **리터럴 조사 폴백이 0건**이다(`이(가)`·`을(를)`·`(으)로` grep 0). 이름을 interpolate 하는 문자열이 없다 — 확인 문구·배너가 전부 고정 문장이다 | 조사 폴백 grep = 0 | **pass** |
| EXC-05 | P1 | `AbortSignal.timeout` **앱 전역 0건**(실측) — 이 화면도 상한이 없다. abort 는 언마운트·확인 취소·충돌 닫기에서만 발생한다. **BE-078 §2 가 서버 상한을 5초로 잡으므로 '서버 상한 < 프론트 상한' 관계를 만들 프론트 쪽이 없다** | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **미충족.** 조회 실패(FS-078-EL-018)·저장 실패(EL-020)가 **status 를 구분하지 않는다** — 401/403/404/422/429/500 이 한 문구다. 근본 원인은 `createRevisionedStore` 가 **`HttpError`(status 보유)를 던지지 않는 것**이고(`_shared/store.ts:134-146`), 409 만 `SettingsConflictError` 로 갈린다. 403 은 재시도 수단을 주면 안 되고 422 는 필드로 가야 하는데 둘 다 같은 배너다 | `?status=save:403` · `save:422` · `save:429` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **미충족.** 서버 422 의 `error.fields` → RHF `setError` 매핑이 없다 — `useCrudForm` 을 쓰지 않고 `useForm` + `useSaveSettings` 를 직접 조립하며, 어댑터가 필드 정보를 실은 오류를 만들지 않는다. **BE-078 §4 가 필드 이름 계약(`merchantId`·`methods`·`inquiryGuide`)을 확정해 두었으므로 통로만 생기면 된다** | `?status=save:422` → 상점 ID 필드에 인라인 오류가 뜨는지(현재 안 뜬다) | **gap** |
| EXC-11 | P1 | `navigator.onLine` **앱 전역 0건**(실측) — offline 배너·write 게이팅·복귀 refetch 가 없다. **이 화면에서 특히 아프다** — 요청이 hang 하면 운영자는 판매 방식이 바뀌었는지 모른 채 다시 누른다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면이 부분적으로만 성립한다** — 이 화면에 detail/edit 라우트가 없고 **문서는 항상 존재한다**(BE-078 §5) 라 404 분기가 발생하지 않는다. generic error 는 '설정을 불러오지 못했습니다.' + '다시 시도' 하나다. ⚠ **그 문구가 도메인 없는 문구다** — 셸이 `cardTitle` 을 받는데 배너에 쓰지 않는다(FS-078 §7 #8) | `?status=load:404` 와 `load:500` 이 같은 화면인지(현재 같다 — EXC-06 과 한 뿌리) | **gap(경미)** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적(응답 후 `reset` + 캐시 심기)이다. `onMutate`/`setQueryData` 를 화면이 부르지 않는다(캐시 심기는 훅이 성공 후에 한다). **미리보기는 드래프트를 그리지만 그것은 낙관적 업데이트가 아니라 시뮬레이션**이다(FS-078 §4.1) | 이 화면에 `onMutate` 가 0건인지 | **pass** |
| EXC-19 | P1 | **미충족** — 401 리다이렉트가 미저장 입력을 버린다(프로그램적 이동이라 이탈 가드 미발화). 세션 만료 경고·연장도 없다 | `?status=save:401` 로 저장 → 재인증 후 입력이 복원되는지(현재 안 된다) | **gap** |
| EXC-20 | P1 | **미충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 가 없다** — `referenceOf`(`shared/errors/http-error.ts`)가 이미 있는데 이 경로가 쓰지 않는다. 원인은 EXC-06 과 같다(`HttpError` 가 오지 않는다) | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이는지(현재 안 보인다) | **gap** |
| **EXC-22** | P1 | **이 화면이 fail-**closed** 축의 구현체다.** `pgSellable`(`payment-settings.ts:128-130`)이 '켜져 있으나 상점 ID 공란'을 **판매 불가로 수렴**시키고, 소비 축 둘(`pgLock`·`resolvePriceDisplay`)이 **같은 술어를 부른다**(`pg-lock.ts:73` · `price-display.ts:92`) — 각자 `usePg` 를 다시 읽지 않는다. 회귀가 그 방향을 고정한다(`pg-axes.test.ts:52-56` — `PG_HALF` 픽스처 · `payment-settings.test.ts:66-77`). **권한 축도 fail-closed 이고 엔타이틀먼트 축만 fail-open 이다**(NFR-079 §2 EXC-21 · `route-entitlement.ts:10-12`) — 세 축의 방향이 이 요구의 대상이며 **이 화면은 그중 하나를 소유한다.** ⚠ **잔여**: fail-closed 가 닫는 것은 '비어 있음'뿐이다 — 오타 난 상점 ID 는 `pgSellable === true` 로 통과한다(BE-078 §7.1 · FS-078 §7 #17) | `pg-axes.test.ts` 통과로 방향이 고정된다. 상점 ID 를 공백만 넣고 저장을 시도 → 검증이 막고, 규칙도 문의로 수렴하는지 | **pass(경계 잔여)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 조회 응답 p95 | ≤ 300ms (BE-078 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다(`_shared/store.ts:129,135`). 실제 네트워크 0건 |
| 저장 응답 p95 | ≤ 500ms | 위와 동일 |
| 첫 렌더 | ≤ 1.0s (LCP) | 미측정. **문서 1건 · 컨트롤 최대 10개 고정**이라 데이터 규모에 비례하지 않는다 — 렌더 비용이 상수다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입 0회. 창 포커스 재조회 0회 | 전역 `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시하고 **이 화면이 재정의하지 않는다**(`_shared/queries.ts:15-19` 는 `queryKey`·`queryFn` 만 준다) — **충족** |
| 저장 요청 크기 | ≤ 2KB | **충족.** 6필드이며 텍스트에 60자·200자 상한이 걸려 있고 배열은 최대 5원소다. **목록·이력을 싣지 않는다** — BE-044 류의 '요청이 이력에 비례해 커지는' 문제가 구조적으로 없다 |
| 미리보기 계산 | 렌더당 2회(`checkoutCta` 상품·프로그램) | 순수 함수 2회 호출(`CheckoutCtaPreview.tsx:89-90`). **비용이 상수이며 네트워크 0** |
| 검증 비용 | 제출당 1회 + `shouldValidate` 지점 | zod `safeParse`. `mode` 미지정이라 RHF 기본 `onSubmit` 이고, 스위치·체크박스·textarea 의 `setValue(..., { shouldValidate: true })`(`:402,349,521`)가 그 시점에 1회 돈다 |
| 저장 후 파급 비용 | **12개 소비 지점의 다음 렌더** | `writePaymentSettings` 는 모듈 지역 변수 대입 1회(`payment-settings.ts:201-203`)이고 소비는 렌더 시점 동기 읽기다 — **지금은 비용이 0에 가깝다.** 서버 연동 후에는 그 자리가 캐시 조회가 된다(BE-078 §7.4 · §5 #5) |
| 번들 | 이 화면 고유 코드 ≤ 12KB(gzip) | 미측정. 화면 4파일(`PaymentSettingsPage.tsx` 571행 · `validation.ts` 102 · `types.ts` 54 · `data-source.ts` 57) + 컴포넌트 1(`CheckoutCtaPreview.tsx` 110). 외부 의존 0(전부 공용 모듈·DS·zod/mini). 라우트가 `lazy` 다(`App.tsx:206`) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(STATE-02 pass). 폼 대신 배너 |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·입력 보존·재시도(다이얼로그 유지)는 되나 **reference 없음**(EXC-20 gap) |
| **거절된 저장이 판매 방식을 바꾸는가** | 바꾸지 않는다 | **충족 — 이 화면의 핵심 안전장치.** `writePaymentSettings` 가 `await revisioned.save(...)` **뒤에만** 불린다(`data-source.ts:41-46`, 근거 `:8-9`). 실패·409 에서는 부르지 않는다 |
| **동시 편집(두 관리자)** | 나중 저장이 앞선 변경을 덮지 않는다 | **충족** — revision 토큰 불일치 → 409 → 3-액션 충돌 다이얼로그 + 입력 보존(EXC-04 pass). `_shared/store.test.ts` 가 회귀를 막는다. **'무엇이 달라졌는지'도 옳게 말한다**(평면 문서) |
| 저장 응답 유실 후 재시도 | 중복 적용 없음 + 사용자가 성공을 안다 | **부분 충족** — `expectedRevision` 이 중복 적용을 막으나(데이터 안전) 사용자는 **거짓 충돌 다이얼로그**를 본다(EXC-08 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **단 서버 도달 여부는 보장하지 않는다** — 이 화면은 판매 방식이 걸려 그 불확실성이 실질 위험이다(FS-078 §7 #11) |
| 확인 다이얼로그 중 실패 | 다이얼로그 유지 + 재시도 | **충족**(FEEDBACK-02 pass) |
| 편집 중 재조회 | 입력이 유지된다 | **미충족** — `useEffect([data, reset])`(`:219-222`)가 입력을 덮고, `usePg` 가 덮이면 **구획이 통째로 갈아 끼워진다**(STATE-03 gap) |
| 세션 만료 중 편집 | 재인증 후 입력 복원 | **미충족**(EXC-19 gap) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05, 앱 전역). **BE-078 §2 의 '서버 5초 < 프론트 상한' 관계가 성립하지 않는다** |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:395-400`) |
| **새로고침 후 저장값 유지** | 유지된다 | **미충족(픽스처 한정)** — 저장이 모듈 지역 변수와 클로저에만 남아 **새로고침하면 시드로 되돌아간다**(FS-078 §7 #10). 형제 축(엔타이틀먼트)은 localStorage + `storage` 이벤트를 갖는다 |

### 4.3 설정 무결성 · 파급 · 감사

이 화면은 **사이트가 결제로 파는가 문의로 받는가**를 정하고, 그 한 값이 **12개 지점의 동작**을 바꾼다(BE-078 §7.4). quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| **판정이 한 술어로 수렴한다** | **충족** — `pgSellable` 하나를 `pgLock`·`resolvePriceDisplay`·`inquiryMenuState`·`checkoutCta` 가 함께 부른다(`pg-lock.ts:73` · `price-display.ts:92` · `inquiry-backlog.ts:119` · `payment-settings.ts:144`). **각자 `usePg` 를 다시 읽는 화면이 0건**이다(grep 실측) |
| **실패 방향이 닫는 쪽이다** | **충족(fail-closed)** — `usePg && merchantId.trim() !== ''`(`payment-settings.ts:128-130`). 회귀 `pg-axes.test.ts:52-56`. ⚠ **'틀린 값'은 닫지 못한다**(§5 #8) |
| **파생값을 저장하지 않는다** | **충족** — CTA·잠금·가격 표시 모두 매번 규칙에서 만든다(BE-078 §7.2). 저장했다면 스위치 한 번에 수백 건이 낡은 값이 되고 일괄 갱신이 절반에서 실패한다 |
| **잠금이 값을 지우지 않는다** | **충족(프론트)** — `pgLock` 은 `{ locked, reason }` 만 돌려주고 어떤 저장도 하지 않는다(`pg-lock.ts:72-75`). 꺼진 구획의 값도 폼에 남아 저장으로 나간다(FS-078-EL-012). ⚠ **서버가 이를 어기지 않는다는 보장은 계약 문장뿐이다**(BE-078 §7.3 · §7.9 #5) |
| **무엇이 잠기지 않는가가 지켜진다** | **충족** — 옵션 구성과 상품 등록·수정은 잠기지 않고 **재고 수량만** 잠긴다(`pg-lock.ts:12-16` · `ProductOptionMatrix.tsx:103`). 기존 쿠폰 조회도 열려 있다 |
| **위험한 저장의 결과를 미리 알린다** | **충족** — ① 미리보기가 **드래프트 값**으로 즉시 다시 그린다(`:409` `settings={values}`) ② 확인 문구가 4갈래로 결과를 말한다(`:169-179`) ③ PG 미사용 배너가 문의 창구까지 링크한다(`:371-385`) |
| **`live` 전환이 특별 취급을 받는가** | **부분 충족** — 확인 문구만 갈린다('저장하는 즉시 고객이 실제로 결제할 수 있습니다'). **별도 권한·별도 확인·감사 이벤트가 없다**(BE-078 §7.6) |
| **설정을 되돌릴 수 있는가** | **미충족** — 이전 값 보관도, undo 도, 변경 이력도 없다. `AuditInfo` 는 **마지막 1건**(`_shared/store.ts:17-21`)이고 저장이 그것을 덮어쓴다. '지난주에 왜 PG 가 꺼져 있었나'에 답할 수 없다(BE-078 §7.7) |
| **감사 주체가 위조 불가한가** | **미충족(픽스처)** — `updatedBy` 가 하드코딩 `'김운영'`(`_shared/store.ts:100`). **심이 이미 서버가 찍어야 한다고 선언한다**(`:99`) |
| **설정과 소비 화면의 캐시가 어긋나지 않는가** | **미충족(구조적)** — 소비 정본이 **모듈 지역 변수**(`payment-settings.ts:188`)이고 12개 지점이 렌더 시점에 **동기로** 읽는다. 저장한 탭은 즉시 반영되지만 **다른 탭·다른 세션은 자기 캐시가 만료될 때까지 옛 값으로 그린다.** 서버가 붙으면 이 동기 계약 자체가 성립하지 않는다(BE-078 §7.4 · §7.9 #4) |
| **상점 ID 가 안전하게 취급되는가** | **충족(등급 확정)** — MID 는 **식별자이며 비밀이 아니다**(`payment-settings.ts:192-193` · 화면 힌트 `:460`). 그래서 마스킹하지 않는 것이 정답이고, 이 경로에 마스킹·시크릿 코드가 **0건**인 것도 정답이다(grep 실측). **PG 시크릿은 이 문서에 필드가 없다.** 단 `Cache-Control: no-store` 는 서버 몫이다(BE-078 §7.5) |
| **고객에게 렌더되는 문구가 안전한가** | **미정 — 서버 몫이다.** `inquiryGuide` 는 상품 카드·프로그램 상세에 그대로 나간다. 어드민 미리보기는 텍스트 노드로만 그리지만(`CheckoutCtaPreview.tsx:102-104`) **소비자가 HTML 로 해석하면 저장형 XSS** 다. 정제는 저장 시 서버가 한다(BE-078 §7.5) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **EXC-08** | **P0** | 저장에 **멱등키 없음**(grep 0건). 동기 잠금(`useSubmitLock`)이 있어 연타는 막히고 `expectedRevision` 이 중복 적용을 막아 **데이터는 안전**하다. 잔여는 '자기 저장에 대해 거짓 충돌 다이얼로그를 보는' UX. **선례가 같은 섹션 안에 있다**(`api-keys/ApiKeysPage.tsx`) | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-078 §7.7 · FS-078 §7 #5) |
| 2 | EXC-06 · EXC-07 · EXC-12 · EXC-20 | P1 | 조회·저장 실패가 **status 를 구분하지 않고 참조 코드도 없다.** 근본 원인은 `createRevisionedStore` 가 **`HttpError` 를 던지지 않는 것**이며 409 만 갈린다. **BE-078 §4 가 `error.fields` 이름 계약을 확정해 두었으므로 통로만 생기면 된다** | 이 화면 + `_shared/store.ts` + 어댑터 | UI 기획 · 백엔드 명세 (FS-078 §7 #6 · BE-078 §7.9 #3) |
| 3 | (FS-078 §7 #9) | — | **도착 전에는 PG 미사용 배너가 언제나 뜬다** — `warning` 슬롯이 스켈레톤 분기 **밖**이고(`SettingsFormShell.tsx:152`) 그때 값은 `DEFAULT_FORM_VALUES.usePg === false` 다. **PG 를 켜 둔 계정도 로딩 400ms 동안 '지금은 PG 결제를 쓰지 않는 상태입니다'를 읽는다.** 조건에 `!loading` 을 곱하면 사라진다 | 이 화면(+ 셸) | 프론트 구현 |
| 4 | STATE-03 | P1 | `useEffect([data, reset])`(`:219-222`)가 **편집 중 재조회에서도 `reset`** 을 돌려 입력을 덮는다. **이 화면에서는 구획이 통째로 갈아 끼워진다** | 이 화면(설정 4화면 공통 패턴) | UI 기획 쪽 변경 요청 (FS-078 §7 #4) |
| 5 | (FS-078 §7 #10 · BE-078 §7.9 #4) | — | **저장이 새로고침을 넘기지 못하고, 소비 정본이 모듈 지역 변수다** — 영속도 크로스탭 동기화도 없다. **서버 연동 시 `readPaymentSettings()` 의 동기 계약이 깨진다** — react-query 캐시 조회로 전환해야 한다 | 이 화면 + `shared/commerce` | **아키텍처 · 프론트 구현** |
| 6 | A11Y-13 · A11Y-16 · (heading skip) | P1 | ① `handleSubmit(onValid)` 에 **`onInvalid` 가 없어** 첫 오류 필드로 포커스가 가지 않는다 ② **미리보기 변화가 announce 되지 않는다**(live region 없음) ③ **h1 → h3 로 건너뛴다**(h2 부재 — `CardTitle` 은 heading 이 아니다) | 이 화면(+ DS `CardTitle` 시맨틱) | UI 기획 쪽 변경 요청 (A11Y) · DS |
| 7 | (FS-078 §7 #15 · #16) | — | ① 읽기 전용 역할에게 저장 **버튼**은 없지만 `<form onSubmit>` 은 남아 **Enter 제출이 발화한다**(필드가 disabled 라 실현되지 않으나 **방어가 구조가 아니라 우연**이다) ② **'덮어쓰기'가 `getValues()` 원값을 보내 trim 과 재검증을 건너뛴다**(`:321-323`) — 서버 trim 이 유일한 방어인데 그 422 를 화면이 필드로 되돌리지 못한다(#2 와 한 묶음) | 이 화면 | 프론트 구현 · 백엔드 명세 |
| 8 | (FS-078 §7 #17 · BE-078 §7.9 #2) | — | **fail-closed 가 '비었을 때'만 닫힌다** — 상점 ID 의 형식도 안 보고 PG 사에 확인도 하지 않으므로(연결 테스트 심 0건) **오타 하나가 저장되면 앱 전체가 '결제창이 열린다'를 전제로 그린다.** 실제로는 열리지 않는다 | 이 화면 + BE 계약 | **아키텍처 · 백엔드 명세** |
| 9 | (BE-078 §7.6 · §7.7) | — | **`mode: 'live'` 전환에 게이트·감사 이벤트가 없고, 변경 이력 자체가 없다.** `AuditNote` 는 마지막 1건뿐이라 '언제 운영으로 올렸나'·'누가 PG 를 껐나'에 답할 수 없고 **되돌리기도 없다** | BE 계약 | **백엔드 명세 (우선)** · UI 기획 |
| 10 | COMP-06 · COMP-12 | P2 | 스켈레톤 4행 하드코딩(**이 화면은 shape 가 두 벌인데 로딩은 한 벌**) · 안내 문구에 카운터 부재 · 상한 근접 경고 부재 · counting 기준 미명시 | 이 화면(+ 셸) | UI 기획 |
| 11 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 미저장 입력을 버린다 | **앱 전역** | 프론트 구현 · UI 기획 |
| 12 | (FS-078 §7 #2 · #19) | — | **이 화면의 검증에 단위 테스트가 0건이고 e2e 도 0이다** — `paymentSettingsSchema` 를 부르는 파일이 정의·소비 둘뿐이라 **교차 규칙 4갈래가 하나도 고정돼 있지 않다.** 대조군이 바로 옆에 있다(`payment-settings.test.ts` · `pg-axes.test.ts` 는 순수 규칙을 촘촘히 고정한다). **§2·§3 의 모든 '재현 절차'가 아직 사람 손으로만 실행 가능하다** | 이 화면 | **프론트 구현 (최우선)** · 명세 리뷰 |
| 13 | (FS-078 §7 #8 · #12 · #13) | — | 판정에 직접 걸리지 않으나 함께 추적: 조회 실패 배너의 **도메인 없는 문구**(설정 4화면 공통) · **'쓰지 않는 구획을 숨기는' 선택이 형제 `../site` 와 정반대이고 값 보존을 말하지 않는다** · **`checkoutCta.reason` 이 소비되지 않아** '상점 ID 가 비어 결제창을 열 수 없다'는 설명이 화면 어디에도 없다 | 이 화면 + 셸 | UI 기획 쪽 확인 요청 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다**(기준일 2026-07-22). 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (어댑터 코드에서 확인)**

`paymentSettingsStore` 는 `createRevisionedStore<PaymentSettings>('payment', …)`(`data-source.ts:29`)로 만들어지므로 **scope = `payment`** 이고(상수 `data-source.ts:26` `const SCOPE = 'payment';`), `failIfRequested(scope, op)` 를 **두 곳**에서 부른다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `load` | `fetch` (`_shared/store.ts:130`) | `?fail=load` · `?fail=payment:load` · `?fail=all` |
| `save` | `save` (`_shared/store.ts:136`) | `?fail=save` · `?fail=payment:save` · `?fail=all` |

**충돌 재현 스위치(이 섹션 고유 — `dev.ts` 에 없다)**

`conflictRequested(scope)`(`_shared/store.ts:60-65`)가 `?fail=` 파라미터를 **직접** 읽어 `conflict` / `payment:conflict` 를 찾는다. 걸리면 저장 직전에 revision 을 바꿔(`:139-141`) 토큰을 어긋나게 만든다 — **다른 관리자가 먼저 저장한 상황을 재현**한다. 화면 머리말이 세 스위치를 문서화한다(`data-source.ts:11-14`).

| 재현 | 결과 |
|---|---|
| `/settings/payment?fail=load` | 조회 실패 → 폼 대신 인라인 배너 + 다시 시도 |
| `/settings/payment?fail=save` | 저장 실패 → 확인 다이얼로그 안 danger 배너(다이얼로그 유지) |
| `/settings/payment?fail=conflict` | 저장이 409 → **충돌 다이얼로그**(EXC-04 판정) |

- **`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:15-22`, 판정 `:66-80`)는 `failIfRequested` 를 거치는 op 에 걸리므로 `?status=load:401` · `?status=save:403` · `?status=save:422` · `?status=save:500` 등이 이 화면에도 적용된다. 다만 **이 화면이 status 로 분기하지 않아**(EXC-06 gap) 결과 화면이 같다 — **그것이 곧 gap 의 재현이다.**
- **`?delay=` 는 이 리포에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. **STATE-01 재현은 `staleTime` 30초 경과 후 재진입 또는 devtools invalidate 로 한다.**
- **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

| 판정 | 재현 |
|---|---|
| STATE-01 | 값 확인 → 30초 후 재진입. **스켈레톤이 뜨면 gap** |
| STATE-02 | `?fail=load` — danger Alert + '다시 시도'가 없거나 토스트가 뜨면 gap |
| TOKEN-01 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px" pages/settings/payment` = **0건** |
| FEEDBACK-02 | `?fail=save` + 스위치 내리고 저장 → **다이얼로그 유지 + danger 배너 + 확인 재활성**이면 pass |
| A11Y-11 | RTL: PG 켜고 상점 ID 비운 채 저장 → `aria-describedby` ↔ `role="alert"` id 일치, `aria-required === 'true'` |
| A11Y-12 | `grep -rn "aria-current\|aria-pressed" pages/settings/payment` = **0건**(n-a 확인) |
| IA-02 | `document.querySelectorAll('h1').length === 1` 이고 문구가 '결제 설정' |
| EXC-03 | 권한 스토어에서 `update` off — **저장 버튼이 사라지고 컨트롤 10개가 비활성**이면 pass |
| EXC-04 | `?fail=conflict` — 충돌 다이얼로그 + 입력 보존 + **'달라진 항목'에 실제로 고친 필드만** 뜨면 pass |
| EXC-08 | 확인 버튼 2연타 — 요청 1건이면 ① pass. `grep Idempotency` = 0건이면 ② gap |
| EXC-09 | 저장 중 '취소' — 실패 배너·토스트가 없으면 pass |
| EXC-21 | 권한 `read` off → 403 화면만(업그레이드 문구 0건). 플랜을 내려도 이 화면이 열리는지 |
| **EXC-22** | `pnpm vitest run apps/admin/src/shared/commerce/pg-axes.test.ts` — **`PG_HALF`(상점 ID 공백) 가 `pgSellable === false` 로 고정되면 fail-closed 방향이 확인된다** |
| §5 #8 (오타 MID) | 상점 ID 에 존재하지 않는 값을 넣고 저장 → **미리보기가 '구매하기'로 바뀌면 재현**(fail-closed 가 못 잡는 자리) |

**그 밖의 도구**: `grep`(TOKEN-01 · A11Y-12 · IA-02 · EXC-08 · 소비처 전수) · RTL(A11Y-11 · A11Y-13) · **`shared/commerce/payment-settings.test.ts`(CTA·fail-closed·저장 반영)** · **`shared/commerce/pg-axes.test.ts`(축 A·축 B·잠금 6구획·조건부 메뉴)** · `pages/settings/_shared/store.test.ts`(낙관적 동시성 — **EXC-04 의 근거**). ⚠ **이 화면 자신의 검증 테스트는 0건이다**(§5 #12).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(`파일:줄`)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다 — **STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 은 전부 '단일 문서 폼이라 목록·검색·폼 modal 표면이 없다'** 는 같은 뿌리이며, 각 칸에 그 뿌리를 개별로 적었다
- [x] §2.1 산수 검산 — 12 + 11 + 7 + 1 = **31** ✓ (검산 표로도 31행 전수 나열)
- [x] §6 의 `?fail=` scope(`payment`)와 op(`load`·`save` + `conflict`)를 **어댑터 코드(`data-source.ts:26` · `_shared/store.ts:60-65,130,136`)에서 확인**했고 `?delay=` 를 쓰지 않았다
- [x] §5 의 gap 이 FS-078 §7 · BE-078 §7.9 와 대응한다
- [x] **EXC-21 · EXC-22 를 판정하며 실패 방향을 명시**했다 — 이 화면의 축은 **fail-closed**(`pgSellable`)이고, **엔타이틀먼트 축은 fail-open** 이며 그 판정은 NFR-079 가 갖는다는 사실을 §1.2 · §2 · §3 에 못 박았다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 '측정 불가(백엔드 없음)', E2E 미실행 명시. `inquiryGuide` 의 XSS 안전성은 '소비자 쪽 미정'으로 남겼다
