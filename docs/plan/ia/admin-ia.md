# 어드민 정보 구조 (IA)

이 문서는 **무엇이 어디에 있는가**를 정한다 — 섹션 계층, 라우트, URL 규약, 화면 유형, 판정 축.
**어떻게 생겨야 하는가**(제목 모델·목록 템플릿·폼 전달 방식·URL 상태)는 여기서 다시 쓰지 않는다.
그 규칙은 [specs/quality-bar.md](../../../specs/quality-bar.md) 의 `IA-01 ~ IA-14` 가 단일 원천이다.

| | |
|---|---|
| 라우트 단일 원천 | [App.tsx](../../../apps/admin/src/App.tsx) `APP_ROUTES` |
| 사이드바 단일 원천 | [nav-config.ts](../../../apps/admin/src/shared/layout/nav-config.ts) `NAV_SECTIONS` |
| 권한 해석 | [shared/permissions/route-resource.ts](../../../apps/admin/src/shared/permissions/route-resource.ts) |
| 플랜(엔타이틀먼트) 해석 | [shared/entitlements/module-resources.ts](../../../apps/admin/src/shared/entitlements/module-resources.ts) · [route-entitlement.ts](../../../apps/admin/src/shared/entitlements/route-entitlement.ts) |
| 조건부 메뉴(PG) 해석 | [shared/commerce/inquiry-backlog.ts](../../../apps/admin/src/shared/commerce/inquiry-backlog.ts) `inquiryMenuState` |
| 잎 목록 생성물 | `tools/figma-plugin/generated/tds-pages.json` (81건) — `pnpm nav:check` 가 대조한다 |
| 플로우 차트 | [docs/flow/](../../flow/admin-flowchart.md) |

---

## 1. 계층 — 그룹 · 메뉴 · 잎

```
AppShell
└── 그룹 (5)           NavSection.title — 사이드바의 구분 제목. 클릭 대상이 아니다.
    └── 메뉴 (15)      NavEntry — 가지(14) 또는 잎(1: 대시보드). 가지는 자기 라우트가 없다.
        └── 잎 (81)    사이드바 리프. 라우트를 갖는다. = 권한 단위.
            └── 하위 라우트  상세 /:id · 등록 /new · 수정 /:id/edit. 사이드바에 없다.
```

그룹 5개: **일반 관리**(잎 27) · **비즈니스**(34) · **AI**(2) · **분석 · 운영**(10) · **시스템**(8).

메뉴 15개는 그대로이고 **잎만 10개 늘었다**(2026-07-22 · 커밋 `31ae647`) — 콘텐츠 관리 +5,
사용자 관리 +1, 기업 관리 +1, 시스템 설정 +3. 가지를 늘리지 않은 것이 판단이다: 홈페이지
콘텐츠(페이지·메뉴·뉴스·폼·미디어)는 이미 있는 '콘텐츠 관리' 가 덮는 범위이고, 새 가지를 만들면
운영자가 '공지사항은 어느 쪽이었지' 를 매번 고르게 된다.

**가지 안에 가지를 넣지 않는다.** 이건 권고가 아니라 타입이 막는다 — `NavBranch.children` 이
`readonly NavLeaf[]` 다. 사이드바가 세 번 접히면 운영자가 메뉴를 눈이 아니라 기억으로 찾게 된다.
분류가 더 필요하면 가지를 늘리지 말고 그 메뉴 안의 탭이나 필터로 내린다.

**하위 라우트는 사이드바에 올리지 않는다.** 사이드바 잎 = 권한 단위 = `IMPLEMENTED` 집합의 원소다.
상세·폼을 잎으로 만들면 권한이 세 벌로 갈라진다. 대신 `findCoveringLeaf` 가 하위 라우트를 자기 잎으로
되돌려, 상세와 목록이 **같은 권한 한 벌**로 덮인다. `/products/coupons/issuance`(쿠폰 발급 현황)가
그 규약의 최근 사례다 — 라우트는 있고 잎은 없으며, 권한·제목이 `/products/coupons` 에서 온다.

---

## 2. URL 규약

### 2.1 경로

| 목적 | 형태 | 예 |
|---|---|---|
| 목록 | `/{섹션}/{메뉴}` | `/content/notices` |
| 상세 | `/{섹션}/{메뉴}/:id` | `/content/notices/42` |
| 등록 | `/{섹션}/{메뉴}/new` | `/content/notices/new` |
| 수정 | `/{섹션}/{메뉴}/:id/edit` | `/content/notices/42/edit` |

- 등록과 수정은 **한 컴포넌트**가 `:id` 유무로 겸한다 (IA-05). create 전용 화면을 따로 만들지 않는다.
- `new` 는 선언에서 `:id` **위에** 둔다. react-router 는 정적 세그먼트를 먼저 고르므로 순서와 무관하게
  동작하지만, 읽는 사람에게는 순서가 곧 규칙으로 보인다. 아래에 두면 누군가 고치려 든다.
  같은 이유로 `/orders/shipments`·`/orders/claims` 는 `/orders/:id` **위에** 선언한다.
- 예외 셋 — **섹션이 곧 메뉴**인 경우: `/products`(상품) · `/programs`(프로그램) · `/orders`(주문).
  가지의 `basePath` 와 첫 잎의 `to` 가 같은 문자열이다. 사이드바 라벨도 각각 '상품'·'프로그램'·'주문'이다.

### 2.2 쿼리스트링 — 화면 상태의 단일 원천 (IA-13, P0)

**라우트는 "무엇을 보는가"이고 쿼리스트링은 "어떻게 보는가"다.** 조회 조건을 컴포넌트 `useState` 에 두면
상세를 열었다 Back 했을 때 필터가 사라진다. 그래서 아래는 전부 URL 에 실린다.

| 화면군 | URL 파라미터 | 소유 |
|---|---|---|
| 목록 전반 | `page` · `size` · `q` · `sort` · 화면별 필터 | `shared/crud/useListState` |
| 통계 6종 | `preset` · `start` · `end` · `compare` · `segment` · `view` · `metric` · `sort` · `page` | `pages/stats/_shared/useStatsParams` |
| 로그 4종 | 기간 · 종류 · 검색어 | `pages/logs/list-state.ts` |
| AI 대화 | `?c=<대화id>` | 대화는 **라우트가 아니다** — 같은 화면의 상태다 |

기본값과 같은 값은 URL 에서 지운다 — 공유 링크가 짧아야 실제로 공유된다.

**쿼리로 넘기는 것이 라우트로 가르는 것보다 나은 두 자리**가 있다.
발송 템플릿의 등록은 종류를 `?kind=text|email|alimtalk` 로 받고, 계약 등록은 원본 견적을
`?quoteId=` 로 받는다(`/sales/contracts/new?quoteId=…`). 라우트를 갈랐다면 수정 경로도 함께 갈라야 한다.

### 2.3 옛 경로

| 옛 경로 | 지금 | 처리 |
|---|---|---|
| `/marketing/message-templates` (+ 하위) | `/marketing/templates` | `Navigate replace` |
| `/marketing/templates/alimtalk` (+ 하위) | `/marketing/templates` | `Navigate replace` — 알림톡 전용 화면이 없어졌다. 종류는 `?kind=` 로 고른다 |
| `/products/returns` (+ `/:id`) | `/orders/claims` | **리다이렉트가 없다.** 전역 `*` 캐치올이 `/dashboard` 로 보낸다 — 저장해 둔 북마크가 조용히 대시보드에 도착한다 |

마지막 행은 **미결이다**. 옛 두 경로는 리다이렉트를 남겼는데 교환/반품만 남기지 않았다.

---

## 3. 화면 유형 — 7종

모든 메뉴가 목록+상세+폼인 것은 아니다. **유형이 라우트 모양을 결정한다.**

| 유형 | 라우트 | 쓰기 | 해당 메뉴 |
|---|---|---|---|
| **A. 표준 CRUD** | 목록 + `:id` + `new` + `:id/edit` | 폼 페이지 | 공지·FAQ·약관·개인정보·프로그램·거래처·견적·발송 템플릿 관리 등 |
| **B. 목록 + 폼** | 목록 + `new` + `:id/edit` (상세 없음) | 폼 페이지 | 상품·팝업·배너·연혁·인증서·ESG·포트폴리오·쿠폰·계약·문의답변·SMS·이메일·뉴스레터·**페이지 관리**·**뉴스·보도자료**·**폼 관리**·**채용 공고** |
| **C. 단일 문서** | 목록 개념 없음 — 한 화면 | 그 화면에서 편집·저장 | 회사정보·CEO인사말·오시는길·배송정책·적립금정책·사이트설정·**결제설정**·고객설정·**사이트 연동**·**알림 설정**·**다국어 설정**·**동의 이력** |
| **D. taxonomy** | 목록 1개 | **모달** (IA-06) | 상품/프로그램/포트폴리오/문의 카테고리 · 권한 역할 · FAQ 카테고리 · **메뉴 관리** · **미디어 라이브러리** |
| **E. 처리 워크플로** | 목록 + `:id` (폼 없음) | 상세에서 **인라인** 상태 전이 | **주문**·**클레임**·**청구·입금**·리뷰·1:1문의·영업문의·**상품문의**·**프로그램문의** |
| **F. 조회 전용** | 목록만 | **쓰기 라우트가 존재하지 않는다** | 통계 6종 · 로그 4종 · 로그인 이력 · 상담 이력 · **플랜·이용 현황** |
| **G. 목록 내 처리** | 목록 1개 (상세 없음) | 목록의 행 액션 + **모달** | **배송 처리** |

**유형 D 와 A 를 섞지 않는다** (IA-06). 짧은 taxonomy 를 폼 페이지로 열면 이름 한 줄 고치려고 화면을
떠나야 하고, 반대로 무거운 엔티티를 모달에 넣으면 필드가 스크롤 안에 갇힌다.

**유형 F 에는 쓰기 경로를 추가하지 않는다.** 감사 기록은 불변이다 — 이건 화면 편의의 문제가 아니라
로그의 존재 이유다. 로그 상세도 라우트가 아니라 목록 위 다이얼로그(`LogPayloadDialog`)다.
`/settings/plan` 이 F 인 것은 성격이 다르다 — 플랜은 **여기서 바꾸는 것이 아니다**(ADR-0013 §5).

**유형 G 는 D 와 라우트 모양이 같고 성격이 다르다.** 배송 처리는 taxonomy 가 아니라 처리 화면인데
상세 라우트가 없다 — 발송 단위는 주문과 품목에 매달린 사실이라 자기 화면을 갖지 않고,
송장 등록은 목록 위 `InvoiceBulkDialog` 가 한다. D 와 한 유형으로 묶으면 IA-06 의 규칙(짧은 taxonomy)이
처리 화면까지 덮게 되므로 나눈다.

**등록 폼이 아예 없는 유형 E 가 셋 생겼다.** 주문은 고객의 결제가 만들고, 클레임은 고객의 신청이 만들고,
청구는 **견적 상세의 버튼**이 만든다. 어드민에 `new` 라우트를 두면 존재하지 않는 생성 경로를 약속하게 된다.

**신설 10화면이 D 와 C 의 경계를 넓혔다 — 그 사실을 감추지 않는다.**

- `메뉴 관리`·`미디어 라이브러리`는 **라우트 모양이 D 와 같다**(목록 1개 + 모달 편집). 그러나 taxonomy 가
  아니다 — 하나는 2뎁스 트리이고 하나는 자산 목록이다. `IA-06`(짧은 taxonomy 는 모달) 의 근거는 그대로
  성립하지만(편집 대상이 이름·링크·메타 몇 칸), 유형 이름이 내용을 정확히 부르지는 못한다. 배송 처리를
  G 로 갈랐던 것과 같은 갈래가 여기서도 필요할 수 있다 — **미결**로 남긴다.
- `동의 이력`은 한 화면 안에 **탭 3개**가 있고 그중 하나(동의 항목)만 저장 표면을 갖는다. 나머지 둘
  (동의 이력 · 재동의·파기)은 **쓰기 라우트도 쓰기 컨트롤도 없다** — append-only 원장이라 유형 F 의 성질이다.
  한 잎이 C 와 F 를 겸하는 첫 사례다.
- `사이트 연동`도 같은 겹침을 갖는다: 설정 폼은 C 이고 '최근 유입 관측' 표는 **편집 표면이 없는 F** 다
  (관측값을 고칠 수 있으면 측정이 아니라 의견이 된다).

---

## 4. 사이트맵

`유형` 열은 3장의 A~G. `플랜` 열은 이 잎을 덮는 엔타이틀먼트 키(`—` = 매핑 없음 → 언제나 `granted`).
`하위` 열은 목록 외에 존재하는 라우트.

### 일반 관리

#### 대시보드
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 대시보드 | `/dashboard` | — | — | 루트 `/` 의 리다이렉트 대상 |

#### 사용자 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 회원 관리 | `/users/members` | E | — | `:id` |
| 고객 설정 | `/users/settings` | C | — | — |
| 관리자 관리 | `/users/admins` | A | — | `:id` · `new` · `:id/edit` |
| 권한 관리 | `/users/roles` | D | — | — |
| 로그인 이력 | `/users/login-history` | F | — | — |
| 동의 이력 | `/users/consents` | C + F | — | — (탭 3개 · 이력은 append-only 조회 전용) |

#### 콘텐츠 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 페이지 관리 | `/content/pages` | B | `cms.pages` | `new` · `:id/edit` (버전 이력·되돌리기·미리보기 토큰은 폼 안) |
| 메뉴 관리 | `/content/menus` | D | `cms.pages` | — (2뎁스 트리 · 모달 등록/수정) |
| 뉴스·보도자료 | `/content/news` | B | `cms.pages` | `new` · `:id/edit` |
| 폼 관리 | `/content/forms` | B | `cms.pages` | `new` · `:id/edit` (항목 편집기는 폼 안) |
| 미디어 라이브러리 | `/content/media` | D | `cms.pages` | — (모달 등록/수정 · 사용처 펼침) |
| 공지사항 | `/content/notices` | A | `cms.pages` | `:id` · `new` · `:id/edit` |
| FAQ | `/content/faq` | A | `cms.pages` | `:id` · `new` · `:id/edit` |
| 팝업 관리 | `/content/popups` | B | `cms.pages` | `new` · `:id/edit` |
| 배너 관리 | `/content/banners` | B | `cms.pages` | `new` · `:id/edit` |
| 약관 관리 | `/content/terms` | A | `cms.pages` | `:id` · `new` · `:id/edit` |
| 개인정보 처리방침 | `/content/privacy` | A | `cms.pages` | `:id` · `new` · `:id/edit` |

#### 기업 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 회사 정보 | `/company/profile` | C | — | — |
| CEO 인사말 | `/company/ceo-message` | C | — | — |
| 연혁 | `/company/history` | B | — | `new` · `:id/edit` |
| 오시는 길 | `/company/directions` | C | — | — |
| 인증서/특허 | `/company/certificates` | B | — | `new` · `:id/edit` |
| 파트너사 | `/company/partners` | B | — | 로고형 · 드래그 정렬 |
| 고객사 | `/company/clients` | B | — | 로고형 · 드래그 정렬 |
| ESG | `/company/esg` | B | — | `new` · `:id/edit` |
| 채용 공고 | `/company/careers` | B | `cms.pages` | `new` · `:id/edit` |

**채용 공고만 이 가지에서 플랜 키를 갖는다.** 기업 관리에 있을 뿐 **파는 단위는 CMS** 이기 때문이다 —
홈페이지 게시판 하나이고, 페이지·메뉴·뉴스·폼·미디어와 같은 계약으로 나간다(`module-resources.ts`).

### 비즈니스

#### 주문 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 주문 | `/orders` | E | `commerce.orders` | `:id` — **등록·수정 라우트가 없다** |
| 배송 처리 | `/orders/shipments` | G | `commerce.orders` | — (송장 등록은 모달) |
| 취소/교환/반품 | `/orders/claims` | E | `commerce.orders` | `:id` |

주문·배송·클레임은 **한 모듈이다** — 주문 없이 배송이나 환불만 파는 계약이 없기 때문이다.
그래서 세 잎이 같은 엔타이틀먼트 키를 쓰고, 가지 제목(`group:/orders`)까지 그 키가 덮는다.

#### 포트폴리오 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 포트폴리오 | `/portfolio/items` | B | — | `new` · `:id/edit` |
| 카테고리 | `/portfolio/categories` | D | — | — |
| 성공 사례 | `/portfolio/case-studies` | B | — | `new` · `:id/edit` |

#### 상품 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 상품 | `/products` | B | `commerce.products` (quota) | `new` · `:id/edit` |
| 카테고리 | `/products/categories` | D | `commerce.products` | — |
| 배송 | `/products/shipping` | C | `commerce.shipping` | — (택배사 표를 이 화면이 소유한다) |
| 쿠폰 | `/products/coupons` | B | `commerce.coupons` | `new` · `:id/edit` · `issuance` _(사이드바 밖)_ |
| 적립금 | `/products/points` | C | `commerce.points` | — |
| 리뷰 | `/products/reviews` | E | `commerce.products` | `:id` |
| 문의 | `/products/inquiries` | E | `commerce.products` | `:id` · **조건부 잎** `visibleWhen: 'pg-off'` |

한 섹션 안에서 플랜 키가 넷으로 갈린다 — **배송·쿠폰·적립금은 각자 다른 계약 항목**이기 때문이다.
`commerce.products` 는 quota 종이라 **잠기지 않는다**: 한도를 넘겨도 화면은 열리고 등록만 막힌다.

#### 프로그램 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 프로그램 | `/programs` | A | — | `:id` · `new` · `:id/edit` |
| 카테고리 | `/programs/categories` | D | — | — |
| 문의 | `/programs/inquiries` | E | — | `:id` · **조건부 잎** `visibleWhen: 'pg-off'` |

**메뉴에 '등록'이 없다.** 등록·수정은 목록의 CTA·행 액션으로 같은 화면(`ProgramFormPage`)을 연다 —
메뉴에 등록을 따로 걸면 목록을 거치지 않는 우회로가 생겨 수정 경로와 갈라진다.
펀딩 진행 현황(달성률·남은 일수)도 별도 화면이 아니라 목록의 열과 상세가 말한다.

#### 영업 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 거래처 | `/sales/accounts` | A | `sales.pipeline` | `:id` · `new` · `:id/edit` |
| 계약 | `/sales/contracts` | B | `sales.pipeline` | `new` · `:id/edit` — 등록은 `?quoteId=` 를 받는다 |
| 견적 | `/sales/quotes` | A | `sales.pipeline` | `:id` · `new` · `:id/edit` |
| 청구·입금 | `/sales/billing` | E | **—** | `:id` — **등록 라우트가 없다**(견적 상세에서 생성) |
| 문의 | `/sales/inquiries` | E | `sales.pipeline` | `:id` |
| 프로젝트 | `/sales/projects` | B | `sales.pipeline` | `new` · `:id/edit` |
| 상담 이력 | `/sales/consultations` | F | `sales.pipeline` | `:id` (읽기 전용) |

#### 고객센터
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 1:1 문의 | `/support/tickets` | E | — | `:id` |
| 문의 유형 | `/support/categories` | D | — | — |
| 문의 답변 | `/support/replies` | B | — | `new` · `:id/edit` |
| 자주 묻는 질문 | `/support/faq` | D | — | 큐레이션 |
| 자료실 | `/support/downloads` | B | — | `new` · `:id/edit` |

#### 마케팅 관리
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 이벤트 | `/marketing/events` | B | — | `new` · `:id/edit` |
| 프로모션 | `/marketing/promotions` | B | — | `new` · `:id/edit` |
| 뉴스레터 | `/marketing/newsletters` | B | `marketing.email` | `new` · `:id/edit` |
| SMS 발송 | `/marketing/sms` | B | `marketing.sms` | `new` · `:id/edit` |
| 이메일 발송 | `/marketing/email` | B | `marketing.email` | `new` · `:id/edit` |
| 발송 템플릿 관리 | `/marketing/templates` | A | — | `:id` · `new?kind=text\|email\|alimtalk` · `:id/edit` |

발송 채널은 **계약이 갈린다** — 이메일만 있는 계약이 흔해 SMS 와 한 키로 묶지 않았다.
`marketing.sms` 는 카탈로그의 `minTier` 가 `null` 이라 **`absent`(완전 숨김)로 판정될 수 있는 유일한 모듈**이다.

### AI

#### AI 에이전트
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 새 채팅 | `/ai/chat` | — | `ai.agent` | 대화는 `?c=` 쿼리 |
| 대화 목록 | `/ai/conversations` | — | `ai.agent` | — |

### 분석 · 운영

#### 통계
| 메뉴 | 경로 | 유형 | 플랜 |
|---|---|---|---|
| 방문자 통계 | `/stats/visitors` | F | — |
| 회원 통계 | `/stats/members` | F | — |
| 매출 통계 | `/stats/revenue` | F | `stats.advanced` |
| 주문 통계 | `/stats/orders` | F | — |
| 유입 분석 | `/stats/traffic` | F | `stats.advanced` |
| 검색어 분석 | `/stats/keywords` | F | `stats.advanced` |

통계 묶음 자체는 늘 열린다 — 심화 리포트 셋만 상위 플랜의 것이다.
**매출 통계·주문 통계는 PG 설정에도 반응한다**: 결제를 쓰지 않으면 0 을 그리지 않고 문의 지표로 치환된다(§5.3).

#### 로그 관리
| 메뉴 | 경로 | 유형 | 플랜 |
|---|---|---|---|
| 관리자 로그 | `/logs/admin` | F | — |
| 회원 활동 로그 | `/logs/member-activity` | F | — |
| API 로그 | `/logs/api` | F | — |
| 오류 로그 | `/logs/errors` | F | — |

### 시스템

#### 시스템 설정
| 메뉴 | 경로 | 유형 | 플랜 | 하위 |
|---|---|---|---|---|
| 사이트 설정 | `/settings/site` | C | — | — |
| 사이트 연동 | `/settings/site-connect` | C + F | — | — (유입 관측 표는 편집 표면이 없다) |
| API Key 설정 | `/settings/api-keys` | B | — | `:providerId` (AI 연동 상세) |
| OAuth 설정 | `/settings/oauth` | B | — | `:provider` (제공자 상세) |
| 결제 설정 | `/settings/payment` | C | — | — |
| 플랜·이용 현황 | `/settings/plan` | F | — | — |
| 알림 설정 | `/settings/notifications` | C | — | — (문서의 정본은 알림 층 · 이 화면은 편집 표면 하나다) |
| 다국어 설정 | `/settings/languages` | C | — | — (번역 본문은 각 작성 화면이 갖는다) |

두 설정 화면은 **다른 화면들의 모양을 바꾼다** — 결제 설정은 판매 방식을(§5.3), 플랜은 무엇을 샀는지를(§5.2)
말한다. 플랜 화면 자신은 조회 전용이며 어떤 엔타이틀먼트로도 잠그지 않는다 — 잠긴 사람이
왜 잠겼는지 볼 곳이 그 화면이기 때문이다.

신설 셋도 **자기 화면 밖에 자국을 남긴다.** 사이트 연동은 유입원 조회기를 배선해 주문·문의·회원이
같은 좌표계로 '어디서 왔는가' 를 읽게 하고(`registerTrafficSourceLookup`), 알림 설정은 헤더 벨의
목록에 무엇을 넣을지를 정한다(끈 종류는 감추는 것이 아니라 **만들어지지도 않는다**), 다국어 설정은
공개 언어의 주소 전략을 정한다. 셋 다 **IA 를 접지는 않는다** — 사이드바의 잎을 지우거나 잠그는 축은
여전히 §5 의 넷뿐이다.

---

## 5. 판정 축 — 권한 하나에서 **권한 · 플랜 둘**로

IA 는 이제 "무엇이 어디에 있는가"만으로 부족하다. **같은 사이트맵이 보는 사람마다 다르게 접힌다.**
접는 축이 넷이고, 그중 둘이 판정 축이다.

```
① 인증        없으면 /login                  RequireAuth
② 엔타이틀먼트 없으면 숨김(absent) 또는 잠금(locked)   RequireEntitlement   ← 신설
③ 권한(RBAC)  없으면 403                      RequirePermission
④ 도메인 설정  off 면 화면 안에서 문맥 전환        pgLock() · inquiryMenuState() 등
```

이 순서는 스케줄러가 아니라 `AppShell` 의 **JSX 중첩**이 그대로 표현한다 —
`<RequireEntitlement>` 가 `<RequirePermission>` 바깥이다. 전문은 [ADR-0013](../../adr/0013-entitlement-layer.md).

### 5.1 IA 에 미치는 결과 — 사이드바가 세 가지 방식으로 줄어든다

| 축 | 사라지는 방식 | 라우트는? |
|---|---|---|
| 권한 (`permission` 키) | 잎·가지가 사라진다 | **살아 있다** — deep-link 하면 403 화면 |
| 플랜 `locked` | 잎이 **남고** 라벨에 `' · 잠금'` 이 붙는다 | 살아 있다 — deep-link 하면 업그레이드 안내 |
| 플랜 `absent` | 잎이 사라진다. 모듈 전체가 absent 면 **가지 제목까지** 사라진다 | 살아 있다 — deep-link 하면 `/dashboard` 로 replace |
| 설정 `pg-off` | 잎이 사라지거나 라벨에 `' · 읽기 전용'` 이 붙는다 | 살아 있다 — `collectNavRoutes()` 가 이 필터를 지나지 않는다 |

**네 경우 모두 라우트는 살아 있다.** 감추는 것과 없애는 것은 다른 결정이다.
`findCoveringLeaf` 도 감춰진 잎을 포함한 같은 목록을 걷기 때문에, 감춰진 URL 로 들어와도
제목·권한·플랜 판정이 정상 작동한다.

`locked` 만 잎을 남기는 이유: **살 수 있는 것은 보여야 판다.** `absent` 는 살 수 없으므로 보일 이유가 없다.

### 5.2 플랜 키는 **모듈 단위**다 — 화면 단위가 아니다

`ENTITLEMENT_KEYS` 11개: `commerce.orders` · `commerce.products` · `commerce.coupons` · `commerce.points` ·
`commerce.shipping` · `sales.pipeline` · `cms.pages` · `marketing.email` · `marketing.sms` · `ai.agent` ·
`stats.advanced`.

플랜은 "주문 관리를 살 수 있다"를 팔지 "주문 목록 화면"을 팔지 않는다. 화면이 늘거나 쪼개져도
판매 단위는 그대로여야 한다. 그래서 4장의 `플랜` 열은 **잎마다 다른 값이 아니라 그 잎을 덮는 모듈**이다.

키를 화면에 잇는 좌표계(`page:{to}` / `group:{basePath}`)는 **권한 축의 것을 그대로 재사용한다** —
좌표계는 공유하되 정책은 공유하지 않는다.

**매핑이 없는 잎은 언제나 `granted` 다**(fail-open). 4장에서 `—` 인 잎 전부가 여기 해당하며,
그중 **프로그램 관리 3잎과 청구·입금은 새로 생긴 화면인데 아직 어느 모듈에도 들어 있지 않다** — 미결이다.

**신설 10잎 중 여섯은 `cms.pages` 에 들어갔다**(2026-07-22): `/content/pages` · `/content/menus` ·
`/content/news` · `/content/forms` · `/content/media` · `/company/careers`. 페이지만 팔고 메뉴를
안 파는 계약은 없다 — 메뉴가 가리킬 대상이 페이지이기 때문이다.
나머지 넷(`/users/consents` · `/settings/site-connect` · `/settings/notifications` ·
`/settings/languages`)은 **의도적으로 매핑이 없다**: 사용자 관리와 시스템 설정은 플랜과 무관하게
늘 열려 있어야 하는 앱의 뼈대다(`module-resources.ts` 머리말). 위의 프로그램 관리·청구·입금과 달리
이 넷은 미결이 아니라 '해당 없음' 이다.

### 5.3 네 번째 축(설정)이 IA 에 남기는 자국

결제(PG) 설정은 판정 축이 아니라 **도메인 설정**이지만, 결과적으로 사이트맵을 바꾼다.

- `문의` 잎 둘(`/products/inquiries` · `/programs/inquiries`)이 `visibleWhen: 'pg-off'` 로 조건부다.
  결제를 켜면 새 문의가 들어오지 않으므로 사라지되, **잔여 문의가 있으면 `문의 · 읽기 전용` 으로 남는다.**
- 매출·주문 통계는 화면 전체가 문의 지표로 **치환된다**(라우트는 그대로).
- 상품 폼의 적립·쿠폰·배송 구획과 재고 수량이 잠긴다 — **입력만 막고 값은 보존된다.**

전문은 [ADR-0014](../../adr/0014-pg-switch-screen-impact.md).

### 5.4 거절 문구는 네 가지이고 섞지 않는다

`ssot-charter.md` §5.1 이 규범이고 `specs/quality-bar.md` 의 **EXC-21(P0)** 이 인수 기준이다.
IA 관점에서 중요한 것은 **한 경로가 네 문구 중 정확히 하나에 도달한다**는 것 — 판정 순서가 그것을 보장한다.

---

## 6. 라벨 · 제목 · 권한이 갈라지지 않게 하는 법

세 가지가 같은 질문("이 경로는 어느 메뉴인가")에 답하는데, 규칙이 두 벌이면 언젠가 갈라진다.
실제로 갈라졌었다 — 권한은 `/company/history` 로 옳게 풀면서 제목은 '기업 관리' 라고 말했다 (IA-02).

**그래서 잎 판정은 잎을 아는 모듈(nav-config)이 혼자 갖는다.**

```
경로  →  findCoveringLeaf  →  잎 경로  ┬→  findNavLabel      →  화면 제목 (AppHeader)
                                      ├→  RequirePermission →  403 게이팅
                                      └→  RequireEntitlement →  잠금 · 숨김 판정
```

판정 축이 둘로 늘어도 **잎을 푸는 함수는 하나다.** 축마다 경로 해석기를 따로 두면 같은 URL 이
축마다 다른 잎으로 풀리는 날이 온다 — 그때 화면은 "권한은 있는데 플랜이 없다"를 엉뚱한 모듈로 말한다.

화면은 자기 제목을 그리지 않는다 (IA-02). 130여 화면이 각자 `<h1>` 을 두면 사이드바 라벨과 제목이
서로 다른 날이 온다.

---

## 7. 미구현 메뉴

사이드바에 있는데 화면이 없는 경로는 `PlaceholderPage` 로 라우팅한다 — 죽은 링크를 만들지 않는다.
그 집합은 `APP_ROUTES` 의 `implemented: true` 플래그에서 **파생**한다. 목록을 따로 유지하지 않는다.

```
IMPLEMENTED = APP_ROUTES.filter(r => r.implemented).map(r => r.path)
pendingRoutes = collectNavRoutes().filter(leaf => !IMPLEMENTED.has(leaf.to))
```

화면을 완성하면 `implemented: true` 한 줄을 붙인다. 그러면 자리표시가 저절로 사라진다.
**현재 미구현 0건** — 잎 81개가 전부 구현돼 있다.

---

## 8. 메뉴를 추가할 때

1. `nav-config.ts` 의 그룹 안 가지에 `['라벨', '/경로']` 를 넣는다 — 사이드바·제목·권한이 여기서 나온다
2. 3장에서 **유형 A~G 를 고른다** — 이게 만들 라우트를 결정한다
3. `APP_ROUTES` 에 목록 라우트(`implemented: true`)와 하위 라우트를 넣는다. `new`·정적 세그먼트를 `:id` 위에
4. **플랜 키를 정한다** — 기존 모듈에 속하면 `module-resources.ts` 의 그 배열에 리소스를 더하고,
   새 판매 단위면 `ENTITLEMENT_KEYS` 와 `MODULE_SPECS` 에 키를 만든다. 아무것도 안 하면 **언제나 열린다**
5. 조회 조건은 `useListState` 로 URL 에 싣는다 (IA-13)
6. [docs/flow/mmd/menus/](../../flow/mmd/menus/) 에 그 메뉴의 플로우 차트를 추가하고,
   [09-ia-tree.mmd](../../flow/mmd/09-ia-tree.mmd)·[09a](../../flow/mmd/09a-ia-tree-overview.mmd)·[09b](../../flow/mmd/09b-ia-tree-sections.mmd) 와 이 문서 4장의 표에 한 줄을 더한다
7. `pnpm nav:check` 를 돌린다 — `packages/ui/pages/_data/pages.ts` 와 `tools/figma-plugin/generated/tds-pages.json`
   두 파생물이 함께 갱신되지 않으면 게이트가 막는다
