// 고객노출 FAQ(큐레이션) 화면 전용 타입 · 순수 규칙
//
// [콘텐츠 FAQ 와의 관계 — 이제 말과 코드가 같다] 콘텐츠 관리 FAQ(/content/faq)가 FAQ '작성·관리'
// (등록/수정/삭제·카테고리)를 맡는다. 이 화면은 **고객센터 노출 큐레이션**만 한다: 노출 여부·BEST
// 고정·표시 순서. 그래서 등록/수정/삭제 폼이 없고, 작성은 상단 안내 링크로 콘텐츠 관리에 위임한다.
//
// [무엇이 바뀌었나] 예전에는 이 화면이 **자기 FAQ 배열**(cfaq-1…)과 **자기 카테고리 어휘**
// ('주문/결제'·'배송'·'교환/반품'·'회원/계정')를 따로 들고 있었다. 콘텐츠 관리의 카테고리는
// 계정·결제·배송·기타였으니 둘은 애초에 맞출 수 없었고, 콘텐츠 관리에서 쓴 FAQ 는 이 목록에
// 영영 뜨지 않았다 — 안내 문구만 두 화면이 이어져 있다고 말하고 있었다.
// 지금은 행이 콘텐츠 FAQ 에서 **파생**되고(shared/domain/faq-catalog 조회기), 이 모듈은 그 위에
// 얹는 큐레이션 값만 소유한다. 질문·카테고리를 여기서 만들지 않으므로 어긋날 자리가 없다.
import type { PublishedFaq } from '../../../shared/domain/faq-catalog';

/**
 * 큐레이션 덮어쓰기 한 건 — **고객센터가 소유하는 축만** 담는다. 키는 콘텐츠 FAQ 의 id 다.
 *
 * [왜 전부 선택 값인가] 큐레이션하지 않은 FAQ 가 정상이기 때문이다. 콘텐츠 관리에서 FAQ 를
 * 하나 쓰면 그것은 곧바로 고객센터 목록에 뜨고(기본 노출), 운영자가 손대는 순간에만 이 레코드가
 * 생긴다. 모든 FAQ 에 대해 레코드를 미리 만들어 두면 원본이 늘어날 때마다 두 곳을 함께 고쳐야
 * 하고, 그 동기화를 한 번 놓치면 '콘텐츠에는 있는데 고객센터에는 없는 FAQ' 가 다시 생긴다.
 */
export interface FaqCuration {
  /** 콘텐츠 FAQ 의 id */
  readonly faqId: string;
  /** 고객센터 노출 여부 — 없으면 노출(기본값) */
  readonly visible?: boolean;
  /** BEST 고정 — 없으면 일반. 콘텐츠 FAQ 에 없는 축이라 온전히 이 화면의 것이다 */
  readonly pinned?: boolean;
  /** 고객센터 표시 순서 — 없으면 '아직 순서를 손대지 않았다' 는 뜻이다 */
  readonly order?: number;
}

/** 고객센터에 노출되는 FAQ 한 건 — 질문·카테고리는 콘텐츠 FAQ 에서 파생된 값이다 */
export interface CustomerFaq {
  /** 콘텐츠 FAQ 의 id 그대로 — 큐레이션은 이 값을 키로 삼는다 */
  readonly id: string;
  /** 콘텐츠 FAQ 의 질문(파생 — 이 화면에서 고칠 수 없다) */
  readonly question: string;
  /** 카테고리 id — 어휘의 정본은 콘텐츠 관리 FAQ 다 */
  readonly categoryId: string;
  /** 카테고리 라벨(표시용) */
  readonly categoryLabel: string;
  /** 노출 여부 — 끄면 고객센터에서 숨는다 */
  readonly visible: boolean;
  /** BEST/인기 고정 — 켜면 고객센터 상단에 강조된다(콘텐츠 FAQ 에 없는 큐레이션 축) */
  readonly pinned: boolean;
  /** 고객센터 표시 순서 — 작을수록 위에 온다. 목록 안에서 1..n 으로 이어진다 */
  readonly order: number;
}

/** 큐레이션하지 않은 FAQ 의 기본값 — 콘텐츠에서 노출 중이면 고객센터에도 뜬다 */
const DEFAULT_VISIBLE = true;
const DEFAULT_PINNED = false;

export function visibilityLabel(visible: boolean): string {
  return visible ? '노출' : '숨김';
}

/**
 * 원본(콘텐츠 FAQ) + 큐레이션 → 화면이 그릴 목록. **테스트가 이 순수 함수를 직접 부른다.**
 *
 * [순서를 어떻게 정하나] 두 종류가 섞인다 — 운영자가 순서를 정해 둔 FAQ 와 아직 손대지 않은
 * FAQ. 손댄 것을 그 order 대로 앞에 두고, 나머지는 **콘텐츠 관리의 정렬 순서를 그대로** 뒤에
 * 잇는다. 새로 쓴 FAQ 가 목록 한가운데 불쑥 끼어들지 않고, 콘텐츠 쪽에서 매긴 순서도 버려지지
 * 않는다. 그렇게 정한 뒤 order 를 1..n 으로 다시 매겨 화면에 보이는 번호와 저장되는 값을 맞춘다
 * (원본 order 가 듬성듬성해도 화면의 번호는 이어진다).
 */
export function curateFaqs(
  source: readonly PublishedFaq[],
  curations: readonly FaqCuration[],
): readonly CustomerFaq[] {
  const byId = new Map(curations.map((curation) => [curation.faqId, curation]));

  const ranked = source.map((faq, sourceIndex) => {
    const curation = byId.get(faq.id);
    return {
      sourceIndex,
      /** null = 아직 순서를 손대지 않았다 */
      curatedOrder: curation?.order ?? null,
      faq: {
        id: faq.id,
        question: faq.question,
        categoryId: faq.categoryId,
        categoryLabel: faq.categoryLabel,
        visible: curation?.visible ?? DEFAULT_VISIBLE,
        pinned: curation?.pinned ?? DEFAULT_PINNED,
      },
    };
  });

  ranked.sort((a, b) => {
    if (a.curatedOrder !== null && b.curatedOrder !== null) {
      return a.curatedOrder - b.curatedOrder || a.sourceIndex - b.sourceIndex;
    }
    if (a.curatedOrder !== null) return -1;
    if (b.curatedOrder !== null) return 1;
    return a.sourceIndex - b.sourceIndex;
  });

  return ranked.map((entry, index) => ({ ...entry.faq, order: index + 1 }));
}

/**
 * 새 순서(orderedIds)를 큐레이션 레코드로 옮긴다 — 목록에 있는 **모든** FAQ 가 order 를 갖게 된다.
 *
 * [왜 전부인가] 일부만 적으면 '손댄 것 / 안 댄 것' 이 뒤섞여 다음 조회에서 순서가 다시 흔들린다.
 * 운영자가 한 번 순서를 정하면 그 화면이 곧 결정이다. 노출·BEST 는 건드리지 않는다(다른 축이다).
 * 목록 밖의 레코드(예: 콘텐츠에서 숨겨진 FAQ 의 큐레이션)는 그대로 둔다 — 다시 노출되면 되살아난다.
 * **테스트가 이 순수 함수를 직접 부른다.**
 */
export function applyCurationOrder(
  curations: readonly FaqCuration[],
  orderedIds: readonly string[],
): readonly FaqCuration[] {
  const byId = new Map(curations.map((curation) => [curation.faqId, curation]));
  const reordered = orderedIds.map((faqId, index) => ({
    ...(byId.get(faqId) ?? { faqId }),
    order: index + 1,
  }));
  const untouched = curations.filter((curation) => !orderedIds.includes(curation.faqId));
  return [...reordered, ...untouched];
}

/**
 * 큐레이션 값 하나를 얹는다(없으면 만든다) — 노출·BEST 토글이 쓴다.
 * **테스트가 이 순수 함수를 직접 부른다.**
 */
export function applyCurationPatch(
  curations: readonly FaqCuration[],
  faqId: string,
  patch: Pick<FaqCuration, 'visible'> | Pick<FaqCuration, 'pinned'>,
): readonly FaqCuration[] {
  const exists = curations.some((curation) => curation.faqId === faqId);
  if (!exists) return [...curations, { faqId, ...patch }];
  return curations.map((curation) =>
    curation.faqId === faqId ? { ...curation, ...patch } : curation,
  );
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
 * 화면의 낙관적 반영이 쓴다 — 서버(저장소)에 반영하는 쪽은 applyCurationOrder 다.
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
