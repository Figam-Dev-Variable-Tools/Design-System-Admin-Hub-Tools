// PG 자격증명 카탈로그 — **어떤 값을 받아야 결제가 성립하는가** 의 정본
//
// ┌ 이 파일이 왜 생겼나 ─────────────────────────────────────────────────────┐
// │ 예전 모델은 `merchantId: string` 한 칸이었다. 그 한 칸으로는 **어느 PG 도    │
// │ 연동되지 않는다** — PG 마다 필요한 값의 개수와 이름이 다르고, 그 절반 이상이 │
// │ 요청 서명(SHA256)의 재료, 즉 **비밀**이다.                                  │
// │                                                                          │
// │ ⚠ 가장 중요한 한 줄: `signKey` · `site_key` · `MerchantKey` 는 이름이 '키'   │
// │   라서 식별자처럼 읽히지만 **전부 서명 재료다**. 유출되면 결제 요청을 위조할  │
// │   수 있다 → 명백히 비밀이다. 이걸 평범한 텍스트 칸으로 만드는 것이 이 화면이 │
// │   저지를 수 있는 최악의 실수다. 그래서 필드마다 `visibility` 를 **필수**로   │
// │   두어, PG 를 추가할 때 "이 값이 비밀인가" 를 한 번은 답하게 만든다.         │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 축이 둘이다 — 'PG 선택' 과 '연동 방식 선택' 은 다른 질문이다 ───────────────┐
// │ 포트원 같은 **통합 게이트웨이**를 쓰면 개별 PG 자격증명이 우리 화면에서       │
// │ 사라진다(포트원 콘솔의 '채널' 안으로 들어간다). 이건 PG 를 고르는 일이 아니라 │
// │ **연동 방식**을 고르는 일이므로 provider 유니온에 섞지 않는다.                │
// │ 대신 `PgConnection` 이 `mode: 'direct' | 'gateway'` 를 **판별자로 갖는       │
// │ 합집합**이다 — OAuth 가 Apple 을 `credentialKind` 로 갈라 낸 것과 같은 판단   │
// │ 이다(pages/settings/oauth/validation.ts 머리말).                            │
// │                                                                          │
// │ 반면 **메타 표는 갈래를 나누지 않는다**: 포트원도 '자격증명 몇 개 + 지원      │
// │ 결제수단 + 웹훅 등록 경로' 라는 같은 질문에 답한다. 표를 둘로 쪼개면 같은     │
// │ 필드 목록이 두 벌이 되고, 한쪽에만 값이 추가되는 날이 온다.                   │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [백엔드 경계] 이 파일은 값의 **모양**만 안다. 실제로 이 값들을 쓰는 일(결제창 세션 생성 ·
// 승인 · 웹훅 수신)은 전부 서버의 몫이다 — 근거는 ./payment-settings.ts 의 TODO(backend).
import type { BrandMarkId } from '../ui/brand-marks';

/* ── 결제수단 · 연동 모드 어휘 ─────────────────────────────────────────────── */

/**
 * 결제수단 — PG 계약에서 실제로 켜고 끄는 단위다(카드만 열고 가상계좌를 닫는 운영이 흔하다).
 *
 * **여기 있는 것은 어휘일 뿐 선택지가 아니다.** 무엇을 고를 수 있는지는 PG 마다 다르고
 * (`supportedMethods`), 화면의 체크박스는 그 목록에서 파생된다 — 고정 5칸을 그리면
 * 카카오페이를 고른 운영자에게 '가상계좌' 를 권하는 화면이 된다.
 */
export const PAYMENT_METHODS = ['card', 'transfer', 'vbank', 'phone', 'easypay'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Readonly<Record<PaymentMethod, string>> = {
  card: '신용·체크카드',
  transfer: '계좌이체',
  vbank: '가상계좌',
  phone: '휴대폰 결제',
  easypay: '간편결제',
};

/** 테스트/운영 — 같은 상점 정보라도 실제로 돈이 움직이는지가 갈린다 */
export const PAYMENT_MODES = ['test', 'live'] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABEL: Readonly<Record<PaymentMode, string>> = {
  test: '테스트',
  live: '운영',
};

/* ── 계약 상태 ─────────────────────────────────────────────────────────────── */

/**
 * PG 계약이 지금 어디까지 왔는가.
 *
 * **우리가 알 수 있는 사실이 아니라 운영자가 손으로 적는 값이다** — PG 사에 계약 상태를 묻는
 * API 는 없다. 그래서 화면이 이 사실을 밝힌다(지어낸 상태를 사실처럼 보이지 않게).
 * 값을 다 넣었는데도 실결제가 열리지 않는 이유가 대개 여기 있고, 이 축이 없으면 그 이유를
 * 화면이 말할 자리가 없다.
 */
export const PG_CONTRACT_STATUSES = ['none', 'applied', 'contracted', 'reviewing', 'live'] as const;

export type PgContractStatus = (typeof PG_CONTRACT_STATUSES)[number];

export const PG_CONTRACT_STATUS_LABEL: Readonly<Record<PgContractStatus, string>> = {
  none: '계약 전',
  applied: '가맹 신청함',
  contracted: '계약 완료',
  reviewing: '카드사 심사 중',
  live: '실결제 오픈',
};

/** 상태마다 '지금 무엇을 기다리는가' — 목록/상세가 같은 문장을 쓴다 */
export const PG_CONTRACT_STATUS_HINT: Readonly<Record<PgContractStatus, string>> = {
  none: '아직 PG 사와 계약하지 않았어요. 테스트 값으로 결제창을 띄워 보는 것까지만 돼요.',
  applied: '가맹 신청을 넣고 심사 결과를 기다리는 중이에요.',
  contracted: 'PG 사와 계약은 끝났지만 카드사 심사가 남아 있을 수 있어요.',
  reviewing: '카드사 심사가 진행 중이에요. 보통 2주 안팎이 걸려요.',
  live: '실결제가 열려 있어요.',
};

/* ── 자격증명 필드 ─────────────────────────────────────────────────────────── */

/**
 * 자격증명 한 칸의 **명세**. 화면은 이 목록을 그대로 그린다 — PG 별 분기를 화면에 쓰지 않는다.
 */
export interface PgCredentialField {
  /** 저장 키 — `PgConnection` 의 publicValues / storedSecrets 가 쓰는 이름 */
  readonly key: string;
  /**
   * 라벨은 **PG 공식 문서가 부르는 이름 그대로** 쓴다.
   * 우리 말로 고쳐 부르면 운영자가 PG 콘솔에서 그 단어를 못 찾아 헤맨다.
   */
  readonly label: string;
  /** 이 PG 를 쓰려면 반드시 있어야 하는가 */
  readonly required: boolean;
  /**
   * 공개(값을 저장하고 화면에 되돌려준다) / 비밀(저장 여부만 안다).
   *
   * 판단 기준은 '이름' 이 아니라 **용도**다 — 요청 서명에 들어가는 값은 이름이 '키' 든
   * '아이디' 든 전부 secret 이다(파일 머리말).
   */
  readonly visibility: 'public' | 'secret';
  /** PG 콘솔의 어디에서 이 값을 받는가 */
  readonly consoleHint: string;
  /**
   * PG 가 **문서로 공개한** 테스트 고정값. 없으면 null.
   *
   * 비밀 필드에는 넣지 않는다 — 문서에 공개된 테스트 시크릿이라 해도, 비밀 칸에 예시 값을
   * 그리면 '이런 모양이면 된다' 는 학습이 실 운영 값 취급을 헐겁게 만든다.
   */
  readonly testValue: string | null;
}

/** 웹훅(노티) URL 을 **어디서 등록하는가** — 셀프서비스가 아닌 PG 가 있다 */
export type PgWebhookRegistration = 'console' | 'sales-contact' | 'preregistered-url' | 'none';

export const PG_WEBHOOK_REGISTRATION_TEXT: Readonly<Record<PgWebhookRegistration, string>> = {
  console: 'PG 콘솔에서 직접 등록해요.',
  'sales-contact': '콘솔에 등록 화면이 없어요. 영업담당자에게 요청해야 등록돼요.',
  'preregistered-url': '결제 요청 전에 URL 을 미리 등록해 두어야 해요.',
  none: '이 결제 방식에는 우리가 등록할 웹훅이 없어요(결제 결과는 리디렉션과 승인 API 로 받아요).',
};

/* ── 우리가 PG 콘솔에 **넣어 줘야 하는** 값 ────────────────────────────────── */

/**
 * PG 콘솔에 등록할 **우리 쪽 주소**.
 *
 * ┌ 자격증명과 방향이 반대다 — 그래서 타입이 다르다 ──────────────────────────┐
 * │ `PgCredentialField` 는 **PG → 우리**로 오는 값이라 입력칸이다.               │
 * │ 이것은 **우리 → PG** 로 가는 값이라 입력칸이 아니라 **읽고 복사하는 값**이다. │
 * │ 둘을 같은 모양으로 그리면 운영자는 이 칸도 어딘가에서 받아 와 채워야 하는 줄  │
 * │ 알고 PG 콘솔을 뒤진다 — 실제로는 우리가 알려 주는 값인데.                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 값은 **사이트 오리진에서 파생**한다. 손으로 적어 두면 도메인이 바뀌는 날 조용히 낡는다.
 */
export interface PgConsoleInput {
  readonly key: string;
  /** PG 콘솔이 이 칸을 부르는 이름 그대로 */
  readonly label: string;
  /** 오리진 뒤에 붙는 우리 쪽 경로 */
  readonly path: string;
  /** 어디에 넣는지 · 무엇을 주의할지 */
  readonly note: string;
}

/**
 * 이 대상에 등록할 주소들 — 오리진을 받아 완성한다.
 *
 * ⚠ **이 경로들은 아직 백엔드에 없다.** 화면이 그 사실을 함께 말한다(PgProviderPage) —
 * 지금 복사해 PG 콘솔에 넣으면 통보가 404 로 떨어진다. 주소를 숨기면 운영자는 '무엇을
 * 넣어야 하는지' 조차 모르고, 숨기지 않고 되는 척하면 더 나쁘다. 그래서 **보여 주되
 * 아직 살아 있지 않다고 적는다**(TODO(backend) 는 ./payment-settings.ts).
 */
export function pgConsoleInputs(target: PgTargetId, origin: string): readonly PgConsoleInput[] {
  return pgMeta(target).consoleInputs.map((input) => ({
    ...input,
    path: `${origin}${input.path}`,
  }));
}

/* ── PG 카탈로그 ───────────────────────────────────────────────────────────── */

/**
 * 개별 PG 와 **직접** 연동하는 경우의 대상들.
 *
 * [카카오페이·네이버페이를 뺀 자리] 둘은 간편결제 하나만 지원하는 유일한 항목이었고,
 * 운영 요구로 목록에서 내렸다. **그 결과 남은 다섯이 전부 결제수단 다섯을 지원한다** —
 * `supportedMethods` 파생은 코드로 남아 있지만 **그것을 증명하는 데이터가 없어졌다**.
 * 다시 갈리는 PG 를 더할 때 이 사실을 기억할 것(근거는 ./pg-catalog.test.ts 의 같은 주석).
 */
export const PG_DIRECT_PROVIDERS = ['toss', 'inicis', 'kcp', 'nice'] as const;

export type PgProvider = (typeof PG_DIRECT_PROVIDERS)[number];

/** 통합 게이트웨이 — 개별 PG 자격증명이 **우리 화면에서 사라지는** 연동 방식 */
export const PG_GATEWAYS = ['portone'] as const;

export type PgGateway = (typeof PG_GATEWAYS)[number];

/**
 * 화면이 타일 하나로 그리는 단위. 직접연동 PG 넷 + 게이트웨이 하나.
 *
 * 연결 자체는 `PgConnection` 이 판별 합집합으로 갈라 두지만(파일 머리말), **고를 수 있는
 * 대상의 목록**은 하나여야 한다 — 두 벌이면 타일 목록도 두 벌이 되고, 그때 '사용 중' 판정이
 * 어느 목록을 보느냐에 따라 갈린다.
 */
export const PG_TARGETS = [...PG_DIRECT_PROVIDERS, ...PG_GATEWAYS] as const;

export type PgTargetId = PgProvider | PgGateway;

export interface PgProviderMeta {
  readonly id: PgTargetId;
  /** 운영자가 부르는 이름 — 안내 문구에 그대로 끼워 넣는다 */
  readonly label: string;
  /** 직접 연동인가, 게이트웨이인가 — `PgConnection` 의 갈래를 정한다 */
  readonly integrationMode: 'direct' | 'gateway';
  readonly credentials: readonly PgCredentialField[];
  /**
   * 이 PG 가 **결제창에 띄울 수 있는** 수단. 화면의 체크박스는 여기서 파생된다.
   *
   * ⚠ 지금 카탈로그의 다섯 항목은 **전부 다섯 수단을 지원한다** — 간편결제만 있던
   * 카카오페이·네이버페이를 내리면서 갈리는 데이터가 사라졌다. 그래도 파생을 고정 5칸으로
   * 되돌리지 않는다: 되돌리는 순간 다음에 붙는 PG 가 조용히 거짓말을 시작한다.
   */
  readonly supportedMethods: readonly PaymentMethod[];
  /**
   * 지원하긴 하지만 **사전 계약이 있어야 켜지는** 수단.
   * 체크는 됐는데 결제창에 안 뜨는 사고를 막으려고 따로 둔다.
   */
  readonly contractRequiredMethods: readonly PaymentMethod[];
  /** 정기결제(빌링키·배치결제)를 지원하는가 */
  readonly supportsBilling: boolean;
  /**
   * 가상계좌를 지원하는가.
   * `supportedMethods.includes('vbank')` 와 **반드시 일치해야 한다** — 어긋나면 화면과
   * 안내 문구가 다른 말을 한다. 어긋남은 pg-catalog.test.ts 가 막는다.
   */
  readonly supportsVirtualAccount: boolean;
  readonly webhookRegistration: PgWebhookRegistration;
  /** 테스트/운영 환경이 어떻게 갈리는가 — 한 줄 */
  readonly environmentNote: string;
  /** 계약 전에도 테스트 결제창을 띄워 볼 수 있는가(문서화된 테스트 값이 있는가) */
  readonly testableBeforeContract: boolean;
  /**
   * 자격증명이 **아닌** 준비물 — 심사·영업 절차 등. 값을 다 넣어도 결제가 안 되는 이유는
   * 대개 여기 있는데, 이 화면에는 그 사실이 드러날 자리가 없다. 없으면 null.
   */
  readonly consoleNotice: string | null;
  /**
   * 이 회사의 브랜드 마크. **로고를 쓸 근거를 못 찾았으면 null 이다.**
   *
   * 필수 필드인 것이 핵심이다 — PG 를 더할 때마다 "이 회사 로고를 쓸 근거가 있는가" 를
   * 한 번은 묻게 된다. 비슷하게 그린 가짜 로고는 상표 문제이자 거짓 정보다
   * (shared/ui/brand-marks.tsx 머리말).
   */
  readonly brand: BrandMarkId | null;
  /**
   * 벡터를 확보하지 못했을 때 쓰는 **로고 이미지**(앱 내 절대 경로).
   *
   * `brand` 와 동시에 채워지지 않는다 — 벡터가 있으면 언제나 그쪽이 낫다(어떤 크기에서도
   * 또렷하고 네트워크 요청이 없다). 갈래 셋(벡터 → 이미지 → 머리글자 배지)은
   * pages/settings/api-keys/components/ServiceGlyph.tsx 가 세운 구조를 그대로 쓴다 —
   * 두 화면이 로고를 다른 방식으로 그리면 같은 회사가 화면마다 다르게 보인다.
   *
   * ⚠ **외부 CDN 을 가리키지 않는다.** 런타임 의존이 하나 늘고, 그쪽이 죽는 날 목록에
   * 깨진 이미지가 뜬다. 자산은 apps/admin/public/brand/ 에 둔다.
   */
  readonly logoSrc: string | null;
  /** 우리가 이 PG 콘솔에 넣어 줘야 하는 주소들 — 입력이 아니라 읽고 복사하는 값이다 */
  readonly consoleInputs: readonly PgConsoleInput[];
}

/* ── 우리 쪽 경로 ──────────────────────────────────────────────────────────────
   TODO(backend): 아래 경로는 **아직 서버에 없다**. 지금 PG 콘솔에 등록하면 통보가 404 로
   떨어진다 — 화면이 그 사실을 함께 말한다(PgProviderPage 의 '아직 살아 있지 않습니다'). */

/** 결제 결과 통보(웹훅)를 받을 자리 — PG 마다 서명·인코딩 규약이 달라 경로를 나눈다 */
function webhookPath(target: PgTargetId): string {
  return `/api/payments/webhook/${target}`;
}

/** 결제창이 끝난 뒤 고객 브라우저가 돌아오는 자리 */
function returnPath(target: PgTargetId): string {
  return `/checkout/return/${target}`;
}

/** 국내 PG 다수가 공유하는 사실 — 카드 외 수단은 각각 별도 계약·심사를 거친다 */
const NON_CARD_METHODS: readonly PaymentMethod[] = ['transfer', 'vbank', 'phone', 'easypay'];

const PG_META: Readonly<Record<PgTargetId, PgProviderMeta>> = {
  toss: {
    id: 'toss',
    label: '토스페이먼츠',
    integrationMode: 'direct',
    credentials: [
      {
        key: 'clientKey',
        label: '클라이언트 키',
        required: true,
        // 브라우저 SDK 에 심겨 배포된다 — 애초에 비밀이 될 수 없다
        visibility: 'public',
        consoleHint: '토스페이먼츠 개발자센터 → 내 개발정보 → API 키',
        testValue: null,
      },
      {
        key: 'mid',
        label: '상점아이디(MID)',
        required: true,
        visibility: 'public',
        consoleHint: '토스페이먼츠 상점관리자 → 상점정보',
        testValue: null,
      },
      {
        key: 'secretKey',
        label: '시크릿 키',
        required: true,
        // 결제 승인 API 의 Basic 인증 자격증명이다 — 유출되면 승인을 대신 호출할 수 있다
        visibility: 'secret',
        consoleHint: '토스페이먼츠 개발자센터 → 내 개발정보 → API 키',
        testValue: null,
      },
    ],
    supportedMethods: [...PAYMENT_METHODS],
    contractRequiredMethods: NON_CARD_METHODS,
    supportsBilling: true,
    supportsVirtualAccount: true,
    webhookRegistration: 'console',
    environmentNote:
      '테스트 키(test_)와 운영 키(live_)가 따로 발급돼요. 테스트 키로는 실제 승인이 일어나지 않아요.',
    testableBeforeContract: true,
    consoleNotice:
      '계약을 마쳐도 카드사 심사가 남아 있을 수 있어요. 심사가 끝나기 전에는 운영 키를 넣어도 실결제가 열리지 않아요.',
    /* 공식 벡터를 확보하지 못해 실물 래스터를 쓴다 — 근사 벡터를 그리지 않는다 */
    brand: null,
    logoSrc: '/brand/toss-payments.png',
    consoleInputs: [
      {
        key: 'webhook',
        label: '웹훅 URL',
        path: webhookPath('toss'),
        note: '개발자센터 → 웹훅에 등록해요. 결제 상태가 바뀔 때 이 주소로 통보가 와요.',
      },
    ],
  },

  inicis: {
    id: 'inicis',
    label: 'KG이니시스',
    integrationMode: 'direct',
    credentials: [
      {
        key: 'mid',
        label: 'PG상점아이디(MID)',
        required: true,
        visibility: 'public',
        consoleHint: 'KG이니시스 상점관리자 → 상점정보',
        testValue: 'INIpayTest',
      },
      {
        key: 'signKey',
        label: '웹표준 signkey',
        required: true,
        /*
         * ⚠ 이름이 '키' 라서 식별자로 읽히지만 **요청 서명(SHA256)의 재료**다.
         *   signature = SHA256(oid + price + timestamp + signKey …) 형태로 들어간다.
         *   유출되면 결제 요청을 위조할 수 있으므로 명백한 비밀이다.
         */
        visibility: 'secret',
        consoleHint: 'KG이니시스 상점관리자 → 상점정보 → 결제/보안 → 웹표준 KEY 발급',
        testValue: null,
      },
      {
        key: 'iniLiteKey',
        label: 'INILite Key',
        required: false,
        visibility: 'secret',
        consoleHint: 'KG이니시스 상점관리자 → 상점정보 → 결제/보안 (모바일 INILite 연동 시)',
        testValue: null,
      },
      {
        key: 'iniApiKey',
        label: 'INIAPI Key',
        required: false,
        visibility: 'secret',
        consoleHint: 'KG이니시스 상점관리자 → 상점정보 → 결제/보안 (취소·부분취소 API 사용 시)',
        testValue: null,
      },
      {
        key: 'iniApiIv',
        label: 'INIAPI IV',
        required: false,
        // 초기화 벡터도 서명·암호화 재료다 — 키와 한 벌로 다룬다
        visibility: 'secret',
        consoleHint: 'KG이니시스 상점관리자 → 상점정보 → 결제/보안 (INIAPI Key 와 한 벌)',
        testValue: null,
      },
    ],
    supportedMethods: [...PAYMENT_METHODS],
    contractRequiredMethods: NON_CARD_METHODS,
    supportsBilling: true,
    supportsVirtualAccount: true,
    webhookRegistration: 'sales-contact',
    environmentNote:
      '테스트 MID(INIpayTest)와 테스트용 JS 가 따로 있어요. 테스트 JS 를 그대로 두고 실 MID 를 넣으면 결제가 되지 않아요.',
    testableBeforeContract: true,
    consoleNotice:
      '노티(웹훅) URL 은 상점관리자에서 셀프로 등록할 수 없어요 — 영업담당자에게 요청해야 해요(대표번호 1588-4954). 카드사 심사는 보통 2주 안팎 걸려요.',
    brand: null,
    logoSrc: '/brand/kg-inicis.png',
    consoleInputs: [
      {
        key: 'return',
        label: '리턴 URL(returnUrl)',
        path: returnPath('inicis'),
        note: '결제창이 끝나고 고객 브라우저가 돌아오는 주소예요. 요청마다 함께 보내지만 도메인은 미리 등록돼 있어야 해요.',
      },
      {
        key: 'noti',
        label: '노티 URL',
        path: webhookPath('inicis'),
        // 셀프서비스가 아니다 — 적어 두지 않으면 콘솔에서 없는 등록 화면을 찾아 헤맨다
        note: '상점관리자에 등록 화면이 없어요. 이 주소를 영업담당자에게 전달해야 등록돼요(1588-4954).',
      },
    ],
  },

  kcp: {
    id: 'kcp',
    label: 'NHN KCP',
    integrationMode: 'direct',
    credentials: [
      {
        key: 'siteCd',
        label: '사이트코드(site_cd)',
        required: true,
        visibility: 'public',
        consoleHint: 'KCP 상점관리자 → 상점정보',
        testValue: 'T0000',
      },
      {
        key: 'batchGroupId',
        label: '배치결제 그룹아이디',
        required: false,
        visibility: 'public',
        consoleHint: 'KCP 상점관리자 → 배치(정기)결제 신청 후 발급',
        testValue: null,
      },
      {
        key: 'siteKey',
        label: '사이트키(site_key)',
        required: true,
        // ⚠ '키' 라는 이름과 달리 서명·인증 재료다 — site_cd 와 짝으로 요청을 증명한다
        visibility: 'secret',
        consoleHint: 'KCP 상점관리자 → 상점정보 (사이트코드와 한 벌)',
        testValue: null,
      },
    ],
    supportedMethods: [...PAYMENT_METHODS],
    contractRequiredMethods: NON_CARD_METHODS,
    supportsBilling: true,
    supportsVirtualAccount: true,
    webhookRegistration: 'preregistered-url',
    environmentNote:
      '테스트 사이트코드(T0000)로 결제창을 띄워 볼 수 있어요. 운영 사이트코드는 계약 후 발급돼요.',
    testableBeforeContract: true,
    consoleNotice:
      '결제 결과를 받을 URL 을 KCP 에 미리 등록해야 해요. 등록하지 않으면 결제는 되고 결과 통보만 오지 않아요.',
    brand: null,
    logoSrc: '/brand/nhn-kcp.png',
    consoleInputs: [
      {
        key: 'noti',
        label: '결과 통보 URL',
        path: webhookPath('kcp'),
        note: '결제를 요청하기 전에 KCP 에 미리 등록해야 해요. 등록 전에는 결제만 되고 통보가 오지 않아요.',
      },
      {
        key: 'return',
        label: '결과 수신 URL',
        path: returnPath('kcp'),
        note: '결제창이 끝나고 고객 브라우저가 돌아오는 주소예요.',
      },
    ],
  },

  nice: {
    id: 'nice',
    label: '나이스페이먼츠',
    integrationMode: 'direct',
    credentials: [
      {
        key: 'clientId',
        label: '클라이언트 키(clientId)',
        required: true,
        visibility: 'public',
        consoleHint: '나이스페이먼츠 개발자 지원 → 가맹점 정보 → API 키',
        testValue: null,
      },
      {
        key: 'secretKey',
        label: '시크릿 키(secretKey)',
        required: true,
        // 승인 API 인증 + SignData(SHA256) 재료 — 둘 다 위조로 이어진다
        visibility: 'secret',
        consoleHint: '나이스페이먼츠 개발자 지원 → 가맹점 정보 → API 키',
        testValue: null,
      },
    ],
    supportedMethods: [...PAYMENT_METHODS],
    contractRequiredMethods: NON_CARD_METHODS,
    supportsBilling: true,
    supportsVirtualAccount: true,
    webhookRegistration: 'console',
    environmentNote: '테스트용 키와 운영용 키가 따로 발급돼요.',
    testableBeforeContract: true,
    consoleNotice: '계약 후에도 카드사 심사가 끝나야 실결제가 열려요.',
    brand: null,
    logoSrc: '/brand/nicepay.jpg',
    consoleInputs: [
      {
        key: 'return',
        label: 'returnUrl',
        path: returnPath('nice'),
        note: '결제창이 끝나고 고객 브라우저가 돌아오는 주소예요.',
      },
      {
        key: 'webhook',
        label: '웹훅 URL',
        path: webhookPath('nice'),
        note: '가맹점 관리자에 등록해요. 통보는 EUC-KR 로 오고 우리 서버가 OK 문자열로 답해야 해요.',
      },
    ],
  },

  portone: {
    id: 'portone',
    label: '포트원',
    integrationMode: 'gateway',
    credentials: [
      {
        key: 'storeId',
        label: '상점 아이디(storeId)',
        required: true,
        visibility: 'public',
        consoleHint: '포트원 콘솔 → 결제 연동 → 식별코드·API Keys',
        testValue: null,
      },
      {
        key: 'channelKey',
        label: '채널 키(channelKey)',
        required: true,
        visibility: 'public',
        consoleHint: '포트원 콘솔 → 결제 연동 → 채널 관리 (채널마다 다르다)',
        testValue: null,
      },
      {
        key: 'apiSecret',
        label: 'V2 API Secret',
        required: true,
        visibility: 'secret',
        consoleHint: '포트원 콘솔 → 결제 연동 → 식별코드·API Keys',
        testValue: null,
      },
      {
        key: 'webhookSecret',
        label: '웹훅 시크릿',
        required: false,
        // 웹훅 서명 검증 재료다 — 유출되면 가짜 결제 완료 통지를 만들 수 있다
        visibility: 'secret',
        consoleHint: '포트원 콘솔 → 결제 연동 → 웹훅 관리 (웹훅 등록 시 발급)',
        testValue: null,
      },
    ],
    /*
     * 게이트웨이라 지원 수단은 **채널에 연결한 PG 가 정한다**. 우리 화면은 그것을 알 수 없으므로
     * 어휘 전체를 열어 두고, 어떤 수단이 실제로 뜨는지는 포트원 콘솔의 채널 설정이 결정한다는
     * 사실을 environmentNote 가 말한다.
     */
    supportedMethods: [...PAYMENT_METHODS],
    contractRequiredMethods: [...PAYMENT_METHODS],
    supportsBilling: true,
    supportsVirtualAccount: true,
    webhookRegistration: 'console',
    environmentNote:
      '실제 결제수단과 테스트/운영 구분은 포트원 콘솔의 채널이 정해요. 개별 PG 자격증명은 이 화면이 아니라 그 채널 안에 들어가요.',
    testableBeforeContract: true,
    consoleNotice:
      '포트원은 결제창을 대신 열어 줄 뿐, PG 계약은 여전히 각 PG 사와 직접 맺어야 해요. 채널에 연결한 PG 의 심사가 끝나야 실결제가 열려요.',
    /*
     * 공개된 브랜드 **벡터**를 찾지 못했다. 로고를 지어내지 않는다(BrandMark 규약) —
     * 대신 실물 래스터를 앱 안에 두고 쓴다.
     */
    brand: null,
    logoSrc: '/brand/portone.jpg',
    consoleInputs: [
      {
        key: 'webhook',
        label: '웹훅 URL',
        path: webhookPath('portone'),
        note: '포트원 콘솔 → 웹훅 관리에 등록해요. 다섯 중 여기만 Standard Webhooks 서명으로 위조를 걸러낼 수 있어요.',
      },
      {
        key: 'redirect',
        label: '리디렉션 URL',
        path: returnPath('portone'),
        note: '결제창이 끝나고 고객 브라우저가 돌아오는 주소예요.',
      },
    ],
  },
};

/** 이 문자열이 우리가 아는 PG 대상인가 — **주소창에서 온 값**을 좁히는 유일한 관문이다 */
export function isPgTargetId(value: string): value is PgTargetId {
  return Object.hasOwn(PG_META, value);
}

/**
 * 메타 조회 — Record 라 총함수다(undefined 갈래가 없다).
 * 목록을 따로 두지 않는 이유는 OAuth 와 같다: 두 벌이면 하나가 낡고, 낡은 순간 실재하는
 * 대상이 '없는 대상' 으로 거절된다.
 */
export function pgMeta(id: PgTargetId): PgProviderMeta {
  return PG_META[id];
}

export function pgLabel(id: PgTargetId): string {
  return PG_META[id].label;
}

/* ── 연결 ──────────────────────────────────────────────────────────────────── */

/**
 * 지금 무엇에 연결돼 있는가 — `mode` 를 판별자로 갖는 합집합.
 *
 * **비밀의 값은 어느 갈래에도 없다.** direct 는 저장된 비밀의 **이름 목록**만 들고,
 * gateway 는 저장 여부 불리언만 든다 — 서버가 평문을 돌려주지 않는다는 계약이 타입에
 * 그대로 박혀 있어야 화면이 실수로 평문을 그릴 자리가 없다.
 */
export type PgConnection =
  | {
      readonly mode: 'direct';
      readonly provider: PgProvider;
      /** 공개 필드의 값 — 키는 `PgCredentialField.key` */
      readonly publicValues: Readonly<Record<string, string>>;
      /** **저장된** 비밀의 이름들. 값은 여기에도, 응답 어디에도 실리지 않는다 */
      readonly storedSecrets: readonly string[];
    }
  | {
      readonly mode: 'gateway';
      readonly gateway: 'portone';
      readonly storeId: string;
      readonly channelKey: string;
      readonly hasApiSecret: boolean;
      readonly hasWebhookSecret: boolean;
    };

/** 이 연결이 가리키는 카탈로그 대상 — 갈래를 화면이 다시 분기하지 않게 하는 총함수 */
export function connectionTarget(connection: PgConnection): PgTargetId {
  return connection.mode === 'gateway' ? connection.gateway : connection.provider;
}

/**
 * 공개 필드 하나의 값. 갈래 분기를 여기 한 번만 둔다 — 화면마다 두면 게이트웨이가
 * 하나 더 늘 때 어떤 화면은 고쳐지고 어떤 화면은 빈 칸을 그린다.
 */
export function connectionPublicValue(connection: PgConnection, key: string): string {
  if (connection.mode === 'gateway') {
    if (key === 'storeId') return connection.storeId;
    if (key === 'channelKey') return connection.channelKey;
    return '';
  }
  return connection.publicValues[key] ?? '';
}

/** 이 비밀이 저장돼 있는가 (값은 우리도 모른다) */
export function connectionHasSecret(connection: PgConnection, key: string): boolean {
  if (connection.mode === 'gateway') {
    if (key === 'apiSecret') return connection.hasApiSecret;
    if (key === 'webhookSecret') return connection.hasWebhookSecret;
    return false;
  }
  return connection.storedSecrets.includes(key);
}

/**
 * 비어 있는 연결 — 아직 아무 값도 넣지 않은 상태.
 * 대상을 바꿀 때 이 함수로 갈아 끼운다(앞 PG 의 값이 새 PG 의 칸에 남지 않는다).
 */
export function emptyConnection(target: PgTargetId): PgConnection {
  if (target === 'portone') {
    return {
      mode: 'gateway',
      gateway: 'portone',
      storeId: '',
      channelKey: '',
      hasApiSecret: false,
      hasWebhookSecret: false,
    };
  }
  return { mode: 'direct', provider: target, publicValues: {}, storedSecrets: [] };
}

/**
 * 아직 채워지지 않은 **필수** 자격증명.
 *
 * 공개 필드는 값이 비어 있으면, 비밀 필드는 저장돼 있지 않으면 미완성이다.
 * `pgSellable` 이 이 결과로 fail-closed 판정을 한다 — 하나라도 남아 있으면 결제를 열지 않는다.
 */
export function missingCredentials(connection: PgConnection): readonly PgCredentialField[] {
  const target = connectionTarget(connection);

  return pgMeta(target).credentials.filter((field) => {
    if (!field.required) return false;
    return field.visibility === 'secret'
      ? !connectionHasSecret(connection, field.key)
      : connectionPublicValue(connection, field.key).trim() === '';
  });
}

/** 이 연결로 결제창을 열 수 있는가 — 필수 공개 값이 다 차고 필수 비밀이 저장돼 있는가 */
export function connectionComplete(connection: PgConnection): boolean {
  return missingCredentials(connection).length === 0;
}

/**
 * 이 연결에 **저장된 것이 하나라도 있는가**.
 *
 * [왜 필요한가] 기본 설정의 연결은 `emptyConnection('toss')` 라 **아무 값도 없는데도** 대상이
 * toss 를 가리킨다. 그것만 보고 '값 저장됨' 이라고 말하면, 아무것도 넣은 적 없는 운영자에게
 * 화면이 거짓을 말한다 — 실제로 렌더 테스트가 그 문장을 잡아냈다.
 * '연결을 가리킨다' 와 '값이 있다' 는 다른 사실이다.
 */
export function connectionHasAnyValue(connection: PgConnection): boolean {
  return pgMeta(connectionTarget(connection)).credentials.some((field) =>
    field.visibility === 'secret'
      ? connectionHasSecret(connection, field.key)
      : connectionPublicValue(connection, field.key).trim() !== '',
  );
}

/**
 * 이 대상이 지원하지 않는데 켜져 있는 결제수단.
 *
 * 화면의 체크박스는 `supportedMethods` 에서 파생되므로 정상 경로로는 생길 수 없다 —
 * 그러나 PG 를 바꾸면 앞 PG 에서 고른 수단이 그대로 남는다. 그때 조용히 두면 '체크는 됐는데
 * 결제창에 안 뜨는' 상태가 된다.
 */
export function unsupportedMethods(
  target: PgTargetId,
  methods: readonly PaymentMethod[],
): readonly PaymentMethod[] {
  const supported = pgMeta(target).supportedMethods;
  return methods.filter((method) => !supported.includes(method));
}

/** 대상이 바뀌었을 때 살아남는 결제수단만 — 카탈로그 순서로 되맞춘다(고른 순서가 남지 않게) */
export function retainSupportedMethods(
  target: PgTargetId,
  methods: readonly PaymentMethod[],
): readonly PaymentMethod[] {
  const supported = pgMeta(target).supportedMethods;
  return PAYMENT_METHODS.filter((method) => supported.includes(method) && methods.includes(method));
}
