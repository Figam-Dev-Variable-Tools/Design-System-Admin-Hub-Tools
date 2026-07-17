---
id: FS-069
title: "API Key 관리"
screen: SCR-069               # ⚠ 시스템 설정 SCR 미작성 — §7 미결 사항 참조
route: /settings/api-keys
owner: A62
reviewer: A64
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-069. API Key 관리

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 외부 시스템이 이 사이트의 API 를 호출할 때 쓰는 키를 **발급**하고, 발급된 키를 **1회 노출**해 복사하게 하며, 쓰지 않거나 노출된 키를 **폐기**한다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — 권한은 `useRouteWritePermissions` 로 게이팅. §4.1) |
| 진입 경로 | 좌측 GNB > 시스템 > 시스템 설정 > API Key 관리 (`nav-config.ts:229` `['API Key 관리', '/settings/api-keys']`) |
| 포함 화면 | 단일 라우트 `/settings/api-keys` — **하위 라우트가 없다(잎)**. 상세 화면이 없다(보여줄 것이 없다 — §1.1) |
| **범위 밖** | **키 수정** — 이름·스코프를 고치는 경로가 없다. 키는 발급되거나 폐기될 뿐이다(`types.ts:36-37` '폐기는 되돌릴 수 없다 — 상태가 두 개뿐인 이유다(일시정지가 없다)'). **평문 재노출** — 기능이 아니라 **불가능**하다(§1.1). **키 사용 로그·통계** — 목록의 `lastUsedAt` 한 줄이 전부다. **스코프 세분화** — `read`/`write` 2종 고정(`types.ts:17`) |
| 구현 경로 | `apps/admin/src/pages/settings/api-keys/**` (`ApiKeysPage.tsx` · `types.ts` · `validation.ts` · `data-source.ts` · `queries.ts` · `api-keys.test.ts` · `components/{ApiKeysCard,ApiKeyTable,CreateApiKeyModal,RevealKeyModal}.tsx` · `components/RevealKeyModal.test.tsx`) · 공유 `pages/settings/_shared/{secret,queries}.ts` |
| 대응 SCR | SCR-069 (미작성 — §7 #1) |
| 공통 컴포넌트 | `settings/_shared/{maskSecret,MASKED_SECRET_TEXT,copyToClipboard,previewOf,createDummyPlaintextKey,useSubmitLock,formatDateOnly}` · `shared/ui/{Alert,Button,Card,CardTitle,ConfirmDialog,Modal,FormField,StatusBadge,controlStyle,errorIdOf,tableStyle,tdStyle,thStyle,useToast}` · **`@tds/ui` 의 `Checkbox`·`Empty`(앱 배럴 미노출 — `CreateApiKeyModal.tsx:15` · `ApiKeysCard.tsx:11`)** · `shared/permissions/RequirePermission` · `shared/form/zodResolver` · `shared/format(formatRelativeOrDate)` · `shared/async(isAbort)` |

> ⚠ **이 화면은 이 섹션에서 유일하게 `createRevisionedStore` 를 쓰지 않는다.** 단일 문서가 아니라 **목록 + create/revoke** 이기 때문이다(`data-source.ts:63` `let keys: readonly ApiKey[] = SEED_KEYS`). 그래서 **낙관적 동시성 토큰이 없다** — 사이트·언어·OAuth 설정과 갈리는 지점이며 그 결과는 §7 #9·#10 이다.

### 1.1 이 화면의 설계 원칙 (요구사항 — 명세에 고정한다)

| 원칙 | 내용과 이유 (코드 근거) |
|---|---|
| **평문은 저장되지 않는다. 그러므로 다시 보여줄 수 없다** | `_shared/secret.ts:4-14` 가 이 섹션의 단 하나의 규칙으로 선언한다. **마스킹이 아니다** — '마스킹은 값이 있는데 감추는 것이고, 감춘 값은 언젠가 새어 나온다(DOM·리덕스 devtools·스크린샷·로그)'. `sk_test_••••0001` 은 **원본을 가린 표시가 아니라 우리가 가진 정보의 전부**다 |
| **모델에 평문 자리가 없다** | `ApiKey` 에 평문 필드가 **없다**(`types.ts:3-13`) — 있어야 할 자리에 `preview: SecretPreview`(prefix + last4)만 있다. '그릴 수 있는 값을 갖지 않는 것이 방어다.' 그래서 **'평문 재노출' 은 구현 실수로도 불가능**하다 |
| **평문이 사는 유일한 자리는 노출 모달의 지역 state 다** | 발급 응답(`ApiKeyIssued`)에만 실리고 `ApiKeysPage.tsx:75` `const [issued, setIssued] = useState<ApiKeyIssued \| null>(null)` 에만 산다. **react-query 캐시에 넣지 않는다**(`queries.ts:39-42` — `onSuccess` 가 목록만 invalidate). 모달을 닫으면 `setIssued(null)`(`:140-142`) — 그 순간 평문은 앱 어디에도 없다 |
| **폐기는 되돌릴 수 없다 — 확인을 거친다** | `ConfirmDialog intent="delete"` + 결과를 말하는 문구(`:53-55`). 상태가 `active`/`revoked` 2개뿐이라 '일시정지'가 없다(`types.ts:36-37`) |
| **폐기는 지우지 않는다 — 감사다** | `revoked` 로 남긴다(`data-source.ts:143-145` '이 키가 언제까지 살아 있었나 는 사고 조사에서 반드시 필요한 기록이다') |
| **복사하지 않고 닫으려 하면 붙잡는다** | `RevealKeyModal.tsx:8-10` — '붙잡지 않으면 나중에 볼 수 있겠지 하고 닫은 뒤 키를 잃고 다시 발급하게 된다 — 그게 폐기되지 않은 유령 키가 쌓이는 경로다' |
| **픽스처의 키는 명백한 더미다** | 접두어 `sk_test_`(운영 `sk_live_` 가 아니다) · last4 `0001`/`0002` · 발급 평문에 `DUMMY` 박음(`secret.ts:16-18,46-49`) — '진짜처럼 보이는 문자열은 실수로 어딘가에 붙여넣어졌을 때 진짜 키로 오인된다' |

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-069-SEC-01 | 화면 안내문 | 카드 위 muted 문구. 1회 노출 사실을 미리 알린다 |
| FS-069-SEC-02 | API Key 카드 | 제목 + 우상단 발급 버튼 + (읽기전용 안내) + 표/빈상태/스켈레톤 + 건수 |
| FS-069-SEC-03 | 키 목록 표 | 이름·키·스코프·상태·마지막 사용·생성·(관리). 검색·필터·정렬·페이지네이션·행 선택 없음 |
| FS-069-SEC-04 | 조회 실패 배너(비표시 기본) | 화면 전체를 대체 |
| FS-069-SEC-05 | 발급 모달(비표시 기본) | 이름 + 스코프 폼. 4경로 dirty 가드 |
| FS-069-SEC-06 | **1회 노출 모달**(비표시 기본) | 평문 표시 + 복사 + 닫기 가드 |
| FS-069-SEC-07 | 폐기 확인 다이얼로그(비표시 기본) | `intent="delete"` |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-069-EL-001 | FS-069-SEC-01 | 화면 안내문 | 텍스트 | `<p>` '외부 시스템이 이 사이트의 API를 호출할 때 쓰는 키입니다. 키는 발급 직후 한 번만 전체를 볼 수 있고, 이후에는 마지막 4자리만 표시됩니다.'(`ApiKeysPage.tsx:221-224`) | — | **in-content `<h1>` 이 없다** — 제목은 AppHeader 가 nav 잎 라벨('API Key 관리')로 그린다(IA-02 pass 근거). **1회 노출을 발급 전에 미리 알린다** |
| FS-069-EL-002 | FS-069-SEC-02 | 카드 제목 | 텍스트 | `CardTitle action={issueButton}` 'API Key'(`ApiKeysCard.tsx:64`) | — | `action` 슬롯이 우상단 발급 버튼을 받는다(IA-04 의 'list 템플릿 우상단 action') |
| FS-069-EL-003 | FS-069-SEC-02 | '새 키 발급' 버튼 | 버튼 | `primary` · `size="sm"`. 클릭 시 `setCreateError(null)` + `setCreating(true)`(`ApiKeysPage.tsx:206-217`) | — | **`canCreate` 가 false 면 `null` 이다** — 렌더 자체를 하지 않는다(EXC-03). 빈 상태(EL-012)의 CTA 로도 **같은 노드가 재사용**된다(`ApiKeysCard.tsx:77`) |
| FS-069-EL-004 | FS-069-SEC-03 | 키 목록 표 | 표 | `<table style={tableStyle}>`(`ApiKeyTable.tsx:57`). 컬럼 6 + 조건부 1: 이름·키·스코프·상태·마지막 사용·생성 + (관리). **검색·필터·정렬·페이지네이션·행 선택·행 클릭이 하나도 없다** | O | 정렬은 서버(어댑터)가 한다 — `sorted()`(`data-source.ts:68-70`)가 `createdAt` **내림차순**('최신 발급이 위로 — 방금 만든 키를 찾으려고 스크롤하지 않게'). 화면에 정렬 UI 없음. ⚠ `aria-busy` 가 표에 없다(스켈레톤이 표를 대체하므로 — EL-011) |
| FS-069-EL-004.1 | FS-069-SEC-03 | 이름 셀 | 텍스트 | `key.name`. `nameCellStyle`(label 굵기) | O | **키를 보여줄 수 없으니 이것이 유일한 식별자다**(`types.ts:41`). truncate 없음(§7 #12) |
| FS-069-EL-004.2 | FS-069-SEC-03 | 키 셀 | 텍스트 | `maskSecret(key.preview)` → `sk_test_••••0001`(`ApiKeyTable.tsx:93`). `tabular-nums` + `nowrap` | O | **가린 표시가 아니라 우리가 아는 전부다**(`secret.ts:31`). `MASK_GLYPH = '••••'` 는 **자리수를 암시하지 않는 고정 길이**(`secret.ts:20-21` '길이도 정보다'). 회귀 테스트가 역함수 부재를 못박는다(`secret.test.ts:24-32`) |
| FS-069-EL-004.3 | FS-069-SEC-03 | 스코프 셀 | 텍스트 | `key.scopes.map(scopeLabel).join(' · ')` → '조회 · 쓰기'(`ApiKeyTable.tsx:96`). `nowrap` | O | `scopeLabel`(`types.ts:32-34`)이 못 찾으면 코드를 그대로 돌려준다 |
| FS-069-EL-004.4 | FS-069-SEC-03 | 상태 배지 | 배지 | `StatusBadge` — `revoked` 면 tone=`neutral` 라벨 '폐기됨', 아니면 tone=`success` 라벨 '활성'(`ApiKeyTable.tsx:100-103`) | O | 상태 2개 고정(`types.ts:37`) |
| FS-069-EL-004.5 | FS-069-SEC-03 | 마지막 사용 셀 | 텍스트 | `lastUsedAt === null` 이면 **`<span style={neverUsedStyle}>한 번도 사용되지 않음</span>`**(warning 색), 아니면 `formatRelativeOrDate(lastUsedAt)`(`ApiKeyTable.tsx:106-112`) | O | **'한 번도 안 씀'을 눈에 띄게 남긴다 — 폐기 후보를 찾는 유일한 단서다**(`ApiKeyTable.tsx:4` · `types.ts:49`). 색이 유일한 인코딩이 아니다(문구가 다르다) |
| FS-069-EL-004.6 | FS-069-SEC-03 | 생성 셀 | 텍스트 | `formatDateOnly(key.createdAt)` + ' · ' + `key.createdBy`(`ApiKeyTable.tsx:115`) | O | `formatDateOnly`(`diff.ts:50-54`)가 깨진 ISO 면 원본을 돌려준다. `createdBy` 는 **하드코딩 `'김운영'`**(`data-source.ts:22`) — 서버가 세션에서 찍어야 한다(§7 #6) |
| FS-069-EL-004.7 | FS-069-SEC-03 | '관리' 열 | 표시 | **`canRemove` 일 때만 렌더**되는 `<th>`/`<td>`(`ApiKeyTable.tsx:78-82,118-135`) | — | 비표시 기본. **열 자체가 사라진다** — 빈 열을 남기지 않는다 |
| FS-069-EL-004.8 | FS-069-SEC-03 | '폐기' 버튼 | 버튼 | `danger` · `size="sm"`. **`!revoked` 일 때만 렌더**(`ApiKeyTable.tsx:121`). `disabled={revokingId !== null}` · `aria-busy={revokingId === key.id}`. 클릭 시 `onRevoke(key)` → `setRevoking(key)`(`ApiKeysPage.tsx:233-236`) | — | **이미 폐기된 키에는 비활성 버튼 대신 아무것도 두지 않는다**(`:120` '할 일이 없다'). ⚠ **폐기 중에는 모든 행의 버튼이 잠긴다**(`revokingId !== null`) — 진행 중인 행만이 아니다(§7 #13). 접근 이름이 **'폐기' 뿐이라 어느 키인지 구분되지 않는다**(§7 #4) |
| FS-069-EL-005 | FS-069-SEC-02 | 건수 텍스트 | 텍스트 | `<p style={countStyle}>전체 {keys?.length ?? 0}건</p>`(`ApiKeysCard.tsx:87`) | — | **표가 있을 때만 렌더**된다(빈 상태·로딩에는 없다). ⚠ `formatNumber` 를 거치지 않은 raw `length`(§7 #14) |
| FS-069-EL-006 | FS-069-SEC-02 | 읽기 전용 안내 | 배너 | **`!canCreate && !canRemove` 일 때만** info `Alert`: '조회 권한만 있습니다. 키를 발급하거나 폐기하려면 시스템 설정 등록·삭제 권한이 필요합니다.'(`ApiKeysPage.tsx:25-26,230`) | — | 비표시 기본. ⚠ **두 권한이 모두 없을 때만 뜬다** — 하나만 없으면(예: 발급 가능·폐기 불가) **안내가 없다**(§7 #5) |
| FS-069-EL-007 | FS-069-SEC-05 | 발급 모달 | 모달 | `creating` 이면 `CreateApiKeyModal`(`ApiKeysPage.tsx:239-247`). DS `Modal title="API Key 발급"` + `initialFocusRef={nameRef}` + `onSubmit` | — | 비표시. **`describedBy` 를 주지 않는다** — 폼 모달이라 본문이 곧 폼이다(§7 #15) |
| FS-069-EL-007.1 | FS-069-SEC-05 | 1회 노출 사전 안내 | 배너 | 모달 안 info `Alert`: '발급된 키는 발급 직후 한 번만 전체를 볼 수 있습니다. 이후에는 마지막 4자리만 표시되며, 다시 확인할 수 없습니다.'(`CreateApiKeyModal.tsx:203-206`) | — | 비표시. **발급 전에 한 번 더 알린다**(EL-001 에 이어 두 번째) |
| FS-069-EL-007.2 | FS-069-SEC-05 | 키 이름 입력 | 입력 | `FormField htmlFor="api-key-name"` 라벨 '키 이름', **required**, 힌트 '어디에 쓰는 키인지 알아볼 수 있게 적으세요. 키 값은 나중에 볼 수 없습니다.', 카운터 `N/40`, `maxLength=40`(`API_KEY_NAME_MAX`), placeholder '예: 홈페이지 상품 연동'. 자식이 **네이티브 `<input>`** 이라 `aria-required` 가 주입된다(`FormField.tsx:50-56`). `aria-invalid`+`aria-describedby` 짝 배선(`:224-225`) | — | `ref` 를 RHF `register` 와 `nameRef` 에 **둘 다 연결**한다(`:227-230`) — 포커스 제어용 |
| FS-069-EL-007.3 | FS-069-SEC-05 | 스코프 체크박스 그룹 | 입력 | `<fieldset>` + `<legend>스코프</legend>` + `Checkbox` 2개(`CreateApiKeyModal.tsx:234-257`). 라벨 '조회'/'쓰기' + 설명 '목록·상세 조회 (GET)'/'생성·수정·삭제 (POST/PUT/DELETE)'(`types.ts:27-30`). 기본값 `['read']`(`:93`) | — | **최소 권한으로 발급하도록 조회/쓰기를 나눈다**(`types.ts:16`). 토글 시 정의 순서로 정규화(`:137-140`) |
| FS-069-EL-007.4 | FS-069-SEC-05 | 스코프 그룹 오류 | 텍스트 | `errors.scopes?.message` 가 있으면 `<p role="alert">` — '스코프를 하나 이상 선택하세요.'(`:252-256` · `validation.ts:17-24`) | — | 비표시. **id 가 없다** — 어느 그룹의 오류인지 프로그램적으로 연결되지 않는다(`role="alert"` 로 announce 만). 언어 화면(FS-068-EL-006)이 고아 id 를 만든 것과 달리 **여기는 id 자체를 만들지 않는다** — 결과는 같다(§7 #3) |
| FS-069-EL-007.5 | FS-069-SEC-05 | 이름 중복 검사 | 텍스트 | `onValid` 에서 `duplicateNameError(values.name, existingNames)`(`:149`) — 대소문자·앞뒤공백 무시 비교(`validation.ts:33-38`). 중복이면 `setError('name', { type: 'duplicate', message })` + `nameRef.current?.focus()` + **서버 미호출**(`:150-154`) | O | 비표시 규칙. **스키마 밖에 있는 이유**: 기존 목록이 있어야 판정할 수 있다(zod 는 값 하나만 본다 — `validation.ts:30-31`). '이름은 키를 알아보는 유일한 단서라 중복은 실질적 사고다'. ⚠ **클라이언트 목록 기준이라 경합에 취약**(§7 #9) |
| FS-069-EL-007.6 | FS-069-SEC-05 | 발급 버튼 | 버튼 | `primary`. 라벨 '발급 중…'/'발급'. `disabled={busy}` · `aria-busy={busy}`. 클릭 시 `handleSubmit(onValid)()`(`:189-197`) | O | `type="submit"` 이 아니라 `onClick` — Modal 의 `onSubmit` 도 같은 핸들러를 부른다(`:183`) |
| FS-069-EL-007.7 | FS-069-SEC-05 | 취소 버튼 | 버튼 | `secondary`. `onClick={requestClose}`(`:186`) — **4경로가 이 하나를 지난다** | — | `disabled` 가 없다 — `requestClose` 가 `busy` 를 자체 검사(`:162`) |
| FS-069-EL-007.8 | FS-069-SEC-05 | 발급 실패 배너 | 배너 | 모달 안 danger `Alert`(`:201`) — '키를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`ApiKeysPage.tsx:122`) | O | 비표시. **모달을 닫지 않는다** — '입력을 지키고, 재클릭이 곧 재시도다'(`:121`). **토스트가 아닌 이유**: '모달 뒤에 뜬 토스트는 보이지 않는다'(`CreateApiKeyModal.tsx:7-8`) |
| FS-069-EL-007.9 | FS-069-SEC-05 | **4경로 dirty 가드** | 모달 | `requestClose`(`:161-168`): ① `busy` 면 **아무것도 하지 않는다**(발급 중에는 닫지 않는다 — '취소는 확인 다이얼로그가 아니라 요청 abort 다') ② `!isDirty` 면 즉시 `onClose()` ③ dirty 면 `setConfirmingDiscard(true)`. **딤·Esc·×·취소 4경로가 이 하나를 지난다**(`:160` · Modal 이 넷을 `onClose` 하나로 모은다) | — | 비표시 규칙(FEEDBACK-06). `CreateApiKeyModal.tsx:3-5` 가 이 설계를 밝힌다: '취소 버튼도 같은 핸들러를 부르면 네 경로가 한 판정을 공유한다 — 경로마다 다른 동작이 생길 자리가 없다' |
| FS-069-EL-007.10 | FS-069-SEC-05 | 발급 discard 확인 | 모달 | `confirmingDiscard` 면 `ConfirmDialog intent="discard"` 제목 '저장하지 않은 변경 사항이 있습니다' 문구 '입력한 내용이 사라집니다. 발급을 그만둘까요?'(`:261-276`). `suppressCancelToast` | — | 비표시. 확인 → `onClose()`. 취소 → 모달 유지 |
| FS-069-EL-007.11 | FS-069-SEC-05 | 발급 중 포커스 복귀 | 텍스트 | `useEffect(() => { if (!busy) nameRef.current?.focus(); }, [busy])`(`:171-173`) | — | 비표시 규칙. '발급 중 포커스가 잠긴 버튼에 남지 않게 한다 (A11Y-04 취지)'. ⚠ **실패 후에도 이름 입력으로 포커스가 간다** — 실패 배너를 읽기 전에 포커스가 움직인다(§7 #16) |
| FS-069-EL-008 | FS-069-SEC-06 | **1회 노출 모달** | 모달 | `issued !== null` 이면 `RevealKeyModal`(`ApiKeysPage.tsx:249-255`). DS `Modal title="API Key가 발급되었습니다"` + `describedBy={messageId}`(`RevealKeyModal.tsx:123-125`) | — | 비표시. **평문이 사는 유일한 자리.** `RevealKeyModal.tsx:3-11` 이 계약을 선언: '이 모달이 닫히면 평문은 이 세상에서 사라진다 … 그래서 다시 보기 는 기능이 아니라 **불가능**이다' |
| FS-069-EL-008.1 | FS-069-SEC-06 | 1회 노출 경고 | 배너 | 모달 안 **danger** `Alert`: '이 키는 지금 이 화면에서만 볼 수 있습니다. 창을 닫으면 다시 확인할 수 없습니다.'(`:141-143`) | — | 비표시. info 가 아니라 **danger** — 되돌릴 수 없는 순간이다 |
| FS-069-EL-008.2 | FS-069-SEC-06 | 안내 문구 | 텍스트 | `<p id={messageId}>` '‘{keyName}’ 키가 발급되었습니다. 아래 값을 복사해 안전한 곳에 보관하세요.'(`:145-147`) | — | `useId` 로 만든 id 가 Modal 의 `aria-describedby` 로 연결된다 — open 시 title 과 함께 읽힌다(A11Y-02) |
| FS-069-EL-008.3 | FS-069-SEC-06 | 평문 키 표시 | 텍스트 | `<code style={keyTextStyle}>{plaintext}</code>`(`:151`). `tabular-nums` · `overflowWrap: 'anywhere'` | — | **선택 가능한 텍스트로 둔다 — 클립보드 API 가 없는 환경에서도 직접 복사할 수 있다**(`:150`). ⚠ **mono 토큰이 없다**(`:44-48`) — '시크릿처럼 글자를 눈으로 대조해야 하는 값은 고정폭이라야 0/O·1/l 이 구분되는데 tokens.json 에 sans 계열밖에 없다'. **하드코딩 `monospace` 로 우회하지 않는다**(TOKEN-01 위반이 되고 drift 의 시작이기 때문) — 토큰을 기다린다(§7 #7) |
| FS-069-EL-008.4 | FS-069-SEC-06 | 보관 안내 | 텍스트 | `<p style={hintStyle}>` '키는 비밀번호와 같습니다. 저장소·메신저·이슈 트래커에 붙여넣지 말고 시크릿 관리 도구에 보관하세요. 노출이 의심되면 즉시 폐기하고 새로 발급하세요.'(`:154-157`) | — | 비표시 아님(항상). **복구 경로(폐기 후 재발급)까지 안내한다** |
| FS-069-EL-008.5 | FS-069-SEC-06 | '키 복사' 버튼 | 버튼 | `secondary`. `copyToClipboard(plaintext)`(`:99-110` → `secret.ts:62-70`). 성공 시 `setCopied(true)` + 토스트 '키를 클립보드에 복사했습니다.' / 실패 시 **error 토스트** '클립보드에 복사하지 못했습니다. 키를 직접 선택해 복사해 주세요.' | — | **조용히 실패하지 않는다**(`:107` · `secret.ts:57-60`). `navigator.clipboard` 는 보안 컨텍스트(https/localhost)에서만 존재 — 없으면 `false` 를 돌려준다 |
| FS-069-EL-008.6 | FS-069-SEC-06 | 복사 완료 배너 | 배너 | `copied` 면 success `Alert`: '복사했습니다. 안전한 곳에 보관했는지 확인하세요.'(`:159`) | — | 비표시 기본 |
| FS-069-EL-008.7 | FS-069-SEC-06 | '완료' 버튼 | 버튼 | `primary`. `onClick={requestClose}`(`:134`) | — | **'닫기' 라 부르지 않는다** — '헤더의 ×(`aria-label='닫기'`)와 접근 가능한 이름이 겹쳐 스크린리더에서 같은 이름의 버튼이 둘이 된다 (A11Y-15)'(`:132-133`) |
| FS-069-EL-008.8 | FS-069-SEC-06 | **복사 전 닫기 가드** | 텍스트 | `requestClose`(`:113-119`): `copied` 면 즉시 `onClose()`, 아니면 `setConfirmingClose(true)`. **딤·Esc·×·완료 4경로가 이 하나를 지난다** | — | 비표시 규칙. 테스트가 4경로 중 2경로(완료·×)를 못박는다(`RevealKeyModal.test.tsx:58-80`) |
| FS-069-EL-008.9 | FS-069-SEC-06 | 복사 전 닫기 확인 | 모달 | `confirmingClose` 면 `ConfirmDialog intent="discard"` 제목 '키를 복사하지 않았습니다' 문구 '아직 키를 복사하지 않았습니다. 이 창을 닫으면 키를 다시 볼 수 없고, 필요하면 새로 발급해야 합니다. 닫을까요?'(`:80-81,163-182`) | — | 비표시. **`confirmLabel="복사하지 않고 닫기"` · `cancelLabel="키 보기"`** — '결과를 말하는 라벨 — 이 버튼이 무엇을 잃게 하는지 버튼 스스로 밝힌다'(`:168`). `suppressCancelToast` — ''취소' 는 작업 취소가 아니라 '키를 계속 본다' 는 뜻이다'(`:179`) |
| FS-069-EL-008.10 | FS-069-SEC-06 | 평문 폐기 | 텍스트 | `dismissIssued` → `setIssued(null)`(`ApiKeysPage.tsx:140-142`) | — | 비표시 규칙. '**이 시점 이후 복구 경로는 없다**'(`:139`) |
| FS-069-EL-009 | FS-069-SEC-02 | 발급 실행 규칙 | 텍스트 | `submitCreate(draft)`(`ApiKeysPage.tsx:112-147`): ① `createLock.acquire()` 가 false 면 중단(EXC-08 — '두 번 발급되지 않는다') ② `setCreateError(null)` ③ 새 `AbortController` ④ **멱등키를 정한다** — `const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID()`(`:122`) 후 `:123` 로 고정 ⑤ `create.mutate({ draft, idempotencyKey, signal })`(`:125-126`) | O | 비표시 규칙. ✔ **이번 기준에서 ④ 가 생겼다**(`712c30b`). **멱등키의 수명은 제출 시도 단위다**: **성공하면 버리고**(`onSuccess` `:130` '이 발급은 끝났다 — 다음 발급은 새 거래다') **실패에는 남겨** 재클릭이 같은 발급이 되게 하며(`:121`) **모달을 접으면 리셋**한다(`closeCreate` `:156`). 근거 `:88-95` 가 유령 키 시나리오를 기술하고 `members/components/PointsCard` 선례를 인용한다. **호출부가 키를 만드는 이유**(`queries.ts:25-29`): '`mutationFn` 안에서 만들면 재시도마다 새 키가 나와 보호가 사라진다'. **어댑터가 최초 응답을 재생한다**(`data-source.ts:91,116-117`) — 기록은 **성공한 뒤에만**(`:139`, 이유 `:88-89`) |
| FS-069-EL-009.1 | FS-069-SEC-02 | 발급 성공 처리 | 텍스트 | `createLock.release()` → `controller.signal.aborted` 면 중단 → `setCreating(false)`(폼 모달 닫기) → **`setIssued(result)`**(노출 모달 열기) → 토스트 'API Key를 발급했습니다.'(`:110-117`) | O | 비표시. '폼 모달을 닫고 노출 모달을 연다 — 평문은 여기서만 산다'(`:113`) |
| FS-069-EL-010 | FS-069-SEC-02 | 발급 모달 닫기 | 텍스트 | `closeCreate`(`:130-137`) — abort · `create.reset()` · `createLock.release()` · `createError`·`creating` 비움 | — | 비표시 규칙 |
| FS-069-EL-011 | FS-069-SEC-02 | 첫 로딩 스켈레톤 | 스켈레톤 | `loading = isFetching && keys === undefined`(`:93`) 면 `tds-ui-skeleton` **3행 고정**(`SKELETON_ROWS = 3`) + `aria-busy="true"`(`ApiKeysCard.tsx:68-74`) | — | 비표시. **재조회에서는 뜨지 않는다**(STATE-01 pass). 행 수 근거가 코드에 있다(`:33` '픽스처 규모에 맞춘다 — 로딩 모양이 실제 목록과 크게 다르지 않게') — 다른 3화면의 `[0,1,2,3]` 과 달리 **의도가 적혀 있다** |
| FS-069-EL-012 | FS-069-SEC-02 | 빈 상태 | 빈상태 | `!loading && isEmpty` 면 **DS `Empty`** `label="API Key"` `createVerb="발급"` `action={issueButton}`(`ApiKeysCard.tsx:77`) → '발급된 API Key가 없습니다' + CTA | — | 비표시. **`Empty` 가 조사를 런타임 판정한다**(`Empty.tsx:7,68` `subjectParticle`) — ERP-13 pass 근거. '검색도 필터도 없는 화면이라 생성 CTA 하나만 준다'(`:76`) — 3분기(검색/필터/진짜 0건)가 **불필요하다** |
| FS-069-EL-013 | FS-069-SEC-04 | 조회 실패 배너 | 배너 | `error !== null` 이면 **early return** 으로 화면 전체를 대체(`ApiKeysPage.tsx:186-204`): danger `Alert` 'API Key 목록을 불러오지 못했습니다.' + '다시 시도'(`refetch`) | O | 비표시. 토스트로 알리지 않는다(STATE-02). **안내문(EL-001)까지 사라진다.** ⚠ **status 를 구분하지 않는다**(§7 #11) |
| FS-069-EL-014 | FS-069-SEC-07 | 폐기 확인 다이얼로그 | 모달 | `revoking !== null` 이면 `ConfirmDialog intent="delete"` 제목 'API Key 폐기' `confirmLabel="폐기"` `busy={revoke.isPending}` `error={revokeError}`(`:257-268`) | — | 비표시. **`intent="delete"` → DS 가 danger tone·아이콘·라벨을 결정**(`ConfirmDialog.tsx:6`) |
| FS-069-EL-014.1 | FS-069-SEC-07 | 폐기 확인 문구 | 텍스트 | `revokeMessage(key)`(`:53-55`): '‘{name}’ 키를 폐기하면 이 키를 쓰는 연동이 즉시 401을 받습니다. 폐기는 되돌릴 수 없고, 같은 키를 다시 발급할 수 없습니다. 폐기할까요?' | — | 비표시. **결과 3가지를 말한다**: 연동이 깨진다 · 되돌릴 수 없다 · 같은 키를 못 만든다(FEEDBACK-05) |
| FS-069-EL-014.2 | FS-069-SEC-07 | 폐기 실행 | 텍스트 | `confirmRevoke`(`:146-172`): `revokeLock.acquire()` → `revoke.mutate({ id, signal })`. 성공 시 `setRevoking(null)` + 토스트 '‘{name}’ 키를 폐기했습니다.' | O | 비표시. **성공 토스트가 `target.name` 을 클로저로 잡는다**(`:162`) — `revoking` 이 이미 null 이어도 이름을 안다 |
| FS-069-EL-014.3 | FS-069-SEC-07 | 폐기 실패 배너 | 배너 | `setRevokeError('키를 폐기하지 못했습니다. 잠시 후 다시 시도해 주세요.')`(`:168`) → 다이얼로그 안 danger 배너 | O | 비표시. **다이얼로그를 열어 둔 채 알린다 — 재클릭이 재시도다**(`:167` FEEDBACK-02) |
| FS-069-EL-014.4 | FS-069-SEC-07 | 폐기 취소 | 버튼 | `cancelRevoke`(`:174-181`) — abort · `revoke.reset()` · `revokeLock.release()` · `revokeError`·`revoking` 비움 | — | 비표시. **busy 중에도 취소는 살아 있다**(`ConfirmDialog.tsx:144`) — abort 경로 |
| FS-069-EL-015 | FS-069-SEC-02 | 언마운트 abort | 텍스트 | `useEffect` cleanup 이 **두 컨트롤러를 모두** abort(`:83-89`) | — | 비표시 규칙 |
| FS-069-EL-015.1 | FS-069-SEC-02 | abort 는 실패가 아니다 | 텍스트 | 발급 `if (isAbort(cause) \|\| controller.signal.aborted) return;`(`:120`) · 폐기 `:166`. `onSuccess` 도 `aborted` 면 중단(`:112,160`) | — | 비표시 규칙(EXC-09) |
| FS-069-EL-016 | FS-069-SEC-02 | 동기 제출 잠금 ×2 | 텍스트 | `createLock` · `revokeLock` **각각 별도**(`:64-65` `useSubmitLock()` 2회) | — | 비표시 규칙. **발급과 폐기가 서로를 막지 않는다** — 잠금이 하나면 발급 중 폐기가 막힌다 |
| FS-069-EL-017 | FS-069-SEC-02 | 기존 이름 목록 파생 | 텍스트 | `existingNames = useMemo(() => (keys ?? []).map((key) => key.name), [keys])`(`:95`) | — | 비표시. EL-007.5 의 입력. **폐기된 키의 이름도 포함**된다 — 폐기된 키와 같은 이름으로 새 키를 만들 수 없다(§7 #17) |
| FS-069-EL-018 | FS-069-SEC-02 | 폐기 진행 표시 | 텍스트 | `revokingId = revoke.isPending ? (revoking?.id ?? null) : null`(`:231`) → `ApiKeyTable` 의 `disabled`/`aria-busy` 입력 | — | 비표시 규칙 |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-069-EL-001 | N/A — 정적 문구 | 로딩 중에도 표시(카드 밖) | **조회 실패 시 EL-013 이 early return 이라 함께 사라진다** | N/A — 입력 없음 | 권한과 무관 | N/A — 정적 | 고정 문구 |
| FS-069-EL-002 | 빈 상태에서도 표시(카드는 남는다) | 로딩 중에도 표시 | 조회 실패 시 사라진다 | N/A — 입력 없음 | 권한과 무관 | N/A — 정적 | 고정 문구 |
| FS-069-EL-003 | **빈 상태의 CTA 로 재사용된다**(`ApiKeysCard.tsx:77`) | 로딩 중에도 표시·클릭 가능 | 조회 실패 시 사라진다 | N/A — 입력 없음 | **`canCreate` 가 false 면 `null`**(렌더 안 함 — EXC-03) | 권한 스토어 변경 시 재렌더(강등 reconcile) | 단일 버튼 |
| FS-069-EL-004 | 0건이면 EL-012 로 대체 | EL-011 스켈레톤으로 대체 | EL-013 으로 화면 전체 대체 | N/A — 표 자체 입력 없음 | `canRemove` 에 따라 열 수가 6/7 | **조회 시점 스냅샷** — 다른 관리자의 발급·폐기는 재조회 시점에만 보인다. **낙관적 동시성 토큰이 없다**(§7 #9) | **상한 없음 — 페이지네이션이 없다.** 키는 운영자가 만드는 만큼 는다(§7 #2) |
| FS-069-EL-004.1 | 행 없으면 없음 | 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | 권한과 무관 | 조회 시점 값 | **truncate 없음** — 긴 이름이 열을 넓힌다(§7 #12). `maxLength=40` 이 상한이라 피해가 제한적 |
| FS-069-EL-004.2 | 행 없으면 없음 | 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | 권한과 무관 — **읽기 권한만 있어도 마스킹은 보인다**(가릴 값이 아니라 가진 전부다) | 키는 발급 후 불변 | `nowrap` + `tabular-nums`. 길이 고정 |
| FS-069-EL-004.3 | 스코프가 빈 배열이면 빈 칸 — **스키마가 0건을 막아 실현되지 않는다**(`validation.ts:17-24`) | 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | 권한과 무관 | 스코프는 발급 후 불변(수정 경로 없음 — §1 범위 밖) | 최대 2개 `·` 조인. `nowrap` |
| FS-069-EL-004.4 | 행 없으면 없음 | 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | 권한과 무관 | **폐기 성공 후 목록 invalidate 로 갱신**(`queries.ts:47-49`) | 2개 상태 고정 |
| FS-069-EL-004.5 | `lastUsedAt === null` 이면 '한 번도 사용되지 않음'(warning 색) | 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | 권한과 무관 | **서버가 갱신하는 값** — 이 화면은 쓰지 않는다. 재조회 시점에만 반영 | `formatRelativeOrDate` 가 오래된 값은 절대 날짜로 |
| FS-069-EL-004.6 | 행 없으면 없음 | 스켈레톤 | 조회 실패 시 미표시 | N/A — 표시 전용 | 권한과 무관 | 생성 시각·주체는 불변 | `formatDateOnly` 가 깨진 ISO 면 원본을 보인다 |
| FS-069-EL-004.7 | 행 없으면 표 자체가 없다 | 스켈레톤(열 개념 없음) | 조회 실패 시 미표시 | N/A — 컨테이너 | **`canRemove` 가 false 면 열 자체가 사라진다** | 권한 스토어 변경 시 열이 나타났다 사라진다 | 조건부 1열 |
| FS-069-EL-004.8 | 행 없으면 없음 | 스켈레톤 | 폐기 실패는 EL-014.3(다이얼로그 안) | N/A — 입력 없음 | **`canRemove` 가 false 면 렌더 안 함.** 이미 폐기된 키에도 없다 | ⚠ **폐기 중 모든 행의 버튼이 잠긴다**(`revokingId !== null` — §7 #13). **다른 관리자가 먼저 폐기하면 재조회 전까지 버튼이 남아 있다** — 누르면 서버가 처리해야 한다(§7 #10) | 행마다 1개. 접근 이름이 전부 '폐기'로 같다(§7 #4) |
| FS-069-EL-005 | **빈 상태에서는 렌더되지 않는다**(표가 있을 때만) | 로딩 중 미표시 | 조회 실패 시 미표시 | N/A — 표시 전용 | 권한과 무관 | 재조회 시점 값 | ⚠ **raw `length`** — `formatNumber` 미경유(§7 #14). 천 단위 구분 없음 |
| FS-069-EL-006 | 빈 상태에서도 표시 | 로딩 중에도 표시 | 조회 실패 시 사라진다 | N/A — 표시 전용 | **이것이 권한없음 표현.** ⚠ **두 권한이 모두 없을 때만 뜬다**(§7 #5) | 권한 스토어 변경 시 재렌더 | 1건 |
| FS-069-EL-007 | N/A — 열려야 성립 | 모달 자체에 로딩이 없다(폼) | 발급 실패는 EL-007.8(모달 안) | 스키마가 제출을 게이트 | **`canCreate` 없으면 여는 버튼이 없다** — 도달 불가 | 열려 있는 동안 목록이 재조회되면 `existingNames` 가 바뀐다(EL-017) | 1건 |
| FS-069-EL-007.1 | N/A — 항상 표시 | N/A | N/A — 표시 전용 | N/A | N/A | N/A — 정적 | 고정 문구 |
| FS-069-EL-007.2 | 초기값 `''`, placeholder 노출 | `disabled={busy}` | 발급 실패 시 **값 보존**(모달을 닫지 않는다) | 비면 '키 이름을 입력하세요.' · 40자 초과 '키 이름은 40자를 넘을 수 없습니다.'(**trim 후 판정**) · 중복이면 '이미 같은 이름의 키가 있습니다.'(EL-007.5). `maxLength=40` 이 입력을 먼저 자른다 | 도달 불가 | **중복 판정이 조회 시점 목록 기준**(§7 #9) | 40자 상한 + 카운터 |
| FS-069-EL-007.3 | 초기값 `['read']` | `disabled={busy}` | 발급 실패 시 값 보존 | 0건이면 EL-007.4 오류. `shouldValidate: true` 라 토글 즉시 판정 | 도달 불가 | N/A — 로컬 상태 | 2개 고정 |
| FS-069-EL-007.4 | **스코프 0건이면 이 오류가 뜬다** | 로딩 없음 | N/A — 로컬 검증 | **이것이 그룹 유효성 표현.** '스코프를 하나 이상 선택하세요.' — '아무것도 못 하는 키를 만들면 왜 401 이 나지 로 돌아온다'(`validation.ts:16`) | 도달 불가 | N/A — 로컬 | 1건 |
| FS-069-EL-007.5 | `existingNames` 가 비면 중복이 없다 | N/A — 동기 판정 | N/A — 서버 미호출 | **이것이 중복 유효성.** 대소문자·공백 무시. 빈 이름이면 `null`(스키마가 먼저 잡는다) | 도달 불가 | ⚠ **경합에 취약** — 두 관리자가 동시에 같은 이름으로 발급하면 **둘 다 통과한다**(각자의 조회 시점 목록엔 상대가 없다). 서버가 막아야 한다(§7 #9) | 목록 크기에 비례한 선형 탐색 |
| FS-069-EL-007.6 | N/A — 항상 표시 | `busy` 면 '발급 중…' + `disabled` + `aria-busy` | 실패 시 EL-007.8, 버튼 재활성, **모달 유지** | 검증 실패면 `onValid` 가 안 불린다 | 도달 불가 | **동기 잠금(EL-016)이 연타의 2번째를 막는다** | 단건 |
| FS-069-EL-007.7 | N/A — 항상 표시 | **`disabled` 가 없다** — `requestClose` 가 `busy` 를 자체 검사해 아무것도 하지 않는다(`:162`) | N/A — 서버 호출 없음 | N/A | 도달 불가 | 발급 중에는 닫히지 않는다 | 단건 |
| FS-069-EL-007.8 | N/A — 오류가 있어야 성립 | 재발급 시 `setCreateError(null)`(`:103`) | **이것이 발급 실패 표현.** 문구 1종. abort 는 표시하지 않는다. **status 를 구분하지 않는다**(§7 #11) | 검증 실패는 여기 오지 않는다(필드로 간다) | 도달 불가 | 서버 409(이름 중복)도 이 문구로 뭉개진다(§7 #9) | 1건 |
| FS-069-EL-007.9 | `!isDirty` 면 즉시 닫힌다(pristine 통과) | **`busy` 면 아무것도 하지 않는다** — 발급 중 닫기가 막힌다 | N/A — 로컬 판정 | N/A — 입력 없음 | 도달 불가 | N/A — 로컬 | **4경로가 한 판정을 공유**(FEEDBACK-06) |
| FS-069-EL-007.10 | N/A — dirty 여야 성립 | `busy={false}` 고정 | N/A — 서버 호출 없음 | N/A | 도달 불가 | N/A | 1건 |
| FS-069-EL-007.11 | N/A — 규칙 | **`busy` 가 이 규칙의 입력** | ⚠ **실패 직후에도 포커스가 이름으로 간다** — 배너를 읽기 전에 움직인다(§7 #16) | N/A | 도달 불가 | N/A | 단건 |
| FS-069-EL-008 | N/A — 발급 성공이 있어야 성립 | N/A — 이미 도착한 값 | N/A — 서버 호출 없음(지역 state) | N/A — 표시 전용 | 도달 불가 | **평문은 캐시에 없어 재조회가 지우지 못한다** — 지역 state 라 안전하다 | 1건 |
| FS-069-EL-008.1 | N/A — 항상 표시 | N/A | N/A | N/A | 도달 불가 | N/A | 고정 문구 |
| FS-069-EL-008.2 | N/A — 항상 표시 | N/A | N/A | N/A | 도달 불가 | N/A | 이름이 길면 늘어난다 |
| FS-069-EL-008.3 | N/A — 평문이 있어야 성립 | N/A | N/A | N/A — 표시 전용 | 도달 불가 | N/A | `overflowWrap: 'anywhere'` 로 줄바꿈. ⚠ **mono 토큰 부재로 0/O 대조가 어렵다**(§7 #7) |
| FS-069-EL-008.4 | N/A — 항상 표시 | N/A | N/A | N/A | 도달 불가 | N/A | 고정 문구 |
| FS-069-EL-008.5 | N/A — 항상 표시 | **비활성이 없다** — 연타하면 여러 번 복사된다(무해) | **`navigator.clipboard` 부재·거부 시 error 토스트** + `copied` 는 false 유지 → 닫기 가드가 계속 붙잡는다 | N/A | 도달 불가 | N/A | 단건 |
| FS-069-EL-008.6 | N/A — 복사 성공이 있어야 성립 | N/A | 복사 실패 시 뜨지 않는다 | N/A | 도달 불가 | N/A | 1건 |
| FS-069-EL-008.7 | N/A — 항상 표시 | N/A | N/A | N/A | 도달 불가 | N/A | 단건 |
| FS-069-EL-008.8 | N/A — 규칙 | N/A — 로컬 판정 | N/A | N/A | 도달 불가 | N/A | **4경로가 한 판정을 공유.** ⚠ **수동 복사(텍스트 선택)는 `copied` 를 켜지 못한다** — 직접 복사한 사용자도 가드에 붙잡힌다(§7 #18) |
| FS-069-EL-008.9 | N/A — 미복사 상태여야 성립 | `busy={false}` 고정 | N/A — 서버 호출 없음 | N/A | 도달 불가 | N/A | 1건 |
| FS-069-EL-008.10 | N/A — 노출 모달이 있어야 성립 | N/A | N/A | N/A | 도달 불가 | **이 시점 이후 복구 경로가 없다** — 되돌릴 수 없다 | 단건 |
| FS-069-EL-009 | N/A — 규칙 | 잠금은 렌더와 무관하게 즉시 | 실패는 EL-007.8 | N/A — 검증은 상류에서 | 도달 불가 | **연타의 2번째가 멈춘다** | ⚠ **멱등키 없음 — 응답 유실 후 재시도가 키를 2개 만든다**(§7 #8) |
| FS-069-EL-009.1 | N/A — 성공이 있어야 성립 | N/A | N/A | N/A | 도달 불가 | **목록만 invalidate — 평문은 캐시에 넣지 않는다**(`queries.ts:31-34`) | 단건 |
| FS-069-EL-010 | N/A — 모달이 열려야 성립 | 진행 중 발급을 abort | abort 는 통지하지 않는다 | N/A | 도달 불가 | 서버 도달 여부는 미보장(§7 #19) | 단건 |
| FS-069-EL-011 | N/A — 도착 전 | **이것이 로딩 표현.** 3행 + `aria-busy` | 조회 실패 시 EL-013 으로 | N/A | 권한과 무관 | **재조회에서는 뜨지 않는다**(`keys !== undefined`) | 3행 고정(근거가 코드에 있다 — `ApiKeysCard.tsx:33`) |
| FS-069-EL-012 | **이것이 빈 상태 표현.** DS `Empty` + 발급 CTA | 로딩 중에는 스켈레톤이 이긴다(`!loading && isEmpty`) | 조회 실패 시 EL-013 으로 | N/A | **`canCreate` 없으면 `action` 이 null** — 문구만 남는다 | 재조회로 0건→N건이 되면 표로 바뀐다 | **3분기가 불필요하다** — 검색·필터가 없다(`ApiKeysCard.tsx:76`) |
| FS-069-EL-013 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 스켈레톤으로 | **이것이 조회 실패 표현.** 문구 1종 + '다시 시도'. **early return 이라 화면 전체를 대체**한다 | N/A | read 권한 부족은 여기 오지 않는다 — `RequirePermission` 이 403 화면(§4.1) | 재시도는 같은 조회를 재발행 | N/A |
| FS-069-EL-014 | N/A — 대상이 있어야 성립 | `busy={revoke.isPending}` → 확인 버튼 '처리 중…' + 잠김. **취소는 살아 있다** | 실패해도 **닫지 않는다** — EL-014.3 배너 | N/A — 입력 없음 | **`canRemove` 없으면 폐기 버튼이 없어 도달 불가** | 확인 중 다른 관리자가 먼저 폐기하면 확인 후 서버가 판정(§7 #10) | 1건 |
| FS-069-EL-014.1 | N/A — 대상이 있어야 성립 | N/A — 순수 조립 | N/A | N/A | 도달 불가 | 대상 키의 조회 시점 이름을 쓴다 | 이름이 길면 문구가 길어진다 |
| FS-069-EL-014.2 | N/A — 대상이 있어야 성립 | 동기 잠금 + `busy` | 실패는 EL-014.3 | N/A | 도달 불가 | **없는 id 를 폐기해도 성공한다**(유령 폐기 — §7 #10) | 단건 |
| FS-069-EL-014.3 | N/A — 오류가 있어야 성립 | 재시도 시 `setRevokeError(null)`(`:151`) | **이것이 폐기 실패 표현.** 문구 1종. **status 를 구분하지 않는다** | N/A | 서버 403 도 이 문구로 뭉개진다 | 재클릭이 재시도 | 1건 |
| FS-069-EL-014.4 | N/A — 다이얼로그가 떠야 성립 | 폐기 중에도 누를 수 있다(abort 경로) | abort 는 통지하지 않는다 | N/A | 도달 불가 | 서버 도달 여부는 미보장(§7 #19) | 단건 |
| FS-069-EL-015 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | abort 는 실패가 아니다 | N/A | N/A | **두 컨트롤러를 모두 abort** | 2건 |
| FS-069-EL-015.1 | N/A — 규칙 | N/A | **이것이 abort 판정 규칙**(EXC-09) | N/A | N/A | `signal.aborted` 를 양쪽에서 확인 | 2경로 |
| FS-069-EL-016 | N/A — 규칙 | 렌더와 무관하게 즉시 | 양쪽에서 `release` | N/A | N/A | **발급·폐기가 서로를 막지 않는다**(잠금 2개) | **멱등키 없음**(§7 #8) |
| FS-069-EL-017 | `keys` 가 `undefined`/빈 배열이면 `[]` | 도착 전에는 `[]` — **로딩 중 발급하면 중복 검사가 무력**(§7 #9) | 조회 실패 시 모달을 열 수 없다(화면이 대체된다) | EL-007.5 의 입력 | N/A | **조회 시점 스냅샷** | 목록 크기에 비례 |
| FS-069-EL-018 | N/A — 규칙 | `revoke.isPending` 이 입력 | N/A | N/A | N/A | N/A — 파생 | 단건 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 조회 실패는 화면을 대체하는 인라인 배너(EL-013), 발급·폐기 실패는 각 모달 안 배너(EL-007.8 · EL-014.3). **오프라인 감지·복귀 재조회가 앱 전역에 없다**(`navigator.onLine` grep 0건) — §7 #20 |
| 세션 만료 | 401 은 앱 전역 인터셉터(`shared/query/queryClient.ts`)가 받아 `/login?returnUrl=/settings/api-keys&reason=session_expired` 로 보낸다. **발급 모달의 입력은 그때 사라진다** — §7 #20. ⚠ **노출 모달이 떠 있는 중 세션이 만료되면 평문이 영영 사라진다**(§7 #21) |
| 요청 타임아웃 | 프론트 상한 없음(`AbortSignal.timeout` 앱 전역 0건). abort 는 언마운트·모달 닫기·확인 취소에서만 — §7 #20 |
| 중복 제출 | 발급·폐기 각각 `disabled` + **동기 잠금 `useSubmitLock` 2개**(EL-016) + ✔ **발급에 멱등키**(EL-009 ④ — `712c30b`). 동기 잠금이 **연타**를 막고 멱등키가 **네트워크 재시도**를 막는다 — 응답이 유실돼 재시도해도 **최초 응답이 재생돼**(`data-source.ts:116-117`) 키가 두 번 만들어지지 않는다(§7 #8 — 해소). ⚠ **폐기에는 멱등키가 없다**(`data-source.ts:148`) — 폐기는 멱등한 상태 전이라 중복 적용 자체가 무해하나 **`revokedAt` 을 조건 없이 덮어** 감사 시각이 훼손된다(§7 #10) |
| 실패 통지의 자리 | ① 조회 실패 = 화면 대체 배너 ② 발급 실패 = 발급 모달 안 배너('모달 뒤에 뜬 토스트는 보이지 않는다' — `CreateApiKeyModal.tsx:7-8`) ③ 폐기 실패 = 확인 다이얼로그 안 배너 ④ 발급·폐기 **성공** = 토스트 ⑤ 클립보드 실패 = **error 토스트**(모달 위) ⑥ abort = 아무것도 띄우지 않는다 |
| 낙관적 업데이트 | **이 화면에 없다.** 발급·폐기 모두 비관적(응답 후 invalidate) — 롤백 경로가 필요 없다 |
| 동시 조회 | `useApiKeysQuery` 가 `queryKey: ['settings','api-keys']` 로 1건만 유지. 전역 `staleTime` 30초 · `retry: false` · `refetchOnWindowFocus: false` 를 따른다(재정의 없음 — `queries.ts:15-20`) |
| 권한 없음 | **read** — `RequirePermission` 이 `<Outlet>` 을 감싸 403 화면(`AppShell.tsx:20`). 리소스는 `page:/settings/api-keys`(`route-resource.ts:32-35`). **write** — `useRouteWritePermissions()` 의 **`canCreate`·`canRemove` 두 갈래**(`:59`)가 발급 버튼(EL-003)·폐기 열(EL-004.7)을 각각 게이팅한다. **이 섹션에서 유일하게 `canUpdate` 가 아니라 create/remove 를 쓴다** — 수정 경로가 없기 때문(§1 범위 밖). 권한 스토어 변경 시 재렌더 → **강등 reconcile 이 별도 코드 없이 성립**(`RequirePermission.tsx:23-25`). 서버 403 은닉 정책은 BE-069 §7.7 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바깥에 `ErrorBoundary`(`AppShell.tsx:484`) — 사이드바가 남고 `RouteErrorScreen` |
| 프론트 검증은 보증이 아니다 | zod(`apiKeyDraftSchema`)·중복 검사는 UX 다. 서버가 다시 검증한다(BE-069 §7.2) — `data-source.ts:88` 심이 `422 → 이름 중복/스코프 없음` 을 명시 |
| **평문의 수명** | 발급 응답 → `ApiKeysPage` 지역 state(`:75`) → `RevealKeyModal` prop → 모달 닫기 시 소멸. **react-query 캐시·목록·전역 상태 어디에도 들어가지 않는다**(`queries.ts:6-8`). 회귀 테스트가 못박는다(`api-keys.test.ts:56` — 목록 응답 전체를 `JSON.stringify` 해도 평문이 없다) |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| FS-069-EL-004 / EL-005 / EL-011 / EL-012 / EL-013 / EL-017 | 키 목록 조회 | R | `readonly ApiKey[]`(**평문 없음**) | `fetchApiKeys(signal)` (`:74-78`) | `useApiKeysQuery`. 서버가 `createdAt` **내림차순** 정렬(`sorted()` — `:68-70`). **응답에 평문이 절대 실리지 않는다**(`:73`) |
| FS-069-EL-007.6 / EL-008 / EL-009 / EL-009.1 | 키 발급 | W | 요청 `{ name, scopes[] }` + **헤더 `Idempotency-Key`** · 응답 201 `{ key, plaintext }` | `createApiKey(draft, idempotencyKey, signal)` (`data-source.ts:107-141`) | `useCreateApiKey`. **평문은 이 응답에만 실린다**(`:94-97` — '서버가 키를 만들고 **해시만 저장**한 뒤 평문을 201 응답 1회에 실어 보낸다. 그 뒤로는 서버도 평문을 모른다 — 그래서 **다시 보여주기 엔드포인트는 존재할 수 없다**'). ✔ **심에 멱등 계약이 있다**(`:102-106`): `헤더: Idempotency-Key: <idempotencyKey> (UUID v4, 24h 보존) → 같은 키 + 같은 바디 = 최초 응답을 그대로 재생한다(유령 키 없음). 다른 바디면 409` · `422 → 이름 중복/스코프 없음`. ⚠ **이 심은 BE-069 §7.3 의 판정(409 + 유령 키 노출)과 반대 방향이다** — NFR-069 §5 #20 이 불일치를 A63 에 넘긴다. `onSuccess` 는 **목록만 invalidate**(`queries.ts:39-42`) |
| FS-069-EL-014.2 | 키 폐기 | W | `id` | `revokeApiKey(id, signal)` (`:122-129`) | `useRevokeApiKey`. **soft delete** — `status='revoked'` + `revokedAt` 기록(`:126-128`) |

> **현재 구현 상태 (A63 참고)**: 백엔드는 없다. **실제 키 발급이 없다** — `createDummyPlaintextKey`(`_shared/secret.ts:46-49`)가 만드는 평문은 `DUMMY` 가 박힌 시연용 문자열이고 **어떤 서버도 이 값을 알지 못한다**(호출해도 아무 일도 일어나지 않는다 — `data-source.ts:3-4`). 목록은 브라우저 안 mutable 배열(`let keys` — `:63`)이며 시드 3건(`SEED_KEYS` — `:25-60`)에 400ms 지연(`LATENCY_MS`)과 실패 스위치(`failIfRequested('api-keys', op)`)를 얹었다 — 실제 네트워크 0건. **픽스처에도 평문이 없다**(`types.ts:3-13`). 발급 주체는 하드코딩 `CURRENT_ADMIN = '김운영'`(`:22`). 새로고침하면 시드로 돌아간다. 연동 심 3건이 실재한다: `:72-73` `GET /api/settings/api-keys`(+ '응답에 평문은 **절대 실리지 않는다**') · `:86-88` `POST /api/settings/api-keys`(+ 요청·응답 201·422 명시) · `:121` `DELETE /api/settings/api-keys/:id (soft — status=revoked, revokedAt 기록)`. 아울러 `_shared/secret.ts:45` 가 `POST /api/settings/api-keys 가 평문을 **응답 1회에만** 싣는다 — 서버도 저장하지 않는다(해시만)` 을 못박는다. BE-069 §4 는 이 심들을 그대로 계약으로 옮긴 것이며 **발명한 엔드포인트가 없다.** 위 표는 백엔드 연결 후 의도된 동작이다. |

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `ApiKeysPage.tsx` · `types.ts` · `validation.ts` · `data-source.ts` · `queries.ts` · `api-keys.test.ts` · `components/{ApiKeysCard,ApiKeyTable,CreateApiKeyModal,RevealKeyModal}.tsx` · `components/RevealKeyModal.test.tsx` · `_shared/{secret,secret.test,queries,diff}`
- [x] 보이지 않는 요소(스켈레톤·빈 상태·조회 실패 배너·읽기전용 안내·3개 모달·4경로 가드 2벌·동기 잠금 2개·abort 규칙·중복 검사·평문 폐기·폐기 진행 표시)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다 — 어댑터를 거치지 않는 서버 호출이 **없다**
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-069 영역)
- [x] **in-content `<h1>` 이 없음을 grep 으로 확인**하고 EL-001 에 기록했다 — IA-02 판정 근거
- [x] **평문이 사는 자리를 코드로 추적**했다: 발급 응답 → `ApiKeysPage.tsx:75` 지역 state → `RevealKeyModal` prop → 소멸. **캐시에 넣지 않음을 `queries.ts:39-42` 로 확인**하고 §4.1 '평문의 수명' 에 고정했다
- [x] **이 화면만 `createRevisionedStore` 를 쓰지 않아 동시성 토큰이 없음**을 §1 경고와 §7 #9·#10 에 기록했다
- [x] §7 의 미결 항목이 BE-069 §7.9 · NFR-069 §5 와 일치한다

## 7. 미결 사항 (A11 / A01 / A63 / A40 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (시스템 설정 SCR 미작성) | A11 / A01 |
| 2 | **페이지네이션이 없다** — `keys` 전량을 렌더한다(`ApiKeyTable.tsx:87`). 키는 운영자가 만드는 만큼 늘고 상한이 없다. 다만 실무상 조직당 수~수십 건이라 **현재는 실질 위험이 낮다** — '초과 가능'이 확정되면 IA-04 를 다시 매긴다(quality-bar IA-04 P0) | A11 change_request (조건부) |
| 3 | **스코프 그룹 오류(EL-007.4)가 어느 컨트롤의 것인지 연결되지 않는다** — `<p role="alert">` 에 **id 조차 없어** 어떤 컨트롤도 `aria-describedby` 로 참조하지 못한다. `<fieldset>` 에 `aria-describedby` 를 물리는 것이 옳은 해법. 언어 화면(FS-068-EL-006)은 id 를 만들되 고아로 뒀다 — **두 화면이 같은 결함을 다른 방식으로 갖는다** | A11 change_request |
| 4 | **폐기 버튼(EL-004.8)의 접근 이름이 전부 '폐기'로 같다** — 행이 여럿이면 스크린리더 사용자가 **어느 키의 폐기 버튼인지 알 수 없다.** `aria-label={'<이름> 폐기'}` 가 필요하다(quality-bar A11Y-08 결) | A11 change_request |
| 5 | **읽기 전용 안내(EL-006)가 `!canCreate && !canRemove` 일 때만 뜬다** — 권한이 **하나만** 없으면(예: 발급 가능·폐기 불가) 아무 안내도 없이 폐기 열만 사라진다. 운영자는 왜 폐기할 수 없는지 모른다. 다른 3화면은 `canUpdate` 단일 축이라 이 문제가 없다 | A11 change_request |
| 6 | **발급 주체가 클라이언트 값이다** — `createdBy: CURRENT_ADMIN`(하드코딩 `'김운영'` — `data-source.ts:22`). **누가 이 키를 만들었는지 기록되지 않는다.** 심이 이미 선언한다(`:21` '발급 주체는 서버가 세션에서 읽는다 — 프론트가 보내는 값을 신뢰하면 안 된다') | **A63 (BE-069 §7.4)** |
| 7 | **mono 토큰이 없다** — 평문 키(EL-008.3)·마스킹(EL-004.2)처럼 글자를 눈으로 대조해야 하는 값이 sans 로 렌더된다. `0/O`·`1/l` 이 구분되지 않아 **수동 복사 시 오류 위험**이 있다. `RevealKeyModal.tsx:44-48` 이 이 부재를 기록하고 **하드코딩 `monospace` 로 우회하지 않은 이유**(TOKEN-01 위반 + drift 시작)를 밝힌다. `tokens/` 는 F1 소유 | **A41 / F1 (토큰 추가)** |
| 8 | ~~**발급에 멱등키가 없다 — 이 화면 최대 위험**~~ — **`712c30b` 에서 해소됐다(기록으로만 남긴다).** 이전 배치가 지목한 선례(`members/components/PointsCard` 의 `idempotencyKeyRef`)가 **그대로 채택됐다**: 호출부가 시도 단위 키를 쥐고(`ApiKeysPage.tsx:96,122-123`) **성공해야 버리며**(`:130`) 실패에는 남긴다(`:121`). 어댑터가 **최초 응답을 재생한다**(`data-source.ts:91,116-117`, 기록은 성공 뒤에만 `:139`). 회귀 3건(`api-keys.test.ts:90-124`). ⚠ **단 구현이 BE-069 §7.3 의 판정과 반대다** — 그 절은 '409 + 유령 키 노출' 을 채택했는데(근거: §7.1 평문 미보관) 구현은 **평문 재생**을 택했다. **연동 전에 어느 쪽이 정본인지 정해야 한다**(NFR-069 §5 #20) | **해소 — 단 BE-069 §7.3 ↔ 구현 불일치는 A63** |
| 9 | **이름 중복 검사(EL-007.5)가 경합에 취약하다** — 조회 시점 클라이언트 목록 기준이라 두 관리자가 동시에 같은 이름으로 발급하면 **둘 다 통과한다.** 로딩 중이면 `existingNames` 가 `[]` 라 검사가 아예 무력하다(EL-017). 서버가 막아야 하고(BE-069 §7.5), 서버 409/422 를 화면이 **필드 오류로 받는 경로가 없다**(EL-007.8 배너로 뭉개진다) | A11 · A63 |
| 10 | **유령 폐기 — `revokeApiKey` 가 `keys.map` 이라 없는 id 를 조용히 지나치고 성공을 반환한다**(`data-source.ts:126-128`). 그러면 성공 토스트가 뜨고 운영자는 폐기됐다고 믿는다. **이미 폐기된 키를 다시 폐기하면 `revokedAt` 이 새 시각으로 덮인다** — **감사 기록 훼손**이다(`:127` 이 조건 없이 `revokedAt: new Date().toISOString()` 을 쓴다). UI 는 폐기된 키의 버튼을 숨겨(`ApiKeyTable.tsx:121`) 정상 경로를 막지만 **어댑터에 가드가 없다** — 두 관리자가 동시에 폐기하면 두 번째가 시각을 덮는다. GROUND-TRUTH §4 의 `updateTicket` 유령 저장과 같은 형태이며, **`createStoreAdapter` 의 409 가드**(`shared/crud/crud.ts:219-221`)를 이 화면이 상속하지 못했다(quality-bar EXC-04 P0) | **A63 (BE-069 §7.6) · A11** |
| 11 | 조회(EL-013)·발급(EL-007.8)·폐기(EL-014.3) 실패가 **status 를 구분하지 않는다** — 401/403/404/409/422/500 이 각각 한 문구다. 어댑터가 `HttpError`(status 보유)를 던지지 않아 화면이 분기할 근거가 없다(quality-bar EXC-06 · EXC-12 P1) | A11 · A63 |
| 12 | 이름 셀(EL-004.1)에 truncate 가 없다 — 긴 이름이 열을 넓힌다. `maxLength=40` 이 상한이라 피해가 제한적(quality-bar COMP-09 P2) | A11 change_request |
| 13 | **폐기 중 모든 행의 버튼이 잠긴다** — `disabled={revokingId !== null}`(`ApiKeyTable.tsx:125`)이 진행 중인 행만이 아니라 전 행을 잠근다. `aria-busy` 는 해당 행만 켜지므로(`:126`) **의도는 행 단위였던 것으로 보인다** | A11 change_request |
| 14 | 건수(EL-005)가 `formatNumber` 를 거치지 않은 raw `length` 다(`ApiKeysCard.tsx:87`) — 천 단위 구분이 없다. 현재 규모에선 무해(quality-bar ERP-08 P2) | A11 change_request |
| 15 | 발급 모달(EL-007)이 `Modal` 에 **`describedBy` 를 주지 않는다** — 폼 모달이라 본문이 곧 폼이고 A11Y-02 의 appliesTo(ConfirmDialog)가 아니라 **위반은 아니다.** 다만 `RevealKeyModal`·`ConflictDialog`·`ConfirmDialog` 는 전부 준다 — 섹션 안에서 유일한 예외 | A11 (경미) |
| 16 | **발급 실패 직후 포커스가 이름 입력으로 이동한다** — `useEffect(() => { if (!busy) nameRef.current?.focus(); }, [busy])`(`CreateApiKeyModal.tsx:171-173`)가 `busy: true → false` 전이에서 성공·실패를 구분하지 않는다. 실패 배너(`role` 없음)를 읽기 전에 포커스가 움직여 **오류를 놓칠 수 있다** | A11 change_request |
| 17 | **폐기된 키의 이름도 중복 검사에 포함된다**(EL-017) — '구 모바일 앱(사용 중지)'을 폐기한 뒤 같은 이름으로 새 키를 만들 수 없다. 이름이 유일 식별자라 **의도된 보수적 판정일 수 있으나 명시된 근거가 없다** | A01 (도메인 경계) · A11 |
| 18 | **수동 복사가 `copied` 를 켜지 못한다**(EL-008.8) — `<code>` 를 직접 선택해 복사한 사용자도 닫기 가드에 붙잡힌다. 클립보드 API 성공만 추적한다(`RevealKeyModal.tsx:99-110`). 가드가 한 번 더 묻는 것이므로 **안전 방향의 오류**이나 마찰이다 | A11 change_request(경미) |
| 19 | 이탈·취소 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다. ✔ **발급에서의 대가는 #8 해소로 사라졌다** — abort 된 발급이 서버에 도달했더라도 `idempotencyKeyRef` 가 실패 경로에서 유지돼(`ApiKeysPage.tsx:121-123`) 재클릭이 **같은 발급**으로 이어진다. ⚠ **단 모달을 접으면 키를 버리므로**(`:156`) '취소 → 모달 닫기 → 다시 발급' 은 **새 거래**가 된다 — abort 된 첫 요청이 도달했다면 그 경로에서는 유령 키가 여전히 가능하다. **의도된 설계다**(다른 이름·스코프로 다시 열 수 있어야 한다) | **A63 (BE-069 §7.3 — 잔여 경로)** |
| 20 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료가 발급 모달 입력을 버린다(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | A11 · A40 |
| 21 | **노출 모달이 떠 있는 중 세션이 만료되거나 탭이 닫히면 평문이 영영 사라진다** — 지역 state 라 복구 경로가 없다(설계상 의도이나 **이탈 가드가 없다**: 노출 모달은 라우트 이동을 막지 않는다). 사이드바 링크를 잘못 누르면 키를 잃는다. `useUnsavedChangesDialog` 같은 3경로 가드가 이 모달에는 **없다** | A11 change_request |
| **22** | **⚠ 신규 — DS `Modal` 의 일방향 latch 가 이 화면의 모달 2종을 가둔다(PR #26 회귀).** `Modal.tsx:122-126` 이 `closingRef.current = true; setClosing(true)` 로 latch 를 걸고 **리셋이 전혀 없다** — `Modal.tsx:19-25` 가 '`onClose()` → 부모가 언마운트' 를 설계 전제로 삼는데 **이 화면의 두 `requestClose` 가 그 전제를 깬다**(EL-008.8 의 닫기 가드 자체가 veto 다): `CreateApiKeyModal.tsx:161-168` → `onClose={requestClose}` `:182` · `RevealKeyModal.tsx:113-119` → `onClose={requestClose}` `:126`. **추적**: Esc/딤/× → latch → `--closing`(`Modal.tsx:202`) → `pointer-events:none`(`Modal.css:26-28`) + dialog exit `forwards` → `opacity:0` 고정 → `onAnimationEnd`(`Modal.tsx:216-218`) → `onClose()` → **veto** → 확인 다이얼로그 → 사용자가 '취소'/'키 보기' → **모달이 마운트된 채 보이지도 조작되지도 않고 이후 모든 Esc/딤/× 가 `Modal.tsx:123` 에서 즉시 return 한다.** reduced-motion/jsdom 에서는 `willAnimate()` 가 false 라 경로만 다르고(`Modal.tsx:129-132`) 결과가 같다 — 이때는 **보이는데 무반응**. **⚠ `RevealKeyModal` 에서 대가가 가장 크다** — '키 보기'(`:170` `cancelLabel`)를 고른 사용자가 **평문을 영영 못 본다**. **#21 과 뿌리가 다르다**(#21 은 이탈 가드 부재, 이것은 DS 결함) **그러나 잃는 것이 같다.** ⚠ **footer 버튼('완료'·'취소')은 Modal 을 거치지 않아 latch 가 걸리지 않는다**(`Modal.tsx:27-31`) — 그래서 `RevealKeyModal.test.tsx` 5건이 전부 통과하며 결함을 놓쳤다(NFR-069 §6) | **A41 / DS (최우선 · 회귀)** |

</content>
