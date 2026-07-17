// 배송 정책 화면 전용 타입 · 옵션
//
// 배송은 목록형이 아니라 **정책 설정형**이다(권역·요금·묶음배송을 문서 1건으로 관리). 단일 문서형
// 프레임워크(createDocumentStore + DocumentFormShell)를 쓴다. 값 표현은 폼 문자열과 일치시켜(회사 정보
// 화면과 같은 결) reset(data) 를 단순화한다 — 실제 백엔드가 붙으면 숫자로 매핑한다(// TODO(backend)).
import type { ShippingPolicyValues } from './validation';

/** 배송비 정책 — 무료/유료/조건부무료 */
export const SHIPPING_FEE_OPTIONS = [
  { id: 'free', label: '무료배송' },
  { id: 'paid', label: '유료배송' },
  { id: 'conditional', label: '조건부 무료배송' },
] as const;

/** 화면 진입 시 기본값(픽스처) — 조건부 무료(5만원 이상 무료) */
export const DEFAULT_SHIPPING_POLICY: ShippingPolicyValues = {
  carrier: '가상택배',
  feeType: 'conditional',
  baseFee: '3000',
  freeThreshold: '50000',
  jejuExtraFee: '3000',
  islandExtraFee: '5000',
  returnFee: '3000',
  bundleShipping: true,
} as const;
