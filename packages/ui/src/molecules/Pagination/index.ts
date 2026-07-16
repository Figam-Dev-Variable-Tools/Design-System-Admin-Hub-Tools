// Pagination (molecule) — 배럴 export
//
// [rangeTextOf 도 내보내는 이유] 범위 문구를 **컴포넌트로는 그릴 수 없는** 소비자가 있다.
// 로그 목록의 요약 줄은 같은 자리에서 '조회 기간을 확인해 주세요.'·'불러오는 중…' 도 말해야 해서
// Pagination 을 통째로 얹을 수 없다. 그 자리에 산술을 한 벌 더 적으면 수식이 갈라진다(실제로
// 갈라져 있었다 — clamp 가 없어 범위 밖 page 에서 '전체 3건 중 81–80' 을 그렸다).
// 그래서 **그리는 것**은 각자 하되 **계산**은 이 한 벌을 쓴다.
export { Pagination, rangeTextOf } from './Pagination';
export type { PaginationProps, PaginationState } from '../../../generated/types/Pagination.types';
