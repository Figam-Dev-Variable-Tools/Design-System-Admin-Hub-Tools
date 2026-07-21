// 결제(PG) 설정 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
//
// [입력을 막지 않고 제출에서 판정한다] 다른 설정 화면과 같은 규약이다(../site/validation.ts).
// 백엔드가 붙어도 이 스키마를 그대로 계약 검증에 쓴다.
//
// ┌ 이 화면의 검증은 전부 **교차 필드**다 ────────────────────────────────────┐
// │ 어떤 칸이 필수인지가 스위치 하나(usePg)에 달려 있다:                        │
// │   켜짐 → 상점 ID 와 결제수단이 있어야 결제창을 열 수 있다                    │
// │   꺼짐 → 고객에게 보일 안내 문구가 있어야 '문의하기' 가 말이 된다             │
// │ 그래서 칸별 필수 표시가 아니라 스키마의 check 가 판정한다 — 스위치를 내렸다   │
// │ 올릴 때마다 필수 여부가 바뀌는데, 그 조건을 화면 곳곳에 다시 적으면 갈라진다.  │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [형식은 검사하지 않는다] 상점 ID 의 길이·문자셋·접두어를 판정하지 않는다. PG 사마다 다르고
// (`imp_…`·영문 8자·숫자 10자) 어느 형식도 문서로 보장받지 못했다 — 형식을 박아 두면 PG 사가
// 채번 규칙을 바꾸는 날 멀쩡한 값이 거절된다. 막는 것은 **비어 있음**과 **길이 폭주** 둘뿐이다
// (../api-keys/validation.ts 가 세운 것과 같은 규율).
import * as z from 'zod/mini';

import {
  PAYMENT_METHODS,
  PAYMENT_MODES,
  PAYMENT_PROVIDERS,
} from '../../../shared/commerce/payment-settings';

/** 상점 ID 상한 — 형식 판정이 아니라 붙여넣기 사고(문서 한 편이 들어오는 것)를 막는 숫자다 */
export const MERCHANT_ID_MAX = 60;

/** 안내 문구 상한 — 상품 카드 아래 한 문단에 들어가는 길이다 */
export const INQUIRY_GUIDE_MAX = 200;

export const paymentSettingsSchema = z
  .object({
    usePg: z.boolean(),
    provider: z.enum(PAYMENT_PROVIDERS),
    merchantId: z.string(),
    mode: z.enum(PAYMENT_MODES),
    methods: z.array(z.enum(PAYMENT_METHODS)),
    inquiryGuide: z.string(),
  })
  .check((ctx) => {
    const draft = ctx.value;

    // 길이는 켜짐과 무관하게 본다 — 꺼진 채로도 저장되는 값이라 폭주를 그대로 두면 안 된다
    if (draft.merchantId.trim().length > MERCHANT_ID_MAX) {
      ctx.issues.push({
        code: 'custom',
        input: draft.merchantId,
        path: ['merchantId'],
        message: `상점 ID 는 ${String(MERCHANT_ID_MAX)}자를 넘을 수 없습니다.`,
      });
    }

    if (draft.usePg) {
      // 상점 ID 가 없으면 결제창이 뜨지 않는다 — 그 상태로 저장하면 고객은 눌러도 아무 일이
      // 없는 '구매하기' 를 만난다. 규칙(shared/commerce)도 같은 경우를 문의로 떨어뜨린다.
      if (draft.merchantId.trim() === '') {
        ctx.issues.push({
          code: 'custom',
          input: draft.merchantId,
          path: ['merchantId'],
          message: 'PG 결제를 켰다면 상점 ID 를 입력하세요. PG 사에서 발급한 값입니다.',
        });
      }

      // 결제수단이 하나도 없으면 결제창이 열려도 고를 것이 없다
      if (draft.methods.length === 0) {
        ctx.issues.push({
          code: 'custom',
          input: draft.methods,
          path: ['methods'],
          message: '결제수단을 하나 이상 선택하세요.',
        });
      }
    } else if (draft.inquiryGuide.trim() === '') {
      // 문의로 전환한 동안 이 문구가 비면, 고객은 왜 살 수 없는지 모른 채 '문의하기' 만 본다
      ctx.issues.push({
        code: 'custom',
        input: draft.inquiryGuide,
        path: ['inquiryGuide'],
        message: 'PG 결제를 끄면 고객에게 보일 안내 문구가 필요합니다.',
      });
    }

    if (draft.inquiryGuide.trim().length > INQUIRY_GUIDE_MAX) {
      ctx.issues.push({
        code: 'custom',
        input: draft.inquiryGuide,
        path: ['inquiryGuide'],
        message: `안내 문구는 ${String(INQUIRY_GUIDE_MAX)}자를 넘을 수 없습니다.`,
      });
    }
  });

/**
 * 폼이 다루는 값.
 *
 * 공용 계약(shared/commerce 의 PaymentSettings)과 필드가 같지만 **배열이 가변**이라는 점이 다르다 —
 * RHF 는 폼 값을 갈아끼우므로 readonly 배열을 그대로 담을 수 없다. 저장으로 나갈 때는 그대로
 * 공용 타입에 대입된다(가변 → readonly 방향은 안전하다).
 */
export type PaymentSettingsValues = z.infer<typeof paymentSettingsSchema>;
