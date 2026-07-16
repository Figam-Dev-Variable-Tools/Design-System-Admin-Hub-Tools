---
id: NFR-032
title: "프로모션 비기능 명세"
functionalSpec: FS-032
backendSpec: BE-032
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-032. 프로모션 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-032 프로모션 (`/marketing/promotions` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다** — ID 로만 참조하고, '이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가' 만 적는다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. 요구의 정의는 quality-bar, 화면 동작은 FS-032, 서버 계약은 BE-032 |
| 함께 읽는 문서 | FS-032 (화면·예외) · BE-032 (엔드포인트·보안 판정) · **NFR-031 (이벤트)** — 같은 골격이라 판정이 거의 동일하다. **차이는 3건**: ① **A11Y-11 이 gap**(NFR-031 은 pass) ② **ERP-14 가 gap**(NFR-031 은 N/A — 금액 필드가 있다) ③ **ERP-07 이 gap**(NFR-031 은 표면 부재) |
| 갱신 규칙 | 코드가 바뀌면 이 문서의 '코드 근거' 파일:라인이 먼저 깨진다. 근거가 깨진 판정은 재검증 전까지 유효하지 않다 |
| 판정 기준일 | 2026-07-17 · 베이스 `3cd3078`(F2). **E2E 미실행 — 판정 근거는 전부 코드 대조다**(§6) |

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
| STATE-01 | STATE | 직접 | `useCrudList.tsx:71-72` 가 `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined` 로 가른다. `CrudListShell.tsx:138` 이 `loading={firstLoading}` 만 표에 넘기고, `crud.ts:151` 이 `placeholderData: (previous) => previous` 로 이전 행을 들고 있다. 4상태가 `CrudListShell.tsx:113`(error) → `CrudTable.tsx:143`(loading) → `:153`(empty) → 행 렌더로 배타 분기 | `/marketing/promotions` 진입 → 스켈레톤 5행만. 1건 삭제 후 재조회 → **표가 스켈레톤으로 돌아가지 않고** 이전 행 유지 + 요약만 '· 새로고침 중…'. `?fail=marketing-promotions:list` → 실패 배너만 | pass |
| STATE-02 | STATE | 직접 | `CrudListShell.tsx:156-165` — 조회 실패 시 표 대신 `<Alert tone="danger">` + '다시 시도'(`refetch`). 토스트 없음. 폼 로드 실패는 `FormPageShell.tsx:122-142` 가 같은 규약 | `?fail=marketing-promotions:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건. `?fail=marketing-promotions:detail` 로 `/:id/edit` 진입 → 폼 자리에 Alert | pass |
| STATE-04 | STATE | 직접 | 선택 해제 축: `PromotionListPage.tsx:78-80` 의 `useEffect(() => { clear(); }, [filter, keyword, clear])`. `CrudListShell.tsx:143-147` 이 `toggleAll` 에 **현재 보이는 행 id 만** 넘겨 숨겨진 행이 선택되지 않는다 | 3건 선택 → 상태 필터를 '종료'로 변경 → 선택 0건, SelectionBar 사라짐 | pass · **단 clamp 축은 성립하지 않는다** — 페이지네이션이 없어 '범위를 벗어난 page' 가 존재할 수 없다(IA-04 gap 에 종속). IA-04 해소 시 **재검증 필요** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전량이 `var(--tds-*)` 만 참조 — `PromotionListPage.tsx:28-60`(toolbar·filters·selectWrap·period·**num**·statusCell) · `PromotionFormPage.tsx:32-36`(row). 하드코딩 hex 0건, px 리터럴 0건. 폭은 `calc(var(--tds-space-6) * 5)`(`:45`) | `PromotionListPage.tsx`·`PromotionFormPage.tsx` 에 `#[0-9a-f]{3,6}` grep = 0, `[1-9]px` grep = 0, border 키워드 grep = 0 | pass · 토큰 **정의**와 DS 내부는 상속 |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 링 표면: 폼 입력 6종(`className="tds-ui-input tds-ui-focusable"` — `PromotionFormPage.tsx:149,187,216,237,269`) · 폼 '목록으로'(`FormPageShell.tsx:149`) · DS `Button`·`SearchField`·`SelectField`·`RowActions`·`ToggleSwitch` | DS 소유 판정. 이 화면에서는 '자체 outline 선언 0건' 만 확인 가능 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비 표면: 삭제·저장 **성공/실패 토스트** · `ToggleSwitch`(쿠폰 연동) transition | DS `Toast.css`·`tokens.json` motion.easing 소유 판정 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 floating/overlay 표면: `ConfirmDialog`(단건·일괄 삭제) · 충돌 다이얼로그 · Toast · 폼 `Card` | DS `Modal.css`·`Card.css`·`Toast` 소유 판정 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면의 display/heading 표면: 폼 `<h1>`(`FormPageShell.tsx:159` — `pageTitleStyle`) · AppHeader `<h1>`(`AppHeader.tsx:52-55,101`) · `CardTitle` | DS `pageTitleStyle`·`tokens.json` typography 소유 판정 | 종속 |
| COMP-10 | COMP | 직접 | **없다.** 검색 입력이 지역 `useState` 에 직결된다(`PromotionListPage.tsx:67,125-130`) — 공용 `useDebouncedSearch`(IME 조합 판정 + 디바운스 + Enter 차단 보유)를 **소비하지 않는다**. 소비자는 `members/MembersPage.tsx` 뿐이다. DS `SearchField.tsx` 자체에도 `isComposing`·composition 핸들러가 **0건** | 한글 '여름' 입력 → 자모 단계마다 `searchPromotions` 재계산 + **`useEffect` 가 `clear()` 를 호출해 행 선택 해제**(`PromotionListPage.tsx:78-80`). 완성 시 1회가 아니라 자모당 1회. **완화 사실**: 클라이언트 필터라 네트워크 경합은 오늘 발생하지 않는다(BE-032 §7.4 로 서버 검색이 도입되면 즉시 발생) | **gap** |
| FEEDBACK-02 | FEEDBACK | 직접 | 삭제·일괄 삭제가 `ConfirmDialog intent="delete"` 로 게이트(`useCrudList.tsx:151-178`). `busy={deleting}` 잠금. 실패 시 **닫지 않고** `error={deleteError}` 배너(`:111`) — 재클릭이 재시도. `closeDelete`(`:86-92`)·`closeBulk`(`:117-123`) 가 cancel/Esc/dim 에서 `abort()` + `reset()` + pending 초기화 | `?fail=marketing-promotions:delete` → 다이얼로그 유지 + danger 배너, 재클릭이 재시도. in-flight 중 Esc → 토스트 없이 닫히고 버튼 복원 | pass · 다이얼로그 tone/icon/포커스는 DS 상속 |
| FEEDBACK-04 | FEEDBACK | 직접 | `FormPageShell.tsx:113` 이 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 배선. `isDirty` 는 RHF(`useCrudForm.ts:254`). 문구는 화면 소유(`PromotionFormPage.tsx:29-30`). 저장 성공 후 `replace` 이동 시점엔 `saving` 이 참이라 가드가 꺼져 있다 | 할인율 수정 → ① 탭 닫기 ② 사이드바 링크 ③ 브라우저 Back — 3경로 모두 discard 확인. 저장 후 동일 이동은 통과 | pass · 3경로 구현은 `useUnsavedChangesDialog` 상속 |
| FEEDBACK-06 | FEEDBACK | **N/A** | **이 화면에 폼을 담은 modal 이 없다.** 유일한 modal 은 삭제 `ConfirmDialog`(입력 필드 0개)와 충돌 다이얼로그(같음). 편집은 전부 전용 라우트에서 일어나며 그 가드는 FEEDBACK-04 가 담당한다. IA-06(무게 규칙)에 정합 | — (표면 부재) | N/A |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 삭제 성공(`useCrudList.tsx:107`) · 일괄 삭제 성공(`:145`) · 저장 성공(`useCrudForm.ts:215`). `ToastProvider.tsx:165,168` 이 **항상 마운트된** polite·assertive region 을 둔다 | DS `ToastProvider` 소유 판정 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 삭제·일괄 삭제 `ConfirmDialog` · 충돌 다이얼로그. `Modal.tsx:6,60` 이 `describedBy` 로 본문 id 를 연결 | DS `Modal`·`ConfirmDialog` 소유 판정 | 종속 |
| **A11Y-11** | **A11Y** | **직접** | **이 폼의 6입력 중 5개는 계약을 지키고 1개가 어긴다.** ✓ 프로모션명 `PromotionFormPage.tsx:154-155` · 대상 `:189-190` · 할인값 `:219-223` · 쿠폰코드 `:274-277` — 전부 `aria-invalid` + `aria-describedby={errorIdOf(...)}` 짝. ✓ 기간 `DateRangeField.tsx:47` — `invalidProps` 가 두 속성을 **함께** 부여. ✓ 설명 `TextareaField.tsx:62-63` — 자체 배선. **✗ 최소 주문금액 `PromotionFormPage.tsx:233-242` — `aria-invalid` 도 `aria-describedby` 도 없다.** `FormField` 는 자동 배선하지 않으므로(`FormField.tsx` — `errorIdOf`/`hintIdOf` **노출만**) 호출부 책임인데 이 하나만 빠졌다. 남는 무효 표시는 `controlStyle(errors.minOrderAmount !== undefined)`(`:238`)의 **붉은 테두리뿐 = 색상 단독 표기**(WCAG 1.4.1). hint('0 이면 조건 없음')도 미연결 | 최소 주문금액에 `30,000`(콤마 포함) 입력 후 제출 → `<p id="promo-min-order-error" role="alert">최소 주문금액은 숫자만 입력할 수 있습니다.</p>` 가 **렌더되지만**, `<input id="promo-min-order">` 에 `aria-invalid` 없음 · `aria-describedby` 없음 → **스크린리더가 그 필드를 유효하다고 읽고 사유도 못 읽는다.** 나머지 5필드는 정상. (주: quality-bar 의 grep 지표 'aria-describedby 없는 aria-invalid = 0' 은 **반대 방향**이라 이 결함을 잡지 못한다 — 여기는 aria-invalid **자체가 없다**) | **gap** — **NFR-031(이벤트)은 이 항목이 pass 다** |
| A11Y-12 | A11Y | **N/A** | **이 화면에 좌측 필터 list item 토글이 없다.** 상태 필터가 `<select>`(`SelectField` — `PromotionListPage.tsx:132-145`)라 선택 상태를 네이티브 `<option selected>` 로 표현한다. `aria-pressed`·`aria-current` 를 쓸 표면 자체가 없다 | `PromotionListPage.tsx` 에 `aria-current` grep = 0, `aria-pressed` grep = 0 (둘 다 필요 없다) | N/A |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 삭제·일괄 삭제 `ConfirmDialog` · 충돌 다이얼로그 | DS `Modal` 소유 판정. (참고: `packages/ui/src` 에 `AnimatePresence`·`motion` import 0건 — **판정은 소유 문서의 몫**) | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 toast 표면: A11Y-01 과 동일한 3개 토스트 | DS `ToastProvider`·`Toast` 소유 판정 | 종속 |
| MOTION-03 | MOTION | 상속 | 이 화면의 motion 표면: `ToggleSwitch`(쿠폰 연동 — `PromotionFormPage.tsx:248-257`) · Toast · Modal. `ToggleSwitch.css:56` 이 `transition: transform var(--tds-motion-duration-fast)` 선언 | DS `ToggleSwitch.css`·전역 motion 게이트 소유 판정. (참고: `ToggleSwitch.css` 에 `prefers-reduced-motion` 블록 0건 — quality-bar 가 명시적으로 지목한 위반이나 **판정은 소유 문서의 몫**) | 종속 |
| IA-01 | IA | 직접 | `App.tsx:254-256` 의 3라우트가 전부 `APP_ROUTES` 에 있고 `:334-336` 이 이를 `RequireAuth > AppShell` 레이아웃 라우트(`:324-330`) **아래에** 렌더한다. 이 화면은 자체 frame 을 렌더하지 않는다 — 최상위가 `CrudListShell` 의 div(`CrudListShell.tsx:98`) · `FormPageShell` 의 div(`FormPageShell.tsx:146`) | `/marketing/promotions` 진입 → 사이드바·AppHeader·단일 `<main>` 안에서 렌더. 페이지 파일에 `<aside>`·`<header>`·`<nav>` grep = 0 | pass |
| IA-02 | IA | 직접 | **하위 라우트가 브랜치 라벨로 폴백한다.** `AppHeader.tsx:92` 가 `findNavLabel(pathname)` 만 쓴다. `nav-config.ts:253-264` 는 ① 정확히 일치하는 잎 ② 없으면 `startsWith(basePath)` 인 **브랜치 라벨**을 반환한다. `/marketing/promotions/new` 는 잎이 아니므로(잎은 `/marketing/promotions` 뿐 — `nav-config.ts:174-181`) **'마케팅 관리'** 가 나온다. 동시에 `FormPageShell.tsx:159` 가 두 번째 `<h1>` '프로모션 등록' 을 그린다. **F2 의 `AppHeader.tsx` 수정(+10/-5)은 TOKEN-05(`pageTitleStyle` 도입)일 뿐 라벨 해석 로직은 그대로다**(diff 확인 완료) | `/marketing/promotions/new` 진입 → AppHeader `<h1>` = '마케팅 관리'(≠ '프로모션 등록'). `document.querySelectorAll('h1').length === 2` | **gap** |
| IA-04 | IA | 직접 | 템플릿 4요소 충족: ① toolbar — 검색·필터 좌측(`PromotionListPage.tsx:124-147`), primary '프로모션 등록' 우상단(`:148-151`) ② count 요약(`CrudListShell.tsx:118-122`) ③ SelectionBar(`:125-133`) ④ table(`:135-154`). **⑤ Pagination 이 없다** — `CrudListShell` 에 페이지네이션이 없고 `visibleItems` **전량**이 `CrudTable` 로 간다. 프로모션 수 상한도 없다 | 프로모션을 30건 등록 → 30행이 **한 화면에 전부** 렌더되고 페이지 컨트롤이 없다 | **gap** |
| IA-05 | IA | 직접 | `App.tsx:255-256` — `/marketing/promotions/new` 와 `/:id/edit` 가 **동일한 `<PromotionFormPage />`** 로 해석된다. `useCrudForm.ts:73-74` 가 `isEdit = id !== undefined` 로 갈린다. 레이아웃 동일, 다른 것은 title·제출 라벨·prefill 뿐 | `/marketing/promotions/new` 와 `/marketing/promotions/pr-1/edit` 의 DOM 구조 동일 | pass |
| IA-13 | IA | 직접 | **없다.** 상태 필터·키워드가 컴포넌트 지역 `useState` 에만 있다(`PromotionListPage.tsx:66-67`). 공용 `useListState`(URL 직렬화 — `useListState.ts:3-19,22`)를 **소비하지 않는다**. 소비자는 `members/**` 뿐 | 상태 필터 '진행' + 키워드 '할인' 적용 → URL 이 `/marketing/promotions` 그대로. F5 → 전부 초기화. 행 클릭 후 Back → 필터 없는 초기 목록. URL 복사 → 필터 없는 목록 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면을 덮는 경계 2겹: ① `AppShell.tsx:484-493` 이 `<Outlet>` **바로 바깥**에서 잡아 사이드바를 살린다 ② `App.tsx:311-315` 루트 경계 | DS/셸 소유 판정 | 종속 |
| EXC-02 | EXC | 상속 | ① `App.tsx:324-330` 이 `RequireAuth` 를 `AppShell` **바깥**에 둔다 ② `queryClient.ts:38-40,46-47` 의 `QueryCache`/`MutationCache` `onError` 가 `isUnauthorized` → `notifySessionExpired()`. **이 화면의 모든 조회·쓰기가 이 두 캐시를 통과한다** | 셸/auth 소유 판정. (이 화면 고유: 세션 만료 시 편집 중 입력 미보존 — EXC-19 P1, §3) | 종속 |
| EXC-03 | EXC | 직접 | **읽기 게이팅은 충족, 쓰기 컨트롤 게이팅이 없다.** ① read — `AppShell.tsx:490-492` 의 `RequirePermission` 이 `<Outlet>` 을 감싸고 `route-resource.ts:36-46` 이 `/marketing/promotions/pr-1/edit` → 잎 `/marketing/promotions` 로 해석 → deep-link 도 `ForbiddenScreen` ✓ ② **write — `useRouteCan`/`useRouteWritePermissions`(`RequirePermission.tsx:27,45`)의 소비자가 `apps/admin/src` 전체에서 0건.** `remove` 권한 없는 역할도 '프로모션 등록'(`PromotionListPage.tsx:148`) · `RowActions`(`CrudTable.tsx:192-197`) · '선택 N건 삭제'(`CrudListShell.tsx:126-132`)를 **전부 보고 누를 수 있다**. **할인 정의는 금전 권한이라 이 gap 의 무게가 이벤트보다 크다**(BE-032 §2) | 쓰기 권한 없는 역할로 `/marketing/promotions` 진입 → 세 쓰기 컨트롤이 **그대로 보인다**. 누르면 서버 403 → 일반 실패 문구. read 권한 없는 deep-link 는 403 화면 ✓ | **gap** (읽기 축 pass · 쓰기 축 미충족) |
| EXC-04 | EXC | 직접 | **유령 저장은 막지만 동시성 토큰이 없다.** ① 충족 — `crud.ts:71-73` 이 없는 id 의 update 에 `HttpError(409)` 를 던지고, `useCrudForm.ts:158-172` 가 **입력을 보존한 채** 충돌 다이얼로그를 연다(성공 토스트·이동 없음). `http-error.ts:102` 가 409·412 를 같은 UX 로 수렴 ② **미충족 — `Promotion` 에 `updatedAt`/`version` 이 없어**(`types.ts:20-37`) `If-Match`/ETag 를 실을 수단 자체가 없다. 이 도메인에서 `If-Match` grep = 0 | ① 두 탭에서 같은 프로모션 수정 폼을 연다 → 탭 A 가 할인율 20%→10% 로 인하 저장 → 탭 B 가 대상만 바꿔 저장 → **탭 B 가 A 의 인하를 되돌려 20% 로 복구한다.** 경고 없음. PUT 이 전 필드 치환이라 손실은 레코드 전체. **그 프로모션이 진행 중이면 의도치 않은 할인이 고객에게 즉시 나간다** ② `?status=save:409` → 입력 보존 + 충돌 다이얼로그 ✓ | **gap** — '먼저 삭제'(409)만 감지, '먼저 수정'은 last-write-wins. **금전 손실이므로 NFR-031 보다 우선순위가 높다** → BE-032 §7.5 |
| EXC-08 | EXC | 직접 | ① **동기 제출 락** — `useCrudForm.ts:102` `submitLockRef`, `:195-197` 진입 즉시 검사·설정, `:207-209` `onSettled` 해제, `:239-241` `onInvalid` 해제. RHF 비동기 검증 사이의 두 번째 Enter 를 ref 가 **렌더를 기다리지 않고** 막는다 ② **disable** — `FormPageShell.tsx:188` ③ **멱등키** — `useCrudForm.ts:112-117` `idempotencyKeyRef` + `takeIdempotencyKey()` 가 **mutationFn 밖**에서 생성돼 재시도가 같은 키를 재사용, 성공 시 `:214` 폐기. `queryClient.ts` 가 mutation `retry: false` ④ 삭제 — `ConfirmDialog busy` | 등록 폼 Enter 연타 → 요청 정확히 1건. `?fail=marketing-promotions:save` 후 재클릭 → 같은 멱등키 | pass · **키가 서버로 전송되지는 않는다**(어댑터 시그니처에 자리 없음 — `crud.ts:19-20`). quality-bar 요구는 '키를 mutationFn 밖에서 생성' 이며 충족된다. 전송 배선은 BE-032 §7.10 |
| EXC-09 | EXC | 직접 | 단일 공유 predicate `isAbort` 를 전 경로가 쓴다: ① 저장 `useCrudForm.ts:155` ② 삭제 `useCrudList.tsx:110` ③ 언마운트 `useCrudForm.ts:92` ④ 다이얼로그 닫기 `useCrudList.tsx:87-89`(`abort()` + `reset()`) · `:118-121` ⑤ 캐시 무변경 `crud.ts:237-239` (`if (signal.aborted) return`) ⑥ **일괄 실패 count 에서 abort 제외** — `settleAll` + `useCrudList.tsx:135-136` | 삭제 확인 → 응답 전 Esc → 토스트 0건, 버튼 복원, 목록 무변경. 저장 중 '목록으로' → 토스트 0건 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 해당 요구 ID |
|---|---|---|
| `pass` | **10** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · IA-01 · IA-05 · EXC-08 · EXC-09 |
| `종속`(상속) | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **2** | FEEDBACK-06(폼 담은 modal 부재) · A11Y-12(필터 토글 부재 — select 사용) |
| `gap` | **7** | COMP-10 · **A11Y-11** · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-04 |
| **합계** | **30** | 10 + 11 + 2 + 7 = **30** ✓ (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30 ✓) |

> **P0 gap 7건은 quality-bar 기준 '배치 실패' 사유다.** 범위별: **5건이 앱 전역**(COMP-10 · IA-02 · IA-04 · IA-13 · EXC-03), **1건이 도메인**(EXC-04 — `types.ts` + 서버 계약), **1건이 이 화면 단독**(**A11Y-11** — `PromotionFormPage.tsx` 3줄 수정으로 해소된다).
>
> **NFR-031(이벤트)과의 차이는 A11Y-11 1건**이다. 이벤트 폼은 전 필드가 field-association 계약을 지키고, 프로모션 폼만 최소 주문금액 입력에서 어긴다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다. **NFR-031 §3 과 대부분 동일하며, 프로모션 고유 항목은 굵게 표시했다.**

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `crud.ts:151` `placeholderData` + `CrudListShell.tsx:118-121` 이 재조회 중 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다. `queryClient.ts:24` `staleTime: 30_000` | 삭제 후 재조회 → 이전 행 유지 | pass |
| STATE-05 | P1 | `PromotionListPage.tsx:162-167` 이 `empty={{ hasQuery, hasActiveFilters, onClearSearch, onResetFilters }}` 를 넘기고 `Empty` 가 3분기 + 복구 액션 + 조사(이/가) | 키워드 0매치 → '조건에 맞는 프로모션이 없습니다' + '검색 지우기'. 필터 0매치 → '필터 초기화' | pass · 생성 CTA 슬롯 미전달(경미) |
| STATE-06 | P1 | `crud.ts:179-181`(create) · `:198-201`(update — list + detail) · `:217-220`(delete) · `:237-239`(bulk — 전원 성공 시만) | 프로모션 수정 → 목록 복귀 시 새 할인값 즉시 반영 | pass |
| COMP-01 | P1 | 이 화면은 DS `<Button>` 만 쓴다(`PromotionListPage.tsx:148`). 공용 셸이 이탈: `FormPageShell.tsx:147-155` 의 '목록으로' 가 스타일 입힌 `<button>`, `:189` 가 `loading` prop 대신 수기 '저장 중…' | `FormPageShell.tsx` 에 `backLinkStyle` + 수기 문자열 존재 | gap (앱 전역 · 공용 셸) |
| COMP-02 | P1 | `CrudTable.tsx:124-130,173-179` 가 `SelectAllHeaderCell`·`RowSelectCell`·`SeqHeaderCell`·`SeqCell` 사용. raw checkbox 0건 | `CrudTable.tsx` 에 `type="checkbox"` grep = 0 | pass |
| COMP-03 | P1 | `PromotionListPage.tsx:125-130` 이 DS `<SearchField>` 사용 | `type="search"` grep = 0 | pass |
| COMP-04 | P1 | required 필드 전부 `FormField required` 로 `*`: 프로모션명(`:145`) · 대상(`:181`) · 상태(`:172`) · **할인 유형(`:197`)** · **할인값(`:206-210`)** · 쿠폰코드(`:260-265`). `DateRangeField required`(`:162`)도 `*`. **최소 주문금액은 의도적으로 required 가 아니다**(0 = 조건 없음) | 라벨 옆 `*` 렌더 확인 | pass |
| COMP-07 | P2 | `CrudTable.tsx:179` `<SeqCell seq={index + 1} />` — `startIndex` 없음 | **현재 재현 불가**(페이지네이션 부재). IA-04 해소 시 **즉시 위반** | gap (조건부 · IA-04 종속) |
| **COMP-11** | **P1** | **폼의 기간 입력**: DS `DateRangeField`(`PromotionFormPage.tsx:160-169`) 단일 컴포넌트, 키보드 조작 가능, 에러를 `role="alert"` 로 주입. **`start ≤ end` 가 실제로 강제된다** — `validation.ts:43-50` 의 `if (end < start)` → '종료일은 시작일보다 빠를 수 없습니다.', `promotions.test.ts:92-96` 이 고정. **quality-bar 가 우려한 '종료일<시작일 → silent empty' 는 이 화면에 없다**(재검증 완료). **목록의 기간 필터**: 표면 자체가 없다 | 폼에서 시작 2026-07-31 · 종료 2026-07-01 입력 후 제출 → **빈 테이블이 아니라** 인라인 검증 에러 + 두 칸 `aria-invalid` | **pass** (기간 입력 축) · **미충족 축**: ① preset 없음 ② URL 반영 없음(IA-13) ③ **목록에 기간 필터 자체가 없다** — appliesTo('기간 필터 리스트')가 성립하지 않아 그 축은 N/A |
| COMP-12 | P2 | 설명만 실시간 카운터(`TextareaField.tsx:52`). 프로모션명(80자)·대상(60자)에는 없다. 대상은 `maxLength` 속성도 없다. **할인값·최소 주문금액은 길이 제한 필드가 아니라 이 요구의 대상이 아니다**(범위 검증은 §2 EXC-04 축이 아니라 ERP-14) | 프로모션명 80자 근접 → 경고·카운트 없이 조용히 멈춘다 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 준수: write 성공=toast · read 실패=인라인 Alert · 다이얼로그 내부 실패=그 다이얼로그 배너 · 저장 실패=폼 카드 배너 | FS-032 §4.1 '실패 통지의 자리' 6분기 확인 | pass |
| FEEDBACK-03 | P1 | 삭제 성공 toast/실패 배너 · 일괄 성공 toast/부분 실패 배너 · 저장 성공 toast/실패 배너. no-op 없음 | `?fail=marketing-promotions:<op>` 각 op 이 가시 실패를 낸다 | pass |
| FEEDBACK-05 | P2 | 모든 delete 가 `ConfirmDialog` 게이트 + 비가역성 고지. undo window 없음. **진행 중 프로모션도 확인만 거치면 지워진다**(BE-032 §7.6) | 단일 미확인 클릭 delete 0건 | pass · 진행 중 삭제 차단은 BE-032 §7.6 로 이관 |
| A11Y-03 / A11Y-04 | P1 | 표면: 삭제·일괄 삭제 `ConfirmDialog`. 초기 포커스·busy 시 포커스 유지는 DS 소유 | DS 판정 | 종속 |
| A11Y-05 | P1 | **N/A** — 이 화면의 `SelectField` 3종(상태·할인 유형)은 error 를 받지 않는다(고정 enum + 기본값). `isInvalid` 표면이 없다 | — | N/A |
| A11Y-08 | P1 | 행 클릭(`CrudTable.tsx:172`)은 마우스 전용이지만 같은 행의 `RowActions` 연필(`:192-197`)이 **동일 목적지**(`onEdit`)로 가는 keyboard-focusable 등가물 | 행을 Tab → 연필 → Enter → 수정 폼 | pass |
| A11Y-13 | P1 | submit 실패 시 첫 error 포커스 ✓ — `useCrudForm.ts:253` `handleSubmit(onValid, onInvalid)` + RHF `shouldFocusError`. 422 도 `:184` `setFocus`. **폼 진입 시 첫 필드 자동 포커스는 없다**. **주의: 최소 주문금액이 첫 위반이면 포커스는 가지만 `aria-invalid` 가 없어 스크린리더가 무효를 알리지 않는다**(A11Y-11 gap) | 빈 required 제출 → `activeElement` = 프로모션명 ✓. `/new` 진입 직후 → `<body>` ✗ | 부분 gap |
| A11Y-16 | P1 | `CrudListShell.tsx:107-109` 가 **항상 마운트된** polite live region 소유 + 목록 상태 주입 | 필터로 0행 → '조건에 맞는 프로모션 결과가 없습니다.' announce | pass |
| IA-03 | P1 | breadcrumb 없음 | `/marketing/promotions/new` 에 trail 부재 | gap (앱 전역) |
| IA-07 | P1 | `FormPageShell.tsx:147-155` — '목록으로' + `ChevronLeftIcon`, 좌상단 | 일치 | pass |
| IA-08 | P1 | `FormPageShell.tsx:179-191` — 취소(secondary) 좌 · 저장(primary) 우, in-card | 일치 | pass |
| IA-14 | P1 | 반응형 계약 미선언. **이 화면은 폼 필드가 많아**(할인 3필드가 `rowStyle` auto-fit 그리드 — `PromotionFormPage.tsx:196-244`) 좁은 폭에서 더 취약하다 | 768px/375px 미검증 | gap (앱 전역) |
| ERP-01 | P1 | `_shared/campaign.ts:39-47` 의 `PHASE_TONE` 이 **마케팅 섹션 공용** 레지스트리(이벤트·프로모션 공유). **앱 전역 단일 소스가 아니다** | 다른 섹션의 '진행중' 과 tone 교차 확인 | gap (부분 — 섹션 스코프 존재, 전역 미통합) |
| ERP-04 | P1 | sortable header 없음 — `sortPromotions`(`types.ts:75-80`) 고정(시작일 내림차순). **할인액·할인율로 정렬할 수 없다** — 금액 열이 있는 화면에서 특히 아쉽다 | 헤더 클릭·`aria-sort` 0건 | gap |
| ERP-06 | P1 | microcopy 표준 문서 부재 | 표준 부재 | gap (앱 전역) |
| **ERP-07** | **P2** | **할인 컬럼이 `numeric: true`(우측 정렬 + `tabular-nums` — `PromotionListPage.tsx:97`)인데 `discountLabel`(`types.ts:47-49`)이 '원' 을 숫자에 붙여 반환한다** — `'5,000원'`. 우측 정렬 열에서 **단위가 마지막 자릿수를 따라다녀** 여러 행의 자릿수가 세로로 정렬되지 않는다. quality-bar 가 지목한 `formatWon` 패턴과 동일한 결함 | 정액 프로모션 '5,000원' · '500,000원' 을 같은 열에 두면 숫자 끝이 어긋난다. 정률 행('20%')과 섞이면 더 심하다 | **gap** |
| **ERP-08** | **P2** | ① **정률 표기가 raw `String(value)`** — `types.ts:48` `` type === 'rate' ? `${String(value)}%` : `${formatNumber(value)}원` ``. 정액은 `formatNumber` 를 쓰는데 정률만 `String()` 이다. 현재 정률 상한이 100 이라 천단위 구분이 필요 없어 **실질 무해하나**, quality-bar 의 '셀에서 raw `String()`/`toString()` 임의 호출 금지' 를 문자 그대로 어긴다 ② 기간 셀은 저장 문자열을 그대로 잇는다(`PromotionListPage.tsx:92`) — 값이 이미 표시 형식이라 무해 | 셀 렌더 코드에 `String(` grep > 0 | **gap** (경미 — 규약 이탈이나 현재 오출력 없음) |
| **ERP-09** | **P2** | **`PromotionListPage.tsx:68` 의 `const today = formatDate(new Date())` 가 브라우저 로컬 TZ 기준이다** — `format.ts:21` 의 `formatDate` 는 `getFullYear`/`getMonth`/`getDate` 로컬 getter. 이 `today` 가 `derivePhase(startAt, endAt, today)`(`campaign.ts:50-54`)의 비교 기준이 되어 **'기간상 XX' 배지를 결정**한다. 표시 TZ 정책 없음 | 종료일 2026-07-16 프로모션을 07-17 00:30 KST 에 본다 → 서울은 `today='2026-07-17'` → '기간상 종료' 배지, UTC 관리자는 `today='2026-07-16'` → 배지 없음. **같은 데이터에 다른 판정** | **gap** (F1 지적 재확인 — F2 에서도 그대로) |
| **ERP-13** | **P1** | 리터럴 조사 폴백형 출하: `useCrudForm.ts:215` `` `${entityLabel}을(를) ${verb}했습니다.` `` → **'프로모션을(를) 등록했습니다'**. ('프로모션' 은 받침이 있어 '을' 이 맞지만 **규칙이 아니라 우연**이다 — 같은 코드가 '이벤트' 에는 틀린다.) `useCrudList.tsx:107,157`(행 이름 삽입 — 임의 프로모션명이라 우연도 기대할 수 없다) · `FormPageShell.tsx:128-129` · `crud/validation.ts:14`(→ '프로모션명을(를) 입력하세요') 도 동일. `Empty.tsx:16-24` 에 주격(이/가) 헬퍼는 있으나 목적격 헬퍼가 `shared/format` 에 없다 | 사용자 대상 문자열의 `'을(를)'` grep > 0. `'봄 시즌 10% 특가' 을(를) 삭제했습니다.` | gap (앱 전역) |
| **ERP-14** | **P1** | **금액·마스킹 입력 primitive 가 없다.** 할인값(`PromotionFormPage.tsx:212-225`)·최소 주문금액(`:233-242`)이 `type="text" inputMode="numeric"` 생 입력이다. ① **실시간 천단위 구분 없음** ② **paste normalize 실패** — `digitsToNumber`(`:52-55`)가 콤마를 벗기지만 **검증이 먼저 돈다**: `validation.ts:55-62` 의 `INT_RE = /^\d+$/` 가 `'1,234,000'` 을 '할인값은 숫자만 입력할 수 있습니다.' 로 거절해 **`digitsToNumber` 에 도달하지 못한다** — 그 관용은 **죽은 코드**다. quality-bar 가 명시적으로 요구하는 "붙여넣은 '1,234,000원' 이 1234000 으로 parse" 가 **정확히 실패한다** ③ RHF/zod 에 canonical 숫자를 노출하는 것은 `toInput` 이 하지만 검증 통과 후뿐이다 | 최소 주문금액에 `30,000` 붙여넣기 → 저장 시도 → normalize 대신 '숫자만 입력할 수 있습니다.' 거절. **게다가 그 에러가 `aria-invalid` 없이 뜬다**(A11Y-11 gap) | **gap** — **NFR-031(이벤트)은 이 항목이 N/A 다**(금액 필드 부재) |
| ERP-15 | P1 | 대형 list 계약 없음 — cap·virtualization 없이 전량 렌더 | 1,000행 미검증 | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 앱 전체 0건 | never-resolving fixture → 무한 스피너 | gap (앱 전역) |
| EXC-06 | P1 | `HttpError` 가 status 를 싣고 `?status=<op>:<code>` 로 재현 가능하며 **404**(`useCrudForm.ts:141`) · **409/412**(`:160`) · **422**(`:176`) · **401**(`queryClient.ts:39`)은 각기 다른 surface. **403 · 429 · 400 은 전용 분기가 없어** 일반 실패 배너로 수렴 | `?status=list:403` → '불러오지 못했습니다'(권한 메시지 아님). `?status=save:429` → backoff 안내 없음 | 부분 gap |
| EXC-07 | P1 | `useCrudForm.ts:176-186` 이 422 `violations` 를 `setError(field)` + `setFocus(first)` 로 매핑. **배선은 완전하나 픽스처가 `violations` 를 만들지 않아**(`dev.ts:84` — 빈 배열) 현재 재현 경로가 없다. **BE-032 §7.3 의 할인 범위 422 가 이 경로로 온다** | 서버 연동 후 `error.fields:[{name:'discountValue'}]` 있는 422 → 그 필드 인라인 + 포커스 | pass (배선) · 재현 불가 |
| EXC-10 | P1 | `settleAll` 이 **실패 건수만** 반환(`crud.ts:235-236` · `useCrudList.tsx:135-141`). 실패 id 미반환 → 재시도가 전량 재발사 | 3건 중 1건 실패 → 'N건 중 M건' 배너 ✓, 어느 행인지 모름 ✗ | gap |
| EXC-11 | P1 | `navigator.onLine` 앱 전체 0건 | offline 토글 → 배너 없음 | gap (앱 전역) |
| EXC-12 | P1 | `useCrudForm.ts:138-143` 이 `isNotFound` 로 갈라 `FormPageShell.tsx:115-143` 이 **404 → '찾을 수 없습니다' + '목록으로'만** / **error → '다시 시도' + '목록으로'**. 무한 스피너 없음 | `/marketing/promotions/nope/edit` → not-found. `?status=detail:500` → retry + list | pass |
| EXC-14 | P1 | **N/A** — 이 화면에 optimistic write 가 없다. 인라인 토글·재정렬이 없고 저장·삭제는 confirm + busy 의 비관적 경로다 | — | N/A |
| EXC-15 | P1 | **N/A** — **이 화면에 파일 업로드·이미지 필드가 없다.** `ImageUploadField` import 0건, 목록에 이미지 열 없음(`PromotionListPage.tsx:4` 주석). '쿠폰 연동' 은 쿠폰**코드 문자열**이지 파일이 아니다. `data-source.ts` 에 업로드 심이 없는 것은 **정합한 상태**다 (BE-032 §7.8 — 후속 도입 시 `blob:`/`data:` 스킴 거절 계약) | — | N/A |
| EXC-18 | P1 | `toggleAll` 이 **보이는 행 id 만** 받아(`CrudListShell.tsx:143-147`) scope 가 'current view' 로 암묵 정의. cross-page 'all' 이 없어 대량 오클릭 위험은 낮다. **Shift-click range 없음 · 임계값 강화 confirm 없음 · progress/cancel 없음** | 50행 선택 → 체크박스 50회 클릭 | gap |
| EXC-19 | P1 | 세션 만료 시 dirty 폼 스냅샷 없음. 401 인터셉터가 프로그램적으로 이동하므로 FEEDBACK-04 가드가 발화 불가 | 프로모션 작성 중 401 → 입력 전량 소실 | gap (앱 전역) |
| EXC-20 | P1 | 저장 실패는 참조 코드 표시 ✓(`useCrudForm.ts:189` → `FormPageShell.tsx:167`). raw body/stack 미노출 ✓. **목록 조회 실패**(`CrudListShell.tsx:159`)·**삭제 실패**(`useCrudList.tsx:111`) 배너는 참조 코드를 버린다 | `?status=save:500` → 코드 ✓. `?status=list:500` → 코드 없음 ✗ | 부분 gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 |
|---|---|---|
| 목록 첫 렌더(스켈레톤 등장) | ≤ 100ms | `PromotionListPage` 는 `App.tsx:100` 에서 **정적 import**(lazy 아님) |
| 목록 데이터 표시(p95) | ≤ 600ms (서버 연동 후) | **측정 불가** — 픽스처가 `LATENCY_MS = 400` 을 무조건 기다린다 |
| 저장 왕복(p95) | ≤ 800ms | 픽스처 400ms + 목록 무효화 재조회 400ms ≈ **800ms**(응답 본문을 버리고 재조회 — BE-031 §7.10 상속) |
| 재조회 횟수 | 진입 1회 + 쓰기당 1~2회 | `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`(`queryClient.ts:24,64,74`). **검색·필터는 재조회를 유발하지 않는다** |
| 검색 입력당 연산 | — | **자모당 1회 전량 재필터** + `clear()` 리렌더 — 디바운스 없음(COMP-10 gap) |
| DOM 행 수 | 페이지당 ≤ 50 | **상한 없음** — 전량 렌더(IA-04 · ERP-15 gap) |
| 메모리 | — | 프로모션 전량이 react-query 캐시 + `useMemo` 파생 배열 2개로 상주 |
| 번들 | — | 이 화면 고유 의존성 없음 — 전부 공용 |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** 로딩 상태를 화면에서 볼 수 있게 하려고 픽스처에 넣은 인위적 대기다. 위 '현재' 열의 400ms·800ms 는 **실제 성능이 아니라 픽스처 상수**이며 백엔드 연결 시 사라진다.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 배너 + 재시도 | 충족(STATE-02) — 참조 코드 없음(EXC-20 부분 gap) |
| 상세 404 | not-found surface + '목록으로' | 충족(EXC-12) |
| 저장 중 5xx | 배너 + 참조 코드, 입력 보존 | 충족(EXC-20) |
| 저장 중 409(대상 삭제됨) | 충돌 다이얼로그, 입력 보존, 유령 저장 금지 | 충족(EXC-04 부분) |
| **동시 수정(A·B 동시 저장)** | 나중 저장이 409/412 로 거절 | **미충족 — 마지막 저장이 조용히 이긴다. 할인율이 걸려 있어 금전 손실**(EXC-04 gap · BE-032 §7.5) |
| **서버 측 할인 범위 위반**(음수·100% 초과) | 422 + 필드 인라인 에러 | **프론트 배선 충족**(EXC-07) · **서버 계약 미구현** — 현재는 `promotionSchema` 만이 막고 있어 어댑터 우회 호출은 무방비(BE-032 §7.3) |
| 네트워크 단절 | 오프라인 배너 + 쓰기 게이팅 | 미충족(EXC-11 gap) |
| 서버 무응답 | 클라이언트 타임아웃 후 재시도 안내 | **미충족 — 상한 없음**(EXC-05 gap) |
| 세션 만료(편집 중) | 재인증 후 입력 복원 | 부분 — 재인증 경로 충족(EXC-02), **입력 소실**(EXC-19 gap) |
| 화면 렌더 예외 | 셸 유지 + 복구 UI | 충족(EXC-01) |
| 일괄 삭제 중 일부 429 | 실패분 식별 + 그것만 재시도 | 미충족(EXC-10 gap · BE-032 §7.5) |
| 브라우저 새로고침 | 목록 조회 상태 복원 | **미충족 — 필터·검색어 소실**(IA-13 gap) |

### 4.3 데이터 보존 · 감사

| 항목 | 현재 상태 |
|---|---|
| **변경 이력** | **없다.** `Promotion` 에 `createdAt`·`updatedAt`·`createdBy`·`updatedBy` 가 없다(`types.ts:20-37`). **누가 언제 할인율을 20%에서 50%로 바꿨는지 추적할 수 없다** — 이벤트보다 강한 요구다(매출 직접 영향) |
| 삭제 | **하드 삭제.** soft-delete·undo 없음. **진행 중 프로모션도 지워진다**(BE-032 §7.6) |
| 감사 로그 | 서버 계약에 없다. **할인 관련 필드(`discountType`·`discountValue`·`minOrderAmount`·`phase`)의 변경은 이전/이후 값과 함께 남겨야 한다** — BE-032 §7.14 로 이관 |
| 주문 적용 이력 | 이 계약의 범위 밖. **주문에 적용된 할인의 스냅샷이 없으면** 프로모션 수정이 과거 주문의 할인을 소급 변경한다 — BE-032 §7.4 #6 |
| 픽스처 휘발성 | **새로고침하면 모든 변경이 사라진다** — 어댑터가 브라우저 메모리 배열이다. 백엔드 부재의 결과이며 결함이 아니다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | COMP-10 | **P0** | 검색 입력에 IME 조합·디바운스 처리 없음 — 공용 `useDebouncedSearch` 미소비 | 앱 전역 | A11 change_request |
| 2 | IA-02 | **P0** | 하위 라우트가 브랜치 라벨('마케팅 관리')로 폴백 + h1 2개 | 앱 전역(`AppHeader`·`findNavLabel`) | A11 change_request |
| 3 | IA-04 | **P0** | Pagination 부재 — 전량 렌더 | 앱 전역(`CrudListShell`) | A11 change_request |
| 4 | IA-13 | **P0** | 목록 조회 상태가 URL 에 없음 — 공용 `useListState` 미소비 | 앱 전역 | A11 change_request |
| 5 | EXC-03 | **P0** | 쓰기 컨트롤 권한 게이팅 없음 — `useRouteWritePermissions` 소비자 0건. **할인 정의는 금전 권한이라 무게가 크다** | 앱 전역 | A11 change_request |
| 6 | EXC-04 | **P0** | 낙관적 동시성 토큰 부재 — '먼저 수정' 미감지(last-write-wins). **할인율이 조용히 덮인다 = 금전 손실. 이벤트보다 우선순위 높음** | 이 화면 + 서버 계약 | A63 (**BE-032 §7.5**) · A41(`types.ts`·어댑터) |
| 7 | **A11Y-11** | **P0** | **`promo-min-order` 입력이 `aria-invalid`·`aria-describedby` 를 배선하지 않는다**(`PromotionFormPage.tsx:233-242`) — 같은 폼의 다른 5필드는 전부 지킨다. 위반 시 붉은 테두리만 남는 **색상 단독 표기**(WCAG 1.4.1). hint 도 미연결 | **이 화면 단독** — 3줄 수정으로 해소 | A11 change_request (**BE-032 §7.13**) |
| 8 | COMP-01 | P1 | 공용 폼 셸의 '목록으로' 가 DS Button 아님 + 수기 '저장 중…' | 앱 전역(`FormPageShell`) | A11 change_request |
| 9 | COMP-12 | P2 | 프로모션명·대상에 카운터 없음. 대상은 `maxLength` 속성도 없음 | 이 화면 | A11 change_request |
| 10 | IA-03 | P1 | breadcrumb 부재 | 앱 전역 | A11 change_request |
| 11 | IA-14 | P1 | 반응형 계약 미선언 — 할인 3필드 그리드가 좁은 폭에서 취약 | 앱 전역 | A11 change_request |
| 12 | ERP-01 | P1 | status→tone 이 마케팅 섹션 스코프 — 앱 전역 단일 레지스트리 아님 | 앱 전역 | A11 change_request |
| 13 | ERP-04 | P1 | sortable header 부재 — 할인액·할인율 정렬 불가 | 앱 전역(`CrudTable`) | A11 change_request |
| 14 | ERP-06 | P1 | microcopy 표준 문서 부재 | 앱 전역 | A11 change_request |
| 15 | **ERP-07** | P2 | **할인 컬럼의 '원' 이 숫자에 붙어 우측 정렬 자릿수가 어긋난다**(`types.ts:47-49` `discountLabel`) | 이 화면 | A11 change_request |
| 16 | **ERP-08** | P2 | **정률 표기가 raw `String(value)`** — 정액만 `formatNumber` 경유(`types.ts:48`). 현재 오출력은 없으나 규약 이탈 | 이 화면 | A11 change_request |
| 17 | **ERP-09** | P2 | **`derivePhase` 기준일이 브라우저 로컬 TZ**(`PromotionListPage.tsx:68` · `format.ts:21`) — 타임존이 다른 관리자가 다른 '기간상 XX' 배지를 본다 | 이 화면 + `shared/format` | A40 · A63 (**BE-032 이관 #17**) |
| 18 | **ERP-13** | P1 | 리터럴 '을(를)' 출하 — 목적격 조사 헬퍼 부재 | 앱 전역 | A11 change_request |
| 19 | **ERP-14** | P1 | **금액 입력에 마스킹·paste normalize 없음** — `digitsToNumber` 의 콤마 제거가 검증(`/^\d+$/`)에 막혀 **죽은 코드**다. 붙여넣은 '1,234,000' 이 normalize 되지 않고 거절된다. 실시간 천단위 구분도 없다 | 이 화면 + `shared/format`(마스킹 primitive) | A11 change_request |
| 20 | ERP-15 | P1 | 대형 list 렌더 계약 부재 | 앱 전역 | A11 change_request |
| 21 | EXC-05 | P1 | 클라이언트 타임아웃 상한 부재 | 앱 전역 | A11 · A63 (**BE-032 §2** 서버 상한 5초) |
| 22 | EXC-06 | P1 | 403·429·400 전용 surface 부재 | 이 화면 + 공용 셸 | A11 (**BE-032 §7.9 · §7.12**) |
| 23 | EXC-10 | P1 | 일괄 삭제가 실패 id 미반환 | 앱 전역 + 서버 계약 | A11 · A63 (**BE-032 §7.5**) |
| 24 | EXC-11 | P1 | 오프라인 감지 부재 | 앱 전역 | A11 change_request |
| 25 | EXC-18 | P1 | Shift-range·임계값 confirm·progress/cancel 부재 | 앱 전역 | A11 change_request |
| 26 | EXC-19 | P1 | 세션 만료 시 dirty 초안 소실 | 앱 전역 | A11 · A63 |
| 27 | EXC-20 | P1 | 조회·삭제 실패 배너에 참조 코드 미표시 | 앱 전역 | A11 (**BE-032 §7.11**) |
| 28 | A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스 없음 | 앱 전역(`FormPageShell`) | A11 change_request |
| 29 | COMP-07 | P2 | `SeqCell seq={index + 1}` — **IA-04(#3) 해소 시 즉시 위반** | 앱 전역(`CrudTable`) | A11 (#3 과 함께) |
| 30 | (BE) | — | **서버 측 할인 범위 검증 부재** — 현재 `promotionSchema` 만이 음수·0·100% 초과를 막는다. 어댑터 우회 호출은 무방비. quality-bar 축이 아니라 **BE-032 §7.3 의 보안 판정**이며, 프론트 gap 이 아니라 **서버 계약 미구현**이다 | 서버 | A63 (**BE-032 §7.3 · 최우선**) |

> **BE-032 §7 로 가는 것**: #6(§7.5 version/If-Match) · #7(§7.13 A11Y) · #17(이관 #17 TZ) · #21(§2 타임아웃) · #22(§7.9 · §7.12) · #23(§7.5 일괄) · #27(§7.11 traceId) · #30(§7.3 할인 범위).
>
> **FS-032 §7 미결 사항과의 대응**: FS #2→gap1 · FS #3→gap2 · FS #4→gap5 · FS #5→gap3/13/20 · FS #6→gap29 · FS #7→gap17 · FS #8→gap22 · FS #9→gap18 · FS #10→gap23/25 · FS #11→gap8 · FS #12→gap9 · FS #13→BE-032 §7.6 · FS #14→BE-032 §7.2 · FS #15→gap6 · FS #16→gap26 · FS #17→COMP-09 · FS #18→gap24 · FS #19→gap21 · FS #20→gap4 · FS #21→gap15 · FS #22→gap16 · FS #23→gap19 · FS #24→gap30 · **FS #25→gap7** · FS #26→BE-032 §7.7('적용하지 않음' 확정).

## 6. 측정 도구 · 재현 스위치

**E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래는 코드(`shared/crud/dev.ts` · `promotions/data-source.ts:57`)에서 확인한 실제 스위치만 적는다.

| 스위치 | 형식 | 이 화면의 실제 값 |
|---|---|---|
| 실패 재현 | `?fail=<op>` · `?fail=<scope>:<op>` · `?fail=all` | **scope = `marketing-promotions`** (`data-source.ts:57`). **op = `list`**(`fetchAll`) · **`detail`**(`fetchOne`) · **`save`**(`create` **와** `update` 공용 — `crud.ts:61,66`) · **`delete`**(`remove`). 예: `?fail=marketing-promotions:save` · `?fail=list` · `?fail=all` |
| status 재현 | `?status=<op>:<code>` · `?status=all:<code>` | 재현 가능 status: **400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500**(`dev.ts:27-37`). 예: `?status=save:409`(충돌 다이얼로그) · `?status=detail:404` · `?status=list:403` · `?status=save:500`(참조 코드) |
| 지연 재현 | — | **`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 없고 이 어댑터는 `LATENCY_MS = 400` 상수만 무조건 기다린다 |

| 판정 대상 | 재현 절차 |
|---|---|
| STATE-01 | 진입(스켈레톤만) → 삭제 후 재조회(이전 행 유지) → `?fail=marketing-promotions:list`(배너만) |
| STATE-02 | `?fail=marketing-promotions:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건 |
| EXC-04 | `?status=save:409` → 입력 보존 + 충돌 다이얼로그. **동시 수정 gap 은 스위치로 재현 불가** — 두 탭 수동 재현 필요 |
| EXC-08 | 등록 폼 Enter 연타 → 요청 1건. `?fail=marketing-promotions:save` 후 재클릭 → 같은 멱등키 |
| EXC-09 | 삭제 확인 → 응답 전 Esc → 토스트 0건 |
| EXC-12 | `/marketing/promotions/nope/edit` → not-found. `?status=detail:500` → retry + list |
| EXC-20 | `?status=save:500` → 참조 코드 ✓ / `?status=list:500` → 코드 없음 ✗ |
| COMP-11 | 폼에 시작 2026-07-31 · 종료 2026-07-01 → 제출 → 인라인 에러(빈 테이블 아님). `pnpm vitest promotions.test.ts` 가 고정 |
| **A11Y-11** | 최소 주문금액에 `30,000` 입력 → 제출 → 에러 `<p>` 는 뜨는데 `<input id="promo-min-order">` 에 `aria-invalid`·`aria-describedby` 없음. **다른 5필드와 DOM 을 비교하면 즉시 드러난다.** ⚠ **`?status=save:422` 로는 재현되지 않는다** — `dev.ts:84` 의 422 는 `violations` 가 **빈 배열**이라 `useCrudForm.ts:176` 의 `violations.length > 0` 조건에 걸려 인라인 매핑이 돌지 않는다. **클라이언트 검증(콤마 입력)으로 재현하라** |
| **ERP-14** | 최소 주문금액·할인값에 `1,234,000` 붙여넣기 → 저장 → normalize 대신 '숫자만 입력할 수 있습니다.' 거절. `digitsToNumber`(`PromotionFormPage.tsx:52-55`)가 실행되지 않음을 브레이크포인트로 확인 |
| **ERP-07** | 정액 프로모션 '5,000원'·'500,000원' 을 같은 열에 두고 우측 정렬 자릿수 확인 |
| COMP-10 · IA-13 · IA-04 · IA-02 · EXC-03 | **스위치 없음 — 코드 부재가 곧 판정이다.** grep: `useDebouncedSearch`·`useListState`·`useRouteWritePermissions` 의 이 화면 소비 0건, `CrudListShell` 에 Pagination 0건, `AppHeader.tsx:92` 가 `findNavLabel` 단독 |

| 단위 테스트 | 범위 |
|---|---|
| `promotions.test.ts` | 순수 규칙(할인 표기·필터·검색·정렬·변환) + `promotionSchema` 검증 6건 — **할인값 0 거절(`:78-80`) · 정률 100 초과 거절(`:81-85`) · 정액 100 초과 통과(`:86-91`)** · 기간 역전(`:92-96`) · 쿠폰코드 필수(`:97-101`) |
| `CrudTable.test.tsx` | 공용 프레임워크(이 화면이 소비하는 것) |

## 7. 자기 점검 (제출 전 확인)

- [x] quality-bar 요구 문구를 **복제하지 않았다** — ID 로만 참조하고 '이 화면에서 어떻게 / 무엇을 재현하면' 만 적었다
- [x] §2 P0 **30행 전수**. 순서는 quality-bar 지정 순서를 따랐다. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — FEEDBACK-06 · A11Y-12 · A11Y-05 · EXC-14 · EXC-15
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 달았다
- [x] 모든 `gap` 에 **재현 가능한 측정 기준**을 달았다. 재현 불가한 것(EXC-04 동시 수정 · A11Y-11 의 `?status` 경로)은 그 사실과 대안 재현법을 명시했다
- [x] §2.1 산수 검산 — 10 + 11 + 2 + 7 = **30** ✓ / 차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = **30** ✓
- [x] **NFR-031 과의 차이 3건을 명시했다** — A11Y-11(pass→**gap**) · ERP-14(N/A→**gap**) · ERP-07(표면 부재→**gap**). 나머지 판정은 골격 공유로 동일하다
- [x] §3 은 **표면이 실재하는 것만** 골랐다. 표면이 없는 P1/P2(ERP-10 print · ERP-11 배송 · ERP-12 export · MOTION-04/05 · IA-09/10/11/12 · TOKEN-06~13 · COMP-05/06/08 · A11Y-09/10/14/15 · EXC-13/16/17)는 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`marketing-promotions`)·op(`list`·`detail`·`save`·`delete`)를 **코드에서 확인**해 적었다. **`?delay=` 를 쓰지 않았고** 부재 사실을 명시했다. 'E2E 미실행 — 판정 근거는 코드 대조' 를 명시했다
- [x] F2(`3cd3078`) 기준으로 재검증했다 — v1 이 gap 으로 적었을 STATE-01 · EXC-08 · EXC-02 · EXC-12 · STATE-05 · EXC-04(유령 저장)는 **F2 에서 뒤집혀 pass** 다. v1 판정을 재사용하지 않았다
- [x] §5 가 FS-032 §7(26건 전수 대응) · BE-032 §7 과 상호 참조된다
