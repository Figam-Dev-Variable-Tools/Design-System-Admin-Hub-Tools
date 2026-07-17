// 적립금 정책 데이터 소스
//
// [백엔드 연동 지점] 단일 문서형 저장소(createDocumentStore)로 정책 1건을 들고 fetch/save 를 흉내 낸다.
// 실제 연동 시 GET/PUT /api/points-policy 로 store 본문만 바뀌고 화면은 그대로다.
import { createDocumentStore } from '../../../shared/crud';
import { DEFAULT_POINTS_POLICY } from './types';
import type { PointsPolicyValues } from './validation';

export const pointsPolicyKey = ['points-policy'] as const;

// TODO(backend): GET/PUT /api/points-policy
export const pointsPolicyStore = createDocumentStore<PointsPolicyValues>(
  'points-policy',
  DEFAULT_POINTS_POLICY,
);
