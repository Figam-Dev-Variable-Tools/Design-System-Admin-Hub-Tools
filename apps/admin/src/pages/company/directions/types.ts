// 오시는 길 화면 전용 타입

/** 오시는 길 — 단일 문서(회사당 1건) */
export interface Directions {
  readonly address: string;
  readonly addressDetail: string;
  /** 위도 — 문자열로 보관(입력 그대로). 표시/저장 시 숫자 검증을 거친다 */
  readonly latitude: string;
  /** 경도 */
  readonly longitude: string;
  /** 교통편 안내(지하철·버스·주차 등) */
  readonly transit: string;
}

export const ADDRESS_MAX_LENGTH = 200;
export const ADDRESS_DETAIL_MAX_LENGTH = 100;
export const TRANSIT_MAX_LENGTH = 1000;
