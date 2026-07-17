---
id: NFR-019
title: "인증서/특허 관리 비기능 명세"
functionalSpec: FS-019
backendSpec: BE-019
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-019. 인증서/특허 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-019 인증서/특허 관리 (`/company/certificates` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구가 이 화면에서 ① 적용되는가 ② 어떤 코드로 충족되는가 ③ 무엇을 재현하면 판정되는가만 적는다 |
| 함께 읽는 문서 | FS-019(요소·예외) · BE-019(계약·보안 판정·업로드 미결) · `specs/quality-bar.md`(요구 원문) · NFR-017(형제 화면 — 같은 CRUD 키트를 쓰므로 공용 계층 판정이 일치한다) |
| 갱신 규칙 | 요구 문구가 바뀌면 quality-bar 만 고친다. 이 문서는 **판정과 코드 근거**만 갱신한다 |
| 판정 기준일 | **2026-07-17 · HEAD `a5c2639`** 기준 코드 대조. 직전 판정은 `4b805ad` 기준이었고, 이후 PR #22·#24·#26·#28·#30·#32·#34 가 머지되며 **이 화면의 P0 2건이 gap → pass 로 뒤집혔다**: **A11Y-11**(#30 이 `ImageUploadField` 의 required 를 **접근성 이름**으로 AT 에 이었다 — `requiredNameSuffix`) · **MOTION-02**(#26 이 Toast exit 애니메이션을 CSS-only 로 구현했다). **MOTION-01 은 gap 으로 남되 사유가 완전히 바뀌었다** — '애니메이션이 없다' 가 아니라 '이 화면이 쓰는 닫힘 경로(ConfirmDialog footer 버튼)만 애니메이션을 타지 않는다' 다 — §2 각 행의 근거 라인 참조 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 `pages/company/certificates/**`) 또는 이 화면이 소비하는 CRUD 프레임워크(`shared/crud/**`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인. **상속 항목이라도 이 화면이 쓰는 그 표면의 코드를 직접 읽어 확인했으면 pass** |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | 상속 항목인데 이 문서의 범위에서 확정할 수 없다 — 소유 문서의 판정을 따른다 |

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 측정 기준 열은 '무엇을 재현하면 이 판정이 확인/반증되는가'를 적은 것이며, 아직 실행된 절차가 아니다(§6).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | `useCrudList.tsx:71-72` 가 `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined` 로 **갈라서** 파생한다. `CrudListShell.tsx:136` 이 `loading={firstLoading}` 만 표에 넘기고, `CrudTable.tsx:143` 이 그때만 스켈레톤·`153` 이 0행일 때만 Empty·`CrudListShell.tsx:113` 이 error 일 때만 배너를 그린다. 폼은 `useCrudForm.ts:136`. **이 화면은 자체 `useQuery` 를 두지 않아 `isFetching` 직결 경로가 없다** | `/company/certificates` 진입 → 스켈레톤만. 등록 후 목록 복귀로 재조회 → 표가 스켈레톤/blank 로 바뀌지 않고 이전 행 유지 + '새로고침 중…'. `?fail=certificates:list` → Alert 만. **구분 필터 변경은 재조회를 유발하지 않아**(클라이언트 필터) 상태 전이 자체가 없다 | pass |
| STATE-02 | STATE | 직접 | `CrudListShell.tsx:157-164` 목록 조회 실패 → 인라인 `Alert tone="danger"` + '다시 시도'(`controller.refetch`). `FormPageShell.tsx:123-144` 상세 조회 실패 → 인라인 Alert. **read 실패에 토스트를 띄우는 경로가 없다** | `?fail=certificates:list` → 인라인 danger Alert + '다시 시도' 가 조회 재발행, 토스트 0건. `?fail=certificates:detail` 로 `/company/certificates/cert-1/edit` → 폼 대신 Alert | pass |
| STATE-04 | STATE | 직접 | **두 절 중 실재하는 절이 충족된다.** (b) 선택 해제: `CertificatesListPage.tsx:62-64` 가 `useEffect(() => { clear(); }, [filter, clear])` 로 **구분 필터가 바뀌면 선택을 비운다** — 주석이 그 의도를 명시('필터가 바뀌면 보이지 않는 행의 선택이 남지 않게 비운다'). 숨겨진 행이 선택된 채 '선택 N건 삭제' 되는 사고를 막는다. (a) page clamp: **표면이 없다** — 페이지네이션이 없어 범위를 벗어날 `page` 가 존재하지 않는다(IA-04 gap 의 그림자) | '특허' 필터에서 행 선택 → '전체'로 변경 → 선택 0건, SelectionBar 사라짐. **(a) 는 Pagination 도입 시 재판정한다** | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면 전용 모듈의 시각 값이 전부 `var(--tds-*)` 다 — `CertificatesListPage.tsx:28-45`(toolbar·filterWrap·filterSelect) · `CertificatesFormPage.tsx:23-27`(rowStyle). hex 0건, px 리터럴 0건, border/outline 키워드 0건. 파생 치수는 `calc(var(--tds-space-6) * 6)` 토큰 배수(TOKEN-08 이 지적하는 우회이나 P1) | `pages/company/certificates/**` 에 `#hex` · `[1-9]px` · `(outline\|border): (thin\|medium\|thick)` grep = 0. ESLint/stylelint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 링이 단일 토큰 쌍에서 온다 — `.tds-ui-focusable:focus-visible`(`ui.css:14-16`) `outline: var(--tds-border-width-medium) solid var(--tds-color-border-focus)` 를 명칭·발급기관·발급일 입력(`CertificatesFormPage.tsx:96,112,126`)과 '목록으로'(`FormPageShell.tsx:150`)가 소비한다. TOKEN-02 가 지목한 nav row 위반은 **이미 해소**됐다(`app-shell.css:14`) | 입력·버튼·nav row 를 Tab → 링 두께 픽셀 동일. bare border 키워드 grep = 0 | pass |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비자는 **토스트뿐**이다(삭제·저장 성공). `Toast.css:25` 가 `animation: tds-toast-in var(--tds-motion-duration-normal) var(--tds-motion-easing-decelerate)` 로 easing 토큰을 그대로 timing-function 자리에 쓰며, 토큰이 codegen 에서 `cubic-bezier()` 로 감싸 emit 되므로 유효 파싱된다(`Motion.stories.tsx:43`) | 인증서 삭제 → 토스트 entrance 재생. animation-timing-function 이 `cubic-bezier(...)` 로 해석 | pass |
| TOKEN-04 | TOKEN | 상속 | floating/raised 표면 둘 다 semantic shadow 토큰을 쓴다 — 다이얼로그 `Modal.css:36` `var(--tds-shadow-modal)`, 폼 카드 `Card.css:31` `var(--tds-shadow-raised)`. raw box-shadow 값 0건 | 삭제 다이얼로그·폼 카드가 light/dark 양쪽에서 부상. `box-shadow:` grep 이 `var(--tds-*shadow*)`/`none` 만 | pass |
| TOKEN-05 | TOKEN | 직접+상속 | 폼 `<h1>` 이 공유 `pageTitleStyle`(title.xl = 20px/600)에서 온다 — `FormPageShell.tsx:160`. AppHeader 도 같은 원천(`AppHeader.tsx:52-55`). 다이얼로그 제목은 `Modal.css:57-60` title-xl. 본문은 body-md 라 계층이 내려간다 | `/company/certificates/new` 의 `<h1>` 계산 font-size > body-md. **두 h1 이 동시에 보이는 것 자체는 IA-02 gap** | pass |
| COMP-10 | COMP | **N/A** | **표면이 없다** — 이 화면에 텍스트 검색·텍스트 필터 입력이 없다(`SearchField`·`useDebouncedSearch`·`useListState` import 0건). **구분 필터(FS-019-EL-002)는 native `<select>`** (`CertificatesListPage.tsx:92-105`)라 IME 조합 자체가 발생하지 않고, 값은 옵션 클릭으로만 확정되며 query 발행이 없다(클라이언트 필터). 폼의 명칭·발급기관은 **저장 대상 입력**이지 검색·필터 입력이 아니다 | — (N/A). **검색이 도입되면 `shared/crud/useDebouncedSearch.ts`(isComposing 처리 보유)를 소비해야 하며 그때 직접 판정으로 승격한다** | n-a |
| FEEDBACK-02 | FEEDBACK | 직접 | 파괴적 액션(단건·일괄 삭제)이 전부 `ConfirmDialog intent="delete"` 로 게이팅된다 — `useCrudList.tsx:152-179`. busy → `ConfirmDialog.tsx:148-155` 확인 버튼 `disabled` + `aria-busy` + '처리 중…'. 실패 → 다이얼로그 유지 + `error` 배너(`ConfirmDialog.tsx:164`), 재클릭이 재시도. 취소/Esc/딤 → `closeDelete`(`useCrudList.tsx:86-92`)가 `abort()` + `mutation.reset()` | `?fail=certificates:delete` → 행 삭제 확인 → 다이얼로그가 배너와 함께 열려 있고 재클릭이 재시도. 진행 중 Esc → 토스트 없이 버튼 상태 복원 | pass |
| FEEDBACK-04 | FEEDBACK | 직접 | `FormPageShell.tsx:114` 이 `useUnsavedChangesDialog(isDirty && !saving, {message})` 를 배선하고 훅이 3경로를 덮는다 — beforeunload(`useUnsavedChangesDialog.tsx:120-131`) · capture 링크 가로채기(`134-155`) · popstate sentinel(`157-182`). **이미지 선택도 dirty 를 만든다** — `CertificatesFormPage.tsx:159` `setValue(..., { shouldDirty: true })` | 명칭을 고치거나 **이미지만 올리고** ① 탭 닫기 ② 사이드바 링크 ③ Back → 각각 discard 다이얼로그. 저장 후 같은 이동 → 프롬프트 없음 | pass |
| FEEDBACK-06 | FEEDBACK | **N/A** | **표면이 없다** — 이 화면에 **폼을 담은 모달이 없다**. 등록·수정은 전용 라우트(`App.tsx:190-191`)이고, 뜨는 모달은 확인 다이얼로그 4종(삭제·일괄·이탈·충돌)뿐이라 담긴 입력이 없다. 폼의 dirty 보호는 FEEDBACK-04 가 담당한다 | — (N/A). IA-06 의 무게 규칙상 인증서는 rich 엔티티(이미지 포함) → route 이므로 의도된 설계다 | n-a |
| A11Y-01 | A11Y | 상속 | `ToastProvider.tsx:164-171` 이 라이브 영역 2개(polite `role="status"` · assertive)를 **토스트보다 먼저·항상** 마운트하고 텍스트만 주입한다. 이 화면의 토스트(삭제·저장 성공·취소)가 그 큐로 들어간다 | 인증서 삭제 → 스크린리더가 `'ISO 9001 …'을(/를) 삭제했습니다.` announce(조사는 `objectParticle` 파생). 토스트 0건일 때도 컨테이너 존재 | pass |
| A11Y-02 | A11Y | 상속 | `ConfirmDialog.tsx:130,135` 가 `messageId` 를 `Modal` 의 `describedBy` 로 넘기고 `161` 이 그 id 를 본문 `<p>` 에 건다. `Modal.tsx:158` `aria-describedby={describedBy}`. 이 화면의 다이얼로그 4종이 전부 이 경로를 탄다 | 삭제 다이얼로그 open → 제목 + `'<명칭>'을(/를) 삭제합니다…` 를 함께 읽음 | pass |
| A11Y-11 | A11Y | 직접 | **PR #30 에서 뒤집혔다(gap → pass) — 마지막 한 필드가 닫혔다.** ① `aria-invalid` ↔ `aria-describedby` 짝은 **5개 필드 전수** 성립한다 — 명칭 `CertificatesFormPage.tsx:101-102`, 발급기관 `117-118`, 발급일 `130-131`, 구분 `141-142`, 이미지는 `ImageUploadField.tsx:225` 가 자체 배선(`describedBy = invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined`)하며 `:317` 이 `role="alert"` `<p>` 를 그린다 ✅. hint 연결도 그 DS 배선이 지킨다(`:322` `<p id={hintIdOf(id)}>`) — 이 화면의 손수 배선 FormField 4종에는 hint 가 없어 NFR-015·NFR-018 의 hint 미연결 결함을 밟지 않는다. ② **required 노출 — 폼 컨트롤 4종은 F3a 가 닫았다.** `FormField` 가 `withAriaRequired()` 로 `required` 를 **런타임 `cloneElement` 로 자식의 `aria-required` 에 주입**하고(`FormField.tsx:50-56`, 주입 지점 `:107`, 대상 판별 `isRequirableChild` `:38-41`), 이 폼의 required FormField 자식은 **명칭 `<input>`(`:93-104`) · 발급기관 `<input>`(`:109-120`) · 발급일 `<input type="date">`(`:124-133`) · 구분 DS `SelectField`(`:137-150`)** 로 **전부 주입 대상**이다(`SelectField` 는 native 속성을 `<select>` 로 패스스루한다 — `SelectField.tsx:42,55-63`) ✅. ③ **`ImageUploadField` 의 required — PR #30 이 이 마지막 절을 닫았다(gap → pass).** 직전 판정은 '`aria-required` 가 0건이라 필수 여부가 스크린리더에 영원히 닿지 않는다' 였다. **DS 가 그것을 닫았으나, 직전 판정이 기대한 방법(`aria-required` 주입)이 아니라 더 정확한 방법으로 닫았다** — `<ImageUploadField label="이미지" required …>`(`:154-164`)의 드롭존 `<button>` 이 이제 `aria-label={`${label}${requiredNameSuffix(required)} 이미지 업로드 — …`}`(`ImageUploadField.tsx:250`)로 **접근성 이름 자체에 '(필수)' 를 싣는다**(`requiredNameSuffix` 정의 `:55`, export `index.ts:2`). **`aria-required` 를 쓰지 않은 것은 누락이 아니라 설계 판단이다** — 근거가 `ImageUploadField.tsx:44-54` 에 명문화돼 있다: `aria-required` 는 **`role=button` 이 지원하는 속성이 아니고**(ARIA 1.2 — textbox/checkbox/combobox/…), 얹으면 거짓 시맨틱이자 axe `aria-allowed-attr` 위반이다. 진짜 `<input type="file">` 은 `aria-hidden` + `tabIndex=-1` 트리거라 그쪽에 줘도 **아무에게도 닿지 않는다**. 즉 이 필드에는 `aria-required` 를 붙일 정직한 자리가 없고, 남는 경로는 **접근성 이름**뿐이다. `*` 마커는 여전히 `aria-hidden` 장식이지만(`:240-242`) **이제 그것이 유일한 경로가 아니다** — 마커의 시각 표현은 그대로 두고 AT 경로만 더한 설계다(`FormField.tsx:17-22` 의 선례와 같은 형태). **NFR-020·NFR-021(로고 목록)도 같은 수정으로 함께 닫혔다** | ① 빈 폼 제출 → 각 입력의 `aria-describedby` === `role=alert` `<p>` id (통과). ② RTL: 명칭·발급기관·발급일·구분의 `aria-required` 조회 → **전부 `"true"`** → 충족. **⚠ grep 으로 판정하지 말 것** — `grep -rn "aria-required" apps/admin/src` 는 여전히 1건(수동 override)뿐이며 주입은 **런타임**이다. ③ RTL: 드롭존 버튼의 접근성 이름에 `(필수)` 가 포함되는지 → **포함된다** → 충족. DS 회귀 테스트가 이 판정을 고정한다 — `ImageUploadField.test.tsx:102` describe `'ImageUploadField — required 의 AT 경로'` → `:103` `'required 면 드롭존의 접근성 이름이 필수임을 밝힌다'` · `:108` `'required 가 아니면 이름에 필수 꼬리표가 붙지 않는다 (대조)'` · `:114` `'aria-required 를 role=button 에 얹지 않는다 — 지원하지 않는 속성이다'`(**부재를 단언한다** — 되돌리면 red) · `:122` describe `'requiredNameSuffix — 순수 유틸'` | **pass** |
| A11Y-12 | A11Y | **N/A** | **표면이 없다** — 이 화면에 좌측 필터 목록·토글 필터 버튼이 없다. 구분 필터는 **native `<select>`**(`CertificatesListPage.tsx:92`)라 선택 상태를 브라우저가 소유하며 `aria-pressed`/`aria-current` 를 붙일 대상이 아니다. 이 화면 파일에 `aria-current` grep = 0 | — (N/A) | n-a |
| MOTION-01 | MOTION | 상속 | **gap 이 남지만 사유가 완전히 뒤집혔다 — '애니메이션이 없다' 가 아니라 '이 화면이 쓰는 닫힘 경로만 애니메이션을 타지 않는다' 다.** 직전 판정('`Modal.css` 에 animation 선언 0건 · 즉시 삽입/제거')은 **PR #26 이 반증했다**: backdrop fade(enter `Modal.css:20-21` → `@keyframes tds-modal-backdrop-in :126-134` · exit `:30-33` → `tds-modal-backdrop-out :136-144`)와 dialog scale(enter `:58-59` → `tds-modal-dialog-in :146-156`, opacity 0→1 · `scale(0.96)→scale(1)` · exit `:35-38` → `tds-modal-dialog-out :158-168`, `forwards`)이 **실재하고**, `component.overlay` recipe(`tokens/tokens.json:1286-1308`)를 소비하며, reduced-motion 게이트(`Modal.css:173-180`)도 있다. **AnimatePresence 는 없지만 요구의 실질('exit 완료 후에만 unmount')은 CSS `onAnimationEnd` 로 동등 달성했다** — `Modal.tsx:216-218` 이 keyframes 이름 상수(`:43` `'tds-modal-dialog-out'`)와 대조해 그때만 `onClose()` 를 쏜다. **그러나 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232` — 전부 `requestClose` `:122-126` 경유)뿐이고, 이 화면의 다이얼로그 4종은 전부 `ConfirmDialog` 다.** `ConfirmDialog` 의 **footer 버튼(취소 `:145` `onClick={onCancel}` · 확인 `:153` `onClick={onConfirm}`)은 `Modal` 을 거치지 않고 호출부 콜백을 직행**하며 호출부가 즉시 언마운트한다 — `Modal.tsx:27-31` 이 그 한계를 명시한다(Modal 은 footer 를 불투명 슬롯으로 렌더(`:240`,`:252`)하고 핸들러를 감싸지 않는다). **삭제 다이얼로그를 '취소'나 '삭제'로 닫는 것이 이 화면의 주 경로인데 그 경로가 정확히 exit 애니메이션을 타지 않는다** — 그래서 gap 이다. **리포 전체에 Motion 라이브러리는 여전히 없다**(`package.json` 19개 · import · lockfile 전부 0건) — 모든 모션이 손수 쓴 CSS keyframes 다 | 삭제 확인 다이얼로그를 **Esc/딤/×** 로 닫기 → backdrop fade + dialog scale(0.96) 재생 후 DOM 제거 (**통과**). 같은 다이얼로그를 **'취소' 또는 '삭제' 버튼**으로 닫기 → 애니메이션 없이 즉시 제거 (**반증 — 잔여 gap**). `Modal.css` 에 `@keyframes` grep = **4건**(직전 판정의 '0건' 은 낡았다) | **gap** |
| MOTION-02 | MOTION | 상속 | **PR #26 에서 뒤집혔다(gap → pass) — 완전 구현이다.** 직전 판정('`ToastProvider.tsx:99-101` 이 즉시 filter-out · `Toast.css:25` 에 exit 대응물 없음')은 **절반만 낡았다**: 그 `dismiss` 의 `setToasts(prev => prev.filter(...))`(`ToastProvider.tsx:99-100`)는 **여전히 있으나 이제 그것이 최종 제거일 뿐이고, 그 앞에 exit 애니메이션이 놓였다.** `Toast.tsx` 가 `onDismiss` 의 **호출 시점을 퇴장 애니메이션 뒤로 미룬다**(주석 `:19-22`): 자동소멸 타이머·닫기(×)·재시도 → `requestDismiss`(`:159-162`) → `exiting` → 클래스 `tds-toast--exiting`(`:183`) → `onAnimationEnd` 가 `TOAST_EXIT_ANIMATION`(`:32` = `'tds-toast-out'`)과 매치될 때만 `onDismiss?.(id)`(`:186-187`) → 그때 provider 가 큐에서 뺀다. CSS `Toast.css:32-37` `.tds-toast--exiting`(`tds-toast-out … forwards` + `pointer-events:none`), keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`). **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족한다** — `component.overlay` recipe 소비(`Toast.css:35-36`)로 `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`). reduced-motion 게이트 `Toast.css:136-141`. jsdom/reduced-motion 에서는 `willAnimate()`(`Toast.tsx:39-45`)가 false 라 즉시 `onDismiss`(`:175-176`) — 기존 단위 테스트의 '4초 뒤 onDismiss' 단언이 그대로 유효하다(`Toast.test.tsx:17-21` 이 그 설계를 명시) | 삭제 성공 토스트가 4초 후 자동 소멸 → **아래로 가라앉으며 fade out 한 뒤** DOM 제거. `prefers-reduced-motion: reduce` → 애니메이션 없이 즉시 제거(정보 손실 0) | **pass** |
| MOTION-03 | MOTION | 상속 | 이 화면에서 움직이는 표면이 전부 reduced-motion 게이트를 통과한다: 스켈레톤 pulse → `ui.css:110-114` `animation-name: none`; Button 배경 transition → `Button.css:158` reduced-motion off; **PR #26 이 더한 Modal/Toast 애니메이션도 각자 게이트를 갖고 태어났다** — `Modal.css:173-180` · `Toast.css:136-141`. 이 화면에 ToggleSwitch 는 렌더되지 않는다(`ImageUploadField.css` 의 드롭존 hover 는 색 변화다) | `prefers-reduced-motion: reduce` 로 `/company/certificates` 구동 → 스켈레톤 pulse 정지, Modal/Toast 가 애니메이션 없이 즉시 나타나고 사라짐, 어떤 요소도 move/scale 하지 않음. **직전 판정이 단 유보('DS 전역으로는 `ToggleSwitch.css:56` 의 `transition: transform` 이 게이트 밖이다')는 이제 사실이 아니다** — `ToggleSwitch.css:79-84` 가 `@media (prefers-reduced-motion: reduce)` 로 `.tds-toggle__track`·`.tds-toggle__knob` 의 `transition: none` 을 건다(근거 주석 `:76-78`). 이 화면의 표면은 아니지만 **유보 자체가 해소됐으므로 기록해 둔다** | pass |
| IA-01 | IA | 상속 | 이 화면의 3개 라우트가 전부 `RequireAuth > AppShell` 레이아웃 라우트 아래에 있다 — `App.tsx:324-336` 이 `APP_ROUTES`(189-191 에 인증서 3건)를 그 안에서 렌더한다. 두 페이지 컴포넌트는 자체 sidebar/top bar/outer frame 을 만들지 않는다(파일 전수 확인) | 3개 경로 모두 사이드바 + AppHeader + 단일 `<main>` 안에 렌더. 페이지가 그리는 frame 0건 | pass |
| IA-02 | IA | 직접 | **gap 이 남지만 사유가 절반 바뀌었다 — 가지 라벨 폴백은 통합에서 해소됐고, `<h1>` 이중 + 행위 미반영이 남았다.** **① 해소됨(가지 폴백):** 직전 판정은 `findNavLabel('/company/certificates/new')` 이 가지 루프에서 `.startsWith('/company')` 로 **'기업 관리'** 를 반환한다고 적었다. 그 구현이 사라졌다 — 통합이 `findNavLabel` 을 `findCoveringLeaf` 위에 다시 얹었고(`nav-config.ts:297-299` — `findCoveringLeaf(pathname)?.label ?? pathname`), 그 함수는 **'자기를 감싸는 가장 긴 잎'** 을 찾는다(`:260-278`). `covers()` 가 **세그먼트 경계**에서만 매칭하므로 `/company/certificates/new` 는 잎 `'인증서/특허'` 에 덮인다 — 권한(`permissions/route-resource.ts`)이 쓰던 규칙과 한 곳으로 통일된 결과다. 회귀 방어선: `nav-config.test.ts:16-40` 이 `/company/history/new` → **'연혁'** 을 고정한다. **② 남음(행위 미반영):** `nav-config.ts:294-296` 주석이 밝히듯 **'등록/수정' 행위는 제목에 넣지 않는다(의도)**. 그래서 `/company/certificates/new` 의 AppHeader `<h1>` 은 '인증서/특허' 이지 quality-bar IA-02 가 예시로 든 **'인증서/특허 등록' 이 아니다.** **③ 남음(`<h1>` 이중 — 단일 title 메커니즘 미충족):** `AppHeader.tsx:101` 이 `<h1>{title}</h1>` 을 그리는 동시에 `FormPageShell.tsx:160` 이 두 번째 `<h1>{isEdit ? '인증서/특허 수정' : '인증서/특허 등록'}</h1>` 을 그린다 — **한 화면에 `<h1>` 이 2개다.** 게다가 **title 의 원천이 화면 종류마다 다르다**: 목록(`/company/certificates`)은 AppHeader 만(본문 `<h1>` 없음), 폼은 AppHeader + in-content h1 둘 다 — quality-bar 가 요구하는 '단일 page-header/title 모델을 정의·균일 적용' 이 성립하지 않는다 | `/company/certificates/new` 진입 → AppHeader 제목이 **'인증서/특허'**(개선 확인 — 더 이상 '기업 관리' 가 아니다). 그러나 `document.querySelectorAll('h1').length === 2` 이고 `[0].textContent === '인증서/특허'` · `[1].textContent === '인증서/특허 등록'` → **단일 title 메커니즘 미충족**. 기대: h1 1개 + 구체 title | **gap** |
| IA-04 | IA | 직접 | **미충족.** 템플릿 앞 4단은 성립한다 — 툴바에 **필터 좌측 + primary 등록 우측**(`CertificatesListPage.tsx:88-113`, `justifyContent: space-between`), 결과 count 요약(`CrudListShell.tsx:118-122`), SelectionBar(`125-133`), 표(`135`). **마지막 단(Pagination)이 없다** — `CrudListShell.tsx` 에 Pagination import·렌더 0건이고 `CertificatesListPage.tsx:119` 가 `visibleItems={visible}`(필터된 전 행)을 넘겨 `CrudTable.tsx:171` 이 전부 map 한다. **행마다 이미지 썸네일이 있어 행 수에 비례해 이미지 요청이 늘어난다** | 인증서를 11건 이상 등록 → Pagination 이 렌더되지 않고 전 행 + 전 썸네일이 한 화면에 쌓인다. `CrudListShell.tsx` 에 `Pagination` grep = 0 | **gap** |
| IA-05 | IA | 직접 | `App.tsx:190-191` 이 `/company/certificates/new` 와 `/company/certificates/:id/edit` 를 **같은 `<CertificatesFormPage />`** 에 매핑한다. `useCrudForm.ts:73-74` 가 `useParams().id` 유무로 `isEdit` 를 정하고, `FormPageShell.tsx:160,189` 가 그 값으로 title 과 제출 라벨만 바꾼다. 레이아웃·필드는 동일하며 create 전용/edit 전용 페이지가 없다 | 두 경로가 같은 컴포넌트로 해석. `/new` = 빈 폼 + '인증서/특허 등록', `/:id/edit` = prefill + '인증서/특허 수정' | pass |
| IA-13 | IA | 직접 | **미충족.** 이 화면에 직렬화할 상태가 **하나 있고, 그것이 URL 에 없다** — `CertificatesListPage.tsx:51` 이 `const [filter, setFilter] = useState<CertFilter>(CERT_FILTER_ALL)` 로 구분 필터를 **컴포넌트 로컬**에 둔다. `useSearchParams`·`useListState` import 0건. 그 결과 ① 새로고침(F5) → '전체'로 초기화 ② 수정 폼 진입 후 Back → '전체'로 착지 ③ **'특허만 보이는 화면'의 링크를 만들 수 없다** — '이 특허들 좀 봐주세요' 하며 URL 을 공유할 방법이 없다. 목록 URL 은 언제나 `/company/certificates` 하나다. `shared/crud/useListState.ts` 가 이 일(URL 직렬화 + 기본값 제거 + replace)을 이미 갖고 있으나 **이 화면이 소비하지 않는다** | '특허' 필터 선택 → URL 이 `/company/certificates` 그대로(쿼리 없음) → F5 → '전체'로 돌아옴. 수정 폼 진입 후 Back → 필터 유실 | **gap** |
| EXC-01 | EXC | 상속 | 경계가 2겹이다 — `App.tsx:311-315` 루트 경계 + `AppShell.tsx:484-489` `<Outlet>` **바로 바깥** 경계(`resetKey={pathname}`). 후자가 이 화면의 렌더 예외를 잡아 사이드바·헤더를 살린 채 `RouteErrorScreen` 을 그리고, 다른 메뉴로 이동하면 `resetKey` 변경으로 스스로 풀린다 | `CertificatesListPage` 에 강제 throw 주입 → 사이드바 유지 + 복구 UI, 다른 메뉴 이동 가능, 앱 unmount 안 됨 | pass |
| EXC-02 | EXC | 상속 | ① 라우트 가드: `App.tsx:324-329` 이 `RequireAuth` 를 **AppShell 바깥**에 둬 세션이 없으면 셸도 그리지 않고 `/login?returnUrl=<현재 경로>` 로 보낸다. ② mid-session 401: `queryClient.ts:41-43` 이 `QueryCache`·`MutationCache` 의 `onError` 에 **단일 인터셉터**(`isUnauthorized` → `notifySessionExpired`)를 걸어 이 화면의 조회·쓰기 401 을 전부 덮는다 | 세션 없이 `/company/certificates` deep-link → `/login?returnUrl=%2Fcompany%2Fcertificates` 후 로그인하면 복귀. `?status=certificates:list:401` → 재인증 경로 | pass |
| EXC-03 | EXC | 직접 | **절반만 충족.** ① route-level authorization 성립 — `AppShell.tsx:490-492` 가 `<Outlet>` 을 `RequirePermission` 으로 감싸고 `RequirePermission.tsx:62-63` 이 `useRouteCan('read')` 실패 시 `ForbiddenScreen` 을 렌더한다. 리소스는 `route-resource.ts:36-46` 이 경로에서 파생하므로 `/company/certificates/new` 도 잎 `/company/certificates` 로 덮인다. ② **write-action 게이팅이 배선되지 않았다** — `useRouteWritePermissions`(`RequirePermission.tsx:45-52`)의 **소비자는 F3b 이후 7곳이지만(products 3 · settings 4) `pages/company/**` 는 그 목록에 없다** (`grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**) — '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`). 그래서 `CertificatesListPage.tsx:108` 의 '인증서/특허 등록', `CrudTable.tsx:192-197` 의 행 수정/삭제, `CrudListShell.tsx:126-132` 의 일괄 삭제가 **read-only 역할에도 그대로 렌더되고 눌린다**. 강등 reconcile 도 같은 이유로 성립하지 않는다 | read 권한 OFF 로 deep-link → 403 화면 (통과). **remove/create 권한만 OFF → 등록 버튼·행 휴지통·'선택 N건 삭제' 가 여전히 보이고 클릭되어 서버 403 으로만 막힌다 (반증)** | **gap** |
| EXC-04 | EXC | 직접 | 어댑터가 유령 저장을 차단한다 — `crud.ts:126-128` `update` 가 대상 id 부재 시 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`, `82-84` `remove` 가 `HttpError(409, '이미 삭제된 항목입니다.')` 를 던진다. `useCrudForm.ts:160-172` 가 `isConflict`(409+412 — `http-error.ts:105-107`)로 잡아 **입력을 보존한 채** conflict 상태를 세우고, `FormPageShell.tsx:195` → `FormFeedback.tsx:58-74` 가 '최신 내용 불러오기'/'이어서 편집' 다이얼로그를 띄운다. 성공 토스트도 목록 이동도 없다 | `?status=certificates:save:409` 로 수정 저장 → 입력 유지 + 충돌 다이얼로그, success toast/navigation 0건. 목록에서 지워진 id 로 `/:id/edit` 저장 → ghost 'saved' 대신 충돌 다이얼로그. **잔여**: `CertItem` 에 `updatedAt`/`version` 이 없어(BE-019 §3) *동시 편집*은 last-write-wins — appliesTo 가 '엔티티에 updatedAt 존재'로 한정되고 acceptanceCheck 2건이 모두 통과하므로 pass 로 판정하되, **이 도메인은 덮어쓰기가 이미지 자산 고아를 만든다**는 추가 위험을 BE-019 §7.4 에 남겼다 | pass |
| EXC-08 | EXC | 직접 | 3중이다 — ① `FormPageShell.tsx:189` `disabled={saving \|\| loadingDetail}` ② `useCrudForm.ts:103,202-203` **동기 제출 락**(`submitLockRef`)이 RHF 비동기 검증 때문에 생기는 'saving 이 true 가 되기 전' 틈을 닫는다 ③ `useCrudForm.ts:118-123,205` **제출 시도 단위 멱등키**를 `mutationFn` **밖**(ref)에서 만들어 재시도가 같은 키를 재사용하고 성공 시 버린다(`214`). `onInvalid`(`239-241`)가 검증 실패 시 락을 푼다 | '등록' 더블클릭 / 응답 전 Enter 연타 → 정확히 1건 요청. 실패 후 재클릭 → 같은 `Idempotency-Key` | pass |
| EXC-09 | EXC | 직접 | 단일 predicate `isAbort`(`async.ts:40-42`)로 통일 — `useCrudList.tsx:110` 삭제 onError 가 abort 면 return(배너 없음), `86-89` `closeDelete` 가 `abort()` + `deleteItem.reset()`; `useCrudForm.ts:157` 쓰기 onError 가 abort 면 return, `92` 언마운트 시 abort; `bulk.ts:20` `settleAll` 이 **abort 를 실패 건수에서 제외**; `crud.ts:238` 이 `signal.aborted` 면 무효화도 하지 않는다 | 삭제 요청 중 Esc → 토스트 0건 + 버튼 상태 복원 + `isPending` 리셋. 저장 중 라우트 이탈 → 실패 배너 0건. 일괄 중 취소 → 부분 실패 건수에 abort 미포함 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **22** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · FEEDBACK-04 · **A11Y-11** · A11Y-01 · A11Y-02 · **MOTION-02** · MOTION-03 · IA-01 · IA-05 · EXC-01 · EXC-02 · EXC-04 · EXC-08 · EXC-09 |
| 종속 | **0** | — (상속 항목이라도 이 화면이 소비하는 표면의 코드를 전부 직접 읽어 pass/gap 으로 확정했다) |
| n-a | **3** | COMP-10 · FEEDBACK-06 · A11Y-12 |
| **gap** | **5** | **MOTION-01 · IA-02 · IA-04 · IA-13 · EXC-03** |
| **합계** | **30** | 22 + 0 + 3 + 5 = **30** ✅ |

> **이번 기준 갱신(`4b805ad` → `a5c2639`)으로 P0 2건이 gap → pass 로 뒤집혔다.** **A11Y-11** — PR #30 이 `ImageUploadField` 의 required 를 **접근성 이름**(`requiredNameSuffix` — `ImageUploadField.tsx:55,250`)으로 AT 에 이었다. 직전 판정은 이것을 '`aria-required` 미주입' 이라 적었으나, **`aria-required` 는 `role=button` 에 붙일 수 없는 속성이라 애초에 그 방법이 오답이었다**(근거 `ImageUploadField.tsx:44-54`) — DS 는 더 정확한 경로를 골랐고 그 판단을 테스트가 고정한다(`ImageUploadField.test.tsx:114` 가 `aria-required` **부재**를 단언한다). **MOTION-02** — PR #26 이 Toast exit 를 CSS-only 로 완전 구현했다(`Toast.css:32-37`·`:121-131`, `Toast.tsx:186-187` 이 `onAnimationEnd` 로 큐 제거를 미룬다).
>
> **P0 gap 5건 → quality-bar §How to use 상 이 화면은 여전히 acceptance 실패다.** 형제 화면(NFR-017 연혁)과 비교하면 **IA-13 만 이 화면 고유**다(연혁은 필터가 없어 N/A). 나머지 4건은 공용 계층(DS Modal · AppHeader/nav-config · CrudListShell · permissions 배선)에서 발생해 두 화면에 동일하게 걸린다. **MOTION-01 의 잔여 사유는 이제 매우 좁다** — 오버레이 모션 자체는 구현됐고, `ConfirmDialog` 의 **footer 버튼 경로만** exit 애니메이션 밖이다(`Modal.tsx:27-31`).

> **P0 밖의 최대 위험은 따로 있다** — **이미지가 저장되지 않는다**(§3 EXC-15 · FS-019 §7 #1 · BE-019 §7.6). quality-bar 의 P0 30건 중 어느 것도 이 결함을 잡아내지 못한다(업로드 심 부재는 EXC-15 P1 의 영역이다). **P0 전량 통과가 이 화면의 동작을 보장하지 않는다는 반례다.**

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| **EXC-15** | **P1** | **이 화면의 최대 결함.** ① 업로드 전 client 검증은 성립 — `ImageUploadField.tsx:37-43` `imageFileError` 가 `image/*` 아님·5MB 초과를 막고 위반 시 값을 바꾸지 않은 채 인라인 에러(`:317` `role="alert"`)로 거절한다(요청 미발사 — 애초에 요청이 없다). ② load 실패 fallback 성립 — `ImageThumb.tsx:42-48` 이 `role="img"` + `aria-label` placeholder, `36-40` 이 `src` 변경 시 failed 플래그 리셋. ③ **progress·cancel 경로가 없다** — `createObjectURL` 이 동기라 진행 상태가 존재하지 않는다. ④ **그리고 근본 문제: 업로드 자체가 없다.** `ImageUploadField.tsx:192` 가 `URL.createObjectURL(file)` 의 `blob:` URL 을 폼 값에 넣고 파일을 전송하지 않으며, `:172`·`:179` 가 교체·언마운트 시 `revokeObjectURL` 로 **그 URL 을 스스로 무효화한다** — 저장 후 목록으로 돌아가는 순간 이미 깨져 있다. 컴포넌트 헤더 `:13-20` 이 이것을 **계약대로의 동작**(mock 은 `createObjectURL`, 백엔드가 붙으면 교체)이라 명시한다 — 결함의 소재는 컴포넌트가 아니라 **업로드 심의 부재**다 | 이미지를 올리고 등록 → 목록 썸네일이 placeholder. F5 → 전부 placeholder. 수정 진입 → '이미지를 불러오지 못했습니다'. `certificates.test.ts:95` 가 `blob:abc-123` 통과를 **계약으로 단언**한다 | **gap (치명)** |
| STATE-03 | P1 | `useCrudListQuery`(`crud.ts:151`)가 `placeholderData: (previous) => previous`, `queryClient.ts:24,47` `staleTime: 30_000`. `CrudListShell.tsx:118-120` 이 재조회 중 건수를 유지한 채 '새로고침 중…'만 덧붙인다. **필터 변경은 재조회를 유발하지 않아**(클라이언트 필터) 이 축의 위험이 애초에 없다 | 등록 후 목록 복귀 → 이전 행 유지. 30초 내 재진입은 network refetch 없음 | pass |
| STATE-05 | P1 | Empty 3분기 중 **2개가 실제로 도달한다**. 필터 0건 → `CertificatesListPage.tsx:122-125` 가 `empty={{ hasActiveFilters: filter !== CERT_FILTER_ALL, onResetFilters: () => setFilter(CERT_FILTER_ALL) }}` 를 넘겨 `Empty.tsx:74,94-98` 이 '필터에 맞는 인증서/특허가 없습니다' + **'필터 초기화'** 를 그린다(조사 '가'도 `hasBatchim` 이 자동 계산). 검색이 없어 'search' 분기는 도달 불가. **`createAction`(생성 CTA)이 없어** 진짜 빈 상태는 '등록된 인증서/특허가 없습니다' 만 보인다 | '특허' 필터 + 특허 0건 → '필터 초기화' 버튼 동작 (통과). 시드 0건 + 필터 '전체' → primary create CTA 없음 (반증) | 부분 gap |
| STATE-06 | P1 | `crud.ts:180,199-201,219` 가 create/update/delete 성공 시 list(+detail)만 정확히 무효화. 다른 의존 쿼리 없음 | 등록 후 목록 복귀 → 수동 새로고침 없이 새 행 | pass |
| A11Y-03 | P1 | `ConfirmDialog.tsx:132-158` 이 `Modal` 에 `initialFocusRef` 를 넘기지 않는다 → `Modal.tsx:91-93` 이 `focusables()[0]` 로 폴백하는데 DOM 순서상 첫 focusable 은 **헤더 닫기(×)**(`Modal.tsx:169`)다. delete/discard intent 에서 Cancel 에 초기 포커스가 가야 한다는 요구와 어긋난다 | 삭제 다이얼로그 open → `document.activeElement` 가 Cancel 이 아니라 `aria-label="닫기"` 버튼 | gap |
| A11Y-05 | P1 | 구분 select 와 목록 필터 select 가 `SelectField`(`SelectField.tsx:57`)로 `aria-invalid` 를 AT 에 전달하고, 폼 호출부가 `aria-describedby` 를 넘긴다(`CertificatesFormPage.tsx:142`). 필터 select 는 `aria-label="구분 필터"`(`CertificatesListPage.tsx:93`) | 구분 위반 제출 → `<select aria-invalid="true" aria-describedby="cert-kind-error">` | pass |
| A11Y-06 | P1 | `AppShell.tsx:429` `<SkipToMain />` 이 셸의 첫 focusable, `474` `<main id="tds-main" tabIndex={-1}>` | 첫 Tab → skip link, 활성화 → main 포커스 | pass |
| A11Y-07 | P1 | `AppShell.tsx:324-340` `RouteFocusAnnouncer` 가 pathname 변경 시 main 포커스 + polite live region 주입 | 목록 → 등록 이동 시 포커스가 main 으로. **announce 되는 이름이 IA-02 와 같은 이유로 '기업 관리'** | pass(문구는 IA-02 gap 에 종속) |
| A11Y-08 | P1 | `CrudTable.tsx:172` 가 `rowActivateProps` 로 행 클릭 이동을 붙이지만 **행 안에 같은 목적지로 가는 focusable 링크가 없다** — 명칭·발급기관·발급일 셀이 plain text, 이미지 셀은 `<img>`/placeholder(`CertificatesListPage.tsx:74-85`). `useRowNavigation.ts:9-11` 이 스스로 '접근 가능한 경로가 이미 존재한다는 전제 위에서만 쓴다' 고 못 박았는데 그 전제가 성립하지 않는다 | 행을 Tab → 체크박스 → 연필 → 휴지통. 명칭 링크 없음 | gap(연필 버튼이 등가 경로라는 해석이면 완화 — UI 기획 판단 필요) |
| A11Y-13 | P1 | 제출 검증 실패 시 첫 invalid 필드 포커스는 성립 — `useCrudForm.ts:253` `handleSubmit(onValid, onInvalid)` + RHF `shouldFocusError`. **폼 진입 시 첫 필드 자동 포커스는 없다** — `CertificatesFormPage.tsx` 에 `setFocus`/autoFocus 0건 | 빈 폼 제출 → activeElement = 명칭 입력 (통과). `/new` 진입 직후 activeElement = body (반증) | 부분 gap |
| A11Y-14 | P2 | `ImageUploadField.tsx:279` 의 '업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있습니다.' 가 **plain `<span>`** 이다 — 그 컴포넌트 전체에 `role="status"`/`aria-live` grep = **0건**이라 announce 되지 않는다. 로드 실패 문구(`:116`)도 마찬가지. **PR #30 이 이 몰리큘의 A11Y-11(required) 축은 닫았으나 이 축은 손대지 않았다** — 상태 변화 announce 는 별개 요구다 | 유효 이미지 선택 → 스크린리더가 완료를 알리지 않음. `grep -n 'aria-live\|role="status"' packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx` → 0건 | gap |
| A11Y-16 | P1 | 이 화면이 새로 만든 인터랙티브 표면은 없다 — 전부 DS/공용 프레임워크 소비 | — | 종속 |
| MOTION-04 | P1 | `CrudTable.tsx:171-201` 행이 add/remove 시 snap in/out(FLIP 없음). **Motion 라이브러리는 여전히 없고**(package.json 19개 · import · lockfile 전부 0건) 행 재배치는 CSS keyframes 로 표현하기 어려운 축이라 Modal/Toast 가 간 CSS-only 경로를 그대로 쓸 수 없다 — MOTION-01/02 와 뿌리가 갈렸다 | 행 삭제 → 나머지 행이 즉시 점프 | gap |
| MOTION-08 | P1 | **뒤집혔다(gap → pass) — PR #26 이 recipe 를 만들고 두 오버레이가 소비한다.** `component.overlay` 4토큰이 실재하고(`tokens/tokens.json:1286-1308` — `enter-duration` `{motion.duration.normal}` 250ms · `enter-easing` `{motion.easing.decelerate}` · `exit-duration` `{motion.duration.fast}` 150ms · `exit-easing` `{motion.easing.accelerate}`), `Modal.css:20-22,24-37` 과 `Toast.css:30,35-36` 이 **같은 recipe** 를 소비한다 — 주석이 그 의도를 명시('오버레이는 한 몸처럼 움직인다'). `easing.accelerate` primitive `tokens/tokens.json:486` = `cubic-bezier(0.4, 0, 1, 1)` | 삭제 다이얼로그·토스트의 exit 가 `--tds-component-overlay-exit-*` 를 소비 → duration 150ms · timing-function `cubic-bezier(0.4, 0, 1, 1)` | pass |
| IA-03 | P1 | breadcrumb 부재 — `AppHeader.tsx` 는 단일 라벨만 그린다 | 등록 화면에 trail 0건 | gap |
| IA-07 | P1 | `FormPageShell.tsx:147-155` '목록으로' + `ChevronLeftIcon` + 좌상단 — 표준 일치 | 폼 back-link 문구·아이콘·위치 일치 | pass |
| IA-08 | P1 | `FormPageShell.tsx:179-191` 카드 **안** 우측에 취소(secondary) → 저장(primary) | in-card footer 우측 | pass |
| IA-14 | P1 | 반응형 미선언 — 사이드바 폭 고정(`AppShell.tsx:83`), `CrudTable` 에 가로 scroll 컨테이너 없음. **이 화면은 컬럼이 8개(선택·순번·이미지·명칭·발급기관·발급일·구분·액션)라 형제 화면보다 넓다** | 768/375px 에서 사이드바 collapse 없음, 8컬럼 표 overflow | gap(앱 전역, 이 화면에서 더 심함) |
| ERP-01 | P1 | 구분 → tone 매핑이 **이 화면 로컬**이다 — `types.ts:40-42` `certKindTone` 이 patent→success, certificate→info 를 직접 정한다. 공유 status→tone 레지스트리가 없다. 다만 `kind` 는 lifecycle status 가 아니라 분류라 ERP-01 의 대상('대기/승인/반려…')과 결이 다르다 | `certKindTone` 이 per-page helper | 부분 gap(대상 여부는 UI 기획 판단) |
| ERP-06 · ERP-13 | P1 | 리터럴 조사 출하 — `useCrudForm.ts:222` '인증서/특허를 등록했습니다.', `useCrudList.tsx:108,158` `'<명칭>'을(/를) 삭제합니다.`, `shared/crud/validation.ts:14` '명칭을 입력하세요.'. `Empty.tsx:17-27` 만 josa 를 계산한다. **엔티티 라벨 '인증서/특허' 는 슬래시를 포함해 josa 계산에도 어색하다** | 사용자 대상 문자열 `'을(를)'` grep > 0 | gap |
| **ERP-08** | P2 | **발급일이 공유 formatter 를 거치지 않는다** — `CertificatesListPage.tsx:78` 이 `render: (item) => item.issuedOn` 으로 저장 문자열('2023-04-12')을 그대로 렌더한다. `shared/format` 의 날짜 헬퍼를 쓰지 않아 앱의 ko-KR 표기 규칙 밖에 있다. (형제 화면 연혁은 반대로 `formatNumber` 를 연도에 **잘못** 적용했다 — 같은 뿌리의 반대 증상) | 발급일 셀이 'YYYY-MM-DD' raw. 셀에 raw toString/문자열 통과 | gap |
| ERP-15 | P1 | 필터된 전 행 렌더(IA-04). virtualization·page-size cap 없음. **행마다 이미지 요청이 붙는다** | 인증서 1,000건 → 1,000행 + 1,000 이미지 요청 | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 앱 전체 0건. `async.ts:15-32` `wait` 에 ceiling 없음. **업로드가 생기면 5MB 전송에 상한이 특히 필요하다**(BE-019 §7.6 #6) | never-resolving fixture → 무한 spinner | gap(앱 전역) |
| EXC-06 | P1 | `HttpError`(`http-error.ts:45-61`)가 status 를 지니고 화면이 404/409/412/422 로 분기. **403·429 는 전용 surface 가 없다** — 일반 배너로 수렴 | `?status=certificates:save:403` → '저장하지 못했습니다' 일반 배너 | 부분 gap |
| EXC-07 | P1 | `useCrudForm.ts:182-192` 이 422 `violations` 를 RHF `setError` 로 각 입력에 꽂고 첫 필드로 포커스. **서버가 필드 거절을 400 으로 주면 이 경로를 타지 않는다** — BE-019 §7.8 #6 | 실제 백엔드 연결 후 재판정 | 종속(BE-019) |
| EXC-10 | P1 | **`crud.ts:239` 가 `failed === 0` 일 때만 목록을 무효화한다** → 부분 실패 시 이미 삭제된 행이 표에 남는다. `useCrudList.tsx:126,144` 가 실패 시 선택을 유지하므로 재클릭이 **성공분까지 다시 DELETE** 하고, 그것들은 `crud.ts:83` 의 409 로 떨어져 실패 건수가 늘어난다. `settleAll`(`bulk.ts:19-21`)이 건수만 돌려주고 실패 id 를 주지 않아 '실패분만 재시도'가 구조적으로 불가능 | 3건 선택 + 부분 실패 재현 → 삭제된 행 잔존, 재클릭 시 실패 건수 증가 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 앱 전체 0건 | offline 토글 → 배너 없음 | gap(앱 전역) |
| EXC-12 | P1 | `useCrudForm.ts:144-149` 이 `isNotFound` 로 `loadFailure` 를 'not-found'/'error' 로 가르고, `FormPageShell.tsx:115-142` 가 404 는 '목록으로'만·그 외는 '다시 시도'+'목록으로' | 없는 id 로 `/:id/edit` → '인증서/특허를 찾을 수 없습니다…' + '목록으로'만. `?fail=certificates:detail` → '다시 시도' 포함 | pass |
| EXC-14 | P1 | 이 화면에 optimistic write 가 없다(전부 비관적) — un-rolled-back optimistic 0건 | 인라인 토글·재정렬 표면 없음 | pass(N/A 성) |
| EXC-18 | P1 | `useCrudList.tsx:41` `toggleAll(ids, checked)` 가 **필터된 보이는 행**만 토글한다(`CrudListShell.tsx:143-147` 이 `visibleItems` 를 넘긴다) — scope 는 명확하다. **Shift-range·대량 confirm 강화·progress·cancel 이 없다** | 전 행 선택 후 일괄 삭제 → count 만 표시, progress/cancel 없음 | gap |
| EXC-20 | P1 | `useCrudForm.ts:195` `referenceOf(cause)` + `FormFeedback.tsx:38-47` 이 '오류 코드 TDS-…' 를 `userSelect: all` 로 보인다. raw body/stack 미노출 | `?status=certificates:save:500` → 친근한 문구 + 복사 가능한 reference | pass |
| COMP-12 | P2 | **명칭·발급기관에 카운터가 없다** — `CertificatesFormPage.tsx:98,114` 가 raw input + `maxLength` 라 상한에서 조용히 입력이 멈춘다. 형제 화면(연혁)의 `TextareaField` 는 카운터를 보인다 | 명칭 100자 입력 → 예고 없이 멈춤 | gap |
| COMP-06 | P2 | `CrudTable.tsx:144` `Array.from({ length: 5 })` — 하드코딩 5행. PAGE_SIZE 가 없어 대응물도 없다 | skeleton row 수 = 5 고정 | gap |
| COMP-09 | P2 | 명칭 셀(`CertificatesListPage.tsx:76`)·발급기관 셀(`77`, nowrap)에 truncation 없음 — 100자가 그대로 렌더돼 컬럼을 민다 | 100자 명칭 → 셀이 늘어남 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 |
|---|---|---|
| 목록 조회 p95 | **400ms**(서버 처리, BE-019 §2 상한 5초 내) | 측정 불가 — 백엔드 없음 |
| 첫 렌더(스켈레톤 등장) | 100ms 이내 | 라우트 코드가 정적 import(`App.tsx:58-59`) |
| **이미지 로드** | **썸네일 ≤ 50KB · 지연 로드** | **미준수** — `ImageThumb` 에 `loading="lazy"`·`srcset`·크기 제약이 없다(`ImageThumb.tsx:51-57`). 행마다 원본 이미지를 받는다 |
| 업로드 상한 | **5MB · 30초**(BE-019 §7.6 #3·#6) | 클라이언트 5MB 만(`ImageUploadField.tsx:136` `DEFAULT_MAX_SIZE_MB = 5`, 기본값 배선 `:152`). **서버 정본 없음 — 우회 가능** |
| 목록 → 폼 이동 | 재조회 없음 | 폼은 `fetchOne` 1회. `staleTime: 30s` 라 목록 복귀 시 재조회 없음 |
| 재조회 횟수 | 화면당 1회 + 쓰기 성공당 1회 | `refetchOnWindowFocus: false` · `retry: false`(`queryClient.ts:59,67`). **구분 필터 변경은 재조회 0회**(클라이언트 필터) |
| 목록 DOM 노드 | **행 200개 이하** | **예산 미준수 위험** — 상한이 없다(IA-04 gap). 행마다 `<img>` 가 붙어 연혁보다 비용이 크다 |
| 메모리 | 픽스처 배열 1벌(`crud.ts:40` 클로저) | **추가 위험**: `blob:` URL 이 revoke 되지 않고 폼 값에 남으면 파일이 메모리에 유지된다. `ImageUploadField.tsx:170-175` 가 언마운트 시, `:177-183`(`revokePrevious`)이 교체 시 revoke 하지만, **그 revoke 가 곧 §3 EXC-15 의 결함이다** — 자원 해제와 데이터 보존이 충돌한다 |
| 번들 | 이 화면 전용 코드 ≈ 7KB(4파일) | 공용 CRUD 키트 공유 |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 성능 예산이 아니다.** 픽스처 응답에 인위적 지연을 넣어 **로딩 상태를 화면에서 볼 수 있게** 하는 개발용 상수다. 백엔드가 붙으면 사라진다 — SLO 로 읽지 마라.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 재시도 | 충족 (STATE-02) |
| 렌더 예외 | 셸 유지 + 복구 UI | 충족 (EXC-01) |
| 세션 만료 | 재인증 + 원경로 복원 | 충족 (EXC-02). **단 dirty 폼 draft 유실**(EXC-19) |
| 다른 관리자가 먼저 삭제 | 유령 저장 금지 + 충돌 안내 | 충족 (EXC-04) |
| 다른 관리자와 동시 수정 | 덮어쓰기 금지 | **미충족** — last-write-wins. **덮어쓰기가 이미지 자산 고아를 만든다**(BE-019 §7.4) |
| **이미지 저장** | **새로고침 후에도 보인다** | **미충족 — 이 화면의 핵심 기능이 동작하지 않는다**(§3 EXC-15 · BE-019 §7.6) |
| 이미지 로드 실패 | placeholder fallback | 충족 (`ImageThumb.tsx:42-48` `role="img"`) — **다만 지금은 이것이 정상 경로다** |
| 일괄 삭제 부분 실패 | 실패분만 재시도 | **미충족** — 성공분까지 재요청 (EXC-10) |
| 네트워크 단절 | 배너 + 쓰기 게이트 | **미충족** (EXC-11) |
| 응답 없음(무한 대기) | ceiling abort + 재시도 | **미충족** (EXC-05) |
| 서버 5xx | 친근한 문구 + reference | 충족 (EXC-20) |

### 4.3 데이터 보존 · 감사

| 축 | 현재 |
|---|---|
| 삭제 | **하드 삭제 · undo 없음**(`crud.ts:86`). 확인 다이얼로그가 유일한 방어. **연결된 이미지 자산의 회수 정책이 미정**(BE-019 §7.6 #5) |
| **이미지 자산** | **저장되지 않는다**(§3 EXC-15). 업로드 심이 생기면 고아 파일(등록 취소·이탈·삭제·덮어쓰기) 회수 정책이 함께 필요하다 — BE-019 §7.6 #5 |
| 미저장 입력 | 3경로 이탈 가드로 보호(FEEDBACK-04). **이미지 선택도 dirty 로 잡힌다**(`CertificatesFormPage.tsx:159`). 단 세션 만료 redirect 는 programmatic navigate 라 가드가 발화하지 않아 유실(EXC-19) |
| 감사 로그 | 누가 언제 인증서를 바꿨는지 기록이 없다 — `CertItem` 에 `updatedAt`·`updatedBy` 부재. BE-019 §7.4 의 `version` 도입 시 함께 정한다 |
| 인증서의 성격 | 인증서·특허는 **회사의 대외 신뢰 근거**이며 고객 페이지에 공개된다. 위조·오등록의 파급이 연혁보다 크다 — 하드 삭제 + 감사 부재 + **이미지가 저장조차 되지 않는 현 상태**의 조합은 이 화면이 아직 운영 가능하지 않음을 뜻한다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **EXC-15** | P1(**실질 최우선**) | **이미지가 저장되지 않는다** — `ImageUploadField.tsx:178-181` 이 `blob:` URL 을 폼 값에 넣고 파일을 전송하지 않으며, `138-143` 이 언마운트 시 스스로 revoke 한다. 업로드 심 부재(BE-019 EP-06). progress/cancel 도 없다. **P0 30건 중 어느 것도 이 결함을 잡지 못한다** | DS(`ImageUploadField`) + 계약 + 이 화면 | **백엔드 명세 · UI 기획 · DS 소유자** |
| 2 | ~~**A11Y-11**~~ | ~~P0~~ | **해소됨(PR #30) — 이관 취소.** 폼 컨트롤 4종의 required 는 F3a 의 `FormField.withAriaRequired`(`FormField.tsx:50-56`, 주입 지점 `:107`)가, 마지막 남은 `ImageUploadField`(`CertificatesFormPage.tsx:156`)는 PR #30 의 **접근성 이름 꼬리표**가 닫았다 — `requiredNameSuffix`(`ImageUploadField.tsx:55`, 적용 `:250`, export `index.ts:2`). **직전 이관 사유였던 '`aria-required` 0건' 은 결함이 아니라 의도였다**(`ImageUploadField.tsx:44-54` — `aria-required` 는 `role=button` 미지원 속성이라 얹으면 axe `aria-allowed-attr` 위반이고, 진짜 `<input type="file">` 은 `aria-hidden`+`tabIndex=-1` 이라 AT 가 못 본다). 회귀 방어선 `ImageUploadField.test.tsx:102-120`. **NFR-020·NFR-021 도 같은 수정으로 함께 닫혔다** | — | — |
| 3 | **MOTION-01** | **P0** | **사유 전면 교체(PR #26).** '리포에 Motion 라이브러리가 없어 enter/exit 가 없다' 는 **낡았다** — backdrop fade + dialog scale 이 CSS-only 로 구현됐고(`Modal.css:20-21,30-38,58-59`, keyframes `:126-168`), `onAnimationEnd`(`Modal.tsx:216-218`)가 AnimatePresence 없이 'exit 완료 후 unmount' 를 달성한다. **남은 것은 경로 한 종류** — `ConfirmDialog` 의 **footer 버튼(취소 `ConfirmDialog.tsx:145` · 확인 `:153`)이 `Modal` 을 거치지 않고 호출부 콜백 직행**이라 즉시 언마운트된다(`Modal.tsx:27-31` 이 이 한계를 명시). 이 화면의 다이얼로그 4종이 전부 ConfirmDialog 라 **주 닫힘 경로가 정확히 미커버 구간**이다. `Modal.tsx:30-31` 이 제안하는 설계(`requestClose` 를 context 로 내려 ConfirmDialog 가 흡수)가 최소 수정이다 | DS(`Modal`·`ConfirmDialog`) — 화면 수정으로 닫히지 않는다 | DS 소유자 |
| 4 | ~~**MOTION-02**~~ | ~~P0~~ | **해소됨(PR #26) — 이관 취소.** Toast exit 가 CSS-only 로 완전 구현됐다 — `Toast.css:32-37`(`tds-toast-out … forwards`) · keyframes `:121-131` · reduced-motion 게이트 `:136-141`. `ToastProvider.tsx:99-100` 의 `filter` 는 여전히 최종 제거지만, `Toast.tsx:186-187` 이 `onAnimationEnd` 로 **그 호출을 퇴장 애니메이션 뒤로 미룬다**. `component.overlay` recipe 소비로 exit = fast(150ms)/accelerate — 요구 문구를 정확히 충족 | — | — |
| 5 | **IA-02** | **P0** | 하위 라우트 제목이 가지 라벨 '기업 관리' 로 폴백(`nav-config.ts:260`)하고 본문 h1 과 **둘이 공존**한다 | 앱 전역(`AppHeader`·`findNavLabel`) | 프론트 구현 / UI 기획 |
| 6 | **IA-04** | **P0** | Pagination 부재 — `CrudListShell` 이 필터된 전 행 + 전 썸네일을 렌더한다 | 공용(`CrudListShell`) → 형제 화면 동일 | UI 기획 / 프론트 리팩터 |
| 7 | **IA-13** | **P0** | **구분 필터가 URL 에 없다** — `CertificatesListPage.tsx:51` `useState`. F5·Back·링크 공유로 '전체'로 초기화된다. `useListState` 미소비. **형제 화면(연혁) 대비 이 화면 고유의 P0 gap** | **이 화면 고유** | UI 기획 / 프론트 리팩터 |
| 8 | **EXC-03** | **P0** | write-action 게이팅 미배선. **⚠ 범위 정정(F3b 이후)**: `useRouteWritePermissions` 소비자는 이제 **7곳**이다(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`) — **`pages/company/**` 만 그 목록에 없다**(`grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**). '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`) | **기업 관리 섹션 전체**(앱 전역 아님) | UI 기획 쪽 변경 요청 |
| 9 | EXC-10 | P1 | 일괄 삭제 부분 실패 시 무효화 누락(`crud.ts:239`) + 재시도가 성공분을 재삭제해 실패 건수 증가 | 공용(`crud.ts`·`bulk.ts`) | UI 기획 / 프론트 리팩터 / 백엔드 명세 |
| 10 | ERP-08 | P2 | 발급일이 `shared/format` 을 거치지 않고 raw 문자열 렌더(`CertificatesListPage.tsx:78`) | 이 화면 | UI 기획 |
| 11 | STATE-05 | P1 | 필터 0건 분기는 정상. **진짜 빈 상태에 생성 CTA 없음** | 이 화면 + 공용 껍데기 | UI 기획 |
| 12 | A11Y-03 | P1 | ConfirmDialog 초기 포커스가 Cancel 이 아니라 닫기(×) | DS(`ConfirmDialog`) | DS 소유자 |
| 13 | A11Y-08 | P1 | 행 클릭 이동의 키보드 등가 링크 부재 | 공용(`CrudTable`) | UI 기획 |
| 14 | A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스 없음 | 공용(`useCrudForm`) | 프론트 리팩터 |
| 15 | A11Y-14 | P2 | `ImageUploadField` '업로드 완료'·로드 실패가 live region 밖 | DS(`ImageUploadField`) | DS 소유자 |
| 16 | COMP-12 | P2 | 명칭·발급기관에 글자수 카운터 없음 | 이 화면 | UI 기획 |
| 17 | IA-03 | P1 | breadcrumb 부재 | 앱 전역 | 프론트 구현 / UI 기획 |
| 18 | IA-14 · ERP-15 | P1 | 반응형 미선언 · 대형 리스트 계약 부재. **8컬럼 + 썸네일이라 형제 화면보다 심각** | 앱 전역 | UI 기획 / 프론트 구현 |
| 19 | ~~ERP-13~~ · ERP-06 | P1 | **ERP-13 해소됨(통합) — 이관 취소.** **해소됨(통합) — 이관 취소.** 조사 헬퍼가 `shared/format.ts:269+` 로 승격돼 `requiredText`(`shared/crud/validation.ts:17,21,24`) · `useCrudForm.ts:222` · `useCrudList.tsx:108,158` 이 전부 그것을 소비한다. `pages/company/` 의 사용자 대상 조사 리터럴 **0건**. **남은 것은 ERP-06 의 라벨 축 하나**: 엔티티 라벨이 `'인증서/특허'` 라 조사 파생이 슬래시 뒤 '특허'(받침 없음)를 보고 `를` 를 고른다 — 문법은 맞지만 '인증서/특허를 저장했습니다.' 는 라벨 자체가 어색하다(조사 헬퍼가 아니라 라벨 설계 문제) | 이 화면(라벨) | UI 기획 |
| 20 | ERP-01 | P1 | `certKindTone` 이 per-page helper — 공유 레지스트리 부재(대상 여부는 UI 기획 판단) | 이 화면 | UI 기획 |
| 21 | EXC-05 · EXC-11 | P1 | client timeout · offline 감지 부재. **업로드 도입 시 timeout 이 특히 필요** | 앱 전역 | 프론트 구현 / UI 기획 |
| 22 | EXC-06 | P1 | 403·429 전용 surface 없음 | 공용 | UI 기획 / 백엔드 명세 |
| 23 | EXC-18 | P1 | Shift-range · 대량 confirm · progress · cancel 부재 | 공용 | UI 기획 |
| 24 | MOTION-04 · MOTION-08 | P1 | 행 FLIP · easing recipe 부재(MOTION-01/02 종속) | DS · 앱 전역 | DS 소유자 |
| 25 | COMP-06 · COMP-09 | P2 | skeleton `length: 5` 하드코딩 · 명칭/발급기관 truncation 없음 | 공용(`CrudTable`) + 이 화면 | 프론트 리팩터 |
| 26 | — | — | **동시 편집 last-write-wins + 이미지 자산 고아**(EXC-04 acceptanceCheck 는 통과하나 잔여 위험) | 계약 | 백엔드 명세 (BE-019 §7.4) |
| 27 | — | — | **이미지 URL 스킴 화이트리스트 미적용** — `requiredImage` 가 형식을 강제하지 않아 `blob:`·`data:`·`javascript:` 가 전부 통과한다(`certificates.test.ts:95` 가 이를 단언). **§7.5 와 업로드 심(§7.6)을 같은 배치에서 켜야 한다** | 계약 + 검증 | **백엔드 명세 (BE-019 §7.5)** |
| 28 | EXC-19 | P1 | 세션 만료 redirect 시 dirty 폼 draft 유실 | 앱 전역 | 프론트 구현 / UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행.** 이 문서의 판정 근거는 **코드 대조**다. 아래는 판정을 확인·반증하기 위해 무엇을 구동해야 하는가의 목록이며, 이 화면의 e2e 스펙은 현재 존재하지 않는다(`e2e/` 에 certificates 스펙 0건).

### 6.1 이 화면에서 실제로 동작하는 스위치

`shared/crud/dev.ts` 가 소유한다. 이 화면의 어댑터 scope 는 **`'certificates'`**(`data-source.ts:40` `scope: 'certificates'`)이고, op 는 `createCrudAdapter` 가 고정한 **4종**뿐이다.

| op | 발생 지점 (crud.ts) | 이 화면의 표면 |
|---|---|---|
| `list` | `fetchAll` — `45` | 목록 조회 (FS-019-EL-009) |
| `detail` | `fetchOne` — `50` | 수정 진입 시 상세 조회 (FS-019-EL-023) |
| `save` | `create` — `61` · `update` — `66` | 등록·수정 저장 (FS-019-EL-014 / EL-025) |
| `delete` | `remove` — `79` | 단건·일괄 삭제 (FS-019-EL-010.1 / EL-011.1) |

> **이미지 업로드에는 op 가 없다** — 어댑터를 타지 않으므로(§3 EXC-15) `?fail=`·`?status=` 로 업로드 실패를 재현할 수단이 **존재하지 않는다**. BE-019 §7.6 이 해소되면 `upload` op 을 추가해야 한다.

**`?fail=` (generic Error)** — `dev.ts:81-93`
```
?fail=list                    # op 지정 (전 scope)
?fail=certificates:list       # scope:op 지정 — 이 화면만
?fail=save,delete             # 콤마 다중
?fail=all                     # 전 op
```

**`?status=` (특정 HTTP status)** — `dev.ts:56-71`. `?fail=` 은 언제나 같은 generic Error 를 던져 401/403/409/422 처럼 **UX 가 완전히 다른 실패**를 재현할 수 없어 추가된 스위치다.
```
?status=save:409              # 충돌 다이얼로그 (EXC-04)
?status=certificates:save:409
?status=list:401              # 재인증 경로 (EXC-02)
?status=save:403              # 권한 (EXC-03 서버 측)
?status=detail:404            # not-found 갈래 (EXC-12)
?status=save:422              # 필드 거절 (EXC-07 — violations 없이는 일반 배너)
?status=save:500              # 오류 코드 표시 (EXC-20)
?status=all:500
```
재현 가능 status(`dev.ts:27-37`): `400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500`.

### 6.2 이 화면에 **없는** 스위치

- **`?delay=` 는 이 화면에서 동작하지 않는다.** `shared/crud/dev.ts` 에 없다 — `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재한다. 이 화면의 지연은 `LATENCY_MS = 400` 고정(`dev.ts:12`)이며 URL 로 바꿀 수 없다. STATE-01 의 acceptanceCheck 가 `?delay=3000` 을 요구하지만 **이 화면에서는 그 절차를 그대로 쓸 수 없다** — 대신 재조회(등록 후 목록 복귀) 시 표가 스켈레톤으로 덮이는지로 판정한다.
- **이미지 업로드 실패·진행률 재현 스위치가 없다**(위 §6.1 참조).

### 6.3 코드 대조 도구

| 판정 | 명령 |
|---|---|
| TOKEN-01 | `rg '#[0-9a-fA-F]{3,6}\|[1-9][0-9]*px\|(outline\|border): (thin\|medium\|thick)' apps/admin/src/pages/company/certificates` |
| A11Y-11 | `rg -A2 'aria-invalid' apps/admin/src/pages/company/certificates`(짝 검사). **⚠ `rg 'aria-required'` 로 판정하지 마라 — 두 번 틀린다**: 폼 컨트롤 4종은 `FormField` 가 **런타임 `cloneElement`** 로 주입하므로 소스에 없고(`FormField.tsx:50-56,107`), `ImageUploadField` 는 **설계상 `aria-required` 를 쓰지 않고 접근성 이름으로 잇는다**(`ImageUploadField.tsx:44-54,250`). 판정은 **required FormField 자식의 타입** + **드롭존 접근성 이름에 `(필수)` 포함 여부** 로 한다 |
| MOTION-01/02 | `rg 'AnimatePresence\|framer-motion\|from .motion' --glob '!node_modules'` → **0건 — 단 이것은 '모션 없음' 의 근거가 아니다**(라이브러리 미도입의 근거일 뿐). 모션은 CSS-only 로 실재한다: `rg '@keyframes' packages/ui/src/organisms/Modal/Modal.css` → **4건** · `packages/ui/src/molecules/Toast/Toast.css` → **2건**. MOTION-01 의 잔여 gap 은 `rg 'onClick=\{onCancel\}\|onClick=\{onConfirm\}' packages/ui/src/organisms/ConfirmDialog` → `:145`·`:153`(Modal 을 우회하는 footer 경로) |
| EXC-03 | `rg 'useRouteWritePermissions\|useRouteCan' apps/admin/src/pages/company` → **0건**. ⚠ 같은 rg 를 `apps/admin/src/pages` 전체로 넓히면 **7곳**(products 3 · settings 4) — '정의 파일 1건뿐' 이라는 직전 판정은 폐기됐다 |
| IA-04 | `rg 'Pagination' apps/admin/src/shared/crud` → 0건 |
| **IA-13** | `rg 'useListState\|useSearchParams' apps/admin/src/pages/company/certificates` → **0건**. `rg 'useState<CertFilter>' apps/admin/src/pages/company/certificates` → `CertificatesListPage.tsx:51` |
| **EXC-15 / BE-019 §7.5** | `rg 'createObjectURL\|revokeObjectURL' packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx` → `:192`(생성) · `:172`(언마운트 revoke) · `:179`(교체 revoke). `rg 'blob:' apps/admin/src/pages/company/certificates` → `certificates.test.ts:95`(통과 단언) |
| 단위 테스트 | `pnpm vitest run apps/admin/src/pages/company/certificates` — `certificates.test.ts` 는 `sortCertificates`·`filterCertificates`·`certKindLabel/Tone`(순수) + `certSchema`(검증)만 덮는다. **렌더·상호작용·업로드 테스트 0건** |

## 7. 자기 점검

- [x] P0 30건을 지정된 순서로 **전수** 판정했다 — 빈칸 0건
- [x] §2.1 산수 검산: pass 22 + 종속 0 + n-a 3 + gap 5 = **30** ✅
- [x] 모든 `N/A` 에 '표면이 없다'는 **구체적 사유**를 적었다 (COMP-10·FEEDBACK-06·A11Y-12)
- [x] 모든 `pass` 에 파일:라인 코드 근거를 적었다
- [x] 모든 `gap` 에 재현 가능한 측정 기준(무엇을 하면 반증되는가)을 적었다
- [x] quality-bar 요구 문구를 복제하지 않고 **ID 로만 참조**했다
- [x] `LATENCY_MS = 400` 이 예산이 아님을 §4.1 에 명시했다
- [x] `?fail=` scope(`certificates`)와 op 4종을 **어댑터 코드에서 확인**해 §6 에 적었다. `?delay=` 와 업로드 재현 스위치가 이 화면에 없음을 명시했다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1.1·§6 에 명시했다
- [x] FS-019 §7 ↔ BE-019 §7.8 ↔ 이 문서 §5 의 상호 참조를 일치시켰다
- [x] 이 화면이 공용 모듈을 **실제로 소비하는지** 확인했다 — `useListState`(IA-13 gap 의 원인) · `useDebouncedSearch`(COMP-10 N/A) · `useModalDirtyGuard`(FEEDBACK-06 N/A) · `useCrudRowUpdate`(EXC-14 N/A)는 **쓰지 않는다**
- [x] **P0 전량이 이 화면의 동작을 보장하지 않는다는 사실**(이미지가 저장되지 않는데 P0 는 그것을 잡지 못한다)을 §2.1 과 §3 EXC-15 에 명시했다
