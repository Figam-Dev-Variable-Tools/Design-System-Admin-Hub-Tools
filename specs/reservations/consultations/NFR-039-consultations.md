---
id: NFR-039
title: "상담 예약 관리 비기능 명세"
functionalSpec: FS-039
backendSpec: BE-039
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.1
date: 2026-07-17
---

# NFR-039. 상담 예약 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-039 상담 예약 관리 (`/reservations/consultations` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30). **이 문서는 그 요구를 재서술하지 않는다.** 요구 문구·근거·appliesTo 는 quality-bar 가 정본이고 여기서는 **ID 로만 참조**한다 |
| 이 문서의 역할 | quality-bar 의 **페이지 적용본**. 각 요구가 이 화면에 걸리는가(적용), 걸린다면 이 화면의 **어느 코드가** 충족을 결정하는가, 무엇을 재현하면 판정이 뒤집히는가만 적는다 |
| 함께 읽는 문서 | FS-039(요소·예외) · BE-039(계약·보안 판정). gap 은 FS-039 §7 · BE-039 §7.8 과 **번호로 상호 참조**한다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 의 30행을 재판정한다. 이 화면 코드 **또는 이 화면이 소비하는 공용 프레임워크**(`shared/crud/**`)가 바뀌면 해당 행의 '코드 근거'와 판정을 갱신한다. **판정 근거는 코드 대조다 — E2E 는 실행하지 않았다**(§6) |
| 판정 기준일 | 2026-07-17 · `HEAD = a5c2639` (PR #22·#24·#26·#28·#30·#32·#34 머지 이후) |
| 이번 기준 갱신으로 뒤집힌 판정 | **없음** — 이 화면은 이미 A11Y-11 이 `pass` 였다. MOTION-01/02 는 **근거**만 바뀌었다(소유 DS · 판정 `종속` 유지). **주목**: 이 화면이 `pass` 인 근거였던 '희망 날짜/시각을 각자의 `FormField` 로 나눈 구조'를 **예약 폼(NFR-037)이 PR #30 에서 채택해 그쪽 gap 이 닫혔다** — 코드 주석이 이 화면을 선례로 명시한다(`ReservationFormPage.tsx:261-262`). `isRealDate` 는 이 화면 검증(`validation.ts:29`)에 **의도적으로 잔존**한다(§3 ERP-09 계열) |

> **이 화면의 판정 지형**: 목록은 `useCrudList` + `CrudListShell` + **`useListState`**, 폼은 `useCrudForm` + `FormPageShell` + **DS `FormField`** 위에 있다. 그래서 STATE-01/02 · EXC-04/08/09 · STATE-05 · A11Y-16 · EXC-12 를 **프레임워크가 이미 충족시킨다** — 같은 섹션의 신청서(NFR-038)가 그 프레임워크를 우회해 같은 요구를 gap 으로 남긴 것과 대조된다.
>
> **1.0 → 1.1 갱신 요지 — 이 지형이 배당을 냈다.** F2(`3cd3078`) 기준이던 §2 를 `HEAD = 4b805ad` 로 다시 돌린 결과 **gap 8 → 5** 다. 1.0 이 '프레임워크가 아직 안 하는 것'으로 분류한 다섯 중 **셋(URL state · IME · `aria-required`)을 프레임워크가 하게 됐고, 이 화면은 코드를 거의/전혀 바꾸지 않고 pass 를 받았다** — `useListState` 배선 한 줄(`ConsultationBookingListPage.tsx:78`)로 COMP-10·IA-13 이, **`FormField` 의 `withAriaRequired` 로 A11Y-11 이 화면 코드 0줄에** 닫혔다. 남은 gap 은 **Pagination · 쓰기 권한 게이팅**(프레임워크가 아직 안 하는 것) · **STATE-04**(공용 훅의 한 줄) · **IA-02**(`FormPageShell` 의 h1 이중) · **FEEDBACK-02**(도메인)다.

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(`pages/reservations/consultations/**` + 이 화면이 소비하도록 선택한 공용 훅의 배선)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

> **`직접` 과 `상속` 의 경계**: `useCrudList`·`useCrudForm` 은 공용 모듈이지만, **그것을 쓸지 말지가 이 화면의 선택**이다(신청서는 안 썼다). 그래서 그 훅이 주는 충족은 `상속`(DS 소유)이 아니라 **`직접`(이 화면이 그 배선을 골랐다)** 으로 판정하고 근거에 훅 파일:라인을 함께 적는다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | 충족. 이 화면이 `useCrudList` 를 소비하고(`ConsultationBookingListPage.tsx:68-73`), 그 훅이 **`firstLoading = isFetching && data === undefined`** 로 스켈레톤 조건을 최초 로드에 한정한다(`useCrudList.tsx:71`). `CrudListShell:138` 이 그 값을 `CrudTable loading` 으로 넘기고, `:119` 가 요약을 갈라 쓴다. **4상태가 정확히 하나만 렌더된다** — error 는 `:113` 이 표 전체를 대체하고, empty 는 `CrudTable:153-169`(성공 + 0행)에서만, skeleton 은 `:143`(firstLoading)에서만. 폼도 같은 규칙(`useCrudForm.ts:130` `loadingDetail = isEdit && isFetching && data === undefined`) | 행이 있는 상태에서 `staleTime`(30초) 경과 후 재조회(라우트 이탈 후 복귀) → **표가 유지되고 요약에 ' · 새로고침 중…' 만 붙으면 pass**. `?fail=reservation-consultations:list` → error Alert **만**(empty 문구 없음). 상태 필터로 0행 → Empty **만** | **pass** |
| STATE-02 | STATE | 직접 | 충족. **세 read 표면 모두** 인라인 danger Alert + 재시도다. ① 목록 — `CrudListShell:156-165`(Alert + '다시 시도' → `controller.refetch`). ② 폼 로드 5xx — `FormPageShell:124-140`(Alert + '다시 시도' → `onRetryLoad` + '목록으로'). ③ 폼 로드 404 — 같은 Alert 이되 **재시도를 의도적으로 뺀다**(`:131` — 재시도해도 영원히 없다). read 실패에 toast 를 쓰지 않는다 | `?fail=reservation-consultations:list` / `:detail` → 각각 인라인 Alert + 재시도. error toast 미발생 | **pass** |
| STATE-04 | STATE | 직접 | **미충족(선택 잔존 축).** 축을 갈라 보면 — ① **page clamp: N/A**(페이지네이션이 없다 — IA-04 가 판정). ② **필터·키워드 변경 시 선택 해제: 충족** — `ConsultationBookingListPage.tsx:76-78` `useEffect(() => clear(), [filter, keyword, clear])`. ③ **동시/단건 삭제로 숨겨진 행의 선택 해제: 미충족** — `useCrudList.tsx:104-108` 의 단건 삭제 `onSuccess` 는 `setPendingDelete(null)` + 토스트만 하고 **`clear()` 를 부르지 않는다**(일괄 삭제 경로 `:144` 에는 있다). 선택된 행을 단건 삭제하면 **행은 사라졌는데 id 가 선택 집합에 남아** 요약이 'N건 선택됨' 을, SelectionBar 가 유령 건수를 센다. **F2 는 `useCrudList` 를 손댔지만 이 경로는 고치지 않았다**(재확인함) | 행 하나를 체크 → 그 행을 행 액션으로 단건 삭제 → **행이 사라진 뒤에도 'N건 선택됨' 과 SelectionBar 가 남으면 gap**. 이어서 '선택 1건 삭제' 를 누르면 어댑터가 409 를 던져 '1건 중 1건을 삭제하지 못했습니다' 가 뜬다(**유령 성공 토스트는 F2 의 존재 검사가 막았다** — `crud.ts:82-84`) | **gap** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전량이 `var(--tds-*)` 만 참조한다 — `ConsultationBookingListPage.tsx:36-59` · `ConsultationBookingFormPage.tsx:32-36`. hex 0건, px 리터럴 0건(`calc(var(--tds-space-6) * 5)`·`minmax(calc(var(--tds-space-6) * 4), 1fr)` 은 토큰 연산), border/outline 키워드 0건 | 두 파일에 `#[0-9a-f]{3,6}` · `[1-9]px` · `(outline\|border): (thin\|medium\|thick)` grep = 0. lint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 focus ring 표면: DS `<Button>`·`<SelectField>`·`<TextareaField>`·`SearchField` + `.tds-ui-focusable`(폼 입력 6개 · `FormPageShell:149` back-link). 링 두께·색은 DS 가 결정하고 이 화면은 클래스만 붙인다 | DS/`app-shell.css` 소유 문서 판정 | **종속** |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비 표면: 저장·삭제 성공 토스트(`useCrudForm.ts:215` · `useCrudList.tsx:107,145`). 이 화면은 자체 animation/transition 을 선언하지 않는다 | ToastProvider/tokens codegen 소유 문서 판정 | **종속** |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 elevation 표면: `Card`(`FormPageShell:164`) · Toast · ConfirmDialog(단건·일괄 삭제 · 미저장 가드) · 충돌 다이얼로그. 전부 DS 컴포넌트이고 이 화면은 `box-shadow` 를 선언하지 않는다 | DS `Card.css`/`Modal.css`/tokens 소유 문서 판정 | **종속** |
| TOKEN-05 | TOKEN | 상속 | 이 화면의 display/heading 표면: `FormPageShell:159` 가 공유 `pageTitleStyle` 로 `<h1>` 을 그린다 — 이 화면은 titleStyle 을 재선언하지 않는다. 목록은 in-content h1 이 없다 | `shared/ui/styles.ts` `pageTitleStyle` / tokens 소유 문서 판정. **단 폼 화면엔 h1 이 둘이다** — IA-02 행 참조 | **종속** |
| COMP-10 | COMP | 직접 | **충족(1.0 에서 뒤집힘 — F3b).** 이 화면이 `useListState` 를 소비하고(`ConsultationBookingListPage.tsx:78`) **그 훅이 내부에서 `useDebouncedSearch` 를 배선한다**(`useListState.ts:24` import · `:227-230`). 입력창은 `value={list.searchInput}` `onChange={list.setSearchInput}`(`:138-139`)에 더해 **`:143` 이 `{...list.searchInputProps}` 를 스프레드**해 `compositionstart/end` 와 조합 중 Enter 차단을 받는다(`useListState.ts:50-54`). 조회에 들어가는 것은 커밋된 `keyword`(URL 의 `q`)뿐이다(`:84,101-104`) — 조합 중 자모는 `searchInput` 에만 머문다. **1.0 의 정직한 한정(클라이언트 필터라 네트워크 축은 재현 불가)은 그대로 유효하되**, 이제 서버 검색으로 확장돼도 자모마다 요청이 나가지 않는다 | 검색창에 '윤아름' 을 IME 로 입력 → 조합 중에는 표가 재필터되지 않고 `compositionend` 후 250ms 디바운스로 한 번만 커밋된다. `useListState` → `useDebouncedSearch` import 체인으로 확인 | pass |
| FEEDBACK-02 | FEEDBACK | 직접 | **미충족(상태 전이 축).** 축을 갈라 보면 — ① **삭제: 충족.** 단건·일괄 모두 `ConfirmDialog intent="delete"` 로 게이트되고(`useCrudList.tsx:151-178`), busy 중 확인 버튼 잠금(`busy={deleting}`), 실패 시 **다이얼로그를 열어 둔 채** error 배너 + 재클릭 재시도(`:109-113`), 취소·닫기가 in-flight 를 abort 하고 pending 을 리셋한다(`:86-92` `closeDelete` — `abort()` + `reset()`). ② **비가역 상태 전이: 미충족.** 종료 상태(`visited`·`noshow`·`cancelled`)로의 전이는 되돌릴 수 없는데(`_shared/booking.ts:47-49` — 세 상태 모두 빈 배열), 폼의 상태 select(`ConsultationBookingFormPage.tsx:258-275`) → '저장' 은 **확인 다이얼로그 없이** 곧장 `useCrudForm.submit` 으로 간다. **삭제는 게이트하면서 '노쇼' 로 못 박는 것은 한 번에 끝난다** | 상태 '확정' 인 예약을 열어 '노쇼' 선택 → '저장' → **확인 없이 저장되고 그 뒤 select 후보가 자기 자신 하나로 잠기면 gap**. 삭제 축은 `?fail=reservation-consultations:delete` 로 pass 확인(다이얼로그 유지 + 재클릭 재시도) | **gap** |
| FEEDBACK-04 | FEEDBACK | 직접 | 충족. 이 화면이 `FormPageShell` 을 소비하고 그것이 `useUnsavedChangesDialog(isDirty && !saving, {message})` 를 배선한다(`FormPageShell:113`). `isDirty` 는 RHF 정본(`useCrudForm.ts:254`)이고 이 화면이 `unsavedMessage` 를 준다(`ConsultationBookingFormPage.tsx:27-28,132`). 3경로는 훅이 소유(`useUnsavedChangesDialog.tsx:127-133`). 저장 성공은 `navigate(listPath, {replace:true})`(`useCrudForm.ts:216`)로 self-initiated 라 프롬프트 없이 통과한다 | 고객명을 고친 뒤 ① 탭 닫기 ② 사이드바 링크 ③ 브라우저 뒤로 → 각각 discard 확인. 저장 성공 후 동일 navigation 은 프롬프트 없이 통과 | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | 이 화면에 **편집 폼을 담은 modal 이 없다** — 등록·수정 폼은 **전용 라우트**(`/new` · `/:id/edit`)의 페이지다(`App.tsx:280-281`). 이는 IA-06 의 무게 규칙(rich 엔티티 = route / 짧은 taxonomy = modal)에 따른 **의도된 선택**이며, 상담 예약은 필드 9개짜리 rich 엔티티라 route 가 옳다. 이 화면이 여는 modal 은 삭제 확인·충돌·discard 확인뿐이고 **셋 다 폼이 아니다**. 공용 `useModalDirtyGuard`(실소비자 7곳)를 쓸 대상이 없다 | — (표면 없음) | **N/A** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공(`useCrudForm.ts:215`) · 단건 삭제 성공(`useCrudList.tsx:107`) · 일괄 삭제 성공(`:145`). 지속 live region 은 `ToastProvider` 가 소유한다(`ToastProvider.tsx:155-162`) | ToastProvider 소유 문서 판정 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 단건·일괄 삭제 ConfirmDialog(`useCrudList.tsx:153-176`) · 충돌 다이얼로그(`FormConflictDialog`) · discard 확인. `aria-describedby` 배선은 DS `Modal` 의 `describedBy` 계약이 소유한다(`Modal.tsx:6,60`) | Modal/ConfirmDialog 소유 문서 판정 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족(1.0 에서 뒤집힘 — F3a. 화면 코드 0줄 변경으로 해소됐다).** ① **`aria-invalid` ↔ `aria-describedby` 짝: 충족(유지).** 인라인 에러를 갖는 필드 전부가 `aria-invalid={errors.X !== undefined}` 와 `aria-describedby={errors.X !== undefined ? errorIdOf('csb-X') : undefined}` 를 **쌍으로** 건다(`ConsultationBookingFormPage.tsx:150-153, 171-174, 211-212, 230-233, 249-252`) — 짝 없는 `aria-invalid` 0건이고, `FormField.tsx:109-112` 가 그 id 로 `role="alert"` `<p>` 를 그린다. ② **required 노출: 이제 충족.** 1.0 은 '`FormField required` 는 `*` 를 `aria-hidden` 으로만 그리고 컨트롤에 `aria-required` 를 붙이지 않는다 — 그 배선은 호출부 책임인데 없다'고 적었다. **F3a 가 그 책임을 `FormField` 로 옮겼다**: `withAriaRequired()`(`FormField.tsx:50-56`)가 `required` 를 **런타임 `cloneElement` 로 자식 컨트롤의 `aria-required` 에 주입**한다. 주입 대상은 네이티브 `input`/`select`/`textarea` 와 DS `SelectField` 다(`isRequirableChild:36-41`). **이 폼의 required 7필드를 자식 타입으로 전수 확인한 결과 7/7 주입된다**: 고객명(`input:142`) · 연락처(`input:166`) · 상담유형(`SelectField:182`) · 상담 주제(`input:203`) · 희망 날짜(`input:224`) · 희망 시각(`input:243`) · 상태(`SelectField:259`) — **래퍼 `div` 로 감싼 복합 필드가 하나도 없다.** ⚠ **대조**: 같은 섹션의 예약 폼은 '이용 시간'을 `<div>` 로 감싸 시작/종료 두 입력을 넣었기에 **그 한 건이 주입되지 않아 NFR-037 의 A11Y-11 은 gap 이다** — 이 폼은 희망 날짜/시각을 **각자의 `FormField`** 로 나눠 그 함정을 피했다. **grep 으로 판정하면 안 된다** — 주입은 런타임이라 소스에 `aria-required` 가 보이지 않는다 | RTL 로 `/reservations/consultations/new` 를 렌더 → 고객명·연락처·상담유형·상담 주제·희망 날짜·희망 시각·상태 **7개 컨트롤 전부에 `aria-required="true"` 가 실재한다**(주입 결과). 담당(`SelectField:191`)·상담 메모(`TextareaField:277`)는 `required` 가 아니라 없는 것이 옳다. `aria-invalid` 짝 축도 pass | pass |
| A11Y-12 | A11Y | N/A | 이 화면에 **좌측 필터 list item 이 없다** — 상태 필터는 `<SelectField>` 네이티브 select 다(`ConsultationBookingListPage.tsx:122-140`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터 버튼이 존재하지 않는다(두 파일에 `aria-current`·`aria-pressed` grep = 0) | — (표면 없음) | **N/A** |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 삭제 확인 · 충돌 · discard 확인 — **이 섹션에서 Modal 을 가장 많이 여는 화면이다**. enter/exit transition 은 DS `Modal` organism 소유 | Modal 소유 문서 판정. **구 기준의 '`packages/ui/src/organisms/Modal/` 에 Motion/AnimatePresence 0건 — DS 측 미구현' 은 낡았다** — 오버레이 모션은 **구현됐고, 라이브러리가 아니라 CSS-only 다**(Motion/framer-motion 은 여전히 미도입 — `package.json` 19개·import·lockfile 전부 0건): backdrop fade `Modal.css:20-21,30-33` · dialog scale 0.96→1 `:58-59,35-38` · reduced-motion 게이트 `:173-180` · `component.overlay` recipe `tokens/tokens.json:1286-1308`. 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd` 로 동등 달성한다(`Modal.tsx:216-218`). **잔여**: 애니메이션되는 닫힘은 Modal 소유 3경로(Esc·딤·×)뿐이라 **ConfirmDialog 의 footer 버튼(취소·확인) 경로는 여전히 즉시 언마운트된다**(`Modal.tsx:27-31`). 라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫이다. **이 화면은 Modal 을 가장 많이 여는 화면이라 그 잔여의 최대 노출면이다** | **종속** |
| MOTION-02 | MOTION | 상속 | 이 화면의 toast 표면: 저장·삭제 성공 토스트 3종. exit 애니메이션은 `ToastProvider` 소유이며 **완전 구현됐다** — `.tds-toast--exiting`(`Toast.css:32-37`) + keyframes `:121-131`, reduced-motion 게이트 `:136-141`. `exit-duration`={motion.duration.fast}(150ms) · `exit-easing`={motion.easing.accelerate} 로 요구 문구를 정확히 충족한다 | ToastProvider 소유 문서 판정 | **종속** |
| MOTION-03 | MOTION | 상속 | 이 화면은 **자체 animation/transition 을 선언하지 않는다**(두 파일에 `transition`·`animation` 0건). reduced-motion 게이트 대상은 전부 DS(Modal·Toast·skeleton pulse·row hover) | 전역 Motion config / DS CSS 소유 문서 판정. (참고: 34문서가 인용하던 `ToggleSwitch.css:56` 의 reduced-motion off 부재는 **해소됐다** — 게이트 `ToggleSwitch.css:79-84`. **이 화면에는 ToggleSwitch 표면이 없어 무관하다**) | **종속** |
| IA-01 | IA | 상속 | 세 라우트가 `App.tsx:276-281` 에서 `APP_ROUTES` 로 선언되고 `RequireAuth > AppShell` 레이아웃 라우트 아래에서 일괄 렌더된다. 이 화면은 자체 sidebar/top bar 를 만들지 않는다(두 파일에 `<header>`/`<nav>` 0건) | AppShell 소유 문서 판정 | **종속** |
| IA-02 | IA | 직접 | **미충족(gap 유지 — 사유 전환. 두 결함 중 하나가 해소됐다).** **① 브랜치 라벨 폴백은 해소됐다(통합).** 1.0 은 '`findNavLabel` 이 정확 일치로만 찾고 못 찾으면 브랜치 라벨로 폴백해 `/reservations/consultations/new` 가 「예약/신청 관리」를 받는다'고 적었다. 지금은 `findNavLabel` 이 **`findCoveringLeaf`**(`nav-config.ts:269-279` — '자기를 감싸는 가장 긴 잎', 세그먼트 경계 매칭 `covers():255-257`) 위에 있어(`:297-299`) `/reservations/consultations/new` 와 `/:id/edit` 는 잎 `/reservations/consultations` 에 덮여 **'상담 예약'** 을 받는다. `nav-config.test.ts:16-40` 이 같은 규칙을 고정한다. **② `<h1>` 이중은 남았다** — `FormPageShell.tsx:160` 이 본문에 `<h1>{isEdit ? '상담 예약 수정' : '상담 예약 등록'}</h1>` 를 또 그린다. ③ **행위가 AppHeader 제목에 반영되지 않는다(의도)** — `nav-config.ts:293-295` 가 '등록/수정은 nav 에 없는 문구라 레이아웃이 지어내지 않는다'고 밝힌다. **→ '단일 title 메커니즘' 미충족으로 gap 유지.** 1.0 의 '상단의 것이 요구가 금지한 브랜치 라벨'은 **이제 틀렸다** — 틀린 게 아니라 **둘이다** | `/reservations/consultations/new` 진입 → 가시 primary title 이 **'상담 예약'**(1.0 이 적은 '예약/신청 관리'가 **아니다**)이고 **`document.querySelectorAll('h1').length === 2`** — 이것이 남은 gap 의 재현이다 | **gap** |
| IA-04 | IA | 직접 | **미충족(Pagination 축).** 템플릿을 축별로 보면 — toolbar 좌측 검색·필터 O(`ConsultationBookingListPage.tsx:115-141`), **우상단 primary '상담 예약 등록' O**(`:142-145`), 결과 count 요약 O(`CrudListShell:118-122`), SelectionBar O(`:125-133`), table O(`:135`), **Pagination 없음 → gap**. 요구는 'page size 초과 가능 시 Pagination' 인데 상담 예약은 무한 증가하고 서버 페이징 계약도 없다(BE-039 §7.8 #9) — 조회된 전량이 한 표에 렌더된다. **템플릿의 다른 축은 `CrudListShell` 덕에 전부 충족한다** — 빠진 것은 Pagination 하나다 | 상담 예약 100건 이상인 상태로 목록 진입 → Pagination 없이 전량이 렌더되면 gap. `reservations/` 에 `Pagination` import grep = 0 | **gap** |
| IA-05 | IA | 직접 | 충족. `/reservations/consultations/new` 와 `/reservations/consultations/:id/edit` 가 **같은 컴포넌트** `ConsultationBookingFormPage` 로 해석된다(`App.tsx:280-281`). 레이아웃은 동일하고 `useCrudForm` 이 `const isEdit = id !== undefined`(`useCrudForm.ts:74`)로 갈라 **title('상담 예약 등록' vs '수정' — `FormPageShell:159`)과 prefill(`useCrudForm.ts:125-128` `reset(toValues(loaded))`)만** 다르다. create 전용/edit 전용 페이지가 따로 없다 | 두 라우트의 element 가 동일 컴포넌트인지 `App.tsx:280-281` 대조. `/new` 는 빈 폼 + '등록', `/:id/edit` 는 채워진 폼 + '저장' | **pass** |
| IA-13 | IA | 직접 | **충족(1.0 에서 뒤집힘 — F3b).** 상태 필터와 키워드의 단일 원천이 **URL 쿼리스트링**이다 — `ConsultationBookingListPage.tsx:78` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })`(`FILTER_DEFAULTS = { status: BOOKING_FILTER_ALL }` — `:45`)를 쓰고, 상태는 `list.filters['status']` 를 `parseFilter` 로 좁혀 읽고(`:79-83`) `list.setFilter('status', …)` 로 쓴다(`:148`). 키워드는 URL 의 `q`. 갱신은 `{ replace: true }`(`useListState.ts:125`)라 타이핑이 history 를 쌓지 않고, **기본값과 같은 값은 URL 에서 지운다**(`:114-118`). **1.0 이 지목한 핵심 루프가 실제로 복구됐다** — 이 화면은 행 클릭이 곧 수정 폼 진입이라(FS-039-EL-008.12) 목록→폼→Back 이 핵심인데, replace 로 목록 URL 이 늘 최신이라 **Back 이 그 조건에 그대로 착지한다**. 손으로 고친 `?status=거짓말` 은 `STATUS_FILTER_VALUES`(`:39-42`)가 막는다 | 상태='요청' + 키워드 입력 → URL 이 **`/reservations/consultations?status=requested&q=…`**. 행 클릭으로 수정 폼 진입 → 브라우저 Back → **필터·키워드가 그대로 살아 있다.** URL 을 새 탭에 붙여 넣으면 조건이 재현된다 | pass |
| EXC-01 | EXC | 상속 | 이 화면을 감싸는 경계: `AppShell.tsx:484-493` 이 `<Outlet>` 바로 바깥에서 `ErrorBoundary` 로 감싸고(셸 유지), `App.tsx` 루트 경계가 셸 자체의 예외를 받는다. 이 화면은 자체 경계를 두지 않는 소비자다 | ErrorBoundary/AppShell 소유 문서 판정 | **종속** |
| EXC-02 | EXC | 상속 | 두 축 모두 이 화면 밖: ① 라우트 가드 — `RequireAuth` 가 `AppShell` **바깥**을 감싼다(`App.tsx`). ② 401 인터셉터 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` 가 `isUnauthorized` → `notifySessionExpired()`(`shared/query/queryClient.ts`) — 이 화면의 조회·저장·삭제가 그 캐시를 통과하므로 자동 적용된다 | RequireAuth/queryClient 소유 문서 판정. **단 dirty 입력 보존은 별개** — §4.3 · EXC-19 | **종속** |
| EXC-03 | EXC | 직접 | **미충족(쓰기 게이팅 축).** read 가드는 상속으로 충족 — `AppShell.tsx:490-492` 가 `<Outlet>` 을 `RequirePermission` 으로 감싸 read 권한 없는 라우트에 `ForbiddenScreen` 을 그리고, 리소스는 `resourceIdForPath` 가 라우트에서 파생하므로 `/new`·`/:id/edit` 같은 하위 라우트도 잎 `/reservations/consultations` 의 리소스로 덮인다(`route-resource.ts` — '자기를 감싸는 가장 구체적인 잎이 곧 자기 리소스'). **그러나 쓰기 컨트롤 게이팅이 이 화면에 없다** — `useRouteWritePermissions` 를 `pages/reservations/**` 전체가 import 0건이다. **'상담 예약 등록' 버튼(`ConsultationBookingListPage.tsx:160`) · RowActions 의 수정/삭제 · SelectionBar 의 일괄 삭제 · 폼의 '저장' 이 전부 권한과 무관하게 렌더·활성된다** — 요구가 'delete 없는 role 이 row/bulk delete 버튼을 못 봄' 을 명시적으로 요구한다. 강등 reconcile 도 없다. ⚠ **`4b805ad` 재확인 — 사유 전환**: F3b 이후 `useRouteWritePermissions` 소비처가 **7곳**이 됐다(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`). 1.0 의 '아무도 안 쓴다'가 아니라 **'7곳이 쓰는데 이 섹션만 롤아웃에서 빠졌다'** — 판정·영향은 그대로이고 **배선 선례가 7개 생겼다** | remove 권한 없는 역할로 목록 진입 → **행 삭제·일괄 삭제 버튼이 그대로 보이고 눌리면 gap**. `pages/reservations` 에 `useRouteWritePermissions` grep = 0(대조군: 위 7곳) | **gap** |
| EXC-04 | EXC | 직접 | 충족 — **acceptanceCheck 기준. 단 잔여가 있다.** 이 화면이 `useCrudForm` 을 소비하고, 그 훅의 `handleWriteError` 가 `isConflict(cause)` 를 보면 **덮어쓰지 않고** 충돌 state 를 세워(`useCrudForm.ts:166-179`) `FormConflictDialog` 를 띄운다 — 입력은 폼에 그대로 남고, **성공 토스트도 목록 이동도 없다**(유령 저장 금지). '최신 불러오기'(재조회 → `:131-134` effect 가 `reset`)와 '닫기'(입력 유지) 두 선택을 준다. 어댑터도 없는 id 의 update 에 409 를 던져 **ghost saved 를 막는다**(`crud.ts:126-128`). **잔여(요구의 '토큰을 보낸다' 축) — `4b805ad` 재확인 시 그대로다**: `ConsultBooking` 에 `updatedAt`/`version` 이 없고 `If-Match` 는 앱 전체에서 회원 메모에만 있다. **F3b 가 `WriteContext`(`crud.ts:30-42`)에 `idempotencyKey` 자리를 만들었으나 `If-Match`/`version` 자리는 만들지 않았다** — 멱등키('같은 요청의 재시도')와 낙관적 동시성('다른 사람의 개입')은 다른 축이다. 지금 감지되는 것은 '먼저 **삭제**됐다'(존재 여부) 뿐이고 '먼저 **변경**됐다'(둘 다 존재)는 못 잡는다 — **그 경우는 last-write-wins** 다(BE-039 §7.6). **acceptanceCheck 의 두 항목('fixture 409 가 입력 유지 + 충돌 다이얼로그 + 토스트/이동 없음' · '제거된 record 편집이 conflict 배너')은 모두 관측 가능하므로 pass 로 판정하되, 토큰 부재를 §4.2 잔여로 남긴다** | `?status=save:409` 로 수정 저장 → **충돌 다이얼로그가 뜨고 입력이 남고 이동이 없으면 pass**. 다른 탭에서 그 항목을 삭제한 뒤 저장해도 동일 | **pass** |
| EXC-08 | EXC | 직접 | 충족. 이 화면이 `useCrudForm` 을 소비한다. ① **동기 락** — `submitLockRef`(`useCrudForm.ts:103`)를 `onValid` 첫 줄에서 검사·설정하고(`:201-203`) `onSettled` 에서 푼다(`:213-215`). **RHF 의 비동기 검증이 끝나 `saving` 이 렌더되기 전의 빠른 두 번째 Enter/클릭이 여기서 멈춘다** — `disabled={saving \|\| loadingDetail}`(`FormPageShell:188`)과 **이중**이다. ② **멱등키** — `idempotencyKeyRef`(`:118-123`)를 **mutationFn 밖**에서 만들어 재시도가 **같은 키**를 재사용하고, 성공 시 버려 다음 제출이 새 거래가 된다(`:220`). 검증 실패 시 락을 풀어(`:246-248`) 다시 제출할 수 있다. ✅ **1.0 대비 개선(F3b)**: 1.0 은 '멱등키의 재사용은 `Idempotency-Key` 헤더 배선 후 확인'이라 유보했는데, **이제 키가 실제로 어댑터까지 도달한다** — `WriteContext.idempotencyKey`(`crud.ts:30-42`) 자리가 생겼고 `useCrudForm` 이 variables 에 실어(`:211,228,235`) `mutationFn` 이 `adapter.create(input, { signal, idempotencyKey })` 로 넘긴다(`crud.ts:288-289,310-311`). 픽스처가 `createIdempotencyLedger`(`:62-72`)로 **재생을 실제로 구현**하고 **적용에 성공한 뒤에만 키를 기록한다**(`:114-116` — 실패한 첫 시도가 키를 태워 재시도가 no-op 이 되는 것을 막는 순서). **즉 '재시도가 같은 키를 재사용한다'가 이제 픽스처에서 관측 가능하다** | '등록' 을 응답 전에 빠르게 두 번 클릭(또는 Enter 연타) → **정확히 1건만 발사되면 pass**. `?fail=save` 로 실패시킨 뒤 재클릭 → **같은 키가 재사용되어** 성공 시 1건만 생성된다(픽스처 ledger 로 관측 가능 — 1.0 시점엔 불가능했다) | **pass** |
| EXC-09 | EXC | 직접 | 충족. **모든 쓰기 경로가 공유 predicate `isAbort` 를 쓴다.** ① 저장 — `useCrudForm.ts:156`(`handleWriteError` 첫 줄, 토스트·배너 없이 반환). ② 단건 삭제 — `useCrudList.tsx:110`. ③ 다이얼로그 닫기 — `closeDelete`/`closeBulk` 가 `abort()` + **`mutation.reset()`**(`:87-92`, `:118-123`)으로 isPending 을 되돌린다. ④ 일괄 삭제 — `onSuccess` 가 `signal.aborted` 면 조기 반환하고(`:136`), `useCrudBulkDelete.onSuccess` 도 abort 면 무효화하지 않는다(`crud.ts:238`). ⑤ 언마운트 — `useCrudForm.ts:92` cleanup. **abort 가 실패 count 에 들어가지 않는다** | 삭제 확인 → 확인 클릭 → 응답 전 '취소' → **토스트 없이 버튼 state 가 복원되면 pass**. 저장 중 라우트 이탈도 동일 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **11** | STATE-01 · STATE-02 · TOKEN-01 · **COMP-10** · FEEDBACK-04 · **A11Y-11** · IA-05 · **IA-13** · EXC-04 · EXC-08 · EXC-09 |
| `종속` | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · IA-01 · EXC-01 · EXC-02 |
| `N/A` | **2** | FEEDBACK-06 · A11Y-12 |
| `gap` | **5** | STATE-04 · FEEDBACK-02 · IA-02 · IA-04 · EXC-03 |

**검산**: 11 + 12 + 2 + 5 = **30** ✓ (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30)

> **P0 gap 5건 — quality-bar '배치 실패' 사유다.** 소유를 갈라 보면: **이 화면 코드로 닫는 것 3건**(FEEDBACK-02 · IA-04 · EXC-03), **공용 프레임워크가 닫는 것 1건**(STATE-04 — `useCrudList` 단건 삭제 경로에 `clear()` 한 줄, **10개 소비 화면 공통**), **앱 전역 1건**(IA-02 — `FormPageShell` 의 두 번째 h1). **가장 싼 것은 여전히 STATE-04 다** — `useCrudList.tsx:104-109` 에 `clear()` 한 줄이면 이 화면과 나머지 9개 화면이 함께 닫힌다.
>
> **1.0(gap 8) → 1.1(gap 5) 변화 — `HEAD = 4b805ad`**:
> - **COMP-10 · IA-13 이 pass 로 뒤집혔다** — F3b 가 `useListState` 를 배선했고(`ConsultationBookingListPage.tsx:78`) 그 훅이 IME 안전 검색까지 함께 가져왔다.
> - **A11Y-11 이 pass 로 뒤집혔다 — 이 화면은 코드를 한 줄도 바꾸지 않았다.** F3a 가 `FormField.tsx:50-56` 에 `withAriaRequired` 를 넣어 `required` 를 자식 컨트롤의 `aria-required` 로 주입하고, **이 폼의 required 7필드가 전부 `input`/`SelectField` 라 7/7 주입된다.** 1.0 이 'DS `FormField` 의 required 배선 또는 호출부 6곳'이라 적은 두 선택지 중 **DS 쪽이 선택된 것이다.**
>   ⚠ **구 기준(`4b805ad`)에서는 같은 F3a 를 받고도 NFR-037(예약 폼)이 gap 이었다** — 그쪽은 '이용 시간'을 래퍼 `<div>` 로 감싸 두 입력을 넣었기에 주입 대상에서 제외됐다. **이 폼이 pass 인 것은 운이 아니라 희망 날짜/시각을 각자의 `FormField` 로 나눈 구조 덕이다.**
>   ✔ **`a5c2639` 갱신 — 예약 폼이 이 구조를 따라와 닫혔다.** PR #30 이 '이용 시간'을 `시작 시각`·`종료 시각` 두 `FormField` 로 쪼갰고(`ReservationFormPage.tsx:265,277`) **그 코드 주석이 이 화면을 선례로 명시한다**(`:261-262`: '희망 날짜/시각을 나눠 같은 함정을 피한 상담 예약 폼 FS-039 의 선례'). **이 문서가 기록한 '구조가 판정을 갈랐다'는 관찰이 그대로 수선의 근거가 됐다** — NFR-037 의 A11Y-11 은 이제 `pass` 다. 이 화면의 판정에는 변화가 없다.
> - **IA-02 는 사유가 바뀌었다**(브랜치 폴백 해소 → **`FormPageShell` 의 두 번째 h1** 만 남음). 범위도 '앱 전역(`findNavLabel`)' → '앱 전역(`FormPageShell`)' 으로 옮겼다.
> - **EXC-03 도 사유가 바뀌었다**(소비 0건 → **7곳 소비하는데 이 섹션만 미배선**).
> - **STATE-04 · FEEDBACK-02 · IA-04 는 사유·판정이 모두 1.0 과 같다** — 코드로 재확인했다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 충족. `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:152`) + `refreshing = isFetching && data !== undefined`(`useCrudList.tsx:72`) → `CrudListShell:118-120` 이 건수를 유지한 채 ' · 새로고침 중…' 만 덧붙인다(`aria-busy`). `staleTime: 30_000`(`queryClient.ts`)이 refetch 시점을 지배 | 필터 변경 시 이전 행 유지 + 가벼운 인디케이터 | pass |
| STATE-05 | P1 | 거의 충족. `CrudListShell` 에 `empty` 맥락을 넘겨(`ConsultationBookingListPage.tsx:156-161`) 공용 `Empty` 가 3분기(검색/필터/진짜 0건)를 그리고 '검색 지우기'·'필터 초기화' 를 준다. 조사(이/가)도 `Empty` 소유(`CrudTable.tsx:156-167`). **단 `createAction` 을 넘기지 않아 진짜 0건일 때 create CTA 가 없다** — 요구는 '생성 가능 시 primary create CTA' 를 요구하고, 이 화면은 생성 가능하다(툴바에 버튼이 있다) | 키워드 'zzz' → '검색 지우기' O. 시드를 비우고 진입 → create CTA 없으면 부분 gap | gap(부분) |
| STATE-06 | P1 | 충족. `useCrudCreate`/`useCrudUpdate`/`useCrudDelete`/`useCrudBulkDelete` 가 목록·상세 키를 **정확히** 무효화한다(`crud.ts:179-181, 198-201, 217-219, 237-240`). 일괄 삭제는 **전원 성공일 때만** 무효화(`:239`) | 수정 저장 → 목록 복귀 시 새 값 | pass |
| COMP-01 | P1 | 충족. 이 화면의 버튼이 전부 DS `<Button>` 이다 — 등록(`:142`) · SelectionBar 삭제(`CrudListShell:126`) · 폼 취소/저장(`FormPageShell:180,188`) · Alert 재시도(`:160`). **`buttonStyle(`·`tds-ui-btn-` grep = 0**(신청서와 대조). 단 진행 상태를 `loading` prop 이 아니라 손으로 쓴 '저장 중…'(`FormPageShell:189`)으로 표현한다 — 요구의 두 번째 절 미충족 | 두 파일 + 소비 셸에 `buttonStyle(` grep = 0. `loading` prop 사용 여부 | gap(부분) |
| COMP-02 | P1 | 충족. `CrudTable` 이 `RowSelectCell`·`SelectAllHeaderCell`·`SeqCell`·`SeqHeaderCell` 을 쓴다(`CrudTable.tsx:124-130, 173-179`) — raw checkbox 손조립 0건 | selectable 테이블에 raw checkbox 마크업 0 | pass |
| COMP-03 | P1 | 충족. DS `<SearchField>` molecule 소비(`:116`) — raw `type="search"` 재구현 없음 | 이 화면에 raw search input grep = 0 | pass |
| COMP-04 | P1 | 충족(마커 축). 필수 6필드가 `FormField required` 로 `*` 마커를 렌더한다(`:139,160,181,202,221,240`). **단 그 마커가 `aria-hidden` 이라 AT 에는 안 보인다** — A11Y-11 이 그 축을 판정 | 라벨 옆 `*` 존재 | pass |
| COMP-06 | P2 | `CrudTable.tsx:144` 이 `length: 5` 하드코딩. 셀 수는 `totalCols = columns.length + 3` 으로 **정확히 파생**(`:113`)하므로 요구의 절반은 충족. **PAGE_SIZE 가 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준 자체가 없다**(IA-04 gap 의 파생) | `length: 5` grep > 0 이면 gap | gap(공용) |
| COMP-07 | P2 | `CrudTable.tsx:179` `SeqCell seq={index + 1}` — page offset 미반영. **정직한 한정: 이 화면에 Pagination 이 없으므로 지금은 재현 불가능한 잠복 결함이다** — 보이는 것이 전량이라 `index+1` 이 실제 위치와 항상 일치한다. IA-04 를 닫는 순간 2페이지 첫 행이 1로 리셋된다 | 현재 재현 불가. Pagination 도입 후 판정 | gap(잠복·공용) |
| COMP-08 | P2 | 충족. 마지막 컬럼이 `RowActions`(pencil/trash) 하나로 통일돼 있고(`CrudTable.tsx:190-199`) **중복 '상세' 버튼이 없다**(신청서와 대조). 인라인 편집 테이블 = RowActions 규칙과 일치 | 중복 '상세' secondary 버튼 0 | pass |
| COMP-09 | P2 | `topic`(80자)·`customerName` 에 truncation 이 없다 — 긴 값이 컬럼을 민다. `nowrap` 은 code·희망일시·상태에만 걸려 있다 | 매우 긴 주제로 테이블 폭 변화 관찰 | gap |
| COMP-11 | P1 | **N/A — 기간 필터가 이 화면에 없다.** 툴바는 검색 + 상태 select 뿐(`:115-141`). 희망일시 컬럼은 표시 전용이고 날짜로 거르는 표면이 없다. **'이번 주 상담' 을 보는 것이 상담 예약 triage 의 기본 동작이라 부재 자체가 UX 결손이지만, 없는 필터에 `start ≤ end` 를 판정할 수는 없다** — 기능 요청으로 이관 | — (표면 없음) | N/A |
| COMP-12 | P2 | 주제(80자)·메모(500자)에 실시간 카운터·상한 근접 경고가 없다. `FormField` 는 `counter` prop 을 지원하는데(`FormField.tsx:46,66`) 이 폼이 넘기지 않는다. 다만 **over-limit submit 은 zod 가 인라인 메시지로 차단**하므로(조용한 truncate 아님) 요구의 절반은 충족 | 메모 500자 초과 → 인라인 에러 O, 카운터 X | gap(부분) |
| FEEDBACK-01 | P1 | 충족. read 실패=인라인 Alert · write 성공=toast · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`useCrudList.tsx:158,171` `error` prop) — modal 뒤에 숨는 toast 없음. page 가 임의 배너 state 를 갖지 않는다 | 강제 실패 delete → 다이얼로그 배너(toast 아님) | pass |
| FEEDBACK-03 | P1 | 충족. 모든 mutation 이 성공·실패 양 경로에 피드백을 건다 — 저장(toast/배너·충돌·필드) · 단건 삭제(toast/배너) · 일괄 삭제(toast/부분 실패 배너). no-op 없음 | 각 `?fail=` op → 가시 실패 | pass |
| FEEDBACK-05 | P2 | 삭제는 confirm-before 로 게이트되나 undo window 가 없다 — 요구는 'confirm **또는** undo' 이므로 충족. **상태 전이는 둘 다 없다**(FEEDBACK-02) | 단일 미확인 클릭 delete 0 | pass |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스(Cancel)는 DS 소유 — 이 화면은 소비자 | ConfirmDialog 소유 문서 판정 | 종속 |
| A11Y-05 | P1 | 이 화면의 `SelectField` 4개(상태 필터·상담유형·담당·상태)는 **isInvalid 를 쓰지 않는다** — enum 이라 위반이 불가능하다. 표면은 있으나 invalid 경로가 없다 | SelectField isInvalid 사용 0 | N/A |
| A11Y-08 | P1 | 충족. `useRowNavigation` 은 mouse-only 이고 tabIndex 를 주지 않는다 — 접근 가능한 행 내 경로가 전제다. 이 화면은 `RowActions` 의 수정 버튼(접근 이름 `'<고객명> (<번호>)'`)이 **행 클릭과 같은 목적지**(`onEdit`)를 준다(`CrudTable.tsx:172,196`) | 행을 Tab → 수정 버튼 도달, Enter 로 같은 폼 열림 | pass |
| A11Y-13 | P1 | 절반 충족. **submit 검증 실패 시 첫 invalid 필드 포커스는 충족** — `useCrudForm.ts:253` 이 `handleSubmit(onValid, onInvalid)` 로 RHF 의 `shouldFocusError` 를 계약으로 고정하고, 422 서버 위반도 `setFocus`(`:184`)로 옮긴다. **폼 진입 시 첫 편집 필드 포커스는 없다** | 빈 폼 제출 → activeElement 가 고객명 input 이면 그 축 pass. 진입 시 포커스 없음 | gap(부분) |
| A11Y-16 | P1 | 충족. **항상 마운트된** polite live region 이 목록 상태를 알린다(`CrudListShell.tsx:107-109` — 최초 로드엔 침묵, 그 뒤 실패/0건/N건). 표 `aria-busy`(`CrudTable:116`) · 스크린리더 caption(`:117-120`) · `role="alert"` 에러(`FormField:72`) · 포커스 링 · `aria-busy` 스켈레톤(`FormPageShell:170`). **`Empty` 자신의 `role="status"` 에 의존하지 않고 껍데기가 지속 region 을 소유하는 것이 핵심**(`:99-106` 주석) | 필터로 0행 전환 → announce | pass |
| IA-03 | P1 | breadcrumb 없음 — 폼에서 '예약/신청 관리 > 상담 예약 > 등록' trail 부재. AppHeader 소유 | detail/form route 에 trail 렌더 여부 | gap(상속) |
| IA-06 | P1 | 충족. 상담 예약은 필드 9개짜리 rich 엔티티이고 **전용 form route** 를 쓴다(`App.tsx:280-281`) — taxonomy modal 과 혼용하지 않는다. 무게 규칙과 일치 | list-엔티티 edit 가 전용 route 인지 | pass |
| IA-07 | P1 | 충족. back-link 가 '목록으로' + `ChevronLeftIcon` + `<button>` + 좌상단(`FormPageShell:147-155`) — 앱 표준 | `ArrowLeftIcon`·'리스트로 돌아가기' grep = 0 | pass |
| IA-08 | P1 | 충족. footer 가 카드 안, secondary '취소' 좌 · primary '저장/등록' 우(`FormPageShell:179-191`) | 버튼 상대 위치 | pass |
| ERP-01 | P1 | **부분.** 상태→tone 이 이 화면 로컬이 아니라 **섹션 공용** `_shared/booking.ts:27-33` 에 있고 예약(방문)과 공유한다 — 화면 로컬 맵을 둔 신청서보다 낫다. **그러나 요구는 '공유 domain code 의 **단일** 레지스트리' 다** — 앱 전역 레지스트리는 없고 섹션마다 자기 맵이 있다(`applications/types.ts`·`marketing/_shared/campaign.ts`·`products/*/types.ts` 등 20+ 파일). 같은 semantic('취소')이 상담 예약에선 neutral, 다른 섹션에선 다른 tone 일 수 있다 | 단일 export 된 map/함수가 status→tone 유일 소스인지 | gap |
| ERP-02 | P1 | 테이블 density variant 없음 — `tableStyle`/`tdStyle` 고정. 상담 예약은 10컬럼이라 dense 수요가 있다 | density 토큰 존재 여부 | gap(상속) |
| ERP-04 | P1 | sortable header 없음 — 정렬이 `sortConsultBookings` 고정(희망일시 오름차순). 담당·상태로 정렬하려면 필터를 써야 한다 | header 에 aria-sort 여부 | gap(상속) |
| ERP-05 | P1 | **N/A — Pagination 자체가 없다**(IA-04). range 표시·size selector 를 얹을 컴포넌트가 없다 | — (표면 없음) | N/A |
| ERP-06 | P1 | 조회 요약이 '전체 N건'인데 N 은 **필터·검색 후** 건수다(`CrudListShell:119` — `visibleItems.length`). 희망일시가 `shared/format` 을 거치지 않고 원문을 이어 붙인다(`:92`) — 다른 화면의 날짜 표기와 다르다 | 상태 필터를 걸고 '전체 N건' 의 N 확인 | gap |
| ERP-08 | P2 | 부분. 건수는 `formatNumber` 경유(`CrudListShell:119`)이나 **희망일시가 raw 문자열 연결**이다(`ConsultationBookingListPage.tsx:92`) — `formatDateTime` 을 쓰지 않는다 | 셀에 raw 문자열 연결 grep | gap(부분) |
| ERP-12 | P1 | 엑셀 export 없음 | toolbar 에 export affordance 부재 | gap |
| ERP-13 | P1 | **충족(1.0 에서 뒤집힘 — 통합. 화면 코드 0줄 변경으로 해소됐다).** 1.0 은 '`useCrudList` 의 토스트·확인 문구가 리터럴 「을(를)」 을 렌더한다 · 공용 `Empty` 만 조사 헬퍼를 갖는다'고 적었다. **통합이 조사 헬퍼를 `shared/format.ts:306,311,321`(`objectParticle`·`topicParticle`·`directionParticle`)로 승격**하고 소비처를 바꿨다: 삭제 토스트·확인 본문이 `` `'${nameOf(target)}'${objectParticle(nameOf(target))} …` ``(`useCrudList.tsx:108,158`), 저장 토스트가 `` `${entityLabel}${objectParticle(entityLabel)} ${verb}했습니다.` ``(`useCrudForm.ts:222`), 빈 상태가 `CrudTable.tsx:59-72` 의 조립. 판정은 **마지막 글자의 종성**으로 갈린다(한글 음절 U+AC00–U+D7A3 의 `(code-0xAC00) % 28`). ⚠ **`@tds/ui` 의 `Empty` 는 자기 사본을 계속 갖는다** — 앱을 import 할 수 없는 **레이어 경계** 때문이며 `format.ts` 헤더가 '의도된 자족'이라 밝힌다 | 상담 예약을 삭제 → **`'윤아름 (CSB-…)'를 삭제했습니다.`**(리터럴 '을(를)'이 **아니다** — 마지막 글자가 `)` 라 한글이 아니므로 관용대로 받침 없음 판정). 저장 → '상담 예약을 저장했습니다.'('약'에 ㄱ 받침). **이 섹션 전용 파일 · 앱 전역 모두 사용자 대상 `을(를)`·`이(가)`·`은(는)` grep = 0** | pass |
| ERP-14 | P1 | **연락처에 masking/validation input 이 없다** — `z.string()` 20자 검사뿐이고 하이픈 자동 삽입·paste normalize·형식 인라인 검증이 없다. **상담 예약의 연락처는 상담사가 실제로 거는 번호라 오타가 곧 미상담이다** | '010abc' 입력 → 통과하면 gap | gap |
| ERP-15 | P1 | 대형 list 계약 없음 — page size cap·virtualization 없고, **10컬럼 테이블에 가로 scroll 컨테이너도 없다** | 1,000행 · 좁은 뷰포트에서 관찰 | gap |
| EXC-05 | P1 | 프론트 타임아웃 상한 없음 — `AbortSignal.timeout` 앱 전역 0건 | never-resolving fixture 로 무한 spin 확인 | gap |
| EXC-06 | P1 | **부분 — 이 섹션에서 가장 앞선 화면이다.** `useCrudForm` 이 status 로 갈라 쓴다: 409/412 → 충돌 다이얼로그(`:160-173`) · 422 → 필드 인라인 + 포커스(`:176-186`) · 404 vs 5xx → not-found vs retry(`:138-143`) · 5xx → 배너 + 참조 코드(`:188-189`). **남은 것: 403(권한)·429(backoff) 가 일반 5xx 배너로 뭉개진다.** 목록·삭제 경로도 status 분기가 없다 | `?status=save:403` 과 `?status=save:500` 의 화면이 같으면 그 축 gap | gap(부분) |
| EXC-07 | P1 | 충족(프론트 측). `useCrudForm.ts:176-186` 이 `isUnprocessable` + `violations` 를 RHF `setError`(type:'server')로 매핑하고 첫 위반 필드로 `setFocus` 한다 — **클라이언트 zod 와 같은 에러 슬롯**(`FormField` error prop)을 재사용한다. form-level 배너는 generic 전용(`:188`). **서버가 `error.fields` → `HttpError.violations` 를 실어 줘야 발화한다**(BE-039 §6) | field path 있는 fixture 422 → 해당 필드 인라인 + 포커스 | pass |
| EXC-10 | P1 | 부분. `settleAll` 이 allSettled semantics 로 'N중 M건 실패' 를 보고하고(`useCrudList.tsx:137-141`), 실패 시 **다이얼로그를 열어 둔 채** 선택을 유지하며, **전원 성공에만** invalidate + clear 한다(`:143-146` · `crud.ts:239`). **남은 것: 실패 id 를 반환하지 않아 'retry failed only' 가 불가능**하다 — 재클릭이 전량을 재실행한다(멱등이라 안전하나 낭비) | 부분 실패 후 재시도가 성공분까지 재요청하면 gap | gap(부분) |
| EXC-11 | P1 | offline 감지 없음 — `navigator.onLine` 앱 전역 0건 | offline 토글 → 배너 여부 | gap(상속) |
| EXC-12 | P1 | 충족. `useCrudForm.ts:137-143` 이 `isNotFound` 로 `loadFailure` 를 `'not-found' \| 'error'` 로 가르고, `FormPageShell:115-143` 이 **404 는 '찾을 수 없습니다 + 목록으로'(재시도 없음)**, **5xx 는 '불러오지 못했습니다 + 다시 시도 + 목록으로'** 로 그린다. 무한 loading 없음 | 없는 id 로 `/csb-999/edit` 진입 → not-found 전용 문구 + 재시도 버튼 부재 | pass |
| EXC-13 | P2 | `retry: false` 전역(`queryClient.ts`) — 결정적 fixture 에는 맞다. backend seam 도입 시 read 전용 retry 정책 필요 | backend mode 에서 transient 5xx | N/A(현재) |
| EXC-14 | P1 | **N/A — 낙관적 업데이트가 이 화면에 없다.** 저장·삭제 모두 비관적이고 인라인 toggle/reorder 가 없다. 요구도 'create/delete 는 confirm+busy 로 pessimistic 유지' 를 권하며 이 화면이 그렇다 | — (표면 없음) | N/A |
| EXC-15 | P1 | **N/A — 파일 업로드가 이 화면에 없다**(`ConsultationBookingListPage.tsx:4` — '목록엔 이미지 열이 없다'). `ImageUploadField` import 0건 | — (표면 없음) | N/A |
| EXC-18 | P1 | **선택 scope 가 명시되지 않았고 안전장치가 없다.** `toggleAll` 이 넘겨받는 것은 **필터 적용 후 보이는 행 전부**(`CrudListShell:143-148`)인데 라벨은 '이 **페이지**의 상담 예약 전체 선택'(`CrudTable:125`)이다 — 페이지네이션이 없어 지금은 같은 뜻이지만 **문구와 실제가 이미 어긋나 있다**. Shift-range 없음. **건수 상한·강화 confirm·progress·cancel 없음** — 전체선택 후 삭제가 레이트리밋에 걸릴 수 있다(BE-039 §7.1) | 전체선택 → 일괄 삭제 confirm 에 count 는 있으나 progress/cancel 없으면 gap | gap |
| EXC-19 | P1 | 세션 만료 시 dirty 한 폼 입력이 사라진다 — 앱이 programmatic 이동을 하므로 FS-039-EL-031 가드가 발화하지 못한다. draft snapshot 없음 | dirty 상태에서 `?status=save:401` → 입력 보존 여부 | gap(상속) |
| EXC-20 | P1 | 충족. `useCrudForm.ts:189` 가 `referenceOf(cause)` 로 참조 코드를 잡고 `FormPageShell:167` → `FormServerError` 가 친근한 메시지와 함께 표시한다. `HttpError.reference` = `TDS-<base36 시각>-<난수>`(`http-error.ts:63-64`). raw stack 노출 없음 | `?status=save:500` → 복사 가능한 reference code 표시 | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 조회 응답 p95 | **≤ 400ms**(백엔드 연결 후) | 측정 불가 — 픽스처 | **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 인위 지연이며 성능 예산이 아니다.** 로딩 상태를 화면에서 볼 수 있게 넣은 상수일 뿐, 실제 서버 응답 목표와 무관하다. 혼동 금지 |
| 상세 조회 응답 p95 | ≤ 300ms | 측정 불가 — 픽스처 | **폼이 상세를 두 훅으로 요청하지만 쿼리 키가 같아 1회로 합쳐진다**(`useCrudForm` 내부 + `useCrudItem` — `crud.ts:142` `detailKey`). 왕복은 1건이다 |
| 등록·수정 응답 p95 | ≤ 500ms | 측정 불가 — 픽스처 | — |
| 삭제 응답 p95 | ≤ 300ms | 측정 불가 — 픽스처 | 일괄은 **항목당 1요청**(§BE-039 §7.1) — N건이면 N요청이 병렬로 나간다 |
| 첫 렌더(목록 진입 → 표 가시) | ≤ 1s | — | 스켈레톤 5행 고정 |
| **목록 재조회 횟수** | 진입당 1회 + `staleTime`(30초) 경과 후에만 + **쓰기 성공 시 무효화** | `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`(`shared/query/queryClient.ts`) | 쓰기 무효화는 정확히 필요한 키만(`crud.ts:179-181,198-201,217-219`) — 자기 변경은 즉시, 남의 변경은 30초 감내 |
| **응답 크기 · 메모리** | **상한 없음 — 리스크다** | 상담 예약 수에 **선형** | 서버 페이징이 없어(BE-039 §7.8 #9) 전량을 받는다. **다만 `ConsultBooking` 은 플랫하고 배열 필드가 없어**(신청서의 `history[]`·`fields[]` 와 대조) 건당 크기가 작고 예측 가능하다 |
| DOM 노드 | 상한 없음 | 행 수 × 10열에 선형 | Pagination·virtualization 없음(IA-04 · ERP-15). **10컬럼이라 행당 노드가 많다** |
| **일괄 삭제 요청 수** | **선택 건수 = 요청 수** | 상한 없음 | 전체선택이 보이는 행 전부를 잡는데(EXC-18) 상한·진행률·중단이 없다 — 레이트리밋(분당 60)이 실질 상한이 된다(BE-039 §7.1) |
| 번들 | 이 화면 고유 의존성 0 | — | DS + react-query + RHF + zod/mini + router. **zod/mini 를 쓴다**(full zod 아님) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 재시도 | **충족** (`CrudListShell:156-165`) |
| 폼 로드 실패(5xx) | Alert + 재시도 + 목록으로 | **충족** (`FormPageShell:124-140`) |
| 폼 로드 실패(404) | not-found 전용 문구 + 목록으로(재시도 없음) | **충족** (`FormPageShell:120,127-131`) |
| 재조회 중 | 이전 행 유지 + 가벼운 인디케이터 | **충족** (`useCrudList.tsx:71-72` · `CrudListShell:118-120`) |
| 저장 실패(일반) | 입력 보존 + 배너 + 참조 코드 | **충족** (`useCrudForm.ts:188-189`) |
| 저장 실패(422) | 필드 인라인 + 포커스 | **충족**(프론트) — 서버가 `violations` 를 줘야 발화 |
| **저장 충돌(409/412)** | 덮어쓰지 않고 입력 보존 + 다이얼로그 | **충족** (`useCrudForm.ts:160-173`) — **단 토큰이 없어 '먼저 변경' 은 감지되지 않는다**(아래 잔여) |
| 삭제 실패 | 다이얼로그 유지 + 재클릭 재시도 | **충족** (`useCrudList.tsx:109-113`) |
| 일괄 부분 실패 | 건수 보고 + 선택 유지 + 무효화 안 함 | **충족**. 실패분만 재시도는 **불가**(EXC-10) |
| 취소(abort) | 통지 없이 state 복원 | **충족** (`isAbort` + `mutation.reset()`) |
| 렌더 예외 | 셸 유지 + 복구 UI | **충족** — `AppShell.tsx:484-493` |
| 세션 만료 | 재인증 후 원래 경로 복귀 | 경로는 복귀하나 **dirty 입력 소실** |
| **다른 관리자 동시 수정** | 충돌 감지 + 해소 | **감지 안 됨** — 토큰 부재. 감지되면 UI 는 이미 있다 |
| 오프라인 | 배너 + write 게이트 | 없음(앱 전역) |
| 요청 무한 지연 | client timeout → 재시도 가능 실패 | 없음(앱 전역) |
| **같은 시각 중복 상담** | 충돌 경고·차단 | **판정 자체가 없다** — 소요시간 미정(BE-039 §7.3) |

> **EXC-04 잔여 (§2 에서 pass 로 판정한 것의 정직한 나머지)**: acceptanceCheck 두 항목은 관측 가능하나, 요구 첫 절('optimistic-concurrency token 을 **보낸다**')은 미충족이다 — `ConsultBooking` 에 `updatedAt`/`version` 이 없고 `If-Match` 는 회원 메모에만 있다. 지금 감지되는 것은 **'먼저 삭제됐다'**(id 부재 → 409, `crud.ts:71-73`)뿐이고 **'먼저 변경됐다'** 는 통과한다 — 두 관리자가 같은 예약의 다른 필드를 고치면 마지막 쓰기가 이긴다. **이 화면은 충돌 다이얼로그를 이미 갖고 있으므로 토큰만 추가하면 프론트 변경 없이 닫힌다**(BE-039 §7.6 · §7.8 #8) — 신청서(NFR-038)와 결정적으로 다른 점이다.

### 4.3 데이터 보존 · 감사

| 항목 | 요구 | 현재 상태 |
|---|---|---|
| **상담예약번호(`code`) 유일성** | 서버 채번 · 재사용 금지 | **클라이언트 채번이고 재사용된다** — '같은 희망날짜의 **현재** 건수 + 1'(`data-source.ts:66-72`)이라 그 날 상담을 지우고 새로 만들면 지워진 번호가 되살아난다. 동시 등록 시 같은 번호도 가능. **BE-039 §7.4 가 서버 채번을 요구한다** |
| `id` 유일성 | 서버 채번 | 모듈 전역 카운터(`let seq`) — 새로고침 시 리셋된다(픽스처 한정) |
| 담당자 참조 무결성 | 실재하는 담당자만 배정 | **검증 없음**(`z.string()`) + 표시 폴백이 '미배정' — **'배정 해제'와 '삭제된 담당자에게 배정됨' 이 구분되지 않는다**. BE-039 §7.7 |
| 상태 전이 감사 | 누가 언제 상태를 바꿨는가 | **기록이 없다** — 상담 예약에는 이력 필드가 없다(신청서의 `history[]` 와 대조). '노쇼' 로 바꾼 사람도 시각도 남지 않는다 |
| 삭제 | 확인 후 즉시·비가역 | undo·soft-delete 없음(FEEDBACK-05 는 confirm 으로 충족). **삭제된 상담의 기록이 남지 않는다** |
| **개인정보 보존·파기** | 보존 기간 만료 시 파기 | **미정** — 고객명·연락처·상담 메모를 담는다(BE-039 §7.8 #11) |
| 연락처 마스킹 | 정책 정의 | **미정 · 비대칭** — 픽스처는 마스킹 값(`010-7777-**88`)을 담는데 **이 화면은 그 필드를 직접 입력·수정한다**(placeholder '예: 010-1234-5678' — 원문 형식을 요구). 저장·조회 규칙이 없다(BE-039 §7.2) |

## 5. 미충족(gap) 요약 → 이관

**P0** (배치 실패 사유 — 8건)

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | STATE-04 | P0 | 단건 삭제 성공 경로에 `clear()` 가 없어(`useCrudList.tsx:104-108`) 삭제된 행의 선택이 남는다 — 유령 건수. **일괄 삭제 경로(`:144`)에는 있다**. F2 가 이 훅을 고쳤으나 이 경로는 그대로 | **공용 `useCrudList` — 10개 소비 화면 공통**. 한 줄이면 전부 닫힌다 | UI 기획 (FS-039 §7 #18) |
| 2 | FEEDBACK-02 | P0 | 비가역 종료 전이(취소·노쇼·상담완료)에 ConfirmDialog 게이트 없음. **삭제 축은 충족** | 이 화면 | UI 기획 (FS-039 §7 #2) |
| 3 | IA-02 | P0 | **폼 화면에 `<h1>` 이 둘이다**(AppHeader `:101` + `FormPageShell.tsx:160`). ⚠ **1.0 의 '상단이 브랜치 라벨 「예약/신청 관리」' 는 이제 틀렸다** — `findCoveringLeaf`(`nav-config.ts:269-279,297-299`)가 '상담 예약'을 정확히 준다. **남은 것은 이중 h1 하나** | 앱 전역(**`findNavLabel` 이 아니라 `FormPageShell`**) | 프론트 구현 · UI 기획 (FS-039 §7 #3) |
| 4 | IA-04 | P0 | Pagination 없음 — 전량 렌더. **템플릿의 다른 축은 `CrudListShell` 덕에 전부 충족** | 이 화면 + 계약(BE-039 §7.8 #9) | UI 기획 · 백엔드 명세 |
| 5 | EXC-03 | P0 | 쓰기 권한 게이팅 없음 — 등록·수정·삭제·일괄 삭제 컨트롤이 권한 무관 렌더 | 이 화면 (read 가드는 상속으로 충족) | UI 기획 (FS-039 §7 #9 · BE-039 §7.8 #6) |
| ~~—~~ | ~~COMP-10~~ | ~~P0~~ | **해소됨(F3b).** `useListState`(`ConsultationBookingListPage.tsx:78`)가 `useDebouncedSearch` 를 배선하고 입력창이 `{...list.searchInputProps}`(`:143`)로 IME 가드·조합 중 Enter 차단을 받는다 | — | **닫힘** |
| ~~—~~ | ~~A11Y-11~~ | ~~P0~~ | **해소됨(F3a) — 이 화면 코드 0줄 변경.** 1.0 이 제시한 두 선택지('DS `FormField` 또는 호출부 6곳') 중 **DS 쪽이 선택됐다**: `FormField.tsx:50-56` `withAriaRequired` 가 `required` 를 자식 컨트롤의 `aria-required` 로 런타임 주입한다. **이 폼의 required 7필드가 전부 `input`/`SelectField` 라 7/7 주입된다.** ⚠ **같은 수정을 받고도 NFR-037(예약 폼)은 gap 이다** — '이용 시간'이 래퍼 `<div>` 자식이라 제외된다. 이 폼은 희망 날짜/시각을 각자의 `FormField` 로 나눠 그 함정을 피했다 | — | **닫힘** |
| ~~—~~ | ~~IA-13~~ | ~~P0~~ | **해소됨(F3b).** 필터·키워드의 단일 원천이 URL 이다(`ConsultationBookingListPage.tsx:45,78-84,148`). **1.0 이 지목한 핵심 루프(목록→폼→Back)가 실제로 복구됐다** — `useListState` 가 `{ replace: true }` 로 목록 URL 을 늘 최신으로 유지하므로 Back 이 그 조건에 착지한다 | — | **닫힘** |
**P1 · P2** (표면이 실재하는 것만)

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 9 | — | — | **시간 겹침(더블부킹) 판정 부재** — quality-bar 의 어느 요구에도 걸리지 않지만 **이 화면의 가장 큰 도메인 결손**이다. 소요시간이 정의되지 않아 겹침 구간을 만들 수 없다(FS-039-EL-035) | 도메인 결정 선행 | **아키텍처 → 백엔드 명세(BE-039 §7.3) · 프론트 리팩터** (FS-039 §7 #1) |
| 10 | STATE-05 | P1 | 3분기는 충족하나 `createAction` 미전달 — 진짜 0건일 때 create CTA 없음 | 이 화면 | UI 기획 (FS-039 §7 #14) |
| 11 | COMP-01 | P1 | DS `<Button>` 은 쓰나 진행 상태를 `loading` prop 이 아니라 손으로 쓴 '저장 중…' 으로 표현 | 공용 `FormPageShell` | UI 기획 |
| 12 | COMP-06 | P2 | `CrudTable.tsx:144` `length: 5` 하드코딩(셀 수는 정확히 파생) | 공용 `CrudTable` | UI 기획 (FS-039 §7 #11) |
| 13 | COMP-07 | P2 | `CrudTable.tsx:179` `seq={index+1}` — **Pagination 부재로 현재 재현 불가능한 잠복 결함**. #6 을 닫을 때 함께 | 공용 `CrudTable` | UI 기획 (FS-039 §7 #11) |
| 14 | COMP-09 | P2 | 주제·고객명 truncation 없음 | 이 화면 | UI 기획 |
| 15 | COMP-12 | P2 | 카운터 없음(`FormField.counter` 미전달). over-limit 차단은 충족 | 이 화면 | UI 기획 (FS-039 §7 #16) |
| 16 | A11Y-13 | P1 | 폼 진입 시 첫 필드 포커스 없음. **검증 실패 포커스는 충족** | 공용 `useCrudForm` | UI 기획 |
| 17 | ERP-01 | P1 | 섹션 공용 맵(`_shared/booking.ts`)은 있으나 앱 전역 레지스트리가 없다 | 앱 전역 | UI 기획 |
| 18 | ERP-02 · ERP-04 · ERP-15 | P1 | density variant · sortable header · 대형 list 계약(10컬럼 가로 scroll) 없음 | 공용 `CrudTable` | UI 기획 |
| 19 | ERP-06 · ERP-08 | P1/P2 | '전체 N건' 의 N 이 필터 후 건수. 희망일시가 `shared/format` 미경유 원문 연결 | 이 화면 + 공용 셸 | UI 기획 (FS-039 §7 #10 · #12) |
| 20 | ERP-12 | P1 | 엑셀 export 없음 | 앱 전역 | UI 기획 |
| ~~—~~ | ~~ERP-13~~ | ~~P1~~ | **해소됨(통합) — 이 화면 코드 0줄 변경.** 조사 헬퍼가 `shared/format.ts:306,311,321` 로 승격됐고(이전엔 3곳 사본) `useCrudList.tsx:108,158` · `useCrudForm.ts:222` · `CrudTable.tsx:59-72` 가 소비한다. **앱 전역에서 사용자 대상 `을(를)` 리터럴 0건.** (`@tds/ui` 의 `Empty` 만 자기 사본을 갖는다 — 레이어 경계 상 **의도된 자족**) | — | **닫힘** |
| 22 | ERP-14 | P1 | 연락처 masked/validated input 없음 — 상담사가 실제로 거는 번호다 | 이 화면 + 앱 전역 primitive | UI 기획 (FS-039 §7 #6) |
| 23 | EXC-05 · EXC-11 · EXC-19 | P1 | client timeout · offline 감지 · 세션 만료 draft 보존 없음 | 앱 전역 | UI 기획 · 프론트 구현 (FS-039 §7 #21) |
| 24 | EXC-06 | P1 | 403·429 가 일반 배너로 뭉개진다. **409·422·404·5xx 분기는 충족** | 공용 `useCrudForm` | UI 기획 (BE-039 §7.8) |
| 25 | EXC-10 | P1 | 실패 id 미반환 — 'retry failed only' 불가, 전량 재실행 | 공용 `useCrudList` | UI 기획 (FS-039 §7 #15) |
| 26 | EXC-18 | P1 | 선택 scope 문구·실제 불일치('이 페이지의' vs 보이는 전부) · Shift-range 없음 · 건수 상한·progress·cancel 없음 | 공용 `useCrudList`/`CrudTable` | UI 기획 (FS-039 §7 #15) |
| 27 | COMP-11 · ERP-05 | — | **기능 부재** — 희망일 기간 필터가 없다(요구는 N/A). '이번 주 상담' 이 triage 의 기본 동작이라 기능 요청으로 남긴다. Pagination range/size selector 도 #6 에 종속 | 이 화면 | UI 기획 쪽 변경 요청 (FS-039 §7 #20) |
| 28 | — | — | 담당자 마스터가 모듈 상수라 서버 변경을 모른다(TOCTOU). `staffId` 검증이 `z.string()` 이라 없는 담당자도 통과하고, 표시 폴백이 '미배정' 이라 고아 배정이 보이지 않는다 | 이 화면 + 계약 | 프론트 리팩터 · 백엔드 명세 (FS-039 §7 #7 · #13 · BE-039 §7.7) |
| 29 | — | — | 상담예약번호 채번이 클라이언트이고 **삭제 후 재사용된다**. 상태 전이 감사 기록이 없다(누가 '노쇼' 로 바꿨는지 남지 않는다) | 계약 | 백엔드 명세 (FS-039 §7 #17 · BE-039 §7.4) |
| 30 | — | — | 희망 날짜가 과거를 막지 않는다(달력 실재만 검사). 영업시간·슬롯 단위 미강제 | 이 화면 + 정책 | 아키텍처 · UI 기획 (FS-039 §7 #8) |
| 31 | — | — | 개인정보 보존·파기 정책 미정. 연락처 마스킹 정책이 **입력(원문)과 픽스처(마스킹) 사이에서 비대칭** | 정책 | 아키텍처 · 백엔드 명세 (FS-039 §7 #22 · BE-039 §7.2) |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래는 판정을 재현·반증하려는 사람을 위한 실제 스위치이며, 코드에서 확인한 것만 적는다.

**실패 재현 (`shared/crud/dev.ts`)** — 이 화면의 어댑터는 `createCrudAdapter({ scope: 'reservation-consultations', … })`(`data-source.ts:74-75`)이므로 scope 문자열은 **`reservation-consultations`** 다.

| 스위치 | 걸리는 op | 이 화면의 결과 |
|---|---|---|
| `?fail=list` · `?fail=reservation-consultations:list` | `fetchAll` (`crud.ts:45`) | 목록 실패 배너 + 재시도(FS-039-EL-011) |
| `?fail=detail` · `?fail=reservation-consultations:detail` | `fetchOne` (`crud.ts:50`) | 폼 로드 실패 — **generic 분기**(재시도 + 목록으로). not-found 분기는 `?status=detail:404` 로 재현 |
| `?fail=save` · `?fail=reservation-consultations:save` | `create` (`crud.ts:61`) · `update` (`crud.ts:65`) | 저장 실패 배너(FS-039-EL-029). **`?fail=` 은 generic `Error` 라 참조 코드가 없다** — EXC-20 은 `?status=save:500` 으로 재현 |
| `?fail=delete` · `?fail=reservation-consultations:delete` | `remove` (`crud.ts:79`) | 삭제 다이얼로그 안 배너(FS-039-EL-012) / 일괄이면 부분 실패 건수(FS-039-EL-013) |
| `?fail=all` | 위 전부 | — |

**status 재현 (`dev.ts:24-71`, F2 도입)** — `?status=<op>:<code>` · `?status=<scope>:<op>:<code>` · `?status=all:<code>`. 재현 가능한 code: `400·401·403·404·409·412·422·429·500`(`dev.ts:27-37`).

| 스위치 | 이 화면에서 관측되는 것 | 이 문서의 어느 판정을 반증/확증하는가 |
|---|---|---|
| `?status=save:409` | **충돌 다이얼로그** + 입력 보존 + 이동·토스트 없음 | **EXC-04 pass 확증** |
| `?status=save:412` | 동일(`isConflict` 가 409·412 를 함께 본다) | EXC-04 pass |
| `?status=save:422` | **`violations` 가 있으면** 필드 인라인 + 포커스. `dev.ts` 는 violations 를 싣지 않으므로 **일반 배너로 떨어진다** — 필드 매핑은 실제 서버 또는 violations 를 싣는 fixture 로만 재현 가능 | EXC-07 pass(코드 대조) — **스위치로는 부분 재현** |
| `?status=save:500` | 배너 + **복사 가능한 참조 코드**(`TDS-…`) | **EXC-20 pass 확증** |
| `?status=save:403` | 일반 배너(권한 전용 문구 아님) | EXC-06 부분 gap 확증 |
| `?status=detail:404` | **'상담 예약을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + 목록으로(재시도 없음)** | **EXC-12 pass 확증** |
| `?status=detail:500` | '불러오지 못했습니다' + 다시 시도 + 목록으로 | EXC-12 pass(대조군) |
| `?status=save:401` | 앱 전역 인터셉터가 재인증 경로로 — **dirty 입력 소실** | EXC-02 종속 · EXC-19 gap |
| `?status=delete:409` | 다이얼로그 안 배너 + 재클릭 재시도 | FEEDBACK-02 삭제 축 pass |

**STATE-04 재현(스위치 없음)**: 행 체크 → 그 행을 행 액션으로 삭제 → 요약에 'N건 선택됨' 이 남는지 관측. **`?delay=` 는 이 화면에 없다** — `shared/crud/dev.ts` 에 지연 스위치가 존재하지 않고 `LATENCY_MS = 400` 고정 상수뿐이다(`?delay=` 는 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 은 `staleTime`(30초) 경과 후 재조회로 관측한다.

**그 밖**: lint/stylelint 0 warning(TOKEN-01) · `pnpm vitest run apps/admin/src/pages/reservations/consultations`(순수 규칙 회귀 — `consultations.test.ts`: 채널 라벨·타입가드·필터·검색·정렬 2 describe). **이 테스트는 순수 함수만 덮는다** — 화면 배선(STATE-04·A11Y-11 등)을 검증하지 않으며, **상태 전이(`canTransition`)를 이 화면의 테스트가 아니라 `_shared/booking.test.ts` 가 덮고, 화면 코드는 그 함수를 부르지 않는다**(BE-039 §7.5).

## 7. 자기 점검

- [x] P0 30건을 지정된 순서로 전수 판정했다 — 30행, 빈칸 0건
- [x] §2.1 산수 검산 — pass 11 + 종속 12 + N/A 2 + gap 5 = **30** ✓
- [x] **1.1 갱신: 판정 기준일을 `HEAD = 4b805ad` 로 올리고 P0 30 을 전부 코드로 재확인**했다. **뒤집힌 판정 3건**(COMP-10·A11Y-11·IA-13 gap → pass — 그중 **A11Y-11 은 이 화면 코드 0줄 변경**으로 `FormField` 의 `withAriaRequired` 덕에 닫혔다) · **사유가 바뀐 gap 2건**(IA-02·EXC-03) · **유지된 gap 3건**(STATE-04·FEEDBACK-02·IA-04). §3 에서 ERP-13 도 pass 로 뒤집혔다
- [x] **1.2 갱신(`a5c2639`): P0 30 을 전부 코드로 재확인했고 뒤집힌 판정은 없다.** MOTION-01/02 의 근거만 갱신(판정 `종속` 유지). **이 화면의 A11Y-11 `pass` 가 예약 폼의 수선 근거가 된 사실을 기록**했다(`ReservationFormPage.tsx:261-262` 가 이 화면을 선례로 명시). **`isRealDate` 를 낡은 잔재로 오판하지 않았다** — PR #28 이 10벌을 수렴시키며 **의도적으로 남긴** 1벌이며(`_shared/calendar.ts:62-66`, 왕복 정확 + TZ 논증) 이 화면 검증(`validation.ts:29`)이 그 호출부 2곳 중 하나다
- [x] **낙관적 상향을 하지 않았다** — **EXC-04 의 pass 는 1.0 과 같은 근거(acceptanceCheck 관측 가능)로 유지하되, 토큰 부재(둘 다 존재하는 동시 수정 = last-write-wins)를 잔여로 명시**했다. F3b 의 `WriteContext` 는 `idempotencyKey` 자리만 만들었고 `If-Match` 자리는 만들지 않았다
- [x] **A11Y-11 의 pass 를 같은 섹션 NFR-037 과 대조**했다 — 구 기준에서는 예약 폼이 '이용 시간'을 래퍼 `div` 로 감싸 주입에서 제외됐고 **구조가 판정을 갈랐다.** `a5c2639` 기준에서 **예약 폼이 이 화면의 구조를 채택해(PR #30 · `ReservationFormPage.tsx:265,277`) 그 gap 이 닫혔고, 코드 주석이 이 화면을 선례로 명시한다**(`:261-262`) — 대조 기록을 그 결말까지 갱신했다
- [x] 모든 `N/A` 에 '표면이 이 화면에 없다' 는 **구체적 사유**를 적었다(FEEDBACK-06 은 IA-06 무게 규칙에 따른 의도된 route 선택임을 함께)
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 적었다. **EXC-04 는 pass 이되 '토큰 부재' 잔여를 §4.2 에 정직하게 남겼다** — acceptanceCheck 는 충족하나 요구 첫 절은 미충족
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 적었다. **재현 불가능한 것은 그렇다고 적었다** — COMP-07(Pagination 부재로 잠복) · COMP-10(네트워크 축은 클라이언트 필터라 재현 불가) · EXC-07(dev 스위치가 violations 를 안 실어 부분 재현)
- [x] **축이 갈리는 요구는 갈라서 판정했다** — STATE-04(clamp N/A · 필터 해제 pass · 삭제 해제 gap) · FEEDBACK-02(삭제 pass · 전이 gap) · A11Y-11(짝 pass · required gap) · IA-04(Pagination 만 gap) · EXC-03(read pass · write gap)
- [x] quality-bar 의 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] §6 의 `?fail=` scope 를 **어댑터 코드에서 확인**했다(`data-source.ts:75` `scope: 'reservation-consultations'`). op 목록은 `crud.ts` 의 실제 호출부에서 확인. **`?delay=` 를 쓰지 않았고 이 화면에 없다는 사실을 적었다**
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 성능 예산이 아님을 §4.1 에 명시했다
- [x] §5 의 gap 이 FS-039 §7 · BE-039 §7.8 과 번호로 상호 참조된다. **quality-bar 에 걸리지 않는 도메인 결손(시간 겹침)도 §5 #9 에 남겼다**
- [x] E2E 를 실행하지 않았고 판정 근거가 코드 대조임을 §6 머리에 명시했다
