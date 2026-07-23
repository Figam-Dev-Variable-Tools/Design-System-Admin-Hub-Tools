# FAQ 카테고리 관리 (팝업)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | FAQ 카테고리 관리 |
| 화면 ID | `POP-CONTENT-FAQ-MANAGE-CATEGORIES` |
| 메뉴 경로 | 콘텐츠 관리 > FAQ > 카테고리 관리 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — FAQ 분류를 한자리에서 만들고 지운다. 각 분류가 **몇 건의 FAQ 에 쓰이는지**를 함께 보여 주고, 쓰이는 중이면 지우지 못하게 막는다.

**업무 배경** — 분류는 FAQ 등록 화면의 선택지이자 목록 필터의 축이다. 분류를 지우면 그 분류에 매달린 FAQ 가 갈 곳을 잃는다(고아 FAQ). 그래서 지우기 전에 "지금 몇 건이 쓰고 있는가"를 반드시 보여 줘야 한다.

**화면 설명** — 목록 위에 뜨는 모달이다. 위쪽은 카테고리 목록(이름 + 사용량 배지 + 휴지통), 가로선 아래는 새 카테고리 이름 한 칸이다. 푸터에 '닫기'와 '카테고리 만들기'가 있다. **등록·삭제 뒤에도 팝업은 닫히지 않는다** — 연속으로 관리하기 위해서다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:7`.

**주요 사용자** — 최상위 관리자 · 콘텐츠를 다루는 운영자.

**사용 시나리오**

1. 운영자가 '배송' 분류를 만든다 → 확인 다이얼로그를 거쳐 만들어지고, 입력 칸이 비워지며 다시 커서가 놓인다. 부모 화면에 성공 토스트가 뜬다.
2. 쓰지 않는 분류를 지우려는데 휴지통이 잠겨 있다 → 옆의 배지가 `3개 FAQ 사용 중` 이라고 말한다.
3. 이름을 반쯤 치다 딤을 잘못 눌렀다 → 저장하지 않은 변경 확인이 뜬다.

**선행 조건** — 로그인 · 콘텐츠 관리 플랜 모듈 · FAQ 목록 화면이 열려 있어야 한다(이 팝업의 유일한 진입 경로다).

**후행 처리** — 만든 분류는 FAQ 목록의 왼쪽 필터와 [FAQ 폼](form.md)의 분류 선택지에 함께 나타난다. 결과 통지는 **부모 화면이** 띄운다 — `apps/admin/src/pages/content/faq/FaqPage.tsx:438-439`.

**관련 화면** — [FAQ 목록](index.md)(부모) · [FAQ 등록·수정](form.md) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 해당 없음 — 메뉴 항목이 아니다.

**관련 기능** — FAQ 등록·수정의 카테고리 선택. 카테고리를 지우면 그 선택지가 사라진다.

**관련 API** — 사용량이 포함된 카테고리 목록 조회 1건 · 등록 1건 · 삭제 1건. **백엔드가 없다** — `apps/admin/src/pages/content/faq/data-source.ts:209`(사용량 포함 목록) · `:188`(등록) · `:223`(삭제).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx` (검증 `../validation.ts` · 상수 `../types.ts` · 데이터 `../data-source.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — 이 팝업의 등록·삭제는 FAQ 본문과 달리 **실제로 픽스처를 바꾼다**(`apps/admin/src/pages/content/faq/data-source.ts:196,231`). 그래서 만든 분류가 같은 세션 동안 필터와 폼 선택지에 실제로 나타난다.

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 딤 | 뒤 목록을 덮고, 클릭하면 닫기 요청이 된다 | 팝업이 열린 동안 | 전체 | 불가 | 표시 |
| Header | 제목 `FAQ 카테고리 관리` + 닫기(×) | 〃 | 전체 | 불가 | 표시 |
| 목록영역 | 카테고리 이름 · 사용량 배지 · 삭제 버튼 | 〃 | 전체 | 불가 | 표시 |
| 구분선 | 읽는 영역과 만드는 영역을 가른다 | 〃 | 전체 | 불가 | 표시 |
| 입력영역 | 새 카테고리 이름 한 칸 | 〃 | 전체 | 불가 | 표시 |
| 오류영역 | 검증 오류 또는 등록 실패를 입력 아래 한 줄로 | 오류가 있을 때 | 전체 | 불가 | 숨김 |
| 안내영역 | 삭제 규칙을 미리 말한다 | 〃 | 전체 | 불가 | 표시 |
| 버튼영역 | 닫기 · 카테고리 만들기 | 〃 | 전체 | 불가 | 표시 |

**확인 다이얼로그는 팝업 밖에 렌더된다** — 안에 두면 팝업의 포커스 트랩이 다이얼로그를 가둔다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:362`.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 팝업 제목 | Heading(h2) | `FAQ 카테고리 관리` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:240` | — | Y | Y | — | — | — | — | 항상 | 모달의 이름표다 |
| 2 | 닫기(×) | IconButton | `닫기` — `packages/ui/src/organisms/Modal/Modal.tsx:239` | 닫기 요청(입력이 있으면 확인이 뜬다) | N | N | 없음 | — | — | — | 항상 | — |
| 3 | 카테고리 이름 | Text | 데이터의 라벨 | 목록 한 줄의 왼쪽 | N | Y | — | — | — | — | 항목마다 | — |
| 4 | 사용량 배지 | 배지 | 사용 중이 아니면 `미사용`, 쓰이면 `{N}개 FAQ 사용 중` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:103` | 왜 지울 수 있는지·없는지를 숫자로 말한다 | N | Y | — | — | — | — | 항목마다 | 색이 아니라 **문장**이 이유를 말한다 |
| 5 | 카테고리 삭제 | IconButton(ghost/danger) | 지울 수 있으면 `{이름} 삭제`, 못 지우면 `{이름} — {N}개 FAQ 사용 중라 삭제할 수 없어요` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:276-280` | 확인 다이얼로그를 연다 | N | N | **사용 중일 때**(1건 이상) 또는 삭제 요청 중 — `:284` | — | — | — | 항목마다 | 잠긴 버튼에는 툴팁 `{N}개 FAQ 사용 중 — 삭제할 수 없어요` — `:282` |
| 6 | 목록 빈 상태 | Text(hint) | 조회 중 `불러오는 중…` · 조회 후 `등록된 카테고리가 없어요.` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:261` | 0건일 때 | N | Y | — | — | — | — | 카테고리가 0건 | — |
| 7 | 새 카테고리 이름 | TextField | `새 카테고리` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:302` | 만들 분류의 이름 | Y | N | 만드는 중 | 빈 값 — `:125` | `예: 결제` — `:309` | 30자 — `apps/admin/src/pages/content/faq/types.ts:91`(검증에서만 — 입력에서 자르지 않는다) | 항상 | 팝업이 열릴 때 이 칸에 포커스가 놓인다 — `:247` |
| 8 | 오류 문구 | Text(error, `role="alert"`) | §6 의 문구 또는 등록 실패 문구 | 검증 오류와 서버 실패가 **같은 자리**를 쓴다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:233` | N | Y | — | 없음 | — | — | 오류가 있을 때 | `aria-invalid` 는 언제나 이 문구와 함께 나간다 — `:311-312` |
| 9 | 삭제 규칙 안내 | Text(hint) | `카테고리를 만들면 FAQ 등록 화면의 분류 선택지에 추가돼요. 사용 중인 카테고리는 삭제할 수 없어요 — 먼저 그 FAQ 들의 카테고리를 바꾸거나 삭제하세요.` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:331-332` | 규칙을 미리 말한다 | N | Y | — | — | — | — | 항상 | — |
| 10 | 닫기 | Button(secondary) | `닫기` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:251` | 닫기 요청 | N | N | 없음 | — | — | — | 항상 | Esc·딤·× 와 **같은 요청**으로 모인다 — `:241,250` |
| 11 | 카테고리 만들기 | Button(primary, submit) | `카테고리 만들기` · 만드는 중 `만드는 중…` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:254` | 검증 후 확인 다이얼로그를 연다 | Y | N | 만드는 중 | — | — | — | 항상 | Enter 로도 제출된다 |

## 4. 기능 명세

### 4.1 카테고리 목록과 사용량 조회

| 항목 | 내용 |
|---|---|
| 기능 목적 | 지금 있는 분류와 각 분류를 쓰는 FAQ 건수를 읽는다 |
| 실행 조건 | 팝업이 열릴 때 |
| 사용자 동작 | 부모 화면의 `카테고리 관리` 클릭 |
| 시스템 처리 | 사용량이 포함된 카테고리 목록을 조회한다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:128` |
| 데이터 처리 | 아무것도 바꾸지 않는다 |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 사용량 포함 목록 1건 |
| 성공 처리 | 목록이 그려지고 각 줄에 사용량 배지가 붙는다 |
| 실패 처리 | ⚠ **조회 실패를 알리는 표면이 없다.** 실패하면 목록이 0건으로 그려지고 `등록된 카테고리가 없어요.` 가 뜬다 — '없다'와 '못 읽었다'가 같은 화면이 된다 |
| 예외 처리 | 조회 중에는 `불러오는 중…` 이 그 자리를 차지해 0건과 구분된다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:261` |
| 화면 변경 사항 | 목록영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 카테고리 만들기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 새 분류를 만든다 |
| 실행 조건 | 이름이 §6 을 통과했을 때 |
| 사용자 동작 | 이름 입력 → `카테고리 만들기` 또는 Enter → 확인 다이얼로그에서 `카테고리 만들기` 또는 `취소` |
| 시스템 처리 | 검증 → 통과하면 **바로 만들지 않고 확인 다이얼로그를 세운다** — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:162-165`. 확인해야 요청 1건이 나간다 |
| 데이터 처리 | 새 분류 1건이 추가된다. 이름은 앞뒤 공백을 다듬어 저장한다 — `apps/admin/src/pages/content/faq/data-source.ts:196` |
| Validation | §6 의 카테고리명 규칙 |
| API 호출 여부 | Y — 등록 1건 |
| 성공 처리 | 다이얼로그가 닫히고 **입력 칸이 비워지며 다시 그 칸으로 포커스가 간다**(연속 등록) — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:179-181`. **팝업은 닫히지 않는다.** 결과 통지는 부모 화면이 띄운다: `'{이름}' 카테고리를 만들었어요.` — `apps/admin/src/pages/content/faq/FaqPage.tsx:438` |
| 실패 처리 | 다이얼로그가 닫히고 **입력 아래 오류 문구**가 뜬다: `카테고리를 만들지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:186`. 입력한 이름은 그대로 남는다 |
| 예외 처리 | 검증에 실패하면 요청을 만들지 않고 이름 칸으로 포커스를 옮긴다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:245`. 팝업이 사라지는 중 도착한 응답은 무시된다(요청이 중단된다) — `:152-158,184` |
| 화면 변경 사항 | 확인 다이얼로그 · 입력영역 · 오류영역 · 목록영역 |
| 후속 동작 | 카테고리 목록 조회가 무효화되어 이 팝업의 목록·부모의 필터·폼 선택지가 함께 갱신된다 |
| 로그 기록 여부 | 확인하지 못했다 |

**확인 다이얼로그** — 제목 `카테고리 만들기` · 본문 `'{이름}' 카테고리를 만들어요.` · 확인 `카테고리 만들기` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:340-342`. 의도는 '만들기'라 파괴적 색을 쓰지 않는다.

### 4.3 카테고리 삭제

| 항목 | 내용 |
|---|---|
| 기능 목적 | 쓰지 않는 분류를 지운다 |
| 실행 조건 | **그 분류를 쓰는 FAQ 가 0건일 때만** — 1건이라도 있으면 버튼이 잠긴다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:284` |
| 사용자 동작 | 휴지통 클릭 → 확인 다이얼로그에서 `카테고리 삭제` 또는 `취소` |
| 시스템 처리 | 확인 시 삭제 요청 1건. 서버(지금은 픽스처)도 같은 규칙으로 한 번 더 막는다 — `apps/admin/src/pages/content/faq/data-source.ts:227-230` |
| 데이터 처리 | 그 분류가 사라진다. 되돌릴 수 없다 |
| Validation | 해당 없음 — 입력 칸이 없다 |
| API 호출 여부 | Y — 삭제 1건 |
| 성공 처리 | 다이얼로그가 닫히고 목록에서 그 줄이 사라진다. **팝업은 닫히지 않는다.** 부모 화면이 토스트를 띄운다: `'{이름}' 카테고리를 삭제했어요.` — `apps/admin/src/pages/content/faq/FaqPage.tsx:439` |
| 실패 처리 | **다이얼로그가 닫히지 않는다.** 본문 아래 배너: `카테고리를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:218` |
| 예외 처리 | 사용 중인 분류를 서버가 거절하면 그 사유(`사용 중인 카테고리는 삭제할 수 없어요.` — `apps/admin/src/pages/content/faq/data-source.ts:229`)가 아니라 위의 일반 문장이 뜬다 — 이 팝업은 사유를 갈라 보여 주지 않는다. 취소는 진행 중 요청을 중단하고 실패로 치지 않는다 — `:224-230` |
| 화면 변경 사항 | 확인 다이얼로그 · 목록영역 |
| 후속 동작 | 카테고리 목록 재조회 |
| 로그 기록 여부 | 확인하지 못했다 |

**확인 다이얼로그** — 제목 `카테고리 삭제` · 본문 `'{이름}' 카테고리를 삭제할까요? 되돌릴 수 없어요.` · 확인 `카테고리 삭제` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:352-354`.

### 4.4 닫기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 팝업을 떠난다 |
| 실행 조건 | 팝업이 열려 있을 때 |
| 사용자 동작 | Esc · 딤 클릭 · 닫기(×) · 푸터의 '닫기' — **네 경로가 같은 요청으로 모인다** — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:146,241,250` |
| 시스템 처리 | 이름 칸을 손대지 않았으면 즉시 닫는다. 손댔으면 확인을 세운다 |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 팝업이 닫히고 포커스가 `카테고리 관리` 버튼으로 돌아간다. 토스트를 띄우지 않는다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 만드는 중에는 가드가 걸리지 않는다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:146`. 이 가드는 목록·삭제가 주인공인 팝업이라 뒤늦게 붙은 것이며, 그 사유가 코드에 적혀 있다 — `:140-145` |
| 화면 변경 사항 | 팝업 → 닫힘 |
| 후속 동작 | 부모 목록으로 복귀 |
| 로그 기록 여부 | N |

**확인 다이얼로그** — `DLG-COMMON-LEAVE-MODAL`([공통 문서](../../_common/index.md) §4.4). 이 팝업은 문구를 바꾸지 않고 기본값을 쓴다.

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 팝업 열림 | `카테고리 관리` 클릭 | 사용량 포함 목록 조회 · **이름 칸에 포커스** · 배경 격리·스크롤 잠금 | 팝업 전체 | 팝업 표시 |
| 목록 도착 | 조회 성공 | 이름 + 사용량 배지 + 휴지통을 그린다. 사용 중인 줄은 휴지통이 잠긴다 | 목록영역 | 목록 |
| 이름 입력 | 타이핑 | 값 갱신(폼이 dirty 가 된다) | 새 카테고리 | 변화 없음 |
| 제출 | `카테고리 만들기` 클릭 또는 Enter | 이전 오류를 지우고 검증 → **확인 다이얼로그** | 버튼영역 | 확인 다이얼로그 |
| 검증 실패 | 빈 값·30자 초과 | 요청도 다이얼로그도 만들지 않고 이름 칸으로 포커스 | 입력영역 | 인라인 오류 |
| 만들기 확인 | 다이얼로그 확인 | 요청 1건 · 확인 버튼이 `처리 중…` | 확인 다이얼로그 | 성공=닫힘·칸 비움 · 실패=인라인 오류 |
| 만들기 취소 | 취소 · Esc · 딤 · × | 진행 중 요청 중단 후 닫힘 + `MSG-COMMON-06` | 확인 다이얼로그 | 팝업 |
| 삭제 클릭 | 휴지통 클릭(잠기지 않은 줄) | 삭제 확인 다이얼로그를 연다 | 목록영역 | 확인 다이얼로그 |
| 삭제 확인 | 다이얼로그 확인 | 요청 1건 | 확인 다이얼로그 | 성공=줄 사라짐 · 실패=배너 |
| 닫기 요청 | Esc · 딤 · × · '닫기' | 이름 칸이 dirty 면 확인, 아니면 즉시 닫힘 | 팝업 | 닫힘 또는 `DLG-COMMON-LEAVE-MODAL` |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 새 카테고리 이름 | 공백만이면 안 된다 | 제출 시 | `카테고리명을 입력하세요.` — `apps/admin/src/pages/content/faq/validation.ts:40` | 제출 차단 · 이름 칸으로 포커스 · 인라인 오류 |
| 새 카테고리 이름 | 30자 이하 | 제출 시 | `카테고리명은 30자를 넘을 수 없어요.` — `apps/admin/src/pages/content/faq/validation.ts:41-43` | 〃. **입력에서는 자르지 않는다** — 초과 사실을 문구로 알린다 |
| 새 카테고리 이름 | 이름 중복 | — | ⚠ **검사하지 않는다** — 같은 이름의 분류를 여러 개 만들 수 있다(검증에도 데이터 소스에도 규칙이 없다) | — |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/content/faq/validation.ts` 의 `faqCategorySchema`. 검증 오류와 서버 실패 문구는 **같은 자리**를 공유하며, 검증 오류가 우선한다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:233`.

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `등록된 카테고리가 없어요.` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:261` | 목록 자리에 한 줄. 만들기 영역은 그대로 쓸 수 있다 | 새 카테고리를 만든다 |
| 조회 결과를 모름 | 조회 중에는 `불러오는 중…` 이 뜬다. ⚠ 조회가 **실패**하면 그 사실을 알리지 않고 '없음'과 같은 화면이 된다(§4.1) | — | 팝업을 닫았다 다시 연다 |
| 저장 실패 | 등록 실패 `카테고리를 만들지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:186` | 확인 다이얼로그는 닫히고 입력 아래에 오류 한 줄. 입력값 유지 | 다시 제출 |
| 수정 실패 | 해당 없음 — 이 팝업에 수정 기능이 없다(이름을 고칠 수 없다) | — | — |
| 삭제 실패 | `카테고리를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:218` | 다이얼로그를 닫지 않고 배너 | 확인 재클릭 |
| API 오류 | 위 두 문구를 그대로 쓴다. 서버 응답 원문을 노출하지 않는다 | 인라인 오류 또는 다이얼로그 배너 | 재시도 |
| 서버 오류 | 위와 같다 — 5xx 에 별도 문구가 없다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | 이 팝업에는 자기 문구가 없다. ⚠ 부모 화면에도 쓰기 게이팅이 없어(`FaqPage.tsx`) **권한이 없어도 열리고 제출된다** | 실제 차단은 서버의 몫이다 — `apps/admin/src/shared/permissions/RequirePermission.tsx:8-11` | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 — 401 이면 앱이 로그인 화면으로 보낸다 | 세션 폐기 · 원래 경로 보존 | 재로그인 후 FAQ 목록으로 복귀(팝업은 닫혀 있다) |
| 데이터 충돌 | 다른 관리자가 먼저 지운 분류를 지우려 하면 위 삭제 실패 문구가 뜬다 | 사유를 갈라 보여 주지 않는다 | 팝업을 닫았다 다시 열어 목록을 확인 |
| 중복 데이터 | ⚠ 막지 않는다(§6) | — | — |
| 파일 업로드 실패 | 해당 없음 — 파일 입력이 없다 | — | — |

**사용 중인 분류는 두 겹으로 막는다** — 화면은 버튼을 잠그고(`apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:284`), 데이터 소스도 거절한다(`apps/admin/src/pages/content/faq/data-source.ts:227-230`). 화면만 막으면 게이팅이 아니라 장식이 된다.

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 목록 자리에 `불러오는 중…` · 입력영역은 이미 쓸 수 있다 | 닫기 ○ · 만들기 ○ | Y | `불러오는 중…` |
| 데이터 있음 | 카테고리 줄들 + 사용량 배지 | 닫기 ○ · 만들기 ○ · 휴지통은 미사용 줄만 ○ | N | 삭제 규칙 안내 |
| 데이터 없음(0건) | 목록 자리에 한 줄 | 닫기 ○ · 만들기 ○ | N | `등록된 카테고리가 없어요.` |
| 조회 실패 | ⚠ 0건과 구분되지 않는다 | 〃 | N | `등록된 카테고리가 없어요.` |
| 저장 중(만들기) | 이름 칸과 만들기 버튼이 잠기고 라벨이 `만드는 중…` | 닫기 ○ · 만들기 × | Y | 라벨이 곧 안내다 |
| 저장 실패 | 입력 아래 오류 한 줄 · 입력값 유지 | 닫기 ○ · 만들기 ○ | N | `카테고리를 만들지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 입력 아래 오류 한 줄 · 이름 칸으로 포커스 | 닫기 ○ · 만들기 ○ | N | §6 의 해당 문구 |
| 삭제 중 | 그 줄과 다른 줄의 휴지통이 함께 잠긴다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:284` | 확인 × · 취소 ○ | Y | 확인 라벨 `처리 중…` |
| 삭제 실패 | 다이얼로그가 열린 채 배너 | 확인 ○ · 취소 ○ | N | §7 의 삭제 실패 문구 |
| 사용 중인 줄 | 휴지통이 잠기고 배지가 `{N}개 FAQ 사용 중` | 그 줄의 휴지통 × | N | 툴팁 `{N}개 FAQ 사용 중 — 삭제할 수 없어요` |
| 읽기 전용(권한) | ⚠ 성립하지 않는다 — 권한 판정이 없다(§9) | — | N | — |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | — | ○ | — | — | — | — |
| 운영자 | 역할의 `page:/content/faq` 권한을 따른다 | 〃 | — | 〃 | — | — | — | — |
| 뷰어 | ○ | × | — | × | — | — | — | — |
| 권한 없음 | × | × | — | × | — | — | — | — |

이 팝업은 자기 리소스 키를 갖지 않는다 — 부모 화면의 잎(`/content/faq`)이 덮는다. 수정(이름 변경)은 이 팝업에 없다.

**권한이 없을 때 화면이 어떻게 되는가** — 읽기 권한이 없으면 부모 화면이 `접근 권한이 없어요` 로 바뀌어 팝업을 열 수 없다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. ⚠ **쓰기 권한만 없는 경우에는 `카테고리 관리` 버튼도, 이 팝업의 만들기·삭제도 그대로 동작한다** — 부모와 팝업 어느 쪽에도 권한 판정 호출이 없다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-CONTENT-FAQ` | `카테고리 관리` 클릭 | `POP-CONTENT-FAQ-MANAGE-CATEGORIES` | Y | 없음 | 없음 | 같은 목록 |
| `POP-CONTENT-FAQ-MANAGE-CATEGORIES` | 제출(검증 통과) | 카테고리 만들기 확인 다이얼로그 | Y | 이름이 유효 | 다듬은 이름 | 이 팝업 |
| `POP-CONTENT-FAQ-MANAGE-CATEGORIES` | 휴지통 클릭 | 카테고리 삭제 확인 다이얼로그 | Y | 그 분류가 미사용 | 대상 분류 | 이 팝업 |
| `POP-CONTENT-FAQ-MANAGE-CATEGORIES` | Esc · 딤 · × · '닫기' (입력 있음) | `DLG-COMMON-LEAVE-MODAL` | Y | 이름 칸이 dirty 이고 만드는 중이 아님 | 없음 | 확인=부모 목록 · 취소=이 팝업 |
| `POP-CONTENT-FAQ-MANAGE-CATEGORIES` | Esc · 딤 · × · '닫기' (입력 없음) | `SCR-CONTENT-FAQ` | — | 이름 칸이 비어 있음 | 없음 | — |

**만들기·삭제에 성공해도 이 팝업은 닫히지 않는다** — 연속 관리를 위한 결정이며 그 사유가 코드에 적혀 있다 — `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:7`.

**이 팝업의 결과 통지 토스트는 이 문서가 세지 않는다** — 성공 통지 2건은 **부모 화면(`apps/admin/src/pages/content/faq/FaqPage.tsx:438-439`)이** 띄우고, 인벤토리도 그 두 건을 FAQ 목록 화면의 몫으로 세고 있다. 확인 다이얼로그 2건은 인벤토리의 `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx:338,350` 과 일치한다.
