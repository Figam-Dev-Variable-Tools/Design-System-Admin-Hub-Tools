# 프로모션

> **뼈대는 [이벤트](../events/index.md) 와 같다** — 노출기간 · 상태(예정/진행/종료) · 대상 · 참조 연동 ·
> 설명 · 조회 조건의 주소 왕복 · 공용 목록 껍데기가 전부 한 벌에서 나온다.
> **이 문서는 그 한 벌을 다시 적지 않고 이 화면의 차이만 적는다.** 차이는 둘이다:
> **혜택 대신 할인 축(정률/정액 · 최소 주문금액)** 과 **배너 대신 쿠폰 연동**이다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 프로모션 |
| 화면 ID | `SCR-MARKETING-PROMOTIONS` |
| 메뉴 경로 | 비즈니스 > 마케팅 관리 > 프로모션 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 할인 중심의 판촉(프로모션)을 한 목록에서 보고, 기간·대상·할인·연동 쿠폰을 확인하며 등록·수정·삭제한다.

**업무 배경** — 이벤트가 '무엇을 주는가'(혜택)라면 프로모션은 '얼마를 깎는가'(할인)다. 두 축이 한 화면에 섞이면 정률 20%와 적립금 3,000원이 같은 열에 나란히 서서 비교가 되지 않는다 — `apps/admin/src/pages/marketing/promotions/types.ts:3-4`.

**화면 설명** — 배치는 이벤트와 같다. 열은 프로모션명 · 기간 · 대상 · **할인** · **연동 쿠폰** · 상태다.

**주요 사용자** — 최상위 관리자 · 마케팅 담당 운영자.

**사용 시나리오**

1. 상태 필터를 `진행` 으로 좁혀 지금 도는 할인을 본다.
2. `할인` 열에서 정률·정액을 한눈에 비교한다.
3. `연동 쿠폰` 열의 링크로 그 쿠폰의 편집 화면으로 건너간다.
4. `프로모션 등록` 으로 새 프로모션을 만든다.

**선행 조건** — 로그인. 이 화면의 읽기 권한. 쿠폰을 연동하려면 상품 관리 쿠폰에 등록된 쿠폰이 있어야 한다.

**후행 처리** — 등록·수정한 프로모션이 이 목록에 반영된다. **연동한 쿠폰 쪽은 바뀌지 않는다.**

**관련 화면** — [프로모션 등록·수정](form.md)(`SCR-MARKETING-PROMOTIONS-FORM`) · 같은 뼈대의 [이벤트](../events/index.md)(`SCR-MARKETING-EVENTS`) · 연동 대상 `SCR-PRODUCTS-COUPONS-FORM`. 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바 `비즈니스 > 마케팅 관리` 의 두 번째 항목 — `apps/admin/src/shared/layout/nav-config.ts:222`. **플랜으로 잠기지 않는다** — 마케팅 모듈 매핑에 이 경로가 없다 — `apps/admin/src/shared/entitlements/module-resources.ts:75-80`.

**관련 기능** — 상품 관리 쿠폰(`SCR-PRODUCTS-COUPONS`)이 연동 대상 목록의 정본이다. 이 화면은 그 화면을 직접 참조하지 않고 공통 층의 카탈로그 조회기가 주는 것만 고른다 — `apps/admin/src/pages/marketing/promotions/types.ts:6-8`.

**관련 API** — [이벤트](../events/index.md) 와 같은 다섯(목록·단건·등록·수정·삭제). 백엔드가 없다 — 경계는 `apps/admin/src/pages/marketing/promotions/data-source.ts` 의 `TODO(backend)` 다.

**참고 문서** — [이벤트](../events/index.md)(뼈대 정본) · [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/marketing/promotions/PromotionListPage.tsx` · `promotions/types.ts` · `promotions/data-source.ts` · 공용 모델 `apps/admin/src/pages/marketing/_shared/campaign.ts` · 쿠폰 카탈로그 조회기 `apps/admin/src/shared/domain/coupon-catalog.ts`

## 2. 페이지(UI) 구성

**[이벤트](../events/index.md) 와 같다.** 영역의 종류·표시 조건에 차이가 없다.

## 3. UI 컴포넌트 정의

껍데기의 컴포넌트(상태 필터 · 등록 버튼 · 상태 배지 · 기간 어긋남 배지 · 행 선택 · 빈 상태)는 [이벤트](../events/index.md) 와 같다. **이 화면만 다른 것**은 아래 다섯이다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 검색 입력 | SearchField | `프로모션명·대상 검색` — `apps/admin/src/pages/marketing/promotions/PromotionListPage.tsx:173` | 프로모션명과 대상을 훑는다 — `promotions/types.ts:76-84` | N | N | 없음 | 빈 값 | `프로모션명 · 대상 검색` — `PromotionListPage.tsx:174` | — | 항상 | — |
| 2 | 프로모션명 열 | Table 열 | 헤더 `프로모션명` — `PromotionListPage.tsx:121` | 제목 그대로 | N | Y | — | — | — | — | 항상 | — |
| 3 | 할인 열 | Table 열 | 헤더 `할인` — `PromotionListPage.tsx:129` | 정률이면 `{값}%`, 정액이면 `{값}원` — 조립은 `promotions/types.ts:69-71` | N | Y | — | — | — | — | 항상 | 등폭 숫자 — `PromotionListPage.tsx:132` |
| 4 | 연동 쿠폰 열 | Table 열 | 헤더 `연동 쿠폰` — `PromotionListPage.tsx:136` | 연동됐으면 쿠폰명 링크, 아니면 `미연동` — `PromotionListPage.tsx:138` | N | Y | — | — | — | — | 항상 | **표시는 저장된 사본, 이동은 언제나 id 로** — `promotions/types.ts:45-52` · 링크 `PromotionListPage.tsx:141` |
| 5 | 등록 버튼 | Button(primary) | `프로모션 등록` — `PromotionListPage.tsx:197` | 등록 화면으로 이동 | N | N | 없음 | — | — | — | `create` 권한이 있을 때만 | `PromotionListPage.tsx:194` |
| 6 | 빈 상태 | Empty | `등록된 프로모션이 없어요` / `조건에 맞는 프로모션이 없어요` / `필터에 맞는 프로모션이 없어요` — 조립은 `packages/ui/src/molecules/Empty/Empty.tsx:71-76`(엔티티 이름 `프로모션` 은 `PromotionListPage.tsx:38`) | 왜 비었는지 세 갈래 | N | Y | — | — | — | — | 0행일 때 | — |

**최소 주문금액은 목록에 열이 없다** — 등록·수정 화면과 상세 값에만 있다.

## 4. 기능 명세

기능의 목록과 절차는 [이벤트](../events/index.md) 와 같다: 목록 조회 · 검색/필터 · 기간 어긋남 알림 · 연동 대상으로 이동 · 등록/수정 이동 · 삭제. **성공·실패·예외의 처리 방식도 같다.** 아래는 이 화면에서만 달라지는 값이다.

### 4.1 할인 표기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 정률과 정액을 한 열에서 구분되게 읽힌다 |
| 실행 조건 | 행마다 |
| 사용자 동작 | 없음(읽기) |
| 시스템 처리 | 유형이 정률이면 `{값}%`, 정액이면 천 단위 구분을 넣은 `{값}원` 으로 조립한다 — `promotions/types.ts:69-71` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음(입력 검증은 [프로모션 등록·수정](form.md)) |
| API 호출 여부 | N |
| 성공 처리 | 할인 열이 그려진다 |
| 실패 처리 | 실패 경로가 없다 |
| 예외 처리 | **할인값은 원본 보존을 위해 폼에서 문자열로 받는다** — 저장된 값은 수이며 목록은 그것을 그대로 그린다 — `apps/admin/src/pages/marketing/promotions/validation.ts:3` |
| 화면 변경 사항 | 목록영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 연동 쿠폰으로 이동

| 항목 | 내용 |
|---|---|
| 기능 목적 | 프로모션에 걸린 쿠폰을 그 자리에서 확인한다 |
| 실행 조건 | 쿠폰이 연동된 행 |
| 사용자 동작 | 연동 쿠폰 열의 링크 클릭 |
| 시스템 처리 | 저장된 쿠폰 id 로 편집 경로를 만든다 — `PromotionListPage.tsx:141` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 쿠폰 등록·수정 화면이 열린다 |
| 실패 처리 | 그 쿠폰이 사라졌으면 도착 화면이 자기 실패를 알린다 |
| 예외 처리 | **예전에는 쿠폰코드를 손으로 적었다** — 없는 쿠폰이어도 조용히 저장됐고 오타를 아무도 막지 못했으며 건너갈 길도 없었다. 지금은 선택 목록이 카탈로그에서 오므로 **존재하지 않는 쿠폰은 애초에 고를 수 없다** — `promotions/types.ts:36-42` |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 뒤로가기로 같은 조건의 목록 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

[이벤트](../events/index.md) 의 이벤트 표와 **같다.** 다른 것은 한 줄이다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 연동 쿠폰 링크 클릭 | 링크 | 쿠폰 편집 화면으로 이동 | 연동 쿠폰 열 | `SCR-PRODUCTS-COUPONS-FORM` |

**이 화면 고유의 확인 다이얼로그는 없다** — 인벤토리 §8.2 에 이 화면이 없다.

## 6. Validation

**해당 없음 — 이 목록 화면에는 입력 검증이 없다.** [이벤트](../events/index.md) 와 같다. 등록·수정의 검증 규칙은 [프로모션 등록·수정](form.md) 이 갖는다.

## 7. 예외 처리

[이벤트](../events/index.md) 의 12행과 **같다.** 문구에서 엔티티 이름만 바뀐다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `등록된 프로모션이 없어요` / `조건에 맞는 프로모션이 없어요` / `필터에 맞는 프로모션이 없어요` — `packages/ui/src/molecules/Empty/Empty.tsx:71-76` | 표 구조를 유지한 채 빈 상태 | `검색 지우기` · `필터 초기화` · 등록 |
| 저장 실패 · 수정 실패 | 해당 없음 — 이 화면에 저장 폼이 없다 | — | — |
| 삭제 실패 | 공통 규칙(다이얼로그를 닫지 않고 배너로) | — | 확인 재클릭 |
| API 오류 · 서버 오류 · 네트워크 오류 | 공용 목록 껍데기의 조회 실패 인라인 배너. 자동 재시도 없음 — `apps/admin/src/shared/query/queryClient.ts:82,108` | 표 자리를 대체한다 | 배너의 다시 시도 |
| 권한 없음 | 읽기 없음 → `접근 권한이 없어요` — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. 등록 권한만 없으면 버튼이 보이지 않는다 | 셸은 남는다 | 관리자에게 권한 요청 |
| 세션 만료 | 이 화면에 자기 문구가 없다 | 원래 주소를 보존한 채 로그인 화면으로 | 재로그인 후 같은 조건으로 복귀 |
| 데이터 충돌 | 이 화면에는 쓰기 폼이 없다 | — | — |
| 중복 데이터 | **프로모션명 중복을 막지 않는다** — 코드에 유일성 검사가 없다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 목록에 이미지 열이 없다 — `PromotionListPage.tsx:4` | — | — |

**연동 쿠폰이 사라졌을 때** — [이벤트](../events/index.md) 의 배너와 같다. 링크는 살아 있고 목록은 저장된 이름을 그대로 그린다.

## 8. 화면 상태(State)

[이벤트](../events/index.md) 의 상태 표와 **같다.** 문구의 엔티티 이름만 `프로모션` 으로 바뀌고, `미연동`·`이름 모름`을 다르게 그리는 규칙도 같다. 이 화면만의 상태는 없다.

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `/marketing/promotions` 리소스 × `read` | 같은 리소스 × `create` | × `update` | × `remove` | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

**권한이 없을 때 화면이 어떻게 되는가** — [이벤트](../events/index.md) 와 같다. 플랜 축은 걸리지 않는다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-MARKETING-PROMOTIONS` | `프로모션 등록` 클릭 | `SCR-MARKETING-PROMOTIONS-FORM` | N | `create` 권한 | 없음(빈 폼) | 저장·취소 시 목록 |
| `SCR-MARKETING-PROMOTIONS` | 행 클릭 | `SCR-MARKETING-PROMOTIONS-FORM` | N | 언제나 | 프로모션 id | 〃 |
| `SCR-MARKETING-PROMOTIONS` | 연동 쿠폰 링크 클릭 | `SCR-PRODUCTS-COUPONS-FORM` | N | 쿠폰이 연동됐을 때 | 쿠폰 id | 뒤로가기로 같은 조건의 목록 |
| `SCR-MARKETING-PROMOTIONS` | 행 삭제 클릭 | `DLG-COMMON-DELETE-ONE` | Y | 삭제 권한 | 대상 1건의 id·이름 | 같은 목록 |
| `SCR-MARKETING-PROMOTIONS` | 일괄 삭제 클릭 | `DLG-COMMON-DELETE-BULK` | Y | 1건 이상 선택 | 선택된 id 목록·건수 | 같은 목록 |
| `SCR-MARKETING-PROMOTIONS` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | 원래 주소 · 만료 표식 | 재인증 후 같은 조건의 이 화면 |

**팝업이 없고, 자기 결과 통지 토스트도 없다** — 인벤토리 §9.3 에 `pages/marketing/promotions/PromotionListPage.tsx` 가 없다. 삭제 통지는 공통 층의 `MSG-COMMON-02` · `MSG-COMMON-03` 이 말한다.
