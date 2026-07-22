---
id: NFR-076
title: "프로그램 문의 비기능 명세"
functionalSpec: FS-076
backendSpec: BE-076
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-076. 프로그램 문의 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-076 프로그램 문의 (`/programs/inquiries` · `/programs/inquiries/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-076(요소·예외) · BE-076(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) · **NFR-073(쌍둥이 화면)** |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. gap 은 §5 를 거쳐 이관되며 FS-076 §7 · BE-076 §7.14 와 대응해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **앱 공용 프레임워크(`shared/crud` · `shared/ui` 컴포넌트·훅 · `shared/permissions`)의 소비 여부도 화면의 선택이므로 직접이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(queryClient·RequireAuth·ToastProvider·RequireEntitlement)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**마감이 있는 판매의 창구다.** `pgSellable` 이 false 면 프로그램 페이지의 '후원하기'가 '문의하기'로 바뀌고 그 문의가 이 목록으로 들어온다(`payment-settings.ts:100-103,109-114`). **상품 문의와 결정적으로 다른 점은 시간이다** — 펀딩은 마감이 있어 답이 늦으면 후원 자체가 사라지고, 코드가 그 판단을 **`OVERDUE_DAYS = 2`**(`types.ts:214`, 상품은 3)로 못박았으며 **화면 문구로도 사용자에게 말한다**(`ProgramInquiryListPage.tsx:378-381`).

그래서 이 화면의 P0 를 무겁게 읽는 자리도 조금 다르다: **비가역 액션의 게이트(FEEDBACK-02)** 와 **동시성(EXC-04)** 은 상품 문의와 같은 무게지만, **응답 지연을 만드는 모든 것**(EXC-05 timeout 부재 · EXC-11 offline 부재 · ERP-15 전량 렌더)이 여기서는 **매출 손실 경로**다.

**이 화면에만 있는 축이 판정을 하나 더 만든다**: **문의 유형(topic)** 이 좌측 필터 두 번째 패널·표의 한 열·상세의 배지와 정의 목록에 동시에 나타난다. 그 축이 **처리하는 사람을 가르는데 바꿀 수단이 없다는 사실**(BE-076 §7.3)은 quality-bar 가 다루지 않으므로 §4.3 에서 판정한다.

**그리고 플랜 축이 없다**: 이 라우트는 `MODULE_RESOURCES` 에 매핑되지 않아 **언제나 granted** 다(BE-076 §7.8) — EXC-21 의 근거가 NFR-073 과 갈리는 유일한 P0 셀이다.

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **네 개의 data view 가 전부 `{first-load, refetching-with-data, empty, error}` 중 하나만 그린다.** ① **목록**: `ProgramInquiryListPage.tsx:167` 이 `firstLoading = isFetching && data === undefined` 를 파생해 껍데기에 넘기고(`:411`), 껍데기가 그 값만 스켈레톤(`CrudReadListShell.tsx:126`)·요약(`:119`)에 쓴다. busy 는 `refreshing` 으로 분리돼(`:118-120`) 재조회 중 이전 행이 유지된다(`placeholderData` — `crud.ts:298`). ② **상태 배지**와 ③ **유형 배지**가 **각각** `loaded = !firstLoading && error === null`(`:173`)일 때만 세고 아니면 `null` → `'—'`(`FilterPanel.tsx:33,153`) — **두 패널이 동시에 0/모름을 구분한다**(`:174-181`). ④ **상세**: `inquiry === undefined` 로 로딩(`ProgramInquiryDetailPage.tsx:281-284`)이고 **error 분기가 항상 앞선다**(`:240`). **경미 잔여**: 좌측 레일의 미답변 안내가 `loaded` 를 조건으로 써(`:374-377`) 조회 실패에도 '미답변 건수를 세는 중입니다.'가 남는다 — 실패를 로딩으로 위장한다(§5 #6) | `/programs/inquiries` 진입 → 렌더 확인 → 유형 필터 변경으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 덮이면 gap.** `?fail=list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인. **두 패널의 배지가 동시에 `'—'` 가 되는지도 확인** | **pass** |
| STATE-02 | STATE | 직접 | 두 read 실패가 인라인 danger `Alert` + 명시적 복구 컨트롤이다. **목록**(`CrudReadListShell.tsx:154-161`) '프로그램 문의 목록을 불러오지 못했습니다.' + '다시 시도'. **상세**(`ProgramInquiryDetailPage.tsx:240-263`) 404 → '문의를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로' / 그 밖 → '문의를 불러오지 못했습니다.' + **'다시 시도'** + '목록으로'. read 실패에 toast 를 쓰지 않고(`toast` 소비는 저장 성공 `:181` 과 목록 발행 `ProgramInquiryListPage.tsx:230,235` — 전부 write), empty 로 폴백하지 않는다 | `?fail=list` · `?fail=detail` 로 각 조회를 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass** | **pass** |
| STATE-04 | STATE | 직접 | **두 절 중 실재하는 절을 충족하며, 그 절이 상품 문의보다 축이 하나 많다.** ① *page clamp* — 페이지네이션이 없어 표면이 없다(부재 자체는 IA-04 가 잡는다). ② *숨겨진 행의 선택 해제* — **실재하고 충족한다.** 선택은 삭제용 체크박스가 아니라 **견적 바구니**이고(`:195-197`), `useEffect(() => setBasket(new Set()), [status, topic, list.keyword])`(`:205-207`)가 **상태·유형·검색 셋 중 하나라도 바뀌면** 비운다 — 상품 문의는 두 축이다. 주석이 요구 번호를 인용한다(`:204` — `(STATE-04-b, 형제 목록과 같은 처리)`). 재조회로 항목이 사라져도 `basketItems` 가 `items` 에서 되짚으므로(`:209`) 자동으로 빠진다 | 문의 2건을 담고 **유형 필터만** '환불'로 바꾼다. **막대가 사라지고 바구니가 비면 pass** — 상태를 건드리지 않아도 비워져야 한다 | **pass** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/programs/inquiries/**` 에 primitive tier 밖 hex · `[0-9]+px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 실측 2026-07-22). 파생 치수는 `calc(${cssVar('space.6')} * 9)`(`ProgramInquiryListPage.tsx:93`) · `* 14`(`:109`) · `* 8`(`:121`) · `* 12`(`ProgramInquiryDetailPage.tsx:100`) 같은 space 토큰 배수로만 표현한다. `boxShadow` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/programs/inquiries` → **0건이어야 한다** | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(상세 '목록으로' `ProgramInquiryDetailPage.tsx:269` · 발행 견적 `Link` `:333` · 목록 '견적 보기' `<a>` `ProgramInquiryListPage.tsx:300` · `DetailCellLink`) · DS `<Button>`·`<TextareaField>`·`<SearchField>` · 공유 `FilterPanel` **2개**의 토글 버튼. **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 로컬 `:focus-visible` 선언이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: DS Table 스켈레톤 펄스 · Toast(`:181` · 목록 `:230,235`) · DS `<Button>` transition · 이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건 실측) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` **최대 4개**(처리 카드 · 문의자 정보 · 처리 이력 · 로딩) · `<Alert>` 4종 · Toast · 이탈 가드 Modal. **이 화면이 `boxShadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`ProgramInquiryDetailPage.tsx:278`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)를 참조한다. 카드 제목은 `CardTitle`(`<h2>`). **목록에는 in-content `<h1>` 이 없다**(IA-02 가 그 모순을 다룬다) | `/programs/inquiries/:id` 의 '프로그램 문의 처리' `<h1>` 의 computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거친다: `ProgramInquiryListPage.tsx:326-333` 이 `value`/`onChange` 와 **`{...list.searchInputProps}`** 를 스프레드한다. 그 props 가 `onCompositionStart`/`End` + `onKeyDown` 을 실어(`useListState.ts:50-51`) 조합 중 커밋을 막고 조합 종료 후 **250ms 디바운스**로 `?q=` 에 커밋한다(`:144`). 순서 뒤바뀐 응답이 없다 — 검색이 클라이언트 필터라 요청이 나가지 않는다(`:184-187`) | 검색창에 IME 로 '헤드폰' 입력. **조합 중 'ㅎ'·'헤' 가 URL·필터에 커밋되지 않아야 pass.** 완성 후 정확히 1회만 `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **미충족.** 비가역 액션 **셋** 중 어느 것도 확인 다이얼로그를 거치지 않는다(`ConfirmDialog` grep 히트 0건 — 유일한 다이얼로그는 이탈 가드의 `intent="discard"`). ① **문의 종결**(`ProgramInquiryDetailPage.tsx:379-383`) — `closed` 가 답변 수정과 견적 발행을 동시에 영구히 닫는다(`_shared/store.ts:105,110`) ② **견적 발행**(`:385-389`) — `quoteId` 가 박히면 재발행이 영원히 막히고(`quote-issue.ts:138`) 견적번호가 채번된다 ③ **최초 답변 저장**(`:390-400`) — `answeredAt` 이 찍히고 다시 바뀌지 않는다(`_shared/store.ts:141`). **되돌아가는 전이가 코드에 하나도 없다**(`:25-27`). **이 도메인에서 무게가 더하다** — 마감이 있어 잘못 종결한 문의를 되살릴 시간 자체가 없다(§1.2) | 답변 완료 상태의 문의에서 '문의 종결'을 클릭. **확인 없이 즉시 상태가 바뀌면 gap**(현재 그렇다). `grep -rn "ConfirmDialog" apps/admin/src/pages/programs/inquiries` = 0건으로도 판정된다 | **gap** |
| FEEDBACK-04 | FEEDBACK | 직접 | `ProgramInquiryDetailPage.tsx:156` 이 `useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `dirty` 는 도메인 판정(`:155`)이며 계약상 RHF `isDirty` 와 등가다. 3경로(beforeunload `useUnsavedChangesDialog.tsx:127` · 앱 내 링크 capture `:133` · popstate sentinel `:178`)는 훅이 소유하고 `intent="discard"` `ConfirmDialog` 를 세운다(`:211-213`). 저장 성공 시 재조회가 `answer` 를 되돌려 dirty 가 풀린다(`:150-153`) | 상세에서 답변 입력 후 ① 탭 닫기 ② 사이드바 링크 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** **주의**: '목록으로' 2개(`:271,370`)는 `navigate()` 라 가드 밖이다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-076 §7 #8) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** **편집 가능한 폼을 담은 modal 이 없다** — 답변 폼은 상세 라우트의 `Card` 로 렌더된다(`ProgramInquiryDetailPage.tsx:287-402`). 유일한 modal 은 이탈 가드 `ConfirmDialog` 이며 입력 필드가 없다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success(message)`(`:181`) — 문구가 호출부에서 **4종**으로 갈린다(최초 답변 · 답변 수정 · 답변 착수 · 종결 — `:204,210,236`) + 견적 발행(`:230`) · 목록의 발행 성공(`ProgramInquiryListPage.tsx:230`)과 **실패 error toast**(`:235`). 지속 live region 은 `ToastProvider` 가 소유한다(polite `:165` · assertive `:168`) | ToastProvider 판정에 종속. 저장 성공과 발행 실패가 각각 polite·assertive 로 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 **1개**: 이탈 가드 `ConfirmDialog`(`useUnsavedChangesDialog.tsx:211-213`). `aria-describedby`→message 배선은 DS 가 소유한다 | DS 판정에 종속 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 2개를 전수 확인했다.** ① **답변 `TextareaField`**(`ProgramInquiryDetailPage.tsx:343-356`) — `error={fieldError ?? undefined}` 를 넘기면 DS 가 `aria-invalid` + `aria-describedby`(error id) + `role="alert"` 를 **내부에서 짝으로** 세운다. ② **`SearchField`**(`ProgramInquiryListPage.tsx:326-333`) — `label` 로 접근 이름을 받고 오류 상태가 없다. **유형·상태는 입력이 아니라 필터 토글이라 이 요구가 아니라 A11Y-12 에 걸린다.** **짝 없는 `aria-invalid` 0건**(grep 실측: 이 디렉터리에 히트 **0건** — 전부 DS 내부) | `grep -rn "aria-invalid" apps/admin/src/pages/programs/inquiries` → 0건. RTL 로 답변을 비운 채 '답변 저장'을 눌러 `textarea.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert | **pass** |
| A11Y-12 | A11Y | 직접 | **좌측 필터가 `FilterPanel` 두 개이고 둘 다 `aria-pressed` 만 쓴다**(`FilterPanel.tsx:145`) — 상태 패널(`ProgramInquiryListPage.tsx:390-397`)과 **유형 패널**(`:398-405`). 두 패널이 각자 `nav aria-label` 을 갖는다('프로그램 문의 상태 필터' · '프로그램 문의 유형 필터'). 컴포넌트 머리말이 요구 번호를 인용하며 이유를 적는다(`FilterPanel.tsx:17-19`). **이 화면 전체에 `aria-current` grep 0건**(실측). `aria-pressed` 의 다른 히트 1건은 견적 바구니 '담기' 토글(`:310`)로 같은 규약의 올바른 사용이다. **패널이 둘이라 상품 문의보다 판정 표면이 넓다** — 두 패널에서 각각 정확히 하나씩 `aria-pressed="true"` 여야 한다 | `grep -rn "aria-current" apps/admin/src/pages/programs/inquiries` = 0건. 상태='접수' + 유형='환불' 선택 시 `button[aria-pressed="true"]` 가 **정확히 2개**(각 패널 1개)인지 확인 | **pass** |
| MOTION-01 | MOTION | 상속 | Modal 표면 **1개**(이탈 가드). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다(grep 0건) | DS Modal 판정에 종속 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 4종 + 발행 성공/실패. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 표면: DS Table 스켈레톤 펄스 · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건 실측) | 전역 motion config·`ui.css` 판정에 종속 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:344-345`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록의 최상위는 2열 그리드(`ProgramInquiryListPage.tsx:369`)이고 상세는 평범한 `<div style={pageStyle}>`(`:266`)다. **메뉴에서 감춰져도 라우트는 살아 있고**(`nav-config.ts:311-312,327-336`) 그 경우에도 셸 안에서 렌더된다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족.** `findCoveringLeaf` 덕에 브랜치 폴백은 없다 — `/programs/inquiries/:id` 는 잎 `/programs/inquiries`(`nav-config.ts:202`)를 찾아 AppHeader 가 `<h1>문의</h1>` 을 그린다. **그러나 상세가 자체 `<h1>프로그램 문의 처리</h1>` 를 또 그린다**(`ProgramInquiryDetailPage.tsx:278`) → **`<h1>` 이 2개**다. 목록은 in-content `<h1>` 이 없어 **title 소스 모델이 화면 타입마다 모순**이고, **어느 쪽도 문의번호(`PGQ-…`)도 유형도 식별하지 못한다** — 유형이 담당을 가르는 축인데(BE-076 §7.3) 제목이 그것을 말하지 않는다. 조건부 메뉴라 AppHeader 라벨에 `' · 읽기 전용'` 이 붙을 수도 있다 | `/programs/inquiries/:id` 진입 후 `document.querySelectorAll('h1').length` 확인. **2 이면 gap** | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색(`:322-335`) → 결과 count 요약(`CrudReadListShell.tsx:118-121`) → table(`:124`). 우상단 primary 등록 버튼 부재는 **정당한 N/A**(BE-076 §7.2). SelectionBar 자리는 **견적 바구니 막대**가 대신한다(`:337-364`). **미충족: Pagination 이 없다.** 껍데기가 `visibleItems` 전량을 넘긴다. **게다가 이 표는 10열(순번 + 9열 + 바구니)이라 상품 문의보다 한 열 넓다** — 가로 스크롤 컨테이너가 완화하지만(`CrudReadListShell.tsx:37`) 행 수와 열 수가 함께 는다 | 픽스처를 30건 이상으로 늘리고 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 문의 생성이 범위 밖이고 답변은 상세 라우트 안의 카드에서 일어난다. `App.tsx:344-345` 가 라우트 2개(목록·상세)뿐임을 보인다 | 이 화면에 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | **세 축의 단일 원천이 URL 쿼리스트링**이다 — 상품 문의보다 하나 많다. `:149` 가 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { status: 'all', topic: 'all' }` — `:80-83`), 그 훅이 `?status=`·**`?topic=`**·`?q=` 를 읽고 쓴다. 기본값과 같은 값은 URL 에서 지워지고 손으로 고친 값은 `parseFilter` 두 번(`:151-160`)이 각각 '전체'로 되돌린다. 결과: 두 축을 걸고 상세에 들어갔다 Back 하면 조건이 복원되고 링크로 공유할 수 있다. **`sort`·`page` 는 표면이 없어 쓰이지 않는다**(IA-04 gap) | `/programs/inquiries` 에서 상태='접수' + 유형='리워드' + 검색='PGQ-2026' 적용 → URL 이 `?status=received&topic=reward&q=PGQ-2026` 인지 확인 → 행 클릭 → Back. **세 조건이 모두 복원되면 pass** | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary` + `RouteErrorScreen`. 이 화면은 자체 경계를 두지 않는다 | ErrorBoundary 소유 문서 판정에 종속 | **종속** |
| EXC-02 | EXC | 상속 | 상속하는 두 경로: ① `RequireAuth` 의 진입 가드 ② `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError` → `notifySessionExpired()`(`queryClient.ts:60-66`). **조회 2종·저장·발행이 전부 이 인터셉터를 통과한다** | `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fprograms%2Finquiries&reason=session_expired` 로 이동하는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **충족.** ① **read 게이팅(상속)**: `RequirePermission` 이 `<Outlet>` 을 감싸 403 화면을 렌더하고, `/programs/inquiries` 는 `/programs` 보다 긴 잎이라 **별개 리소스로 갈린다**. ② **write 게이팅(직접)**: 목록 `:146` 과 상세 `:131` 이 `useRouteWritePermissions().canUpdate` 를 구독하고 그 값이 쓰기 표면 **전부**를 지배한다 — 목록의 **견적 바구니 열 자체가 없어지고**(`:320`) 바구니 막대도 없어지며(`:337`), 상세의 액션 버튼 **넷이 렌더되지 않는다**(`:374,379,385,390`). ③ **안내 문구가 그 사실을 미리 밝힌다**(목록 `:386` · 상세 `:365-367`). ④ **강등 reconcile**: 훅 구독자가 재렌더돼 별도 코드 없이 사라진다. ⑤ **행 클릭은 `detail` 목적지라 read 로 게이팅된다**(`CrudTable.tsx:306`). **경미 잔여**: 답변 `textarea` 만 숨지 않고 `disabled` 된다(`:351`) — 이 화면 자신의 규칙(`:373`)에서 유일한 예외다(§5 #7) | 권한 스토어에서 `page:/programs/inquiries` 의 `update` 를 끈 뒤 목록·상세 진입. **바구니 열과 액션 버튼 넷이 사라지고 안내 문구 2종이 뜨면 pass** | **pass** |
| EXC-04 | EXC | 직접 | **미충족.** ① **유령 저장은 해소됐다** — 어댑터가 없는 id 에 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` 를 던진다(`crud.ts:256-258`). ② **그러나 화면에 409 해소 UI 가 없다** — `onError`(`ProgramInquiryDetailPage.tsx:184-187`)에 `isAbort` 분기만 있고 `isConflict` 가 **없다**(grep 0건). 409 는 고정 배너로 떨어져 **재시도하면 또 409 인 실패에 재시도를 권한다.** ③ **낙관적 동시성 토큰이 없다** — `version`/`updatedAt`/`If-Match` grep **0건**(실측) → **동시 편집은 last-write-wins** 이고 덮이는 값은 **답변 본문 그 자체**다(BE-076 §7.12). ④ **이 화면 고유의 아이러니**: **같은 도메인의 프로그램 폼(FS-074)은 `useCrudForm` 의 충돌 다이얼로그를 이미 갖고 있다** — 한 도메인 안에서 갈렸고, 그래서 이 gap 은 새로 만들 것이 아니라 **옮겨 오면 되는 것**이다 | `?status=save:409` 로 '답변 저장'. **conflict 다이얼로그 없이 일반 배너만 뜨면 gap.** 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/programs/inquiries` → 0건으로 확인(실측 0건) | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `commit`(`ProgramInquiryDetailPage.tsx:171-190`)에 **동기 제출 락(`submitLockRef`)이 없고 멱등키도 없다**(grep **0건** 실측) — `useCrudForm` 을 쓰지 않고 저수준 `useCrudUpdate` 를 직접 부르기 때문이다. **자리는 이미 비어 있다**: `UpdateVars.idempotencyKey`(`crud.ts:344-345`)와 어댑터 원장(`:67-77,243`)이 존재하는데 `update.mutate({ id, input, signal })`(`:176-177`)가 키를 넣지 않아 **원장이 영원히 발현되지 않는다.** 방어는 `disabled={saving}` + DS `loading` 하나뿐이다. **목록의 견적 발행도 같다**(`ProgramInquiryListPage.tsx:357`, 내부 루프 `:220-223`). **완화 요인 둘**: 저장이 **전체 치환**(13필드)이라 두 번 실행돼도 최종 상태가 같고, **견적 이중 발행은 `quoteId` 멱등키 세 겹이 막는다**(BE-076 §7.5) | '답변 저장'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되면 gap.** `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/programs/inquiries` = 0건으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | **상세에 네 지점이 배선돼 있다.** ① **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:147`). ② **저장 시작마다 새 컨트롤러**(`:174-175`). ③ **onSuccess** — `if (controller.signal.aborted) return;`(`:180`). ④ **onError** — `if (isAbort(cause)) return;`(`:185`). 공유 predicate `isAbort`(`shared/async`)를 쓴다. **경미 잔여**: 목록의 견적 발행 뮤테이션에 `AbortController` 가 **0건**(`:213-237`)이라 발행 도중 이탈하면 `navigate`·`toast` 가 언마운트 후에 돈다 — abort 가 발생하지 않으므로 거짓 실패를 만들지는 않지만 요구의 정신에서는 잔여다(§5 #5) | 상세에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass** | **pass** |
| EXC-21 | EXC | 상속 | **이 화면은 거절 UI 를 소유하지 않으며, 네 계열 중 하나는 아예 발생하지 않는다.** ① **플랜 계열 — 발생하지 않는다.** `MODULE_RESOURCES`(`module-resources.ts:29-91`)에 **`/programs` 로 시작하는 리소스가 하나도 없어** `entitlementKeyForResource` 가 `null` 이고 `entitlementStateForResource` 가 **언제나 `granted`** 를 돌려준다(`route-entitlement.ts:23-29`). 그것은 fail-open 규약의 결과이지 누락의 증거가 아니다(`:10-12`). **NFR-073 과 갈리는 유일한 P0 셀이다** — 상품 문의는 `commerce.products` 에 속한다. ② **인증·권한 계열**: `RequireAuth`·`RequirePermission` 이 `<Outlet>` 바깥에서 각각 소유한다. ③ **설정 계열**: PG 설정이 이 화면에 영향을 주지만 **거절 화면을 만들지 않는다** — 메뉴 가시성만 바꾸고(`resolveNavLeaf` — `nav-config.ts:314-324`) **라우트는 살아 있다**(`:311-312,327-336`). 따라서 **한 화면에 두 계열이 섞일 표면 자체가 없다**(이 디렉터리에 `entitlement` grep 0건) | **플랜으로는 재현되지 않는다** — 어떤 플랜을 내려도 이 화면은 열린다(그 사실 자체를 확인하는 것이 이 셀의 재현이다). 권한 축은 `RequirePermission` 으로, 설정 축은 PG 토글로 재현하고 **두 화면이 동시에 뜨지 않는지**만 확인한다 | **종속** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-04 · A11Y-11 · A11Y-12 · IA-01 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-21 |
| `n-a` | **2** | FEEDBACK-06 · IA-05 |
| `gap` | **5** | FEEDBACK-02 · IA-02 · IA-04 · EXC-04 · EXC-08 |
| **합계** | **31** | 13 + 11 + 2 + 5 = **31** ✓ |

> **P0 gap 5건 — quality-bar '배치 실패' 사유.** **건수는 NFR-073 과 같고 근거의 무게가 다르다**: FEEDBACK-02 는 **마감이 있는 판매**라 실수를 되돌릴 시간이 없고(§1.2), EXC-04 는 **같은 도메인의 프로그램 폼이 이미 해답을 갖고 있어** 고칠 거리가 가장 짧으며, IA-04 는 **열이 하나 더 많아**(유형) 부담이 크다. IA-02·IA-04 는 앱 전역의 같은 뿌리를 공유하므로 **횡단 배치**로 푸는 것이 옳다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·정렬 헤더·optimistic write·일괄 삭제)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:298`)로 이전 행을 유지하고 `staleTime`(`queryClient.ts:70`)이 재조회 시점을 지배한다. 껍데기가 요약에 `· 새로고침 중…`을 덧붙이고 `aria-busy={refreshing}` 을 건다(`CrudReadListShell.tsx:118-121`) | 재조회에서 이전 행이 유지되고 요약에 새로고침 표시가 뜨는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 3분기를 소비한다(`CrudTable.tsx:378-390` ← `:422-428`) — `createVerb="접수"` · `hasQuery` · `hasActiveFilters` · 복구 액션 2종. **`hasActiveFilters` 가 두 축을 함께 본다** — 유형만 걸어 0건이 돼도 '필터 초기화'가 뜬다. 조사는 `Empty` 소유 | 유형='기타'로 0건을 만들어 '필터에 맞는 …' + 필터 초기화가 나오는지 | **pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:356-358`) 화면이 상세를 재조회한다(`:182`). 목록의 발행 성공도 목록 키만 무효화한다(`:228`) | 상세에서 답변 저장 후 목록 복귀 시 상태 배지·경과·**두 건수 배지**가 갱신돼 있는지 | **pass** |
| COMP-01 | P1 | 모든 액션 버튼이 DS `<Button>` 이고 진행 상태를 **`loading` prop** 으로 표현한다(`:394` · 목록 `:355`). `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/programs/inquiries` = **0건**. 상세 '목록으로'(상단)만 `<button>` + 로컬 스타일인데(`:267-275`) **아이콘+텍스트 back affordance 라 의도된 예외**다 | 위 grep 이 0건인지 | **pass** |
| COMP-03 | P1 | 툴바 검색이 DS `<SearchField>` molecule 이다(`:326-333`) — raw `<input type="search">` 재구현이 없다 | `grep -rn "type=\"search\"" apps/admin/src/pages/programs/inquiries` = 0건 | **pass** |
| COMP-05 | P2 | **좌측 필터 컨테이너가 공유 `FilterRail` 이고 그 안에 `FilterPanel` 두 개를 세로로 쌓는다**(`:370-406`) — 로컬 wrapper/group 스타일 복제가 0건이다. **패널이 둘인 화면에서 특히 중요하다** — 각자 컨테이너를 조립했다면 두 패널의 간격·구분이 갈렸을 것이다 | 두 패널 사이의 간격·구분선이 다른 화면의 단일 패널과 같은 규칙인지 | **pass** |
| COMP-06 | P2 | 스켈레톤이 DS Table 소유다(`CrudReadListShell.tsx:126` 이 `loading` 만 넘긴다). **다만 DS 가 정한 행 수가 PAGE_SIZE 와 맞는지는 페이지네이션이 없어 판정할 기준값이 없다** | 페이지네이션 도입 후 스켈레톤 행 수 === PAGE_SIZE 인지 | **pass(기준값 부재)** |
| COMP-07 | P2 | `SeqCell seq={index + 1}`(`CrudTable.tsx:331`) — `startIndex` 가 없다. 현재는 페이지네이션이 없어 실제 오류가 나지 않지만 IA-04 해소 시 2페이지 첫 행이 1로 리셋된다. **소유가 공용 `CrudTable` 이라 이 화면 단독으로는 못 고친다** | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지 | **gap(잠재 · 공용)** |
| COMP-08 | P2 | **중복 '상세' 버튼이 없다.** 요구의 (a) 형태 그대로다: whole-row 클릭(`ROW_TARGET` — `:86-89`) + **row 내 접근 가능한 링크 하나**(제목 `DetailCellLink` — `:254-259`). 마지막 열(견적 바구니)은 다른 목적지의 액션이다 | 읽기전용 리스트에 중복 '상세' 버튼이 없는지 | **pass** |
| COMP-09 | P2 | **한 표 안에서 두 규칙이 반대다.** 프로그램명 셀은 ellipsis 로 자르는데(`:119-125`) **`title` 도 툴팁도 없어 전체 값을 볼 수단이 없고**, 제목 셀은 truncate 가 없어(`:254-259`) 긴 값이 열을 넓힌다. **이 표는 10열이라 상품 문의보다 여유가 적다.** 완화: 가로 스크롤 컨테이너(`CrudReadListShell.tsx:37`) | 200자 프로그램명·200자 제목 픽스처로 표 폭과 전체 값 확인 | **gap** |
| COMP-12 | P2 | 답변 textarea 가 `maxLength={1000}` 과 `TextareaField` 의 카운터를 갖는다(`:350`). **그러나 상한 근접 경고가 없고 네이티브 `maxLength` 가 입력을 잘라 '조용히 멈춘' 것처럼 보인다.** counting 기준(`trim().length` — `validation.ts:14`)도 사용자에게 명시되지 않았다 | 1000자 근접 시 경고가 뜨는지, 초과 붙여넣기가 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 대체로 규칙과 일치한다: read 실패=인라인 Alert · write 성공=toast(`:181`) · **상세 write 실패=카드 배너**(`:296`). **그러나 목록의 견적 발행 실패만 toast 다**(`:235`) — 같은 화면 안에서 실패 통지의 자리가 갈리고 **가장 무거운 쓰기가 자동 소멸하는 통지를 쓴다.** 그 toast 에 '다시 시도'도 없다 | `?fail=save` 로 상세 저장 → 배너, 목록 발행 → toast 임을 확인. **발행 실패 toast 가 자동 소멸하고 retry 가 없으면 gap** | **gap** |
| FEEDBACK-03 | P1 | 네 액션 전부 성공·실패 양 경로가 배선돼 있다(`commit` — `:171-190`). **no-op 클릭이 없다** — 버튼의 존재 조건이 전이 술어라 눌리는 순간 반드시 통과한다(BE-076 §7.1), 검증 실패는 인라인 오류를 세운다(`:195-199`) | `?fail=save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | **비가역 액션 셋에 confirm 도 undo window 도 없다**(FEEDBACK-02 P0 와 같은 뿌리). 삭제가 없어 delete 절은 걸리지 않지만 '종결'과 '견적 발행'은 요구가 말하는 비가역 액션 그 자체다 | 비가역 액션이 confirm 또는 undo window 를 갖는지 → 둘 다 없다 | **gap** |
| A11Y-03 | P1 | ConfirmDialog 표면 1개(이탈 가드). 초기 포커스(discard intent → Cancel)는 DS 가 소유한다 | DS 판정에 종속 | **종속** |
| A11Y-08 | P1 | **충족.** 행 클릭이 DS Table 소유(마우스 전용)이고 **행 안에 같은 목적지의 focusable 링크가 있다** — 제목 `DetailCellLink`(`:254-259`). `:255` 주석이 의도를 명시한다 | 행을 Tab 해서 제목 링크에 도달하고 Enter 로 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | 상세 진입 시 답변 필드에 자동 포커스가 없고 검증 실패 시 그 필드로 포커스가 이동하지 않는다 — `useCrudForm` 의 `setFocus` 를 상속하지 못했다. 오류는 문구만 꽂는다(`:197-198`) | 답변을 비운 채 '답변 저장' → `activeElement` 가 textarea 인지 | **gap** |
| A11Y-16 | P1 | 목록에 **항상 마운트된 polite live region** 이 있다(`CrudReadListShell.tsx:110-112`, 문장 3분기 `:73-83`). 그 밖: 두 필터의 `nav aria-label`(`:391,399`) · 링크 접근 이름 · **유형·상태·경과를 색이 아니라 배지 라벨로 이중 인코딩**(`:286` 주석) · 바구니 토글 `aria-pressed` · 처리 이력 `Timeline label="프로그램 문의 처리 이력"`(`:425`). **이 화면 고유의 강점**: 처리 이력의 접수 문구가 **채널과 유형을 함께 말해**(`types.ts:286`) 스크린리더가 배지 두 개를 따로 읽지 않아도 맥락을 얻는다(회귀 `inquiries.test.ts:417-422`). **잔여**: 담기 토글의 결과가 announce 되지 않는다 — 막대는 조건부 마운트 `Alert` 다 | 유형 필터로 0행을 만들 때 스크린리더가 사유를 읽는지(pass). 담기 토글이 announce 되는지(현재 안 된다 — §5 #8) | **pass(경미 잔여)** |
| ERP-01 | P1 | status→tone **과 topic→tone** 이 화면 전용 모듈의 단일 레지스트리다 — `types.ts:31-38`(`STATUS_META`)과 **`:67-73`(`TOPIC_META`)**. per-page helper 를 만들지 않았고 **목록의 유형 배지와 상세의 유형 배지가 같은 톤 함수를 쓴다**(`ProgramInquiryListPage.tsx:266` · `ProgramInquiryDetailPage.tsx:300`) — 한 값이 두 화면에서 다른 색이 되지 않는다. `Record<…>` 로 키를 다 적어 값이 늘면 컴파일이 막는다. 다만 지역 레지스트리라 앱 전역은 아니다 | 모든 status·topic 이 정의된 tone 으로 해석되는지. **목록과 상세의 유형 배지 색이 같은지** | **pass(도메인 내)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `formatNumber`(`:342,375`), 시각이 `formatDateTime`(`:282` · 상세 `:316,319`)을 경유한다. **좌측 안내가 도메인 사실까지 말한다**('마감이 있는 펀딩이라 답변이 늦으면 후원이 사라집니다.' — `:378-381`) | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-08 | P2 | 수량·건수가 `formatNumber`, 시각이 `formatDateTime` 을 경유한다. **접수일 셀도 `formatDateTime` 을 쓴다**(`:282`). 문의번호에 `tabular-nums` 가 붙어 있다(`:113-117`) | 셀의 raw 문자열 렌더가 0건인지 | **pass** |
| ERP-09 | P2 | 시각 표면이 전부 `formatDateTime` 을 경유하고, 저장은 **UTC(Z)** · 표기는 **KST 환산**이라는 정책이 저장소 머리말에 명시돼 있다(`_shared/store.ts:16-18`). 문의번호의 날짜도 `seoulDayOf` 로 **KST 달력일**을 계산한다(`:310-315`). **회귀가 그 경계값을 고정한다** — `2026-07-20T22:10:00Z` 를 '오늘 접수'로 읽는 케이스(`inquiries.test.ts:361-364`)는 문자열을 잘랐다면 어제가 되는 값이다 | UTC ISO 입력이 러너 OS 타임존과 무관하게 같은 wall-clock 을 렌더하는지 | **pass(상속)** |
| ERP-13 | P1 | 사용자 대상 문자열에 **리터럴 조사 폴백이 0건**이다(grep 실측). 빈 상태의 조사는 `Empty` 가 받침으로 고르고, 견적번호를 interpolate 하는 토스트는 **`objectParticle` 헬퍼를 쓴다**(`ProgramInquiryDetailPage.tsx:230` · 목록 `:230`) | 사용자 대상 문자열의 조사 폴백 grep = 0 | **pass** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — cap·virtualization 이 없다. **이 화면은 10열이라 행당 DOM 노드가 상품 문의보다 많다.** 문의는 상한 없이 증가하고 PG 를 끈 기간에는 증가율이 결제 설정에 종속된다(BE-076 §7.7). 완화 둘: 검색 디바운스(COMP-10) · 가로 스크롤 컨테이너 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. **마감이 있는 도메인이라 무응답이 특히 비싸다** — 운영자가 저장됐는지 모른 채 기다리는 시간이 그대로 후원 이탈 시간이다. BE-076 §2 가 발행 상한을 10초로 잡으므로 '서버 상한 < 프론트 상한' 관계를 만들 프론트 쪽이 없다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **부분 충족.** `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. 상세 조회의 404 와 그 밖은 실제로 분기한다(`:240-263`). **그러나 저장 실패는 403/409/422/500 을 한 문구로 뭉갠다**(`:186`) — `isForbidden`·`isConflict` 가 존재하는데 쓰지 않는다(grep 0건 실측). **서버 문구도 통과시키지 않는다**(언제나 고정 문장) | `?status=save:403` · `save:409` · `save:429` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **서버 422 를 필드로 되돌릴 경로가 없다** — `violations` 를 읽는 코드가 0건이다. 클라이언트 zod 오류는 인라인으로 가지만(`:195-199,352`) 서버 오류는 전부 카드 배너로 수렴한다. **이 화면은 되돌릴 필드가 셋이라**(BE-076 EP-03 의 `status`·`answer`·`topic`) 상품 문의보다 잃는 정보가 많다 | `?status=save:422` → 답변 필드에 인라인 오류가 뜨는지. **배너만 뜨면 gap** | **gap** |
| EXC-10 | P1 | **표면이 실재하고 미충족이다.** 견적 바구니의 다건 발행이 bulk 작업인데 `Promise.allSettled` semantics 가 아니라 **순차 `for await`** 다(`ProgramInquiryListPage.tsx:219-224`). 중간 실패 시 앞의 것만 `quoteId` 를 갖고 나머지는 견적 없이 남으며 **롤백 경로가 없고 실패 토스트는 어느 것이 남았는지 말하지 않는다**(`:235`). 'N중 M건 실패' 보고도 실패분만 재시도하는 경로도 없다. **서버 계약이 이를 한 트랜잭션으로 뒤집고 채널 혼합까지 검증한다**(BE-076 §7.5) | 문의 3건을 담고 두 번째 update 를 실패시킨다. **어느 것이 발행됐는지 화면이 말하지 않으면 gap** | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 문구·복구 수단으로 가른다(`:240-263`). 근본이 갖춰져 있다 — 어댑터가 `HttpError(404)` 를 던지고(`crud.ts:217-219`) 화면이 `isNotFound` 로 읽는다. 무한 spinner 없음(`inquiry === undefined` 는 error 분기 뒤) | 없는 `:id`(`/programs/inquiries/nope`) 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음). `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적이다. `onMutate`/`setQueryData` grep = **0건**(실측) | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-18 | P1 | **selection scope 는 정의돼 있으나 안전장치가 없다.** 범위는 명확하다 — 바구니는 `items`(필터 이전 전량)에서 되짚고(`:209`) **세 축 중 하나만 바뀌어도 비워진다**(`:205-207`, STATE-04 pass). 실행 전 '문의 N건을 한 견적으로 합칩니다.' 배너도 있다(`:342`). **그러나 Shift-click 도 전체 선택도 건수 상한도 없고 발행은 비가역이다** | 바구니에 100건을 담을 수 있는지, 그 상태에서 발행이 경고 없이 실행되는지 | **gap** |
| EXC-20 | P1 | **미충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 가 없다** — `referenceOf` 호출부가 0건이고 `useCrudForm` 의 `errorReference` 를 상속하지 못했다. 배너는 언제나 고정 문장(`:186`)이라 운영자가 신고할 근거가 없다. **raw 서버 body·stack trace 노출도 없다** — 요구의 후반절은 충족한다 | `?status=save:500` → 배너에 참조 코드가 보이는지. **없으면 gap** | **gap** |
| EXC-22 | P1 | **세 축의 실패 방향이 다르다는 규약을 이 화면이 소비하며, 그중 하나가 특히 선명하다**: 권한 축은 fail-closed(`RequirePermission`), **엔타이틀먼트 축은 fail-open 이고 이 라우트가 바로 그 fail-open 의 수혜자다** — 매핑이 없어 `granted` 로 수렴한다(`route-entitlement.ts:10-12,23-29`). 결제 축은 fail-closed(`pgSellable` — `payment-settings.ts:120-130`)라 MID 공란이면 판매 불가로 수렴하고 그 결과가 이 화면의 유입이 된다. **양방향 단위 테스트는 소유 모듈에 있다**(`route-entitlement.test.ts` · `payment-settings.test.ts`) | 소유 문서 판정에 종속. 이 화면에서는 자체 판정 코드가 0건임만 확인 | **종속** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-076 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다.** 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일. **상세는 `placeholderData` 를 쓰지 않아**(`useQuery` 직접 — `:133-137`) 재진입마다 로딩 문구가 뜬다 |
| 답변 저장 p95 | ≤ 700ms (BE-076 §2 서버 상한 5초) | **측정 불가.** 저장 후 상세 재조회 1회가 뒤따른다(`:182`) |
| **견적 발행 p95** | **≤ 2s** (BE-076 §2 서버 상한 10초 → 504) | **측정 불가.** 견적 생성 + 문의 다건 잠금이 한 트랜잭션이어야 하는데 **현재 프론트는 `1 + N` 요청으로 쪼갠다**(`:219-224`)(EXC-10 gap) |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**하고 **행당 셀이 10개**라 상품 문의보다 계수가 크다(ERP-15 gap) |
| **필터·검색 연산** | 커밋당 전량 1-pass | **두 축을 한 번에 건다** — `filterProgramInquiries`(`types.ts:134-144`)가 한 `filter` 안에서 AND 를 판정해 `filter().filter()` 2-pass 를 만들지 않는다(`:133` 주석). 그 뒤 `searchProgramInquiries` 가 4필드를 1-pass. **총 2-pass 로 고정**이다 |
| **건수 배지 산출** | 진입당 2회(상태·유형) | `useMemo([items, loaded])` 두 개(`:174-181`) — **필터 변경으로는 다시 계산하지 않는다**(필터 이전 집합을 세므로 옳다). **두 배지가 서로를 흔들지 않는 성질이 여기서 나온다** |
| 재조회 횟수 | 진입당 1회. `staleTime` 내 재진입 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime`(`:70`) · `retry: false`(`:82`) · `refetchOnWindowFocus: false`(`:90`) 를 명시 — **충족** |
| 저장 성공 후 재조회 | 상세 1회(`:182`) + 무효화된 목록 1회 | **적정** |
| 저장 요청 크기 | ≤ 8KB | **미충족 — 상한이 없다.** `ProgramInquiryInput` **13필드**(상품 문의보다 하나 많다)에 `message`(후원자 원문)와 `answer`(최대 1000자)가 들어간다. `message` 에 계약상 상한이 없다. BE-076 §7.6 안 A 가 이를 `{ status, answer }` 둘로 줄인다 |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. 문의는 상한 없이 증가 |
| 번들 | 이 화면 고유 코드 ≤ 22KB(gzip) | 미측정. 외부 의존 0. 화면 2개(432행 + 434행) + 도메인 3파일(`types.ts` 336행 · `validation.ts` 28행 · `_shared/store.ts` 367행) — **유형 축 때문에 상품 문의보다 각각 조금씩 길다** |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudReadListShell.tsx:154-161`). 툴바·좌측 레일은 살아남는다. **단 좌측 미답변 안내가 '세는 중'으로 남아 실패를 로딩으로 위장한다**(§5 #6) — **두 배지는 같은 상황에서 `'—'` 로 정직하다** |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너와 입력 보존은 되나 **참조 코드가 없고**(EXC-20 gap) 서버 문구도 통과시키지 않는다(EXC-06 gap) |
| 저장 실패(422 전이) | 그 사유를 보인다 | **미충족** — 고정 문구로 뭉개진다(EXC-07 gap). **다만 정상 경로에서는 도달하기 어렵다** — 버튼의 존재 조건이 같은 술어라(BE-076 §7.1) 다른 운영자가 먼저 옮긴 경우에만 나온다 |
| 저장 실패(409 동시 삭제) | conflict 다이얼로그 + 입력 보존 | **미충족** — 일반 배너로 뭉개진다. **같은 도메인의 프로그램 폼(FS-074)은 그 다이얼로그를 갖고 있다**(EXC-04 gap) |
| **동시 처리(두 운영자)** | 나중 저장이 앞선 답변을 덮지 않는다 | **미충족.** 토큰이 없어 **답변 본문이 last-write-wins** 다(BE-076 §7.12). 불법 전이만 저장 시점 재판정이 막는다 |
| 연타(더블클릭) | 정확히 1개 요청 | **미충족**(EXC-08 gap). **완화**: 전체 치환이라 최종 상태가 같고 견적 이중 발행은 멱등키 세 겹이 막는다 |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **단 서버 도달 여부는 보장하지 않는다** |
| **발행 중 이탈** | abort · 언마운트 후 부수효과 없음 | **미충족** — 목록의 발행 뮤테이션에 `AbortController` 가 0건이라 `navigate`·`toast` 가 언마운트 후에 돈다(§5 #5) |
| 견적 발행기 미배선 | 조용히 성공하지 않는다 | **충족** — `quoteIssueBlock` ④가 `견적 발행을 사용할 수 없습니다. 관리자에게 문의하세요.` 를 돌려주고 버튼이 비활성되며 **그 사유가 막대에 그대로 뜬다**(`:341-344`). 회귀 `quote-issue.test.ts:86-92` |
| 잔여 문의 집계 미배선 | 메뉴를 지우지 않는다 | **충족(fail-open)** — `readInquiryBacklog('program')` 이 `null` 이면 `inquiryMenuState` 가 `archive` 로 읽어 메뉴를 남긴다(`inquiry-backlog.ts:121`) |
| PG 를 켜서 메뉴가 사라진 뒤 | 과거 문의에 URL 로 접근 가능 | **충족** — `collectNavRoutes()` 가 `resolveNavLeaf` 를 지나지 않는다(`nav-config.ts:327-336`) |
| **플랜을 내렸을 때** | 이 화면이 잠긴다 | **해당 없음 — 잠기지 않는다.** 매핑이 없어 언제나 `granted` 다(BE-076 §7.8). **의도인지 누락인지 확정이 필요하다**(§5 #12) |
| 세션 만료 중 답변 작성 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 답변을 버린다(EXC-19 P1) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역). **마감이 있는 도메인이라 대기 시간이 곧 손실이다** |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 답변 · 견적 발행 무결성 · 개인정보 · 감사

이 화면은 **후원자에게 그대로 나가는 글**과 **응대 속도라는 사실**과 **견적이라는 산출물**을 만들고, 그 위에 **담당을 가르는 분류(topic)** 를 하나 더 얹는다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

**① 답변 무결성**

| 요구 | 현재 상태 |
|---|---|
| 답변과 상태가 갈라지지 않는다 | **충족(도메인 가드)** — 본문·답변시각·상태가 `applyProgramAnswer` 한 함수에서만 함께 움직인다(`_shared/store.ts:12-14,130-144`). 회귀 `inquiries.test.ts:81-118` |
| 빈 답변이 '답변 완료'로 집계되지 않는다 | **충족(이중 방어)** — zod(`validation.ts:12-13`)와 저장소(`_shared/store.ts:136-137`)가 각각 막는다. 회귀 `inquiries.test.ts:95-99,448-450` |
| **최초 답변 시각이 사후에 바뀌지 않는다** | **충족(도메인 가드)** — `answeredAt` 은 비어 있을 때만 채워진다(`:141`). 근거가 후원 맥락으로 적혀 있다(`:126-127` — `후원자에게 한 약속이 언제 나갔는지는 나중에 고쳐 쓸 수 없는 사실이다`). 회귀 `inquiries.test.ts:101-110`. **단 요청 바디에 실려 있어 위조 가능하다**(BE-076 §7.6) |
| 답변 시각이 서버 시각이다 | **미충족** — `new Date().toISOString()`(`ProgramInquiryDetailPage.tsx:203`)은 **브라우저 시계**다 |
| 미답변의 정의가 한 곳이다 | **충족** — `isProgramInquiryUnanswered`(`_shared/store.ts:96-98`) 하나를 좌측 안내·배지·경과가 함께 읽는다. **견적 발행은 미답변이 아니다**(회귀 `inquiries.test.ts:504-506`) |
| **경과가 실제 경과다** | **미충족** — 기준일이 `TODAY = '2026-07-21'` 하드코딩이라(목록 `:77` · 상세 `:70`) **날짜가 지나도 '2일째 미답변'이 늘지 않는다.** **프로그램 도메인은 이 상수를 다섯 파일에 복제해 갖는다**(FS-076 §7 #4) — 고칠 때 함께 고쳐야 한다 |
| **표시 임계와 집계 SLA 가 다르다** | **한계 인정** — 화면은 `OVERDUE_DAYS = 2`(`types.ts:214`), 대시보드의 `slaBreached` 는 24시간(`wiring.ts` 가 접는 집계)이다. **같은 문의가 목록에서는 warning 인데 대시보드에서는 이미 SLA 위반일 수 있다.** 두 값은 서로 다른 질문에 답하므로 통합하지 않되, 정의가 어디에 있는지를 계약이 밝혀야 한다(BE-076 §7.4) |
| 처리 이력이 본문과 갈라지지 않는다 | **충족(구조적)** — 이력이 저장된 사실의 **파생값**이라(`types.ts:272-277`) 갈라질 자리가 없다 |
| 이력에 없는 사실 | **한계 인정** — 종결 시각을 저장하지 않아 종결 이벤트의 `at` 이 **답변 시각**이다. 문구가 그 사실을 밝힌다(`types.ts:331`) |
| **덮인 답변의 흔적이 남는다** | **미충족.** 이력이 파생값이라 이전 답변이 어디에도 남지 않는다. 동시 편집이 last-write-wins 인 것(§4.2)과 합쳐지면 **앞선 운영자의 답변이 흔적 없이 사라진다** |

**② 견적 발행 무결성**

| 요구 | 현재 상태 |
|---|---|
| 견적은 문의당 한 장이다 | **충족(멱등키 세 겹)** — `quoteId`(`_shared/store.ts:165`) · `quoteIssueBlock` ②(`quote-issue.ts:138`) · `findQuoteBySource`(`quotes/data-source.ts:148-151`). 회귀 `inquiries.test.ts:487-491` · `quote-issue.test.ts:95-136` |
| 발행 버튼과 발행의 거절이 같은 술어를 읽는다 | **충족** — 단건(`:164-165,385`)·다건(`ProgramInquiryListPage.tsx:211,356`)·저장소(`_shared/store.ts:166`)가 전부 같은 공통 층 함수를 읽는다(BE-076 §7.1). **눌리는데 실패하는 버튼이 없다** |
| **다건 발행이 원자적이다** | **미충족** — 순차 `for await` 라 중간 실패 시 일부만 `quoteId` 를 갖고 롤백 경로가 없다(EXC-10 gap · BE-076 §7.5) |
| **채널이 섞이지 않는다** | **충족(구조적) · 서버는 재확인해야 한다** — 각 화면의 바구니가 자기 도메인 항목만 담아 상품 문의와 프로그램 문의를 한 견적으로 합칠 수 없다. **그러나 발행기는 하나를 공유한다**(`wiring.ts:188`) — 서버가 요청에서 채널 혼합을 검증해야 하는 이유다(BE-076 EP-04 검증 5) |
| 견적으로 넘어가는 값이 한 곳에서 정의된다 | **충족** — `toProgramQuoteIssueSource`(`_shared/store.ts:176-186`) 하나. **품목 = 프로그램명 · 거래처 라벨 = 후원자 이름**(개인 후원자라 회사가 없다 — `:173`). 회귀 `inquiries.test.ts:521-526` |
| 견적 역링크가 유효하다 | **미충족** — 견적이 삭제돼도 `quoteId` 가 남아 '견적 보기'가 404 로 가고, **동시에 `quoteIssueBlock` ②가 재발행도 막는다.** 견적을 잃은 문의는 영원히 견적을 가질 수 없다(BE-076 §7.14 #14) |
| 견적 발행에 별도 권한이 걸린다 | **미충족(프론트)** — `canUpdate` 하나가 답변과 발행을 함께 지배한다. **서버 계약은 견적 create 권한을 추가로 요구한다**(BE-076 §7.5) |
| **견적이 후원으로 이어졌는지 안다** | **불가** — 문의 → 견적까지는 배선돼 있으나 그 견적이 실제 후원·펀딩 달성으로 반영되는 경로가 없다. **PG 를 끈 운영에서 이것이 매출 인식의 끊긴 지점이다**(BE-076 §7.14 #10) |

**③ 유형(topic) · 개인정보 · 감사**

| 요구 | 현재 상태 |
|---|---|
| 유형이 담당을 가른다 | **정의는 충족** — `TOPIC_META`(`types.ts:67-73`)가 다섯 값을 전수 대응하고 **돈이 걸린 유형(환불·결제)에 warning** 을 준다(회귀 `inquiries.test.ts:225-229`). 목록·상세가 같은 톤 함수를 쓴다 |
| **잘못 분류된 문의를 옮길 수 있다** | **미충족.** 재분류 수단이 코드에 **0건**이다 — 상세는 `dd` 로 표시만 한다(`:412-413`). **그런데 `ProgramInquiryInput` 에는 필드가 있고**(`_shared/store.ts:205`) 전체 치환 저장이라 **기술적으로는 이미 바뀔 수 있다.** 축의 존재 이유가 '처리하는 사람이 다르다'인데(`types.ts:64-65`) 후원자가 잘못 고른 유형은 **영원히 잘못된 담당에게 남고, 마감은 흘러간다**(BE-076 §7.3) |
| 두 건수 배지가 서로를 흔들지 않는다 | **충족** — 각각 필터 이전 전체 집합에서 센다(`types.ts:147-175`). 회귀 `inquiries.test.ts:286-300`. **페이징을 도입하면 서버가 둘 다 내려보내야 한다**(BE-076 §7.11) |
| 후원자 개인정보가 최소한으로 노출된다 | **미충족** — 목록 응답에 `customerContact`(연락처 원본)와 `message`(후원자 원문)가 실린다(목록·상세가 같은 타입). **목록이 쓰는 것은 9열뿐**이다(BE-076 §7.11) |
| 후원자 마스킹 | **미충족** — 목록의 문의자 셀(`:253`)과 상세의 연락처(`:410`)가 원본이다. **마스킹은 서버가 해야 한다**(BE-076 §7.9) |
| **유형 자체가 민감정보다** | **미인지** — '환불'로 접수된 문의는 그 후원자의 이탈 의사를 드러낸다. 그런데 그 값이 **목록 배지로 평문 노출**된다(`:261-270`). 은닉 정책을 서버가 정해야 한다(BE-076 §7.9) |
| 비밀글 접근 제어 | **표면이 없다** — `secret`·`isPrivate`·`visibility` 필드가 **0건**(grep 실측). 접수 채널이 그 축을 만들면 계약이 함께 바뀌어야 한다 |
| 관리자가 문의를 만들거나 지울 수 없다 | **충족(UI)** — 호출부 0건이고 읽기 전용 껍데기다. **그러나 `create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다**(BE-076 §7.2) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | FEEDBACK-02 · FEEDBACK-05 | **P0** · P2 | **비가역 액션 셋(종결 · 견적 발행 · 최초 답변)에 확인 게이트가 없다.** `ConfirmDialog` grep 0건. **마감이 있는 도메인이라 실수를 되돌릴 시간 자체가 없다** | 이 화면 | UI 기획 · 프론트 구현 (**최우선** · BE-076 §7.14 #1) |
| 2 | EXC-04 · EXC-06 | **P0** · P1 | 409 해소 UI 없음 · `If-Match`/`version` 없음 → **답변 본문이 last-write-wins**. 403/409/422/500 을 한 배너로 뭉갠다. **같은 도메인의 프로그램 폼(FS-074)이 이미 그 다이얼로그를 갖고 있어 옮겨 오면 된다** | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-076 §7.12 · §7.14 #3 · FS-076 §7 #23) |
| 3 | EXC-08 | **P0** | `submitLockRef`·멱등키 없음 — `useCrudForm` 미사용. **`crud.ts` 의 자리(`:243,354-355`)와 원장(`:193`)이 있는데 호출부가 비어 있다** | 이 화면 | UI 기획 · 백엔드 명세 (BE-076 §7.14 #2 · FS-076 §7 #14) |
| 4 | IA-02 | **P0** | sub-route 에서 `<h1>` 2개. **어느 쪽도 문의번호도 유형도 말하지 않는다** — 유형이 담당을 가르는 축인데 제목이 그것을 숨긴다 | **앱 전역**(`AppHeader` 모델) | 프론트 구현 · UI 기획 (FS-076 §7 #9) |
| 5 | IA-04 · ERP-15 · COMP-07 · EXC-09(잔여) | **P0** · P1 · P2 | 페이지네이션 없음 — **10열 전량 렌더**. 순번 오프셋의 소유가 공용 `CrudTable` 이다. **URL list state 는 이미 `page`·`clampPage` 를 갖는다**(`useListState.ts:74,217`). 같은 파일의 별건: **목록 발행 뮤테이션에 abort 배선이 없다**(`:213-237`) | 이 화면 + 공용 + BE 계약 | UI 기획 · 백엔드 명세 (BE-076 §7.11 · FS-076 §7 #2·#17) |
| 6 | (§4.3 · STATE-01 잔여) | — | **좌측 미답변 안내가 조회 실패에도 '세는 중'을 보인다**(두 배지는 `'—'` 로 정직하다). **그리고 경과 기준일이 하드코딩이라 날짜가 지나도 늘지 않는다 — 프로그램 도메인은 그 상수를 다섯 파일에 복제해 갖는다** | 이 화면 + BE 계약 | 프론트 구현 · 백엔드 명세 (BE-076 §7.14 #5 · FS-076 §7 #4·#18) |
| 7 | EXC-03(잔여) · EXC-07 · A11Y-13 | P1 | 답변 textarea 만 권한 없을 때 숨지 않고 비활성된다 — 이 화면 자신의 규칙에서 유일한 예외. **서버 422 를 필드로 되돌릴 경로가 없고**(되돌릴 필드가 셋이다) 검증 실패 시 포커스도 옮기지 않는다 | 이 화면 | UI 기획 (BE-076 §7.14 #17 · FS-076 §7 #24·#25) |
| 8 | EXC-10 · EXC-18 · A11Y-16(잔여) | P1 | **다건 견적 발행이 원자적이지 않다**(순차 `for await`, 롤백·부분 보고 없음). 바구니에 **건수 상한도 Shift-click 도 없다**. 담기 토글이 announce 되지 않는다 | 이 화면 + BE 계약 | 백엔드 명세 · UI 기획 (BE-076 §7.5 · §7.14 #11 · FS-076 §7 #7) |
| 9 | FEEDBACK-01 · EXC-20 | P1 | **목록의 견적 발행 실패만 토스트**이고 retry 가 없다. 5xx 에 **복사 가능한 참조 코드가 없다** | 이 화면 | UI 기획 쪽 변경 요청 (FS-076 §7 #6·#28) |
| 10 | (§4.3 ③) | — | **문의 유형(topic)을 재분류할 수단이 없다** — 축의 존재 이유가 '처리하는 사람이 다르다'인데 잘못 분류된 문의가 영원히 잘못된 담당에게 남는다. **`Input` 에는 필드가 있어 기술적으로는 이미 바뀐다** | 이 화면 + BE 계약 | **아키텍처 (도메인 · 선행 판단)** · UI 기획 (BE-076 §7.3 · §7.14 #6 · FS-076 §7 #20) |
| 11 | (§4.3 ③) | — | **개인정보** — 연락처 원본과 후원자 원문이 목록 응답에까지 실리고 마스킹이 없다. **유형 배지 자체가 이탈 의사를 드러내는 민감정보인데 평문 노출된다.** 비밀글 축은 코드에 없다 | 이 화면 + BE 계약 | **백엔드 명세 (BE-076 §7.9 · §7.14 #12)** |
| 12 | (§4.2 · EXC-21 근거) | — | **이 라우트가 어떤 엔타이틀먼트 모듈에도 매핑돼 있지 않다** — 프로그램 트리 전체가 `MODULE_RESOURCES` 에 없어 **언제나 granted** 다. 상용 판단인지 누락인지 확정이 필요하다(상품 문의는 `commerce.products` 소속) | **앱 전역**(상용 패키징) | **아키텍처 (BE-076 §7.8 · §7.14 #7)** |
| 13 | (§4.3 ①) | — | **덮인 답변의 흔적이 남지 않는다** — 이력이 파생값이라 이전 답변이 사라진다. #2 와 한 뿌리다. **답변 시각도 클라이언트 시계다** | BE 계약 | 백엔드 명세 · 아키텍처 (BE-076 §7.14 #15) |
| 14 | (§4.3 ②) | — | **견적 역링크가 끊어질 수 있고 그때 재발행도 막힌다.** 그리고 **견적이 후원으로 이어졌는지 잇는 계약이 없다** — PG 를 끈 운영에서 매출 인식의 끊긴 지점이다 | BE 계약(견적·프로그램 연동) | 백엔드 명세 · **아키텍처 (BE-076 §7.14 #10·#14)** |
| 15 | COMP-09 · COMP-12 | P2 | 프로그램명은 잘리는데 전체 값을 볼 수단이 없고 제목은 truncate 가 없다(반대 방향). **10열이라 여유가 더 적다.** 답변 상한 근접 경고 없음 | 이 화면 | UI 기획 (FS-076 §7 #12) |
| 16 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건. **마감이 있는 도메인이라 대기 시간이 곧 손실이다** | **앱 전역** | 프론트 구현 · UI 기획 (FS-076 §7 #27) |
| 17 | (FS-076 §7 #8·#13·#15·#22) | — | 이탈 가드가 `navigate()` 를 가로채지 못한다 · 목록과 상세의 발행 후 동작이 다르다(이동 vs 머무름) · 재조회가 편집 중 입력을 덮는다 · 저장 성공 직후 재조회 실패가 화면 전체를 배너로 대체한다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 18 | (FS-076 §7 #29 · BE-076 §7.14 #19) | — | **상품 문의 모듈과 이 모듈이 사실상 같은 코드·같은 계약을 두 벌 갖는다** — 실제 차이는 **유형 축 · SLA 임계 · 엔타이틀먼트 매핑 · 낱말** 넷뿐이다. **이 문서와 NFR-073 의 P0 판정이 건수까지 같은 것이 그 증거다** — 한쪽만 고치면 갈라진다 | **아키텍처 (선행 판단)** | 아키텍처 · UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-22. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (어댑터 코드에서 확인)**

`programInquiryAdapter` 는 **`scope = PROGRAM_INQUIRY_RESOURCE = 'program-inquiries'`**(`data-source.ts:21,27`)로 `fixtureRequest` 에 스코프를 넘기고, 그 안에서 `failIfRequested(scope, op)` 가 판정한다(`dev.ts:90-98`). **상품 문의와 scope 가 다르므로 두 화면을 따로 실패시킬 수 있다.** `createStoreAdapter` 가 4개 op 를 제공하나 **이 화면이 실제로 부르는 것은 3개**다:

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll`(`crud.ts:199-200`) | `?fail=list` · **`?fail=program-inquiries:list`** · `?fail=all` | FS-076-EL-015 배너 |
| `detail` | `fetchOne`(`crud.ts:202-207`) | `?fail=detail` · **`?fail=program-inquiries:detail`** · `?fail=all` | FS-076-EL-021 배너(404/그 밖 분기) |
| `save` | `update`(`crud.ts:238-243`) | `?fail=save` · **`?fail=program-inquiries:save`** · `?fail=all` | FS-076-EL-023 카드 배너 **그리고 목록의 견적 발행 실패 토스트**(EL-009) — **두 경로가 같은 op 을 공유한다**(발행이 내부적으로 `update` 를 돈다 — `:220-223`) |
| `delete` | `remove`(`crud.ts:265-270`) — **호출부 0건** | — | **`?fail=delete` 는 이 화면에서 아무 효과가 없다**(삭제 진입점 부재 — BE-076 §7.2) |

> **스코프 없는 `?fail=list` 는 상품 문의도 함께 실패시킨다**(`target === op` 이면 스코프를 보지 않는다 — `dev.ts:122`). 두 화면을 가르려면 **`program-inquiries:` 접두사를 반드시 붙인다.**

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **필터 변경·`staleTime` 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`dev.ts:14-98`) — 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap**(현재 gap). **같은 조작을 프로그램 폼(FS-074)에서 하면 다이얼로그가 뜬다** — 두 화면을 나란히 재현하는 것이 이 gap 의 가장 빠른 증명이다 |
| EXC-06 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 gap) |
| EXC-07 (422 필드 매핑) | `?status=save:422` — 답변 필드에 인라인 오류가 아니라 배너면 gap(현재 gap) |
| EXC-20 (reference code) | `?status=save:500` — 배너에 참조 코드가 보이는지. **현재 보이지 않는다**(gap) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fprograms%2Finquiries&reason=session_expired` 로 가면 pass |
| EXC-10 (다건 발행 부분 실패) | **`?status=` 만으로는 부족하다** — `save` 를 실패시키면 첫 건부터 막힌다. **중간 실패는 픽스처 조작이 필요하다.** 그전까지는 코드 대조가 근거다 |
| FEEDBACK-02 (확인 게이트) | **스위치가 아니라 클릭으로 재현한다** — 답변 완료 문의에서 '문의 종결'을 누른다. **확인 없이 즉시 저장되면 gap**(현재 그렇다) |
| EXC-03 (쓰기 게이팅) | **권한 스토어**로 재현한다 — `page:/programs/inquiries` 의 `update` 를 끄면 견적 바구니 열과 액션 버튼 넷이 사라져야 한다(현재 pass) |
| **EXC-21 (플랜)** | **재현되지 않는다** — 어떤 플랜을 내려도 이 화면은 열린다(`MODULE_RESOURCES` 에 `/programs` 0건 — BE-076 §7.8). **그 사실 자체를 확인하는 것이 이 셀의 재현이다.** 상품 문의(`commerce.products` 를 내린다)와 나란히 재현하면 차이가 드러난다 |

**두 축 필터의 재현**(이 화면에만 있는 절차): `?status=received&topic=refund` 로 진입해 **두 패널의 `aria-pressed` 가 각각 하나씩만 true 인지**, **두 건수 배지가 서로 흔들리지 않는지**(유형을 바꿔도 상태 배지의 수가 그대로인지), **바구니가 유형 변경만으로도 비워지는지**(STATE-04)를 확인한다.

**PG 축의 재현**: `/settings/payment` 에서 `usePg` 를 켜고 상점 ID 를 채우면 프로그램 CTA 가 '후원하기'로 바뀌고 이 화면의 유입이 끊긴다. **잔여 문의가 남아 있으면 메뉴 라벨에 `' · 읽기 전용'` 이 붙고(`inquiry-backlog.ts:132`), `total === 0` 이면 메뉴가 사라진다.** 그때도 **URL 직접 진입은 정상 렌더돼야 한다**(`nav-config.ts:311-312,327-336`).

**미배선 seam 의 재현**: `resetQuoteIssuer()` · `resetInquiryBacklogLookup()` 으로 미배선 상태를 만들 수 있다. **앱에서는 `src/wiring.ts` 가 전부 꽂으므로 브라우저에서 재현되지 않는다** — 이 경로의 방어선은 단위 테스트다(`quote-issue.test.ts:86-92,127-135`).

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1).

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · A11Y-11 · A11Y-12 · MOTION-03 · EXC-04 · EXC-08 · EXC-14 판정 — 전부 2026-07-22 실측) · RTL(A11Y-11 의 describedby↔alert id 일치) · **`inquiries.test.ts` 50여 케이스**(전이 4종·저장소 쓰기·**두 축 필터/집계**·검색·경과(**2일 임계**)·이력(**채널+유형 문구**)·검증·문의번호 형식·견적 발행 멱등) · **`quote-issue.test.ts` 12케이스**. **이 화면에는 렌더 테스트(RTL)가 없다** — P0 gap 5건 중 어느 것도 회귀로 고정돼 있지 않다.

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다 — **이 화면의 것**(유형 패널 2개 · 3축 URL · 10열 표 · `OVERDUE_DAYS = 2`)으로 댔지 쌍둥이 화면의 근거를 옮기지 않았다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **FEEDBACK-02 는 클릭으로, EXC-10 은 픽스처 조작으로, EXC-21 은 '재현되지 않음을 확인하는 것'이 재현임**을 §6 에 명시했다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 폼 modal 부재 · IA-05 폼 라우트 쌍 부재). **STATE-04 는 실재하는 절(견적 바구니의 3축 수명)로 `pass` 판정**했다
- [x] §2.1 산수 검산 — **13 pass + 11 종속 + 2 n-a + 5 gap = 31** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적었다. 공유 컴포넌트(`FilterPanel` **2개**)의 소비는 화면의 선택이므로 A11Y-12 를 `직접`으로 판정했다(§1.1)
- [x] **EXC-21 의 근거가 NFR-073 과 갈리는 유일한 P0 셀임을 명시**하고 코드로 확인했다(`module-resources.ts` 에 `/programs` 0건 → 언제나 granted)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다. **COMP-05(필터 컨테이너)는 패널이 둘인 이 화면에서 실재하므로 넣었고**, EXC-10 은 견적 바구니라는 bulk 표면이 실재하므로 gap 으로 판정했다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다. **두 축 필터가 2-pass 로 고정이고 건수 배지가 둘이라는 사실**을 별도 줄로 세웠다
- [x] §4.3 을 **① 답변 무결성 ② 견적 발행 무결성 ③ 유형·개인정보·감사** 셋으로 갈랐다 — **유형 축과 표시/집계 임계의 불일치는 이 화면에만 있는 항목**이다
- [x] §6 의 `?fail=` scope(**`program-inquiries`**)와 op 를 **어댑터 코드에서 확인**했고(`delete` 무효 · **발행과 저장이 `save` 공유** · **스코프 없는 스위치가 상품 문의까지 함께 실패시킴** 포함), **`?delay=` 를 쓰지 않았다**
- [x] §5 의 gap 이 FS-076 §7 · BE-076 §7.14 와 대응한다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 전부 '측정 불가(백엔드 없음)', E2E 미실행을 §1·§6 에 명시했고, **이 화면에 렌더 테스트가 없어 P0 gap 5건이 회귀로 고정돼 있지 않다는 사실**도 적었다. **엔타이틀먼트 매핑 부재가 의도인지 누락인지는 판단하지 않고 §5 #12 로 이관했다**
