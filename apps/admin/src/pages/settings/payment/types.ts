// 결제 설정 화면 전용 뷰 헬퍼 · 선택지 · **폼 ↔ 도메인 경계 변환**
//
// 값의 정본(카탈로그·CTA 규칙)은 shared/commerce 다. 여기는 그 정본에서 **선택지 목록을 만들고**,
// 평평한 폼 값과 갈라진 도메인 값을 **한 곳에서만** 오가게 하는 자리다 — 변환이 화면마다 흩어지면
// 어떤 화면은 비밀을 접고 어떤 화면은 흘린다.
import {
  connectionTarget,
  PAYMENT_METHOD_LABEL,
  PAYMENT_MODE_LABEL,
  PAYMENT_MODES,
  PG_CONTRACT_STATUSES,
  PG_CONTRACT_STATUS_LABEL,
  pgMeta,
  retainSupportedMethods,
} from '../../../shared/commerce/pg-catalog';
import type {
  PaymentMethod,
  PaymentMode,
  PgConnection,
  PgContractStatus,
  PgTargetId,
} from '../../../shared/commerce/pg-catalog';
import type { PaymentSettings } from '../../../shared/commerce/payment-settings';
import { connectionFormFor } from './validation';
import type { PaymentSettingsValues, PgConnectionFormValues } from './validation';

interface Option<T> {
  readonly id: T;
  readonly label: string;
}

/** 테스트/운영 선택지 */
export const MODE_OPTIONS: readonly Option<PaymentMode>[] = PAYMENT_MODES.map((id) => ({
  id,
  label: PAYMENT_MODE_LABEL[id],
}));

/** 계약 상태 선택지 — **운영자가 손으로 고르는 값**이다(PG 에 물을 API 가 없다) */
export const CONTRACT_STATUS_OPTIONS: readonly Option<PgContractStatus>[] =
  PG_CONTRACT_STATUSES.map((id) => ({ id, label: PG_CONTRACT_STATUS_LABEL[id] }));

/**
 * 이 PG 가 실제로 띄울 수 있는 결제수단만 — **고정 5칸을 그리지 않는다.**
 *
 * 카카오페이를 고른 운영자에게 '가상계좌' 를 권하는 화면이 되지 않게, 선택지 자체를
 * `supportedMethods` 에서 파생한다. 사전 계약이 있어야 켜지는 수단은 함께 표시한다 —
 * 체크는 됐는데 결제창에 안 뜨는 사고를 막는다.
 */
export function methodOptionsFor(target: PgTargetId): readonly {
  readonly id: PaymentMethod;
  readonly label: string;
  readonly contractRequired: boolean;
}[] {
  const meta = pgMeta(target);

  return meta.supportedMethods.map((id) => ({
    id,
    label: PAYMENT_METHOD_LABEL[id],
    contractRequired: meta.contractRequiredMethods.includes(id),
  }));
}

/* ── 폼 ↔ 도메인 ───────────────────────────────────────────────────────────── */

/**
 * 저장된 설정 → 폼 값.
 *
 * 배열·레코드를 새로 만든다 — 저장 문서 쪽은 readonly 이고 폼은 그 자리를 갈아끼운다. 얕은
 * 전개로 넘기면 RHF 가 저장 문서를 직접 만지게 되어, 되돌리기(reset)가 이미 바뀐 값을
 * 기준선으로 삼는다.
 */
export function toPaymentFormValues(settings: PaymentSettings): PaymentSettingsValues {
  return toPaymentFormValuesFor(settings, connectionTarget(settings.connection));
}

/**
 * 저장된 설정 → **이 대상을 편집하는** 폼 값.
 *
 * 상세 화면이 쓴다: 지금 연결된 대상이 아니어도 그 대상의 칸을 그려야 하고, 그때 결제수단은
 * 새 대상이 지원하는 것만 살아남아야 한다(앞 PG 에서 고른 수단이 남으면 저장 뒤에 '체크는
 * 됐는데 안 뜨는' 상태가 된다).
 */
export function toPaymentFormValuesFor(
  settings: PaymentSettings,
  target: PgTargetId,
): PaymentSettingsValues {
  return {
    usePg: settings.usePg,
    connection: connectionFormFor(settings, target),
    mode: settings.mode,
    methods: [...retainSupportedMethods(target, settings.methods)],
    contractStatus: settings.contractStatus,
    inquiryGuide: settings.inquiryGuide,
  };
}

/**
 * 폼의 연결 값 → 도메인의 `PgConnection`.
 *
 * ┌ 비밀이 어떻게 넘어가는가 ─────────────────────────────────────────────────┐
 * │ **평문은 넘어가지 않는다.** 새로 입력된 비밀은 저장 요청에만 실리고, 저장된   │
 * │ 문서에는 그 **이름**만 남는다(storedSecrets). 그래서 여기서 하는 일은        │
 * │ '새로 넣은 값이 있으면 그 이름을 저장 목록에 더한다' 뿐이다.                 │
 * │ 백엔드가 붙으면 평문은 PUT 바디의 별도 필드로만 흐르고, 응답은 지금과 똑같이  │
 * │ 이름 목록만 돌려준다(payment-settings.ts 의 TODO(backend)).                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function toPgConnection(form: PgConnectionFormValues): PgConnection {
  const meta = pgMeta(form.target);

  /** 저장된 이름 + 이번에 새로 넣은 이름 — 카탈로그 순서로 되맞춘다(입력 순서가 남지 않게) */
  const storedSecrets = meta.credentials
    .filter(
      (field) =>
        field.visibility === 'secret' &&
        (form.storedSecrets.includes(field.key) ||
          (form.secretInputs[field.key] ?? '').trim() !== ''),
    )
    .map((field) => field.key);

  /** 공개 값은 앞뒤 공백을 다듬어 저장한다 — 붙여넣기 사고가 그대로 굳지 않게 */
  const publicValues: Record<string, string> = {};
  for (const field of meta.credentials) {
    if (field.visibility === 'secret') continue;
    publicValues[field.key] = (form.publicValues[field.key] ?? '').trim();
  }

  if (form.target === 'portone') {
    return {
      mode: 'gateway',
      gateway: 'portone',
      storeId: publicValues.storeId ?? '',
      channelKey: publicValues.channelKey ?? '',
      hasApiSecret: storedSecrets.includes('apiSecret'),
      hasWebhookSecret: storedSecrets.includes('webhookSecret'),
    };
  }

  return { mode: 'direct', provider: form.target, publicValues, storedSecrets };
}

/** 폼 값 → 저장 문서. 이 함수 하나만이 폼을 도메인으로 승격시킨다 */
export function toPaymentSettings(form: PaymentSettingsValues): PaymentSettings {
  return {
    usePg: form.usePg,
    connection: toPgConnection(form.connection),
    mode: form.mode,
    methods: [...retainSupportedMethods(form.connection.target, form.methods)],
    contractStatus: form.contractStatus,
    inquiryGuide: form.inquiryGuide.trim(),
  };
}

/**
 * 저장 직후의 새 기준선 — **평문 입력칸을 비운다.**
 *
 * 저장한 순간 평문 비밀은 화면에서 사라져야 한다. 그대로 두면 폼에 평문이 계속 살고,
 * '마스킹' 이 눈속임이 되는 바로 그 상태가 된다(../oauth/data-source.ts 와 같은 규약).
 */
export function normalizeAfterSave(saved: PaymentSettings): PaymentSettingsValues {
  return toPaymentFormValuesFor(saved, connectionTarget(saved.connection));
}
