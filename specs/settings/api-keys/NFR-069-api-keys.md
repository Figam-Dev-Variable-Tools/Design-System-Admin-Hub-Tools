---
id: NFR-069
functionalSpec: FS-069
backendSpec: BE-069
qualityBar: specs/quality-bar.md
title: "API Key 관리 비기능 명세"
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-069. API Key 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-069 API Key 관리 (`/settings/api-keys`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-069(요소·예외) · **BE-069(§7.1 시크릿 수명 계약 — 이 화면의 중심)** · NFR-067·068(형제 화면) · `specs/quality-bar.md` |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-069 §7 · BE-069 §7.9 와 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **EXC-08 `gap` → `pass`**(`712c30b` — 발급에 멱등키가 붙었다: `data-source.ts:107-141` · `queries.ts:30,37-38` · `ApiKeysPage.tsx:96,122-123,130,156`, 테스트 3건 `api-keys.test.ts:90-124`) · **MOTION-02 `gap` → `pass`(상속)** · **MOTION-03 `gap` → `pass`(상속)** · **MOTION-01 `gap` → `종속`**(PR #26). ⚠ **역방향 1건 — `FEEDBACK-06` `pass` → `gap`**: PR #26 이 Modal 에 exit 애니메이션과 함께 **일방향 latch 결함**을 들여왔고 이 화면의 모달 2종이 그 폭발 반경이다(§2 FEEDBACK-06 · §5 #14). **P0 gap 5 → 2** |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 `pages/settings/api-keys/**` · 섹션 공유 `pages/settings/_shared/**`)의 코드가 충족을 결정 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` / `gap` / `종속` | 충족 / 미충족(§5 이관) / 소유 문서의 판정이 미확정이라 그것을 따름 |

> **`상속` + `gap` 조합**: 소유가 DS 라도 **그 상태가 코드로 확정된 경우**(예: Motion 라이브러리 미도입)에는 `종속` 이 아니라 `gap` 으로 적는다 — 이 화면에 표면이 실재하는 이상 사용자가 결함을 겪기 때문이다. **해소는 앱 코드로 불가능**하며 이관 대상이 DS 임을 §5 에 명시한다. (NFR-067 §1.1 과 같은 규약)

### 1.2 화면 성격

**이 섹션에서 유일하게 목록 + 모달 화면이다.** 형제 3화면(사이트·언어·OAuth)이 단일 문서 폼인 것과 다르다. 그 결과 판정이 크게 갈린다:

| 축 | 형제 3화면 | **이 화면** |
|---|---|---|
| 저장소 | `createRevisionedStore`(단일 문서 + revision 토큰) | **`let keys: readonly ApiKey[]`(목록 · 토큰 없음)** — `data-source.ts:63` |
| 셸 | `SettingsFormShell` | **없다** — 페이지가 직접 조립 |
| **EXC-04** | pass(revision 토큰) | **gap — 토큰이 없고 유령 폐기가 있다** |
| **EXC-08** | gap이되 `If-Match` 가 데이터를 지킨다 | **pass — POST 지만 멱등키가 붙었다**(`712c30b`). ✔ **이번 기준에서 뒤집혔고 이제 섹션에서 유일한 pass 다** |
| **FEEDBACK-06** | n-a(폼 modal 없음) | **gap — 4경로 가드는 실재하나 DS Modal 의 latch 결함이 그 위에 얹혔다**(§2 · §5 #14) |
| **IA-04** | n-a(목록 아님) | **pass — list 템플릿(우상단 action + count)** |
| 시크릿 | 없음(사이트·언어) / 폼 필드(OAuth) | **모델에 평문 자리가 없다**(BE-069 §7.1) |

**이 화면의 중심은 비가역성이다**: 키는 한 번만 보이고, 폐기는 되돌릴 수 없다. 그래서 **FEEDBACK-02(파괴적 확인)·FEEDBACK-06(4경로 가드)·EXC-08(중복 제출)** 이 실질 안전장치다. **이번 기준에서 그 셋의 판정이 서로 바뀌었다**: **EXC-08 이 해소되고**(멱등키 신설 — 이전 배치가 '이 화면 최대 위험'으로 적은 유령 키 경로가 막혔다) **FEEDBACK-06 이 무너졌다**(DS Modal 의 일방향 latch — **화면 코드는 그대로인데 의존이 바뀌어 뒤집혔다**). **최대 위험이 EXC-08 에서 FEEDBACK-06 으로 옮겨 갔고, 새 위험이 더 나쁘다** — 유령 키는 목록에 남아 폐기라도 되지만, latch 는 **평문을 보여 주는 그 모달을 보이지 않게 만든 채 붙잡아** 평문을 영영 잃게 한다(§5 #14).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** `ApiKeysPage.tsx:93` `const loading = isFetching && keys === undefined` — **첫 로딩만** 판정한다(`isFetching` 직결이 아니다). `ApiKeysCard` 가 세 상태를 배타적으로 그린다(`:68-89`): 첫 로딩 → 스켈레톤만(`{loading && …}`) / 0건 → `Empty` 만(`{!loading && isEmpty && …}`) / 그 외 → 표(`{!loading && !isEmpty && …}`). **조회 실패는 페이지가 더 위에서 early return 으로 가로채므로 카드에 오지 않는다**(`:186-204` · `ApiKeysCard.tsx:8`). **재조회 중에는 이전 행이 유지된다** | `/settings/api-keys` 진입 → 표 렌더 확인 → `staleTime` 30초 경과 후 재진입(또는 발급/폐기 성공으로 invalidate 유발). **표가 3행 스켈레톤으로 바뀌지 않고 행이 유지되면 pass.** `?fail=load` → 배너만 · 0건 픽스처 → `Empty` 만 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** `ApiKeysPage.tsx:186-204` 가 조회 실패 시 **early return** 으로 `<Alert tone="danger">` + '다시 시도'(`refetch`)를 렌더한다. error toast 를 쓰지 않는다 — 이 화면의 `toast.error` 는 **클립보드 실패 1건뿐**(`RevealKeyModal.tsx:108`)이며 그것은 read 실패가 아니라 **브라우저 API 실패**라 요구의 appliesTo 가 아니다. 발급·폐기 실패도 토스트가 아니라 각 모달 안 배너(`:122,168`) | `/settings/api-keys?fail=load` 진입. **danger Alert + '다시 시도' 가 뜨고 토스트가 없으면 pass** | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** ① **페이지네이션이 없다**(`ApiKeyTable.tsx:87` `keys.map` — 전량 렌더) ② **행 선택이 없다**(체크박스 열·SelectionBar·일괄 작업 부재) ③ 필터도 없다. 'total 축소 시 page clamp' · '필터/page 변경 시 selection 리셋' 이 걸릴 표면이 존재하지 않는다. **페이지네이션 부재 자체는 IA-04 가 다루며 그쪽도 조건부 pass 다**(BE-069 §7.8: 키는 운영자가 만들어 상한이 현실적이다) | 페이지네이션·선택이 도입되면 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | **충족.** `grep -rnE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/settings/` → **0건**(2026-07-17). 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. border-width 도 토큰(`--tds-border-width-thin` — `RevealKeyModal.tsx:58`). ⚠ **`RevealKeyModal.tsx:44-48` 이 이 요구를 지키기 위해 기능을 포기한 사례를 기록한다**: 시크릿에 필요한 mono 폰트 토큰이 없는데 **하드코딩 `monospace` 로 우회하지 않았다** — '토큰 밖 시각 값이고, 한 화면이 몰래 쓰기 시작하면 그게 곧 drift 다'. **TOKEN-01 은 pass 이고 그 대가가 §3 의 mono 부재 gap 이다** | 위 grep → **0건이어야 한다.** `grep -rn "monospace" pages/settings/` → **0건**(주석 제외). ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-input tds-ui-focusable`(`CreateApiKeyModal.tsx:219`) · DS `<Button>`·`<Checkbox>`·`<Modal>`. **이 화면이 focus ring 을 직접 선언하지 않는다**(로컬 `:focus-visible` 0건) | DS 토큰 문서 판정을 따른다. 로컬 `:focus-visible` 선언이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `ApiKeysCard.tsx:71`) · **Toast enter/exit**(`Toast.css:26-27` · `:32-37` — 둘 다 `component.overlay` recipe 의 easing 을 소비한다) · **Modal enter/exit**(`Modal.css:20-21,30-38,58-59` — 같은 recipe). ⚠ **PR #26 으로 이 화면이 상속하는 easing 소비 표면이 늘었다** — `component.overlay.{enter,exit}-easing`(`tokens/tokens.json:1293-1307`)이 신설 소비자이고 `Toast`·`Modal` 이 **같은 recipe 를 함께 쓴다**(`tokens.json:1287` — '오버레이는 한 몸처럼 움직인다') · DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css`·`Modal.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`ApiKeysCard.tsx:63`) · **Modal ×3**(발급·노출·확인 — `Modal.css:20` `box-shadow: var(--tds-shadow-overlay)`) · Toast. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건). ⚠ **모달이 모달 위에 뜬다**(발급→discard 확인 · 노출→닫기 확인) — 중첩 시 부상 표현이 유지되는지는 DS 판정 | Card/Modal/Toast 토큰 판정에 종속. **중첩 모달의 shadow/backdrop 누적**을 DS 문서에 확인 요청 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다**(`grep -rn "h1" apps/admin/src/pages/settings/` → **0건**). 제목은 **AppHeader 가 소유**하며(`AppHeader.tsx:101`) nav 잎 라벨 'API Key 관리'를 렌더한다. `CardTitle`('API Key' — `ApiKeysCard.tsx:64`)·Modal `title` 은 `<h1>` 이 아니다. **이 화면이 title 타이포를 직접 선언하지 않는다** | AppHeader `titleStyle` 이 title tier 를 참조하는지 확인. 로컬 title 스타일 선언이 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** **검색 입력이 없다** — `grep -rn "SearchField\|useDebouncedSearch" pages/settings/` → **0건**. 목록 화면이지만 검색·필터가 없다(FS-069 §2 — 키가 수~수십 건이라 필요하지 않다). 'IME 조합 중 커밋 금지 + 디바운스 + stale 응답 무효'가 걸릴 자리가 없다. **발급 모달의 이름 입력은 폼 값이지 query 가 아니다** — 서버 조회를 발화하지 않는다(중복 검사도 로컬 배열 대상 — `:149`) | 검색 입력이 도입되면 다시 매긴다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | 직접 | **충족 — 이 화면이 요구의 정확한 appliesTo 다.** 파괴적 delete 표면이 **실재한다**(폐기 — 형제 3화면엔 없다). ① **강제실패가 dialog 를 유지하고 retry 를 준다** — `onError` 가 `setRevokeError(...)`(`:168`)만 하고 `setRevoking(null)` 을 하지 않아 다이얼로그가 살아 있고, `error={revokeError}`(`:264`)로 그 안에 배너가 뜬다. 코드가 의도를 밝힌다(`:167` '[FEEDBACK-02] 다이얼로그를 열어 둔 채 배너로 알린다 — 재클릭이 재시도다') ② **중간닫기 = abort 복원** — `cancelRevoke`(`:174-181`)가 `abort()` + `revoke.reset()` + `revokeLock.release()` + 상태 비움. DS 가 busy 중에도 취소를 살려 둔다(`ConfirmDialog.tsx:144`) ③ **intent 매핑** — `intent="delete"` → DS 가 danger tone·아이콘·라벨 결정(`ConfirmDialog.tsx:6`). ④ **문구가 결과를 말한다** — `revokeMessage`(`:53-55`)가 '연동이 즉시 401' · '되돌릴 수 없고' · '같은 키를 다시 발급할 수 없습니다' 3가지를 명시. **발급 모달도 같은 계약을 지킨다**(`:121-122` '모달을 닫지 않는다 — 입력을 지키고, 재클릭이 곧 재시도다') | `/settings/api-keys?fail=revoke` 에서 '폐기' → 확인. **다이얼로그가 열린 채 danger 배너가 뜨고 확인 버튼이 재활성되면 pass.** 폐기 중(400ms) '취소' → 실패 토스트·배너가 없어야 한다. `?fail=create` 로 발급도 같은 확인 | **pass** |
| FEEDBACK-04 | FEEDBACK | N/A | **표면이 없다.** 이 요구의 appliesTo 는 **라우트 레벨 dirty 폼의 3경로(unload/link/back) 가드**다. **이 화면에 라우트 레벨 폼이 없다** — 폼은 modal 안에 있고(`CreateApiKeyModal`) 그 dirty 가드는 **modal 4경로**라 FEEDBACK-06 의 appliesTo 다. `useUnsavedChangesDialog` 소비가 이 화면에 **0건**(형제 3화면은 `SettingsFormShell.tsx:122` 로 소비한다). ⚠ **그러나 이 부재가 실질 위험을 만든다**: **노출 모달이 떠 있는 중 사이드바 링크를 누르면 평문을 잃는다** — 3경로 가드가 없다. 이것은 FEEDBACK-04 의 appliesTo(dirty **폼**)가 아니라 **비가역 표시 상태**라 이 요구의 gap 으로 적지 않고 **§4.3 · §5 #10 에 별도 축으로 기록**한다 | 라우트 레벨 폼이 도입되면 다시 매긴다. **노출 모달의 이탈 가드는 §5 #10 로 이관** | **n-a** |
| FEEDBACK-06 | FEEDBACK | 직접 | **⚠ 미충족 — 이전 배치의 `pass` 가 이번 기준에서 뒤집혔다. 화면 코드는 그대로인데 의존(DS Modal)이 바뀌었다.** **① 화면이 요구하는 4경로 가드 자체는 그대로 실재한다** — `CreateApiKeyModal` 이 편집 가능한 폼을 담은 modal 이고(이름 입력 + 스코프 체크박스), `requestClose`(`:161-168`)를 **딤·Esc·×**(Modal 이 셋을 `onClose` 하나로 모은다 — `:182`)와 **취소 버튼**(`:186`)이 전부 지난다. 코드가 설계를 밝힌다(`:3-5`). dirty 면 `setConfirmingDiscard(true)` → `ConfirmDialog intent="discard"`(`:261-276`) · pristine 즉시 닫힘(`:163-166`) · busy 면 닫지 않음(`:162`). **② 그러나 그 가드가 DS `Modal` 의 일방향 latch 를 발화시킨다 — 취소하면 모달이 영구히 갇힌다.** `Modal.tsx:122-126` `requestClose` 가 `closingRef.current = true; setClosing(true)` 로 **latch** 를 걸고 **어디에서도 리셋하지 않는다**(`setClosing(false)`·`closingRef.current = false`·리셋 effect 전무 — 유일 사용처가 `:124` 다). Modal 은 `onClose()` 가 곧 부모의 언마운트라고 **설계 전제로 문서화**했는데(`Modal.tsx:19-25`) **이 화면의 `requestClose` 가 그 전제를 깬다**(dirty 면 `onClose` 를 부르지 않고 확인 다이얼로그만 띄운다 — 부모가 언마운트하지 않는다). **추적**: ① 이름 입력(dirty) → Esc → `closingRef=true, closing=true` **latch** ② `tds-modal__overlay--closing`(`Modal.tsx:202`) → `pointer-events:none`(`Modal.css:26-28`) + dialog exit `forwards`(`:35-38`) → **`opacity:0` 고정** ③ `onAnimationEnd`(`:216-218`) → `onClose()` = 이 화면의 `requestClose` → dirty 라 `setConfirmingDiscard(true)`, **언마운트 안 됨** ④ 사용자가 discard 확인에서 **'취소'**(`:271-273` `setConfirmingDiscard(false)`) ⑤ **종착: 발급 모달이 마운트된 채 `closing` 이 여전히 true — dialog 는 `opacity:0` 이라 안 보이고, 오버레이는 `pointer-events:none` 이라 클릭이 안 먹고, 이후 모든 Esc/딤/× 는 `Modal.tsx:123` 에서 즉시 return 한다. 입력한 이름·스코프가 보이지 않는 모달 안에 영구히 갇히고 페이지도 조작할 수 없다.** **reduced-motion/jsdom 변종도 동일 latch** — `Modal.tsx:129-132` 에서 `willAnimate()` 가 false 라 `onClose()` 가 동기 발사되고 같은 veto 를 만난다. 이때 dialog 는 *보이지만* 오버레이가 `pointer-events:none` + latch 라 **보이는데 완전 무반응**이다. **③ `RevealKeyModal` 에서 대가가 가장 크다** — 같은 4경로 구조(`:113-119` `requestClose`, 판정 기준이 dirty 가 아니라 `copied`)를 쓰고 `onClose={requestClose}`(`:126`)로 넘긴다. **복사하지 않은 채 Esc → latch → '키 보기'(`:176-178` `setConfirmingClose(false)`) → 평문을 담은 모달이 `opacity:0` 으로 갇힌다. 사용자가 '키를 계속 보겠다'고 눌렀는데 키를 영영 못 본다** — 평문은 지역 state 라 재조회 경로가 없다(§4.3). **이 화면의 대표 결함이며 §5 #14.** **④ 이관 대상은 DS** — 최소 수정은 veto 시 latch 리셋이나 `onClose` 가 `void` 를 반환해 Modal 에 신호가 없다(`Modal.tsx:19-25`). 화면 코드로는 `requestClose` 를 Modal 밖으로 빼는 우회만 가능하고 그러면 4경로 공유가 깨진다 | 발급 모달에서 이름을 입력한 뒤 ① 딤 클릭 ② Esc ③ 헤더 × ④ '취소' 버튼 — **네 경로 모두 discard 확인이 뜨면 ①은 pass.** **latch 재현(②)**: 이름 입력 → Esc → discard 확인에서 **'취소'** → **모달이 사라지지도 보이지도 않고 Esc·딤·× 가 전부 무반응이면 gap.** **노출 모달(③)**: 발급 후 복사하지 않고 Esc → '키 보기' → **평문이 보이지 않으면 gap**(가장 아픈 재현). pristine 4경로 → 즉시 닫혀야 한다(그 경로는 `onClose` 가 실제로 언마운트하므로 latch 가 남지 않는다) | **gap** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 4건: 발급 성공(`:116`) · 폐기 성공(`:162`) · **복사 성공**(`RevealKeyModal.tsx:104`) · **복사 실패(error)**(`:108`). 지속 live region 은 `ToastProvider` 가 소유하며 **비-error=polite · error=assertive 2벌**로 분배한다(`Toast.types.ts:15` — 'Toast 는 라이브 영역을 소유하지 않는다 … ToastProvider 의 지속 라이브 영역 2개가 통지를 소유한다'). 이 화면은 주입만 한다. ⚠ **토스트가 모달 위에 뜬다**(복사 성공/실패는 노출 모달이 열린 상태) — live region 이 모달 밖에 있어도 announce 되는지는 ToastProvider 판정 | ToastProvider 판정에 종속. **모달이 열린 상태에서 복사 실패 토스트가 announce 되는지** 확인(`aria-modal="true"` 가 형제 노드를 가리는지 — DS 문서에 확인 요청) | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 4건 중 **3건에 `aria-describedby` 가 배선돼 있다**: ① **폐기 확인** — DS `ConfirmDialog` 가 `useId` 로 message id 를 만들어 `Modal describedBy` 로 넘긴다(`ConfirmDialog.tsx:129,135`) ② **노출 모달** — `RevealKeyModal.tsx:92` `useId()` → `:124` `describedBy={messageId}` → `:145` `<p id={messageId}>` ③ **discard 확인 2건** — DS `ConfirmDialog`. ⚠ **`CreateApiKeyModal` 의 `Modal` 에는 `describedBy` 가 없다**(`:179-183`). **그러나 이 요구의 appliesTo 는 `ConfirmDialog`**('ConfirmDialog aria-describedby=message')이며 발급 모달은 폼 모달이라 **본문이 곧 폼**이다(설명할 단일 message 가 없다) — **위반이 아니다.** 섹션 안에서 유일하게 `describedBy` 를 주지 않는 모달이라는 점만 FS-069 §7 #15 에 기록 | DS 판정에 종속. **폐기 확인·노출 모달 open 시 본문이 title 과 함께 읽히는지** 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족.** **이 화면의 폼 컨트롤 3개(이름 1 + 스코프 체크박스 2)를 전수 확인했다.** ① **required 노출 — 충족.** required FormField 는 **이름 하나뿐**이고(`CreateApiKeyModal.tsx:208-215` `required`) 그 자식이 **네이티브 `<input>`**(`:216`)이라 `FormField.tsx:36-41` `isRequirableChild` 를 통과하고 `withAriaRequired`(`:50-56`)가 **런타임 `cloneElement` 로 `aria-required` 를 주입**한다. **래퍼(`<span>`/`<div>`)로 감싼 required 자식이 0건** — OAuth(NFR-070)가 겪는 결함이 여기엔 없다. `ref` 를 두 곳에 잇는 콜백 ref(`:227-230`)를 쓰지만 **`cloneElement` 는 props 를 더할 뿐이라 무해**하다(`ref` 를 덮지 않는다). **스코프 체크박스는 `required` 가 아니다**(그룹 규칙 — 개별 필수가 아니다) → 주입 대상이 아니다. ⚠ **`aria-required` grep 이 0건인 것으로 판정하면 안 된다 — 주입은 런타임이다** ② **aria-invalid without describedby = 0건 — 충족.** 이 화면의 `aria-invalid` 는 `:224` 한 곳뿐이고 바로 다음 줄(`:225`)이 `aria-describedby={nameInvalid ? errorIdOf('api-key-name') : undefined}` 를 **같은 조건으로** 짝지운다(`nameInvalid` — `:175`). `FormField` 가 같은 id 로 `<p id={errorIdOf(htmlFor)} role="alert">`(`FormField.tsx:110`)를 렌더하므로 **id 가 일치**한다. 중복 이름 오류도 이 경로로 간다(`:151` `setError('name', …)` → `errors.name?.message` → `nameInvalid`) ⚠ **스코프 그룹 오류(`:252-256`)는 `<p role="alert">` 에 id 가 없어 어떤 컨트롤과도 연결되지 않는다** — 그러나 **`aria-invalid` 를 켜지 않으므로 '짝 없는 aria-invalid' 위반은 아니다**(요구의 두 절 중 어느 쪽도 어기지 않는다). 연결 부재 자체는 A11Y 결함이며 **§3 A11Y-16 · §5 #5 에 기록**한다 | `grep -rn "aria-invalid" pages/settings/api-keys` → 히트 1건, 같은 요소에 `aria-describedby` 가 있는지 확인. RTL: 이름을 비운 채 '발급' → `input.getAttribute('aria-required') === 'true'` **와** `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` assert | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** **필터가 없다** — 목록 화면이지만 검색·필터·정렬 UI 가 하나도 없다(FS-069 §2). `aria-pressed` 를 쓸 toggle 필터 list item 이 존재하지 않으며 이 화면 전체에 `aria-current` **0건**. **스코프 체크박스 2개는 필터가 아니라 발급 폼 값**이며 네이티브 `checked` 로 상태를 노출한다(DS `Checkbox` 가 `<input type="checkbox">` 를 렌더) — 이 요구의 appliesTo 가 아니다 | 좌측 토글 필터가 도입되면 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | **PR #26 에서 구현됐다 — 다만 라이브러리가 아니라 CSS-only 다.** 이 화면에 모달이 가장 많다(4종: 발급 · 노출 · 폐기 확인 · discard 확인 ×2). backdrop fade + dialog scale 이 실재한다: backdrop enter `Modal.css:20-21`→`@keyframes tds-modal-backdrop-in :126-134` · exit `:30-33`→`tds-modal-backdrop-out :136-144` · dialog enter `:58-59`→`tds-modal-dialog-in :146-156`(opacity 0→1 · `scale(0.96)→scale(1)`) · exit `:35-38`→`tds-modal-dialog-out :158-168`(`forwards`). reduced-motion 게이트 `:173-180`. `component.overlay` recipe 소비(`tokens/tokens.json:1286-1308`). **`AnimatePresence` 는 없고**(`packages/ui/src` Motion/framer-motion 소비 **0건** — 라이브러리 미도입) 'exit 완료 후에만 unmount' 를 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성한다. **잔여 2건**: ① 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 즉시 언마운트**(`Modal.tsx:27-31`) — 이 화면의 '취소'·'완료'·discard 확인 버튼이 전부 그 경로다 ② **중첩 모달**(발급→discard · 노출→닫기확인)의 전환은 여전히 표현되지 않는다 — 두 번째 모달이 첫 번째 위로 즉시 나타난다. ⚠ **그리고 이 exit 경로가 이 화면에 FEEDBACK-06 결함을 들여왔다**(latch — §2 FEEDBACK-06). **라이브러리 부재를 gap 으로 볼지는 DS 소유 문서의 몫** | `/settings/api-keys` 에서 '새 키 발급' 을 연다. **backdrop 이 fade in 하고 dialog 가 `scale(0.96)→1` 로 들어오면 enter 는 충족.** ⚠ **이름을 입력하고 Esc 를 누르면 latch 에 걸린다** — MOTION-01 재현은 **pristine 상태**(입력 없이 Esc)로 해야 exit 를 끝까지 관찰할 수 있다 | **종속** |
| MOTION-02 | MOTION | 상속 | **충족 — PR #26 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** Toast 표면이 4건 실재한다(발급 성공 · 폐기 성공 · 복사 성공 · 복사 실패). exit 애니메이션이 실재한다: `.tds-toast--exiting` `Toast.css:32-37`(`tds-toast-out … forwards` + `pointer-events: none`) → `@keyframes tds-toast-out :121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`). enter `:26-27`/`:109-119`. **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`). reduced-motion 게이트 `Toast.css:136-141`. ✔ **Toast 는 Modal 과 같은 latch 모양이나 버그가 아니다** — `exitingRef` 도 리셋되지 않지만 `onDismiss(id)` 를 ToastProvider 큐의 `filter` 가 소유하고 **veto 경로가 없어 항상 언마운트된다.** Modal 은 이 화면의 `requestClose` 가 거부할 수 있어서만 깨진다(§2 FEEDBACK-06) | 발급 성공 → 토스트 자동소멸 관찰. **opacity fade + 아래로 translate 후 사라지면 pass** | **pass** |
| MOTION-03 | MOTION | 상속 | **충족 — PR #26 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** reduced-motion 게이트가 걸려야 할 이 화면의 표면: DS `Checkbox` · `Button` · `Modal` ×4 · 스켈레톤 펄스 · Toast. **`ToggleSwitch` 는 이 화면에 없다**(사이트·OAuth 화면에만 있다) — 요구가 명시 지목하는 그 컴포넌트의 게이트는 이번 기준에서 신설됐고(`ToggleSwitch.css:79-84`) NFR-067 §2 · NFR-070 §2 가 그 해소를 기록한다. **이 화면의 표면은 전부 게이트를 갖는다**: **Modal** `Modal.css:173-180`(`.tds-modal__backdrop, .tds-modal__dialog, .tds-modal__overlay--closing .tds-modal__backdrop, .tds-modal__overlay--closing .tds-modal__dialog { animation: none; }` — **`--closing` 조합자를 명시 나열해** enter 뿐 아니라 exit 도 끈다) · **Toast** `Toast.css:136-141` · **스켈레톤** `shared/ui/ui.css:110-114`. 설계가 단일 게이트다 — **CSS 가 유일 판정자이고 JS 는 결과를 읽기만 한다**(`willAnimate()` — `Modal.tsx:45-55` 주석). ⚠ **그 단일 게이트가 latch 의 두 번째 경로를 만든다** — reduced-motion 에서는 `willAnimate()` 가 false 라 `onClose()` 가 동기 발사되고(`Modal.tsx:129-132`) 같은 veto 를 만난다(§2 FEEDBACK-06). **모션 축은 충족이나 그 구현이 다른 축의 결함을 노출한다** | OS reduced-motion 으로 두고 모달 4종을 **입력 없이** 열고 닫는다. `grep -rn "prefers-reduced-motion" packages/ui/src/organisms/Modal/Modal.css` → **`:173` 히트** | **pass** |
| IA-01 | IA | 직접 | **충족.** 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:339` `{ path: '/settings/api-keys', element: <ApiKeysPage />, implemented: true }`). **자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={pageStyle}>`(`:220`, `flexDirection: column` + gap 뿐). 조회 실패 early return 도 같은 골격(`:188`). `App.tsx:335-336` 주석이 구조를 밝힌다 | `/settings/api-keys` 진입 시 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족.** `/settings/api-keys` 는 **nav 잎**이다(`nav-config.ts:229` `['API Key 관리', '/settings/api-keys']`) — 하위 라우트가 없다(상세 화면이 없다 — 보여줄 것이 없기 때문). `findCoveringLeaf('/settings/api-keys')`(`nav-config.ts:270-278`)가 **자기 자신을 정확히 찾고** `findNavLabel`(`:297-299`)이 `'API Key 관리'` 를 반환한다. AppHeader 가 `<h1>` 으로 렌더(`AppHeader.tsx:101`). **이 화면은 in-content `<h1>` 을 그리지 않는다** — grep **0건**. 따라서 **`<h1>` 이 정확히 1개이고 title 메커니즘이 단일하다.** GROUND-TRUTH §7 의 gap 두 갈래(가지 라벨 폴백 · h1 이중)가 **여기엔 둘 다 없다.** 'sub-route 가 구체 title' 절은 하위 라우트가 없어 발생하지 않는다. **Modal `title` 은 dialog 이름이지 페이지 title 이 아니다** | `/settings/api-keys` 진입. **AppHeader 의 가시 `<h1>` 이 'API Key 관리'이고 `document.querySelectorAll('h1').length === 1` 이면 pass** | **pass** |
| IA-04 | IA | 직접 | **충족 — 이 섹션에서 유일하게 list 템플릿이 실재한다.** ① **우상단 primary action** — `CardTitle action={issueButton}`(`ApiKeysCard.tsx:64`)에 `Button variant="primary"` '새 키 발급'(`ApiKeysPage.tsx:206-217`). **`canCreate` 없으면 `null`**(EXC-03) ② **결과 count** — `<p>전체 {keys?.length ?? 0}건</p>`(`ApiKeysCard.tsx:87`), 표 아래 ③ **table** — `ApiKeyTable`(`:81-86`) ④ **SelectionBar** — 정당한 N/A(일괄 작업 없음. 폐기는 행 단위 확인이 필요한 비가역 액션이라 일괄이 부적절하다) ⑤ **Pagination** — **없다. 그러나 '초과 가능'이 확정되지 않아 gap 으로 보지 않는다**: 요구 문구가 '**초과가능 시** Pagination' 이며, BE-069 §7.8 이 근거를 댄다 — '문의는 고객이 만들어 통제 불가하게 쌓이지만(BE-026 §7.9) **API Key 는 운영자가 만든다** — 조직당 수~수십 건이 현실적 상한이고, 그것을 넘으면 그 자체가 운영 문제(정리 대상)다'. `lastUsedAt === null` 을 warning 색으로 드러내는 것(`ApiKeyTable.tsx:107-109`)이 바로 그 정리를 돕는 장치다. **키 수가 실제로 늘면 이 판정을 다시 매긴다**(§5 #12 — 조건부 이관) | `/settings/api-keys` 진입. **우상단 '새 키 발급' + '전체 N건' + 표가 있으면 list 템플릿 pass.** 픽스처를 100건으로 늘렸을 때 실사용에 문제가 생기면 Pagination 을 gap 으로 재판정 | **pass(조건부)** |
| IA-05 | IA | N/A | **표면이 없다.** **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다.** `/settings/api-keys` 단일 라우트이며 `/new`·`/:id/edit` 가 없다. **create 는 라우트가 아니라 modal 이고**(`CreateApiKeyModal`) **edit 은 아예 없다**(키 수정 경로가 없다 — FS-069 §1 범위 밖. 상태가 `active`/`revoked` 2개뿐이라 고칠 것이 없다). '`new` 와 `:id/edit` 가 동일 폼 컴포넌트' 라는 요구가 걸릴 라우트 쌍 자체가 없다 | 폼 라우트 쌍이 생기면 다시 매긴다 | **n-a** |
| IA-13 | IA | N/A | **표면이 없다.** **URL 에 직렬화할 list state 가 없다** — 목록 화면이지만 필터·검색·정렬·페이지가 하나도 없다(§2 COMP-10 · STATE-04). `grep -rn "useListState\|useSearchParams" pages/settings/` → **0건**. 'Back/복사링크가 필터 view 복원' 이 걸릴 상태가 존재하지 않는다. **모달 open 상태를 URL 에 넣지 않는 것도 옳다** — 발급 모달을 URL 로 공유하면 안 되고(입력이 없는 채 열린다), **노출 모달은 URL 로 복원 자체가 불가능하다**(평문이 지역 state 라 — BE-069 §7.1) | 필터·검색이 도입되면 다시 매긴다 | **n-a** |
| EXC-01 | EXC | 상속 | 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:18,484` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 **소비자**다. `AppShell.tsx:478` 이 경계의 자리를 밝힌다. 루트 경계도 별도로 있다(`App.tsx:368`). ⚠ **모달이 열린 채 화면이 throw 하면 평문이 사라진다** — 복구 화면이 뜨고 지역 state 가 날아간다(§4.3) | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 두 경로를 상속한다: ① **진입 가드** — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 `Navigate` ② **세션 중 401** — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·발급·폐기 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. ⚠ **노출 모달이 떠 있는 중 401 이면 평문이 영영 사라진다**(§4.3 · §5 #10) | auth/session 소유 문서 판정에 종속. `?status=load:401` 로 `/login?returnUrl=%2Fsettings%2Fapi-keys&reason=session_expired` 로 가는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **충족 — 이 배치에서 해소됐고, 이 화면은 권한 축이 둘이다.** 기존 문서 배치가 '`useRouteWritePermissions` 소비자 **앱 전체 0건**'으로 gap 판정했으나 **이 화면은 그 소비자다.** ① **read 게이팅(상속)** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:20`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더. 리소스는 라우트 파생(`route-resource.ts:32-35` → `page:/settings/api-keys`) ② **write 게이팅(직접) — 두 갈래** — `ApiKeysPage.tsx:59` `const { canCreate, canRemove } = useRouteWritePermissions()`. **이 섹션에서 유일하게 `canUpdate` 가 아니다**(수정 경로가 없다). **`canCreate`** → 발급 버튼이 `null`(`:206-217`) — 카드 우상단과 `Empty` CTA **양쪽에서 사라진다**(같은 노드를 재사용 — `ApiKeysCard.tsx:64,77`). **`canRemove`** → **폐기 열 자체가 사라진다**(`ApiKeyTable.tsx:78-82,118-135` — `<th>`/`<td>` 를 조건부 렌더해 빈 열을 남기지 않는다). **버튼을 disabled 로 두지 않고 렌더 자체를 하지 않는다** ③ **강등 reconcile** — `useRouteCan` 이 `usePermissions()` 를 구독하므로 권한 스토어가 바뀌면 재렌더돼 **버튼·열이 그냥 사라진다**(`RequirePermission.tsx:23-25` 가 설계로 선언). ⚠ **읽기 전용 안내가 `!canCreate && !canRemove` 일 때만 뜬다**(`:230`) — **권한이 하나만 없으면 안내가 없다**(FS-069 §7 #5 · §5 #6). 게이팅 자체는 정확하나 **설명이 빠진다** | 권한 스토어에서 `page:/settings/api-keys` 의 `create` 를 끄고 진입 → **발급 버튼이 카드·Empty 양쪽에서 사라지면 pass.** `remove` 를 끄면 → **'관리' 열 자체가 사라지면 pass.** 둘 다 끄면 info 배너. **하나만 끄면 배너가 없음을 확인**(§5 #6). `read` 를 끄면 403 화면 | **pass** |
| EXC-04 | EXC | 직접 | **미충족 — 이 화면만 동시성 토큰이 없다.** ① **409/412 conflict dialog 가 없다** — 이 화면은 **`createRevisionedStore` 를 쓰지 않는다**(목록이라 단일 문서가 아니다 — `data-source.ts:63` `let keys: readonly ApiKey[]`). 형제 3화면이 `revision` 토큰으로 409 를 내고 `ConflictDialog` 를 세우는 것(`_shared/store.ts:124-126`)과 달리 **이 화면엔 토큰도 충돌 다이얼로그도 없다.** ② **⚠ 유령 폐기가 실재한다** — `revokeApiKey`(`data-source.ts:152-154`)가 `keys.map(...)` 이라 **없는 id 를 조용히 지나치고 아무것도 바꾸지 않은 채 성공을 반환**한다. 그러면 `:162` 가 '‘X’ 키를 폐기했습니다.' 토스트를 띄운다 — **운영자는 폐기됐다고 믿는다.** 공용 `createStoreAdapter` 는 이 함정을 이미 막아 뒀는데(`shared/crud/crud.ts:219-221` — 없는 id → `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`) **이 화면은 그 팩토리를 쓰지 않아 가드를 상속하지 못했다.** GROUND-TRUTH §4 의 `updateTicket` 유령 저장과 같은 형태다 ③ **⚠ 감사 기록 훼손** — `revokedAt: new Date().toISOString()` 이 **조건 없이** 실행돼 **이미 폐기된 키를 다시 폐기하면 최초 폐기 시각이 덮인다.** UI 가 폐기된 키의 버튼을 숨겨(`ApiKeyTable.tsx:121`) 정상 경로를 막지만 **어댑터에 가드가 없다** — 두 관리자가 동시에 폐기하면 두 번째가 시각을 덮는다. '이 키가 언제까지 살아 있었나'가 이 레코드의 존재 이유인데(`data-source.ts:143-145`) 바로 그 값이 훼손된다 ④ **입력 보존은 충족** — 발급 실패 시 모달이 유지돼 입력이 산다(`:121-122`) | `?status=revoke:409` 로 폐기 → **conflict 다이얼로그 없이 generic 배너만 뜨면 ①은 gap.** **유령 폐기 재현**: 픽스처에서 `revokeApiKey('없는-id')` 를 호출하면 **`keys.map` 이 no-op 하고 `resolve()` 함**을 코드로 확인(정상 UI 로는 도달 불가). **감사 훼손 재현**: `revokeApiKey(id)` 를 같은 id 로 2회 호출 → `revokedAt` 이 바뀌면 gap | **gap** |
| EXC-08 | EXC | 직접 | **충족 — 이번 기준에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** ① **`submitLockRef` + disable — 충족.** `useSubmitLock()`(`_shared/queries.ts:58-75`)을 **두 개** 쓴다(`:64-65` `createLock`·`revokeLock` — 발급과 폐기가 서로를 막지 않게). `submitCreate` 첫머리에서 `if (!createLock.acquire()) return`(`:101` '두 번 발급되지 않는다'), `confirmRevoke` 도 같다(`:149`). 성공·실패 양쪽에서 `release`. 버튼도 `disabled={busy}`(`CreateApiKeyModal.tsx:191`). `queries.ts:54-55` 가 왜 disabled 만으로 부족한지 밝힌다 ② **'retry 가 동일 Idempotency-Key' — 이번 기준에서 충족됐다**(`712c30b` `fix(admin): 인증 템플릿 삭제를 막고 API Key 발급에 멱등키를 붙인다`). **이전 배치가 적은 유령 키 경로가 막혔다.** 배선을 전수 확인했다: **㉮ 키를 만드는 곳이 호출부다** — `ApiKeysPage.tsx:96` `const idempotencyKeyRef = useRef<string | null>(null)` → `:122` `const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID()` · `:123` 로 고정. **㉯ 성공해야 버린다** — `onSuccess` `:130` `idempotencyKeyRef.current = null` ('이 발급은 끝났다 — 다음 발급은 새 거래다'). **실패에는 남겨 둔다** — 그래서 **재클릭이 새 발급이 아니라 같은 발급이 된다**(`:121` 이 그렇게 적는다). 모달을 접으면 리셋(`:156`). 근거 주석 `:88-95` 가 유령 키 시나리오를 그대로 기술하고 `members/components/PointsCard` 선례를 인용한다. **㉰ 뮤테이션이 키를 실어 나른다** — `queries.ts:30` `readonly idempotencyKey: string` · `:37-38` `mutationFn`. `:25-29` 가 '`mutationFn` 안에서 만들면 재시도마다 새 키가 나와 보호가 사라진다'를 못박는다. **㉱ 어댑터가 최초 응답을 재생한다** — `data-source.ts:91` `const issuedByKey = new Map<string, ApiKeyIssued>()` · `:116-117` `const replayed = issuedByKey.get(idempotencyKey); if (replayed !== undefined) return replayed;` · **기록은 성공한 뒤에만** `:139`(`:88-89` 이 이유를 밝힌다 — '미리 기록하면 실패한 첫 시도가 키를 태워 재시도가 영원히 no-op 이 된다'. `failIfRequested` 가 `:113` 에서 먼저 throw 한다). **㉲ Set 이 아니라 Map 인 이유가 코드에 있다**(`:83-86`): 공용 `crud.ts` 의 멱등 원장은 '이미 했다'만 기억하면 되지만(create 가 `void` 라 재생할 응답이 없다) **발급은 평문이 최초 응답에만 존재하므로 응답 자체를 들고 있다가 그대로 돌려줘야 한다** — 재시도에 새 평문을 지어 주면 운영자가 쥔 평문과 저장된 키가 어긋난다. **㉳ 서버 계약도 심에 있다** — `:104-105` `헤더: Idempotency-Key: <idempotencyKey> (UUID v4, 24h 보존) → 같은 키 + 같은 바디 = 최초 응답을 그대로 재생한다(유령 키 없음). 다른 바디면 409`. **회귀 테스트 3건**(`api-keys.test.ts:90` describe `createApiKey — 같은 시도의 재요청은 키를 두 번 만들지 않는다`): `:91` `같은 멱등키의 재요청은 최초 응답을 그대로 재생한다` · `:103` `재요청이 목록에 유령 키를 남기지 않는다` · `:114` `다른 시도(다른 멱등키)는 정상적으로 새 키를 만든다 — 전부 막으면 그건 고침이 아니다`. ⚠ **잔여**: 재생은 **브라우저 안 `Map` 이라 새로고침하면 사라진다**(픽스처 한정 — 서버가 24h 보존을 맡는다). **`revokeApiKey` 에는 멱등키가 없으나**(`data-source.ts:148`) 폐기는 멱등한 상태 전이라 이 요구의 위험이 다르다 — 잔여 결함은 EXC-04 의 감사 시각 훼손이다 | 발급 확인 버튼을 최대한 빠르게 2회 클릭 → **요청이 1건이면 ①은 pass.** `grep -rni "idempotency" pages/settings/api-keys/` → **히트 15건이면 ②는 pass**(`ApiKeysPage.tsx`·`queries.ts`·`data-source.ts`). **유령 키 재현(이제 막힌다)**: `?fail=create` 로 발급 실패 → 같은 모달에서 재클릭 → **`idempotencyKeyRef` 가 유지돼 같은 키가 실린다.** `api-keys.test.ts:90-124` 3건 통과로도 판정 | **pass** |
| EXC-09 | EXC | 직접 | **충족.** 네 지점이 **두 뮤테이션 각각에** 배선돼 있다. ① **onError** — 발급 `if (isAbort(cause) \|\| controller.signal.aborted) return;`(`:120`) · 폐기 `:166`. abort 를 실패로 처리하지 않는다(배너·토스트 없음). 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다 ② **onSuccess** — 발급 `if (controller.signal.aborted) return;`(`:112`) · 폐기 `:160`. 취소된 요청의 성공 콜백이 토스트·모달 전환을 일으키지 않는다 — **발급에서 특히 중요하다**: aborted 인데 `setIssued(result)` 를 하면 **사용자가 버린 요청의 평문이 뜬다** ③ **mutation.reset** — `closeCreate`(`:133` `create.reset()`) · `cancelRevoke`(`:177` `revoke.reset()`) ④ **unmount** — `useEffect` cleanup 이 **두 컨트롤러를 모두** abort(`:83-89`). bulk 표면이 없어 '실패 count 제외' 절은 무관. ⚠ **abort 가 서버 도달을 막지는 않는다** — 발급에서는 이것이 EXC-08 과 같은 뿌리다(abort 된 발급이 서버에 도달했으면 유령 키가 생긴다 — FS-069 §7 #19) | 발급 중(400ms 창) 모달을 Esc 로 닫는다 → **error toast·배너가 뜨지 않고 노출 모달도 뜨지 않아야 pass.** 폐기 중 '취소' → 같은 확인. 발급 중 사이드바 링크로 이탈 → 같은 확인 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-02 · A11Y-11 · **MOTION-02** · **MOTION-03** · IA-01 · IA-02 · **IA-04** · EXC-03 · **EXC-08** · EXC-09 |
| `종속` | **9** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · **MOTION-01** · EXC-01 · EXC-02 |
| `n-a` | **6** | STATE-04 · COMP-10 · **FEEDBACK-04** · A11Y-12 · IA-05 · IA-13 |
| `gap` | **2** | **FEEDBACK-06** · **EXC-04** |
| **합계** | **30** | 13 + 9 + 6 + 2 = **30** ✓ |

**검산 (P0 30건 전수 · 지정 순서대로 나열해 셈)**

| # | 요구 ID | 판정 | # | 요구 ID | 판정 |
|---|---|---|---|---|---|
| 1 | STATE-01 | pass | 16 | MOTION-01 | 종속 |
| 2 | STATE-02 | pass | 17 | MOTION-02 | pass |
| 3 | STATE-04 | n-a | 18 | MOTION-03 | pass |
| 4 | TOKEN-01 | pass | 19 | IA-01 | pass |
| 5 | TOKEN-02 | 종속 | 20 | IA-02 | pass |
| 6 | TOKEN-03 | 종속 | 21 | **IA-04** | **pass(조건부)** |
| 7 | TOKEN-04 | 종속 | 22 | IA-05 | n-a |
| 8 | TOKEN-05 | 종속 | 23 | IA-13 | n-a |
| 9 | COMP-10 | n-a | 24 | EXC-01 | 종속 |
| 10 | FEEDBACK-02 | pass | 25 | EXC-02 | 종속 |
| 11 | **FEEDBACK-04** | **n-a** | 26 | EXC-03 | pass |
| 12 | **FEEDBACK-06** | **gap** | 27 | **EXC-04** | **gap** |
| 13 | A11Y-01 | 종속 | 28 | **EXC-08** | **pass** |
| 14 | A11Y-02 | 종속 | 29 | EXC-09 | pass |
| 15 | A11Y-11 | pass | 30 | A11Y-12 | n-a |

> 30행 전수 · `pass` **13**(STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-02 · A11Y-11 · MOTION-02 · MOTION-03 · IA-01 · IA-02 · IA-04 · EXC-03 · EXC-08 · EXC-09) + `종속` **9**(TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · EXC-01 · EXC-02) + `n-a` **6**(STATE-04 · COMP-10 · FEEDBACK-04 · A11Y-12 · IA-05 · IA-13) + `gap` **2**(FEEDBACK-06 · EXC-04) = **30** ✓

> **P0 gap 2건 — 이번 기준(`a5c2639`) 갱신으로 5건에서 줄었으나 구성이 바뀌었다.** 뒤집힌 4건:
> - **EXC-08 `gap` → `pass`(`712c30b`)** — 이전 배치가 '이 화면 최대 위험'으로 적은 유령 키 경로가 막혔다. 발급이 **제출 시도 단위 멱등키**를 실어 나르고(`ApiKeysPage.tsx:96,122-123` → `queries.ts:30,37-38`) 어댑터가 **최초 응답을 재생한다**(`data-source.ts:91,116-117,139`). **평문이 최초 응답에만 존재하므로 Set 이 아니라 Map 으로 응답 자체를 보관한다**(`:83-86`). 회귀 3건(`api-keys.test.ts:90-124`). ✔ **이제 이 축에서 이 화면이 섹션 유일의 pass 다** — 형제 3화면(사이트·언어·OAuth)은 `If-Match` 가 데이터를 지킬 뿐 멱등키가 없어 여전히 gap 이다(NFR-070 §2 EXC-08).
> - **MOTION-02 `gap` → `pass` · MOTION-03 `gap` → `pass`(PR #26)** — Toast exit 애니메이션(`Toast.css:32-37,121-131`)과 Modal reduced-motion 게이트(`Modal.css:173-180`)가 신설됐다. 이전 배치가 든 gap 사유가 **둘 다 코드로 해소됐다.**
> - **MOTION-01 `gap` → `종속`** — 오버레이 모션이 구현됐으나 **CSS-only** 다. 라이브러리 부재를 gap 으로 볼지는 DS 소유 문서의 판정이다.
>
> **⚠ 그리고 1건이 반대로 뒤집혔다 — `FEEDBACK-06` `pass` → `gap`.** **이 화면의 코드는 한 줄도 바뀌지 않았는데 판정이 무너졌다**: PR #26 이 DS `Modal` 에 exit 애니메이션과 함께 **리셋 없는 일방향 latch**(`Modal.tsx:122-126` — `closingRef` 를 세우기만 하고 되돌리는 코드가 없다)를 들여왔고, **이 화면의 4경로 가드가 바로 그 latch 를 발화시키는 veto** 이기 때문이다. **이전 배치가 이 화면의 자랑으로 적은 '4경로가 한 판정을 공유한다' 설계가 결함의 트리거가 됐다** — Modal 은 `onClose()` 를 부모의 언마운트로 전제하는데(`Modal.tsx:19-25`) 이 화면의 `requestClose` 는 dirty 면 그것을 거부한다.
>
> **잔여 P0 gap 2건 — 둘 다 이 화면 고유이고, 최대 위험이 옮겨 갔다**:
> - **FEEDBACK-06 (최우선 · 이관 대상은 DS)** — latch. **대가가 이전의 EXC-08 보다 크다**: 유령 키는 목록에 남아 폐기라도 되지만, **`RevealKeyModal` 이 latch 에 걸리면 평문을 담은 모달이 `opacity:0` 으로 갇혀 사용자가 '키 보기'를 눌렀는데도 키를 영영 못 본다**(§5 #14). 아이러니가 이어진다 — `RevealKeyModal.tsx:8-10` 이 유령 키를 UI 로 막았고 `712c30b` 가 네트워크 경로도 막았는데, **그 UI 자체가 이제 평문을 삼킨다.**
> - **EXC-04** — 동시성 토큰이 없고(이 화면만 `createRevisionedStore` 미사용) **유령 폐기**(`keys.map` no-op 성공)와 **감사 훼손**(`revokedAt` 무조건 덮기)이 실재한다. **이번 기준에서 바뀐 것이 없다.**
>
> **형제 화면과의 차이 (기록)**: **EXC-04 는 화면마다 다시 매겨야 한다.** NFR-067·068·070 은 pass(revision 토큰)이고 **이 화면만 gap** 이다 — 같은 섹션이라도 저장소가 다르기 때문이다. **EXC-08 은 이번 기준에서 방향이 뒤집혔다** — 이 화면만 pass 이고 형제 3화면이 gap 이다. 섹션 단위로 일반화하면 틀린다.
>
> **이 화면이 해소한 앱 전역 gap 1건 (기록)**: **EXC-03** — 기존 문서가 '`useRouteWritePermissions` 소비자 앱 전체 0건'으로 gap 판정했으나 이 화면이 소비자이며, **유일하게 `canCreate`/`canRemove` 두 갈래를 쓴다**(`ApiKeysPage.tsx:59`).
>
> **이 화면에만 표면이 실재하는 요구 2건 (기록)**: **FEEDBACK-06**(폼 modal — 형제 3화면은 폼 modal 이 없어 n-a. **이번 기준에서 pass → gap**) · **IA-04**(list 템플릿 — 형제 3화면은 목록이 아니라 n-a. pass 유지).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(검색·필터·정렬·재정렬·업로드·날짜범위·금액·CSV)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 재조회 중 이전 행이 유지된다 — `loading = isFetching && keys === undefined`(`:93`)라 스켈레톤이 덮지 않는다. **형제 3화면과 달리 `reset` 문제가 없다** — 폼이 라우트에 없어 `useEffect([data, reset])` 자체가 없다 | 발급 성공으로 invalidate → 이전 행이 유지되는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 **DS `Empty`** 를 쓴다(`ApiKeysCard.tsx:77` `label="API Key" createVerb="발급" action={issueButton}`) — 3분기 copy + 복구 액션 계약을 상속한다. **검색·필터가 없어 3분기가 불필요**하며 코드가 그 판단을 밝힌다(`:76` '검색도 필터도 없는 화면이라 생성 CTA 하나만 준다'). **형제 3화면은 단일 문서라 이 요구가 n-a** — 이 화면만 `Empty` 를 쓴다 | 0건 픽스처 → '발급된 API Key가 없습니다' + 발급 CTA | **pass** |
| STATE-06 | P1 | 발급·폐기 성공 시 `onSuccess` 가 목록을 정확히 invalidate 한다(`queries.ts:31-34,47-49`) — 자기 변경이 즉시 보인다. **발급 응답의 평문은 캐시에 넣지 않는다**(`queries.ts:6-8`) | 발급 후 목록에 새 행이 나타나는지 | **pass** |
| COMP-01 | P1 | DS `<Button>`·`<Checkbox>`·`<Modal>`·`<ConfirmDialog>`·`<Alert>`·`<Card>`·`<StatusBadge>`·`<Empty>` 를 쓴다. `buttonStyle()`/`tds-ui-btn-*` 손조립 **0건**(grep). `busy` 표현도 DS 계약을 쓴다(`aria-busy` — `CreateApiKeyModal.tsx:192` · `ApiKeyTable.tsx:126`). ⚠ `Checkbox`·`Empty` 를 앱 배럴이 아니라 `@tds/ui` 에서 직접 가져온다(`CreateApiKeyModal.tsx:15` · `ApiKeysCard.tsx:11`) — **의도된 우회**(배럴은 F2 소유) | `grep -n "buttonStyle(\|tds-ui-btn-" pages/settings/api-keys` → 0건 | **pass** |
| COMP-02 | P1 | **순번 컬럼이 없다** — `SeqCell` 이 필요 없다(키는 순번으로 식별하지 않는다). raw checkbox 선택 마크업 0건(선택 자체가 없다) | 순번 노출 표가 아닌지 | **n-a** |
| COMP-05 | P1 | 스코프 체크박스 그룹이 `<fieldset>` + `<legend>` 로 묶여 있다(`CreateApiKeyModal.tsx:234-235`) — `role="group"` + `aria-label` 손조립이 아니라 네이티브 시맨틱. **보이는 라벨을 Checkbox 가 그린다** | 그룹이 `<fieldset>`/`<legend>` 인지 | **pass** |
| COMP-06 | P2 | 스켈레톤 행 수가 상수지만 **근거가 코드에 있다** — `SKELETON_ROWS = 3`(`ApiKeysCard.tsx:34`) + '픽스처 규모에 맞춘다(로딩 모양이 실제 목록과 크게 다르지 않게)'(`:33`). **형제 3화면의 `[0,1,2,3]` 은 근거가 없다** — 이 화면이 낫다. 페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다 | 스켈레톤 행 수에 근거가 있는지 | **pass(경미)** |
| COMP-09 | P2 | 이름 셀에 truncate 가 없다(`ApiKeyTable.tsx:91` `nameCellStyle` — `tdStyle` + 굵기뿐). 긴 이름이 열을 넓힌다. **완화**: `maxLength=40`(`CreateApiKeyModal.tsx:222`)이 상한이라 피해가 제한적이다. 키·스코프·관리 셀은 `nowrap` 으로 보호돼 있다 | 40자 이름 픽스처로 표 폭이 유지되는지 | **gap(경미)** |
| COMP-12 | P1 | 이름 입력이 `FormField counter` 로 `N/40` 실시간 카운터를 갖는다(`CreateApiKeyModal.tsx:214`). `_shared/fields.tsx:34` 가 '길이 제한이 있는 필드는 반드시 준다 (COMP-12)'를 계약으로 못박는다(이 화면은 `TextInputField` 를 쓰지 않고 직접 조립하나 같은 관례를 따른다). **그러나 상한 근접 경고가 없고 `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 증상. 조합형 한글 counting 기준(`value.length` = UTF-16 code unit) 미정의 | 40자 근접 시 경고가 뜨는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패 = 인라인 Alert(`:189`) · write 성공 = toast(`:116,162`) · write 실패 = **모달 안 배너**(`:122,168`). write 실패가 toast 가 아닌 이유를 코드가 밝힌다(`CreateApiKeyModal.tsx:7-8` '**모달 뒤에 뜬 토스트는 보이지 않는다**') — 정확한 판단이다. 클립보드 실패만 toast(`RevealKeyModal.tsx:108`)인데 그것은 모달 **위**에 뜨는 브라우저 API 실패라 결이 다르다 | 강제 실패 발급이 모달 안 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 발급·폐기·복사 전 경로에 가시 결과가 있다. **no-op 클릭이 없다** — 발급 버튼은 검증 실패 시 필드 오류를, 성공 시 노출 모달을 낸다. **복사 실패도 침묵하지 않는다**(`secret.ts:57-60` '실패를 삼키지 않는다(호출부가 성공/실패를 토스트로 알린다) … 조용히 아무 일도 일어나지 않는 경로를 만들지 않는다') | `?fail=create` 로 발급 → 가시 실패가 나오는지. 클립보드 없는 환경에서 복사 → error toast | **pass** |
| FEEDBACK-05 | P1 | **이 섹션에서 가장 잘 지킨다.** 파괴적 액션의 문구가 **결과를 말한다**: 폐기 — '‘{name}’ 키를 폐기하면 이 키를 쓰는 연동이 **즉시 401을 받습니다**. 폐기는 **되돌릴 수 없고**, **같은 키를 다시 발급할 수 없습니다**.'(`:53-55`) · 노출 모달 닫기 — '이 창을 닫으면 키를 **다시 볼 수 없고**, 필요하면 **새로 발급해야 합니다**.'(`RevealKeyModal.tsx:80-81`). **라벨도 결과를 말한다** — `confirmLabel="복사하지 않고 닫기"` · `cancelLabel="키 보기"`(`:169-170` '결과를 말하는 라벨 — 이 버튼이 무엇을 잃게 하는지 버튼 스스로 밝힌다') | 확인 문구·라벨이 결과를 명시하는지 | **pass** |
| A11Y-04 | P1 | 발급 중 포커스가 잠긴 버튼에 남지 않게 한다 — `useEffect(() => { if (!busy) nameRef.current?.focus(); }, [busy])`(`CreateApiKeyModal.tsx:171-173`, 코드가 'A11Y-04 취지'를 명시). ⚠ **실패 직후에도 포커스가 이름으로 간다** — `busy: true → false` 전이가 성공·실패를 구분하지 않아 **실패 배너를 읽기 전에 포커스가 움직인다**(FS-069 §7 #16) | 발급 실패 후 activeElement 와 배너 announce 순서 | **gap(경미)** |
| A11Y-08 | P1 | **행 클릭 이동이 없다**(상세 화면이 없다) — 요구의 'whole-row 클릭 + 키보드 등가물' 이 걸리지 않는다. 행의 유일한 인터랙션은 폐기 버튼이며 Tab 으로 도달 가능하다 | 행에 클릭 이동이 있는지 | **n-a** |
| A11Y-13 | P1 | **폼 진입 시 첫 필드 자동 포커스가 있다** — `initialFocusRef={nameRef}`(`CreateApiKeyModal.tsx:181`, 코드가 'A11Y-13' 을 명시 `:10`). **형제 3화면은 이것이 없다** — 이 화면만 pass. **검증 실패 시 첫 오류 포커스도 부분 충족**: 중복 이름은 `nameRef.current?.focus()`(`:152`)로 명시 이동한다. ⚠ **zod 검증 실패(빈 이름·스코프 0건)에는 `onInvalid` 가 없어** 포커스가 발급 버튼에 남는다 — 절반만 충족 | 모달 열기 → activeElement 가 이름 입력인지(pass). 스코프를 모두 끄고 발급 → activeElement 가 체크박스인지(gap) | **gap(부분)** |
| A11Y-15 | P1 | **코드가 이 요구를 명시적으로 지킨다** — 노출 모달의 '완료' 버튼을 '닫기'라 부르지 않는다(`RevealKeyModal.tsx:132-133` '헤더의 ×(aria-label=닫기)와 접근 가능한 이름이 겹쳐 스크린리더에서 같은 이름의 버튼이 둘이 된다 (A11Y-15)'). 폐기 확인·discard 확인의 라벨도 서로 구분된다 | 다이얼로그 내 같은 접근 이름의 버튼이 둘 이상인지 | **pass** |
| A11Y-16 | P1 | **부분.** 상태의 비색상 인코딩은 대체로 지켜진다: 상태 배지가 tone + **라벨**('활성'/'폐기됨' — `ApiKeyTable.tsx:100-103`) · 미사용 키가 warning 색 + **문구**('한 번도 사용되지 않음' — `:108`)라 **색이 유일한 인코딩이 아니다.** 체크박스는 네이티브 `checked`. ⚠ **스코프 그룹 오류(`CreateApiKeyModal.tsx:252-256`)가 `<p role="alert">` 에 id 가 없어 어떤 컨트롤과도 `aria-describedby` 로 연결되지 않는다** — announce 는 되나 필드 연결이 끊겨 있다. `<fieldset>` 에 `aria-describedby` 를 물리는 것이 옳다. ⚠ **폐기 버튼의 접근 이름이 전부 '폐기'로 같다**(`ApiKeyTable.tsx:132`) — 행이 여럿이면 **어느 키의 버튼인지 알 수 없다**. `aria-label={'<이름> 폐기'}` 가 필요하다 | 스코프 오류가 fieldset 과 연결되는지. 폐기 버튼의 접근 이름이 키를 구분하는지 | **gap** |
| ERP-01 | P1 | 스코프·상태의 라벨·tone 매핑이 **단일 레지스트리**다 — `API_KEY_SCOPE_META`(`types.ts:27-30`) + `scopeLabel`(`:32-34`). per-page helper 를 만들지 않았고 표·모달이 같은 함수를 소비한다(`ApiKeyTable.tsx:96` · `CreateApiKeyModal.tsx:237`). `scopeLabel` 은 못 찾으면 코드를 그대로 돌려준다(폴백 존재). 상태 tone 은 삼항 1곳(`ApiKeyTable.tsx:101`) — 값이 2개뿐이라 레지스트리가 과하다 | 모든 스코프가 정의된 라벨로 해석되는지 | **pass** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 시각이 `shared/format`(`formatRelativeOrDate`)·`_shared/diff`(`formatDateOnly` → `formatDate`)를 경유한다. **인라인 포맷 0건**. 보관 지침(`RevealKeyModal.tsx:154-157`)·폐기 경고(`:53-55`)가 결과를 구체적으로 말한다 | 인라인 `toString()`/`toLocaleDateString` 이 0건인지 | **pass** |
| ERP-08 | P2 | 시각이 `formatRelativeOrDate`(`ApiKeyTable.tsx:110`) · `formatDateOnly`(`:115` → `diff.ts:50-54`, `Number.isNaN` 가드 있음)를 경유한다. ⚠ **건수가 raw `length`** 다(`ApiKeysCard.tsx:87` `전체 {keys?.length ?? 0}건`) — `formatNumber` 미경유라 천 단위 구분이 없다. 현재 규모(수~수십)에선 무해하나 **형제 화면·다른 목록 화면은 `formatNumber` 를 쓴다** — 일관성 이탈 | 셀·요약의 raw numeric toString 이 0건인지 | **gap(경미)** |
| ERP-13 | P1 | **이 화면의 사용자 대상 문자열에 리터럴 조사 폴백이 0건이다** — `grep -rn "을(를)\|이(가)\|은(는)\|(으)로" pages/settings/` 히트 2건은 **둘 다 `_shared/validation.ts:4-5` 의 주석**이고 렌더되지 않는다. **이 화면은 보간 문구가 있는데도 지킨다**: '‘{key.name}’ 키를 폐기하면…'(`:54`)·'‘{keyName}’ 키가 발급되었습니다'(`RevealKeyModal.tsx:146`)·'‘{target.name}’ 키를 폐기했습니다'(`:162`) — **전부 조사 앞에 '키' 라는 고정 명사를 두어** 보간 값이 조사와 접하지 않게 했다. 영리한 회피다. **빈 상태는 DS `Empty` 가 런타임 조사 판정을 한다**(`Empty.tsx:7,68` `subjectParticle` — `label='API Key'` 의 받침을 보고 '이/가' 를 고른다) — `Empty.tsx:7` 이 '@tds/ui 는 앱 shared/format 을 …' 로 그 사정을 밝힌다 | 사용자 대상 문자열의 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0 | **pass** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다**(`ApiKeyTable.tsx:87` `keys.map`) — cap·virtualization 이 없다. **그러나 위험이 낮다**: 키는 운영자가 만들어 조직당 수~수십 건이 현실적 상한이다(BE-069 §7.8). **BE-026(문의)과 다른 결론**이며 그 근거가 계약에 적혀 있다. 7컬럼 표에 가로 scroll 컨테이너는 없다 | 100건 픽스처로 scroll 이 매끄러운지 | **pass(조건부)** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 **앱 전역 0건**(grep) — 이 화면도 상한이 없다. ⚠ **발급에서 이것이 EXC-08 과 결합해 위험을 키운다**: 무응답 서버에 발급을 걸면 사용자는 무한정 기다리다 탭을 닫고, **서버엔 유령 키가 남는다** | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap** |
| EXC-06 | P1 | **이 화면이 status 로 분기하지 않는다.** 조회 실패가 401/403/404/500 을 같은 문구로(`:191`), 발급 실패가 403/422/429/500 을 같은 배너로(`:122`), 폐기 실패가 403/404/500 을 같은 배너로(`:168`) 뭉갠다. 근본 원인은 어댑터가 **`HttpError`(status 보유)를 던지지 않는 것** — `failIfRequested` 의 generic Error 뿐이다. **이 화면은 형제 3화면보다 나쁘다**: 그쪽은 최소한 409 가 `SettingsConflictError` 로 갈리는데 **여기는 그것조차 없다**(EXC-04 gap) | `?status=create:422` 와 `?status=create:500` 이 다른 surface 를 그리는지 | **gap** |
| EXC-07 | P1 | 서버 422 의 `error.fields` 를 RHF `setError` 로 필드에 꽂는 경로가 **서버 오류에는 없다** — `useCrudForm` 미사용. **그러나 패턴은 이미 있다**: 로컬 중복 검사가 `setError('name', { type: 'duplicate', … })` + `focus()`(`CreateApiKeyModal.tsx:151-152`)를 정확히 한다. **서버 422(`DUPLICATE_KEY_NAME` — BE-069 §7.5)를 같은 자리에 꽂기만 하면 된다** — 배선 거리가 가장 짧은 화면이다 | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 **앱 전역 0건**(grep) — offline 배너·write 게이팅·복귀 refetch 가 없다. ⚠ **offline 상태에서 발급을 누르면 EXC-08 의 유령 키 경로가 열린다** | offline 토글이 배너를 내는지 | **gap** |
| EXC-12 | P1 | 폐기의 404 를 구분하지 않는다 — **어댑터가 404 를 내지 않는다**(`map` no-op 성공 — EXC-04 gap). 즉 '찾을 수 없음'이 **성공으로 표시된다.** 조회는 단일 컬렉션이라 404 가 없다 | 없는 id 폐기 → 전용 문구가 뜨는지(현재는 성공 토스트) | **gap** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 발급·폐기 모두 비관적(응답 후 invalidate)이다. `onMutate`/`setQueryData` 0건. **평문을 캐시에 넣지 않는 설계와 일관**된다(BE-069 §7.1). 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다** | 이 화면에 `onMutate` 가 0건인지 | **pass** |
| EXC-19 | P1 | 401 감지·리다이렉트는 구현됐으나(`queryClient` + `RequireAuth`) **미저장 입력이 유실된다.** ⚠ **이 화면에서는 더 나쁘다**: **노출 모달이 떠 있는 중 401 이면 평문이 영영 사라진다**(§4.3) | 세션 만료 중 노출 모달 → 평문이 살아남는지 | **gap** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference`(`shared/errors/http-error.ts:68-75`)가 존재하는데 이 화면은 고정 문구(`:122,168,191`)만 쓴다. raw stack 노출은 없다(그 절은 충족). ⚠ **발급 500 에서 특히 아깝다** — 유령 키가 생겼는지 조사하려면 traceId 가 필요하다 | 강제 500 이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 300ms (BE-069 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 보이게 하려고 넣은 인위적 `wait()`(`data-source.ts:75,93,123`). 실제 네트워크 0건 |
| 발급 응답 p95 | ≤ 700ms | 위와 동일. **서버가 CSPRNG + 해시(bcrypt/argon2) 를 돌리므로 다른 쓰기보다 느릴 수 있다** — 해시 코스트 파라미터가 이 예산의 입력이다(BE-069 §7.1.2) |
| 폐기 응답 p95 | ≤ 400ms | 위와 동일. **키 검증 캐시의 동기 무효화가 포함돼야 한다**(BE-069 §7.6 — '즉시 401' 약속) |
| 첫 렌더 | ≤ 1.0s (LCP) | 미측정. 키 수에 선형 비례하나 **상한이 현실적으로 낮다**(수~수십 — BE-069 §7.8) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입 0회. 창 포커스 재조회 0회. **발급·폐기 성공마다 1회 추가**(invalidate) | 전역 `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시하고 **이 화면이 재정의하지 않는다**(`queries.ts:15-20`) — **충족** |
| 발급 요청 크기 | ≤ 1KB | **충족** — `{ name(≤40자), scopes(≤2) }` 뿐이다 |
| **발급 응답 크기** | ≤ 1KB | **충족** — `{ key, plaintext }`. ⚠ **이 응답만 로깅 금지 대상**이다(BE-069 §7.1.2 #3) |
| 메모리 | 목록 전량 + **평문 1건(모달 수명)** | 전량 보유. **평문은 모달이 닫히면 GC 대상**이 된다(지역 state — `ApiKeysPage.tsx:75`). ⚠ **JS 문자열이라 즉시 메모리에서 지워진다는 보장은 없다** — 힙 덤프에 남을 수 있다. 회피 불가(§4.3) |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS·zod/mini). 컴포넌트 4개 + 모달 3종으로 이 섹션에서 가장 크다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`:186-204`). early return 이라 안내문까지 사라진다(FS-069-EL-013) |
| 발급 실패(5xx) | 모달 유지 + 입력 보존 + 재시도 + reference code | **부분 충족** — 모달 유지·입력 보존·재시도는 되나 **reference 없음**(EXC-20 gap) |
| 폐기 실패(5xx) | 다이얼로그 유지 + 재시도 | **충족**(FEEDBACK-02 pass) |
| 발급 중 이탈 | abort · 실패 통지 없음 | **충족.** 클라이언트가 정확하고(EXC-09 pass) ⚠ **abort 된 발급이 서버에 도달했더라도** 이번 기준부터 **`idempotencyKeyRef` 가 실패 경로에서 유지돼**(`ApiKeysPage.tsx:121-123`) 재클릭이 같은 발급으로 이어진다 — 유령 키가 생기지 않는다(EXC-08 pass) |
| **발급 응답 유실 후 재시도** | 중복 발급 없음 | **충족 — 이번 기준에서 해소됐다**(`712c30b`). 같은 멱등키의 재요청이 **최초 응답을 그대로 재생한다**(`data-source.ts:116-117`) — 두 번째 키가 만들어지지 않고 **운영자가 쥔 평문과 저장된 키가 어긋나지 않는다**(`:83-86`). 회귀 3건(`api-keys.test.ts:90-124`). ⚠ **재생 원장이 브라우저 안 `Map` 이라 새로고침하면 사라진다** — 픽스처 한정이며 서버가 24h 보존을 맡는다(심 `data-source.ts:104-105` · BE-069 §7.3) |
| **없는 키 폐기** | 404 로 알린다 | **미충족 — 성공으로 표시된다**(`keys.map` no-op — EXC-04 · BE-069 §7.6) |
| **이미 폐기된 키 재폐기** | 최초 폐기 시각 유지 | **미충족 — `revokedAt` 이 덮인다.** 감사 훼손(EXC-04 · BE-069 §7.6) |
| 동시 발급(같은 이름) | 서버가 하나만 받는다 | **미정 — 프론트 검사는 무력하다.** `existingNames` 가 조회 시점 스냅샷이라 둘 다 통과한다(FS-069 §7 #9). 서버가 막아야 한다(BE-069 §7.5) |
| 세션 만료 중 발급 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 모달 입력을 버린다(EXC-19) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11, 앱 전역). ✔ **유령 키 경로는 멱등키가 막았다**(EXC-08 pass) — 남는 것은 '왜 안 되는지 모른 채 누른다' 는 UX 다 |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05, 앱 전역). ✔ **재시도가 안전해졌다** — 상한이 없어 사용자가 언제 재시도해도 되는지 모르는 것은 그대로이나, 재시도 자체는 같은 멱등키로 간다(EXC-08 pass) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`. ⚠ **노출 모달이 열린 채 throw 하면 평문이 사라진다** |
| 클립보드 부재 | 조용히 실패하지 않는다 | **충족** — `copyToClipboard` 가 `false` 를 돌려주고 화면이 error 토스트로 '직접 선택해 복사해 주세요' 를 안내한다(`secret.ts:57-60` · `RevealKeyModal.tsx:107-108`). **평문이 선택 가능한 `<code>` 라 수동 복사가 실제로 가능하다**(`:150-151`) |

### 4.3 시크릿 안전성 — 이 화면의 중심

quality-bar 는 이 축을 다루지 않는다. **BE-069 §7.1 이 계약을 정하고, 여기서는 프론트 관측 가능한 상태를 판정한다.**

| 요구 | 현재 상태 |
|---|---|
| **평문이 모델에 없다** | **충족.** `ApiKey` 에 평문 필드가 존재하지 않는다(`types.ts:3-13`). '그릴 수 있는 값을 갖지 않는 것이 방어다' — **재노출이 구현 실수로도 불가능**하다. 테스트가 고정(`api-keys.test.ts:14-23`) |
| **평문이 캐시에 없다** | **충족.** `useCreateApiKey.onSuccess` 가 목록만 invalidate 한다(`queries.ts:39-42`). `queries.ts:6-8` 이 근거를 밝힌다: '평문이 react-query 캐시에 들어가면 devtools·다른 화면에서 읽을 수 있고, 그 순간 1회 노출 이 거짓이 된다' |
| **평문이 목록 응답에 없다** | **충족.** 심이 명시(`data-source.ts:72-73`)하고 **테스트가 `JSON.stringify(keys)` 전체를 훑어 확인한다**(`api-keys.test.ts:61` — '이것이 재노출 불가 의 증거다') |
| **평문이 전역 상태에 없다** | **충족.** `ApiKeysPage.tsx:75` 지역 state 하나뿐. Zustand·Context 어디에도 없다 |
| **평문의 수명이 모달 수명이다** | **충족.** `dismissIssued` → `setIssued(null)`(`:140-142`). '이 시점 이후 복구 경로는 없다'(`:139`) |
| **평문이 RHF 폼 상태에 없다** | **충족.** 발급 폼은 `name`·`scopes` 만 다룬다. **OAuth 화면과 다른 점**(그쪽은 `secret` 이 폼 필드다 — NFR-070 §4.3) |
| 마스킹에 **역함수가 없다** | **충족.** `maskSecret` 이 `prefix + '••••' + last4` 만 만든다(`secret.ts:32-34`). 테스트가 '같은 last4 의 서로 다른 평문이 같은 마스킹으로 접힌다 — 정보가 사라졌다는 뜻이다'를 단언(`secret.test.ts:24-32`) |
| 마스킹이 **길이를 흘리지 않는다** | **충족.** `MASK_GLYPH = '••••'` **고정 길이**(`secret.ts:20-21` '자리수를 암시하지 않는다(**길이도 정보다**)') |
| 픽스처 키가 **명백한 더미** | **충족.** `sk_test_` 접두어(운영 `sk_live_` 아님) · 평문에 `DUMMY` · last4 `0001` 류. 테스트 3중 고정(`api-keys.test.ts:25-32` · `secret.test.ts:44-55`) |
| **평문이 DOM 에 있다(모달 수명)** | **인정된 트레이드오프.** `<code>{plaintext}</code>`(`RevealKeyModal.tsx:151`) — 스크린샷·화면 공유·devtools 로 읽힌다. **선택 가능해야 클립보드 API 없는 환경에서 복사할 수 있다**(`:150`). 창이 모달 수명으로 제한되고 사용자가 danger 경고로 그 사실을 안다 |
| **평문이 클립보드에 남는다** | **회피 불가.** 복사가 이 화면의 목적이다. 보관 지침으로 완화(`:154-157`) |
| **평문이 힙에 남을 수 있다** | **회피 불가.** JS 문자열은 `null` 대입 후에도 GC 전까지 힙에 있고, 힙 덤프에 남는다. **브라우저에서 해결 불가능한 축** |
| **평문을 못 본 채 잃을 수 있다** | **미충족 — 경로가 셋이고, 이번 기준에서 하나가 막히고 하나가 새로 열렸다.** ① ~~**네트워크**: 응답 유실 → 유령 키~~ → **막혔다**(멱등키 — EXC-08 pass) ② **UI(라우트)**: 노출 모달이 떠 있는 중 **사이드바 링크를 누르면 평문이 사라진다** — 이 모달에 **3경로 이탈 가드가 없다**(`useUnsavedChangesDialog` 미소비). 모달 내부 4경로는 막았는데(EL-008.8) **라우트 이동은 열려 있다**(§5 #10) ③ **⚠ 신규 — Modal latch**: 복사하지 않은 채 Esc/딤/× 로 닫으려 하면 `Modal` 이 latch 되고(`Modal.tsx:122-126`), `requestClose`(`RevealKeyModal.tsx:113-119`)가 `copied === false` 라 `onClose()` 를 거부해 **부모가 언마운트하지 않는다.** 이후 확인 다이얼로그에서 **'키 보기'**(`:176-178`)를 눌러도 **모달은 `opacity:0` + `pointer-events:none` 로 갇혀 있고 latch 때문에 다시 열 수도 없다** — **사용자가 '키를 계속 보겠다'고 명시적으로 선택했는데 평문을 영영 잃는다.** 평문은 지역 state 라 재조회 경로가 없다. **①을 막은 바로 그 배치가 ③을 열었다**(§2 FEEDBACK-06 · §5 #14) |
| 발급 주체가 **위조 불가** | **미충족(픽스처)** — `createdBy: CURRENT_ADMIN` 하드코딩 `'김운영'`(`data-source.ts:22,129`). 서버가 세션에서 찍어야 한다(BE-069 §7.4) — **심이 이미 선언**(`:21`) |
| **키를 눈으로 대조할 수 있다** | **미충족 — mono 토큰 부재.** `0/O`·`1/l` 이 구분되지 않는다. `RevealKeyModal.tsx:44-48` 이 부재를 기록하고 **하드코딩 `monospace` 로 우회하지 않은 이유**(TOKEN-01 위반 + drift 시작)를 밝힌다. `tabular-nums` 로 가능한 만큼만 했다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | MOTION-01 | P0 → **종속** | **~~Motion 라이브러리 미도입~~ — 이 사유는 PR #26 으로 해소됐다.** 오버레이 모션이 구현됐고(`Modal.css:20-21,30-38,58-59` + keyframes `:126-168`) reduced-motion 게이트도 생겼다(`:173-180` — MOTION-03 pass). **라이브러리는 여전히 미도입**이나 'exit 후 unmount' 는 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성했다. **잔여**: footer 버튼 경로는 즉시 언마운트(`Modal.tsx:27-31`) · **중첩 모달 전환**(발급→discard · 노출→닫기확인)은 여전히 표현되지 않는다. **라이브러리 부재/footer 경로를 gap 으로 볼지는 DS 소유 문서가 정한다** | **`packages/ui`(DS)** | **프론트 리팩터 / DS (판정 대기)** |
| 2 | ~~**EXC-08**~~ | ~~P0~~ → **해소** | **`712c30b` 에서 해소됐다 — 이 항목은 기록으로만 남긴다.** 이전 배치가 '이 화면 최대 위험'으로 적고 선례(`members/components/PointsCard`)까지 댄 그 해법이 **그대로 채택됐다**: 호출부가 시도 단위 키를 만들어(`ApiKeysPage.tsx:96,122-123`) 성공해야 버리고(`:130`) 실패에는 남기며(`:121`), 어댑터가 **최초 응답을 재생한다**(`data-source.ts:91,116-117`, 기록은 성공 뒤에만 `:139`). **평문이 최초 응답에만 존재하므로 Set 이 아니라 Map** 이라는 판단(`:83-86`)까지 코드가 논증한다. 회귀 3건(`api-keys.test.ts:90-124`). ⚠ **BE-069 §7.3 은 다시 매겨야 한다** — 그 절이 '멱등 재요청에 409 + 유령 키 노출(평문 재생이 §7.1 과 충돌하므로)' 을 계약으로 정했는데 **구현은 반대로 갔다**(재생을 택했다). 심(`data-source.ts:104-105`)도 '같은 키 + 같은 바디 = 최초 응답을 그대로 재생한다(유령 키 없음). 다른 바디면 409' 로 적는다. **어느 쪽이 정본인지 백엔드 명세 이 정해야 한다** — §5 #20 | 이 화면(해소) + **BE 계약(불일치)** | **해소 — 단 BE-069 §7.3 재검토 필요(백엔드 명세)** |
| 3 | **EXC-04** · EXC-12 | **P0** · P1 | **유령 폐기 + 감사 훼손.** ① `revokeApiKey` 가 `keys.map` 이라 **없는 id 에 성공을 반환**한다(`data-source.ts:152-154`) → 성공 토스트가 거짓말을 한다. `createStoreAdapter` 의 409 가드(`shared/crud/crud.ts:219-221`)를 상속하지 못했다 ② **`revokedAt` 을 조건 없이 덮어** 이미 폐기된 키의 최초 폐기 시각이 훼손된다 — '언제까지 살아 있었나'가 이 레코드의 존재 이유인데(`:143-145`) 바로 그 값이다 ③ **동시성 토큰이 없다**(이 화면만 `createRevisionedStore` 미사용) | 이 화면 + 어댑터 + BE 계약 | **백엔드 명세 (BE-069 §7.6) · UI 기획** |
| 4 | (BE-069 §7.4) | — | **발급 주체·시각이 클라이언트 값이다** — `createdBy: CURRENT_ADMIN`(하드코딩 `'김운영'`) · `createdAt`·`revokedAt` 클라이언트 시각. **누가 이 키를 만들었나가 사고 조사의 첫 질문**인데 기록되지 않는다. **심이 이미 선언**(`data-source.ts:21`) | BE 계약 | **백엔드 명세 (최우선)** |
| 5 | A11Y-16 | P1 | **접근성 2건.** ① **스코프 그룹 오류가 어느 컨트롤의 것인지 연결되지 않는다** — `<p role="alert">`(`CreateApiKeyModal.tsx:252-256`)에 **id 조차 없다.** `<fieldset>` 에 `aria-describedby` 를 물리는 것이 옳다. **언어 화면(NFR-068 §5 #2)은 id 를 만들되 고아로 뒀다 — 두 화면이 같은 결함을 다른 방식으로 갖는다** ② **폐기 버튼의 접근 이름이 전부 '폐기'로 같다**(`ApiKeyTable.tsx:132`) — 행이 여럿이면 어느 키인지 알 수 없다. `aria-label={'<이름> 폐기'}` 필요 | 이 화면 | UI 기획 쪽 변경 요청 |
| 6 | EXC-03(경미) | — | **읽기 전용 안내가 `!canCreate && !canRemove` 일 때만 뜬다**(`:230`) — 권한이 **하나만** 없으면 아무 안내 없이 폐기 열만 사라진다. 운영자는 왜 폐기할 수 없는지 모른다. **게이팅 자체는 pass** — 설명이 빠졌다. 형제 3화면은 `canUpdate` 단일 축이라 이 문제가 없다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 7 | A11Y-13 · A11Y-04 | P1 | **부분 충족 2건.** ① `initialFocusRef` 로 첫 필드 포커스는 있으나(**형제 3화면엔 없다**) **zod 검증 실패에 `onInvalid` 가 없어** 스코프 0건 시 포커스가 버튼에 남는다 ② **발급 실패 직후 포커스가 이름으로 이동한다** — `useEffect([busy])`(`:171-173`)가 성공·실패를 구분하지 않아 **실패 배너를 읽기 전에 포커스가 움직인다** | 이 화면 | UI 기획 쪽 변경 요청 |
| 8 | EXC-07 · EXC-20 · EXC-06 | P1 | 422 `error.fields` → RHF `setError` 매핑 없음(**패턴은 이미 있다** — `:151` 이 로컬 중복을 정확히 꽂는다. 서버 422 를 같은 자리에 잇기만 하면 된다) · 5xx reference code 미표시(**발급 500 에서 특히 아깝다 — 유령 키 조사에 traceId 가 필요하다**) · status 별 surface 미분기(**어댑터가 `HttpError` 를 던지지 않는다**) | 이 화면 + 어댑터 | UI 기획 · 백엔드 명세 |
| 9 | (BE-069 §7.5) | — | **이름 중복 검사가 경합에 취약하다** — 조회 시점 클라이언트 목록 기준이라 동시 발급 시 둘 다 통과한다. 로딩 중이면 `existingNames` 가 `[]` 라 아예 무력하다. **서버가 422 `DUPLICATE_KEY_NAME` 로 막아야 하고**, **유일성 범위(활성 키만)** 와 **로케일 불변 비교**를 계약으로 정해야 한다(현재 프론트는 `toLocaleLowerCase()` — 로케일 의존) | 이 화면 + BE 계약 | 백엔드 명세 · UI 기획 |
| 10 | (§4.3) | — | **노출 모달에 이탈 가드가 없다** — 모달 내부 4경로는 막았는데(EL-008.8) **사이드바 링크를 누르면 평문이 사라진다**(`useUnsavedChangesDialog` 미소비). 세션 만료·렌더 예외도 같은 결과. **비가역 표시 상태라 dirty 폼이 아니지만 잃는 것은 더 크다** — FEEDBACK-04 의 appliesTo 가 아니어서 P0 gap 으로 세지 않았으나 **실질 위험은 그보다 높다**. ⚠ **#14 와 결합하면 더 나빠진다** — 모달 내부 4경로가 latch 에 걸려 있는 동안에도 라우트 이동은 여전히 열려 있어, 갇힌 모달을 두고 링크를 누르면 평문이 그대로 사라진다 | 이 화면 | **UI 기획 쪽 변경 요청 (우선)** |
| 11 | (§4.3 · FS-069 §7 #7) | — | **mono 토큰이 없다** — 평문·마스킹이 sans 로 렌더돼 `0/O`·`1/l` 이 구분되지 않는다. **수동 복사 시 오류 위험.** `RevealKeyModal.tsx:44-48` 이 부재를 기록하고 하드코딩 우회를 거부한 이유(TOKEN-01 + drift)를 밝힌다. `tokens/` 는 F1 소유 | **`tokens/`(F1) — 앱 코드로 해소 불가** | **프론트 리팩터 / F1 (토큰 추가)** |
| 12 | IA-04 · ERP-15 | P0 · P1 | **페이지네이션·virtualization 이 없다 — 그러나 현재는 gap 이 아니다.** 요구가 '**초과가능 시** Pagination' 이고 **API Key 는 운영자가 만들어 조직당 수~수십 건이 현실적 상한**이다(BE-069 §7.8 — BE-026 문의와 다른 결론이며 근거가 계약에 있다). **키 수가 실제로 늘면 이 판정을 다시 매긴다** — 그때 `status` 필터('활성만')와 함께 온다 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (**조건부**) |
| 13 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 입력·평문을 버린다. ✔ **이전 배치가 적은 '앞의 둘이 EXC-08 과 결합해 유령 키 경로를 넓힌다' 는 해소됐다** — 멱등키가 재시도를 안전하게 만들었다(§2 EXC-08). 남는 것은 '왜 안 되는지·언제 다시 눌러도 되는지 모른다' 는 UX 다 | **앱 전역** | 프론트 구현 · UI 기획 |
| **14** | **FEEDBACK-06** | **P0** | **⚠ 신규 결함 — DS `Modal` 일방향 latch. 이 화면의 모달 2종이 폭발 반경이고, 이 화면이 앱에서 가장 아프다.** **근인**: `Modal.tsx:122-126` `requestClose` 가 `closingRef.current = true; setClosing(true)` 로 latch 를 걸고 **리셋이 전혀 없다**(`setClosing(false)`·`closingRef.current = false`·리셋 effect 전무. `closingRef` 의 유일 사용처가 `:124` 다). `Modal.tsx:19-25` 가 '`onClose()` → 부모가 언마운트' 를 **설계 전제로 문서화**했는데, **veto 하는 부모**를 만나면 그 전제가 깨지고 되돌릴 코드가 없다. **이 화면의 두 `requestClose` 가 정확히 그 veto 다**: `CreateApiKeyModal.tsx:161-168`(dirty 면 `setConfirmingDiscard(true)`, `onClose` 미호출) → `onClose={requestClose}` `:182` · `RevealKeyModal.tsx:113-119`(`!copied` 면 `setConfirmingClose(true)`) → `onClose={requestClose}` `:126`. **추적**: Esc → latch → `--closing`(`Modal.tsx:202`) → `pointer-events:none`(`Modal.css:26-28`) + dialog exit `forwards`(`:35-38`) → `opacity:0` 고정 → `onAnimationEnd`(`:216-218`) → `onClose()` → **veto** → 확인 다이얼로그 → 사용자가 '취소'/'키 보기'(`CreateApiKeyModal.tsx:271-273` · `RevealKeyModal.tsx:176-178`) → **종착: 모달이 마운트된 채 보이지 않고 조작되지 않으며 이후 모든 Esc/딤/× 가 `Modal.tsx:123` 에서 즉시 return.** reduced-motion/jsdom 변종도 동일(`Modal.tsx:129-132` 에서 `willAnimate()` 가 false → `onClose()` 동기 발사 → 같은 veto) — 이때는 **보이는데 완전 무반응**이다. **대가**: `CreateApiKeyModal` 은 입력이 갇히고, **`RevealKeyModal` 은 평문이 갇힌다** — 사용자가 '키 보기'를 눌렀는데 키를 영영 못 본다(재조회 경로 없음 — §4.3). **✔ Toast 는 같은 패턴이나 버그가 아니다** — `exitingRef` 도 리셋 안 되지만 `onDismiss(id)` 를 ToastProvider 큐 `filter` 가 소유하고 **veto 경로가 없어** 항상 언마운트된다. **깨지는 것은 veto 하는 부모를 가진 Modal 뿐이다.** **최소 수정은 veto 시 latch 리셋이나 `onClose` 가 `void` 를 반환해 Modal 에 신호가 없다** — 시그니처 변경이 필요하고 그것은 DS 결정이다. **화면 코드로는 4경로 공유(FEEDBACK-06 의 요구 자체)를 깨는 우회만 가능하다.** **앱 전역 폭발 반경 9곳**(`onClose={requestClose}` grep): `CreateGroupModal.tsx:154` · `LogoFormModal.tsx:126` · `PasswordChangeModal.tsx:103` · `RoleFormModal.tsx:68` · `PortfolioCategoryFormModal.tsx:104` · `ProductCategoryFormModal.tsx:104` · **`CreateApiKeyModal.tsx:182`** · **`RevealKeyModal.tsx:126`** · `CategoryFormModal.tsx:106` | **`packages/ui`(DS) — 앱 코드로 해소 불가** | **프론트 리팩터 / DS (최우선 · 회귀)** |
| 15 | (BE-069 §7.6) | — | **폐기의 즉시성이 미보장** — 화면이 '이 키를 쓰는 연동이 **즉시** 401을 받습니다'(`:54`)라고 약속한다. 키 검증 캐시가 있다면 **동기 무효화**가 필요하다. 노출 의심으로 폐기하는 상황에서 몇 분의 지연은 사고다 | BE 계약 | 백엔드 명세 |
| 16 | (BE-069 §7.8 · §7.9 #8) | — | **키 사용 로그가 없다** — `lastUsedAt` 1필드로는 노출 사고 조사가 안 된다('이 키가 무엇을 호출했나'). 화면이 노출 시 폐기를 안내하므로(`RevealKeyModal.tsx:154-157`) **그 다음 단계에 답할 계약**이 필요하다 | BE 계약 | 백엔드 명세 · 아키텍처 |
| 17 | (BE-069 §7.1.2) | — | **계약으로 고정할 것** — 평문 재노출 API 를 **만들지 않는다**(서버가 평문을 모르므로 만들 수도 없다. **뒤집으려면 별도 승인**) · **발급 응답을 로깅하지 않는다** · **`Cache-Control: no-store`** · **해시는 단방향**(복호화 가능한 어떤 형태도 금지) | BE 계약 | **백엔드 명세 (계약 고정)** |
| 18 | COMP-09 · COMP-12 · ERP-08 | P2 | 이름 셀 truncate 없음(`maxLength=40` 이 완화) · 상한 근접 경고 없음 + counting 기준 미정의 · 건수가 raw `length`(`formatNumber` 미경유 — 형제 화면과 일관성 이탈) | 이 화면 | UI 기획 |
| **20** | **(BE-069 §7.3 ↔ 구현 불일치)** | — | **⚠ 신규 — 계약과 구현이 반대 방향이다.** BE-069 §7.3 은 두 선택지를 저울질한 끝에 **'대안(409 `IDEMPOTENT_REPLAY` + 유령 키 노출)을 채택한다'** 고 명시 판정했다 — 근거는 '§7.1(평문 미보관)이 이 섹션의 최상위 규칙이며 평문 24h 보관은 그것을 정면으로 어긴다'. **그런데 `712c30b` 의 구현은 평문 재생을 택했다**: `data-source.ts:91` `issuedByKey: Map<string, ApiKeyIssued>` 가 **평문을 포함한 응답을 통째로 보관**하고 `:116-117` 이 그것을 그대로 돌려준다. 심(`:104-105`)도 계약과 반대로 적는다 — '같은 키 + 같은 바디 = **최초 응답을 그대로 재생한다**(유령 키 없음). 다른 바디면 409'. 코드의 근거(`:83-86`)는 설득력이 있다 — '재시도에 새 평문을 지어 주면 운영자가 손에 쥔 평문과 실제로 저장된 키가 어긋난다'. **어느 쪽이 정본인지 정해야 한다.** 현재 구현은 **브라우저 안 `Map` 이라 §7.1 위반이 아직 발생하지 않았다**(서버가 없다) — **연동 전에 결정하지 않으면 §7.1 을 어기는 서버가 만들어진다.** ⚠ **NFR/FS 는 계약을 바꿀 수 없다** — 이 문서는 불일치를 기록만 하고 판정하지 않는다 | BE 계약 ↔ 이 화면 | **백엔드 명세 (연동 전 결정 필수)** |
| 21 | (FS-069 §7 #13 · #17 · #18) | P2 | **폐기 중 모든 행의 버튼이 잠긴다**(`disabled={revokingId !== null}` — `aria-busy` 는 해당 행만이라 **의도는 행 단위였던 것으로 보인다**) · **폐기된 키의 이름도 중복 검사에 포함**된다(근거 미명시 — BE-069 §7.5 는 활성 키만으로 판정) · **수동 복사가 `copied` 를 켜지 못해** 직접 복사한 사용자도 닫기 가드에 붙잡힌다(안전 방향의 마찰) | 이 화면 | UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다**(기준일 2026-07-17 · `HEAD = a5c2639`). 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`data-source.ts` 가 `failIfRequested('api-keys', op)` 를 **세 곳**에서 부른다. scope = **`api-keys`**:

| op | 호출 지점 | 재현 |
|---|---|---|
| `load` | `fetchApiKeys` (`data-source.ts:74`) | `?fail=load` · `?fail=api-keys:load` · `?fail=all` |
| `create` | `createApiKey` (`:107`) | `?fail=create` · `?fail=api-keys:create` · `?fail=all` |
| `revoke` | `revokeApiKey` (`:148`) | `?fail=revoke` · `?fail=api-keys:revoke` · `?fail=all` |

`data-source.ts:10` 이 이 셋을 나열한다. **`?fail=save` 는 이 화면에서 아무 효과가 없다** — 그런 op 이 없다(형제 3화면의 op 이다).

**⚠ `?fail=conflict` 는 이 화면에서 아무 효과가 없다** — `conflictRequested`(`_shared/store.ts:60-65`)는 `createRevisionedStore` 안에서만 호출되는데 **이 화면은 그 저장소를 쓰지 않는다**(§1.2). **EXC-04 의 충돌 경로가 재현 불가능한 것이 아니라 애초에 존재하지 않는다** — 그것이 gap 의 내용이다.

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). **STATE-01 재현은 `?delay=` 가 아니라 발급/폐기 성공(invalidate) 또는 `staleTime` 30초 경과 후 재진입으로 한다.**
- **`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:24-71`)는 `failIfRequested` 를 거치는 op 에 걸리므로 `?status=create:422` · `?status=revoke:404` 등이 적용된다. 다만 **이 화면이 status 로 분기하지 않아**(EXC-06 gap) 결과 화면이 같다 — 그것이 곧 gap 의 재현이다.

| 판정 | 재현 |
|---|---|
| STATE-01 (재조회가 표를 덮지 않는다) | 키 발급 → 목록 invalidate. **표가 스켈레톤으로 바뀌면 gap** |
| STATE-02 (조회 실패) | `?fail=load` — danger Alert + '다시 시도' 없으면 gap |
| STATE-05 (빈 상태) | `SEED_KEYS` 를 `[]` 로 → `Empty` + 발급 CTA 가 뜨면 pass |
| FEEDBACK-02 (폐기 실패) | `?fail=revoke` — **다이얼로그 유지 + 배너 + 재클릭 재시도면 pass** |
| **FEEDBACK-06 (4경로 + ⚠ latch)** | ① **4경로**: 발급 모달에 이름 입력 → 딤·Esc·×·취소 **각각** → 네 번 다 discard 확인이면 그 절은 pass. 입력 없이 4경로 → 즉시 닫히면 pass ② **⚠ latch(이 화면의 대표 결함)**: 이름 입력 → Esc → discard 확인에서 **'취소'** → **모달이 보이지도 닫히지도 않고 이후 Esc·딤·× 가 전부 무반응이면 gap.** ③ **가장 아픈 재현**: 발급 후 **복사하지 않고** Esc → '키 보기' → **평문이 보이지 않으면 gap.** ④ **reduced-motion 변종**: OS reduced-motion 으로 같은 절차 → 모달이 *보이는데* 무반응이면 gap(`Modal.tsx:129-132` 경로) |
| EXC-03 (write 게이팅) | `page:/settings/api-keys` 의 `create` off → 발급 버튼 소멸(카드·Empty 양쪽). `remove` off → '관리' 열 소멸 |
| **EXC-04 (유령 폐기)** | 코드로 판정: `data-source.ts:152-154` 의 `keys.map` 이 없는 id 에 no-op 하고 `resolve()` 한다. **정상 UI 로는 도달 불가** — 어댑터를 직접 호출해 확인. **감사 훼손**: 같은 id 로 `revokeApiKey` 2회 → `revokedAt` 이 바뀌면 gap |
| **EXC-08 (유령 키 — 해소됨)** | `grep -rni "idempotency" pages/settings/api-keys/` → **히트 15건이면 pass**(`ApiKeysPage.tsx:94,96,122,123,126,130,156` · `queries.ts:30,37,38` · `data-source.ts:99,104,109,116,139`). **`?fail=create` 로 발급 실패 → 같은 모달에서 재클릭 → `idempotencyKeyRef` 가 유지돼 같은 키가 실리면 pass**(`ApiKeysPage.tsx:121-123`). `api-keys.test.ts:90-124` 3건 통과로도 판정. ⚠ **재생 원장이 브라우저 `Map` 이라 새로고침 후에는 재현되지 않는다** — 픽스처 한정이며 서버가 24h 보존을 맡는다 |
| EXC-09 (abort) | 발급 중(400ms) Esc → 노출 모달·error toast 가 뜨지 않아야 pass |
| A11Y-11 (aria-required 주입) | **RTL 필수 — grep 으로는 판정 불가**(주입이 런타임이다). 이름 입력의 `aria-required === 'true'` + `aria-describedby === alert.id` |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · A11Y-12 · IA-02 · ERP-13 · **EXC-08** 판정) · **RTL**(A11Y-11 의 주입 확인) · **회귀 테스트 3벌**:
- **`api-keys.test.ts`**(**20건 — 이번 기준에서 +7**) — **시크릿 미유출을 고정한다**: 목록에 `plaintext`/`secret`/`value` 키 없음(`:19`) · **`JSON.stringify(keys)` 에 평문 없음**(`:56`) · 더미 접두어(`:30`) · 발급 상태(`:70`) · 스키마·중복(`:143-165`). **⭐ 신규 — 멱등 3건**(`:90` describe `createApiKey — 같은 시도의 재요청은 키를 두 번 만들지 않는다`): `:91` `같은 멱등키의 재요청은 최초 응답을 그대로 재생한다` · `:103` `재요청이 목록에 유령 키를 남기지 않는다` · `:114` `다른 시도(다른 멱등키)는 정상적으로 새 키를 만든다 — 전부 막으면 그건 고침이 아니다`. **마지막 항목이 중요하다** — 멱등 가드가 정상 발급까지 막지 않음을 고정한다.
- **`_shared/secret.test.ts`**(8건) — **마스킹의 역함수 부재**(`:24-32`) · 더미 보장(`:44-55`) · 글리프 고정 길이(`:58-62`). 파일 머리말이 '여기서 지키는 것은 스타일이 아니라 **보안 계약**이다'(`:3-4`).
- **`components/RevealKeyModal.test.tsx`**(9건) — **1회 노출 계약을 DOM 수준에서**: 평문 표시(`:36-39`) · 경고(`:41-44`) · 복사(`:46-54`) · **닫기 가드 4경로 중 2경로**(완료 `:58-68` · 헤더 × `:70-80`) · '키 보기' 유지(`:82-92`) · 확인 후 닫힘(`:94-103`) · 복사 후 즉시 닫힘(`:105-115`).

**테스트가 지키지 않는 것**: 유령 폐기(EXC-04) · 권한 게이팅(EXC-03) · **딤·Esc 경로**(`RevealKeyModal.test.tsx` 는 완료·× 만 본다) · `CreateApiKeyModal` **전체**(컴포넌트 테스트가 없다). ✔ **EXC-08 은 이번 기준에서 테스트가 생겼다**(위 3건). ⚠ **latch(§5 #14)를 잡을 테스트가 어디에도 없다 — 그것이 이 결함이 조용히 착륙한 이유다.** 기존 5건이 latch 를 비껴가는 방식이 두 갈래다: ① **`:58-68`·`:82-92`·`:94-103`·`:105-115` 는 footer '완료' 버튼을 누른다** — footer 는 Modal 이 불투명 슬롯으로 렌더하고 핸들러를 감싸지 않으므로(`Modal.tsx:27-31,240,252`) **`requestClose` 가 Modal 을 거치지 않고 직접 불린다 → latch 자체가 발화하지 않는다.** ② **`:70-80` 은 헤더 × 라 진짜로 latch 를 발화시키는데**(`Modal.tsx:227-232` → 내부 `requestClose`) **단언이 `확인 다이얼로그가 있다` + `onClose 미호출` 뿐이라 둘 다 latch 상태에서도 참이다.** **결함은 `closing === true` · dialog `opacity:0` · 오버레이 `pointer-events:none` 인데 테스트는 DOM 존재만 본다.** 잡으려면 × 로 붙잡은 뒤 **'키 보기' → 다시 × 를 눌러 두 번째 확인 다이얼로그가 뜨는지**를 봐야 한다(latch 면 `Modal.tsx:123` 에서 즉시 return 해 뜨지 않는다) — **그 조합을 시험하는 테스트가 0건이다.** 근본 해결은 **DS 소유 테스트의 몫**이다.

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **FEEDBACK-06 은 '이름 입력 → Esc → 취소 → 이후 Esc·딤·× 무반응' 과 '복사 없이 Esc → 키 보기 → 평문 불가시'**, **EXC-04 는 `keys.map` no-op 코드 확인 + `revokedAt` 2회 호출**이라는 결정적 재현을 댔다
- [x] 모든 `N/A` 에 사유를 댔다 (STATE-04 선택·페이징 부재 · COMP-10 검색 부재 · **FEEDBACK-04 라우트 레벨 폼 부재**(그 부재가 만드는 실질 위험은 §5 #10 로 별도 이관) · A11Y-12 토글 필터 부재 · IA-05 폼 라우트 쌍 부재 · IA-13 list state 부재)
- [x] **§2.1 산수 검산 — 13 pass + 9 종속 + 6 n-a + 2 gap = 30 ✓** (요약표 + 30행 전수 나열 2중 검산)
- [x] **A11Y-11 의 '전수' 가 진짜 전수임을 확인했다** — `grep -rn "required" apps/admin/src/pages/settings/` 히트를 전건 분류한 결과 **설정 4화면의 모든 `required` 는 `FormField` prop 이거나 zod 헬퍼 이름이며, `FormField` 를 거치지 않는 required 표면이 0건**이다. `ImageUploadField`·`ImageGalleryField`·`SegmentPicker`·`TextField`(전부 `required` 를 AT 에 잇지 않는 컴포넌트)의 소비가 **이 섹션에 0건**이다. 이 화면의 `@tds/ui` 직접 import 는 `Empty`·`Checkbox` 뿐이고 **둘 다 `required` 를 받지 않는다**(스코프 체크박스 2개는 그룹 규칙이라 개별 필수가 아니다 — §2 A11Y-11 ①)
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적었다 — **MOTION-03 에서 `ToggleSwitch` 가 이 화면에 없음을 명시**하고 그 축은 NFR-067·070 의 몫으로 넘겼다(그쪽도 이번 기준에서 해소됐다 — `ToggleSwitch.css:79-84`)
- [x] **판정 기준을 `a5c2639` 로 갱신하고 뒤집힌 5건을 §1 에 요약했다** — EXC-08(gap→pass) · MOTION-02·03(gap→pass) · MOTION-01(gap→종속) · **⚠ FEEDBACK-06(pass→gap · 역방향)**. 뒤집힘의 근거를 전부 실제 파일:라인으로 재확인했고, **`data-source.ts` 가 +28줄 늘어 이전 배치의 `:76`·`:94`·`:124`·`:126-128`·`:118-119`·`:107`·`:73` 인용과 `queries.ts:31-34` 가 전부 어긋나 있었다**
- [x] **역방향 뒤집힘(FEEDBACK-06)을 숨기지 않았다** — 이 화면의 코드는 한 줄도 바뀌지 않았고 의존(DS Modal)이 바뀌어 무너졌음을 §1.2 · §2 · §2.1 · §5 #14 에 일관되게 기록했다. **이전 배치가 이 화면의 자랑으로 적은 '4경로가 한 판정을 공유한다' 설계가 결함의 트리거가 됐다**는 사실도, **기존 테스트 5건이 latch 를 비껴가는 이유**(footer 는 Modal 을 거치지 않고, × 경로는 DOM 존재만 단언한다)도 §6 에 적었다
- [x] **구현이 BE 계약과 반대로 간 것을 발견해 기록했다**(§5 #20) — BE-069 §7.3 이 '409 + 유령 키 노출' 을 명시 채택했는데 `712c30b` 는 '평문 재생' 을 구현했다. **NFR 은 계약을 바꿀 수 없으므로 판정하지 않고 불일치만 백엔드 명세 에 넘겼다**
- [x] **`상속` + `gap` 조합의 근거를 §1.1 에 규약으로 명시**했다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — COMP-02·A11Y-08 은 표면 부재로 n-a 처리했다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`api-keys`)와 **op 3종(load·create·revoke)을 `data-source.ts:76,94,124` 에서 확인**했고, **`?fail=conflict` 가 이 화면에서 무효임**(`createRevisionedStore` 미사용)을 명시했으며, **`?delay=` 를 쓰지 않았다**
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다. **기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] §5 의 gap 이 FS-069 §7 · BE-069 §7.9 와 일치한다
- [x] **§4.3 시크릿 안전성을 quality-bar 밖 축으로 신설**하고, **평문이 사는 자리를 코드로 추적해 13개 항목을 판정**했다 — **회피 불가능한 3건**(DOM·클립보드·힙)을 **정직하게 '인정된 트레이드오프'로 기록**하고 미화하지 않았다
- [x] **EXC-04 가 형제 화면(NFR-067·068·070 pass)과 갈리는 이유**(이 화면만 `createRevisionedStore` 미사용)를 §1.2 표와 §2.1 하단에 기록하고 **화면마다 다시 매겨야 함**을 못박았다
- [x] **EXC-08 이 형제 화면보다 심각한 이유**(POST 라 `If-Match` 방어가 없다 + 발급이 비가역)를 §2 · §2.1 · §5 #2 에 일관되게 기록했다
- [x] **IA-04 를 조건부 pass 로 판정**하고 그 근거(BE-069 §7.8 — 키는 운영자가 만들어 상한이 현실적)와 **재판정 조건**을 §5 #12 에 명시했다 — BE-026(문의)과 다른 결론임을 밝혔다
- [x] **이 화면이 유일하게 pass 한 요구 2건**(FEEDBACK-06 · IA-04)과 **해소한 앱 전역 gap 1건**(EXC-03)을 §2.1 하단에 기록했다
</content>
