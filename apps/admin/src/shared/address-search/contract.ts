// 주소 검색 어댑터 **계약** — 외부 SDK 가 이 파일 너머로 새지 않는다
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇이 사라졌나 — 지도]
// 예전에는 이 폴더가 `shared/maps` 였고 표면이 셋이었다(주소 검색 · 지오코딩 · 지도 렌더).
// 지도와 좌표를 화면에서 걷어내면서(오시는 길은 주소·상세주소·교통편만 남는다) 지오코딩과 지도
// 렌더는 소비자가 0이 됐고, 그 둘만 요구하던 **카카오 JavaScript 앱 키**도 이 경로에서 사라졌다.
// 남은 것은 우편번호 서비스 하나 — 그래서 폴더 이름도 사실에 맞춰 `address-search` 다.
//
// [왜 계약을 따로 두는가]
// 주소 검색(카카오·다음 우편번호 서비스)은 브라우저가 **외부 스크립트를 내려받아야** 동작한다.
// jsdom 에는 네트워크도 그 스크립트도 없다. 화면이 SDK 를 직접 부르면 테스트는 둘 중 하나를 하게
// 된다 — SDK 전역을 통째로 흉내 내거나(가짜가 진짜보다 커진다), 아니면 이 화면의 동작을 아예
// 검증하지 않거나. 그래서 경계를 **함수 하나**로 좁히고 테스트는 그것만 대역으로 갈아 끼운다.
//
// [앱 키가 필요 없다] 우편번호 서비스는 앱 키도 도메인 등록도 요구하지 않는다(공식 가이드).
// 그래서 이 경로에는 '키 미등록' 이라는 실패가 존재하지 않는다 — 없는 실패를 타입에 적어 두면
// 화면이 절대 오지 않을 문장을 준비하게 된다.
//
// [실패는 결과값이다 — 예외가 아니다]
// `AddressSearchResult` 를 돌려준다. 예외로 던지면 호출부가 `catch (e: unknown)` 안에서 다시
// 타입을 좁혀야 하고, 그 좁히기를 빠뜨리면 실패가 '알 수 없는 오류' 로 뭉개진다.
//
// [백엔드 없음] 이 파일도, 이 폴더의 어떤 파일도 우리 서버를 부르지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 주소 검색이 고른 한 건.
 *
 * 우편번호 서비스가 돌려주는 필드 이름을 그대로 쓰되 **우리가 쓰는 것만** 받는다(공식 가이드의
 * oncomplete 데이터: zonecode·roadAddress·jibunAddress·buildingName·userSelectedType 등).
 * 쓰지 않는 필드까지 타입에 적으면 '저장되는 줄 알았는데 아니었다' 는 오해가 생긴다.
 *
 * 빈 문자열을 허용하는 이유: 지번만 있는 주소는 roadAddress 가 실제로 ''로 온다 — 없음을 null 로
 * 바꿔 적으면 아래 selectedAddressOf 의 폴백이 두 갈래(null·'')를 다 봐야 한다.
 */
export interface PostalAddress {
  /** 5자리 우편번호 — 지금 이 값을 저장하는 화면은 없다(어느 폼에도 칸이 없다) */
  readonly zonecode: string;
  readonly roadAddress: string;
  readonly jibunAddress: string;
  /** 건물명 — 없으면 '' */
  readonly buildingName: string;
  /** 사용자가 목록에서 실제로 고른 표기: 도로명(R) / 지번(J) */
  readonly userSelectedType: 'R' | 'J';
}

/**
 * 왜 실패했는가.
 *
 *   unreachable … 스크립트를 받지 못했다(네트워크 단절·CDN 장애·확장 프로그램 차단). 또는 200 은
 *                 받았는데 전역이 없다(사내 프록시가 차단 페이지를 돌려준 경우).
 *                 ⚠ 브라우저는 '끊김' 과 '차단' 을 구분해 알려주지 않는다 — 둘 다 error 이벤트
 *                 하나로 온다. 그래서 이 값을 둘로 쪼개지 않고, 문구에서 두 가능성을 함께 말한다.
 *                 쪼개면 코드가 알지 못하는 것을 아는 척하게 된다.
 *
 * 값이 하나뿐인 유니온인 이유: 지금 관측 가능한 실패가 정말 하나다. 그래도 유니온으로 두면 나중에
 * 이유가 하나 늘 때 **문구 테이블(Record)이 타입 오류로 먼저 터진다** — 새 실패가 조용히 빈 문장이
 * 되는 길을 막는다.
 */
export type AddressSearchFailure = 'unreachable';

export type AddressSearchResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: AddressSearchFailure };

export const searchOk = <T>(value: T): AddressSearchResult<T> => ({ ok: true, value });

export const searchFailed = <T>(reason: AddressSearchFailure): AddressSearchResult<T> => ({
  ok: false,
  reason,
});

export interface AddressSearchAdapter {
  /**
   * 주소 검색 UI 를 host 안에 심는다. 성공하면 **정리 함수**를 돌려준다.
   * 앱 키가 필요 없다 — 우편번호 서비스는 키도 등록도 요구하지 않는다(공식 가이드).
   */
  readonly embedAddressSearch: (
    host: HTMLElement,
    onSelect: (address: PostalAddress) => void,
  ) => Promise<AddressSearchResult<() => void>>;
}

/* ── 순수 변환 ─────────────────────────────────────────────────────────────── */

const textOf = (raw: unknown): string => (typeof raw === 'string' ? raw.trim() : '');

/**
 * 우편번호 서비스의 날것 → PostalAddress. **어느 칸도 믿지 않는다.**
 *
 * 콜백 인자는 외부 스크립트가 만든 객체라 우리 타입 검사를 한 번도 거치지 않았다. 필드가 빠지거나
 * 타입이 바뀌어도 화면이 `undefined` 를 주소 칸에 넣지 않도록 여기서 전부 문자열로 수렴시킨다.
 */
export function toPostalAddress(raw: unknown): PostalAddress {
  const source: Record<string, unknown> = typeof raw === 'object' && raw !== null ? { ...raw } : {};
  return {
    zonecode: textOf(source.zonecode),
    roadAddress: textOf(source.roadAddress),
    jibunAddress: textOf(source.jibunAddress),
    buildingName: textOf(source.buildingName),
    userSelectedType: textOf(source.userSelectedType) === 'J' ? 'J' : 'R',
  };
}

/**
 * 주소 칸에 들어갈 한 줄 — **사용자가 고른 표기를 존중한다.**
 *
 * 도로명을 골랐는데 지번을 저장하면 홈페이지에 뜨는 주소가 운영자가 확인한 것과 달라진다.
 * 다만 고른 쪽이 비어 있을 수는 있다(지번만 존재하는 주소에서 도로명 탭). 그때는 다른 쪽으로
 * 넘어간다 — 빈 주소를 저장하느니 표기가 다른 편이 낫다.
 */
export function selectedAddressOf(address: PostalAddress): string {
  const preferred = address.userSelectedType === 'R' ? address.roadAddress : address.jibunAddress;
  const fallback = address.userSelectedType === 'R' ? address.jibunAddress : address.roadAddress;
  return preferred !== '' ? preferred : fallback;
}
