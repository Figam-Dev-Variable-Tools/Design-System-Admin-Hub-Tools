// 어댑터 등록기 — '지금 쓸 구현' 하나를 들고 있는 자리
//
// [왜 등록기인가] 계약(contract.ts)이 존재하는 이유의 절반은 테스트다. jsdom 에는 네트워크도
// 카카오 스크립트도 없으므로, 테스트는 여기서 어댑터를 대역으로 바꿔 끼우고 화면의 세 상태
// (로딩·실패·정상)를 실제로 밟는다. 화면 코드에는 분기가 하나도 늘지 않는다.
//
// [왜 기본값이 카카오인가] 배선을 잊으면 화면이 죽는 종류의 이음매가 아니다 — 실구현은 하나뿐이고
// (카카오), '어느 공급자를 쓰는가' 는 운영자가 고르는 축이 아니다. 우편번호 서비스는 앱 키도
// 요구하지 않으므로 운영자가 설정할 값 자체가 없다. 그래서 여기 기본값은 그냥 카카오다.
//
// [왜 index.ts 가 아니라 이 파일인가] 배럴(index.ts)은 모달까지 함께 내보낸다. 모달이 배럴에서
// 어댑터를 읽으면 모듈 순환이 된다 — 등록기를 따로 떼어 두면 그 고리가 아예 생기지 않는다.
import { KAKAO_ADDRESS_SEARCH_ADAPTER } from './kakao';
import type { AddressSearchAdapter } from './contract';

let current: AddressSearchAdapter = KAKAO_ADDRESS_SEARCH_ADAPTER;

/** 지금 쓸 어댑터 — 화면은 호출 시점에 한 번 읽는다 */
export function addressSearchAdapter(): AddressSearchAdapter {
  return current;
}

/** 테스트가 대역을 꽂는다. 제품 코드에는 호출자가 없다 */
export function setAddressSearchAdapter(next: AddressSearchAdapter): void {
  current = next;
}

/** 테스트가 원래대로 되돌린다 — 파일 사이로 대역이 새지 않게 한다 */
export function resetAddressSearchAdapter(): void {
  current = KAKAO_ADDRESS_SEARCH_ADAPTER;
}
