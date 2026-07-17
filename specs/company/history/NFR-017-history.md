---
id: NFR-017
title: "연혁 관리 비기능 명세"
functionalSpec: FS-017
backendSpec: BE-017
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-017. 연혁 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-017 연혁 관리 (`/company/history` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구가 이 화면에서 ① 적용되는가 ② 어떤 코드로 충족되는가 ③ 무엇을 재현하면 판정되는가만 적는다 |
| 함께 읽는 문서 | FS-017(요소·예외) · BE-017(계약·보안 판정) · `specs/quality-bar.md`(요구 원문) |
| 갱신 규칙 | 요구 문구가 바뀌면 quality-bar 만 고친다. 이 문서는 **판정과 코드 근거**만 갱신한다. 코드가 바뀌면 근거의 파일:라인을 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · HEAD `a5c2639`** 기준 코드 대조. 직전 판정은 `4b805ad` 기준이었고, 이후 PR #22·#24·#26·#28·#30·#32·#34 가 머지되며 **이 화면의 P0 1건이 gap → pass 로 뒤집혔다**: **MOTION-02**(#26 이 Toast exit 애니메이션을 CSS-only 로 구현했다). **MOTION-01 은 gap 으로 남되 사유가 완전히 바뀌었다** — '애니메이션이 없다' 가 아니라 '이 화면이 쓰는 닫힘 경로(ConfirmDialog footer 버튼)만 애니메이션을 타지 않는다' 다. **A11Y-11 은 gap 유지** — 이 화면의 잔여 사유(`history-year` hint 미연결)는 PR #30 이 다룬 축(required 노출)과 **다른 축**이라 영향을 받지 않았다 — §2 각 행의 근거 라인 참조 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 `pages/company/history/**`) 또는 이 화면이 소비하는 CRUD 프레임워크(`shared/crud/**`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인. **상속 항목이라도 이 화면이 쓰는 그 표면의 코드를 직접 읽어 확인했으면 pass** |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | 상속 항목인데 이 문서의 범위에서 확정할 수 없다(DS 전역 grep 등) — 소유 문서의 판정을 따른다 |

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 측정 기준 열은 '무엇을 재현하면 이 판정이 확인/반증되는가'를 적은 것이며, 아직 실행된 절차가 아니다(§6).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | `useCrudList.tsx:71-72` 가 `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined` 로 **갈라서** 파생한다. `CrudListShell.tsx:136` 이 `loading={firstLoading}` 만 표에 넘기고, `CrudTable.tsx:143` 이 그때만 스켈레톤·`153` 이 0행일 때만 Empty·`CrudListShell.tsx:113` 이 error 일 때만 배너를 그린다. 폼도 같다 — `useCrudForm.ts:136`. **이 화면은 자체 `useQuery` 를 두지 않아 `isFetching` 직결 경로가 없다** | `/company/history` 진입 → 스켈레톤만(빈 상태 문구 없음). 등록 후 목록 복귀로 재조회 → 표가 스켈레톤/blank 로 바뀌지 않고 이전 행 유지 + '새로고침 중…'. `?fail=history:list` → Alert 만 | pass |
| STATE-02 | STATE | 직접 | `CrudListShell.tsx:157-164` 목록 조회 실패 → 인라인 `Alert tone="danger"` + '다시 시도'(`controller.refetch`). `FormPageShell.tsx:123-144` 상세 조회 실패 → 인라인 Alert. **read 실패에 토스트를 띄우는 경로가 없다**(`useCrudList` 의 `toast` 는 삭제 성공에만 쓰인다 — `useCrudList.tsx:108`) | `?fail=history:list` → 인라인 danger Alert + '다시 시도' 가 조회 재발행. 토스트 0건. `?fail=history:detail` 로 `/company/history/history-1/edit` → 폼 대신 Alert | pass |
| STATE-04 | STATE | **N/A** | **표면이 없다** — 이 화면에는 페이지네이션·필터·검색·정렬 컨트롤이 하나도 없다(`HistoryListPage.tsx` 전체 63줄, `CrudListShell` 에 Pagination 없음). 따라서 (a) total 축소 시 clamp 할 `page` 가 없고 (b) 선택을 해제할 계기(page/filter/keyword 변경)가 없다 | — (N/A) | n-a |
| TOKEN-01 | TOKEN | 직접 | 이 화면 전용 모듈의 시각 값이 전부 `var(--tds-*)` 다 — `HistoryListPage.tsx:17-23`(toolbarStyle) · `HistoryFormPage.tsx:17-21`(rowStyle). hex 0건, px 리터럴 0건, border/outline 키워드 0건. 파생 치수는 `calc(var(--tds-space-6) * 5)` 토큰 배수(TOKEN-08 이 지적하는 우회이나 P1) | `pages/company/history/**` 에 `#hex` · `[1-9]px` · `(outline\|border): (thin\|medium\|thick)` grep = 0. ESLint/stylelint 0 warning. **앱 전역 grep 은 TOKEN 소유 문서의 몫** | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 링은 두 곳에서 온다: `.tds-ui-focusable:focus-visible`(`shared/ui/ui.css:14-16`)이 `outline: var(--tds-border-width-medium) solid var(--tds-color-border-focus)` — 연도 입력(`HistoryFormPage.tsx:97`)·'목록으로' 버튼(`FormPageShell.tsx:150`)이 소비한다. TOKEN-02 가 지목한 nav row 위반은 **이미 해소**됐다 — `app-shell.css:14` 가 같은 토큰 쌍을 쓴다 | 연도 입력·목록으로 버튼·nav row 를 Tab → 링 두께가 픽셀 동일. bare border 키워드 grep = 0 | pass |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비자는 **토스트뿐**이다(삭제 성공 — `useCrudList.tsx:108`). `Toast.css:25` 가 `animation: tds-toast-in var(--tds-motion-duration-normal) var(--tds-motion-easing-decelerate)` 로 easing 토큰을 **그대로** timing-function 자리에 쓴다 — 토큰이 codegen 에서 `cubic-bezier()` 로 감싸 emit 되므로 유효하게 파싱된다(`Motion.stories.tsx:43` 이 이 사실을 명시). 폼·표의 transition 은 duration 만 쓴다 | 연혁 삭제 → 토스트 entrance 가 실제 재생(non-reduced-motion). 계산된 스타일의 animation-timing-function 이 `cubic-bezier(...)` 로 해석 | pass |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 floating/raised 표면 둘 다 semantic shadow 토큰을 쓴다: 삭제·이탈·충돌 다이얼로그 → `Modal.css:36` `box-shadow: var(--tds-shadow-modal)`; 폼 카드 → `Card.css:31` `box-shadow: var(--tds-shadow-raised)`. raw box-shadow 값 0건 | 삭제 다이얼로그·폼 카드가 light/dark 양쪽에서 배경 위로 부상. `box-shadow:` grep 이 `var(--tds-*shadow*)`/`none` 만 | pass |
| TOKEN-05 | TOKEN | 직접+상속 | 폼 `<h1>` 이 공유 `pageTitleStyle`(title.xl = 20px/600) 하나에서 온다 — `FormPageShell.tsx:160`(`h1 style={pageTitleStyle}`). AppHeader 의 `<h1>` 도 같은 원천(`AppHeader.tsx:52-55`). 다이얼로그 제목은 `Modal.css:57-60` title-xl. 본문은 body-md(16px)라 계층이 내려간다 | `/company/history/new` 의 `<h1>` 계산 font-size > body-md. 두 h1(헤더·본문)이 같은 tier 를 쓴다 — **다만 그 둘이 동시에 보이는 것 자체가 IA-02 gap 이다** | pass |
| COMP-10 | COMP | **N/A** | **표면이 없다** — 이 화면에 텍스트 검색·텍스트 필터 입력이 하나도 없다(`HistoryListPage.tsx` 에 `SearchField`·`useDebouncedSearch`·`useListState` import 0건). 폼의 연도(`type=number`)·내용(textarea)은 검색·필터 입력이 아니라 **저장 대상 입력**이라 query 발행·debounce·IME 커밋 규칙의 대상이 아니다(제출 시에만 검증 — `HistoryFormPage.tsx:131` `shouldValidate: false`) | — (N/A). **검색이 도입되면 `shared/crud/useDebouncedSearch.ts`(isComposing 처리 보유)를 소비해야 하며 그때 직접 판정으로 승격한다** | n-a |
| FEEDBACK-02 | FEEDBACK | 직접 | 파괴적 액션(단건·일괄 삭제)이 전부 `ConfirmDialog intent="delete"` 로 게이팅된다 — `useCrudList.tsx:152-179`. busy → `ConfirmDialog.tsx:148-155` 확인 버튼 `disabled` + `aria-busy` + 라벨 '처리 중…'. 실패 → 다이얼로그 유지 + `error` 배너(`ConfirmDialog.tsx:164`), 재클릭이 재시도. 취소/Esc/딤 → `closeDelete`(`useCrudList.tsx:86-92`)가 `abort()` + `mutation.reset()` + 상태 리셋 | `?fail=history:delete` → 행 삭제 확인 → 다이얼로그가 배너와 함께 열려 있고 재클릭이 재시도. 진행 중 Esc → 토스트 없이 버튼 상태 복원 | pass |
| FEEDBACK-04 | FEEDBACK | 직접 | `FormPageShell.tsx:114` 이 `useUnsavedChangesDialog(isDirty && !saving, {message})` 를 배선하고, 훅이 3경로를 모두 덮는다 — beforeunload(`useUnsavedChangesDialog.tsx:120-131`) · capture 단계 링크 가로채기(`134-155`, `_self`/수식키 edge case 포함) · popstate sentinel(`157-182`). `isDirty` 는 RHF(`useCrudForm.ts:261`). 저장 성공은 `replace` 이동이며 dirty 가 풀려 가드가 발화하지 않는다 | 연도를 고치고 ① 탭 닫기 ② 사이드바 '오시는 길' 클릭 ③ 브라우저 Back → 각각 discard 다이얼로그. 저장 후 같은 이동 → 프롬프트 없음 | pass |
| FEEDBACK-06 | FEEDBACK | **N/A** | **표면이 없다** — 이 화면에 **폼을 담은 모달이 없다**. 등록·수정은 전용 라우트(`App.tsx:187-188`)이고, 뜨는 모달은 확인 다이얼로그 3종(삭제·일괄 삭제·이탈 가드·충돌)뿐이라 담긴 입력이 없다. 폼의 dirty 보호는 FEEDBACK-04 가 담당한다 | — (N/A). IA-06 의 무게 규칙상 연혁은 rich 엔티티 → route 이므로 이 N/A 는 의도된 설계다 | n-a |
| A11Y-01 | A11Y | 상속 | `ToastProvider.tsx:164-171` 이 라이브 영역 2개(polite `role="status"` · assertive)를 **토스트보다 먼저·항상** 마운트하고 텍스트만 주입한다. 이 화면의 토스트(삭제 성공·저장 성공·취소)가 그 큐로 들어간다 | 연혁 삭제 → 스크린리더가 `'<이름>'을(/를) 삭제했습니다.` announce. 토스트 0건일 때도 컨테이너가 DOM 에 존재 | pass |
| A11Y-02 | A11Y | 상속 | `ConfirmDialog.tsx:130,135` 가 `useId()` 로 만든 `messageId` 를 `Modal` 의 `describedBy` 로 넘기고 `161` 이 그 id 를 본문 `<p>` 에 건다. `Modal.tsx:158` `aria-describedby={describedBy}`. 이 화면의 다이얼로그 4종이 전부 이 경로를 탄다 | 삭제 다이얼로그 open → 스크린리더가 제목 + `'<이름>'을(/를) 삭제합니다…` 를 함께 읽음. dialog 의 aria-describedby 가 message `<p>` id 로 해석 | pass |
| A11Y-11 | A11Y | 직접 | **직전 판정의 gap 사유(required 미노출)는 F3a 에서 닫혔다. 그러나 gap 은 남는다 — 이 갱신에서 새로 확인한 hint 미연결 때문이다.** ① `aria-invalid` ↔ `aria-describedby` 짝은 전수 성립한다 — 연도 `HistoryFormPage.tsx:101-102`, 월 `112-113`, 내용은 `TextareaField.tsx:67` 이 자체 배선하며 `FormField.tsx:110-112` 가 그 id 로 `role="alert"` `<p>` 를 그린다 ✅. ② **required 노출 — 이제 충족한다(F3a).** 직전 판정은 '세 컨트롤 어디에도 native `required`/`aria-required` 가 없다' 였다. 지금은 셋 다 닿는다: **연도** 자식이 네이티브 `<input type="number">`(`:92-104`) → `FormField.withAriaRequired()` 가 `aria-required` 를 `cloneElement` 로 주입(`FormField.tsx:50-56,107`, 대상 판별 `:38-41`) · **월** 자식이 DS `SelectField`(`:108-123`) → 같은 주입 대상이며 `SelectField` 가 native 속성을 `<select>` 로 패스스루한다(`SelectField.tsx:42,55-63`) · **내용** `TextareaField` 가 자기 `<textarea>` 에 native `required` + `aria-required` 를 직접 낸다(`TextareaField.tsx:64-65`) ✅. `<form noValidate>` 는 여전하지만 AT 경로는 `aria-required` 로 열렸다. ③ **hint 미연결 — 잔여 gap(이번 갱신에서 새로 확인).** 연도 FormField 가 `hint={`${YEAR_MIN} ~ ${YEAR_MAX}`}`(`:90`)를 갖고 `FormField.tsx:114-118` 이 `<p id="history-year-hint">` 를 그리지만, 호출부의 `aria-describedby` 는 **error 일 때만** 붙는다(`:102` — `errors.year !== undefined ? errorIdOf('history-year') : undefined`) → valid 상태에서 '2018 ~ 2100' 이 AT 에 전달되지 않는다. **직전 문서는 이 절을 판정하지 않았다** — NFR-015 §2·NFR-018 §2 가 같은 결함을 이미 기록하고 있어 판정 축을 맞췄다. `FormField` 는 id 만 노출하고 배선은 호출부 책임이다(`FormField.tsx:10-11` 주석) | ① 빈 폼 제출 → 각 입력의 `aria-describedby` === `role=alert` `<p>` id (통과). ② RTL: 연도·월·내용의 `aria-required` 조회 → **전부 `"true"`** → 충족. **⚠ grep 으로 판정하지 말 것** — `grep -rn "aria-required" apps/admin/src` 는 여전히 1건(수동 override)뿐이며 주입은 **런타임**이다. ③ 연도에 유효값(2024) 입력 → `aria-describedby` 가 `history-year-hint` 를 가리키는지 → **현재 `undefined`** → **미충족(잔여 gap)** | **gap** |
| A11Y-12 | A11Y | **N/A** | **표면이 없다** — 이 화면에 좌측 필터 목록·토글 필터가 없다(필터 자체가 없다). 따라서 selected state 를 표기할 대상이 없다. 앱 전역 `aria-current` 는 nav `NavLink` 가 자체적으로 붙이는 것뿐이며 그것은 toggle 이 아니라 navigation 이라 이 요구의 대상이 아니다 | — (N/A) | n-a |
| MOTION-01 | MOTION | 상속 | **gap 이 남지만 사유가 완전히 뒤집혔다 — '애니메이션이 없다' 가 아니라 '이 화면이 쓰는 닫힘 경로만 애니메이션을 타지 않는다' 다.** 직전 판정('`Modal.css` 에 animation 선언 0건 · 즉시 삽입/제거')은 **PR #26 이 반증했다**: backdrop fade(enter `Modal.css:20-21` → `@keyframes tds-modal-backdrop-in :126-134` · exit `:30-33` → `tds-modal-backdrop-out :136-144`)와 dialog scale(enter `:58-59` → `tds-modal-dialog-in :146-156`, opacity 0→1 · `scale(0.96)→scale(1)` · exit `:35-38` → `tds-modal-dialog-out :158-168`, `forwards`)이 **실재하고**, `component.overlay` recipe(`tokens/tokens.json:1286-1308`)를 소비하며, reduced-motion 게이트(`Modal.css:173-180`)도 있다. **AnimatePresence 는 없지만 요구의 실질('exit 완료 후에만 unmount')은 CSS `onAnimationEnd` 로 동등 달성했다** — `Modal.tsx:216-218` 이 keyframes 이름 상수(`:43` `'tds-modal-dialog-out'`)와 대조해 그때만 `onClose()` 를 쏜다. **그러나 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232` — 전부 `requestClose` `:122-126` 경유)뿐이고, 이 화면의 다이얼로그 4종은 전부 `ConfirmDialog` 다.** `ConfirmDialog` 의 **footer 버튼(취소 `:145` `onClick={onCancel}` · 확인 `:153` `onClick={onConfirm}`)은 `Modal` 을 거치지 않고 호출부 콜백을 직행**하며 호출부가 즉시 언마운트한다 — `Modal.tsx:27-31` 이 그 한계를 명시한다(Modal 은 footer 를 불투명 슬롯으로 렌더(`:240`,`:252`)하고 핸들러를 감싸지 않는다). **삭제 다이얼로그를 '취소'나 '삭제'로 닫는 것이 이 화면의 주 경로인데 그 경로가 정확히 exit 애니메이션을 타지 않는다** — 그래서 gap 이다. **리포 전체에 Motion 라이브러리는 여전히 없다**(`package.json` 19개 · import · lockfile 전부 0건) — 모든 모션이 손수 쓴 CSS keyframes 다 | 삭제 확인 다이얼로그를 **Esc/딤/×** 로 닫기 → backdrop fade + dialog scale(0.96) 재생 후 DOM 제거 (**통과**). 같은 다이얼로그를 **'취소' 또는 '삭제' 버튼**으로 닫기 → 애니메이션 없이 즉시 제거 (**반증 — 잔여 gap**). `Modal.css` 에 `@keyframes` grep = **4건**(직전 판정의 '0건' 은 낡았다) | **gap** |
| MOTION-02 | MOTION | 상속 | **PR #26 에서 뒤집혔다(gap → pass) — 완전 구현이다.** 직전 판정('`ToastProvider.tsx:99-101` 이 즉시 filter-out · `Toast.css:25` 에 exit 대응물 없음')은 **절반만 낡았다**: 그 `dismiss` 의 `setToasts(prev => prev.filter(...))`(`ToastProvider.tsx:99-100`)는 **여전히 있으나 이제 그것이 최종 제거일 뿐이고, 그 앞에 exit 애니메이션이 놓였다.** `Toast.tsx` 가 `onDismiss` 의 **호출 시점을 퇴장 애니메이션 뒤로 미룬다**(주석 `:19-22`): 자동소멸 타이머·닫기(×)·재시도 → `requestDismiss`(`:159-162`) → `exiting` → 클래스 `tds-toast--exiting`(`:183`) → `onAnimationEnd` 가 `TOAST_EXIT_ANIMATION`(`:32` = `'tds-toast-out'`)과 매치될 때만 `onDismiss?.(id)`(`:186-187`) → 그때 provider 가 큐에서 뺀다. CSS `Toast.css:32-37` `.tds-toast--exiting`(`tds-toast-out … forwards` + `pointer-events:none`), keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`). **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족한다** — `component.overlay` recipe 소비(`Toast.css:35-36`)로 `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`). reduced-motion 게이트 `Toast.css:136-141`(주석 `:133-135` 가 `--exiting` 을 명시 나열한 이유까지 기록한다 — 특이도가 같아 소스순서 의존이 조용히 깨지기 때문). jsdom/reduced-motion 에서는 `willAnimate()`(`Toast.tsx:39-45`)가 false 라 즉시 `onDismiss`(`:175-176`) — 기존 단위 테스트의 '4초 뒤 onDismiss' 단언이 그대로 유효하다(`Toast.test.tsx:17-21` 이 그 설계를 명시) | 삭제 성공 토스트가 4초 후 자동 소멸 → **아래로 가라앉으며 fade out 한 뒤** DOM 제거. 3개 스택에서 특히 가시적. `prefers-reduced-motion: reduce` → 애니메이션 없이 즉시 제거(정보 손실 0) | **pass** |
| MOTION-03 | MOTION | 상속 | 이 화면에서 움직이는 표면이 전부 reduced-motion 게이트를 통과한다: 스켈레톤 pulse → `ui.css:110-114` `animation-name: none`; Button 배경 transition → `Button.css:158` reduced-motion off; **PR #26 이 더한 Modal/Toast 애니메이션도 각자 게이트를 갖고 태어났다** — `Modal.css:173-180`(backdrop·dialog·closing 변종 전부 `animation: none`) · `Toast.css:136-141`. 이 화면에 ToggleSwitch 는 렌더되지 않는다 | `prefers-reduced-motion: reduce` 로 `/company/history` 구동 → 스켈레톤 pulse 정지, Modal/Toast 가 애니메이션 없이 즉시 나타나고 사라짐, 어떤 요소도 move/scale 하지 않음. **직전 판정이 단 유보('DS 전역으로는 `ToggleSwitch.css:56` 의 `transition: transform` 이 여전히 게이트 밖이다')는 이제 사실이 아니다** — `ToggleSwitch.css:79-84` 가 `@media (prefers-reduced-motion: reduce)` 로 `.tds-toggle__track`·`.tds-toggle__knob` 의 `transition: none` 을 건다(근거 주석 `:76-78`: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향을 주는 반면, 상태는 색·위치·`aria-checked` 로 이미 전달되므로 전환 제거 시 정보 손실이 0 이다). 이 화면의 표면은 아니지만 **유보 자체가 해소됐으므로 기록해 둔다** | pass |
| IA-01 | IA | 상속 | 이 화면의 3개 라우트가 전부 `RequireAuth > AppShell` 레이아웃 라우트 아래에 있다 — `App.tsx:324-336` 이 `APP_ROUTES`(186-188 에 연혁 3건)를 그 안에서 렌더한다. `HistoryListPage`/`HistoryFormPage` 는 자체 sidebar/top bar/outer frame 을 만들지 않는다(파일 전수 확인) | `/company/history` · `/new` · `/:id/edit` 모두 사이드바 + AppHeader + 단일 `<main>` 안에 렌더. 페이지가 그리는 frame 0건 | pass |
| IA-02 | IA | 직접 | **gap 이 남지만 사유가 절반 바뀌었다 — 가지 라벨 폴백은 통합에서 해소됐고, `<h1>` 이중 + 행위 미반영이 남았다.** **① 해소됨(가지 폴백):** 직전 판정은 `findNavLabel('/company/history/new')` 이 가지 루프에서 `.startsWith('/company')` 로 **'기업 관리'** 를 반환한다고 적었다. 그 구현이 사라졌다 — 통합이 `findNavLabel` 을 `findCoveringLeaf` 위에 다시 얹었고(`nav-config.ts:297-299` — `findCoveringLeaf(pathname)?.label ?? pathname`), 그 함수는 **'자기를 감싸는 가장 긴 잎'** 을 찾는다(`:260-278`). `covers()` 가 **세그먼트 경계**에서만 매칭하므로 `/company/history/new` 는 잎 `'연혁'` 에 덮인다 — 권한(`permissions/route-resource.ts`)이 쓰던 규칙과 한 곳으로 통일된 결과다. 회귀 방어선: `nav-config.test.ts:16-40` 이 `/company/history/new` → **'연혁'** 을 고정한다. **② 남음(행위 미반영):** `nav-config.ts:294-296` 주석이 밝히듯 **'등록/수정' 행위는 제목에 넣지 않는다(의도)**. 그래서 `/company/history/new` 의 AppHeader `<h1>` 은 '연혁' 이지 quality-bar IA-02 가 예시로 든 **'연혁 등록' 이 아니다.** **③ 남음(`<h1>` 이중 — 단일 title 메커니즘 미충족):** `AppHeader.tsx:101` 이 `<h1>{title}</h1>` 을 그리는 동시에 `FormPageShell.tsx:160` 이 두 번째 `<h1>{isEdit ? '연혁 수정' : '연혁 등록'}</h1>` 을 그린다 — **한 화면에 `<h1>` 이 2개다.** 게다가 **title 의 원천이 화면 종류마다 다르다**: 목록(`/company/history`)은 AppHeader 만(본문 `<h1>` 없음), 폼은 AppHeader + in-content h1 둘 다 — quality-bar 가 요구하는 '단일 page-header/title 모델을 정의·균일 적용' 이 성립하지 않는다 | `/company/history/new` 진입 → AppHeader 제목이 **'연혁'**(개선 확인 — 더 이상 '기업 관리' 가 아니다). 그러나 `document.querySelectorAll('h1').length === 2` 이고 `[0].textContent === '연혁'` · `[1].textContent === '연혁 등록'` → **단일 title 메커니즘 미충족**. 기대: h1 1개 + 구체 title | **gap** |
| IA-04 | IA | 직접 | **미충족.** 템플릿 앞 4단은 성립한다 — 툴바 우상단 primary 등록 버튼(`HistoryListPage.tsx:42-49` `justifyContent: flex-end`), 결과 count 요약(`CrudListShell.tsx:118-122`), SelectionBar(`125-133`), 표(`135`). **마지막 단(Pagination)이 없다** — `CrudListShell.tsx` 에 Pagination import·렌더 0건이고 `HistoryListPage.tsx:55` 가 `visibleItems={controller.items}` 로 **전 행을 그대로** 넘긴다. `CrudTable.tsx:171` 이 그것을 전부 map 한다. 연혁은 해마다 단조 증가하는 누적 데이터라 'page size 초과 가능'이 확실하다 | 연혁을 11건 이상 등록 → Pagination 이 렌더되지 않고 전 행이 한 화면에 쌓인다. `CrudListShell.tsx` 에 `Pagination` grep = 0 | **gap** |
| IA-05 | IA | 직접 | `App.tsx:187-188` 이 `/company/history/new` 와 `/company/history/:id/edit` 를 **같은 `<HistoryFormPage />`** 에 매핑한다. `useCrudForm.ts:73-74` 가 `useParams().id` 유무로 `isEdit` 를 정하고, `FormPageShell.tsx:160,189` 가 그 값으로 title('연혁 등록'/'연혁 수정')과 제출 라벨('등록'/'저장')만 바꾼다. 레이아웃·필드는 동일하며 create 전용/edit 전용 페이지가 없다 | 두 경로가 같은 컴포넌트로 해석. `/new` = 빈 폼 + '연혁 등록', `/:id/edit` = prefill + '연혁 수정'. 레이아웃 차이 0 | pass |
| IA-13 | IA | **N/A** | **직렬화할 상태가 없다** — 이 화면에 page·page-size·filter·keyword·sort 가 **하나도 없다**(`HistoryListPage.tsx` 는 `useState`·`useSearchParams`·`useListState` 를 전혀 쓰지 않는다. 정렬은 `sortHistory` 고정). 따라서 back/forward·refresh·링크 복사가 잃을 view 상태가 존재하지 않는다 — 목록 URL 은 언제나 `/company/history` 하나다 | — (N/A). **이 N/A 는 IA-04 gap 의 그림자다**: Pagination·필터가 도입되는 순간 IA-13 은 `직접` 으로 승격되며 `shared/crud/useListState.ts`(URL 직렬화 보유)를 소비해야 한다. 그때 이 행을 다시 판정한다 | n-a |
| EXC-01 | EXC | 상속 | 경계가 2겹이다 — `App.tsx:311-315` 루트 경계(셸 자체가 던지는 경우) + `AppShell.tsx:484-489` `<Outlet>` **바로 바깥** 경계(`resetKey={pathname}`). 후자가 이 화면의 렌더 예외를 잡아 사이드바·헤더를 살린 채 `RouteErrorScreen` 을 그리고, 다른 메뉴로 이동하면 `resetKey` 변경으로 스스로 풀린다 | `HistoryListPage` 에 강제 throw 주입 → 사이드바 유지 + 복구 UI, 다른 메뉴 이동 가능, 앱 unmount 안 됨 | pass |
| EXC-02 | EXC | 상속 | ① 라우트 가드: `App.tsx:324-329` 이 `RequireAuth` 를 **AppShell 바깥**에 둬 세션이 없으면 셸도 그리지 않고 `/login?returnUrl=<현재 경로>` 로 보낸다. ② mid-session 401: `queryClient.ts:41-43` 이 `QueryCache`·`MutationCache` 의 `onError` 에 **단일 인터셉터**(`handleQueryLayerError` → `isUnauthorized` → `notifySessionExpired`)를 걸어 이 화면의 조회·쓰기 401 을 전부 덮는다 — 화면에 복사된 분기가 없다 | 세션 없이 `/company/history` deep-link → `/login?returnUrl=%2Fcompany%2Fhistory` 로 redirect 후 로그인하면 복귀. `?status=history:list:401` → 재인증 경로 | pass |
| EXC-03 | EXC | 직접 | **절반만 충족.** ① route-level authorization 은 성립한다 — `AppShell.tsx:490-492` 가 `<Outlet>` 을 `RequirePermission` 으로 감싸고, `RequirePermission.tsx:62-63` 이 `useRouteCan('read')` 실패 시 `ForbiddenScreen` 을 렌더한다. 리소스는 `route-resource.ts:36-46` 이 경로에서 파생하므로 `/company/history/new` 도 잎 `/company/history` 로 덮인다. ② **write-action 게이팅이 배선되지 않았다** — `useRouteWritePermissions`(`RequirePermission.tsx:45-52`)의 **소비자는 F3b 이후 7곳이지만(products 3 · settings 4) `pages/company/**` 는 그 목록에 없다** (`grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**) — '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`). 그래서 `HistoryListPage.tsx:44` 의 '연혁 등록', `CrudTable.tsx:192-197` 의 행 수정/삭제, `CrudListShell.tsx:126-132` 의 일괄 삭제가 **read-only 역할에도 그대로 렌더되고 눌린다**. 강등 reconcile 도 같은 이유로 성립하지 않는다 | read 권한 OFF 로 `/company/history` deep-link → 403 화면 (통과). **remove/create 권한만 OFF → '연혁 등록'·행 휴지통·'선택 N건 삭제' 가 여전히 보이고 클릭되어 서버 403 으로만 막힌다 (반증)** | **gap** |
| EXC-04 | EXC | 직접 | 어댑터가 유령 저장을 차단한다 — `crud.ts:126-128` `update` 가 대상 id 부재 시 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`, `82-84` `remove` 가 `HttpError(409, '이미 삭제된 항목입니다.')` 를 던진다(예전에는 `map`/`filter` 가 조용히 통과시켜 success 를 반환했다). `useCrudForm.ts:160-172` 가 `isConflict`(409+412 — `http-error.ts:105-107`)로 잡아 **입력을 보존한 채** conflict 상태를 세우고, `FormPageShell.tsx:195` → `FormFeedback.tsx:58-74` 가 '최신 내용 불러오기'/'이어서 편집' 다이얼로그를 띄운다. **성공 토스트도 목록 이동도 없다**(`useCrudForm.ts:211-217` 의 `onSuccess` 를 타지 않는다) | `?status=history:save:409` 로 수정 저장 → 입력 유지 + 충돌 다이얼로그, success toast/navigation 0건. 목록에서 지워진 id 로 `/:id/edit` 저장 → ghost 'saved' 대신 충돌 다이얼로그. **잔여**: `HistoryItem` 에 `updatedAt`/`version` 이 없어(BE-017 §3) *동시 편집*(삭제가 아닌)은 여전히 last-write-wins — appliesTo 가 '엔티티에 updatedAt 존재'로 한정되고 acceptanceCheck 2건이 모두 통과하므로 pass 로 판정하되 BE-017 §7.4 에 승격 계약을 남겼다 | pass |
| EXC-08 | EXC | 직접 | 3중이다 — ① `FormPageShell.tsx:189` `disabled={saving \|\| loadingDetail}` ② `useCrudForm.ts:103,202-203` **동기 제출 락**(`submitLockRef`)이 RHF 비동기 검증 때문에 생기는 'saving 이 true 가 되기 전' 틈을 닫는다(ref 는 렌더를 기다리지 않는다) ③ `useCrudForm.ts:118-123,205` **제출 시도 단위 멱등키**를 `mutationFn` **밖**(ref)에서 만들어 재시도가 같은 키를 재사용하고, 성공 시 버린다(`214`). `onInvalid`(`239-241`)가 검증 실패 시 락을 푼다 | '등록' 더블클릭 / 응답 전 Enter 연타 → 정확히 1건 요청. 실패 후 재클릭 → 같은 `Idempotency-Key`(키가 `mutationFn` 밖에 존재) | pass |
| EXC-09 | EXC | 직접 | 단일 predicate `isAbort`(`async.ts:40-42`)로 통일된다 — `useCrudList.tsx:110` 삭제 onError 가 abort 면 즉시 return(배너 없음), `86-89` `closeDelete` 가 `abort()` + `deleteItem.reset()`; `useCrudForm.ts:157` 쓰기 onError 가 abort 면 return, `92` 언마운트 시 abort; `bulk.ts:20` `settleAll` 이 **abort 를 실패 건수에서 제외**; `crud.ts:238` `useCrudBulkDelete.onSuccess` 가 `signal.aborted` 면 무효화도 하지 않는다 | 삭제 요청 중 Esc → 토스트 0건 + 버튼 상태 복원 + `isPending` 리셋. 저장 중 라우트 이탈 → 실패 배너 0건. 일괄 중 취소 → 부분 실패 건수에 abort 미포함 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **20** | STATE-01 · STATE-02 · TOKEN-01 · TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · FEEDBACK-04 · A11Y-01 · A11Y-02 · **MOTION-02** · MOTION-03 · IA-01 · IA-05 · EXC-01 · EXC-02 · EXC-04 · EXC-08 · EXC-09 |
| 종속 | **0** | — (상속 항목이라도 이 화면이 소비하는 표면의 코드를 전부 직접 읽어 pass/gap 으로 확정했다) |
| n-a | **5** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-13 |
| **gap** | **5** | **A11Y-11 · MOTION-01 · IA-02 · IA-04 · EXC-03** |
| **합계** | **30** | 20 + 0 + 5 + 5 = **30** ✅ |

> **이번 기준 갱신(`4b805ad` → `a5c2639`)으로 P0 1건이 gap → pass 로 뒤집혔다** — **MOTION-02**: PR #26 이 Toast exit 를 CSS-only 로 완전 구현했다(`Toast.css:32-37`·`:121-131`, `Toast.tsx:186-187` 이 `onAnimationEnd` 로 큐 제거를 미룬다). **MOTION-01 은 gap 으로 남았으나 사유가 전면 교체됐다** — 오버레이 모션 자체는 구현됐고, `ConfirmDialog` 의 **footer 버튼 경로만** exit 애니메이션 밖이다(`Modal.tsx:27-31`). **A11Y-11 은 gap 유지** — 이 화면의 잔여 사유(`history-year` hint 미연결)는 PR #30 이 다룬 축(required 노출)과 **다른 축**이고, 형제 화면 NFR-019·NFR-020·NFR-021 이 #30 으로 A11Y-11 을 닫은 것과 **이 화면이 갈리는 지점**이다(그쪽 잔여 사유는 `ImageUploadField` 의 required 였고 이 화면은 그 표면이 없다).
>
> **P0 gap 5건 → quality-bar §How to use 상 이 화면은 여전히 acceptance 실패다.** 5건 중 이 화면 전용 원인은 0건이다 — 전부 공용 계층(`shared/crud` 껍데기 · DS Modal/ConfirmDialog · FormField · AppHeader/nav-config · permissions 배선)에서 발생하며 형제 화면(인증서·ESG)에 동일하게 걸린다. §5 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery`(`crud.ts:151`)가 `placeholderData: (previous) => previous`, `queryClient.ts:24,47` 이 `staleTime: 30_000`. `CrudListShell.tsx:118-120` 이 재조회 중 건수를 유지한 채 '새로고침 중…'만 덧붙인다 | 등록 후 목록 복귀 → 이전 행 유지. 30초 내 재진입은 network refetch 없음 | pass |
| STATE-05 | P1 | Empty 3분기 자체는 `Empty.tsx:53-99` 가 갖췄고 조사(이/가)도 자동(`hasBatchim`)이나, **이 화면은 맥락을 넘기지 않는다** — `HistoryListPage.tsx:52-61` 에 `empty` prop 이 없어 `CrudTable.tsx:108` 의 `empty = {}` 로 떨어진다. 검색·필터가 없어 3분기 중 'truly empty' 만 도달 가능하므로 분기 자체는 문제가 아니지만, **`createAction`(생성 CTA)이 없어** '등록된 연혁이 없습니다' 만 보이고 등록 버튼은 툴바에만 있다 | 시드 0건 → Empty 에 primary create CTA 없음 | gap |
| STATE-06 | P1 | `crud.ts:180,199-201,219` 가 create/update/delete 성공 시 list(+detail) 만 정확히 무효화한다. 이 화면에 다른 의존 쿼리(summary/count)가 없다 | 등록 후 목록 복귀 → 수동 새로고침 없이 새 행 | pass |
| A11Y-03 | P1 | `ConfirmDialog.tsx:132-158` 이 `Modal` 에 `initialFocusRef` 를 넘기지 않는다 → `Modal.tsx:91-93` 이 `focusables()[0]` 로 폴백하는데, DOM 순서상 첫 focusable 은 **헤더의 닫기(×) 버튼**(`Modal.tsx:169`)이다. delete/discard intent 에서 Cancel 에 초기 포커스가 가야 한다는 요구와 어긋난다 | 삭제 다이얼로그 open → `document.activeElement` 가 Cancel 이 아니라 `aria-label="닫기"` 버튼 | gap |
| A11Y-05 | P1 | 월 select 가 `SelectField`(`SelectField.tsx:57`)로 `aria-invalid` 를 AT 에 전달하고, 호출부가 `aria-describedby` 를 넘긴다(`HistoryFormPage.tsx:113`) | 월 미선택 제출 → `<select aria-invalid="true" aria-describedby="history-month-error">` | pass |
| A11Y-06 | P1 | `AppShell.tsx:429` `<SkipToMain />` 이 셸의 첫 focusable, `474` `<main id="tds-main" tabIndex={-1}>` | `/company/history` 에서 첫 Tab → skip link, 활성화 → main 포커스 | pass |
| A11Y-07 | P1 | `AppShell.tsx:324-340` `RouteFocusAnnouncer` 가 pathname 변경 시 main 포커스 + polite live region 에 `findNavLabel(pathname)` 주입 | 목록 → 등록 이동 시 포커스가 main 으로. **다만 announce 되는 이름이 IA-02 와 같은 이유로 '기업 관리' 다** | pass(문구는 IA-02 gap 에 종속) |
| A11Y-08 | P1 | `CrudTable.tsx:172` 가 `rowActivateProps` 로 행 클릭 이동을 붙이지만 **행 안에 같은 목적지로 가는 focusable 링크가 없다** — 연도·월·내용 셀은 전부 plain text(`HistoryListPage.tsx:36-40`). `useRowNavigation.ts:9-11` 이 스스로 '마우스 전용이며 접근 가능한 경로가 이미 존재한다는 전제 위에서만 쓴다' 고 못 박았는데 그 전제가 이 화면에서 성립하지 않는다. 키보드 사용자는 행 액션의 연필 버튼으로만 도달한다 | 행을 Tab → 체크박스 → 연필 → 휴지통 순. 이름 링크 없음 | gap(연필 버튼이 등가 경로라는 해석이면 완화 — UI 기획 판단 필요) |
| A11Y-13 | P1 | 제출 검증 실패 시 첫 invalid 필드로 포커스는 성립한다 — `useCrudForm.ts:253` 이 `handleSubmit(onValid, onInvalid)` 를 쓰고 RHF `shouldFocusError` 기본값이 동작한다. **폼 진입 시 첫 필드 자동 포커스는 없다** — `HistoryFormPage.tsx` 에 `setFocus`/autoFocus 0건 | 빈 폼 제출 → activeElement = 연도 입력 (통과). `/new` 진입 직후 activeElement = body (반증) | 부분 gap |
| A11Y-16 | P1 | 이 화면이 새로 만든 인터랙티브 표면은 없다 — 전부 DS/공용 프레임워크 소비 | — | 종속 |
| MOTION-04 | P1 | `CrudTable.tsx:171-201` 행이 add/remove 시 snap in/out 한다(FLIP 없음). **Motion 라이브러리는 여전히 없고**(package.json 19개 · import · lockfile 전부 0건) 행 재배치는 CSS keyframes 로 표현하기 어려운 축이라 Modal/Toast 가 간 CSS-only 경로를 그대로 쓸 수 없다 — MOTION-01/02 와 뿌리가 갈렸다 | 행 삭제 → 나머지 행이 즉시 점프 | gap |
| MOTION-08 | P1 | **뒤집혔다(gap → pass) — PR #26 이 recipe 를 만들고 두 오버레이가 소비한다.** `component.overlay` 4토큰이 실재하고(`tokens/tokens.json:1286-1308` — `enter-duration` `{motion.duration.normal}` 250ms · `enter-easing` `{motion.easing.decelerate}` · `exit-duration` `{motion.duration.fast}` 150ms · `exit-easing` `{motion.easing.accelerate}`), `Modal.css:20-22,24-37` 과 `Toast.css:30,35-36` 이 **같은 recipe** 를 소비한다 — 주석이 그 의도를 명시('오버레이는 한 몸처럼 움직인다'). `easing.accelerate` primitive `tokens/tokens.json:486` = `cubic-bezier(0.4, 0, 1, 1)` | 삭제 다이얼로그·토스트의 exit 가 `--tds-component-overlay-exit-*` 를 소비 → duration 150ms · timing-function `cubic-bezier(0.4, 0, 1, 1)` | pass |
| IA-03 | P1 | breadcrumb 이 없다 — `AppHeader.tsx` 는 단일 라벨만 그린다. `/company/history/new` 에서 '기업 관리 > 연혁 > 등록' trail 부재 | 등록 화면에 trail 0건 | gap |
| IA-07 | P1 | `FormPageShell.tsx:147-155` 이 '목록으로' + `ChevronLeftIcon` + 좌상단 배치 — 표준과 일치 | 폼 back-link 문구·아이콘·위치 일치 | pass |
| IA-08 | P1 | `FormPageShell.tsx:179-191` 이 카드 **안** 우측에 취소(secondary) → 저장(primary) 순 | 취소·저장이 in-card footer 우측 | pass |
| IA-14 | P1 | 반응형 선언이 없다 — `AppShell.tsx:83` 사이드바 폭 고정, `CrudTable` 에 가로 scroll 컨테이너 없음. 행 액션 아이콘 버튼의 touch-target 미검증 | 768/375px 에서 사이드바 collapse 없음, 표 overflow | gap(앱 전역) |
| ERP-06 | P1 | 문구가 shared 템플릿을 탄다. **'연혁을 등록했습니다.'(`useCrudForm.ts:222`)의 조사는 리터럴 폴백이 아니라 `objectParticle` 파생이다**(ERP-13 참조 — 통합에서 해소). **남은 것은 동사 축 하나**: 월은 `SelectField` 인데 미선택 문구가 '월을 **입력**하세요.' 다 — `requiredText` 가 동사를 '입력' 으로 고정하기 때문이다(`shared/crud/validation.ts:17`). 고르는 컨트롤에는 '선택하세요' 가 맞다 | 월을 비우고 제출 → '월을 입력하세요.'(기대: '월을 선택하세요.') | gap |
| ERP-08 | P1 관련(P2) | **`formatNumber(item.year)`(`HistoryListPage.tsx:25,37`)가 공유 formatter 를 잘못된 축에 적용한다** — 연도는 수량이 아닌데 천 단위 구분이 붙어 '2,018년' 이 된다. `nameOf` 를 타고 접근 이름·확인 문구·토스트까지 전파 | 목록의 연도 셀이 '2,018년'. 삭제 확인 문구가 `'2,018년 3월'을 삭제합니다.`(조사는 `objectParticle` 파생이라 옳고, **틀린 것은 `formatNumber` 가 만든 '2,018년' 쪽이다**) | **gap (이 화면 고유 결함)** |
| ERP-13 | P1 | **통합에서 뒤집혔다(gap → pass).** 조사 헬퍼가 **`shared/format.ts:269+` 로 승격**됐다 — 이전엔 사본이 셋이었고(`logs/josa.ts` · `notifications/_shared/notification.ts` · `@tds/ui` 의 `Empty`) 앱 shared 에는 없었다. 지금 `requiredText` 가 그 헬퍼로 조사를 조립한다 — `shared/crud/validation.ts:17`(`${label}${objectParticle(label)} 입력하세요.`) · `:21,24`(`${label}${topicParticle(label)} …자를 넘을 수 없습니다.`). 받침 판정은 한글 음절의 종성 코드로 한다(`format.ts:281-295`), 한글이 아니면 관용대로 받침 없음('API를'). 직전 판정이 지목한 세 자리가 전부 그것을 소비한다 — 삭제 토스트 `useCrudList.tsx:108`(`'${nameOf(target)}'${objectParticle(nameOf(target))} 삭제했습니다.`) · 삭제 확인 다이얼로그 `:158` · 저장 성공 토스트 `useCrudForm.ts:222`(`${config.entityLabel}${objectParticle(config.entityLabel)} ${verb}했습니다.`). 이 화면의 `nameOf` 는 `'2024년 3월'`(`HistoryListPage.tsx:25`) 이라 받침이 갈린다 — '3월'(종성 ㄹ) → `'2024년 3월'을 삭제했습니다.` | **`grep -rn "을(를)\|이(가)\|은(는)" pages/company/` → 0건**(사용자 대상 리터럴). 앱 전역 grep 히트 12건이 남지만 전부 ① 주석 ② '이 리터럴을 내지 않는다'를 단언하는 테스트 ③ 헬퍼 자신의 설명문이다 | pass |
| ERP-15 | P1 | 전 행 렌더(IA-04 참조). virtualization·page-size cap 없음 | 연혁 1,000건 → 1,000행 DOM | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전체 0건. `async.ts:15-32` `wait` 에 ceiling 없음 | never-resolving fixture → 무한 spinner | gap(앱 전역) |
| EXC-06 | P1 | `HttpError`(`http-error.ts:45-61`)가 status 를 지니고 화면이 404/409/412/422 로 분기한다. **단 403·429 는 이 화면에서 별도 surface 가 없다** — 조회는 일반 배너, 쓰기는 일반 저장 실패 배너로 떨어진다 | `?status=history:save:403` → '저장하지 못했습니다' 일반 배너(권한 전용 문구 아님) | 부분 gap |
| EXC-07 | P1 | `useCrudForm.ts:182-192` 이 422 `violations` 를 RHF `setError` 로 각 입력에 꽂고 첫 필드로 포커스. **서버가 필드 거절을 400 으로 주면 이 경로를 타지 않는다** — BE-017 §7.8/§7.9 #1 | `?status=history:save:422` 는 violations 가 없어 일반 배너. 실제 백엔드 연결 후 재판정 | 종속(BE-017) |
| EXC-10 | P1 | **`crud.ts:239` 가 `failed === 0` 일 때만 목록을 무효화한다** → 부분 실패 시 이미 삭제된 행이 표에 남는다. 게다가 `useCrudList.tsx:126,144` 가 실패 시 선택을 유지하므로 재클릭이 **성공분까지 다시 DELETE** 하고, 그것들은 `crud.ts:83` 의 409 로 떨어져 실패 건수가 오히려 늘어난다. `settleAll`(`bulk.ts:19-21`)이 건수만 돌려주고 실패 id 를 주지 않아 '실패분만 재시도'가 구조적으로 불가능 | 3건 선택 + `?fail=history:delete` 를 일부에만 적용해 부분 실패 재현 → 삭제된 행이 표에 잔존, 재클릭 시 실패 건수 증가 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 앱 전체 0건 | offline 토글 → 배너 없음 | gap(앱 전역) |
| EXC-12 | P1 | `useCrudForm.ts:144-149` 이 `isNotFound` 로 `loadFailure` 를 'not-found'/'error' 로 가르고, `FormPageShell.tsx:115-142` 가 404 는 '목록으로'만·그 외는 '다시 시도'+'목록으로' 를 준다 | 없는 id 로 `/:id/edit` → '연혁을(/를) 찾을 수 없습니다…' + '목록으로'만. `?fail=history:detail` → '다시 시도' 포함 | pass |
| EXC-14 | P1 | 이 화면에 optimistic write 가 없다(전부 비관적) — un-rolled-back optimistic 도 0건 | 인라인 토글·재정렬 표면 없음 | pass(N/A 성) |
| EXC-18 | P1 | `useCrudList.tsx:41` `toggleAll(ids, checked)` 가 넘겨받은 ids(= 보이는 전 행)를 토글한다. 페이지 개념이 없어 scope 모호성은 없으나 **Shift-range 선택·대량 confirm 강화·progress·cancel 이 없다** | 전 행 선택 후 일괄 삭제 → count 만 표시, progress/cancel 없음 | gap |
| EXC-20 | P1 | `useCrudForm.ts:195` `referenceOf(cause)` + `FormFeedback.tsx:38-47` 이 '오류 코드 TDS-…' 를 `userSelect: all` 로 보인다. raw body/stack 미노출 | `?status=history:save:500` → 친근한 문구 + 복사 가능한 reference | pass |
| COMP-12 | P2 | 내용 textarea 는 카운터 보유(`TextareaField.tsx:52` 'N/300'). **연도 입력은 없음**(number 라 무관) | 내용 입력 시 실시간 카운트 | pass |
| COMP-06 | P2 | `CrudTable.tsx:144` `Array.from({ length: 5 })` — 하드코딩 5행. PAGE_SIZE 가 없어 대응물도 없다 | skeleton row 수 = 5 고정 | gap |
| COMP-09 | P2 | 내용 셀(`HistoryListPage.tsx:39`)에 truncation 없음 — 300자가 그대로 렌더돼 컬럼을 민다 | 300자 내용 → 셀이 세로로 늘어남 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 |
|---|---|---|
| 목록 조회 p95 | **400ms**(서버 처리, BE-017 §2 상한 5초 내) | 측정 불가 — 백엔드 없음 |
| 첫 렌더(스켈레톤 등장) | 100ms 이내 | 라우트 코드가 정적 import(`App.tsx:56-57`)라 번들에 포함 — 네트워크 왕복 없음 |
| 목록 → 폼 이동 | 재조회 없음 | 폼은 `fetchOne` 1회. `staleTime: 30s` 라 목록 복귀 시 재조회 없음 |
| 재조회 횟수 | 화면당 1회 + 쓰기 성공당 1회 | `refetchOnWindowFocus: false` · `retry: false`(`queryClient.ts:59,67`)로 확정. 등록·수정·삭제 성공 시 list 무효화 1회 |
| 목록 DOM 노드 | **행 200개 이하** | **예산 미준수 위험** — 상한이 없다(IA-04 gap). 연혁 1,000건이면 1,000행 |
| 메모리 | 픽스처 배열 1벌(`crud.ts:40` 클로저) | 화면 언마운트 후에도 모듈 스코프에 남는다 — 픽스처 한정 |
| 번들 | 이 화면 전용 코드 ≈ 6KB(4파일) | 공용 CRUD 키트를 공유해 화면당 증분이 작다 |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 성능 예산이 아니다.** 픽스처 응답에 인위적 지연을 넣어 **로딩 상태를 화면에서 볼 수 있게** 하는 개발용 상수다. 백엔드가 붙으면 사라진다 — 이 값을 SLO 로 읽지 마라.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 재시도 | 충족 (STATE-02) |
| 렌더 예외 | 셸 유지 + 복구 UI | 충족 (EXC-01) |
| 세션 만료 | 재인증 + 원경로 복원 | 충족 (EXC-02). **단 dirty 폼 draft 는 유실**(EXC-19 미구현) |
| 다른 관리자가 먼저 삭제 | 유령 저장 금지 + 충돌 안내 | 충족 (EXC-04) |
| 다른 관리자와 동시 수정 | 덮어쓰기 금지 | **미충족** — `version`/`ETag` 부재로 last-write-wins (BE-017 §7.4) |
| 일괄 삭제 부분 실패 | 실패분만 재시도 | **미충족** — 성공분까지 재요청 (EXC-10) |
| 네트워크 단절 | 배너 + 쓰기 게이트 | **미충족** (EXC-11) |
| 응답 없음(무한 대기) | ceiling abort + 재시도 | **미충족** (EXC-05) |
| 서버 5xx | 친근한 문구 + reference | 충족 (EXC-20) |

### 4.3 데이터 보존 · 감사

| 축 | 현재 |
|---|---|
| 삭제 | **하드 삭제 · undo 없음**(`crud.ts:86`). 확인 다이얼로그가 유일한 방어(FEEDBACK-05 P2 는 confirm 만으로 충족) |
| 미저장 입력 | 3경로 이탈 가드로 보호(FEEDBACK-04). **단 세션 만료 redirect 는 programmatic navigate 라 가드가 발화하지 않아 입력이 유실된다**(EXC-19) |
| 감사 로그 | 누가 언제 연혁을 바꿨는지 기록이 없다 — `HistoryItem` 에 `updatedAt`·`updatedBy` 부재. **BE-017 §7.4 의 `version` 도입 시 함께 정한다** |
| 연혁의 성격 | 회사 공식 연혁은 **고객 대상 공개 기록**이다. 하드 삭제 + 감사 부재 + undo 부재의 조합은 오조작 복구 수단이 백업뿐임을 뜻한다 — 백엔드 명세 판단 필요 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **A11Y-11** | **P0** | **직전 gap 사유(required 미노출)는 F3a 가 닫았다** — `FormField.withAriaRequired`(`FormField.tsx:50-56`, 주입 지점 `:107`)가 연도 `<input>`·월 `SelectField` 에 `aria-required` 를 런타임 주입하고, `TextareaField.tsx:64-65` 가 내용 `<textarea>` 에 직접 낸다. `aria-invalid`↔`describedby` 짝도 성립. **남은 것은 이번 갱신에서 새로 확인한 hint 미연결** — 연도 FormField 가 `hint={'2018 ~ 2100'}`(`HistoryFormPage.tsx:90`)를 갖고도 valid 일 때 `aria-describedby` 가 `undefined` 라(`:102`) AT 에 닿지 않는다. `required` 와 달리 이 절에는 자동 주입이 없다(배선이 호출부 책임 — `FormField.tsx:10-11`). **NFR-015 `profile-biznum` · NFR-018 4필드와 같은 결함** — 함께 고칠 것 | 이 화면 + 손수 배선 폼 전반(NFR-015 · NFR-018) | UI 기획 쪽 변경 요청 |
| 2 | **MOTION-01** | **P0** | **사유 전면 교체(PR #26).** '리포에 Motion 라이브러리 자체가 없어 enter/exit 가 없다' 는 **낡았다** — backdrop fade + dialog scale 이 CSS-only 로 구현됐고(`Modal.css:20-21,30-38,58-59`, keyframes `:126-168`), `onAnimationEnd`(`Modal.tsx:216-218`)가 AnimatePresence 없이 'exit 완료 후 unmount' 를 달성한다. **남은 것은 경로 한 종류** — `ConfirmDialog` 의 **footer 버튼(취소 `ConfirmDialog.tsx:145` · 확인 `:153`)이 `Modal` 을 거치지 않고 호출부 콜백 직행**이라 즉시 언마운트된다(`Modal.tsx:27-31` 이 이 한계를 명시). 이 화면의 다이얼로그 4종이 전부 ConfirmDialog 라 **주 닫힘 경로가 정확히 미커버 구간**이다. `Modal.tsx:30-31` 이 제안하는 설계(`requestClose` 를 context 로 내려 ConfirmDialog 가 흡수)가 최소 수정이다 | DS(`Modal`·`ConfirmDialog`) — 화면 수정으로 닫히지 않는다 | DS 소유자 |
| 3 | ~~**MOTION-02**~~ | ~~P0~~ | **해소됨(PR #26) — 이관 취소.** Toast exit 가 CSS-only 로 완전 구현됐다 — `Toast.css:32-37`(`tds-toast-out … forwards`) · keyframes `:121-131` · reduced-motion 게이트 `:136-141`. `ToastProvider.tsx:99-100` 의 `filter` 는 여전히 최종 제거지만, `Toast.tsx:186-187` 이 `onAnimationEnd` 로 **그 호출을 퇴장 애니메이션 뒤로 미룬다**. `component.overlay` recipe 소비로 exit = fast(150ms)/accelerate — 요구 문구를 정확히 충족 | — | — |
| 4 | **IA-02** | **P0** | 하위 라우트 제목이 가지 라벨 '기업 관리' 로 폴백(`nav-config.ts:260`)하고 본문 h1 과 **둘이 공존**한다. 목록은 본문 h1 이 없어 원천이 화면마다 다르다 | 앱 전역(`AppHeader`·`findNavLabel`) | 프론트 구현 / UI 기획 |
| 5 | **IA-04** | **P0** | Pagination 부재 — `CrudListShell` 이 전 행을 렌더한다. 연혁은 단조 증가 데이터 | 공용(`CrudListShell`) → 형제 화면 동일 | UI 기획 / 프론트 리팩터 |
| 6 | **EXC-03** | **P0** | write-action 게이팅 미배선 — 등록·수정·삭제 버튼이 권한 무관하게 렌더. **⚠ 범위 정정(F3b 이후)**: `useRouteWritePermissions` 소비자는 이제 **7곳**이다(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`) — **`pages/company/**` 만 그 목록에 없다**(`grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**). '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`) | **기업 관리 섹션 전체**(앱 전역 아님) | UI 기획 쪽 변경 요청 |
| 7 | ERP-08 | P1 | **`formatNumber(year)` → '2,018년'**(`HistoryListPage.tsx:25,37`). 접근 이름·확인 문구·토스트로 전파 | **이 화면 고유** | UI 기획 쪽 변경 요청 (프론트 리팩터) |
| 8 | EXC-10 | P1 | 일괄 삭제 부분 실패 시 무효화 누락(`crud.ts:239`) + 재시도가 성공분을 재삭제해 실패 건수 증가 | 공용(`crud.ts`·`bulk.ts`) | UI 기획 / 프론트 리팩터 / 백엔드 명세 |
| 9 | STATE-05 | P1 | 빈 상태에 생성 CTA 없음 — `empty` prop 미전달 | 이 화면 + 공용 껍데기 | UI 기획 |
| 10 | A11Y-03 | P1 | ConfirmDialog 초기 포커스가 Cancel 이 아니라 닫기(×) | DS(`ConfirmDialog`) | DS 소유자 |
| 11 | A11Y-08 | P1 | 행 클릭 이동의 키보드 등가 링크 부재 | 공용(`CrudTable`) | UI 기획 |
| 12 | A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스 없음(error 포커스는 성립) | 공용(`useCrudForm`) | 프론트 리팩터 |
| 13 | IA-03 | P1 | breadcrumb 부재 | 앱 전역 | 프론트 구현 / UI 기획 |
| 14 | IA-14 · ERP-15 | P1 | 반응형 미선언 · 대형 리스트 계약 부재 | 앱 전역 | UI 기획 / 프론트 구현 |
| 15 | ~~ERP-13~~ · ERP-06 | P1 | **ERP-13 해소됨(통합) — 이관 취소.** **해소됨(통합) — 이관 취소.** 조사 헬퍼가 `shared/format.ts:269+` 로 승격돼 `requiredText`(`shared/crud/validation.ts:17,21,24`) · `useCrudForm.ts:222` · `useCrudList.tsx:108,158` 이 전부 그것을 소비한다. `pages/company/` 의 사용자 대상 조사 리터럴 **0건**. **남은 것은 ERP-06 하나**: `SelectField` 인 월에 '입력하세요' 문구가 붙는다(`requiredText` 가 동사를 '입력' 으로 고정 — `shared/crud/validation.ts:17`) | 이 화면 + `requiredText` 동사 축 | UI 기획 |
| 16 | EXC-05 · EXC-11 | P1 | client timeout · offline 감지 부재 | 앱 전역 | 프론트 구현 / UI 기획 |
| 17 | EXC-06 | P1 | 403·429 전용 surface 없음 — 일반 실패 배너로 수렴 | 공용 | UI 기획 / 백엔드 명세 |
| 18 | EXC-18 | P1 | Shift-range · 대량 confirm · progress · cancel 부재 | 공용 | UI 기획 |
| 19 | MOTION-04 | P1 | 행 FLIP 부재 — Motion 라이브러리가 여전히 없고 행 재배치는 CSS keyframes 로 대체하기 어렵다. **MOTION-08(easing recipe)은 해소됨 — 이관 취소**(`component.overlay` 실재 · Modal/Toast 가 소비 — `tokens/tokens.json:1286-1308`) | DS · 앱 전역 | DS 소유자 |
| 20 | COMP-06 · COMP-09 | P2 | skeleton `length: 5` 하드코딩 · 내용 셀 truncation 없음 | 공용(`CrudTable`) | 프론트 리팩터 |
| 21 | — | — | **동시 편집 last-write-wins** — `version`/`ETag` 부재(EXC-04 acceptanceCheck 는 통과하나 잔여 위험) | 계약 | 백엔드 명세 (BE-017 §7.4) |
| 22 | EXC-19 | P1 | 세션 만료 redirect 시 dirty 폼 draft 유실 | 앱 전역 | 프론트 구현 / UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행.** 이 문서의 판정 근거는 **코드 대조**다. 아래는 판정을 확인·반증하기 위해 **무엇을 구동해야 하는가**의 목록이며, 이 화면의 e2e 스펙은 현재 존재하지 않는다(`e2e/` 에 history 스펙 0건).

### 6.1 이 화면에서 실제로 동작하는 스위치

`shared/crud/dev.ts` 가 소유한다. 이 화면의 어댑터 scope 는 **`'history'`**(`data-source.ts:21` `scope: 'history'`)이고, op 는 `createCrudAdapter` 가 고정한 **4종**뿐이다.

| op | 발생 지점 (crud.ts) | 이 화면의 표면 |
|---|---|---|
| `list` | `fetchAll` — `45` | 목록 조회 (FS-017-EL-008) |
| `detail` | `fetchOne` — `50` | 수정 진입 시 상세 조회 (FS-017-EL-020) |
| `save` | `create` — `61` · `update` — `66` | 등록·수정 저장 (FS-017-EL-013 / EL-022) |
| `delete` | `remove` — `79` | 단건·일괄 삭제 (FS-017-EL-009.1 / EL-010.1) |

**`?fail=` (generic Error)** — `dev.ts:81-93`
```
?fail=list              # op 지정 (전 scope)
?fail=history:list      # scope:op 지정 — 이 화면만
?fail=save,delete       # 콤마 다중
?fail=all               # 전 op
```

**`?status=` (특정 HTTP status)** — `dev.ts:56-71`. `?fail=` 은 언제나 같은 generic Error 를 던져 401/403/409/422 처럼 **UX 가 완전히 다른 실패**를 재현할 수 없어 추가된 스위치다.
```
?status=save:409        # 충돌 다이얼로그 (EXC-04)
?status=history:save:409
?status=list:401        # 재인증 경로 (EXC-02)
?status=save:403        # 권한 (EXC-03 서버 측)
?status=detail:404      # not-found 갈래 (EXC-12)
?status=save:500        # 오류 코드 표시 (EXC-20)
?status=all:500
```
재현 가능 status(`dev.ts:27-37`): `400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500`.

### 6.2 이 화면에 **없는** 스위치

- **`?delay=` 는 이 화면에서 동작하지 않는다.** `shared/crud/dev.ts` 에 없다 — `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재한다. 이 화면의 지연은 `LATENCY_MS = 400` 고정(`dev.ts:12`)이며 URL 로 바꿀 수 없다. STATE-01 의 acceptanceCheck 가 `?delay=3000` 을 요구하지만 **이 화면에서는 그 절차를 그대로 쓸 수 없다** — 대신 재조회(등록 후 목록 복귀) 시 표가 스켈레톤으로 덮이는지로 판정한다.

### 6.3 코드 대조 도구

| 판정 | 명령 |
|---|---|
| TOKEN-01 | `rg '#[0-9a-fA-F]{3,6}\|[1-9][0-9]*px\|(outline\|border): (thin\|medium\|thick)' apps/admin/src/pages/company/history` |
| A11Y-11 | `rg -A2 'aria-invalid' apps/admin/src/pages/company/history`(짝 검사) · **잔여 gap 의 근거**: `rg -n 'hint=' apps/admin/src/pages/company/history/HistoryFormPage.tsx` → `:90`(연도 hint 존재) vs `rg -n 'aria-describedby' 같은 파일` → `:102`(오류일 때만 배선) — **hint id 를 가리키는 경로가 없다**. **⚠ `rg 'aria-required'` 로 required 절을 판정하지 마라** — `FormField` 가 **런타임 `cloneElement`** 로 주입하므로 소스에 나타나지 않는다(`FormField.tsx:50-56,107`) |
| MOTION-01/02 | `rg 'AnimatePresence\|framer-motion\|from .motion' --glob '!node_modules'` → **0건 — 단 이것은 '모션 없음' 의 근거가 아니다**(라이브러리 미도입의 근거일 뿐). 모션은 CSS-only 로 실재한다: `rg '@keyframes' packages/ui/src/organisms/Modal/Modal.css` → **4건** · `packages/ui/src/molecules/Toast/Toast.css` → **2건**. MOTION-01 의 잔여 gap 은 `rg 'onClick=\{onCancel\}\|onClick=\{onConfirm\}' packages/ui/src/organisms/ConfirmDialog` → `:145`·`:153`(Modal 을 우회하는 footer 경로) |
| EXC-03 | `rg 'useRouteWritePermissions\|useRouteCan' apps/admin/src/pages/company` → **0건**. ⚠ 같은 rg 를 `apps/admin/src/pages` 전체로 넓히면 **7곳**(products 3 · settings 4) — '정의 파일 1건뿐' 이라는 직전 판정은 폐기됐다 |
| IA-04 | `rg 'Pagination' apps/admin/src/shared/crud` → 0건 |
| IA-13 | `rg 'useListState\|useSearchParams' apps/admin/src/pages/company/history` → 0건 |
| 단위 테스트 | `pnpm vitest run apps/admin/src/pages/company/history` — `history.test.ts` 는 `sortHistory`(순수) + `historySchema`(검증)만 덮는다. **렌더·상호작용 테스트 0건** |

## 7. 자기 점검

- [x] P0 30건을 지정된 순서로 **전수** 판정했다 — 빈칸 0건
- [x] §2.1 산수 검산: pass 20 + 종속 0 + n-a 5 + gap 5 = **30** ✅
- [x] 모든 `N/A` 에 '표면이 없다'는 **구체적 사유**를 적었다 (STATE-04·COMP-10·FEEDBACK-06·A11Y-12·IA-13)
- [x] 모든 `pass` 에 파일:라인 코드 근거를 적었다
- [x] 모든 `gap` 에 재현 가능한 측정 기준(무엇을 하면 반증되는가)을 적었다
- [x] quality-bar 요구 문구를 복제하지 않고 **ID 로만 참조**했다
- [x] `LATENCY_MS = 400` 이 예산이 아님을 §4.1 에 명시했다
- [x] `?fail=` scope(`history`)와 op 4종을 **어댑터 코드에서 확인**해 §6 에 적었다. `?delay=` 가 이 화면에 없음을 명시했다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1.1·§6 에 명시했다
- [x] FS-017 §7 ↔ BE-017 §7.9 ↔ 이 문서 §5 의 상호 참조를 일치시켰다
- [x] 이 화면이 공용 모듈을 **실제로 소비하는지** 확인했다 — `useListState`·`useDebouncedSearch`·`useModalDirtyGuard`·`useCrudRowUpdate` 는 **쓰지 않는다**(각각 IA-13·COMP-10·FEEDBACK-06·EXC-14 의 N/A 사유)
