// 고객노출 FAQ(큐레이션) 화면 전용 타입 · 순수 규칙 (A41 소유 — apps/admin/src/pages/support/faq/**)
//
// [콘텐츠 FAQ 와의 관계] 콘텐츠 관리 FAQ(/content/faq)가 FAQ '작성·관리'(등록/수정/삭제·카테고리)를
// 맡는다. 이 화면은 역할을 겹치지 않게 **고객센터 노출 큐레이션**으로 차별화한다: 이미 발행된 FAQ 를
// 고객센터에서 어떤 순서로 보여줄지(정렬 DnD)·노출할지(토글)·BEST 로 상단 고정할지만 다룬다.
// 작성은 콘텐츠 관리로 위임한다(화면 상단 안내 링크). 그래서 등록/수정/삭제 폼이 없다.

/** 고객센터에 노출되는 FAQ 한 건 — 작성 원본은 콘텐츠 관리 FAQ 다(여기선 큐레이션만) */
export interface CustomerFaq {
  readonly id: string;
  readonly question: string;
  /** 카테고리 라벨(표시용) */
  readonly categoryLabel: string;
  /** 노출 여부 — 끄면 고객센터에서 숨는다 */
  readonly visible: boolean;
  /** BEST/인기 고정 — 켜면 고객센터 상단에 강조된다(콘텐츠 FAQ 에 없는 큐레이션 축) */
  readonly pinned: boolean;
  /** 고객센터 표시 순서 — 작을수록 위에 온다 */
  readonly order: number;
}

export function visibilityLabel(visible: boolean): string {
  return visible ? '노출' : '숨김';
}

/** 표시 순서 오름차순(작을수록 위). 같은 순서는 id 안정 정렬. */
export function sortCustomerFaqs(list: readonly CustomerFaq[]): readonly CustomerFaq[] {
  return [...list].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * 새 id 순서(orderedIds)를 받아 목록을 그 순서로 재배열하고 order 값을 1..n 으로 다시 매긴다.
 * orderedIds 가 현재 목록과 정확히 일치하지 않으면 원본을 그대로 돌려준다(부분 집합 방지).
 * 테스트가 이 순수 함수를 직접 부른다.
 */
export function applyFaqOrder(
  list: readonly CustomerFaq[],
  orderedIds: readonly string[],
): readonly CustomerFaq[] {
  const byId = new Map(list.map((faq) => [faq.id, faq]));
  if (orderedIds.length !== list.length) return sortCustomerFaqs(list);
  const reordered = orderedIds
    .map((id) => byId.get(id))
    .filter((faq): faq is CustomerFaq => faq !== undefined);
  if (reordered.length !== list.length) return sortCustomerFaqs(list);
  return reordered.map((faq, index) => ({ ...faq, order: index + 1 }));
}

/** 노출 건수 — 상단 요약에 쓴다 */
export function countVisible(list: readonly CustomerFaq[]): number {
  return list.filter((faq) => faq.visible).length;
}
