// 배송 정책 데이터 소스
//
// [백엔드 연동 지점] 단일 문서형 저장소(createDocumentStore)로 정책 1건을 들고 fetch/save 를 흉내 낸다.
// 실제 연동 시 GET/PUT /api/shipping-policy 로 store 본문만 바뀌고 화면은 그대로다.
import { createDocumentStore } from '../../../shared/crud';
import { DEFAULT_SHIPPING_POLICY } from './types';
import type { ShippingPolicyValues } from './validation';

export const shippingPolicyKey = ['shipping-policy'] as const;

// TODO(backend): GET/PUT /api/shipping-policy
export const shippingPolicyStore = createDocumentStore<ShippingPolicyValues>(
  'shipping-policy',
  DEFAULT_SHIPPING_POLICY,
);
