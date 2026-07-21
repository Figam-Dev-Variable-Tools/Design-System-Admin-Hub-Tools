// 결제 설정 화면 전용 뷰 헬퍼 · 선택지
//
// 값의 정본(유니온·표시명·CTA 규칙)은 shared/commerce/payment-settings 다. 여기는 그 정본에서
// **선택지 목록을 만들어 두는 자리**다 — 화면이 라벨을 손으로 나열하면 PG 사를 하나 늘린 날
// 목록에만 늘고 안내 문구에는 빠진다(../api-keys/integrations.ts 와 같은 판단).
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHODS,
  PAYMENT_MODE_LABEL,
  PAYMENT_MODES,
  PAYMENT_PROVIDER_LABEL,
  PAYMENT_PROVIDERS,
} from '../../../shared/commerce/payment-settings';
import type {
  PaymentMethod,
  PaymentMode,
  PaymentProvider,
  PaymentSettings,
} from '../../../shared/commerce/payment-settings';
import type { PaymentSettingsValues } from './validation';

interface Option<T> {
  readonly id: T;
  readonly label: string;
}

/** PG 사 선택지 — SelectField 의 <option> 이 된다 */
export const PROVIDER_OPTIONS: readonly Option<PaymentProvider>[] = PAYMENT_PROVIDERS.map((id) => ({
  id,
  label: PAYMENT_PROVIDER_LABEL[id],
}));

/** 테스트/운영 선택지 */
export const MODE_OPTIONS: readonly Option<PaymentMode>[] = PAYMENT_MODES.map((id) => ({
  id,
  label: PAYMENT_MODE_LABEL[id],
}));

/** 결제수단 선택지 — 다중 선택(체크박스)이다 */
export const METHOD_OPTIONS: readonly Option<PaymentMethod>[] = PAYMENT_METHODS.map((id) => ({
  id,
  label: PAYMENT_METHOD_LABEL[id],
}));

/**
 * 저장된 설정 → 폼 값.
 *
 * 배열만 복사한다 — 저장 문서의 `methods` 는 readonly 이고 폼은 그 자리를 갈아끼운다.
 * 얕은 전개로 넘기면 RHF 가 저장 문서의 배열을 직접 만지게 되어, 되돌리기(reset)가 이미
 * 바뀐 값을 기준선으로 삼는다.
 */
export function toPaymentFormValues(settings: PaymentSettings): PaymentSettingsValues {
  return { ...settings, methods: [...settings.methods] };
}
