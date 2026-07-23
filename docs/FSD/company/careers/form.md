# 채용 공고 등록 · 수정

> 이 화면은 [연혁 등록·수정](../history/form.md)(`SCR-COMPANY-HISTORY-FORM`)과 **같은 골격**이다 —
> 공용 폼 껍데기 + 컨트롤러(권한 문 · 404/오류 구분 · 422 인라인 매핑 · 저장 충돌 다이얼로그 ·
> 오류 참조 코드 · 동기 중복 제출 잠금 · 미저장 이탈 가드).
> 아래 각 절은 **다른 것만** 적는다. 이 폼은 기업 관리에서 **가장 규칙이 많은 폼**이다 —
> 상시 채용 토글이 마감일 칸의 존재를 정하고, 지원 방법이 한 칸의 뜻을 바꾸며,
> **공개하려면 지원 경로가 실제로 열려 있어야 한다**(§4.3·4.4·4.5).

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 채용 공고 등록 · 수정 |
| 화면 ID | `SCR-COMPANY-CAREERS-FORM` |
| 메뉴 경로 | 기업 관리 > 채용 공고 > 채용 공고 등록 (또는 행 클릭·연필) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 공고 한 건의 제목·직무·고용형태·근무지·마감일(또는 상시)·지원 방법·내용·공개 여부를 정한다.

**업무 배경** — 공고는 **밖으로 나가는 문서**다. 그래서 두 가지가 저장 조건이 된다 — ① 마감일이 정해져 있거나 상시임이 분명해야 하고(빈 값은 '지난 날짜'로 읽혀 방금 만든 공고가 즉시 마감된다), ② **공개하려면 지원 경로가 실제로 열려 있어야 한다**(열리지 않는 '지원하기'는 기능이 아니라 거짓 약속이다).

**화면 설명** — 위쪽에 '목록으로', 제목과 안내문, 카드 하나에 (공개 경고 배너) · 제목 · (직무 · 고용형태 · 근무지) 한 줄 · 상시 채용 토글 · (상시가 아니면) 마감일 · (지원 방법 · 지원 대상) 한 줄 · (지원 방법 안내 배너) · 공고 내용 · 공개 토글이 놓인다.

**주요 사용자** — 최상위 관리자 · 채용을 담당하는 운영자.

**사용 시나리오**

1. 새 공고를 쓰고 마감일을 3주 뒤로 정한 뒤 접수 이메일을 넣고 공개로 저장한다.
2. 상시 채용 공고를 만든다 → 토글을 켜면 마감일 칸이 사라진다.
3. 공개를 켠 채 지원 대상을 비워 둔다 → 카드 맨 위에 경고가 뜨고, 저장하면 그 칸에 오류가 꽂힌다.

**선행 조건** — 로그인 · **플랜 모듈 `cms.pages`** · 등록이면 등록 권한, 수정이면 수정 권한(없으면 화면이 열리지 않는다 — §9).

**후행 처리** — 등록·수정 모두 성공하면 목록으로 간다(상세가 없다). 히스토리를 덮어쓴다 — `apps/admin/src/shared/crud/useCrudForm.ts:250`.

**관련 화면** — [채용 공고](index.md)(`SCR-COMPANY-CAREERS`) · [연혁 등록·수정](../history/form.md)(같은 골격) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자리가 없다. 권한 리소스는 잎 `/company/careers` 가 덮는다.

**관련 기능** — 여기서 정한 마감일·공개 여부가 목록의 상태 배지를 만든다([목록 문서](index.md) §4.3).

**관련 API** — 등록 1건 · 수정 1건 · (수정 진입 시) 상세 조회 1건. **백엔드가 없다** — `apps/admin/src/pages/company/careers/data-source.ts:80`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/careers/CareersFormPage.tsx` (껍데기 `apps/admin/src/shared/crud/FormPageShell.tsx` · 컨트롤러 `apps/admin/src/shared/crud/useCrudForm.ts` · 검증 `apps/admin/src/pages/company/careers/validation.ts` · 순수 규칙 `apps/admin/src/pages/company/careers/types.ts` · 저장 가드 `apps/admin/src/pages/company/careers/data-source.ts`)

---

**⚠ 지원 방법은 둘뿐이다** — `이메일 접수` 와 `외부 링크`. 예전에는 `지원 폼` 이 셋째로 있었고 **폼 관리 화면이 만든 폼을 참조**했다. 그 화면이 IA 에서 빠지면서 폼을 만들 곳이 사라졌으므로 선택지도 함께 걷었다 — 고를 수는 있는데 절대 공개할 수 없는 선택지는 기능이 아니라 함정이다 — `apps/admin/src/pages/company/careers/types.ts:57-64`. 그 사실이 §4.4 와 §7 에 그대로 적힌다.

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 권한 없음 화면 | 저장할 수 없는 폼은 열지 않는다 | **등록/수정 권한이 없을 때** — `apps/admin/src/shared/crud/FormPageShell.tsx:132` | — | 불가 | 숨김 |
| 상단 이동영역 | '목록으로' | 권한이 있고 조회에 실패하지 않았을 때 | 전체 | 불가 | 표시 |
| 제목영역 | `{엔티티} 등록` / `{엔티티} 수정` + 안내문 | 〃 | 전체 | 불가 | 표시 |
| 오류영역 | 저장 실패 배너(+ 오류 참조 코드) | 저장 실패 | 전체 | 불가 | 숨김 |
| 공개 경고영역 | 공개하려는데 지원 경로가 열리지 않았을 때 **저장 전에** 말한다 | 공개 게이트가 막을 때 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:163` | 전체 | 불가 | 숨김 |
| 입력영역 | 여덟 축(§3) | 〃 | 전체 | 불가 | 표시 |
| 지원 방법 안내영역 | 지원 대상이 아직 성립하지 않을 때 무엇을 넣어야 하는지 | 지원 방법 가드가 막을 때 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:322` | 전체 | 불가 | 숨김 |
| 버튼영역 | 취소 · 등록(또는 저장) | 〃 | 전체 | 불가 | 표시 |
| 조회 실패영역 | 수정 진입에서 상세 조회가 실패했을 때 폼 대신 | 수정 + 조회 실패 | 전체 | 불가 | 숨김 |

**마감일 칸은 있을 때와 없을 때가 있다** — 상시 채용 토글이 켜지면 **칸 자체가 사라진다**(비활성이 아니다) — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:259`.

## 3. UI 컴포넌트 정의

연혁 폼과 같은 것('목록으로' · 화면 제목 구조 · 저장 실패 배너와 참조 코드 · 취소/제출 · 조회 실패 배너 · 권한 없음 화면 · 스켈레톤)은 다시 적지 않는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 화면 제목 | Heading(h1) | 등록 `{엔티티} 등록` · 수정 `{엔티티} 수정` — `apps/admin/src/shared/crud/FormPageShell.tsx:178`(엔티티=`채용 공고` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:43`) | — | Y | Y | — | 주소의 id 유무 | — | — | 항상 | — |
| 2 | 안내문 | Text | `별표(*) 항목은 필수예요. 비공개로 저장하면 홈페이지에 나가지 않아요.` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:142` | — | N | Y | — | — | — | — | 항상 | — |
| 3 | 카드 제목 | Heading(h2) | `채용 공고` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:141` | — | N | Y | — | — | — | — | 항상 | — |
| 4 | 공개 경고 배너 | Alert(warning) | §4.5 의 사유 문장 | 공개 게이트가 막는 이유를 **저장 전에** 말한다 | N | Y | — | 숨김 | — | — | 공개 게이트가 막을 때 | 안내이지 방어선이 아니다 — 스키마와 저장소가 같은 판정으로 저장 자체를 거절한다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:156-162` |
| 5 | 공고 제목 | TextField | `공고 제목` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:165` | 목록에 그대로 뜬다 | Y | N | 저장 중 또는 상세 로딩 중 | 등록=빈 값 — `apps/admin/src/pages/company/careers/validation.ts:115` | `예: 프로덕트 디자이너 (신규 서비스)` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:172` | 100자 — `apps/admin/src/pages/company/careers/types.ts:250`(입력에서도 잘린다) | 항상 | — |
| 6 | 직무 | SelectField | `직무` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:181` | 첫 항목 `직무 선택` + 여섯 직무 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:188` · `apps/admin/src/pages/company/careers/types.ts:26-33` | Y | N | 〃 | **고르지 않음** — `apps/admin/src/pages/company/careers/validation.ts:116` | — | 여섯 값 중 하나 | 항상 | — |
| 7 | 고용형태 | SelectField | `고용형태` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:199` | 정규직·계약직·인턴·시간제 — `apps/admin/src/pages/company/careers/types.ts:38-43` | Y | N | 〃 | `정규직`(`full-time`) — `apps/admin/src/pages/company/careers/validation.ts:117` | — | 네 값 중 하나 | 항상 | 빈 선택지가 없다(기본값이 이미 있다) |
| 8 | 근무지 | TextField | `근무지` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:219` | 사람이 읽는 문자열 | Y | N | 〃 | 등록=빈 값 | `예: 서울 성동구 (재택 병행)` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:229` | 60자 — `apps/admin/src/pages/company/careers/types.ts:251` | 항상 | 목록의 검색 대상이다 |
| 9 | 상시 채용 토글 | ToggleSwitch | 보조기술 이름 `상시 채용` · 켜짐 `상시` · 꺼짐 `마감일 지정` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:247-249` | **마감일 칸의 존재를 정한다** | N | N | 〃 | 꺼짐 — `apps/admin/src/pages/company/careers/validation.ts:120` | — | — | 항상 | 옆에 안내 `상시 채용 — 마감일 없이 계속 지원을 받아요. 목록에서 닫히지 않아요.` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:243` |
| 10 | 마감일 | 날짜 입력(date) | `마감일` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:260` | 이 날까지 지원을 받는다 | 상시가 아니면 사실상 필수(§6) | N | 〃 | 등록=빈 값 · 수정=기존 값(상시면 빈 값) | 브라우저 기본 | 달력 입력 | **상시 채용이 꺼져 있을 때만 그려진다** | 필수 마커가 붙지 않는다 — 상시일 때는 필요 없기 때문이다 |
| 11 | 지원 방법 | SelectField | `지원 방법` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:279` | **`이메일 접수` · `외부 링크` 둘뿐** — `apps/admin/src/pages/company/careers/types.ts:65-68` | Y | N | 〃 | `이메일 접수`(`email`) — `apps/admin/src/pages/company/careers/validation.ts:121` | — | 두 값 중 하나 | 항상 | 이 값이 다음 칸의 **라벨·입력 종류·자리표시자**를 바꾼다 |
| 12 | 지원 대상 | TextField(type 은 지원 방법이 정한다) | 외부 링크면 `지원 페이지 주소` · 이메일이면 `지원서 접수 이메일` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:299` | 한 칸이 두 뜻을 겸한다 | Y | N | 〃 | 등록=빈 값 | 외부 링크면 `https://recruit.example.com/…` · 이메일이면 `recruit@example.com` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:310` | 300자 — `apps/admin/src/pages/company/careers/types.ts:253` | 항상 | **칸을 둘로 나누지 않는다** — 안 쓰는 칸이 값을 들고 있으면 저장 뒤 어느 것이 진짜인지 알 수 없다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:7-9` |
| 13 | 지원 방법 안내 배너 | Alert(info) | §4.4 의 사유 문장 | 지원 대상이 아직 성립하지 않을 때 무엇을 넣어야 하는지 | N | Y | — | 숨김 | — | — | 지원 방법 가드가 막을 때 | 경고가 아니라 안내 톤이다 — 비공개 저장은 막지 않기 때문이다 |
| 14 | 공고 내용 | TextareaField | `공고 내용` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:325` | 10행 높이 | Y | N | 〃 | 등록=빈 값 | `담당 업무, 자격 요건, 우대 사항을 적어요.` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:333` | 2,000자 — `apps/admin/src/pages/company/careers/types.ts:252` | 항상 | 글자 수 카운터. 리치 텍스트가 아니다 |
| 15 | 공개 토글 | ToggleSwitch | 보조기술 이름 `공고 공개` · 켜짐 `공개` · 꺼짐 `비공개` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:344-346` | 끄면 홈페이지에 나가지 않는다 | N | N | 〃 | **꺼짐** — `apps/admin/src/pages/company/careers/validation.ts:124` | — | — | 항상 | 옆에 안내 `공개 — 끄면 홈페이지에 나가지 않아요. 작성 중인 공고를 잃지 않고 저장할 수 있어요.` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:340` |
| 16 | 조회 실패 배너 | Alert(danger) + Button 최대 둘 | 없음 `{엔티티}{조사} 찾을 수 없어요. 이미 삭제되었을 수 있어요.` · 오류 `{엔티티}{조사} 불러오지 못했어요.` — `apps/admin/src/shared/crud/FormPageShell.tsx:146-149` | 404 와 오류를 가른다 | N | Y | — | 숨김 | — | — | 수정 + 조회 실패 | 404 에는 '다시 시도'를 주지 않는다 — `apps/admin/src/shared/crud/FormPageShell.tsx:136-139` |

## 4. 기능 명세

### 4.1 수정 진입 · 4.2 저장 · 4.6 저장 충돌 · 4.7 저장하지 않은 채 떠나기

연혁 폼의 §4.1·4.2·4.3·4.4 와 **동작이 같다**. 다른 것만 적는다.

| 항목 | 채용 공고의 값 |
|---|---|
| 폼을 채우는 값 | 여덟 축. **마감일이 `null` 이면 상시 채용 토글을 켜고 날짜 칸을 빈 값으로** 되돌린다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:102-103` |
| 저장 payload | **상시 채용이면 마감일을 `null` 로 저장한다** — 빈 문자열은 '아직 안 정함'과 구분되지 않는다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:89-91`. 제목·근무지·지원 대상·내용은 앞뒤 공백을 다듬는다 — 같은 파일 `:85-94` |
| 등록·수정 성공 | `MSG-COMMON-01` — `{엔티티}{조사} 등록했어요.` / `{엔티티}{조사} 저장했어요.` — `apps/admin/src/shared/crud/useCrudForm.ts:249`(동사는 `apps/admin/src/shared/crud/useCrudForm.ts:256,263`) |
| 이탈 가드 문구 | `채용 공고에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:45-46` |
| 저장의 마지막 문 | 스키마가 통과시킨 것도 **저장소가 한 번 더 거절한다** — 폼이 저장의 유일한 입구가 아니기 때문이다. 사유는 필드 이름과 함께 422 로 돌아와 그 칸의 인라인 오류가 된다 — `apps/admin/src/pages/company/careers/data-source.ts:93-116` |

### 4.3 상시 채용 토글 — 마감일 칸의 존재를 정한다

| 항목 | 내용 |
|---|---|
| 기능 목적 | '마감일을 비워 두면 상시'가 아니라 **상시인지 먼저 고르게** 한다 |
| 실행 조건 | 저장 중·상세 로딩 중이 아닐 때 |
| 사용자 동작 | 토글 클릭 |
| 시스템 처리 | 켜면 마감일 칸이 **사라지고 남아 있던 날짜를 지운다** — 안 쓰는 칸이 값을 들고 있지 않게 한다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:251-255` |
| 데이터 처리 | 저장 시 상시면 마감일이 `null` 로 나간다(§4.2) |
| Validation | 상시가 아닌데 마감일이 비어 있으면 저장이 막힌다(§6) |
| API 호출 여부 | N |
| 성공 처리 | 마감일 칸이 나타나거나 사라진다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | **빈 칸을 남겨 두지 않는 이유** — 마감일을 아직 안 정한 공고와 상시 채용 공고가 같은 모양이 되면 구별할 수 없다 — `apps/admin/src/pages/company/careers/types.ts:10-15`. 그래서 빈 값을 `null` 로 조용히 접지 않고 **검증에서 막는 쪽**을 골랐다 — `apps/admin/src/pages/company/careers/validation.ts:20-24` |
| 화면 변경 사항 | 입력영역(마감일 칸의 유무) |
| 후속 동작 | 목록의 상태 배지가 `상시 채용` 으로 바뀐다 |
| 로그 기록 여부 | N |

### 4.4 지원 방법 — 한 칸의 뜻이 바뀐다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 지원자가 실제로 지원할 수 있는 경로를 하나 정한다 |
| 실행 조건 | 저장 중·상세 로딩 중이 아닐 때 |
| 사용자 동작 | 지원 방법 select 변경 → 지원 대상 입력 |
| 시스템 처리 | 고른 방법에 따라 지원 대상 칸의 **라벨·입력 종류·자리표시자**가 함께 바뀐다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:299,305,310` |
| 데이터 처리 | 두 방법 모두 **공고가 값을 통째로 갖는다**(이메일 주소 또는 외부 주소). 다른 화면의 상태를 묻지 않는다 — `apps/admin/src/pages/company/careers/types.ts:153-158` |
| Validation | §6 의 지원 대상 세 줄 |
| API 호출 여부 | N — 판정은 순수 규칙이 한다 |
| 성공 처리 | 안내 배너가 사라진다 |
| 실패 처리 | 값이 아직 성립하지 않으면 info 배너로 무엇을 넣어야 하는지 말한다: `지원서를 받을 이메일 주소를 입력하세요.` — `apps/admin/src/pages/company/careers/types.ts:166` · `이메일 주소 형식이 올바르지 않아요.` — 같은 파일 `:167` · `지원 페이지 주소를 입력하세요.` — 같은 파일 `:171` · `지원 페이지 주소는 https:// 로 시작해야 해요. 지원자가 개인정보를 입력하는 화면이에요.` — 같은 파일 `:174` |
| 예외 처리 | ⚠ **옛 공고가 `지원 폼` 같은 지금 없는 값을 들고 있으면** 가드가 `지원 방법을 고르세요.` 를 돌려주고 — `apps/admin/src/pages/company/careers/types.ts:177` — 공개 게이트가 막아 **공개 저장이 되지 않는다**(fail-closed). 비공개 저장은 언제나 허용되므로 그 공고를 잃지는 않는다 |
| 화면 변경 사항 | 지원 대상 칸 · 지원 방법 안내영역 · (공개가 켜져 있으면) 공개 경고영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**외부 링크에 `https` 를 강제하는 것은 취향이 아니다** — 지원자가 **개인정보를 입력하는 화면**이기 때문이다 — `apps/admin/src/pages/company/careers/types.ts:160-161`.

### 4.5 공개 게이트

| 항목 | 내용 |
|---|---|
| 기능 목적 | 열리지 않는 '지원하기'가 홈페이지에 걸리지 않게 한다 |
| 실행 조건 | 공개 토글이 켜져 있을 때만. **비공개 저장은 언제나 허용된다** — 초안을 저장하지 못하게 만들면 작성 중인 내용이 사라진다 — `apps/admin/src/pages/company/careers/types.ts:180-185` |
| 사용자 동작 | 공개 토글을 켜고 제출 |
| 시스템 처리 | 같은 술어를 **셋이 함께 읽는다** — 화면의 경고 배너(`apps/admin/src/pages/company/careers/CareersFormPage.tsx:126-136`) · 스키마(`apps/admin/src/pages/company/careers/validation.ts:88-108`) · 저장소(`apps/admin/src/pages/company/careers/data-source.ts:110-115`). 셋이 갈라지지 않게 판정은 한 함수가 갖는다 — `apps/admin/src/pages/company/careers/types.ts:187-190` |
| 데이터 처리 | 막히면 아무것도 저장되지 않는다 |
| Validation | 사유가 있으면 **지원 대상 칸에** 이슈를 붙인다 — 문제가 실제로 있는 칸이고, 검증 실패 시 첫 위반 필드로 옮겨지는 포커스가 그리로 온다 — `apps/admin/src/pages/company/careers/validation.ts:100-107` |
| API 호출 여부 | N(화면) · 저장소도 같은 판정으로 422 를 돌려준다 |
| 성공 처리 | 경고 배너가 사라지고 저장이 진행된다 |
| 실패 처리 | 저장 전에는 카드 맨 위 warning 배너, 제출하면 지원 대상 칸의 인라인 오류 + 포커스 이동 |
| 예외 처리 | **예전에는 소비처가 배너뿐이라 경고를 띄운 채 저장이 성공했다** — 경고를 무시한 성공은 아무 일도 하지 않는 것보다 나쁘다. 그래서 지금은 스키마와 저장소가 함께 막는다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:159-162` |
| 화면 변경 사항 | 공개 경고영역 · 지원 대상 칸 |
| 후속 동작 | 공개된 공고가 목록에서 `모집 중` 또는 `상시 채용` 으로 보인다 |
| 로그 기록 여부 | 확인하지 못했다 |

## 5. 이벤트 정의

연혁 폼의 이벤트 표에 아래가 더해진다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 상시 채용 토글 | 토글 클릭 | 마감일 칸을 세우거나 없애고, 켤 때는 남아 있던 날짜를 지운다 | 상시 채용 · 마감일 | 칸의 유무가 바뀐다 |
| 지원 방법 변경 | select 변경 | 지원 대상 칸의 라벨·입력 종류·자리표시자를 바꾼다 | 지원 방법 · 지원 대상 | 라벨 전환 |
| 지원 대상 입력 | 타이핑 | 가드를 다시 판정해 안내 배너를 세우거나 걷는다 | 지원 방법 안내영역 | 배너 전환 |
| 공개 토글 | 토글 클릭 | 공개 게이트를 다시 판정해 경고 배너를 세우거나 걷는다 | 공개 경고영역 | 배너 전환 |
| 공개 게이트 위반으로 제출 | 공개가 켜졌는데 지원 경로가 성립하지 않음 | 요청을 만들지 않고 **지원 대상 칸**에 오류를 꽂고 포커스를 옮긴다 | 지원 대상 | 인라인 오류 |
| 마감일 빈 값으로 제출 | 상시가 아닌데 날짜가 비어 있음 | 마감일 칸에 오류를 꽂는다 | 마감일 | 인라인 오류 |

나머지(등록·수정 진입 · 권한 없음 · 조회 실패 · 다시 시도 · 내용 입력 · 제출 · 검증 실패 · 422 · 409/412 · 저장 실패 · 저장 성공 · 취소 · dirty 이탈)는 연혁 폼과 같다.

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 공고 제목 | 공백만이면 안 된다 · 100자 이하 | 제출 시 | `{라벨}{조사} 입력하세요.` · `{라벨}{조사} {최대}자를 넘을 수 없어요.` — `apps/admin/src/shared/crud/validation.ts:22,25`(라벨=`공고 제목`, 최대=100) | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 직무 | 고르지 않으면 안 된다 | 제출 시 | `직무를 선택하세요.` — `apps/admin/src/pages/company/careers/validation.ts:46` | 〃 |
| 고용형태 | 고르지 않으면 안 된다 | 제출 시 | `고용형태를 선택하세요.` — `apps/admin/src/pages/company/careers/validation.ts:49` | 〃 (기본값이 있어 도달하지 않는다) |
| 근무지 | 공백만이면 안 된다 · 60자 이하 | 제출 시 | `{라벨}{조사} 입력하세요.` · `{라벨}{조사} {최대}자를 넘을 수 없어요.` — `apps/admin/src/shared/crud/validation.ts:22,25`(라벨=`근무지`, 최대=60) | 〃 |
| 마감일 | 비어 있거나 `YYYY-MM-DD` 형태 | 제출 시 | `마감일 형식이 올바르지 않아요.` — `apps/admin/src/pages/company/careers/validation.ts:54` | 〃 |
| 마감일 | **상시 채용이 꺼져 있으면 비어 있을 수 없다** | 제출 시 | `마감일을 정하거나 ‘상시 채용’ 을 켜세요. 비워 두면 오늘 이전 날짜로 읽혀 공고가 곧바로 마감돼요.` — `apps/admin/src/pages/company/careers/validation.ts:38-39` | 제출 차단 · 마감일 칸에 인라인 오류 |
| 지원 방법 | 고르지 않으면 안 된다 | 제출 시 | `지원 방법을 선택하세요.` — `apps/admin/src/pages/company/careers/validation.ts:60` | 〃 |
| 지원 대상 | 300자 이하 | 제출 시 | `지원 방법 값이 너무 길어요.` — `apps/admin/src/pages/company/careers/validation.ts:63` | 〃 |
| 지원 대상 | **공개할 때만** — 이메일이면 비어 있지 않고 형식이 맞아야 한다 | 제출 시 | `지원서를 받을 이메일 주소를 입력하세요.` · `이메일 주소 형식이 올바르지 않아요.` — `apps/admin/src/pages/company/careers/types.ts:166-167` | 제출 차단 · **지원 대상 칸**에 인라인 오류 + 포커스 |
| 지원 대상 | **공개할 때만** — 외부 링크면 비어 있지 않고 `https://` 로 시작해야 한다 | 제출 시 | `지원 페이지 주소를 입력하세요.` · `지원 페이지 주소는 https:// 로 시작해야 해요. 지원자가 개인정보를 입력하는 화면이에요.` — `apps/admin/src/pages/company/careers/types.ts:171,174` | 〃 |
| 지원 대상 | **공개할 때만** — 지원 방법이 아는 값이어야 한다 | 제출 시 | `지원 방법을 고르세요.` — `apps/admin/src/pages/company/careers/types.ts:177` | 〃 (옛 공고의 사라진 선택지가 여기 걸린다) |
| 공고 내용 | 공백만이면 안 된다 · 2,000자 이하 | 제출 시 | `공고 내용을 입력하세요.` · `공고 내용이 너무 길어요.` — `apps/admin/src/pages/company/careers/validation.ts:67,69` | 〃 |
| 공개 여부 | 검증하지 않는다(참/거짓) | — | — | — |
| 제목 중복 | — | — | ⚠ **검사하지 않는다** | — |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/company/careers/validation.ts`. 다만 '지원 방법이 성립하는가'와 '공개해도 되는가'는 필드 하나로 판정되지 않으므로 그 정본은 순수 규칙이 갖고 스키마는 **그것을 부를 뿐**이다 — `apps/admin/src/pages/company/careers/validation.ts:2-8`. **이슈는 반드시 필드에 붙인다** — 객체 수준 이슈는 어느 입력의 오류로도 흘러가지 않아 화면 어디에도 그려지지 않기 때문이다 — `apps/admin/src/pages/company/careers/validation.ts:10-13`.

## 7. 예외 처리

연혁 폼의 §7 과 같다(같은 껍데기·같은 컨트롤러). 문구와 이 화면 고유의 상황만 적는다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `{엔티티}{조사} 찾을 수 없어요. 이미 삭제되었을 수 있어요.` — `apps/admin/src/shared/crud/FormPageShell.tsx:147`(엔티티=`채용 공고`) | 폼 대신 배너. '다시 시도'를 주지 않는다 | '목록으로' |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` + `오류 코드 {참조}` — `apps/admin/src/shared/crud/useCrudForm.ts:221` · `apps/admin/src/shared/crud/FormFeedback.tsx:45` | 화면에 남고 배너 · 입력 유지 | 제출 재클릭(같은 멱등키로 나간다) |
| 수정 실패 | 저장 실패와 같은 문구·같은 경로 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다 | — | — |
| 저장소가 거절(422) | 마감일이 빈 문자열이면 `마감일이 비어 있어요. 날짜를 정하거나 상시 채용으로 저장하세요.` — `apps/admin/src/pages/company/careers/data-source.ts:104`. 공개 게이트면 §4.5 의 사유 | **그 필드 이름과 함께** 돌아와 인라인 오류로 꽂히고 포커스가 옮겨간다 — `apps/admin/src/shared/crud/useCrudForm.ts:208-219` | 지목된 칸을 고친다 |
| 지원 방법이 지금 없는 값 | `지원 방법을 고르세요.` — `apps/admin/src/pages/company/careers/types.ts:177` | ⚠ **공개 저장이 막힌다**(fail-closed). 비공개 저장은 통과하므로 공고 자체는 잃지 않는다 | 지원 방법을 `이메일 접수` 또는 `외부 링크` 로 다시 고른다 |
| API 오류 | 저장 실패와 같은 한 줄. 서버 응답 원문·스택·상태 코드를 문장으로 노출하지 않고 짧은 참조 코드만 남긴다 — `apps/admin/src/shared/crud/FormFeedback.tsx:34-37` | 배너 | 재시도 또는 오류 코드와 함께 신고 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 — 조회 실패면 `{엔티티}{조사} 불러오지 못했어요.` + '다시 시도' | 자동 재시도 없음 | 다시 시도 |
| 권한 없음 | 화면 전체가 `접근 권한이 없어요` 로 바뀐다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. 저장 경로에 들어와도 폼 배너가 막는다: `이 항목을 수정할 권한이 없어요. 필요하다면 관리자에게 권한을 요청해 주세요.` / 등록이면 `이 항목을 등록할 권한이 없어요. …` — `apps/admin/src/shared/crud/useCrudForm.ts:294-295` | 검증도 요청도 시작하지 않는다 | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 — 401 이면 앱이 로그인 화면으로 보낸다 | 세션 폐기 · 원래 경로 보존 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | `DLG-COMMON-FORM-CONFLICT` 가 뜬다. 픽스처의 사유는 `다른 사용자가 먼저 삭제한 항목이에요.` — `apps/admin/src/shared/crud/crud.ts:145` | 덮어쓰지 않는다. 입력이 살아 있다 | '최신 내용 불러오기' 또는 '이어서 편집' |
| 중복 데이터 | ⚠ 막지 않는다 — 같은 제목의 공고를 여러 건 등록할 수 있다 | — | — |
| 파일 업로드 실패 | 해당 없음 — **이 폼에 파일 입력이 없다** | — | — |

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩(등록) | 조회가 없다 — 빈 폼이 즉시 그려진다. 상시=꺼짐, 공개=꺼짐, 지원 방법=이메일 접수 | 취소 ○ · 등록 ○ | N | 안내문 |
| 최초 로딩(수정) | 카드 안 스켈레톤 4행 · 제출 잠금 | 취소 ○ · 저장 × | Y | 안내문 |
| 데이터 있음 | 여덟 값이 채워져 있다. 상시 공고면 마감일 칸이 없다 | 취소 ○ · 제출 ○ | N | — |
| 상시 채용 켜짐 | **마감일 칸이 사라진다** | 그대로 | N | `상시 채용 — 마감일 없이 계속 지원을 받아요. 목록에서 닫히지 않아요.` |
| 지원 경로 미완 | 지원 대상 칸 아래에 info 배너 | 그대로 | N | §4.4 의 해당 사유 |
| 공개 켜짐 + 지원 경로 미완 | 카드 맨 위에 warning 배너 | 취소 ○ · 제출 ○(누르면 인라인 오류로 막힌다) | N | §4.5 의 사유 |
| 조회 실패(없음/오류) | 폼이 사라지고 갈래에 맞는 배너 | 없음=목록으로 ○ · 오류=다시 시도 ○ · 목록으로 ○ | N | §7 의 해당 문구 |
| 저장 중 | 입력과 제출이 잠기고 라벨이 `저장 중…` — `apps/admin/src/shared/crud/FormPageShell.tsx:208` | 취소 × · 제출 × | Y | 라벨이 곧 안내다 |
| 저장 실패 | 카드 맨 위 배너 + 오류 코드 · 입력 유지 | 취소 ○ · 제출 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 취소 ○ · 제출 ○ | N | §6 의 해당 문구 |
| 필드 거절(422) | 서버가 지목한 칸(`마감일` 또는 `지원 대상`)에 인라인 오류 · 그 칸으로 포커스 | 취소 ○ · 제출 ○ | N | 서버가 준 문구 |
| 저장 충돌 | 폼 위에 다이얼로그. 입력은 그대로 있다 | 확인 ○ · 취소 ○ | N | `다른 사용자가 먼저 변경했어요` — `apps/admin/src/shared/crud/FormFeedback.tsx:65` |
| 읽기 전용(권한) | **폼이 열리지 않는다** — 화면 전체가 `접근 권한이 없어요` | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | — | — | — |
| 운영자 | 역할의 `page:/company/careers` 권한을 따른다 | 〃 | 〃 | — | — | — | — | — |
| 뷰어 | ○ | × | × | — | — | — | — | — |
| 권한 없음 | × | × | × | — | — | — | — | — |

**공개/비공개는 권한 축이 아니다** — 승인·반려 액션이 권한 모델에 없고(액션은 다섯뿐이다 — `apps/admin/src/shared/permissions/resources.ts:31`), 공개 여부는 수정 권한 안에서 토글로 다룬다.

**권한이 없을 때 화면이 어떻게 되는가** — 연혁 폼과 같다. **폼 자체가 열리지 않고**, 저장 경로도 컨트롤러가 한 번 더 막는다 — `apps/admin/src/shared/crud/FormPageShell.tsx:120-132` · `apps/admin/src/shared/crud/useCrudForm.ts:290-298`. 플랜 모듈 `cms.pages` 가 잠기면 그보다 먼저 걸린다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-CAREERS` | `채용 공고 등록` 클릭 | `SCR-COMPANY-CAREERS-FORM`(등록) | N | 등록 권한 있음 | 없음 | — |
| `SCR-COMPANY-CAREERS` | 행 클릭 · 행 연필 클릭 | `SCR-COMPANY-CAREERS-FORM`(수정) | N | 행이 그려져 있음 | 공고 id | — |
| `SCR-COMPANY-CAREERS-FORM` | 등록·수정 성공 | `SCR-COMPANY-CAREERS` | N | 요청 성공 | 없음 | 뒤로가기로 폼에 되돌아오지 않는다 |
| `SCR-COMPANY-CAREERS-FORM` | '취소'·'목록으로' 클릭 | `SCR-COMPANY-CAREERS` | N | 없음(dirty 면 가드가 먼저) | 없음 | — |
| `SCR-COMPANY-CAREERS-FORM` | 저장 → 409/412 | `DLG-COMMON-FORM-CONFLICT` | Y | 서버가 충돌로 거절 | 서버가 준 사유 문장 | 같은 폼(입력 유지) |
| `SCR-COMPANY-CAREERS-FORM` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-COMPANY-CAREERS-FORM` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-COMPANY-CAREERS-FORM` | 권한 없이 진입 | `접근 권한이 없어요` 화면 | N | 등록/수정 권한 없음 | 없음 | 사이드바로 다른 메뉴 |
| `SCR-COMPANY-CAREERS-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 폼 |

**이 화면이 여는 팝업(모달)은 없다.** 확인 다이얼로그 둘은 공통 층의 것이다. **'지원 폼을 고르는 팝업'도 없다** — 그 선택지가 사라졌기 때문이다.

**이 화면의 결과 통지 토스트는 0건이다**(공통 층의 `MSG-COMMON-01` 만 뜬다). 인벤토리 §9.3 에 이 화면이 올라 있지 않은 것과 일치한다.
