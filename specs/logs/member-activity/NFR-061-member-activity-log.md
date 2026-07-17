---
id: NFR-061
title: "회원 활동 로그 비기능 명세"
functionalSpec: FS-061
backendSpec: BE-061
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-061. 회원 활동 로그 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-061 회원 활동 로그 (`/logs/member-activity`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-061(요소·예외) · BE-061(계약·보안 판정) · **NFR-060** — **4화면이 `LogListShell` 한 벌을 공유하므로 P0 판정이 대부분 겹친다.** 이 문서는 겹치는 판정도 **이 화면 고유의 근거**(자기 축·자기 컬럼·자기 픽스처·자기 scope)로 다시 확인해 적는다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면 또는 `logs/**` 공용 모듈의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · `HEAD = a5c2639`** |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 또는 `logs/**` 섹션 공용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·`shared/**` 가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` / `gap` / `종속` | 코드 근거로 충족 / 미충족(§5 이관) / 소유 문서 판정을 따름 |

### 1.2 이 화면의 성격 — 개인정보 밀도가 가장 높은 감사 목록

**이 화면은 읽기 전용 감사 목록이다** — 서버 상태를 바꾸는 요청이 0건이라 P0 30 중 **6건이 표면 부재로 N/A** 이고 전부 쓰기 축이다(NFR-060 §1.2 와 동일한 이유).

**그러나 이 화면에는 형제들에 없는 무게가 있다.** 행위자가 회원이라 **개인정보 밀도가 4화면 중 가장 높고**(`types.ts:6-7`), 그래서 보존기간을 3년이 아니라 **1년으로 줄였다**(`:85-90`: '남의 개인정보다. 오래 들고 있는 것 자체가 위험이고 비용이다'). **그 판단이 절반만 관철됐다는 것이 이 문서의 가장 중요한 발견이다** — 보관은 줄였는데 **배송지가 화면에 그대로 나온다**(BE-061 §7.1 · §5 #12).

P0 판정은 형제(NFR-060)와 **동일하다** — 같은 셸이 결정하기 때문이다. 다른 것은 §3 이하와 §4.4 다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **부분 미충족 — 네 번째 분기에서 깨진다.** 정상 경로는 정확하다: 스켈레톤은 **최초 로드에서만**(`LogListShell.tsx:258` — `loading && data === undefined && range !== null`), 재조회 중에는 `placeholderData: (previous) => previous`(`queries.ts:52`)가 이전 행을 유지, 0행일 때만 `<Empty>`(`LogTable.tsx:177-189`), 실패일 때만 Alert 가 표·요약·페이지네이션을 대체(`:233,278-293`) — 셋이 배타적 분기다. **그런데 기간 '직접 지정'이 유효하지 않으면 다섯 번째 상태가 `empty` 로 떨어진다**: `range === null` → `enabled: false`(`:152`)로 조회를 걸지 않는데, `:251-269` 는 `error === null` 이기만 하면 표를 그리고 `entries=[]`·`loading=false` 라 **`<Empty>` 가 렌더된다.** 조회가 성공하지 않았는데 empty 를 그린다. 요약은 '조회 기간을 확인해 주세요.'라 하고 필터엔 인라인 오류가 뜬 채 **표는 '기록이 없다'고 단정한다** — `validation.ts:11-12` 가 없애려던 거짓 빈 상태다 | `/logs/member-activity?period=custom&from=2026-07-01&to=2027-01-01`(미래) → 필터 오류 + 요약 '조회 기간을 확인해 주세요.' + **표에 `<Empty>` '필터 초기화' 분기.** 정상 경로 확증: `?fail=logs-member:list` → Alert 만 · 걸리지 않는 키워드 → Empty 만 · 재조회 중 → 이전 행 유지 | **gap** |
| STATE-02 | STATE | 직접 | **충족.** 조회 실패 시 `LogListShell.tsx:278-293` 이 요약·표·페이지네이션을 감추고 `<Alert tone="danger">` **'회원 활동 로그를 불러오지 못했습니다.'** + '다시 시도'(`refetch`)를 렌더한다. **read 실패로 토스트를 띄우지 않는다** — 이 화면이 `toast` 를 부르는 곳은 내보내기 둘뿐(`:184,194`). 빈 상태로 폴백하지 않는다. `LogListShell.test.tsx:173-183` 이 셋을 전부 단언한다(배너 · '다시 시도' · `queryByRole('table')` 이 null) | `/logs/member-activity?fail=logs-member:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건 | pass |
| STATE-04 | STATE | 직접 | **충족.** ① **clamp** — `LogListShell.tsx:164-168` 이 `data.total` 로 총 페이지를 다시 계산해 범위를 벗어나면 마지막 페이지로 보정. ② **조건 변경 시 page 리셋** — `list-state.ts:180-182` `resetPage` 를 축(`:287`)·기간(`:195`)·직접지정(`:207`)·검색어(`:229`)·크기(`:245`)가 전부 부른다. ③ **선택 리셋** — **이 화면에 선택이 없다**(체크박스 0개 — `LogTable.tsx:6-7`). 요구의 selection 절은 **대상이 없다** | 활동 필터로 좁힘 → page 가 1로 리셋. `?page=9` 로 진입 → 마지막 페이지로 보정 | pass |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 스타일 표면 — `logs.css` · `MemberActivityPage.tsx`(style 객체 0건, 순수 render + `className` 만) · 공용 컴포넌트 — 이 전부가 `var(--tds-*)` 만 참조한다. **`apps/admin/src/pages/logs/**` 전체에 primitive 밖 hex · `[1-9]px` 리터럴 · bare border/outline 키워드 grep = 0**(내가 직접 실행). ⚠ 의도된 예외 1건: `logs.css:86` `font-family: monospace`(§4.4) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — TOSS 토큰(PR #32)이 이 화면의 가장 넓은 표면인 표에 닿는다.** 이 표는 DS `DataTable` 이 아니라 `shared/ui/styles.ts` 의 `tdStyle`/`thStyle` 을 쓰는데, **그 둘이 `component.table.*` 토큰의 소비자다**: `styles.ts:381-384` `tdStyle` 의 `padding{Top,Bottom}: var(--tds-component-table-cell-padding-y)` · `padding{Left,Right}: var(--tds-component-table-cell-padding-x)` · `styles.ts:363-366` `thStyle`(**x 만** — block 패딩은 `space.3` 유지). 값이 바뀌었다 — `cell-padding-y = {space.4}` = **16px**(구 `space.3` 12px) · `cell-padding-x = {space.3}` = **12px**(구 `space.2` 8px)(`tokens/tokens.json:1262-1271`). **축 순서 주의: y=16 · x=12 이지 그 반대가 아니다.** 근거가 토큰에 적혀 있다(`:1265`: 'Toss 표는 divider 를 옅게 하는 대신 **여백으로 행을 가른다**'). **그 divider 도 함께 옅어졌다** — `styles.ts:387` `borderBottomColor: var(--tds-component-table-divider)` → `component.table.divider`(`tokens.json:1272-1276`) → **`color.border.subtle`** 신설(`:629-638`, `{primitive.color.gray.200}`, light `gray.200`/dark `gray.800`. 구 `border.default` = gray.300). `border.subtle` 은 **`$description` 이 장식 divider 전용으로 못 박고**(WCAG 1.4.11 — '컨트롤 테두리에 쓰지 말 것') **직접 소비자가 `apps/`·`packages/ui/src` 어디에도 없다** — 오직 `component.table.divider` 를 경유한다. **thead 밑줄만 `border-default` 를 유지한다**(`styles.ts:370`) — 근거 `:362`: '머리/몸통을 가르는 **구조선**이라 행 divider(subtle)보다 진해야 한다'. **이 변화는 TOKEN-01 의 판정을 바꾸지 않는다**(여전히 리터럴 0건 · 전부 토큰 경유) — **오히려 이 화면이 px 를 한 줄도 고치지 않고 밀도가 바뀐 것이 TOKEN-01 이 지키려던 바로 그 성질이다.** 판정에 영향을 주는 것은 A11Y-09(대비 — divider 가 옅어졌다)이며 그것은 tokens 소유다 | `grep -rE "#[0-9a-fA-F]{3,8}\|[^-a-z0-9][1-9][0-9]*px\|(outline\|border):\s*(thin\|medium\|thick)" apps/admin/src/pages/logs/` → **0건**. lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면 — 정렬 헤더 버튼(`LogTable.tsx:150`) · 상세 열기 버튼(`:210`) · **회원 상세 링크**(`MemberActivityPage.tsx:44` — `tds-ui-link tds-ui-focusable`, **이 화면에만 있다**) · 필터 항목(`LogFilterPanel.tsx:75`) · DS 컴포넌트들 — 전부 `tds-ui-focusable` 계약을 상속한다. **자체 `:focus-visible` 규칙 0건**(`logs.css:41-42`) | 판정은 DS 소유 문서를 따른다. 이 화면에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **이 화면에 자체 `animation`/`transition` 선언 0건.** easing 토큰 소비 표면은 상속된 둘 — 내보내기 토스트 entrance(`Toast.css:26`)와 로딩 스켈레톤(`shared/ui/ui.css:83-95`). 둘 다 이 화면이 실제로 띄운다(FS-061-EL-017 · EL-012) | 판정은 tokens codegen·`Toast.css` 소유 문서를 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | floating/overlay 표면 둘 — 상세 다이얼로그(`Modal.css:36` `var(--tds-shadow-modal)`) · 내보내기 토스트(`Toast.css:21` `var(--tds-shadow-overlay)`). **이 화면은 `box-shadow` 를 선언하지 않는다** | 판정은 DS·tokens 소유 문서를 따른다. `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **in-content `<h1>` 이 없다** — 제목은 AppHeader(IA-02). 이 화면의 계층은 필터 `<h2>`(`LogFilterPanel.tsx:64`) · 상세 `<h3>`(`LogPayloadDialog.tsx:88`) · 표 헤더/셀. **자체 titleStyle 0건** | 판정은 tokens typography·`AppHeader` 소유 문서를 따른다 | 종속 |
| COMP-10 | COMP | 직접 | **충족.** `LogListShell.tsx:122` 가 `useDebouncedSearch` 를 부르고 `:222` → `LogToolbar.tsx:81-87` 이 DS `SearchField` 의 native 패스스루로 `<input>` 에 흘린다. ① 조합 중 커밋 안 함(`useDebouncedSearch.ts:87`) ② 조합 중 Enter 미submit(`:121-124` — `isComposing` + 자체 관측 ref 이중 판정) ③ debounce 250ms(`:23,93-95`) ④ **stale 응답 무효** — 키워드가 쿼리 키의 일부라(`queries.ts:21`) 늦은 응답이 최신을 덮지 못한다(`:37-40`). **이 화면의 검색 대상은 4필드**(`data-source.ts:24`) | 검색창에 '박**' 을 IME 로 입력 → 조합 완료 + 250ms 후 URL `?q=` **1회** 갱신(`replace` 라 history 안 쌓임). 조합 중 Enter → 미제출 | pass |
| FEEDBACK-02 | FEEDBACK | N/A | **파괴적/비가역 액션이 없다.** 서버 상태를 바꾸는 요청 0건(BE-061 §7.5), `ConfirmDialog` 미import, ⋯ 액션 열·체크박스 0개. 유일한 사용자 개시 작업인 내보내기는 **비파괴적**이다(조회 결과를 파일로 받을 뿐). ⚠ **회원 상세 링크는 라우팅이지 액션이 아니다** | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **미저장 상태를 가질 폼이 없다** — RHF 미import, `isDirty` 대상 0개. 입력 셋(검색·기간 2칸)은 **저장 대상이 아니라 조회 조건**이고 값이 즉시 URL 에 반영된다(`list-state.ts:201-236`) — **'미저장'이라는 상태가 원리적으로 존재하지 않는다.** 이탈해도 잃을 것이 없고 오히려 URL 이 보존한다(IA-13) | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면의 modal 은 편집 가능한 폼을 담지 않는다.** `LogPayloadDialog` 는 읽기 전용 — 입력 0개, 푸터가 '닫기' 하나(`:66-70`), 본문은 `dl/dt/dd` + `<pre>`. dirty 해질 입력이 없어 4경로를 가드할 대상이 없다. 파일 머리말이 그 판정을 이미 적었다(`:4-8`) | 재현할 표면 없음 (modal 자체는 MOTION-01 · A11Y-02 에서 판정) | N/A |
| A11Y-01 | A11Y | 상속 | **이 화면은 토스트를 띄운다**(내보내기 성공/실패 — `LogListShell.tsx:184,194`). 그 표면은 `ToastProvider` 소유이고 **항상 마운트된 두 live region** 이 이미 있다 — `role="status" aria-live="polite"`(`ToastProvider.tsx:165`) · `aria-live="assertive"`(`:168`). 이 화면은 소비자다 | 판정은 `ToastProvider` 소유 문서를 따른다 | 종속 |
| A11Y-02 | A11Y | 직접 | **충족.** `LogPayloadDialog.tsx:58` 이 `useId()` 로 본문 id 를, `:63` 이 `describedBy={bodyId}` 를 `Modal` 에 넘기고 `:72` 가 그 id 를 본문에 단다. `Modal.tsx:158` 이 `aria-describedby` 로 배선(`:155-157` 이 `role="dialog"` + `aria-modal` + `aria-labelledby`). **제목(`'<활동 라벨> · <회원 계정>'`)만이 아니라 본문(9개 필드 + 마스킹 안내 + 페이로드)도 함께 읽힌다** | 스크린리더로 행을 열면 제목과 본문이 함께 읽힌다. `dialog[aria-describedby]` 가 본문 div id 로 해석 | pass |
| A11Y-11 | A11Y | 직접 | **충족.** 폼 컨트롤 셋 — 검색(`SearchField`) · 페이지 크기(`SelectField`) · 기간 직접 지정(`DateRangeField` 2칸). ① **aria-invalid without describedby = 0**: invalid 해질 수 있는 것은 `DateRangeField` 뿐이고 **`aria-invalid` 를 항상 `aria-describedby` 와 짝지어 낸다**(`DateRangeField.tsx:44-45`. 유효할 때는 두 속성 모두 부여하지 않아 `aria-invalid="false"` 를 남기지 않는다 — `:9-11`). `LogFilterPanel.tsx:152-159` 가 `error={rangeError}` 로 켠다. **`pages/logs/**` 의 `aria-invalid` grep = 1 이고 그 1건은 주석**(`LogFilterPanel.tsx:151`). ② **required 노출**: **required 필드가 없다**(필터는 전부 선택적) — `DateRangeField.tsx:35,48` 이 지원하나 이 화면은 넘기지 않는다 | 종료일에 미래 입력 → 두 입력이 `aria-invalid="true"` + `aria-describedby` 가 `role="alert"` `<p>` id 로 해석. 되돌리면 **두 속성이 모두 사라진다** | pass |
| A11Y-12 | A11Y | 직접 | **충족.** 좌측 필터의 모든 항목이 `aria-pressed={active}`(`LogFilterPanel.tsx:76` — `FilterGroup` 이 결과·**활동**·기간 세 축을 전부 그린다: `:126-135` + `:139-146`). **`aria-current` grep = 0**(`pages/logs/**`). 머리말이 규칙과 이유를 못 박는다(`:10-12`). 스타일이 `filterItemStyle(active)` 라 **색과 ARIA 가 같은 `active` 에서 나온다** — 갈라질 수 없다 | '탈퇴' 클릭 → 그 버튼만 `aria-pressed="true"`. `aria-current` grep = 0 | pass |
| MOTION-01 | MOTION | 상속 | **표면 실재 · 판정은 DS 소유.** 이 화면은 **Modal 표면을 실재로 갖는다**(`LogPayloadDialog` — FS-061-EL-016). **PR #26 이후 enter/exit 모션이 실재한다** — backdrop fade(`Modal.css:20-21` → `@keyframes tds-modal-backdrop-in :126-134` · exit `:30-33` → `tds-modal-backdrop-out :136-144`) · dialog scale(`:58-59` → `tds-modal-dialog-in :146-156`, opacity 0→1 + `scale(0.96)→scale(1)` · exit `:35-38` → `tds-modal-dialog-out :158-168`, `forwards`). **라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 여전히 미도입이고, 요구문이 말한 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`, keyframe 이름 상수 `:43`)로 동등 달성했다. ⚠ **범위 한정**: 애니메이션되는 닫힘은 Modal 소유 3경로뿐이다 — Esc(`Modal.tsx:167-171`) · 딤(`:204`) · ×(`:227-232`), 전부 `requestClose`(`:122-126`) 경유. **이 화면의 푸터 '닫기' 버튼은 그 경로가 아니다** — 호출부가 조립한 버튼이라 `onClose` 를 직접 부르고 즉시 언마운트된다(`Modal.tsx:27-31` · 이 화면은 `LogPayloadDialog.tsx:67-69`). **라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫이다** — 화면 코드로는 해소 불가 | 행을 눌러 상세를 열고 Esc/딤/× 로 닫는다 → backdrop 이 fade 하고 dialog 가 0.96→1 로 scale 한다. 푸터 '닫기' 는 즉시 사라진다(경로가 다르다). reduced-motion 에서는 `Modal.css:173-180` 이 애니메이션을 끄고 `willAnimate()`(`Modal.tsx:56-61`)가 그것을 읽어 즉시 닫는다. 판정은 `packages/ui` `Modal` 소유 문서를 따른다 | 종속 |
| MOTION-02 | MOTION | 상속 | **표면 실재 · 판정은 DS 소유. 요구는 이제 충족돼 있다.** 이 화면은 **토스트 표면을 실재로 갖는다**(내보내기 — FS-061-EL-017). **PR #26 이 exit 애니메이션을 넣었다** — `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events: none`), keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`). enter 는 `:26-27`/`:109-119`. **요구가 명시한 수치를 정확히 만족한다**: `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}` — `component.overlay` recipe(`tokens/tokens.json:1298-1307`, `easing.accelerate` primitive `:486` = `cubic-bezier(0.4, 0, 1, 1)`). 완료 감지는 `AnimatePresence` 가 아니라 네이티브 `onAnimationEnd` × keyframe 이름 상수 대조다(Modal 과 같은 아키텍처). reduced-motion 게이트 `Toast.css:136-141`. appliesTo 가 `ToastProvider, Toast` 이므로 **소유는 DS/shared 이고 이 화면은 소비자**다 | 내보내기 → 성공 토스트 → dismiss → opacity 1→0 + 아래로 밀리며 사라진다(150ms · accelerate). 판정은 `ToastProvider`/`Toast` 소유 문서를 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | 이 화면의 모션 표면은 **둘뿐이고 둘 다 이미 게이트돼 있다** — ① 스켈레톤(`shared/ui/ui.css:83` → `:110-114` 의 `@media (prefers-reduced-motion: reduce)` 에서 `animation-name: none`) ② 토스트 entrance(`Toast.css:110-114` → `animation: none`). **이 화면 자신은 `transition`/`animation`/`transform` 을 하나도 선언하지 않는다**(`logs.css` grep = 0). 요구의 나머지 절(글로벌 Motion config · `ToggleSwitch.css`)은 **이 화면의 표면이 아니다**. **③ PR #26 이 넣은 Modal enter/exit 도 게이트를 탄다**(`Modal.css:173-180` — backdrop·dialog·`--closing` 변종 전부 `animation: none`) · **④ 토스트 exit 도 마찬가지다**(`Toast.css:136-141` 이 `.tds-toast` 와 `.tds-toast--exiting` 을 **명시 나열**한다 — 특이도가 같아 소스순서 의존이 조용히 깨지기 때문. 근거 `:133-135`) | reduced-motion 을 켜고 진입 → 스켈레톤 정지 + 토스트 즉시 등장·소멸 + 상세 다이얼로그도 즉시 열리고 닫힌다. **⚠ 이전 기준(`4b805ad`)의 'MOTION-01/02 해소 시 재판정 필요' 는 해소됐다** — 신규 모션이 **자기 게이트를 함께 들고 착륙했다**(PR #26) | 종속 |
| IA-01 | IA | 직접 | **충족.** `/logs/member-activity` 가 `APP_ROUTES` 항목이고(`App.tsx:330`) 그 배열이 `<RequireAuth><AppShell/></RequireAuth>` 아래에서 렌더된다. **자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `<div style={pageStyle}>`(`LogListShell.tsx:205`)이고 그 아래 2열 그리드(`:206`)는 **AppShell 안쪽의 내용 레이아웃**이다 | 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지 | pass |
| IA-02 | IA | 직접 | **충족.** `/logs/member-activity` 는 `nav-config.ts:209` 의 **잎**(`['회원 활동 로그', '/logs/member-activity']`)이라 `findCoveringLeaf`(`:269-279`)가 자기를 찾아 `findNavLabel`(`:297-299`)이 AppHeader `<h1>` 에 **'회원 활동 로그'** 를 그린다 — 가지 라벨('로그 관리')로 폴백하지 않는다. **in-content `<h1>` 이 없어 제목 소스가 하나뿐이라 모순이 없다.** 'sub-route 가 구체적 title' 절은 **하위 라우트가 없어**(`App.tsx:328`) 발생하지 않는다. **폼/상세 화면의 h1 이중 문제(`FormPageShell.tsx:160`)가 이 섹션엔 성립하지 않는다** — 폼이 없기 때문이다 | 진입 → AppHeader 제목이 '회원 활동 로그'. `document.querySelectorAll('h1').length === 1`. 상세를 열어도 다이얼로그 제목은 `<h2>`(Modal 소유) | pass |
| IA-04 | IA | 직접 | **충족.** ① toolbar row — 검색 좌측(`LogToolbar.tsx:80-88`), 액션 우상단(`:90-127`). **감사 로그에는 '등록'이 없으므로 우상단 primary 자리는 내보내기가 갖는다**(`:4-5`). ② count 요약 — `SummaryText`(`LogListShell.tsx:235-249`). ③ SelectionBar — **bulk 없음 → 대상 없음**. ④ table. ⑤ Pagination(`:271-276`) — 총 페이지 ≤1 이면 DS 가 스스로 null(`Pagination.tsx:117`). **4화면이 이 한 벌을 공유한다**(`logs/types.ts:229-232`) | 진입 → 좌측 필터 / 우측 [검색 … 크기·내보내기] → 요약 → 표 → 페이지네이션. 형제 3화면과 배치 동일 | pass |
| IA-05 | IA | N/A | **create/edit 폼이 없다** — leaf 이고(`App.tsx:330`, `/logs/member-activity/*` 0건) **쓰기 라우트가 존재하지 않는다**(`:328` — '쓰기 라우트(등록/수정)는 존재하지 않는다: 감사 기록은 불변이다'). `:id/edit` 로 해석될 대상 엔티티가 없다 — **감사 로그는 만들 수도 고칠 수도 없다**(BE-061 §7.5) | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족 — 이 화면의 강점이다.** list query state 가 **전부 URL 에 있다**: page(`?page`) · size(`?size`) · filters(`?outcome`·**`?activity`**·`?period`·`?from`·`?to`) · keyword(`?q`) · sort(`?sort`·`?dir`) — `list-state.ts:42-51` 의 `PARAM` 이 정본, `useSearchParams` 가 유일한 저장소(`:141`). **`useState` 로 든 조회 상태 0건**. ① **기본값은 URL 에 쓰지 않는다**(`:187,217,231,241,258-260,274`) — 링크에 남은 파라미터는 전부 '의도적으로 바꾼 것'. ② **push/replace 를 가른다**(`:18-21`) — 필터·기간·정렬·페이지는 push, **검색어만 replace**. ③ **URL 을 손으로 고칠 수 있음을 전제로 전부 검증**(`:58-92`). 설계 근거가 감사 도메인에서 나온다(`:4-10`: '**공유되지 않는 조회 조건은 조회 조건이 아니다**') <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 pass 는 이전 기준에서 `page` 축이 조용히 깨진 채였다.** `LogListShell` 이 거는 `useDebouncedSearch` 는 **마운트 직후에도 한 번 커밋한다**(현재 입력값 = URL 의 `q`). 그 커밋이 통과하면 `resetPage`(`list-state.ts:180-182`)가 `page` 를 지워 **`?page=3` 링크로 들어온 운영자가 250ms 뒤 1페이지로 튕겼다 — 로그 4화면 전부**(`list-state.ts:213-221` 이 그 사연을 적었다). 즉 이 문서가 pass 근거로 든 '링크를 붙여넣으면 동일 view' 가 **page 축에서 성립하지 않았다.** **커밋 `6acb235` 가 고쳤다** — `list-state.ts:224` `if (value === keyword) return;`. **검색어가 실제로 바뀔 때만 되돌린다**(`useListState.commitKeyword` · 통계 `useStatsParams.ts:288` 과 같은 규칙 — 세 벌이 한 규칙으로 정렬됐다). 회귀 테스트 **`list-state.test.tsx` 신설**. 통계 6화면에도 같은 결함이 있었고 형제 문서 3벌이 그것을 `gap` 으로 잡았다(NFR-054·055·056 §2 IA-13) | '탈퇴' + 2페이지 + 'user1042' 검색 → `?activity=withdraw&page=2&q=user1042` → **새 탭에 복사 → 동일 view.** F5 → 동일. **회원 상세로 갔다가 Back → 보던 필터·페이지가 그대로다**(이 화면에만 있는 이탈 경로 — FS-061-EL-011.4). 상세 다이얼로그는 라우트가 아니라 history 를 건드리지 않는다 | pass |
| EXC-01 | EXC | 상속 | 렌더 예외는 `AppShell` 의 `<Outlet>` 바깥 ErrorBoundary 가, 셸 예외는 App 루트 경계가 잡는다. **자체 경계를 두지 않는다.** ⚠ throw 가 날 만한 자리가 실재한다 — `spec.detailOf(entry)`(`LogListShell.tsx:299`)와 `column.render(entry)`(`LogTable.tsx:214,222`)가 서버 데이터를 직접 만진다(예: `MEMBER_ACTIVITY_LABEL[entry.activity]` 가 모르는 값에 `undefined` → 빈 셀). 페이로드 직렬화 실패만은 이 화면이 스스로 잡는다(`masking.ts:183-189`) | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `<RequireAuth>`, mid-session 401 은 `queryClient` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리. 이 화면의 조회(`useLogQuery` — `queries.ts:47-53`)가 그 캐시를 통과하므로 자동으로 덮인다. **재인증 손실 0** — 보존할 입력이 없고 **조회 조건이 전부 URL 에 있어 returnUrl 로 복원된다**(IA-13). ⚠ 내보내기는 `useMutation`(`:71-73`)이라 그 캐시를 타지 않는다 — 401 이면 실패 토스트로 떨어진다(§3 EXC-06) | 판정은 `RequireAuth`·`queryClient` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **충족 — 두 층이 다 있고 테스트가 고정한다.** ① **read 게이팅** — `AppShell` 의 `<RequirePermission><Outlet/></RequirePermission>` 이 모든 라우트를 덮고 `route-resource.ts` 가 이 경로를 잎 `page:/logs/member-activity` 로 해석해 403 화면을 그린다. **그리고 조회 요청 자체가 나가지 않는다** — `LogListShell.test.tsx:136-142` 가 `expect(fetchPage).not.toHaveBeenCalled()` 를 단언(`:11-12`: '데이터를 받아 놓고 안 보여주는 것은 게이팅이 아니다'). **이 화면에서 그 단언이 특히 중요하다** — 받아 놓는 것이 회원의 배송지·카드번호다(BE-061 §7.2). ② **쓰기 게이팅** — 내보내기가 `useRouteCan('export')`(`LogListShell.tsx:115`)에 걸려 **권한이 없으면 버튼을 렌더하지 않는다**(`LogToolbar.tsx:117` — disable 이 아니라 부재). `LogListShell.test.tsx:144-150` 이 단언. ③ **강등 reconcile** — `useRouteCan` 이 스토어를 구독해 버튼이 그냥 사라진다(`RequirePermission.tsx:24-25`) | read 끈 역할로 deep-link → 403 + **표 없음 + 요청 0건**. export 만 끈 역할 → 표는 보이고 버튼 부재. ⚠ 서버 강제는 별개 — 프론트 가드는 UX 층이고(`RequirePermission.tsx:8-11`) **`GET /api/logs/member-activity/export` 직접 호출을 막는 것은 서버뿐이며 거기서 나가는 것은 개인정보 파일이다**(BE-061 §3.1) | pass |
| EXC-04 | EXC | N/A | **write 를 하지 않는다** — appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면 0개. 낙관적 동시성 토큰을 실을 요청이 없다. **감사 로그는 append-only 라 기존 행이 변경되는 사건 자체가 없다**(BE-061 §3.3) — 두 관리자가 같은 로그를 다툴 시나리오가 원리적으로 성립하지 않는다. `createStoreAdapter`/`createCrudAdapter` 를 쓰지 않고 자기 어댑터(`adapter.ts:30-54`)가 조회 둘뿐이다 | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **user-initiated write 가 없다** — appliesTo('useCrudForm, ConfirmDialog, 금액/생성/발송 mutation')에 해당하는 것 0개. **내보내기는 사용자가 개시하지만 write 가 아니다** — 서버 상태를 바꾸지 않는 GET 이라(BE-061 §4 EP-02) 두 번 나가도 **파일이 두 번 받아질 뿐 서버가 갈라지지 않는다.** 멱등키가 필요한 사건('금액/생성/발송')이 아니다. **중복 실행은 실질적으로 막혀 있다**: `Button.tsx:66,69-72` 가 `loading` 이면 `onClick` 을 발화하지 않고 `LogToolbar.tsx:120` 이 `loading={exporting}` 을 넘긴다 — 다만 `exporting` 이 비동기 state 라 **렌더 전 초고속 더블클릭은 2회 나갈 수 있다.** 결과가 CSV 2벌이라 gap 으로 계상하지 않고 §4.3 에 기록한다(⚠ **다만 이 화면에서는 그 2벌이 개인정보 파일이다**) | 재현할 표면 없음 | N/A |
| EXC-09 | EXC | 직접 | **충족.** ① **내보내기 취소** — '취소'(`LogToolbar.tsx:111-115` → `LogListShell.tsx:200-202`)가 `controllerRef.current?.abort()` 를 발화하고 `onError` 가 `isAbort(cause)` 로 판정해 **토스트 없이 `exportLog.reset()`** 한다(`:189-192`). 단일 공유 predicate(`shared/async.isAbort`). 주석이 규칙을 명시(`:19`: '**취소는 실패가 아니다**'). ② **조회 abort** — 조건 변경·이탈 시 react-query 가 `queryFn({ signal })`(`queries.ts:49`)의 signal 로 `wait(LATENCY_MS, signal)`(`adapter.ts:36`)을 끊는다. **취소된 쿼리는 `error` 를 세팅하지 않아 배너가 뜨지 않는다.** ③ **cache 무변경** — 내보내기가 `invalidateQueries` 를 부르지 않는다(`queries.ts:6-9`). ④ bulk 절은 **대상 없음** | 내보내기 시작 후 400ms 안에 '취소' → **토스트 0건**, 버튼 복원, 파일 미다운로드. 조회 중 다른 메뉴로 이동 → 배너·토스트 없음 | pass |

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
> **P0 판정이 NFR-060 과 동일하다** — 같은 `LogListShell` 이 결정하기 때문이며, 그것이 이 섹션 설계의 의도다(`logs/types.ts:229-232`: '4벌 쓰면 4개 화면이 조금씩 다르게 동작하고, 그 차이는 아무도 의도하지 않는다'). **판정이 겹치는 것이 곧 그 설계가 작동한다는 증거다.**
> **이번 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집힌 판정 2건 — 둘 다 MOTION 이다.** PR #26 이 오버레이 모션을 착륙시켜 **MOTION-01 · MOTION-02 가 `gap` → `종속`** 이 됐다. 이 화면이 실재로 갖는 두 표면(상세 다이얼로그 · 내보내기 토스트)이 이제 enter/exit 를 갖는다 — **단 라이브러리가 아니라 CSS-only 다**(Motion/framer-motion 은 여전히 미도입). 두 요구 모두 appliesTo 가 DS 라 이 문서의 판정은 `종속` 이며, **'AnimatePresence 부재를 gap 으로 볼지'는 소유 문서(DS)가 정한다.**
>
> **P0 gap 은 이제 1건**(STATE-01) — '배치 실패' 사유다. **그 1건은 화면 코드로 해소 가능하다**(표 자리에 `range === null` 분기 추가). 이전 기준의 3건 중 **화면 코드로 해소 불가였던 2건이 DS 에서 해소됐다.**
> **N/A 6건은 전부 쓰기 축이며 결함이 아니다**(§1.2). **다만 이 화면의 실질적 위험은 P0 표에 잡히지 않는다** — 그것은 마스킹 구멍이고 §5 #12 에 있다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다. **NFR-060 §3 과 겹치는 항목은 이 화면의 값으로 다시 확인해 적는다.**

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족.** `placeholderData: (previous) => previous`(`queries.ts:52`)로 필터·페이지 전환 중 이전 목록 유지 — 표가 깜빡이며 비지 않는다. ⚠ **`staleTime` 미지정**(기본 0) — 같은 조건 재진입 시 즉시 재조회. **감사 로그에서는 그것이 맞다**(방금 일어난 일을 봐야 한다). 요구의 후반('staleTime 후에만 refetch')은 이 도메인에서 의도적으로 다르게 해석된다 | 필터 전환 중 이전 행 유지. 같은 URL 재진입 → 즉시 재조회 | pass |
| STATE-05 | P1 | **충족.** 0행이면 DS `<Empty>` 가 **3분기** — `LogTable.tsx:180-187` 이 `hasQuery`·`hasActiveFilters` 를 넘기고 `Empty.tsx:52-55` 가 '검색 > 필터 > 진짜 비어있음' 우선순위로 모드를 정한다. 복구 수단이 분기마다 다르다(`onClearSearch` / `onResetFilters` — `list-state.ts:292-307`). **'등록' CTA 는 의도적으로 없다**(`LogTable.tsx:22-24`: '감사 로그에는 등록 CTA 가 없으므로(만들 수 없는 기록이다) action 슬롯은 비운다') | 걸리지 않는 키워드 → 검색 분기. 활동을 '적립금'으로 좁혀 0건 → 필터 분기. ⚠ **기간 오류 시에도 이것이 뜬다** — §2 STATE-01 gap | pass |
| STATE-06 | P1 | **N/A(표면 부재) — 그것이 설계다.** write 0건이라 invalidate 할 것이 없다. `queries.ts:6-9` 가 명시적으로 선언한다('**여기에는 없다. 무효화할 쓰기가 없기 때문이다** — 캐시를 더럽힐 주체가 존재하지 않는다') | 재현할 표면 없음 | N/A |
| COMP-03 | P1 | **충족.** 검색이 DS `<SearchField>`(`LogToolbar.tsx:81-87`) — raw `<input type="search">` 재구현 없음. `pages/logs/**` 에 `type="search"` grep = 0 | `type="search"` grep = 0 | pass |
| COMP-05 | P2 | **충족.** 좌측 필터가 `shared/ui` 의 `filter*Style` 6종을 import(`LogFilterPanel.tsx:18-28`) — 로컬 clone 0건 | 로컬 filter 스타일 선언 0건 | pass |
| COMP-06 | P2 | **충족.** 스켈레톤 행 = **페이지 크기**(`LogListShell.tsx:259`), 셀 = **실제 컬럼 수**(`LogTable.tsx:176` = 6). `length: 5` 하드코딩 없음 | 크기 100 → 스켈레톤 100행 × 6열 | pass |
| COMP-11 | P1 | **충족.** preset 4종 + **`start ≤ end` 검증**(`validation.ts:73-81`) + **범위가 URL 유지**(`?period=custom&from=&to=` — `list-state.ts:201-211`). 전용 `DateRangeFilter` 가 아니라 DS `DateRangeField` + 섹션의 `validateCustomRange` 조합이나 **계약은 충족한다.** 그 위에 **미래 금지**(`:64-71`)와 **90일 상한**(`:83-91`)을 더 얹는다 | 시작>종료 → 인라인 오류 + 조회 미발행. 미래 → 전용 문구. 91일 → '(선택한 기간 91일)' | pass |
| A11Y-06 | P1 | skip link 는 `AppShell` 소유. **이 화면에서 값이 크다** — 좌측 필터 Tab 정지점이 **16개**(결과 3 + 활동 9 + 기간 4, 직접 지정이면 +2)라 본문 표까지 멀다. **형제 중 가장 많다**(관리자 로그 15 · API 로그 12 · 오류 로그 12) | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 + announce 는 `AppShell` 소유 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-08 | P1 | **충족 — 이 화면에 in-row link 가 실재해 요구가 가장 직접적으로 걸린다.** 요구의 문자는 '모든 row-nav 에 keyboard focusable in-row link'인데 **이 화면이 정확히 그 형태다**: 행 클릭(`LogTable.tsx:196`)이 상세를 열고, **회원 계정이 `/users/members/:id` 로 가는 focusable 링크**다(`MemberActivityPage.tsx:44` — `tds-ui-link tds-ui-focusable`). 그리고 **첫 칸(시각)이 상세를 여는 진짜 버튼**이다(`LogTable.tsx:205-217`). 즉 **두 목적지 모두 키보드로 닿는다.** `useRowNavigation` 의 인터랙티브 가드가 링크·버튼 클릭을 행 활성화에서 제외해 **이중 발화가 없다**(`MemberActivityPage.tsx:7-12`: '계정을 누른 사람에게 페이로드가 뜨는 일은 없다'). **탈퇴 회원은 링크가 아니라 글자**라 죽은 링크가 없다(`:37-39`) | Tab → 첫 칸 → Enter → 상세. Tab → 계정 링크 → Enter → 회원 상세. 탈퇴 행의 계정은 Tab 으로 닿지 않는다(링크가 아니므로) — **의도된 동작** | pass |
| A11Y-09 | P1 | 이 화면의 위험 토큰 쌍 — `feedback-danger-surface` 위 본문(실패 행 `logs.css:23-25`) · `feedback-danger-border` 위 본문(hover `:27-29`) · `feedback-danger-text`(결과 셀 `cells.tsx:23`) · `surface-raised` 위 `text-default`(페이로드 `logs.css:84-85`) · `text-muted`(보조 줄 `cells.tsx:72` — **이 화면은 그것을 회원 셀·접속 셀 두 곳에 쓴다**) · `action-primary-default`(계정 링크·상세 열기 버튼) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 축에 새 쌍이 하나 늘었다.** TOSS 토큰(PR #32)이 **행 divider 를 `border.default`(gray.300) → `border.subtle`(gray.200) 로 낮췄다** — `component.table.divider`(`tokens/tokens.json:1272-1276`) → `color.border.subtle`(`:629-638`, light `gray.200`/dark `gray.800`). **이 화면의 표가 그것을 소비한다**(`shared/ui/styles.ts:387` `tdStyle.borderBottomColor`). **측정이 필요한 새 쌍**: `surface-default` 위 `border.subtle`(행 divider · light/dark 양쪽). ⚠ **다만 이것은 WCAG 1.4.11(비텍스트 대비 3:1)의 대상이 아닐 수 있다** — `border.subtle` 의 `$description` 이 **장식 divider 전용**으로 용도를 못 박고 '컨트롤 테두리에 쓰지 말 것' 을 명시한다. 장식적 구분선은 1.4.11 의 예외이고, **행을 가르는 일은 이제 divider 가 아니라 여백이 한다**(`cell-padding-y` 12→16px — `tokens.json:1265` 가 그 교환을 명시: 'Toss 표는 divider 를 옅게 하는 대신 여백으로 행을 가른다'). **thead 밑줄은 `border-default` 를 유지한다**(`styles.ts:370` — 구조선이라 진해야 한다, 근거 `:362`). **판정은 tokens color 소유 문서를 따른다** — 이 문서는 **이 화면이 그 쌍을 실제로 쓴다**는 사실과 **그 용도가 장식으로 한정돼 있다**는 사실만 기록한다 | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록. ⚠ 실패 행은 **danger surface 위 danger text** 라 대비 측정이 특히 필요하다 | 종속 |
| A11Y-16 | P1 | **N/A(표면 부재).** 이 섹션은 **신규 인터랙티브 컴포넌트를 만들지 않았다** — 표는 네이티브 `<table>`, 정렬은 `<th>` 안의 `<button>` + `aria-sort`, 필터는 `<button aria-pressed>`, 링크는 네이티브 `<a>`(`Link`), 다이얼로그는 DS `Modal`, 검색/선택은 DS. **NFR-040 의 손수 만든 `role="grid"` 달력과 정확히 대조된다** | 재현할 표면 없음 | N/A |
| IA-03 | P1 | **N/A** — nav 의 잎이다(`nav-config.ts:209`). non-top-level route 가 아니다 | 재현할 표면 없음 | N/A |
| IA-06 | P1 | **충족.** 상세를 라우트가 아니라 **다이얼로그**로 둔 판단이 무게 규칙에 맞는다 — 편집할 것이 없는 짧은 읽기이고 목록의 맥락이 읽는 동안에도 필요하다(`LogPayloadDialog.tsx:15-18`). ⚠ **반대로 회원 상세는 라우트로 간다**(`/users/members/:id`) — rich 하고 편집이 있는 화면이므로 **같은 규칙의 반대편**이다. 한 화면이 두 무게를 올바르게 구분해 쓴다 | 상세를 열어도 목록·필터·페이지가 뒤에 남는다. 회원 상세는 라우트 이동 | pass |
| IA-11 | P2 | **충족.** 읽기 전용 레코드를 공유 `dl/dt/dd` 로(`LogPayloadDialog.tsx:75-82`) — 손수 만든 key/value 격자가 아니다 | 상세 필드 목록이 `<dl>` 시맨틱 | pass |
| IA-14 | P1 | **부분 충족.** 표 카드가 **bounded 가로 스크롤 컨테이너 안에 있고**(`LogListShell.tsx:82-85,251`) 2열 그리드가 `minmax(0, 1fr)` 이라(`:51`) **표가 페이지 그리드를 밀지 않는다**(`:50`). 툴바·요약도 `flexWrap: 'wrap'`. **미충족**: ① 좌측 필터 폭이 `calc(var(--tds-space-6) * 9)` **고정**이라 375px 에서 본문이 짓눌린다 — **이 화면에 `@media` 0건**. ② sticky 없음(ERP-03). ③ touch-target 미검증. ⚠ **이 화면은 '내용' 컬럼이 wrap 이라**(유일) 좁은 폭에서 행 높이가 크게 늘어난다 | 768px·375px → 표 컨테이너가 가로 스크롤되고 `<main>` 은 안 넘친다(코드 대조상). **그러나 좌측 필터가 안 접혀 375px 에서 본문 열이 매우 좁아진다** | 부분 pass — §5 |
| ERP-03 | P1 | **미충족.** sticky thead 없음 — `LogTable.tsx:139-172` 의 `<thead>` 에 `position: sticky` 없고 `pages/logs/**` 에 `sticky` grep = 0. 크기 100 에서 세로 스크롤이 길어지는데 **컬럼 이름이 사라진다.** SelectionBar 는 대상 없음 | 크기 100 → 스크롤 → 헤더가 밀려난다 | gap |
| ERP-04 | P1 | **부분 충족 — 4화면 중 이 화면만 정렬 불가 컬럼을 갖는다.** ① sortable header + `aria-sort` + keyboard + 글리프 ✔(`LogTable.tsx:146-168`). ② 정렬 가능 판정의 단일 원천 ✔ — `sortValues[column.id] !== undefined`(`:142`)이고 `MemberActivityPage.tsx:141` 이 `sortValues: memberActivitySpec.sortValues` 로 **어댑터의 것을 그대로** 쓴다. ③ **그러나 6개 컬럼 중 5개만 정렬 가능하다** — `data-source.ts:25-31` 의 `sortValues` 에 **`device` 키가 없어** '접속' 헤더가 버튼이 되지 않는다. 형제는 관리자 6/6 · API 6/6 · 오류 5/5 로 **전부 정렬 가능**하다. 컬럼 id 가 `device` 인데 셀은 **IP 를 윗줄에** 그린다(`MemberActivityPage.tsx:81-86`)는 불일치가 그 모호함을 보여준다 — 의도인지 누락인지 코드만으로 판정 불가. ④ numeric tabular-nums — **이 화면에 numeric 컬럼이 없다**(수량이 없다). ⑤ 정렬이 자르기보다 먼저 + 동점은 id ✔(`query-engine.ts:139-141,132`) | '활동' 헤더 클릭 → `aria-sort="ascending"` + ↑ + URL `?sort=activity&dir=asc`. **'접속' 헤더는 클릭해도 아무 일도 없다**(버튼이 아니다). `?sort=device` 로 URL 을 쳐도 기본 정렬로 떨어진다(`list-state.ts:73-78`) | 부분 pass — §5 |
| ERP-05 | P1 | **부분 충족 — 기능은 되나 DS 표면을 쓰지 않는다.** 요구의 세 절이 실재한다: range('전체 N건 중 x–y' — `LogListShell.tsx:314-336`) · page-size selector(20/50/100 — `LogToolbar.tsx:92-107`) · 경계 unit test(`logs.test.ts:468-500`). **그러나 DS `Pagination` 의 opt-in 표면을 켜지 않았다** — `Pagination.tsx:41,112,170-173` 은 `pageSize`(+`total`)를 넘기면 `rangeTextOf` 로 범위를 그리고 **`role="status"` 로 AT 에도 알리는데**(`:171`), `LogListShell.tsx:271-276` 은 `page`·`totalPages`·`onChange`·`label` 만 넘긴다 → `showRange = pageSize > 0` 이 false. **같은 개념이 두 곳에 있고 DS 의 announce 가 이 화면엔 없다.** `LogListShell.tsx:311-312` 의 주석('DS Pagination 은 아직 범위를 그리지 않는다')은 **Pagination 1.1.0 기준으로 낡았다** | 범위·크기가 **보인다**(기능 충족). 그러나 `Pagination` 에 `pageSize` prop grep = 0 → `.tds-pagination-bar__summary`(`role="status"`)가 DOM 에 없다 | 부분 pass — §5 |
| ERP-06 | P1 | **부분 충족.** microcopy 가 존댓말로 일관되고 포맷이 `shared/format` 을 경유한다 — 숫자 `formatNumber`(`LogListShell.tsx:185,335` · `MemberActivityPage.tsx:127-128`), 날짜 `formatDate`(파일명), 시각 `seoulTimeParts`(`time.ts:29`), 조사 `objectParticle`(`LogListShell.tsx:282`). ⚠ **`summary` 만 예외다** — 서버가 조립한 자유 문자열이라(`types.ts:45`) `'결제 완료 ORD-020931 · 128,000원'` 처럼 **금액 포맷이 서버에 있다.** 즉 이 화면의 숫자 중 하나가 `formatNumber` 를 거치지 않고 화면·CSV 에 나간다 — 요구의 '포맷은 shared/format' 에 어긋나며, **서버가 포맷을 바꾸면 화면이 조용히 따라간다**(BE-061 §7.6 #7) | 표·CSV·상세의 시각이 전부 'YYYY-MM-DD HH:mm:ss'. 숫자가 전부 천 단위 — **단 `summary` 안의 금액은 서버가 정한 표기다** | gap |
| ERP-08 | P2 | **충족.** 셀에 raw `toString()`/`String()` 호출이 **없다** — `MemberActivityPage.tsx` 의 6개 컬럼이 문자열 필드를 그대로 그리거나 라벨 맵을 거친다. 숫자는 `formatNumber` 경유(`:127-128`). 미래 timestamp 는 이 도메인에 없다(**감사 기록에 미래는 없다** — `validation.ts:64-71` 이 강제) | `MemberActivityPage.tsx` 에 `String(`/`.toString()` grep = 0 | pass |
| ERP-09 | P2 | **충족.** 시각 판정이 **전부 KST 고정** — 표시(`time.ts:29` → `seoulTimeParts`) · 프리셋(`period.ts:23`) · 구간 판정(`:32-36` → `seoulDayOf`) · '오늘'(`validation.ts:104`) · CSV 파일명(`LogListShell.tsx:182`) · 픽스처 생성(`fixture-lib.ts:43-44`). 정본은 `shared/format.ts:63`(`DISPLAY_TIME_ZONE = 'Asia/Seoul'`)이고 **달력 산술의 앵커가 UTC 정오**다(`:39-47`). **삼중 사본이 이 한 벌로 수렴했고 그 정본의 뿌리가 `logs/time.ts` 였다**(`shared/format.ts:31-36`). 이 파일에 남은 것은 **초 정밀도 하나**다(`time.ts:14-18`). 표시 기준이 **화면에도 적힌다**(FS-061-EL-006 · EL-016.2) | 브라우저 TZ 를 `America/Los_Angeles` 로 → **표의 시각·프리셋·구간 경계가 전부 서울 기준으로 동일.** `logs.test.ts:82-107,133-139` 가 고정 | pass |
| ERP-12 | P1 | **충족 — 그리고 이 화면의 CSV 판단이 가장 명시적이다.** ① 필터 전체 CSV(`adapter.ts:45-54`) + 성공 문구가 명시('(현재 필터 조건 전체)' — `LogListShell.tsx:185`). ② 한글 header 9열. ③ UTF-8 BOM(`downloadCsv`). ④ progress = 스피너 + **취소 경로**. ⑤ 화면과 같은 순서. ⑥ **실패를 성공 톤으로 옮겨 적지 않는다**(결과 열에 '실패' + 사유). ⑦ **페이로드 열이 없다** — `data-source.ts:53-55` 가 그 이유를 밝힌다: '주문/결제 페이로드에는 **카드번호·전화번호·주소**가 들어 있고 … **이 파일이 유출되면 그것은 개인정보 유출 사고다**'. ⚠ **그 판단이 화면에는 적용되지 않았다** — 같은 주소가 상세 다이얼로그에 그대로 나온다(§5 #12) | 필터를 걸고 내보내기 → 조건 전체. 엑셀에서 한글 안 깨짐. `?fail=logs-member:export` → 실패 토스트 + 다시 시도 | pass |
| ERP-13 | P1 | **충족.** 실패 배너가 조사 헬퍼 경유 — `LogListShell.tsx:282` `${spec.entityLabel}${objectParticle(spec.entityLabel)}` → '회원 활동 로그**를** 불러오지 못했습니다.'(받침 없음). 헬퍼는 `shared/format.ts:269+` 로 승격된 정본. **`pages/logs/**` 에 사용자 대상 리터럴 '이(가)'/'을(를)'/'은(는)' = 0건.** 빈 상태의 조사는 DS `Empty` 가 조립(`Empty.tsx:76`) | 4형제 배너가 각자 올바른 조사를 낸다 | pass |
| ERP-15 | P1 | **충족 — 캡 방식으로.** '1,000행 virtualize/cap' 중 **cap** 을 택했고 근거가 명시돼 있다(`types.ts:178-183`). **캡이 우회 불가능하다** — `isPageSize`(`:196-198`)가 허용 목록 자체를 판정으로 쓰므로 `?size=5000` 도 20 으로 떨어진다(`:190-195`). 컬럼 6개 + 가로 스크롤 래퍼(§3 IA-14). ⚠ pin(sticky) 없음(§3 ERP-03) | `?size=5000` → 20줄. 최대 100행 × 6열 | pass |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 앱 전체 0건 — 조회·내보내기 상한 없음. **다만 내보내기에는 사용자 취소 경로가 있다**(FS-061-EL-009.1). 조회에는 없다 | 응답 없는 백엔드 → 스켈레톤이 영원히 남는다. **거짓 사실을 단정하지는 않는다**(스켈레톤은 '모른다'를 말한다) | gap |
| EXC-06 | P1 | **미충족.** `LogListShell.tsx:233` 의 `error === null` 하나로 401/403/429/500/504 가 전부 '회원 활동 로그를 불러오지 못했습니다.' 한 문구. 내보내기도 같다(`:194`). 에러 타입은 status 를 지니는데(`shared/errors/http-error.ts`) 읽지 않는다. **BE-061 §7.4 의 `422 EXPORT_TOO_LARGE` 를 도입해도 '기간을 좁히라'는 안내가 닿지 않는다** | `?fail=logs-member:list` 와 서버 403 이 **같은 배너** | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 앱 전체 0건 | 오프라인 전환 → 오프라인 고지 없음 | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf). **상세는 라우트가 아니라 다이얼로그**이고 이미 손에 있는 행 객체로 그린다(BE-061 §7.2) — '없는 로그를 열었다'가 원리적으로 발생하지 않는다. ⚠ **회원 상세로의 이동은 다른 화면의 404 다** — `memberId` 가 있어도 그 회원이 이후 삭제됐으면 `/users/members/:id` 에서 '회원을 찾을 수 없습니다.'를 만난다(FS-061 §4.1). **그 판정은 회원 상세 문서의 것**이며 이 화면은 그것을 미리 알 수 없다(로그의 `memberId` 는 기록 시점의 값이다 — BE-061 §6.1) | 재현할 표면 없음(이 화면 자체에는) | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트 없음(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk·다중 선택 없음(체크박스 0개) | 재현할 표면 없음 | N/A |
| EXC-20 | P1 | **미충족 — 그리고 이 섹션 안에서 규칙이 갈린다.** 조회 실패 배너에 **참조 코드가 없다**(`LogListShell.tsx:280-292` 가 `referenceOf(cause)` 미사용). raw body·stack 은 노출하지 않으므로 후반('never-leak')은 충족. ⚠ **형제인 오류 로그는 추적 ID 를**(`errors/types.ts:52-55`: '운영자가 이것을 복사해 개발자에게 준다 — 없으면 "오류 났어요"로 끝나 아무도 못 찾는다') **API 로그는 요청 ID 를 보여준다** — **이 섹션은 참조 코드의 가치를 알면서 자기 실패 배너에는 안 붙였다** | `?fail=logs-member:list` → 복사 가능한 코드 없음 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ `LATENCY_MS = 400`(`shared/crud/dev.ts`)은 **개발용 지연이며 성능 예산이 아니다** |
| DOM 규모 | **구조적 상한** — 최대 100행 × 6열 | `isPageSize` 화이트리스트 캡(`types.ts:196-198`) | 로그가 100만 건이어도 표는 100행. ⚠ **'내용' 컬럼이 wrap 이라 행 높이는 가변**이다(유일) |
| CPU (현재 · 픽스처) | **O(N) per 조회** | `runLogQuery`(`query-engine.ts:142-156`) — 필터 + 기간 필터 + 정렬 | ⚠ 기간 필터를 **두 번** 돈다(`:147-148`) — 배지 모수와 결과 모수가 달라 불가피. 백엔드 연동 시 사라진다 |
| 재조회 횟수 | **조건 변경당 1회** | `staleTime` 미지정(기본 0) | **감사 로그에서는 그것이 맞다**(§3 STATE-03). 검색은 250ms 디바운스 뒤 1회 |
| **페이로드 전송량** | ⚠ **측정 불가 · 상한 없음 — 이 화면에서 가장 큰 미지수다** | 목록 응답이 **모든 행의 요청 본문 전체**를 싣는다(BE-061 §7.2) | **행 수는 캡되지만 행의 크기는 캡되지 않는다.** 주문 페이로드에는 배송지·카드 객체가 들어 있어 다른 셋보다 무겁다. 상세를 한 건도 안 열어도 100건 전부 온다 |
| 마스킹 비용 | **열 때만 O(페이로드 크기)** | `formatMaskedPayload` 는 다이얼로그 렌더 시에만(`LogPayloadDialog.tsx:96`) | 목록 렌더에는 0. 깊이 6 캡(`masking.ts:135`)이 상한 |
| 번들 | **이 화면 전용 의존 0** | 4화면이 셸 한 벌 공유. zod/mini(+4.6kB) | classic zod(+17.5kB) 대신 mini |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). status 분기 없음(§3 EXC-06) · 참조 코드 없음(§3 EXC-20) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤 + '불러오는 중…' |
| 0건 | 빈 상태 3분기 + 복구 | ✔ (§3 STATE-05) |
| **기간 입력 오류** | 원인이 자기 입력임을 알려야 | ✖ **요약·필터는 알리는데 표는 '기록이 없다'고 단정한다**(§2 STATE-01 gap) |
| 백엔드 무응답 | 상한에서 abort + 고지 | ✖ 조회는 무한 대기(§3 EXC-05). 내보내기는 취소 가능 |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ **손실 0 — 조회 조건이 URL 에 있다**(§2 EXC-02 · IA-13) |
| 권한 강등(mid-session) | UI reconcile | ✔ `useRouteCan` 이 스토어 구독 → 내보내기 버튼이 사라진다 |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | abort, 실패 아님 | ✔ 토스트 0건 + 상태 복원 |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01 — 종속) |
| 페이로드 직렬화 실패 | 화면이 죽지 않아야 | ✔ `masking.ts:183-189` → '[페이로드를 표시할 수 없습니다]' |
| **삭제된 회원으로 이동** | 안내 | △ 링크를 눌러 이동한 뒤에야 '회원을 찾을 수 없습니다.'를 만난다 — **이 화면은 미리 알 수 없다**(`memberId` 는 기록 시점 값) |
| 서버가 모르는 `activity` 값 | 알 수 없음을 표시 | ✖ `MEMBER_ACTIVITY_LABEL[entry.activity]` 가 `undefined` → **빈 셀.** 축 옵션도 라벨 맵 파생이라(`types.ts:75`) **고를 수도 없다** — 새 활동이 조용히 사라진다(§5 #9) |

### 4.3 이 화면이 답하지 못하는 운영 질문

**§5 의 gap 이 아니라 범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '이 회원의 활동만 시간순으로' | **부분 가능** — 계정을 검색창에 치면 된다. 그러나 **전용 타임라인이 없어** 회원 상세에서 이 화면으로 넘어오는 경로도 없다(링크는 한 방향이다: 로그 → 회원) |
| '이 **연쇄**를 묶어 보고 싶다' | 불가 — 픽스처가 '결제 실패 → 재시도 → 성공'을 **의도적으로** 담고 'CS 문의의 답이 이 연쇄에 있다'고 밝히는데(`fixtures.ts:114-119`) 화면은 한 줄씩 흩어 보여준다. 같은 주문번호로 검색하면 세 행이 나오지만 **주문번호는 `summary` 안의 문자열일 뿐 구조화된 필드가 아니다** |
| 'Safari 로 접속한 활동' | 불가 — **기기가 표에 보이는데 검색도 정렬도 안 된다**(`searchOf`·`sortValues` 둘 다 `device` 없음 — §5 #6·#7). **보이는 것과 찾을 수 있는 것이 어긋난다** |
| '이 배송지로 간 주문 전부' | 불가 — 페이로드 검색이 없다(검색은 4필드) |
| '지금 일어나는 일' | 불가 — 실시간 tail 없음 |
| '내보내기를 두 번 눌렀는데 파일이 두 개' | **가능한 일이다**(§2 EXC-08). 서버가 갈라지지 않아 무해하나 **여기서는 그 2벌이 개인정보 파일이고** 분당 3회 제한을 2회 소모한다 |

### 4.4 데이터 보존 · 감사 — **이 화면의 핵심**

| 항목 | 상태 |
|---|---|
| 이 화면의 쓰기 | **없다** — 7개 층에 구조적으로 강제(BE-061 §7.5) |
| **⚠⚠ 마스킹 구멍 (확인된 실재 노출)** | **배송지 주소(`address`)와 수령인 이름(`receiver`)이 마스킹 없이 상세에 그려진다.** `masking.ts:49-75` 의 7개 규칙 전부와 대조해 확인했다 — 같은 `shipping` 객체의 `phone` 은 `'010-●●●●-5678'` 로 가려지는데 `address` 는 `'서울특별시 중구 세종대로 000'` 그대로다(`fixtures.ts:88-93`). `logs.test.ts:293-302` 는 **카드번호만** 단언해 이것을 못 잡는다. **키 기반 마스킹의 구조적 한계**이고 `masking.ts:56-61` 의 `^card$` 사연이 그 구멍이 이미 한 번 뚫렸었다는 증거다. **⚠ 기준 `a5c2639` 에서 그 증거가 하나 더 늘었다** — 커밋 `ebb0e4c` 가 **형제 화면(FS-063)의 같은 종류 구멍**을 막으며(`masking.ts:73` 에 `recipient|수신자` 추가) `:67-72` 에 `^card$` 와 판박이인 사연을 적었다: '마스킹은 키 이름으로만 판단하므로, 이메일을 담은 키는 **이름마다 여기 적어 줘야 한다**'. **같은 결함이 세 번째 키에서 또 발현했고 이 화면의 `address`·`receiver` 는 그때도 손대지 않았다** — 규칙이 한 줄 늘 때마다 형제 하나가 구제되고 이 화면은 남는다. **BE-061 §7.1** |
| **⚠ 보관은 줄였는데 표시는 샌다** | 보존기간을 3년→1년으로 줄인 이유가 '**남의 개인정보다. 오래 들고 있는 것 자체가 위험이다**'(`types.ts:85-90`)인데, **정작 그 개인정보가 화면에 그대로 나온다.** 판단이 절반만 관철됐다 |
| **⚠ CSV 는 지키고 화면은 못 지킨다** | `data-source.ts:53-55` 가 '카드번호·**전화번호·주소**가 들어 있고 … 이 파일이 유출되면 개인정보 유출 사고다'라며 **페이로드 열을 CSV 에서 뺐다.** 그 문장이 주소를 **명시적으로 위험 목록에 넣었다.** 같은 주소가 화면에는 나온다 — **같은 위험을 파일에서는 인지하고 화면에서는 놓쳤다** |
| **마스킹의 성격** | ⚠ **표시 통제일 뿐 보안 통제가 아니다**(BE-061 §7.1 → BE-060 §7.1 상속). 원본이 브라우저에 도달한 뒤 렌더 직전에만 가려진다 — devtools 로 우회. `masking.ts:18-22` 가 그것을 이미 정직하게 적었다 |
| **페이로드 노출 면적** | ⚠ **목록·내보내기 응답이 전 행의 요청 본문을 싣는다**(BE-061 §7.2). 상세를 안 열어도 100건의 배송지·카드번호가 브라우저에. **내보내기는 CSV 에서 뺀 그 데이터를 조건 전체만큼 내려받는다** |
| **보존기간 vs 파기 요구의 충돌** | ⚠ **두 원칙이 정면으로 부딪힌다**(BE-061 §7.3) — 감사 원칙('탈퇴해도 로그는 남아야 한다. 정산·분쟁 대응이 불가능해진다' — `fixtures.ts:181-183`) vs 개인정보 원칙('목적을 다하면 지운다' — `types.ts:85-90`). **둘 다 코드에 근거가 적혀 있고 둘 다 옳다.** 탈퇴 회원의 계정·이름·IP·기기·배송지가 최대 1년 더 산다. **행은 남기되 익명화**하는 경로가 후보이나 법·정책 결정이 선행된다 |
| 보존기간 이행 | ⚠ 화면이 '1년 · 자동 폐기'를 **단언**하는데 이행 주체가 없다(BE-061 §7.3 — 심 없음). **이 화면에서 특히 무겁다** — 근거가 '개인정보 최소 보관 원칙'이라 **지키지 못하면 원칙 위반 자체**다 |
| 개인정보 열람 | 회원 계정·이름·IP·기기가 목록에, 배송지·카드·전화가 페이로드에. 계정·이름은 **서버가 마스킹해 내려주는 것이 계약**이다(`types.ts:39,41`) |
| **열람 감사** | ⚠ **없다**(BE-061 §7.6 #11 — 심 없음). **이 화면은 그 필요가 가장 크다** — 여기서 새는 것은 남의 개인정보다 |
| 반출 통제 | ✔ `export` 를 `read` 와 분리해 프론트가 게이팅(§2 EXC-03). **단 서버가 같은 판정을 안 하면 장식이고, 거기서 나가는 것은 개인정보 파일이다**(BE-061 §3.1) |
| 탈퇴 회원 처리 | ✔ 링크 없음 + '탈퇴' 표기(`MemberActivityPage.tsx:37-39`) — **없는 계정을 있는 것처럼 보이게 하지 않는다.** ✔ **로그는 남는다**(cascade 금지 — BE-061 §3.3) |
| **CSV 수식 주입** | ✔ **막힌다**(기준 `a5c2639` 에서 신설). `shared/download.ts:40-44` `neutralizeFormula` 가 선두 `=`/`+`/`-`/`@`/탭/CR(`FORMULA_LEAD` `:22`)을 작은따옴표로 무력화하고, `escapeCell :50-54` 가 **무력화를 RFC 4180 따옴표 감싸기보다 먼저** 수행한다(`:48` 이 그 순서의 이유를 밝힌다 — 붙인 작은따옴표까지 따옴표 안에 들어가야 한다). 이 화면의 CSV 셀은 전부 `toCsvText`(`query-engine.ts:187`) → `escapeCell` 을 지난다. 순수한 수는 예외로 통과시켜(`PLAIN_NUMBER` `:29`) 숫자 열이 텍스트로 변질되지 않는다. 회귀 테스트 `shared/download.test.ts:15-49`(무력화 7건) · `:51-68`(수는 그대로) · `:70-86`(RFC 4180 계약 유지 — **헤더도 같은 규칙을 탄다** `:84-85`) |
| 토큰 승격 후보 | `typography.font-family.mono` — `logs.css:86`(`:68-72` 가 근거·승격 의사를 밝힌다). TOKEN-01 의 문자에는 안 걸린다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-01** | **P0** | **기간 입력이 유효하지 않으면 조회가 걸리지 않았는데도 표가 `<Empty>` 를 그린다.** `LogListShell.tsx:152` 가 `enabled: false` 로 막는 것은 의도인데(`validation.ts:11-12`), `:251-269` 가 표를 그려 `entries=[]`·`loading=false` 가 빈 상태로 떨어진다. **요약은 '기간을 확인해 주세요'라 하고 표는 '기록이 없다'고 단정한다.** **화면 코드로 해소 가능** — 표 자리에 `range === null` 분기를 추가하면 된다 | 이 화면 + 4형제 공용(`LogListShell`) | **A11 change_request (FS-061 §7 #3)** |
| ~~2~~ | ~~MOTION-01~~ | — | **해소됨(PR #26 · 기준 `a5c2639`).** Modal 에 backdrop fade + dialog scale(0.96→1) enter/exit 가 실재한다(`Modal.css:20-21,30-38,58-59` → keyframes `:126-168`) — CSS-only 이고 완료 감지는 `onAnimationEnd`(`Modal.tsx:216-218`)다. 판정 `gap` → `종속`(§2). **남은 판단은 DS 의 것**: AnimatePresence 부재를 gap 으로 볼지 · 푸터 버튼 경로가 여전히 즉시 언마운트인 것(`Modal.tsx:27-31`)을 gap 으로 볼지 | 앱 전역(DS) | **DS 소유 문서 (이 문서에서는 종결)** |
| ~~3~~ | ~~MOTION-02~~ | — | **해소됨(PR #26 · 기준 `a5c2639`).** toast exit 가 실재한다 — `.tds-toast--exiting`(`Toast.css:32-37`) + keyframes `:121-131`, `exit-duration`={motion.duration.fast}(150ms) · `exit-easing`={motion.easing.accelerate}(`tokens.json:1298-1307`). **요구가 명시한 수치를 그대로 만족한다.** 판정 `gap` → `종속`(§2) | 앱 전역(DS) | **DS 소유 문서 (이 문서에서는 종결)** |
| 4 | ERP-03 | P1 | sticky thead 없음 — 크기 100 에서 컬럼 이름이 사라진다 | 이 화면 + 4형제 공용(`LogTable`) | A11 |
| 5 | ERP-05 | P1 | 범위 요약·크기 선택이 DS `Pagination` 의 opt-in 표면을 쓰지 않고 화면 사본으로 있다. **DS 의 `role="status"` announce 가 없다.** `LogListShell.tsx:311-312` 주석이 낡았다 | 이 화면 + 4형제 공용 | A11 · A41 (FS-061 §7 #6) |
| 6 | **ERP-04** | P1 | **'접속' 컬럼만 정렬 불가 — 4화면 중 이 화면만 정렬 불가 컬럼을 갖는다.** `data-source.ts:25-31` 의 `sortValues` 에 `device` 키가 없어 헤더가 버튼이 되지 않는다. 컬럼 id 는 `device` 인데 셀은 IP 를 윗줄에 그린다 — 의도인지 누락인지 코드만으로 판정 불가 | 이 화면 | A11 change_request (FS-061 §7 #6) |
| 7 | — | P1 | **기기가 표에 보이는데 검색되지 않는다.** `searchOf`(`data-source.ts:24`)가 `memberAccount`·`memberName`·`summary`·`ip` 만 본다. **보이는 것과 찾을 수 있는 것이 어긋난다** | 이 화면 | A11 change_request (FS-061 §7 #7) |
| 8 | **ERP-06** | P1 | **`summary` 안의 금액 포맷이 서버에 있다** — `'결제 완료 ORD-020931 · 128,000원'`(`types.ts:45`). 이 화면의 숫자 중 하나가 `formatNumber` 를 거치지 않고 화면·CSV 에 나간다. **서버가 포맷을 바꾸면 화면이 조용히 따라간다.** 그리고 주문번호·금액이 비구조적이라 정렬·집계·링크가 불가능하다 | 이 화면 + 서버 계약 | A11 · A63 (BE-061 §7.6 #7) |
| 9 | — | P1 | **서버가 모르는 `activity` 값이면 빈 셀이 되고 축에서 고를 수도 없다**(`types.ts:75` 가 라벨 맵에서 옵션 파생). 새 활동이 화면에서 **조용히 사라진다** — 감사 화면에서 기록이 조용히 사라지는 것은 치명적이다 | 이 화면 + 4형제 공통 패턴 | A11 · A63 |
| 10 | IA-14 | P1 | 가로 스크롤은 충족. **미충족**: 좌측 필터 폭 고정(`@media` 0건) · sticky 없음(#4) · touch-target 미검증. ⚠ '내용' 컬럼이 wrap 이라 좁은 폭에서 행 높이가 크게 늘어난다 | 이 화면 + 앱 전역 | A11 |
| 11 | EXC-05 · EXC-06 · EXC-11 · EXC-20 | P1 | 클라이언트 타임아웃 없음 · 실패가 status 를 안 보고 한 문구로 붕괴 · 오프라인 감지 없음 · **참조 코드 없음**(형제 화면은 추적 ID/요청 ID 를 보여준다 — 같은 섹션에서 규칙이 갈린다) | 이 화면 + 앱 전역 | A11 · A40 · A41 (FS-061 §7 #14·#15) |
| 12 | — | — | **⚠⚠ BE-061 §7.1 (보안 — 이 배치의 최우선 발견)** — **배송지 주소·수령인 이름이 마스킹 없이 화면에 그려진다.** 같은 페이로드의 전화번호는 가려지는데 주소는 안 가려진다. 테스트가 카드번호만 단언해 못 잡는다. **CSV 는 주소를 위험 목록에 넣어 뺐는데 화면은 놓쳤다.** 화면 문구는 '**자동으로** 가려집니다'라고 단언한다. 최소 조치는 규칙 추가 + 테스트, **근본 조치는 값 기반 탐지 또는 서버 화이트리스트 정제**(규칙을 한 줄씩 늘리면 다음 키에서 또 뚫린다 — `^card$` 사연이 그 증거) | 앱 전역(`masking.ts`) + 서버 | **A63 · A11 · A01 (보안 — 최우선)** |
| 13 | — | — | **BE-061 §7.2 (보안)** — 목록·내보내기 응답이 전 행의 페이로드를 싣는다. **EP-02 에서 `payload` 제거는 이 화면에서 요구다**(CSV 가 안 쓰고 그것이 개인정보 파일이므로). **내보내기 전용 projection 타입이 필요하다**(현재 `payload` 가 필수 필드) | 서버 + 타입 | **A63 · A11 (보안)** |
| 14 | — | — | **BE-061 §7.3 (정책 충돌)** — 감사 원칙 vs 개인정보 파기 원칙이 정면으로 부딪힌다. 탈퇴 회원의 개인정보가 최대 1년 더 산다. **행은 남기되 익명화**가 후보이나 법·정책 결정이 선행된다. 보존기간(1년)의 이행 주체도 미정 | 도메인 · 법무 | **A01 · A63** |
| 15 | — | — | **BE-061 §7.6 #8** — `device` 가 조립된 단일 문자열인데(`'Chrome 126 · Windows 11'`) **BE-008 의 `LoginHistoryEntry` 는 `browser`·`os` 를 따로 내려준다.** 같은 개념을 두 감사 도메인이 다르게 모델링한다 — 분리돼 있으면 #6·#7 이 함께 풀린다 | 도메인 | A63 · A11 |
| 16 | — | — | **BE-061 §7.6 #11** — 열람 감사 없음. **이 화면은 그 필요가 가장 크다**(새는 것이 남의 개인정보다) | 도메인 | **A63 · A01** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며 실행 결과가 아니다.

### 6.1 실패 재현 (`?fail=`) — 이 화면의 실제 scope 와 op

**이 화면의 scope 는 `'logs-member'` 다**(`data-source.ts:16`). 4형제가 각자 다른 scope 를 가져 한 화면만 실패시킬 수 있다.

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ `adapter.ts:37` | FS-061-EL-015 조회 실패 배너 |
| `export` | ✔ `adapter.ts:52` | FS-061-EL-017 실패 토스트 + 다시 시도 |
| `detail` · `save` · `delete` | ✕ — **부르지 않는다** | 해당 없음. **상세는 조회가 아니고**(목록 행 객체로 그린다) **쓰기는 존재하지 않는다** |

```
/logs/member-activity?fail=list                 조회 실패 → STATE-02 확증
/logs/member-activity?fail=logs-member:list     위와 동일(스코프 명시 — 형제는 멀쩡하다)
/logs/member-activity?fail=export               내보내기 실패 → 토스트 + 다시 시도
/logs/member-activity?fail=all                  둘 다
```

### 6.2 P0 gap · 보안 결함 재현

```
# STATE-01 gap — 조회가 걸리지 않았는데 빈 상태가 뜬다
/logs/member-activity?period=custom&from=2026-07-01&to=2027-01-01
  → 필터: '미래 날짜는 조회할 수 없습니다. 감사 기록에 미래는 없습니다.'
  → 요약: '조회 기간을 확인해 주세요.'
  → 표:   <Empty> '필터 초기화' 분기          ← 이것이 gap 이다

# ⚠⚠ 마스킹 구멍 — §5 #12 (이 배치의 최우선 발견)
/logs/member-activity  → 활동 '주문' 필터 → 아무 행이나 열기
  → 페이로드에 다음이 함께 보인다:
       "phone":   "010-●●●●-5678"              ← 가려짐
       "address": "서울특별시 중구 세종대로 000"  ← 그대로 (gap)
       "receiver": "박**"                       ← 그대로 (픽스처는 이미 마스킹된 이름이라
                                                   덜 드러나지만, 실제 서버가 전체 성명을
                                                   보내면 그대로 나온다)
  → 그 위에는 '민감한 값은 자동으로 가려집니다' 안내문이 떠 있다

# 활동 '결제' → 카드 마스킹은 정상 작동한다 (대조군)
  → "card": "●●●●1234"                        ← 가지 전체가 가려진다 (masking.ts:62-65)

# MOTION-01 / MOTION-02 — 기준 a5c2639 에서 gap 이 아니다 (PR #26). 이제 '확증' 절차다:
상세를 열고 Esc/딤/× 로 닫는다 → backdrop fade + dialog scale(0.96→1), exit 완료 후 unmount
  ⚠ 푸터 '닫기' 는 즉시 사라진다 — Modal 소유 경로가 아니다 (Modal.tsx:27-31)
내보내기 → 토스트 → dismiss → opacity 1→0 + 아래로 밀리며 소멸 (150ms · accelerate)
prefers-reduced-motion: reduce → 위 셋이 전부 즉시 (Modal.css:173-180 · Toast.css:136-141)
```

### 6.3 pass 확증 스위치

```
# IA-13 — URL 이 곧 view
/logs/member-activity?activity=withdraw&outcome=success&page=2&size=50&sort=member&dir=asc&q=user
  → 새 탭에 붙여넣으면 동일 view. 기본값(period=last-30d·page=1·size=20)은 URL 에 없다
  → 회원 상세로 갔다가 Back → 보던 필터·페이지 그대로 (이 화면에만 있는 이탈 경로)

# EXC-03 — 권한 게이팅 (LogListShell.test.tsx 가 고정)
read 끈 역할   → 403 화면 + fetchPage 호출 0건 (배송지·카드번호를 받아 놓지도 않는다)
export 끈 역할 → 표는 보이고 내보내기 버튼 부재

# A11Y-08 — 두 목적지가 모두 키보드로 닿는다
Tab → 첫 칸(시각) → Enter → 상세 다이얼로그
Tab → 계정 링크    → Enter → /users/members/:id
탈퇴 행의 계정 → Tab 으로 안 닿는다 (링크가 아니다 — 의도)

# ERP-04 — 5/6 컬럼만 정렬 가능
'활동' 헤더 → aria-sort 토글 + ?sort=activity
'접속' 헤더 → 버튼이 아니라 아무 일도 없다        ← §5 #6
/logs/member-activity?sort=device → 기본 정렬(최신순)로 떨어진다

# ERP-09 — TZ 고정
브라우저 TZ 를 America/Los_Angeles 로 → 시각·'오늘'·구간 경계가 서울 기준으로 불변

# ERP-15 — 렌더 캡
/logs/member-activity?size=5000 → 20줄
```

### 6.4 단위 테스트 (이 화면의 판정을 고정하는 것)

| 파일 | 고정하는 판정 |
|---|---|
| `logs.test.ts:49-54,59-72` | **감사 불변성** — 이 화면 어댑터의 export 목록 전수(`memberActivitySpec`·`fetchMemberActivityLogs`·`fetchMemberActivityLogsForExport`·`toCsv`) + 쓰기 이름 0건 |
| `logs.test.ts:82-107` | **ERP-09** — KST 고정 · 초 정밀도 |
| `logs.test.ts:144-176` | **COMP-11** — 미래·역전·90일·형식 |
| `logs.test.ts:180-274` | **마스킹** — 비밀번호·토큰·**카드(객체 래핑)**·이메일·전화·중첩·비문자열·원본 불변 |
| `logs.test.ts:293-302` | **이 화면의 결제 페이로드에서 카드번호가 사라지는가** — ⚠ **`address`·`receiver` 는 이 단언에 포함돼 있지 않다**(§5 #12) |
| `logs.test.ts:338-352` | **픽스처 규율** — 이름 마스킹(`*` 포함) · 이메일 도메인 `example.com` · IP 문서용 대역 |
| `logs.test.ts:407-507` | **ERP-04** — AND 결합 · 정렬 → 자르기 순서 · 결정성 · 배지 모수 |
| `logs.test.ts:511-517` | 컬럼 id 와 정렬 키가 어긋나지 않는가 — ⚠ **`memberActivitySpec` 도 이 단언을 통과한다**(시각 키만 확인하므로 `device` 누락은 잡히지 않는다 — §5 #6) |
| `LogListShell.test.tsx:125-170` | **EXC-03** — read 403 + 요청 0건 · export 버튼 부재 |
| `LogListShell.test.tsx:172-184` | **STATE-02** — 인라인 배너 + 다시 시도 · 토스트 아님 |
