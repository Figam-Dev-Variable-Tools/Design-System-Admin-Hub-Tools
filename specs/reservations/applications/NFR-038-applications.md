---
id: NFR-038
title: "신청서 관리 비기능 명세"
functionalSpec: FS-038
backendSpec: BE-038
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-038. 신청서 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-038 신청서 관리 (`/reservations/applications` · `/reservations/applications/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30). **이 문서는 그 요구를 재서술하지 않는다.** 요구 문구·근거·appliesTo 는 quality-bar 가 정본이고 여기서는 **ID 로만 참조**한다 |
| 이 문서의 역할 | quality-bar 의 **페이지 적용본**. 각 요구가 이 화면에 걸리는가(적용), 걸린다면 이 화면의 **어느 코드가** 충족을 결정하는가, 무엇을 재현하면 판정이 뒤집히는가만 적는다 |
| 함께 읽는 문서 | FS-038(요소·예외) · BE-038(계약·보안 판정). gap 은 FS-038 §7 · BE-038 §7.7 과 **번호로 상호 참조**한다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 의 30행을 재판정한다. 이 화면 코드가 바뀌면 해당 행의 '코드 근거'와 판정을 갱신한다. **판정 근거는 코드 대조다 — E2E 는 실행하지 않았다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(`pages/reservations/applications/**`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **미충족.** `ApplicationListPage.tsx:99` 가 `isFetching: loading` 으로 직결하고 `:186` 이 그 `loading` 으로 스켈레톤을 그린다. `useCrudListQuery`(`crud.ts:148-153`)는 `placeholderData: (previous) => previous` 로 이전 데이터를 쥐고 있는데 **화면이 그 이득을 스스로 버린다**. 공용 `useCrudList` 는 `firstLoading = isFetching && data === undefined` 로 이미 고쳤으나(`useCrudList.tsx:71`) 이 화면은 그 훅을 쓰지 않는다. 상세는 `application === undefined` 로 갈라 정상(`ApplicationDetailPage.tsx:194`) | 목록에 행이 있는 상태에서 `staleTime`(30초) 경과 후 재조회를 유발(라우트 이탈 후 복귀) → **표가 5행 스켈레톤으로 덮이면 gap**. 데이터 유지가 정답 | **gap** |
| STATE-02 | STATE | 직접 | **절반만.** 목록은 충족 — `ApplicationListPage.tsx:109-122` 가 인라인 `Alert tone="danger"` + '다시 시도'(`refetch`)를 렌더하고 toast 를 쓰지 않는다. **상세가 미충족** — `ApplicationDetailPage.tsx:163-174` 는 danger Alert 를 그리지만 **'다시 시도' 컨트롤이 없다**('목록으로'뿐). 요구는 Alert **와** 명시적 재시도 컨트롤 둘 다다 | `?fail=reservation-applications:detail` 로 상세 진입 → 배너에 재시도 버튼이 없으면 gap. 목록은 `?fail=reservation-applications:list` 로 pass 확인 | **gap** |
| STATE-04 | STATE | N/A | 이 화면에 **페이지네이션이 없고**(clamp 대상 없음) **행 선택도 없다**(`ApplicationListPage.tsx` 전수 — 체크박스·SelectionBar·`useRowSelection` 0건). 요구의 두 축(page clamp · 숨겨진 행의 선택 해제) 모두 표면이 존재하지 않는다. 페이지네이션 부재 자체는 IA-04 가 판정한다 | — (표면 없음) | **N/A** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전량이 `var(--tds-*)` 만 참조한다 — `ApplicationListPage.tsx:51-89` · `ApplicationDetailPage.tsx:52-80`. hex 0건, px 리터럴 0건(`calc(var(--tds-space-6) * 5)` 는 토큰 연산), border/outline 키워드 0건 | 두 파일에 `#[0-9a-f]{3,6}` · `[1-9]px` · `(outline\|border): (thin\|medium\|thick)` grep = 0. lint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 focus ring 표면: `.tds-ui-focusable`(`ApplicationListPage.tsx:219` 상세 버튼 · `ApplicationDetailPage.tsx:182` 목록으로) + DS `<Button>`·`<SelectField>`·`<TextareaField>`. 링 두께·색은 전부 DS 가 결정하고 이 화면은 클래스만 붙인다 | DS/`app-shell.css` 소유 문서 판정 | **종속** |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비 표면: 저장 성공 토스트(`ApplicationDetailPage.tsx:152` → `ToastProvider`). 이 화면은 자체 animation/transition 선언이 0건이다 | ToastProvider/tokens codegen 소유 문서 판정 | **종속** |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 elevation 표면: `Card`(상세 3장 — `:195,200,229,274`) · Toast · 미저장 가드가 여는 Modal/ConfirmDialog. 전부 DS 컴포넌트이고 이 화면은 `box-shadow` 를 선언하지 않는다 | DS `Card.css`/`Modal.css`/tokens 소유 문서 판정 | **종속** |
| TOKEN-05 | TOKEN | 상속 | 이 화면의 display/heading 표면: `ApplicationDetailPage.tsx:191` 이 공유 `pageTitleStyle` 을 소비한다(자체 titleStyle 을 재선언하지 않는다). 목록은 in-content h1 이 없다 | `shared/ui/styles.ts` `pageTitleStyle` / tokens 소유 문서 판정. **단 이 화면엔 h1 이 둘이다** — IA-02 행 참조 | **종속** |
| COMP-10 | COMP | 직접 | **미충족.** `ApplicationListPage.tsx:127-132` 이 `SearchField` 에 `onChange={setKeyword}` 를 직결한다 — `isComposing` 처리도 디바운스도 없다. 공용 `useDebouncedSearch`(`shared/crud`, 8파일 소비)를 **이 화면은 쓰지 않는다**(reservations 전체에서 import 0건). DS `SearchField` 자체도 조합을 다루지 않는다(`packages/ui/src/molecules/SearchField/SearchField.tsx:66` — `onChange` 를 그대로 흘린다). **정직한 한정**: 이 화면의 검색은 **클라이언트 필터**라(`:104-107`) 자모마다 요청이 나가지도, 순서 뒤바뀐 응답이 최신을 덮지도 않는다 — 요구가 막는 실패 중 **네트워크 축은 현재 재현 불가능**하다. 그러나 조합 계약(compositionend 에서만 commit) 자체가 미구현이라 조합 중 자모('ㅎ'→'한'→'한빛')가 그대로 필터에 걸려 결과가 튄다 | 검색창에 '한빛'을 IME 로 입력 → 조합 중 표가 자모 단위로 재필터되면 gap. `isComposing` grep = 0 으로도 확인 | **gap** |
| FEEDBACK-02 | FEEDBACK | 직접 | **미충족.** 종료 상태(`rejected`·`completed`)로의 전이는 **비가역**이다 — `types.ts:105-106` 이 `TRANSITIONS[rejected] = []`·`TRANSITIONS[completed] = []` 로 되돌릴 길을 닫는다. 그런데 `ApplicationDetailPage.tsx:268` 의 '처리 저장'은 `:134` `onSave` 를 **직접** 호출해 `update.mutate` 로 간다 — **ConfirmDialog 게이트가 없다**. 이 화면엔 삭제가 없으므로(BE-038 §7.5) 파괴적 액션은 이 전이가 유일하고, 그것이 무방비다 | 상태 '접수' 신청서에서 '반려' 선택 → '처리 저장' 클릭 → **확인 다이얼로그 없이 즉시 저장되고 그 뒤 select 가 종료 상태로 잠기면 gap**(FS-038-EL-015 안내만 남는다) | **gap** |
| FEEDBACK-04 | FEEDBACK | 직접 | 충족. `ApplicationDetailPage.tsx:132` 가 `useUnsavedChangesDialog(dirty && !saving, {message})` 를 배선하고, `dirty` 는 `:130-131` 에서 상태·메모를 로드값과 비교해 파생한다. 3경로(beforeunload · 앱 내 링크 capture · popstate)는 훅이 소유한다(`useUnsavedChangesDialog.tsx:127-133`). `saving` 중 가드 해제도 식에 포함 | 상태를 바꾼 뒤 ① 탭 닫기 ② 사이드바 링크 ③ 브라우저 뒤로 → 각각 discard 확인. 저장 성공 후 재조회로 dirty 가 풀리면 프롬프트 없이 통과 | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | 이 화면에 **편집 폼을 담은 modal 이 없다** — 처리 폼은 상세 **페이지**의 카드다(`ApplicationDetailPage.tsx:229-272`). 이 화면이 여는 유일한 modal 은 미저장 가드의 discard 확인이고, 그것은 폼이 아니라 가드 자신이다(FEEDBACK-04 가 판정). 폼 modal 이 없으므로 dirty-close 가드 대상이 없다 | — (표면 없음) | **N/A** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: `ApplicationDetailPage.tsx:152` `toast.success('처리 내용을 저장했습니다.')`. 지속 live region 은 `ToastProvider` 가 소유한다(`ToastProvider.tsx:155-162` — 큐를 kind 로 갈라 항상 마운트된 region 에 주입) | ToastProvider 소유 문서 판정 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 미저장 가드가 여는 ConfirmDialog(`useUnsavedChangesDialog` 내부). `aria-describedby` 배선은 DS `Modal` 의 `describedBy` 계약이 소유한다(`packages/ui/src/organisms/Modal/Modal.tsx:6,60`) | Modal/ConfirmDialog 소유 문서 판정 | **종속** |
| A11Y-11 | A11Y | 직접 | 충족 — **단 사유가 '계약을 지켜서'가 아니라 '대상이 없어서'다.** 이 화면의 폼 컨트롤은 처리 상태 select(`ApplicationDetailPage.tsx:232-247`)와 처리 메모 textarea(`:254-262`) 둘이고, **어느 쪽도 `aria-invalid` 를 설정하지 않는다** — 이 화면에 클라이언트 검증이 아예 없기 때문이다(`validation.ts` 부재 · BE-038 §1). 따라서 '짝 없는 `aria-invalid`' 는 0건이다. `required` 필드도 선언돼 있지 않다(`FormField` 에 `required` prop 미전달) — 노출할 required semantics 자체가 없다 | 두 파일에 `aria-invalid` grep = 0 → 짝 없는 `aria-invalid` 0건. 검증 부재는 별개 항목(FS-038 §7 #11) | **pass** |
| A11Y-12 | A11Y | N/A | 이 화면에 **좌측 필터 list item 이 없다** — 상태 필터는 `<SelectField>` 네이티브 select 다(`ApplicationListPage.tsx:133-153`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터 버튼이 존재하지 않는다(두 파일에 `aria-current` grep = 0) | — (표면 없음) | **N/A** |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 미저장 가드의 ConfirmDialog. enter/exit transition 은 DS `Modal` organism 이 소유한다 | Modal 소유 문서 판정 (현재 `packages/ui/src/organisms/Modal/` 에 Motion/AnimatePresence 0건 — DS 측 미구현) | **종속** |
| MOTION-02 | MOTION | 상속 | 이 화면의 toast 표면: 저장 성공 토스트(`:152`). exit 애니메이션은 `ToastProvider` 소유 | ToastProvider 소유 문서 판정 | **종속** |
| MOTION-03 | MOTION | 상속 | 이 화면은 **자체 animation/transition 을 선언하지 않는다**(두 파일에 `transition`·`animation` 0건). reduced-motion 게이트 대상은 전부 DS 컴포넌트(Modal·Toast·skeleton pulse) | 전역 Motion config / DS CSS 소유 문서 판정 | **종속** |
| IA-01 | IA | 상속 | 두 라우트가 `App.tsx:273-274` 에서 `APP_ROUTES` 로 선언되고, 그 배열은 `RequireAuth > AppShell` 레이아웃 라우트 아래에서 일괄 렌더된다(`App.tsx` — `APP_ROUTES.map`). 이 화면은 자체 sidebar/top bar 를 만들지 않는다(두 파일에 `<header>`/`<nav>` 0건) | AppShell 소유 문서 판정 | **종속** |
| IA-02 | IA | 직접 | **미충족.** `findNavLabel`(`shared/layout/nav-config.ts:253-264`)은 잎을 **정확 일치**로만 찾고, 못 찾으면 `pathname.startsWith(item.basePath)` 인 **브랜치 라벨로 폴백**한다. `/reservations/applications/app-1` 은 잎이 아니므로 → **'예약/신청 관리'**. 그런데 `ApplicationDetailPage.tsx:191` 이 본문에 `<h1>신청서 처리</h1>` 를 또 그린다 — **한 화면에 `<h1>` 이 둘이고, 그중 상단의 것이 요구가 금지한 브랜치 라벨이다**. 목록(`/reservations/applications`)은 잎과 정확히 일치해 '신청서' 로 옳게 나오고 in-content h1 이 없다 — **list 는 AppHeader 가, detail 은 본문이 제목을 대는 모순**이 요구가 지적하는 바로 그 상태다 | `/reservations/applications/app-1` 진입 → 가시 primary title 이 '예약/신청 관리' 이고 `<h1>` 이 2개면 gap | **gap** |
| IA-04 | IA | 직접 | **미충족(Pagination 축).** 템플릿 준수 여부를 축별로 나누면 — 툴바 좌측 검색·필터 O(`:126-154`), **primary 등록 버튼 없음 = 정상**(신청서는 고객이 제출한다 — BE-038 §7.5. 없는 것이 옳다), 결과 count 요약 O(`:156`), SelectionBar N/A(일괄 작업 없음), 표 O(`:158`), **Pagination 없음 → gap**. 요구는 'page size 초과 가능 시 Pagination' 인데 신청서는 고객이 만드는 **무한 증가 컬렉션**이고 서버 페이징 계약도 없다(BE-038 §7.3) — 조회된 전량이 한 화면에 렌더된다 | 신청 100건 이상인 상태로 목록 진입 → Pagination 없이 전량이 한 표에 렌더되면 gap. `reservations/` 에 `Pagination` import grep = 0 으로도 확인 | **gap** |
| IA-05 | IA | N/A | 이 화면에 **create·edit 폼 라우트가 없다.** 신청서는 고객이 제출하므로 `/new` 가 없고, 관리자 처리는 상세(`/:id`)에서 일어난다 — `App.tsx:273-274` 에 이 두 라우트가 전부다. 같은 엔티티의 create/edit 쌍이 존재하지 않으므로 '하나의 컴포넌트로 해석' 을 판정할 대상이 없다 | — (표면 없음) | **N/A** |
| IA-13 | IA | 직접 | **미충족.** 상태 필터와 키워드가 컴포넌트 `useState` 에만 있다 — `ApplicationListPage.tsx:94-95`. `useSearchParams` 도, 공용 `useListState`(`shared/crud` — 실소비자는 `members/**` 뿐)도 쓰지 않는다(reservations 전체에서 import 0건). 그래서 ① 필터를 걸고 상세를 연 뒤 뒤로 가면 필터가 풀린 목록으로 착지하고 ② 새로고침이 조건을 버리고 ③ '이 조건 좀 봐주세요' 하며 URL 을 공유할 수 없다 | 상태='검토중' + 키워드 입력 → 행 클릭으로 상세 진입 → 브라우저 Back → **필터·키워드가 초기화돼 있으면 gap**. URL 을 새 탭에 붙여 넣어도 조건이 재현되지 않는다 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면을 감싸는 경계: `AppShell.tsx:484-493` 이 `<Outlet>` 바로 바깥에서 `ErrorBoundary` 로 감싸고(셸 유지), `App.tsx` 루트 경계가 셸 자체의 예외를 받는다. 이 화면은 자체 경계를 두지 않는 소비자다 | ErrorBoundary/AppShell 소유 문서 판정 | **종속** |
| EXC-02 | EXC | 상속 | 두 축 모두 이 화면 밖: ① 라우트 가드 — `RequireAuth` 가 `AppShell` **바깥**을 감싼다(`App.tsx`). ② 401 인터셉터 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` 가 `isUnauthorized` 를 보고 `notifySessionExpired()` 를 부른다(`shared/query/queryClient.ts`) — 이 화면의 조회·저장이 그 캐시를 통과하므로 자동 적용된다 | RequireAuth/queryClient 소유 문서 판정. **단 dirty 입력 보존은 별개** — §4.3 · EXC-19 | **종속** |
| EXC-03 | EXC | 직접 | **미충족(쓰기 게이팅 축).** read 가드는 상속으로 충족 — `AppShell.tsx:490-492` 가 `<Outlet>` 을 `RequirePermission` 으로 감싸 read 권한 없는 라우트에 `ForbiddenScreen` 을 그리고, 리소스는 `resourceIdForPath` 가 라우트에서 파생하므로 `/reservations/applications/:id` 같은 하위 라우트도 잎 `/reservations/applications` 의 리소스로 덮인다. **그러나 쓰기 컨트롤 게이팅이 이 화면에 없다** — `useRouteWritePermissions`/`useRouteCan` 을 `pages/reservations` 전체가 import 0건이다. '처리 저장' 버튼(`ApplicationDetailPage.tsx:268`)이 `update` 권한과 무관하게 렌더·활성되고, 서버 403 은 일반 실패 배너로 떨어진다(reconcile 없음) | update 권한 없는 역할로 상세 진입 → **'처리 저장' 버튼이 그대로 보이고 눌리면 gap**. `pages/reservations` 에 `useRouteCan` grep = 0 으로도 확인 | **gap** |
| EXC-04 | EXC | 직접 | **미충족.** ① **토큰 없음** — `Application` 에 `updatedAt`/`version` 이 없고(`types.ts:38-53`), 앱 전체에서 `If-Match` 는 회원 메모에만 존재한다(`shared/api/schema.d.ts` — 신청서 0건). ② **충돌 UI 없음** — 이 화면은 공용 `useCrudForm`(409/412 → 입력 보존 + 충돌 다이얼로그, `useCrudForm.ts:160-173`)을 쓰지 않고 저수준 `useCrudUpdate` 를 직접 쓴다(`ApplicationDetailPage.tsx:111`). 그래서 어댑터가 던지는 409(`crud.ts:71-73`)조차 `:157` 의 `setServerError('저장하지 못했습니다…')` 일반 배너로 뭉개진다. 입력이 화면 state 에 남는다는 점만 우연히 요구와 겹친다 | `?status=save:409` 로 상세 저장 → **충돌 다이얼로그 대신 일반 실패 배너가 뜨면 gap**. 'ghost saved' 는 어댑터의 존재 검사가 막으므로 발생하지 않는다(F2 가 고침) | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `onSave`(`ApplicationDetailPage.tsx:134-161`)에 **동기 제출 락도 멱등키도 없다** — 방어는 `:268` 의 `disabled={saving \|\| !dirty}` 뿐이고, `saving` = `update.isPending` 은 렌더를 거쳐야 반영되므로 그 틈의 빠른 두 번째 클릭이 두 번째 요청을 만든다. 공용 `useCrudForm` 은 `submitLockRef`(`:102,195-196`)와 제출 시도 단위 `idempotencyKeyRef`(`:112-117`)를 **둘 다** 갖지만 이 화면은 그 훅을 쓰지 않는다. **완화 요인**: `!dirty` 가 함께 걸려 있어 저장 성공 후 재조회가 값을 맞추면 재클릭이 막히고, 이 화면의 쓰기는 금액·발송이 아니다. 그러나 중복 저장은 §7.1 의 이력 중복으로 직결된다(같은 전이가 이력에 두 칸) | '처리 저장'을 응답 전에 빠르게 두 번 클릭(또는 Enter 연타) → 요청이 2건 발사되면 gap. `pages/reservations` 에 `submitLockRef`·`Idempotency` grep = 0 | **gap** |
| EXC-09 | EXC | 직접 | 충족. 저장 `onError` 가 `isAbort(cause)` 를 먼저 보고 **아무 통지 없이 빠져나간다** — `ApplicationDetailPage.tsx:155-158`(공유 predicate `shared/async.isAbort` 사용). 언마운트 시 진행 요청을 abort 한다(`:117-118` `controllerRef` cleanup). 취소가 실패 배너·토스트를 만들지 않고, 이 화면엔 일괄 작업이 없어 '부분 실패 count 에서 abort 제외' 축은 대상이 없다 | 저장 중 '목록으로' 클릭(언마운트) → **실패 배너·error toast 가 뜨지 않으면 pass**. `?fail=` 없이 정상 경로로 재현 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **4** | TOKEN-01 · FEEDBACK-04 · A11Y-11 · EXC-09 |
| `종속` | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · IA-01 · EXC-01 · EXC-02 |
| `N/A` | **4** | STATE-04 · FEEDBACK-06 · A11Y-12 · IA-05 |
| `gap` | **10** | STATE-01 · STATE-02 · COMP-10 · FEEDBACK-02 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-04 · EXC-08 |

**검산**: 4 + 12 + 4 + 10 = **30** ✓ (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30)

> **P0 gap 10건 — quality-bar '배치 실패' 사유다.** 그중 **직접 소유(이 화면 코드로 닫을 수 있는 것)가 10건 전부**다. 앱 전역 결정이 필요한 것은 없다 — IA-13·COMP-10 은 공용 훅(`useListState`·`useDebouncedSearch`)이 **이미 존재하는데 이 화면이 안 쓰는** 경우이고, STATE-01·EXC-04·EXC-08 은 공용 `useCrudList`/`useCrudForm` 이 **이미 고쳐 둔 것을 이 화면이 우회**하는 경우다(§4.2).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | STATE-01 과 같은 뿌리 — `useCrudListQuery` 의 `placeholderData`(`crud.ts:152`)가 이전 행을 쥐고 있으나 화면이 `isFetching` 을 loading 으로 써서 무력화한다. 가벼운 refetch 인디케이터도 없다(공용 `CrudListShell:120` 의 ' · 새로고침 중…' 미소비) | 데이터가 있는 상태의 필터 변경 → 이전 행 유지 여부 | gap |
| STATE-05 | P1 | 빈 상태가 `ApplicationListPage.tsx:196-201` 의 인라인 셀 1문구('신청서가 없습니다.')다 — 공용 `Empty`(3분기 copy + 검색 지우기/필터 초기화)를 쓰지 않는다. 검색으로 0건이 돼도 같은 문구라 '지울 검색어'를 권하지 못한다. **create CTA 는 정당하게 없다**(고객이 제출) | 키워드 'zzz' 입력 → '신청서가 없습니다.' 만 뜨고 '검색 지우기' 가 없으면 gap | gap |
| STATE-06 | P1 | 충족. `useCrudUpdate.onSuccess`(`crud.ts:198-201`)가 목록·상세 키를 **정확히** 무효화하고, 화면이 추가로 `detailQuery.refetch()`(`ApplicationDetailPage.tsx:153`)를 부른다 — 자기 변경이 즉시 보인다 | 상태 변경 저장 → 목록 복귀 시 배지가 갱신 | pass |
| COMP-01 | P1 | `ApplicationListPage.tsx:217-225` 의 '상세' 버튼이 DS `<Button>` 이 아니라 raw `<button>` + `buttonStyle('secondary')` + `className="tds-ui-btn-secondary"` 손조립이다. quality-bar 가 ApplicationListPage 를 appliesTo 에 **명시**한다 | 이 파일에 `buttonStyle(`·`tds-ui-btn-` grep > 0 이면 gap | gap |
| COMP-06 | P2 | 스켈레톤이 `length: 5` 하드코딩(`:187`)이고 셀 수를 `COLUMN_COUNT + 1`(`:189`)로 별도 관리한다. **PAGE_SIZE 가 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준 자체가 없다**(IA-04 gap 의 파생) | `length: 5` grep > 0 이면 gap | gap |
| COMP-07 | P2 | `SeqCell seq={index + 1}`(`:205`) — page offset 미반영. **정직한 한정: 이 화면에 Pagination 이 없으므로 지금은 재현 불가능한 잠복 결함이다** — 화면에 보이는 것이 전량이라 `index+1` 이 실제 위치와 항상 일치한다. IA-04 를 닫는 순간(Pagination 도입) 2페이지 첫 행이 1로 리셋된다 | 현재 재현 불가. Pagination 도입 후 page2 첫 행 seq === pageSize+1 인지로 판정 | gap(잠복) |
| COMP-08 | P2 | '상세' 버튼(`:217-225`)이 행 전체 클릭(`:204` `rowNavProps`)과 **같은 목적지**를 중복한다 — 읽기전용 테이블은 whole-row 클릭 + 행 내 링크 하나가 규칙이다. quality-bar 가 'Application(상세 제거)' 로 명시. **단 그냥 지우면 A11Y-08 이 깨진다** — 지금 이 버튼이 키보드 유일 경로다. 신청번호를 링크로 바꾸는 것이 정답 | 중복 '상세' secondary 버튼 존재 여부 | gap |
| COMP-09 | P2 | `applicantName`·`fields[].value` 에 truncation 이 없다 — 긴 값이 컬럼을 밀 수 있다 | 매우 긴 신청자명으로 테이블 폭 변화 관찰 | gap |
| COMP-11 | P1 | **N/A — 기간 필터가 이 화면에 없다.** 툴바는 검색 + 상태 select 뿐이다(`:126-154`). 접수일시 컬럼(`:206`)은 표시 전용이고 날짜로 거르는 표면이 없다. **접수일 범위로 신청을 추리는 것은 신청서 triage 의 기본 동작이라 부재 자체가 UX 결손이지만, 없는 필터에 `start ≤ end` 를 판정할 수는 없다** — 기능 요청으로 이관 | — (표면 없음) | N/A |
| COMP-12 | P2 | 처리 메모(`:254-262`)에 `maxLength={500}` 만 있고 실시간 카운터·경고가 없다. 500자에 닿으면 입력이 **예고 없이 멈춘다** | 메모에 500자 초과 입력 시도 → 카운터·경고 없이 잘리면 gap | gap |
| FEEDBACK-01 | P1 | 배치 규칙 자체는 지킨다 — read 실패=인라인 Alert(`:112`,`:166`) · write 성공=toast(`:152`) · write 실패=카드 내 배너(`:209`). 다만 저장 실패 배너에 '다시 시도' 가 없고 자동 소멸도 없다(수동 재클릭이 재시도) | 각 실패 유형의 통지 자리 확인 | pass |
| FEEDBACK-03 | P1 | 충족. 저장 mutation 이 성공(`:151-154` toast) · 실패(`:155-158` 배너) 양 경로에 피드백을 건다. no-op 없음 | `?fail=reservation-applications:save` → 가시 실패 | pass |
| FEEDBACK-05 | P2 | 비가역 종료 전이에 confirm 도 undo 도 없다 — FEEDBACK-02 와 같은 뿌리 | FEEDBACK-02 와 동일 | gap |
| A11Y-08 | P1 | 충족(우연히). `useRowNavigation` 은 **명시적으로 mouse-only** 이고 tabIndex 를 주지 않는다 — 접근 가능한 행 내 경로가 이미 있다는 전제 위에서만 쓰인다. 이 화면은 그 전제를 '상세' 버튼(`:217-225`, 접근 이름 `'<신청번호> 상세'`)으로 만족시킨다 | 행을 Tab → '상세' 버튼에 도달, Enter 로 같은 상세 열림 | pass |
| A11Y-13 | P1 | 폼 진입 시 첫 필드 포커스가 없고, 제출 검증 실패 포커스 이동도 없다 — **후자는 검증이 아예 없어서**다(BE-038 §1) | 상세 진입 시 activeElement 확인 | gap |
| A11Y-16 | P1 | 표 `aria-busy={loading}`(`:158`) · 스크린리더 caption(`:159-161`) · `aria-label` 배선(`:144`,`:221`)은 있다. **그러나 목록 상태를 알리는 지속 live region 이 없다** — 공용 `CrudListShell:107-109` 는 그것을 소유하지만 이 화면은 그 껍데기를 쓰지 않는다. 필터로 0행이 되는 전환이 AT 에 무음이다 | 필터 변경으로 0행 전환 → announce 여부 | gap |
| IA-03 | P1 | breadcrumb 이 없다 — 상세에서 '예약/신청 관리 > 신청서 > 처리' trail 부재. AppHeader 소유 | detail route 에 trail 렌더 여부 | gap(상속) |
| IA-07 | P1 | 충족. back-link 가 '목록으로' + `ChevronLeftIcon` + `<button>` + 좌상단(`ApplicationDetailPage.tsx:180-188`) — 앱 표준과 일치 | `ArrowLeftIcon`·'리스트로 돌아가기' grep = 0 | pass |
| IA-08 | P1 | 충족. footer 가 카드 안, secondary '목록으로' 좌 · primary '처리 저장' 우(`:264-271`) — `FormPageShell:179-191` 과 같은 배치 | 버튼 상대 위치 확인 | pass |
| IA-11 | P1 | 충족. 상세 읽기전용 필드가 `Card` + `CardTitle` + `dlStyle/dtStyle/ddStyle` + `StatusBadge`(`:200-227`) — 공유 primitive 사용, bespoke grid 없음 | dl/dt/dd 사용 여부 | pass |
| ERP-01 | P1 | 상태→tone 매핑이 **이 화면 로컬**이다 — `types.ts:77-83` 의 `STATUS_META`(received=neutral · reviewing=info · approved=success · rejected=danger · completed=success). 앱 공용 레지스트리가 없어 같은 의미의 상태가 화면마다 다른 색일 수 있다. 부작용도 관측된다: **승인·완료가 둘 다 success 라 배지 색만으로 구분되지 않는다**. 참고 — 같은 섹션의 상담 예약은 `_shared/booking.ts` 의 공용 맵을 쓴다(섹션 레지스트리는 있으나 앱 레지스트리는 없다) | 단일 export 된 map/함수가 status→tone 유일 소스인지 | gap |
| ERP-06 | P1 | 조회 요약이 '전체 N건'인데 N 은 **필터·검색 후** 건수다(`:156` — `visible.length`) — 낱말과 값이 어긋난다. 날짜·숫자는 `shared/format`(`formatDateTime`·`formatNumber`) 경유로 정상 | 상태 필터를 걸고 '전체 N건' 의 N 이 전체인지 확인 | gap |
| ERP-08 | P2 | 충족. 셀이 raw `toString()` 을 쓰지 않는다 — `formatDateTime`(`:206`) · `formatNumber`(`:156`) 경유 | 셀에 raw numeric toString grep = 0 | pass |
| ERP-12 | P1 | 엑셀 export 가 없다 — 신청서는 영업·법무 검토용으로 내보내기 수요가 큰 데이터다 | toolbar 에 export affordance 부재 | gap |
| ERP-13 | P1 | 이 화면의 사용자 대상 문구에 리터럴 '이(가)/을(를)/은(는)' 이 없다 — '신청서가 없습니다.'·'신청서를 불러오지 못했습니다.'·'처리 내용을 저장했습니다.' 는 고정 명사라 particle 이 하드코딩돼도 옳다. **단 `toTimelineEvents`(`types.ts:130`)의 `'<상태>(으)로 변경'` 이 리터럴 `(으)로` 를 렌더한다** — 이력 메모가 빈 칸에서 실제로 보인다 | 이력에 메모 없는 칸 → '검토중(으)로 변경' 이 보이면 gap | gap |
| EXC-05 | P1 | 프론트 타임아웃 상한 없음 — `AbortSignal.timeout` 앱 전역 0건. abort 는 언마운트에서만 | never-resolving fixture 로 무한 spin 확인 | gap |
| EXC-06 | P1 | 어댑터는 status 를 지닌 `HttpError` 를 던지지만(`crud.ts:55,72` · `dev.ts:84`) **이 화면이 status 로 분기하지 않는다** — 상세 실패도 저장 실패도 각각 문구 1개다. 403/404/409/422/429/500 이 전부 같아 보인다 | `?status=save:403` 과 `?status=save:409` 의 화면이 같으면 gap | gap |
| EXC-07 | P1 | 422 필드 매핑이 없다 — `HttpError.violations` 를 이 화면이 읽지 않는다. 공용 `useCrudForm:176-186` 은 `setError`+`setFocus` 로 구현하지만 이 화면은 그 훅 밖이다. **다만 이 화면엔 매핑할 폼 필드가 사실상 메모 하나뿐이다** | `?status=save:422` → 필드 인라인 에러 여부 | gap |
| EXC-11 | P1 | offline 감지 없음 — `navigator.onLine` 앱 전역 0건 | offline 토글 → 배너 여부 | gap(상속) |
| EXC-12 | P1 | 상세 조회 실패가 404 와 5xx 를 구분하지 않는다(`:163-174`) — 삭제·부재 id 로 들어와도 '불러오지 못했습니다' 다. 어댑터는 이미 404 `HttpError` 를 던지므로(`crud.ts:55`) 재료는 있다. 공용 `FormPageShell:115-143` 이 이 계약의 정본 구현 | 없는 id 로 상세 진입 → not-found 전용 문구인지 | gap |
| EXC-14 | P1 | **N/A — 낙관적 업데이트가 이 화면에 없다.** 저장은 비관적(요청 → 성공 → 재조회)이고 인라인 toggle/reorder 가 없다. 롤백을 요구할 optimistic write 가 0건이다 | — (표면 없음) | N/A |
| EXC-15 | P1 | **N/A — 파일 업로드가 이 화면에 없다.** 목록·상세 어디에도 이미지/파일 필드가 없다(`ApplicationListPage.tsx:4` 가 '목록엔 이미지 열이 없다' 로 명시). `ImageUploadField` import 0건 | — (표면 없음) | N/A |
| EXC-18 | P1 | **N/A — 행 선택·일괄 작업이 이 화면에 없다.** selection scope 를 정의할 대상이 없다 | — (표면 없음) | N/A |
| EXC-19 | P1 | 세션 만료 시 dirty 한 처리 입력이 사라진다 — 앱이 programmatic 이동을 하므로 FS-038-EL-021 가드가 발화하지 못한다. draft snapshot 없음 | dirty 상태에서 `?status=save:401` → 입력 보존 여부 | gap(상속) |
| EXC-20 | P1 | 500 의 참조 코드를 표시하지 않는다 — `HttpError.reference` 와 `referenceOf`(`http-error.ts:115-117`)가 이미 있고 `useCrudForm:189` 는 쓰지만 이 화면은 `setServerError` 문구만 쓴다. raw stack 노출은 없다(요구의 절반은 충족) | `?status=save:500` → 복사 가능한 reference code 여부 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 조회 응답 p95 | **≤ 400ms**(백엔드 연결 후) | 측정 불가 — 픽스처 | **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 인위 지연이며 성능 예산이 아니다.** 로딩 상태를 화면에서 볼 수 있게 넣은 상수일 뿐, 실제 서버 응답 목표와 무관하다. 혼동 금지 |
| 상세 조회 응답 p95 | ≤ 300ms | 측정 불가 — 픽스처 | 단건 조회 |
| 처리 저장 응답 p95 | ≤ 500ms | 측정 불가 — 픽스처 | 이력 append 포함 |
| 첫 렌더(목록 진입 → 표 가시) | ≤ 1s | — | 스켈레톤은 5행 고정(FS-038-EL-006) |
| **목록 재조회 횟수** | 진입당 1회 + `staleTime`(30초) 경과 후에만 | `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`(`shared/query/queryClient.ts`) | 창 포커스 재조회를 끈 것은 의도된 계약이다 |
| **응답 크기 · 메모리** | **상한 없음 — 이 화면의 실질 리스크다** | 신청 수에 **선형** | 서버 페이징이 없어(BE-038 §7.3) 전량을 받고, `history[]`·`fields[]` 를 **목록 응답에도** 싣는다(목록/상세가 같은 `Application` 타입 — BE-038 §3). 목록이 쓰지 않는 이력·커스텀 필드까지 매 조회마다 전송된다. 신청서는 고객이 만드는 무한 증가 컬렉션이라 시간이 갈수록 악화된다 |
| DOM 노드 | 상한 없음 | 행 수에 선형 | Pagination·virtualization 없음(IA-04 · ERP-15) |
| 저장 바디 크기 | 상한 없음 | **이력 길이에 선형** | 매 저장이 `history` 배열 **전체**를 되돌려 보낸다(FS-038-EL-022). 처리를 반복할수록 바디가 커진다 — BE-038 §7.1 이 이 왕복을 없앤다 |
| 번들 | 이 화면 고유 의존성 0 | — | 외부 라이브러리 추가 import 없음(DS + react-query + router 만) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 재시도 | 충족 (`ApplicationListPage.tsx:109-122`) |
| 상세 조회 실패 | 인라인 Alert + 재시도 + 404 구분 | **재시도 없음 · 404 미구분** (`:163-174`) |
| 저장 실패 | 입력 보존 + 원인별 복구 | 입력은 보존되나 **모든 원인이 한 문구** |
| 재조회 중 | 이전 행 유지 | **스켈레톤이 덮는다** (STATE-01) |
| 렌더 예외 | 셸 유지 + 복구 UI | 충족 — `AppShell.tsx:484-493` 경계 |
| 세션 만료 | 재인증 후 원래 경로 복귀 | 경로는 복귀하나 **dirty 입력 소실** |
| 다른 관리자 동시 처리 | 충돌 감지 + 해소 UI | **없다 — 마지막 쓰기 승리** (BE-038 §7.6) |
| 오프라인 | 배너 + write 게이트 | 없음(앱 전역) |
| 요청 무한 지연 | client timeout → 재시도 가능 실패 | 없음(앱 전역) |

> **이 화면의 복원력 결손은 대부분 '공용 프레임워크가 이미 가진 것을 안 쓴 결과'다.** `useCrudList`(STATE-01/03/05 해결) · `useCrudForm`(EXC-04/07/08/12/20 해결) · `CrudListShell`(A11Y-16 live region · STATE-05 Empty) · `useListState`(IA-13) · `useDebouncedSearch`(COMP-10) 가 전부 존재하고 다른 화면이 소비한다. **같은 섹션의 상담 예약(FS-039)이 그 프레임워크 위에 있고 이 화면은 아니다** — 두 화면의 P0 gap 수 차이(10 vs 6)가 그 선택의 비용이다.

### 4.3 데이터 보존 · 감사

| 항목 | 요구 | 현재 상태 |
|---|---|---|
| **처리 이력의 무결성** | 작성자·시각을 서버가 찍고 append-only | **클라이언트가 만든다** — `by='관리자'` 상수 · `at=new Date()` · `history` 배열 전체를 바디에 실어 보낸다(`ApplicationDetailPage.tsx:83-97,147`). **BE-038 §7.1 【보안 판정】이 서버 정본을 요구한다** |
| 처리 담당자 식별 | 이력에 실제 계정이 남는다 | **남지 않는다** — `PROCESSED_BY = '관리자'`(`:48`). 누가 반려했는지 기록이 없다 |
| 이력 id 유일성 | 서버 채번 | `'<id>-h<length+1>'` — 동시 처리 시 충돌 가능 |
| 접수 원문 불변 | 관리자 경로로 변경 불가 | **전체 치환 PUT 이 원문을 되돌려 보낸다** — BE-038 §7.4 |
| 신청서 삭제 | 감사 성격상 미삭제 | 충족 — 삭제 경로 0건(BE-038 §7.5) |
| **개인정보 보존·파기** | 보존 기간 만료 시 파기 | **미정** — 삭제 API 가 없는데 이름·연락처를 담는다(BE-038 §7.7 #8) |
| 연락처 마스킹 | 정책 정의 | **미정** — 픽스처가 마스킹 값을 담지만 서버 계약인지 불명(BE-038 §7.2) |

## 5. 미충족(gap) 요약 → 이관

**P0** (배치 실패 사유 — 10건)

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | STATE-01 | P0 | `ApplicationListPage.tsx:99` `isFetching: loading` → 재조회 시 표가 스켈레톤으로 덮인다. `useCrudList` 로 이관하면 닫힌다 | 이 화면 | A11 (FS-038 §7 — 신규) |
| 2 | STATE-02 | P0 | 상세 조회 실패 배너에 '다시 시도' 없음(`:163-174`) | 이 화면 | A11 (FS-038 §7 #9 · BE-038 §7.7 #2) |
| 3 | COMP-10 | P0 | 검색에 IME 조합·디바운스 없음. `useDebouncedSearch` 미사용 | 이 화면 | A11 (FS-038 §7 #3) |
| 4 | FEEDBACK-02 | P0 | 비가역 종료 전이(반려·완료)에 ConfirmDialog 게이트 없음 | 이 화면 | A11 (FS-038 §7 #1) |
| 5 | IA-02 | P0 | 상세에 `<h1>` 이 둘이고 상단이 브랜치 라벨 '예약/신청 관리' | 이 화면 + 앱 전역(`findNavLabel`) | A40 · A11 (FS-038 §7 #2) |
| 6 | IA-04 | P0 | Pagination 없음 — 무한 증가 컬렉션을 전량 렌더 | 이 화면 + 계약(BE-038 §7.3) | A11 · A63 (BE-038 §7.7 #7) |
| 7 | IA-13 | P0 | 필터·키워드가 `useState` 에만 있다(`:94-95`). `useListState` 미사용 | 이 화면 | A11 (FS-038 §7 — 신규) |
| 8 | EXC-03 | P0 | 쓰기 권한 게이팅 없음 — '처리 저장' 이 권한 무관 렌더 | 이 화면 (read 가드는 상속으로 충족) | A11 (BE-038 §7.7 #10) |
| 9 | EXC-04 | P0 | 동시성 토큰·충돌 다이얼로그 없음 — 409 가 일반 배너로 뭉개진다 | 이 화면 + 계약(BE-038 §7.6) | A11 · A63 (BE-038 §7.7 #3) |
| 10 | EXC-08 | P0 | 동기 제출 락·멱등키 없음 — `disabled={saving}` 만 | 이 화면 | A11 (BE-038 §7.7 #1 과 연동 — 중복 저장이 이력 중복이 된다) |

**P1 · P2** (표면이 실재하는 것만)

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 11 | STATE-03 | P1 | 재조회 인디케이터 없음 — STATE-01 과 같은 뿌리 | 이 화면 | A11 |
| 12 | STATE-05 | P1 | 빈 상태 3분기·복구 액션 없음(공용 `Empty` 미사용) | 이 화면 | A11 (FS-038 §7 #8) |
| 13 | COMP-01 | P1 | '상세' 버튼 손조립(`buttonStyle`+`tds-ui-btn-`) | 이 화면 | A11 (FS-038 §7 #4) |
| 14 | COMP-06 | P2 | 스켈레톤 `length: 5` 하드코딩 | 이 화면 | A11 (FS-038 §7 #5) |
| 15 | COMP-07 | P2 | `SeqCell seq={index+1}` — **Pagination 부재로 현재 재현 불가능한 잠복 결함**. #6 을 닫을 때 함께 고쳐야 한다 | 이 화면 | A11 (FS-038 §7 #5) |
| 16 | COMP-08 | P2 | '상세' 버튼이 행 클릭과 중복. **지우기 전에 행 내 링크를 만들어야 A11Y-08 이 유지된다** | 이 화면 | A11 (FS-038 §7 #4) |
| 17 | COMP-09 | P2 | 긴 텍스트 truncation 없음 | 이 화면 | A11 |
| 18 | COMP-12 | P2 | 메모 500자 카운터·경고 없음 | 이 화면 | A11 (FS-038 §7 #11) |
| 19 | A11Y-13 | P1 | 첫 필드 포커스·검증 실패 포커스 없음(검증 자체가 없다) | 이 화면 | A11 |
| 20 | A11Y-16 | P1 | 목록 상태 live region 없음(`CrudListShell` 미사용) | 이 화면 | A11 |
| 21 | ERP-01 | P1 | 상태→tone 이 화면 로컬 맵. 승인·완료가 둘 다 success | 앱 전역 | A11 (FS-038 §7 #7) |
| 22 | ERP-06 | P1 | '전체 N건' 의 N 이 필터 후 건수 | 이 화면 | A11 (FS-038 §7 #6) |
| 23 | ERP-12 | P1 | 엑셀 export 없음 | 앱 전역 | A11 |
| 24 | ERP-13 | P1 | `toTimelineEvents` 가 리터럴 '(으)로' 렌더(`types.ts:130`) | 이 화면 | A11 |
| 25 | EXC-05 | P1 | client timeout 없음 | 앱 전역 | A11 · A40 (FS-038 §7 #12) |
| 26 | EXC-06 | P1 | status 별 UX 분기 없음 — 모든 실패가 한 문구 | 이 화면 | A11 (BE-038 §7.7 #3) |
| 27 | EXC-07 | P1 | 422 필드 매핑 없음 | 이 화면 | A11 (BE-038 §7.7 #3) |
| 28 | EXC-11 | P1 | offline 감지 없음 | 앱 전역 | A11 |
| 29 | EXC-12 | P1 | 상세 404 vs 5xx 미구분 | 이 화면 | A11 (BE-038 §7.7 #2) |
| 30 | EXC-19 | P1 | 세션 만료가 dirty 입력을 버린다 | 앱 전역 | A11 · A40 (BE-038 §7.7 #9) |
| 31 | EXC-20 | P1 | 500 참조 코드 미표시(`referenceOf` 미사용) | 이 화면 | A11 (BE-038 §7.7 #4) |
| 32 | IA-03 | P1 | breadcrumb 없음 | 앱 전역 | A40 |
| 33 | COMP-11 | — | **기능 부재** — 접수일 기간 필터가 없다(요구는 N/A). 신청 triage 의 기본 동작이라 기능 요청으로 남긴다 | 이 화면 | A11 change_request |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래는 판정을 재현·반증하려는 사람을 위한 실제 스위치이며, 코드에서 확인한 것만 적는다.

**실패 재현 (`shared/crud/dev.ts`)** — 이 화면의 어댑터는 `createCrudAdapter({ scope: 'reservation-applications', … })`(`data-source.ts:137`)이므로 scope 문자열은 **`reservation-applications`** 다.

| 스위치 | 걸리는 op | 이 화면의 결과 |
|---|---|---|
| `?fail=list` · `?fail=reservation-applications:list` | `fetchAll` (`crud.ts:45`) | 목록 실패 배너(FS-038-EL-008) |
| `?fail=detail` · `?fail=reservation-applications:detail` | `fetchOne` (`crud.ts:50`) | 상세 실패 배너(FS-038-EL-012) |
| `?fail=save` · `?fail=reservation-applications:save` | `update` (`crud.ts:65`) | 저장 실패 배너(FS-038-EL-017) |
| `?fail=delete` · `?fail=reservation-applications:delete` | `remove` (`crud.ts:79`) | **이 화면에서는 발화하지 않는다** — 삭제 경로가 없다(BE-038 §7.5) |
| `?fail=all` | 위 전부 | — |

**status 재현 (`dev.ts:24-71`, F2 도입)** — `?status=<op>:<code>` · `?status=<scope>:<op>:<code>` · `?status=all:<code>`. 재현 가능한 code: `400·401·403·404·409·412·422·429·500`(`dev.ts:27-37`).

| 스위치 | 이 화면에서 관측되는 것 | 이 문서의 어느 판정을 반증/확증하는가 |
|---|---|---|
| `?status=save:409` | 충돌 다이얼로그가 **뜨지 않고** 일반 배너 | EXC-04 gap 확증 |
| `?status=save:422` | 필드 인라인 에러 **없이** 일반 배너 | EXC-07 gap 확증 |
| `?status=save:403` | 일반 배너(권한 문구 아님) | EXC-06 gap 확증 |
| `?status=save:500` | 일반 배너, **참조 코드 없음** | EXC-20 gap 확증 |
| `?status=save:401` | 앱 전역 인터셉터가 재인증 경로로 — **dirty 입력 소실** | EXC-02 종속 · EXC-19 gap |
| `?status=detail:404` | '신청서를 불러오지 못했습니다.' (5xx 와 동일 문구) | EXC-12 gap 확증 |

> **`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 존재하지 않는다 — `LATENCY_MS = 400` 고정 상수뿐이고, `?delay=` 는 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다. STATE-01 을 재현하려면 지연 대신 **`staleTime`(30초) 경과 후 재조회**(라우트 이탈 후 복귀)로 관측한다.

**그 밖**: lint/stylelint 0 warning(TOKEN-01) · `pnpm vitest run apps/admin/src/pages/reservations/applications`(순수 규칙 회귀 — `applications.test.ts`: 상태 전이·필터·검색·정렬·타임라인 환산 5 describe). **단 이 테스트는 순수 함수만 덮는다** — 화면 배선(STATE-01·EXC-08 등)을 검증하지 않으며, `canTransition` 은 **테스트에서만 호출된다**(BE-038 §7.3).

## 7. 자기 점검

- [x] P0 30건을 지정된 순서로 전수 판정했다 — 30행, 빈칸 0건
- [x] §2.1 산수 검산 — pass 4 + 종속 12 + N/A 4 + gap 10 = **30** ✓
- [x] 모든 `N/A` 에 '표면이 이 화면에 없다' 는 **구체적 사유**를 적었다(무엇이 없는지 + 코드 근거)
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 적었다. A11Y-11 은 pass 이되 **'대상이 없어서'라는 사유를 숨기지 않았다**
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 적었다. **재현 불가능한 것은 그렇다고 적었다** — COMP-07(Pagination 부재로 잠복) · COMP-10(네트워크 축은 클라이언트 필터라 재현 불가)
- [x] quality-bar 의 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] §6 의 `?fail=` scope 를 **어댑터 코드에서 확인**했다(`data-source.ts:137` `scope: 'reservation-applications'`). op 목록은 `crud.ts` 의 실제 호출부에서 확인. **`?delay=` 를 쓰지 않았고 이 화면에 없다는 사실을 적었다**
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 성능 예산이 아님을 §4.1 에 명시했다
- [x] §5 의 gap 이 FS-038 §7 · BE-038 §7.7 과 번호로 상호 참조된다
- [x] E2E 를 실행하지 않았고 판정 근거가 코드 대조임을 §6 머리에 명시했다
