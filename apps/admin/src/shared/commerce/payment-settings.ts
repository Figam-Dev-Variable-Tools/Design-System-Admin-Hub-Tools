// 결제(PG) 연동 설정 — 상품·프로그램이 **함께** 읽는 판매 방식의 정본
//
// ┌ 이 파일이 정하는 한 가지 ────────────────────────────────────────────────┐
// │ 고객이 상품 카드/프로그램 상세에서 누르는 버튼이 **결제로 가는가, 문의로     │
// │ 가는가**. 그 갈림은 설정 한 개(usePg)와 **자격증명이 실제로 다 찼는가**에서   │
// │ 나온다:                                                                   │
// │   PG 사용 + 자격증명 완비 → 상품 '구매하기' · 프로그램 '후원하기'            │
// │   그 밖                    → 둘 다 '문의하기' (상품 문의 · 프로그램 문의)     │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [왜 pages 가 아니라 shared 인가] 이 값을 읽는 화면은 서로 다른 페이지 트리에 있다 —
// pages/products(상품 폼)와 pages/programs(프로그램 상세), 그리고 값을 고치는 pages/settings.
// 한쪽이 다른 쪽의 모듈을 가져오면 그 순간 페이지 간 결합(code-quality 축1 · blocker)이고,
// '상품을 지우면 프로그램이 죽는' 구조가 된다. 그래서 판매 방식이라는 **사실**은 공통 층이 갖고
// 화면 셋은 서로를 끝까지 모른다 (shared/fixtures/ai-providers.ts 와 같은 판단이다).
//
// ┌ `merchantId: string` 이 사라진 이유 ─────────────────────────────────────┐
// │ 상점 ID 한 칸으로는 **어느 PG 도 연동되지 않는다.** PG 마다 필요한 값의       │
// │ 개수·이름이 다르고 그 절반 이상이 서명 재료(비밀)다. 그래서 자격증명은        │
// │ `PgConnection`(판별 합집합)이 들고, 무엇이 필요한지는 카탈로그가 안다         │
// │ (./pg-catalog.ts). 이 파일은 그 결과로 **버튼 하나**를 정하는 일만 한다.      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [백엔드 0] 실제 HTTP 호출은 한 줄도 없다. 모듈 지역 변수 하나가 '지금 저장된 설정' 이고,
// 설정 화면의 저장이 그 값을 바꾼다. 연동 지점은 아래 TODO(backend) 다.
import {
  connectionComplete,
  connectionTarget,
  emptyConnection,
  missingCredentials,
  pgLabel,
} from './pg-catalog';
import type { PaymentMethod, PaymentMode, PgConnection, PgContractStatus } from './pg-catalog';

/* ── 값 ────────────────────────────────────────────────────────────────────── */

/** 결제(PG) 설정 1건 — 설정 화면이 저장하고, 상품·프로그램이 읽는다 */
export interface PaymentSettings {
  /** PG 로 판매하는가. 이 마스터 스위치가 아래 CTA 규칙 전체를 뒤집는다 */
  readonly usePg: boolean;
  /** 지금 무엇에 연결돼 있는가 — 직접 PG 하나이거나 게이트웨이 하나다 */
  readonly connection: PgConnection;
  readonly mode: PaymentMode;
  readonly methods: readonly PaymentMethod[];
  /**
   * PG 계약이 어디까지 왔는가 — **운영자가 손으로 적는 값**이다(PG 에 물을 API 가 없다).
   * 값을 다 넣고도 실결제가 안 열리는 이유가 대개 여기 있어서, 축을 하나 더 둔다.
   */
  readonly contractStatus: PgContractStatus;
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
 * usePg 만 보지 않는다: 켜 두고 자격증명이 비어 있으면 결제창을 띄울 수 없다 —
 * 그 상태에서 '구매하기' 를 그리면 고객은 눌러 놓고 아무 일도 일어나지 않는 버튼을 만난다.
 * **필수 공개 값이 다 차고 필수 비밀이 저장돼 있어야** 판매 가능이다(missingCredentials).
 * 애매하면 닫는 쪽으로 수렴한다(fail-closed) — 판단이 두 곳에 있어도 결론이 갈리지 않는다.
 *
 * [contractStatus 는 보지 않는다 — 일부러 그렇다] 그 값은 운영자가 손으로 적는 것이라
 * 오타 하나가 상점 전체를 닫아 버릴 수 있다. 계약이 아직 안 열렸다는 사실은 **막는 대신
 * checkoutCta 의 reason 이 말한다** — 사람이 읽고 판단할 자리를 남긴다.
 *
 * [왜 내보내는가] 이 술어는 **축 A** 다 — 결제창을 열 수 있는가. 상품 단위의 가격 표시(축 B ·
 * price-display.ts)와 화면별 잠금(pg-lock.ts)이 같은 판정 위에 서야 한다. 각자 usePg 를 다시
 * 읽으면 자격증명이 빈 상태를 놓치는 화면이 생기고, 그 화면만 '결제됨' 을 전제로 그린다.
 */
export function pgSellable(settings: PaymentSettings): boolean {
  // ⓐ 운영자가 결제를 쓰지 않기로 정했다
  if (!settings.usePg) return false;
  // ⓑ 자격증명이 실제로 거절당했다 — **백엔드만 아는 사실**이다(아래 심)
  if (readPgCredentialHealth() === 'invalid') return false;
  // ⓒ 우리가 볼 수 있는 것: 필수 공개 값이 다 찼고 필수 비밀이 저장돼 있는가
  return connectionComplete(settings.connection);
}

/* ── ⓑ 자격증명이 **실제로 유효한가** — 우리가 알 수 없는 축 ─────────────────
 *
 * ┌ 왜 불리언이 아니라 세 상태인가 ──────────────────────────────────────────┐
 * │ 운영자는 '연동 안 됨' 을 셋으로 말했다: PG 미사용 · **API 키 이상** · 연동   │
 * │ 미완. 앞뒤 둘은 우리가 판정한다(usePg · connectionComplete). 그런데 가운데는 │
 * │ **프론트가 알 수 없다** — 키가 맞는지 확인하려면 PG 를 불러야 하고, 그러려면 │
 * │ 시크릿이 브라우저로 내려와야 한다. 그 순간 이 화면의 규약이 통째로 거짓이     │
 * │ 되므로 '연결 테스트' 를 만들지 않기로 이미 정했다(PgCredentialFields 머리말). │
 * │                                                                          │
 * │ 그러므로 답은 참/거짓이 아니라 **'확인한 적 없음' 을 포함한 셋**이다.        │
 * │ 불리언으로 접으면 '확인 안 함' 이 '이상 없음' 으로 둔갑한다 —                │
 * │ shared/fixtures 의 `lastVerifiedAt` 이 늘 null 인 것과 같은 이유다.          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export type PgCredentialHealth = 'unverified' | 'valid' | 'invalid';

/**
 * '확인한 적 없음' 을 판매 가능으로 칠 것인가.
 *
 * ┌ 이 한 줄이 정하는 것 ────────────────────────────────────────────────────┐
 * │ `true`  — 우리가 판정할 수 있는 축(ⓐⓒ)만 보고, 확인하지 못한 축은 막지 않는다.│
 * │ `false` — 확인하지 못했으면 닫는다(엄격한 fail-closed).                     │
 * │                                                                          │
 * │ **지금은 `true` 다.** 백엔드가 없어 이 값은 항상 'unverified' 이고, `false` 로 │
 * │ 두면 자격증명을 아무리 채워도 **영원히 가격문의**가 되어 결제 설정 화면 전체가 │
 * │ 무의미해진다. 더 나쁜 것은 같은 사실을 보는 `checkoutCta` 가 '구매하기' 를    │
 * │ 그리는 동안 가격만 '문의' 가 되어 **두 축이 서로 모순되는 화면**이 나온다는    │
 * │ 점이다 — 이 파일이 없애려던 바로 그 상태다.                                 │
 * │                                                                          │
 * │ 그래서 '모름' 은 막지 않되 **아는 척도 하지 않는다**: 화면은 언제나 '확인한   │
 * │ 적 없음' 을 그대로 말한다. 백엔드가 붙어 진짜 'invalid' 를 돌려주기 시작하면  │
 * │ 위 `pgSellable` 이 그때부터 실제로 닫는다.                                  │
 * │                                                                          │
 * │ 운영이 '확인 전에는 아예 닫는다' 를 원하면 **이 상수 하나만** false 로 바꾼다. │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
const TREAT_UNVERIFIED_AS_HEALTHY = true;

/** 배선 전에는 아무도 확인하지 않았다 — 그 사실을 그대로 돌려준다 */
let credentialHealthLookup: (() => PgCredentialHealth) | null = null;

/**
 * 자격증명 건강 상태 조회기를 꽂는다.
 *
 * TODO(backend): 서버가 마지막 결제창 세션 생성/승인 시도의 결과를 들고 있어야 한다.
 *   프론트는 절대 판정할 수 없다(시크릿이 브라우저에 없다 — 그리고 없어야 한다).
 *   `GET /api/settings/payment` 응답에 `credentialHealth: 'unverified'|'valid'|'invalid'` 를
 *   실어 주면 이 심에 그대로 꽂는다.
 */
export function registerPgCredentialHealth(lookup: () => PgCredentialHealth): void {
  credentialHealthLookup = lookup;
}

/** 테스트가 서로의 배선을 물려받지 않게 한다 */
export function resetPgCredentialHealth(): void {
  credentialHealthLookup = null;
}

/** 지금 알려진 건강 상태 — 배선 전에는 `'unverified'`(0 이나 false 가 아니다) */
export function readPgCredentialHealth(): PgCredentialHealth {
  const health = credentialHealthLookup?.() ?? 'unverified';
  // '모름' 을 '이상 없음' 으로 바꾸지 않는다 — 판매 가능 판정에서만 관대하게 다룬다
  if (health === 'unverified' && TREAT_UNVERIFIED_AS_HEALTHY) return 'unverified';
  return health;
}

/**
 * 왜 지금 금액을 노출할 수 없는가 — **원인**을 한 줄로.
 *
 * 세 갈래가 각각 다른 문장을 내야 운영자가 다음에 할 일을 안다. 하나로 뭉치면
 * '결제 연동이 안 됐습니다' 만 남고, 그 다음 행동은 아무 데도 적혀 있지 않다.
 */
export function unhealthyCredentialReason(settings: PaymentSettings): string {
  if (!settings.usePg) {
    return 'PG 결제를 쓰지 않도록 설정되어 있어 모든 금액이 가격문의로 대체돼요.';
  }

  if (readPgCredentialHealth() === 'invalid') {
    return '저장된 결제 자격증명이 PG 에서 거절되었어요. 값을 다시 확인해 주세요. 그동안 모든 금액은 가격문의로 대체돼요.';
  }

  const missing = missingCredentialLabels(settings);
  return `${pgLabel(connectionTarget(settings.connection))} 필수 자격증명이 아직 채워지지 않아(${missing.join(' · ')}) 결제 연동이 성립하지 않아요. 그동안 모든 금액은 가격문의로 대체돼요.`;
}

/** 아직 못 채운 필수 자격증명의 이름들 — 화면이 '무엇이 비었는지' 를 말할 때 쓴다 */
export function missingCredentialLabels(settings: PaymentSettings): readonly string[] {
  return missingCredentials(settings.connection).map((field) => field.label);
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
  const provider = pgLabel(connectionTarget(settings.connection));

  if (!pgSellable(settings)) {
    const missing = missingCredentialLabels(settings);

    return {
      kind: 'inquiry',
      label: INQUIRY_LABEL,
      reason: settings.usePg
        ? `${provider} 필수 자격증명이 아직 채워지지 않아(${missing.join(' · ')}) 결제창을 열 수 없어요. 지금은 PG 결제 대신 문의로 받아요.`
        : 'PG 결제를 쓰지 않도록 설정되어 있어 결제 대신 문의로 받아요.',
      inquiryPath: INQUIRY_PATH[domain],
    };
  }

  // 테스트 모드는 결제창이 뜨지만 돈이 움직이지 않는다 — '연동됨' 과 뭉뚱그리면 운영 전환을 잊는다
  if (settings.mode === 'test') {
    return {
      kind: 'purchase',
      label: PURCHASE_LABEL[domain],
      reason: `${provider} 테스트 모드로 결제창이 열려요. 실제 결제는 일어나지 않아요.`,
      inquiryPath: null,
    };
  }

  /*
   * [값은 다 넣었는데 왜 아직 못 켜는가] 운영 모드인데 계약이 열리지 않은 상태다.
   * 이 갈래가 없으면 화면은 '결제창이 열립니다' 라고만 말하고, 운영자는 실제로 결제가 실패한
   * 뒤에야 이유를 찾기 시작한다. contractStatus 가 수기 입력값이라 저장을 막지는 않는다.
   */
  if (settings.contractStatus !== 'live') {
    return {
      kind: 'purchase',
      label: PURCHASE_LABEL[domain],
      reason: `${provider} 자격증명은 다 넣었지만 계약 상태가 '실결제 오픈' 이 아니에요. 카드사 심사 중이라면 결제창은 떠도 실결제가 승인되지 않아요.`,
      inquiryPath: null,
    };
  }

  return {
    kind: 'purchase',
    label: PURCHASE_LABEL[domain],
    reason: `${provider} 결제창이 열려요.`,
    inquiryPath: null,
  };
}

/* ── 저장소 (모듈 지역 상태 — 설정 화면의 저장이 갱신한다) ─────────────────── */

/** PG 를 끈 상태의 기본 안내 — 운영자가 고칠 수 있다(설정 화면 '문의 전환 안내') */
const DEFAULT_INQUIRY_GUIDE =
  '현재 온라인 결제를 준비 중이에요. 문의를 남겨 주시면 담당자가 확인 후 연락드려요.';

/**
 * 초기 설정 — 이 앱은 아직 PG 계약이 없다. 그래서 **꺼진 상태에서 출발한다**:
 * 켜져 있는 것으로 시작하면 결제되지 않는 '구매하기' 가 기본값이 된다(FEEDBACK-03).
 */
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  usePg: false,
  connection: emptyConnection('toss'),
  mode: 'test',
  methods: ['card', 'transfer'],
  contractStatus: 'none',
  inquiryGuide: DEFAULT_INQUIRY_GUIDE,
};

let current: PaymentSettings = DEFAULT_PAYMENT_SETTINGS;

// TODO(backend): GET /api/settings/payment · PUT /api/settings/payment (If-Match: <revision>)
//
//   ⚠ **비밀 필드의 값은 응답에 실리지 않는다 — 이름 목록만 온다.**
//      GET  → { usePg, connection: { mode, provider|gateway, publicValues, storedSecrets[] },
//               mode, methods, contractStatus, inquiryGuide }
//      PUT  → 비밀은 '새로 넣은 값' 만 보낸다. 빈 문자열이면 서버가 기존 값을 유지한다
//             (화면에 평문이 살지 않으므로 '기존 값을 다시 보내는' 경로 자체가 없다).
//
//   [프론트가 절대 못 하는 것 — 서버가 해야 한다]
//     · 결제창 세션 생성: 이니시스 `signature`=SHA256(…signKey…) · 나이스 `SignData` ·
//       카카오페이 `ready` → `next_redirect_pc_url` · 네이버페이 승인 API.
//       전부 **비밀을 재료로 서명**하므로 브라우저에서 만들 수 없다.
//     · 승인(confirm/approve)과 **금액 재검증** — 클라이언트가 보낸 금액을 믿으면 위조된다.
//     · 웹훅 수신: 포트원만 Standard Webhooks 서명 검증이고, 이니시스·나이스는 IP 확인 +
//       `OK` 문자열 응답 + EUC-KR 인코딩, KCP 는 URL 선등록이 필수다.

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
