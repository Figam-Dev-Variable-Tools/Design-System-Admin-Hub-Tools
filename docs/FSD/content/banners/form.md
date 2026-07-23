# 배너 등록 · 수정

> 이 화면은 [팝업 등록·수정](../popups/form.md)(`SCR-CONTENT-POPUPS-FORM`)과 **글자 수준까지 같은 형태**다 —
> 2단 레이아웃(왼쪽 입력 · 오른쪽 실시간 미리보기) · 이미지 업로드 · 기간 · 순서 자동 채움 ·
> 노출 체크박스 · 취소는 목록으로 · 공통 폼 컨트롤러를 쓰지 않는 한계까지 같다.
> 아래 각 절은 **다른 것만** 적는다. 다른 것은 셋이다: **위치 축이 메인/서브** ·
> **순서 칸의 이름이 `정렬 순서`** · **문구**.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 배너 등록 · 수정 |
| 화면 ID | `SCR-CONTENT-BANNERS-FORM` |
| 메뉴 경로 | 콘텐츠 관리 > 배너 관리 > 배너 등록 (또는 행의 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 홈페이지에 걸릴 배너 한 건의 이미지·링크·위치·기간·정렬 순서·ON/OFF 를 정한다.

**업무 배경** — 팝업과 같다. 배너도 이미지가 곧 내용이라 저장 전에 모양을 확인할 수 있어야 한다.

**화면 설명** — 팝업 폼과 같은 2단 배치다.

**주요 사용자** — 최상위 관리자 · 콘텐츠를 다루는 운영자.

**사용 시나리오**

1. 새 기획전 배너 이미지를 올리고 기간을 정해 등록한다.
2. 배너 링크가 바뀌어 수정한다 → 저장하면 목록으로 돌아간다.
3. 종료일을 시작일보다 앞으로 적는다 → 기간 칸 아래 오류가 뜬다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈. 수정이면 그 id 의 배너가 실재해야 한다.

**후행 처리** — 등록·수정 모두 성공하면 목록으로 간다(상세가 없다). 정렬 순서는 이 폼에서도, [목록의 드래그](index.md)에서도 바꿀 수 있다 — 즉 **편집 경로가 둘**이다.

**관련 화면** — [배너 관리](index.md) · [팝업 등록·수정](../popups/form.md)(같은 형태) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/content/banners` 가 덮는다.

**관련 기능** — 목록의 ON/OFF 토글과 드래그 재정렬이 이 폼의 두 값을 각각 바꾼다.

**관련 API** — 등록 1건 · 수정 1건 · 상세 조회 1건 · 다음 정렬 순서 조회 1건. **백엔드가 없다** — `apps/admin/src/pages/content/banners/data-source.ts:170`(등록) · `:177`(수정) · `:88`(상세) · `:135`(다음 순서). **이미지 업로드 엔드포인트도 없다** — `apps/admin/src/pages/content/banners/data-source.ts:4`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/banners/BannerFormPage.tsx` (미리보기 `components/BannerPreview.tsx` · 검증 `validation.ts` · 상수 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 팝업 폼과 같다. 이미지가 서버로 올라가지 않아 폼을 떠나면 목록 썸네일이 깨지고(`apps/admin/src/shared/crud/validation.ts:41-62`), 저장은 픽스처를 바꾸지 않는다(`apps/admin/src/pages/content/banners/data-source.ts:170-186`).

## 2. 페이지(UI) 구성

팝업 폼과 같다(제목 · 오류 · 왼쪽 입력 카드 · 오른쪽 미리보기 카드 · 버튼 · 조회 실패).

## 3. UI 컴포넌트 정의

팝업 폼과 같은 것은 다시 적지 않는다. 다른 값과 문구만 적는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 화면 제목 | Heading(h1) | 등록 `배너 등록` · 수정 `배너 수정` | — | Y | Y | — | 주소의 id 유무 | — | — | 항상 | — |
| 2 | 제목 | TextField | `제목` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:240` | 관리용 이름이자 미리보기 제목 | Y | N | 저장 중 또는 상세 로딩 중 | 등록=빈 값 | `예: 봄 시즌 기획전` — `:247` | 100자 — `apps/admin/src/pages/content/banners/types.ts:57` | 항상 | — |
| 3 | 이미지 | ImageUploadField | `이미지` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:258` | 팝업 폼과 같다 | Y | N | 〃 | 등록=없음 | 빈 상태 안내 `클릭하거나 이미지를 이 영역에 끌어다 놓으세요` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` | 이미지 파일만 · 최대 5MB | 항상 | 힌트 `이미지를 끌어다 놓거나 클릭해 업로드해요.` — `:266` |
| 4 | 링크 URL | TextField(type=url) | `링크 URL` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:271` | 배너를 눌렀을 때 갈 주소 | N | N | 〃 | 빈 값 | `https://example.com/promo` — `:280` | `http(s)://` 로 시작 | 항상 | 힌트 `클릭 시 이동할 주소 (선택)` — `:273` |
| 5 | 노출 위치 | SelectField | `노출 위치` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:291` | `메인` · `서브` **둘뿐이다** — `apps/admin/src/pages/content/banners/types.ts:13-19` | Y | N | 〃 | `메인` — `:91` | — | 두 값 중 하나 | 항상 | 팝업은 셋이다 |
| 6 | 정렬 순서 | 숫자 입력(number, 최소 0) | `정렬 순서` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:303` | 작을수록 앞 | Y | N | 〃 | 등록=**현재 최대 + 1** 자동 채움 — `:142-149` · 수정=기존 값 | 없음 | 0 이상의 정수 | 항상 | 힌트 `작을수록 앞에 노출돼요.` — `:306`. 팝업은 이 칸의 이름이 `우선순위` 다 |
| 7 | 노출 기간 | DateRangeField | `노출 기간` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:325` | 시작일·종료일 | Y | N | 〃 | 등록=빈 값 | 브라우저 기본 | 달력 입력 | 항상 | 두 칸의 오류가 한 자리에 모인다 |
| 8 | 노출 ON | Checkbox | `노출 ON` | 끄면 기간 안이라도 노출되지 않는다 | N | N | 〃 | 켜짐 | — | — | 항상 | 목록의 토글과 같은 값 |
| 9 | 미리보기 | 표현 전용 컴포넌트 | 카드 제목 `미리보기` | 제목·이미지·링크·위치 라벨·ON 여부를 받아 그린다 — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:355-361` | N | Y | — | 입력값을 따른다 | — | — | 항상 | 입력할 때마다 즉시 갱신 |
| 10 | 조회 실패 배너 | Alert(danger) + Button | `배너를 불러오지 못했어요. ` + `목록으로` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:214-216` | 수정 진입 실패 | N | Y | — | 숨김 | — | — | 수정 + 조회 실패 | '다시 시도'가 없다 |

## 4. 기능 명세

팝업 폼의 §4 전체(수정 진입 · 저장 · 순서 자동 채움 · 이미지 · 미리보기 · 이탈 가드)와 동작이 같다. 다른 것만 적는다.

| 항목 | 배너의 값 |
|---|---|
| 폼을 채우는 값 | 제목 · 이미지 · 링크 · **위치(메인/서브)** · 시작일 · 종료일 · ON 여부 · 정렬 순서(문자열) — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:132-139` |
| 저장 payload | 정렬 순서를 숫자로 바꿔 보낸다 — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:174` |
| 등록 성공 | 토스트 `MSG-CONTENT-BANNERS-FORM-01` `배너를 등록했어요.` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:200` → 목록으로 |
| 수정 성공 | 토스트 `MSG-CONTENT-BANNERS-FORM-02` `배너를 저장했어요.` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:187` → 목록으로 |
| 저장 실패 배너 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:179` |
| 조회 실패 배너 | `배너를 불러오지 못했어요. ` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:214` |
| 이탈 가드 문구 | `배너에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:37-38` |
| 순서 자동 채움 | 등록 진입에서만, 한 번만, 사용자 값을 덮지 않는다 — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:142-149`. 조회가 실패해도 알리지 않는다 |

## 5. 이벤트 정의

팝업 폼의 이벤트 표와 같다(다음 순서 도착 · 파일 선택·드롭 · 이미지 제거 · 입력 변경 → 미리보기 갱신 · 기간 입력 · 노출 ON 토글 · 취소 → 목록). **이 화면에만 있는 이벤트는 없다.**

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 제목 | 공백만이면 안 된다 · 100자 이하 | 제출 시 | `제목을 입력하세요.` · `제목은 100자를 넘을 수 없어요.` — `apps/admin/src/pages/content/banners/validation.ts:17-21` | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 이미지 | 값이 있어야 한다 | 제출 시 | `이미지를 등록하세요.` — `apps/admin/src/pages/content/banners/validation.ts:24-26` | 〃. 형식은 강제하지 않는다(업로드 이음매가 없다) |
| 이미지 | 이미지 파일 · 5MB 이하 | 파일을 고른 즉시 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40` | 값을 바꾸지 않고 인라인 오류 |
| 링크 URL | 비어 있거나 `http(s)://` 로 시작 | 제출 시 | `http(s):// 로 시작하는 URL 을 입력하세요.` — `apps/admin/src/pages/content/banners/validation.ts:28-31` | 제출 차단 · 인라인 오류 |
| 노출 위치 | `main`·`sub` 중 하나 | 제출 시 | 없음(select 라 도달하지 않는다) | — |
| 정렬 순서 | 비어 있으면 안 된다 · 0 이상의 정수 | 제출 시 | `정렬 순서를 입력하세요.` · `정렬 순서는 0 이상의 정수예요.` — `apps/admin/src/pages/content/banners/validation.ts:37-40` | 제출 차단 · 인라인 오류 |
| 노출 기간 | 시작일·종료일이 실재하는 날짜 · 종료일 ≥ 시작일 | 제출 시 | `노출 기간을 YYYY-MM-DD 형식으로 입력하세요.` · `종료일은 시작일보다 빠를 수 없어요.` — `apps/admin/src/pages/content/banners/validation.ts:44-70` | 제출 차단 · 기간 칸에 인라인 오류 |
| 노출 ON | 검증하지 않는다 | — | — | — |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/content/banners/validation.ts`. 팝업과 규칙 형태는 닮았지만 위치·정렬 필드가 달라 각자 스키마를 갖는다 — 같은 파일의 머리말.

## 7. 예외 처리

팝업 폼의 §7 과 같은 표다(같은 한계 — 없는 id 와 서버 오류를 가르지 않고, 오류 참조 코드·충돌 처리·권한 문이 없다). 문구만 다르다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `배너를 불러오지 못했어요. ` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:214` | 폼 대신 배너 | '목록으로' |
| 다음 정렬 순서 조회 실패 | ⚠ 없음 — 칸이 빈 채로 남는다 | 조용히 지나간다 | 직접 숫자를 적는다 |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:179` | 화면에 남고 배너 · 입력 유지 | 제출 재클릭 |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다 | — | — |
| API 오류 | 저장 실패와 같은 한 줄. 오류 참조 코드가 없다 | 배너 | 제출 재클릭 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | ⚠ 권한 문구가 없다(§9) | 실제 차단은 서버의 몫 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | ⚠ 충돌 처리가 없다 | 배너 하나 | 목록에서 최신 상태 확인 |
| 중복 데이터 | 해당 없음 — 제목·정렬 순서 중복을 막는 규칙이 없다 | — | — |
| 파일 업로드 실패 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` · `이미지를 불러오지 못했어요. 다시 선택하세요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40,116` | 인라인 오류만 붙인다 | 다른 파일을 고른다 |

## 8. 화면 상태(State)

팝업 폼의 §8 과 같다. 다른 것은 기본값 하나다 — 노출 위치의 기본이 `메인` 이고, 정렬 순서 힌트가 `작을수록 앞에 노출돼요.` 다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩(등록) | 빈 폼이 즉시 그려지고 오른쪽 미리보기는 빈 값 상태 | 취소 ○ · 등록 ○ | N | 이미지 빈 상태 안내 |
| 최초 로딩(수정) | 두 카드가 그려지되 입력이 전부 잠긴다 | 취소 ○ · 저장 × | Y | — |
| 데이터 있음 | 여덟 값이 채워져 있고 미리보기가 그에 맞게 그려진다 | 취소 ○ · 제출 ○ | N | — |
| 데이터 없음(등록 진입) | 위치=메인 · 노출 ON=켜짐 · 정렬 순서 자동 채움 | 취소 ○ · 등록 ○ | N | `작을수록 앞에 노출돼요.` |
| 조회 실패 | 두 카드가 사라지고 배너 하나 | 목록으로 ○ | N | `배너를 불러오지 못했어요. ` |
| 저장 중 | 입력과 제출이 잠기고 라벨이 `저장 중…` | 취소 × · 제출 × | Y | 라벨이 곧 안내다 |
| 저장 실패 | 입력 카드 맨 위 배너 · 입력 유지 | 취소 ○ · 제출 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 취소 ○ · 제출 ○ | N | §6 의 해당 문구 |
| 읽기 전용(권한) | ⚠ 나타나지 않는다 — 권한 판정이 없다(§9) | — | N | — |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | ○ | — | — |
| 운영자 | 역할의 `page:/content/banners` 권한을 따른다 | 〃 | 〃 | — | — | 〃 | — | — |
| 뷰어 | ○ | × | × | — | — | × | — | — |
| 권한 없음 | × | × | × | — | — | × | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — 팝업 폼과 같다. ⚠ 등록·수정 권한만 없으면 폼이 그대로 열리고 저장도 시도된다.

## 10. 화면 이동(Screen Flow)

팝업 폼의 §10 과 같은 표이며 화면 ID 만 `SCR-CONTENT-BANNERS`·`SCR-CONTENT-BANNERS-FORM` 으로 바뀐다.

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-BANNERS` | `배너 등록` 클릭 | `SCR-CONTENT-BANNERS-FORM`(등록) | N | 없음 | 없음 | — |
| `SCR-CONTENT-BANNERS` | 행 연필 클릭 | `SCR-CONTENT-BANNERS-FORM`(수정) | N | 그 행이 삭제 중이 아님 | 배너 id | — |
| `SCR-CONTENT-BANNERS-FORM` | 등록·수정 성공 | `SCR-CONTENT-BANNERS` | N | 요청 성공 | 없음 | 뒤로가기로 폼에 되돌아오지 않는다 |
| `SCR-CONTENT-BANNERS-FORM` | '취소' 클릭 | `SCR-CONTENT-BANNERS` | N | 없음 | 없음 | — |
| `SCR-CONTENT-BANNERS-FORM` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-CONTENT-BANNERS-FORM` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-CONTENT-BANNERS-FORM` | 조회 실패 후 '목록으로' | `SCR-CONTENT-BANNERS` | N | 수정 진입 실패 | 없음 | — |
| `SCR-CONTENT-BANNERS-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면이 여는 팝업(모달)도, 화면 고유 확인 다이얼로그도 없다.**

**이 화면의 결과 통지 토스트는 2건**이고 §4 에 문구 그대로 적혀 있다. 인벤토리(성공 2 · 실패 0)와 일치한다.
