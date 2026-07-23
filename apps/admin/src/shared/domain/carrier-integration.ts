// 택배사 연동 ↔ 배송 정책의 이음매 — **누가 정본인지 한 곳에서 답한다**
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 생겼나 — 같은 택배사를 두 곳이 각자 알 뻔했다]
// 이 리포에는 택배사를 아는 곳이 이미 있다:
//   · 배송 정책(/products/shipping) — 등록된 택배사의 **원장**. 이름·코드·추적 템플릿·사용 여부.
//   · 배송 처리(/orders/shipments)  — 그 목록을 읽어 송장을 붙인다.
// 여기에 세 번째가 붙는다: 연동 카탈로그(/settings/api-keys)의 **배송 분류**.
//
// 셋은 같은 것을 말하지 않는다. 앞의 둘이 답하는 질문은 *"우리가 어느 택배사로 보내는가"*(운영
// 정책)이고, 연동이 답하는 질문은 *"그 택배사의 API 를 어떤 자격증명으로 부르는가"* 다. 그래서
// 연동 카탈로그는 택배사를 **새로 정의하지 않는다** — 이미 있는 원장을 가리킬 뿐이다.
//
// [만약 각자 알았다면 무슨 일이 나는가]
// 연동 카탈로그가 'CJ대한통운' 을 자기 사실로 들고 있으면, 배송 정책에서 그 택배사를 지운 뒤에도
// 연동은 멀쩡해 보인다. 운영자는 자격증명이 저장돼 있으니 배송이 나간다고 믿지만, 송장을 붙일
// 택배사가 목록에 없다. **화면 둘이 서로 다른 사실을 말하고, 어느 쪽도 틀렸다고 말하지 않는다.**
//
// [해결 — 방향을 하나로 못 박는다]
//   정본  : 배송 정책 (Carrier.code)          — '이 택배사를 우리가 쓰는가'
//   참조  : 연동 카탈로그 (carrierCode)        — '그 택배사를 부를 자격증명이 있는가'
// 참조 쪽이 정본에게 **묻는다**. 그래서 정책에서 택배사가 사라지면 연동 상세가 곧바로 그 사실을
// 말한다(등록돼 있지 않습니다). 어긋남이 조용히 성립할 자리가 없다.
//
// [왜 페이지가 직접 묻지 않는가]
// `pages/settings → pages/products` 는 페이지 간 결합이다(code-quality 축1 · blocker · 임계값 0건).
// 원장을 읽는 조회기는 이미 공통 층에 있다(./shipment.ts 의 carrierCatalog) — 그 조회기를
// `src/wiring.ts` 가 배송 정책에 꽂는다. 이 파일은 **그 위에 질문 하나를 얹을 뿐**이고,
// 새 등록 지점을 만들지 않는다(등록 지점이 둘이면 어느 쪽이 배선됐는지 아무도 답하지 못한다).
//
// [모르면 null — '등록 안 됨' 이 아니다]
// 조회기가 안 꽂혔거나 목록을 못 읽었을 때 'missing' 을 돌려주면, 화면은 **운영자가 할 일이
// 있다**고 말한다(배송 정책에 가서 등록하세요). 그런데 실제로는 이미 등록돼 있을 수 있다 —
// 우리가 못 읽었을 뿐이다. 그래서 모르는 것은 모른다고 말한다(./shipping-policy.ts 와 같은 규약).
// ─────────────────────────────────────────────────────────────────────────────
import { carrierCatalog } from './shipment';
import type { Carrier } from './shipment';

/**
 * 배송 정책이 이 택배사를 어떻게 알고 있는가.
 *
 * `inactive` 를 `active` 와 뭉치지 않는 이유: 끈 택배사는 **새 송장의 선택지에서 빠진다**
 * (./shipment.ts 의 Carrier.active). 자격증명이 저장돼 있어도 그 택배사로는 아무것도 나가지
 * 않으므로, 연동만 보고 '된다' 고 읽으면 안 된다.
 */
export type CarrierRegistrationState = 'active' | 'inactive' | 'missing';

export interface CarrierPolicyLink {
  readonly state: CarrierRegistrationState;
  /** 등록돼 있으면 그 택배사 — `missing` 이면 null. 이름은 **정책의 것**을 쓴다 */
  readonly carrier: Carrier | null;
}

/**
 * 이 연동 코드에 해당하는 택배사가 배송 정책에 등록돼 있는가 — **모르면 null.**
 *
 * 대조 키는 `Carrier.code` 다. 이름으로 맞추지 않는다: 이름은 사람이 읽는 표기라 언제든 바뀌고
 * ('대한통운' → 'CJ대한통운'), 바뀌는 값을 키로 쓰면 어느 날 조용히 어긋난다(./shipment.ts 의
 * Carrier 머리말이 같은 이유로 code 를 식별자로 못박았다).
 *
 * 대소문자와 앞뒤 공백은 무시한다 — 코드는 운영자가 손으로 넣는 값이고, 'cjgls' 와 'CJGLS' 가
 * 다른 택배사일 리는 없다. 그 외의 표기 차이는 **맞추지 않는다**(하이픈 유무까지 봐주기
 * 시작하면 무엇이 같은 코드인지 아무도 답하지 못한다).
 */
export function carrierPolicyLink(code: string): CarrierPolicyLink | null {
  const wanted = code.trim().toUpperCase();
  if (wanted === '') return null;

  const list = carrierCatalog();
  if (list === null) return null;

  const carrier = list.find((item) => item.code.trim().toUpperCase() === wanted);
  if (carrier === undefined) return { state: 'missing', carrier: null };

  return { state: carrier.active ? 'active' : 'inactive', carrier };
}
