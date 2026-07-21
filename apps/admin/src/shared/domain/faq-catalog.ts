// 발행 FAQ 조회기 — **자리만** 만든다 (목록은 콘텐츠 관리 FAQ 가 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 같은 낱말, 다른 세계였다]
// FAQ 를 쓰는 화면은 둘이다.
//   · 콘텐츠 관리 FAQ(/content/faq)  — **작성**한다. 질문·답변·카테고리의 정본.
//   · 고객센터 FAQ(/support/faq)     — **큐레이션**한다. 고객센터에서 무엇을 어떤 순서로 보일지.
// 그런데 큐레이션 화면이 자기 픽스처 배열(cfaq-1…)과 자기 카테고리 어휘('주문/결제'·'교환/반품')를
// 따로 들고 있었다. 그래서 콘텐츠 관리에서 쓴 FAQ 는 고객센터 목록에 **영영 나타나지 않았고**,
// 두 화면의 카테고리는 애초에 맞춰질 수가 없었다 — 화면 상단의 '작성은 콘텐츠 관리로' 안내가
// 거짓말이 되어 있었다.
//
// [왜 고객센터가 콘텐츠 FAQ 를 직접 import 하지 않나]
// `pages/support` → `pages/content` 는 페이지 간 결합이고 code-quality 축1(page-coupling,
// blocker, 임계값 0건)이 그대로 잡는다. 그래서 방향을 뒤집는다: 공통 층인 여기는 **계약과
// 등록기**만 갖고, 실제 목록을 꽂는 일은 두 도메인을 모두 아는 `src/wiring.ts` 가 한다.
// 고객센터 화면은 끝까지 '콘텐츠 관리' 라는 모듈을 모른 채 조회기가 주는 것만 큐레이션한다.
// (같은 결의 선례: shared/fixtures/admin-groups.ts 의 registerSenderUsageLookup,
//  shared/domain/template-variables.ts 의 registerTemplateVariableCatalog.)
//
// [왜 fail-closed 가 아니라 '모른다(null)' 인가]
// 조회기가 없을 때 빈 배열을 주면 큐레이션 화면은 **'고객센터에 노출할 FAQ 가 없습니다'** 라는
// 완결된 문장을 그린다 — 운영자는 그것을 사실로 읽고 콘텐츠 관리에 가서 FAQ 를 다시 쓴다.
// 배선 사고를 데이터 사고처럼 보이게 만드는 화면이다. 그래서 '없다' 와 '모른다' 를 가르고,
// 모르는 동안에는 목록 대신 오류를 낸다(data-source 가 throw 한다).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 고객센터에 내보낼 수 있는 FAQ 한 건 — **작성 쪽이 소유하는 값만** 담는다.
 *
 * 노출 여부·BEST 고정·표시 순서는 여기 없다. 그것은 고객센터 큐레이션이 소유하는 축이라
 * (`pages/support/faq/types.ts`) 작성 쪽 계약에 섞이면 어느 화면이 주인인지 다시 흐려진다.
 */
export interface PublishedFaq {
  /** 콘텐츠 FAQ 의 id — 큐레이션 레코드가 이 값을 키로 삼는다 */
  readonly id: string;
  readonly question: string;
  /** 카테고리 id — 어휘의 정본은 콘텐츠 관리 FAQ 의 카테고리 목록이다 */
  readonly categoryId: string;
  readonly categoryLabel: string;
}

type PublishedFaqLookup = () => readonly PublishedFaq[];

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let lookup: PublishedFaqLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerPublishedFaqLookup(next: PublishedFaqLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetPublishedFaqLookup(): void {
  lookup = null;
}

/**
 * 지금 고객센터에 내보낼 수 있는 FAQ — **배선되지 않았으면 null**(빈 배열이 아니다).
 *
 * 조회기가 던지면 그대로 올려보낸다. 여기서 삼키면 콘텐츠 쪽 사고가 '항목 0건' 으로 둔갑한다.
 */
export function publishedFaqs(): readonly PublishedFaq[] | null {
  if (lookup === null) return null;
  return lookup();
}
