# 인증서/특허

> 이 화면은 [연혁](../history/index.md)(`SCR-COMPANY-HISTORY`)과 **같은 모양**이지만
> 공용 목록 껍데기를 쓰지 못한다 — **행 드래그 재정렬** 때문이다. 드래그는 행에 핸들러를 걸어야
> 하는데 그 행은 디자인 시스템 표가 소유한다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:6-11`.
> 그래서 껍데기가 하던 나머지(라이브 영역 · 요약 · 선택 바 · 조회 실패 배너 · 다이얼로그)를
> **같은 형태로 손수 조립**한다. 아래 각 절은 연혁과 **다른 것**을 밝혀 적는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 인증서/특허 |
| 화면 ID | `SCR-COMPANY-CERTIFICATES` |
| 메뉴 경로 | 기업 관리 > 인증서/특허 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 회사가 받은 인증서·특허를 모아 두고, **홈페이지에 보일 순서를 직접 정하고**, 등록·수정·삭제한다.

**업무 배경** — 인증서와 특허는 "무엇을 앞세울 것인가"가 곧 홍보 전략이다. 발급일 순서가 그 전략과 일치하지 않는 경우가 많아, 운영자가 손으로 순서를 바꿀 수 있어야 한다. 그 순간 발급일 정렬 규칙과 정면으로 충돌하므로 **수동 순서가 이긴다** — 목록 조회는 순서 오름차순이고, 발급일은 이제 정렬 규칙이 아니라 그냥 표시되는 열이다 — `apps/admin/src/pages/company/certificates/types.ts:16-26`.

**화면 설명** — 툴바에 구분 필터(전체/인증서/특허)와 '인증서/특허 등록'. 그 아래 요약 줄이 있고, **순서를 바꿀 수 있으면 방법을, 바꿀 수 없으면 그 이유를 그 옆에 문장으로** 보여 준다. 표의 행은 끌어서 옮기거나 행마다 있는 위/아래 버튼으로 옮긴다. **놓는 즉시 저장된다.**

**주요 사용자** — 최상위 관리자 · 기업 정보를 다루는 운영자.

**사용 시나리오**

1. 새로 받은 인증서를 등록하면 목록 맨 끝에 붙는다 → 맨 앞으로 끌어 올린다 → 놓는 즉시 저장되고 토스트가 뜬다.
2. '특허'만 걸어 놓고 훑다가 순서를 바꾸려 한다 → 손잡이가 없고, 그 자리에 **왜 못 바꾸는지**가 문장으로 적혀 있다.
3. 키보드만 쓰는 운영자가 행의 '위로' 버튼으로 한 칸씩 옮긴다.

**선행 조건** — 로그인. 플랜 모듈 매핑에 없어 플랜 축으로 잠기지 않는다.

**후행 처리** — 저장된 순서가 홈페이지의 인증서 목록 순서가 된다. 홈페이지는 이 리포 밖이라 반영 경로를 코드에서 확인하지 못했다.

**관련 화면** — [인증서/특허 등록·수정](form.md)(`SCR-COMPANY-CERTIFICATES-FORM`) · [연혁](../history/index.md)(같은 모양의 목록) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md). **상세 화면이 없다.**

**관련 메뉴** — 기업 관리 가지의 다섯 번째 잎 — `apps/admin/src/shared/layout/nav-config.ts:159`.

**관련 기능** — 없음.

**관련 API** — 목록 조회 1건 · 단건 삭제 1건 · 순서 저장 1건. **백엔드가 없다** — `apps/admin/src/pages/company/certificates/data-source.ts:59`(CRUD) · `:91`(순서).

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx` (표 `CertificatesTable.tsx` · 순수 규칙 `types.ts` · 조회 `queries.ts` · 데이터 `data-source.ts`)

---

**⚠ 지금 코드에서 확인되는 사실** — **목록에 이미지 열이 없다.** 이미지 자체는 그대로 있고(등록·수정 폼의 이미지 입력은 유지) 목록에서 보여 주지 않을 뿐이다. 열이 사라졌으니 표 설명에서도 그 열을 읽지 않는다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:5-8`.

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 알림영역 ①(보조기술 전용) | 목록 상태를 한 줄로 읽어 준다 | 항상(비어 있어도 DOM 에 남는다) | 보조기술 | 불가 | 화면에는 보이지 않음 |
| 알림영역 ②(보조기술 전용) | **순서가 바뀐 사실**을 한 줄로 읽어 준다 | 〃 | 보조기술 | 불가 | 〃 |
| 필터영역(툴바 왼쪽) | 구분(전체·인증서·특허) | 항상 | 전체 | 불가 | 표시 |
| 버튼영역(툴바 오른쪽) | 인증서/특허 등록 | **등록 권한이 있을 때만** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:224` | 권한자 | 불가 | 표시 |
| 요약영역 | 왼쪽에 건수 · **오른쪽에 재정렬 안내 또는 거부 사유** | 조회 실패가 아닐 때 | 전체 | 불가 | 표시 |
| 선택 바 | 일괄 삭제 | **삭제 권한이 있고** 1건 이상 선택했을 때 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:250` | 권한자 | 불가 | 숨김 |
| 목록영역 | 인증서/특허 표(가로 스크롤 가능) | 조회 실패가 아닐 때 | 전체 | 불가 | 표시 |
| 오류영역 | 조회 실패 배너 + 다시 시도 | 조회 실패 | 전체 | 불가 | 숨김 |

**라이브 영역이 둘인 이유** — 목록 상태와 순서 변경은 수명이 다르다. 한 영역에 섞으면 재렌더의 건수 문장이 방금 넣은 순서 문장을 덮어쓴다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:194-196`.

## 3. UI 컴포넌트 정의

연혁 목록과 같은 것(라이브 영역의 목록 상태 문장 · 건수 표시 · 선택 체크박스 · 순번 · 일괄 삭제 버튼 · 조회 실패 배너의 구조)은 다시 적지 않는다. 이 화면 고유의 값과 문구만 적는다.

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 구분 필터 | SelectField | 보조기술 이름 `구분 필터` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:208` | `전체` · `인증서` · `특허` — `apps/admin/src/pages/company/certificates/types.ts:43-46` | N | N | 없음 | `전체` | — | — | 항상 | **주소에 실리지 않는다** — 화면 상태다(연혁·ESG 와 같은 결) |
| 2 | 인증서/특허 등록 | Button(primary) | `인증서/특허 등록` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:227` | 등록 폼으로 이동 | N | N | 없음 | — | — | — | **등록 권한이 있을 때만 존재한다** | 비활성이 아니라 사라진다 |
| 3 | 재정렬 안내 · 거부 사유 | Text(hint) | 바꿀 수 있으면 `행을 끌어 놓거나 각 행의 위/아래 버튼으로 순서를 바꿔요. 바꾸는 즉시 저장돼요.` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:65-66`. 못 바꾸면 §4.3 의 세 사유 중 하나 | **왜 막혔는지를 문장으로 남긴다** — 손잡이만 조용히 사라지면 운영자는 이유를 알 수 없다 | N | Y | — | — | — | — | 최초 로딩이 아니고 **행이 1건 이상일 때** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:244` | 아직 아무것도 없는 목록에서는 빈 상태가 이미 말한다 |
| 4 | 순서 변경 알림 | 라이브 영역(polite) | `'{명칭}'{조사} {전체}건 중 {위치}번째로 옮겼어요.` — `apps/admin/src/pages/company/certificates/types.ts:154-163` | 행이 움직인 것은 **시각적 사실**이라 이 줄이 없으면 보조기술에 아무것도 전달되지 않는다 | N | Y | — | 빈 문자열 | — | — | **항상 마운트** | 실패해 되돌아가면 이 문장도 함께 거둔다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:183` |
| 5 | 드래그 손잡이 | 표 셀(손잡이) | 열 이름은 공통 컴포넌트가 만든다 | 행을 끌어 순서를 바꾼다 | N | N | 저장 중 | — | — | — | **순서를 바꿀 수 있을 때만** 열이 통째로 생긴다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:160,204` | 조건은 §4.3 |
| 6 | 명칭 | 표 셀 | 열 머리 `명칭` — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:47` | 인증서·특허의 이름 | N | Y | — | — | — | — | 행마다 | — |
| 7 | 발급기관 | 표 셀 | 열 머리 `발급기관` | 발급한 곳 | N | Y | — | — | — | — | 행마다 | — |
| 8 | 발급일 | 표 셀 | 열 머리 `발급일` | `YYYY-MM-DD` | N | Y | — | — | — | — | 행마다 | **정렬에 관여하지 않는다** — 표시되는 열일 뿐이다 — `apps/admin/src/pages/company/certificates/types.ts:22-24` |
| 9 | 구분 | StatusBadge | 열 머리 `구분` | `인증서`(info) · `특허`(success) — `apps/admin/src/pages/company/certificates/types.ts:48-55` | N | Y | — | — | — | — | 행마다 | — |
| 10 | 순서 이동 버튼 | IconButton 둘 | 공통 컴포넌트가 명칭으로 이름을 만든다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:217-223` | 키보드로 한 칸씩 올리고 내린다 | N | N | 재정렬 저장 중 | — | — | — | 순서를 바꿀 수 있을 때만 | 드래그를 못 쓰는 사용자의 같은 경로다 |
| 11 | 행 수정(연필) | IconButton(행 액션) | 공통 `RowActions` 가 명칭으로 이름을 만든다 | 수정 폼으로 이동 | N | N | 그 행이 삭제 요청 중 | — | — | — | **수정 권한이 있을 때만** — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:229` | 권한을 콜백의 유무로 표현한다 |
| 12 | 행 삭제 | IconButton(행 액션) | 〃 | `DLG-COMMON-DELETE-ONE` 을 연다 | N | N | 〃 | — | — | — | **삭제 권한이 있을 때만** — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:230` | — |
| 13 | 빈 상태 | Empty | 필터가 걸렸으면 `필터에 맞는 인증서/특허가 없어요` / `필터를 바꾸거나 초기화해 보세요.` + `필터 초기화` · 아니면 `등록된 인증서/특허가 없어요` / `새로 추가하면 여기에 표시돼요.` — `packages/ui/src/molecules/Empty/Empty.tsx:78-93` | 0행일 때 | N | Y | — | — | — | — | 0행 | 필터 때문일 때만 복구 버튼이 붙는다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:181-186` |
| 14 | 표 설명 | caption(보조기술 전용) | `인증서/특허 목록 — 명칭 · 발급기관 · 발급일 · 구분 열로 이루어져 있어요.` + 권한이 있는 조작 + 순서를 바꿀 수 있으면 ` 각 행의 위/아래 버튼 또는 행 드래그로 정렬 순서를 바꿔요.` — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:141-144` | **캡션이 실제 표 구성과 권한을 따라간다** | N | Y | — | — | — | — | 항상 | 조작이 하나도 없으면 ` 조회 전용이에요.` 가 붙는다 — `:143` |
| 15 | 조회 실패 배너 | Alert(danger) + Button | `{엔티티} 목록을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:291-293` | — | N | Y | — | 숨김 | — | — | 조회 실패 | — |

**행 클릭으로 이동하지 않는다** — 재정렬 표에서는 행 제스처가 드래그에 점유된다. 끌다 만 동작이 클릭으로 읽히면 수정 화면으로 튕겨 나간다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:17-18`.

## 4. 기능 명세

### 4.1 목록 조회 · 4.2 구분 필터

연혁 목록의 §4.1 과 동작이 같다(전체를 한 번 받아 화면에서 좁힌다). 다른 것만 적는다.

| 항목 | 인증서/특허의 값 |
|---|---|
| 필터 축 | 구분 하나(전체·인증서·특허). **주소에 실리지 않는다** — 화면 상태다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:122` |
| 필터 변경 시 | **선택이 해제된다** — 보이지 않는 행이 선택된 채 남지 않게 한다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:139-142` |
| 정렬 | 저장된 순서 오름차순(같으면 id) — `apps/admin/src/pages/company/certificates/types.ts:83-92`. 발급일은 정렬에 쓰이지 않는다 |
| 새 항목의 자리 | **맨 끝**이다(현재 최대 순서 + 1) — 발급일과 무관하다 — `apps/admin/src/pages/company/certificates/types.ts:113-116` |
| 조회 실패 문구 | `{엔티티} 목록을 불러오지 못했어요.`(엔티티=`인증서/특허`) — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:291` |
| 알 수 없는 필터 값 | 전체로 접는다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:211` |

### 4.3 순서 바꾸기 — 드래그와 이동 버튼 (이 화면 고유)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 홈페이지에 보일 순서를 운영자가 직접 정한다 |
| 실행 조건 | **세 조건을 모두 만족해야 한다** — ① 수정 권한이 있고 ② 구분 필터가 `전체` 이고 ③ 보이는 항목이 2건 이상 — `apps/admin/src/pages/company/certificates/types.ts:127-145` |
| 사용자 동작 | 행을 끌어다 놓기 · 행의 위/아래 이동 버튼 |
| 시스템 처리 | **놓는 즉시 저장한다** — 별도 '순서 저장' 버튼이 없다. 앞선 요청이 있으면 중단하고 새 것을 보낸다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:166-168`. **화면과 저장이 같은 술어를 읽는다** — 버튼을 숨기기만 하고 저장 경로를 열어 두면 게이팅이 아니라 장식이다 — `apps/admin/src/pages/company/certificates/types.ts:124-125` · `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:161-164` |
| 데이터 처리 | 전체 순서가 1부터 다시 매겨진다. 목록에 없는 id 는 무시하고, 요청에 없는 항목은 자기 자리를 지킨다 — `apps/admin/src/pages/company/certificates/types.ts:99-111` |
| Validation | 위 세 조건이 검증이자 게이팅이다 |
| API 호출 여부 | Y — 순서 저장 1건 |
| 성공 처리 | 토스트 `MSG-COMPANY-CERTIFICATES-01`: `정렬 순서를 변경했어요.` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:178`. 낙관적으로 이미 옮겨진 행이 그대로 남고, **보조기술에는 옮긴 사실이 문장으로 읽힌다**: `'{명칭}'{조사} {전체}건 중 {위치}번째로 옮겼어요.` — `:171` · `apps/admin/src/pages/company/certificates/types.ts:162` |
| 실패 처리 | 옮겼던 행이 **원래 자리로 되돌아가고** 옮겼다는 낭독도 거둔다. 실패 토스트 `MSG-COMPANY-CERTIFICATES-E01`: `정렬 순서를 변경하지 못했어요.` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:184`. '다시 시도'가 붙어 **같은 순서로** 재시도한다 |
| 예외 처리 | 조건을 만족하지 않는데 저장 경로에 들어오면(권한 강등·필터를 건 뒤 남아 있던 드래그) **실패 토스트로 사유를 그대로 말한다** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:161-163`. 세 사유는 아래 표 |
| 화면 변경 사항 | 목록영역(행 순서) · 요약영역의 사유 문장 · 알림영역 ② |
| 후속 동작 | 목록 재조회 |
| 로그 기록 여부 | 확인하지 못했다 |

**순서를 바꿀 수 없는 세 사유** — 그대로 화면에 뜨는 문장이다.

| 조건 | 문장 | 출처 |
|---|---|---|
| 수정 권한 없음 | `인증서/특허 수정 권한이 없어 순서를 바꿀 수 없어요.` | `apps/admin/src/pages/company/certificates/types.ts:139` |
| 구분 필터가 걸려 있음 | `구분 필터를 걸면 걸러진 일부만 보여 전체 순서를 알 수 없어요. 필터를 전체로 되돌린 뒤 순서를 바꾸세요.` | `apps/admin/src/pages/company/certificates/types.ts:141` |
| 보이는 항목이 2건 미만 | `인증서/특허가 2건 이상일 때 순서를 바꿀 수 있어요.` | `apps/admin/src/pages/company/certificates/types.ts:143` |

**왜 문장인가** — 손잡이와 이동 버튼이 그냥 사라지면 운영자는 '이 화면은 순서를 못 바꾸는구나'와 '지금 조건에서만 못 바꾸는구나'를 구별할 수 없다 — `apps/admin/src/pages/company/certificates/types.ts:120-122`. 이 점이 FAQ·배너 목록과 다르다(그쪽은 조용히 사라진다).

**왜 '순서 저장' 버튼이 없는가** — 이 목록에는 폼도 저장 버튼도 없다. 저장 버튼을 두면 '저장 버튼이 있는 목록'과 '연필을 누르면 폼으로 떠나는데 그때마다 경고하는 이탈 가드'를 이 화면에만 새로 만들어야 한다. 즉시 저장이면 **미저장 변경이라는 상태 자체가 존재하지 않는다** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:13-23`.

### 4.4 단건 삭제 · 4.5 일괄 삭제 · 4.6 폼으로 이동

연혁 목록의 §4.3·4.4·4.5 와 **동작이 같다**(공통 층의 확인 다이얼로그와 토스트를 쓴다). 다른 것만 적는다.

| 자리 | 인증서/특허의 값 |
|---|---|
| 엔티티 이름 | `인증서/특허` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:57` |
| 항목 이름 | **명칭** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:108` |
| 단건 성공 토스트 | `MSG-COMMON-02` — `'{명칭}'을(를) 삭제했어요.` |
| 일괄 성공 토스트 | `MSG-COMMON-03` — `인증서/특허 {N}건을 삭제했어요.` |
| 등록 이동 | `/company/certificates/new` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:225` |
| 수정 이동 | **행의 연필만** — `/company/certificates/{id}/edit` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:269`. 행 클릭으로는 가지 않는다 |

## 5. 이벤트 정의

연혁 목록의 이벤트 표를 따르되 **행 클릭 이동이 없고** 아래가 더해진다.

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 구분 필터 변경 | 툴바 select | 화면에서 좁히고 **선택을 해제한다** | 필터영역 | 좁혀진 목록 |
| 행 드래그 시작·놓기 | 순서를 바꿀 수 있는 상태에서 행을 끎 | 새 순서를 만들어 즉시 저장 · 알림영역 ②에 옮긴 사실을 넣는다 | 목록영역 | 순서 변경 + 토스트 |
| 순서 이동 버튼 클릭 | 위/아래 버튼 | 한 칸 이동 후 즉시 저장 | 행 액션 | 〃 |
| 재정렬 저장 중 | 요청이 나간 뒤 | 드래그와 이동 버튼을 전부 잠근다 | 목록영역 | 잠긴 표 |
| 재정렬 거부 | 세 조건 중 하나라도 어긋난 채 저장 경로에 들어옴 | **실패 토스트로 사유를 말한다** | — | 토스트 |
| 조건이 어긋남 | 권한 강등 · 필터 적용 · 1건 이하 | 손잡이 열과 이동 버튼이 사라지고 **요약 옆에 사유 문장**이 뜬다 | 요약영역 · 목록영역 | 재정렬 불가 표 |
| 필터 초기화 클릭 | 필터 때문에 0행일 때의 빈 상태 버튼 | 구분을 전체로 되돌린다 | 빈 상태 | 목록 |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 구분 필터 값 | `all`·`certificate`·`patent` 중 하나 | select 변경 시 | 없음(조용히 접는다) | 알 수 없는 값은 `전체` 로 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:211` |
| 순서 변경 | §4.3 의 세 조건 | 드래그·이동 버튼을 그릴 때, 그리고 **저장 직전에 한 번 더** | §4.3 의 세 사유 문장 | 컨트롤을 감추고, 저장 경로에서는 실패 토스트로 거절한다 |

이 화면에는 입력 칸이 없다. 등록·수정의 검증은 [폼 문서](form.md) §6 이 갖는다.

## 7. 예외 처리

연혁 목록의 §7 과 같다. 문구와 이 화면 고유의 실패만 적는다.

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 필터 때문이면 `필터에 맞는 인증서/특허가 없어요` / `필터를 바꾸거나 초기화해 보세요.`, 아니면 `등록된 인증서/특허가 없어요` / `새로 추가하면 여기에 표시돼요.` — `packages/ui/src/molecules/Empty/Empty.tsx:78-93` | 표 자리에 빈 상태. 필터 때문일 때만 `필터 초기화` 버튼이 붙는다 | 필터 초기화 또는 등록 |
| 조회 결과를 모름 | 조회 전에는 건수를 0으로 그리지 않는다 — 요약이 `불러오는 중…` 이고 표는 스켈레톤이다. **재정렬 안내·사유도 그리지 않는다** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:244` | — | 기다린다 |
| 저장 실패 | 해당 없음 — 등록·수정은 폼 화면 | — | — |
| 수정 실패 | **순서 저장 실패**가 이 화면의 수정 실패다: `정렬 순서를 변경하지 못했어요.` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:184` | 옮겼던 행이 되돌아가고 낭독도 거둔다. 실패 토스트(자동으로 사라지지 않는다) + '다시 시도' | 토스트의 '다시 시도' |
| 순서 변경 거부 | §4.3 의 세 사유 중 하나 | 요약 옆에 문장으로 · 저장 경로에서는 실패 토스트로 | 사유가 말하는 것을 먼저 한다(필터를 전체로 되돌리기 등) |
| 삭제 실패 | `삭제하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/shared/crud/useCrudList.tsx:67`. 서버가 사유를 준 충돌이면 그 문장을 그대로 — `:66` | 다이얼로그를 닫지 않고 배너 | 확인 재클릭 |
| API 오류 | 조회면 `{엔티티} 목록을 불러오지 못했어요.` — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:291` | 배너 + '다시 시도' | 다시 시도 |
| 서버 오류 | 위와 같다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 | 〃 |
| 권한 없음 | 읽기 권한이 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. **수정 권한이 없으면 순서 변경이 막히고 그 사유가 문장으로 뜬다**(다른 화면과 달리 이 축은 말한다) | 화면이 직접 판정한다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:121,153-157` | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 | 앱이 로그인 화면으로 보낸다 | 재로그인 후 이 목록 |
| 데이터 충돌 | 다른 관리자가 먼저 지운 항목을 지우려 하면 `이미 삭제된 항목이에요.` — `apps/admin/src/shared/crud/crud.ts:164` | 그 문장이 다이얼로그 배너에 그대로 뜬다 | 목록을 다시 조회 |
| 중복 데이터 | 해당 없음 — 이 화면은 아무것도 만들지 않는다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 이 목록에 파일 입력이 없다(이미지는 폼에서 다룬다) | — | — |

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 요약이 `불러오는 중…` · 표는 스켈레톤 · **재정렬 안내를 그리지 않는다** · 라이브 영역은 침묵한다 | 등록 ○(권한자) | Y | `불러오는 중…` |
| 데이터 있음(순서 변경 가능) | 손잡이 열과 행마다 위/아래 버튼 | 등록 ○ · 이동 버튼 ○ · 행 액션 ○ | N | `행을 끌어 놓거나 각 행의 위/아래 버튼으로 순서를 바꿔요. 바꾸는 즉시 저장돼요.` |
| 데이터 있음(순서 변경 불가) | 손잡이 열과 이동 버튼이 사라진다 | 등록 ○ · 행 액션 ○ | N | §4.3 의 해당 사유 문장 |
| 데이터 없음(0건) | 빈 상태 안내. **재정렬 안내도 사유도 그리지 않는다** | 등록 ○ · (필터 때문이면) 필터 초기화 ○ | N | §7 의 빈 상태 문구 |
| 재조회 중(데이터 있음) | 표를 비우지 않고 요약에 ` · 새로고침 중…` 을 덧붙인다 | 그대로 | N | ` · 새로고침 중…` |
| 재정렬 저장 중 | 드래그·이동 버튼이 전부 잠긴다. 표는 낙관적으로 이미 옮겨져 있다 | 이동 버튼 × | N | 알림영역 ② `'{명칭}'{조사} {전체}건 중 {위치}번째로 옮겼어요.` |
| 재정렬 실패 | 행이 원래 자리로 되돌아가고 낭독도 거둔다 | — | N | `정렬 순서를 변경하지 못했어요.`(실패 토스트, 자동으로 사라지지 않음) |
| 조회 실패 | 요약·선택 바·표가 사라지고 배너만 남는다 | 다시 시도 ○ | N | `{엔티티} 목록을 불러오지 못했어요.` |
| 선택 있음 | 요약 뒤에 ` · {N}건 선택됨` · 선택 바가 나타난다 | 일괄 삭제 ○ | N | — |
| 삭제 중 | 그 행의 액션이 잠기고 다이얼로그 확인이 `처리 중…` | 확인 × · 취소 ○ | Y | 라벨이 곧 안내다 |
| 읽기 전용(권한) | 등록 버튼 · 선택 체크박스 · 연필 · 휴지통 · 선택 바 · **손잡이와 이동 버튼**이 사라지고, 표 설명이 ` 조회 전용이에요.` 로 바뀐다 | — | N | `인증서/특허 수정 권한이 없어 순서를 바꿀 수 없어요.` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `page:/company/certificates` 권한을 따른다 | 〃 | 〃 | 〃 | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

**순서 변경은 수정(`update`) 축이다** — `apps/admin/src/pages/company/certificates/types.ts:132-133`.

**권한이 없을 때 화면이 어떻게 되는가** — 읽기 권한이 없으면 `접근 권한이 없어요` 화면. **쓰기 권한이 없으면 그 컨트롤이 사라지고, 순서 축만은 사라진 이유를 문장으로 말한다.** 표 설명(caption)도 실제 가능한 조작만 읽으므로, 없는 버튼을 있다고 읽어 주지 않는다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:133-144`.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-CERTIFICATES` | `인증서/특허 등록` 클릭 | `SCR-COMPANY-CERTIFICATES-FORM`(등록) | N | 등록 권한 있음 | 없음 | 저장·취소 후 이 목록 |
| `SCR-COMPANY-CERTIFICATES` | 행 연필 클릭 | `SCR-COMPANY-CERTIFICATES-FORM`(수정) | N | 수정 권한 있음 | 항목 id | 〃 |
| `SCR-COMPANY-CERTIFICATES` | 행 삭제 클릭 | `DLG-COMMON-DELETE-ONE` | Y | 삭제 권한 있음 | 대상 1건의 id·명칭 | 이 목록 |
| `SCR-COMPANY-CERTIFICATES` | 일괄 삭제 클릭 | `DLG-COMMON-DELETE-BULK` | Y | 삭제 권한 있고 1건 이상 선택 | 선택 id 목록·건수 | 이 목록 |
| `SCR-COMPANY-CERTIFICATES` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 목록 |

**행 클릭으로 가는 화면이 없다**(드래그가 행 제스처를 점유한다). **이 화면이 여는 팝업(모달)도 없다.** 확인 다이얼로그 둘은 공통 층의 것이라 인벤토리의 화면 고유 51건에 들어 있지 않다.

**이 화면의 결과 통지 토스트는 3건**이다 — 성공 1(`정렬 순서를 변경했어요.`) · 실패 2(순서 저장 실패 · 순서 변경 거부 사유). 전부 §4.3 에 문구 그대로 적혀 있고, 인벤토리(성공 1 · 실패 2)와 일치한다. 공통 층의 삭제 토스트는 여기에 세지 않는다.
