# 인증서/특허 등록 · 수정

> 이 화면은 [연혁 등록·수정](../history/form.md)(`SCR-COMPANY-HISTORY-FORM`)과 **같은 골격**이다 —
> 공용 폼 껍데기 + 컨트롤러(권한 문 · 404/오류 구분 · 422 인라인 매핑 · 저장 충돌 다이얼로그 ·
> 오류 참조 코드 · 동기 중복 제출 잠금 · 미저장 이탈 가드). 아래 각 절은 **입력 칸과 문구의 차이만** 적는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 인증서/특허 등록 · 수정 |
| 화면 ID | `SCR-COMPANY-CERTIFICATES-FORM` |
| 메뉴 경로 | 기업 관리 > 인증서/특허 > 인증서/특허 등록 (또는 행의 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 인증서·특허 한 건의 명칭·발급기관·발급일·구분·이미지를 정한다.

**업무 배경** — 인증서는 증빙 이미지가 함께 있어야 홈페이지에서 신뢰 장치가 된다. 그래서 이미지가 **필수**다(로고·사진이 선택인 다른 화면과 다르다).

**화면 설명** — 위쪽에 '목록으로', 제목(`인증서/특허 등록`/`인증서/특허 수정`)과 안내문, 카드 하나에 명칭 · (발급기관 · 발급일 · 구분) 한 줄 · 이미지가 놓인다.

**주요 사용자** — 최상위 관리자 · 기업 정보를 다루는 운영자.

**사용 시나리오**

1. 새 인증서를 등록한다 → 목록 맨 끝에 붙는다(순서는 목록에서 옮긴다).
2. 발급기관 표기가 틀려 수정한다.
3. 이미지를 고르지 않고 제출한다 → 이미지 칸 아래 오류가 뜬다.

**선행 조건** — 로그인 · **등록이면 등록 권한, 수정이면 수정 권한**(없으면 화면이 열리지 않는다).

**후행 처리** — 등록·수정 모두 성공하면 목록으로 간다. **새 항목은 목록 맨 끝에 놓인다** — 발급일과 무관하다 — `apps/admin/src/pages/company/certificates/types.ts:113-116`.

**관련 화면** — [인증서/특허](index.md)(`SCR-COMPANY-CERTIFICATES`) · [연혁 등록·수정](../history/form.md)(같은 골격) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/company/certificates` 가 덮는다.

**관련 기능** — **정렬 순서는 이 폼에서 받지 않는다** — 목록의 드래그·이동 버튼이 관리한다 — `apps/admin/src/pages/company/certificates/types.ts:29-30`.

**관련 API** — 등록 1건 · 수정 1건 · (수정 진입 시) 상세 조회 1건. **백엔드가 없다** — `apps/admin/src/pages/company/certificates/data-source.ts:59`. **이미지 업로드 엔드포인트도 없다** — `apps/admin/src/shared/crud/validation.ts:56-58`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx` (껍데기 `apps/admin/src/shared/crud/FormPageShell.tsx` · 컨트롤러 `useCrudForm.ts` · 검증 `validation.ts` · 상수 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 증빙 이미지가 서버로 올라가지 않는다. 화면을 떠나면 그 참조가 죽는다. 검증을 조여도 해결되지 않으며 고칠 곳은 업로드 이음매다 — `apps/admin/src/shared/crud/validation.ts:41-62`.

## 2. 페이지(UI) 구성

연혁 폼과 같다(권한 없음 화면 · 상단 이동 · 제목 · 오류 · 입력 · 버튼 · 조회 실패). 표시 조건도 같다.

## 3. UI 컴포넌트 정의

연혁 폼과 같은 것('목록으로' · 화면 제목 구조 · 저장 실패 배너와 참조 코드 · 취소/제출 · 조회 실패 배너 · 권한 없음 화면 · 스켈레톤)은 다시 적지 않는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 화면 제목 | Heading(h1) | 등록 `인증서/특허 등록` · 수정 `인증서/특허 수정` — `apps/admin/src/shared/crud/FormPageShell.tsx:178` | — | Y | Y | — | 주소의 id 유무 | — | — | 항상 | 엔티티 라벨은 `인증서/특허` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:19` |
| 2 | 안내문 | Text | `별표(*) 항목은 필수예요. 이미지 URL 로 인증서/특허 이미지를 등록해요.` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:79` | — | N | Y | — | — | — | — | 항상 | ⚠ 문구는 'URL 로'라고 말하지만 **화면의 입력은 파일 업로드 드롭존**이다(URL 을 칠 칸이 없다) |
| 3 | 카드 제목 | Heading(h2) | `인증서/특허 정보` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:78` | — | N | Y | — | — | — | — | 항상 | — |
| 4 | 명칭 | TextField | `명칭` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:93` | 목록에 그대로 뜬다 | Y | N | 저장 중 또는 상세 로딩 중 | 등록=빈 값 · 수정=기존 값 | `예: ISO 9001 품질경영시스템 인증` — `:100` | 100자 — `apps/admin/src/pages/company/certificates/types.ts:179`(입력에서도 잘린다) | 항상 | 삭제 확인 다이얼로그의 항목 이름이기도 하다 |
| 5 | 발급기관 | TextField | `발급기관` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:109` | 발급한 곳 | Y | N | 〃 | 등록=빈 값 · 수정=기존 값 | `예: 예시인증원` — `:116` | 100자 — `apps/admin/src/pages/company/certificates/types.ts:180` | 항상 | — |
| 6 | 발급일 | 날짜 입력(date) | `발급일` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:124` | `YYYY-MM-DD` | Y | N | 〃 | 등록=빈 값 · 수정=기존 값 | 브라우저 기본 | 달력 입력 | 항상 | **정렬에 쓰이지 않는다**(목록의 순서는 따로 저장된다) |
| 7 | 구분 | SelectField | `구분` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:137` | `인증서` · `특허` — `apps/admin/src/pages/company/certificates/types.ts:43-46` | Y | N | 〃 | `인증서` — `:49` | — | 두 값 중 하나 | 항상 | 목록의 구분 배지가 이 값을 그린다 |
| 8 | 이미지 | ImageUploadField | `이미지` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:156` | 끌어다 놓거나 클릭해 올린다 | **Y** | N | 〃 | 등록=없음 · 수정=기존 이미지 | 빈 상태 안내 `클릭하거나 이미지를 이 영역에 끌어다 놓으세요` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` | 이미지 파일만 · 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38-40,136` | 항상 | 힌트 `이미지를 끌어다 놓거나 클릭해 업로드해요.` — `:164`. 형식 안내 `PNG · JPG · GIF · 최대 5MB` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:271` |
| 9 | 조회 실패 배너 | Alert(danger) + Button 최대 둘 | 없음 `{엔티티}{조사} 찾을 수 없어요. 이미 삭제되었을 수 있어요.` · 오류 `{엔티티}{조사} 불러오지 못했어요.`(엔티티=`인증서/특허`) — `apps/admin/src/shared/crud/FormPageShell.tsx:146-149` | 404 와 오류를 가른다 | N | Y | — | 숨김 | — | — | 수정 + 조회 실패 | 404 에는 '다시 시도'를 주지 않는다 |

**정렬 순서 칸이 없다** — 목록의 드래그·이동 버튼이 그 축을 소유한다.

## 4. 기능 명세

연혁 폼의 §4.1(수정 진입) · §4.2(저장) · §4.3(저장 충돌) · §4.4(이탈 가드)와 **동작이 같다**. 다른 것만 적는다.

| 항목 | 인증서/특허의 값 |
|---|---|
| 폼을 채우는 값 | 명칭 · 발급기관 · 발급일 · 구분 · 이미지 — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:57-63` |
| 저장 payload | 명칭·발급기관·발급일·이미지의 앞뒤 공백을 다듬어 보낸다 — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:50-56`. **정렬 순서는 보내지 않는다** |
| 새 항목의 자리 | 저장소가 **현재 최대 순서 + 1** 을 붙여 맨 끝에 놓는다 — `apps/admin/src/pages/company/certificates/types.ts:113-116` |
| 등록·수정 성공 | `MSG-COMMON-01` — `인증서/특허를 등록했어요.` / `인증서/특허를 저장했어요.` — `apps/admin/src/shared/crud/useCrudForm.ts:249,256,263` |
| 이탈 가드 문구 | `인증서/특허에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx:21-22` |

### 4.5 이미지 올리기 · 교체 · 제거 (이 화면 고유)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 증빙 이미지를 고른다 |
| 실행 조건 | 저장 중·상세 로딩 중이 아닐 때 |
| 사용자 동작 | 드롭존 클릭(파일 선택) · 파일 끌어다 놓기 · 교체 · 제거 |
| 시스템 처리 | 고른 파일이 이미지인지, 5MB 이하인지 그 자리에서 검사한다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:37-41` |
| 데이터 처리 | **업로드하지 않는다.** 브라우저 안 미리보기 참조가 값이 된다(§1) |
| Validation | **이미지는 필수다** — `apps/admin/src/pages/company/certificates/validation.ts:23`. 형식은 강제하지 않는다 |
| API 호출 여부 | N — 업로드 엔드포인트가 없다 |
| 성공 처리 | 미리보기가 그려지고 안내가 `업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있어요.` 로 바뀐다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:279` |
| 실패 처리 | 인라인 오류: `이미지 파일만 올릴 수 있어요.` 또는 `파일 용량은 5MB 를 넘을 수 없어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40` |
| 예외 처리 | 브라우저가 그리지 못하면 `이미지를 불러오지 못했어요. 다시 선택하세요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:116`. 제거하면 값이 비고, 필수라 저장에서 막힌다 |
| 화면 변경 사항 | 입력영역의 이미지 칸 |
| 후속 동작 | 폼이 dirty 가 되어 이탈 가드가 걸린다 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

연혁 폼의 이벤트 표에 **파일 선택·드롭 · 이미지 제거** 두 줄이 더해진 것이다. 나머지는 같고 문구만 다르다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 파일 선택 · 드롭 | 클릭 또는 드래그앤드롭 | 형식·용량 검사 후 미리보기 | 이미지 | 미리보기 또는 인라인 오류 |
| 이미지 제거 | 제거 클릭 | 값이 비워진다(필수라 저장 시 막힌다) | 이미지 | 빈 드롭존 |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 명칭 | 공백만이면 안 된다 · 100자 이하 | 제출 시 | `명칭을 입력하세요.` · `명칭은 100자를 넘을 수 없어요.` — `apps/admin/src/shared/crud/validation.ts:21-26` 의 규칙에 `명칭`·100 이 들어간 값 | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 발급기관 | 공백만이면 안 된다 · 100자 이하 | 제출 시 | `발급기관을 입력하세요.` · `발급기관은 100자를 넘을 수 없어요.` — 같은 규칙에 `발급기관` 라벨 | 〃 |
| 발급일 | 비어 있으면 안 된다 | 제출 시 | `발급일을 입력하세요.` — `apps/admin/src/pages/company/certificates/validation.ts:13` | 〃 |
| 발급일 | `YYYY-MM-DD` 형태 | 제출 시 | `발급일 형식이 올바르지 않아요.` — `apps/admin/src/pages/company/certificates/validation.ts:15` | 〃. **실재하는 날짜인지는 보지 않는다**(형태만 본다) |
| 구분 | `certificate` 또는 `patent` | 제출 시 | `구분을 선택하세요.` — `apps/admin/src/pages/company/certificates/validation.ts:20` | 〃 (select 라 도달하지 않는다) |
| 이미지 | **값이 있어야 한다** | 제출 시 | `이미지를 등록하세요.` — `apps/admin/src/shared/crud/validation.ts:65-70` 의 규칙에 `이미지` 라벨이 들어간 값 | 제출 차단 · 인라인 오류. **형식은 강제하지 않는다** — 업로드 이음매가 없어 조이면 저장 자체가 불가능해진다 — `apps/admin/src/pages/company/certificates/validation.ts:39-63` |
| 이미지 | 이미지 파일 · 5MB 이하 | 파일을 고른 즉시 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40` | 값을 바꾸지 않고 인라인 오류 |
| 명칭 중복 | — | — | ⚠ **검사하지 않는다** | — |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/company/certificates/validation.ts`. 필수 텍스트·필수 이미지 규칙과 문구는 공통 조각이 갖는다.

## 7. 예외 처리

연혁 폼의 §7 과 같다(같은 껍데기·같은 컨트롤러). 문구와 이 화면 고유의 상황만 적는다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `{엔티티}{조사} 찾을 수 없어요. 이미 삭제되었을 수 있어요.`(엔티티=`인증서/특허`) — `apps/admin/src/shared/crud/FormPageShell.tsx:147` | 폼 대신 배너. '다시 시도'를 주지 않는다 | '목록으로' |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` + `오류 코드 {참조}` — `apps/admin/src/shared/crud/useCrudForm.ts:221` · `apps/admin/src/shared/crud/FormFeedback.tsx:45` | 화면에 남고 배너 · 입력 유지 | 제출 재클릭(같은 멱등키로 나간다) |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다 | — | — |
| API 오류 | 저장 실패와 같은 한 줄. 서버 응답 원문을 노출하지 않고 짧은 참조 코드만 남긴다 | 배너 | 재시도 또는 오류 코드와 함께 신고 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 — 조회 실패면 `인증서/특허를 불러오지 못했어요.` + '다시 시도' | 자동 재시도 없음 | 다시 시도 |
| 권한 없음 | 화면 전체가 `접근 권한이 없어요` 로 바뀐다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. 저장 경로에 들어와도 폼 배너가 막는다 — `apps/admin/src/shared/crud/useCrudForm.ts:294-295` | 검증도 요청도 시작하지 않는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | `DLG-COMMON-FORM-CONFLICT` 가 뜬다. 픽스처의 사유는 `다른 사용자가 먼저 삭제한 항목이에요.` — `apps/admin/src/shared/crud/crud.ts:145` | 덮어쓰지 않는다. 입력이 살아 있다 | '최신 내용 불러오기' 또는 '이어서 편집' |
| 중복 데이터 | ⚠ 막지 않는다 — 같은 명칭을 여러 건 등록할 수 있다 | — | — |
| 파일 업로드 실패 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` · `이미지를 불러오지 못했어요. 다시 선택하세요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40,116` | 값을 바꾸지 않고 인라인 오류만 붙인다 | 다른 파일을 고른다 |

## 8. 화면 상태(State)

연혁 폼의 §8 과 같다. 다른 것은 이미지 칸의 상태다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩(등록) | 빈 폼이 즉시 그려진다 | 취소 ○ · 등록 ○ | N | 안내문 |
| 최초 로딩(수정) | 카드 안 스켈레톤 4행 · 제출 잠금 | 취소 ○ · 저장 × | Y | 안내문 |
| 데이터 있음 | 다섯 값이 채워져 있고 이미지 미리보기가 보인다 | 취소 ○ · 제출 ○ | N | — |
| 데이터 없음(등록 진입) | 명칭·발급기관·발급일이 비어 있고 구분=인증서, 이미지는 빈 드롭존 | 취소 ○ · 등록 ○ | N | `클릭하거나 이미지를 이 영역에 끌어다 놓으세요` · `PNG · JPG · GIF · 최대 5MB` |
| 이미지 올린 뒤 | 미리보기와 교체·제거 컨트롤 | 그대로 | N | `업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있어요.` |
| 조회 실패(없음/오류) | 폼이 사라지고 갈래에 맞는 배너 | 없음=목록으로 ○ · 오류=다시 시도 ○ · 목록으로 ○ | N | §7 의 해당 문구 |
| 저장 중 | 입력과 제출이 잠기고 라벨이 `저장 중…` | 취소 × · 제출 × | Y | 라벨이 곧 안내다 |
| 저장 실패 | 카드 맨 위 배너 + 오류 코드 · 입력 유지 | 취소 ○ · 제출 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 취소 ○ · 제출 ○ | N | §6 의 해당 문구 |
| 필드 거절(422) | 서버가 지목한 칸에 인라인 오류 · 그 칸으로 포커스 | 취소 ○ · 제출 ○ | N | 서버가 준 문구 |
| 저장 충돌 | 폼 위에 다이얼로그. 입력은 그대로 있다 | 확인 ○ · 취소 ○ | N | `다른 사용자가 먼저 변경했어요` |
| 읽기 전용(권한) | **폼이 열리지 않는다** — 화면 전체가 `접근 권한이 없어요` | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | ○ | — | — |
| 운영자 | 역할의 `page:/company/certificates` 권한을 따른다 | 〃 | 〃 | — | — | 〃 | — | — |
| 뷰어 | ○ | × | × | — | — | × | — | — |
| 권한 없음 | × | × | × | — | — | × | — | — |

업로드는 등록·수정 권한에 딸린다.

**권한이 없을 때 화면이 어떻게 되는가** — 연혁 폼과 같다. **폼 자체가 열리지 않고**, 저장 경로도 컨트롤러가 한 번 더 막는다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-CERTIFICATES` | `인증서/특허 등록` 클릭 | `SCR-COMPANY-CERTIFICATES-FORM`(등록) | N | 등록 권한 있음 | 없음 | — |
| `SCR-COMPANY-CERTIFICATES` | 행 연필 클릭 | `SCR-COMPANY-CERTIFICATES-FORM`(수정) | N | 수정 권한 있음 | 항목 id | — |
| `SCR-COMPANY-CERTIFICATES-FORM` | 등록·수정 성공 | `SCR-COMPANY-CERTIFICATES` | N | 요청 성공 | 없음 | 뒤로가기로 폼에 되돌아오지 않는다 |
| `SCR-COMPANY-CERTIFICATES-FORM` | '취소'·'목록으로' 클릭 | `SCR-COMPANY-CERTIFICATES` | N | 없음(dirty 면 가드가 먼저) | 없음 | — |
| `SCR-COMPANY-CERTIFICATES-FORM` | 저장 → 409/412 | `DLG-COMMON-FORM-CONFLICT` | Y | 서버가 충돌로 거절 | 서버가 준 사유 문장 | 같은 폼(입력 유지) |
| `SCR-COMPANY-CERTIFICATES-FORM` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-COMPANY-CERTIFICATES-FORM` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-COMPANY-CERTIFICATES-FORM` | 권한 없이 진입 | `접근 권한이 없어요` 화면 | N | 등록/수정 권한 없음 | 없음 | 사이드바로 다른 메뉴 |
| `SCR-COMPANY-CERTIFICATES-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면이 여는 팝업(모달)은 없다.** 확인 다이얼로그 둘은 공통 층의 것이다.

**이 화면의 결과 통지 토스트는 0건이다**(공통 층의 `MSG-COMMON-01` 만 뜬다). 인벤토리 §9.3 에 이 화면이 올라 있지 않은 것과 일치한다.
