# 공지 등록 · 수정

> **이 문서는 콘텐츠 관리 폼 화면의 정본이다.** FAQ · 팝업 · 배너 · 약관 버전 · 처리방침 버전의 폼 문서는
> 같은 골격(RHF + zod 스키마 · 카드 하나 · 취소/제출 · 저장 실패 배너 · 미저장 이탈 가드)을 쓰므로
> **차이만** 적는다. 뉴스 폼만 다른 껍데기를 쓴다 — 그 차이는 [뉴스 등록·수정](../news/form.md)이 적는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 공지 등록 · 수정 |
| 화면 ID | `SCR-CONTENT-NOTICES-FORM` |
| 메뉴 경로 | 콘텐츠 관리 > 공지사항 > 공지 등록 (또는 상세 > 수정) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 공지 한 건을 새로 쓰거나 기존 공지를 고친다. **한 화면이 둘을 겸한다** — 주소에 id 가 있으면 수정, 없으면 등록이다.

**업무 배경** — 공지의 내용·분류·게시 상태는 운영자가 정한다. 예약 게시는 "오늘 밤에 올라가야 하는 점검 안내"처럼 사람이 그 시각에 앉아 있을 수 없는 경우를 위한 것이다.

**화면 설명** — 제목(h1)이 `공지 등록` 또는 `공지 수정` 으로 갈리고, 그 아래 카드 하나에 제목·분류·상태·게시일·상단 고정·본문이 놓인다. 맨 아래에 취소·제출 버튼이 오른쪽 정렬로 선다.

**주요 사용자** — 최상위 관리자 · 콘텐츠를 다루는 운영자.

**사용 시나리오**

1. 운영자가 목록에서 '공지 등록'을 눌러 제목·본문을 채우고 상태를 '게시'로 두고 등록한다 → 목록으로 돌아가며 성공 토스트가 뜬다.
2. 운영자가 점검 안내를 미리 써 두고 상태를 '예약'으로, 게시일을 다음 주로 정한다.
3. 운영자가 반쯤 쓰다 다른 메뉴를 누른다 → 저장하지 않은 변경 확인이 뜬다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈. 수정이면 그 id 의 공지가 실재해야 한다.

**후행 처리** — 등록 성공은 목록으로, 수정 성공은 **그 공지의 상세로** 간다. 두 이동 모두 히스토리를 덮어써 뒤로가기로 폼에 되돌아오지 않는다 — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:159,172`.

**관련 화면** — [공지사항 목록](index.md) · [공지 상세](detail.md) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/content/notices` 가 덮는다.

**관련 기능** — 목록의 '공지 등록' 버튼과 상세의 '수정' 버튼이 이 화면의 두 진입 경로다.

**관련 API** — 등록 1건 · 수정 1건 · (수정 진입 시) 상세 조회 1건. **백엔드가 없다** — `apps/admin/src/pages/content/notices/data-source.ts:194`(등록) · `:201`(수정) · `:171`(상세).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx` (검증 `validation.ts` · 상수 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 저장 요청은 성공만 돌려주고 픽스처를 바꾸지 않는다(`apps/admin/src/pages/content/notices/data-source.ts:180,194-211`). 그래서 성공 토스트가 뜨고 목록으로 이동해도 새 공지는 목록에 없다. 이 화면은 공통 폼 컨트롤러(`useCrudForm`)를 쓰지 않아 저장 충돌 다이얼로그·422 인라인 매핑·중복 제출 동기 잠금·오류 참조 코드도 없다 — 그 차이는 §4·§7 에 적었다.

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 제목영역 | 등록인지 수정인지 · 필수 표기와 예약 규칙 안내 | 항상 | 전체 | 불가 | 표시 |
| 오류영역 | 저장 실패를 카드 맨 위 danger 배너로 알린다 | 저장 실패 시 | 전체 | 불가 | 숨김 |
| 입력영역 | 제목 · 분류 · 상태 · 게시일 · 상단 고정 · 본문 | 항상 | 전체 | 불가 | 표시 |
| 버튼영역 | 취소 · 등록(또는 저장) | 항상 | 전체 | 불가 | 표시 |
| 조회 실패영역 | 수정 진입에서 상세 조회가 실패했을 때 폼 대신 뜬다 | 수정 + 조회 실패 | 전체 | 불가 | 숨김 |

**조회 실패영역은 폼 전체를 대신한다** — 배너와 '목록으로' 버튼만 남는다 — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:182-193`.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 화면 제목 | Heading(h1) | 등록 `공지 등록` · 수정 `공지 수정` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:198` | 무엇을 하는 화면인가 | Y | Y | — | 주소의 id 유무가 정한다 | — | — | 항상 | — |
| 2 | 안내문 | Text | `별표(*) 항목은 필수예요. 상태를 '예약'으로 두면 게시일 이후 자동으로 게시돼요.` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:200` | 필수 표기와 예약 규칙 | N | Y | — | — | — | — | 항상 | — |
| 3 | 카드 제목 | Heading(h2) | `공지 정보` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:206` | 입력 묶음의 이름 | N | Y | — | — | — | — | 항상 | — |
| 4 | 저장 실패 배너 | Alert(danger) | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:150` | 실패의 유일한 표면 | N | Y | — | 숨김 | — | — | 저장 실패 | 오류 참조 코드가 붙지 않는다(공통 폼 훅을 쓰지 않는다) |
| 5 | 제목 | TextField | `제목` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:211` | 목록·상세에 그대로 뜨는 제목 | Y | N | 저장 중 또는 상세 로딩 중 | 등록=빈 값 · 수정=기존 값 | `예: 서비스 이용 안내` — `:218` | 100자 — `apps/admin/src/pages/content/notices/types.ts:114`(입력에서도 잘린다 — `:217`) | 항상 | — |
| 6 | 분류 | SelectField | `분류` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:229` | 공지 · 이벤트 · 점검 — `apps/admin/src/pages/content/notices/types.ts:80-84` | Y | N | 〃 | `공지` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:86` | — | 세 값 중 하나 | 항상 | — |
| 7 | 상태 | SelectField | `상태` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:239` | 게시 · 임시저장 · 예약 — `apps/admin/src/pages/content/notices/types.ts:86-90` | Y | N | 〃 | `임시저장` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:87` | — | 세 값 중 하나 | 항상 | 이 값이 게시일 칸의 잠금과 필수 여부를 정한다 |
| 8 | 게시일 | 날짜 입력(date) | `게시일` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:251` | 예약 게시 날짜 | 상태가 `예약`일 때만 Y — `:252` | N | 저장 중 · 상세 로딩 중 · **상태가 `예약`이 아닐 때** — `:261` | 등록=빈 값 · 수정=기존 게시일의 날짜 부분 — `:132` | 브라우저 기본 | 달력 입력 | 항상 | 힌트가 상태에 따라 갈린다: 예약이면 `예약 게시할 날짜`, 아니면 `예약 상태에서만 사용돼요.` — `:254` |
| 9 | 상단 고정 | Checkbox | `목록 상단에 고정` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:284` | 목록 맨 위에 붙는다 | N | N | 저장 중 · 상세 로딩 중 | 해제 — `:88` | — | — | 항상 | — |
| 10 | 본문 | TextareaField | `본문` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:289` | 줄바꿈이 그대로 살아 상세에 그려진다 | Y | N | 저장 중 · 상세 로딩 중 | 등록=빈 값 · 수정=기존 본문 | `공지 본문을 입력하세요.` — `:298` | 5,000자 — `apps/admin/src/pages/content/notices/types.ts:115` | 항상 | 글자 수 카운터가 붙는다. **리치 텍스트가 아니다** — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:8` |
| 11 | 취소 | Button(secondary) | `취소` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:309` | 브라우저 뒤로 한 칸 — `:307` | N | N | 저장 중 | — | — | — | 항상 | 목록 경로가 아니라 **직전 화면**으로 간다(상세에서 왔으면 상세로) |
| 12 | 제출 | Button(primary) | 등록 `등록` · 수정 `저장` · 저장 중 `저장 중…` — `apps/admin/src/shared/crud/submitButtonLabel.ts` | 검증 후 요청 | Y | N | 저장 중 또는 상세 로딩 중 | — | — | — | 항상 | Enter 로도 제출된다 |
| 13 | 필드 오류 문구 | Text(error) | §6 의 문구 | 해당 입력 아래 인라인 | N | Y | — | 없음 | — | — | 검증 위반 | `aria-invalid` 와 오류 문구가 항상 함께 나간다 |
| 14 | 조회 실패 배너 | Alert(danger) + Button | `공지를 불러오지 못했어요. ` + `목록으로` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:186-188` | 수정 진입 실패 | N | Y | — | 숨김 | — | — | 수정 + 조회 실패 | **'다시 시도'가 없다** — 이 화면은 재시도 컨트롤을 주지 않는다 |

## 4. 기능 명세

### 4.1 수정 진입 — 기존 값 불러오기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 고칠 공지의 현재 값으로 폼을 채운다 |
| 실행 조건 | 주소에 id 가 있을 때 |
| 사용자 동작 | 상세의 '수정' 클릭 · 링크 열기 |
| 시스템 처리 | 상세를 조회해 도착하면 폼을 그 값으로 다시 세운다. 게시일은 ISO 시각의 **날짜 부분만** 잘라 넣는다 — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:132` |
| 데이터 처리 | 없음 — 읽기만 한다 |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 상세 1건. 목록·상세에서 막 왔다면 캐시가 먼저 답한다 |
| 성공 처리 | 여섯 칸이 기존 값으로 채워지고 입력이 풀린다 |
| 실패 처리 | 폼 대신 배너: `공지를 불러오지 못했어요. ` + '목록으로' — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:186`. **없는 id 와 그 밖의 실패를 가르지 않는다**(둘 다 같은 문장이다) |
| 예외 처리 | 조회가 끝나기 전에는 입력이 전부 잠긴다 — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:118` |
| 화면 변경 사항 | 입력영역 전체 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 저장(등록 · 수정)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 입력한 공지를 만들거나 고친다 |
| 실행 조건 | §6 의 검증을 전부 통과했을 때 |
| 사용자 동작 | '등록'/'저장' 클릭 또는 폼에서 Enter |
| 시스템 처리 | 이전 오류 배너를 지우고 요청 1건을 보낸다. 진행 중에는 입력과 버튼이 잠긴다 |
| 데이터 처리 | 등록은 새 공지 1건, 수정은 그 공지의 여섯 값이 바뀐다. **지금은 저장되지 않는다**(§1) |
| Validation | §6 전부 |
| API 호출 여부 | Y — 등록 또는 수정 1건 |
| 성공 처리 | 등록: 토스트 `MSG-CONTENT-NOTICES-FORM-01` `공지를 등록했어요.` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:171` 후 **목록**으로. 수정: 토스트 `MSG-CONTENT-NOTICES-FORM-02` `공지를 저장했어요.` — `:158` 후 **그 공지의 상세**로. 두 이동 모두 히스토리를 덮어쓴다 |
| 실패 처리 | 화면에 남고 카드 맨 위에 배너: `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:150`. 입력은 그대로 유지된다 |
| 예외 처리 | 요청이 중단되면(화면을 떠나 언마운트) 아무 표시도 하지 않는다 — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:122,149`. ⚠ **동기 중복 제출 잠금이 없다** — 버튼 비활성만으로 막으므로 검증이 끝나기 전의 빠른 두 번째 Enter 를 이 화면은 막지 못한다(공통 폼 훅을 쓰는 화면은 `apps/admin/src/shared/crud/useCrudForm.ts:122-130` 이 막는다) |
| 화면 변경 사항 | 오류영역 · 입력영역 · 버튼영역 → 화면 전체(성공 시) |
| 후속 동작 | 목록 또는 상세로 이동 · 해당 조회가 무효화되어 다시 불린다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.3 예약 상태와 게시일의 연동

| 항목 | 내용 |
|---|---|
| 기능 목적 | 게시일을 **예약일 때만** 쓰게 한다. 쓰지 않는 칸이 값을 들고 있지 않게 한다 |
| 실행 조건 | 상태 선택이 바뀔 때마다 |
| 사용자 동작 | 상태 select 변경 |
| 시스템 처리 | 상태가 `예약`이면 게시일 칸이 풀리고 필수 표시가 붙는다. 아니면 잠긴다 — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:252,261` |
| 데이터 처리 | 없음 — 화면 상태만 바뀐다. ⚠ 예약을 껐다 켜도 **입력해 둔 날짜를 지우지 않는다**(채용 공고 폼은 같은 자리에서 지운다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:254`) |
| Validation | 상태가 `예약`일 때만 게시일 규칙이 걸린다 — `apps/admin/src/pages/content/notices/validation.ts:32-53` |
| API 호출 여부 | N |
| 성공 처리 | 게시일 칸의 잠금·필수 표시·힌트가 함께 바뀐다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 예약이 아닌 상태로 저장하면 게시일 값이 있어도 검증이 걸리지 않는다 — 저장 payload 에는 그대로 실린다 |
| 화면 변경 사항 | 입력영역의 게시일 칸 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.4 저장하지 않은 채 떠나기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 입력이 남은 채 화면을 떠나면 되돌릴 기회를 준다 |
| 실행 조건 | 폼이 손대진 상태(dirty)이고 저장 중이 아닐 때 — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:137` |
| 사용자 동작 | 앱 안 링크 클릭 · 뒤로가기 · 탭 닫기·새로고침 |
| 시스템 처리 | `DLG-COMMON-LEAVE-FORM` 을 세운다([공통 문서](../../_common/index.md) §4.3). 브라우저 이탈은 브라우저 기본 확인창이다 |
| 데이터 처리 | 확인하면 입력이 버려진다 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 요청한 곳으로 이동한다. 토스트를 띄우지 않는다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 이 화면은 공통 기본 문구 대신 자기 문장을 준다: `공지에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:40-41` |
| 화면 변경 사항 | 다이얼로그만 |
| 후속 동작 | 이동 또는 머무름 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 등록 진입 | `/content/notices/new` | 빈 값으로 폼을 세운다 | 입력영역 | 빈 폼 |
| 수정 진입 | `/content/notices/:id/edit` | 상세 조회 → 도착하면 값 채우기 | 입력영역 | 잠긴 폼 → 채워진 폼 |
| 상세 조회 실패 | 오류 | 폼을 감추고 배너를 세운다 | 조회 실패영역 | 배너 |
| 상태 변경 | 상태 select | 게시일 칸의 잠금·필수·힌트를 바꾼다 | 게시일 | 잠김/풀림 |
| 고정 체크 | 체크박스 | 값 토글(폼이 dirty 가 된다) | 상단 고정 | 변화 없음 |
| 본문 입력 | 타이핑 | 값 갱신 + 글자 수 카운터 갱신. 이 필드는 입력 중 재검증하지 않는다 — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:293` | 본문 | 카운터 갱신 |
| 제출 | 버튼 클릭 또는 Enter | 배너를 지우고 검증 → 요청 | 폼 | 저장 중 상태 |
| 검증 실패 | 위반이 있을 때 | 요청을 만들지 않고 **첫 위반 필드로 포커스**(RHF 기본 동작) | 입력영역 | 인라인 오류 |
| 저장 중 | 요청이 나간 뒤 | 입력·버튼 잠금 · 제출 라벨 `저장 중…` | 입력영역 · 버튼영역 | 잠긴 폼 |
| 저장 성공 | 응답 도착 | 토스트 후 이동(등록=목록 · 수정=상세) | 화면 전체 | 목록 또는 상세 |
| 저장 실패 | 오류 | 카드 맨 위 배너 · 입력 유지 | 오류영역 | 폼 + 배너 |
| 취소 클릭 | 취소 버튼 | 브라우저 뒤로 한 칸 | — | 직전 화면 |
| dirty 이탈 | 링크·뒤로가기·탭 닫기 | `DLG-COMMON-LEAVE-FORM` | 다이얼로그 | 이동 또는 머무름 |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 제목 | 공백만이면 안 된다 | 제출 시 | `제목을 입력하세요.` — `apps/admin/src/pages/content/notices/validation.ts:15` | 제출 차단 · 그 필드로 포커스 · 인라인 오류 |
| 제목 | 100자 이하 | 제출 시 | `제목은 100자를 넘을 수 없어요.` — `apps/admin/src/pages/content/notices/validation.ts:16-18` | 〃 (입력 자체도 100자에서 막힌다) |
| 분류 | 세 값 중 하나 | 제출 시 | 없음(select 라 도달하지 않는다) | — |
| 상태 | 세 값 중 하나 | 제출 시 | 없음(같은 이유) | — |
| 게시일 | **상태가 `예약`일 때만** 필수이고 `YYYY-MM-DD` 형식이어야 한다 | 제출 시 | `예약하려면 게시일을 YYYY-MM-DD 형식으로 입력하세요.` — `apps/admin/src/pages/content/notices/validation.ts:40` | 제출 차단 · 게시일 칸에 인라인 오류 |
| 게시일 | 예약이면 오늘 이후여야 한다(오늘 포함) | 제출 시 | `예약 게시일은 오늘 이후여야 해요.` — `apps/admin/src/pages/content/notices/validation.ts:51` | 〃 |
| 상단 고정 | 검증하지 않는다(참/거짓) | — | — | — |
| 본문 | 공백만이면 안 된다 | 제출 시 | `본문을 입력하세요.` — `apps/admin/src/pages/content/notices/validation.ts:25` | 제출 차단 · 인라인 오류 |
| 본문 | 5,000자 이하 | 제출 시 | `본문은 5000자를 넘을 수 없어요.` — `apps/admin/src/pages/content/notices/validation.ts:26-28` | 〃 |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/content/notices/validation.ts`. 화면이 따로 규칙을 갖지 않는다. 체크 순서가 곧 우선순위라 '필수'가 '길이'보다 먼저 걸린다. **프런트 검증은 UX 이지 보증이 아니다** — 서버가 같은 값을 다시 검증해야 한다.

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `공지를 불러오지 못했어요. ` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:186`. ⚠ 없는 id 와 서버 오류를 **같은 문장**으로 말한다(공통 폼 껍데기를 쓰는 화면은 둘을 가른다 — `apps/admin/src/shared/crud/FormPageShell.tsx:146-149`) | 폼 대신 배너 | '목록으로'. 재시도 컨트롤이 없다 |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/notices/NoticeFormPage.tsx:150` | 화면에 남고 배너. 입력 유지 | 제출 재클릭 |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로다(한 화면이 둘을 겸한다) | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다. 삭제는 목록·상세가 갖는다 | — | — |
| API 오류 | 저장 실패와 같은 한 줄. 서버 응답 원문·상태 코드를 노출하지 않는다. **오류 참조 코드도 없다** — 이 화면은 공통 폼 훅을 쓰지 않는다 | 배너 | 제출 재클릭 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 — `apps/admin/src/shared/query/queryClient.ts:108` | 〃 |
| 권한 없음 | ⚠ **이 화면에는 권한 문구가 없다.** 폼 껍데기(`FormPageShell`)를 쓰지 않아 `접근 권한이 없어요` 화면도, 저장 시 권한 배너도 나오지 않는다. 읽기 권한이 없을 때만 라우트 가드가 막는다 | 실제 차단은 서버의 몫이다 — `apps/admin/src/shared/permissions/RequirePermission.tsx:8-11` | 관리자에게 권한 요청 |
| 세션 만료 | 이 화면에는 자기 문구가 없다 — 401 이면 앱이 로그인 화면으로 보낸다 | 세션 폐기 · 원래 경로 보존 | 재로그인 후 이 폼으로 복귀(입력은 사라진다) |
| 데이터 충돌 | ⚠ **충돌 처리가 없다.** 이 화면은 `DLG-COMMON-FORM-CONFLICT` 를 쓰지 않아 409/412 도 위의 일반 저장 실패 문장으로 뭉개진다 | 배너 하나 | 목록으로 돌아가 최신 상태를 확인한다 |
| 중복 데이터 | 해당 없음 — 제목 중복을 막는 규칙이 검증에도 데이터 소스에도 없다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 이 화면에 파일 입력이 없다 | — | — |

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩(등록) | 조회가 없다 — 빈 폼이 즉시 그려진다 | 취소 ○ · 등록 ○ | N | 안내문 |
| 최초 로딩(수정) | 폼은 그려지되 **입력이 전부 잠긴다** | 취소 ○ · 저장 × | Y | 안내문 |
| 데이터 있음 | 여섯 칸이 값으로 채워져 있다 | 취소 ○ · 제출 ○ | N | 안내문 |
| 데이터 없음 | 등록 진입 상태 — 제목·본문이 비어 있고 분류=공지, 상태=임시저장, 게시일 칸은 잠겨 있다 | 취소 ○ · 등록 ○ | N | 게시일 힌트 `예약 상태에서만 사용돼요.` |
| 조회 실패 | 폼이 사라지고 배너 하나 | 목록으로 ○ | N | `공지를 불러오지 못했어요. ` |
| 저장 중 | 입력 6칸과 제출이 잠기고 제출 라벨이 `저장 중…` | 취소 × · 제출 × | Y | 라벨이 곧 안내다 |
| 저장 실패 | 카드 맨 위 배너 · 입력 유지 | 취소 ○ · 제출 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 취소 ○ · 제출 ○ | N | §6 의 해당 문구 |
| 읽기 전용(권한) | ⚠ 이 상태가 화면에 나타나지 않는다 — 권한 판정이 없다(§9) | — | N | — |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | — | — | — |
| 운영자 | 역할의 `page:/content/notices` 권한을 따른다 | 〃 | 〃 | — | — | — | — | — |
| 뷰어 | ○ | × | × | — | — | — | — | — |
| 권한 없음 | × | × | × | — | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — 읽기 권한이 없으면 라우트 가드가 `접근 권한이 없어요` 화면을 세운다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. ⚠ **등록·수정 권한만 없는 경우에는 이 폼이 그대로 열리고 저장도 시도된다** — 이 화면은 `FormPageShell`·`useCrudForm` 을 쓰지 않아 그 두 층이 갖는 권한 문(`apps/admin/src/shared/crud/FormPageShell.tsx:127-132` · `apps/admin/src/shared/crud/useCrudForm.ts:290-298`)을 지나지 않는다. 같은 상태가 FAQ·팝업·배너·약관 버전·처리방침 버전 폼에도 있다. 뉴스 폼은 껍데기를 쓰므로 이 문제가 없다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-NOTICES` | '공지 등록' 클릭 | `SCR-CONTENT-NOTICES-FORM`(등록) | N | 없음 | 없음 | — |
| `SCR-CONTENT-NOTICES-DETAIL` | '수정' 클릭 | `SCR-CONTENT-NOTICES-FORM`(수정) | N | 데이터가 있을 때 | 공지 id(경로) | — |
| `SCR-CONTENT-NOTICES-FORM` | 등록 성공 | `SCR-CONTENT-NOTICES` | N | 요청 성공 | 없음 | 뒤로가기로 폼에 되돌아오지 않는다 |
| `SCR-CONTENT-NOTICES-FORM` | 수정 성공 | `SCR-CONTENT-NOTICES-DETAIL` | N | 요청 성공 | 공지 id | 〃 |
| `SCR-CONTENT-NOTICES-FORM` | '취소' 클릭 | 직전 화면 | N | 없음 | 없음 | — |
| `SCR-CONTENT-NOTICES-FORM` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-CONTENT-NOTICES-FORM` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-CONTENT-NOTICES-FORM` | 조회 실패 후 '목록으로' | `SCR-CONTENT-NOTICES` | N | 수정 진입 실패 | 없음 | — |
| `SCR-CONTENT-NOTICES-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면이 여는 팝업(모달)은 없다.** 화면 고유 확인 다이얼로그도 없다 — 이탈 가드는 공통 층의 것이다.

**이 화면의 결과 통지 토스트는 2건**(`MSG-CONTENT-NOTICES-FORM-01`·`02`)이고 §4.2 에 문구 그대로 적혀 있다. 인벤토리(성공 2 · 실패 0)와 일치한다.
