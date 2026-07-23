// 상품 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 문자열 숫자 필드(판매가·할인값)는 입력 중 원값을 보존하려 문자열로 받고 여기서 정수 형식을 판정한다.
// 옵션/SKU(variants)는 매트릭스 컴포넌트가 숫자로 관리하므로 배열·범위만 확인한다.
//
// ┌ [잠긴 칸은 검증하지 않는다 — 왜 스키마가 결제 설정을 읽는가] ────────────────┐
// │ 결제 연동이 없으면 판매가·할인·과세 입력이 잠긴다(resolvePriceDisplay).       │
// │ 그런데 **저장된 값은 지우지 않는다** — 잠기기 전에 넣어 둔 할인 999% 같은 값이  │
// │ 그대로 남아 있을 수 있다. 그 값을 계속 검증하면 손댈 수 없는 칸 때문에 저장이   │
// │ 영원히 거절된다(상품명만 고치려 해도 막힌다).                                 │
// │                                                                            │
// │ 예전에는 이 사실이 폼 값(`priceDisplay`)에 실려 있어 스키마가 값만 보면 됐다.  │
// │ 그 축을 걷어냈으므로 **같은 사실을 같은 정본에서 읽는다** — 화면(ProductForm-  │
// │ Page)이 잠금을 그릴 때 부르는 함수를 스키마도 그대로 부른다. 조건을 여기서 다시 │
// │ 적으면 '입력은 잠겼는데 검증은 요구하는' 화면이 생긴다.                        │
// └────────────────────────────────────────────────────────────────────────────┘
import { richTextLength } from '@tds/ui';
import * as z from 'zod/mini';

import { readPaymentSettings } from '../../../shared/commerce/payment-settings';
import { resolvePriceDisplay } from '../../../shared/commerce/price-display';
import { requiredImage, requiredText } from '../../../shared/crud';
import {
  MAX_PRODUCT_IMAGES,
  MAX_TAGS,
  PRODUCT_BRAND_MAX,
  PRODUCT_CODE_MAX,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_NAME_MAX,
  PRODUCT_POINTS_RATE_MAX,
  PRODUCT_PRICE_MAX,
  PRODUCT_STOCK_MAX,
} from '../_shared/store';

const INT_RE = /^\d+$/;

/**
 * 지금 금액 칸이 잠겨 있는가 — **화면과 같은 함수의 같은 필드**를 읽는다.
 *
 * 파싱할 때마다 부른다(모듈 로드 시점에 굳히지 않는다): 결제 설정은 설정 화면의 저장으로 바뀌고,
 * 그 뒤의 검증은 곧바로 새 답을 써야 한다. `amountFieldsLocked` 는 `kind === 'inquiry'` 와 언제나
 * 같은 값이다(price-display.ts) — 여기서는 '입력' 을 다루므로 그 이름을 부른다.
 */
const amountFieldsLocked = (): boolean =>
  resolvePriceDisplay(readPaymentSettings()).amountFieldsLocked;

const optionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(z.string()),
});

const variantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  optionValues: z.array(z.string()),
  addPrice: z.number(),
  stock: z.number(),
  soldOut: z.boolean(),
});

export const productSchema = z
  .object({
    name: requiredText('상품명', PRODUCT_NAME_MAX),
    code: requiredText('상품코드', PRODUCT_CODE_MAX),
    categoryId: z
      .string()
      .check(z.refine((value) => value.trim() !== '', { error: '카테고리를 선택하세요.' })),
    brand: z.string().check(
      z.refine((value) => value.trim().length <= PRODUCT_BRAND_MAX, {
        error: `브랜드는 ${String(PRODUCT_BRAND_MAX)}자를 넘을 수 없어요.`,
      }),
    ),
    // 비어 있는 것을 여기서 막지 않는다 — 결제 연동이 없는 동안에는 판매가 칸이 잠겨 값을 넣을 수
    // 없고 표시도 '가격문의' 로 대체된다. 그 판정은 결제 설정을 함께 보는 아래 .check 가 한다.
    price: z.string().check(
      z.refine((value) => value.trim() === '' || INT_RE.test(value.trim()), {
        error: '판매가는 숫자만 입력할 수 있어요.',
      }),
      z.refine((value) => Number(value.trim() || '0') <= PRODUCT_PRICE_MAX, {
        error: '판매가가 허용 범위를 넘었어요.',
      }),
    ),
    discountType: z.enum(['none', 'amount', 'percent']),
    discountValue: z.string(),
    taxable: z.boolean(),
    saleStatus: z.enum(['on_sale', 'sold_out', 'stopped']),
    displayed: z.boolean(),
    shipping: z.object({
      method: z.enum(['courier', 'direct', 'pickup']),
      feeType: z.enum(['free', 'paid', 'conditional']),
      fee: z.string(),
      freeThreshold: z.string(),
    }),
    // 상품별 적립 설정 — 값의 의미가 mode 에 달려 있어 범위 판정은 아래 .check 가 맡는다
    points: z.object({
      mode: z.enum(['rate', 'fixed', 'none']),
      rate: z.string(),
      amount: z.string(),
    }),
    // 쿠폰 사용 설정 — 값의 의미가 usable/mode 에 달려 있어 목록 필요 여부는 아래 .check 가 맡는다
    coupons: z.object({
      usable: z.boolean(),
      mode: z.enum(['all', 'include', 'exclude']),
      couponIds: z.array(z.string()),
    }),
    optionGroups: z.array(optionGroupSchema),
    variants: z.array(variantSchema).check(
      z.refine((values) => values.length > 0, { error: '옵션/재고를 한 줄 이상 구성하세요.' }),
      z.refine(
        (values) =>
          values.every((variant) => variant.stock >= 0 && variant.stock <= PRODUCT_STOCK_MAX),
        { error: `재고는 0 이상 ${String(PRODUCT_STOCK_MAX)} 이하로 입력하세요.` },
      ),
      // 추가금액 음수 금지(모순 입력 차단)
      z.refine((values) => values.every((variant) => variant.addPrice >= 0), {
        error: '옵션 추가금액은 0원 이상이어야 해요.',
      }),
      // SKU 중복 금지 — 재고 집계·주문 매핑이 깨지지 않게 조합별 SKU 는 유일해야 한다
      z.refine(
        (values) => {
          const skus = values.map((variant) => variant.sku.trim()).filter((sku) => sku !== '');
          return new Set(skus).size === skus.length;
        },
        { error: 'SKU 코드가 중복되었어요. 조합별로 서로 다른 SKU 를 입력하세요.' },
      ),
    ),
    coverImageUrl: requiredImage('대표 이미지'),
    imageUrls: z.array(z.string()).check(
      z.refine((values) => values.length <= MAX_PRODUCT_IMAGES, {
        error: `상세 이미지는 최대 ${String(MAX_PRODUCT_IMAGES)}장까지 등록할 수 있어요.`,
      }),
    ),
    // 상세설명은 RichTextField 가 받는 **HTML** 이다 — 상한은 마크업이 아니라 평문 길이에 건다.
    // value.length 로 재면 '굵게' 한 번에 <strong></strong> 17자가 붙어 사용자가 쓰지도 않은
    // 글자수로 제출이 막힌다. 카운터(RichTextField)와 같은 함수(richTextLength)로 판정해야
    // 화면의 'N/2000' 과 검증이 어긋나지 않는다.
    description: z.string().check(
      z.refine((value) => richTextLength(value) <= PRODUCT_DESCRIPTION_MAX, {
        error: `상세설명은 ${String(PRODUCT_DESCRIPTION_MAX)}자를 넘을 수 없어요.`,
      }),
    ),
    tags: z.array(z.string()).check(
      z.refine((values) => values.length <= MAX_TAGS, {
        error: `검색 태그는 최대 ${String(MAX_TAGS)}개까지 등록할 수 있어요.`,
      }),
    ),
  })
  .check((ctx) => {
    // 판매가 필수 여부는 **결제 연동 상태가 정한다**. 금액을 노출하는 사이트는 값이 있어야 하고,
    // 연동이 없는 동안에는 칸 자체가 잠겨 있어(값은 견적·문의로 정해진다) 비어 있어도 저장된다.
    if (amountFieldsLocked()) return;
    if (ctx.value.price.trim() !== '') return;
    ctx.issues.push({
      code: 'custom',
      input: ctx.value.price,
      path: ['price'],
      message: '판매가를 입력하세요.',
    });
  })
  .check((ctx) => {
    // 할인값 — 할인 방식에 따라 범위가 다르다(정률 1~100%, 정액 1~판매가 미만).
    const { discountType, discountValue, price } = ctx.value;
    // [잠긴 값은 검증하지 않는다] 결제 연동이 없으면 할인 입력이 잠기고 값은 보존된다.
    // 그 상태에서 옛 할인값을 검증하면 손댈 수 없는 필드 때문에 저장이 막힌다.
    if (amountFieldsLocked()) return;
    if (discountType === 'none') return;
    const raw = discountValue.trim();
    if (raw === '' || !INT_RE.test(raw)) {
      ctx.issues.push({
        code: 'custom',
        input: discountValue,
        path: ['discountValue'],
        message: '할인값은 숫자만 입력할 수 있어요.',
      });
      return;
    }
    const value = Number(raw);
    if (discountType === 'percent' && (value < 1 || value > 100)) {
      ctx.issues.push({
        code: 'custom',
        input: discountValue,
        path: ['discountValue'],
        message: '할인율은 1% 이상 100% 이하로 입력하세요.',
      });
      return;
    }
    if (discountType === 'amount') {
      const base = INT_RE.test(price.trim()) ? Number(price.trim()) : 0;
      if (value < 1 || value >= base) {
        ctx.issues.push({
          code: 'custom',
          input: discountValue,
          path: ['discountValue'],
          message: '할인 금액은 1원 이상 판매가 미만으로 입력하세요.',
        });
      }
    }
  })
  .check((ctx) => {
    // 적립금 — 방식에 따라 필요한 값이 다르다(정률이면 적립률, 정액이면 적립액, 미적용이면 없음).
    const { mode, rate, amount } = ctx.value.points;

    if (mode === 'rate') {
      const raw = rate.trim();
      if (
        raw === '' ||
        !INT_RE.test(raw) ||
        Number(raw) < 1 ||
        Number(raw) > PRODUCT_POINTS_RATE_MAX
      ) {
        ctx.issues.push({
          code: 'custom',
          input: rate,
          path: ['points', 'rate'],
          message: `적립률은 1% 이상 ${String(PRODUCT_POINTS_RATE_MAX)}% 이하로 입력하세요.`,
        });
      }
      return;
    }

    if (mode === 'fixed') {
      const raw = amount.trim();
      if (raw === '' || !INT_RE.test(raw) || Number(raw) < 1) {
        ctx.issues.push({
          code: 'custom',
          input: amount,
          path: ['points', 'amount'],
          message: '적립액을 1원 이상 입력하세요.',
        });
      }
    }
  })
  .check((ctx) => {
    // 쿠폰 — '선택한 쿠폰만' 이라고 해 놓고 아무것도 고르지 않으면 그 설정은 아무 말도 하지 않는다.
    // (include 로 비워 두면 모든 쿠폰이 막히고, exclude 로 비워 두면 아무것도 막히지 않는다 —
    //  둘 다 운영자가 의도한 '선택' 이 아니라 미완성이다.)
    const { usable, mode, couponIds } = ctx.value.coupons;
    if (!usable || mode === 'all' || couponIds.length > 0) return;
    ctx.issues.push({
      code: 'custom',
      input: couponIds,
      path: ['coupons', 'couponIds'],
      message:
        mode === 'include'
          ? '허용할 쿠폰을 한 개 이상 선택하세요. 비워 두면 모든 쿠폰이 막혀요.'
          : '제외할 쿠폰을 한 개 이상 선택하세요.',
    });
  })
  .check((ctx) => {
    // 배송비 — 유료/조건부면 기본 배송비가 필요하고, 조건부면 무료 기준 금액도 필요하다.
    const { feeType, fee, freeThreshold } = ctx.value.shipping;
    if (
      feeType !== 'free' &&
      (fee.trim() === '' || !INT_RE.test(fee.trim()) || Number(fee.trim()) < 1)
    ) {
      ctx.issues.push({
        code: 'custom',
        input: fee,
        path: ['shipping', 'fee'],
        message: '기본 배송비를 1원 이상 입력하세요.',
      });
    }
    if (
      feeType === 'conditional' &&
      (freeThreshold.trim() === '' ||
        !INT_RE.test(freeThreshold.trim()) ||
        Number(freeThreshold.trim()) < 1)
    ) {
      ctx.issues.push({
        code: 'custom',
        input: freeThreshold,
        path: ['shipping', 'freeThreshold'],
        message: '무료배송 기준 금액을 1원 이상 입력하세요.',
      });
    }
  });

export type ProductFormValues = z.infer<typeof productSchema>;
