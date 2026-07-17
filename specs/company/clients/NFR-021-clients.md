---
id: NFR-021
title: "고객사 관리 비기능 명세"
functionalSpec: FS-021
backendSpec: BE-021
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-021. 고객사 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-021 고객사 관리 (`/company/clients`) — 구현: `pages/company/clients/**` + 공용 골격 `pages/company/logo-list/**` |
| 상위 기준 정본 | `specs/quality-bar.md` (9차원 100요구 · P0 30건). **이 문서는 그 요구 문구를 복제하지 않는다** — ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **'이 화면 적용본'**. 각 요구가 이 화면에서 ① 적용되는가 ② 무엇이 그것을 충족하는가(코드 근거) ③ 무엇을 재현하면 판정되는가 만 기술한다 |
| 함께 읽는 문서 | FS-021(요소·예외) · BE-021(엔드포인트·보안 판정) · **NFR-020(파트너사)** |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 표를 다시 채운다. **`logo-list/**` 가 바뀌면 NFR-020·NFR-021 을 함께 갱신한다** |
| 판정 기준일 | **2026-07-17 · HEAD `a5c2639`** 기준 코드 대조. 직전 판정은 `4b805ad` 기준이었고, 이후 PR #22·#24·#26·#28·#30·#32·#34 가 머지되며 **이 화면의 P0 2건이 뒤집혔다 — 방향이 서로 반대다**: **A11Y-11 gap → pass**(#30 이 `ImageUploadField` 의 required 를 **접근성 이름**으로 AT 에 이었다 — `requiredNameSuffix`) · **FEEDBACK-06 pass → gap**(#26 의 exit 애니메이션이 `Modal` 에 **일방향 latch** 를 남겼고 이 화면이 쓰는 `LogoFormModal` 이 그 폭발 반경에 있다 — §5 #0). **파트너사(NFR-020)와 같은 모듈이라 두 변화가 그대로 복제된다** — §2 각 행의 근거 라인 참조 |

### 1.1 NFR-020(파트너사)과의 관계 — 판정이 같은 이유와 그 범위

두 화면은 **같은 모듈**(`logo-list/**`)을 config 만 바꿔 렌더한다(FS-021 §1.1). 따라서 **P0 30건의 판정이 전부 동일하다** — 같은 코드 줄이 같은 요구를 충족하거나 어긴다. 이 문서는 그 사실을 근거로 판정을 복제하되, **근거 줄 번호는 그대로이고 재현 절차의 URL·scope·문구만 고객사의 것**(`/company/clients` · `?fail=clients:*` · '고객사')이다.

**공유가 판정에 미치는 실질적 영향 두 가지**:
1. **P0 gap 6건 중 4건이 공용 골격의 결함**이라 **한 번 고치면 두 화면이 함께 닫힌다** — 수선 비용이 두 배가 아니다. 반대로 **`logo-list/**` 를 한쪽 요구만 보고 고치면 다른 화면이 조용히 회귀한다.** **F3b 가 이 성질을 그대로 증명했다**: 화면 코드 한 벌을 공용 훅(`useListState`)으로 수렴시키자 **두 문서의 P0 3건이 동시에 닫혔다.**
2. 검증도 공유된다 — `logo-list.test.ts` 는 `createLogoAdapter('test', SAMPLE)` 로 **팩토리 자체**를 테스트하므로(`:107-109`) 파트너사·고객사 어느 쪽 이름도 달지 않는다. 즉 **두 화면 중 어느 쪽에도 화면 고유 회귀 방어선이 없다.**

**고객사 고유 판정**(파트너사와 다른 유일한 항목): §3 의 도메인 경계 항목과 §4.3 의 노출 정책 — 고객사명은 실재 거래처 상호이고 '우리 고객이 누구인가' 가 영업 정보라, 숨김(`active: false`) 항목의 노출 통제가 파트너사보다 무겁다(BE-021 §7.2).

### 1.2 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(`logo-list/**` · `clients/**`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **F3b 에서 뒤집혔다(gap → pass).** `const firstLoading = isFetching && data === undefined`(`LogoListPage.tsx:123`) — 스켈레톤의 유일한 조건이 '데이터가 아직 **없을** 때' 로 좁혀졌고, 그 값만 `LogoListTable` 의 `loading` 으로 간다(`:294`). 재조회는 `const refreshing = isFetching && data !== undefined`(`:125`)로 갈라져 **표를 비우지 않고** 요약 줄에 '· 새로고침 중…' 만 덧붙인다(`:279-283`, `aria-busy={refreshing}`). `placeholderData: (previous) => previous`(`queries.ts:21`)가 유지하는 이전 데이터를 이제 화면이 가리지 않는다. (이 화면은 순서 이동 때문에 공용 `useCrudList` 를 쓰지 않지만 파생 정의는 그 훅(`useCrudList.tsx:71-72`)과 **글자까지 같다** — `LogoListPage.tsx:116-122` 주석이 그 동치와 이 화면의 옛 결함을 함께 기록한다.) 4상태 분기: 첫 로드=`firstLoading`(`:280`) · empty=`items.length === 0`(`LogoListTable.tsx:162`) · error=`error !== null` 가지(`:276`)로 서로 배타적이다 | `/company/clients` 진입 후 '예시전자' 의 노출 토글을 켠다 → `useSetLogoActive.onSettled` 가 `invalidateQueries({ queryKey: ['clients','list'] })`(`queries.ts:113-115`) → `isFetching=true` 이지만 `data !== undefined` 라 **표가 그대로 남고** 요약이 '전체 3건 · 새로고침 중…' 으로 바뀐다. 재정렬·삭제·저장 직후에도 동일. `?fail=clients:list` → 에러 배너만 | pass |
| STATE-02 | STATE | 직접 | `error !== null` 이면 요약·SelectionBar·표를 통째로 `Alert tone="danger"` 로 대체하고 '다시 시도' 버튼이 `refetch()` 를 부른다(`LogoListPage.tsx:314-328`). read 실패에 토스트를 띄우는 코드가 없고, 빈 상태로 폴백하지도 않는다(빈 상태는 `error === null` 가지 안에만 있다) | `/company/clients?fail=list` 진입 → 인라인 danger Alert '고객사 목록을 불러오지 못했습니다.' + '다시 시도'만 뜬다. 토스트 0건, 빈 상태 문구 미노출. '다시 시도' 클릭이 쿼리를 재발행한다 | pass |
| STATE-04 | STATE | 직접 | **selection 리셋 절** — 근거가 F3b 에서 공용 훅으로 옮겨졌다(판정은 그대로 pass): 선택을 이제 `useListState` 가 쥐고(`LogoListPage.tsx:89-90`), 그 훅이 `viewSignature`(page·keyword·sort·filters)가 실제로 바뀔 때만 선택을 비운다(`useListState.ts:207-213`) — 화면의 손수 쓴 `useEffect([keyword])` 사본은 사라졌다. **page clamp 절**: 이 화면에 페이지네이션이 없어(FS-021-EL-005 · IA-04 참조) out-of-range page 자체가 성립하지 않는다 — `clampPage`(`useListState.ts:217-223`)를 호출하지 않는다 | 시드 3건을 모두 선택한 뒤 '은행' 을 검색해 결과를 1건으로 좁힌다 → 요약의 '3건 선택됨' 이 사라지고 SelectionBar 가 걷힌다. clamp: 재현 대상 없음(페이지 개념 부재) | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면이 소유한 style object 전량이 `var(--tds-*)` 만 참조한다 — `pageStyle`·`toolbarStyle`·`summaryRowStyle`·`errorBodyStyle`(`LogoListPage.tsx:40-68`), `nameCellStyle`·`linkCellStyle`·`actionCellStyle`·`emptyCellStyle`·`statusCellStyle`(`LogoListTable.tsx:29-70`), `bodyStyle`(`LogoFormModal.tsx:28-32`). 래퍼(`ClientsPage.tsx`)·시드(`clients/data-source.ts`)에는 스타일이 없다 | `grep -nE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px" pages/company/{logo-list,clients}/*` → 0건(실측). ESLint/stylelint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면 — 검색 입력·버튼·체크박스·토글·행 액션·모달 컨트롤 — 이 전부 DS 컴포넌트이거나 `tds-ui-focusable` 클래스를 쓴다(`LogoListTable.tsx:187`·`LogoFormModal.tsx:151·189`). ring 토큰 자체는 DS/`ui.css` 소유 | DS 소유 문서의 판정을 따른다. 이 화면에서는 '자체 outline 선언 0건'만 확인한다 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면이 소비하는 motion 은 DS 것뿐이다 — `ToggleSwitch.css` · `Toast` · `AppShell` nav row. easing 토큰의 유효성은 tokens codegen·DS 소유 | DS 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 floating surface 는 DS `Modal`(등록/수정 모달 · ConfirmDialog ×3)과 `Toast` 다. `Modal.css:36` 이 `box-shadow: var(--tds-shadow-modal)` 를 쓴다 — raw 값 0건 | DS 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면의 `<h1>` 은 AppHeader 가 그린다(`AppHeader.tsx:101`). 화면 안에 자체 h1·KPI·StatsCard 가 없다 | DS/AppHeader 소유 문서의 판정을 따른다. 이 화면에서는 '자체 title 스타일 재선언 0건'만 확인한다 | 종속 |
| COMP-10 | COMP | 직접 | **F3b 에서 뒤집혔다(gap → pass).** 맨손 `setTimeout` 사본이 사라지고 검색이 공용 `useListState` → `useDebouncedSearch` 로 수렴했다: `const list = useListState()`(`LogoListPage.tsx:89`) → `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />`(`:264-269`). 세 절이 모두 그 훅에서 온다 — ① **조합 중 커밋 금지**: `if (composing) return;`(`useDebouncedSearch.ts:87`), `compositionstart/end` 가 그 상태를 올렸다 내린다(`:106-112`) ② **조합 중 Enter 미제출**: `if (event.nativeEvent.isComposing \|\| composingRef.current) { event.stopPropagation(); return; }`(`:121-124`) ③ **디바운스 250ms**: `DEBOUNCE_MS = 250`(`:23,93-95`). stale 응답 절은 keyword 가 쿼리 키에 들어가 react-query 가 캐시 엔트리를 가르는 것으로 이미 성립한다(`:14-18` 주석). `LogoListPage.tsx:86-87` 주석이 이 화면에서 왜 그것이 특히 중요한지 명시한다('고객사 이름은 대부분 한글이라 조합 중 조회가 나가면 자모 단위로 요청이 붙는다') | 검색창에 '샘플리테일'을 IME 로 치되 중간에 250ms 이상 멈춘다 → 조합 중인 부분 자모('샘프ㄹ')가 **커밋되지 않는다**(표가 그대로). 조합 중 Enter → 제출되지 않는다. 조합 확정 후 250ms 잠잠하면 URL `?q=샘플리테일` 로 1회 커밋 | pass |
| FEEDBACK-02 | FEEDBACK | 직접 | 파괴적 액션 2종이 모두 `ConfirmDialog(intent="delete")` 로 게이트된다 — 단건(`LogoListPage.tsx:341-352`) · 일괄(`:354-365`). busy 중 확인 잠금: `busy={deleting}`/`busy={bulkDeleting}`. 실패 시 다이얼로그를 **열어 둔 채** danger 배너: `error={deleteError}`(`:212` 에서 세팅) / `error={bulkError}`(`:239-242`), 복구는 재클릭. 취소/Esc/딤은 `closeDelete`/`closeBulk` 로 가고 거기서 `controller.abort()` + `mutation.reset()` + pending 리셋(`:187-193`·`:218-224`) | `/company/clients?fail=clients:delete` 진입 → '가상은행' 삭제 → 확인 → 다이얼로그가 남고 '삭제하지 못했습니다…' 배너, 재클릭이 재시도. 별도로 `?fail=` 없이 삭제 확인을 누른 직후 400ms 안에 '취소' → false 실패 토스트 없이 버튼 상태 복원 | pass |
| FEEDBACK-04 | FEEDBACK | **N/A** | **표면이 없다.** 이 요구의 3경로(browser unload · in-app link · back/forward)는 **페이지 폼**의 이탈 경로이고, 이 화면에는 폼 라우트가 없다 — 등록·수정이 전부 모달이다(FS-021-EL-009 · IA-06 taxonomy 무게 규칙). 모달 폼의 이탈 가드는 FEEDBACK-06 이 담당하며 그쪽에서 판정한다. `useUnsavedChangesDialog` 소비 0건 | 재현 대상 없음. **다만 잔여 위험이 있다** — dirty 모달이 열린 채 브라우저 Back/새로고침을 하면 두 요구 중 어느 쪽도 막지 않는다. §4.2 시나리오 표에 기록 | n-a |
| FEEDBACK-06 | FEEDBACK | 직접 | **뒤집혔다(pass → gap) — 배선은 그대로 옳으나 PR #26 이 DS 에 들여온 결함이 이 화면에서 발화한다.** **배선 절은 여전히 충족한다**: `const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose)`(`LogoFormModal.tsx:79`)를 `Modal.onClose`(`:126`)와 **취소 버튼**(`:135`)에 **둘 다** 넘겨 4경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232` · 취소)를 덮는다. `discardDialog` 는 모달 **밖**에 렌더된다(`:202`) — 안에 두면 포커스 트랩이 확인 다이얼로그를 가둔다. pristine 모달은 `requestClose` 가 즉시 `onClose()` 한다(`useModalDirtyGuard.tsx:53-58`). **그러나 PR #26 의 exit 애니메이션이 `Modal` 에 일방향 latch 를 만들었고, 이 화면이 쓰는 `LogoFormModal.tsx:126` 이 그 폭발 반경 9곳 중 하나다** — 상세 추적은 §5 #0. 요지: `Modal.requestClose`(`Modal.tsx:122-126`)가 `closingRef.current = true` 로 **latch** 하는데 **되돌리는 코드가 파일 전체에 없다**(`closingRef` 등장은 `:119,123,124` 뿐). `Modal` 은 'onClose() → 부모가 언마운트' 를 설계 전제로 문서화하는데(`:19-25`) **dirty 가드가 정확히 그 전제를 깬다** — `onClose()` 를 받고도 `setAsking(true)`(`useModalDirtyGuard.tsx:58`)만 할 뿐 언마운트하지 않는다. 사용자가 '머무르기'(취소, `:73`)를 고르면 **모달이 마운트된 채 `closing === true` 로 굳는다**: dialog 는 exit keyframe `forwards`(`Modal.css:35-38`)로 `opacity: 0` 고정, 오버레이는 `pointer-events: none`(`:26-28`), 이후 모든 Esc/딤/× 는 `Modal.tsx:123` 에서 즉시 return. **→ 입력하던 고객사 정보가 보이지도 닫히지도 않는 모달 안에 영구히 갇힌다.** **quality-bar 가 `LogoFormModal` 을 appliesTo 로 명시한 파일이고, 그 요구의 목적(모달을 닫으려는 사용자의 미저장 입력을 지킨다)이 정확히 역전됐다** — 가드가 지키려던 그 입력을 가드 경유 경로가 파괴한다 | '고객사 추가' → 이름에 한 글자 입력 → ① Esc ② 딤 ③ × ④ '취소' 각각에서 '저장하지 않은 변경 사항이 있습니다' 확인이 뜬다 (**배선 통과**). 아무것도 입력하지 않고 같은 4경로 → 프롬프트 없이 즉시 닫힘 (**통과**). **반증 절차**: 이름 입력 → **Esc** → 확인에서 **'취소'(머무르기)** → **모달이 사라지지도 보이지도 않는다.** 이후 Esc/딤/× 무반응, 입력값 회수 불가 — 새로고침만이 탈출구이며 그러면 입력이 소실된다. reduced-motion 변종: 같은 절차에서 dialog 는 *보이지만* 완전 무반응(경로 `Modal.tsx:129-132` — `willAnimate()` 가 false 라 `onClose()` 동기 발사 → 가드 veto → 동일 latch) | **gap** |
| A11Y-01 | A11Y | 상속 | 이 화면의 결과 통지는 전량 토스트다 — 토글 성공/실패(`LogoListPage.tsx:147·153`) · 재정렬(`:130·134`) · 삭제(`:194`) · 일괄 삭제(`:232`) · 저장(`:240`) · 취소(ConfirmDialog 어댑터). live region 은 `ToastProvider`(앱 전역, 라우트 밖) 소유 | ToastProvider 소유 문서의 판정을 따른다. 이 화면에서는 '자체 live region 을 만들지 않는다'만 확인한다 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면은 DS `Modal` 1종(등록/수정)과 `ConfirmDialog` 3종(단건 삭제 · 일괄 삭제 · discard 가드)을 렌더한다. `describedBy` 배선은 `ConfirmDialog`(DS)가 message 요소 id 를 `Modal` 에 넘겨 수행한다(`Modal.tsx:63·158`) | DS 소유 문서의 판정을 따른다 | 종속 |
| A11Y-11 | A11Y | 직접 | **PR #30 에서 뒤집혔다(gap → pass) — 마지막 절이 닫혔다.** ① **aria-invalid↔describedby 절 충족**(변동 없음): 이름 입력이 `aria-invalid={nameInvalid}` + `aria-describedby={nameInvalid ? errorIdOf('logo-name') : undefined}`(`LogoFormModal.tsx:156-157`), 링크 입력이 같은 쌍(`:193-194`), 그 id 의 오류 `<p role="alert">` 는 `FormField` 가 그린다(`FormField.tsx:110-112`). ② **required 노출 — `<input id="logo-name">` 은 F3a 가 닫았다**: `FormField` 가 `withAriaRequired()` 로 `required` 를 **런타임 `cloneElement` 로 자식 컨트롤의 `aria-required` 에 주입**한다(`FormField.tsx:50-56`, 주입 지점 `:107`). 주입 대상 판별은 `isRequirableChild`(`:38-41`) — 네이티브 `input`/`select`/`textarea` 와 DS `SelectField` 만. 이 모달의 `<FormField htmlFor="logo-name" … required>` 자식은 `<input>`(`LogoFormModal.tsx:147-166`)이므로 **주입된다.** (앱 소스 `aria-required` grep 은 여전히 1건뿐 — 주입이 런타임이라 grep 수치로 판정할 수 없다.) ③ **`ImageUploadField` 의 required — PR #30 이 닫았다(gap → pass).** 직전 판정은 '`aria-required` 0건이라 필수 여부가 스크린리더에 영원히 닿지 않는다' 였다. **DS 가 닫았으나 직전 판정이 기대한 방법이 아니다** — `<ImageUploadField label="로고 이미지" required …>`(`:168-170`)의 드롭존 `<button>` 이 이제 `aria-label={`${label}${requiredNameSuffix(required)} 이미지 업로드 — …`}`(`ImageUploadField.tsx:250`)로 **접근성 이름에 '(필수)' 를 싣는다**(정의 `:55`, export `index.ts:2`). **`aria-required` 를 쓰지 않은 것은 누락이 아니라 설계 판단이다**(근거 `ImageUploadField.tsx:44-54`): `aria-required` 는 **`role=button` 미지원 속성**(ARIA 1.2 — textbox/checkbox/combobox/…)이라 얹으면 거짓 시맨틱 + axe `aria-allowed-attr` 위반이고, 진짜 `<input type="file">` 은 `aria-hidden`+`tabIndex=-1` 트리거라 그쪽에 줘도 **아무에게도 닿지 않는다**. 즉 직전 판정이 정답이라 여긴 경로가 실은 오답이었다. `*` 마커는 여전히 `aria-hidden` 장식이지만(`:240-242`) 이제 유일한 경로가 아니다. **NFR-019(인증서)·NFR-020(파트너사 — 같은 모듈)도 같은 수정으로 함께 닫혔다** | ① `grep "aria-invalid"` 짝 검사 → 짝 없는 것 0건(충족). ② RTL: 모달을 열고 `expect(getByRole('textbox', { name: /이름/ })).toHaveAttribute('aria-required', 'true')` → **통과**(FormField 주입). ③ RTL: 드롭존 버튼의 접근성 이름에 `(필수)` 포함 여부 → **포함** → 충족. DS 회귀 테스트가 고정한다 — `ImageUploadField.test.tsx:102` describe `'ImageUploadField — required 의 AT 경로'` → `:103` `'required 면 드롭존의 접근성 이름이 필수임을 밝힌다'` · `:108` `'required 가 아니면 이름에 필수 꼬리표가 붙지 않는다 (대조)'` · `:114` `'aria-required 를 role=button 에 얹지 않는다 — 지원하지 않는 속성이다'`(**부재를 단언** — 되돌리면 red) | **pass** |
| A11Y-12 | A11Y | **N/A** | **표면이 없다.** 이 요구는 '좌측 필터 list item 의 selected 표기'이고 이 화면에는 좌측 필터 사이드바도 toggle 필터 버튼도 없다 — 좁히는 수단은 이름 검색 하나뿐이다(FS-021-SEC-01). `logo-list/**` 에 `aria-current`·`aria-pressed`·`filterItemStyle` 0건 | 재현 대상 없음. `grep "aria-current" pages/company/logo-list` → 0건 | n-a |
| MOTION-01 | MOTION | 상속 | 이 화면은 DS `Modal`(등록/수정)과 그것을 조립한 `ConfirmDialog` 3종의 소비자다. enter/exit transition 은 DS `Modal` organism 소유. **PR #26 이후의 사실 갱신**(판정 주체는 그대로 DS): 오버레이 모션이 **구현됐고 라이브러리가 아니라 CSS-only 다** — backdrop fade(`Modal.css:20-21`→keyframes `:126-134` · exit `:30-33`→`:136-144`) + dialog scale(`:58-59`→`tds-modal-dialog-in :146-156`, `scale(0.96)→scale(1)` · exit `:35-38`→`tds-modal-dialog-out :158-168`, `forwards`), `component.overlay` recipe 소비, reduced-motion 게이트 `:173-180`. AnimatePresence 는 없으나 'exit 완료 후 unmount' 는 `onAnimationEnd`(`Modal.tsx:216-218`)가 동등 달성한다. **이 화면이 상속하는 표면**: 등록/수정 모달과 ConfirmDialog 3종의 Esc/딤/× 닫힘은 애니메이션되고, **ConfirmDialog 의 footer 버튼(취소 `ConfirmDialog.tsx:145`·확인 `:153`) 경로는 즉시 언마운트된다**(`Modal.tsx:27-31`) | DS 소유 문서의 판정을 따른다 | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 토스트는 앱 전역 `ToastProvider` 큐가 그린다. exit 애니메이션은 ToastProvider/DS `Toast` 소유. **PR #26 이후의 사실 갱신**(판정 주체는 그대로 DS): **exit 가 완전 구현됐다** — `Toast.css:32-37` `.tds-toast--exiting`(`tds-toast-out … forwards` + `pointer-events:none`), keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. `ToastProvider.tsx:99-100` 의 `filter` 는 최종 제거로 남았으나 `Toast.tsx:186-187` 이 `onAnimationEnd` 로 **그 호출을 퇴장 애니메이션 뒤로 미룬다**. `component.overlay` recipe 로 exit = fast(150ms)/accelerate — 요구 문구를 정확히 충족 | ToastProvider/DS 소유 문서의 판정을 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | 이 요구의 appliesTo 중 **`ToggleSwitch.css` 가 이 화면의 실재 표면이다** — 목록의 노출 토글(`LogoListTable.tsx:199-204`)이 그 컴포넌트다. **직전 판정이 미결로 넘긴 'handle transform transition 의 reduced-motion 게이트' 는 이제 실재한다** — `ToggleSwitch.css:79-84` 가 `@media (prefers-reduced-motion: reduce)` 로 `.tds-toggle__track`·`.tds-toggle__knob` 에 `transition: none` 을 건다. 이것이 남아 있던 두 선언(`:32` `transition: background-color` · `:56` `transition: transform`)을 **둘 다** 끈다. 근거 주석 `:76-78`: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향을 주는 반면, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 **정보 손실이 0** 이다 — 즉시 최종 위치로 스냅한다. Modal/Toast 게이트도 함께 실재한다(`Modal.css:173-180` · `Toast.css:136-141`) | DS 소유 문서의 판정을 따른다. 이 화면에서는 '자체 transition/animation 선언 0건' + '노출 토글이 reduced-motion 에서 스냅' 을 확인한다 | 종속 |
| IA-01 | IA | 직접 | `ClientsPage` 는 `<LogoListPage …/>` 한 줄이고(`ClientsPage.tsx:8`) 자체 sidebar/top bar/outer frame 을 만들지 않는다. 라우트는 `{ path: '/company/clients', element: <ClientsPage />, implemented: true }`(`App.tsx:203`)로 `APP_ROUTES` 에 있고, 그 배열 전체가 `RequireAuth > AppShell` 레이아웃 라우트의 자식으로 렌더된다 | `/company/clients` 진입 → 고정 사이드바 + AppHeader + 단일 padded `<main>` 안에 목록이 든다. 화면이 그리는 최상위는 `pageStyle` flex column 하나(`LogoListPage.tsx:40-45`) | pass |
| IA-02 | IA | 직접 | 이 화면의 title 은 **AppHeader 단일 메커니즘**에서 온다 — `findNavLabel(pathname)`(`AppHeader.tsx:101`). 통합이 그 함수를 `findCoveringLeaf`(`nav-config.ts:260-278`, '자기를 감싸는 가장 긴 잎' · 세그먼트 경계 매칭) 위에 다시 얹었지만(`:297-299`), **이 화면의 판정은 그 변경 이전과 같다** — `/company/clients` 는 nav-config 의 **잎 그 자체이고**(`nav-config.ts:127` — `['고객사', '/company/clients']`) 자기를 감싸는 가장 긴 잎이 자기 자신이므로 '고객사'가 나온다. **이 화면은 잎 화면이다**: 등록·수정이 모달이라 sub-route(`/new`·`/:id/edit`)가 애초에 없고(IA-06), 화면 안에 경쟁하는 in-content h1 도 없다 — `FormPageShell.tsx:160` 이 그리는 두 번째 `<h1>` 은 이 화면의 표면이 아니다(그 껍데기를 쓰지 않는다). **따라서 `<h1>` 이 정확히 1개이고 그것이 화면을 지목한다 — 단일 title 메커니즘 충족** | `/company/clients` 진입 → `document.querySelectorAll('h1').length === 1`, `textContent === '고객사'`. '고객사 추가' 를 눌러 모달을 열어도 URL·제목이 그대로고, 모달 자체 제목('고객사 추가')은 `Modal` 의 `<h2>` 다 — h1 과 경쟁하지 않는다 | pass |
| IA-04 | IA | 직접 | **템플릿 절은 충족한다**: toolbar row(검색 좌측 + '고객사 추가' primary 우상단 — `LogoListPage.tsx:263-274`, `justifyContent: 'space-between'`) → 결과 count 요약(`:278-284`) → SelectionBar(`:286-290`) → table(`:292-312`) 순서가 요구와 일치한다. **Pagination 절은 여전히 충족하지 못한다**: 이 화면에 페이지네이션이 없고 `visible` 전량을 렌더한다(`LogoListTable.tsx:169`) — 페이지 크기도 목록 상한도 정의돼 있지 않아 '한 page 초과 가능 시' 조건 자체가 미정이다. F3a 가 `Pagination` 에 범위 표시·page-size 를 **opt-in** 으로 추가했지만(`Pagination.tsx:41,103-104,112`) 그것은 **이 컴포넌트를 렌더하는 화면에만** 해당한다 — 이 화면은 `Pagination` 자체를 렌더하지 않는다(`LogoListPage.tsx:6-10` 헤더 주석이 그 선택을 명시한다). BE-021-EP-01 도 페이징 없는 전량 응답이다(§7.4) | 시드 3건에서는 넘치지 않는다. 고객사를 반복 등록해 수십 건으로 늘리면 Pagination 없이 표가 계속 길어진다 — `grep -rn "Pagination\|pageSize\|PAGE_SIZE" pages/company/` → **0건**, `clients/data-source.ts:35` TODO 주석에 쿼리 없음 | **gap** |
| IA-05 | IA | **N/A** | **표면이 없다.** 이 요구는 '엔티티의 create·edit 를 `:id` 로 구분되는 하나의 **route** 쌍에서 제공' 이고, 이 화면은 폼 라우트를 갖지 않는다 — `App.tsx` 에 `/company/clients/new`·`/company/clients/:id/edit` 가 없고 `/company/clients` 하나뿐이다(`:203`). IA-06 의 무게 규칙에 따라 taxonomy 성격의 짧은 엔티티를 모달로 편집하는 경로를 택했다. **요구의 정신(하나의 컴포넌트가 등록/수정을 겸하고 레이아웃 동일·title 과 prefill 만 다름)은 `LogoFormModal` 이 `editing` 유무로 갈라 그대로 지킨다**(`LogoFormModal.tsx:53·125·64-68·139`) | 재현 대상 없음(라우트 부재). 모달 차원의 등가 확인: '추가' 와 행 '수정' 이 같은 모달을 열고 제목·초기값만 다르다 | n-a |
| IA-13 | IA | 직접 | **F3b 에서 뒤집혔다(gap → pass).** 이 화면의 유일한 list query state 인 **검색어의 단일 원천이 URL 이 됐다** — `const list = useListState()`(`LogoListPage.tsx:89`)가 `useSearchParams` 로 `?q=` 를 읽고 쓴다(`useListState.ts:87,90`), 커밋은 `patchParams({ q: next }, { resetPage: true })` + `{ replace: true }`(`:108-129,146-152`). 컴포넌트 `useState` 사본(옛 `keywordInput`/`keyword`)은 사라졌다. **두 라우트(`/company/partners`·`/company/clients`)가 같은 컴포넌트를 공유하지만 각자 자기 URL 을 가지므로 검색어가 서로 섞이지 않는다**(`LogoListPage.tsx:9-10` 주석이 이 점을 명시) — 공유 모듈에서 URL state 로 옮길 때 실제로 존재했던 위험이다. 기본값과 같은 값은 URL 에서 지운다(`useListState.ts:114-118`). (page·sort·filter 는 이 화면에 애초에 없다 — 그래서 이 요구의 이 화면 표면은 keyword 하나이며, 그것이 이제 충족된다) | '예시'를 검색해 목록을 좁힌다 → URL 이 `/company/clients?q=예시` 가 된다. ① F5 → 검색어와 결과가 그대로 복원 ② URL 을 새 탭에 복사 → 같은 좁혀진 목록 ③ 파트너사 화면으로 갔다 와도 고객사의 `?q=` 가 파트너사에 새지 않는다 | pass |
| EXC-01 | EXC | 상속 | 이 화면은 **AppShell `<Outlet>` 바로 바깥 경계**의 소비자다 — `<ErrorBoundary resetKey={pathname} fallback={RouteErrorScreen}><RequirePermission><Outlet /></RequirePermission></ErrorBoundary>`(`AppShell.tsx:484-493`). 그 바깥에 루트 경계가 하나 더 있다(`App.tsx`). 화면이 자체 경계를 두지 않는다 | AppShell/App 소유 문서의 판정을 따른다. 이 화면에서는 '자체 ErrorBoundary 0건'과 '경계가 이 라우트를 감싼다'만 확인한다 | 종속 |
| EXC-02 | EXC | 상속 | 두 층 모두 이 화면 밖이다 — ① 라우트 가드: `RequireAuth` 가 AppShell **바깥**이라 세션 없이 `/company/clients` 로 deep-link 하면 셸도 그리지 않고 `/login?returnUrl=…` 로 보낸다(`App.tsx`) ② 401 인터셉터: `queryClient` 의 `QueryCache`/`MutationCache` `onError` 가 `isUnauthorized` 면 `notifySessionExpired()`(`queryClient.ts:37-43`) — 이 화면의 조회·쓰기 전부가 그 캐시를 지나므로 배선이 필요 없다 | RequireAuth/queryClient 소유 문서의 판정을 따른다. 이 화면에서 상속을 확인하는 재현: `/company/clients?status=list:401` → 화면이 자체 401 분기를 갖지 않고 전역 인터셉터가 처리한다 | 종속 |
| EXC-03 | EXC | 직접 | **read 게이팅은 상속으로 충족된다** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490`) `resourceIdForPath('/company/clients')` → 잎 리소스로 해석되고(`route-resource.ts:36-46`) read 가 없으면 `ForbiddenScreen`. **write-action 게이팅 절은 여전히 충족하지 못한다.** ⚠ **직전 판정의 '앱 전체 소비자 0건' 은 이제 사실이 아니다** — F3b 이후 `useRouteWritePermissions` 소비자는 **7곳**이다(products 3 · settings 4). **그러나 `pages/company/**` 는 그 7곳에 없다** — `grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**. 즉 훅은 존재하고 다른 섹션은 이미 소비하는데 **이 화면만 배선되지 않았다**(이제 '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이다 — 이관 범위가 바뀐다). 그 결과 '고객사 추가'(`LogoListPage.tsx:270`) · 행 수정/삭제(`LogoListTable.tsx:217-222`) · 노출 토글(`:199`) · 일괄 삭제(`LogoListPage.tsx:287`)가 **권한과 무관하게 전부 렌더되고 눌린다** | read 만 있고 create/update/remove 가 꺼진 역할로 `/company/clients` 진입 → 403 화면이 아니라 목록이 정상으로 뜨고, '고객사 추가'·수정·삭제·토글이 **그대로 보이고 눌린다**. 기대: 그 컨트롤들이 렌더되지 않거나 비활성 — `settings/site/SiteSettingsPage` 가 이미 하는 방식. 강등 reconcile 도 같은 이유로 성립하지 않는다 | **gap** |
| EXC-04 | EXC | 직접 | **gap 이 남지만 사유가 바뀌었다 — 유령 저장은 F3b 에서 닫혔고, 충돌 해소 UI 와 동시성 토큰이 남았다.** ① **ghost 'saved' — 해소됨.** 어댑터가 없는 id 를 조용히 지나치던 `map`/`filter` 앞에 게이트가 섰다: `requireExisting(id, message)` 가 `items.some(item => item.id === id)` 를 확인하고 없으면 `throw new HttpError(HTTP_STATUS.conflict, …)`(`adapter.ts:40-44`) — `update`(`:63`) · `remove`(`:69`) · `setActive`(`:80`) 셋 다 통과한다. `adapter.ts:32-39` 주석이 그 판정('이 팩토리만 뚫려 있을 이유가 없다')을 기록한다. 이제 이미 지워진 고객사를 수정하면 **성공 토스트가 뜨지 않는다.** ② **그러나 conflict dialog 가 없다 — 409 가 generic 배너로 뭉개진다.** 공용 `useCrudForm` 은 `isConflict(cause)` 를 보고 입력을 보존한 채 충돌 다이얼로그를 세우지만(`useCrudForm.ts:166-179`), **이 모달은 `useCrudForm` 을 쓰지 않는다** — `onError` 가 `isAbort` 만 거르고 나머지를 전부 `setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')` 로 보낸다(`LogoFormModal.tsx:94-97`). 어댑터가 실어 보낸 '다른 사용자가 먼저 삭제한 항목입니다.' 라는 **정확한 문구가 그 자리에서 버려진다**. ③ **동시성 토큰 없음(변동 없음)**: `LogoItem` 에 `updatedAt`/`version` 이 없고 `If-Match` 를 보내지 않는다. **어댑터의 409 는 '존재 여부' 기반이지 버전 토큰이 아니다** — 두 관리자가 **둘 다 존재하는** 같은 항목을 편집하면 어느 쪽도 409 를 받지 않고 **나중 저장이 앞선 저장을 그대로 덮는다(last-write-wins).** 닫힌 것은 '삭제된 항목에 대한 유령 저장' 이고, 남은 것은 '살아 있는 항목의 동시 편집' 이다. **⚠ 이것은 이 화면 전용 어댑터의 한계가 아니라 앱 전체의 한계다** — 공용 두 팩토리도 동형이라 `CrudAdapter` 로 갈아타도 ③은 닫히지 않는다(`crud.ts:126-131` `createCrudAdapter.update` · `:219-224` `createStoreAdapter`: 유일한 충돌 조건이 '행이 사라짐' 이고 **version/updatedAt/ETag/If-Match 비교가 저장소 어디에도 없다**). **심은 절반 서 있다** — `isConflict` 는 이미 412/If-Match 를 409 와 같은 UX 로 수렴시키도록 작성돼 있으나(`http-error.ts:130-136`, 주석이 그 의도를 명시) **412 를 던지는 곳이 없다 — 소비자 없는 심이다**. 서버 정본 없이는 프론트만으로 닫을 수 없다 | ① 한 탭에서 '샘플리테일' 의 '수정' 모달을 연 채, **같은 탭의 목록에서** 그 항목을 삭제한 뒤 모달의 '저장'을 누른다 → **성공 토스트 없음, 모달이 닫히지 않음**(개선 확인). ② 같은 절차에서 모달 안 배너 문구를 본다 → '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'(재시도해도 영원히 없다). 기대: '다른 사용자가 먼저 삭제한 항목입니다.' + '최신 내용 보기 / 목록으로'. `grep -n "isConflict\|ConflictState\|If-Match" pages/company/logo-list/` → **0건** ③ 두 항목이 모두 존재하는 상태의 동시 편집 → 409 없이 덮어쓰기. BE-021 §7.5 가 서버측 404(`CLIENT_NOT_FOUND`) 계약을 정한다 | **gap** |
| EXC-08 | EXC | 직접 | **충족하지 못한다(변동 없음).** 이 화면의 폼은 공용 `useCrudForm`(`submitLockRef` — `useCrudForm.ts:103,202-203` · 제출 시도 단위 멱등키 — `:118-123,211,228,235`)을 **쓰지 않는다** — 모달 폼이라 `useForm` 을 직접 잡고 `onValid` 를 손으로 쓴다(`LogoFormModal.tsx:62,88`). 그 `onValid` 에는 **동기 락도 멱등키도 없고**(`:88-117`) 방어는 `disabled={saving}`(`:138`) 하나뿐이다. `saving` 은 `create.isPending \|\| update.isPending`(`:73`)이라 **상태가 렌더에 반영되기까지 한 틈이 있고**, 등록은 비멱등 POST 다(`adapter.create` 가 `seq += 1` 로 `clients-N` id 를 만들어 append — `adapter.ts:52-59`). ⚠ **F3b 가 멱등 ledger 를 공용 어댑터 두 팩토리에 넣었지만**(`crud.ts:62-72` `createIdempotencyLedger`) **이 화면은 그 어느 쪽도 쓰지 않는다** — `createLogoAdapter`(`adapter.ts:28`)는 `logo-list` 전용 팩토리이고 **ledger 가 없다**(`grep -n "Idempotency\|ledger" pages/company/logo-list/adapter.ts` → 0건). `LogoAdapter` 시그니처(`adapter.ts:13-22`)가 `create(input, signal?)` 라 **키가 앉을 자리조차 없다**(공용 `CrudAdapter` 는 `WriteContext` 로 그 자리를 만들었다 — `crud.ts:30-42,47`) | 모달에 유효값을 채우고 '추가' 버튼에 포커스를 준 뒤 **Enter 를 연타**(또는 매우 빠른 더블클릭)한다 → 두 번째 제출이 첫 렌더 전에 통과해 `adapter.create` 가 두 번 돌고 **같은 이름의 고객사가 2건**(`clients-4`·`clients-5`) 생긴다. 기대: 정확히 1건. 재시도가 같은 `Idempotency-Key` 를 재사용해야 한다(현재 키 자체가 없고 실을 자리도 없다) | **gap** |
| EXC-09 | EXC | 직접 | **부분적으로만 충족한다 → gap(변동 없음).** 취소 판정은 공용 `isAbort` 로 일원화돼 있고(`shared/async.ts`) 재정렬(`LogoListPage.tsx:134-136` — 직전 요청 abort)·삭제(`:188` — 다이얼로그 닫기)·일괄 삭제(`:219`)·모달 저장(`LogoFormModal.tsx:84` — 언마운트)은 실제로 abort 하고 `isAbort` 로 실패 토스트를 막는다. **그러나 노출 토글이 `AbortController` 를 만들고도 어디서도 abort 하지 않는다** — `const controller = new AbortController();`(`LogoListPage.tsx:153`)를 ref 에 담지도, 언마운트 정리에 걸지도 않아 그 signal 은 영원히 aborted 가 되지 않는다. 그 결과 `onError` 의 `if (isAbort(cause)) return;`(`:166`)은 **도달 불가능한 죽은 코드**이고, 토글 중 화면을 떠나도 요청이 취소되지 않는다. `settleAll` 의 abort 제외 절은 충족(`shared/bulk.ts`) | 토글 in-flight(400ms) 중 사이드바에서 '파트너사' 로 나간다 → 요청이 계속 살아 있다. 코드 확인이 더 결정적이다: `LogoListPage.tsx:153` 의 `controller` 를 참조하는 곳이 `mutate` 인자 하나뿐이므로(`:156`) `controller.abort()` 호출이 소스에 존재하지 않는다 → `:166` 분기는 절대 참이 될 수 없다. 기대: 재정렬(`reorderControllerRef` — `:96`)·삭제(`deleteControllerRef` — `:95`)와 같이 ref + 정리 경로 | **gap** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **10** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · COMP-10 · FEEDBACK-02 · **A11Y-11** · IA-01 · IA-02 · IA-13 |
| 종속(상속) | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | **3** | FEEDBACK-04 · A11Y-12 · IA-05 |
| **gap** | **6** | **FEEDBACK-06** · IA-04 · EXC-03 · EXC-04 · EXC-08 · EXC-09 |
| **합계** | **30** | 10 + 11 + 3 + 6 = **30** ✅ |

> **이번 기준 갱신(`4b805ad` → `a5c2639`)으로 P0 2건이 뒤집혔고 방향이 서로 반대다 — 건수는 6 그대로다. NFR-020(파트너사)과 정확히 같은 2건이 같은 코드 줄로 뒤집혔다**(§1.1 의 예측대로다: 같은 모듈이라 두 문서가 함께 움직인다).
> - **A11Y-11 gap → pass**: PR #30 이 `ImageUploadField` 의 required 를 **접근성 이름**(`requiredNameSuffix` — `ImageUploadField.tsx:55,250`)으로 AT 에 이었다. 직전 판정은 이것을 '`aria-required` 미주입' 이라 적었으나 **`aria-required` 는 `role=button` 에 붙일 수 없는 속성이라 그 방법 자체가 오답이었다**(`ImageUploadField.tsx:44-54`). 테스트가 그 판단을 고정한다(`ImageUploadField.test.tsx:114` 가 `aria-required` **부재**를 단언).
> - **FEEDBACK-06 pass → gap**: PR #26 의 exit 애니메이션이 `Modal` 에 **일방향 latch** 를 남겼다(`Modal.tsx:122-126` 이 `closingRef` 를 세우고 **되돌리는 코드가 없다**). `useModalDirtyGuard` 가 `onClose()` 를 veto 하면 latch 가 살아남아 **모달이 보이지도 닫히지도 않는 상태로 굳는다** — §5 #0.
>
> **직전 판정(`3cd3078`) 대비 3건이 gap → pass 로 뒤집혔던 이력**(유지) — STATE-01 · COMP-10 · IA-13. **NFR-020 과 정확히 같은 3건이 같은 코드 줄로 닫혔다.**
>
> **남은 P0 gap 6건 — quality-bar '배치 실패' 사유.** **NFR-020 과 동일한 6건이며 같은 코드 줄이 원인이다**(§1.1) — 별개 결함 12건이 아니라 **공유 결함 6건이 두 화면에 나타난 것**이다. 전부 §5 로 이관한다.
>
> **⚠ 이 화면은 A11Y-11 의 회복과 FEEDBACK-06 의 신규 결함을 같은 배치에서 받았다.** DS 계층이 한 축을 갚고 다른 축에 빚을 졌다는 뜻이며, **후자가 더 무겁다** — A11Y-11 은 AT 사용자에게 정보가 덜 닿는 문제였지만 FEEDBACK-06 latch 는 **모든 사용자의 입력을 파괴한다.**
>
> **⚠ EXC-04·EXC-08 의 사유가 바뀌었다.** F3b 가 공용 CRUD 두 팩토리(`createCrudAdapter`·`createStoreAdapter`)에 409 게이트와 멱등 ledger 를 넣었지만 **이 화면은 그 어느 쪽도 쓰지 않는다** — `logo-list` 전용 `createLogoAdapter` 다. 409 게이트는 그 팩토리에도 손수 이식됐으나(`adapter.ts:40-44`) **멱등 ledger 는 이식되지 않았고**, 409 를 받아 줄 충돌 다이얼로그가 모달 쪽에 없다. §5 #7·#8 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다. **마지막 행(도메인 경계)을 뺀 전부가 NFR-020 §3 과 동일한 코드·동일한 판정이다.**

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **STATE-01 과 함께 닫혔다(gap → pass).** `placeholderData: (previous) => previous`(`queries.ts:21`)가 유지하는 데이터를 이제 화면이 가리지 않는다 — `refreshing = isFetching && data !== undefined`(`LogoListPage.tsx:125`)가 표를 비우지 않고 요약에 '· 새로고침 중…' 만 덧붙이며(`:282`) `aria-busy={refreshing}`(`:279`)로 AT 에도 알린다 | 토글 후 재조회에서 이전 행이 보이는가 → **보인다**. 요약이 '전체 3건 · 새로고침 중…' 으로 바뀌고 행은 그대로 | pass |
| STATE-05 | P1 | 빈 상태가 한 문구뿐이다 — `등록된 {entityLabel}가 없습니다.`(`LogoListTable.tsx:165`). 공용 `CrudTable` 의 empty 3분기(`CrudTable.tsx:59-72` — 검색 때문인가 · 필터 때문인가 · 정말 비었나)와 `EmptyContext`(`CrudListShell.tsx:60-61`)가 이 화면에는 오지 않았다 — 이 화면은 `CrudTable` 이 아니라 자체 `LogoListTable` 을 쓴다. 조사도 `가` 리터럴이다(우연히 '고객사'·'파트너사' 둘 다 받침이 없어 맞지만, `objectParticle`/`subjectParticle` 파생이 아니다 — entityLabel 이 바뀌면 깨진다) | 없는 이름을 검색 → '등록된 고객사가 없습니다.' 가 뜬다(실제로는 3건이 등록돼 있다). 기대: '조건에 맞는 고객사가 없습니다' + 검색 지우기 | gap |
| STATE-06 | P1 | 모든 쓰기가 자기 목록만 정확히 무효화한다 — `listKey('clients') = ['clients','list']`(`queries.ts:12`)를 create/update/delete/setActive/reorder 가 무효화한다(`:35·51·66·114·149`). **고객사 쓰기가 파트너사 캐시(`['partners','list']`)를 건드리지 않는다** | 고객사를 등록 → 목록에 즉시 보인다. 파트너사 화면으로 이동해도 그쪽 캐시는 무효화되지 않는다 | pass |
| FEEDBACK-01 | P1 | 배치 규칙이 정확하다 — read 실패=인라인 Alert(`LogoListPage.tsx:295`) / 다이얼로그 내부 실패=그 다이얼로그 배너(`:328·342`) / 모달 저장 실패=모달 안 배너(`LogoFormModal.tsx:145`) / 독립 write 실패(토글·재정렬)=retry 토스트(`:134·153`). page-level 임의 배너 state 없음 | `?fail=clients:delete` → 다이얼로그 배너(토스트 아님). `?fail=clients:save` + 토글 → retry 토스트(배너 아님) | pass |
| FEEDBACK-03 | P1 | 모든 mutation 이 성공·실패 양 경로를 갖는다 — 토글(`:147·153`) · 재정렬(`:130·134`) · 삭제(`:194·198`) · 일괄(`:225·232`) · 저장(`LogoFormModal.tsx:103·113` → `onSaved` 토스트 / `:96` 배너). no-op 클릭 없음 | 각 액션을 `?fail=all` 로 구동 → 전부 사용자 가시 실패를 낸다 | pass |
| FEEDBACK-05 | P2 | 단건·일괄 삭제 모두 `intent="delete"` ConfirmDialog + '이 작업은 되돌릴 수 없습니다.' 고지(`LogoListPage.tsx:325·338`). undo window 는 없으나 요구가 '확인 **또는** undo' 라 확인으로 충족 | 단일 미확인 클릭으로 실행되는 delete 0건 | pass |
| A11Y-03 | P1 | 이 화면의 ConfirmDialog 3종은 DS 것이고 초기 포커스 규칙은 DS 소유다 | DS 소유 문서의 판정을 따른다 | 종속 |
| A11Y-06 | P1 | skip link 는 `AppShell.tsx:429`(`SkipToMain`), `<main id="tds-main" tabIndex={-1}>`(`:474`). 이 화면은 그 `<main>` 안의 `<Outlet>` 콘텐츠다 | AppShell 소유 문서의 판정을 따른다 | 종속 |
| A11Y-07 | P1 | 라우트 포커스·announce 는 `RouteFocusAnnouncer`(`AppShell.tsx:324-340`, `label={findNavLabel(pathname)}`)가 한다 — 이 화면 진입 시 '고객사' 가 announce 된다 | AppShell 소유 문서의 판정을 따른다 | 종속 |
| A11Y-08 | P1 | **표면 없음** — 행 클릭 이동(`useRowNavigation`)을 쓰지 않는다. 이름 셀이 링크가 아니고(`LogoListTable.tsx:183`) 상세 라우트도 없다. 행의 목적지는 '수정 모달' 이며 그것은 `RowActions` 의 **focusable 버튼**이다(`:217-222`) — 키보드로 도달 가능 | 재현 대상 없음. 행을 Tab 하면 체크박스·링크·토글·이동 버튼·행 액션에 모두 도달한다 | n-a |
| A11Y-13 | P1 | **폼 진입 포커스는 충족**: `initialFocusRef={nameRef}`(`LogoFormModal.tsx:132`) → 모달이 열리면 이름 입력에 포커스(`Modal.tsx:91-93`). **그러나 '첫 invalid 필드' 절을 충족하지 못한다**: `handleSubmit(onValid, () => nameRef.current?.focus())`(`:130`) 가 onInvalid 에서 **언제나 이름으로** 보낸다 | 이름만 채우고 '추가' 제출 → 로고 필드에 오류가 뜨는데 포커스는 이름 입력에 있다. 기대: 첫 invalid(로고)로 이동 | gap |
| COMP-02 | P1 | 선택 셀·순번 셀이 전부 DS 프리미티브다 — `SelectAllHeaderCell`(`LogoListTable.tsx:140`) · `RowSelectCell`(`:175`) · `SeqHeaderCell`(`:147`) · `SeqCell`(`:182`) · `tableSelectionState`(`:125`). raw checkbox 조립 0건 | `grep 'type="checkbox"' pages/company/logo-list` → 0건 | pass |
| COMP-03 | P1 | 검색이 DS `SearchField`(`LogoListPage.tsx:246-250`). raw `<input type="search">` + 절대 위치 아이콘 재구현 없음 | `grep 'type="search"' pages/company/logo-list` → 0건 | pass |
| COMP-04 | P1 | required 필드 2종이 `*` 마커를 렌더한다 — `FormField … required`(`LogoFormModal.tsx:147`) · `ImageUploadField … required`(`:170`). (마커의 **AT 노출**은 별개 문제 — A11Y-11 참조) | 모달의 '이름'·'로고 이미지' 라벨 옆에 `*` 가 보인다 | pass |
| COMP-06 | P2 | skeleton 이 `Array.from({ length: 5 })` 하드코딩(`LogoListTable.tsx:94`)이다. **고객사 시드는 3건이라 스켈레톤 5행 → 데이터 3행으로 표가 줄어든다** — 이 화면에서 불일치가 더 눈에 띈다. 이 화면은 PAGE_SIZE 자체가 없어(IA-04 gap) '=== PAGE_SIZE' 를 만족시킬 기준이 없다. cell 수는 `totalCols` 로 실제 컬럼에서 파생돼(`:127-128·161`) 그 절은 충족. **F3b 의 STATE-01 수선이 이 결함의 노출 빈도를 크게 줄였다** — 스켈레톤이 이제 최초 로드 1회에만 뜨므로(`LogoListPage.tsx:123`) 쓰기마다 반복되지 않는다. 그러나 첫 진입의 불일치는 남는다 | `/company/clients` 첫 진입 → 5행 스켈레톤이 3행 데이터로 바뀌며 표 높이가 줄어든다(1회). 토글·재정렬 후에는 스켈레톤이 뜨지 않는다 | gap |
| COMP-09 | P2 | 링크 셀은 말줄임한다(`linkCellStyle` — `LogoListTable.tsx:39-45`). **이름 셀은 truncation 이 없다**(`nameCellStyle` — `:29-32`) — 60자 이름이 컬럼을 민다. hover/expand 전체 값 노출은 어느 쪽에도 없다 | 60자 이름을 등록 → 이름 컬럼이 넓어지고 표 레이아웃이 밀린다 | gap |
| IA-06 | P1 | **무게 규칙에 부합한다.** 고객사는 필드 3개(이름·로고·링크)에 본문/에디터/미리보기가 없는 짧은 taxonomy 성격 엔티티이므로 inline-list + Modal 경로가 맞다(`LogoFormModal`). 혼용이 없다 — 이 엔티티에 폼 라우트가 **하나도** 없다(`App.tsx:183` 이 유일). 같은 `pages/company` 안에서 rich 엔티티(연혁·인증서·ESG)는 전용 폼 라우트를 쓴다(`App.tsx:187-188·190-191·193-194`) — 두 경로가 무게로 갈린다 | `/company/clients/new` 로 이동 → 라우트가 없어 `*` 폴백이 `/dashboard` 로 리다이렉트한다(모달 경로임을 확인). 수정은 행 액션에서만 열린다 | pass |
| IA-14 | P1 | 반응형·sidebar collapse·touch-target 은 AppShell/DS 소유다. 이 화면의 표는 `minWidth: 0` 컨테이너 안에 있고(`LogoListPage.tsx:40`) 자체 breakpoint 를 선언하지 않는다 | AppShell/DS 소유 문서의 판정을 따른다 | 종속 |
| MOTION-05 | P2 | 이 요구가 **`logo-list reorder` 를 appliesTo 로 명시**한다. 드래그 lift·grabbing cursor·drop settle 은 DS `TableReorder` 소유이고 이 화면은 `useReorderableRows`·`ReorderGripCell`·`ReorderMoveButtons` 의 소비자다(`LogoListTable.tsx:124·181·209-215`). optimistic update/rollback 절은 이 화면 몫이며 충족한다(EXC-14 참조) | DS 소유 문서의 판정을 따른다. 이 화면 몫(drop 이 낙관 반영/롤백을 정확히 적용, 키보드 재정렬이 동일 순서 생성)은 EXC-14 재현으로 확인 | 종속 |
| EXC-05 | P1 | 프론트 타임아웃 상한이 없다 — `AbortSignal.timeout` 이 `apps/admin/src` 전체에 0건 | never-resolving 응답을 만들 스위치가 없다(`?delay=` 미구현 — §6). 코드 대조로 판정: `grep "AbortSignal.timeout"` → 0건 | gap (앱 전역) |
| EXC-06 | P1 | 에러 타입은 status 를 갖는다 — `?status=` 스위치가 `HttpError(status, message)` 를 던지고(`dev.ts:84`) `shared/errors/http-error.ts` 가 판정자를 제공한다. **그러나 이 화면이 status 로 분기하지 않는다** — 모든 실패가 한 문구로 붕괴한다: 조회는 '고객사 목록을 불러오지 못했습니다.'(`LogoListPage.tsx:297`), 저장은 '저장하지 못했습니다…'(`LogoFormModal.tsx:96`), 삭제는 '삭제하지 못했습니다…'(`:198`). 401 만 전역 인터셉터가 가로챈다 | `?status=save:403` 과 `?status=save:422` 와 `?status=save:500` 으로 각각 저장 → **세 문구가 동일**하다. 기대: 403=권한 메시지(retry 없음) / 422=필드 인라인 / 500=retriable + reference | gap |
| EXC-07 | P1 | 서버 필드 오류(422 `error.fields`)를 RHF `setError` 로 매핑하는 코드가 없다 — `LogoFormModal` 의 실패 경로는 form-level 배너 하나뿐(`:94-97`). BE-021-EP-02 는 `error.fields` 를 계약에 담는다 | `?status=save:422` → 어느 필드가 틀렸는지 알 수 없는 generic 배너. 기대: 해당 입력에 인라인 오류 + 포커스 | gap |
| EXC-10 | P1 | `settleAll` 이 **실패 건수만** 돌려준다(`bulk.ts:15-21` — `Promise<number>`). 실패 id 목록이 없어 재클릭이 **선택 전원을 재전송**한다(`LogoListPage.tsx:213·219`). 게다가 **부분 실패 시 목록을 무효화하지 않아**(`queries.ts:84` — `if (failed === 0)` 일 때만) 이미 삭제된 행이 표에 남는다. abort 제외 절은 충족(`bulk.ts:20`), 다이얼로그 유지·선택 유지 절도 충족(`LogoListPage.tsx:224-229`) | 3건(시드 전부)을 선택하고 `?fail=clients:delete` 로 일괄 삭제 → 'N중 M건 실패' 배너가 뜬다(pass). 그 상태에서 스위치를 끄고 재클릭 → 이미 지워진 id 까지 다시 DELETE 된다. BE-021-EP-04 의 멱등성(204)이 피해를 흡수하지만 요청이 낭비되고 화면은 stale 하다 | gap |
| EXC-11 | P1 | 오프라인 감지가 없다 — `navigator.onLine`·`online`/`offline` 이벤트가 `apps/admin/src` 전체에 0건 | 코드 대조로 판정: `grep "navigator.onLine"` → 0건 | gap (앱 전역) |
| EXC-12 | P1 | **표면 없음** — detail/edit **라우트**가 없다(모달 편집). 존재하지 않는 `:id` 로 진입할 경로 자체가 없어 404 not-found surface 가 성립하지 않는다. (동시 삭제된 항목의 수정은 라우트 404 가 아니라 쓰기 경합 문제이며 EXC-04 가 다룬다) | 재현 대상 없음(`/company/clients/:id` 라우트 부재) | n-a |
| EXC-14 | P1 | **충족한다.** 되돌릴 수 있는 인라인 액션 2종에 정확히 3박자가 붙어 있다. **토글**: `onMutate` 가 `cancelQueries` + `getQueryData` 스냅샷 + `setQueryData` 낙관 반영, `onError` 가 스냅샷 롤백, `onSettled` 가 무효화(`queries.ts:100-116`). **재정렬**: 같은 3박자 + 낙관 반영을 **id 구성이 정확히 일치할 때만** 적용하는 가드(`:138` — `if (reordered.length !== old.length) return old;`)(`:129-151`). 롤백 시 실패 토스트 + retry 가 붙는다(`LogoListPage.tsx:153-155`·`:134`). **create/delete 는 낙관하지 않는다** — 확인 다이얼로그 + busy 로 비관적 처리(요구가 그것을 요구한다) | `?fail=clients:save` 로 '가상은행' 토글 → 스위치가 즉시 켜졌다가 **이전 값(OFF)으로 되돌아가고** '노출 여부를 변경하지 못했습니다.' + 다시 시도 토스트. `?fail=clients:reorder` 로 행 이동 → 순서가 즉시 바뀌었다 롤백 + 재시도 토스트. un-rolled-back optimistic write 0건 | **pass** |
| EXC-15 | P1 | 업로드 전 client 검증은 DS 가 한다 — `imageFileError(file, 5)` 가 `image/*` 타입·용량을 막고 요청 전에 인라인 문구로 거절한다(`ImageUploadField.tsx:37-43·170-182`). load 실패 fallback 도 있다(`:233`, src 변경 시 리셋 `:134-136`). **그러나 progress·cancel 경로가 없고, 애초에 업로드 자체가 없다** — `URL.createObjectURL` 로 끝난다(§4.3 · BE-021 §7.1) | DS 소유 문서의 판정을 따르되, **이 화면 몫의 실질 결함은 업로드 심 부재**다 — FS-021 §7 #8 · BE-021-EP-07 로 이관 | 종속 |
| EXC-18 | P1 | selection scope 는 암묵적으로 '현재 보이는 행' 하나다(페이지네이션이 없어 cross-page 개념 자체가 없다 — `toggleAll(visible.map(i => i.id), checked)`, `LogoListPage.tsx:284-289`). **Shift-click 범위 선택 없음**(`useRowSelection` 에 range 개념 0건). 일괄 삭제 확인이 count 를 echo 하지만(`:338-339`) **임계값 강화 confirm·determinate progress·cancel 이 없다** | 20건을 Shift-click 으로 선택 시도 → 한 건씩만 토글된다. 대량 삭제 시작 후 취소·진행률 없음 | gap |
| EXC-20 | P1 | 실패 문구에 복사 가능한 reference code 가 없다 — 이 화면의 세 실패 문구(`LogoListPage.tsx:297·198`·`LogoFormModal.tsx:96`) 어디에도 traceId 자리가 없다. raw 서버 body/stack 을 노출하지 않는 절은 충족(문구가 전부 하드코딩 상수다) | `?status=save:500` → '저장하지 못했습니다…' 만. reference code 없음 | gap |
| ERP-13 | P1 | **통합에서 뒤집혔다(gap → pass).** 조사 헬퍼가 `shared/format.ts:269+` 로 승격됐고(사본 3곳이 수렴), 이 화면의 사용자 문구가 전부 그것을 지난다: 토글 `'${item.name}'${objectParticle(item.name)} 노출합니다./숨깁니다.`(`LogoListPage.tsx:161-162`) · 삭제 `${objectParticle(target.name)} 삭제했습니다.`(`:208`) · 저장/추가(`:256-257`) · 삭제 확인 다이얼로그(`:345`). 검증 문구도 `requiredText` 가 `objectParticle`/`topicParticle` 로 조립한다(`shared/crud/validation.ts:17,21,24`) | **이 화면의 시드가 이 요구의 좋은 표본이다** — 받침 유무가 섞여 있어 어떤 리터럴 폴백을 써도 절반이 틀린다: '예시전자'(받침 없음) → `'예시전자'를 노출합니다.` · '가상은행'(받침 있음) → `'가상은행'을 노출합니다.` · '샘플리테일'(받침 없음) → `'샘플리테일'을 노출합니다.` 가 아니라 `'샘플리테일'를 노출합니다.` 셋 다 마지막 글자의 종성 코드로 갈린다(`format.ts:281-295`). `grep -rn "을(를)\|이(가)\|은(는)" pages/company/` → **0건** | pass |
| **도메인 경계** | — | **고객사 고유 — quality-bar 밖 축.** '고객사' 와 '파트너사' 를 구분하는 도메인 규칙이 화면·데이터 어디에도 없다. 두 목록은 `LogoItem` 으로 모양이 같고 이름만 다르므로 **한 회사가 양쪽에 중복 등록돼도 아무도 막지 않는다**(BE-021 §7.9 — 상호 유니크·외래키 없음). 고객 화면에서 두 목록이 어떻게 구분 노출되는지도 미정 | '알파클라우드'(파트너사 시드)를 고객사로도 등록 → 경고 없이 등록된다. 두 화면 어디에도 중복 고지가 없다 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 예산이 아니다.** 픽스처가 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 이고, 백엔드가 붙으면 이 상수는 사라진다. 아래 예산은 **실제 백엔드 기준의 목표치**이며 현재 코드로는 측정할 수 없다(네트워크 호출 0건).

| 축 | 예산 | 현재 상태 |
|---|---|---|
| 목록 응답 p95 | 400ms (BE-021-EP-01, 전량 반환) | 측정 불가 — 픽스처. 서버 상한은 5초 → 504(BE-021 §2) |
| 쓰기 응답 p95 | 500ms (등록·수정·삭제·토글·재정렬) | 측정 불가 — 픽스처 |
| 첫 렌더(진입 → 표 첫 행) | 800ms (목록 응답 + 렌더) | 픽스처에서 `LATENCY_MS` 400ms + 렌더 |
| 재조회 횟수 | 진입 1회. `staleTime` 30초 안의 재진입은 0회. 창 포커스 재조회 0회(`queryClient.ts:24·67`). 검색은 **클라이언트 필터라 0회**(FS-021-EL-001) | **쓰기마다 1회 추가**(`onSettled`/`onSuccess` 무효화 — `queries.ts:35·51·66·114·149`). **F3b 이전에는 이것이 STATE-01 gap 과 곱해져 쓰기마다 표가 스켈레톤으로 깜빡이는 비용이 됐다 — 지금은 표가 유지되므로 재조회 1회의 네트워크 비용만 남는다**(`LogoListPage.tsx:123-125`) |
| 메모리 | 목록 전량을 캐시에 1벌 + `placeholderData` 로 직전 1벌. **파트너사 화면을 오가면 두 캐시(`['partners','list']`·`['clients','list']`)가 동시에 산다** — 각각 30초 staleTime | **object URL 누수는 없다**: `ImageUploadField` 는 자기가 만든 것만 revoke 하고(`ImageUploadField.tsx:142-143·163-168`) 언마운트 시 정리한다(`:156-161`). 다만 그 정리가 **저장된 값을 죽인다** — 메모리 문제가 아니라 데이터 문제다(§4.3 — 알려진 빚) |
| 번들 | 이 화면은 라우트 분할 없이 `App.tsx` 정적 import(`:55`). 자체 무거운 의존성 0. **`logo-list/**` 7파일을 파트너사와 공유하므로 두 화면의 추가 코드는 래퍼 2파일 + 시드뿐이다** | 화면 고유 코드는 `ClientsPage.tsx`(9줄) + `clients/data-source.ts`(시드 3건) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + '다시 시도' | **충족**(`LogoListPage.tsx:314-328`). `retry: false`(`queryClient.ts:59`)라 자동 재시도 없이 즉시 배너 |
| 쓰기 실패 | 실패를 알리고 복구 경로 제시 | **충족** — 토글·재정렬은 롤백 + retry 토스트, 삭제는 다이얼로그 배너 + 재클릭, 저장은 모달 배너 + 재제출 |
| 화면 이탈 중 in-flight | 요청 abort, false 실패 통지 없음 | **부분** — 재정렬·삭제·일괄·모달 저장은 abort 한다. **노출 토글은 abort 하지 않는다**(§2 EXC-09) |
| 이미 삭제된 항목의 수정·삭제·토글 | 실패를 알리고 덮어쓰지 않음 | **부분 — F3b 에서 개선.** 어댑터가 409 로 막아 **유령 성공 토스트는 사라졌다**(`adapter.ts:40-44,63,69,80`). 그러나 모달이 그 409 를 generic '저장하지 못했습니다…' 로 뭉개 **무엇이 왜 실패했는지 운영자가 알 수 없다**(§2 EXC-04) |
| 동시 편집(둘 다 존재) | 충돌 감지 후 선택지 제시 | **미충족 — last-write-wins.** 어댑터의 409 는 '존재 여부' 기반이라 **살아 있는 항목의 동시 편집은 걸리지 않는다**. `LogoItem` 에 `updatedAt`/`version` 이 없어 화면 수정만으로는 해결 불가(§2 EXC-04 ③) |
| 화면이 렌더 중 throw | 사이드바 유지 + 복구 UI | AppShell `<Outlet>` 바깥 경계가 잡는다(`AppShell.tsx:484-493`). `resetKey={pathname}` 이라 다른 메뉴로 이동하면 스스로 풀린다 |
| 세션 만료 | 재인증 후 원래 경로 복원 | 전역 인터셉터가 처리(`queryClient.ts:37-43`) |
| **dirty 모달 + 브라우저 Back/새로고침** | 입력 보존 또는 경고 | **미충족 — 어느 요구도 덮지 않는다.** FEEDBACK-06 은 모달의 4경로(Esc·딤·× ·취소)만 덮고, FEEDBACK-04 의 3경로(unload·링크·back)는 이 화면에 폼 **라우트**가 없어 배선되지 않았다. 반쯤 채운 모달에서 브라우저 Back 을 누르면 라우트가 바뀌며 모달이 조용히 사라진다. §5 #10 |
| **dirty 모달에서 '머무르기' 선택** | 모달이 원래대로 돌아온다 | **미충족 — 모달이 죽는다(신규 · P0).** Esc/딤/× 로 닫기를 시도했다가 확인에서 '취소'를 고르면 `Modal` 의 `closingRef` latch 가 풀리지 않아(`Modal.tsx:122-126`, 리셋 코드 없음) **모달이 마운트된 채 `opacity:0` + `pointer-events:none` 로 굳는다.** 사용자는 자기 입력을 보지도 닫지도 못하고, 새로고침만이 탈출구이며 그러면 입력이 소실된다. **가드가 지키려던 바로 그 입력을 가드 경유 경로가 파괴한다** — §2 FEEDBACK-06 · §5 #0 |
| **파트너사 ↔ 고객사 이동** | 각 화면이 자기 데이터만 본다 | **충족** — 캐시 키·어댑터 배열이 `resource` 로 갈린다(`queries.ts:12` · `adapter.ts:28`). 한쪽 쓰기가 다른 쪽을 오염시키지 않는다 |
| 새로고침 후 데이터 | 서버 상태가 정본 | **픽스처 한계** — 어댑터가 브라우저 안 mutable 배열이라(`adapter.ts:28`) 새로고침하면 모든 변경이 시드 3건으로 되돌아간다. 백엔드 연결 시 해소 |

### 4.3 데이터 보존 · 감사

| 축 | 현재 상태 |
|---|---|
| **로고 이미지의 수명 — 알려진 빚(known debt)** | **저장값이 즉시 죽는다. 그것을 아는 채로 통과시킨다 — 이것은 고쳐야 할 결함이 아니라 업로드 이음매가 붙을 때까지 의도적으로 진 빚이다.** `ImageUploadField` 가 `URL.createObjectURL(file)` 로 만든 `blob:` URL 이 `logoUrl` 로 저장되는데(`ImageUploadField.tsx:178-181`), 그 필드는 교체·제거·**언마운트** 시 `URL.revokeObjectURL` 한다(`:156-161,163-168`). 모달이 닫히는 순간(= 저장 성공 직후) 그 URL 은 무효가 된다. **왜 검증을 조이지 않는가**: 그 필드에는 URL 을 손으로 칠 입력이 없어 **사용자 조작으로 도달 가능한 값이 `blob:…` 과 `''` 뿐이다** — 여기서 http(s) 를 요구하면 사용자는 "http:// 로 시작해야 합니다" 를 보고 **그것을 만족시킬 방법이 없고** 등록 폼이 영영 제출되지 않는다(회사 관리 5개 폼이 함께 막힌다). 근거 전문은 `shared/crud/validation.ts` 의 `requiredImage` 주석에 있다. **그래서 테스트가 이 상태를 명시적으로 고정한다** — `logo-list.test.ts:98-99`(`logoUrl: 'blob:abc-123'` → `success: true`), 테스트 이름이 `'업로드 이음매가 없어 blob: 이 통과한다 — TODO(backend): POST /api/uploads 후 거절로 바뀐다'` 이고 `:90-97` 주석이 `'이 단언을 설계로 읽지 말 것'` 이라 못 박는다. 같은 파일의 `linkUrl` 이 `optionalHttpUrl` 로 http(s) 를 **강제하는** 것은 일관성 부족이 아니라 **이음매의 유무 차이**다. BE-021 §7.1 의 서버측 스킴 화이트리스트가 그때까지의 방어선이고, EP-07(업로드)이 근본 해결이다 |
| **숨김 고객사의 노출 통제** | **고객사 고유 위험.** `active: false` 인 고객사(시드의 '가상은행')는 관리자 목록에 계속 보이고 API 도 내린다 — 그것이 맞다(관리자가 켜고 꺼야 하므로). 그러나 **고객 화면이 `active` 를 존중한다는 계약이 어디에도 없다**. 고객사명은 실재 거래처 상호이고 '우리 고객이 누구인가' 는 영업 정보라, 숨김 항목이 새면 파트너사보다 피해가 크다. BE-021 §7.2·§7.7 #7 이 공개 API 계약을 미정으로 이관한다 |
| 삭제의 비가역성 | 단건·일괄 모두 hard delete. undo window·soft-delete 없음. 확인 다이얼로그가 '이 작업은 되돌릴 수 없습니다.' 를 고지한다(FEEDBACK-05 pass) |
| 감사 로그 | 없다 — 누가 언제 고객사를 등록/수정/삭제/숨김 했는지 기록하는 필드도 엔드포인트도 없다(`LogoItem` 에 `updatedAt`/`updatedBy` 없음). 고객 노출 콘텐츠의 변경 이력이 남지 않는다 → §5 #12 |
| 정렬 순서의 정합 | 재정렬이 전체 `order` 를 1..n 으로 다시 매긴다(`types.ts:42-54` · BE-021-EP-06). `order` 는 유니크가 아니며 등록은 `nextLogoOrder`(최대+1)로 끝에 붙는다(`types.ts:57-58`) |

## 5. 미충족(gap) 요약 → 이관

> **#3·#4·#6~#9(P0)와 #11~#14 는 공용 골격(`logo-list/**`)의 사안이라 NFR-020 §5 와 같은 항목이다** — 두 화면에 각각 청구되는 별개 작업이 아니라 **한 번의 수선**이다. 이 문서는 그 사실을 명시하되 항목을 생략하지 않는다.
>
> **직전 판정(`3cd3078`)에서 이관됐다가 F3b·통합으로 해소되어 이 표에서 뺀 항목**: STATE-01(+STATE-03) — `firstLoading`/`refreshing` 파생이 들어왔다(`LogoListPage.tsx:123-125`) · COMP-10 — 검색이 `useListState`→`useDebouncedSearch` 로 수렴했다(`:89,264-269`) · IA-13 — 검색어가 `?q=` 로 URL 에 직렬화된다(`useListState.ts:87-90`) · ERP-13 — 조사 헬퍼가 `shared/format.ts:269+` 로 승격됐다(`LogoListPage.tsx:161-162,208,256-257`). **NFR-020 §5 에서도 같은 4건이 빠졌다** — 예고대로 한 번의 수선이 두 문서를 함께 닫았다.

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| **0** | **FEEDBACK-06** | **P0 (신규 · 최우선)** | **★ Modal 일방향 latch — PR #26 이 들여온 신규 코드 결함이다. 이 화면이 쓰는 `LogoFormModal.tsx:126` 이 폭발 반경 9곳 중 하나다.** `Modal.requestClose`(`Modal.tsx:122-126`)가 `closingRef.current = true` 로 latch 하는데 **되돌리는 코드가 파일 전체에 없다**(`closingRef` 등장은 `:119,123,124` 뿐 — `setClosing(false)`·리셋 effect 전무). 근인: `Modal.tsx:19-25` 가 'onClose() → 부모가 언마운트' 를 **설계 전제로 문서화**하는데 `useModalDirtyGuard` 가 그 전제를 깬다 — `onClose()` 를 받고도 dirty 면 `setAsking(true)`(`useModalDirtyGuard.tsx:58`)만 하고 언마운트하지 않는다. **추적**: ① Esc → latch ② `--closing` → `pointer-events:none`(`Modal.css:26-28`) + dialog exit `forwards` → `opacity:0` 고정(`:35-38`) ③ `onAnimationEnd` → `onClose()` → 가드 veto ④ 사용자가 '머무르기' → `setAsking(false)` ⑤ **종착: 마운트 유지 · `closing` 여전히 true · dialog 불가시 · 오버레이 무반응. 이후 모든 Esc/딤/× 는 `Modal.tsx:123` 에서 즉시 return → 영구히 닫히지 않고 보이지도 않으며 입력 데이터가 갇힌다.** reduced-motion/jsdom 변종은 `:129-132` 경유로 동일 latch(이때 dialog 는 *보이는데* 무반응). **최소 수정이 자명하지 않다** — veto 시 latch 를 풀어야 하는데 `onClose` 가 `void` 반환이라 Modal 에 신호가 없다. **`Toast` 는 같은 패턴이나 버그가 아니다**(`exitingRef` 도 리셋 안 되지만 `onDismiss` 를 소유한 ToastProvider 큐에 veto 경로가 없어 항상 언마운트된다) — **vetoing 부모를 가진 쪽만 깨진다**. **NFR-020(파트너사)과 같은 모듈·같은 줄이라 한 번 고치면 둘이 닫힌다** | **DS**(`Modal`) — 화면 수정으로 닫히지 않는다. 폭발 반경 9곳: `CreateGroupModal.tsx:154` · **`LogoFormModal.tsx:126`** · `PasswordChangeModal.tsx:103` · `RoleFormModal.tsx:68` · `PortfolioCategoryFormModal.tsx:104` · `ProductCategoryFormModal.tsx:104` · `CreateApiKeyModal.tsx:182` · `RevealKeyModal.tsx:126` · `CategoryFormModal.tsx:106` | **DS 소유자 · 프론트 리팩터 · UI 기획** |
| 3 | ~~**A11Y-11**~~ | ~~P0~~ | **해소됨(PR #30) — 이관 취소.** `<input id="logo-name">` 의 required 는 F3a 의 `FormField.withAriaRequired`(`FormField.tsx:50-56`) 주입이, 마지막 남은 `ImageUploadField`(`LogoFormModal.tsx:170`)는 PR #30 의 **접근성 이름 꼬리표**가 닫았다 — `requiredNameSuffix`(정의 `ImageUploadField.tsx:55`, 적용 `:250`, export `index.ts:2`). **직전 이관 사유였던 '`aria-required` 0건' 은 결함이 아니라 의도였다**(`ImageUploadField.tsx:44-54` — `role=button` 미지원 속성이라 얹으면 axe `aria-allowed-attr` 위반, 진짜 `<input type="file">` 은 `aria-hidden`+`tabIndex=-1` 이라 AT 미도달). 회귀 방어선 `ImageUploadField.test.tsx:102-120`. **NFR-019·NFR-020 도 함께 닫혔다** | — | — |
| 4 | **IA-04** | **P0** | 페이지네이션·페이지 크기·목록 상한이 없어 전량이 한 표에 렌더된다. F3a 의 `Pagination` opt-in(`Pagination.tsx:112`)은 그 컴포넌트를 렌더하는 화면에만 해당하고 **이 화면은 렌더하지 않는다**. BE-021-EP-01 도 페이징 없는 전량 응답이다(BE-021 §7.4). **파트너사와 같은 결정 필수** | 공용 골격 · 계약 | UI 기획 · 백엔드 명세 (BE-021) |
| 6 | **EXC-03** | **P0** | 등록·수정·삭제·토글 컨트롤에 권한 게이팅이 없다. **⚠ 범위가 바뀌었다** — `useRouteWritePermissions` 소비자는 이제 **7곳**(products 3 · settings 4)이고 **`pages/company/**` 만 그 목록에 없다**. '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며, 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`) | **기업 관리 섹션 전체**(앱 전역 아님) | UI 기획 쪽 변경 요청 |
| 7 | **EXC-04** | **P0** | **사유가 바뀌었다.** ① 유령 저장은 해소됨 — `createLogoAdapter.requireExisting` 이 없는 id 를 409 로 막는다(`adapter.ts:40-44,63,69,80`). ② **남은 것 1 — 충돌 해소 UI 부재**: 모달의 `onError` 가 409 를 generic 배너로 뭉갠다(`LogoFormModal.tsx:94-97`) — 어댑터가 보낸 '다른 사용자가 먼저 삭제한 항목입니다.' 가 버려진다. `useCrudForm.ts:166-179` 는 같은 자리에 `isConflict` 분기를 갖는다. ③ **남은 것 2 — 동시성 토큰 부재**: `LogoItem` 에 `updatedAt`/`version` 없음. **어댑터 409 는 '존재 여부' 기반이라 둘 다 존재하는 동시 편집은 여전히 last-write-wins** 다. BE-021 §7.5 가 서버측 404(`CLIENT_NOT_FOUND`) 계약을 정한다 | 공용 골격 · 계약 | UI 기획 · 백엔드 명세 (BE-021) |
| 8 | **EXC-08** | **P0** | 모달 제출에 동기 락·멱등키 없음(`LogoFormModal.tsx:88-117`) → 비멱등 POST 에 중복 등록이 열려 있다. **⚠ F3b 가 멱등 ledger 를 공용 두 팩토리에 넣었으나**(`crud.ts:62-72`) **이 화면의 `createLogoAdapter` 에는 이식되지 않았고**, `LogoAdapter.create(input, signal?)`(`adapter.ts:16`) 시그니처에 **키가 앉을 자리조차 없다**(공용 `CrudAdapter` 는 `WriteContext` 로 그 자리를 만들었다 — `crud.ts:30-42`). 공용 `useCrudForm.ts:103,118-123` 의 `submitLockRef`+키 패턴 미적용 | 공용 골격 — 어댑터 시그니처 포함 | UI 기획 쪽 변경 요청 · 프론트 구현 |
| 9 | **EXC-09** | **P0** | 노출 토글이 만든 `AbortController`(`LogoListPage.tsx:153`)를 어디서도 abort 하지 않아 `isAbort` 분기(`:166`)가 죽은 코드다 | 공용 골격 | UI 기획 쪽 변경 요청 · 프론트 구현 |
| 10 | FEEDBACK-04 / 06 경계 | P1 | dirty 모달 + 브라우저 Back/새로고침을 **어느 요구도 덮지 않는다**(§4.2) | 앱 전역(모달 폼 8종) | UI 기획 쪽 변경 요청 |
| 11 | STATE-05 | P1 | 빈 상태가 '검색 결과 없음'과 '진짜 0건'을 구분하지 않는다 — 공용 `CrudTable` 의 empty 3분기(`CrudTable.tsx:59-72`)·`EmptyContext`(`CrudListShell.tsx:60-61`)가 이 화면에는 오지 않았다(자체 `LogoListTable` 사용). `LogoListTable.tsx:165` | 공용 골격 | UI 기획 쪽 변경 요청 |
| 12 | A11Y-13 | P1 | 검증 실패 포커스가 **언제나 이름**으로 간다(`LogoFormModal.tsx:130`). `useCrudForm.ts:246-248` 의 `onInvalid` 계약과 대조 | 공용 골격 | UI 기획 쪽 변경 요청 |
| 13 | EXC-06 / EXC-07 | P1 | 실패가 status 별로 갈리지 않고 422 `error.fields` 를 입력에 매핑하지 않는다 | 공용 골격 · 계약 | UI 기획 · 백엔드 명세 (BE-021) |
| 14 | EXC-10 | P1 | `settleAll` 이 실패 id 를 돌려주지 않아 재시도가 전원을 재전송하고(`bulk.ts:15-21`), 부분 실패 시 목록을 무효화하지 않아 화면이 stale(`queries.ts:84`) | 공용(`shared/bulk.ts`) + 골격 | UI 기획 쪽 변경 요청 · 프론트 구현 |
| 15 | EXC-18 | P1 | Shift-click 범위 선택·대량 임계값 confirm·진행률·취소 없음 | 공용(`useRowSelection`) + 골격 | UI 기획 쪽 변경 요청 |
| 16 | EXC-20 | P1 | 5xx 실패에 복사 가능한 reference code 없음 | 앱 전역 | UI 기획 · 프론트 구현 |
| 17 | EXC-05 / EXC-11 | P1 | 프론트 타임아웃 상한·오프라인 감지 전무 | **앱 전역** | 프론트 구현 |
| 19 | COMP-06 / COMP-09 | P2 | skeleton `length: 5` 하드코딩(시드 3건과 불일치 — `LogoListTable.tsx:94`) · 이름 셀 truncation 없음(`:29-32`). **F3b 의 STATE-01 수선으로 노출 빈도는 첫 진입 1회로 줄었다** | 공용 골격 | UI 기획 |
| 20 | **도메인 경계** | — | **고객사 고유.** '고객사'/'파트너사' 를 구분하는 도메인 규칙이 없어 한 회사가 양쪽에 중복 등록될 수 있다(BE-021 §7.9 · FS-021 §7 #15) — quality-bar 밖 축 | 두 화면 · 계약 | 아키텍처 · 백엔드 명세 |
| 21 | **숨김 항목 노출 통제** | — | **고객사 고유.** `active: false` 고객사가 고객 화면에 새지 않도록 하는 공개 API 계약이 없다(§4.3 · BE-021 §7.2·§7.7 #7) — quality-bar 밖 축 | 계약 | 백엔드 명세 · 아키텍처 |
| 22 | 감사 로그 부재 | — | 고객 노출 콘텐츠의 변경 이력이 남지 않는다(§4.3) | 계약 | 백엔드 명세 (BE-021) |
| 23 | 로고 `blob:` 저장 | — | **결함이 아니라 알려진 빚(known debt)이다 — 정정.** 업로드 심(`TODO(backend): POST /api/uploads`)이 없어 `ImageUploadField` 가 낼 수 있는 값이 `blob:…` 과 `''` 뿐이고, 여기서 http(s) 를 강제하면 **폼이 영영 제출되지 않는다**(회사 관리 5개 폼 동반 정지). 그래서 **깨질 것을 아는 채로 통과시킨다**(`shared/crud/validation.ts` `requiredImage` 주석이 근거 전문). `logo-list.test.ts:98-99` 가 이 상태를 `'TODO(backend): POST /api/uploads 후 거절로 바뀐다'` 라는 이름으로 **고정**하고 `:90-97` 주석이 `'이 단언을 설계로 읽지 말 것'` 이라 못 박는다. 이관 대상은 '검증 조이기'가 아니라 **업로드 이음매**다(§4.3 · BE-021 §7.1 · EP-07) | 공용 골격(+profile · certificates · esg) · 계약 | 백엔드 명세 (BE-021) · UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 코드 대조다.** 아래는 판정을 재현하려는 사람을 위한 스위치 목록이며, 실제 코드(`shared/crud/dev.ts`)에서 확인한 것만 적는다.

**`?fail=` — 결정적 실패 재현** (`dev.ts:81-93`). 형식: `?fail=<op>` · `?fail=<scope>:<op>` · `?fail=all`(쉼표로 복수 지정 가능). generic `Error` 를 던진다.

| scope | 이 화면의 값 | 근거 |
|---|---|---|
| `clients` | **고객사 전용** | `createLogoAdapter('clients', CLIENT_SEED)`(`clients/data-source.ts:36`) |
| `partners` | 파트너사 — **이 화면에 영향 없음** | `createLogoAdapter('partners', PARTNER_SEED)`(`partners/data-source.ts:45`) |

> **scope 를 붙이지 않은 `?fail=<op>` 은 두 화면 모두에 걸린다** — `failIfRequested` 가 `requested.includes(op)` 를 먼저 보기 때문이다(`dev.ts:90`). 고객사만 실패시키려면 반드시 `?fail=clients:<op>` 를 쓴다.

| op | 걸리는 어댑터 함수 | 화면 효과 |
|---|---|---|
| `list` | `fetchAll`(`adapter.ts:34`) | FS-021-EL-008 조회 실패 배너 |
| `save` | `create`(`:39`) · `update`(`:47`) · `setActive`(`:62`) — **셋이 같은 op 을 공유한다** | 모달 저장 실패 배너 / 토글 롤백 + retry 토스트 |
| `delete` | `remove`(`:52`) | 다이얼로그 실패 배너 / 일괄 부분 실패 배너 |
| `reorder` | `reorder`(`:57`) | 재정렬 롤백 + retry 토스트 |

예: `/company/clients?fail=clients:save` (고객사 저장·토글만 실패) · `/company/clients?fail=list` (scope 무관 — 이 화면의 목록도 실패) · `?fail=all`.

**`?status=` — HTTP status 재현** (`dev.ts:57-71·82-85`). 형식: `<target>:<code>` 에서 target 이 `all`\|`<op>`\|`<scope>:<op>` 다(`:64`). 재현 가능 code: **400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500**(`:27-37`). `HttpError` 를 던진다.

예: `?status=save:409` · `?status=list:401`(전역 401 인터셉터 경로 — EXC-02) · `?status=clients:save:422`(EXC-07 재현) · `?status=all:500`(EXC-20 재현).

**`?delay=` — 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재). 이 화면의 지연은 상수 `LATENCY_MS = 400`(`dev.ts:12`)으로 고정이며 URL 로 바꿀 수 없다 — **STATE-01 의 quality-bar acceptanceCheck 가 제안하는 `?delay=3000` 을 이 화면에서는 쓸 수 없다.** 대신 §2 STATE-01 의 '토글 후 무효화' 절차로 재현한다.

**코드 대조 grep** (`HEAD = a5c2639` 에서 실제 사용한 것):
- `grep -nE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px" pages/company/{logo-list,clients}/*` → 0건 (TOKEN-01)
- `grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건** (EXC-03). ⚠ 같은 grep 을 `pages/` 전체로 넓히면 **7곳**이 나온다(products 3 · settings 4) — '앱 전역 0건' 이라는 직전 판정은 폐기됐다. **이 섹션만 미적용**이다
- `grep -rn "useListState" pages/company/logo-list/` → `LogoListPage.tsx:15,89` (COMP-10 · IA-13 · STATE-04). 조합 처리의 실체는 그 훅이 부르는 `shared/crud/useDebouncedSearch.ts:87,107,113,121`
- **A11Y-11 은 grep 으로 판정하지 않는다 — 두 번 틀린다.** ① `grep -rn "aria-required" apps/admin/src` 는 여전히 1건(`members/components/CreateGroupModal.tsx:192`, 수동 override)이지만 **주입이 런타임**이다(`FormField.tsx:50-56` `cloneElement`) → 판정은 **required FormField 자식의 타입**으로 한다: `LogoFormModal.tsx:147-166` 의 자식은 `<input>` → 주입됨(충족). ② `grep -n "aria-required" packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx` → **여전히 0건이지만 이제 그것이 충족의 근거다** — 이 몰리큘은 **의도적으로** `aria-required` 를 쓰지 않고 접근성 이름으로 잇는다(`:44-54`, 적용 `:250`). 판정은 **드롭존 접근성 이름에 `(필수)` 가 포함되는가**로 한다: `grep -n "requiredNameSuffix" packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx` → `:55`(정의) · `:250`(적용)
- **FEEDBACK-06 latch 의 근거** — `grep -n "closingRef" packages/ui/src/organisms/Modal/Modal.tsx` → `:119`(선언) · `:123`(가드) · `:124`(set) — **리셋이 없다**. `grep -n "setClosing" Modal.tsx` → `:117`·`:125` — `setClosing(false)` **0건**. `grep -rn "onClose={requestClose}" apps/admin/src` → **9곳**(이 화면은 `LogoFormModal.tsx:126`)
- `grep -rn "Pagination\|pageSize\|PAGE_SIZE" pages/company/` → **0건** (IA-04 · ERP-05 — `Pagination` 의 F3a opt-in 스위치 `pageSize > 0`(`Pagination.tsx:112`)의 대상이 아니다)
- `grep -rn "을(를)\|이(가)\|은(는)" pages/company/` → **0건** (ERP-13 — 조사 헬퍼 `shared/format.ts:269+` 승격 후)
- `grep -n "isConflict\|ConflictState\|If-Match" pages/company/logo-list/` → **0건** (EXC-04 ②③). 어댑터의 409 는 `adapter.ts:40-44,63,69,80` 에 있으나 모달이 받지 않는다
- `grep -n "Idempotency\|ledger\|submitLockRef" pages/company/logo-list/` → **0건** (EXC-08). 공용 ledger 는 `shared/crud/crud.ts:62-72` 에 있으나 `createLogoAdapter` 는 그 팩토리가 아니다
- `grep -rn "AbortSignal.timeout\|navigator.onLine" apps/admin/src` → 0건 (EXC-05 · EXC-11)
- `grep -n "controller" pages/company/logo-list/LogoListPage.tsx` → 토글의 `controller`(`:153`)에 `.abort()` 호출 없음 (EXC-09)

## 7. 자기 점검

- [x] quality-bar 요구 문구를 복제하지 않았다 — ID 참조 + '이 화면에서 어떻게' 만 썼다
- [x] §2 P0 **30행 전수**, 순서가 quality-bar 지정 순서와 일치한다. 빈칸 0건
- [x] **NFR-020 참조로 표를 비우지 않았다** — 30행을 고객사 근거·고객사 재현 절차로 완결했다. 공유 사실은 §1.1 이 설명한다
- [x] 모든 `N/A`(3건)에 '표면이 왜 없는지' 사유를 달았다
- [x] 모든 `pass`(10건)에 파일:라인 코드 근거가 있다 — **이번에 pass 로 바꾼 A11Y-11 은 `HEAD = a5c2639` 에서 근거를 새로 달았다**(`ImageUploadField.tsx:55,250` + 테스트 `ImageUploadField.test.tsx:102-120`)
- [x] 모든 `gap`(6건)에 재현 가능한 측정 기준이 있다 — **사유가 바뀐 2건(EXC-03·EXC-04)은 무엇이 닫혔고 무엇이 남았는지를, 신규 1건(FEEDBACK-06)은 latch 의 전체 추적과 반증 절차를 명시했다**
- [x] §2.1 산수 검산 — 10 + 11 + 3 + 6 = 30 ✅
- [x] **낙관적으로 pass 로 바꾸지 않았다** — EXC-04 는 유령 저장이 닫혔지만 충돌 UI·동시성 토큰이 없어 gap 유지(공용 팩토리도 동형이라 갈아타도 안 닫힌다), EXC-03·EXC-08·EXC-09·IA-04 는 코드가 그대로라 gap 유지
- [x] **비관적으로 gap 을 남겨두지도 않았다** — A11Y-11 은 DS 가 실제로 닫았음을 `ImageUploadField.tsx:250` 과 회귀 테스트로 확인하고 pass 로 뒤집었다. **직전 판정이 요구하던 `aria-required` 가 여전히 0건이라는 이유로 gap 을 유지하지 않았다** — 그 속성은 `role=button` 에 붙일 수 없어 애초에 오답이었고(`:44-54`), 테스트가 그 **부재를 단언**한다(`ImageUploadField.test.tsx:114`)
- [x] **pass 를 gap 으로 되돌리는 것도 주저하지 않았다** — FEEDBACK-06 은 이 화면의 배선이 여전히 옳지만 DS 가 새로 들여온 latch 가 요구의 목적을 역전시키므로 gap 으로 내렸다(§5 #0). **'우리 코드는 그대로다' 는 pass 의 근거가 아니다**
- [x] **`blob:` 이미지를 '결함'이 아니라 '알려진 빚'으로 정정**했다(§4.3 · §5 #23) — 근거는 `shared/crud/validation.ts` `requiredImage` 주석과 그것을 고정하는 `logo-list.test.ts:98-99`
- [x] `상속` 항목(11건)은 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박고 판정을 소유 문서로 넘겼다
- [x] §3 은 표면이 실재하는 P1·P2 만 담았다 + **고객사 고유 축(도메인 경계)** 을 추가했다
- [x] §6 의 `?fail=` scope 를 `dev.ts`·`adapter.ts`·`clients/data-source.ts` 에서 실제로 확인했다(`'clients'`). **scope 없는 `?fail=<op>` 이 두 화면에 함께 걸린다는 사실**을 명시했다. **`?delay=` 는 이 화면에 없음**을 명시했다
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님을 §4.1 에 명시했다
- [x] FS-021 §7 ↔ BE-021 §7.7 ↔ 이 문서 §5 의 이관 항목이 일치한다
- [x] **파트너사(NFR-020)와의 공유 관계**를 §1.1·§2.1·§5 머리말에 명시해 '별개 결함 18건' 오독을 막았다
- [x] E2E 를 실행하지 않았다 — 판정은 전부 코드 대조다
