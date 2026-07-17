---
id: NFR-028
title: "문의 답변 — 답변 템플릿 관리 비기능 명세"
functionalSpec: FS-028
backendSpec: BE-028
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-028. 문의 답변 — 답변 템플릿 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-028 문의 답변 — 답변 템플릿 관리 (`/support/replies` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-028(요소·예외) · BE-028(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-028 §7 · BE-028 §7.11 과 번호가 일치해야 한다 |
| 판정 기준일 | **2026-07-17 · HEAD = `a5c2639`** (PR #22·#24·#26·#28·#30·#32·#34 머지 후). 직전 판정은 `4b805ad` 기준이었다. **이번 기준 갱신으로 뒤집힌 판정 없음** — MOTION-01/02 의 근거 텍스트만 갱신했다 — 오버레이 모션이 **CSS-only 로 구현**됐고(`Modal.css:126-168` · `Toast.css:109-141`) 이전 기준의 '라이브러리 0건이라 gap 일 가능성' 추정은 틀렸다. **이 화면은 `useModalDirtyGuard` 소비가 0건이라 DS Modal 의 `closingRef` latch 결함에 노출되지 않는다**(FEEDBACK-06 판정 불변). **뒤집힌 P0 판정 없음 — §2.1 건수 불변.** |
| 판정 근거 | **E2E 미실행 — 판정 근거는 `a5c2639` 코드 대조다**(§6) |

> **이 화면의 성격**: 공용 CRUD 프레임워크(`useCrudList`+`CrudListShell`, `useCrudForm`+`FormPageShell`)를 거의 그대로 소비한다. 그래서 같은 고객센터 섹션의 FS-026(손조립)과 달리 **로딩 파생·삭제 다이얼로그·충돌 처리·중복 제출 방지·404 분기를 프레임워크에서 상속**해 P0 pass 가 많다. 남은 gap 은 **화면이 프레임워크에 넘기지 않은 것**(선택 해제·URL state·디바운스)과 **프레임워크 자체의 구멍**(`createStoreAdapter` 가드 부재)에 몰려 있다.

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
| STATE-01 | STATE | 직접 | 4상태가 정확히 갈린다. `useCrudList` 가 `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined` 로 파생하고(`useCrudList.tsx:71-72`) `CrudListShell` 이 `loading={firstLoading}` 만 표에 넘긴다(`CrudListShell.tsx:137`) — **재조회 중에는 이전 행이 유지된다**(`useCrudListQuery` 의 `placeholderData: (previous) => previous`, `crud.ts:151`). empty 는 `!loading && items.length === 0` 에서만(`CrudTable.tsx:153`), error 는 `error !== null` 에서만 표를 대체한다(`CrudListShell.tsx:113`). 폼도 동일 — `loadingDetail = isEdit && detailQuery.isFetching && detailQuery.data === undefined`(`useCrudForm.ts:130`). **`RepliesPage` 가 `isFetching` 을 직접 만지지 않는다** — 같은 섹션의 `TicketListPage.tsx:111` 이 저지른 실수를 이 화면은 프레임워크에 위임해 피했다 | `/support/replies` 진입 → 렌더 확인 → `staleTime` 30초 경과 후 재진입(또는 window 재마운트)으로 재조회 유발. **표가 스켈레톤으로 바뀌지 않고 '전체 N건 · 새로고침 중…' 이 뜨면 pass.** 0행 검색 → empty 만, `?fail=list` → error Alert 만 | **pass** |
| STATE-02 | STATE | 직접 | read 실패가 인라인 danger Alert + '다시 시도' 로 뜬다. 목록: `CrudListShell.tsx:157-164`(`<Alert tone="danger">` + `Button` → `controller.refetch`). 폼: `FormPageShell.tsx:124-140`(danger Alert + '다시 시도' + '목록으로'). **read 실패에 error toast 를 쓰지 않는다** — 이 화면의 toast 는 삭제·저장 **성공**과 프레임워크의 실패 통지뿐이다. empty 폴백도 없다(error 분기가 표를 통째로 대체한다) | `/support/replies?fail=list` → danger Alert + '다시 시도' 가 뜨고 retry 가 재조회하는지. `/support/replies/tpl-1/edit?fail=detail` → 폼 대신 Alert. **error toast 가 뜨면 gap** | **pass** |
| STATE-04 | STATE | 직접 | **미충족.** 두 절 중 clamp 는 표면이 없으나(페이지네이션 부재 — IA-04 gap) **'필터/keyword 변경 시 숨겨진 행의 선택 해제' 가 실재하고 위반된다.** **F3b 가 검색어를 `useListState` 로 옮겼지만 선택 해제는 여전히 끊겨 있다** — `RepliesPage.tsx:76` `const list = useListState()` 는 자기 안에 선택 상태를 갖고 view 서명이 바뀌면 비운다(`useListState.ts:205-213` — `viewSignature` = page|keyword|sort|filters). **그러나 이 화면이 표에 넘기는 선택은 그것이 아니다** — `CrudListShell` 에 넘기는 `controller`(`:79-84` `useCrudList`)의 `selectedIds` 이고, 그것은 `useRowSelection` 이 소유해 **keyword 변경과 아무 연결이 없다**(`list.selectedIds`·`list.clearSelection` 은 이 화면에서 **소비되지 않는다**). `visibleItems` 는 `searchTemplates(controller.items, keyword)` 로 줄지만(`:86-89`) `controller.selectedIds` 는 그대로다. 일괄 삭제는 `const ids = [...selectedIds]`(`useCrudList.tsx:127`)를 대상으로 삼는다 → **화면에 보이지 않는 행이 삭제된다.** `useRowSelection` 헤더가 '페이지/필터가 바뀌면 **호출부가** clear() 로 비운다 — 안 보이는 행이 선택된 채 남지 않게'라고 계약을 명시하는데 이 호출부가 어긴다. **⚠ F3b 가 두 선택 상태를 나란히 두면서 오히려 함정이 생겼다** — `useListState` 를 쓰는 화면은 선택도 그쪽으로 옮기거나, `useCrudList` 의 `clear()` 를 keyword 에 연결해야 한다 | `/support/replies` 에서 템플릿 3건 체크 → 검색창에 그 3건이 매치되지 않는 키워드 입력 → **표에 0행인데 '3건 선택됨' 과 SelectionBar 가 남아 있으면 gap.** '선택 3건 삭제' 를 누르면 보이지 않는 3건이 지워진다 | **gap** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/support/replies/**` · `pages/support/_shared/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 12)`(`RepliesPage.tsx:38`) 같은 space 토큰 배수로만 표현한다 | `grep -nE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/support/replies apps/admin/src/pages/support/_shared` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: DS `<Button>`(`RepliesPage.tsx:91`) · `<SearchField>` · `<SelectField>` · `<TextareaField>` · `RowActions` · `ConfirmDialog` · 제목 입력의 `tds-ui-input tds-ui-focusable`(`ReplyFormPage.tsx:101`). **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `CrudTable.tsx:148` · `FormPageShell.tsx:172`) · Toast(삭제·저장 성공) · DS Button transition. **이 화면이 animation/transition 을 직접 선언하지 않는다** | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`FormPageShell.tsx:164`) · Toast · **삭제 확인 다이얼로그 2종 + 충돌 다이얼로그 + 이탈 가드**(전부 DS `Modal`). **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 폼 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`FormPageShell.tsx:159` — `<h1 style={pageTitleStyle}>{isEdit ? '답변 템플릿 수정' : '답변 템플릿 등록'}</h1>`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-59`). **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02) | `/support/replies/new` 의 '답변 템플릿 등록' `<h1>` 이 body-md 보다 가시적으로 크고 computed font-size 가 title-xl 로 해석되는지 | **pass** |
| COMP-10 | COMP | 직접 | **충족(F3b).** `RepliesPage.tsx:93-100` 이 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 **공용 IME 안전 배선을 스프레드한다**. `list` 는 `useListState`(`:76`)이고 그 훅이 내부에서 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다 — 세 축이 전부 성립한다: ① **조합 중 커밋 금지**(`useDebouncedSearch.ts:87` `if (composing) return`) + **조합 중 Enter 차단**(`:121-124` — `event.nativeEvent.isComposing || composingRef.current` 면 `stopPropagation`. **두 신호를 함께 보는 이유는 `:117-120` 주석**: `isComposing` 은 합성 이벤트에서 누락될 수 있다). ② **디바운스 250ms**(`:23`·`:93-95`). ③ **stale 응답 무효** — `:14-18` 주석대로 TanStack Query 의 쿼리 키가 이미 해결하고, 이 화면은 클라이언트 필터(`searchTemplates`)라 애초에 in-flight 경합이 없다. **이 화면은 검색이 유일한 조회 수단이라 특히 중요했다**(`RepliesPage.tsx:9` 주석) | `/support/replies` 검색창에 IME 로 '배송' 입력 → **조합 중 'ㅂ'·'배'·'배ㅅ' 가 필터에 반영되지 않고, 조합이 끝난 뒤 250ms 잠잠하면 그때 한 번 커밋된다**. 조합 중 Enter → 아무 일도 없다. `useDebouncedSearch.test.tsx` 가 이 계약을 고정한다. **⚠ STATE-04 는 별개로 남아 있다** — 커밋된 keyword 가 표를 줄여도 `controller.selectedIds` 는 비워지지 않는다 | pass |
| FEEDBACK-02 | FEEDBACK | 직접 | 파괴적 액션(단건·일괄 삭제)이 전부 `ConfirmDialog intent="delete"` 로 게이트된다(`useCrudList.tsx:151-178`). **busy 중 잠금** — `busy={deleting}`/`busy={bulkDeleting}`. **실패 시 다이얼로그 유지 + danger 배너** — `error={deleteError}`/`error={bulkError}`, `onError` 가 다이얼로그를 닫지 않는다(`:109-113`) → 재클릭이 retry. **cancel/Esc/dim-click 이 abort + pending 리셋** — `closeDelete`/`closeBulk` 가 `controllerRef.current?.abort()` + `mutation.reset()` + 상태 초기화(`:86-92,117-123`). 화면은 `controller.dialogs` 를 `CrudListShell` 이 렌더하게 넘길 뿐이다 | `/support/replies?fail=delete` → 행 삭제 → **다이얼로그가 열린 채 danger 배너가 뜨고 재클릭이 retry 하면 pass.** 삭제 진행 중(400ms) Esc → false toast 없이 버튼 state 복원 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | `FormPageShell.tsx:113` 이 `useUnsavedChangesDialog(isDirty && !saving, { message: unsavedMessage })` 를 배선하고, `ReplyFormPage.tsx:94` 가 문구를 넘긴다. `isDirty` 는 **RHF `formState.isDirty`**(`useCrudForm.ts:254`) — 요구가 명시한 기준 그대로다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다. 저장 성공 시 `navigate(listPath, { replace: true })` 전에 폼이 not-dirty 가 되지는 않으나 **`saving` 이 true 라 가드가 꺼져 있어** 프롬프트 없이 통과한다 | `/support/replies/new` 에서 제목 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 목록 이동은 프롬프트 없이 통과. **주의**: '취소'·'목록으로' 버튼은 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-028 §7 #15 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 등록/수정이 modal 이 아니라 **전용 라우트**(`/new` · `/:id/edit`)의 `FormPageShell` 로 열린다. 이는 IA-06(무게 규칙)의 의도된 선택이다: 템플릿은 제목·태그·1000자 본문을 갖는 rich 엔티티라 route 가 맞고, 같은 섹션의 문의 유형(`CategoryFormModal`)만이 taxonomy 라 modal 을 쓴다. 이 화면의 modal 3종(단건 삭제·일괄 삭제·이탈 가드)은 전부 **입력 필드가 없는 확인 다이얼로그**다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 삭제 성공(`useCrudList.tsx:107`) · 일괄 삭제 성공(`:145`) · 저장/등록 성공(`useCrudForm.ts:215`). 지속 live region 은 `ToastProvider` 가 소유한다. **별도로 이 화면은 목록 상태용 지속 live region 을 하나 더 갖는다**(`CrudListShell.tsx:107-109` — 항상 마운트된 `aria-live="polite"`) — 그쪽은 A11Y-16 계약 | ToastProvider 판정에 종속. 이 화면에서는 삭제·저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 4종(단건 삭제·일괄 삭제·충돌·이탈 가드) 전부 DS `ConfirmDialog`/`Modal`. `aria-describedby`→message 배선은 DS 가 소유한다 — 이 화면은 `message` prop 만 넘긴다 | DS 판정에 종속. 이 화면에서는 삭제 다이얼로그 open 시 `'<제목>' 을(를) 삭제합니다…` 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 3개를 전수 확인했다.** ① **제목 입력** — `ReplyFormPage.tsx:106-107` 이 `aria-invalid={errors.title !== undefined}` 와 `aria-describedby={errors.title !== undefined ? errorIdOf('template-title') : undefined}` 를 **짝으로** 세우고, 감싸는 `FormField htmlFor="template-title"`(`:97`)이 `<p id={errorIdOf('template-title')} role="alert">` 를 렌더한다(`packages/ui/.../FormField.tsx:72`) — id 일치. **required 는 `FormField required` 로 노출**(`:97`). ② **유형 태그 select** — 오류 상태가 없다(`z.string()` 이라 위반이 발생할 수 없다) → `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않는다. hint 는 `FormField` 가 `hintIdOf` 로 연결. ③ **본문 textarea** — `TextareaField` 가 `aria-invalid`/`aria-describedby` 를 내부에서 짝으로 배선한다(`packages/ui/.../TextareaField.tsx:62-63`). **짝 없는 `aria-invalid` 0건.** (본문의 `*` 마커 부재는 **COMP-04 사안**이지 이 요구가 아니다 — 이 요구의 required 절은 '`FormField required` 로 이관' 을 허용하고 제목이 그것을 만족한다) | `grep -n "aria-invalid" apps/admin/src/pages/support/replies -r` → 각 히트마다 같은 요소에 `aria-describedby` 가 있는지. RTL 로 제목을 비운 채 제출 → `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` assert | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면에 **좌측 필터 list item(토글 버튼)이 없다** — 툴바에 검색 입력 하나뿐이고 필터 축이 아예 없다(FS-028 §7 #24 가 그 부재를 다룬다). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, 이 화면 전체에 `aria-current` 0건 | 유형 태그 필터가 토글 리스트로 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면 4종(단건 삭제·일괄 삭제·충돌·이탈 가드) — 이 화면에서 가장 많이 열리는 overlay 다. enter/exit 모션은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다. **⚠ 근거 갱신 — 이전 기준의 추정을 지운다.** PR #26 이 오버레이 모션을 **구현했다. 단 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21`→keyframes `:126-134`, exit `:30-33`→`:136-144`) + dialog scale 0.96→1(enter `:58-59`→`:146-156`, exit `:35-38`→`:158-168` `forwards`), reduced-motion 게이트 `:173-180`, `component.overlay` recipe `tokens/tokens.json:1286-1308`. **Motion/AnimatePresence 소비는 `packages/ui/src` 에 여전히 0건이나**(모션 라이브러리 자체가 미도입), 요구가 명시한 'exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성됐다 — **'0건이라 gap 일 가능성이 높다'는 이전 추정은 틀렸다.** 라이브러리 부재를 gap 으로 볼지는 DS 문서의 몫이다. **⚠ 이 화면은 폼 modal 을 갖지 않아**(편집이 전용 라우트 폼) **DS Modal 의 `closingRef` latch 결함**(NFR-027 §2 FEEDBACK-06)**에 노출되지 않는다** — 위 4종은 입력 필드가 없는 확인 다이얼로그이고 `useModalDirtyGuard` 소비가 0건이다 | DS Modal 판정에 종속. 이 화면이 소비하는 4개 표면이 실재함만 확인 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 삭제·일괄 삭제·저장 성공. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다. **⚠ 근거 갱신 — 완전 구현됐다.** `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events:none`) → keyframes `:121-131`(opacity 1→0, `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. **요구가 명시한 'exit duration fast~normal + easing accelerate' 를 정확히 충족한다** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`) | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 표면: 스켈레톤 펄스 · Toast · Modal 4종 · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건) — ToggleSwitch 는 이 화면에 없다 | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:242-244` — `/support/replies` · `/new` · `/:id/edit`). **세 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록 최상위가 `<div style={columnStyle}>`(`RepliesPage.tsx:99`), 폼은 `FormPageShell` 의 `<div style={pageStyle}>` | 세 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 | **pass** |
| IA-02 | IA | 직접 | **절반 해소 — 여전히 미충족(사유 전환).** ✔ **해소된 것 — 가지 라벨 폴백**: 통합이 `findCoveringLeaf`(`nav-config.ts:260-278`)를 도입했다 — '자기를 감싸는 **가장 긴 잎**'이 곧 자기다. `covers()` 는 **세그먼트 경계**에서만 매칭하고(`:255-257`), `:297-299` `findNavLabel = findCoveringLeaf(pathname)?.label ?? pathname` 이다. 따라서 `/support/replies/new` · `/:id/edit` 는 잎 `/support/replies`(`nav-config.ts:168`)에 덮여 **'문의 답변'** 을 반환한다 — **요구가 금지한 브랜치 라벨('고객센터')은 더 이상 나오지 않는다.** `nav-config.test.ts:16-40` 이 고정한다. ✘ **남은 것 둘**: ① **`<h1>` 이 2개다** — `AppHeader.tsx:101` 의 `<h1>문의 답변</h1>` 과 `FormPageShell.tsx:160` 의 `<h1>답변 템플릿 등록</h1>` 이 **동시에** 렌더된다 → 요구의 '**단일 title 메커니즘**' 미충족. 목록은 in-content `<h1>` 이 없어 title 소스가 화면 타입마다 갈린다. ② **행위가 AppHeader 제목에 없다** — `nav-config.ts:294-296` 주석이 '등록/수정 같은 **행위**는 제목에 넣지 않는다'를 의도로 명시한다. 요구의 acceptanceCheck 를 이 화면에 옮기면 **in-content h1 은 '답변 템플릿 등록'으로 그것을 만족하지만 AppHeader h1 은 '문의 답변'** 이고, **어느 쪽이 primary 인지 정의돼 있지 않다** | `/support/replies/new` 진입 → **AppHeader `<h1>` = '문의 답변'**(브랜치 폴백 해소). 그러나 `document.querySelectorAll('h1').length === 2` 이고 두 텍스트가 다르다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바가 **검색 좌 · primary '템플릿 등록' 우상단**(`RepliesPage.tsx:83-96` — `justifyContent: 'space-between'`) → count 요약(`CrudListShell.tsx:118-122`) → SelectionBar(`:125-133`) → table(`:135`). **미충족: Pagination 이 없다.** `CrudListShell` 이 `visibleItems` 전량을 `CrudTable` 에 넘기고 페이지네이션 컴포넌트가 없다. 요구는 'page size 초과 가능 시 Pagination'이며, 템플릿은 운영 기간에 비례해 는다(티켓만큼 빠르지는 않다 — BE-028 §7.9) | 픽스처를 30건 이상으로 늘리고 `/support/replies` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | 직접 | `/support/replies/new` 와 `/support/replies/:id/edit` 가 **동일 컴포넌트 `ReplyFormPage`** 로 해석된다(`App.tsx:243-244` — 두 라우트가 같은 `<ReplyFormPage />`). `useCrudForm` 이 `const { id } = useParams(); const isEdit = id !== undefined`(`useCrudForm.ts:73-74`)로 갈라 **레이아웃은 동일하고 title(등록 vs 수정)과 prefill 만 다르다**(`FormPageShell.tsx:159` · `useCrudForm.ts:125-128` 의 `reset(toValues(loaded))`). create 전용/edit 전용 페이지가 별도로 존재하지 않는다 | `/support/replies/new` 와 `/support/replies/tpl-1/edit` 가 같은 컴포넌트로 렌더되고 제목만 다른지. 라우트 테이블에서 두 path 의 element 가 동일 참조인지 | **pass** |
| IA-13 | IA | 직접 | **충족(F3b).** 검색어의 단일 원천이 **URL 쿼리스트링**이다 — `RepliesPage.tsx:76` `const list = useListState()`(필터가 없어 `filterDefaults` 도 없다 — `:75` 주석)가 `useSearchParams`(`useListState.ts:87`) 위에 앉고, `:93-99` 의 `SearchField` 가 `list.searchInput`/`setSearchInput`/`searchInputProps` 로 그것에 쓴다. 커밋은 `commitKeyword`(`:146-152`) → `patchParams({ q: next }, { resetPage: true })` 이고 **빈 문자열이면 URL 에서 지운다**(`:116`). **갱신은 `replace`**(`:125`)라 검색어 한 줄에 history 가 쌓이지 않고, 수정 화면에서 Back 하면 그 URL(= 검색어)이 그대로 복원된다. **값이 그대로면 아무것도 하지 않는 가드**(`:146-152`)가 마운트 직후의 헛 커밋이 `?page` 를 지우는 것을 막는다(`:141-145` 주석). page·filter·sort 는 표면이 없다(필터 부재 · 정렬 서버 고정 · 페이지네이션 부재 → IA-04). **이 화면은 URL 에 실을 것이 `keyword` 하나뿐**이라 손실이 FS-026(필터 4종)보다 작았지만, 요구가 keyword 를 명시적으로 포함하므로 이제 충족이다 | `/support/replies` 에서 검색='배송' → **URL 이 `?q=배송` 이 된다** → 행 클릭으로 수정 진입 → 브라우저 Back → **검색어가 그대로 복원된다**. F5 도 동일. URL 복사로 같은 view 가 재현된다. 검색을 지우면 `?q=` 가 URL 에서 사라진다 | pass |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`shared/layout/AppShell.tsx:18,472-478` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 소비자다. 특히 FS-028-EL-019 의 동기 store 호출(`listCategoryUsage()`)이 던지면 이 경계가 받는다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth`(`shared/auth/RequireAuth.tsx:66-79`)가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장·삭제 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 `/login?returnUrl=%2Fsupport%2Freplies&reason=session_expired` 이동 확인. (미저장 폼 입력 유실은 EXC-19 P1 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): read 게이팅 — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:20`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `/support/replies/new`·`/:id/edit` 같은 하위 라우트까지 덮는다(`route-resource.ts` — '자기를 감싸는 가장 구체적인 잎'). **미충족(직접): write 액션 게이팅이 이 화면에 없다.** `useRouteWritePermissions`/`useRouteCan`(`RequirePermission.tsx:29-56`)은 **더 이상 소비자 0 이 아니다 — 8곳이 쓴다**(`products/{categories/ProductCategoriesPage.tsx:181, items/ProductListPage.tsx:119, returns/ReturnDetailPage.tsx:110}` · `settings/{api-keys/ApiKeysPage.tsx:59, languages/LanguagesPage.tsx:126, oauth/OAuthPage.tsx:78, site/SiteSettingsPage.tsx:109}` · `logs/components/LogListShell.tsx:115`). **가장 가까운 선례가 `products/items/ProductListPage.tsx:119` — 이 화면과 같은 `useCrudList`+`CrudListShell` 목록인데 그쪽은 `canCreate` 를 본다.** 그런데도 이 화면의 '템플릿 등록'(`RepliesPage.tsx:101`) · `RowActions` 의 수정/삭제(`CrudTable.tsx:192-197`) · '선택 N건 삭제'(`CrudListShell.tsx:126-132`)가 전부 `can(resource, action)` 을 묻지 않고 렌더된다. **요구는 이 화면을 사실상 명시 지목한다** — 'delete 없는 role 이 row/bulk delete 버튼을 못 봐야 한다'가 acceptanceCheck 이고, 이 화면이 그 두 버튼을 모두 가진 몇 안 되는 화면이다 | 권한 스토어에서 `support/replies` 의 `remove` 를 끈 뒤 `/support/replies` 진입. **행 삭제·일괄 삭제 버튼이 그대로 보이면 gap** — `ProductListPage.tsx:119` 를 그대로 따르면 된다. `grep -rn 'useRouteWritePermissions|useRouteCan' apps/admin/src/pages/support/` = **0**(앱 전체로는 8건). read 를 끄면 403 화면(pass). 범위: **이 화면**(공용 훅 + 선례 존재) | **gap** |
| EXC-04 | EXC | 직접 | **절반 해소 — 여전히 미충족(사유 축소).** ✔ **유령 저장·유령 삭제는 닫혔다**: F3b 가 `createStoreAdapter`(`crud.ts:165-240`)에 `exists()`(`:171`)를 넣었다 — `update` 없는 id → **`HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`**(`:219-221`) · `remove` 없는 id → **`HttpError(409, '이미 삭제된 항목입니다.')`**(`:232-234`) · `fetchOne` 없는 id → **`HttpError(404)`**(`:192-194`). store 의 `updateTemplate`(`map`)·`removeTemplate`(`filter`)이 여전히 없는 id 를 조용히 지나가더라도 **어댑터 경계가 그 앞을 막는다**. 자매 팩토리 `createCrudAdapter`(`:126-128`·`:139-141`)와 **이제 같은 계약**이다 — F2 의 비대칭은 사라졌다. ✔ **그리고 이 화면은 소비 준비가 돼 있었다** — `useCrudForm.handleWriteError` 가 `isConflict(cause)` 면 **입력을 보존한 채** 충돌 다이얼로그를 띄우고 성공 토스트·이동을 하지 않는다(`useCrudForm.ts:166-179` → FS-028-EL-027). **생산자가 생기면서 화면 코드 0줄로 복구 경로가 열렸다** — 저수준 훅을 쓰는 이 섹션의 카테고리 화면(NFR-027)과 갈리는 지점이다. ✘ **남은 것 — 낙관적 동시성 토큰**: 그 409 는 **'대상이 아직 존재하는가'** 로만 판정한다. `ReplyTemplate` 에 `updatedAt`/`version` 이 없어 If-Match/ETag 로 실을 값이 없고, **둘 다 존재하는 동시 편집은 last-write-wins** 다. 요구의 첫 문장('mutable record 의 write 에 optimistic-concurrency token 을 보낸다')이 미충족 | ① 탭 A 에서 `/support/replies/:id/edit` 를 연 채 탭 B 에서 그 템플릿을 삭제 → A 에서 저장 → **충돌 다이얼로그가 열리고 입력이 보존된다**(성공 토스트·이동 없음) = **유령 저장 해소**. `?status=save:409` 스위치 없이 실제 경합으로 재현된다. ② 탭 A·B 가 같은 템플릿을 각각 수정 → **경고 없이 나중 쓰기가 이긴다** = 미충족. ③ `grep -n 'updatedAt|version|If-Match' apps/admin/src/pages/support/replies/` = 0 | **gap** |
| EXC-08 | EXC | 직접 | `useCrudForm` 이 두 장치를 모두 제공하고 이 화면이 그대로 소비한다. ① **동기 제출 락** — `submitLockRef = useRef(false)`(`useCrudForm.ts:102`), `onValid` 첫 줄에서 `if (submitLockRef.current) return; submitLockRef.current = true;`(`:195-196`), `onSettled` 에서 해제(`:207-209`), `onInvalid` 에서도 해제(`:239-241`). 주석이 이유를 명시한다 — 'RHF 는 비동기 검증을 먼저 돌리므로 첫 클릭 후 saving 이 true 가 되어 버튼이 실제로 disabled 되기까지 한 틈이 있다'. ② **제출 시도 단위 멱등키** — `idempotencyKeyRef`/`takeIdempotencyKey`(`:112-117`)가 **`mutationFn` 밖에서** 키를 만들어 재시도가 같은 키를 재사용하고, 성공 시 버린다(`:214`). `TODO(backend): 이 키는 Idempotency-Key 헤더로 나간다` 로 연동 지점이 명시돼 있다. ③ 추가로 `disabled={saving \|\| loadingDetail}`(`FormPageShell.tsx:188`) 이중 방어 | `/support/replies/new` 에 제목·본문 입력 후 제출 버튼 더블클릭 또는 Enter 연타(400ms 창). **요청이 정확히 1건이면 pass.** 코드상 `submitLockRef` 가 `onValid` 진입 즉시 동기적으로 걸리는지 확인 | **pass** |
| EXC-09 | EXC | 직접 | 공유 predicate `isAbort`(`shared/async.ts`)가 세 지점에 배선돼 있다. ① **폼 저장** — `handleWriteError` 첫 줄 `if (isAbort(cause)) return;`(`useCrudForm.ts:160`), `onSuccess` 의 `if (controller.signal.aborted) return;`(`:212`), 언마운트 abort(`:92`). ② **단건 삭제** — `onError` 의 `if (isAbort(cause)) return;`(`useCrudList.tsx:110`), `onSuccess` 의 `if (controller.signal.aborted) return;`(`:105`), **다이얼로그 닫기가 abort + `mutation.reset()`**(`:87-91` — 요구가 명시한 `isPending` 리셋). ③ **일괄 삭제** — `onSuccess` 의 `if (signal.aborted) return;`(`crud.ts:238`), `closeBulk` 의 abort + reset(`useCrudList.tsx:118-122`). **bulk 실패 count 에서 abort 제외** — `settleAll` 이 rejected 를 세는데 abort 시 `onSuccess` 자체가 조기 반환해 배너를 띄우지 않는다. **list/cache 무변경** — 실패·abort 시 `invalidateQueries` 를 부르지 않는다(`crud.ts:239` — `if (failed === 0)` 일 때만) | 삭제 다이얼로그에서 '삭제' 클릭 → 400ms 안에 Esc/취소. **error toast·배너 없이 버튼 state 가 복원되면 pass.** 폼 저장 중 이탈도 동일 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-01 · STATE-02 · TOKEN-01 · TOKEN-05 · **COMP-10** · FEEDBACK-02 · FEEDBACK-04 · A11Y-11 · IA-01 · IA-05 · **IA-13** · EXC-08 · EXC-09 |
| `종속` | **10** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **2** | FEEDBACK-06 · A11Y-12 |
| `gap` | **5** | STATE-04 · IA-02 · IA-04 · EXC-03 · EXC-04 |
| **합계** | **30** | 13 + 10 + 2 + 5 = **30** ✓ |

> **직전 기준(`4b805ad`) 재판정: P0 gap 이 7 → 5 로 줄었다.** 뒤집힌 2건은 전부 **F3b 의 공용 훅 롤아웃을 이 화면이 실제로 소비한 결과**다:
> · **COMP-10** — `RepliesPage.tsx:93-99` 이 `list.searchInputProps` 를 스프레드하고 `useListState` 가 내부에서 `useDebouncedSearch`(조합 판정 + 250ms)를 소비한다(`useListState.ts:227-230`). **이 화면은 검색이 유일한 조회 수단이라 특히 중요했다**(`RepliesPage.tsx:9` 주석).
> · **IA-13** — `:76` `useListState()` 가 검색어를 URL(`?q=`)로 옮겼다.
>
> **EXC-04 는 범위만 좁아졌으므로 gap 을 유지했다** — 유령 저장/삭제는 F3b 의 `createStoreAdapter` 가드(`crud.ts:219-221`·`:232-234`)로 닫혔고 이 화면은 `useCrudForm` 의 충돌 다이얼로그를 이미 갖고 있어 **화면 코드 0줄로 복구 경로가 열렸다**. 남은 것은 **낙관적 동시성 토큰 하나**다. **좁혀진 gap 을 pass 로 올리지 않았다.** **P1 2건도 pass 로 전환**(ERP-13 · EXC-12 — 둘 다 같은 어댑터 수정의 효과다).
>
> **P0 gap 5건 — quality-bar '배치 실패' 사유.** 같은 섹션의 NFR-026(티켓, gap 6건)보다 적은 이유는 이 화면이 **공용 프레임워크를 그대로 소비**하기 때문이다 — STATE-01·STATE-02·COMP-10·FEEDBACK-02·FEEDBACK-04·IA-13·EXC-08·EXC-09 가 전부 프레임워크에서 상속돼 pass 다. 남은 gap 은 **화면이 프레임워크에 넘기지 않은 것**(STATE-04 선택 해제 · EXC-03 write 게이팅)과 **프레임워크·앱 전역의 구멍**(IA-02 title 모델 · IA-04 페이지네이션 · EXC-04 동시성 토큰)으로 갈린다.
>
> **STATE-04 가 이 화면의 최우선 gap 이다** — 유일하게 **데이터를 잃는** 결함이고(보이지 않는 행이 삭제된다), F3b 이후 **오히려 더 눈에 띈다**: 이 화면은 이제 `useListState`(자기 선택 상태를 갖고 view 서명 변경 시 비운다 — `useListState.ts:205-213`)와 `useCrudList`(`useRowSelection` 소유)를 **둘 다** 쓰면서, 표에는 후자의 선택을 넘긴다(`:110-123`). 즉 **선택 상태가 두 벌인데 검색어와 연결된 쪽이 쓰이지 않는다.** 고치는 데 한 줄이면 된다(`controller.clear()` 를 keyword 변경에 연결하거나 `list.selectedIds` 로 일원화).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·날짜 범위·금액·CSV·좌측 필터 패널·페이지네이션 range 등)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:151`)로 이전 행을 유지하고, `CrudListShell` 이 `refreshing` 일 때 **건수를 지우지 않고 ' · 새로고침 중…' 만 덧붙인다**(`:118-122`). `staleTime` 30초가 재조회 시점을 지배한다 | 재조회 중 이전 행이 유지되고 가벼운 인디케이터만 뜨는지 | **pass** |
| STATE-05 | P1 | `Empty` 가 맥락으로 3분기한다 — 화면이 `empty={{ hasQuery: keyword !== '', onClearSearch: () => setKeyword('') }}` 를 넘긴다(`RepliesPage.tsx:106-109`). 검색 0건 → '조건에 맞는 …' + '검색 지우기'. **다만 `createAction` 을 넘기지 않아 진짜 0건에 생성 CTA 가 없고**, 필터 축이 없어 `hasActiveFilters` 분기는 표면이 없다 | 검색 0건 → 검색 지우기 CTA. 진짜 0건 → 등록 CTA | **부분 pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudCreate`/`useCrudUpdate` 가 목록(+상세)을 정확히 무효화한다(`crud.ts:179-181,198-201`). 삭제도 동일(`:218-220`). **일괄 삭제는 전원 성공일 때만 무효화**(`:239`) — 부분 실패 시 선택을 유지해 재시도하게 한다 | 등록 후 목록 복귀 시 새 행이 수동 새로고침 없이 보이는지 | **pass** |
| COMP-01 | P1 | 모든 action/navigation 버튼이 DS `<Button>` 이다 — '템플릿 등록'(`RepliesPage.tsx:91`) · 폼 취소/제출(`FormPageShell.tsx:180-190`) · 배너 '다시 시도'/'목록으로' · `RowActions` · SelectionBar. **`buttonStyle(`·`tds-ui-btn-` grep = 0.** 단 진행 상태를 `loading` prop 이 아니라 **손으로 쓴 '저장 중…' 라벨**로 표현한다(`FormPageShell.tsx:189`) — 요구가 '손수 쓴 저장 중… 금지'를 명시하나 이는 **공용 셸의 문제**이지 이 화면이 조립한 것이 아니다 | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/support/replies -r` → **0건**(확인됨). `loading` prop 은 셸 판정 | **pass(조립) / 셸 종속(loading prop)** |
| COMP-02 | P1 | 선택 셀이 DS `RowSelectCell`/`SelectAllHeaderCell`, 순번이 `SeqCell`/`SeqHeaderCell` 이다(`CrudTable.tsx:124-130,173-179`). raw `<input type="checkbox">` 선택 마크업 0건 | selectable 표에 raw checkbox 가 0건인지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>`(`RepliesPage.tsx:85`). raw `<input type="search">` 재구현 0건 | `grep 'type="search"' pages/support/replies` → 0건 | **pass** |
| COMP-04 | P1 | **제목은 `FormField required` 로 `*` 마커가 렌더된다**(`ReplyFormPage.tsx:97`). **그러나 본문은 zod 로 필수인데(`requiredText('본문', 1000)`) `TextareaField` 에 `required` prop 을 넘기지 않아 마커가 없다**(`:127-136`) — `TextareaField` 는 `required = false` 기본값을 갖는다(`TextareaField.tsx:32`). **같은 폼 안에서 필수 표기가 갈린다** — 운영자는 본문을 선택 항목으로 읽고 비운 채 제출하다 검증 실패를 만난다 | 모든 zod-required 필드가 `*` 마커를 렌더하는지. 현재 2개 중 1개만 | **gap** |
| COMP-09 | P2 | **본문 미리보기가 정확히 이 요구의 모범 사례다** — `bodyPreview` 가 공백을 접고 60자에서 자르며(`RepliesPage.tsx:44-47`), 셀이 `maxWidth` + `overflow:hidden` + `textOverflow:ellipsis` + `whiteSpace:nowrap`(`:35-42`) 이라 **긴 본문이 표 폭을 넓히지 못한다.** 제목은 60자 상한이라 위험이 낮다. **다만 hover/expand 로 전체 값을 보는 수단이 없다**(`title` 속성도 없다) — 요구는 'ellipsis 로 truncate **하고** hover/expand 로 전체 노출'을 함께 요구한다 | 1000자 본문으로 표 폭이 유지되는지(pass). 잘린 값을 hover 로 볼 수 있는지(미충족) | **부분 pass** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`). 셀 수는 `totalCols = columns.length + 3`(`:113`)으로 **테이블 정의에서 파생**돼 요구의 절반은 만족한다. 행 수는 페이지네이션이 없어 `PAGE_SIZE` 기준값 자체가 없다(IA-04 gap 과 연동). **공용 `CrudTable` 의 문제라 이 화면 단독으로 못 고친다** | `grep "length: 5"` → 0건이어야 한다. 현재 `CrudTable.tsx` 에 1건 | **gap(공용)** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다.** IA-04 해소 시 2페이지 첫 행이 1로 리셋된다. **공용 `CrudTable` 의 문제** | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지 | **gap(잠재·공용)** |
| COMP-08 | P2 | **이 요구의 (b) 갈래를 정확히 따른다** — 인라인 편집 가능 테이블이므로 마지막 컬럼이 `RowActions`(pencil/trash)다(`CrudTable.tsx:190-199`). 중복 '상세' 버튼 없음. 액션이 2개(수정·삭제)라 ActionMenu 승격 임계값(3개) 아래 | 편집 테이블이 `RowActions` 를 쓰고 중복 '상세' 가 없는지 | **pass** |
| COMP-12 | P2 | 본문에 `N/1000` 실시간 카운터가 있다(`TextareaField` → `FormField counter`, `TextareaField.tsx:52`). **제목(60자)에는 카운터가 없다** — `<input>` 을 직접 조립하며 `FormField` 에 `counter` 를 넘기지 않는다(`ReplyFormPage.tsx:97-110`). 둘 다 **상한 근접 경고가 없고** `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다 — 요구가 지적하는 그 증상. counting 기준(`value.length` = UTF-16 code unit)이 명시되지 않아 조합형 한글의 세는 법이 서버 강제와 일치하는지 알 수 없다 | 길이 제한 필드가 실시간 카운트 + 상한 근접 경고를 보이는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 정확히 일치한다: write 성공 → toast(`useCrudList.tsx:107,145` · `useCrudForm.ts:215`) · read 실패 → 인라인 Alert(`CrudListShell.tsx:157` · `FormPageShell.tsx:124`) · **다이얼로그 내부 실패 → 그 다이얼로그의 error 배너**(`useCrudList.tsx:160,171` — modal 뒤에 숨는 toast 를 쓰지 않는다) · 저장 실패 → 폼 카드 배너(`FormServerError`). page 가 임의 배너 state 를 갖지 않는다 | ConfirmDialog 내부 delete 실패가 다이얼로그 배너인지(toast 아님) | **pass** |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 피드백이 배선돼 있다 — 삭제(toast/배너) · 일괄 삭제(toast/배너) · 등록·수정(toast/배너). no-op 클릭이 없다 | `?fail=support-templates:save`·`:delete` 로 각 mutation 이 가시 실패를 내는지 | **pass** |
| FEEDBACK-05 | P2 | 모든 삭제가 delete-intent `ConfirmDialog` 로 게이트되고 본문이 '이 작업은 되돌릴 수 없습니다.' 로 비가역성을 고지한다(`useCrudList.tsx:157,169`). 단일 미확인 클릭 delete 0건. undo window 는 없으나 요구가 'confirm **또는** undo' 이므로 충족 | 모든 delete 가 confirm 을 열거나 undo 를 내는지 | **pass** |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스(Cancel)는 DS 가 소유한다 — 이 화면은 `intent`/`confirmLabel` 만 넘긴다 | DS 판정에 종속 | **종속** |
| A11Y-04 | P1 | busy 중 포커스 유지도 DS `ConfirmDialog`/`Modal` 이 소유한다. 이 화면은 `busy` prop 만 넘긴다 | DS 판정에 종속 | **종속** |
| A11Y-05 | P1 | 유형 태그 `SelectField` 에 `isInvalid` 를 넘기지 않는다 — **오류 상태가 존재하지 않기 때문**(`z.string()` 이라 위반 불가). SelectField 의 isInvalid 계약 자체는 DS 소관이며 이 화면에 그 표면이 없다 | 이 화면에 invalid select 표면이 없음을 확인 | **n-a** |
| A11Y-08 | P1 | 행 클릭이 `rowActivateProps`(마우스 전용 — `<tr>` 에 tabIndex 없음)로 수정 화면을 연다(`CrudTable.tsx:172`). **키보드 등가물은 `RowActions` 의 '수정' 버튼**(`:192-197`, 접근 이름이 `label={nameOf(item)}` 로 행마다 구분된다) — 같은 목적지를 연다. **제목 셀이 링크는 아니지만 도달 가능한 컨트롤이 행 안에 있어 요구를 만족**한다 | 행을 Tab 해서 행 클릭과 같은 수정 화면을 여는 컨트롤에 도달하는지 | **pass** |
| A11Y-13 | P1 | **검증 실패 시 첫 invalid 필드로 포커스가 이동한다** — `useCrudForm.submit` 이 `form.handleSubmit(onValid, onInvalid)` 를 호출하고(`useCrudForm.ts:253`) RHF 의 `shouldFocusError` 기본값이 이를 수행하며, 주석이 'onInvalid 를 명시해 계약으로 고정한다'고 밝힌다(`:233-241`). **서버 422 도 `setFocus(first.field)` 로 첫 서버-flag 필드에 포커스**(`:184`). **다만 폼 open 시 첫 편집 필드 자동 포커스는 없다** — 요구의 두 절 중 하나만 충족 | 빈 required 제출 → activeElement 가 제목 입력인지(pass). 폼 진입 시 첫 필드 포커스인지(미충족) | **부분 pass** |
| A11Y-16 | P1 | 이 화면의 인터랙티브 표면이 계약을 만족한다: 표 `aria-busy` + caption(`CrudTable.tsx:116-120`) · **항상 마운트된 polite live region**(`CrudListShell.tsx:107-109` — 검색으로 0행이 되는 전환이 들린다) · 오류 `role="alert"`(`FormField.tsx:72`) · 요약 `aria-busy={refreshing}`(`:118`) · 전체선택 indeterminate(`tableSelectionState`) · 다이얼로그 focus trap/Esc(DS) · `tds-ui-focusable` ring. **비색상 state 인코딩** — 유형 태그가 tone(색) + 라벨 텍스트('전체'/유형명) 이중이다 | axe 로 목록·폼 페이지 통과, live region 이 검색 0행 전환을 announce 하는지 | **pass** |
| IA-06 | P1 | **무게 규칙을 정확히 따른다** — 템플릿은 제목·태그·1000자 본문을 갖는 rich 엔티티라 **전용 form route**(`/new`·`/:id/edit` + `FormPageShell`)를 쓰고, 같은 고객센터 섹션의 문의 유형(라벨+활성 여부뿐인 taxonomy)만 `CategoryFormModal` 로 modal 을 쓴다. 혼용 없음 | 이 화면이 route 폼을, 카테고리 화면이 modal 을 쓰는지 | **pass** |
| IA-07 | P1 | back-link 가 '목록으로' + `ChevronLeftIcon` + `<button>` + 좌상단이다(`FormPageShell.tsx:147-155`) — 앱 표준과 일치. '리스트로 돌아가기'/`ArrowLeftIcon` 0건 | `grep '리스트로 돌아가기\|ArrowLeftIcon' pages/support/replies` → 0건 | **pass** |
| IA-08 | P1 | footer 가 **primary save 우측 · secondary 취소 그 왼쪽 · in-card** 로 일관된다(`FormPageShell.tsx:179-191` — `justifyContent: 'flex-end'`, 취소 → 제출 순서). 공용 셸이 소유해 형제 폼과 어긋날 수 없다 | 취소·save 가 동일 상대 위치·컨테이너인지 | **pass** |
| IA-11 | P2 | **표면이 없다** — 이 화면에 읽기전용 record detail 이 없다(목록 → 수정 폼으로 바로 간다. 상세 조회 화면이 없다) | detail 화면이 생기면 재판정 | **n-a** |
| ERP-01 | P1 | 유형 태그 tone 이 화면 로컬 삼항이다 — `tone={template.categoryId === '' ? 'neutral' : 'info'}`(`RepliesPage.tsx:56`). **lifecycle status 가 아니라 '공용 여부' 라는 이진 표시**라 status→tone 레지스트리의 대상이 아니다. 이 화면에 ERP lifecycle status(대기/승인/반려…)가 없다 | 이 화면에 domain status 표면이 없음을 확인 | **n-a** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 건수가 `formatNumber` 를 경유한다(`CrudListShell.tsx:119`). 인라인 포맷 0건. **단 조사 폴백형이 남아 있다**(ERP-13) | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-08 | P2 | 이 화면에 숫자·통화·날짜 셀이 없다 — 컬럼이 제목·유형 태그·본문 미리보기뿐이다. 건수만 `formatNumber` 를 쓴다. raw `toString()` 0건 | 표 셀에 raw numeric toString 이 0건인지 | **pass** |
| ERP-13 | P1 | **해소됨(통합).** 조사 헬퍼가 `shared/format.ts:269+`(`objectParticle` `:306` · `topicParticle` `:311`)로 승격됐고 — 이전엔 `logs/josa.ts` 등 3곳 사본 — **이 화면이 소비하는 공용 프레임워크 문구가 전부 그것을 경유한다**: `useCrudList.tsx:108`(삭제 토스트) · `:158`(삭제 확인 문구) · `useCrudForm.ts:222`(등록/저장 토스트) · `FormPageShell.tsx:129-130`(로드 실패) · `shared/crud/validation.ts:17,20`(`requiredText` — 이 화면의 '템플릿 제목'·'본문' 문구). 빈 상태는 `CrudTable.tsx:59-72` 가 조립해 `@tds/ui` `Empty`(`Empty.tsx:16-28`, 레이어 경계상 자족 헬퍼)에 넘긴다. **'답변 템플릿'은 받침이 없으므로 이제 '답변 템플릿를 등록했습니다' 가 나온다** — 예전의 '답변 템플릿을(를)' 은 사라졌다 | 템플릿 '배송 지연 사과 안내'(받침 없음) 삭제 → `'배송 지연 사과 안내'를 삭제했습니다.` / 받침 있는 이름 → `…'을 삭제했습니다.`. **사용자 대상 문자열의 조사 폴백형 grep = 0** — 앱 전역 잔여 히트 12건은 주석·헬퍼 설명문·'이 리터럴을 내지 않는다'를 단언하는 테스트 | pass |
| ERP-15 | P1 | 전량을 한 DOM 에 렌더한다(`CrudListShell` → `CrudTable` 이 `visibleItems` 전부) — cap·virtualization 없음. **다만 템플릿은 수십~수백 건 규모**라 티켓(무한 증가)보다 위험이 낮다(BE-028 §7.9). 6컬럼이라 가로 overflow 위험도 낮고, 본문 미리보기가 폭을 고정한다(COMP-09) | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap(경미)** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트·다이얼로그 취소에서만 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **화면이 status 로 분기할 준비가 대체로 돼 있다** — `useCrudForm` 이 409/412 → 충돌 다이얼로그(`:162`), 422+violations → 필드 인라인(`:176`), 404 → not-found 화면(`:138-143`), 그 외 → generic 배너 + reference(`:188-189`)로 가른다. **그러나 어댑터가 그 status 를 만들지 않는다** — `getTemplate` 이 `HttpError(404)` 가 아닌 일반 `Error` 를 던지고(`_shared/store.ts:305-309`) `createStoreAdapter` 가 409 를 던지지 않는다. 403(권한)·429(백오프) 전용 surface 도 없다. **`?status=` 스위치로만 재현된다** | `?status=save:409` vs `save:422` vs `save:500` 이 다른 surface 를 그리는지(대체로 pass). `?status=detail:404` 가 not-found 화면을 내는지(**gap** — 어댑터가 404 를 안 만든다) | **gap** |
| EXC-07 | P1 | **서버 422 를 필드 인라인 에러로 매핑하는 경로가 완비돼 있다** — `handleWriteError` 가 `isUnprocessable(cause) && cause.violations.length > 0` 이면 `violations` 마다 `setError(violation.field, { type: 'server', message })` 하고 첫 필드에 `setFocus`(`useCrudForm.ts:176-186`). client zod error 와 **같은 인라인 슬롯**(`errors.title?.message` → `FormField error`)을 재사용하고, form-level 배너는 generic 전용으로 예약된다 | field path 있는 422 fixture(`title` 중복)가 제목 입력에 인라인 error + 포커스를 내는지. **단 BE-028 §7.10 이 지적하듯 현재 계약은 제목 중복을 409 로 두어 이 경로가 아니라 충돌 다이얼로그로 간다** | **pass(경로) / BE 계약 이관** |
| EXC-10 | P1 | `settleAll` 로 `Promise.allSettled` semantics 를 쓰고 부분 결과를 'N건 중 M건 실패'로 보고하며(`useCrudList.tsx:137-141`) **다이얼로그를 열어 둔 채 선택을 유지**하고, **전원 성공일 때만 invalidate + selection clear**(`:142-146` · `crud.ts:239`). **그러나 실패 id 를 반환하지 않아** 재시도가 성공분까지 재요청한다 — 요구의 'retry 가 실패 item 만 타깃' 미충족. **단건 DELETE 가 멱등(BE-028 §7.6)이라 안전하긴 하다** | 부분 실패 bulk delete 가 dialog 를 유지하고 실패 item 만 재요청하는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 없음 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **해소됨(F3b).** `FormPageShell` 은 원래 404 와 generic error 를 정확히 갈랐다 — `loadFailure === 'not-found'` 면 '답변 템플릿를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + **'목록으로'만**(재시도 숨김 — `:117-120` 주석: '404 는 재시도를 권하지 않는다 — 재시도해도 영원히 없다'), 그 외면 '다시 시도' + '목록으로'(`FormPageShell.tsx:116-144`). **못 따라가던 어댑터가 고쳐졌다** — `createStoreAdapter.fetchOne`(`crud.ts:192-194`)이 `exists(id)` 로 먼저 보고 `HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없습니다.')` 를 던지므로, store 의 `getTemplate` 이 던지는 status 없는 일반 `Error` 는 그 경계에 도달하지 못한다(`:183-191` 주석이 이 전환을 명시한다). `isNotFound(loadError)`(`useCrudForm.ts:144-149`)가 이제 참이 된다 | 삭제된 `:id` 로 수정 진입 → **'답변 템플릿를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'(재시도 버튼 없음)**. 무한 spinner 없음. 대조: `?fail=support-templates:detail` 은 status 없는 Error 라 여전히 'error' 갈래('불러오지 못했습니다' + 다시 시도) — 의도된 구분이다 | pass |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 등록·수정·삭제가 전부 비관적(confirm/busy → 성공 후 invalidate). 요구가 'create/delete 는 pessimistic 유지'를 명시하므로 **정합**하며, un-rolled-back optimistic write 0건 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-18 | P1 | selection scope 가 **current-page(=현재 보이는 행)** 로 암묵 정의돼 있다 — `toggleAll` 이 `visibleItems.map(i => i.id)` 를 받는다(`CrudListShell.tsx:143-148`). **그러나** ① scope 라벨이 없다 ② **Shift-click range 선택이 없다** ③ 대량 임계값 confirm 강화·type-to-confirm 없다 ④ progress·cancel 없다. **가장 큰 문제는 STATE-04 와 겹친다** — scope 가 '보이는 행'인데 검색 변경 시 해제되지 않아 **실제 scope 가 '보이는 행 ∪ 과거에 보였던 선택'** 이 된다 | Shift-click 이 range 를 고르는지. 대량 bulk 가 progress/cancel 을 내는지 | **gap** |
| EXC-20 | P1 | **5xx 실패 시 복사 가능한 참조 코드를 보여준다** — `useCrudForm` 이 `setErrorReference(referenceOf(cause))`(`:189`) 하고 `FormPageShell` 이 `<FormServerError serverError errorReference />` 로 렌더한다(`:167`). `HttpError.reference` 가 그 소스(`shared/errors/http-error.ts` — '운영자가 내부 티켓에 붙일 수 있는 짧은 상관관계 코드'). **raw 서버 body/stack 노출 0건.** 단 **삭제 실패(다이얼로그 배너)에는 reference 가 없다** — `useCrudList` 가 고정 문구만 쓴다(`:111`) | `?status=save:500` 이 reference code 를 보이는지(pass). `?status=delete:500` 은 reference 없음(부분 미충족) | **부분 pass** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 400ms (BE-028 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 300ms | 위와 동일 |
| 등록·수정 p95 | ≤ 500ms | 위와 동일 |
| 삭제 p95 | ≤ 300ms (일괄은 항목당 병렬) | 위와 동일 |
| 첫 렌더(목록) | ≤ 1.2s (LCP) | 미측정. 전량 렌더지만 템플릿 규모(수십~수백)에서는 위험이 낮다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시 — **충족** |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) | **충족(요청)** / **미충족(연산)** — 키 입력마다 전량을 `searchTemplates` 로 훑는다(`RepliesPage.tsx:78-81`). 디바운스가 없어(COMP-10) 자모마다 발생. **`bodyPreview` 는 `useMemo` 없이 렌더마다 매 행에 대해 정규식을 돌린다**(`:44-47`, `COLUMNS.render` 안) — 건수 × 렌더 횟수에 비례 |
| 저장 요청 크기 | ≤ 2KB | **충족** — `ReplyTemplateInput` 이 `{ title(≤60), categoryId, body(≤1000) }` 로 상한이 고정돼 있다. BE-026(타임라인 무한 증가)과 대조적 |
| 목록 응답 크기 | ≤ 100KB | **미충족(잠재)** — 목록이 `body` 전문(1000자)을 전량 담는다(BE-028 §7.9). 200건이면 ~200KB 인데 화면은 60자 미리보기만 쓴다 |
| 메모리 | 목록 전량 + 폼 1건 | 전량 보유. 규모가 작아 위험 낮음 |
| 번들 | 이 화면 고유 코드 ≤ 8KB(gzip) | 미측정. **화면 고유 코드가 매우 적다**(컬럼 3개·필드 3개·툴바) — 나머지는 공용 프레임워크 공유 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:157-164`). **툴바는 남아** 검색·등록을 계속 쓸 수 있다 |
| 폼 로드 실패(5xx) | '다시 시도' + '목록으로' | **충족**(`FormPageShell.tsx:124-140`) |
| 폼 로드 실패(404) | '찾을 수 없습니다' + '목록으로'(재시도 숨김) | **셸은 충족, 어댑터가 미충족** — `getTemplate` 이 status 없는 Error 를 던져 404 갈래가 발현되지 않는다(EXC-12 gap) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference | **충족**(EXC-20 pass) |
| 저장 충돌(409) | 입력 보존 + 충돌 다이얼로그 | **화면은 충족, 어댑터가 미충족** — `createStoreAdapter` 가 409 를 만들지 않는다(EXC-04 gap). `?status=save:409` 로만 재현 |
| 삭제 실패 | 다이얼로그 유지 + 배너 + 재클릭 retry | **충족**(FEEDBACK-02 pass) |
| 일괄 삭제 부분 실패 | 'N건 중 M건 실패' + 선택 유지 + 실패분만 재시도 | **부분 충족** — 건수 보고·선택 유지는 되나 실패 id 를 몰라 전량 재시도(EXC-10 gap). **단건 DELETE 가 멱등이라 안전** |
| 저장·삭제 중 이탈 | abort · 실패 통지 없음 · pending 리셋 | **충족**(EXC-09 pass) |
| 동시 편집(두 관리자) | 나중 저장이 앞선 변경을 덮지 않는다 | **미충족** — If-Match 없음, 어댑터가 409 미발생(EXC-04 gap). **다만 프론트 UI 는 완비** |
| 삭제된 템플릿 편집 | 유령 저장 대신 충돌 알림 | **미충족 — '저장했습니다' 토스트가 뜨고 목록으로 이동하는데 저장된 것이 없다**(`createStoreAdapter` 가드 부재 — BE-028 §7.5) |
| 세션 만료 중 작성 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 미저장 입력을 버린다(EXC-19 P1) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`. FS-028-EL-019 의 동기 store throw 도 여기서 멈춘다 |

### 4.3 데이터 보존 · 감사

답변 템플릿은 **조직의 표준 문구**이며 그 변경은 이후 모든 답변에 영향을 준다(BE-028 §7.7). quality-bar 가 다루지 않는 축이므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 템플릿 변경 이력(누가·언제·무엇을) | **없다.** `ReplyTemplate` 에 `updatedAt`·`updatedBy`·버전이 없다 — 사과 문구가 언제 누구에 의해 바뀌었는지 추적할 수 없다. **BE-026 의 티켓은 타임라인으로 이력을 남기는데 템플릿은 아무것도 남기지 않는다** |
| 삭제된 템플릿의 복구 | **불가.** 하드 삭제이며 undo window 도 없다(FEEDBACK-05 는 confirm 으로 충족되나 복구 수단은 없다) |
| 이미 보낸 답변은 템플릿 삭제에 영향받지 않는다 | **충족(구조적)** — 템플릿 본문이 답변 이벤트 `text` 로 **복사**되고 템플릿 id 가 티켓에 남지 않는다(BE-028 EP-05 각주). 고아가 생기지 않는다 |
| 템플릿 본문에 실행 가능한 스크립트가 없다 | **미정** — 서버 정제 계약이 필요하다(BE-028 §7.1). **템플릿·답변 두 지점 모두** |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | STATE-04 · EXC-18 | P0 · P1 | **검색어 변경 시 행 선택이 해제되지 않아 보이지 않는 행이 일괄 삭제된다.** **F3b 이후 오히려 더 눈에 띈다** — 이 화면은 `useListState`(`:76`, 자기 선택 상태를 갖고 view 서명 변경 시 비운다 — `useListState.ts:205-213`)와 `useCrudList`(`:79-84`, `useRowSelection` 소유)를 **둘 다** 쓰면서 표에는 후자의 선택을 넘긴다(`:110-123`). 즉 **선택 상태가 두 벌인데 검색어와 연결된 쪽(`list.selectedIds`)이 쓰이지 않는다.** `useRowSelection` 이 '호출부가 clear() 로 비운다'고 계약을 명시하는데 어긴다. **이 화면에서 유일하게 데이터를 잃는 결함이며 한 줄로 고쳐진다**(`controller.clear()` 를 keyword 에 연결하거나 `list.selectedIds` 로 일원화) | 이 화면 | **A11 change_request (최우선)** |
| ~~2~~ | ~~COMP-10~~ | ~~P0~~ | **해소됨(F3b)** — `RepliesPage.tsx:93-99` 이 `list.searchInputProps` 를 `SearchField` 에 스프레드하고, `useListState`(`:76`)가 내부에서 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다: 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) · 조합 중 Enter 차단(`:121-124`) · 250ms 디바운스(`:23,93-95`) | — | — |
| 3 | IA-02 | P0 | **`<h1>` 이 2개**(AppHeader `:101` '문의 답변' ↔ `FormPageShell.tsx:160` '답변 템플릿 등록') — '단일 title 메커니즘' 미충족. 목록/폼의 title 소스가 갈리고, '행위'가 AppHeader 제목에 없다(`nav-config.ts:294-296` 이 의도로 명시). *(브랜치 라벨 '고객센터' 폴백은 `findCoveringLeaf`(`:260-278`)로 해소 — 이제 '문의 답변')* | **앱 전역**(`AppHeader`·`FormPageShell`·title 모델) | A40 · A11 |
| 4 | IA-04 · ERP-15 | P0 · P1 | 페이지네이션 없음 — 전량 렌더 | 이 화면 + BE 계약 | A11 · A63 (BE-028 §7.9 — **1:1 문의 상세가 전량을 필요로 하므로 두 표현 필요**) |
| ~~5~~ | ~~IA-13~~ | ~~P0~~ | **해소됨(F3b)** — `RepliesPage.tsx:76` `useListState()` 가 검색어를 URL(`?q=`)로 옮겼다. `replace` 갱신(`useListState.ts:125`)이라 history 가 쌓이지 않고, 수정 화면에서 Back 하면 검색어가 복원되며 링크 공유도 된다 | — | — |
| 6 | EXC-03 | P0 | write 액션 게이팅 미배선 — **`useRouteWritePermissions` 는 이제 7곳이 소비하지만**(products 3 · settings 4) `pages/support/**` 는 그 밖이다. 최근접 선례는 같은 `useCrudList`+`CrudListShell` 목록인 `products/items/ProductListPage.tsx:119`. **이 화면은 등록·수정·행 삭제·일괄 삭제를 모두 가져 요구가 사실상 명시 지목**한다. read 게이팅은 pass | **이 화면**(공용 훅 + 7곳 선례 존재) | A11 change_request |
| 7 | EXC-04 | P0 | **낙관적 동시성 토큰 부재** — `ReplyTemplate` 에 `updatedAt`/`version` 이 없어 If-Match 로 보낼 값이 없다. 어댑터의 409 는 '대상이 아직 존재하는가' 로만 판정하므로 **둘 다 존재하는 동시 편집은 last-write-wins**. *(유령 저장·유령 삭제와 404 미도달은 F3b 의 `createStoreAdapter` 가드로 **해소** — `crud.ts:171` `exists()` → `update`/`remove` 409(`:219-221`·`:232-234`) · `fetchOne` 404(`:192-194`). 이 화면은 `useCrudForm` 의 충돌 다이얼로그·404 화면을 이미 갖고 있어 **화면 코드 0줄로 복구 경로가 열렸다** — EXC-06·EXC-12 도 함께 pass 가 됐다)* | 이 화면 + 도메인 모델 | A63 (BE-028 §7.5 — 응답에 `version`/`ETag` 필요) · A11 |
| 8 | COMP-04 | P1 | **본문에 필수 마커(`*`)가 없다** — zod 는 필수인데 `TextareaField` 에 `required` prop 미전달. 제목은 마커가 있어 **같은 폼 안에서 필수 표기가 갈린다** | 이 화면 | A11 change_request |
| 9 | ERP-13 | P1 | 삭제 확인·토스트·404 문구의 리터럴 조사 폴백(`을(를)`) — `useCrudList`·`useCrudForm`·`FormPageShell` 이 소유한 공용 문구. 요구가 `useCrudList` 를 명시 지목 | **공용 프레임워크** | A11 (공용 수정) |
| 10 | EXC-10 · EXC-18 | P1 | 일괄 삭제 부분 실패 후 **실패 id 를 반환하지 않아** 재시도가 성공분까지 재요청. Shift-range 선택·대량 progress·cancel·상한 없음 | 공용(`settleAll`·`useCrudBulkDelete`) + 이 화면 | A11 change_request |
| 11 | COMP-12 | P2 | 제목(60자)에 카운터 없음 · 두 필드 모두 상한 근접 경고 없음 · counting 기준 미정의 | 이 화면 | A11 |
| 12 | COMP-06 · COMP-07 | P2 | 스켈레톤 `length: 5` 하드코딩 · `SeqCell` 에 `startIndex` 없음(페이지네이션 도입 시 발현) — **둘 다 공용 `CrudTable`** | **공용 프레임워크** | A11 (#4 와 함께) |
| 13 | COMP-09 | P2 | 본문 미리보기가 truncate 는 하나 **hover/expand 로 전체 값을 볼 수단이 없다**(`title` 속성도 없음) | 이 화면 | A11 |
| 14 | STATE-05 | P1 | 진짜 0건에 **등록 CTA 가 없다** — `Empty` 가 `createAction` 을 지원하는데 넘기지 않는다. 툴바에 등록 버튼이 있어 경미 | 이 화면 | A11 |
| 15 | A11Y-13 | P1 | 폼 open 시 첫 편집 필드 자동 포커스 없음(검증 실패 시 포커스 이동은 pass) | 공용(`useCrudForm`) | A11 |
| 16 | EXC-20 | P1 | 삭제 실패(다이얼로그 배너)에 reference code 없음 — 저장 실패에는 있다 | 공용(`useCrudList`) | A11 |
| 17 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 미저장 입력을 버린다(EXC-19) | **앱 전역** | A40 · A11 |
| 18 | (BE-028 §7.10) | — | **제목 중복을 409 로 두면 충돌 다이얼로그가 잘못 뜬다** — 422 + `error.fields` 로 반환하면 `useCrudForm` 의 422 경로가 제목에 인라인 에러를 준다(화면 코드 0줄 변경) | BE 계약 | **A63 (계약 확정 필요)** |
| 19 | (BE-028 §7.2) | — | `categoryId` 가 `z.string()` 이라 없는 유형 id 도 통과 — 서버 422 참조 무결성 필요 | BE 계약 | A63 |
| 20 | (BE-028 §7.3) | — | 유형 목록 조회가 어댑터 없는 동기 store 직접 호출이고, **필요보다 무거운 사용량 집계 API 를 쓴다** — 연동 시 **화면 코드가 함께 바뀐다** | 이 화면 | A11 (연동 산정에 포함) |
| 21 | (§4.3) | — | **템플릿 변경 이력이 없다**(`updatedAt`·`updatedBy` 부재) — 조직 표준 문구가 언제 누구에 의해 바뀌었는지 추적 불가 | BE 계약 + 이 화면 | A63 · A11 |
| 22 | (§4.1) | — | 목록이 `body` 전문(1000자)을 전량 담는데 화면은 60자 미리보기만 쓴다. `bodyPreview` 가 `useMemo` 없이 렌더마다 전 행에 정규식을 돌린다 | BE 계약 + 이 화면 | A63 (BE-028 §7.9) · A11 |
| 23 | (FS-028 §7 #1) | — | **화면명('문의 답변')이 도메인('답변 템플릿')과 어긋난다** — 운영자가 '여기서 고객에게 답장하는 화면'으로 오해할 수 있다 | 앱 IA | A01 |
| 24 | (FS-028 §7 #24) | — | 목록에 **유형 태그 필터가 없다** — 검색만 있다 | 이 화면 | A11 (#4 의 `?categoryId=` 쿼리가 함께 해소) |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `a5c2639`(2026-07-17) 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`replyTemplateAdapter` 는 `createStoreAdapter({ scope: SCOPE, ... })` 로 조립되고 `SCOPE = TEMPLATE_RESOURCE = 'support-templates'`(`data-source.ts:15-16`)다. `createStoreAdapter` 가 5개 함수 각각에서 `failIfRequested(spec.scope, op)` 를 부른다(`crud.ts:113,118,123,129,134`) — **BE-026 과 달리 op 4종이 전부 실재한다**(create·remove 가 진짜 구현이기 때문):

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:113`) | `?fail=list` · `?fail=support-templates:list` · `?fail=all` |
| `detail` | `fetchOne` (`:118`) | `?fail=detail` · `?fail=support-templates:detail` · `?fail=all` |
| `save` | `create` **와** `update` (`:123,129`) — **두 쓰기가 같은 op 을 공유한다** | `?fail=save` · `?fail=support-templates:save` · `?fail=all` |
| `delete` | `remove` (`:134`) — **단건·일괄이 같은 함수를 쓴다** | `?fail=delete` · `?fail=support-templates:delete` · `?fail=all` |

- `?fail=save` 는 **등록과 수정을 구분하지 않는다** — 둘 다 걸린다.
- `?fail=delete` 는 **일괄 삭제의 전 항목을 실패**시킨다(항목별 선택 실패 재현 불가) — EXC-10 의 '부분 실패' 재현에는 부족하다.
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 `?delay=` 가 아니라 **`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:24-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500.

| 판정 | 재현 |
|---|---|
| EXC-04 (409 conflict) | `?status=save:409` — **충돌 다이얼로그가 입력을 보존한 채 뜨면 프론트 경로는 정상.** 스위치 없이 실제 경합에서 409 가 안 나는 것이 gap |
| EXC-12 (404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **404 가 재시도 없는 not-found 화면을 내면 pass.** 현재는 어댑터가 404 를 안 만들어 스위치로만 확인 가능 |
| EXC-07 (422 필드 매핑) | `?status=save:422` — 단, `dev.ts` 의 `STATUS_MESSAGE` 는 `violations` 를 싣지 않아 **필드 인라인 경로는 이 스위치로 재현되지 않는다**(`cause.violations.length > 0` 조건 — `useCrudForm.ts:176`). 실제 백엔드 또는 픽스처 확장이 필요 |
| EXC-03 (403 강등) | `?status=save:403` · `?status=delete:403` |
| EXC-06 (status별 surface) | `?status=save:409` · `save:422` · `save:500` 이 각각 다른 surface 를 그리는지 |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fsupport%2Freplies&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — 폼 배너에 reference 가 뜨면 pass. `?status=delete:500` 은 reference 없음 |
| STATE-02 | `?fail=list` — 인라인 danger Alert + 다시 시도 |
| FEEDBACK-02 | `?fail=delete` — 다이얼로그 유지 + 배너 + 재클릭 retry |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다. 다만 **abort 경로(EXC-09) 재현에는 이 400ms 창이 필요**하다 — 그 안에 다이얼로그를 닫아야 한다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · COMP-06 · A11Y-11 · A11Y-12 · ERP-13 판정) · RTL(A11Y-11 의 describedby↔alert id 일치 · STATE-04 의 선택 잔존 재현) · `_shared/domain.test.ts`(`searchTemplates`·`templatesForCategory`·`applyTemplate` 순수 규칙 회귀 — **이 화면에 컴포넌트 테스트는 없다**. `CrudTable.test.tsx`·`useDebouncedSearch.test.tsx`·`useListState.test.tsx`·`useModalDirtyGuard.test.tsx` 가 공용 프레임워크를 덮는다).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 폼 modal 부재 — IA-06 의 의도된 선택 · A11Y-12 토글 필터 부재)
- [x] §2.1 산수 검산 — 13 pass + 10 종속 + 2 n-a + 5 gap = **30** ✓
- [x] **판정 기준일을 `2026-07-17 · HEAD = a5c2639` 로 갱신하고 PR #22·#24·#26·#28·#30·#32·#34 이후 코드로 P0 30건을 전수 재확인했다. 이번 기준 갱신으로 뒤집힌 판정은 없다 — §2.1 건수 불변.** MOTION-01/02 는 **근거 텍스트만** 갱신했다(오버레이 모션이 CSS-only 로 구현됐다 — `Modal.css:126-168` · `Toast.css:109-141`; **'라이브러리 0건이라 gap 일 가능성' 추정을 삭제**했다). **이 화면은 `useModalDirtyGuard` 소비가 0건이라 DS Modal 의 `closingRef` latch 결함**(NFR-027 §2 FEEDBACK-06)**에 노출되지 않음을 확인**했다. **MOTION-03 의 `ToggleSwitch` 는 이 화면에 없다**(그 DS gap 자체도 `ToggleSwitch.css:79-84` 로 해소됐다). 아래는 직전 기준(`4b805ad`)의 재확인 결과이며 그대로 유효하다: 뒤집힌 P0 **2건**(COMP-10 · IA-13 — 둘 다 이 화면이 F3b 의 `useListState`/`useDebouncedSearch` 를 실제로 소비한 결과)을 pass 로 올리고 §2.1·§5 를 함께 갱신했다. **P1 2건도 pass 로 전환**(ERP-13 · EXC-12). **EXC-04 는 유령 저장/삭제만 닫히고 동시성 토큰이 남아 gap 을 유지했다** — 좁혀진 gap 을 pass 로 올리지 않았다. **STATE-04 는 여전히 gap 이고, F3b 가 선택 상태를 두 벌로 만들면서 사유가 더 분명해졌다**
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·날짜범위·금액·CSV·좌측 필터)은 적지 않았고, 표면이 없는 것(A11Y-05·IA-11·ERP-01)은 `n-a` 로 사유를 댔다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`support-templates`)와 op 4종을 **`createStoreAdapter` 코드에서 확인**했고(BE-026 의 3종과 다른 이유도 밝혔다), **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-028 §7 · BE-028 §7.11 과 일치한다
- [x] **공용 프레임워크 결함**(`createStoreAdapter` 가드 부재 · `CrudTable` 스켈레톤/순번 · 조사 폴백)과 **이 화면 고유 결함**(선택 해제 · 디바운스 · URL state · 본문 필수 마커)을 §5 의 '범위' 열에서 갈랐다
