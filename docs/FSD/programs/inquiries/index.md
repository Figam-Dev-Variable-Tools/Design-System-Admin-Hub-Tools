# 프로그램 문의 목록

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 문의 (프로그램) |
| 화면 ID | `SCR-PROGRAMS-INQUIRIES` |
| 메뉴 경로 | 프로그램 관리 > 문의 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 결제(PG)를 끈 프로그램에서 **후원 대신 들어온 문의**를 모아 답변 순서를 정하고, 여러 건을 묶어 견적으로 발행한다.

**업무 배경** — 결제대행을 끄면 프로그램 상세의 '후원하기' 버튼이 '문의하기'로 바뀐다. 후원하려던 사람이 그 자리에서 남긴 글이 여기로 들어온다. **항목을 만드는 것은 후원자이고 관리자는 답변하고 종결할 뿐이라 등록 폼이 없다** — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:3-6`.

**화면 설명** — 좌측 필터 레일(처리 상태 + 문의 유형 + 안내 3~4줄)과 우측 9열 읽기 전용 표다. 표의 마지막 열이 **견적 바구니**로, 여러 문의를 담아 한 견적으로 합칠 수 있다.

**주요 사용자** — 최상위 관리자 · 콘텐츠/펀딩 담당 운영자 · 상담원.

**사용 시나리오**

1. 좌측에서 '접수'를 골라 아직 손대지 않은 건만 본다 → 경과 배지가 붉은(2일 이상 미답변) 건부터 연다.
2. 같은 후원자의 문의 세 건을 바구니에 담아 `견적 발행` 을 누른다 → **한 견적으로 합쳐지고** 세 문의가 모두 그 견적을 가리킨다.
3. 이미 견적이 나간 문의는 바구니 대신 `견적 보기` 링크가 그 자리에 온다.

**선행 조건** — 로그인 · 이 화면의 읽기 권한. **⚠ 메뉴에서는 조건부로 사라진다**(§1.1).

**후행 처리** — 발행된 견적은 영업 관리의 견적 목록(`SCR-SALES-QUOTES`)에 나타나고, 그 견적에서 계약·청구로 이어진다.

**관련 화면** — [프로그램 문의 상세](detail.md) `SCR-PROGRAMS-INQUIRIES-DETAIL` · [견적 상세](../../sales/quotes/detail.md) `SCR-SALES-QUOTES-DETAIL` · [프로그램 상세](../detail.md)(문의가 생기는 원인이 보이는 곳) · `SCR-SETTINGS-PAYMENT` · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바 `프로그램 관리 > 문의`.

**관련 기능** — 상품 문의(`SCR-PRODUCTS-INQUIRIES`)와 **따로 산다.** 묻는 내용이 다르기 때문이다 — 상품은 '지금 살 수 있는 물건'이지만 프로그램은 **아직 만들어지지 않은 것에 돈을 먼저 거는 일**이라 문의가 리워드 구성·배송 예정·환불 조건에 몰린다. 그래서 이 모듈에는 상품 문의에 없는 축(문의 유형)이 하나 더 있다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:8-13`.

**관련 API** — 문의 목록 조회 1건 · 견적 발행 1건(공통 이음매를 지난다) · 문의 갱신 1건(발행 결과 반영). **백엔드가 없다** — `TODO(backend): GET /api/programs/inquiries · GET/PUT /api/programs/inquiries/:id` — `apps/admin/src/pages/programs/inquiries/data-source.ts:23`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일** — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx` (표시 규칙 `types.ts` · 저장소·전이 `_shared/store.ts` · 어댑터 `data-source.ts` · 발행 이음매 `apps/admin/src/shared/domain/quote-issue.ts`)

---

### 1.1 ⚠ 이 잎은 조건부 노출이다 — 메뉴에서 사라져도 라우트는 살아 있다

사이드바의 `프로그램 관리 > 문의` 는 **결제(PG)를 쓰지 않는 동안에만** 보인다. 결제를 켜면 새 문의가 생기지 않으므로 항목이 사라지고, **잔여 문의가 남아 있으면 `· 읽기 전용` 꼬리표를 달고 남는다** — [인벤토리](../../inventory.md) §2.

메뉴에서 사라져도 이 화면의 라우트(`/programs/inquiries`)는 그대로 살아 있다 — 과거 문의로 가는 길이 통째로 끊기면 안 되기 때문이다. **잔여를 세는 조회기가 배선되지 않았으면 '0건'이 아니라 '모른다'로 읽고 메뉴를 남긴다**(fail-open) — 지우는 쪽으로 실패하면 복구가 없다 — `apps/admin/src/shared/commerce/inquiry-backlog.ts:12-16`.

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 필터 레일(좌) — 안내 | 미답변 건수 · 이 문의가 어디서 오는지 · 견적 바구니 규칙 · (권한이 없으면) 조회 전용 안내 | 항상 | 전체 | 불가 | 표시 |
| 필터 레일(좌) — 처리 상태 | 전체 · 접수 · 답변 중 · 견적 발행 · 답변 완료 · 종결 + 건수 배지 | 항상 | 전체 | 불가 | 표시 |
| 필터 레일(좌) — 문의 유형 | 전체 · 리워드 · 배송 · 환불 · 결제 · 기타 + 건수 배지 | 항상 | 전체 | 불가 | 표시 |
| 검색영역 | 문의번호 · 프로그램명 · 문의자 · 제목 검색 | 항상 | 전체 | 불가 | 표시 |
| 바구니 막대 | 담은 건수와 `비우기` · `견적 발행` | **1건 이상 담았을 때만** | 답변 권한자 | 불가 | 숨김 |
| 목록영역 | 9열 읽기 전용 표(견적 바구니 열 포함). 행 클릭이 상세로 간다 | 항상 | 전체 | 불가 | 표시 |

**등록·삭제·일괄 선택이 없다** — 문의는 후원자가 만들고 관리자는 답변만 한다. 그래서 읽기 전용 껍데기를 쓴다.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 미답변 안내 | Text(hint) | 조회 전 `미답변 건수를 세는 중이에요.` · 조회 후 `답변을 기다리는 문의가 {N}건 있어요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:373-375` | **'0건'과 '아직 모름'을 다른 문장으로 말한다** | N | Y | — | — | — | — | 항상 | 미답변 = 접수 + 답변 중 |
| 2 | 유입 안내 | Text(hint) | `결제대행을 끈 프로그램은 후원하기 대신 문의하기 버튼이 노출되고, 그 문의가 이 목록으로 들어와요. 마감이 있는 펀딩이라 답변이 늦으면 후원이 사라져요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:378-380` | 이 화면이 존재하는 이유 | N | Y | — | — | — | — | 항상 | — |
| 3 | 바구니 안내 | Text(hint) | `여러 문의를 바구니에 담아 한 견적으로 합칠 수 있어요. 합친 문의는 모두 같은 견적을 가리켜요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:382-384` | — | N | Y | — | — | — | — | 항상 | — |
| 4 | 권한 안내 | Text(hint) | `답변 권한이 없어 조회만 가능해요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:386` | 상세에 들어가서야 알게 하지 않는다 | N | Y | — | — | — | — | 답변 권한이 없을 때 | — |
| 5 | 처리 상태 필터 | FilterPanel | `처리 상태`(제목) · `프로그램 문의 상태 필터`(nav 라벨) — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:391-392` | 접수 → 답변 중 → 견적 발행 → 답변 완료 → 종결 순 | N | N | 없음 | `전체` | — | 모르는 값은 '전체' | 항상 | 건수 배지 |
| 6 | 문의 유형 필터 | FilterPanel | `문의 유형`(제목) · `프로그램 문의 유형 필터` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:399-400` | 리워드 · 배송 · 환불 · 결제 · 기타 | N | N | 없음 | `전체` | — | 〃 | 항상 | 〃 |
| 7 | 검색 | SearchField | `문의번호·프로그램명·문의자·제목 검색` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:329` | 네 필드를 훑는다 | N | N | 없음 | URL 의 `q` | `문의번호 · 프로그램명 · 문의자 검색` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:330` | 없음 | 항상 | IME 안전 |
| 8 | 문의번호 열 | Text | `문의번호` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:245` | **id 가 곧 문의번호다** — 후원자가 부르는 번호와 관리자가 여는 주소가 같은 값이어야 서로를 지목할 수 있다 | N | Y | — | — | — | — | 항상 | `apps/admin/src/pages/programs/inquiries/_shared/store.ts:19-22` |
| 9 | 프로그램명 열 | Text | `프로그램명` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:250` | 비정규화 라벨(목록이 프로그램을 다시 조회하지 않게 한다) | N | Y | — | — | — | — | 항상 | — |
| 10 | 문의자 열 | Text | `문의자` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:253` | — | N | Y | — | — | — | — | 항상 | — |
| 11 | 제목 열 | Link | `제목` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:256` | 상세로 가는 **키보드 경로**(행 클릭은 마우스 전용) | N | Y | — | — | — | — | 항상 | — |
| 12 | 유형 열 | StatusBadge | `유형` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:262` | 리워드·배송(info) · 환불·결제(warning) · 기타(neutral) | N | Y | — | — | — | — | 항상 | `apps/admin/src/pages/programs/inquiries/types.ts:67-73` |
| 13 | 채널 열 | Text | `채널` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:271` | 프로그램 페이지 · 모바일 앱 · 전화 · 이메일 · 카카오톡 | N | Y | — | — | — | — | 항상 | `프로그램 페이지` 가 **PG 를 끈 상세의 문의하기 버튼**이다 — `apps/admin/src/pages/programs/inquiries/types.ts:98-104` |
| 14 | 상태 열 | StatusBadge | `상태` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:273` | 접수(warning) · 답변 중(info) · 견적 발행(info) · 답변 완료(success) · 종결(neutral) | N | Y | — | — | — | — | 항상 | **미답변 두 상태를 같은 색으로 묶지 않는다** — '답변 중'은 이미 사람이 붙은 상태다 — `apps/admin/src/pages/programs/inquiries/types.ts:25-38` |
| 15 | 접수일 열 | Text | `접수일` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:282` | KST 표기 | N | Y | — | — | — | — | 항상 | 저장은 UTC 다 |
| 16 | 경과 열 | StatusBadge | `경과` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:284` | `오늘 접수` · `{N}일째 미답변` · `당일 답변` · `{N}일 만에 답변` · `견적 발행` · `—` | N | Y | — | — | — | — | 항상 | §4.3 |
| 17 | 견적 바구니 열 | Button 또는 Link | `견적 바구니` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:295` | 미발행이면 `담기`/`담김` 토글(`aria-pressed`), 발행됐으면 `견적 보기` 링크 | N | N | 발행 처리 중 | 담기지 않음 | — | — | **답변 권한자에게만 이 열이 존재한다** | `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:293-317` |
| 18 | 바구니 막대 | Alert(info) | 담긴 건수 문구 `문의 {N}건을 한 견적으로 합쳐요.` 또는 거절 사유 — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:343-345` | **담은 것이 있을 때만 나타난다** — 아무것도 담기지 않은 화면에 죽은 버튼을 두지 않는다 | N | Y | — | — | — | — | 1건 이상 담았을 때 | — |
| 19 | 비우기 | Button(secondary) | `비우기` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:351` | 바구니를 통째로 비운다 | N | N | 발행 처리 중 | — | — | — | 〃 | — |
| 20 | 견적 발행 | Button(primary) | `견적 발행` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:358` | 담긴 문의를 한 견적으로 만든다 | N | N | 발행 처리 중 **또는 거절 사유가 있을 때** | — | — | — | 〃 | 거절 사유는 §6 |
| 21 | 빈 상태 안내 | Empty | 상황별(§7) | `createVerb` 가 `접수` 다 — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:423` | N | Y | — | — | — | — | 결과 0건 | — |
| 22 | 조회 실패 배너 | Alert(danger) + Button | `{엔티티} 목록을 불러오지 못했어요.` — `apps/admin/src/shared/crud/CrudReadListShell.tsx:156` (엔티티에 `문의` 가 들어간다) · `다시 시도` | — | N | Y | — | — | — | — | 조회 실패 | — |

## 4. 기능 명세

### 4.1 문의 목록 조회

| 항목 | 내용 |
|---|---|
| 기능 목적 | 답변을 기다리는 문의를 찾는다 |
| 실행 조건 | 진입 · 조회 조건 변경 · 발행 성공 후 |
| 사용자 동작 | 없음(자동) |
| 시스템 처리 | 목록을 **접수 최신순**(같은 시각은 문의번호로 안정 정렬)으로 받는다. 정렬을 어댑터에서 거는 이유는 목록 화면이 정렬을 맡으면 상세에서 돌아왔을 때 순서가 갈리기 때문이다 — `apps/admin/src/pages/programs/inquiries/data-source.ts:7-8` |
| 데이터 처리 | 읽기만 한다 |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 문의 전체 목록 1건 |
| 성공 처리 | 표가 그려진다. 토스트 없음 |
| 실패 처리 | 표 자리에 danger 배너 + `다시 시도` |
| 예외 처리 | 재조회 중에는 이전 행을 유지한다 |
| 화면 변경 사항 | 목록영역 · 좌측 배지 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 필터 · 검색

| 항목 | 내용 |
|---|---|
| 기능 목적 | 지금 손댈 문의만 남긴다 |
| 실행 조건 | 목록이 그려져 있을 때 |
| 사용자 동작 | 좌측 두 필터 · 검색어 입력 |
| 시스템 처리 | 두 축을 **한 번에** 건다 — 화면이 `filter().filter()` 로 순서를 만들지 않게 한다 — `apps/admin/src/pages/programs/inquiries/types.ts:133-144` |
| 데이터 처리 | 없음 |
| Validation | 주소의 모르는 값은 '전체'로 되돌린다 |
| API 호출 여부 | N |
| 성공 처리 | 표가 좁혀지고 주소가 바뀐다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | **건수 배지는 필터 이전 전체에서 센다** — 필터가 자기 배지를 흔들면 비교가 불가능해진다 — `apps/admin/src/pages/programs/inquiries/types.ts:146` |
| 화면 변경 사항 | 목록영역 · 주소 |
| 후속 동작 | 뒤로가기·공유가 같은 조건을 재현한다 |
| 로그 기록 여부 | N |

### 4.3 경과 표기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 얼마나 기다리게 하고 있는지 한 칸으로 말한다 |
| 실행 조건 | 행을 그릴 때 |
| 사용자 동작 | 없음(자동) |
| 시스템 처리 | 미답변은 **접수일부터 오늘까지**, 답변된 건은 **접수일부터 최초 답변일까지** 를 센다 — 전자는 아직 흘러가는 시간이고 후자는 이미 끝난 사실이라 세는 구간이 다르다 — `apps/admin/src/pages/programs/inquiries/types.ts:233-239` |
| 데이터 처리 | 파생값이다 |
| Validation | 날짜를 읽을 수 없으면 `—` 를 그린다 — **0일로 위장하지 않는다** — `apps/admin/src/pages/programs/inquiries/types.ts:215-216` |
| API 호출 여부 | N |
| 성공 처리 | 미답변 `오늘 접수` / `{N}일째 미답변` · 답변됨 `당일 답변` / `{N}일 만에 답변` · 견적만 나간 건 `견적 발행` |
| 실패 처리 | 해당 없음 |
| 예외 처리 | **2일을 넘긴 미답변은 붉게(danger) 알린다** — 상품 문의(사흘)보다 하루 짧다. 펀딩은 마감이 있는 판매라 답이 늦으면 후원 자체가 사라진다(답을 못 받은 사람은 기다리지 않고 그냥 후원을 접는다) — `apps/admin/src/pages/programs/inquiries/types.ts:208-214`. **견적만 나가고 답변 글은 아직인 상태**를 '답변 완료'로 뭉개지 않고 따로 표기한다 |
| 화면 변경 사항 | 경과 열 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**기준일이 고정 문자열이다** — 픽스처의 경과가 실행하는 날마다 달라지면 스토리·테스트 비교가 매일 깨진다. 그래서 `today` 를 인자로 받는다 — `apps/admin/src/pages/programs/inquiries/types.ts:236-238`.

### 4.4 견적 바구니 · 견적 발행

| 항목 | 내용 |
|---|---|
| 기능 목적 | 여러 문의를 **한 견적으로 합친다** |
| 실행 조건 | 답변 권한이 있고 바구니에 1건 이상 담겼으며 거절 사유가 없을 때 |
| 사용자 동작 | 행의 `담기` 로 담고 막대의 `견적 발행` 클릭 |
| 시스템 처리 | 공통 이음매(`issueQuote`)에 담긴 문의를 넘긴다. **프로그램 화면은 영업 관리라는 모듈을 끝까지 모른다** — 페이지 간 결합을 피하려고 공통 층이 자리만 만들고 구현은 부팅 시 꽂힌다 — `apps/admin/src/shared/domain/quote-issue.ts:13-19` |
| 데이터 처리 | 문의가 견적으로 넘기는 값: 문의번호 · 창구(`program`) · **거래처 라벨에 후원자 이름**(프로그램 문의는 개인 후원자라 회사명을 갖지 않는다) · 문의자명 · **프로그램명이 견적의 첫 품목** · 문의 내용. 발행 뒤 각 문의에 `quoteId` 가 박히고 상태가 '견적 발행'으로 옮겨 간다 — `apps/admin/src/pages/programs/inquiries/_shared/store.ts:171-192` |
| Validation | §6 의 발행 4규칙 |
| API 호출 여부 | Y — 견적 생성 1건 + 담긴 문의 수만큼의 갱신 |
| 성공 처리 | 토스트 `MSG-PROGRAMS-INQUIRIES-01`(success): `견적 {견적번호}을(를) 발행했어요.`(조사는 견적번호의 받침이 고른다) — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:230` |
| 실패 처리 | 토스트 `MSG-PROGRAMS-INQUIRIES-02`(error): `견적을 발행하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:235`. **실패 토스트는 저절로 사라지지 않는다** |
| 예외 처리 | **중복 발행이 두 겹으로 막힌다**: ① 담긴 문의 중 하나라도 이미 견적을 가졌으면 발행 버튼이 거절 사유와 함께 잠긴다 ② 발행기가 그중 하나라도 이미 견적을 갖고 있으면 새로 만들지 않고 그 견적을 돌려준다 — `apps/admin/src/shared/domain/quote-issue.ts` 의 `issueQuote` 머리말 |
| 화면 변경 사항 | 바구니 막대 · 목록영역(그 행들이 `견적 보기` 로 바뀐다) |
| 후속 동작 | 영업 관리의 견적 목록에 그 견적이 나타난다 |
| 로그 기록 여부 | 확인하지 못했다 |

**토스트 대조** — [인벤토리](../../inventory.md) §9.3 은 `pages/programs/inquiries/ProgramInquiryListPage.tsx` 를 **성공 1 · 실패 1** 로 센다. 위 두 건이 그것이다.

### 4.5 상세로 이동 · 발행된 견적 열기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 한 건을 처리하러 들어가거나, 그 문의가 무엇이 됐는지 연다 |
| 실행 조건 | 행이 그려져 있을 때 |
| 사용자 동작 | 행 클릭(마우스) · 제목 링크(키보드) · `견적 보기` 클릭 |
| 시스템 처리 | 상세는 `/programs/inquiries/{id}`, 견적은 영업 관리의 견적 상세로 간다 — 경로는 공통 이음매가 한 곳에서 만든다 — `apps/admin/src/shared/domain/quote-issue.ts` 의 `issuedQuoteHref` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N(이동만) |
| 성공 처리 | 도착 화면이 열린다 |
| 실패 처리 | 그 사이에 지워졌으면 도착 화면이 조회 실패를 말한다 |
| 예외 처리 | 표 안의 `견적 보기` 를 눌렀을 때는 행 클릭이 함께 발동하지 않는다 |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 상세에서 답변·종결하면 이 목록의 상태·경과가 바뀐다 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 화면 진입 | `/programs/inquiries` 도달 | 주소의 조회 조건으로 목록 조회 | 화면 전체 | 목록 |
| 상태·유형 필터 클릭 | 좌측 항목 선택 | 주소 갱신 · 두 축을 한 번에 걸러 다시 그린다 | 필터 레일 · 목록영역 | 좁혀진 목록 |
| 검색 입력 | 조합 종료 후 타이핑 | 〃 | 검색영역 | 〃 |
| `담기`/`담김` 토글 | 미발행 행의 버튼 | 바구니에 넣거나 뺀다(`aria-pressed` 가 상태를 말한다) | 견적 바구니 열 · 바구니 막대 | — |
| 바구니가 비었다가 채워짐 | 첫 담기 | 바구니 막대가 **나타난다** | 바구니 막대 | — |
| `비우기` | 막대 버튼 | 바구니를 통째로 비운다(막대가 사라진다) | 바구니 막대 | — |
| `견적 발행` | 거절 사유가 없을 때 | 견적 생성 + 담긴 문의 갱신 | 화면 전체 | 목록 갱신 + 토스트 |
| 발행 성공 | 서버 응답 | 성공 토스트 + 그 행들이 `견적 보기` 로 바뀐다 | 목록영역 | 갱신된 목록 |
| 발행 실패 | 오류 | 실패 토스트(자동으로 사라지지 않는다) | — | 목록 유지 |
| 행 클릭 · 제목 링크 | 클릭 · Enter | 상세로 이동 | 목록영역 | `SCR-PROGRAMS-INQUIRIES-DETAIL` |
| `견적 보기` | 클릭 | 견적 상세로 이동 | 견적 바구니 열 | `SCR-SALES-QUOTES-DETAIL` |
| 조회 실패 | 목록 요청 실패 | 배너 + `다시 시도` | 목록영역 | 배너 |
| 검색 지우기 · 필터 초기화 | 빈 상태의 버튼 | 그 축만 되돌린다 | 툴바 · 필터 레일 | 목록 |

## 6. Validation

**이 화면에는 입력 폼이 없다.** 검증 대신 **발행 거절 규칙**이 그 자리를 갖는다. 판정은 공통 이음매의 술어 하나가 하고, **버튼의 비활성 조건과 저장의 거절 조건이 같은 술어를 읽는다**.

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 발행 — 선택 없음 | 1건 이상 담겨야 한다 | 렌더 · 클릭 | `견적을 발행할 문의를 한 건 이상 선택하세요.` — `apps/admin/src/shared/domain/quote-issue.ts:100` | 바구니 막대 자체가 나타나지 않는다 |
| 발행 — 이미 발행됨 | 담긴 것 중 견적을 가진 문의가 없어야 한다 | 〃 | `이미 견적이 발행된 문의가 있어요. 발행된 견적을 여세요.` — `apps/admin/src/shared/domain/quote-issue.ts:101` | 버튼 비활성 + 막대에 사유 표시 |
| 발행 — 종결된 문의 | 종결된 문의는 발행할 수 없다 | 〃 | `종결된 문의는 견적을 발행할 수 없어요.` — `apps/admin/src/shared/domain/quote-issue.ts:102` | 〃 |
| 발행 — 미배선 | 발행기가 꽂혀 있어야 한다 | 〃 | `견적 발행을 사용할 수 없어요. 관리자에게 문의하세요.` — `apps/admin/src/shared/domain/quote-issue.ts:103` | 〃 |
| 상태·유형 필터 | 알려진 값 중 하나 | 주소를 읽는 시점 | 없음 | 모르는 값은 '전체'로 되돌린다 |
| 검색어 | 검증하지 않는다 | — | — | 앞뒤 공백을 다듬어 소문자로 비교 — `apps/admin/src/pages/programs/inquiries/types.ts:183-196` |

**미배선을 조용히 넘기지 않는 이유** — 배선이 없을 때 아무 일도 하지 않으면 운영자는 '견적 발행'을 누르고 아무 반응도 못 본 채 다시 누른다. 그래서 미배선은 **거절 사유 문자열**로 드러난다 — `apps/admin/src/shared/domain/quote-issue.ts:23-26`.

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 검색이면 `조건에 맞는 문의가 없어요` / `검색어를 바꾸거나 지워 보세요.` · 필터면 `필터에 맞는 문의가 없어요` / `필터를 바꾸거나 초기화해 보세요.` · 정말 0건이면 `접수된 문의가 없어요` / `새로 추가하면 여기에 표시돼요.` — `packages/ui/src/molecules/Empty/Empty.tsx:71-84` | 표 대신 빈 상태 카드 | `검색 지우기` · `필터 초기화`. **정말 0건이면 할 일이 없다** — 이 화면에는 등록 CTA 가 없다(문의는 후원자가 만든다) |
| 저장 실패 | 이 화면의 유일한 쓰기는 견적 발행이다: `견적을 발행하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx:235` | 실패 토스트로 알린다(자동으로 사라지지 않는다). **바구니는 그대로 남는다** | 다시 `견적 발행` |
| 수정 실패 | 해당 없음 — 답변 수정은 상세의 일이다 | — | — |
| 삭제 실패 | 해당 없음 — **삭제 컨트롤이 없다** | — | — |
| API 오류 | `{엔티티} 목록을 불러오지 못했어요.` — `apps/admin/src/shared/crud/CrudReadListShell.tsx:156` (엔티티에 `문의` 가 들어간다) | 표 자리에 배너. 이미 그린 행은 지우지 않는다 | `다시 시도` |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | **자동 재시도를 하지 않는다** — `apps/admin/src/shared/query/queryClient.ts:82` | 〃 |
| 권한 없음 | 읽기가 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. **답변 권한이 없으면 견적 바구니 열과 바구니 막대가 통째로 사라지고** 좌측에 `답변 권한이 없어 조회만 가능해요.` 가 미리 뜬다 | 표는 그대로 보인다 | 관리자에게 권한 요청 |
| 세션 만료 | 로그인 화면이 `세션이 만료되었어요. 다시 로그인해 주세요.` 를 띄운다 — `apps/admin/src/pages/login/LoginPage.tsx:58` | 세션을 지우고 경로를 보존해 이동 | 재인증 후 이 목록 |
| 데이터 충돌 | **충돌 다이얼로그가 없다.** 다른 관리자가 그 사이에 같은 문의로 견적을 발행했으면 발행기가 **기존 견적을 그대로 돌려준다**(멱등) — 두 번째 견적이 생기지 않는다 | 덮어쓰지 않는다 | 목록을 다시 읽어 `견적 보기` 로 확인한다 |
| 중복 데이터 | 견적 중복 발행이 유일한 중복 위험이고 **두 겹으로 막혀 있다**(§4.4). 사용자에게는 `이미 견적이 발행된 문의가 있어요. 발행된 견적을 여세요.` 로 나타난다 | 두 번째 요청은 기존 견적을 돌려준다 | 그 행의 `견적 보기` |
| 파일 업로드 실패 | 해당 없음 — 이 화면에 파일 입력이 없다 | — | — |

**⚠ 메뉴에서 사라진 뒤에도 이 화면은 열린다**(§1.1). 결제를 켜면 새 문의가 생기지 않지만 과거 문의는 남고, 그 기록으로 가는 길을 끊지 않는다.

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 표 자리에 스켈레톤 행. **좌측 배지는 `—`, 미답변 문구는 `미답변 건수를 세는 중이에요.`** | 필터·검색 ○ | Y | 그 문구 |
| 데이터 있음 | 9열 표 + 배지 숫자 | 〃 | N | `답변을 기다리는 문의가 {N}건 있어요.` |
| 데이터 없음(0건) | 빈 상태 카드 | 〃 | N | §7 의 세 문구 |
| 조회 실패 | 배너 + `다시 시도`. **배지는 `—` 로 남는다**(0 으로 떨어지지 않는다) | 다시 시도 ○ | N | `{엔티티} 목록을 불러오지 못했어요.` |
| 재조회 중 | 이전 행 유지 | 〃 | N | 없음 |
| 바구니 비어 있음 | **막대가 없다** — 죽은 버튼을 두지 않는다 | — | N | — |
| 바구니 담김 | info 막대 + `비우기` · `견적 발행` | 발행 ○(거절 사유가 없을 때) | N | `문의 {N}건을 한 견적으로 합쳐요.` |
| 바구니에 발행된 문의가 섞임 | 막대에 **건수 대신 거절 사유**가 뜨고 발행 버튼이 잠긴다 | 발행 × | N | §6 의 해당 문구 |
| 발행 중 | 바구니 버튼과 행의 담기 토글이 잠기고 발행 버튼에 로딩 표시 | 발행 × | Y | — |
| 미답변(접수) | 상태 배지 warning · 경과 배지가 일수에 따라 info→warning→danger | 〃 | N | — |
| 미답변(답변 중) | 상태 배지 info — **'접수'와 다른 색이다**(이미 사람이 붙은 상태다) | 〃 | N | — |
| 견적만 발행됨 | 경과 배지가 `견적 발행` — '답변 완료'도 '미답변'도 사실이 아니다 | 〃 | N | — |
| 날짜를 읽을 수 없음 | 경과 배지가 `—` — **0일로 위장하지 않는다** | 〃 | N | — |
| 견적 발행됨 | 바구니 열이 `견적 보기` 링크로 바뀐다 | 〃 | N | — |
| 읽기 전용(권한) | **견적 바구니 열과 바구니 막대가 통째로 사라진다** | — | N | `답변 권한이 없어 조회만 가능해요.` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | — | ○ | — | — | — | — | — |
| 운영자 | 역할의 `program-inquiries` 리소스 매트릭스를 따른다 | — | 〃 | — | — | — | — | — |
| 뷰어 | ○ | — | × | — | — | — | — | — |
| 권한 없음 | × | — | × | — | — | — | — | — |

**등록·삭제 액션이 이 자원에 없다** — 문의는 후원자 채널이 만들고 관리자 화면에는 생성·삭제 경로가 없다. 어댑터의 `add` 는 계약을 채우는 문일 뿐이다 — `apps/admin/src/pages/programs/inquiries/data-source.ts:4-5`.

**견적 발행은 `update` 권한이 연다** — 이 화면은 `canUpdate` 하나로 바구니 열과 막대를 함께 가린다.

**⚠ 플랜(엔타이틀먼트) 매핑이 없다** — 모듈 표에 `/programs/inquiries` 가 없어 fail-open 으로 언제나 열린다 — `apps/admin/src/shared/entitlements/module-resources.ts`.

**권한이 없을 때 화면이 어떻게 되는가** — 읽기가 없으면 본문이 통째로 권한 화면이 된다. 답변 권한이 없으면 표는 그대로 보이되 바구니 축이 사라지고, 그 사실이 좌측에 미리 적힌다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-PROGRAMS-INQUIRIES` | 행 클릭 · 제목 링크 | `SCR-PROGRAMS-INQUIRIES-DETAIL` | N | 언제나 | 문의 id | 조회 조건이 보존된 이 목록 |
| `SCR-PROGRAMS-INQUIRIES` | `견적 보기` | `SCR-SALES-QUOTES-DETAIL` | N | 그 문의에 발행된 견적이 있을 때 | 견적 id | 이 목록 |
| `SCR-PROGRAMS-INQUIRIES` | `견적 발행` 성공 | 이동하지 않는다 | N | 거절 사유가 없을 때 | — | 갱신된 이 목록 + 토스트 |
| `SCR-PROGRAMS-INQUIRIES` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 목록 |

**이 화면에는 팝업도 확인 다이얼로그도 없다** — [인벤토리](../../inventory.md) §7·§8 에 이 화면이 없다. **견적 발행에도 확인을 세우지 않는다**(두 번 눌러도 견적은 하나이고, 발행된 문의는 버튼이 사라진다).
