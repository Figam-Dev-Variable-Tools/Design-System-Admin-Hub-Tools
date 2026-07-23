// 오시는 길 화면 전용 타입

/**
 * 오시는 길 — 단일 문서(회사당 1건)
 *
 * [좌표 칸이 없다] 위도·경도는 **주소에서 파생되는 값**이라 저장하지 않는다. 함께 저장하면 주소를
 * 고친 뒤 좌표를 그대로 둔 상태가 만들어지고, 그때 어느 쪽이 진실인지 아무도 모른다. 지도를 그릴
 * 곳(홈페이지)이 주소 문자열로 지오코딩하면 언제나 주소와 일치한다.
 */
export interface Directions {
  /** 우편번호 서비스로 고른 주소 한 줄 — 도로명 또는 지번(사용자가 고른 표기) */
  readonly address: string;
  /** 건물명·층·호수 등 (선택) */
  readonly addressDetail: string;
  /** 교통편 안내(지하철·버스·주차 등) */
  readonly transit: string;
}

export const ADDRESS_MAX_LENGTH = 200;
export const ADDRESS_DETAIL_MAX_LENGTH = 100;
export const TRANSIT_MAX_LENGTH = 1000;
