---
id: NFR-051
title: "문의 비기능 명세"
functionalSpec: FS-051
backendSpec: BE-051
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-051. 문의 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-051 문의 (`/sales/inquiries` · `/sales/inquiries/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-051(요소·예외) · BE-051(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-051 §7 · BE-051 §7.8 과 번호가 일치해야 한다 |
| 판정 근거 | **기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **없음 — 이 화면의 P0 30건 판정은 하나도 뒤집히지 않았다.** 다만 **`종속` 2건(MOTION-01·02)의 낡은 근거를 교체**했다 — 이전 배치가 '라이브러리 미도입이라 소유 문서에서 gap 일 것' 이라 추정했으나 **PR #26 이 CSS-only 로 구현했다**(§2). **판정(`종속`)은 그대로이고 종속 대상의 상태가 바뀌었다.** 이 화면에 `ToggleSwitch` 는 없으므로 MOTION-03 의 게이트 신설은 근거에만 반영했다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크(`shared/crud`)가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 화면 성격

**목록 = 읽기 전용 트리아지 표**(등록·삭제·행 선택·일괄 작업 없음 — 문의는 고객이 접수한다). **상세 = 편집 가능한 처리 카드**(담당·상태·답변/메모) + append-only 타임라인. **이 화면만의 특이점**: 상태를 '견적 발행'으로 바꾸면 **다른 리소스(견적)가 생성된다** — 쓰기의 부수효과가 도메인 경계를 넘는다. 이 사실이 EXC-03(권한)·EXC-08(중복 제출)·EXC-04(경합) 판정의 무게를 다른 화면보다 올린다.

**이름 충돌 주의**: `/support/tickets`(FS-026 1:1 문의)와 **다른 화면**이다. 두 문서의 판정이 갈리는 곳이 많은데(특히 STATE-01 · IA-13 · COMP-10 · EXC-04), 그것은 판정 기준이 달라서가 아니라 **F3b 롤아웃이 이 화면에는 닿았고 그 화면에는 아직 닿지 않았기 때문**이다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 목록은 `useCrudListQuery` 를 **직접** 쓰지만(`InquiryListPage.tsx:129`) `isFetching` 을 loading 으로 직결하지 **않는다** — `:131` 이 `const firstLoading = isFetching && data === undefined` 로 **로컬 파생**한다(공용 `useCrudList.tsx:71` 과 같은 식). 그 `firstLoading` 만이 스켈레톤(`:226`)과 요약 문구(`:208`)를 지배하고, **`aria-busy={isFetching}`(`:211`)이 재조회 표시를 따로 맡아 둘이 분리된다** — 재조회 중 행은 남고 AT 는 갱신 중임을 안다. `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:254`)가 그 이전 행을 공급한다. 4상태가 배타적이다: 스켈레톤(`data===undefined`) / Empty(`visible.length===0`) / 행 / error 배너(`:138`, 표를 통째로 대체). 상세도 정상 — `inquiry === undefined`(`:241`) | `/sales/inquiries` 진입 → 데이터 렌더 확인 → 필터 변경으로 재조회 유발(또는 `staleTime` 30초 경과 후 재진입). **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 배너만 뜨는지, 검색 0건으로 Empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | **부분 미충족.** 목록은 충족 — `:138-151` 이 `<Alert tone="danger">` + '다시 시도'(`refetch`)를 렌더하고 error toast 를 쓰지 않는다. **상세가 미충족** — `:212-223` 의 실패 Alert 에 **'다시 시도' 컨트롤이 없고 '목록으로'만 있다**(FS-051-EL-015). 어댑터는 404 를 `HttpError` 로 정확히 던지는데도(`crud.ts:105-107`) 화면이 status 를 보지 않아 404·5xx 가 한 문구다 | `/sales/inquiries/inq-1?status=detail:500` 진입. **danger Alert 는 뜨지만 '다시 시도' 버튼이 없으면 gap.** `?status=detail:404` 와 화면이 같은지도 확인 | **gap** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① **페이지네이션이 없고**(FS-051-EL-008 — `visible.map`(`:251`)이 전량 렌더, `<Pagination` grep 0건) ② **행 선택이 없다**(삭제·일괄 작업이 범위 밖 — BE-051 §7.6; 표에 체크박스 컬럼이 없다). `useListState` 가 `selectedIds`·`toggleAll`·`clampPage`(`useListState.ts:68-74`)를 **제공하지만 이 화면은 소비하지 않는다** — 훅을 쓴다는 사실이 이 요구의 표면을 만들지 않는다. 따라서 'page clamp' 도 '숨겨진 행의 선택 해제' 도 걸릴 지점이 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다 | 페이지네이션·행 선택 도입 시 이 판정을 다시 매긴다. `clampPage` 가 이미 준비돼 있어(`useListState.ts:217-223`) 도입 비용은 낮다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/sales/inquiries/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 4)`(`:83`) 같은 space 토큰 배수로만 표현한다 | `grep -nE "#[0-9a-fA-F]{3,8}\b\|[0-9]+px\|(outline\|border): *(thin\|medium\|thick)" apps/admin/src/pages/sales/inquiries` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(제목 링크 `:263` · 견적 링크 `:281` · 상세 back 버튼 `InquiryDetailPage.tsx:229` · 담당 input `:283`) · DS `<Button>`·`<SelectField>`·`<TextareaField>`·`<SearchField>`. **이 화면이 focus ring 을 직접 선언하지 않는다** — 두께 계약은 `ui.css:14-17`(`outline: var(--tds-border-width-medium) solid var(--tds-color-border-focus)`)이 소유. **raw checkbox 등 클래스 없는 포커스 표면 0건**(FS-053 과 갈리는 지점) | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건이고, 포커스 가능한 모든 요소가 `tds-ui-focusable` 또는 DS 컴포넌트임을 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `:231`) · Toast(`InquiryDetailPage.tsx:197`) · 이탈 가드 Modal · DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`InquiryDetailPage.tsx:242,247,384`) · Toast · 이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`InquiryDetailPage.tsx:238`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-61`) — 값을 손으로 재현하지 않는다. **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/sales/inquiries/inq-1` 의 '문의 처리' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | **충족.** `:156-162` 이 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 공용 `useListState`→`useDebouncedSearch` 를 소비한다. 그 훅이 세 절을 전부 구현한다: ① **조합 중 커밋 금지** — `if (composing) return`(`useDebouncedSearch.ts:87`) ② **조합 중 Enter 차단** — `event.nativeEvent.isComposing \|\| composingRef.current` 두 신호를 함께 보고 `stopPropagation`(`:121-124`) ③ **250ms 디바운스**(`:23,93-95`). `SearchField` 가 `{...native}` 를 `<input>` **마지막에** 스프레드하므로(`SearchField.tsx:66` 주석 'native 가 마지막이다') 세 핸들러가 실제 입력에 도달한다. **stale 응답 절**: 검색이 클라이언트 필터라(`searchInquiries`) 검색어가 쿼리 키에 들어가지 않는다 — **out-of-order 응답 경쟁 자체가 존재하지 않는다**(요구가 막으려는 사고가 구조적으로 불가능) | `/sales/inquiries` 검색창에 IME 로 '한빛' 입력. **조합 중 '하'·'한ㅂ' 같은 부분 문자열이 URL `?q=` 나 표에 반영되면 gap.** 조합 중 Enter 가 제출하지 않는지, 완성 후 250ms 뒤 커밋이 **1회**인지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 상속 | **이 화면에 파괴적 서버 액션이 없다** — 삭제가 범위 밖이다(BE-051 §7.6). 걸리는 표면은 **discard intent 하나**: 이탈 가드가 렌더하는 `ConfirmDialog`(`InquiryDetailPage.tsx:149,391` → `useUnsavedChangesDialog`). intent→tone/icon/label 매핑과 초기 포커스는 DS `ConfirmDialog` 가 소유한다. busy/abort 절은 이 다이얼로그에 서버 요청이 없어 무관하다. **주의**: '견적 발행' 전이는 **비가역 생성**이라 파괴적 액션에 준하는 무게를 갖지만 **ConfirmDialog 로 게이트되지 않는다** — 인라인 예고 배너(FS-051-EL-023)뿐이다. 그러나 요구의 문언은 '파괴적/비가역 **액션**'이고 이 전이는 select + 저장이라는 2단계이며 예고가 실재하므로 이 요구의 gap 으로 잡지 않는다 — §4.3 에 별도 축으로 기록한다 | DS `ConfirmDialog` 판정에 종속. 이 화면에서는 discard 다이얼로그가 실제로 뜨는지만 확인(FEEDBACK-04 절차와 동일) | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | `InquiryDetailPage.tsx:149` 가 `useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `dirty` 는 RHF `isDirty` 가 아니라 도메인 판정(`:144-147` — 담당·상태·작성 본문 중 하나라도 원본과 다르면 true)이며 **계약상 등가**다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다(`useUnsavedChangesDialog.tsx:127,133,178`). 저장 성공 시 작성창이 비고 상세가 재조회돼 dirty 가 풀린다(`:195-202`) | 상세에서 답변 본문 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로'(FS-051-EL-012·EL-026)·'발행된 견적 보기'(EL-022)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-051 §7 #12 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 처리 폼은 modal 이 아니라 상세 라우트의 `<Card>` 로 렌더된다(`InquiryDetailPage.tsx:247-382`). 유일한 modal 인 이탈 가드 `ConfirmDialog` 는 입력 필드가 없는 확인 다이얼로그다(그 자신이 FEEDBACK-04 의 산물이다) | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success(…)`(`InquiryDetailPage.tsx:197-201` — 발행 여부로 문구 2종). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다. **목록의 Empty 는 자기 `role="status"` 를 갖는다**(`Empty.tsx:104`) — 그것은 A11Y-01 이 아니라 STATE-05 의 산물이며, 삽입형 region 이라 신뢰성 한계가 같다(`CrudListShell.tsx:99-106` 이 그 문제를 지속 region 으로 푸는데 **이 화면은 그 셸을 쓰지 않아 상속하지 못했다** — §3 A11Y-16) | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 이탈 가드 `ConfirmDialog`(FEEDBACK-02 와 같은 노드). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 discard 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **미충족.** 이 화면의 폼 컨트롤 3개를 전수 확인했다. ① **담당 배정 input**(`:279-290`) — `FormField htmlFor="inquiry-assignee"`, required 아님, 오류 상태 없음 → `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않는다 ✔ ② **답변 textarea** — `TextareaField` 가 `aria-invalid`/`aria-describedby`/`aria-required` 를 내부에서 짝으로 배선하고 **hint 까지 잇는다**(`TextareaField.tsx:62-67`) ✔ ③ **처리 상태 SelectField**(`:291-314`) — **여기가 gap 이다.** `FormField hint={…}`(`:294-298`)가 `<p id={hintIdOf('inquiry-status')}>` 를 렌더하는데(`FormField.tsx:114-118`) **호출부가 `SelectField` 에 `aria-describedby` 를 주지 않는다** → 힌트가 AT 에 영원히 닿지 않는다. **하필 그 힌트가 '‘견적 발행’으로 바꾸면 견적이 자동 생성됩니다' — 비가역 부수효과의 유일한 예고**다(FS-051-EL-021.1). 요구의 문언이 정확히 이 절('hint는 valid일 때만 hintIdOf로 연결')을 규정하고, 형제 컴포넌트 `TextareaField` 는 같은 일을 내부에서 옳게 한다. **완화 요인**: 'aria-describedby 없는 aria-invalid grep = 0' 절은 충족(aria-invalid 자체가 0건), required 절도 충족(required 필드 0건 — 담당·본문 모두 선택적) | `grep -n "aria-describedby" apps/admin/src/pages/sales/inquiries -r` → **0건**(현재). RTL 로 상세를 렌더해 `screen.getByLabelText('처리 상태').getAttribute('aria-describedby')` 가 `'inquiry-status-hint'` 인지 assert — **null 이면 gap.** 스크린리더로 상태 select 에 포커스해 힌트가 읽히는지 확인 | **gap** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<select>` 3개**다(`:163-204`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, 이 화면 전체에 `aria-current` **0건**(grep). (답변/메모 유형 토글(`:341-358`)이 `aria-pressed` 를 빠뜨린 것은 사실이나 그것은 **좌측 필터 list item 이 아니다** — A11Y-16 P1 이 그 표면을 잡는다. 요구를 그 표면에 억지로 걸지 않는다) | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면: 이탈 가드 `ConfirmDialog`. enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다 | DS Modal 판정에 종속. **PR #26 에서 구현됐다 — 다만 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21,30-33` → keyframes `:126-144`) + dialog scale(`:58-59,35-38` → `:146-168`, exit 는 `forwards`) · reduced-motion 게이트 `:173-180` · `component.overlay` recipe 소비(`tokens/tokens.json:1286-1308`). **Motion/framer-motion 은 여전히 미도입**(`packages/ui/src` 소비 0건)이나 요구문의 'AnimatePresence 로 exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성했다 — **'라이브러리가 없으니 소유 문서에서 gap 일 것' 이라는 이전 배치의 추정은 더 이상 성립하지 않는다.** 잔여: 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 즉시 언마운트**(`:27-31`) — 이 화면의 다이얼로그는 footer 가 주 닫기 수단이다. **라이브러리 부재/footer 경로를 gap 으로 볼지는 여전히 이 문서의 몫이 아니다** | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 토스트. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다. **PR #26 에서 구현됐다** — `.tds-toast--exiting`(`Toast.css:32-37`, `tds-toast-out … forwards` + `pointer-events:none`) → `@keyframes tds-toast-out :121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족**(`component.overlay.exit-duration` = `{motion.duration.fast}` 150ms · `exit-easing` = `{motion.easing.accelerate}` — `tokens/tokens.json:1298-1307`). exit 완료 후 unmount 는 `onAnimationEnd` 대조로 달성. reduced-motion 게이트 `Toast.css:136-141` | DS Toast 판정에 종속(이 화면은 텍스트만 주입한다) | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `:231`) · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건) — **ToggleSwitch 는 이 화면에 없다**(요구가 명시 지목한 그 컴포넌트는 FS-052 의 마일스톤 편집기에 있다) | 전역 motion config·`ui.css`·`ToggleSwitch.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:250-251` — `APP_ROUTES` 의 `/sales/inquiries` · `/sales/inquiries/:id`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={columnStyle}>`(`:154`) · `<div style={pageStyle}>`(`InquiryDetailPage.tsx:226`)다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **부분 미충족 — 사유가 통합 이후 바뀌었다.** 해소된 절: `/sales/inquiries/:id` 는 nav 잎이 아니지만 `findCoveringLeaf`(`nav-config.ts:269-279`)가 '자기를 감싸는 가장 긴 잎'인 `/sales/inquiries` 를 찾아 **AppHeader 가 잎 라벨 '문의'를 보인다**(`findNavLabel` `:297-299` → `AppHeader.tsx:92,101`) — **요구가 금지한 '브랜치 라벨(영업 관리)' 폴백은 더 이상 발생하지 않는다.** 남은 절 둘: ① **`<h1>` 이 2개다** — AppHeader 의 `<h1>{title}</h1>`(`AppHeader.tsx:101`)와 상세의 `<h1 style={pageTitleStyle}>문의 처리</h1>`(`InquiryDetailPage.tsx:238`) ② **primary title 이 행위·레코드를 반영하지 않는다** — AppHeader 는 '문의'라 말하지 요구가 예시로 든 '공지 등록' 류의 구체적 title 이 아니다(`nav-config.ts:293-295` 가 '등록/수정 행위는 제목에 넣지 않는다'를 **의도로 선언**한다). 게다가 목록은 in-content `<h1>` 이 없어 **title 소스 모델이 화면 타입마다 여전히 모순**이다 — 요구의 본문이 지적하는 바로 그 상태 | `/sales/inquiries/inq-1` 진입. `document.querySelectorAll('h1').length === 2` 이면 gap. AppHeader 의 가시 `<h1>` 이 '문의'(잎 라벨)인지 확인 — **'영업 관리'면 회귀다.** 목록 `/sales/inquiries` 는 잎이라 h1 1개 · '문의' 로 정상 — 이 gap 은 sub-route 에서만 발생 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색·필터 3종(`:155-205`) → 결과 count 요약(`:207-209`) → table(`:211`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 문의 생성이 범위 밖이다(BE-051 §7.6). SelectionBar 도 정당한 N/A(일괄 액션 없음). **미충족: Pagination 이 없다.** `visible.map(...)`(`:251`)이 전량을 렌더하며 `<Pagination` 이 `pages/sales` 전체에 **0건**이다(grep). 문의는 상한 없이 매일 쌓이는 컬렉션이라 'page size 초과 가능'이 확실하다(BE-051 §7.7) | 픽스처를 20건 이상으로 늘리고 `/sales/inquiries` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 문의 생성이 범위 밖이고(BE-051 §7.6) 편집은 `/new`·`/:id/edit` 폼이 아니라 상세 라우트 안의 처리 카드에서 일어난다. `App.tsx:250-251` 이 `/sales/inquiries` 와 `/sales/inquiries/:id` **2개만** 등록한다 — '`:id` 로 구분되는 하나의 컴포넌트/route 쌍' 이라는 요구 자체가 걸리지 않는다. (**같은 섹션의 FS-052 는 그 쌍을 갖고 있고 pass 다** — 이 N/A 는 섹션의 회피가 아니라 이 엔티티의 성격이다) | 이 화면에 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | **충족.** 필터 3종과 검색어의 **단일 원천이 URL** 이다 — `:112` 가 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 소비하고, 그 훅이 `useSearchParams` 로 `?type=`·`?channel=`·`?status=`·`?q=` 를 직렬화한다(`useListState.ts:87-99`). 기본값과 같은 값은 URL 에서 지워지고(`:115-117`), 갱신은 `{ replace: true }`(`:125`)라 필터 조작이 history 를 쌓지 않는다 — 상세에서 Back 하면 **그 조건이 걸린 목록 URL 로 착지한다**(훅 헤더 주석 `:17-19` 가 그 설계를 선언한다). 손으로 고친 `?type=거짓말` 은 `parseFilter`(`:113-127` → `parseFilter.ts:19`)가 '전체'로 되돌려 조회를 깨지 않는다. **scroll 위치 복원은 없다**(요구가 '가능하면'으로 둔 절) | `/sales/inquiries` 에서 상태='처리중' + 검색='한빛' 적용 → URL 이 `?status=in_progress&q=한빛` 인지 확인 → 행 클릭으로 상세 진입 → 브라우저 Back. **URL 과 필터가 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(+ `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. **IA-13 덕에 `returnUrl` 에 필터 조건까지 실려 복귀 시 그 view 가 복원된다**(다른 화면과 갈리는 이득) | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fsales%2Finquiries…&reason=session_expired` 로 이동하는지 확인. (미저장 처리 내용 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): read 게이팅 — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`RequirePermission.tsx:61-64`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생(`route-resource.ts` — '자기를 감싸는 가장 구체적인 잎')이 `/sales/inquiries/:id` 까지 덮는다. **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`/`useRouteCan`(`RequirePermission.tsx:27-52`)의 소비처는 **앱 전체 7곳**(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}` + `logs/LogListShell`)이며 **`pages/sales` 는 하나도 없다**(grep). 이 화면의 '처리 저장'(`InquiryDetailPage.tsx:378`)은 `can(resource,'update')` 를 묻지 않고 무조건 렌더된다 → 쓰기 권한 없는 역할이 버튼을 보고 누르며, 서버 403 이 '저장하지 못했습니다' 배너로 뭉개진다(강등 reconcile 없음). **이 화면에서 특히 무겁다**: 이 쓰기는 **견적 생성을 동반**한다 — 견적 create 권한이 없는 주체가 문의 저장으로 견적을 만들 수 있는지가 서버 계약에 달려 있고(BE-051 §7.6), 프론트에는 그 분기가 아예 없다 | 권한 스토어에서 `sales/inquiries` 의 `update` 를 끈 뒤 `/sales/inquiries/inq-1` 진입. **'처리 저장' 버튼이 그대로 보이면 gap.** read 를 끄면 403 화면이 뜨는지도 확인(이쪽은 pass). `?status=save:403` 으로 강등 응답이 권한 문구로 갈리는지 확인 | **gap** |
| EXC-04 | EXC | 직접 | **부분 미충족 — 절반은 F3b 가 해소했다. 정확히 가른다.** 해소된 절: **유령 저장이 구조적으로 불가능하다** — 이 어댑터는 공용 `createCrudAdapter`(`data-source.ts:156`)라 `update` 가 없는 id 에 **`HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`** 를 던진다(`crud.ts:126-128`). FS-026 의 손조립 티켓 어댑터가 `map` 으로 조용히 통과시키던 그 함정이 **여기엔 없다.** 남은 절 셋: ① **낙관적 동시성 토큰이 없다** — `Inquiry` 에 `version`/`updatedAt` 필드가 없고 어댑터가 `If-Match` 를 보내지 않는다. 409 는 **'대상이 존재하는가'만** 본다 → **둘 다 존재하는 문의를 두 관리자가 동시에 편집하면 409 없이 last-write-wins** 다. 이 둘을 뭉개면 안 된다 ② **409 를 해소할 UI 가 없다** — 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅의 conflict 다이얼로그(`useCrudForm.ts:166-179` — 입력 보존 + reload/dismiss)를 상속하지 못했다. 어댑터가 409 를 줘도 FS-051-EL-017 의 generic 배너로 뭉개진다. **같은 섹션의 FS-052 는 그것을 갖고 있다**(`ProjectFormPage.tsx:532` `<FormConflictDialog conflict={conflict} />`) — 이 화면만 못 받았다 ③ **실질 위험**: 타임라인 전체 치환 PUT 이라 동시 답변이 유실된다(BE-051 §7.3) | `?status=save:409` 로 상세에서 '처리 저장'. **conflict 다이얼로그 없이 '저장하지 못했습니다' 배너만 뜨면 gap.** 동시 편집(둘 다 존재)은 재현 스위치로 만들 수 없다 — `Inquiry` 에 version 필드가 없음을 **코드로** 확인해 판정한다(`types.ts:26-45`) | **gap** |
| EXC-08 | EXC | 직접 | **미충족 — 그러나 원인이 좁다.** `onSave`(`InquiryDetailPage.tsx:155-210`)에 **동기 제출 락(`submitLockRef`)이 없고**, `update.mutate({ id, input, signal })`(`:186-191`)가 **`idempotencyKey` 를 넘기지 않는다.** 방어는 `disabled={saving \|\| !dirty}`(`:378`) 하나뿐이다. **완화 요인 둘**: ① 이 버튼은 `type="submit"` 이 아니라 `onClick` 이라 RHF 비동기 검증 지연이 없어 창이 좁다 ② **견적 자동 생성은 연타로 늘어나지 않는다** — `quoteId` 가 멱등 키라(`data-source.ts:126`) 두 번째 요청은 견적을 만들지 않는다(테스트가 고정 — `inquiries.test.ts:140-149`). **그러나 `update.mutate` 는 비동기이고 `saving` 은 리렌더 후에야 true 가 되므로 그 사이의 빠른 두 번째 클릭은 두 번째 요청을 만들고**, 결과는 **타임라인에 같은 답변 이벤트 2건**이다 — 답변은 고객에게 전달되는 값이다. **주목**: 이 gap 은 **인프라 부재가 아니라 배선 누락**이다 — `useCrudUpdate` 의 `UpdateVars.idempotencyKey`(`crud.ts:301`), 어댑터의 `context.idempotencyKey`(`:118-121`), 멱등 원장(`:62-72`)이 **전부 준비돼 있고** 호출부가 안 넘길 뿐이다. `useCrudForm.ts:118-123` 의 `takeIdempotencyKey` 패턴을 그대로 옮기면 된다 | 상세에서 답변 입력 후 '처리 저장'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되고 타임라인에 같은 답변이 2건 쌓이면 gap.** 코드상 `submitLockRef` grep 이 이 화면에서 0건이고 `mutate` 호출에 `idempotencyKey` 가 없음으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | 세 지점이 전부 배선돼 있다. ① **onError** — `if (isAbort(cause)) return;`(`:205`)로 abort 를 실패로 처리하지 않는다(배너·토스트 없음). ② **onSuccess** — `if (controller.signal.aborted) return;`(`:194`)로 취소된 요청의 성공 콜백이 토스트·재조회를 일으키지 않는다. ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:136`)가 이탈 시 진행 중 저장을 취소한다. 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다. bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 상세에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다(취소된 요청) | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **8** | STATE-01 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-04 · IA-01 · IA-13 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **4** | STATE-04 · FEEDBACK-06 · A11Y-12 · IA-05 |
| `gap` | **7** | STATE-02 · A11Y-11 · IA-02 · IA-04 · EXC-03 · EXC-04 · EXC-08 |
| **합계** | **30** | 8 + 11 + 4 + 7 = **30** ✓ |

> **P0 gap 7건 — quality-bar '배치 실패' 사유.** 성격이 셋으로 갈린다:
> - **이 화면만의 배선 누락(저비용)**: `A11Y-11`(hint 를 `aria-describedby` 로 잇기 — 한 줄) · `EXC-08`(`idempotencyKey` 를 `mutate` 에 넘기기 — 인프라는 이미 있다). **둘 다 즉시 고칠 수 있다.**
> - **`useCrudForm`/`FormPageShell` 미상속의 파생**: `STATE-02`(404 vs 5xx 분기 + retry) · `EXC-04`(conflict 다이얼로그). 이 화면이 상세-편집 형태라 폼 셸을 쓰지 않은 대가이며, **같은 섹션의 FS-052 는 셸을 써서 둘 다 pass** 다.
> - **앱 전역 횡단**: `IA-02`(h1 이중 + title 모델) · `IA-04`(페이지네이션) · `EXC-03`(쓰기 게이팅). 화면 단위가 아니라 **횡단 배치**로 푸는 것이 옳다(§5).
>
> **F3b 롤아웃이 이 화면에 닿은 결과**: `STATE-01` · `COMP-10` · `IA-13` 이 **pass 로 뒤집혔다**(FS-026 은 셋 다 gap). `EXC-04` 의 유령 저장 절도 해소됐다. 낡은 판정을 복사하지 말 것.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·날짜 범위·CSV·페이지네이션 range·좌측 필터 패널)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **화면이 그 이득을 실제로 쓴다** — `firstLoading`(`:131`)이 스켈레톤을 최초 로드로 묶고 `aria-busy={isFetching}`(`:211`)이 재조회를 따로 알린다(STATE-01 과 같은 뿌리, 이쪽도 pass). **다만 '가벼운 refetch 인디케이터'가 시각적으로 없다** — `CrudListShell` 은 '· 새로고침 중…' 을 덧붙이는데(`CrudListShell.tsx:120`) 이 화면은 그 셸을 쓰지 않아 `aria-busy` 만 있고 눈에 보이는 표시가 없다 | 데이터가 있는 상태의 재조회에서 이전 행이 유지되는지 | **pass(단 가시 인디케이터 없음)** |
| STATE-05 | P1 | 공유 `Empty` 를 3분기 맥락과 함께 소비한다(`:240-247` — `label='문의'` · `createVerb='접수'` · `hasQuery` · `hasActiveFilters` · `onClearSearch` · `onResetFilters`). 검색 0건 → '조건에 맞는 문의가 없습니다' + '검색 지우기', 필터 0건 → '필터에 맞는 문의가 없습니다' + '필터 초기화', 진짜 0건 → '접수된 문의가 없습니다'. 조사는 `Empty` 가 받침으로 고른다(`Empty.tsx:25-27`). **생성 CTA 슬롯을 비운 것은 정당하다** — 관리자가 문의를 만들지 않는다(BE-051 §7.6) | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기가 나오는지. 필터로 0건 → '필터 초기화' | **pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:312-315`) 화면이 상세를 재조회한다(`:202`) — 자기 변경이 즉시 보인다. **견적 발행 시에는 견적 목록 캐시가 무효화되지 않는다** — `useCrudUpdate` 는 `sales-inquiries` 키만 안다. 새로 발행된 견적이 `/sales/quotes` 목록에 안 보일 수 있다(그 목록의 `staleTime` 30초가 지나야) | 상세에서 상태 변경 후 목록 복귀 시 배지가 갱신돼 있는지. **'견적 발행' 저장 후 `/sales/quotes` 로 이동해 새 견적이 즉시 보이는지** | **gap(견적 캐시 한정)** |
| COMP-01 | P1 | 목록은 **충족** — 행 액션이 DS `<Link className="tds-ui-link tds-ui-focusable">`(`:263,279`)이고 `buttonStyle(`·`tds-ui-btn-` grep **0건**(`pages/sales/inquiries`). **같은 섹션의 FS-053 은 손조립 버튼을 쓴다** — 이 화면은 그 함정을 피했다. **상세가 미충족** — `InquiryDetailPage.tsx:379` 가 `loading` prop 대신 손으로 쓴 `{saving ? '저장 중…' : '처리 저장'}` 라벨을 쓴다. back 버튼(`:227-235`)도 `<button style={backLinkStyle}>` 손조립이나 그것은 IA-07 의 공유 back-link 관례를 따른 것이라 이 요구의 위반으로 보지 않는다 | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/sales/inquiries -r` → **0건**(현재 충족). `loading` prop 사용 여부는 별도 리뷰 | **gap(loading prop 한정)** |
| COMP-02 | P1 | 순번 컬럼이 DS `SeqCell`/`SeqHeaderCell` 을 쓴다(`:217,253`). raw checkbox 선택 마크업은 이 화면에 없다(선택 자체가 없다) | 순번 노출 표가 `SeqCell` 을 쓰는지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 를 쓴다(`:156`). raw `<input type="search">` 재구현 **0건**(`pages/sales/inquiries` grep — `type="search"` 는 `SearchField.tsx:63` 내부에만) | `grep 'type="search"' pages/sales/inquiries` → 0건 | **pass** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `SKELETON_ROWS = 5`(`:108`). **셀 수는 `COLUMNS.length + 1` 로 파생된다**(`:229`) — 주석(`:97`)이 그 의도를 밝힌다('열 수를 손으로 세지 않는다'). 페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다(IA-04 gap 과 연동) | `grep "length: 5\|SKELETON_ROWS = 5" pages/sales/inquiries` → 0건이어야 한다. 현재 1건. **셀 수 절은 이미 충족** | **gap(행 수 한정)** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`:253`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소해 페이지네이션을 도입하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | **중복 '상세' 버튼이 없다** — 제목 셀이 링크이고(`:263-265`) 행 전체 클릭(`rowNavProps` `:252`)이 같은 목적지를 보조한다. 요구의 (a) 형태('whole-row 클릭 + row 내 접근 가능한 링크 하나, 중복 상세 버튼 없음')와 **정확히 일치**한다. **같은 섹션의 FS-053 은 그 함정에 빠져 있다**(`ConsultationListPage.tsx:265-273`) | 읽기전용 리스트에 중복 '상세' secondary 버튼이 없는지 | **pass** |
| COMP-09 | P2 | 제목·고객/거래처 셀에 truncate 가 없다(`tdStyle` 그대로 — `:254-268`). 긴 제목이 열을 넓혀 표 레이아웃을 민다. 9컬럼 표에 가로 scroll 컨테이너도 없다 | 200자 제목 픽스처로 표 폭이 유지되는지 | **gap** |
| COMP-12 | P2 | 답변 textarea 가 `TextareaField` 의 `N/1000` 실시간 카운터를 갖는다(`:363` `maxLength={INQUIRY_REPLY_MAX}` → `TextareaField.tsx:52` `counter`). **그러나 상한 근접 경고가 없고, `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 바로 그 증상. 조합형 한글의 counting 기준(`value.length` = UTF-16 code unit)도 명시되지 않았다 | 1000자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 Alert(`:141` · `InquiryDetailPage.tsx:215`) · write 성공=toast(`:197`) · write 실패=카드 배너(`:256`). **단 write 실패가 toast 가 아니라 배너다** — 요구는 'write 성공/실패 → toast'인데 이 화면은 실패를 폼 카드 배너로 둔다. 그러나 이는 폼 맥락(입력을 보존한 채 그 자리에서 재시도)이라 `FormServerError` 와 같은 결이며 **이탈로 보지 않는다** | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast — 발행 여부로 문구 2종) · 실패(배너) 양 경로가 배선돼 있다(`:193-207`). no-op 클릭이 없다 | `?fail=sales-inquiries:save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| A11Y-08 | P1 | **충족.** 행 클릭이 `useRowNavigation`(마우스 전용 — `<tr>` 에 tabIndex 없음, 훅 헤더 `:9-11` 이 그 전제를 선언)이고, **제목 셀이 링크다**(`:263-265`) — 주석(`:262`)이 그 이유를 명시한다('행 클릭은 마우스 전용이다 — 키보드로도 같은 곳에 닿는 링크를 행 안에 둔다'). 견적 역링크(`:279-285`)도 접근 이름을 갖는다(`aria-label={\`${item.title} 발행 견적\`}`). **요구가 기대하는 형태('row 내 focusable name link')와 정확히 일치** | 행을 Tab 해서 제목 링크에 도달하고 Enter 로 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스가 없고, 저장 실패 시 첫 오류 필드로 포커스가 이동하지 않는다 — `useCrudForm` 의 `onInvalid`/`setFocus` 경로(`useCrudForm.ts:157,190,246-248`)를 상속하지 못했다. **완화 요인**: 이 화면에 클라이언트 검증이 없어 '첫 invalid 필드'가 정의되지 않는다 — 서버 422 를 필드에 꽂는 경로(EXC-07)가 선행돼야 이 요구가 의미를 갖는다 | 상세 진입 시 activeElement 가 담당 입력인지 | **gap** |
| A11Y-16 | P1 | 답변/메모 유형 토글(`:341-358`)이 선택 상태를 **버튼 variant(색)로만 인코딩**한다 — `aria-pressed` 가 없어 '이중(비색상) state 인코딩' 과 'semantic role' 을 위반한다. **목록의 유형 배지도 같은 병**(`:255-258`) — 라벨은 유형인데 **톤이 우선순위**라 우선순위가 색으로만 표현된다. 나머지 표면(표 `aria-busy`·caption·필터 `aria-label`·Empty `role="status"`·링크 접근 이름)은 계약을 만족한다 | 토글 두 버튼에 `aria-pressed` 가 있는지. 흑백 인쇄/색맹 시뮬레이션에서 우선순위가 읽히는지 | **gap** |
| ERP-01 | P1 | status→tone 매핑이 **모듈의 단일 레지스트리**다 — `types.ts:108-121` `STATUS_TONE` + `inquiryStatusTone`/`inquiryPriorityTone`. per-page meta helper 를 만들지 않았고 목록·상세가 같은 함수를 소비한다. **그러나 같은 값이 두 화면에서 다른 색이다** — 유형이 목록에서는 우선순위 톤(`:256`), 상세에서는 neutral(`:259`). 요구가 막으려는 것('같은 semantic state 가 화면마다 다른 색')이 **한 화면 쌍 안에서** 발생한다. 또 그 레지스트리가 `pages/sales/inquiries` 지역이라 견적/계약/배송과 통합된 앱 전역 레지스트리는 아니다(요구가 `quoteStatusMeta` 를 명시 지목) | 모든 domain status 가 정의된 tone 으로 해석되는지. **같은 유형 값이 목록·상세에서 같은 색인지** | **gap** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 날짜·숫자가 `shared/format`(`formatDateTime`·`formatNumber`)을 경유한다 — 인라인 포맷 0건 | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-13 | P1 | **충족 — 이 화면이 조사 헬퍼의 모범 소비처다.** ① 타임라인 상태 이벤트가 `` `상태를 '${statusText}'${directionParticle(statusText)} 변경` ``(`InquiryDetailPage.tsx:169`)로 **런타임에 조사를 고른다** — 주석(`:162`)이 그 원칙을 선언한다('조사는 shared/format 이 런타임에 고른다 — 문형을 비트는 대신 조사를 계산한다'). `directionParticle`(`format.ts:321-325`)은 ㄹ 받침 예외까지 처리한다('견적 발행으로'·'완료로'·'보류로'). **FS-026 이 같은 자리에 리터럴 `(으)로` 를 출하하는 것과 정면으로 갈린다** ② Empty 의 '이/가' 는 `Empty.tsx:25-27` 이 받침으로 고른다 ③ **어댑터의 견적 생성 이벤트는 조사가 필요 없는 라벨형이고, 코드가 그 사실을 명시한다** — `data-source.ts:146-148`: '타임라인 항목은 「무슨 일 — 대상」 라벨형이다. 조사가 붙을 자리가 없어 shared/format 의 조사 헬퍼가 필요 없다(리터럴 「을(를)」 도 물론 없다 — ERP-13)'. **사용자 대상 리터럴 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0** | 사용자 대상 문자열의 `(으)로`/`이(가)`/`을(를)` grep = 0. 상태를 '보류'로 바꿔 타임라인이 '상태를 「보류」로 변경'(「보류으로」 아님)인지 확인 | **pass** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다**(`visible.map` — `:251`) — cap·virtualization 이 없다. 문의는 상한 없이 증가하는 컬렉션이라(BE-051 §7.7) 1,000건이면 1,000행이 DOM 에 올라간다. **완화 요인**: 검색이 250ms 디바운스를 거쳐(COMP-10) 자모마다 전량을 훑지는 않는다. 9컬럼 표에 가로 scroll 컨테이너가 없다 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트에서만 발생한다(`InquiryDetailPage.tsx:136`) | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | 에러 타입 `HttpError`(status 보유)가 존재하고 어댑터가 **정확한 status 를 던진다**(404 `crud.ts:105-107` · 409 `:126-128`), `?status=<op>:<code>` 로 재현 가능하다(`dev.ts:57-71`). **그러나 이 화면이 status 로 분기하지 않는다** — 상세 실패가 404/500 을 같은 문구로(FS-051-EL-015), 저장 실패가 403/409/422/500 을 같은 배너로(`:206`) 뭉갠다. **근본 원인이 FS-026 과 다르다**: 거기선 저장소가 generic `Error` 를 던져 **분기 근거가 없었다**. 여기선 **근거가 있는데 화면이 보지 않는다** — 수정이 화면 한 곳에 국한된다 | `?status=detail:404` 와 `?status=detail:500` 이 다른 surface 를 그리는지 | **gap** |
| EXC-07 | P1 | 서버 400/422 의 `error.fields` 를 RHF `setError` 로 필드에 꽂는 경로가 없다 — `useCrudForm` 미사용이라 그 훅의 422 처리(`useCrudForm.ts:182-192`)를 상속하지 못했다. 모든 저장 실패가 form-level 배너로 간다. **이 화면에서 특히 무겁다**: 클라이언트 검증이 **0** 이라(FS-051 §4.1) 서버 422 가 **유일한 피드백원**인데 그것이 배너 한 줄로 뭉개진다 | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | 404 와 generic error 를 구분하지 않는다(FS-051-EL-015 — '문의를 불러오지 못했습니다.' + '목록으로'만). 공용 `useCrudForm` 은 이를 정확히 구분하는데(`useCrudForm.ts:144-149` `loadFailure: 'not-found' \| 'error'`, `FormPageShell`/`ProjectFormPage.tsx:242-264` 가 그것을 소비해 404 면 retry 를 숨긴다) **이 화면이 그 셸을 쓰지 않아 상속하지 못했다.** **어댑터 전제는 이미 충족**(404 → `HttpError`) — EXC-06 과 같은 뿌리 | 없는 `:id`(`/sales/inquiries/nope`)로 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음)가 뜨는지. 500 → retry + list 둘 다 | **gap** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적(pending 잠금 → 성공 후 재조회). 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다.** un-rolled-back optimistic write 0건(`onMutate`/`setQueryData` grep 0건) | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference` 가 존재하고(`shared/errors/http-error.ts:68-75`) `useCrudForm` 은 `errorReference` 로 노출하는데(`useCrudForm.ts:195` → `ProjectFormPage.tsx:286` `<FormServerError errorReference={…} />`), 이 화면은 `setServerError('저장하지 못했습니다…')`(`:206`) 고정 문구만 쓴다. raw stack 노출은 없다(그 절은 충족) | 강제 500(`?status=save:500`)이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-051 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 처리 저장 p95 | ≤ 700ms (타임라인 배열 전체 전송 — BE-051 §7.3 안 A 채택 시 ≤ 400ms) | 위와 동일 |
| **견적 발행 저장 p95** | **≤ 1.5s** (문의 갱신 + 견적 채번·생성 + 역링크 + 타임라인 append 가 한 트랜잭션 — BE-051 §7.5. 서버 상한 10초 → 504) | 위와 동일. **프론트에서는 같은 한 호출이라 운영자가 두 경우의 차이를 예고받지 못한다** — 발행 저장이 눈에 띄게 느려도 '저장 중…' 라벨은 같다 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · **커밋당 1회 필터** | **충족** — 250ms 디바운스 + 조합 중 커밋 금지(COMP-10)라 '홍길동' 입력에 필터가 **1회** 돈다. 커밋 1회당 전량을 `filter` 1회 + `search` 1회 훑는다(`:133-136`, `useMemo` 로 메모)  |
| 저장 요청 크기 | ≤ 8KB | **미충족 — 상한이 없다.** `InquiryInput` 이 타임라인 배열 전체를 실어 보내므로(FS-051-EL-028) **이력에 비례해 무한 증가**한다. BE-051 §7.3 안 A 가 이를 상수로 만든다 |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. **목록 응답에 모든 문의의 `body`·`timeline`(내부메모 포함)이 실린다** — BE-051 §7.7 |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). **단 `quotes/data-source` 를 import 한다**(`data-source.ts:10`) — 문의 화면이 견적 모듈을 끌어온다(발행 부수효과의 대가) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`:138-151`). 단 배너가 툴바·필터까지 대체한다 — 다만 조건이 URL 에 남아(IA-13) 재시도 후 복원된다 |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **미충족** — 문구·액션이 하나(STATE-02 · EXC-12 gap). **어댑터는 이미 404 를 구분해 던진다** |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·입력 보존은 되나 reference 없음(EXC-20 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| **발행 저장 중 이탈** | 견적이 생겼는지 운영자가 알 수 있어야 한다 | **미충족** — abort 는 클라이언트만 결과를 버린다. 서버에 도달했으면 **견적은 생성됐는데 화면은 아무 말도 하지 않는다**(FS-051 §7 #25). 목록으로 돌아가 '견적' 열을 봐야 안다 |
| 동시 답변(두 담당) | 나중 저장이 앞선 답변을 덮지 않는다 | **미충족 — 답변이 유실된다**(BE-051 §7.3). 이 화면 최대 위험 |
| 동시 편집(둘 다 존재) | 409 → conflict 다이얼로그 | **미충족** — 토큰이 없어 409 자체가 안 난다(last-write-wins). 유령 저장(없는 id)만 409 로 막힌다(EXC-04) |
| 세션 만료 중 작성 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 내용을 버린다(EXC-19 P1 · FS-051 §7 #26). **단 `returnUrl` 에 필터 조건이 실려 목록 view 는 복원된다**(IA-13 의 파생 이득) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 견적 발행 전이의 안전 — quality-bar 밖 축

이 화면의 쓰기는 **다른 리소스를 생성한다.** quality-bar 는 '쓰기의 부수효과가 도메인 경계를 넘는' 경우를 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 비가역 생성 전에 예고한다 | **충족** — FS-051-EL-021.1 힌트 + FS-051-EL-023 예고 배너. **단 힌트가 AT 에 닿지 않는다**(A11Y-11 gap) |
| 비가역 생성을 ConfirmDialog 로 게이트한다 | **미충족(의도적 판정)** — 인라인 예고뿐이다. FEEDBACK-02 의 gap 으로 잡지 않은 이유: 전이가 select + 저장 2단계이고 예고가 실재한다. **그러나 이 판정은 재검토 대상이다** — 견적번호 채번은 되돌릴 수 없고, 잘못 발행된 견적을 지우면 그 문의는 **영원히 견적을 가질 수 없다**(BE-051 §7.5 의 끊어진 링크) |
| 중복 생성을 막는다 | **충족 — 이중 방어.** ① 문의 `quoteId` 멱등 키(`data-source.ts:126`) ② 견적 저장소 `findQuoteByInquiry` 교차 확인(`quotes/data-source.ts:135-136`). 테스트가 고정(`inquiries.test.ts:140-149`) |
| 생성 권한을 검사한다 | **미충족** — 문의 쓰기 권한만으로 견적이 생성된다. 프론트에 분기가 없고(EXC-03) 서버 계약이 이를 요구해야 한다(BE-051 §7.6) |
| 생성 결과가 즉시 보인다 | **부분 충족** — 토스트가 '견적을 발행했습니다'라 말하고(`:199`) 문의 상세·목록에 링크가 뜬다. **그러나 견적 목록 캐시는 무효화되지 않는다**(STATE-06 gap) |
| 생성물이 사라지면 복구할 수 있다 | **미충족** — 견적이 삭제되면 `quoteId` 가 남아 링크가 404 로 가고 재발행도 막힌다(BE-051 §7.5 · FS-051 §7 #21) |
| 클라이언트가 멱등 키를 지울 수 없다 | **미충족(계약 의존)** — `quoteId` 가 `InquiryInput` 에 들어 있어(`types.ts:209`) 클라이언트가 `''` 를 보낼 수 있다. 현재 프론트는 원본을 되돌려 보내 사고가 없지만 **계약이 막는 것이 아니다** — BE-051 §7.5 【보안 판정】 |

### 4.4 데이터 보존 · 감사

문의 타임라인은 **견적·계약 분쟁 시 증거로 쓰이는 감사 기록**이다.

| 요구 | 현재 상태 |
|---|---|
| 이벤트는 append-only — 수정·삭제되지 않는다 | **구조적으로 미보장.** 클라이언트가 배열 전체를 치환 PUT 한다(FS-051-EL-028) — 조작된 클라이언트는 과거 이벤트를 지울 수 있다. **특히 어댑터가 덧붙인 '견적 자동 생성 — Q-…' 시스템 이벤트도 지워진다**(BE-051 §7.3) |
| 작성자는 세션 주체에서 나온다 | **미충족.** `author` 가 하드코딩 `'관리자'`(`:55`) — **누가 답변했는지 기록되지 않는다.** 시드의 이력은 '이영업'·'박계약'·'시스템'인데 **앞으로 쌓일 것은 전부 '관리자'** 다. BE-051 §7.3 |
| 시각은 서버 시각이다 | **미충족.** 클라이언트 `new Date().toISOString()`(`:158`) |
| 이벤트 id 는 충돌하지 않는다 | **미충족.** `ev-${Date.now()}-s\|c`(`:165,175`) — 같은 저장 안의 두 이벤트는 접미사로 갈리지만 **다른 저장끼리는 같은 밀리초에 충돌한다** |
| 담당 변경이 이력에 남는다 | **미충족.** 상태·본문만 이벤트가 된다(FS-051 §7 #17) — FS-026 은 `assign` 이벤트를 남긴다 |
| 문의 원문·개인정보는 파기 정책을 따른다 | **미정** — 관리자 삭제 API 가 없는 것은 옳으나(BE-051 §7.6) 보존기간 배치 계약이 없고, **역참조하는 견적 처리도 미정**이다 |
| 내부메모는 고객에게 노출되지 않는다 | **미정** — 서버가 고객 채널로 내보낼 때 `kind='note'` 제외를 보장해야 한다(BE-051 §7.4). **목록 응답이 모든 문의의 내부메모를 내려보내는 것**도 함께 걸린다(§7.7) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | A11Y-11 | **P0** | 상태 select 의 hint 가 `aria-describedby` 로 이어지지 않아 **'견적이 자동 생성됩니다' 예고가 AT 에 닿지 않는다**. `TextareaField` 는 같은 일을 내부에서 옳게 한다 — **한 줄 수정** | 이 화면 | A11 change_request (**최우선 · 저비용**) |
| 2 | EXC-08 | **P0** | `submitLockRef`·`idempotencyKey` 없음 — 연타가 **답변 이벤트를 2건** 만든다. **인프라(원장·`UpdateVars.idempotencyKey`)는 이미 있고 호출부가 안 넘길 뿐**이다 — `useCrudForm.ts:118-123` 패턴 이식 | 이 화면 | A11 change_request (**최우선 · 저비용**) · A63 (BE-051 §7.8 #1) |
| 3 | STATE-02 · EXC-12 · EXC-06 | P0 · P1 | 상세 조회 실패에 '다시 시도'가 없고 404/5xx 를 구분하지 않는다. **어댑터는 이미 `HttpError(404)` 를 던진다**(`crud.ts:105-107`) — 화면이 status 를 보지 않을 뿐이라 수정이 한 곳에 국한된다 | 이 화면 | A11 change_request |
| 4 | EXC-04 | P0 | **유령 저장은 해소됨**(`createCrudAdapter` 의 409). 남은 것: **낙관적 동시성 토큰 부재**(동시 편집 = last-write-wins) + **409 해소 UI 부재**(`useCrudForm` 미사용 — 같은 섹션 FS-052 는 `FormConflictDialog` 보유) | 이 화면 + BE 계약 | A11 · A63 (BE-051 §7.3) |
| 5 | EXC-03 | P0 | write 액션 게이팅 미배선 — `useRouteWritePermissions` 소비 7곳에 `pages/sales` 없음. read 게이팅은 pass. **이 화면의 쓰기는 견적 생성을 동반**해 무게가 더 크다(BE-051 §7.6) | **앱 전역** | A11 change_request (횡단 배치) |
| 6 | IA-02 | P0 | **사유가 바뀌었다** — `findCoveringLeaf` 가 브랜치 폴백을 해소해 AppHeader 는 이제 '문의'를 보인다. 남은 것은 **`<h1>` 이중**(AppHeader + `:238`)과 **행위 미반영** | **앱 전역**(`AppHeader`·title 모델) | A40 · A11 |
| 7 | IA-04 · ERP-15 · COMP-06 · COMP-07 | P0 · P1 · P2 | 페이지네이션 없음 — 전량 렌더. 문의는 상한 없이 증가. 스켈레톤 `SKELETON_ROWS=5` · `SeqCell` 에 `startIndex` 없음이 함께 걸린다. **IA-13 이 이미 pass 라 `page` 키만 얹으면 된다**(`useListState` 의 `PAGE_PARAM`·`clampPage` 준비됨) | 이 화면 + BE 계약 | A11 · A63 (BE-051 §7.7) |
| 8 | ERP-01 · A11Y-16 | P1 | 목록 유형 배지가 **라벨=유형 · 톤=우선순위**로 두 축을 겹쳐 인코딩 — 우선순위가 **색으로만** 표현되고, 같은 유형 값이 상세에서는 neutral 이라 **한 값이 두 화면에서 다른 색**. 답변/메모 토글에 `aria-pressed` 없음 | 이 화면 | A11 change_request |
| 9 | EXC-07 · EXC-20 | P1 | 422 필드 매핑 없음 · 5xx reference code 미표시. **클라이언트 검증이 0 이라 서버 422 가 유일한 피드백원**인데 배너로 뭉개진다 | 이 화면 | A11 |
| 10 | COMP-01 | P1 | '처리 저장'이 `loading` prop 대신 손으로 쓴 '저장 중…' 라벨. **`buttonStyle(`/`tds-ui-btn-` grep 은 0건**(이 화면은 그 함정을 피했다) | 이 화면 | A11 change_request |
| 11 | A11Y-13 | P1 | 폼 진입 첫 필드 포커스·검증 실패 시 첫 오류 포커스 없음. **#9(EXC-07) 선행 필요** — 검증이 없으면 '첫 오류'가 정의되지 않는다 | 이 화면 | A11 (#9 와 함께) |
| 12 | STATE-06 | P1 | 견적 발행 시 **견적 목록 캐시가 무효화되지 않는다** — `useCrudUpdate` 는 `sales-inquiries` 키만 안다 | 이 화면 | A11 change_request |
| 13 | COMP-09 · COMP-12 | P2 | 제목·고객 셀 truncate 없음 · 답변 상한 근접 경고 없음 + counting 기준 미정의 | 이 화면 | A11 |
| 14 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | A40 · A11 |
| 15 | (§4.4) | — | **감사 무결성** — 타임라인 author 하드코딩 · 클라이언트 시각/id · 전체 치환으로 동시 답변 유실 · **시스템 이벤트('견적 자동 생성')도 덮인다** · 담당 변경 미기록 | 이 화면 + BE 계약 | **A63 (BE-051 §7.3 — 최우선)** |
| 16 | (§4.3) | — | **`quoteId` 가 `InquiryInput` 에 들어 있어 클라이언트가 멱등 키를 지울 수 있다** — 서버가 무시해야 한다 | BE 계약 + 이 화면 | **A63 (BE-051 §7.5 【보안】)** · A11 |
| 17 | (§4.3) | — | 끊어진 견적 역링크 — 견적 삭제 시 `quoteId` 가 남아 링크가 404 로 가고 **재발행도 막힌다** | BE 계약 | A63 (BE-050 과 공동) |
| 18 | (FS-051 §7 #9) | — | **상태 전이 규칙이 어느 층에도 없다** — 7개 상태 아무 곳으로나 갈 수 있다. **A01 의 도메인 확정이 선행**돼야 서버·프론트가 강제할 수 있다 | 도메인 + BE + 이 화면 | **A01 (선행)** · A63 (BE-051 §7.2) · A11 |
| 19 | (FS-051 §7 #12) | — | 이탈 가드가 `navigate()` 를 가로채지 못한다 — '목록으로'·'발행된 견적 보기'가 미저장 내용을 버린다 | 이 화면 | A11 change_request |
| 20 | (FS-051 §7 #7) | — | 문의 본문에 `pre-wrap` 없음 — **같은 섹션의 FS-053 은 같은 자리에 그것을 쓴다**(규칙 분기) | 이 화면 | A11 change_request |
| 21 | (§4.1) | — | 저장 요청 크기가 이력에 비례해 무한 증가 · 목록 응답이 **모든 문의의 내부메모**를 내려보낸다 | BE 계약 | A63 (BE-051 §7.3 안 A · §7.7) |

## 6. 측정 도구 · 재현 스위치

> **기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`inquiryAdapter` 는 `scope: 'sales-inquiries'`(`data-source.ts:157`)로 공용 `createCrudAdapter` 가 `failIfRequested(scope, op)` 를 부른다(`crud.ts:96,101,112,120,135`). **화면이 도달하는 op 는 3개**다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:96`) | `?fail=list` · `?fail=sales-inquiries:list` · `?fail=all` |
| `detail` | `fetchOne` (`crud.ts:101`) | `?fail=detail` · `?fail=sales-inquiries:detail` · `?fail=all` |
| `save` | `update` (`crud.ts:120`) | `?fail=save` · `?fail=sales-inquiries:save` · `?fail=all` |

- `create`/`remove` 도 `failIfRequested('sales-inquiries', 'save'/'delete')` 를 부르지만 **화면에 호출부가 0건**이라 도달하지 않는다 — 따라서 **`?fail=delete` 는 이 화면에서 아무 효과가 없다.**
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 `?delay=` 가 아니라 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.
- **견적 발행 실패는 재현할 수 없다** — `issueQuoteFromInquiry`(`quotes/data-source.ts:134-140`)에 자체 `failIfRequested` 가 없다. `?fail=sales-inquiries:save` 는 `update` **진입 시점**에 던지므로 `patch` 에 도달하지 않는다(`crud.ts:120` 이 `:130` 보다 앞) — 즉 **'문의는 저장됐는데 견적 생성만 실패'를 재현할 스위치가 없다.** 그 경로는 프론트에 존재하지 않기 때문이며(한 덩이), **서버에서는 존재하게 된다**(BE-051 §5 의 422 `QUOTE_ISSUE_FAILED`) — 연동 시 재현 스위치가 필요하다(§5 #16 과 함께).

**`?status=<op>:<code>` 스위치**(`dev.ts:24-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| STATE-02 / EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 같으면 gap** |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap** |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap |
| EXC-06 (status별 surface) | `?status=save:422` · `save:429` · `save:500` — 전부 같은 배너면 gap |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=…&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — reference 가 안 보이면 gap |
| EXC-04 (유령 저장 — **이제 pass**) | 없는 id 로 `update` 를 부르면 어댑터가 409 를 던진다(`crud.ts:126-128`). 상세 조회가 먼저 404 로 막아 화면에서는 재현이 어려우므로 **코드로 판정**한다 |

**`?delay=`·`LATENCY_MS` 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**IA-13 재현(이 화면의 pass 를 지키는 스위치)**: URL 자체가 스위치다 — `?type=quote&channel=web&status=in_progress&q=한빛` 을 새 탭에 붙여 넣어 같은 view 가 나오는지, 기본값(`all`)이 URL 에서 지워지는지, 필터 3회 조작 후 Back **1회**로 이전 화면에 가는지(`replace: true` — `useListState.ts:125`) 확인.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · A11Y-11 · A11Y-12 · ERP-13 · EXC-14 판정) · RTL(A11Y-11 의 select `aria-describedby` 부재 assert) · `inquiries.test.ts`(필터·검색·정렬·타입가드·**견적 발행 연동 5건** 회귀 — **이 화면에 컴포넌트 테스트는 없다. 어댑터 경계 테스트가 발행 계약의 정본이다**(`:101-104` 주석)).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(STATE-04 페이징·선택 부재 · FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재 · IA-05 폼 라우트 쌍 부재)
- [x] §2.1 산수 검산 — 8 pass + 11 종속 + 4 n-a + 7 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·날짜범위·CSV·좌측 필터)은 적지 않았다
- [x] **F3b 롤아웃이 이 화면에 닿은 것을 오탐 없이 반영했다** — `STATE-01`(로컬 `firstLoading` 파생 + `aria-busy` 분리 — `:131,211`) · `COMP-10`(`searchInputProps` 스프레드 — `:161`) · `IA-13`(`useListState` — `:112`) · `EXC-04` 의 유령 저장 절(`createCrudAdapter` 409). **FS-026 의 낡은 판정을 복사하지 않았다**
- [x] **EXC-04 의 409 가 '존재 여부' 기반이지 version/ETag 토큰이 아니며, 동시 편집은 여전히 last-write-wins 임**을 §2 · §4.2 · §5 #4 에서 흐리지 않고 갈랐다
- [x] **IA-02 의 사유 전환**(가지 폴백 해소 → h1 이중 + 행위 미반영)을 명시했다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`sales-inquiries`)와 op 3종을 **어댑터·프레임워크 코드에서 확인**했고, **`?delay=` 를 쓰지 않았으며**(이 화면에 존재하지 않음), **견적 발행 실패를 재현할 스위치가 없다는 사실**까지 적었다
- [x] '기준일 2026-07-17 · `HEAD = a5c2639` · E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-051 §7 · BE-051 §7.8 과 일치한다
- [x] **`/support/tickets`(FS-026)와 다른 화면**임을 §1.2 에 명시하고, 판정이 갈리는 이유(F3b 롤아웃 도달 여부)를 밝혔다
