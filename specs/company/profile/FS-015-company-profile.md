---
id: FS-015
title: "회사 정보 (단일 문서 편집 폼)"
screen: SCR-015               # ⚠ 기업 관리 SCR 미작성 — §7 미결 사항 참조
route: /company/profile
owner: A62
reviewer: A64
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-015. 회사 정보 (단일 문서 편집 폼)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 회사의 기본 정보(회사명·사업자등록번호·대표자명·연락처·주소·로고) 1건을 불러와 고치고 저장한다. 저장하면 사용자 화면의 회사 소개에 반영된다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — §4.1) |
| 진입 경로 | 좌측 GNB > 기업 관리 > 회사 정보 (`/company/profile`) |
| 포함 화면 | **단일 문서 폼 `/company/profile` 하나뿐이다.** 목록·상세·등록(`/new`)·수정(`/:id/edit`) 라우트가 없다 — 회사당 1건이므로 식별자가 필요 없다(App.tsx 의 `APP_ROUTES` 에 이 경로 1줄뿐) |
| 구현 경로 | `apps/admin/src/pages/company/profile/**` (`CompanyProfilePage.tsx` · `data-source.ts` · `types.ts` · `validation.ts` · `profile.test.ts`) |
| 대응 SCR | SCR-015 (미작성 — §7) |
| 공통 컴포넌트 | `shared/crud/{DocumentFormShell, useDocumentQuery, useSaveDocument, createDocumentStore, requiredText}` · `shared/ui/{FormField, ImageUploadField, controlStyle, errorIdOf, useToast, useUnsavedChangesDialog, Alert, Button, Card, CardTitle}` · `shared/async.isAbort` · `shared/form/zodResolver` |

### 1.1 이 화면의 골격 — 단일 문서형 4종의 정본 기술

기업 관리의 **단일 문서형** 화면(회사 정보 · CEO 인사말 · 오시는 길 등)은 모두 같은 골격을 쓴다. **이 절이 그 골격의 정본**이며, 형제 문서(FS-016 등)는 이 선언을 상속하고 필드 차이만 기술한다.

| 골격 요소 | 구현 | 이 화면의 소비 |
|---|---|---|
| 문서 저장소 | `createDocumentStore<T>(scope, seed)` — `fetch(signal)` / `save(input, signal)` 2개 연산만 갖는다 | `companyProfileStore = createDocumentStore<CompanyProfile>('profile', PROFILE_SEED)` |
| 조회 | `useDocumentQuery(key, store)` → TanStack Query `useQuery` | `companyProfileKey = ['company','profile']` |
| 저장 | `useSaveDocument(key, store)` → `useMutation` + 성공 시 `invalidateQueries(key)` | `save.mutate({ input, signal })` |
| 폼 껍데기 | `DocumentFormShell` — 안내문 · 카드 · 저장 실패 배너 · 스켈레톤 · 푸터(상태 문구 + 저장 버튼) · 조회 실패 대체 화면 · 미저장 이탈 가드를 한 벌로 제공한다 | 필드(children)와 상태 플래그만 넘긴다 |
| 폼 상태 | react-hook-form + `zodResolver(스키마)` | `companyProfileSchema`(validation.ts) 가 검증의 정본 |
| 로딩 파생 | `loading = isFetching && data === undefined` — 첫 조회에만 스켈레톤, 재조회는 기존 값 유지 | `CompanyProfilePage.tsx:71` |
| 저장 후 기준선 | `onSuccess` 에서 `reset(values)` — 저장한 값이 새 기준선이 되어 `isDirty` 가 풀리고 이탈 가드가 해제된다 | `CompanyProfilePage.tsx:85` |

> **목록형과 다른 점**: 이 화면은 `useCrudForm`(목록형 등록/수정 폼 컨트롤러)을 **쓰지 않는다.** `useSaveDocument` 를 직접 호출한다. 그 결과 `useCrudForm` 이 제공하는 동기 제출 잠금·멱등키·409 충돌 다이얼로그·422 필드 매핑·404/5xx 구분이 **이 화면에는 없다** — §7 미결 #2·#3·#4 로 이관한다.

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-015-SEC-01 | 화면 헤더 | AppHeader 가 그리는 `<h1>` 화면 제목 + 카드 위 안내문 |
| FS-015-SEC-02 | 편집 폼 카드 | 카드 제목 · 저장 실패 배너 · 로딩 스켈레톤 · 입력 6종 |
| FS-015-SEC-03 | 카드 푸터 | 저장 상태 문구 + 저장 버튼 |
| FS-015-SEC-04 | 조회 실패 대체 화면(비표시 기본) | 폼 전체를 대신하는 재시도 배너 |
| FS-015-SEC-05 | 미저장 이탈 확인 다이얼로그(비표시 기본) | discard intent ConfirmDialog |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-015-EL-001 | FS-015-SEC-01 | 화면 제목 | 텍스트 | AppHeader 의 `<h1>` 에 `findNavLabel('/company/profile')` 결과인 **'회사 정보'** 를 그린다. 이 경로는 nav 잎과 정확히 일치하므로 가지 라벨('기업 관리')로 폴백하지 않는다 | — | 화면이 그리지 않는다(AppShell 상속). 카드 제목(FS-015-EL-003)과 문구가 같다 |
| FS-015-EL-002 | FS-015-SEC-01 | 안내문 | 텍스트 | 카드 위 muted 문구: '별표(*) 항목은 필수입니다. 저장하면 사용자 화면의 회사 소개에 반영됩니다.' | — | 정적. 조회 실패 시에는 렌더되지 않는다(FS-015-EL-015 가 화면 전체를 대체) |
| FS-015-EL-003 | FS-015-SEC-02 | 편집 폼 카드 | 카드 | `<form noValidate>` 안의 `Card` + `CardTitle` '회사 정보'. `noValidate` 라 브라우저 기본 검증 풍선이 뜨지 않는다 — 검증의 정본은 zod 스키마다 | — | 등록/수정 구분이 없다(문서 1건) |
| FS-015-EL-004 | FS-015-SEC-02 | 저장 실패 배너 | 배너 | 저장 실패 시 카드 상단에 위험 톤 Alert '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'. 재제출 시 먼저 지워진다. 자동 소멸 안 함 | O | 비표시 기본. **실패 원인(권한·충돌·검증·서버 오류)을 구분하지 않는다** — §7 #4 |
| FS-015-EL-005 | FS-015-SEC-02 | 로딩 스켈레톤 | 스켈레톤 | 첫 조회 중(`isFetching && data === undefined`) 입력 6종 대신 `aria-busy="true"` 컨테이너 + 막대 4개를 그린다. 카드 제목·푸터·저장 버튼은 계속 렌더된다(저장 버튼은 비활성) | — | 비표시. 재조회(데이터 보유 상태)에서는 뜨지 않는다 |
| FS-015-EL-006 | FS-015-SEC-02 | 회사명 입력 | 입력 | `FormField`(label '회사명', required) + `<input type="text" id="profile-name">`. `maxLength=100`(`COMPANY_NAME_MAX_LENGTH`), placeholder '예: 주식회사 예시플래닝'. 오류 시 `aria-invalid` + `aria-describedby=profile-name-error` | O | 제출 시에만 검증(`zodResolver`) |
| FS-015-EL-007 | FS-015-SEC-02 | 사업자등록번호 입력 | 입력 | `FormField`(required, **hint '예: 123-45-67890'**) + `<input type="text" id="profile-biznum">`. placeholder '123-45-67890'. `maxLength` 없음. 오류 시 `aria-invalid` + `aria-describedby=profile-biznum-error` | O | 형식 검증은 `^\d{3}-\d{2}-\d{5}$` — **자리수만 본다(체크섬 없음)**. 마스킹·자동 하이픈 없음 — §7 #6 |
| FS-015-EL-008 | FS-015-SEC-02 | 대표자명 입력 | 입력 | `FormField`(required) + `<input type="text" id="profile-ceo">`. `maxLength=50`(`NAME_MAX_LENGTH`), placeholder '예: 홍길동' | O | FS-015-EL-012 의 2열 행에 들어간다 |
| FS-015-EL-009 | FS-015-SEC-02 | 연락처 입력 | 입력 | `FormField`(required) + `<input type="text" id="profile-contact">`. `maxLength=40`(`CONTACT_MAX_LENGTH`), placeholder '예: 02-0000-0000' | O | `type="tel"` 아님. 형식 검증 없음(공백·길이만) — §7 #6 |
| FS-015-EL-010 | FS-015-SEC-02 | 주소 입력 | 입력 | `FormField`(required) + `<input type="text" id="profile-address">`. `maxLength=200`(`ADDRESS_MAX_LENGTH`), placeholder '예: 서울특별시 예시구 가상대로 123' | O | 우편번호 검색·주소 API 연동 없음 — 자유 텍스트 1줄 |
| FS-015-EL-011 | FS-015-SEC-02 | 로고 이미지 필드 | 업로드 | `ImageUploadField`(label '로고 이미지', hint '이미지를 끌어다 놓거나 클릭해 업로드합니다. 비워 두면 로고가 표시되지 않습니다.'). 값은 `logoUrl`. `required` 를 주지 않는다 — 선택 항목 | O | 저장 시 `logoUrl` 문자열만 나간다. **파일 자체는 서버로 가지 않는다** — FS-015-EL-011.7 |
| FS-015-EL-011.1 | FS-015-SEC-02 | 드롭존 버튼 | 버튼 | 접근 이름 '로고 이미지 이미지 업로드 — 클릭하거나 파일을 끌어다 놓으세요'. 클릭 시 숨은 `<input type="file" accept="image/*">` 를 연다. 드래그 오버 시 '여기에 놓으면 업로드됩니다'로 문구가 바뀐다 | — | 저장 중·로딩 중 비활성 |
| FS-015-EL-011.2 | FS-015-SEC-02 | 미리보기 / 로드 실패 placeholder | 이미지 | `logoUrl` 이 비어있지 않고 로드에 성공하면 `<img alt="로고 이미지 미리보기">`. 로드 실패(`onError`)하면 드롭존이 '이미지를 불러오지 못했습니다. 다시 선택하세요.' 로 바뀐다. `logoUrl` 이 바뀌면 실패 플래그가 리셋된다 | — | **저장된 `blob:` URL 이 새 세션에서 깨지면 여기로 떨어진다** — FS-015-EL-011.7 |
| FS-015-EL-011.3 | FS-015-SEC-02 | '이미지 교체' 버튼 | 버튼 | `logoUrl` 이 비어있지 않을 때만 렌더. 클릭 시 파일 선택창을 연다 | — | 비표시 기본 |
| FS-015-EL-011.4 | FS-015-SEC-02 | '제거' 버튼 | 버튼 | `logoUrl` 이 비어있지 않을 때만 렌더. 클릭 시 직전 object URL 을 revoke 하고 `logoUrl` 을 빈 문자열로 만든다 | — | 비표시 기본. 제거만으로는 저장되지 않는다 — FS-015-EL-014 를 눌러야 확정 |
| FS-015-EL-011.5 | FS-015-SEC-02 | 파일 클라이언트 검증 | 텍스트 | 고른 파일이 `image/*` 가 아니면 '이미지 파일만 올릴 수 있습니다.', 5MB 를 넘으면 '파일 용량은 5MB 를 넘을 수 없습니다.' 를 필드 안 `role="alert"` 로 띄우고 **값을 바꾸지 않는다** | — | 비표시 규칙. 요청을 발사하지 않는다(애초에 업로드 요청이 없다) |
| FS-015-EL-011.6 | FS-015-SEC-02 | 업로드 완료 안내 | 텍스트 | 값이 있고 로드에 성공하면 '업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있습니다.' | — | 비표시. live region 아님(P2 A11Y-14) |
| FS-015-EL-011.7 | FS-015-SEC-02 | **로고 값 생성 규칙 (`blob:`)** | 텍스트 | 파일을 고르면 `URL.createObjectURL(file)` 로 만든 **`blob:` URL** 이 그대로 `logoUrl` 에 들어간다. **업로드 요청이 없다** — 서버는 파일을 받은 적이 없고, 저장되는 것은 이 브라우저 세션에서만 유효한 문자열이다. 따라서 **저장 후 새로고침하면 로고가 깨진다**(FS-015-EL-011.2 의 로드 실패 경로). 검증(`validation.ts:27` `logoUrl: z.string()`)도 형식을 강제하지 않아 이 값을 막지 않는다 | — | **비표시 규칙 — 이 화면의 핵심 결함. §7 #1 · BE-015 §7.2/§7.6** |
| FS-015-EL-012 | FS-015-SEC-02 | 2열 반응형 행 규칙 | 텍스트 | 사업자등록번호(FS-015-EL-007)와 대표자명(FS-015-EL-008)은 `repeat(auto-fit, minmax(calc(var(--tds-space-6) * 6), 1fr))` grid 한 행에 놓인다 — 폭이 좁으면 자동으로 세로로 쌓인다. 나머지 필드는 1열 | — | 비표시 규칙 |
| FS-015-EL-013 | FS-015-SEC-03 | 푸터 상태 문구 | 텍스트 | 저장 중 '저장하는 중입니다…' / 변경 있음 '저장하지 않은 변경 사항이 있습니다.' / 그 외 '변경 사항이 없습니다.' | — | 저장 버튼 좌측. live region 아님 |
| FS-015-EL-014 | FS-015-SEC-03 | 저장 버튼 | 버튼 | primary, `type="submit"`. 라벨 '저장 중…'(저장 중) / '저장'. **`!dirty \|\| saving \|\| loading` 이면 비활성** — 변경이 없으면 누를 수 없다. 성공 시 FS-015-EL-018 토스트 + FS-015-EL-019 기준선 재설정(이동 없음, 화면에 머문다). 실패 시 FS-015-EL-004 | O | 권한에 따른 숨김·비활성이 **없다** — §7 #3 |
| FS-015-EL-015 | FS-015-SEC-04 | 조회 실패 대체 화면 | 배너 | 조회 실패(`error !== null`) 시 안내문·폼·푸터 **전체를 대신해** 위험 톤 Alert '내용을 불러오지 못했습니다.' + '다시 시도'(`refetch`)를 그린다 | O | 비표시 기본. **404 와 5xx 를 구분하지 않는다** — 단일 문서라 404 는 '문서 미생성' 을 뜻하지만 같은 문구로 뭉갠다(§7 #5) |
| FS-015-EL-016 | FS-015-SEC-05 | 미저장 이탈 확인 다이얼로그 | 모달 | `isDirty && !saving` 일 때 이탈을 가로챈다. discard intent ConfirmDialog, 제목 '저장하지 않은 변경 사항이 있습니다', 본문 '회사 정보에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.'. **3경로**: ① 브라우저 이탈(`beforeunload` — 브라우저 기본 문구) ② 앱 내 링크(capture 단계 가로채기) ③ 뒤로/앞으로(sentinel history). 확인 시 이동, 취소 시 머문다(취소 토스트 없음) | — | 비표시 기본. 저장 성공으로 dirty 가 풀리면 즉시 해제된다 |
| FS-015-EL-017 | FS-015-SEC-02 | 언마운트 abort 규칙 | 텍스트 | 제출마다 새 `AbortController` 를 만들어 `controllerRef` 에 담고, 언마운트 시 `abort()` 한다. abort 된 저장은 실패가 아니다 — 배너도 토스트도 없다(`isAbort(cause)` early return) | — | 비표시 규칙. **취소 버튼은 없다** — 사용자가 스스로 저장을 중단할 수단이 없다 |
| FS-015-EL-018 | FS-015-SEC-03 | 저장 성공 토스트 | 토스트 | 저장 성공 시 success 토스트 '회사 정보를 저장했습니다.'. 화면 이동 없음 | — | 비표시. ToastProvider(앱 전역 큐)가 나른다 |
| FS-015-EL-019 | FS-015-SEC-02 | 저장 후 기준선 재설정 규칙 | 텍스트 | 저장 성공 시 `reset(values)` — **서버 응답이 아니라 방금 제출한 값**을 새 기준선으로 삼는다. `isDirty` 가 풀려 저장 버튼이 비활성되고 이탈 가드가 해제된다. 별도로 `invalidateQueries(['company','profile'])` 가 돌아 배경 재조회가 일어난다 | O | 비표시 규칙. 서버가 값을 정규화(trim·포맷)해도 화면은 제출한 원본을 보여준다 — 재조회 도착 시점에만 정합 |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-015-EL-001 | N/A — nav 잎 라벨은 정적 상수 | N/A — 조회와 무관 | N/A — 서버 호출 없음 | N/A — 입력 없음 | 이 경로의 read 권한이 없으면 본문이 403 화면으로 바뀌지만 **헤더 제목은 그대로 남는다**(AppShell 상속) | N/A — 저장 상태 없음 | N/A — 고정 문구 |
| FS-015-EL-002 | N/A — 정적 안내 | 로딩 중에도 그대로 표시된다 | 조회 실패 시 FS-015-EL-015 가 화면을 대체하며 함께 사라진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 저장 상태 없음 | N/A — 고정 문구 |
| FS-015-EL-003 | N/A — 문서 1건이 항상 대상이다(빈 목록 개념 없음) | 카드·제목·푸터는 유지되고 본문만 FS-015-EL-005 로 바뀐다 | 조회 실패 시 카드째 FS-015-EL-015 로 대체. 저장 실패는 카드 안 FS-015-EL-004 | 검증은 하위 입력이 담당. `noValidate` 라 브라우저 풍선 없음 | §4.1 공통 규칙 적용 | N/A — 껍데기 자체는 상태를 저장하지 않는다 | N/A — 필드 6종 고정 |
| FS-015-EL-004 | N/A — 오류 없으면 미렌더 | 재제출 시 먼저 지워진다(`setServerError(null)`) | 이것이 저장 실패 표현. 1문구 고정. 복구는 재제출뿐 — 배너에 재시도 버튼이 없다 | 유효성 위반은 여기 오지 않는다(각 필드 인라인) | §4.1 공통 규칙 적용 — **권한 부족(403)도 같은 문구** | 409/412 도 같은 문구로 뭉개진다 — 충돌 다이얼로그 없음(§7 #2) | N/A — 1건만 표시 |
| FS-015-EL-005 | N/A — 도착 전 상태 | 이것이 로딩 표현. 막대 4개 고정(입력은 6종 — 수가 일치하지 않는다) | 조회 실패 시 FS-015-EL-015 로 바뀐다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 표시 전용 | 막대 수 고정 |
| FS-015-EL-006 | 서버 값이 빈 문자열이면 placeholder 가 보인다. 초기값도 빈 문자열 | 로딩 중·저장 중 비활성(`disabled = saving \|\| loading`) | 저장 실패는 FS-015-EL-004. 입력값은 유지된다 | 제출 시 검증. 공백만이면 '회사명을(를) 입력하세요.' / 100자 초과 '회사명은(는) 100자를 넘을 수 없습니다.'(`maxLength` 가 먼저 막으므로 붙여넣기 절단으로만 도달) | §4.1 공통 규칙 적용 | 다른 관리자가 먼저 저장해도 감지하지 않는다 — 마지막 저장이 이긴다 | 100자 상한. 카운터 없음 |
| FS-015-EL-007 | 초기값 빈 문자열, placeholder + hint 노출 | 로딩 중·저장 중 비활성 | 저장 실패는 FS-015-EL-004 | 제출 시 검증. 공백만이면 '사업자등록번호를 입력하세요.' / 형식 불일치 '사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)'. **자리수만 본다 — 체크섬·실재 여부는 검사하지 않는다**(`123-45-67890` 은 통과) | §4.1 공통 규칙 적용 | 위와 동일 — 충돌 감지 없음 | 길이 상한 없음(`maxLength` 미지정). 정규식이 13자 형식을 강제하므로 사실상 13자 |
| FS-015-EL-008 | 초기값 빈 문자열, placeholder 노출 | 로딩 중·저장 중 비활성 | 저장 실패는 FS-015-EL-004 | 제출 시 검증. 공백만이면 '대표자명을(를) 입력하세요.' / 50자 초과 문구 | §4.1 공통 규칙 적용 | 위와 동일 | 50자 상한 |
| FS-015-EL-009 | 초기값 빈 문자열, placeholder 노출 | 로딩 중·저장 중 비활성 | 저장 실패는 FS-015-EL-004 | 제출 시 검증. 공백만이면 '연락처를(을) 입력하세요.' / 40자 초과 문구. **전화번호 형식은 검사하지 않는다** — 'abc' 도 통과한다 | §4.1 공통 규칙 적용 | 위와 동일 | 40자 상한 |
| FS-015-EL-010 | 초기값 빈 문자열, placeholder 노출 | 로딩 중·저장 중 비활성 | 저장 실패는 FS-015-EL-004 | 제출 시 검증. 공백만이면 '주소를(을) 입력하세요.' / 200자 초과 문구 | §4.1 공통 규칙 적용 | 위와 동일 | 200자 상한 |
| FS-015-EL-011 | `logoUrl` 이 빈 문자열이면 드롭존 안내(FS-015-EL-011.1)만. 로고 없이 저장 가능 | 로딩 중·저장 중 드롭존·교체·제거 버튼 전부 비활성 | 저장 실패는 FS-015-EL-004. 파일 자체의 실패 경로는 없다(요청이 없다) | **선택 항목 — 스키마가 `z.string()` 이라 어떤 문자열도 통과한다.** 빈 값도 `blob:` 도 `javascript:` 도 막지 않는다(§7 #1). 파일 단계 검증만 FS-015-EL-011.5 | §4.1 공통 규칙 적용 | `setValue(..., { shouldDirty: true })` 로 dirty 가 되므로 이탈 가드에는 걸린다 | 파일 1개. 5MB 상한 |
| FS-015-EL-011.1 | 값이 없을 때 이 안내가 드롭존 본문이다 | 비활성(`disabled`) | N/A — 여는 동작이 서버를 호출하지 않는다 | N/A — 입력 없음(검증은 FS-015-EL-011.5) | §4.1 공통 규칙 적용 | N/A — 저장 상태 없음 | 드롭 시 **첫 번째 파일만** 취한다(`files?.[0]`) |
| FS-015-EL-011.2 | 값이 없으면 미렌더 | 로딩 중에는 값이 없어 미렌더 | 이미지 로드 실패 시 드롭존이 '이미지를 불러오지 못했습니다. 다시 선택하세요.' 로 바뀐다. **`role="img"` placeholder 가 아니라 장식용 글리프(`aria-hidden`)** — P1 EXC-15 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | 값이 바뀌면 실패 플래그가 리셋된다 | 이미지 1개 |
| FS-015-EL-011.3 | 값이 없으면 미렌더 | 비활성 | N/A — 파일 선택창만 연다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 교체 시 직전 object URL 을 revoke 한다 — 되돌리기 없음 | 파일 1개 |
| FS-015-EL-011.4 | 값이 없으면 미렌더 | 비활성 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 제거해도 저장 전까지 서버 값은 그대로다 | 파일 1개 |
| FS-015-EL-011.5 | N/A — 파일을 골라야 성립 | N/A — 즉시 판정 | 위반 시 값을 바꾸지 않고 문구만 띄운다 | 이것이 유효성 표현. `image/*` 아님 / 5MB 초과 2가지 | §4.1 공통 규칙 적용 | N/A — 로컬 판정 | 파일 1개씩 판정 |
| FS-015-EL-011.6 | 값이 없으면 미렌더 | 미렌더 | 로드 실패 시 미렌더 | N/A — 표시 전용 | §4.1 공통 규칙 적용 | N/A — 표시 전용 | 고정 문구 |
| FS-015-EL-011.7 | 값이 없으면 이 규칙이 발동하지 않는다 | N/A — 즉시 생성 | **이것이 결함 표현**: 저장은 성공하고 토스트도 뜨지만, 새 세션에서 그 URL 은 죽어 FS-015-EL-011.2 의 로드 실패로 나타난다. 실패 시점이 저장 시점과 분리돼 있어 운영자가 원인을 알 수 없다 | 스키마가 막지 않는다(`z.string()`) — `profile.test.ts:64-68` 이 `blob:abc-123` 통과를 **테스트로 고정**하고 있다 | §4.1 공통 규칙 적용 | N/A — 로컬 생성 | 파일 1개 |
| FS-015-EL-012 | N/A — 레이아웃 규칙 | N/A — 스켈레톤에는 적용되지 않는다 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 저장 상태 없음 | 좁은 폭에서 1열로 쌓인다 |
| FS-015-EL-013 | 변경이 없으면 '변경 사항이 없습니다.' 가 기본 문구 | 저장 중 '저장하는 중입니다…' | N/A — 실패를 말하지 않는다. 실패해도 dirty 는 남아 '저장하지 않은 변경 사항이 있습니다.' 로 되돌아간다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A — 표시 전용 | 고정 문구 3종 |
| FS-015-EL-014 | 조회 후 변경이 없으면 **비활성**(`!dirty`) | 로딩 중 비활성 / 저장 중 '저장 중…' + 비활성 | 실패 시 FS-015-EL-004 배너, 버튼 재활성(dirty 유지), 이동 없음 | 위반이면 서버 미호출. RHF 기본 동작으로 첫 오류 필드에 포커스가 간다 | §4.1 공통 규칙 적용 — **`can(page:/company/profile,'update')` 를 보지 않는다.** 권한 없는 역할에게도 버튼이 그대로 보이고 눌린다(§7 #3) | **동기 제출 잠금(`submitLockRef`)이 없다.** RHF 의 비동기 검증이 도는 사이 `saving` 이 아직 false 라 빠른 두 번째 Enter/클릭이 **두 번째 저장 요청을 만든다**. 멱등키도 없다(§7 #2) | 단건 저장 |
| FS-015-EL-015 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 FS-015-EL-005 스켈레톤으로 | 이것이 조회 실패 표현. '내용을 불러오지 못했습니다.' 1문구. 복구 '다시 시도'(`refetch`) | N/A — 입력 없음 | §4.1 공통 규칙 적용 — 서버 403 도 이 배너(라우트 403 화면과 다른 표면) | 재시도는 같은 문서 재조회 | N/A — 표시 전용 |
| FS-015-EL-016 | N/A — 변경이 있어야 성립 | 저장 중에는 가드가 비활성(`dirty && !saving`) — 저장 중 이동은 막지 않고 FS-015-EL-017 abort 로 처리된다 | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 브라우저 이탈(a) 은 브라우저 기본 문구로 대체된다 — 위 본문 문구가 보이지 않는다 | N/A — 표시 전용 |
| FS-015-EL-017 | N/A — 진행 중 요청이 있어야 성립 | 진행 중 저장이 abort 되면 `isPending` 이 풀린다 | abort 는 실패가 아니다 — 배너·토스트 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **직전 요청을 abort 하지 않는다** — `controllerRef` 는 마지막 컨트롤러만 들고 있어 중복 제출 시 첫 요청이 그대로 살아 있다(§7 #2 와 같은 뿌리) | 요청 1건 |
| FS-015-EL-018 | N/A — 성공해야 뜬다 | N/A — 성공 시점에만 | 실패 시 뜨지 않는다(대신 FS-015-EL-004) | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장이 실제로 반영됐는지는 서버 응답만으로 판정한다 — 응답 본문을 보지 않는다(`Promise<void>`) | 토스트 1건. 큐 상한 3(ToastProvider) |
| FS-015-EL-019 | N/A — 성공해야 성립 | N/A — 성공 시점에만 | 실패 시 리셋하지 않는다 — 입력이 그대로 남아 재제출할 수 있다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **제출한 값으로 리셋한다** — 서버가 정규화했다면 화면과 서버가 잠시 어긋난다. 뒤이은 `invalidateQueries` 재조회가 도착하면 그 값으로 다시 `reset` 된다 | 단건 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 조회 실패는 FS-015-EL-015 대체 화면, 저장 실패는 FS-015-EL-004 배너. `navigator.onLine` 감지·오프라인 배너는 없다(P1 EXC-11 — 앱 전역 gap) |
| 세션 만료 | **처리된다**: 조회·저장의 401 을 queryClient 의 Query/Mutation 캐시 `onError` 가 잡아 `notifySessionExpired()` → `/login?returnUrl=/company/profile&reason=session_expired` 로 보낸다. 단 **dirty 폼 내용은 보존되지 않는다**(P1 EXC-19) |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 미사용). abort 는 언마운트에서만 발생한다 — §7 #7 |
| 중복 제출 | 저장 버튼의 `disabled={!dirty \|\| saving \|\| loading}` 뿐이다. **동기 잠금·멱등키가 없어** 렌더 이전의 빠른 재입력이 두 번째 요청을 만든다 — §7 #2 |
| 실패 통지의 자리 | ① 조회 실패는 폼을 대체하는 인라인 배너(FS-015-EL-015) ② 저장 실패는 카드 안 배너(FS-015-EL-004) ③ 저장 **성공**은 토스트(FS-015-EL-018) ④ 파일 검증 위반은 필드 안 `role="alert"`(FS-015-EL-011.5) |
| 실패의 갈래 | **구분하지 않는다.** 400·403·409·422·500·504 가 모두 '저장하지 못했습니다…' 한 문구로 수렴한다. `shared/errors/http-error.ts` 에 `isConflict`·`isUnprocessable`·`isForbidden` 가 있고 `useCrudForm` 은 이를 쓰지만, 이 화면은 쓰지 않는다 — §7 #4 |
| 낙관적 업데이트 | 없다. 저장은 비관적이다 — 서버 성공 후에만 토스트·기준선 재설정이 일어난다 |
| 동시 조회 | 문서 조회는 동시에 1건만 유지된다(TanStack Query, `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false`) |
| 권한 없음 | 라우트 read 권한은 `RequirePermission` 이 강제해 본문이 403 화면으로 바뀐다. **쓰기 권한은 화면이 보지 않는다** — 저장 버튼이 항상 렌더된다(§7 #3). 서버 403 은 FS-015-EL-004 로 떨어진다 |
| 검증 시점 | 제출 시에만(`zodResolver` + RHF 기본 `onSubmit` 모드). 입력 중·blur 시 검증하지 않는다 — 첫 제출 후에는 RHF 가 해당 필드를 재검증한다 |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| FS-015-EL-003 / EL-005 / EL-006 / EL-007 / EL-008 / EL-009 / EL-010 / EL-011 / EL-015 | 회사 정보 조회 | R | `CompanyProfile` 1건(회사명·사업자등록번호·주소·대표자명·연락처·로고 URL) | `companyProfileStore.fetch(signal)` — `useDocumentQuery(companyProfileKey, companyProfileStore)` | 진입 시 1회. `staleTime` 30초. 저장 성공 후 무효화로 재조회 |
| FS-015-EL-014 / EL-018 / EL-019 | 회사 정보 저장 | W | `CompanyProfile` **전체**(부분 갱신 아님) | `companyProfileStore.save(input, signal)` — `useSaveDocument(companyProfileKey, companyProfileStore)` | 전체 치환. 성공 시 `invalidateQueries(['company','profile'])` |
| FS-015-EL-011.7 | 로고 파일 업로드 | — | (있어야 할 것) 파일 바이트 → 영구 URL | **없다** — 어댑터에 업로드 함수가 없다. `URL.createObjectURL` 결과가 그대로 `logoUrl` 이 된다 | **미구현.** BE-015 §4 BE-015-EP-03 '심 없음(미정)' · §7.6 |

> **현재 구현 상태 (A63 참고)**: 백엔드가 없다. `createDocumentStore('profile', PROFILE_SEED)` 가 브라우저 안 mutable 픽스처 1건을 들고 `fetch`/`save` 를 흉내 낸다 — `save` 는 모듈 변수를 덮어쓰므로 **새로고침하면 초기 seed 로 돌아간다**. 두 연산 모두 `wait(LATENCY_MS=400, signal)` 로 지연을 흉내 내고 `failIfRequested('profile', 'load'\|'save')` 로 실패를 재현한다. 연동 지점은 `data-source.ts:21` 의 `// TODO(backend): GET /api/company/profile · PUT /api/company/profile` 주석 **2건뿐이며, 업로드 심은 없다.** 위 표는 백엔드 연결 후 의도된 동작이다.

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `CompanyProfilePage.tsx` · `data-source.ts` · `types.ts` · `validation.ts` · `profile.test.ts` + 소비하는 공용 모듈(`DocumentFormShell` · `document.ts` · `dev.ts` · `useUnsavedChangesDialog` · `FormField` · `ImageUploadField`)
- [x] 라우트를 `App.tsx` `APP_ROUTES` 에서 확인했다 — `/company/profile` 1건. 목록·상세·`:id` 없음
- [x] 보이지 않는 요소(스켈레톤·저장 실패 배너·조회 실패 대체 화면·이탈 가드 다이얼로그·`blob:` 생성 규칙·2열 행 규칙·abort 규칙·기준선 재설정 규칙)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건(**26행 × 7열** — §3 요소 26건과 1:1 대응). 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-015 영역)
- [x] 지어내지 않았다 — `?delay=` 스위치·업로드 엔드포인트·역할 분기 등 코드에 없는 것을 쓰지 않았다

## 7. 미결 사항 (A11 / A01 / A63 / A40 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | **로고가 저장되지 않는다.** `ImageUploadField` 가 만든 `blob:` URL 이 그대로 `logoUrl` 로 저장된다 — 업로드 심이 없어 파일이 서버에 도달하지 않고, 저장 후 새로고침하면 로고가 깨진다(FS-015-EL-011.7). `validation.ts:27` 의 `logoUrl: z.string()` 이 형식을 강제하지 않아 이 값을 막지도 못한다. 같은 파일의 `optionalHttpUrl()` 헬퍼가 이미 존재하고 `company/logo-list` 는 그것을 쓴다 — 이 화면만 무방비다 | A11 change_request · A63 (BE-015 §7.2·§7.6) |
| 2 | **중복 제출 방어가 불완전하다.** 이 화면은 `useCrudForm` 을 우회하고 `useSaveDocument` 를 직접 쓴다 — F2 가 `useCrudForm` 에 넣은 `submitLockRef`·제출 시도 단위 멱등키가 이 화면에 **적용되지 않는다**(FS-015-EL-014 경합 열) | A11 change_request |
| 3 | **쓰기 권한 게이팅이 없다.** `shared/permissions/RequirePermission.tsx` 의 `useRouteWritePermissions()` 가 존재하지만 이 화면은 호출하지 않는다 — read 권한만 라우트에서 막히고, 저장 버튼은 `update` 권한과 무관하게 렌더된다 | A11 change_request |
| 4 | **저장 실패의 갈래가 없다.** 403·409·422·500 이 한 문구로 수렴한다. `useCrudForm` 이 쓰는 `isConflict`/`isUnprocessable`/`referenceOf` 를 이 화면은 쓰지 않아 충돌 다이얼로그·필드 인라인 에러·오류 참조 코드가 전부 없다 | A11 change_request · A63 (BE-015 §7.4) |
| 5 | 조회 실패에서 404(문서 미생성)와 5xx 를 구분하지 않는다 — `loadFailed={error !== null}`(FS-015-EL-015). 단일 문서라 '아직 만들어지지 않음' 이 정상 상태일 수 있는데 그 경로가 없다 | A63 (BE-015 §7.3) · A11 |
| 6 | 사업자등록번호·연락처에 마스킹/실시간 포맷/붙여넣기 정규화가 없고, 사업자등록번호 검증이 **자리수만** 본다(체크섬 없음). 연락처는 형식 검증이 아예 없다 | A11 change_request (P1 ERP-14) · A63 (BE-015 §7.3) |
| 7 | 프론트 타임아웃 상한이 없다(`AbortSignal.timeout` 미사용). 저장 중 사용자가 스스로 취소할 수단도 없다 | A63 (BE-015) · A40 |
| 8 | 대응 SCR 문서 부재 — 기업 관리 섹션 SCR 미작성 | A11 / A01 |
