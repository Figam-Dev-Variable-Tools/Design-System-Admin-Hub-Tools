# 팝업 등록 · 수정

> 이 화면은 [공지 등록·수정](../notices/form.md)(`SCR-CONTENT-NOTICES-FORM`)과 **같은 골격**이다 —
> 한 화면이 등록과 수정을 겸하고, 검증의 정본은 zod 스키마, 저장 실패는 배너, 미저장 이탈은 공통 가드,
> 그리고 **공통 폼 컨트롤러를 쓰지 않는 한계(권한 문·충돌 다이얼로그·동기 중복 제출 잠금 없음)도 같다.**
> 아래 각 절은 **다른 것만** 적는다. 다른 것은 둘이다: **오른쪽 실시간 미리보기가 있는 2단 레이아웃** ·
> **이미지·기간·우선순위 입력**.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 팝업 등록 · 수정 |
| 화면 ID | `SCR-CONTENT-POPUPS-FORM` |
| 메뉴 경로 | 콘텐츠 관리 > 팝업 관리 > 팝업 등록 (또는 행의 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 홈페이지에 뜰 팝업 한 건의 이미지·링크·노출 위치·기간·우선순위·ON/OFF 를 정한다.

**업무 배경** — 팝업은 이미지가 곧 내용이다. 저장한 뒤 홈페이지에서 확인하는 방식이면 잘못된 팝업이 이미 방문자에게 보인 뒤다. 그래서 이 화면은 **입력하는 동안 결과를 보여 준다**.

**화면 설명** — 넓은 화면에서는 왼쪽이 입력 카드, 오른쪽이 미리보기 카드다. 좁으면 세로로 쌓인다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:57-63`. 카드 아래에 취소·제출 버튼이 온다.

**주요 사용자** — 최상위 관리자 · 콘텐츠를 다루는 운영자.

**사용 시나리오**

1. 운영자가 이미지를 끌어다 놓고 기간을 정한 뒤 오른쪽 미리보기로 모양을 확인하고 등록한다.
2. 종료일이 다가온 팝업의 기간만 늘린다 → 저장하면 목록으로 돌아간다.
3. 이미지를 고르지 않고 제출한다 → 이미지 칸 아래 오류가 뜨고 저장되지 않는다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈. 수정이면 그 id 의 팝업이 실재해야 한다.

**후행 처리** — 등록·수정 모두 성공하면 **목록으로** 간다(상세 화면이 없다). 히스토리를 덮어쓴다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:191,204`.

**관련 화면** — [팝업 관리](index.md)(`SCR-CONTENT-POPUPS`) · [배너 등록·수정](../banners/form.md)(같은 형태) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/content/popups` 가 덮는다.

**관련 기능** — 목록의 ON/OFF 토글이 이 폼의 '노출 ON' 체크박스와 같은 값을 바꾼다.

**관련 API** — 등록 1건 · 수정 1건 · 상세 조회 1건 · 다음 우선순위 조회 1건. **백엔드가 없다** — `apps/admin/src/pages/content/popups/data-source.ts:142`(등록) · `:149`(수정) · `:88`(상세) · `:135`(다음 우선순위). **이미지 업로드 엔드포인트도 없다** — `apps/admin/src/pages/content/popups/data-source.ts:5`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/popups/PopupFormPage.tsx` (미리보기 `components/PopupPreview.tsx` · 검증 `validation.ts` · 상수 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실 둘**

| 무엇 | 근거 |
|---|---|
| 이미지가 서버로 올라가지 않는다 | 이미지 입력은 브라우저 안 미리보기 참조만 만든다. **폼을 떠나면 그 참조가 죽어 목록 썸네일이 깨진다.** 검증을 조여도 해결되지 않으며(조이면 저장 자체가 불가능해진다) 고칠 곳은 업로드 이음매다 — `apps/admin/src/shared/crud/validation.ts:41-62` |
| 저장이 픽스처를 바꾸지 않는다 | `apps/admin/src/pages/content/popups/data-source.ts:142-158` |

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 제목영역 | 등록인지 수정인지 · 필수 표기와 미리보기 안내 | 항상 | 전체 | 불가 | 표시 |
| 오류영역 | 저장 실패를 입력 카드 맨 위 danger 배너로 | 저장 실패 | 전체 | 불가 | 숨김 |
| 입력영역(왼쪽 카드) | 제목 · 이미지 · 링크 · 위치 · 우선순위 · 기간 · 노출 ON | 항상 | 전체 | 불가 | 표시 |
| 미리보기영역(오른쪽 카드) | 지금 입력한 값으로 팝업 모양을 그린다 | 항상 | 전체 | 불가 | 표시 |
| 버튼영역 | 취소 · 등록(또는 저장) | 항상 | 전체 | 불가 | 표시 |
| 조회 실패영역 | 수정 진입에서 상세 조회가 실패했을 때 폼 대신 | 수정 + 조회 실패 | 전체 | 불가 | 숨김 |

**두 카드는 나란히 놓이되 화면이 좁으면 세로로 쌓인다** — 고정된 열 개수가 아니라 카드 최소 폭이 배치를 정한다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:58-63`.

## 3. UI 컴포넌트 정의

공지 폼과 같은 것(화면 제목 구조 · 저장 실패 배너 · 취소/제출의 동작 · 조회 실패 배너의 구조)은 다시 적지 않는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 화면 제목 | Heading(h1) | 등록 `팝업 등록` · 수정 `팝업 수정` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:229` | — | Y | Y | — | 주소의 id 유무 | — | — | 항상 | — |
| 2 | 안내문 | Text | `별표(*) 항목은 필수예요. 오른쪽 미리보기로 사용자에게 보일 모습을 확인하세요.` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:231` | — | N | Y | — | — | — | — | 항상 | — |
| 3 | 카드 제목(왼쪽) | Heading(h2) | `팝업 정보` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:238` | — | N | Y | — | — | — | — | 항상 | — |
| 4 | 제목 | TextField | `제목` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:243` | 관리용 이름이자 미리보기 제목 | Y | N | 저장 중 또는 상세 로딩 중 | 등록=빈 값 | `예: 신규 가입 혜택` — `:250` | 100자 — `apps/admin/src/pages/content/popups/types.ts:55`(입력에서도 잘린다) | 항상 | — |
| 5 | 이미지 | ImageUploadField | `이미지` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:261` | 끌어다 놓거나 클릭해 올린다 | Y | N | 〃 | 등록=없음 | 빈 상태 안내 `클릭하거나 이미지를 이 영역에 끌어다 놓으세요` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` | 이미지 파일만 · 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38-40,136` | 항상 | 힌트 `이미지를 끌어다 놓거나 클릭해 업로드해요.` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:269`. 형식 안내 `PNG · JPG · GIF · 최대 5MB` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:271` |
| 6 | 링크 URL | TextField(type=url) | `링크 URL` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:274` | 팝업을 눌렀을 때 갈 주소 | N | N | 〃 | 빈 값 | `https://example.com/event` — `:283` | `http://`·`https://` 로 시작 | 항상 | 힌트 `클릭 시 이동할 주소 (선택)` — `:276` |
| 7 | 노출 위치 | SelectField | `노출 위치` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:294` | 메인 홈 · 이벤트 페이지 · 전체 페이지 — `apps/admin/src/pages/content/popups/types.ts:15-19` | Y | N | 〃 | `메인 홈` — `:94` | — | 세 값 중 하나 | 항상 | 미리보기에 라벨이 그대로 뜬다 |
| 8 | 우선순위 | 숫자 입력(number, 최소 0) | `우선순위` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:306` | 작을수록 먼저 뜬다 | Y | N | 〃 | 등록=**현재 최대 + 1** 을 자동으로 채운다 — `:146-152` · 수정=기존 값 | 없음 | 0 이상의 정수 | 항상 | 힌트 `작을수록 먼저 노출돼요.` — `:309`. 자동 채움은 한 번만 하고 사용자 값을 덮지 않는다 |
| 9 | 노출 기간 | DateRangeField | `노출 기간` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:328` | 시작일·종료일 두 칸 | Y | N | 〃 | 등록=빈 값 | 브라우저 기본 | 달력 입력 | 항상 | **두 칸의 오류가 한 자리에 모인다** — 시작일 오류가 있으면 그것을, 없으면 종료일 오류를 보인다 — `:211` |
| 10 | 노출 ON | Checkbox | `노출 ON` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:351` | 끄면 기간 안이라도 노출되지 않는다 | N | N | 〃 | **켜짐** — `:97` | — | — | 항상 | 목록의 토글과 같은 값이다 |
| 11 | 카드 제목(오른쪽) | Heading(h2) | `미리보기` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:358` | — | N | Y | — | — | — | — | 항상 | — |
| 12 | 미리보기 | 표현 전용 컴포넌트 | (없음) | 제목·이미지·링크·위치 라벨·ON 여부를 받아 그린다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:359-365` | N | Y | — | 입력값을 그대로 따른다 | — | — | 항상 | 입력할 때마다 즉시 다시 그려진다 |
| 13 | 취소 | Button(secondary) | `취소` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:377` | **목록으로** 이동 — `:375` | N | N | 저장 중 | — | — | — | 항상 | 공지 폼과 다르다(그쪽은 브라우저 뒤로) |
| 14 | 제출 | Button(primary) | 등록 `등록` · 수정 `저장` · 저장 중 `저장 중…` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:380` | 검증 후 요청 | Y | N | 저장 중 또는 상세 로딩 중 | — | — | — | 항상 | Enter 로도 제출된다 |
| 15 | 조회 실패 배너 | Alert(danger) + Button | `팝업을 불러오지 못했어요. ` + `목록으로` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:217-219` | 수정 진입 실패 | N | Y | — | 숨김 | — | — | 수정 + 조회 실패 | '다시 시도'가 없다 |

## 4. 기능 명세

### 4.1 수정 진입 · 4.2 저장 · 4.4 저장하지 않은 채 떠나기

공지 폼의 같은 기능과 동작이 같다. 다른 것만 적는다.

| 항목 | 차이 |
|---|---|
| 폼을 채우는 값 | 제목 · 이미지 · 링크 · 위치 · 시작일 · 종료일 · ON 여부 · 우선순위(문자열로 변환) — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:133-142` |
| 저장 payload | 우선순위를 **숫자로 바꿔** 보낸다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:177` |
| 등록 성공 | 토스트 `MSG-CONTENT-POPUPS-FORM-01` `팝업을 등록했어요.` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:203` → 목록으로 |
| 수정 성공 | 토스트 `MSG-CONTENT-POPUPS-FORM-02` `팝업을 저장했어요.` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:190` → **목록으로**(상세가 없다) |
| 저장 실패 배너 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:182` |
| 조회 실패 배너 | `팝업을 불러오지 못했어요. ` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:217` |
| 이탈 가드 문구 | `팝업에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:38-39` |
| 취소 버튼 | 브라우저 뒤로가 아니라 **목록 경로**로 간다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:375` |

### 4.3 우선순위 자동 채움

FAQ 폼의 정렬 순서 자동 채움과 **동작이 같다**([그 문서](../faq/form.md) §4.3) — 등록 진입에서만, 한 번만, 사용자 값을 덮지 않는다. 조회가 실패하면 아무것도 알리지 않는다. 근거는 `apps/admin/src/pages/content/popups/PopupFormPage.tsx:146-152`.

### 4.5 이미지 올리기 · 교체 · 제거

| 항목 | 내용 |
|---|---|
| 기능 목적 | 팝업에 쓸 이미지를 고른다 |
| 실행 조건 | 저장 중·상세 로딩 중이 아닐 때 |
| 사용자 동작 | 드롭존 클릭(파일 선택) · 파일 끌어다 놓기 · 교체 · 제거 |
| 시스템 처리 | 고른 파일이 이미지인지, 5MB 이하인지 그 자리에서 검사한다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:37-41` |
| 데이터 처리 | **업로드하지 않는다.** 브라우저 안 미리보기 참조가 값이 된다(§1 의 확인된 사실) |
| Validation | §6 의 이미지 항목 |
| API 호출 여부 | N — 업로드 엔드포인트가 없다 |
| 성공 처리 | 왼쪽 카드의 미리보기와 **오른쪽 미리보기 카드가 함께** 바뀐다. 안내가 `업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있어요.` 로 바뀐다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:279` |
| 실패 처리 | 필드 아래 인라인 오류: `이미지 파일만 올릴 수 있어요.` 또는 `파일 용량은 5MB 를 넘을 수 없어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40`. 값은 바뀌지 않는다 |
| 예외 처리 | 고른 이미지를 브라우저가 그리지 못하면 `이미지를 불러오지 못했어요. 다시 선택하세요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:116` |
| 화면 변경 사항 | 입력영역의 이미지 칸 · 미리보기영역 |
| 후속 동작 | 폼이 dirty 가 되어 이탈 가드가 걸린다 |
| 로그 기록 여부 | N |

### 4.6 실시간 미리보기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 저장 전에 사용자에게 보일 모습을 확인한다 |
| 실행 조건 | 언제나(빈 값이어도 그려진다) |
| 사용자 동작 | 없음 — 입력이 바뀔 때마다 자동으로 다시 그려진다 |
| 시스템 처리 | 제목 · 이미지 · 링크 · 위치 라벨 · ON 여부 다섯 값을 미리보기에 넘긴다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:359-365` |
| 데이터 처리 | 없음 |
| Validation | 미리보기는 검증하지 않는다 — 검증에 걸린 값도 그려진다 |
| API 호출 여부 | N |
| 성공 처리 | 오른쪽 카드가 바뀐다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 이미지가 없으면 이미지 자리가 비어 있는 모양으로 그려진다 |
| 화면 변경 사항 | 미리보기영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

공지 폼의 이벤트 표를 따르되 '상태 변경 → 게시일 잠금'이 없다. 더해지는 이벤트는 다음과 같다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 다음 우선순위 도착 | 등록 진입에서 조회가 끝남 | 우선순위 칸을 한 번만 채운다 | 우선순위 | 값이 채워진 폼 |
| 파일 선택 · 드롭 | 클릭 또는 드래그앤드롭 | 형식·용량 검사 후 미리보기 | 이미지 | 미리보기 또는 인라인 오류 |
| 이미지 제거 | 제거 클릭 | 값이 비워진다(필수라 저장 시 막힌다) | 이미지 | 빈 드롭존 |
| 입력 변경 | 어느 칸이든 값이 바뀜 | 오른쪽 미리보기를 다시 그린다 | 미리보기영역 | 갱신된 미리보기 |
| 기간 입력 | 시작일·종료일 변경 | 값 갱신(폼이 dirty 가 된다) | 노출 기간 | 변화 없음 |
| 노출 ON 토글 | 체크박스 클릭 | 값 토글 + 미리보기 갱신 | 노출 ON · 미리보기 | 미리보기 갱신 |
| 취소 클릭 | 취소 버튼 | 목록 경로로 이동 | — | `SCR-CONTENT-POPUPS` |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 제목 | 공백만이면 안 된다 | 제출 시 | `제목을 입력하세요.` — `apps/admin/src/pages/content/popups/validation.ts:18` | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 제목 | 100자 이하 | 제출 시 | `제목은 100자를 넘을 수 없어요.` — `apps/admin/src/pages/content/popups/validation.ts:19-21` | 〃 |
| 이미지 | 값이 있어야 한다 | 제출 시 | `이미지를 등록하세요.` — `apps/admin/src/pages/content/popups/validation.ts:24-26` | 〃. **형식은 강제하지 않는다** — 업로드 이음매가 없어 조이면 저장 자체가 불가능해진다 — `apps/admin/src/shared/crud/validation.ts:39-63` |
| 이미지 | 이미지 파일이어야 한다 | 파일을 고른 즉시 | `이미지 파일만 올릴 수 있어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38` | 값을 바꾸지 않고 인라인 오류 |
| 이미지 | 5MB 이하 | 파일을 고른 즉시 | `파일 용량은 5MB 를 넘을 수 없어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:40` | 〃 |
| 링크 URL | 비어 있거나 `http(s)://` 로 시작 | 제출 시 | `http(s):// 로 시작하는 URL 을 입력하세요.` — `apps/admin/src/pages/content/popups/validation.ts:28-31` | 제출 차단 · 인라인 오류 |
| 노출 위치 | 세 값 중 하나 | 제출 시 | 없음(select 라 도달하지 않는다) | — |
| 우선순위 | 비어 있으면 안 된다 | 제출 시 | `우선순위를 입력하세요.` — `apps/admin/src/pages/content/popups/validation.ts:38` | 제출 차단 · 인라인 오류 |
| 우선순위 | 0 이상의 정수 | 제출 시 | `우선순위는 0 이상의 정수예요.` — `apps/admin/src/pages/content/popups/validation.ts:39` | 〃 |
| 노출 기간(시작일) | 실재하는 날짜여야 한다 | 제출 시 | `노출 기간을 YYYY-MM-DD 형식으로 입력하세요.` — `apps/admin/src/pages/content/popups/validation.ts:51` | 제출 차단 · 기간 칸에 인라인 오류. **시작일이 걸리면 종료일은 검사하지 않는다** — `apps/admin/src/pages/content/popups/validation.ts:53` |
| 노출 기간(종료일) | 실재하는 날짜여야 한다 | 제출 시 | 같은 문구 — `apps/admin/src/pages/content/popups/validation.ts:60` | 〃 |
| 노출 기간 | 종료일 ≥ 시작일 | 제출 시 | `종료일은 시작일보다 빠를 수 없어요.` — `apps/admin/src/pages/content/popups/validation.ts:69` | 제출 차단 · 인라인 오류 |
| 노출 ON | 검증하지 않는다(참/거짓) | — | — | — |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/content/popups/validation.ts`. 기간은 **필수**다 — 빈 값도 형식 오류로 걸린다(`isCalendarDate` 가 빈 문자열을 통과시키지 않는다).

## 7. 예외 처리

공지 폼의 §7 을 그대로 따른다(같은 한계). 문구와 이 화면 고유의 상황만 적는다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `팝업을 불러오지 못했어요. ` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:217`. ⚠ 없는 id 와 서버 오류를 같은 문장으로 말한다 | 폼 대신 배너 | '목록으로' |
| 다음 우선순위 조회 실패 | ⚠ 없음 — 칸이 빈 채로 남는다 | 조용히 지나간다 | 직접 숫자를 적는다 |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:182` | 화면에 남고 배너 · 입력 유지 | 제출 재클릭 |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다 | — | — |
| API 오류 | 저장 실패와 같은 한 줄. 오류 참조 코드가 없다 | 배너 | 제출 재클릭 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | ⚠ 권한 문구가 없다 — 폼 껍데기를 쓰지 않는다(§9) | 실제 차단은 서버의 몫 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | ⚠ 충돌 처리가 없다 — 409/412 도 일반 저장 실패 문장으로 뭉개진다 | 배너 하나 | 목록에서 최신 상태 확인 |
| 중복 데이터 | 해당 없음 — 제목·우선순위 중복을 막는 규칙이 없다. **같은 우선순위를 여러 팝업이 가질 수 있다** | — | — |
| 파일 업로드 실패 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` · `이미지를 불러오지 못했어요. 다시 선택하세요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40,116` | 값을 바꾸지 않고 인라인 오류만 붙인다 | 다른 파일을 고른다 |

## 8. 화면 상태(State)

공지 폼의 §8 과 같다. 다른 것만 적는다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 데이터 없음(등록 진입) | 제목·이미지·링크·기간이 비어 있고 위치=메인 홈, 노출 ON=켜짐, 우선순위는 자동으로 채워진다. 오른쪽 미리보기는 **빈 값 상태**로 이미 그려져 있다 | 취소 ○ · 등록 ○ | N | 이미지 빈 상태 `클릭하거나 이미지를 이 영역에 끌어다 놓으세요` · `PNG · JPG · GIF · 최대 5MB` |
| 최초 로딩(수정) | 두 카드가 모두 그려지되 입력이 전부 잠긴다 | 취소 ○ · 저장 × | Y | — |
| 조회 실패(수정) | 두 카드가 사라지고 배너 하나 | 목록으로 ○ | N | `팝업을 불러오지 못했어요. ` |
| 저장 중 | 입력 전부와 제출이 잠기고 라벨이 `저장 중…`. 미리보기는 그대로 보인다 | 취소 × · 제출 × | Y | 라벨이 곧 안내다 |
| 이미지 올린 뒤 | 왼쪽 썸네일과 오른쪽 미리보기가 함께 바뀐다 | 그대로 | N | `업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있어요.` |
| 읽기 전용(권한) | ⚠ 나타나지 않는다 — 권한 판정이 없다(§9) | — | N | — |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | ○ | — | — |
| 운영자 | 역할의 `page:/content/popups` 권한을 따른다 | 〃 | 〃 | — | — | 〃 | — | — |
| 뷰어 | ○ | × | × | — | — | × | — | — |
| 권한 없음 | × | × | × | — | — | × | — | — |

업로드는 등록·수정 권한에 딸린다 — 별도 액션이 아니다(액션은 다섯뿐이다 — `apps/admin/src/shared/permissions/resources.ts:31`).

**권한이 없을 때 화면이 어떻게 되는가** — 공지 폼과 같다. 읽기 권한이 없으면 라우트 가드가 막고, ⚠ 등록·수정 권한만 없으면 폼이 그대로 열리고 저장도 시도된다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-POPUPS` | `팝업 등록` 클릭 | `SCR-CONTENT-POPUPS-FORM`(등록) | N | 없음 | 없음 | — |
| `SCR-CONTENT-POPUPS` | 행 연필 클릭 | `SCR-CONTENT-POPUPS-FORM`(수정) | N | 그 행이 삭제 중이 아님 | 팝업 id | — |
| `SCR-CONTENT-POPUPS-FORM` | 등록·수정 성공 | `SCR-CONTENT-POPUPS` | N | 요청 성공 | 없음 | 뒤로가기로 폼에 되돌아오지 않는다 |
| `SCR-CONTENT-POPUPS-FORM` | '취소' 클릭 | `SCR-CONTENT-POPUPS` | N | 없음 | 없음 | — |
| `SCR-CONTENT-POPUPS-FORM` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-CONTENT-POPUPS-FORM` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-CONTENT-POPUPS-FORM` | 조회 실패 후 '목록으로' | `SCR-CONTENT-POPUPS` | N | 수정 진입 실패 | 없음 | — |
| `SCR-CONTENT-POPUPS-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면이 여는 팝업(모달)도, 화면 고유 확인 다이얼로그도 없다.**

**이 화면의 결과 통지 토스트는 2건**이고 §4.2 에 문구 그대로 적혀 있다. 인벤토리(성공 2 · 실패 0)와 일치한다.
