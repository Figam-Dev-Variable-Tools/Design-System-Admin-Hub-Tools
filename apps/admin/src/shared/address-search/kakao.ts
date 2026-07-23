// 카카오(다음) 우편번호 어댑터 — 계약(contract.ts)의 유일한 실구현
//
// ─────────────────────────────────────────────────────────────────────────────
// [출처 — 카카오 공식 문서]
//   · 우편번호 서비스 가이드 https://postcode.map.kakao.com/guide
//       스크립트: //t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js
//       `new kakao.Postcode({ oncomplete }).embed(element)` 로 iframe 을 심는다(레이어 방식).
//       **앱 키도 등록도 필요 없다.** oncomplete 데이터에 zonecode·roadAddress·jibunAddress·
//       buildingName·userSelectedType 등이 실려 오고, **좌표는 오지 않는다.**
//
// [지도 SDK 는 여기 없다] 지도 렌더와 지오코딩(주소→좌표)이 화면에서 사라지면서 이 파일에서도
// 함께 사라졌다. 그 둘만 JavaScript 앱 키를 요구했으므로, 이제 이 경로는 **키를 한 번도 읽지
// 않는다** — 앱 키 조회기(옛 shared/domain/map-provider.ts)도 소비자가 0이 되어 지웠다.
//
// [왜 https 로 고정하나] 가이드의 예제는 프로토콜 상대경로(`//`)다. 관리자는 https 로만 뜨므로
// 상대경로여도 결과가 같지만, 명시하면 file:// 로 열었을 때 조용히 실패하는 경로가 사라진다.
// ─────────────────────────────────────────────────────────────────────────────
import { searchFailed, searchOk, toPostalAddress } from './contract';
import type { AddressSearchAdapter, AddressSearchResult, PostalAddress } from './contract';

const POSTCODE_SRC = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

/* ── SDK 전역의 최소 타입 ────────────────────────────────────────────────────
 *
 * 전체를 적지 않는다. 우리가 부르는 것만 적으면 SDK 가 바뀌어도 **우리가 쓰는 표면**만 깨지고,
 * 쓰지도 않는 선언을 유지보수하지 않아도 된다. */

interface KakaoPostcodeOptions {
  readonly oncomplete: (data: unknown) => void;
  readonly onclose?: (state: unknown) => void;
  readonly width: string;
  readonly height: string;
}

interface KakaoPostcodeWidget {
  readonly embed: (host: HTMLElement, options?: { readonly autoClose?: boolean }) => void;
}

type KakaoPostcodeConstructor = new (options: KakaoPostcodeOptions) => KakaoPostcodeWidget;

declare global {
  // 스크립트가 심는 전역 — 우리가 만들지 않는다. 읽기만 하고, 없을 수 있다(로드 전·차단).
  var kakao: { readonly Postcode?: KakaoPostcodeConstructor } | undefined;
}

/* ── 스크립트 로더 ──────────────────────────────────────────────────────────── */

/**
 * src 하나당 한 번만 심는다.
 *
 * [왜 캐시하나] 주소 검색 모달은 열 때마다 마운트된다. 캐시가 없으면 같은 스크립트가 여러 장 붙는다.
 * [왜 실패는 캐시에서 지우나] 실패를 남겨 두면 '다시 시도' 버튼이 영원히 같은 실패를 즉시
 * 되돌려준다 — 눌리는데 아무 일도 일어나지 않는 버튼이 된다. 네트워크는 복구될 수 있다.
 */
const inflight = new Map<string, Promise<boolean>>();

function loadScript(src: string): Promise<boolean> {
  const cached = inflight.get(src);
  if (cached !== undefined) return cached;

  const pending = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => resolve(true), { once: true });
    script.addEventListener(
      'error',
      () => {
        inflight.delete(src);
        script.remove();
        resolve(false);
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  inflight.set(src, pending);
  return pending;
}

/** 우편번호 서비스 — 키가 없으므로 실패는 '못 받았다' 한 가지뿐이다 */
async function loadPostcode(): Promise<AddressSearchResult<KakaoPostcodeConstructor>> {
  const loaded = await loadScript(POSTCODE_SRC);
  if (!loaded) return searchFailed('unreachable');
  const constructor = globalThis.kakao?.Postcode;
  // 200 은 왔는데 전역이 없다 = 우리가 받은 것이 그 스크립트가 아니다(프록시·차단 페이지).
  // 키가 개입하지 않는 경로라 별도 이유로 부르지 않는다 — 운영자가 키를 의심하게 만들지 않는다.
  if (constructor === undefined) return searchFailed('unreachable');
  return searchOk(constructor);
}

/* ── 어댑터 ─────────────────────────────────────────────────────────────────── */

async function embedAddressSearch(
  host: HTMLElement,
  onSelect: (address: PostalAddress) => void,
): Promise<AddressSearchResult<() => void>> {
  const loaded = await loadPostcode();
  if (!loaded.ok) return searchFailed(loaded.reason);

  const Postcode = loaded.value;
  const widget = new Postcode({
    oncomplete: (data) => {
      onSelect(toPostalAddress(data));
    },
    width: '100%',
    height: '100%',
  });

  // autoClose:false — 닫는 것은 우리 모달의 일이다. 위젯이 스스로 자기 iframe 을 지우면
  // 모달은 열린 채 빈 사각형만 남는다(선택은 됐는데 화면은 아무 말도 하지 않는 상태).
  widget.embed(host, { autoClose: false });

  return searchOk(() => {
    host.replaceChildren();
  });
}

export const KAKAO_ADDRESS_SEARCH_ADAPTER: AddressSearchAdapter = { embedAddressSearch };
