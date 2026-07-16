# Admin App Quality Bar Spec — DS Audit 통합 최종본 (9개 차원 · 100개 요구사항)

> **목적.** 이 문서는 Admin App(Design System + apps/admin)이 충족해야 하는 **강제 품질 기준(enforceable acceptance standard)** 이다. 향후 모든 빌드 배치는 새 기능을 추가하든 기존 화면을 손보든 **이 스펙을 acceptance criteria로 삼는다.** 각 요구사항은 "어떻게 동작해야 하는가"뿐 아니라 "무엇으로 합격을 판정하는가(acceptanceCheck)"까지 규정하므로, 구현·리뷰·QA가 동일한 기준으로 채점된다. 9개 차원(STATE / TOKEN / COMP / FEEDBACK / A11Y / MOTION / IA / ERP / EXC)은 DS 배관(component plumbing)뿐 아니라 한국 ERP 운영자가 실제로 겪는 워크플로(IME·URL 상태 지속·엑셀 내보내기·조사(助詞)·대량작업 안전장치·세션/초안 보존·반응형)까지 포함하도록 확장되었다.

---

## How to use (배치 에이전트 필독)

- **P0는 전량 충족이 필수(non-negotiable)다.** P0 하나라도 미충족이면 배치는 acceptance 실패로 간주하고 머지하지 않는다. 총 **P0 30건 / P1 · P2 포함 전체 100건**.
- P1은 해당 배치가 건드리는 표면(appliesTo)에 걸리면 이번 배치에서 해소한다. P2는 로드맵/후속 배치로 미룰 수 있으나 **신규 코드가 P2를 새로 위반해서는 안 된다(회귀 금지).**
- **모든 배치는 `verify:all`을 통과하고 콜드 E2E 63건을 그대로 유지(green)해야 한다.** 콜드 E2E가 62건 이하로 줄어들면(기존 시나리오 손실) 실패다. 신규 요구사항을 구현하면 그에 상응하는 e2e/unit 검증을 추가한다.
- Airbnb ESLint / stylelint **0 warning**, Storybook·Figma 일관성, "라이브러리 우선" 원칙은 기존 작업 지침대로 유지한다.
- 채점은 문서 말미의 **Master Exception Checklist(전 요구사항 판정 표)** 로 한 번에 수행한다. 배치 완료 보고 시 이 표의 각 행에 대해 pass/n-a를 명시한다.
- 표기 규약: 요구사항 ID와 코드/토큰/파일명·API 용어는 English/code로 고정하고, 설명은 한국어로 쓴다.

---

## STATE — 예외 및 상태 처리 (data-view 상태 머신)

- **[STATE-01] (P0)** 모든 data view는 `{first-load, refetching-with-data, empty, error}` 중 **정확히 하나**만 렌더하고 절대 혼동하지 않는다: skeleton은 최초 로드(`data===undefined`)에서만, refetch 중에는 이전 행을 유지, 성공했는데 0행일 때만 empty 컴포넌트, read 실패일 때만 error 컴포넌트를 노출한다.
  - _근거_: 상태 혼동은 admin의 대표 버그다 — error를 "항목 없음"으로 그리거나 로드 중 empty가 번쩍이면 운영자가 오판한다. MembersPage는 분리돼 있으나 `isFetching`을 loading으로 취급해 사용 가능한 데이터를 흐리게 만든다.
  - appliesTo: 모든 list/detail/data view — CrudListShell, CrudTable, DataTable, MembersPage, NoticeFormPage, 모든 `*ListPage`
  - ✅ acceptanceCheck: `?delay=3000`(skeleton만, empty 텍스트 없음), 0행 필터(empty 컴포넌트만), `?fail=<resource>`(error Alert만)을 구동. 데이터가 있는 상태의 refetch는 테이블을 blank/skeleton으로 만들지 않는다.

- **[STATE-02] (P0)** read(query) 실패는 해당 영역의 인라인 Alert(`tone=danger`)와 명시적 `다시 시도` 컨트롤로 노출한다 — toast로 처리하지 않으며, empty 상태로 폴백하지 않는다.
  - _근거_: 로드 실패의 유일한 할 일은 재시도다. 자동 사라지는 toast는 사용자를 빈 화면에 방치한다. `shared/ui/README.md`에 규정되어 있고 members에 구현됨 — 전 화면에 성립해야 한다.
  - appliesTo: 모든 list/detail/form query — CrudListShell load-error 배너, MembersPage, form shells
  - ✅ acceptanceCheck: 각 list/detail/form에서 `?fail=<resource>`가 인라인 danger Alert를 띄우고, retry가 query를 재발행한다. read 실패로 error toast는 발생하지 않는다.

- **[STATE-03] (P1)** 백그라운드 refetch 중에는 이전 행을 유지(`placeholderData`/keepPrevious)하고 가벼운 refetch 인디케이터만 표시한다 — full skeleton이나 empty flash 금지. refetch 트리거 시점은 `staleTime`(30s)이 지배한다.
  - _근거_: 테이블을 훑는 운영자 밑에서 데이터가 blank되거나 재정렬되면 안 된다. react-query 도입 사유 그 자체(`queryClient.ts`).
  - appliesTo: 모든 페이지네이션/필터 리스트 — MembersPage 패턴을 모든 CrudListShell 리스트로 일반화
  - ✅ acceptanceCheck: 데이터가 있는 상태에서 filter/page 변경 시 이전 행이 새 데이터 도착까지 유지된다. 네트워크 refetch는 `staleTime` 경과 후에만 발생한다.

- **[STATE-04] (P0)** refetch나 동시 삭제로 total이 현재 page 아래로 줄면, out-of-range empty page 대신 마지막 유효 page로 clamp 후 refetch한다. page/filter/keyword 변경 시 이제 숨겨진 행의 선택은 해제한다.
  - _근거_: 다중 관리자 삭제는 일상이다. 이제 1페이지짜리 리스트의 2페이지에 사용자를 남기면 false-empty가 뜬다. MembersPage는 이를 처리 — 공유 default여야 한다(`useCrudList`는 현재 미처리).
  - appliesTo: 모든 페이지네이션 리스트; 공유 `useCrudList`로 추상화
  - ✅ acceptanceCheck: page 2에 데이터가 있는 상태에서 total을 1페이지로 축소 → page가 1로 자동 보정되고 재로드. tier/group/keyword/page 변경 시 `selectedIds`가 리셋된다.

- **[STATE-05] (P1)** empty 결과를 전용 Empty 컴포넌트(`@tds/ui`로 승격)와 공유 copy helper로 3가지로 구분하고 각기 다른 copy·복구 수단을 제공한다: (a) 진짜 비어있음 → 일러스트/아이콘 + '{등록/접수}된 {label}이(가) 없습니다' + 생성 가능 시 primary create CTA; (b) 검색 결과 없음 → '조건에 맞는 {label}이(가) 없습니다' + 검색 지우기; (c) 필터 결과 없음 → '필터 초기화'.
  - _근거_: 단일 '표시할 항목이 없습니다.' 문구로는 '아직 없으니 추가하라'와 '검색이 안 맞으니 지워라'를 구분할 수 없다. CTA/일러스트가 오늘 전무 — 가장 임팩트 큰 누락 상태다.
  - appliesTo: CrudTable emptyLabel, DataTable empty prop, 모든 `*Table.tsx`의 인라인 empty cell
  - ✅ acceptanceCheck: empty 컴포넌트가 context(hasQuery, hasActiveFilters)를 받아 세 메시지+액션을 렌더. 비매칭 검색 vs 0-match 필터 vs 미시딩 resource로 검증. data-0 화면은 create CTA, filter-0 화면은 '필터 초기화'를 보인다.

- **[STATE-06] (P1)** write 성공 후에는 그것이 stale로 만든 read cache만 정확히 invalidate한다 — 편집한 row는 직접 반영하고 의존 list/summary/count query를 invalidate — 그래서 운영자는 자기 변경을 즉시 보고, 타 관리자 변경에 대해서만 30s staleness를 감내한다.
  - _근거_: detail 편집 후 list 컬럼이 stale(예: 포인트 잔액)이면 신뢰가 무너진다. members가 point/memo/delete write에서 list를 invalidate하는 이유.
  - appliesTo: `queries.ts` 전반의 모든 mutation (members는 이미 정확)
  - ✅ acceptanceCheck: detail에서 포인트 지급 → list의 포인트 컬럼이 갱신된다. 공지 편집 후 list로 복귀 시 수동 새로고침 없이 새 값이 보인다.

---

## TOKEN — 비주얼 및 토큰 일관성

- **[TOKEN-01] (P0)** 모든 시각 값은 semantic/component 토큰 `var(--tds-*)` 만 참조한다: primitive tier 밖 하드코딩 hex 0개, px 리터럴 0개(`0`과 상대 em/% 제외), CSS border/outline 키워드(thin/medium/thick) 0개.
  - _근거_: `tokens.json`의 하드 제약. hex/px는 현재 깨끗하나 `app-shell.css`가 키워드 금지를 위반 — 회귀 방지 테스트로 못 박아야 한다.
  - appliesTo: `packages/ui/src`, `apps/admin/src` — 모든 `*.css`와 style object
  - ✅ acceptanceCheck: grep 결과 (a) primitive tier 밖 `#hex` 없음, (b) `[1-9]px` 리터럴 없음, (c) `(outline|border): (thin|medium|thick)` 없음. ESLint/stylelint 0 warning.

- **[TOKEN-02] (P0)** 모든 `:focus-visible` ring는 단일 토큰 쌍(`border-width.medium`=2px + `color.border.focus`/button-focus-ring)에서 렌더한다. app-shell nav row의 `outline: medium`를 `var(--tds-border-width-medium)`로 교체한다.
  - _근거_: 28+ 컴포넌트가 2px ring을 쓰는데, 가장 많이 포커스되는 navigation이 금지 키워드로 ~3px를 계산해 두께 일관성을 깬다.
  - appliesTo: app-shell.css:12 nav rows; 모든 focus-ring 컴포넌트
  - ✅ acceptanceCheck: 모든 `:focus-visible` outline 선언이 `var(--tds-border-width-medium)`를 사용. nav-row focus ring이 button/input과 픽셀 동일. bare border 키워드 grep = 0.

- **[TOKEN-03] (P0)** motion easing 토큰을 유효한 timing-function으로 쓸 수 있게 한다 — codegen에서 `cubic-bezier()`로 감싸 emit하거나 모든 consumer가 `cubic-bezier(var(...))`로 감싼다. `Toast.css:23`을 고쳐 entrance easing과 animation shorthand가 유효하게 파싱되게 한다.
  - _근거_: easing 토큰이 bare cubic-bezier list라 consumer가 수동 wrap해야 하고, Toast가 이를 놓쳐 entrance animation이 무효화됨. 근본 원인(unwrapped 값) 제거로 재발을 막는다.
  - appliesTo: tokens codegen(motion.easing.*), Toast.css:23, 모든 animation/transition consumer
  - ✅ acceptanceCheck: `--tds-motion-easing-*`를 쓰는 모든 animation/transition이 유효 timing-function을 계산. Toast entrance가 실제 재생(non-reduced-motion). transition/animation에 bare easing var 없음.

- **[TOKEN-04] (P0)** semantic elevation/shadow 토큰 세트(shadow.raised/overlay/modal/sticky)를 primitive shadow composite로부터 light/dark 쌍과 함께 도입하고 codegen이 단일 box-shadow로 조립한다. floating/overlay surface(Modal dialog, Toast, dropdown/popover, 강조 card, sticky bar)에 적용. raw box-shadow 값 금지.
  - _근거_: Toss급 depth는 border가 아니라 부드러운 layered shadow에서 온다. 현 DS는 완전 flat(Card/Modal 그림자 없음)이고 `Shadow.stories`가 빈 placeholder — Toss 대비 최대 격차.
  - appliesTo: tokens.json, Card.css, Modal.css, Toast, dropdowns, Foundations/Shadow.stories
  - ✅ acceptanceCheck: tokens.json에 primitive+semantic shadow 토큰 존재. box-shadow grep은 `var(--tds-*shadow*)`만. Shadow.stories가 채워져 렌더(no EmptyNote). Modal/Toast가 light+dark에서 가시적으로 부상.

- **[TOKEN-05] (P0)** 18px 위의 display/heading typography tier를 추가한다 — primitive font-size 20/24/28(/32)과 weight semibold(600), semantic composite(title.xl, display.sm/md) — 그리고 page `<h1>`, section header, KPI/StatsCard 값에 소비해 16px body까지 계층이 명확히 내려가게 한다.
  - _근거_: 스케일이 title.lg(18px bold)에서 멈춰 page title/modal title/card title/body/KPI가 16–18px에 몰려 밋밋하다. 대시보드는 지배적 title/숫자가 필요.
  - appliesTo: tokens.json typography, FormPageShell h1, page titles, StatsCard value
  - ✅ acceptanceCheck: 타이포 스케일에 >18px tier ≥1개와 weight 600 존재. page `<h1>`·StatsCard 값이 body-md보다 가시적으로 큼. light/dark 대비 영향 없음.

- **[TOKEN-06] (P1)** semantic overlay/scrim color 토큰(color.overlay, light/dark mode, alpha 내장)을 추가하고 모든 dimming surface(Modal/Drawer/Sheet/Toast backdrop)가 이를 참조하게 한다 — `color.text.default` + 매직 opacity 금지.
  - _근거_: scrim 토큰이 없어 Modal backdrop이 text color를 opacity 0.45로 하드코딩. 미래 overlay마다 dim을 재발명하게 된다.
  - appliesTo: tokens.json, Modal.css backdrop, 미래 drawer/sheet/toast
  - ✅ acceptanceCheck: tokens.json이 color.overlay(양 mode) 노출. Modal.css가 `var(--tds-color-overlay*)` 사용. backdrop에 text-default 사용 및 0.45 리터럴 grep = 0.

- **[TOKEN-07] (P1)** disabled·skeleton-pulse opacity를 토큰화(opacity.disabled, opacity.skeleton 등)하고 흩어진 매직 넘버(0.5/0.55/0.6/0.9)를 토큰 참조로 교체해 동일 의미가 한 값을 공유하게 한다.
  - _근거_: disabled가 0.6과 0.55로 갈리고 skeleton/scrim이 의미 축 없이 0.45로 겹침 — opacity drift.
  - appliesTo: ToggleSwitch, ui.css skeleton/disabled, product/banner/popup/coupon/review preview-disabled, login
  - ✅ acceptanceCheck: css/tsx의 numeric opacity 리터럴 grep = 0(전부 `var(--tds-opacity-*)`). disabled·skeleton이 각각 단일 공유 토큰 값으로 해석.

- **[TOKEN-08] (P1)** spacing scale에 넉넉한 step(primitive space.7/8/9/10 = 32/40/48/64px, semantic에 미러)을 확장하고 page padding·section gap·card breathing을 이를 통해 라우팅한다. 실제 토큰이 생긴 곳의 `calc(space.6 * n)` 해킹을 교체한다.
  - _근거_: 넉넉한 여백은 Toss의 하중 특성인데 24px에서 멈춘 스케일로는 불가능. 팀은 이미 space.6 배수로 우회 중.
  - appliesTo: tokens.json, page/section shells, actionCell/selectWrap/dl calc 해킹
  - ✅ acceptanceCheck: space 토큰 ≥10 step. 주요 page/section gap이 space.7+ 사용. 신규 px 리터럴 없음. 기존 `calc(space.6 * n)` 폭 해킹을 신규 토큰으로 재검토.

- **[TOKEN-09] (P1)** radius.xl(~16px)과 선택적 radius.2xl(~20px)을 primitive+semantic에 추가하고 Card, Modal/sheet, primary CTA에 component 토큰으로 큰 radius를 적용한다(dense control은 md 유지).
  - _근거_: 부드럽고 큰 둥근 모서리는 Toss 시그니처. 현 상한 radius.lg(12px)는 평범한 flat admin으로 읽힌다.
  - appliesTo: tokens.json, Card, Modal, Button primary
  - ✅ acceptanceCheck: radius set에 xl 포함. Card/Modal이 component 토큰으로 radius.lg/xl 참조. 하드코딩 radius px 0.

- **[TOKEN-10] (P2)** 공유 `@tds/ui <Icon>` primitive(고정 size/stroke/viewBox 규격)와 공유 page-heading 컴포넌트/토큰을 제공해 icon·title 스타일을 단일 소스에서 소비한다.
  - _근거_: icon이 app-shared와 per-page 파일에 흩어지고 규격이 코드 관례로만 존재, page titleStyle이 파일마다 복붙 — drift와 Lucide 교체 위험.
  - appliesTo: shared/icons.tsx, per-page icons.tsx, FormPageShell/BannerFormPage titleStyle
  - ✅ acceptanceCheck: icon이 단일 소스(고정 stroke-width/size). page title이 단일 공유 컴포넌트/토큰 참조. 중복 titleStyle object grep = 0.

- **[TOKEN-11] (P2)** dangling composite 토큰 `--tds-component-button-typography`(존재하지 않는 `--tds-typography-label-md` 참조)를 고치거나 제거해, 생성된 어떤 var도 없는 var를 가리키지 않게 한다.
  - _근거_: 생성 출력의 dangling 참조는 토큰 무결성 신뢰를 훼손하고 오용을 부른다.
  - appliesTo: tokens codegen 출력
  - ✅ acceptanceCheck: codegen 무결성 체크가 "존재하지 않는 var를 참조하는 생성 var 없음"을 확인.

- **[TOKEN-12] (P2)** pill/badge의 control-height·line-height를 전용 control-height/line-height 토큰으로 표현하고 `space.*` 전용을 피한다(StatusBadge line-height, Badge size).
  - _근거_: StatusBadge line-height와 Badge size가 space.5를 소비해 토큰 카테고리 경계를 흐린다.
  - appliesTo: StatusBadge, Badge
  - ✅ acceptanceCheck: StatusBadge/Badge height가 space.*가 아닌 전용 토큰 사용.

- **[TOKEN-13] (P2)** categorical chart palette를 인접 구분 가능한 뚜렷한 hue ≥6 series 토큰으로 확장하고 각기 light/dark 쌍과 fill을 정의(향후 Recharts/ECharts용).
  - _근거_: series 색이 2개뿐 — 다범주 ERP 차트(매출/채널/상태 분포)는 접근성 있는 큰 categorical set이 토큰에 필요.
  - appliesTo: tokens.json chart.series-*, dashboard charts
  - ✅ acceptanceCheck: tokens.json이 chart.series-1..6(+fill)과 dark mode 정의. chart story가 하드코딩 색 없이 6개 구분 series 렌더.

---

## COMP — 컴포넌트 패턴 (DS 컴포넌트 재사용, 손수 조립 금지)

- **[COMP-01] (P1)** 모든 action/navigation 버튼은 DS `<Button>`(variant primary|secondary|ghost|danger, size sm|md, loading, iconLeft)으로 렌더한다. `buttonStyle()`나 `tds-ui-btn-*` className으로 `<button>`/`<Link>`를 조립하지 말고, 진행 상태는 `loading` prop으로(손수 쓴 '저장 중…' 금지) 표현한다.
  - _근거_: 로컬 buttonStyle은 loading spinner/size/aria-busy를 못 줘 '저장 중…'을 손으로 쓰고 같은 버튼이 화면마다 다르게 조립됨(13파일).
  - appliesTo: InquiryListPage, ReturnsListPage, TicketListPage, ConsultationListPage, ApplicationListPage, Members/AdminsTable memo pencil; 모든 apps/admin/src/pages
  - ✅ acceptanceCheck: apps/admin/src/pages에서 `buttonStyle(`·`tds-ui-btn-` grep = 0(ghost icon 버튼 포함). 남은 로컬 버튼 스타일은 shared/ui adapter에 국한.

- **[COMP-02] (P1)** 선택 가능한 테이블의 선택 셀은 RowSelectCell/SelectAllHeaderCell을, 순번 컬럼은 SeqCell/SeqHeaderCell을 사용한다. raw `<input type=checkbox style={checkboxStyle}>` 선택 셀 손수 조립 금지.
  - _근거_: MembersTable/AdminsTable이 checkbox 셀을 손수 만들어 정렬/라벨/포커스가 drift, SeqCell 유무 불일치로 skeleton 어긋남.
  - appliesTo: MembersTable, AdminsTable → NoticesTable/CrudTable/FaqTable에 정렬
  - ✅ acceptanceCheck: selectable `*Table.tsx`에 raw checkbox 선택 마크업 0. 순번 노출 테이블은 SeqHeaderCell/SeqCell 사용. 각기 RowSelectCell story의 a11y assertion 상속.

- **[COMP-03] (P1)** list/toolbar 검색은 DS `<SearchField>` molecule로 렌더한다. raw `<input type="search">` + 절대 위치 아이콘 재구현 금지.
  - _근거_: MembersToolbar/LoginHistoryToolbar/AdminsSearchCard가 SearchField를 손수 재구성 — 아이콘 위치/패딩/라벨 규칙이 따로 관리됨.
  - appliesTo: MembersToolbar, LoginHistoryToolbar, AdminsSearchCard
  - ✅ acceptanceCheck: apps/admin/src/pages에서 `type="search"` grep = 0. 세 toolbar 모두 `<SearchField>` 소비.

- **[COMP-04] (P1)** required input은 FormField(required)로 노출해 라벨 옆 `*` 마커가 렌더되게 한다. bare `<label style={fieldLabelStyle}>`로 required 필드 그리기 금지.
  - _근거_: CreateGroupModal('그룹명')과 LoginHistoryFilters가 마커/표준 error slot 없이 required 필드를 그려 폼마다 의미가 다름.
  - appliesTo: CreateGroupModal, LoginHistoryFilters; 모든 폼
  - ✅ acceptanceCheck: 모든 zod-required 필드가 FormField required 마커 렌더. 라벨 `getByText` 옆에 인접 `*` 존재.

- **[COMP-05] (P2)** 좌측 필터 컨테이너는 공유 `filterPanelStyle`(outer vertical stack)와 `filterNavStyle`(group)를 재사용한다. 동일 값의 로컬 wrapperStyle/groupStyle 복제 선언 금지.
  - _근거_: NoticeFilters/LoginHistoryFilters/TierFilter가 공유 값을 로컬 재선언 — 간격 튜닝 시 화면이 drift.
  - appliesTo: NoticeFilters, LoginHistoryFilters, TierFilter (ESG는 이미 공유 사용)
  - ✅ acceptanceCheck: 필터 파일에 gap space-5 vertical / gap space-2 group을 정의하는 로컬 CSSProperties 0. filterPanelStyle/filterNavStyle import.

- **[COMP-06] (P2)** list skeleton은 row 수 === PAGE_SIZE, column 수는 테이블 정의에서 파생(하드코딩 `length: 5` 금지)한 공유 `SkeletonRows(rows, cols)` helper로 렌더한다.
  - _근거_: skeleton row 수(PAGE_SIZE vs 5)와 cell 수 공식이 테이블마다 손수 관리돼 loading shape가 불균일.
  - appliesTo: 모든 `*Table.tsx` SkeletonRows, CrudTable, Inquiry/Returns(하드코딩 5)
  - ✅ acceptanceCheck: skeleton `length: 5` grep = 0. skeleton row 수 === PAGE_SIZE, cell 수 === 실제 컬럼 수.

- **[COMP-07] (P2)** SeqCell 값은 page offset으로 계산한다: `seq = startIndex + index + 1`, `startIndex = (page-1)*pageSize`. `index+1`만 사용 금지.
  - _근거_: InquiryListPage/ReturnsListPage가 index+1을 써서 페이지네이션 추가 시 2페이지에서 순번이 1로 리셋(NoticesTable은 이미 정확).
  - appliesTo: InquiryListPage, ReturnsListPage; 순번 컬럼 있는 모든 페이지네이션 리스트
  - ✅ acceptanceCheck: page 2 첫 행 seq === pageSize+1. SeqCell seq 식에 startIndex 포함.

- **[COMP-08] (P2)** 마지막 'row-action' 컬럼을 통일: (a) 읽기전용 테이블은 whole-row 클릭 + row 내 접근 가능한 링크 하나, 중복 '상세' 버튼 없음; (b) 인라인 편집 테이블은 RowActions(pencil/trash); (c) 액션 3개 이상일 때만 ActionMenu(⋯)로 승격. per-screen 임의 조합 금지.
  - _근거_: 같은 마지막 컬럼이 5가지(RowActions/ActionMenu/'상세'/memo pencil/none)로 구현되고 '상세' 버튼이 whole-row 클릭과 같은 detail을 중복.
  - appliesTo: Inquiry/Returns/Ticket/Consultation/Application('상세' 제거), Members/Admins, Notices, CrudTable, LoginHistory
  - ✅ acceptanceCheck: 읽기전용 인라인 리스트에 중복 '상세' secondary 버튼 없음. 편집 테이블은 RowActions. 다중 액션 행만 ActionMenu — 리뷰 체크리스트로 확인.

- **[COMP-09] (P2)** 긴 자유 텍스트(title/memo/반려 사유/이름)는 ellipsis로 truncate하고 hover/expand로 전체 값을 노출한다. 긴 텍스트가 테이블 컬럼을 넓히거나 행 레이아웃을 깨서는 안 된다.
  - _근거_: DataTable/card의 무제한 텍스트가 컬럼을 밀어 grid를 파괴할 수 있음 — 오늘 체계적 truncation 없음.
  - appliesTo: CrudTable/DataTable cell, cards
  - ✅ acceptanceCheck: 매우 긴 title이 셀에서 ellipsis로 truncate, hover/expand로 전체 표시, 테이블 폭 불변.

- **[COMP-10] (P0)** 모든 text-search/filter 입력은 `event.nativeEvent.isComposing`이 true인 동안(또는 compositionstart/compositionend 처리) 키 입력을 무시하고 **compositionend 또는 명시적 submit에서만 query를 commit**한다. query 발행은 debounce(≈250–300ms) + 최소 query 길이 정책을 적용하고, stale in-flight 검색 응답은 취소/무시해 항상 최신 키 입력의 결과가 이긴다.
  - _근거_: 한국 운영자는 전부 IME로 입력한다. 조합 중 Enter는 부분/중복 query('홍길동' 완성 도중 submit)를 보내고, 느린 네트워크에서 자모마다 refetch가 발생하며, 순서 뒤바뀐 응답이 최신 결과를 덮는 last-response-wins race가 난다. `isComposing`/`compositionend` grep = 0, 어느 toolbar SearchField에도 debounce 없음 — 영어 QA엔 안 보이지만 실사용 1순위 불만.
  - appliesTo: 모든 SearchField/필터 입력, MembersToolbar 등 검색 toolbar, shared search hook
  - ✅ acceptanceCheck: 한글 단어 입력이 완성 시 정확히 1개 query만 발행(자모당 1개 아님), 조합 중 Enter가 submit하지 않음, 지연된 이전 응답이 최신 응답을 절대 대체하지 않음(e2e로 out-of-order 응답 검증).

- **[COMP-11] (P1)** 기간 필터 리스트는 단일 DS 날짜 범위 필터(keyboard 조작 가능, ko-KR 포맷, '오늘/최근 7일/이번 달/지난 달' preset)를 사용한다. `start ≤ end`를 강제하고 위반 시 silent empty가 아니라 인라인 검증 메시지를 띄우며, 선택 범위는 URL list-state(IA-13)에 반영한다.
  - _근거_: 기간 필터링은 최다 사용 ERP 작업이자 오류나기 쉬운 곳이다. 범위 검증이 없으면 종료일<시작일이 STATE-05가 '결과 없음'으로 오보하는 혼란스러운 empty를 낳고, preset이 없으면 매 triage가 수동 입력으로 시작되며, per-page 손수 picker는 포맷/로케일/키보드 a11y가 drift한다.
  - appliesTo: 가입일/주문일/결제일/배송일 등 기간 필터 리스트, 공유 DateRangeFilter
  - ✅ acceptanceCheck: 종료일<시작일 시 empty 테이블이 아니라 특정 검증 에러 표시, preset이 범위를 채움, 선택 범위가 URL로 새로고침 후에도 유지.

- **[COMP-12] (P2)** 길이 제한이 있는 text input/textarea는 '현재/최대' 실시간 카운터를 보이고, 상한 근접 시 경고하며, submit 전 인라인 검증(서버 전용 아님)한다. counting 기준(code point vs byte)을 정의하고 서버 강제와 일치시킨다.
  - _근거_: 공지/문의 답변/메모 작성 시 예고 없이 상한에 걸리면 필드가 조용히 입력을 멈추거나(고장처럼 보임) 저장 시에만 서버가 거절(재작업)한다. 조합형 한글은 naive char count와 다르게 세어지므로 기준이 명시돼야 한다.
  - appliesTo: 제목/메모/반려 사유, 로드맵 HTML editor, 길이 제한 필드
  - ✅ acceptanceCheck: 길이 제한 제목/메모가 실시간 카운트를 보이고 상한 근접 시 경고, over-limit submit를 특정 메시지로 차단(조용한 truncate/저장 실패 아님).

---

## FEEDBACK — 다이얼로그 및 피드백 (toast / confirm / guard)

- **[FEEDBACK-01] (P1)** 결과 피드백은 '사라져도 되는가?' 규칙으로 배치한다: write 성공/실패 → toast(error toast는 자동 소멸 없이 '다시 시도' 포함); read 실패·지속 공지 → 인라인 Alert; 다이얼로그 내부 실패 → 그 다이얼로그의 error 배너(modal 뒤에 숨는 toast 금지). 스택 toast 최대 3개, page는 임의 배너 state를 갖지 않는다.
  - _근거_: 일관된 배치가 운영자 신뢰의 근거. `shared/ui/README.md`·ToastProvider에 규정됐고 이탈은 per-page 배너 drift를 재유발.
  - appliesTo: ToastProvider, ConfirmDialog, 모든 list/detail/form 피드백
  - ✅ acceptanceCheck: ConfirmDialog 내부 delete 실패는 다이얼로그 error 배너(toast 아님). 독립 write 실패는 retry toast. read 실패는 인라인 Alert.

- **[FEEDBACK-02] (P0)** 모든 파괴적/비가역 액션은 ConfirmDialog로 게이트하고 intent(create/update/delete/discard)를 tone/icon/label에 매핑한다. busy 중 confirm 버튼을 disable+aria-busy('처리 중…' 라벨)로 더블클릭 차단; 실패 시 다이얼로그를 열어둔 채 danger Alert 배너를 보이고 재클릭이 retry; cancel/Esc/dim-click은 in-flight 요청을 abort하고 pending state를 리셋한다.
  - _근거_: ~22 page의 확립된 좋은 패턴 — 파괴적 플로우가 실패 시 이탈/이중 발사되지 않도록 강제 계약이어야 한다.
  - appliesTo: ConfirmDialog, useCrudList, 모든 delete/discard page
  - ✅ acceptanceCheck: 강제 실패 delete가 다이얼로그를 error 배너와 함께 유지하고 재클릭 시 retry. in-flight 중 닫으면 false toast 없이 abort되고 버튼 state 복원.

- **[FEEDBACK-03] (P1)** 모든 파괴적/변경 액션은 성공·실패 양 경로에 결과 피드백을 연결한다: 성공 → toast.success; 실패 → toast.error(가능 시 retry) 또는 in-dialog error 배너. 클릭이 아무 변화도 안 내는 no-op state를 남기지 않는다.
  - _근거_: 현재 call site마다 onError를 개별 배선 — 누락 위험. 신호가 없으면 성공 여부를 알 수 없다.
  - appliesTo: `queries.ts`의 모든 mutation call site(create/update/delete/toggle/reorder)
  - ✅ acceptanceCheck: 각 mutation에 성공·실패 피드백(e2e/review). dev 강제 실패(`dev.ts failIfRequested`)가 항상 사용자 가시 실패를 보임.

- **[FEEDBACK-04] (P0)** unsaved 변경을 3개 이탈 경로 모두에서 가드한다 — browser unload(beforeunload), in-app link(capture-phase intercept), back/forward(popstate sentinel) — RHF `isDirty` 기반, `isDirty && !saving`일 때만 discard-intent ConfirmDialog를 띄우고, 폼이 not-dirty가 되는 즉시(저장 후)나 self-initiated navigation에서는 가드를 해제한다.
  - _근거_: 입력 내용의 silent 손실은 용납 불가. `useUnsavedChangesDialog`가 3경로와 `_self`/modifier-click edge case를 구현 — 모든 폼이 배선해야 한다.
  - appliesTo: useUnsavedChangesDialog; FormPageShell, DocumentFormShell, AccountFormPage, 모든 폼
  - ✅ acceptanceCheck: dirty 폼에서 tab-close + sidebar link + browser Back 각각 discard 다이얼로그를 띄움. 저장 성공 후 동일 navigation은 프롬프트 없이 통과.

- **[FEEDBACK-05] (P2)** 파괴적 액션에는 비가역성 고지가 있는 명시적 confirm **또는** post-action undo window를 제공한다 — 단일 클릭 비가역 delete 금지. soft-delete/undo 채택 시 window 내 복원용으로 record를 snapshot한다.
  - _근거_: 현재 delete는 confirm-before + 즉시 + 비가역, undo 없음 — 고가치 record는 실수 복구용 grace window가 유익.
  - appliesTo: useCrudList delete, MembersPage delete, 모든 delete 경로
  - ✅ acceptanceCheck: 모든 delete가 delete-intent ConfirmDialog를 열거나 window 내 복원 undo toast를 emit. 단일 미확인 클릭으로 실행되는 delete 없음.

- **[FEEDBACK-06] (P0)** 편집 가능한 폼을 담은 **모든 modal은 모든 modal 이탈 경로(dim-click, Esc, ×, Cancel)에서 dirty close를 가드**한다: RHF `isDirty && !saving`이면 close를 intercept해 입력을 파괴하는 대신 discard-intent ConfirmDialog를 띄우고, pristine/방금 저장된 modal은 프롬프트 없이 닫힌다.
  - _근거_: IA-06이 짧은 taxonomy 엔티티를 modal에서 편집하도록 강제하므로, FEEDBACK-04가 page에서 보호하는 바로 그 상호작용(입력 + 실수 이탈)이 modal에서는 무방비다. 빗나간 dim-click이나 반사적 Esc가 반쯤 채운 그룹/카테고리/역할 폼을 조용히 삭제한다 — FEEDBACK-04 P0의 자연스러운 확장.
  - appliesTo: CreateGroupModal, ProductCategoryFormModal, PortfolioCategoryFormModal, RoleFormModal, LogoFormModal; 폼을 담은 모든 modal
  - ✅ acceptanceCheck: CreateGroupModal에 입력 후 Esc / scrim 클릭 / × 클릭 → discard 확인 등장. 손대지 않은 modal에서 같은 동작은 즉시 닫힘.

---

## A11Y — 접근성 (WCAG 지향 a11y 계약)

- **[A11Y-01] (P0)** 항상 마운트된 toast viewport를 live region으로 만든다: role + aria-live를 (성공/취소/info용 안정 polite region과 error용 assertive region으로) 어떤 toast보다 먼저 존재하는 지속 컨테이너에 두고 toast 텍스트를 주입한다 — 동적 삽입된 Toast가 지닌 aria-live에 의존하지 않는다.
  - _근거_: 피드백이 toast 전용이고 page는 인라인 state를 안 가지므로, 내용과 함께 생성된 live region은 NVDA/JAWS/VoiceOver에서 신뢰성 있게 announce되지 않아 AT 사용자가 모든 CRUD 결과를 놓친다.
  - appliesTo: ToastProvider viewport(shared/ui/ToastProvider.tsx)
  - ✅ acceptanceCheck: ToastProvider 컨테이너가 비어있을 때도 aria-live를 지님을 unit-test. 스크린리더로 toast.success()/error()가 announce.

- **[A11Y-02] (P0)** Modal에 aria-describedby(또는 bodyId prop)를 주고 ConfirmDialog가 message(및 error) 요소를 가리키게 해, 다이얼로그 open 시 title과 purpose를 모두 announce한다.
  - _근거_: aria-labelledby만으론 title만 announce. 하중 콘텐츠인 확인 메시지('정말 삭제하시겠습니까…')가 연결되지 않아 파괴적 확인을 눈감고 하게 됨.
  - appliesTo: Modal, ConfirmDialog
  - ✅ acceptanceCheck: delete ConfirmDialog open 시 스크린리더가 message를 읽음. 다이얼로그의 aria-describedby가 message paragraph id로 해석.

- **[A11Y-03] (P1)** ConfirmDialog 초기 포커스를 안전·유의미한 컨트롤(delete/discard intent는 Cancel 버튼)로 `Modal.initialFocusRef`를 통해 설정한다 — header close(×) 금지.
  - _근거_: header ×에 착지하면 맥락이 없고 첫 Enter가 모호한 close로 편향. least-destructive default focus가 확인 관례.
  - appliesTo: ConfirmDialog
  - ✅ acceptanceCheck: 각 intent의 ConfirmDialog open 시 `document.activeElement`가 Cancel 버튼. Tab 순서가 Cancel에서 시작.

- **[A11Y-04] (P1)** 포커스된 컨트롤이 busy로 disable될 때 포커스를 modal 안에 유지한다: ConfirmDialog가 confirm 버튼을 disable하면 여전히 enabled인 Cancel 버튼(또는 다이얼로그)으로 포커스를 의도적으로 이동해 Tab-trap과 Esc가 계속 동작하게 한다.
  - _근거_: 스스로 disable된 포커스 요소는 포커스를 portal 밖 document.body로 떨군다 — trap과 Esc-to-close가 무력화되고 비동기 중 배경 page가 도달 가능해진다.
  - appliesTo: ConfirmDialog, Modal focus trap
  - ✅ acceptanceCheck: Confirm 클릭으로 busy 진입 후 Tab·Esc: 포커스가 다이얼로그 내 유지, Esc가 여전히 cancel. confirm disable 후 activeElement가 dialogRef 내부.

- **[A11Y-05] (P1)** SelectField의 isInvalid를 AT에 반영: `<select>`에 aria-invalid 설정(native override 우선), TextField를 미러하는 aria-describedby error 연결 지원 — 색상만의 red border 금지.
  - _근거_: isInvalid가 오늘 border만 칠함 — 스크린리더에 invalid를 알리지 않아 WCAG 1.4.1/3.3.1 실패.
  - appliesTo: SelectField
  - ✅ acceptanceCheck: `<SelectField isInvalid />`가 `<select aria-invalid='true'>` 렌더. caller aria-describedby가 error 메시지 연결.

- **[A11Y-06] (P1)** shell의 첫 focusable 요소로 keyboard 도달 가능한 'skip to main content' link를 제공하고 `<main>`에 id + tabIndex=-1 타깃을 준다.
  - _근거_: 모든 route가 큰 다중 섹션 nav를 main 앞에 렌더 — bypass가 없으면 keyboard/SR 사용자가 매 page 전체 메뉴를 Tab(WCAG 2.4.1).
  - appliesTo: AppShell
  - ✅ acceptanceCheck: page load에서 Tab 1회가 가시 skip link에 멈추고, 활성화 시 `<main>`으로 포커스 이동. e2e가 포커스 착지 검증.

- **[A11Y-07] (P1)** SPA route 변경 시 포커스를 main content(또는 page heading)로 이동하고 polite live-region route announcer로 새 page를 announce한다.
  - _근거_: NavLink navigation은 포커스를 nav item에 남기고 아무것도 변경을 announce하지 않아 keyboard/SR 사용자가 신호 없이 nav부터 재탐색.
  - appliesTo: AppShell/router, main Outlet
  - ✅ acceptanceCheck: route 간 이동 시 스크린리더가 새 page title을 announce하고 activeElement가 main 타깃으로 이동.

- **[A11Y-08] (P1)** 클릭 가능한 모든 행 목적지에 동일 타깃으로 향하는 row 내 keyboard-focusable 등가물(link/button)을 둔다. 테이블이 `rowNavProps(to)`로 detail navigation을 쓰면 mouse-only row onClick에 의존하지 말고 focusable name link를 행에 포함한다.
  - _근거_: `useRowNavigation`은 명시적으로 mouse-only이며 접근 가능한 row 내 경로 존재를 가정 — 미강제라 link 없는 행은 keyboard로 도달 불가(WCAG 2.1.1).
  - appliesTo: useRowNavigation, 모든 row-nav 리스트 테이블
  - ✅ acceptanceCheck: 각 row-nav 리스트에서 행을 Tab하면 row 클릭과 동일 detail을 여는 focusable 컨트롤에 도달. e2e가 keyboard 활성화로 detail open을 assert.

- **[A11Y-09] (P1)** 위험 토큰 쌍(surface-raised 위 text-muted, ghost/secondary 버튼 텍스트, placeholder, feedback surface 위 feedback 텍스트, backdrop dim)의 대비를 WCAG 1.4.3(본문 4.5:1, large/non-text 3:1) 대비 light/dark에서 측정·문서화하고 미달 토큰을 조정한다. disabled 텍스트는 면제, muted 본문은 아님.
  - _근거_: raised surface 위 muted 텍스트가 광범위(table header, hint, ToggleSwitch OFF label, filter heading) 사용되나 미검증 — 저대비 회색은 흔히 4.5:1 실패.
  - appliesTo: tokens.json color 쌍; table header, hints, ToggleSwitch OFF label, filter heading
  - ✅ acceptanceCheck: 대비 체커가 양 테마의 각 쌍 비율을 기록하고 각기 임계값 충족.

- **[A11Y-10] (P2)** TextField 인라인 error 요소에 role='alert'(FormField/ImageUploadField와 일치)를 aria-describedby 연결에 더해 부여해, 이미 포커스된 필드에 나타나는/바뀌는 error가 announce되게 한다.
  - _근거_: on-blur/변경 error는 live region 없이 announce 안 됨 — 필드 primitive 간 불일치로 error announce가 앱 전반 비일관.
  - appliesTo: TextField
  - ✅ acceptanceCheck: 포커스된 TextField의 on-blur 검증 error가 스크린리더로 announce. error `<p>`가 role='alert'.

- **[A11Y-11] (P0)** 모든 폼 컨트롤에 DS field-association 계약 적용: aria-invalid 설정 시 항상 해당 error `<p>` id를 aria-describedby로 연결(`errorIdOf`), hint는 valid일 때만 `hintIdOf`로 연결, required는 native required/aria-required로 노출 — 또는 이를 자동 배선하는 DS TextField/SelectField/FormField로 이관.
  - _근거_: aria-describedby 없는 aria-invalid는 '왜' invalid인지 못 알림. AccountFormPage(biz-no/ceo/credit-limit)와 CreateGroupModal이 describedby·required semantics 누락.
  - appliesTo: AccountFormPage, CreateGroupModal, 손수 만든 모든 page/modal 폼
  - ✅ acceptanceCheck: aria-describedby 없는 aria-invalid grep = 0. RTL이 input의 aria-describedby === role=alert `<p>` id를 assert, required input이 aria-required 노출.

- **[A11Y-12] (P0)** 좌측 필터 list item의 'selected' state를 앱 전반 단일 ARIA 속성 — aria-pressed — 로 표기하고 이 toggle role에 aria-current 금지.
  - _근거_: 같은 toggle 필터가 비일관 노출(EsgCategoryFilter는 aria-current, 나머지 4개는 aria-pressed)돼 AT가 화면마다 다르게 읽음.
  - appliesTo: TierFilter, NoticeFilters, LoginHistoryFilters, GroupFilter, EsgCategoryFilter
  - ✅ acceptanceCheck: `*Filter.tsx`/`*Panel.tsx`의 aria-current grep = 0. 모든 filterItemStyle 버튼이 aria-pressed={active}.

- **[A11Y-13] (P1)** 폼(page·modal) open 시 첫 편집 필드에 포커스하고, submit 검증 실패 시 첫 invalid 필드로 포커스 이동(`useCrudForm.submit`이 `handleSubmit(onValid, focusFirstError)` 호출).
  - _근거_: 오늘은 modal만 initialFocus + error-focus. useCrudForm 기반 page 폼은 자동 첫 필드 포커스·error 포커스가 없어 실패 시 error를 찾아 헤맴.
  - appliesTo: useCrudForm, FormPageShell 폼, AccountFormPage, modal 폼
  - ✅ acceptanceCheck: 빈 required 값 submit 시 activeElement가 첫 error 컨트롤. 폼 진입 시 첫 필드 포커스. useCrudForm이 onInvalid 포커스 콜백 노출/호출.

- **[A11Y-14] (P2)** ImageUploadField의 비동기 결과 — '업로드 완료' 성공 확인과 load-failure title — 을 polite status live region에 두어 완료/실패가 announce되게 한다(오늘은 client 검증 error만).
  - _근거_: 성공 업로드/preview와 image load 실패가 스크린리더 사용자에게 무음.
  - appliesTo: ImageUploadField
  - ✅ acceptanceCheck: 유효 image 업로드가 완료 메시지를 announce. 성공 노드가 role='status'/aria-live='polite'.

- **[A11Y-15] (P2)** toast의 keyboard dismiss(retry/close) 시 포커스를 document.body가 아니라 안정된 정의 요소로 복귀시키고, 스택된 retry 버튼에 구분 가능한 accessible name(메시지 맥락 포함)을 준다.
  - _근거_: 포커스된 toast unmount가 포커스를 body로 떨구고, 동일한 '다시 시도' 버튼 여러 개가 AT에 구분 불가.
  - appliesTo: Toast, ToastProvider
  - ✅ acceptanceCheck: retry/close를 keyboard로 활성화 시 포커스가 정의 요소(body 아님)에 착지. 다중 toast 시 각 retry 버튼이 고유 accessible name.

- **[A11Y-16] (P1)** 모든 신규 인터랙티브 표면은 표준 a11y 계약을 충족한다: semantic role; keyboard 조작성(Tab 도달 + Enter/Space 활성화 + overlay Esc dismiss); 가시 focus-visible ring; programmatic label/description 연결; 비동기 status live-region announce; 이중(비색상) state 인코딩; disabled/busy를 aria-disabled/aria-busy로 노출.
  - _근거_: DS는 core primitive에서 대부분 충족 — 명문화로 Radix/TanStack Table/FullCalendar 도입 시 회귀 방지.
  - appliesTo: 모든 신규 컴포넌트; component contract 체크리스트; CI
  - ✅ acceptanceCheck: a11y acceptance 항목이 contract 체크리스트에 있고 Vitest/Playwright(role, focus trap, live region)로 커버. jest-axe/axe-playwright가 대표 page에서 통과, CI가 위반을 차단.

---

## MOTION — 모션

- **[MOTION-01] (P0)** Modal organism에 Motion 기반 enter/exit transition을 추가한다: backdrop opacity fade; dialog opacity + 미세 scale(0.96→1) 또는 translateY; AnimatePresence로 exit 완료 후에만 unmount. duration = motion.duration.normal, easing standard(enter는 decelerate 허용). ConfirmDialog가 상속.
  - _근거_: Modal/ConfirmDialog가 즉시 pop in/out — 가장 눈에 띄는 급격한 전환. 파괴적 확인일수록 매끄러운 맥락 전환이 유익.
  - appliesTo: packages/ui/src/organisms/Modal, ConfirmDialog
  - ✅ acceptanceCheck: open/close가 backdrop fade + dialog scale/translate를 보이고 exit 후에만 DOM 제거. prefers-reduced-motion에선 즉시 등장/제거. focus trap/Esc/focus-restore 회귀 없음.

- **[MOTION-02] (P0)** toast exit를 애니메이트한다: ToastProvider가 즉시 filter-out 대신 AnimatePresence exit(fade + translateY/scale)를 unmount 전 실행. exit duration = fast~normal, easing accelerate.
  - _근거_: entrance만 애니메이트되고 dismiss가 급격히 끊김 — 여러 스택 toast가 사라질 때 특히 거슬림.
  - appliesTo: ToastProvider, Toast
  - ✅ acceptanceCheck: auto/manual dismiss가 exit 애니메이션을 보임. queue(max 3)와 ARIA live가 동시 toast에서 유지. reduced-motion은 즉시 제거.

- **[MOTION-03] (P0)** 모든 신규 Motion을 단일 reduced-motion 게이트(Motion `useReducedMotion()` 또는 `MotionConfig reducedMotion='user'`)로 라우팅해 prefers-reduced-motion:reduce가 movement/scale transition을 제거(0ms/no transform)하게 하고, ToggleSwitch handle transform transition에 누락된 `@media(prefers-reduced-motion:reduce)` off를 추가한다.
  - _근거_: tokens.json이 'reduced-motion → 0ms'를 규정하나 강제하는 것이 없고, ToggleSwitch가 이미 위반(off 없는 transform transition) — Motion 도입은 구멍을 넓힌다.
  - appliesTo: 글로벌 Motion config; ToggleSwitch.css; Modal/Toast/list/toggle
  - ✅ acceptanceCheck: reduced-motion 활성 시 어디서도 move/scale transition 없음(Storybook/e2e emulateMedia). ToggleSwitch.css에 reduced-motion off 포함.

- **[MOTION-04] (P1)** 테이블 행 add/remove/reorder에 절제된 layout(FLIP) motion을 Motion layout/AnimatePresence로 duration.fast에 적용하되, 큰 리스트(virtualization/pagination 경계)는 count cap 또는 disable로 가드한다. 필터/page 전환은 애니메이트하지 않는다.
  - _근거_: CrudTable 행이 snap in/out돼 reorder/delete의 시각적 인과가 깨짐 — 그러나 대형 엔터프라이즈 테이블의 과도 애니메이션은 산만·느림.
  - appliesTo: CrudTable rows
  - ✅ acceptanceCheck: 행 delete 시 나머지가 매끄럽게 위로 당겨지고 reorder가 애니메이트. ≥50행 또는 reduced-motion에선 off/즉시, scroll+selection 보존.

- **[MOTION-05] (P2)** reorder에 drag 마이크로 인터랙션 추가: grab 시 cursor:grabbing, drag 중 row lift(raised shadow/미세 scale), drop 시 settle; keyboard reorder(up/down)는 visual lift 없이 동등 결과를 낸다.
  - _근거_: TableReorder grip이 cursor:grab만 보임 — drag 피드백 없이는 어느 행을 쥐었는지 알 수 없음.
  - appliesTo: TableReorder grip cell, logo-list reorder
  - ✅ acceptanceCheck: drag 시작이 cursor를 grabbing으로 바꾸고 행을 lift. drop이 optimistic update/rollback을 정확 적용. keyboard reorder가 동일 순서 생성. reduced-motion이 lift 최소화.

- **[MOTION-06] (P2)** route/section 전환을 layout/navigation motion으로 애니메이트하지 않는다. 채택 시에도 매우 짧은(≤fast) opacity crossfade만 `<Outlet>` 콘텐츠에 한정 허용하고, AppShell/header/sidebar 이동과 route slide는 금지한다.
  - _근거_: 엔터프라이즈 admin에서 화면 전환 slide/parallax는 작업을 늦추고 motion sickness를 유발 — motion은 인과가 있는 곳(modal/toast/list)에 속함.
  - appliesTo: App.tsx Routes, AppShell
  - ✅ acceptanceCheck: section 변경 시 nav/shell 정지. content fade는 reduced-motion에서 즉시이고 focus move/route announce를 지연시키지 않음.

- **[MOTION-07] (P2)** motion guide에 금지 목록을 명문화한다: focus ring transition 금지; 기존 pulse 외 추가 skeleton motion 금지; KPI count-up 남용 금지; spinner 외 영구/무한 애니메이션 금지; parallax 금지; 콘텐츠를 지연시키는 대형 entrance 금지.
  - _근거_: motion 라이브러리 도입은 남용을 부른다 — focus ring은 a11y 보존을 위해 즉시여야 하고 반복/대형 entrance는 산만·인지 부하.
  - appliesTo: docs/Storybook motion guide; 모든 신규 motion PR
  - ✅ acceptanceCheck: motion guide에 allowed-vs-forbidden 표 존재. PR 리뷰가 focus ring/skeleton/route에 movement motion 없음을 확인.

- **[MOTION-08] (P1)** accelerate easing을 semantic motion tier에 노출하고 재사용 motion recipe를 토큰으로 정의한다(interactive hover, press, overlay-enter=decelerate, overlay-exit=accelerate). button/row/card transition을 duration.fast + standard로, modal/toast enter/exit를 overlay recipe로 표준화 — 모두 reduced-motion 규칙으로 게이트.
  - _근거_: 토큰은 좋으나 채택이 얕고 비일관(bg-color + skeleton만), exit easing 미노출 — motion이 없거나 임의로 느껴짐.
  - appliesTo: tokens.json motion(semantic), Button/Tabs/ListRow/Card, Modal/Toast
  - ✅ acceptanceCheck: motion.easing.accelerate가 semantic에 존재. Modal/Toast가 enter/exit 토큰 소비. interactive 컴포넌트가 하나의 transition recipe 공유. reduced-motion이 테스트에서 여전히 0ms 강제.

---

## IA — 정보 구조 및 페이지 구성

- **[IA-01] (P0)** 모든 routed 화면은 AppShell(fixed sidebar + AppHeader + 단일 padded `<main>`) 안에서 렌더한다. 어떤 화면도 자체 outer frame/sidebar/top bar를 도입하지 않는다.
  - _근거_: AppShell이 단일 구조 frame이자 nav 단일 소스(nav-config.ts) — 균일 framing이 IA 일관성의 기준선.
  - appliesTo: App.tsx APP_ROUTES, AppShell, nav-config.ts
  - ✅ acceptanceCheck: 모든 APP_ROUTES가 AppShell layout route 아래 렌더. 자체 sidebar/header를 렌더하는 page 없음.

- **[IA-02] (P0)** 모든 page 타입에 단일 page-header/title 모델을 표준화한다(title이 AppHeader에서 오는지 in-content h1에서 오는지 정의·균일 적용). sub-route(detail/form)는 `findNavLabel`의 branch label이 아니라 구체적 title(예: '공지 등록')을 노출한다.
  - _근거_: list page엔 in-content title이 없고 form/detail엔 있으며 AppHeader가 sub-route에 모호한 branch label을 보임 — title 소스가 모순.
  - appliesTo: AppHeader, findNavLabel, FormPageShell/detail page
  - ✅ acceptanceCheck: `/content/notices/new`의 가시 primary title이 '공지 등록'(‘콘텐츠 관리’ 아님). list/detail/form이 동일 문서화 메커니즘으로 title 해석.

- **[IA-03] (P1)** 모든 non-top-level route의 page header에 breadcrumb(section > page [> record])를 렌더하고 parent link는 parent list로 이동 가능하게 한다.
  - _근거_: 위치 trail이 어디에도 없어 detail/form route 사용자가 어느 섹션/리스트인지 못 봄.
  - appliesTo: AppHeader, detail/form route
  - ✅ acceptanceCheck: detail/form route가 '콘텐츠 관리 > 공지사항 > 등록' 같은 trail 렌더, link가 parent list로 이동 — 3개 섹션에서 검증.

- **[IA-04] (P0)** 모든 list 화면이 하나의 list 템플릿을 따른다: toolbar row(검색/필터 좌측, primary 등록/추가 버튼 우상단) → 결과 count 요약 → SelectionBar(bulk action 있을 때) → table → 한 page 초과 가능 시 Pagination.
  - _근거_: CrudListShell이 대부분 인코딩하나 members/categories가 부분 이탈하고 members만 실제 pagination — 대형 데이터셋에 paging 계약이 정의되지 않음.
  - appliesTo: CrudListShell, 모든 `*ListPage`, members/categories
  - ✅ acceptanceCheck: 각 list가 primary action을 우상단에, count 요약을 보임. page size 초과 가능한 모든 list가 Pagination 렌더(members뿐 아님).

- **[IA-05] (P0)** 같은 엔티티의 create·edit를 `:id`로 구분되는 하나의 컴포넌트/route 쌍에서 제공하고, 레이아웃은 동일, title(등록 vs 수정)과 prefill 값만 다르게 한다.
  - _근거_: FormPageShell + useCrudForm이 이미 확립 — per-page 선택이 아니라 규칙이어야 한다.
  - appliesTo: FormPageShell, useCrudForm, 모든 엔티티 폼
  - ✅ acceptanceCheck: 모든 엔티티에서 `/…/new`와 `/…/:id/edit`가 동일 폼 컴포넌트로 해석. create 전용/edit 전용 page 별도 존재 안 함.

- **[IA-06] (P1)** 폼 전달 방식을 엔티티 무게로 선택한다: rich 엔티티는 전용 form route(FormPageShell 또는 preview 2-col shell), 짧은 taxonomy 엔티티는 inline-list + Modal. 혼용 금지(routed 엔티티의 modal edit 금지, taxonomy row의 route 금지).
  - _근거_: Categories→modal vs 그 외→page는 합리적 분리이나 현재 암묵적.
  - appliesTo: products/portfolio/support categories(modal); 모든 list 엔티티(route)
  - ✅ acceptanceCheck: Category page는 Modal 패턴, 모든 list-엔티티 edit는 전용 route를 염. 선택이 문서화된 무게 규칙과 일치.

- **[IA-07] (P1)** 모든 detail·form page의 back-navigation 컨트롤을 표준화한다: 단일 label('목록으로'), 단일 icon(ChevronLeftIcon), 단일 element 타입, 좌상단 배치.
  - _근거_: MemberDetailPage('리스트로 돌아가기' + ArrowLeftIcon + Link)가 '목록으로' + ChevronLeftIcon을 쓰는 ~29 page 대비 유일 이탈.
  - appliesTo: MemberDetailPage; 모든 detail/form page
  - ✅ acceptanceCheck: page back-link에 '리스트로 돌아가기'/ArrowLeftIcon grep = 0. MemberDetailPage가 공유 back-link와 일치.

- **[IA-08] (P1)** footer action bar를 표준화한다 — primary save 우측, secondary 취소 그 왼쪽, 일관 위치(inside-card 또는 below-card 중 택1) — FormPageShell, DocumentFormShell, 2-col preview shell, edit-in-detail page 전반(label 변형 등록/저장/처리 저장 허용).
  - _근거_: footer 배치/구성이 3+가지(inside card, below card, save-only, list+save)라 save/cancel affordance가 화면마다 이동.
  - appliesTo: FormPageShell, DocumentFormShell, Popup/Quote forms, InquiryDetailPage
  - ✅ acceptanceCheck: form/detail page 전반에서 취소·save 버튼이 동일 상대 위치·컨테이너. 어떤 폼도 page-level footer를 쓰는데 형제가 in-card footer를 쓰지 않음.

- **[IA-09] (P2)** detail-page 우상단 action cluster에 단일 affordance 규칙 적용: ≤N action은 고정 primary 버튼(예: 수정/삭제), 임계값 초과 시에만 ⋯ ActionMenu로 승격, 모든 detail page에 일관.
  - _근거_: NoticeDetail(명시 버튼) vs MemberDetail(⋯ 메뉴)가 같은 슬롯을 규칙 없이 다르게 표현.
  - appliesTo: NoticeDetailPage, MemberDetailPage, 모든 detail page
  - ✅ acceptanceCheck: action 수가 같은 detail page는 같은 affordance 사용. 버튼-vs-메뉴 임계값이 문서화·준수.

- **[IA-10] (P2)** 우측 preview panel(popup/banner/quote/inquiry/ticket)을 단일 tokenized split breakpoint를 쓰는 하나의 공유 2-column layout primitive(좌 입력 / 우 preview Card)로 렌더하고 narrow에선 vertical stack으로 collapse한다.
  - _근거_: 2-col split이 page마다 손수 만들어지고 breakpoint가 *12/*13/*15로 drift, 공유 shell 없음.
  - appliesTo: PopupFormPage, QuoteFormPage, BannerFormPage, inquiry/ticket, marketing forms
  - ✅ acceptanceCheck: 모든 preview 폼이 하나의 layout 상수/shell 소비. 단일 space-6 배수가 collapse point 정의. per-page 임의 12/13/15 split grep = 0.

- **[IA-11] (P2)** 읽기전용 record detail을 공유 dl/dt/dd + Card + CardTitle + StatusBadge primitive로 제시한다 — bespoke key/value layout 금지.
  - _근거_: dlStyle/dtStyle/ddStyle이 이미 표준화됐고 NoticeDetail/InquiryDetail이 따름 — 의무화해야 한다.
  - appliesTo: NoticeDetail, MemberDetail, InquiryDetail, 모든 detail page
  - ✅ acceptanceCheck: 모든 detail page의 읽기전용 필드가 Card 내 dlStyle/dtStyle/ddStyle로 렌더. two-column definition grid를 손수 만드는 page 없음.

- **[IA-12] (P2)** 두 form scaffold를 통합해 preview 2-col form family가 back-link + title + description + footer를 공급하는 단일 shell(FormPageShell 미러)을 공유하고, page당 field/preview 콘텐츠만 남긴다.
  - _근거_: preview-form family가 FormPageShell이 중앙화한 header/back/footer를 중복 — back-link/footer/breakpoint drift의 근본 원인.
  - appliesTo: FormPageShell + 손수 만든 preview form(Popup/Quote/Banner)
  - ✅ acceptanceCheck: preview 기반 form page가 chrome용 공유 shell을 import. Popup/Quote/Banner가 titleStyle/backLinkStyle/actionsStyle을 재선언하지 않음.

- **[IA-13] (P0)** list query state(page, page-size, active filters, keyword, sort)를 **URL query string에 직렬화해 단일 source of truth로** 삼는다. 그래서 back/forward·refresh·복사 link가 정확한 view를 복원하고, detail route에서 복귀 시 원래 list의 page+filters(가능하면 scroll 위치)를 복원한다.
  - _근거_: 핵심 운영 루프 — list 필터 후 3페이지 45번째 행을 열고 브라우저 Back → 필터 없는 1페이지 최상단으로 착지해 10초의 셋업 손실. F5도 동일. 운영자는 '이 조건 좀 봐주세요' 하며 필터 view link를 공유하는데 URL state 없이는 불가능. `useSearchParams` 미사용, shared/crud는 useNavigate/useParams만 import, 필터/page state가 컴포넌트 useState에만 존재 — 이것이 모든 list 요구사항(IA-04, ERP 필터)을 무력화한다.
  - appliesTo: shared/crud(useCrudList), 모든 `*ListPage`, 좌측 필터, DateRangeFilter(COMP-11)
  - ✅ acceptanceCheck: 필터 적용 + 3페이지 이동 + detail open + Back → 동일 필터 3페이지 렌더. URL을 새 탭에 복사 → 동일 필터 list 재현.

- **[IA-14] (P1)** 지원 viewport 범위와 반응형 동작을 선언한다: 최소 지원 폭을 정의하고, sidebar breakpoint 아래에서는 AppShell nav를 keyboard 도달 가능한 drawer/hamburger로 collapse한다. wide table은 bounded container 내에서 가로 scroll(page grid 파괴 금지)하며 identity/selection 컬럼은 선택적으로 sticky. coarse pointer에서 인터랙티브 타깃(icon 버튼 포함)은 최소 touch-target 크기를 충족한다.
  - _근거_: 스펙 전체가 암묵적으로 desktop 전용이나 그것을 명시하지 않는 것 자체가 격차 — QA는 scope 밖을 테스트할 수 없다. fixed sidebar가 태블릿에서 절반을 먹는지, wide table이 가로 scroll하는지 card로 reflow하는지, ghost pencil/trash가 ≥44px인지 답이 없다. 한국 운영자는 태블릿/폰에서 대시보드를 확인한다.
  - appliesTo: AppShell nav/sidebar, CrudTable/DataTable 컨테이너, icon 버튼, 전역 breakpoint 토큰
  - ✅ acceptanceCheck: 768px·375px에서 sidebar가 콘텐츠와 겹치지 않고 collapse, wide table이 overflow 대신 가로 scroll, row action icon이 touch-target 최소치 충족.

---

## ERP — 한국형 ERP / Toss 폴리시 (관례 및 포맷)

- **[ERP-01] (P1)** 공유 domain code에 단일 status→tone 레지스트리를 두어 ERP lifecycle status(대기/임시/승인/반려/진행중/완료/취소/보류/배송중/배송완료 등)를 5개 StatusBadge tone에 매핑하고, 모든 page가 per-page meta helper 대신 이를 소비하게 한다.
  - _근거_: tone 선택이 per-page(quoteStatusMeta)라 같은 semantic state가 견적/계약/문의/배송에서 다른 색으로 렌더 — ERP의 신뢰 위험.
  - appliesTo: StatusBadge, quoteStatusMeta 및 견적/계약/문의/배송 peer
  - ✅ acceptanceCheck: 하나의 export된 map/함수가 status→tone 유일 소스. quoteStatusMeta 등이 이를 import. 모든 domain status가 정의된 tone으로 해석됨을 테스트.

- **[ERP-02] (P1)** 테이블 density를 component.table cell-padding 토큰 기반으로 만들어 comfortable(default)·compact variant를 두고, 전강도 per-row border 대신 더 옅은 divider 토큰 및/또는 optional zebra로 행 구분을 완화한다.
  - _근거_: 한국 ERP grid는 dense list에 compact가 필요하고 Toss는 최소 divider + 여백을 선호 — 현 fixed medium density + 무거운 border는 어느 쪽도 못 산다.
  - appliesTo: CrudTable, tableStyle/thStyle/tdStyle
  - ✅ acceptanceCheck: cell padding·divider color가 component/semantic 토큰. density 전환이 토큰 값만 바꿈(px 없음). compact가 적어도 하나의 dense list에서 사용.

- **[ERP-03] (P1)** 긴 테이블에 sticky 지원 추가 — sticky thead와 sticky selection/bulk-action bar — position:sticky + 토큰 기반 offset, z-index scale, on-scroll elevation 토큰으로. 의도적으로 sticky 안 하는 테이블은 tableStyle/thStyle에 결정을 기록.
  - _근거_: ERP 테이블은 길다 — scroll 시 header·bulk-action bar 상실은 실 사용성 비용. thStyle이 배경만 주고 sticky가 없어 규칙 미정의.
  - appliesTo: CrudTable thStyle, SelectionBar, 긴 list
  - ✅ acceptanceCheck: 긴 list가 scroll 중 header + SelectionBar를 유지. offset/z-index/shadow가 토큰. Playwright e2e가 stickiness 검증(또는 non-sticky 결정 문서화).

- **[ERP-04] (P1)** sortable column header를 DS 관례로 표준화한다(clickable header, aria-sort, 가시 방향 인디케이터, keyboard 조작) — TanStack Table 도입 앞서. numeric 컬럼은 tabular-nums 우측 정렬 유지.
  - _근거_: 정렬은 ERP 기본 기대인데 오늘은 domain code의 고정 default-sort뿐 — TanStack Table 도입 시 테이블마다 affordance를 발명하는 것을 막는 관례가 필요.
  - appliesTo: CrudTable/DataTable header
  - ✅ acceptanceCheck: sortable header가 방향 인디케이터 렌더, aria-sort 설정, keyboard 조작 가능, numeric sort 컬럼이 우측정렬 + tabular-nums 유지.

- **[ERP-05] (P1)** Pagination을 확장해 total-range 표시('전체 N건 중 x–y', 공유 ko-KR formatter)와 page-size selector를 두고, 기존 windowed number list와 a11y(aria-current, label)를 유지한다.
  - _근거_: 한국 ERP grid는 가시 record 범위와 조정 가능한 page size를 기대 — 현재는 page 번호만 표시.
  - appliesTo: Pagination molecule
  - ✅ acceptanceCheck: Pagination이 공유 formatter로 range 텍스트와 size selector 렌더. range math 경계를 unit test로 커버. aria-current/label 보존.

- **[ERP-06] (P1)** 친근한 한국어 microcopy 표준(친근한 존댓말 톤; empty/loading/error/success/confirm 템플릿; 구두점·숫자·날짜 규칙이 shared/format을 경유)을 발행·강제하고 기존 사용자 대상 문자열을 정렬한다.
  - _근거_: Toss의 다가가는 목소리는 의도된 시스템 — 현 copy가 형식적 '…습니다'와 캐주얼 '방금 전'/'…중…'을 섞고 일부 포맷을 인라인화.
  - appliesTo: 모든 사용자 대상 문자열; empty/error/toast 템플릿
  - ✅ acceptanceCheck: microcopy 문서 존재. empty/error/toast 문자열이 템플릿을 따름. 날짜/숫자/금액이 shared/format 헬퍼 경유(인라인 포맷 없음). lint/review 체크리스트가 이를 참조.

- **[ERP-07] (P2)** 우측 정렬 금액 컬럼에서 '원' 단위를 숫자 figure와 분리(muted span 또는 컬럼 header)해 자릿수가 tabular-nums grid에 정렬되게 한다.
  - _근거_: formatWon이 숫자에 '원'을 붙여 우측 정렬 금액 컬럼에서 단위가 마지막 자릿수를 따라다녀 수직 정렬을 깬다.
  - appliesTo: 테이블 금액 컬럼의 formatWon caller
  - ✅ acceptanceCheck: 금액 셀이 자릿수로 정렬(단위 분리 또는 header). 테이블 컬럼의 formatWon caller 갱신. 다행 금액 컬럼 시각 확인.

- **[ERP-08] (P2)** 모든 숫자/통화/부호 delta/날짜/상대시간을 공유 formatter(format.ts / Intl 'ko-KR')로 렌더한다. 셀은 String()/toString()을 임의 호출하지 않고, 상대시간은 clock skew(미래 → 절대 날짜)와 장기 경과(>7d → 날짜)를 가드한다.
  - _근거_: 중앙화가 '10,000'/'+5,000'/'4시간 전'을 일관 유지하고 skew 가드가 '-3분 전'을 방지 — 임의 포맷은 drift 재유발.
  - appliesTo: format.ts, DataTable/CrudTable cell
  - ✅ acceptanceCheck: 테이블 셀에 raw numeric toString 없음. 미래 timestamp가 절대 날짜로 렌더. 금액이 formatSignedNumber로 천단위·부호 표시.

- **[ERP-09] (P2)** timestamp 표시를 명시적 timezone 정책의 단일 소스에서 파생한다 — 서버 시간이 UTC면 raw browser TZ가 아니라 고정 display TZ(Asia/Seoul)로 변환하거나 local-TZ 가정을 명시.
  - _근거_: format.ts가 browser-local getter(getFullYear/getMonth)를 써서 다른 TZ 관리자가 join/login 시간을 계약 없이 다르게 봄.
  - appliesTo: format.ts date 함수
  - ✅ acceptanceCheck: 포맷 함수가 정의된 TZ를 받고/생성. UTC ISO 입력이 runner OS timezone과 무관하게 동일 wall-clock 시간 렌더.

- **[ERP-10] (P2)** 문서/PDF(A4) layout 토큰과 견적서/명세서 print-template 관례(page size, margin, mono/tabular figure, 사업자번호·공급가액·부가세·합계 블록)를 강제된 react-pdf용으로 정의하고 기존 biz-no·won formatter를 재사용한다.
  - _근거_: 견적서/거래명세서는 핵심 산출물 — 공유 print 토큰·layout 규칙 없이는 문서 view가 diverge하고 하드코딩 dimension 위험.
  - appliesTo: tokens.json print/document 토큰; 견적서/거래명세서 view
  - ✅ acceptanceCheck: 문서/print layout 토큰 존재. 견적서 preview/PDF가 이를 소비하고 공유 formatter 사용. px 리터럴 없음. 합계/부가세를 기존 헬퍼로 계산.

- **[ERP-11] (P2)** 배송/송장 UI 관례 정의: 송장번호는 mono tabular-nums, 택배사는 neutral badge, 배송 state는 status→tone 레지스트리, 송장 추적 history는 기존 Timeline으로 렌더.
  - _근거_: 배송/송장 플로우는 로드맵에 있으며 one-off 스타일 대신 동일 status/number/badge 관례를 상속해야 한다.
  - appliesTo: shipping list/detail, Timeline, StatusBadge
  - ✅ acceptanceCheck: shipping list/detail이 mono 송장번호, neutral 택배사 badge, 중앙 레지스트리 StatusBadge tone, Timeline 추적을 light/dark 일관 사용.

- **[ERP-12] (P1)** 공유 list-export affordance(CSV/xlsx)를 제공해 **현재 필터된 결과 집합 전체(가시 page만이 아님)** 를 내보낸다: 한국어 컬럼 header 로컬라이즈, 값은 shared/format 경유(원/날짜/상태를 표시대로), Excel 한글 호환 UTF-8 BOM, 대량 export의 비동기 progress+cancel 경로, 명확한 scope label('현재 필터 조건 전체 N건').
  - _근거_: 엑셀 다운로드는 한국 ERP admin의 table-stakes — 운영자가 회원/주문/견적/정산 list를 보고·세무·오프라인 검토용으로 매일 내보낸다. 부재하면 '대형 데이터셋' 스토리에 탈출구가 없어 스크린샷/수기 복사로 이어진다. export는 비자명한 요구사항(현재 필터 scope, 전 page vs 현재 page, 한국어 header, 한글 mojibake 방지 UTF-8 BOM, 포맷 vs raw 값)이 있어 page마다 임의로 만들기 전에 규정돼야 한다.
  - appliesTo: 공유 export 유틸, 모든 `*ListPage` toolbar, shared/format
  - ✅ acceptanceCheck: 필터된 1,000행 list export가 올바른 한글 header와 필터된 행을 담은 UTF-8 Excel 파일을 산출하고 생성 중 progress 인디케이터를 보임.

- **[ERP-13] (P1)** shared/format에 조사(助詞) 헬퍼를 제공해 선행 단어의 마지막 Unicode Hangul jamo에서 올바른 particle(이/가, 을/를, 은/는, 와/과, (으)로)을 선택하고, 명사/이름을 interpolate하는 모든 templated 사용자 대상 copy를 이를 통해 라우팅한다. 어떤 사용자 대상 문자열도 리터럴 '이(가)/을(를)/은(는)' fallback 형을 출하하지 않는다.
  - _근거_: '이(가)'/'을(를)'을 그대로 렌더하는 것은 ERP-06의 'Toss급 친근한 한국어' 목표와 정면 충돌하는 가시적 아마추어 톤 신호다. 올바른 copy는 받침 유무로 particle을 골라야 하며 이는 interpolate된 값에 대한 runtime 로직을 요구한다. `useCrudList`의 `'${nameOf}' 을(를) 삭제했습니다` 등 {label}/record 이름을 주입하는 모든 empty/toast/confirm이 영향.
  - appliesTo: shared/format josa helper, useCrudList, 모든 templated empty/toast/confirm copy
  - ✅ acceptanceCheck: '홍길동님을 삭제했습니다' vs '카페를 삭제했습니다' vs '상품을 삭제했습니다'가 올바른 particle 렌더. 사용자 대상 문자열의 `'이(가)'|'을(를)'|'은(는)'` grep = 0.

- **[ERP-14] (P1)** 표준 한국형 ERP 타입 — 사업자등록번호, 전화번호, 금액(천단위 콤마 + 원), 날짜 — 을 위한 masked/validated input primitive(또는 field adapter)를 정의한다: 입력 중 실시간 포맷, 붙여넣기 값 normalize, 형식 인라인 검증(구체적 error, 예 '사업자등록번호 형식이 올바르지 않습니다'), RHF/zod에 clean numeric/canonical 값 노출.
  - _근거_: 운영자는 사업자등록번호(000-00-00000)·전화번호·원 금액을 상시 입력한다. 실시간 masking/천단위 콤마와 paste normalize 없이는 오타가 나고, parse+validate 페어링 없이는 콤마 붙은 '1,000,000'의 거절 이유를 못 안다. 표시 포맷(formatWon)은 오류·재작업이 실제 발생하는 입력 경험에 아무것도 하지 못한다.
  - appliesTo: 사업자등록번호/전화번호/금액/날짜 필드, AccountFormPage(biz-no/credit-limit), field adapter
  - ✅ acceptanceCheck: 금액 필드 입력 시 실시간 천단위 구분, biz-no 필드가 하이픈 자동 삽입 및 malformed를 인라인 flag, 붙여넣은 '1,234,000원'이 1234000으로 parse.

- **[ERP-15] (P1)** 대형 list 렌더 계약을 정의한다: 명시된 row 임계값 초과 시 effective page size를 cap하거나 row를 virtualize해 1,000+행에서 scroll/selection이 매끄럽게 유지되게 하고, wide table은 bounded container 내 가로 scroll(identity+selection 컬럼 선택적 freeze)하며 절대 page를 overflow하거나 컬럼을 읽을 수 없게 reflow하지 않는다.
  - _근거_: IA-04가 'page size 초과 가능 시' pagination을 요구하지만 실 ERP grid(회원/주문/정산)는 넓고 길다. ERP-05의 page-size selector가 큰 page를 허용하면 full 1,000-row DOM은 저사양 사무 PC에서 scroll/selection을 jank시키고, overflow 전략 없는 다컬럼 테이블은 page를 넘치거나 컬럼을 뭉갠다. TanStack Table을 도입하나 virtualization을 명시하지 않음.
  - appliesTo: CrudTable/DataTable, TanStack Table 도입, ERP-03/MOTION-04와 연동
  - ✅ acceptanceCheck: 1,000-row page-size가 frame drop 없이 scroll(또는 virtualize)되고, 12-컬럼 테이블이 name/checkbox 컬럼을 pin한 채 가로 scroll.

---

## EXC — 예외·엣지케이스 요구사항 (Exception & Edge-Case Taxonomy)

- **[EXC-01] (P0)** 모든 route를 top-level ErrorBoundary로 감싸 render 예외 시 앱을 blank시키는 대신 복구 UI(다시 시도 / 대시보드로)를 렌더하고, AppShell `<Outlet>` 아래에 page-level boundary를 추가한다.
  - _근거_: 앱 소스에 ErrorBoundary가 0 — 단일 컴포넌트 throw가 앱 전체를 죽이고, useToast는 provider 부재 시 throw하도록 설계돼 boundary가 필수.
  - appliesTo: App root, AppShell Outlet
  - ✅ acceptanceCheck: page 컴포넌트 강제 throw가 sidebar 유지·타 메뉴 이동 가능한 복구 화면을 보임. error가 로깅되고 앱이 unmount되지 않음.

- **[EXC-02] (P0)** AppShell 렌더 전 `readSession()`을 검사해 부재 시 '/login?returnUrl=<current>'로 redirect하는 auth route guard와, mid-session 만료 시 session을 clear하고 '/login?returnUrl=...&reason=session_expired'로 redirect하는 단일 query-layer 401 interceptor를 추가하고, 재로그인 후 원래 경로를 복원한다.
  - _근거_: session 없이 deep-link해도 admin 화면이 렌더됨. LoginPage가 reason=session_expired를 읽지만 아무것도 트리거하지 않아 re-auth 경로가 dead. session.ts는 storage를 검증하나 runtime 401 반응이 없음.
  - appliesTo: AppShell entry, login/session.ts, query seam, LoginPage
  - ✅ acceptanceCheck: session 없이 /users/members가 /login?returnUrl=%2Fusers%2Fmembers로 redirect 후 로그인하면 복귀. mid-session 401이 reason 배너·보존 경로와 함께 /login으로 라우팅.

- **[EXC-03] (P0)** route-level authorization과 write-action 게이팅 추가: read-forbidden resource deep-link는 403 '접근 권한이 없습니다' 화면을 렌더; create/update/delete 컨트롤은 `can(resource, action)`가 false면 렌더 안 함(또는 disable); mid-session 권한 강등의 403은 raw error가 아니라 UI를 reconcile(hide/disable).
  - _근거_: AppShell이 read 권한으로 nav leaf만 숨김 — read-only role이 여전히 create/update/delete를 보고 실행할 수 있고 숨겨진 route가 deep-link 시 완전 렌더. static config가 강등을 reconcile 안 함.
  - appliesTo: AppShell nav, PermissionProvider, 모든 write action, permission config
  - ✅ acceptanceCheck: delete 없는 role이 row/bulk delete 버튼을 못 봄. read-forbidden deep-link가 403 화면. 시뮬레이션 강등이 이전 액션을 숨기고 stale 403 클릭이 raw error 대신 reconcile.

- **[EXC-04] (P0)** mutable record의 write에 optimistic-concurrency token(If-Match/ETag 또는 updatedAt/version)을 보낸다. 409/412 시 overwrite하지 않고 사용자 입력을 보존한 채 conflict dialog('최신 reload' 또는 'overwrite')를 열고 가능하면 diverge한 field를 표시한다.
  - _근거_: createCrudAdapter.update/remove가 id 부재 시 조용히 no-op하고 success를 반환해, 타 관리자가 지운 record를 편집하면 ghost 'saved' toast가 뜬다 — 어떤 write도 concurrency control이 없음(last-write-wins data loss).
  - appliesTo: createCrudAdapter.update/remove, 모든 record 폼(엔티티에 updatedAt 존재)
  - ✅ acceptanceCheck: stale write 시뮬레이션(fixture 409)이 입력을 유지하고 conflict dialog를 열며 success toast/navigation 없음. list에서 이미 제거된 record 편집이 ghost 'saved' 대신 conflict 배너.

- **[EXC-05] (P1)** 모든 remote query/mutation에 backend seam에서 client timeout(예 AbortSignal.timeout)을 적용해 ceiling 초과 요청이 abort되고 retriable '시간이 초과되었습니다' 메시지(read는 인라인 error 배너, write는 toast)를 노출 — 검증/권한 error와 구분.
  - _근거_: timeout이 login(10s)에만 존재 — 나머지는 ceiling 없는 shared/async wait()에 의존해 실 backend 지연이 무한 spin(400ms fixture에 가려짐).
  - appliesTo: shared/async wait(), data-source seam, 모든 TanStack query/mutation
  - ✅ acceptanceCheck: never-resolving fixture가 ceiling에서 abort하고 retry 있는 timeout 실패를 보임. spinner가 지속되지 않고 loading이 무한 진행 안 함.

- **[EXC-06] (P1)** 서버 error 응답을 class별 뚜렷한 UX로 매핑한다: 400/422 → field-level 인라인 error; 403 → retry 없는 권한 메시지; 404 → back-to-list 있는 not-found; 409/412 → conflict flow; 429 → backoff 메시지; 5xx/503 → generic retriable 실패. adapter/error 타입이 HTTP status를 지녀야 한다.
  - _근거_: 모든 실패가 단일 generic Error와 '잠시 후 다시 시도해 주세요'로 붕괴 — 검증 거절/권한 상실/서버 장애가 동일해 보이고 잘못된 복구를 제시.
  - appliesTo: data-source error 타입, 모든 read/write error 처리
  - ✅ acceptanceCheck: error 타입이 status를 지니고 각 status가 지정 surface를 렌더. 403/404/409/422/429/500 반환 fixture로 검증.

- **[EXC-07] (P1)** 서버측 field 검증(422)을 RHF setError로 특정 실패 input에 매핑(aria-invalid + aria-describedby)하고 client zod error와 같은 인라인 error slot을 재사용하며, form-level 배너는 generic error용으로 예약하고 첫 서버-flag 필드로 포커스를 이동한다.
  - _근거_: login 외 모든 폼이 저장 실패를 generic '저장하지 못했습니다' 배너로만 보여, 어느 field(중복 견적번호/이메일)가 틀렸는지 못 안다.
  - appliesTo: useCrudForm, 모든 폼
  - ✅ acceptanceCheck: field path 있는 fixture 422(quoteNo/email/title 중복)가 해당 field에 인라인 error를 보이고 포커스 이동. 타 field 무영향. form-level 배너는 generic error에만.

- **[EXC-08] (P0)** 모든 user-initiated write에 중복 제출을 방지한다 — pending 중 submit/confirm disable **AND** 동기 submit lock(submitLockRef)을 추가해 disable render 전 빠른 double Enter/click이 두 번째 요청을 못 내게 하고 — retry가 재사용하도록 per-submit-attempt idempotency key를 mutation 함수 밖(variables/ref)에서 생성한다. 금액/생성/발송 작업 필수.
  - _근거_: login만 동기 submitLockRef를 가짐. useCrudForm은 RHF 비동기 검증 후 disabled={saving}에 의존해 double-Enter gap이 남음. useAddPointHistory가 idempotency key를 올바르게 모델링.
  - appliesTo: useCrudForm, ConfirmDialog, 금액/생성/발송 mutation(useAddPointHistory 정확)
  - ✅ acceptanceCheck: submit 더블클릭 또는 응답 전 Enter 연타가 정확히 1개 요청 발사. 재시도된 포인트 지급이 동일 Idempotency-Key 재사용(key가 mutationFn 밖에 존재).

- **[EXC-09] (P0)** aborted 요청(modal 닫힘, route 이탈, unmount)을 단일 공유 predicate(isAbort)로 non-failure 처리한다: error toast 없음, isPending 리셋(mutation.reset), list/cache 무변경, bulk 실패 count에서 abort 제외.
  - _근거_: 취소는 사용자 선택이지 error가 아니다. async.isAbort + mutation.reset이 이를 인코딩 — dialog를 write 중 닫아도 false 실패가 안 뜨도록 보편화해야 한다.
  - appliesTo: shared/async.isAbort, 모든 mutation onError, dialog close handler
  - ✅ acceptanceCheck: delete/save open 후 write 중 modal 닫으면 toast 없이 버튼 state 복원. isAbort가 settled 결과를 필터해 partial-failure count에서 abort 제외.

- **[EXC-10] (P1)** bulk 작업에 Promise.allSettled semantics를 쓰고 partial 결과를 item level에서 'N중 M건 실패'로 보고(실패 id 반환), 실패 시 confirmation dialog를 열어둔 채 retry가 실패 item만 타깃(성공분 제외)하게 하며, 전 item 성공 시에만 invalidate/selection clear한다.
  - _근거_: 현 bulk는 aggregate 실패 count만 보고하고 retry에 전체를 재실행(성공분 재요청) — 어느 행이 실패했는지 알 수 없음.
  - appliesTo: shared/bulk.ts settleAll, useCrudBulkDelete, useDeleteMembers, faq/queries
  - ✅ acceptanceCheck: 부분 실패 bulk delete/toggle가 dialog를 실패 count와 함께 유지, 실패 item을 선택 유지, 'retry failed only'가 그 항목만 재요청. list는 full success에만 invalidate.

- **[EXC-11] (P1)** 전역 offline state를 감지(navigator.onLine + online/offline event)해 지속 인라인 배너를 두고, offline 중 write를 게이트/명확 경고하며, reconnect 시 auto-refetch/resume과 복구 메시지를 낸다.
  - _근거_: offline 처리가 전무 — offline read가 hard error가 되고 write가 설명·auto-recovery 없이 hang/조용히 실패.
  - appliesTo: 전역 shell, queryClient
  - ✅ acceptanceCheck: navigator offline 토글이 배너를 보이고 write 버튼을 경고/disable. online 복귀가 query를 refetch하고 배너 clear.

- **[EXC-12] (P1)** detail/edit route에서 404(not found)를 generic load error와 구분하고 복구를 표준화한다: 404 → '{X}을(를) 찾을 수 없습니다' + '목록으로'; generic error → '불러오지 못했습니다' + '다시 시도'와 '목록으로' 모두. 존재하지 않는/동시 삭제된 id가 무한 spinner나 crash를 내지 않는다. FormPageShell, DocumentFormShell, useCrudForm에 반영.
  - _근거_: MemberDetail은 404를 retry+list로 구분하나 공유 form shell이 404/500을 loadFailed=error!==null로 붕괴. FormPageShell/QuoteForm은 retry 없이 '목록으로'만 제공.
  - appliesTo: useCrudForm, FormPageShell, DocumentFormShell, QuoteForm(MemberDetail 정확)
  - ✅ acceptanceCheck: 삭제/미상 :id로 폼 진입 시 '목록으로'가 있는 not-found surface. 서버 error는 retry+list 배너. 무한 loading 없음. 모든 detail/form 화면이 계약 공유.

- **[EXC-13] (P2)** transient-error(5xx/network) retry policy를 read 전용(idempotent, exponential backoff, 소수 시도)으로 backend seam에 채택하고, 결정적 fixture는 retry:false 유지, 비-idempotent write는 제외.
  - _근거_: 전역 retry:false는 fixture엔 맞으나 실 backend blip을 즉시 hard error 배너로 노출해 UX가 취약.
  - appliesTo: queryClient retry config, backend seam
  - ✅ acceptanceCheck: backend mode에서 transient 5xx가 소수 auto-retry 후 성공 시 배너 없이 렌더. 비-idempotent write는 retry 안 함.

- **[EXC-14] (P1)** optimism을 reversibility로 적용하고 항상 rollback과 페어링한다: onMutate(cancelQueries+snapshot+setQueryData) + onError rollback + onSettled invalidate를 공유 CRUD framework로 승격(FAQ/banner/popup 손수 복사를 useCrudRowUpdate로 통합)해 reversible inline toggle/reorder에 쓰고, create/delete는 confirm+busy로 pessimistic 유지, rollback 시 항상 실패 toast(가능 시 retry). 신규 optimistic write는 snapshot rollback 필수 문서화.
  - _근거_: banner/logo-list는 full optimistic이나 공유 useCrudRowUpdate는 pessimistic(plain mutate + pendingId)이라 동성격 inline update가 화면마다 비일관. optimism은 비가역 create/delete에 위험.
  - appliesTo: useCrudRowUpdate, faq/banners/popups queries, shared/crud/crud.ts
  - ✅ acceptanceCheck: optimistic toggle이 즉시 반영되고 강제 실패(dev.ts failIfRequested) 시 이전 값으로 rollback + 실패 toast. create/delete는 여전히 confirm/busy. un-rolled-back optimistic write grep = 0.

- **[EXC-15] (P1)** file 업로드를 client에서 upload 전 검증(type image/*, size)하고 invalid file은 인라인 메시지로 거절(요청 미발사), upload progress·cancel 경로 노출, 누락/실패 media는 accessible role=img placeholder로 fallback(src 변경 시 failed flag 리셋).
  - _근거_: README가 imageFile.ts/ImageUploadField를 참조하나 검증 모듈이 disk에 없음. oversized/wrong-type 거절과 progress/cancel이 입증되게 배선 안 됨. ImageThumb는 broken-image 처리.
  - appliesTo: ImageUploadField, imageFile.ts, ImageThumb
  - ✅ acceptanceCheck: 비-image/oversized 선택이 upload 없이 인라인 거절. load 실패가 alt 있는 role=img placeholder. src 변경이 failed flag 리셋.

- **[EXC-16] (P2)** browser-storage 접근(localStorage/sessionStorage)을 wrap해 private-mode/blocked-storage throw가 편의 기능(remember-email, session persistence)만 degrade하고 앱을 crash시키지 않게 한다.
  - _근거_: session.ts safeStorage가 이미 이를 함 — 하드닝된 브라우저가 login을 깨지 않도록 신규 storage 사용에도 성립해야 한다.
  - appliesTo: login/session.ts safeStorage; 신규 storage 사용
  - ✅ acceptanceCheck: storage가 throw해도 readSession/writeRememberedEmail이 null/no-op 반환하고 앱이 여전히 렌더·인증.

- **[EXC-17] (P2)** 사용자 대상 copy를 중앙화 가능하게 유지하고 named interpolation으로 whole string으로 구성(문법 fragment 연결 금지)해, 미래 i18n/RTL pass가 기계적이게 한다. single-locale(ko)·no-RTL은 현 수용 제약.
  - _근거_: 앱이 한국어를 하드코딩 — interpolated sentence fragment(일부 toast)가 추후 추출을 비싸게 만든다.
  - appliesTo: 모든 사용자 대상 문자열, toast 메시지
  - ✅ acceptanceCheck: 신규 copy가 문자열 연결 fragment가 아닌 named interpolation whole string. 문서화 범위 넘어 LTR-only를 가정하는 레이아웃 없음.

- **[EXC-18] (P1)** selection scope를 명시적으로 정의한다(current-page vs all-matching-filter)와 대량 작업 안전장치: 구분·라벨된 affordance와 실행 '전체 N건 선택됨' 배너; Shift-click range selection과 keyboard 등가물; 임계값 초과(예 ≥100 또는 cross-page 'all') 파괴적 bulk에는 정확한 count를 echo하는 강화 confirm(매우 크거나 고가치 scope는 count를 type-to-confirm); 장기 bulk에 determinate progress('340/1,000 처리 중')와 남은 item을 멈추는 cancel.
  - _근거_: 상반된 두 실패 — (a) 생산성: 큰 list에서 50행을 체크박스 하나씩 선택(Shift-range 없음)은 고통; (b) 안전: 'select all N건(전체 페이지)'이 추가되는 순간 오클릭 하나가 수천 건의 비가역 delete를 queue. 현 confirm('선택한 N건 삭제')은 count를 말하나 예상 밖 큰 count를 알아차리게 강제하지 않고 1,000-item bulk 시작 후 cancel/progress가 없다. `toggleAll(ids, checked)`는 넘겨진 ids(현재 page)만 토글.
  - appliesTo: useCrudList.toggleAll, SelectionBar, ConfirmDialog, bulk delete/toggle 경로
  - ✅ acceptanceCheck: Shift-click가 연속 range 선택. 1,200-item bulk delete가 confirm에 count를 보이고 progress를 보고하며 실행 중 cancel 가능.

- **[EXC-19] (P1)** 강제 logout 전 경고(idle/expiry '세션이 곧 만료됩니다 — 연장하시겠어요?' 프롬프트 + keep-alive/연장 액션)를 하고, session-expiry redirect 시 dirty 폼 state를 snapshot(route/record 키 draft를 storage에)해 re-login 후 원래 경로 복귀 시 복원한다. 장수명 폼은 주기적으로 local draft를 autosave한다.
  - _근거_: 운영자는 자료를 모으며 긴 폼(HTML-editor 공지, 견적서)을 열어둔다. session이 조용히 만료되면 EXC-02의 401 interceptor가 login으로 redirect하고 입력한 모든 것이 사라진다 — 앱이 programmatic navigate했으므로 FEEDBACK-04 가드가 발화할 수 없다. 스펙이 다른 곳에서 '용납 불가'라 부르는 silent 데이터 손실.
  - appliesTo: EXC-02 session 경로, login/session.ts, RHF 폼 draft, query 401 interceptor
  - ✅ acceptanceCheck: dirty 폼에서 mid-session 401 시뮬레이션이 입력 내용을 보존하고 re-auth 후 원래 route에서 복원. 임박 timeout이 redirect 전 연장 프롬프트를 보임.

- **[EXC-20] (P1)** 비검증 실패(5xx/예상외)는 짧고 복사 가능한 error reference(correlation/trace id + timestamp)를 친근한 메시지와 함께 표시해 운영자가 신고할 수 있게 하고, raw 서버 error body/stack trace/status code를 사용자에게 prose로 절대 렌더하지 않는다.
  - _근거_: 5xx/예상외 error 시 운영자는 '오류 났어요'로 내부 티켓을 올리는데 code/timestamp가 없는 '잠시 후 다시 시도해 주세요'만으로는 개발자가 log line과 상관지을 수 없어 triage가 정체된다. 반대로 raw 서버 body/stack을 노출하면 내부를 leak하고 고장처럼 읽힌다. include-a-reference와 never-leak 규칙 모두 미규정.
  - appliesTo: data-source error 타입(EXC-06), 전역 error 표시, ErrorBoundary
  - ✅ acceptanceCheck: 강제 500이 '오류가 발생했어요' + 복사 가능한 reference code를 보이고, 그 code가 로깅된 error에 나타나며, raw 서버/stack 텍스트가 UI에 안 보임.

---

## Master Exception Checklist (전 요구사항 판정 표)

모든 배치는 자신이 건드린 표면에 대해 아래 표의 각 행을 pass/n-a로 채점한다. **P0 행은 하나라도 fail이면 배치 실패.** '통과 조건'은 acceptanceCheck의 요약이며 확정 판정은 각 요구사항의 ✅ 항목을 근거로 한다.

| ID | 섹션 | P | 통과 조건 (요약) |
|---|---|---|---|
| STATE-01 | STATE | P0 | `?delay`=skeleton만, 0행=empty만, `?fail`=error만; refetch가 blank/skeleton 안 함 |
| STATE-02 | STATE | P0 | read 실패=인라인 danger Alert+retry, error toast 없음 |
| STATE-03 | STATE | P1 | refetch 중 이전 행 유지, staleTime 후에만 network refetch |
| STATE-04 | STATE | P0 | total 축소 시 마지막 page로 clamp, 필터/page 변경 시 selection 리셋 |
| STATE-05 | STATE | P1 | Empty가 truly-empty/search/filter 3상태를 다른 copy+CTA로 |
| STATE-06 | STATE | P1 | write 후 stale cache만 invalidate, 자기 변경 즉시 반영 |
| TOKEN-01 | TOKEN | P0 | primitive 밖 hex/px/border-keyword grep=0, lint 0 |
| TOKEN-02 | TOKEN | P0 | focus ring이 border-width-medium 토큰, nav ring이 button과 픽셀 동일 |
| TOKEN-03 | TOKEN | P0 | easing 토큰이 유효 timing-function, Toast entrance 재생 |
| TOKEN-04 | TOKEN | P0 | shadow 토큰(primitive+semantic), box-shadow=var만, Modal/Toast 부상 |
| TOKEN-05 | TOKEN | P0 | >18px tier+weight600, h1/StatsCard가 body보다 큼 |
| TOKEN-06 | TOKEN | P1 | color.overlay 토큰, Modal backdrop이 이를 사용, 0.45 리터럴=0 |
| TOKEN-07 | TOKEN | P1 | opacity 리터럴 grep=0, disabled/skeleton 단일 토큰 |
| TOKEN-08 | TOKEN | P1 | space 토큰 ≥10 step, 주요 gap space.7+, 신규 px=0 |
| TOKEN-09 | TOKEN | P1 | radius.xl 존재, Card/Modal이 토큰 참조, radius px=0 |
| TOKEN-10 | TOKEN | P2 | 단일 `<Icon>`·page-heading 소스, 중복 titleStyle=0 |
| TOKEN-11 | TOKEN | P2 | codegen 무결성: dangling var 참조 없음 |
| TOKEN-12 | TOKEN | P2 | StatusBadge/Badge가 전용 height 토큰(space.* 아님) |
| TOKEN-13 | TOKEN | P2 | chart.series-1..6(+fill+dark), 6 series 구분 렌더 |
| COMP-01 | COMP | P1 | pages에서 `buttonStyle(`/`tds-ui-btn-` grep=0, loading prop 사용 |
| COMP-02 | COMP | P1 | raw checkbox 선택 마크업=0, SeqCell/RowSelectCell 사용 |
| COMP-03 | COMP | P1 | `type="search"` grep=0, 3 toolbar가 SearchField 소비 |
| COMP-04 | COMP | P1 | 모든 required 필드가 FormField `*` 마커 |
| COMP-05 | COMP | P2 | 필터가 filterPanelStyle/filterNavStyle import, 로컬 clone=0 |
| COMP-06 | COMP | P2 | `length: 5` skeleton=0, row=PAGE_SIZE, cell=실컬럼수 |
| COMP-07 | COMP | P2 | page2 첫 행 seq=pageSize+1, seq식에 startIndex |
| COMP-08 | COMP | P2 | 중복 '상세' 버튼=0, RowActions/ActionMenu 규칙 준수 |
| COMP-09 | COMP | P2 | 긴 텍스트 ellipsis+hover, 테이블 폭 불변 |
| COMP-10 | COMP | **P0** | 한글 입력 완성 시 1 query, 조합중 Enter 미submit, stale 응답 무효 |
| COMP-11 | COMP | P1 | DateRangeFilter(preset+start≤end 검증), 범위가 URL 유지 |
| COMP-12 | COMP | P2 | 실시간 char 카운터+경고, over-limit submit 차단 |
| FEEDBACK-01 | FEEDBACK | P1 | write=toast/read=Alert/dialog내부=배너 배치 규칙 |
| FEEDBACK-02 | FEEDBACK | P0 | 강제실패 delete가 dialog 유지+retry, 중간닫기=abort 복원 |
| FEEDBACK-03 | FEEDBACK | P1 | 모든 mutation 성공·실패 피드백, no-op 없음 |
| FEEDBACK-04 | FEEDBACK | P0 | dirty 폼 3경로(unload/link/back) discard 가드, 저장후 통과 |
| FEEDBACK-05 | FEEDBACK | P2 | 단일클릭 비가역 delete 없음(confirm 또는 undo) |
| FEEDBACK-06 | FEEDBACK | **P0** | modal 4경로(dim/Esc/×/Cancel) dirty 가드, pristine 즉시 닫힘 |
| A11Y-01 | A11Y | P0 | ToastProvider가 비어있을 때도 aria-live, toast announce |
| A11Y-02 | A11Y | P0 | ConfirmDialog aria-describedby=message, open 시 읽힘 |
| A11Y-03 | A11Y | P1 | ConfirmDialog 초기 포커스=Cancel(× 아님) |
| A11Y-04 | A11Y | P1 | confirm disable 후 포커스가 dialog 내 유지, Esc 동작 |
| A11Y-05 | A11Y | P1 | SelectField isInvalid=aria-invalid+describedby |
| A11Y-06 | A11Y | P1 | 첫 Tab=skip link, `<main>` id+tabIndex=-1 |
| A11Y-07 | A11Y | P1 | route 변경 시 main 포커스+polite route announce |
| A11Y-08 | A11Y | P1 | 모든 row-nav에 keyboard focusable in-row link |
| A11Y-09 | A11Y | P1 | 위험 토큰쌍 대비 측정, 임계값 충족(light/dark) |
| A11Y-10 | A11Y | P2 | TextField error `<p>` role='alert' |
| A11Y-11 | A11Y | P0 | aria-invalid without describedby grep=0, required 노출 |
| A11Y-12 | A11Y | P0 | 필터 selected=aria-pressed, aria-current grep=0 |
| A11Y-13 | A11Y | P1 | 폼 진입=첫 필드 포커스, submit 실패=첫 error 포커스 |
| A11Y-14 | A11Y | P2 | ImageUploadField 완료/실패가 role=status announce |
| A11Y-15 | A11Y | P2 | toast dismiss 포커스=정의 요소, retry 고유 name |
| A11Y-16 | A11Y | P1 | 신규 컴포넌트 a11y 계약+axe CI 통과 |
| MOTION-01 | MOTION | P0 | Modal backdrop fade+dialog scale, exit후 unmount, reduced=즉시 |
| MOTION-02 | MOTION | P0 | toast exit 애니메이션, queue/ARIA 유지, reduced=즉시 |
| MOTION-03 | MOTION | P0 | reduced-motion에서 move/scale 0, ToggleSwitch off 존재 |
| MOTION-04 | MOTION | P1 | row FLIP 애니메이트, ≥50행/reduced=off, scroll/selection 보존 |
| MOTION-05 | MOTION | P2 | drag lift+grabbing, keyboard reorder 동일결과 |
| MOTION-06 | MOTION | P2 | route slide 없음, shell 정지, fade는 reduced=즉시 |
| MOTION-07 | MOTION | P2 | motion guide 금지목록, focus ring/skeleton motion=0 |
| MOTION-08 | MOTION | P1 | accelerate semantic 존재, overlay recipe 소비, reduced 0ms |
| IA-01 | IA | P0 | 모든 route가 AppShell 하위, 자체 frame 없음 |
| IA-02 | IA | P0 | sub-route가 구체 title('공지 등록'), 단일 title 메커니즘 |
| IA-03 | IA | P1 | non-top route에 breadcrumb, parent link 이동 |
| IA-04 | IA | P0 | list 템플릿(우상단 action+count), 초과가능 시 Pagination |
| IA-05 | IA | P0 | new/`:id/edit`가 동일 폼 컴포넌트 |
| IA-06 | IA | P1 | rich=route/taxonomy=modal 무게 규칙, 혼용 없음 |
| IA-07 | IA | P1 | back-link '목록으로'+ChevronLeft 통일, ArrowLeft grep=0 |
| IA-08 | IA | P1 | footer save 우/취소 좌, 일관 위치 |
| IA-09 | IA | P2 | detail action 임계값 규칙(버튼 vs ⋯) 일관 |
| IA-10 | IA | P2 | 단일 2-col shell, 임의 12/13/15 split grep=0 |
| IA-11 | IA | P2 | detail 읽기전용이 dl/dt/dd+Card |
| IA-12 | IA | P2 | preview form이 공유 shell, titleStyle/backLink 재선언 없음 |
| IA-13 | IA | **P0** | list state가 URL 직렬화, Back/복사링크가 필터 view 복원 |
| IA-14 | IA | P1 | 768/375px sidebar collapse, wide table 가로scroll, touch-target |
| ERP-01 | ERP | P1 | 단일 status→tone 레지스트리, 모든 status 정의된 tone |
| ERP-02 | ERP | P1 | density 토큰(comfortable/compact), divider 토큰 |
| ERP-03 | ERP | P1 | sticky thead+SelectionBar(토큰 offset), e2e 검증 |
| ERP-04 | ERP | P1 | sortable header+aria-sort+keyboard, numeric tabular-nums |
| ERP-05 | ERP | P1 | Pagination range+size selector, 경계 unit test |
| ERP-06 | ERP | P1 | microcopy 문서+템플릿, 포맷은 shared/format |
| ERP-07 | ERP | P2 | 금액 단위 분리, 자릿수 정렬 |
| ERP-08 | ERP | P2 | 셀 raw toString=0, 미래 timestamp=절대날짜 |
| ERP-09 | ERP | P2 | 포맷 함수 정의 TZ, UTC 입력이 OS TZ 무관 동일 |
| ERP-10 | ERP | P2 | 문서/print 토큰, 견적서가 소비, px=0 |
| ERP-11 | ERP | P2 | 배송: mono 송장/neutral 택배사/레지스트리 tone/Timeline |
| ERP-12 | ERP | P1 | 필터 전체 CSV/xlsx, 한글 header+UTF-8 BOM+progress |
| ERP-13 | ERP | P1 | josa 헬퍼로 올바른 particle, '이(가)/을(를)' grep=0 |
| ERP-14 | ERP | P1 | biz-no/전화/금액/날짜 masked input, paste normalize |
| ERP-15 | ERP | P1 | 1,000행 virtualize/cap, 12-컬럼 가로scroll+pin |
| EXC-01 | EXC | P0 | route ErrorBoundary, throw 시 복구 UI+sidebar 유지 |
| EXC-02 | EXC | P0 | auth guard+401 interceptor, returnUrl 복원 |
| EXC-03 | EXC | P0 | write 권한 게이팅+403 화면+강등 reconcile |
| EXC-04 | EXC | P0 | 409/412 conflict dialog, 입력 보존, ghost saved 없음 |
| EXC-05 | EXC | P1 | client timeout=retriable '시간 초과', spinner 미지속 |
| EXC-06 | EXC | P1 | error 타입이 status 보유, class별 surface |
| EXC-07 | EXC | P1 | 422가 field 인라인 error+포커스, generic만 배너 |
| EXC-08 | EXC | P0 | submitLockRef+disable, retry가 동일 Idempotency-Key |
| EXC-09 | EXC | P0 | isAbort=non-failure, mutation.reset, count 제외 |
| EXC-10 | EXC | P1 | allSettled, 'N중 M건 실패', 실패분만 retry |
| EXC-11 | EXC | P1 | offline 배너+write 경고, online 복귀 refetch |
| EXC-12 | EXC | P1 | 404 not-found vs error 구분, 무한 loading 없음 |
| EXC-13 | EXC | P2 | read 전용 transient retry, write 제외 |
| EXC-14 | EXC | P1 | optimistic+rollback+실패 toast, create/delete pessimistic |
| EXC-15 | EXC | P1 | 업로드 전 client 검증, progress/cancel, role=img fallback |
| EXC-16 | EXC | P2 | storage throw가 degrade만, 앱 crash 없음 |
| EXC-17 | EXC | P2 | copy=named interpolation whole string |
| EXC-18 | EXC | P1 | selection scope+Shift-range+대량 confirm+progress/cancel |
| EXC-19 | EXC | P1 | 만료 전 연장 프롬프트+dirty draft 스냅샷 재로그인 복원 |
| EXC-20 | EXC | P1 | 5xx=복사가능 reference code, raw stack 미노출 |

---

### 요약

- **총 요구사항: 100** (STATE 6 · TOKEN 13 · COMP 12 · FEEDBACK 6 · A11Y 16 · MOTION 8 · IA 14 · ERP 15 · EXC 20)
- **P0(전량 충족 필수): 30**
- 신규 편입(critique fold-in) 13건: COMP-10(IME/debounce), COMP-11(date-range), COMP-12(char counter), IA-13(URL state), IA-14(반응형), ERP-12(엑셀 export), ERP-13(josa), ERP-14(input masking), ERP-15(대형 테이블), FEEDBACK-06(modal 가드), EXC-18(bulk scope/safety), EXC-19(세션/draft 보존), EXC-20(error reference).
- 게이트: 모든 배치는 `verify:all` 통과 + 콜드 E2E 63건 green 유지 + P0 전량 pass.
