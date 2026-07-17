// 오시는 길 데이터 소스 어댑터
//
// [백엔드 연동 지점] store 의 fetch/save 본문이 프론트 ↔ 백엔드 계약이다. 지금은 픽스처.
import { createDocumentStore } from '../../../shared/crud';
import type { Directions } from './types';

const DIRECTIONS_SEED: Directions = {
  address: '서울특별시 예시구 가상대로 123',
  addressDetail: '예시타워 8층',
  latitude: '37.500000',
  longitude: '127.030000',
  transit:
    '지하철: 2호선 예시역 3번 출구에서 도보 5분\n버스: 간선 000, 지선 0000 예시타워 정류장 하차\n주차: 건물 지하 1~3층(방문 2시간 무료)',
};

export const directionsKey = ['company', 'directions'] as const;

// TODO(backend): GET /api/company/directions  ·  PUT /api/company/directions
export const directionsStore = createDocumentStore<Directions>('directions', DIRECTIONS_SEED);
