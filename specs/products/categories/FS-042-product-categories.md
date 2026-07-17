---
id: FS-042
title: "상품 카테고리 (목록·모달 등록/수정)"
screen: SCR-042               # ⚠ 상품 관리 SCR 미작성 — §7 미결 사항 참조
route: /products/categories
owner: 기능 명세
reviewer: 명세 리뷰
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-042. 상품 카테고리 (목록·모달 등록/수정)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 상품이 참조하는 분류 체계를 관리한다 — 카테고리를 추가·이름 수정·삭제하고, 각 카테고리를 **몇 개 상품이 쓰는지** 보며, **사용 중인 카테고리는 삭제를 막아** 고아 상품이 생기지 않게 한다 |
| 역할(주 사용자) | 관리자 (프론트에 **쓰기 권한 분기가 일부 있다** — §4.1) |
| 진입 경로 | 좌측 GNB > 상품 관리 > 카테고리 (`/products/categories`) — `nav-config.ts:147` |
| 포함 화면 | 목록 + 등록/수정 모달 `/products/categories` (App.tsx:229) — **단일 라우트다** |
| **범위 밖** | **전용 폼 라우트** — 카테고리는 필드가 이름 하나뿐인 **짧은 taxonomy 엔티티**라 IA-06 의 무게 규칙대로 inline-list + Modal 로 편집한다(`/products/categories/new` 같은 라우트가 없다 — App.tsx 확인). **상품 편집** — 카테고리를 지우려면 그 상품들의 분류를 먼저 바꿔야 하는데, **이 화면에 그 경로가 없다**(§7 #6). **정렬·계층** — 카테고리에 순서·부모 개념이 없다(`ProductCategory` = `id` + `label` 뿐 — `_shared/store.ts:17-20`) |
| 구현 경로 | `apps/admin/src/pages/products/categories/**` · 도메인·픽스처·순수 규칙 `apps/admin/src/pages/products/_shared/store.ts` |
| 대응 SCR | SCR-042 (미작성 — §7 #1) |
| 공통 컴포넌트 | `shared/crud/{useCrudListQuery,useCrudCreate,useCrudUpdate,useCrudDelete,useListState,parseFilter,createStoreAdapter,requiredText,dev(LATENCY_MS·failIfRequested)}` · `shared/permissions/RequirePermission(useRouteWritePermissions)` · `shared/ui/{Alert,Button,buttonStyle,Card,ConfirmDialog,Empty,FormField,Modal,useModalDirtyGuard,useToast,StatusBadge,PencilIcon,TrashIcon,PlusCircleIcon,controlStyle,errorIdOf,hintStyle,filterPanelStyle·filterNavStyle·filterListStyle·filterItemStyle·badgeStyle·filterHeadingStyle}` · `shared/form/zodResolver` · `shared/async(isAbort)` · `shared/format(formatNumber)` |

> **카테고리와 상품은 같은 저장소를 공유한다**: `_shared/store.ts:3-6` 이 그 이유를 못박는다 — 상품이 카테고리를 참조하고, 카테고리 삭제는 그 카테고리를 쓰는 상품이 있으면 막힌다. 두 `data-source` 가 서로를 import 하면 순환이 되므로 픽스처와 순수 규칙을 잎 모듈 한 곳에 모았다. 그래서 이 화면의 목록 항목은 `ProductCategory` 가 아니라 **`ProductCategoryUsage`(= 카테고리 + 사용 중 상품 수)** 다.

> **이 화면의 데이터를 FS-041 이 읽어 간다**: 상품 목록의 좌측 카테고리 필터(FS-041-EL-002.2)와 상품 폼의 카테고리 select(FS-041-EL-023.4)가 이 화면의 카테고리를 선택지로 쓴다. **그런데 두 화면의 react-query 키가 다르다** — 여기서 카테고리를 바꿔도 상품 화면의 선택지가 무효화되지 않는다(§7 #8).

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-042-SEC-01 | 좌측 사용 여부 필터 | 전체 · 사용 중 · 미사용. 건수 배지 + `aria-pressed` |
| FS-042-SEC-02 | 툴바 | 건수 텍스트 좌측 + '카테고리 추가' 우측(권한 게이팅). **검색이 없다** |
| FS-042-SEC-03 | 카테고리 목록 카드 | `<ul>` 행 목록(표가 아니다) + 하단 상시 안내문. **페이지네이션·선택·일괄 작업이 없다** |
| FS-042-SEC-04 | 조회 실패 배너(비표시 기본) | 카드를 대체 |
| FS-042-SEC-05 | 등록/수정 모달(비표시 기본) | 이름 1필드 + 저장 |
| FS-042-SEC-06 | 삭제 확인 다이얼로그(비표시 기본) | 단건 |
| FS-042-SEC-07 | 모달 미저장 이탈 가드(비표시 기본) | 4경로 파기 확인 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-042-EL-001 | FS-042-SEC-01 | 좌측 필터 패널 | 표시 | 고정 폭 열(`calc(var(--tds-space-6) * 9)`) — 우측 목록과 `minmax(0, 1fr)` 그리드(`ProductCategoriesPage.tsx:45-50`). 공유 `filterPanelStyle`/`filterNavStyle` 소비(COMP-05). `nav aria-label="카테고리 사용 여부 필터"` + `h2` '사용 여부' | — | 회원·상품 화면의 좌측 필터와 같은 골격 |
| FS-042-EL-002 | FS-042-SEC-01 | 사용 여부 필터 항목 | 버튼 | 3개 고정(`CATEGORY_USAGE_FILTERS`): 전체 · 사용 중 · 미사용. `aria-pressed={active}` + 건수 배지. 누르면 `list.setFilter('usage', id)` → **URL `?usage=` 가 바뀐다** | — | **왜 이 축인가**: 이 화면의 핵심 제약이 '사용 중인 카테고리는 삭제할 수 없다' 라, 정리하려는 운영자가 가장 먼저 하려는 일이 **'지울 수 있는 것(미사용)만 보기'** 다(`types.ts:22-28`) |
| FS-042-EL-002.1 | FS-042-SEC-01 | 건수 배지 | 텍스트 | `countCategoriesByUsage`(`types.ts:56-61`) — 전체 = 전량, 사용 중 = `productCount > 0`, 미사용 = 나머지. 아직 모르면 `'—'`(0 과 '모름'은 다르다 — `CategoryUsageFilter.tsx:20-21,45`) | — | 비표시 규칙. **필터 이전 전체 집합에서 센다** — 축이 하나뿐이라 서로를 흔들 여지가 없다 |
| FS-042-EL-003 | FS-042-SEC-02 | 조회 요약 텍스트 | 텍스트 | 최초 로드면 '불러오는 중…', 그 외 `전체 N개`(`formatNumber`). **N 은 필터 적용 후 건수**다 | — | **재조회 중에도 건수가 유지된다**(`firstLoading` 판정 — EL-016). 단 '새로고침 중…' 인디케이터가 없다(§7 #9). **`aria-busy` 가 없다** |
| FS-042-EL-004 | FS-042-SEC-02 | '카테고리 추가' 버튼 | 버튼 | 툴바 우측. DS `<Button variant="primary">` + `PlusCircleIcon`. 클릭 시 FS-042-EL-008 모달을 등록 모드로 연다. **`canCreate` 가 false 면 렌더되지 않는다**(`ProductCategoriesPage.tsx:181,252-258`) | — | 빈 상태의 생성 CTA 로도 재사용된다(EL-007) |
| FS-042-EL-005 | FS-042-SEC-03 | 카테고리 목록 | 표시 | `Card` 안의 `<ul style={listStyle}>` — **`<table>` 이 아니다.** 행마다 `<li>`. **페이지네이션·행 선택·일괄 작업이 없다**(§7 #4). 정렬은 **저장소 배열 순서 그대로**(`listProductCategoryUsage` 가 `categories.map` — 정렬 함수가 없다) → **등록 순**이며 정렬 변경 UI 도 없다 | O | `aria-busy`·caption·`role` 이 없다 — 표가 아니라 목록이라 표 시맨틱을 쓰지 않는다 |
| FS-042-EL-005.1 | FS-042-SEC-03 | 카테고리 이름 | 텍스트 | `category.label`. `overflowWrap: 'anywhere'` — **긴 이름이 열을 넓히지 않고 줄바꿈된다**(상품 목록과 다르다) | O | 40자 상한(`CATEGORY_NAME_MAX`) |
| FS-042-EL-005.2 | FS-042-SEC-03 | 사용량 배지 | 배지 | `StatusBadge`. 라벨 `usageLabel(productCount)`(`types.ts:16-18`): 0이면 **'미사용'**(neutral), 그 외 **'N개 상품'**(info · `formatNumber`) | O | **왜 못 지우는지를 배지가 말한다** — 삭제 차단의 이유가 화면에 있다 |
| FS-042-EL-005.3 | FS-042-SEC-03 | 행 '수정' 버튼 | 버튼 | ghost icon(`PencilIcon`), 접근 이름 `'<이름> 수정'`. 클릭 시 FS-042-EL-008 모달을 수정 모드로 연다(**행 데이터를 그대로 넘긴다 — 상세를 재조회하지 않는다**) | — | **DS `<Button>` 이 아니라 `buttonStyle('ghost')` + `tds-ui-btn-ghost tds-ui-focusable` 손조립**(§7 #10). **`canUpdate` 를 묻지 않는다**(§7 #5) |
| FS-042-EL-005.4 | FS-042-SEC-03 | 행 '삭제' 버튼 | 버튼 | ghost icon(`TrashIcon`), danger 색. **사용 중이면 비활성**(`disabled={inUse \|\| deleting}`)되고 접근 이름이 이유를 말한다: 사용 중이면 `'<이름> — N개 상품라 삭제할 수 없습니다'`, 아니면 `'<이름> 삭제'`. `title` 도 같은 이유. 클릭 시 FS-042-EL-009 | — | **손조립 `<button>`**(§7 #10). **`canRemove` 를 묻지 않는다**(§7 #5). 접근 이름의 `'N개 상품라'` 는 **조사 오류**다(§7 #11) |
| FS-042-EL-006 | FS-042-SEC-03 | 목록 로딩 표시 | 텍스트 | **최초 로드에만**(`firstLoading` — EL-016). `Card` 안에 `<p style={hintStyle}>불러오는 중…</p>`. **스켈레톤 막대가 아니다** | — | 비표시. 툴바의 요약도 함께 '불러오는 중…' 이 된다 |
| FS-042-EL-007 | FS-042-SEC-03 | 빈 상태 | 빈상태 | 조회 완료·0건이면 `Card` 안에 공유 `Empty`(`role="status"`). **2분기**(`ProductCategoriesPage.tsx:292-297`): 필터가 걸렸으면 '필터 초기화', 진짜 0건이면 '등록된 카테고리가 없습니다' + **EL-004 와 같은 추가 CTA**(권한 없으면 CTA 없음). 조사는 `Empty` 가 받침으로 고른다 | — | 비표시. **`hasQuery` 를 넘기지 않는다 — 검색이 없어 정당하다**(`Empty.tsx:53-55` 의 우선순위 검색 > 필터 > 진짜 비어있음 중 첫 분기가 걸리지 않는다) |
| FS-042-EL-007.1 | FS-042-SEC-03 | 상시 안내문 | 텍스트 | 카드 하단에 **언제나** `<p style={hintStyle}>사용 중인 카테고리는 삭제할 수 없습니다 — 먼저 그 상품들의 카테고리를 바꾸거나 삭제하세요.</p>`(`:314-317`) | — | 빈 상태·로딩 중에도 표시된다(카드 밖이 아니라 안). **'그 상품들' 로 가는 링크가 없다**(§7 #6) |
| FS-042-EL-008 | FS-042-SEC-05 | 등록/수정 모달 | 모달 | DS `Modal`. 제목 `<h2>` `'카테고리 수정' : '카테고리 추가'`. **하나의 모달이 등록과 수정을 겸한다**(`editing` 유무로 갈린다 — IA-05 의 modal 판본). `role="dialog"` + `aria-modal` + `aria-labelledby`(제목) + 포커스 트랩 + Esc + 딤 + 포커스 복귀는 `Modal` 이 소유한다. 초기 포커스는 이름 입력(`initialFocusRef={nameRef}`) | O | 비표시 기본 |
| FS-042-EL-008.1 | FS-042-SEC-05 | 이름 입력 | 입력 | `FormField htmlFor="product-category-name" required` + `<input maxLength={40}>`, placeholder '예: 아우터'. 수정이면 원본 라벨로 채워진다(`defaultValues: { name: editing?.label ?? '' }`). 저장 중 비활성. 오류 시 `aria-invalid` + `aria-describedby={errorIdOf('product-category-name')}`. **required 가 자식 `<input>` 의 `aria-required` 로 런타임 주입된다**(`FormField.tsx:50-56`) | O | 검증 정본 `validation.ts:7-9` `requiredText('카테고리 이름', 40)` — 공백만이면 '카테고리 이름을 입력하세요.', 40자 초과면 '카테고리 이름은 40자를 넘을 수 없습니다.'. **중복 이름을 막지 않는다**(§7 #12) |
| FS-042-EL-008.2 | FS-042-SEC-05 | 모달 저장 실패 배너 | 배너 | 모달 본문 상단 위험 톤 `Alert` '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`ProductCategoryFormModal.tsx:80,123`) | O | 비표시. 재제출 시 먼저 지운다(`:106`). **409·422·403 을 문구로 구분하지 않는다**(§7 #7) |
| FS-042-EL-008.3 | FS-042-SEC-05 | 모달 '취소' 버튼 | 버튼 | footer 왼쪽. `secondary`. 저장 중 비활성. **`requestClose` 를 부른다** — dirty 면 파기 확인(EL-010) | — | Modal.onClose 와 **같은 함수**를 쓴다(4경로 통합 — EL-010) |
| FS-042-EL-008.4 | FS-042-SEC-05 | 모달 제출 버튼 | 버튼 | footer 오른쪽. `type="submit" variant="primary"`. 라벨 `saving ? '저장 중…' : isEdit ? '저장' : '추가'`. 저장 중 비활성. 제출 시 ① 서버 오류·필드 오류를 지우고 ② `handleSubmit(onValid, onInvalid)` — **검증 실패 시 이름 입력으로 포커스**(`:108`) ③ 성공 시 모달을 닫고 토스트 | O | **진행 상태를 `loading` prop 이 아니라 손으로 쓴 라벨**로 표현한다(§7 #10). **동기 제출 락·멱등키가 없다**(§7 #3) |
| FS-042-EL-009 | FS-042-SEC-06 | 삭제 확인 다이얼로그 | 모달 | `ConfirmDialog intent="delete"`, 제목 '카테고리 삭제', 본문 `'<이름>' 카테고리를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`, 확인 라벨 '카테고리 삭제'. 진행 중 확인 버튼이 `disabled + aria-busy`('처리 중…')로 잠기고 **취소는 살아 있다**(그것이 abort 경로다). 실패 시 **다이얼로그를 연 채** 위험 톤 배너 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 를 띄우고 재클릭이 재시도 | O | 비표시. 취소·Esc·딤은 진행 중 요청을 abort + `mutation.reset()`(`:214-220`) |
| FS-042-EL-010 | FS-042-SEC-07 | 모달 미저장 이탈 가드 | 모달 | `useModalDirtyGuard(isDirty && !saving, onClose)`(`ProductCategoryFormModal.tsx:65`). 그것이 돌려주는 `requestClose` 를 **`Modal.onClose`(`:104`)와 취소 버튼(`:113`)에 둘 다** 넘겨 **4경로(Esc · 딤 클릭 · × · 취소)를 한 번에 덮는다** — DS Modal 이 앞의 셋을 `onClose` 한 곳으로 모으기 때문이다(`useModalDirtyGuard.tsx:13-17`). dirty 면 `ConfirmDialog intent="discard"` '저장하지 않은 변경 사항이 있습니다 / 입력한 내용이 사라집니다. 저장하지 않고 닫으시겠습니까?', pristine 이면 즉시 닫는다. **파기 확인은 모달 *밖*에 렌더된다**(`:154`) — 안에 두면 모달의 포커스 트랩이 그것을 가둔다 | — | 비표시. `suppressCancelToast` — 여기서 '취소'는 작업 취소가 아니라 '이 모달에 머무른다' 는 뜻이라 토스트를 띄우지 않는다 |
| FS-042-EL-011 | FS-042-SEC-04 | 조회 실패 배너 | 배너 | 조회 실패 시 카드 대신 위험 톤 `Alert` '카테고리를 불러오지 못했습니다.' + '다시 시도'(`refetch`) — `:277-285`. 자동 소멸하지 않고 토스트를 쓰지 않는다 | O | **툴바·좌측 필터는 남는다** — 조건이 화면에서 사라지지 않는다 |
| FS-042-EL-012 | FS-042-SEC-02 | URL 조회 상태 규칙 | 텍스트 | 사용 여부 필터의 **단일 원천이 URL 쿼리스트링**이다(`useListState` — `?usage=`). 기본값(`all`)과 같으면 URL 에서 지운다. 갱신은 `replace: true`. 손으로 고친 `?usage=거짓말` 은 `parseFilter` 가 '전체'로 되돌린다(`:189-193`) | — | 비표시 규칙. **`?q=`·`?page=`·`?sort=` 는 이 화면에 소비자가 없다**(검색·페이지네이션·정렬 부재) |
| FS-042-EL-013 | FS-042-SEC-03 | 토스트 | 토스트 | 3종: 삭제 성공 `'<이름>' 카테고리를 삭제했습니다.` · 수정 성공 `'<이름>' 카테고리를 저장했습니다.` · 등록 성공 `'<이름>' 카테고리를 추가했습니다.` | — | 비표시. 조회 실패는 배너(EL-011), 삭제 실패는 다이얼로그 배너(EL-009), 저장 실패는 모달 배너(EL-008.2). **조사 주입이 필요 없는 문구다** — 이름 뒤에 항상 '카테고리를' 이 온다 |
| FS-042-EL-014 | FS-042-SEC-05 | 모달 언마운트 abort | 텍스트 | 모달을 벗어나면 진행 중인 저장을 abort 한다(`:70` `useEffect(() => () => controllerRef.current?.abort(), [])`). abort 는 실패로 통지하지 않는다(`:79` `isAbort` → 즉시 return) | — | 비표시 규칙. 삭제도 같은 규약(`:214-215`) |
| FS-042-EL-015 | FS-042-SEC-03 | 삭제 차단 규칙 | 텍스트 | **삭제는 두 겹으로 막힌다**: ① 프론트가 `productCount > 0` 이면 버튼을 잠그고 이유를 말한다(EL-005.4) ② 저장소가 `countProductsUsingCategory(id, products) > 0` 이면 던진다(`_shared/store.ts:690-696` — '사용 중인 카테고리는 삭제할 수 없습니다.'). **서버는 409 로 막아야 한다**(BE-042 §7.2) | O | 비표시 규칙. **②는 status 없는 generic `Error` 라 화면이 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 뭉갠다** — 경합으로 ②에 걸리면 **거짓 안내**다(§7 #7) |
| FS-042-EL-016 | FS-042-SEC-03 | 로딩 상태 규칙 | 텍스트 | `firstLoading = isFetching && data === undefined`(`ProductCategoriesPage.tsx:205`) — **최초 로드에만** true. `:203-204` 의 주석이 그 이유를 적는다('스켈레톤/불러오는 중은 최초 로드에만 — 재조회 때도 loading 으로 쓰면 이미 보고 있던 목록이 불러오는 중…으로 덮인다'). 재조회 중에는 이전 행이 유지된다(`useCrudListQuery` 의 `placeholderData: (previous) => previous` — `crud.ts:254`) | — | 비표시 규칙. **`useCrudList` 를 쓰지 않고 저수준 `useCrudListQuery` 를 직접 쓰면서도 그 파생을 로컬로 복제했다** |
| FS-042-EL-017 | FS-042-SEC-03 | 라벨 전파 규칙 | 텍스트 | 카테고리 이름을 고치면 **그 카테고리를 쓰는 상품의 비정규화 라벨(`Product.categoryLabel`)도 함께 갱신된다**(`_shared/store.ts:679-688` — `updateProductCategory` 가 `products` 를 map 한다). 주석이 '백엔드가 붙으면 서버가 정합성을 맡는다' 고 명시 | O | 비표시 규칙. **픽스처가 임시로 하는 일이며 계약이 아니다** — BE-042 §7.4 가 이를 서버 책임으로 확정한다 |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-042-EL-001 | N/A — 항상 표시(컨테이너) | 조회 중에도 표시 | N/A — 조회 없음(자식이 담당) | N/A — 입력 없음 | §4.1 공통 규칙 | N/A — 표시 전용 | 고정 폭 열 · 항목 3개라 스크롤이 필요 없다 |
| FS-042-EL-002 | 카테고리 0건이면 세 항목 모두 배지 '0'(항목은 남는다) | 조회 중 배지 '—' | 조회 실패면 `loaded=false` → 배지 '—' | 손으로 고친 `?usage=거짓말` 은 `parseFilter` 가 '전체'로 되돌린다 | §4.1 공통 규칙 | 화면 로컬이 아니라 **URL 이 소유**해 새로고침·뒤로가기가 조건을 보존한다 | 3개 고정 |
| FS-042-EL-002.1 | 0건이면 '0' | 아직 모르면 `'—'` | 실패면 `'—'`(0 이라고 거짓말하지 않는다) | N/A — 파생값 | §4.1 공통 규칙 | 조회 시점 스냅샷. **다른 관리자가 상품을 등록·삭제하면 `productCount` 가 바뀌어 이 건수도 바뀐다** — 재조회 시점에만 반영 | 전량 2-pass(O(n)) |
| FS-042-EL-003 | 0건이면 '전체 0개' | 최초 로드만 '불러오는 중…' | EL-011 이 카드를 대체해도 **이 텍스트는 남는다**(툴바는 배너 밖) — 실패 중에 '전체 0개' 가 보인다(§7 #13) | N/A — 입력 없음 | §4.1 공통 규칙 | **재조회 중에도 건수가 유지된다**(EL-016). 단 '새로고침 중…' 인디케이터가 없어 갱신 중임을 알 수 없다(§7 #9) | 천 단위 구분(`formatNumber`) |
| FS-042-EL-004 | 항목이 0건이어도 표시(빈 상태 CTA 로도) | 조회 중에도 표시 | 조회 실패 시에도 표시(툴바는 남는다) | N/A — 입력 없음 | **`canCreate=false` 면 렌더되지 않는다**(EXC-03 충족 — 이 화면의 유일한 쓰기 게이팅) | 다른 탭에서 권한이 강등되면 `usePermissions` 구독이 재렌더해 버튼이 사라진다 | 단일 버튼 |
| FS-042-EL-005 | 0건이면 EL-007 로 대체 | EL-006 문구로 대체 | EL-011 이 카드 전체를 대체 | N/A — 목록 자체 입력 없음 | §4.1 공통 규칙 | 조회 시점 스냅샷. 다른 관리자의 추가·삭제는 재조회 시점에만 반영(`staleTime` 30초) | **상한 없음** — 카테고리 수에 비례해 행이 는다. 페이지네이션 없음(§7 #4). **상품 목록과 달리 `<ul>` 이라 표 레이아웃이 깨질 여지가 없다** |
| FS-042-EL-005.1 | 이름이 빈 문자열이면 빈 칸(스키마가 막지만 서버 데이터는 막지 못한다) | 조회 중 미표시(문구가 대체) | 조회 실패 시 미표시 | N/A — 표시 전용 | §4.1 공통 규칙 | 조회 시점 값 | `overflowWrap: anywhere` — **긴 이름이 줄바꿈된다.** 40자 상한 |
| FS-042-EL-005.2 | `productCount === 0` 이면 '미사용'(neutral) | 조회 중 미표시 | 조회 실패 시 미표시 | N/A — 파생값 | §4.1 공통 규칙 | **`productCount` 는 조회 시점 스냅샷이다** — 그 사이 상품이 등록되면 '미사용' 배지가 거짓이 되고 삭제 버튼이 열린 채 남는다. 그 삭제는 저장소가 던져 막는다(EL-015 ②) | 2톤 고정 |
| FS-042-EL-005.3 | 행 없으면 없음 | 조회 중 미표시 | 저장 실패는 EL-008.2(모달 배너) | N/A — 입력 없음 | §4.1 공통 규칙 — **`canUpdate` 를 묻지 않는다**(§7 #5) | **행 데이터를 그대로 모달에 넘긴다** — 상세를 재조회하지 않으므로 그 사이 다른 관리자가 이름을 바꿨으면 **낡은 값을 편집한다**(§7 #14) | 행마다 1개 |
| FS-042-EL-005.4 | 행 없으면 없음 | 삭제 진행 중이면 **모든 행의 삭제 버튼이 비활성된다**(`deleting` 이 행 단위가 아니라 화면 단위 — §7 #15) | 삭제 실패는 EL-009 의 다이얼로그 배너 | 사용 중이면 비활성 + 접근 이름이 이유를 말한다. **`'N개 상품라'` 조사 오류**(§7 #11) | §4.1 공통 규칙 — **`canRemove` 를 묻지 않는다**(§7 #5) | **`productCount` 가 낡아 버튼이 열려 있어도 저장소가 던져 막는다** — 다만 그 실패가 '잠시 후 다시 시도해 주세요' 라는 **거짓 안내**로 보인다(§7 #7) | 행마다 1개 |
| FS-042-EL-006 | N/A — 도착 전 상태 | **이것이 로딩 표현.** 문구 1줄(스켈레톤 아님) | 조회 실패 시 EL-011 로 바뀐다 | N/A — 입력 없음 | §4.1 공통 규칙 | **데이터가 있는 재조회에서는 뜨지 않는다**(EL-016 — STATE-01 충족) | 문구 1줄 고정 |
| FS-042-EL-007 | **이것이 빈 상태 표현.** 2분기 + 복구 액션 | 재조회 중에는 이전 행이 유지돼 뜨지 않는다 | 조회 실패 시 EL-011 로 | N/A — 입력 없음 | 권한 없으면 추가 CTA 가 없다(EL-004 와 같은 노드) | 재조회로 0건이 되면 그때 뜬다 | N/A — 1블록 |
| FS-042-EL-007.1 | **빈 상태에서도 표시된다** — 지울 카테고리가 없는데 삭제 제약을 설명한다(§7 #16) | 로딩 중에도 표시된다 | 조회 실패 시 카드가 통째로 대체돼 미표시 | N/A — 입력 없음 | §4.1 공통 규칙 | N/A — 정적 문구 | 고정 문구. **'그 상품들' 로 가는 링크가 없다**(§7 #6) |
| FS-042-EL-008 | N/A — 열려야 성립 | 모달 자체에 로딩이 없다 — **수정도 상세를 조회하지 않고 행 데이터를 쓴다** | 저장 실패는 EL-008.2 | N/A — 컨테이너 | §4.1 공통 규칙 — **`canCreate`/`canUpdate` 를 묻지 않는다**(추가 버튼만 게이팅 — §7 #5) | **열린 채로 다른 관리자가 그 카테고리를 지우면** 저장이 409 를 받는다 — 어댑터는 던지지만 화면이 generic 문구로 뭉갠다(§7 #7) | 필드 1개 |
| FS-042-EL-008.1 | 등록이면 빈 문자열, 수정이면 원본 라벨 | 저장 중 비활성 | 저장 실패는 EL-008.2. **실패해도 입력이 보존된다** | 공백만이면 '카테고리 이름을 입력하세요.' · 40자 초과면 '카테고리 이름은 40자를 넘을 수 없습니다.'(`maxLength` 가 네이티브로 먼저 자른다). 저장 시 trim. **중복 이름을 막지 않는다**(§7 #12) | §4.1 공통 규칙 | **낙관적 잠금 토큰이 없다** — 다른 관리자가 그 사이 이름을 바꿔도 감지 없이 덮는다(§7 #2) | 40자 상한. **카운터가 없다** |
| FS-042-EL-008.2 | N/A — 오류 없으면 미렌더 | 재제출 시 먼저 지운다 | **이것이 저장 실패 표현.** 문구 1종. abort 는 표시하지 않는다 | 클라이언트 검증 위반은 여기 오지 않는다(필드 인라인) | §4.1 공통 규칙 — 서버 403 도 이 문구 | **409(대상 부재)도 이 문구** — 충돌 다이얼로그가 없다(§7 #7) | 1건만 표시 |
| FS-042-EL-008.3 | N/A — 항상 표시 | 저장 중 비활성 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 | **dirty 면 파기 확인을 세운다**(EL-010) — 저장 중에는 비활성이라 그 경로가 없다 | 단일 버튼 |
| FS-042-EL-008.4 | N/A — 항상 표시 | 요청 중 '저장 중…' + 비활성 | 실패 시 EL-008.2, 버튼 재활성, 모달 유지, **입력 보존** | 검증 실패면 서버를 호출하지 않고 **이름 입력으로 포커스**가 간다(`:108` `handleSubmit(onValid, () => nameRef.current?.focus())`) | §4.1 공통 규칙 | **동기 제출 락·멱등키가 없다** — 이 모달이 `useCrudForm` 을 쓰지 않아 그 훅의 두 장치를 상속하지 못했다. RHF `handleSubmit` 은 **비동기**라 비활성 렌더 전 연타가 두 번째 요청을 통과시킨다 → **같은 이름의 카테고리가 2개 생긴다**(§7 #3) | 단건 저장. 입력이 `{ name }` 하나뿐이라 요청이 작다 |
| FS-042-EL-009 | N/A — 대상이 있어야 성립 | 확인 버튼이 `disabled + aria-busy`('처리 중…'). **취소는 살아 있다** | 다이얼로그를 연 채 위험 톤 배너. 재클릭이 재시도 | N/A — 입력 없음 | §4.1 공통 규칙 — **게이팅 없음**. 서버 403 도 '삭제하지 못했습니다' 로 뭉개진다 | **이미 삭제된 카테고리면 어댑터가 409 '이미 삭제된 항목입니다.'**(`crud.ts:232-234`) → 같은 generic 문구. **사용 중이면 저장소가 던진다**(EL-015 ②) → 역시 같은 문구인데 그것은 **'잠시 후 다시 시도' 해도 영원히 실패한다**(§7 #7). 취소·Esc·딤은 abort + `reset()` | 단건 |
| FS-042-EL-010 | N/A — 변경이 있어야 성립 | 저장 중에는 가드가 비활성(`isDirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 | **4경로(Esc·딤·×·취소)를 한 함수로 덮는다** — 경로마다 가드를 붙이면 반드시 하나를 빠뜨린다(`useModalDirtyGuard.tsx:13-17`). 저장 성공 시 `onSaved` 가 모달을 닫으므로 가드를 거치지 않는다 | N/A — 표시 전용 |
| FS-042-EL-011 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 EL-006 으로 | **이것이 실패 표현.** 문구 1종 + '다시 시도'. **토스트를 쓰지 않는다** | N/A — 입력 없음 | §4.1 공통 규칙 — 서버 403 도 이 배너(라우트 read 가드는 별개) | 재시도는 같은 조회를 재발행. 필터는 URL 에 있어 유지된다 | N/A — 표시 전용 |
| FS-042-EL-012 | N/A — 규칙 | N/A — 동기 | N/A — 서버 호출 없음 | `parseFilter` 가 알 수 없는 값을 '전체'로 되돌린다 | §4.1 공통 규칙 | **URL 이 단일 원천이라 뒤로/앞으로·새로고침·링크 공유가 조건을 보존한다**. `replace: true` 라 필터 조작이 history 를 쌓지 않는다 | 파라미터 1개 |
| FS-042-EL-013 | N/A — 결과 통지 | N/A — 결과 통지 | 실패는 전부 배너(모달·다이얼로그) — **토스트로 실패를 내지 않는다** | N/A — 입력 없음 | §4.1 공통 규칙 | **저장이 실제로 아무것도 바꾸지 않아도 성공 토스트가 뜰 수 있다** — 아니다: 어댑터가 409 를 던지므로 유령 저장이 없다(EXC-04 해소 절 — BE-042 §7.1) | 스택 상한은 `ToastProvider` 소관 |
| FS-042-EL-014 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | **abort 는 실패가 아니다** — 배너·토스트를 띄우지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 | 모달을 닫으면 진행 중 저장이 취소된다 — **서버 도달 여부는 보장하지 않는다**(§7 #17). **단 성공 콜백에 `aborted` 가드가 없다**(`:86,93` — `onSuccess: () => onSaved(...)`) → 취소된 요청이 완료되면 **닫힌 모달의 성공 토스트가 뜬다**(§7 #18) | 단건 |
| FS-042-EL-015 | N/A — 대상이 있어야 성립 | N/A — 동기 판정(①) | ②가 던지면 EL-009 배너 — **그 문구가 거짓 안내다**(§7 #7) | **이것이 유효성 표현.** ① 프론트 버튼 잠금 ② 저장소 throw ③ 서버 409(BE-042 §7.2) | §4.1 공통 규칙 | **①의 `productCount` 는 조회 시점 스냅샷**이라 경합에서 뚫린다 — 그때 ②가 받는다. **그것이 이 이중 방어의 존재 이유다** | 카테고리마다 전량 스캔(`countProductsUsingCategory` — O(상품 수)) |
| FS-042-EL-016 | N/A — 규칙 | **이것이 로딩 규칙.** 최초 로드에만 true | 실패는 EL-011 | N/A — 입력 없음 | §4.1 공통 규칙 | **재조회 중에는 false 라 이전 행이 유지된다** — 표를 훑던 운영자 밑에서 목록이 사라지지 않는다 | N/A — 규칙 |
| FS-042-EL-017 | 그 카테고리를 쓰는 상품이 0건이면 전파할 것이 없다 | N/A — 동기 | 저장 실패 시 전파도 일어나지 않는다(store 가 함께 실패) | N/A — 파생 | §4.1 공통 규칙 | **픽스처가 원자적으로 한다**(같은 함수 안). **서버에서는 두 테이블 갱신이라 트랜잭션이 필요하다** — BE-042 §7.4 | 상품 수에 비례한 map(O(n)) |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 목록 조회 실패는 인라인 배너로 카드가 대체된다(EL-011). 저장 실패는 모달 배너(EL-008.2), 삭제 실패는 다이얼로그 배너(EL-009). **오프라인 감지·복귀 재조회는 앱 전역에 없다**(`navigator.onLine` 0건) — §7 #19 |
| 세션 만료 | 조회·저장 어디서든 401 이 오면 **앱 전역 401 인터셉터**(`shared/query/queryClient.ts` 의 `QueryCache`/`MutationCache` `onError`)가 세션 만료를 알리고 `RequireAuth` 의 감시자가 세션을 폐기한 뒤 `/login?returnUrl=<현재경로>&reason=session_expired` 로 보낸다. **미저장 모달 입력은 그때 사라진다** — 다만 입력이 이름 한 줄이라 손실이 작다(FS-041 의 리치 폼과 대조) |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건). abort 는 모달 언마운트(EL-014)·다이얼로그 닫기에서만 발생한다 — §7 #19 |
| 중복 제출 | 저장·삭제 버튼은 요청 중 비활성된다. **동기 제출 락(`submitLockRef`)·멱등키가 없다** — 이 화면이 `useCrudForm`/`useCrudList` 를 쓰지 않고 저수준 훅(`useCrudCreate`/`useCrudUpdate`/`useCrudDelete`)을 직접 쓰기 때문이다. **중복 이름 검증도 없어**(§7 #12) 연타가 같은 이름의 카테고리를 2개 만든다 — §7 #3 |
| 실패 통지의 자리 | ① 목록 조회 실패는 인라인 배너(카드 대체) ② 저장 실패는 **모달 안** 배너(modal 뒤에 숨는 토스트를 쓰지 않는다) ③ 삭제 실패는 **다이얼로그 안** 배너 ④ 쓰기 **성공**은 토스트 ⑤ abort 는 아무것도 띄우지 않는다 |
| 서버 오류 분기 | 어댑터는 `HttpError`(status 보유)를 던진다(`createStoreAdapter` — 404·409). **그러나 이 화면이 status 로 분기하지 않는다** — 모달의 `onError`(`ProductCategoryFormModal.tsx:78-81`)와 삭제의 `onError`(`ProductCategoriesPage.tsx:237-240`)가 `isAbort` 만 보고 나머지를 전부 generic 문구로 뭉갠다. `useCrudForm` 의 네 갈래(404·409·422·그 밖)를 상속하지 못했다 — §7 #7 |
| 낙관적 업데이트 | **이 화면에 없다.** 저장·삭제가 전부 비관적이다(요청 완료 후 무효화) — 롤백 경로가 필요 없고 un-rolled-back optimistic write 0건 |
| 동시 조회 | 카테고리 목록 쿼리 1건만 유지된다(react-query). `staleTime` 30초 · 자동 재시도 없음 · 창 포커스 재조회 없음. **`placeholderData: (previous) => previous`** 라 재조회 중 이전 행이 유지된다(`crud.ts:254`). **상세 조회가 없다** — 수정 모달이 행 데이터를 그대로 쓴다 |
| 권한 없음 | 라우트 **read** 권한은 AppShell 의 `RequirePermission` 이 `<Outlet>` 바깥에서 가드해 `ForbiddenScreen` 을 렌더한다(`AppShell.tsx:490`). **`/products/categories` 는 `/products` 보다 긴 잎이라 별개 리소스로 갈린다**(`nav-config.ts:274-275` '더 긴 잎이 더 구체적이다 — `/products/categories` 가 `/products` 를 이긴다' · `covers()` 가 세그먼트 경계에서만 매칭). **쓰기 게이팅은 '카테고리 추가' 버튼 하나뿐**(EL-004) — 행 수정·행 삭제·모달 저장은 게이팅되지 않는다(§7 #5). 서버 권한 응답은 조회=배너, 저장=모달 배너, 삭제=다이얼로그 배너로 떨어진다. 은닉 정책(403 vs 404)은 BE-042 §7.5 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary` 를 둔다(`AppShell.tsx:484-493`) — 화면이 던져도 사이드바·헤더가 남고 복구 화면(`RouteErrorScreen`)이 뜬다 |
| 행 선택의 수명 | N/A — **이 화면에 행 선택이 없다**(일괄 작업이 없다). `useListState` 가 `selectedIds`·`toggleAll` 을 제공하지만 이 화면은 소비하지 않는다 |
| 삭제 차단의 이중 방어 | EL-015 참조. **①(프론트 버튼 잠금)은 UX 이고 ②·③(저장소·서버)이 강제다.** ①의 `productCount` 는 조회 시점 스냅샷이라 경합에서 반드시 뚫린다 — 그것이 ②가 존재하는 이유이며, 서버 연동 시 ③(409)이 ②를 대체한다 |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| EL-002.1 / EL-003 / EL-005 / EL-011 | 카테고리 목록 조회 | R | 카테고리 전량 + **각 카테고리를 쓰는 상품 수** | `productCategoryAdapter.fetchAll(signal)` | 항목이 `ProductCategory` 가 아니라 **`ProductCategoryUsage`**(= 카테고리 + `productCount`)다. 필터는 클라이언트(`filterCategoriesByUsage`) |
| EL-008.1 / EL-008.4 (등록) | 카테고리 등록 | W | `{ name }` | `productCategoryAdapter.create({ name }, { signal })` | **멱등키를 싣지 않는다**(`useCrudCreate` 를 직접 쓰되 `idempotencyKey` 를 넘기지 않는다 — `ProductCategoryFormModal.tsx:92`) |
| EL-008.1 / EL-008.4 (수정) | 카테고리 이름 수정 | W | 카테고리 id + `{ name }` | `productCategoryAdapter.update(id, { name }, { signal })` | 대상이 없으면 `HttpError(409)`. **라벨 전파(EL-017)는 서버 책임**(BE-042 §7.4). **멱등키 없음** |
| EL-005.4 / EL-009 / EL-015 | 카테고리 삭제 | W | 카테고리 id | `productCategoryAdapter.remove(id, { signal })` | 없으면 `HttpError(409)`. **사용 중이면 저장소가 generic `Error` 를 던진다** — 서버는 **409** 로 막아야 한다(BE-042 §7.2). **멱등키 없음** |
| (호출부 없음) | 카테고리 단건 조회 | R | 카테고리 1건 | `productCategoryAdapter.fetchOne(id, signal)` — **`createStoreAdapter` 가 요구해 채웠으나 이 화면에 호출부가 0건이다** | 수정 모달이 **행 데이터를 그대로 쓰고 상세를 재조회하지 않는다**(EL-005.3). `// TODO(backend)` 주석도 `GET /:id` 를 적지 않는다 — **연동 심이 없다**(BE-042 §7.6) |

> **현재 구현 상태 (백엔드 명세 참고)**: 백엔드는 없다. `productCategoryAdapter` 는 `shared/crud/crud.ts:165-240` 의 **`createStoreAdapter`** 로 `_shared/store.ts` 의 브라우저 안 mutable 배열(`categories`) 위에 배선된다 — 400ms 지연(`LATENCY_MS`)과 개발용 실패 스위치(`failIfRequested('product-categories', op)`)를 얹어 CRUD 를 흉내 낸다. 실제 네트워크 0건. 이 팩토리가 화면 코드 0줄로 세 가지를 준다: **`fetchOne` 없는 id → `HttpError(404)`** · **`update`/`remove` 없는 id → `HttpError(409)`**(유령 저장 해소) · **멱등 원장**. **다만 이 화면은 그 셋을 거의 활용하지 못한다** — `fetchOne` 호출부가 없고, 409 를 분기하지 않으며(§7 #7), 멱등키를 싣지 않는다(§7 #3). 목록 항목은 `listProductCategoryUsage()` 가 카테고리마다 `countProductsUsingCategory` 를 돌려 만든다(`store.ts:661-666`) — **O(카테고리 수 × 상품 수)**. 새로고침하면 시드로 되돌아간다. 연동 지점은 `data-source.ts:20` `// TODO(backend): GET/POST /api/products/categories · PUT/DELETE /api/products/categories/:id (사용 중이면 409)` **한 줄**이다. 위 표는 백엔드 연결 후 의도된 동작이다.

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `ProductCategoriesPage` · `data-source.ts` · `types.ts` · `validation.ts` · `categories.test.ts` · `components/{CategoryUsageFilter,ProductCategoryFormModal}` · `_shared/store.ts`, 그리고 소비하는 공용 모듈(`shared/crud/{crud,useListState,parseFilter,validation,dev}` · `shared/permissions/*` · `shared/layout/nav-config.ts` · `packages/ui/.../{FormField,Modal,ConfirmDialog,Empty}` · `shared/ui/useModalDirtyGuard`)
- [x] **모달 폼 편집**이 IA-06 의 무게 규칙(짧은 taxonomy → modal)에 따른 **의도된 선택**임을 확인하고 §1 에 범위 밖(전용 폼 라우트)으로 선언했다 — App.tsx 에 `/products/categories/new` 류 라우트가 없다
- [x] 보이지 않는 요소(로딩 문구·빈 상태·실패 배너·모달·삭제 다이얼로그·파기 가드·URL 규칙·삭제 차단 규칙·로딩 규칙·라벨 전파 규칙·abort·토스트)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. **호출부가 0건인 `fetchOne` 을 '연동 심 없음' 으로 명시**했다
- [x] **`useCrudListQuery` 를 직접 쓰면서도 `firstLoading` 을 로컬 파생한다**는 사실을 `ProductCategoriesPage.tsx:203-205` 에서 직접 확인해 EL-016 으로 못박았다 — '저수준 훅 = STATE-01 gap' 이라는 오탐을 피했다
- [x] **쓰기 게이팅이 '카테고리 추가' 버튼 하나뿐**임을 코드로 확인했다(`ProductCategoriesPage.tsx:181` 이 `canCreate` 만 구조분해한다) — §4.1·§7 #5
- [x] `createStoreAdapter` 가 준 것(404·409·멱등)과 **이 화면이 활용하지 못하는 것**을 구분해 적었다 — §7 #3·#7
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-042 영역)
- [x] §7 의 미결 항목이 BE-042 §7 후속 이관 · NFR-042 §5 와 일치한다

## 7. 미결 사항 (UI 기획 / 아키텍처 / 백엔드 명세 / 프론트 구현 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (상품 관리 SCR 미작성) | UI 기획 / 아키텍처 |
| 2 | **낙관적 동시성 토큰이 없다.** `ProductCategory` 에 `version`/`updatedAt` 필드가 없고(`_shared/store.ts:17-25`) 어댑터가 `If-Match` 를 보내지 않는다. `createStoreAdapter` 의 409 는 **'대상이 존재하는가'** 기반이라(`crud.ts:219-221`) **둘 다 존재하는 동시 편집은 last-write-wins** 로 덮는다. 유령 저장은 해소됐다(quality-bar EXC-04 P0) | 백엔드 명세 (BE-042 §7.1) · UI 기획 |
| 3 | **모달 저장에 동기 제출 락·멱등키가 없다.** `ProductCategoryFormModal` 이 `useCrudForm` 을 쓰지 않고 `useCrudCreate`/`useCrudUpdate` 를 직접 쓴다(`:57-58,84-94`) — 그 훅이 제공하는 `submitLockRef`(`useCrudForm.ts:103`)·`idempotencyKeyRef`(`:118-123`)를 상속하지 못했다. RHF `handleSubmit` 은 **비동기**라(`:108`) 비활성 렌더 전 연타가 두 번째 요청을 통과시킨다. **중복 이름 검증도 없어(#12) 결과가 '같은 이름의 카테고리 2개'** 다(quality-bar EXC-08 P0) | UI 기획 · 백엔드 명세 |
| 4 | **페이지네이션이 없다** — `<ul>` 이 전량을 렌더한다. 카테고리는 사용자가 만드는 만큼 늘어난다. 게다가 **`<table>` 이 아니라 `<ul>`** 이라 공유 `CrudTable` 템플릿(선택·순번·행 액션·스켈레톤)을 쓰지 않는다 — quality-bar IA-04 의 근거가 'members/categories 가 부분 이탈' 이라며 이 화면을 명시적으로 지목한다(quality-bar IA-04 P0) | UI 기획 · 백엔드 명세 (BE-042 §7.7) |
| 5 | **쓰기 게이팅이 '카테고리 추가' 버튼 하나뿐이다.** `ProductCategoriesPage.tsx:181` 이 `useRouteWritePermissions` 에서 `canCreate` 만 꺼낸다 — 행 수정(`:149-156`)·행 삭제(`:158-169`)·모달 저장이 `canUpdate`/`canRemove` 를 묻지 않는다(quality-bar EXC-03 P0) | UI 기획 쪽 변경 요청 |
| 6 | **'그 상품들' 로 가는 경로가 없다.** 상시 안내문(EL-007.1)이 '먼저 그 상품들의 카테고리를 바꾸거나 삭제하세요' 라고 말하지만 **어느 상품인지 알려주지도, 거기로 데려가지도 않는다.** 사용량 배지('12개 상품')를 `/products?category=<id>` 링크로 만들면 해결된다 — 그 URL 은 이미 실재한다(FS-041-EL-017 이 카테고리 필터를 URL 로 소유한다) | UI 기획 쪽 변경 요청 |
| 7 | **status 분기가 없다 — 그리고 그중 하나는 거짓 안내다.** 모달·삭제의 `onError` 가 `isAbort` 만 보고 403·409·422·429·500 을 전부 '…하지 못했습니다. **잠시 후 다시 시도해 주세요.**' 로 뭉갠다(`ProductCategoryFormModal.tsx:78-81` · `ProductCategoriesPage.tsx:237-240`). **'사용 중이라 삭제 불가'(EL-015 ②)가 그 문구로 보이면 운영자는 영원히 재시도한다** — `useCrudForm` 의 네 갈래(404·409·422·그 밖)를 상속하지 못했다(quality-bar EXC-06 P1 · EXC-12 P1) | UI 기획 쪽 변경 요청 |
| 8 | **이 화면과 상품 화면이 같은 서버 리소스를 서로 다른 react-query 키로 캐시한다** — `['product-categories','list']`(`crud.ts:244`) vs `[products,'category-options']`(`ProductListPage.tsx:142` · `ProductFormPage.tsx:285`). **여기서 카테고리를 추가·수정·삭제해도 상품 화면의 선택지가 무효화되지 않는다** — 새로고침 전에는 낡은 목록을 본다. **백엔드와 무관하게 지금 고칠 수 있다** | UI 기획 쪽 변경 요청 |
| 9 | 조회 요약(EL-003)에 **재조회 인디케이터가 없다** — `CrudListShell` 은 `aria-busy={refreshing}` + ' · 새로고침 중…' 을 주는데(`CrudListShell.tsx:118-122`) 이 화면은 그 껍데기를 쓰지 않아 상속하지 못했다. 이전 행은 유지되나 갱신 중임을 알 수 없다(quality-bar STATE-03 P1) | UI 기획 쪽 변경 요청 |
| 10 | 행 액션 2개(EL-005.3·EL-005.4)가 **DS `<Button>` 이 아니라 `buttonStyle('ghost')` + `tds-ui-btn-ghost` 손조립**이고(`:149-169`), 모달 제출(EL-008.4)이 `loading` prop 대신 손으로 쓴 `'저장 중…'` 라벨을 쓴다(`:117`) — quality-bar COMP-01 P1 이 'ghost icon 버튼 포함' 을 명시한다 | UI 기획 쪽 변경 요청 |
| 11 | **삭제 버튼 접근 이름의 조사가 틀렸다** — `'<이름> — ${usage}라 삭제할 수 없습니다'`(`:163`)에서 `usage` 는 '12개 상품' 이라 **'12개 상품라'** 가 된다(받침이 있으므로 '이라' 여야 한다). ERP-13 이 금지한 리터럴 `이(가)` 형은 아니지만 **같은 뿌리의 조사 오류**이며 `shared/format` 에 이 조사(이라/라)를 고르는 헬퍼가 없다 | UI 기획 쪽 변경 요청 |
| 12 | **카테고리 이름 중복을 막지 않는다.** `productCategorySchema`(`validation.ts:7-9`)가 `requiredText` 뿐이고 저장소도 그냥 append 한다(`store.ts:674-677`). '아우터' 를 두 번 만들 수 있고, 그러면 상품 폼의 select 에 같은 이름이 두 개 뜬다 — 운영자가 어느 것을 골라야 할지 알 수 없다. **유일성은 원자적 제약이라 클라이언트가 강제할 수 없다** | 백엔드 명세 (BE-042 §7.3) · UI 기획 |
| 13 | 조회 실패 시 **툴바의 '전체 0개' 가 남는다** — 배너가 카드만 대체하고 툴바는 밖에 있다(`:268-285`). '불러오지 못했습니다' 와 '전체 0개' 가 **동시에 보인다** | UI 기획 쪽 변경 요청 |
| 14 | 수정 모달이 **행 데이터를 그대로 쓰고 상세를 재조회하지 않는다**(`:305` `setModal({ kind: 'edit', category: target })`) — 목록 스냅샷이 30초 낡을 수 있어(`staleTime`) 그 사이 다른 관리자가 바꾼 이름을 못 보고 편집한다. #2 의 토큰이 없으면 그것을 덮는다 | UI 기획 쪽 변경 요청 |
| 15 | `deleting` 이 **화면 단위 플래그**다(`:200` `deleteCategory.isPending`) — 한 행을 지우는 동안 **모든 행의 삭제 버튼이 비활성된다**. `useCrudList` 는 `deletingId` 로 행 단위를 구분하는데(`useCrudList.tsx:192`) 이 화면은 그 훅을 쓰지 않아 상속하지 못했다 | UI 기획 쪽 변경 요청 |
| 16 | 상시 안내문(EL-007.1)이 **빈 상태·로딩 중에도 표시된다** — 지울 카테고리가 하나도 없는데 삭제 제약을 설명한다 | UI 기획 쪽 변경 요청 |
| 17 | 모달 닫기 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다 — 이미 반영된 저장이 화면에 안 보일 수 있다 | 백엔드 명세 (BE-042) |
| 18 | **모달 저장의 `onSuccess` 에 `aborted` 가드가 없다**(`:86,93` — `onSuccess: () => onSaved(name, true)`). `useCrudForm`(`:218`)·`useCrudList`(`:105`)·`useCrudRowUpdate`(`:48`)는 전부 `if (controller.signal.aborted) return;` 를 두는데 이 모달만 없다 → **취소된(모달을 닫은) 요청이 완료되면 닫힌 모달의 성공 토스트가 뜬다** | UI 기획 쪽 변경 요청 |
| 19 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료 리다이렉트가 미저장 모달 입력을 버린다 — quality-bar EXC-05 · EXC-11 · EXC-19 P1 | UI 기획 · 프론트 구현 |
| 20 | **카테고리에 순서·계층이 없다**(`ProductCategory` = `id` + `label`). 목록이 등록 순으로만 나오고 정렬 UI 도 없다. 커머스 카테고리는 보통 **트리 + 노출 순서**를 갖는다 — 이것이 의도된 단순화인지 미구현인지 확정이 필요하다 | 아키텍처 (도메인 경계) |
| 21 | `listProductCategoryUsage()` 가 **카테고리마다 상품 전량을 스캔**한다(`store.ts:661-666` → `countProductsUsingCategory` — O(카테고리 × 상품)). 픽스처(5×5)에서는 드러나지 않으나 서버에서는 **집계 쿼리 한 번**이어야 한다 | 백엔드 명세 (BE-042 §7.7) |
</content>
