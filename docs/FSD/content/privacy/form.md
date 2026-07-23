# 처리방침 버전 등록 · 수정

> 이 화면은 [약관 버전 등록·수정](../terms/form.md)(`SCR-CONTENT-TERMS-FORM`)에서 **약관 종류 축
> 하나만 뺀 것**이다. 골격(카드 하나 · 버전·시행일·상태·본문 · 저장 실패 배너 · 저장 뒤 목록으로 ·
> **미저장 이탈 가드 없음** · 권한 게이팅 없음)이 모두 같다. 아래 각 절은 **차이와 문구만** 적는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 처리방침 버전 등록 · 수정 |
| 화면 ID | `SCR-CONTENT-PRIVACY-FORM` |
| 메뉴 경로 | 콘텐츠 관리 > 개인정보 처리방침 > 새 버전 등록 (또는 행의 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 개인정보 처리방침 버전 한 건의 버전 표기·시행일·상태·전문을 정한다.

**업무 배경** — 약관 버전 폼과 같다. 개정 시행일이 곧 법적 효력의 기준이라 세 값이 본문만큼 중요하다.

**화면 설명** — 위쪽에 '목록으로', 아래 카드 하나에 (버전 · 시행일 · 상태) 한 줄과 본문이 놓인다.

**주요 사용자** — 최상위 관리자 · 개인정보 문서를 관리하는 운영자.

**사용 시나리오**

1. 목록에서 '새 버전 등록'을 눌러 v2.1 을 쓰고 시행일을 다음 달로, 상태를 '시행예정'으로 둔다.
2. 시행일이 되어 v2.1 을 열어 상태를 '시행중'으로 바꾼다.
3. 저장하지 않은 채 다른 메뉴를 누른다 → ⚠ **아무 확인도 뜨지 않고 입력이 사라진다**(§7).

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈. **등록에 필요한 사전 값이 없다**(종류 축이 없다).

**후행 처리** — 등록·수정 모두 성공하면 목록으로 간다 — `apps/admin/src/pages/content/privacy/PrivacyFormPage.tsx:87`.

**관련 화면** — [개인정보 처리방침](index.md) · [처리방침 버전 상세](detail.md) · [약관 버전 등록·수정](../terms/form.md)(같은 형태) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/content/privacy` 가 덮는다.

**관련 기능** — 여기서 고른 상태가 목록·상세의 `현재` 배지를 정한다([목록 문서](index.md) §4).

**관련 API** — 등록 1건 · 수정 1건 · (수정 진입 시) 상세 조회 1건. **백엔드가 없다** — `apps/admin/src/pages/content/privacy/data-source.ts:78`(등록) · `:88`(수정) · `:57`(상세).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/privacy/PrivacyFormPage.tsx` (폼 본문 `components/VersionForm.tsx` · 검증 `validation.ts` · 상수 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 약관 버전 폼과 같다. 저장이 픽스처를 바꾸지 않고, **미저장 이탈 가드가 없으며**, 권한 게이팅이 없다.

## 2. 페이지(UI) 구성

약관 버전 폼과 같되 **'종류 없음 영역'이 없다.** 남는 영역은 상단 이동 · 조회 실패 · 오류 · 입력 · 버튼 다섯이다 — `apps/admin/src/pages/content/privacy/PrivacyFormPage.tsx:55-90`.

## 3. UI 컴포넌트 정의

약관 버전 폼과 같은 것은 다시 적지 않는다. 다른 문구만 적는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 목록으로 | Button(text + 아이콘) | `목록으로` | 목록 경로로 이동 | N | N | 없음 | — | — | — | 항상 | — |
| 2 | 카드 제목 | Heading(h2) | 등록 `새 처리방침 버전 등록` · 수정 `처리방침 버전 수정` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:132` | h1 페이지 제목이 없다 | Y | Y | — | 수정 대상 유무 | — | — | 항상 | — |
| 3 | 저장 실패 배너 | Alert(danger) | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:103` | 실패의 유일한 표면 | N | Y | — | 숨김 | — | — | 저장 실패 | 오류 참조 코드가 붙지 않는다 |
| 4 | 버전 | TextField | `버전` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:141` | `v2.1` 같은 표기 | Y | N | 저장 중 | 등록=빈 값 | `예: v2.1` — `:151` | 20자 — `apps/admin/src/pages/content/privacy/types.ts:41` | 항상 | 약관 폼의 예시(`예: v1.2`)와 다르다 |
| 5 | 시행일 | 날짜 입력(date) | `시행일` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:163` | 이 버전이 적용되는 날 | Y | N | 저장 중 | 등록=빈 값 | 브라우저 기본 | 달력 입력 | 항상 | 상태와의 앞뒤를 검사하지 않는다 |
| 6 | 상태 | SelectField | `상태` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:181` | `시행중` · `시행예정` · `만료` — `apps/admin/src/pages/content/privacy/types.ts:21-25` | Y | N | 저장 중 | `시행예정` | — | 세 값 중 하나 | 항상 | — |
| 7 | 본문 | TextareaField | `본문` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:193` | 처리방침 전문. 12행 높이 | Y | N | 저장 중 | 등록=빈 값 | `개인정보 처리방침 본문을 입력하세요.` — `:203` | 20,000자 — `apps/admin/src/pages/content/privacy/types.ts:42` | 항상 | 글자 수 카운터 |
| 8 | 취소 · 제출 | Button 둘 | `취소` · 등록 `등록` / 수정 `저장` / 저장 중 `저장 중…` | 목록으로 · 검증 후 요청 | N/Y | N | 저장 중 | — | — | — | 항상 | Enter 로도 제출된다 |
| 9 | 조회 실패 배너 | Alert(danger) + Button | `처리방침 버전을 불러오지 못했어요. ` + `목록으로` — `apps/admin/src/pages/content/privacy/PrivacyFormPage.tsx:60` | 수정 진입 실패 | N | Y | — | 숨김 | — | — | 수정 + 조회 실패 | '다시 시도'가 없다 |
| 10 | 스켈레톤 | 상태 표시 | (없음) | 카드 안 4행 | N | Y | — | — | — | — | 수정 진입에서 조회가 끝나기 전 | — |

## 4. 기능 명세

약관 버전 폼의 §4.2(수정 진입) · §4.3(저장) · §4.4(취소)와 **동작이 같다**. §4.1(약관 종류 받기)은 **성립하지 않는다.** 다른 것만 적는다.

| 항목 | 처리방침의 값 |
|---|---|
| 등록 진입 | 사전 값이 필요 없다 — `/content/privacy/new` 만으로 폼이 열린다 |
| 저장 payload | 종류 id 가 없다 — 폼 값 넷이 그대로 나간다 — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:106,119` |
| 등록 성공 | 토스트 `MSG-CONTENT-PRIVACY-FORM-01` `처리방침 버전을 등록했어요.` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:122` → 목록으로 |
| 수정 성공 | 토스트 `MSG-CONTENT-PRIVACY-FORM-02` `처리방침 버전을 저장했어요.` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:109` → 목록으로 |
| 저장 실패 배너 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:103` |
| 조회 실패 배너 | `처리방침 버전을 불러오지 못했어요. ` — `apps/admin/src/pages/content/privacy/PrivacyFormPage.tsx:60` |
| 무효화 대상 | 저장에 성공하면 처리방침 버전 목록과 이 버전의 상세가 무효화된다 — `queries.ts` |
| 이탈 가드 | ⚠ **없다** — 약관 버전 폼과 같은 결함이다 |

**이 화면 고유의 기능은 없다.**

## 5. 이벤트 정의

약관 버전 폼의 이벤트 표에서 **'등록 진입(종류 없음)' 한 줄을 뺀 것**이다. 나머지(등록 진입 · 수정 진입 · 조회 실패 · 상태 변경 · 본문 입력 · 제출 · 검증 실패 · 저장 중 · 저장 성공/실패 · 취소)는 같고 문구와 경로만 다르다.

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 버전 | 공백만이면 안 된다 | 제출 시 | `버전을 입력하세요. (예: v2.1)` — `apps/admin/src/pages/content/privacy/validation.ts:12` | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 버전 | 20자 이하 | 제출 시 | `버전 표기는 20자를 넘을 수 없어요.` — `apps/admin/src/pages/content/privacy/validation.ts:13-15` | 〃 |
| 버전 | 중복 | — | ⚠ 검사하지 않는다 | — |
| 시행일 | 비어 있으면 안 된다 | 제출 시 | `시행일을 입력하세요.` — `apps/admin/src/pages/content/privacy/validation.ts:18` | 제출 차단 · 인라인 오류 |
| 시행일 | 실재하는 `YYYY-MM-DD` | 제출 시 | `시행일을 YYYY-MM-DD 형식으로 입력하세요.` — `apps/admin/src/pages/content/privacy/validation.ts:21` | 〃 |
| 시행일 | 상태와의 앞뒤 | — | ⚠ 검사하지 않는다 | — |
| 상태 | `active`·`scheduled`·`archived` 중 하나 | 제출 시 | 없음(select) | — |
| 상태 | `시행중` 이 하나뿐인지 | — | ⚠ 검사하지 않는다 | — |
| 본문 | 공백만이면 안 된다 | 제출 시 | `본문을 입력하세요.` — `apps/admin/src/pages/content/privacy/validation.ts:25` | 제출 차단 · 인라인 오류 |
| 본문 | 20,000자 이하 | 제출 시 | `본문은 20000자를 넘을 수 없어요.` — `apps/admin/src/pages/content/privacy/validation.ts:26-28` | 〃 |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/content/privacy/validation.ts`. 약관 스키마와 규칙이 같고 버전 예시 문구만 다르다.

## 7. 예외 처리

약관 버전 폼의 §7 과 같다. '약관 종류 없음' 줄이 빠지고 문구가 다르다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `처리방침 버전을 불러오지 못했어요. ` — `apps/admin/src/pages/content/privacy/PrivacyFormPage.tsx:60`. ⚠ 없는 id 와 서버 오류를 같은 문장으로 말한다 | 폼 대신 배너 | '목록으로'. 재시도 컨트롤이 없다 |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/privacy/components/VersionForm.tsx:103` | 화면에 남고 배너 · 입력 유지 | 제출 재클릭 |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다 | — | — |
| API 오류 | 저장 실패와 같은 한 줄. 오류 참조 코드가 없다 | 배너 | 제출 재클릭 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | ⚠ 권한 문구가 없다 — 껍데기도 공통 컨트롤러도 쓰지 않는다(§9) | 실제 차단은 서버의 몫 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | ⚠ 충돌 처리가 없다 | 배너 하나 | 목록에서 최신 상태 확인 |
| 중복 데이터 | ⚠ 막지 않는다(§6) | — | — |
| 파일 업로드 실패 | 해당 없음 — 파일 입력이 없다 | — | — |

**미저장 이탈** — ⚠ 가드가 없다. 링크 한 번, 뒤로가기 한 번, '취소' 한 번에 입력이 사라지며 어떤 확인도 뜨지 않는다.

## 8. 화면 상태(State)

약관 버전 폼의 §8 에서 '종류 없음' 줄을 뺀 것이다. 문구만 다르다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩(등록) | 조회가 없다 — 빈 폼이 즉시 그려진다 | 취소 ○ · 등록 ○ | N | — |
| 최초 로딩(수정) | 카드 안 스켈레톤 4행 | 목록으로 ○ | Y | — |
| 데이터 있음 | 네 칸이 값으로 채워져 있다 | 취소 ○ · 제출 ○ | N | — |
| 데이터 없음(등록 진입) | 버전·시행일·본문이 비어 있고 상태는 `시행예정` | 취소 ○ · 등록 ○ | N | 버전 힌트 `예: v2.1` |
| 조회 실패(수정) | 폼이 없고 danger 배너 하나 | 목록으로 ○ | N | `처리방침 버전을 불러오지 못했어요. ` |
| 저장 중 | 입력 4칸과 버튼 2개가 잠기고 제출 라벨이 `저장 중…` | 취소 × · 제출 × | Y | 라벨이 곧 안내다 |
| 저장 실패 | 카드 맨 위 배너 · 입력 유지 | 취소 ○ · 제출 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 취소 ○ · 제출 ○ | N | §6 의 해당 문구 |
| 읽기 전용(권한) | ⚠ 나타나지 않는다 — 권한 판정이 없다(§9) | — | N | — |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | — | — | — |
| 운영자 | 역할의 `page:/content/privacy` 권한을 따른다 | 〃 | 〃 | — | — | — | — | — |
| 뷰어 | ○ | × | × | — | — | — | — | — |
| 권한 없음 | × | × | × | — | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — 약관 버전 폼과 같다. ⚠ 등록·수정 권한만 없으면 폼이 그대로 열리고 저장도 시도된다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-PRIVACY` | `새 버전 등록` 클릭 | `SCR-CONTENT-PRIVACY-FORM`(등록) | N | 없음 | 없음 | — |
| `SCR-CONTENT-PRIVACY` · `SCR-CONTENT-PRIVACY-DETAIL` | 수정 클릭 | `SCR-CONTENT-PRIVACY-FORM`(수정) | N | 대상이 있음 | 버전 id | — |
| `SCR-CONTENT-PRIVACY-FORM` | 등록·수정 성공 | `SCR-CONTENT-PRIVACY` | N | 요청 성공 | 없음 | — |
| `SCR-CONTENT-PRIVACY-FORM` | '취소'·'목록으로' 클릭 | `SCR-CONTENT-PRIVACY` | N | 없음 | 없음 | **확인을 묻지 않는다**(이탈 가드 없음) |
| `SCR-CONTENT-PRIVACY-FORM` | 조회 실패 후 '목록으로' | `SCR-CONTENT-PRIVACY` | N | 수정 진입 실패 | 없음 | — |
| `SCR-CONTENT-PRIVACY-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면이 여는 팝업(모달)도, 화면 고유 확인 다이얼로그도 없다.** 공통 이탈 가드도 걸리지 않는다.

**이 화면의 결과 통지 토스트는 2건**이고 §4 의 표에 문구 그대로 적혀 있다. 인벤토리는 이 두 건을 폼 본문 파일(`pages/content/privacy/components/VersionForm.tsx`)의 몫으로 세고 있으며(성공 2 · 실패 0) 건수가 일치한다.
