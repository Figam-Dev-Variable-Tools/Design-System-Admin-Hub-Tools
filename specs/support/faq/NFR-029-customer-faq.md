---
id: NFR-029
title: "고객노출 FAQ 큐레이션 비기능 명세"
functionalSpec: FS-029
backendSpec: BE-029
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-029. 고객노출 FAQ 큐레이션 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | `/support/faq` — 고객노출 FAQ 큐레이션 (`apps/admin/src/pages/support/faq/**`) |
| 상위 기준 정본 | `specs/quality-bar.md` (9차원 100요구 · P0 30건). **이 문서는 그 요구 문구를 복제하지 않고 ID 로만 참조한다** |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. 각 요구가 이 화면에서 어떻게 충족되는가(코드 근거) / 무엇을 재현하면 판정되는가(측정 기준)만 기술한다 |
| 함께 읽는 문서 | FS-029(요소·예외) · BE-029(엔드포인트·보안 판정) |
| 갱신 규칙 | 이 화면의 코드가 바뀌면 §2 의 해당 행과 §5 를 함께 고친다. quality-bar 요구가 바뀌면 §2 전수를 재판정한다 |

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
| STATE-01 | STATE | 직접 | **충족(F3b 가 `isFetching` 직결을 끊었다).** 이 화면은 재정렬 때문에 공용 `useCrudList` 를 쓰지 않고 자체 `useQuery`(`CustomerFaqPage.tsx:55-59`)를 쓰지만, **그 자리에서 공유 훅과 글자까지 같은 파생을 둔다** — `:72` `const firstLoading = isFetching && data === undefined` · `:74` `const refreshing = isFetching && data !== undefined`(`:62-71` 주석이 '예전엔 isFetching 을 그대로 loading 이라 불러 표에 넘겼다 … placeholderData 로 이전 행을 들고 있으면서도 화면이 그 이득을 스스로 버리고 있던 셈'이라고 전환을 밝힌다. 정본은 `shared/crud/useCrudList.tsx:71-72`). 네 상태가 배타적이다: `CustomerFaqTable` 에 `loading={firstLoading}` 만 넘기고(`:219`) 표는 그 값으로만 5행 스켈레톤/빈상태/행을 가른다(`CustomerFaqTable.tsx:86`·`:96`·`:103`). 요약(`:210-212`)은 `firstLoading` 일 때만 '불러오는 중…' 이고, **재조회 중에는 `전체 N건 · 노출 M건` 을 유지한 채 `:213` 이 '· 새로고침 중…' 만 덧붙이며 `:209` `aria-busy={refreshing}` 로 AT 에도 알린다**. read 실패는 `:180-193` 이 Alert 로 가른다. **이것이 이 화면에 특히 중요했다** — 세 쓰기가 전부 `onSettled` 에서 `invalidateQueries` 를 부르므로(`:92`·`:121`·`:151`) **토글·재정렬마다 재조회가 일어난다**. 예전엔 그때마다 표가 자기 자신의 결과를 스켈레톤으로 덮었다 | 노출 토글을 1회 클릭 → 낙관 반영 직후 `invalidateQueries` 로 재조회가 시작되지만 **표 6행이 그대로 남고**(스켈레톤으로 바뀌지 않는다) 요약이 `전체 6건 · 노출 5건 · 새로고침 중…` 이 된다. 최초 진입에서만 5행 스켈레톤. `?fail=support-faq:list` → danger Alert 만 | pass |
| STATE-02 | STATE | 직접 | `CustomerFaqPage.tsx:171-184` 이 `error !== null` 일 때 `Alert tone="danger"` + '다시 시도'(`refetch`) 를 인라인 렌더한다. 토스트가 아니고 빈 상태로 폴백하지 않는다 | `?fail=support-faq:list` 로 진입 → 인라인 danger Alert 1개 + '다시 시도' 버튼. error toast 0건. '다시 시도' 클릭 시 조회 재발행 | pass |
| STATE-04 | STATE | N/A | **표면 없음** — 이 화면에 페이지네이션이 없고(전량 렌더) **행 선택도 없다**(`CustomerFaqTable.tsx:3` 이 '선택/삭제 열이 없다' 를 선언하고 표에 체크박스 열이 존재하지 않는다). clamp 대상 page 도, 해제할 `selectedIds` 도 없다 | — | n-a |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전량이 `var(--tds-*)` 만 참조한다 — `CustomerFaqPage.tsx:26-47`(space·색), `CustomerFaqTable.tsx:26-39`(space·색·font-weight). 하드코딩 hex 0건 · px 리터럴 0건 · border/outline 키워드 0건 | `pages/support/faq/**` 에 `#[0-9a-f]{3,6}` · `[1-9]px` · `(outline\|border): (thin\|medium\|thick)` grep = 0 | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 focus ring 표면: `Link`(`:194` `tds-ui-focusable`) · `ToggleSwitch`(DS) · `ReorderMoveButtons`(DS `tds-reorder__btn`) · '다시 시도' `Button`(DS). 전부 DS/app-shell 이 ring 을 소유하며 이 화면은 클래스만 얹는다 | DS 소유 문서/`app-shell.css` 판정에 따른다 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면은 animation/transition 을 **선언하지 않는다**. easing 토큰 소비 표면은 소비 컴포넌트에 있다 — 스켈레톤 pulse(`tds-ui-skeleton`, `shared/ui/ui.css`) · Toast(DS) · ToggleSwitch(DS) | tokens codegen · Toast.css · ui.css 소유 판정에 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | elevation 표면: `Card`(`:206` — 표를 감싼다) · `Alert`(`:174`·`:188`) · Toast(DS). 전부 DS 컴포넌트이며 이 화면은 raw `box-shadow` 를 선언하지 않는다(grep 0) | DS Card/Modal/Toast 판정에 따른다 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면은 **자체 `<h1>` 을 두지 않는다** — 화면 제목은 `AppHeader.tsx:101` 의 `<h1 style={titleStyle}>` 이 소유하고 그것이 `pageTitleStyle`(display tier)을 소비한다(`AppHeader.tsx:52-55`). 이 화면의 표면은 그 h1 하나 | AppHeader/tokens 판정에 따른다 | 종속 |
| COMP-10 | COMP | N/A | **표면 없음** — 이 화면에 text-search/filter 입력이 **없다**. 검색·키워드·필터 컨트롤이 존재하지 않고(FS-029 §1.1) 유일한 텍스트는 읽기 전용 셀이다. IME 로 커밋할 query 자체가 없다 | — | n-a |
| FEEDBACK-02 | FEEDBACK | N/A | **표면 없음** — 이 화면에 파괴적/비가역 액션이 **없다**. 삭제·생성이 콘텐츠 관리 소관이라 `ConfirmDialog` 를 렌더하지 않는다(import 0건). 토글·재정렬은 **가역**이며 롤백 + 재시도 토스트로 복구된다(FS-029 §4.1) | — | n-a |
| FEEDBACK-04 | FEEDBACK | N/A | **표면 없음** — 이 화면에 RHF 폼·편집 입력이 없어 미저장 변경(`isDirty`) 상태가 존재하지 않는다. 토글·재정렬은 즉시 커밋되는 낙관적 쓰기라 '저장하지 않은 입력' 이 생기지 않는다 | — | n-a |
| FEEDBACK-06 | FEEDBACK | N/A | **표면 없음** — 이 화면에 모달이 없다(`Modal`·`useModalDirtyGuard` import 0건) | — | n-a |
| A11Y-01 | A11Y | 상속 | toast live region 표면이 실재한다 — 이 화면은 성공·실패를 **전부 토스트로만** 알린다(`:98`·`:103`·`:124`·`:130`·`:155`·`:162`). 지속 live region 은 `ToastProvider` 가 소유한다 | ToastProvider 판정에 따른다. **이 화면은 그 계약에 전면 의존한다** — 쓰기 결과를 알리는 다른 표면이 없어 region 이 깨지면 AT 사용자가 모든 큐레이션 결과를 놓친다 | 종속 |
| A11Y-02 | A11Y | N/A | **표면 없음** — Modal·ConfirmDialog 를 렌더하지 않는다 | — | n-a |
| A11Y-11 | A11Y | N/A | **표면 없음** — 이 화면에 폼 컨트롤·검증이 없다. `aria-invalid` 를 세우는 요소가 0건이고(grep) `FormField`·zod 스키마를 쓰지 않는다. `ToggleSwitch` 는 `role="switch"` 로 상태를 전달하며 검증 대상이 아니다 | — | n-a |
| A11Y-12 | A11Y | N/A | **표면 없음** — 좌측 필터 list item 이 없다(필터 자체가 없다). `aria-current`·`aria-pressed` 사용 0건 | — | n-a |
| MOTION-01 | MOTION | N/A | **표면 없음** — Modal 을 렌더하지 않는다 | — | n-a |
| MOTION-02 | MOTION | 상속 | toast exit 표면이 실재한다 — 이 화면의 모든 쓰기 결과가 토스트다(위 A11Y-01 근거와 동일) | ToastProvider/Toast 판정에 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트 표면: `ToggleSwitch` 2개/행(`CustomerFaqTable.tsx:110`·`:119`) · 스켈레톤 pulse · Toast. **DS 현황: `packages/ui/src/atoms/ToggleSwitch/ToggleSwitch.css:56` 이 `transition: transform` 을 선언하고 그 파일에 `prefers-reduced-motion` 블록이 없다**(코드 확인) — quality-bar MOTION-03 이 지목한 바로 그 위반이 남아 있다. 이 화면은 소비자다 | DS ToggleSwitch.css 판정에 따른다. 재현: reduced-motion 활성 후 토글 클릭 → knob 이 여전히 이동 애니메이션 | 종속 |
| IA-01 | IA | 직접 | `App.tsx:245` 가 이 라우트를 `RequireAuth > AppShell` 레이아웃 라우트 아래에 둔다(`:326-328`). 화면은 자체 sidebar/header/outer frame 을 렌더하지 않는다 — 최상위가 `<div style={pageStyle}>` 세로 스택뿐(`:187`) | `/support/faq` 진입 → sidebar·AppHeader·단일 padded `<main>` 안에서 렌더. 이 화면이 그린 frame 0개 | pass |
| IA-02 | IA | 직접 | **leaf 라우트라 모호성이 없다.** `/support/faq` 는 nav 잎으로 정확히 등재돼 있어(`nav-config.ts:169` `['자주 묻는 질문', '/support/faq']`) `findNavLabel` 의 exact 분기가 잡는다(`nav-config.ts:254-255`) → AppHeader 가 '자주 묻는 질문' 을 보인다. 화면이 **자체 in-content h1 을 두지 않아** title 소스가 하나뿐이다(모순 없음). 하위 라우트(`/new`·`/:id`)가 없어 branch-label 폴백(`:257-262`)에 걸릴 경로가 존재하지 않는다 | `/support/faq` 진입 → 가시 primary title = '자주 묻는 질문' 1개. 페이지 본문에 경쟁하는 h1 0개 | pass |
| IA-04 | IA | 직접 | **부분 충족.** 결과 count 요약은 있고(`:200-204` '전체 N건 · 노출 M건') 표가 그 아래 온다. SelectionBar 는 bulk action 이 없어 해당 없음. **그러나 (a) 툴바 행이 없다** — 검색·필터·우상단 primary action 이 존재하지 않고 유일한 이동 경로는 info Alert 안의 링크(`:194`)다. **(b) 페이지네이션이 없고 상한도 없다** — `faqs` 전량을 그대로 렌더한다(`CustomerFaqTable.tsx:103`). 재정렬 의미상 전량 렌더가 합리적이나 **그 결정이 선언돼 있지 않고 상한도 없다**(BE-029 §7.3 미정) | 픽스처를 6건 → 200건으로 늘리면 200행이 한 번에 렌더되고 페이지네이션이 나타나지 않는다. 기대: page size 초과 가능한 list 는 Pagination 을 렌더하거나 '전량 렌더 + 상한 N건' 을 명시적 계약으로 선언 | **gap** |
| IA-05 | IA | N/A | **표면 없음** — 이 화면에 create·edit 폼이 없다. `/new`·`/:id/edit` 라우트가 존재하지 않고(`App.tsx:245` 가 유일) FAQ 생성·수정은 `/content/faq`(FS-010) 소관이다 | — | n-a |
| IA-13 | IA | N/A | **표면 없음** — 직렬화할 list query state 가 **없다**. page·page-size·filter·keyword·sort 컨트롤이 하나도 없고(FS-029 §1.1), 유일한 가변 상태인 표시 순서는 **서버 데이터 자체**이지 뷰 상태가 아니다. 이 화면의 URL 은 이미 view 를 완전히 복원한다 — 복원할 조건이 없기 때문이다 | — | n-a |
| EXC-01 | EXC | 상속 | route render 예외 경계가 실재한다 — `App.tsx:311` 이 Routes 를 `ErrorBoundary` 로 감싸고 AppShell `<Outlet>` 바깥에도 경계가 있다(`App.tsx:306` 주석 · `AppShell.tsx`). 이 화면은 그 안에서 렌더되는 소비자 | ErrorBoundary 소유 판정에 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 두 표면이 실재한다 — (a) route guard: `App.tsx:326` `RequireAuth` 가 AppShell 바깥에서 세션을 검사한다. (b) 401 인터셉터: `shared/query/queryClient.ts:37-43` 이 QueryCache/MutationCache `onError` 에서 `isUnauthorized` → `notifySessionExpired()` 를 부른다 — **이 화면의 조회·세 뮤테이션이 모두 그 캐시를 통과하므로 전수 커버된다** | RequireAuth/queryClient 판정에 따른다 | 종속 |
| EXC-03 | EXC | 상속 | route-level 권한 표면이 실재한다 — `AppShell.tsx:490-492` 가 `<Outlet>` 을 `RequirePermission` 으로 감싸고 `route-resource.ts:36-46` 이 pathname 에서 리소스를 파생한다(`/support/faq` 는 잎이라 정확히 매핑). **write-action 게이팅은 이 화면에 없다** — 토글·이동 버튼이 `can(resource,'update')` 로 숨거나 비활성되지 않는다. 다만 FS-029 §4.1 이 '프론트 역할 분기 없음' 을 선언하고 BE-029 §2 가 권한 강제를 서버 책임으로 확정하므로, 이는 **앱 전역 정책**(모든 화면 동일)이지 이 화면의 이탈이 아니다 | RequirePermission/권한 모델 판정에 따른다. 앱 전역 정책이 '프론트 게이팅 도입' 으로 바뀌면 이 화면의 두 토글·이동 버튼이 대상이 된다 | 종속 |
| EXC-04 | EXC | N/A | **표면 없음** — appliesTo 가 '모든 record 폼(엔티티에 `updatedAt` 존재)' 인데 이 화면에 **record 폼이 없고** `CustomerFaq` 에 `updatedAt`/version 필드가 **없다**(`types.ts:9-20`). 낙관적 동시성 토큰을 실을 대상이 성립하지 않는다. 이 화면은 `createCrudAdapter` 도 쓰지 않는다(자체 어댑터). 토글·재정렬의 동시성은 **마지막 쓰기 승리**로 BE-029 §7.4 가 명시적으로 판정했다(BE-010 §7.4 와 동일 근거) | — | n-a |
| EXC-08 | EXC | 직접 | **미충족.** 토글 재진입 가드가 **state 기반이라 동기 락이 아니다** — `CustomerFaqPage.tsx:116`(`if (togglingIds.has(faq.id)) return;`)이 읽는 `togglingIds` 는 `useState`(`:53`)이고 `markToggling`(`:71-78`)이 `setTogglingIds` 로 비동기 갱신한다. `ToggleSwitch busy`(`CustomerFaqTable.tsx:113`)의 `disabled` 도 같은 state 에 걸린다. **같은 틱의 두 번째 클릭은 두 핸들러가 모두 stale 한 빈 Set 을 읽어 가드를 통과**하고 두 번째 요청을 만든다 — EXC-08 이 지목한 '동기 submit lock(ref)' 이 없다. 공용 `useCrudForm` 은 `submitLockRef`(`shared/crud/useCrudForm.ts:102`)로 이를 닫았으나 이 화면은 그것을 쓰지 않는다. 멱등키도 없다. **완화 요인**: `PATCH` 가 목표 상태를 세팅하는 멱등 연산이라(BE-029-EP-03) 중복 요청의 피해는 요청 1건 낭비에 그친다 — 금액·생성·발송이 아니다. 재정렬은 중복이 아니라 **abort-and-replace**(`:87`)라 이 요구의 대상이 아니다 | 같은 행의 노출 토글을 한 프레임 안에 2회 클릭(Playwright `dblclick` 또는 `Promise.all` 로 두 click 디스패치) → 네트워크 심에 `setCustomerFaqVisible` 호출 2건이 관측된다. 기대: 정확히 1건 | **gap** |
| EXC-09 | EXC | 직접 | 세 쓰기의 `onError` 전부가 공유 predicate `isAbort` 로 취소를 걸러 **early return** 한다 — 재정렬 `:101`, 노출 `:128`, BEST `:159`(`import { isAbort } from '../../../shared/async'` `:11`). 취소 시 error toast 0건 · 롤백 없음(스냅샷 복원을 건너뛴다) · 캐시 무변경. 재정렬은 `onSuccess` 에서도 `controller.signal.aborted` 를 재확인해(`:97`) abort 된 요청의 성공 토스트를 막는다. abort 를 실패로 세는 bulk 집계는 이 화면에 없다 | `?fail=` 없이 재정렬을 연속 2회 실행(첫 요청 in-flight 중 두 번째) → 첫 요청이 `reorderControllerRef.current?.abort()`(`:87`)로 취소되고 **toast 0건 · 롤백 0건**. 두 번째 결과만 반영 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **6** | **STATE-01** · STATE-02 · TOKEN-01 · IA-01 · IA-02 · EXC-09 |
| 종속 | 10 | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-03 |
| n-a | 12 | STATE-04 · COMP-10 · FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · A11Y-02 · A11Y-11 · A11Y-12 · MOTION-01 · IA-05 · IA-13 · EXC-04 |
| **gap** | **2** | **IA-04 · EXC-08** |
| **합계** | **30** | 6 + 10 + 12 + 2 = **30** ✓ |

> **`4b805ad` 재판정: P0 gap 이 3 → 2 로 줄었다.** 뒤집힌 1건은 **STATE-01** — F3b 가 `isFetching` 직결을 끊고 `CustomerFaqPage.tsx:72,74` 에 `firstLoading`/`refreshing` 파생을 넣었다. **이것이 이 화면의 핵심 결함이었다**: 큐레이션의 주 동작(토글·재정렬)이 전부 `onSettled` 무효화로 재조회를 유발하므로(`:92`·`:121`·`:151`) 예전엔 **매 조작마다 표가 자기 자신의 결과를 스켈레톤으로 덮었다**. 이제 낙관 반영된 행이 그대로 남고 요약에 '· 새로고침 중…' 만 붙는다. **P1 1건도 함께 pass**(STATE-03 — 같은 한 줄의 효과).
>
> **P0 gap 2건 → quality-bar '배치 실패' 사유.** 둘 다 이 화면 고유다 — **IA-04**(툴바 행·페이지네이션·상한 부재)와 **EXC-08**(토글 재진입 가드가 state 기반이라 동기 락이 아니다). EXC-08 은 F3b 가 `WriteContext.idempotencyKey`(`shared/crud/crud.ts:30-42`)와 `submitLockRef` 정본(`useCrudForm.ts:103`)을 만들어 뒀지만 **이 화면이 자체 `useMutation` 을 써 둘 다 물려받지 못했다** — '앱에 기능이 없다'가 아니라 '이 화면의 미소비'로 사유가 바뀌었다.

## 3. 이 화면에 걸리는 P1 · P2 (선별 — 표면이 실재하는 것만)

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **해소됨(F3b).** `placeholderData: (previous) => previous`(`:58`)로 캐시가 이전 데이터를 유지하고, **이제 화면이 그 이득을 쓴다** — `:74` `refreshing = isFetching && data !== undefined` 를 파생해 `:209` `<p aria-busy={refreshing}>` + `:213` `{refreshing && ' · 새로고침 중…'}` 으로 **건수를 지우지 않고 가벼운 인디케이터만 덧붙인다**. 스켈레톤은 `firstLoading` 에만 걸린다(`:219`) | 토글 1회 → 재조회 중 이전 6행이 유지되고 요약이 `전체 6건 · 노출 5건 · 새로고침 중…` 이 된다 | pass |
| STATE-05 | P1 | 빈 상태가 표 안의 단일 문구뿐이다 — '고객센터에 노출할 FAQ 가 없습니다.'(`CustomerFaqTable.tsx:99`). 공용 `Empty` 컴포넌트를 쓰지 않고(`CrudTable` 은 씀) 복구 CTA·일러스트가 없다. 다만 이 화면은 검색·필터가 없어 **3분기(진짜 빈/검색 0/필터 0) 중 '진짜 빈' 하나만 성립**한다 | 픽스처를 빈 배열로 → 문구 1줄만 표시되고 '콘텐츠 관리에서 FAQ 발행하기' 같은 복구 CTA 가 없다 | gap |
| STATE-06 | P1 | 세 쓰기 전부 `onSettled` 에서 목록을 무효화한다(`:83`·`:112`·`:142`) — 자기 변경이 즉시 보인다. 다만 **정확한 무효화가 아니라 전량 재조회**이며, 그 재조회가 STATE-01 을 발현시킨다 | 토글 → 서버 상태로 정합됨(pass 방향). 그러나 무효화 대신 낙관 반영을 신뢰하면 재조회 자체가 불필요 | pass |
| A11Y-16 | P1 | 표에 `aria-busy={loading}`(`CustomerFaqTable.tsx:66`)와 시각적 숨김 caption(`:67-70`)이 있고, 토글은 DS `ToggleSwitch`(`role="switch"`·`aria-checked`·`aria-busy`), 이동 버튼은 행별 고유 접근 이름(`<질문> 위로 이동`)을 갖는다. 드래그는 마우스 전용이나 **동등한 키보드 경로(이동 버튼)가 같은 순수 연산으로 귀결**한다. **그러나 목록 상태를 알리는 지속 live region 이 없다** — `CrudListShell.tsx:107-109` 가 가진 것을 이 화면은 갖지 않는다(자체 표를 쓰므로) | 스크린리더로 재정렬 → 순서가 바뀐 사실이 토스트로만 들리고 목록 상태(건수·결과) announce 가 없다 | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 사용 0건(앱 전역). 조회·재정렬이 `wait(LATENCY_MS, signal)` 에 의존해 상한이 없다 | 응답하지 않는 심으로 진입 → 스켈레톤이 무한 지속 | gap |
| EXC-06 | P1 | 실패가 status 별로 갈리지 않는다 — 조회 실패는 문구 1개(`:176`), 쓰기 실패는 토스트 1개씩. `failIfRequested` 가 `?status=` 로 401·403·404·409·429·500 을 던질 수 있으나(`shared/crud/dev.ts:81-93`) 이 화면은 `error !== null` 하나로 뭉갠다 | `?status=list:403` 과 `?status=list:500` 이 **같은 배너**를 보인다 | gap |
| EXC-10 | P1 | N/A 로 볼 수도 있으나 표면이 없다 — 일괄 작업이 없다(선택 열 부재) | — | n-a |
| EXC-11 | P1 | `navigator.onLine` 사용 0건(앱 전역) — offline 배너·쓰기 게이팅 없음 | offline 토글 → 배너 없이 쓰기가 실패 토스트로만 떨어진다 | gap |
| EXC-14 | P1 | **충족.** 세 쓰기 모두 낙관 반영 + 스냅샷 롤백 + 실패 토스트(재시도 포함)로 짝지어져 있다 — 재정렬 `:90-104`(스냅샷 `:90`, 낙관 `:91`, 롤백 `:102`), 노출 `:118-133`, BEST `:148-165`. `onSettled` 무효화까지 3단이 갖춰졌다(`:83`·`:112`·`:142`). 비가역 create/delete 는 이 화면에 없어 낙관 적용 대상이 아니다 — **optimism 을 reversibility 에만 적용**한 정확한 사례다. 다만 공용 `useCrudRowUpdate` 로 통합돼 있지 않고 손복제다(3벌) | `?fail=support-faq:save` 로 토글 → 즉시 반영됐던 값이 **이전 값으로 롤백**되고 재시도가 붙은 실패 토스트. 롤백 안 된 낙관적 쓰기 0건 | pass |
| MOTION-04 | P1 | 행 재정렬에 FLIP/layout motion 이 없다 — 순서가 즉시 스냅된다. 드래그 중 시각 피드백은 `useReorderableRows.rowStyle` 의 opacity 0.5 + 드롭 위치 강조선(DS `TableReorder.tsx:145-153`)뿐 | 이동 버튼 클릭 → 행이 애니메이션 없이 즉시 자리를 바꾼다 | gap |
| COMP-06 | P2 | 스켈레톤 행 수가 `length: 5` 하드코딩(`CustomerFaqTable.tsx:87`)이며 실제 목록 길이(6건)와 다르다. 열 수는 `totalCols` 로 파생(`:63`)돼 정확하다 | 스켈레톤 5행 vs 실제 6행 — 로드 전후 표 높이가 튄다 | gap |
| ERP-13 | P1 | **잔존 — 그러나 사유가 바뀌었다.** 통합이 조사 헬퍼를 `shared/format.ts:269+` 로 승격했고(`objectParticle` `:306`) 앱 전역에서 **리터럴 '을(를)' 형은 0건**이라 요구의 마지막 문장('어떤 사용자 대상 문자열도 폴백형을 출하하지 않는다')은 충족이다. **그러나 이 화면은 그 헬퍼를 소비하지 않고 조사를 리터럴로 고정한다** — `CustomerFaqPage.tsx:134` `` `'${faq.question}' 를 노출합니다.` `` / `` `'${faq.question}' 를 숨겼습니다.` `` · `:165` `` `'${faq.question}' 를 BEST 로 고정했습니다.` ``. 받침으로 끝나는 질문이면 '**을**' 이어야 한다. **같은 섹션의 `support/downloads/DownloadListPage.tsx:118` 이 같은 패턴을 복제한다.** 대조: 같은 앱의 `portfolio/items/PortfolioListPage.tsx:91-92` 는 같은 토글 토스트를 `objectParticle(item.title)` 로 옳게 낸다 — **고칠 헬퍼가 이미 있고 선례도 있다** | 질문이 받침으로 끝나는 행(`적립금은 어떻게 사용하나요?` → 물음표로 끝나 한글 판정 불가 / `비밀번호를 잊어버렸어요` → 받침 없음 '요')과 받침으로 끝나는 질문을 각각 토글 → 조사 오류 관측. **리터럴 '을(를)' grep = 0 은 여전히 만족** — 이 gap 은 요구의 첫 문장('명사/이름을 interpolate 하는 모든 templated copy 를 헬퍼로 라우팅한다') 위반이다 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 조회 p95 | **≤ 400ms**(서버 상한 5초 → 504, BE-029 §2) | 측정 불가 — 백엔드 없음 | `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **픽스처 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려는 개발용 값이다. 실제 예산은 백엔드 연결 후 재설정한다 |
| 첫 렌더(FCP → 표 가시) | ≤ 1s | 400ms 심 + 렌더 | 전량 렌더라 목록 길이에 선형 비례 |
| **재조회 횟수** | **쓰기 1건당 1회** | **쓰기 1건당 1회** — 그러나 그 1회가 **표를 스켈레톤으로 만든다**(STATE-01) | `onSettled` 무효화 3곳. `staleTime: 30초`(`queryClient.ts:24`)가 라우트 재진입 시 재조회를 억제한다 |
| 재정렬 바디 크기 | 목록 길이에 선형 | 6건 → id 6개 | **상한 없음**(BE-029 §7.3) — 200건이면 `orderedIds` 200개가 매 이동마다 나간다 |
| DOM 행 수 | **상한 미정** | 6행 | 페이지네이션·가상화 없음. IA-04 gap 과 같은 뿌리 |
| 메모리 | 목록 1벌 + 스냅샷 1벌 | 낙관 롤백용 스냅샷(`:90`·`:118`·`:148`)이 쓰기 중에만 존재 | 누수 없음 — 스냅샷은 클로저 지역 변수 |
| 번들 | 화면 전용 코드 4파일 | `CustomerFaqPage` + `CustomerFaqTable` + `data-source` + `types` | 라우트 분할 없음(`App.tsx` 정적 import) — 앱 전역 정책 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 재시도 | **충족**(`:171-184`). 단 **화면 전체를 대체해 위임 안내 배너까지 사라진다**(FS-029 §7 #2) |
| 쓰기 실패 | 롤백 + 재시도 토스트 | **충족** — 세 쓰기 전부(EXC-14 pass) |
| 요청 취소 | 실패로 보고하지 않음 | **충족**(EXC-09 pass) — 단 **재정렬만 취소 가능**하다. 토글 어댑터는 `signal` 을 받지 않아(`data-source.ts:79`·`:85`) 화면 이탈 시에도 요청이 계속된다 |
| 세션 만료(401) | 재인증 경로 | **상속 충족** — `queryClient.ts:37-43` 인터셉터가 조회·뮤테이션 전수를 덮는다 |
| 네트워크 단절 | offline 배너 + 쓰기 게이팅 | **미충족** — `navigator.onLine` 0건(EXC-11) |
| 응답 지연 | 타임아웃 후 재시도 안내 | **미충족** — 상한 없음(EXC-05). 무한 스켈레톤 |
| 렌더 예외 | 복구 UI | **상속 충족** — ErrorBoundary(EXC-01) |
| 동시 재정렬 | 충돌 감지 또는 명시적 last-write-wins | **마지막 쓰기 승리** — BE-029 §7.4 가 명시적으로 판정(감지 수단 없음이 아니라 **의도된 계약**) |

### 4.3 데이터 보존 · 감사

| 축 | 현재 상태 |
|---|---|
| 미저장 입력 보존 | **해당 없음** — 편집 폼이 없어 보존할 입력이 없다(FEEDBACK-04 n-a) |
| 큐레이션 변경 이력 | **없음** — 누가 언제 어떤 FAQ 를 숨겼는지·BEST 로 고정했는지 기록하지 않는다. `CustomerFaq` 에 `updatedAt`·`updatedBy` 가 없다(BE-029 §3). **고객 노출에 직접 영향을 주는 조작이므로 감사 로그가 필요하다** — §5 #7 이관 |
| 롤백 안전성 | 낙관 반영 실패 시 스냅샷 복원 — 클라이언트 한정. 서버 상태는 `onSettled` 무효화로 정합 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| ~~1~~ | ~~**STATE-01**~~ | ~~P0~~ | **해소됨(F3b)** — `CustomerFaqPage.tsx:72` `firstLoading = isFetching && data === undefined` · `:74` `refreshing = isFetching && data !== undefined` 를 파생하고 표에 `loading={firstLoading}` 만 넘긴다(`:219`). 요약(`:209-213`)은 건수를 유지한 채 '· 새로고침 중…' 만 덧붙이고 `aria-busy={refreshing}` 를 건다. **'동일 패턴이 5개 화면에 더 있다'고 적었던 화면들도 함께 고쳐졌다** — `CategoriesPage.tsx:176-178` · `PortfolioCategoriesPage.tsx:175-177` · `TicketListPage.tsx:163-165` 를 직접 확인했다 | — | — |
| 2 | **IA-04** | **P0** | 툴바 행이 없고 페이지네이션·상한이 없어 발행 FAQ 전량을 한 화면에 렌더한다 | 이 화면 | A41 · A11(전량 렌더 결정) · A63(상한 — BE-029 §7.3) |
| 3 | **EXC-08** | **P0** | 토글 재진입 가드가 state 기반이라 동기 락이 아니다(`:53`·`:125`·`:155`) — 같은 틱의 두 번째 클릭이 중복 요청을 만든다. PATCH 가 멱등이라 피해는 제한적. **F3b 가 정본과 자리를 만들어 뒀다** — `submitLockRef`(`useCrudForm.ts:103,201-203`, ref 라 렌더를 기다리지 않는다) · `WriteContext.idempotencyKey`(`crud.ts:30-42`). 이 화면은 자체 `useMutation`(`:118-122`·`:148-152`)을 써 둘 다 물려받지 못했고, 어댑터(`setCustomerFaqVisible`/`setCustomerFaqPinned`)도 `signal`·키를 받지 않는다 | 이 화면 | A41 |
| ~~4~~ | ~~STATE-03~~ | ~~P1~~ | **해소됨(F3b)** — #1 과 같은 한 줄의 효과. 재조회 중 이전 행이 유지되고 요약에 `· 새로고침 중…` 만 덧붙는다(`:74`·`:209`·`:213`) | — | — |
| 5 | STATE-05 | P1 | 빈 상태에 복구 CTA·`Empty` 컴포넌트 미사용 | 이 화면 | A41 |
| 6 | A11Y-16 | P1 | 목록 상태 지속 live region 부재(`CrudListShell` 이 가진 것을 자체 표라 못 받는다) | 이 화면 | A41 |
| 7 | — | — | **큐레이션 변경 감사 로그 부재**(§4.3) — 고객 노출에 직접 영향을 주는 조작의 이력이 없다 | 이 화면 · 백엔드 | A63 · A11 |
| 8 | EXC-05 | P1 | 프론트 타임아웃 상한 없음. 토글 어댑터에 `signal` 인자 부재 | 앱 전역 + 이 화면 | A40 · A41 |
| 9 | EXC-06 | P1 | status 별 실패 UX 분기 없음(403·404·500 동일 문구) | 앱 전역 | A40 · A63 |
| 10 | EXC-11 | P1 | offline 감지·배너 없음 | 앱 전역 | A40 |
| 11 | MOTION-04 | P1 | 행 재정렬 FLIP motion 없음 | 이 화면 · DS | A41 · A40 |
| 12 | ERP-13 | P1 | 토스트 조사 헬퍼 미적용(`'…' 를` 고정) | 이 화면 | A41 |
| 13 | COMP-06 | P2 | 스켈레톤 행 수 `length: 5` 하드코딩 | 이 화면 | A41 |
| 14 | MOTION-03 | 종속 | DS `ToggleSwitch.css:56` 에 reduced-motion off 부재 — 이 화면이 행당 2개 소비 | DS | A40 |
| 15 | — | — | **FS-029 §7 #1 / BE-029 §7.1 — `/support/faq` 와 `/content/faq` 의 FAQ 데이터가 완전히 분리돼 있다.** quality-bar 축이 아니라 정합 결함이라 §2 에 행이 없으나 **이 화면 최대의 문제**다 | 이 화면 · `/content/faq` · 백엔드 | A63 · A11 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 `4b805ad`(2026-07-17) 코드 대조다.** 아래는 판정을 재현하려는 QA/구현자를 위한 스위치 목록이며, 각 값은 어댑터 코드에서 확인했다.

| 스위치 | 이 화면에서 유효한 값 | 근거 |
|---|---|---|
| `?fail=<op>` | `?fail=list` · `?fail=save` · `?fail=all` | `shared/crud/dev.ts:87-92` |
| `?fail=<scope>:<op>` | **`?fail=support-faq:list`** · **`?fail=support-faq:save`** | scope = `CUSTOMER_FAQ_SCOPE = 'support-faq'`(`data-source.ts:10`) |
| `?status=<op>:<code>` | `?status=support-faq:list:401` 형식은 **불가** — 파서가 `<target>:<code>` 2토큰만 읽는다(`dev.ts:62`). `?status=list:403` · `?status=save:409` · `?status=all:500` 처럼 **op 또는 scope:op 를 target 으로** 쓴다 | `dev.ts:57-71`. 재현 가능 status: 400·401·403·404·409·412·422·429·500(`dev.ts:27-37`) |
| `?delay=` | **없다** — 이 화면에 존재하지 않는 스위치다 | `shared/crud/dev.ts` 에 delay 파라미터가 없다. 지연은 `LATENCY_MS = 400` 고정(`dev.ts:12`) |

**이 화면의 실제 op 목록은 `list` 와 `save` **둘뿐이다** — 어댑터에 `detail`·`delete` 호출이 없다(`data-source.ts:66`·`:75`·`:81`·`:87`). 세 쓰기(재정렬·노출·BEST)가 **모두 `save` 한 op 을 공유**하므로 `?fail=support-faq:save` 는 셋을 동시에 실패시킨다 — 개별 쓰기만 실패시키는 수단이 없다.

| 판정 | 재현 절차 |
|---|---|
| STATE-01 gap | 정상 진입 → 목록 도착 대기 → 노출 토글 1회 클릭 → **표가 5행 스켈레톤으로 바뀌는 프레임을 관측**(`invalidateQueries` → `isFetching=true`). 400ms 심이라 육안으로 보인다 |
| EXC-08 gap | 한 프레임 안에 같은 토글 2회 클릭 → 어댑터 호출 2건 |
| IA-04 gap | `data-source.ts` 시드를 200건으로 늘려 진입 → 200행 렌더, 페이지네이션 없음 |
| EXC-14 pass | `?fail=support-faq:save` → 토글 → 낙관 반영 후 롤백 + 재시도 토스트 |
| STATE-02 pass | `?fail=support-faq:list` → 인라인 danger Alert + '다시 시도'(토스트 0건) |
| EXC-09 pass | 재정렬 연속 2회(첫 요청 in-flight 중) → 첫 요청 abort, 토스트·롤백 0건 |

## 7. 자기 점검

- [x] quality-bar 요구 문구를 복제하지 않고 **ID 로만 참조**했다
- [x] §2 **P0 30건 전수** · 표기 순서 준수 · 빈칸 0건
- [x] 모든 `N/A` 에 사유를 적었다 (12건 — 전부 '표면 없음' 의 구체적 근거)
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 적었다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 적었다
- [x] §2.1 산수 검산 — 6 pass + 10 종속 + 12 n-a + 2 gap = **30** ✓
- [x] **판정 기준일을 `2026-07-17 · HEAD = 4b805ad` 로 갱신하고 F3a·F3b·통합 이후 코드로 P0 30건을 전수 재확인했다.** 뒤집힌 P0 **1건**(STATE-01)을 pass 로 올리고 §2.1·§5 를 함께 갱신했다. **P1 1건도 pass 로 전환**(STATE-03). **ERP-13 은 여전히 gap 이다** — 조사 헬퍼가 `shared/format.ts:269+` 로 승격됐는데도 이 화면(`:134`·`:165`)이 조사를 리터럴 '를' 로 고정한다. 낙관적으로 pass 로 바꾸지 않았다
- [x] §3 은 **표면이 실재하는** P1·P2 만 골랐다
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님을 §4.1 에 명시했다
- [x] §6 의 `?fail=` scope(`support-faq`)·op(`list`·`save`)를 **어댑터 코드에서 확인**했고, `?delay=` 가 이 화면에 없음을 명시했다
- [x] FS-029 §7 · BE-029 §7.6 과 §5 의 이관 항목을 상호 일치시켰다
- [x] **E2E 미실행 — 판정 근거는 코드 대조**임을 §6 에 명시했다
