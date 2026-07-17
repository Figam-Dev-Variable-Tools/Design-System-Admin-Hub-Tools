---
id: NFR-041
title: "상품 비기능 명세"
functionalSpec: FS-041
backendSpec: BE-041
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-041. 상품 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-041 상품 (`/products` · `/products/new` · `/products/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-041(요소·예외) · BE-041(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-041 §7 · BE-041 §7.15 와 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **1건 — A11Y-11 `gap` → `pass`**(PR #30 이 DS `ImageUploadField` 를 고쳤다 · §2). 화면 코드는 0줄 바뀌지 않았다. 그 밖에 이 화면의 표면이 바뀐 것은 상세설명 입력이 `TextareaField` → `RichTextField`(Tiptap)로 교체된 것(PR #24)인데 **P0 판정을 뒤집지는 않았다** — §3 COMP-12(P2)의 사유만 바뀌었다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **공용 프레임워크(`shared/crud` 등)를 소비해 충족하는 경우도 '직접'이다** — 그것을 쓸지 말지가 이 화면의 결정이기 때문이다(같은 프레임워크를 쓰지 않아 gap 인 화면이 실재한다 — FS-026) |
| 적용 `상속` | AppShell·DS(`@tds/ui`)가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**목록형 + 리치 폼**이다. `/products` 는 좌측 2축 필터 + 검색 + 선택/일괄삭제 + 인라인 토글을 갖는 목록이고, `/products/new`·`/products/:id/edit` 는 6개 섹션 카드 + 실시간 미리보기를 갖는 2열 폼이다. **공용 CRUD 프레임워크를 거의 전량 소비한다** — `useCrudList`(목록·삭제·일괄) · `useCrudForm`(폼) · `useCrudRowUpdate`(토글) · `useListState`(URL) · `useDebouncedSearch`(IME) · `createStoreAdapter`(404·409·멱등) · `CrudListShell`/`CrudTable`(껍데기) · `Empty`(3분기). 그 결과 **F3a/F3b/통합이 프레임워크에 심은 계약을 대부분 상속한다** — STATE-01·STATE-02·COMP-10·IA-13·EXC-08·EXC-09 가 이 화면에서 pass 인 이유가 그것이다.

**남은 P0 gap 5건은 프레임워크가 아직 답하지 않은 자리에 몰려 있다**: 쓰기 게이팅(EXC-03 — 훅은 있는데 이 화면이 `canCreate` 만 꺼낸다) · 동시성 토큰(EXC-04 — 타입에 필드가 없다) · 페이지네이션(IA-04 — 껍데기에 없다) · sub-route 제목(IA-02 — 앱 전역 모델) · `ImageUploadField` 의 `aria-required`(A11Y-11 — DS 계약).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 목록이 `useCrudList` 를 쓰고 그 훅이 `firstLoading = isFetching && data === undefined`(`useCrudList.tsx:71`)와 `refreshing = isFetching && data !== undefined`(`:72`)를 **분리해** 파생한다. `CrudListShell` 이 스켈레톤에 `firstLoading` 만(`:138` `loading={firstLoading}` → `CrudTable.tsx:143`), 요약에 `aria-busy={refreshing}` + `' · 새로고침 중…'`(`:118-122`)을 준다 — **재조회 중 건수가 사라지지 않고 이전 행이 유지된다**(`useCrudListQuery` 의 `placeholderData: (previous) => previous` — `crud.ts:254`). 성공·0행은 `Empty`, read 실패는 `Alert` 로 **네 상태가 서로를 침범하지 않는다**. 폼도 `loadingDetail = isEdit && detailQuery.isFetching && detailQuery.data === undefined`(`useCrudForm.ts:136`) | `/products` 진입 → 데이터 렌더 확인 → 좌측 필터 클릭(재조회 유발) 또는 `staleTime` 30초 경과 후 재진입. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** 0행 필터로 `Empty` 만, `?fail=list` 로 `Alert` 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** read 실패 **세 갈래가 전부 인라인 danger Alert + 재시도**다: ① 목록 — `CrudListShell.tsx:157-164` `<Alert tone="danger">` + '다시 시도'(`refetch`) ② 카테고리 선택지 — `ProductFilterPanel.tsx:99-108` `role="alert"` + '다시 시도'(별개 요청이라 별개 복구 경로) ③ 폼 상세 — `ProductFormPage.tsx:325-347` `<Alert tone="danger">` + 404/error 분기. **read 실패로 error toast 를 쓰는 경로가 0건**이고 empty 로 폴백하지 않는다(`error !== null` 이면 표 자체를 그리지 않는다 — `CrudListShell.tsx:113`) | `?fail=list` → 목록 배너 + '다시 시도'. `?fail=products:detail` 로 `/products/prd-1/edit` → 폼 배너. **토스트가 뜨거나 '상품이 없습니다' 가 뜨면 gap.** 카테고리 실패는 목록·필터가 같은 scope+op(`products`/`list`)를 공유해 함께 실패한다(§6) | **pass** |
| STATE-04 | STATE | 직접 | **(b) 절 충족 · (a) 절은 표면 부재.** (b) **숨겨진 행의 선택 해제** — `ProductListPage.tsx:149-151` `useEffect(() => { clear(); }, [category, status, keyword, clear])` 가 카테고리·판매상태·검색어 변경 시 선택을 지운다. 화면에 없는 행이 선택된 채 '선택 3건 삭제' 가 되지 않는다. (a) **page clamp** — **페이지네이션이 없어 page 가 범위를 벗어날 수 없다**(`CrudListShell` 이 `visibleItems` 전량을 렌더). `useListState.clampPage`(`useListState.ts:217-223`)가 존재하나 이 화면은 부르지 않는다 — 부를 대상(`totalPages`)이 없다. **이 칸의 '표면 부재'가 페이지네이션 부재를 면제하지 않는다 — IA-04 가 그것을 gap 으로 잡는다** | 검색어를 넣고 행 3개를 선택 → 좌측 카테고리 필터 클릭. **선택이 남아 있으면 gap.** 페이지네이션 도입 시 (a) 절 판정을 다시 매긴다 | **pass** |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/products/{items,_shared}/**` 에 primitive tier 밖 `#hex` · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 9)`(`ProductListPage.tsx:62`) 같은 space 토큰 배수로만 표현한다. **단 `opacity: 0.55` 매직 넘버가 2건**(`ProductCardPreview.tsx:76,183`) — 그것은 TOKEN-01 이 아니라 **TOKEN-07(P1)** 의 축이다(§3) | `grep -rnE "#[0-9a-fA-F]{3,8}\b\|[0-9]+px\|: *(thin\|medium\|thick)" apps/admin/src/pages/products/items apps/admin/src/pages/products/_shared` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`ProductFormPage.tsx:358,391,414,431,602` · `ProductFilterPanel.tsx:89,117,147` · `ProductOptionMatrix.tsx:157,167,184,249,261,275`) · DS `<Button>`·`<SelectField>`·`<SearchField>`·**`<RichTextField>`**·`<ToggleSwitch>`·`<ImageUploadField>`. **이 화면이 `:focus-visible` outline 을 직접 선언하지 않는다** — 두께 계약은 `ui.css`/DS 가 소유 | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `CrudTable.tsx:148`) · Toast(삭제·토글·저장 성공) · `ToggleSwitch.css:32,56` 의 `transition: … var(--tds-motion-duration-fast)` · DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(폼 섹션 카드 6개 + 미리보기 카드) · Modal(삭제·일괄삭제·충돌·이탈 가드 ConfirmDialog) · Toast. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | **충족.** 폼 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`ProductFormPage.tsx:362`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)를 참조한다(`shared/ui/styles.ts:51-61`) — 값을 손으로 재현하지 않는다. 미리보기의 지배적 숫자(최종가)는 `--tds-typography-title-md-*`(`ProductCardPreview.tsx:113-118`), 카드 제목은 `CardTitle` → `cardTitleStyle` → title.md(`styles.ts:106-118`). **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/products/new` 의 '상품 등록' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | **충족.** `ProductListPage.tsx:266-273` 이 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 **공용 `useDebouncedSearch` 를 스프레드**한다(`useListState.ts:227-230` 경유). 그 훅이 세 절을 전부 인코딩한다: ① `onCompositionStart/End` 로 조합 판정 + **`onKeyDown` 이 조합 중 Enter 를 동기적으로 차단**(ref 로 판정 — state 는 다음 렌더라 늦는다 — `useDebouncedSearch.ts:60-71`) ② 250ms 디바운스 + 최소 길이 ③ **stale 응답 경합은 react-query 가 키워드를 쿼리 키에 넣어 이미 막는다**(`useDebouncedSearch.ts:15-19` 가 그 이유를 적는다). **완화 요인**: 검색이 클라이언트 필터라 애초에 네트워크가 안 나가지만, 요구의 본절('조합 중 커밋 금지')이 충족된 것이 판정 근거다 | `/products` 검색창에 IME 로 '패딩' 입력. **조합 중 '패ㄷ'·'패디' 가 URL `?q=` 나 표에 커밋되면 gap.** 조합 중 Enter 가 submit 하지 않는지, 완성 후 250ms 에 정확히 1회 커밋되는지 확인. `?q=패딩` 으로 새 탭을 열어 같은 view 가 재현되는지도 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **충족.** 파괴적/비가역 액션 셋이 전부 `ConfirmDialog` 로 게이트된다: 단건 삭제·일괄 삭제(`useCrudList.tsx:152-179` — `intent="delete"`) · 폼 이탈 파기(`useUnsavedChangesDialog` — `intent="discard"`). intent→tone/icon/label 은 DS 가 소유(`ConfirmDialog.tsx:6,126`). **busy 중 확인 버튼이 `disabled + aria-busy`('처리 중…')로 잠기고 취소는 살아 있다**(`ConfirmDialog.tsx:144,151-152`) — 그것이 abort 경로다. **실패 시 다이얼로그를 연 채 danger 배너**(`useCrudList.tsx:112` `setDeleteError` → `ConfirmDialog error`)를 보이고 재클릭이 retry. **cancel/Esc/dim 은 in-flight 요청을 abort 하고 pending state 를 리셋**한다(`useCrudList.tsx:86-92` — `abort()` + `mutation.reset()` + `setDeleteError(null)`) | 상품 행의 삭제 → `?fail=products:delete` 로 강제 실패. **다이얼로그가 배너와 함께 유지되고 재클릭이 retry 하면 pass.** in-flight(400ms 창) 중 Esc 로 닫아 false toast 없이 버튼 state 가 복원되는지 확인 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `ProductFormPage.tsx:282` 가 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `isDirty` 는 RHF `formState.isDirty`(`useCrudForm.ts:261`). 3경로는 훅이 소유한다: beforeunload(`:127`) · **앱 내 링크 capture 가로채기**(`:151` — `target` 이 `''`/`_self` 이고 좌클릭·수식키 없음일 때만 — `:51,57-60`) · popstate sentinel(`:178`). 저장 성공 시 `onSuccess` 가 **`saving` 이 아직 true 인 채로** `navigate(listPath, { replace: true })` 하므로(`useCrudForm.ts:217-224`) `isDirty && !saving` 이 false → 가드가 발화하지 않는다 | 폼에서 상품명 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로'(FS-041-EL-019)·'취소'(EL-031)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — **훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다**(FS-041 §7 #8 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 상품은 리치 엔티티라 IA-06 의 무게 규칙대로 **전용 form route**(`/products/new`·`/products/:id/edit`)를 쓴다. 존재하는 modal 넷(단건 삭제·일괄 삭제·충돌·이탈 파기)은 전부 **입력 필드가 없는 확인 다이얼로그**다. (자매 화면 FS-042 는 taxonomy 엔티티라 modal 폼을 쓰고 거기서는 이 요구가 실재한다 — NFR-042) | 이 화면에 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 4종: 단건 삭제 성공(`useCrudList.tsx:108`) · 일괄 삭제 성공(`:146`) · 전시 토글 성공/실패(`useCrudRowUpdate.ts:49,53`) · 폼 저장 성공(`useCrudForm.ts:222`). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다. **별개로 이 화면의 목록에는 껍데기가 소유한 항상-마운트 live region 이 하나 더 있다**(`CrudListShell.tsx:107-109` — 그것은 A11Y-16 축이며 여기 판정 대상이 아니다) | ToastProvider 판정에 종속. 이 화면에서는 네 토스트가 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 4종(FEEDBACK-02 와 같은 노드 + `FormConflictDialog`). `aria-describedby`→message 배선은 DS `Modal`(`Modal.tsx:158` `aria-describedby={describedBy}`)/`ConfirmDialog`(`:129` — 본문 메시지 id 를 Modal 에 연결)가 소유한다 | DS 판정에 종속. 이 화면에서는 삭제 다이얼로그 open 시 `'<상품명>'을 삭제합니다…` 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족 — 3절 전부.** ① **`aria-describedby` 없는 `aria-invalid` 0건** — 이 화면의 `aria-invalid` 히트가 **전부 같은 요소에 `aria-describedby={errorIdOf(...)}` 를 짝으로** 세운다 — 화면 직접 10곳(`ProductFormPage.tsx:396,419,436,456` · `ProductPricingCards.tsx:88,117,190,215,292,316`) + DS 내부(`RichTextField`·`ImageGalleryField`). `FormField` 가 `<p id={errorIdOf(htmlFor)} role="alert">` 를 렌더하고(`FormField.tsx:110`) id 가 일치한다. **★ 상세설명이 `TextareaField` → `RichTextField` 로 바뀌었어도 이 축은 유지된다 — 오히려 더 엄밀해졌다**: `RichTextField.tsx:197-198` 이 `invalid = error !== undefined && error !== ''` · `describedBy = invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined` 로 파생해 **요구가 명시한 'hint 는 valid 일 때만 `hintIdOf` 로 연결' 절까지 정확히 구현한다.** 그 값은 Tiptap `editorProps.attributes`(`RichTextFieldEditor.tsx:116-124`)로 실제 편집 표면에 실린다 — `role="textbox"` · `aria-multiline="true"` · `aria-required`(required 일 때만) · `aria-invalid`(invalid 일 때만) · `aria-describedby`(있을 때만). **소스에 `aria-invalid` 문자열이 안 보인다고 미배선으로 판정하면 안 된다** — 속성은 에디터 인스턴스에 주입되며, `RichTextField.tsx` 만 grep 하면 0건으로 보인다(정의는 `RichTextFieldEditor.tsx` 에 있다). ② **required 주입** — `FormField required` 호출부 9곳의 자식이 전부 `input`(6) 또는 DS `SelectField`(2·`product-category`/`product-sale-status`)라 `withAriaRequired` 가 `aria-required` 를 런타임 주입한다(`FormField.tsx:36-41,50-56`). **③ 대표/상세 이미지도 이제 닿는다 — 단 `aria-required` 가 아니라 접근성 이름으로.** 구 기준(`4b805ad`)에서 이 절이 유일한 gap 사유였으나 **PR #30 이 DS 층에서 해소했다**(이 화면 코드 0줄 변경). `ImageUploadField`(`ProductFormPage.tsx:551-554`)는 여전히 `FormField` 로 감싸이지 않지만, `requiredNameSuffix(required)`(`ImageUploadField.tsx:55`, export `index.ts:2`)가 드롭존 `<button>` 의 `aria-label` 에 `' (필수)'` 를 붙인다(`:250`). **`aria-required` 를 안 쓴 것은 미비가 아니라 설계다** — AT 에 보이는 컨트롤이 `role=button` 인데 `aria-required` 는 그 role 이 지원하지 않는 속성이라(ARIA 1.2) 얹으면 거짓 시맨틱이자 axe `aria-allowed-attr` 위반이고, 진짜 파일 `<input>` 은 `aria-hidden tabIndex={-1}` 이라 그쪽에 줘도 아무에게도 닿지 않는다(근거 `:44-54`). 상세 이미지 갤러리도 같은 유틸을 쓴다(`ImageGalleryField.tsx:237`, import `:14`) — **빈 드롭존에만** 붙이고 '이미지 추가' 버튼에는 생략하는데, 타일이 하나라도 있으면 '최소 한 장'이 이미 충족이기 때문이다(`:234-237, 275-277`) | `grep -n "aria-invalid" apps/admin/src/pages/products/items -r` → 각 히트마다 같은 요소에 `aria-describedby` 가 있는지(현재 12/12 ✔). RTL 로 `/products/new` 를 열어 `screen.getByRole('button', { name: /대표 이미지 \(필수\) 이미지 업로드/ })` 가 잡히는지 assert → **이름에 '(필수)' 가 없으면 gap**(현재 있다). 대조군으로 `product-name` input 의 `aria-required === 'true'` 확인. **`aria-required` 로 재현하려 들지 말 것** — 이 표면은 의도적으로 그 속성을 쓰지 않는다 | **pass** |
| A11Y-12 | A11Y | 직접 | **충족.** 좌측 필터 list item 이 **`aria-pressed` 하나로만** 선택 상태를 말한다 — `ProductFilterPanel.tsx:91`(전체 카테고리) · `:118`(카테고리 항목) · `:149`(판매상태 항목). **`pages/products/**` 전체에 `aria-current` 0건**(grep 확인 — 유일한 히트는 `ProductFilterPanel.tsx:5` 의 '금지' 주석이다). 공유 `filterItemStyle(active)` 을 소비한다 | `grep -rn "aria-current" apps/admin/src/pages/products/` → **주석 1건 외 0건이어야 한다.** 모든 `filterItemStyle` 버튼에 `aria-pressed={active}` 가 있는지 | **pass** |
| MOTION-01 | MOTION | 상속 | Modal 표면 4종(FEEDBACK-02 와 같은 노드 + `FormConflictDialog`). enter/exit 애니메이션은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다. (구 기준의 'Motion/AnimatePresence 0건이라 소유 문서에서 gap 일 가능성' 추정은 낡았다 — **오버레이 모션은 구현됐고, 라이브러리가 아니라 CSS-only 다**: backdrop fade `Modal.css:20-21,30-33` + dialog scale 0.96→1 `:58-59,35-38`, reduced-motion 게이트 `:173-180`. 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd` 로 동등 달성한다(`Modal.tsx:216-218`). **다만 애니메이션되는 닫힘은 Modal 소유 3경로뿐**(Esc·딤·×)이라 **이 화면의 4개 modal 이 쓰는 footer 버튼 경로는 여전히 즉시 언마운트된다** — `Modal.tsx:27-31` 이 명시) | DS Modal 판정에 종속 — 라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫이다 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 4종(A11Y-01 과 같은 노드). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유하며 **완전 구현됐다** — `.tds-toast--exiting`(`Toast.css:32-37`) + keyframes `:121-131`(opacity 1→0, `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}` 로 요구 문구를 정확히 충족한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스 · Toast · Modal · DS Button transition · **`ToggleSwitch` — 이 화면에 3종이 실재한다**(목록 전시 토글 · 폼 전시/과세 토글 · 옵션 매트릭스 품절 토글). **구 기준(`4b805ad`)의 「`ToggleSwitch.css:56` 에 reduced-motion off 가 없다」는 낡았다 — 게이트가 실재한다**: `ToggleSwitch.css:79-84` 가 `.tds-toggle__track, .tds-toggle__knob { transition: none; }` 로 끈다. 남은 transition 선언 둘(`:32` 트랙 `background-color` · `:56` 손잡이 `transform`)을 **그 게이트가 모두 덮는다.** 근거 주석 `:76-78`: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향을 주는 반면 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 정보 손실이 0 이다 — 즉시 최종 위치로 스냅한다. **이 화면 표면에서 발현되던 위반은 해소됐다.** **이 화면이 transform/transition 을 직접 선언하지 않으므로**(grep 0건) 판정과 수선은 여전히 DS 가 소유한다 | 전역 motion config·`ToggleSwitch.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인. (재현: `emulateMedia({ reducedMotion: 'reduce' })` 로 `/products` 의 전시 토글을 눌러 handle 이 **미끄러지지 않고 스냅하는지**) | **종속** |
| IA-01 | IA | 직접 | **충족.** 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:226-228` — `/products` · `/products/new` · `/products/:id/edit`). **세 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={layoutStyle}>`(`ProductListPage.tsx:280` — 좌필터/우목록 2열 그리드) · `<div style={pageStyle}>`(`ProductFormPage.tsx:350`)다 | 세 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족 — 사유가 F2 대비 바뀌었다.** **목록은 pass**: `/products` 는 nav 잎(`nav-config.ts:146`)이라 `findCoveringLeaf` 가 자기를 찾고 AppHeader h1 = '상품'(`AppHeader.tsx:92,101`), 화면에 in-content `<h1>` 이 없다 → **h1 정확히 1개**. **폼이 gap**: `/products/new`·`/products/9/edit` 는 잎이 아니지만 **통합의 `findCoveringLeaf` 가 '자기를 감싸는 가장 긴 잎'을 찾아 `/products` 로 해석**하므로(`nav-config.ts:269-279`) AppHeader h1 = **'상품'** 이다 — **F2 의 가지 라벨 폴백('상품 관리')은 해소됐다.** 남은 두 가지: ① **`<h1>` 이 2개다** — AppHeader(`:101`) + `ProductFormPage.tsx:362` `<h1 style={pageTitleStyle}>{isEdit ? '상품 수정' : '상품 등록'}</h1>` ② **'등록/수정' 행위가 AppHeader 에 없다** — `nav-config.ts:293-295` 가 '등록/수정 같은 **행위**는 제목에 넣지 않는다(그 문구는 nav 에 없고, 여기서 지어내면 레이아웃이 카피를 발명하게 된다)' 고 **의도적으로** 정했다. 그래서 요구가 예시로 든 '{엔티티} 등록' 형태의 primary title 이 AppHeader 에 없고, **title 소스 모델이 목록(AppHeader) vs 폼(둘 다)으로 여전히 모순**이다 — 요구의 본문이 지적하는 바로 그 상태 | `/products/new` 진입 → `document.querySelectorAll('h1').length` 가 **2 이면 gap**(현재 2). AppHeader 의 가시 h1 이 '상품'(잎 라벨)이고 '상품 등록'이 아님을 확인. 대조: `/products` 는 `length === 1` 이라 pass | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 row(검색 좌측 + primary '상품 등록' **우상단** — `ProductListPage.tsx:263-277`) → 결과 count 요약(`CrudListShell.tsx:115-123`) → SelectionBar(`:125-133`) → table(`:135-154`). **미충족: Pagination 이 없다.** `CrudListShell` 이 `visibleItems` 를 그대로 `CrudTable` 에 넘기고 `CrudTable.tsx:171` 이 `items.map(...)` 으로 전량을 렌더한다 — **앱의 `<Pagination` 소비자 11파일에 이 화면이 없다**(grep 확인: members·admins·content{banners,faq,notices,popups}·login-history·logs·stats — 상품 없음). 상품은 상한 없이 늘어나는 컬렉션이라 'page size 초과 가능'이 확실하다(BE-041 §7.6) | 픽스처를 20건 이상으로 늘리고 `/products` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap.** `grep -rln "<Pagination" apps/admin/src/pages/products/` → 0건 | **gap** |
| IA-05 | IA | 직접 | **충족.** `/products/new` 와 `/products/:id/edit` 가 **같은 컴포넌트**로 해석된다(`App.tsx:227-228` — 둘 다 `<ProductFormPage />`). 레이아웃은 동일하고 `isEdit = id !== undefined`(`useCrudForm.ts:75`)가 **title 과 prefill 만** 가른다: 제목 `'상품 수정' : '상품 등록'`(`ProductFormPage.tsx:362`) · 제출 라벨 `submitButtonLabel(saving, isEdit)` · 수정이면 상세를 불러와 `reset(toValues(item))`(`useCrudForm.ts:131-134`). **create 전용/edit 전용 page 가 따로 없다** | `/products/new` 와 `/products/prd-1/edit` 의 DOM 구조가 동일하고 제목·값만 다른지 확인. `grep -n "ProductFormPage" apps/admin/src/App.tsx` → 두 라우트가 같은 element | **pass** |
| IA-13 | IA | 직접 | **충족.** 카테고리·판매상태·검색어의 **단일 원천이 URL 쿼리스트링**이다 — `ProductListPage.tsx:122` `useListState({ filterDefaults: { category: 'all', status: 'all' } })` → `useSearchParams` 기반(`useListState.ts:22,87`). `?category=` · `?status=` · `?q=` 로 직렬화되고, **기본값과 같으면 URL 에서 지운다**(`:114-118` — 공유 링크가 짧아지고 '기본 상태'의 URL 이 하나로 정해진다). `replace: true`(`:125`)라 필터 조작이 history 를 쌓지 않아 **상세에서 Back 하면 그 URL(=필터)이 그대로 복원된다**. 손으로 고친 `?status=거짓말` 은 `parseFilter` 가 '전체'로 되돌린다(`:125-129`). **`sort`·`page` 는 이 화면에 표면이 없다**(정렬 UI 없음 · 페이지네이션 없음 — IA-04 gap) | `/products` 에서 카테고리='아우터' + 검색='패딩' 적용 → URL 이 `?category=outer&q=패딩` 인지 → 행 클릭으로 폼 진입 → 브라우저 Back. **URL 과 필터가 그대로 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` **바로 바깥**에 두는 `ErrorBoundary`(`AppShell.tsx:478-493` — 주석이 '[경계의 자리 — EXC-01] `<Outlet>` 바로 바깥이다' 라고 그 결정을 적는다) + `RouteErrorScreen`. 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → 세션 만료 통지 → 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장·삭제·토글 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fproducts&reason=session_expired` 로 가는지 확인. (미저장 폼 입력 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): **read 게이팅** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더한다. 라우트→리소스 파생이 '자기를 감싸는 **가장 긴 잎**' 규칙이라 `/products/9/edit` 도 `/products` 잎으로 덮이고(`route-resource.ts:32-35` → `nav-config.ts:269-279`), **`/products/categories` 는 더 긴 잎이라 별개 리소스로 갈린다**(`covers()` 가 세그먼트 경계에서만 매칭해 `/products` 가 `/products-archive` 를 삼키지 않는 것과 같은 규칙). 충족(직접): **create 게이팅** — `ProductListPage.tsx:119,255-261` 이 `canCreate` 로 '상품 등록' 버튼을 **렌더하지 않는다**(disable 이 아니라 부재). **미충족(직접): update·remove 게이팅이 없다.** `ProductListPage.tsx:119` 가 `useRouteWritePermissions()` 에서 **`canCreate` 만 구조분해**한다 — `canUpdate`/`canRemove` 를 묻는 곳이 이 화면에 0건이다. 결과: ① 행 수정·삭제 `RowActions` 가 무조건 렌더(`CrudTable.tsx:192-197`) ② 일괄 삭제 버튼 무조건 렌더(`CrudListShell.tsx:126-132`) ③ 전시 인라인 토글 무조건 렌더 ④ **`ProductFormPage` 가 권한을 아예 묻지 않는다** — read 전용 역할이 `/products/new` 를 deep-link 하면 완전한 폼과 '상품 등록' 버튼을 보고 누른다. 서버 403 은 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 뭉개진다(**다시 시도해도 영원히 실패할 문구** — BE-041 §7.9) | 권한 스토어에서 `products` 의 `update`·`remove` 를 끈 뒤 `/products` 진입. **행의 연필·휴지통이 그대로 보이면 gap.** `/products/new` 를 deep-link 해 폼과 저장 버튼이 보이는지도 확인. `create` 를 끄면 등록 버튼이 사라지는지(이쪽은 pass), `read` 를 끄면 403 화면이 뜨는지(pass) | **gap** |
| EXC-04 | EXC | 직접 | **미충족 — 그러나 F2 대비 절반이 해소됐다. 구분해서 적는다.** **해소된 절**: 어댑터가 공용 `createStoreAdapter`(`data-source.ts:20-27`)라 `update`/`remove` 가 **없는 id 에 `HttpError(409)` 를 던진다**(`crud.ts:219-221,232-234`). 그전에는 store 의 `map`/`filter` 가 **없는 id 를 조용히 지나치고 성공을 반환**해(`_shared/store.ts:642-652`) '저장했습니다' 토스트 + 목록 이동이 일어나는 **유령 저장(ghost saved)** 이었다. 소비 화면이 `useCrudForm` 의 409 다이얼로그를 이미 갖고 있어(`useCrudForm.ts:166-178` → `ProductFormPage.tsx:644` `FormConflictDialog`) **화면 코드 0줄로 복구 경로가 열렸다** — 입력 보존 + '최신 불러오기'/'닫기', **성공 토스트도 목록 이동도 없다.** acceptanceCheck 의 두 절이 이제 통과한다. **미충족 절(요구의 본문)**: **낙관적 동시성 토큰이 없다.** `Product` 에 `version`/`updatedAt`/`ETag` 필드가 **없고**(`_shared/store.ts:111-137` 전수 확인) 어댑터가 `If-Match` 를 보내지 않는다. 409 는 **'대상이 존재하는가'** 기반이므로 **둘 다 존재하는 동시 편집은 여전히 last-write-wins 로 덮는다** — 그것이 요구가 이름 붙인 'last-write-wins data loss' 그 자체다. **이 화면에서 특히 아프다**: `PUT` 이 전체 치환이라 A 가 덮는 것은 한 필드가 아니라 상품 전체(가격·재고·옵션·이미지)이고, 전시 토글조차 30초 낡은 목록 스냅샷 전체를 되돌려 보낸다(BE-041 §7.2·§7.4) | `?status=save:409` 로 폼 저장 → **conflict 다이얼로그가 뜨고 입력이 남고 이동이 없으면 그 절은 pass**(현재 그렇다). **토큰 절**: `grep -n "version\|updatedAt\|If-Match" apps/admin/src/pages/products/_shared/store.ts apps/admin/src/pages/products/items/data-source.ts` → **0건이면 gap**(현재 0건). 두 탭으로 같은 상품을 열어 A→B 순으로 저장하면 B 가 A 를 경고 없이 덮는다 | **gap** |
| EXC-08 | EXC | 직접 | **충족(폼 — 요구가 명시한 '생성' 경로).** ① **동기 제출 락** — `useCrudForm.ts:103` `submitLockRef` + `:201-202` `if (submitLockRef.current) return; submitLockRef.current = true;`. `disabled={saving}` 만으로는 RHF 의 **비동기 검증** 때문에 버튼이 실제로 disabled 되기까지 틈이 있는데(`:96-101` 이 그 이유를 적는다) ref 는 렌더를 기다리지 않아 그 틈을 닫는다. `onInvalid`/`onSettled` 가 락을 되돌린다(`:214,247`). ② **제출 시도 단위 멱등키가 mutationFn 밖에 있다** — `idempotencyKeyRef`(`:118-123`) → `variables`(`:228,235`) → `crud.ts:288,310` → 어댑터 `context.idempotencyKey` → **`createStoreAdapter` 의 멱등 원장이 재생한다**(`crud.ts:200-203,208`). react-query 재시도가 **같은 variables 로** mutationFn 을 다시 부르므로 키가 재사용된다(`crud.ts:270-280` 이 그 이유를 적는다). 성공해야 키를 버린다(`useCrudForm.ts:220`). 원장은 **적용에 성공한 뒤에만 기록**해(`crud.ts:52-72`) 실패한 첫 시도가 키를 태워 재시도를 영영 no-op 으로 만들지 않는다. **잔여(요구의 '모든' 절)**: 삭제 확인 버튼에 동기 락이 없고(`ConfirmDialog` 의 `busy` 는 리렌더 후에야 잠긴다), `DeleteVars`(`crud.ts:319-322`)·`useCrudRowUpdate`(`:45`)에 **멱등키 자리가 없다**. 다만 삭제는 본질적으로 멱등이고 토글은 `run` 이 이전 요청을 abort 하므로(`useCrudRowUpdate.ts:39`) acceptanceCheck 의 두 절('submit 더블클릭이 1개 요청' · '재시도가 같은 키 재사용')은 통과한다 — **잔여는 §5 #11 로 이관** | 폼에서 '상품 등록' 을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀 + Enter 연타). **요청이 2건 발사되면 gap.** `?fail=products:save` 로 실패시킨 뒤 재시도해 **같은 키가 재사용되는지**(원장이 재생하는지) 확인. `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/shared/crud/useCrudForm.ts` → 둘 다 실재 | **pass** |
| EXC-09 | EXC | 직접 | **충족.** 세 경로 전부에서 abort 가 non-failure 다. **폼**: `useCrudForm.ts:161` `if (isAbort(cause)) return;`(토스트·배너 없음) · `:218` `if (controller.signal.aborted) return;`(취소된 요청의 성공 콜백이 토스트·이동을 일으키지 않음) · `:93` 언마운트 abort. **삭제**: `useCrudList.tsx:111` `if (isAbort(cause)) return;` · `:87-89` `closeDelete` 가 `abort()` + `mutation.reset()`(**isPending 리셋**) · `:105` 성공 콜백의 aborted 가드. **일괄 삭제**: `settleAll` 이 `результ.status === 'rejected' && !isAbort(result.reason)` 만 센다(`bulk.ts:20`) — **abort 를 partial-failure count 에서 제외**한다. `crud.ts:352` `if (signal.aborted) return;` 로 취소 시 **list/cache 무변경**(무효화하지 않는다). **전시 토글**: `useCrudRowUpdate.ts:52` isAbort 가드 + `:56` aborted 면 pendingId 를 되돌리지 않는다 + `:36` 언마운트 abort. 전부 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다 | 삭제 다이얼로그를 열고 확인 → **진행 중(400ms 창) Esc 로 닫기.** error toast 없이 버튼 state 가 복원되면 pass. 폼 저장 중 사이드바로 이탈 → 토스트가 뜨지 않아야 한다. 일괄 삭제 중 닫으면 실패 건수가 0 이어야 한다 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **15** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-02 · FEEDBACK-04 · A11Y-11 · A11Y-12 · IA-01 · IA-05 · IA-13 · EXC-08 · EXC-09 |
| `종속` | **10** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **1** | FEEDBACK-06 |
| `gap` | **4** | IA-02 · IA-04 · EXC-03 · EXC-04 |
| **합계** | **30** | 15 + 10 + 1 + 4 = **30** ✔ |

> **P0 gap 4건 — quality-bar '배치 실패' 사유.** 이 중 **IA-02**(앱 전역 title 모델)는 **화면 코드로 해소할 수 없다** — A40 선행이 필요하다. **EXC-03**(쓰기 게이팅)은 훅이 이미 있어 이 화면에서 즉시 해소 가능하다. **IA-04**(페이지네이션)·**EXC-04**(동시성 토큰)는 BE 계약과 함께 가야 한다(BE-041 §7.6·§7.2).
>
> **`a5c2639` 기준 갱신으로 뒤집힌 것 — A11Y-11 `gap` → `pass`.** 구 기준의 유일한 gap 사유였던 '대표 이미지의 required 가 AT 에 안 닿는다'를 **PR #30 이 DS 층에서 닫았다**(`requiredNameSuffix` — `ImageUploadField.tsx:55,250` · `ImageGalleryField.tsx:237`). **이 화면 코드는 0줄 바뀌지 않았다** — FS-039 의 A11Y-11 이 `FormField.withAriaRequired` 덕에 닫힌 것과 같은 모양이다. 해법이 `aria-required` 주입이 **아니라** 접근성 이름이었다는 점이 중요하다(§2 A11Y-11 행).
>
> **F2 대비 해소된 것(기록)**: STATE-01(`firstLoading` 파생) · STATE-05(공유 `Empty` 3분기) · COMP-10(`useDebouncedSearch`) · IA-13(`useListState`) · EXC-08(`submitLockRef` + 멱등키가 어댑터까지 도달) · EXC-04 의 **유령 저장 절**(`createStoreAdapter` 409) · IA-02 의 **가지 라벨 폴백 절**(`findCoveringLeaf`) · EXC-12(`HttpError(404)` → 404/error 분기). **이 화면은 F3a/F3b/통합이 심은 계약의 최대 수혜자다.**

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·날짜 범위·CSV 내보내기·Pagination range·sticky header·문서/PDF 등)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. 화면이 그 이득을 **버리지 않는다** — `refreshing` 이 요약에 `aria-busy` + ' · 새로고침 중…' 이라는 **가벼운 인디케이터**로만 나타난다(`CrudListShell.tsx:118-122`). full skeleton·empty flash 없음 | 데이터가 있는 상태에서 필터 변경 시 이전 행이 새 데이터 도착까지 유지되는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty`(`@tds/ui`)를 소비하고 **context 로 3분기**한다 — `ProductListPage.tsx:301-307` 이 `hasQuery`·`hasActiveFilters`·`onClearSearch`·`onResetFilters`·`createAction` 을 전부 넘긴다. 조사도 `Empty` 가 받침으로 고른다(`Empty.tsx:25,68`). 우선순위 검색 > 필터 > 진짜 비어있음(`:53-55`) | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기. 필터로 0건 → '필터 초기화'. 미시딩 → 등록 CTA | **pass** |
| STATE-06 | P1 | write 성공 시 정확히 무효화한다: `useCrudUpdate` 가 목록 + **그 항목의 상세**(`crud.ts:312-316`), `useCrudCreate`/`useCrudDelete`/`useCrudBulkDelete` 가 목록(`:291,332,353`). 전시 토글 후 목록 배지가 즉시 갱신된다. **단 일괄 삭제는 전원 성공에만 무효화**한다(`:353`) — 부분 실패 시 목록이 낡은 채 남는다(의도: 다이얼로그가 열려 있다) | 폼에서 가격을 고치고 목록 복귀 시 새 값이 보이는지 | **pass** |
| COMP-01 | P1 | 이 화면의 액션 버튼이 **전부 DS `<Button>`** 이다 — 등록(`ProductListPage.tsx:257`) · 취소/제출(`ProductFormPage.tsx:629,638`) · 재시도(`ProductFilterPanel.tsx:103` · `CrudListShell.tsx:160`) · 옵션 추가(`ProductOptionMatrix.tsx:198`) · 일괄 삭제(`CrudListShell.tsx:126`). **`pages/products/{items,_shared}` 에 `buttonStyle(`·`tds-ui-btn-` grep 0건.** **잔여 2곳**: `ProductFormPage.tsx:351-359` 의 '목록으로' 가 `<button className="tds-ui-focusable" style={backLinkStyle}>` 손조립(back-link 관례라 IA-07 축이다), `ProductOptionMatrix.tsx:182-191` 의 옵션 삭제가 `<button style={iconButtonStyle}>` 손조립(ghost icon 버튼 — 요구가 명시적으로 포함) | `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/products/items` → 0건(확인). 손조립 `<button>` 은 2곳 | **gap(경미)** |
| COMP-02 | P1 | 선택 셀이 DS `RowSelectCell`/`SelectAllHeaderCell`, 순번이 `SeqCell`/`SeqHeaderCell` 이다(`CrudTable.tsx:124-130,173-179`). raw `<input type=checkbox style={checkboxStyle}>` 0건 | selectable `*Table` 에 raw checkbox 선택 마크업이 0인지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 를 쓴다(`ProductListPage.tsx:266`). `pages/products/items` 에 `type="search"` grep 0건 | `grep 'type="search"' pages/products/items` → 0건 | **pass** |
| COMP-04 | P1 | zod-required 필드 9개가 전부 `FormField required` 로 `*` 마커를 렌더한다. **잔여 3곳이 bare 라벨**: 전시상태 토글(`ProductFormPage.tsx:481-491` `<span style={fieldLabelStyle}>`) · 과세 토글(`ProductPricingCards.tsx:126-136`) · 옵션 매트릭스 라벨(`ProductOptionMatrix.tsx:146`). **셋 다 required 가 아니라** 요구의 본절('required input 은 FormField 로')은 위반이 아니다 — 다만 표준 error slot 이 없다 | 모든 zod-required 필드에 인접 `*` 가 있는지 | **pass** |
| COMP-05 | P1 | 좌측 필터가 공유 `filterPanelStyle`/`filterNavStyle`/`filterListStyle`/`filterItemStyle` 을 import 한다(`ProductFilterPanel.tsx:11-20`). 동일 값의 로컬 wrapper/group 재선언 0건 — **파생만 한다**(`categoryListStyle = { ...filterListStyle, maxHeight, overflowY }` — `:29-33`, 스크롤은 이 화면 고유 요구) | 필터 파일에 gap space-5/space-2 를 재선언하는 로컬 CSSProperties 가 0인지 | **pass** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`). 셀 수만 `columns.length + 3` 으로 파생된다(`:113`). **페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다**(IA-04 gap 과 연동). 공유 `SkeletonRows(rows, cols)` helper 가 앱에 없다 | `grep "length: 5" shared/crud/CrudTable.tsx` → 1건. 0건이어야 한다 | **gap(공용 `CrudTable` 소관)** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | 마지막 컬럼이 요구의 (b) 분기('인라인 편집 테이블은 RowActions')를 정확히 따른다 — `CrudTable.tsx:192-197` `RowActions`(연필/휴지통). **중복 '상세' 버튼 없음**(FS-026 과 대조). 행 전체 클릭이 수정으로 가고(`:172` `rowActivateProps`) 그 목적지를 RowActions 의 연필이 겸한다 — 중복이 아니라 **키보드 등가물**이다(A11Y-08) | 읽기전용 리스트에 중복 '상세' secondary 버튼이 없는지 | **pass** |
| COMP-09 | P2 | 상품명·SKU·카테고리·브랜드 셀에 truncate 가 없다(`tdStyle`/`nowrapCellStyle` 그대로). 100자 상품명·40자 SKU 가 열을 넓혀 표 레이아웃을 민다. `nowrap` 열(SKU·카테고리)은 **줄바꿈 대신 열이 늘어난다** — 더 나쁘다 | 100자 상품명 픽스처로 표 폭이 유지되는지 | **gap** |
| COMP-11 | P1 | **표면 없음** — 기간 필터가 이 화면에 없다(상품에 등록일/수정일 필드 자체가 없다 — BE-041 §3) | — | **n-a** |
| COMP-12 | P2 | 상세설명이 `RichTextField maxLength={2000}` → `N/2000` 카운터를 갖는다(`RichTextField.tsx:210` → `FormField counter`). **'조용히 멈춘다' 던 구 사유는 사라졌다** — `maxLength` 는 이 컴포넌트에서 **아무것도 강제하지 않고**(절단·차단 없음) 상한 집행은 zod 단독이라(`items/validation.ts:107-111`), 초과하면 입력이 멈추는 대신 제출 시 **'상세설명은 2000자를 넘을 수 없습니다.'** 라는 특정 문구로 거절된다. **counting 기준 문제도 해소됐다** — `richTextLength`(평문 길이 · `RichTextField.tsx:121-123`)를 카운터와 검증이 **함께** 써서 화면의 `N/2000` 과 판정이 어긋나지 않는다(근거 `validation.ts:103-106`). **그러나 gap 은 유지된다 — 사유가 좁아졌을 뿐**: ① 상한 **근접 경고가 여전히 없다**(요구의 핵심 절) ② 상품명(100)·상품코드(40)·브랜드(40)는 **카운터조차 없고** `maxLength` 가 네이티브로 잘라 구 증상이 그대로다 | 2000자 근접 시 경고가 뜨는지. 상세설명은 초과 입력이 특정 메시지로 차단되는지(현재 ✔) · 상품명은 2000자 대신 100자에서 조용히 잘리는지(현재 잘린다) | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 정확히 일치한다: read 실패=인라인 Alert(3곳) · write 성공=toast(4곳) · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`useCrudList.tsx:112,139-141` — modal 뒤에 숨는 toast 를 쓰지 않는다) · 폼 저장 실패=폼 상단 배너(입력을 보존한 채 그 자리에서 재시도 — `FormServerError`). page 가 임의 배너 state 를 갖지 않는다. **전시 토글 실패만 toast** 인데 그 자리에 배너를 둘 곳이 없어(표 셀) 정당하다 | ConfirmDialog 내부 delete 실패가 다이얼로그 배너인지, read 실패가 인라인 Alert 인지 | **pass** |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 양 경로가 배선돼 있다: 단건 삭제(`useCrudList.tsx:104-113`) · 일괄 삭제(`:136-148`) · 전시 토글(`useCrudRowUpdate.ts:47-57`) · 폼 저장(`useCrudForm.ts:217-236`). **no-op 클릭이 없다** — `?fail=` 강제 실패가 언제나 사용자 가시 실패를 낸다 | `?fail=products:save` · `?fail=products:delete` 로 각 경로에서 가시 실패가 나오는지 | **pass** |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 가 소유(`Modal.initialFocusRef`). 이 화면은 intent 만 준다 | DS 판정에 종속 | **종속** |
| A11Y-05 | P1 | `SelectField isInvalid` 소비가 1곳(`ProductFormPage.tsx:449` `product-category`)이고 **호출부가 `aria-invalid` 를 직접 함께 준다**(`:451`) — DS 의 native override 경로를 태워 요구의 본절이 이 화면에서는 충족된다. `aria-describedby` 도 짝으로 있다(`:452-454`) | `<SelectField isInvalid />` 가 `<select aria-invalid='true'>` 를 렌더하는지 | **pass(이 화면 표면)** |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(**마우스 전용** — `<tr>` 에 tabIndex 없음, `useRowNavigation.ts:9-11` 이 그 전제를 명시)이고 상품명 셀이 링크가 아니다. **키보드 등가물은 RowActions 의 연필 버튼**(`CrudTable.tsx:192-197`, 접근 이름이 상품명에서 파생) — 행 클릭과 **같은 목적지**(`onEdit`)로 간다 → 요구의 본절('동일 타깃으로 향하는 row 내 keyboard-focusable 등가물') 충족. 다만 요구가 기대하는 형태는 'focusable **name link**' 다 | 행을 Tab 해서 행 클릭과 같은 폼을 여는 컨트롤에 도달하는지 | **pass** |
| A11Y-13 | P1 | **폼 진입 시 첫 필드 자동 포커스가 없다**(`ProductFormPage` 에 `setFocus`/`autoFocus` 0건). **검증 실패 시 첫 오류 필드 포커스는 충족** — `useCrudForm.ts:260` `form.handleSubmit(onValid, onInvalid)` + RHF `shouldFocusError` 기본값, 그리고 `:240-248` 이 그것을 **계약으로 고정**한다. 422 서버 오류도 `setFocus(first.field)`(`:190`). **잔여**: `ImageUploadField`·`ProductOptionMatrix` 의 오류는 RHF 필드가 아니라 포커스가 가지 않는다 | 빈 required 로 submit → `document.activeElement` 가 `product-name` 인지(✔). 폼 진입 시 첫 필드 포커스인지(✕) | **gap(부분)** |
| A11Y-16 | P1 | 대부분 충족: 표 `aria-busy` + caption(`CrudTable.tsx:116-120`) · 필터 `aria-label`(`ProductFilterPanel.tsx:82,131`) · 항상-마운트 live region(`CrudListShell.tsx:107-109`) · `role="alert"` 오류(`FormField.tsx:110` · `ProductOptionMatrix.tsx:308`) · `aria-pressed` 이중 인코딩 · `ToggleSwitch` 의 `aria-checked`/`aria-busy`/`disabled`(`ToggleSwitch.tsx:29-30`). **잔여**: 옵션 그룹 입력 3종이 `aria-label` 로만 라벨링돼 **가시 라벨이 없고**(`ProductOptionMatrix.tsx:162,172,187`), `ImageUploadField` 의 required 가 AT 에 닿지 않는다(A11Y-11 gap 과 같은 뿌리) | 신규 인터랙티브 표면이 role·keyboard·focus ring·label·live region·이중 인코딩을 충족하는지 | **gap(부분)** |
| MOTION-04 | P1 | **표면 없음** — 행 add/remove/reorder 애니메이션이 이 화면에 없다(재정렬 UI 자체가 없다). 삭제 시 행이 snap out 하는 것은 MOTION-04 가 다루는 축이나 **Motion 라이브러리 미도입**이라 앱 전역 gap 이며 이 화면 고유가 아니다 | `CrudTable` 행 delete 시 나머지가 매끄럽게 당겨지는지 | **gap(DS 선행)** |
| ERP-01 | P1 | status→tone 매핑이 **화면 전용 모듈의 단일 레지스트리**다 — `types.ts:16-20` `SALE_STATUS_OPTIONS` → `saleStatusLabel`/`saleStatusTone`, 목록(`ProductListPage.tsx:248-249`)과 미리보기(`ProductCardPreview.tsx:208`)가 같은 함수를 소비한다. per-page meta helper 를 만들지 않았다. **그러나 그것이 `pages/products/items` 지역이라** 견적/계약/문의/배송과 통합된 **앱 전역 레지스트리는 아니다** — 요구는 '공유 domain code 에 단일 status→tone 레지스트리' 를 요구한다. 게다가 카테고리 배지는 **id 해시로 톤을 배정**해(`types.ts:33-39`) status 축이 아예 아니다 | 하나의 export 된 map/함수가 status→tone 유일 소스인지. 앱 전역으로는 아직 아니다 | **gap(앱 전역)** |
| ERP-05 | P1 | **표면 없음** — 이 화면에 `<Pagination` 이 없다(IA-04 gap). range 표시·page-size selector 를 얹을 컴포넌트 자체가 없다. **`Pagination.tsx:112` 의 `showRange = pageSize > 0` opt-in 스위치를 이 화면은 켜지 못한다 — 소비자가 아니기 때문이다.** IA-04 해소 시 이 판정을 다시 매긴다 | Pagination 이 range 텍스트와 size selector 를 렌더하는지 | **n-a(IA-04 선행)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `shared/format`(`formatNumber`)을 경유한다. **잔여 2곳이 인라인 포맷**: `ProductCardPreview.tsx:13` `formatWon = value.toLocaleString('ko-KR')원` · `ProductOptionMatrix.tsx:304` `totalStock(...).toLocaleString('ko-KR')` | 날짜/숫자/금액이 shared/format 헬퍼를 경유하는지 | **gap(경미)** |
| ERP-07 | P2 | 판매가 셀이 숫자 열(우측 정렬 + tabular-nums)인데 **'원' 이 숫자에 붙어 있다**(`ProductListPage.tsx:196` `{formatNumber(final)}원`) — 단위가 마지막 자릿수를 따라다녀 다행 금액 컬럼의 수직 정렬을 깬다. 요구가 지적하는 바로 그 증상 | 금액 셀이 자릿수로 정렬되는지 | **gap** |
| ERP-08 | P2 | 대부분 `formatNumber` 를 경유한다(판매가·재고·건수·적립 미리보기). **잔여**: ERP-06 의 두 곳(`toLocaleString` 직접 호출). 상대시간·미래 timestamp 가드는 **표면 없음**(상품에 시각 필드가 없다) | 테이블 셀에 raw numeric toString 이 없는지 | **gap(경미)** |
| ERP-12 | P1 | **표면 없음** — 이 화면에 CSV/xlsx 내보내기 affordance 가 없다. `useRouteWritePermissions.canExport` 를 이 화면이 쓰지 않는다 | 필터된 결과 전체가 UTF-8 BOM Excel 로 나가는지 | **n-a** |
| ERP-13 | P1 | **리터럴 조사 폴백 0건**(grep 확인 — `pages/products/{items,categories,shipping}` 에 `이(가)`·`을(를)`·`은(는)`·`(으)로` 0건). 조사는 전부 `shared/format` 의 헬퍼가 받침으로 고른다: 삭제 토스트·확인 문구(`useCrudList.tsx:108,158` `objectParticle`) · 전시 토글 토스트(`ProductListPage.tsx:232-233` `objectParticle`) · 저장 토스트(`useCrudForm.ts:222`) · 검증 문구(`shared/crud/validation.ts:19-28,65-71`) · 빈 상태(`Empty.tsx:25,68` `subjectParticle`) | 사용자 대상 문자열의 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0 | **pass** |
| ERP-14 | P1 | 금액 필드 4종(판매가·할인값·배송비·적립액)이 **실시간 천단위 마스킹·붙여넣기 정규화가 없다** — `<input type="text" inputMode="numeric">` + `^\d+$` 검증뿐이다. 붙여넣은 '129,000' 이 '판매가는 숫자만 입력할 수 있습니다' 로 거절된다 — 요구가 지적하는 바로 그 증상. 사업자번호·전화번호·날짜 필드는 **표면 없음** | 금액 필드가 실시간 천단위 구분을 하는지, 붙여넣은 '1,234,000원' 이 1234000 으로 parse 되는지 | **gap** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다**(`CrudTable.tsx:171` `items.map`) — cap·virtualization 이 없다. 상품은 상한 없이 증가한다(BE-041 §7.6). **더 심한 곳이 하나 더 있다**: 옵션 매트릭스가 데카르트 곱을 전부 펼친다(3그룹 × 각 20값 = 8,000행 — `buildVariantMatrix`). 그 표는 `overflowX: auto` 컨테이너에 가둬 **가로 scroll 은 요구를 충족**하나(`ProductOptionMatrix.tsx:45-48,205`) 세로 cap 이 없다. 목록 표에는 가로 scroll 컨테이너도 없다(10컬럼) | 1,000건 픽스처로 scroll/검색이 매끄러운지. 8,000조합 옵션으로 폼이 살아 있는지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트·다이얼로그 닫기·토글 연타에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **폼은 충족, 나머지는 미충족.** 폼이 status 로 **네 갈래**로 가른다: 404(`ProductFormPage.tsx:325-347` 전용 문구 + retry 숨김) · 409/412(`useCrudForm.ts:166-178` conflict 다이얼로그) · 422+fields(`:182-191` 필드 인라인 + 포커스) · 그 밖(`:194-195` generic + reference). **그러나 목록·삭제·토글이 그 분기를 상속하지 못한다** — `useCrudList.tsx:112` 이 403/409/422/429/500 을 전부 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로, `useCrudRowUpdate.ts:53` 이 '변경하지 못했습니다…' 로 뭉갠다. **429·403 에 '잠시 후 다시 시도' 는 거짓 안내다** | `?status=save:422` vs `save:409` vs `save:500` 이 폼에서 다른 surface 를 그리는지(✔). `?status=delete:403` vs `delete:409` 가 다이얼로그에서 갈리는지(✕) | **gap(부분)** |
| EXC-07 | P1 | 서버 422 의 `error.fields` → RHF `setError` 경로가 **실재한다**(`useCrudForm.ts:182-191` — `cause.violations` 를 순회해 `setError(violation.field, { type: 'server', message })` + 첫 필드로 `setFocus`). 클라이언트 zod error 와 **같은 인라인 슬롯**(`FormField error`)을 재사용하고 form-level 배너는 generic 에만 쓴다. **어댑터가 422 를 `HttpError(422, …, { violations })` 로 변환하는 것이 전제**(BE-041 §6.1) | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지. **`?status=save:422` 는 `violations` 가 비어 있어**(`dev.ts:84`) 이 경로를 재현하지 못한다 — 코드 대조로 판정 | **pass(코드 대조)** |
| EXC-10 | P1 | 일괄 삭제가 `settleAll`(Promise.allSettled)을 쓰고 **abort 를 실패에서 제외**하며(`bulk.ts:19-20`) 전원 성공에만 invalidate + selection clear 한다(`crud.ts:353` · `useCrudList.tsx:144-146`). **그러나 실패한 id 를 반환하지 않는다** — `settleAll` 이 `number` 를 돌려주므로(`bulk.ts:17`) 화면은 건수만 안다. 재시도가 **전량을 재실행**한다(성공분 재요청). 실패 item 을 선택 유지하는 개념이 없다 | 부분 실패 bulk delete 가 실패 item 을 식별하고 'retry failed only' 가 그것만 재요청하는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 문구·복구 수단으로 가른다 — `ProductFormPage.tsx:325-347`: `not-found` → '상품을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + **'목록으로'만**(재시도해도 없다), `error` → '상품을 불러오지 못했습니다.' + '다시 시도' + '목록으로'. 판별은 `isNotFound(loadError)`(`useCrudForm.ts:143-149`)이고 **그것이 실제로 발현되는 이유는 `createStoreAdapter.fetchOne` 이 `HttpError(404)` 를 던지기 때문이다**(`crud.ts:192-194` — store 의 generic `Error`(`_shared/store.ts:630`)를 어댑터가 앞에서 가로챈다). 무한 spinner·crash 없음 | `/products/없는id/edit` 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음). `?status=detail:500` → retry + list 둘 다. **두 화면이 같으면 gap** | **pass** |
| EXC-13 | P2 | 전역 `retry: false` — transient 5xx 가 즉시 hard error 배너가 된다. backend seam 별 retry policy 가 없다 | backend mode 에서 transient 5xx 가 auto-retry 되는지 | **gap(앱 전역)** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 전시 토글도 삭제도 **비관적**이다(pending 잠금 → 성공 후 무효화). `onMutate`/`setQueryData` grep 0건. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라' 이므로 **위반 표면이 없다**. un-rolled-back optimistic write 0건. create/delete 는 confirm+busy 로 pessimistic 유지 — 요구가 명시적으로 권하는 형태 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-15 | P1 | **클라이언트 검증 충족** — `imageFileError(file, maxSizeMB)`(`ImageUploadField.tsx:37-41`)가 type·size 를 upload **전** 검증하고 invalid 를 인라인 `role="alert"` 로 거절(요청 미발사). **로드 실패 fallback 충족** — `ImageGalleryField.tsx:83` `role="img" aria-label` placeholder, `src` 변경 시 failed flag 리셋(`ProductCardPreview.tsx:167` · `ImageUploadField` 동일). **미충족: upload progress·cancel 경로가 없다** — 애초에 업로드하지 않기 때문이다(§4.3 알려진 빚) | 비-image/oversized 선택이 upload 없이 인라인 거절되는지. progress/cancel 이 있는지 | **gap(빚에 종속)** |
| EXC-16 | P2 | **표면 없음** — 이 화면이 localStorage/sessionStorage 를 직접 쓰지 않는다(권한 스토어는 `shared/permissions` 소관) | storage throw 가 앱을 crash 시키지 않는지 | **n-a** |
| EXC-17 | P2 | 사용자 대상 copy 가 whole string + named interpolation 이다(조사 헬퍼가 그것을 강제한다 — 문법 fragment 연결이면 받침 판정을 할 수 없다). 하드코딩 한국어이나 그것은 문서화된 수용 제약 | 신규 copy 가 fragment 연결이 아닌지 | **pass** |
| EXC-18 | P1 | selection scope 가 **current-page(=현재 보이는 행) 고정**이고 그 사실이 라벨에 있다 — `SelectAllHeaderCell label="이 페이지의 상품 전체 선택"`(`CrudListShell.tsx:125`), `toggleAll` 이 `visibleItems.map(id)` 만 받는다(`:143-148`). cross-page 'all' 이 없어 **오클릭 하나가 수천 건을 queue 하는 경로는 닫혀 있다**. 확인 문구가 count 를 echo 한다('선택한 상품 N건을…'). **미충족**: Shift-click range 선택·keyboard 등가물 없음 · 임계값 초과 강화 confirm 없음(type-to-confirm) · **장기 bulk 에 determinate progress·cancel 없음**(다이얼로그를 닫으면 abort 되지만 진행률이 보이지 않는다) | Shift-click 가 연속 range 를 선택하는지. 1,200-item bulk 가 progress 를 보고하고 cancel 되는지 | **gap** |
| EXC-19 | P1 | 401 리다이렉트가 **미저장 폼 입력을 버린다** — 프로그램적 navigate 라 FEEDBACK-04 가드가 발화할 수 없다. idle/expiry 경고·draft snapshot·autosave 가 없다. **이 화면에서 특히 아프다** — 상품 폼은 옵션 매트릭스·이미지·2,000자 설명을 담는 **장수명 폼**이다 | 세션 만료 후 재로그인 시 입력이 복원되는지 | **gap(앱 전역)** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보인다** — `FormServerError` 가 `errorReference` 를 '오류 코드 TDS-…' 로 렌더(`FormFeedback.tsx:44`), `useCrudForm.ts:195` `setErrorReference(referenceOf(cause))`. raw stack 노출 없음. **잔여**: 목록·삭제·토글 실패에는 reference 가 없다(고정 문구뿐) | `?status=save:500` 이 복사 가능한 reference code 를 보이는지(폼 ✔ / 삭제 ✕) | **pass(폼) · gap(그 외)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-041 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 저장 p95 | ≤ 700ms | 위와 동일 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시 — **충족** |
| **동시 쿼리 수(진입당)** | 목록 1 + 카테고리 1 = **2** | **충족**(`ProductListPage.tsx:132,141`). 폼도 상세 1 + 카테고리 1 = 2. **단 카테고리 쿼리가 목록·폼에서 같은 키라 캐시를 공유한다**(`[products,'category-options']`) — 폼 진입 시 재조회되지 않는다 |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · 커밋당 전량 3-pass | **충족(요청)** / **부분 충족(연산)** — 디바운스 250ms 가 **자모당 발생을 막지만**(COMP-10 pass) 커밋마다 `filterProducts`+`filterBySaleStatus`+`searchProducts` 3회가 전량을 훑는다. **연산량은 건수에 비례**한다 |
| 저장 요청 크기 | ≤ 64KB | **미충족 — 상한이 없다.** `ProductInput` 이 `variants` 전량(8,000조합 가능)·`imageUrls` 10개·2,000자 설명을 실어 보낸다. **전시 토글도 같은 크기다**(FS-041 §7 #27) — 한 boolean 을 바꾸려 상품 전체를 전송한다 |
| 메모리 | 목록 전량(전문) + 상세 1건 | 전량 보유. **목록이 상세 전문을 담는다**(옵션·이미지·설명 — BE-041 §7.6) |
| 번들 | 이 화면 고유 코드 ≤ 30KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:157-164`). **툴바·좌측 필터가 남아** 조건이 화면에서 사라지지 않는다 |
| 카테고리 선택지 조회 실패 (목록) | 별개 재시도 경로 | **충족**(`ProductFilterPanel.tsx:99-108`) — '전체 카테고리' 항목은 남아 화면이 죽지 않는다 |
| 카테고리 선택지 조회 실패 (폼) | 사용자가 원인을 안다 | **미충족** — `categoriesQuery.data ?? []` 만 읽어 **정상적인 빈 select 처럼 보인다.** required 라 저장이 막히는데 이유를 알 수 없다(FS-041 §7 #9) |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass — 폼) |
| 저장 실패(409) | conflict 다이얼로그 + 입력 보존 | **충족**(EXC-04 의 해소된 절) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| **동시 편집(둘 다 존재)** | 나중 저장이 앞선 수정을 덮지 않는다 | **미충족 — 전체 치환이라 상품 전체가 덮인다**(BE-041 §7.2). **이 화면 최대 위험** |
| **편집 중 팔린 재고** | 저장이 재고를 되살리지 않는다 | **미충족 — 과판매(oversell)가 난다**(BE-041 §7.4). 위와 같은 뿌리이나 `version` 토큰으로도 완전히 풀리지 않는다 |
| 전시 토글의 낡은 스냅샷 | 한 필드만 바뀐다 | **미충족** — 30초 캐시된 목록 스냅샷 전체를 되돌려 보낸다(BE-041 §7.4) |
| 세션 만료 중 작성 | 재인증 후 작성 내용 복원 | **미충족**(EXC-19 gap) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |
| 대량 일괄 삭제 | 429 없이 완주 | **미충족** — 선택 건수만큼 동시 발사가 EP-05 의 분당 60 상한을 넘긴다(BE-041 §7.13) |

### 4.3 이 화면이 답하지 못하는 운영 질문

| 질문 | 현재 답 |
|---|---|
| '지난주 대비 어떤 상품의 재고가 줄었나' | **답 없음** — 상품에 시각 필드(`createdAt`/`updatedAt`)가 없고 재고 이력도 없다 |
| '누가 이 상품의 가격을 바꿨나' | **답 없음** — 변경 이력·감사 로그가 이 도메인에 없다. 가격은 돈이다 |
| '이 상품이 언제 등록됐나' | **답 없음** — `Product` 에 `createdAt` 이 없다(BE-041 §3). 정렬 기준이 상품명 가나다뿐이라 '최근 등록순' 을 볼 수 없다 |
| '재고 부족 상품만 보기' | **답 없음** — `isLowStock` 은 셀 배지일 뿐 필터 축이 아니다. 좌측 필터는 카테고리·판매상태 2축뿐 |
| '이 카테고리를 지우면 어떤 상품이 고아가 되나' | 카테고리 화면이 **건수**는 답한다(FS-042). **어느 상품인지는 답하지 못한다** |

### 4.4 보존 · 감사

상품의 가격·재고·적립률은 **돈에 직결되는 값**이다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 가격·적립률 변경이 이력으로 남는다 | **미충족** — 변경 이력이 없다. 누가 언제 129,000 을 12,900 으로 바꿨는지 알 수 없다 |
| 재고 조정에 사유가 붙는다 | **미충족** — 재고가 폼의 일반 필드다(BE-041 §7.4 안 A 가 이를 뒤집는다) |
| 삭제된 상품의 주문 이력이 보존된다 | **미정** — `removeProduct` 가 무조건 filter 다(`_shared/store.ts:650-652`). 참조 무결성 검사가 없다(BE-041 §7.14). **소프트 삭제 경로(판매중지+숨김)가 이미 있는데 물리 삭제와 공존한다** |
| 상품 이미지가 보존된다 | **미충족(알려진 빚)** — `blob:` 값은 언마운트 시 revoke 되어 죽는다. **결함이 아니라 의도적으로 남긴 빚**이다: `ImageUploadField` 가 아직 업로드하지 않아 낼 수 있는 값이 `blob:…` 과 `''` 뿐이고, 스키마가 http(s) 를 강제하면 **등록 폼이 영영 제출되지 않는다**(`shared/crud/validation.ts:39-71` 이 이 판정을 길게 못박는다). 고칠 곳은 검증이 아니라 업로드 이음매다(`TODO(backend): POST /api/uploads` — 3곳) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | ~~A11Y-11 · A11Y-16~~ | ~~P0 · P1~~ | **(해소됨 — 기록)** 구 기준(`4b805ad`)의 '대표 이미지의 required 가 AT 에 닿지 않는다'는 **PR #30 이 DS 층에서 닫았다** — `requiredNameSuffix`(`ImageUploadField.tsx:55,250` · `ImageGalleryField.tsx:237`)가 드롭존의 **접근성 이름**에 `' (필수)'` 를 붙인다. 예상과 달리 해법은 `aria-required` 주입이 아니었다 — `role=button` 이 지원하지 않는 속성이라 얹으면 axe 위반이 된다(`:44-54`). **이관 불필요** | — | — |
| 2 | IA-02 | P0 | 폼에 `<h1>` 이 2개(AppHeader + 자체) + '등록/수정' 행위가 AppHeader 에 없다(의도적 — `nav-config.ts:293-295`). **가지 라벨 폴백은 통합이 해소했다** — 사유가 바뀐 gap | **앱 전역**(AppHeader·title 모델) | A40 · A11 |
| 3 | IA-04 · ERP-05 · ERP-15 · COMP-06 · COMP-07 | P0 · P1 · P2 | **페이지네이션 없음** — 전량 렌더. `SeqCell` 에 `startIndex` 없음(도입 시 발현) · 스켈레톤 `length: 5` · Pagination range/page-size 표면 부재 | 이 화면 + 공용 `CrudListShell`/`CrudTable` + BE 계약 | A11 · A63 (BE-041 §7.6 — IA-13 은 이미 충족돼 절반은 공짜) |
| 4 | EXC-03 | P0 | **쓰기 게이팅이 '등록' 버튼 하나뿐** — `ProductListPage.tsx:119` 가 `canCreate` 만 꺼낸다. 행 수정/삭제·일괄 삭제·전시 토글·폼 제출이 게이팅되지 않고, read 전용 역할이 `/products/new` 를 deep-link 하면 완전한 폼을 본다. **훅은 이미 있다 — 즉시 해소 가능** | 이 화면 + 공용 `CrudTable`/`CrudListShell`(권한 prop 이 없다) | A11 change_request |
| 5 | EXC-04 | P0 | **낙관적 동시성 토큰 없음** — `Product` 에 `version`/`updatedAt` 부재. 409 는 '존재 여부' 기반이라 **동시 편집은 last-write-wins**. 전체 치환이라 덮이는 것이 상품 전체다. **유령 저장 절은 `createStoreAdapter` 가 해소했다** | 이 화면 + 타입 + `WriteContext` + BE 계약 | A63 (BE-041 §7.2) · A11 |
| 6 | (§4.2 · BE-041 §7.4) | — | **편집 중 팔린 재고가 저장으로 되살아난다(과판매).** `version` 토큰으로도 완전히 풀리지 않는다 — 재고를 계약에서 분리해야 한다 | BE 계약 + 이 화면 | **A63 (BE-041 §7.4 — 최우선)** |
| 7 | (BE-041 §7.3) | — | **상품코드 전역 유일성 미검증** — 중복 검사가 한 상품의 variants 안에 갇혀 있다. 재고 집계·주문 매핑의 키가 겹친다 | BE 계약 + 이 화면 | A63 · A11 |
| 8 | (BE-041 §7.7) | — | **카테고리 선택지의 react-query 키가 두 벌**(`[products,'category-options']` vs `['product-categories','list']`) — FS-042 에서 카테고리를 바꿔도 무효화되지 않는다. **백엔드와 무관하게 지금 고칠 수 있다** | 이 화면 + FS-042 | A11 change_request |
| 9 | EXC-06 · EXC-20 | P1 | **목록·삭제·토글이 `useCrudForm` 의 status 분기를 상속하지 못한다** — 403/409/422/429/500 이 전부 '잠시 후 다시 시도해 주세요' 로 뭉개진다(429·403 에는 거짓 안내). reference code 도 없다. **폼은 pass** | 공용 `useCrudList`/`useCrudRowUpdate` | A11 change_request |
| 10 | EXC-10 · EXC-18 | P1 | 일괄 삭제가 **실패 id 를 반환하지 않고**(건수만) 재시도가 전량을 재실행. progress·cancel·Shift-click range 선택 없음. **선택 건수만큼 동시 발사가 429 를 부른다** | 공용 `bulk.ts`/`useCrudList` + BE 계약 | A11 · A63 (BE-041 §7.13) |
| 11 | EXC-08 (잔여) | P0 | **삭제 확인 버튼에 동기 락 없음** · `DeleteVars`/`useCrudRowUpdate` 에 멱등키 자리 없음. 폼은 pass(락+키 둘 다) — 잔여만 이관 | 공용 `useCrudList`/`crud.ts` | A11 |
| 12 | A11Y-13 (부분) | P1 | 폼 진입 시 첫 필드 자동 포커스 없음. **검증 실패 시 첫 오류 포커스는 pass**. `ImageUploadField`·`ProductOptionMatrix` 오류에는 포커스가 가지 않는다(RHF 필드가 아니다) | 이 화면 + 공용 `useCrudForm` | A11 change_request |
| 13 | COMP-09 · ERP-07 | P2 | 셀 truncate 없음(`nowrap` 열은 더 나쁘다 — 열이 늘어난다) · 금액의 '원' 이 자릿수 정렬을 깬다 | 이 화면 + 공용 `CrudTable` | A11 |
| 14 | COMP-12 · ERP-14 | P2 · P1 | **상한 근접 경고 없음**(전 필드) · 상품명·상품코드·브랜드는 **카운터조차 없고** `maxLength` 가 조용히 자른다 · 금액 필드에 실시간 마스킹·붙여넣기 정규화 없음(붙여넣은 '129,000' 이 거절된다). **범위가 좁아졌다**: 상세설명은 `RichTextField` 로 바뀌며 '조용히 멈춤' 과 'counting 기준 미정의' 가 둘 다 해소됐다 — 상한 집행이 zod 단독이라 초과 시 특정 문구로 거절되고(`validation.ts:107-111`), 카운터·검증이 `richTextLength`(평문) 한 함수를 공유한다 | 이 화면 + DS field adapter | A11 |
| 15 | ERP-06 · ERP-08 | P1 · P2 | `toLocaleString` 직접 호출 2곳(`ProductCardPreview.tsx:13` · `ProductOptionMatrix.tsx:304`) — `formatNumber` 미경유 | 이 화면 | A11 change_request |
| 16 | ERP-01 | P1 | status→tone 이 `pages/products/items` 지역 레지스트리다 — 앱 전역 통합 레지스트리가 아니다. 카테고리 배지는 id 해시라 status 축이 아니다 | **앱 전역** | A11 |
| 17 | ERP-15 (옵션) | P1 | **옵션 매트릭스가 데카르트 곱을 전부 펼친다**(3×20×20 = 8,000행) — cap·가상화·경고 없음. 가로 scroll 컨테이너는 있다 | 이 화면 | A11 change_request |
| 18 | COMP-01 (경미) | P1 | 손조립 `<button>` 2곳 — '목록으로' back-link(IA-07 축) · 옵션 삭제 ghost icon. **`buttonStyle(`/`tds-ui-btn-` grep 은 0건** | 이 화면 | A11 |
| 19 | MOTION-01 (잔여) | P0 | **범위가 크게 줄었다.** ~~`ToggleSwitch.css:56` 에 reduced-motion off 가 없다~~ → **게이트 실재**(`ToggleSwitch.css:79-84`) — 이 화면의 ToggleSwitch 3종에서 발현되던 위반은 **해소**. ~~Motion 라이브러리 미도입이라 오버레이 모션 부재~~ → **오버레이 모션 구현됨**(CSS-only · Modal `Modal.css:20-21,35-38,58-59` · Toast `Toast.css:32-37,121-131`, reduced-motion 게이트 각각 `:173-180`·`:136-141`). Motion/framer-motion 은 **여전히 미도입**이나 `onAnimationEnd` 로 동등 달성했다. **잔여**: 애니메이션되는 닫힘이 Modal 소유 3경로(Esc·딤·×)뿐이라 **이 화면 modal 4종의 footer 버튼 경로는 즉시 언마운트된다**(`Modal.tsx:27-31` — 조립하는 쪽 버튼이라 `onClose` 를 안 거친다). 라이브러리 부재를 gap 으로 볼지는 **소유 문서(DS)의 몫** | **`packages/ui`**(화면 코드로 해소 불가) | A41 / DS |
| 20 | EXC-05 · EXC-11 · EXC-13 · EXC-19 | P1 · P2 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 전역 `retry:false` · 세션 만료가 장수명 폼 입력을 버린다 | **앱 전역** | A40 · A11 |
| 21 | EXC-15 (부분) | P1 | upload progress·cancel 경로 없음 — **애초에 업로드하지 않기 때문이다.** 클라이언트 검증·로드 실패 fallback 은 pass | **알려진 빚에 종속** | A63 (BE-041 §7.5) |
| 22 | (§4.3 · §4.4) | — | **감사 축 부재** — 가격·적립률 변경 이력 없음 · 재고 조정 사유 없음 · `createdAt`/`updatedAt` 부재로 '최근 등록순'·'언제 바뀌었나'를 답할 수 없다. **가격은 돈이다** | BE 계약 | **A63 (BE-041 §7.15 #1·#2)** |
| 23 | (§4.4) | — | **`blob:` 이미지가 저장되면 깨진다** — **결함이 아니라 알려진 빚**. `POST /api/uploads` + 서버 `blob:` 거절 + `requiredImage` 조이기를 **한 배치로**(어느 하나만 붙이면 폼이 죽는다) | DS + BE 계약 | A63 · A41/DS (BE-041 §7.5) |
| 24 | (BE-041 §7.8) | — | **`DEFAULT_POINTS`/`DEFAULT_SHIPPING` 이 코드 상수라 전역 정책과 어긋난다** — 정책이 기본 적립률을 2% 로 바꿔도 새 상품은 1% 로 시작한다. **지금 실재하는 불일치** | 이 화면 + 정책 화면 | A11 · A01 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `HEAD = a5c2639` 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`productAdapter` 는 `createStoreAdapter({ scope: 'products', … })`(`data-source.ts:17,20-27`)라 `failIfRequested('products', op)` 를 부른다. **실재하는 op 는 4개**다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `createStoreAdapter.fetchAll` (`crud.ts:176`) **+ `fetchProductCategoryOptions`(`data-source.ts:34`)** | `?fail=list` · `?fail=products:list` · `?fail=all` |
| `detail` | `createStoreAdapter.fetchOne` (`crud.ts:181`) | `?fail=detail` · `?fail=products:detail` |
| `save` | `create`(`:199`) · `update`(`:207`) | `?fail=save` · `?fail=products:save` |
| `delete` | `remove`(`:228`) | `?fail=delete` · `?fail=products:delete` |

- **⚠ `list` op 이 두 조회에 공유된다** — `fetchProductCategoryOptions` 가 **같은 scope(`products`) + 같은 op(`list`)** 를 쓴다(`data-source.ts:17,34`). 그래서 **`?fail=products:list` 는 상품 목록과 카테고리 선택지를 동시에 실패시킨다.** 둘을 따로 실패시킬 스위치가 없다 — 카테고리 실패 단독 경로(FS-041-EL-002.3)를 재현하려면 코드를 손대야 한다. **§5 #8(키 분리)과 함께 다뤄야 할 사안이다.**
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 `?delay=` 가 아니라 **좌측 필터 클릭·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` 으로 `/products/prd-1/edit` — **두 화면이 같으면 gap**(현재 다르다 → pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap**(현재 다이얼로그 → 그 절 pass) |
| EXC-04 (토큰) | `grep -n "version\|updatedAt\|If-Match" pages/products/_shared/store.ts pages/products/items/data-source.ts` → **0건이면 gap**(현재 0건) |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 '저장하지 못했습니다') |
| EXC-06 (status별 surface) | 폼: `?status=save:422` · `save:409` · `save:500` (셋이 다르다 → pass). 삭제: `?status=delete:403` · `delete:409` · `delete:500` (셋이 같다 → gap) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fproducts&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — 폼에 '오류 코드 TDS-…' 가 보이면 pass. 삭제 다이얼로그에는 없다 |
| EXC-07 (422 필드 매핑) | **재현 불가** — `dev.ts:84` 가 `new HttpError(status, STATUS_MESSAGE[status])` 만 던져 `violations` 가 비어 있다(`http-error.ts:58`). **코드 대조로 판정했다** |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**:
- `grep` — TOKEN-01(hex/px/키워드 0건) · A11Y-12(`aria-current` 0건) · ERP-13(조사 리터럴 0건) · COMP-01(`buttonStyle(`/`tds-ui-btn-` 0건) · COMP-03(`type="search"` 0건) · EXC-14(`onMutate`/`setQueryData` 0건) · IA-04(`<Pagination` 0건) 판정.
- **RTL** — A11Y-11 의 `aria-required` 대조(대표 이미지 ✕ vs `product-name` ✔) · `aria-describedby` ↔ `role="alert"` id 일치.
- `products.test.ts` — 순수 규칙 회귀(`finalPrice`·`earnedPoints`·`totalStock`·`isLowStock`·`buildVariantMatrix`·필터·검색·정렬) + `productSchema` 검증 12케이스. **이 화면에 컴포넌트 테스트는 없다** — 목록·폼의 렌더 계약은 e2e 와 코드 대조에만 의존한다.
- 공용 모듈 테스트 — `shared/crud/{crud.test.ts,CrudTable.test.tsx,useListState.test.tsx,useDebouncedSearch.test.tsx}` 가 이 화면이 상속하는 계약(409·멱등·URL 직렬화·IME)의 회귀 방어선이다.

**알려진 flaky (참고)**: `shared/errors/http-error.test.ts:92` (`expect(codes.size).toBe(50)`)가 **birthday 충돌로 flaky** 하다 — `createErrorReference()` = `TDS-<Date.now() base36>-<3자리 base36 난수>`(`http-error.ts:68-75`), 난수 공간 46,656. 같은 ms 안에서 50개를 뽑으면 충돌 확률 ≈ 1−e^(−1225/46656) ≈ **2.6%**. 이 화면의 EXC-20 판정이 `HttpError.reference` 에 의존하므로 **관련 사실로 기록한다**(수정은 이 배치의 경계 밖이다).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서(STATE-01,02,04 · TOKEN-01..05 · COMP-10 · FEEDBACK-02,04,06 · A11Y-01,02,11,12 · MOTION-01,02,03 · IA-01,02,04,05,13 · EXC-01,02,03,04,08,09)로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 — 폼 modal 부재, IA-06 의 무게 규칙대로 전용 route 를 쓴다)
- [x] §2.1 산수 검산 — 15 pass + 10 종속 + 1 n-a + 4 gap = **30** ✔
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·날짜범위·CSV·sticky·PDF)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`products`)와 op 4종을 **어댑터 코드에서 확인**했고, **`list` op 이 상품 목록과 카테고리 선택지에 공유돼 따로 실패시킬 수 없음**을 발견해 기록했다. **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] **'판정 기준일 2026-07-17 · `HEAD = a5c2639` · E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다
- [x] **`createStoreAdapter` 가 준 것(404·409·멱등)과 주지 않은 것(version/ETag)을 EXC-04 판정에서 흐리지 않고 구분**했다
- [x] **A11Y-11 을 grep 수치가 아니라 런타임 주입 메커니즘으로 판정**했다. `a5c2639` 기준 갱신에서 **DS 가 `ImageUploadField` 경로를 닫아 gap → pass 로 뒤집혔고**(`requiredNameSuffix` — `ImageUploadField.tsx:55,250`), **해법이 `aria-required` 가 아니라 접근성 이름이었다는 점**을 §2·§5 에 함께 기록했다 — `aria-required` 로 재현하면 오판한다
- [x] §5 의 gap 이 FS-041 §7 · BE-041 §7.15 와 일치한다
</content>
