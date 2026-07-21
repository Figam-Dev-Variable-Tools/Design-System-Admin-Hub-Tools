// 결제(PG) 연동 설정 — 상품·프로그램이 **함께** 읽는 판매 방식의 정본
//
// ┌ 이 파일이 정하는 한 가지 ────────────────────────────────────────────────┐
// │ 고객이 상품 카드/프로그램 상세에서 누르는 버튼이 **결제로 가는가, 문의로     │
// │ 가는가**. 그 갈림은 설정 한 개(usePg)에서 나온다:                          │
// │   PG 사용  → 상품 '구매하기' · 프로그램 '후원하기'                         │
// │   PG 미사용 → 둘 다 '문의하기' (상품 문의 · 프로그램 문의로 들어온다)        │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [왜 pages 가 아니라 shared 인가] 이 값을 읽는 화면은 서로 다른 페이지 트리에 있다 —
// pages/products(상품 폼)와 pages/programs(프로그램 상세), 그리고 값을 고치는 pages/settings.
// 한쪽이 다른 쪽의 모듈을 가져오면 그 순간 페이지 간 결합(code-quality 축1 · blocker)이고,
// '상품을 지우면 프로그램이 죽는' 구조가 된다. 그래서 판매 방식이라는 **사실**은 공통 층이 갖고
// 화면 셋은 서로를 끝까지 모른다 (shared/fixtures/ai-providers.ts 와 같은 판단이다).
//
// [백엔드 0] 실제 HTTP 호출은 한 줄도 없다. 모듈 지역 변수 하나가 '지금 저장된 설정' 이고,
// 설정 화면의 저장이 그 값을 바꾼다. 연동 지점은 아래 TODO(backend) 다.

/* ── 값 ────────────────────────────────────────────────────────────────────── */

/** 국내 PG 사 — 카탈로그가 늘어나도 이 목록만 넓힌다(화면은 이 목록에서 선택지를 만든다) */
export const PAYMENT_PROVIDERS = ['toss', 'inicis', 'nice', 'kakaopay'] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/** 결제수단 — PG 계약에서 실제로 켜고 끄는 단위다(카드만 열고 가상계좌를 닫는 운영이 흔하다) */
export const PAYMENT_METHODS = ['card', 'transfer', 'vbank', 'phone', 'easypay'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** 테스트/운영 — 같은 상점 ID 라도 실제로 돈이 움직이는지가 갈린다 */
export const PAYMENT_MODES = ['test', 'live'] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

/**
 * 표시명 — **여기 한 벌만 둔다.**
 *
 * 설정 화면의 선택지 라벨과 상품/프로그램 화면의 안내 문구가 같은 이름을 말해야 한다.
 * 두 벌이 되면 PG 사를 하나 추가한 날 한쪽에만 늘어나고, 운영자는 화면마다 다른 이름을 본다.
 */
export const PAYMENT_PROVIDER_LABEL: Readonly<Record<PaymentProvider, string>> = {
  toss: '토스페이먼츠',
  inicis: 'KG이니시스',
  nice: '나이스페이먼츠',
  kakaopay: '카카오페이',
};

export const PAYMENT_METHOD_LABEL: Readonly<Record<PaymentMethod, string>> = {
  card: '신용·체크카드',
  transfer: '계좌이체',
  vbank: '가상계좌',
  phone: '휴대폰 결제',
  easypay: '간편결제',
};

export const PAYMENT_MODE_LABEL: Readonly<Record<PaymentMode, string>> = {
  test: '테스트',
  live: '운영',
};

/** 결제(PG) 설정 1건 — 설정 화면이 저장하고, 상품·프로그램이 읽는다 */
export interface PaymentSettings {
  /** PG 로 판매하는가. 이 스위치 하나가 아래 CTA 규칙 전체를 뒤집는다 */
  readonly usePg: boolean;
  readonly provider: PaymentProvider;
  /** PG 사가 발급한 상점 ID(MID) — PG 를 켠 상태로 비어 있으면 결제창을 열 수 없다 */
  readonly merchantId: string;
  readonly mode: PaymentMode;
  readonly methods: readonly PaymentMethod[];
  /** PG 를 끈 동안 고객에게 보일 안내 문구 — 왜 지금은 살 수 없는지 말한다 */
  readonly inquiryGuide: string;
}

/* ── CTA 규칙 (이 파일의 핵심) ─────────────────────────────────────────────── */

/** 이 CTA 를 그리는 쪽이 상품인가 프로그램인가 — 사는 말과 후원하는 말이 다르다 */
export type CommerceDomain = 'product' | 'program';

/** 버튼이 하는 일 — 결제로 가는가(purchase), 문의로 가는가(inquiry) */
export type CheckoutCtaKind = 'purchase' | 'inquiry';

/**
 * 지금 그려야 할 CTA 한 벌.
 *
 * 내보내지 않는다 — 호출부는 checkoutCta 의 결과를 그대로 쓰고 타입 이름을 부르지 않는다.
 * 쓰지 않는 공개 표면을 만들지 않는다는 것이 이 리포의 규약이다(shared/ui/README 머리말).
 */
interface CheckoutCta {
  readonly kind: CheckoutCtaKind;
  /** 고객이 보는 버튼 글자 */
  readonly label: string;
  /** 왜 지금 이 버튼인지 — 운영자 화면이 그대로 힌트로 쓴다(설정을 오해한 채 저장하지 않게) */
  readonly reason: string;
  /** 문의로 갈 때 그 문의가 쌓이는 관리 화면. 결제로 갈 때는 갈 곳이 없다(null) */
  readonly inquiryPath: string | null;
}

/** 결제하지 않는 동안 문의가 쌓이는 곳 — 도메인마다 창구가 다르다 */
export const INQUIRY_PATH: Readonly<Record<CommerceDomain, string>> = {
  product: '/products/inquiries',
  program: '/programs/inquiries',
};

/** 이 규칙을 바꾸는 유일한 화면 — 안내 문구가 운영자를 여기로 보낸다 */
export const PAYMENT_SETTINGS_PATH = '/settings/payment';

/** 결제 CTA 의 도메인별 글자. 문의는 도메인이 달라도 하는 일이 같아 한 낱말이다 */
const PURCHASE_LABEL: Readonly<Record<CommerceDomain, string>> = {
  product: '구매하기',
  program: '후원하기',
};

const INQUIRY_LABEL = '문의하기';

/**
 * 지금 이 설정으로 **결제를 열 수 있는가**.
 *
 * usePg 만 보지 않는다: 켜 두고 상점 ID 가 비어 있으면 결제창을 띄울 수 없다 —
 * 그 상태에서 '구매하기' 를 그리면 고객은 눌러 놓고 아무 일도 일어나지 않는 버튼을 만난다.
 * 검증(pages/settings/payment/validation.ts)이 그런 저장을 막지만, 규칙 자체도 애매하면
 * 닫는 쪽으로 수렴한다(fail-closed) — 판단이 두 곳에 있어도 결론이 갈리지 않는다.
 */
function pgSellable(settings: PaymentSettings): boolean {
  return settings.usePg && settings.merchantId.trim() !== '';
}

/**
 * 상품·프로그램의 구매 CTA — **파생값이다. 어디에도 저장하지 않는다.**
 *
 * [왜 저장하지 않는가] CTA 를 상품/프로그램마다 들고 있으면 설정 스위치를 내리는 순간
 * 이미 등록된 수백 건이 전부 낡은 값이 된다. 그때 필요한 일괄 갱신은 실패하면 절반만 바뀌고,
 * 절반은 열리지 않는 결제창으로 고객을 보낸다. 사실은 하나(PG 를 쓰는가)이고 버튼은 그 결과다 —
 * 결과를 복제하지 않고 부를 때마다 규칙에서 만든다.
 *
 * [왜 도메인을 인자로 받는가] 규칙은 하나인데 말은 둘이다(구매하기·후원하기). 도메인을 받지
 * 않으면 화면이 각자 라벨을 고르게 되고, 그 순간 '문의하기' 로 바뀌는 조건도 화면마다 갈린다.
 */
export function checkoutCta(settings: PaymentSettings, domain: CommerceDomain): CheckoutCta {
  if (!pgSellable(settings)) {
    return {
      kind: 'inquiry',
      label: INQUIRY_LABEL,
      reason: settings.usePg
        ? 'PG 상점 ID 가 비어 있어 결제창을 열 수 없습니다. 지금은 문의로 받습니다.'
        : 'PG 결제를 쓰지 않도록 설정되어 있어 결제 대신 문의로 받습니다.',
      inquiryPath: INQUIRY_PATH[domain],
    };
  }

  const provider = PAYMENT_PROVIDER_LABEL[settings.provider];

  return {
    kind: 'purchase',
    label: PURCHASE_LABEL[domain],
    // 테스트 모드는 결제창이 뜨지만 돈이 움직이지 않는다 — '연동됨' 과 뭉뚱그리면 운영 전환을 잊는다
    reason:
      settings.mode === 'test'
        ? `${provider} 테스트 모드로 결제창이 열립니다. 실제 결제는 일어나지 않습니다.`
        : `${provider} 결제창이 열립니다.`,
    inquiryPath: null,
  };
}

/* ── 저장소 (모듈 지역 상태 — 설정 화면의 저장이 갱신한다) ─────────────────── */

/** PG 를 끈 상태의 기본 안내 — 운영자가 고칠 수 있다(설정 화면 '문의 전환 안내') */
const DEFAULT_INQUIRY_GUIDE =
  '현재 온라인 결제를 준비 중입니다. 문의를 남겨 주시면 담당자가 확인 후 연락드립니다.';

/**
 * 초기 설정 — 이 앱은 아직 PG 계약이 없다. 그래서 **꺼진 상태에서 출발한다**:
 * 켜져 있는 것으로 시작하면 결제되지 않는 '구매하기' 가 기본값이 된다(FEEDBACK-03).
 */
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  usePg: false,
  provider: 'toss',
  merchantId: '',
  mode: 'test',
  methods: ['card', 'transfer'],
  inquiryGuide: DEFAULT_INQUIRY_GUIDE,
};

let current: PaymentSettings = DEFAULT_PAYMENT_SETTINGS;

// TODO(backend): GET /api/settings/payment · PUT /api/settings/payment
//   PUT 바디 { usePg, provider, merchantId, mode, methods, inquiryGuide } + If-Match: <revision>
//   ⚠ 상점 ID 는 식별자이지 비밀키가 아니다 — PG 시크릿(API 키)은 이 문서에 넣지 않는다.
//     자격증명은 /settings/api-keys 규약(저장 여부만 알고 평문은 돌려주지 않는다)을 따른다.

/** 지금 저장된 설정 — 화면은 렌더 시점에 읽는다(설정이 바뀌면 다음 렌더가 곧바로 새 규칙을 쓴다) */
export function readPaymentSettings(): PaymentSettings {
  return current;
}

/** 설정 화면의 저장이 성공한 뒤에만 부른다 — 실패·409 가 판매 방식을 바꾸면 안 된다 */
export function writePaymentSettings(next: PaymentSettings): void {
  current = next;
}

/** 초기 상태로 되돌린다 — 테스트가 서로의 저장을 물려받지 않게 한다 */
export function resetPaymentSettings(): void {
  current = DEFAULT_PAYMENT_SETTINGS;
}
