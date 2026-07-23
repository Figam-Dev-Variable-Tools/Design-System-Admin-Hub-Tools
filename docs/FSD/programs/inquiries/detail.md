# 프로그램 문의 처리(상세)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 프로그램 문의 처리 |
| 화면 ID | `SCR-PROGRAMS-INQUIRIES-DETAIL` |
| 메뉴 경로 | 프로그램 관리 > 문의 > (행 선택) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 문의 한 건을 읽고 **답변을 쓰고 상태를 옮긴다.** 이 문의 한 건만으로 견적을 발행할 수도 있다.

**업무 배경** — 결제(PG)를 끈 프로그램에서 후원하려던 사람이 남긴 글이 여기로 들어온다. 답변은 **후원자에게 그대로 나가는 글**이라, 빈 답변이 '답변 완료'로 상태를 넘기면 후원자는 아무것도 받지 못한 채 처리된 것으로 집계된다 — `apps/admin/src/pages/programs/inquiries/validation.ts:4-6`.

**화면 설명** — 좌우 2단이다. 왼쪽 카드에 문의 정보·발행 견적·답변 작성칸·액션 버튼 줄이, 오른쪽에 문의자 정보와 처리 이력 타임라인이 있다.

**주요 사용자** — 최상위 관리자 · 콘텐츠/펀딩 담당 운영자 · 상담원.

**사용 시나리오**

1. 접수된 문의를 열어 `답변 착수` 로 상태를 옮긴다(담당자가 잡았다는 표시다 — 후원자에게는 아직 아무것도 나가지 않는다).
2. 답변을 쓰고 `답변 저장` → 상태가 '답변 완료'로 넘어간다 → 그다음 `문의 종결` 이 나타난다.
3. 견적이 필요한 문의면 `견적 발행` 을 눌러 이 한 건을 견적으로 만든다 → 이후 `견적 보기` 링크가 생긴다.

**선행 조건** — 로그인 · 읽기 권한. 답변·종결·발행은 **수정 권한**이 있어야 버튼이 존재한다.

**후행 처리** — 상태와 답변이 목록의 상태·경과 열에 반영된다. 견적을 발행하면 영업 관리의 견적 목록에 그 견적이 나타난다.

**관련 화면** — [프로그램 문의 목록](index.md) `SCR-PROGRAMS-INQUIRIES` · [견적 상세](../../sales/quotes/detail.md) `SCR-SALES-QUOTES-DETAIL` · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자기 자리가 없다. **부모 잎은 조건부 노출이다**(§ [프로그램 문의 목록](index.md) §1.1).

**관련 기능** — 답변 본문·답변 시각·상태는 **한 함수에서만 함께** 움직인다. '답변은 저장됐는데 상태는 아직 접수'인 순간이 생기면 미답변 집계·목록 배지·경과 문구가 한꺼번에 거짓말을 한다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:15-18`.

**관련 API** — 문의 상세 조회 1건 · 문의 갱신 1건(모든 전이가 이 한 경로를 지난다) · 견적 발행 1건(공통 이음매). **백엔드가 없다** — `TODO(backend): GET /api/programs/inquiries · GET/PUT /api/programs/inquiries/:id · 답변 저장은 본문·답변시각·상태를 한 트랜잭션으로 옮긴다(applyProgramAnswer 와 같은 규칙). · 종결은 답변이 나간 문의에만 허용하고, 위반은 409 로 되돌린다.` — `apps/admin/src/pages/programs/inquiries/data-source.ts:23-26`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일** — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx` (전이 규칙 `_shared/store.ts` · 검증 `validation.ts` · 표시 규칙 `types.ts` · 발행 이음매 `apps/admin/src/shared/domain/quote-issue.ts`)

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 돌아가기 | 목록으로 | 항상 | 전체 | 불가 | 표시 |
| Header | 화면 제목 `프로그램 문의 처리` | 항상 | 전체 | 불가 | 표시 |
| 상세영역(좌) — 문의 | 제목 + 상태 배지 · 유형/채널/경과 배지 · 정의목록 6줄 | 조회 성공 | 전체 | 불가 | 표시 |
| 안내영역 | 저장 실패 배너 · 권한 없음 안내 | 조건부 | 전체 | 불가 | 숨김 |
| 입력영역(좌) | 답변 작성칸(또는 발송한 답변 읽기 표시) | 조회 성공 | 전체 | 불가 | 표시 |
| 버튼영역(좌) | `목록으로` · `답변 착수` · `문의 종결` · `견적 발행` · `답변 저장` | 조회 성공 · **각각 조건부** | 조건부 | 불가 | 조건부 |
| 상세영역(우) — 문의자 | 문의자 · 연락처 · 문의 유형 · 유입 채널 + 안내 한 줄 | 조회 성공 | 전체 | 불가 | 표시 |
| 이력영역(우) | 처리 이력 타임라인 | 조회 성공 | 전체 | 불가 | 표시 |

**이 화면에는 삭제가 없다** — 문의는 후원자가 만들고 관리자는 답변만 한다.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 목록으로(상단) | Button(text) | `목록으로` | 아이콘 `chevron-left` | N | N | 없음 | — | — | — | 항상 | — |
| 2 | 화면 제목 | Heading(h1) | `프로그램 문의 처리` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:278` | 이 화면의 유일한 h1 | Y | Y | — | — | — | — | 항상 | — |
| 3 | 문의 제목 | CardTitle | 문의의 제목 | 카드 머리 | Y | Y | — | — | — | — | 조회 성공 | — |
| 4 | 상태 배지 | StatusBadge | 접수(warning) · 답변 중(info) · 견적 발행(info) · 답변 완료(success) · 종결(neutral) | — | N | Y | — | — | — | — | 〃 | `apps/admin/src/pages/programs/inquiries/types.ts:31-38` |
| 5 | 유형 배지 | StatusBadge | 리워드 · 배송 · 환불 · 결제 · 기타 | 처리하는 사람이 다르기 때문에 필요한 축이다 | N | Y | — | — | — | — | 〃 | `apps/admin/src/pages/programs/inquiries/types.ts:63-73` |
| 6 | 채널 배지 | StatusBadge(info) | 프로그램 페이지 · 모바일 앱 · 전화 · 이메일 · 카카오톡 | — | N | Y | — | — | — | — | 〃 | — |
| 7 | 경과 배지 | StatusBadge | `오늘 접수` · `{N}일째 미답변` · `당일 답변` · `{N}일 만에 답변` · `견적 발행` · `—` | 목록과 **같은 규칙·같은 기준일**을 쓴다 | N | Y | — | — | — | — | 〃 | — |
| 8 | 문의 정의목록 | 정의목록 | `문의번호` · `프로그램` · `접수일시` · `답변일시` · `문의 내용` · `발행 견적` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:311-326` | 읽기 전용 | N | Y | — | — | — | — | 〃 | 시각 표기는 KST |
| 9 | 발행 견적 | Text 또는 Link | 없으면 `아직 발행된 견적이 없어요.` · 있으면 `견적 보기` 링크 — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:329,335` | 문의 ↔ 견적 양방향 | N | Y | — | — | — | — | 〃 | 목적지는 영업 관리의 견적 상세 |
| 10 | 답변 작성칸 | TextareaField | `답변 작성`(처음) / `답변 수정`(이미 답변이 있으면) · 힌트 `저장하면 상태가 '답변 완료' 로 넘어가요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:344,353` | 6줄 | Y | N | 저장 중 · **답변 권한 없음** | 저장된 답변 | `후원자에게 전달할 답변을 입력하세요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:354` | 1,000자 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:78` | **종결되지 않은 문의에서만** | 종결되면 읽기 표시로 바뀐다 |
| 11 | 발송한 답변(읽기) | 라벨 + 본문 + 안내 | `발송한 답변` + 본문 + `종결된 문의라 답변을 수정할 수 없어요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:359-361` | 종결된 문의는 기록이라 손대지 않는다 | N | Y | — | — | — | — | **종결된 문의에서만** | — |
| 12 | 권한 안내 | Alert(info) | `이 문의에 답변할 권한이 없어요. 조회만 가능해요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:366` | — | N | Y | — | — | — | — | 답변 권한이 없을 때 | — |
| 13 | 저장 실패 배너 | Alert(danger) | §7 의 문구 | 카드 안쪽 위 | N | Y | — | 없음 | — | — | 저장 실패 시 | `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:296` |
| 14 | 목록으로(하단) | Button(secondary) | `목록으로` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:371` | — | N | N | 저장 중 | — | — | — | 조회 성공 | — |
| 15 | 답변 착수 | Button(secondary) | `답변 착수` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:376` | **접수 상태에서 한 번만** 존재한다 | N | N | 저장 중 | — | — | — | 답변 권한 + 상태가 '접수' | 누를 수 없는 것을 보여 주지 않는다 |
| 16 | 문의 종결 | Button(secondary) | `문의 종결` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:381` | **답변 완료 상태에서만** 존재한다 | N | N | 저장 중 | — | — | — | 답변 권한 + 상태가 '답변 완료' | 〃 |
| 17 | 견적 발행 | Button(secondary) | `견적 발행` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:387` | **거절 사유가 없을 때만** 존재한다 | N | N | 저장 중 | — | — | — | 답변 권한 + 발행 가능 | 발행된 문의에는 위의 `견적 보기` 가 있다 |
| 18 | 답변 저장 | Button(primary) | `답변 저장` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:397` | — | Y | N | 저장 중 **또는 변경 없음** | — | — | — | 답변 권한 + 종결 전 | — |
| 19 | 문의자 정보 | 정의목록 | `문의자` · `연락처` · `문의 유형` · `유입 채널` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:408-414` | 읽기 전용 | N | Y | — | — | — | — | 조회 성공 | — |
| 20 | 회신 안내 | Text(hint) | `답변은 위 연락처로 회신돼요. 결제대행을 끈 프로그램은 후원하기 대신 문의하기 버튼이 노출돼요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:417-419` | **앱이 메시지를 보내지는 않는다** — 회신 수단은 이 연락처다 | N | Y | — | — | — | — | 〃 | — |
| 21 | 처리 이력 | Timeline | `처리 이력`(카드 제목) · `프로그램 문의 처리 이력`(목록 라벨) — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:424-425` | **저장된 사실에서 파생한다**(별도 로그 테이블이 아니다) | N | Y | — | — | — | — | 〃 | §4.6 |
| 22 | 조회 실패 배너 | Alert(danger) + Button ×2 | §7 | 없음/오류를 가른다 | N | Y | — | — | — | — | 조회 실패 | — |

## 4. 기능 명세

### 4.1 문의 상세 조회

| 항목 | 내용 |
|---|---|
| 기능 목적 | 처리할 한 건의 사실을 읽는다 |
| 실행 조건 | 주소에 문의 id 가 있을 때 |
| 사용자 동작 | 목록의 행 클릭 · 주소 직접 입력 |
| 시스템 처리 | 상세를 조회하고 처리 이력을 저장된 값에서 파생해 그린다 |
| 데이터 처리 | 읽기만 한다 |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 문의 상세 1건 |
| 성공 처리 | 좌우 2단이 그려진다. 토스트 없음 |
| 실패 처리 | **없는 것과 고장난 것을 가른다**: `문의를 찾을 수 없어요. 이미 삭제되었을 수 있어요.` 에는 `목록으로` 만, `문의를 불러오지 못했어요.` 에는 `다시 시도` + `목록으로` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:244-258` |
| 예외 처리 | 이미 지워진 문의에 '다시 시도'는 영원히 실패하므로 권하지 않는다 |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 답변 저장 (본문 · 시각 · 상태가 함께 움직인다)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 후원자에게 나갈 답변을 기록하고 상태를 '답변 완료'로 옮긴다 |
| 실행 조건 | 답변 권한이 있고 **종결되지 않은** 문의이며 작성칸이 저장값과 다를 때 |
| 사용자 동작 | 답변을 쓰고 `답변 저장` 클릭 |
| 시스템 처리 | 본문(공백 다듬음) · 답변 시각 · 상태를 **한 함수에서 함께** 옮긴다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:130-145` |
| 데이터 처리 | **답변 시각은 최초 답변 시각이라 재수정에서 바뀌지 않는다** — 후원자에게 한 약속이 언제 나갔는지는 나중에 고쳐 쓸 수 없는 사실이다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:124-128` |
| Validation | §6 의 답변 2규칙 |
| API 호출 여부 | Y — 문의 갱신 1건 |
| 성공 처리 | 재조회하고 토스트 `MSG-PROGRAMS-INQUIRIES-DETAIL-01`(success): 첫 답변이면 `답변을 저장하고 답변 완료로 변경했어요.`, 수정이면 `답변을 수정했어요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:204` |
| 실패 처리 | 카드 안 danger 배너 `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:186`. 입력은 그대로 남는다 |
| 예외 처리 | **판정은 zod 스키마가 한다** — 화면이 자기 조건문으로 다시 판단하면 규칙이 둘로 갈라진다 — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:194`. 저장소도 같은 규칙으로 한 번 더 막는다 |
| 화면 변경 사항 | 상태 배지 · 경과 배지 · 답변일시 · 버튼 줄 · 이력영역 |
| 후속 동작 | 목록의 상태·경과가 바뀌고 미답변 집계가 준다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.3 답변 착수

| 항목 | 내용 |
|---|---|
| 기능 목적 | 담당자가 잡았다는 표시를 남긴다 |
| 실행 조건 | 답변 권한 + **상태가 '접수'일 때만** — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:118-121` |
| 사용자 동작 | `답변 착수` 클릭 |
| 시스템 처리 | 상태를 '답변 중'으로 옮긴 문의를 저장한다 |
| 데이터 처리 | **후원자에게는 아직 아무것도 나가지 않는다** — 미답변 집계에 그대로 남는다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:150` |
| Validation | 전이 규칙(§6) |
| API 호출 여부 | Y — 갱신 1건 |
| 성공 처리 | 토스트 `MSG-PROGRAMS-INQUIRIES-DETAIL-01`(success) `답변 중으로 변경했어요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:210` |
| 실패 처리 | §4.2 와 같은 배너 |
| 예외 처리 | **버튼은 접수 상태에서만 존재한다** — 한 번 옮기면 사라진다(되돌아가는 전이가 없다) |
| 화면 변경 사항 | 상태 배지 · 버튼 줄 · 이력영역 |
| 후속 동작 | 목록의 상태 배지가 info 로 바뀐다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.4 문의 종결

| 항목 | 내용 |
|---|---|
| 기능 목적 | 처리를 끝낸 문의를 닫는다 |
| 실행 조건 | 답변 권한 + **상태가 '답변 완료'일 때만** — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:113-116` |
| 사용자 동작 | `문의 종결` 클릭 |
| 시스템 처리 | 상태를 '종결'로 옮긴다 |
| 데이터 처리 | **답변이 나간 뒤에만 닫는다** — 답변 없이 종결하면 후원자는 아무것도 못 받은 채 처리된 것으로 집계된다 |
| Validation | 전이 규칙(§6) |
| API 호출 여부 | Y — 갱신 1건 |
| 성공 처리 | 토스트 `MSG-PROGRAMS-INQUIRIES-DETAIL-01`(success) `문의를 종결했어요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:236` |
| 실패 처리 | §4.2 와 같은 배너 |
| 예외 처리 | ⚠ **확인 다이얼로그가 없다.** 종결은 되돌리는 전이가 없는 종점인데(`apps/admin/src/pages/programs/inquiries/_shared/store.ts:82-85`) 버튼 한 번으로 커밋된다. 고객센터 티켓 상세는 같은 성격의 종결에 확인을 세운다 |
| 화면 변경 사항 | 상태 배지 · 답변 작성칸이 **읽기 표시로 바뀐다** · 버튼 줄 · 이력영역 |
| 후속 동작 | 목록의 상태가 '종결'이 되고 견적 발행도 막힌다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.5 견적 발행 (이 한 건으로)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이 문의를 영업 관리의 견적 한 장으로 만든다 |
| 실행 조건 | 답변 권한 + 거절 사유가 없을 때(§6) |
| 사용자 동작 | `견적 발행` 클릭 |
| 시스템 처리 | 공통 이음매에 이 문의 하나를 넘긴다. **프로그램 화면은 영업 관리라는 모듈을 끝까지 모른다** — 발행기는 공통 층이 들고 있고 그 자리에 구현을 꽂는 것은 두 도메인을 아는 부팅 코드다 — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:213-218` |
| 데이터 처리 | 문의에 `quoteId` 가 박히고 상태가 '견적 발행'으로 옮겨 간다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:164-168`. 견적으로 넘어가는 값은 목록 문서 §4.4 와 같다 |
| Validation | §6 의 발행 4규칙 |
| API 호출 여부 | Y — 견적 생성 1건 + 문의 갱신 1건 |
| 성공 처리 | 토스트 `MSG-PROGRAMS-INQUIRIES-DETAIL-01`(success) `견적 {견적번호}을(를) 발행했어요.`(조사는 견적번호의 받침이 고른다) — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:230` |
| 실패 처리 | §4.2 와 같은 배너 |
| 예외 처리 | **두 번 눌러도 견적은 하나다** — `quoteId` 가 멱등키라 버튼은 발행된 문의에서 사라지고, 저장소도 문의 id 로 한 번 더 교차 확인한다(이중 방어). **배선이 없으면 여기 도달하지 않는다**(거절 사유가 먼저 막는다) — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:220-227` |
| 화면 변경 사항 | 상태 배지 · `발행 견적` 줄이 링크로 바뀐다 · 버튼 줄 · 이력영역 |
| 후속 동작 | 영업 관리의 견적 목록에 그 견적이 나타난다 |
| 로그 기록 여부 | 확인하지 못했다 |

**토스트 대조** — [인벤토리](../../inventory.md) §9.3 은 `pages/programs/inquiries/ProgramInquiryDetailPage.tsx` 를 **성공 1 · 실패 0** 으로 센다. §4.2~§4.5 네 동작이 **한 저장 경로**를 지나며 그 하나의 성공 토스트에 서로 다른 문구를 싣는다. 실패는 토스트가 아니라 카드 안 배너다.

### 4.6 처리 이력 (파생 타임라인)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 언제 무엇이 일어났는지 시간순으로 보인다 |
| 실행 조건 | 조회 성공 후 |
| 사용자 동작 | 없음(표시) |
| 시스템 처리 | **별도 로그 테이블이 아니라 저장된 사실에서 파생한다** — 접수(접수 시각) · 답변 중(상태) · 견적 발행(`quoteId`) · 답변(답변 시각·본문) · 종결(상태) — `apps/admin/src/pages/programs/inquiries/types.ts:272-277` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 항목마다 작성자(`후원자`/`관리자`)·배지·문장이 그려진다 |
| 실패 처리 | 해당 없음 |
| 예외 처리 | **파생이라 갈라질 수 없다** — 이력을 따로 쌓으면 답변을 고쳤을 때 이력과 본문이 갈라지는 순간이 생긴다 |
| 화면 변경 사항 | 이력영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 화면 진입 | `/programs/inquiries/:id` 도달 | 상세 조회 | 화면 전체 | 로딩 → 상세 |
| 답변 입력 | 타이핑 | 인라인 오류를 걷어내고 저장 버튼을 살린다 | 답변 작성칸 · 저장 버튼 | — |
| `답변 저장` | 변경이 있고 종결 전일 때 | 검증 → 갱신 1건 | 화면 전체 | 갱신된 상세 + 토스트 |
| `답변 착수` | 상태가 '접수' | 상태 전이 저장 | 〃 | 〃 |
| `문의 종결` | 상태가 '답변 완료' | 상태 전이 저장(**확인 없이 곧장**) | 〃 | 〃 |
| `견적 발행` | 거절 사유가 없을 때 | 견적 생성 + 문의 갱신 | 〃 | 〃 |
| 저장 성공 | 서버 응답 | 재조회 + 성공 토스트 | 화면 전체 | 갱신된 상세 |
| 저장 실패 | 서버 오류 | 카드 안 danger 배너 | 안내영역 | 상세 + 배너 |
| 저장 중단 | 화면 이탈로 요청 취소 | 아무 표시도 하지 않는다 | — | — |
| `견적 보기` | 발행 견적 줄의 링크 | 견적 상세로 이동 | 상세영역 | `SCR-SALES-QUOTES-DETAIL` |
| `목록으로` | 상·하단 버튼 | 목록으로 이동 | — | `SCR-PROGRAMS-INQUIRIES` |
| 이탈 시도 | 작성 중인 답변이 있는 채 이동 | `DLG-COMMON-LEAVE-FORM` | 다이얼로그 | 확인=이동 · 취소=머무름 |

## 6. Validation

**답변 검증의 정본은 zod 스키마다** — `apps/admin/src/pages/programs/inquiries/validation.ts`. **전이 규칙은 저장소의 순수 술어**가 갖고, 버튼의 존재 조건과 저장의 거절 조건이 같은 술어를 읽는다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:80-83`.

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 답변 — 비어 있음 | 공백만이면 안 된다 | 저장 클릭 시 | `답변 내용을 입력하세요.` — `apps/admin/src/pages/programs/inquiries/validation.ts:13` | 요청을 만들지 않고 그 필드의 인라인 오류로 |
| 답변 — 길이 | 1,000자 이하 | 〃 | `답변은 1000자를 넘을 수 없어요.` — `apps/admin/src/pages/programs/inquiries/validation.ts:15` | 입력이 상한에서 멈추므로 사실상 도달하지 않는다 |
| 답변 — 종결된 문의 | 종결되면 답변을 고칠 수 없다 | 렌더 · 저장소 | `종결된 문의는 답변을 수정할 수 없어요.` — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:85` | 작성칸이 읽기 표시로 바뀌고 저장 버튼이 사라진다 |
| 답변 — 저장소 재검증 | 공백만이면 안 된다 | 저장소 | `답변 내용을 입력하세요.` — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:87` | 화면이 먼저 막지만 저장소가 한 번 더 막는다 |
| 종결 — 미답변 | 답변이 나간 문의만 닫는다 | 렌더 · 저장소 | `답변하지 않은 문의는 종결할 수 없어요.` — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:86` | 버튼이 존재하지 않는다 |
| 답변 착수 — 상태 | 접수 상태에서만 | 〃 | `접수 상태의 문의만 답변 착수로 바꿀 수 있어요.` — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:88` | 〃 |
| 견적 발행 — 종결 | 종결된 문의는 발행할 수 없다 | 〃 | 저장소: `종결된 문의는 견적을 발행할 수 없어요.` — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:89` · 이음매: `종결된 문의는 견적을 발행할 수 없어요.` — `apps/admin/src/shared/domain/quote-issue.ts:102` | 버튼이 존재하지 않는다 |
| 견적 발행 — 이미 발행됨 | 그 문의에 견적이 없어야 한다 | 〃 | `이미 견적이 발행된 문의가 있어요. 발행된 견적을 여세요.` — `apps/admin/src/shared/domain/quote-issue.ts:101` | 〃 (대신 `견적 보기` 가 뜬다) |
| 견적 발행 — 선택 없음 | 1건 이상이어야 한다 | 〃 | `견적을 발행할 문의를 한 건 이상 선택하세요.` — `apps/admin/src/shared/domain/quote-issue.ts:100` | 이 화면에서는 언제나 1건이라 성립하지 않는다 |
| 견적 발행 — 미배선 | 발행기가 꽂혀 있어야 한다 | 〃 | `견적 발행을 사용할 수 없어요. 관리자에게 문의하세요.` — `apps/admin/src/shared/domain/quote-issue.ts:103` | 버튼이 존재하지 않는다 |

**되돌아가는 전이가 없다** — 답변한 문의를 '접수'로 되돌리면 그 사이의 응대 시간이 사라진다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:82-85`.

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `문의를 찾을 수 없어요. 이미 삭제되었을 수 있어요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:248` | 본문 대신 배너 + `목록으로`. **재시도를 주지 않는다** | `목록으로` |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:186` | 카드 안 danger 배너. 입력을 그대로 둔다 | 버튼 재클릭 |
| 수정 실패 | 저장 실패와 같은 경로 — 네 동작이 한 갱신 경로를 지난다 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다 | — | — |
| API 오류 | `문의를 불러오지 못했어요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx:249`(조회) / 위 저장 실패 문구(쓰기) | 조회 실패는 `다시 시도` + `목록으로` | 〃 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | **자동 재시도를 하지 않는다** — `apps/admin/src/shared/query/queryClient.ts:108` | 〃 |
| 권한 없음 | 읽기가 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. **답변 권한이 없으면 작성칸이 잠기고 액션 버튼 넷이 사라지며** info 배너가 `이 문의에 답변할 권한이 없어요. 조회만 가능해요.` 를 띄운다 | 읽는 것은 그대로 보인다 | 관리자에게 권한 요청 |
| 세션 만료 | 로그인 화면이 `세션이 만료되었어요. 다시 로그인해 주세요.` 를 띄운다 — `apps/admin/src/pages/login/LoginPage.tsx:58` | 세션을 지우고 경로를 보존해 이동 | 재인증 후 이 문의로 복귀 |
| 데이터 충돌 | **충돌 다이얼로그가 없다.** 이 저장은 문의 문서 한 벌을 통째로 보내므로 다른 관리자가 그 사이에 남긴 변경이 사라질 수 있다(last-write-wins). 다만 **견적 발행만은 멱등**이라 두 번째 발행이 새 견적을 만들지 않는다 | 서버가 거절하지 않는다 | 저장 뒤 재조회로 결과를 확인한다 |
| 중복 데이터 | 견적 중복 발행이 유일한 중복 위험이고 **두 겹으로 막혀 있다**(§4.5) | 두 번째 요청은 기존 견적을 돌려준다 | `견적 보기` |
| 파일 업로드 실패 | 해당 없음 — 이 화면에 파일 입력이 없다 | — | — |

**⚠ 종결에 확인이 없다** — 종결은 되돌리는 전이가 없는 종점인데 버튼 한 번으로 커밋된다(§4.4).

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 카드 하나에 로딩 표시 | 목록으로 ○ | Y | — |
| 데이터 있음 | 좌우 2단 | 조건부(§3) | N | 답변칸의 힌트 |
| 데이터 없음 | 성립하지 않는다 — 조회 실패로 떨어진다 | — | N | — |
| 조회 실패(없음) | 배너 + `목록으로` | 다시 시도 없음 | N | `문의를 찾을 수 없어요. …` |
| 조회 실패(오류) | 배너 + `다시 시도` + `목록으로` | 둘 다 ○ | N | `문의를 불러오지 못했어요.` |
| 저장 중 | 입력과 버튼이 잠기고 저장 버튼에 로딩 표시 | 저장 × | Y | — |
| 변경 없음 | 저장 버튼이 눌리지 않는다 | 저장 × | N | — |
| 접수 | `답변 착수` 가 있다. 종결·발행 조건은 아직 아니다 | 착수 ○ · 종결 × | N | — |
| 답변 중 | `답변 착수` 가 **사라진다**(되돌아가는 전이가 없다) | 착수 없음 | N | — |
| 견적 발행됨 | `발행 견적` 줄이 링크로 바뀌고 `견적 발행` 버튼이 **사라진다** | 발행 없음 | N | — |
| 답변 완료 | `문의 종결` 이 나타난다 · 답변일시가 채워진다 | 종결 ○ | N | — |
| 종결 | 답변 작성칸이 **읽기 표시로 바뀌고** 액션 버튼이 전부 사라진다 | 목록으로만 ○ | N | `종결된 문의라 답변을 수정할 수 없어요.` |
| 견적 없음 vs 모름 | 발행 견적 줄이 `아직 발행된 견적이 없어요.` — **'조회 못 함'은 카드 자체가 없는 상태다** | — | N | — |
| 답변일시 없음 | 정의목록의 그 줄이 비어 있다 — 아직 답변이 나가지 않았다는 사실이다 | — | N | — |
| 읽기 전용(권한) | 작성칸이 잠기고 액션 버튼 넷이 **사라진다** | 목록으로만 ○ | N | `이 문의에 답변할 권한이 없어요. 조회만 가능해요.` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | — | ○ | — | — | — | — | — |
| 운영자 | 역할의 `program-inquiries` 매트릭스 | — | 〃 | — | — | — | — | — |
| 뷰어 | ○ | — | × | — | — | — | — | — |
| 권한 없음 | × | — | × | — | — | — | — | — |

**답변·착수·종결·발행이 전부 `update` 하나로 열린다** — 이 화면은 `canUpdate` 를 읽어 네 버튼과 작성칸을 함께 가린다.

**등록·삭제 액션이 이 자원에 없다** — 문의는 후원자가 만들고 삭제 경로가 없다.

**⚠ 플랜(엔타이틀먼트) 매핑이 없다** — 모듈 표에 `/programs/inquiries` 가 없어 fail-open 으로 언제나 열린다 — `apps/admin/src/shared/entitlements/module-resources.ts`.

**권한이 없을 때 화면이 어떻게 되는가** — 읽기가 없으면 본문이 통째로 권한 화면이 된다. 답변 권한이 없으면 읽는 것은 그대로 보이고 쓰는 컨트롤만 사라지며, 그 사실을 info 배너가 말한다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-PROGRAMS-INQUIRIES-DETAIL` | 상·하단 `목록으로` | `SCR-PROGRAMS-INQUIRIES` | N | 작성 중인 답변이 있으면 이탈 가드를 먼저 거친다 | 없음 | — |
| `SCR-PROGRAMS-INQUIRIES-DETAIL` | `견적 보기` | `SCR-SALES-QUOTES-DETAIL` | N | 발행된 견적이 있을 때 | 견적 id | 이 화면 |
| `SCR-PROGRAMS-INQUIRIES-DETAIL` | 앱 안 링크 · 뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 작성 중인 답변이 저장값과 다를 때 | 이동하려던 경로 | 확인=목적지 · 취소=이 화면 |
| `SCR-PROGRAMS-INQUIRIES-DETAIL` | 탭 닫기 · 새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-PROGRAMS-INQUIRIES-DETAIL` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 화면 |

**이 화면에는 자기 팝업도 화면 고유 확인 다이얼로그도 없다** — [인벤토리](../../inventory.md) §7·§8.2 에 이 화면이 없다. 뜨는 것은 공통 이탈 가드 하나뿐이다. **종결에도 확인이 없다**(§4.4).
