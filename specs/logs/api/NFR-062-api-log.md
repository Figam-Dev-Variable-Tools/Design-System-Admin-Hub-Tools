---
id: NFR-062
title: "API 로그 비기능 명세"
functionalSpec: FS-062
backendSpec: BE-062
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-062. API 로그 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-062 API 로그 (`/logs/api`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-062(요소·예외) · BE-062(계약·보안 판정) · **NFR-060** — **4화면이 `LogListShell` 한 벌을 공유하므로 P0 판정이 대부분 겹친다.** 이 문서는 겹치는 판정도 **이 화면 고유의 근거**로 다시 확인해 적는다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면 또는 `logs/**` 공용 모듈의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · `HEAD = 4b805ad`** |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 또는 `logs/**` 섹션 공용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·`shared/**` 가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` / `gap` / `종속` | 코드 근거로 충족 / 미충족(§5 이관) / 소유 문서 판정을 따름 |

### 1.2 이 화면의 성격 — 부피가 가장 크고, 숫자 컬럼이 처음 등장한다

**이 화면은 읽기 전용 감사 목록이다** — 서버 상태를 바꾸는 요청이 0건이라 P0 30 중 **6건이 표면 부재로 N/A** 이고 전부 쓰기 축이다(NFR-060 §1.2 와 동일한 이유).

**형제들과 다른 것 셋이 §3 이하의 판정을 가른다**:

1. **부피가 압도적이다** — '관리자 로그의 수천 배'(`types.ts:99-102`). 그래서 보존기간이 90일로 가장 짧고, **ERP-15(렌더 캡)·EXC-05(타임아웃)·페이지네이션 점프 부재의 무게가 가장 크다.**
2. **숫자 컬럼(응답시간)이 처음 등장한다** — **ERP-04 의 'numeric tabular-nums' 절이 4화면 중 이 화면과 FS-063 에만 걸린다.**
3. **행위자가 사람이 아니라 키다** — 새는 것이 개인정보가 아니라 **자격증명**이다. §4.4 의 성격이 FS-061 과 완전히 다르다.

P0 판정은 형제(NFR-060)와 **동일하다** — 같은 셸이 결정하기 때문이다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **부분 미충족 — 네 번째 분기에서 깨진다.** 정상 경로는 정확하다: 스켈레톤은 **최초 로드에서만**(`LogListShell.tsx:258`), 재조회 중에는 `placeholderData: (previous) => previous`(`queries.ts:52`)가 이전 행을 유지, 0행일 때만 `<Empty>`(`LogTable.tsx:177-189`), 실패일 때만 Alert 가 표·요약·페이지네이션을 대체(`:233,278-293`) — 셋이 배타적 분기다. **그런데 기간 '직접 지정'이 유효하지 않으면 다섯 번째 상태가 `empty` 로 떨어진다**: `range === null` → `enabled: false`(`:152`)로 조회를 걸지 않는데, `:251-269` 는 `error === null` 이기만 하면 표를 그리고 `entries=[]`·`loading=false` 라 **`<Empty>` 가 렌더된다.** 조회가 성공하지 않았는데 empty 를 그린다 — 요약은 '조회 기간을 확인해 주세요.'라 하고 필터엔 인라인 오류가 뜬 채 **표는 '기록이 없다'고 단정한다** | `/logs/api?period=custom&from=2026-07-01&to=2027-01-01`(미래) → 필터 오류 + 요약 '조회 기간을 확인해 주세요.' + **표에 `<Empty>`.** 정상 경로 확증: `?fail=logs-api:list` → Alert 만 · 걸리지 않는 키워드 → Empty 만 · 재조회 중 → 이전 행 유지 | **gap** |
| STATE-02 | STATE | 직접 | **충족.** 조회 실패 시 `LogListShell.tsx:278-293` 이 요약·표·페이지네이션을 감추고 `<Alert tone="danger">` **'API 로그를 불러오지 못했습니다.'** + '다시 시도'(`refetch`)를 렌더한다. **read 실패로 토스트를 띄우지 않는다** — `toast` 호출은 내보내기 둘뿐(`:184,194`). 빈 상태로 폴백하지 않는다. `LogListShell.test.tsx:173-183` 이 셋을 전부 단언한다 | `/logs/api?fail=logs-api:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건 | pass |
| STATE-04 | STATE | 직접 | **충족 — 그리고 이 화면에서 clamp 의 값이 가장 크다.** ① **clamp** — `LogListShell.tsx:164-168` 이 `data.total` 로 총 페이지를 다시 계산해 범위를 벗어나면 마지막 페이지로 보정. **부피가 커 총 페이지가 수백일 수 있으므로**(§1.2) 필터를 좁혔을 때 out-of-range 로 떨어질 여지가 가장 크다. ② **조건 변경 시 page 리셋** — `list-state.ts:180-182` `resetPage` 를 축(`:277`)·기간(`:195`)·직접지정(`:207`)·검색어(`:219`)·크기(`:245`)가 전부 부른다. ③ **선택 리셋** — **선택이 없다**(체크박스 0개 — `LogTable.tsx:6-7`). selection 절은 **대상이 없다** | 상태 축을 '5xx'로 좁힘 → page 가 1로 리셋. `?page=999` 로 진입 → 마지막 페이지로 보정 | pass |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 스타일 표면 — `logs.css` · `ApiLogPage.tsx` 의 인라인 style(`:28-31,34,47-51` — `StatusCell`·`DurationCell` 의 색·굵기) · 공용 컴포넌트 — 이 전부가 `var(--tds-*)` 만 참조한다. **`apps/admin/src/pages/logs/**` 전체에 primitive 밖 hex · `[1-9]px` 리터럴 · bare border/outline 키워드 grep = 0**(내가 직접 실행). ⚠ **이 화면은 형제 중 유일하게 인라인 style 객체로 색을 준다**(`StatusCell`·`DurationCell`) — 그럼에도 전부 토큰이다(`--tds-color-feedback-danger-text` · `--tds-color-feedback-warning-text` · `--tds-primitive-typography-font-weight-bold`). ⚠ 의도된 예외 1건: `logs.css:86` `font-family: monospace`(§4.4) | `grep -rE "#[0-9a-fA-F]{3,8}\|[^-a-z0-9][1-9][0-9]*px\|(outline\|border):\s*(thin\|medium\|thick)" apps/admin/src/pages/logs/` → **0건**. lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면 — 정렬 헤더 버튼(`LogTable.tsx:150`) · 상세 열기 버튼(`:210`) · 필터 항목(`LogFilterPanel.tsx:75`) · DS 컴포넌트들 — 전부 `tds-ui-focusable` 계약을 상속. **자체 `:focus-visible` 규칙 0건**(`logs.css:41-42`). ⚠ **이 화면에는 in-row link 가 없다**(형제 FS-061 과 다르다) — 클라이언트에서 갈 레코드가 없다 | 판정은 DS 소유 문서를 따른다. `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **자체 `animation`/`transition` 선언 0건.** easing 토큰 소비 표면은 상속된 둘 — 내보내기 토스트 entrance(`Toast.css:26`)와 로딩 스켈레톤(`shared/ui/ui.css:83-95`) | 판정은 tokens codegen·`Toast.css` 소유 문서를 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | floating/overlay 표면 둘 — 상세 다이얼로그(`Modal.css:36` `var(--tds-shadow-modal)`) · 내보내기 토스트(`Toast.css:21` `var(--tds-shadow-overlay)`). **이 화면은 `box-shadow` 를 선언하지 않는다** | 판정은 DS·tokens 소유 문서를 따른다. `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **in-content `<h1>` 이 없다** — 제목은 AppHeader(IA-02). 계층은 필터 `<h2>`(`LogFilterPanel.tsx:64`) · 상세 `<h3>`(`LogPayloadDialog.tsx:88`) · 표 헤더/셀. **자체 titleStyle 0건** | 판정은 tokens typography·`AppHeader` 소유 문서를 따른다 | 종속 |
| COMP-10 | COMP | 직접 | **충족.** `LogListShell.tsx:122` 가 `useDebouncedSearch` 를 부르고 `:222` → `LogToolbar.tsx:81-87` 이 DS `SearchField` 의 native 패스스루로 흘린다. ① 조합 중 커밋 안 함(`useDebouncedSearch.ts:87`) ② 조합 중 Enter 미submit(`:121-124` — 이중 판정) ③ debounce 250ms(`:23,93-95`) ④ **stale 응답 무효** — 키워드가 쿼리 키의 일부(`queries.ts:21,37-40`). ⚠ **이 화면의 검색어는 한글이 아닐 때가 많다**(경로·요청 ID) — 그래도 IME 계약은 동일하게 걸린다(클라이언트 이름은 한국어다: '파트너사 정산 배치') | 검색창에 '정산' 을 IME 로 입력 → 조합 완료 + 250ms 후 URL `?q=` **1회** 갱신. 조합 중 Enter → 미제출 | pass |
| FEEDBACK-02 | FEEDBACK | N/A | **파괴적/비가역 액션이 없다.** 서버 상태를 바꾸는 요청 0건(BE-062 §7.5→BE-060 §7.5), `ConfirmDialog` 미import, ⋯ 액션 열·체크박스 0개. 내보내기는 **비파괴적**이다. ⚠ **표에 `DELETE` 메서드 행이 보이지만 그것은 로그의 값이지 이 화면의 액션이 아니다** — 이 화면은 그 DELETE 를 **기록으로 볼 뿐** 실행하지 않는다 | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **미저장 상태를 가질 폼이 없다** — RHF 미import, `isDirty` 대상 0개. 입력 셋(검색·기간 2칸)은 **조회 조건**이고 값이 즉시 URL 에 반영된다(`list-state.ts:201-226`) — **'미저장'이라는 상태가 원리적으로 존재하지 않는다** | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면의 modal 은 편집 가능한 폼을 담지 않는다.** `LogPayloadDialog` 는 읽기 전용 — 입력 0개, 푸터가 '닫기' 하나(`:66-70`), 본문은 `dl/dt/dd` + `<pre>`. dirty 해질 입력이 없어 4경로를 가드할 대상이 없다(`:4-8`) | 재현할 표면 없음 (modal 자체는 MOTION-01 · A11Y-02 에서 판정) | N/A |
| A11Y-01 | A11Y | 상속 | **이 화면은 토스트를 띄운다**(내보내기 — `LogListShell.tsx:184,194`). `ToastProvider` 의 **항상 마운트된 두 live region**(`:165,168`)이 이미 있다. 이 화면은 소비자다 | 판정은 `ToastProvider` 소유 문서를 따른다 | 종속 |
| A11Y-02 | A11Y | 직접 | **충족.** `LogPayloadDialog.tsx:58` 이 `useId()` 로 본문 id 를, `:63` 이 `describedBy={bodyId}` 를 넘기고 `:72` 가 그 id 를 본문에 단다. `Modal.tsx:158` 이 `aria-describedby` 로 배선. **제목(`'<메서드> <경로>'`)만이 아니라 본문(10개 필드 + 마스킹 안내 + 요청·응답)도 함께 읽힌다** | 스크린리더로 행을 열면 'POST /api/orders' 와 본문이 함께 읽힌다 | pass |
| A11Y-11 | A11Y | 직접 | **충족.** 폼 컨트롤 셋 — 검색 · 페이지 크기 · 기간 직접 지정. ① **aria-invalid without describedby = 0**: `DateRangeField` 가 **`aria-invalid` 를 항상 `aria-describedby` 와 짝지어 낸다**(`DateRangeField.tsx:44-45`. 유효할 때는 두 속성 모두 부여하지 않는다 — `:9-11`). `LogFilterPanel.tsx:152-159` 가 켠다. **`pages/logs/**` 의 `aria-invalid` grep = 1 이고 그 1건은 주석**. ② **required 노출**: **required 필드가 없다**(필터는 전부 선택적) | 종료일에 미래 입력 → 두 입력이 `aria-invalid` + `aria-describedby` 가 `role="alert"` `<p>` id 로 해석. 되돌리면 **두 속성이 모두 사라진다** | pass |
| A11Y-12 | A11Y | 직접 | **충족.** 좌측 필터의 모든 항목이 `aria-pressed={active}`(`LogFilterPanel.tsx:76` — `FilterGroup` 이 **상태·메서드**·기간 세 축을 전부 그린다). **`aria-current` grep = 0**. 스타일이 `filterItemStyle(active)` 라 **색과 ARIA 가 같은 `active` 에서 나온다** | '서버 오류 (5xx)' 클릭 → 그 버튼만 `aria-pressed="true"`. `aria-current` grep = 0 | pass |
| MOTION-01 | MOTION | 상속 | **미충족.** **Modal 표면을 실재로 갖는다**(`LogPayloadDialog` — FS-062-EL-016). `Modal` 에 enter/exit transition **없음**: `Modal.css:3-36` 이 전부 정적(유일한 `transition` 은 `:86` 의 닫기 버튼 배경색), `AnimatePresence` 부재 — **Motion 라이브러리 미도입**(`framer-motion`/`motion` 이 어느 `package.json` 에도 없다. 직접 확인). 조건부 렌더(`LogListShell.tsx:297`)라 **exit 없이 즉시 unmount.** **소유는 DS — 화면 코드로 해소 불가** | 상세를 열고 닫는다 → 즉시 pop in/out | **gap** |
| MOTION-02 | MOTION | 상속 | **미충족.** **토스트 표면을 실재로 갖는다**(내보내기 — FS-062-EL-017). entrance 는 있으나(`Toast.css:26`) **exit 없음** — `ToastProvider.tsx:100` 이 즉시 filter-out(요구의 근거 문장이 지목한 구현). **소유는 DS/shared** | 내보내기 → 토스트 → dismiss → fade 없이 사라진다 | **gap** |
| MOTION-03 | MOTION | 상속 | 모션 표면 **둘뿐이고 둘 다 게이트돼 있다** — 스켈레톤(`shared/ui/ui.css:110-114` → `animation-name: none`) · 토스트 entrance(`Toast.css:110-114` → `animation: none`). **이 화면 자신은 `transition`/`animation`/`transform` 을 하나도 선언하지 않는다**(`logs.css` grep = 0. `ApiLogPage.tsx` 의 인라인 style 도 색·굵기뿐이다). 나머지 절(글로벌 Motion config · `ToggleSwitch.css`)은 **이 화면의 표면이 아니다** | reduced-motion 을 켜고 진입 → 스켈레톤 정지 + 토스트 즉시 등장. ⚠ **MOTION-01/02 해소 시 재판정 필요** | 종속 |
| IA-01 | IA | 직접 | **충족.** `/logs/api` 가 `APP_ROUTES` 항목이고(`App.tsx:331`) 그 배열이 `<RequireAuth><AppShell/></RequireAuth>` 아래에서 렌더된다. **자체 outer frame 을 만들지 않는다** — 최상위가 `<div style={pageStyle}>`(`LogListShell.tsx:205`) | 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지 | pass |
| IA-02 | IA | 직접 | **충족.** `/logs/api` 는 `nav-config.ts:210` 의 **잎**(`['API 로그', '/logs/api']`)이라 `findCoveringLeaf`(`:269-279`)가 자기를 찾아 `findNavLabel` 이 AppHeader `<h1>` 에 **'API 로그'** 를 그린다 — 가지 라벨('로그 관리')로 폴백하지 않는다. ⚠ **`covers()` 가 세그먼트 경계에서만 매칭하므로**(`:255-257`) `/logs/api` 가 `/logs/api-archive` 같은 것을 삼키지 않는다 — **이 경로는 이름이 짧아 그 규칙의 수혜자다.** **in-content `<h1>` 이 없어 제목 소스가 하나뿐이다.** 하위 라우트가 없어 폴백 경로가 발생하지 않는다 | 진입 → AppHeader 제목이 'API 로그'. `document.querySelectorAll('h1').length === 1` | pass |
| IA-04 | IA | 직접 | **충족.** ① toolbar row — 검색 좌측, 액션 우상단(`LogToolbar.tsx:80-127`). **감사 로그에는 '등록'이 없으므로 우상단 primary 자리는 내보내기가 갖는다**(`:4-5`). ② count 요약(`LogListShell.tsx:235-249`). ③ SelectionBar — **bulk 없음 → 대상 없음**. ④ table. ⑤ **Pagination** — 페이지 크기 초과 가능하므로 렌더된다. **이 화면에서 그것이 가장 확실하다**(부피가 수천 배라 언제나 여러 페이지다) | 진입 → 좌측 필터 / 우측 [검색 … 크기·내보내기] → 요약 → 표 → 페이지네이션. 형제 3화면과 배치 동일 | pass |
| IA-05 | IA | N/A | **create/edit 폼이 없다** — leaf 이고(`App.tsx:331`, `/logs/api/*` 0건) **쓰기 라우트가 존재하지 않는다**(`:328`). `:id/edit` 로 해석될 대상 엔티티가 없다 — **감사 로그는 만들 수도 고칠 수도 없다** | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족 — 그리고 이 화면에서 실용적 가치가 가장 크다.** list query state 가 **전부 URL 에 있다**: page · size · filters(`?status`·`?method`·`?period`·`?from`·`?to`) · keyword(`?q`) · sort(`?sort`·`?dir`) — `list-state.ts:42-51` · `useSearchParams`(`:141`)가 유일한 저장소. **`useState` 로 든 조회 상태 0건**. ① 기본값은 URL 에 쓰지 않는다 ② push/replace 를 가른다(검색어만 replace) ③ URL 을 손으로 고칠 수 있음을 전제로 전부 검증(`:58-92`). ⚠ **부피가 커 총 페이지가 수백일 수 있는데 번호는 5개뿐이라**(§5 #8) **`?page=` 를 손으로 고치는 것이 실질적 점프 수단이다** — URL 이 열려 있는 것이 그 부재를 구제한다 | '5xx' + 'POST' + `/api/orders` 검색 + 응답시간 내림차순 → `?status=5xx&method=POST&q=%2Fapi%2Forders&sort=durationMs&dir=desc` → **새 탭에 복사 → 동일 view.** F5 → 동일. `?page=87` 로 직접 점프 가능 | pass |
| EXC-01 | EXC | 상속 | 렌더 예외는 `AppShell` 의 `<Outlet>` 바깥 ErrorBoundary 가, 셸 예외는 App 루트 경계가 잡는다. **자체 경계를 두지 않는다.** ⚠ throw 가 날 만한 자리 — `spec.detailOf(entry)`(`LogListShell.tsx:299`)와 `column.render(entry)`(`LogTable.tsx:214,222`)가 서버 데이터를 직접 만진다. **이 화면은 형제보다 안전한 편이다** — `statusClassOf`(`types.ts:35-39`)가 **어떤 숫자에도 계열을 돌려주고**(`< 400` 이면 2xx) `maskTail` 도 어떤 문자열이든 받는다. 대신 그 관대함이 §5 #6 의 원인이다. 페이로드 직렬화 실패는 스스로 잡는다(`masking.ts:177-181`) | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `<RequireAuth>`, mid-session 401 은 `queryClient` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리. 이 화면의 조회(`queries.ts:47-53`)가 그 캐시를 통과한다. **재인증 손실 0** — 보존할 입력이 없고 **조회 조건이 전부 URL 에 있다**(IA-13). ⚠ 내보내기는 `useMutation`(`:71-73`)이라 그 캐시를 안 탄다 — 401 이면 실패 토스트로(§3 EXC-06). ⚠ **로그 안의 401 과 혼동하지 말 것** — 이 행은 *이 화면 자신의* 세션 이야기다 | 판정은 `RequireAuth`·`queryClient` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **충족 — 두 층이 다 있고 테스트가 고정한다.** ① **read 게이팅** — `AppShell` 의 `<RequirePermission><Outlet/></RequirePermission>` 이 덮고 `route-resource.ts` 가 잎 `page:/logs/api` 로 해석해 403 화면을 그린다. **조회 요청 자체가 나가지 않는다** — `LogListShell.test.tsx:136-142` 가 단언(`:11-12`). **이 화면에서 그 단언이 특히 중요하다** — 받아 놓는 것이 **파트너사 API 키 원본**이다(BE-062 §7.2). ② **쓰기 게이팅** — 내보내기가 `useRouteCan('export')`(`LogListShell.tsx:115`)에 걸려 **권한이 없으면 버튼을 렌더하지 않는다**(`LogToolbar.tsx:117` — disable 이 아니라 부재). `LogListShell.test.tsx:144-150` 이 단언. ③ **강등 reconcile** — `useRouteCan` 이 스토어를 구독해 버튼이 사라진다 | read 끈 역할 → 403 + **표 없음 + 요청 0건**(키 원본을 받아 놓지도 않는다). export 만 끈 역할 → 표는 보이고 버튼 부재. ⚠ 서버 강제는 별개 — **`GET /api/logs/api/export` 직접 호출을 막는 것은 서버뿐이고 그 응답에는 키 원본이 실려 있다**(BE-062 §3.1 · §7.2) | pass |
| EXC-04 | EXC | N/A | **write 를 하지 않는다** — appliesTo 에 해당하는 표면 0개. 낙관적 동시성 토큰을 실을 요청이 없다. **감사 로그는 append-only 라 기존 행이 변경되는 사건 자체가 없다**(BE-060 §3.3 상속). `createStoreAdapter`/`createCrudAdapter` 를 쓰지 않고 자기 어댑터(`adapter.ts:30-54`)가 조회 둘뿐이다 | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **user-initiated write 가 없다** — appliesTo('useCrudForm, ConfirmDialog, 금액/생성/발송 mutation')에 해당하는 것 0개. **내보내기는 write 가 아니다** — 서버 상태를 바꾸지 않는 GET 이라 두 번 나가도 **파일이 두 번 받아질 뿐 서버가 갈라지지 않는다.** **중복 실행은 실질적으로 막혀 있다**: `Button.tsx:66,69-72` 가 `loading` 이면 `onClick` 을 발화하지 않고 `LogToolbar.tsx:120` 이 `loading={exporting}` 을 넘긴다 — 다만 `exporting` 이 비동기 state 라 **렌더 전 초고속 더블클릭은 2회 나갈 수 있다.** gap 으로 계상하지 않고 §4.3 에 기록한다(⚠ **이 화면에서는 그 2회가 분당 3회 제한의 2/3 를 소모하고 전량 스캔을 2번 돌린다**) | 재현할 표면 없음 | N/A |
| EXC-09 | EXC | 직접 | **충족 — 그리고 이 화면에서 취소의 값이 가장 크다.** ① **내보내기 취소** — '취소'(`LogToolbar.tsx:111-115` → `LogListShell.tsx:200-202`)가 `abort()` 를 발화하고 `onError` 가 `isAbort(cause)` 로 판정해 **토스트 없이 `exportLog.reset()`**(`:189-192`). 단일 공유 predicate(`shared/async.isAbort`). 주석이 그 필요를 밝힌다(`LogToolbar.tsx:109`: '**내보내는 중에는 그만둘 수 있어야 한다 — 90일치는 길다**') — **부피가 수천 배인 이 화면이 정확히 그 대상이다.** ② **조회 abort** — 조건 변경·이탈 시 react-query 가 signal 로 `wait(LATENCY_MS, signal)`(`adapter.ts:36`)을 끊는다. **취소된 쿼리는 `error` 를 안 세팅해 배너가 뜨지 않는다.** ③ **cache 무변경**(`queries.ts:6-9`). ④ bulk 절은 **대상 없음** | 내보내기 시작 후 '취소' → **토스트 0건**, 버튼 복원, 파일 미다운로드. 조회 중 다른 메뉴로 이동 → 배너·토스트 없음 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-02 · STATE-04 · TOKEN-01 · COMP-10 · A11Y-02 · A11Y-11 · A11Y-12 · IA-01 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **8** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **6** | FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · IA-05 · EXC-04 · EXC-08 |
| `gap` | **3** | STATE-01 · MOTION-01 · MOTION-02 |
| **합계** | **30** | 13 + 8 + 6 + 3 = **30** ✔ |

> **검산**: STATE 3(01 gap · 02·04 pass) + TOKEN 5(01 pass · 02·03·04·05 종속) + COMP 1(10 pass) + FEEDBACK 3(02·04·06 N/A) + A11Y 4(01 종속 · 02·11·12 pass) + MOTION 3(01·02 gap · 03 종속) + IA 5(01·02·04·13 pass · 05 N/A) + EXC 6(01·02 종속 · 03 pass · 04·08 N/A · 09 pass) = **3+5+1+3+4+3+5+6 = 30** ✔
>
> **P0 판정이 NFR-060·NFR-061 과 동일하다** — 같은 `LogListShell` 이 결정하기 때문이며 그것이 이 섹션 설계의 의도다(`logs/types.ts:229-232`). **판정이 겹치는 것이 곧 그 설계가 작동한다는 증거다.**
> **P0 gap 3건 — '배치 실패' 사유다.** 그중 **2건(MOTION-01·02)은 화면 코드로 해소 불가**(소유가 `packages/ui`). **화면이 스스로 고칠 수 있는 P0 gap 은 STATE-01 하나**다.
> **N/A 6건은 전부 쓰기 축이며 결함이 아니다**(§1.2). **다만 이 화면의 실질적 위험은 P0 표에 잡히지 않는다** — API 키의 마스킹 구조(§5 #12)와 3xx 접힘(§5 #6)이다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족.** `placeholderData: (previous) => previous`(`queries.ts:52`)로 전환 중 이전 목록 유지. ⚠ **`staleTime` 미지정**(기본 0) — 같은 조건 재진입 시 즉시 재조회. **감사 로그에서는 그것이 맞다**(방금 일어난 일을 봐야 한다). ⚠ **부피가 가장 큰 이 화면에서 그 비용이 가장 크다** — 매 재진입이 전량 스캔이다(연동 후) | 필터 전환 중 이전 행 유지. 같은 URL 재진입 → 즉시 재조회 | pass |
| STATE-05 | P1 | **충족.** 0행이면 DS `<Empty>` **3분기**(`LogTable.tsx:180-187` → `Empty.tsx:52-55`). 복구 수단이 분기마다 다르다(`list-state.ts:282-297`). **'등록' CTA 는 의도적으로 없다**(`LogTable.tsx:22-24`) | 걸리지 않는 경로 검색 → 검색 분기. 메서드를 'PUT'으로 좁혀 0건 → 필터 분기. ⚠ **기간 오류 시에도 뜬다** — §2 STATE-01 gap | pass |
| STATE-06 | P1 | **N/A(표면 부재) — 그것이 설계다.** write 0건이라 invalidate 할 것이 없다(`queries.ts:6-9`) | 재현할 표면 없음 | N/A |
| COMP-03 | P1 | **충족.** 검색이 DS `<SearchField>`(`LogToolbar.tsx:81-87`). `pages/logs/**` 에 `type="search"` grep = 0 | `type="search"` grep = 0 | pass |
| COMP-05 | P2 | **충족.** 좌측 필터가 `shared/ui` 의 `filter*Style` 6종을 import(`LogFilterPanel.tsx:18-28`) — 로컬 clone 0건 | 로컬 filter 스타일 선언 0건 | pass |
| COMP-06 | P2 | **충족.** 스켈레톤 행 = **페이지 크기**(`LogListShell.tsx:259`), 셀 = **실제 컬럼 수**(6). `length: 5` 하드코딩 없음 | 크기 100 → 스켈레톤 100행 × 6열 | pass |
| COMP-11 | P1 | **충족.** preset 4종 + `start ≤ end` 검증(`validation.ts:73-81`) + 범위가 URL 유지(`list-state.ts:201-211`). 그 위에 **미래 금지**(`:64-71`)와 **90일 상한**(`:83-91`)을 얹는다. ⚠ **이 화면에서 90일 상한이 보존기간과 같아 '전 기간'을 한 번에 조회할 수 있다**(BE-062 §7.5 — 의도인지 우연인지 근거 없음) | 시작>종료 → 인라인 오류 + 조회 미발행. 미래 → 전용 문구. 91일 → '(선택한 기간 91일)' | pass |
| A11Y-06 | P1 | skip link 는 `AppShell` 소유. 이 화면의 좌측 필터 Tab 정지점은 **12개**(상태 4 + 메서드 6 + 기간 4, 직접 지정이면 +2) | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 + announce 는 `AppShell` 소유 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-08 | P1 | **충족.** 행 클릭(`LogTable.tsx:196`)은 마우스 보조 수단이고 **첫 칸(시각)이 상세를 여는 진짜 버튼**이다(`:205-217` — `<button className="tds-ui-focusable">`). Tab 으로 닿고 Enter/Space 로 열린다(`:14-17`: '이 버튼이 없으면 키보드 사용자는 상세에 영원히 도달하지 못한다'). ⚠ **이 화면에는 in-row link 가 없다** — 클라이언트에서 갈 레코드가 없기 때문이다(형제 FS-061 은 회원 상세로 간다). **요구의 '모든 row-nav 에 keyboard focusable in-row link' 는 상세 열기 버튼으로 충족된다** | Tab → 첫 칸 → Enter → 상세. 행 빈 곳 클릭 → 같은 상세 | pass |
| A11Y-09 | P1 | 위험 토큰 쌍 — `feedback-danger-surface` 위 본문(5xx 행 `logs.css:23-25`) · **`feedback-warning-surface` 위 본문**(4xx·느림 행 `:31-33` — **이 화면이 warning 톤을 실제로 쓰는 유일한 형제 중 하나다**) · `feedback-danger-text`/`feedback-warning-text`(상태·응답시간 셀 `ApiLogPage.tsx:29-31,48`) · `surface-raised` 위 `text-default`(페이로드 `logs.css:84-85`) · `text-muted`(클라이언트 IP `cells.tsx:72`) | 판정은 tokens color 소유 문서를 따른다. ⚠ **warning surface 위 warning text 조합이 이 화면에 실재한다**(4xx 행의 상태 셀) — danger 쌍보다 대비가 낮기 쉬워 측정이 특히 필요하다 | 종속 |
| A11Y-16 | P1 | **N/A(표면 부재).** **신규 인터랙티브 컴포넌트를 만들지 않았다** — 표는 네이티브 `<table>`, 정렬은 `<th>` 안의 `<button>` + `aria-sort`, 필터는 `<button aria-pressed>`, 다이얼로그는 DS `Modal`. **`StatusCell`·`DurationCell` 은 인터랙티브가 아니다**(순수 표시 `<span>`) — a11y 계약의 대상이 아니다. **NFR-040 의 손수 만든 `role="grid"` 달력과 대조된다** | 재현할 표면 없음 | N/A |
| IA-03 | P1 | **N/A** — nav 의 잎이다(`nav-config.ts:210`) | 재현할 표면 없음 | N/A |
| IA-06 | P1 | **충족.** 상세를 라우트가 아니라 **다이얼로그**로 둔 판단이 무게 규칙에 맞는다(`LogPayloadDialog.tsx:15-18`). ⚠ **이 화면은 형제와 달리 밖으로 나가는 라우트가 아예 없다** — 클라이언트에서 갈 레코드가 없다. 무게 규칙의 한쪽만 쓴다 | 상세를 열어도 목록·필터·페이지가 뒤에 남는다 | pass |
| IA-11 | P2 | **충족.** 읽기 전용 레코드를 공유 `dl/dt/dd` 로(`LogPayloadDialog.tsx:75-82`) — 손수 만든 key/value 격자가 아니다. **10행으로 4화면 중 가장 길다** | 상세 필드 목록이 `<dl>` 시맨틱 | pass |
| IA-14 | P1 | **부분 충족.** 표 카드가 **bounded 가로 스크롤 컨테이너 안에** 있고(`LogListShell.tsx:82-85,251`) 2열 그리드가 `minmax(0, 1fr)`(`:51`). ⚠ **이 화면의 '경로' 컬럼이 wrap 이라**(유일) 긴 경로가 줄바꿈된다 — 좁은 폭에서 행 높이가 늘어난다. **미충족**: ① 좌측 필터 폭 **고정**(`@media` 0건) ② sticky 없음(ERP-03) ③ touch-target 미검증 | 768px·375px → 표 컨테이너가 가로 스크롤. **좌측 필터가 안 접혀 375px 에서 본문이 좁아진다** | 부분 pass — §5 |
| ERP-03 | P1 | **미충족 — 그리고 4화면 중 이 화면에서 가장 아프다.** sticky thead 없음(`pages/logs/**` 에 `sticky` grep = 0). **부피가 수천 배라 크기 100 이 가장 자주 쓰일 화면인데** 스크롤하면 **'상태'와 '응답시간'이 어느 컬럼인지 사라진다** — 숫자만 남은 표에서 축 라벨 상실은 치명적이다(NFR-040 §3 ERP-03 이 격자에 대해 같은 판정을 했다) | 크기 100 → 스크롤 → 헤더가 밀려난다 | gap |
| ERP-04 | P1 | **충족 — 4화면 중 이 화면이 이 요구를 가장 온전히 만족한다.** ① sortable header + `aria-sort` + keyboard + 글리프 ✔(`LogTable.tsx:146-168`). ② 정렬 가능 판정의 단일 원천 ✔ — `ApiLogPage.tsx:129` 가 `sortValues: apiLogSpec.sortValues` 로 **어댑터의 것을 그대로** 쓴다. **6개 컬럼 전부 정렬 가능**(`data-source.ts:28-36`). ③ **numeric tabular-nums** ✔ — **이 화면에 숫자 컬럼이 처음 등장한다.** `ApiLogPage.tsx:70` `numeric: true` → `LogTable.tsx:143,198-201` 이 헤더를 `textAlign: right`, 셀을 `numericCellStyle` 로. **그리고 정렬이 숫자 비교다**(`data-source.ts:31,34` — '문자열로 비교하면 90 이 1400 보다 크다'). 단위(ms)를 헤더로 올린 것도 그 계약의 일부다(`ApiLogPage.tsx:7-10`: '값마다 ms 가 따라다니면 그것이 자릿수 정렬을 다시 깨뜨린다'). ④ 정렬이 자르기보다 먼저 + 동점은 id ✔ — **이 화면에서 가장 중요하다**(같은 초에 여러 호출이 몰린다 — FS-062 §1.3). `logs.test.ts:453-456,533-538` 이 숫자 정렬을 고정 | '응답시간(ms)' 헤더 클릭 → `aria-sort` + URL `?sort=durationMs&dir=desc` → **느린 호출이 위로.** 우측 정렬 + 등폭이라 1400 과 980 의 자릿수가 맞는다. `logs.test.ts:453-456` 이 '90 < 1400' 을 단언 | pass |
| ERP-05 | P1 | **부분 충족 — 기능은 되나 DS 표면을 쓰지 않는다.** range('전체 N건 중 x–y' — `LogListShell.tsx:314-336`) · page-size selector(`LogToolbar.tsx:92-107`) · 경계 unit test(`logs.test.ts:468-500`)가 실재한다. **그러나 DS `Pagination` 의 opt-in 표면을 켜지 않았다** — `Pagination.tsx:41,112,170-173` 은 `pageSize` 를 넘기면 범위 + **`role="status"` announce** 를 그리는데 `LogListShell.tsx:271-276` 이 `page`·`totalPages`·`onChange`·`label` 만 넘긴다. **같은 개념이 두 곳에 있고 DS 의 announce 가 없다.** `:311-312` 의 주석이 **Pagination 1.1.0 기준으로 낡았다** | 범위·크기가 **보인다**(기능 충족). `Pagination` 에 `pageSize` prop grep = 0 → `role="status"` 요약이 DOM 에 없다 | 부분 pass — §5 |
| ERP-06 | P1 | **충족.** microcopy 가 존댓말로 일관되고 포맷이 `shared/format` 을 경유한다 — 숫자 `formatNumber`(`ApiLogPage.tsx:43,52,97,115-116`), 날짜 `formatDate`(파일명), 시각 `seoulTimeParts`(`time.ts:29`), 조사 `objectParticle`(`LogListShell.tsx:282`). **상태 계열 라벨이 코드와 뜻을 함께 말한다**('성공 (2xx)' — `types.ts:28-32`): '2xx' 만으로는 운영자가 못 읽는다. **단위를 헤더로 올린 규칙**도 microcopy 결정이다 | 표·CSV·상세의 시각이 전부 'YYYY-MM-DD HH:mm:ss'. 응답시간이 천 단위 구분 | pass |
| ERP-08 | P2 | **부분 충족.** 숫자가 `formatNumber` 경유 ✔(`ApiLogPage.tsx:43,52,97`). 미래 timestamp 없음(**감사 기록에 미래는 없다**). ⚠ **화면 셀에 `String()` 이 1건 있다** — `ApiLogPage.tsx:35` `` {`${String(entry.status)} ${kind}`} `` (4xx·5xx 셀). **요구의 문자('셀 raw toString=0')에는 어긋난다.** 다만 **값이 HTTP 상태 코드(식별자)이지 수량이 아니라** `formatNumber(200)` 도 `'200'` 을 내므로 **표시 결과가 같고 오히려 천 단위 구분이 붙으면 틀린다.** 2xx 분기(`:26`)는 `{entry.status}` 로 React 코어션이라 `String()` 이 없다 — **같은 값을 두 분기가 다르게 다룬다.** CSV 의 `String()` 2건(`data-source.ts:66-67`)은 **화면 셀이 아니다**(요구의 범위 밖) | `ApiLogPage.tsx` 에 `String(` grep = **1건**(`:35`). 그 값은 상태 코드다 | 부분 pass — §5 |
| ERP-09 | P2 | **충족 — 그리고 이 화면이 초 정밀도의 이유다.** 시각 판정이 **전부 KST 고정**(표시 `time.ts:29` · 프리셋 `period.ts:23` · 구간 `:32-36` · '오늘' `validation.ts:104` · 파일명 `LogListShell.tsx:182` · 픽스처 `fixture-lib.ts:43-44`). 정본은 `shared/format.ts:63` 이고 **앵커가 UTC 정오**(`:39-47`). **삼중 사본이 이 한 벌로 수렴했고 그 정본의 뿌리가 `logs/time.ts` 였다**(`shared/format.ts:31-36`). **이 파일에 남은 것은 초 정밀도 하나이고 그 요구가 정확히 이 화면의 것이다**(`time.ts:14-18`: '**1초에 40번 두드리는 API 호출은 분 단위로 보면 전부 같은 시각이 되어 순서가 사라진다. 무차별 대입인지 정상 트래픽인지를 가르는 것이 바로 그 순서다**'). 표시 기준이 화면에도 적힌다(FS-062-EL-006 · EL-016.2) | 브라우저 TZ 를 `America/Los_Angeles` 로 → 시각·프리셋·구간 경계가 서울 기준으로 동일. `logs.test.ts:98-102` 가 **초를 버리지 않음**을 단언한다(`'02:31:09'` ≠ `'02:31:41'`) | pass |
| ERP-12 | P1 | **충족 — 그리고 이 화면만 민감 열을 내보낸다.** ① 필터 전체 CSV(`adapter.ts:45-54`) + 성공 문구 명시. ② 한글 header 9열. ③ UTF-8 BOM. ④ progress = 스피너 + **취소 경로**(이 화면에서 값이 가장 크다 — '90일치는 길다'). ⑤ 화면과 같은 순서. ⑥ **API 키가 `maskTail` 로 가려져 나간다**(`data-source.ts:69`) — **4화면 중 유일. 근거가 명시돼 있다**(`:58-60`: '다른 화면의 CSV 는 민감한 열을 아예 빼지만, 여기서는 **어느 키가 401 을 맞고 있나가 곧 그 파일을 만드는 이유다**'). ⑦ **페이로드 열 없음** | 필터를 걸고 내보내기 → 조건 전체. API 키 열이 `●●●●b6a5` 로. 엑셀에서 한글 안 깨짐 | pass |
| ERP-13 | P1 | **충족.** 실패 배너가 조사 헬퍼 경유 — `LogListShell.tsx:282` → 'API 로그**를** 불러오지 못했습니다.' ⚠ **'API' 는 영문 약어인데 헬퍼가 그것을 받침 없음으로 처리한다** — `entityLabel` 이 'API 로그'라 **마지막 글자가 '그'(받침 없음)** 이므로 결과가 옳다. **`pages/logs/**` 에 사용자 대상 리터럴 '이(가)'/'을(를)'/'은(는)' = 0건** | 배너 문구가 'API 로그를' | pass |
| ERP-15 | P1 | **충족 — 그리고 4화면 중 이 화면에서 캡의 근거가 가장 크다.** '1,000행 virtualize/cap' 중 **cap** 을 택했고 근거가 명시돼 있다(`types.ts:178-183`). **캡이 우회 불가능하다** — `isPageSize`(`:196-198`)가 허용 목록 자체를 판정으로 쓰므로 `?size=5000` 도 20 으로 떨어진다. **부피가 관리자 로그의 수천 배인 이 화면이 정확히 그 계약의 대상이다.** 컬럼 6개 + 가로 스크롤 래퍼. ⚠ pin(sticky) 없음(§3 ERP-03) · **점프 수단 없음**(§5 #8) | `?size=5000` → 20줄. 최대 100행 × 6열 | pass |
| EXC-05 | P1 | **미충족 — 그리고 4화면 중 이 화면에서 가장 필요하다.** `AbortSignal.timeout` 앱 전체 0건. **부피가 수천 배라 서버 30초 상한이 실제로 물릴 유일한 화면이고**(BE-062 §3.3) 프론트에는 그 상한이 없다. **다만 내보내기에는 사용자 취소 경로가 있다**(FS-062-EL-009.1) — 조회에는 없다 | 응답 없는 백엔드 → 스켈레톤이 영원히 남는다. **거짓 사실을 단정하지는 않는다** | gap |
| EXC-06 | P1 | **미충족 — 그리고 이 화면에서 특히 아이러니하다.** `LogListShell.tsx:233` 의 `error === null` 하나로 401/403/429/500/504 가 전부 'API 로그를 불러오지 못했습니다.' 한 문구. **429(레이트리밋)도 같은 배너라 '잠시 후'라는 단서가 없다** — 부피가 커 429 가 실제로 날 수 있는 화면이다. **화면 자신은 상태 코드를 계열로 나누어 보여주는 것이 존재 이유인데**(FS-062 §1.2) **자기 실패의 상태 코드는 구분하지 않는다** | `?fail=logs-api:list` 와 서버 403·429 가 **같은 배너** | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 앱 전체 0건 | 오프라인 전환 → 오프라인 고지 없음 | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf). **상세는 라우트가 아니라 다이얼로그**이고 이미 손에 있는 행 객체로 그린다(BE-062 §7.2) — '없는 로그를 열었다'가 원리적으로 발생하지 않는다. **그리고 이 화면에는 밖으로 나가는 링크가 없어** 형제 FS-061 처럼 '삭제된 레코드로 이동'하는 경로도 없다 | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트 없음(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk·다중 선택 없음(체크박스 0개) | 재현할 표면 없음 | N/A |
| EXC-20 | P1 | **미충족 — 그리고 이 화면에서 가장 모순적이다.** 조회 실패 배너에 **참조 코드가 없다**(`LogListShell.tsx:280-292` 가 `referenceOf(cause)` 미사용). raw body·stack 은 노출하지 않으므로 후반은 충족. ⚠ **이 화면은 요청 ID 를 상세에 보여주며 그것을 '서버 로그와 대조하는 열쇠(EXC-20 의 reference)'라고 타입 주석에 명시한다**(`types.ts:57`). **즉 요구를 알고 그 값을 남에게 제공하면서 자기 실패에는 그것을 주지 않는다** | `?fail=logs-api:list` → 복사 가능한 코드 없음. **정작 성공했을 때는 행마다 요청 ID 가 있다** | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산 — **4화면 중 이 화면이 가장 무겁다**

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ `LATENCY_MS = 400` 은 **개발용 지연이며 성능 예산이 아니다.** **이 화면의 실제 예산이 4화면 중 가장 빡빡할 것이다** — 부피가 '관리자 로그의 수천 배'(`types.ts:101`) |
| DOM 규모 | **구조적 상한** — 최대 100행 × 6열 | `isPageSize` 화이트리스트 캡 | 로그가 1억 건이어도 표는 100행. ⚠ **'경로' 컬럼이 wrap 이라 행 높이는 가변** |
| CPU (현재 · 픽스처) | **O(N) per 조회** | `runLogQuery`(`query-engine.ts:142-156`) | ⚠ 기간 필터를 **두 번** 돈다(`:147-148`) — 배지 모수와 결과 모수가 달라 불가피. **부피가 가장 큰 이 화면에서 그 비용이 가장 크다.** 백엔드 연동 시 사라진다 |
| **서버 스캔** | ⚠ **미정 — 이 화면이 유일하게 30초 상한에 닿을 수 있다** | 조회 5초 / 내보내기 30초(BE-062 §3.3) | 90일치 = 전 보존기간이고(BE-062 §7.5) 부피가 수천 배다 |
| 재조회 횟수 | **조건 변경당 1회** | `staleTime` 미지정(기본 0) | **감사 로그에서는 그것이 맞다.** ⚠ 그러나 **재진입마다 전량 스캔**이 되므로 이 화면에서 재검토 여지가 있다(§3 STATE-03) |
| 페이로드 전송량 | ⚠ **측정 불가 · 상한 없음** | 목록 응답이 **모든 행의 요청·응답 본문 + API 키 원본**을 싣는다(BE-062 §7.2) | **행 수는 캡되지만 행의 크기는 캡되지 않는다.** 상세를 안 열어도 100건 전부 온다 |
| 마스킹 비용 | **열 때만 O(페이로드 크기)** + **행마다 `maskTail`** | `formatMaskedPayload` 는 다이얼로그에서만(`LogPayloadDialog.tsx:96`). ⚠ **`maskTail(entry.apiKey)` 은 상세 필드 조립 시 1회**(`ApiLogPage.tsx:100`), **CSV 는 행마다**(`data-source.ts:69`) | 목록 렌더에는 마스킹 비용이 0이다(키가 목록에 없다) |
| 번들 | **이 화면 전용 의존 0** | 4화면이 셸 한 벌 공유. zod/mini(+4.6kB) | 차트·집계 라이브러리 미도입 — 그래서 §4.3 의 질문들에 답하지 못한다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). status 분기 없음(§3 EXC-06) · 참조 코드 없음(§3 EXC-20) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤 + '불러오는 중…' |
| 0건 | 빈 상태 3분기 + 복구 | ✔ (§3 STATE-05) |
| **기간 입력 오류** | 원인이 자기 입력임을 알려야 | ✖ **요약·필터는 알리는데 표는 '기록이 없다'고 단정한다**(§2 STATE-01 gap) |
| 백엔드 무응답 | 상한에서 abort + 고지 | ✖ 조회는 무한 대기(§3 EXC-05). **이 화면에서 가장 필요하다.** 내보내기는 취소 가능 |
| **레이트리밋(429)** | '잠시 후' 안내 | ✖ 일반 실패 문구(§3 EXC-06). **부피가 커 실제로 날 수 있는 화면이다** |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ **손실 0 — 조회 조건이 URL 에 있다**(§2 EXC-02 · IA-13) |
| 권한 강등(mid-session) | UI reconcile | ✔ `useRouteCan` 이 스토어 구독 → 내보내기 버튼이 사라진다 |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | abort, 실패 아님 | ✔ 토스트 0건 + 상태 복원. **이 화면에서 값이 가장 크다** |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01 — 종속) |
| 페이로드 직렬화 실패 | 화면이 죽지 않아야 | ✔ `masking.ts:177-181` |
| **서버가 3xx 를 보냄** | 알 수 없음/리다이렉트로 표시 | ✖ **'성공 (2xx)' 으로 집계되고 강조 없이 `302` 로만 보인다**(`types.ts:34-39` — `< 400` 이면 무조건 2xx). **1xx·0·-1·999 도 전부 2xx 다.** 운영자가 리다이렉트 루프를 성공으로 읽는다(§5 #6) |
| 서버가 5종 밖 메서드를 보냄 | 알 수 없음을 표시 | △ **셀에는 그대로 그려지지만**(값을 그대로 렌더 — `ApiLogPage.tsx:64`) **축에서 고를 수 없다**(`types.ts:18,84` 가 상수에서 옵션 파생) — 필터로 좁힐 수 없다(§5 #7) |
| **짧은 API 키** | 뒤 4자 대조 | ✖ `maskTail` 이 **4자 이하 값을 통째로 가린다**(`masking.ts:80`) → CSV 의 'API 키' 열이 `●●●●●● [마스킹됨]` 이 되어 **그 열의 목적(폐기 대조)이 사라진다**(§5 #13) |

### 4.3 이 화면이 답하지 못하는 운영 질문

**§5 의 gap 이 아니라 범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '**어디가** 느리죠?' | **부분 가능** — 응답시간 정렬로 **개별 행**을 찾는다(`fixtures.ts:121-122`: '표에서 이것을 찾는 방법은 응답 시간 정렬 하나뿐이다'). **그러나 '어느 엔드포인트가 평균적으로 느린가'에는 답할 수 없다** — 경로별 집계·p50/p95 분포가 없다. 정산 집계가 1.4초인 것과 `/api/products` 가 1.4초인 것은 다른 사건인데 화면은 둘 다 '느림'이라 부른다(BE-062 §7.6 #7) |
| '404 를 낸 호출만' | 불가 — **낱개 코드로 좁힐 수단이 아예 없다.** 축은 계열(4xx)로만 나뉘고 검색은 경로·클라이언트·요청 ID·IP 만 본다(§5 #9). 축이 계열인 설계 자체는 타당하나(운영자는 계열로 묻는다 — `types.ts:22-24`) **낱개가 필요한 순간의 경로가 없다** |
| '이 키가 무엇을 했나' | **부분 가능** — 상세에서 키 뒷자리를 확인한 뒤 `client` 이름으로 좁힌다. **API 키로 직접 검색할 수는 없고 그것은 의도다**(BE-062 §7.3 — 검색어가 URL·공유 링크·서버 로그에 남는다) |
| '키별 사용량·호출 수' | 불가 — 집계가 없다 |
| '지금 일어나는 일' | 불가 — 실시간 tail 없음. **부피가 가장 큰 이 화면에서 그 부재가 가장 아쉽다** |
| '100페이지 뒤로' | **URL 로만 가능** — 번호가 5개뿐이고 첫/마지막 점프 버튼이 없다(§5 #8). `?page=` 를 손으로 고치는 것이 실질적 수단이다 |
| '`DELETE` 호출만 눈에 띄게' | 불가 — **메서드 셀이 색·배지 없이 글자만이다**(`ApiLogPage.tsx:64`). 이 섹션이 다른 곳에서 이중 인코딩을 일관되게 지키는데(결과·상태·느림·심각도) **메서드만 아무 강조가 없다** — `DELETE` 와 `GET` 이 같은 무게로 보인다(§5 #10) |
| '내보내기를 두 번 눌렀는데 파일이 두 개' | **가능한 일이다**(§2 EXC-08). 서버가 갈라지지 않아 무해하나 **여기서는 분당 3회의 2/3 를 쓰고 전량 스캔을 2번 돌린다** |

### 4.4 데이터 보존 · 감사 — **새는 것이 자격증명이다**

| 항목 | 상태 |
|---|---|
| 이 화면의 쓰기 | **없다** — 7개 층에 구조적으로 강제(BE-060 §7.5 상속. `logs.test.ts:55,59-72` 가 이 어댑터에 대해 단언) |
| **⚠ API 키가 `masking.ts` 의 단일 게이트 밖에 있다** | **`masking.ts:14-16` 의 설계 원칙은 '마스킹은 화면이 아니라 여기서 한다 — 컴포넌트가 각자 마스킹하면 한 곳만 빠뜨려도 유출이다'이고, `LogPayloadDialog.tsx:12` 는 '화면에 닿는 유일한 경로가 `formatMaskedPayload` 다'라고 못 박는다. 그 보호는 `payload` 트리에만 적용된다.** `apiKey` 는 **entry 의 최상위 필드**라 `maskPayload` 를 타지 않고, **화면(`ApiLogPage.tsx:100`)과 CSV(`data-source.ts:69`)가 각자 `maskTail` 을 부른다** — 정확히 그 파일이 없애려던 상황이다. **세 번째 호출부가 생기면 그 자리에서 잊을 수 있고 타입은 `apiKey: string` 이라 경고가 없다.** BE-062 §7.1 |
| **⚠ 어떤 테스트도 그것을 막지 않는다** | `logs.test.ts:304-311` 은 **페이로드의** `sk_live_` 만 단언한다(`formatMaskedPayload(entry.payload)`). **`entry.apiKey` 필드가 화면에 어떻게 그려지는지는 단언하지 않는다.** `:203-207` 은 `maskTail` 함수와 `maskPayload({ apiKey })` 를 단언하나 **후자는 키가 *페이로드 안에* 있을 때다.** 즉 **두 호출부 중 하나를 지워도 스위트는 초록색이다** |
| **마스킹의 성격** | ⚠ **표시 통제일 뿐 보안 통제가 아니다**(BE-062 §7.1 → BE-060 §7.1 상속). 원본이 브라우저에 도달한 뒤 렌더 직전에만 가려진다 — devtools 로 우회. `masking.ts:18-22` 가 이미 정직하게 적었다 |
| **페이로드 노출 면적** | ⚠ **목록·내보내기 응답이 전 행의 키 원본과 요청·응답 본문을 싣는다**(BE-062 §7.2). **화면이 의도적으로 감춘 값(키)이 네트워크로는 전량 온다.** 그리고 `payload.headers` 에 같은 키가 또 있다 |
| **그런데 여기엔 해결책이 있다** | ✔ **형제 FS-061 과 달리 `apiKey` 는 뺄 수 있다** — 화면·CSV 가 원본을 쓰지 않고 `maskTail` 의 **결과만** 쓰기 때문이다. **서버가 뒤 4자만 내려주면 두 호출부가 사라지고 §7.1·§7.2 가 함께 풀린다**(BE-062 §7.1 #1 · §6.1 #3). **구조 변경 없이 가능한 유일한 필드다** |
| 페이로드 마스킹의 품질 | ✔ **이 화면의 페이로드는 규칙에 가장 잘 걸린다** — `authorization` → redact(`masking.ts:51`), `x-api-key` → tail(`:54`). `logs.test.ts:304-311` 이 단언. **형제 FS-061 의 `address` 누락과 대조된다**(BE-061 §7.1) |
| **API 키 검색 부재는 계약이다** | ✔ `data-source.ts:25-26` — '키 전문을 입력해야 걸리는 검색은 **키를 화면에 붙여넣게 만든다**'. **이 앱에서 검색어는 URL(`?q=`)에 실리고 이 섹션은 링크 공유를 핵심 운영 루프로 설계했다**(`list-state.ts:4-10`). **API 키 검색은 키를 주소창·공유 링크·서버 액세스 로그에 남긴다 — 그리고 그 로그가 곧 이 화면이다.** BE-062 §7.3 이 계약으로 승격 |
| 보존기간 | ⚠ 화면이 '90일 · 자동 폐기'를 **단언**하는데 이행 주체가 없다(BE-062 §7.5 — 심 없음). ⚠ **그리고 조회 상한(90일)과 우연히 같다** — 이 화면은 '전 보존기간을 한 번에 받을 수 있는' 유일한 화면이고 그것이 의도인지 우연인지 근거가 없다. **두 상수가 서로를 모른다** |
| 개인정보 | **낮다** — 클라이언트 이름·IP 는 시스템 식별자다. **회원의 개인정보는 이 로그의 관심사가 아니다.** ⚠ 다만 **요청 본문(`payload.request.body`)에 그것이 들어올 수 있다** — `fixtures.ts:160` 의 `{ items: 2, couponCode: 'WELCOME10' }` 은 무해하나 `/api/members/me` PATCH 의 본문은 그렇지 않다 |
| **열람 감사** | ⚠ **없다**(BE-062 §7.6 #11 — 심 없음). **이 화면은 자격증명 지도라 그 필요가 크다** — `read` 를 가진 사람은 ① 어느 키가 살아 있는지 ② 그 키가 무엇을 부르는지 ③ 그 본문이 무엇인지를 본다 |
| 반출 통제 | ✔ `export` 를 `read` 와 분리해 프론트가 게이팅. **단 서버가 같은 판정을 안 하면 장식이고, 그 응답에는 키 원본이 실려 있다**(BE-062 §3.1 · §7.2) |
| 토큰 승격 후보 | `typography.font-family.mono` — `logs.css:86`(`:68-72`). TOKEN-01 의 문자에는 안 걸린다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-01** | **P0** | **기간 입력이 유효하지 않으면 조회가 걸리지 않았는데도 표가 `<Empty>` 를 그린다.** `LogListShell.tsx:152` 가 `enabled: false` 로 막는 것은 의도인데(`validation.ts:11-12`), `:251-269` 가 표를 그려 `entries=[]`·`loading=false` 가 빈 상태로 떨어진다. **화면 코드로 해소 가능** — 표 자리에 `range === null` 분기를 추가하면 된다 | 이 화면 + 4형제 공용(`LogListShell`) | **A11 change_request (FS-062 §7 #3)** |
| 2 | **MOTION-01** | **P0** | Modal 에 enter/exit transition 없음 — **Motion 라이브러리 미도입.** Modal 표면이 실재하므로 N/A 가 아니다. **화면 코드로 해소 불가** | 앱 전역(DS) | **A41 / DS** |
| 3 | **MOTION-02** | **P0** | toast exit 애니메이션 없음 — `ToastProvider.tsx:100` 이 즉시 filter-out. 토스트 표면이 실재하므로 N/A 가 아니다. **화면 코드로 해소 불가** | 앱 전역(DS) | **A41 / DS** |
| 4 | **ERP-03** | P1 | sticky thead 없음 — **4화면 중 이 화면에서 가장 아프다.** 부피가 수천 배라 크기 100 이 가장 자주 쓰일 화면인데 스크롤하면 **'상태'와 '응답시간'이 어느 컬럼인지 사라진다** — 숫자만 남은 표에서 축 라벨 상실은 치명적이다 | 이 화면 + 4형제 공용(`LogTable`) | A11 |
| 5 | ERP-05 | P1 | 범위 요약·크기 선택이 DS `Pagination` 의 opt-in 표면을 쓰지 않고 화면 사본으로 있다. **DS 의 `role="status"` announce 가 없다.** `LogListShell.tsx:311-312` 주석이 낡았다 | 이 화면 + 4형제 공용 | A11 · A41 (FS-062 §7 #6) |
| 6 | — | P1 | **⚠ 3xx·1xx·알 수 없는 값이 '성공 (2xx)' 으로 접힌다.** `statusClassOf`(`types.ts:35-39`)가 `< 400` 이면 무조건 2xx 다. 전제('리다이렉트를 쓰지 않는 JSON API' — `:34`)가 **명시적이나 강제되지 않는다.** 302 가 오면 성공 배지에 집계되고 표에서도 **강조 없이 `302`** 로만 보인다 — 운영자는 리다이렉트 루프를 성공으로 읽는다. **게이트웨이가 타임아웃을 `0` 으로 기록하면 그것도 '성공'이다.** quality-bar 의 어느 ID 에도 정확히 걸리지 않으나 **감사 화면에서 '성공'이라 부르는 칸에 성공이 아닌 것이 섞이는 것은 조용한 거짓말이다** | 이 화면 + 서버 계약 | **A63 · A11 (BE-062 §7.4)** |
| 7 | — | P1 | **서버가 5종 밖의 메서드(HEAD·OPTIONS)를 보내면 셀에는 그려지지만 축에서 고를 수 없다**(`types.ts:18,84`). 형제 화면의 라벨 맵 문제(NFR-060 §5 #9 · NFR-061 §5 #9)와 **같은 뿌리, 다른 증상** — 저쪽은 빈 셀, 여기는 못 고르는 값 | 이 화면 + 4형제 공통 패턴 | A11 · A63 |
| 8 | — | P1 | **총 페이지가 클 때 건너뛸 수단이 없다.** 번호는 주변 최대 5개뿐이고(`Pagination.tsx:24`) 첫/마지막 점프 버튼이 없다. **부피가 가장 큰 이 화면에서 그 부재가 가장 아프다** — 100페이지 뒤로 가려면 화살표를 100번 누르거나 `?page=` 를 손으로 고쳐야 한다(URL 이 열려 있는 것이 구제책 — IA-13) | 이 화면 + DS `Pagination` | A11 · A41 |
| 9 | — | P1 | **메서드·상태 코드로 검색할 수 없다**(`data-source.ts:27` — 4필드). 낱개 코드('404 를 낸 호출')로 좁힐 수단이 아예 없다 — 축이 계열로만 나뉜 설계의 대가다 | 이 화면 | A11 change_request (FS-062 §7 #9) |
| 10 | — | P2 | **파괴적 메서드(DELETE)가 시각적으로 구분되지 않는다.** 메서드 셀이 색·배지 없이 글자만이다(`ApiLogPage.tsx:64`). **이 섹션이 다른 곳에서 이중 인코딩을 일관되게 지키는데**(결과 ✕+글자 · 상태 색+계열명 · 느림 색+글자 · 심각도 색+글자) **메서드만 아무 강조가 없다** | 이 화면 | A11 change_request (FS-062 §7 #11) |
| 11 | **ERP-08** | P2 | 화면 셀에 `String()` 이 1건(`ApiLogPage.tsx:35` — 4xx·5xx 상태 셀). **요구의 문자에는 어긋나나** 값이 HTTP 상태 코드(식별자)라 `formatNumber` 가 오히려 부적절하다. **다만 2xx 분기(`:26`)는 React 코어션이라 `String()` 이 없어 같은 값을 두 분기가 다르게 다룬다** — 일관성 문제로만 남긴다 | 이 화면 | A11 (낮은 우선) |
| 12 | — | — | **⚠ BE-062 §7.1 (보안)** — **API 키가 `masking.ts` 의 단일 게이트 밖에서 두 호출부에 의해 각자 가려진다.** `masking.ts:14-16` 이 없애려던 바로 그 상황('컴포넌트가 각자 마스킹하면 한 곳만 빠뜨려도 유출이다'). **어떤 테스트도 그것을 막지 않는다**(`logs.test.ts:304-311` 은 페이로드만 단언 — 두 호출부 중 하나를 지워도 초록색). **최선의 조치는 서버가 뒤 4자만 내려주는 것** — 화면·CSV 가 원본을 쓰지 않으므로 두 호출부가 사라지고 §5 #13 도 함께 풀린다. **그때 마스킹 규칙(뒤 4자, 4자 이하는 전체 가림)을 계약으로 못 박아야** 파일 간 대조가 유지된다 | 이 화면 + 서버 | **A63 · A11 (보안 — 최우선)** |
| 13 | — | — | **BE-062 §7.2 (보안)** — 목록·내보내기 응답이 전 행의 **키 원본과 요청·응답 본문**을 싣는다. **화면이 의도적으로 감춘 값이 네트워크로는 전량 온다.** ⚠ **짧은 키는 `maskTail` 이 통째로 가려**(`masking.ts:80`) CSV 의 'API 키' 열이 대조 불가가 되고 **그 열의 목적이 사라진다.** EP-02 에서 `payload` 제거도 필요(**projection 타입이 아직 없다**) | 이 화면 + 서버 + 타입 | **A63 · A11 (보안)** |
| 14 | — | — | **BE-062 §7.5** — **보존기간(90일)과 조회 상한(90일)이 서로를 모른다.** 이 화면은 '전 보존기간을 한 번에 받을 수 있는' 유일한 화면이고 그것이 의도인지 우연인지 근거가 없다. 보존기간이 60일이 되면 90일 조회는 언제나 빈 앞부분을 갖고(그것이 정확히 보존기간을 화면에 적기로 한 이유를 무너뜨린다), 180일이 되면 앞 90일은 볼 수 없다 | 도메인 | **A63 · A01** |
| 15 | — | — | **BE-062 §7.6 #7** — **느림 임계(`SLOW_THRESHOLD_MS = 1000`)가 클라이언트 상수다.** 근거는 적혀 있으나 **엔드포인트마다 기대치가 다르다** — 정산 집계 1.4초와 `/api/products` 1.4초는 다른 사건인데 화면은 둘 다 '느림'이라 부른다 | 도메인 | A63 · A01 |
| 16 | — | — | **BE-062 §7.6 #8 · #11** — **내보내기 행 수 상한 미정 — 4화면 중 가장 위험하다**(부피 수천 배 · 90일 = 전 보존기간). 서버 30초 상한이 실제로 물릴 유일한 화면이다 · **열람 감사 부재**(자격증명 지도라 필요가 크다) | 도메인 | **A63 · A01** |
| 17 | EXC-05 · EXC-06 · EXC-11 · EXC-20 | P1 | 클라이언트 타임아웃 없음(**이 화면에서 가장 필요**) · 실패가 status 를 안 보고 한 문구로 붕괴(**429 가 실제로 날 수 있는 화면인데 '잠시 후' 단서가 없다**) · 오프라인 감지 없음 · **참조 코드 없음**(⚠ **화면 자신은 요청 ID 를 'EXC-20 의 reference' 라 부르며 상세에 보여주면서 자기 실패에는 안 준다**) | 이 화면 + 앱 전역 | A11 · A40 · A41 (FS-062 §7 #15·#16) |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며 실행 결과가 아니다.

### 6.1 실패 재현 (`?fail=`) — 이 화면의 실제 scope 와 op

**이 화면의 scope 는 `'logs-api'` 다**(`data-source.ts:16`).

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ `adapter.ts:37` | FS-062-EL-015 조회 실패 배너 |
| `export` | ✔ `adapter.ts:52` | FS-062-EL-017 실패 토스트 + 다시 시도 |
| `detail` · `save` · `delete` | ✕ — **부르지 않는다** | 해당 없음. **상세는 조회가 아니고 쓰기는 존재하지 않는다** |

```
/logs/api?fail=list              조회 실패 → STATE-02 확증
/logs/api?fail=logs-api:list     위와 동일(스코프 명시 — 형제는 멀쩡하다)
/logs/api?fail=export            내보내기 실패 → 토스트 + 다시 시도
/logs/api?fail=all               둘 다
```

### 6.2 P0 gap · 결함 재현

```
# STATE-01 gap — 조회가 걸리지 않았는데 빈 상태가 뜬다
/logs/api?period=custom&from=2026-07-01&to=2027-01-01
  → 필터 오류 + 요약 '조회 기간을 확인해 주세요.' + 표에 <Empty>   ← gap

# §5 #6 — 3xx 가 '성공' 으로 접힌다 (픽스처에는 3xx 가 없어 서버 연동 후에만 재현된다)
  statusClassOf(302) === '2xx'   (types.ts:35-39 — `< 400` 이면 무조건 2xx)
  → 302 행은 강조 없이 `302` 로만 보이고 '성공 (2xx)' 배지에 집계된다
  → statusClassOf(0) === '2xx' · statusClassOf(999) === '2xx' 도 같다

# §5 #12 — API 키가 masking.ts 의 게이트 밖에 있다 (코드 대조로 확인)
  grep -rn "maskTail" apps/admin/src/pages/logs/
    → api/data-source.ts:6,69   (CSV 열)
    → api/ApiLogPage.tsx:16,100 (상세 필드)
    → masking.ts:79             (정의)
  → 두 호출부가 각자 부른다. maskPayload 를 타지 않는다(그것은 payload 전용).
  → logs.test.ts 에 `entry.apiKey` 필드의 화면 표시를 단언하는 테스트가 없다

# MOTION-01 / MOTION-02
상세를 열고 닫는다 → 즉시 pop in/out (exit 없음)
내보내기 → 토스트 → dismiss → 즉시 사라진다 (fade 없음)
```

### 6.3 pass 확증 스위치

```
# ERP-04 — 숫자 컬럼 (이 화면에 처음 등장)
'응답시간(ms)' 헤더 클릭 → ?sort=durationMs&dir=desc → 느린 호출이 위로
  → 우측 정렬 + tabular-nums 라 1,400 과 980 의 자릿수가 맞는다
  → logs.test.ts:453-456 이 '90 < 1400'(수의 크기) 을 단언
/logs/api?sort=durationMs&dir=desc → 픽스처의 3,880ms(정산 집계)가 맨 위

# IA-13 — URL 이 곧 view (부피가 커 점프 수단으로도 쓰인다)
/logs/api?status=5xx&method=POST&sort=durationMs&dir=desc&size=100&page=3
  → 새 탭에 복사 → 동일 view. 기본값은 URL 에 없다

# EXC-03 — 권한 게이팅
read 끈 역할   → 403 화면 + fetchPage 호출 0건 (API 키 원본을 받아 놓지도 않는다)
export 끈 역할 → 표는 보이고 내보내기 버튼 부재

# EXC-09 — 취소 (이 화면에서 값이 가장 크다 — '90일치는 길다')
내보내기 시작 → '취소' → 토스트 0건 + 버튼 복원 + 파일 미다운로드

# ERP-09 — 초 정밀도 (이 화면이 그 요구의 이유다)
logs.test.ts:98-102 — formatLogTime('…02:31:09Z') !== formatLogTime('…02:31:41Z')
브라우저 TZ 를 America/Los_Angeles 로 → 시각·'오늘'·구간 경계가 서울 기준으로 불변

# ERP-15 — 렌더 캡 (부피가 수천 배인 이 화면이 그 계약의 대상이다)
/logs/api?size=5000 → 20줄
```

### 6.4 단위 테스트 (이 화면의 판정을 고정하는 것)

| 파일 | 고정하는 판정 |
|---|---|
| `logs.test.ts:55,59-72` | **감사 불변성** — 이 화면 어댑터의 export 목록 전수(`apiLogSpec`·`fetchApiLogs`·`fetchApiLogsForExport`·`toCsv`) + 쓰기 이름 0건 |
| `logs.test.ts:82-107` | **ERP-09** — KST 고정 · **초 정밀도**(`:98-102` — 이 화면이 그 요구의 이유다) |
| `logs.test.ts:144-176` | **COMP-11** — 미래·역전·90일·형식 |
| `logs.test.ts:180-274` | **마스킹** — 토큰·`authorization`·`x-api-key`(tail) · 중첩 · 원본 불변 |
| `logs.test.ts:203-207` | **`maskTail`** — `'sk_live_9f2a7c41d8e3b6a5'` → `'●●●●b6a5'` · `maskPayload({ apiKey })`. ⚠ **`entry.apiKey` 필드의 화면 표시는 단언하지 않는다**(§5 #12) |
| `logs.test.ts:226-228` | **짧은 값은 뒤 4자도 안 남긴다** — `maskTail('1234') === REDACTED_LABEL`. ⚠ **그것이 §5 #13 의 근거다**(짧은 키는 CSV 에서 대조 불가) |
| `logs.test.ts:304-311` | **이 화면의 페이로드에서 `sk_live_` 가 사라지는가** — `formatMaskedPayload(entry.payload)` |
| `logs.test.ts:331-336` | **픽스처 규율** — `clientIp` 가 문서용 대역(RFC 5737) |
| `logs.test.ts:407-507` | **ERP-04** — AND 결합 · 정렬 → 자르기 순서 · **숫자 정렬**(`:453-456`) · 결정성 · 배지 모수 |
| `logs.test.ts:533-538` | **이 화면의 응답 시간이 숫자로 비교되는가** — `typeof durationOf(API_LOGS[0]) === 'number'` |
| `LogListShell.test.tsx:125-170` | **EXC-03** — read 403 + 요청 0건 · export 버튼 부재 |
| `LogListShell.test.tsx:172-184` | **STATE-02** — 인라인 배너 + 다시 시도 · 토스트 아님 |
