---
id: NFR-063
title: "오류 로그 비기능 명세"
functionalSpec: FS-063
backendSpec: BE-063
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-063. 오류 로그 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-063 오류 로그 (`/logs/errors`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-063(요소·예외) · BE-063(계약·보안 판정) · **NFR-060 · NFR-061 · NFR-062** — **4화면이 `LogListShell` 한 벌을 공유하므로 P0 판정이 대부분 겹친다.** 이 문서는 겹치는 판정도 **이 화면 고유의 근거**(자기 컬럼·자기 축·자기 픽스처)로 다시 확인해 적는다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면 또는 `logs/**` 공용 모듈의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · `HEAD = a5c2639`** |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 또는 `logs/**` 섹션 공용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·`shared/**` 가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` / `gap` / `종속` | 코드 근거로 충족 / 미충족(§5 이관) / 소유 문서·DS 판정을 따름 |

### 1.2 이 화면의 성격 — 마지막 화면이고, **모든 행이 이미 사건이다**

**이 화면은 읽기 전용 감사 목록이다** — 서버 상태를 바꾸는 요청이 0건이라 P0 30 중 **6건이 표면 부재로 N/A** 이고 전부 쓰기 축이다(NFR-060 §1.2 와 동일한 이유). 그리고 **이 화면은 거기서 한 걸음 더 간다**: 오류 추적 도구의 표준 기능인 '해결됨' 토글조차 만들지 않았다(`errors/types.ts:6-10`). 그래서 FEEDBACK-02 의 '재현할 표면 없음'이 4화면 중 가장 넓다.

**형제 셋과 다른 것 넷이 §2 이하의 판정을 가른다**:

1. **강조 없는(neutral) 행이 하나도 없다 — 유일하다.** `toneOf`(`ErrorLogPage.tsx:70-72`)가 `warning` 이면 warning, **나머지 전부 danger** 를 준다 — neutral 분기가 **없다**. 형제 셋은 정상 행이 neutral 이라 강조가 도드라지는데 이 화면은 표 전체가 색으로 덮인다. **그 결과가 A11Y-09 에 직접 걸린다**(§3 · §5 #8).
2. **행위자가 없다** — `ErrorLogEntry`(`errors/types.ts:38-59`)에 actor/member/client/**ip** 필드가 없다. 그래서 §4.4 의 성격이 셋 모두와 다르다: 새는 것이 개인정보(FS-061)도 자격증명(FS-062)도 아닌 **내부 구조**다(BE-063 §3.1). **그런데 개인정보가 그 안에 섞여 들어왔다** — 그것이 이 배치의 최우선 발견이다(§4.4 · §5 #13).
3. **컬럼이 5개로 가장 적다**(`ErrorLogPage.tsx:41-68`) — 가로 스크롤 압력(IA-14)과 DOM 규모(ERP-15)가 4화면 중 가장 가볍다.
4. **숫자 컬럼(발생 횟수)이 있다** — FS-062 와 이 화면에만 있다. **그리고 이 화면이 ERP-08 을 더 온전히 만족한다**(§3 — 화면 셀의 `String()` 이 0건이다. FS-062 는 1건).

P0 판정은 형제 셋과 **동일하다** — 같은 셸이 결정하기 때문이다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **부분 미충족 — 네 번째 분기에서 깨지고, 이 화면에서 결과가 가장 무겁다.** 정상 경로는 정확하다: 스켈레톤은 **최초 로드에서만**(`LogListShell.tsx:258` — `loading && data === undefined && range !== null`), 재조회 중에는 `placeholderData: (previous) => previous`(`queries.ts:52`)가 이전 행을 유지, 0행일 때만 `<Empty>`(`LogTable.tsx:177-189`), 실패일 때만 Alert 가 요약·표·페이지네이션을 대체(`:233,278-293`) — 셋이 배타적 분기다. **그런데 기간 '직접 지정'이 유효하지 않으면 다섯 번째 상태가 `empty` 로 떨어진다**: `range === null` → `enabled: false`(`:152`)로 조회를 걸지 않는데, `:251-269` 는 `error === null` 이기만 하면 표를 그리고 `entries=[]`·`loading=false` 라 **`<Empty>` 가 렌더된다.** **이 화면에서 그 빈 상태는 '기록된 오류 로그가 없습니다' = 좋은 소식으로 읽힌다**(FS-063 §7 #12) — 요약은 '조회 기간을 확인해 주세요.'라 하고 필터엔 인라인 오류가 뜬 채 **표는 '깨진 게 없다'고 단정한다. 거짓 안심이 거짓 불안보다 위험하다** — `validation.ts:11-12` 가 없애려던 바로 그 거짓 빈 상태다 | `/logs/errors?period=custom&from=2026-07-01&to=2027-01-01`(미래) → 필터에 '미래 날짜는 조회할 수 없습니다' + 요약 '조회 기간을 확인해 주세요.' + **표에 `<Empty>`.** 정상 경로 확증: `?fail=logs-errors:list` → Alert 만 · 걸리지 않는 키워드 → Empty 만 · 재조회 중 → 이전 행 유지 | **gap** |
| STATE-02 | STATE | 직접 | **충족.** 조회 실패 시 `LogListShell.tsx:278-293` 이 요약·표·페이지네이션을 감추고 `<Alert tone="danger">` **'오류 로그를 불러오지 못했습니다.'** + '다시 시도'(`refetch`)를 렌더한다. **read 실패로 토스트를 띄우지 않는다** — `toast` 호출은 내보내기 둘뿐(`:184,194`). 빈 상태로 폴백하지 않는다. 주석이 이유를 밝힌다(`:13-16`: '감사 로그가 **비어 있는 것**과 **못 불러온 것**이 구분되지 않는다'). **이 화면에서 그 구분이 가장 절실하다** — 여기서 '비어 있는 것'은 좋은 소식이기 때문이다. `LogListShell.test.tsx:173-183` 이 셋을 전부 단언한다 | `/logs/errors?fail=logs-errors:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건. `queryByRole('table')` 이 null | pass |
| STATE-04 | STATE | 직접 | **충족.** ① **clamp** — `LogListShell.tsx:164-168` 이 `data.total` 로 총 페이지를 다시 계산해 범위를 벗어나면 마지막 페이지로 보정. ② **조건 변경 시 page 리셋** — `list-state.ts:180-182` `resetPage` 를 축(`:287`)·기간(`:195`)·직접지정(`:207`)·검색어(`:229`)·크기(`:245`)가 전부 부른다. **이 화면의 축은 심각도·발생 위치 둘**이고 둘 다 그 경로를 탄다. ③ **선택 리셋** — **선택이 없다**(체크박스 0개 — `LogTable.tsx:6-7`). selection 절은 **대상이 없다** | 심각도를 '치명'으로 좁힘 → page 가 1로 리셋. `?page=999` 로 진입 → 마지막 페이지로 보정 | pass |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 스타일 표면 — `logs.css` · `ErrorLogPage.tsx` 의 인라인 style(`:21-25` `severityColor` · `:30-34` `SeverityCell`) · 공용 컴포넌트 — 이 전부가 `var(--tds-*)` 만 참조한다. **`apps/admin/src/pages/logs/**` 전체에 primitive 밖 hex · `[1-9]px` 리터럴 · bare border/outline 키워드 grep = 0**(내가 직접 실행). ⚠ **이 화면은 FS-062 와 함께 인라인 style 객체로 색을 준다** — 그럼에도 전부 토큰이다(`--tds-color-feedback-danger-text` · `--tds-color-feedback-warning-text` · `--tds-primitive-typography-font-weight-bold`). 행 톤은 CSS 클래스가 갖는다(`logs.css:23-37` — 인라인이면 `.tds-ui-row:hover` 가 죽는다. `:7-9`). ⚠ 의도된 예외 1건: `logs.css:86` `font-family: monospace`(근거 `:68-72`. 승격은 §4.4) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — TOSS 토큰(PR #32)이 이 화면의 가장 넓은 표면인 표에 닿는다.** 이 표는 DS `DataTable` 이 아니라 `shared/ui/styles.ts` 의 `tdStyle`/`thStyle` 을 쓰는데, **그 둘이 `component.table.*` 토큰의 소비자다**: `styles.ts:381-384` `tdStyle` 의 `padding{Top,Bottom}: var(--tds-component-table-cell-padding-y)` · `padding{Left,Right}: var(--tds-component-table-cell-padding-x)` · `styles.ts:363-366` `thStyle`(**x 만** — block 패딩은 `space.3` 유지). 값이 바뀌었다 — `cell-padding-y = {space.4}` = **16px**(구 `space.3` 12px) · `cell-padding-x = {space.3}` = **12px**(구 `space.2` 8px)(`tokens/tokens.json:1262-1271`). **축 순서 주의: y=16 · x=12 이지 그 반대가 아니다.** 근거가 토큰에 적혀 있다(`:1265`: 'Toss 표는 divider 를 옅게 하는 대신 **여백으로 행을 가른다**'). **그 divider 도 함께 옅어졌다** — `styles.ts:387` `borderBottomColor: var(--tds-component-table-divider)` → `component.table.divider`(`tokens.json:1272-1276`) → **`color.border.subtle`** 신설(`:629-638`, `{primitive.color.gray.200}`, light `gray.200`/dark `gray.800`. 구 `border.default` = gray.300). `border.subtle` 은 **`$description` 이 장식 divider 전용으로 못 박고**(WCAG 1.4.11 — '컨트롤 테두리에 쓰지 말 것') **직접 소비자가 `apps/`·`packages/ui/src` 어디에도 없다** — 오직 `component.table.divider` 를 경유한다. **thead 밑줄만 `border-default` 를 유지한다**(`styles.ts:370`) — 근거 `:362`: '머리/몸통을 가르는 **구조선**이라 행 divider(subtle)보다 진해야 한다'. **이 변화는 TOKEN-01 의 판정을 바꾸지 않는다**(여전히 리터럴 0건 · 전부 토큰 경유) — **오히려 이 화면이 px 를 한 줄도 고치지 않고 밀도가 바뀐 것이 TOKEN-01 이 지키려던 바로 그 성질이다.** 판정에 영향을 주는 것은 A11Y-09(대비 — divider 가 옅어졌다)이며 그것은 tokens 소유다 | `grep -rE "#[0-9a-fA-F]{3,8}\|[^-a-z0-9][1-9][0-9]*px\|(outline\|border):\s*(thin\|medium\|thick)" apps/admin/src/pages/logs/` → **0건**. lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면 — 정렬 헤더 버튼(`LogTable.tsx:150`) · 상세 열기 버튼(`:210`) · 필터 항목(`LogFilterPanel.tsx:75`) · DS `SearchField`/`SelectField`/`DateRangeField`/`Button`/`Pagination`/`Modal` — 전부 `tds-ui-focusable` 계약을 상속. **자체 `:focus-visible` 규칙 0건**(`logs.css:41-42` 가 그 규율을 명시). ⚠ **이 화면에는 in-row link 가 없다** — 클라이언트에서 갈 레코드가 없다(FS-062 와 같고 FS-061 과 다르다) | 판정은 DS(`packages/ui`) 소유 문서를 따른다. `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **자체 `animation`/`transition` 선언 0건**(`pages/logs/**` grep = 0). easing 토큰 소비 표면은 상속된 둘 — 내보내기 토스트 entrance(`Toast.css:25` `var(--tds-motion-easing-decelerate)`)와 로딩 스켈레톤(`shared/ui/ui.css:83-92`). 둘 다 이 화면이 실제로 띄운다(FS-063-EL-017 · EL-012) | 판정은 tokens codegen·`Toast.css` 소유 문서를 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | floating/overlay 표면 둘 — 상세 다이얼로그(`Modal.css:36` `var(--tds-shadow-modal)`) · 내보내기 토스트(`Toast.css:20` `var(--tds-shadow-overlay)`). **이 화면은 `box-shadow` 를 선언하지 않는다** — 페이로드 코드 블록도 배경 토큰만 쓴다(`logs.css:84`) | 판정은 DS·tokens 소유 문서를 따른다. `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **in-content `<h1>` 이 없다** — 제목은 AppHeader(IA-02). 계층은 필터 `<h2>`(`LogFilterPanel.tsx:64`) · 상세 `<h3>`(`LogPayloadDialog.tsx:88` — label-md + bold) · 표 헤더/셀 · 캡션(`logs.css:93-99`). **자체 titleStyle 0건** | 판정은 tokens typography·`AppHeader` 소유 문서를 따른다 | 종속 |
| COMP-10 | COMP | 직접 | **충족.** `LogListShell.tsx:29` 가 `useDebouncedSearch` 를 **`shared/crud` 에서 직접 import** 하고 `:122` 가 부른다(`{ initial: state.keyword, onCommit: setKeyword }`) → `:222` → `LogToolbar.tsx:81-87` 이 DS `SearchField` 의 native 패스스루로 흘린다(`:10-11`). 요구의 네 절이 전부 걸린다: ① 조합 중 커밋 안 함(`useDebouncedSearch.ts:87`) ② 조합 중 Enter 미submit(`:121-124` — `nativeEvent.isComposing || composingRef.current` 이중 판정. 이유는 `:117-120`) ③ debounce 250ms(`:23,93-95`) ④ **stale 응답 무효** — 키워드가 쿼리 키의 일부(`queries.ts:21,37-40`). ⚠ **이 화면의 검색어는 한글이 아닐 때가 많다**(오류 코드·추적 ID — `data-source.ts:23-24`) — 그래도 메시지는 한국어라 IME 계약이 그대로 걸린다 | 검색창에 '결제' 를 IME 로 입력 → 조합 완료 + 250ms 후 URL `?q=` **1회** 갱신(`replace` 라 history 안 쌓임 — `list-state.ts:222-236`). 조합 중 Enter → 미제출 | pass |
| FEEDBACK-02 | FEEDBACK | N/A | **파괴적/비가역 액션이 없다 — 4화면 중 그 부재가 가장 깊다.** 서버 상태를 바꾸는 요청 0건(BE-063 §3.4), `ConfirmDialog` 미import, ⋯ 액션 열·체크박스 0개(`LogTable.tsx:6-9`). **그리고 이 화면은 '해결됨' 토글마저 만들지 않았다**(`errors/types.ts:6-10`) — 게이트할 상태 전이 자체가 존재하지 않는다. 내보내기는 **비파괴적**이다 | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **미저장 상태를 가질 폼이 없다** — RHF 미import, `isDirty` 대상 0개. 입력 셋(검색·기간 2칸)은 **조회 조건**이고 값이 즉시 URL 에 반영된다(`list-state.ts:201-236`) — **'미저장'이라는 상태가 원리적으로 존재하지 않는다.** 이탈해도 잃을 것이 없고 오히려 URL 이 보존한다(IA-13) | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면의 modal 은 편집 가능한 폼을 담지 않는다.** `LogPayloadDialog` 는 읽기 전용 — 입력 0개, 푸터가 '닫기' 하나(`:67-69`), 본문은 `dl/dt/dd` + `<pre>`. dirty 해질 입력이 없어 4경로(딤·Esc·×·Cancel)를 가드할 대상이 없다(`:4-8`). **이 화면에서 그 푸터가 가장 눈에 띈다** — 오류 추적 도구를 아는 사람은 '해결됨'을 찾는다(FS-063-EL-016.5) | 재현할 표면 없음 (modal 자체는 MOTION-01 · A11Y-02 에서 판정) | N/A |
| A11Y-01 | A11Y | 상속 | **이 화면은 토스트를 띄운다**(내보내기 성공/실패 — `LogListShell.tsx:184,194`). `ToastProvider` 의 **항상 마운트된 두 live region**(`:165` `role="status" aria-live="polite"` · `:168` `aria-live="assertive"`, 둘 다 `aria-atomic="false"`)이 이미 있다. 이 화면은 자체 live region 을 만들지 않고 주입만 하는 **소비자**다 | 판정은 `ToastProvider` 소유 문서를 따른다 | 종속 |
| A11Y-02 | A11Y | 직접 | **충족.** `LogPayloadDialog.tsx:58` 이 `useId()` 로 본문 id 를, `:64` 가 `describedBy={bodyId}` 를 넘기고 `:72` 가 그 id 를 본문에 단다. `Modal.tsx:155-158` 이 `role="dialog"` + `aria-modal` + `aria-labelledby` + `aria-describedby` 로 배선. **이 화면에서 제목은 오류 코드다**(`ErrorLogPage.tsx:76` — `title: entry.code`) — `'PAYMENT_GATEWAY_TIMEOUT'` 만 읽히면 무엇에 대한 다이얼로그인지 알 수 없으므로, 본문(8개 필드 + 마스킹 안내 + 스택·컨텍스트)이 함께 읽히는 것이 4화면 중 여기서 가장 중요하다 | 스크린리더로 행을 열면 'PAYMENT_GATEWAY_TIMEOUT' 과 본문이 함께 읽힌다. `dialog[aria-describedby]` 가 본문 `div` 의 id 로 해석 | pass |
| A11Y-11 | A11Y | 직접 | **충족.** 폼 컨트롤 셋 — 검색(`SearchField`) · 페이지 크기(`SelectField`) · 기간 직접 지정(`DateRangeField` 2칸). **셋 다 FormField 가 아니라 DS 필드 컴포넌트를 직접 쓰고 네이티브 패스스루다.** ① **aria-invalid without describedby = 0**: `DateRangeField` 가 **`aria-invalid` 를 항상 `aria-describedby` 와 짝지어 낸다**(`DateRangeField.tsx:44-45` — 유효할 때는 두 속성 모두 부여하지 않는다. `:9-11`). `LogFilterPanel.tsx:152-159` 가 `error={rangeError}` 로 켠다. **`pages/logs/**` 의 `aria-invalid` grep = 1 이고 그 1건은 주석**(`LogFilterPanel.tsx:151`). ② **required 노출**: **required 필드가 없다** — `DateRangeField.tsx:35,48` 이 `required` 를 지원하나 이 화면은 넘기지 않는다(필터는 전부 선택적) | 종료일에 미래 입력 → 두 입력이 `aria-invalid` + `aria-describedby` 가 `role="alert"` `<p>` id 로 해석. 되돌리면 **두 속성이 모두 사라진다**. `aria-invalid` grep(주석 제외) = 0 | pass |
| A11Y-12 | A11Y | 직접 | **충족.** 좌측 필터의 모든 항목이 `aria-pressed={active}`(`LogFilterPanel.tsx:76`). **`FilterGroup` 이 이 화면의 세 축을 전부 그린다** — 심각도(4칸) · 발생 위치(6칸) · 기간(4칸), 합 **14개 버튼**(`:125-135` 축 루프 + `:139-146` 기간). **`aria-current` grep = 0**(`pages/logs/**` — 유일한 히트는 `LogFilterPanel.tsx:12` 주석). 스타일이 `filterItemStyle(active)` 라 **색과 ARIA 가 같은 `active` 에서 나온다** — 갈라질 수 없다 | '치명' 클릭 → 그 버튼만 `aria-pressed="true"`. `aria-current` grep = 0. 14개 버튼 전부 `aria-pressed` | pass |
| MOTION-01 | MOTION | 상속 | **표면 실재 · 판정은 DS 소유.** 이 화면은 **Modal 표면을 실재로 갖는다**(`LogPayloadDialog` — FS-063-EL-016). **PR #26 이후 enter/exit 모션이 실재한다** — backdrop fade(`Modal.css:20-21` → `@keyframes tds-modal-backdrop-in :126-134` · exit `:30-33` → `tds-modal-backdrop-out :136-144`) · dialog scale(`:58-59` → `tds-modal-dialog-in :146-156`, opacity 0→1 + `scale(0.96)→scale(1)` · exit `:35-38` → `tds-modal-dialog-out :158-168`, `forwards`). **라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 여전히 미도입이고, 요구문이 말한 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`, keyframe 이름 상수 `:43`)로 동등 달성했다. ⚠ **범위 한정**: 애니메이션되는 닫힘은 Modal 소유 3경로뿐이다 — Esc(`Modal.tsx:167-171`) · 딤(`:204`) · ×(`:227-232`), 전부 `requestClose`(`:122-126`) 경유. **이 화면의 푸터 '닫기' 버튼은 그 경로가 아니다** — 호출부가 조립한 버튼이라 `onClose` 를 직접 부르고 즉시 언마운트된다(`Modal.tsx:27-31` · 이 화면은 `LogPayloadDialog.tsx:67-69`). **라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫이다** — 화면 코드로는 해소 불가 | 행을 눌러 상세를 열고 Esc/딤/× 로 닫는다 → backdrop 이 fade 하고 dialog 가 0.96→1 로 scale 한다. 푸터 '닫기' 는 즉시 사라진다(경로가 다르다). reduced-motion 에서는 `Modal.css:173-180` 이 애니메이션을 끄고 `willAnimate()`(`Modal.tsx:56-61`)가 그것을 읽어 즉시 닫는다. 판정은 `packages/ui` `Modal` 소유 문서를 따른다 | 종속 |
| MOTION-02 | MOTION | 상속 | **표면 실재 · 판정은 DS 소유. 요구는 이제 충족돼 있다.** 이 화면은 **토스트 표면을 실재로 갖는다**(내보내기 — FS-063-EL-017). **PR #26 이 exit 애니메이션을 넣었다** — `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events: none`), keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`). enter 는 `:26-27`/`:109-119`. **요구가 명시한 수치를 정확히 만족한다**: `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}` — `component.overlay` recipe(`tokens/tokens.json:1298-1307`, `easing.accelerate` primitive `:486` = `cubic-bezier(0.4, 0, 1, 1)`). 완료 감지는 `AnimatePresence` 가 아니라 네이티브 `onAnimationEnd` × keyframe 이름 상수 대조다(Modal 과 같은 아키텍처). reduced-motion 게이트 `Toast.css:136-141`. appliesTo 가 `ToastProvider, Toast` 이므로 **소유는 DS/shared 이고 이 화면은 소비자**다 | 내보내기 → 성공 토스트 → dismiss → opacity 1→0 + 아래로 밀리며 사라진다(150ms · accelerate). 판정은 `ToastProvider`/`Toast` 소유 문서를 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | 모션 표면 **둘뿐이고 둘 다 게이트돼 있다** — 스켈레톤(`shared/ui/ui.css:110-112` → `animation-name: none`) · 토스트 entrance(`Toast.css:110-112` → `animation: none`). **이 화면 자신은 `transition`/`animation`/`transform` 을 하나도 선언하지 않는다**(`pages/logs/**` grep = 0. `ErrorLogPage.tsx` 의 인라인 style 도 색·굵기뿐이다). 나머지 절(글로벌 Motion config · `ToggleSwitch.css`)은 **이 화면의 표면이 아니다**. **③ PR #26 이 넣은 Modal enter/exit 도 게이트를 탄다**(`Modal.css:173-180` — backdrop·dialog·`--closing` 변종 전부 `animation: none`) · **④ 토스트 exit 도 마찬가지다**(`Toast.css:136-141` 이 `.tds-toast` 와 `.tds-toast--exiting` 을 **명시 나열**한다 — 특이도가 같아 소스순서 의존이 조용히 깨지기 때문. 근거 `:133-135`) | reduced-motion 을 켜고 진입 → 스켈레톤 정지 + 토스트 즉시 등장·소멸 + 상세 다이얼로그도 즉시 열리고 닫힌다. **⚠ 이전 기준(`4b805ad`)의 'MOTION-01/02 해소 시 재판정 필요' 는 해소됐다** — 신규 모션이 **자기 게이트를 함께 들고 착륙했다**(PR #26) | 종속 |
| IA-01 | IA | 직접 | **충족.** `/logs/errors` 가 `APP_ROUTES` 항목이고(`App.tsx:332` — `{ path: '/logs/errors', element: <ErrorLogPage />, implemented: true }`) 그 배열이 `<RequireAuth><AppShell/></RequireAuth>` 아래에서 렌더된다. **자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `<div style={pageStyle}>`(`LogListShell.tsx:205`)이고 그 아래 2열 그리드(`:206,48-54`)는 AppShell 안쪽의 내용 레이아웃이다 | 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지 | pass |
| IA-02 | IA | 직접 | **충족.** `/logs/errors` 는 `nav-config.ts:211` 의 **잎**(`['오류 로그', '/logs/errors']`)이라 `findCoveringLeaf` 가 자기를 찾아 `findNavLabel` 이 AppHeader `<h1>` 에 **'오류 로그'** 를 그린다 — 가지 라벨('로그 관리')로 폴백하지 않는다. **in-content `<h1>` 이 없어 제목 소스가 하나뿐이다** — `LogListShell`·`LogFilterPanel`(`<h2>`)·`LogPayloadDialog`(`<h3>`)·`ErrorLogPage` 어디에도 `<h1>` 이 없다. 하위 라우트가 없어(`App.tsx:328` 주석 · `/logs/errors/*` 0건) 'sub-route 가 구체적 title' 절이 발생하지 않는다. **폼/상세 화면의 h1 이중 문제(`FormPageShell.tsx:160`)가 여기엔 성립하지 않는다** — 이 섹션에 폼이 없다 | 진입 → AppHeader 제목이 '오류 로그'. `document.querySelectorAll('h1').length === 1`. 상세를 열어도 다이얼로그 제목은 Modal 소유 `<h2>` 라 h1 이 늘지 않는다 | pass |
| IA-04 | IA | 직접 | **충족.** ① toolbar row — 검색 좌측(`LogToolbar.tsx:80-88`), 액션 우상단(`:90-127`). **감사 로그에는 '등록'이 없으므로 우상단 primary 자리는 내보내기가 갖는다**(`:4-5`). ② count 요약(`LogListShell.tsx:235-249`) — **이 화면은 그 줄에 경고 강조를 하나 더 붙인다**(`:246-248` ← `ErrorLogPage.tsx:93-101`). ③ SelectionBar — **bulk 없음 → 대상 없음**. ④ table(`LogTable`). ⑤ **Pagination**(`:271-276`, 총 페이지 ≤ 1 이면 DS 가 스스로 null — `Pagination.tsx:117`). 4화면이 이 한 벌을 공유한다(`logs/types.ts:229-232`) | 진입 → 좌측 필터 / 우측 [검색 … 크기·내보내기] → 요약(+경고) → 표 → 페이지네이션. 형제 3화면과 배치 동일 | pass |
| IA-05 | IA | N/A | **create/edit 폼이 없다** — leaf 이고(`App.tsx:332`) **쓰기 라우트가 존재하지 않는다**(`:328` 주석: '쓰기 라우트(등록/수정)는 존재하지 않는다: 감사 기록은 불변이다'). `:id/edit` 로 해석될 대상 엔티티가 없다 — **오류는 만들 수도 고칠 수도 없고, 이 도메인에서는 '해결됨'으로 바꿀 수조차 없다**(BE-063 §3.4). appliesTo(FormPageShell·useCrudForm·엔티티 폼)에 걸리지 않는다 | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족.** list query state 가 **전부 URL 에 있다**: page(`?page`) · size(`?size`) · filters(`?severity`·`?source`·`?period`·`?from`·`?to`) · keyword(`?q`) · sort(`?sort`·`?dir`) — `list-state.ts:42-51` 의 `PARAM` 맵 + 축 key 가 정본이고 `useSearchParams`(`:141`)가 유일한 저장소다. **`useState` 로 든 조회 상태 0건**. ① 기본값은 URL 에 쓰지 않는다(`:187,217,231,241,258-260,274`) ② push/replace 를 가른다(검색어만 replace — `:18-21`) ③ URL 을 손으로 고칠 수 있음을 전제로 전부 검증(`:58-92`). ⚠ **이 화면의 `?source` 값은 공백을 품은 한국어 자유 문자열이다**(`'결제 서비스'` — `errors/types.ts:64-70`). `readAxes`(`:81-92`)가 축 옵션과 **정확 일치**하는 값만 통과시키므로 지금은 왕복하지만, **서버가 표기를 하나만 바꿔도 링크가 조용히 'all' 로 떨어진다**(§5 #10 · BE-063 §7.4) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 pass 는 이전 기준에서 `page` 축이 조용히 깨진 채였다.** `LogListShell` 이 거는 `useDebouncedSearch` 는 **마운트 직후에도 한 번 커밋한다**(현재 입력값 = URL 의 `q`). 그 커밋이 통과하면 `resetPage`(`list-state.ts:180-182`)가 `page` 를 지워 **`?page=3` 링크로 들어온 운영자가 250ms 뒤 1페이지로 튕겼다 — 로그 4화면 전부**(`list-state.ts:213-221` 이 그 사연을 적었다). 즉 이 문서가 pass 근거로 든 '링크를 붙여넣으면 동일 view' 가 **page 축에서 성립하지 않았다.** **커밋 `6acb235` 가 고쳤다** — `list-state.ts:224` `if (value === keyword) return;`. **검색어가 실제로 바뀔 때만 되돌린다**(`useListState.commitKeyword` · 통계 `useStatsParams.ts:288` 과 같은 규칙 — 세 벌이 한 규칙으로 정렬됐다). 회귀 테스트 **`list-state.test.tsx` 신설**. 통계 6화면에도 같은 결함이 있었고 형제 문서 3벌이 그것을 `gap` 으로 잡았다(NFR-054·055·056 §2 IA-13) | '치명' + '결제 서비스' + 발생 횟수 내림차순 → `?severity=critical&source=%EA%B2%B0%EC%A0%9C+%EC%84%9C%EB%B9%84%EC%8A%A4&sort=occurrences&dir=desc` → **새 탭에 복사 → 동일 view.** F5 → 동일. 상세를 열었다 닫고 Back → 동일(다이얼로그는 라우트가 아니다) | pass |
| EXC-01 | EXC | 상속 | 렌더 예외는 `AppShell` 의 `<Outlet>` 바깥 ErrorBoundary 가, 셸 예외는 App 루트 경계가 잡는다. **자체 경계를 두지 않는다.** ⚠ throw 가 날 만한 자리 — `spec.detailOf(entry)`(`LogListShell.tsx:299`)와 `column.render(entry)`(`LogTable.tsx:214,222`)가 서버 데이터를 직접 만진다. **이 화면 고유의 취약점**: `ERROR_SEVERITY_LABEL[entry.severity]`(`ErrorLogPage.tsx:36`)와 `severityColor[severity]`(`:32`)가 **모르는 심각도에 `undefined` 를 낸다** — 렌더는 통과하나 셀이 비고 색이 사라지며, **`toneOf`(`:70-72`)는 그 행에 여전히 danger 톤을 준다**(§5 #10). `highlightOf`(`:95-96`)는 `?? 0` 로 안전. 페이로드 직렬화 실패는 스스로 잡는다(`masking.ts:183-189`) | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다. 이 화면에서는 '자체 경계 없음'만 확인 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `<RequireAuth>`, mid-session 401 은 `shared/query/queryClient.ts` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리. 이 화면의 조회(`queries.ts:47-53`)가 그 캐시를 통과한다. **재인증 손실 0** — 보존할 입력이 없고 **조회 조건이 전부 URL 에 있다**(IA-13). ⚠ 내보내기는 `useMutation`(`:71-73`)이라 그 캐시를 안 탄다 — 401 이면 실패 토스트로(§3 EXC-06). ⚠ **로그 안의 인증 오류와 혼동하지 말 것** — 이 행은 *이 화면 자신의* 세션 이야기다 | 판정은 `RequireAuth`·`queryClient` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **충족 — 두 층이 다 있고 테스트가 고정한다.** ① **read 게이팅** — `AppShell` 의 `<RequirePermission><Outlet/></RequirePermission>` 이 덮고 `route-resource.ts` 가 잎 `page:/logs/errors` 로 해석해 403 화면을 그린다. **조회 요청 자체가 나가지 않는다** — `LogListShell.test.tsx:136-142` 가 `expect(fetchPage).not.toHaveBeenCalled()` 로 단언(근거 `:11-12`). **이 화면에서 그 단언이 특히 중요하다** — 받아 놓는 것이 **스택 전문·커넥션 문자열·업스트림 호스트**다(BE-063 §7.2). ② **쓰기 게이팅** — 내보내기가 `useRouteCan('export')`(`LogListShell.tsx:115`)에 걸려 **권한이 없으면 버튼을 렌더하지 않는다**(`LogToolbar.tsx:117` — disable 이 아니라 부재). `LogListShell.test.tsx:144-150` 이 단언. ③ **강등 reconcile** — `useRouteCan` 이 스토어를 구독해 버튼이 사라진다 | read 끈 역할 → 403 + **표 없음 + 요청 0건**(스택을 받아 놓지도 않는다). export 만 끈 역할 → 표는 보이고 버튼 부재. ⚠ 서버 강제는 별개 — **`GET /api/logs/errors/export` 직접 호출을 막는 것은 서버뿐이고 그 응답에는 스택 전문이 실려 있다**(BE-063 §3.1 · §7.2) | pass |
| EXC-04 | EXC | N/A | **write 를 하지 않는다** — appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면 0개. 낙관적 동시성 토큰을 실을 요청이 없다. **감사 로그는 append-only 라 기존 행이 변경되는 사건 자체가 없고**(BE-063 §3.4), **이 도메인에서는 '해결됨'조차 없어 두 운영자가 같은 오류의 상태를 다툴 시나리오마저 존재하지 않는다.** `createStoreAdapter`/`createCrudAdapter` 를 쓰지 않고 자기 어댑터(`adapter.ts:30-54`)가 조회 둘뿐이다 | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **user-initiated write 가 없다** — appliesTo('useCrudForm, ConfirmDialog, 금액/생성/발송 mutation')에 해당하는 것 0개. **내보내기는 write 가 아니다** — 서버 상태를 바꾸지 않는 GET 이라 두 번 나가도 **파일이 두 번 받아질 뿐 서버가 갈라지지 않는다.** **중복 실행은 실질적으로 막혀 있다**: `Button.tsx:66,69-72` 가 `loading` 이면 `onClick` 을 발화하지 않고 `LogToolbar.tsx:120` 이 `loading={exporting}` 을 넘긴다 — 다만 `exporting` 이 비동기 state 라 **렌더 전 초고속 더블클릭은 2회 나갈 수 있다.** 무해하므로 gap 으로 계상하지 않고 §4.3 에 기록한다 | 재현할 표면 없음 | N/A |
| EXC-09 | EXC | 직접 | **충족.** ① **내보내기 취소** — '취소'(`LogToolbar.tsx:111-115` → `LogListShell.tsx:200-202`)가 `controllerRef.current?.abort()` 를 발화하고 `onError` 가 `isAbort(cause)` 로 판정해 **토스트 없이 `exportLog.reset()`**(`:189-192`). 단일 공유 predicate(`shared/async.isAbort`). 규칙이 주석에 있다(`:19`: '**취소는 실패가 아니다**'). ② **조회 abort** — 조건 변경·이탈 시 react-query 가 `queryFn({ signal })`(`queries.ts:49`)의 signal 로 `wait(LATENCY_MS, signal)`(`adapter.ts:36`)을 끊는다. **취소된 쿼리는 `error` 를 안 세팅해 배너가 뜨지 않는다.** ③ **cache 무변경** — 내보내기가 `invalidateQueries` 를 부르지 않는다(`queries.ts:6-9`). ④ bulk 절은 **대상 없음** | 내보내기 시작 후 400ms 안에 '취소' → **토스트 0건**, 버튼 복원, 파일 미다운로드. 조회 중 다른 메뉴로 이동 → 배너·토스트 없음 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-02 · STATE-04 · TOKEN-01 · COMP-10 · A11Y-02 · A11Y-11 · A11Y-12 · IA-01 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **10** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **6** | FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · IA-05 · EXC-04 · EXC-08 |
| `gap` | **1** | STATE-01 |
| **합계** | **30** | 13 + 10 + 6 + 1 = **30** ✔ |

> **검산**: STATE 3(01 gap · 02·04 pass) + TOKEN 5(01 pass · 02·03·04·05 종속) + COMP 1(10 pass) + FEEDBACK 3(02·04·06 N/A) + A11Y 4(01 종속 · 02·11·12 pass) + MOTION 3(01·02·03 종속) + IA 5(01·02·04·13 pass · 05 N/A) + EXC 6(01·02 종속 · 03 pass · 04·08 N/A · 09 pass) = **3+5+1+3+4+3+5+6 = 30** ✔
>
> **P0 판정이 NFR-060 · NFR-061 · NFR-062 와 동일하다** — 같은 `LogListShell` 이 결정하기 때문이며 그것이 이 섹션 설계의 의도다(`logs/types.ts:229-232`). **4벌이 전부 같은 값으로 떨어진 것이 곧 그 설계가 작동한다는 증거다.**
> **이번 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집힌 판정 2건 — 둘 다 MOTION 이다.** PR #26 이 오버레이 모션을 착륙시켜 **MOTION-01 · MOTION-02 가 `gap` → `종속`** 이 됐다. 이 화면이 실재로 갖는 두 표면(상세 다이얼로그 · 내보내기 토스트)이 이제 enter/exit 를 갖는다 — **단 라이브러리가 아니라 CSS-only 다**(Motion/framer-motion 은 여전히 미도입). 두 요구 모두 appliesTo 가 DS 라 이 문서의 판정은 `종속` 이며, **'AnimatePresence 부재를 gap 으로 볼지'는 소유 문서(DS)가 정한다.**
>
> **P0 gap 은 이제 1건**(STATE-01) — quality-bar §How to use 기준 '배치 실패' 사유다. **그 1건은 화면 코드로 해소 가능하고**(표 자리에 `range === null` 분기 추가), **이 화면에서 그것의 결과가 4형제 중 가장 무겁다**(거짓 빈 상태가 '깨진 게 없다'로 읽힌다). 이전 기준의 3건 중 화면 코드로 해소 불가였던 2건이 DS 에서 해소됐다.
> **N/A 6건은 전부 쓰기 축이며 결함이 아니다**(§1.2). **다만 이 화면의 실질적 위험은 P0 표에 잡히지 않는다** — 그것은 **마스킹의 구조**이고 §5 #13 에 있다. **이번 기준에서 그 등급이 내려갔다**: 이전 기준의 '컨텍스트의 회원 이메일이 마스킹 없이 그려진다(확인된 실재 노출)' 는 `ebb0e4c` 가 막았고(`masking.ts:73` + 회귀 테스트), 남은 것은 **키 기반 마스킹이 모르는 이름에서 또 뚫린다는 구조적 미결**이다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족.** `placeholderData: (previous) => previous`(`queries.ts:52`)로 전환 중 이전 목록 유지. ⚠ **`staleTime` 미지정**(기본 0) — 같은 조건 재진입 시 즉시 재조회. **감사 로그에서는 그것이 맞다**(방금 깨진 것을 봐야 한다) | 필터 전환 중 이전 행 유지. 같은 URL 재진입 → 즉시 재조회 | pass |
| STATE-05 | P1 | **충족.** 0행이면 DS `<Empty>` **3분기**(`LogTable.tsx:180-187` → `Empty.tsx:53-57` — 검색 > 필터 > 진짜 비어있음). 복구 수단이 분기마다 다르다(`list-state.ts:292-307`). **'등록' CTA 는 의도적으로 없다**(`LogTable.tsx:22-24`). ⚠ **이 화면에서 '진짜 비어있음'은 좋은 소식이다** — 다른 화면의 '기록이 없습니다'는 '못 찾았다'이지만 여기서는 '**깨진 게 없다**'이다. DS `<Empty>` 는 그 차이를 모르고 같은 톤으로 그린다(`createVerb="기록"` 이 4화면 공용 — §5 #12) | 걸리지 않는 코드 검색 → 검색 분기. 심각도를 '치명'으로 좁혀 0건 → 필터 분기. ⚠ **기간 오류 시에도 뜬다** — §2 STATE-01 gap | pass |
| STATE-06 | P1 | **N/A(표면 부재) — 그것이 설계다.** write 0건이라 invalidate 할 것이 없다(`queries.ts:6-9`) | 재현할 표면 없음 | N/A |
| COMP-03 | P1 | **충족.** 검색이 DS `<SearchField>`(`LogToolbar.tsx:81-87`). `pages/logs/**` 에 `type="search"` grep = 0 | `type="search"` grep = 0 | pass |
| COMP-05 | P2 | **충족.** 좌측 필터가 `shared/ui` 의 `filter*Style` 6종을 import(`LogFilterPanel.tsx:18-28`) — 로컬 clone 0건(`:4-5`) | 로컬 filter 스타일 선언 0건 | pass |
| COMP-06 | P2 | **충족.** 스켈레톤 행 = **페이지 크기**(`LogListShell.tsx:259`), 셀 = **실제 컬럼 수**(`LogTable.tsx:176` `cols={columns.length}` = **5**). `length: 5` 하드코딩 없음 | 크기 100 → 스켈레톤 100행 × 5열 | pass |
| COMP-11 | P1 | **충족.** preset 4종(`types.ts:71-76`) + `start ≤ end` 검증(`validation.ts:73-81`) + 범위가 URL 유지(`list-state.ts:201-211`). 그 위에 **미래 금지**(`:64-71`)와 **90일 상한**(`:83-91`)을 얹는다. ⚠ **이 화면에서 그 90일이 보존기간(180일)의 절반이다** — 상한 자체는 충족이나 **보존의 목적과 어긋난다**(§5 #15 · BE-063 §7.3) | 시작>종료 → 인라인 오류 + 조회 미발행. 미래 → 전용 문구. 91일 → '(선택한 기간 91일)' | pass |
| A11Y-06 | P1 | skip link 는 `AppShell` 소유. 이 화면의 좌측 필터 Tab 정지점은 **14개**(심각도 4 + 발생 위치 6 + 기간 4, 직접 지정이면 +2) | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 + announce 는 `AppShell` 소유 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-08 | P1 | **충족.** 행 클릭(`LogTable.tsx:196` — `useRowNavigation`)은 마우스 보조 수단이고 **첫 칸(시각)이 상세를 여는 진짜 버튼**이다(`:205-217` — `<button className="tds-ui-focusable">`). Tab 으로 닿고 Enter/Space 로 열린다(`:14-17`). ⚠ **이 화면에는 in-row link 가 없다** — 클라이언트에서 갈 레코드가 없다. 요구의 'row-nav 에 keyboard focusable in-row link' 는 상세 열기 버튼으로 충족된다 | Tab → 첫 칸 → Enter → 상세. 행 빈 곳 클릭 → 같은 상세 | pass |
| A11Y-09 | P1 | **⚠ 4화면 중 이 화면이 이 요구의 측정을 가장 강하게 요구한다 — 위험 쌍이 *모든 행에* 있다.** 요구가 열거한 '**feedback surface 위 feedback 텍스트**'와 '**text-muted 본문**'이 이 화면에서 **neutral 배경을 만나는 행이 하나도 없다**(`toneOf` 에 neutral 분기가 없다 — `ErrorLogPage.tsx:70-72`). 실재하는 쌍: ① `feedback-danger-text`(심각도 셀 `:22-23`) 위 `feedback-danger-surface`(치명·오류 행 `logs.css:23-25`) ② `feedback-warning-text`(`:24`) 위 `feedback-warning-surface`(`logs.css:31-33`) ③ **`text-muted`(오류 메시지 — `cells.tsx:72` `mutedTextStyle` → `shared/ui/styles.ts:63-64`) 위 danger/warning surface** — **모든 행의 메시지 줄이 여기 걸린다.** 요구가 '**muted 본문은 면제 아님**'을 명시한다 ④ `surface-raised` 위 `text-default`(페이로드 `logs.css:84-85`) ⑤ hover 시 배경이 `feedback-*-border` 로 더 진해진다(`logs.css:27-29,35-37`) — **그 상태의 대비는 아직 아무도 재지 않았다** <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 축에 새 쌍이 하나 늘었다.** TOSS 토큰(PR #32)이 **행 divider 를 `border.default`(gray.300) → `border.subtle`(gray.200) 로 낮췄다** — `component.table.divider`(`tokens/tokens.json:1272-1276`) → `color.border.subtle`(`:629-638`, light `gray.200`/dark `gray.800`). **이 화면의 표가 그것을 소비한다**(`shared/ui/styles.ts:387` `tdStyle.borderBottomColor`). **측정이 필요한 새 쌍**: `surface-default` 위 `border.subtle`(행 divider · light/dark 양쪽). ⚠ **다만 이것은 WCAG 1.4.11(비텍스트 대비 3:1)의 대상이 아닐 수 있다** — `border.subtle` 의 `$description` 이 **장식 divider 전용**으로 용도를 못 박고 '컨트롤 테두리에 쓰지 말 것' 을 명시한다. 장식적 구분선은 1.4.11 의 예외이고, **행을 가르는 일은 이제 divider 가 아니라 여백이 한다**(`cell-padding-y` 12→16px — `tokens.json:1265` 가 그 교환을 명시: 'Toss 표는 divider 를 옅게 하는 대신 여백으로 행을 가른다'). **thead 밑줄은 `border-default` 를 유지한다**(`styles.ts:370` — 구조선이라 진해야 한다, 근거 `:362`). **판정은 tokens color 소유 문서를 따른다** — 이 문서는 **이 화면이 그 쌍을 실제로 쓴다**는 사실과 **그 용도가 장식으로 한정돼 있다**는 사실만 기록한다 | 판정은 tokens color 소유 문서를 따른다. ⚠ **형제 셋에서는 이 쌍이 예외 행에만 있는데 여기서는 전 행이다** — light/dark × 5쌍 × hover 를 재야 한다(§5 #8) | 종속 |
| A11Y-16 | P1 | **N/A(표면 부재).** **신규 인터랙티브 컴포넌트를 만들지 않았다** — 표는 네이티브 `<table>`, 정렬은 `<th>` 안의 `<button>` + `aria-sort`, 필터는 `<button aria-pressed>`, 다이얼로그는 DS `Modal`. **`SeverityCell`(`ErrorLogPage.tsx:28-39`)은 인터랙티브가 아니다**(순수 표시 `<span>`) — a11y 계약의 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-03 | P1 | **N/A** — nav 의 잎이다(`nav-config.ts:211`) | 재현할 표면 없음 | N/A |
| IA-06 | P1 | **충족.** 상세를 라우트가 아니라 **다이얼로그**로 둔 판단이 무게 규칙에 맞는다(`LogPayloadDialog.tsx:15-18`). ⚠ **이 화면은 밖으로 나가는 라우트가 아예 없다** — 무게 규칙의 한쪽만 쓴다. **그런데 나갈 곳이 실제로 있다**: 픽스처가 API 로그·회원 활동 로그와의 교차를 의도적으로 설계했고(`fixtures.ts:6-9`) `ORDER_CREATE_FAILED` 의 컨텍스트에 `upstream: 'PAYMENT_GATEWAY_TIMEOUT'`(`:64`)이라는 명시적 연결까지 있는데 **건널 경로가 없다**(§5 #11) | 상세를 열어도 목록·필터·페이지가 뒤에 남는다 | pass |
| IA-11 | P2 | **충족.** 읽기 전용 레코드를 공유 `dl/dt/dd` 로(`LogPayloadDialog.tsx:75-82`) — 손수 만든 key/value 격자가 아니다. **8행**(`ErrorLogPage.tsx:77-87`) | 상세 필드 목록이 `<dl>` 시맨틱 | pass |
| IA-14 | P1 | **부분 충족 — 그리고 4화면 중 압력이 가장 낮다.** 표 카드가 **bounded 가로 스크롤 컨테이너 안에** 있고(`LogListShell.tsx:82-85,251`) 2열 그리드가 `minmax(0, 1fr)`(`:51`). **컬럼이 5개로 가장 적어 가로 넘침이 가장 늦게 일어난다.** ⚠ 대신 **'오류' 컬럼이 유일한 wrap 컬럼이라**(`ErrorLogPage.tsx:54-59` — `nowrap` 미지정) 코드+메시지 두 줄이 좁은 폭에서 더 늘어난다. **미충족**: ① 좌측 필터 폭 **고정**(`LogListShell.tsx:51` — `@media` 0건) ② sticky 없음(ERP-03) ③ touch-target 미검증 | 768px·375px → 표 컨테이너가 자기 안에서 가로 스크롤. **좌측 필터가 안 접혀 375px 에서 본문이 좁아진다** | 부분 pass — §5 |
| ERP-03 | P1 | **미충족.** sticky thead 없음(`pages/logs/**` 에 `sticky` grep = 0). 크기 100 으로 스크롤하면 **'심각도'와 '발생 횟수'가 어느 컬럼인지 사라진다** — 숫자와 짧은 라벨만 남은 표에서 축 라벨 상실은 치명적이다. ⚠ **이 화면에서는 완화 요인이 하나 있다**: 심각도 셀이 색+글자를 함께 가져(`ErrorLogPage.tsx:28-39`) 헤더가 없어도 그 칸만은 스스로 읽힌다 — **발생 횟수는 그렇지 않다** | 크기 100 → 스크롤 → 헤더가 밀려난다 | gap |
| ERP-04 | P1 | **충족.** ① sortable header + `aria-sort` + keyboard + 글리프 ✔(`LogTable.tsx:146-168`). ② 정렬 가능 판정의 단일 원천 ✔ — `ErrorLogPage.tsx:112` 가 `sortValues: errorLogSpec.sortValues` 로 **어댑터의 것을 그대로** 쓴다. **5개 컬럼 전부 정렬 가능**(`data-source.ts:25-32`). ③ **numeric tabular-nums** ✔ — `ErrorLogPage.tsx:64` `numeric: true` → `LogTable.tsx:143`(헤더 `textAlign: right`) · `:198-201` → `numericCellStyle`(`shared/ui/styles.ts:389-393` — `fontVariantNumeric: 'tabular-nums'` + 우측 정렬). **그리고 정렬이 숫자 비교다**(`data-source.ts:31` → `query-engine.ts:107`). ④ 정렬이 자르기보다 먼저 + 동점은 id ✔(`query-engine.ts:129-133,142-156`). **⑤ 이 화면 고유 — 심각도는 사전순이 아니라 심각한 순이다**: `data-source.ts:28` 이 `ERROR_SEVERITY_RANK`(`types.ts:30-34` — critical 0 · error 1 · warning 2)를 정렬 값으로 쓴다. **'경고' < '오류' < '치명' 이 한국어 사전순이므로**(`query-engine.ts:109` 가 `localeCompare(…, 'ko')` 다) 라벨로 정렬했다면 경고가 맨 위로 왔을 것이다. `logs.test.ts:519-531` 이 그것을 고정한다 | '발생 횟수' 헤더 클릭 → `aria-sort` + URL `?sort=occurrences&dir=desc` → **340회가 맨 위.** 우측 정렬 + 등폭이라 340 과 1 의 자릿수가 맞는다. '심각도' 클릭 → 치명 → 오류 → 경고 순 | pass |
| ERP-05 | P1 | **부분 충족 — 기능은 되나 DS 표면을 쓰지 않는다.** range('전체 N건 중 x–y' — `LogListShell.tsx:314-336`) · page-size selector(`LogToolbar.tsx:92-107`)가 실재한다. **그러나 DS `Pagination` 의 opt-in 표면을 켜지 않았다** — `Pagination.tsx:41,103,112,170-172` 는 `pageSize` 를 넘기면 범위 + **`role="status"` announce** 를 그리는데 `LogListShell.tsx:271-276` 이 `page`·`totalPages`·`onChange`·`label` 만 넘긴다 → `showRange = pageSize > 0` 이 **항상 false**. **같은 개념이 두 곳에 있고 DS 의 announce 가 없다.** `:311-312` 의 주석('DS Pagination 은 아직 범위를 그리지 않는다')이 **Pagination 1.1.0 기준으로 낡았다.** ⚠ **앱 전역에서 DS `Pagination` 에 `pageSize` 를 넘기는 호출부가 0건이다** — F3a 가 능력을 열었으나 채택자가 없다 | 범위·크기가 **보인다**(기능 충족). `<Pagination` 에 `pageSize` prop grep = 0 → `role="status"` 범위 요약이 DOM 에 없다 | 부분 pass — §5 |
| ERP-06 | P1 | **충족.** microcopy 가 존댓말로 일관되고 포맷이 `shared/format` 을 경유한다 — 숫자 `formatNumber`(`ErrorLogPage.tsx:66,83,98,99`), 날짜 `formatDate`(파일명 `LogListShell.tsx:182`), 시각 `seoulTimeParts`(`time.ts:29`), 조사 `objectParticle`(`LogListShell.tsx:282`). **심각도 라벨이 값이 아니라 뜻을 말한다**('치명'·'오류'·'경고' — `types.ts:23-27`): `critical` 만으로는 운영자가 못 읽는다. **단위를 상세에만 붙이는 규칙**(`:83` `'340회'`, 표 셀은 `:66` 숫자만)도 microcopy 결정이다 — FS-062 가 ms 를 헤더로 올린 것과 같은 이유(단위가 값마다 따라다니면 자릿수 정렬이 깨진다) | 표·CSV·상세의 시각이 전부 'YYYY-MM-DD HH:mm:ss'. 발생 횟수가 천 단위 구분. 상세에서만 '회' | pass |
| ERP-08 | P2 | **충족 — 4화면 중 이 화면이 이 요구를 가장 온전히 만족한다.** ① 숫자가 전부 `formatNumber` 경유 ✔(`ErrorLogPage.tsx:66` 표 셀 · `:83` 상세 · `:98,99` 요약 경고). ② **화면 셀에 `String(`/`toString()` 이 0건이다** — `apps/admin/src/pages/logs/errors/**` 의 `String(` grep = **1건이고 그것은 CSV 다**(`data-source.ts:64` `String(entry.occurrences)`) — **요구의 범위(셀)가 아니고, 오히려 옳다**: CSV 에 `formatNumber` 를 쓰면 `'1,340'` 이 되어 엑셀이 수로 읽지 못한다. **FS-062 는 화면 셀에 `String()` 이 1건 있어 부분 pass 였다**(NFR-062 §3 ERP-08) — **같은 종류의 화면인데 이쪽이 깨끗하다.** ③ 미래 timestamp 없음(**감사 기록에 미래는 없다** — `validation.ts:64-71`). 상대시간 미사용 | `grep "String(" apps/admin/src/pages/logs/errors/` → 1건이고 CSV 다. `ErrorLogPage.tsx` 에 `String(` = **0건** | pass |
| ERP-09 | P2 | **충족.** 시각 판정이 **전부 KST 고정**(표시 `time.ts:29` · 프리셋 `period.ts:24` · 구간 `:33-35` · '오늘' `validation.ts:104` · 파일명 `LogListShell.tsx:182` · 픽스처 `fixture-lib.ts:43-44`). 정본은 `shared/format.ts` 이고 **달력 산술의 앵커가 UTC 정오다**(`:39-49,199-218`) — 러너 타임존을 타지 않는다. **삼중 사본이 이 한 벌로 수렴했고 그 정본의 뿌리가 `logs/time.ts` 였다**(`time.ts:4-13`). **이 파일에 남은 것은 초 정밀도 하나다**(`:14-18`) — 그 요구는 FS-062 의 것이나 **이 화면도 그 수혜자다**: 결제 게이트웨이 타임아웃이 340회 연쇄한 새벽 3시 41분의 순서가 분 단위로는 사라진다(`fixtures.ts:33`) | 브라우저 TZ 를 `America/Los_Angeles` 로 → 시각·프리셋·구간 경계가 서울 기준으로 동일. `logs.test.ts:82-106` · `:133-139`(`withinRange` 가 KST 달력일로 양 끝 포함) | pass |
| ERP-12 | P1 | **충족 — 그리고 이 화면의 CSV 열 구성 자체가 보안 결정이다.** ① 필터 전체 CSV(`adapter.ts:45-54` → `query-engine.ts:159-164`) + 성공 문구가 '(현재 필터 조건 전체)'임을 명시(`LogListShell.tsx:184-186`). ② 한글 header **7열**(`data-source.ts:58-66`). ③ UTF-8 BOM(`shared/download.ts:16,37`). ④ progress = 스피너 + **취소 경로**. ⑤ 화면과 같은 순서(`runLogExport`). ⑥ **스택·컨텍스트 열이 없고 그 자리에 추적 ID 가 있다** — 근거가 명시돼 있다(`:52-56`: '스택에는 내부 경로·커넥션 문자열·토큰이 들어 있다 … 대신 추적 ID 를 싣는다: 개발자는 그것 하나로 서버 로그에서 전문을 찾는다'). **판단이 명시적이고 대체 경로까지 설계했다** — 형제 중 가장 성숙한 CSV 결정이다. ⚠ **그런데 그 판단이 화면에는 적용되지 않았다**(§4.4 · §5 #14) | 필터를 걸고 내보내기 → 조건 전체. **스택 열이 없다.** '추적 ID' 열에 `trace-00000001`. 엑셀에서 한글 안 깨짐 | pass |
| ERP-13 | P1 | **충족.** 실패 배너가 조사 헬퍼 경유 — `LogListShell.tsx:282` `objectParticle(spec.entityLabel)` → **'오류 로그를 불러오지 못했습니다.'** (`'오류 로그'` 의 마지막 글자 '그'는 종성 0 = 받침 없음 → `shared/format.ts:306-308` 이 '를'을 낸다. 내가 코드로 대조). 헬퍼는 `shared/format.ts:269+` 한 벌이고 이 섹션의 사본(`logs/josa.ts`)은 수렴됐다(`:273-275`). **`pages/logs/**` 에 사용자 대상 리터럴 '이(가)'/'을(를)'/'은(는)' = 0건** | 배너 문구가 '오류 로그**를**' | pass |
| ERP-15 | P1 | **충족 — 그리고 이 화면의 DOM 이 4화면 중 가장 가볍다.** '1,000행 virtualize/cap' 중 **cap** 을 택했고 근거가 명시돼 있다(`types.ts:178-183`). **캡이 우회 불가능하다** — `isPageSize`(`:196-198`)가 허용 목록 자체를 판정으로 쓰므로 `?size=5000` 도 20 으로 떨어진다(`list-state.ts:68-71`). **최대 100행 × 5열 = 4화면 중 최소**(형제는 6열). 가로 스크롤 래퍼(`LogListShell.tsx:82-85`). ⚠ pin(sticky) 없음(§3 ERP-03) · **점프 수단 없음**(§4.3) | `/logs/errors?size=5000` → 20줄. 최대 100행 × 5열 | pass |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 앱 전체 grep = **0**(내가 직접 실행). 서버 5초/30초 상한(BE-063 §3.3)에 대응하는 프론트 상한이 없다. **다만 내보내기에는 사용자 취소 경로가 있다**(FS-063-EL-009.1) — 조회에는 없다 | 응답 없는 백엔드 → 스켈레톤이 영원히 남는다. **거짓 사실을 단정하지는 않는다** | gap |
| EXC-06 | P1 | **미충족 — 그리고 이 화면에서 가장 아이러니하다.** `LogListShell.tsx:233` 의 `error === null` 하나로 401/403/429/500/504 가 전부 '오류 로그를 불러오지 못했습니다.' 한 문구(`:282`). **429 도 같은 배너라 '잠시 후'라는 단서가 없다.** **화면의 존재 이유가 오류를 심각도·발생 위치로 갈라 보여주는 것인데**(FS-063 §1.2: '경고를 오류와 섞지 않는다 — 섞으면 진짜 사고가 잡음에 묻힌다') **자기 실패는 한 칸에 뭉쳐 놓는다** | `?fail=logs-errors:list` 와 서버 403·429 가 **같은 배너** | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 앱 전체 grep = **0**(내가 직접 실행) | 오프라인 전환 → 오프라인 고지 없음 | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf). **상세는 라우트가 아니라 다이얼로그**이고 이미 손에 있는 행 객체로 그린다(`LogListShell.tsx:297-302` — 추가 조회 0건) — '없는 로그를 열었다'가 원리적으로 발생하지 않는다. **그리고 밖으로 나가는 링크가 없어** '삭제된 레코드로 이동'하는 경로도 없다 | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트 없음(write 0건 · `queries.ts:6-9`) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk·다중 선택 없음(체크박스 0개 — `LogTable.tsx:6-7`) | 재현할 표면 없음 | N/A |
| EXC-20 | P1 | **미충족 — 그리고 이 화면에서 가장 모순적이다.** 조회 실패 배너에 **참조 코드가 없다**(`LogListShell.tsx:280-292` 가 `referenceOf(cause)` 미사용 — 앱의 `referenceOf` 소비처는 `useCrudForm.ts:195` · `ReturnDetailPage.tsx:211` · `ErrorBoundary.tsx` 뿐이다). **화면의 존재 이유가 정확히 그 요구다** — `errors/types.ts:52-55` 가 `traceId` 를 '**EXC-20 의 reference**'라 부르며 '운영자가 이것을 복사해 개발자에게 준다 — 없으면 "오류 났어요"로 끝나 아무도 못 찾는다'고 적고, 상세(`ErrorLogPage.tsx:85`)와 CSV(`data-source.ts:65`)가 그것을 싣는다. **즉 요구를 알고, 그 이름으로 부르고, 남에게 그 값을 제공하면서 자기 실패에는 주지 않는다** — **오류 로그가 오류를 냈을 때 운영자는 '오류 났어요'라고밖에 말할 수 없다.** ⚠ **요구의 후반('raw 서버 error body/stack 미노출')은 충족한다** — 이 화면이 렌더하는 스택은 *로그의 데이터*이지 *이 화면 자신의 에러 응답*이 아니다. 그 구분은 §4.4 에 적는다 | `?fail=logs-errors:list` → 복사 가능한 코드 없음. **정작 성공했을 때는 행마다 추적 ID 가 있다** | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ `LATENCY_MS = 400`(`adapter.ts:36` ← `shared/crud`)은 **개발용 지연이며 성능 예산이 아니다.** 부피는 '크지만' 관리자 로그의 수천 배는 아니다(`errors/types.ts:99-100`) — FS-062 와 FS-060 사이다 |
| DOM 규모 | **구조적 상한** — 최대 100행 × **5열**(4화면 중 최소) | `isPageSize` 화이트리스트 캡(`types.ts:196-198`) | 오류가 1억 건이어도 표는 100행. ⚠ **'오류' 컬럼이 wrap 이라 행 높이는 가변**(코드 + 메시지 두 줄) |
| CPU (현재 · 픽스처) | **O(N) per 조회** | `runLogQuery`(`query-engine.ts:142-156`) | ⚠ 기간 필터를 **두 번** 돈다(`:146-147` — `withinPeriod` + `applyLogQuery`). 배지 모수(기간 전부)와 결과 모수(축·검색 적용 후)가 달라 불가피하다. 백엔드 연동 시 사라진다 |
| 마스킹 비용 | **열 때만 O(페이로드 크기)** | `formatMaskedPayload` 는 다이얼로그에서만(`LogPayloadDialog.tsx:96`) | **목록 렌더에는 마스킹 비용이 0이다.** ⚠ **그것은 곧 목록의 100행 페이로드가 마스킹을 한 번도 거치지 않은 채 메모리에 있다는 뜻이다**(§4.4) |
| 페이로드 전송량 | ⚠ **측정 불가 · 상한 없음** | 목록 응답이 **모든 행의 스택 전문 + 컨텍스트**를 싣는다(BE-063 §7.2) | **행 수는 캡되지만 행의 크기는 캡되지 않는다.** 스택은 길다 — `masking.ts:135` 의 `MAX_DEPTH = 6` 은 **깊이만** 자르고 문자열 길이는 자르지 않는다 |
| **서버 스캔** | ⚠ **미정** | 조회 5초 / 내보내기 30초(BE-063 §3.3 → BE-060 §3.4) | 90일 상한이 규모를 1차로 제한한다. **상한이 보존기간의 절반이라 그 한계가 성능 때문인지 우연인지 근거가 없다**(§5 #15) |
| 재조회 횟수 | **조건 변경당 1회** | `staleTime` 미지정(기본 0) | **감사 로그에서는 그것이 맞다** — 방금 깨진 것을 봐야 한다 |
| 번들 | **이 화면 전용 의존 0** | 4화면이 셸 한 벌 공유. zod/mini(+4.6kB) | 차트·집계·그룹핑 라이브러리 미도입 — 그래서 §4.3 의 질문들에 답하지 못한다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). status 분기 없음(§3 EXC-06) · **참조 코드 없음(§3 EXC-20 — 이 화면에서 가장 모순적)** |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤 + '불러오는 중…' + `aria-busy`(`LogTable.tsx:136`) |
| 0건 | 빈 상태 3분기 + 복구 | ✔ (§3 STATE-05). ⚠ **여기서 0건은 좋은 소식인데 문구는 그렇게 말하지 않는다**(§5 #12) |
| **기간 입력 오류** | 원인이 자기 입력임을 알려야 | ✖ **요약·필터는 알리는데 표는 '깨진 게 없다'고 단정한다**(§2 STATE-01 gap). **거짓 안심** |
| 백엔드 무응답 | 상한에서 abort + 고지 | ✖ 조회는 무한 대기(§3 EXC-05). 내보내기는 취소 가능 |
| 레이트리밋(429) | '잠시 후' 안내 | ✖ 일반 실패 문구(§3 EXC-06) |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ **손실 0 — 조회 조건이 URL 에 있다**(§2 EXC-02 · IA-13) |
| 권한 강등(mid-session) | UI reconcile | ✔ `useRouteCan` 이 스토어 구독 → 내보내기 버튼이 사라진다 |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | abort, 실패 아님 | ✔ 토스트 0건 + 상태 복원 |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01 — 종속) |
| 페이로드 직렬화 실패 | 화면이 죽지 않아야 | ✔ `masking.ts:183-189` → '[페이로드를 표시할 수 없습니다]' |
| 페이로드가 `null` | 지어내지 않아야 | ✔ `LogPayloadDialog.tsx:86` 이 절 전체를 미렌더 |
| **서버가 4번째 심각도를 보냄** | 알 수 없음을 표시 | ✖ **심각도 셀이 비고**(`ERROR_SEVERITY_LABEL[…]` = `undefined` — `ErrorLogPage.tsx:36`) **색도 사라지는데**(`severityColor[…]` = `undefined` — `:32`) **행은 여전히 danger 톤이다**(`toneOf` 가 'warning' 이 아니면 danger — `:70-72`). 축에서 고를 수도 없다(`types.ts:79-82` 가 라벨 맵에서 옵션 파생 + `list-state.ts:88-89` 가 'all' 로 떨어뜨림). **강조된 행에 심각도가 없다** — §5 #10 |
| **서버가 6번째 발생 위치를 보냄** | 알 수 없음을 표시 | △ **셀에는 그대로 그려지지만**(`ErrorLogPage.tsx:60` 이 값을 그대로 렌더) **축에 옵션이 없어 고를 수 없고**(`types.ts:89-92` 가 `ERROR_SOURCES` 상수에서 파생) 링크 공유도 안 된다. `countAxes`(`query-engine.ts:92-98`)는 세지만 화면에 그 칸이 없다 — §5 #10 |
| **서버가 표기를 바꿈**(`'주문API'`) | 배지가 맞아야 | ✖ **배지가 0 이 된다** — `LogFilterPanel.tsx:132` 가 `axisCounts?.[axis.key]?.[id]` 로 **문자열 정확 일치** 조회를 한다. 공백 하나 차이로 그 오류들은 어느 축 칸에도 안 잡히면서 `all` 에는 포함돼 **숫자가 안 맞는다**(BE-063 §6.1 #3) |

### 4.3 이 화면이 답하지 못하는 운영 질문

**§5 의 gap 이 아니라 범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '**같은 오류가 몇 번**이죠?' | **답한다 — 그것이 `occurrences` 다**(`errors/types.ts:48-51`). ⚠ **그런데 그 숫자의 정의가 어디에도 없다** — '같은 오류'를 무엇으로 묶는지(코드? 코드+위치? 스택 해시?), 어느 창에서 세는지가 코드에 없고 픽스처가 숫자를 박아 넣는다(`fixtures.ts:38`). **340 을 믿으려면 그 정의가 필요하다**(§5 #16 · BE-063 §7.6 #7) |
| '**340회가 눈에 띄나요?**' | **아니다** — `ErrorLogPage.tsx:66` 이 `formatNumber` 만 그린다. **화면 자신이 '1회와 340회는 완전히 다른 사건'이라 말하면서**(`types.ts:48-51`) 둘을 같은 스타일로 그린다. 형제 FS-062 는 같은 문제를 임계로 풀었다(`SLOW_THRESHOLD_MS` → 색+글자) — **같은 섹션에서 한 화면은 풀고 한 화면은 안 풀었다**(§5 #7) |
| '**치명만 눈에 띄나요?**' | **아니다** — `severityColor`(`:21-25`)가 critical·error 를 **둘 다 danger-text** 로, `toneOf`(`:70-72`)가 **둘 다 danger 배경**으로 준다. **3단계 심각도가 2단계 시각으로 붕괴한다**(§5 #6). 우회는 정렬(심각도 = RANK 순)뿐 |
| '작년에도 이랬나' | **불가 — 그리고 그것이 보존기간을 180일로 정한 이유다**(`types.ts:99-101`). 조회 상한이 90일이라 **보존의 근거가 조회 표면에서 절반만 실현된다**(§5 #15) |
| '이미 고친 오류를 목록에서 내리기' | 불가 — **'해결됨'을 의도적으로 만들지 않았다**(`types.ts:6-10` — BE-063 §3.4 가 계약으로 승격). ⚠ **그 대가**: 같은 오류가 매일 뜨면 운영자가 눈으로 건너뛰는 법을 배우고, 그때 이 화면은 '아무도 안 보는 오류 로그'가 된다 — **이 화면이 피하려던 바로 그 결말이다**(`:18-20`). 해법은 '해결됨'이 아니라 더 세밀한 필터이거나 이슈 트래커 연동이다(§5 #17) |
| '이 사건이 API 로그의 무엇과 이어지나' | **불가 — 그런데 픽스처가 그 교차를 의도적으로 설계했다**(`fixtures.ts:6-9`: '두 화면을 나란히 놓으면 사건이 재구성된다 … 감사 화면이 여러 개인 이유가 이것이다'). `ORDER_CREATE_FAILED` 의 컨텍스트에 `upstream: 'PAYMENT_GATEWAY_TIMEOUT'`(`:64`)이라는 **명시적 연결이 있는데도** 건너뛸 수 없다. **URL 이 열려 있는 것이 유일한 구제책이다**(IA-13) — §5 #11 |
| '스택 안의 문자열로 검색' | 불가 — `searchOf`(`data-source.ts:24`)가 **코드·메시지·발생 위치·추적 ID 4필드**만 본다. **추적 ID 로 되찾는 왕복은 된다**(`:23`) — 그것이 이 화면의 사용법이다 |
| '오류 그룹핑 · 발생 추이 · 알림 연동' | 불가 — 표면 0개. 집계 라이브러리 미도입 |
| '100페이지 뒤로' | **URL 로만 가능** — 번호가 주변 최대 5개뿐이고(`Pagination.tsx`) 첫/마지막 점프 버튼이 없다. `?page=` 를 손으로 고치는 것이 실질적 수단이다(IA-13 이 구제책) |
| '내보내기를 두 번 눌렀는데 파일이 두 개' | **가능한 일이다**(§2 EXC-08). 서버가 갈라지지 않아 무해하나 **분당 3회 제한의 2/3 를 쓴다**(BE-063 EP-02) |

### 4.4 데이터 보존 · 감사 — **새는 것이 내부 구조이고, 개인정보가 거기 섞여 들어왔다**

| 항목 | 상태 |
|---|---|
| 이 화면의 쓰기 | **없다 — 그리고 '해결됨'조차 없다**(BE-063 §3.4). `logs.test.ts:59-72` 가 이 어댑터의 export 목록을 전수 단언(`errorLogSpec`·`fetchErrorLogs`·`fetchErrorLogsForExport`·`toCsv`)하고, **금지 정규식에 `resolve`·`archive` 가 포함돼 있다**(`:69`) — **그 두 단어는 이 화면 때문에 그 목록에 있다**(형제들에는 해결할 것이 없다). `resolveError` 를 추가하는 순간 빨개진다 |
| **✔ 컨텍스트의 회원 이메일 — 이전 기준의 실재 노출은 막혔다** | **기준 `4b805ad` 에서 이 행은 '확인된 실재 노출' 이었다.** `KEY_RULES` 7규칙 어디에도 `recipient` 가 걸리지 않아 `ruleOf`(`masking.ts:78-80`)가 `undefined` 를 내고 `walk`(`:161`)가 값을 그대로 통과시켰다 → `formatMaskedPayload`(`LogPayloadDialog.tsx:96`)가 회원 이메일을 원문으로 렌더했다. **커밋 `ebb0e4c` 가 규칙을 넓혔다** — `masking.ts:73` `/e[-_]?mail|이메일|recipient|수신자/i`, `kind: 'email'` → `'user1099@example.com'` → `'us●●●●●●@example.com'`(`maskEmail` `:95-103`). 코드가 그 사연을 주석으로 남겼다(`:67-72`). **한 건이 아니었다는 점이 이 수정의 값을 키운다** — `sporadicErrors`(`fixtures.ts:132-148`)가 7일 간격으로 `EMAIL_BOUNCED` 를 반복 생성하고, **`EMAIL_BOUNCED` 는 알림 발송 오류라 본질적으로 수신자를 담는다**(우연이 아니라 이 도메인의 자연스러운 데이터다). ⚠ **그러나 이것은 이 키 이름 하나를 안 것이다** — BE-063 §7.1 판정 #2·#3(값 기반 탐지 · 서버 정제)은 미결이다 |
| **✔ 이제 테스트가 그것을 막는다** | 이전 기준에서 `logs.test.ts:313-319` 는 이 화면의 페이로드에서 **`smsp_live_…`·`pg_live_…`·`Str0ngPass` 셋만** 단언했다 — **전부 자격증명이다.** **테스트의 편향이 코드의 편향을 그대로 복제했다**: 위험 인식이 자격증명·내부구조에 맞춰져 있고 개인정보가 시야 밖이었다. **지금은 둘 다 있다** — `logs.test.ts:226-233`('중첩된 recipient 의 메일 주소를 가린다 — **이 구멍이 실제로 뚫려 있었다**') · `:330-343`('오류 로그의 수신자 메일 주소가 사라진다 (EMAIL_BOUNCED)'). ⚠ **형제 FS-061 의 `address` 는 여전히 테스트 밖이고 여전히 노출된다**(`member-activity/fixtures.ts:91` — BE-061 §7.1). **같은 뿌리가 아직 살아 있다** |
| **마스킹의 성격 — 표시 통제이지 보안 통제가 아니다** | ⚠ **`masking.ts:18-22` 가 이미 정직하게 적었다**: '클라이언트 마스킹은 **두 번째 방어선**이다. 진짜 방어선은 애초에 비밀을 로그에 쓰지 않는 것이고 그 다음이 서버가 저장 시점에 가리는 것이다. 여기서 가리는 것은 이미 저장돼 버린 페이로드가 화면에 닿는 마지막 순간을 막을 뿐이다.' **즉 원본은 이미 브라우저에 도달해 있다** — `maskPayload` 는 렌더 직전에 **새 객체를 만들 뿐 원본을 바꾸지 않는다**(`:165-166,168-170`). devtools·네트워크 탭·`window` 메모리로 우회된다. **`recipient` 규칙을 추가해도 그 성질은 바뀌지 않는다** — 그것은 화면에서 지우는 것이지 보내지 않는 것이 아니다. 1차 방어선은 서버다(BE-063 §7.1 #1) |
| **마스킹이 세 종류의 비밀 중 둘을 잡는다** | **자격증명** → ✔ 전부 잡힌다(규칙 4개가 정확히 겨냥). **개인정보**(`recipient`) → ✔ **이제 잡는다**(`masking.ts:73` — 기준 `a5c2639`). **단 이 키 이름을 알아서 잡는 것이다** — `to`·`receiver` 로 오면 다시 샌다. **내부 구조**(`stack` 문자열의 경로 `'payment/client.ts:118'` · `endpoint: 'https://pg.example.com/v2/authorize'` · `gateway` · `job`) → **✕ 놓치는데 그것은 의도로 보인다** — 스택이 안 보이면 이 화면의 존재 이유가 사라진다. ⚠ **다만 `stack` 은 키가 하나뿐이라 그 안에 무엇이 들어 있든 마스킹이 닿지 않는다**(`ruleOf('stack')` = undefined → 문자열 통째로 통과). 예외 메시지에 토큰이 섞이는 것은 흔하다(`'Invalid token: eyJhbGci…'`) — **지금 구조로는 막을 방법이 없다**(BE-063 §7.1 #3) |
| **화면 문구가 지키지 못할 약속을 한다** | ⚠ FS-063-EL-016.3 의 '비밀번호 · 토큰 · 인증 키 · 카드/계좌 번호 등 민감한 값은 **자동으로** 가려집니다'(`LogPayloadDialog.tsx:91-94`)는 실제로 '**우리가 아는 이름의** 값은 가려집니다'다. **그 문구는 열거한 넷은 정확히 지킨다** — 그리고 이메일은 열거하지 않았다. 문구가 스스로의 한계를 우연히 정직하게 적은 셈이나, '민감한 값은 자동으로'라는 총칭이 그것을 다시 덮는다 |
| **CSV 에서 뺀 스택이 화면·네트워크로는 전량 온다** | ⚠ **이 화면에서 그 비대칭이 가장 자각적이다.** `data-source.ts:52-56` 이 위험을 정확히 진술하고 CSV 열을 뺐다 — **그런데 (a) 같은 스택이 상세 다이얼로그에는 그대로 나온다**('메일로 오가면 위험한' 그 내용이 화면 공유·스크린샷으로는 나간다. 파일에서 뺀 이유가 화면에서는 성립하지 않는다는 판단의 근거가 코드에 없다) **(b) EP-02 응답 배열에 `payload` 가 실려 온다** — `ErrorLogEntry.payload` 가 **필수 필드**라(`types.ts:58`) `toCsv` 가 그 열을 **버릴 뿐**이다 **(c) 상세를 한 건도 열지 않아도 100건의 스택이 이미 브라우저에 있다** — 목록에 그려지는 5개 컬럼에 스택은 없다. BE-063 §7.2 |
| **EXC-20 의 두 얼굴** | ✔ **구분해서 판정한다.** 요구의 'raw stack 미노출'은 **앱 자신의 에러 응답**을 사용자에게 prose 로 뱉지 말라는 것이고, 이 화면이 렌더하는 스택은 **감사 대상 데이터**다 — 요구 위반이 아니다. **위반은 그 반대편이다**: 이 화면은 남의 스택은 보여주면서 **자기 실패에는 reference 를 안 준다**(§3 EXC-20). 그리고 데이터로서의 스택 노출은 **보안 축(BE-063 §7.1·§7.2)이 판정한다** — quality-bar 의 어느 ID 에도 정확히 걸리지 않는다 |
| 보존기간 | ⚠ 화면이 '180일 · 자동 폐기'를 **단언**하는데(`LogFilterPanel.tsx:169-170` ← `errors/types.ts:102-105`) 이행 주체가 없다(BE-063-EP-05 — **심 없음**). ⚠ **그리고 조회 상한(`logs/types.ts:89` `MAX_RANGE_DAYS = 90`)의 두 배라 앞 90일은 화면으로 볼 수 없다** — **데이터는 있는데 도달 경로가 없다.** 보존을 180일로 정한 근거('작년에도 이랬나')가 조회 표면에서 절반만 실현된다. **두 상수가 서로를 모른다**(하나는 화면별, 하나는 4화면 공용) |
| 개인정보 | **낮아야 하는데 낮지 않다.** 이 로그에는 행위자가 없고(`errors/types.ts:38-59` — actor/member/ip 필드 0개) 그래서 `logs.test.ts:325-329` 의 IP 규율 검사에서 **이 화면의 픽스처만 제외된다.** ⚠ **그런데 개인정보는 컨텍스트로 들어온다** — 구조적으로 없다고 설계한 것이 데이터로 들어온 것이고, **그것이 이 구멍이 보이지 않았던 이유다** |
| **열람 감사** | ⚠ **없다**(BE-063-EP-07 — 심 없음). **이 화면은 내부 구조 지도라 그 필요가 있다** — `read` 를 가진 사람은 ① 어느 서비스가 어떤 스택으로 깨지는지 ② 업스트림 호스트와 커넥션 문자열의 모양 ③ 그리고 회원 이메일을 본다 |
| 반출 통제 | ✔ `export` 를 `read` 와 분리해 프론트가 게이팅(`LogListShell.tsx:115` · `LogToolbar.tsx:117`). **단 서버가 같은 판정을 안 하면 장식이고, 그 응답에는 스택 전문이 실려 있다**(BE-063 §3.1 · §7.2) |
| **CSV 수식 주입** | ✔ **막힌다**(기준 `a5c2639` 에서 신설). `shared/download.ts:40-44` `neutralizeFormula` 가 선두 `=`/`+`/`-`/`@`/탭/CR(`FORMULA_LEAD` `:22`)을 작은따옴표로 무력화하고, `escapeCell :50-54` 가 **무력화를 RFC 4180 따옴표 감싸기보다 먼저** 수행한다(`:48` 이 그 순서의 이유를 밝힌다 — 붙인 작은따옴표까지 따옴표 안에 들어가야 한다). 이 화면의 CSV 셀은 전부 `toCsvText`(`query-engine.ts:187`) → `escapeCell` 을 지난다. 순수한 수는 예외로 통과시켜(`PLAIN_NUMBER` `:29`) 숫자 열이 텍스트로 변질되지 않는다. 회귀 테스트 `shared/download.test.ts:15-49`(무력화 7건) · `:51-68`(수는 그대로) · `:70-86`(RFC 4180 계약 유지 — **헤더도 같은 규칙을 탄다** `:84-85`) |
| 토큰 승격 후보 | `typography.font-family.mono` — `logs.css:86`(근거 `:68-72`). TOKEN-01 의 문자에는 안 걸린다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-01** | **P0** | **기간 입력이 유효하지 않으면 조회가 걸리지 않았는데도 표가 `<Empty>` 를 그린다.** `LogListShell.tsx:152` 가 `enabled: false` 로 막는 것은 의도인데(`validation.ts:11-12`), `:251-269` 가 표를 그려 `entries=[]`·`loading=false` 가 빈 상태로 떨어진다. **이 화면에서 결과가 4형제 중 가장 무겁다** — '기록된 오류 로그가 없습니다'는 '못 찾았다'가 아니라 '**깨진 게 없다**'로 읽혀 **운영자가 안심한다. 거짓 안심이 거짓 불안보다 위험하다.** **화면 코드로 해소 가능** — 표 자리에 `range === null` 분기를 추가하면 된다 | 이 화면 + 4형제 공용(`LogListShell`) | **UI 기획 쪽 변경 요청 (FS-063 §7 #3)** |
| ~~2~~ | ~~MOTION-01~~ | — | **해소됨(PR #26 · 기준 `a5c2639`).** Modal 에 backdrop fade + dialog scale(0.96→1) enter/exit 가 실재한다(`Modal.css:20-21,30-38,58-59` → keyframes `:126-168`) — CSS-only 이고 완료 감지는 `onAnimationEnd`(`Modal.tsx:216-218`)다. 판정 `gap` → `종속`(§2). **남은 판단은 DS 의 것**: AnimatePresence 부재를 gap 으로 볼지 · 푸터 버튼 경로가 여전히 즉시 언마운트인 것(`Modal.tsx:27-31`)을 gap 으로 볼지 | 앱 전역(DS) | **DS 소유 문서 (이 문서에서는 종결)** |
| ~~3~~ | ~~MOTION-02~~ | — | **해소됨(PR #26 · 기준 `a5c2639`).** toast exit 가 실재한다 — `.tds-toast--exiting`(`Toast.css:32-37`) + keyframes `:121-131`, `exit-duration`={motion.duration.fast}(150ms) · `exit-easing`={motion.easing.accelerate}(`tokens.json:1298-1307`). **요구가 명시한 수치를 그대로 만족한다.** 판정 `gap` → `종속`(§2) | 앱 전역(DS) | **DS 소유 문서 (이 문서에서는 종결)** |
| 4 | ERP-03 | P1 | sticky thead 없음 — 크기 100 에서 '발생 횟수'가 어느 컬럼인지 사라진다. ⚠ 심각도 셀은 색+글자를 스스로 가져 완화되나 **숫자 컬럼은 그렇지 않다** | 이 화면 + 4형제 공용(`LogTable`) | UI 기획 |
| 5 | ERP-05 | P1 | 범위 요약·크기 선택이 DS `Pagination` 의 opt-in 표면(`Pagination.tsx:112,170-172`)을 쓰지 않고 화면 사본(`LogListShell.tsx:314-336`)으로 있다. **DS 의 `role="status"` announce 가 없다.** `:311-312` 주석이 낡았다. **앱 전역 `pageSize` prop 호출부 0건** | 이 화면 + 4형제 공용 + DS | UI 기획 · 프론트 리팩터 (FS-063 §7 #6) |
| 6 | — | P1 | **⚠ 치명과 오류가 같은 색·같은 톤이라 글자만이 그 둘을 가른다.** `severityColor`(`ErrorLogPage.tsx:21-25`)가 critical·error 를 **둘 다 `feedback-danger-text`** 로, `toneOf`(`:70-72`)가 **둘 다 danger 배경**으로 준다. 이 화면의 원칙은 '**경고를 오류와 섞지 않는다 — 섞으면 진짜 사고가 잡음에 묻힌다**'(`types.ts:16-20`)인데 **같은 논리가 치명 vs 오류에도 적용된다**: 경고 300건보다 치명 1건이 급하다는 것을 요약 줄은 알지만(`:93`) **표는 모른다.** 이중 인코딩(색+글자)은 충족하나 **3단계 심각도가 2단계 시각으로 붕괴한다** | 이 화면 | UI 기획 쪽 변경 요청 (FS-063 §7 #6) |
| 7 | — | P1 | **발생 횟수에 임계 강조가 없다 — 340 과 1 이 같은 스타일이다**(`ErrorLogPage.tsx:66`). **화면이 스스로 '1회와 340회는 완전히 다른 사건'이라 말하면서**(`types.ts:48-51`) **'한 줄로 보이는' 문제를 절반만 풀었다** — 두 줄이 다르긴 한데 눈에 띄지 않는다. **형제 FS-062 는 같은 문제를 임계로 풀었다**(`SLOW_THRESHOLD_MS` → 색+글자) — 같은 섹션에서 한 화면은 풀고 한 화면은 안 풀었다 | 이 화면 | UI 기획 쪽 변경 요청 (FS-063 §7 #7) |
| 8 | **A11Y-09** | P1 | **강조 없는 행이 하나도 없다 — 그리고 그것이 대비 측정을 필수로 만든다.** `toneOf`(`ErrorLogPage.tsx:70-72`)에 **neutral 분기가 없어** 표 전체가 feedback surface 로 덮인다. 결과: **모든 행에서** `feedback-*-text` 가 `feedback-*-surface` 위에 있고(심각도 셀) **모든 행의 메시지가 `text-muted` 로 그 위에 있다**(`cells.tsx:72`) — 요구가 명시적으로 '**muted 본문은 면제 아님**'이라 한 그 조합이다. hover 시 배경이 `feedback-*-border` 로 더 진해진다(`logs.css:27-29,35-37`). **형제 셋에서는 예외 행에만 있는 쌍이 여기서는 전 행이다.** 그리고 **전부 강조하면 아무것도 강조되지 않는다** — 이 화면이 '경고를 오류와 섞지 않는다'로 피하려던 결과다 | 이 화면(구성) + tokens(측정) | UI 기획 쪽 변경 요청 · **프론트 리팩터 (대비 측정 — light/dark × hover)** (FS-063 §7 #10) |
| 9 | — | P1 | **요약 줄의 경고가 축·검색을 좁혀도 줄지 않는다.** `highlightOf`(`ErrorLogPage.tsx:93-101`)가 `axisCounts` 를 읽고 그 값은 **기간 안 종합**이다(`query-engine.ts:79-102` — 의도된 규칙). **이 화면에서 특히 혼란스럽다** — 심각도를 '경고'로 좁힌 화면 **바로 위에** '이 기간의 치명 오류 2건'이 뜬다. 규칙으로는 옳지만(기간이 스코프) 문구에 '(필터와 무관)' 같은 단서가 없다 | 이 화면 | UI 기획 쪽 변경 요청 (FS-063 §7 #9) |
| 10 | — | P1 | **축의 어휘가 클라이언트 상수이고 하나는 픽스처에 결합돼 있다.** `ERROR_SOURCES`(`types.ts:63-70`) 주석이 자백한다: '**픽스처가 쓰는 목록과 같아야 한다**'. **셋이 겹친다**: ① `source` 가 enum 이 아니라 **자유 문자열**(`:42`)이라 서버가 검증할 기준이 없다 ② 6번째 위치가 오면 **셀에는 그려지나**(`ErrorLogPage.tsx:60`) 축에서 못 고르고 `readAxes`(`list-state.ts:81-92`)가 URL 값을 'all' 로 떨어뜨려 **링크 공유가 깨진다** ③ **공백 하나만 달라도 배지가 0** 이 된다(`LogFilterPanel.tsx:132`). ⚠ **심각도는 증상이 다르다** — 4번째 값이 오면 `ERROR_SEVERITY_LABEL[…]`·`severityColor[…]` 가 `undefined` 라 **셀이 비고 색이 사라지는데 `toneOf` 는 여전히 danger 톤을 준다**(§4.2) — **강조된 행에 심각도가 없다.** 형제 화면의 라벨 맵 문제와 같은 뿌리이되(NFR-060 §5 #9 · NFR-061 §5 #9 · NFR-062 §5 #7) **여기서는 두 축이 각각 다른 방식으로 깨진다** | 이 화면 + 서버 계약 | **UI 기획 · 백엔드 명세 (BE-063 §7.4 · FS-063 §7 #8)** |
| 11 | — | P1 | **한 사건의 자국을 건널 경로가 없다.** 픽스처가 **의도적으로** 설계했다(`fixtures.ts:6-9`: '두 화면을 나란히 놓으면 사건이 재구성된다 … **감사 화면이 여러 개인 이유가 이것이다**') — 결제 게이트웨이 타임아웃(치명, 340회)이 API 로그의 5xx 스파이크와 **같은 시각**이고, `ORDER_CREATE_FAILED` 의 컨텍스트에 `upstream: 'PAYMENT_GATEWAY_TIMEOUT'`(`:64`)이라는 **명시적 연결**까지 있는데 건너뛸 수 없다. **URL 이 열려 있는 것이 유일한 구제책이다**(IA-13). 서버가 상관관계 id 를 준다면 그 경로가 열린다 — **심이 없다** | 이 화면 + 서버 | UI 기획 · 백엔드 명세 · 아키텍처 (BE-063 §7.6 #12) |
| 12 | — | P2 | **이 화면의 빈 상태는 다른 화면과 뜻이 다른데 DS 는 그것을 모른다.** '기록된 오류 로그가 없습니다'는 **좋은 소식**이다. `LogTable.tsx:180-187` 의 `createVerb="기록"` 은 4화면 공용이라 **문구가 성취를 성취로 말하지 않는다.** ⚠ 그리고 #1 때문에 **그 좋은 소식이 거짓일 수 있다** | 이 화면 + 4형제 공용 + DS `Empty` | UI 기획 쪽 변경 요청 (낮은 우선 — FS-063 §7 #12) |
| 13 | — | — | **BE-063 §7.1 (보안) — ✔ 발현 해소 · ⚠ 구조 미결.** 이전 기준(`4b805ad`)에서 이 항목은 **이 화면의 최우선 발견**이었다: 컨텍스트의 회원 이메일(`recipient`)이 마스킹 없이 그려졌다. **커밋 `ebb0e4c` 가 막았다** — `masking.ts:73` 이 `/e[-_]?mail|이메일|recipient|수신자/i` 로 넓어져 `'us●●●●●●@example.com'` 이 되고, 회귀 테스트가 함께 왔다(`logs.test.ts:226-233` · `:330-343`). 이전의 '테스트가 잡지 못한다' 도 해소됐다. **BE-063 §7.1 판정 #4(최소 조치)가 그대로 이행된 것이다.**<br>**⚠ 그러나 #4 는 스스로 '이번 구멍만 막는다'고 적었고 그 예고가 맞다 — 다음 셋이 전부 미결이다**: **(a) 키 기반의 구조적 한계** — `KEY_RULES`(`masking.ts:49-75`)는 여전히 키 이름만 보고 값을 보지 않는다(`:47`). `to`·`receiver`·`sentTo` 로 오면 다시 샌다. **코드 자신이 인정한다**(`:71-72`: '이메일을 담은 키는 **이름마다 여기 적어 줘야 한다**') — `^card$` 사연(`:56-61`)에 이어 **같은 모양의 사연이 한 번 더** 적혔다. **(b) `stack` 문자열** — 키가 하나뿐이라 그 안에 무엇이 들어 있든 마스킹이 닿지 않는다(`'Invalid token: eyJhbGci…'`). **지금 구조로는 막을 방법이 없다.** **(c) 마스킹은 표시 통제이지 보안 통제가 아니다**(`:18-22`) — 규칙을 추가해도 원본은 여전히 브라우저에 도착하고 devtools 로 우회된다. **근본 조치는 값 기반 탐지 또는 서버 정제**(`recipient` 대신 `recipientId`)다. **형제 FS-061 의 `address` 는 같은 뿌리이며 아직 발현 중이다**(`member-activity/fixtures.ts:91` — BE-061 §7.1) | 앱 전역(`masking.ts`) + 서버 | **백엔드 명세 · UI 기획 · 아키텍처 (보안 — 구조 미결)** |
| 14 | — | — | **BE-063 §7.2 (보안)** — **CSV 에서 뺀 스택이 화면과 응답으로는 전량 온다.** `data-source.ts:52-56` 이 위험을 정확히 진술하고 CSV 열을 뺐는데 **(a) 같은 스택이 상세에는 그대로 나오고**(그 판단의 근거가 코드에 없다) **(b) EP-02 응답 배열에 `payload` 가 실려 온다**(`types.ts:58` — 필수 필드. `toCsv` 가 버릴 뿐) **(c) 상세를 안 열어도 100건의 스택이 브라우저에 있다.** **EP-02 에서 `payload` 제거가 필요하고 내보내기 전용 projection 타입이 아직 없다** | 이 화면 + 서버 + 타입 | **백엔드 명세 · UI 기획 (보안)** |
| 15 | — | — | **BE-063 §7.3 (정합)** — **보존기간(180일 — `errors/types.ts:102-105`)이 조회 상한(90일 — `logs/types.ts:89`)의 두 배라 앞 90일은 화면으로 볼 수 없다.** **보존 근거('작년에도 이랬나' — `:99-101`)가 조회 표면에서 절반만 실현된다.** 데이터는 폐기되지 않았는데 도달 경로가 없다. **FS-062 와 같은 구조의 문제이되 방향이 반대다**(거기서는 둘이 같아서 문제였다 — NFR-062 §5 #14). 조회 상한을 화면별로 두거나, 여러 구간을 잇는 경로를 주거나, 보존을 90일로 줄여야 한다 | 도메인 | **백엔드 명세 · 아키텍처** |
| 16 | — | — | **BE-063 §7.6 #6·#7·#9** — **`occurrences` 의 집계 규칙이 미정이다**('같은 오류'를 무엇으로 묶는지·어느 창에서 세는지가 코드에 없고 픽스처가 숫자를 박는다 — `fixtures.ts:38`). **340 을 믿으려면 그 정의가 필요하고**, 없으면 같은 사건이 여러 행으로 쪼개지거나 다른 사건이 한 행으로 뭉친다 — **이 화면은 그 숫자를 '사건의 크기'라 부르므로 정의가 곧 화면의 의미다** · **내보내기 행 수 상한 미정**(90일이 1차 제한) · **열람 감사 부재**(내부 구조 지도라 필요가 있다) | 도메인 | **백엔드 명세 · 아키텍처** |
| 17 | — | — | **BE-063 §7.6 #8 — '해결됨'을 만들지 않는 결정의 대가.** 그 결정 자체는 계약으로 확정됐고 옳다(§3.4). **그러나 '이미 고친 오류'를 목록에서 내릴 방법이 없어** 같은 오류가 매일 뜨면 운영자가 눈으로 건너뛰는 법을 배운다 — **이 화면이 피하려던 '아무도 안 보는 오류 로그'가 된다**(`types.ts:18-20`). **해법은 '해결됨'이 아니라** 더 세밀한 필터(코드 제외 등)이거나 **이슈 트래커 연동**(로그를 바꾸지 않는 별도 매핑)이다 | 도메인 + 이 화면 | **아키텍처 · UI 기획 (범위 결정)** |
| 18 | EXC-05 · EXC-06 · EXC-11 · EXC-20 | P1 | 클라이언트 타임아웃 없음(`AbortSignal.timeout` grep = 0) · 실패가 status 를 안 보고 한 문구로 붕괴(**오류를 갈라 보여주는 화면이 자기 실패는 뭉친다**) · 오프라인 감지 없음(`navigator.onLine` grep = 0) · **참조 코드 없음** — ⚠ **이 화면에서 그 마지막이 가장 모순적이다**: `errors/types.ts:52-55` 가 `traceId` 를 '**EXC-20 의 reference**'라 부르며 '없으면 "오류 났어요"로 끝나 아무도 못 찾는다'고 적고 상세·CSV 에 싣는데, **자기 실패에는 그 열쇠를 안 준다** | 이 화면 + 앱 전역 | UI 기획 · 프론트 구현 · 프론트 리팩터 (FS-063 §7 #15·#16 · BE-063 §7.6 #2·#11) |
| 19 | — | P1 | **검색어 길이 상한이 프론트·서버 양쪽에 없다**(`data-source.ts:24` · `list-state.ts:146`). ⚠ **이 화면의 검색어는 개발자가 티켓에 붙여 온 문자열이다**(`:23`) — 스택 조각이 통째로 붙여넣어질 수 있다 | 이 화면 + 서버 | UI 기획 쪽 변경 요청 · 백엔드 명세 (FS-063 §7 #13 · BE-063 §7.6 #10) |
| 20 | IA-14 | P1 | 가로 스크롤은 충족(`LogListShell.tsx:82-85,251`)이고 **컬럼 5개라 압력이 가장 낮다.** **미충족**: 좌측 필터 폭 고정(`:51` — `@media` 0건) · sticky 없음(#4) · touch-target 미검증 | 이 화면 + 앱 전역 | UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며 실행 결과가 아니다.

### 6.1 실패 재현 (`?fail=`) — 이 화면의 실제 scope 와 op

**이 화면의 scope 는 `'logs-errors'` 다**(`errors/data-source.ts:15`).

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ `adapter.ts:37` `failIfRequested(scope, 'list')` | FS-063-EL-015 조회 실패 배너 |
| `export` | ✔ `adapter.ts:52` `failIfRequested(scope, 'export')` | FS-063-EL-017 실패 토스트 + 다시 시도 |
| `detail` · `save` · `delete` · `resolve` | ✕ — **부르지 않는다** | 해당 없음. **상세는 조회가 아니고**(목록 행 객체로 그린다) **쓰기는 존재하지 않으며 '해결됨'은 만들지 않았다** |

```
/logs/errors?fail=list                조회 실패 → STATE-02 확증
/logs/errors?fail=logs-errors:list    위와 동일(스코프 명시 — 형제 3화면은 멀쩡하다)
/logs/errors?fail=export              내보내기 실패 → 토스트 + 다시 시도
/logs/errors?fail=all                 둘 다
```

### 6.2 P0 gap · 결함 재현

```
# STATE-01 gap — 조회가 걸리지 않았는데 빈 상태가 뜬다 (이 화면에서 가장 나쁘다)
/logs/errors?period=custom&from=2026-07-01&to=2027-01-01
  → 필터 '미래 날짜는 조회할 수 없습니다.' + 요약 '조회 기간을 확인해 주세요.'
  → 그런데 표에는 <Empty> '기록된 오류 로그가 없습니다'          ← gap
  → 이 화면에서 그것은 '깨진 게 없다' 로 읽힌다 — 거짓 안심

# §5 #13 — recipient 마스킹: 기준 a5c2639 에서 해소됐다 (ebb0e4c). 이제 '확증' 절차다:
  masking.ts:73 의 규칙이 넓어졌다:
    이전  /e[-_]?mail|이메일/i                       ✕ 'recipient' 안 걸림  ← 실재 노출이었다
    현재  /e[-_]?mail|이메일|recipient|수신자/i       ✔ kind:'email'
  → ruleOf('recipient') === 'email' → maskSensitive(:125-129) → maskEmail(:95-103)
  → formatMaskedPayload({ context: { recipient: 'user1099@example.com' } })
      === '{ "context": { "recipient": "us●●●●●●@example.com" } }'
  화면 확증: /logs/errors?q=EMAIL_BOUNCED → 행을 연다 → '스택 · 컨텍스트' 블록에 가려진 이메일
  대조군(같은 화면에서 전부 가려진다 — 이제 넷 다):
    connectionString(fixtures.ts:84) → ●●●●●● [마스킹됨]   apiKey(:49) → ●●●●0e13
    token(:121)                      → ●●●●●● [마스킹됨]   recipient(:143) → us●●●●●●@example.com
  → 회귀 테스트: logs.test.ts:226-233 (마스킹 층) · :330 (이 화면의 픽스처)

# ⚠ 남은 구조적 구멍 (해소되지 않았다 — BE-063 §7.1 판정 #2·#3)
  키 이름을 모르면 못 막는다:  maskPayload({ context: { to: 'user@example.com' } })
    → ruleOf('to') === undefined → 원문 통과            ← 규칙에 없는 이름
  stack 은 키가 하나라 안이 안 보인다:
    maskPayload({ stack: 'Error: Invalid token: eyJhbGci...' }) → 원문 통과
  형제 화면의 같은 종류 구멍이 아직 발현 중:
    member-activity/fixtures.ts:91  address: '서울특별시 중구 세종대로 000'  → 원문 통과

# §5 #10 — 알 수 없는 심각도 (픽스처에는 없어 서버 연동 후에만 재현된다)
  ERROR_SEVERITY_LABEL['fatal'] === undefined  → 심각도 셀이 빈다   (ErrorLogPage.tsx:36)
  severityColor['fatal']       === undefined  → 색이 사라진다      (:32)
  toneOf({ severity: 'fatal' }) === 'danger'  → 행은 여전히 danger (:70-72)
  → 강조된 행에 심각도가 없다. 축에서도 고를 수 없다 (types.ts:79-82 · list-state.ts:88-89)

# MOTION-01 / MOTION-02 — 기준 a5c2639 에서 gap 이 아니다 (PR #26). 이제 '확증' 절차다:
상세를 열고 Esc/딤/× 로 닫는다 → backdrop fade + dialog scale(0.96→1), exit 완료 후 unmount
  ⚠ 푸터 '닫기' 는 즉시 사라진다 — Modal 소유 경로가 아니다 (Modal.tsx:27-31)
내보내기 → 토스트 → dismiss → opacity 1→0 + 아래로 밀리며 소멸 (150ms · accelerate)
prefers-reduced-motion: reduce → 위 셋이 전부 즉시 (Modal.css:173-180 · Toast.css:136-141)
```

### 6.3 pass 확증 스위치

```
# ERP-04 — 심각도는 사전순이 아니라 심각한 순 (이 화면 고유)
/logs/errors?sort=severity&dir=asc → 치명 → 오류 → 경고
  → 라벨로 정렬했다면 '경고' < '오류' < '치명' 이라 경고가 맨 위였다
  → logs.test.ts:519-531 이 rank(critical) < rank(warning) 을 단언

# ERP-04 — 숫자 컬럼 (발생 횟수)
/logs/errors?sort=occurrences&dir=desc → 픽스처의 340회(결제 게이트웨이 타임아웃)가 맨 위
  → 우측 정렬 + tabular-nums 라 340 과 1 의 자릿수가 맞는다 (styles.ts:389-393)

# ERP-08 — 화면 셀의 raw toString = 0 (4화면 중 이 화면이 가장 깨끗하다)
grep "String(" apps/admin/src/pages/logs/errors/ → 1건, 그리고 그것은 CSV 다
  → ErrorLogPage.tsx 에는 0건 (FS-062 는 :35 에 1건이 있다)

# ERP-12 — CSV 열 구성 자체가 보안 결정
내보내기 → 7열(시각·심각도·발생 위치·오류 코드·메시지·발생 횟수·추적 ID)
  → 스택 열이 없다 (data-source.ts:52-56 — 근거 명시 + 대체 경로 설계)
  → 그러나 같은 스택이 상세에는 나오고 응답에는 전량 실려 온다 (§5 #14)

# EXC-03 — 권한 게이팅
read 끈 역할   → 403 화면 + fetchPage 호출 0건 (스택을 받아 놓지도 않는다)
export 끈 역할 → 표는 보이고 내보내기 버튼 부재

# EXC-09 — 취소
내보내기 시작 → '취소' → 토스트 0건 + 버튼 복원 + 파일 미다운로드

# ERP-09 — TZ 고정
브라우저 TZ 를 America/Los_Angeles 로 → 시각·'오늘'·구간 경계가 서울 기준으로 불변

# ERP-15 — 렌더 캡
/logs/errors?size=5000 → 20줄 (최대 100행 × 5열 — 4화면 중 최소)

# IA-13 — URL 이 곧 view
/logs/errors?severity=critical&source=%EA%B2%B0%EC%A0%9C+%EC%84%9C%EB%B9%84%EC%8A%A4&sort=occurrences&dir=desc
  → 새 탭에 복사 → 동일 view. 기본값은 URL 에 없다
  ⚠ source 값이 공백을 품은 한국어 자유 문자열이다 — 서버 표기가 바뀌면 조용히 'all' 이 된다
```

### 6.4 단위 테스트 (이 화면의 판정을 고정하는 것)

| 파일 | 고정하는 판정 |
|---|---|
| `logs.test.ts:59-65` | **감사 불변성** — 이 화면 어댑터의 export 목록 전수(`errorLogSpec`·`fetchErrorLogs`·`fetchErrorLogsForExport`·`toCsv`) |
| `logs.test.ts:67-72` | **'해결됨'을 만들지 않는다** — 금지 정규식에 **`resolve`·`archive` 가 포함돼 있고**(`:69`) **그 두 단어는 이 화면 때문에 그 목록에 있다.** `resolveError` 를 추가하면 빨개진다 |
| `logs.test.ts:82-106` | **ERP-09** — KST 고정 · 초 정밀도 · 파싱 불가 값은 원본 반환 |
| `logs.test.ts:133-139` | **기간 경계** — `withinRange` 가 KST 달력일로 양 끝 포함 |
| `logs.test.ts:144-176` | **COMP-11** — 미래·역전·90일·형식 |
| `logs.test.ts:180-274` | **마스킹** — 비밀번호·토큰·커넥션 문자열·카드·이메일·전화 · 중첩 · 원본 불변 · 순환 참조 |
| `logs.test.ts:219-224` | **커넥션 문자열** — 이 화면의 정산 배치 오류가 그 규칙의 대상이다 |
| `logs.test.ts:239-243` | **`maskEmail`** — `'user1042@example.com'` → `'us●●●●●●@example.com'`. ✔ **`recipient` 도 이제 이 함수에 도달한다**(`masking.ts:73` — §5 #13 해소) |
| `logs.test.ts:226-233` | **`recipient` 마스킹 회귀** — '중첩된 recipient 의 메일 주소를 가린다 — 이 구멍이 실제로 뚫려 있었다'. **이 문서가 이전 기준에서 §5 #13 으로 잡은 노출을 고정한다** |
| `logs.test.ts:330-343` | **이 화면의 픽스처 확증** — '오류 로그의 수신자 메일 주소가 사라진다 (EMAIL_BOUNCED)' |
| `logs.test.ts:313-319` | **이 화면의 페이로드에서 자격증명이 사라지는가** — `smsp_live_…` · `pg_live_…` · `Str0ngPass` **셋만.** ⚠ **`recipient` 를 단언하지 않는다 — 이 스위트가 §5 #13 을 잡지 못한다** |
| `logs.test.ts:354-358` | **픽스처 규율** — `ERROR_LOGS` 를 포함한 4화면의 시각이 전부 오프셋을 가진 ISO. ⚠ **`:325-329` 의 IP 규율에서는 이 화면만 제외된다**(IP 필드가 없다 — 행위자가 없는 로그다) |
| `logs.test.ts:407-507` | **ERP-04** — AND 결합 · **정렬 → 자르기 순서** · 결정성(동점은 id) · 배지 모수(기간 안에서만) |
| `logs.test.ts:512-517` | 컬럼 id 와 정렬 키가 어긋나지 않는다 — `errorLogSpec` 포함 4벌 전수 |
| `logs.test.ts:519-531` | **이 화면의 심각도가 사전순이 아니라 심각한 순인가** — `rank(critical) < rank(warning)` |
| `LogListShell.test.tsx:125-170` | **EXC-03** — read 403 + **요청 0건** · export 버튼 부재 · 조회 조건이 어댑터에 그대로 전달 |
| `LogListShell.test.tsx:172-184` | **STATE-02** — 인라인 배너 + 다시 시도 · **토스트가 아님** · `queryByRole('table')` 이 null |
