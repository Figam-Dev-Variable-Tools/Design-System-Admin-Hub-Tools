# 어드민 플로우 차트

App.tsx 의 `APP_ROUTES`, nav-config.ts 의 사이드바 정의, 각 도메인 `types.ts` 의 상태값·전이 규칙을
원천으로 그린 것이다. 다이어그램 본문은 [mmd/](mmd/) 아래에 **펜스 없는 `.mmd` 파일**로 따로 둔다.

## mermaid.live 에서 여는 법

1. https://mermaid.live/edit 를 연다
2. 아래 파일 **하나**를 열어 내용을 전부 복사한다
3. 에디터 좌측 패널의 기존 내용을 **지우고** 붙여넣는다

> `.mmd` 파일을 쓰는 이유가 이것이다. 마크다운의 ` ```mermaid ` 펜스나 `## 제목` 까지 함께 붙여넣으면
> mermaid.live 는 `UnknownDiagramError: No diagram type detected` 를 낸다 — 첫 줄이 `flowchart` 여야 한다.
> `.mmd` 파일은 통째로 복사해도 그 조건이 깨지지 않는다. `%%` 로 시작하는 첫 줄은 주석이라 무해하다.

### 붙여넣었는데 화면이 비어 있고 에러도 안 뜬다면

파싱·렌더가 다 되는데 안 보이는 것이라면 **도형이 미리보기 밖에 있는 것**이다. 이 다이어그램들은
가로 1200~2500px 라 미리보기 창보다 크다. 마우스 휠로 축소하거나 드래그해서 이동하면 나온다
(mermaid.live 는 자동으로 맞춰 주지 않는다).

그게 번거로우면 [html/index.html](html/index.html) 을 브라우저로 열면 된다 — 휠 확대·드래그 이동이 되고 mermaid.live 가 필요 없다.
서브그래프를 쓰는 06·08 은 `~~~` 보이지 않는 링크로 세로로 쌓아 뒀다. 이 줄을 지우면 서브그래프가
옆으로 늘어서 폭이 5000px 를 넘고, 그때부터 "빈 화면"으로 보이기 시작한다.

## 메뉴별 플로우 (전수 71장)

사이드바 메뉴 하나하나의 상세 플로우는 [menus.md](menus.md) 에 표로 있다.
아래 12장은 그 위를 덮는 **횡단 다이어그램**이다 — 전체 흐름과 도메인별 워크플로.

## 다이어그램

| # | 파일 | 내용 |
|---|------|------|
| 00 | [00-master-flow.mmd](mmd/00-master-flow.mmd) | **전체 플로우 한 장** — 진입·인증·셸 → 업무 10갈래 → 쓰기 공통 처리 → 로그 기록 → 복귀 |
| 01 | [01-auth-shell.mmd](mmd/01-auth-shell.mmd) | 진입·인증·권한·lazy·예외 경계 상세 (EXC-01/02/03) |
| 02 | [02-crud-common.mmd](mmd/02-crud-common.mmd) | 목록 → 상세 → 폼 공통 CRUD (조회 4상태 · 검증 · 무효화 · 삭제 확인) |
| 03 | [03-sales-pipeline.mmd](mmd/03-sales-pipeline.mmd) | 영업 — 문의(3창구) → 견적 바구니 → 견적 → 수주 → **계약 · 청구·입금** · 프로젝트, 상담 이력 |
| 04 | [04-support-ticket.mmd](mmd/04-support-ticket.mmd) | 고객센터 1:1 문의 티켓 — 전이표 · 담당자 게이트 · SLA |
| 05 | [05-returns-reviews.mmd](mmd/05-returns-reviews.mmd) | 교환·반품 처리(재고 이동 게이트) · 리뷰 노출 관리 |
| 06 | [06-content-publish.mmd](mmd/06-content-publish.mmd) | 콘텐츠 발행 — 공지 · 팝업/배너 · 약관/개인정보 버전 |
| 07 | [07-marketing-send.mmd](mmd/07-marketing-send.mmd) | 캠페인 발송 · 발송 템플릿 발행 · 알림톡 심사 |
| 08 | [08-users-permissions.mmd](mmd/08-users-permissions.mmd) | 회원 · 운영자 · 권한 역할 |
| 09 | [09-ia-tree.mmd](mmd/09-ia-tree.mmd) | IA 트리 — 루트 → 그룹 5 → 메뉴 15 → 잎 71 (플로우가 아닌 참고용) |
| 09a | [09a-ia-tree-overview.mmd](mmd/09a-ia-tree-overview.mmd) | IA 트리 · 상위 구조 한 화면 (그룹 5 · 메뉴 15 와 각 잎 수) |
| 09b | [09b-ia-tree-sections.mmd](mmd/09b-ia-tree-sections.mmd) | IA 트리 · 메뉴별 피라미드 (메뉴 15 × 그 잎들) |

> **05 는 이제 `/orders/claims` 를 그린다.** 교환·반품이 상품 관리에서 주문 관리로 옮겨 가며 취소가
> 축으로 들어왔고, 환불이 별개 축이 됐다. 05 의 노드 이름은 아직 옛 `/products/returns` 어휘를 쓴다 —
> 갱신 대상이며 그때까지는 [mmd/menus/orders-claims.mmd](mmd/menus/orders-claims.mmd) 가 정본이다.

## 이 차트가 담고 있는 규칙 (코드에서 읽어 온 것)

플로우의 화살표보다 **막힌 곳**이 중요하다. 아래는 다이어그램에 게이트로 그려 넣은 실제 제약이다.

- **티켓** `STATUS_FLOW` 전이표가 있다. 처리중·답변완료는 담당자가 없으면 불가(`statusRequiresAssignee`),
  종결은 종착이라 나가는 전이가 없다.
- **문의** 견적은 한 번만 발행된다(`hasIssuedQuote` — 멱등키는 문의의 `quoteId`). 발행 게이트는
  `quoteIssueBlock` 하나이고, 견적 저장소가 `findQuoteBySource` 로 **한 번 더 교차 확인**한다(이중 방어).
  견적은 문의에서 상속한 필드가 잠긴다(`isInherited` = `sources.length > 0`).
- **견적** 원본 문의는 스칼라가 아니라 **`sources: QuoteSource[]`** 다 — 여러 문의를 한 견적으로 합친다
  (견적 바구니). 창구는 `QuoteSourceChannel` 3종(`sales`·`product`·`program`).
  수주 전환은 `accepted` 에서만 가능하다(`canConvertToOrder`). 반려·만료는 전환할 수 없다.
- **계약** 초안은 견적 상세에서만 열리고(`/sales/contracts/new?quoteId=`), `ordered` 견적 + 미생성일 때만
  가능하다(`contractDraftBlock`). `Contract.quoteId` 가 그 링크를 든다 — 03 의 견적→계약 화살표가 코드에 있다.
- **청구·입금** `ordered` 견적에서만 생성된다(`billingCreateBlock`, 멱등키 `quoteId`).
  입금 상태는 **저장하지 않고 누적 합에서 파생한다**(`billingPaymentState`). 되돌리는 전이가 없다 —
  `recordPaymentBlock` 이 `amount <= 0` 를 거절해 감액 엔트리 자체가 만들어지지 않는다.
- **프로젝트** 단계마다 확률이 자동으로 채워지고(`defaultProbability`), 실주는 파이프라인 밖이다(`inFlow:false`).
- **주문** 등록 폼이 없다 — 주문은 고객의 결제가 만든다. 상태 7단은 되돌아가지 않으며 전이 가드
  `orderTransitionBlock(order, to)` 는 **거절 사유 문자열**을 돌려주고, 버튼 렌더와 저장 거절이 같은
  술어를 읽는다. 취소는 상태가 아니라 별도 축(`canceledAt`)이고 배송이 시작되면 막힌다(`orderCancelBlock`).
  재고 차감 시점은 설정값(`StockDeductAt = 'order' | 'payment'`)이고 멱등키는 `stockAppliedAt`/`stockRestoredAt` 다.
- **배송 처리** 송장번호는 숫자·하이픈만이고(`invoiceNoBlock`) **같은 택배사 안에서만** 중복이 금지된다
  (`duplicateInvoiceBlock`). 부분 발송은 `allocateCovered` 한 함수가 소유하고 주문의 `shippedQuantity` 는
  그 계산의 결과다 — 화면이 따로 세지 않는다.
- **클레임(취소/교환/반품)** 종류마다 흐름이 다르다(`claimFlow` — 취소는 2단). 철회가 유일한 역방향 전이이며
  재고가 반영됐거나 환불이 접수되면 막힌다. **환불은 별개 축**(`refund.status`)이고 적립금 복원은
  `completed` 로 들어가는 순간에만, `refund.completedAt` 을 멱등키로 한 번만 일어난다.
  **취소 클레임은 재고를 움직이지 않는다**(`movesStock` 이 `kind !== 'cancel'` 를 요구한다) — 재고 복원은
  주문이 소유하므로 둘 다 하면 같은 수량이 두 번 돌아온다. 교환·반품 재고는 완료에서만, 한 번만 움직인다
  (`validateStockPlan` 통과 필요).
- **캠페인** 발송완료는 수정 불가다 — 수신자가 받은 것과 화면이 달라지고 오픈율 귀속이 깨지기 때문이다.
  예약 취소는 `scheduled` 에서만 된다.
- **발송 템플릿** 발행은 `draft → active` 만, 토글은 `active ↔ inactive` 만. `active` 는 수정 액션이 없다 —
  지금 발송에 쓰이는 문구라 먼저 꺼야 한다.
- **알림톡** 발행 상태와 심사 상태는 **별개 축**이다. 한 번이라도 발송되면 콘텐츠가 영구 잠긴다 —
  승인을 취소해도 풀리지 않고 복제 후 재심사뿐이다.
- **팝업·배너** `enabled` 를 끄면 노출 기간 안이라도 노출되지 않는다.
- **권한** 시스템 역할(`role-super-admin`)은 편집·삭제 불가. 적용 중인 역할을 지우면 남은 첫 역할이 대신 적용된다.
- **엔타이틀먼트(플랜)** 권한 **옆에** 두 번째 판정 축이 있다. 판정 순서는 인증 → **플랜** → 권한 → 설정이고
  그 순서는 `AppShell` 의 JSX 중첩이 그대로 표현한다(`RequireEntitlement` 가 `RequirePermission` **바깥**).
  결과는 3상태(`granted | locked | absent`)이며 **실패 방향이 권한과 정반대다** — 엔타이틀먼트는 fail-open,
  권한은 fail-closed. 근거는 [ADR-0013](../adr/0013-entitlement-layer.md).
- **PG 스위치** 두 축이다 — 사이트 전역 `pgSellable`(fail-closed)과 상품별 `priceDisplay`. 전역이 개별을 이긴다.
  잠금은 **입력만** 막고 저장된 값은 보존된다. 근거는 [ADR-0014](../adr/0014-pg-switch-screen-impact.md).
- **로그·통계** 쓰기 라우트가 존재하지 않는다. 감사 기록은 불변이다.
  다만 결제가 꺼져 있으면 매출·주문 통계는 0 을 그리지 않고 문의 지표로 **치환된다**(`InquiryStatsPanel`).

## 검증

12개 파일 전부 mermaid 11.16(= mermaid.live 와 같은 엔진)으로 **파싱 + 실제 SVG 렌더**까지 확인했다.
결과물은 [html/](html/) 의 페이지로 들어 있다 — `.mmd` 원본을 페이지에 심고 브라우저가 그린다.
mermaid 번들은 `html/_assets/` 에 한 벌만 두고 상대 경로로 부른다(3.4MB 를 83벌 복제하지 않기 위해서다).
네트워크 의존은 0건이다.
다이어그램을 고치면 아래로 다시 뽑는다.

> **렌더는 이제 생성기가 돈다.** `pnpm flow:render` 가 `.mmd` 83장을 `html/` 로 뽑고,
> `pnpm flow:check` 가 누락·낡음·고아를 잡아 exit 1 로 떨어진다(`nav:check` 와 같은 결).
> 한동안 이 자리에는 "생성기가 등록돼 있지 않아 HTML 이 표류한다" 는 경고가 있었다 — 그것이
> 이 표류의 원인이었고, 생성기를 등록하면서 사라졌다. **정본은 여전히 `.mmd`** 다.
```sh
npx -p @mermaid-js/mermaid-cli mmdc -i docs/flow/mmd/00-master-flow.mmd -o /tmp/00.svg
```

렌더 크기(폭 × 높이, px) — mermaid.live 에서 안 보이면 이 값을 먼저 의심한다. HTML 로 열면 '전체 보기'가 맞춰 준다.

| 파일 | 크기 |
|---|---|
| 00-master-flow | 2467 × 3492 |
| 01-auth-shell | 1212 × 2168 |
| 02-crud-common | 1480 × 2229 |
| 03-sales-pipeline | 1760 × 2967 |
| 04-support-ticket | 1707 × 1572 |
| 05-returns-reviews | 1178 × 1504 |
| 06-content-publish | 2209 × 1062 |
| 07-marketing-send | 2056 × 1939 |
| 08-users-permissions | 2250 × 2034 |
| 09-ia-tree | 미측정 (그룹 층 추가 후 재렌더 필요) |
| 09a-ia-tree-overview | 미측정 |
| 09b-ia-tree-sections | 미측정 |

`03-sales-pipeline` 도 청구·입금 갈래가 붙어 위 값보다 커졌다 — 재렌더 후 갱신한다.

## 원천

- 라우트: [App.tsx](../../apps/admin/src/App.tsx) 의 `APP_ROUTES`
- 사이드바: [nav-config.ts](../../apps/admin/src/shared/layout/nav-config.ts)
- 상태·전이: 각 도메인 `types.ts` — 예외 셋:
  [support/_shared/domain.ts](../../apps/admin/src/pages/support/_shared/domain.ts) + `tickets/process.ts`(티켓),
  [shared/domain/order.ts](../../apps/admin/src/shared/domain/order.ts) · [shared/domain/shipment.ts](../../apps/admin/src/shared/domain/shipment.ts)(주문·배송 — 여러 화면이 공유해 도메인 층으로 올라갔다),
  [shared/domain/inquiry-status.ts](../../apps/admin/src/shared/domain/inquiry-status.ts) + [shared/domain/quote-issue.ts](../../apps/admin/src/shared/domain/quote-issue.ts)(문의 어휘·견적 발행 게이트)
- 판정 축: [shared/permissions/](../../apps/admin/src/shared/permissions/) (권한) · [shared/entitlements/plan.ts](../../apps/admin/src/shared/entitlements/plan.ts) (플랜) · [shared/commerce/](../../apps/admin/src/shared/commerce/) (PG 설정)

화면을 하나 완성하면 `APP_ROUTES` 에 한 줄을 추가하고, 09 사이트맵에 리프를, 상태가 있는 도메인이면
해당 워크플로 다이어그램에 노드를 더한다.
