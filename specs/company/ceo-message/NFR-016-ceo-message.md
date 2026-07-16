---
id: NFR-016
title: "CEO 인사말 비기능 명세"
functionalSpec: FS-016
backendSpec: BE-016
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-016. CEO 인사말 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-016 CEO 인사말 (`/company/ceo-message` — 단일 문서 편집 폼) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **요구 문구의 정본은 그 문서다** |
| 이 문서의 역할 | quality-bar 를 **이 화면에 적용한 판정표**다. 요구를 재서술하지 않고 **ID 로만 참조**하며, '이 화면에서 어떻게 충족되는가(코드 근거)' 와 '무엇을 재현하면 판정되는가(측정 기준)' 만 쓴다 |
| 함께 읽는 문서 | FS-016(요소·예외) · BE-016(엔드포인트·보안 판정). §5 의 gap 은 FS-016 §7 · BE-016 §7.7 과 **같은 항목을 가리킨다** |
| 형제 문서 | NFR-015(회사 정보) — **같은 골격**(단일 문서형)이라 P0 30건의 판정 구조가 같다. **EXC 계열 gap 3건은 동일하며 뿌리도 같다**(`useSaveDocument` 직접 사용). **다만 F3a 이후 A11Y-11 판정이 갈렸다** — 이 화면은 pass(gap 3건), NFR-015 는 gap 유지(gap 4건)다. 사유: NFR-015 의 `profile-biznum` 은 hint 를 갖고도 valid 일 때 `aria-describedby` 로 물리지 않는데, 이 화면의 손수 배선 입력(제목)에는 hint 가 없다. 이 문서는 그 판정을 재확인하고 **이 화면 고유의 차이**(본문 5000자 · `TextareaField` · 손실 규모)를 기술한다 |
| 갱신 규칙 | quality-bar 가 개정되면 §2 의 30행을 재판정한다. 이 화면의 코드가 바뀌면 근거의 `파일:라인` 을 갱신한다. **판정을 코드보다 먼저 고치지 않는다** |
| 판정 방식 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 판정 기준일 | **2026-07-17 · HEAD `4b805ad`** 기준 코드 대조. 직전 판정은 `3cd3078`(F2) 기준이었고, 이후 F3a·F3b·통합(PR #8·#11·#12·#14·#16)이 공용 계층을 바꿔 일부 판정이 뒤집혔다 — §2 각 행의 근거 라인 참조 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | `loading = isFetching && data === undefined` (`CeoMessagePage.tsx:60`) → 첫 조회에만 스켈레톤. `DocumentFormShell.tsx:127-135` 이 `loading` 일 때만 막대 4개를 그린다. 재조회(저장 후 `invalidateQueries`)에서는 `data` 가 있어 입력값이 유지된다 — **본문 5000자를 편집 중 스켈레톤으로 날려버리지 않는다.** 단일 문서라 empty 상태가 없다(4상태 중 3상태만 실재) | `/company/ceo-message` 진입 → 스켈레톤 1회. 저장 성공 후 배경 재조회 시 본문 textarea 가 스켈레톤으로 바뀌지 **않음**. `?fail=ceo-message:load` → 에러 배너만 | pass |
| STATE-02 | STATE | 직접 | 조회 실패 시 `loadFailed={error !== null}`(`CeoMessagePage.tsx:90`) → `DocumentFormShell.tsx:102-115` 이 `Alert tone="danger"` + '다시 시도'(`refetch`)로 폼 전체를 대체한다. read 실패에 토스트를 쓰지 않는다 | `?fail=ceo-message:load` → 인라인 danger Alert + '다시 시도' 버튼. 토스트 0건. '다시 시도' 클릭 시 쿼리 재발행 | pass |
| STATE-04 | STATE | N/A | **페이지네이션·행 선택 표면이 이 화면에 없다** — 단일 문서 편집 폼이다(FS-016 §1: 목록·`:id` 라우트 없음). clamp 할 page 도, 해제할 `selectedIds` 도 존재하지 않는다 | — | n-a |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 2개가 전부 토큰 참조다: `photoWrapStyle` 의 `maxWidth: calc(var(--tds-space-6) * 10)`(`CeoMessagePage.tsx:27-29`), `controlStyle()`(`shared/ui/styles.ts:297-311`). 하드코딩 hex·px 리터럴·border 키워드 0건 | `apps/admin/src/pages/company/ceo-message/**` grep: `#[0-9a-f]{3,6}` = 0 · `[1-9]px` = 0 · `(outline\|border): (thin\|medium\|thick)` = 0. ESLint `no-restricted-syntax` 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 focus ring 표면: 제목 입력의 `className="tds-ui-input tds-ui-focusable"`(`CeoMessagePage.tsx:102`), 본문 `<textarea>`(`TextareaField.css`), 저장 버튼(`Button`), 드롭존(`ImageUploadField`). ring 두께·색은 DS 가 소유한다 | 판정은 DS(`ui.css` · `TextareaField.css`) 소유 문서에서. 이 화면에서는 제목 입력·본문 textarea·저장 버튼의 ring 이 픽셀 동일한지만 확인 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비 표면: 저장 성공 토스트(`CeoMessagePage.tsx:75`)의 entrance animation(`Toast.css`). 이 화면은 easing 값을 직접 참조하지 않는다 | 판정은 Toast/tokens codegen 소유 문서에서. 이 화면에서는 저장 성공 토스트의 entrance 가 실제 재생되는지만 확인 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 elevation 표면: 폼 `Card`(`DocumentFormShell.tsx:122`), 저장 성공 토스트, 이탈 가드 `ConfirmDialog` 의 Modal | 판정은 Card/Modal/Toast 소유 문서에서. 이 화면에서는 세 표면이 light/dark 양쪽에서 부상하는지만 확인 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면의 `<h1>` 은 AppHeader 가 그린다(`AppHeader.tsx:101`) — `titleStyle` = `pageTitleStyle`(`shared/ui/styles.ts:51-60`)이 `--tds-typography-title-xl-*` 를 참조한다. 화면 자체는 제목을 그리지 않는다. 카드 제목은 `CardTitle`(DS) | 판정은 tokens/AppHeader 소유 문서에서. 이 화면에서는 헤더 'CEO 인사말' `<h1>` 이 카드 본문(body-md)보다 가시적으로 큰지만 확인 | 종속 |
| COMP-10 | COMP | N/A | **text-search/filter 입력이 이 화면에 없다.** 입력 3종은 전부 폼 필드이고(검색이 아니다) query 를 발행하지 않는다 — `useDebouncedSearch` 를 import 하지 않는다. **본문은 IME 로 대량 입력되지만 query 를 발행하지 않으므로**(제어 state 만 갱신) COMP-10 이 막으려는 '자모당 refetch'·'조합 중 Enter submit'·'out-of-order 응답' 이 성립하지 않는다 | — | n-a |
| FEEDBACK-02 | FEEDBACK | 상속 | 이 화면의 확인 게이트 표면은 **discard intent** 1건이다: 미저장 이탈 가드(`useUnsavedChangesDialog.tsx:212-221`, `intent="discard"`). 파괴적(삭제) 액션은 이 화면에 없다. busy 처리·실패 배너·abort 계약은 `ConfirmDialog` 가 소유한다 | 판정은 ConfirmDialog 소유 문서에서. 이 화면에서는 본문 수정 후 사이드바 링크 클릭 → discard 다이얼로그가 뜨고 tone/label 이 discard intent 로 해석되는지만 확인 | 종속 |
| FEEDBACK-04 | FEEDBACK | 직접 | `dirty={isDirty}`(`CeoMessagePage.tsx:94`) → `DocumentFormShell.tsx:100` 이 `useUnsavedChangesDialog(dirty && !saving, ...)` 로 배선. **3경로 전부**: `beforeunload`(`useUnsavedChangesDialog.tsx:120-131`) · capture-phase 링크 가로채기(`:134-155`) · popstate sentinel(`:157-182`). **제어 입력(본문·사진)도 `setValue(..., { shouldDirty: true })`(`CeoMessagePage.tsx:117,130`) 라 dirty 에 반영된다** — `shouldDirty` 를 빠뜨렸다면 본문 5000자 변경을 가드가 놓쳤을 것이다. 저장 성공 시 `reset(values)`(`:74`)로 해제 | 본문만 수정(dirty) 후 ① 탭 닫기 → 브라우저 confirm ② 사이드바 '회사 정보' 클릭 → discard 다이얼로그 ③ 브라우저 Back → discard 다이얼로그. 사진만 교체한 경우도 동일. 저장 성공 후 3경로 → 프롬프트 없이 통과 | pass |
| FEEDBACK-06 | FEEDBACK | N/A | **편집 가능한 폼을 담은 modal 이 이 화면에 없다.** 폼은 라우트 페이지 본문에 있고(rich 엔티티 → 전용 route, IA-06), 이 화면의 유일한 modal 인 이탈 가드 `ConfirmDialog` 는 입력을 담지 않는다 — dirty close 를 가드할 입력이 없다. `useModalDirtyGuard` 를 import 하지 않는다 | — | n-a |
| A11Y-01 | A11Y | 상속 | 이 화면의 live region 표면: 저장 성공 토스트(`CeoMessagePage.tsx:75` `toast.success`). 상시 마운트 aria-live 는 `ToastProvider`(앱 전역, `App.tsx:304`)가 소유한다 | 판정은 ToastProvider 소유 문서에서. 이 화면에서는 저장 성공 시 'CEO 인사말을 저장했습니다.' 가 announce 되는지만 확인 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 이탈 가드 `ConfirmDialog`(message = 'CEO 인사말에 저장하지 않은 변경 사항이 있습니다…', `CeoMessagePage.tsx:24-25` → `DocumentFormShell.tsx:100`) | 판정은 Modal/ConfirmDialog 소유 문서에서. 이 화면에서는 가드 다이얼로그 open 시 제목과 본문이 **둘 다** 읽히는지만 확인 | 종속 |
| A11Y-11 | A11Y | 직접 | **F3a 에서 뒤집혔다(gap → pass) — 세 절이 모두 성립한다.** ① `aria-invalid` ↔ `aria-describedby` 페어링은 **성립한다**: 제목 입력(`CeoMessagePage.tsx:107-108`)이 `aria-invalid={errors.title !== undefined}` + `aria-describedby={errors.title !== undefined ? errorIdOf('ceo-title') : undefined}`, `FormField.tsx:109-118` 가 그 id 로 `role="alert"` `<p>` 를 그린다. 본문·사진은 DS 가 자동 배선한다(`TextareaField.tsx:67` · `ImageUploadField.tsx:211,237`) → **짝 없는 `aria-invalid` 0건.** ② **hint 연결**: 사진 필드의 hint 는 `ImageUploadField.tsx:211` 이 `hintIdOf` 로 **올바르게 연결한다**. 제목 입력은 hint 가 없어 해당 없음 → **이 절은 충족**(NFR-015 와 다른 점 — 그쪽은 `profile-biznum` hint 가 미연결). ③ **required 노출 — F3a 가 이 마지막 절을 닫았다(gap → pass).** 직전 판정은 '경로가 하나도 없다 · DS 계층의 gap 이라 이 화면 수정만으로 닫히지 않는다' 였고, **DS 가 실제로 그것을 닫았다** — 두 컨트롤이 서로 다른 경로로 충족한다: **제목** `<input id="ceo-title">`(`CeoMessagePage.tsx:99-110`) → `FormField` 가 `withAriaRequired()` 로 `required` 를 **런타임 `cloneElement` 로 자식의 `aria-required` 에 주입**한다(`FormField.tsx:50-56`, 주입 지점 `:107`, 대상 판별 `isRequirableChild` `:38-41` — 네이티브 `input`/`select`/`textarea` 와 DS `SelectField` 만). **본문** `<textarea>` → `TextareaField` 가 같은 자리에서 native `required` + `aria-required` 를 **직접** 낸다(`TextareaField.tsx:64-65`). **사진**(`ImageUploadField`)은 `required` 를 주지 않으므로 이 절의 대상이 아니다 — 이 화면이 `ImageUploadField` 의 잔여 결함(required 미주입 — NFR-019·NFR-020 참조)을 피해 가는 이유다. `*` 마커는 여전히 `aria-hidden` 장식이지만(`FormField.tsx:96-100`) **이제 그것이 유일한 경로가 아니다** — 마커의 시각 표현은 그대로 두고 AT 경로만 더한 설계다(`FormField.tsx:17-22` 주석) | ① `pages/company/ceo-message` grep: `aria-describedby` 없는 `aria-invalid` = 0 → 충족. ② 사진 필드 valid 상태 → `aria-describedby` 가 hint id 를 가리킴 → 충족. ③ RTL: `getByRole('textbox', { name: /제목/ })`·`{ name: /본문/ }` 의 `aria-required` 조회 → **둘 다 `"true"`** → 충족. **⚠ grep 으로 판정하지 말 것**: `grep -rn "aria-required" apps/admin/src` 는 여전히 1건(`members/components/CreateGroupModal.tsx:192` — 수동 override)뿐이다. 주입은 **런타임**이라 소스에 나타나지 않는다 — 판정은 **required FormField 자식의 타입**으로 한다 | pass |
| A11Y-12 | A11Y | N/A | **좌측 필터 list item 이 이 화면에 없다** — 필터·toggle 표면이 없는 단일 폼이다. `aria-pressed`/`aria-current` 를 쓸 요소가 존재하지 않는다(이 화면 grep 결과 둘 다 0건) | — | n-a |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 이탈 가드 `ConfirmDialog`(→ Modal organism) | 판정은 Modal 소유 문서에서. 이 화면에서는 가드 다이얼로그 open/close 가 backdrop fade + dialog scale 을 보이는지만 확인 | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 toast 표면: 저장 성공 토스트 | 판정은 Toast 소유 문서에서. 이 화면에서는 저장 성공 토스트의 auto-dismiss 가 exit 애니메이션을 보이는지만 확인 | 종속 |
| MOTION-03 | MOTION | 상속 | **이 화면 전용 motion 이 0건이다** — style object 에 `transition`·`animation` 선언이 없다(`CeoMessagePage.tsx` grep = 0). reduced-motion 게이트가 걸릴 표면은 전부 상속물(Modal·Toast·skeleton pulse) | 판정은 글로벌 Motion config/DS 소유 문서에서. 이 화면에서는 `prefers-reduced-motion: reduce` 에뮬레이션 시 스켈레톤 pulse·가드 다이얼로그·토스트에 move/scale 이 남지 않는지만 확인 | 종속 |
| IA-01 | IA | 직접 | `{ path: '/company/ceo-message', element: <CeoMessagePage />, implemented: true }`(`App.tsx:180`)가 AppShell layout route 아래에 있다(`App.tsx:324-342`). 이 화면은 자체 sidebar/header/outer frame 을 렌더하지 않는다 — 최상위가 `DocumentFormShell` 의 `pageStyle` 하나다 | `/company/ceo-message` 진입 → 사이드바·AppHeader·단일 padded `<main>` 안에 렌더. `CeoMessagePage.tsx` grep: `<aside`·`<header`·`<nav` = 0 | pass |
| IA-02 | IA | 직접 | 제목 소스가 **하나**다: AppHeader `<h1>`(`AppHeader.tsx:101`)의 `findNavLabel(pathname)`. `/company/ceo-message` 은 nav 잎과 **정확히 일치**하므로(`nav-config.ts:122` `['CEO 인사말', '/company/ceo-message']`) `findNavLabel` 의 exact 분기(`nav-config.ts:254-255`)가 'CEO 인사말' 을 준다 — 가지 라벨('기업 관리')로 폴백하지 않는다. **sub-route 가 존재하지 않아**(`App.tsx` 에 1줄뿐) IA-02 가 지적하는 '모호한 branch label' 경로가 생기지 않는다 | `/company/ceo-message` 의 가시 primary title = 'CEO 인사말'(‘기업 관리’ 아님). 카드 제목(`CardTitle`)도 'CEO 인사말' 로 일치 | pass |
| IA-04 | IA | N/A | **list 화면이 아니다** — toolbar·결과 count 요약·SelectionBar·table·Pagination 중 **어느 표면도 없다**(단일 문서 편집 폼) | — | n-a |
| IA-05 | IA | N/A | **create·edit 라우트 쌍이 없다.** 회사당 문서 1건이라 식별자가 없고 `/company/ceo-message` 단일 라우트다(`App.tsx:180`) — 구분할 `:id` 도, 나눌 등록/수정 title 도 존재하지 않는다 | — | n-a |
| IA-13 | IA | N/A | **list query state 가 없다** — page·page-size·filter·keyword·sort 중 **하나도 존재하지 않는다**. URL 에 직렬화할 view state 가 없고 `useListState` 를 import 하지 않는다. 이 화면은 경로 그 자체가 완전한 view 다 | — | n-a |
| EXC-01 | EXC | 상속 | 이 화면은 **이중 경계 안**에 있다: ① `AppShell.tsx:484-493` 의 `<Outlet>` 바깥 경계(`resetKey={pathname}`) ② `App.tsx:311-315` 의 루트 경계. 이 화면은 자체 경계를 두지 않고 상속만 한다 | 판정은 ErrorBoundary/AppShell 소유 문서에서. 이 화면에서는 `CeoMessagePage` 강제 throw 시 사이드바가 남고 다른 메뉴로 이동 가능한지만 확인 | 종속 |
| EXC-02 | EXC | 상속 | 두 층이 이 화면을 덮는다: ① route guard — `RequireAuth` 가 AppShell **바깥**(`App.tsx:324-330`)이라 세션 없이 deep-link 시 `/login?returnUrl=/company/ceo-message` 로(`RequireAuth.tsx:66-68`) ② 401 인터셉터 — `queryClient` 의 `QueryCache`/`MutationCache` `onError`(`queryClient.ts:42-43`)가 **이 화면의 조회·저장 둘 다**를 덮는다. `notifySessionExpired()` → `SessionExpiryWatcher`(`RequireAuth.tsx:36-54`) | 판정은 RequireAuth/queryClient 소유 문서에서. 이 화면에서는 `?status=ceo-message:load:401`·`?status=save:401` 이 `/login?returnUrl=%2Fcompany%2Fceo-message&reason=session_expired` 로 보내는지만 확인 | 종속 |
| EXC-03 | EXC | 직접 | **부분 충족 — NFR-015 §2 EXC-03 과 동일 구조.** ① read 게이팅은 **상속으로 성립한다**: `RequirePermission`(`AppShell.tsx:490`)이 `useRouteCan('read')` 로 판정하고(`RequirePermission.tsx:61-64`), `resourceIdForPath('/company/ceo-message')` 가 nav 잎과 정확히 일치해 `page:/company/ceo-message` 리소스를 준다(`route-resource.ts:36-46`) → read 없으면 `ForbiddenScreen`. ② **write 게이팅이 없다**: 이 화면은 `useRouteWritePermissions()`/`useRouteCan()` 을 **호출하지 않는다**(`pages/company` 전체 grep = 0건). 저장 버튼(`DocumentFormShell.tsx:145-152`)의 `disabled` 는 `!dirty \|\| saving \|\| loading` 뿐이다. ③ 그 결과 **강등 reconcile 도 성립하지 않는다** — 서버 403 은 '저장하지 못했습니다' 한 문구로 뭉개진다(FS-016-EL-004) | ① `page:/company/ceo-message` 의 read 를 끈 역할로 deep-link → 403 화면 → 충족. ② **`update` 를 끈 역할로 진입 → 저장 버튼이 여전히 렌더되고 클릭 시 요청 발사** → 미충족. ③ 진입 후 `update` 강등 → 버튼 불변 → 미충족 | **gap** |
| EXC-04 | EXC | 직접 | **미충족 — 이 화면에서 손실이 가장 크다.** 저장은 `useSaveDocument`(`shared/crud/document.ts:53-64`)를 **직접** 호출한다(`CeoMessagePage.tsx:36,70`) — `mutationFn: ({ input, signal }) => store.save(input, signal)` 에 **`If-Match`·ETag·`updatedAt`·`version` 이 없다.** `CeoMessage` 타입(`types.ts:4-9`)에 동시성 토큰 필드가 **없고** `save(input, signal?)` 시그니처에 실을 자리도 없다. F2 가 `useCrudForm` 에 넣은 409/412 충돌 다이얼로그(`useCrudForm.ts:166-179`)는 **이 화면에 적용되지 않는다**. 서버가 409 를 줘도 `onError`(`CeoMessagePage.tsx:77-80`)가 `isAbort` 만 거르고 나머지를 '저장하지 못했습니다…' 로 뭉갠다 → 재제출하면 **본문 5000자를 그대로 덮어쓴다**(BE-016 §7.4) | `?status=save:409` → **conflict dialog 없이 generic 배너**가 뜨고 '최신 reload / overwrite' 선택지가 없음 → 미충족. `CeoMessagePage.tsx`·`document.ts` grep: `If-Match`·`isConflict`·`ConflictState` = 0건 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** ① **동기 제출 잠금 없음**: `onValid`(`CeoMessagePage.tsx:65-83`)에 `submitLockRef` 가드가 없다. 방어는 `DocumentFormShell.tsx:149` 의 `disabled` 뿐인데, RHF 는 **비동기 검증을 먼저 돌리므로** 첫 Enter 후 `saving` 렌더까지 틈이 있다 — 그 사이 두 번째 Enter 가 두 번째 요청(본문 15KB)을 만든다. F2 가 `useCrudForm.ts:103`·`LoginPage` 에 넣은 잠금이 **문서 계층에는 없다.** ② **멱등키 없음**: `useCrudForm.ts:118-123`(`idempotencyKeyRef`)에 대응하는 것이 `document.ts` 에 전혀 없다. ③ `controllerRef`(`CeoMessagePage.tsx:52,67-68`)는 **직전 요청을 abort 하지 않고 덮어쓰기만 한다** | 저장 버튼 더블클릭 / 응답 전 Enter 연타 → **2개 요청 발사**(1개여야 함) → 미충족. `CeoMessagePage.tsx`·`document.ts` grep: `submitLockRef`·`Idempotency` = 0건 | **gap** |
| EXC-09 | EXC | 직접 | 저장 `onError` 가 `isAbort(cause)` 로 **가장 먼저** 걸러 early return 한다(`CeoMessagePage.tsx:77-80`) — abort 시 에러 배너도 토스트도 없다. 공유 predicate 사용(`shared/async.isAbort`, `:8`). abort 원인은 언마운트 cleanup 1개뿐(`:53`). `isPending` 은 mutation settle 로 자동 해제된다. bulk 작업이 없어 실패 count 제외 조항은 해당하지 않는다 | 저장 진행 중(400ms 창) 다른 메뉴로 이동 → 언마운트 abort → 토스트·배너 0건. `?fail=ceo-message:save` 는 abort 가 아니므로 정상적으로 배너 표시(두 경로가 갈리는지 확인) | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **8** | STATE-01 · STATE-02 · TOKEN-01 · **A11Y-11** · FEEDBACK-04 · IA-01 · IA-02 · EXC-09 |
| 종속(상속) | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | **7** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 |
| **gap** | **3** | **EXC-03 · EXC-04 · EXC-08** |
| 합계 검산 | **8 + 12 + 7 + 3 = 30** ✓ | (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30) |

> **직전 판정(`3cd3078`) 대비 A11Y-11 이 gap → pass 로 뒤집혔다.** 직전 문서는 그것을 '**DS(`FormField`/`TextareaField`) 계층의 gap 이라 화면 수정만으로 닫히지 않는다**' 고 적었고 — **DS 가 실제로 닫았다**: F3a 의 `FormField.withAriaRequired`(`FormField.tsx:50-56`)가 제목 `<input>` 에 `aria-required` 를 주입하고, `TextareaField.tsx:64-65` 가 본문 `<textarea>` 에 직접 낸다. 이 화면은 **hint 연결이 이미 충족돼 있었고**(DS 가 배선) required 한 가지만 남아 있었으므로, 그 하나가 닫히자 세 절이 모두 성립한다. **NFR-015(회사 정보)는 같은 F3a 를 받고도 gap 이 남는다** — 그쪽은 `profile-biznum` 의 hint 미연결이라는 별개 절이 남아 있기 때문이다(형제 문서의 판정이 갈리는 지점).
>
> **P0 gap 3건 = quality-bar '배치 실패' 사유.** **NFR-015 와 같은 3건이고 뿌리도 같다** — 이 화면이 `useCrudForm` 을 우회하고 `useSaveDocument` 를 직접 쓰기 때문에 폼 계층의 방어(EXC-04 `If-Match`·409 다이얼로그, EXC-08 `submitLockRef`+멱등키)가 문서 계층에 상속되지 않았다. **⚠ F3b 가 EXC-04/EXC-08 을 공용 CRUD 어댑터 두 팩토리에 넣었지만**(`crud.ts:62-72` 멱등 ledger · `:126-128,219-221` 409 게이트) **그것은 `CrudAdapter` 경로의 이야기이고, 이 화면이 쓰는 `createDocumentStore`/`useSaveDocument` 는 그 경로가 아니다** — 단일 문서형 4종이 함께 남았다. EXC-03 은 애초에 화면 책임이며 범위가 바뀌었다(§2 참조). §5 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 저장 성공 후 `invalidateQueries(['company','ceo-message'])`(`document.ts:61`)가 배경 재조회를 일으키지만 `loading` 이 `data === undefined` 를 요구하므로 본문이 유지된다. `staleTime: 30_000`(`queryClient.ts:24`)이 재조회 시점을 지배 | 저장 후 본문 textarea 가 스켈레톤으로 바뀌지 않음. 30초 내 재진입 시 네트워크 재조회 없음 | pass |
| STATE-06 | P1 | 저장 성공 시 이 문서 키만 무효화한다(`document.ts:60-62`) | 저장 후 `['company','ceo-message']` 만 재조회 | pass |
| COMP-01 | P1 | 저장 버튼은 DS `Button`(`DocumentFormShell.tsx:145`)이지만 **진행 상태를 `loading` prop 이 아니라 손수 쓴 문구('저장 중…', `:151`)로** 표현한다 | `DocumentFormShell.tsx` grep: `'저장 중…'` 존재 → `loading` prop 미사용 | gap |
| COMP-04 | P1 | required 입력 2종(제목·본문)이 `FormField(required)` 로 `*` 마커를 렌더한다(`FormField.tsx:96-100`, 본문은 `TextareaField` 가 위임). zod 스키마의 required 와 일치(`validation.ts:8-14`) | 라벨 2개 옆에 인접 `*` 존재 | pass |
| COMP-12 | P2 | **본문은 충족한다** — `TextareaField` 가 `FormField.counter` 슬롯에 'N/5000' 을 실시간으로 그린다(`TextareaField.tsx:52`, FS-016-EL-007.1). **제목(120자)은 카운터가 없다** — 손수 배선이라 `counter` prop 을 넘기지 않는다. 상한 근접 경고는 둘 다 없다. **계수 기준(code unit)이 서버와 일치해야 한다**(BE-016 §7.3) | 본문 입력 → 'N/5000' 실시간 갱신 O. 제목 120자 → 카운터·경고 없이 입력 멈춤 X | 부분 |
| A11Y-05 | P1 | `SelectField` 표면이 이 화면에 없다(select 입력 0건) | — | n-a |
| A11Y-10 | P1/P2 | 이 화면의 인라인 error 는 `FormField` 가 그리므로 `role="alert"` 를 이미 갖는다(`FormField.tsx:110-112`) — TextField primitive 를 쓰지 않아 그 불일치에 해당하지 않는다 | 오류 `<p>` 가 `role="alert"` | pass |
| A11Y-13 | P1 | ① **폼 진입 시 첫 필드 자동 포커스 없음** — `setFocus` 호출이 없다. ② submit 검증 실패 시 첫 invalid 필드 포커스는 RHF `shouldFocusError` 기본값으로 동작하나 `onInvalid` 로 계약을 고정하지 않았다(`handleSubmit(onValid)` 만 — `CeoMessagePage.tsx:96`). **③ 본문·사진은 `register` 가 아니라 `setValue` 로 배선돼 RHF 의 자동 포커스 대상이 아니다** — 본문이 비어 제출이 막히면 포커스가 어디에도 가지 않을 수 있다 | 빈 본문 제출 → activeElement 가 본문 textarea 인지 확인 필요(제어 입력이라 RHF ref 미등록) | gap |
| A11Y-14 | P2 | `ImageUploadField` 의 '업로드 완료' 안내가 `<span>`(`ImageUploadField.tsx:262-267`) — live region 아님 | 사진 업로드 성공 → 스크린리더 무음 | gap |
| EXC-05 | P1 | 조회·저장 어디에도 client timeout 이 없다(`AbortSignal.timeout` grep = 0). **본문 5000자 저장이 무한 대기에 걸리면 '저장 중…' 이 영원히 지속된다** | never-resolving 응답 → spinner 무한 | gap |
| EXC-06 | P1 | 에러 타입은 status 를 지닌다(`HttpError` — `http-error.ts:45-61`). **그러나 이 화면이 status 로 분기하지 않는다** — `onError`(`CeoMessagePage.tsx:77-80`)가 `isAbort` 외 전부를 한 문구로 뭉갠다 | `?status=save:403` / `save:409` / `save:422` / `save:500` → **네 경우 모두 동일 배너** | gap |
| EXC-07 | P1 | 422 `error.fields` → RHF `setError` 매핑이 없다(`isUnprocessable`/`setError` grep = 0). **본문 길이·정제 거절(BE-016 §7.3)이 서버에서 나면 어느 필드인지 알 수 없다** | `?status=save:422` → 필드 인라인 에러 없이 form-level 배너만 | gap |
| EXC-11 | P1 | offline 감지가 없다(`navigator.onLine` grep = 앱 전역 0건) | offline 토글 → 배너 없음, 저장 버튼 경고 없음 | gap |
| EXC-12 | P1 | `loadFailed={error !== null}`(`CeoMessagePage.tsx:90`)가 **404 와 5xx 를 뭉갠다** — quality-bar 가 `DocumentFormShell` 을 이 요구의 appliesTo 로 **명시**한다. `useCrudForm.ts:144-149`(`LoadFailure`)에는 있다 | `?status=ceo-message:load:404` → '내용을 불러오지 못했습니다.' + '다시 시도'(재시도해도 영원히 404) | gap |
| EXC-14 | P1 | 낙관적 write 가 이 화면에 없다(저장은 비관적) — rollback 을 요구할 표면이 없다 | — | n-a |
| EXC-15 | P1 | ① 업로드 전 client 검증은 **있다**(`imageFileError` — `ImageUploadField.tsx:37-43`). ② **progress/cancel 경로가 없다** — 업로드 요청 자체가 없다(FS-016-EL-008.7). ③ 로드 실패 fallback 이 `role="img"` placeholder 가 아니라 `aria-hidden` 글리프(`:90-91`). ④ src 변경 시 failed flag 리셋은 **있다**(`:134-136`) | 비이미지/6MB 파일 선택 → 인라인 거절 O. 로드 실패 → `role=img` 없음 X | gap |
| EXC-19 | P1 | dirty 폼에서 401 → `SessionExpiryWatcher` 가 **programmatic navigate** 하므로 FEEDBACK-04 가드가 발화하지 않고 입력이 사라진다. **quality-bar 가 이 요구의 근거로 명시한 '긴 폼(HTML-editor 공지, 견적서)' 에 이 화면이 정확히 해당한다** — 본문 5000자. draft autosave·snapshot 없음 | 본문 작성 중 `?status=save:401` → 재로그인 후 본문 전량 소실 | gap |
| EXC-20 | P1 | 5xx 에서 **참조 코드를 표시하지 않는다.** `HttpError.reference`(`http-error.ts:47,59`)와 `referenceOf()`(`:115-117`)가 존재하고 `useCrudForm.ts:195` 는 쓰지만 이 화면은 쓰지 않는다. raw stack 노출은 없다(고정 문구뿐) | `?status=save:500` → 배너에 `TDS-…` 참조 코드 없음 | gap |
| ERP-06 | P1 | 사용자 대상 문구가 존댓말 톤으로 일관된다. 날짜·숫자 포맷 표면이 이 화면에 없다 | 문구 5종이 템플릿과 일치 | pass |
| ERP-13 | P1 | **통합에서 뒤집혔다(gap → pass).** 조사 헬퍼가 **`shared/format.ts:269+` 로 승격**됐다 — 이전엔 사본이 셋이었고(`logs/josa.ts` · `notifications/_shared/notification.ts` · `@tds/ui` 의 `Empty`) 앱 shared 에는 없었다. 지금 `requiredText` 가 그 헬퍼로 조사를 조립한다 — `shared/crud/validation.ts:17`(`${label}${objectParticle(label)} 입력하세요.`) · `:21,24`(`${label}${topicParticle(label)} …자를 넘을 수 없습니다.`). 받침 판정은 한글 음절의 종성 코드로 한다(`format.ts:281-295`), 한글이 아니면 관용대로 받침 없음('API를'). **직전 판정이 지적한 '같은 화면에서 두 필드의 문구 품질이 갈린다' 가 해소됐다** — 이제 제목도 본문과 같은 경로를 지난다. **회귀 방어선도 함께 뒤집혔다** — `ceo-message.test.ts:31` 이 이제 `'제목을 입력하세요.'` 를, `:35` 가 `'본문을 입력하세요.'` 를 단언한다(직전 문서가 '결함을 테스트로 고정한다' 고 적은 그 자리다). 두 라벨 모두 받침이 있어(`'제목'` 종성 ㄱ · `'본문'` 종성 ㄴ) `objectParticle` 이 `을` 을 고른다 — 헬퍼가 우연이 아니라 종성 코드로 그렇게 판정한다(`format.ts:281-295`) | **`grep -rn "을(를)\|이(가)\|은(는)" pages/company/` → 0건**(사용자 대상 리터럴). 앱 전역 grep 히트 12건이 남지만 전부 ① 주석 ② '이 리터럴을 내지 않는다'를 단언하는 테스트 ③ 헬퍼 자신의 설명문이다 | pass |
| ERP-14 | P1 | 마스킹 대상 필드(사업자등록번호·전화·금액·날짜)가 이 화면에 없다 | — | n-a |
| IA-08 | P1 | 카드 **안** footer 에 저장 버튼이 우측(`DocumentFormShell.tsx:137-153`). **취소 버튼이 없다**(단일 문서라 되돌아갈 목록이 없다) — NFR-015 와 동일 | 저장 버튼이 카드 내 우하단. 취소 없음 | 부분(문서화) |
| IA-14 | P1 | 사진 폭 제한(`maxWidth: calc(var(--tds-space-6)*10)`, `CeoMessagePage.tsx:28`)이 좁은 폭에서도 유지된다. 본문 textarea 는 `rows={10}` 고정. AppShell 사이드바 collapse·touch-target 은 앱 전역 미해결 | 375px → 사진이 컨테이너를 넘지 않음 O. 사이드바는 여전히 고정 X | 부분(전역 gap) |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 조회 응답 p95 | ≤ 300ms | **측정 불가**(백엔드 없음) | 단일 문서 3필드. 본문 5000자(UTF-8 최대 ~15KB)가 응답 본문의 대부분 |
| 저장 응답 p95 | ≤ 600ms | **측정 불가** | 전체 치환 1건 + **서버 정제(BE-016 §7.1)가 5000자에 대해 수행된다** — 회사 정보(짧은 6필드)보다 여유를 둔다 |
| 요청 본문 크기 | ≤ 64KB | 최대 ~15KB(본문) + URL 2건 | BE-016-EP-02 상한. `photoUrl` 이 `data:` URL 이면 **이 예산을 깨뜨린다** — §7.2 스킴 검사가 막는 또 하나의 이유 |
| 첫 렌더(스켈레톤 등장) | ≤ 100ms | 라우트 진입 즉시 | `loading` 이 첫 렌더에서 true |
| 진입 시 재조회 횟수 | **1회** | 1회 | `staleTime: 30_000` · `refetchOnWindowFocus: false`(`queryClient.ts:24,67`) |
| 저장 후 재조회 횟수 | **1회** | 1회 | `invalidateQueries(key)`(`document.ts:61`) |
| 저장 요청 수(1회 제출당) | **1** | **1 또는 2** | **P0 EXC-08 gap** — 동기 잠금이 없어 빠른 재입력이 2개를 만든다. **본문 15KB 요청이 두 번 나간다**(§2) |
| 본문 입력 반응성 | 키 입력당 프레임 드랍 0 | **미측정 — 주의 필요** | 본문이 **제어 컴포넌트**(`watch('body')` → `setValue`, `CeoMessagePage.tsx:61,117`)라 **키 입력마다 페이지 전체가 리렌더된다.** 5000자 + 카운터 갱신이 매 입력에 붙는다. 현재 규모(형제 필드 2개)에서는 문제되지 않으나, 이 화면에 필드가 늘거나 HTML 에디터가 들어오면(FS-016 §7 #8) **먼저 무너질 지점**이다 |
| 메모리 | object URL 누수 0 | 누수 없음 | `ImageUploadField` 가 교체·제거·언마운트에서 `revokeObjectURL`(`:140,147`). **단 저장된 `blob:` 문자열은 서버에 남는다** — 메모리가 아니라 데이터 오염(FS-016 §7 #1) |
| 번들 | 화면 전용 코드 최소 | 화면 파일 1개(4.7KB) + 공유 모듈 | 리치 에디터 의존 없음(plain textarea) |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이다 — 성능 예산이 아니다.** 픽스처가 로딩 상태를 화면에서 볼 수 있게 넣은 인위적 대기이며 실제 응답 시간과 무관하다. 백엔드 연결 시 이 상수는 사라진다. 위 예산을 이 값으로 검증해서는 안 된다.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 실패(5xx) | 인라인 배너 + 재시도 | **충족**(FS-016-EL-012). `retry: false`(`queryClient.ts:59`)라 자동 재시도 없이 즉시 배너 |
| 조회 실패(404 · 문서 미생성) | '아직 만들어지지 않음' 을 구분 | **미충족** — 5xx 와 같은 문구(P1 EXC-12). BE-016 §7.3(d) 는 서버가 빈 문서를 200 으로 주어 이 상태를 없앨 것을 권한다 |
| 저장 실패(5xx) | 배너 + 입력 보존 + 참조 코드 | **부분** — 배너·입력 보존은 O(본문 5000자 유지), 참조 코드 X(P1 EXC-20) |
| 저장 중 화면 이탈 | abort · 유령 실패 없음 | **충족**(FS-016-EL-014 · P0 EXC-09) |
| 저장 중 사용자 취소 | 취소 수단 제공 | **미충족** — 취소 버튼이 없다 |
| 동시 편집(다른 관리자) | 충돌 감지 후 선택지 제시 | **미충족 — 이 화면 최대 위험.** 마지막 쓰기 승리(P0 EXC-04 · BE-016 §7.4). **본문 5000자가 조용히 사라진다.** 타입에 토큰 필드가 없어 화면 수정만으로는 해결 불가 |
| 세션 만료 | 재인증 후 원래 경로 복귀 | **충족**(P0 EXC-02). **단 본문 5000자 전량 소실**(P1 EXC-19) |
| 렌더 예외 | 셸 생존 + 복구 UI | **충족**(P0 EXC-01, `resetKey={pathname}` 자동 복구) |
| 네트워크 단절 | offline 배너 + write 게이트 | **미충족**(P1 EXC-11 — 앱 전역) |
| 응답 없음(무한 대기) | client timeout 후 재시도 안내 | **미충족**(P1 EXC-05 — 앱 전역) |
| **저장 성공 후 사진 손실** | 저장한 사진이 다시 보인다 | **미충족.** `blob:` URL 이 저장되어 새로고침 시 깨진다(FS-016-EL-008.7 · BE-016 §7.2·§7.6). **FS-015 로고와 같은 결함** — 실패가 저장 시점이 아니라 다음 세션에 나타난다 |
| **본문 정제 결과 미표시** | 서버가 제거한 내용을 관리자가 안다 | **미충족.** `save` 가 `Promise<void>` 라 응답 본문을 읽지 않고(BE-016 §4 EP-02) `reset(values)` 가 **제출 원본**으로 되돌린다(FS-016-EL-016) — 관리자는 자기가 쓴 태그가 제거된 사실을 재조회 도착 전까지 모른다 |

### 4.3 데이터 보존 · 감사

| 항목 | 요구 | 현재 상태 |
|---|---|---|
| 변경 이력 | 누가·언제·무엇을 바꿨는가 | **없다.** `CeoMessage` 에 `updatedAt`·`updatedBy` 가 없고(BE-016 §3) 버전 이력 화면도 없다 — **약관/개인정보는 `VersionHistoryTable` 을 갖는데 인사말은 없다.** 인사말은 대외 공식 문구이므로 '언제부터 이 문구였는가' 가 실제로 필요하다 |
| 이전 본문 복구 | 덮어쓰기 후 복구 | **없다.** BE-016 §7.4 가 **감사 로그에 이전 본문 보관을 필수로** 요구하는 이유 — 마지막 쓰기 승리 상태에서 유일한 복구 수단이다 |
| 초안 보존 | 세션 만료·사고 시 입력 보존 | **없다**(P1 EXC-19). **본문 5000자를 긴 시간 작성하는 화면이라 draft autosave 의 가치가 앱에서 가장 크다** |
| 픽스처 휘발성 | — | 현재 `save` 는 모듈 변수를 덮으므로(`document.ts:33`) **새로고침하면 seed 로 돌아간다.** 백엔드 연결 전까지의 성질이며 예산·요구가 아니다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **A11Y-11** | **P0** | required 가 AT 에 노출되지 않는다 — 제목 `<input>`·본문 `<textarea>` 둘 다 `required`/`aria-required` 없음(`*` 마커는 `aria-hidden`). **`FormField`/`TextareaField` 가 `required` prop 을 받고도 native/ARIA semantics 로 내리지 않는 DS 계층 gap** 이라 화면 수정만으로 닫히지 않는다. hint 연결·`aria-invalid`↔`aria-describedby` 페어링은 충족 | **DS**(+ 손수 배선 폼 전반) | A11 change_request · DS 소유자 |
| 2 | **EXC-03** | **P0** | 쓰기 권한 게이팅 없음 — 저장 버튼이 `can('update')` 를 보지 않는다. **NFR-015 §5 #2 와 같은 사안.** **⚠ 범위 정정(F3b 이후)**: `useRouteWritePermissions` 소비자는 이제 **7곳**이다(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`) — **`pages/company/**` 만 그 목록에 없다**(`grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**). '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`) | **기업 관리 섹션 전체**(앱 전역 아님) | A11 change_request |
| 3 | **EXC-04** | **P0** | 낙관적 동시성 없음 — 타입에 `updatedAt`/`version` 이 없어 `If-Match` 를 실을 수 없다. 409 충돌 다이얼로그도 없다. **본문 5000자 손실 위험이 커 단일 문서형 4종 중 우선순위가 가장 높다**(BE-016 §7.4) | 앱 전역(단일 문서형 4종 공통) | A63(BE-016 §7.4) · A11 |
| 4 | **EXC-08** | **P0** | 중복 제출 방어 없음 — `submitLockRef`·멱등키가 `useSaveDocument` 계층에 없다. **고칠 자리는 `shared/crud/document.ts` 이며 한 번 고치면 단일 문서형 4종이 함께 덮인다**(NFR-015 §5 #4 와 같은 수정) | 앱 전역(단일 문서형 4종 공통) | A11 change_request · A63 |
| 5 | EXC-06 · EXC-07 · EXC-20 | P1 | 저장 실패의 갈래 없음 — status 분기·422 필드 매핑·참조 코드 표시 셋 다 없다. **본문 길이/정제 거절이 어느 필드인지 알 수 없다** | 앱 전역(단일 문서형 4종) | A11 change_request |
| 6 | EXC-12 | P1 | 404/5xx 미구분(`loadFailed = error !== null`) — quality-bar 가 `DocumentFormShell` 을 appliesTo 로 명시 | 앱 전역(DocumentFormShell) | A11 change_request |
| 7 | EXC-15 | P1 | **사진이 저장되지 않는다** — `blob:` URL 이 서버로 나간다. progress/cancel 없음, `role=img` fallback 없음. **NFR-015 §5 #7 과 하나의 수정으로 묶인다** | 이 화면 + 회사 정보 | A63(BE-016 §7.6) · A11 |
| 8 | **EXC-19** | P1 | dirty draft 보존 없음 — **본문 5000자가 세션 만료로 전량 소실된다. quality-bar 가 이 요구의 근거로 든 '긴 폼' 에 이 화면이 정확히 해당한다** — 앱 전역 P1 중 이 화면에서 가장 아프다 | 앱 전역(우선순위: 이 화면) | A40 · A11 |
| 9 | EXC-05 · EXC-11 | P1 | client timeout · offline 감지 없음 | 앱 전역 | A40 · A11 |
| ~~10~~ | ~~ERP-13~~ | P1 | **해소됨(통합) — 이관 취소.** 조사 헬퍼가 `shared/format.ts:269+` 로 승격돼 `requiredText`(`shared/crud/validation.ts:17,21,24`) · `useCrudForm.ts:222` · `useCrudList.tsx:108,158` 이 전부 그것을 소비한다. `pages/company/` 의 사용자 대상 조사 리터럴 **0건** — 제목·본문이 이제 같은 경로를 지나 '같은 화면에서 갈린다' 가 해소됐다. `ceo-message.test.ts:31` 이 `'제목을 입력하세요.'` 를 단언한다 | — | **이관 취소** |
| 11 | A11Y-13 | P1 | 폼 진입 시 첫 필드 포커스 없음. **본문·사진이 `setValue` 배선이라 RHF 자동 에러 포커스 대상이 아니다** — 빈 본문 제출 시 포커스 착지점 미검증 | 이 화면 | A11 change_request |
| 12 | COMP-01 · COMP-12(제목) | P1/P2 | 저장 버튼이 `loading` prop 대신 손수 쓴 '저장 중…'. 제목(120자)에 카운터 없음(`FormField.counter` 미사용 — 본문은 있다) | DocumentFormShell · 이 화면 | A11 change_request |
| 13 | A11Y-14 | P2 | 업로드 완료 announce 없음 | DS | A11 (후속) |
| 14 | (quality-bar 밖) | — | **본문 정제 결과가 즉시 보이지 않는다** — `save` 가 `Promise<void>` 라 서버 정제본을 읽지 못하고 `reset(values)` 가 제출 원본으로 되돌린다(§4.2). 관리자가 자기 입력이 바뀐 사실을 모른다 | 이 화면 + `document.ts` 계약 | A63(BE-016 §4 EP-02) · A11 |

> **§5 ↔ FS-016 §7 ↔ BE-016 §7.7 대조**: #1→(신규, FS 미기재 · DS 사안) · #2→FS §7 #3 · #3→FS §7 #2·BE §7.7 #4 · #4→FS §7 #2·BE §7.7 #3 · #5→FS §7 #4·BE §7.7 #2 · #6→FS §7 #5 · #7→FS §7 #1·BE §7.7 #5 · #8·#9→FS §7 #7·BE §7.7 #7 · #14→FS §7 #8·BE §7.1.

## 6. 측정 도구 · 재현 스위치

**E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 **재현**하기 위한 것이며, 이 문서가 그 실행 결과를 주장하지 않는다.

이 화면의 어댑터는 `createDocumentStore('ceo-message', CEO_MESSAGE_SEED)`(`data-source.ts:20`) — **scope = `ceo-message`**, **op = `load` · `save` 2개뿐**(`document.ts:27,32`).

| 스위치 | 효과 | 근거 |
|---|---|---|
| `?fail=load` | 조회를 generic Error 로 실패 → FS-016-EL-012 | `dev.ts:87-92` |
| `?fail=save` | 저장을 generic Error 로 실패 → FS-016-EL-004 | 동일 |
| `?fail=ceo-message:load` · `?fail=ceo-message:save` | scope 를 지정해 **이 화면만** 실패시킨다(`<scope>:<op>`) — 회사 정보(`profile`)와 함께 열려 있어도 이 화면만 실패한다 | `dev.ts:90` |
| `?fail=all` | 두 op 모두 실패 | `dev.ts:90` |
| `?status=load:<code>` · `?status=save:<code>` | 지정 HTTP status 의 `HttpError` 를 던진다. **재현 가능 code: 400·401·403·404·409·412·422·429·500**(`dev.ts:27-37`) | `dev.ts:57-71,81-85` |
| `?status=all:<code>` | 두 op 모두 그 status 로 | `dev.ts:64` |

**주의 — 쓰면 안 되는 것 / 동작하지 않는 것**

| 항목 | 사실 |
|---|---|
| `?delay=` | **`shared/crud/dev.ts` 에 존재하지 않는다.** 이 화면에서 쓸 수 없다(`pages/dashboard/api.ts`·`pages/members/data-source.ts` 에만 있다). 따라서 STATE-01 의 quality-bar acceptanceCheck 중 `?delay=3000` 절은 **이 화면에서 재현 불가**이며, 대신 `LATENCY_MS=400` 창과 `?fail=ceo-message:load` 로 판정했다 |
| `?status=ceo-message:save:409` | **파싱되지 않는다.** `dev.ts:62` 이 `entry.split(':')` 결과를 `[target, code]` 2개로만 구조분해하므로 3세그먼트 입력은 `target='ceo-message'`·`code='save'` 가 되어 `Number.parseInt('save')` → NaN 으로 무시된다. `dev.ts:64` 의 `target !== \`${scope}:${op}\`` 비교는 **`?status=` 경로에서 도달 불가능한 죽은 분기**다. scope 지정 status 가 필요하면 `?status=save:409` 처럼 op 만 쓴다 — **단 그러면 회사 정보 등 다른 단일 문서형 화면의 `save` 도 함께 실패한다**(op 이름이 공유된다) |

**단위 검증**: `ceo-message.test.ts`(5건)는 zod 스키마만 검증한다 — 렌더·a11y·중복 제출·권한을 다루지 않는다. §2 의 gap 3건(EXC-03·EXC-04·EXC-08) 중 **어느 것도 현재 테스트가 잡지 못한다.** **`:30-32`('을(를)' 문구가 결함이라던 단언)는 통합에서 해소됐다** — 지금 `:31` 은 `'제목을 입력하세요.'` 라는 **옳은 문구**를 고정한다. 남은 것은 `:42-46`(`data:` 통과) 하나이며 그것은 **결함이 아니라 알려진 빚**이다(업로드 이음매 부재 — §4.3).

## 7. 자기 점검

- [x] P0 30건을 quality-bar 의 지정 순서대로 전수 판정했다 — 빈칸 0건
- [x] §2.1 합계 검산 = 7 + 12 + 7 + 4 = **30** ✓ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6)
- [x] 모든 `n-a`(7건)에 '이 화면에 그 표면이 없다' 는 사유를 적었다
- [x] 모든 `pass`(7건)에 `파일:라인` 코드 근거를 적었다
- [x] 모든 `gap`(4건)에 재현 가능한 측정 기준을 적었고 §5 로 이관했다
- [x] 모든 `종속`(12건)에 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박았다 — 표면이 없는 요구는 `상속` 이 아니라 `n-a` 로 분류했다
- [x] **NFR-015 를 복사하지 않고 이 화면의 코드로 독립 판정했다** — 같은 결론에 이른 항목(EXC-03/04/08)은 같은 뿌리를 명시했고, **다른 항목(A11Y-11 의 hint 절, COMP-12, A11Y-13, EXC-19 우선순위, §4.1 제어 입력 리렌더)은 차이를 기술했다**
- [x] quality-bar 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] `?fail=` scope 를 `createDocumentStore('ceo-message', …)` 호출에서 확인했다. **`?delay=` 를 쓰지 않았다**(존재하지 않음을 §6 에 명시)
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 성능 예산이 아님을 §4.1 에 명시했다
- [x] E2E 를 실행하지 않았고, 판정 근거가 코드 대조임을 §6 에 명시했다
- [x] §5 의 gap 이 FS-016 §7 · BE-016 §7.7 과 일치함을 대조표로 확인했다
