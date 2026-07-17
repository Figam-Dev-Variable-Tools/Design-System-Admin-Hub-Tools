# MP-001 — 확정 8화면 모듈 추출 계획

> **담당**: 모듈 추출 · **게이트**: G0 · **검수**: 오케스트레이터
> **대상 화면(오너 확정)**: 로그인 · 대시보드 · 회원 목록 · 회원 상세 · 관리자 관리 · 권한 관리 · 고객 설정 · 로그인 이력
> **입력**: `reports/reuse/module-candidates-2026-07-15.json` (재사용 가드 scan) · `contracts/*.contract.json` 15종 · `packages/ui/src/**` · `reports/code-quality/2026-07-14.json`
> **상태**: 계획 확정 — **집행은 계약 엔지니어/컴포넌트 엔지니어/프론트 리팩터**. 모듈 추출 담당은 코드를 고치지 않는다 (역할 하드 바운더리).

---

## 0. 한 줄 요약

**`packages/ui` 는 15종을 다 만들어 놓았는데, 관리자 앱은 그중 단 하나도 쓰지 않는다.**
컴포넌트 import 0건. 앱이 `@tds/ui` 에서 가져오는 것은 `tokens.css` 하나뿐이다.
그 결과 **15종 전부가 페이지 안에 사본으로 다시 태어났다.** 이것이 이 계획의 전부다.

```
apps/admin/src 에서 @tds/ui 컴포넌트 import  ......  0건
packages/ui 에 존재하는 계약·구현·스토리·테스트 ....  15종 (contract-test 15/15 PASS)
그 15종의 페이지 로컬 사본 ......................  18개 파일
```

---

## 1. 왜 이렇게 됐는가 (책임 소재 아님 — 재발 방지용)

페이지 파일들이 스스로 이유를 적어 놓았다. **그리고 그 이유는 지금 전부 거짓이다.**

| 파일 | 주석 | 현재 사실 |
|---|---|---|
| `pages/login/LoginPage.tsx:6` | "@tds/ui에는 아직 승인된 컴포넌트 계약이 없다(G3 미통과)" | **거짓** — 계약 15종 존재, contract-test 15/15 PASS |
| `pages/product-registration/ProductRegistrationPage.tsx:7` | "@tds/ui는 아직 비어 있다" | **거짓** — atoms 6 · molecules 6 · organisms 3 |
| `pages/dashboard/components/Card.tsx:4` | "승격되면 여기 구현은 지워지고 @tds/ui import 로 바뀐다" | 승격은 끝났다. **지우는 단계가 실행되지 않았다** |
| `shared/ui/Button.tsx:3` | "@tds/ui 의 Button 은 아직 G5 미통과라 import 하지 않는다" | **거짓** — Button G5 통과 |

`page-module-pipeline.md` ③ 은 *"G5 통과 후 페이지의 로컬 구현은 모듈 소비로 교체한다 (사본 잔존 시 재사용 가드 중복률 SLO ≤ 3% 위반)"* 라고 규정한다.
**모듈은 승격됐고, 교체가 실행되지 않았다.** 파이프라인이 ③에서 멈춰 있다.

> **재발 방지**: 주석에 "아직 없다"를 쓰지 마라. 그 문장은 반드시 낡는다. 사본이 사는 근거가 되어 영구화된다.

---

## 2. 판정표

판정 기준 (오너 지시):
- **재활용** — `packages/ui` 에 이미 있다 → 페이지가 그것을 쓰게 고친다. 새로 만들지 않는다.
- **승격** — 2개 이상 화면이 쓰고 도메인 지식이 없다 → 계약 → `packages/ui`.
- **유지** — 소비자가 1개다 → 페이지에 둔다 (`shared/ui/README` 규칙 1).

### 2-A. 재활용 — 이미 있는데 새로 만든 것 (18건)

**이 표가 이 역할의 존재 이유다.**

| # | 페이지 로컬 사본 | `packages/ui` 기존 자산 | 즉시 교체 가능? |
|---|---|---|---|
| 1 | `shared/ui/Card.tsx` → `Card` | `atoms/Card` | ✅ **그대로** (shipped 가 상위집합) |
| 2 | `dashboard/components/Card.tsx` → `Card` | `atoms/Card` | ✅ 그대로 |
| 3 | `dashboard/components/Card.tsx` → `CountBadge` | `atoms/Badge` | ✅ 그대로 (`hideWhenZero` 로직 동일) |
| 4 | `dashboard/components/TabBar.tsx` | `molecules/Tabs` | ✅ 그대로 (계약이 TabBar 를 출처로 명시) |
| 5 | `admins/components/AdminTabs.tsx` | `molecules/Tabs` | ✅ 그대로 |
| 6 | `dashboard/components/RangeToggle.tsx` | `molecules/SegmentedControl` | ✅ 그대로 (계약이 RangeToggle 을 출처로 명시) |
| 7 | `dashboard/components/VisitorChart.tsx` | `molecules/LineAreaChart` | ✅ 그대로 (기하 상수·경로함수 바이트 동일) |
| 8 | `login/components/Checkbox.tsx` | `atoms/Checkbox` | ⚠ **`name` 부족** |
| 9 | `login/components/TextField.tsx` | `atoms/TextField` | ⚠ **`name`·`autoComplete`·`inputMode`·`inputRef` 부족** |
| 10 | `login/components/PasswordField.tsx` | `molecules/PasswordField` | ⚠ **`name`·`autoComplete`·`placeholder`·`inputRef` 부족** |
| 11 | `login/components/Button.tsx` | `atoms/Button` | 🛑 **`type` 부족 → 로그인 제출 불가** |
| 12 | `shared/ui/Button.tsx` | `atoms/Button` | 🛑 **`type` + native ARIA 패스스루 부족 · 기본 variant 뒤집힘** |
| 13 | `login/components/Alert.tsx` | `atoms/Alert` | ⚠ `alertRef` 부족 (`getElementById` 로 우회 가능) |
| 14 | `shared/ui/Alert.tsx` | `atoms/Alert` | ⚠ `onClose`·`live`·`align` 부족 · `<p>` vs `<div>` |
| 15 | `dashboard/components/PeriodTable.tsx` | `molecules/DataTable` | 🛑 **본문 행 단위(`원`) 표기 불가** |
| 16 | `dashboard/components/ListCard.tsx` | `organisms/ListCard` | 🛑 **react-router `<Link>` 불가 → 전체 새로고침** |
| 17 | `dashboard/components/TodoCard.tsx` | `organisms/TodoCard` | 🛑 **동일 — SPA 내비 불가** |
| 18 | `dashboard/components/StatsSection.tsx` 내부 카드 | `organisms/StatsCard` | 🛑 **`action.hiddenWhen:[loading]` → 기간 토글이 자기 클릭마다 사라짐** |

**7건은 오늘 당장 교체 가능**(✅). **11건은 계약 EXTEND 가 선행돼야 한다**(⚠🛑) — §3.

### 2-B. 승격 — 2개 이상 화면이 쓰는데 `packages/ui` 에 없다 (9건)

재사용 가드 `reuse:check` 기계 판정 첨부 (유사도 < 60% → CREATE_OK, 즉 기존 15종의 중복이 아님):

| 후보 | 소비 페이지 | 최고 유사도 | 기계 판정 | 레벨 | 근거 |
|---|---|---|---|---|---|
| `useToast`+`Toast`+`ToastProvider` | **6** | — | — | organism | 쓰기 작업 결과 피드백의 앱 전역 단일 규약 |
| `ConfirmDialog` | **4** | Card 14.7% | CREATE_OK | organism | intent→톤 강제가 요점. 도메인 모름 |
| `Pagination` | **3** | Button 12.0% | CREATE_OK | molecule | 이전/번호(최대5)/다음 |
| `SearchField` | **3** | TextField 38.2% | CREATE_OK | molecule | Members·LoginHistory·Admins 툴바에 **3벌** |
| `FilterGroup` | **4** (5개 사이트) | Tabs 20.8% | CREATE_OK | molecule | 스타일은 승격됐으나 **마크업이 5벌** — §2-C 주의 |
| `Modal` | **2** (+ConfirmDialog 기반) | TodoCard 22.5% | CREATE_OK | organism | 포커스트랩·Esc·스크롤잠금·포커스복귀 |
| `HelpTip` | **2** | Checkbox 22.0% | CREATE_OK | atom | ⓘ disclosure |
| `useUnsavedChangesDialog` | **2** | — (훅) | — | — | **복잡도 16 선(先)수정 필요** (§4) |
| `TriStateCheckbox` | 1 → **3** | Checkbox 40.0% | CREATE_OK | atom | **조건부** — §2-C |

### 2-C. 승격 전에 먼저 "재활용"으로 끝나는 것 (중복 제거가 승격보다 싸다)

**`TriStateCheckbox` 는 이미 `shared/ui` 에 있다.** 그런데 `MembersTable.tsx:67-99` 와 `AdminsTable.tsx:50-82` 가 **같은 위젯을 손으로 다시 짰다** (`SelectAllCheckbox`). 이것이 클린코드 점검 축3 이 잡은 30줄 클론(`clone:f8657271fc8e9492`)의 정체다.

- 두 사본은 `aria-checked="mixed"` 를 **누락**했다 — `TriStateCheckbox` 는 낸다. 단순 중복이 아니라 **a11y 퇴행**이다.
- 조치: 두 테이블이 기존 `shared/ui/TriStateCheckbox` 를 쓰게 한다 → 중복 1건 소멸 + a11y 회복. **새로 만들 것 없음.**
- 그 다음에야 소비자가 3페이지가 되어 `packages/ui` 승격이 정당해진다. **순서를 지켜라.**

`FilterGroup` 도 같은 모양이다: `LoginHistoryFilters.tsx:74-122` 에 **이미 일반화된 `FilterGroup<T>` 가 존재**한다. 그 파일의 주석은 "소비자가 하나다"라며 로컬 유지를 정당화하는데, **그 주석은 낡았다** — 동일 마크업이 TierFilter·GroupFilter(×2)·AdminGroupPanel(×2)·RolePanel 에 살아 있다. 새로 설계하지 말고 **그것을 올려라.**

### 2-D. 유지 — 승격하지 않는다 (과잉 추상화 회피)

| 후보 | 판정 근거 |
|---|---|
| `MembersTable` · `AdminsTable` | **DataTable 로 표현 불가.** 행 선택 체크박스 · tri-state 헤더 · 행클릭 내비 · ReactNode 셀(`<Link>`·연필아이콘) · 행 액션메뉴 · `td colSpan` 빈행. shipped DataTable 의 셀은 `string \| number` 이고 `<tr>`/`<td>` 는 prop 을 하나도 받지 않는다. 소비자도 각 1개 |
| `PermissionMatrixTable` | 데이터 표가 아니라 **편집 가능한 매트릭스**다. 모든 본문 셀이 `TriStateCheckbox`, 2줄 헤더, sticky 첫 열, 접히는 계층 행, 마스터 '전체' 행. 범주가 다르다 |
| `LoginHistoryTable` | 가장 가깝지만 여전히 셀 렌더러·행 톤(실패 강조)·조건부 행 내비가 필요. **소비자 1개**. 이걸 위해 DataTable v2(파괴적)를 만드는 것은 **1소비자를 위한 과잉 추상화** |
| `RowIcon` | `'order'\|'tag'\|'question'\|'contract'` → 아이콘 매핑. **도메인 어휘다.** ADR-0003: 도메인은 `packages/ui` 에 넣지 않는다. `icon` 은 이미 슬롯(`ReactNode`)이라 그대로 주입된다 |
| `StatsSection` 껍데기 | 권한 게이팅 + 쿼리 + 그리드 = **페이지 조합**. 내부 카드만 재활용한다 |
| `ActionMenu` | 소비자 **1개**(회원) |
| `TierFilter`·`GroupFilter`·`AdminGroupPanel`·`RolePanel` | 각 화면의 **도메인 필터**. 공통은 `FilterGroup` 마크업뿐이고 그건 §2-B 에서 올린다. 껍데기까지 올리면 도메인이 따라 올라간다 |
| `MoreHorizontalIcon`·`ArrowLeftIcon` | 소비자 1개 (기존 `shared/ui/README` 선례와 동일 판정) |
| `activeBadgeStyle`·`streakBadgeStyle` | 각 소비자 1개 |
| 내보내기 버튼 | 소비자 2개지만 `Button` + 이미 승격된 `DownloadIcon` + 라벨 삼항 조합일 뿐이다. **모듈이 아니라 3줄이다.** 올리면 추상화 비용만 남는다 |
| `Toast` (단독) | 페이지 import **0건** — `ToastProvider` 가 렌더한다. 승격 단위는 트리오(`useToast`) 이지 `Toast` 단독이 아니다 |

---

## 3. 🛑 이 계획의 핵심 경고 — **지금 재활용을 실행하면 화면이 깨진다**

오너 지시: *"확정한 화면의 보이는 동작을 바꾸지 마라"* · *"E2E 63건이 안전망이다"*.
**그 두 조건과 '지금 당장 @tds/ui 로 교체' 는 양립하지 않는다.** 실측된 파괴 목록:

| # | 교체 대상 | 파괴되는 것 | 심각도 |
|---|---|---|---|
| 1 | `Button` | shipped Button 은 `type="button"` **하드코딩** (`Button.tsx:45`). `type` prop 이 없다. → `LoginForm`·`RoleFormModal`·`CreateGroupModal`·`PasswordChangeModal`·`PointsCard` **5개 폼이 제출을 멈춘다** | **치명** |
| 2 | `Button` | 기본 `variant` 가 로컬 `'secondary'` → shipped `'primary'`. `variant` 를 생략한 앱 전역의 모든 버튼이 **흰 보조버튼에서 파란 주버튼으로 바뀐다** | **치명(시각)** |
| 3 | `Button` | shipped 는 native ARIA 패스스루가 없다 → `aria-describedby`(RolePanel) · `title` · `aria-label`(PointsCard) · `aria-busy`(ConfirmDialog) **전부 TS 에러** | 높음 |
| 4 | `ListCard`·`TodoCard` | shipped 는 클릭 콜백에 **`MouseEvent` 를 넘기지 않는다** (`ListCard.tsx:48-51`). `preventDefault()` 불가 → `href` 주면 **전체 페이지 새로고침**, 안 주면 `<button>` 이 되어 새탭/가운데클릭 상실. **SPA 내비를 만들 prop 조합이 없다** | **치명** |
| 5 | `DataTable` | 본문 셀은 `withUnit=false` **하드코딩** (`DataTable.tsx:83`). 대시보드 매출 행에서 **`원` 접미사가 사라진다** | 높음(시각) |
| 6 | `StatsCard` | 계약 `action.hiddenWhen:["loading"]` → **loading 중 action 슬롯이 언마운트**. 여기 loading 은 `isFetching` 이라 **기간 토글을 누를 때마다 토글 자신이 사라진다**(레이아웃 점프 + 포커스 상실) | **치명** |
| 7 | `TextField` | shipped 는 `required` 일 때 라벨에 `*` 마커를 **주입**한다 → 라벨 textContent 가 `"이메일*"`. `getByLabelText('이메일')` 정확일치 **셀렉터 파괴** | 높음(E2E) |
| 8 | `TextField` | `error` 센티널 반전: 로컬은 `error=""` 를 **invalid** 로, shipped 는 **valid** 로 읽는다. 로컬 타입은 `string \| null` 이라 shipped `string` 에 **대입 불가** | 높음 |
| 9 | `Alert` | shipped 루트가 `<p>` (로컬은 `<div>`) → 블록 자식을 넘기는 `shared/ui` 호출부에서 **`<p>` 안의 `<div>`** = 브라우저가 자동 닫아 레이아웃 붕괴 | 높음 |
| 10 | `Alert` | shipped 는 `tone="danger"` → `role="alert" aria-live="assertive"` **하드 커플링**. 로컬은 `live='status'` 기본. 조용하던 배너가 **스크린리더를 가로챈다**. opt-out prop 없음 | 중간(a11y) |
| 11 | `TextField`·`Button` | shipped 는 `aria-invalid`/`aria-busy` 를 **false 일 때 생략**, 로컬은 항상 렌더 → `[aria-invalid="false"]` 셀렉터 파괴 | 중간(E2E) |

**결론**: 재활용은 **계약 EXTEND 가 선행 조건**이다. 순서를 뒤집으면 E2E 63/63 이 깨지고, 그것은 곧 "동작을 바꿨다"는 뜻이다.
이것이 `page-module-pipeline` 이 **계약 → codegen → packages/ui → 페이지 교체** 순서를 규정한 이유다. 지름길은 없다.

**모듈 추출 담당은 이 이유로 어떤 코드도 고치지 않았다.** 반쪽 재활용은 오너 지시 위반이다.

---

## 4. 실측 부채 (클린코드 점검 재측정 — 2026-07-15)

`pnpm quality:check` → **blocker 0 · major 10** (중복 7 · 복잡도 3). *프론트 구현의 `filterHeadingStyle` 4벌 승격은 완료 확인됨 — 로컬 사본 0건.*

| 축 | 건수 | 최대 | 소유자 |
|---|---|---|---|
| 축3 중복 (30줄·2회+) | **7** | 11곳 반복 1건 | 프론트 구현/리팩터 ×6 · **컴포넌트 엔지니어 ×1** |
| 축4 복잡도 (>15) | **3** | **24** | 프론트 구현/리팩터 ×3 |
| 축5 죽은 코드 | 0 | — | (유지) |

### 축3 중복 7건 — 처방

| 위치 | 정체 | 처방 |
|---|---|---|
| `AdminsTable:39` ↔ `MembersTable:56` | `SelectAllCheckbox` + 셀 스타일 (동일. 문자열 2개만 다름) | **§2-C — 기존 `TriStateCheckbox` 재활용.** 새로 만들지 마라 |
| `AdminGroupPanel:12` ↔ `RolePanel:15` | `wrapperStyle`+`navStyle`+`noticeStyle` (동일) | 좌측 패널 껍데기 스타일 3종을 `shared/ui/styles.ts` 로 (`filterHeadingStyle` 선례 그대로) |
| `admins/fixtures.ts:25,37,49` | 픽스처 3벌 | 팩토리 함수. **테스트 픽스처지 UI 아님** |
| `ProductRegistrationPage:471 ↔ 512` | 폼 섹션 2벌 | 페이지 내부 추출 (승격 아님 — 소비자 1) |
| `nav-config.ts:72↔192`, `79↔162` | 내비 트리 정의 | 데이터 테이블화 |
| `Button.stories.tsx:119` **×11곳** | 스토리 보일러플레이트 11벌 | **컴포넌트 엔지니어 소유.** `play` 헬퍼 추출 |

### 축4 복잡도 3건 — 처방 (분해 지점 실측)

| 함수 | 값 | 분해 |
|---|---|---|
| `ProductRegistrationForm` (`:117`) | **24** | 최대치. 폼 섹션별 하위 컴포넌트 + 검증 룩업 테이블 |
| `DashboardPage` (`:65`) | **18** | 18개 분기 전수 확인: 권한/탭 해소 6 + 렌더 게이팅 5 + 탭 패널 6. → `useDashboardTabs()` 훅 추출만으로 **18→12**, `<DashboardTabPanel>` 까지 **18→6**. *§2-A 재활용을 하면 `data?.x ?? []` 삼중 기본값이 함께 소멸한다 (부수 효과로 추가 감소)* |
| `useUnsavedChangesDialog.handleClick` (`:83`) | **16** | 15개 분기 = 클릭 자격(7) + 앵커 판별(5) + 목적지 판별(3). → 순수 헬퍼 3개(`isPlainLeftClick` · `routableAnchorFrom` · `internalDestination`)로 **16→5**. 부수 효과: `:93` 의 `target.length>0 && target!=='_self'` 는 `!== ''` 하나로 접힌다 |

**10건 전부 프론트 구현/리팩터·컴포넌트 엔지니어 소유다. 모듈 추출 담당 소유 파일에는 위반이 0건이다** (`boundary:check` 실측). 그래서 모듈 추출 담당은 상환하지 못한다 — 변경 요청으로 넘긴다.

---

## 5. 집행 순서 (이 순서를 지켜야 E2E 가 산다)

```
[1] 계약 엔지니어  계약 EXTEND 7건            ← 후속 변경 요청
       Button(type,fullWidth,native) · TextField(name,autoComplete,inputMode,inputRef)
       PasswordField(name,autoComplete,placeholder,inputRef) · Checkbox(name)
       Alert(onClose,live,align,ref) · DataTable(unitInBody,summaryRowKey)
       ListCard/TodoCard(SPA 링크 탈출구) · StatsCard(action.hiddenWhen → disabledWhen)
   ▼ pnpm codegen (타입·argTypes·figma.json 자동 파생)
[2] 컴포넌트 엔지니어  packages/ui 구현 + 스토리 + 단언 있는 테스트   ← 후속 변경 요청
       + Button.stories 중복 11벌 정리 (축3)
   ▼ contract-test 4자 일치 / coverage 축2·축3
[3] 프론트 리팩터  페이지 교체 (사본 18개 삭제) + 부채 상환        ← 후속 변경 요청
       ✅ 무조건 선행 가능(계약 불필요): TriStateCheckbox 재활용 · 복잡도 3건 · 중복 5건
   ▼ pnpm e2e 63/63  ← 동작 보존의 기계 증명
[4] 모듈 추출  승격 9건 후속 MP + 재판정
[5] TDS 문서  재활용 판정 가이드 정식 편입                    ← 후속 변경 요청
```

**[3]의 ✅ 표시 항목은 계약을 기다릴 필요가 없다.** 프론트 리팩터가 지금 즉시 착수할 수 있는 부채 상환분이다:
중복 7건 중 5건(TriStateCheckbox 재활용 · 패널 스타일 · fixtures · ProductRegistration · nav-config) + 복잡도 3건 전부.
**이것만으로 축3 7→2, 축4 3→0 이 된다.**

---

## 6. 회귀 위험 지점 (프론트 리팩터가 반드시 확인할 것)

1. **E2E 63건이 유일한 안전망이다.** 교체 1건당 1커밋, 커밋마다 `pnpm e2e`.
2. `getByLabelText` 정확일치 — shipped TextField 의 `*` 마커(§3-7).
3. `[aria-invalid="false"]` / `[aria-busy="false"]` 셀렉터(§3-11).
4. `.tds-login-*` · `.tds-ui-btn-*` CSS 훅 — shipped 는 `.tds-button--*` 를 쓴다. `login.css`/`ui.css` 규칙이 죽는다.
5. **기본 variant 뒤집힘(§3-2)** — `<Button>` 을 `variant` 없이 쓴 모든 호출부를 전수 감사할 것. 조용히 파랗게 변한다.
6. 승격 후 **로컬 사본 삭제까지가 1건이다.** 사본이 남으면 재사용 가드 중복률 SLO(≤3%) 위반이고 축5(죽은 코드)가 0에서 올라간다.

---

## 7. 3자 대조 결과 (절차 3)

| 대조 축 | 결과 |
|---|---|
| 페이지 ↔ 페이지 | 교차 import **0건** (`pages/A → pages/B` 위반 없음, 축1 PASS 실측). 단 **동일 마크업 재구현 9종** 존재 (§2-B/2-C) |
| 페이지 ↔ Storybook | **18건 중복** — 이 문서의 본론 (§2-A) |
| Storybook ↔ Figma | `docs/figma/specs/` 미러 존재. `pnpm contract-test` **15/15 PASS** — 4자 일치 유지. 드리프트 0건 |

---

## 8. 검증 기준선 (2026-07-15, 무변경 상태)

| 항목 | 값 |
|---|---|
| `pnpm e2e` | **63/63 PASS** |
| `pnpm test` | **162 PASS** (packages/ui 83 + admin 79) |
| `pnpm contract-test` | 15/15 PASS |
| `pnpm coverage:check` | blocker 0 · 축4 래칫 **137칸 유지** |
| `pnpm quality:check` | blocker 0 · major 10 (중복 7 · 복잡도 3) |
| `pnpm naming:check` | 위반 0 |
| `pnpm boundary:check` | PASS |
| `pnpm codegen` | 신규 0 · 갱신 0 · 동일 63 (멱등) |
| admin 번들 | JS 482.03 kB (gzip 146.51) · CSS 17.30 kB |

**모듈 추출 담당은 소스를 한 줄도 바꾸지 않았다.** 위 수치는 집행 전후 비교의 기준선이다.
재활용 18건이 끝나면 번들은 **감소**해야 한다(사본 삭제분). 증가하면 사본이 남은 것이다.
