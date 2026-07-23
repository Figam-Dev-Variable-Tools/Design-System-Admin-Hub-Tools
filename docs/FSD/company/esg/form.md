# ESG 활동 등록 · 수정

> 이 화면은 [연혁 등록·수정](../history/form.md)(`SCR-COMPANY-HISTORY-FORM`)과 **같은 골격**이다 —
> 공용 폼 껍데기 + 컨트롤러(권한 문 · 404/오류 구분 · 422 인라인 매핑 · 저장 충돌 다이얼로그 ·
> 오류 참조 코드 · 동기 중복 제출 잠금 · 미저장 이탈 가드). 아래 각 절은 **입력 칸과 문구의 차이만**
> 적는다. 다른 것 하나가 더 있다 — **이미지를 여러 장 올린다**(다른 폼은 한 장이다).

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | ESG 활동 등록 · 수정 |
| 화면 ID | `SCR-COMPANY-ESG-FORM` |
| 메뉴 경로 | 기업 관리 > ESG > ESG 활동 등록 (또는 행의 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — ESG 활동 한 건의 분류·일자·제목·내용·본문 이미지를 정한다.

**업무 배경** — ESG 활동은 "무엇을 했는가"를 사진과 함께 보여 줄 때 설득력이 생긴다. 그래서 이 폼만 이미지가 **여러 장**이다.

**화면 설명** — 위쪽에 '목록으로', 제목(`ESG 활동 등록`/`ESG 활동 수정`)과 안내문, 카드 하나에 (분류 · 일자) 한 줄 · 제목 · 내용 · 본문 이미지가 놓인다.

**주요 사용자** — 최상위 관리자 · 기업 정보를 다루는 운영자.

**사용 시나리오**

1. 사옥 전력 전환 활동을 '환경'으로 등록하고 사진 세 장을 올린다.
2. 내용을 다듬어 저장한다.
3. 사진을 열 장 넘게 올리려 한다 → 그 자리에서 막히고 이유가 뜬다.

**선행 조건** — 로그인 · **등록이면 등록 권한, 수정이면 수정 권한**(없으면 화면이 열리지 않는다 — §9).

**후행 처리** — 등록·수정 모두 성공하면 목록으로 간다(상세가 없다). 히스토리를 덮어쓴다 — `apps/admin/src/shared/crud/useCrudForm.ts:250`.

**관련 화면** — [ESG](index.md)(`SCR-COMPANY-ESG`) · [연혁 등록·수정](../history/form.md)(같은 골격) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/company/esg` 가 덮는다.

**관련 기능** — 여기서 고른 분류가 목록의 왼쪽 필터 배지 숫자를 바꾼다.

**관련 API** — 등록 1건 · 수정 1건 · (수정 진입 시) 상세 조회 1건. **백엔드가 없다** — `apps/admin/src/pages/company/esg/data-source.ts:45`. **이미지 업로드 엔드포인트도 없다** — `apps/admin/src/shared/crud/validation.ts:56-58`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/esg/EsgFormPage.tsx` (껍데기 `apps/admin/src/shared/crud/FormPageShell.tsx` · 컨트롤러 `apps/admin/src/shared/crud/useCrudForm.ts` · 검증 `apps/admin/src/pages/company/esg/validation.ts` · 상수 `apps/admin/src/pages/company/esg/types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 본문 이미지가 서버로 올라가지 않는다. 화면을 떠나면 그 참조가 죽어 목록·홈페이지에서 깨진다. 검증을 조여도 해결되지 않으며 고칠 곳은 업로드 이음매다 — `apps/admin/src/shared/crud/validation.ts:41-62`.

## 2. 페이지(UI) 구성

연혁 폼과 같다(권한 없음 화면 · 상단 이동 · 제목 · 오류 · 입력 · 버튼 · 조회 실패). 표시 조건도 같다.

## 3. UI 컴포넌트 정의

연혁 폼과 같은 것('목록으로' · 화면 제목 구조 · 저장 실패 배너와 참조 코드 · 취소/제출 · 조회 실패 배너 · 권한 없음 화면 · 스켈레톤)은 다시 적지 않는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 화면 제목 | Heading(h1) | 등록 `{엔티티} 등록` · 수정 `{엔티티} 수정` — `apps/admin/src/shared/crud/FormPageShell.tsx:178`(엔티티=`ESG 활동` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:22`) | — | Y | Y | — | 주소의 id 유무 | — | — | 항상 | — |
| 2 | 안내문 | Text | `별표(*) 항목은 필수예요. 분류(환경/사회/지배구조)와 활동 내용을 입력하세요.` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:78` | — | N | Y | — | — | — | — | 항상 | — |
| 3 | 카드 제목 | Heading(h2) | `ESG 활동 정보` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:77` | — | N | Y | — | — | — | — | 항상 | — |
| 4 | 분류 | SelectField | `분류` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:93` | `환경` · `사회` · `지배구조` — `apps/admin/src/pages/company/esg/types.ts:33-37` | Y | N | 저장 중 또는 상세 로딩 중 | `환경`(`environment`) — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:46` | — | 세 값 중 하나 | 항상 | 목록의 분류 배지가 이 값을 그린다 |
| 5 | 일자 | 날짜 입력(date) | `일자` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:110` | 활동이 있었던 날 | Y | N | 〃 | 등록=빈 값 · 수정=기존 값 | 브라우저 기본 | 달력 입력 | 항상 | 목록의 정렬 기준이다 |
| 6 | 제목 | TextField | `제목` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:124` | 목록에 그대로 뜬다 | Y | N | 〃 | 등록=빈 값 · 수정=기존 값 | `예: 사옥 전력 재생에너지 전환` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:131` | 120자 — `apps/admin/src/pages/company/esg/types.ts:84`(입력에서도 잘린다) | 항상 | 삭제 확인 다이얼로그의 항목 이름이기도 하다 |
| 7 | 내용 | TextareaField | `내용` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:140` | 6행 높이. 목록에서는 한 줄로 잘려 보인다 | Y | N | 〃 | 등록=빈 값 · 수정=기존 값 | `활동 내용을 입력하세요.` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:149` | 1,000자 — `apps/admin/src/pages/company/esg/types.ts:85` | 항상 | 글자 수 카운터. 리치 텍스트가 아니다 |
| 8 | 본문 이미지 | ImageGalleryField | `본문 이미지` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:154` | **여러 장**을 올린다 | N | N | 〃 | 등록=빈 목록 · 수정=기존 목록 | 드롭존 안내 `PNG · JPG · GIF · 최대 {최대 장수}장 · 장당 {최대 용량}MB` — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:251` | 최대 **10장** — `apps/admin/src/pages/company/esg/types.ts:26` · 장당 5MB — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:72` | 항상 | 힌트 `활동을 보여줄 이미지를 여러 장 올릴 수 있어요. 최대 {최대 장수}장.` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:159` |
| 9 | 조회 실패 배너 | Alert(danger) + Button 최대 둘 | 없음 `{엔티티}{조사} 찾을 수 없어요. 이미 삭제되었을 수 있어요.` · 오류 `{엔티티}{조사} 불러오지 못했어요.` — `apps/admin/src/shared/crud/FormPageShell.tsx:146-149` | 404 와 오류를 가른다 | N | Y | — | 숨김 | — | — | 수정 + 조회 실패 | 404 에는 '다시 시도'를 주지 않는다 — `apps/admin/src/shared/crud/FormPageShell.tsx:136-139` |

## 4. 기능 명세

연혁 폼의 §4.1(수정 진입) · §4.2(저장) · §4.3(저장 충돌) · §4.4(이탈 가드)와 **동작이 같다**. 다른 것만 적는다.

| 항목 | ESG 의 값 |
|---|---|
| 폼을 채우는 값 | 분류 · 제목 · 내용 · 일자 · 이미지 목록 — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:54-60`. 이미지 목록은 **새 배열로 복사해** 넣는다(원본을 건드리지 않는다) — 같은 파일 `:59` |
| 저장 payload | 제목·내용·일자의 앞뒤 공백을 다듬어 보낸다 — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:47-53` |
| 등록·수정 성공 | `MSG-COMMON-01` — `{엔티티}{조사} 등록했어요.` / `{엔티티}{조사} 저장했어요.` — `apps/admin/src/shared/crud/useCrudForm.ts:249`(동사는 `apps/admin/src/shared/crud/useCrudForm.ts:256,263`) |
| 이탈 가드 문구 | `ESG 활동에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:24-25` |

### 4.5 본문 이미지 여러 장 올리기 (이 화면 고유)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 활동을 보여 줄 사진을 여러 장 붙인다 |
| 실행 조건 | 저장 중·상세 로딩 중이 아닐 때 |
| 사용자 동작 | 드롭존 클릭(파일 여러 개 선택) · 파일 여러 개 끌어다 놓기 · 개별 제거 |
| 시스템 처리 | 장수 상한을 먼저 보고, 각 파일이 이미지인지·장당 용량을 넘지 않는지 검사한다 — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:138-149` |
| 데이터 처리 | **업로드하지 않는다.** 브라우저 안 미리보기 참조들이 값이 된다(§1). 순서는 올린 순서다 |
| Validation | §6 의 본문 이미지 두 줄 |
| API 호출 여부 | N — 업로드 엔드포인트가 없다 |
| 성공 처리 | 타일이 늘어나고 각 타일에 제거 컨트롤이 붙는다 |
| 실패 처리 | 필드 아래 인라인 오류: `이미지는 최대 {최대 장수}장까지 등록할 수 있어요.` — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:138,145`. 형식·용량 위반은 그 파일만 걸러 낸다 |
| 예외 처리 | 상한을 넘겨 고른 경우 **넘치는 파일만** 버리고 나머지는 받는다 — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:143-146` |
| 화면 변경 사항 | 입력영역의 이미지 갤러리 |
| 후속 동작 | 폼이 dirty 가 되어 이탈 가드가 걸린다 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

연혁 폼의 이벤트 표에 **파일 여러 개 선택·드롭 · 타일 제거** 두 줄이 더해진 것이다. 나머지는 같고 문구만 다르다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 파일 여러 개 선택 · 드롭 | 클릭 또는 드래그앤드롭 | 장수 상한 → 형식·용량 순으로 검사하고 통과한 것만 붙인다 | 본문 이미지 | 타일 추가 또는 인라인 오류 |
| 타일 제거 | 타일의 제거 클릭 | 그 장만 목록에서 뺀다 | 본문 이미지 | 타일 감소 |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 분류 | `environment`·`social`·`governance` 중 하나 | 제출 시 | `분류를 선택하세요.` — `apps/admin/src/pages/company/esg/validation.ts:12` | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 제목 | 공백만이면 안 된다 · 120자 이하 | 제출 시 | `{라벨}{조사} 입력하세요.` · `{라벨}{조사} {최대}자를 넘을 수 없어요.` — `apps/admin/src/shared/crud/validation.ts:22,25`(라벨=`제목`, 최대=120) | 〃 |
| 내용 | 공백만이면 안 된다 | 제출 시 | `내용을 입력하세요.` — `apps/admin/src/pages/company/esg/validation.ts:17` | 〃 |
| 내용 | 1,000자 이하 | 제출 시 | `내용은 {최대}자를 넘을 수 없어요.` — `apps/admin/src/pages/company/esg/validation.ts:19` | 〃 |
| 일자 | 비어 있으면 안 된다 | 제출 시 | `일자를 입력하세요.` — `apps/admin/src/pages/company/esg/validation.ts:23` | 〃 |
| 일자 | `YYYY-MM-DD` 형태 | 제출 시 | `일자 형식이 올바르지 않아요.` — `apps/admin/src/pages/company/esg/validation.ts:25` | 〃. **실재하는 날짜인지는 보지 않는다**(형태만 본다) |
| 본문 이미지 | **선택** — 최대 10장 | 제출 시 | `본문 이미지는 최대 {최대 장수}장까지 등록할 수 있어요.` — `apps/admin/src/pages/company/esg/validation.ts:31` | 제출 차단 · 인라인 오류 |
| 본문 이미지 | 장수 상한(고르는 즉시) | 파일을 고른 즉시 | `이미지는 최대 {최대 장수}장까지 등록할 수 있어요.` — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:138` | 넘치는 파일만 버린다 |
| 본문 이미지 | 형식은 강제하지 않는다 | — | 없음 | 업로드 이음매가 없어 조이면 저장 자체가 불가능해진다 — `apps/admin/src/shared/crud/validation.ts:39-63` |
| 제목·일자 중복 | — | — | ⚠ **검사하지 않는다** | — |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/company/esg/validation.ts`. 필수 텍스트 규칙과 문구는 공통 조각이 갖고(`apps/admin/src/shared/crud/validation.ts:19-28`), 조사는 라벨의 받침이 고른다.

## 7. 예외 처리

연혁 폼의 §7 과 같다(같은 껍데기·같은 컨트롤러). 문구와 이 화면 고유의 상황만 적는다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `{엔티티}{조사} 찾을 수 없어요. 이미 삭제되었을 수 있어요.` — `apps/admin/src/shared/crud/FormPageShell.tsx:147`(엔티티=`ESG 활동`) | 폼 대신 배너. '다시 시도'를 주지 않는다 | '목록으로' |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` + `오류 코드 {참조}` — `apps/admin/src/shared/crud/useCrudForm.ts:221` · `apps/admin/src/shared/crud/FormFeedback.tsx:45` | 화면에 남고 배너 · 입력 유지 | 제출 재클릭(같은 멱등키로 나간다) |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다 | — | — |
| API 오류 | 저장 실패와 같은 한 줄. 서버 응답 원문·스택·상태 코드를 문장으로 노출하지 않고 짧은 참조 코드만 남긴다 — `apps/admin/src/shared/crud/FormFeedback.tsx:34-37` | 배너 | 재시도 또는 오류 코드와 함께 신고 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 — 조회 실패면 `{엔티티}{조사} 불러오지 못했어요.` + '다시 시도' | 자동 재시도 없음 | 다시 시도 |
| 권한 없음 | 화면 전체가 `접근 권한이 없어요` 로 바뀐다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. 저장 경로에 들어와도 폼 배너가 막는다: `이 항목을 수정할 권한이 없어요. 필요하다면 관리자에게 권한을 요청해 주세요.` / 등록이면 `이 항목을 등록할 권한이 없어요. …` — `apps/admin/src/shared/crud/useCrudForm.ts:294-295` | 검증도 요청도 시작하지 않는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 — 401 이면 앱이 로그인 화면으로 보낸다 | 세션 폐기 · 원래 경로 보존 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | `DLG-COMMON-FORM-CONFLICT` 가 뜬다. 픽스처의 사유는 `다른 사용자가 먼저 삭제한 항목이에요.` — `apps/admin/src/shared/crud/crud.ts:145` | 덮어쓰지 않는다. 입력이 살아 있다 | '최신 내용 불러오기' 또는 '이어서 편집' |
| 중복 데이터 | ⚠ 막지 않는다 — 같은 제목·같은 일자를 여러 건 등록할 수 있다 | — | — |
| 파일 업로드 실패 | `이미지는 최대 {최대 장수}장까지 등록할 수 있어요.` — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:138`. 형식·용량 위반은 그 파일만 걸러 낸다 — 같은 파일 `:148` | 값을 통째로 버리지 않고 통과한 것만 붙인다 | 다른 파일을 고르거나 기존 타일을 지운다 |

## 8. 화면 상태(State)

연혁 폼의 §8 과 같다. 다른 것은 이미지 갤러리의 상태다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩(등록) | 조회가 없다 — 빈 폼이 즉시 그려진다 | 취소 ○ · 등록 ○ | N | 안내문 |
| 최초 로딩(수정) | 카드 안 스켈레톤 4행 · 제출 잠금 | 취소 ○ · 저장 × | Y | 안내문 |
| 데이터 있음 | 다섯 값이 채워져 있고 이미지 타일이 보인다 | 취소 ○ · 제출 ○ | N | 이미지 힌트 |
| 데이터 없음(등록 진입) | 일자·제목·내용이 비어 있고 분류=환경, 이미지는 빈 드롭존 | 취소 ○ · 등록 ○ | N | `PNG · JPG · GIF · 최대 {최대 장수}장 · 장당 {최대 용량}MB` — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:251` |
| 이미지 상한 도달 | 드롭존은 남아 있으나 더 붙지 않는다 | 그대로 | N | `이미지는 최대 {최대 장수}장까지 등록할 수 있어요.` |
| 조회 실패(없음/오류) | 폼이 사라지고 갈래에 맞는 배너 | 없음=목록으로 ○ · 오류=다시 시도 ○ · 목록으로 ○ | N | §7 의 해당 문구 |
| 저장 중 | 입력과 제출이 잠기고 라벨이 `저장 중…` — `apps/admin/src/shared/crud/FormPageShell.tsx:208` | 취소 × · 제출 × | Y | 라벨이 곧 안내다 |
| 저장 실패 | 카드 맨 위 배너 + 오류 코드 · 입력 유지 | 취소 ○ · 제출 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 취소 ○ · 제출 ○ | N | §6 의 해당 문구 |
| 필드 거절(422) | 서버가 지목한 칸에 인라인 오류 · 그 칸으로 포커스 | 취소 ○ · 제출 ○ | N | 서버가 준 문구 |
| 저장 충돌 | 폼 위에 다이얼로그. 입력은 그대로 있다 | 확인 ○ · 취소 ○ | N | `다른 사용자가 먼저 변경했어요` — `apps/admin/src/shared/crud/FormFeedback.tsx:65` |
| 읽기 전용(권한) | **폼이 열리지 않는다** — 화면 전체가 `접근 권한이 없어요` | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | ○ | — | — |
| 운영자 | 역할의 `page:/company/esg` 권한을 따른다 | 〃 | 〃 | — | — | 〃 | — | — |
| 뷰어 | ○ | × | × | — | — | × | — | — |
| 권한 없음 | × | × | × | — | — | × | — | — |

업로드는 등록·수정 권한에 딸린다 — 별도 액션이 아니다(액션은 다섯뿐이다 — `apps/admin/src/shared/permissions/resources.ts:31`).

**권한이 없을 때 화면이 어떻게 되는가** — 연혁 폼과 같다. **폼 자체가 열리지 않고**, 저장 경로도 컨트롤러가 한 번 더 막는다 — `apps/admin/src/shared/crud/FormPageShell.tsx:120-132` · `apps/admin/src/shared/crud/useCrudForm.ts:290-298`.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-ESG` | `ESG 활동 등록` 클릭 | `SCR-COMPANY-ESG-FORM`(등록) | N | 등록 권한 있음 | 없음 | — |
| `SCR-COMPANY-ESG` | 행 연필 클릭 | `SCR-COMPANY-ESG-FORM`(수정) | N | 수정 권한 있음 | 활동 id | — |
| `SCR-COMPANY-ESG-FORM` | 등록·수정 성공 | `SCR-COMPANY-ESG` | N | 요청 성공 | 없음 | 뒤로가기로 폼에 되돌아오지 않는다 |
| `SCR-COMPANY-ESG-FORM` | '취소'·'목록으로' 클릭 | `SCR-COMPANY-ESG` | N | 없음(dirty 면 가드가 먼저) | 없음 | — |
| `SCR-COMPANY-ESG-FORM` | 저장 → 409/412 | `DLG-COMMON-FORM-CONFLICT` | Y | 서버가 충돌로 거절 | 서버가 준 사유 문장 | 같은 폼(입력 유지) |
| `SCR-COMPANY-ESG-FORM` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-COMPANY-ESG-FORM` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-COMPANY-ESG-FORM` | 권한 없이 진입 | `접근 권한이 없어요` 화면 | N | 등록/수정 권한 없음 | 없음 | 사이드바로 다른 메뉴 |
| `SCR-COMPANY-ESG-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면이 여는 팝업(모달)은 없다.** 확인 다이얼로그 둘은 공통 층의 것이다.

**이 화면의 결과 통지 토스트는 0건이다**(공통 층의 `MSG-COMMON-01` 만 뜬다). 인벤토리 §9.3 에 이 화면이 올라 있지 않은 것과 일치한다.
