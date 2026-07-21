// AI 에이전트가 질의할 수 있는 **데이터 도메인 레지스트리**
//
// [이 파일이 정하는 것] `@멘션` 이 가리킬 수 있는 도메인이 무엇이고, 그 도메인의 각 필드가
// **어떤 축으로 걸릴 수 있는지**를 선언한다. 파서(parser.ts)는 이 선언만 읽는다 — 파서 안에
// '회원' 이나 '등급' 같은 도메인 지식이 하드코딩되지 않는다.
//
// [왜 '능력(capability)' 을 선언하는가 — 이 화면의 정직성이 걸린 지점]
// 픽스처의 필드는 전부 같은 축으로 걸리지 않는다. 예를 들어 회원의 `totalPurchase`(누적 구매액)에는
// **기간 정보가 없다** — 언제 산 것인지 데이터가 갖고 있지 않다(shared/fixtures/members.ts:126).
// 그래서 '이번달 구매' 는 계산할 수 없다. 능력을 선언해 두면 파서가 이 불가능을 **실행 전에**
// 알아채고 사용자에게 그대로 말한다. 선언이 없으면 화면은 누적 구매액을 이번달 구매인 척
// 보여주게 된다 — FEEDBACK-03 이 금지하는 '거짓말하는 UI' 다.
//
// [백엔드 없음] 행(row)의 출처는 픽스처다. 실제 조회로 바뀌는 지점은 data-source.ts 의
// // TODO(backend) 주석이며, 이 파일의 선언(별칭·필드·능력)은 그때도 그대로 쓰인다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [값 목록은 여기서 손으로 적지 않는다 — 손복사본이었던 시절]
// 처리상태 5종(접수·배정·처리중·답변완료·종결)과 우선순위 4종을 이 파일이 그대로 다시 타이핑해
// 갖고 있었다. 정본은 고객센터가 갖는다(pages/support/_shared/domain.ts 의 TICKET_STATUS_OPTIONS ·
// TICKET_PRIORITY_OPTIONS). 두 벌이 있으면 고객센터가 상태를 하나 늘려도 AI 는 모르고, 라벨을
// 고치면 사용자가 화면에서 읽은 말로는 질의가 걸리지 않는다 — **조용히** 어긋난다.
//
// 그렇다고 여기서 `pages/support` 를 import 할 수는 없다(pages/ai → pages/support 는 축1 위반).
// 그래서 자리만 만든다: 이 파일은 필드가 **무엇으로 걸리는지**(축·부르는 말·별칭)를 선언하고,
// 값 목록(id·라벨)은 각 도메인의 `*_OPTIONS` 에서 `src/wiring-ai.ts` 가 꽂는다.
//
// [무엇이 여기 남는가 — 별칭] '중지'·'브이아이피' 같은 말은 **사용자가 이 화면에서 쓰는 어휘**지
// 고객센터·상품 도메인의 사실이 아니다. 그래서 라벨은 도메인이, 별칭은 여기가 갖는다.
// ─────────────────────────────────────────────────────────────────────────────
import { TIER_LABEL } from '../../../shared/domain/member';
import type { MemberTier } from '../../../shared/domain/member';

/* ── 도메인 ──────────────────────────────────────────────────────────────── */

/** 질의 가능한 도메인 — 새 도메인을 붙이면 여기와 DOMAINS 에 한 줄씩 는다 */
export type DomainId = 'members' | 'products' | 'tickets' | 'programs';

/**
 * 값 축 — 필드가 어떤 조건으로 걸릴 수 있는가.
 *
 * - `equality`  : 값이 같은가 (등급 = VIP)
 * - `presence`  : 값이 있는가 / 0보다 큰가 (구매 이력이 있는가)
 * - `period`    : 기간으로 거를 수 있는가 (이번달 가입) — **날짜 필드만 참이다**
 */
export type FieldAxis = 'equality' | 'presence' | 'period';

/** 필드 하나 — 이름(사람이 쓰는 말)과 걸 수 있는 축 */
export interface DomainField {
  readonly id: string;
  /** 표시용 이름 — 답변 문구가 이 말을 그대로 쓴다 ('구매액에는 기간이 없습니다') */
  readonly label: string;
  /**
   * 사용자가 이 필드를 부를 때 쓰는 말. 파서가 문장에서 이 말을 찾아 기간·조건을 **묶는다**.
   * 긴 것이 앞에 와야 한다 — '누적구매' 가 '구매' 보다 먼저 걸려야 한다.
   */
  readonly nouns: readonly string[];
  readonly axes: readonly FieldAxis[];
  /**
   * equality 축 필드의 허용 값 — 라벨로 찾고 id 로 건다.
   *
   * **비어 있음은 두 가지 뜻이다**: presence/period 전용 필드이거나, 값 목록의 정본이 다른
   * 도메인에 있어 배선(`src/wiring-ai.ts`)이 꽂아 줄 때까지 아직 '모른다' 이거나.
   * 모르는 동안에는 그 필드로 값 조건이 걸리지 않는다 — 없는 값을 지어내 거는 것보다 낫다.
   */
  readonly values: readonly DomainFieldValue[];
}

export interface DomainFieldValue {
  readonly id: string;
  readonly label: string;
  /** 라벨 외에 사용자가 쓰는 말 (예: 'VIP' 의 '브이아이피') */
  readonly aliases: readonly string[];
}

export interface DomainDef {
  readonly id: DomainId;
  readonly label: string;
  /**
   * `@` 뒤에 올 수 있는 말. 사용자가 '고객목록' 이라 부르든 '회원' 이라 부르든 같은 도메인이다.
   * 첫 항목이 대표 별칭 — 자동완성 목록이 이것을 보여준다.
   */
  readonly aliases: readonly string[];
  /** 결과에서 원본 목록 화면으로 건너갈 경로 — 답변이 '실제로 조작 가능' 해지는 지점 */
  readonly listPath: string;
  readonly fields: readonly DomainField[];
  /**
   * 기간 표현이 **어떤 필드도 지목하지 않았을 때** 붙을 기본 날짜 필드.
   * 없으면 null — 이 도메인은 기간으로 거를 수 없다는 뜻이다.
   */
  readonly defaultPeriodFieldId: string | null;
}

/* ── 값 목록 주입 ────────────────────────────────────────────────────────── */

/**
 * 도메인이 소유한 선택지 한 벌 — 각 도메인의 `*_OPTIONS` 가 그대로 이 모양이다
 * (TICKET_STATUS_OPTIONS · SALE_STATUS_OPTIONS · PROGRAM_STATUS_OPTIONS …).
 * 배선이 남는 필드(tone·color 등)를 떼지 않고 그대로 넘길 수 있게 최소 두 칸만 요구한다.
 */
export interface DomainOption {
  readonly id: string;
  readonly label: string;
}

/** 값 id → 이 화면에서 사용자가 달리 부르는 말 */
type ValueAliases = Readonly<Record<string, readonly string[]>>;

function valueKey(domainId: DomainId, fieldId: string): string {
  return `${domainId}::${fieldId}`;
}

/**
 * 별칭 사전 — **여기가 소유한다**(머리말). 라벨은 도메인이 주고, 별칭은 이 화면의 어휘다.
 * 없는 키는 별칭 없음으로 읽는다.
 */
const VALUE_ALIASES: Readonly<Record<string, ValueAliases>> = {
  [valueKey('products', 'saleStatus')]: { stopped: ['중지'] },
};

/** 배선이 꽂아 준 값 목록 — 키는 `도메인::필드` */
const injectedValues = new Map<string, readonly DomainFieldValue[]>();

/**
 * 필드의 값 목록을 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring-ai.ts` 다.
 *
 * 넘기는 것은 그 도메인의 `*_OPTIONS` **그 자체**다. 여기서 라벨을 다시 적지 않는 것이 요점이다.
 */
export function registerDomainFieldValues(
  domainId: DomainId,
  fieldId: string,
  options: readonly DomainOption[],
): void {
  const key = valueKey(domainId, fieldId);
  const aliases = VALUE_ALIASES[key] ?? {};
  injectedValues.set(
    key,
    options.map((option) => ({
      id: option.id,
      label: option.label,
      aliases: aliases[option.id] ?? [],
    })),
  );
}

/** 테스트가 미배선 상태로 되돌린다 — '값을 모르는' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetDomainFieldValues(): void {
  injectedValues.clear();
}

/** 선언 + 주입을 합친 도메인 — 조회기(findDomainBy*)가 이것을 돌려준다 */
function resolveDomain(domain: DomainDef): DomainDef {
  const fields = domain.fields.map((field) => {
    const injected = injectedValues.get(valueKey(domain.id, field.id));
    return injected === undefined ? field : { ...field, values: injected };
  });
  return { ...domain, fields };
}

/* ── 회원 ────────────────────────────────────────────────────────────────── */

/**
 * 등급 — 라벨의 정본은 `shared/domain/member.ts` 의 TIER_LABEL 이다.
 *
 * [왜 여기는 배선이 필요 없나] 회원 도메인은 페이지가 아니라 **공통 층**에 산다(그래서
 * provider-members.ts 도 스스로 등록한다). 결합이 없으므로 여기서 직접 파생해도 축1 에 걸리지
 * 않는다 — 값 목록을 손으로 옮겨 적을 이유가 없다.
 *
 * 순서는 파서가 다시 정한다(긴 라벨 우선 — 'VVIP' 가 'VIP' 보다 먼저 걸려야 한다).
 */
const TIER_ORDER: readonly MemberTier[] = ['vip', 'vvip', 'normal'];

const TIER_ALIASES: ValueAliases = {
  vip: ['브이아이피'],
  vvip: ['브이브이아이피'],
  normal: ['일반'],
};

const TIER_VALUES: readonly DomainFieldValue[] = TIER_ORDER.map((tier) => ({
  id: tier,
  label: TIER_LABEL[tier],
  aliases: TIER_ALIASES[tier] ?? [],
}));

const MEMBER_FIELDS: readonly DomainField[] = [
  {
    id: 'tier',
    label: '등급',
    nouns: ['등급'],
    axes: ['equality'],
    values: TIER_VALUES,
  },
  {
    id: 'joinedAt',
    label: '가입일',
    // '가입한' · '가입일' 을 모두 잡으려면 어간 '가입' 이면 충분하다
    nouns: ['가입'],
    axes: ['period'],
    values: [],
  },
  {
    /**
     * 누적 구매액 — **기간 축이 없다.**
     * 픽스처가 갖고 있는 것은 '지금까지 얼마 샀나' 하나뿐이고 '언제 샀나'는 없다
     * (shared/fixtures/members.ts:126 `totalPurchase: i % 11 === 0 ? 150000 : 0`).
     * 그래서 axes 에 'period' 가 없고, 파서는 '이번달 구매' 를 계산 대신 **거절**한다.
     */
    id: 'totalPurchase',
    label: '누적 구매액',
    nouns: ['누적구매', '구매액', '구매'],
    axes: ['presence'],
    values: [],
  },
  {
    id: 'points',
    label: '적립금',
    nouns: ['적립금', '포인트'],
    axes: ['presence'],
    values: [],
  },
];

/* ── 상품 ────────────────────────────────────────────────────────────────── */

const PRODUCT_FIELDS: readonly DomainField[] = [
  {
    id: 'saleStatus',
    label: '판매상태',
    nouns: ['판매상태', '판매'],
    axes: ['equality'],
    // 값 목록은 상품 도메인의 SALE_STATUS_OPTIONS 에서 배선이 꽂는다(src/wiring-ai.ts).
    // id 는 ProductSaleStatus 그대로이고, 제공자가 그 id 를 비교에 쓴다.
    values: [],
  },
  {
    id: 'displayed',
    label: '전시상태',
    nouns: ['전시'],
    axes: ['equality'],
    /*
      [여기만 목록이 그대로 남는 이유] 전시상태는 상품 도메인에서 **boolean 한 칸**이다
      (Product.displayed). 옵션 표가 애초에 없으므로 베껴 온 목록이 아니라, 참/거짓을
      사람의 말로 옮긴 **이 화면의 인코딩**이다 — 정본이 다른 곳에 없으니 여기가 정본이다.
    */
    values: [
      { id: 'true', label: '전시중', aliases: ['노출'] },
      { id: 'false', label: '숨김', aliases: ['미노출'] },
    ],
  },
];

/* ── 1:1 문의 ────────────────────────────────────────────────────────────── */

const TICKET_FIELDS: readonly DomainField[] = [
  {
    id: 'status',
    label: '처리상태',
    nouns: ['상태'],
    axes: ['equality'],
    // 값 목록은 고객센터의 TICKET_STATUS_OPTIONS 에서 배선이 꽂는다(src/wiring-ai.ts).
    values: [],
  },
  {
    id: 'priority',
    label: '우선순위',
    nouns: ['우선순위'],
    axes: ['equality'],
    // 값 목록은 고객센터의 TICKET_PRIORITY_OPTIONS 에서 배선이 꽂는다.
    values: [],
  },
  {
    id: 'receivedAt',
    label: '접수일',
    nouns: ['접수'],
    axes: ['period'],
    values: [],
  },
];

/* ── 프로그램 (후원형 펀딩) ──────────────────────────────────────────────────
 *
 * [왜 뒤늦게 붙었나] 프로그램 모듈이 생긴 뒤에도 AI 는 상품·문의·회원 셋만 알았다. 그래서
 * '@프로그램' 은 '모르는 도메인' 으로 거절됐다 — 앱에 있는 화면을 앱의 조수가 모르는 상태였다.
 *
 * [기간이 두 축이다] 상품과 달리 프로그램에는 날짜가 둘 있다: 오픈일과 마감일. '이번달 프로그램'
 * 처럼 필드를 지목하지 않은 기간은 **오픈일**로 읽는다(defaultPeriodFieldId) — 목록에서 '이번달'
 * 은 보통 '이번달에 열린' 이라는 뜻이고, 마감은 '마감' 이라는 말과 함께 온다. */

const PROGRAM_FIELDS: readonly DomainField[] = [
  {
    id: 'status',
    label: '진행상태',
    nouns: ['진행상태', '상태'],
    axes: ['equality'],
    // 값 목록은 프로그램의 PROGRAM_STATUS_OPTIONS 에서 배선이 꽂는다(src/wiring-ai.ts).
    values: [],
  },
  {
    id: 'startDate',
    label: '오픈일',
    nouns: ['오픈', '시작'],
    axes: ['period'],
    values: [],
  },
  {
    id: 'endDate',
    label: '마감일',
    nouns: ['마감', '종료'],
    axes: ['period'],
    values: [],
  },
  {
    /**
     * 모금액 — **기간 축이 없다.** 저장된 값은 '지금까지 얼마 모였나' 하나뿐이고
     * '언제 후원됐나' 는 프로그램 레코드에 없다(pages/programs/_shared/store.ts 의 Program).
     * 회원의 누적 구매액과 같은 사정이라 같은 선언을 한다 — 파서가 '이번달 모금' 을 거절한다.
     */
    id: 'pledgedAmount',
    label: '모금액',
    nouns: ['모금액', '모금', '후원금'],
    axes: ['presence'],
    values: [],
  },
];

/* ── 레지스트리 ──────────────────────────────────────────────────────────── */

export const DOMAINS: readonly DomainDef[] = [
  {
    id: 'members',
    label: '회원 목록',
    // '고객목록' 이 첫 자리가 아닌 이유: 이 앱의 화면 이름은 '회원 관리' 다(nav-config.ts:101).
    // 사용자가 '고객' 이라 부르는 것도 받아주되, 자동완성은 앱의 말로 제안한다.
    aliases: ['회원목록', '고객목록', '회원', '고객'],
    listPath: '/users/members',
    fields: MEMBER_FIELDS,
    defaultPeriodFieldId: 'joinedAt',
  },
  {
    id: 'products',
    label: '상품 목록',
    aliases: ['상품목록', '상품'],
    listPath: '/products',
    fields: PRODUCT_FIELDS,
    // 상품 픽스처에는 등록일이 없다 — 기간으로 거를 수 없다는 사실을 선언으로 못 박는다
    defaultPeriodFieldId: null,
  },
  {
    id: 'tickets',
    label: '1:1 문의',
    aliases: ['문의목록', '문의', '티켓'],
    listPath: '/support/tickets',
    fields: TICKET_FIELDS,
    defaultPeriodFieldId: 'receivedAt',
  },
  {
    id: 'programs',
    label: '프로그램',
    // '펀딩' 도 받아준다 — 사람이 이 화면을 부르는 다른 이름이다. 대표 별칭은 앱의 말('프로그램').
    aliases: ['프로그램목록', '프로그램', '펀딩'],
    listPath: '/programs',
    fields: PROGRAM_FIELDS,
    defaultPeriodFieldId: 'startDate',
  },
];

/**
 * 별칭으로 도메인을 찾는다 — 못 찾으면 null (파서가 '모르는 도메인' 으로 답한다).
 *
 * 돌려주는 것은 선언 그대로가 아니라 **배선된 값 목록까지 합친** 도메인이다(resolveDomain).
 * 파서·실행기가 조회기를 지나기만 하면 주입을 신경 쓰지 않아도 된다.
 */
export function findDomainByAlias(alias: string): DomainDef | null {
  const normalized = alias.trim().toLowerCase();
  if (normalized === '') return null;
  const found = DOMAINS.find((domain) =>
    domain.aliases.some((candidate) => candidate.toLowerCase() === normalized),
  );
  return found === undefined ? null : resolveDomain(found);
}

export function findDomainById(id: DomainId): DomainDef | null {
  const found = DOMAINS.find((domain) => domain.id === id);
  return found === undefined ? null : resolveDomain(found);
}

export function findField(domain: DomainDef, fieldId: string): DomainField | null {
  return domain.fields.find((field) => field.id === fieldId) ?? null;
}

/** 이 필드가 이 축으로 걸릴 수 있는가 */
export function fieldSupports(field: DomainField, axis: FieldAxis): boolean {
  return field.axes.includes(axis);
}
