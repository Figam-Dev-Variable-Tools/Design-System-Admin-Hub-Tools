---
id: NFR-030
title: "자료실 비기능 명세"
functionalSpec: FS-030
backendSpec: BE-030
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-030. 자료실 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | `/support/downloads` · `/new` · `/:id/edit` — 자료실 (`apps/admin/src/pages/support/downloads/**`) |
| 상위 기준 정본 | `specs/quality-bar.md` (9차원 100요구 · P0 30건). **이 문서는 그 요구 문구를 복제하지 않고 ID 로만 참조한다** |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. 각 요구가 이 화면에서 어떻게 충족되는가(코드 근거) / 무엇을 재현하면 판정되는가(측정 기준)만 기술한다 |
| 함께 읽는 문서 | FS-030(요소·예외) · BE-030(엔드포인트·**업로드 보안 판정**) |
| 갱신 규칙 | 이 화면의 코드가 바뀌면 §2 의 해당 행과 §5 를 함께 고친다. quality-bar 요구가 바뀌면 §2 전수를 재판정한다 |
| 판정 기준일 | **2026-07-17 · HEAD = `a5c2639`** (PR #22·#24·#26·#28·#30·#32·#34 머지 후). 직전 판정은 `4b805ad` 기준이었다. **이번 기준 갱신으로 뒤집힌 판정**(둘 다 **근거**가 뒤집혔고 **판정 부호는 그대로**라 §2.1 건수는 불변): ① **TOKEN-01 — 이전의 pass 는 틀린 판정이었다.** `DownloadPreview` 가 참조하던 `--tds-typography-title-sm-*` 는 **실재하지 않는 토큰이었다**(title 티어는 `md` 부터 — `packages/ui/generated/tokens/tokens.css:186-197`). PR #32 가 `title-md-*` 로 고쳤고(`DownloadPreview.tsx:34,35,36`) **신설된 토큰 실재 가드**(`token-guard.test.ts:208-268`, 11 tests pass · 위반 0)가 회귀를 막는다 — **지금은 진짜 pass 다** ② **MOTION-03 — DS gap 이 해소됐다.** `ToggleSwitch.css:79-84` 에 reduced-motion 게이트가 **실재하게 됐다**(§5 #22 를 해소로 갱신). 그 밖에 MOTION-01/02 는 근거 텍스트만 갱신했다 |
| 검증 방법 | **E2E 미실행. 모든 판정 근거는 `a5c2639` 코드 대조다.** 측정 기준은 판정을 *확인할 수 있는 절차*이며 이 문서가 그것을 실행했다는 뜻이 아니다 |

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
| STATE-01 | STATE | 직접 | **충족.** 공용 `useCrudList` 를 쓰므로(`DownloadListPage.tsx:72-77`) 로딩 파생이 정확하다 — `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined`(`shared/crud/useCrudList.tsx:71-72`). `CrudListShell` 이 `loading={firstLoading}` 만 표에 넘기고(`CrudListShell.tsx:136`) 요약은 재조회 중 건수를 유지한 채 ' · 새로고침 중…' 만 덧붙인다(`:118-122`). 네 상태(`first-load`/`refetching-with-data`/`empty`/`error`)가 배타적으로 갈린다 — error 는 표 전체를 대체하고(`:113`·`:156`), empty 는 성공·0행에서만(`CrudTable.tsx:153`). 폼도 `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:130`) | 노출 토글 1회 → 재조회 중 **이전 행이 유지**되고 요약에 ' · 새로고침 중…' 만 붙는다(스켈레톤 없음). `?fail=support-downloads:list` → error Alert만(empty 텍스트 없음). 검색으로 0행 → Empty 만 | pass |
| STATE-02 | STATE | 직접 | **충족.** 목록: `CrudListShell.tsx:156-165` 가 `error !== null` 일 때 인라인 `Alert tone="danger"` + '다시 시도'(`refetch`)를 렌더하고 empty 로 폴백하지 않는다. 폼: `DownloadFormPage.tsx:164-186` 이 `loadFailure` 를 danger Alert 으로. 조회 실패에 toast 를 쓰는 경로 0건 | `?fail=support-downloads:list` → 인라인 danger Alert + '다시 시도'. `?fail=support-downloads:detail` → 폼 자리에 Alert. 두 경우 모두 error toast 0건 | pass |
| STATE-04 | STATE | 직접 | **미충족(선택 해제 조항) — F3b 이후 사유가 더 분명해졌다.** clamp 조항은 페이지네이션이 없어 해당 없으나 **'page/filter/keyword 변경 시 이제 숨겨진 행의 선택은 해제한다' 를 위반**한다. 이 화면은 이제 `useListState`(`:87`)와 `useCrudList`(`:99-104`)를 **둘 다** 쓴다. `useListState` 는 자기 안에 선택 상태를 갖고 view 서명(page|keyword|sort|filters)이 바뀌면 비우지만(`useListState.ts:205-213`), **`CrudListShell` 에 넘기는 선택은 그것이 아니라 `controller.selectedIds`**(`useRowSelection` 소유 — `:212-225`)이고 그것은 필터·검색과 아무 연결이 없다 — `list.selectedIds`·`list.clearSelection` 은 이 화면에서 **소비되지 않는다**. 즉 **선택 상태가 두 벌인데 URL 상태와 연결된 쪽이 쓰이지 않는다.** 공용 훅이 이 책임을 **호출부 계약으로 명시**했는데도(`shared/ui/useRowSelection.ts:7-8` '페이지/필터가 바뀌면 호출부가 clear() 로 비운다 — 안 보이는 행이 선택된 채 남지 않게') 부르지 않는다. 게다가 일괄 삭제가 `[...selectedIds]` **전량**을 대상으로 하고 `visibleItems` 와 교집합을 취하지 않는다(`useCrudList.tsx:127`) — **안 보이는 행이 그대로 삭제된다** | 자료 4건 전체선택 → 카테고리 '브로슈어' 로 필터(1건만 보임) → SelectionBar 가 여전히 '4건 선택됨' → '선택 4건 삭제' → **화면에 없던 3건까지 삭제된다**. 기대: 필터 변경 시 `selectedIds` 리셋 — `controller.clear()` 를 `list.filters`/`list.keyword` 에 연결하거나 `list.selectedIds` 로 일원화하면 된다 | **gap** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전량이 `var(--tds-*)` 만 참조한다 — `DownloadListPage.tsx:40-58` · `DownloadFormPage.tsx:39-90` · `FileUploadField.tsx:31-117` · `DownloadPreview.tsx:9-53`. 하드코딩 hex 0건 · px 리터럴 0건 · border/outline 키워드 0건. 폭 해킹은 `calc(var(--tds-space-6) * 3.5)` 형태로 토큰 경유(TOKEN-08 P1 대상이지 TOKEN-01 위반은 아니다). **⚠ 근거가 뒤집혔다 — 이전 기준(`4b805ad`)의 pass 는 틀린 판정이었다.** `DownloadPreview` 의 `titleStyle` 이 참조하던 `--tds-typography-title-sm-*` 3개는 **정의된 적이 없는 토큰**이다: title 티어는 `md`·`lg`·`xl` 뿐이고(`packages/ui/generated/tokens/tokens.css:186-197`) **`title.sm` 은 `tokens/tokens.json` 에도 생성물에도 없다.** 즉 이 화면은 값을 하드코딩하지 않은 대신 **아무것도 가리키지 않는 var() 를 참조하고 있었다** — 위 hex/px grep 이 그것을 잡지 못했다(**'토큰만 참조한다' 와 '참조한 토큰이 실재한다' 는 다른 명제다**). PR #32(`fbcc7c2`)가 `title-md-*` 로 고쳤다(`DownloadPreview.tsx:34,35,36`). **지금은 진짜 pass 다** | ① `pages/support/downloads/**` 에 `#[0-9a-f]{3,6}` · `[1-9]px` · `(outline\|border): (thin\|medium\|thick)` grep = 0 ② **참조 토큰 실재 검사(신설)** — `npx vitest run src/shared/token-guard.test.ts`(`apps/admin`)의 describe '앱 토큰 가드 — 실재하지 않는 토큰을 참조하지 않는다'(`token-guard.test.ts:208-268`)가 `packages/ui/generated/tokens/tokens.css`(`:33`)를 정본으로 파싱해(`:211-213`) `apps/admin/src` 전체(`:29`)의 `.css`(`:51`)·`.ts`/`.tsx`(`:57`) 참조를 대조한다. 공허성 방지 단언 포함(`:227-233`). **실행: 11 tests pass · 위반 0건.** ⚠ **범위 주의**(`token-guard.test.ts:12-15`): **값 가드(hex/px)는 여전히 `.css` 만** 스캔한다 — 이번에 `.ts`/`.tsx` 로 넓힌 것은 **참조 가드뿐**이다. 이 화면의 스타일은 전부 `.tsx` style object 이므로 ①의 실질 집행자는 ESLint 다(`apps/admin/eslint.config.js:26-46`,`:136-139`) | pass |
| TOKEN-02 | TOKEN | 상속 | focus ring 표면: `Button`·`SearchField`·`SelectField`·`ToggleSwitch`·`RowActions`(DS) · `tds-ui-focusable` 를 얹은 자체 요소 3개('목록으로' `:192`, 드롭존 `:228`, 파일 교체/제거 `:207`·`:216`) · `tds-ui-input`(`:216`). 전부 DS/app-shell 이 ring 을 소유한다 | DS/`app-shell.css` 판정에 따른다 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면은 animation/transition 을 **선언하지 않는다**(grep 0). easing 토큰 소비 표면은 소비 컴포넌트에 있다 — 스켈레톤 pulse · Toast · Modal(ConfirmDialog) · ToggleSwitch | tokens codegen · Toast.css · ui.css 판정에 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | elevation 표면: `Card` ×3(입력·미리보기·목록) · `Alert` · `ConfirmDialog`/`Modal` · Toast. **자체 raw `box-shadow` 0건** — `dropZoneStyle`(`:40-69`)·`chipStyle`(`:71-85`)·`DownloadPreview.cardStyle` 은 border + surface 토큰만 쓴다 | DS Card/Modal/Toast 판정에 따른다 | 종속 |
| TOKEN-05 | TOKEN | 상속 | display tier 표면: 폼의 `<h1 style={pageTitleStyle}>`(`DownloadFormPage.tsx:201`) · AppHeader 의 `<h1>`(`AppHeader.tsx:101`) · `CardTitle` ×2 · `DownloadPreview` 의 `titleStyle`(**`title-md` 토큰 경유**, `:31-38` — `:34-36`). 전부 semantic 토큰을 소비하며 primitive 를 손으로 재현하지 않는다. **⚠ 기준 갱신으로 이 인용이 바뀌었다**: 이전 기준에선 `title-sm` 이었고 **그 티어는 실재하지 않았다**(TOKEN-01 참조) | tokens/AppHeader 판정에 따른다 | 종속 |
| COMP-10 | COMP | 직접 | **충족(F3b).** `DownloadListPage.tsx:167-174` 가 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 **공용 IME 안전 배선을 스프레드한다**. `list` 는 `useListState`(`:87`)이고 그 훅이 내부에서 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다 — 세 축이 전부 성립한다: ① **조합 중 커밋 금지**(`useDebouncedSearch.ts:87` `if (composing) return`) + **조합 중 Enter 차단**(`:121-124` — `event.nativeEvent.isComposing || composingRef.current` 면 `stopPropagation`. **두 신호를 함께 보는 이유는 `:117-120` 주석**: `isComposing` 은 합성 이벤트에서 누락될 수 있다). ② **디바운스 250ms**(`:23` `DEBOUNCE_MS` · `:93-95`). ③ **stale 응답 무효** — 필터가 클라이언트 `useMemo`(`:108-111`)라 query 발행이 0건이고, 커밋된 값은 URL `?q=` 로만 나간다(`useListState.ts:149`). 커밋 후 `searchDownloads(filterDownloads(...), keyword)` 가 한 번만 돈다 | '홍길동' 을 IME 로 입력 → **조합 중 'ㅎ'·'호'·'홍ㄱ' 가 필터에 반영되지 않아 표가 깜빡이지 않고**, 조합이 끝난 뒤 250ms 잠잠하면 그때 한 번 재필터된다. 조합 중 Enter → 아무 일도 없다. `useDebouncedSearch.test.tsx` 가 이 계약을 고정한다. **⚠ STATE-04 는 별개로 남아 있다** — 커밋된 keyword 가 표를 줄여도 `controller.selectedIds` 는 비워지지 않는다 | pass |
| FEEDBACK-02 | FEEDBACK | 상속 | 파괴적 액션 표면이 실재한다 — 단건/일괄 삭제가 `useCrudList.dialogs`(`useCrudList.tsx:151-178`)의 `ConfirmDialog intent="delete"` 로 게이트된다. busy 중 confirm 잠금(`busy={deleting}`), 실패 시 다이얼로그 유지 + error 배너(`error={deleteError}` `:160`), 취소 시 in-flight abort + pending 리셋(`closeDelete` `:86-92`). 이 화면은 `requestDelete`/`requestBulkDelete` 를 배선하고 `dialogs` 를 렌더할 뿐이다(`CrudListShell.tsx:167`) | ConfirmDialog/useCrudList 판정에 따른다 | 종속 |
| FEEDBACK-04 | FEEDBACK | 직접 | **미충족.** `useUnsavedChangesDialog(isDirty && !saving)` 가 배선돼 있고(`DownloadFormPage.tsx:156`·`:323`) 세 경로 중 **브라우저 이탈·앵커 클릭·뒤로가기는 가드된다**. 그러나 **폼 자신의 이탈 버튼 2개가 가드를 완전히 우회한다**: '목록으로'(`:190-198`)와 '취소'(`:306-314`)가 `<button>` + `navigate(LIST_PATH)` 다. 가드의 링크 가로채기는 `routableAnchorFrom` 이 **`a[href]` 를 찾는데**(`useUnsavedChangesDialog.tsx:63-70`) `<button>` 은 앵커가 아니라 `null` 을 반환하고, `navigate()` 는 programmatic push 라 popstate 도 아니다. **가장 많이 눌리는 두 이탈 경로에서 입력이 조용히 사라진다** | 등록 폼에 제목 입력 + 파일 첨부 → '취소' 클릭 → **확인 없이 즉시 목록으로 이동, 입력 소실**. 같은 dirty 상태에서 사이드바 링크 클릭 → 정상적으로 discard 다이얼로그가 뜬다(대조군). 기대: 세 경로 + 화면 내 이탈 버튼 모두 가드 | **gap** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면 없음** — 이 화면에 **편집 가능한 폼을 담은 modal 이 없다**. 등록·수정은 전용 라우트 폼이고(IA-06 의 'rich 엔티티 → form route' 분기와 일치 — 파일 업로드·미리보기를 갖는 무거운 엔티티다), 유일한 modal 은 삭제 확인 `ConfirmDialog` 로 **입력 필드가 없어 dirty 상태가 성립하지 않는다**. `useModalDirtyGuard` import 0건 | — | n-a |
| A11Y-01 | A11Y | 상속 | toast live region 표면이 실재한다 — 저장 성공(`useCrudForm.ts:215`) · 삭제 성공(`useCrudList.tsx:107`·`:145`) · 노출 토글 성공/실패(`useCrudRowUpdate`)가 전부 토스트다. 지속 region 은 `ToastProvider` 가 소유한다. **이 화면은 목록 상태용 자체 live region 도 갖는다**(`CrudListShell.tsx:107-109` — A11Y-16 pass 근거)이나 그것은 별개 표면이다 | ToastProvider 판정에 따른다 | 종속 |
| A11Y-02 | A11Y | 상속 | Modal `aria-describedby` 표면이 실재한다 — 단건/일괄 삭제 `ConfirmDialog` 가 message(`'<제목>' 을(를) 삭제합니다…`)와 error 배너를 갖는다(`useCrudList.tsx:154-176`). 이 화면은 그 계약의 소비자 | Modal/ConfirmDialog 판정에 따른다 | 종속 |
| A11Y-11 | A11Y | 직접 | **부분 미충족 — 두 갈래가 남았다.** ① **describedby 절**: 같은 폼 안에서 배선 규칙이 갈린다 — **제목**(`:212-227`)은 `aria-invalid` + `aria-describedby={errorIdOf('download-title')}` 로 **정확히 짝지어져 있고**, **`FileUploadField`**(`:288`→`FileUploadField.tsx:183`)도 `describedBy = invalid ? errorIdOf(id) : hasFile ? undefined : hintIdOf(id)` 로 오류/힌트를 정확히 가른다. **그러나 버전 입력**(`:249-258`)은 **`aria-invalid` 도 `aria-describedby` 도 세우지 않는다** — `FormField` 는 `hint`/`error` 를 받아 `<p id={hintIdOf('download-version')}>` / `<p id={errorIdOf('download-version')} role="alert">` 를 렌더하지만(`FormField.tsx:109-118`) **id 만 노출하고 배선은 호출부 책임이다**. 20자 초과 시 오류 `<p>` 가 뜨는데 **입력은 그것을 참조하지 않고 invalid 로 표시되지도 않는다**. hint 도 영영 연결되지 않는다. *(짝 없는 `aria-invalid` 는 0건이라 grep 기반 acceptanceCheck 는 통과한다 — 이 결함은 반대 방향이다: 오류가 있는데 `aria-invalid` 가 없다)* ② **required 절 — F3a 가 2/3 을 닫았다**: `FormField.tsx:50-56` `withAriaRequired` 가 `required` 를 **런타임 `cloneElement`** 로 자식 컨트롤의 `aria-required` 에 주입한다(대상 판별 `:36-41`). 이 폼의 필수 3개 중 **2개가 주입된다** — 제목(`:213` 자식이 네이티브 `input`) · 카테고리(`:231` 자식이 DS `SelectField` — 그 컴포넌트는 `SelectField.tsx:59-60` 에서 `required`+`aria-required` 를 `<select>` 로 낸다). **남은 1개 — 첨부 파일**: `FileUploadField`(`:274-289`)는 **페이지 전용 컴포넌트**로 `FormField` 를 쓰지 않고 자기 라벨 + `aria-hidden` `*` 마커를 직접 그리며(`FileUploadField.tsx:187-194`), 드롭존 `<button>`(`:226-247`)에도 실제 `<input type="file">`(`:249-258`, `visuallyHidden` + `aria-hidden` + `tabIndex={-1}`)에도 `required`/`aria-required` 가 없다 — **'첨부 파일이 필수'가 AT 에 닿지 않는다** | ① 버전에 21자 입력 후 제출 → 화면에 '버전은 20자를 넘을 수 없습니다.' 가 보이지만 RTL 로 `input.getAttribute('aria-describedby')` = `null`, `aria-invalid` = `null`. 제목에 같은 절차 → 둘 다 정상(대조군). ② **⚠ grep 으로 판정하지 말 것** — 주입이 런타임이라 소스에 리터럴이 없다(앱 전역 `aria-required` grep 1건은 무관한 수동 override). RTL 로 `getByLabelText('제목')`·`('카테고리')` 의 `aria-required` === `'true'` → **2개 통과**. `getByRole('button', { name: /첨부 파일 업로드/ })` 의 `aria-required` → **null = 미충족** | **gap** |
| A11Y-12 | A11Y | N/A | **표면 없음** — 좌측 필터 list item(`filterItemStyle` 버튼)이 없다. 이 화면의 필터는 **툴바의 `<select>` 2개**(`:146-175`)이며 네이티브 select 는 선택 상태를 `aria-pressed`/`aria-current` 로 표기하는 toggle role 이 아니다. `aria-current` 사용 0건 | — | n-a |
| MOTION-01 | MOTION | 상속 | Modal enter/exit 표면이 실재한다 — 삭제 `ConfirmDialog` ×2 · `FormConflictDialog` · 미저장 `ConfirmDialog`. 전부 DS Modal 을 상속한다. **⚠ 근거 갱신 — 구현됐다(CSS-only).** PR #26: backdrop fade(`Modal.css:20-21`→keyframes `:126-134`, exit `:30-33`→`:136-144`) + dialog scale 0.96→1(enter `:58-59`→`:146-156`, exit `:35-38`→`:158-168` `forwards`), reduced-motion 게이트 `:173-180`, `component.overlay` recipe `tokens/tokens.json:1286-1308`. **Motion/AnimatePresence 는 여전히 미도입이나** 요구가 명시한 'exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성됐다 — **라이브러리 부재로부터 gap 을 추론하지 않는다.** 라이브러리 도입 여부는 DS 문서의 몫이다. **⚠ 이 화면은 폼 modal 을 갖지 않아**(등록·수정이 전용 라우트) **DS Modal 의 `closingRef` latch 결함**(NFR-027 §2 FEEDBACK-06)**에 노출되지 않는다** — 위 4종은 전부 입력 필드가 없는 확인 다이얼로그이고 `useModalDirtyGuard` 소비가 0건이다 | DS Modal 판정에 따른다 | 종속 |
| MOTION-02 | MOTION | 상속 | toast exit 표면이 실재한다 — 저장·삭제·토글 결과가 전부 토스트다. **⚠ 근거 갱신 — 완전 구현됐다.** `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events:none`) → keyframes `:121-131`(opacity 1→0, `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. **요구가 명시한 'exit duration fast~normal + easing accelerate' 를 정확히 충족한다** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`) | ToastProvider/Toast 판정에 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트 표면: `ToggleSwitch`(목록 행마다 1개 `DownloadListPage.tsx:153` + 폼 1개 `DownloadFormPage.tsx:264`) · Modal · Toast · 스켈레톤. **★ `a5c2639` 기준으로 DS 현황이 뒤집혔다.** 이전 기준의 '`ToggleSwitch.css:56` 이 `transition: transform` 을 선언하고 그 파일에 `prefers-reduced-motion` 블록이 없다' 는 **더 이상 사실이 아니다** — **`packages/ui/src/atoms/ToggleSwitch/ToggleSwitch.css:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 `transition` 을 `none` 으로 끈다**(`:32` background-color · `:56` transform **두 선언 모두 덮는다**). 근거 주석 `:76-78` — 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향을 주는 반면 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 **정보 손실 0** 이고 즉시 최종 위치로 스냅한다. quality-bar MOTION-03 이 지목한 위반은 **해소됐다**. 이 화면은 소비자 | DS ToggleSwitch.css 판정에 따른다. 재현: reduced-motion 활성 후 토글 → **knob 이 스냅하면 충족**(현재 코드 기준 충족) | 종속 |
| IA-01 | IA | 직접 | `App.tsx:246-248` 이 세 라우트를 전부 `RequireAuth > AppShell` 레이아웃 라우트 아래에 둔다(`:326-328`). 두 화면 모두 자체 sidebar/header/outer frame 을 렌더하지 않는다 — 최상위가 `<div style={columnStyle}>`/`<div style={pageStyle}>` 세로 스택뿐 | 세 라우트 진입 → sidebar·AppHeader·단일 padded `<main>` 안에서 렌더. 이 화면이 그린 frame 0개 | pass |
| IA-02 | IA | 직접 | **절반 해소 — 여전히 미충족(사유 전환).** ✔ **해소된 것 — 가지 라벨 폴백**: 통합이 `findCoveringLeaf`(`nav-config.ts:260-278`)를 도입했다 — '자기를 감싸는 **가장 긴 잎**'이 곧 자기다. `covers()` 는 **세그먼트 경계**에서만 매칭하고(`:255-257`), `:297-299` `findNavLabel = findCoveringLeaf(pathname)?.label ?? pathname` 이다. 따라서 `/support/downloads/new` · `/:id/edit` 는 잎 `/support/downloads`(`nav-config.ts:170`)에 덮여 **'자료실'** 을 반환한다 — **요구가 금지한 브랜치 라벨('고객센터')은 더 이상 나오지 않는다.** `nav-config.test.ts:16-40` 이 고정한다. ✘ **남은 것 둘**: ① **`<h1>` 이 2개다** — `AppHeader.tsx:101` 의 `<h1>자료실</h1>` 과 폼의 자체 `<h1>자료 등록</h1>`(`DownloadFormPage.tsx:201`)이 **동시에** 렌더된다 → 요구의 '**단일 title 메커니즘**' 미충족. 목록은 in-content h1 이 없어 title 소스가 화면 타입마다 갈린다. ② **행위가 AppHeader 제목에 없다** — `nav-config.ts:294-296` 주석이 '등록/수정 같은 **행위**는 제목에 넣지 않는다(그 문구는 nav 에 없고, 여기서 지어내면 레이아웃이 카피를 발명한다)'를 의도로 명시한다. 요구의 acceptanceCheck(`/content/notices/new` 의 가시 primary title 이 '공지 등록')를 이 화면에 옮기면 **in-content h1 은 '자료 등록'으로 그것을 만족하지만 AppHeader h1 은 '자료실'** 이고, **어느 쪽이 primary 인지 정의돼 있지 않다** | `/support/downloads/new` 진입 → **AppHeader h1 = '자료실'**(브랜치 폴백 해소), 본문 h1 = '자료 등록'. `document.querySelectorAll('h1').length` = **2** | **gap** |
| IA-04 | IA | 직접 | **부분 충족.** 템플릿 순서는 정확하다 — 툴바(검색·필터 좌측, '자료 등록' primary 가 `spacerStyle`(`:176`)로 **우상단**) → count 요약(`CrudListShell.tsx:118-122`) → SelectionBar(`:125-133`) → table(`:135`). **그러나 Pagination 이 없다** — `CrudListShell` 자체에 페이지네이션이 없고 자료 전량을 렌더한다. 목록이 무한히 자랄 수 있는데(BE-030 §7.8 상한 미정) 'page size 초과 가능 시 Pagination' 조항을 만족할 수단이 없다. 필터·검색까지 클라이언트라(`:81-84`) 전량을 받는 것이 전제다 | 시드를 4건 → 300건으로 늘려 진입 → 300행이 한 번에 렌더되고 Pagination 이 나타나지 않는다. 기대: Pagination 렌더 또는 '전량 렌더 + 상한 N건' 을 명시적 계약으로 선언 | **gap** |
| IA-05 | IA | 직접 | **충족.** `/support/downloads/new` 와 `/:id/edit` 가 **같은 컴포넌트**로 해석된다(`App.tsx:247-248` 둘 다 `<DownloadFormPage />`). `useCrudForm` 이 `useParams` 의 `id` 유무로 `isEdit` 를 파생하고(`useCrudForm.ts:73-74`) 레이아웃은 동일하며 title(`'자료 수정'`/`'자료 등록'` `:201`)·제출 라벨(`'저장'`/`'등록'` `:316`)·prefill(`toValues` → `reset` `useCrudForm.ts:125-128`)만 다르다. create 전용/edit 전용 페이지가 없다 | `/new` 와 `/:id/edit` 의 DOM 구조가 동일하고 h1·버튼 라벨·초기값만 다르다. 별도 create 컴포넌트 grep = 0 | pass |
| IA-13 | IA | 직접 | **충족(F3b).** list query state 의 단일 원천이 **URL 쿼리스트링**이다 — `DownloadListPage.tsx:87` `const list = useListState({ filterDefaults: FILTER_DEFAULTS })` 가 `useSearchParams`(`useListState.ts:87`) 위에 앉고, 카테고리(`:178` `list.setFilter('category', …)`) · 노출상태(`:192` `list.setFilter('visibility', …)`) · 검색어(`:167-173`)가 전부 그것에 쓴다. **기본값과 같은 값은 URL 에서 지운다**(`useListState.ts:113-118` + `FILTER_DEFAULTS` `:81`) — 공유 링크가 짧고 '기본 상태'의 URL 이 하나로 정해진다. **갱신은 `replace`**(`:125`)라 필터 조작이 history 를 쌓지 않는다. **주 운영 루프가 복원된다** — 행 클릭이 곧 수정 진입인데(FS-030-EL-008.10) `navigate(LIST_PATH)` 로 돌아와도 URL 의 쿼리가 그대로라 필터·검색이 살아 있다(`DownloadListPage.tsx:7-9` 주석: `'숨김 자료만' 으로 걸러 한 건을 수정하고 목록으로 돌아오면 그 정리 작업 view 가 그대로다`). **손으로 고친 URL 도 안전하다** — 노출상태는 닫힌 유니온이라 `parseFilter`(`:92-96`)가 '전체'로 되돌리고, 카테고리는 서버가 주는 자유 문자열이라 모르는 값을 '일치 없음'(빈 목록)으로 흘려보낸다(`:88-90` 주석). page·sort 는 표면이 없다(페이지네이션 부재 → IA-04 · 정렬 서버 고정) | 카테고리 '브로슈어' + 검색 'brochure' 설정 → **URL 이 `?category=브로슈어&q=brochure` 가 된다** → 행 클릭해 수정 진입 → '목록으로' → **필터·검색이 그대로다**. F5 도 동일. URL 을 새 탭에 복사하면 같은 view 가 재현된다. `?visibility=거짓말` 로 손대면 '전체 노출상태'로 안전하게 되돌아간다 | pass |
| EXC-01 | EXC | 상속 | route render 예외 경계가 실재한다 — `App.tsx:311` 이 Routes 를 `ErrorBoundary` 로 감싸고 AppShell `<Outlet>` 바깥에도 경계가 있다(`App.tsx:306` 주석). 이 화면은 그 안에서 렌더되는 소비자 | ErrorBoundary 판정에 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 두 표면이 실재한다 — (a) `App.tsx:326` `RequireAuth` 가 AppShell 바깥에서 세션 검사. (b) `shared/query/queryClient.ts:37-43` 이 QueryCache/MutationCache `onError` 에서 `isUnauthorized` → `notifySessionExpired()`. **이 화면의 조회 2종·쓰기 4종이 모두 그 캐시를 통과하므로 전수 커버된다** | RequireAuth/queryClient 판정에 따른다 | 종속 |
| EXC-03 | EXC | 상속 | route-level 권한 표면이 실재한다 — `AppShell.tsx:490-492` 가 `<Outlet>` 을 `RequirePermission` 으로 감싸고 `route-resource.ts:36-46` 이 pathname 에서 리소스를 파생한다. **`/support/downloads/new`·`/:id/edit` 도 커버된다** — `covers()`(`:26-28`)가 세그먼트 경계로 감싸는 가장 구체적인 잎(`/support/downloads`)을 찾아주기 때문이다(이 파일이 존재하는 이유 그 자체 — `:4-12` 주석). **write-action 게이팅은 이 화면에 없다**(등록·삭제·토글이 `can()` 으로 숨지 않는다) — 그러나 FS-030 §4.1 이 '프론트 역할 분기 없음' 을, BE-030 §2 가 서버 책임을 선언하므로 **앱 전역 정책**이지 이 화면의 이탈이 아니다 | RequirePermission/권한 모델 판정에 따른다. 전역 정책이 '프론트 게이팅 도입' 으로 바뀌면 '자료 등록'·행 삭제·일괄 삭제·노출 토글이 대상 | 종속 |
| EXC-04 | EXC | 직접 | **부분 미충족.** **수신 처리(후반부)는 충족** — `useCrudForm.handleWriteError` 가 `isConflict`(409/412)에서 **덮어쓰지 않고** `FormConflictDialog` 를 띄우며 입력을 보존하고 성공 토스트·목록 이동을 하지 않는다(`useCrudForm.ts:158-172` · `DownloadFormPage.tsx:321`). 유령 저장도 닫혔다 — `createCrudAdapter.update` 가 없는 id 에 409 를 던진다(`crud.ts:71-73`). **그러나 토큰 전송(전반부)이 없다** — `DownloadItem` 에 `updatedAt`/version 필드가 **없고**(`types.ts:11-29`) 어댑터가 `If-Match` 를 싣지 않는다(앱 전역에서 `If-Match` 는 `shared/api/schema.d.ts` 의 **회원 메모 계약에만** 존재 — 전수 grep 확인). 따라서 **'다른 관리자가 먼저 수정' 은 탐지 자체가 불가능**하고 마지막 쓰기가 조용히 이긴다. 현재 409 는 '삭제된 항목 편집' 에서만 난다. *(`DownloadItem.version` 은 **문서의 판**('v2.1')이지 동시성 토큰이 아니다 — 이름이 같아 혼동하기 쉽다)*. **충돌 UI 가 이미 있으므로 도입 준비는 돼 있다** — BE-030 §7.4 가 묶음 도입을 판정 | 관리자 A 와 B 가 같은 자료를 연다 → A 가 제목 수정·저장 → B 가 버전 수정·저장 → **B 의 저장이 성공하고 A 의 제목 변경이 조용히 사라진다**(충돌 다이얼로그 없음). 대조군: A 가 **삭제**한 뒤 B 가 저장 → 409 → 충돌 다이얼로그 정상 동작. 기대: 전자도 412 → 충돌 다이얼로그 | **gap** |
| EXC-08 | EXC | 직접 | **충족.** 폼 제출이 `useCrudForm` 을 쓰므로 이중 방어가 갖춰졌다 — (a) **동기 락**: `submitLockRef`(`useCrudForm.ts:102`)를 `onValid` 진입 즉시 검사·설정해(`:195-196`) RHF 비동기 검증이 끝나고 `saving` 이 true 로 렌더되기 **전의 틈**을 닫는다. `onSettled` 에서 해제(`:207-209`), `onInvalid` 에서도 해제(`:239-241`). (b) **disable**: `disabled={saving || loadingDetail}`(`DownloadFormPage.tsx:315`). (c) **멱등키**: `idempotencyKeyRef` 를 **mutationFn 밖**에서 제출 시도 단위로 잡아(`:112-117`) 재시도가 같은 키를 재사용하고 성공 시 버린다(`:214`). 삭제/일괄 삭제는 `busy` 로 confirm 잠금(`useCrudList.tsx:159`·`:170`). 행 토글은 `pendingId` 로 그 행 잠금 | 제출 버튼 더블클릭 또는 응답 전 Enter 연타 → 어댑터 `create` 호출 **정확히 1건**. 저장 실패 후 재클릭 → 같은 `Idempotency-Key` 재사용 | pass |
| EXC-09 | EXC | 직접 | **충족.** 공유 predicate `isAbort` 가 모든 쓰기 경로에 배선됐다 — 폼: `useCrudForm.handleWriteError` 첫 줄(`:160`)에서 early return(토스트·배너 없음), 언마운트 시 abort(`:92`). 삭제: `closeDelete` 가 in-flight 를 abort 하고 `deleteItem.reset()` 으로 isPending 을 리셋(`useCrudList.tsx:86-92`), `onError` 가 `isAbort` 로 거른다(`:110`). 일괄: `settleAll` 결과에서 `signal.aborted` 를 확인해 **abort 시 무효화를 건너뛴다**(`crud.ts:237-239`). 행 토글: `useCrudRowUpdate` 가 `isAbort` 로 거르고 abort 시 `pendingId` 를 남기지 않는다. 취소로 cache 가 변경되는 경로 0건 | 저장 중 라우트 이탈 → toast 0건. 삭제 확인 다이얼로그를 요청 중 닫기 → **toast 0건 + 버튼 state 복원**, 목록 무변경. 일괄 삭제 중 취소 → 부분 실패 건수에 abort 가 포함되지 않는다 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **9** | STATE-01 · STATE-02 · TOKEN-01 · **COMP-10** · IA-01 · IA-05 · **IA-13** · EXC-08 · EXC-09 |
| 종속 | 13 | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-03 |
| n-a | 2 | FEEDBACK-06 · A11Y-12 |
| **gap** | **6** | **STATE-04 · FEEDBACK-04 · A11Y-11 · IA-02 · IA-04 · EXC-04** |
| **합계** | **30** | 9 + 13 + 2 + 6 = **30** ✓ |

> **`4b805ad` 재판정: P0 gap 이 8 → 6 으로 줄었다.** 뒤집힌 2건은 전부 **F3b 의 `useListState` 롤아웃을 이 화면이 실제로 소비한 결과**다:
> · **IA-13** — `DownloadListPage.tsx:87` `useListState({ filterDefaults })` 가 카테고리·노출상태·검색어를 URL 로 옮겼다. **이 화면의 주 운영 루프가 복원됐다**(`:7-9` 주석: `'숨김 자료만' 으로 걸러 한 건을 수정하고 목록으로 돌아오면 그 정리 작업 view 가 그대로다`).
> · **COMP-10** — `:167-173` 이 `list.searchInputProps` 를 스프레드하고 `useListState` 가 내부에서 `useDebouncedSearch`(조합 판정 + 250ms)를 소비한다(`useListState.ts:227-230`).
>
> **A11Y-11 은 범위가 좁아졌을 뿐이라 gap 을 유지했다** — F3a 의 `withAriaRequired` 주입으로 required 절이 3개 중 2개 충족이 됐지만(`FileUploadField` 만 미주입), **describedby 절의 버전 입력 결함은 그대로다**. **좁혀진 gap 을 pass 로 올리지 않았다.**
>
> **P0 gap 6건 → quality-bar '배치 실패' 사유.** 심각도 순: **STATE-04**(안 보이는 행이 삭제된다 — 데이터 손실. **F3b 가 선택 상태를 두 벌로 만들면서 사유가 더 분명해졌다** — `useListState` 의 선택은 필터와 연결돼 있는데 표는 `useCrudList` 의 선택을 쓴다) · **FEEDBACK-04**(입력이 조용히 사라진다 — quality-bar 가 '용납 불가' 로 부르는 silent 손실) · **EXC-04**(lost update — 동시성 토큰 부재) · **A11Y-11** · **IA-02** · **IA-04**.

## 3. 이 화면에 걸리는 P1 · P2 (선별 — 표면이 실재하는 것만)

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| **EXC-15** | **P1** | **이 화면의 핵심 P1.** (a) **업로드 전 client 검증 — 충족**: `downloadFileError`(`types.ts:113-121`)가 확장자·용량을 보고 위반 시 인라인 메시지로 거절하며 **요청을 발사하지 않는다**(애초에 발사하는 코드가 없다). (b) **progress·cancel — 미충족**: 업로드가 없으니 진행률·취소가 없다. (c) **실패 fallback — N/A**: 표시할 media 가 없다(파일명 칩만). (d) **`accept` 누락**: `<input type="file">` 에 `accept` 가 없어(`FileUploadField.tsx:249-258`) OS 창이 모든 파일을 보여준다 — 허용 목록이 `types.ts:62-76` 에 있는데도. **근본 원인: 파일이 전송되지 않는다**(FS-030 §1.1) | `.exe` 선택 → 인라인 거절 + 요청 0건(pass 방향). `.pdf` 20MB 선택 → 진행률 없이 즉시 칩 표시(전송이 없으므로). 파일 선택창에 `.exe` 가 보인다(`accept` 부재) | gap |
| STATE-03 | P1 | **충족.** `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:151`)를 쓰고 화면이 `firstLoading` 으로만 스켈레톤을 그려 **재조회 중 이전 행이 유지**된다. 인디케이터는 ' · 새로고침 중…' 뿐(`CrudListShell.tsx:120`). `staleTime: 30초`가 refetch 시점을 지배 | 노출 토글 → 재조회 중 이전 4행 유지 + 요약에 '새로고침 중…' | pass |
| STATE-05 | P1 | **부분 미충족.** 공용 `Empty` 를 쓰고 `hasQuery`·`onClearSearch` 를 넘겨(`DownloadListPage.tsx:192-195`) '검색 결과 없음' 분기는 동작한다. **그러나 `hasActiveFilters`·`onResetFilters` 를 넘기지 않아**(`CrudTable.tsx:161` 이 `empty.hasActiveFilters ?? false` 로 폴백) 카테고리·노출 필터로 0건이 되면 **'등록된 자료가 없습니다'(진짜 비어있음)로 오보**한다 — 3분기 중 하나가 도달 불가능하다. `createAction`(생성 CTA)도 없다 | 카테고리 '기타' 선택(0건) → '등록된 자료가 없습니다' + 복구 액션 없음. 기대: '조건에 맞는 자료가 없습니다' + '필터 초기화' | gap |
| STATE-06 | P1 | **충족.** `useCrudCreate`/`useCrudUpdate`/`useCrudDelete` 가 성공 시 정확히 stale 해진 캐시만 무효화한다 — list, 그리고 update 는 그 detail 까지(`crud.ts:179-181`·`:198-201`·`:218-220`). 일괄 삭제는 **전원 성공일 때만** 무효화(`:239`) | 자료 수정 후 목록 복귀 → 수동 새로고침 없이 새 값. 노출 토글 → 목록 즉시 갱신 | pass |
| A11Y-13 | P1 | **충족.** `useCrudForm.submit` 이 `handleSubmit(onValid, onInvalid)` 를 부르고(`useCrudForm.ts:253`) RHF 의 `shouldFocusError` 기본값이 첫 invalid 필드로 포커스를 옮긴다(`:233-241` 이 이를 계약으로 고정). 서버 422 도 `setError` + `setFocus`(`:176-186`). **다만 폼 진입 시 첫 필드 자동 포커스는 없다** | 빈 폼 제출 → `document.activeElement` 가 제목 입력. 폼 진입 직후 → 포커스가 body(부분 미충족) | pass |
| A11Y-16 | P1 | **충족.** 목록에 **항상 마운트된** polite live region 이 있고(`CrudListShell.tsx:107-109`) 최초 로드 중 침묵 → 결과/실패/0건을 알린다(`announcementOf` `:72-82`). 표에 `aria-busy`, caption(`CrudTable.tsx:117-120`). `FileUploadField` 는 드롭존이 `<button>`(Enter/Space 동작) + `aria-label` + `aria-describedby`, 오류가 `role="alert"`(`:261`). 숨은 file input 이 `tabIndex={-1}`+`aria-hidden` 이라 이중 탭 순서를 만들지 않는다 | 스크린리더로 검색 → '자료 N건을 찾았습니다' announce. 드롭존을 Tab 으로 도달 + Enter 로 파일 선택창 | pass |
| A11Y-08 | P1 | **미충족.** 행 전체 클릭이 수정으로 가는데(`CrudTable.tsx:172` `rowActivateProps`) **행 안에 같은 목적지로 가는 focusable 링크가 없다** — 제목 셀이 평문이다(`DownloadListPage.tsx:98`). **완화**: `RowActions` 의 '수정' 버튼(`CrudTable.tsx:192-197`)이 같은 목적지(`onEdit`)로 가는 keyboard-focusable 등가물이라 **키보드로 도달 불가능하지는 않다**. `rowActivateProps` 가 키보드 활성화를 지원하는지는 `useRowNavigation` 소유 | 행을 Tab → 체크박스 → RowActions 수정/삭제. 제목 링크 없음. 수정 버튼으로 detail 도달 가능 | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 사용 0건(앱 전역). `wait(LATENCY_MS, signal)` 에 상한이 없다. **업로드 60초 계약(BE-030-EP-06)과 맞물리면 특히 필요**하다 — 20MB 업로드가 매달리면 사용자가 알 방법이 없다 | 응답하지 않는 심 → 스켈레톤/저장 중이 무한 지속 | gap |
| EXC-06 | P1 | **부분 충족.** `HttpError` 가 status 를 싣고(`shared/errors/http-error.ts`) `useCrudForm` 이 **404 / 409·412 / 422 / 기타**를 각각 다른 surface 로 가른다(`:158-189` — not-found 대체 화면 / 충돌 다이얼로그 / 필드 인라인 / generic 배너 + 참조 코드). **그러나 목록 조회는 여전히 `error !== null` 하나로 뭉갠다**(`CrudListShell.tsx:113`) — 403 과 500 이 같은 배너. 업로드의 413/415 를 구분해 보여줄 자리도 없다(파일 오류 문구 1개) | `?status=save:409` → 충돌 다이얼로그 ✓. `?status=save:422` → 필드 인라인 ✓. `?status=detail:404` → '찾을 수 없습니다' ✓. `?status=list:403` 과 `?status=list:500` → **같은 배너** ✗ | gap |
| EXC-07 | P1 | **충족.** 422 + `violations` 를 RHF `setError` 로 해당 필드에 꽂고 첫 필드로 포커스를 옮긴다(`useCrudForm.ts:175-186`). client zod 오류와 **같은 인라인 slot**(`FormField error`)을 재사용한다. form-level 배너는 generic 전용(`:188-189`) | `?status=save:422` + `error.fields[].name='title'` → 제목에 인라인 오류 + 포커스. 배너 없음 | pass |
| EXC-10 | P1 | **부분 미충족.** `settleAll` 이 allSettled semantics 로 부분 실패를 **건수**로 보고하고(`crud.ts:235-236`) 다이얼로그를 열어둔 채 배너를 띄우며(`useCrudList.tsx:137-141`) **전원 성공일 때만** 무효화·선택 해제한다(`:143-145`). **그러나 실패한 id 를 반환하지 않아** 재시도가 **전체를 재실행**한다(성공분 재요청). 실패 항목만 선택 유지도 불가능 | 4건 중 2건 실패 → '4건 중 2건을 삭제하지 못했습니다' + 재클릭 시 **이미 삭제된 2건까지 재요청**(멱등이라 무해하나 계약 위반) | gap |
| EXC-11 | P1 | `navigator.onLine` 사용 0건(앱 전역) | offline 토글 → 배너 없이 실패 | gap |
| EXC-12 | P1 | **충족.** `loadFailure: 'not-found' \| 'error'` 로 갈리고(`useCrudForm.ts:144-149` `isNotFound`) 화면이 **404 는 '다시 시도' 를 주지 않는다**(`DownloadFormPage.tsx:174-178` — `loadFailure === 'error'` 일 때만 렌더). 무한 스피너 없음. **어댑터도 404 를 실어 보낸다** — 이 화면은 `createCrudAdapter`(`data-source.ts:69-83`)를 쓰고 그 `fetchOne` 이 없는 id 에 `HttpError(HTTP_STATUS.notFound)` 를 던진다(`crud.ts:105-107`) → **실사용 경로(없는 `:id` 로 수정 진입)에서 not-found 분기가 발현된다** | 없는 `:id` 로 `/support/downloads/zzz/edit` → '자료 찾을 수 없습니다…' + '목록으로'만. `?status=detail:500` → '불러오지 못했습니다' + '다시 시도' + '목록으로'. **⚠ 그 404 문구의 조사가 빠져 있다** — ERP-13 gap 을 보라(분기 자체는 정상) | pass |
| EXC-14 | P1 | **N/A 아님 — 미적용이 정답.** 행 토글이 `useCrudRowUpdate` 로 **비관적**이다(plain mutate + `pendingId`). EXC-14 는 'reversible inline toggle 은 optimistic + rollback' 을 요구하나, 이 화면은 optimistic 을 **쓰지 않으므로 rollback 누락 위험이 없다**(un-rolled-back optimistic write 0건). 다만 토글 반응이 400ms 지연된다 | `?fail=support-downloads:save` → 토글이 **되돌아가지 않는다**(애초에 안 바뀌었으므로) + 실패 토스트 | pass |
| EXC-18 | P1 | **미충족.** selection scope 가 명시되지 않았고(current-page vs all-matching — **페이지가 없어 사실상 all**) Shift-click range 선택이 없다. **파괴적 일괄 삭제에 임계값 강화 confirm·progress·cancel 이 없다** — 300건을 선택해도 확인 문구가 '선택한 자료 300건을 삭제하시겠습니까?' 로 같고 시작 후 취소·진행률이 없다. **STATE-04 gap 과 결합하면 위험하다** — 안 보이는 선택 + 강화 확인 부재 | 300건 선택 → 일괄 삭제 → count 는 보이나 type-to-confirm 없음, 진행률·취소 없음 | gap |
| EXC-20 | P1 | **충족.** 5xx 등 예상외 실패에 참조 코드를 노출한다(`useCrudForm.ts:189` `referenceOf(cause)` → `FormServerError`) | `?status=save:500` → 배너에 참조 코드 표시 | pass |
| COMP-01 | P1 | **부분 미충족.** 대부분 DS `<Button>` 을 쓰나 `FileUploadField` 가 `buttonStyle()` + `tds-ui-btn-*` 로 `<button>` 3개를 손조립한다('파일 교체' `:206-213`, '제거' `:214-222`, 드롭존 `:226-246`) — `dangerGhostStyle`(`:114-117`)도 로컬 조립. `DownloadFormPage.tsx:190-198`('목록으로')도 `backLinkStyle` 손조립. 제출 버튼이 `loading` prop 대신 **손으로 쓴 '저장 중…'**(`:316`) | `pages/support/downloads/**` 에 `buttonStyle(`·`tds-ui-btn-` grep = 4건 | gap |
| COMP-03 | P1 | **충족.** 검색이 DS `<SearchField>` 를 쓴다(`:140-145`). raw `type="search"` grep = 0 | — | pass |
| COMP-06 | P2 | 스켈레톤 행 수가 `length: 5` 하드코딩(`CrudTable.tsx:144`)이며 PAGE_SIZE 가 정의되지 않았다(페이지네이션 부재). 열 수는 `totalCols` 로 파생돼 정확 | 시드 4건 vs 스켈레톤 5행 | gap |
| COMP-09 | P2 | 긴 제목·파일명의 truncation 규칙이 없다 — 셀이 늘어난다. `fileNameStyle` 은 `overflowWrap: 'anywhere'`(`FileUploadField.tsx:98`)로 폼에서만 방어 | 200자 제목 등록 → 목록 컬럼이 밀린다 | gap |
| COMP-12 | P2 | 제목(100자)·버전(20자)에 실시간 카운터가 없다. `maxLength` 가 조용히 입력을 막는다 — 고장처럼 보인다. `FormField` 에 `counter` prop 이 있는데 쓰지 않는다 | 제목에 100자 입력 → 101번째가 조용히 무시된다 | gap |
| ERP-13 | P1 | **부분 해소 — 여전히 gap(사유 전환).** ✔ **공용 프레임워크 문구는 해소됐다**: 조사 헬퍼가 `shared/format.ts:269+`(`objectParticle` `:306`)로 승격돼 `useCrudForm.ts:222` 가 `` `${config.entityLabel}${objectParticle(config.entityLabel)} ${verb}했습니다.` `` 를 낸다 — **'자료'는 받침이 없으므로 이제 '자료를 등록했습니다'** 다(예전 '자료을(를)'). `useCrudList.tsx:108`·`:158`(삭제 토스트·확인 문구)도 같다. **앱 전역 사용자 대상 `'을(를)'` 리터럴 0건.** ✘ **이 화면 전용 문구 2곳이 남았다**: ① **조사가 통째로 빠졌다** — `DownloadFormPage.tsx:171-172` `'자료 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'` / `'자료 불러오지 못했습니다.'`. 이 화면은 `FormPageShell` 을 쓰지 않고 로드 실패 배너를 **자체 구현**하는데(`:164-186`), 그러면서 셸이 하던 `objectParticle(entityLabel)`(`FormPageShell.tsx:129-130`)을 옮겨오지 않았다 → **'자료**를** 찾을 수 없습니다' 가 돼야 한다.** ② **조사를 리터럴로 고정했다** — `DownloadListPage.tsx:118` `` `'${item.title}' 를 노출합니다.` `` / `` `'${item.title}' 를 숨겼습니다.` ``. 제목이 받침으로 끝나면('제품 설치 매뉴얼') '**을**' 이어야 한다. 대조: `portfolio/items/PortfolioListPage.tsx:91-92` 가 같은 토글 토스트를 `objectParticle(item.title)` 로 옳게 낸다 — **헬퍼도 선례도 있는데 이 화면이 소비하지 않는다**. `support/faq/CustomerFaqPage.tsx:134`·`:165` 가 같은 패턴을 복제한다 | 자료 등록 성공 → **'자료를 등록했습니다.'**(pass). 없는 `:id` 로 수정 진입 → **'자료 찾을 수 없습니다'**(조사 누락 — gap). '제품 설치 매뉴얼'(받침 ㄹ) 노출 토글 → **'… 를 노출합니다'**(gap, '을' 이어야 함). 리터럴 `'을(를)'` grep = 0 은 만족 | gap |
| ERP-12 | P1 | 목록 export(CSV/xlsx) affordance 가 없다 | 툴바에 내보내기 버튼 없음 | gap |
| ERP-08 | P2 | **충족.** `formatNumber`(다운로드수) · `formatBytes`(용량, 로컬 순수 함수) 를 쓰고 셀에 raw `toString()` 이 없다. `formatBytes` 는 `format.ts` 가 아니라 `types.ts:101-106` 에 있으나 도메인 특화라 정당 | 다운로드수 '1,284' 표시 | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산 — **업로드 특성 반영**

| 축 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 조회 p95 | **≤ 400ms**(서버 상한 5초 → 504) | 측정 불가 — 백엔드 없음 | `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **픽스처 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려는 개발용 값이다 |
| 상세 조회 p95 | ≤ 400ms | 동일 | 수정 진입마다 1회 |
| 저장 p95 | ≤ 600ms | 동일 | — |
| **업로드 p95** | **20MB 기준 ≤ 30초**(서버 상한 **60초** → 504, BE-030-EP-06) | **측정 불가 — 업로드가 없다** | 다른 계열(5초)과 **다른 예산**이다. 20MB / 10Mbps ≈ 16초 · 3Mbps ≈ 53초 → 저속 회선에서 60초 상한에 근접한다. **프론트 타임아웃 상한이 없어**(EXC-05) 서버가 끊기 전까지 사용자는 매달린 UI 를 본다 |
| **업로드 진행률** | **필수 — 5초 넘는 작업에 determinate progress** | **부재** | 20MB 업로드는 **수십 초** 걸린다. 진행률 없이 '저장 중…' 만 보이면 사용자가 멈춘 줄 알고 재시도한다. `submitLockRef` 가 중복 제출은 막지만 **불안은 막지 못한다**. 업로드 연동 시 필수(§5 #9) |
| **업로드 취소** | **필수** | 부재 | 잘못 고른 20MB 파일을 끝까지 기다려야 한다 |
| 파일 용량 상한 | **20MB**(`MAX_FILE_SIZE_MB` = 서버 413 경계와 일치) | 클라이언트만 강제 | 서버가 정본(BE-030 §7.2). 스트리밍 중 상한 초과 시 즉시 끊어야 한다(전량 버퍼링 = DoS) |
| 재조회 횟수 | 쓰기 1건당 1~2회 | 수정 시 list + detail 무효화(`crud.ts:199-200`) | `staleTime: 30초`가 라우트 재진입 재조회를 억제 |
| DOM 행 수 | **상한 미정** | 4행 | 페이지네이션·가상화 없음(IA-04 gap · BE-030 §7.8) |
| 필터 계산 | 목록 길이에 선형 × 매 키 입력 | `useMemo`(`:81-84`)가 `[items, category, visibility, keyword]` 로 메모 | **디바운스가 없어 자모마다 재계산**(COMP-10) — 4건이면 무의미하나 300건 × 자모 6회면 체감된다 |
| 미리보기 재렌더 | 매 입력 | `watch` 4개(`:296-300`) — `DownloadPreview` 가 폼 전체 리렌더에 동승 | 입력 1자마다 미리보기 재렌더. 현재 규모에서 무해 |
| 메모리 | 목록 1벌 | 스냅샷 없음(낙관 반영 없음). **`File` 객체를 붙들지 않는다**(버린다) — 역설적으로 메모리 누수 위험이 없다 | — |
| 번들 | 화면 전용 8파일 | 라우트 분할 없음(`App.tsx` 정적 import) — 앱 전역 정책 | — |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 재시도 | **충족** — 툴바는 남아 필터를 잃지 않는다 |
| 상세 조회 실패 | 404/5xx 를 가른 복구 | **충족**(EXC-12) |
| 저장 실패 | 배너 + 참조 코드 · 422 는 필드 인라인 | **충족**(EXC-07 · EXC-20) |
| 저장 충돌 | 입력 보존 + 충돌 다이얼로그 | **부분 충족** — UI 는 있으나 '먼저 수정' 을 탐지 못한다(EXC-04 gap) |
| 삭제 실패 | 다이얼로그 유지 + 배너 + 재시도 | **충족**(FEEDBACK-02) |
| 일괄 부분 실패 | 건수 보고 + 실패분만 재시도 | **부분 충족** — 건수는 보고하나 실패 id 미반환(EXC-10) |
| 요청 취소 | 실패로 보고하지 않음 | **충족**(EXC-09) — 폼·삭제·일괄·토글 전 경로 |
| 세션 만료(401) | 재인증 경로 | **상속 충족** — 인터셉터가 전수 |
| **업로드 실패** | 재시도 + 진행률 | **해당 없음 — 업로드가 없다.** 연동 시 재설계 필요 |
| 네트워크 단절 | offline 배너 + 쓰기 게이팅 | **미충족**(EXC-11). **20MB 업로드 중 단절은 특히 아프다** |
| 응답 지연 | 타임아웃 후 재시도 안내 | **미충족**(EXC-05) |
| 렌더 예외 | 복구 UI | **상속 충족**(EXC-01) |
| 유령 저장 | 없는 id 저장을 성공으로 보고하지 않음 | **충족** — 어댑터가 409(`crud.ts:71-73`) |

### 4.3 데이터 보존 · 감사

| 축 | 현재 상태 |
|---|---|
| **미저장 입력 보존** | **부분 충족 → 실질 미충족.** `useUnsavedChangesDialog` 가 3경로를 가드하나 **화면 안의 '취소'·'목록으로' 가 우회한다**(FEEDBACK-04 gap). **파일 첨부 후 취소하면 다시 고르는 수고까지 사라진다** |
| 세션 만료 시 초안 | **없음**(EXC-19 P1) — 401 인터셉터가 programmatic redirect 를 하므로 `beforeunload` 가드가 발화하지 못한다. 20MB 파일을 고른 긴 폼이 통째로 날아간다 |
| 자료 변경 이력 | **없음** — 누가 언제 자료를 수정·숨김·삭제했는지 기록하지 않는다. `DownloadItem` 에 `updatedAt`·`updatedBy` 가 없다(BE-030 §3). **고객 배포 파일의 교체 이력이 없다** — §5 #12 |
| 삭제 복구 | **없음** — 확인 후 즉시 비가역(FEEDBACK-05 P2). undo window 없음. 첨부 파일도 함께 정리된다(BE-030 §4 EP-05) |
| `downloadCount` 보존 | **충족** — `DownloadInput` 에 없어 수정·토글이 덮어쓰지 않는다(`patch` 규약, `downloads.test.ts:99-104` 가 회귀 고정) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-04** | **P0** | 필터·검색 변경 시 `controller.clear()` 미호출 + 일괄 삭제가 `visibleItems` 와 교집합을 취하지 않음(`useCrudList.tsx:127`) → **안 보이는 행이 삭제된다**. 공용 훅의 명시적 계약 위반(`useRowSelection.ts:7-8`). **F3b 이후 사유가 더 분명해졌다** — 이 화면은 `useListState`(`:87`, 자기 선택 상태가 view 서명 변경 시 비워진다 — `useListState.ts:205-213`)와 `useCrudList`(`:99-104`, `useRowSelection` 소유)를 **둘 다** 쓰면서 `CrudListShell` 에는 후자의 선택을 넘긴다(`:212-225`). **선택 상태가 두 벌인데 URL 상태와 연결된 쪽(`list.selectedIds`)이 쓰이지 않는다** | 이 화면(+`useCrudList` 의 교집합 방어는 전역 개선 후보) | 프론트 리팩터 |
| 2 | **FEEDBACK-04** | **P0** | '취소'(`:306-314`)·'목록으로'(`:190-198`)가 `<button>`+`navigate()` 라 가드를 우회 → **입력·파일 선택이 조용히 소실**. 수정 방향: `<Link>` 로 바꾸거나 가드에 programmatic navigate 훅 제공 | 이 화면(같은 패턴이 다른 폼에도 있을 수 있다 — 전역 점검 권고) | 프론트 리팩터 · 프론트 구현 |
| 3 | **EXC-04** | **P0** | `updatedAt`/version 부재 + `If-Match` 미전송 → '다른 관리자가 먼저 수정' 탐지 불가(lost update). **충돌 UI 는 이미 있다** — BE-030 §7.4 의 묶음 도입(토큰 + 412 + 어댑터)만 하면 프론트 변경 없이 동작 | 이 화면 · 백엔드 | 백엔드 명세 · 프론트 리팩터 |
| ~~4~~ | ~~**IA-13**~~ | ~~P0~~ | **해소됨(F3b)** — `DownloadListPage.tsx:87` `useListState({ filterDefaults: FILTER_DEFAULTS })` 가 카테고리(`:178`)·노출상태(`:192`)·검색어(`:167-173`)를 URL 쿼리스트링으로 옮겼다. 기본값은 URL 에서 지우고(`useListState.ts:113-118`) `replace` 로 갱신해(`:125`) **행 클릭 → 저장 → 목록 복귀 주 루프에서 필터가 살아남는다**. 손으로 고친 값은 `parseFilter`(`:92-96`)가 안전하게 좁힌다 | — | — |
| 5 | **IA-02** | **P0** | **`<h1>` 이 2개**(AppHeader `:101` '자료실' ↔ `DownloadFormPage.tsx:201` '자료 등록') — '단일 title 메커니즘' 미충족. 목록/폼의 title 소스가 갈리고, '행위'가 AppHeader 제목에 없다(`nav-config.ts:294-296` 이 의도로 명시). *(브랜치 라벨 '고객센터' 폴백은 `findCoveringLeaf`(`:260-278`)로 해소 — 이제 '자료실')* | 앱 전역(AppHeader · title 모델) + 이 화면 | 프론트 구현 |
| 6 | **IA-04** | **P0** | Pagination 부재 · 전량 렌더 · 상한 미정. 클라이언트 필터라 페이징 도입 시 필터를 서버로 옮겨야 한다 | 이 화면 · `CrudListShell` · 백엔드 | 프론트 리팩터 · 백엔드 명세 · UI 기획 |
| ~~7~~ | ~~**COMP-10**~~ | ~~P0~~ | **해소됨(F3b)** — `DownloadListPage.tsx:167-173` 이 `list.searchInputProps` 를 `SearchField` 에 스프레드하고, `useListState`(`:87`)가 내부에서 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다: 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) · 조합 중 Enter 차단(`:121-124`) · 250ms 디바운스(`:23,93-95`) | — | — |
| 8 | **A11Y-11** | **P0** | **두 갈래.** ① 버전 입력(`:249-258`)이 `aria-invalid`·`aria-describedby` 미배선 → 오류·힌트가 AT 에 미연결. 같은 폼의 제목 필드는 정상 — **규칙이 필드마다 갈린다**(이 화면). ② **`FileUploadField`(첨부 파일)의 required 가 AT 에 닿지 않는다** — `FormField` 를 쓰지 않는 페이지 전용 컴포넌트라 `withAriaRequired`(`FormField.tsx:50-56`) 주입 경로 밖이고, 드롭존 button 에도 hidden file input 에도 `aria-required` 가 없다(`FileUploadField.tsx:187-194`·`:226-258`). *(제목·카테고리는 F3a 의 런타임 주입으로 충족)* | ① 이 화면 ② 이 화면(`FileUploadField` 는 페이지 전용 — 공통 `ImageUploadField` 와 같은 계약 결손이다) | 프론트 리팩터 |
| 9 | EXC-15 | P1 | 업로드 미연동(파일 미전송) · `accept` 누락 · 진행률/취소 부재. **§4.1 의 업로드 예산이 전부 측정 불가**인 근본 원인 | 이 화면 · 백엔드 | 백엔드 명세 · 프론트 구현 · 프론트 리팩터 |
| 10 | STATE-05 | P1 | `hasActiveFilters`·`onResetFilters` 미전달 → 필터 0건이 '진짜 비어있음' 으로 오보 | 이 화면 | 프론트 리팩터 |
| 11 | EXC-18 | P1 | 일괄 삭제에 강화 confirm·progress·cancel·Shift-range 없음. **#1 과 결합 시 위험** | 이 화면 · `useCrudList`·`SelectionBar` | 프론트 구현 · 프론트 리팩터 |
| 12 | — | — | **자료 변경 감사 로그 부재**(§4.3) — 고객 배포 파일의 교체·삭제 이력이 없다 | 백엔드 | 백엔드 명세 · UI 기획 |
| 13 | EXC-10 | P1 | 일괄 실패 id 미반환 → 재시도가 성공분 재실행 | `shared/bulk.ts`·`useCrudList` | 프론트 리팩터 |
| 14 | A11Y-08 | P1 | 행 클릭 목적지의 row 내 focusable 링크 없음(제목 평문). RowActions 수정 버튼이 완화 | 이 화면 · `CrudTable` | 프론트 리팩터 |
| 15 | EXC-06 | P1 | 목록 조회가 status 를 뭉갠다(403·500 동일 배너). 폼은 정확히 가른다 | `CrudListShell` | 프론트 리팩터 |
| 16 | COMP-01 | P1 | `FileUploadField` 가 `buttonStyle()`/`tds-ui-btn-*` 로 버튼 3개 손조립 + '저장 중…' 손작성 | 이 화면 · DS | 프론트 리팩터 |
| 17 | ERP-13 | P1 | **이 화면 전용 문구 2곳** — ① `DownloadFormPage.tsx:171-172` 의 로드 실패 배너가 **조사를 통째로 뺐다**('자료 찾을 수 없습니다' → '자료**를** 찾을 수 없습니다'). 이 화면은 `FormPageShell` 을 쓰지 않고 배너를 자체 구현하면서 셸의 `objectParticle(entityLabel)`(`FormPageShell.tsx:129-130`)을 옮겨오지 않았다. ② `DownloadListPage.tsx:118` 의 노출 토글 토스트가 **조사를 리터럴 '를' 로 고정**했다(받침 있는 제목이면 '을'). *(공용 프레임워크 문구('자료을(를) 등록했습니다' 류)는 통합의 `shared/format.ts:269+` 승격으로 **해소** — `useCrudForm.ts:222`·`useCrudList.tsx:108,158`. 앱 전역 리터럴 '을(를)' 0건)*. 선례: `portfolio/items/PortfolioListPage.tsx:91-92` 가 같은 토글 토스트를 옳게 낸다 | 이 화면 | 프론트 리팩터 |
| 18 | EXC-05 | P1 | 프론트 타임아웃 상한 없음. **업로드 60초 계약과 맞물려 특히 필요** | 앱 전역 | 프론트 구현 |
| 19 | EXC-11 | P1 | offline 감지 없음. 20MB 업로드 중 단절이 특히 아프다 | 앱 전역 | 프론트 구현 |
| 20 | ERP-12 | P1 | 목록 export 없음 | 앱 전역 | 프론트 구현 |
| 21 | COMP-06 · COMP-09 · COMP-12 | P2 | 스켈레톤 5행 하드코딩 · truncation 규칙 없음 · 길이 카운터 없음 | 이 화면 · DS | 프론트 리팩터 |
| ~~22~~ | ~~MOTION-03~~ | ~~종속~~ | **해소됨(`a5c2639` · PR #26)** — `ToggleSwitch.css:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 transition 을 `none` 으로 끈다(`:32`·`:56` 두 선언 모두 덮음, 근거 주석 `:76-78`). 이 화면은 행마다 1개 + 폼 1개를 소비하지만 더 이상 gap 이 아니다 | — | — |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래는 판정을 재현하려는 QA/구현자를 위한 스위치 목록이며, 각 값은 어댑터 코드에서 확인했다.

| 스위치 | 이 화면에서 유효한 값 | 근거 |
|---|---|---|
| `?fail=<op>` | `?fail=list` · `?fail=detail` · `?fail=save` · `?fail=delete` · `?fail=all` | `shared/crud/dev.ts:87-92` |
| `?fail=<scope>:<op>` | **`?fail=support-downloads:list`** · **`:detail`** · **`:save`** · **`:delete`** | scope = `DOWNLOAD_RESOURCE = 'support-downloads'`(`data-source.ts:9`) |
| `?status=<target>:<code>` | `?status=save:409` · `?status=save:422` · `?status=detail:404` · `?status=list:403` · `?status=all:500` | `dev.ts:57-71`. 재현 가능 status: 400·401·403·404·409·412·422·429·500(`dev.ts:27-37`). ⚠ 파서가 `<target>:<code>` **2토큰만** 읽으므로 `?status=support-downloads:save:409` 는 **동작하지 않는다** |
| `?delay=` | **없다** — 이 화면에 존재하지 않는 스위치다 | `shared/crud/dev.ts` 에 delay 파라미터가 없다. 지연은 `LATENCY_MS = 400` 고정(`dev.ts:12`) |

**op 목록은 `createCrudAdapter` 가 정한다** — `list`(`fetchAll`) · `detail`(`fetchOne`) · `save`(`create`·`update` **공용**) · `delete`(`remove`)(`crud.ts:44`·`:50`·`:61`·`:67`·`:79`). **등록과 수정이 같은 `save` op 을 공유**하고 **노출 토글도 `update` 라 `save` 에 걸린다** — `?fail=support-downloads:save` 는 셋을 동시에 실패시킨다.

| 판정 | 재현 절차 |
|---|---|
| STATE-04 gap | 전체선택 → 카테고리 '브로슈어' 필터 → SelectionBar 가 여전히 전체 건수 → 일괄 삭제 → 안 보이던 행도 삭제됨 |
| FEEDBACK-04 gap | 제목 입력(dirty) → '취소' 클릭 → 확인 없이 이탈. 대조군: 같은 상태에서 사이드바 링크 → 다이얼로그 정상 |
| A11Y-11 gap | 버전 21자 + 제출 → 오류 `<p>` 는 보이나 `input[aria-describedby]` = null, `aria-invalid` = null. 대조군: 제목 |
| IA-02 gap | `/support/downloads/new` → `document.querySelectorAll('h1')` = 2개('고객센터', '자료 등록') |
| IA-13 gap | 필터 설정 → URL 불변 → 행 클릭 → '목록으로' → 필터 소실 |
| EXC-04 gap | 두 탭에서 같은 자료 편집 → 각각 다른 필드 저장 → 둘 다 성공, 먼저 저장한 변경이 사라짐 |
| COMP-10 gap | IME 로 '홍길동' 입력 → 표가 자모마다 재필터 |
| IA-04 gap | 시드 300건으로 늘려 진입 → 300행, Pagination 없음 |
| STATE-01 pass | 노출 토글 → 이전 행 유지 + ' · 새로고침 중…'(스켈레톤 없음) |
| EXC-08 pass | 제출 더블클릭 → `create` 호출 1건 |
| EXC-09 pass | 삭제 요청 중 다이얼로그 닫기 → toast 0건 + state 복원 |
| EXC-12 pass | `?status=detail:404` → '찾을 수 없습니다' + '목록으로'만(다시 시도 없음) |
| EXC-15 부분 | `.exe` 선택 → 인라인 거절 + 요청 0건(pass). 파일 선택창에 `.exe` 노출(`accept` 부재 — gap) |

## 7. 자기 점검

- [x] quality-bar 요구 문구를 복제하지 않고 **ID 로만 참조**했다
- [x] §2 **P0 30건 전수** · 표기 순서 준수 · 빈칸 0건
- [x] 모든 `N/A` 에 사유를 적었다 (2건 — FEEDBACK-06 · A11Y-12)
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 적었다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 적었다
- [x] §2.1 산수 검산 — 9 pass + 13 종속 + 2 n-a + 6 gap = **30** ✓
- [x] **판정 기준일을 `2026-07-17 · HEAD = a5c2639` 로 갱신하고 PR #22·#24·#26·#28·#30·#32·#34 이후 코드로 P0 30건을 전수 재확인했다.** **이번 기준에서 뒤집힌 것은 판정 부호가 아니라 근거 2건이며 §2.1 건수는 불변이다**: ① **TOKEN-01 — 이전 pass 의 근거가 틀렸다.** `title-sm-*` 는 **실재하지 않는 토큰**이었고(`tokens.css:186-197` 에 title 티어는 `md`·`lg`·`xl` 뿐) hex/px grep 이 그것을 잡지 못했다 — **'토큰만 참조한다' 와 '참조한 토큰이 실재한다' 는 다른 명제**임을 §2 에 명시했다. PR #32 가 `title-md-*` 로 고쳐 **지금은 진짜 pass** 이며, 신설 가드(`token-guard.test.ts:208-268` — 실행 11 pass · 위반 0)와 그 **범위 한계**(값 가드는 `.css` 만, 참조 가드만 `.ts`/`.tsx` — `:12-15`)를 함께 적었다 ② **MOTION-03 — DS gap 해소**(`ToggleSwitch.css:79-84`), §5 #22 를 해소 표시했다. MOTION-01/02 는 근거 텍스트만 갱신하고 **'라이브러리 0건이라 gap 일 가능성' 추정을 쓰지 않았다.** **직전 기준(`4b805ad`)에서 뒤집혔던 COMP-10 · IA-13 은 그대로 pass 다.** **A11Y-11 은 required 절이 3→1 로 좁아졌을 뿐 describedby 절의 버전 입력 결함이 남아 gap 을 유지했다** — 좁혀진 gap 을 pass 로 올리지 않았다. **STATE-04·ERP-13 도 gap 을 유지하되 사유를 갱신했다**(선택 상태 두 벌 · 이 화면 전용 조사 문구 2곳)
- [x] **A11Y-11 의 required 절을 grep 이 아니라 호출부 자식 타입으로 판정했다** — `withAriaRequired`(`FormField.tsx:50-56`)는 런타임 `cloneElement` 라 소스 grep(앱 전역 1건)은 지표가 아니다
- [x] §3 은 **표면이 실재하는** P1·P2 만 골랐다 — **EXC-15(업로드)를 최상단**에 뒀다
- [x] **§4.1 성능 예산에 업로드 특성(20MB 상한 · 업로드 p95 30초/서버 60초 · 진행률 부재)을 반영**했다
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님을 §4.1 에 명시했다
- [x] §6 의 `?fail=` scope(`support-downloads`)·op(`list`·`detail`·`save`·`delete`)를 **어댑터 코드에서 확인**했고, `?delay=` 가 이 화면에 없음을 명시했다
- [x] FS-030 §7 · BE-030 §7.10 과 §5 의 이관 항목을 상호 일치시켰다
- [x] **E2E 미실행 — 판정 근거는 코드 대조**임을 §6 에 명시했다
