# 약관 버전 등록 · 수정

> 이 화면은 [공지 등록·수정](../notices/form.md)과 **같은 계열**이다(RHF + zod · 카드 하나 ·
> 저장 실패 배너 · 공통 폼 컨트롤러를 쓰지 않는 한계). 다른 것은 셋이다: **등록 진입에 약관 종류가
> 필요하다** · **이탈 가드가 없다** · **저장 뒤 목록으로 간다**. 아래 각 절은 그 차이를 밝혀 적는다.
> [처리방침 버전 등록·수정](../privacy/form.md)은 이 화면에서 종류 축 하나만 뺀 것이다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 약관 버전 등록 · 수정 |
| 화면 ID | `SCR-CONTENT-TERMS-FORM` |
| 메뉴 경로 | 콘텐츠 관리 > 약관 관리 > 새 버전 등록 (또는 행의 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 약관 버전 한 건의 버전 표기·시행일·상태·전문을 정한다.

**업무 배경** — 약관 개정은 "언제부터 이 문구가 적용되는가"가 핵심이다. 그래서 이 폼의 세 값(버전 표기·시행일·상태)은 본문만큼 중요하다.

**화면 설명** — 위쪽에 '목록으로', 아래 카드 하나에 (버전 · 시행일 · 상태) 한 줄과 본문이 놓인다. 카드 안 오른쪽 아래에 취소·제출.

**주요 사용자** — 최상위 관리자 · 약관을 관리하는 운영자.

**사용 시나리오**

1. 목록에서 '이용약관'을 고르고 '새 버전 등록'을 눌러 v2.0 을 쓴다 → 시행일을 미래로, 상태를 '시행예정'으로 둔다.
2. 시행일이 되어 v2.0 을 열어 상태를 '시행중'으로 바꾼다.
3. 종류를 고르지 않은 채 등록 주소로 직접 들어온다 → 경고 배너가 뜨고 폼이 그려지지 않는다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈 · **등록이면 주소에 약관 종류가 실려 있어야 한다**.

**후행 처리** — 등록·수정 모두 성공하면 **목록으로** 간다 — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:55,102`. 상세로 돌아가지 않는다.

**관련 화면** — [약관 관리](index.md) · [약관 버전 상세](detail.md) · [처리방침 버전 등록·수정](../privacy/form.md)(같은 형태) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/content/terms` 가 덮는다.

**관련 기능** — 여기서 고른 상태가 목록·상세의 `현재` 배지를 정한다([목록 문서](index.md) §4.5).

**관련 API** — 등록 1건 · 수정 1건 · (수정 진입 시) 상세 조회 1건. **백엔드가 없다** — `apps/admin/src/pages/content/terms/data-source.ts:96`(등록) · `:106`(수정) · `:77`(상세).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/terms/TermsFormPage.tsx` (폼 본문 `components/VersionForm.tsx` · 검증 `validation.ts` · 상수 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실 셋**

| 무엇 | 근거 |
|---|---|
| 저장이 픽스처를 바꾸지 않는다 | `apps/admin/src/pages/content/terms/data-source.ts:96-117` |
| **미저장 이탈 가드가 없다** | 이 폼은 `useUnsavedChangesDialog` 를 쓰지 않는다 — 콘텐츠 관리의 다른 폼 다섯과 다르다. 반쯤 쓴 약관 전문이 링크 한 번에 사라진다 |
| 권한 게이팅이 없다 | `TermsFormPage.tsx`·`components/VersionForm.tsx` 어디에도 권한 판정 호출이 없다(§9) |

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 상단 이동영역 | '목록으로' | 조회 실패·종류 없음 화면이 아닐 때 | 전체 | 불가 | 표시 |
| 조회 실패영역 | 수정 진입에서 상세 조회가 실패했을 때 폼 대신 | 수정 + 조회 실패 | 전체 | 불가 | 숨김 |
| 종류 없음 영역 | 등록 진입인데 약관 종류가 없을 때 폼 대신 | 등록 + 종류 없음 | 전체 | 불가 | 숨김 |
| 오류영역 | 저장 실패 배너 | 저장 실패 | 전체 | 불가 | 숨김 |
| 입력영역 | 버전 · 시행일 · 상태 · 본문 | 위 두 대체 화면이 아닐 때 | 전체 | 불가 | 표시 |
| 버튼영역 | 취소 · 등록(또는 저장) | 〃 | 전체 | 불가 | 표시 |

**세 화면은 서로를 대신한다** — 조회 실패 · 종류 없음 · 폼. 로딩 중에는 카드 안이 스켈레톤 4행이다 — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:93-100`.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 목록으로 | Button(text + 아이콘) | `목록으로` — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:90` | 목록 경로로 이동 | N | N | 없음 | — | — | — | 항상 | — |
| 2 | 카드 제목 | Heading(h2) | 등록 `새 약관 버전 등록` · 수정 `약관 버전 수정` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:134` | **이 화면에는 h1 페이지 제목이 없다** — 카드 제목이 그 자리를 대신한다 | Y | Y | — | 수정 대상 유무가 정한다 | — | — | 항상 | 다른 콘텐츠 폼과 다른 점이다 |
| 3 | 저장 실패 배너 | Alert(danger) | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:103` | 실패의 유일한 표면 | N | Y | — | 숨김 | — | — | 저장 실패 | 오류 참조 코드가 붙지 않는다 |
| 4 | 버전 | TextField | `버전` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:144` | `v1.2` 같은 표기 | Y | N | 저장 중 | 등록=빈 값 · 수정=기존 값 | `예: v1.2` — `:153` | 20자 — `apps/admin/src/pages/content/terms/types.ts:51`(입력에서도 잘린다 — `:152`) | 항상 | — |
| 5 | 시행일 | 날짜 입력(date) | `시행일` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:166` | 이 버전이 적용되는 날 | Y | N | 저장 중 | 등록=빈 값 · 수정=기존 값 | 브라우저 기본 | 달력 입력 | 항상 | ⚠ **과거·미래 어느 날짜든 받는다** — 상태와의 앞뒤는 검사하지 않는다([목록 문서](index.md) §4.5) |
| 6 | 상태 | SelectField | `상태` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:183` | `시행중` · `시행예정` · `만료` — `apps/admin/src/pages/content/terms/types.ts:29-33` | Y | N | 저장 중 | **`시행예정`** — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:50` | — | 세 값 중 하나 | 항상 | 이 값이 `현재` 배지를 정한다 |
| 7 | 본문 | TextareaField | `본문` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:195` | 약관 전문. 12행 높이 | Y | N | 저장 중 | 등록=빈 값 · 수정=기존 전문 | `약관 조문을 입력하세요.` — `:205` | 20,000자 — `apps/admin/src/pages/content/terms/types.ts:52` | 항상 | 글자 수 카운터. 리치 텍스트가 아니다 |
| 8 | 취소 | Button(secondary) | `취소` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:211` | **목록으로** 이동 — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:55,102` | N | N | 저장 중 | — | — | — | 항상 | — |
| 9 | 제출 | Button(primary) | 등록 `등록` · 수정 `저장` · 저장 중 `저장 중…` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:214` | 검증 후 요청 | Y | N | 저장 중 | — | — | — | 항상 | Enter 로도 제출된다 |
| 10 | 필드 오류 문구 | Text(error) | §6 의 문구 | 해당 입력 아래 인라인 | N | Y | — | 없음 | — | — | 검증 위반 | `aria-invalid` 와 함께 나간다 |
| 11 | 조회 실패 배너 | Alert(danger) + Button | `약관 버전을 불러오지 못했어요. ` + `목록으로` — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:61-63` | 수정 진입 실패 | N | Y | — | 숨김 | — | — | 수정 + 조회 실패 | '다시 시도'가 없다 |
| 12 | 종류 없음 배너 | Alert(warning) + Button | `약관 종류가 필요해요. 목록에서 종류를 고르고 다시 등록하세요. ` + `목록으로` — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:77-79` | 등록 진입에 종류가 없을 때 | N | Y | — | 숨김 | — | — | 등록 + 종류 없음 | 경고 톤이다(오류 톤이 아니다) |
| 13 | 스켈레톤 | 상태 표시 | (없음) | 카드 안 4행 | N | Y | — | — | — | — | 수정 진입에서 조회가 끝나기 전 | `apps/admin/src/pages/content/terms/TermsFormPage.tsx:96-99` |

## 4. 기능 명세

### 4.1 등록 진입 — 약관 종류 받기 (이 화면 고유)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 새 버전이 어느 약관 종류에 속하는지 정한다 |
| 실행 조건 | 주소에 id 가 없을 때(등록) |
| 사용자 동작 | 목록에서 `새 버전 등록` 클릭 · 링크 열기 |
| 시스템 처리 | 주소의 `type` 값을 그대로 종류로 쓴다 — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:71`. **이 화면에는 종류를 고르는 입력이 없다** |
| 데이터 처리 | 저장 payload 에 종류 id 가 함께 실린다 — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:99` |
| Validation | 종류가 비어 있으면 폼을 그리지 않고 경고 배너를 세운다 — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:73-84` |
| API 호출 여부 | N — 종류 목록을 다시 조회하지 않는다(값만 받는다) |
| 성공 처리 | 폼이 그려진다 |
| 실패 처리 | 경고 배너 `약관 종류가 필요해요. 목록에서 종류를 고르고 다시 등록하세요. ` + '목록으로' — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:77` |
| 예외 처리 | ⚠ **주소의 종류 값이 실재하는 종류인지 검사하지 않는다** — `?type=없는값` 으로 들어오면 폼이 열리고 저장까지 시도된다. 수정에서는 불러온 버전의 종류를 쓰므로 이 문제가 없다 — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:71` |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 저장 시 그 종류의 목록이 무효화된다 — `apps/admin/src/pages/content/terms/queries.ts:62-64` |
| 로그 기록 여부 | N |

### 4.2 수정 진입 — 기존 값 불러오기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 고칠 버전의 현재 값으로 폼을 채운다 |
| 실행 조건 | 주소에 id 가 있을 때 |
| 사용자 동작 | 목록·상세에서 수정 클릭 · 링크 열기 |
| 시스템 처리 | 상세를 조회해 도착하면 폼을 그 값으로 다시 세운다 — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:89-91`. 종류는 불러온 버전의 것을 쓴다 — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:71` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 상세 1건 |
| 성공 처리 | 네 칸이 기존 값으로 채워진다 |
| 실패 처리 | 폼 대신 배너: `약관 버전을 불러오지 못했어요. ` + '목록으로' — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:61`. 없는 id 와 그 밖의 실패를 가르지 않는다 |
| 예외 처리 | 조회가 끝나기 전에는 카드 안이 스켈레톤 4행이다 |
| 화면 변경 사항 | 입력영역 전체 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.3 저장(등록 · 수정)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 입력한 버전을 만들거나 고친다 |
| 실행 조건 | §6 의 검증을 전부 통과했을 때 |
| 사용자 동작 | '등록'/'저장' 클릭 또는 폼에서 Enter |
| 시스템 처리 | 이전 오류 배너를 지우고 요청 1건을 보낸다. 진행 중에는 네 입력과 두 버튼이 전부 잠긴다 |
| 데이터 처리 | 등록은 새 버전 1건, 수정은 그 버전의 네 값이 바뀐다. **지금은 저장되지 않는다**(§1) |
| Validation | §6 전부 |
| API 호출 여부 | Y — 등록 또는 수정 1건 |
| 성공 처리 | 토스트가 뜨고 **목록으로** 간다. 등록 `MSG-CONTENT-TERMS-FORM-01` `약관 버전을 등록했어요.` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:124` · 수정 `MSG-CONTENT-TERMS-FORM-02` `약관 버전을 저장했어요.` — `:111` |
| 실패 처리 | 화면에 남고 카드 맨 위 배너: `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:103`. 입력은 그대로 유지된다 |
| 예외 처리 | 요청이 중단되면(화면을 떠나 언마운트) 아무 표시도 하지 않는다 — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:87,102`. ⚠ 동기 중복 제출 잠금이 없다(버튼 비활성만으로 막는다) |
| 화면 변경 사항 | 오류영역 · 입력영역 · 버튼영역 → 화면 전체(성공 시) |
| 후속 동작 | 그 종류의 버전 목록과 이 버전의 상세가 무효화되어 다시 불린다 — `apps/admin/src/pages/content/terms/queries.ts:78-81` |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.4 취소

| 항목 | 내용 |
|---|---|
| 기능 목적 | 저장하지 않고 목록으로 돌아간다 |
| 실행 조건 | 저장 중이 아닐 때 |
| 사용자 동작 | '취소' 클릭 · '목록으로' 클릭 |
| 시스템 처리 | 목록 경로로 이동한다 |
| 데이터 처리 | 입력이 버려진다 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 목록이 열린다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | ⚠ **확인을 묻지 않는다.** 이 폼에는 미저장 이탈 가드가 없어(§1) 반쯤 쓴 전문이 조용히 사라진다. 앱 안 링크 클릭·뒤로가기·탭 닫기도 마찬가지다 |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 목록으로 복귀 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 등록 진입 | `/content/terms/new?type=…` | 주소의 종류를 읽어 폼을 세운다 | 화면 전체 | 빈 폼 |
| 등록 진입(종류 없음) | `/content/terms/new` | 폼을 그리지 않고 경고 배너 | 종류 없음 영역 | 배너 |
| 수정 진입 | `/content/terms/:id/edit` | 상세 조회 → 값 채우기 | 화면 전체 | 스켈레톤 → 채워진 폼 |
| 상세 조회 실패 | 오류 | 폼을 감추고 배너 | 조회 실패영역 | 배너 |
| 상태 변경 | 상태 select | 값만 바뀐다 — **다른 칸의 잠금·필수 여부를 바꾸지 않는다** | 상태 | 변화 없음 |
| 본문 입력 | 타이핑 | 값 갱신 + 글자 수 카운터. 입력 중 재검증하지 않는다 — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:199` | 본문 | 카운터 갱신 |
| 제출 | 버튼 클릭 또는 Enter | 배너를 지우고 검증 → 요청 | 폼 | 저장 중 상태 |
| 검증 실패 | 위반이 있을 때 | 요청을 만들지 않고 첫 위반 필드로 포커스(RHF 기본) | 입력영역 | 인라인 오류 |
| 저장 중 | 요청이 나간 뒤 | 입력 4칸과 버튼 2개가 잠기고 제출 라벨이 `저장 중…` | 입력영역 · 버튼영역 | 잠긴 폼 |
| 저장 성공 | 응답 도착 | 토스트 후 목록으로 | 화면 전체 | `SCR-CONTENT-TERMS` |
| 저장 실패 | 오류 | 카드 맨 위 배너 · 입력 유지 | 오류영역 | 폼 + 배너 |
| 취소·목록으로 클릭 | 두 버튼 | **확인 없이** 목록으로 | — | `SCR-CONTENT-TERMS` |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 버전 | 공백만이면 안 된다 | 제출 시 | `버전을 입력하세요. (예: v1.2)` — `apps/admin/src/pages/content/terms/validation.ts:12` | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 버전 | 20자 이하 | 제출 시 | `버전 표기는 20자를 넘을 수 없어요.` — `apps/admin/src/pages/content/terms/validation.ts:13-15` | 〃 (입력 자체도 20자에서 막힌다) |
| 버전 | 같은 종류 안에서 중복 | — | ⚠ **검사하지 않는다** — 같은 표기의 버전을 여러 건 만들 수 있다 | — |
| 시행일 | 비어 있으면 안 된다 | 제출 시 | `시행일을 입력하세요.` — `apps/admin/src/pages/content/terms/validation.ts:18` | 제출 차단 · 인라인 오류 |
| 시행일 | 실재하는 `YYYY-MM-DD` | 제출 시 | `시행일을 YYYY-MM-DD 형식으로 입력하세요.` — `apps/admin/src/pages/content/terms/validation.ts:21` | 〃 |
| 시행일 | 상태와의 앞뒤 | — | ⚠ **검사하지 않는다** — 미래 시행일 + `시행중` 조합이 그대로 저장된다([목록 문서](index.md) §4.5) | — |
| 상태 | `active`·`scheduled`·`archived` 중 하나 | 제출 시 | 없음(select 라 도달하지 않는다) | — |
| 상태 | 한 종류에 `시행중` 이 하나뿐인지 | — | ⚠ **검사하지 않는다** | — |
| 본문 | 공백만이면 안 된다 | 제출 시 | `본문을 입력하세요.` — `apps/admin/src/pages/content/terms/validation.ts:25` | 제출 차단 · 인라인 오류 |
| 본문 | 20,000자 이하 | 제출 시 | `본문은 20000자를 넘을 수 없어요.` — `apps/admin/src/pages/content/terms/validation.ts:26-28` | 〃 |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/content/terms/validation.ts`.

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `약관 버전을 불러오지 못했어요. ` — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:61`. ⚠ 없는 id 와 서버 오류를 같은 문장으로 말한다 | 폼 대신 배너 | '목록으로'. 재시도 컨트롤이 없다 |
| 약관 종류 없음(등록) | `약관 종류가 필요해요. 목록에서 종류를 고르고 다시 등록하세요. ` — `apps/admin/src/pages/content/terms/TermsFormPage.tsx:77` | 폼을 그리지 않는다(경고 톤 배너) | '목록으로' 눌러 종류를 고른 뒤 다시 등록 |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/terms/components/VersionForm.tsx:103` | 화면에 남고 배너 · 입력 유지 | 제출 재클릭 |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다 | — | — |
| API 오류 | 저장 실패와 같은 한 줄. 서버 응답 원문을 노출하지 않는다. 오류 참조 코드도 없다 | 배너 | 제출 재클릭 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | ⚠ **권한 문구가 없다** — 이 폼은 껍데기도 공통 컨트롤러도 쓰지 않아 권한 문을 지나지 않는다(§9) | 실제 차단은 서버의 몫 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 — 401 이면 앱이 로그인 화면으로 보낸다 | 세션 폐기 · 원래 경로 보존 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | ⚠ 충돌 처리가 없다 — 409/412 도 일반 저장 실패 문장으로 뭉개진다 | 배너 하나 | 목록에서 최신 상태 확인 |
| 중복 데이터 | ⚠ 막지 않는다(§6) | — | — |
| 파일 업로드 실패 | 해당 없음 — 파일 입력이 없다 | — | — |

**미저장 이탈** — ⚠ 이 폼에는 가드가 없다. 링크 한 번, 뒤로가기 한 번에 입력이 사라지며 어떤 확인도 뜨지 않는다(§1).

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩(등록) | 조회가 없다 — 빈 폼이 즉시 그려진다 | 취소 ○ · 등록 ○ | N | — |
| 최초 로딩(수정) | 카드 안 스켈레톤 4행 | 목록으로 ○ | Y | — |
| 데이터 있음 | 네 칸이 값으로 채워져 있다 | 취소 ○ · 제출 ○ | N | — |
| 데이터 없음(등록 진입) | 버전·시행일·본문이 비어 있고 상태는 `시행예정` | 취소 ○ · 등록 ○ | N | 버전 힌트 `예: v1.2` |
| 종류 없음(등록 진입) | 폼이 없고 경고 배너 하나 | 목록으로 ○ | N | `약관 종류가 필요해요. 목록에서 종류를 고르고 다시 등록하세요. ` |
| 조회 실패(수정) | 폼이 없고 danger 배너 하나 | 목록으로 ○ | N | `약관 버전을 불러오지 못했어요. ` |
| 저장 중 | 입력 4칸과 버튼 2개가 잠기고 제출 라벨이 `저장 중…` | 취소 × · 제출 × | Y | 라벨이 곧 안내다 |
| 저장 실패 | 카드 맨 위 배너 · 입력 유지 | 취소 ○ · 제출 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 취소 ○ · 제출 ○ | N | §6 의 해당 문구 |
| 읽기 전용(권한) | ⚠ 나타나지 않는다 — 권한 판정이 없다(§9) | — | N | — |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | — | — | — |
| 운영자 | 역할의 `page:/content/terms` 권한을 따른다 | 〃 | 〃 | — | — | — | — | — |
| 뷰어 | ○ | × | × | — | — | — | — | — |
| 권한 없음 | × | × | × | — | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — 읽기 권한이 없으면 라우트 가드가 `접근 권한이 없어요` 화면을 세운다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. ⚠ **등록·수정 권한만 없으면 이 폼이 그대로 열리고 저장도 시도된다.** 같은 상태가 공지·FAQ·팝업·배너·처리방침 폼에도 있다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-TERMS` | `새 버전 등록` 클릭 | `SCR-CONTENT-TERMS-FORM`(등록) | N | 고른 종류가 있음 | `?type={종류 id}` | — |
| `SCR-CONTENT-TERMS` · `SCR-CONTENT-TERMS-DETAIL` | 수정 클릭 | `SCR-CONTENT-TERMS-FORM`(수정) | N | 대상이 있음 | 버전 id | — |
| `SCR-CONTENT-TERMS-FORM` | 등록·수정 성공 | `SCR-CONTENT-TERMS` | N | 요청 성공 | 없음 | — |
| `SCR-CONTENT-TERMS-FORM` | '취소'·'목록으로' 클릭 | `SCR-CONTENT-TERMS` | N | 없음 | 없음 | **확인을 묻지 않는다**(이탈 가드 없음) |
| `SCR-CONTENT-TERMS-FORM` | 조회 실패 후 '목록으로' | `SCR-CONTENT-TERMS` | N | 수정 진입 실패 | 없음 | — |
| `SCR-CONTENT-TERMS-FORM` | 종류 없음 배너의 '목록으로' | `SCR-CONTENT-TERMS` | N | 등록 진입에 종류 없음 | 없음 | — |
| `SCR-CONTENT-TERMS-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면이 여는 팝업(모달)도, 화면 고유 확인 다이얼로그도 없다.** 공통 이탈 가드도 걸리지 않는다(§1).

**이 화면의 결과 통지 토스트는 2건**이고 §4.3 에 문구 그대로 적혀 있다. 인벤토리는 이 두 건을 폼 본문 파일(`pages/content/terms/components/VersionForm.tsx`)의 몫으로 세고 있으며(성공 2 · 실패 0) 건수가 일치한다.
