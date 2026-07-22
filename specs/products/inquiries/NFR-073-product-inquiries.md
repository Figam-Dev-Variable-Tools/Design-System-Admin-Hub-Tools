---
id: NFR-073
title: "상품 문의 비기능 명세"
functionalSpec: FS-073
backendSpec: BE-073
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-073. 상품 문의 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-073 상품 문의 (`/products/inquiries` · `/products/inquiries/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-073(요소·예외) · BE-073(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) · **NFR-076(쌍둥이 화면 — 판정 건수는 같고 근거가 다르다)** |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-073 §7 · BE-073 §7.13 과 번호가 대응해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **앱 공용 프레임워크(`shared/crud` · `shared/ui` 컴포넌트·훅 · `shared/permissions`)의 소비 여부도 화면의 선택이므로 직접이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(queryClient·RequireAuth·ToastProvider·RequireEntitlement)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**결제가 막힌 동안 유일하게 열려 있는 매출 창구다.** `pgSellable` 이 false 면 상품 카드의 '구매하기'가 '문의하기'로 바뀌고 그 문의가 **이 목록으로** 들어온다(`payment-settings.ts:100-103,143-153`). 그래서 이 화면의 P0 판정은 **비가역 액션의 게이트(FEEDBACK-02)** · **중복 제출(EXC-08)** · **동시성(EXC-04)** 에서 다른 목록 화면보다 무겁게 읽어야 한다 — 여기서 한 번 잘못 누른 '종결'이나 '견적 발행'은 **되돌릴 경로가 코드 어디에도 없고**(BE-073 §7.3), 덮인 답변은 처리 이력마저 파생값이라 흔적이 남지 않는다(BE-073 §7.7).

동시에 이 화면은 **`useRouteWritePermissions` 를 실제로 배선한 소수 화면 중 하나**이고(EXC-03 pass), **버튼의 존재 조건과 저장의 거절이 같은 술어를 읽는** 드문 화면이다(BE-073 §7.1) — '눌리는데 실패하는 버튼'이 없다.

**표면이 얇다는 점도 판정에 반영해야 한다**: 이 화면에는 modal 폼도, 페이지네이션도, 삭제도, 행 선택(삭제용)도 없다. 그 부재가 몇 개의 `n-a` 를 만들지만, **부재 자체가 gap 인 것도 있다**(페이지네이션 — IA-04).

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **세 개의 data view 가 전부 `{first-load, refetching-with-data, empty, error}` 중 하나만 그린다.** ① **목록**: `ProductInquiryListPage.tsx:164` 이 `firstLoading = isFetching && data === undefined` 를 파생해 껍데기에 넘기고(`:388`), 껍데기가 그 값만 스켈레톤(`CrudReadListShell.tsx:126`)·요약(`:119`)에 쓴다. **busy 는 `refreshing` 으로 분리**돼(`:118-120`) 재조회 중에도 이전 행이 유지된다 — `placeholderData: (previous) => previous`(`crud.ts:298`)가 뒷받침한다. ② **상태 배지**: `loaded = !firstLoading && error === null`(`:170`)일 때만 세고 아니면 `null` → `FilterPanel` 이 `'—'` 를 그린다(`FilterPanel.tsx:33,153`) — **0 과 '모름'을 구분한다.** ③ **상세**: `inquiry === undefined` 로 로딩(`ProductInquiryDetailPage.tsx:276-279`)이고 **error 분기가 항상 앞선다**(`:235`). **경미 잔여**: 좌측 레일의 미답변 안내가 `loaded` 를 조건으로 써(`:359-362`) **조회 실패에도 '미답변 건수를 세는 중입니다.'가 남는다** — 실패를 로딩으로 위장한다(§5 #6) | `/products/inquiries` 진입 → 렌더 확인 → 필터 변경으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | 두 read 실패가 인라인 danger `Alert` + 명시적 복구 컨트롤이다. **목록**(`CrudReadListShell.tsx:154-161`) '상품 문의 목록을 불러오지 못했습니다.' + '다시 시도'. **상세**(`ProductInquiryDetailPage.tsx:235-258`) 404 → '문의를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로' / 그 밖 → '문의를 불러오지 못했습니다.' + **'다시 시도'** + '목록으로'. read 실패에 toast 를 쓰지 않고(이 화면의 `toast` 소비는 저장 성공 `:176` 과 목록 발행 실패 `ProductInquiryListPage.tsx:230` — 둘 다 write 다), empty 로 폴백하지 않는다 | `?fail=list` · `?fail=detail` 로 각 조회를 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass.** error toast 가 나오면 gap | **pass** |
| STATE-04 | STATE | 직접 | **두 절 중 실재하는 절을 충족한다.** ① *page clamp* — **페이지네이션이 없어 표면이 없다**(껍데기가 `visibleItems` 전량을 DS Table 에 넘긴다). 부재 자체는 IA-04 가 gap 으로 잡는다. ② *숨겨진 행의 선택 해제* — **실재하고 충족한다.** 이 화면의 선택은 삭제용 체크박스가 아니라 **견적 바구니**이고(`ProductInquiryListPage.tsx:189-191`), `useEffect(() => setBasket(new Set()), [status, list.keyword])`(`:200-202`)가 **필터·검색이 바뀔 때마다 비운다** — 주석이 요구 번호를 그대로 인용한다(`:198-199` — `화면에 없는 문의가 담긴 채 '선택 3건 견적 발행' 이 되지 않게 한다 (STATE-04-b …)`). 재조회로 항목이 사라져도 `basketItems` 가 `items` 에서 되짚으므로(`:204`) 사라진 행은 자동으로 빠진다 | 문의 2건을 바구니에 담고 상태 필터를 '접수'로 바꾼다. **막대가 사라지고 바구니가 비면 pass.** 담긴 채 남으면 gap | **pass** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/products/inquiries/**` 에 primitive tier 밖 hex · `[0-9]+px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 실측 2026-07-22). 파생 치수는 `calc(${cssVar('space.6')} * 9)`(`ProductInquiryListPage.tsx:95`) · `* 14`(`:111`) · `* 8`(`:123`) · `* 12`(`ProductInquiryDetailPage.tsx:98`) 같은 space 토큰 배수로만 표현한다. `boxShadow` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/products/inquiries` → **0건이어야 한다.** ESLint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(상세 '목록으로' `ProductInquiryDetailPage.tsx:264` · 발행 견적 `Link` `:324` · 목록 '견적 보기' `<a>` `ProductInquiryListPage.tsx:285` · `DetailCellLink`) · DS `<Button>`·`<TextareaField>`·`<SearchField>` · 공유 `FilterPanel` 의 토글 버튼. **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: DS Table 스켈레톤 펄스 · Toast(`:176,230`) · DS `<Button>` transition · 이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건 실측) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` **최대 4개**(처리 카드 · 문의자 정보 · 처리 이력 · 로딩) · `<Alert>` 4종 · Toast · 이탈 가드 Modal. **이 화면이 `boxShadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`ProductInquiryDetailPage.tsx:273`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)를 참조한다 — 값을 손으로 재현하지 않는다. 카드 제목은 `CardTitle`(`<h2>`). **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/products/inquiries/:id` 의 '상품 문의 처리' `<h1>` 의 computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거친다: `ProductInquiryListPage.tsx:311-318` 이 `value={list.searchInput}` + `onChange={list.setSearchInput}` + **`{...list.searchInputProps}`** 를 스프레드한다. 그 props 가 `onCompositionStart`/`End` + `onKeyDown` 을 실어(`useListState.ts:50-51`) ① 조합 중에는 커밋하지 않고 ② 조합 종료 후 **250ms 디바운스**로 URL `?q=` 에 커밋하며(`:144`) ③ 조합 중 Enter 를 가로챈다. 순서 뒤바뀐 응답은 이 화면에 없다 — 검색이 클라이언트 필터라 요청 자체가 나가지 않는다(`:177-180`) | 검색창에 IME 로 '패딩' 입력. **조합 중 'ㅍ'·'파' 같은 부분 문자열이 URL·필터에 커밋되지 않아야 pass.** 완성 후 정확히 1회만 `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **미충족.** 이 화면의 비가역 액션은 **셋**이고 **어느 것도 확인 다이얼로그를 거치지 않는다**(`ConfirmDialog` grep 히트 0건 — 유일한 다이얼로그는 이탈 가드의 `intent="discard"` 다). ① **문의 종결**(`ProductInquiryDetailPage.tsx:370-374`) — `closed` 는 `canAnswer`·`canIssueQuote` 를 동시에 영구히 닫는다(`_shared/store.ts:102,107`) ② **견적 발행**(`:376-380`) — `quoteId` 가 박히면 `quoteIssueBlock` ②가 **재발행을 영원히 막고**(`quote-issue.ts:138`) 견적번호가 채번된다 ③ **최초 답변 저장**(`:381-391`) — `answeredAt` 이 찍히고 다시 바뀌지 않는다(`_shared/store.ts:134`). **되돌아가는 전이가 코드에 하나도 없다**(`:26-28`)는 사실이 이 gap 의 무게다. `busy` 중 더블클릭 차단도 `disabled={saving}` 하나뿐이다(EXC-08 과 연동) | 상세에서 답변 완료 상태의 문의를 열고 '문의 종결'을 클릭. **확인 없이 즉시 상태가 바뀌면 gap**(현재 그렇다). '견적 발행'도 동일. `grep -rn "ConfirmDialog" apps/admin/src/pages/products/inquiries` = 0건으로도 판정된다 | **gap** |
| FEEDBACK-04 | FEEDBACK | 직접 | `ProductInquiryDetailPage.tsx:154` 가 `useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `dirty` 는 RHF `isDirty` 가 아니라 도메인 판정(`:153` — `answer.trim() !== inquiry.answer`)이며 계약상 등가다. 3경로(beforeunload `useUnsavedChangesDialog.tsx:127` · 앱 내 링크 capture `:133` · popstate sentinel `:178`)는 훅이 소유하고, 훅은 `intent="discard"` `ConfirmDialog` 를 세운다(`:211-213`). 저장 성공 시 상세가 재조회돼 `useEffect([inquiry])`(`:148-151`)가 `answer` 를 원본으로 되돌려 dirty 가 풀린다 | 상세에서 답변을 입력하고 ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** **주의**: '목록으로' 버튼 2개(`:266,361`)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-073 §7 #9 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 답변 폼은 modal 이 아니라 상세 라우트의 `Card` 로 렌더된다(`ProductInquiryDetailPage.tsx:282-393`). 유일한 modal 은 이탈 가드 `ConfirmDialog` 이며 **입력 필드가 없다** | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success(message)`(`ProductInquiryDetailPage.tsx:176`) — 문구가 호출부에서 **4종**으로 갈린다(최초 답변 · 답변 수정 · 답변 착수 · 종결 — `:199,205,210`) + 견적 발행(`:230`) · 목록의 발행 성공(`ProductInquiryListPage.tsx:225`)과 **실패 error toast**(`:230`). 지속 live region 은 `ToastProvider` 가 소유한다(polite `:165` · assertive `:168`) | ToastProvider 판정에 종속. 이 화면에서는 저장 성공과 발행 실패가 각각 polite·assertive 로 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 **1개**: 이탈 가드 `ConfirmDialog`(`useUnsavedChangesDialog.tsx:211-213`). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 2개를 전수 확인했다.** ① **답변 `TextareaField`**(`ProductInquiryDetailPage.tsx:334-347`) — `error={fieldError ?? undefined}` 를 넘기면 DS 가 `aria-invalid` + `aria-describedby`(error id) + `role="alert"` 를 **내부에서 짝으로** 세운다. `maxLength` 카운터도 DS 소유다. ② **`SearchField`**(`ProductInquiryListPage.tsx:311-318`) — `label` 로 접근 이름을 받고 오류 상태가 없어 짝 요구가 발생하지 않는다. **짝 없는 `aria-invalid` 0건**(grep 실측: 이 디렉터리에 `aria-invalid` 히트 **0건** — 전부 DS 내부에 있다) | `grep -rn "aria-invalid" apps/admin/src/pages/products/inquiries` → 0건. RTL 로 답변을 비운 채 '답변 저장'을 눌러 `textarea.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert | **pass** |
| A11Y-12 | A11Y | 직접 | **좌측 필터가 공유 `FilterPanel` 하나이고 그것이 `aria-pressed` 만 쓴다**(`FilterPanel.tsx:145`). 그 컴포넌트의 머리말이 요구 번호를 인용하며 이유를 적는다(`:17-19` — `[A11Y-12] 선택 상태는 **aria-pressed** 하나로 말한다. 이 버튼은 '토글 필터'이지 '현재 위치'가 아니다`). **이 화면 전체에 `aria-current` grep 0건**(실측). `aria-pressed` 의 다른 히트 1건은 견적 바구니 '담기' 토글(`ProductInquiryListPage.tsx:295`)로 **같은 규약의 올바른 사용**이다 | `grep -rn "aria-current" apps/admin/src/pages/products/inquiries` = 0건. 좌측 '접수' 항목 선택 시 `button[aria-pressed="true"]` 가 정확히 1개인지 확인 | **pass** |
| MOTION-01 | MOTION | 상속 | Modal 표면 **1개**(이탈 가드). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다(grep 0건) | DS Modal 판정에 종속 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 4종 + 발행 성공/실패. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: DS Table 스켈레톤 펄스 · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건 실측) | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:335-336`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록의 최상위는 2열 그리드(`ProductInquiryListPage.tsx:354`)이고 상세는 평범한 `<div style={pageStyle}>`(`:261`)다. **메뉴에서 감춰져도 라우트는 살아 있다**(`nav-config.ts:311-312,327-336`) — 그 경우에도 셸 안에서 렌더된다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족.** `findCoveringLeaf` 덕에 브랜치 폴백은 없다 — `/products/inquiries/:id` 는 자기를 감싸는 잎 `/products/inquiries`(`nav-config.ts:190`)를 찾아 AppHeader 가 `<h1>문의</h1>` 을 그린다. **그러나 상세가 자체 `<h1>상품 문의 처리</h1>` 를 또 그린다**(`ProductInquiryDetailPage.tsx:273`) → **`<h1>` 이 2개**다. 게다가 목록은 in-content `<h1>` 이 없어 **title 소스 모델이 화면 타입마다 모순**이고, 두 h1 이 서로 다른 것을 말하며 **어느 쪽도 문의번호(`PIQ-…`)를 식별하지 못한다.** 조건부 메뉴라 AppHeader 쪽 라벨이 `' · 읽기 전용'` 꼬리표를 달 수도 있어(`inquiry-backlog.ts:132`) 두 제목의 어긋남이 더 커진다 | `/products/inquiries/:id` 진입 후 `document.querySelectorAll('h1').length` 확인. **2 이면 gap.** 목록은 1개(정상) — 이 gap 은 sub-route 에서만 발생한다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색(`:307-320`) → 결과 count 요약(`CrudReadListShell.tsx:118-121`) → table(`:124`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 문의 생성이 범위 밖이다(BE-073 §7.2). SelectionBar 자리는 **견적 바구니 막대**가 대신한다(`:322-349`). **미충족: Pagination 이 없다.** 껍데기가 `visibleItems` 전량을 DS Table 에 넘기며 페이지네이션 컴포넌트가 없다. 문의는 상한 없이 매일 쌓이는 컬렉션이고, **PG 를 끈 운영에서는 그것이 유일한 유입 경로다**(BE-073 §7.11) | 픽스처를 30건 이상으로 늘리고 `/products/inquiries` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 문의 생성이 범위 밖이고 답변은 `/new`·`/:id/edit` 폼이 아니라 상세 라우트 안의 카드에서 일어난다. `App.tsx:335-336` 이 라우트 2개(목록·상세)뿐임을 보인다 | 이 화면에 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | 상태 필터와 검색어의 **단일 원천이 URL 쿼리스트링**이다. `:151` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { status: 'all' }` — `:84`), 그 훅이 `useSearchParams` 로 `?status=`·`?q=` 를 읽고 쓴다. 기본값과 같은 값은 URL 에서 지워지고(`:83` 주석) 손으로 고친 값은 `parseFilter`(`:153-157`)가 '전체'로 되돌린다. 결과: 필터를 걸고 상세에 들어갔다 Back 하면 조건이 복원되고, 필터 걸린 view 를 링크로 공유할 수 있다. **`sort`·`page` 는 정렬 UI·페이지네이션이 없어 쓰이지 않는다**(IA-04 gap 이 그것을 잡는다) — 실재하는 축은 전부 URL 에 있다 | `/products/inquiries` 에서 상태='접수' + 검색='PIQ-2026' 적용 → URL 이 `?status=received&q=PIQ-2026` 인지 확인 → 행 클릭으로 상세 진입 → Back. **같은 조건의 목록이 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary` + `RouteErrorScreen`. 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError` → `notifySessionExpired()`(`queryClient.ts:60-66`). **이 화면의 조회 2종·저장·발행이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fproducts%2Finquiries&reason=session_expired` 로 이동하는지 확인. (미저장 답변 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **충족.** ① **read 게이팅(상속)**: `RequirePermission` 이 AppShell `<Outlet>` 을 감싸 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, `/products/inquiries` 는 `/products` 보다 긴 잎이라 **별개 리소스로 갈린다**(`covers()` 규칙). ② **write 게이팅(직접)**: 목록 `:148` 과 상세 `:129` 가 `const { canUpdate } = useRouteWritePermissions()` 를 구독하고 그 값이 쓰기 표면 **전부**를 지배한다 — 목록의 **견적 바구니 열 자체가 없어지고**(`:305`) 바구니 막대도 없어지며(`:322`), 상세의 액션 버튼 **넷이 렌더되지 않는다**(`:365,370,376,381`). ③ **안내 문구가 그 사실을 미리 밝힌다**(목록 `:371` · 상세 `:356-358`). ④ **강등 reconcile**: 권한 스토어가 바뀌면 훅 구독자가 재렌더돼 별도 코드 없이 사라진다. ⑤ **행 클릭은 `detail` 목적지라 `canUpdate` 와 무관하게 read 로 게이팅된다**(`CrudTable.tsx:306`) — 조회 전용 역할이 상세로 가는 길을 잃지 않는다. **경미 잔여**: 답변 `textarea` 만 숨지 않고 `disabled` 된다(`:342`) — 컨트롤이 아니라 입력이라 요구의 'create/update/delete 컨트롤' 절에 걸리지 않으나, 이 화면 자신의 규칙(`:364` — `누를 수 없는 것을 보여 주지 않는다`)에서는 유일한 예외다(§5 #7) | 권한 스토어에서 `page:/products/inquiries` 의 `update` 를 끈 뒤 목록·상세 진입. **바구니 열과 액션 버튼 넷이 사라지고 '답변 권한이 없어 조회만 가능합니다.'·'이 문의에 답변할 권한이 없습니다. 조회만 가능합니다.'가 뜨면 pass.** `read` 를 끄면 403 화면이 뜨는지도 확인 | **pass** |
| EXC-04 | EXC | 직접 | **미충족.** ① **유령 저장은 해소됐다** — 어댑터가 공용 `createStoreAdapter` 라 없는 id 에 **`HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`** 를 던진다(`crud.ts:256-258`). ② **그러나 화면에 409 해소 UI 가 없다** — `onError`(`ProductInquiryDetailPage.tsx:179-182`)에 `isAbort` 분기만 있고 `isConflict` 분기가 **없다**(grep 0건). 409 는 `setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')` 로 떨어져 **재시도하면 또 409 인 실패에 재시도를 권한다.** ③ **낙관적 동시성 토큰이 없다** — `ProductInquiry` 에 `version`/`updatedAt` 이 없고 `update` 가 `If-Match` 를 보내지 않는다(grep **0건** 실측). 현 409 는 **'존재 여부' 기반**이므로 **동시 편집은 last-write-wins** 이고, 이 화면에서 덮이는 값은 **답변 본문 그 자체**다(BE-073 §7.7). ④ **부분 완화**: 불법 전이는 저장 시점 재판정이 막고, 견적 이중 발행은 `quoteId` 멱등키 세 겹이 막는다 — 그 구분을 흐리지 말 것 | `?status=save:409` 로 상세에서 '답변 저장'. **conflict 다이얼로그 없이 일반 배너만 뜨면 gap.** 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/products/inquiries` → 0건으로 확인(실측 0건) | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `commit`(`ProductInquiryDetailPage.tsx:166-185`)에 **동기 제출 락(`submitLockRef`)이 없고 멱등키도 없다**(grep **0건** 실측) — 이 화면이 `useCrudForm` 을 쓰지 않고 저수준 `useCrudUpdate` 를 직접 부르기 때문이다. **자리는 이미 비어 있다**: `UpdateVars.idempotencyKey`(`crud.ts:344-345`)와 어댑터 원장(`crud.ts:67-77,243`)이 존재하는데 `update.mutate({ id, input, signal })`(`:171-172`)가 키를 넣지 않아 **원장이 영원히 발현되지 않는다.** 방어는 버튼 `disabled={saving}` + DS `loading` 하나뿐이다. **목록의 견적 발행도 같다** — `issue.mutate(basketItems)`(`ProductInquiryListPage.tsx:342`)에 키가 없고 내부 루프의 `update` 도 `context` 를 넘기지 않는다(`:215-218`). **완화 요인 둘**: (a) 저장이 **전체 치환**이라 두 번 실행돼도 최종 상태가 같다 (b) **견적 이중 발행은 `quoteId` 멱등키 세 겹이 막는다**(BE-073 §7.4). **그러나 요구가 명시한 두 장치는 부재다** | 상세에서 '답변 저장'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되면 gap.** `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/products/inquiries` = 0건으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | **상세에 네 지점이 배선돼 있다.** ① **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:145`). ② **저장 시작마다 새 컨트롤러**(`:169-170`). ③ **onSuccess** — `if (controller.signal.aborted) return;`(`:175`)로 취소된 요청의 성공 콜백이 토스트·재조회를 일으키지 않는다. ④ **onError** — `if (isAbort(cause)) return;`(`:180`)로 abort 를 실패로 처리하지 않는다. 공유 predicate `isAbort`(`shared/async`)를 쓴다 — 로컬 판정을 재발명하지 않는다. **경미 잔여**: 목록의 견적 발행 뮤테이션에는 `AbortController` 가 **0건**이라(`:208-232`) 발행 도중 이탈하면 `navigate`·`toast` 가 언마운트 후에 돈다 — abort 가 발생하지 않으므로 **거짓 실패를 만들지는 않지만** 요구의 정신에서는 잔여다(§5 #5) | 상세에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다 | **pass** |
| EXC-21 | EXC | 상속 | **이 화면은 판정 대상이나 거절 UI 를 소유하지 않는다.** ① **플랜 계열**: 이 라우트는 `commerce.products` 모듈에 속한다(`module-resources.ts:40-46` — `group:/products` · `page:/products` · `page:/products/categories` · `page:/products/reviews` · **`page:/products/inquiries`** 가 한 묶음이다). 잠금/숨김/허용 판정은 `entitlementStateForResource`(`route-entitlement.ts:23-29`)가 하고 화면 대체는 AppShell 의 `RequireEntitlement` 가 `<Outlet>` 바깥에서 한다. **NFR-076 과 갈리는 지점이다** — 프로그램 문의는 매핑이 없어 언제나 granted 다. ② **권한 계열**: `RequirePermission` 이 `<Outlet>` 바깥에서 403 화면을 렌더한다. ③ **설정 계열**: PG 설정이 이 화면에 영향을 주지만 **거절 화면을 만들지 않는다** — 메뉴 가시성만 바꾸고(`resolveNavLeaf` — `nav-config.ts:314-324`) **라우트는 살아 있다**(`:311-312,327-336`). 따라서 **한 화면에 두 계열이 섞일 표면 자체가 없다**(이 디렉터리에 `entitlement` grep 0건) | 플랜에서 `commerce.products` 를 내리고 `/products/inquiries` 진입. **잠금/숨김 화면이 뜨고 그 문구에 403 계열 표현이 섞이지 않으면 pass**(판정은 `RequireEntitlement` 소유 문서). PG 를 켜고 잔여 0건을 만들어 메뉴가 사라져도 **URL 직접 진입이 정상 렌더되는지**도 확인 | **종속** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-04 · A11Y-11 · A11Y-12 · IA-01 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-21 |
| `n-a` | **2** | FEEDBACK-06 · IA-05 |
| `gap` | **5** | FEEDBACK-02 · IA-02 · IA-04 · EXC-04 · EXC-08 |
| **합계** | **31** | 13 + 11 + 2 + 5 = **31** ✓ |

> **P0 gap 5건 — quality-bar '배치 실패' 사유.** 그중 **FEEDBACK-02 가 이 화면 고유의 가장 무거운 것**이다 — 되돌릴 경로가 없는 액션 셋이 한 번의 클릭으로 끝난다(§1.2). IA-02·IA-04 는 앱 전역의 같은 뿌리(sub-route h1 이중 · 목록 페이징 부재)를 공유하므로 **횡단 배치**로 푸는 것이 옳다. EXC-04·EXC-08 은 둘 다 `useCrudForm` 미사용에서 나온 한 뿌리다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·페이지네이션 range·정렬 헤더·optimistic write·일괄 삭제)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:298`)로 이전 행을 유지하고 `staleTime`(`queryClient.ts:70`)이 재조회 시점을 지배한다. 껍데기가 요약에 `· 새로고침 중…`을 덧붙이고 `aria-busy={refreshing}` 을 건다(`CrudReadListShell.tsx:118-121`) | 데이터가 있는 상태의 재조회에서 이전 행이 유지되고 요약에 새로고침 표시가 뜨는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 를 소비한다(`CrudTable.tsx:378-390`) — 검색 0건/필터 0건/진짜 0건 3분기 + 복구 액션이 맥락(`hasQuery`·`hasActiveFilters`)에서 파생된다(`ProductInquiryListPage.tsx:399-405`). 조사(이/가)는 `Empty` 가 받침으로 고른다. `createVerb="접수"` 로 '접수된 상품 문의가 없습니다'가 된다. **생성 CTA 를 주지 않는 것은 정당하다**(BE-073 §7.2) | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기, 필터로 0건 → 필터 초기화가 나오는지 | **pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:356-358`) 화면이 상세를 재조회한다(`:177`). 목록의 발행 성공도 목록 키만 무효화한다(`ProductInquiryListPage.tsx:223`) | 상세에서 답변 저장 후 목록 복귀 시 상태 배지·경과·건수 배지가 갱신돼 있는지 | **pass** |
| COMP-01 | P1 | 모든 액션 버튼이 DS `<Button>` 이고 진행 상태를 **`loading` prop** 으로 표현한다(`:385` · 목록 `:340`) — 손으로 쓴 '저장 중…' 라벨이 없다. `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/products/inquiries` = **0건**. 상세 '목록으로'(상단)만 `<button>` + 로컬 스타일인데(`:262-270`) **아이콘+텍스트 back affordance 라 DS Button 이 아닌 것이 의도**다 | 위 grep 이 0건인지 | **pass** |
| COMP-03 | P1 | 툴바 검색이 DS `<SearchField>` molecule 이다(`:311-318`) — raw `<input type="search">` 재구현이 없다 | `grep -rn "type=\"search\"" apps/admin/src/pages/products/inquiries` = 0건 | **pass** |
| COMP-06 | P2 | **스켈레톤이 DS Table 소유로 올라갔다** — 화면·껍데기가 행 수·셀 수를 손으로 세지 않는다(`CrudReadListShell.tsx:126` 이 `loading` 만 넘긴다). **다만 DS 가 정한 행 수가 PAGE_SIZE 와 맞는지는 페이지네이션이 없어 판정할 기준값 자체가 없다**(IA-04 gap 과 연동) | 페이지네이션 도입 후 스켈레톤 행 수 === PAGE_SIZE 인지 | **pass(기준값 부재)** |
| COMP-07 | P2 | `SeqCell seq={index + 1}`(`CrudTable.tsx:331`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다. **소유가 공용 `CrudTable` 로 옮겨가 이 화면 단독으로는 고칠 수 없다** | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재 · 공용)** |
| COMP-08 | P2 | **중복 '상세' 버튼이 없다.** 현 구조는 요구가 정의한 (a) 형태 그대로다: whole-row 클릭(`ROW_TARGET` `kind:'detail'` — `:87-90`) + **row 내 접근 가능한 링크 하나**(제목 `DetailCellLink` — `:249-255`). 마지막 열(견적 바구니)은 '상세' 중복이 아니라 **다른 목적지의 액션**이다 | 읽기전용 리스트에 중복 '상세' 버튼이 없는지 | **pass** |
| COMP-09 | P2 | **한 표 안에서 두 규칙이 반대 방향으로 어긋난다.** 상품명 셀은 ellipsis 로 자르는데(`:121-127`) **`title` 속성도 툴팁도 없어 전체 값을 볼 수단이 없고**, 제목 셀은 truncate 가 없어(`:249-255`) 긴 값이 열을 넓힌다. **완화** — 껍데기가 가로 스크롤 컨테이너를 갖는다(`CrudReadListShell.tsx:37`) | 200자 상품명·200자 제목 픽스처로 표 폭과 전체 값 확인 | **gap** |
| COMP-12 | P2 | 답변 textarea 가 `maxLength={1000}` 과 `TextareaField` 의 `N/1000` 카운터를 갖는다(`:341`). **그러나 상한 근접 경고가 없고, 네이티브 `maxLength` 가 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 바로 그 증상. counting 기준(`trim().length` = UTF-16 code unit — `validation.ts:14`)도 사용자에게 명시되지 않았다 | 1000자 근접 시 경고가 뜨는지, 초과 붙여넣기가 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 대체로 규칙과 일치한다: read 실패=인라인 Alert · write 성공=toast(`:176`) · **상세 write 실패=카드 배너**(`:291`). **그러나 목록의 견적 발행 실패만 toast 다**(`ProductInquiryListPage.tsx:230`) — 같은 화면 안에서 실패 통지의 자리가 갈리고, **이 화면에서 가장 무거운 쓰기가 자동 소멸하는 통지를 쓴다.** 게다가 그 toast 에 '다시 시도'가 없다 | `?fail=save` 로 상세 저장 → 배너, 목록 발행 → toast 임을 확인. **발행 실패 toast 가 자동 소멸하고 retry 가 없으면 gap** | **gap** |
| FEEDBACK-03 | P1 | 네 액션 전부 성공·실패 양 경로가 배선돼 있다(`commit` — `:166-185`). **no-op 클릭이 없다** — 버튼의 존재 조건이 전이 술어라 눌리는 순간 반드시 통과한다(BE-073 §7.1), 그리고 `onSaveAnswer` 는 검증 실패 시 인라인 오류를 세운다(`:190-194`) | `?fail=save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | **비가역 액션 셋에 confirm 도 undo window 도 없다**(FEEDBACK-02 P0 와 같은 뿌리). 삭제는 이 화면에 없으므로 요구의 delete 절은 걸리지 않지만, '종결'과 '견적 발행'은 요구가 말하는 **비가역 액션 그 자체**다 | 비가역 액션이 confirm 또는 undo window 를 갖는지 → 둘 다 없다 | **gap** |
| A11Y-03 | P1 | ConfirmDialog 표면 1개(이탈 가드). 초기 포커스(discard intent → Cancel)는 DS `ConfirmDialog` 가 소유한다 | DS 판정에 종속 | **종속** |
| A11Y-08 | P1 | **충족.** 행 클릭이 DS Table 소유(마우스 전용)이고, **행 안에 같은 목적지의 focusable 링크가 있다** — 제목 `DetailCellLink`(`:249-255`). `:250` 주석이 그 의도를 명시한다(`제목은 상세로 가는 **키보드 경로**다`) | 행을 Tab 해서 제목 링크에 도달하고 Enter 로 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | 상세 진입 시 답변 필드에 자동 포커스가 없고, 검증 실패 시 그 필드로 포커스가 이동하지 않는다 — `useCrudForm` 의 `setFocus` 경로를 상속하지 못했다. 오류는 문구만 꽂는다(`:192-193`) | 답변을 비운 채 '답변 저장' → `activeElement` 가 textarea 인지 | **gap** |
| A11Y-16 | P1 | 목록에 **항상 마운트된 polite live region** 이 있다(`CrudReadListShell.tsx:110-112`) — 문장이 3분기라(`announcementOf` `:73-83`) 필터로 0행이 되는 전환도 announce 된다. 그 밖: 필터 `nav aria-label`(`FilterPanel.tsx:121`) · 링크 접근 이름 · 경과·상태를 **색이 아니라 배지 라벨로 이중 인코딩**(`:271` 주석) · 바구니 토글의 `aria-pressed`. **잔여**: 바구니에 담고 뺄 때 그 사실이 announce 되지 않는다 — 막대 자체는 `Alert` 라 조건부 마운트다 | 필터를 걸어 0행으로 만들 때 스크린리더가 사유를 읽는지(pass). 담기 토글이 announce 되는지(현재 안 된다 — §5 #8) | **pass(경미 잔여)** |
| ERP-01 | P1 | status→tone 매핑이 **화면 전용 모듈의 단일 레지스트리**다 — `types.ts:26-34`(`STATUS_META`·`inquiryStatusLabel`·`inquiryStatusTone`). per-page meta helper 를 만들지 않았고 목록·상세가 같은 함수를 소비한다. **`Record<InquiryStatus, …>` 로 키를 다 적어 상태가 늘면 컴파일이 막는다.** 다만 그 레지스트리가 `pages/products/inquiries` 지역이라 앱 전역 레지스트리는 아니다 — **영업 문의·프로그램 문의와 별개 상수다**(BE-073 §7.12) | 모든 domain status 가 정의된 tone 으로 해석되는지 | **pass(도메인 내)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `shared/format`(`formatNumber`)을 경유한다(`:327,360`). 시각은 `formatDateTime`(`:267` · 상세 `:307,310`) | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-08 | P2 | 수량·건수가 `formatNumber`, 시각이 `formatDateTime` 을 경유한다. **접수일 셀도 `formatDateTime` 을 쓴다**(`:267`) — 클레임 화면이 raw 문자열을 흘리던 결함이 여기에는 없다. 문의번호에 `tabular-nums` 가 붙어 있다(`:115-119`) | 셀의 raw 문자열 렌더가 0건인지 | **pass** |
| ERP-09 | P2 | 시각 표면이 전부 `formatDateTime` 을 경유하고, 저장은 **UTC(Z)** · 표기는 **KST 환산**이라는 정책이 저장소 머리말에 명시돼 있다(`_shared/store.ts:17-19`). 문의번호에 박히는 날짜도 문자열을 자르지 않고 `seoulDayOf` 로 **KST 달력일**을 계산한다(`:296-301`) — 자르면 한국 시각 오전 8시 접수 건이 전날 번호를 단다 | UTC ISO 입력이 러너 OS 타임존과 무관하게 같은 wall-clock 을 렌더하는지 | **pass(상속)** |
| ERP-13 | P1 | 이 화면의 사용자 대상 문자열에 **리터럴 조사 폴백이 0건**이다(`이(가)`·`을(를)`·`은(는)` grep 0 실측). 빈 상태의 조사는 `Empty` 가 받침으로 고르고, 견적번호를 interpolate 하는 토스트는 **`objectParticle` 헬퍼를 쓴다**(`:230` · 목록 `:225` — `견적 ${quoteNo}${objectParticle(quoteNo)} 발행했습니다.`) | 사용자 대상 문자열의 조사 폴백 grep = 0 | **pass** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — cap·virtualization 이 없다. 문의는 상한 없이 증가하는 컬렉션이고(BE-073 §7.11) PG 를 끈 기간에는 증가율이 결제 설정에 종속된다. **완화 둘**: 검색이 디바운스돼(COMP-10) 자모마다 전량 스캔이 일어나지 않고, 가로 scroll 컨테이너가 있어(`CrudReadListShell.tsx:37`) 9열 표가 페이지를 밀지 않는다 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 상세 언마운트에서만 발생한다. **BE-073 §2 가 발행 상한을 10초로 잡으므로 '서버 상한 < 프론트 상한' 관계를 만들 프론트 쪽이 없다** | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **부분 충족.** `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. 이 화면은 **상세 조회의 404 와 그 밖을 실제로 분기한다**(`:235-258`). **그러나 저장 실패는 403/409/422/500 을 한 문구로 뭉갠다**(`:181`) — `isForbidden`·`isConflict` 가 존재하는데 쓰지 않는다(grep 0건 실측). **게다가 서버 문구를 보이지도 않는다** — 클레임 화면이 `isHttpError(cause) ? cause.message : 기본문구` 로 서버 사유를 통과시키는 것과 달리 여기는 **언제나 고정 문장**이다 | `?status=save:403` · `save:409` · `save:429` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **서버 422 를 필드로 되돌릴 경로가 없다** — `useCrudForm` 의 `setError`+`setFocus` 를 상속하지 못했고, `violations` 를 읽는 코드가 이 화면에 0건이다. 클라이언트 zod 오류는 인라인으로 가지만(`:190-194,343`) **서버 오류는 전부 카드 배너로 수렴한다.** BE-073 EP-03 이 `error.fields`(`status`·`answer`)를 계약으로 내려보내도 소비할 자리가 없다 | `?status=save:422` → 답변 필드에 인라인 오류가 뜨는지. **배너만 뜨면 gap** | **gap** |
| EXC-10 | P1 | **표면이 실재하고 미충족이다.** 견적 바구니의 다건 발행이 bulk 작업인데 `Promise.allSettled` semantics 가 아니라 **순차 `for await`** 다(`ProductInquiryListPage.tsx:214-219`). 중간에 실패하면 앞의 것은 이미 `quoteId` 를 갖고 나머지는 견적 없이 남으며, **롤백 경로가 없고 실패 토스트는 어느 것이 남았는지 말하지 않는다**(`:230`). 'N중 M건 실패' 보고도, 실패분만 재시도하는 경로도 없다. **서버 계약이 이를 한 트랜잭션으로 뒤집는다**(BE-073 §7.4) | 문의 3건을 담고 두 번째 update 를 실패시킨다. **어느 것이 발행됐는지 화면이 말하지 않으면 gap** | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 문구·복구 수단으로 가른다(`:235-258`): 404 → '문의를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만 / 그 밖 → '문의를 불러오지 못했습니다.' + '다시 시도' + '목록으로'. 근본이 갖춰져 있다 — 어댑터가 `HttpError(404)` 를 던지고(`crud.ts:217-219`) 화면이 `isNotFound` 로 읽는다. 무한 spinner 없음(`inquiry === undefined` 는 error 분기 뒤에 온다) | 없는 `:id`(`/products/inquiries/nope`)로 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음)가 뜨는지. `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적(pending 잠금 → 성공 후 재조회)이다. `onMutate`/`setQueryData` grep = **0건**(실측). 롤백 경로가 필요 없다 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-18 | P1 | **selection scope 가 정의돼 있으나 안전장치는 없다.** 범위는 명확하다 — 바구니는 `items`(필터 이전 전량)에서 되짚고(`:204`) **필터·검색이 바뀌면 비워진다**(`:200-202`, STATE-04 pass). 실행 전 '문의 N건을 한 견적으로 합칩니다.' 배너도 있다(`:327`). **그러나 Shift-click 범위 선택도, 전체 선택도, 담을 수 있는 건수 상한도 없다** — 그리고 발행은 비가역이다(FEEDBACK-02) | 바구니에 100건을 담을 수 있는지, 그 상태에서 발행이 경고 없이 실행되는지 | **gap** |
| EXC-20 | P1 | **미충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 가 없다** — `referenceOf` 를 부르는 코드가 이 화면에 0건이고, `useCrudForm` 의 `errorReference` 를 상속하지 못했다. 배너는 언제나 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`:181`)라 운영자가 신고할 근거가 없다. **다만 raw 서버 body·stack trace 노출도 없다** — 요구의 후반절은 충족한다 | `?status=save:500` → 배너에 참조 코드가 보이는지. **없으면 gap** | **gap** |
| EXC-22 | P1 | **세 축의 실패 방향이 다르다는 규약을 이 화면이 소비한다**: 권한 축은 fail-closed(`RequirePermission`), 엔타이틀먼트 축은 fail-open(`route-entitlement.ts:10-12`)이나 **이 라우트는 매핑이 있으므로**(`commerce.products`) 그 fail-open 이 적용되지 않으며, **결제 축은 fail-closed**(`pgSellable` — `payment-settings.ts:120-130`)라 MID 공란이면 판매 불가로 수렴하고 그 결과가 이 화면의 유입이 된다. **양방향 단위 테스트는 소유 모듈에 있다**(`route-entitlement.test.ts` · `payment-settings.test.ts`) — 이 화면에는 없다 | 소유 문서 판정에 종속. 이 화면에서는 자체 판정 코드가 0건임만 확인 | **종속** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-073 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 지연이다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일. **상세는 `placeholderData` 를 쓰지 않아**(`useQuery` 직접 — `:131-135`) 재진입마다 로딩 문구가 뜬다 |
| 답변 저장 p95 | ≤ 700ms (BE-073 §2 서버 상한 5초) | **측정 불가.** 저장 후 상세 재조회 1회가 뒤따른다(`:177`) → 체감 = 저장 + 상세 |
| **견적 발행 p95** | **≤ 2s** (BE-073 §2 서버 상한 10초 → 504) | **측정 불가.** 견적 생성 + 문의 다건 잠금이 한 트랜잭션이어야 한다. **현재 프론트는 그것을 `1 + N` 요청으로 쪼갠다**(`:214-219`) — N 건 담으면 왕복이 N+1 회다(EXC-10 gap) |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: STALE_TIME_MS`(`:70`) · `retry: false`(`:82`) · `refetchOnWindowFocus: false`(`:90`) 를 명시한다 — **충족** |
| 저장 성공 후 재조회 | 상세 1회(`:177`) + 무효화된 목록 1회(`crud.ts:356-358`) | **적정.** 클레임 화면 같은 조건부 과잉 재조회가 없다 |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · 커밋당 전량 스캔 1회 | **충족(요청)** / **부분 충족(연산)** — 디바운스 250ms 가 자모당 스캔을 막으나, 커밋마다 전량을 `filter` 1회 + `search`(4필드) 1회 훑는다(`:177-180`) |
| 건수 배지 산출 | 진입당 1회 + 데이터 변경 시 | `useMemo([items, loaded])`(`:171-174`) — 필터 변경으로는 다시 계산하지 않는다(필터 이전 집합을 세므로 옳다) |
| 저장 요청 크기 | ≤ 8KB | **미충족 — 상한이 없다.** `ProductInquiryInput` 12필드에 `message`(고객 원문)와 `answer`(최대 1000자)가 들어간다. **계약상 `message` 에 상한이 없다** — 접수 채널이 정한다. BE-073 §7.9 안 A 가 이를 `{ status, answer }` 둘로 줄인다 |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. 문의는 상한 없이 증가 |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). 화면 2개(409행 + 423행) + 도메인 3파일(`types.ts` 269행 · `validation.ts` 29행 · `_shared/store.ts` 353행) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudReadListShell.tsx:154-161`). **툴바·좌측 레일은 살아남는다** — 껍데기가 배너 바깥에 그린다. **단 좌측 미답변 안내가 '세는 중'으로 남아 실패를 로딩으로 위장한다**(§5 #6) |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너와 입력 보존은 되나 **참조 코드가 없다**(EXC-20 gap). 서버 문구도 통과시키지 않는다(EXC-06 gap) |
| 저장 실패(422 전이) | 그 사유를 보인다 | **미충족** — 고정 문구로 뭉개진다(EXC-07 gap). **다만 전이 위반은 애초에 도달하기 어렵다** — 버튼의 존재 조건이 같은 술어라(BE-073 §7.1) 정상 경로에서는 발생하지 않고, 다른 운영자가 먼저 옮긴 경우에만 나온다 |
| 저장 실패(409 동시 삭제) | conflict 다이얼로그 + 입력 보존 | **미충족** — 일반 배너로 뭉개진다(EXC-04 gap) |
| **동시 처리(두 운영자)** | 나중 저장이 앞선 답변을 덮지 않는다 | **미충족.** 토큰이 없어 **답변 본문이 last-write-wins** 다(BE-073 §7.7). **불법 전이만 저장 시점 재판정이 막는다** |
| 연타(더블클릭) | 정확히 1개 요청 | **미충족**(EXC-08 gap). **완화**: 전체 치환이라 최종 상태가 같고, 견적 이중 발행은 멱등키 세 겹이 막는다 |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **단 서버 도달 여부는 보장하지 않는다** |
| **발행 중 이탈** | abort · 언마운트 후 부수효과 없음 | **미충족** — 목록의 발행 뮤테이션에 `AbortController` 가 0건이라 `navigate`·`toast` 가 언마운트 후에 돈다(§5 #5) |
| 견적 발행기 미배선 | 조용히 성공하지 않는다 | **충족** — `quoteIssueBlock` ④가 `견적 발행을 사용할 수 없습니다. 관리자에게 문의하세요.` 를 돌려주고 버튼이 비활성되며 **그 사유가 막대에 그대로 뜬다**(`:326-329`). 회귀 `quote-issue.test.ts:86-92` |
| 잔여 문의 집계 미배선 | 메뉴를 지우지 않는다 | **충족(fail-open)** — `readInquiryBacklog` 가 `null` 이면 `inquiryMenuState` 가 `archive` 로 읽어 메뉴를 남긴다(`inquiry-backlog.ts:121`). **0 으로 떨어뜨리면 과거 문의가 접근 불가가 된다**(`:10-13`) |
| PG 를 켜서 메뉴가 사라진 뒤 | 과거 문의에 URL 로 접근 가능 | **충족** — `collectNavRoutes()` 가 `resolveNavLeaf` 를 지나지 않는다(`nav-config.ts:327-336`, 근거 `:311-312`) |
| 세션 만료 중 답변 작성 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 답변을 버린다. 프로그램 이동이라 이탈 가드도 발화하지 않는다(EXC-19 P1) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 답변 무결성 · 개인정보 · 감사

이 화면은 **고객에게 그대로 나가는 글**과 **응대 속도라는 사실**과 **견적이라는 산출물**을 만든다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 답변과 상태가 갈라지지 않는다 | **충족(도메인 가드)** — 본문·답변시각·상태가 `applyAnswer` 한 함수에서만 함께 움직인다(`_shared/store.ts:8-11,127-137`). 회귀 `inquiries.test.ts:75-115` |
| 빈 답변이 '답변 완료'로 집계되지 않는다 | **충족(이중 방어)** — zod(`validation.ts:12-13`)와 저장소(`_shared/store.ts:129-130`)가 각각 막는다. 회귀 `inquiries.test.ts:93-95,399-401` |
| **최초 답변 시각이 사후에 바뀌지 않는다** | **충족(도메인 가드)** — `answeredAt` 은 비어 있을 때만 채워진다(`:134`). 회귀 `inquiries.test.ts:97-107`. **단 그 값이 요청 바디에 실려 있어 위조 가능하다**(BE-073 §7.9) |
| 답변 시각이 서버 시각이다 | **미충족** — `new Date().toISOString()`(`ProductInquiryDetailPage.tsx:198`)은 **브라우저 시계**다. 두 운영자의 시계가 다르면 응대 속도가 갈린다 |
| 미답변의 정의가 한 곳이다 | **충족** — `isUnanswered`(`_shared/store.ts:90-92`) 하나를 좌측 안내·배지·경과가 함께 읽는다. **견적 발행은 미답변이 아니다**(`:87-88`, 회귀 `inquiries.test.ts:459-461`) |
| 건수 배지가 필터에 흔들리지 않는다 | **충족** — 필터 이전 전체 집합에서 센다(`types.ts:97`). **0 과 '모름'도 구분한다**(`loaded` → `null` → `'—'`) |
| **경과가 실제 경과다** | **미충족** — 기준일이 `TODAY = '2026-07-21'` 하드코딩이라(목록 `:81` · 상세 `:68`) **날짜가 지나도 '3일째 미답변'이 늘지 않는다.** 주석이 그 사실을 인정한다(`:78-80`). **운영 값이 아니다** |
| 처리 이력이 본문과 갈라지지 않는다 | **충족(구조적)** — 이력이 저장된 사실의 **파생값**이라(`types.ts:203-210,211-269`) 갈라질 자리가 없다. 답변을 고치면 이력의 답변 칸도 함께 바뀐다 |
| 이력에 없는 사실 | **한계 인정** — 종결 시각을 저장하지 않아 종결 이벤트의 `at` 이 **답변 시각**이다. **문구가 그 사실을 밝힌다**(`types.ts:264` — `답변 발송(…) 후 문의가 종결되었습니다.`) — 숨기지 않는 것이 이 설계의 규약이다 |
| **덮인 답변의 흔적이 남는다** | **미충족.** 이력이 파생값이라 **이전 답변은 어디에도 남지 않는다.** 동시 편집이 last-write-wins 인 것(§4.2)과 합쳐지면 **앞선 운영자의 답변이 흔적 없이 사라진다** |
| 견적은 문의당 한 장이다 | **충족(멱등키 세 겹)** — `quoteId`(`_shared/store.ts:160`) · `quoteIssueBlock` ②(`quote-issue.ts:138`) · `findQuoteBySource`(`quotes/data-source.ts:148-151`). 회귀 `inquiries.test.ts:439-442` · `quote-issue.test.ts:95-136` |
| 다건 발행이 원자적이다 | **미충족** — 순차 `for await` 라 중간 실패 시 일부만 `quoteId` 를 갖는다(EXC-10 gap · BE-073 §7.4) |
| 견적 역링크가 유효하다 | **미충족** — 견적이 삭제돼도 `quoteId` 가 남아 '견적 보기'가 404 로 가고, **동시에 `quoteIssueBlock` ②가 재발행도 막는다.** 견적을 잃은 문의는 영원히 견적을 가질 수 없다(BE-073 §7.13 #12) |
| 견적 발행에 별도 권한이 걸린다 | **미충족(프론트)** — `canUpdate` 하나가 답변과 발행을 함께 지배한다. **서버 계약은 견적 create 권한을 추가로 요구한다**(BE-073 §7.4) |
| 고객 개인정보가 최소한으로 노출된다 | **미충족** — 목록 응답에 `customerContact`(연락처 원본)와 `message`(고객 원문)가 실린다(목록·상세가 같은 타입). **목록 화면이 쓰는 것은 8열뿐**이다(BE-073 §7.11) |
| 문의자 마스킹 | **미충족** — 목록의 문의자 셀(`:248`)과 상세의 연락처(`:402`)가 원본이다. **마스킹은 서버가 해야 한다**(BE-073 §7.8) |
| 비밀글 접근 제어 | **표면이 없다** — `secret`·`isPrivate`·`visibility` 필드가 **0건**(grep 실측). 접수 채널이 그 축을 만들면 계약이 함께 바뀌어야 한다(BE-073 §7.8) |
| 관리자가 문의를 만들거나 지울 수 없다 | **충족(UI)** — 호출부 0건이고 읽기 전용 껍데기다. **그러나 `create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다** — 부재가 코드로 강제되지 않는다(BE-073 §7.2) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | FEEDBACK-02 · FEEDBACK-05 | **P0** · P2 | **비가역 액션 셋(종결 · 견적 발행 · 최초 답변)에 확인 게이트가 없다.** `ConfirmDialog` grep 0건. 되돌아가는 전이가 코드에 하나도 없어 실수의 복구 경로가 없다 | 이 화면 | UI 기획 · 프론트 구현 (**최우선** · BE-073 §7.3·§7.13 #1) |
| 2 | EXC-04 · EXC-06 | **P0** · P1 | 409 해소 UI 없음(`isConflict` 분기 0건) · `If-Match`/`version` 없음 → **답변 본문이 last-write-wins**. 403/409/422/500 을 한 배너로 뭉개고 서버 문구도 통과시키지 않는다 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-073 §7.7 · §7.13 #3 · FS-073 §7 #23) |
| 3 | EXC-08 | **P0** | `submitLockRef`·멱등키 없음 — `useCrudForm` 미사용. **`crud.ts` 의 `idempotencyKey` 자리(`:243,354-355`)와 원장(`:193`)이 있는데 호출부가 비어 있다** | 이 화면 | UI 기획 · 백엔드 명세 (BE-073 §7.13 #2 · FS-073 §7 #15) |
| 4 | IA-02 | **P0** | sub-route 에서 AppHeader `<h1>문의</h1>` + 상세 자체 `<h1>상품 문의 처리</h1>` → **`<h1>` 2개.** 어느 쪽도 문의번호를 식별하지 못한다 | **앱 전역**(`AppHeader` 모델) | 프론트 구현 · UI 기획 (FS-073 §7 #10) |
| 5 | IA-04 · ERP-15 · COMP-07 · EXC-09(잔여) | **P0** · P1 · P2 | 페이지네이션 없음 — 전량 렌더. 순번 오프셋이 함께 붙어야 하는데 **소유가 공용 `CrudTable` 이다**. **URL list state 는 이미 `page`·`clampPage` 를 갖는다**(`useListState.ts:74,217`). 별건이나 같은 파일: **목록 발행 뮤테이션에 abort 배선이 없다**(`:208-232`) | 이 화면 + 공용 + BE 계약 | UI 기획 · 백엔드 명세 (BE-073 §7.11 · FS-073 §7 #3·#18) |
| 6 | (§4.3 · STATE-01 잔여) | — | **좌측 미답변 안내가 조회 실패에도 '세는 중'을 보인다** — 실패를 로딩으로 위장한다. 배지는 같은 상황에서 `'—'` 로 정직하다. **그리고 경과 기준일이 하드코딩이라 날짜가 지나도 늘지 않는다** | 이 화면 + BE 계약 | 프론트 구현 · 백엔드 명세 (BE-073 §7.13 #6 · FS-073 §7 #5·#19) |
| 7 | EXC-03(잔여) · EXC-07 · A11Y-13 | P1 | 답변 textarea 만 권한 없을 때 숨지 않고 비활성된다 — 이 화면 자신의 규칙에서 유일한 예외. **서버 422 를 필드로 되돌릴 경로가 없고**, 검증 실패 시 포커스도 옮기지 않는다 | 이 화면 | UI 기획 (BE-073 §7.13 #15 · FS-073 §7 #24·#25) |
| 8 | EXC-10 · EXC-18 · A11Y-16(잔여) | P1 | **다건 견적 발행이 원자적이지 않다**(순차 `for await`, 롤백·부분 보고 없음). 바구니에 **건수 상한도 Shift-click 도 없다**. 담기 토글이 announce 되지 않는다 | 이 화면 + BE 계약 | 백엔드 명세 · UI 기획 (BE-073 §7.4 · §7.13 #9 · FS-073 §7 #8) |
| 9 | FEEDBACK-01 · EXC-20 | P1 | **목록의 견적 발행 실패만 토스트**이고 retry 가 없다 — 가장 무거운 쓰기에 가장 약한 통지. 5xx 에 **복사 가능한 참조 코드가 없다** | 이 화면 | UI 기획 쪽 변경 요청 (FS-073 §7 #7·#28) |
| 10 | (§4.3) | — | **개인정보** — 연락처 원본과 고객 원문이 목록 응답에까지 실리고 마스킹이 없다. **비밀글 축은 코드에 없다** | 이 화면 + BE 계약 | **백엔드 명세 (BE-073 §7.8 · §7.13 #10)** |
| 11 | (§4.3) | — | **덮인 답변의 흔적이 남지 않는다** — 이력이 파생값이라 이전 답변이 사라진다. #2 와 한 뿌리다 | BE 계약 | 백엔드 명세 · 아키텍처 |
| 12 | (§4.3) | — | **견적 역링크가 끊어질 수 있고, 그때 재발행도 막힌다** — 견적 삭제가 참조 문의를 검사해야 한다 | BE 계약(견적 연동) | 백엔드 명세 (BE-073 §7.13 #12) |
| 13 | COMP-09 · COMP-12 | P2 | 상품명은 잘리는데 전체 값을 볼 수단이 없고 제목은 truncate 가 없다(반대 방향). 답변 상한 근접 경고 없음 | 이 화면 | UI 기획 (FS-073 §7 #14) |
| 14 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건. **BE-073 §2 의 '서버 상한 < 프론트 상한' 이 성립하지 않는다** | **앱 전역** | 프론트 구현 · UI 기획 (FS-073 §7 #27) |
| 15 | (FS-073 §7 #9·#11·#16·#22) | — | 이탈 가드가 `navigate()` 를 가로채지 못한다 · 목록과 상세의 발행 후 동작이 다르다(이동 vs 머무름) · 재조회가 편집 중 입력을 덮는다 · 저장 성공 직후 재조회 실패가 화면 전체를 배너로 대체한다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 16 | (BE-073 §7.2) | — | **`create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다** — 부재가 코드로 강제되지 않는다 | 이 화면 | UI 기획 쪽 변경 요청 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-22. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (어댑터 코드에서 확인)**

`productInquiryAdapter` 는 **`scope = PRODUCT_INQUIRY_RESOURCE = 'product-inquiries'`**(`data-source.ts:21,27`)로 `fixtureRequest` 에 스코프를 넘기고, 그 안에서 `failIfRequested(scope, op)` 가 판정한다(`dev.ts:90-98`). `createStoreAdapter` 가 4개 op 를 제공하나 **이 화면이 실제로 부르는 것은 3개**다:

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll`(`crud.ts:199-200`) | `?fail=list` · `?fail=product-inquiries:list` · `?fail=all` | FS-073-EL-014 배너 |
| `detail` | `fetchOne`(`crud.ts:202-207`) | `?fail=detail` · `?fail=product-inquiries:detail` · `?fail=all` | FS-073-EL-020 배너(404/그 밖 분기) |
| `save` | `update`(`crud.ts:238-243`) | `?fail=save` · `?fail=product-inquiries:save` · `?fail=all` | FS-073-EL-022 카드 배너 **그리고 목록의 견적 발행 실패 토스트**(EL-008) — **두 경로가 같은 op 을 공유한다**(발행이 내부적으로 `update` 를 돈다 — `:215-218`) |
| `delete` | `remove`(`crud.ts:265-270`) — **호출부 0건** | — | **`?fail=delete` 는 이 화면에서 아무 효과가 없다**(삭제 진입점 부재 — BE-073 §7.2) |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **필터 변경·`staleTime` 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`dev.ts:14-98`) — `?fail=` 이 언제나 같은 generic `Error` 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap**(현재 gap) |
| EXC-06 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 gap) |
| EXC-07 (422 필드 매핑) | `?status=save:422` — 답변 필드에 인라인 오류가 아니라 배너면 gap(현재 gap) |
| EXC-20 (reference code) | `?status=save:500` — 배너에 참조 코드가 보이는지. **현재 보이지 않는다**(gap). `?fail=save` 로는 애초에 재현되지 않는다 — generic `Error` 에는 `reference` 가 없다 |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fproducts%2Finquiries&reason=session_expired` 로 가면 pass |
| EXC-10 (다건 발행 부분 실패) | **`?status=` 만으로는 부족하다** — `save` 를 실패시키면 첫 건부터 막힌다. **중간 실패는 픽스처 조작이 필요하다**(N 번째 `update` 만 던지게). 그전까지는 코드 대조가 근거다 |
| FEEDBACK-02 (확인 게이트) | **스위치가 아니라 클릭으로 재현한다** — 답변 완료 문의에서 '문의 종결'을 누른다. **확인 없이 즉시 저장되면 gap**(현재 그렇다) |
| EXC-03 (쓰기 게이팅) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/products/inquiries` 의 `update` 를 끄면 견적 바구니 열과 액션 버튼 넷이 사라져야 한다(현재 pass) |
| EXC-21 (엔타이틀먼트) | **`?status=` 가 아니라 플랜**으로 재현한다 — `commerce.products` 를 내리면 `/products` 가지 전체가 잠기거나 사라진다. 판정은 `RequireEntitlement` 소유 |

**PG 축의 재현**(이 화면에만 있는 스위치): `/settings/payment` 에서 `usePg` 를 켜고 상점 ID 를 채우면 상품 CTA 가 '구매하기'로 바뀌고 이 화면의 유입이 끊긴다. **잔여 문의가 남아 있으면 메뉴 라벨에 `' · 읽기 전용'` 이 붙고(`inquiry-backlog.ts:132`), `total === 0` 이면 메뉴가 사라진다.** 그때도 **URL 직접 진입은 정상 렌더돼야 한다**(`nav-config.ts:311-312,327-336`) — 이것이 §4.2 의 한 줄을 재현하는 유일한 방법이다.

**미배선 seam 의 재현**: 견적 발행기와 잔여 집계는 `resetQuoteIssuer()` · `resetInquiryBacklogLookup()` 으로 미배선 상태를 만들 수 있다. **앱에서는 `src/wiring.ts` 가 전부 꽂으므로 브라우저에서 재현되지 않는다** — 이 경로의 방어선은 단위 테스트다(`quote-issue.test.ts:86-92,127-135`).

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · A11Y-11 · A11Y-12 · MOTION-03 · EXC-04 · EXC-08 · EXC-14 판정 — 전부 2026-07-22 실측) · RTL(A11Y-11 의 describedby↔alert id 일치) · **`inquiries.test.ts` 40여 케이스**(전이 4종·저장소 쓰기·필터/검색/집계·경과·이력·검증·문의번호 형식·견적 발행 멱등) · **`quote-issue.test.ts` 12케이스**(발행 가드 5분기 · 멱등 · 합치기 · 미배선). **이 화면에는 렌더 테스트(RTL)가 없다** — P0 gap 5건 중 어느 것도 회귀로 고정돼 있지 않다.

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **FEEDBACK-02 는 스위치가 아니라 클릭으로, EXC-10 은 픽스처 조작이 필요함을 §6 에 명시**했다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 폼 modal 부재 · IA-05 폼 라우트 쌍 부재). **STATE-04 는 절반만 표면이 없어 `n-a` 가 아니라 실재하는 절로 `pass` 판정**했고 그 근거(견적 바구니 수명 규칙)를 댔다
- [x] §2.1 산수 검산 — **13 pass + 11 종속 + 2 n-a + 5 gap = 31** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. 공유 컴포넌트(`FilterPanel`)의 소비는 **화면의 선택**이므로 A11Y-12 를 `직접`으로 판정했다(§1.1)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·CSV·정렬 헤더·optimistic·일괄 삭제)은 적지 않았다. **EXC-10 은 견적 바구니라는 bulk 표면이 실재하므로 넣었고 gap 으로 판정**했다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다. **다건 발행이 `1 + N` 왕복이라는 사실을 별도 줄로 세웠다**
- [x] §4.3 을 **답변 무결성 · 개인정보 · 감사** 축으로 세우고 견적 발행 멱등·역링크·권한까지 포함했다. **비밀글 축이 코드에 없다는 사실도 적었다**
- [x] §6 의 `?fail=` scope(**`product-inquiries`**)와 op 를 **어댑터 코드에서 확인**했고(`delete` 가 무효임 · **발행과 저장이 `save` 를 공유함** 포함), **`?delay=` 를 쓰지 않았다**
- [x] §5 의 gap 이 FS-073 §7 · BE-073 §7.13 과 대응한다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 전부 '측정 불가(백엔드 없음)'로 남겼고, E2E 를 돌리지 않았음을 §1·§6 에 명시했으며, **이 화면에 렌더 테스트가 없어 P0 gap 5건이 회귀로 고정돼 있지 않다는 사실**도 §6 에 적었다
