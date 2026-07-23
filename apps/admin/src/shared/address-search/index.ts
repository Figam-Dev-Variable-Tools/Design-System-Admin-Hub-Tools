// 주소 검색 배럴 — **페이지는 반드시 여기서만 import 한다** (shared/ui 와 같은 규칙)
//
// 안에 무엇이 있는지는 각 파일의 머리말에 있다:
//   contract.ts           계약(타입·순수 변환) — 외부 SDK 가 이 너머로 새지 않는다
//   kakao.ts              유일한 실구현(카카오·다음 우편번호 서비스, 앱 키 불필요)
//   adapter.ts            지금 쓸 구현 하나를 들고 있는 등록기(테스트가 대역을 꽂는 자리)
//   AddressSearchModal.tsx 검색 위젯을 담은 모달
//   AddressField.tsx      읽기 전용 주소 입력 + 검색 버튼 + 모달 — 화면이 쓰는 것은 보통 이것이다
export { AddressField } from './AddressField';
export { AddressSearchModal } from './AddressSearchModal';
export {
  addressSearchAdapter,
  resetAddressSearchAdapter,
  setAddressSearchAdapter,
} from './adapter';
export { searchFailed, searchOk, selectedAddressOf, toPostalAddress } from './contract';
export type {
  AddressSearchAdapter,
  AddressSearchFailure,
  AddressSearchResult,
  PostalAddress,
} from './contract';
