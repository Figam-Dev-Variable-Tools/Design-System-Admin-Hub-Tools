---
id: NFR-024
title: "포트폴리오 카테고리 관리 비기능 명세"
functionalSpec: FS-024
backendSpec: BE-024
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-024. 포트폴리오 카테고리 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-024 포트폴리오 카테고리 관리 (`/portfolio/categories` · 모달 · 삭제 다이얼로그) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다** — ID 로만 참조하고, '이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가'만 적는다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. P0 30건을 전수 판정하고, gap 을 재현 가능한 측정 기준과 함께 §5 로 이관한다 |
| 함께 읽는 문서 | FS-024(요소·예외) · BE-024(엔드포인트·보안 판정) · `specs/content/faq/{FS,BE}-010`(카테고리 모달 선례) |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 표의 **행 집합**이 바뀐다. 화면 코드가 바뀌면 **판정과 근거**가 바뀐다. 둘 다 이 문서에서 갱신한다 |

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
| STATE-01 | STATE | 직접 | **미충족.** `PortfolioCategoriesPage.tsx:163` 이 `isFetching: loading` 으로 직결한다. 행 자체는 `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`shared/crud/crud.ts:152`)가 지켜 주지만, 조회 요약(`:213`)과 빈 상태 문구(`:233`)가 `loading` 을 그대로 읽어 **데이터가 있는 재조회에서도 '불러오는 중…' 으로 되돌아간다** — first-load 와 refetching-with-data 를 구분하지 않는다 | 목록이 뜬 뒤 '카테고리 추가'로 1건 생성 → `useCrudCreate` 의 `onSuccess` 가 목록을 무효화(`crud.ts:180`) → 재조회 400ms 동안 **행은 남는데 요약이 '불러오는 중…'** 으로 바뀌는 것을 관측. 기대: 행이 있는 동안 요약은 `전체 N개` 를 유지하고 가벼운 refetch 인디케이터만 | **gap** |
| STATE-02 | STATE | 직접 | 목록 조회 실패 시 카드를 **인라인 danger Alert + '다시 시도'** 로 대체한다(`PortfolioCategoriesPage.tsx:221-229`, `onClick={() => void refetch()}`). 토스트를 쓰지 않고 빈 상태로 폴백하지도 않는다(빈 상태는 `:232` 의 별도 분기) | `/portfolio/categories?fail=portfolio-categories:list` → danger Alert '카테고리를 불러오지 못했습니다.' + '다시 시도'만 렌더, 에러 토스트 0건, 빈 상태 문구 미노출 | pass |
| STATE-04 | STATE | N/A | **표면 없음** — 이 화면에 페이지네이션·필터·키워드·행 선택이 전부 없다. 목록은 전량 렌더(`:235-248`)이고 `useListState`·`useRowSelection` 미소비. clamp 할 page 도, 해제할 selection 도 존재하지 않는다 | — | n-a |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 style object 가 semantic 토큰만 참조한다 — `PortfolioCategoriesPage.tsx:30-105`(`var(--tds-space-*)` · `var(--tds-radius-md)` · `var(--tds-color-surface-raised)` · `var(--tds-color-feedback-danger-text)`), `PortfolioCategoryFormModal.tsx:27-31`. hex·px 리터럴·border 키워드 0건 | `apps/admin/src/pages/portfolio/categories/**` 에 `#[0-9a-f]{3,6}` · `[1-9][0-9]*px` · `(outline\|border): (thin\|medium\|thick)` grep = 0. ESLint/stylelint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 focus ring 표면: 행 수정·삭제 아이콘 버튼의 `tds-ui-focusable` 클래스(`:129`, `:138`), DS `<Button>`(`:215`, `:225`), 모달 입력의 `tds-ui-focusable`(`PortfolioCategoryFormModal.tsx:134`). ring 두께·색은 DS 토큰이 결정한다 | DS/`app-shell.css` 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면이 띄우는 토스트(`:192`, `:204`)의 entrance easing 은 `Toast.css` 가 결정한다 | DS Toast 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | overlay/floating 표면: `Modal`(`Modal.css:36` `box-shadow: var(--tds-shadow-modal)`) · `ConfirmDialog`(Modal 상속) · `Card`(`:231`) · Toast. 이 화면은 raw box-shadow 를 선언하지 않는다 | DS 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면은 **자체 `<h1>` 을 갖지 않는다** — 페이지 제목은 AppHeader 가 `pageTitleStyle` 로 그린다(`AppHeader.tsx` `titleStyle` = `...pageTitleStyle`). display/heading tier 는 그 토큰이 결정 | DS·AppHeader 소유 문서의 판정을 따른다 | 종속 |
| COMP-10 | COMP | N/A | **표면 없음** — 이 화면에 text-search·filter 입력이 없다(목록 전량 렌더). 유일한 텍스트 입력은 모달의 카테고리 이름 필드(`PortfolioCategoryFormModal.tsx:131-148`)이며 이는 **폼 입력이지 검색/필터 입력이 아니다** — 키 입력마다 query 를 발행하지 않고 제출 시에만 서버로 간다. IME 조합 중 Enter 도 폼 제출이라 COMP-10 이 겨냥한 부분 query 문제가 성립하지 않는다 | — | n-a |
| FEEDBACK-02 | FEEDBACK | 직접 | 삭제는 `ConfirmDialog` intent `delete` 로 게이트(`:265-275`). busy 중 확인 버튼 `disabled`+`aria-busy`+'처리 중…'(DS `ConfirmDialog.tsx:151-155`). 실패 시 다이얼로그를 **열어둔 채** `error={deleteError}` danger 배너(`:196`, `:272`)를 보이고 재클릭이 곧 재시도. 취소/Esc/딤은 `closeDelete`(`:171-177`)가 in-flight 요청을 `abort()` 하고 `deleteCategory.reset()` 으로 pending 을 되돌린다 | ① `?fail=portfolio-categories:delete` 로 미사용 카테고리 삭제 → 다이얼로그가 열린 채 '삭제하지 못했습니다…' 배너, 재클릭이 재요청. ② 삭제 진행 중(400ms) 취소 클릭 → 실패 토스트 0건, 버튼 상태 복원 | pass |
| FEEDBACK-04 | FEEDBACK | N/A | **표면 없음** — 이 화면에 페이지 폼이 없다. 편집은 모달에서만 일어나고(IA-06 taxonomy=modal), 모달 이탈 가드는 FEEDBACK-06 이 소유한다. `useUnsavedChangesDialog`(unload·링크·popstate 3경로)는 `FormPageShell` 계열 페이지 폼용이며 이 화면에 라우트 폼이 없어 배선 대상이 없다. **단 잔여 위험이 있다** — 모달이 dirty 인 채 브라우저 뒤로가기/새로고침하면 두 요구 중 어느 것도 덮지 않는다(§4.2) | — | n-a |
| FEEDBACK-06 | FEEDBACK | 직접 | 모달 폼이 `useModalDirtyGuard(isDirty && !saving, onClose)`(`PortfolioCategoryFormModal.tsx:65`)를 쓰고, **`requestClose` 를 `Modal.onClose`(`:104`)와 취소 버튼(`:113`) 둘 다에** 넘겨 4경로(딤·Esc·×·취소)를 한 번에 덮는다. DS Modal 이 Esc·딤·× 를 `onClose` 한 곳으로 모으므로(`Modal.tsx:115-117`, `:151`, `:169`) 세 경로가 함께 덮인다. `discardDialog` 는 모달 **밖**에 렌더(`:154`)해 포커스 트랩을 피한다. pristine 모달은 `requestClose` 가 즉시 `onClose` 를 부른다(`useModalDirtyGuard.tsx:54-56`). quality-bar 가 `PortfolioCategoryFormModal` 을 appliesTo 로 명시한 바로 그 표면이다 | 모달에 이름을 입력한 뒤 ① Esc ② 딤 클릭 ③ × 클릭 ④ '취소' → 4경로 모두 discard 확인 등장. 손대지 않은 모달은 같은 4경로에서 프롬프트 없이 즉시 닫힘 | pass |
| A11Y-01 | A11Y | 상속 | 이 화면은 삭제 성공(`:192`)·저장 성공(`:204`)·취소(DS `ConfirmDialog` 어댑터 `shared/ui/ConfirmDialog.tsx:39`) 토스트를 띄운다. live region 은 `ToastProvider.tsx:165`(`role="status" aria-live="polite"`)·`:168`(`aria-live="assertive"`)이 **항상 마운트**된 채 제공한다 | ToastProvider 소유 문서의 판정을 따른다 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 삭제 `ConfirmDialog`(`:265-275`) — DS 가 message id 를 `Modal.describedBy` 로 연결한다(`ConfirmDialog.tsx:129-135`). 폼 `Modal`(`PortfolioCategoryFormModal.tsx:102`)은 본문이 폼 필드라 서술 문단이 없어 `describedBy` 를 넘기지 않는다(필드는 각자 label·error 로 연결 — A11Y-11) | DS Modal/ConfirmDialog 소유 문서의 판정을 따른다 | 종속 |
| A11Y-11 | A11Y | 직접 | **부분 미충족.** ① aria-invalid ↔ aria-describedby 페어링은 **충족** — `PortfolioCategoryFormModal.tsx:139-140` 이 `aria-invalid={invalid}` 와 `aria-describedby={invalid ? errorIdOf('portfolio-category-name') : undefined}` 를 함께 걸고, `FormField` 가 그 id 로 `role="alert"` 에러 `<p>` 를 렌더한다(`FormField.tsx:71-74`). 짝 없는 `aria-invalid` 0건. ② **required 노출이 없다** — `<input>`(`:131-148`)에 native `required` 도 `aria-required` 도 없다. `FormField` 의 `*` 마커는 `aria-hidden="true"`(`FormField.tsx:60-62`)라 AT 에 required 가 전달되지 않는다. 요구는 '**required는 native required/aria-required로 노출**'이고 acceptanceCheck 는 'required input이 aria-required 노출'을 명시한다 | ① 빈 이름으로 '추가' 제출 → RTL 로 `input.getAttribute('aria-describedby')` === `screen.getByRole('alert').id` assert → **통과**. ② 모달을 열고 `getByLabelText('카테고리 이름')` 의 `aria-required`/`required` 확인 → **둘 다 없음(현재 fail)**. 기대: `required` 속성 또는 `aria-required="true"` | **gap** |
| A11Y-12 | A11Y | N/A | **표면 없음** — 이 화면에 좌측 필터 목록·toggle 필터가 없다(`*Filter.tsx`/`*Panel.tsx` 부재, 필터 UI 자체가 없다). `aria-pressed`/`aria-current` 를 쓸 대상이 존재하지 않는다 | — | n-a |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 폼 `Modal`(`PortfolioCategoryFormModal.tsx:102`) · 삭제 `ConfirmDialog`(`:265`) · discard `ConfirmDialog`(`useModalDirtyGuard.tsx:67`). enter/exit transition 은 DS `Modal` organism 이 소유한다 — **현재 `Modal.css` 에 enter/exit 애니메이션이 없고 `AnimatePresence` 도 없다**(관측). 이 화면은 소비자일 뿐이라 판정은 DS 문서에 종속된다 | DS Modal 소유 문서의 판정을 따른다(미충족 시 앱 전역 — §5 참고) | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면이 띄우는 토스트(`:192`, `:204`)의 exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 소유 문서의 판정을 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | 이 화면의 motion 표면: Modal/ConfirmDialog/Toast transition + 버튼 hover transition. 전부 DS 소유이며 reduced-motion 게이트도 DS 가 결정한다. 이 화면은 자체 transition/animation 을 선언하지 않는다(style object 에 `transition` 0건). **ToggleSwitch 는 이 화면에 없다**(포트폴리오 카테고리 모달에 boolean 필드 없음) — MOTION-03 이 명시한 그 위반 표면은 여기 해당하지 않는다 | DS 소유 문서의 판정을 따른다 | 종속 |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 에 등록돼(`App.tsx:200`) `RequireAuth > AppShell` 레이아웃 라우트 아래 `<Outlet>` 으로 렌더된다(`App.tsx`, `AppShell.tsx:474-494`). **이 화면은 자체 frame 을 도입하지 않는다** — `PortfolioCategoriesPage.tsx:209-278` 이 sidebar·top bar 없이 콘텐츠(`pageStyle` = 세로 스택)만 렌더한다 | `/portfolio/categories` 렌더 시 sidebar+AppHeader+단일 `<main>` 이 정확히 1벌. 페이지가 그리는 `<header>`/`<nav>`/`<aside>` grep = 0 | pass |
| IA-02 | IA | 직접 | 제목은 **단일 메커니즘(AppHeader `findNavLabel(pathname)`)** 으로 해석된다(`AppHeader.tsx` `const title = findNavLabel(pathname)`). `/portfolio/categories` 는 nav 리프와 **정확히 일치**하므로(`nav-config.ts:139` `['카테고리', '/portfolio/categories']`) `findNavLabel` 의 exact 분기(`nav-config.ts:254-255`)가 '카테고리'를 반환한다 — 브랜치 라벨('포트폴리오 관리') 폴백(`:257-262`)에 **도달하지 않는다.** IA-02 가 겨냥한 '하위 라우트가 모호한 브랜치 라벨을 보이는' 문제는 **이 화면에 하위 라우트가 없어**(`App.tsx` 에 `/portfolio/categories` 1줄뿐) 성립하지 않는다 | `/portfolio/categories` 의 가시 primary title === '카테고리'. `App.tsx` 에서 `/portfolio/categories/` 로 시작하는 추가 라우트 grep = 0 | pass |
| IA-04 | IA | 직접 | list 템플릿을 따른다: **툴바 row**(`:211-219` — 좌측 조회 요약, 우상단 primary '카테고리 추가') → **결과 count 요약**(`:212-214` `전체 N개`) → 목록(`:235-248`). 검색·필터는 이 엔티티에 없어 툴바 좌측이 비고, SelectionBar 는 일괄 작업이 없어 없다. **Pagination**: page size 개념이 없어 전량 렌더하며 '한 page 초과 가능'이 성립하지 않는다 — 대신 BE-024 §7.5 가 카테고리 수 상한 100개를 계약으로 세워 무한 증가를 막는다 | 우상단 primary action 존재 + count 요약 존재를 렌더로 확인. 상한 미도입은 §3(IA 무게 규칙)이 아니라 BE-024 §7.5 로 이관됨 | pass |
| IA-05 | IA | N/A | **표면 없음** — 이 엔티티는 taxonomy 라 전용 form route(`/new` · `/:id/edit`)가 **의도적으로 없다**(IA-06 무게 규칙). IA-05 가 요구하는 'create·edit 를 `:id` 로 구분되는 하나의 route 쌍'은 route 가 없어 적용 대상이 아니다. **다만 그 정신(하나의 컴포넌트가 등록/수정 겸용)은 지켜진다** — `PortfolioCategoryFormModal` 하나가 `editing` 유무로 갈리고(`:45` `const isEdit = editing !== null`) 레이아웃 동일·제목과 prefill 만 다르다(`:103`, `:54`, `:117`) | — | n-a |
| IA-13 | IA | N/A | **표면 없음** — 직렬화할 list query state 가 없다. page·page-size·filter·keyword·sort 가 **전부 존재하지 않고**(목록 전량 렌더), `useListState`·`useSearchParams` 미소비. URL 이 복원할 view 상태가 `/portfolio/categories` 그 자체뿐이라 Back/새로고침/링크 공유가 이미 정확한 view 를 복원한다 | — | n-a |
| EXC-01 | EXC | 상속 | 이 라우트는 AppShell `<Outlet>` 바로 바깥의 `ErrorBoundary`(`AppShell.tsx:484-493`, `resetKey={pathname}`)와 앱 루트 boundary(`App.tsx`) 안에서 렌더된다. 이 화면이 던져도 sidebar 는 살고 다른 메뉴로 나갈 수 있다 | AppShell/ErrorBoundary 소유 문서의 판정을 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 두 층이 이 화면을 덮는다: ① 세션 없는 deep-link → `RequireAuth` 가 AppShell **바깥**에서 `/login?returnUrl=` 로 보낸다(`App.tsx`). ② mid-session 401 → 전역 쿼리 계층 인터셉터(`queryClient.ts` `QueryCache`/`MutationCache` 의 `onError` → `notifySessionExpired()`)가 조회·쓰기 **양쪽 모두** 잡는다 — 이 화면에 고유 401 처리가 없어도 덮인다 | RequireAuth/queryClient 소유 문서의 판정을 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **부분 미충족.** ① route-level read 게이팅은 **상속으로 충족** — `RequirePermission` 이 `<Outlet>` 을 감싸(`AppShell.tsx:490`) read 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 리소스는 `resourceIdForPath` 가 nav 리프(`/portfolio/categories`)에서 파생한다. ② **write-action 게이팅이 없다** — `useRouteWritePermissions()`(`RequirePermission.tsx:44-52`, `canCreate`/`canUpdate`/`canRemove` 제공)가 존재하지만 **앱 전체에서 소비자가 0** 이다(`apps/admin/src/pages` 전수 grep). 이 화면의 '카테고리 추가'(`:215`)·행 '수정'(`:127`)·행 '삭제'(`:136`)는 쓰기 권한과 무관하게 렌더·클릭된다. 요구는 '`can(resource, action)`가 false면 렌더 안 함(또는 disable)' | `remove` 권한이 꺼진 역할로 `/portfolio/categories` 진입 → 삭제 버튼이 **여전히 보이고 눌린다**(현재 fail). 기대: 버튼 미렌더/비활성. read 권한을 끄면 `ForbiddenScreen` → **통과**(①) | **gap** |
| EXC-04 | EXC | 직접 | **미충족.** 이 화면의 수정·삭제 write 는 `createStoreAdapter`(`shared/crud/crud.ts:107-137`)를 타는데 **존재 검사가 없다** — `update`(`:126-130`)·`remove`(`:131-135`)가 store 함수에 그대로 위임하고, `updateCategory`(`portfolio/_shared/store.ts:217-226`)는 `map` 이라 없는 id 를 조용히 지나가며, `removeCategory`(`:229-234`)는 없는 id 면 사용량 0 으로 차단을 통과하고 `filter` 가 아무것도 지우지 않은 채 성공을 반환한다 → **유령 저장/유령 삭제**('저장했습니다'·'삭제했습니다' 토스트가 뜨지만 아무 일도 없다). **같은 파일의 `createCrudAdapter` 는 이미 고쳐져 있다**(`:71-73`·`:82-84` 가 `some()` 확인 후 409) — `createStoreAdapter` 만 그 검사를 물려받지 못한 비대칭이다. 낙관적 동시성 토큰(If-Match/ETag)은 `PortfolioCategory` 에 `updatedAt`/`version` 이 없어(`_shared/store.ts:13-16`) 실을 자리조차 없다 | 탭 A·B 에서 같은 화면을 연다 → A 에서 미사용 카테고리를 삭제 → B 에서 **같은 카테고리를 수정 후 저장** → 현재: `'…' 카테고리를 저장했습니다.` 토스트 + 모달 닫힘(유령 저장). 기대: 404/409 → conflict 또는 '저장하지 못했습니다' 배너, 성공 토스트 없음. BE-024 §7.3 이 서버 계약(404 `CATEGORY_NOT_FOUND`)을 세웠다 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** 모달이 `useCrudCreate`/`useCrudUpdate` 저수준 훅을 직접 쓰는데(`PortfolioCategoryFormModal.tsx:57-58`) 이 훅들에는 **동기 제출 락도 멱등키도 없다**(`shared/crud/crud.ts:172-203` — `useMutation` 한 겹뿐). 모달의 유일한 방어는 `disabled={saving}`(`:116`, `saving = create.isPending \|\| update.isPending` `:59`)인 **렌더 시점 가드**다. RHF `handleSubmit` 이 zod resolver 를 await 하므로(`:108`) `isPending` 이 true 로 렌더되기 전 틈이 있고, 그 사이 두 번째 Enter 가 두 번째 요청을 만든다. **`useCrudForm` 은 정확히 이것을 갖고 있다** — `submitLockRef`(`useCrudForm.ts:102`)로 `onValid` 첫 줄에서 두 번째 제출을 멈추고(`:196-197`) 제출 시도 단위 멱등키를 `mutationFn` 밖에서 만든다(`:112-114`) — 이 모달은 그 폼 계층을 쓰지 않아 물려받지 못했다. 등록(`POST`)은 **비멱등**이라(BE-024 EP-02) 실제로 카테고리가 2건 생긴다 | 모달에 이름 입력 후 **Enter 를 400ms 안에 2회 연타**(또는 '추가' 더블클릭) → 현재: `addCategory` 가 2회 실행돼 동명 카테고리 2건. 기대: 요청 정확히 1건. (BE-024 §7.8: 서버의 이름 유니크 제약이 우연히 2건째를 409 로 막지만, 그때 사용자는 성공 대신 실패 배너를 본다 — 프론트 락이 여전히 필요) | **gap** |
| EXC-09 | EXC | 직접 | abort 를 단일 공유 predicate 로 non-failure 처리한다: 삭제 `onError` 가 `if (isAbort(cause)) return;`(`:194`)로 배너를 띄우지 않고, 모달 저장 `onError` 도 같다(`PortfolioCategoryFormModal.tsx:79`). 다이얼로그를 닫으면 `closeDelete`(`:171-177`)가 `abort()` → `deleteCategory.reset()` 으로 `isPending` 을 되돌린다. 성공 콜백도 `controller.signal.aborted` 를 확인해(`:190`) 늦게 온 성공이 토스트를 띄우지 못하게 막는다. 모달은 언마운트 시 `controllerRef.current?.abort()`(`:70`). 캐시는 성공 시에만 무효화된다(`crud.ts:180`, `:218`). 일괄 작업이 없어 '실패 count 에서 abort 제외'는 적용 대상이 없다 | 삭제 진행 중(400ms 창) '취소' 클릭 → 에러 토스트 0건 + 확인 버튼 상태 복원. 모달 저장 중 Esc → 에러 배너 0건, 목록 무변경 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | 8 | STATE-02 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-06 · IA-01 · IA-02 · IA-04 · EXC-09 |
| 종속(상속) | 11 | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | 6 | STATE-04 · COMP-10 · FEEDBACK-04 · A11Y-12 · IA-05 · IA-13 |
| **gap** | **5** | **STATE-01 · A11Y-11 · EXC-03 · EXC-04 · EXC-08** |
| **합계** | **30** | 8 + 11 + 6 + 5 = **30** ✓ |

> **P0 gap 5건 — quality-bar §How to use 기준 '배치 실패' 사유다.** 5건 중 4건(STATE-01·EXC-03·EXC-04·EXC-08)은 **이 화면 고유가 아니라 공용 계층의 미승격**이며(각각 `isFetching` 직결 패턴 · `useRouteWritePermissions` 미소비 · `createStoreAdapter` 존재 검사 누락 · `useCrudCreate` 락 누락), 앱 전역에 같은 모양으로 퍼져 있다 — §5 의 '범위' 열 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:152`)가 **행은 유지**한다. `staleTime` 30초가 refetch 시점을 지배(`queryClient.ts`). 다만 가벼운 refetch 인디케이터 대신 요약 문구가 통째로 '불러오는 중…' 이 된다(STATE-01 gap 과 같은 뿌리) | 재조회 중 행이 blank/재정렬되지 않음 → 통과. 인디케이터 품질은 STATE-01 로 이관 | 부분 pass |
| STATE-05 | P1 | 빈 상태가 **단일 문구**('등록된 카테고리가 없습니다.' `:233`)다. 검색·필터가 없어 3분기(truly-empty/search/filter) 중 **truly-empty 만 성립**하므로 분기 자체는 불필요하나, 전용 Empty 컴포넌트·일러스트·create CTA 가 없다(CTA 는 툴바에 상시 존재) | 전용 Empty 컴포넌트 도입 시 이 화면은 truly-empty variant 하나만 소비 | 부분 pass |
| STATE-06 | P1 | write 성공 시 목록 키만 정확히 무효화(`crud.ts:180`·`:199`·`:218` → `['portfolio-categories','list']`). 수정은 상세 키도 무효화하나 소비자가 없다(BE-024 §7.6). 자기 변경은 즉시 보인다 | 카테고리 추가 → 목록에 즉시 반영. 무관한 쿼리 무효화 0건 | pass |
| COMP-01 | P1 | **이탈.** 행 수정·삭제가 raw `<button>` + `buttonStyle('ghost')` + `tds-ui-btn-ghost` 로 조립됐다(`:127-148`). 요구는 pages 에서 `buttonStyle(`·`tds-ui-btn-` grep = 0. 툴바 '카테고리 추가'(`:215`)와 실패 배너 '다시 시도'(`:225`), 모달 footer(`:113`, `:116`)는 DS `<Button>` 사용 | `apps/admin/src/pages/portfolio/categories/` 에서 `buttonStyle(` grep → `:96`, `:130`, `:139`, `:140` 검출 | gap |
| COMP-04 | P1 | 모달의 required 필드가 `FormField required`(`PortfolioCategoryFormModal.tsx:125-130`)로 `*` 마커를 렌더한다 | 라벨 '카테고리 이름' 옆 `*` 존재 | pass |
| COMP-12 | P2 | 이름 입력에 실시간 글자 수 카운터가 없다. `maxLength={CATEGORY_NAME_MAX}`(`:136`)가 40자에서 **조용히 입력을 멈춘다** — 예고 없음. `FormField` 는 `counter` prop 을 제공하나 넘기지 않는다 | 40자 도달 시 카운터·경고 없음 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 준수: write 성공 → 토스트(`:192`, `:204`) / read 실패 → 인라인 Alert(`:221`) / 다이얼로그 내부 실패 → 그 다이얼로그 배너(`:272`) / 모달 내부 실패 → 모달 배너(`PortfolioCategoryFormModal.tsx:123`). 페이지가 임의 배너 state 를 갖지 않는다 | 각 실패 경로를 `?fail=` 로 구동해 표면 위치 확인 | pass |
| FEEDBACK-03 | P1 | 모든 mutation 이 성공·실패 양 경로 피드백을 갖는다 — 삭제(성공 토스트 `:192` / 실패 배너 `:196`), 저장(성공 토스트 `:204` / 실패 배너 `PortfolioCategoryFormModal.tsx:80`). no-op 없음 | `?fail=portfolio-categories:save` · `:delete` 각각 가시 실패 | pass |
| FEEDBACK-05 | P2 | 삭제가 `ConfirmDialog` + 비가역 고지('이 작업은 되돌릴 수 없습니다.' `:269`)로 게이트된다. undo window 는 없다 | 단일 미확인 클릭 삭제 0건 | pass |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 가 결정(delete/discard intent → Cancel) | DS 소유 | 종속 |
| A11Y-13 | P1 | 모달 진입 시 첫 편집 필드 포커스(`initialFocusRef={nameRef}` `:110`), 제출 검증 실패 시 그 필드로 포커스 복귀(`handleSubmit(onValid, () => nameRef.current?.focus())` `:108`) | 모달 open → `activeElement` === 이름 입력. 빈 값 제출 → 같은 입력으로 포커스 | pass |
| IA-03 | P1 | breadcrumb 없음 — AppHeader 가 '카테고리' 한 단어만 보인다. **`/products/categories` 도 같은 라벨('카테고리')** 이라 제목만으로 두 화면이 구분되지 않는다(`nav-config.ts:139` vs `:152`). 섹션 trail('포트폴리오 관리 > 카테고리')이 있으면 해소된다 | 두 화면의 AppHeader `<h1>` 이 동일 문자열 | gap |
| IA-06 | P1 | **무게 규칙 부합.** 카테고리는 필드 1개(`label`)짜리 짧은 taxonomy 라 inline-list + Modal 로 편집한다(`:257-263`) — 전용 form route 없음(`App.tsx:200` 이 유일). 반대로 rich 엔티티인 포트폴리오 항목은 route 폼을 쓴다(`App.tsx:198-199` `/portfolio/items/new` · `/:id/edit`). 혼용 없음 — quality-bar 가 예시로 든 'products/portfolio/support categories(modal)' 그대로 | `App.tsx` 에 `/portfolio/categories/**` 하위 라우트 grep = 0 + 모달 컴포넌트 존재 | pass |
| IA-14 | P1 | 반응형 선언 없음(앱 전역). 행이 `flexWrap` 없이 `justifyContent: space-between`(`:60-71`)이라 좁은 폭에서 라벨과 액션이 압축된다. ghost 아이콘 버튼의 touch-target 미검증 | 375px 에서 행 레이아웃·아이콘 타깃 크기 확인 | gap(앱 전역) |
| ERP-06 | P1 | 문구가 대체로 템플릿을 따르나 **사용량 배지 문구가 화면 간 갈린다** — 이 화면은 '미사용'(`types.ts:15`), 문의 유형 화면은 '사용 안 함'(`support/_shared/domain.ts:43`). 같은 의미의 두 표현 | 두 화면의 0-usage 배지 문자열 비교 | gap |
| ERP-13 | P1 | **조사(助詞) 파손.** 삭제 차단 버튼의 접근 이름이 `${category.label} — ${usage}라 삭제할 수 없습니다`(`:141`)라 '3개 사용 중**라** 삭제할 수 없습니다'가 된다(→ '사용 중**이라**'). `shared/format` 에 조사 헬퍼가 없다. FAQ 카테고리 모달(FS-010-EL-016.2)이 같은 문구를 복제해 같은 파손을 갖는다 | 사용 중 카테고리의 삭제 버튼 `aria-label` 읽기 | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 0건(앱 전역). `wait(LATENCY_MS, signal)`(`crud.ts:112` 등)에 상한 없음 — 실 백엔드 지연 시 무한 spin | never-resolving fixture 로 ceiling 부재 확인 | gap(앱 전역) |
| EXC-06 | P1 | 어댑터가 `HttpError`(status 보유)를 던질 수 있고 `dev.ts` `?status=` 가 재현하나, **이 화면은 status 로 분기하지 않는다** — 조회 실패는 문구 1개(`:224`), 저장 실패도 1개(`PortfolioCategoryFormModal.tsx:80`), 삭제 실패도 1개(`:196`). 403/404/409/422/429/500 이 모두 같아 보인다 | `?status=save:409` vs `?status=save:500` → 동일 문구 | gap |
| EXC-07 | P1 | 서버 422 field error 를 RHF `setError` 로 매핑하는 경로 없음 — 서버 실패는 전부 모달 상단 generic 배너로 간다 | `?status=save:422` → 필드 인라인 에러 없음 | gap |
| EXC-10 | P1 | N/A — 일괄 작업이 없다(선택·bulk 미존재) | — | n-a |
| EXC-11 | P1 | `navigator.onLine` 0건(앱 전역) — 오프라인 배너·write 게이팅 없음 | offline 토글 시 배너 없음 | gap(앱 전역) |
| EXC-12 | P1 | N/A — detail/edit **route** 가 없다(모달 편집). 404 vs generic 구분이 걸릴 라우트 표면이 없다. 단 BE-024 §7.3 이 서버 404 계약을 세웠고 그 프론트 표현은 EXC-06 gap 에 포함된다 | — | n-a |
| EXC-14 | P1 | N/A — 낙관적 업데이트를 쓰지 않는다(등록·수정·삭제 전부 pessimistic + 무효화). 요구가 '`create/delete` 는 confirm+busy 로 pessimistic 유지'라 한 것과 일치 | — | n-a |
| EXC-15 | P1 | N/A — 파일 업로드 표면 없음 | — | n-a |
| EXC-18 | P1 | N/A — selection·bulk 표면 없음 | — | n-a |
| EXC-20 | P1 | 5xx 에 복사 가능한 reference code 를 보이지 않는다 — 모든 실패가 '…잠시 후 다시 시도해 주세요.' 로 수렴한다. `ErrorBoundary` 는 `reference` 를 제공하나(`AppShell.tsx:486`) 이 화면의 조회/쓰기 실패 경로는 통과하지 않는다. raw stack/서버 body 노출은 없음(후자는 준수) | `?status=list:500` → 참조 코드 미표시 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 |
|---|---|---|
| 목록 조회 응답 p95 | 400ms (백엔드 연결 후 계약값 — BE-024 EP-01 레이트리밋 분당 120회 전제) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 픽스처에 심은 값이다. 실제 응답 시간과 무관하다 |
| 첫 렌더(진입 → 목록 가시) | 지연 상수 + 렌더 < 600ms | 픽스처 400ms + 목록 렌더. 카테고리 수가 작아 렌더 비용은 무시 가능 |
| 재조회 횟수 | 진입 1회 + 쓰기 성공마다 1회. `staleTime` 30초 내 재진입은 0회 | 준수 — `queryClient.ts` `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false` |
| 메모리 | 카테고리 전량 상주(상한 100개 — BE-024 §7.5). 행당 3필드라 무시 가능 | 상한 미구현(계약만 존재) |
| 번들 | 이 화면 전용 코드는 페이지 1 + 모달 1 + 어댑터/타입/검증. DS·CRUD 프레임워크는 공유 | 전용 코드가 작다. 이 화면은 라우트 분할 대상이 아니다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 수동 재시도 | **충족** — `:221-229`. 자동 재시도 없음(`retry: false`)이 의도 |
| 저장·삭제 중 화면 이탈 | in-flight abort · false 실패 없음 | **충족** — 모달 언마운트 abort(`:70`), 다이얼로그 취소 abort(`:172`), `isAbort` 필터(`:79`, `:194`) |
| 세션 만료(mid-session 401) | 재인증 경로 + 원래 위치 복원 | **상속 충족** — 전역 인터셉터(`queryClient.ts`). 단 **모달에 입력 중이면 입력이 사라진다**(EXC-19 P1 — draft 스냅샷 없음) |
| **모달 dirty 상태에서 브라우저 뒤로가기·새로고침** | 입력 손실 경고 | **미충족 — 어느 요구도 덮지 않는다.** FEEDBACK-06 은 모달 4경로(딤·Esc·×·취소)만, FEEDBACK-04 는 페이지 폼(unload·링크·popstate)만 정의한다. 이 화면은 후자가 없어 모달이 열린 채 뒤로가기하면 **조용히 사라진다** — quality-bar 의 사각지대. §5 #6 |
| 이미 삭제된 카테고리 조작 | 대상 부재 알림 | **미충족** — 유령 저장/삭제(EXC-04 gap · BE-024 §7.3) |
| 다른 관리자의 동시 편집 | 마지막 쓰기 승리 + 대상 부재는 알림 | 마지막 쓰기 승리는 의도(BE-024 §7.3 — 필드가 `label` 하나라 병합할 것이 없다). 대상 부재 알림이 빠진 것이 결함 |
| 오프라인 | 배너 + write 게이팅 | **미충족**(EXC-11 P1 · 앱 전역) |

### 4.3 데이터 보존 · 감사

| 축 | 상태 |
|---|---|
| 삭제 복구 | 없다 — 하드 삭제이고 undo window 도 없다(FEEDBACK-05 P2 는 confirm 으로 충족). **사용 중 차단(BE-024 §7.1)이 실질적 보호 장치**다: 참조가 있는 카테고리는 애초에 지워지지 않으므로, 지울 수 있는 것은 항상 미사용 카테고리뿐이고 손실 규모가 '이름 1개'로 제한된다 |
| 감사 로그 | 없다 — 누가 언제 카테고리를 추가·수정·삭제했는지 남지 않는다. 엔티티에 `updatedAt`/`createdBy` 필드조차 없다(`_shared/store.ts:13-16`). 백엔드 설계 시 판단 필요 — BE-024 §7.9 로는 이관하지 않았다(요구 출처 없음) |
| 라벨 변경 이력 | 없다 — 라벨을 바꾸면 참조 항목의 비정규화 라벨이 덮이고(`updateCategory`) 이전 값은 사라진다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | STATE-01 | **P0** | `PortfolioCategoriesPage.tsx:163` 이 `isFetching` 을 loading 으로 직결 — 재조회가 first-load 로 표시된다(요약 문구가 '불러오는 중…' 으로 회귀). 같은 패턴이 `support/categories/CategoriesPage.tsx:164` · `support/faq/CustomerFaqPage.tsx:57` · `support/tickets/TicketListPage.tsx:111` · `company/logo-list/LogoListPage.tsx:103` · `reservations/applications/ApplicationListPage.tsx:99` 에 동일 존재 | **앱 전역**(`useCrudList` 를 우회하고 `useCrudListQuery` 를 직접 쓰는 화면 6개) | A11 change_request |
| 2 | A11Y-11 | **P0** | 모달 이름 입력에 `required`/`aria-required` 부재 — `FormField` 의 `*` 마커는 `aria-hidden`(`FormField.tsx:60-62`)이라 AT 에 required 가 전달되지 않는다. **aria-invalid ↔ aria-describedby 페어링은 충족**(`:139-140`)이라 gap 은 required 절에 한정 | 이 화면(+ 같은 패턴의 `support/categories` · raw `<input>` 을 `FormField` 로 감싼 모든 폼) | A11 change_request · A40(DS: `FormField.required` 가 자식 컨트롤에 배선되지 않는다 — 계약 재검토) |
| 3 | EXC-03 | **P0** | `useRouteWritePermissions()`(`RequirePermission.tsx:44-52`)의 소비자가 앱 전체에 0 — 읽기 전용 역할이 추가·수정·삭제 버튼을 그대로 보고 누른다. route read 게이팅(①)은 충족 | **앱 전역**(모든 쓰기 화면) | A11 change_request |
| 4 | EXC-04 | **P0** | `createStoreAdapter.update/remove`(`crud.ts:126-135`)에 존재 검사 부재 → 유령 저장/삭제. **같은 파일 `createCrudAdapter`(`:71-73`·`:82-84`)는 이미 409 로 막고 있다 — 비대칭.** 엔티티에 `updatedAt`/`version` 없어 낙관적 토큰 불가 | **앱 전역**(`createStoreAdapter` 소비 화면 전부 — 상품·포트폴리오·고객센터 카테고리·답변템플릿) | A11 change_request · A63(BE-024 §7.3 서버 404 계약) |
| 5 | EXC-08 | **P0** | 모달이 `useCrudCreate`/`useCrudUpdate` 를 직접 써 동기 제출 락·멱등키 없음(`crud.ts:172-203`). `disabled={saving}` 렌더 가드만 존재 → 빠른 double-Enter 가 비멱등 POST 2건. `useCrudForm`(`:102`, `:196-197`)이 정답 패턴을 이미 갖고 있다 | **앱 전역**(저수준 훅으로 조립한 모달형 화면 — 카테고리·로고 등) | A11 change_request |
| 6 | (사각지대) | — | 모달 dirty 상태에서 **브라우저 뒤로가기·새로고침** 시 입력이 조용히 사라진다 — FEEDBACK-06(모달 4경로)과 FEEDBACK-04(페이지 폼 3경로) **어느 쪽도 이 경로를 정의하지 않는다.** quality-bar 자체의 공백 | 앱 전역(폼 모달 전부) | A64(quality-bar 개정 검토) · A11 |
| 7 | COMP-01 | P1 | 행 수정·삭제가 raw `<button>` + `buttonStyle('ghost')` 로 조립(`:96`, `:127-148`) — DS `<Button>` 미사용 | 이 화면(+ COMP-01 appliesTo 목록) | A11 |
| 8 | IA-03 | P1 | breadcrumb 부재로 `/portfolio/categories` 와 `/products/categories` 의 AppHeader 제목이 **둘 다 '카테고리'** — 제목만으로 구분 불가 | 앱 전역(AppHeader) | A11 · A40 |
| 9 | ERP-13 | P1 | 삭제 차단 aria-label 의 조사 파손 — '3개 사용 중**라** 삭제할 수 없습니다'(`:141`). 조사 헬퍼 부재 | 앱 전역(`shared/format`) — FAQ 카테고리 모달도 같은 문구 복제 | A40 · A11 |
| 10 | ERP-06 | P1 | 0-usage 배지 문구가 화면 간 불일치 — 이 화면 '미사용'(`types.ts:15`) vs 문의 유형 '사용 안 함'(`support/_shared/domain.ts:43`) | 두 화면 | A11 |
| 11 | EXC-06 · EXC-07 · EXC-20 | P1 | 실패가 status 로 갈리지 않는다 — 403/404/409/422/429/500 이 전부 같은 문구. 422 field error 매핑 없음. 5xx 참조 코드 없음 | 앱 전역(+ 이 화면 3개 실패 표면) | A11 · A63 |
| 12 | EXC-05 · EXC-11 · IA-14 | P1 | 클라이언트 타임아웃 상한(`AbortSignal.timeout` 0건)·오프라인 감지(`navigator.onLine` 0건)·반응형 선언 부재 | **앱 전역** | A40 · A11 |
| 13 | COMP-12 | P2 | 이름 입력에 글자 수 카운터 없음 — `maxLength=40`(`:136`)이 예고 없이 입력을 멈춘다. `FormField.counter` prop 미사용 | 이 화면 | A11 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래는 판정을 재현하려는 사람을 위한 스위치 목록이며, 실제 구동 결과가 아니다.

**이 화면의 실패 재현 스코프**: `portfolio-categories` (`data-source.ts:17-18` — `CATEGORY_RESOURCE` 가 react-query 키 루트와 실패 스코프를 겸한다)

**`?fail=` — generic Error 재현** (`shared/crud/dev.ts` `failIfRequested(scope, op)`)

| 스위치 | 걸리는 어댑터 함수 | 화면 표면 |
|---|---|---|
| `?fail=list` · `?fail=portfolio-categories:list` | `fetchAll` (`crud.ts:111-115`) | 조회 실패 배너 FS-024-EL-006 |
| `?fail=save` · `?fail=portfolio-categories:save` | `create`·`update` (`:121-130`) — **두 함수가 같은 op 을 공유한다** | 모달 저장 실패 배너 FS-024-EL-007.3 |
| `?fail=delete` · `?fail=portfolio-categories:delete` | `remove` (`:131-135`) | 다이얼로그 실패 배너 FS-024-EL-008.1 |
| `?fail=detail` · `?fail=portfolio-categories:detail` | `fetchOne` (`:116-120`) | **관측 불가 — 이 화면에 `fetchOne` 소비자가 없다**(BE-024 §7.6) |
| `?fail=all` | 전부 | 위 전부 |

**`?status=<op>:<code>` — status 지정 재현** (`dev.ts` `STATUS_PARAM`) — `HttpError(status, message)` 를 던진다. 재현 가능 코드: 400·401·403·404·409·412·422·429·500.
예: `?status=save:409`(중복 이름 — BE-024 §7.2) · `?status=delete:422`(사용 중 — BE-024 §7.1) · `?status=list:401`(세션 만료 → 전역 인터셉터) · `?status=all:500`.
**단 이 화면은 status 로 분기하지 않는다** — 전부 같은 문구로 수렴한다(§3 EXC-06 gap). 즉 이 스위치는 **현재 gap 을 입증하는 도구**이지 정상 경로를 보여주는 도구가 아니다.

**`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 없고(`LATENCY_MS = 400` 고정 상수), `?delay=` 는 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재한다. STATE-01 재현에 `?delay=3000` 을 쓸 수 없으므로 **§2 STATE-01 의 측정 기준은 '쓰기 → 무효화 → 재조회 400ms 창'** 으로 잡았다.

**정적 검사**
- `pnpm verify:all` — Airbnb ESLint / stylelint 0 warning(TOKEN-01)
- `apps/admin/src/pages/portfolio/categories/categories.test.ts` — 사용 중 삭제 차단 · 사용량 문구 · 폼 검증 3건(vitest). **참조 무결성의 프론트 절반을 이 테스트가 지킨다** — 서버 절반은 BE-024 §7.1
- grep 근거: `buttonStyle(` (COMP-01) · `aria-required` (A11Y-11) · `useRouteWritePermissions` (EXC-03) · `submitLockRef` (EXC-08)

## 7. 자기 점검

- [x] P0 30건을 quality-bar 가 정한 순서 그대로 전수 판정했다 — 30행, 빈칸 0건
- [x] §2.1 산수 검산 — pass 8 + 종속 11 + n-a 6 + gap 5 = **30** ✓
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 달았다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 달았다
- [x] 모든 `N/A` 에 '왜 이 화면에 그 표면이 없는가' 사유를 달았다
- [x] `상속` 은 이 화면에 표면이 실재하는 것만 적고, 어느 표면이 그 계약을 상속하는지 못 박았다
- [x] quality-bar 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 성능 예산이 아님을 §4.1 에 명시했다
- [x] §6 의 `?fail=` scope 를 어댑터 코드에서 확인했다(`portfolio-categories` · op 4종). **`?delay=` 를 쓰지 않았다** — 이 화면에 없음을 명시했다
- [x] FS-024 §7 ↔ BE-024 §7.9 ↔ 이 문서 §5 의 gap 집합을 일치시켰다
- [x] E2E 를 실행하지 않았고, 그 사실을 §6 머리에 명시했다
