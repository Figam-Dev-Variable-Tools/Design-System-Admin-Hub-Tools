# FAQ 상세

> 이 화면은 [공지 상세](../notices/detail.md)(`SCR-CONTENT-NOTICES-DETAIL`)와 **같은 골격**이다 —
> 뒤로 · 상단 수정/삭제 · 카드 하나(제목 + 배지 + 속성 목록 + 본문) · 삭제 확인 다이얼로그 ·
> 없음/오류를 가르는 조회 실패 배너. 아래 각 절은 **다른 것만** 적는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | FAQ 상세 |
| 화면 ID | `SCR-CONTENT-FAQ-DETAIL` |
| 메뉴 경로 | 콘텐츠 관리 > FAQ > (행 클릭) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — FAQ 한 건의 답변 전문과 속성(카테고리·정렬 순서·노출 여부)을 읽기 전용으로 보여 주고, 수정·삭제로 이어 준다.

**업무 배경** — 목록은 질문만 보여 준다. 답변 전문을 확인하려면 여는 화면이 필요하고, 목록에서 펼치면 표가 읽을 수 없게 길어진다.

**화면 설명** — 공지 상세와 같은 배치다. 카드의 속성 목록이 두 줄(`카테고리` · `정렬 순서`)이고, 노출 여부는 제목 옆 배지로 붙는다.

**주요 사용자** — 최상위 관리자 · 콘텐츠를 다루는 운영자.

**사용 시나리오**

1. 운영자가 목록에서 FAQ 를 눌러 답변을 확인하고 '목록으로' 돌아온다.
2. 답변이 낡았다는 것을 알고 '수정'을 눌러 폼으로 간다.
3. 더 이상 쓰지 않는 FAQ 를 여기서 지운다 → 확인 후 목록으로 이동한다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈 · 주소의 FAQ id 가 실재해야 한다.

**후행 처리** — 삭제하면 목록으로 이동하며 히스토리를 덮어쓴다 — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:116`.

**관련 화면** — [FAQ 목록](index.md) · [FAQ 등록·수정](form.md) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/content/faq` 가 덮는다.

**관련 기능** — 목록의 행 클릭이 유일한 진입 경로다. 수정 폼은 저장 뒤 **이 화면으로** 온다 — `apps/admin/src/pages/content/faq/FaqFormPage.tsx:173`.

**관련 API** — 상세 조회 1건 · 삭제 1건. **백엔드가 없다** — `apps/admin/src/pages/content/faq/data-source.ts:164`(상세) · `:307`(삭제).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx`

## 2. 페이지(UI) 구성

공지 상세와 같다. 영역은 넷(상단 이동 · 상단 버튼 · 상세 · 오류)이고 표시 조건도 같다 — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:139,157,180`. 로딩 중 스켈레톤은 **4행**이다(공지는 5행) — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:183`.

## 3. UI 컴포넌트 정의

공지 상세와 같은 것은 다시 적지 않는다. 다른 값과 문구만 적는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 목록으로 | Button(text + 아이콘) | `목록으로` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:136` | `/content/faq` 로 이동 | N | N | 없음 | — | — | — | 항상 | — |
| 2 | 수정 | Button(secondary) | `수정` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:142` | 수정 폼으로 | N | N | 없음 | — | — | — | 데이터가 있을 때 | ⚠ 권한과 무관하게 보인다(§9) |
| 3 | 삭제 | Button(danger) | `삭제` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:151` | 확인 다이얼로그를 연다 | N | N | 없음 | — | — | — | 〃 | 〃 |
| 4 | 질문 | Heading(카드 제목) | 데이터의 질문 | 이 FAQ 의 질문 | N | Y | — | — | — | — | 데이터가 있을 때 | **고정 배지가 없다**(FAQ 에는 고정 축이 없다) |
| 5 | 노출 배지 | StatusBadge | `노출`(success) / `숨김`(neutral) — `apps/admin/src/pages/content/faq/types.ts:43-49` | 지금 노출 상태 | N | Y | — | — | — | — | 〃 | 이 화면에서는 **바꿀 수 없다** — 토글은 목록과 폼에만 있다 |
| 6 | 속성 목록 | 정의 목록(dl) | `카테고리` · `정렬 순서` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:199,202` | 두 줄뿐이다(공지는 네 줄) | N | Y | — | — | — | — | 〃 | 작성자·게시일·조회수가 없다 |
| 7 | 답변 | Text(pre-wrap) | (없음) | 줄바꿈을 그대로 살려 그린다 | N | Y | — | — | — | — | 〃 | 리치 텍스트가 아니다 |
| 8 | 조회 실패 배너 | Alert(danger) + Button 둘 | 문구는 §7 · `다시 시도`·`목록으로` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:171,174` | 없음과 오류를 다른 문장으로 | N | Y | — | 숨김 | — | — | 조회 실패 | — |

## 4. 기능 명세

### 4.1 상세 조회 · 4.2 수정으로 이동

공지 상세의 같은 기능과 동작이 같다. 다른 것만 적는다.

| 항목 | 차이 |
|---|---|
| 조회 실패 문구 | 없음 `FAQ 를 찾을 수 없어요.` · 그 밖 `FAQ 를 불러오지 못했어요.` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:162-163` |
| 스켈레톤 | 4행 — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:183` |
| 수정 목적지 | `/content/faq/{id}/edit` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:141` |
| 수정 후 복귀 | 폼이 저장에 성공하면 **이 화면으로** 돌아온다 — `apps/admin/src/pages/content/faq/FaqFormPage.tsx:173` |

### 4.3 삭제

| 항목 | 내용 |
|---|---|
| 기능 목적 | 보고 있는 FAQ 를 지운다 |
| 실행 조건 | 데이터가 있을 때 |
| 사용자 동작 | '삭제' 클릭 → 다이얼로그에서 `FAQ 삭제` 또는 `취소` |
| 시스템 처리 | 확인 시 삭제 요청 1건. 확인 버튼이 잠긴다 |
| 데이터 처리 | 그 FAQ 가 사라진다. 되돌릴 수 없다. **지금은 픽스처가 실제로 지우지 않는다** — `apps/admin/src/pages/content/faq/data-source.ts:307-312` |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 대상 1건 삭제 |
| 성공 처리 | 목록으로 이동하며(히스토리를 덮어쓴다) 토스트 `MSG-CONTENT-FAQ-DETAIL-01`: `FAQ 를 삭제했어요.` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:115`. **질문 이름이 들어가지 않는다** |
| 실패 처리 | 다이얼로그가 닫히지 않고 배너: `FAQ 를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:120` |
| 예외 처리 | 취소·Esc·딤은 진행 중 요청을 중단하고 실패로 치지 않는다 — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:98-104,119` |
| 화면 변경 사항 | 다이얼로그 → 화면 전체 |
| 후속 동작 | 목록 재조회 |
| 로그 기록 여부 | 확인하지 못했다 |

**확인 다이얼로그** — 제목 `FAQ 삭제` · 본문 `'{질문}' FAQ 를 삭제할까요? 되돌릴 수 없어요.` · 확인 `FAQ 삭제` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:213-215`.

## 5. 이벤트 정의

공지 상세의 이벤트 표와 같다. 목적지 경로(`/content/faq`·`/content/faq/{id}/edit`)와 문구만 다르다. **이 화면에만 있는 이벤트는 없다.**

## 6. Validation

해당 없음 — 입력 칸이 하나도 없다(공지 상세와 같은 이유).

## 7. 예외 처리

공지 상세의 §7 을 그대로 따른다. 문구만 다르다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `FAQ 를 찾을 수 없어요.` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:162`(데이터 소스가 `FAQ 를 찾을 수 없어요` 로 실패했을 때 — `apps/admin/src/pages/content/faq/data-source.ts:170`) | 카드 대신 배너. 상단 수정·삭제도 없다 | '목록으로' |
| 저장 실패 | 해당 없음 — 저장 기능이 없다 | — | — |
| 수정 실패 | 해당 없음 — 폼 화면의 일이다 | — | — |
| 삭제 실패 | `FAQ 를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:120` | 다이얼로그를 닫지 않고 배너 | 확인 재클릭 |
| API 오류 | `FAQ 를 불러오지 못했어요.` — `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:163` | 배너 + '다시 시도'·'목록으로' | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | 읽기 권한이 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. ⚠ 쓰기 권한이 없을 때의 문구는 없다(§9) | 읽기는 라우트 가드가 막는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 — 앱이 로그인 화면으로 보낸다 | 세션 폐기 · 원래 경로 보존 | 재로그인 후 이 화면 |
| 데이터 충돌 | 충돌 문구가 없다. 다른 관리자가 먼저 지웠으면 삭제 실패 문구가 뜬다 | 다이얼로그 배너 | '목록으로' 눌러 확인 |
| 중복 데이터 | 해당 없음 | — | — |
| 파일 업로드 실패 | 해당 없음 — 파일 입력이 없다 | — | — |

## 8. 화면 상태(State)

공지 상세의 §8 과 같다. 다른 것은 둘이다 — 스켈레톤이 4행이고, 데이터 없음 상태의 문구가 `FAQ 를 찾을 수 없어요.` 다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 카드 안 스켈레톤 4행 · 상단 수정/삭제 없음 | 목록으로 ○ | Y | — |
| 데이터 있음 | 질문 · 노출 배지 · 속성 2줄 · 답변 | 목록으로 ○ · 수정 ○ · 삭제 ○ | N | — |
| 데이터 없음 | §7 의 '조회 결과 없음' | 목록으로 ○ · 다시 시도 ○ | N | `FAQ 를 찾을 수 없어요.` |
| 재조회 중(데이터 있음) | 답변이 그대로 남는다 | 그대로 | N | — |
| 조회 실패 | 배너 하나 | 다시 시도 ○ · 목록으로 ○ | N | `FAQ 를 불러오지 못했어요.` |
| 삭제 중 | 다이얼로그 확인 버튼 `처리 중…` | 확인 × · 취소 ○ | Y | 라벨이 곧 안내다 |
| 삭제 실패 | 다이얼로그가 열린 채 배너 | 확인 ○ · 취소 ○ | N | §7 의 삭제 실패 문구 |
| 읽기 전용(권한) | 읽기 권한이 없으면 `접근 권한이 없어요` 화면. 쓰기 권한만 없는 상태는 화면에 나타나지 않는다 | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | — | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `page:/content/faq` 권한을 따른다 | — | 〃 | 〃 | — | — | — | — |
| 뷰어 | ○ | — | × | × | — | — | — | — |
| 권한 없음 | × | — | × | × | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — 공지 상세와 같다. 읽기 권한이 없으면 화면이 `접근 권한이 없어요` 로 바뀌고, ⚠ 쓰기 권한만 없으면 수정·삭제 버튼이 그대로 보이고 눌린다(`FaqDetailPage.tsx` 에 권한 판정 호출이 없다).

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-FAQ-DETAIL` | '목록으로' 클릭 | `SCR-CONTENT-FAQ` | N | 언제나 | 없음 | — |
| `SCR-CONTENT-FAQ-DETAIL` | '수정' 클릭 | `SCR-CONTENT-FAQ-FORM`(수정) | N | 데이터가 있을 때 | FAQ id | 저장 후 이 화면 |
| `SCR-CONTENT-FAQ-DETAIL` | '삭제' 클릭 | FAQ 삭제 확인 다이얼로그 | Y | 데이터가 있을 때 | 대상 1건 | 이 화면 |
| 확인 다이얼로그 | 삭제 성공 | `SCR-CONTENT-FAQ` | N | 요청 성공 | 없음 | 뒤로가기로 이 화면에 되돌아오지 않는다 |
| `SCR-CONTENT-FAQ-DETAIL` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 화면 |

**이 화면이 여는 팝업(모달)은 없다.** 확인 다이얼로그 1건은 인벤토리의 `apps/admin/src/pages/content/faq/FaqDetailPage.tsx:211` 과 일치한다.

**이 화면의 결과 통지 토스트는 1건**이고 §4.3 에 문구 그대로 적혀 있다. 인벤토리(성공 1 · 실패 0)와 일치한다.
