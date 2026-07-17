---
id: FS-043
title: "배송 정책 (단일 문서 설정)"
screen: SCR-043               # ⚠ 상품 관리 SCR 미작성 — §7 미결 사항 참조
route: /products/shipping
owner: 기능 명세
reviewer: 명세 리뷰
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-043. 배송 정책 (단일 문서 설정)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 스토어 전체에 적용되는 배송 규칙을 한 문서로 관리한다 — 택배사·배송비 정책(무료/유료/조건부)·기본 배송비·무료배송 기준·제주/도서산간 추가배송비·반품 배송비·묶음배송 사용 여부 |
| 역할(주 사용자) | 관리자 (**프론트에 권한 분기가 전혀 없다** — §4.1) |
| 진입 경로 | 좌측 GNB > 상품 관리 > 배송 (`/products/shipping`) — `nav-config.ts:148` |
| 포함 화면 | `/products/shipping` **단일 라우트** (App.tsx:237) |
| 화면 유형 | **목록형이 아니라 정책 설정형(단일 문서)** — 문서 1건을 불러와 고치고 저장한다. 기업 관리의 단일 문서형 4종(회사 정보·CEO 인사말·비전/미션·오시는 길)과 같은 껍데기(`DocumentFormShell` + `createDocumentStore`)를 재사용한다(`ShippingPolicyPage.tsx:3-4`) |
| **범위 밖** | **목록·등록·삭제** — 배송 정책은 **회사당 1건**이다. `createDocumentStore` 가 `fetch`/`save` 두 함수만 노출하고(`shared/crud/document.ts:14-19`) `add`/`remove`/`list` 가 **아예 없다**. **상품별 배송 설정** — FS-041 의 배송 카드(FS-041-EL-027)가 **이 정책의 상품 단위 오버라이드**다(`_shared/store.ts:69-83,157-163`). 이 화면은 전역 기본값만 소유한다. **권역(지역) 세분화** — 제주·도서산간 2축 고정이며 임의 권역 추가 경로가 없다(§7 #10). **택배사 연동** — 택배사가 자유 텍스트다(§7 #9) |
| 구현 경로 | `apps/admin/src/pages/products/shipping/**` (ShippingPolicyPage.tsx · data-source.ts · types.ts · validation.ts · shipping.test.ts) — **components 디렉터리가 없다** |
| 대응 SCR | SCR-043 (미작성 — §7 #1) |
| 공통 컴포넌트 | `shared/crud/{DocumentFormShell,createDocumentStore,useDocumentQuery,useSaveDocument,dev(LATENCY_MS·failIfRequested)}` · `shared/ui/{FormField,SelectField,ToggleSwitch,useToast,controlStyle,errorIdOf,fieldLabelStyle,fieldStyle}` · `shared/form/zodResolver` · `shared/async(isAbort)` · `shared/format(objectParticle·topicParticle)` |

> **이 화면은 `useRouteWritePermissions` 의 소비자가 아니다**: `ShippingPolicyPage.tsx:1-25` 의 import 에 `shared/permissions` 가 **없다**(직접 확인). 상품(FS-041)·카테고리(FS-042)가 '등록/추가' 버튼을 `canCreate` 로 게이팅하는 것과 달리, **이 화면의 '저장' 버튼은 권한을 묻지 않는다**(§7 #2).

> **값이 전부 문자열이다**: `ShippingPolicyValues` 의 금액 필드(`baseFee`·`freeThreshold`·`jejuExtraFee`·`islandExtraFee`·`returnFee`)가 **숫자가 아니라 문자열**이다(`validation.ts:28-32`). `types.ts:4-5` 가 그 이유를 적는다 — '값 표현을 폼 문자열과 일치시켜(회사 정보 화면과 같은 결) `reset(data)` 를 단순화한다. **실제 백엔드가 붙으면 숫자로 매핑한다(`// TODO(backend)`)**'. 즉 **현재 계약은 임시 형태이며 연동 시 타입이 바뀐다**(BE-043 §7.3).

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-043-SEC-01 | 화면 안내문 | 카드 위 muted 문구. **`<h1>` 이 아니다** |
| FS-043-SEC-02 | 정책 카드 | `CardTitle`('배송 정책') + 저장 실패 배너 + 필드 4행 + footer |
| FS-043-SEC-03 | 배송 기본 행 | 택배사 · 배송비 정책 |
| FS-043-SEC-04 | 배송비 조건 행(조건부 렌더) | 기본 배송비 · 무료배송 기준 |
| FS-043-SEC-05 | 추가배송비 행 | 제주 · 도서산간 · 반품 |
| FS-043-SEC-06 | 묶음배송 토글 | bare 라벨 + ToggleSwitch |
| FS-043-SEC-07 | 카드 footer | 상태 문구 + 저장 버튼 |
| FS-043-SEC-08 | 조회 실패 배너(비표시 기본) | 화면 전체를 대체 |
| FS-043-SEC-09 | 로딩 스켈레톤(비표시 기본) | 카드 본문을 대체 |
| FS-043-SEC-10 | 미저장 이탈 가드(비표시 기본) | 3경로 파기 확인 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-043-EL-001 | FS-043-SEC-01 | 화면 안내문 | 텍스트 | 카드 **위**(폼 밖)에 muted `<p>` — '별표(*) 항목은 필수입니다. 저장하면 스토어 전체 배송비 계산에 반영됩니다.'(`ShippingPolicyPage.tsx:93` → `DocumentFormShell.tsx:119`) | — | 정적. **화면에 `<h1>` 이 없다** — 제목이 AppHeader 의 잎 라벨 '배송'에서 온다(IA-02 pass) |
| FS-043-EL-002 | FS-043-SEC-02 | 정책 카드 | 표시 | `<form onSubmit noValidate>` 안의 `Card` + `CardTitle`('배송 정책', `<h2>` title.md). 조회 실패면 렌더되지 않는다(EL-020이 대체) | — | `DocumentFormShell` 이 소유하는 골격 |
| FS-043-EL-003 | FS-043-SEC-02 | 저장 실패 배너 | 배너 | 카드 상단 위험 톤 `Alert` '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`:84` → `DocumentFormShell.tsx:125`) | O | 비표시. 재제출 시 먼저 지운다(`:72`). **status 를 구분하지 않는다 — 403·409·422·429·500 이 전부 이 문구다**(§7 #4). **복사 가능한 오류 코드가 없다**(§7 #5) |
| FS-043-EL-004 | FS-043-SEC-03 | 택배사 입력 | 입력 | `FormField htmlFor="ship-carrier" required` + `<input type="text">`, placeholder '예: 가상택배'. 로딩·저장 중 비활성. 오류 시 `aria-invalid` + `aria-describedby={errorIdOf('ship-carrier')}`. **required 가 자식 `<input>` 의 `aria-required` 로 런타임 주입된다**(`FormField.tsx:50-56`) | O | 검증 정본 `validation.ts:21-26`: 공백만이면 '택배사를 입력하세요.', 40자 초과면 '택배사는 40자를 넘을 수 없습니다.'. **`maxLength` 가 없다** — 41자를 칠 수 있고 제출 시에야 막힌다(§7 #6). **자유 텍스트라 오타가 곧 새 택배사다**(§7 #9) |
| FS-043-EL-005 | FS-043-SEC-03 | 배송비 정책 select | 입력 | `FormField htmlFor="ship-fee-type" required` + DS `SelectField`. 3개 고정(`SHIPPING_FEE_OPTIONS` — `types.ts:9-13`): 무료배송 · 유료배송 · 조건부 무료배송. **required 가 `SelectField` 로 주입된다**(`isRequirableChild` 허용 대상) | O | **이 값이 EL-006·EL-007 의 렌더 여부를 지배한다.** `error` prop 이 없다 — 선택지 3개 고정이라 위반 값이 없다 |
| FS-043-EL-006 | FS-043-SEC-04 | 기본 배송비 입력 | 입력 | **정책이 '무료배송'이 아닐 때만 렌더된다**(`:130`). `FormField htmlFor="ship-base-fee" required` + `<input type="text" inputMode="numeric">`, placeholder '예: 3000' | O | **⚠ 검증이 조건부가 아니다** — `validation.ts:28` `baseFee: intString('기본 배송비')` 가 **무조건** 필수다. 필드가 사라져도 요구는 남는다(§7 #2 — **실재 결함**). FS-041 의 같은 필드는 조건부다(`items/validation.ts:186-196`) |
| FS-043-EL-007 | FS-043-SEC-04 | 무료배송 기준 입력 | 입력 | **정책이 '조건부 무료배송'일 때만 렌더된다**(`:154`). `FormField htmlFor="ship-free-threshold" required` + `<input inputMode="numeric">`, placeholder '예: 50000', 힌트 '이 금액 이상 주문 시 무료배송' | O | **검증이 조건부다** — `validation.ts:35-47` `.check` 가 `feeType === 'conditional'` 일 때만 1 이상을 요구한다. **EL-006 과 대칭이 깨져 있다**(§7 #2) |
| FS-043-EL-008 | FS-043-SEC-05 | 제주 추가배송비 입력 | 입력 | `FormField htmlFor="ship-jeju" required` + `<input inputMode="numeric">`, placeholder '예: 3000'. **언제나 렌더된다** | O | 검증 `intString('제주 추가배송비')` — 비면 '제주 추가배송비를 입력하세요.'(조사는 `objectParticle` 이 고른다), 숫자 아니면 '제주 추가배송비는 0 이상의 정수만 입력할 수 있습니다.'(`topicParticle`). **`0` 이 통과한다**(`^\d+$`) — 추가배송비 없음을 0으로 표현한다 |
| FS-043-EL-009 | FS-043-SEC-05 | 도서산간 추가배송비 입력 | 입력 | `FormField htmlFor="ship-island" required` + `<input inputMode="numeric">`, placeholder '예: 5000' | O | 위와 동일(`intString('도서산간 추가배송비')`) |
| FS-043-EL-010 | FS-043-SEC-05 | 반품 배송비 입력 | 입력 | `FormField htmlFor="ship-return-fee" required` + `<input inputMode="numeric">`, placeholder '예: 3000' | O | 위와 동일(`intString('반품 배송비')`). **반품 화면(`/products/returns`)이 이 값을 읽지 않는다**(§7 #11) |
| FS-043-EL-011 | FS-043-SEC-06 | 묶음배송 토글 | 입력 | bare 라벨 `<span style={fieldLabelStyle}>묶음배송</span>` + `ToggleSwitch`('사용'/'미사용'), 접근 이름 '묶음배송 사용 여부'. `setValue('bundleShipping', next, { shouldDirty: true })` | O | **`FormField` 가 아니라 bare 라벨 span 이다** — 필수가 아니라 COMP-04 위반은 아니지만 표준 오류 슬롯이 없고 라벨-컨트롤 연결이 프로그램적이지 않다(§7 #7). **묶음배송의 실제 계산 규칙이 어디에도 없다**(§7 #12) |
| FS-043-EL-012 | FS-043-SEC-07 | footer 상태 문구 | 텍스트 | 저장 중이면 '저장하는 중입니다…', dirty 면 '저장하지 않은 변경 사항이 있습니다.', 아니면 '변경 사항이 없습니다.'(`DocumentFormShell.tsx:138-144`) | — | **`aria-live` 가 없다** — 상태 변화가 AT 에 들리지 않는다 |
| FS-043-EL-013 | FS-043-SEC-07 | 저장 버튼 | 버튼 | footer 우측. `type="submit" variant="primary"`. 라벨 `saving ? '저장 중…' : '저장'`. **비활성 조건**: `!dirty \|\| saving \|\| loading`(`DocumentFormShell.tsx:149`). 제출 시 zod 검증 → `save.mutate({ input, signal })` → 성공 시 `reset(values)`(**dirty 해제**) + 토스트 | O | **진행 상태를 `loading` prop 이 아니라 손으로 쓴 라벨**로 표현한다(§7 #8). **동기 제출 락·멱등키가 없다**(§7 #3). **권한을 묻지 않는다**(§7 #2) |
| FS-043-EL-014 | FS-043-SEC-07 | 저장 성공 토스트 | 토스트 | '배송 정책을 저장했습니다.'(`:80`) | — | 비표시. 실패는 토스트가 아니라 배너(EL-003) |
| FS-043-EL-015 | FS-043-SEC-02 | 폼 채움 규칙 | 텍스트 | 문서가 도착하면 `reset(data)`(`:61-64` `useEffect(() => { if (data === undefined) return; reset(data); }, [data, reset])`). 초기 `defaultValues` 는 `DEFAULT_SHIPPING_POLICY`(`:54`) | — | 비표시 규칙. **재조회가 오면 편집 중에도 `reset` 이 돈다** — `data` 참조가 바뀌면 입력이 덮인다(§7 #13) |
| FS-043-EL-016 | FS-043-SEC-02 | 로딩 상태 규칙 | 텍스트 | `loading = isFetching && data === undefined`(`:66`) — **최초 로드에만** true. 그동안 카드 본문이 스켈레톤(EL-019)이 되고 모든 입력이 `disabled = saving \|\| loading`(`:67`) | — | 비표시 규칙. **재조회 중에는 false 라 본문이 유지된다**(STATE-01 충족) |
| FS-043-EL-017 | FS-043-SEC-02 | dirty 판정 규칙 | 텍스트 | RHF `formState.isDirty`(`:51`). 저장 성공 시 `reset(values)`(`:79`)로 **새 기준선을 세워** dirty 가 풀린다 — 그래서 저장 후 이탈이 프롬프트 없이 통과한다 | — | 비표시 규칙 |
| FS-043-EL-018 | FS-043-SEC-02 | 언마운트 abort | 텍스트 | 화면을 벗어나면 진행 중인 저장을 abort 한다(`:58-59` `useEffect(() => () => controllerRef.current?.abort(), [])`). abort 는 실패로 통지하지 않는다(`:83` `isAbort` → 즉시 return) | — | 비표시 규칙. **`onSuccess` 에 `aborted` 가드가 없다**(`:78-81`) — 취소된 요청이 완료되면 언마운트된 컴포넌트에서 `reset`·토스트가 돈다(§7 #14) |
| FS-043-EL-019 | FS-043-SEC-09 | 로딩 스켈레톤 | 스켈레톤 | 최초 로드 중 카드 본문을 `aria-busy="true"` 컨테이너 안의 **4줄 고정** 스켈레톤 막대로 대체한다(`DocumentFormShell.tsx:127-132`). **카드 제목·footer·저장 버튼은 남는다**(저장 버튼은 `loading` 으로 비활성) | — | 비표시. 실제 필드가 8~10개인데 **막대가 4줄 고정**이라 로딩 shape 이 실제와 다르다 |
| FS-043-EL-020 | FS-043-SEC-08 | 조회 실패 배너 | 배너 | 조회 실패 시 **화면 전체를 대체**해 위험 톤 `Alert` '내용을 불러오지 못했습니다.' + '다시 시도'(`refetch`) — `DocumentFormShell.tsx:102-115`. 자동 소멸하지 않고 토스트를 쓰지 않는다 | O | 비표시. **문구가 '배송 정책'을 지칭하지 않는다** — 껍데기가 도메인을 모르기 때문이다(`DocumentFormShell.tsx:9`). 안내문(EL-001)까지 함께 사라진다(§7 #15) |
| FS-043-EL-021 | FS-043-SEC-10 | 미저장 이탈 가드 | 모달 | `useUnsavedChangesDialog(dirty && !saving, { message })`(`DocumentFormShell.tsx:100`). 3경로: 브라우저 이탈(beforeunload) · **앱 내 링크 클릭**(document capture 가로채기 — `target` 이 `''`/`_self` 이고 좌클릭·수식키 없음일 때만) · 뒤로/앞으로(popstate sentinel). 문구 '배송 정책에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.'(`ShippingPolicyPage.tsx:27-28`) | — | 비표시. **이 화면에는 '목록으로'·'취소' 버튼이 없어** `navigate()` 프로그램 이탈 경로가 **아예 없다** — FS-041 §7 #8 의 구멍이 여기서는 구조적으로 닫혀 있다 |
| FS-043-EL-022 | FS-043-SEC-02 | 조건부 필드 규칙 | 텍스트 | 배송비 정책(EL-005)이 EL-006·EL-007 의 렌더를 지배한다: `free` → 둘 다 숨김 · `paid` → EL-006 만 · `conditional` → 둘 다. **RHF 는 언마운트된 필드의 값을 유지한다**(`shouldUnregister` 기본값 false — `useForm` 에 그 옵션이 없다) | — | 비표시 규칙. **그것이 §7 #2 결함의 전제다** — 숨겨진 `baseFee` 의 값이 남아 무조건 검증에 걸린다 |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-043-EL-001 | N/A — 정적 문구 | 로딩 중에도 표시 | 조회 실패 시 **함께 사라진다**(EL-020이 화면 전체를 대체 — §7 #15) | N/A — 입력 없음 | §4.1 공통 규칙 | N/A — 표시 전용 | 고정 문구 |
| FS-043-EL-002 | N/A — 문서는 언제나 1건이다(`createDocumentStore` 가 seed 를 들고 있어 '없음'이 없다) | 본문이 EL-019 스켈레톤으로 대체된다(카드 제목·footer 는 남는다) | 조회 실패 시 EL-020 이 대체 | N/A — 컨테이너 | §4.1 공통 규칙 | N/A — 표시 전용 | 필드 8~10개 고정 |
| FS-043-EL-003 | N/A — 오류 없으면 미렌더 | 재제출 시 먼저 지운다 | **이것이 저장 실패 표현.** 문구 1종. abort 는 표시하지 않는다 | 클라이언트 검증 위반은 여기 오지 않는다(필드 인라인) | §4.1 공통 규칙 — **서버 403 도 이 문구**. '잠시 후 다시 시도' 는 **거짓 안내**다(권한은 시간이 해결하지 않는다 — §7 #4) | **409 도 이 문구다** — 충돌 다이얼로그가 없다(§7 #4). 애초에 어댑터가 409 를 내지 않는다(§7 #16) | 1건만 표시 |
| FS-043-EL-004 | 문서 도착 전에는 `DEFAULT_SHIPPING_POLICY.carrier`('가상택배')가 보인다 — **빈 폼이 아니다**(다만 그동안 스켈레톤이 덮는다) | 로딩·저장 중 비활성 | 저장 실패는 EL-003 | 공백만이면 '택배사를 입력하세요.' · 40자 초과면 '택배사는 40자를 넘을 수 없습니다.'. **`maxLength` 가 없어 41자를 칠 수 있다** — 제출 시에야 막힌다(§7 #6). 저장 시 **trim 하지 않는다**(스키마가 `trim() !== ''` 로 검사만 하고 값은 원본을 보낸다 — §7 #17) | §4.1 공통 규칙 | **낙관적 잠금 토큰이 없다** — 다른 관리자가 그 사이 정책을 바꿔도 감지 없이 덮는다(§7 #16) | 40자 상한(검증만). 카운터 없음 |
| FS-043-EL-005 | N/A — 항상 하나가 선택돼 있다(기본 '조건부 무료배송') | 로딩·저장 중 비활성 | 저장 실패는 EL-003 | 선택지 3개 고정 — 위반 값이 없다 | §4.1 공통 규칙 | 위와 동일 | 3개 고정 |
| FS-043-EL-006 | 정책이 '무료배송'이면 **렌더되지 않는다.** 문서 도착 전 기본값 '3000' | 로딩·저장 중 비활성 | 저장 실패는 EL-003 | **⚠ 검증이 무조건이다** — 비거나 숫자 아니면 막는다. **필드가 숨겨졌는데 값이 비어 있으면 제출이 조용히 실패한다**(오류가 렌더되지 않는 필드에 붙는다 — §7 #2 **실재 결함**) | §4.1 공통 규칙 | 위와 동일 | 단건 |
| FS-043-EL-007 | 정책이 '조건부 무료'가 아니면 렌더되지 않는다. 기본값 '50000' | 로딩·저장 중 비활성 | 저장 실패는 EL-003 | **검증이 조건부다** — `conditional` 일 때만 1 이상 정수를 요구한다. **`baseFee` 와의 대소 관계를 검증하지 않는다** — 기준 1,000원 · 배송비 3,000원 같은 모순이 통과한다(§7 #18) | §4.1 공통 규칙 | 위와 동일 | 단건 |
| FS-043-EL-008 | 기본값 '3000' | 로딩·저장 중 비활성 | 저장 실패는 EL-003 | 비거나 숫자 아니면 막는다. **`0` 이 통과한다**(추가배송비 없음의 표현). **상한이 없다** | §4.1 공통 규칙 | 위와 동일 | 단건. 마스킹 없음 |
| FS-043-EL-009 | 기본값 '5000' | 로딩·저장 중 비활성 | 저장 실패는 EL-003 | 위와 동일 | §4.1 공통 규칙 | 위와 동일 | 단건 |
| FS-043-EL-010 | 기본값 '3000' | 로딩·저장 중 비활성 | 저장 실패는 EL-003 | 위와 동일 | §4.1 공통 규칙 | **반품 화면이 이 값을 읽지 않아**(§7 #11) 두 화면의 반품 배송비가 어긋날 수 있다 | 단건 |
| FS-043-EL-011 | 기본값 `true` | 로딩·저장 중 비활성 | 저장 실패는 EL-003 | N/A — 이진 입력 | §4.1 공통 규칙 | 위와 동일 | 단일 토글 |
| FS-043-EL-012 | N/A — 항상 표시 | '저장하는 중입니다…' | 실패해도 문구가 바뀌지 않는다(dirty 가 유지되므로 '저장하지 않은 변경 사항이 있습니다.') | N/A — 입력 없음 | §4.1 공통 규칙 | N/A — 파생 표시 | 문구 3종 |
| FS-043-EL-013 | **미변경이면 비활성**('변경 사항이 없습니다.') | 로딩·저장 중 비활성. 라벨 '저장 중…' | 실패 시 EL-003 배너, 버튼 재활성, **입력 보존** | 검증 실패면 서버를 호출하지 않고 **첫 오류 필드로 포커스**가 간다(RHF `shouldFocusError` 기본값). **단 그 필드가 숨겨져 있으면 포커스도 오류도 보이지 않는다**(§7 #2) | §4.1 공통 규칙 — **권한을 묻지 않는다**(§7 #2) | **동기 제출 락·멱등키가 없다** — 비활성 렌더 전 연타가 두 번째 요청을 통과시킨다. **완화 요인**: 저장이 **전체 문서 치환**이라 같은 body 두 번은 결과가 같다(멱등) — 데이터 손상은 없다(§7 #3) | 단건 저장. 문서 1건 전체 전송(≈ 200바이트) |
| FS-043-EL-014 | N/A — 성공이 있어야 성립 | N/A — 결과 통지 | N/A — 실패는 배너가 담당 | N/A — 입력 없음 | §4.1 공통 규칙 | **`onSuccess` 에 `aborted` 가드가 없어** 이탈 후 완료된 저장의 토스트가 뜰 수 있다(§7 #14) | 1건 |
| FS-043-EL-015 | 문서가 없는 경우가 없다(`createDocumentStore` 가 seed 를 든다) | 도착 전에는 `DEFAULT_SHIPPING_POLICY` 가 폼에 있다 | 조회 실패 시 `data === undefined` 라 `reset` 이 돌지 않는다 | N/A — 규칙 | §4.1 공통 규칙 | **재조회로 `data` 참조가 바뀌면 편집 중에도 `reset` 이 돌아 입력을 덮는다**(`useEffect([data, reset])` — §7 #13) | N/A — 규칙 |
| FS-043-EL-016 | N/A — 규칙 | **이것이 로딩 규칙.** 최초 로드에만 true | 실패는 EL-020 | N/A — 입력 없음 | §4.1 공통 규칙 | **재조회 중에는 false 라 본문이 유지된다** — 폼을 채우던 운영자 밑에서 필드가 사라지지 않는다(STATE-01 충족). `useDocumentQuery` 에 `placeholderData` 가 없으나(`document.ts:38-46`) **같은 키의 재조회는 `data` 를 유지**하므로 성립한다 | N/A — 규칙 |
| FS-043-EL-017 | N/A — 규칙 | 로딩 중에는 dirty 가 false(기본값 = 기준선) | 저장 실패 시 dirty 가 **유지된다** — 재시도할 수 있다 | N/A — 규칙 | §4.1 공통 규칙 | **저장 성공 시 `reset(values)` 로 새 기준선을 세운다** — 서버 응답이 아니라 **보낸 값**이 기준선이다(응답 본문이 `void` 라 — §7 #19) | N/A — 규칙 |
| FS-043-EL-018 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | **abort 는 실패가 아니다** — 배너·토스트를 띄우지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 | 이탈 시 진행 중 저장이 취소된다 — **서버 도달 여부는 보장하지 않는다**(§7 #20). **`onSuccess` 가드 부재**(§7 #14) | 단건 |
| FS-043-EL-019 | N/A — 도착 전 상태 | **이것이 로딩 표현.** 4줄 고정 막대 + `aria-busy` | 조회 실패 시 EL-020 으로 바뀐다 | N/A — 입력 없음 | §4.1 공통 규칙 | **데이터가 있는 재조회에서는 뜨지 않는다**(EL-016 — STATE-01 충족) | **막대 4줄 고정** — 실제 필드 수(8~10)와 무관하다 |
| FS-043-EL-020 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 EL-019 로 | **이것이 실패 표현.** 문구 1종 + '다시 시도'. **토스트를 쓰지 않는다** | N/A — 입력 없음 | §4.1 공통 규칙 — 서버 403 도 이 배너(라우트 read 가드는 별개) | 재시도는 같은 조회를 재발행 | N/A — 표시 전용 |
| FS-043-EL-021 | N/A — 변경이 있어야 성립 | 저장 중에는 가드가 비활성(`dirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 | 저장 성공 시 `reset(values)` 로 dirty 가 풀려 가드가 해제된다 | N/A — 표시 전용 |
| FS-043-EL-022 | N/A — 규칙 | N/A — 동기 | N/A — 서버 호출 없음 | **이것이 §7 #2 결함의 전제다** — RHF 가 언마운트된 필드의 값을 유지하는데 `baseFee` 검증이 무조건이다 | §4.1 공통 규칙 | N/A — 로컬 규칙 | 필드 2개 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 조회 실패는 인라인 배너로 **화면 전체가 대체**된다(EL-020). 저장 실패는 카드 배너(EL-003). **오프라인 감지·복귀 재조회는 앱 전역에 없다**(`navigator.onLine` 0건) — §7 #21 |
| 세션 만료 | 조회·저장 어디서든 401 이 오면 **앱 전역 401 인터셉터**(`shared/query/queryClient.ts` 의 `QueryCache`/`MutationCache` `onError`)가 세션 만료를 알리고 `RequireAuth` 의 감시자가 세션을 폐기한 뒤 `/login?returnUrl=<현재경로>&reason=session_expired` 로 보낸다. **미저장 입력은 그때 사라진다** — 프로그램적 이동이라 EL-021 가드가 발화하지 않는다(§7 #21) |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건). abort 는 화면 이탈(EL-018) 시에만 발생한다 — §7 #21 |
| 중복 제출 | '저장'은 요청 중 비활성된다. **동기 제출 락(`submitLockRef`)·멱등키가 없다** — 이 화면이 `useCrudForm` 을 쓰지 않고 `useSaveDocument` 를 직접 쓰기 때문이다(`SaveVars` 에 키 필드가 없다 — `document.ts:48-51`). **완화 요인**: 저장이 **전체 문서 치환**(`doc = input` — `document.ts:34`)이라 같은 body 를 두 번 보내도 최종 상태가 같다 — **데이터 손상은 없고 요청 수만 는다**(§7 #3) |
| 실패 통지의 자리 | ① 조회 실패는 인라인 배너(화면 대체) ② 저장 실패는 카드 상단 배너(**입력을 보존한 채 그 자리에서 재시도**) ③ 저장 **성공**은 토스트 ④ abort 는 아무것도 띄우지 않는다. **이 화면에 삭제·일괄 작업·모달이 없어 다이얼로그 내부 실패 경로가 없다** |
| 서버 오류 분기 | **없다.** `onValid` 의 `onError`(`:82-85`)가 `isAbort` 만 보고 나머지를 전부 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 뭉갠다. `useCrudForm` 의 네 갈래(404·409·422+fields·그 밖)를 **상속하지 못했다** — 그 훅을 쓰지 않는다. 게다가 **`createDocumentStore` 는 `HttpError` 를 아예 던지지 않는다**(`document.ts:22-36` — 404·409 가드가 없다) → 분기할 근거 자체가 없다(§7 #16) |
| 낙관적 업데이트 | **이 화면에 없다.** 저장이 비관적이다(요청 완료 후 무효화 + `reset`) — 롤백 경로가 필요 없다 |
| 동시 조회 | 문서 쿼리 1건만 유지된다(react-query, 키 `['shipping-policy']`). `staleTime` 30초 · 자동 재시도 없음 · 창 포커스 재조회 없음. **`placeholderData` 가 없으나**(`document.ts:38-46`) 같은 키의 재조회는 `data` 를 유지하므로 본문이 사라지지 않는다 |
| 권한 없음 | 라우트 **read** 권한은 AppShell 의 `RequirePermission` 이 `<Outlet>` 바깥에서 가드해 `ForbiddenScreen` 을 렌더한다(`AppShell.tsx:490`). **`/products/shipping` 은 nav 잎이라**(`nav-config.ts:148`) `findCoveringLeaf` 가 자기 자신을 찾고 `/products` 와 별개 리소스로 갈린다. **쓰기 게이팅이 전혀 없다** — 이 화면은 `useRouteWritePermissions` 의 소비자가 **아니다**(import 부재 — `ShippingPolicyPage.tsx:1-25`). 상품·카테고리가 '등록/추가' 버튼만이라도 게이팅하는 것과 달리 **여기는 0건**이다(§7 #2). 서버 권한 응답은 조회=배너, 저장=카드 배너로 떨어진다. 은닉 정책(403 vs 404)은 BE-043 §7.5 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary` 를 둔다(`AppShell.tsx:484-493`) — 화면이 던져도 사이드바·헤더가 남고 복구 화면(`RouteErrorScreen`)이 뜬다 |
| 행 선택의 수명 | N/A — **이 화면에 목록도 행 선택도 없다**(단일 문서 폼) |
| 프로그램 이탈 | **N/A — 이 화면에 '목록으로'·'취소' 버튼이 없다.** `navigate()` 를 부르는 곳이 0건이라(확인) FS-041 §7 #8 의 '가드가 프로그램 이동을 못 잡는다' 구멍이 **구조적으로 존재하지 않는다** |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| EL-002 / EL-015 / EL-016 / EL-019 / EL-020 | 배송 정책 조회 | R | 정책 문서 1건 전체 | `shippingPolicyStore.fetch(signal)` (`useDocumentQuery(['shipping-policy'], …)` 경유) | **문서가 '없음'인 경우가 없다** — `createDocumentStore` 가 seed 를 든다. 서버는 미설정 상태를 어떻게 표현할지 정해야 한다(BE-043 §7.2) |
| EL-004~EL-011 / EL-013 / EL-014 | 배송 정책 저장 | W | 정책 문서 1건 **전체** | `shippingPolicyStore.save(input, signal)` (`useSaveDocument` 경유) | **부분 갱신(PATCH)이 아니라 전체 치환**(`document.ts:34` `doc = input`). **멱등키·`If-Match` 를 싣지 않는다**(`SaveVars` 에 그 자리가 없다 — `document.ts:48-51`). 성공 시 `['shipping-policy']` 무효화 + `reset(values)` |

> **현재 구현 상태 (백엔드 명세 참고)**: 백엔드는 없다. `shippingPolicyStore` 는 `shared/crud/document.ts:22-36` 의 **`createDocumentStore('shipping-policy', DEFAULT_SHIPPING_POLICY)`** 로 만들어진 **모듈 클로저 변수 1개**(`let doc = seed`)다 — 400ms 지연(`LATENCY_MS`)과 개발용 실패 스위치(`failIfRequested('shipping-policy', op)`)를 얹어 fetch/save 를 흉내 낸다. 실제 네트워크 0건. **`createStoreAdapter`(상품·카테고리)와 달리 이 팩토리는 404·409·멱등 원장을 주지 않는다** — 단일 문서에는 '존재 여부'가 개념적으로 없기 때문이다(`fetch` 가 언제나 seed 또는 마지막 저장본을 돌려준다). 그래서 **이 화면의 EXC-04 는 상품·카테고리보다 넓게 열려 있다**(§7 #16). 새로고침하면 시드로 되돌아간다. 연동 지점은 `data-source.ts:11` `// TODO(backend): GET/PUT /api/shipping-policy` **한 줄**이다. 위 표는 백엔드 연결 후 의도된 동작이다. **`types.ts:5` 가 '실제 백엔드가 붙으면 숫자로 매핑한다(`// TODO(backend)`)' 를 명시** — 현재 금액이 전부 문자열인 것은 임시 형태다(BE-043 §7.3).

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `ShippingPolicyPage.tsx` · `data-source.ts` · `types.ts` · `validation.ts` · `shipping.test.ts`(전 파일 — 이 화면은 5파일뿐이고 components 디렉터리가 없다), 그리고 소비하는 공용 모듈(`shared/crud/{DocumentFormShell,document,dev}` · `shared/ui/{useUnsavedChangesDialog,styles}` · `shared/permissions/*`(**미소비 확인**) · `shared/layout/nav-config.ts` · `packages/ui/.../{FormField,SelectField,ToggleSwitch,Card}`)
- [x] **`useRouteWritePermissions` 를 이 화면이 쓰지 않음을 import 로 직접 확인**했다(`ShippingPolicyPage.tsx:1-25` 에 `shared/permissions` 부재) — 브리핑의 '소비처가 아니다' 를 코드로 재확인해 §4.1·§7 #2 에 반영
- [x] **`firstLoading` 파생을 직접 확인**했다 — `ShippingPolicyPage.tsx:66` `const loading = isFetching && data === undefined` → STATE-01 은 pass 쪽. `DocumentFormShell.tsx:127-132` 가 그 값으로만 스켈레톤을 그린다
- [x] 보이지 않는 요소(스켈레톤·실패 배너·이탈 가드·폼 채움 규칙·로딩 규칙·dirty 규칙·abort·조건부 필드 규칙·토스트)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. **엔드포인트를 지어내지 않았다** — `// TODO(backend)` 한 줄만 인용했다
- [x] **`baseFee` 검증이 조건부가 아닌데 필드는 조건부 렌더임을 코드로 확인**하고(`validation.ts:28` vs `ShippingPolicyPage.tsx:130`) FS-041 의 대칭 구현(`items/validation.ts:186-196`)과 대조해 **실재 결함**으로 §7 #2 에 기록했다
- [x] `createDocumentStore` 가 **404·409·멱등 원장을 주지 않음**을 `createStoreAdapter` 와 대조해 확인하고 §5·§7 #16 에 명시했다 — '이 화면도 F3b 의 수혜자다' 라고 잘못 적지 않았다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-043 영역)
- [x] §7 의 미결 항목이 BE-043 §7 후속 이관 · NFR-043 §5 와 일치한다

## 7. 미결 사항 (UI 기획 / 아키텍처 / 백엔드 명세 / 프론트 구현 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (상품 관리 SCR 미작성) | UI 기획 / 아키텍처 |
| 2 | **⚠ 실재 결함 — `baseFee` 검증이 무조건인데 필드는 조건부 렌더다.** `validation.ts:28` `baseFee: intString('기본 배송비')` 는 **언제나** 비어 있지 않은 정수를 요구하는데, 그 입력은 `feeType !== 'free'` 일 때만 렌더된다(`ShippingPolicyPage.tsx:130`). RHF 는 언마운트된 필드의 값을 **유지**하므로(`shouldUnregister` 기본 false), **'유료배송' 에서 기본 배송비를 지우고 '무료배송'으로 바꾼 뒤 저장하면 → 검증 실패 → 오류가 *렌더되지 않는 필드*에 붙는다 → 화면에 아무 일도 일어나지 않는다.** 저장 버튼을 눌러도 조용히 실패한다(quality-bar FEEDBACK-03 P1 의 'no-op state 금지' 위반). **대조**: FS-041 의 같은 필드는 `.check` 안에서 `feeType !== 'free'` 를 확인한다(`items/validation.ts:186-196`) — **같은 섹션의 두 스키마가 갈려 있어 설계가 아니라 오류임이 드러난다.** `shipping.test.ts:39-43` 이 '무료배송이면 기준 금액이 없어도 통과한다' 만 검증하고 **`baseFee: ''` + `feeType: 'free'` 를 검증하지 않아** 회귀 테스트가 이것을 놓쳤다 | **UI 기획 쪽 변경 요청 (우선)** |
| 3 | **쓰기 게이팅이 전혀 없다.** 이 화면은 `useRouteWritePermissions` 를 **import 조차 하지 않는다**(`ShippingPolicyPage.tsx:1-25`). 상품(FS-041)·카테고리(FS-042)가 최소한 '등록/추가' 버튼은 게이팅하는 것과 달리 **여기는 0건**이다 — read 권한만 있는 역할이 '저장' 버튼을 보고 누르며, 서버 403 이 '저장하지 못했습니다. **잠시 후 다시 시도해 주세요**' 로 뭉개진다(quality-bar EXC-03 P0) | UI 기획 쪽 변경 요청 |
| 4 | **동기 제출 락·멱등키가 없다.** 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅의 `submitLockRef`(`useCrudForm.ts:103`)·`idempotencyKeyRef`(`:118-123`)를 상속하지 못했고, `useSaveDocument` 의 `SaveVars`(`document.ts:48-51`)에 **멱등키 자리 자체가 없다**. 방어는 `disabled={!dirty \|\| saving \|\| loading}` 하나뿐인데 `type="submit"` + RHF `handleSubmit` 이 **비동기**라 연타 창이 열려 있다. **완화 요인**: 저장이 전체 문서 치환이라 같은 body 두 번은 결과가 같다 — **데이터 손상은 없고 요청 수만 는다**(quality-bar EXC-08 P0 — acceptanceCheck 의 '정확히 1개 요청' 은 실패한다) | UI 기획 · 백엔드 명세 |
| 5 | **저장 실패가 status 를 구분하지 않는다.** `onError`(`:82-85`)가 `isAbort` 만 보고 400·403·409·422·429·500 을 전부 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 뭉갠다. **403·429 에 그 문구는 거짓 안내**다. `useCrudForm` 의 네 갈래를 상속하지 못했다(quality-bar EXC-06 · EXC-07 P1) | UI 기획 쪽 변경 요청 |
| 6 | **5xx 에 복사 가능한 오류 코드가 없다.** `HttpError.reference` 가 존재하고(`http-error.ts:59`) `FormServerError` 가 그것을 렌더하는데(`FormFeedback.tsx:44`), 이 화면은 `setServerError('저장하지 못했습니다…')` 고정 문구만 쓴다 — `DocumentFormShell` 이 `serverError: string \| null` 만 받아(`:77`) reference 를 실을 자리가 없다(quality-bar EXC-20 P1) | UI 기획 쪽 변경 요청 |
| 7 | 택배사 입력에 **`maxLength` 가 없다**(`:105-115`) — 41자를 칠 수 있고 **제출 시에야** '40자를 넘을 수 없습니다' 로 막힌다. 이 화면의 다른 필드도, 상품 화면의 텍스트 입력도 전부 `maxLength` 를 두는데(`ProductFormPage.tsx:388,411,428`) 여기만 없다. 카운터도 없다(quality-bar COMP-12 P2) | UI 기획 쪽 변경 요청 |
| 8 | 저장 버튼(EL-013)이 **`loading` prop 대신 손으로 쓴 '저장 중…' 라벨**을 쓴다(`DocumentFormShell.tsx:151`) — quality-bar COMP-01 P1 이 '진행 상태는 `loading` prop 으로(손수 쓴 저장 중… 금지)' 를 명시한다. **공용 `DocumentFormShell` 소관** | UI 기획 (공용 껍데기) |
| 9 | **택배사가 선택지가 아니라 자유 텍스트**다 — 오타가 곧 새 택배사가 되고('가상택배'/'가상 택배'), 송장 추적·운임 계산 연동의 키가 될 수 없다. 배송사 코드 체계가 없다 | 아키텍처 (도메인 경계) · 백엔드 명세 |
| 10 | **권역이 제주·도서산간 2축 고정**이다 — 임의 권역(예: 울릉도 별도 요금)을 추가할 경로가 없다. 국내 커머스는 보통 **우편번호 기반 권역 테이블**을 갖는다. 의도된 단순화인지 미구현인지 확정 필요 | 아키텍처 (도메인 경계) |
| 11 | **반품 배송비(EL-010)를 반품 화면이 읽지 않는다.** `/products/returns` 의 코드에 `shippingPolicyStore` 소비가 0건이다 — 두 화면의 반품 배송비가 어긋날 수 있다. 정책이 정본이라면 반품 처리가 이 값을 참조해야 한다 | 아키텍처 · UI 기획 |
| 12 | **묶음배송의 실제 계산 규칙이 어디에도 없다.** `bundleShipping: boolean` 하나만 저장되고, '묶음' 의 단위(같은 판매자? 같은 배송 방식? 같은 주문?)·배송비 산정(최대값? 대표 상품?)이 정의되지 않았다. 토글이 아무것도 지배하지 않는다 | 아키텍처 (도메인 경계) · 백엔드 명세 |
| 13 | **재조회가 편집 중 입력을 덮는다.** `useEffect(() => { if (data === undefined) return; reset(data); }, [data, reset])`(`:61-64`)가 `data` 참조가 바뀔 때마다 돈다 — `staleTime` 30초 경과 후 재조회가 오면 **작성 중이던 값이 서버 값으로 되돌아간다.** dirty 여부를 보지 않는다 | UI 기획 쪽 변경 요청 |
| 14 | **`onSuccess` 에 `aborted` 가드가 없다**(`:78-81`). `useCrudForm`(`:218`)·`useCrudList`(`:105`)·`useCrudRowUpdate`(`:48`)·`ProductCategoriesPage` 의 삭제(`:233`)는 전부 `if (controller.signal.aborted) return;` 를 두는데 이 화면만 없다 → **이탈 후 완료된 저장이 언마운트된 컴포넌트에서 `reset`·토스트를 부른다** | UI 기획 쪽 변경 요청 |
| 15 | 조회 실패 배너(EL-020)의 문구가 **'내용을 불러오지 못했습니다.'** 로 도메인을 지칭하지 않는다 — `DocumentFormShell` 이 도메인을 모르기 때문이다(`:9` '도메인을 모른다'). 게다가 **화면 전체를 대체**해 안내문(EL-001)까지 사라진다. 상품·카테고리는 '상품/카테고리를 불러오지 못했습니다' 로 지칭한다 | UI 기획 (공용 껍데기) |
| 16 | **낙관적 동시성이 전혀 없다 — 상품·카테고리보다 넓게 열려 있다.** ① `ShippingPolicyValues` 에 `version`/`updatedAt` 이 없다 ② `SaveVars` 에 `If-Match` 자리가 없다 ③ **`createDocumentStore` 는 `HttpError` 를 아예 던지지 않는다**(`document.ts:22-36` — 404·409 가드가 없다). `createStoreAdapter` 가 F3b 에서 얻은 409 가드를 **이 팩토리는 받지 못했다** — 단일 문서에 '존재 여부' 개념이 없기 때문이다. 결과: **두 관리자가 배송 정책을 동시에 고치면 나중 저장이 앞선 것을 조용히 덮는다.** 그것도 **전체 치환**이라 한 필드를 고친 사람이 상대의 모든 변경을 되돌린다(quality-bar EXC-04 P0) | 백엔드 명세 (BE-043 §7.1) · UI 기획 |
| 17 | 택배사 값을 **trim 하지 않고 보낸다** — 스키마가 `value.trim() !== ''` 로 검사만 하고(`validation.ts:22`) 변환하지 않으며, `onValid` 가 `values` 를 그대로 넘긴다(`:75`). `' 가상택배 '` 가 그대로 저장된다. 상품 폼은 `toInput` 에서 trim 한다(`ProductFormPage.tsx:174`) | UI 기획 쪽 변경 요청 |
| 18 | **무료배송 기준과 기본 배송비의 관계를 검증하지 않는다** — 기준 1,000원 · 배송비 3,000원 같은 모순이 통과한다. 추가배송비에 상한도 없다(10,000,000원이 통과) | UI 기획 쪽 변경 요청 |
| 19 | 저장 성공 시 `reset(values)`(`:79`) — **서버 응답이 아니라 보낸 값**이 새 기준선이 된다(`save` 가 `Promise<void>` 라 응답 본문이 없다). 서버가 값을 정규화하면(trim·반올림) 화면이 그것을 모른 채 낡은 값을 기준선으로 삼는다 | 백엔드 명세 (BE-043 §7.4) · UI 기획 |
| 20 | 이탈 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다 — 이미 반영된 저장이 화면에 안 보일 수 있다 | 백엔드 명세 (BE-043) |
| 21 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료 리다이렉트가 미저장 입력을 버린다(가드 미발화) — quality-bar EXC-05 · EXC-11 · EXC-19 P1 | UI 기획 · 프론트 구현 |
| 22 | 금액 필드 5종에 **실시간 천단위 마스킹·붙여넣기 정규화가 없다** — 붙여넣은 '3,000' 이 '기본 배송비는 0 이상의 정수만 입력할 수 있습니다' 로 거절된다(quality-bar ERP-14 P1) | UI 기획 쪽 변경 요청 |
| 23 | 묶음배송 토글(EL-011)이 **`FormField` 가 아니라 bare 라벨 span** 이다(`:248-258`) — 필수가 아니라 COMP-04 위반은 아니지만 표준 오류 슬롯이 없다. FS-041 의 전시상태·과세 토글도 같은 형태다 | UI 기획 쪽 변경 요청 |
| 24 | 로딩 스켈레톤(EL-019)이 **4줄 고정**이다(`DocumentFormShell.tsx:129`) — 실제 필드가 8~10개라 로딩 shape 이 실제와 다르고, 도착 시 layout shift 가 난다. **공용 껍데기 소관** | UI 기획 (공용 껍데기) |
| 25 | footer 상태 문구(EL-012)에 **`aria-live` 가 없다** — '저장하지 않은 변경 사항이 있습니다' ↔ '변경 사항이 없습니다' 전환이 AT 에 들리지 않는다. **공용 껍데기 소관** | UI 기획 (공용 껍데기) |
| 26 | **금액이 전부 문자열이다**(`ShippingPolicyValues`) — `types.ts:4-5` 가 '실제 백엔드가 붙으면 숫자로 매핑한다(`// TODO(backend)`)' 를 명시한다. 즉 **현재 계약은 임시 형태이며 연동 시 타입·`reset(data)` 경로가 함께 바뀐다** — 어댑터 본문만 바꿔 끝나지 않는다 | 백엔드 명세 (BE-043 §7.3) · UI 기획 |
</content>
