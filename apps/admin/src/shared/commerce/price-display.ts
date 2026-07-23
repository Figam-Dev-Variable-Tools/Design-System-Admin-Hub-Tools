// 가격 표시 — **사이트 전역 연동 상태에서 나오는 파생값**
//
// ┌ 축이 둘이었다가 하나가 됐다 — 무엇이 바뀌었나 ────────────────────────────┐
// │ 예전에는 축이 둘이었다:                                                   │
// │   축 A `pgSellable`  : 결제창을 열 수 있는가.  사이트 전역                  │
// │   축 B `priceDisplay`: 이 상품의 금액을 노출하는가. **상품마다 사람이 고름** │
// │ 축 B 는 상품 폼의 라디오('금액 노출' / '가격문의로 대체')로 저장됐다.        │
// │                                                                          │
// │ **운영 요구로 축 B 를 없앴다**: "이렇게 선택하는 게 아니라, 결제 연동이 안 돼 │
// │ 있으면 전부 가격 문의로 대체" — 금액이 이미 설정돼 있어도 그렇고, 프로그램도  │
// │ 같다. 즉 가격 표시는 **고르는 값이 아니라 연동 상태의 결과**다.              │
// │                                                                          │
// │ ⚠ 이 판단은 docs/adr/0014 와 어긋난다(그 ADR 은 "PG 는 쓰지만 이 상품만      │
// │   가격문의" 를 표현하려고 축을 둘로 나눴다). 그 능력은 **설계 근거였지        │
// │   요구사항이 아니었고**(FS-078·BE-078 은 축 B 를 '이 화면 범위 밖' 이라고만  │
// │   적는다), 라디오가 사라지면 아무도 설정할 수 없는 저장값만 남는다 —         │
// │   그것이 이 리포가 가장 싫어하는 '어느 쪽이 진실인지 모르는 값' 이다.        │
// │   ADR 개정은 docs 소유자의 몫이라 여기서는 근거만 남긴다.                    │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 술어는 **하나**다 — 금액 입력 차단과 가격 문의 대체는 같은 사실의 두 얼굴 ──┐
// │ 둘이 갈리면 **금액은 입력되는데 표시는 문의**이거나 그 반대가 생긴다.        │
// │ 그래서 화면들은 `resolvePriceDisplay` 하나만 부르고, 그 결과의 서로 다른     │
// │ 필드를 읽는다: 목록·상세는 `text`, 폼은 `amountFieldsLocked`.                │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [저장하지 않는다] 화면이 그리는 것은 이 함수의 결과이지 어딘가 저장된 '표시 상태' 가 아니다.
// 전역 스위치를 내리는 순간 이미 등록된 수백 건이 낡은 값이 되는 일을 만들지 않는다
// (payment-settings.ts 의 checkoutCta 머리말과 같은 판단).
import { pgSellable, unhealthyCredentialReason } from './payment-settings';
import type { PaymentSettings } from './payment-settings';

/** 결제를 열 수 없을 때 금액 자리에 들어가는 문구 — **정본은 여기 한 벌뿐이다** */
export const DEFAULT_PRICE_INQUIRY_TEXT = '가격문의';

/**
 * 지금 이 사이트의 금액 칸에 무엇이 들어가는가.
 *
 * 내보내지 않는다 — 호출부는 결과를 그대로 쓰고 타입 이름을 부르지 않는다(CheckoutCta 와 같은 규약).
 */
interface ResolvedPriceDisplay {
  /** 금액을 그대로 그리는가(amount), 문구로 대체하는가(inquiry) */
  readonly kind: 'amount' | 'inquiry';
  /** kind === 'inquiry' 일 때 금액 자리에 들어갈 글자. amount 면 빈 문자열 */
  readonly text: string;
  /** 왜 지금 이 표시인지 — 폼의 힌트가 그대로 쓴다(운영자가 오해한 채 저장하지 않게) */
  readonly reason: string;
  /**
   * 금액·할인·과세 **입력을 잠글 것인가**.
   *
   * `kind === 'inquiry'` 와 **항상 같다** — 일부러 그렇다(파일 머리말: 술어는 하나다).
   * 별도 필드로 두는 이유는 호출부가 '표시' 와 '입력' 중 무엇을 하는지 이름으로 드러내기
   * 위해서다. 두 값이 갈릴 수 있는 코드 경로를 만들지 않는다.
   *
   * **잠금은 값을 지우지 않는다** — 연동을 마치면 저장된 판매가·할인율·과세 구분이 그대로
   * 살아난다. 지우면 되돌리는 순간 운영자가 예전 값을 기억으로 복원해야 한다.
   */
  readonly amountFieldsLocked: boolean;
}

/**
 * 지금 금액을 노출할 수 있는가 — **상품·프로그램·설정 화면이 함께 쓰는 단 하나의 술어**.
 *
 * 판정 근거는 `pgSellable` 하나다. 그 함수가 운영자가 말한 세 가지를 이미 접고 있다:
 *   ⓐ PG 미사용 설정        → `usePg === false`
 *   ⓑ 자격증명이 유효하지 않음 → 백엔드만 아는 사실(payment-settings.ts 의 건강 상태 심)
 *   ⓒ 연동이 덜 됨(값이 빔)  → 필수 공개 값·필수 비밀이 채워지지 않음
 *
 * 상품별 정책을 인자로 받지 않는다 — 받을 것이 없어졌다(파일 머리말).
 */
export function resolvePriceDisplay(settings: PaymentSettings): ResolvedPriceDisplay {
  if (pgSellable(settings)) {
    return {
      kind: 'amount',
      text: '',
      reason: '결제 연동이 되어 있어 판매가와 할인가를 그대로 노출해요.',
      amountFieldsLocked: false,
    };
  }

  return {
    kind: 'inquiry',
    text: DEFAULT_PRICE_INQUIRY_TEXT,
    // 왜 잠겼는지 **원인**을 말한다 — '사용할 수 없습니다' 는 아무것도 알려 주지 않는다
    reason: unhealthyCredentialReason(settings),
    amountFieldsLocked: true,
  };
}
