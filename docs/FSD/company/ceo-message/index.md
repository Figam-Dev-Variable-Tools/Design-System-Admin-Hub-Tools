# CEO 인사말

> 이 화면은 [회사 정보](../profile/index.md)(`SCR-COMPANY-PROFILE`)와 **같은 껍데기**를 쓴다 —
> 목록 없음 · 카드 하나 · 저장 상태 문구 + 저장 버튼 · 바뀐 것이 있을 때만 저장 가능 ·
> 수정 권한이 없으면 화면 자체가 열리지 않음 · 미저장 이탈 가드.
> 아래 각 절은 **다른 것만** 적는다. 다른 것은 입력 세 칸과 문구뿐이다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | CEO 인사말 |
| 화면 ID | `SCR-COMPANY-CEO-MESSAGE` |
| 메뉴 경로 | 기업 관리 > CEO 인사말 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 홈페이지 인사말 페이지에 실릴 제목·본문·사진을 고쳐 저장한다.

**업무 배경** — 인사말은 대표가 바뀌거나 회사 방향이 바뀔 때 통째로 갈아 쓰는 문서다. 버전을 쌓을 이유가 없어 **한 건을 고쳐 쓴다**(약관·처리방침과 다른 결정이다).

**화면 설명** — 안내문 한 줄 아래 카드 하나에 제목 · 본문 · 사진 세 칸이 놓인다.

**주요 사용자** — 최상위 관리자 · 기업 정보를 다루는 운영자.

**사용 시나리오**

1. 새 대표 취임에 맞춰 제목과 본문을 갈아 쓰고 사진을 교체해 저장한다.
2. 본문의 한 문장만 다듬고 저장한다.
3. 반쯤 고치다 다른 메뉴를 누른다 → 저장하지 않은 변경 확인이 뜬다.

**선행 조건** — 로그인 · **이 화면의 수정 권한**(없으면 화면이 열리지 않는다 — §9). 플랜 모듈 매핑에 없어 플랜 축으로 잠기지 않는다.

**후행 처리** — 저장하면 사용자 화면의 인사말 페이지에 반영된다고 화면이 안내한다 — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:88`. 홈페이지는 이 리포 밖이라 반영 경로를 코드에서 확인하지 못했다.

**관련 화면** — [회사 정보](../profile/index.md) · [오시는 길](../directions/index.md)(같은 껍데기) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 기업 관리 가지의 두 번째 잎 — `apps/admin/src/shared/layout/nav-config.ts:156`.

**관련 기능** — 없음 — 다른 화면이 이 문서를 읽는 배선을 코드에서 확인하지 못했다.

**관련 API** — 문서 조회 1건 · 저장 1건. **백엔드가 없다** — `apps/admin/src/pages/company/ceo-message/data-source.ts:19`. **이미지 업로드 엔드포인트도 없다**.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx` (껍데기 `apps/admin/src/shared/crud/DocumentFormShell.tsx` · 검증 `validation.ts` · 상수 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 회사 정보와 같다. 사진이 서버로 올라가지 않아 화면을 떠나면 참조가 죽고(`apps/admin/src/shared/crud/validation.ts:41-62`), 저장 충돌 처리가 없어 마지막에 저장한 쪽이 이긴다.

## 2. 페이지(UI) 구성

회사 정보와 같다(권한 없음 화면 · 안내 · 오류 · 입력 · 버튼 · 조회 실패). 표시 조건도 같다.

## 3. UI 컴포넌트 정의

회사 정보와 같은 것(저장 상태 문구 · 저장 버튼 · 조회 실패 배너 · 스켈레톤 · 권한 없음 화면)은 다시 적지 않는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 안내문 | Text | `별표(*) 항목은 필수예요. 저장하면 사용자 화면의 인사말 페이지에 반영돼요.` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:88` | — | N | Y | — | — | — | — | 항상 | — |
| 2 | 카드 제목 | Heading(h2) | `CEO 인사말` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:87` | — | N | Y | — | — | — | — | 항상 | h1 페이지 제목이 없다 |
| 3 | 저장 실패 배너 | Alert(danger) | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:79` | — | N | Y | — | 숨김 | — | — | 저장 실패 | — |
| 4 | 제목 | TextField | `제목` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:98` | 인사말 페이지의 머리글 | Y | N | 저장 중 또는 최초 로딩 중 | 서버 값 | `예: 고객과 함께 성장하는 기업이 되겠습니다` — `:105` | 제목 최대 길이 — `types.ts` 의 `TITLE_MAX_LENGTH`(입력에서도 잘린다 — `:104`) | 항상 | — |
| 5 | 본문 | TextareaField | `본문` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:114` | 10행 높이. 줄바꿈이 그대로 살아 나간다 | Y | N | 〃 | 서버 값 | `인사말 본문을 입력하세요.` — `:121` | 본문 최대 길이 — `types.ts` 의 `BODY_MAX_LENGTH` | 항상 | 글자 수 카운터. 리치 텍스트가 아니다 |
| 6 | 사진 | ImageUploadField | `사진` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:127` | 대표 사진 | N | N | 〃 | 서버 값 | 빈 상태 안내 `클릭하거나 이미지를 이 영역에 끌어다 놓으세요` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` | 이미지 파일만 · 최대 5MB | 항상 | 힌트 `대표/CEO 사진 URL (선택). 이미지를 끌어다 놓거나 클릭해 업로드해요.` — `:134`. 카드 안에서 폭이 제한된다 — `:27-29` |

## 4. 기능 명세

회사 정보의 §4.1(문서 조회) · §4.2(저장) · §4.4(이미지) · §4.5(이탈 가드)와 **동작이 같다**. §4.3(주소 고르기)은 **성립하지 않는다.** 다른 것만 적는다.

| 항목 | CEO 인사말의 값 |
|---|---|
| 폼을 채우는 값 | 제목 · 본문 · 사진 세 칸 — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:55-58` |
| 저장 성공 | 기준선을 갱신해 저장 버튼이 다시 잠기고 토스트 `MSG-COMPANY-CEO-MESSAGE-01` `CEO 인사말을 저장했어요.` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:74-75`. 화면 이동이 없다 |
| 저장 실패 배너 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:79` |
| 조회 실패 배너 | `내용을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121-124`(공통 문장) |
| 이탈 가드 문구 | `CEO 인사말에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:24-25` |
| 사진의 필수 여부 | **선택**이다 — 형식을 강제하지 않는다 — `apps/admin/src/pages/company/ceo-message/validation.ts:15-16` |

**이 화면 고유의 기능은 없다.**

## 5. 이벤트 정의

회사 정보의 이벤트 표에서 **주소 관련 세 줄(주소 칸 클릭·주소 검색 클릭·주소 선택)을 뺀 것**이다. 나머지(진입 · 권한 없음 · 조회 실패 · 다시 시도 · 값 입력 · 파일 선택·드롭 · 제출 · 검증 실패 · 저장 중 · 저장 성공/실패 · dirty 이탈)는 같고 문구만 다르다.

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 제목 | 공백만이면 안 된다 | 제출 시 | `제목을 입력하세요.` — `apps/admin/src/shared/crud/validation.ts:21-23` 의 규칙에 `제목` 라벨이 들어간 값 | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 제목 | 최대 길이 이하(`types.ts` 의 `TITLE_MAX_LENGTH`) | 제출 시 | `제목은 {최대}자를 넘을 수 없어요.` — `apps/admin/src/pages/company/ceo-message/validation.ts:24-26` 의 규칙 | 〃 (입력 자체도 그 길이에서 막힌다) |
| 본문 | 공백만이면 안 된다 | 제출 시 | `본문을 입력하세요.` — `apps/admin/src/pages/company/ceo-message/validation.ts:10` | 〃 |
| 본문 | 최대 길이 이하(`BODY_MAX_LENGTH`) | 제출 시 | `본문은 {최대}자를 넘을 수 없어요.` — `apps/admin/src/pages/company/ceo-message/validation.ts:11-13` | 〃 |
| 사진 | **선택** — 형식을 강제하지 않는다 | — | 없음 | 업로드 결과 값이라 조이면 저장 자체가 불가능해진다 — `apps/admin/src/pages/company/ceo-message/validation.ts:15` |
| 사진 | 이미지 파일 · 5MB 이하 | 파일을 고른 즉시 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40` | 값을 바꾸지 않고 인라인 오류 |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/company/ceo-message/validation.ts`.

## 7. 예외 처리

회사 정보의 §7 과 같다(같은 껍데기·같은 한계). 문구만 다르다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 해당 없음 — 문서가 언제나 한 건이다. 조회 실패는 아래 'API 오류' | — | — |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:79` | 화면에 남고 배너 · 입력 유지 | 저장 재클릭 |
| 수정 실패 | 저장 실패와 같다 — 이 화면의 저장은 언제나 수정이다 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 삭제 기능이 없다 | — | — |
| API 오류 | 조회면 `내용을 불러오지 못했어요.` — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121`. 저장이면 위 문구 | 배너 | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | 화면 전체가 `접근 권한이 없어요` 로 바뀐다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73` | 폼을 그리지 않는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | ⚠ 충돌 처리가 없다 — 마지막에 저장한 쪽이 이긴다 | 배너도 뜨지 않는다 | 새로고침해 최신 값 확인 |
| 중복 데이터 | 해당 없음 — 문서가 한 건이다 | — | — |
| 파일 업로드 실패 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` · `이미지를 불러오지 못했어요. 다시 선택하세요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40,116` | 인라인 오류만 붙인다 | 다른 파일을 고른다 |

## 8. 화면 상태(State)

회사 정보의 §8 과 같다. 채워지는 칸이 셋이라는 것만 다르다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 카드 안 스켈레톤 4행 · 입력 잠금 | 저장 × | Y | 안내문 |
| 데이터 있음(바뀐 것 없음) | 세 칸이 서버 값으로 채워져 있다 | **저장 ×** | N | `변경 사항이 없어요.` |
| 데이터 있음(바뀐 것 있음) | 고친 값이 그대로 보인다 | 저장 ○ | N | `저장하지 않은 변경 사항이 있어요.` |
| 데이터 없음 | 성립하지 않는다 — 값이 빈 문자열이면 빈 칸으로 그린다 | 저장 × | N | `변경 사항이 없어요.` |
| 조회 실패 | 폼이 사라지고 배너 하나 | 다시 시도 ○ | N | `내용을 불러오지 못했어요.` |
| 저장 중 | 입력과 저장이 잠기고 라벨이 `저장 중…` | 저장 × | Y | `저장하는 중이에요…` |
| 저장 실패 | 카드 맨 위 배너 · 입력 유지 | 저장 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 저장 ○ | N | §6 의 해당 문구 |
| 읽기 전용(권한) | **폼이 열리지 않는다** — 화면 전체가 `접근 권한이 없어요` | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | — | ○ | — | — | ○ | — | — |
| 운영자 | 역할의 `page:/company/ceo-message` 권한을 따른다 | — | 〃 | — | — | 〃 | — | — |
| 뷰어 | 화면이 열리지 않는다 | — | × | — | — | × | — | — |
| 권한 없음 | × | — | × | — | — | × | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — 회사 정보와 같다. ⚠ **수정 권한이 없으면 조회조차 할 수 없다** — 조회 전용 표시가 없다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-CEO-MESSAGE` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=이 화면 |
| `SCR-COMPANY-CEO-MESSAGE` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-COMPANY-CEO-MESSAGE` | 수정 권한 없이 진입 | `접근 권한이 없어요` 화면 | N | 수정 권한 없음 | 없음 | 사이드바로 다른 메뉴 |
| `SCR-COMPANY-CEO-MESSAGE` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 화면 |

**이 화면이 여는 팝업(모달)은 없다** — 회사 정보·오시는 길과 달리 주소 검색을 쓰지 않는다. 화면 고유 확인 다이얼로그도 0건이다.

**이 화면의 결과 통지 토스트는 1건**이고 §4 의 표에 문구 그대로 적혀 있다. 인벤토리(성공 1 · 실패 0)와 일치한다.
