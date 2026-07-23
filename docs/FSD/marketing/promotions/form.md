# 프로모션 등록·수정

> **`/marketing/promotions/new` 와 `/marketing/promotions/:id/edit` 는 같은 화면이다** — 같은
> 컴포넌트가 `:id` 유무로 등록과 수정을 겸한다.
>
> **뼈대는 [이벤트 등록·수정](../events/form.md) 과 같다** — 공용 폼 껍데기 · 기간 · 상태 · 대상 ·
> 참조 연동 토글 · 설명 · 저장 · 이탈 가드 · 충돌 처리가 전부 한 벌에서 나온다.
> **이 문서는 그 한 벌을 다시 적지 않고 이 화면의 차이만 적는다.**

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 프로모션 등록·수정 |
| 화면 ID | `SCR-MARKETING-PROMOTIONS-FORM` |
| 메뉴 경로 | 비즈니스 > 마케팅 관리 > 프로모션 > 등록·수정 (사이드바에 자리가 없다) |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 프로모션의 이름·기간·상태·대상·할인 조건·연동 쿠폰·설명을 입력해 만들거나 고친다.

**업무 배경** — 할인은 숫자가 곧 금액이다. 정률에 200을 적으면 200% 할인이 되고, 할인값을 0으로 두면 아무것도 깎이지 않는 프로모션이 저장된다. 이 화면은 그 경계를 저장 전에 막는다(§6).

**화면 설명** — 배치는 이벤트 폼과 같다. 다른 것은 혜택 대신 **할인 유형 · 할인값 · 최소 주문금액** 세 칸이 오고, 배너 대신 **쿠폰**을 연동한다는 점이다.

**주요 사용자** — 최상위 관리자 · 마케팅 담당 운영자(등록·수정 권한 보유자).

**사용 시나리오**

1. 목록의 `프로모션 등록` 으로 들어와 이름과 기간을 채운다.
2. 할인 유형을 `정률(%)` 로 두면 값 칸의 라벨이 `할인율 (%)` 로, `정액(원)` 이면 `할인액 (원)` 으로 바뀐다.
3. 쿠폰 연동을 켜고 목록에서 쿠폰을 고른다. `연동한 쿠폰 상세 보기` 로 확인한다.
4. 저장하면 목록으로 돌아가고 공통 성공 토스트가 뜬다.

**선행 조건** — 로그인. 등록은 `create`, 수정은 `update` 권한. 쿠폰을 연동하려면 상품 관리 쿠폰에 등록된 쿠폰이 있어야 한다.

**후행 처리** — 저장한 값이 [프로모션 목록](index.md) 에 반영된다. **연동한 쿠폰 쪽은 바뀌지 않는다.** 저장 시점의 쿠폰명이 표시용 사본으로 함께 저장된다.

**관련 화면** — [프로모션 목록](index.md)(`SCR-MARKETING-PROMOTIONS`) · 연동 대상 `SCR-PRODUCTS-COUPONS-FORM` · 같은 뼈대의 [이벤트 등록·수정](../events/form.md). 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자기 자리가 없다. 권한 리소스는 잎 `/marketing/promotions` 가 덮는다.

**관련 기능** — 상품 관리 쿠폰이 선택 목록의 정본이다. **카탈로그를 모르면 빈 선택 목록을 그리지 않는다**([이벤트 등록·수정](../events/form.md) 과 같은 규칙).

**관련 API** — [이벤트 등록·수정](../events/form.md) 과 같은 셋(단건 조회 · 등록 · 수정). 백엔드가 없다 — 경계는 `apps/admin/src/pages/marketing/promotions/data-source.ts` 의 `TODO(backend)` 다.

**참고 문서** — [이벤트 등록·수정](../events/form.md)(뼈대 정본) · [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/marketing/promotions/PromotionFormPage.tsx` · `promotions/validation.ts` · `promotions/types.ts` · 공용 모델 `apps/admin/src/pages/marketing/_shared/campaign.ts` · 쿠폰 카탈로그 조회기 `apps/admin/src/shared/domain/coupon-catalog.ts`

## 2. 페이지(UI) 구성

**[이벤트 등록·수정](../events/form.md) 과 같다.** 영역의 종류·표시 조건에 차이가 없다. 조건부 영역 둘의 이름만 바뀐다: 혜택 상세 칸 → **할인 칸 묶음**(언제나 보인다), 배너 선택 칸 → **쿠폰 선택 칸**(연동이 켜졌을 때 — `apps/admin/src/pages/marketing/promotions/PromotionFormPage.tsx:288`).

## 3. UI 컴포넌트 정의

껍데기의 컴포넌트(카드 제목 · 안내 · 기간 · 상태 · 대상 · 설명 · 취소/저장 · 연동 토글 · 카탈로그 실패 표시)는 [이벤트 등록·수정](../events/form.md) 과 같다. **이 화면만 다른 것**은 아래 아홉이다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 카드 제목 · 안내 | Heading · Text | `프로모션 정보` — `apps/admin/src/pages/marketing/promotions/PromotionFormPage.tsx:159` · `별표(*) 항목은 필수예요. 기간·할인 조건을 확인하세요.` — `PromotionFormPage.tsx:160` | 입력 묶음의 이름과 확인 사항 | N | Y | — | — | — | — | 항상 | 이벤트 폼과 문장이 다르다(할인 조건을 짚는다) |
| 2 | 프로모션명 | TextField | `프로모션명` — `PromotionFormPage.tsx:174` | 목록에서 찾는 이름 | **Y** | N | 저장 중·조회 중 — `PromotionFormPage.tsx:145` | 빈 값 | `예: 전 상품 20% 할인` — `PromotionFormPage.tsx:181` | 80자 — `apps/admin/src/pages/marketing/promotions/types.ts:64` | 항상 | 입력 자체가 80자에서 멈춘다 — `PromotionFormPage.tsx:180` |
| 3 | 프로모션 기간 | DateRangeField | 그룹 라벨 `프로모션 기간` — `PromotionFormPage.tsx:190` | 노출 시작·종료 | **Y** | N | 〃 | 빈 값 | — | `YYYY-MM-DD` · §6 | 항상 | 오류는 그룹 하나로 — `PromotionFormPage.tsx:154` |
| 4 | 대상 | TextField | `대상` — `PromotionFormPage.tsx:210` | 참여 대상 설명 | **Y** | N | 〃 | 빈 값 | `예: 전체 회원 · 신규 가입 회원` — `PromotionFormPage.tsx:216` | 60자 — `apps/admin/src/pages/marketing/promotions/validation.ts:19` | 항상 | 이벤트와 자리표시자가 다르다 |
| 5 | 할인 유형 | SelectField | `할인 유형` — `PromotionFormPage.tsx:226` | 항목 `정률(%)` · `정액(원)` — `promotions/types.ts:19-20` | **Y** | N | 〃 | `정률(%)` — `PromotionFormPage.tsx:55` | — | — | 항상 | 이 선택이 다음 칸의 **라벨과 자리표시자를 바꾼다** |
| 6 | 할인값 | TextField(숫자) | 정률이면 `할인율 (%)`, 정액이면 `할인액 (원)` — `PromotionFormPage.tsx:237` | 깎을 값 | **Y** | N | 〃 | 빈 값 | 정률이면 `예: 20`, 정액이면 `예: 5000` — `PromotionFormPage.tsx:247` | 숫자만 · 0 초과 · 정률은 100 이하 · §6 | 항상 | 숫자 키패드를 띄운다 — `PromotionFormPage.tsx:244`. **원값 보존을 위해 문자열로 받는다** — `apps/admin/src/pages/marketing/promotions/validation.ts:3` |
| 7 | 최소 주문금액 | TextField(숫자) | `최소 주문금액 (원)` — `PromotionFormPage.tsx:258` | 이 금액 이상일 때만 적용 | N | N | 〃 | 빈 값 | `예: 30000` — `PromotionFormPage.tsx:268` | 숫자만(비면 0) · §6 | 항상 | 도움말 `0 이면 조건 없음` — `PromotionFormPage.tsx:260`. 숫자 키패드 — `PromotionFormPage.tsx:265` |
| 8 | 쿠폰 연동 토글 | ToggleSwitch | 접근성 이름 `쿠폰 연동 여부` · 켜짐 `연동` · 꺼짐 `미연동` — `PromotionFormPage.tsx:283-285` | 쿠폰을 걸지 말지 | N | N | 〃 | 꺼짐(수정이면 쿠폰 id 유무에서 파생) — `PromotionFormPage.tsx:109` | — | — | 항상 | **저장되는 값이 아니다** — `apps/admin/src/pages/marketing/promotions/validation.ts:23-25` |
| 9 | 연동 쿠폰 | SelectField | `연동 쿠폰` — `PromotionFormPage.tsx:305` | 카탈로그의 쿠폰만 | **Y**(연동이 켜졌을 때) | N | 〃 | `쿠폰을 선택하세요` — `PromotionFormPage.tsx:319` | — | 카탈로그에 있는 쿠폰만 | 연동이 켜졌고 카탈로그를 알 때 | 도움말 `상품 관리에 등록된 쿠폰만 고를 수 있어요.` — `PromotionFormPage.tsx:308` |
| 10 | 쿠폰 목록 실패 표시 | SelectField(잠김) | 오류 `쿠폰 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.` · 항목 `쿠폰 목록을 불러오지 못했어요` — `PromotionFormPage.tsx:296,299` | 카탈로그를 모를 때 | — | Y | 언제나 잠김 | — | — | — | 연동이 켜졌고 카탈로그가 `null` 일 때 — `PromotionFormPage.tsx:288` | 빈 목록을 그리지 않는다 |
| 11 | 쿠폰 바로가기 | Link | `연동한 쿠폰 상세 보기` — `PromotionFormPage.tsx:332` | 고른 쿠폰의 편집 화면으로 | N | N | 없음 | — | — | — | 연동이 켜졌고 쿠폰을 골랐을 때 — `PromotionFormPage.tsx:328` | — |
| 12 | 설명 | TextareaField | `설명` — `PromotionFormPage.tsx:338` | 조건·안내 문구 | N | N | 〃 | 빈 값 | `프로모션 조건·안내 문구를 입력하세요.` — `PromotionFormPage.tsx:344` | 1,000자 — `promotions/types.ts:65` | 항상 | — |

## 4. 기능 명세

기능의 목록과 절차는 [이벤트 등록·수정](../events/form.md) 과 같다: 폼 열기 · 연동 토글 · 카탈로그 선택 · 저장 · 이탈 가드 · 저장 충돌. **성공·실패·예외의 처리 방식도 같다.** 아래는 이 화면에서만 달라지는 값이다.

### 4.1 할인 유형에 따른 라벨 전환

| 항목 | 내용 |
|---|---|
| 기능 목적 | 같은 칸이 무엇을 뜻하는지 유형이 말하게 한다 |
| 실행 조건 | 할인 유형이 바뀔 때마다 |
| 사용자 동작 | 할인 유형 선택 |
| 시스템 처리 | 값 칸의 **라벨과 자리표시자가 함께 바뀐다** — `PromotionFormPage.tsx:237,247`. 칸이 사라지거나 나타나지는 않는다(이벤트의 혜택 상세와 다른 점이다) |
| 데이터 처리 | **입력값은 버려지지 않는다** — 유형만 바뀌고 숫자는 그대로 남는다 |
| Validation | 정률이면 100 이하라는 규칙이 추가로 걸린다(§6) |
| API 호출 여부 | N |
| 성공 처리 | 라벨과 자리표시자가 바뀐다. 토스트 없음 |
| 실패 처리 | 실패 경로가 없다 |
| 예외 처리 | ⚠ **유형을 정액에서 정률로 바꿔도 값이 그대로 남는다** — `5000` 을 적고 정률로 바꾸면 5000% 가 되며, 저장 시 §6 의 상한 검사가 막는다. 화면이 값을 미리 지우지는 않는다 |
| 화면 변경 사항 | 입력영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 쿠폰 연동

| 항목 | 내용 |
|---|---|
| 기능 목적 | 프로모션이 어떤 쿠폰으로 실행되는지 잇는다 |
| 실행 조건 | 항상 |
| 사용자 동작 | 토글 전환 → 쿠폰 선택 |
| 시스템 처리 | 끄면 저장 시 쿠폰 id 를 버린다 — `PromotionFormPage.tsx:82`. 저장 시 그 쿠폰의 이름을 카탈로그에서 떠 표시용 사본으로 함께 저장한다 — `PromotionFormPage.tsx:72-78,93` |
| 데이터 처리 | 카탈로그를 모르거나 사라진 id 면 이름은 **빈 문자열** — 지어내지 않는다 |
| Validation | 켜졌는데 고르지 않으면 저장을 막는다(§6) |
| API 호출 여부 | N — 공통 층의 조회기를 읽는다 |
| 성공 처리 | 선택 목록이 뜨고, 고르면 바로가기 링크가 나타난다 |
| 실패 처리 | 카탈로그를 모르면 잠긴 실패 표시(§3 No.10) |
| 예외 처리 | **예전에는 쿠폰코드를 손으로 적었다** — 없는 쿠폰이어도 조용히 저장됐고 오타를 막지 못했다. 지금은 선택 목록이 카탈로그에서 오므로 **존재하지 않는 쿠폰은 검증까지 오지 않는다** — `apps/admin/src/pages/marketing/promotions/validation.ts:100-101` |
| 화면 변경 사항 | 입력영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.3 저장

| 항목 | 내용 |
|---|---|
| 기능 목적 | 입력을 검증해 등록하거나 수정한다 |
| 실행 조건 | 저장 버튼 클릭 또는 폼 제출 |
| 사용자 동작 | `등록` / `저장` 클릭 |
| 시스템 처리 | 검증(§6)을 통과하면 값을 다듬어 보낸다. **할인값·최소 주문금액은 문자열에서 수로 바뀐다**(빈 최소 주문금액은 0) — `PromotionFormPage.tsx:80-96` |
| 데이터 처리 | 프로모션 1건이 만들어지거나 갱신된다 |
| Validation | §6 |
| API 호출 여부 | Y |
| 성공 처리 | 목록으로 돌아가고 **공통 성공 토스트**가 뜬다 — `MSG-COMMON-01`(엔티티 이름은 `프로모션` — `PromotionFormPage.tsx:36`) |
| 실패 처리 | 공통 규칙 — 목록으로 이동하지 않고 입력을 유지한 채 폼 배너가 이유를 말한다 |
| 예외 처리 | [이벤트 등록·수정](../events/form.md) 과 같다(첫 위반 필드로 포커스 · 422 는 인라인 오류 · 중복 제출 잠금) |
| 화면 변경 사항 | 화면 전체(성공) · 저장 실패 영역(실패) |
| 후속 동작 | 목록 재조회 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.4 이탈 가드 · 저장 충돌

[이벤트 등록·수정](../events/form.md) 과 **같다.** 다른 것은 이탈 가드에 함께 넘기는 문장 하나다: `프로모션에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `PromotionFormPage.tsx:38-39`. 다이얼로그 자체는 공통 층의 `DLG-COMMON-LEAVE-FORM` · `DLG-COMMON-FORM-CONFLICT` 다.

## 5. 이벤트 정의

[이벤트 등록·수정](../events/form.md) 의 이벤트 표와 **같다.** 다른 것은 두 줄이다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 할인 유형 변경 | 선택 변경 | 값 칸의 라벨·자리표시자가 바뀐다(값은 남는다) | 입력영역 | 폼 |
| 쿠폰 바로가기 클릭 | `연동한 쿠폰 상세 보기` | 쿠폰 편집 화면으로 이동(입력이 있으면 이탈 가드) | 쿠폰 바로가기 | `SCR-PRODUCTS-COUPONS-FORM` |

**이 화면 고유의 확인 다이얼로그는 없다** — 인벤토리 §8.2 에 이 화면이 없다.

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 프로모션명 | 공백만으로 채울 수 없다 · 80자 이내 | 제출 시 | `프로모션명을 입력하세요.` / `프로모션명은 80자를 넘을 수 없어요.` — 조립은 `apps/admin/src/shared/crud/validation.ts:19-27`(라벨·상한은 `apps/admin/src/pages/marketing/promotions/validation.ts:15`) | 그 필드로 포커스 이동 · 제출 차단 |
| 프로모션 기간 | 시작·종료가 실재하는 달력일 | 〃 | `프로모션 기간을 YYYY-MM-DD 형식으로 입력하세요.` — `promotions/validation.ts:41` | 기간 입력 옆에 한 줄 |
| 프로모션 기간 | 종료일이 시작일보다 빠를 수 없다 | 〃 | `종료일은 시작일보다 빠를 수 없어요.` — `promotions/validation.ts:50` | 〃 |
| 대상 | 공백만으로 채울 수 없다 · 60자 이내 | 〃 | `대상을 입력하세요.` / `대상은 60자를 넘을 수 없어요.` — 조립은 `apps/admin/src/shared/crud/validation.ts:19-27`(라벨·상한은 `promotions/validation.ts:19`) | 그 필드로 포커스 이동 |
| 할인값 | 숫자만 | 〃 | `할인값은 숫자만 입력할 수 있어요.` — `promotions/validation.ts:62` | 그 필드로 포커스 이동 |
| 할인값 | 0보다 커야 한다 | 〃 | `할인값은 0보다 커야 해요.` — `promotions/validation.ts:72` | 〃 |
| 할인값 | 정률이면 100 이하 | 〃 | `정률 할인은 100%를 넘을 수 없어요.` — 조립은 `promotions/validation.ts:81`(상한은 `apps/admin/src/pages/marketing/promotions/types.ts:67`) | 〃 |
| 최소 주문금액 | 비었으면 통과, 채우면 숫자만 | 〃 | `최소 주문금액은 숫자만 입력할 수 있어요.` — `promotions/validation.ts:93` | 〃 |
| 연동 쿠폰 | 연동이 켜졌으면 골라야 한다 | 〃 | `연동할 쿠폰을 선택하세요.` — `promotions/validation.ts:105` | 〃 |
| 설명 | 1,000자 이내 | 〃 | `설명은 1000자를 넘을 수 없어요.` — 조립은 `promotions/validation.ts:27-30`(상한은 `promotions/types.ts:65`) | 〃 |
| 할인 유형 · 상태 | 정해진 값 중 하나 | 〃 | (없음 — 선택 목록 밖의 값이 들어올 자리가 없다) | 스키마가 거절한다 |

**세 검사가 순서를 갖는다** — 할인값은 숫자 → 0 초과 → (정률이면) 100 이하 순으로 보고, **앞 검사가 걸리면 뒤를 보지 않는다** — `promotions/validation.ts:57-84`. 무엇부터 고쳐야 할지가 사라지지 않게 한다.

**⚠ 할인값과 최소 주문금액의 상한이 없다** — 정액 할인에 1,000,000,000 을 적어도 통과한다. 정률만 100% 상한을 갖는다.

## 7. 예외 처리

[이벤트 등록·수정](../events/form.md) 의 12행과 **같다.** 문구에서 엔티티 이름과 카탈로그 이름만 바뀐다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 수정 진입 시 그 프로모션이 없으면 공용 폼 껍데기의 '없음' 표시 — `apps/admin/src/shared/crud/useCrudForm.ts:165-177` | 폼을 그리지 않는다 | 목록으로 |
| 저장 실패 · 수정 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/shared/crud/useCrudForm.ts:221` (+ `오류 코드 {참조}` — `apps/admin/src/shared/crud/FormFeedback.tsx:45`) | 입력을 유지한다 | 다시 저장 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제 컨트롤이 없다 | — | — |
| API 오류 · 서버 오류 · 네트워크 오류 | 위 저장 실패 문구. 자동 재시도 없음 — `apps/admin/src/shared/query/queryClient.ts:82,108` | 짧은 참조 코드만 남긴다 | 다시 저장 |
| 권한 없음 | `이 항목을 수정할 권한이 없어요. …` / `이 항목을 등록할 권한이 없어요. …` — `apps/admin/src/shared/crud/useCrudForm.ts:294-295` | 요청을 시작하지 않는다 | 관리자에게 권한 요청 |
| 세션 만료 | 이 화면에 자기 문구가 없다 | 원래 주소를 보존한 채 로그인 화면으로 | 재로그인. 입력값은 돌아오지 않는다 |
| 데이터 충돌 | 공통 충돌 다이얼로그 — `DLG-COMMON-FORM-CONFLICT` | 덮어쓰지 않는다 | `최신 내용 불러오기` 또는 `이어서 편집` |
| 중복 데이터 | **프로모션명 중복을 막지 않는다** — 유일성 검사가 코드에 없다 | 같은 이름이 여러 건 저장된다 | 없음 |
| 파일 업로드 실패 | 해당 없음 — 이 폼에 파일 입력이 없다 | — | — |
| 쿠폰 카탈로그 미배선 | `쿠폰 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.` — `PromotionFormPage.tsx:296` | 빈 목록을 그리지 않고 잠근다 | 배선을 확인한다. 연동을 끄면 저장할 수 있다 |

## 8. 화면 상태(State)

[이벤트 등록·수정](../events/form.md) 의 상태 표와 **같다.** 이 화면만의 상태는 하나다.

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 할인 유형 전환 | 값 칸의 라벨이 `할인율 (%)` ↔ `할인액 (원)` 로 바뀐다. **입력값은 그대로 남는다** | 전부 ○ | N | 없음 |

**`[]`(고를 쿠폰이 없다)와 `null`(카탈로그를 모른다)은 다른 행이다** — [이벤트 등록·수정](../events/form.md) 과 같은 규칙이다.

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | — | — | — | — | — |
| 운영자 | 역할의 `/marketing/promotions` 리소스 × `read` | 같은 리소스 × `create` | × `update` | — | — | — | — | — |
| 뷰어 | ○ | × | × | — | — | — | — | — |
| 권한 없음 | × | × | × | — | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — [이벤트 등록·수정](../events/form.md) 과 같다. 플랜 축은 걸리지 않는다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-MARKETING-PROMOTIONS` | `프로모션 등록` · 행 클릭 | `SCR-MARKETING-PROMOTIONS-FORM` | N | 권한 | 없음 또는 프로모션 id | — |
| `SCR-MARKETING-PROMOTIONS-FORM` | 저장 성공 | `SCR-MARKETING-PROMOTIONS` | N | 검증 통과 | 없음 | — |
| `SCR-MARKETING-PROMOTIONS-FORM` | 취소 · `목록으로` | `SCR-MARKETING-PROMOTIONS` | N | 입력이 없거나 이탈 가드에서 확인 | 없음 | — |
| `SCR-MARKETING-PROMOTIONS-FORM` | `연동한 쿠폰 상세 보기` | `SCR-PRODUCTS-COUPONS-FORM` | N | 연동이 켜졌고 쿠폰을 골랐을 때 | 쿠폰 id | 뒤로가기(입력은 보존되지 않는다) |
| `SCR-MARKETING-PROMOTIONS-FORM` | 앱 안 링크 · 뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 변경됐을 때 | 이동하려던 경로 | 확인=목적지 · 취소=폼 |
| `SCR-MARKETING-PROMOTIONS-FORM` | 탭 닫기 · 새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-MARKETING-PROMOTIONS-FORM` | 저장 → 충돌 | `DLG-COMMON-FORM-CONFLICT` | Y | 서버가 충돌로 거절 | 서버가 준 사유 문장 | 같은 폼(입력 유지) |
| `SCR-MARKETING-PROMOTIONS-FORM` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | 원래 주소 · 만료 표식 | 재인증 후 이 화면 |

**팝업이 없고 자기 결과 통지 토스트도 없다** — 인벤토리 §9.3 에 `pages/marketing/promotions/PromotionFormPage.tsx` 가 없다. 저장 성공은 공통 층의 `MSG-COMMON-01` 이 말한다.
