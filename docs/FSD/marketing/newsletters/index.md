# 뉴스레터

> **뼈대는 [SMS 발송](../sms/index.md) 과 같다** — 수신자 세그먼트 · 발신자 레지스트리 · 발송 상태 ·
> 예약 · 상태별 허용 액션 · 조회 조건의 주소 왕복 · 공용 목록 껍데기가 전부 한 벌에서 나온다.
> **이 문서는 그 한 벌을 다시 적지 않고 이 화면의 차이만 적는다.** 차이는 셋이다:
> **회차 번호가 있고 · 광고성 축이 없으며 · 오픈율과 클릭율이 별도 열**이다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 뉴스레터 |
| 화면 ID | `SCR-MARKETING-NEWSLETTERS` |
| 메뉴 경로 | 비즈니스 > 마케팅 관리 > 뉴스레터 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 뉴스레터 발송회차를 한 목록에서 보고, 회차·제목·구독자 수·상태·오픈율·클릭율을 확인하며 등록·수정·삭제한다.

**업무 배경** — 뉴스레터는 이메일 캠페인과 달리 **회차로 이어지는 연속물**이다. 몇 회차까지 나갔는지가 곧 운영의 지표라 회차 번호가 첫 열이다.

**화면 설명** — 배치는 SMS·이메일 발송과 같다. 열은 **회차** · 제목 · 구독자수 · 상태 · **오픈율** · **클릭율**이다.

**주요 사용자** — 최상위 관리자 · 마케팅/콘텐츠 담당 운영자.

**사용 시나리오**

1. 최신 회차가 맨 위에 오므로 목록을 열면 지난 회차가 순서대로 보인다.
2. 상태 필터를 `예약` 으로 좁혀 다음 회차의 예약을 확인한다.
3. 발송완료 회차의 오픈율·클릭율을 비교한다.
4. `뉴스레터 등록` 으로 새 회차를 만든다(회차 번호는 저장 시 자동으로 매겨진다).

**선행 조건** — 로그인. 이 화면의 읽기 권한. **`이메일·뉴스레터 발송` 모듈이 이 계정에 있어야 한다**(§9).

**후행 처리** — 등록·수정한 회차가 이 목록에 반영된다. **이 화면에서 메일이 나가지는 않는다.**

**관련 화면** — [뉴스레터 등록·수정](form.md)(`SCR-MARKETING-NEWSLETTERS-FORM`) · 같은 뼈대의 [SMS 발송](../sms/index.md) · [이메일 발송](../email/index.md) · 본문을 채우는 [발송 템플릿 관리](../templates/index.md). 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바 `비즈니스 > 마케팅 관리` 의 세 번째 항목 — `apps/admin/src/shared/layout/nav-config.ts:223`. **플랜으로 잠긴다** — 이메일 발송과 **같은 키**(`marketing.email`, 최소 티어 `베이직`)가 이 경로도 지배한다 — `apps/admin/src/shared/entitlements/module-resources.ts:75-79` · `apps/admin/src/shared/entitlements/plan.ts:226-232`.

**관련 기능** — 발송 템플릿 관리가 본문의 원천이다([뉴스레터 등록·수정](form.md) 의 '템플릿 불러오기').

**관련 API** — [SMS 발송](../sms/index.md) 과 같은 다섯. 실제 전송은 하지 않는다 — `apps/admin/src/pages/marketing/newsletters/data-source.ts` 의 `TODO(backend)` 주석뿐이다.

**참고 문서** — [SMS 발송](../sms/index.md)(뼈대 정본) · [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/marketing/newsletters/NewsletterListPage.tsx` · `newsletters/types.ts` · `newsletters/data-source.ts` · 공용 모델 `apps/admin/src/pages/marketing/_shared/messaging.ts`

## 2. 페이지(UI) 구성

**[SMS 발송](../sms/index.md) 과 같다.** 영역의 종류·표시 조건에 차이가 없다.

## 3. UI 컴포넌트 정의

껍데기의 컴포넌트(발송상태 필터 · 등록 버튼 · 상태 배지 · 행 잠금 안내 · 행 선택 · 빈 상태)는 [SMS 발송](../sms/index.md) 과 같다. **이 화면만 다른 것**은 아래 일곱이다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 검색 입력 | SearchField | `제목 검색` — `apps/admin/src/pages/marketing/newsletters/NewsletterListPage.tsx:163` | **제목만** 훑는다 — `apps/admin/src/pages/marketing/newsletters/types.ts:43-50` | N | N | 없음 | 빈 값 | `제목 검색` — `NewsletterListPage.tsx:164` | — | 항상 | SMS·이메일은 발송명도 함께 훑는다 — 뉴스레터에는 발송명 필드가 없다 |
| 2 | 등록 버튼 | Button(primary) | `뉴스레터 등록` — `NewsletterListPage.tsx:187` | 등록 화면으로 이동 | N | N | 없음 | — | — | — | `create` 권한이 있을 때만 — `NewsletterListPage.tsx:184` | — |
| 3 | 회차 열 | Table 열 | 헤더 `회차` — `NewsletterListPage.tsx:83` | `{N}회` — `NewsletterListPage.tsx:85` | N | Y | — | — | — | — | 항상 | 우측 정렬. **저장 시 자동 채번된다** — `apps/admin/src/pages/marketing/newsletters/types.ts:24-25,61-63` |
| 4 | 제목 열 | Table 열 | 헤더 `제목` — `NewsletterListPage.tsx:87` | 수신함에 뜰 제목 | N | Y | — | — | — | — | 항상 | 뉴스레터에는 '발송명'이 따로 없다 — 제목이 그 역할을 겸한다 |
| 5 | 구독자수 열 | Table 열 | 헤더 `구독자수` — `NewsletterListPage.tsx:89` | `{N}명` — `NewsletterListPage.tsx:91` | N | Y | — | — | — | — | 항상 | 저장 시점의 비정규화 값 |
| 6 | 상태 열 | Table 열 | 헤더 `상태` — `NewsletterListPage.tsx:94` | 상태 배지 + (예약이 있으면) 예약 일시 — `NewsletterListPage.tsx:96-102` | N | Y | — | — | — | — | 항상 | SMS 는 `예약/발송상태`, 이메일은 `발송상태` 다 |
| 7 | 오픈율 열 · 클릭율 열 | Table 열 | 헤더 `오픈율` — `NewsletterListPage.tsx:106` · `클릭율` — `NewsletterListPage.tsx:116` | 발송완료면 각각 `{N}%`, 아니면 `—` — `NewsletterListPage.tsx:109-112,119-122` | N | Y | — | — | — | — | 항상 | **이메일은 한 열에 둘을 합쳐 그린다** — 뉴스레터는 나눠 그려 정렬 축이 둘이 된다 |
| 8 | 빈 상태 | Empty | `등록된 뉴스레터가 없어요` / `조건에 맞는 뉴스레터가 없어요` / `필터에 맞는 뉴스레터가 없어요` — 조립은 `packages/ui/src/molecules/Empty/Empty.tsx:71-76`(엔티티 이름 `뉴스레터` 는 `NewsletterListPage.tsx:33`) | 왜 비었는지 세 갈래 | N | Y | — | — | — | — | 0행일 때 | — |

**광고성 축이 없다** — 뉴스레터는 구독형이라 `(광고)` 표기를 강제하지 않는다(수신거부 링크는 항상 포함된다) — `apps/admin/src/pages/marketing/newsletters/validation.ts:3-4`.

## 4. 기능 명세

기능의 목록과 절차는 [SMS 발송](../sms/index.md) 과 같다: 목록 조회/검색/필터 · 상태가 편집을 가름 · 등록/수정 이동 · 삭제. **성공·실패·예외의 처리 방식도 같다.** 아래는 이 화면에서만 달라지는 값이다.

### 4.1 회차 번호와 정렬

| 항목 | 내용 |
|---|---|
| 기능 목적 | 연속물의 순서를 보여 준다 |
| 실행 조건 | 목록 조회 후 |
| 사용자 동작 | 없음(자동) |
| 시스템 처리 | **회차 번호 내림차순**으로 정렬한다(최신 회차가 위). 같은 값은 id 안정 정렬 — `apps/admin/src/pages/marketing/newsletters/types.ts:52-58`. 다음 회차 번호는 현재 최대 회차 + 1 이며 비어 있으면 1 이다 — `newsletters/types.ts:60-63` |
| 데이터 처리 | 없음(읽기). 채번은 저장 시 서버가 한다 — `apps/admin/src/pages/marketing/newsletters/types.ts:24-25` |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 최신 회차가 맨 위에 온다 |
| 실패 처리 | 실패 경로가 없다 |
| 예외 처리 | ⚠ **SMS·이메일과 정렬 축이 다르다** — 그 둘은 예약일시로 정렬한다. 뉴스레터는 회차 번호라, **예약일시가 뒤엉킨 회차**(늦게 만든 회차를 먼저 예약한 경우)는 목록 순서와 발송 순서가 어긋난다 |
| 화면 변경 사항 | 목록영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 오픈율·클릭율 표시

| 항목 | 내용 |
|---|---|
| 기능 목적 | 회차별로 열림과 클릭을 나눠 본다 |
| 실행 조건 | 행마다 |
| 사용자 동작 | 없음(읽기) |
| 시스템 처리 | 오픈율 = 오픈 ÷ 성공(전달), 클릭율 = 클릭 ÷ 성공(전달) — `apps/admin/src/pages/marketing/_shared/messaging.ts:538-547` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 발송완료 행의 두 열에 각각 `{N}%` 가 뜬다 |
| 실패 처리 | 실패 경로가 없다 |
| 예외 처리 | **발송완료가 아니면 두 열 모두 `—` 다** — `NewsletterListPage.tsx:112,122` |
| 화면 변경 사항 | 목록영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

[SMS 발송](../sms/index.md) 의 이벤트 표와 **같다.** 다른 것은 두 줄이다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| `뉴스레터 등록` 클릭 | 버튼 | 등록 화면으로 이동 | 버튼영역 | `SCR-MARKETING-NEWSLETTERS-FORM` |
| 플랜 변경(밖에서) | `marketing.email` 이 꺼짐 | **잠금 화면**으로 대체된다. 이메일 발송도 함께 잠긴다(같은 키다) | 화면 전체 | 잠금 화면 |

**이 화면 고유의 확인 다이얼로그는 없다.**

## 6. Validation

**해당 없음 — 이 목록 화면에는 입력 검증이 없다.** [SMS 발송](../sms/index.md) 과 같다. 발송 폼의 검증 규칙은 [뉴스레터 등록·수정](form.md) 이 갖는다.

## 7. 예외 처리

[SMS 발송](../sms/index.md) 의 표와 **같다.** 문구에서 엔티티 이름만 바뀌고 플랜 행이 이메일과 같다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `등록된 뉴스레터가 없어요` / `조건에 맞는 뉴스레터가 없어요` / `필터에 맞는 뉴스레터가 없어요` — `packages/ui/src/molecules/Empty/Empty.tsx:71-76` | 표 구조를 유지한 채 빈 상태 | `검색 지우기` · `필터 초기화` · 등록 |
| 저장 실패 · 수정 실패 | 해당 없음 — 이 화면에 저장 폼이 없다 | — | — |
| 삭제 실패 | 공통 규칙(다이얼로그를 닫지 않고 배너로) | — | 확인 재클릭 |
| 삭제 불가 | 발송중인 회차는 지울 수 없다 — `apps/admin/src/pages/marketing/_shared/messaging.ts:495-496` | 삭제가 성립하지 않는다 | 발송이 끝난 뒤 지운다 |
| 수정 불가 | `발송이 끝나 수정할 수 없어요` — `NewsletterListPage.tsx:223` | 행이 비활성으로 표시된다 | 새 회차로 등록한다 |
| API 오류 · 서버 오류 · 네트워크 오류 | 공용 목록 껍데기의 조회 실패 인라인 배너. 자동 재시도 없음 — `apps/admin/src/shared/query/queryClient.ts:82,108` | 표 자리를 대체한다 | 배너의 다시 시도 |
| 권한 없음 | 읽기 없음 → `접근 권한이 없어요` — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. 등록 권한만 없으면 버튼이 보이지 않는다 | 셸은 남는다 | 관리자에게 권한 요청 |
| **플랜 잠김** | `베이직 플랜에서 사용할 수 있어요` / `이메일·뉴스레터 발송 기능은 베이직 플랜부터 사용할 수 있어요. …` — `apps/admin/src/shared/errors/ErrorScreens.tsx:111-112` · `apps/admin/src/shared/entitlements/plan.ts:370-372` | 본문 대신 잠금 화면 | 사내 홈페이지에서 플랜 상향 |
| 세션 만료 | 이 화면에 자기 문구가 없다 | 원래 주소를 보존한 채 로그인 화면으로 | 재로그인 후 같은 조건으로 복귀 |
| 데이터 충돌 | 이 화면에는 쓰기 폼이 없다 | — | — |
| 중복 데이터 | **제목 중복을 막지 않는다.** 회차 번호는 저장 시 채번되므로 사람이 겹치게 만들 수 없다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 이 목록에 파일 입력이 없다 | — | — |

## 8. 화면 상태(State)

[SMS 발송](../sms/index.md) 의 상태 표와 **같다.** 문구의 엔티티 이름만 바뀌고, `—`(아직 없음)와 `0%`를 다르게 그리는 규칙도 같다. 이 화면만의 상태는 하나다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 플랜 잠김 | 본문 대신 잠금 화면(이메일 발송과 함께 잠긴다) | `플랜 보기` ○ · `현재 플랜 확인` ○ | N | `이메일·뉴스레터 발송 기능은 베이직 플랜부터 사용할 수 있어요. …` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○(초안·예약만) | ○(발송중 제외) | — | — | — | — |
| 운영자 | 역할의 `/marketing/newsletters` 리소스 × `read` | 같은 리소스 × `create` | × `update` + 상태 조건 | × `remove` + 상태 조건 | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — [SMS 발송](../sms/index.md) 과 같다. 플랜 축은 **이메일 발송과 같은 키**라 둘이 함께 잠기거나 함께 열린다 — `apps/admin/src/shared/entitlements/module-resources.ts:75-79`.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-MARKETING-NEWSLETTERS` | `뉴스레터 등록` 클릭 | `SCR-MARKETING-NEWSLETTERS-FORM` | N | `create` 권한 | 없음(빈 폼) | 저장·취소 시 목록 |
| `SCR-MARKETING-NEWSLETTERS` | 행 클릭(초안·예약) | `SCR-MARKETING-NEWSLETTERS-FORM` | N | 상태가 편집을 허용할 때 | 회차 id | 〃 |
| `SCR-MARKETING-NEWSLETTERS` | 행 클릭(발송중·완료·취소) | 이동 없음 | N | — | — | — |
| `SCR-MARKETING-NEWSLETTERS` | 행 삭제 클릭 | `DLG-COMMON-DELETE-ONE` | Y | 삭제 권한 + 상태 | 대상 1건의 id·이름 | 같은 목록 |
| `SCR-MARKETING-NEWSLETTERS` | 일괄 삭제 클릭 | `DLG-COMMON-DELETE-BULK` | Y | 1건 이상 선택 | 선택된 id 목록·건수 | 같은 목록 |
| `SCR-MARKETING-NEWSLETTERS` | 플랜 잠김 · `현재 플랜 확인` | `SCR-SETTINGS-PLAN` | N | `marketing.email` 잠김 | 없음 | — |
| `SCR-MARKETING-NEWSLETTERS` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | 원래 주소 · 만료 표식 | 재인증 후 같은 조건의 이 화면 |

**팝업이 없고 자기 결과 통지 토스트도 없다** — 인벤토리 §9.3 에 `pages/marketing/newsletters/NewsletterListPage.tsx` 가 없다.
