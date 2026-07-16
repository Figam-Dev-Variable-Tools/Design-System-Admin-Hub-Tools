// 시크릿 취급 규약 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// ┌ 이 파일이 지키는 단 하나의 규칙 ───────────────────────────────────────────┐
// │ **평문 시크릿은 저장되지 않는다. 그러므로 다시 보여줄 수 없다.**              │
// │                                                                          │
// │ 이것은 '가려서 보여주기(masking)' 가 아니다. 마스킹은 값이 있는데 감추는 것이고, │
// │ 감춘 값은 언젠가 새어 나온다(DOM·리덕스 devtools·스크린샷·로그).               │
// │ 그래서 이 섹션의 모델은 평문을 **애초에 갖지 않는다** — 픽스처가 들고 있는 것은  │
// │ 접두어(용도 식별)와 마지막 4자뿐이다. `sk_test_••••0001` 은 원본을 가린 표시가   │
// │ 아니라 **우리가 가진 정보의 전부**다.                                        │
// │                                                                          │
// │ 발급 순간의 평문만 예외다: 서버가 만들어 1회 돌려주고, 화면은 그것을 모달 안       │
// │ 지역 state 로만 쥔다. 모달을 닫으면 그 값은 사라지고 어디에도 남지 않는다.        │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [더미] 백엔드가 없으므로 픽스처의 키는 **명백한 더미**여야 한다 — 진짜처럼 보이는 문자열은
// 실수로 어딘가에 붙여넣어졌을 때 진짜 키로 오인된다. 그래서 접두어를 `sk_test_` 로 고정하고
// 발급 시연이 만드는 평문에도 `DUMMY` 를 박아 둔다.

/** 가운데를 대신하는 글리프 — 자리수를 암시하지 않는 고정 길이다(길이도 정보다) */
const MASK_GLYPH = '••••';

/** 시크릿의 '보여줄 수 있는 부분' — 이것이 모델이 가진 전부다 */
export interface SecretPreview {
  /** 용도 식별용 접두어 — 예: 'sk_test_' */
  readonly prefix: string;
  /** 마지막 4자 — 운영자가 어느 키인지 알아보는 유일한 단서 */
  readonly last4: string;
}

/** `sk_test_••••0001` — 목록·상세가 키를 가리키는 유일한 방법 */
export function maskSecret(preview: SecretPreview): string {
  return `${preview.prefix}${MASK_GLYPH}${preview.last4}`;
}

/** 저장된 OAuth client secret 의 표시 — 마지막 4자도 남기지 않는다(식별이 이름으로 충분하다) */
export const MASKED_SECRET_TEXT = '••••••••••••';

/**
 * 발급 시연용 평문 — **백엔드가 붙으면 이 함수는 사라진다**(키는 서버가 만든다).
 *
 * `DUMMY` 를 박아 진짜 키로 오인될 수 없게 한다. crypto.randomUUID 를 쓰는 이유는 보안이 아니라
 * 같은 화면에서 두 번 발급했을 때 서로 다른 값이 나오게 하기 위해서다.
 */
// TODO(backend): POST /api/settings/api-keys 가 평문을 **응답 1회에만** 싣는다 — 서버도 저장하지 않는다(해시만).
export function createDummyPlaintextKey(prefix: string): string {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();
  return `${prefix}DUMMY${random}`;
}

/** 평문 → 표시 가능한 조각. 발급 직후 목록에 넣을 항목을 만들 때만 쓴다 */
export function previewOf(plaintext: string, prefix: string): SecretPreview {
  return { prefix, last4: plaintext.slice(-4) };
}

/**
 * 클립보드 복사 — 실패를 삼키지 않는다(호출부가 성공/실패를 토스트로 알린다).
 *
 * navigator.clipboard 는 보안 컨텍스트(https/localhost)에서만 존재한다 — 없으면 false 를 돌려주고
 * 화면이 '직접 복사해 주세요' 로 안내한다. 조용히 아무 일도 일어나지 않는 경로를 만들지 않는다.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator.clipboard === 'undefined') return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
