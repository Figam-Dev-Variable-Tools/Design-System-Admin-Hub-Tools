// 공급자(자사) 정보 조회기 — **자리만** 만든다 (정본은 회사 정보 화면이 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 같은 회사를 두 화면이 다르게 말했다]
// 견적서 상단 '공급자' 블록은 `pages/sales/quotes/types.ts` 안에 하드코딩된 상수를 그렸다
// ('TDS 주식회사' · 211-88-11223). 정작 회사 정보(/company/profile)에는 다른 회사가 저장돼 있다
// ('주식회사 예시플래닝' · 123-45-67890). 그래서 회사 정보를 아무리 고쳐도 **인쇄되는 견적서는
// 바뀌지 않았다** — 두 화면이 같은 사실을 서로 다르게 말하는 상태였고, 종이에 나가는 쪽이
// 아무도 편집할 수 없는 쪽이었다.
//
// [왜 견적 화면이 회사 화면을 직접 import 하지 않나]
// `pages/sales` → `pages/company` 는 페이지 간 결합이고 code-quality 축1(blocker, 임계값 0건)이
// 그대로 잡는다. 그래서 공통 층인 여기는 계약과 등록기만 갖고, 실제 값을 꽂는 일은 두 도메인을
// 모두 아는 `src/wiring.ts` 가 한다 (선례: shared/domain/faq-catalog.ts).
//
// [왜 던지지 않고 폴백인가 — FAQ 조회기와 판정이 갈리는 지점]
// 발행 FAQ 는 미배선일 때 오류를 냈다. 목록이 비면 '고객센터에 노출할 FAQ 가 없습니다' 라는
// **완결된 거짓 문장**이 그려지기 때문이다. 견적서는 반대다 — 공급자 블록이 비면 문서가 통째로
// 못 나가고, 운영자는 금액·품목을 확인하려던 일마저 못 한다. 그래서 여기서는 문서를 세우지 않고
// **폴백을 그리되 그것이 폴백임을 이름에 적어 둔다**(아래 SUPPLIER_FALLBACK). 회사 정보를 채우면
// 사라지는 자리표시라는 것이 화면에서 읽혀야 한다.
// ─────────────────────────────────────────────────────────────────────────────

/** 견적서·거래 문서에 인쇄되는 공급자(자사) 정보 */
export interface SupplierInfo {
  readonly name: string;
  /** 사업자등록번호 — 표기 형식(하이픈)은 문서가 정한다 */
  readonly bizNo: string;
  readonly ceoName: string;
  readonly address: string;
  readonly phone: string;
}

/**
 * 배선이 없을 때 그리는 자리표시 — **회사가 아니라 '아직 안 채웠다' 는 사실**을 인쇄한다.
 *
 * 그럴듯한 회사 이름을 폴백으로 두면 그것이 진짜 자사 정보인 줄 알고 그대로 발송된다.
 * 사업자등록번호는 전 자리를 `0` 으로 채운다 — 형식은 지키되(문서 레이아웃이 무너지지 않게)
 * 어떤 실제 번호와도 겹치지 않는 값이다.
 */
export const SUPPLIER_FALLBACK: SupplierInfo = {
  name: '(회사 정보 미등록)',
  bizNo: '000-00-00000',
  ceoName: '—',
  address: '회사 정보 화면에서 주소를 등록해 주세요.',
  phone: '—',
};

type SupplierLookup = () => SupplierInfo | null;

/** 미배선 상태 — null 이면 폴백을 쓴다(머리말) */
let lookup: SupplierLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerSupplierLookup(next: SupplierLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — 폴백 경로를 실제로 밟아 보기 위한 것이다 */
export function resetSupplierLookup(): void {
  lookup = null;
}

/**
 * 지금 인쇄해야 할 공급자 정보 — 배선이 없거나 조회에 실패하면 SUPPLIER_FALLBACK.
 *
 * 던지지 않는다: 회사 정보 쪽 사고로 견적서가 아예 열리지 않으면, 정작 확인하려던 금액·품목까지
 * 함께 사라진다.
 */
export function resolveSupplier(): SupplierInfo {
  if (lookup === null) return SUPPLIER_FALLBACK;
  try {
    return lookup() ?? SUPPLIER_FALLBACK;
  } catch {
    return SUPPLIER_FALLBACK;
  }
}
