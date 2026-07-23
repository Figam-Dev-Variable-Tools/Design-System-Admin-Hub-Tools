# 청구·입금 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | 청구·입금 |
| 화면 ID | `SCR-SALES-BILLING` · `SCR-SALES-BILLING-DETAIL` |
| 메뉴 경로 | 영업 관리 > 청구·입금 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [목록](../../FSD/sales/billing/index.md) · [상세](../../FSD/sales/billing/detail.md) |

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | **측정하지 않음** — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | 목록·상세 각각 요청 1건. 견적 상세가 이 자원의 저장소를 **동기로** 읽어 '청구 만들기' 버튼을 정한다 | 코드 확인 |
| 동시 사용자 | 공통 준수 | **측정하지 않음** | — |
| 대용량 데이터 처리 | 가상화 없이 대량 행을 그리지 않는다 | ⚠ **페이지네이션도 가상화도 없다.** 입금·안내 기록도 한 문서 안의 배열이고 **상한이 없다** — 나눠 받은 청구일수록 표가 길어진다 | 코드 확인 |
| ⚠ 요청 빈도 | 입력이 요청을 과도하게 만들지 않는다 | **개인결제창 링크와 비고는 글자를 칠 때마다 저장 요청을 만든다**(디바운스가 없다). 진행 중 요청은 다음 요청이 시작될 때 중단되어 마지막 한 번이 이긴다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:199,440-445,453` | 코드 확인 |
| 파생값 계산 | 상태를 저장하지 않는다 | 입금액·잔액·상태·완납일이 전부 기록에서 계산된다. 저장하면 '입금 3건은 있는데 상태는 미입금'인 순간이 생긴다 — `apps/admin/src/pages/sales/billing/types.ts:108-113` | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 목록은 읽기 전용 껍데기 + 좌측 필터 레일. 상세는 껍데기가 없어 카드 4장을 직접 배치한다 |
| 접근성 | 공통 준수 | **항상 마운트된 polite 라이브 영역**이 저장 결과를 읽힌다 — 이 자원은 토스트를 쓰지 않으므로 그것이 유일한 통지 채널이다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:342-345` |
| 입력 편의성 | 공통 준수 | 입금액은 숫자만 뽑아 읽는다 — `1,200,000원` 을 붙여 넣어도 값이 살아남는다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:143-147` |
| 사용자 피드백 | 공통 준수 | **이 자원에는 토스트가 하나도 없다**([인벤토리](../../FSD/inventory.md) §9.3 에 없다). 결과는 ① 화면 갱신 ② 라이브 영역 문장으로 알린다 |
| 되돌릴 수 없음을 미리 말한다 | 파괴적 사실을 사후에 알리지 않는다 | 입금확인 카드의 설명이 **기록 전에** `기록한 입금은 되돌릴 수 없어요.` 를 굵게 말한다. 목록의 좌측 안내도 같은 문장을 미리 띄운다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:465-467` · `apps/admin/src/pages/sales/billing/BillingListPage.tsx:218-220` |
| 침묵하지 않기 | 막힌 버튼은 이유를 말한다 | 거절 사유가 버튼 옆 warning 으로 온다. **단 입금액을 아직 입력하지 않았으면 띄우지 않는다** — 빈 폼 앞에서 '0보다 커야 해요'를 읽게 하지 않는다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:516` |
| 권한 예고 | 상세에 들어가서야 알게 하지 않는다 | 목록의 좌측 안내가 `입금확인 권한이 없어 조회만 가능해요.` 를 미리 띄운다 |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 인증 | 공통 준수 | — |
| 권한 | 공통 준수 | 리소스 키는 `sales-billing`. 입금·안내 기록과 청구 방식 변경이 전부 `update` 하나로 게이팅된다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:161`. **`create`·`remove` 는 아무것도 열지 않는다**(생성은 견적 상세, 삭제는 없다) |
| 플랜(엔타이틀먼트) | 공통 준수(fail-open) | `sales.pipeline` 모듈. **견적이 잠기는데 그 파생물이 안 잠기면 잠금이 반쪽이 되므로** 일부러 같은 키에 넣었다 — `apps/admin/src/shared/entitlements/module-resources.ts:59-61` |
| 개인정보 마스킹 | 필드 이름으로 적는다 | **마스킹 규칙이 없다.** `payment.memo`(입금자명)는 실명이 들어가는 칸이고 평문으로 그려진다. `paymentLinkUrl` 은 결제 링크로 토큰이 실릴 수 있으나 화면에 그대로 보인다 |
| 결제 정보 취급 | 앱이 결제를 처리하지 않는다 | **카드번호·계좌번호를 받는 칸이 없다.** 개인결제창은 링크를 **보관만** 하고 결제 상태를 조회하지 않는다 — `apps/admin/src/pages/sales/billing/types.ts:75-81` |
| 입력값 검증 | 공통 준수 | 술어가 정본이다(`recordPaymentBlock` · `sendNoticeBlock`). **버튼의 비활성과 저장의 거절이 같은 술어를 읽는다.** ⚠ 결제 링크는 형식을 검증하지 않는다 |
| 중복 제출 | 금액·생성·발송에서 두 번째 요청을 만들지 않는다 | 저장 중에는 입력과 버튼이 잠긴다. 다만 **멱등키 기반 보호는 공통 폼 컨트롤러의 것이고 이 화면은 그 컨트롤러를 쓰지 않는다**(저수준 갱신 훅을 직접 쓴다) |
| HTTPS | 공통 준수 | **측정하지 않음** |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 예외 처리 | 공통 준수 | 조회 실패를 없음과 오류로 가른다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:242-265` |
| ⚠ 원장 소실 가드 | **이 자원만의 동시성 보호다** | 이 화면의 저장은 문서 한 벌을 통째로 보낸다. 두 운영자가 같은 청구를 열어 두면 뒤에 저장한 쪽이 앞서 기록된 입금을 **흔적 없이 지울 수 있었다**(성공 토스트까지 뜬 채로). 저장소가 '들어온 원장이 저장된 원장에 덧붙이기만 한 것인가'를 보고 아니면 **409 로 거절한다** — `apps/admin/src/pages/sales/billing/types.ts:192-249` · `apps/admin/src/pages/sales/billing/data-source.ts:127-142` |
| 왜 revision 이 아닌가 | 좁고 정확한 판정을 고른다 | revision 낙관적 잠금은 **모든 동시 편집**을 충돌로 본다(비고 수정과 입금 기록을 구분하지 않는다). 여기서 되돌릴 수 없는 것은 문서가 아니라 원장이고, 원장은 덧붙이기만 하므로 앞부분 일치만 보면 된다 — 이 판정이 더 좁고(실제로 사라질 때만 거절) 더 정확하다(기록 순서가 어긋나도 잡는다) — `apps/admin/src/pages/sales/billing/types.ts:204-210` |
| 짝이 되는 disabled 가 없다 | 미리 잠글 수 없는 판정은 실패 표면으로 받는다 | 이 가드의 근거는 **화면이 볼 수 없는 사실**(내가 읽은 뒤 서버에서 벌어진 일)이라 버튼을 미리 잠글 수 없다. 짝은 충돌 다이얼로그다 — `apps/admin/src/pages/sales/billing/types.ts:212-214` |
| 덮어쓰기 선택지 없음 | 회계 기록에는 그 문을 열지 않는다 | 시스템 설정의 3-액션 충돌 다이얼로그에는 '덮어쓰기'가 있지만 여기서 덮어쓴다는 것은 **남의 입금 기록을 지운다**는 뜻이다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:216-221` |
| 입력 보존 | 실패한 저장이 입력을 지우지 않는다 | 입력칸은 **저장에 성공한 뒤에만** 비운다 — 409 로 되돌아왔을 때 방금 친 금액·메모가 사라져 있으면 충돌 다이얼로그가 '입력을 버리지 않는다'고 말하는 동안 입력은 이미 없어진 상태가 된다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:191-193` |
| 되돌리는 전이 없음 | 원장은 지우는 것이 아니라 덧붙이는 것이다 | 입금 기록에 수정·삭제가 없고 화면 전체에 삭제가 없다. 감액 기록(반대 부호)도 아직 열지 않았다 — **되돌리는 문을 미리 열면 그것이 곧 '입금 취소' 버튼이 된다** — `apps/admin/src/pages/sales/billing/types.ts:50-56` |
| 초과 입금 차단 | 잔액이 음수가 되지 않는다 | 청구액보다 많이 받았다면 그것은 **과오납 처리**라는 다른 업무다 — `apps/admin/src/pages/sales/billing/types.ts:174-178` |
| 로그 기록 | 공통 준수 | **확인하지 못했다** — 다만 입금·안내 기록 자체가 이 자원 안의 감사 흔적이다(append-only) |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | **리포에 정의되어 있지 않다** |
| 모바일 지원 | 공통 준수 | **측정하지 않음** — 상세의 2단은 `auto-fit minmax` 라 좁은 화면에서 접힌다 |
| 해상도 | 넓은 표는 최소 폭과 가로 스크롤 방식을 갖는다 | **목록이 10열로 이 묶음에서 가장 넓다.** 상세의 입금·안내 표는 각각 `overflow-x: auto` 컨테이너에 담겨 있다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:141` |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | **확인하지 못했다**(§4) |
| 모니터링 | 공통 준수 | **없다** |
| 배포 영향 | 이 자원을 고치면 어느 화면이 함께 영향을 받는가 | 견적 상세의 '청구 만들기' 버튼이 이 저장소의 `findBillingIdByQuote` 와 `billingCreateBlock` 을 읽는다. 반대로 **견적의 `ordered` 상태가 이 자원의 생성 조건**이다 |
| 설정 관리 | 이 자원의 동작을 바꾸는 설정값이 어디 있는가 | 없다. ⚠ **결제(PG) 설정과도 무관하다** — 이 자원은 PG 를 쓰지 않는 운영을 전제로 만들어졌고, 결제 설정을 켜도 이 화면의 동작은 바뀌지 않는다 |
| 채번 | 청구번호를 사람이 정하지 않는다 | `BL-YYYYMMDD-NNN` 을 저장소가 부여한다 — `apps/admin/src/pages/sales/billing/types.ts:424-428` |
| 기준일 | 화면이 실제 시계를 읽지 않는다 | 입금일 기본값이 **고정 문자열 `2026-07-21`** 이다 — 스토리·회귀 비교가 매일 깨지지 않게 한 값이다. ⚠ 그래서 오늘 들어온 입금을 기록하려면 운영자가 날짜를 손으로 고쳐야 한다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:79-80` |
| 백엔드 없음의 이음매 | 서버가 맡을 일이 코드에 표시되어 있다 | `TODO(backend): 서버에서는 PUT /api/sales/billing/:id 가 원장을 아예 받지 않고 POST /api/sales/billing/:id/payments 가 append 를 전담하는 것이 정본이다. 그때 이 가드는 그 엔드포인트 분리로 대체된다` — `apps/admin/src/pages/sales/billing/data-source.ts:136-139` |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | 공통 준수 | 청구 방식·안내 창구가 옵션 배열이다. 전이 판정은 순수 술어 셋(`billingCreateBlock` · `recordPaymentBlock` · `sendNoticeBlock`) |
| 선택지를 좁게 유지 | 앱이 못 하는 일을 선택지에 두지 않는다 | 청구 방식이 둘뿐인 것은 이 운영에 실제로 둘밖에 없기 때문이다. **'카드결제'를 넣지 않는 이유도 같다** — 앱이 카드를 받지 않는데 선택지에 있으면 운영자가 고르고, 고른 뒤에 할 일이 없다 — `apps/admin/src/pages/sales/billing/types.ts:27-33` |
| 화면 확장성 | 열·필터·상태값이 늘 때 견디는가 | 조회 조건은 주소가 소유한다. 상태는 파생값이라 칸을 늘리려면 `billingPaymentState` 하나만 고친다 |
| 공통 컴포넌트 사용 여부 | 페이지가 UI 를 손수 조립하지 않는다 | 상세가 입금·안내 표를 **직접 조립한다**(디자인 시스템 Table 이 아니라 공유 표 스타일 상수를 쓴다) — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:534-578` |
| 저장 경로의 단일화 | 같은 일을 여러 배선으로 하지 않는다 | 입금·안내·설정 변경이 전부 **`commit` 하나**를 지난다 — 세 동작이 각자 mutate 를 배선하면 성공/실패 처리와 중단 정리가 셋으로 갈라진다 — `apps/admin/src/pages/sales/billing/BillingDetailPage.tsx:187-194` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | **없다.** 앱이 결제를 처리하지 않고 메시지도 보내지 않는다 — 개인결제창은 링크를 보관만 하고, 청구 안내는 '보낸 사실'만 기록한다 |
| API 제약 | **백엔드가 없다.** 서버 계약: `GET /api/sales/billing` · `GET/PUT /api/sales/billing/:id` · `POST /api/sales/billing/:id/payments` · `POST /api/sales/billing/:id/notices` — `apps/admin/src/pages/sales/billing/data-source.ts:183-185` |
| 생성 경로 | **이 자원 안에 없다.** 청구는 `ordered`(수주) 견적에서만 생기고 그 문은 견적 상세다 |
| 삭제 | **없다.** 청구는 회계 기록이다 |
| 입금 기록 수정·삭제 | **없다.** 감액 기록(반대 부호)도 아직 열지 않았다 |
| 초과 입금 | **막는다.** 잔액을 넘는 입금은 기록되지 않는다 |
| 문자 수 상한 | 비고 300자 · 입금/안내 메모 60자 — `apps/admin/src/pages/sales/billing/types.ts:93-94` |
| 청구액 | 견적 합계의 **스냅숏**이다. 견적을 나중에 고쳐도 이미 청구한 금액은 움직이지 않는다 — `apps/admin/src/pages/sales/billing/types.ts:82,430-437` |
| 동시성 보호 범위 | **이 앱에서 유일하게 원장 소실 가드가 있는 자원이다.** `version`/`updatedAt`/`If-Match` 는 어디에도 없고 나머지 화면은 전부 last-write-wins 다 — `apps/admin/src/pages/sales/billing/types.ts:216-218` |
| 파일 업로드 | 해당 없음 — 이 자원에 파일 입력이 없다(입금 증빙 첨부가 없다) |
